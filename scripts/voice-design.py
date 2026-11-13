#!/usr/bin/env python3
"""Make custom character voices with ElevenLabs Voice Design.

  python3 scripts/voice-design.py LINES.json [SPEAKER ...] [--redo]

For every speaker in voice-cast.json `designed_desc` (speaker -> description) that has no voice in `designed` yet
(or the named speakers, with --redo), this asks Voice Design for three previews reading some of the speaker's
own lines, checks each one (not silent, sensible length, and an ElevenLabs speech-to-text pass to make sure the
words come out right), saves the best as a voice in the account and records its id in `designed`.
Speakers that share a voice: give one of them the description and map the others to the same id by hand
(or use `designed_alias`: speaker -> speaker whose designed voice they borrow).

Rules (see docs/VOICE_MOODS.md): never describe a real person or ask for an imitation; clones only for people in
`clones` who agreed; accents are just accents (describe the accent, never mock it).
LINES.json is the output of scripts/voice-extract.ts. The API key is injected by the session proxy.
"""
import base64, json, os, re, subprocess, sys, time, urllib.request, urllib.error, uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAST_PATH = os.path.join(ROOT, "scripts/voice-cast.json")
CAST = json.load(open(CAST_PATH))
API = "https://api.elevenlabs.io/v1"
FILL = " Right then. Let me tell you exactly what I think about all of this, because somebody has to, and it might as well be me."

def call(method, path, body=None, ctype="application/json", raw=False):
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    for attempt in range(7):
        r = urllib.request.Request(API + path, data=data, method=method,
                                   headers={"xi-api-key": "proxy-injected", **({"Content-Type": ctype} if data else {})})
        try:
            with urllib.request.urlopen(r, timeout=300) as resp:
                b = resp.read()
                return b if raw else json.loads(b)
        except urllib.error.HTTPError as e:
            if e.code in (409, 429, 500, 502, 503, 504):
                time.sleep(3 + attempt * 4)
                continue
            raise RuntimeError(f"{e.code} {e.read()[:300]}")

def transcribe(mp3):
    b = "----kw" + uuid.uuid4().hex
    body = (f'--{b}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\nscribe_v1\r\n'
            f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode() + mp3 + f"\r\n--{b}--\r\n".encode()
    return call("POST", "/speech-to-text", body, ctype=f"multipart/form-data; boundary={b}")["text"]

def duration_and_level(mp3):
    pcm = subprocess.run(["ffmpeg", "-v", "quiet", "-i", "pipe:0", "-ac", "1", "-ar", "16000", "-f", "s16le", "pipe:1"],
                         input=mp3, capture_output=True).stdout
    n = len(pcm) // 2
    if not n:
        return 0.0, 0.0
    import array
    a = array.array("h", pcm[: n * 2])
    return n / 16000, (sum(x * x for x in a[::8]) / len(a[::8])) ** 0.5 / 32768

words = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", " ")).split()
def wer(ref, hyp):
    r, h = words(ref), words(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(len(r), 1)

def sample_text(lines, sp):
    ts = [re.sub(r"\[[^\]]*\]", "", l["t"]).strip() for l in lines if l["s"] == sp]
    ts = sorted([t for t in ts if len(re.findall(r"[A-Za-z]", t)) > 8], key=lambda t: -min(len(t), 160))
    out = ""
    for t in ts:
        if len(out) + len(t) <= 330:
            out += (" " if out else "") + t
    while len(out) < 110:
        out += FILL
    return out[:900]

def design(sp, desc, text):
    r = call("POST", "/text-to-voice/design", {"voice_description": desc, "model_id": "eleven_ttv_v3", "text": text})
    best = None
    for i, p in enumerate(r["previews"]):
        a = base64.b64decode(p["audio_base_64"])
        dur, level = duration_and_level(a)
        try:
            w = wer(text, transcribe(a))
        except Exception:
            w = 1.0
        score = (0 if level > 0.01 and dur > len(text) * 0.035 else 1, round(w, 2), abs(dur - len(text) * 0.065))
        if best is None or score < best[0]:
            best = (score, p["generated_voice_id"], dur, w)
    score, gid, dur, w = best
    v = call("POST", "/text-to-voice", {"voice_name": f"KW {sp}"[:60], "voice_description": desc, "generated_voice_id": gid})
    print(f"{sp}: {v['voice_id']}  ({dur:.1f}s, word error {w:.2f}{'' if score[0] == 0 else ', CHECK: quiet or short'})", flush=True)
    return v["voice_id"]

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    lines = json.load(open(args[0]))
    names = set(args[1:])
    redo = "--redo" in sys.argv
    for sp, desc in CAST.get("designed_desc", {}).items():
        if names and sp not in names:
            continue
        if sp in CAST.get("designed", {}) and not redo:
            continue
        CAST.setdefault("designed", {})[sp] = design(sp, desc, sample_text(lines, sp))
        json.dump(CAST, open(CAST_PATH, "w"), indent=2, ensure_ascii=False)
    for sp, other in CAST.get("designed_alias", {}).items():
        if other in CAST.get("designed", {}):
            CAST["designed"][sp] = CAST["designed"][other]
    json.dump(CAST, open(CAST_PATH, "w"), indent=2, ensure_ascii=False)
