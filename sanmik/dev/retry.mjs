import { launch, sleep, tap, toScene, st } from './drive.mjs';
const { b, p, errors } = await launch();
await tap(p, 'Enter', 100); await sleep(200);
await toScene(p, 'begour', 'sanchz');
await p.evaluate(() => window.__SANMIK.cheat.nextPhase());
await p.evaluate(() => window.__SANMIK.cheat.nextPhase());
await sleep(2000);
console.log(JSON.stringify(await st(p)));
await p.evaluate(() => window.__SANMIK.cheat.killPlayer());
for (let i = 0; i < 12; i++) { await sleep(500); console.log(i, JSON.stringify(await st(p)), JSON.stringify(await p.evaluate(() => window.__SANMIK.activeScenes))); }
console.log(errors);
await b.close();
