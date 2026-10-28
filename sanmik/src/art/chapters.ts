import Phaser from 'phaser';
import { Pix, buildImage, buildSheet, makeCanvas, rng } from './pix';

// Tiles, backgrounds and chapter-specific enemies for chapters 1, 3, 4 and 5.

function tile(scene: Phaser.Scene, key: string, top: (p: Pix) => void, fill: (p: Pix) => void, plat: (p: Pix) => void) {
  buildImage(scene, `tile_${key}_top`, 32, 16, top, false);
  buildImage(scene, `tile_${key}_fill`, 32, 32, fill, false);
  buildImage(scene, `plat_${key}`, 32, 8, plat, false);
}

function bg(scene: Phaser.Scene, key: string, w: number, h: number, draw: (p: Pix, ctx: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const { c, ctx } = makeCanvas(w, h);
  draw(new Pix(ctx), ctx);
  scene.textures.addCanvas(key, c);
}

function grad(ctx: CanvasRenderingContext2D, w: number, h: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function buildChapterArt(scene: Phaser.Scene) {
  // ---------------- tiles ----------------
  tile(scene, 'office',
    (p) => { p.rect(0, 0, 32, 16, '#8a94c8'); p.rect(0, 0, 32, 3, '#c8d0ff'); p.rect(0, 3, 32, 1, '#6a74a8'); for (let x = 0; x < 32; x += 4) p.px(x + 1, 8, '#7a84b8'); },
    (p) => { p.rect(0, 0, 32, 32, '#5a6290'); p.rect(0, 0, 32, 1, '#6a72a0'); p.px(8, 12, '#6a72a0'); p.px(24, 26, '#6a72a0'); },
    (p) => { p.rect(0, 0, 32, 8, '#e8e4d8'); p.rect(0, 0, 32, 2, '#ffffff'); p.rect(0, 6, 32, 2, '#8a8070'); p.rect(4, 2, 10, 3, '#f8f8ff'); p.rect(16, 2, 8, 3, '#d8e8ff'); });
  tile(scene, 'street',
    (p) => { p.rect(0, 0, 32, 16, '#4a4a52'); p.rect(0, 0, 32, 4, '#8a8a92'); p.rect(0, 4, 32, 1, '#2a2a30'); p.rect(15, 4, 1, 12, '#3a3a40'); p.px(6, 10, '#5a5a62'); },
    (p) => { p.rect(0, 0, 32, 32, '#2a2a30'); p.px(10, 8, '#38383f'); p.px(22, 20, '#38383f'); },
    (p) => { p.rect(0, 0, 32, 8, '#5a5040'); p.rect(0, 0, 32, 2, '#8a7a60'); for (let x = 0; x < 32; x += 8) p.rect(x, 2, 1, 6, '#3a3020'); });
  tile(scene, 'pub',
    (p) => { p.rect(0, 0, 32, 16, '#6a1a2a'); p.rect(0, 0, 32, 3, '#8a3a2a'); const r = rng(2); for (let i = 0; i < 10; i++) p.px(Math.floor(r() * 32), 4 + Math.floor(r() * 12), r() < 0.5 ? '#c8a03a' : '#3a0a14'); },
    (p) => { p.rect(0, 0, 32, 32, '#3a2014'); p.rect(0, 15, 32, 1, '#2a140a'); p.rect(15, 0, 1, 15, '#2a140a'); },
    (p) => { p.rect(0, 0, 32, 8, '#6b3a1a'); p.rect(0, 0, 32, 2, '#9a5a2a'); p.rect(3, 2, 3, 4, '#c8a03a'); p.rect(20, 2, 4, 4, '#3a6a3a'); });
  tile(scene, 'heaven',
    (p) => { p.rect(0, 0, 32, 16, '#e8ecff'); p.circle(6, 4, 6, '#ffffff'); p.circle(18, 3, 7, '#ffffff'); p.circle(29, 5, 5, '#ffffff'); p.rect(0, 12, 32, 4, '#d0d8f8'); },
    (p) => { p.rect(0, 0, 32, 32, '#d0d8f8'); p.circle(10, 12, 6, '#e0e6ff'); p.circle(24, 24, 5, '#e0e6ff'); },
    (p) => { p.rect(0, 1, 32, 6, '#ffe9a0'); p.rect(0, 1, 32, 2, '#fff8d8'); p.px(6, 4, '#e8c860'); p.px(22, 4, '#e8c860'); });
  tile(scene, 'velvet',
    (p) => { p.rect(0, 0, 32, 16, '#3a0a14'); p.rect(0, 0, 32, 3, '#c8a03a'); p.rect(0, 3, 32, 1, '#7a5a1a'); for (let x = 0; x < 32; x += 8) p.rect(x, 6, 4, 10, '#4a0f1c'); },
    (p) => { p.rect(0, 0, 32, 32, '#2a0610'); for (let x = 0; x < 32; x += 8) p.rect(x, 0, 4, 32, '#330812'); },
    (p) => { p.rect(0, 0, 32, 8, '#c8a03a'); p.rect(0, 0, 32, 2, '#ffe08a'); p.rect(0, 6, 32, 2, '#7a5a1a'); });

  // ---------------- backgrounds ----------------
  bg(scene, 'bg_jobcentre', 320, 360, (p, ctx) => {
    grad(ctx, 320, 360, [[0, '#cfd8ff'], [1, '#eef0ff']]);
    p.rect(0, 60, 320, 4, '#a8b0e0');
    for (let x = 10; x < 320; x += 80) { p.rect(x, 90, 50, 70, '#aab4e8'); p.rect(x + 3, 93, 44, 64, '#dfe6ff'); p.rect(x + 24, 93, 2, 64, '#aab4e8'); }
    p.rect(30, 180, 260, 6, '#b8c0e8');
    // queue rope posts + ticket sign
    for (let x = 20; x < 320; x += 60) { p.rect(x, 250, 4, 70, '#c8a03a'); p.circle(x + 2, 248, 4, '#e8c060'); }
    for (let x = 22; x < 300; x += 60) p.line(x, 256, x + 60, 262, '#c8102e', 2);
    p.rect(200, 20, 110, 30, '#1f4fa8'); p.text('NOW SERVING 666', 206, 30, '#ffe14a');
    for (let i = 0; i < 6; i++) p.ellipse(25 + i * 55, 345, 40, 16, '#ffffff');
  });
  bg(scene, 'bg_jobcentre_mid', 640, 120, (p) => {
    const signs = ['JOBCENTRE BEYOND', 'TAKE A TICKET', 'U R DEAD. PLEASE WAIT', 'NO SMOKING (IN HELL)'];
    signs.forEach((s, i) => { const x = 10 + i * 160; const k = s.length * 8 > 140 ? 1 : 2; p.rect(x, 20, 150, 22, '#3a6ad0'); p.rect(x, 40, 150, 3, '#ffe14a'); p.text(s, x + 75 - s.length * 2 * k, k === 2 ? 26 : 29, '#ffffff', k); });
  });
  bg(scene, 'bg_street', 320, 360, (p, ctx) => {
    grad(ctx, 320, 360, [[0, '#0a0a24'], [0.7, '#1a1440'], [1, '#2a1a3a']]);
    const r = rng(31);
    for (let i = 0; i < 40; i++) p.px(Math.floor(r() * 320), Math.floor(r() * 150), '#ffffff');
    p.circle(260, 50, 14, '#fff6c8');
    // terraced shops of Catford
    for (let i = 0; i < 5; i++) {
      const x = i * 64, h = 110 + Math.floor(r() * 50);
      p.rect(x, 330 - h, 62, h, ['#3a2a3a', '#2a2a40', '#3a2a2a'][i % 3]);
      for (let wy = 330 - h + 10; wy < 290; wy += 22) for (let wx = x + 6; wx < x + 58; wx += 16) p.rect(wx, wy, 8, 12, r() < 0.5 ? '#ffd86a' : '#1a1a2a');
      p.rect(x + 4, 292, 54, 16, ['#c8102e', '#1f4fa8', '#2fae4a'][i % 3]);
    }
    p.text('KEBAB', 10, 297, '#ffffff'); p.text('BETS', 140, 297, '#ffffff'); p.text('VAPE', 204, 297, '#ffffff');
  });
  bg(scene, 'bg_catford', 640, 200, (p) => {
    // the Catford Cat on its building, and police lights
    p.rect(250, 110, 150, 90, '#2a2238');
    p.ellipse(325, 96, 50, 22, '#1a1a1a');
    p.circle(368, 78, 16, '#1a1a1a');
    p.poly([[358, 66], [362, 52], [368, 64]], '#1a1a1a'); p.poly([[372, 64], [378, 52], [382, 66]], '#1a1a1a');
    p.line(276, 96, 248, 70, '#1a1a1a', 6);
    p.rect(362, 74, 4, 4, '#ffe14a'); p.rect(372, 74, 4, 4, '#ffe14a');
    p.text('CATFORD', 290, 130, '#ffe14a', 2);
    for (let i = 0; i < 6; i++) { p.rect(30 + i * 100, 170, 50, 30, '#1a1a24'); p.rect(40 + i * 100, 162, 12, 8, i % 2 ? '#e2283c' : '#2f6cff'); }
  });
  bg(scene, 'bg_pub', 320, 360, (p, ctx) => {
    grad(ctx, 320, 360, [[0, '#2a1410'], [1, '#4a2418']]);
    for (let x = 0; x < 320; x += 40) p.rect(x, 0, 6, 360, '#3a1c12');
    p.rect(0, 200, 320, 8, '#6b3a1a');
    // bar + optics
    p.rect(20, 120, 280, 6, '#6b3a1a');
    for (let x = 30; x < 290; x += 22) { p.rect(x, 90, 10, 30, ['#c8a03a', '#3a6a3a', '#a03a3a', '#ffffff'][x % 4]); p.rect(x + 3, 84, 4, 6, '#888888'); }
    p.circle(260, 60, 20, '#1a1a1a'); p.circle(260, 60, 16, '#c8102e'); p.circle(260, 60, 10, '#1a1a1a'); p.circle(260, 60, 6, '#2fae4a'); p.circle(260, 60, 2, '#e2283c');
    p.rect(30, 30, 140, 36, '#120808'); p.text('DA NU WAREHOUSE', 38, 42, '#ff3ad0', 2);
    p.rect(30, 70, 140, 2, '#ff3ad0');
  });
  bg(scene, 'bg_pub_mid', 640, 120, (p) => {
    const s = ['PURE BANTA BANG', 'KARAOKE THURSDAY', 'RIK COMES ROUND THURSDAY', 'NO DANCING (DO DANCE)'];
    s.forEach((t, i) => { const x = 10 + i * 160; const k = t.length * 8 > 140 ? 1 : 2; p.rect(x, 30, 150, 20, '#120808'); p.text(t, x + 75 - t.length * 2 * k, k === 2 ? 36 : 38, ['#ffe14a', '#3ad0ff', '#ff8a1a', '#6fe07a'][i], k); });
  });
  bg(scene, 'bg_toilets', 640, 360, (p, ctx) => {
    grad(ctx, 640, 360, [[0, '#2a3a2a'], [1, '#4a5a3a']]);
    for (let y = 0; y < 360; y += 16) for (let x = (y / 16) % 2 ? 0 : 8; x < 640; x += 16) p.rect(x, y, 15, 15, '#3a4a32');
    for (let i = 0; i < 5; i++) { const x = 40 + i * 120; p.rect(x, 140, 70, 180, '#6a5a3a'); p.rect(x + 4, 144, 62, 176, '#8a7a4a'); p.rect(x + 56, 230, 6, 6, '#c8a03a'); p.text(i === 2 ? 'RIK' : 'WC', x + 26, 160, '#2a1a0a', 2); }
    // Rik's hot tub, in a pub toilet, for some reason
    p.ellipse(320, 330, 120, 26, '#c8c8d0'); p.ellipse(320, 326, 110, 20, '#5ab8ff'); p.text("RIK'S HOT TUB", 268, 302, '#ffffff', 2);
    p.rect(250, 40, 140, 30, '#120808'); p.text('DA NU WAREHOUSE', 258, 50, '#ff3ad0', 2);
  });
  bg(scene, 'bg_heaven', 320, 360, (p, ctx) => {
    grad(ctx, 320, 360, [[0, '#ffe9a8'], [0.5, '#fff6dc'], [1, '#ffffff']]);
    for (let i = 0; i < 8; i++) p.ellipse(20 + i * 42, 300 + (i % 2) * 20, 40, 18, '#ffffff');
    for (let x = 0; x < 320; x += 40) { p.rect(x + 14, 140, 10, 160, '#f8f0d8'); p.rect(x + 10, 136, 18, 6, '#e8dcb8'); }
    p.rect(110, 40, 100, 26, '#e8c860'); p.text('PEARLY GATES', 116, 49, '#7a5a1a');
  });
  bg(scene, 'bg_velvet', 640, 360, (p, ctx) => {
    grad(ctx, 640, 360, [[0, '#1a0208'], [1, '#3a0810']]);
    // curtains
    for (let x = 0; x < 640; x += 24) { p.rect(x, 0, 14, 360, '#6a0a1c'); p.rect(x + 2, 0, 4, 360, '#8a1428'); }
    p.rect(0, 0, 640, 40, '#4a0612');
    for (let x = 0; x < 640; x += 40) p.ellipse(x + 20, 40, 22, 14, '#6a0a1c');
    p.rect(0, 38, 640, 4, '#c8a03a');
    // giant hearts and a spotlight rig
    for (const [x, y] of [[90, 130], [550, 120]]) { p.circle(x - 10, y, 14, '#c8102e'); p.circle(x + 10, y, 14, '#c8102e'); p.poly([[x - 24, y + 4], [x + 24, y + 4], [x, y + 34]], '#c8102e'); }
    p.rect(0, 60, 640, 4, '#2a2a2a');
    for (let x = 60; x < 640; x += 130) { p.rect(x, 64, 14, 12, '#3a3a3a'); p.rect(x + 3, 76, 8, 4, '#fff6c8'); }
  });
  bg(scene, 'bg_genie', 640, 360, (p, ctx) => {
    grad(ctx, 640, 360, [[0, '#2a0a4a'], [1, '#7a2a9a']]);
    const r = rng(77);
    for (let i = 0; i < 90; i++) p.px(Math.floor(r() * 640), Math.floor(r() * 360), '#ffe9ff');
  });

  // ---------------- chapter enemies ----------------
  buildSheet(scene, 'enemy_form', 26, 22, [0, 1].map((f) => ({
    name: `f_${f}`,
    draw: (p: Pix) => {
      const k = f ? 2 : 0;
      p.poly([[3, 3 + k], [22, 1], [23, 19 - k], [4, 20]], '#f8f8ff');
      for (let y = 7; y < 18; y += 3) p.rect(7, y, 13, 1, '#a8b0d8');
      p.rect(8, 4, 3, 3, '#1a1a1a'); p.rect(15, 4, 3, 3, '#1a1a1a'); p.px(9, 4, '#ff3a3a'); p.px(16, 4, '#ff3a3a');
      p.text('UC', 9, 14, '#c8102e');
    },
  })));
  buildImage(scene, 'p_stamp', 12, 12, (p) => { p.rect(4, 1, 4, 5, '#6b3a1a'); p.rect(1, 6, 10, 4, '#c8102e'); p.rect(2, 10, 8, 1, '#7a0a14'); });
  buildImage(scene, 'p_clip', 8, 6, (p) => { p.rect(0, 1, 8, 1, '#c8d0e0'); p.rect(0, 4, 7, 1, '#c8d0e0'); p.rect(7, 1, 1, 4, '#c8d0e0'); p.rect(0, 1, 1, 3, '#c8d0e0'); });
  buildSheet(scene, 'enemy_copcar', 64, 32, [0, 1].map((f) => ({
    name: `c_${f}`,
    draw: (p: Pix) => {
      p.poly([[3, 18], [14, 8], [44, 8], [56, 18], [62, 20], [62, 26], [2, 26]], '#f2f2f2');
      p.rect(2, 18, 60, 4, '#2f6cff'); p.rect(2, 22, 60, 2, '#ffe14a');
      p.rect(16, 10, 12, 8, '#9fd8ff'); p.rect(30, 10, 12, 8, '#9fd8ff');
      p.rect(24, 4, 6, 4, f ? '#e2283c' : '#2f6cff'); p.rect(30, 4, 6, 4, f ? '#2f6cff' : '#e2283c');
      p.text('POLICE', 18, 19, '#ffffff');
      p.circle(14, 27, 5, '#111'); p.circle(50, 27, 5, '#111'); p.circle(14, 27, 2, '#888'); p.circle(50, 27, 2, '#888');
      p.rect(58, 19, 4, 3, '#ffe14a');
    },
  })));
  buildSheet(scene, 'enemy_drone', 28, 18, [0, 1].map((f) => ({
    name: `d_${f}`,
    draw: (p: Pix) => {
      p.rect(f ? 1 : 3, 2, 8, 1, '#cccccc'); p.rect(f ? 19 : 17, 2, 8, 1, '#cccccc');
      p.rect(4, 3, 2, 3, '#555'); p.rect(22, 3, 2, 3, '#555');
      p.ellipse(14, 9, 9, 5, '#2a2a40'); p.rect(6, 8, 16, 2, '#2f6cff');
      p.circle(14, 12, 3, '#111'); p.px(14, 12, f ? '#e2283c' : '#2f6cff');
    },
  })));
  buildImage(scene, 'enemy_speaker', 30, 40, (p) => {
    p.rect(2, 2, 26, 36, '#1a1a1a'); p.circle(15, 26, 9, '#3a3a3a'); p.circle(15, 26, 4, '#111'); p.circle(15, 10, 5, '#3a3a3a');
    p.rect(9, 8, 3, 3, '#e2283c'); p.rect(18, 8, 3, 3, '#e2283c'); // possessed eyes
  });
  buildSheet(scene, 'enemy_pint', 22, 30, [0, 1].map((f) => ({
    name: `p_${f}`,
    draw: (p: Pix) => {
      const sq = f ? 2 : 0;
      p.rect(3, 6 + sq, 16, 20 - sq, '#c88a2a'); p.rect(3, 4 + sq, 16, 5, '#fff6e0'); p.rect(4, 8 + sq, 2, 16 - sq, '#ffd06a');
      p.rect(19, 10 + sq, 3, 8, '#e8e8e8');
      p.rect(7, 13 + sq, 3, 3, '#ffffff'); p.rect(13, 13 + sq, 3, 3, '#ffffff'); p.px(8, 14 + sq, '#000'); p.px(14, 14 + sq, '#000');
      p.rect(8, 19 + sq, 7, 2, '#3a1a0a');
      p.rect(5, 26, 3, 3, '#3a1a0a'); p.rect(14, 26, 3, 3, '#3a1a0a');
    },
  })));
  buildImage(scene, 'p_beer', 10, 8, (p) => { p.ellipse(5, 4, 4, 3, '#ffd06a'); p.px(3, 2, '#ffffff'); });
  buildSheet(scene, 'enemy_imp', 24, 22, [0, 1].map((f) => ({
    name: `i_${f}`,
    draw: (p: Pix) => {
      p.poly([[2, 8 + f * 3], [8, 10], [6, 14]], '#7a1a3a'); p.poly([[22, 8 + f * 3], [16, 10], [18, 14]], '#7a1a3a');
      p.ellipse(12, 12, 6, 7, '#c8a03a'); p.rect(9, 3, 6, 4, '#e8c060');
      p.rect(9, 10, 2, 2, '#e2283c'); p.rect(14, 10, 2, 2, '#e2283c'); p.rect(9, 15, 7, 1, '#3a0a0a');
    },
  })));
  buildSheet(scene, 'enemy_goatmask', 28, 36, [0, 1].map((f) => ({
    name: `g_${f}`,
    draw: (p: Pix) => {
      const sq = f ? 2 : 0;
      p.rect(7, 18 + sq, 14, 14 - sq, '#3a0a14'); p.rect(8, 32, 4, 3, '#111'); p.rect(16, 32, 4, 3, '#111');
      p.ellipse(14, 12 + sq, 8, 9, '#f2f0ea');
      p.line(8, 6 + sq, 3, 0 + sq, '#8a6a4a', 2); p.line(20, 6 + sq, 25, 0 + sq, '#8a6a4a', 2);
      p.rect(9, 10 + sq, 3, 3, '#e2283c'); p.rect(16, 10 + sq, 3, 3, '#e2283c');
      p.rect(10, 17 + sq, 8, 2, '#5a1520');
    },
  })));
  buildImage(scene, 'p_hoof', 10, 10, (p) => { p.ellipse(5, 6, 4, 3, '#3a2a2a'); p.rect(4, 3, 2, 6, '#1a1010'); });
}

export function registerChapterAnims(scene: Phaser.Scene) {
  const mk = (key: string, tex: string, frames: string[], rate: number) => {
    if (!scene.anims.exists(key)) scene.anims.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate: rate, repeat: -1 });
  };
  mk('form_fly', 'enemy_form', ['f_0', 'f_1'], 6);
  mk('copcar_roll', 'enemy_copcar', ['c_0', 'c_1'], 6);
  mk('drone_fly', 'enemy_drone', ['d_0', 'd_1'], 14);
  mk('imp_fly', 'enemy_imp', ['i_0', 'i_1'], 10);
}
