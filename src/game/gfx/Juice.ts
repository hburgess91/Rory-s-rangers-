import Phaser from "phaser";
import { synth } from "../audio/Synth";
import { G } from "../G";

/**
 * Game-feel helpers for the big moments: letterbox bars, punch-in zooms, white flashes, shockwave rings, boss title
 * cards, squash-and-stretch, a soft vignette and real-time slow-mo. Everything is screen-fixed where it should be
 * (scrollFactor 0), cleans itself up, and is safe to call when the scene is shutting down.
 */

const alive = (sc: Phaser.Scene) => !!sc.sys && sc.sys.isActive() && !!sc.cameras?.main;
const shakeOn = () => G.meta?.settings?.shake !== false;

/**
 * A screen-space layer at `depth` that ignores the camera's zoom (a scrollFactor-0 object still gets zoomed, which
 * pushes letterbox bars off screen during a punch-in). Put overlay objects in here at screen coordinates.
 */
export function layer(sc: Phaser.Scene, depth: number): Phaser.GameObjects.Container {
  const store = sc as unknown as { __juiceLayers?: Map<number, Phaser.GameObjects.Container> };
  store.__juiceLayers ??= new Map();
  const have = store.__juiceLayers.get(depth);
  if (have && have.active && have.scene === sc) return have;
  const c = sc.add.container(0, 0).setScrollFactor(0).setDepth(depth);
  pinToScreen(sc, c);
  sc.events.once("shutdown", () => store.__juiceLayers?.clear());
  store.__juiceLayers.set(depth, c);
  return c;
}

/**
 * Keep a screen-space container (at 0,0, scrollFactor 0) the same size and place on screen whatever the camera's
 * zoom and rotation are doing. Use it for a scene's own dialogue box when that scene punches the camera in.
 */
export function pinToScreen(sc: Phaser.Scene, c: Phaser.GameObjects.Container) {
  const fix = () => {
    if (!c.active) return;
    const z = sc.cameras.main.zoom || 1;
    const r = (sc.cameras.main as unknown as { rotation?: number }).rotation || 0;
    c.setScale(1 / z);
    if (r) {
      c.setRotation(-r);
      const cx = 480 - (480 * Math.cos(-r) - 270 * Math.sin(-r)) / z;
      const cy = 270 - (480 * Math.sin(-r) + 270 * Math.cos(-r)) / z;
      c.setPosition(cx, cy);
    } else c.setRotation(0).setPosition(480 * (1 - 1 / z), 270 * (1 - 1 / z));
  };
  sc.events.on("postupdate", fix);
  c.once("destroy", () => sc.events.off("postupdate", fix));
  fix();
}

/** Pin a DialogueBox (its private root container) to the screen. */
export function pinDialogue(sc: Phaser.Scene, box: unknown) {
  const root = (box as { root?: Phaser.GameObjects.Container }).root;
  if (root) pinToScreen(sc, root);
}

/** Real-time wait (ignores the scene's time scale, so it works while slow-mo is on). */
export function realWait(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms));
}

/** Cinematic bars that slide in from the top and bottom. Returns a close() that slides them out again. */
export function letterbox(sc: Phaser.Scene, h = 54, ms = 450, depth = 4990) {
  const L = layer(sc, depth);
  const top = sc.add.rectangle(480, -h / 2, 1100, h, 0x000000);
  const bot = sc.add.rectangle(480, 540 + h / 2, 1100, h, 0x000000);
  L.add([top, bot]);
  sc.tweens.add({ targets: top, y: h / 2, duration: ms, ease: "Cubic.out" });
  sc.tweens.add({ targets: bot, y: 540 - h / 2, duration: ms, ease: "Cubic.out" });
  let closed = false;
  return (out = ms) => {
    if (closed || !top.active) return;
    closed = true;
    sc.tweens.add({ targets: top, y: -h / 2, duration: out, ease: "Cubic.in", onComplete: () => top.destroy() });
    sc.tweens.add({ targets: bot, y: 540 + h / 2, duration: out, ease: "Cubic.in", onComplete: () => bot.destroy() });
  };
}

/** A quick zoom punch (in, then eased back to `rest`). */
export function punchZoom(sc: Phaser.Scene, amount = 0.12, ms = 380, rest?: number) {
  const cam = sc.cameras.main;
  const base = rest ?? cam.zoom;
  cam.zoomTo(base + amount, ms * 0.25, "Quad.easeOut", true, (_c: unknown, p: number) => {
    if (p >= 1 && alive(sc)) cam.zoomTo(base, ms * 0.75, "Cubic.easeOut", true);
  });
}

/** A full-screen flash of colour that fades (more controllable than camera.flash, and it can sit under the HUD). */
export function flash(sc: Phaser.Scene, color = 0xffffff, ms = 260, alpha = 1, depth = 4980, add = false) {
  const r = sc.add.rectangle(480, 270, 1100, 700, color, alpha);
  layer(sc, depth).add(r);
  if (add) r.setBlendMode(Phaser.BlendModes.ADD);
  sc.tweens.add({ targets: r, alpha: 0, duration: ms, ease: "Quad.in", onComplete: () => r.destroy() });
  return r;
}

/** Camera shake that respects the settings. */
export function shake(sc: Phaser.Scene, ms: number, k: number) {
  if (shakeOn()) sc.cameras.main.shake(ms, k);
}

/** Expanding rings (a sound wave you can see). World coordinates. The line stays thin as it grows. */
export function shockRing(sc: Phaser.Scene, x: number, y: number, opts: { color?: number; to?: number; rings?: number; ms?: number; depth?: number; flat?: number } = {}) {
  const n = opts.rings ?? 2;
  for (let i = 0; i < n; i++) {
    const r = sc.add.circle(x, y, 10).setStrokeStyle(Math.max(1.5, 4 - i), opts.color ?? 0xffffff, 0.9).setDepth(opts.depth ?? 1450);
    r.setFillStyle(0xffffff, 0);
    r.scaleY = opts.flat ?? 1;
    sc.tweens.add({ targets: r, radius: (opts.to ?? 260) / 2, alpha: 0, delay: i * 110, duration: opts.ms ?? 650, ease: "Cubic.out", onComplete: () => r.destroy() });
  }
}

/** A soft dark (or coloured) vignette round the screen edges. */
export function vignette(sc: Phaser.Scene, color = 0x000000, alpha = 0.7, depth = 4900) {
  const key = "juice_vignette";
  if (!sc.textures.exists(key)) {
    const c = sc.textures.createCanvas(key, 480, 270);
    if (c) {
      const ctx = c.getContext();
      const g = ctx.createRadialGradient(240, 135, 70, 240, 135, 290);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.55, "rgba(255,255,255,0.25)");
      g.addColorStop(1, "rgba(255,255,255,1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 480, 270);
      c.refresh();
    }
  }
  const v = sc.add.image(480, 270, key).setDisplaySize(960, 540).setTintFill(color).setAlpha(0);
  layer(sc, depth).add(v);
  sc.tweens.add({ targets: v, alpha, duration: 500 });
  return v;
}

/** Squash on landing / stretch on rising: an object arrives with weight. Keeps its current scale as the rest pose. */
export function squash(sc: Phaser.Scene, o: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, k = 0.25, ms = 320) {
  const sx = o.scaleX;
  const sy = o.scaleY;
  sc.tweens.add({
    targets: o,
    scaleX: { from: sx * (1 + k), to: sx },
    scaleY: { from: sy * (1 - k), to: sy },
    duration: ms,
    ease: "Elastic.out",
    easeParams: [1.1, 0.5],
  });
}

/**
 * Slow-mo for `ms` real milliseconds. The scene supplies its own setter (DungeonScene.setSlowmo, or the default that
 * scales timers and tweens). Restores to 1 afterwards unless something else changed it meanwhile.
 */
export function slowMo(sc: Phaser.Scene, k: number, ms: number, set?: (k: number) => void) {
  const apply = set ?? ((v: number) => {
    sc.time.timeScale = v;
    sc.tweens.timeScale = v;
  });
  apply(k);
  window.setTimeout(() => {
    if (!sc.sys || !sc.sys.settings.active) return;
    if (Math.abs(sc.tweens.timeScale - k) < 1e-6) apply(1);
  }, ms);
}

/**
 * A boss title card: bars sweep in, the name SLAMS in big with a shake and a sting, the title types underneath,
 * then it all wipes away. Screen-fixed. Resolves when it's gone.
 */
export function bossCard(sc: Phaser.Scene, name: string, title: string, color = "#ff3b3b", depth = 4995): Promise<void> {
  return new Promise((res) => {
    const root = sc.add.container(0, 0);
    layer(sc, depth).add(root);
    const cy = 250;
    const band = sc.add.rectangle(480, cy, 960, 120, 0x000000, 0.78);
    band.scaleY = 0;
    const stripeA = sc.add.rectangle(-480, cy - 62, 960, 4, Phaser.Display.Color.HexStringToColor(color).color);
    const stripeB = sc.add.rectangle(1440, cy + 62, 960, 4, Phaser.Display.Color.HexStringToColor(color).color);
    const nm = sc.add.text(480, cy - 12, name, { fontFamily: "Impact, sans-serif", fontSize: "58px", color: "#ffffff", stroke: "#000000", strokeThickness: 10 }).setOrigin(0.5);
    nm.setShadow(0, 0, color, 24, true, true);
    if (nm.width > 900) nm.setScale(900 / nm.width);
    const rest = nm.scaleX;
    nm.setScale(rest * 3).setAlpha(0);
    const tt = sc.add.text(480, cy + 38, "", { fontFamily: "Courier New, monospace", fontSize: "17px", color, fontStyle: "bold", stroke: "#000000", strokeThickness: 4 }).setOrigin(0.5);
    root.add([band, stripeA, stripeB, nm, tt]);
    sc.tweens.add({ targets: band, scaleY: 1, duration: 220, ease: "Cubic.out" });
    sc.tweens.add({ targets: stripeA, x: 480, duration: 300, ease: "Cubic.out" });
    sc.tweens.add({ targets: stripeB, x: 480, duration: 300, ease: "Cubic.out" });
    sc.time.delayedCall(260, () => {
      if (!nm.active) return;
      synth.play("boom");
      sc.tweens.add({
        targets: nm,
        scale: rest,
        alpha: 1,
        duration: 170,
        ease: "Quad.in",
        onComplete: () => {
          if (!alive(sc)) return;
          shake(sc, 260, 0.014);
          flash(sc, 0xffffff, 160, 0.35, depth - 1);
          synth.play("telegraph");
        },
      });
    });
    let i = 0;
    const typer = sc.time.addEvent({
      delay: 22,
      repeat: title.length,
      callback: () => {
        if (!tt.active) return;
        tt.setText(title.slice(0, ++i));
      },
    });
    typer.paused = true;
    sc.time.delayedCall(480, () => (typer.paused = false));
    sc.time.delayedCall(2300, () => {
      if (!root.active) return res();
      sc.tweens.add({ targets: [nm, tt], x: "-=60", alpha: 0, duration: 260, ease: "Cubic.in" });
      sc.tweens.add({ targets: [stripeA], x: 1440, duration: 300, ease: "Cubic.in" });
      sc.tweens.add({ targets: [stripeB], x: -480, duration: 300, ease: "Cubic.in" });
      sc.tweens.add({
        targets: band,
        scaleY: 0,
        delay: 120,
        duration: 220,
        ease: "Cubic.in",
        onComplete: () => {
          root.destroy();
          res();
        },
      });
    });
  });
}

/** A big screen word that slams in (scale 3 -> 1), holds, and drifts away. */
export function slamText(sc: Phaser.Scene, text: string, color = "#ffffff", size = 56, y = 230, hold = 1100, depth = 4996) {
  const t = sc.add.text(480, y, text, { fontFamily: "Impact, sans-serif", fontSize: `${size}px`, color, align: "center", stroke: "#000000", strokeThickness: Math.round(size / 6) }).setOrigin(0.5);
  layer(sc, depth).add(t);
  t.setShadow(0, 0, color, 18, true, true);
  if (t.width > 920) t.setScale(920 / t.width);
  const rest = t.scaleX;
  t.setScale(rest * 3).setAlpha(0);
  sc.tweens.add({ targets: t, scale: rest, alpha: 1, duration: 160, ease: "Quad.in", onComplete: () => alive(sc) && shake(sc, 180, 0.01) });
  sc.tweens.add({ targets: t, y: y - 20, alpha: 0, delay: 160 + hold, duration: 450, ease: "Quad.in", onComplete: () => t.destroy() });
  return t;
}

/** Chunks of debris thrown out from a point (rects, tumbling, with gravity). World coordinates. */
export function debris(sc: Phaser.Scene, x: number, y: number, n = 14, opts: { colors?: number[]; speed?: number; depth?: number; floor?: number; size?: number } = {}) {
  const cols = opts.colors ?? [0x44403c, 0x78716c, 0x292524, 0xf97316];
  for (let i = 0; i < n; i++) {
    const s = (opts.size ?? 6) * (0.6 + Math.random());
    const r = sc.add.rectangle(x, y, s, s * (0.5 + Math.random() * 0.8), cols[i % cols.length]).setDepth(opts.depth ?? 1450);
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
    const v = (opts.speed ?? 320) * (0.5 + Math.random() * 0.7);
    const vx = Math.cos(a) * v;
    const vy = Math.sin(a) * v;
    const floor = opts.floor ?? y + 40 + Math.random() * 40;
    const o = { t: 0 };
    const dur = 900 + Math.random() * 500;
    sc.tweens.add({
      targets: o,
      t: dur / 1000,
      duration: dur,
      onUpdate: () => {
        const ny = y + vy * o.t + 900 * o.t * o.t;
        r.setPosition(x + vx * o.t, Math.min(ny, floor));
        r.angle += 9;
      },
      onComplete: () => sc.tweens.add({ targets: r, alpha: 0, duration: 400, onComplete: () => r.destroy() }),
    });
  }
}

// ------------------------------------------------------------------ sound design (layered on top of the recorded sfx)

type SynthBits = { ctx: AudioContext | null; sfxGain?: GainNode; musicGain?: GainNode };
const audio = () => {
  const s = synth as unknown as SynthBits;
  return s.ctx && s.sfxGain ? { ctx: s.ctx, out: s.sfxGain, music: s.musicGain } : null;
};

/** One low sine thump with a falling pitch (the body of a heartbeat or an impact). */
function thump(a: NonNullable<ReturnType<typeof audio>>, at: number, f0: number, f1: number, dur: number, vol: number) {
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(a.out);
  o.start(at);
  o.stop(at + dur + 0.05);
}

/** A heartbeat: lub-dub. */
export function heartbeat(vol = 0.9) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime;
  thump(a, t, 70, 40, 0.18, vol);
  thump(a, t + 0.2, 62, 36, 0.22, vol * 0.75);
}

/** A sub-bass drop under a big impact: the bit you feel. */
export function subDrop(vol = 1, dur = 1.6) {
  const a = audio();
  if (!a) return;
  thump(a, a.ctx.currentTime, 110, 28, dur, vol);
}

/** A rising noise sweep: tension before a hit. */
export function riser(ms = 1500, vol = 0.35) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime;
  const len = Math.ceil(a.ctx.sampleRate * (ms / 1000 + 0.1));
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const bp = a.ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 6;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(5000, t + ms / 1000);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + ms / 1000);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000 + 0.06);
  src.connect(bp).connect(g).connect(a.out);
  src.start(t);
  src.stop(t + ms / 1000 + 0.1);
}

/** A high ringing tone (ears ringing after a blast), fading out. */
export function earRing(ms = 3000, vol = 0.12) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime;
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(3200, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.connect(g).connect(a.out);
  o.start(t);
  o.stop(t + ms / 1000 + 0.05);
}

/** Duck the music to near-silence for `ms` (a held breath before a huge moment), then bring it back over `back` ms. */
export function duckMusic(ms: number, back = 600, to = 0.05) {
  const a = audio();
  if (!a?.music) return;
  const g = a.music.gain;
  const t = a.ctx.currentTime;
  const v = g.value;
  g.cancelScheduledValues(t);
  g.setValueAtTime(v, t);
  g.linearRampToValueAtTime(v * to, t + 0.15);
  g.setValueAtTime(v * to, t + ms / 1000);
  g.linearRampToValueAtTime(v, t + (ms + back) / 1000);
}
