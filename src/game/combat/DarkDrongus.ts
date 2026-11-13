import Phaser from "phaser";
import { Boss } from "./Bosses";
import type { CombatWorld } from "./types";
import { synth } from "../audio/Synth";
import { G } from "../G";
import { hasVfx, vfx } from "../gfx/Vfx";
import { BOSS_TEXT } from "../../content/bosses";
import { ENEMIES } from "../../data/enemies";
import { DD_BEAM, DD_BLAST, DD_FLIP, DD_GRENADE, DD_KREZZ, DD_PUNCH, DD_SUMMON, DD_TAUNTS, MINI_SHOUTS } from "../../content/finaleRoof";

const GOLD = 0xffd23f;
const PALE = 0xfff3b0;

// The boss's name plate and the mini drongi: registered here so the shared tables don't need editing.
BOSS_TEXT.dark_drongus ??= { id: "dark_drongus", name: "DARK DRONGUS", title: "On The Juice · Invulnerable · Head Like A Wheelie Bin", intro: [], outro: [], taunts: DD_TAUNTS };
ENEMIES.mini_drongus ??= {
  id: "mini_drongus",
  name: "Mini Drongus",
  behavior: "chaser",
  hp: 70,
  speed: 150,
  damage: 12,
  size: 24,
  color: 0xf1c7a5,
  accent: 0xc2410c,
  shape: "humanoid",
  coins: 3,
  krezz: 6,
  shout: MINI_SHOUTS,
};

/** Frames in boss_dark_drongus (128x128): an aura-flickering idle, then a punch. */
export const DD_IDLE = [0, 1, 2, 3, 4, 5, 6, 7];
export const DD_PUNCH_F = [8, 9, 10, 11, 12, 13, 14, 15];

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/**
 * DARK DRONGUS (the roof). Huge, gold, hollow-eyed, and INVULNERABLE: everything bounces off ("IMMUNE"). You win by
 * freeing the lads (the RoofArena does that) and then the group wonk. He stalks you round the roof and cycles:
 *   PUNCH (a lunge at you down a telegraphed lane, a shockwave where it lands) → GOLDEN BLAST (fans of juice balls)
 *   → GRENADES (lobbed, a ring where each lands) → PUNCH → MINI DRONGI → the KREZZ BEAM (he wonks, censored, then a
 *   beam sweeps right round him; clockwise or anticlockwise, and now and then it flips mid-sweep).
 * `rage` (0..1, how many lads are free) makes everything faster and nastier.
 */
export class DarkDrongusBoss extends Boss {
  /** Set by the arena: where the roof is (he stays on it). */
  arena = { x: 0, y: 0, r: 400 };
  /** 0..1: how many of the lads you've freed. */
  rage = 0;
  /** True while the arena's running a cutscene or the group wonk: he just stands there glowing. */
  frozen = false;
  private art: boolean;
  private lastImmune = 0;
  private aura: Phaser.GameObjects.Ellipse;
  private censor: Phaser.GameObjects.Container | null = null;
  private beam: { g: Phaser.GameObjects.Graphics; a: number; dir: number; speed: number; until: number; flipAt: number; warned: boolean; lastHit: number } | null = null;
  private lunge: { vx: number; vy: number; until: number } | null = null;
  private punchUntil = 0;
  private wonkUntil = 0;
  private baseScale: number;

  constructor(w: CombatWorld, x: number, y: number) {
    const art = w.sc.textures.exists("boss_dark_drongus") && w.sc.textures.get("boss_dark_drongus").frameTotal > 2;
    super(w, "dark_drongus", x, y, 99999, art ? "boss_dark_drongus" : "boss_drongus", 70, GOLD, art ? 128 : 96, art ? 128 : 144);
    this.art = art;
    this.baseScale = art ? 1.75 : 1.6;
    this.setScale(this.baseScale);
    if (!art) this.setTint(0xffe28a);
    this.def = { ...this.def, damage: 12, shout: DD_TAUNTS, shoutEvery: 4200 };
    this.aura = w.sc.add.ellipse(x, y, 190, 240, GOLD, 0.16).setBlendMode(Phaser.BlendModes.ADD);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const fw = this.frame.width;
    body.setCircle(fw * 0.26, fw * 0.24, fw * 0.3);
    this.on("destroy", () => {
      this.aura.destroy();
      this.censor?.destroy();
      this.beam?.g.destroy();
    });
  }

  get radius() {
    return this.displayWidth * 0.24;
  }

  /** Nothing hurts him. Shots bounce off with a gold flash. */
  incoming(_amount: number, _opts?: { source?: string }) {
    const now = this.world.now();
    if (now - this.lastImmune > 140) {
      this.lastImmune = now;
      this.setTint(0xfff3b0);
      this.scene.time.delayedCall(50, () => this.active && !this.dead && (this.art ? this.clearTint() : this.setTint(0xffe28a)));
      if (Math.random() < 0.45) this.world.floatText(this.x + (Math.random() - 0.5) * 60, this.y - 50 - Math.random() * 30, "IMMUNE", "#ffd23f", 14);
      if (Math.random() < 0.5) synth.play("ding");
    }
    return 0;
  }

  /** Animate the sheet ourselves (Boss.tick flips between frames 0 and 1). */
  tick(dt: number, now: number) {
    if (this.dead) return;
    this.hp = this.maxHp;
    if (this.art) {
      const total = this.texture.frameTotal - 1;
      const punching = now < this.punchUntil && total > DD_PUNCH_F[DD_PUNCH_F.length - 1];
      const prog = 1 - (this.punchUntil - now) / 520;
      const f = punching ? DD_PUNCH_F[Math.min(DD_PUNCH_F.length - 1, Math.floor(prog * DD_PUNCH_F.length))] : DD_IDLE[Math.floor(now / 110) % DD_IDLE.length] % total;
      this.setFrame(f);
    }
    // the wonk: shake under a censor bar
    const wonking = now < this.wonkUntil;
    const jx = wonking ? (Math.random() - 0.5) * 6 : 0;
    this.setScale(this.baseScale * (1 + Math.sin(now / 180) * 0.012));
    this.aura.setPosition(this.x + jx, this.y + 6).setDepth(this.depth - 0.5);
    this.aura.setFillStyle(wonking ? 0xffffff : GOLD, (wonking ? 0.28 : 0.13) + Math.sin(now / 90) * 0.05 + this.rage * 0.06);
    this.aura.setScale(1 + Math.sin(now / 130) * 0.06 + this.rage * 0.15);
    if (this.censor) this.censor.setPosition(this.x + jx, this.y + this.displayHeight * 0.18).setDepth(this.depth + 1);
    if (!this.started) return;
    G_emit(this);
    if (this.frozen) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }
    this.pattern(dt, now);
    this.keepOnRoof();
  }

  private keepOnRoof() {
    const a = this.arena;
    const d = Math.hypot(this.x - a.x, this.y - a.y);
    const max = a.r - 110;
    if (d > max) {
      const k = max / d;
      this.setPosition(a.x + (this.x - a.x) * k, a.y + (this.y - a.y) * k);
    }
  }

  private get tele() {
    return 750 * this.world.telegraphMult * (1 - this.rage * 0.25);
  }

  private say(t: string, col = "#ffd23f", size = 16) {
    this.world.floatText(this.x, this.y - this.displayHeight / 2 - 14, t, col, size);
  }

  pattern(dt: number, now: number) {
    const w = this.world;
    const p = w.player;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.beam) return this.updateBeam(now);
    if (this.lunge) {
      if (now < this.lunge.until) body.setVelocity(this.lunge.vx, this.lunge.vy);
      else this.lunge = null;
      return;
    }
    if (now < this.wonkUntil || now < this.punchUntil) {
      body.setVelocity(0, 0);
      return;
    }
    // stalk
    const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
    if (d > 170) this.moveToward(p.x, p.y, (55 + this.rage * 45) * w.enemyTimeScale);
    else body.setVelocity(0, 0);
    this.setFlipX(p.x < this.x);
    void dt;
    if (now < this.nextPattern) return;
    const order = ["punch", "blast", "grenade", "punch", "summon", "beam", "blast", "punch", "grenade", "beam"];
    const step = order[this.patternIdx++ % order.length];
    if (step === "punch") this.punch(now);
    else if (step === "blast") this.blast(now);
    else if (step === "grenade") this.grenades(now);
    else if (step === "summon") this.summon(now);
    else this.startBeam(now);
  }

  // ---------------------------------------------------------------- PUNCH

  private punch(now: number) {
    const w = this.world;
    const p = w.player;
    const a = Math.atan2(p.y - this.y, p.x - this.x);
    const len = Phaser.Math.Clamp(Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) + 40, 160, 380);
    const tele = this.tele;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.say(pick(DD_PUNCH), "#fde047", 17);
    synth.play("telegraph");
    w.enemyLine(this.x, this.y, a, len, 90, 0, tele);
    const ex = this.x + Math.cos(a) * (len - 40);
    const ey = this.y + Math.sin(a) * (len - 40);
    w.enemyAoe(ex, ey, 95, Math.round(18 * this.dmgMult), tele + 260, GOLD);
    this.scene.time.delayedCall(tele, () => {
      if (this.dead || !this.active || this.frozen) return;
      this.punchUntil = this.world.now() + 520;
      synth.play("punch_big");
      this.lunge = { vx: Math.cos(a) * ((len - 40) / 0.26), vy: Math.sin(a) * ((len - 40) / 0.26), until: this.world.now() + 260 };
      this.scene.time.delayedCall(260, () => {
        if (this.dead || !this.active) return;
        w.shake(260, 0.016);
        synth.play("boom");
        if (hasVfx(this.scene, "vfx_dust")) vfx(this.scene, "vfx_dust", this.x, this.y + 40, { scale: 1.6, depth: this.depth - 1 });
        if (this.rage > 0.5) this.ring(10, 230, 9, GOLD, Math.random());
      });
    });
    this.nextPattern = now + tele + 900 - this.rage * 300;
  }

  // ---------------------------------------------------------------- GOLDEN BLAST

  private blast(now: number) {
    const w = this.world;
    this.say(pick(DD_BLAST), "#fde68a", 17);
    const volleys = 3 + Math.round(this.rage * 2);
    for (let v = 0; v < volleys; v++)
      this.scene.time.delayedCall(v * (420 - this.rage * 120), () => {
        if (this.dead || !this.active || this.frozen) return;
        synth.play("gun_bfk");
        const p = w.player;
        const base = Math.atan2(p.y - this.y, p.x - this.x) + (v % 2 ? 0.12 : -0.12);
        const n = 5;
        for (let i = 0; i < n; i++) w.shoot(this.x, this.y - 20, { owner: "enemy", damage: Math.round(9 * this.dmgMult), speed: 250 + this.rage * 80, angle: base + (i - (n - 1) / 2) * 0.24, color: GOLD, scale: 1.8, life: 3600 });
      });
    this.nextPattern = now + volleys * 420 + 700;
  }

  // ---------------------------------------------------------------- GRENADES

  private grenades(now: number) {
    const w = this.world;
    const sc = this.scene;
    this.say(pick(DD_GRENADE), "#fca5a5", 17);
    const n = 3 + Math.round(this.rage * 3);
    for (let i = 0; i < n; i++)
      sc.time.delayedCall(i * 170, () => {
        if (this.dead || !this.active || this.frozen) return;
        const p = w.player;
        const spread = i === 0 ? 0 : 150;
        let tx = p.x + (Math.random() - 0.5) * spread * 2;
        let ty = p.y + (Math.random() - 0.5) * spread * 2;
        const a = this.arena;
        const dd = Math.hypot(tx - a.x, ty - a.y);
        if (dd > a.r - 30) {
          tx = a.x + ((tx - a.x) * (a.r - 30)) / dd;
          ty = a.y + ((ty - a.y) * (a.r - 30)) / dd;
        }
        const fuse = 1000 * w.telegraphMult;
        synth.play("lob");
        w.enemyAoe(tx, ty, 80, Math.round(16 * this.dmgMult), fuse, 0xff6b2b);
        const key = sc.textures.exists("fr_grenade") ? "fr_grenade" : null;
        const g = key ? sc.add.image(this.x, this.y - 40, key).setScale(0.5) : sc.add.circle(this.x, this.y - 40, 7, 0x3f6212).setStrokeStyle(2, 0x111111);
        g.setDepth(900);
        const sx = this.x;
        const sy = this.y - 40;
        const st = { t: 0 };
        sc.tweens.add({
          targets: st,
          t: 1,
          duration: fuse * 0.75,
          onUpdate: () => {
            g.setPosition(sx + (tx - sx) * st.t, sy + (ty - sy) * st.t - Math.sin(st.t * Math.PI) * 160);
            g.setAngle(st.t * 720);
          },
          onComplete: () => {
            sc.tweens.add({ targets: g, scale: { from: g.scale, to: g.scale * 1.3 }, yoyo: true, repeat: 3, duration: 55, onComplete: () => g.destroy() });
            sc.time.delayedCall(fuse * 0.25, () => {
              synth.play("explode");
              w.boomFx?.(tx, ty, 0.8);
              w.shake(120, 0.008);
            });
          },
        });
      });
    this.nextPattern = now + n * 170 + 1300;
  }

  // ---------------------------------------------------------------- MINI DRONGI

  private summon(now: number) {
    const w = this.world;
    const live = w.enemies.filter((e) => !e.dead && !e.isBoss).length;
    this.say(pick(DD_SUMMON), "#fdba74", 17);
    synth.play("roar");
    const n = live >= 7 ? 0 : 2 + Math.round(this.rage * 2);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random();
      const x = this.x + Math.cos(ang) * 120;
      const y = this.y + Math.sin(ang) * 120;
      if (hasVfx(this.scene, "vfx_smoke")) vfx(this.scene, "vfx_smoke", x, y, { scale: 0.9, depth: 3, tint: GOLD });
      this.scene.time.delayedCall(300, () => !this.dead && w.spawnEnemy("mini_drongus", x, y, { minion: true, noDrops: Math.random() < 0.5 }));
    }
    this.nextPattern = now + 1300;
  }

  // ---------------------------------------------------------------- THE KREZZ BEAM

  /** Wonk (censored, shaking, glowing) and then a krezz beam that sweeps round him. */
  private startBeam(now: number) {
    const w = this.world;
    const sc = this.scene;
    const charge = 1500 * w.telegraphMult;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.wonkUntil = now + charge;
    this.say(pick(DD_BEAM), "#ffffff", 18);
    synth.charge();
    for (let i = 0; i < 4; i++) synth.voice(i % 2 ? "grunt" : "mmm", 0.45, 0.55 + i * 0.05, i * 0.35);
    this.censor?.destroy();
    const bar = sc.add.container(this.x, this.y);
    bar.add(sc.add.rectangle(0, 0, 92, 34, 0x000000));
    bar.add(sc.add.text(0, 0, "CENSORED", { fontFamily: "Impact, sans-serif", fontSize: "16px", color: "#ffffff" }).setOrigin(0.5));
    this.censor = bar;
    // which way will it go? It starts away from you (so you've a moment), the lane drawn faintly
    const dir = Math.random() < 0.5 ? 1 : -1;
    const p = w.player;
    const start = Math.atan2(p.y - this.y, p.x - this.x) - dir * (1.4 + Math.random() * 0.6);
    const ghost = sc.add.graphics().setDepth(5);
    const len = this.arena.r * 2.2;
    ghost.lineStyle(48, 0xffffff, 0.12).lineBetween(this.x, this.y, this.x + Math.cos(start) * len, this.y + Math.sin(start) * len);
    ghost.lineStyle(2, 0xffffff, 0.6).lineBetween(this.x, this.y, this.x + Math.cos(start) * len, this.y + Math.sin(start) * len);
    // an arrow showing the way it'll sweep
    const arrow = sc.add.text(this.x + Math.cos(start + dir * 0.5) * 150, this.y + Math.sin(start + dir * 0.5) * 150, dir > 0 ? "↻" : "↺", { fontFamily: FONTLESS, fontSize: "56px", color: "#ffffff" }).setOrigin(0.5).setDepth(906);
    sc.tweens.add({ targets: [ghost, arrow], alpha: { from: 0.3, to: 1 }, yoyo: true, repeat: -1, duration: 160 });
    this.nextPattern = Number.MAX_SAFE_INTEGER;
    sc.time.delayedCall(charge, () => {
      ghost.destroy();
      arrow.destroy();
      this.censor?.destroy();
      this.censor = null;
      if (this.dead || !this.active || this.frozen) {
        this.nextPattern = this.world.now() + 800;
        return;
      }
      this.say(pick(DD_KREZZ), "#ffffff", 26);
      synth.laser(4);
      sc.cameras.main.flash(120, 255, 255, 255);
      const t = this.world.now();
      const dur = 4200 + this.rage * 1600;
      const flip = Math.random() < 0.35 + this.rage * 0.4;
      this.beam = { g: sc.add.graphics().setDepth(905).setBlendMode(Phaser.BlendModes.ADD), a: start, dir, speed: 0.95 + this.rage * 0.35, until: t + dur, flipAt: flip ? t + dur * (0.35 + Math.random() * 0.3) : Infinity, warned: false, lastHit: 0 };
    });
  }

  private updateBeam(now: number) {
    const b = this.beam!;
    const w = this.world;
    const sc = this.scene;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (now >= b.until || this.frozen) {
      b.g.destroy();
      this.beam = null;
      this.nextPattern = now + 900;
      return;
    }
    // a warning shout just before it reverses
    if (!b.warned && now > b.flipAt - 450) {
      b.warned = true;
      this.say(pick(DD_FLIP), "#ff6b6b", 22);
      synth.play("alarm");
    }
    if (now >= b.flipAt) {
      b.dir *= -1;
      b.flipAt = Infinity;
      w.shake(200, 0.01);
    }
    b.a += b.dir * b.speed * (16 / 1000) * w.enemyTimeScale;
    const len = this.arena.r * 2.2;
    const a = b.a + Math.sin(now / 50) * 0.015;
    const ox = this.x;
    const oy = this.y - 10;
    const x2 = ox + Math.cos(a) * len;
    const y2 = oy + Math.sin(a) * len;
    const g = b.g.clear();
    g.lineStyle(70, 0xffffff, 0.16).lineBetween(ox, oy, x2, y2);
    g.lineStyle(38, 0xfff7d6, 0.75).lineBetween(ox, oy, x2, y2);
    g.lineStyle(14, 0xffffff, 1).lineBetween(ox, oy, x2, y2);
    if (Math.random() < 0.5) {
      const k = Math.random();
      const d = sc.add.circle(ox + (x2 - ox) * k, oy + (y2 - oy) * k, 3 + Math.random() * 4, 0xffffff).setDepth(904);
      sc.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 50, y: d.y + 20 + Math.random() * 30, alpha: 0, duration: 450, onComplete: () => d.destroy() });
    }
    w.shake(60, 0.003);
    // does it catch you?
    const p = w.player;
    const ex = p.x - ox;
    const ey = p.y - oy;
    const along = ex * Math.cos(a) + ey * Math.sin(a);
    const across = Math.abs(-ex * Math.sin(a) + ey * Math.cos(a));
    if (along > 0 && across < 30 && now - b.lastHit > 450) {
      b.lastHit = now;
      w.damagePlayer(Math.round(14 * this.dmgMult), { x: p.x - Math.cos(a) * 10, y: p.y - Math.sin(a) * 10 }, { label: "-KREZZED" });
    }
  }

  /** The arena calls this for cutscenes: stop everything that's mid-air. */
  calm() {
    this.beam?.g.destroy();
    this.beam = null;
    this.lunge = null;
    this.censor?.destroy();
    this.censor = null;
    this.wonkUntil = 0;
    this.punchUntil = 0;
    (this.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    this.nextPattern = this.world.now() + 1500;
  }

  /** He never dies the normal way (the group krezz does it, in the cutscene). */
  kill() {
    this.hp = this.maxHp;
  }
}

const FONTLESS = "sans-serif";

/** The boss bar: always full. */
function G_emit(b: DarkDrongusBoss) {
  G.emit("boss", { name: "DARK DRONGUS (INVULNERABLE)", hp: b.maxHp, max: b.maxHp, shielded: true, phase: 0 });
}
