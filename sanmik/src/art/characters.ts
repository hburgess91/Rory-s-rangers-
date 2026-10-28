import Phaser from 'phaser';
import { Pix, buildSheet, FrameDef, rng } from './pix';

// ---------------------------------------------------------------------------
// SANMIK. Frame 48x72, facing right, feet on y=71. Front arm is a separate
// sprite (arm_<costume>) pivoting at the shoulder so aim works in any pose.
// ---------------------------------------------------------------------------

export const SANMIK_FRAME = { w: 48, h: 72 };
export const SANCHZ_FRAME = { w: 56, h: 64 };

interface MikPalette {
  hair: string; hairHi: string; hairLo: string; skin: string; skinShade: string; blush: string;
  top: string; topHi: string; topLo: string; shirt: string; trousers: string; trousersLo: string; shoe: string;
  glassFrame: string; lens: string; glint: string; beard: string; necklace?: string; necklaceHi?: string;
}

const MIK_PAL: Record<string, MikPalette> = {
  classic: {
    hair: '#16110f', hairHi: '#2e2520', hairLo: '#070505', skin: '#efc6a0', skinShade: '#cf9c76', blush: '#e8a088',
    top: '#2c3f93', topHi: '#4a63c4', topLo: '#1b275f', shirt: '#ece4ec', trousers: '#232a4a', trousersLo: '#151a30', shoe: '#0d0d10',
    glassFrame: '#ffffff', lens: '#1b1b29', glint: '#8f93c4', beard: '#3d2416',
  },
  alt: {
    hair: '#16110f', hairHi: '#2e2520', hairLo: '#070505', skin: '#efc6a0', skinShade: '#cf9c76', blush: '#e8a088',
    top: '#f2f2f0', topHi: '#ffffff', topLo: '#c9c9cf', shirt: '#f2f2f0', trousers: '#2b2b33', trousersLo: '#1a1a20', shoe: '#0d0d10',
    glassFrame: '#3b2318', lens: '#5a2a1c', glint: '#b0705a', beard: '#3d2416', necklace: '#6fb7a8', necklaceHi: '#b7e0d6',
  },
};

export interface MikPose {
  bob?: number;
  legA?: [number, number]; // [dx, lift]
  legB?: [number, number];
  mouth?: 'grin' | 'open' | 'o';
  crooked?: boolean;
  crouch?: boolean;
  backArm?: number; // degrees, 90 = straight down
  afroStretch?: number; // + taller, - wider
  tilt?: number; // degrees, rotate whole figure about the feet
}

function drawAfro(p: Pix, cx: number, cy: number, pal: MikPalette, stretch = 0) {
  const rx = 18 - Math.round(stretch * 0.5);
  const ry = 14 + stretch;
  p.ellipse(cx, cy, rx, ry, pal.hair);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.circle(Math.round(cx + Math.cos(a) * rx * 0.92), Math.round(cy + Math.sin(a) * ry * 0.92), 3, pal.hair);
  }
  const r = rng(77);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = Math.round(cx + Math.cos(a) * rx * d), y = Math.round(cy + Math.sin(a) * ry * d);
    p.px(x, y, r() < 0.55 ? pal.hairHi : pal.hairLo);
  }
}

export function drawSanMik(p: Pix, pose: MikPose, costume: 'classic' | 'alt') {
  const pal = MIK_PAL[costume];
  const ctx = p.ctx;
  if (pose.tilt) {
    ctx.save();
    const fx = p.ox + 24, fy = p.oy + 71;
    ctx.translate(fx, fy);
    ctx.rotate((pose.tilt * Math.PI) / 180);
    ctx.translate(-fx, -fy);
  }
  const by = (pose.bob ?? 0) + (pose.crouch ? 10 : 0);
  const legA = pose.legA ?? [0, 0];
  const legB = pose.legB ?? [0, 0];

  // back arm (behind body)
  const ba = ((pose.backArm ?? 95) * Math.PI) / 180;
  const sx = 18, sy = 39 + by;
  const hx = sx + Math.cos(ba) * 11, hy = sy + Math.sin(ba) * 11;
  p.line(sx, sy, hx, hy, costume === 'alt' ? pal.skinShade : pal.topLo, 4);
  p.rect(Math.round(hx) - 1, Math.round(hy) - 1, 3, 3, pal.skinShade);

  drawAfro(p, 23, 18 + by, pal, pose.afroStretch ?? 0);

  // legs
  const hipY = 57 + by;
  const drawLeg = (hipX: number, leg: [number, number], back: boolean) => {
    const col = back ? pal.trousersLo : pal.trousers;
    const footX = hipX + leg[0];
    const footY = 70 - leg[1];
    if (pose.crouch) {
      p.line(hipX + 2, hipY, hipX + 8, hipY + 2, col, 5);
      p.line(hipX + 8, hipY + 2, footX + 3, footY - 1, col, 5);
    } else {
      p.line(hipX + 2, hipY, footX + 2, footY - 2, col, 5);
    }
    p.rect(footX - 1, footY - 2, 9, 3, pal.shoe);
    p.rect(footX + 4, footY - 2, 2, 1, '#3a3a44');
  };
  drawLeg(20, legB, true);
  drawLeg(26, legA, false);

  // torso
  p.rect(15, 37 + by, 19, 21, pal.top);
  p.rect(15, 37 + by, 3, 21, pal.topLo);
  p.rect(31, 38 + by, 2, 19, pal.topHi);
  if (costume === 'classic') {
    p.poly([[20, 37 + by], [29, 37 + by], [24.5, 46 + by]], pal.shirt);
    p.line(20, 37 + by, 24, 47 + by, pal.topLo, 1);
    p.line(29, 37 + by, 25, 47 + by, pal.topLo, 1);
    p.px(20, 37 + by, pal.shirt); p.px(28, 37 + by, pal.shirt);
    for (const [bx, byy] of [[21, 49], [27, 49], [21, 54], [27, 54]]) {
      p.rect(bx, byy + by, 2, 2, '#0b0b14');
      p.px(bx, byy + by, '#5b6aa8');
    }
    p.rect(15, 57 + by, 19, 1, pal.topLo);
  } else {
    // white tee with a scrawled print and a chunky bead necklace
    p.rect(19, 46 + by, 10, 6, '#1f2c66');
    p.text('Y', 22, 46 + by, '#ffffff');
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (i / 8);
      p.rect(Math.round(24 + Math.cos(a) * 6) - 1, Math.round(37 + by + Math.sin(a) * 6), 3, 3, pal.necklace!);
      p.px(Math.round(24 + Math.cos(a) * 6), Math.round(37 + by + Math.sin(a) * 6), pal.necklaceHi!);
    }
  }

  // neck + head
  p.rect(22, 33 + by, 6, 5, pal.skinShade);
  p.rect(17, 26 + by, 3, 5, pal.skinShade);
  p.ellipse(25, 27 + by, 7, 8, pal.skin);
  p.rect(20, 32 + by, 11, 2, pal.skinShade);
  p.px(19, 29 + by, pal.blush); p.px(31, 29 + by, pal.blush);
  // afro fringe over the forehead
  p.ellipse(25, 17 + by, 11, 5, pal.hair);
  for (let i = 0; i < 6; i++) p.circle(16 + i * 4, 20 + by, 2, pal.hair);
  p.px(18, 15 + by, pal.hairHi); p.px(24, 14 + by, pal.hairHi); p.px(30, 16 + by, pal.hairHi);

  // oversized sunglasses
  const gy = 22 + by;
  const c2 = pose.crooked ? 2 : 0;
  p.rect(17, gy, 9, 6, pal.glassFrame);
  p.rect(26, gy + c2, 9, 6, pal.glassFrame);
  p.rect(25, gy + 1 + Math.floor(c2 / 2), 2, 1, pal.glassFrame);
  p.rect(18, gy + 1, 7, 4, pal.lens);
  p.rect(27, gy + 1 + c2, 7, 4, pal.lens);
  p.px(19, gy + 1, pal.glint); p.px(20, gy + 2, pal.glint);
  p.px(28, gy + 1 + c2, pal.glint); p.px(29, gy + 2 + c2, pal.glint);

  // mouth + crude marker beard
  const my = 30 + by;
  const mouth = pose.mouth ?? 'grin';
  if (mouth === 'grin') {
    p.rect(21, my, 10, 3, '#5a1818');
    p.rect(22, my, 8, 1, '#ffffff');
    p.rect(23, my + 2, 6, 1, '#c45858');
  } else if (mouth === 'open') {
    p.rect(21, my - 1, 10, 6, '#3c0a0e');
    p.rect(22, my - 1, 8, 1, '#ffffff');
    p.rect(23, my + 3, 6, 1, '#d24a5a');
  } else {
    p.rect(24, my, 4, 4, '#3c0a0e');
  }
  const b = pal.beard;
  p.rect(20, my - 2, 12, 1, b);
  p.rect(20, my - 2, 1, 6, b);
  p.rect(31, my - 2, 1, 6, b);
  p.rect(21, my + 5, 10, 1, b);
  p.rect(25, my + 6, 2, 2, b);
  p.px(23, my + 6, b); p.px(28, my + 6, b);

  if (pose.tilt) ctx.restore();
}

// Arm overlay: 40x16, shoulder pivot at (4,8), pointing right.
export function drawMikArm(p: Pix, item: string, costume: 'classic' | 'alt', frame = 0) {
  const pal = MIK_PAL[costume];
  if (costume === 'classic') {
    p.rect(2, 6, 12, 5, pal.top);
    p.rect(2, 9, 12, 2, pal.topLo);
    p.rect(12, 6, 2, 5, pal.topLo);
  } else {
    p.rect(2, 6, 5, 5, pal.top);
    p.rect(7, 6, 7, 4, pal.skin);
    p.rect(7, 9, 7, 1, pal.skinShade);
  }
  p.rect(14, 6, 4, 4, pal.skin);
  p.rect(14, 9, 4, 1, pal.skinShade);
  switch (item) {
    case 'mik':
      p.rect(17, 7, 8, 2, '#18181c');
      p.circle(27, 8, 3, '#9ea3ad');
      p.px(26, 7, '#e2e5ec'); p.px(28, 9, '#5d626c'); p.px(27, 8, '#5d626c');
      break;
    case 'shotgun':
      p.rect(9, 9, 7, 3, '#6b3f1f');
      p.rect(16, 6, 22, 2, '#3a3d44');
      p.rect(16, 8, 18, 1, '#24262b');
      p.rect(22, 9, 7, 2, '#8a5a2e');
      break;
    case 'uzi':
      p.rect(16, 5, 14, 4, '#1d1e22');
      p.rect(30, 6, 5, 2, '#3a3d44');
      p.rect(19, 9, 4, 6, '#1d1e22');
      p.px(17, 5, '#5b5f68');
      break;
    case 'chainsaw':
      p.rect(15, 3, 10, 9, '#e87a1c');
      p.rect(15, 3, 10, 2, '#ffb15e');
      p.rect(25, 5, 14, 5, '#b9bec7');
      for (let x = 25 + (frame % 2); x < 39; x += 2) { p.px(x, 4, '#e7ebf2'); p.px(x, 10, '#e7ebf2'); }
      break;
    case 'bat':
      p.poly([[16, 7], [38, 5], [39, 10], [16, 9]], '#c99556');
      p.rect(16, 7, 3, 3, '#7a4a22');
      p.px(36, 6, '#e8c08a');
      break;
  }
}

function mikFrames(costume: 'classic' | 'alt'): FrameDef[] {
  const frames: FrameDef[] = [];
  const add = (name: string, pose: MikPose) => frames.push({ name, draw: (p) => drawSanMik(p, pose, costume), meta: { sx: 29, sy: 39 + (pose.bob ?? 0) + (pose.crouch ? 10 : 0) } });
  [0, 0, 1, 1].forEach((bob, i) => add(`idle_${i}`, { bob, backArm: i < 2 ? 100 : 96 }));
  for (let i = 0; i < 6; i++) {
    const ph = (i / 6) * Math.PI * 2;
    add(`run_${i}`, {
      bob: i % 3 === 0 ? 1 : 0,
      legA: [Math.round(7 * Math.cos(ph)), Math.max(0, Math.round(5 * Math.sin(ph)))],
      legB: [Math.round(-7 * Math.cos(ph)), Math.max(0, Math.round(-5 * Math.sin(ph)))],
      backArm: 90 + 35 * Math.cos(ph),
    });
  }
  add('jump_0', { bob: -1, legA: [5, 7], legB: [-3, 4], mouth: 'open', backArm: 200, afroStretch: 2 });
  add('jump_1', { bob: -1, legA: [5, 8], legB: [-2, 5], mouth: 'open', backArm: 210, afroStretch: 3 });
  add('fall_0', { legA: [3, 2], legB: [-4, 1], mouth: 'o', backArm: 150, afroStretch: -2 });
  add('fall_1', { legA: [4, 2], legB: [-4, 2], mouth: 'o', backArm: 160, afroStretch: -3 });
  add('crouch_0', { crouch: true, backArm: 110 });
  add('hurt_0', { bob: 1, crooked: true, mouth: 'o', backArm: 200, tilt: -8 });
  add('hurt_1', { bob: 1, crooked: true, mouth: 'open', backArm: 210, tilt: -12 });
  add('ko_0', { bob: 2, crooked: true, mouth: 'open', backArm: 220, tilt: -16 });
  add('ko_1', { crouch: true, crooked: true, mouth: 'o', backArm: 120, tilt: -24 });
  add('ko_2', { crouch: true, crooked: true, mouth: 'o', backArm: 110, tilt: -30 });
  [0, -1, 0, -1].forEach((bob, i) => add(`victory_${i}`, { bob, backArm: i % 2 ? 235 : 250, mouth: i % 2 ? 'open' : 'grin', legA: [5, 0], legB: [-4, 0] }));
  add('pose_0', { bob: -1, backArm: 30, legA: [6, 0], legB: [-5, 0] });
  return frames;
}

// ---------------------------------------------------------------------------
// SANCHZ. Frame 56x64, facing right, feet on y=63. Crutches are part of the
// body frames. His crutches are mobility aids first and a weapon second.
// ---------------------------------------------------------------------------

interface ChzPalette {
  skin: string; skinShade: string; top: string; topHi: string; trousers: string; trousersLo: string; shoe: string;
  hat: string; hatDot: string; brim: string; glass: string; lens: string; crutch: string; crutchLo: string; cuff: string;
  wig?: string; wigHi?: string; jacket?: string; jacketLo?: string; hair?: string; tattoo?: string; pack?: string;
}

const CHZ_PAL: Record<string, ChzPalette> = {
  classic: {
    skin: '#f4d3c0', skinShade: '#d9a993', top: '#15161c', topHi: '#2c2e38', trousers: '#33405e', trousersLo: '#232c42', shoe: '#eeeeee',
    hat: '#2f6cb4', hatDot: '#a6d2f0', brim: '#1f8f92', glass: '#0d0d10', lens: '#c6d6e2', crutch: '#a8b2bd', crutchLo: '#5e6670', cuff: '#2a2d33',
  },
  party: {
    skin: '#f4d3c0', skinShade: '#d9a993', top: '#ff4fa8', topHi: '#ff8fca', trousers: '#ff6fb8', trousersLo: '#d94a92', shoe: '#ffffff',
    hat: '#111111', hatDot: '#ffffff', brim: '#111111', glass: '#ff7a1a', lens: '#7a55e0', crutch: '#a8b2bd', crutchLo: '#5e6670', cuff: '#2a2d33',
    wig: '#ff2f8f', wigHi: '#ff8cc6', jacket: '#ff59ad', jacketLo: '#c93b84',
  },
  dayout: {
    skin: '#f6cdb8', skinShade: '#dba48e', top: '#f0eeea', topHi: '#ffffff', trousers: '#cfc5b0', trousersLo: '#b0a690', shoe: '#e8e8e8',
    hat: '#000000', hatDot: '#000000', brim: '#000000', glass: '#000000', lens: '#000000', crutch: '#a8b2bd', crutchLo: '#5e6670', cuff: '#2a2d33',
    hair: '#e8d58a', tattoo: '#3a3a4a', pack: '#ffd84a',
  },
};

type Pt = [number, number];
export interface ChzPose {
  bob?: number;
  lean?: number;
  legA?: [number, number];
  legB?: [number, number];
  front?: { hand: Pt; tip: Pt; free?: boolean } | null; // free = crutch not held (arm does something else)
  back?: { hand: Pt; tip: Pt; free?: boolean } | null;
  throwHand?: Pt; // front arm free hand position
  mouth?: 'smile' | 'open' | 'grim';
  crouch?: boolean;
  tilt?: number;
  dropped?: boolean; // crutches lying on the floor (KO)
}

function drawCrutch(p: Pix, pal: ChzPalette, hand: Pt, tip: Pt) {
  const dx = hand[0] - tip[0], dy = hand[1] - tip[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const top: Pt = [hand[0] + ux * 8, hand[1] + uy * 8];
  p.line(tip[0], tip[1], top[0], top[1], pal.crutch, 2);
  p.line(tip[0] + 1, tip[1], top[0] + 1, top[1], pal.crutchLo, 1);
  // forearm cuff
  p.rect(Math.round(top[0]) - 2, Math.round(top[1]) - 2, 4, 4, pal.cuff);
  // handle sticking out forward
  p.line(hand[0], hand[1], hand[0] + 3 * Math.sign(-uy || 1) * 0 + 3, hand[1], pal.cuff, 2);
  // rubber tip
  p.rect(Math.round(tip[0]) - 1, Math.round(tip[1]) - 2, 3, 3, '#111111');
  return top;
}

export type ChzCostume = 'classic' | 'party' | 'dayout';

// SanChz is a big lad: broad shoulders, round belly, fuller face (see reference photos).
export function drawSanChz(p: Pix, pose: ChzPose, costume: ChzCostume) {
  const pal = CHZ_PAL[costume];
  const ctx = p.ctx;
  if (pose.tilt) {
    ctx.save();
    const fx = p.ox + 28, fy = p.oy + 63;
    ctx.translate(fx, fy);
    ctx.rotate((pose.tilt * Math.PI) / 180);
    ctx.translate(-fx, -fy);
  }
  // widen the stance for a big lad: front hand sits outside the belly, back hand behind the hip
  pose = {
    ...pose,
    front: pose.front ? { ...pose.front, hand: [pose.front.hand[0] + 4, pose.front.hand[1]], tip: [pose.front.tip[0] + 2, pose.front.tip[1]] } : pose.front,
    back: pose.back ? { ...pose.back, hand: [pose.back.hand[0] - 2, pose.back.hand[1]], tip: [pose.back.tip[0] - 1, pose.back.tip[1]] } : pose.back,
    throwHand: pose.throwHand ? [pose.throwHand[0] + 3, pose.throwHand[1]] : undefined,
  };
  const by = (pose.bob ?? 0) + (pose.crouch ? 8 : 0);
  const lx = pose.lean ?? 0;
  const shB: Pt = [22 + lx, 31 + by];
  const shF: Pt = [35 + lx, 31 + by];
  const sleeveCol = costume === 'party' ? pal.jacketLo! : costume === 'dayout' ? pal.skin : pal.skinShade;

  const armTo = (sh: Pt, hand: Pt, elbow: Pt | null, col: string, front: boolean) => {
    const pts: Pt[] = elbow ? [sh, elbow, hand] : [sh, hand];
    for (let i = 0; i + 1 < pts.length; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, 4);
    if (costume === 'dayout') {
      // short white sleeve + forearm tattoos (bands and a star)
      const a = pts[0], b = pts[1];
      p.line(a[0], a[1], a[0] + (b[0] - a[0]) * 0.35, a[1] + (b[1] - a[1]) * 0.35, pal.top, 5);
      if (front) {
        const last = pts[pts.length - 2], h = pts[pts.length - 1];
        const mx = last[0] + (h[0] - last[0]) * 0.5, my = last[1] + (h[1] - last[1]) * 0.5;
        p.rect(Math.round(mx) - 1, Math.round(my) - 1, 3, 3, pal.tattoo!);
        p.px(Math.round(mx), Math.round(my), pal.skin);
        const ex = a[0] + (b[0] - a[0]) * 0.55, ey = a[1] + (b[1] - a[1]) * 0.55;
        p.rect(Math.round(ex) - 2, Math.round(ey), 4, 1, pal.tattoo!);
      }
    }
    p.rect(hand[0] - 2, hand[1] - 1, 4, 4, pal.skin);
  };

  if (pose.dropped) {
    p.line(4, 62, 30, 60, pal.crutch, 2);
    p.line(22, 63, 50, 61, pal.crutch, 2);
  }

  // backpack (Day Out) sits behind everything
  if (costume === 'dayout') {
    p.rect(14 + lx, 31 + by, 8, 15, pal.pack!);
    p.rect(14 + lx, 31 + by, 8, 2, '#f8e88a');
    p.poly([[18 + lx, 35 + by], [16 + lx, 39 + by], [18 + lx, 39 + by], [17 + lx, 43 + by], [20 + lx, 38 + by], [18 + lx, 38 + by]], '#3a6ad0');
  }

  // back crutch + back arm
  if (pose.back) {
    const top = drawCrutch(p, pal, pose.back.hand, pose.back.tip);
    armTo(shB, pose.back.hand, pose.back.free ? null : top, sleeveCol, false);
  }

  // legs (chunky)
  const hipY = 47 + by;
  const drawLeg = (hipX: number, leg: [number, number], back: boolean) => {
    const col = back ? pal.trousersLo : pal.trousers;
    const fx = hipX + leg[0], fy = 62 - leg[1];
    if (pose.crouch) {
      p.line(hipX + 1, hipY, hipX + 7, hipY + 3, col, 5);
      p.line(hipX + 7, hipY + 3, fx + 1, fy - 1, col, 5);
    } else p.line(hipX + 1 + lx * 0.3, hipY, fx + 1, fy - 1, col, 5);
    if (costume === 'dayout') p.line(fx + 1, fy - 6, fx + 1, fy - 1, pal.skin, 4); // shorts: bare shins
    p.rect(fx - 2, fy - 1, 8, 3, pal.shoe);
    p.rect(fx - 2, fy + 1, 8, 1, '#9a9aa4');
  };
  drawLeg(24 + lx, pose.legB ?? [0, 0], true);
  drawLeg(31 + lx, pose.legA ?? [0, 0], false);

  // torso: broad chest + round belly pushing forward
  const tx = 20 + lx, ty = 29 + by;
  const bellyX = 32 + lx, bellyY = 41 + by;
  // shadow under the gut so it reads as round
  p.ellipse(bellyX, bellyY + 2, 11, 8, '#00000033');
  if (costume === 'classic') {
    p.rect(tx, ty, 18, 19, pal.top);
    p.ellipse(bellyX, bellyY, 11, 9, pal.top);
    p.rect(tx, ty, 3, 4, pal.skin);
    p.rect(tx + 15, ty, 3, 4, pal.skin);
    p.ellipse(bellyX + 4, bellyY - 2, 4, 5, pal.topHi);
    p.ellipse(bellyX + 2, bellyY, 7, 7, pal.top);
    p.line(bellyX - 6, bellyY + 8, bellyX + 6, bellyY + 8, '#000000', 1);
  } else if (costume === 'party') {
    p.rect(tx + 3, ty, 12, 19, pal.skin);
    p.ellipse(bellyX, bellyY, 11, 9, pal.skin);
    p.ellipse(bellyX + 2, bellyY + 2, 7, 5, pal.skinShade);
    p.ellipse(bellyX + 1, bellyY + 1, 7, 5, pal.skin);
    p.rect(tx, ty, 5, 20, pal.jacket!);
    p.rect(tx + 14, ty, 5, 12, pal.jacket!);
    p.rect(tx, ty, 1, 20, pal.jacketLo!);
    p.line(tx + 8, ty, tx + 10, ty + 8, '#2b2b2b', 1);
    p.rect(tx + 9, ty + 8, 3, 4, '#3a2a1a');
    p.px(tx + 10, ty + 9, '#7a5a30');
    p.px(bellyX + 1, bellyY + 2, '#b98672'); // belly button
  } else {
    p.rect(tx, ty, 18, 19, pal.top);
    p.ellipse(bellyX, bellyY, 11, 9, pal.top);
    p.ellipse(bellyX + 4, bellyY - 1, 5, 5, pal.topHi);
    p.ellipse(bellyX + 2, bellyY, 7, 7, pal.top);
    p.line(bellyX - 6, bellyY + 9, bellyX + 6, bellyY + 9, '#c8c0b0', 1);
    // tee print (two lines of text + a dashed stripe)
    p.rect(tx + 5, ty + 5, 11, 2, '#3a7a3a');
    p.rect(tx + 5, ty + 8, 2, 1, '#1a1a1a'); p.rect(tx + 8, ty + 8, 2, 1, '#1a1a1a'); p.rect(tx + 11, ty + 8, 2, 1, '#1a1a1a'); p.rect(tx + 14, ty + 8, 2, 1, '#1a1a1a');
    p.rect(tx + 5, ty + 10, 11, 2, '#9adf6a');
    // backpack strap over the shoulder
    p.line(tx + 2, ty, tx + 1, ty + 16, pal.pack!, 2);
    p.rect(tx, ty + 7, 3, 2, '#222222');
  }

  // head: big round face and a double chin
  const hx = 30 + lx, hy = 19 + by;
  p.rect(hx - 8, hy - 1, 2, 5, pal.skinShade);
  p.ellipse(hx, hy + 1, 8, 8, pal.skin);
  p.ellipse(hx + 1, hy + 7, 7, 3, pal.skinShade);
  p.ellipse(hx + 1, hy + 6, 6, 2, pal.skin);
  p.px(hx - 5, hy + 3, '#efa59a'); p.px(hx + 6, hy + 3, '#efa59a');
  if (costume === 'classic') {
    p.ellipse(hx - 1, hy - 6, 9, 4, pal.hat);
    p.rect(hx - 10, hy - 6, 19, 3, pal.hat);
    const r = rng(9);
    for (let i = 0; i < 16; i++) p.px(hx - 9 + Math.floor(r() * 18), hy - 9 + Math.floor(r() * 6), pal.hatDot);
    p.rect(hx + 4, hy - 4, 10, 2, pal.brim);
    p.rect(hx + 4, hy - 3, 10, 1, '#14686a');
  } else if (costume === 'party') {
    p.ellipse(hx - 2, hy - 4, 12, 9, pal.wig!);
    for (let i = 0; i < 9; i++) p.circle(hx - 13 + i * 3, hy - 11 + (i % 2) * 2, 3, pal.wig!);
    p.rect(hx - 11, hy - 2, 4, 14, pal.wig!);
    const r = rng(4);
    for (let i = 0; i < 24; i++) p.px(hx - 13 + Math.floor(r() * 21), hy - 13 + Math.floor(r() * 18), pal.wigHi!);
    p.rect(hx - 5, hy - 15, 10, 4, pal.hat);
    p.text('PA', hx - 4, hy - 15, '#ffffff');
  } else {
    // short blond fade
    p.ellipse(hx - 1, hy - 5, 8, 4, pal.hair!);
    p.rect(hx - 8, hy - 5, 4, 5, '#e9c9a8');
    p.rect(hx - 7, hy - 7, 14, 2, pal.hair!);
    p.px(hx - 3, hy - 8, '#fff3c0'); p.px(hx + 2, hy - 8, '#fff3c0');
  }
  // eyes / glasses
  if (costume === 'classic') {
    p.rect(hx - 4, hy - 2, 13, 5, pal.glass);
    p.rect(hx - 3, hy - 1, 5, 3, pal.lens);
    p.rect(hx + 3, hy - 1, 5, 3, pal.lens);
    p.px(hx - 3, hy - 1, '#ffffff'); p.px(hx + 3, hy - 1, '#ffffff');
  } else if (costume === 'party') {
    p.circle(hx - 1, hy, 4, pal.glass);
    p.circle(hx + 6, hy, 4, pal.glass);
    p.circle(hx - 1, hy, 3, pal.lens);
    p.circle(hx + 6, hy, 3, pal.lens);
    p.px(hx - 2, hy - 2, '#ffffff'); p.px(hx + 5, hy - 2, '#ffffff');
  } else {
    p.rect(hx, hy, 2, 2, '#3a5a8a'); p.rect(hx + 5, hy, 2, 2, '#3a5a8a');
    p.rect(hx - 1, hy - 2, 3, 1, '#c8a85a'); p.rect(hx + 5, hy - 2, 3, 1, '#c8a85a');
    p.rect(hx + 3, hy + 2, 2, 2, pal.skinShade);
  }
  const mouth = pose.mouth ?? 'smile';
  if (mouth === 'smile') { p.rect(hx + 1, hy + 5, 5, 1, '#6a2a2a'); p.px(hx + 6, hy + 4, '#6a2a2a'); }
  else if (mouth === 'open') { p.rect(hx, hy + 3, 7, 5, '#330a0a'); p.rect(hx + 1, hy + 3, 5, 1, '#ffffff'); }
  else { p.rect(hx, hy + 4, 7, 2, '#330a0a'); p.rect(hx + 1, hy + 4, 5, 1, '#ffffff'); }

  // front arm + front crutch
  if (pose.front) {
    const top = drawCrutch(p, pal, pose.front.hand, pose.front.tip);
    if (!pose.front.free) armTo(shF, pose.front.hand, top, sleeveCol, true);
  }
  if (pose.throwHand) armTo(shF, pose.throwHand, null, sleeveCol, true);

  if (pose.tilt) ctx.restore();
}

function chzFrames(costume: ChzCostume): FrameDef[] {
  const frames: FrameDef[] = [];
  const add = (name: string, pose: ChzPose) => frames.push({ name, draw: (p) => drawSanChz(p, pose, costume) });
  const stand = (b: number) => ({ front: { hand: [37, 43 + b] as Pt, tip: [43, 62] as Pt }, back: { hand: [21, 43 + b] as Pt, tip: [15, 62] as Pt } });
  [0, 0, 1, 1].forEach((b, i) => add(`idle_${i}`, { bob: b, ...stand(b) }));
  // swing-through crutch gait
  const tipsF = [46, 42, 37, 33, 40, 47];
  const tipLift = [0, 0, 0, 3, 7, 3];
  const legs: [number, number][] = [[-6, 2], [-3, 0], [1, 0], [5, 0], [4, 3], [-2, 4]];
  const bobs = [0, -1, -2, -1, 0, 0];
  for (let i = 0; i < 6; i++) {
    const b = bobs[i];
    add(`run_${i}`, {
      bob: b, lean: 2,
      legA: legs[i], legB: [legs[i][0] - 4, legs[i][1]],
      front: { hand: [39, 43 + b], tip: [tipsF[i], 62 - tipLift[i]] },
      back: { hand: [33, 43 + b], tip: [tipsF[i] - 7, 62 - tipLift[i]] },
    });
  }
  add('jump_0', { bob: -2, legA: [3, 7], legB: [-1, 6], mouth: 'open', front: { hand: [35, 42], tip: [24, 60] }, back: { hand: [26, 42], tip: [16, 58] } });
  add('jump_1', { bob: -2, legA: [4, 8], legB: [0, 7], mouth: 'open', front: { hand: [36, 41], tip: [20, 54] }, back: { hand: [26, 41], tip: [12, 52] } });
  add('fall_0', { legA: [2, 2], legB: [-2, 3], front: { hand: [38, 42], tip: [47, 60] }, back: { hand: [30, 42], tip: [39, 61] } });
  add('fall_1', { legA: [3, 2], legB: [-2, 2], front: { hand: [38, 43], tip: [48, 61] }, back: { hand: [30, 43], tip: [40, 62] } });
  add('crouch_0', { crouch: true, front: { hand: [38, 50], tip: [46, 62] }, back: { hand: [22, 50], tip: [14, 62] } });
  add('hurt_0', { tilt: -10, mouth: 'open', front: { hand: [38, 38], tip: [50, 52] }, back: { hand: [20, 38], tip: [8, 50] } });
  add('hurt_1', { tilt: -14, mouth: 'grim', front: { hand: [39, 36], tip: [52, 48] }, back: { hand: [19, 36], tip: [6, 46] } });
  add('ko_0', { tilt: -16, mouth: 'open', front: { hand: [39, 36], tip: [52, 48] }, back: { hand: [19, 36], tip: [6, 46] } });
  add('ko_1', { crouch: true, tilt: -22, mouth: 'grim', dropped: true, throwHand: [36, 52] });
  add('ko_2', { crouch: true, tilt: -28, mouth: 'grim', dropped: true, throwHand: [36, 54] });
  [0, -1, 0, -1].forEach((b, i) => add(`victory_${i}`, {
    bob: b, mouth: i % 2 ? 'open' : 'smile',
    front: { hand: [36, 18 + b], tip: [44 + (i % 2) * 3, 1] },
    back: { hand: [21, 43 + b], tip: [15, 62] },
  }));
  // throwing: front crutch leans on the body while the arm throws
  const leanCrutch = { hand: [36, 33] as Pt, tip: [42, 62] as Pt, free: true };
  add('throw_0', { ...stand(0), front: leanCrutch, throwHand: [24, 26] });
  add('throw_1', { ...stand(0), front: leanCrutch, throwHand: [44, 30], mouth: 'grim' });
  add('throwup_0', { ...stand(0), front: leanCrutch, throwHand: [28, 22] });
  add('throwup_1', { ...stand(0), front: leanCrutch, throwHand: [38, 12], mouth: 'grim' });
  const back = { hand: [21, 43] as Pt, tip: [15, 62] as Pt };
  add('strike1_0', { lean: -1, back, front: { hand: [32, 38], tip: [42, 30] } });
  add('strike1_1', { lean: 2, back, mouth: 'grim', front: { hand: [38, 36], tip: [55, 34] } });
  add('strike2_0', { lean: -1, back, front: { hand: [32, 34], tip: [22, 14] } });
  add('strike2_1', { lean: 3, back, mouth: 'grim', front: { hand: [39, 44], tip: [55, 56] } });
  add('strike3_0', { lean: -2, legA: [3, 0], legB: [-4, 0], front: { hand: [30, 38], tip: [40, 28] }, back: { hand: [28, 42], tip: [40, 40] } });
  add('strike3_1', { lean: 3, legA: [4, 0], legB: [-5, 0], mouth: 'open', front: { hand: [40, 34], tip: [55, 28] }, back: { hand: [38, 42], tip: [55, 44] } });
  add('guard_0', { lean: 1, mouth: 'grim', front: { hand: [37, 30], tip: [50, 54] }, back: { hand: [35, 46], tip: [50, 22] } });
  add('fart_0', { lean: 3, bob: 2, mouth: 'smile', legB: [-5, 0], front: { hand: [41, 45], tip: [48, 62] }, back: { hand: [35, 45], tip: [41, 62] } });
  add('fart_1', { lean: 4, bob: 3, mouth: 'open', legB: [-6, 0], front: { hand: [42, 46], tip: [48, 62] }, back: { hand: [36, 46], tip: [41, 62] } });
  return frames;
}

export const SANMIK_FRAMES_META: Record<string, { sx: number; sy: number }> = {};

export function buildCharacters(scene: Phaser.Scene) {
  for (const costume of ['classic', 'alt'] as const) {
    const frames = mikFrames(costume);
    for (const f of frames) SANMIK_FRAMES_META[f.name] = { sx: f.meta!.sx, sy: f.meta!.sy };
    buildSheet(scene, `sanmik_${costume}`, SANMIK_FRAME.w, SANMIK_FRAME.h, frames);
    const items = ['mik', 'shotgun', 'uzi', 'chainsaw_0', 'chainsaw_1', 'bat'];
    buildSheet(scene, `arm_sanmik_${costume}`, 40, 16, items.map((it) => ({
      name: it,
      draw: (p: Pix) => drawMikArm(p, it.split('_')[0], costume, Number(it.split('_')[1] ?? 0)),
    })));
  }
  for (const costume of ['classic', 'party', 'dayout'] as const) buildSheet(scene, `sanchz_${costume}`, SANCHZ_FRAME.w, SANCHZ_FRAME.h, chzFrames(costume));

  // portraits for menus / dialogue (scaled-up head crops are made in code)
}

export function registerCharacterAnims(scene: Phaser.Scene) {
  const mk = (tex: string, name: string, count: number, rate: number, repeat = -1) => {
    const key = `${tex}:${name}`;
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: Array.from({ length: count }, (_, i) => ({ key: tex, frame: `${name}_${i}` })),
      frameRate: rate,
      repeat,
    });
  };
  for (const tex of ['sanmik_classic', 'sanmik_alt']) {
    mk(tex, 'idle', 4, 5); mk(tex, 'run', 6, 13); mk(tex, 'jump', 2, 8, 0); mk(tex, 'fall', 2, 8);
    mk(tex, 'crouch', 1, 1, 0); mk(tex, 'hurt', 2, 12, 0); mk(tex, 'ko', 3, 6, 0); mk(tex, 'victory', 4, 6); mk(tex, 'pose', 1, 1, 0);
  }
  for (const tex of ['sanchz_classic', 'sanchz_party', 'sanchz_dayout']) {
    mk(tex, 'idle', 4, 5); mk(tex, 'run', 6, 11); mk(tex, 'jump', 2, 8, 0); mk(tex, 'fall', 2, 8);
    mk(tex, 'crouch', 1, 1, 0); mk(tex, 'hurt', 2, 12, 0); mk(tex, 'ko', 3, 6, 0); mk(tex, 'victory', 4, 6);
    mk(tex, 'throw', 2, 20, 0); mk(tex, 'throwup', 2, 20, 0);
    mk(tex, 'strike1', 2, 24, 0); mk(tex, 'strike2', 2, 24, 0); mk(tex, 'strike3', 2, 18, 0);
    mk(tex, 'guard', 1, 1, 0); mk(tex, 'fart', 2, 8, 0);
  }
}
