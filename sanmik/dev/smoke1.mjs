import { launch, sleep, shot, tap } from './drive.mjs';
const { b, p, errors } = await launch();
await shot(p, 'title0');
await tap(p, 'Enter'); await sleep(300);
await shot(p, 'title1');
await tap(p, 'ArrowDown'); await tap(p, 'ArrowDown'); await tap(p, 'Enter'); // debug gym
await sleep(500); await shot(p, 'select');
await tap(p, 'Enter'); await sleep(1500);
await shot(p, 'gym0');
console.log(JSON.stringify(await p.evaluate(() => window.__SANMIK.state())));
// run right and jump
await p.keyboard.down('d'); await sleep(400); await tap(p, 'k', 300); await sleep(300);
await shot(p, 'gym1');
await p.keyboard.up('d');
await tap(p, 'j'); await tap(p, 'j'); await sleep(100); await shot(p, 'gym2');
console.log(JSON.stringify(await p.evaluate(() => window.__SANMIK.state())));
console.log('voice', JSON.stringify(await p.evaluate(() => window.__SANMIK.audio.voice)));
console.log('errors', errors.length);
await b.close();
