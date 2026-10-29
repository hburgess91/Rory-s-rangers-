# KRELWORLD: WONK 'TIL YOU KREZ

A 2D browser action-RPG about a group chat that accidentally became a country.

Drongus B. Drippin' posts his new AI song, *The Krezzing Hour*. It is seen by 9. Nobody reacts.
He withdraws all lore, and Krelworld (which runs on lore) starts to fall apart. Pick one of nine
cabinet members, restore the Great Pussy Juice Tap, solve Cheesegate, shut down the
over-wonked Wonking Machine, survive the Bonky Cult's Banhammer, settle the Krezmond saga,
climb the Great Wiki Citadel, and finally react to the song.

> Adult content: explicit language and crude humour throughout, and one deliberately
> offensive in-world sitcom (*Thick Cumming Cock*, KrelTV) with a content note.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run preview    # serve the build
npm test           # unit + content-integrity tests
```

No backend, no accounts, no network calls at runtime. Saves live in `localStorage`
(the game falls back to memory if storage is blocked).

## Controls

| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Move | WASD / arrows | Left stick |
| Aim | Mouse | Right stick |
| Attack | Left click (hold) / J | RT / A |
| Signature ability | Right click / F / K | LT / Y |
| Dodge (i-frames) | Space / Shift | B / RB |
| Pussy juice (heal) | Q | D-pad left |
| Fizzy Bongo (buff, gets you drunk) | B | D-pad right |
| Krezz Burst (full Wonk meter) | R / L | LB |
| Interact / advance dialogue | E / Space / click | X |
| Skip dialogue (stops at choices) | Tab | |
| Pause / menu | Esc | Start |

## What's in it

- **Nine playable characters** (Flenky, Krezmar, Kreblis, Krezwonk, Scrombus, Krebon, Lil' Crongus,
  Gronny G, Mikey), each with stats, a signature ability, a passive, a 3-tier upgrade branch,
  a personal questline, per-chapter altered scenes and an epilogue. One shared controller,
  data-driven definitions (`src/data/characters.ts`).
- **Proctus Krelmor**, the constitutional substitute, fills whichever ministry the player
  vacates. One global rule: `narrativeActor()` in `src/game/systems/narrative.ts`. Archive
  scenes never substitute; present-day role lines go to Proctus with his own mangled text.
- **Six chapters, six dungeons, six bosses**: The Salmon Sovereign, The Polson–Eden Feedback
  Loop, The Over-Wonked Machine, The Supreme Banhammer Automaton, The Spectre of Krezmond's
  Betrayal, and Drongus B. Drippin' (three phases) — then the reaction that decides the ending.
- **Town Meetings** (10) staged around a horseshoe table, built from real chat exchanges.
- **Historical Archive** (27 records): official version, original excerpt (replayable as a
  reenactment), footnotes that contradict the official record, Drongus's annotations.
- **Reactions** as a game-wide mechanic (👍 ❤️ 😂 😡 Seen), feeding Drongus's resentment.
- **Krazy Facts**: at the end of each chapter you pick a fact; it becomes law (run modifiers).
- **Ban Risk / Exile / Ban Tribunal**, Wonk meter and Krezz Burst, Pussy Juice infrastructure,
  Fizzy Bongos and intoxication, the Wonking Machine, vending machines.
- **KrelTV**: CRT TV in your house, the pub, Polson Towers and the town square. Eight channels,
  fourteen episodes, all data. Includes *Thick Cumming Cock* Ep. 7 as supplied.
- **The Krezz Arms** pub: seven conversations that open up as you drink.
- **Music**: the two supplied songs. *The Star Spangled Banner (Krelworld Edition)* plays in
  Drongus's office (the Citadel parade ground), where his army stands to attention and you
  choose to stand, sing or walk on. *Krazy For The Krelworld* is on the pub jukebox, KMTV and
  the end credits. The other supplied tracks are the soundtrack (`MUSIC_FILES` in `Synth.ts`).
- **The Kreltower Incident** (Chapter 6): Krozno hijacks Flight KR-069. Five-minute timer
  through the airport to the cockpit boss. Win and the plane lands in the Great Tap; run out
  of time and it hits the Kreltower, which collapses in front of everyone. The town, NPCs
  and ending remember which.
- **Bully Mikey** at The Booth: a punching-bag minigame (Proctus stands in if you are Mikey).
- **Character side stories** (`src/content/arcs.ts`), unlocked after the first meeting:
  Flenky (Mollor, the psychology exam, Russell Brand at BJJ), Krezmar (Grumbo the Blues Troll,
  finished with a headbutt), Gronny (Carpet Kev and the carpet), Lil' Crongus (the bread and
  butter pudding), Krezwonk (HGH, the deadlift, three girlfriends, Brick Kolbane) and Scrombus
  (renovate, flip, coup). Each has a permanent reward. Villains are fictional stand-ins.
- **New Krez+** after the credits: keeps the Archive and TV, harder enemies, extra Krazy Facts.

## Project layout

```
src/
  main.ts                    Phaser config + scene list
  data/                      types, characters, enemies, dungeons, Krazy Facts
  content/
    archive/canonQuotes.ts   curated verbatim chat lines (with original timestamps)
    archive/historicalScenes.ts  the Historical Archive
    meetings/                Town Meetings
    dialogue/                barks, NPC talk, chatter, Drongus pings, pub conversations
    chapters/chapters.ts     chapter steps, intros, per-player scenes, outros
    television/              KrelTV channels + Thick Cumming Cock
    bosses.ts, quests.ts, endings.ts, polsonEden.ts, dsl.ts
  game/
    G.ts                     shared game context (state, meta, events)
    Flow.ts                  chapter flow / scene switching
    systems/                 pure logic: state & saves, conditions, narrative, reactions,
                             ban, tv parser, stats, quests (unit-tested, no Phaser)
    combat/                  Player, Enemy, Bosses, Controls
    scenes/                  Boot, Title, CharSelect, Cutscene, Meeting, Hub, Dungeon, UI,
                             Dialogue, TV, Archive, Pub, KrazyFact, Exile, Menu, Ending
    gfx/Textures.ts          all pixel art, generated at boot (central asset keys)
    audio/Synth.ts           all audio, synthesised with WebAudio
    ui/                      DialogueBox, theme helpers
public/portraits/            photo-derived 64×64 pixel portraits
scripts/build-chat-index.mjs dev-only chat search tool (reads ./source, gitignored)
tests/                       vitest
```

## Adding content

**Dialogue.** Lines are plain data built with the helpers in `src/content/dsl.ts`:

```ts
say("KREZMAR", "Anyone fancy a fizzy bongo?", { cond: { chapterAtLeast: 2 } })
canon("drongi")                                  // verbatim line from canonQuotes.ts
say("KREZWONK", "I foresaw this.", { role: true, proctus: "I foresaw lunch." })
react("Drongus: 'New one lads'", "context_key", { LIKE: [say("DRONGUS", "Thanks.")] })
```

- Ambient barks: `src/content/dialogue/ambient.ts`. NPC conversations: `npc.ts`
  (priority-ranked sets with conditions). NPC-to-NPC chatter: `chatter.ts`.
- Conditions (`Cond`): `flag`, `notFlag`, `chapter`, `chapterAtLeast`, `player`, `notPlayer`,
  `revision`, `intoxAtLeast`, `resentmentAtLeast`, `ngPlus`, `any`, `not`.
- New verbatim quotes: add them to `canonQuotes.ts` (use `npm run chat-index -- "search term"`
  with the exports in `./source` to find them). Keep slurs out — the content test checks.

**Town Meetings.** Add a `MeetingScript` in `src/content/meetings/`, register it in
`meetings/index.ts`, then trigger it from `townHallAction()` / `archiveAction()` in
`src/game/Flow.ts`. Set `historical: true` for archive reconstructions (original speakers,
no Proctus).

**TV episodes.** Write a screenplay and parse it:

```ts
ep("news_6", "KRELFORD NEWS AT SIX", "Krelford News at Six", "Title", 6, `
# KRELFORD NEWS AT SIX
INT. NEWSDESK - EVENING
NEWSREADER: Good evening.
[LAUGHTER]
[SMASH CUT]
`, { unlockFlag: "ch5_clear", unlockHint: "After Chapter 5" })
```

Add it to `ALL_EPISODES` in `src/content/television/channels.ts`. Supported: `# title card`,
`INT./EXT.` shots, `NAME (emotion): line`, `(direction)`, `[LAUGHTER]`/`[CHEERING]`/`[GASP]`/
`[WHISTLES]`, `[SMASH CUT]`/`[CUT]`/`[FADE]`, `[SFX id]`, `[MUSIC id start|stop]`,
`[PROP id on|off]`, `[BLOCK NAME left|right|center|lap|enter|offscreen]`. Earlier scenes of
*Thick Cumming Cock* Ep. 7 go in `EARLIER_SCENES` in `thickCummingCock/episode07.ts`.

**Krazy Facts.** Add an entry to `KRAZY_FACTS` in `src/data/historicalRevisions.ts` with a
`mods` object. Existing modifiers are read by combat/hub code via `activeMods()`; a new kind
of modifier needs one line there plus wherever it applies.

## Replacing art and audio

- Every texture key is generated in `src/game/gfx/Textures.ts` and skipped if it already
  exists. To use real art, load a PNG with the same key in `BootScene.preload()`
  (e.g. `this.load.spritesheet("spr_KREZMAR", "art/krezmar.png", { frameWidth: 16, frameHeight: 24 })`,
  4 frames: idle, walk A, walk B, attack).
- Portraits: `public/portraits/<name>.png`, keys `pt_<name>` (see `characters.ts`).
- Music: `MUSIC_FILES` in `src/game/audio/Synth.ts` maps track ids to mp3s in `public/audio/`.
  Remove an entry and the built-in synth tune plays instead.
- Audio: register a file in `AUDIO_FILES` in `src/game/audio/Synth.ts`
  (e.g. `mork: "audio/mork_voice.ogg"` in `public/audio/`) and it is used instead of the synth.
  The original Mork Voice recording isn't in the exports, so the game uses a mumble effect.

## Privacy

The Messenger exports are reference material only. `.gitignore` excludes `source/`, `K*.json`
and `CHAT_INDEX.txt`, and nothing reads them at runtime. Only curated lines are in the code.
