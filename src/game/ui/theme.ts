import Phaser from "phaser";
import { synth } from "../audio/Synth";

export const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
export const MONO = '"Courier New", monospace';

export const UI = {
  panel: 0x141628,
  panel2: 0x1e2140,
  accent: 0xffd23f,
  messenger: 0x0084ff,
  pink: 0xff6fa8,
  krezz: 0xc084fc,
  hp: 0xef4444,
  wonk: 0xff8c00,
  ban: 0xb91c1c,
  text: "#ffffff",
  dim: "#9aa0b4",
};

export const hexStr = (c: number) => "#" + c.toString(16).padStart(6, "0");

export interface ButtonOpts {
  w?: number;
  h?: number;
  size?: number;
  color?: number;
  textColor?: string;
  disabled?: boolean;
}

/** How far in from each edge the PixelLab UI frames' borders go (9-slice insets, in source px). */
export const UI_SLICE: Record<string, number> = { ui_panel: 24, ui_button: 9 };

/**
 * A PixelLab UI frame (9-slice, so it stretches to any size without smearing the border), centred on (x, y).
 * Null if the art isn't loaded, so callers keep their plain shapes as the fallback.
 */
export function uiFrame(scene: Phaser.Scene, x: number, y: number, w: number, h: number, key: "ui_panel" | "ui_button" = "ui_panel"): Phaser.GameObjects.NineSlice | null {
  if (!scene.textures.exists(key)) return null;
  const src = scene.textures.get(key).getSourceImage();
  // never let the corners be bigger than half the box
  const k = Math.min(UI_SLICE[key] ?? 20, Math.floor(Math.min(w, h) / 2) - 1, Math.floor(Math.min(src.width, src.height) / 2) - 1);
  return scene.add.nineslice(x, y, key, undefined, w, h, k, k, k, k);
}

/** A clickable text button. Returns the container; `onClick` fires on pointer up. */
export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, o: ButtonOpts = {}) {
  const w = o.w ?? 260;
  const h = o.h ?? 40;
  const c = scene.add.container(x, y);
  // the PixelLab button frame (tinted for colour-coded buttons), or a plain rectangle if it isn't loaded
  const art = uiFrame(scene, 0, 0, w, h, "ui_button");
  const baseTint = o.disabled ? 0x6b6b7a : o.color !== undefined ? tintFor(o.color) : 0xffffff;
  if (art) art.setTint(baseTint);
  const bg: any = art ?? scene.add.rectangle(0, 0, w, h, o.disabled ? 0x2a2a35 : o.color ?? UI.panel2, 0.95).setStrokeStyle(2, o.disabled ? 0x44475a : UI.accent);
  const t = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: `${o.size ?? 17}px`, color: o.disabled ? "#666a7a" : o.textColor ?? "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: w - 12 } }).setOrigin(0.5);
  c.add([bg, t]);
  c.setSize(w, h);
  if (!o.disabled) {
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => {
      if (art) art.setTint(0xfff3b0);
      else bg.setFillStyle(0x34396b, 1);
      synth.play("select");
    });
    bg.on("pointerout", () => (art ? art.setTint(baseTint) : bg.setFillStyle(o.color ?? UI.panel2, 0.95)));
    bg.on("pointerup", () => {
      synth.unlock();
      onClick();
    });
  }
  (c as any).label = t;
  (c as any).bg = bg;
  return c;
}

/** Lighten a fill colour into a tint for the button art (tints multiply, so a dark colour would go black). */
function tintFor(c: number) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const m = Math.max(r, g, b, 1);
  const k = (v: number) => Math.round(110 + (v / m) * 145);
  return (k(r) << 16) | (k(g) << 8) | k(b);
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.95) {
  const art = uiFrame(scene, x + w / 2, y + h / 2, w, h, "ui_panel");
  if (art) return art.setAlpha(alpha);
  const g = scene.add.graphics();
  g.fillStyle(UI.panel, alpha);
  g.fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(2, UI.accent, 0.9);
  g.strokeRoundedRect(x, y, w, h, 10);
  return g;
}

export function title(scene: Phaser.Scene, x: number, y: number, text: string, size = 30, color = "#ffd23f") {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", align: "center" }).setOrigin(0.5).setShadow(3, 3, "#000", 0);
}

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 15, color = "#ffffff", wrap?: number) {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, wordWrap: wrap ? { width: wrap, useAdvancedWrap: true } : undefined });
}

/** Fade the camera out, run fn, used for scene transitions. */
export function fadeTo(scene: Phaser.Scene, fn: () => void, ms = 300) {
  scene.cameras.main.fadeOut(ms, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, fn);
}
