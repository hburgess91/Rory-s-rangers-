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
    body.setSize(w * 0.7, h * 0.6).setOffset(w * 0.15, h * 0.3);
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
      this.setFrame(this.frame.name === "0" ? 1 : 0);
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
  incoming(amount: number): number {
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
  incoming(amount: number): number {
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
      body.setSize(40, 50).setOffset(12, 20);
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

export function createBoss(id: string, w: CombatWorld, x: number, y: number): Boss {
  switch (id) {
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
    default:
      return new DrongusBoss(w, x, y);
  }
}
