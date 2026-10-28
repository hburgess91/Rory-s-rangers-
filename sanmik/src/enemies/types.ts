import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { GameHost } from '../core/host';
import type { Hit } from '../combat/types';
import { AudioBus } from '../audio/AudioBus';

/** Goblin in a shopping trolley. Patrols, then charges when it sees you. */
export class TrolleyGoblin extends Enemy {
  constructor(host: GameHost, x: number, y: number) {
    super(host, x, y, 'enemy_trolley', 'roll_0', 40);
    this.setOrigin(0.5, 1);
    this.ebody.setSize(30, 24).setOffset(3, 8);
    this.ebody.setGravityY(1100);
    this.play('trolley_roll');
  }

  protected think(_dt: number, now: number) {
    const b = this.ebody;
    if (now < this.stunUntil) { b.setVelocityX(b.velocity.x * 0.9); return; }
    const player = this.host.combat.player;
    const dx = player ? player.x - this.x : 0;
    const sees = player && Math.abs(dx) < 260 && Math.abs(player.y - this.y) < 60;
    if (sees) this.facing = Math.sign(dx) || this.facing;
    if (b.blocked.left) this.facing = 1;
    if (b.blocked.right) this.facing = -1;
    // turn at ledges when not chasing
    if (!sees && b.blocked.down) {
      const aheadX = this.x + this.facing * 18;
      const ground = this.host.physics.overlapRect(aheadX - 2, this.y + 2, 4, 6, false, true);
      if (!ground.length) this.facing *= -1;
    }
    const speed = (sees ? 120 : 55) * this.slow;
    b.setVelocityX(this.facing * speed);
    this.setFlipX(this.facing > 0);
    this.anims.timeScale = sees ? 1.6 : 1;
  }
}

/** Honey wasp. Bobs about and drops a telegraphed honey blob. */
export class HoneyWasp extends Enemy {
  private baseY: number;
  private t = Math.random() * 1000;
  private nextShot = 0;
  private winding = 0;

  constructor(host: GameHost, x: number, y: number) {
    super(host, x, y, 'enemy_wasp', 'fly_0', 24);
    this.baseY = y;
    this.ebody.setAllowGravity(false);
    this.ebody.setSize(18, 14).setOffset(3, 4);
    this.play('wasp_fly');
    this.contactDamage = 1;
  }

  protected think(dt: number, now: number) {
    const b = this.ebody;
    this.t += dt;
    const player = this.host.combat.player;
    if (!player) return;
    const dx = player.x - this.x;
    this.facing = Math.sign(dx) || 1;
    this.setFlipX(this.facing > 0);
    if (now < this.stunUntil) { b.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9); return; }
    const want = Math.abs(dx) > 90 ? this.facing * 70 * this.slow : 0;
    b.setVelocityX(want);
    b.setVelocityY(((this.baseY + Math.sin(this.t / 300) * 18) - this.y) * 4);
    if (!this.nextShot) this.nextShot = now + 1200 + Math.random() * 800;
    if (now > this.nextShot && Math.abs(dx) < 220 && !this.winding) {
      this.winding = now + 500;
      this.setTint(0xff6a6a);
      AudioBus.sfx('sfx_warn', { vol: 0.25, maxCopies: 1 });
    }
    if (this.winding && now >= this.winding) {
      this.winding = 0;
      this.clearTint();
      this.nextShot = now + 2200 + Math.random() * 800;
      const a = Math.atan2(player.y - 20 - this.y, player.x - this.x);
      this.host.combat.spawn({ team: 'enemy', texture: 'e_shell', x: this.x, y: this.y + 6, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, damage: 1, lifeMs: 2500, hitW: 6, reflectable: true, destructible: true, world: 'die' });
    }
  }
}

/** "Happy Spud", the Big Tesk-O mascot. Hops toward you, relentlessly cheerful. */
export class Mascot extends Enemy {
  private nextHop = 0;
  constructor(host: GameHost, x: number, y: number) {
    super(host, x, y, 'enemy_mascot', 'hop_0', 55);
    this.setOrigin(0.5, 1);
    this.ebody.setSize(20, 28).setOffset(3, 6);
    this.ebody.setGravityY(1100);
  }

  protected think(_dt: number, now: number) {
    const b = this.ebody;
    const player = this.host.combat.player;
    if (!player) return;
    if (b.blocked.down) {
      b.setVelocityX(b.velocity.x * 0.8);
      this.setFrame('hop_1');
      if (!this.nextHop) this.nextHop = now + 600;
      if (now > this.nextHop && now > this.stunUntil) {
        this.facing = Math.sign(player.x - this.x) || 1;
        b.setVelocity(this.facing * 110 * this.slow, -330);
        this.nextHop = now + 900 + Math.random() * 500;
      }
    } else this.setFrame('hop_0');
  }
}

/** Debug Gym: life-size SanMik cardboard cutout. Never dies, reports damage. */
export class Dummy extends Enemy {
  private dmgWindow: { t: number; d: number }[] = [];
  private label: Phaser.GameObjects.Text;
  constructor(host: GameHost, x: number, y: number) {
    super(host, x, y, 'enemy_dummy', undefined, 999999);
    this.setOrigin(0.5, 1);
    this.ebody.setSize(26, 56).setOffset(4, 6);
    this.ebody.setImmovable(true).setAllowGravity(false);
    this.contactDamage = 0;
    this.invincible = true;
    this.scoreValue = 0;
    this.label = host.add.text(x, y - 76, 'DPS 0', { fontFamily: 'monospace', fontSize: '10px', color: '#ffe14a' }).setOrigin(0.5).setDepth(80);
  }

  protected onDamaged(hit: Hit) {
    this.dmgWindow.push({ t: this.host.now, d: hit.damage });
    this.host.fx.pop(this.x + (Math.random() - 0.5) * 16, this.y - 64, `${Math.round(hit.damage)}`, '#ffffff', 9, 18, 500);
  }

  contactRects() { return []; }

  protected think(_dt: number, now: number) {
    this.ebody.setVelocity(0, 0);
    this.dmgWindow = this.dmgWindow.filter((e) => now - e.t < 3000);
    const total = this.dmgWindow.reduce((a, e) => a + e.d, 0);
    this.label.setText(`DPS ${Math.round(total / 3)}`);
  }

  destroy(fromScene?: boolean) {
    this.label?.destroy();
    super.destroy(fromScene);
  }
}

/** Debug Gym: pitching machine that lobs reflectable balls at you. */
export class Pitcher extends Enemy {
  private next = 0;
  constructor(host: GameHost, x: number, y: number) {
    super(host, x, y, 'prop_trolleys', undefined, 999999);
    this.setOrigin(0.5, 1).setScale(0.6);
    this.ebody.setAllowGravity(false).setImmovable(true);
    this.invincible = true;
    this.contactDamage = 0;
    this.scoreValue = 0;
  }
  contactRects() { return []; }
  protected think(_dt: number, now: number) {
    this.ebody.setVelocity(0, 0);
    const pl = this.host.combat.player;
    if (now > this.next && pl && Math.abs(pl.x - this.x) < 260) {
      this.next = now + 1500;
      this.host.combat.spawn({ team: 'enemy', texture: 'e_orb', x: this.x - 20, y: this.y - 30, vx: -150, vy: 0, damage: 1, lifeMs: 4000, hitW: 10, reflectable: true, world: 'die', tint: 0xffa0d0 });
    }
  }
}
