import Phaser from 'phaser';
import { BossBase } from './BossBase';
import { Scope } from './Scope';
import type { GameHost } from '../core/host';
import type { Hit, Rect } from '../combat/types';
import { AudioBus } from '../audio/AudioBus';
import { Hopper } from '../enemies/roster';

export const RIK_FLOOR = 322;
const HOME = 500;

/** UNCLE RIK / SANRIK. "Ello it's Uncle Rik, I need a shit really badly." */
export class UncleRik extends BossBase {
  body: Phaser.GameObjects.Sprite;
  head: Phaser.GameObjects.Sprite;
  private mouthOpen = false;
  private finaleDone = false;
  private facing = -1;

  constructor(host: GameHost, x = HOME) {
    super(host, 3600, [0.66, 0.33]);
    this.body = host.add.sprite(x, RIK_FLOOR, 'boss_rik', 'idle').setOrigin(0.5, 1).setDepth(30).setScale(1.15);
    this.head = host.add.sprite(320, 460, 'boss_rikhead', 'h_0').setOrigin(0.5, 0.5).setDepth(8).setVisible(false);
  }

  speechPos() {
    return this.phase === 2 ? { x: 320, y: this.head.y - 100 } : { x: this.body.x, y: RIK_FLOOR - 165 };
  }

  hurtRects(): Rect[] {
    if (this.defeated) return [];
    if (this.phase === 2) {
      const r = { x: this.head.x - 50, y: this.head.y + 10, w: 100, h: 60 };
      return [r, { x: this.head.x - 100, y: this.head.y - 80, w: 200, h: 90 }];
    }
    return [{ x: this.body.x - 56, y: RIK_FLOOR - 150, w: 112, h: 146 }];
  }

  contactRects(): Rect[] {
    if (this.defeated || this.phase < 0 || this.phase === 2) return [];
    return [{ x: this.body.x - 48, y: RIK_FLOOR - 130, w: 96, h: 126 }];
  }

  protected onHit(_h: Hit, part: number, dmg: number) {
    if (this.phase === 2) {
      this.host.fx.flash(this.head, 40);
      // the big head mostly shrugs it off; the open mouth is the weak point
      if (part === 0 && this.mouthOpen) return dmg * 1.5;
      return dmg * 0.25;
    }
    this.host.fx.flash(this.body, 40);
    return dmg;
  }

  private face(f: string) {
    this.body.setFrame(f);
  }

  private dir() {
    return Math.sign(this.player.x - this.body.x) || -1;
  }

  update() {
    if (this.phase < 2 && !this.defeated) this.body.setFlipX(this.facing > 0);
  }

  protected async runPhase(s: Scope, n: number) {
    if (n === 0) {
      this.invuln = false;
      await this.loop(s, [this.burpCone, this.bellyFlop, this.toiletRolls, this.pintRain], 650);
    } else if (n === 1) {
      this.face('strain');
      this.say('PURE BANTA PRESSURE! YEE!', 1700);
      AudioBus.sfx('sfx_rave');
      this.host.fx.shake(300, 0.006);
      await s.wait(1300);
      this.face('idle');
      this.invuln = false;
      await this.loop(s, [this.fartGust, this.riklets, this.blockedToilet, this.burpCone, this.bellyFlop], 520);
    } else {
      this.face('strain');
      this.say('SANRIK SUPREME!!!', 1800);
      AudioBus.sfx('sfx_slam');
      this.host.fx.shake(800, 0.01);
      await s.tweenAsync({ targets: this.body, y: RIK_FLOOR + 160, duration: 700, ease: 'Quad.easeIn' });
      this.body.setVisible(false);
      this.head.setVisible(true).setY(470);
      await s.tweenAsync({ targets: this.head, y: 150, duration: 1300, ease: 'Back.easeOut' });
      this.invuln = false;
      await this.loop(s, [this.inhale, this.burpRings, this.miniHeads, this.inhale], 600);
    }
  }

  // ---- phase 1 ----
  private async burpCone(s: Scope) {
    this.facing = this.dir();
    this.face('inhale');
    this.say('*HUUURRRK*', 700);
    const d = this.facing;
    const x0 = this.body.x + d * 50;
    const w = 230;
    const rx = d > 0 ? x0 : x0 - w;
    this.warnBand(s, rx, RIK_FLOOR - 90, w, 90, 750, 0x9fe06a);
    await s.wait(750);
    this.face('burp');
    AudioBus.sfx('sfx_fart', { rate: 0.6 });
    this.hazard(s, { x: rx, y: RIK_FLOOR - 90, w, h: 90 }, 500);
    const cloud = s.own(this.host.add.sprite(x0 + d * w / 2, RIK_FLOOR - 45, 'fx_gas', 'g_0').play('gas_boil').setScale(w / 44, 2.8).setAlpha(0.8).setDepth(55));
    s.tween({ targets: cloud, alpha: 0, delay: 300, duration: 300 });
    this.host.fx.shake(200, 0.006);
    await s.wait(600);
    this.face('idle');
  }

  private async bellyFlop(s: Scope) {
    const tx = Phaser.Math.Clamp(this.player.x, 80, 560);
    this.face('strain');
    this.say('BELLY FLOP!', 900);
    this.warnShadow(s, tx, RIK_FLOOR, 130, 850);
    s.tween({ targets: this.body, scaleY: 1.0, yoyo: true, duration: 200 });
    await s.wait(500);
    const x0 = this.body.x;
    await s.tweenAsync({ targets: this.body, y: RIK_FLOOR - 160, x: (x0 + tx) / 2, duration: 300, ease: 'Quad.easeOut' });
    await s.tweenAsync({ targets: this.body, y: RIK_FLOOR, x: tx, duration: 260, ease: 'Quad.easeIn' });
    AudioBus.sfx('sfx_slam');
    this.host.fx.shake(250, 0.012);
    this.hazard(s, { x: tx - 60, y: RIK_FLOOR - 40, w: 120, h: 40 }, 160);
    for (const d of [-1, 1]) this.shot(s, { texture: 'e_wave', x: tx + d * 50, y: RIK_FLOOR - 5, vx: d * 170, vy: 0, damage: 1, lifeMs: 3000, hitW: 18, hitH: 8, world: 'none', tint: 0x9fe06a });
    this.face('idle');
    await s.wait(500);
    // waddle back towards a side
    const home = tx > 320 ? HOME : 140;
    await s.tweenAsync({ targets: this.body, x: home, duration: 700 });
  }

  private async toiletRolls(s: Scope) {
    this.say('WHO WANTS BOG ROLL?', 1000);
    for (let i = 0; i < 5; i++) {
      const d = this.dir();
      this.shot(s, { texture: 'e_toiletroll', x: this.body.x + d * 40, y: RIK_FLOOR - 120, vx: d * (90 + i * 35), vy: -280, gravity: 520, damage: 1, lifeMs: 5000, hitW: 11, world: 'bounce', bounces: 2, bounceFactor: 0.7, rotate: 'spin', spin: 10, reflectable: true });
      AudioBus.sfx('sfx_throw', { vol: 0.5 });
      await s.wait(260);
    }
    await s.wait(900);
  }

  private async pintRain(s: Scope) {
    this.say('ROUND ON ME!', 1000);
    const off = this.rand() < 0.5 ? 0 : 60;
    const xs: number[] = [];
    for (let x = 40 + off; x < 620; x += 120) xs.push(x);
    xs.forEach((x) => this.warnShadow(s, x, RIK_FLOOR, 30, 800));
    await s.wait(800);
    xs.forEach((x) => this.shot(s, { texture: 'e_pint', x, y: -10, vx: 0, vy: 380, damage: 1, lifeMs: 2500, hitW: 10, hitH: 14, world: 'die', onExpire: (ex, ey) => { this.host.fx.sparks(ex, ey, 0xffd06a, 5, 90); AudioBus.sfx('sfx_shatter', { vol: 0.3, maxCopies: 2 }); } }));
    await s.wait(1200);
  }

  // ---- phase 2 ----
  private async fartGust(s: Scope) {
    this.facing = this.dir();
    this.face('back');
    this.say('I NEED A FART', 1000);
    await s.wait(800);
    AudioBus.sfx('sfx_fart', { rate: 0.5 });
    AudioBus.sfx('sfx_whoosh');
    const push = this.facing * 130; // blows you AWAY from Rik's backside... towards the far wall
    this.host.combat.addZone({ team: 'enemy', rect: () => ({ x: 0, y: -100, w: 640, h: 500 }), until: this.host.now + 2200, damage: 0, tickMs: 1000, kind: 'hazard', effect: 'push', effectData: push, phaseScoped: true });
    const bx = this.body.x - this.facing * 30;
    this.hazard(s, { x: bx - 40, y: RIK_FLOOR - 80, w: 80, h: 80 }, 1500);
    s.every(90, () => { this.host.fx.sparks(bx, RIK_FLOOR - 60, 0x9fe06a, 2, 90); this.host.fx.dust(Math.random() * 640, RIK_FLOOR - Math.random() * 60, 1); }, 22);
    await s.wait(2300);
    this.face('idle');
  }

  private async riklets(s: Scope) {
    this.say('MEET THE LITTLE RIKS!', 1200);
    for (let i = 0; i < 3; i++) {
      const x = [100, 320, 540][i];
      this.host.fx.burst(x, RIK_FLOOR - 20, 'fx_ring', { scale: 0.6, tint: 0x9fe06a });
      const r = new Hopper(this.host, x, RIK_FLOOR - 4, '__BASE', '__BASE', 'riklet', 30, [18, 24, 4, 5]);
      (this.host as unknown as { addEnemy(e: unknown): void }).addEnemy(r);
      s.onDispose(() => { if (r.alive) r.kill(); });
      await s.wait(300);
    }
    await s.wait(2200);
  }

  private async blockedToilet(s: Scope) {
    this.say('BLOCKED THE BOG AGAIN', 1200);
    const vents = [80, 210, 340, 470, 600].filter((_, i) => i % 2 === (this.rand() < 0.5 ? 0 : 1));
    for (const x of vents) this.warnBand(s, x - 20, RIK_FLOOR - 10, 40, 10, 800, 0x9fe06a);
    await s.wait(800);
    for (const x of vents) {
      this.hazard(s, { x: x - 18, y: RIK_FLOOR - 110, w: 36, h: 110 }, 700);
      const g = s.own(this.host.add.sprite(x, RIK_FLOOR - 55, 'fx_gas', 'g_1').play('gas_boil').setScale(0.9, 3.4).setAlpha(0.8).setDepth(55));
      s.tween({ targets: g, alpha: 0, delay: 500, duration: 200 });
    }
    AudioBus.sfx('sfx_burst');
    await s.wait(1100);
  }

  // ---- phase 3 ----
  private openMouth(s: Scope, ms: number) {
    this.mouthOpen = true;
    this.head.setFrame('h_2');
    s.delay(ms, () => { this.mouthOpen = false; this.head.setFrame('h_0'); });
  }

  private async inhale(s: Scope) {
    if (!this.finaleDone && this.hp < this.maxHp * 0.12) { await this.finale(s); return; }
    this.say('*HUUUUUUP*', 900);
    this.head.setFrame('h_1');
    await s.wait(500);
    this.openMouth(s, 2400);
    const dir = () => Math.sign(320 - this.player.x) || 1;
    s.every(50, () => this.player.applyZone('push', 120, dir() * 95), 44);
    this.hazard(s, { x: 270, y: RIK_FLOOR - 50, w: 100, h: 50 }, 2200);
    s.every(120, () => this.host.fx.dust(Math.random() * 640, RIK_FLOOR - Math.random() * 100, 1), 18);
    await s.wait(2500);
  }

  private async burpRings(s: Scope) {
    this.openMouth(s, 1600);
    AudioBus.sfx('sfx_fart', { rate: 0.4 });
    for (let w = 0; w < 3; w++) {
      const gap = this.rand() * Math.PI * 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + w * 0.26;
        if (Math.abs(Phaser.Math.Angle.Wrap(a - gap)) < 0.5) continue;
        this.shot(s, { texture: 'e_orb', x: 320, y: this.head.y + 40, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, damage: 1, lifeMs: 4500, hitW: 9, world: 'die', tint: 0x9fe06a });
      }
      await s.wait(700);
    }
    await s.wait(700);
  }

  private async miniHeads(s: Scope) {
    this.openMouth(s, 1500);
    this.say('LITTLE RIKS!!', 900);
    for (let i = 0; i < 2; i++) {
      const x = i ? 420 : 220;
      const r = new Hopper(this.host, x, RIK_FLOOR - 4, '__BASE', '__BASE', 'riklet', 30, [18, 24, 4, 5]);
      (this.host as unknown as { addEnemy(e: unknown): void }).addEnemy(r);
      s.onDispose(() => { if (r.alive) r.kill(); });
      await s.wait(250);
    }
    await s.wait(1800);
  }

  private async finale(s: Scope) {
    this.finaleDone = true;
    this.invuln = true;
    this.head.setFrame('h_1');
    this.say('OH NO. OH NO NO NO. HERE IT COMES.', 2000);
    this.host.fx.banner('CATASTROPHIC CLEARANCE', 'GET ON A PLATFORM. NOW.', '#9fe06a', 2200);
    AudioBus.sfx('sfx_warn');
    this.warnBand(s, 0, RIK_FLOOR - 50, 640, 50, 2400, 0x9fe06a);
    await s.wait(2400);
    this.head.setFrame('h_2');
    AudioBus.sfx('sfx_explode');
    AudioBus.sfx('sfx_fart', { rate: 0.3 });
    this.host.fx.shake(1200, 0.02);
    this.hazard(s, { x: 0, y: RIK_FLOOR - 50, w: 640, h: 50 }, 1400);
    for (let i = 0; i < 12; i++) s.delay(i * 100, () => { const g = this.host.add.sprite(Math.random() * 640, RIK_FLOOR - 20, 'fx_gas', 'g_0').play('gas_boil').setScale(2.2).setDepth(56).setAlpha(0.9); this.host.tweens.add({ targets: g, alpha: 0, y: g.y - 40, duration: 900, onComplete: () => g.destroy() }); });
    await s.tweenAsync({ targets: this.head, y: -200, angle: 30, duration: 1500, ease: 'Quad.easeIn' });
    this.defeat();
  }

  destroy() {
    this.scope?.dispose();
    this.body.destroy();
    this.head.destroy();
  }
}
