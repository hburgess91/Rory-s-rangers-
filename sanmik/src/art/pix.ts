import Phaser from 'phaser';

// Tiny pixel-art drawing kit used to generate placeholder sprites at boot.
// Everything is drawn on integer pixels so it scales up crisply.

export class Pix {
  constructor(public ctx: CanvasRenderingContext2D, public ox = 0, public oy = 0, public flip = false, public w = 0) {}

  private X(x: number, w = 1) {
    return this.flip ? this.ox + (this.w - x - w) : this.ox + x;
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    if (w <= 0 || h <= 0) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(this.X(x, w)), Math.round(this.oy + y), Math.round(w), Math.round(h));
  }

  px(x: number, y: number, c: string) {
    this.rect(x, y, 1, 1, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = -ry; y <= ry; y++) {
      const span = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      this.rect(Math.round(cx - span), Math.round(cy + y), span * 2 + 1, 1, c);
    }
  }

  circle(cx: number, cy: number, r: number, c: string) {
    this.ellipse(cx, cy, r, r, c);
  }

  // Thick line using a square brush (Bresenham).
  line(x0: number, y0: number, x1: number, y1: number, c: string, t = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const off = Math.floor(t / 2);
    for (;;) {
      this.rect(x0 - off, y0 - off, t, t, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  poly(points: [number, number][], c: string) {
    // scanline fill
    const ys = points.map((p) => p[1]);
    const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) this.rect(Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]) + 1, 1, c);
    }
  }

  text(str: string, x: number, y: number, c: string, scale = 1) {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch];
      if (g) {
        for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r][k] === '1') this.rect(cx + k * scale, y + r * scale, scale, scale, c);
      }
      cx += 4 * scale;
    }
  }
}

// 3x5 micro font for in-sprite lettering (signs, packaging).
const RAW: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001110', '-': '000000111000000', '!': '010010010000010', '?': '110001010000010', '.': '000000000000010',
  "'": '010010000000000', '>': '100010001010100', '<': '001010100010001', '+': '000010111010000', ' ': '000000000000000',
  '&': '010101010101011', ':': '000010000010000', '/': '001001010100100', '$': '011110010011110',
};
const FONT: Record<string, string[]> = {};
for (const k of Object.keys(RAW)) FONT[k] = [0, 1, 2, 3, 4].map((r) => RAW[k].slice(r * 3, r * 3 + 3));

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

// Adds a 1px outline around opaque pixels inside a region. Gives everything a crisp pixel-art edge.
export function outlineRegion(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = '#120c16') {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  const [r, g, b] = hexToRgb(color);
  const A = (i: number, j: number) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : d[(j * w + i) * 4 + 3]);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      if (d[k + 3] > 40) continue;
      if (A(i - 1, j) > 40 || A(i + 1, j) > 40 || A(i, j - 1) > 40 || A(i, j + 1) > 40) {
        out[k] = r; out[k + 1] = g; out[k + 2] = b; out[k + 3] = 255;
      }
    }
  }
  ctx.putImageData(new ImageData(out, w, h), x, y);
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export interface FrameDef {
  name: string;
  draw: (p: Pix) => void;
  outline?: boolean;
  meta?: Record<string, number>;
}

// Builds a canvas texture made of equally sized frames, registered as named frames.
export function buildSheet(scene: Phaser.Scene, key: string, fw: number, fh: number, frames: FrameDef[], outlineColor = '#120c16') {
  if (scene.textures.exists(key)) return;
  const cols = Math.max(1, Math.min(frames.length, Math.floor(2048 / fw)));
  const rows = Math.ceil(frames.length / cols);
  // +1 px gutter so outlines and filtering never bleed between frames
  const cw = cols * (fw + 2), ch = rows * (fh + 2);
  const { c, ctx } = makeCanvas(cw, ch);
  frames.forEach((f, i) => {
    const fx = (i % cols) * (fw + 2) + 1, fy = Math.floor(i / cols) * (fh + 2) + 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();
    f.draw(new Pix(ctx, fx, fy, false, fw));
    ctx.restore();
    if (f.outline !== false) outlineRegion(ctx, fx, fy, fw, fh, outlineColor);
  });
  const tex = scene.textures.addCanvas(key, c)!;
  frames.forEach((f, i) => {
    const fx = (i % cols) * (fw + 2) + 1, fy = Math.floor(i / cols) * (fh + 2) + 1;
    tex.add(f.name, 0, fx, fy, fw, fh);
  });
}

// Single-image texture helper. Art should leave a 1px margin for the outline.
export function buildImage(scene: Phaser.Scene, key: string, w: number, h: number, draw: (p: Pix) => void, outline = true, outlineColor = '#120c16') {
  if (scene.textures.exists(key)) return;
  const { c, ctx } = makeCanvas(w, h);
  draw(new Pix(ctx, 0, 0, false, w));
  if (outline) outlineRegion(ctx, 0, 0, w, h, outlineColor);
  scene.textures.addCanvas(key, c);
}

// Deterministic pseudo-random for repeatable textures.
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
