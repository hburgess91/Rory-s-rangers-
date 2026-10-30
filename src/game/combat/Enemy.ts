import Phaser from "phaser";
import { ENEMIES, type EnemyDef } from "../../data/enemies";
import type { CombatWorld } from "./types";
import { synth } from "../audio/Synth";

let NEXT_ID = 1;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  uid = NEXT_ID++;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  world: CombatWorld;
  isBoss = false;
  dead = false;
  noDrops = false;
  minion = false;
  dmgMult = 1;
  speedMult = 1;
  // timers (ms, world-time)
  stunUntil = 0;
  markedUntil = 0;
  slowUntil = 0;
  slowAmt = 0;
  nextAttack = 0;
  contactCd = 0;
  state: "idle" | "move" | "windup" | "dash" | "recover" | "fuse" = "move";
  stateUntil = 0;
  dashAngle = 0;
  facing = 0;
  orbitDir = 1;
  wanderAngle = Math.random() * Math.PI * 2;
  spawnCount = 0;
  flashUntil = 0;
  hpBar?: Phaser.GameObjects.Graphics;
  private animT = 0;

  constructor(world: CombatWorld, type: string, x: number, y: number, hpMult = 1, defOverride?: EnemyDef, texture?: string) {
    const def = defOverride ?? ENEMIES[type];
    super(world.sc, x, y, texture ?? `en_${type}`, 0);
    this.def = def;
    this.world = world;
    this.maxHp = Math.round(def.hp * hpMult);
    this.hp = this.maxHp;
    world.sc.add.existing(this);
    world.sc.physics.add.existing(this);
    this.setScale(2);
    const body = this.body as Phaser.Physics.Arcade.Body;
    // hitbox in world terms stays the same whatever the art size (PixelLab art is drawn larger)
    const fw = this.frame.width;
    const r = def.size * 0.4 * (fw / def.size);
    body.setCircle(r, fw / 2 - r, this.frame.height / 2 - r);
    body.setCollideWorldBounds(true);
    this.orbitDir = Math.random() < 0.5 ? 1 : -1;
    this.nextAttack = world.now() + 800 + Math.random() * 900;
  }

  get radius() {
    return this.def.size * 0.8;
  }

  slowFactor(now: number) {
    return now < this.slowUntil ? 1 - this.slowAmt : 1;
  }

  /** Main brain. dt in ms (already scaled by enemyTimeScale). */
  tick(dt: number, now: number) {
    if (this.dead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const p = this.world.player;
    this.animT += dt;
    if (this.animT > 220) {
      this.animT = 0;
      this.setFrame(String(this.frame.name) === "0" ? 1 : 0);
    }
    if (now < this.flashUntil) this.setTintFill(0xffffff);
    else if (now < this.markedUntil) this.setTint(0xd8b4fe);
    else this.clearTint();
    if (now < this.stunUntil) {
      body.velocity.scale(0.85);
      return;
    }
    const ts = this.world.enemyTimeScale;
    const spd = this.def.speed * this.speedMult * this.slowFactor(now) * ts;
    const target = p.targetPoint();
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const toP = Math.atan2(dy, dx);
    const lost = p.isHidden();
    const tele = 600 * this.world.telegraphMult;

    const moveAngle = (ang: number, s: number) => {
      body.setVelocity(Math.cos(ang) * s, Math.sin(ang) * s);
      this.facing = ang;
    };

    if (lost) {
      // Lulon Lurk: they can't see you. They wander, confused.
      if (Math.random() < 0.02) this.wanderAngle += (Math.random() - 0.5) * 2;
      moveAngle(this.wanderAngle, spd * 0.4);
      this.setFlipX(Math.cos(this.wanderAngle) < 0);
      return;
    }
    this.setFlipX(dx < 0);

    switch (this.def.behavior) {
      case "chaser":
      case "swarm": {
        const wobble = this.def.behavior === "swarm" ? Math.sin(now / 200 + this.uid) * 0.6 : 0;
        moveAngle(toP + wobble, spd);
        break;
      }
      case "charger": {
        if (this.state === "move") {
          moveAngle(toP, spd * (dist > 200 ? 1 : 0.5));
          if (dist < 300 && now > this.nextAttack) {
            this.state = "windup";
            this.stateUntil = now + tele;
            this.dashAngle = toP;
            body.setVelocity(0, 0);
            this.world.enemyLine(this.x, this.y, toP, 260, 26, 0, tele);
          }
        } else if (this.state === "windup") {
          body.setVelocity(0, 0);
          this.setTint(0xff6666);
          if (now > this.stateUntil) {
            this.state = "dash";
            this.stateUntil = now + 420 / Math.max(0.2, ts);
          }
        } else if (this.state === "dash") {
          moveAngle(this.dashAngle, 520 * ts);
          if (now > this.stateUntil) {
            this.state = "recover";
            this.stateUntil = now + 500;
          }
        } else {
          body.velocity.scale(0.8);
          if (now > this.stateUntil) {
            this.state = "move";
            this.nextAttack = now + 1200 + Math.random() * 800;
          }
        }
        break;
      }
      case "shooter":
      case "orbiter": {
        const pref = this.def.behavior === "orbiter" ? 170 : 240;
        let ang = toP;
        if (dist < pref - 40) ang = toP + Math.PI;
        else if (dist < pref + 60) ang = toP + (Math.PI / 2) * this.orbitDir;
        moveAngle(ang, spd);
        if (now > this.nextAttack && this.def.projectile) {
          const pr = this.def.projectile;
          if (this.state !== "windup") {
            this.state = "windup";
            this.stateUntil = now + tele * 0.6;
          } else if (now > this.stateUntil) {
            this.state = "move";
            const n = pr.count ?? 1;
            for (let i = 0; i < n; i++) {
              const a = toP + (n > 1 ? (i - (n - 1) / 2) * (pr.spread ?? 0.2) : 0);
              this.world.shoot(this.x, this.y, { owner: "enemy", damage: pr.damage * this.dmgMult, speed: pr.speed, angle: a, color: pr.color, life: 3500 });
            }
            this.nextAttack = now + pr.rate * (0.8 + Math.random() * 0.4);
          }
          if (this.state === "windup") this.setTint(0xffaaaa);
        }
        break;
      }
      case "bomber": {
        if (this.state !== "fuse") {
          moveAngle(toP, spd);
          if (dist < 60) {
            this.state = "fuse";
            this.stateUntil = now + tele;
            body.setVelocity(0, 0);
            this.world.enemyAoe(this.x, this.y, 70, this.def.damage * this.dmgMult, tele, this.def.color);
            synth.play("telegraph");
          }
        } else {
          body.setVelocity(0, 0);
          this.setScale(2 + Math.sin(now / 40) * 0.2);
          if (now > this.stateUntil) {
            this.noDrops = this.noDrops; // keep drops
            this.world.damageEnemy(this, 99999, { noWonk: true, label: " " });
          }
        }
        break;
      }
      case "spawner": {
        body.setVelocity(0, 0);
        if (now > this.nextAttack && this.spawnCount < 6 && this.def.spawns) {
          this.nextAttack = now + 2600;
          this.spawnCount++;
          const a = Math.random() * Math.PI * 2;
          this.world.spawnEnemy(this.def.spawns, this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 30, { noDrops: true, minion: true });
        }
        break;
      }
      case "blinker": {
        if (this.state === "move") {
          moveAngle(toP, spd * 0.6);
          if (now > this.nextAttack) {
            const a = Math.random() * Math.PI * 2;
            const bx = Phaser.Math.Clamp(p.x + Math.cos(a) * 90, this.world.bounds.left + 30, this.world.bounds.right - 30);
            const by = Phaser.Math.Clamp(p.y + Math.sin(a) * 90, this.world.bounds.top + 30, this.world.bounds.bottom - 30);
            this.world.burst(this.x, this.y, this.def.accent, 6);
            this.setPosition(bx, by);
            this.state = "windup";
            this.stateUntil = now + tele * 0.8;
            this.dashAngle = Math.atan2(p.y - by, p.x - bx);
            this.world.enemyLine(bx, by, this.dashAngle, 150, 24, 0, tele * 0.8);
            body.setVelocity(0, 0);
          }
        } else if (this.state === "windup") {
          body.setVelocity(0, 0);
          this.setAlpha(0.5 + Math.sin(now / 50) * 0.3);
          if (now > this.stateUntil) {
            this.setAlpha(1);
            this.state = "dash";
            this.stateUntil = now + 260;
          }
        } else if (this.state === "dash") {
          moveAngle(this.dashAngle, 560 * ts);
          if (now > this.stateUntil) {
            this.state = "move";
            this.nextAttack = now + 1800 + Math.random() * 900;
          }
        }
        break;
      }
    }
    if (this.hpBar) this.drawHpBar();
  }

  drawHpBar() {
    if (!this.hpBar) return;
    this.hpBar.clear();
    if (this.hp >= this.maxHp || this.isBoss) return;
    const w = Math.max(18, this.def.size * 1.6);
    this.hpBar.fillStyle(0x000000, 0.7);
    this.hpBar.fillRect(this.x - w / 2, this.y - this.displayHeight / 2 - 8, w, 4);
    this.hpBar.fillStyle(0xef4444, 1);
    this.hpBar.fillRect(this.x - w / 2, this.y - this.displayHeight / 2 - 8, (w * this.hp) / this.maxHp, 4);
  }

  contactDamage(): number {
    if (this.def.behavior === "spawner") return this.def.damage * 0.5 * this.dmgMult;
    if (this.state === "dash") return this.def.damage * 1.3 * this.dmgMult;
    return this.def.damage * this.dmgMult;
  }

  kill() {
    this.dead = true;
    this.hpBar?.destroy();
    this.disableBody(true, false);
    this.world.sc.tweens.add({ targets: this, alpha: 0, scale: this.scale * 1.4, angle: 90, duration: 220, onComplete: () => this.destroy() });
  }
}

export function enemyDef(type: string): EnemyDef | undefined {
  return ENEMIES[type];
}
