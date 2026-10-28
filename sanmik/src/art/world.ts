import Phaser from 'phaser';
import { Pix, buildSheet, buildImage, makeCanvas, rng } from './pix';
import { drawSanMik, drawSanChz } from './characters';

// Placeholder art for everything that isn't a player character.

const BROWN = '#9a6233', BROWN_HI = '#b97c45', BROWN_LO = '#6e4220', CREAM = '#f2d6a8', CREAM_LO = '#d9b47c', PINK = '#ff8fb4';

function begourHead(p: Pix, expr: string, frame = 0) {
  // ears
  for (const ex of [20, 84]) {
    p.circle(ex, 16, 14, BROWN);
    p.circle(ex, 16, 7, PINK);
  }
  p.ellipse(52, 47, 46, 38, BROWN);
  p.ellipse(44, 34, 28, 16, BROWN_HI);
  p.ellipse(52, 47, 46, 38, BROWN); // keep the outline clean
  p.ellipse(40, 30, 14, 6, BROWN_HI);
  p.ellipse(52, 62, 23, 16, CREAM);
  p.ellipse(52, 68, 18, 8, CREAM_LO);
  // cheeks
  p.ellipse(22, 56, 6, 4, '#ff9fb0');
  p.ellipse(82, 56, 6, 4, '#ff9fb0');
  // nose
  p.ellipse(52, 52, 7, 5, '#1b0f0a');
  p.rect(49, 49, 3, 2, '#6b5a55');
  const eyeL = 34, eyeR = 70, ey = 38;
  const dark = '#1b0f0a';
  switch (expr) {
    case 'happy':
      for (const x of [eyeL, eyeR]) { p.line(x - 6, ey + 2, x, ey - 3, dark, 2); p.line(x, ey - 3, x + 6, ey + 2, dark, 2); }
      p.ellipse(52, 68, 13, 8, '#5a1520'); p.rect(39, 60, 27, 7, CREAM); p.ellipse(52, 72, 7, 3, '#ff6b8a');
      break;
    case 'normal':
      for (const x of [eyeL, eyeR]) { p.ellipse(x, ey, 5, 7, dark); p.rect(x - 2, ey - 4, 2, 3, '#ffffff'); }
      p.line(42, 64, 52, 68, dark, 2); p.line(52, 68, 62, 64, dark, 2);
      break;
    case 'sad':
      for (const x of [eyeL, eyeR]) { p.ellipse(x, ey + 1, 5, 7, dark); p.rect(x - 2, ey - 3, 3, 3, '#ffffff'); p.rect(x - 2, ey + 5, 4, 2, '#8fd0ff'); }
      p.line(eyeL - 8, ey - 6, eyeL + 4, ey - 12, dark, 2); p.line(eyeR - 4, ey - 12, eyeR + 8, ey - 6, dark, 2);
      p.line(42, 70, 52, 65, dark, 2); p.line(52, 65, 62, 70, dark, 2);
      break;
    case 'cry':
      for (const x of [eyeL, eyeR]) { p.line(x - 6, ey, x + 6, ey, dark, 2); p.line(x - 6, ey - 4, x + 5, ey - 1, dark, 1); }
      for (const x of [eyeL - 3, eyeR + 1]) for (let y = ey + 2 + (frame ? 3 : 0); y < 84; y += 6) p.rect(x, y, 3, 4, '#7cc8ff');
      p.ellipse(52, 69, 12, 7, '#5a1520'); p.rect(40, 63, 25, 3, '#5a1520'); p.ellipse(52, 72, 6, 2, '#ff6b8a');
      p.line(eyeL - 8, ey - 7, eyeL + 4, ey - 12, dark, 2); p.line(eyeR - 4, ey - 12, eyeR + 8, ey - 7, dark, 2);
      break;
    case 'hurt':
      for (const x of [eyeL, eyeR]) { p.line(x - 5, ey - 4, x + 4, ey, dark, 2); p.line(x + 4, ey, x - 5, ey + 4, dark, 2); }
      p.ellipse(52, 68, 6, 6, '#5a1520');
      break;
    case 'shout':
      for (const x of [eyeL, eyeR]) { p.ellipse(x, ey, 6, 8, '#ffffff'); p.ellipse(x + 1, ey + 1, 3, 4, dark); }
      p.ellipse(52, 70, 14, 12, '#5a1520'); p.ellipse(52, 76, 8, 4, '#ff6b8a'); p.rect(42, 59, 21, 3, '#ffffff');
      break;
  }
}

function begourBody(p: Pix) {
  for (const fx of [34, 86]) { p.ellipse(fx, 90, 16, 9, BROWN_LO); p.ellipse(fx, 92, 9, 4, CREAM_LO); }
  p.ellipse(60, 56, 51, 40, BROWN);
  p.ellipse(40, 36, 20, 10, BROWN_HI);
  p.ellipse(60, 64, 33, 28, CREAM);
  p.ellipse(60, 74, 26, 14, CREAM_LO);
  p.ellipse(60, 64, 30, 24, CREAM);
  // belly button
  p.rect(59, 70, 3, 2, CREAM_LO);
  // friendship badge
  const bx = 86, by = 46;
  p.circle(bx, by, 9, '#ffd23a');
  p.circle(bx, by, 7, '#ffe98a');
  p.circle(bx - 2, by - 1, 2, '#ff4f7a'); p.circle(bx + 2, by - 1, 2, '#ff4f7a');
  p.poly([[bx - 4, by], [bx + 4, by], [bx, by + 4]], '#ff4f7a');
  // bow tie
  p.poly([[60, 20], [46, 13], [46, 27]], '#e2283c');
  p.poly([[60, 20], [74, 13], [74, 27]], '#e2283c');
  p.rect(57, 17, 7, 7, '#ff5a6a');
  p.px(49, 16, '#ff8a96'); p.px(70, 16, '#ff8a96');
}

function paw(p: Pix, w: number, h: number) {
  p.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, BROWN);
  p.ellipse(w / 2 - w * 0.1, h / 2 - h * 0.12, w * 0.2, h * 0.12, BROWN_HI);
  p.ellipse(w / 2, h * 0.62, w * 0.24, h * 0.18, CREAM);
  for (let i = 0; i < 4; i++) p.circle(w * 0.2 + i * w * 0.2, h * 0.32 - (i === 1 || i === 2 ? 3 : 0), Math.max(2, Math.round(w * 0.07)), CREAM);
}

function drawStar(p: Pix, cx: number, cy: number, r: number, c: string) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  p.poly(pts, c);
}

function heart(p: Pix, cx: number, cy: number, s: number, c: string, hi?: string) {
  p.circle(cx - s * 0.5, cy - s * 0.2, Math.round(s * 0.55), c);
  p.circle(cx + s * 0.5, cy - s * 0.2, Math.round(s * 0.55), c);
  p.poly([[cx - s * 1.05, cy], [cx + s * 1.05, cy], [cx, cy + s * 1.1]], c);
  if (hi) p.rect(Math.round(cx - s * 0.7), Math.round(cy - s * 0.5), 2, 2, hi);
}

export function buildWorldArt(scene: Phaser.Scene) {
  // ---------------- tiles ----------------
  buildImage(scene, 'tile_tesko_top', 32, 16, (p) => {
    p.rect(0, 0, 32, 16, '#d7d2c6');
    p.rect(0, 0, 32, 3, '#f4f1ea');
    p.rect(0, 8, 16, 8, '#c5bfb2'); p.rect(16, 0, 16, 8, '#c5bfb2');
    p.rect(0, 0, 32, 1, '#ffffff');
  }, false);
  buildImage(scene, 'tile_tesko_fill', 32, 32, (p) => {
    p.rect(0, 0, 32, 32, '#6f6a62');
    p.rect(0, 0, 16, 16, '#625d55'); p.rect(16, 16, 16, 16, '#625d55');
    p.px(5, 5, '#7d786f'); p.px(22, 21, '#7d786f');
  }, false);
  buildImage(scene, 'tile_forest_top', 32, 16, (p) => {
    p.rect(0, 0, 32, 16, '#7a4d2a');
    p.rect(0, 0, 32, 6, '#5fd36a');
    p.rect(0, 0, 32, 2, '#a8f08a');
    for (let x = 0; x < 32; x += 4) p.rect(x, 6, 2, 2 + (x % 8 ? 1 : 0), '#5fd36a');
    p.px(10, 11, '#9a6a42'); p.px(24, 13, '#9a6a42');
  }, false);
  buildImage(scene, 'tile_forest_fill', 32, 32, (p) => {
    p.rect(0, 0, 32, 32, '#6b4224');
    const r = rng(3);
    for (let i = 0; i < 16; i++) p.rect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 2, r() < 0.5 ? '#7d5030' : '#583519');
  }, false);
  buildImage(scene, 'tile_gym_top', 32, 16, (p) => {
    p.rect(0, 0, 32, 16, '#3a3f55'); p.rect(0, 0, 32, 2, '#ffd23a');
    for (let x = 0; x < 32; x += 8) p.rect(x, 2, 4, 2, '#1a1a1a');
  }, false);
  buildImage(scene, 'tile_gym_fill', 32, 32, (p) => { p.rect(0, 0, 32, 32, '#2a2e40'); p.rect(0, 0, 32, 1, '#343a52'); p.rect(0, 0, 1, 32, '#343a52'); }, false);
  buildImage(scene, 'plat_shelf', 32, 8, (p) => {
    p.rect(0, 0, 32, 8, '#e8e8ee'); p.rect(0, 0, 32, 2, '#ffffff'); p.rect(0, 6, 32, 2, '#9aa0b0');
    p.rect(2, 2, 4, 4, '#e2283c'); p.rect(10, 2, 3, 4, '#2f6cb4'); p.rect(20, 2, 5, 4, '#ffd23a');
  }, false);
  buildImage(scene, 'plat_branch', 32, 8, (p) => {
    p.rect(0, 1, 32, 6, '#8a5a2e'); p.rect(0, 1, 32, 2, '#b07a44'); p.rect(0, 0, 32, 2, '#6fe07a'); p.px(7, 5, '#5e3a18'); p.px(22, 4, '#5e3a18');
  }, false);
  buildImage(scene, 'plat_gym', 32, 8, (p) => { p.rect(0, 0, 32, 8, '#5a6080'); p.rect(0, 0, 32, 2, '#9fe2ff'); }, false);

  // ---------------- backgrounds ----------------
  {
    // Big Tesk-O back wall: shelves of parody products under strip lights
    const { c, ctx } = makeCanvas(320, 360);
    const p = new Pix(ctx);
    p.rect(0, 0, 320, 360, '#e9e5d8');
    p.rect(0, 0, 320, 40, '#d6d1c1');
    for (let x = 10; x < 320; x += 80) { p.rect(x, 14, 56, 4, '#ffffff'); p.rect(x, 18, 56, 2, '#c2c6d0'); }
    p.rect(0, 40, 320, 6, '#1f4fa8');
    p.rect(0, 46, 320, 3, '#e2283c');
    const r = rng(11);
    const cols = ['#e2283c', '#2f6cb4', '#ffd23a', '#3fbf6a', '#ff8a1a', '#7a3fd0', '#f2f2f2', '#8a5a2e'];
    for (let row = 0; row < 5; row++) {
      const y = 70 + row * 52;
      p.rect(0, y + 40, 320, 6, '#b8bcc8'); p.rect(0, y + 40, 320, 1, '#ffffff');
      let x = 2;
      while (x < 318) {
        const w = 6 + Math.floor(r() * 10), h = 16 + Math.floor(r() * 22);
        const col = cols[Math.floor(r() * cols.length)];
        p.rect(x, y + 40 - h, w, h, col);
        p.rect(x, y + 40 - h, w, 2, '#ffffff');
        if (w > 9 && r() < 0.4) p.rect(x + 2, y + 40 - h + 6, w - 4, 3, '#ffffff');
        x += w + 1;
      }
    }
    p.rect(0, 340, 320, 20, '#9a958a');
    scene.textures.addCanvas('bg_tesko', c);
  }
  {
    const { c, ctx } = makeCanvas(640, 120);
    const p = new Pix(ctx);
    // hanging aisle signs
    const signs = ['BIG TESK-O', 'EVERY LITTLE HURTS', 'GARDEN AISLE >', 'MEAL DEAL 4 CAKES'];
    signs.forEach((s, i) => {
      const x = 20 + i * 160;
      p.rect(x + 30, 0, 2, 30, '#555a66'); p.rect(x + 110, 0, 2, 30, '#555a66');
      p.rect(x, 30, 140, 22, '#1f4fa8'); p.rect(x, 50, 140, 4, '#e2283c');
      p.text(s, x + 70 - s.length * 4, 36, '#ffffff', 2);
    });
    scene.textures.addCanvas('bg_tesko_signs', c);
  }
  {
    const { c, ctx } = makeCanvas(320, 360);
    const g = ctx.createLinearGradient(0, 0, 0, 360);
    g.addColorStop(0, '#7fd4ff'); g.addColorStop(0.6, '#c9f0ff'); g.addColorStop(1, '#fff6d8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 360);
    const p = new Pix(ctx);
    for (const [x, y] of [[40, 50], [200, 30], [280, 80]]) { p.ellipse(x, y, 22, 8, '#ffffff'); p.ellipse(x + 12, y - 5, 12, 7, '#ffffff'); }
    p.ellipse(80, 330, 140, 90, '#a6ec9a'); p.ellipse(280, 340, 120, 80, '#90e08a');
    scene.textures.addCanvas('bg_forest', c);
  }
  {
    const { c, ctx } = makeCanvas(320, 220);
    const p = new Pix(ctx);
    const r = rng(5);
    for (let i = 0; i < 5; i++) {
      const x = 20 + i * 64 + Math.floor(r() * 20), h = 90 + Math.floor(r() * 60);
      p.rect(x - 4, 220 - h + 30, 8, h, '#8a5a2e');
      p.circle(x, 220 - h + 20, 26, ['#4fc85a', '#5fd36a', '#3fb84c'][i % 3]);
      p.circle(x - 14, 220 - h + 34, 16, '#46bf52');
      p.circle(x + 14, 220 - h + 32, 16, '#58cc62');
      // too-friendly tree faces
      p.rect(x - 7, 220 - h + 16, 3, 3, '#1b2a10'); p.rect(x + 4, 220 - h + 16, 3, 3, '#1b2a10');
      p.rect(x - 5, 220 - h + 24, 10, 2, '#1b2a10'); p.px(x - 6, 220 - h + 23, '#1b2a10'); p.px(x + 5, 220 - h + 23, '#1b2a10');
    }
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(r() * 310), col = ['#ff6fb0', '#ffd23a', '#ff8a1a', '#b56fff'][i % 4];
      p.rect(x + 2, 206, 2, 14, '#3a8a3a'); p.circle(x + 3, 204, 4, col); p.px(x + 3, 204, '#ffffff');
    }
    scene.textures.addCanvas('bg_forest_mid', c);
  }
  {
    // Begour arena: Frendship Forest clearing
    const { c, ctx } = makeCanvas(640, 360);
    const g = ctx.createLinearGradient(0, 0, 0, 360);
    g.addColorStop(0, '#89d8ff'); g.addColorStop(0.7, '#e0f7ff'); g.addColorStop(1, '#fff3cf');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 360);
    const p = new Pix(ctx);
    const bands = ['#ff5a6a', '#ff9a3a', '#ffe14a', '#6fe07a', '#5ab8ff', '#9a6aff'];
    bands.forEach((col, i) => { for (let a = 0; a <= 180; a += 0.5) { const rad = (a * Math.PI) / 180; const rr = 250 - i * 9; p.rect(Math.round(320 + Math.cos(rad) * rr), Math.round(330 - Math.sin(rad) * rr * 0.75), 3, 9, col); } });
    p.ellipse(120, 360, 220, 100, '#a6ec9a'); p.ellipse(520, 360, 220, 90, '#90e08a');
    for (const [x, y] of [[90, 60], [470, 40], [580, 90]]) { p.ellipse(x, y, 26, 9, '#ffffff'); p.ellipse(x + 14, y - 6, 14, 8, '#ffffff'); }
    const r = rng(8);
    for (const x of [30, 90, 560, 610]) {
      const h = 160 + Math.floor(r() * 40);
      p.rect(x - 6, 330 - h, 12, h, '#8a5a2e');
      p.circle(x, 330 - h, 36, '#4fc85a'); p.circle(x - 20, 330 - h + 18, 22, '#46bf52'); p.circle(x + 20, 330 - h + 16, 22, '#58cc62');
    }
    p.rect(250, 250, 4, 80, '#6b4224'); p.rect(386, 250, 4, 80, '#6b4224');
    p.rect(236, 232, 168, 30, '#8a5a2e'); p.rect(238, 234, 164, 26, '#b07a44');
    p.text('FRENDSHIP FOREST', 256, 241, '#fff6d8', 2);
    scene.textures.addCanvas('bg_arena', c);
  }
  {
    const { c, ctx } = makeCanvas(64, 64);
    const p = new Pix(ctx);
    p.rect(0, 0, 64, 64, '#1c1f2e'); p.rect(0, 0, 64, 1, '#2a2f45'); p.rect(0, 0, 1, 64, '#2a2f45'); p.rect(32, 0, 1, 64, '#24283a'); p.rect(0, 32, 64, 1, '#24283a');
    scene.textures.addCanvas('bg_gym', c);
  }

  // ---------------- enemies ----------------
  buildSheet(scene, 'enemy_trolley', 36, 32, [0, 1].map((f) => ({
    name: `roll_${f}`,
    draw: (p: Pix) => {
      // goblin
      p.ellipse(13, 9, 7, 7, '#6fcf4a'); p.rect(4, 6, 4, 2, '#6fcf4a'); p.rect(19, 6, 4, 2, '#6fcf4a');
      p.rect(9, 7, 3, 3, '#ffffff'); p.rect(15, 7, 3, 3, '#ffffff'); p.px(11, 8, '#000'); p.px(17, 8, '#000');
      p.rect(9, 12, 8, 2, '#2a0a0a'); p.px(10, 12, '#fff'); p.px(15, 12, '#fff');
      p.rect(9, 15, 8, 6, '#e2283c');
      // trolley
      p.rect(2, 16, 2, 4, '#444'); p.rect(2, 16, 8, 2, '#e2283c');
      p.poly([[6, 18], [34, 18], [30, 27], [9, 27]], '#b9c1cc');
      for (let x = 9; x < 32; x += 3) p.rect(x, 19, 1, 8, '#7d8592');
      p.rect(7, 22, 26, 1, '#7d8592');
      const o = f ? 1 : 0;
      p.circle(11, 29, 2, '#222'); p.circle(28, 29, 2, '#222'); p.px(11 + o, 29, '#888'); p.px(28 - o, 29, '#888');
    },
  })));
  buildSheet(scene, 'enemy_wasp', 24, 20, [0, 1].map((f) => ({
    name: `fly_${f}`,
    draw: (p: Pix) => {
      if (f) { p.ellipse(10, 4, 6, 3, '#e8f8ff'); p.ellipse(16, 4, 5, 3, '#cfeeff'); } else { p.ellipse(9, 7, 6, 2, '#e8f8ff'); p.ellipse(16, 7, 5, 2, '#cfeeff'); }
      p.ellipse(12, 12, 8, 5, '#ffd23a');
      p.rect(9, 8, 2, 9, '#1a1a1a'); p.rect(13, 8, 2, 9, '#1a1a1a');
      p.circle(19, 11, 3, '#1a1a1a'); p.px(20, 10, '#ff3a3a');
      p.poly([[3, 12], [0, 14], [4, 14]], '#1a1a1a');
    },
  })));
  buildSheet(scene, 'enemy_mascot', 26, 34, [0, 1].map((f) => ({
    name: `hop_${f}`,
    draw: (p: Pix) => {
      const sq = f ? 2 : 0;
      // "Happy Spud", the Big Tesk-O mascot
      p.ellipse(13, 18 + sq, 11, 12 - sq, '#d9a24a');
      p.px(7, 12 + sq, '#a8742a'); p.px(17, 22, '#a8742a'); p.px(10, 25, '#a8742a');
      p.rect(6, 13 + sq, 5, 5, '#ffffff'); p.rect(14, 13 + sq, 5, 5, '#ffffff');
      p.rect(8, 15 + sq, 2, 2, '#000'); p.rect(16, 15 + sq, 2, 2, '#000');
      p.ellipse(13, 23 + sq, 6, 3, '#4a0a0a'); p.rect(8, 21 + sq, 10, 1, '#ffffff');
      p.rect(9, 3 + sq, 8, 4, '#1f4fa8'); p.rect(6, 6 + sq, 14, 2, '#1f4fa8');
      p.rect(7, 30, 4, 3, '#1f4fa8'); p.rect(15, 30, 4, 3, '#1f4fa8');
    },
  })));
  buildImage(scene, 'enemy_dummy', 34, 62, (p) => {
    // cardboard SanMik cutout
    p.rect(2, 2, 30, 58, '#c9a36a');
    p.rect(4, 4, 26, 54, '#e0c08a');
    const tmp = new Pix(p.ctx, 0, -6);
    tmp.ox = -6; tmp.oy = -10;
    drawSanMik(tmp, {}, 'classic');
    p.rect(2, 52, 30, 8, '#c9a36a');
    p.text('FREE', 9, 54, '#7a3a1a');
  }, true, '#5a3a1a');

  // ---------------- Begour ----------------
  buildImage(scene, 'begour_body', 120, 100, begourBody);
  buildSheet(scene, 'begour_head', 104, 88, [
    { name: 'happy', draw: (p) => begourHead(p, 'happy') },
    { name: 'normal', draw: (p) => begourHead(p, 'normal') },
    { name: 'sad', draw: (p) => begourHead(p, 'sad') },
    { name: 'cry_0', draw: (p) => begourHead(p, 'cry', 0) },
    { name: 'cry_1', draw: (p) => begourHead(p, 'cry', 1) },
    { name: 'hurt', draw: (p) => begourHead(p, 'hurt') },
    { name: 'shout', draw: (p) => begourHead(p, 'shout') },
  ]);
  buildImage(scene, 'begour_slide', 150, 52, (p) => {
    // belly slide, facing right: feet at the back, paws out front, delighted face
    for (const fy of [30, 42]) { p.ellipse(10, fy, 8, 6, BROWN_LO); p.ellipse(8, fy, 4, 3, CREAM_LO); }
    p.ellipse(58, 34, 50, 16, BROWN);
    p.ellipse(52, 26, 34, 6, BROWN_HI);
    p.ellipse(60, 44, 40, 6, CREAM);
    p.ellipse(118, 44, 16, 6, BROWN);
    p.ellipse(136, 44, 10, 6, BROWN);
    p.circle(140, 44, 3, CREAM);
    p.circle(104, 24, 20, BROWN);
    p.circle(92, 8, 7, BROWN); p.circle(92, 8, 3, PINK);
    p.circle(110, 6, 7, BROWN); p.circle(110, 6, 3, PINK);
    p.ellipse(114, 30, 11, 8, CREAM);
    p.ellipse(121, 26, 4, 3, '#1b0f0a');
    p.line(100, 18, 104, 14, '#1b0f0a', 2); p.line(104, 14, 108, 18, '#1b0f0a', 2);
    p.ellipse(112, 34, 6, 3, '#5a1520');
    p.rect(66, 16, 8, 6, '#e2283c');
    for (let x = 22; x < 92; x += 14) p.rect(x, 50, 6, 2, '#ffffff');
  });
  buildImage(scene, 'begour_paw', 40, 40, (p) => paw(p, 40, 40));
  buildImage(scene, 'begour_bigpaw', 96, 120, (p) => paw(p, 96, 120));
  buildImage(scene, 'begour_target', 22, 20, (p) => heart(p, 11, 8, 8, '#ff2f6f', '#ffffff'));

  // ---------------- player projectiles ----------------
  buildImage(scene, 'p_mikwave', 12, 16, (p) => {
    p.line(3, 2, 7, 8, '#7ff3ff', 2); p.line(7, 8, 3, 14, '#7ff3ff', 2);
    p.line(7, 4, 10, 8, '#e8ffff', 1); p.line(10, 8, 7, 12, '#e8ffff', 1);
  }, false);
  buildImage(scene, 'p_yee', 48, 48, (p) => {
    for (let a = -70; a <= 70; a += 2) { const r = (a * Math.PI) / 180; p.rect(Math.round(20 + Math.cos(r) * 20), Math.round(24 + Math.sin(r) * 20), 4, 4, '#7ff3ff'); }
    for (let a = -60; a <= 60; a += 3) { const r = (a * Math.PI) / 180; p.rect(Math.round(16 + Math.cos(r) * 14), Math.round(24 + Math.sin(r) * 14), 3, 3, '#ffffff'); }
    p.text('YEE', 8, 21, '#ff3ad0', 2);
  }, false);
  buildImage(scene, 'p_pellet', 5, 4, (p) => { p.rect(0, 0, 5, 4, '#ffd23a'); p.rect(0, 1, 3, 2, '#ffffff'); }, false);
  buildImage(scene, 'p_bullet', 7, 3, (p) => { p.rect(0, 0, 7, 3, '#ffb03a'); p.rect(3, 1, 4, 1, '#ffffff'); }, false);
  buildImage(scene, 'p_doughnut', 13, 13, (p) => {
    p.circle(6, 6, 5, '#d99a52'); p.circle(6, 5, 4, '#ff8fc4'); p.circle(6, 6, 1, '#7a1020');
    p.px(4, 3, '#ffffff'); p.px(8, 4, '#ffe14a'); p.px(3, 6, '#5ab8ff');
  });
  buildImage(scene, 'p_bean', 10, 12, (p) => {
    p.rect(1, 1, 8, 10, '#2a7ad0'); p.rect(1, 1, 8, 2, '#c9d3dc'); p.rect(1, 9, 8, 2, '#c9d3dc'); p.rect(2, 4, 6, 4, '#ff8a1a'); p.px(3, 5, '#ffd23a');
  });
  buildImage(scene, 'p_sausage', 16, 9, (p) => {
    p.ellipse(8, 4, 7, 3, '#e8b45a'); p.ellipse(8, 3, 6, 2, '#f8d48a'); p.rect(4, 3, 8, 3, '#a8543a'); p.px(5, 2, '#fff');
  });

  // ---------------- enemy projectiles ----------------
  buildImage(scene, 'e_heart', 16, 15, (p) => heart(p, 8, 6, 6, '#ff4f8f', '#ffffff'));
  buildImage(scene, 'e_heart_teeth', 16, 15, (p) => { heart(p, 8, 6, 6, '#ff2f5f'); p.rect(4, 7, 8, 2, '#ffffff'); p.px(5, 9, '#ffffff'); p.px(8, 9, '#ffffff'); p.px(11, 9, '#ffffff'); });
  buildImage(scene, 'e_honeyjar', 16, 18, (p) => {
    p.rect(3, 5, 10, 11, '#ffb21a'); p.rect(3, 5, 10, 3, '#ffd46a'); p.rect(4, 2, 8, 3, '#e2283c'); p.rect(5, 9, 6, 4, '#ffffff'); p.text('H', 6, 9, '#e2283c');
  });
  buildSheet(scene, 'e_bee', 16, 13, [0, 1].map((f) => ({
    name: `b_${f}`,
    draw: (p: Pix) => {
      if (f) p.ellipse(7, 3, 4, 2, '#ffffff'); else p.ellipse(6, 4, 5, 2, '#ffffff');
      p.ellipse(8, 8, 6, 4, '#ffd23a'); p.rect(6, 4, 2, 8, '#1a1a1a'); p.rect(10, 4, 2, 8, '#1a1a1a');
      p.rect(13, 6, 2, 2, '#1a1a1a'); p.px(14, 6, '#fff');
      // wind-up key on its back: it's a toy
      p.rect(3, 1, 1, 3, '#c9c9c9'); p.rect(2, 1, 3, 1, '#c9c9c9');
    },
  })));
  buildImage(scene, 'e_tear', 9, 13, (p) => { p.poly([[4, 0], [8, 8], [0, 8]], '#5ab8ff'); p.circle(4, 8, 4, '#5ab8ff'); p.rect(3, 6, 2, 2, '#e8f8ff'); });
  buildImage(scene, 'e_orb', 13, 13, (p) => { p.circle(6, 6, 5, '#ffffff'); p.circle(6, 6, 3, '#ffe6f6'); });
  buildImage(scene, 'e_wave', 24, 10, (p) => { p.ellipse(12, 6, 11, 4, '#5ab8ff'); p.ellipse(12, 5, 8, 3, '#a8e2ff'); p.rect(4, 3, 3, 2, '#ffffff'); });
  buildImage(scene, 'e_shell', 8, 8, (p) => { p.circle(4, 4, 3, '#ff3a3a'); p.px(3, 3, '#ffffff'); });

  // ---------------- effects ----------------
  buildImage(scene, 'fx_px', 2, 2, (p) => p.rect(0, 0, 2, 2, '#ffffff'), false);
  buildImage(scene, 'fx_spark', 9, 9, (p) => { p.rect(4, 0, 1, 9, '#ffffff'); p.rect(0, 4, 9, 1, '#ffffff'); p.rect(3, 3, 3, 3, '#ffffff'); }, false);
  buildImage(scene, 'fx_star', 11, 11, (p) => drawStar(p, 5, 5, 5, '#ffe14a'));
  buildImage(scene, 'fx_ring', 32, 32, (p) => { for (let a = 0; a < 360; a += 3) { const r = (a * Math.PI) / 180; p.rect(Math.round(15 + Math.cos(r) * 14), Math.round(15 + Math.sin(r) * 14), 2, 2, '#ffffff'); } }, false);
  buildSheet(scene, 'fx_gas', 44, 32, [0, 1].map((f) => ({
    name: `g_${f}`,
    outline: false,
    draw: (p: Pix) => {
      const r = rng(20 + f);
      for (let i = 0; i < 9; i++) p.circle(8 + Math.floor(r() * 28), 8 + Math.floor(r() * 16), 5 + Math.floor(r() * 5), i % 2 ? '#8fd05a' : '#a8e06a');
      for (let i = 0; i < 6; i++) p.circle(10 + Math.floor(r() * 24), 10 + Math.floor(r() * 12), 2, '#c9f08a');
      for (let i = 0; i < 4; i++) p.px(6 + Math.floor(r() * 32), 6 + Math.floor(r() * 20), '#5a8a2a');
    },
  })));
  buildImage(scene, 'fx_jam', 18, 9, (p) => { p.ellipse(9, 5, 8, 3, '#c8102e'); p.circle(3, 3, 2, '#c8102e'); p.circle(14, 2, 1, '#c8102e'); p.px(7, 4, '#ff6a7a'); }, false);
  buildImage(scene, 'fx_honey', 56, 8, (p) => { p.ellipse(28, 4, 27, 3, '#ffb21a'); p.ellipse(20, 3, 12, 1, '#ffe08a'); for (const x of [8, 30, 46]) p.rect(x, 5, 2, 3, '#ffb21a'); }, false);
  buildImage(scene, 'fx_shadow', 48, 10, (p) => { p.ellipse(24, 5, 23, 4, '#000000'); }, false);
  buildImage(scene, 'fx_wish', 16, 16, (p) => { drawStar(p, 8, 8, 7, '#ffffff'); drawStar(p, 8, 8, 4, '#ffe14a'); });
  buildImage(scene, 'fx_warn', 16, 16, (p) => { p.poly([[8, 1], [15, 14], [1, 14]], '#ffd23a'); p.rect(7, 5, 2, 5, '#1a1a1a'); p.rect(7, 11, 2, 2, '#1a1a1a'); });
  buildImage(scene, 'fx_flash', 24, 24, (p) => { drawStar(p, 12, 12, 11, '#ffffff'); }, false);

  // ---------------- pickups ----------------
  buildImage(scene, 'pk_food', 18, 16, (p) => {
    // greasy chip-shop special
    p.rect(1, 6, 16, 9, '#e2283c'); p.rect(1, 6, 16, 2, '#ff6a6a');
    for (let x = 3; x < 16; x += 3) p.rect(x, 1 + (x % 2), 2, 6, '#ffd23a');
    p.text('FAT', 4, 9, '#ffffff');
  });
  const can = (p: Pix, body: string, band: string, label: string) => {
    p.rect(3, 1, 10, 16, body); p.rect(3, 1, 10, 2, '#c9d3dc'); p.rect(3, 15, 10, 2, '#c9d3dc');
    p.circle(8, 9, 3, band); p.rect(5, 8, 7, 2, '#ffffff'); p.rect(4, 3, 1, 11, '#ffffff');
    p.text(label, 3, 12, '#ffffff');
  };
  buildImage(scene, 'pk_pepsi', 16, 18, (p) => can(p, '#1f4fa8', '#e2283c', 'P'));
  buildImage(scene, 'pk_pepsimax', 16, 18, (p) => can(p, '#141414', '#2f6cb4', 'MX'));
  buildImage(scene, 'pk_friggle', 16, 16, (p) => { p.circle(8, 8, 7, '#b56fff'); p.circle(6, 6, 2, '#e2c8ff'); p.text('?', 7, 6, '#ffffff'); });
  buildImage(scene, 'pk_spidge', 16, 16, (p) => { p.circle(8, 8, 7, '#3fd0b0'); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; p.line(8, 8, 8 + Math.cos(a) * 8, 8 + Math.sin(a) * 8, '#1f7a6a', 1); } p.circle(8, 8, 3, '#bff8e8'); });
  buildImage(scene, 'pk_sock', 14, 18, (p) => { p.rect(3, 1, 6, 11, '#f4f4f4'); p.rect(3, 9, 10, 6, '#f4f4f4'); p.rect(3, 1, 6, 2, '#e2283c'); p.rect(3, 4, 6, 1, '#2f6cb4'); p.rect(9, 13, 3, 2, '#d0d0d0'); });
  buildImage(scene, 'pk_crate', 20, 18, (p) => { p.rect(1, 1, 18, 16, '#b07a44'); p.rect(1, 1, 18, 2, '#d49a5e'); p.line(2, 2, 17, 15, '#7a4a22', 1); p.line(17, 2, 2, 15, '#7a4a22', 1); p.rect(5, 6, 10, 7, '#fff6d8'); });
  buildImage(scene, 'pk_football', 12, 12, (p) => { p.circle(6, 6, 5, '#ffffff'); p.rect(5, 4, 3, 3, '#111'); p.px(2, 7, '#111'); p.px(9, 8, '#111'); });

  // ---------------- props ----------------
  buildImage(scene, 'prop_checkpoint', 20, 40, (p) => {
    p.rect(9, 6, 2, 34, '#888'); p.rect(4, 36, 12, 4, '#555');
    p.poly([[11, 6], [19, 10], [11, 15]], '#ff3ad0');
  });
  buildImage(scene, 'prop_checkpoint_on', 20, 40, (p) => {
    p.rect(9, 6, 2, 34, '#888'); p.rect(4, 36, 12, 4, '#555');
    p.poly([[11, 2], [19, 6], [11, 11]], '#5fd36a'); drawStar(p, 10, 26, 4, '#ffe14a');
  });
  buildImage(scene, 'prop_sign', 72, 44, (p) => { p.rect(33, 30, 6, 14, '#6b4224'); p.rect(1, 1, 70, 32, '#6b4224'); p.rect(3, 3, 66, 28, '#fff6d8'); });
  buildImage(scene, 'prop_arch', 96, 110, (p) => {
    p.rect(4, 20, 10, 90, '#8a5a2e'); p.rect(82, 20, 10, 90, '#8a5a2e');
    p.rect(0, 8, 96, 22, '#b07a44'); p.rect(2, 10, 92, 18, '#fff0c8');
    p.text('FRENDSHIP', 12, 13, '#e2283c', 2);
    for (let i = 0; i < 6; i++) p.circle(8 + i * 16, 6, 4, ['#ff6fb0', '#ffd23a', '#6fe07a', '#5ab8ff', '#b56fff', '#ff8a1a'][i]);
  });
  buildImage(scene, 'prop_trolleys', 80, 36, (p) => {
    for (let i = 0; i < 4; i++) { const x = i * 14; p.poly([[x + 4, 6], [x + 30, 6], [x + 27, 26], [x + 7, 26]], '#b9c1cc'); p.rect(x + 2, 2, 2, 6, '#e2283c'); p.circle(x + 9, 31, 2, '#222'); p.circle(x + 26, 31, 2, '#222'); }
  });
  buildImage(scene, 'prop_chair', 16, 22, (p) => { p.rect(2, 1, 12, 9, '#e2283c'); p.rect(1, 10, 14, 3, '#c81828'); p.rect(2, 13, 2, 8, '#555'); p.rect(12, 13, 2, 8, '#555'); });
  for (let v = 0; v < 3; v++) {
    buildImage(scene, `prop_fan${v}`, 14, 22, (p) => {
      const col = ['#ff3ad0', '#5ab8ff', '#ffd23a'][v];
      p.circle(7, 5, 4, '#2a1a1a'); p.rect(3, 9, 8, 12, col);
      p.rect(v === 1 ? 0 : 11, 1 + v, 2, 9, col);
    });
  }
  buildImage(scene, 'prop_bush', 48, 28, (p) => { p.circle(12, 18, 10, '#46bf52'); p.circle(26, 13, 13, '#58cc62'); p.circle(38, 18, 9, '#3fb84c'); p.px(20, 10, '#ff6fb0'); p.px(34, 14, '#ffd23a'); });

  // ---------------- UI ----------------
  buildImage(scene, 'ui_heart', 11, 10, (p) => heart(p, 5, 3, 4, '#ff2f5f', '#ffffff'));
  buildImage(scene, 'ui_heart_empty', 11, 10, (p) => heart(p, 5, 3, 4, '#3a2a3a'));
  buildImage(scene, 'ui_sock', 10, 12, (p) => { p.rect(2, 1, 4, 7, '#f4f4f4'); p.rect(2, 6, 7, 4, '#f4f4f4'); p.rect(2, 1, 4, 1, '#e2283c'); });
  // character portraits (head crops), 28x28
  buildImage(scene, 'ui_face_sanmik', 30, 30, (p) => { const q = new Pix(p.ctx, -9, -6); drawSanMik(q, {}, 'classic'); }, true);
  buildImage(scene, 'ui_face_sanchz', 30, 30, (p) => { const q = new Pix(p.ctx, -14, 4); drawSanChz(q, {}, 'classic'); }, true);
}

export function registerWorldAnims(scene: Phaser.Scene) {
  const mk = (key: string, tex: string, frames: string[], rate: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate: rate, repeat: -1 });
  };
  mk('trolley_roll', 'enemy_trolley', ['roll_0', 'roll_1'], 10);
  mk('wasp_fly', 'enemy_wasp', ['fly_0', 'fly_1'], 16);
  mk('mascot_hop', 'enemy_mascot', ['hop_0', 'hop_1'], 4);
  mk('bee_fly', 'e_bee', ['b_0', 'b_1'], 14);
  mk('gas_boil', 'fx_gas', ['g_0', 'g_1'], 6);
  mk('begour_cry', 'begour_head', ['cry_0', 'cry_1'], 6);
}
