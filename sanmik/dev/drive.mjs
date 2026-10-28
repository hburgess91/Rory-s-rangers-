// Usage: node dev/drive.mjs <script.json-ish steps via JS file>
import { chromium } from 'playwright';
const SHOTS = process.env.SHOTS || '.';
export async function launch() {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { errors.push(m.text()); console.log('console:', m.type(), m.text()); } });
  p.on('pageerror', (e) => { errors.push(e.message); console.log('pageerror:', e.message, e.stack?.split('\n').slice(0,4).join(' | ')); });
  await p.goto('http://localhost:5199/');
  await p.waitForFunction(() => window.__SANMIK && window.__SANMIK.activeScenes.includes('title'), null, { timeout: 20000 });
  return { b, p, errors };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function shot(p, name) { await p.screenshot({ path: `${SHOTS}/${name}.png` }); }
export async function tap(p, key, hold = 60) { await p.keyboard.down(key); await sleep(hold); await p.keyboard.up(key); }
export async function toScene(p, next, char = 'sanmik') {
  // title -> select -> scene, via the real menus
  await p.evaluate(({ next }) => { const t = window.__SANMIK.game.scene.getScene('title'); t.scene.start('select', { next }); }, { next });
  await sleep(400);
  if (char === 'sanchz') await tap(p, 'ArrowRight', 100);
  await tap(p, 'Enter', 100);
  await p.waitForFunction(() => window.__SANMIK.state() !== null, null, { timeout: 10000 });
  await sleep(300);
}
export const st = (p) => p.evaluate(() => window.__SANMIK.state());
