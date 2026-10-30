import Phaser from "phaser";
import { synth } from "../audio/Synth";
import { TOUCH } from "../ui/TouchControls";
import { activeMods } from "../../data/historicalRevisions";
import { G } from "../G";
import type { Player } from "./Player";

/**
 * WONK YOUR THANG. Replaces the old Krezz Burst on the same button (R / WONK / LB) once the Wonk
 * meter is full. A mash mini-game: keep the gauge in the KREZZ ZONE long enough before time runs
 * out. Over the top = over-wonked, too little = under-wonked, just right = the white jet stream.
 */

export const OVER = 0.97;
const TIME = 8000;

// Flappy physics: each press kicks the gauge upward, gravity drags it back down. Easy to overshoot.
export const FLAP = 0.7; // upward speed (gauge units/sec) set by a press
export const GRAV = 2.1; // gauge units/sec^2

export interface WonkZone { lo: number; hi: number; need: number }
/** A new KREZZ ZONE every time: random height, random width. Narrow zones need less time in them. */
export function randomZone(): WonkZone {
  const width = 0.07 + Math.random() * 0.17;
  const lo = 0.22 + Math.random() * (OVER - 0.05 - width - 0.22);
  return { lo, hi: lo + width, need: Math.round(1300 + width * 5000) };
}
export interface Flappy { gauge: number; vel: number }
export function flap(g: Flappy) {
  g.vel = FLAP;
}
export function fall(g: Flappy, dtMs: number) {
  const dt = dtMs / 1000;
  g.vel -= GRAV * dt;
  g.gauge += g.vel * dt;
  if (g.gauge <= 0) {
    g.gauge = 0;
    g.vel = 0;
  }
  if (g.gauge > 1) g.gauge = 1;
}

export function startWonk(p: Player, now: number) {
  const w = p.world;
  const sc = w.sc;
  const Z = randomZone();
  const ZONE_LO = Z.lo;
  const ZONE_HI = Z.hi;
  const NEED = Z.need;
  const fl: Flappy = { gauge: 0, vel: 0 };
  let gauge = 0;
  let inZone = 0;
  let t = 0;
  let presses: number[] = [];
  let done = false;
  p.shieldUntil = Math.max(p.shieldUntil, now + TIME + 2500);
  w.hitStop(200);
  synth.play("wonk");

  // ---- the "cutscene"
  const ui = sc.add.container(0, 0).setScrollFactor(0).setDepth(3500);
  const dim = sc.add.rectangle(480, 270, 960, 540, 0x16001f, 0).setInteractive();
  ui.add(dim);
  sc.tweens.add({ targets: dim, fillAlpha: 0.82, duration: 200 });
  // pink spotlight and speed lines
  ui.add(sc.add.circle(320, 300, 170, 0xff4fa3, 0.18));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ui.add(sc.add.rectangle(320 + Math.cos(a) * 230, 300 + Math.sin(a) * 230, 60, 3, 0xff9ad5, 0.35).setRotation(a));
  }
  const hero = sc.add.sprite(320, 300, p.spr.texture.key, 0).setScale(5.5);
  ui.add(hero);
  // keep it decent: a big censor bar over the business end
  const bar = sc.add.rectangle(320, 352, 170, 54, 0x000000);
  const barT = sc.add.text(320, 352, "CENSORED", { fontFamily: "Impact, sans-serif", fontSize: "24px", color: "#ffffff" }).setOrigin(0.5);
  ui.add([bar, barT]);
  const sweat: Phaser.GameObjects.Text[] = [];
  const title = sc.add.text(480, 52, "WONK YOUR THANG", { fontFamily: "Impact, sans-serif", fontSize: "46px", color: "#ff9ad5", stroke: "#2a0030", strokeThickness: 8 }).setOrigin(0.5).setScale(0.2);
  ui.add(title);
  sc.tweens.add({ targets: title, scale: 1, duration: 300, ease: "Back.out" });
  const how = sc.add.text(480, 96, TOUCH.enabled ? "TAP to flap it up! Keep it in the KREZZ ZONE" : "TAP R (or SPACE / CLICK) to flap it up! Keep it in the KREZZ ZONE", { fontFamily: "sans-serif", fontSize: "16px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
  ui.add(how);
  // gauge
  const GX = 640;
  const GY = 130;
  const GH = 330;
  ui.add(sc.add.rectangle(GX, GY + GH / 2, 64, GH + 8, 0x000000, 0.8).setStrokeStyle(3, 0xffffff, 0.8));
  ui.add(sc.add.rectangle(GX, GY + GH * (1 - (ZONE_LO + ZONE_HI) / 2), 64, GH * (ZONE_HI - ZONE_LO), 0x22c55e, 0.35).setStrokeStyle(2, 0x86efac));
  ui.add(sc.add.rectangle(GX, GY + GH * (1 - (OVER + 1) / 2), 64, GH * (1 - OVER), 0xef4444, 0.5));
  ui.add(sc.add.text(GX + 44, GY + GH * (1 - (ZONE_LO + ZONE_HI) / 2), "KREZZ\nZONE", { fontFamily: "Impact, sans-serif", fontSize: "18px", color: "#86efac", align: "left" }).setOrigin(0, 0.5));
  ui.add(sc.add.text(GX + 44, GY + 4, "OVER-WONK", { fontFamily: "Impact, sans-serif", fontSize: "14px", color: "#f87171" }).setOrigin(0, 0.5));
  const fill = sc.add.rectangle(GX, GY + GH, 54, 0, 0xff4fa3).setOrigin(0.5, 1);
  ui.add(fill);
  // krezz progress + time
  ui.add(sc.add.text(GX + 130, 170, "KREZZ", { fontFamily: "Impact, sans-serif", fontSize: "18px", color: "#ffffff" }).setOrigin(0.5));
  ui.add(sc.add.rectangle(GX + 130, 320, 26, 260, 0x000000, 0.8).setStrokeStyle(2, 0xffffff, 0.7));
  const prog = sc.add.rectangle(GX + 130, 450, 20, 0, 0xffffff).setOrigin(0.5, 1);
  ui.add(prog);
  ui.add(sc.add.rectangle(480, 500, 520, 12, 0x000000, 0.8));
  const timeBar = sc.add.rectangle(220, 500, 520, 10, 0xffd23f).setOrigin(0, 0.5);
  ui.add(timeBar);
  const status = sc.add.text(320, 470, "", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ffffff", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5);
  ui.add(status);

  // ---- input: the same button, plus space / click / tap anywhere
  const press = () => {
    if (done) return;
    flap(fl);
    presses.push(t);
    synth.wonkTick(gauge);
    hero.setY(300 + (Math.random() - 0.5) * 6);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "r" || k === " " || k === "j" || k === "l") {
      e.preventDefault();
      press();
    }
  };
  window.addEventListener("keydown", onKey);
  dim.on("pointerdown", press);
  const pad = () => sc.input.gamepad?.total ? sc.input.gamepad.getPad(0) : null;
  let padWas = false;

  const tick = sc.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      if (done) return;
      const dt = 16;
      t += dt;
      w.hitStop(120);
      if (TOUCH.edges.has("burst")) {
        TOUCH.edges.delete("burst");
        press();
      }
      const gp = pad();
      const padNow = !!(gp && (gp.L1 || gp.A));
      if (padNow && !padWas) press();
      padWas = padNow;
      fall(fl, dt);
      gauge = fl.gauge;
      presses = presses.filter((x) => t - x < 600);
      const zone = gauge >= ZONE_LO && gauge <= ZONE_HI;
      if (zone) inZone += dt;
      (sc as any).__wonk = { gauge, inZone, t, lo: ZONE_LO, hi: ZONE_HI, need: NEED };
      // visuals
      fill.setSize(54, GH * gauge);
      fill.setFillStyle(gauge > ZONE_HI ? 0xef4444 : zone ? 0x22c55e : 0xff4fa3);
      prog.setSize(20, 256 * Math.min(1, inZone / NEED));
      timeBar.setSize(520 * Math.max(0, 1 - t / TIME), 10);
      const rate = presses.length;
      hero.setX(320 + (Math.random() - 0.5) * Math.min(14, rate * 1.6));
      hero.setAngle((Math.random() - 0.5) * Math.min(8, rate));
      status.setText(gauge > ZONE_HI ? "TOO MUCH! EASE OFF!" : zone ? "IN THE ZONE..." : gauge > ZONE_LO - 0.2 ? "MORE!" : "WONK IT!").setColor(gauge > ZONE_HI ? "#f87171" : zone ? "#86efac" : "#ffffff");
      if (rate > 4 && Math.random() < 0.08) {
        const d = sc.add.text(320 + (Math.random() - 0.5) * 120, 200, "💦", { fontSize: "20px" }).setOrigin(0.5);
        ui.add(d);
        sweat.push(d);
        sc.tweens.add({ targets: d, y: 300, alpha: 0, duration: 700, onComplete: () => d.destroy() });
      }
      if (gauge >= OVER) return finish("over");
      if (inZone >= NEED) return finish("perfect");
      if (t >= TIME) return finish("under");
    },
  });

  const finish = (result: "perfect" | "over" | "under") => {
    if (done) return;
    done = true;
    tick.remove();
    window.removeEventListener("keydown", onKey);
    const label = { perfect: "PERFECT WONK!!!", over: "OVER-WONKED YOUR THANG", under: "UNDER-WONKED YOUR THANG" }[result];
    status.setText("");
    const big = sc.add.text(480, 270, label, { fontFamily: "Impact, sans-serif", fontSize: result === "perfect" ? "64px" : "44px", color: result === "perfect" ? "#ffffff" : "#f9a8d4", stroke: "#2a0030", strokeThickness: 10, align: "center" }).setOrigin(0.5).setScale(0.3);
    ui.add(big);
    sc.tweens.add({ targets: big, scale: 1, duration: 260, ease: "Back.out" });
    if (result !== "perfect") synth.play("trombone");
    sc.time.delayedCall(result === "perfect" ? 700 : 1100, () => {
      sc.tweens.add({ targets: ui, alpha: 0, duration: 220, onComplete: () => ui.destroy() });
      const n = w.now();
      if (result === "perfect") jetStream(p, n);
      else if (result === "over") overWonk(p, n);
      else underWonk(p, n);
    });
  };
}

/** Bosses and shields still respond to a burst whatever the outcome. */
function burstEffect(p: Player, now: number, r: number) {
  p.burstUntil = now + 1400;
  p.world.sc.events.emit("krezz-burst", r);
}

function overWonk(p: Player, now: number) {
  const w = p.world;
  burstEffect(p, now, 160);
  w.floatText(p.x, p.y - 60, "OVER-WONKED YOUR THANG", "#f9a8d4", 18);
  w.floatText(p.x, p.y - 40, "(a bit early, mate)", "#ffffff", 12);
  splats(p, 3, 18);
  w.aoe(p.x, p.y, 70, p.dmg(p.def.damage ?? 10, now), { knock: 120, noWonk: true, color: 0xffffff });
}

function underWonk(p: Player, now: number) {
  const w = p.world;
  burstEffect(p, now, 180);
  w.floatText(p.x, p.y - 60, "UNDER-WONKED YOUR THANG", "#f9a8d4", 18);
  w.floatText(p.x, p.y - 40, "*dribble*", "#ffffff", 12);
  const d = p.world.sc.add.circle(p.x + Math.cos(p.aim) * 14, p.y + 10, 5, 0xf5f5f0).setDepth(520);
  p.world.sc.tweens.add({ targets: d, y: d.y + 18, alpha: 0, duration: 700, onComplete: () => d.destroy() });
  w.aoe(p.x, p.y, 90, p.dmg(p.def.damage ?? 10, now) * 2, { knock: 140, noWonk: true, color: 0xffffff });
}

/** White splats: some on the floor, some right on the screen. */
function splats(p: Player, onScreen: number, onFloor: number) {
  const sc = p.world.sc;
  const tex = sc.textures.exists("fx_splat_white") ? "fx_splat_white" : null;
  for (let i = 0; i < onScreen; i++) {
    sc.time.delayedCall(i * 70, () => {
      const x = 80 + Math.random() * 800;
      const y = 60 + Math.random() * 400;
      const s = tex ? sc.add.image(x, y, tex) : sc.add.circle(x, y, 30, 0xf8f8f2);
      s.setScrollFactor(0).setDepth(2950).setAlpha(0.92).setRotation(Math.random() * Math.PI * 2);
      if (tex) (s as Phaser.GameObjects.Image).setDisplaySize(90 + Math.random() * 90, 90 + Math.random() * 90);
      s.setScale(s.scaleX * 0.2, s.scaleY * 0.2);
      sc.tweens.add({ targets: s, scaleX: s.scaleX * 5, scaleY: s.scaleY * 5, duration: 120, ease: "Back.out" });
      synth.play("splat");
      // drip, then fade
      sc.tweens.add({ targets: s, y: y + 50, delay: 600, duration: 2600, ease: "Sine.in" });
      sc.tweens.add({ targets: s, alpha: 0, delay: 2400, duration: 900, onComplete: () => s.destroy() });
    });
  }
  for (let i = 0; i < onFloor; i++) {
    const a = p.aim + (Math.random() - 0.5) * 0.6;
    const d = 30 + Math.random() * onFloor * 8;
    const x = p.x + Math.cos(a) * d;
    const y = p.y + Math.sin(a) * d;
    const s = tex ? sc.add.image(x, y, tex).setDisplaySize(26, 26) : sc.add.circle(x, y, 8, 0xf8f8f2);
    s.setDepth(4).setAlpha(0.85).setRotation(Math.random() * 6);
    sc.tweens.add({ targets: s, alpha: 0.35, delay: 8000, duration: 3000 });
  }
}

/** The good ending: a white jet stream that ploughs through everything in its path. */
function jetStream(p: Player, now: number) {
  const w = p.world;
  const sc = w.sc;
  const id = p.id;
  burstEffect(p, now, 320 * activeMods(G.s).burstRadiusMult);
  // aim it at the boss if there is one, else the nearest enemy, else where you're facing
  const boss = w.enemies.find((e) => e.isBoss && !e.dead);
  const tgt = boss ?? w.nearestEnemy(p.x, p.y, 900);
  let ang = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : p.aim;
  const LEN = 1100;
  const WIDTH = 34;
  synth.play("jet");
  w.shake(1300, 0.012);
  sc.cameras.main.flash(120, 255, 255, 255);
  w.floatText(p.x, p.y - 70, "WONK IT 'TIL YOU KREZZ!", "#ffffff", 24);
  const g = sc.add.graphics().setDepth(590);
  const st = { len: 0, life: 1 };
  sc.tweens.add({ targets: st, len: LEN, duration: 220, ease: "Quad.out" });
  sc.tweens.add({ targets: st, life: 0, delay: 1300, duration: 300 });
  const hit = new Map<unknown, number>();
  let ticks = 0;
  const ev = sc.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      // a slight wobble as it goes
      const a = ang + Math.sin(sc.time.now / 70) * 0.04;
      g.clear();
      const x2 = p.x + Math.cos(a) * st.len;
      const y2 = p.y + Math.sin(a) * st.len;
      g.lineStyle(WIDTH * 2.2 * st.life, 0xffffff, 0.22);
      g.lineBetween(p.x, p.y, x2, y2);
      g.lineStyle(WIDTH * st.life, 0xf8f8f2, 0.9);
      g.lineBetween(p.x, p.y, x2, y2);
      g.lineStyle(WIDTH * 0.35 * st.life, 0xffffff, 1);
      g.lineBetween(p.x, p.y, x2, y2);
      // droplets peeling off
      if (Math.random() < 0.6) {
        const k = Math.random();
        const dx = p.x + (x2 - p.x) * k;
        const dy = p.y + (y2 - p.y) * k;
        const drop = sc.add.circle(dx, dy, 3 + Math.random() * 4, 0xffffff).setDepth(591);
        sc.tweens.add({ targets: drop, x: dx + (Math.random() - 0.5) * 60, y: dy + 20 + Math.random() * 40, alpha: 0, duration: 500, onComplete: () => drop.destroy() });
      }
      // damage everything in the beam, a few times a second
      if (++ticks % 7 === 0 && st.life > 0.2) {
        for (const e of [...w.enemies]) {
          if (e.dead) continue;
          const ex = e.x - p.x;
          const ey = e.y - p.y;
          const along = ex * Math.cos(a) + ey * Math.sin(a);
          const across = Math.abs(-ex * Math.sin(a) + ey * Math.cos(a));
          if (along < 0 || along > st.len || across > WIDTH + e.radius) continue;
          const n = (hit.get(e) ?? 0) + 1;
          hit.set(e, n);
          const dmg = p.dmg(p.def.damage ?? 10, now) * 3 + (e.isBoss ? e.maxHp * 0.025 : 0);
          w.damageEnemy(e, dmg, { knock: 220, angle: a, crit: n === 1, noWonk: true, label: id === "KREBLIS" ? "99" : undefined });
          if (n === 1) w.burst(e.x, e.y, 0xffffff, 10);
        }
      }
      if (st.life <= 0.01) {
        ev.remove();
        g.destroy();
      }
    },
  });
  // nudge it towards the target as it moves
  sc.time.addEvent({
    delay: 50,
    repeat: 30,
    callback: () => {
      const t2 = boss && !boss.dead ? boss : w.nearestEnemy(p.x, p.y, 900);
      if (t2) {
        const want = Math.atan2(t2.y - p.y, t2.x - p.x);
        ang += Phaser.Math.Angle.Wrap(want - ang) * 0.12;
      }
    },
  });
  splats(p, 10, 26);
}
