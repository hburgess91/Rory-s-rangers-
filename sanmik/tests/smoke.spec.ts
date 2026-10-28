import { test, expect, Page } from '@playwright/test';

// Browser smoke tests for the vertical slice. They drive the real game through
// keyboard input and read state through window.__SANMIK (see src/main.ts).

type State = {
  scene: string; x: number; y: number; hp: number; alive: boolean; onGround: boolean; jumps: number;
  projectiles: number; boss: { phase: number; hp: number; entries: string; mode: string } | null;
  music: string | null; sequencers: number; scopes: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tap(page: Page, key: string, hold = 90) {
  await page.keyboard.down(key);
  await sleep(hold);
  await page.keyboard.up(key);
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

async function boot(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__SANMIK?.activeScenes.includes('title'), null, { timeout: 30_000 });
  await tap(page, 'Enter');
  await sleep(250);
}

const state = (page: Page) => page.evaluate(() => (window as any).__SANMIK.state()) as Promise<State | null>;

async function enter(page: Page, next: 'gym' | 'begour' | 'story', char: 'sanmik' | 'sanchz') {
  await page.evaluate((n) => (window as any).__SANMIK.game.scene.getScene('title').scene.start('select', { next: n }), next);
  await sleep(400);
  if (char === 'sanchz') await tap(page, 'ArrowRight');
  await tap(page, 'Enter');
}

async function waitGameplay(page: Page, scene: string) {
  await page.waitForFunction((s) => (window as any).__SANMIK.state()?.scene === s, scene, { timeout: 20_000 });
  await sleep(300);
}

test('boots to the title menu without errors', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  const scenes = await page.evaluate(() => (window as any).__SANMIK.activeScenes);
  expect(scenes).toContain('title');
  expect(errors).toEqual([]);
});

for (const char of ['sanmik', 'sanchz'] as const) {
  test(`${char}: every accepted jump plays exactly one vocal`, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page);
    await enter(page, 'gym', char);
    await waitGameplay(page, 'gym');
    const voiceId = char === 'sanmik' ? 'vo_yee' : 'vo_yeghhh';
    const v0 = await page.evaluate((id) => (window as any).__SANMIK.audio.voice[id] ?? 0, voiceId);
    const j0 = (await state(page))!.jumps;
    // tap jumps, a long held jump (must not retrigger), and a mashed jump mid-air
    await tap(page, 'k', 80); await sleep(900);
    await tap(page, 'k', 700); await sleep(500);
    await tap(page, 'k', 60); await sleep(150); await tap(page, 'k', 60); await sleep(900);
    const v1 = await page.evaluate((id) => (window as any).__SANMIK.audio.voice[id] ?? 0, voiceId);
    const s = (await state(page))!;
    expect(s.jumps - j0).toBe(3);
    expect(v1 - v0).toBe(s.jumps - j0);
    expect(s.onGround).toBe(true);
    expect(errors).toEqual([]);
  });

  test(`${char}: can clear the widest gym gap and tallest step`, async ({ page }) => {
    await boot(page);
    await enter(page, 'gym', char);
    await waitGameplay(page, 'gym');
    // tallest step (68px): x 1020-1080. Run + full jump, stop once on top.
    await page.evaluate(() => (window as any).__SANMIK.cheat.teleport(992, 318));
    await sleep(300);
    await page.keyboard.down('d');
    await sleep(60);
    await page.keyboard.down('k');
    let onTop = false;
    for (let i = 0; i < 40 && !onTop; i++) {
      const s = (await state(page))!;
      if (s.onGround && s.y < 260 && s.x > 1022) onTop = true;
      await sleep(25);
    }
    await page.keyboard.up('d');
    await page.keyboard.up('k');
    expect(onTop).toBe(true);
    // widest gap (148px): runway 1648-1728, landing starts at x=1876
    await page.evaluate(() => (window as any).__SANMIK.cheat.teleport(1662, 318));
    await sleep(400);
    await page.keyboard.down('d');
    await sleep(300);
    await page.keyboard.down('k');
    let landed = false;
    for (let i = 0; i < 80 && !landed; i++) {
      const s = (await state(page))!;
      if (s.onGround && s.x > 1876 && s.y <= 321) landed = true;
      await sleep(25);
    }
    await page.keyboard.up('k');
    await page.keyboard.up('d');
    expect(landed).toBe(true);
    const s = (await state(page))!;
    expect(s.hp).toBe(4);
  });
}

test('death restarts cleanly without duplicating music or timers', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await enter(page, 'gym', 'sanmik');
  await waitGameplay(page, 'gym');
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => (window as any).__SANMIK.cheat.killPlayer());
    await page.waitForFunction(() => { const s = (window as any).__SANMIK.state(); return s && s.alive && s.hp === 4 && s.jumps === 0; }, null, { timeout: 10_000 });
    await sleep(300);
  }
  const s = (await state(page))!;
  expect(s.sequencers).toBe(1);
  expect(s.scopes).toBe(0);
  expect(s.music).toBe('mus_gym');
  expect(errors).toEqual([]);
});

test('Begour: all three phases, single transitions, then victory and results', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await enter(page, 'begour', 'sanmik');
  await waitGameplay(page, 'begour');
  await page.evaluate(() => (window as any).__SANMIK.cheat.god(true));
  await page.evaluate(() => (window as any).__SANMIK.cheat.nextPhase()); // skip intro -> phase 0
  await page.waitForFunction(() => (window as any).__SANMIK.state()?.boss?.phase === 0);
  await sleep(4000); // let some phase 0 attacks run
  for (const want of [1, 2]) {
    await page.evaluate(() => (window as any).__SANMIK.cheat.nextPhase());
    await page.waitForFunction((w) => (window as any).__SANMIK.state()?.boss?.phase === w, want);
    await sleep(want === 2 ? 6000 : 5000);
    const s = (await state(page))!;
    expect(s.scopes).toBe(1);
  }
  let s = (await state(page))!;
  expect(s.boss!.entries).toBe('1/1/1');
  await page.evaluate(() => (window as any).__SANMIK.cheat.killBoss());
  await sleep(300);
  s = (await state(page))!;
  expect(s.projectiles).toBe(0);
  expect(s.scopes).toBe(0);
  // click through the defeat dialogue until the results screen shows
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => (window as any).__SANMIK.activeScenes.includes('result'))) break;
    await tap(page, 'Enter', 60);
    await sleep(350);
  }
  await page.waitForFunction(() => (window as any).__SANMIK.activeScenes.includes('result'), null, { timeout: 20_000 });
  await page.evaluate(() => (window as any).__SANMIK.cheat.god(false));
  expect(errors).toEqual([]);
});

test('Begour: dying mid-fight retries straight into the fight', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await enter(page, 'begour', 'sanchz');
  await waitGameplay(page, 'begour');
  await page.evaluate(() => (window as any).__SANMIK.cheat.nextPhase());
  await page.evaluate(() => (window as any).__SANMIK.cheat.nextPhase()); // phase 1
  await sleep(2000);
  await page.evaluate(() => (window as any).__SANMIK.cheat.killPlayer());
  await page.waitForFunction(() => (window as any).__SANMIK.state()?.boss?.phase === 0, null, { timeout: 10_000 });
  const s = (await state(page))!;
  expect(s.alive).toBe(true);
  expect(s.boss!.entries).toBe('1/0/0');
  expect(s.sequencers).toBe(1);
  expect(s.scopes).toBe(1);
  expect(errors).toEqual([]);
});

test('story: intro skips into Big Tesk-O, and the exit leads to Begour', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await enter(page, 'story', 'sanchz');
  await page.waitForFunction(() => (window as any).__SANMIK.activeScenes.includes('intro'), null, { timeout: 10_000 });
  await sleep(500);
  await tap(page, 'Escape');
  await sleep(300);
  // if the dialogue had started, Escape skipped it; press again to be sure
  await tap(page, 'Escape');
  await waitGameplay(page, 'tesko');
  await page.evaluate(() => (window as any).__SANMIK.cheat.teleport(4100, 318));
  await page.keyboard.down('d');
  await waitGameplay(page, 'begour');
  await page.keyboard.up('d');
  expect(errors).toEqual([]);
});
