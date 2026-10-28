import { launch, sleep, shot, tap, st } from './drive.mjs';
const char = process.argv[2] || 'sanmik';
const { b, p, errors } = await launch();
await tap(p, 'Enter', 100); await sleep(300);
async function go(next, name) {
  await p.evaluate((n) => { const s = window.__SANMIK.activeScenes; for (const k of s) window.__SANMIK.game.scene.stop(k); window.__SANMIK.game.scene.start('select', { next: n }); }, next);
  await sleep(500);
  if (char === 'sanchz') await tap(p, 'ArrowRight', 100);
  await tap(p, 'Enter', 100);
  await sleep(1500);
  await shot(p, `${char}_${name}_a`);
  for (let i = 0; i < 12; i++) { await tap(p, 'Escape', 50); await sleep(120); if (await p.evaluate(() => window.__SANMIK.activeScenes.includes('pause'))) { await tap(p, 'Escape', 50); await sleep(150); } }
  await p.evaluate(() => window.__SANMIK.cheat.god(true));
  await sleep(1500);
  await shot(p, `${char}_${name}_b`);
  console.log(name, JSON.stringify(await st(p)));
}
for (const [next, name] of [[{ key: 'level', data: { id: 'jobcentre' } }, 'job'], [{ key: 'level', data: { id: 'freedom' } }, 'freedom'], [{ key: 'level', data: { id: 'warehouse' } }, 'pub'], [{ key: 'level', data: { id: 'lampe' } }, 'lampe']]) {
  await go(next, name);
  await p.evaluate(() => window.__SANMIK.cheat.teleport(1700, 200)); await sleep(1500); await shot(p, `${char}_${name}_c`);
}
for (const [key, name] of [['fame', 'fame'], ['tank', 'tank'], ['rik', 'rik'], ['gabor', 'gabor']]) {
  await go({ key }, name);
  await p.evaluate(() => window.__SANMIK.cheat.nextPhase());
  for (let ph = 0; ph < 3; ph++) {
    await p.keyboard.down('j'); await sleep(3500); await p.keyboard.up('j');
    await shot(p, `${char}_${name}_p${ph}`);
    console.log(name, ph, JSON.stringify((await st(p))?.boss));
    await p.evaluate(() => window.__SANMIK.cheat.nextPhase()); await sleep(2500);
  }
}
console.log('ERRORS', JSON.stringify(errors.filter(e => !e.includes('GL Driver'))));
await b.close();
