import Phaser from "phaser";
import { Boss } from "./Bosses";
import type { CombatWorld } from "./types";
import { synth } from "../audio/Synth";
import { hasVfx, vfx } from "../gfx/Vfx";
import { BOSS_TEXT } from "../../content/bosses";

/** What he has the AI generate, in order (it cycles). */
const SUMMONS: { ask: string; ai: string; reply: string; col: string; spawn: [string, number][] }[] = [
  { ask: "GROK! GENERATE PITBULLS!", ai: "GROK", reply: "say less king 🐕🔥", col: "#f2f2f2", spawn: [["ai_pitbull", 2]] },
  { ask: "CHATGPT! GENERATE THE NEWS!", ai: "CHATGPT", reply: "Certainly! Here's the news: 📰", col: "#7fffd4", spawn: [["idf", 1], ["hamas", 1]] },
  { ask: "CLAUDE! GENERATE MORE MACS!", ai: "CLAUDE", reply: "I'd rather not… but here are some generic men in macs.", col: "#f4b48c", spawn: [["nonce", 2]] },
  { ask: "GROK! GENERATE BOMBERS!", ai: "GROK", reply: "unfiltered bombers incoming 💥", col: "#f2f2f2", spawn: [["kamikaze", 2]] },
  { ask: "CHATGPT! GENERATE DRONES!", ai: "CHATGPT", reply: "Sure! Here are 2 drones. Want more?", col: "#7fffd4", spawn: [["news_drone", 2]] },
  { ask: "CLAUDE! GENERATE A DEEPFAKE!", ai: "CLAUDE", reply: "Okay, but I'm adding a watermark.", col: "#f4b48c", spawn: [["deepfake_anchor", 1], ["ai_pitbull_spider", 1]] },
];
const PLASMA = 0x39ff5a;

/**
 * DRONGUS B. DRIPPIN', PHASE ONE: the inner sanctum, top-down. He has the DRONGUS GUN (the plasma cannon from the
 * Lair) and his AI on speed-dial. A fixed, learnable cycle:
 *   1. PLASMA VOLLEY  green aim lines, then bolts down them (step out of the lines)
 *   2. GENERATE       "GROK / CLAUDE / CHATGPT, GENERATE…" (a few of the dungeon's AI monsters)
 *   3. SWEEP          the whole arc is shown first, then the beam sweeps across it (get behind him / out of the arc)
 *   4. MEGA SHOT      a long charge, the aim locks on just before it fires (move when it locks)
 *   5. RELOADING      he stops, gun venting: your window (he takes extra damage)
 * At 66% and 33% HP it speeds up and adds more (two-way sweeps, a ring after the mega shot).
 * Beaten, he doesn't die: he legs it out the back door and up the stairs (runAway, called by the scene).
 */
export class DrongusPhaseOneBoss extends Boss {
  /** The scene skips the usual boss-death bang for this one. */
  quietDefeat = true;
  private gun: Phaser.GameObjects.Image | null = null;
  private aim = 0;
  private vulnerableUntil = 0;
  private summonIdx = 0;
  private sweep: { from: number; to: number; start: number; dur: number; g: Phaser.GameObjects.Graphics } | null = null;
  private lockAim: number | null = null;

  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "drongus1", x, y, 2600, "boss_drongus", 32, 0xffd23f, 32, 48);
    this.setScale(3);
    this.thresholds = [0.66, 0.33];
    this.def = { ...this.def, shout: BOSS_TEXT.drongus1.taunts, shoutEvery: 4200 };
    if (w.sc.textures.exists("c7_drongus_gun")) this.gun = w.sc.add.image(x, y, "c7_drongus_gun").setScale(0.9).setDepth(this.depth + 1);
    this.on("destroy", () => {
      this.gun?.destroy();
      this.sweep?.g.destroy();
    });
  }

  incoming(amount: number, opts?: { source?: string }) {
    const a = super.incoming(amount, opts);
    return this.world.now() < this.vulnerableUntil ? a * 1.5 : a;
  }

  /** The muzzle of the Drongus Gun, in the world. */
  private muzzle(): [number, number] {
    const g = this.gun;
    const len = g ? g.displayWidth * 0.55 : 50;
    return [this.x + Math.cos(this.aim) * len, this.y - 10 + Math.sin(this.aim) * len];
  }

  /** Keep the gun in his hands, pointing where he's aiming. */
  private holdGun() {
    const g = this.gun;
    if (!g) return;
    const left = Math.cos(this.aim) < 0;
    g.setPosition(this.x + Math.cos(this.aim) * 14, this.y - 10 + Math.sin(this.aim) * 6).setRotation(this.aim).setFlipY(left).setDepth(this.depth + 1).setVisible(this.visible).setAlpha(this.alpha);
    if (this.world.now() < this.flashUntil) g.setTintFill(0xffffff);
    else if (this.world.now() < this.vulnerableUntil) g.setTint(0xff9b9b);
    else g.clearTint();
  }

  tick(dt: number, now: number) {
    if (this.dead) return;
    super.tick(dt, now);
    const p = this.world.player;
    if (this.lockAim === null) this.aim = Phaser.Math.Angle.RotateTo(this.aim, Math.atan2(p.y - this.y, p.x - this.x), 0.08);
    else this.aim = this.lockAim;
    // the sweep: a beam turning across the arc it showed you
    const sw = this.sweep;
    if (sw && this.started) {
      const t = (now - sw.start) / sw.dur;
      if (t >= 1) {
        sw.g.destroy();
        this.sweep = null;
        this.lockAim = null;
      } else if (t >= 0) {
        const a = Phaser.Math.Linear(sw.from, sw.to, t);
        this.lockAim = a;
        const [mx, my] = this.muzzle();
        sw.g.clear();
        sw.g.lineStyle(30, PLASMA, 0.55).lineBetween(mx, my, mx + Math.cos(a) * 900, my + Math.sin(a) * 900);
        sw.g.lineStyle(10, 0xeaffea, 1).lineBetween(mx, my, mx + Math.cos(a) * 900, my + Math.sin(a) * 900);
        // does it touch you?
        const dx = p.x - mx;
        const dy = p.y - my;
        const along = dx * Math.cos(a) + dy * Math.sin(a);
        const across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
        if (along > 0 && along < 900 && across < 24) this.world.damagePlayer(Math.round(15 * this.dmgMult), { x: mx, y: my }, { label: "-PLASMA" });
      }
    }
    this.holdGun();
  }

  onPhase(n: number, now: number) {
    super.onPhase(n, now);
    this.world.toast(n === 1 ? "HE'S ANGRY" : "HE'S FURIOUS", n === 1 ? "Faster volleys. The sweep goes both ways now." : "More monsters. A ring of plasma after every mega shot.");
    this.world.floatText(this.x, this.y - 90, n === 1 ? "RIGHT. NO MORE MR NICE DRONGUS." : "GROK! CLAUDE! CHATGPT! GENERATE EVERYTHING!", "#ff6b6b", 20);
  }

  pattern(_dt: number, now: number) {
    const w = this.world;
    const p = w.player;
    const ts = w.enemyTimeScale;
    const b = w.bounds;
    // he keeps his distance and drifts around the middle of the room
    if (now < this.vulnerableUntil || this.sweep || this.lockAim !== null) this.halt();
    else {
      const tx = Phaser.Math.Clamp(b.centerX + Math.sin(now / 2200) * 260, b.left + 120, b.right - 120);
      const ty = Phaser.Math.Clamp(b.top + 200 + Math.cos(now / 3100) * 70, b.top + 120, b.bottom - 220);
      const d = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
      if (d > 10) this.moveToward(tx, ty, Math.min(90, d) * ts);
      else this.halt();
    }
    this.setFlipX(p.x < this.x);
    if (now < this.nextPattern) return;
    const tele = 850 * w.telegraphMult;
    const fast = this.phase >= 1;
    const step = this.patternIdx++ % 5;
    if (step === 0) {
      // PLASMA VOLLEY: aim lines first, bolts down them
      const n = fast ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const at = tele * 0.6 + i * (fast ? 300 : 420);
        this.scene.time.delayedCall(i * (fast ? 300 : 420), () => {
          if (this.dead || !this.active) return;
          const [mx, my] = this.muzzle();
          const a = Math.atan2(p.y - my, p.x - mx);
          w.enemyLine(mx, my, a, 900, 30, 0, tele * 0.6);
          synth.play("telegraph");
          this.scene.time.delayedCall(tele * 0.6, () => {
            if (this.dead || !this.active) return;
            this.fire(a, 380, 16, 2.6);
          });
        });
        void at;
      }
      w.floatText(this.x, this.y - 80, "PLASMA!", "#7dff8a", 16);
      this.nextPattern = now + tele * 0.6 + n * (fast ? 300 : 420) + 900;
    } else if (step === 1) {
      // GENERATE: the AI makes him some friends
      const live = w.enemies.filter((e) => !e.dead && !e.isBoss).length;
      const sm = SUMMONS[this.summonIdx++ % SUMMONS.length];
      w.floatText(this.x, this.y - 90, sm.ask, "#ffd23f", 16);
      synth.play("tannoy");
      this.scene.time.delayedCall(700, () => {
        if (this.dead || !this.active) return;
        w.floatText(this.x, this.y - 64, `${sm.ai}: ${sm.reply}`, sm.col, 13);
        if (live >= 7) return;
        const more = this.phase >= 2 ? 1 : 0;
        for (const [type, n] of sm.spawn)
          for (let i = 0; i < n + more; i++) {
            const x = Phaser.Math.Clamp(this.x + (Math.random() - 0.5) * 420, b.left + 60, b.right - 60);
            const y = Phaser.Math.Clamp(this.y + 60 + Math.random() * 160, b.top + 60, b.bottom - 60);
            if (hasVfx(this.scene, "vfx_smoke")) vfx(this.scene, "vfx_smoke", x, y + 10, { scale: 0.9, depth: 3, tint: 0xd8b4fe });
            w.spawnEnemy(type, x, y, { minion: true });
          }
      });
      this.nextPattern = now + 1900;
    } else if (step === 2) {
      // SWEEP: the whole arc first, then the beam turns across it
      const [mx, my] = this.muzzle();
      const mid = Math.atan2(p.y - my, p.x - mx);
      const half = 0.85;
      const dir = this.phase >= 1 && this.patternIdx % 2 ? -1 : 1;
      const from = mid - half * dir;
      const to = mid + half * dir;
      const warn = this.scene.add.graphics().setDepth(4);
      warn.fillStyle(0xff3333, 0.16).slice(mx, my, 900, Math.min(from, to), Math.max(from, to), false).fillPath();
      warn.lineStyle(2, 0xff3333, 0.8).slice(mx, my, 900, Math.min(from, to), Math.max(from, to), false).strokePath();
      w.floatText(this.x, this.y - 80, "SWEEP! (GET BEHIND HIM)", "#fca5a5", 16);
      synth.play("telegraph");
      this.lockAim = from;
      const g = this.scene.add.graphics().setDepth(950).setBlendMode(Phaser.BlendModes.ADD);
      const start = now + tele + 200;
      const dur = fast ? 1100 : 1400;
      this.sweep = { from, to, start, dur, g };
      this.scene.time.delayedCall(tele + 200, () => {
        warn.destroy();
        if (!this.dead) synth.play("gun_rail");
      });
      // in a temper it sweeps straight back again
      if (this.phase >= 1)
        this.scene.time.delayedCall(tele + 200 + dur + 250, () => {
          if (this.dead || !this.active || this.sweep) return;
          const g2 = this.scene.add.graphics().setDepth(950).setBlendMode(Phaser.BlendModes.ADD);
          this.sweep = { from: to, to: from, start: this.world.now(), dur, g: g2 };
          synth.play("gun_rail");
        });
      this.nextPattern = now + tele + 200 + dur * (this.phase >= 1 ? 2 : 1) + 1000;
    } else if (step === 3) {
      // MEGA SHOT: long charge, the aim locks just before it fires
      const charge = 1700 * w.telegraphMult;
      const lockAt = charge - 450;
      const [mx0, my0] = this.muzzle();
      const orb = this.scene.add.circle(mx0, my0, 18, PLASMA, 0.85).setDepth(951).setBlendMode(Phaser.BlendModes.ADD).setScale(0.1);
      const follow = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => orb.active && orb.setPosition(...this.muzzle()) });
      this.scene.tweens.add({ targets: orb, scale: 2.4, duration: charge, ease: "Quad.in" });
      const cap = this.scene.add.text(this.x, this.y - 110, "MEGA SHOT CHARGING…", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#7dff8a", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setDepth(1500);
      this.scene.tweens.add({ targets: cap, alpha: 0.4, yoyo: true, repeat: -1, duration: 160 });
      synth.play("alarm");
      this.halt();
      this.scene.time.delayedCall(lockAt, () => {
        if (this.dead || !this.active) return;
        const [mx, my] = this.muzzle();
        const a = Math.atan2(p.y - my, p.x - mx);
        this.lockAim = a;
        cap.setText("LOCKED! MOVE!").setColor("#ff4d4d");
        w.enemyLine(mx, my, a, 1400, 96, Math.round(34), 450);
      });
      this.scene.time.delayedCall(charge, () => {
        follow.remove();
        orb.destroy();
        cap.destroy();
        if (this.dead || !this.active) return;
        const [mx, my] = this.muzzle();
        const a = this.lockAim ?? this.aim;
        synth.play("gun_bfk");
        synth.play("boom");
        w.shake(500, 0.025);
        this.scene.cameras.main.flash(180, 120, 255, 140);
        if (hasVfx(this.scene, "vfx_muzzle")) vfx(this.scene, "vfx_muzzle", mx, my, { scale: 2.4, depth: 952, tint: PLASMA, add: true });
        const beam = this.scene.add.graphics().setDepth(950).setBlendMode(Phaser.BlendModes.ADD);
        beam.lineStyle(90, PLASMA, 0.6).lineBetween(mx, my, mx + Math.cos(a) * 1400, my + Math.sin(a) * 1400);
        beam.lineStyle(34, 0xeaffea, 1).lineBetween(mx, my, mx + Math.cos(a) * 1400, my + Math.sin(a) * 1400);
        this.scene.tweens.add({ targets: beam, alpha: 0, duration: 450, onComplete: () => beam.destroy() });
        this.lockAim = null;
        if (this.phase >= 2) this.scene.time.delayedCall(200, () => !this.dead && this.ring(16, 180, 11, PLASMA, Math.random()));
      });
      this.nextPattern = now + charge + 900;
    } else {
      // RELOADING: the gun vents. Your window.
      this.vulnerableUntil = now + (fast ? 1700 : 2300);
      this.halt();
      w.floatText(this.x, this.y - 90, "RELOADING… (HIT HIM!)", "#fde047", 18);
      for (let i = 0; i < 5; i++) this.scene.time.delayedCall(i * 380, () => !this.dead && this.gun && hasVfx(this.scene, "vfx_smoke") && vfx(this.scene, "vfx_smoke", this.muzzle()[0], this.muzzle()[1], { scale: 0.6, depth: 952, tint: 0x9cffb0 }));
      this.nextPattern = now + (fast ? 1700 : 2300) + 300;
    }
  }

  /** One plasma bolt down a line. */
  private fire(a: number, speed: number, dmg: number, scale: number) {
    const [mx, my] = this.muzzle();
    synth.play("gun_bfk");
    this.world.shoot(mx, my, { owner: "enemy", damage: dmg, speed, angle: a, color: PLASMA, scale, life: 3500 });
    if (hasVfx(this.scene, "vfx_muzzle")) vfx(this.scene, "vfx_muzzle", mx, my, { scale: 1.4, depth: 952, tint: PLASMA, add: true });
    this.scene.tweens.add({ targets: this, x: this.x - Math.cos(a) * 8, duration: 60, yoyo: true });
  }

  /** Beaten: he doesn't fall over, he stays put (the scene runs his escape). */
  kill() {
    this.dead = true;
    this.hpBar?.destroy();
    this.disableBody(true, false);
    this.sweep?.g.destroy();
    this.sweep = null;
    this.clearTint();
  }

  /** Off he runs, out of the door at the back and up the stairs. */
  runAway(doorX: number, doorY: number): Promise<void> {
    const sc = this.scene;
    return new Promise((resolve) => {
      this.setFlipX(doorX < this.x);
      const lines = ["PHASE ONE!", "THAT WAS PHASE ONE!", "YOU'LL NEVER GET THE LOGS!"];
      lines.forEach((t, i) => sc.time.delayedCall(i * 520, () => this.active && this.world.floatText(this.x, this.y - 90, t, "#ff6b6b", 16)));
      const dur = Math.max(900, Phaser.Math.Distance.Between(this.x, this.y, doorX, doorY) * 3);
      sc.tweens.add({ targets: this, x: doorX, y: doorY + 30, duration: dur, ease: "Sine.inOut", onUpdate: () => this.holdGun() });
      sc.tweens.add({ targets: this, angle: { from: -6, to: 6 }, yoyo: true, repeat: Math.floor(dur / 160), duration: 80 });
      sc.time.delayedCall(dur, () => {
        synth.play("door");
        sc.tweens.add({ targets: [this, this.gun].filter(Boolean), alpha: 0, scale: "*=0.8", duration: 350, onComplete: () => resolve() });
      });
    });
  }
}
