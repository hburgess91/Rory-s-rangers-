import Phaser from "phaser";

/**
 * Where the censor bar goes on each lad's wonk loop.
 *
 * Every wonk row is drawn the same way: his right forearm angles down from the elbow to the crotch, and the
 * hand goes up and down there. The bar must cover the hand and the crotch on every frame but leave the
 * forearm showing, so it reads as him going at it under the bar. `bar` is that box in frame pixels
 * (x0, y0, x1, y1; x1/y1 exclusive) of the 64x64 sheet frame, shared by all eight frames (the hand's
 * stroke and the 1px body bob stay inside it). Not every entry is a 64px lad sheet (see boss_dark_drongus).
 */
export const WONK_ART: Record<string, { frames: number[]; bar: [number, number, number, number] }> = {
  spr_KREZMAR: { frames: range(96), bar: [20, 45, 38, 52] },
  spr_FLENKY: { frames: range(96), bar: [21, 46, 39, 53] },
  spr_KREZWONK: { frames: range(96), bar: [21, 47, 39, 54] },
  spr_GRONNY: { frames: range(96), bar: [21, 48, 39, 55] },
  spr_KREBON: { frames: range(96), bar: [21, 47, 39, 54] },
  spr_SCROMBUS: { frames: range(96), bar: [21, 46, 39, 53] },
  spr_CRONGUS: { frames: range(96), bar: [20, 45, 38, 52] },
  spr_MIKEY: { frames: range(96), bar: [21, 48, 39, 55] },
  spr_KREBLIS: { frames: range(96), bar: [21, 46, 39, 53] },
  // Polson's sheet had no wonk row; it is the 7th row (frames 48-55), registered in BootScene
  spr_POLSON: { frames: range(48), bar: [21, 49, 39, 56] },
  // SanMik (Mikey's alter ego): the 8th row (frames 56-63), drawn from his south idle pose
  spr_SANMIK: { frames: range(56), bar: [23, 49, 41, 56] },
  // Dark Drongus's boss sheet (128x128 frames): his wonk is the second row (DarkDrongus.ts DD_WONK_F)
  boss_dark_drongus: { frames: range(16), bar: [42, 84, 86, 104] },
};

function range(start: number) {
  return Array.from({ length: 8 }, (_, i) => start + i);
}

/** For a sprite with no wonk art (a stand-in wrist goes under it): a generic box over the groin. */
const GENERIC: [number, number, number, number] = [19, 43, 45, 56];

type Spr = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

/**
 * The censor bar's box for this sprite, in the coordinates of whatever the sprite is in (scene or container).
 * `pad` grows it by that many frame pixels on each side (for jiggling sprites).
 */
export function censorRect(spr: Spr, pad = 0) {
  const art = WONK_ART[spr.texture.key];
  let [x0, y0, x1, y1] = art?.bar ?? GENERIC;
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  const fw = spr.frame.width;
  if (spr.flipX) [x0, x1] = [fw - x1, fw - x0];
  const sx = Math.abs(spr.scaleX);
  const sy = Math.abs(spr.scaleY);
  const left = spr.x + (x0 - spr.displayOriginX) * sx;
  const top = spr.y + (y0 - spr.displayOriginY) * sy;
  const w = (x1 - x0) * sx;
  const h = (y1 - y0) * sy;
  return { x: left + w / 2, y: top + h / 2, w, h, top, bottom: top + h, left, right: left + w };
}

export interface CensorBar {
  obj: Phaser.GameObjects.Container;
  /** Put it back over the sprite (call after the sprite moves or rescales). */
  follow(): void;
  destroy(): void;
}

/**
 * A black CENSORED bar that sits over this sprite's groin (per lad: see WONK_ART). Add it to the same
 * container as the sprite, after it. It follows the sprite when you call follow().
 */
export function addCensorBar(scene: Phaser.Scene, spr: Spr, o: { pad?: number; text?: string } = {}): CensorBar {
  const c = scene.add.container(0, 0);
  const rect = scene.add.rectangle(0, 0, 10, 10, 0x000000);
  const txt = scene.add.text(0, 0, o.text ?? "CENSORED", { fontFamily: "Impact, sans-serif", fontSize: "20px", color: "#ffffff" }).setOrigin(0.5);
  c.add([rect, txt]);
  let lastW = -1;
  let lastH = -1;
  const follow = () => {
    const r = censorRect(spr, o.pad ?? 0);
    c.setPosition(r.x, r.y);
    if (r.w !== lastW || r.h !== lastH) {
      lastW = r.w;
      lastH = r.h;
      rect.setSize(r.w, r.h);
      rect.setDisplayOrigin(r.w / 2, r.h / 2);
      txt.setFontSize(Math.max(8, Math.round(r.h * 0.62)));
      txt.setScale(Math.min(1, (r.w * 0.9) / Math.max(1, txt.width)));
    }
  };
  follow();
  return {
    obj: c,
    follow,
    destroy: () => c.destroy(),
  };
}
