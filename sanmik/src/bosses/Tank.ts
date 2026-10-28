import Phaser from 'phaser';
import { BossBase } from './BossBase';
import { Scope } from './Scope';
import type { GameHost } from '../core/host';
import type { Hit, Rect } from '../combat/types';
import { AudioBus } from '../audio/AudioBus';

export const TANK_FLOOR = 322;
const HOME = 520;

/** DA BANK TANK. "Got a helicopter and a tank, cause I fucking robbed this bank." */
export class BankTank extends BossBase {
  body: Phaser.GameObjects.Sprite;
  turret: Phaser.GameObjects.Image;
  private treadT = 0;
  private moving = false;

  constructor(host: GameHost) {
    super(host, 2100, [0.5]);
    this.body = host.add.sprite(HOME, TANK_FLOOR, 'boss_tank', 't_0').setOrigin(0.5, 1).setDepth(30);
    this.turret = host.add.image(HOME + 10, TANK_FLOOR - 60, 'boss_turret').setOrigin(0.62, 0.55).setDepth(31);
  }

  speechPos() { return { x: this.body.x, y: TANK_FLOOR - 92 }; }

  hurtRects(): Rect[] {
    if (this.defeated) return [];
    return [{ x: this.body.x - 74, y: TANK_FLOOR - 70, w: 148, h: 66 }, { x: this.turret.x - 30, y: this.turret.y - 14, w: 50, h: 26 }];
  }

  contactRects(): Rect[] {
    if (this.defeated || this.phase < 0) return [];
    return [{ x: this.body.x - 72, y: TANK_FLOOR - 56, w: 144, h: 56 }];
  }

  protected onHit(_h: Hit, _p: number, dmg: number) {
    this.host.fx.flash(this.body, 40);
    this.host.fx.flash(this.turret, 40);
    return dmg;
  }

  update(dt: number) {
    if (this.moving) { this.treadT += dt; this.body.setFrame(Math.floor(this.treadT / 60) % 2 ? 't_1' : 't_0'); }
    this.turret.setPosition(this.body.x + 10, TANK_FLOOR - 60);
  }

  private aimAt(x: number, y: number) {
    const a = Math.atan2(y - this.turret.y, x - this.turret.x);
    this.turret.setRotation(a - Math.PI); // texture's barrel points left
  }

  protected async runPhase(s: Scope, n: number) {
    if (n === 0) {
      this.invuln = false;
      await this.loop(s, [this.shellArc, this.machineGun, this.rocketBarrage, this.treadCharge], 650);
    } else {
      this.say('BRING DA GOAT CANNON', 1600);
      this.host.fx.shake(400, 0.008);
      AudioBus.sfx('sfx_warn');
      await s.wait(1200);
      this.invuln = false;
      await this.loop(s, [this.shellArc, this.machineGun, this.rocketBarrage, this.treadCharge, this.goatCannon], 480);
    }
  }

  private explode(s: Scope, x: number, w = 54) {
    this.hazard(s, { x: x - w / 2, y: TANK_FLOOR - 46, w, h: 46 }, 200);
    this.host.fx.burst(x, TANK_FLOOR - 20, 'fx_flash', { scale: 1.6, tint: 0xff8a1a, duration: 300 });
    this.host.fx.sparks(x, TANK_FLOOR - 10, 0xff8a1a, 10, 160);
    this.host.fx.shake(120, 0.008);
    AudioBus.sfx('sfx_explode', { vol: 0.6, maxCopies: 3 });
  }

  private reticle(s: Scope, x: number, ms: number) {
    const r = s.own(this.host.add.image(x, TANK_FLOOR - 4, 'fx_reticle').setDepth(36));
    s.tween({ targets: r, scaleX: { from: 1.6, to: 0.9 }, alpha: { from: 0.4, to: 1 }, duration: ms });
    s.delay(ms, () => r.destroy());
  }

  private async shellArc(s: Scope) {
    for (let k = 0; k < (this.phase ? 4 : 3); k++) {
      const tx = Phaser.Math.Clamp(this.player.x, 30, 420);
      this.aimAt(tx, TANK_FLOOR - 160);
      this.reticle(s, tx, 900);
      await s.wait(250);
      const t = 0.65, g = 900;
      const sx = this.turret.x - 34, sy = this.turret.y - 4;
      this.shot(s, { texture: 'e_bigshell', x: sx, y: sy, vx: (tx - sx) / t, vy: (TANK_FLOOR - 8 - sy - 0.5 * g * t * t) / t, gravity: g, damage: 1, lifeMs: 3000, hitW: 9, world: 'die', onExpire: (x) => this.explode(s, x) });
      AudioBus.sfx('sfx_shotgun', { vol: 0.7 });
      this.host.fx.burst(sx, sy, 'fx_flash', { scale: 0.6, duration: 150 });
      await s.wait(this.phase ? 520 : 700);
    }
    await s.wait(500);
  }

  private async machineGun(s: Scope) {
    this.say('BRRRRAP', 800);
    for (let v = 0; v < (this.phase ? 4 : 3); v++) {
      const high = v % 2 === 1;
      const y = high ? TANK_FLOOR - 58 : TANK_FLOOR - 12;
      this.aimAt(0, y);
      this.warnBand(s, 0, y - 6, this.body.x - 70, 12, 600, 0xffe14a);
      this.warnIcon(s, 40, y - 18, 600);
      await s.wait(620);
      for (let i = 0; i < 7; i++) {
        this.shot(s, { texture: 'p_bullet', x: this.turret.x - 34, y, vx: -340, vy: 0, damage: 1, lifeMs: 2500, hitW: 6, hitH: 4, world: 'none', tint: 0xff4a4a, scale: 1.5 });
        AudioBus.sfx('sfx_uzi', { vol: 0.35, maxCopies: 3 });
        await s.wait(85);
      }
      await s.wait(500);
    }
    this.turret.setRotation(0);
  }

  private async rocketBarrage(s: Scope) {
    this.say('ROCKETS INCOMING', 1000);
    this.aimAt(this.turret.x, 0);
    const xs: number[] = [];
    const base = 40 + this.rand() * 60;
    for (let x = base; x < 420; x += 95) xs.push(x);
    xs.forEach((x) => this.reticle(s, x, 1000));
    await s.wait(500);
    xs.forEach((x, i) => s.delay(i * 60, () => this.shot(s, { texture: 'e_rocket', x, y: -20, vx: 0, vy: 640, damage: 1, lifeMs: 2000, hitW: 8, rotate: 'vel', world: 'die', onExpire: (ex) => this.explode(s, ex, 44) })));
    await s.wait(1300);
    this.turret.setRotation(0);
  }

  private async treadCharge(s: Scope) {
    this.say('VRRRRRM', 900);
    AudioBus.sfx('sfx_chainsaw', { vol: 0.7, rate: 0.5 });
    this.warnBand(s, 210, TANK_FLOOR - 70, 240, 70, 850);
    s.tween({ targets: this.body, x: HOME + 6, yoyo: true, repeat: 5, duration: 60 });
    await s.wait(850);
    this.moving = true;
    await s.tweenAsync({ targets: this.body, x: 300, duration: 650, ease: 'Quad.easeIn' });
    this.host.fx.shake(200, 0.01);
    AudioBus.sfx('sfx_slam');
    await s.wait(500);
    await s.tweenAsync({ targets: this.body, x: HOME, duration: 900, ease: 'Sine.easeInOut' });
    this.moving = false;
    await s.wait(300);
  }

  private async goatCannon(s: Scope) {
    this.say('IT\'S A FUCKING GOAT', 1200);
    for (let i = 0; i < 3; i++) {
      this.aimAt(150, TANK_FLOOR - 200);
      await s.wait(350);
      this.shot(s, { texture: 'gabor_small', x: this.turret.x - 34, y: this.turret.y, vx: -(150 + i * 50), vy: -300, gravity: 600, damage: 1, lifeMs: 5000, hitW: 22, hitH: 18, world: 'bounce', bounces: 3, bounceFactor: 0.75, scale: 0.8, tint: 0xd8b890, reflectable: true });
      AudioBus.sfx('sfx_boing');
      this.host.fx.pop(this.turret.x - 40, this.turret.y - 20, 'BAA', '#ffffff', 10);
    }
    await s.wait(1600);
  }

  destroy() {
    this.scope?.dispose();
    this.body.destroy();
    this.turret.destroy();
  }
}
