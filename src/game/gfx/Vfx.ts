import Phaser from "phaser";

/**
 * Drawn pixel-art effects (PixelLab VFX sheets in public/art/vfx): explosions, blood, gore, fire, smoke, hits.
 * The art manifest's "vfx" section lists them; BootScene loads the sheets and builds an animation for each.
 */

export interface VfxDef {
  file: string;
  w: number;
  h: number;
  frames: number;
  fps: number;
  loop: boolean;
  /** the effect's origin as a fraction of the frame (where it "happens") */
  ox: number;
  oy: number;
}

const DEFS: Record<string, VfxDef> = {};

/** Called from BootScene's preload once the manifest arrives. */
export function loadVfx(load: Phaser.Loader.LoaderPlugin, defs: Record<string, VfxDef> | undefined, src: (f: string) => string) {
  for (const [key, d] of Object.entries(defs ?? {})) {
    DEFS[key] = d;
    load.spritesheet(key, src(d.file), { frameWidth: d.w, frameHeight: d.h });
  }
}

/** Called from BootScene's create: one animation per effect. */
export function makeVfxAnims(scene: Phaser.Scene) {
  for (const [key, d] of Object.entries(DEFS)) {
    if (!scene.textures.exists(key) || scene.anims.exists(key)) continue;
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: d.frames - 1 }), frameRate: d.fps, repeat: d.loop ? -1 : 0 });
  }
}

export function hasVfx(scene: Phaser.Scene, key: string) {
  return !!DEFS[key] && scene.textures.exists(key) && scene.anims.exists(key);
}

export interface VfxOpts {
  /** size multiplier (the sheets are drawn at roughly game scale) */
  scale?: number;
  depth?: number;
  angle?: number;
  flipX?: boolean;
  /** play speed multiplier */
  speed?: number;
  /** keep the last frame on screen instead of removing the effect (blood pools, scorch) */
  hold?: boolean;
  /** pinned to the camera (UI-space effects) */
  fixed?: boolean;
  alpha?: number;
  tint?: number;
  delay?: number;
  /** blend additively (fire, sparks, flashes) */
  add?: boolean;
  /** called when a one-shot finishes */
  done?: () => void;
}

/**
 * Play an effect at (x, y). One-shots remove themselves when they end (unless `hold`); loops run until you destroy them.
 * Returns null if the effect isn't loaded, so callers can fall back to something simpler.
 */
export function vfx(scene: Phaser.Scene, key: string, x: number, y: number, o: VfxOpts = {}): Phaser.GameObjects.Sprite | null {
  const d = DEFS[key];
  if (!d || !hasVfx(scene, key)) return null;
  const s = scene.add.sprite(x, y, key, 0).setOrigin(d.ox, d.oy);
  // HD sheets get scaled down by the global HD patch: these aren't HD, so set the scale straight
  s.setScale(o.scale ?? 1);
  s.setDepth(o.depth ?? y + 50);
  if (o.angle) s.setAngle(o.angle);
  if (o.flipX) s.setFlipX(true);
  if (o.fixed) s.setScrollFactor(0);
  if (o.alpha !== undefined) s.setAlpha(o.alpha);
  if (o.tint !== undefined) s.setTint(o.tint);
  if (o.add) s.setBlendMode(Phaser.BlendModes.ADD);
  const start = () => {
    if (!s.active) return;
    s.setVisible(true);
    s.play({ key, timeScale: o.speed ?? 1 });
    if (!d.loop)
      s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        o.done?.();
        if (!o.hold) s.destroy();
      });
  };
  if (o.delay) {
    s.setVisible(false);
    scene.time.delayedCall(o.delay, start);
  } else start();
  return s;
}

/** Several of an effect scattered round a point (a big explosion made of smaller ones, a spray of blood). */
export function vfxScatter(scene: Phaser.Scene, key: string, x: number, y: number, n: number, spread: number, o: VfxOpts = {}, gap = 90) {
  const out: Phaser.GameObjects.Sprite[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * spread;
    const s = vfx(scene, key, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, { ...o, delay: (o.delay ?? 0) + i * gap, scale: (o.scale ?? 1) * (0.75 + Math.random() * 0.5), flipX: Math.random() < 0.5 });
    if (s) out.push(s);
  }
  return out;
}
