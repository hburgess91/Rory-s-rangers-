import Phaser from 'phaser';
import { Pix, buildSheet, buildImage, FrameDef } from './pix';

// General enemy roster used across every chapter, plus chapter extras.

interface HenPal { hair: string; hairHi: string; bikini: string; bikiniHi: string; heel: string; skin: string; skinShade: string }
const HEN: HenPal[] = [
  { hair: '#f2d36b', hairHi: '#fff1a8', bikini: '#ff3ad0', bikiniHi: '#ff9ae6', heel: '#e2283c', skin: '#f0a070', skinShade: '#c97a4c' },
  { hair: '#5a3218', hairHi: '#8a5a30', bikini: '#2fd0c0', bikiniHi: '#a0fff0', heel: '#111111', skin: '#f3b68a', skinShade: '#cc8a60' },
  { hair: '#c8401c', hairHi: '#ff7a3a', bikini: '#ffe14a', bikiniHi: '#fff6a8', heel: '#ff3ad0', skin: '#ee9a68', skinShade: '#c27448' },
];

// Hen-do woman: big hair, orange fake tan, bikini, "HEN DO" sash, stilettos. 30x50, feet y=49.
function drawHen(p: Pix, pal: HenPal, pose: { step: number; arm: 'down' | 'up' | 'fwd'; mouth: 'grin' | 'shout' }) {
  const s = pose.step;
  // hair behind
  p.ellipse(15, 12, 9, 10, pal.hair);
  p.rect(6, 12, 5, 16, pal.hair);
  // back arm
  p.line(11, 19, 9 - s, 31, pal.skinShade, 3);
  // legs + stilettos
  p.line(13, 33, 12 + s * 2, 45, pal.skinShade, 3);
  p.line(17, 33, 18 - s * 2, 45, pal.skin, 3);
  for (const fx of [12 + s * 2, 18 - s * 2]) {
    p.rect(fx - 1, 45, 5, 2, pal.heel);
    p.rect(fx - 1, 47, 1, 3, pal.heel); // the heel spike
  }
  // torso
  p.rect(11, 18, 9, 16, pal.skin);
  p.rect(18, 19, 2, 14, pal.skinShade);
  p.rect(11, 20, 9, 4, pal.bikini);
  p.px(13, 21, pal.bikiniHi); p.px(17, 21, pal.bikiniHi);
  p.rect(11, 31, 9, 4, pal.bikini);
  // sash
  p.line(10, 18, 20, 32, '#ffffff', 3);
  p.text('HEN', 12, 24, '#ff3ad0');
  // head
  p.rect(14, 15, 3, 4, pal.skinShade);
  p.ellipse(16, 10, 5, 6, pal.skin);
  p.rect(18, 8, 2, 2, '#1a1a1a'); // eye + lash
  p.px(20, 7, '#1a1a1a');
  p.rect(14, 4, 9, 3, pal.hair);
  p.px(15, 3, pal.hairHi); p.px(19, 3, pal.hairHi);
  if (pose.mouth === 'grin') { p.rect(17, 13, 4, 2, '#d2183c'); p.px(18, 13, '#ffffff'); }
  else { p.rect(17, 12, 4, 4, '#7a0a1e'); p.rect(17, 12, 4, 1, '#d2183c'); }
  // front arm
  if (pose.arm === 'down') p.line(19, 19, 21, 31, pal.skin, 3);
  else if (pose.arm === 'up') { p.line(19, 19, 17, 8, pal.skin, 3); p.rect(15, 4, 4, 4, '#e2283c'); }
  else { p.line(19, 19, 28, 17, pal.skin, 3); }
  p.px(18, 6, '#ff9ae6'); // earring
}

// Wheelie Warrior: flame-painted racing chair, helmet, mad eyes. 44x40, wheels on y=39.
function drawWheelie(p: Pix, f: number, rev: boolean, shirt: string) {
  const lean = rev ? -2 : 0;
  // big rear wheel
  p.circle(14, 29, 10, '#2a2a30');
  p.circle(14, 29, 8, '#5a5a66');
  p.circle(14, 29, 2, '#cccccc');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + f * 0.8;
    p.line(14, 29, 14 + Math.cos(a) * 8, 29 + Math.sin(a) * 8, '#9a9aa8', 1);
  }
  // frame + flames
  p.rect(12, 26, 24, 4, '#e2283c');
  p.poly([[16, 26], [22, 20], [24, 26]], '#ff8a1a');
  p.poly([[22, 26], [27, 22], [29, 26]], '#ffe14a');
  p.text('BRAP', 14, 31, '#ffffff');
  p.rect(34, 30, 2, 5, '#888888');
  p.circle(36, 36, 3, '#2a2a30');
  // rider body + legs out front
  p.rect(12 + lean, 14, 9, 13, shirt);
  p.line(20, 24, 33, 26, '#2a3a5a', 4);
  p.rect(31, 27, 5, 3, '#ffffff');
  // pumping arms on the push rims
  const ax = rev ? 10 : 12 + (f % 2) * 4;
  p.line(18 + lean, 16, ax, 25, '#f2c8a8', 3);
  // head + helmet
  p.ellipse(18 + lean, 9, 6, 6, '#f2c8a8');
  p.ellipse(17 + lean, 6, 7, 5, '#ffd23a');
  p.rect(10 + lean, 6, 15, 2, '#e2283c');
  p.rect(19 + lean, 7, 5, 3, '#9fe2ff'); // visor
  p.rect(20 + lean, 10, 3, 2, '#ffffff'); p.px(21 + lean, 10, '#000000');
  p.rect(18 + lean, 13, 6, 2, '#ffffff'); p.line(18 + lean, 14, 24 + lean, 14, '#7a0a1e', 1); // gritted teeth
  if (rev) { p.circle(4, 34, 3, '#cccccc'); p.circle(1, 30, 2, '#dddddd'); }
}

export function buildRosterArt(scene: Phaser.Scene) {
  HEN.forEach((pal, v) => {
    const frames: FrameDef[] = [
      { name: 'walk_0', draw: (p) => drawHen(p, pal, { step: 1, arm: 'down', mouth: 'grin' }) },
      { name: 'walk_1', draw: (p) => drawHen(p, pal, { step: -1, arm: 'down', mouth: 'grin' }) },
      { name: 'throw_0', draw: (p) => drawHen(p, pal, { step: 0, arm: 'up', mouth: 'shout' }) },
      { name: 'throw_1', draw: (p) => drawHen(p, pal, { step: 0, arm: 'fwd', mouth: 'shout' }) },
    ];
    buildSheet(scene, `enemy_hen${v}`, 30, 50, frames);
  });
  const shirts = ['#3a6ad0', '#2fae4a', '#7a3fd0'];
  shirts.forEach((sh, v) => {
    buildSheet(scene, `enemy_wheelie${v}`, 44, 40, [
      { name: 'roll_0', draw: (p) => drawWheelie(p, 0, false, sh) },
      { name: 'roll_1', draw: (p) => drawWheelie(p, 1, false, sh) },
      { name: 'rev_0', draw: (p) => drawWheelie(p, 2, true, sh) },
    ]);
  });
  buildImage(scene, 'p_heel', 14, 12, (p) => {
    p.poly([[1, 9], [9, 3], [13, 3], [13, 6], [5, 10]], '#e2283c');
    p.rect(11, 6, 2, 5, '#e2283c');
    p.px(9, 4, '#ff8a9a');
  });
  buildImage(scene, 'p_lipstick', 12, 6, (p) => {
    p.rect(1, 1, 6, 4, '#d8b04a'); p.rect(7, 1, 3, 4, '#e2283c'); p.rect(10, 2, 1, 2, '#e2283c'); p.px(2, 2, '#fff3b0');
  });
}

export function registerRosterAnims(scene: Phaser.Scene) {
  for (let v = 0; v < 3; v++) {
    if (!scene.anims.exists(`hen${v}_walk`)) scene.anims.create({ key: `hen${v}_walk`, frames: [{ key: `enemy_hen${v}`, frame: 'walk_0' }, { key: `enemy_hen${v}`, frame: 'walk_1' }], frameRate: 5, repeat: -1 });
    if (!scene.anims.exists(`wheelie${v}_roll`)) scene.anims.create({ key: `wheelie${v}_roll`, frames: [{ key: `enemy_wheelie${v}`, frame: 'roll_0' }, { key: `enemy_wheelie${v}`, frame: 'roll_1' }], frameRate: 8, repeat: -1 });
  }
}
