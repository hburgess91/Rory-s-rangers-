# SANMIK: YEEE OF DESTRUCTION

A compact, boss-led 2D run-and-gun in the browser. SanMik thinks he's starring in the
greatest action game ever made. The game knows he isn't.

**Status: full campaign (placeholder art/audio).** Opening cutscene, then five chapters,
each a run-and-gun level plus a boss:

1. Da Jobcentre Beyond → DA FAME ALGORITHM
2. Big Tesk-O / Frendship Forest → BEGOUR THE BEAR
3. Night of Freedom → DA BANK TANK
4. Da Nu Warehouse: Rik's Banta Basement → UNCLE RIK / SANRIK
5. Da Majek Lampe → GABOR THE GOAT

Then the Genie, two endings (SanMik / SanChz) and credits. Chapter Select on the title
screen jumps to any level or boss. Swearing is on by default; Settings can turn it off.

## Just play it

Download `play/SANMIK.html` and double-click it. It opens in your web browser — no install.
Click the game once so the sound can start. Rebuild that file with `npm run build:single`.

## Run it (for development)

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
| Move | A / D | Left stick / D-pad |
| Jump (YEEE / YEGHHH) | W (or Space) | A |
| Crouch / drop through (S + W) | S | Down |
| Shoot forward | → | X, RT |
| Shoot upward | ↑ | Up + X |
| Melee (SanChz fart: S + ←) | ← | B |
| Special (Delusion / Crunk) | ↓ | LT |
| Pose (SanMik) / Guard (SanChz) | Shift | Y |
| Switch weapon | Q / E | LB / RB |
| Pause | Esc, P | Start |

Menus: arrows or WASD, Enter to confirm.

SanMik holds Shoot to auto-fire; releasing after a long hold fires a charged YEE blast.
SanChz: S + ← is the Rancid Fart; Shift is a short crutch guard that reflects shots.

## Art and audio

Everything you see and hear right now is a generated placeholder, built in code at boot.
`src/config/assets.ts` lists every slot (sprite sheets, the YEEE / YEGHHH jump takes, music).
To use real files: put them at the listed path under `public/`, keep the frame sizes,
and set that entry's `status` to `'final'`. Only use recordings you have the right to use.

## Project notes

See `CLAUDE.md` for architecture, design rules and debug keys.
