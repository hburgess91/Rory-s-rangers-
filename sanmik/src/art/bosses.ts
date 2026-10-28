import Phaser from 'phaser';
import { Pix, buildImage, buildSheet } from './pix';

// Bosses for chapters 1, 3, 4, 5 and the ending.

// "SanMik Should've Gone Viral" - things that went viral when SanMik didn't.
export const VIRAL = ['CHARLIE BIT ME', 'ICE BUCKET', 'NYAN CAT', 'HARAMBE', 'SALT BAE', 'GANGNAM STYLE', 'DOUBLE RAINBOW', 'SLENDER MAN', 'MUDKIP', 'DAT BOI', 'TAY ZONDAY', 'WAGON WHEEL', 'BEANIE BABIES', 'POKEMON GO'];

function heart(p: Pix, cx: number, cy: number, s: number, c: string) {
  p.circle(cx - s * 0.5, cy - s * 0.2, Math.round(s * 0.55), c);
  p.circle(cx + s * 0.5, cy - s * 0.2, Math.round(s * 0.55), c);
  p.poly([[cx - s * 1.05, cy], [cx + s * 1.05, cy], [cx, cy + s * 1.1]], c);
}

function phone(p: Pix, face: 'smug' | 'angry' | 'error') {
  p.rect(4, 2, 72, 116, '#1a1a22');
  p.rect(6, 4, 68, 112, '#2a2a36');
  p.rect(9, 14, 62, 90, face === 'error' ? '#2a0a0a' : '#0a1a3a');
  p.rect(32, 7, 16, 3, '#111111');
  p.circle(40, 110, 4, '#3a3a46');
  // the follower counter on screen
  p.rect(12, 18, 56, 10, '#ffffff');
  p.text(face === 'error' ? 'FOLLOWERS 3' : 'FOLLOWERS 3', 14, 21, '#c8102e');
  const eye = face === 'angry' ? '#ff3a3a' : face === 'error' ? '#ff3a3a' : '#7ff3ff';
  if (face === 'smug') {
    p.rect(20, 44, 14, 4, eye); p.rect(46, 44, 14, 4, eye);
    p.line(26, 76, 40, 82, eye, 3); p.line(40, 82, 56, 72, eye, 3);
  } else if (face === 'angry') {
    p.line(18, 38, 34, 46, eye, 3); p.line(62, 38, 46, 46, eye, 3);
    p.rect(22, 48, 10, 6, eye); p.rect(48, 48, 10, 6, eye);
    p.rect(26, 74, 28, 10, eye); p.rect(28, 76, 24, 6, '#0a1a3a');
  } else {
    p.text('X', 22, 46, eye, 3); p.text('X', 48, 46, eye, 3);
    p.text('ERROR', 22, 76, eye, 2);
  }
  p.rect(12, 92, 56, 8, '#3ad0ff'); p.text('ALGORITHM', 22, 94, '#0a1a3a');
}

function tankBody(p: Pix, f: number) {
  p.rect(10, 30, 140, 30, '#3a4a2a');
  p.rect(10, 30, 140, 4, '#5a6a3a');
  p.poly([[24, 30], [40, 10], [120, 10], [136, 30]], '#4a5a32');
  p.rect(40, 10, 80, 4, '#6a7a42');
  p.text('BANK', 64, 18, '#e8e0a0', 2);
  // treads
  p.rect(6, 52, 148, 14, '#1a1a1a');
  for (let x = 6 + (f % 2) * 4; x < 152; x += 8) p.rect(x, 53, 4, 12, '#3a3a3a');
  for (let i = 0; i < 7; i++) p.circle(18 + i * 21, 59, 5, '#5a5a5a');
  p.rect(144, 36, 8, 8, '#ffe14a'); // headlight
}

function tankTurret(p: Pix) {
  p.ellipse(28, 18, 26, 14, '#4a5a32');
  p.ellipse(24, 12, 16, 6, '#6a7a42');
  p.rect(0, 14, 34, 8, '#3a4a2a'); // barrel points LEFT (toward the player)
  p.rect(0, 13, 6, 10, '#2a3a1a');
  p.rect(30, 2, 10, 6, '#2a3a1a'); // hatch
}

interface RikPose { cheeks: number; mouth: 'grin' | 'open' | 'strain' | 'o'; back?: boolean; belly?: number }
function rik(p: Pix, pose: RikPose) {
  const skin = '#f2b8a0', shade = '#d0907a', vest = '#f0f0e8', shorts = '#3a5a9a';
  // legs + flip flops
  p.rect(36, 112, 14, 22, skin); p.rect(70, 112, 14, 22, skin);
  p.rect(32, 132, 20, 4, '#2a6a3a'); p.rect(68, 132, 20, 4, '#2a6a3a');
  p.rect(30, 98, 60, 20, shorts);
  if (pose.back) {
    // turned round: builder's crack
    p.ellipse(60, 70, 40 + (pose.belly ?? 0), 40, vest);
    p.rect(58, 96, 4, 10, '#7a4a3a');
    p.ellipse(60, 22, 20, 18, skin); p.ellipse(60, 10, 18, 8, '#c8b8a8');
    return;
  }
  // arms
  p.ellipse(16, 70, 10, 26, skin); p.ellipse(104, 70, 10, 26, skin);
  // huge vest belly
  p.ellipse(60, 72, 42 + (pose.belly ?? 0), 40 + (pose.belly ?? 0) * 0.6, vest);
  p.ellipse(68, 78, 28, 26, '#ffffff');
  p.ellipse(60, 96, 30, 6, '#e0d8c0');
  p.rect(48, 70, 6, 4, '#e8c860'); // gravy stain
  p.rect(70, 88, 5, 3, '#a05a3a');
  // head
  p.ellipse(60, 26, 22 + pose.cheeks, 22, skin);
  p.ellipse(60, 40, 18, 8, shade);
  p.ellipse(60, 10, 20, 7, '#c8b8a8'); // thinning grey hair
  p.rect(46, 20, 7, 4, '#ffffff'); p.rect(67, 20, 7, 4, '#ffffff'); p.rect(49, 21, 3, 3, '#3a2a2a'); p.rect(70, 21, 3, 3, '#3a2a2a');
  p.ellipse(60, 29, 4, 4, '#e88a8a'); // red nose
  p.ellipse(42 - pose.cheeks, 32, 4, 3, '#ff9a9a'); p.ellipse(78 + pose.cheeks, 32, 4, 3, '#ff9a9a');
  switch (pose.mouth) {
    case 'grin': p.rect(50, 36, 20, 4, '#5a1a1a'); p.rect(52, 36, 4, 2, '#e8e0a0'); p.rect(62, 36, 3, 2, '#e8e0a0'); break;
    case 'open': p.ellipse(60, 40, 10, 8, '#3a0a0a'); p.ellipse(60, 44, 6, 3, '#c84a4a'); break;
    case 'o': p.ellipse(60, 39, 5, 5, '#3a0a0a'); break;
    case 'strain': p.rect(48, 37, 24, 3, '#3a0a0a'); p.line(44, 16, 54, 19, '#3a2a2a', 2); p.line(76, 16, 66, 19, '#3a2a2a', 2); for (const x of [38, 82]) p.rect(x, 12, 2, 6, '#5ab8ff'); break;
  }
  p.rect(50, 4, 20, 3, '#c8b8a8');
}

function rikHead(p: Pix, open: number) {
  const skin = '#f2b8a0';
  p.ellipse(110, 96, 104, 84, skin);
  p.ellipse(110, 30, 90, 26, '#c8b8a8');
  p.ellipse(110, 140, 80, 26, '#d0907a');
  p.ellipse(110, 134, 74, 22, skin);
  p.rect(60, 58, 30, 16, '#ffffff'); p.rect(130, 58, 30, 16, '#ffffff');
  p.rect(70, 60, 12, 12, '#3a2a2a'); p.rect(140, 60, 12, 12, '#3a2a2a');
  p.line(52, 46, 92, 54, '#8a7a6a', 4); p.line(168, 46, 128, 54, '#8a7a6a', 4);
  p.ellipse(110, 92, 16, 14, '#e88a8a');
  p.ellipse(40, 106, 14, 9, '#ff9a9a'); p.ellipse(180, 106, 14, 9, '#ff9a9a');
  if (open) {
    p.ellipse(110, 128, 46, 18 + open * 10, '#2a0606');
    p.ellipse(110, 140 + open * 4, 30, 8, '#c84a4a');
    for (let x = 76; x < 146; x += 10) p.rect(x, 112 - open * 2, 7, 6, '#e8e0a0');
  } else {
    p.rect(70, 124, 80, 8, '#5a1a1a');
    p.rect(80, 124, 10, 4, '#e8e0a0'); p.rect(124, 124, 8, 4, '#e8e0a0');
  }
}

function gaborBig(p: Pix, f: 'grin' | 'gloat' | 'hurt') {
  const fur = '#f2f0ea', furLo = '#d0ccc0';
  // legs (stands upright, theatrically)
  p.rect(36, 96, 10, 22, furLo); p.rect(62, 96, 10, 22, furLo);
  p.rect(34, 114, 14, 6, '#2a1a1a'); p.rect(60, 114, 14, 6, '#2a1a1a');
  // body in a red velvet waistcoat
  p.ellipse(54, 78, 26, 30, fur);
  p.rect(36, 60, 36, 40, '#8a0a1c');
  p.rect(52, 60, 4, 40, '#c8a03a');
  for (let y = 66; y < 98; y += 8) p.rect(57, y, 3, 3, '#ffe08a');
  // arms
  p.ellipse(24, 76, 7, 20, fur); p.ellipse(84, 76, 7, 20, fur);
  // head
  p.ellipse(54, 36, 18, 20, fur);
  p.rect(48, 48, 14, 16, fur);
  p.ellipse(54, 58, 10, 6, furLo);
  // long horns
  p.line(42, 22, 22, 2, '#5a3a2a', 5); p.line(22, 2, 12, 10, '#5a3a2a', 4);
  p.line(66, 22, 86, 2, '#5a3a2a', 5); p.line(86, 2, 96, 10, '#5a3a2a', 4);
  p.ellipse(30, 30, 10, 4, fur); p.ellipse(78, 30, 10, 4, fur); // ears
  // eyes: too attentive
  const eye = f === 'gloat' ? '#ff3a3a' : '#ffd23a';
  p.rect(42, 30, 8, 7, eye); p.rect(58, 30, 8, 7, eye);
  p.rect(45, 31, 2, 5, '#000'); p.rect(61, 31, 2, 5, '#000');
  // the grin
  if (f === 'hurt') { p.ellipse(54, 52, 5, 5, '#3a0a0a'); }
  else {
    p.rect(40, 48, 28, 4, '#5a0a14');
    p.rect(42, 48, 24, 2, '#ffffff');
    p.px(39, 47, '#5a0a14'); p.px(68, 47, '#5a0a14');
  }
  p.rect(50, 62, 8, 10, furLo); // beard
  // bow tie
  p.poly([[54, 64], [44, 59], [44, 69]], '#c8102e'); p.poly([[54, 64], [64, 59], [64, 69]], '#c8102e');
}

function gaborHead(p: Pix, open: boolean) {
  const fur = '#f2f0ea';
  p.line(64, 46, 18, 4, '#5a3a2a', 12); p.line(18, 4, 4, 20, '#5a3a2a', 9);
  p.line(156, 46, 202, 4, '#5a3a2a', 12); p.line(202, 4, 216, 20, '#5a3a2a', 9);
  p.ellipse(110, 90, 78, 76, fur);
  p.ellipse(38, 70, 22, 9, fur); p.ellipse(182, 70, 22, 9, fur);
  p.ellipse(110, 140, 46, 26, '#d8d4c8');
  p.rect(70, 66, 26, 20, '#ff2a2a'); p.rect(124, 66, 26, 20, '#ff2a2a');
  p.rect(80, 68, 6, 16, '#000'); p.rect(134, 68, 6, 16, '#000');
  if (open) {
    p.ellipse(110, 136, 40, 26, '#1a0006');
    for (let x = 76; x < 146; x += 9) { p.poly([[x, 114], [x + 8, 114], [x + 4, 124]], '#ffffff'); p.poly([[x, 158], [x + 8, 158], [x + 4, 148]], '#ffffff'); }
  } else {
    p.rect(66, 130, 88, 8, '#5a0a14'); p.rect(70, 130, 80, 4, '#ffffff');
  }
  p.rect(98, 160, 24, 14, '#d0ccc0');
}

function seal(p: Pix, kind: 'goat' | 'max' | 'pepsi') {
  const ring = kind === 'goat' ? '#f2f0ea' : kind === 'max' ? '#141414' : '#1f4fa8';
  p.circle(22, 22, 20, '#c8a03a'); p.circle(22, 22, 17, ring); p.circle(22, 22, 13, '#2a0610');
  const lab = kind === 'goat' ? 'GOAT' : kind === 'max' ? 'MAX' : 'PEPSI';
  p.text(lab, 22 - lab.length * 2, 20, '#ffe08a');
  if (kind === 'goat') { p.line(14, 12, 10, 6, '#8a6a4a', 2); p.line(30, 12, 34, 6, '#8a6a4a', 2); }
  else { p.rect(19, 8, 6, 8, kind === 'max' ? '#2f6cb4' : '#e2283c'); }
}

function genie(p: Pix, mouth: 'talk' | 'shut') {
  // canonical rude genie: blue, bald, gold earring, smoke tail
  for (let i = 0; i < 8; i++) p.circle(40 + Math.sin(i) * 6, 100 - i * 6, 10 - i, '#7a9aff');
  p.ellipse(40, 48, 22, 18, '#5a7aff');
  p.ellipse(16, 46, 8, 14, '#5a7aff'); p.ellipse(64, 46, 8, 14, '#5a7aff');
  p.rect(26, 40, 28, 4, '#c8a03a');
  p.ellipse(40, 20, 15, 16, '#6a8aff');
  p.rect(30, 6, 20, 4, '#4a6ae0');
  p.rect(32, 16, 5, 4, '#ffffff'); p.rect(44, 16, 5, 4, '#ffffff'); p.px(34, 17, '#000'); p.px(46, 17, '#000');
  p.line(30, 13, 37, 15, '#2a3a8a', 2); p.line(51, 13, 44, 15, '#2a3a8a', 2);
  if (mouth === 'talk') p.ellipse(40, 28, 6, 4, '#2a0a2a'); else p.rect(34, 27, 12, 2, '#2a0a2a');
  p.rect(36, 32, 8, 6, '#3a3a8a'); // beard
  p.circle(23, 22, 3, '#ffe14a');
}

export function buildBossArt(scene: Phaser.Scene) {
  buildSheet(scene, 'boss_phone', 80, 120, (['smug', 'angry', 'error'] as const).map((f) => ({ name: f, draw: (p: Pix) => phone(p, f) })));
  VIRAL.forEach((t, i) => {
    const w = t.length * 4 + 8;
    buildImage(scene, `e_viral${i}`, w, 12, (p) => { p.rect(1, 1, w - 2, 9, '#ffffff'); p.poly([[4, 9], [8, 9], [4, 12]], '#ffffff'); p.text(t, 4, 3, '#c8102e'); });
  });
  buildImage(scene, 'e_like', 14, 14, (p) => { p.circle(7, 7, 6, '#2f6cff'); p.rect(4, 6, 3, 5, '#ffffff'); p.rect(7, 4, 3, 7, '#ffffff'); });
  buildImage(scene, 'e_dislike', 14, 14, (p) => { p.circle(7, 7, 6, '#c8102e'); p.rect(4, 3, 3, 5, '#ffffff'); p.rect(7, 3, 3, 7, '#ffffff'); });

  buildSheet(scene, 'boss_tank', 160, 70, [0, 1].map((f) => ({ name: `t_${f}`, draw: (p: Pix) => tankBody(p, f) })));
  buildImage(scene, 'boss_turret', 56, 32, tankTurret);
  buildImage(scene, 'e_rocket', 18, 8, (p) => { p.rect(2, 2, 12, 4, '#cccccc'); p.poly([[14, 1], [17, 4], [14, 7]], '#e2283c'); p.rect(0, 1, 3, 6, '#888'); });
  buildImage(scene, 'e_bigshell', 12, 12, (p) => { p.circle(6, 6, 5, '#3a3a3a'); p.circle(5, 5, 2, '#8a8a8a'); });
  buildImage(scene, 'fx_reticle', 30, 12, (p) => { p.ellipse(15, 6, 14, 5, '#ff2a2a'); p.ellipse(15, 6, 10, 3, '#00000000'); p.rect(14, 1, 2, 10, '#ff2a2a'); }, false);

  buildSheet(scene, 'boss_rik', 120, 138, [
    { name: 'idle', draw: (p) => rik(p, { cheeks: 0, mouth: 'grin' }) },
    { name: 'inhale', draw: (p) => rik(p, { cheeks: 4, mouth: 'o', belly: 4 }) },
    { name: 'burp', draw: (p) => rik(p, { cheeks: 2, mouth: 'open' }) },
    { name: 'strain', draw: (p) => rik(p, { cheeks: 3, mouth: 'strain', belly: 2 }) },
    { name: 'back', draw: (p) => rik(p, { cheeks: 0, mouth: 'grin', back: true }) },
  ]);
  buildSheet(scene, 'boss_rikhead', 220, 180, [0, 1, 2].map((o) => ({ name: `h_${o}`, draw: (p: Pix) => rikHead(p, o) })));
  buildImage(scene, 'riklet', 26, 30, (p) => {
    p.ellipse(13, 12, 10, 10, '#f2b8a0'); p.ellipse(13, 5, 9, 3, '#c8b8a8');
    p.rect(8, 9, 3, 3, '#3a2a2a'); p.rect(15, 9, 3, 3, '#3a2a2a'); p.ellipse(13, 14, 2, 2, '#e88a8a'); p.rect(9, 17, 8, 2, '#5a1a1a');
    p.ellipse(13, 24, 8, 6, '#f0f0e8'); p.rect(9, 27, 3, 3, '#3a5a9a'); p.rect(15, 27, 3, 3, '#3a5a9a');
  });
  buildImage(scene, 'e_toiletroll', 14, 14, (p) => { p.circle(7, 7, 6, '#f8f8f8'); p.circle(7, 7, 2, '#b8a080'); p.rect(7, 1, 6, 2, '#f8f8f8'); });
  buildImage(scene, 'e_pint', 12, 16, (p) => { p.rect(2, 4, 8, 11, '#c88a2a'); p.rect(2, 2, 8, 4, '#fff6e0'); p.rect(3, 5, 1, 9, '#ffd06a'); });

  buildSheet(scene, 'boss_gabor', 108, 122, (['grin', 'gloat', 'hurt'] as const).map((f) => ({ name: f, draw: (p: Pix) => gaborBig(p, f) })));
  buildSheet(scene, 'boss_gaborhead', 220, 180, [false, true].map((o) => ({ name: o ? 'open' : 'shut', draw: (p: Pix) => gaborHead(p, o) })));
  for (const k of ['goat', 'max', 'pepsi'] as const) buildImage(scene, `seal_${k}`, 44, 44, (p) => seal(p, k));
  buildImage(scene, 'e_bottle', 10, 18, (p) => { p.rect(3, 0, 4, 4, '#cccccc'); p.rect(2, 4, 6, 13, '#1f4fa8'); p.rect(2, 8, 6, 3, '#e2283c'); p.px(3, 6, '#9fd8ff'); });
  buildImage(scene, 'e_maxbottle', 10, 18, (p) => { p.rect(3, 0, 4, 4, '#cccccc'); p.rect(2, 4, 6, 13, '#141414'); p.rect(2, 8, 6, 3, '#2f6cb4'); p.px(3, 6, '#9fd8ff'); });
  buildImage(scene, 'e_heartteeth', 18, 16, (p) => { heart(p, 9, 6, 7, '#c8102e'); p.rect(4, 8, 10, 2, '#ffffff'); p.px(5, 10, '#ffffff'); p.px(9, 10, '#ffffff'); p.px(12, 10, '#ffffff'); });
  buildImage(scene, 'chain', 8, 16, (p) => { p.rect(2, 0, 4, 7, '#9a9aa8'); p.rect(3, 1, 2, 5, '#3a3a40'); p.rect(2, 8, 4, 7, '#7a7a88'); p.rect(3, 9, 2, 5, '#3a3a40'); }, false);
  buildImage(scene, 'stage_weight', 44, 34, (p) => { p.poly([[6, 33], [38, 33], [32, 6], [12, 6]], '#3a3a40'); p.rect(18, 1, 8, 6, '#3a3a40'); p.text('16T', 16, 18, '#ffe08a'); });
  buildSheet(scene, 'genie', 80, 112, [{ name: 'talk', draw: (p) => genie(p, 'talk') }, { name: 'shut', draw: (p) => genie(p, 'shut') }]);
  buildImage(scene, 'pk_beans', 14, 18, (p) => { p.rect(1, 2, 12, 15, '#2a7ad0'); p.rect(1, 2, 12, 2, '#c9d3dc'); p.rect(1, 15, 12, 2, '#c9d3dc'); p.rect(3, 6, 8, 6, '#ff8a1a'); p.text('BN', 3, 7, '#ffffff'); });
  buildImage(scene, 'intro_wings', 40, 24, (p) => {
    p.ellipse(10, 12, 9, 10, '#ffffff'); p.ellipse(30, 12, 9, 10, '#ffffff');
    for (let i = 0; i < 4; i++) { p.rect(3 + i * 2, 16 + i, 6, 1, '#d8e0ff'); p.rect(31 - i * 2, 16 + i, 6, 1, '#d8e0ff'); }
  });
  buildImage(scene, 'intro_corvette', 76, 30, (p) => {
    p.poly([[4, 16], [20, 8], [46, 8], [60, 16], [74, 18], [74, 24], [2, 24], [2, 18]], '#ff5ab8');
    p.rect(22, 10, 10, 6, '#9fd8ff'); p.rect(34, 10, 10, 6, '#9fd8ff');
    p.rect(2, 18, 72, 2, '#ffaad8');
    p.circle(16, 25, 5, '#111'); p.circle(60, 25, 5, '#111');
    p.rect(70, 17, 4, 3, '#ffe14a');
  });
}
