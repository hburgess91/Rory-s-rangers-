import { launch, sleep, tap, toScene, st } from './drive.mjs';
const { b, p } = await launch();
await tap(p, 'Enter', 100); await sleep(200);
await toScene(p, 'gym', 'sanmik');
await p.evaluate(() => window.__SANMIK.cheat.teleport(990, 318));
await sleep(400);
console.log(JSON.stringify(await st(p)));
await p.keyboard.down('d'); await sleep(60); await p.keyboard.down('k');
for (let i = 0; i < 12; i++) { const s = await st(p); console.log(i, s.x.toFixed(0), s.y.toFixed(0), s.vy.toFixed(0), s.onGround); await sleep(60); }
await p.keyboard.up('k'); await p.keyboard.up('d');
await b.close();
