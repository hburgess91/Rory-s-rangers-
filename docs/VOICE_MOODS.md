# Voice moods (ElevenLabs audio tags)

ElevenLabs' `eleven_v3` model reads emotion/delivery tags in square brackets at the start of (or inside) a line:
`[angry]`, `[excited]`, `[happy]`, `[sad]`, `[shouting]`, `[whispers]`, `[laughs]`, `[sighs]`, `[crying]`,
`[sarcastic]`, `[nervous]`, `[drunk]`-style free text also works but is less predictable. The tags are not spoken.

- Works with our existing instant voice clones (tested on Mikey's clone, 2026-11-13: angry / excited / sad all clearly different).
- Our clones currently render on `eleven_multilingual_v2`, which does NOT understand tags (it would read them out or ignore them).
  Mood lines must be generated on `eleven_v3`. The Kreddle Kruncher doubles already use `eleven_v3` + "[strong American accent]".
- Cost: tags count as characters; regenerating a line costs its characters again (Creator plan: 131k/month).
- Voice is ~same clone, but v3 is more expressive/variable than v2; keep v2 for neutral lines if v3 drifts.

## Rule for every voice, existing and future
1. Every new voice (clone or stock) gets moods via `eleven_v3` tags — no per-voice setup needed.
2. Dialogue can carry a mood: `say("MIKEY", "They took my BONGO!", { mood: "angry" })` (to be added to the DSL), or an inline tag in the text.
3. `voice-gen.py`: if a line has a mood, render on `eleven_v3` with `[mood]` prefixed; the voice key includes the mood so it regenerates.
4. Auto-moods (optional): lines in CAPS / ending "!!" → `[shouting]`/`[excited]`; "…" trailing → `[sighs]`; can be overridden per line.
5. Re-doing existing lines with moods is optional and costs characters — do it per chapter, starting with the big emotional beats.
