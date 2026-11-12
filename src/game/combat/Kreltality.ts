import Phaser from "phaser";
import { synth } from "../audio/Synth";
import { FONT } from "../ui/theme";
import { hasVfx, vfx } from "../gfx/Vfx";

/**
 * KRELTALITY. After a boss goes down: "FUCKING KILL THEM!!" — press it (or don't) for an over-the-top,
 * cartoonish finishing move. Everything here is deliberately silly: rubbery, sausagey, splattery.
 */

export interface KrelTarget {
  key: string;
  frame: string | number;
  x: number;
  y: number;
  /** the scale to give an image of this texture */
  scale: number;
  flip: boolean;
  name: string;
}

export type Finisher = "spine" | "explode" | "halved" | "headboot" | "slit" | "flatten" | "vice" | "bellybomb";
const FINISHERS: Finisher[] = ["spine", "explode", "halved", "headboot", "slit", "flatten", "vice"];
const NAMES: Record<Finisher, string> = {
  spine: "SPINE RIP!",
  explode: "KREZZPLOSION!",
  halved: "HALVED!",
  headboot: "HEAD BOOT!",
  slit: "THROAT SLIT!",
  flatten: "FLATTENED!",
  vice: "VICE-D!",
  bellybomb: "BELLY BOMB!",
};

const D = 2000; // above everything in the room

/** Ask. Resolves true if they said yes (and the finisher has played). */
export async function kreltality(sc: Phaser.Scene, target: KrelTarget, player: { key: string; frame: string | number; scale: number }, force?: Finisher): Promise<boolean> {
  const yes = await prompt(sc);
  if (!yes) return false;
  await stage(sc, target, player, force ?? FINISHERS[Math.floor(Math.random() * FINISHERS.length)]);
  return true;
}

/** No asking: it just happens (story Kreltalities, like Uncle Rik's). */
export async function forcedKreltality(sc: Phaser.Scene, target: KrelTarget, player: { key: string; frame: string | number; scale: number }, which: Finisher): Promise<void> {
  await stage(sc, target, player, which);
}

// ------------------------------------------------------------------ the prompt

function prompt(sc: Phaser.Scene): Promise<boolean> {
  return new Promise((resolve) => {
    const cam = sc.cameras.main;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const pin = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      (o as unknown as { setScrollFactor: (x: number, y?: number) => void }).setScrollFactor(0, 0);
      objs.push(o);
      return o;
    };
    const k = 1 / cam.zoom;
    const cx = 480;
    const cy = 270;
    const dim = pin(sc.add.rectangle(cx, cy, 4000, 4000, 0x2a0000, 0.55).setDepth(D + 50).setInteractive());
    const t = pin(sc.add.text(cx, cy - 90 * k, "FUCKING KILL THEM!!", { fontFamily: "Impact, sans-serif", fontSize: "54px", color: "#ef4444", stroke: "#000", strokeThickness: 9 }).setOrigin(0.5).setDepth(D + 51).setScale(k));
    synth.play("roar");
    sc.tweens.add({ targets: t, x: { from: cx - 4 * k, to: cx + 4 * k }, yoyo: true, repeat: -1, duration: 50 });
    const mk = (x: number, label: string, bg: string, fn: () => void) => {
      const b = pin(sc.add.text(cx + x * k, cy + 10 * k, label, { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#ffffff", backgroundColor: bg, padding: { x: 18, y: 10 } }).setOrigin(0.5).setDepth(D + 52).setScale(k).setInteractive({ useHandCursor: true }));
      b.on("pointerdown", fn);
      return b;
    };
    const yesB = mk(-140, "☠ KRELTALITY (K)", "#991b1b", () => done(true));
    mk(150, "spare them (ESC)", "#1f2937", () => done(false));
    sc.tweens.add({ targets: yesB, scale: { from: k, to: k * 1.08 }, yoyo: true, repeat: -1, duration: 300 });
    const bar = pin(sc.add.rectangle(cx - 200 * k, cy + 70 * k, 400 * k, 6 * k, 0xef4444).setOrigin(0, 0.5).setDepth(D + 52));
    sc.tweens.add({ targets: bar, scaleX: 0, duration: 7000, onComplete: () => done(false) });
    const kb = sc.input.keyboard;
    const onK = () => done(true);
    const onEsc = () => done(false);
    kb?.on("keydown-K", onK);
    kb?.on("keydown-ESC", onEsc);
    let fin = false;
    function done(v: boolean) {
      if (fin) return;
      fin = true;
      kb?.off("keydown-K", onK);
      kb?.off("keydown-ESC", onEsc);
      for (const o of objs) {
        sc.tweens.killTweensOf(o);
        o.destroy();
      }
      if (!v) synth.play("select");
      resolve(v);
    }
    void dim;
  });
}

// ------------------------------------------------------------------ the show

async function stage(sc: Phaser.Scene, tg: KrelTarget, pl: { key: string; frame: string | number; scale: number }, which: Finisher) {
  const cam = sc.cameras.main;
  const wait = (ms: number) => new Promise<void>((r) => sc.time.delayedCall(ms, () => r()));
  const tw = (cfg: Phaser.Types.Tweens.TweenBuilderConfig) => new Promise<void>((r) => sc.tweens.add({ ...cfg, onComplete: () => r() }));
  const junk: Phaser.GameObjects.GameObject[] = [];
  const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    junk.push(o);
    return o;
  };
  // the arena goes dark and red; lightning
  const sky = keep(sc.add.rectangle(tg.x, tg.y, 6000, 6000, 0x1a0000, 0).setDepth(D));
  sc.tweens.add({ targets: sky, fillAlpha: 0.9, duration: 400 });
  cam.stopFollow();
  cam.pan(tg.x, tg.y - 20, 500, "Sine.easeInOut");
  cam.zoomTo(1.6, 500);
  synth.play("boom");
  const flash = () => {
    cam.flash(120, 255, 230, 230);
    synth.play("crit");
  };
  // the victim, dazed, swaying
  const body = keep(sc.add.image(tg.x, tg.y, tg.key, tg.frame).setScale(tg.scale).setFlipX(tg.flip).setDepth(D + 2));
  const fw = body.frame.width;
  const fh = body.frame.height;
  const H = fh * tg.scale;
  const W = fw * tg.scale;
  const floor = tg.y + H * 0.45;
  sc.tweens.add({ targets: body, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 500, ease: "Sine.inOut" });
  // you, walking over
  const me = keep(sc.add.sprite(tg.x - W * 0.5 - 120, floor - 30, pl.key, pl.frame).setScale(pl.scale).setDepth(D + 3).setFlipX(false));
  await wait(500);
  await tw({ targets: me, x: tg.x - W * 0.5 - 30, duration: 450, ease: "Quad.out" });
  sc.tweens.killTweensOf(body);
  body.setAngle(0);
  await wait(200);

  // ---- helpers: blood, guts, bones. Drawn effects (PixelLab VFX) when they're loaded; little shapes if not.
  const drawn = hasVfx(sc, "vfx_blood");
  const fx = (key: string, x: number, y: number, scale: number, extra: Parameters<typeof vfx>[4] = {}) => {
    const s = vfx(sc, key, x, y, { depth: D + 6, scale, ...extra });
    if (s) junk.push(s);
    return s;
  };
  let pools = 0;
  const blood = (x: number, y: number, n: number, power = 1, up = false) => {
    if (drawn) {
      const k = Math.min(2.2, 0.7 + n / 50) * Math.max(0.8, power * 0.8);
      fx(up && hasVfx(sc, "vfx_bloodspray") ? "vfx_bloodspray" : "vfx_blood", x, y, k, { flipX: Math.random() < 0.5 });
      if (n >= 20) fx("vfx_blood", x + (Math.random() - 0.5) * 40, y - 10, k * 0.7, { delay: 120, flipX: true });
      // a pool where it lands (only a few per finisher)
      if (pools < 3 && hasVfx(sc, "vfx_bloodpool")) {
        pools++;
        fx("vfx_bloodpool", x + (Math.random() - 0.5) * 30, floor + 4, Math.min(2, 0.8 + n / 60), { hold: true, depth: D + 1, delay: 200 });
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      const sz = 2 + Math.random() * 5;
      const r = keep(sc.add.rectangle(x, y, sz, sz, Math.random() < 0.7 ? 0xdc2626 : 0x7f1d1d).setDepth(D + 6));
      let vx = (Math.random() - 0.5) * 10 * power;
      let vy = up ? -(5 + Math.random() * 10) * power : (Math.random() - 0.7) * 9 * power;
      const ev = sc.time.addEvent({ delay: 16, loop: true, callback: () => {
        vy += 0.5;
        r.x += vx;
        r.y += vy;
        vx *= 0.99;
        if (r.y >= floor) {
          ev.remove();
          keep(sc.add.ellipse(r.x, floor + Math.random() * 6, 6 + Math.random() * 16, 3 + Math.random() * 3, 0xb91c1c, 0.95).setDepth(D + 1));
          r.destroy();
        }
      } });
      sc.time.delayedCall(4000, () => ev.remove());
    }
  };
  const fountain = (x: number, y: number, ms: number) => {
    if (drawn) {
      const ev = sc.time.addEvent({ delay: 420, loop: true, callback: () => fx(hasVfx(sc, "vfx_bloodspray") ? "vfx_bloodspray" : "vfx_blood", x + (Math.random() - 0.5) * 8, y, 1.1 + Math.random() * 0.4) });
      fx(hasVfx(sc, "vfx_bloodspray") ? "vfx_bloodspray" : "vfx_blood", x, y, 1.3);
      sc.time.delayedCall(ms, () => ev.remove());
      return;
    }
    const ev = sc.time.addEvent({ delay: 45, loop: true, callback: () => blood(x, y, 4, 0.9, true) });
    sc.time.delayedCall(ms, () => ev.remove());
  };
  /** A rope of sausagey guts flung from (x,y) towards angle a. */
  let lastSquelch = 0;
  const guts = (x: number, y: number, a: number, len = 120) => {
    if (sc.time.now - lastSquelch > 250) {
      lastSquelch = sc.time.now;
      synth.play("squelch");
    }
    if (hasVfx(sc, "vfx_gore")) {
      // meaty chunks flung out along the angle, a splat where they land
      fx("vfx_gore", x + Math.cos(a) * len * 0.35, Math.min(floor, y + Math.sin(a) * len * 0.35), 0.9 + len / 200, { flipX: Math.cos(a) < 0, delay: Math.random() * 120 });
      fx("vfx_blood", x + Math.cos(a) * len * 0.8, Math.min(floor, y + Math.sin(a) * len * 0.8 + 20), 0.8, { delay: 160 + Math.random() * 120 });
      return;
    }
    const n = 11;
    for (let i = 0; i < n; i++) {
      const c = keep(sc.add.circle(x, y, 7 - i * 0.25, i % 2 ? 0xf472b6 : 0xbe185d).setStrokeStyle(1.5, 0x831843).setDepth(D + 5));
      const d = (len * (i + 1)) / n;
      const sag = Math.sin((i / n) * Math.PI) * 30;
      sc.tweens.add({ targets: c, x: x + Math.cos(a) * d, y: Math.min(floor, y + Math.sin(a) * d + sag), duration: 380 + i * 30, ease: "Quad.out", delay: i * 18 });
    }
  };
  /** A spinal column hanging off a head. */
  const spine = (head: Phaser.GameObjects.Image) => {
    synth.play("bonecrack");
    // vertebrae: a little drawn bone each (body, side wings, a knob), with red gristle between
    const bones: Phaser.GameObjects.GameObject[] = [];
    const vert = (w: number) => {
      const c = sc.add.container(head.x, head.y).setDepth(D + 4);
      c.add(sc.add.ellipse(0, 3, w + 6, 4, 0x9f1239, 0.9)); // gristle
      c.add(sc.add.rectangle(-w / 2 - 3, 0, 6, 3, 0xe7dcc4).setStrokeStyle(1, 0x6b5a45)); // wings
      c.add(sc.add.rectangle(w / 2 + 3, 0, 6, 3, 0xe7dcc4).setStrokeStyle(1, 0x6b5a45));
      c.add(sc.add.ellipse(0, 0, w, 6, 0xf5ecd7).setStrokeStyle(1.2, 0x6b5a45));
      c.add(sc.add.ellipse(-w * 0.15, -1, w * 0.4, 2, 0xffffff, 0.8)); // shine
      return keep(c);
    };
    for (let i = 0; i < 9; i++) bones.push(vert(12 - i * 0.6));
    const ev = sc.time.addEvent({ delay: 16, loop: true, callback: () => {
      bones.forEach((b, i) => (b as Phaser.GameObjects.Container).setPosition(head.x + Math.sin(sc.time.now / 120 + i * 0.5) * (i * 0.6), head.y + H * 0.14 + i * 6.5));
    } });
    sc.time.delayedCall(5000, () => ev.remove());
  };
  /** Bones: little white dog-bone shapes flung about. */
  const bones = (x: number, y: number, n: number) => {
    synth.play("bonecrack");
    for (let i = 0; i < n; i++) {
      const c = keep(sc.add.container(x, y).setDepth(D + 5));
      const len = 10 + Math.random() * 16;
      c.add([sc.add.rectangle(0, 0, len, 4, 0xf5ecd7), sc.add.circle(-len / 2, -2, 3, 0xf5ecd7), sc.add.circle(-len / 2, 2, 3, 0xf5ecd7), sc.add.circle(len / 2, -2, 3, 0xf5ecd7), sc.add.circle(len / 2, 2, 3, 0xf5ecd7)]);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const d = 80 + Math.random() * 200;
      sc.tweens.add({ targets: c, x: x + Math.cos(a) * d, y: floor - Math.random() * 6, angle: (Math.random() - 0.5) * 1080, duration: 700 + Math.random() * 400, ease: "Quad.out" });
    }
  };
  const cropTop = (frac: number) => {
    const t = keep(sc.add.image(body.x, body.y, tg.key, tg.frame).setScale(tg.scale).setFlipX(tg.flip).setDepth(D + 3).setCrop(0, 0, fw, fh * frac));
    body.setCrop(0, fh * frac, fw, fh * (1 - frac));
    return t;
  };
  const neckY = tg.y - H * 0.5 + H * 0.3;
  const label = (t: string) => {
    const x = keep(sc.add.text(tg.x, tg.y - H * 0.7, t, { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#fde047", stroke: "#000", strokeThickness: 7 }).setOrigin(0.5).setDepth(D + 10).setScale(0.3 / cam.zoom));
    sc.tweens.add({ targets: x, scale: 1 / cam.zoom, duration: 250, ease: "Back.out" });
    return x;
  };

  // ---- the finishers
  switch (which) {
    case "spine": {
      flash();
      synth.play("punch_big");
      await tw({ targets: me, x: tg.x - 10, duration: 120 });
      const head = cropTop(0.32);
      spine(head);
      synth.play("splat");
      label(NAMES.spine);
      sc.tweens.add({ targets: head, y: head.y - 70, x: me.x + 10, angle: -15, duration: 420, ease: "Back.out" });
      sc.tweens.add({ targets: me, y: me.y - 16, duration: 420, ease: "Back.out" });
      fountain(tg.x, neckY, 1800);
      await wait(500);
      sc.tweens.add({ targets: body, angle: tg.flip ? -90 : 90, y: floor - W * 0.2, duration: 700, ease: "Quad.in" });
      guts(tg.x, neckY, -0.4, 90);
      await wait(1500);
      break;
    }
    case "explode": {
      synth.voice("grunt", 0.7, 0.8);
      body.setTint(0xff9999);
      sc.tweens.add({ targets: body, x: { from: tg.x - 3, to: tg.x + 3 }, yoyo: true, repeat: 20, duration: 40 });
      await tw({ targets: body, scaleX: tg.scale * 1.7, scaleY: tg.scale * 1.5, duration: 1200, ease: "Quad.in" });
      flash();
      synth.play("explode");
      fx("vfx_bigboom", tg.x, tg.y + H * 0.15, 1.5 * Math.max(1, W / 90), { depth: D + 7 });
      synth.play("boom");
      cam.shake(500, 0.03);
      body.setVisible(false);
      for (let cx = 0; cx < 3; cx++)
        for (let cy = 0; cy < 3; cy++) {
          const ch = keep(sc.add.image(tg.x, tg.y, tg.key, tg.frame).setScale(tg.scale).setFlipX(tg.flip).setDepth(D + 4).setCrop((fw / 3) * cx, (fh / 3) * cy, fw / 3, fh / 3).setTint(0xffb4b4));
          sc.tweens.add({ targets: ch, x: tg.x + (cx - 1) * (120 + Math.random() * 140), y: floor - Math.random() * 20, angle: (Math.random() - 0.5) * 900, duration: 700 + Math.random() * 300, ease: "Quad.out" });
        }
      for (let i = 0; i < 5; i++) guts(tg.x, tg.y, -Math.PI / 2 + (i - 2) * 0.7, 110 + Math.random() * 80);
      blood(tg.x, tg.y, 70, 1.6, true);
      label(NAMES.explode);
      await wait(2000);
      break;
    }
    case "halved": {
      flash();
      synth.play("swing");
      const line = keep(sc.add.rectangle(tg.x, tg.y, 4, H * 1.4, 0xffffff).setDepth(D + 8));
      sc.tweens.add({ targets: line, scaleY: { from: 0, to: 1 }, duration: 140 });
      await wait(260);
      line.destroy();
      synth.play("crit");
      const left = keep(sc.add.image(tg.x, tg.y, tg.key, tg.frame).setScale(tg.scale).setFlipX(tg.flip).setDepth(D + 3).setCrop(0, 0, fw / 2, fh));
      body.setCrop(fw / 2, 0, fw / 2, fh);
      label(NAMES.halved);
      await wait(500);
      sc.tweens.add({ targets: left, x: tg.x - 40, angle: -70, y: floor - W * 0.25, duration: 900, ease: "Quad.in" });
      sc.tweens.add({ targets: body, x: tg.x + 40, angle: 70, y: floor - W * 0.25, duration: 900, ease: "Quad.in" });
      fountain(tg.x, tg.y - H * 0.2, 1200);
      for (let i = 0; i < 3; i++) guts(tg.x, tg.y + i * 10, Math.PI / 2 + (i - 1) * 0.6, 60);
      await wait(1800);
      break;
    }
    case "headboot": {
      flash();
      synth.play("punch_big");
      sc.tweens.add({ targets: me, y: me.y - 30, yoyo: true, duration: 150 });
      const head = cropTop(0.3);
      label(NAMES.headboot);
      fountain(tg.x, neckY, 1600);
      await tw({ targets: head, y: tg.y - 600, angle: 720, duration: 700, ease: "Quad.out" });
      sc.tweens.add({ targets: body, angle: tg.flip ? -90 : 90, y: floor - W * 0.2, duration: 700, ease: "Quad.in" });
      await wait(400);
      head.setPosition(me.x + 40, tg.y - 500);
      await tw({ targets: head, y: floor - 30, angle: 1080, duration: 700, ease: "Quad.in" });
      synth.play("punch_big");
      sc.tweens.add({ targets: me, angle: -20, yoyo: true, duration: 120 });
      const goal = keep(sc.add.text(me.x + 120, me.y - 80, "GOOOAL!", { fontFamily: "Impact, sans-serif", fontSize: "20px", color: "#ffffff", stroke: "#000", strokeThickness: 4 }).setDepth(D + 10).setScale(1 / cam.zoom));
      void goal;
      await tw({ targets: head, x: head.x + 700, y: head.y - 300, angle: 1800, duration: 700, ease: "Quad.out" });
      synth.play("cheer");
      await wait(600);
      break;
    }
    case "slit": {
      synth.play("swing");
      const g = keep(sc.add.graphics().setDepth(D + 8));
      const p = { t: 0 };
      await tw({ targets: p, t: 1, duration: 140, onUpdate: () => g.clear().lineStyle(5, 0xffffff, 1).lineBetween(tg.x - W * 0.35, neckY - 6, tg.x - W * 0.35 + W * 0.7 * p.t, neckY + 6) });
      synth.play("crit");
      flash();
      label(NAMES.slit);
      sc.tweens.add({ targets: g, alpha: 0, duration: 400 });
      fountain(tg.x, neckY, 1400);
      body.setTint(0xffb0b0);
      await wait(700);
      sc.tweens.add({ targets: body, angle: tg.flip ? -84 : 84, y: floor - W * 0.2, duration: 700, ease: "Quad.in" });
      await wait(1200);
      break;
    }
    case "flatten": {
      // you go up… and come down on them
      synth.play("lob");
      await tw({ targets: me, x: tg.x, y: tg.y - H - 200, duration: 450, ease: "Quad.out" });
      await tw({ targets: me, y: tg.y - H * 0.35, duration: 220, ease: "Quad.in" });
      flash();
      synth.play("splat");
      synth.play("boom");
      cam.shake(400, 0.025);
      sc.tweens.add({ targets: body, scaleY: tg.scale * 0.08, scaleX: tg.scale * 1.8, y: floor - 4, duration: 120 });
      sc.tweens.add({ targets: me, y: floor - 40, duration: 120 });
      blood(tg.x, floor - 6, 60, 1.4, true);
      for (let i = 0; i < 4; i++) guts(tg.x, floor - 6, i < 2 ? Math.PI + 0.2 * i : -0.2 * (i - 2), 100);
      label(NAMES.flatten);
      await wait(1800);
      break;
    }
  }

  if (which === "vice") {
    // a giant workshop vice slams down around them
    const vg = keep(sc.add.container(tg.x, tg.y).setDepth(D + 4));
    const jawH = H * 1.05;
    const mkJaw = (side: number) => {
      const j = sc.add.container(side * (W * 0.5 + 40), 0);
      j.add(sc.add.rectangle(0, 0, 34, jawH, 0x6b7280).setStrokeStyle(3, 0x1f2937));
      for (let k = -3; k <= 3; k++) j.add(sc.add.rectangle(-side * 15, (k * jawH) / 8, 6, 8, 0x374151));
      j.add(sc.add.rectangle(side * 30, jawH * 0.35, 40, 26, 0x4b5563).setStrokeStyle(2, 0x1f2937));
      return j;
    };
    const L = mkJaw(-1);
    const R = mkJaw(1);
    const base = sc.add.rectangle(0, jawH / 2 + 12, W + 160, 24, 0x374151).setStrokeStyle(3, 0x111827);
    const screw = sc.add.rectangle(W * 0.5 + 110, jawH * 0.35, 120, 10, 0x9ca3af);
    const handle = sc.add.rectangle(W * 0.5 + 170, jawH * 0.35, 8, 90, 0xd1d5db).setStrokeStyle(2, 0x1f2937);
    vg.add([base, screw, L, R, handle]);
    vg.y = tg.y - 700;
    synth.play("lob");
    await tw({ targets: vg, y: tg.y, duration: 380, ease: "Bounce.out" });
    synth.play("punch_big");
    cam.shake(250, 0.015);
    flash();
    const squeeze = label("SQUEEZE!");
    // crank it shut, a turn at a time; they scream higher and higher
    const steps = 9;
    for (let i = 0; i < steps; i++) {
      const k = (i + 1) / steps;
      const gap = W * 0.5 * (1 - k * 0.85);
      synth.play("tap");
      if (i >= 5) synth.play("bonecrack");
      synth.voice(i < 3 ? "oh" : i < 6 ? "grunt" : "oh", 0.55 + k * 0.3, 1.1 + k * 1.1);
      sc.tweens.add({ targets: handle, angle: handle.angle + 70, duration: 160 });
      sc.tweens.add({ targets: L, x: -(gap + 17), duration: 160 });
      sc.tweens.add({ targets: R, x: gap + 17, duration: 160 });
      sc.tweens.add({ targets: body, scaleX: tg.scale * (1 - k * 0.82), scaleY: tg.scale * (1 + k * 0.35), duration: 160 });
      body.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - k * 160), Math.round(255 - k * 160)));
      cam.shake(120, 0.004 + k * 0.01);
      if (i > 3) blood(tg.x, tg.y - H * 0.2, 3 + i, 0.6, true);
      if (i === 6) {
        const pop = keep(sc.add.text(tg.x + W * 0.3, tg.y - H * 0.6, "AAAAAAAAGH!!", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ffffff", stroke: "#000", strokeThickness: 5 }).setDepth(D + 10).setScale(1 / cam.zoom));
        sc.tweens.add({ targets: pop, x: pop.x + 6, yoyo: true, repeat: 12, duration: 40 });
      }
      await wait(260 - i * 12);
    }
    // ...and POP
    synth.voice("oh", 0.9, 2.6);
    await wait(150);
    flash();
    synth.play("explode");
    fx("vfx_bigboom", tg.x, tg.y + H * 0.15, 1.5 * Math.max(1, W / 90), { depth: D + 7 });
    synth.play("splat");
    synth.play("boom");
    cam.shake(600, 0.035);
    body.setVisible(false);
    for (let cy = 0; cy < 4; cy++) {
      const ch = keep(sc.add.image(tg.x, tg.y, tg.key, tg.frame).setScale(tg.scale * 0.3, tg.scale).setFlipX(tg.flip).setDepth(D + 4).setCrop(0, (fh / 4) * cy, fw, fh / 4).setTint(0xff9999));
      sc.tweens.add({ targets: ch, x: tg.x + (Math.random() - 0.5) * 300, y: floor - Math.random() * 10, angle: (Math.random() - 0.5) * 1000, duration: 650 + Math.random() * 300, ease: "Quad.out" });
    }
    blood(tg.x, tg.y - H * 0.1, 90, 1.8, true);
    for (let i = 0; i < 6; i++) guts(tg.x, tg.y - H * 0.1, -Math.PI / 2 + (i - 2.5) * 0.55, 90 + Math.random() * 90);
    bones(tg.x, tg.y - H * 0.1, 12);
    squeeze.destroy();
    label(NAMES.vice);
    sc.tweens.add({ targets: [L, R], x: 0, duration: 120 });
    await wait(2200);
  }

  if (which === "bellybomb") {
    // the bombs you planted, blinking through his skin
    const lights = [
      [-0.14, 0.0],
      [0.12, -0.03],
      [-0.06, 0.1],
      [0.1, 0.09],
    ].map(([dx, dy]) => keep(sc.add.circle(tg.x + dx * W, tg.y + dy * H, 4, 0xff2020).setDepth(D + 4)));
    const say = (t: string, col = "#ffffff") => {
      const p = keep(sc.add.text(tg.x + W * 0.45, tg.y - H * 0.55, t, { fontFamily: "Impact, sans-serif", fontSize: "20px", color: col, stroke: "#000", strokeThickness: 5 }).setOrigin(0, 0.5).setDepth(D + 10).setScale(1 / cam.zoom));
      return p;
    };
    let p = say("'Ere. What's that beeping?");
    for (let i = 0; i < 6; i++) {
      lights.forEach((l) => l.setFillStyle(i % 2 ? 0x550000 : 0xff2020));
      synth.play("tap");
      await wait(330 - i * 30);
    }
    p.destroy();
    p = say("Oh no. Me tummy.", "#fecaca");
    // he swells
    body.setTint(0xffb0b0);
    sc.tweens.add({ targets: body, x: { from: tg.x - 2, to: tg.x + 2 }, yoyo: true, repeat: 30, duration: 35 });
    const beep = sc.time.addEvent({ delay: 90, loop: true, callback: () => { synth.play("tap"); lights.forEach((l) => l.setFillStyle(l.fillColor === 0xff2020 ? 0x550000 : 0xff2020)); } });
    synth.voice("oh", 0.6, 0.7);
    await tw({ targets: body, scaleX: tg.scale * 1.45, scaleY: tg.scale * 1.15, duration: 1100, ease: "Quad.in" });
    beep.remove();
    p.destroy();
    // BOOM, belly first
    flash();
    synth.play("explode");
    fx("vfx_bigboom", tg.x, tg.y + H * 0.15, 1.5 * Math.max(1, W / 90), { depth: D + 7 });
    synth.play("boom");
    synth.play("splat");
    cam.shake(700, 0.04);
    lights.forEach((l) => l.destroy());
    body.setScale(tg.scale * 1.2, tg.scale);
    const bx = tg.x;
    const by = tg.y + H * 0.04;
    // the front of his belly, in bits
    for (let cx = 0; cx < 3; cx++) {
      const ch = keep(sc.add.image(tg.x, tg.y, tg.key, tg.frame).setScale(tg.scale * 1.2, tg.scale).setFlipX(tg.flip).setDepth(D + 4).setCrop(fw * (0.3 + cx * 0.14), fh * 0.42, fw * 0.14, fh * 0.2).setTint(0xffa0a0));
      sc.tweens.add({ targets: ch, x: tg.x + (cx - 1) * (220 + Math.random() * 120), y: floor - Math.random() * 10, angle: (Math.random() - 0.5) * 1200, duration: 800 + Math.random() * 300, ease: "Quad.out" });
    }
    // a great hole where his belly was
    keep(sc.add.ellipse(bx, by, W * 0.34, H * 0.17, 0x450a0a).setStrokeStyle(3, 0x9f1239).setDepth(D + 3));
    keep(sc.add.ellipse(bx, by, W * 0.22, H * 0.1, 0x7f1d1d).setDepth(D + 3));
    // intestines: lots of them, a long way
    for (let i = 0; i < 7; i++) guts(bx, by, -Math.PI / 2 + (i - 3) * 0.5, 120 + Math.random() * 140);
    for (let i = 0; i < 4; i++) guts(bx, by, (i < 2 ? Math.PI : 0) + (Math.random() - 0.5) * 0.4, 200 + Math.random() * 120);
    // and the rest of what was in there: poo, a gerbil, a tumour
    const bits: [number, number][] = [[0x7c4a1e, 9], [0x7c4a1e, 7], [0x5b3714, 8], [0xd6a36b, 7], [0xa855f7, 10], [0x7c4a1e, 6]];
    for (const [col, r] of bits) {
      const c = keep(sc.add.circle(bx, by, r, col).setStrokeStyle(2, 0x1f1206).setDepth(D + 5));
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.8;
      const d = 150 + Math.random() * 250;
      sc.tweens.add({ targets: c, x: bx + Math.cos(a) * d, y: floor - Math.random() * 8, angle: 720, duration: 900 + Math.random() * 300, ease: "Quad.out" });
    }
    fountain(bx, by, 2400);
    blood(bx, by, 120, 2, true);
    bones(bx, by, 6);
    label(NAMES.bellybomb);
    await wait(900);
    p = say("…'ello.", "#fecaca");
    await wait(900);
    p.destroy();
    sc.tweens.add({ targets: body, angle: tg.flip ? -90 : 90, y: floor - W * 0.2, duration: 800, ease: "Quad.in" });
    await wait(1400);
  }

  // ---- KRELTALITY
  const kz = 1 / cam.zoom;
  const big = keep(sc.add.text(480, 270 - 130 * kz, "KRELTALITY", { fontFamily: "Impact, sans-serif", fontSize: "84px", color: "#dc2626", stroke: "#000", strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 60).setScale(2 * kz).setAlpha(0));
  sc.tweens.add({ targets: big, scale: kz, alpha: 1, duration: 300, ease: "Quad.out" });
  synth.play("boom");
  cam.shake(300, 0.02);
  // drips off the letters
  for (let i = 0; i < 14; i++) {
    const d = keep(sc.add.rectangle(480 + (i - 6.5) * 34 * kz, 270 - 95 * kz, 5 * kz, 4 * kz, 0xb91c1c).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 59));
    sc.tweens.add({ targets: d, scaleY: 8 + Math.random() * 16, delay: 300 + Math.random() * 600, duration: 1200 + Math.random() * 800 });
  }
  const sub = keep(sc.add.text(480, 270 - 65 * kz, `${tg.name} HAS BEEN KRELTALISED`, { fontFamily: FONT, fontSize: "16px", color: "#fca5a5", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 60).setScale(kz));
  void sub;
  await wait(2600);
  // and back to the room
  for (const o of junk) {
    sc.tweens.killTweensOf(o);
    o.destroy();
  }
  cam.zoomTo(1, 400);
  await wait(400);
}
