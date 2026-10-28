import Phaser from 'phaser';
import { Rect, Team } from './types';

export type WorldMode = 'none' | 'die' | 'bounce' | 'roll';

export interface ProjSpec {
  team: Team;
  texture: string;
  frame?: string | number;
  anim?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  lifeMs: number;
  gravity?: number;
  hitW?: number;
  hitH?: number;
  world?: WorldMode;
  bounces?: number; // for 'bounce' / 'roll' modes
  bounceFactor?: number;
  pierce?: boolean; // passes through targets (hits each once)
  reflectable?: boolean; // can be parried / batted back
  destructible?: boolean; // player shots can destroy it
  rotate?: 'vel' | 'spin' | 'none';
  spin?: number;
  sticky?: boolean; // jam
  strong?: boolean; // causes hit-stop / heavy knockback
  tint?: number;
  scale?: number;
  depth?: number;
  phaseScoped?: boolean; // cleared when a boss changes phase
  kind?: string; // used for behaviour (e.g. 'bean' bursts into gas)
  onExpire?: (x: number, y: number, reason: 'life' | 'world' | 'hit') => void;
  fadeOut?: boolean;
}

// Pooled projectile. spawn() fully overwrites every field, release() fully resets,
// so a recycled projectile can never carry state from its previous life.
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  team: Team = 'player';
  damage = 0;
  lifeLeft = 0;
  hitW = 6;
  hitH = 6;
  worldMode: WorldMode = 'die';
  bouncesLeft = 0;
  pierce = false;
  reflectable = false;
  destructible = false;
  rotateMode: 'vel' | 'spin' | 'none' = 'none';
  spinRate = 0;
  sticky = false;
  strong = false;
  phaseScoped = false;
  kind = '';
  fadeOut = false;
  onExpire?: ProjSpec['onExpire'];
  hitSet = new Set<unknown>();
  live = false;
  reflected = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fx_px');
  }

  spawn(s: ProjSpec) {
    this.live = true;
    this.team = s.team;
    this.damage = s.damage;
    this.lifeLeft = s.lifeMs;
    this.hitW = s.hitW ?? 8;
    this.hitH = s.hitH ?? s.hitW ?? 8;
    this.worldMode = s.world ?? 'die';
    this.bouncesLeft = s.bounces ?? 0;
    this.pierce = !!s.pierce;
    this.reflectable = !!s.reflectable;
    this.destructible = !!s.destructible;
    this.rotateMode = s.rotate ?? 'none';
    this.spinRate = s.spin ?? 0;
    this.sticky = !!s.sticky;
    this.strong = !!s.strong;
    this.phaseScoped = !!s.phaseScoped;
    this.kind = s.kind ?? '';
    this.fadeOut = !!s.fadeOut;
    this.onExpire = s.onExpire;
    this.reflected = false;
    this.hitSet.clear();

    this.setTexture(s.texture, s.frame);
    this.anims.stop();
    if (s.anim) this.play(s.anim);
    this.setPosition(s.x, s.y);
    this.setActive(true).setVisible(true);
    this.setAlpha(1).setAngle(0).setFlipX(s.vx < 0).setFlipY(false);
    this.setScale(s.scale ?? 1);
    if (s.tint !== undefined) this.setTint(s.tint); else this.clearTint();
    this.setDepth(s.depth ?? 40);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(s.x, s.y);
    body.setAllowGravity(true);
    body.setGravityY(s.gravity ?? 0);
    body.setSize(Math.max(2, Math.min(this.hitW, this.width)), Math.max(2, Math.min(this.hitH, this.height)), true);
    body.setVelocity(s.vx, s.vy);
    body.setBounce(this.worldMode === 'bounce' ? s.bounceFactor ?? 0.8 : 0, this.worldMode === 'bounce' ? s.bounceFactor ?? 0.8 : 0);
    body.setMaxVelocity(2000, 2000);
    body.checkCollision.none = this.worldMode === 'none';
    if (this.rotateMode === 'vel') this.setRotation(Math.atan2(s.vy, Math.abs(s.vx)) * Math.sign(s.vx || 1));
    return this;
  }

  hitRect(): Rect {
    return { x: this.x - this.hitW / 2, y: this.y - this.hitH / 2, w: this.hitW, h: this.hitH };
  }

  release() {
    if (!this.live) return;
    this.live = false;
    this.onExpire = undefined;
    this.hitSet.clear();
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setGravityY(0);
    body.enable = false;
    this.anims.stop();
    this.clearTint();
    this.setActive(false).setVisible(false);
  }

  tick(dtMs: number) {
    this.lifeLeft -= dtMs;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.rotateMode === 'vel') {
      this.setFlipX(false);
      this.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
    } else if (this.rotateMode === 'spin') this.rotation += this.spinRate * (dtMs / 1000) * (body.velocity.x < 0 ? -1 : 1);
    if (this.fadeOut && this.lifeLeft < 250) this.setAlpha(Math.max(0, this.lifeLeft / 250));
  }
}
