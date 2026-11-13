#!/usr/bin/env python3
"""Pre-record dialogue with ElevenLabs and pack it for the game.

  python3 scripts/voice-gen.py LINES.json [--dry] [--only SPEAKER,...] [--include-held] [--limit N] [--show N]

LINES.json comes from `npx vite-node scripts/voice-extract.ts LINES.json`.
Casting is in scripts/voice-cast.json; moods are explained in docs/VOICE_MOODS.md.
The API key is injected by the session proxy (header placeholder only).

Output: public/audio/voice/b<NN>.mp3 (concatenated mp3 clips) + public/audio/voice/index.json
        { key: [bundle, offset, length, voice, signature] }. The game only reads the first three.
The signature is a hash of everything that shapes a recording (model, voice, delivery tags, accent, settings, text),
so changing a line's mood, a character's voice or the model re-records exactly the lines affected. Everything
else is copied out of the old bundles, and the bundles are rebuilt from the kept clips (no dead bytes).
"""
import json, os, re, sys, time, hashlib, urllib.request, urllib.error, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public/audio/voice")
CAST = json.load(open(os.path.join(ROOT, "scripts/voice-cast.json")))
API = "https://api.elevenlabs.io/v1/text-to-speech/{}?output_format=mp3_22050_32"
BUNDLE_MAX = 2_000_000
V2, V3 = CAST["models"]["v2"], CAST["models"]["v3"]
# Settings are part of the signature: change them and every line on that model is re-recorded.
SETTINGS = {
    V2: {"stability": 0.4, "similarity_boost": 0.8, "style": 0.0, "use_speaker_boost": True, "speed": 1.06},
    V3: {"stability": 0.5, "similarity_boost": 0.8, "speed": 1.1},
}
US = "strong American accent"

args = sys.argv[1:]
lines = json.load(open(args[0]))
dry = "--dry" in args
held_ok = "--include-held" in args
only = set(args[args.index("--only") + 1].split(",")) if "--only" in args else None
limit = int(args[args.index("--limit") + 1]) if "--limit" in args else None
show = int(args[args.index("--show") + 1]) if "--show" in args else 0

def h(s):
    return int(hashlib.md5(s.encode()).hexdigest(), 16)

def voice_of(sp):
    """(voice id, kind) for a speaker's own voice, ignoring doubles. None if held back."""
    if sp in CAST["clones"]:
        return CAST["clones"][sp], "clone"
    if sp in CAST["hold"] and not held_ok:
        return None
    if sp in CAST.get("designed", {}):
        return CAST["designed"][sp], "designed"
    if sp in CAST["stock"]:
        return CAST["stock"][sp], "stock"
    pool = CAST["pools"]["female" if sp in CAST["female"] else "male"]
    return pool[h(sp) % len(pool)], "pool"

def cast(sp):
    """(voice id, kind, accent tag or None, the speaker whose voice/delivery it is) or None if held back.
    Doubles (Kreddle doppelgangers) get their counterpart's voice with an American accent."""
    d = CAST.get("doubles", {})
    if sp in d and sp != "_doc":
        base = d[sp]
        v = voice_of(base)
        return (v[0], v[1], US, base) if v else None
    v = voice_of(sp)
    return (v[0], v[1], None, sp) if v else None

# ------------------------------------------------------------------ moods
TAG = re.compile(r"\[([^\]\n]{1,40})\]")
def auto_tags(raw, t):
    """Delivery picked from how the line is written. Deterministic; explicit moods always win over this."""
    tags = []
    letters = re.findall(r"[A-Za-z]", t)
    caps = len(letters) >= 6 and sum(c.isupper() for c in letters) / len(letters) > 0.75
    if re.search(r"\bbreaking news\b", raw, re.I):
        tags.append("deadpan")
    if re.search(r"\?!|!\?", raw):
        tags.append("shocked")
    if re.search(r"\bN[Oo]{3,}\b|\bno{3,}\b", raw) or re.search(r"\b(sobs?|sobbing|crying|wa{2,}h+|boo ?hoo)\b", raw, re.I):
        tags.append("shouting" if caps else "crying")
    elif caps:
        tags.append("shouting")
    elif "!!" in raw or raw.count("!") >= 2:
        tags.append("excited")
    if re.search(r"\b(?:ha){2,}h?\b|\bheh heh\b|\bhehe+\b|\blol\b|\blmao\b|\bkek\b", raw, re.I):
        tags.append("laughs")
    if not tags and re.search(r"(\.\.\.|…)\s*[\"')]?\s*$", raw.strip()):
        tags.append("sighs" if len(t) < 45 else "hesitant")
    return list(dict.fromkeys(tags))[:2]

def plan(l, c):
    """(model, text to send, settings, delivery tags) for one line."""
    vid, kind, accent, base = c
    t = l["t"].replace("*", "").strip()  # stray asterisks (chat-style corrections) trip the API
    inline = [m for m in TAG.findall(t)]
    explicit = [m.strip() for m in (l.get("m") or "").split(",") if m.strip()]
    from_text = [] if (explicit or inline) else auto_tags(l.get("raw", t), t)
    v2_ok = kind == "clone" and not accent and base in CAST.get("v2_neutral", [])
    tags = explicit or from_text
    if not explicit and not inline and not from_text and not v2_ok:
        dflt = CAST.get("delivery", {}).get(l["s"]) or CAST.get("delivery", {}).get(base)
        if dflt:
            tags = [dflt]
    if v2_ok and not tags and not inline:
        return V2, t, SETTINGS[V2], []
    if kind == "clone" and not accent:
        # v3 drifts cloned voices towards American: pin every lad's own accent on mood lines
        accent = CAST.get("clone_accents", {}).get(base, "British accent")
    prefix = "".join(f"[{x}] " for x in ([accent] if accent else []) + tags)
    return V3, prefix + t, SETTINGS[V3], tags

def sig(model, vid, text, settings):
    return hashlib.md5(json.dumps([model, vid, text, settings], sort_keys=True).encode()).hexdigest()[:12]

LEGACY_V2 = {"stability": 0.4, "similarity_boost": 0.8, "style": 0.0, "use_speaker_boost": True, "speed": 1.06}
CLONE_IDS = set(CAST["clones"].values())
def legacy_sig(e, t):
    """Signature of a recording made before signatures existed (old pipeline: clones on v2, doubles on v3)."""
    v = e[3]
    if v.endswith("|us"):
        return sig(V3, v[:-3], f"[{US}] " + t, {"stability": 0.5, "similarity_boost": 0.8})
    if v in CLONE_IDS:
        return sig(V2, v, t, LEGACY_V2)
    return "flash"

# ------------------------------------------------------------------ what we already have
old_index = {}
if os.path.exists(os.path.join(OUT, "index.json")):
    old_index = json.load(open(os.path.join(OUT, "index.json")))
bundle_cache = {}
def old_sig(l):
    e = old_index.get(l["k"])
    return e and (e[4] if len(e) > 4 else legacy_sig(e, l["t"]))
def old_clip(l, s=None):
    """The old recording of a line if its signature matches (any old recording when s is None)."""
    e = old_index.get(l["k"])
    if not e or (s is not None and old_sig(l) != s):
        return None
    b = e[0]
    if b not in bundle_cache:
        p = os.path.join(OUT, f"{b}.mp3")
        if not os.path.exists(p):
            return None
        bundle_cache[b] = open(p, "rb").read()
    return bundle_cache[b][e[1]:e[1] + e[2]]

todo, keep, cost, models = [], {}, 0, {}
for l in lines:
    c = cast(l["s"])
    if not c:
        continue
    model, text, settings, tags = plan(l, c)
    s = sig(model, c[0], text, settings)
    label = c[0] + ("|us" if c[2] else "")
    d = old_clip(l, s)
    if d:
        keep[l["k"]] = (l, label, s, d)
        continue
    if only and l["s"] not in only:
        d = old_clip(l)  # not asked to redo this speaker: keep whatever recording it has
        if d:
            keep[l["k"]] = (l, old_index[l["k"]][3], old_sig(l), d)
        continue
    todo.append((l, c[0], model, text, settings, label, s))
    cost += len(text)
    models[model] = models.get(model, 0) + 1
if limit:
    todo = todo[:limit]
print(f"{len(keep)} cached, {len(todo)} to generate ({models}), ~{cost} characters", flush=True)
for x in todo[:show]:
    print(f"  {x[0]['s']:>18} {x[2]:<24} {x[3][:110]}")
if dry:
    sys.exit()

def gen(item):
    l, voice, model, text, settings, label, s = item
    body = json.dumps({"text": text, "model_id": model, "voice_settings": settings}).encode()
    for attempt in range(8):
        req = urllib.request.Request(API.format(voice), data=body, method="POST",
                                     headers={"xi-api-key": "proxy-injected", "Content-Type": "application/json", "Accept": "audio/mpeg"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return item, r.read()
        except urllib.error.HTTPError as e:
            msg = e.read()[:300]
            if e.code in (409, 429, 500, 502, 503, 504):
                time.sleep(2 + attempt * 4)
                continue
            print("FAIL", l["s"], l["k"], e.code, msg, flush=True)
            return item, None
        except Exception:
            time.sleep(2 + attempt * 4)
    print("FAIL (retries)", l["s"], l["k"], flush=True)
    return item, None

def pack():
    """Rebuild every bundle from the kept clips: lines grouped by source file, so a scene's lines share a bundle."""
    os.makedirs(OUT, exist_ok=True)
    order = sorted(keep.values(), key=lambda x: (x[0]["file"], x[0]["k"]))
    index, buf, n, files = {}, bytearray(), 0, []
    def flush():
        nonlocal buf, n
        if buf:
            name = f"b{n:02d}.mp3"
            open(os.path.join(OUT, name + ".tmp"), "wb").write(buf)
            files.append(name)
            n += 1
            buf = bytearray()
    for l, label, s, data in order:
        if len(buf) + len(data) > BUNDLE_MAX:
            flush()
        index[l["k"]] = [f"b{n:02d}", len(buf), len(data), label, s]
        buf += data
    flush()
    for f in os.listdir(OUT):
        if f.endswith(".mp3"):
            os.remove(os.path.join(OUT, f))
    for f in files:
        os.rename(os.path.join(OUT, f + ".tmp"), os.path.join(OUT, f))
    json.dump(index, open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"))
    print(f"packed {len(index)} lines into {n} bundles", flush=True)

done = 0
with cf.ThreadPoolExecutor(int(os.environ.get("VOICE_THREADS", "6"))) as ex:
    for item, data in ex.map(gen, todo):
        done += 1
        if data:
            keep[item[0]["k"]] = (item[0], item[5], item[6], data)
        elif old_clip(item[0]):  # failed: keep the previous recording rather than lose the line
            keep[item[0]["k"]] = (item[0], old_index[item[0]["k"]][3], old_sig(item[0]), old_clip(item[0]))
        if done % 100 == 0:
            print(f"  {done}/{len(todo)}", flush=True)
pack()
