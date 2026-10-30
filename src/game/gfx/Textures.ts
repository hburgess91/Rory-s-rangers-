import Phaser from "phaser";
import { CHARACTERS, type SpriteLook } from "../../data/characters";
import { ENEMIES, type EnemyDef } from "../../data/enemies";

// All art is generated at boot. Asset keys are centralised here so real art can replace them:
// load a PNG with the same key in BootScene.preload() and the generator skips it.

export const CHAR_W = 16;
export const CHAR_H = 24;
export const CHAR_FRAMES = 4;

const hex = (c: number) => "#" + c.toString(16).padStart(6, "0");
const shade = (c: number, f: number) => {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
};

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, w: number, h: number, c: number) {
  ctx.fillStyle = hex(c);
  ctx.fillRect(x, y, w, h);
}

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function addSheet(scene: Phaser.Scene, key: string, cv: HTMLCanvasElement, fw: number, fh: number, frames: number) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.addCanvas(key, cv)!;
  for (let i = 0; i < frames; i++) tex.add(i, 0, i * fw, 0, fw, fh);
}

function addImage(scene: Phaser.Scene, key: string, cv: HTMLCanvasElement) {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, cv);
}

// ---------------------------------------------------------------- characters

export function drawCharacter(ctx: Ctx, L: SpriteLook, frame: number, ox: number, oy = 0) {
  const P = (x: number, y: number, w: number, h: number, c: number) => px(ctx, ox + x, oy + y, w, h, c);
  const bulk = L.bulk ?? 1;
  const bx = bulk === 2 ? 2 : 3;
  const bw = bulk === 2 ? 12 : 10;
  const walkA = frame === 1;
  const walkB = frame === 2;
  const attack = frame === 3;
  const bob = walkA || walkB ? 1 : 0;
  const y0 = bob;
  // legs
  const legC = L.bottom;
  if (walkA) {
    P(5, 17 + y0, 3, 4, legC);
    P(9, 17 + y0, 3, 5, legC);
    P(4, 21 + y0, 4, 2, L.shoes);
    P(9, 22, 4, 2, L.shoes);
  } else if (walkB) {
    P(5, 17 + y0, 3, 5, legC);
    P(9, 17 + y0, 3, 4, legC);
    P(4, 22, 4, 2, L.shoes);
    P(9, 21 + y0, 4, 2, L.shoes);
  } else {
    P(5, 17, 3, 5, legC);
    P(9, 17, 3, 5, legC);
    P(4, 22, 4, 2, L.shoes);
    P(9, 22, 4, 2, L.shoes);
  }
  // shorts look: skin on lower legs for dark bottoms with bulk 2 Gronny
  if (L.hairStyle === "bald" && L.glasses === "shades") {
    P(5, 20 + y0, 3, 2, L.skin);
    P(9, 20 + (walkB ? y0 : 0), 3, 2, L.skin);
  }
  // torso
  P(bx, 10 + y0, bw, 7, L.top);
  P(bx, 16 + y0, bw, 1, shade(L.top, 0.75));
  if (L.topDetail !== undefined) {
    // chest logo / lapel / stripe
    if (L.hairStyle === "crown") {
      // overalls straps + bib
      P(bx + 1, 12 + y0, bw - 2, 5, L.topDetail);
      P(bx + 2, 10 + y0, 1, 2, L.topDetail);
      P(bx + bw - 3, 10 + y0, 1, 2, L.topDetail);
    } else {
      P(7, 12 + y0, 3, 2, L.topDetail);
    }
  }
  if (L.accent !== undefined) {
    if (L.hairStyle === "short" && L.top === 0xf4f4f0) P(bx, 15 + y0, bw, 1, L.accent); // BJJ belt
    else if (L.hairStyle === "bowler" || L.hairStyle === "hat") {
      // sash
      for (let i = 0; i < 6; i++) P(bx + 1 + i, 10 + i + y0, 2, 1, L.accent);
    } else P(7, 10 + y0, 3, 1, L.accent); // chain
  }
  // arms
  const armC = L.hairStyle === "crown" || L.hairStyle === "blonde" ? L.skin : L.top;
  if (attack) {
    P(bx - 1, 11 + y0, 2, 5, armC);
    P(bx + bw - 1, 11 + y0, 5, 2, armC);
    P(bx + bw + 3, 11 + y0, 2, 2, L.skin);
  } else {
    const sw = walkA ? 1 : walkB ? -1 : 0;
    P(bx - 1, 11 + y0 + sw, 2, 5, armC);
    P(bx + bw - 1, 11 + y0 - sw, 2, 5, armC);
    P(bx - 1, 16 + y0 + sw, 2, 1, L.skin);
    P(bx + bw - 1, 16 + y0 - sw, 2, 1, L.skin);
  }
  // head
  P(4, 2 + y0, 8, 8, L.skin);
  P(4, 9 + y0, 8, 1, shade(L.skin, 0.85));
  // ears
  P(3, 5 + y0, 1, 2, shade(L.skin, 0.9));
  P(12, 5 + y0, 1, 2, shade(L.skin, 0.9));
  // eyes
  P(6, 5 + y0, 1, 1, 0x1a1a1a);
  P(9, 5 + y0, 1, 1, 0x1a1a1a);
  // hair
  const h = L.hair ?? 0;
  switch (L.hairStyle) {
    case "bald":
      P(6, 2 + y0, 3, 1, shade(L.skin, 1.12));
      break;
    case "short":
      P(4, 1 + y0, 8, 2, h);
      P(4, 3 + y0, 1, 2, h);
      P(11, 3 + y0, 1, 2, h);
      break;
    case "blonde":
      P(4, 1 + y0, 8, 3, h);
      P(3, 2 + y0, 1, 2, h);
      P(12, 2 + y0, 1, 2, h);
      P(5, 0 + y0, 5, 1, h);
      break;
    case "wavy":
      P(3, 1 + y0, 10, 3, h);
      P(3, 4 + y0, 2, 3, h);
      P(11, 4 + y0, 2, 3, h);
      P(4, 0 + y0, 3, 1, h);
      P(8, 0 + y0, 3, 1, h);
      break;
    case "long":
      P(3, 1 + y0, 10, 3, h);
      P(3, 4 + y0, 2, 7, h);
      P(11, 4 + y0, 2, 7, h);
      break;
    case "beanie":
      P(3, 0 + y0, 10, 4, h);
      P(3, 3 + y0, 10, 1, shade(h, 1.5));
      break;
    case "crown":
      P(6, 2 + y0, 3, 1, shade(L.skin, 1.12));
      P(4, 0 + y0, 8, 2, L.accent ?? 0xd4a017);
      P(4, -1 + y0 < 0 ? 0 : y0 - 1, 1, 1, L.accent ?? 0xd4a017);
      P(7, -1 + y0 < 0 ? 0 : y0 - 1, 2, 1, L.accent ?? 0xd4a017);
      P(11, -1 + y0 < 0 ? 0 : y0 - 1, 1, 1, L.accent ?? 0xd4a017);
      break;
    case "hat":
      P(5, 0 + y0, 6, 3, 0x0d0d0d);
      P(3, 2 + y0, 10, 1, 0x0d0d0d);
      P(5, 1 + y0, 6, 1, L.accent ?? 0x7a1f2b);
      break;
    case "bowler":
      P(5, 0 + y0, 6, 2, 0x222226);
      P(3, 2 + y0, 10, 1, 0x222226);
      P(4, 3 + y0, 1, 2, h);
      P(11, 3 + y0, 1, 2, h);
      break;
  }
  // beard
  if (L.beard !== null && L.beard !== undefined) {
    P(4, 7 + y0, 8, 3, L.beard);
    P(6, 7 + y0, 4, 1, shade(L.skin, 0.8));
    P(4, 6 + y0, 1, 1, L.beard);
    P(11, 6 + y0, 1, 1, L.beard);
  } else {
    P(7, 7 + y0, 2, 1, shade(L.skin, 0.75));
  }
  // glasses
  if (L.glasses === "square") {
    P(5, 4 + y0, 3, 3, 0x111111);
    P(8, 4 + y0, 3, 3, 0x111111);
    P(6, 5 + y0, 1, 1, 0x88aacc);
    P(9, 5 + y0, 1, 1, 0x88aacc);
  } else if (L.glasses === "round") {
    P(5, 4 + y0, 3, 3, 0x3a2a1a);
    P(8, 4 + y0, 3, 3, 0x3a2a1a);
    P(6, 5 + y0, 1, 1, 0xd8c8a8);
    P(9, 5 + y0, 1, 1, 0xd8c8a8);
  } else if (L.glasses === "shades") {
    P(5, 4 + y0, 6, 2, 0x2a2a3a);
  }
}

export function generateCharacters(scene: Phaser.Scene) {
  for (const def of Object.values(CHARACTERS)) {
    const key = `spr_${def.id}`;
    if (scene.textures.exists(key)) continue;
    const [cv, ctx] = canvas(CHAR_W * CHAR_FRAMES, CHAR_H);
    for (let f = 0; f < CHAR_FRAMES; f++) drawCharacter(ctx, def.look, f, f * CHAR_W);
    addSheet(scene, key, cv, CHAR_W, CHAR_H, CHAR_FRAMES);
  }
  // Generic NPC townsfolk
  const folk: SpriteLook[] = [
    { skin: 0xf1c7a5, hair: 0x5a3a1a, hairStyle: "short", beard: null, glasses: "none", top: 0x6d8f4f, bottom: 0x3b3b5a, shoes: 0x222222 },
    { skin: 0xd9a77e, hair: 0x111111, hairStyle: "long", beard: null, glasses: "none", top: 0xb5506b, bottom: 0x2b2b2b, shoes: 0x111111 },
    { skin: 0xf6d7c3, hair: 0xaaaaaa, hairStyle: "short", beard: 0xaaaaaa, glasses: "round", top: 0x7a6a5a, bottom: 0x4a4a4a, shoes: 0x222222 },
    { skin: 0xc58c5c, hair: 0x2a1a0a, hairStyle: "wavy", beard: null, glasses: "none", top: 0x3a6ea5, bottom: 0x333333, shoes: 0xffffff },
  ];
  folk.forEach((L, i) => {
    const key = `spr_FOLK${i}`;
    if (scene.textures.exists(key)) return;
    const [cv, ctx] = canvas(CHAR_W * CHAR_FRAMES, CHAR_H);
    for (let f = 0; f < CHAR_FRAMES; f++) drawCharacter(ctx, L, f, f * CHAR_W);
    addSheet(scene, key, cv, CHAR_W, CHAR_H, CHAR_FRAMES);
  });
}

// ---------------------------------------------------------------- portraits

export function drawPortrait(ctx: Ctx, L: SpriteLook, bg: number) {
  // 32x32 grid, drawn at scale 2 into a 64x64 canvas
  const P = (x: number, y: number, w: number, h: number, c: number) => px(ctx, x * 2, y * 2, w * 2, h * 2, c);
  P(0, 0, 32, 32, bg);
  P(0, 24, 32, 8, shade(bg, 0.8));
  // shoulders
  P(4, 25, 24, 7, L.top);
  if (L.topDetail !== undefined) P(14, 27, 4, 5, L.topDetail);
  if (L.accent !== undefined) P(12, 25, 8, 1, L.accent);
  // neck + head
  P(13, 21, 6, 4, shade(L.skin, 0.9));
  P(9, 6, 14, 16, L.skin);
  P(8, 10, 1, 6, L.skin);
  P(23, 10, 1, 6, L.skin);
  P(7, 12, 1, 3, shade(L.skin, 0.9));
  P(24, 12, 1, 3, shade(L.skin, 0.9));
  // eyes
  P(12, 13, 2, 2, 0x1b1b1b);
  P(18, 13, 2, 2, 0x1b1b1b);
  P(12, 13, 1, 1, 0xffffff);
  P(18, 13, 1, 1, 0xffffff);
  P(11, 11, 3, 1, shade(L.hair ?? L.beard ?? 0x333333, 1));
  P(18, 11, 3, 1, shade(L.hair ?? L.beard ?? 0x333333, 1));
  // nose & mouth
  P(15, 15, 2, 3, shade(L.skin, 0.85));
  const h = L.hair ?? 0x222222;
  switch (L.hairStyle) {
    case "short":
      P(9, 4, 14, 4, h);
      P(8, 6, 2, 5, h);
      P(22, 6, 2, 5, h);
      break;
    case "blonde":
      P(8, 3, 16, 6, h);
      P(7, 6, 2, 5, h);
      P(23, 6, 2, 5, h);
      break;
    case "wavy":
      P(7, 3, 18, 6, h);
      P(6, 8, 3, 8, h);
      P(23, 8, 3, 8, h);
      break;
    case "long":
      P(7, 3, 18, 6, h);
      P(6, 8, 3, 16, h);
      P(23, 8, 3, 16, h);
      break;
    case "beanie":
      P(7, 2, 18, 8, h);
      P(7, 9, 18, 1, shade(h, 1.5));
      break;
    case "crown":
      P(9, 1, 14, 4, L.accent ?? 0xd4a017);
      P(9, 0, 2, 1, L.accent ?? 0xd4a017);
      P(15, 0, 2, 1, L.accent ?? 0xd4a017);
      P(21, 0, 2, 1, L.accent ?? 0xd4a017);
      break;
    case "hat":
      P(10, 0, 12, 6, 0x0d0d0d);
      P(6, 5, 20, 2, 0x0d0d0d);
      P(10, 4, 12, 1, L.accent ?? 0x7a1f2b);
      break;
    case "bowler":
      P(10, 1, 12, 5, 0x222226);
      P(6, 5, 20, 2, 0x222226);
      P(8, 7, 2, 5, h);
      P(22, 7, 2, 5, h);
      break;
    case "bald":
    default:
      P(13, 7, 5, 2, shade(L.skin, 1.12));
  }
  if (L.beard !== null && L.beard !== undefined) {
    P(9, 16, 14, 6, L.beard);
    P(10, 22, 12, 1, L.beard);
    P(13, 18, 6, 1, shade(L.skin, 0.7));
    P(12, 16, 8, 1, L.beard);
  } else {
    P(13, 19, 6, 1, shade(L.skin, 0.7));
  }
  if (L.glasses === "square") {
    P(10, 12, 5, 4, 0x111111);
    P(17, 12, 5, 4, 0x111111);
    P(11, 13, 3, 2, 0x99bbdd);
    P(18, 13, 3, 2, 0x99bbdd);
    P(15, 13, 2, 1, 0x111111);
  } else if (L.glasses === "round") {
    P(10, 12, 5, 4, 0x3a2a1a);
    P(17, 12, 5, 4, 0x3a2a1a);
    P(11, 13, 3, 2, 0xe8dcc8);
    P(18, 13, 3, 2, 0xe8dcc8);
  } else if (L.glasses === "shades") {
    P(10, 12, 12, 3, 0x2a2a3a);
  }
}

const EXTRA_PORTRAITS: Record<string, { look: SpriteLook; bg: number }> = {
  gen_newsreader: { look: { skin: 0xf1c7a5, hair: 0x6b4a2c, hairStyle: "short", beard: null, glasses: "none", top: 0x1f2a44, topDetail: 0xffffff, bottom: 0, shoes: 0 }, bg: 0x2a3a6a },
  gen_fridge: { look: { skin: 0xe5e7eb, hair: null, hairStyle: "bald", beard: null, glasses: "none", top: 0xd1d5db, bottom: 0, shoes: 0 }, bg: 0x93c5fd },
  gen_boss: { look: { skin: 0x9b1c1c, hair: null, hairStyle: "bald", beard: null, glasses: "shades", top: 0x111111, bottom: 0, shoes: 0 }, bg: 0x220000 },
  gen_folk: { look: { skin: 0xf1c7a5, hair: 0x5a3a1a, hairStyle: "short", beard: null, glasses: "none", top: 0x6d8f4f, bottom: 0, shoes: 0 }, bg: 0x445544 },
  gen_tap: { look: { skin: 0xd8b4fe, hair: null, hairStyle: "bald", beard: null, glasses: "none", top: 0xb08d57, bottom: 0, shoes: 0 }, bg: 0xffc0cb },
  gen_archive: { look: { skin: 0xc8b88a, hair: 0x6b5a3a, hairStyle: "bowler", beard: 0x6b5a3a, glasses: "round", top: 0x5a4a2a, bottom: 0, shoes: 0 }, bg: 0x3a2f1f },
};

export function generatePortraits(scene: Phaser.Scene) {
  for (const def of Object.values(CHARACTERS)) {
    const key = def.portrait && def.portrait.startsWith("gen_") ? def.portrait : `gen_${def.id.toLowerCase()}`;
    if (scene.textures.exists(key)) continue;
    const [cv, ctx] = canvas(64, 64);
    drawPortrait(ctx, def.look, shade(def.color, 0.45));
    addImage(scene, key, cv);
  }
  for (const [key, v] of Object.entries(EXTRA_PORTRAITS)) {
    if (scene.textures.exists(key)) continue;
    const [cv, ctx] = canvas(64, 64);
    drawPortrait(ctx, v.look, v.bg);
    if (key === "gen_tap") {
      ctx.fillStyle = "#b08d57";
      ctx.fillRect(16, 8, 32, 10);
      ctx.fillRect(28, 18, 8, 14);
    }
    addImage(scene, key, cv);
  }
}

/** Which portrait texture to show for a speaker. */
/** Named speakers who aren't in CHARACTERS but have a generated sprite. */
const SPEAKER_SPRITES: Record<string, string> = {
  "BOGGOR CRANSTIL": "spr_BOGGOR",
  "SERGEANT SWIG": "spr_SWIG",
  "DR. GRUNGUS FLORP": "spr_GRUNGUS",
  MOLLOR: "spr_MOLLOR",
  GARY: "spr_GARY",
  "GYM DEALER": "spr_GARY",
  JOURNALIST: "spr_JOURNALIST",
  SANMIK: "spr_SANMIK",
  SANCHZ: "spr_SANCHZ",
  KROZNO: "boss_krozno",
  "RUSSELL BRAND": "boss_brand",
  "DEREK GRUMBO": "boss_troll",
  "CARPET KEV": "boss_flatmate",
  "BRICK KOLBANE": "boss_rival",
  "THE CUDDLE CRONSTER": "boss_cronster",
  "THE SALMON SOVEREIGN": "boss_salmon",
  WAITER: "spr_FOLK1",
  "PROCTUS KRELMOR": "spr_PROCTUS",
};

/**
 * A dialogue portrait cut from a PixelLab sprite: the head and shoulders of frame 0, scaled up
 * with nearest-neighbour onto a soft backdrop. Cached as its own texture.
 */
function spritePortrait(scene: Phaser.Scene, sprKey: string, bg: number): string | null {
  const key = `ptx_${sprKey}`;
  if (scene.textures.exists(key)) return key;
  if (!scene.textures.exists(sprKey)) return null;
  const tex = scene.textures.get(sprKey);
  if (!(tex.customData as { char?: unknown; hd?: number })?.hd) return null; // old procedural art: no
  const fr = tex.get(0);
  const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const [tmp, tctx] = canvas(fr.cutWidth, fr.cutHeight);
  tctx.drawImage(src, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fr.cutWidth, fr.cutHeight);
  const data = tctx.getImageData(0, 0, fr.cutWidth, fr.cutHeight).data;
  let minX = fr.cutWidth, minY = fr.cutHeight, maxX = 0, maxY = 0;
  for (let y = 0; y < fr.cutHeight; y++)
    for (let x = 0; x < fr.cutWidth; x++)
      if (data[(y * fr.cutWidth + x) * 4 + 3] > 40) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  if (maxX <= minX) return null;
  const h = maxY - minY + 1;
  const side = Math.max(12, Math.round(h * 0.42));
  const cx = Math.round((minX + maxX) / 2);
  const sx = Phaser.Math.Clamp(cx - Math.round(side / 2), 0, Math.max(0, fr.cutWidth - side));
  const [cv, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 26, 4, 32, 32, 46);
  const col = (n: number, k: number) => `rgb(${(((n >> 16) & 255) * k) | 0},${(((n >> 8) & 255) * k) | 0},${((n & 255) * k) | 0})`;
  g.addColorStop(0, col(bg, 1));
  g.addColorStop(1, col(bg, 0.45));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, sx, Math.max(0, minY - 1), side, side, 4, 6, 56, 56);
  addImage(scene, key, cv);
  return key;
}

/** Which portrait texture to show for a speaker. */
export function portraitKey(scene: Phaser.Scene, speaker: string): string | null {
  const def = CHARACTERS[speaker];
  if (def) {
    if (def.portrait && def.portrait.startsWith("pt_") && scene.textures.exists(def.portrait)) return def.portrait;
    const fromSprite = spritePortrait(scene, `spr_${def.id}`, shade(def.color, 0.55));
    if (fromSprite) return fromSprite;
    if (def.portrait && scene.textures.exists(def.portrait)) return def.portrait;
    const g = `gen_${def.id.toLowerCase()}`;
    if (scene.textures.exists(g)) return g;
  }
  const s = speaker.toUpperCase();
  if (s === "NARRATOR" || s === "") return null;
  const named = SPEAKER_SPRITES[s] ?? (scene.textures.exists(`spr_TV_${s.replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "")}`) ? `spr_TV_${s.replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "")}` : scene.textures.exists(`spr_${s}`) ? `spr_${s}` : "");
  if (named) {
    const p = spritePortrait(scene, named, 0x3d2a6b);
    if (p) return p;
  }
  if (s.includes("FRIDGE")) return "gen_fridge";
  if (s.includes("NEWS") || s.includes("REPORTER") || s.includes("ANNOUNCER") || s.includes("HOST") || s.includes("COMMENTATOR")) return spritePortrait(scene, "spr_TV_NEWSREADER", 0x2a3a6a) ?? "gen_newsreader";
  if (s === "TAP" || s.includes("GREAT TAP")) return "gen_tap";
  if (s === "ARCHIVE") return "gen_archive";
  if (s.includes("SOVEREIGN") || s.includes("LOOP") || s.includes("MACHINE") || s.includes("AUTOMATON") || s.includes("SPECTRE") || s.includes("BERTHA")) return "gen_boss";
  return spritePortrait(scene, `spr_FOLK${[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 4}`, 0x445544) ?? "gen_folk";
}

// ---------------------------------------------------------------- enemies

function drawEnemy(ctx: Ctx, d: EnemyDef, frame: number, ox: number) {
  const S = d.size;
  const c = d.color;
  const a = d.accent;
  const P = (x: number, y: number, w: number, h: number, col: number) => px(ctx, ox + x, y, w, h, col);
  const bob = frame === 1 ? 1 : 0;
  switch (d.shape) {
    case "fish": {
      P(1, 3 + bob, S - 4, S - 6, c);
      P(S - 4, 2 + bob, 3, S - 4, shade(c, 0.8));
      P(2, 4 + bob, S - 6, 2, shade(c, 1.2));
      P(3, 5 + bob, 2, 2, 0x111111);
      P(S - 3, 1 + bob + frame, 2, 2, shade(c, 0.7));
      break;
    }
    case "mite": {
      P(1, 2 + bob, S - 2, S - 4, c);
      P(0, 3, 1, 1, a);
      P(S - 1, 3, 1, 1, a);
      P(0, S - 3, 1, 1, a);
      P(S - 1, S - 3, 1, 1, a);
      P(2, 3 + bob, 1, 1, 0x111111);
      break;
    }
    case "blob":
    case "bubble": {
      ctx.fillStyle = hex(c);
      ctx.beginPath();
      ctx.arc(ox + S / 2, S / 2 + bob, S / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hex(shade(c, 1.3));
      ctx.fillRect(ox + S / 2 - 3, 3 + bob, 3, 2);
      if (d.shape === "bubble") {
        ctx.fillStyle = hex(0xff3b30);
        ctx.beginPath();
        ctx.arc(ox + S - 3, 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      P(S / 2 - 3, S / 2 + bob, 2, 2, 0x111111);
      P(S / 2 + 1, S / 2 + bob, 2, 2, 0x111111);
      break;
    }
    case "humanoid": {
      P(S / 2 - 3, 1 + bob, 6, 5, shade(c, 1.2));
      P(S / 2 - 2, 3 + bob, 1, 1, 0x111111);
      P(S / 2 + 1, 3 + bob, 1, 1, 0x111111);
      P(S / 2 - 4, 6 + bob, 8, S - 10, c);
      P(S / 2 - 3, S - 4, 2, 4, a);
      P(S / 2 + 1, S - 4 - bob, 2, 4, a);
      P(S / 2 - 6, 7 + bob, 2, 5, c);
      P(S / 2 + 4, 7 + bob, 2, 5, c);
      break;
    }
    case "brute": {
      P(3, 2 + bob, S - 8, 6, shade(c, 1.15));
      P(5, 4 + bob, 2, 2, 0xffee00);
      P(S - 9, 4 + bob, 2, 2, 0xffee00);
      P(2, 8 + bob, S - 6, S - 12, c);
      P(S - 6, 7 + bob, 6, 8, a); // big right arm / cannon
      P(S - 2, 9 + bob, 2, 4, 0x111111);
      P(4, S - 4, 4, 4, shade(c, 0.6));
      P(S - 11, S - 4, 4, 4, shade(c, 0.6));
      break;
    }
    case "box": {
      P(1, 1 + bob, S - 2, S - 2, c);
      P(3, 3 + bob, S - 6, S / 2 - 2, a);
      P(2, S - 4 + bob, S - 4, 2, shade(c, 0.7));
      break;
    }
    case "ghost": {
      ctx.fillStyle = hex(c);
      ctx.beginPath();
      ctx.arc(ox + S / 2, S / 2, S / 2 - 1, Math.PI, 0);
      ctx.fill();
      P(1, S / 2, S - 2, S / 2 - 3, c);
      for (let i = 0; i < S - 2; i += 3) P(1 + i, S - 3 + ((i / 3 + frame) % 2), 2, 2, c);
      P(S / 2 - 3, S / 2 - 2, 2, 3, a);
      P(S / 2 + 1, S / 2 - 2, 2, 3, a);
      break;
    }
    case "page": {
      P(2, 1 + bob, S - 4, S - 2, c);
      for (let y = 4; y < S - 3; y += 3) P(4, y + bob, S - 8, 1, shade(c, 0.6));
      P(S - 5, 1 + bob, 3, 3, shade(c, 0.8));
      break;
    }
    case "drone": {
      ctx.fillStyle = hex(c);
      ctx.beginPath();
      ctx.arc(ox + S / 2, S / 2 + bob, S / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      P(0, 2 + (frame ? 1 : 0), S, 1, a);
      P(S / 2 - 1, S / 2 - 1 + bob, 2, 2, 0x111111);
      break;
    }
  }
  if (d.label) {
    ctx.fillStyle = d.shape === "page" ? "#111111" : "#ffffff";
    ctx.font = `bold ${Math.max(6, Math.floor(S * 0.5))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(d.label, ox + S / 2, S / 2 + 1 + bob);
  }
}

export function generateEnemies(scene: Phaser.Scene) {
  for (const d of Object.values(ENEMIES)) {
    const key = `en_${d.id}`;
    if (scene.textures.exists(key)) continue;
    const [cv, ctx] = canvas(d.size * 2, d.size);
    drawEnemy(ctx, d, 0, 0);
    drawEnemy(ctx, d, 1, d.size);
    addSheet(scene, key, cv, d.size, d.size, 2);
  }
}

// ---------------------------------------------------------------- bosses

function bossCanvas(scene: Phaser.Scene, key: string, w: number, h: number, frames: number, draw: (ctx: Ctx, f: number, ox: number) => void) {
  if (scene.textures.exists(key)) return;
  const [cv, ctx] = canvas(w * frames, h);
  for (let f = 0; f < frames; f++) draw(ctx, f, f * w);
  addSheet(scene, key, cv, w, h, frames);
}

export function generateBosses(scene: Phaser.Scene) {
  bossCanvas(scene, "boss_salmon", 72, 48, 2, (ctx, f, ox) => {
    const P = (x: number, y: number, w: number, h: number, c: number) => px(ctx, ox + x, y, w, h, c);
    P(6, 14 + f, 54, 26, 0xff7f6a);
    P(10, 12 + f, 44, 4, 0xff9a86);
    P(10, 38 + f, 44, 3, 0xd9604e);
    P(58, 10 + f * 2, 12, 34 - f * 2, 0xd9604e);
    P(12, 20 + f, 6, 6, 0xffffff);
    P(14, 22 + f, 3, 3, 0x111111);
    P(6, 30 + f, 10, 2, 0x7a2a20);
    for (let i = 0; i < 6; i++) P(22 + i * 6, 24 + f, 3, 2, 0xff9a86);
    // crown of trays
    P(12, 4 + f, 26, 8, 0xc0c8d0);
    P(12, 1 + f, 4, 4, 0xc0c8d0);
    P(23, 0 + f, 4, 4, 0xc0c8d0);
    P(34, 1 + f, 4, 4, 0xc0c8d0);
    P(14, 7 + f, 22, 2, 0x8a939c);
  });
  bossCanvas(scene, "boss_feedback", 80, 64, 2, (ctx, f, ox) => {
    const circ = (x: number, y: number, r: number, c: number) => {
      ctx.fillStyle = hex(c);
      ctx.beginPath();
      ctx.arc(ox + x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    circ(28, 32, 22 - f, 0x1877f2);
    circ(52, 32, 22 + f - 1, 0xff6f91);
    circ(40, 32, 12, 0xffffff);
    ctx.fillStyle = "#111";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(f ? "?" : "…", ox + 40, 33);
    circ(66, 10, 7, 0xff3b30);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px monospace";
    ctx.fillText("99", ox + 66, 11);
  });
  bossCanvas(scene, "boss_machine", 96, 80, 2, (ctx, f, ox) => {
    const P = (x: number, y: number, w: number, h: number, c: number) => px(ctx, ox + x, y, w, h, c);
    P(14, 20, 68, 56, 0x6b7280);
    P(18, 24, 60, 48, 0x9ca3af);
    P(20, 0 + f * 4, 10, 24, 0x4b5563);
    P(66, 4 - f * 4 + 4, 10, 20, 0x4b5563);
    // gauge
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(ox + 48, 40, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + 48, 40);
    ctx.lineTo(ox + 48 + Math.cos(-0.5 + f) * 10, 40 + Math.sin(-0.5 + f) * 10);
    ctx.stroke();
    P(30, 58, 10, 10, 0xdc2626); // red button
    P(58, 56, 4, 14, 0x111111); // lever
    P(56, 54, 8, 4, 0xfbbf24);
    P(0, 40 + f * 2, 14, 6, 0x4b5563); // reach-around arm
    P(82, 36 - f * 2, 14, 6, 0x4b5563);
    P(40, 74, 16, 6, 0xf5f0dc);
  });
  bossCanvas(scene, "boss_banhammer", 80, 96, 2, (ctx, f, ox) => {
    const P = (x: number, y: number, w: number, h: number, c: number) => px(ctx, ox + x, y, w, h, c);
    P(24, 24, 32, 44, 0x6b7280);
    P(28, 6, 24, 18, 0x9ca3af);
    P(32, 12, 6, 4, 0xff3b30);
    P(42, 12, 6, 4, 0xff3b30);
    P(26, 68, 10, 26, 0x4b5563);
    P(44, 68, 10, 26, 0x4b5563);
    P(56, 28, 8, 24, 0x6b7280);
    // hammer
    P(60, 8 + f * 6, 4, 40, 0x7c2d12);
    P(50, 0 + f * 6, 26, 16, 0xfbbf24);
    P(52, 4 + f * 6, 22, 8, 0x111827);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 6px monospace";
    ctx.fillText("REMOVE", ox + 53, 10 + f * 6);
    P(16, 28, 8, 24, 0x6b7280);
  });
  bossCanvas(scene, "boss_spectre", 72, 80, 2, (ctx, f, ox) => {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(ox + 36, 30, 26, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(ox + 10, 30, 52, 36);
    for (let i = 0; i < 52; i += 8) ctx.fillRect(ox + 10 + i, 66 + ((i / 8 + f) % 2) * 6, 6, 8);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(ox + 24, 24, 6, 10);
    ctx.fillRect(ox + 42, 24, 6, 10);
    ctx.fillStyle = "#94a3b8";
    for (let i = 0; i < 4; i++) ctx.fillRect(ox + 4 + i * 2, 40 + i * 6, 4, 4);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(ox + 20, 2, 32, 6);
    ctx.globalAlpha = 1;
  });
  // Drongus: big humanoid built from his sprite look, phases 0/1 and a glowing Lorelord form
  const L = CHARACTERS.DRONGUS.look;
  bossCanvas(scene, "boss_drongus", 32, 48, 4, (ctx, f, ox) => {
    const [tmp, tctx] = canvas(16, 24);
    drawCharacter(tctx, L, f % 4, 0);
    ctx.drawImage(tmp, 0, 0, 16, 24, ox, 0, 32, 48);
  });
  // Human-shaped bosses built from character looks (32x48, 4 frames: idle, walk, walk, attack)
  const human = (key: string, look: SpriteLook, extra?: (ctx: Ctx, f: number, ox: number) => void) =>
    bossCanvas(scene, key, 32, 48, 4, (ctx, f, ox) => {
      const [tmp, tctx] = canvas(16, 24);
      drawCharacter(tctx, look, f, 0);
      ctx.drawImage(tmp, 0, 0, 16, 24, ox, 0, 32, 48);
      extra?.(ctx, f, ox);
    });
  human("boss_krozno", { skin: 0xd9a77e, hair: 0x111111, hairStyle: "hat", beard: 0x111111, glasses: "shades", top: 0x1f2937, topDetail: 0xfacc15, bottom: 0x111827, shoes: 0x000000, accent: 0xef4444, bulk: 2 }, (ctx, f, ox) => {
    px(ctx, ox + 9, 0, 14, 3, 0x1f3a8a);
    px(ctx, ox + 12, 2, 8, 1, 0xfacc15);
  });
  human("boss_brand", { skin: 0xf1c7a5, hair: 0x111111, hairStyle: "long", beard: 0x111111, glasses: "none", top: 0xf4f4f0, topDetail: 0xf1c7a5, bottom: 0xf4f4f0, shoes: 0xf1c7a5, accent: 0x111111, bulk: 1 });
  human("boss_troll", { skin: 0xe8b896, hair: null, hairStyle: "bald", beard: 0x1a1a1a, glasses: "none", top: 0x5a3a20, topDetail: 0x3b2a1a, bottom: 0x2b2b38, shoes: 0x3b2a1a, bulk: 2 }, (ctx, f, ox) => {
    // sunburst Les Paul
    px(ctx, ox + 6, 26 + (f % 2), 12, 10, 0xb45309);
    px(ctx, ox + 8, 28 + (f % 2), 8, 6, 0xfbbf24);
    px(ctx, ox + 18, 22 + (f % 2), 12, 3, 0x3b2a1a);
    px(ctx, ox + 28, 21 + (f % 2), 4, 5, 0x111111);
  });
  human("boss_flatmate", { skin: 0xf1c7a5, hair: 0x8a5a2a, hairStyle: "short", beard: 0x8a5a2a, glasses: "none", top: 0x6b7280, topDetail: 0x111111, bottom: 0x3b5b8b, shoes: 0xffffff, bulk: 1 }, (ctx, f, ox) => {
    // rolled-up carpet under one arm
    px(ctx, ox + 22, 20, 8, 22, 0x7a1f2b);
    px(ctx, ox + 23, 20, 6, 3, 0xd6c49a);
  });
  human("boss_cronster", { skin: 0xf1c7a5, hair: 0xf9a8d4, hairStyle: "hat", beard: null, glasses: "none", top: 0xf9a8d4, topDetail: 0xffffff, bottom: 0xec4899, shoes: 0x7c2d12, accent: 0x7c2d12, bulk: 2 }, (ctx, f, ox) => {
    // balaclava with a smiley, and open arms for cuddles
    px(ctx, ox + 10, 2, 12, 10, 0xf9a8d4);
    px(ctx, ox + 13, 5, 2, 2, 0x111111);
    px(ctx, ox + 18, 5, 2, 2, 0x111111);
    px(ctx, ox + 13, 9, 7, 1, 0x111111);
    px(ctx, ox + 0, 18 - (f % 2) * 2, 6, 3, 0xf9a8d4);
    px(ctx, ox + 26, 18 - (f % 2) * 2, 6, 3, 0xf9a8d4);
  });
  human("npc_swig", { skin: 0xf1c7a5, hair: 0x5a3a1a, hairStyle: "hat", beard: 0x5a3a1a, glasses: "none", top: 0x1e3a8a, topDetail: 0xfacc15, bottom: 0x111827, shoes: 0x000000, accent: 0xffffff, bulk: 2 }, (ctx, _f, ox) => {
    px(ctx, ox + 9, 0, 14, 4, 0x111827);
    px(ctx, ox + 14, 1, 4, 2, 0xfacc15);
  });
  human("npc_journo", { skin: 0xd9a77e, hair: 0x111111, hairStyle: "long", beard: null, glasses: "round", top: 0x6d8f4f, topDetail: 0xffffff, bottom: 0x3b3b5a, shoes: 0x222222, bulk: 1 });
  human("boss_rival", { skin: 0xd97706, hair: null, hairStyle: "bald", beard: null, glasses: "shades", top: 0x111111, topDetail: 0xd97706, bottom: 0x1f2937, shoes: 0xffffff, accent: 0xffffff, bulk: 2 });
  bossCanvas(scene, "boss_lorelord", 64, 80, 2, (ctx, f, ox) => {
    const [tmp, tctx] = canvas(16, 24);
    const LL: SpriteLook = { ...L, skin: 0xffe27a, top: 0x6d28d9, topDetail: 0xffd23f, bottom: 0x4c1d95, beard: 0xffb703, accent: 0xffffff, bulk: 2 };
    drawCharacter(tctx, LL, f ? 3 : 0, 0);
    ctx.fillStyle = "rgba(255,210,63,0.35)";
    ctx.beginPath();
    ctx.arc(ox + 32, 40, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(tmp, 0, 0, 16, 24, ox + 8, 4, 48, 72);
  });
}

// ---------------------------------------------------------------- tiles & props

const THEMES: Record<string, [number, number, number]> = {
  school: [0xc9c2a8, 0xb7af93, 0x6b5b4b],
  mansion: [0x7a5230, 0x6b4527, 0x3b2a1a],
  network: [0x14213d, 0x1b2b50, 0x1877f2],
  industrial: [0x4b5563, 0x404854, 0xd97706],
  temple: [0x8a7a5a, 0x7f6f50, 0x6f5f40],
  prison: [0x3a3f4a, 0x323640, 0x111827],
  wiki: [0xf8f9fa, 0xeaecf0, 0x3366cc],
  grass: [0x5b8a3a, 0x52803a, 0x3d6a2a],
  cobble: [0x9a9488, 0x8a8478, 0x6a645a],
  road: [0x6a645a, 0x625c52, 0x4a4540],
  pub: [0x5a3a20, 0x4f321b, 0x2a1a0a],
  hall: [0x6b2737, 0x5f2230, 0xd4a017],
};

export function generateTiles(scene: Phaser.Scene) {
  for (const [name, [a, b, c]] of Object.entries(THEMES)) {
    const key = `tile_${name}`;
    if (scene.textures.exists(key)) continue;
    const [cv, ctx] = canvas(32, 32);
    px(ctx, 0, 0, 32, 32, a);
    if (name === "school") {
      px(ctx, 0, 0, 16, 16, b);
      px(ctx, 16, 16, 16, 16, b);
    } else if (name === "mansion" || name === "pub") {
      for (let y = 0; y < 32; y += 8) {
        px(ctx, 0, y, 32, 1, c);
        px(ctx, (y * 3) % 32, y, 1, 8, c);
      }
    } else if (name === "network") {
      px(ctx, 0, 0, 32, 1, b);
      px(ctx, 0, 0, 1, 32, b);
      px(ctx, 15, 15, 2, 2, c);
    } else if (name === "industrial") {
      px(ctx, 0, 0, 32, 2, b);
      px(ctx, 0, 0, 2, 32, b);
      px(ctx, 4, 4, 2, 2, 0x9ca3af);
      px(ctx, 26, 26, 2, 2, 0x9ca3af);
    } else if (name === "wiki") {
      for (let y = 4; y < 32; y += 6) px(ctx, 3, y, 22 - (y % 5) * 2, 1, b);
    } else if (name === "grass") {
      for (let i = 0; i < 14; i++) px(ctx, (i * 7) % 31, (i * 13) % 31, 1, 2, i % 2 ? b : c);
    } else if (name === "hall") {
      px(ctx, 0, 0, 32, 32, a);
      px(ctx, 2, 2, 28, 28, b);
      px(ctx, 15, 0, 2, 32, shade(a, 0.9));
    } else {
      px(ctx, 0, 0, 15, 15, b);
      px(ctx, 17, 17, 15, 15, b);
      px(ctx, 16, 0, 1, 32, c);
      px(ctx, 0, 16, 32, 1, c);
    }
    addImage(scene, key, cv);
  }
}

function prop(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx, P: (x: number, y: number, w: number, h: number, c: number) => void) => void) {
  if (scene.textures.exists(key)) return;
  const [cv, ctx] = canvas(w, h);
  draw(ctx, (x, y, ww, hh, c) => px(ctx, x, y, ww, hh, c));
  addImage(scene, key, cv);
}

export function generateProps(scene: Phaser.Scene) {
  prop(scene, "p_kreltower", 60, 200, (ctx, P) => {
    P(10, 20, 40, 180, 0x9ca3af);
    P(14, 24, 32, 172, 0xb0b8c4);
    for (let y = 30; y < 190; y += 10) for (let x = 17; x < 44; x += 7) P(x, y, 4, 5, (x + y) % 3 ? 0x1e3a5f : 0xffe08a);
    P(26, 0, 8, 20, 0x6b7280);
    P(29, 0, 2, 4, 0xef4444);
  });
  prop(scene, "p_rubble", 120, 60, (ctx, P) => {
    for (let i = 0; i < 40; i++) P((i * 37) % 110, 20 + ((i * 13) % 36), 10 + (i % 4) * 3, 8 + (i % 3) * 3, [0x6b7280, 0x9ca3af, 0x4b5563][i % 3]);
    P(50, 0, 6, 30, 0x6b7280);
  });
  prop(scene, "p_plane", 64, 24, (ctx, P) => {
    P(4, 9, 56, 8, 0xe5e7eb);
    P(56, 10, 8, 6, 0x9ca3af);
    P(26, 0, 10, 24, 0xd1d5db);
    P(2, 4, 8, 8, 0xd1d5db);
    for (let x = 14; x < 54; x += 5) P(x, 11, 2, 2, 0x1e3a5f);
    P(6, 13, 50, 1, 0xef4444);
  });
  prop(scene, "p_barbell", 80, 20, (ctx, P) => {
    P(0, 9, 80, 3, 0x9ca3af);
    P(4, 0, 10, 20, 0x111111);
    P(66, 0, 10, 20, 0x111111);
    P(14, 3, 6, 14, 0x374151);
    P(60, 3, 6, 14, 0x374151);
  });
  prop(scene, "p_token", 14, 14, (ctx, P) => {
    P(2, 0, 10, 14, 0x7c2d12);
    P(0, 2, 14, 10, 0x7c2d12);
    P(3, 2, 8, 10, 0xa0522d);
    P(5, 5, 4, 4, 0xf9a8d4);
  });
  prop(scene, "p_tree", 48, 64, (ctx, P) => {
    P(20, 36, 8, 28, 0x6b4527);
    P(6, 8, 36, 30, 0x2f5a22);
    P(12, 2, 24, 10, 0x3d7a2c);
    P(10, 12, 8, 6, 0x4a8a3a);
  });
  prop(scene, "p_food", 60, 24, (ctx, P) => {
    // burger, pizza slice, fudge
    P(0, 6, 18, 4, 0xd97706); P(0, 10, 18, 3, 0x16a34a); P(0, 13, 18, 4, 0x7c2d12); P(0, 17, 18, 4, 0xd97706);
    P(22, 4, 16, 16, 0xfbbf24); P(24, 6, 12, 12, 0xef4444); P(27, 9, 3, 3, 0xfbbf24);
    P(42, 8, 16, 12, 0x5a3a1a); P(44, 10, 4, 4, 0x7c4a2a);
  });
  prop(scene, "p_phone", 20, 34, (ctx, P) => {
    P(0, 0, 20, 34, 0x111111);
    P(2, 3, 16, 26, 0x1f2937);
    P(8, 30, 4, 2, 0x6b7280);
  });
  prop(scene, "p_tap", 48, 64, (ctx, P) => {
    P(4, 48, 40, 14, 0x9a8a6a);
    P(8, 44, 32, 6, 0xb5a585);
    P(8, 50, 32, 8, 0xffb6c1);
    P(20, 8, 8, 40, 0xb08d57);
    P(10, 6, 28, 6, 0xb08d57);
    P(8, 10, 6, 6, 0xb08d57);
    P(9, 16, 4, 6, 0xffb6c1);
    P(18, 0, 12, 8, 0xd4a017);
  });
  prop(scene, "p_tv", 22, 20, (ctx, P) => {
    P(0, 0, 22, 16, 0x3a2a1a);
    P(2, 2, 15, 12, 0x88aaff);
    P(3, 3, 6, 2, 0xddeeff);
    P(18, 3, 3, 2, 0xd4a017);
    P(18, 7, 3, 2, 0xd4a017);
    P(4, 16, 3, 4, 0x2a1a0a);
    P(15, 16, 3, 4, 0x2a1a0a);
  });
  prop(scene, "p_vending", 20, 32, (ctx, P) => {
    P(0, 0, 20, 32, 0xff4fa3);
    P(2, 2, 12, 20, 0x2a0a1a);
    for (let y = 4; y < 20; y += 5) for (let x = 3; x < 13; x += 4) P(x, y, 3, 3, [0xffb6c1, 0x7cf, 0xfd0][(x + y) % 3]);
    P(15, 6, 3, 6, 0xffffff);
    P(3, 25, 14, 4, 0x111111);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 6px monospace";
    ctx.fillText("PJ", 14, 31);
  });
  prop(scene, "p_wonking", 40, 44, (ctx, P) => {
    P(2, 8, 36, 34, 0x6b7280);
    P(5, 11, 30, 28, 0x9ca3af);
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(20, 20, 7, 0, Math.PI * 2);
    ctx.fill();
    P(20, 15, 1, 6, 0xdc2626);
    P(8, 30, 6, 6, 0xdc2626);
    P(30, 2, 3, 20, 0x111111);
    P(28, 0, 7, 4, 0xfbbf24);
    P(14, 38, 12, 4, 0xf5f0dc);
    P(0, 20, 3, 4, 0x4b5563);
  });
  prop(scene, "p_valve", 20, 20, (ctx, P) => {
    P(8, 0, 4, 20, 0x4b5563);
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(10, 10, 7, 0, Math.PI * 2);
    ctx.stroke();
    P(9, 3, 2, 14, 0xdc2626);
    P(3, 9, 14, 2, 0xdc2626);
  });
  prop(scene, "p_valve_open", 20, 20, (ctx, P) => {
    P(8, 0, 4, 20, 0x4b5563);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(10, 10, 7, 0, Math.PI * 2);
    ctx.stroke();
    P(4, 4, 12, 2, 0x22c55e);
    P(4, 14, 12, 2, 0x22c55e);
  });
  prop(scene, "p_terminal", 28, 32, (ctx, P) => {
    P(4, 14, 20, 18, 0x334155);
    P(0, 0, 28, 16, 0x1e293b);
    P(2, 2, 24, 12, 0x0f766e);
    ctx.fillStyle = "#fff";
    ctx.font = "8px sans-serif";
    ctx.fillText("👍", 9, 11);
  });
  prop(scene, "p_board", 36, 28, (ctx, P) => {
    P(0, 0, 36, 24, 0x7a5230);
    P(2, 2, 32, 20, 0xd6c49a);
    P(5, 5, 8, 6, 0xffffff);
    P(20, 6, 9, 7, 0xffd23f);
    P(8, 14, 10, 5, 0xffffff);
    ctx.strokeStyle = "#c00";
    ctx.beginPath();
    ctx.moveTo(9, 8);
    ctx.lineTo(24, 9);
    ctx.lineTo(13, 16);
    ctx.stroke();
    P(4, 24, 3, 4, 0x3b2a1a);
    P(29, 24, 3, 4, 0x3b2a1a);
  });
  prop(scene, "p_fridge", 22, 36, (ctx, P) => {
    P(0, 0, 22, 36, 0xe5e7eb);
    P(0, 12, 22, 1, 0x9ca3af);
    P(17, 4, 2, 6, 0x6b7280);
    P(17, 16, 2, 10, 0x6b7280);
    P(5, 4, 3, 3, 0x111111);
    P(11, 4, 3, 3, 0x111111);
  });
  prop(scene, "p_bertha", 34, 36, (ctx, P) => {
    P(2, 6, 30, 28, 0x7a6a50);
    P(5, 9, 24, 22, 0x9a8a6a);
    P(10, 14, 8, 8, 0xe5e7eb);
    P(13, 15, 1, 4, 0xdc2626);
    P(22, 0, 3, 14, 0x3a2a1a);
    for (let i = 0; i < 8; i++) P(4 + i * 3, 28 + (i % 2), 2, 2, 0xf5f0dc);
  });
  prop(scene, "p_sign", 40, 20, (ctx, P) => {
    P(0, 0, 40, 14, 0x7a5230);
    P(2, 2, 36, 10, 0xd6c49a);
    P(18, 14, 4, 6, 0x3b2a1a);
  });
  prop(scene, "p_door", 40, 12, (ctx, P) => {
    P(0, 0, 40, 12, 0x222222);
    P(2, 2, 36, 8, 0x5ad35a);
  });
  prop(scene, "p_door_locked", 40, 12, (ctx, P) => {
    P(0, 0, 40, 12, 0x222222);
    P(2, 2, 36, 8, 0xb91c1c);
  });
  prop(scene, "p_scroll", 14, 14, (ctx, P) => {
    P(1, 3, 12, 8, 0xfef3c7);
    P(0, 2, 3, 10, 0xd4a017);
    P(11, 2, 3, 10, 0xd4a017);
    P(4, 5, 6, 1, 0x7a5230);
    P(4, 8, 5, 1, 0x7a5230);
  });
  prop(scene, "p_coin", 8, 8, (ctx, P) => {
    P(1, 0, 6, 8, 0xd4a017);
    P(0, 1, 8, 6, 0xd4a017);
    P(3, 2, 2, 4, 0xfff1a8);
  });
  prop(scene, "p_krezz", 8, 8, (ctx, P) => {
    P(2, 0, 4, 8, 0xc084fc);
    P(0, 2, 8, 4, 0xc084fc);
    P(3, 2, 2, 3, 0xffffff);
  });
  prop(scene, "p_bottle", 8, 12, (ctx, P) => {
    P(3, 0, 2, 3, 0xd4d4d4);
    P(1, 3, 6, 9, 0xffb6c1);
    P(2, 5, 2, 4, 0xffe4ec);
  });
  prop(scene, "p_bongo", 8, 12, (ctx, P) => {
    P(3, 0, 2, 2, 0xc0c0c0);
    P(2, 2, 4, 2, 0x8a5a2a);
    P(1, 4, 6, 8, 0xc6862a);
    P(2, 6, 4, 3, 0xffffff);
  });
  prop(scene, "p_crobley", 10, 8, (ctx, P) => {
    P(0, 2, 10, 5, 0xc8873a);
    P(1, 1, 8, 1, 0xe0a35a);
    P(2, 3, 2, 1, 0x7a4a1a);
    P(6, 4, 2, 1, 0x7a4a1a);
  });
  prop(scene, "p_bed", 32, 20, (ctx, P) => {
    P(0, 4, 32, 16, 0x7a5230);
    P(2, 6, 28, 12, 0x3b6cff);
    P(2, 6, 8, 6, 0xffffff);
  });
  prop(scene, "p_table", 48, 28, (ctx, P) => {
    P(0, 4, 48, 14, 0x6b4527);
    P(2, 6, 44, 10, 0x8a5a33);
    P(4, 18, 4, 10, 0x3b2a1a);
    P(40, 18, 4, 10, 0x3b2a1a);
  });
  prop(scene, "p_pipe", 32, 12, (ctx, P) => {
    P(0, 2, 32, 8, 0x9ca3af);
    P(0, 2, 32, 2, 0xd1d5db);
    P(6, 0, 4, 12, 0x6b7280);
    P(22, 0, 4, 12, 0x6b7280);
  });
  prop(scene, "p_puddle", 30, 14, (ctx) => {
    ctx.fillStyle = "rgba(255,182,193,0.8)";
    ctx.beginPath();
    ctx.ellipse(15, 7, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  prop(scene, "p_bin", 14, 18, (ctx, P) => {
    P(1, 3, 12, 15, 0x2f6b3a);
    P(0, 0, 14, 4, 0x245a2f);
    P(4, 8, 2, 2, 0xffffff);
    P(8, 8, 2, 2, 0xffffff);
  });
  prop(scene, "p_pigeon", 12, 10, (ctx, P) => {
    P(2, 3, 8, 6, 0x8a8f9a);
    P(8, 1, 4, 4, 0x6a6f7a);
    P(11, 3, 1, 1, 0xffa500);
    P(9, 2, 1, 1, 0x111111);
    P(0, 0, 9, 3, 0xffffff);
  });
  // particles
  prop(scene, "fx_dot", 4, 4, (ctx, P) => P(0, 0, 4, 4, 0xffffff));
  prop(scene, "fx_ring", 64, 64, (ctx) => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.stroke();
  });
  prop(scene, "fx_circle", 64, 64, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(32, 32, 31, 0, Math.PI * 2);
    ctx.fill();
  });
  prop(scene, "fx_slash", 48, 48, (ctx) => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(10, 24, 30, -0.9, 0.9);
    ctx.stroke();
  });
  prop(scene, "fx_bullet", 8, 8, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(4, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
  prop(scene, "fx_flask", 10, 10, (ctx, P) => {
    P(4, 0, 2, 3, 0xd4d4d4);
    P(1, 3, 8, 7, 0x22c55e);
    P(2, 4, 2, 2, 0xbbf7d0);
  });
  prop(scene, "fx_paper", 12, 10, (ctx, P) => {
    P(0, 0, 12, 10, 0xf5f5f4);
    P(1, 2, 10, 1, 0x111111);
    P(1, 5, 8, 1, 0x777777);
    P(1, 7, 9, 1, 0x777777);
  });
  prop(scene, "fx_turret", 18, 18, (ctx, P) => {
    P(2, 8, 14, 10, 0x6b7280);
    P(5, 2, 8, 8, 0xe0902a);
    P(12, 5, 6, 3, 0x111111);
    P(0, 5, 6, 3, 0x111111);
  });
}

export function generateAll(scene: Phaser.Scene) {
  generateCharacters(scene);
  generatePortraits(scene);
  generateEnemies(scene);
  generateBosses(scene);
  generateTiles(scene);
  generateProps(scene);
}
