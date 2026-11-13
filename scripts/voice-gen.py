#!/usr/bin/env python3
"""Pre-record dialogue with ElevenLabs and pack it for the game.

  python3 scripts/voice-gen.py LINES.json [--dry] [--only SPEAKER,...] [--include-held] [--limit N]

LINES.json comes from `npx vite-node scripts/voice-extract.ts LINES.json`.
Casting is in scripts/voice-cast.json. The API key is injected by the session proxy (header placeholder only).
Output: public/audio/voice/b<NN>.mp3 (concatenated mp3 clips) + public/audio/voice/index.json
        { key: [bundle, offset, length, voiceId] }. Existing bundles act as the cache: a line whose voice
        hasn't changed is copied out of the old bundle instead of being generated again.
"""
import json, os, sys, time, hashlib, urllib.request, urllib.error, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public/audio/voice")
CAST = json.load(open(os.path.join(ROOT, "scripts/voice-cast.json")))
API = "https://api.elevenlabs.io/v1/text-to-speech/{}?output_format=mp3_22050_32"
BUNDLE_MAX = 2_000_000

args = sys.argv[1:]
lines = json.load(open(args[0]))
dry = "--dry" in args
held_ok = "--include-held" in args
only = set(args[args.index("--only") + 1].split(",")) if "--only" in args else None
limit = int(args[args.index("--limit") + 1]) if "--limit" in args else None

def h(s):
    return int(hashlib.md5(s.encode()).hexdigest(), 16)

def cast(sp):
    """(voice id, model) for a speaker, or None if held back."""
    if sp in CAST["clones"]:
        return CAST["clones"][sp], CAST["models"]["clone"]
    if sp in CAST["hold"] and not held_ok:
        return None
    if sp in CAST["stock"]:
        return CAST["stock"][sp], CAST["models"]["stock"]
    pool = CAST["pools"]["female" if sp in CAST["female"] else "male"]
    return pool[h(sp) % len(pool)], CAST["models"]["stock"]

# what we already have
old_index = {}
if os.path.exists(os.path.join(OUT, "index.json")):
    old_index = json.load(open(os.path.join(OUT, "index.json")))
bundle_cache = {}
def old_clip(k, vid):
    e = old_index.get(k)
    if not e or e[3] != vid:
        return None
    b = e[0]
    if b not in bundle_cache:
        p = os.path.join(OUT, f"{b}.mp3")
        if not os.path.exists(p):
            return None
        bundle_cache[b] = open(p, "rb").read()
    return bundle_cache[b][e[1]:e[1] + e[2]]

todo, keep, cost = [], {}, 0.0
for l in lines:
    if only and l["s"] not in only:
        # still keep anything already recorded
        c = cast(l["s"])
        if c:
            d = old_clip(l["k"], c[0])
            if d: keep[l["k"]] = (l, c[0], d)
        continue
    c = cast(l["s"])
    if not c:
        continue
    d = old_clip(l["k"], c[0])
    if d:
        keep[l["k"]] = (l, c[0], d)
        continue
    todo.append((l, c))
    cost += len(l["t"]) * (1.0 if c[1] == CAST["models"]["clone"] else 0.5)
if limit:
    todo = todo[:limit]
print(f"{len(keep)} cached, {len(todo)} to generate, ~{int(cost)} credits", flush=True)
if dry:
    sys.exit()

def gen(item):
    l, (vid, model) = item
    body = json.dumps({
        "text": l["t"], "model_id": model,
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.8, "style": 0.0, "use_speaker_boost": True, "speed": 1.06},
    }).encode()
    for attempt in range(6):
        req = urllib.request.Request(API.format(vid), data=body, method="POST",
                                     headers={"xi-api-key": "proxy-injected", "Content-Type": "application/json", "Accept": "audio/mpeg"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return l, vid, r.read()
        except urllib.error.HTTPError as e:
            msg = e.read()[:300]
            if e.code in (409, 429, 500, 502, 503):
                time.sleep(2 + attempt * 3)
                continue
            print("FAIL", l["s"], l["k"], e.code, msg, flush=True)
            return l, vid, None
        except Exception as e:
            time.sleep(2 + attempt * 3)
    return l, vid, None

done = 0
with cf.ThreadPoolExecutor(4) as ex:
    for l, vid, data in ex.map(gen, todo):
        done += 1
        if data:
            keep[l["k"]] = (l, vid, data)
        if done % 50 == 0:
            print(f"  {done}/{len(todo)}", flush=True)

# pack: lines grouped by source file, so a scene's lines tend to share a bundle
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith(".mp3"):
        os.remove(os.path.join(OUT, f))
order = sorted(keep.values(), key=lambda x: (x[0]["file"], x[0]["k"]))
index, buf, n = {}, bytearray(), 0
def flush():
    global buf, n
    if buf:
        open(os.path.join(OUT, f"b{n:02d}.mp3"), "wb").write(buf)
        n += 1
        buf = bytearray()
for l, vid, data in order:
    if len(buf) + len(data) > BUNDLE_MAX:
        flush()
    index[l["k"]] = [f"b{n:02d}", len(buf), len(data), vid]
    buf += data
flush()
json.dump(index, open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"))
print(f"packed {len(index)} lines into {n} bundles", flush=True)
