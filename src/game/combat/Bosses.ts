import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { CombatWorld } from "./types";
import type { EnemyDef } from "../../data/enemies";
import { BOSS_TEXT, DRONGUS_PHASES, FAKE_SONGS } from "../../content/bosses";
import { synth } from "../audio/Synth";
import { G } from "../G";
import { BAN_RULES } from "../systems/ban";

const bossDef = (id: string, hp: number, size: number, color: number, speed = 60, damage = 18): EnemyDef => ({
  id,
  name: BOSS_TEXT[id]?.name ?? id,
  behavior: "chaser",
  hp,
  speed,
  damage,
  size,
  color,
  accent: 0xffffff,
  shape: "blob",
  coins: 120,
  krezz: 40,
});

export abstract class Boss extends Enemy {
  bossId: string;
  phase = 0;
  shielded = false;
  thresholds = [0.6, 0.3];
  nextPattern = 0;
  patternIdx = 0;
  started = false;
  protected anim = 0;

  constructor(world: CombatWorld, id: string, x: number, y: number, hp: number, texture: string, size: number, color: number, w: number, h: number) {
    super(world, id, x, y, G.s.ngPlus > 0 ? 1.4 : 1, bossDef(id, hp, size, color), texture);
    this.bossId = id;
    this.isBoss = true;
    this.setScale(2);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const k = this.frame.width / w; // >1 for PixelLab art drawn at display size
    body.setSize(w * 0.7 * k, h * 0.6 * k).setOffset(w * 0.15 * k, h * 0.3 * k);
    body.setCollideWorldBounds(true);
    body.pushable = false;
    this.setDepth(450);
    this.nextPattern = world.now() + 1500;
  }

  get radius() {
    return this.displayWidth * 0.32;
  }

  taunt() {
    const t = BOSS_TEXT[this.bossId]?.taunts ?? [];
    if (t.length) this.world.floatText(this.x, this.y - this.displayHeight / 2 - 10, t[Math.floor(Math.random() * t.length)], "#ff6666", 16);
  }

  tick(dt: number, now: number) {
    if (this.dead || !this.started) return;
    this.anim += dt;
    if (this.anim > 300) {
      this.anim = 0;
      this.setFrame(String(this.frame.name) === "0" ? 1 : 0);
    }
    if (now < this.flashUntil) this.setTintFill(0xffffff);
    else if (this.shielded) this.setTint(0x88aaff);
    else this.clearTint();
    const frac = this.hp / this.maxHp;
    while (this.phase < this.thresholds.length && frac < this.thresholds[this.phase]) {
      this.phase++;
      this.onPhase(this.phase, now);
    }
    this.pattern(dt, now);
    G.emit("boss", { name: BOSS_TEXT[this.bossId]?.name ?? this.bossId, hp: this.hp, max: this.maxHp, shielded: this.shielded, phase: this.phase });
  }

  onPhase(_n: number, _now: number) {
    this.taunt();
    synth.play("roar");
    this.world.shake(300, 0.015);
  }

  abstract pattern(dt: number, now: number): void;

  /** Damage multiplier the boss applies to incoming damage. */
  incoming(amount: number, _opts?: { source?: string }): number {
    return this.shielded ? 0 : amount;
  }

  ring(n: number, speed: number, dmg: number, color: number, offset = 0) {
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      this.world.shoot(this.x, this.y, { owner: "enemy", damage: dmg, speed, angle: a, color, life: 4000 });
    }
  }

  fan(n: number, spread: number, speed: number, dmg: number, color: number) {
    const p = this.world.player;
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    for (let i = 0; i < n; i++) {
      this.world.shoot(this.x, this.y, { owner: "enemy", damage: dmg, speed, angle: base + (i - (n - 1) / 2) * spread, color, life: 4000 });
    }
  }

  moveToward(x: number, y: number, speed: number) {
    const a = Math.atan2(y - this.y, x - this.x);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    this.setFlipX(Math.cos(a) < 0);
  }

  halt() {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }
}

// ----------------------------------------------------------------- THE SALMON SOVEREIGN

export class SalmonSovereign extends Boss {
  private dashUntil = 0;
  private sdAngle = 0;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "salmon", x, y, 1300, "boss_salmon", 72, 0xff7f6a, 72, 48);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const ts = this.world.enemyTimeScale;
    if (now < this.dashUntil) {
      this.moveToward(this.x + Math.cos(this.sdAngle) * 100, this.y + Math.sin(this.sdAngle) * 100, 560 * ts);
      return;
    }
    this.moveToward(p.x, p.y, (this.phase ? 85 : 60) * ts);
    if (now < this.nextPattern) return;
    const tele = 800 * this.world.telegraphMult;
    const pick = this.patternIdx++ % (this.phase ? 4 : 3);
    this.taunt();
    if (pick === 0) {
      this.halt();
      this.sdAngle = Math.atan2(p.y - this.y, p.x - this.x);
      this.world.enemyLine(this.x, this.y, this.sdAngle, 520, 70, 0, tele);
      this.world.sc.time.delayedCall(tele, () => (this.dashUntil = this.world.now() + 650));
      this.nextPattern = now + tele + 1600;
    } else if (pick === 1) {
      const n = this.phase ? 9 : 6;
      for (let i = 0; i < n; i++) {
        const x = p.x + (Math.random() - 0.5) * 300;
        const y = p.y + (Math.random() - 0.5) * 300;
        this.world.enemyAoe(x, y, 46, 16, tele + i * 80, 0xff7f6a);
      }
      this.nextPattern = now + 2200;
    } else if (pick === 2) {
      for (let i = 0; i < (this.phase ? 5 : 4); i++) this.world.spawnEnemy("smolt", this.x + (Math.random() - 0.5) * 80, this.y + 40, { noDrops: false, minion: true });
      this.nextPattern = now + 2400;
    } else {
      this.ring(14, 170, 10, 0xff9a86, now / 500);
      this.world.sc.time.delayedCall(400, () => this.ring(14, 170, 10, 0xff9a86, now / 500 + 0.2));
      this.nextPattern = now + 2000;
    }
  }
}

// ----------------------------------------------------------------- THE POLSON–EDEN FEEDBACK LOOP

export class FeedbackLoop extends Boss {
  terminals: { zone: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; name: string; approvedAt: number; progress: number; arrow: Phaser.GameObjects.Text }[] = [];
  vulnerableUntil = 0;
  fields: { c: Phaser.GameObjects.Arc; until: number }[] = [];
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "feedback", x, y, 1050, "boss_feedback", 80, 0x1877f2, 80, 64);
    this.shielded = true;
    const b = w.bounds;
    const mk = (tx: number, name: string, col: number) => {
      const zone = w.sc.add.rectangle(tx, b.centerY + 120, 90, 70, col, 0.25).setStrokeStyle(3, col).setDepth(3);
      const label = w.sc.add.text(tx, b.centerY + 120, `${name}\nAPPROVAL\n0%`, { fontFamily: "monospace", fontSize: "11px", color: "#ffffff", align: "center" }).setOrigin(0.5).setDepth(4);
      const arrow = w.sc.add.text(tx, b.centerY + 60, "▼", { fontFamily: "monospace", fontSize: "26px", color: "#ffd23f" }).setOrigin(0.5).setDepth(4);
      w.sc.tweens.add({ targets: arrow, y: arrow.y + 10, yoyo: true, repeat: -1, duration: 400 });
      this.terminals.push({ zone, label, name, approvedAt: 0, progress: 0, arrow });
    };
    mk(b.left + 110, "POLSON", 0xf2e6a0);
    mk(b.right - 110, "EDEN", 0xff6f91);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const window = this.phase >= 1 ? 5000 : 7000;
    // approval terminals
    for (const t of this.terminals) {
      const inside = t.zone.getBounds().contains(p.x, p.y);
      if (this.shielded && inside) t.progress = Math.min(1, t.progress + dt / 600);
      else if (t.progress < 1) t.progress = Math.max(0, t.progress - dt / 1500);
      if (t.progress >= 1 && !t.approvedAt) {
        t.approvedAt = now;
        synth.play("pop");
        this.world.floatText(t.zone.x, t.zone.y - 50, `${t.name}: APPROVED`, "#5ad35a", 14);
      }
      if (t.approvedAt && now - t.approvedAt > window && this.shielded) {
        t.approvedAt = 0;
        t.progress = 0;
        this.world.floatText(t.zone.x, t.zone.y - 50, `${t.name}: APPROVAL REVOKED`, "#ff6666", 14);
      }
      t.label.setText(`${t.name}\nAPPROVAL\n${t.approvedAt ? "✓" : Math.round(t.progress * 100) + "%"}`);
      t.arrow.setVisible(this.shielded && !t.approvedAt);
    }
    if (this.shielded && this.terminals.every((t) => t.approvedAt)) {
      this.shielded = false;
      this.vulnerableUntil = now + 6500;
      this.world.toast("DOCUMENT APPROVED", "Both custodians approved the same document. The Loop is exposed!");
      synth.play("ding");
    }
    if (!this.shielded && now > this.vulnerableUntil) {
      this.shielded = true;
      this.terminals.forEach((t) => {
        t.approvedAt = 0;
        t.progress = 0;
      });
      this.world.toast("REQUEST PENDING", "The Loop re-contradicts itself. Approve both terminals again.");
    }
    // indecision fields reverse controls
    this.fields = this.fields.filter((f) => {
      if (now > f.until) {
        this.world.sc.tweens.killTweensOf(f.c);
        f.c.destroy();
        return false;
      }
      if (Phaser.Math.Distance.Between(f.c.x, f.c.y, p.x, p.y) < f.c.radius) p.invertUntil = now + 250;
      return true;
    });
    // drift around the middle
    const b = this.world.bounds;
    this.moveToward(b.centerX + Math.cos(now / 1400) * 160, b.centerY - 80 + Math.sin(now / 900) * 60, 70 * this.world.enemyTimeScale);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 4;
    this.taunt();
    if (pick === 0) {
      // notification spiral
      for (let i = 0; i < 3; i++) this.world.sc.time.delayedCall(i * 250, () => this.ring(10, 150, 9, 0xff3b30, i * 0.3));
      this.nextPattern = now + 2200;
    } else if (pick === 1) {
      // INDECISION FIELD
      const c = this.world.sc.add.circle(p.x, p.y, 0, 0xa855f7, 0.25).setStrokeStyle(2, 0xa855f7).setDepth(3);
      this.world.sc.tweens.add({ targets: c, radius: 120, duration: 600 });
      const lbl = this.world.sc.add.text(p.x, p.y - 130, "INDECISION FIELD", { fontFamily: "monospace", fontSize: "12px", color: "#d8b4fe" }).setOrigin(0.5).setDepth(4);
      this.world.sc.tweens.add({ targets: lbl, alpha: 0, delay: 2500, duration: 600, onComplete: () => lbl.destroy() });
      this.fields.push({ c, until: now + 4500 });
      this.nextPattern = now + 1800;
    } else if (pick === 2) {
      // UNFRIEND
      const pl = this.world.player;
      this.world.shoot(this.x, this.y, {
        owner: "enemy",
        damage: 8,
        speed: 220,
        angle: Math.atan2(pl.y - this.y, pl.x - this.x),
        color: 0x9ca3af,
        scale: 2,
        homing: 1.4,
        life: 4000,
        onHit: () => {
          const now2 = this.world.now();
          if (pl.bongoUntil > now2) pl.bongoUntil = 0;
          else if (pl.loanUntil > now2) pl.loanUntil = 0;
          else if (pl.machineBuffUntil > now2) pl.machineBuffUntil = 0;
          else pl.wonk = Math.max(0, pl.wonk - 35);
          this.world.floatText(pl.x, pl.y - 40, "UNFRIENDED (buff removed)", "#9ca3af", 13);
        },
      });
      this.nextPattern = now + 1500;
    } else {
      for (let i = 0; i < (this.phase ? 4 : 3); i++) this.world.spawnEnemy(i % 2 ? "friend_crawler" : "pending_orb", this.x + (i - 1) * 50, this.y + 50, { minion: true });
      this.nextPattern = now + 2600;
    }
  }
  destroy(fromScene?: boolean) {
    this.terminals.forEach((t) => {
      t.zone.destroy();
      t.label.destroy();
      t.arrow.destroy();
    });
    this.fields.forEach((f) => {
      this.world.sc.tweens.killTweensOf(f.c);
      f.c.destroy();
    });
    super.destroy(fromScene);
  }
}

// ----------------------------------------------------------------- THE OVER-WONKED MACHINE

export class OverWonkedMachine extends Boss {
  valves: { spr: Phaser.GameObjects.Image; ready: number }[] = [];
  puddles: { c: Phaser.GameObjects.Ellipse; until: number }[] = [];
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "machine", x, y, 2000, "boss_machine", 96, 0x6b7280, 96, 80);
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    const b = w.bounds;
    for (const [vx, vy] of [
      [b.left + 120, b.centerY],
      [b.right - 120, b.centerY],
      [b.centerX, b.bottom - 120],
    ]) {
      const spr = w.sc.add.image(vx, vy, "p_valve").setScale(2.4).setDepth(5);
      this.valves.push({ spr, ready: 0 });
    }
  }
  /** Concentrated Krezz overloads the machine. */
  incoming(amount: number, _opts?: { source?: string }): number {
    const p = this.world.player;
    const now = this.world.now();
    const concentrated = now < p.burstUntil + 600 || now - (p.specialCd - (p.def.signature?.cooldown ?? 0)) < 1200;
    return amount * (concentrated ? 2 : 1);
  }
  hitValve(i: number, now: number) {
    const v = this.valves[i];
    if (!v || now < v.ready) return;
    v.ready = now + 7000;
    v.spr.setTexture("p_valve_open");
    this.world.sc.time.delayedCall(7000, () => v.spr.active && v.spr.setTexture("p_valve"));
    const a = Math.atan2(this.y - v.spr.y, this.x - v.spr.x);
    const g = this.world.sc.add.graphics().setDepth(6);
    g.lineStyle(26, 0xffb6c1, 0.7).lineBetween(v.spr.x, v.spr.y, this.x, this.y);
    this.world.sc.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });
    synth.play("explode");
    const mult = G.s.player === "SCROMBUS" ? 1.4 : 1;
    this.world.damageEnemy(this, 110 * mult, { label: "PRESSURE BLAST", crit: true });
    for (const e of this.world.enemies) if (!e.isBoss && !e.dead) this.world.damageEnemy(e, 30, { knock: 400, angle: a });
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    this.halt();
    // valves: hit by player melee/proximity + E or attack
    this.valves.forEach((v, i) => {
      if (now > v.ready && Phaser.Math.Distance.Between(v.spr.x, v.spr.y, p.x, p.y) < 50) {
        v.spr.setTint(0xffff88);
        if ((p as any).attackAnimUntil > now) this.hitValve(i, now);
      } else v.spr.clearTint();
    });
    this.puddles = this.puddles.filter((pd) => {
      if (now > pd.until) {
        pd.c.destroy();
        return false;
      }
      if (pd.c.getBounds().contains(p.x, p.y) && Math.random() < dt / 300) this.world.damagePlayer(4, { x: pd.c.x, y: pd.c.y });
      return true;
    });
    if (now < this.nextPattern) return;
    const tele = 900 * this.world.telegraphMult;
    const pick = this.patternIdx++ % 4;
    this.taunt();
    if (pick === 0) {
      // piston slams in lines
      for (let i = 0; i < (this.phase ? 4 : 3); i++) {
        const x = this.world.bounds.left + 100 + Math.random() * (this.world.bounds.width - 200);
        this.world.enemyLine(x, this.world.bounds.top + 40, Math.PI / 2, this.world.bounds.height, 60, 20, tele + i * 150);
      }
      this.nextPattern = now + 2400;
    } else if (pick === 1) {
      // krez leak puddles
      for (let i = 0; i < 4; i++) {
        const x = p.x + (Math.random() - 0.5) * 360;
        const y = p.y + (Math.random() - 0.5) * 260;
        this.world.enemyAoe(x, y, 40, 10, 700, 0xf5f0dc);
        this.world.sc.time.delayedCall(700, () => this.puddles.push({ c: this.world.sc.add.ellipse(x, y, 90, 50, 0xf5f0dc, 0.55).setDepth(2), until: this.world.now() + 6000 }));
      }
      this.nextPattern = now + 2000;
    } else if (pick === 2) {
      // REACH-AROUND: telegraph behind the player
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      const bx = p.x + Math.cos(a) * 90;
      const by = p.y + Math.sin(a) * 90;
      this.world.floatText(p.x, p.y - 50, "REACH-AROUND ENGAGED", "#ff6666", 14);
      this.world.enemyAoe(bx, by, 95, 24, tele, 0x4b5563);
      this.world.enemyAoe(p.x, p.y, 40, 10, tele + 200, 0x4b5563);
      this.nextPattern = now + 2200;
    } else {
      for (let i = 0; i < (this.phase ? 4 : 2); i++) this.world.spawnEnemy(i % 2 ? "pipe_gremlin" : "vending_mimic", this.x + (i - 1) * 60, this.y + 80, { minion: true });
      this.fan(this.phase ? 7 : 5, 0.22, 200, 11, 0xf5f0dc);
      this.nextPattern = now + 2600;
    }
  }
  destroy(fromScene?: boolean) {
    this.valves.forEach((v) => v.spr.destroy());
    this.puddles.forEach((p) => p.c.destroy());
    super.destroy(fromScene);
  }
}

// ----------------------------------------------------------------- THE SUPREME BANHAMMER AUTOMATON

export class BanhammerAutomaton extends Boss {
  nextDecree = 0;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "banhammer", x, y, 1500, "boss_banhammer", 80, 0x6b7280, 80, 96);
    this.nextDecree = w.now() + 4000;
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    this.moveToward(p.x, p.y, (this.phase ? 70 : 50) * this.world.enemyTimeScale);
    if (now > this.nextDecree) {
      this.nextDecree = now + (this.phase ? 9000 : 12000);
      const r = BAN_RULES[Math.floor(Math.random() * BAN_RULES.length)];
      this.world.sc.events.emit("decree", r.id);
    }
    if (now < this.nextPattern) return;
    const tele = 1000 * this.world.telegraphMult;
    const pick = this.patternIdx++ % 3;
    this.taunt();
    if (pick === 0) {
      this.world.enemyAoe(p.x, p.y, 110, 30, tele, 0xfbbf24);
      this.world.sc.time.delayedCall(tele, () => {
        synth.play("banhammer");
        this.world.shake(300, 0.02);
      });
      this.nextPattern = now + tele + 900;
    } else if (pick === 1) {
      this.ring(this.phase ? 20 : 14, 180, 12, 0xfde68a);
      this.world.sc.time.delayedCall(500, () => this.ring(this.phase ? 20 : 14, 140, 12, 0xfde68a, 0.15));
      this.nextPattern = now + 2200;
    } else {
      for (let i = 0; i < (this.phase ? 3 : 2); i++) this.world.spawnEnemy(i % 2 ? "decree_drone" : "cultist", this.x + (i - 1) * 60, this.y + 60, { minion: true });
      this.nextPattern = now + 2400;
    }
  }
}

// ----------------------------------------------------------------- THE SPECTRE OF KREZMOND'S BETRAYAL

export class Spectre extends Boss {
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "spectre", x, y, 1500, "boss_spectre", 72, 0x475569, 72, 80);
    this.thresholds = [0.66, 0.33];
  }
  onPhase(n: number, now: number) {
    super.onPhase(n, now);
    if (n === 2) this.world.sc.events.emit("conflict");
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    this.moveToward(p.x, p.y - 120, 50 * this.world.enemyTimeScale);
    this.setAlpha(0.75 + Math.sin(now / 200) * 0.2);
    if (now < this.nextPattern) return;
    const tele = 1600 * this.world.telegraphMult;
    const pick = this.patternIdx++ % 4;
    this.taunt();
    if (pick === 0) {
      // teleport
      const b = this.world.bounds;
      this.world.burst(this.x, this.y, 0x94a3b8, 12);
      this.setPosition(b.left + 120 + Math.random() * (b.width - 240), b.top + 120 + Math.random() * (b.height / 2));
      this.fan(this.phase ? 9 : 6, 0.18, 210, 12, 0xcbd5e1);
      this.nextPattern = now + 1400;
    } else if (pick === 1) {
      const n = this.phase >= 1 ? 4 : 3;
      this.world.floatText(this.x, this.y - 60, `BETRAYED BY ${n === 4 ? "FOUR" : "THREE"}!`, "#ff6666", 16);
      for (let i = 0; i < n; i++) this.world.spawnEnemy("betrayer", this.x + Math.cos((i / n) * Math.PI * 2) * 80, this.y + Math.sin((i / n) * Math.PI * 2) * 80, { minion: true });
      this.nextPattern = now + 3200;
    } else if (pick === 2) {
      // prophecy zones
      for (let i = 0; i < (this.phase ? 7 : 5); i++) {
        this.world.enemyAoe(p.x + (Math.random() - 0.5) * 380, p.y + (Math.random() - 0.5) * 300, 60, 18, tele, 0x94a3b8);
      }
      this.world.enemyAoe(p.x, p.y, 60, 18, tele, 0x94a3b8);
      this.nextPattern = now + tele + 600;
    } else {
      this.ring(16, 160, 11, 0xe2e8f0, now / 300);
      this.nextPattern = now + 1800;
    }
  }
}

// ----------------------------------------------------------------- DRONGUS B. DRIPPIN'

interface SongHazard {
  box: Phaser.GameObjects.Container;
  hp: number;
  next: number;
}

export class DrongusBoss extends Boss {
  nextDecree = 0;
  songs: SongHazard[] = [];
  regen = 0;
  shieldTimer = 0;
  deleted = 0;
  deleteZone?: Phaser.GameObjects.Graphics;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "drongus", x, y, 3000, "boss_drongus", 32, 0xffd23f, 32, 48);
    this.setScale(3);
    this.thresholds = [0.66, 0.33];
    this.nextDecree = w.now() + 3000;
    this.deleteZone = w.sc.add.graphics().setDepth(2);
  }
  onPhase(n: number, now: number) {
    super.onPhase(n, now);
    const ph = DRONGUS_PHASES[n];
    if (!ph) return;
    this.world.toast(`PHASE ${n + 1}: ${ph.name}`, ph.line);
    this.world.sc.events.emit("drongus-phase", n);
    if (n === 2) {
      // THE FINAL WONKING: becomes the Lorelord
      this.setTexture("boss_lorelord", 0).setScale(2.4);
      const body = this.body as Phaser.Physics.Arcade.Body;
      const k = this.frame.width / 64;
      body.setSize(40 * k, 50 * k).setOffset(12 * k, 20 * k);
      this.shielded = true;
      this.shieldTimer = now + 30000;
      this.world.toast("KREZZ SHIELD", "He has absorbed the national Krezz reserves. Build your Wonk and hit him with a KREZZ BURST (R) to break the shield.");
    }
  }
  /** Krezz Burst breaks the Lorelord's shield. Called by the scene. */
  onBurst(x: number, y: number, r: number) {
    if (this.phase === 2 && this.shielded && Phaser.Math.Distance.Between(x, y, this.x, this.y) < r + 80) {
      this.breakShield();
    }
  }
  breakShield() {
    this.shielded = false;
    const now = this.world.now();
    this.shieldTimer = now + 9000;
    this.world.toast("SHIELD BROKEN", "WONK IT 'TIL YOU KREZ. Hit him now!");
    synth.play("smash");
    this.world.shake(400, 0.02);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const b = this.world.bounds;
    const ts = this.world.enemyTimeScale;
    // fake songs demanding reactions
    this.songs = this.songs.filter((s) => {
      if (!s.box.active) return false;
      if (now > s.next) {
        s.next = now + 1800;
        this.world.enemyAoe(s.box.x, s.box.y, 80, 9, 600, 0x0084ff);
      }
      return true;
    });
    // phase 3 arena deletion + shield cycle
    if (this.phase === 2) {
      if (this.shielded && now > this.shieldTimer) this.breakShield();
      if (!this.shielded && now > this.shieldTimer) {
        this.shielded = true;
        this.shieldTimer = now + 30000;
        this.world.toast("KREZZ SHIELD RESTORED", "Build Wonk. Burst again.");
      }
      this.deleted = Math.min(140, this.deleted + dt * 0.01);
      this.deleteZone!.clear();
      this.deleteZone!.fillStyle(0xdc2626, 0.25);
      const d = this.deleted;
      this.deleteZone!.fillRect(b.left, b.top, b.width, d);
      this.deleteZone!.fillRect(b.left, b.bottom - d, b.width, d);
      this.deleteZone!.fillRect(b.left, b.top, d, b.height);
      this.deleteZone!.fillRect(b.right - d, b.top, d, b.height);
      if (p.x < b.left + d || p.x > b.right - d || p.y < b.top + d || p.y > b.bottom - d) {
        if (Math.random() < dt / 250) this.world.damagePlayer(5, undefined, { label: "[DELETED]" });
      }
      if (this.shielded && Math.random() < dt / 2600) this.world.spawnEnemy("citation", b.centerX + (Math.random() - 0.5) * 300, b.centerY + (Math.random() - 0.5) * 200, { minion: true });
    }
    if (this.phase === 0) this.moveToward(p.x, p.y - 100, 60 * ts);
    else if (this.phase === 1) this.moveToward(b.centerX + Math.sin(now / 1500) * 220, b.top + 170, 90 * ts);
    else this.moveToward(p.x, p.y, 70 * ts);

    if (this.phase === 0 && now > this.nextDecree) {
      this.nextDecree = now + 9000;
      this.world.sc.events.emit("drongus-decree");
    }
    if (now < this.nextPattern) return;
    const tele = 900 * this.world.telegraphMult;
    this.taunt();
    if (this.phase === 0) {
      const pick = this.patternIdx++ % 3;
      if (pick === 0) {
        // podium shockwave
        this.world.enemyAoe(this.x, this.y, 140, 20, tele, 0xffd23f);
        this.world.sc.time.delayedCall(tele, () => this.ring(18, 170, 10, 0xffd23f));
        this.nextPattern = now + tele + 1200;
      } else if (pick === 1) {
        // unread notifications
        for (let i = 0; i < 5; i++) {
          this.world.sc.time.delayedCall(i * 160, () => {
            const a = Math.atan2(p.y - this.y, p.x - this.x) + (Math.random() - 0.5) * 0.8;
            this.world.shoot(this.x, this.y, { owner: "enemy", damage: 10, speed: 160, angle: a, color: 0xff3b30, homing: 0.9, life: 4500, scale: 1.6 });
          });
        }
        this.nextPattern = now + 2000;
      } else {
        this.fan(7, 0.16, 230, 11, 0xffffff);
        this.nextPattern = now + 1500;
      }
    } else if (this.phase === 1) {
      const pick = this.patternIdx++ % 4;
      if (pick === 0) {
        this.world.spawnEnemy("ai_portrait", this.x - 80, this.y + 60, { minion: true });
        this.world.spawnEnemy("wiki_fragment", this.x + 80, this.y + 60, { minion: true });
        this.nextPattern = now + 2600;
      } else if (pick === 1) {
        // song waveform beams
        for (let i = 0; i < 3; i++) this.world.enemyLine(b.left, b.top + 150 + i * ((b.height - 200) / 2), 0, b.width, 40, 18, tele + i * 300);
        this.nextPattern = now + 2600;
      } else if (pick === 2) {
        this.spawnSong(now);
        this.nextPattern = now + 2000;
      } else {
        this.ring(20, 190, 10, 0x0084ff, now / 400);
        this.nextPattern = now + 1600;
      }
    } else {
      const pick = this.patternIdx++ % 3;
      if (pick === 0) {
        this.world.enemyAoe(p.x, p.y, 120, 24, tele, 0xffd23f);
        this.nextPattern = now + tele + 600;
      } else if (pick === 1) {
        this.ring(24, 200, 12, 0xffd23f, now / 300);
        this.world.sc.time.delayedCall(350, () => this.ring(24, 160, 12, 0xffb703, now / 300 + 0.13));
        this.nextPattern = now + 1900;
      } else {
        this.fan(9, 0.14, 260, 12, 0xc084fc);
        this.nextPattern = now + 1400;
      }
    }
  }
  spawnSong(now: number) {
    const b = this.world.bounds;
    const x = b.left + 150 + Math.random() * (b.width - 300);
    const y = b.top + 200 + Math.random() * (b.height - 320);
    const title = FAKE_SONGS[Math.floor(Math.random() * FAKE_SONGS.length)];
    const box = this.world.sc.add.container(x, y).setDepth(300);
    const bg = this.world.sc.add.rectangle(0, 0, 200, 46, 0xffffff).setStrokeStyle(2, 0x0084ff);
    const t = this.world.sc.add.text(0, -8, title, { fontFamily: "sans-serif", fontSize: "10px", color: "#050505", wordWrap: { width: 190 }, align: "center" }).setOrigin(0.5);
    const r = this.world.sc.add.text(0, 14, "REACT (hit it!)  Seen by 9", { fontFamily: "sans-serif", fontSize: "9px", color: "#0084ff" }).setOrigin(0.5);
    box.add([bg, t, r]);
    box.setSize(200, 46);
    this.songs.push({ box, hp: 3, next: now + 1200 });
  }
  /** Player attacks/shots touching a song count as reacting to it. */
  hitSong(x: number, y: number, r: number): boolean {
    for (const s of this.songs) {
      if (!s.box.active) continue;
      if (Math.abs(s.box.x - x) < 100 + r && Math.abs(s.box.y - y) < 23 + r) {
        s.hp--;
        if (s.hp <= 0) {
          this.world.floatText(s.box.x, s.box.y, "👍 REACTED", "#0084ff", 16);
          synth.play("pop");
          this.world.addWonk(15);
          s.box.destroy();
        }
        return true;
      }
    }
    return false;
  }
  destroy(fromScene?: boolean) {
    this.songs.forEach((s) => s.box.destroy());
    this.deleteZone?.destroy();
    super.destroy(fromScene);
  }
}


// ----------------------------------------------------------------- KROZNO (Kreltower plot)

export class Krozno extends Boss {
  nextTurb = 0;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "krozno", x, y, 1600, "boss_krozno", 32, 0x1f2937, 32, 48);
    this.setScale(2.6);
    this.nextTurb = w.now() + 5000;
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    this.moveToward(p.x + Math.cos(now / 900) * 160, p.y - 140, 80 * this.world.enemyTimeScale);
    this.setFrame(Math.floor(now / 200) % 3);
    if (now > this.nextTurb) {
      this.nextTurb = now + (this.phase ? 5000 : 7000);
      this.world.toast("TURBULENCE", "Please return to your seats.");
      this.world.shake(700, 0.02);
      const a = Math.random() * Math.PI * 2;
      (p.spr.body as Phaser.Physics.Arcade.Body).velocity.add(new Phaser.Math.Vector2(Math.cos(a) * 520, Math.sin(a) * 520));
    }
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 3;
    this.taunt();
    if (pick === 0) {
      this.fan(this.phase ? 9 : 7, 0.15, 240, 12, 0xfacc15);
      this.nextPattern = now + 1500;
    } else if (pick === 1) {
      for (let i = 0; i < (this.phase ? 3 : 2); i++) this.world.spawnEnemy(i % 2 ? "bandit_gunner" : "bandit", this.x + (i - 1) * 60, this.y + 60, { minion: true });
      this.nextPattern = now + 2600;
    } else {
      // "seatbelt" sweeps: horizontal lines across the cabin
      const b = this.world.bounds;
      for (let i = 0; i < 3; i++) this.world.enemyLine(b.left, b.top + 120 + i * ((b.height - 160) / 2), 0, b.width, 36, 16, 900 + i * 250);
      this.nextPattern = now + 2400;
    }
  }
}

// ----------------------------------------------------------------- RUSSELL BRAND (Flenky arena)

export class BrandBoss extends Boss {
  lungeUntil = 0;
  lungeAngle = 0;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "brand", x, y, 1400, "boss_brand", 32, 0xf4f4f0, 32, 48);
    this.setScale(2.4);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const ts = this.world.enemyTimeScale;
    this.setFrame(Math.floor(now / 160) % 3);
    if (now < this.lungeUntil) {
      this.moveToward(this.x + Math.cos(this.lungeAngle) * 100, this.y + Math.sin(this.lungeAngle) * 100, 520 * ts);
      if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 50 && now > p.grappledUntil && !p.invulnerable(now)) {
        p.grappledUntil = now + 2600;
        p.grappleEscape = 0;
        this.lungeUntil = 0;
        this.world.toast("GRAPPLED", "He's got you in his guard. MASH ATTACK / DODGE to escape!");
        this.world.floatText(this.x, this.y - 60, "KIMURA, DARLING!", "#ff6666", 18);
      }
      return;
    }
    if (now < p.grappledUntil) {
      this.halt();
      this.setPosition(p.x + 18, p.y - 6);
      if (Math.random() < dt / 450) this.world.damagePlayer(5, undefined, { unblockable: true, label: "-5 (submission)" });
      return;
    }
    this.moveToward(p.x, p.y, (this.phase ? 105 : 85) * ts);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 3;
    this.taunt();
    if (pick === 0) {
      this.lungeAngle = Math.atan2(p.y - this.y, p.x - this.x);
      this.world.enemyLine(this.x, this.y, this.lungeAngle, 360, 50, 0, 700 * this.world.telegraphMult);
      this.halt();
      this.world.sc.time.delayedCall(700 * this.world.telegraphMult, () => (this.lungeUntil = this.world.now() + 600));
      this.nextPattern = now + 2400;
    } else if (pick === 1) {
      // berimbolo: spinning AoE
      this.world.enemyAoe(this.x, this.y, 120, 18, 800, 0xf4f4f0);
      this.nextPattern = now + 1800;
    } else {
      this.ring(this.phase ? 16 : 12, 180, 10, 0x3b6cff, now / 400);
      this.nextPattern = now + 1600;
    }
  }
}

// ----------------------------------------------------------------- THE CUDDLE CRONSTER (everyone)

export class CronsterBoss extends Boss {
  lungeUntil = 0;
  lungeAngle = 0;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "cronster", x, y, 1500, "boss_cronster", 32, 0xf9a8d4, 32, 48);
    this.setScale(2.6);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const ts = this.world.enemyTimeScale;
    this.setFrame(Math.floor(now / 180) % 3);
    if (now < this.lungeUntil) {
      this.moveToward(this.x + Math.cos(this.lungeAngle) * 100, this.y + Math.sin(this.lungeAngle) * 100, 480 * ts);
      if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 50 && now > p.grappledUntil && !p.invulnerable(now)) {
        p.grappledUntil = now + 2400;
        p.grappleEscape = 0;
        this.lungeUntil = 0;
        this.world.toast("CUDDLED", "He's squeezing out all your lovely juices. MASH ATTACK / DODGE to escape!");
        this.world.floatText(this.x, this.y - 60, "SWEET HUGS, SWEETER SQUEEZES", "#f9a8d4", 16);
      }
      return;
    }
    if (now < p.grappledUntil) {
      this.halt();
      this.setPosition(p.x - 16, p.y - 4);
      if (Math.random() < dt / 400) {
        this.world.damagePlayer(5, undefined, { unblockable: true, label: "-5 (squeezed)" });
        this.hp = Math.min(this.maxHp, this.hp + 8);
      }
      return;
    }
    this.moveToward(p.x, p.y, (this.phase ? 100 : 80) * ts);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 3;
    this.taunt();
    if (pick === 0) {
      this.lungeAngle = Math.atan2(p.y - this.y, p.x - this.x);
      this.world.enemyLine(this.x, this.y, this.lungeAngle, 380, 56, 0, 650 * this.world.telegraphMult);
      this.halt();
      this.world.sc.time.delayedCall(650 * this.world.telegraphMult, () => (this.lungeUntil = this.world.now() + 600));
      this.nextPattern = now + 2300;
    } else if (pick === 1) {
      // a scatter of chocolate cuddle tokens
      this.ring(this.phase ? 18 : 12, 170, 9, 0x7c2d12, now / 300);
      this.nextPattern = now + 1500;
    } else {
      for (let i = 0; i < 3; i++) this.world.enemyAoe(p.x + (i - 1) * 90, p.y + ((i % 2) * 2 - 1) * 40, 70, 16, 900, 0xf9a8d4);
      this.world.floatText(p.x, p.y - 70, "GROUP HUG", "#f9a8d4", 14);
      this.nextPattern = now + 1900;
    }
  }
}

// ----------------------------------------------------------------- ALISTAIR SWAMP, BLUES BRUISER (Krezmar arena)

export class TrollBoss extends Boss {
  staggered = false;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "troll", x, y, 1600, "boss_troll", 32, 0x7d8f6a, 32, 48);
    this.setScale(3);
  }
  /** Trolls can only be finished with a headbutt. */
  incoming(amount: number, opts?: { source?: string }): number {
    if (opts?.source === "headbutt") return this.staggered ? this.hp + 10 : amount;
    const floor = this.maxHp * 0.12;
    return Math.max(0, Math.min(amount, this.hp - floor));
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    this.setFrame(Math.floor(now / 250) % 3);
    if (!this.staggered && this.hp <= this.maxHp * 0.12 + 1) {
      this.staggered = true;
      this.world.toast("STAGGERED", "Alistair is dazed. Get close and HEADBUTT him (F / right click)!");
    }
    if (this.staggered) {
      this.halt();
      this.setAngle(Math.sin(now / 120) * 8);
      if (Math.floor(now / 600) % 2 === 0) this.world.floatText(this.x, this.y - 80, "HEADBUTT HIM!", "#ffd23f", 14);
      return;
    }
    this.moveToward(p.x, p.y, (this.phase ? 80 : 60) * this.world.enemyTimeScale);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 3;
    this.taunt();
    if (pick === 0) {
      // twelve-bar riff: 12 notes in a spiral
      for (let i = 0; i < 12; i++) this.world.sc.time.delayedCall(i * 90, () => this.ring(4, 190, 10, 0xfbbf24, i * 0.35));
      this.nextPattern = now + 2400;
    } else if (pick === 1) {
      this.world.enemyAoe(p.x, p.y, 100, 22, 900, 0xb45309);
      this.world.floatText(p.x, p.y - 60, "GUITAR SWING", "#fbbf24", 14);
      this.nextPattern = now + 1800;
    } else {
      for (let i = 0; i < 3; i++) this.world.spawnEnemy("roadie", this.x + (i - 1) * 60, this.y + 60, { minion: true });
      this.nextPattern = now + 2600;
    }
  }
}

// ----------------------------------------------------------------- ROBBO (Gronny arena)

export class FlatmateBoss extends Boss {
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "flatmate", x, y, 1000, "boss_flatmate", 32, 0x6b7280, 32, 48);
    this.setScale(2.4);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const b = this.world.bounds;
    this.setFrame(Math.floor(now / 140) % 3);
    // He runs away. Always. It's what he does.
    const away = Math.atan2(this.y - p.y, this.x - p.x);
    let tx = this.x + Math.cos(away) * 200;
    let ty = this.y + Math.sin(away) * 200;
    tx = Phaser.Math.Clamp(tx, b.left + 40, b.right - 40);
    ty = Phaser.Math.Clamp(ty, b.top + 40, b.bottom - 40);
    const cornered = Phaser.Math.Distance.Between(tx, ty, this.x, this.y) < 40;
    this.moveToward(tx, ty, (cornered ? 40 : this.phase ? 150 : 130) * this.world.enemyTimeScale);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 3;
    this.taunt();
    if (pick === 0) {
      for (let i = 0; i < (this.phase ? 6 : 4); i++) this.world.spawnEnemy("invoice", this.x, this.y, { minion: true });
      this.nextPattern = now + 2200;
    } else if (pick === 1) {
      // carpet roll: big slow projectile
      this.world.shoot(this.x, this.y, { owner: "enemy", damage: 18, speed: 140, angle: Math.atan2(p.y - this.y, p.x - this.x), color: 0x7a1f2b, scale: 3.5, life: 5000 });
      this.nextPattern = now + 1400;
    } else {
      this.fan(5, 0.25, 210, 9, 0xd6c49a);
      this.nextPattern = now + 1500;
    }
  }
}

// ----------------------------------------------------------------- CHAD DELTOID (Krezwonk arena)

export class RivalBoss extends Boss {
  chargeUntil = 0;
  chargeAngle = 0;
  flexUntil = 0;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "rival", x, y, 1700, "boss_rival", 32, 0xd97706, 32, 48);
    this.setScale(3);
  }
  incoming(amount: number, opts?: { source?: string }): number {
    return this.world.now() < this.flexUntil ? amount * 0.2 : super.incoming(amount, opts);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    this.setFrame(Math.floor(now / 200) % 3);
    if (now < this.flexUntil) {
      this.halt();
      this.setTint(0xffaa66);
      return;
    }
    if (now < this.chargeUntil) {
      this.moveToward(this.x + Math.cos(this.chargeAngle) * 100, this.y + Math.sin(this.chargeAngle) * 100, 560 * this.world.enemyTimeScale);
      return;
    }
    this.moveToward(p.x, p.y, (this.phase ? 90 : 70) * this.world.enemyTimeScale);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 4;
    this.taunt();
    if (pick === 0) {
      this.chargeAngle = Math.atan2(p.y - this.y, p.x - this.x);
      this.world.enemyLine(this.x, this.y, this.chargeAngle, 480, 70, 0, 800 * this.world.telegraphMult);
      this.halt();
      this.world.sc.time.delayedCall(800 * this.world.telegraphMult, () => (this.chargeUntil = this.world.now() + 700));
      this.nextPattern = now + 2600;
    } else if (pick === 1) {
      // thrown dumbbells
      for (let i = 0; i < (this.phase ? 5 : 3); i++) this.world.enemyAoe(p.x + (Math.random() - 0.5) * 200, p.y + (Math.random() - 0.5) * 200, 55, 20, 900 + i * 120, 0x374151);
      this.nextPattern = now + 2000;
    } else if (pick === 2) {
      this.flexUntil = now + 1800;
      this.world.floatText(this.x, this.y - 80, "FLEXING (DAMAGE REDUCED)", "#ffaa66", 14);
      this.nextPattern = now + 2400;
    } else {
      for (let i = 0; i < 2; i++) this.world.spawnEnemy("gym_bro", this.x + (i ? 70 : -70), this.y + 50, { minion: true });
      this.nextPattern = now + 2600;
    }
  }
}

// ----------------------------------------------------------------- THE HOARD (Polson Towers)

export class HoardBoss extends Boss {
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "hoard", x, y, 1300, w.sc.textures.exists("boss_hoard") ? "boss_hoard" : "boss_flatmate", 64, 0x84cc16, 64, 64);
    this.setScale(2.6);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    // it shuffles after you, slowly, shedding stuff
    this.moveToward(p.x, p.y, (this.phase === 2 ? 55 : this.phase ? 42 : 30) * this.world.enemyTimeScale);
    if (now < this.nextPattern) return;
    const n = this.phase === 2 ? 6 : 5;
    let pick = this.patternIdx++ % n;
    // keep the room light on phones: no more minions once a crowd is already up
    const crowd = this.world.enemies.filter((e) => !e.dead && !e.isBoss).length;
    if (crowd >= 12 && (pick === 0 || pick === 3)) pick = 2;
    this.taunt();
    if (pick === 4) {
      // the Salem souvenir: a witch-museum broom buried in the heap. Not a headache. Energies.
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "IT'S NOT A HEADACHE!", "#c084fc", 18);
      this.world.floatText(p.x, p.y - 50, "ENERGIES ABSORBED", "#c084fc", 13);
      this.ring(this.phase ? 14 : 10, 90, 9, 0xa855f7, 0);
      this.world.sc.time.delayedCall(450, () => { if (this.active) this.ring(this.phase ? 14 : 10, 120, 9, 0xa855f7, 0.5); });
      this.world.sc.time.delayedCall(1100, () => { if (this.active) this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "DID I NOT JUST TELL YOU?!", "#c084fc", 16); });
      this.nextPattern = now + 2400;
    } else if (pick === 0) {
      // stuffed toys pour out of it
      for (let i = 0; i < (this.phase ? 5 : 3); i++) this.world.spawnEnemy("plushie", this.x + (Math.random() - 0.5) * 120, this.y + 40, { minion: true });
      this.nextPattern = now + 2400;
    } else if (pick === 1) {
      // boxes and shopping bags, lobbed at you
      for (let i = 0; i < (this.phase ? 7 : 5); i++) {
        const a = Math.atan2(p.y - this.y, p.x - this.x) + (i - 3) * 0.22;
        this.world.shoot(this.x, this.y, { owner: "enemy", damage: 11, speed: 170 + Math.random() * 40, angle: a, color: 0xb08d57, scale: 2.4, life: 4000 });
      }
      this.nextPattern = now + 1700;
    } else if (pick === 2) {
      // a ring of mould spores
      this.ring(this.phase ? 16 : 12, 130, 8, 0x9ccc65, Math.random());
      this.nextPattern = now + 1700;
    } else if (pick === 3) {
      for (let i = 0; i < 2; i++) this.world.spawnEnemy(this.phase ? "mould_pizza" : "mould", this.x + (i ? 80 : -80), this.y + 30, { minion: true });
      this.nextPattern = now + 2300;
    } else if (pick === 5) {
      // avalanche: the whole heap slides at you
      this.world.enemyLine(this.x, this.y, Math.atan2(p.y - this.y, p.x - this.x), 700, 70, 22, 900);
      this.nextPattern = now + 2200;
    }
  }
}

// ----------------------------------------------------------------- JQ, THE JAM QUEEN (SanChz's nemesis)

/** The mother of the jam donut SanChz was caught with. Rolls, spits jam, and is very, very upset. */
export class JamQueenBoss extends Boss {
  sideGravity = true;
  rollUntil = 0;
  rollDir = 1;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "jam", x, y, 2100, w.sc.textures.exists("boss_jam") ? "boss_jam" : "boss_flatmate", 32, 0xdc2626, 32, 48);
    this.setScale(3);
  }
  private run(vx: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.world.side) body.setVelocityX(vx);
    else body.setVelocity(vx, 0);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const ts = this.world.enemyTimeScale;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setFrame(Math.floor(now / 240) % 3);
    if (now < this.rollUntil) {
      this.run(this.rollDir * 560 * ts);
      this.angle += this.rollDir * 22;
      if (body.blocked.left || body.blocked.right) this.rollUntil = 0;
      return;
    }
    this.angle = 0;
    const dir = p.x < this.x ? -1 : 1;
    this.setFlipX(dir < 0);
    this.run(Math.abs(p.x - this.x) > 120 ? dir * (this.phase ? 95 : 70) * ts : 0);
    if (now < this.nextPattern) return;
    const crowd = this.world.enemies.filter((e) => !e.dead && !e.isBoss).length;
    let pick = this.patternIdx++ % 5;
    if (crowd >= 10 && pick === 3) pick = 1;
    this.taunt();
    if (pick === 0) {
      // the roll: she's a donut, she rolls
      this.rollDir = dir;
      this.world.enemyLine(this.x, this.y, dir > 0 ? 0 : Math.PI, 900, 70, 0, 700 * this.world.telegraphMult);
      this.run(0);
      this.world.sc.time.delayedCall(700 * this.world.telegraphMult, () => (this.rollUntil = this.world.now() + 1300));
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "ROLLING DONUT (JUMP!)", "#fca5a5", 15);
      this.nextPattern = now + 2700;
    } else if (pick === 1) {
      // jam everywhere
      for (let i = 0; i < (this.phase ? 5 : 4); i++) {
        const tx = p.x + (Math.random() - 0.5) * 360;
        const ty = Math.min(this.world.groundY ?? p.y, p.y + 10);
        this.world.enemyAoe(tx, ty, 60, 13, 800 + i * 120, 0xb91c1c);
      }
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "JAM SPLATTER", "#ef4444", 15);
      this.nextPattern = now + 2000;
    } else if (pick === 2) {
      this.fan(this.phase ? 11 : 8, 0.16, 250, 9, [0xf472b6, 0x60a5fa, 0xfde047, 0x4ade80][this.patternIdx % 4]);
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "SPRINKLES", "#f472b6", 15);
      this.nextPattern = now + 1500;
    } else if (pick === 3) {
      for (let i = 0; i < (this.phase ? 4 : 3); i++) this.world.spawnEnemy("jam_donut", this.x + (i - 1.5) * 70, this.y, { minion: true });
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "MY BABIES! AVENGE YOUR SISTER!", "#fca5a5", 15);
      this.nextPattern = now + 2600;
    } else {
      // a royal belly-flop
      if (this.world.side && (body.blocked.down || body.touching.down)) body.setVelocityY(-760);
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "ROYAL SQUASH", "#fbbf24", 15);
      this.world.sc.time.delayedCall(900, () => {
        if (!this.active || this.dead) return;
        this.world.shake(260, 0.014);
        this.world.enemyLine(this.x, this.y + 20, 0, 260, 34, 16, 120);
        this.world.enemyLine(this.x, this.y + 20, Math.PI, 260, 34, 16, 120);
      });
      this.nextPattern = now + 2300;
    }
  }
}

// ----------------------------------------------------------------- UNCLE RIK (the Giant Hot Tub)

/** Seven hundred pounds of Uncle Rik, sat on every jet in the Giant Hot Tub of Catford. The jets are spewing biofilm. */
export class RikBoss extends Boss {
  jets: number[] = [];
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "rik", x, y, 2600, w.sc.textures.exists("boss_rik") ? "boss_rik" : "boss_flatmate", 32, 0x65a30d, 32, 48);
    this.setScale(4.2);
    const b = w.bounds;
    this.jets = [0.12, 0.3, 0.7, 0.88].map((f) => b.left + b.width * f);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const gy = this.world.groundY ?? this.world.bounds.bottom;
    this.halt();
    // he does not move. He jiggles.
    this.setScale(4.2 + Math.sin(now / 160) * 0.06, 4.2 - Math.sin(now / 160) * 0.06);
    this.setFlipX(p.x < this.x);
    if (now < this.nextPattern) return;
    const crowd = this.world.enemies.filter((e) => !e.dead && !e.isBoss).length;
    let pick = this.patternIdx++ % 5;
    if (crowd >= 10 && pick === 2) pick = 0;
    this.taunt();
    if (pick === 0) {
      // the jets: geysers of biofilm straight up out of the floor
      const order = [...this.jets].sort(() => Math.random() - 0.5).slice(0, this.phase ? 4 : 2);
      order.push(p.x);
      for (const x of order) this.world.enemyLine(x, gy, -Math.PI / 2, 420, 54, 15, 900 * this.world.telegraphMult);
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "JETS: BIOFILM", "#a3e635", 16);
      this.nextPattern = now + 2100;
    } else if (pick === 1) {
      // lobs of scum
      for (let i = 0; i < (this.phase ? 7 : 5); i++) {
        const a = -Math.PI / 2 + (i - (this.phase ? 3 : 2)) * 0.32;
        this.world.shoot(this.x, this.y - 40, { owner: "enemy", damage: 11, speed: 230, angle: a, color: 0x84cc16, scale: 2, life: 2600, homing: 0.6 });
      }
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "SCUM", "#84cc16", 16);
      this.nextPattern = now + 1700;
    } else if (pick === 2) {
      for (let i = 0; i < (this.phase ? 4 : 3); i++) this.world.spawnEnemy(i % 2 ? "hottub_bubble" : "biofilm", this.jets[i % 4], gy - 60, { minion: true });
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "SOMETHING CAME OUT OF THE JETS", "#d9f99d", 14);
      this.nextPattern = now + 2500;
    } else if (pick === 3) {
      // the wave: he shifts his weight and the whole tub sloshes along the floor
      this.world.shake(400, 0.012);
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "HE SHIFTED HIS WEIGHT (JUMP!)", "#7dd3fc", 15);
      this.world.enemyLine(this.x, gy - 14, 0, 900, 40, 18, 800 * this.world.telegraphMult);
      this.world.enemyLine(this.x, gy - 14, Math.PI, 900, 40, 18, 800 * this.world.telegraphMult);
      this.nextPattern = now + 2400;
    } else {
      // he farts in the tub
      const c = this.world.sc.add.circle(this.x, this.y, 30, 0x84cc16, 0.4).setDepth(460);
      this.world.sc.tweens.add({ targets: c, radius: 200, alpha: 0, duration: 1200, onComplete: () => c.destroy() });
      this.world.enemyAoe(p.x, p.y, 90, 14, 900, 0x65a30d);
      this.world.enemyAoe(this.x, gy - 40, 200, 12, 1100, 0x84cc16);
      this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, "*BLUB BLUB BLUB*", "#a3e635", 18);
      this.nextPattern = now + 2200;
    }
  }
}

// ----------------------------------------------------------------- THE CROBLEY FACTORY

/** Shared bits for the side-on Crobley bosses: walk along the floor towards you. */
abstract class CrobleyBoss extends Boss {
  sideGravity = true;
  protected walk(speed: number, keep = 140) {
    const p = this.world.player;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dir = p.x < this.x ? -1 : 1;
    this.setFlipX(dir < 0);
    const vx = Math.abs(p.x - this.x) > keep ? dir * speed * this.world.enemyTimeScale : 0;
    if (this.world.side) body.setVelocityX(vx);
    else body.setVelocity(vx, 0);
  }
  protected hop(v = -700) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.world.side && (body.blocked.down || body.touching.down)) body.setVelocityY(v);
  }
  protected say(t: string, color = "#ffffff") {
    this.world.floatText(this.x, this.y - this.displayHeight / 2 - 30, t, color, 15);
  }
}

/** Flirts with everyone. Mostly you. */
export class FlirtCrobleyBoss extends CrobleyBoss {
  dashUntil = 0;
  dashDir = 1;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "flirt", x, y, 2000, w.sc.textures.exists("boss_flirt") ? "boss_flirt" : "boss_flatmate", 32, 0xf472b6, 32, 48);
    this.setScale(2.6);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    this.setFrame(Math.floor(now / 230) % 3);
    if (now < this.dashUntil) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(this.dashDir * 520);
      return;
    }
    this.walk(this.phase ? 110 : 85, 180);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 4;
    this.taunt();
    if (pick === 0) {
      // blown kisses: hearts that drift after you
      for (let i = 0; i < (this.phase ? 6 : 4); i++)
        this.world.sc.time.delayedCall(i * 140, () => {
          if (!this.active) return;
          this.world.shoot(this.x, this.y - 20, { owner: "enemy", damage: 9, speed: 200, angle: Math.atan2(p.y - this.y, p.x - this.x) + (Math.random() - 0.5) * 0.6, color: 0xf472b6, scale: 1.8, life: 3200, homing: 1.1 });
        });
      this.say("MWAH! MWAH!", "#f9a8d4");
      this.nextPattern = now + 1800;
    } else if (pick === 1) {
      // "come here, handsome": a lunge
      this.dashDir = p.x < this.x ? -1 : 1;
      this.world.enemyLine(this.x, this.y, this.dashDir > 0 ? 0 : Math.PI, 600, 60, 0, 650 * this.world.telegraphMult);
      this.world.sc.time.delayedCall(650 * this.world.telegraphMult, () => (this.dashUntil = this.world.now() + 700));
      this.say("COME HERE, HANDSOME", "#f9a8d4");
      this.nextPattern = now + 2300;
    } else if (pick === 2) {
      // a wink so powerful it has a blast radius
      this.world.enemyAoe(p.x, p.y, 90, 14, 800, 0xec4899);
      this.world.enemyAoe(p.x + 160, p.y, 70, 12, 1000, 0xec4899);
      this.world.enemyAoe(p.x - 160, p.y, 70, 12, 1000, 0xec4899);
      this.say("*WINK*", "#f9a8d4");
      this.nextPattern = now + 2000;
    } else {
      for (let i = 0; i < (this.phase ? 4 : 3); i++) this.world.spawnEnemy("crobley_minion", this.x + (i - 1) * 60, this.y, { minion: true });
      this.say("BOYS? BOYS! SHE'S BEING MEAN TO ME", "#f9a8d4");
      this.nextPattern = now + 2400;
    }
  }
}

/** Gary from Basingstoke. Did not ask for any of this. */
export class ChineseCrobleyBoss extends CrobleyBoss {
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "lantern", x, y, 2200, w.sc.textures.exists("boss_lantern") ? "boss_lantern" : "boss_flatmate", 32, 0xdc2626, 32, 48);
    this.setScale(2.6);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const gy = this.world.groundY ?? this.world.bounds.bottom;
    this.setFrame(Math.floor(now / 260) % 3);
    this.walk(this.phase ? 80 : 60, 220);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 4;
    this.taunt();
    if (pick === 0) {
      // the fireworks Reinhardt insisted on: up, then down on you
      for (let i = 0; i < (this.phase ? 5 : 4); i++) {
        const tx = p.x + (i - 2) * 110;
        this.world.enemyAoe(tx, Math.min(gy - 20, p.y), 70, 14, 900 + i * 160, [0xef4444, 0xfacc15, 0x22c55e, 0x60a5fa, 0xe879f9][i % 5]);
      }
      this.say("FIREWORKS. AGAIN. FINE.", "#fca5a5");
      this.nextPattern = now + 2200;
    } else if (pick === 1) {
      // the plastic gong: a shockwave along the floor. Jump.
      this.world.shake(250, 0.012);
      this.world.enemyLine(this.x, gy - 14, 0, 900, 36, 16, 700 * this.world.telegraphMult);
      this.world.enemyLine(this.x, gy - 14, Math.PI, 900, 36, 16, 700 * this.world.telegraphMult);
      this.say("*BONG* (it's plastic)", "#fde68a");
      this.nextPattern = now + 2100;
    } else if (pick === 2) {
      // paper lanterns, floating after you, slowly
      for (let i = 0; i < (this.phase ? 5 : 3); i++) this.world.shoot(this.x, this.y - 40, { owner: "enemy", damage: 11, speed: 120, angle: -Math.PI / 2 + (i - 1) * 0.7, color: 0xef4444, scale: 2.6, life: 4500, homing: 1.4 });
      this.say("THEY'RE NOT EVEN PROPER LANTERNS", "#fca5a5");
      this.nextPattern = now + 2000;
    } else {
      this.fan(this.phase ? 9 : 7, 0.2, 240, 10, 0xfacc15);
      this.say("I'M FROM BASINGSTOKE", "#fde68a");
      this.nextPattern = now + 1600;
    }
  }
}

/** Fabulous. Knows it. Reinhardt wrote him as a joke; the joke is very much on Reinhardt. */
export class FruityCrobleyBoss extends CrobleyBoss {
  strutUntil = 0;
  strutDir = 1;
  posingUntil = 0;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "fruity", x, y, 2300, w.sc.textures.exists("boss_fruity") ? "boss_fruity" : "boss_flatmate", 32, 0xf472b6, 32, 48);
    this.setScale(2.6);
  }
  incoming(amount: number, opts?: { source?: string }): number {
    return this.world.now() < this.posingUntil ? amount * 0.15 : super.incoming(amount, opts);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    this.setFrame(Math.floor(now / 200) % 3);
    if (now < this.posingUntil) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
      this.setTint(0xfde68a);
      return;
    }
    if (now < this.strutUntil) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(this.strutDir * 480);
      return;
    }
    this.walk(this.phase ? 130 : 100, 160);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 5;
    this.taunt();
    if (pick === 0) {
      // disco ball: a spinning ring of glitter
      for (let k = 0; k < 3; k++) this.world.sc.time.delayedCall(k * 260, () => this.active && this.ring(this.phase ? 16 : 12, 190, 9, [0xf0abfc, 0x93c5fd, 0xfde68a][k], k * 0.25));
      this.say("DISCO, DARLING", "#f0abfc");
      this.nextPattern = now + 2000;
    } else if (pick === 1) {
      this.strutDir = p.x < this.x ? -1 : 1;
      this.world.enemyLine(this.x, this.y, this.strutDir > 0 ? 0 : Math.PI, 700, 60, 0, 600 * this.world.telegraphMult);
      this.world.sc.time.delayedCall(600 * this.world.telegraphMult, () => (this.strutUntil = this.world.now() + 800));
      this.say("CATWALK!", "#f0abfc");
      this.nextPattern = now + 2300;
    } else if (pick === 2) {
      // glitter beam
      this.world.enemyLine(this.x, this.y - 10, Math.atan2(p.y - this.y, p.x - this.x), 900, 46, 18, 800 * this.world.telegraphMult);
      this.say("SERVE.", "#fde68a");
      this.nextPattern = now + 1900;
    } else if (pick === 3) {
      this.posingUntil = now + 1500;
      this.say("VOGUE (YOU CAN'T TOUCH THIS)", "#fde68a");
      this.nextPattern = now + 2200;
    } else {
      this.hop(-820);
      this.world.sc.time.delayedCall(800, () => {
        if (!this.active || this.dead) return;
        this.clearTint();
        this.world.shake(200, 0.01);
        this.ring(this.phase ? 14 : 10, 220, 10, 0xf472b6, 0);
      });
      this.say("DEATH DROP", "#f0abfc");
      this.nextPattern = now + 2100;
    }
    if (now >= this.posingUntil) this.clearTint();
  }
}

/** A candy in a tank. Loves freedom. Fires it at you. */
export class TankCrobleyBoss extends CrobleyBoss {
  rollUntil = 0;
  rollDir = 1;
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "tank", x, y, 2800, w.sc.textures.exists("boss_tankc") ? "boss_tankc" : "boss_flatmate", 32, 0x4d7c0f, 32, 48);
    this.setScale(3);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const gy = this.world.groundY ?? this.world.bounds.bottom;
    this.setFrame(Math.floor(now / 150) % 3);
    if (now < this.rollUntil) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(this.rollDir * 600);
      return;
    }
    this.walk(this.phase ? 75 : 55, 260);
    if (now < this.nextPattern) return;
    const pick = this.patternIdx++ % 5;
    this.taunt();
    if (pick === 0) {
      // cannon: a shell lobbed at where you are
      for (let i = 0; i < (this.phase ? 3 : 2); i++) this.world.enemyAoe(p.x + (i - 0.5) * 140 * (this.phase ? 1 : 0.5), Math.min(gy - 20, p.y), 95, 20, 1000 + i * 250, 0xf97316);
      this.say("BOOM. FREEDOM.", "#fdba74");
      this.nextPattern = now + 2100;
    } else if (pick === 1) {
      for (let k = 0; k < 6; k++) this.world.sc.time.delayedCall(k * 110, () => this.active && this.world.shoot(this.x, this.y - 30, { owner: "enemy", damage: 8, speed: 320, angle: Math.atan2(p.y - this.y, p.x - this.x) + (k - 3) * 0.06, color: 0xfacc15, life: 2500 }));
      this.say("RAT-A-TAT AMERICA", "#fde68a");
      this.nextPattern = now + 1700;
    } else if (pick === 2) {
      this.rollDir = p.x < this.x ? -1 : 1;
      this.world.enemyLine(this.x, this.y, this.rollDir > 0 ? 0 : Math.PI, 900, 80, 0, 800 * this.world.telegraphMult);
      this.world.sc.time.delayedCall(800 * this.world.telegraphMult, () => (this.rollUntil = this.world.now() + 1200));
      this.say("RAMMING SPEED (JUMP!)", "#fdba74");
      this.nextPattern = now + 2700;
    } else if (pick === 3) {
      // air support: a line of strikes walking across the floor
      this.say("AIR SUPPORT INBOUND", "#93c5fd");
      const b = this.world.bounds;
      for (let i = 0; i < 9; i++) this.world.enemyAoe(b.left + 80 + ((b.width - 160) * i) / 8, gy - 30, 70, 16, 900 + i * 150, 0xef4444);
      this.nextPattern = now + 2800;
    } else {
      for (let i = 0; i < (this.phase ? 3 : 2); i++) this.world.spawnEnemy("crobage", this.x + (i ? 90 : -90), this.y, { minion: true });
      this.say("REINFORCEMENTS!", "#fdba74");
      this.nextPattern = now + 2500;
    }
  }
}

/** Reinhardt Crobley. CEO. Son. Suspect. Squawk-intolerant. */
export class ReinhardtBoss extends CrobleyBoss {
  constructor(w: CombatWorld, x: number, y: number) {
    super(w, "reinhardt", x, y, 3600, w.sc.textures.exists("boss_reinhardt") ? "boss_reinhardt" : "boss_flatmate", 32, 0x111827, 32, 48);
    this.setScale(3);
  }
  pattern(dt: number, now: number) {
    const p = this.world.player;
    const gy = this.world.groundY ?? this.world.bounds.bottom;
    this.setFrame(Math.floor(now / 220) % 3);
    this.walk(this.phase === 2 ? 120 : this.phase ? 95 : 75, 240);
    if (this.phase === 2) this.setTint(0xffaaaa);
    if (now < this.nextPattern) return;
    const crowd = this.world.enemies.filter((e) => !e.dead && !e.isBoss).length;
    let pick = this.patternIdx++ % 5;
    if (crowd >= 10 && pick === 3) pick = 0;
    this.taunt();
    if (pick === 0) {
      // the machine gun, sprayed in an arc
      const base = Math.atan2(p.y - this.y, p.x - this.x);
      const n = this.phase === 2 ? 14 : 10;
      for (let k = 0; k < n; k++) this.world.sc.time.delayedCall(k * 70, () => this.active && this.world.shoot(this.x, this.y - 20, { owner: "enemy", damage: 8, speed: 360, angle: base + (k - n / 2) * 0.07, color: 0xfde047, life: 2400 }));
      this.say("HEH HEH HEH", "#fca5a5");
      this.nextPattern = now + 1900;
    } else if (pick === 1) {
      // he can't hear you over the squawking: a sonic ring
      this.ring(this.phase ? 18 : 14, 200, 10, 0xe5e7eb, Math.random());
      this.world.sc.time.delayedCall(350, () => this.active && this.ring(this.phase ? 18 : 14, 160, 10, 0xe5e7eb, Math.random()));
      this.say("ALL I HEAR IS SQUAWKING", "#e5e7eb");
      this.nextPattern = now + 1900;
    } else if (pick === 2) {
      for (let i = 0; i < (this.phase ? 4 : 3); i++) this.world.enemyAoe(p.x + (i - 1) * 120, Math.min(gy - 20, p.y), 75, 18, 900 + i * 180, 0xfacc15);
      this.say("CORN GRENADES", "#fde047");
      this.nextPattern = now + 2100;
    } else if (pick === 3) {
      for (let i = 0; i < (this.phase ? 4 : 3); i++) this.world.spawnEnemy(i % 2 ? "crobage" : "crobley_guard", this.x + (i - 1.5) * 80, this.y, { minion: true });
      this.say("CROBAGES! TO ME!", "#fdba74");
      this.nextPattern = now + 2600;
    } else {
      this.hop(-760);
      this.world.sc.time.delayedCall(850, () => {
        if (!this.active || this.dead) return;
        this.world.shake(300, 0.016);
        this.world.enemyLine(this.x, gy - 14, 0, 700, 40, 18, 150);
        this.world.enemyLine(this.x, gy - 14, Math.PI, 700, 40, 18, 150);
      });
      this.say("JUST LIKE MY FATHER", "#fca5a5");
      this.nextPattern = now + 2300;
    }
  }
}

export function createBoss(id: string, w: CombatWorld, x: number, y: number): Boss {
  switch (id) {
    case "hoard":
      return new HoardBoss(w, x, y);
    case "salmon":
      return new SalmonSovereign(w, x, y);
    case "feedback":
      return new FeedbackLoop(w, x, y);
    case "machine":
      return new OverWonkedMachine(w, x, y);
    case "banhammer":
      return new BanhammerAutomaton(w, x, y);
    case "spectre":
      return new Spectre(w, x, y);
    case "krozno":
      return new Krozno(w, x, y);
    case "brand":
      return new BrandBoss(w, x, y);
    case "cronster":
      return new CronsterBoss(w, x, y);
    case "troll":
      return new TrollBoss(w, x, y);
    case "flatmate":
      return new FlatmateBoss(w, x, y);
    case "rival":
      return new RivalBoss(w, x, y);
    case "jam":
      return new JamQueenBoss(w, x, y);
    case "rik":
      return new RikBoss(w, x, y);
    case "flirt":
      return new FlirtCrobleyBoss(w, x, y);
    case "lantern":
      return new ChineseCrobleyBoss(w, x, y);
    case "fruity":
      return new FruityCrobleyBoss(w, x, y);
    case "tank":
      return new TankCrobleyBoss(w, x, y);
    case "reinhardt":
      return new ReinhardtBoss(w, x, y);
    default:
      return new DrongusBoss(w, x, y);
  }
}
