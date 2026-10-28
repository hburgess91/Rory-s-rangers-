import Phaser from 'phaser';
import { getSettings } from './settings';
import { clean } from './lang';

export const FONT = '"Trebuchet MS", "Arial Black", Verdana, sans-serif';
export const MONO = '"Courier New", Courier, monospace';

export function textStyle(size: number, color = '#ffffff', stroke = '#120c16', thickness = 4): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, color, stroke, strokeThickness: thickness, fontStyle: 'bold', align: 'center' };
}

// Short-lived visual effects. Each effect cleans itself up; a cap stops runaway spam.
export class Fx {
  private live = 0;
  constructor(private scene: Phaser.Scene) {}

  private budget() {
    return this.live < 160;
  }

  sparks(x: number, y: number, color = 0xffffff, n = 6, speed = 120, tex = 'fx_px') {
    for (let i = 0; i < n && this.budget(); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      const img = this.scene.add.image(x, y, tex).setTint(color).setDepth(60);
      this.live++;
      this.scene.tweens.add({
        targets: img, x: x + Math.cos(a) * s * 0.35, y: y + Math.sin(a) * s * 0.35 + 6, alpha: 0, scale: 0.4,
        duration: 260 + Math.random() * 200, onComplete: () => { img.destroy(); this.live--; },
      });
    }
  }

  burst(x: number, y: number, tex: string, opts: { scale?: number; duration?: number; tint?: number; depth?: number; endScale?: number; alpha?: number } = {}) {
    if (!this.budget()) return null;
    const img = this.scene.add.image(x, y, tex).setScale(opts.scale ?? 1).setDepth(opts.depth ?? 61).setAlpha(opts.alpha ?? 1);
    if (opts.tint !== undefined) img.setTint(opts.tint);
    this.live++;
    this.scene.tweens.add({ targets: img, scale: opts.endScale ?? (opts.scale ?? 1) * 1.8, alpha: 0, duration: opts.duration ?? 260, onComplete: () => { img.destroy(); this.live--; } });
    return img;
  }

  dust(x: number, y: number, n = 4) {
    for (let i = 0; i < n && this.budget(); i++) {
      const img = this.scene.add.image(x + (Math.random() - 0.5) * 14, y - 2, 'fx_px').setTint(0xd8cfc0).setScale(2).setDepth(39);
      this.live++;
      this.scene.tweens.add({ targets: img, y: y - 8 - Math.random() * 8, x: img.x + (Math.random() - 0.5) * 20, alpha: 0, duration: 300, onComplete: () => { img.destroy(); this.live--; } });
    }
  }

  pop(x: number, y: number, text: string, color = '#ffffff', size = 12, rise = 26, duration = 900) {
    const t = this.scene.add.text(x, y, clean(text), textStyle(size, color, '#120c16', 3)).setOrigin(0.5).setDepth(90);
    this.scene.tweens.add({ targets: t, y: y - rise, duration, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: duration * 0.6, duration: duration * 0.4, onComplete: () => t.destroy() });
    return t;
  }

  flash(obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, ms = 70, color = 0xffffff) {
    obj.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => {
      if (obj.active) obj.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  shake(duration = 120, intensity = 0.006) {
    if (!getSettings().screenShake) return;
    this.scene.cameras.main.shake(duration, intensity);
  }

  screenFlash(ms = 120, r = 255, g = 255, b = 255) {
    if (!getSettings().screenShake) { this.scene.cameras.main.flash(ms, r, g, b, false); return; }
    this.scene.cameras.main.flash(ms, r, g, b, false);
  }

  /** Big centred stamp text, e.g. "BEGOUR — DESTROYED". Fixed to the camera. */
  stamp(text: string, color = '#ff3a5a', size = 34, hold = 1600, y = 150) {
    const cam = this.scene.cameras.main;
    const t = this.scene.add.text(cam.width / 2, y, clean(text), textStyle(size, color, '#120c16', 6)).setOrigin(0.5).setScrollFactor(0).setDepth(200).setScale(3).setAlpha(0).setAngle(-6);
    this.scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: hold, duration: 400, onComplete: () => t.destroy() });
    return t;
  }

  /** Banner across the screen (fixed to camera). */
  banner(text: string, sub = '', color = '#ffe14a', hold = 1800) {
    const cam = this.scene.cameras.main;
    const bar = this.scene.add.rectangle(cam.width / 2, 120, cam.width, sub ? 64 : 44, 0x120c16, 0.82).setScrollFactor(0).setDepth(199);
    const t = this.scene.add.text(cam.width / 2, sub ? 108 : 120, clean(text), textStyle(24, color, '#120c16', 5)).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    const s = sub ? this.scene.add.text(cam.width / 2, 136, clean(sub), textStyle(12, '#ffffff', '#120c16', 3)).setOrigin(0.5).setScrollFactor(0).setDepth(200) : null;
    const objs = [bar, t, ...(s ? [s] : [])];
    objs.forEach((o) => o.setAlpha(0));
    this.scene.tweens.add({ targets: objs, alpha: 1, duration: 200 });
    this.scene.tweens.add({ targets: objs, alpha: 0, delay: hold, duration: 300, onComplete: () => objs.forEach((o) => o.destroy()) });
  }
}
