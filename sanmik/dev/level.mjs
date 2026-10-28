import { launch, sleep, shot, tap, st } from './drive.mjs';
const { b, p, errors } = await launch();
await tap(p, 'Enter', 100); await sleep(200);
await p.evaluate(() => window.__SANMIK.game.scene.getScene('title').scene.start('select', { next: 'story' }));
await sleep(400); await tap(p, 'ArrowRight', 100); await tap(p, 'ArrowUp', 100); await tap(p, 'Enter', 100);
await sleep(1200); await shot(p, 'intro_crash');
await sleep(2600); await shot(p, 'intro_office');
for (let i = 0; i < 14; i++) { await tap(p, 'Enter', 60); await sleep(i === 13 ? 100 : 380); if (i === 7) await shot(p, 'intro_gabor'); }
await tap(p, 'Escape', 80); await sleep(300); await tap(p, 'Escape', 80);
await p.waitForFunction(() => window.__SANMIK.state()?.scene === 'tesko', null, { timeout: 15000 });
await sleep(1500); await shot(p, 'tesko_start');
await p.evaluate(() => window.__SANMIK.cheat.god(true));
for (const x of [700, 1300, 1950, 2300, 2750, 3000, 3700, 4050]) {
  await p.evaluate((x) => window.__SANMIK.cheat.teleport(x, 200), x);
  await sleep(900); await shot(p, `tesko_${x}`);
}
console.log(JSON.stringify(await st(p)));
console.log('errors', errors.filter(e => !e.includes('GL Driver')));
await b.close();
