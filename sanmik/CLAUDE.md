# SANMIK: YEEE OF DESTRUCTION — project rules

Browser 2D run-and-gun boss game. Phaser 4.2.1 + TypeScript + Vite, Arcade Physics, 640x360 logical view.

## Commands (run inside `sanmik/`)
- `npm run dev` — dev server (debug keys on).
- `npm run typecheck` — must be clean before any commit.
- `npm run build` — typecheck + production build to `dist/` (static, deployable anywhere).
- `npm test` — Playwright smoke tests (starts its own dev server on :5199). If the bundled
  browsers don't match, set `PW_CHROMIUM=/path/to/chromium`. `PW_ALL=1` adds Firefox/WebKit.

## Layout
- `src/config/tuning.ts` — ALL movement / weapon / boss numbers. Tune here, not in systems.
- `src/config/assets.ts` — asset contract. Placeholders are generated in `src/art` and
  `src/audio/synth.ts`; flip an entry to `final` and drop the file in `public/` to replace it.
- `src/player/` — `Player` (shared controller) + `SanMikKit` / `SanChzKit` (character differences).
- `src/combat/` — pooled `Projectile`s, `Combat` resolves every hit, zone and melee swing.
- `src/bosses/Scope.ts` — every boss phase owns a Scope; disposing it kills its timers,
  tweens and objects. Attacks are `async (s) => { await s.wait(ms) }`.
- `src/scenes/GameplayScene.ts` — base for levels, arenas and the Debug Gym.
- `window.__SANMIK` — test/debug hooks (state(), cheat.*). Keep it working; tests rely on it.

## Non-negotiable design rules
- Every accepted jump plays exactly one vocal: SanMik "YEEE", SanChz "YEGHHH". Held jump never retriggers.
- SanChz has cerebral palsy and uses crutches. Same jump, speed and stage access as SanMik.
  His disability is never the joke and never a gameplay penalty. Crutches are mobility aids and a weapon.
- Begour is genuinely friendly, never secretly evil. Gabor stays recognisably a goat; his
  sadism is non-explicit (cruelty, traps, gloating). No sexual violence, nothing involving minors,
  no slurs or hateful caricatures, no real private people as targets.
- The central joke: SanMik thinks he's a global star; the game keeps proving he isn't (3 viewers).
- Boss attacks: telegraph >= ~0.4s on Normal, never spawn on the player, never unavoidable combos.
  Boss phases are one-way; a transition disposes the old Scope and clears phase-scoped shots.
- Scenes are reused on restart: reset every field in `create()`. Music only goes through
  `AudioBus.music()` (idempotent), never per-scene players.
- Small polished > big unfinished. Don't add co-op, procedural levels, inventories or RPG systems.

## Debug keys (dev builds or `?debug`)
F1 hitboxes · F2 god mode · F3 refill meter+HP · F4 next boss phase · F6 kill boss · F7 next checkpoint
