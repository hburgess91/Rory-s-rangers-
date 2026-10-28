import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { GameHost } from '../core/host';
import { AudioBus } from '../audio/AudioBus';
import { bubble } from '../ui/Dialogue';

let lastBark = 0;
function bark(e: Enemy, lines: string[], chance = 1) {
  const now = e.host.now;
  if (now - lastBark < 2600 || Math.random() > chance) return;
  const cam = e.host.cameras.main;
  if (e.x < cam.scrollX || e.x > cam.scrollX + cam.width) return;
  lastBark = now;
  bubble(e.host, () => ({ x: e.x, y: e.y - e.displayHeight - 4 }), lines[Math.floor(Math.random() * lines.length)], 1300);
}

const HEN_BARKS = ['OI OI!', "WHO'S THIS MUG?", 'UR NOT EVEN FAMOUS', 'HEN DO!!!', 'GET HIM GIRLS', 'FUCK OFF SANMIK', 'NICE AFRO, DICKHEAD', 'SHOTS SHOTS SHOTS'];

/** Hen-do woman. Keeps her distance and lobs stilettos / fires lipstick. */
export class HenDo extends Enemy {
  private next = 0;
  private winding = 0;
  private heelNext = true;
  private variant: number;

  constructor(host: GameHost, x: number, y: number) {
    const v = Math.floor(Math.random() * 3);
    super(host, x, y, `enemy_hen${v}`, 'walk_0', 45);
    this.variant = v;
    this.setOrigin(0.5, 1);
    this.ebody.setSize(14, 44).setOffset(8, 6);
    this.ebody.setGravityY(1100);
    this.play(`hen${v}_walk`);
  }

  protected think(_dt: number, now: number) {
    const b = this.ebody;
    const pl = this.host.combat.player;
    if (!pl) return;
    const dx = pl.x - this.x;
    this.facing = Math.sign(dx) || 1;
    this.setFlipX(this.facing < 0);
    if (now < this.stunUntil) { b.setVelocityX(b.velocity.x * 0.9); return; }
    if (this.winding) {
      b.setVelocityX(0);
      if (now >= this.winding) { this.winding = 0; this.fire(pl.x, pl.y); }
      return;
    }
    const dist = Math.abs(dx);
    const want = dist > 210 ? 1 : dist < 110 ? -1 : 0;
    b.setVelocityX(want * this.facing * 55 * this.slow);
    if (want === 0) this.anims.pause(); else this.anims.resume();
    if (!this.next) this.next = now + 800 + Math.random() * 900;
    if (now >= this.next && dist < 330 && Math.abs(pl.y - this.y) < 120) {
      this.anims.stop();
      this.setFrame('throw_0');
      this.winding = now + 420;
      this.next = now + 1700 + Math.random() * 900;
      bark(this, HEN_BARKS, 0.5);
    }
  }

  private fire(px: number, py: number) {
    this.setFrame('throw_1');
    this.host.time.delayedCall(220, () => { if (this.alive) this.play(`hen${this.variant}_walk`); });
    const hx = this.x + this.facing * 8, hy = this.y - 38;
    if (this.heelNext) {
      // stiletto lob that lands near the player
      const t = 0.9;
      const g = 700;
      const vx = Phaser.Math.Clamp((px - hx) / t, -260, 260);
      const vy = (py - 20 - hy - 0.5 * g * t * t) / t;
      this.host.combat.spawn({ team: 'enemy', texture: 'p_heel', x: hx, y: hy, vx, vy, gravity: g, damage: 1, lifeMs: 3000, hitW: 10, rotate: 'spin', spin: 14, reflectable: true, world: 'die' });
    } else {
      this.host.combat.spawn({ team: 'enemy', texture: 'p_lipstick', x: hx, y: this.y - 26, vx: this.facing * 220, vy: 0, damage: 1, lifeMs: 2500, hitW: 9, hitH: 5, reflectable: true, destructible: true, world: 'die' });
    }
    this.heelNext = !this.heelNext;
    AudioBus.sfx('sfx_throw', { vol: 0.5, maxCopies: 2 });
  }
}

export interface ChargerOpts { tex: string; anim: string; rev: string; hp: number; speed: number; body: [number, number, number, number]; barks: string[]; revSfx?: string }

const WHEELIE_BARKS = ['OUT DA WAY!', 'MC WHEELCHAIR BLUD!', 'BRAP BRAP!', 'SPEED BUMPS R 4 MUGS', 'I WILL RUN U OVER', 'NO BRAKES!!'];

/** Revs up (the tell), then floors it at you. Jump over it. */
export class Charger extends Enemy {
  private mode: 'patrol' | 'rev' | 'charge' | 'crash' = 'patrol';
  private until = 0;
  private cooldown = 0;
  constructor(host: GameHost, x: number, y: number, private o: ChargerOpts) {
    super(host, x, y, o.tex, undefined, o.hp);
    this.setOrigin(0.5, 1);
    const [w, h, ox, oy] = o.body;
    this.ebody.setSize(w, h).setOffset(ox, oy);
    this.ebody.setGravityY(1100);
    this.play(o.anim);
  }

  static wheelie(host: GameHost, x: number, y: number) {
    const v = Math.floor(Math.random() * 3);
    return new Charger(host, x, y, { tex: `enemy_wheelie${v}`, anim: `wheelie${v}_roll`, rev: 'rev_0', hp: 50, speed: 330, body: [30, 26, 7, 14], barks: WHEELIE_BARKS });
  }

  protected think(dt: number, now: number) {
    const b = this.ebody;
    const pl = this.host.combat.player;
    if (!pl) return;
    if (now < this.stunUntil && this.mode !== 'crash') { b.setVelocityX(b.velocity.x * 0.9); return; }
    switch (this.mode) {
      case 'patrol': {
        if (b.blocked.left) this.facing = 1;
        if (b.blocked.right) this.facing = -1;
        b.setVelocityX(this.facing * 40 * this.slow);
        const dx = pl.x - this.x;
        if (now > this.cooldown && Math.abs(dx) < 300 && Math.abs(pl.y - this.y) < 50) {
          this.facing = Math.sign(dx) || 1;
          this.mode = 'rev';
          this.until = now + 620;
          this.anims.stop();
          this.setFrame(this.o.rev);
          b.setVelocityX(0);
          AudioBus.sfx(this.o.revSfx ?? 'sfx_chainsaw', { vol: 0.45, rate: 0.6, maxCopies: 2 });
          this.host.fx.pop(this.x, this.y - this.displayHeight - 6, 'VRRRM', '#ff8a1a', 9, 14, 500);
          bark(this, this.o.barks, 0.6);
        }
        break;
      }
      case 'rev':
        this.x += Math.sin(now / 20) * 0.6; // shudder
        if (Math.random() < 0.3) this.host.fx.dust(this.x - this.facing * 16, this.y, 1);
        if (now >= this.until) { this.mode = 'charge'; this.until = now + 1500; this.play(this.o.anim); this.anims.timeScale = 2.5; }
        break;
      case 'charge':
        b.setVelocityX(this.facing * this.o.speed * this.slow);
        if (Math.random() < 0.4) this.host.fx.dust(this.x - this.facing * 14, this.y, 1);
        if ((b.blocked.left && this.facing < 0) || (b.blocked.right && this.facing > 0)) {
          this.mode = 'crash';
          this.until = now + 900;
          this.host.fx.shake(80, 0.004);
          this.host.fx.pop(this.x, this.y - this.displayHeight, 'CRASH', '#ffffff', 10, 14, 500);
          AudioBus.sfx('sfx_hit');
        } else if (now >= this.until) { this.mode = 'patrol'; this.cooldown = now + 1400; this.anims.timeScale = 1; }
        break;
      case 'crash':
        b.setVelocityX(0);
        if (now >= this.until) { this.mode = 'patrol'; this.cooldown = now + 1200; this.facing *= -1; this.anims.timeScale = 1; }
        break;
    }
    this.setFlipX(this.facing < 0);
    void dt;
  }
}

export interface FlyerOpts { tex: string; anim?: string; frame?: string; hp: number; shot: string; shotSpeed: number; shotHit?: number; tint?: number; body: [number, number, number, number]; drop?: boolean }

/** Bobbing flyer that telegraphs (red flash) then fires at the player. */
export class Flyer extends Enemy {
  private baseY: number;
  private t = Math.random() * 1000;
  private next = 0;
  private winding = 0;
  constructor(host: GameHost, x: number, y: number, private o: FlyerOpts) {
    super(host, x, y, o.tex, o.frame, o.hp);
    this.baseY = y;
    this.ebody.setAllowGravity(false);
    const [w, h, ox, oy] = o.body;
    this.ebody.setSize(w, h).setOffset(ox, oy);
    if (o.anim) this.play(o.anim);
  }
  protected think(dt: number, now: number) {
    const b = this.ebody;
    this.t += dt;
    const pl = this.host.combat.player;
    if (!pl) return;
    const dx = pl.x - this.x;
    this.facing = Math.sign(dx) || 1;
    this.setFlipX(this.facing > 0);
    if (now < this.stunUntil) { b.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9); return; }
    b.setVelocityX(Math.abs(dx) > 100 ? this.facing * 70 * this.slow : 0);
    b.setVelocityY((this.baseY + Math.sin(this.t / 300) * 18 - this.y) * 4);
    if (!this.next) this.next = now + 1200 + Math.random() * 800;
    if (now > this.next && Math.abs(dx) < 240 && !this.winding) {
      this.winding = now + 500;
      this.setTint(0xff6a6a);
      AudioBus.sfx('sfx_warn', { vol: 0.25, maxCopies: 1 });
    }
    if (this.winding && now >= this.winding) {
      this.winding = 0;
      this.clearTint();
      this.next = now + 2200 + Math.random() * 800;
      const a = this.o.drop ? Math.PI / 2 : Math.atan2(pl.y - 20 - this.y, pl.x - this.x);
      this.host.combat.spawn({ team: 'enemy', texture: this.o.shot, x: this.x, y: this.y + 6, vx: Math.cos(a) * this.o.shotSpeed, vy: Math.sin(a) * this.o.shotSpeed, damage: 1, lifeMs: 2500, hitW: this.o.shotHit ?? 7, reflectable: true, destructible: true, world: 'die', rotate: 'vel' });
    }
  }
}

/** Hops at you. */
export class Hopper extends Enemy {
  private next = 0;
  constructor(host: GameHost, x: number, y: number, private air: string, private ground: string, tex: string, hp: number, body: [number, number, number, number]) {
    super(host, x, y, tex, ground, hp);
    this.setOrigin(0.5, 1);
    const [w, h, ox, oy] = body;
    this.ebody.setSize(w, h).setOffset(ox, oy);
    this.ebody.setGravityY(1100);
  }
  protected think(_dt: number, now: number) {
    const b = this.ebody;
    const pl = this.host.combat.player;
    if (!pl) return;
    if (b.blocked.down) {
      b.setVelocityX(b.velocity.x * 0.8);
      this.setFrame(this.ground);
      if (!this.next) this.next = now + 600;
      if (now > this.next && now > this.stunUntil) {
        this.facing = Math.sign(pl.x - this.x) || 1;
        b.setVelocity(this.facing * 120 * this.slow, -340);
        this.next = now + 900 + Math.random() * 500;
      }
    } else this.setFrame(this.air);
    this.setFlipX(this.facing < 0);
  }
}

export interface TurretOpts { tex: string; frame?: string; hp: number; every: number; range: number; fire: (t: Turret, px: number, py: number) => void; body: [number, number, number, number]; contact?: number; barks?: string[] }

/** Stationary shooter with a visible wind-up. */
export class Turret extends Enemy {
  private next = 0;
  private winding = 0;
  constructor(host: GameHost, x: number, y: number, private o: TurretOpts) {
    super(host, x, y, o.tex, o.frame, o.hp);
    this.setOrigin(0.5, 1);
    const [w, h, ox, oy] = o.body;
    this.ebody.setSize(w, h).setOffset(ox, oy);
    this.ebody.setAllowGravity(false).setImmovable(true);
    this.contactDamage = o.contact ?? 0;
  }
  protected think(_dt: number, now: number) {
    this.ebody.setVelocity(0, 0);
    const pl = this.host.combat.player;
    if (!pl) return;
    this.facing = Math.sign(pl.x - this.x) || 1;
    this.setFlipX(this.facing < 0);
    if (!this.next) this.next = now + 900 + Math.random() * 900;
    if (now > this.next && !this.winding && Math.abs(pl.x - this.x) < this.o.range) {
      this.winding = now + 520;
      this.setTint(0xff7a7a);
      this.host.tweens.add({ targets: this, scaleY: 1.08, yoyo: true, duration: 120, repeat: 1 });
      if (this.o.barks) bark(this, this.o.barks, 0.4);
    }
    if (this.winding && now >= this.winding) {
      this.winding = 0;
      this.clearTint();
      this.next = now + this.o.every;
      this.o.fire(this, pl.x, pl.y);
    }
  }
}
