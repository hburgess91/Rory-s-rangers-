# SANMIK: YEEE OF DESTRUCTION

A compact, boss-led 2D run-and-gun in the browser. SanMik thinks he's starring in the
greatest action game ever made. The game knows he isn't.

**Status: vertical slice.** Title → character select → opening cutscene → Chapter 2
(Big Tesk-O / Frendship Forest) → BEGOUR THE BEAR (3 phases) → results. Plus a Debug Gym.

## Run it

```bash
cd sanmik
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/ — upload anywhere
npm test           # Playwright browser smoke tests
```

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move / aim | WASD or arrows | Left stick / D-pad |
| Jump (YEEE / YEGHHH) | K, Space | A |
| Shoot | J, Z | X, RT |
| Melee | L, C | B |
| Alt (SanMik pose / SanChz guard) | Shift, U | Y |
| Special (Delusion / Crunk) | I, V | LT |
| Switch weapon | Q / E | LB / RB |
| Pause | Esc, P | Start |

SanMik holds Shoot to auto-fire; releasing after a long hold fires a charged YEE blast.
SanChz: Down + Melee is the Rancid Fart; Alt is a short crutch guard that reflects shots.

## Art and audio

Everything you see and hear right now is a generated placeholder, built in code at boot.
`src/config/assets.ts` lists every slot (sprite sheets, the YEEE / YEGHHH jump takes, music).
To use real files: put them at the listed path under `public/`, keep the frame sizes,
and set that entry's `status` to `'final'`. Only use recordings you have the right to use.

## Project notes

See `CLAUDE.md` for architecture, design rules and debug keys.
