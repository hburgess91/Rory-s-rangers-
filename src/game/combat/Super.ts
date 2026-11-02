import Phaser from "phaser";
import type { Player } from "./Player";
import { G } from "../G";
import { synth } from "../audio/Synth";

/**
 * GOLDEN JUICE TRANSFORMATION (T). Once per dungeon, if you've had a fresh squeeze beforehand.
 * Golden hair, bulging muscles, a gold flame aura. ATTACK becomes a wide, heavy mega melee; C fires the CUMEHAMEHA.
 */
export const SUPER_MS = 20000;

type SuperState = { aura: Phaser.GameObjects.GameObject[]; ev: Phaser.Time.TimerEvent; baseBig: number };
const states = new WeakMap<Player, SuperState>();

export function canTransform() {
  return !!G.s.flags.golden_charge;
}

export function goSuper(p: Player, now: number) {
  const w = p.world;
  const sc = w.sc;
  if (now < p.superUntil) return;
  if (!G.s.flags.golden_charge) {
    w.floatText(p.x, p.y - 50, "No golden juice in you. Find a squeeze before the next dungeon.", "#fde047", 12);
    return;
  }
  G.s.flags.golden_charge = false;
  p.superUntil = now + SUPER_MS;
  p.iframesUntil = now + 1200;
  // the scream
  synth.play("roar");
  w.shake(1000, 0.02);
  sc.cameras.main.flash(400, 255, 236, 140);
  w.hitStop(260);
  w.floatText(p.x, p.y - 80, "AAAAAAAAAAAHHHHH!!!", "#fde047", 26);
  for (let i = 0; i < 8; i++) sc.time.delayedCall(i * 90, () => bolt(p));
  // bigger, golden
  const baseBig = (p.spr as any).big ?? 1;
  (p.spr as any).big = baseBig * 1.3;
  p.spr.setScale(2);
  const aura: Phaser.GameObjects.GameObject[] = [];
  // super saiyan hair: golden spikes on your head
  const hair = sc.add.graphics().setDepth(503);
  const drawHair = () => {
    hair.clear();
    const hx = p.x;
    const hy = p.y - p.spr.displayHeight * 0.36;
    const spikes = [[-22, 6, -30, -26], [-12, 0, -14, -40], [0, -4, 4, -48], [12, 0, 20, -38], [22, 6, 32, -22]];
    hair.fillStyle(0xb45309, 1);
    for (const [x0, y0, tx, ty] of spikes) hair.fillTriangle(hx + x0 - 9, hy + y0 + 3, hx + x0 + 9, hy + y0 + 3, hx + tx, hy + ty - 3);
    hair.fillStyle(0xfde047, 1);
    for (const [x0, y0, tx, ty] of spikes) hair.fillTriangle(hx + x0 - 7, hy + y0, hx + x0 + 7, hy + y0, hx + tx, hy + ty);
    hair.fillStyle(0xfff7c2, 1);
    for (const [x0, y0, tx, ty] of spikes) hair.fillTriangle(hx + x0 - 2, hy + y0 - 2, hx + x0 + 3, hy + y0 - 2, hx + (x0 + tx) / 2, hy + (y0 + ty) / 2);
  };
  aura.push(hair);
  const glow = sc.add.circle(p.x, p.y, 54, 0xfde047, 0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(498);
  sc.tweens.add({ targets: glow, scale: 1.25, alpha: 0.12, yoyo: true, repeat: -1, duration: 160 });
  aura.push(glow);
  const ev = sc.time.addEvent({
    delay: 30,
    loop: true,
    callback: () => {
      glow.setPosition(p.x, p.y);
      drawHair();
      // flames licking upward all round you
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * Math.PI * 2;
        const f = sc.add.ellipse(p.x + Math.cos(a) * 26, p.y + 22 + Math.sin(a) * 8, 14, 26, Math.random() < 0.5 ? 0xfacc15 : 0xfff7c2, 0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(499);
        sc.tweens.add({ targets: f, y: f.y - 70 - Math.random() * 40, x: f.x + (Math.random() - 0.5) * 20, alpha: 0, duration: 480, onComplete: () => f.destroy() });
      }
      if (Math.random() < 0.04) bolt(p);
    },
  });
  states.set(p, { aura, ev, baseBig });
  w.toast("GOLDEN JUICE TRANSFORMATION", `${SUPER_MS / 1000}s. ATTACK = mega melee. C = CUMEHAMEHA.`);
}

export function endSuper(p: Player) {
  const st = states.get(p);
  if (!st) return;
  states.delete(p);
  st.ev.remove();
  for (const o of st.aura) o.destroy();
  (p.spr as any).big = st.baseBig;
  p.spr.setScale(2);
  p.world.floatText(p.x, p.y - 50, "...the golden juice wears off", "#fde047", 12);
}

/** Called every frame from the player. */
export function superTick(p: Player, now: number) {
  if (now >= p.superUntil && states.has(p)) endSuper(p);
  if (now < p.superUntil) p.spr.setTint(Math.floor(now / 90) % 2 ? 0xffd23f : 0xffe680);
}

function bolt(p: Player) {
  const sc = p.world.sc;
  const g = sc.add.graphics().setDepth(600).setBlendMode(Phaser.BlendModes.ADD);
  g.lineStyle(3, 0xfff7c2, 1);
  let x = p.x + (Math.random() - 0.5) * 60;
  let y = p.y - 60;
  g.beginPath();
  g.moveTo(x, y);
  for (let i = 0; i < 5; i++) g.lineTo((x += (Math.random() - 0.5) * 26), (y += 18));
  g.strokePath();
  sc.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
}

/** ATTACK while golden: a huge, wide, heavy swing. */
export function megaMelee(p: Player, now: number) {
  const w = p.world;
  const sc = w.sc;
  p.attackCd = now + 300;
  p.attackAnimUntil = now + 160;
  const a = p.aim;
  const R = 175;
  const ARC = Math.PI * 1.15;
  // a little lunge into it
  const body = p.spr.body as Phaser.Physics.Arcade.Body;
  if (!w.side) body.setVelocity(Math.cos(a) * 420, Math.sin(a) * 420);
  else body.setVelocityX(Math.cos(a) * 420);
  // the swoosh
  const g = sc.add.graphics().setDepth(601);
  const swing = { t: 0 };
  const side = (p.swingSide = -p.swingSide || 1);
  sc.tweens.add({
    targets: swing,
    t: 1,
    duration: 140,
    onUpdate: () => {
      g.clear();
      const from = a - (ARC / 2) * side;
      const to = from + ARC * swing.t * side;
      for (const [r, wdt, col, al] of [[R, 34, 0xf59e0b, 0.55], [R - 6, 20, 0xfde047, 0.95], [R - 12, 8, 0xffffff, 1], [R * 0.62, 10, 0xfacc15, 0.7]] as [number, number, number, number][]) {
        g.lineStyle(wdt, col, al);
        g.beginPath();
        g.arc(p.x, p.y, r, Math.min(from, to), Math.max(from, to));
        g.strokePath();
      }
    },
    onComplete: () => sc.tweens.add({ targets: g, alpha: 0, duration: 120, onComplete: () => g.destroy() }),
  });
  synth.play("explode");
  let hits = 0;
  for (const e of [...w.enemies]) {
    if (e.dead) continue;
    const d = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y);
    if (d > R + e.radius) continue;
    const ang = Math.atan2(e.y - p.y, e.x - p.x);
    if (Math.abs(Phaser.Math.Angle.Wrap(ang - a)) > ARC / 2 + 0.2 && d > 50) continue;
    hits++;
    const dmg = e.isBoss ? p.dmg(28, now) + e.maxHp * 0.012 : p.dmg(60, now);
    w.damageEnemy(e, dmg, { knock: e.isBoss ? 180 : 620, angle: ang, crit: Math.random() < 0.25, noWonk: true });
    w.burst(e.x, e.y, 0xfde047, 12);
    const ring = sc.add.circle(e.x, e.y, 8, 0xffffff, 0).setStrokeStyle(4, 0xfde047).setDepth(602);
    sc.tweens.add({ targets: ring, radius: 46, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
  }
  if (hits) {
    w.hitStop(hits > 2 ? 90 : 60);
    w.shake(140, 0.012);
    if (Math.random() < 0.3) w.floatText(p.x, p.y - 60, ["HAAA!", "ORA!", "TAKE THIS!", "GOLDEN!", "HRAAAH!"][Math.floor(Math.random() * 5)], "#fde047", 18);
  } else w.shake(60, 0.004);
}

/** C while golden: CUME... HAME... HAAAAAA! */
export function cumehameha(p: Player, now: number) {
  const w = p.world;
  const sc = w.sc;
  if (now < p.cumeCd) {
    w.floatText(p.x, p.y - 50, `CUMEHAMEHA in ${Math.ceil((p.cumeCd - now) / 1000)}s`, "#fde047", 11);
    return;
  }
  p.cumeCd = now + 5000;
  const CHARGE = 750;
  p.chargingUntil = now + CHARGE + 900;
  const orb = sc.add.circle(p.x, p.y, 4, 0xffffff, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(603);
  const halo = sc.add.circle(p.x, p.y, 8, 0x93c5fd, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(602);
  sc.tweens.add({ targets: orb, radius: 18, duration: CHARGE });
  sc.tweens.add({ targets: halo, radius: 34, alpha: 0.8, duration: CHARGE });
  w.floatText(p.x, p.y - 70, "CUME…", "#93c5fd", 20);
  sc.time.delayedCall(CHARGE / 2, () => w.floatText(p.x, p.y - 90, "HAME…", "#93c5fd", 22));
  const suck = sc.time.addEvent({
    delay: 30,
    repeat: Math.floor(CHARGE / 30),
    callback: () => {
      orb.setPosition(p.x + Math.cos(p.aim) * 24, p.y + Math.sin(p.aim) * 24);
      halo.setPosition(orb.x, orb.y);
      const a = Math.random() * Math.PI * 2;
      const s = sc.add.circle(orb.x + Math.cos(a) * 70, orb.y + Math.sin(a) * 70, 3, 0xbfdbfe).setBlendMode(Phaser.BlendModes.ADD).setDepth(603);
      sc.tweens.add({ targets: s, x: orb.x, y: orb.y, alpha: 0.2, duration: 220, onComplete: () => s.destroy() });
    },
  });
  sc.time.delayedCall(CHARGE, () => {
    suck.remove();
    sc.tweens.killTweensOf([orb, halo]);
    orb.destroy();
    halo.destroy();
    if (p.dead) return;
    w.floatText(p.x, p.y - 100, "HAAAAAAAAAAA!!!", "#ffffff", 30);
    synth.play("jet");
    w.shake(900, 0.022);
    sc.cameras.main.flash(160, 220, 235, 255);
    const ang = p.aim;
    const LEN = 1300;
    const WID = 58;
    const g = sc.add.graphics().setDepth(604).setBlendMode(Phaser.BlendModes.ADD);
    const st = { len: 0, life: 1 };
    sc.tweens.add({ targets: st, len: LEN, duration: 160, ease: "Quad.out" });
    sc.tweens.add({ targets: st, life: 0, delay: 800, duration: 260 });
    const hit = new Map<unknown, number>();
    let ticks = 0;
    const ev = sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const x1 = p.x + Math.cos(ang) * 20;
        const y1 = p.y + Math.sin(ang) * 20;
        const x2 = x1 + Math.cos(ang) * st.len;
        const y2 = y1 + Math.sin(ang) * st.len;
        const wob = 1 + Math.sin(sc.time.now / 30) * 0.08;
        g.clear();
        g.lineStyle(WID * 2.4 * st.life * wob, 0x60a5fa, 0.25);
        g.lineBetween(x1, y1, x2, y2);
        g.lineStyle(WID * st.life * wob, 0xbfdbfe, 0.85);
        g.lineBetween(x1, y1, x2, y2);
        g.lineStyle(WID * 0.45 * st.life, 0xffffff, 1);
        g.lineBetween(x1, y1, x2, y2);
        g.fillStyle(0xffffff, st.life).fillCircle(x1, y1, WID * 0.7 * st.life * wob);
        if (++ticks % 6 === 0 && st.life > 0.2) {
          for (const e of [...w.enemies]) {
            if (e.dead) continue;
            const ex = e.x - x1;
            const ey = e.y - y1;
            const along = ex * Math.cos(ang) + ey * Math.sin(ang);
            const across = Math.abs(-ex * Math.sin(ang) + ey * Math.cos(ang));
            if (along < 0 || along > st.len || across > WID + e.radius) continue;
            const n = (hit.get(e) ?? 0) + 1;
            hit.set(e, n);
            if (e.isBoss && n > 8) continue;
            const dmg = e.isBoss ? p.dmg(18, now) + e.maxHp * 0.011 : p.dmg(70, now);
            w.damageEnemy(e, dmg, { knock: 320, angle: ang, crit: n === 1, noWonk: true });
            if (n === 1) w.burst(e.x, e.y, 0xbfdbfe, 14);
          }
        }
        if (st.life <= 0.01) {
          ev.remove();
          g.destroy();
        }
      },
    });
  });
}
