import { launch, sleep, shot, tap, toScene, st } from './drive.mjs';
const char = process.argv[2] || 'sanmik';
const { b, p, errors } = await launch();
await tap(p, 'Enter', 100); await sleep(200);
await toScene(p, 'begour', char);
await sleep(600); await shot(p, `${char}_b_intro`);
// advance dialogue
for (let i = 0; i < 8; i++) { await tap(p, 'Enter', 60); await sleep(350); }
await sleep(1500);
await p.evaluate(() => window.__SANMIK.cheat.god(true));
console.log('start', JSON.stringify((await st(p)).boss));
// fight: hold fire, move around, jump sometimes
await p.keyboard.down('j');
const t0 = Date.now();
let lastPhase = -2; let i = 0;
while (Date.now() - t0 < 150000) {
  const s = await st(p);
  if (!s) break;
  if (s.boss.phase !== lastPhase) { lastPhase = s.boss.phase; await sleep(2500); await shot(p, `${char}_b_phase${lastPhase}`); console.log('phase', lastPhase, JSON.stringify(s)); }
  if (s.scene !== 'begour' || s.boss.hp <= 0) break;
  // face the boss: in phase 2 aim up-ish from below
  const bx = s.boss.phase === 2 ? 320 : (s.boss.mode === 'slide' ? 320 : 500);
  const key = s.x < bx ? 'd' : 'a';
  await p.keyboard.down(key); await sleep(90); await p.keyboard.up(key);
  if (s.boss.phase === 2) { await p.keyboard.down('w'); await sleep(200); await p.keyboard.up('w'); }
  if (i++ % 7 === 0) await tap(p, 'k', 200);
  if (i % 40 === 20) await shot(p, `${char}_b_mid${i}`);
  await sleep(150);
}
await p.keyboard.up('j');
console.log('end', JSON.stringify(await st(p)));
await sleep(2500); await shot(p, `${char}_b_defeat`);
for (let k = 0; k < 6; k++) { await tap(p, 'Enter', 60); await sleep(400); }
await sleep(5000);
console.log('scenes', JSON.stringify(await p.evaluate(() => window.__SANMIK.activeScenes)));
await shot(p, `${char}_b_result`);
console.log('errors', errors.filter(e => !e.includes('GL Driver')).length);
await b.close();
