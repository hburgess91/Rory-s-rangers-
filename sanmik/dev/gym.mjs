import { launch, sleep, shot, tap, toScene, st } from './drive.mjs';
const char = process.argv[2] || 'sanmik';
const { b, p, errors } = await launch();
await tap(p, 'Enter', 100); await sleep(200);
await toScene(p, 'gym', char);
await sleep(1200);
console.log('fps', await p.evaluate(() => window.__SANMIK.game.loop.actualFps));
await p.keyboard.down('j'); await sleep(900); await shot(p, `${char}_charge`); await p.keyboard.up('j'); await sleep(120); await shot(p, `${char}_blast`);
for (let i = 0; i < 6; i++) { await tap(p, 'j', 50); await sleep(120); }
await tap(p, 'l', 60); await sleep(60); await shot(p, `${char}_melee`);
console.log(JSON.stringify(await st(p)));
// walk right to pickups
await p.keyboard.down('d'); await sleep(900); await p.keyboard.up('d'); await sleep(300);
await shot(p, `${char}_pickups`);
console.log(JSON.stringify(await st(p)));
// aim up and shoot
await p.keyboard.down('w'); await tap(p, 'j', 50); await sleep(80); await shot(p, `${char}_up`); await p.keyboard.up('w');
// jump test: count
const before = await p.evaluate(() => ({ ...window.__SANMIK.audio.voice }));
for (let i = 0; i < 3; i++) { await tap(p, 'k', 80); await sleep(900); }
const after = await p.evaluate(() => ({ ...window.__SANMIK.audio.voice }));
console.log('voice before', JSON.stringify(before), 'after', JSON.stringify(after), 'jumps', (await st(p)).jumps);
await p.keyboard.down('d'); await tap(p, 'k', 300); await sleep(200); await shot(p, `${char}_jump`); await p.keyboard.up('d');
await p.keyboard.press('F1'); await sleep(100); await shot(p, `${char}_debug`);
await p.keyboard.press('F3'); await sleep(50); await tap(p, 'i', 60); await sleep(600); await shot(p, `${char}_special`);
await sleep(8200); await shot(p, `${char}_special_end`);
console.log(JSON.stringify(await st(p)));
console.log('errors', errors.filter(e => !e.includes('GL Driver')).length);
await b.close();
