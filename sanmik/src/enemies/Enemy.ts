import Phaser from 'phaser';
import type { GameHost } from '../core/host';
import type { Hit, Rect, Target } from '../combat/types';
import { AudioBus } from '../audio/AudioBus';
import { SANCHZ, SCORE } from '../config/tuning';

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite implements Target {
  host: GameHost;
  hp: number;
  maxHp: number;
  alive = true;
  contactDamage = 1;
  scoreValue: number = SCORE.kill;
  stickyUntil = 0;
  stunUntil = 0;
  facing = -1;
  active_ = false; // starts acting once on camera
  invincible = false;
  hitW = 20;
  hitH = 20;

  constructor(host: GameHost, x: number, y: number, tex: string, frame: string | undefined, hp: number) {
    super(host, x, y, tex, frame);
    this.host = host;
    this.hp = hp;
    this.maxHp = hp;
    host.add.existing(this);
    host.physics.add.existing(this);
    this.setDepth(45);
    host.combat.targets.add(this);
  }

  get ebody() {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get slow() {
    return this.host.now < this.stickyUntil ? SANCHZ.sticky.slow : 1;
  }

  hurtRects(): Rect[] {
    const b = this.ebody;
    return [{ x: b.x, y: b.y, w: b.width, h: b.height }];
  }

  contactRects(): Rect[] {
    if (!this.alive || this.host.now < this.stunUntil) return [];
    const b = this.ebody;
    return [{ x: b.x + 3, y: b.y + 3, w: b.width - 6, h: b.height - 6 }];
  }

  takeHit(hit: Hit): boolean {
    if (!this.alive) return false;
    if (hit.sticky) {
      this.stickyUntil = this.host.now + SANCHZ.sticky.durationMs;
      this.setTint(0xff9aa8);
    }
    if (!this.invincible) this.hp -= hit.damage;
    this.onDamaged(hit);
    this.host.fx.flash(this, 60);
    if (hit.kind !== 'gas') AudioBus.sfx('sfx_hit', { vol: 0.5, maxCopies: 3 });
    if (hit.strong || hit.kind === 'melee') {
      this.ebody.setVelocityX(hit.dir * (hit.strong ? 220 : 90));
      this.stunUntil = this.host.now + (hit.strong ? 400 : 150);
    }
    if (this.hp <= 0 && !this.invincible) this.kill();
    return true;
  }

  protected onDamaged(_hit: Hit) {}

  kill() {
    if (!this.alive) return;
    this.alive = false;
    this.host.combat.targets.delete(this);
    AudioBus.sfx('sfx_enemy_die', { vol: 0.7 });
    this.host.fx.sparks(this.x, this.y - this.height / 2, 0xffe14a, 10, 160);
    this.host.fx.burst(this.x, this.y - this.height / 2, 'fx_ring', { scale: 0.4 });
    this.host.onEnemyKilled(this.x, this.y - this.height, this.scoreValue);
    this.ebody.enable = false;
    this.host.tweens.add({ targets: this, alpha: 0, angle: this.facing * 90, y: this.y - 10, duration: 220, onComplete: () => this.destroy() });
  }

  /** Called every frame by the scene. */
  step(dtMs: number) {
    if (!this.alive) return;
    const cam = this.host.cameras.main;
    if (!this.active_) {
      if (this.x < cam.scrollX + cam.width + 40 && this.x > cam.scrollX - 80) this.active_ = true;
      else return;
    }
    if (this.host.now >= this.stickyUntil && this.isTinted && this.host.now > this.stunUntil) this.clearTint();
    if (this.y > this.host.worldH + 80) { this.alive = false; this.host.combat.targets.delete(this); this.destroy(); return; }
    this.think(dtMs, this.host.now);
  }

  protected abstract think(dtMs: number, now: number): void;

  destroy(fromScene?: boolean) {
    this.host?.combat?.targets.delete(this);
    super.destroy(fromScene);
  }
}
