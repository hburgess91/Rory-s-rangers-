# Voices and moods

Every spoken line is pre-recorded with ElevenLabs and packed into `public/audio/voice/bNN.mp3` + `index.json`.
Lines without a recording fall back to the browser's text-to-speech.

## The rule for every voice, existing and future

1. **Every speaker with real lines gets a cloned or designed voice.** Clones (`clones` in `scripts/voice-cast.json`) are
   only for real people who said yes. Nobody else is ever cloned (e.g. SCROMBUS uses a designed voice). Everyone else
   gets a voice made with ElevenLabs Voice Design (`designed`), described in `designed_desc`. One-off crowd members can
   share a role voice (`designed_alias` / the `~role` voices), or fall back to the pools.
2. **Every line gets a mood.** All lines render on `eleven_v3`, which reads delivery tags. A line's mood comes from,
   in order: an explicit `mood`, inline tags in the text, the text itself (auto-mood), then the speaker's default
   `delivery`. The one exception is below (v2 clones).
3. Accents are just accents: describe them in the voice design, never write mocking text into a line.
4. Never use characters' `realName` in text, and never describe a real person or ask for an imitation in a voice design.

## Writing a mood

```ts
say("MIKEY", "They took my BONGO!", { mood: "angry" })
say("KREBLIS", "Breaking news... it's raining.", { mood: "deadpan" })
say("POLSON", "Oh no.", { mood: "sad, crying" })        // several tags: comma-separated
ping("FLENKY", "today's the day", { mood: "excited" })   // works on pings and any line
say("KREZWONK", "I foresaw this. [sighs] I always do.")  // inline tag, mid-line
```

- Tags are never shown on screen (`displayText()` strips them in the dialogue box, pings and KrelTV) and never change
  the recording key (`voiceKey()` ignores them), so adding a mood to an existing line just re-records it.
- Only known tags count as tags (`MOOD_TAGS` in `src/game/audio/voiceKey.ts`, plus anything like `[French accent]`):
  `[CITATION NEEDED]` or `[dead person]` stay as normal text. Add new tags to `MOOD_TAGS` before using them inline.
- Useful tags: `angry` `furious` `excited` `happy` `sad` `shouting` `whispers` `laughs` `giggles` `sighs` `crying`
  `sarcastic` `nervous` `panicked` `mischievously` `shocked` `hesitant` `deadpan` `mysterious` `confused` `flirty`
  `sultry` `smug` `dramatic` `menacing` `growling` `robotic` `tired` `drunk` `calm` `serious`.

## Auto-mood (decided by `scripts/voice-gen.py`, not the game)

When a line has no explicit or inline mood, the generator looks at how it's written:

| text | tag |
|---|---|
| "Breaking news..." | `[deadpan]` |
| contains `?!` / `!?` | `[shocked]` |
| `NOOO` / sobbing words | `[shouting]` if in caps, else `[crying]` |
| mostly ALL CAPS | `[shouting]` |
| `!!` or several `!` | `[excited]` |
| haha / heh heh / lol / lmao | `[laughs]` |
| ends in `...` / `…` (and nothing else matched) | `[sighs]` (short) or `[hesitant]` |
| nothing matched | the speaker's `delivery` default (e.g. KREZWONK `mysterious`, KREBLIS `deadpan`, PROCTUS `confused`, THE CYST `growling`) |

At most two tags; deterministic. Kreddle doubles always get `[strong American accent]` first, then the mood, and use
their counterpart's delivery default.

## Clones on v2

Tested 2026-11-13 (6 lines per clone, v2 vs v3, speech-to-text accuracy + similarity to the original recordings):
MIKEY, POLSON and KREBLIS (and slightly FLENKY) sound less like themselves on v3, so they are in `v2_neutral`: their
lines with **no** mood stay on `eleven_multilingual_v2`; any line with a mood (explicit, inline or auto) uses v3.
Their default `delivery` is not applied (it would push every line onto v3). CRONGUS, KREZWONK, KREZMAR and KREBON
were as good or better on v3 and use it for everything.

## Regenerating

```sh
npx vite-node scripts/voice-extract.ts /tmp/lines.json      # every line (content + literal say() in scene code)
python3 scripts/voice-design.py /tmp/lines.json             # designs voices for new entries in designed_desc
python3 scripts/voice-gen.py /tmp/lines.json --dry --show 20  # what would be (re)recorded, and the cost
python3 scripts/voice-gen.py /tmp/lines.json                # record + rebuild the bundles
```

The cache is the existing bundles: each index entry stores a render signature (model, voice, tags, accent, settings,
text), and only lines whose signature changed are recorded again. Bundles are rebuilt from the kept clips every run,
so nothing stale is left behind. `--only SPEAKER,...` limits recording to some speakers (others keep what they have).
Costs: v3 is 1 character per character, tags included. Check `GET /v1/user/subscription` before a big run.
