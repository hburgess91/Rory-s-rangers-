import { launch, sleep, shot, tap, st } from './drive.mjs';
const [key, char = 'sanmik', limit = '240'] = process.argv.slice(2);
const { b, p, errors } = await launch();
await tap(p, 'Enter', 100); await sleep(300);
await p.evaluate((k) => window.__SANMIK.game.scene.getScene('title').scene.start('select', { next: { key: k } }), key);
await sleep(400); if (char === 'sanchz') await tap(p, 'ArrowRight', 100); await tap(p, 'Enter', 100);
await p.waitForFunction((k) => window.__SANMIK.state()?.scene === k, key, { timeout: 15000 });
await p.evaluate(() => window.__SANMIK.cheat.god(true));
for (let i = 0; i < 20; i++) { await tap(p, 'Enter', 60); await sleep(250); if ((await st(p))?.boss?.phase >= 0) break; }
const t0 = Date.now(); let last = -2; let i = 0;
await p.keyboard.down('j');
while (Date.now() - t0 < +limit * 1000) {
  const s = await st(p);
  if (!s || s.scene !== key) break;
  if (s.boss.phase !== last) { last = s.boss.phase; console.log(((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(s.boss)); await shot(p, `bot_${key}_${last}`); }
  if (s.boss.hp <= 0) break;
  const target = i % 40 < 20 ? 200 : 440;
  const k = s.x < target ? 'd' : 'a';
  await p.keyboard.down(k); await sleep(120); await p.keyboard.up(k);
  if (i % 3 === 0) { await p.keyboard.down('w'); await sleep(250); await p.keyboard.up('w'); }
  if (i % 5 === 0) await tap(p, 'k', 250);
  i++;
}
await p.keyboard.up('j');
console.log('END', ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify((await st(p))?.boss), JSON.stringify(await p.evaluate(() => window.__SANMIK.activeScenes)));
console.log('ERRORS', JSON.stringify(errors.filter(e => !e.includes('GL Driver'))));
await b.close();
