import Phaser from "phaser";
import { G } from "../G";
import { synth } from "../audio/Synth";
import type { Player } from "./Player";
import type { CombatWorld } from "./types";
import { CHARACTERS } from "../../data/characters";

/**
 * Fart attacks. A meter fills from landing hits; release it any time (G / 💨 / D-pad down).
 * Each quarter of the meter is a potency level, so it pays to wait for level 4.
 */
export const FART_LEVELS = [
  { name: "", radius: 0, dmg: 0 },
  { name: "FAIRY FART", radius: 70, dmg: 8 },
  { name: "BAKED BEANS FART", radius: 115, dmg: 22 },
  { name: "CABBAGE FART", radius: 165, dmg: 36 },
  { name: "IBS ATTACK", radius: 9999, dmg: 110 },
];

/** Each character's twist on the fart. */
export const FART_STYLE: Record<string, string> = {
  FLENKY: "Jet Fart: blasts you forward",
  KREZMAR: "Blues Fart: harmonica note, slows everyone",
  KREBLIS: "99 Fart: every hit's a 99",
  KREZWONK: "Omen Fart: homing stink orbs",
  SCROMBUS: "Lingering Fart: clouds hang around twice as long",
  KREBON: "Power-Chord Fart: massive knockback",
  CRONGUS: "Silent But Deadly: no sound, you vanish",
  GRONNY: "Gut-Stank: 40% bigger clouds",
};

export function fartMeter(): number {
  return G.rt.fart ?? 0;
}
export function fartLevel(): number {
  return Math.min(4, Math.floor(fartMeter() / 25));
}

/** Called when a player hit lands. Faster attackers fill it a bit slower per hit. */
export function addFart(n: number) {
  const before = fartLevel();
  G.rt.fart = Math.min(100, fartMeter() + n);
  return fartLevel() > before ? fartLevel() : 0;
}

const GAS = (sc: Phaser.Scene) => (sc.textures.exists("fx_gas") ? "fx_gas" : "fx_circle");
const GAS2 = (sc: Phaser.Scene) => (sc.textures.exists("fx_gas2") ? "fx_gas2" : GAS(sc));

/** A green gas cloud that swells and fades. Returns the image. */
function cloud(sc: Phaser.Scene, x: number, y: number, size: number, life: number, tex = GAS(sc), tint?: number) {
  const img = sc.add.image(x, y, tex).setDepth(520).setAlpha(0.85).setRotation(Math.random() * Math.PI * 2);
  const f = img.frame;
  img.setDisplaySize(size * 0.4, size * 0.4 * (f.height / f.width));
  if (tint !== undefined) img.setTint(tint);
  else if (tex === "fx_circle") img.setTint(0x7cb342);
  else if (tex === "fx_gas") img.setTint(0xc8f07a);
  sc.tweens.add({ targets: img, displayWidth: size, displayHeight: size * (f.height / f.width), angle: img.angle + (Math.random() - 0.5) * 60, duration: life * 0.4, ease: "Quad.out" });
  sc.tweens.add({ targets: img, alpha: 0, delay: life * 0.55, duration: life * 0.45, onComplete: () => img.destroy() });
  return img;
}

/** Stink lines drifting up off a cloud. */
function stinkLines(sc: Phaser.Scene, x: number, y: number, n: number) {
  for (let i = 0; i < n; i++) {
    const t = sc.add.text(x + (Math.random() - 0.5) * 60, y, "~", { fontFamily: "monospace", fontSize: "22px", color: "#9ccc65", fontStyle: "bold" }).setOrigin(0.5).setDepth(530).setAngle(90);
    sc.tweens.add({ targets: t, y: y - 50 - Math.random() * 30, x: t.x + (Math.random() - 0.5) * 20, alpha: 0, delay: i * 90, duration: 900, onComplete: () => t.destroy() });
  }
}

/** Lingering cloud that hurts and slows anything inside it. */
function lingering(w: CombatWorld, x: number, y: number, r: number, ms: number, tick: number) {
  const sc = w.sc;
  // the room-wide IBS stink is drawn by its own clouds; only small ones get a sprite
  if (r < 400) cloud(sc, x, y, r * 2.1, ms, GAS2(sc)).setAlpha(0.6);
  let left = Math.floor(ms / 400);
  const ev = sc.time.addEvent({
    delay: 400,
    loop: true,
    callback: () => {
      w.aoe(x, y, r, tick, { noWonk: true, label: "", slow: 0.35 });
      if (Math.random() < 0.4) stinkLines(sc, x + (Math.random() - 0.5) * r, y, 1);
      if (--left <= 0) ev.remove();
    },
  });
}

export function releaseFart(p: Player, now: number) {
  const level = fartLevel();
  const w = p.world;
  if (level < 1) {
    w.floatText(p.x, p.y - 44, "Nothing in the tank yet", "#9ccc65", 12);
    return;
  }
  G.rt.fart = 0;
  if (level === 4) return ibsAttack(p, now);
  const L = FART_LEVELS[level];
  const sc = w.sc;
  const id = p.id;
  const r = L.radius * (id === "GRONNY" ? 1.4 : 1);
  const dmg = p.dmg(L.dmg, now) * (id === "KREBLIS" ? 1.1 : 1);
  // the gas comes out behind you
  const bx = p.x - Math.cos(p.aim) * 14;
  const by = p.y + 6 - Math.sin(p.aim) * 14;
  const silent = id === "CRONGUS";
  if (!silent) synth.fart(level);
  if (id === "KREZMAR") synth.play("harmonica");
  w.floatText(p.x, p.y - 52, silent ? "..." : `${L.name}!`, "#b5e655", 14 + level * 3);
  // clouds
  const puffs = [3, 5, 9][level - 1];
  for (let i = 0; i < puffs; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * r * 0.6;
    const tex = level === 1 && sc.textures.exists("fx_fairy") ? "fx_fairy" : i % 2 ? GAS2(sc) : GAS(sc);
    sc.time.delayedCall(i * 40, () => cloud(sc, bx + Math.cos(a) * d, by + Math.sin(a) * d, r * (0.7 + Math.random() * 0.5), 900 + level * 400, tex));
  }
  stinkLines(sc, bx, by, level * 2);
  w.shake(80 + level * 60, 0.002 * level);
  const knock = [80, 200, 260][level - 1] * (id === "KREBON" ? 2.2 : 1);
  w.aoe(bx, by, r, dmg, { knock, stun: level >= 2 ? 300 * level : 0, slow: id === "KREZMAR" ? 0.5 : level === 3 ? 0.35 : 0, noWonk: true, label: id === "KREBLIS" ? "99" : undefined });
  if (level === 3) lingering(w, bx, by, r * 0.8, id === "SCROMBUS" ? 8000 : 4000, p.dmg(6, now));
  else if (id === "SCROMBUS") lingering(w, bx, by, r * 0.7, 2500 * level, p.dmg(3, now));
  // character twists
  if (id === "FLENKY") {
    const body = p.spr.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(p.aim) * (420 + level * 120), Math.sin(p.aim) * (420 + level * 120));
    p.iframesUntil = Math.max(p.iframesUntil, now + 300);
  }
  if (id === "KREZWONK") for (let i = 0; i < level * 2; i++) w.shoot(p.x, p.y, { owner: "player", damage: p.dmg(8, now), speed: 260, angle: p.aim + Math.PI + (i - level) * 0.5, homing: 3, texture: GAS(sc), color: 0xb5e655, scale: 0.35, life: 2400 });
  if (id === "CRONGUS") {
    p.lurkUntil = Math.max(p.lurkUntil, now + 1500 + level * 500);
    p.nextHitCrit = true;
  }
  if (id === "KREBON") w.floatText(p.x, p.y - 70, "🤘", "#ffffff", 26);
}

/** Level 4. A final-smash style cinematic, then the room gets it. */
function ibsAttack(p: Player, now: number) {
  const w = p.world;
  const sc = w.sc;
  const cam = sc.cameras.main;
  const id = p.id;
  const windup = 1500;
  p.shieldUntil = Math.max(p.shieldUntil, now + windup + 1600);
  w.hitStop(windup);
  synth.fart(4);
  // darken, zoom in, banner
  const dim = sc.add.rectangle(480, 270, 960, 540, 0x0b1a05, 0).setScrollFactor(0).setDepth(2900);
  sc.tweens.add({ targets: dim, fillAlpha: 0.65, duration: 250 });
  const z0 = cam.zoom;
  sc.tweens.add({ targets: cam, zoom: z0 * 1.7, duration: 350, ease: "Quad.out" });
  const banner = sc.add.container(-700, 300).setScrollFactor(0).setDepth(3000);
  banner.add(sc.add.rectangle(0, 0, 1300, 120, 0x3d6b12, 0.95).setStrokeStyle(4, 0xd4ff3a));
  for (let i = 0; i < 14; i++) banner.add(sc.add.rectangle(-620 + i * 95, (Math.random() - 0.5) * 90, 70, 3, 0xd4ff3a, 0.6));
  const portrait = sc.textures.exists(`pt_${id.toLowerCase()}`) ? `pt_${id.toLowerCase()}` : sc.textures.exists(`ptx_${id}`) ? `ptx_${id}` : null;
  if (portrait) banner.add(sc.add.image(-170, 0, portrait).setDisplaySize(104, 104));
  else banner.add(sc.add.sprite(-170, 10, `spr_${id}`, 0).setScale(2));
  banner.add(sc.add.text(-100, -34, "IBS ATTACK!!!", { fontFamily: "Impact, sans-serif", fontSize: "54px", color: "#e9ff70", fontStyle: "bold", stroke: "#1a2e05", strokeThickness: 8 }).setOrigin(0, 0.5));
  banner.add(sc.add.text(-96, 30, `${CHARACTERS[id]?.name ?? id} · ${FART_STYLE[id] ?? ""}`, { fontFamily: "sans-serif", fontSize: "16px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0, 0.5));
  sc.tweens.add({ targets: banner, x: 480, duration: 260, ease: "Back.out" });
  sc.tweens.add({ targets: banner, x: 1700, delay: 1050, duration: 260, ease: "Quad.in", onComplete: () => banner.destroy() });
  // shaking, clenching
  const shakeEv = sc.time.addEvent({ delay: 40, loop: true, callback: () => p.spr.setX(p.spr.x + (Math.random() - 0.5) * 3) });
  p.spr.setTint(0xb5e655);
  for (let i = 0; i < 6; i++) sc.time.delayedCall(300 + i * 160, () => stinkLines(sc, p.x, p.y, 1));
  // release
  sc.time.delayedCall(windup, () => {
    shakeEv.remove();
    p.spr.clearTint();
    sc.tweens.add({ targets: cam, zoom: z0, duration: 220, ease: "Quad.in" });
    sc.tweens.add({ targets: dim, fillAlpha: 0, duration: 600, onComplete: () => dim.destroy() });
    cam.flash(250, 180, 255, 80);
    w.shake(1400, 0.018);
    w.hitStop(90);
    const b = w.bounds;
    // shockwave ring
    const ring = sc.add.circle(p.x, p.y, 20, 0xb5e655, 0).setStrokeStyle(10, 0xd4ff3a, 0.9).setDepth(560);
    sc.tweens.add({ targets: ring, radius: 900, alpha: 0, duration: 700, ease: "Quad.out", onComplete: () => ring.destroy() });
    // the room fills with gas, from you outwards
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 30 + Math.random() * 520;
      const x = Phaser.Math.Clamp(p.x + Math.cos(a) * d, b.left + 20, b.right - 20);
      const y = Phaser.Math.Clamp(p.y + Math.sin(a) * d, b.top + 20, b.bottom - 20);
      sc.time.delayedCall(d * 0.9, () => cloud(sc, x, y, 160 + Math.random() * 180, 3800, i % 2 ? GAS2(sc) : GAS(sc)));
    }
    // diarrhoea everywhere
    const drop = sc.textures.exists("fx_poo_drop") ? "fx_poo_drop" : "fx_dot";
    const splat = sc.textures.exists("fx_poo") ? "fx_poo" : "fx_circle";
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 60 + Math.random() * 480;
      const tx = Phaser.Math.Clamp(p.x + Math.cos(a) * d, b.left + 10, b.right - 10);
      const ty = Phaser.Math.Clamp(p.y + Math.sin(a) * d, b.top + 10, b.bottom - 10);
      sc.time.delayedCall(i * 18, () => {
        const blob = sc.add.image(p.x, p.y, drop).setDepth(580).setRotation(a);
        if (drop === "fx_dot") blob.setTint(0x6b3e12).setScale(3);
        else blob.setDisplaySize(18, 18);
        const dur = 300 + d * 0.9;
        sc.tweens.add({ targets: blob, x: tx, duration: dur, ease: "Linear" });
        sc.tweens.add({ targets: blob, y: { from: p.y, to: ty }, duration: dur, ease: "Linear" });
        // arc: lift then fall
        sc.tweens.add({ targets: blob, displayHeight: blob.displayHeight * 1.3, yoyo: true, duration: dur / 2 });
        sc.time.delayedCall(dur, () => {
          blob.destroy();
          const sp = sc.add.image(tx, ty, splat).setDepth(4).setRotation(Math.random() * Math.PI * 2).setAlpha(0.9);
          if (splat === "fx_circle") sp.setTint(0x5a3410).setScale(0.5 + Math.random() * 0.5);
          else sp.setDisplaySize(30 + Math.random() * 36, 30 + Math.random() * 36);
          sc.tweens.add({ targets: sp, alpha: 0.45, delay: 6000, duration: 4000 });
          if (Math.random() < 0.15) synth.play("splat");
        });
      });
    }
    // damage: everything in the room, plus a lingering stink
    const dmg = p.dmg(FART_LEVELS[4].dmg, now);
    for (const e of [...w.enemies]) {
      if (e.dead) continue;
      const extra = e.isBoss ? e.maxHp * 0.08 : 0;
      w.damageEnemy(e, dmg + extra, { crit: true, knock: id === "KREBON" ? 700 : 420, angle: Math.atan2(e.y - p.y, e.x - p.x), stun: 2500, noWonk: true, label: id === "KREBLIS" ? "99" : undefined });
    }
    sc.time.delayedCall(400, () => lingering(w, (b.left + b.right) / 2, (b.top + b.bottom) / 2, 2000, id === "SCROMBUS" ? 10000 : 5000, p.dmg(5, now)));
    w.floatText(p.x, p.y - 70, "IBS ATTACK", "#d4ff3a", 32);
    if (id === "CRONGUS") p.lurkUntil = Math.max(p.lurkUntil, now + 4000);
    if (id === "FLENKY") {
      const body = p.spr.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(p.aim) * 900, Math.sin(p.aim) * 900);
    }
  });
}
