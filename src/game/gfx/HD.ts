import Phaser from "phaser";

/**
 * PixelLab art support.
 *
 * Generated art lives in public/art and is listed in public/art/manifest.json. It is loaded
 * under the same texture keys as the old procedural art, so every scene picks it up.
 *
 * The new sprites are bigger than the old ones (e.g. 64x64 characters vs 16x24). Each texture
 * can carry `customData.hd`, a factor applied when scale is SET (setScale / scaleX = ...), so
 * existing code like `setScale(2)` keeps working and draws the new art at native size. Reading
 * scaleX returns the real scale. Tweens on scale should use scaleOf()/hdScale() below.
 */

export interface CharMeta {
  frame: number;
  idle: Record<string, number>;
  walk: Record<string, number[]>;
  attack?: Record<string, number[]>;
}

export interface ArtManifest {
  chars: Record<string, { file: string } & CharMeta>;
  images: Record<string, { file: string; hd?: number }>;
}

const hdOf = (o: { texture?: Phaser.Textures.Texture }) => (o.texture?.customData as { hd?: number } | undefined)?.hd ?? 1;

let installed = false;
export function installHdScale() {
  if (installed) return;
  installed = true;
  for (const C of [Phaser.GameObjects.Sprite, Phaser.GameObjects.Image, Phaser.GameObjects.TileSprite] as unknown as { prototype: object }[]) {
    for (const prop of ["scaleX", "scaleY"]) {
      let proto: object | null = C.prototype;
      let d: PropertyDescriptor | undefined;
      while (proto && !(d = Object.getOwnPropertyDescriptor(proto, prop))) proto = Object.getPrototypeOf(proto);
      if (!d?.get || !d.set) continue;
      const get = d.get;
      const set = d.set;
      Object.defineProperty(C.prototype, prop, {
        configurable: true,
        // reads return the real scale (the renderer and physics read it); writes apply the factor
        get(this: { texture?: Phaser.Textures.Texture }) {
          return get.call(this);
        },
        set(this: { texture?: Phaser.Textures.Texture }, v: number) {
          set.call(this, v * hdOf(this));
        },
      });
    }
    for (const prop of ["displayWidth", "displayHeight"]) {
      let proto: object | null = C.prototype;
      let d: PropertyDescriptor | undefined;
      while (proto && !(d = Object.getOwnPropertyDescriptor(proto, prop))) proto = Object.getPrototypeOf(proto);
      if (!d?.get || !d.set) continue;
      const get = d.get;
      const set = d.set;
      Object.defineProperty(C.prototype, prop, {
        configurable: true,
        get(this: { texture?: Phaser.Textures.Texture }) {
          return get.call(this);
        },
        // the original setter assigns scaleX/Y, which now multiplies by hd; undo that
        set(this: { texture?: Phaser.Textures.Texture }, v: number) {
          set.call(this, v / hdOf(this));
        },
      });
    }
  }
}

export function charMeta(scene: Phaser.Scene, key: string): CharMeta | null {
  if (!scene.textures.exists(key)) return null;
  return ((scene.textures.get(key).customData as { char?: CharMeta }).char ?? null) as CharMeta | null;
}

export type Facing = "south" | "east" | "north" | "west";

export function facingFrom(dx: number, dy: number, prev: Facing = "south"): Facing {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return prev;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "east" : "west";
  return dy > 0 ? "south" : "north";
}

/**
 * Animate a walking character. Works with both art styles: PixelLab sheets get 4-direction
 * walk cycles; the old procedural sprites flip and alternate frames 1/2 as before.
 */
export function animateWalker(spr: Phaser.GameObjects.Sprite, dx: number, dy: number, moving: boolean, now: number) {
  const meta = charMeta(spr.scene, spr.texture.key);
  const prev = (spr.getData("facing") as Facing) ?? "south";
  if (!meta) {
    if (moving) {
      if (Math.abs(dx) > 0.1) spr.setFlipX(dx < 0);
      spr.setFrame(Math.floor(now / 160) % 2 ? 1 : 2);
    } else spr.setFrame(0);
    return;
  }
  const f = moving ? facingFrom(dx, dy, prev) : prev;
  spr.setData("facing", f);
  spr.setFlipX(false);
  if (moving) {
    const cyc = meta.walk[f] ?? meta.walk.south;
    spr.setFrame(cyc[Math.floor(now / 100) % cyc.length]);
  } else spr.setFrame(meta.idle[f] ?? 0);
}

/** Attack pose for the current facing (old sprites: frame 3). */
export function attackFrame(spr: Phaser.GameObjects.Sprite, t = 0.5): number {
  const meta = charMeta(spr.scene, spr.texture.key);
  if (!meta?.attack) return 3;
  const f = (spr.getData("facing") as Facing) ?? "south";
  const cyc = meta.attack[f] ?? meta.attack.east ?? meta.attack.south;
  if (!cyc) return 3;
  return cyc[Math.min(cyc.length - 1, Math.floor(t * cyc.length))];
}

/**
 * Put an arcade body at a sprite's feet: w x h in world pixels, its bottom `feet` px below the
 * sprite's centre. Independent of art style and scale.
 */
export function feetBody(spr: Phaser.Physics.Arcade.Sprite, w: number, h: number, feet: number) {
  const body = spr.body as Phaser.Physics.Arcade.Body;
  const sx = Math.abs(spr.scaleX) || 1;
  const sy = Math.abs(spr.scaleY) || 1;
  body.setSize(w / sx, h / sy, false);
  body.setOffset(spr.displayOriginX - w / sx / 2, spr.displayOriginY + (feet - h) / sy);
  return body;
}

/** The factor a texture's scale writes are multiplied by (1 for old art). */
export function hdFactor(o: { texture?: Phaser.Textures.Texture }) {
  return hdOf(o);
}
