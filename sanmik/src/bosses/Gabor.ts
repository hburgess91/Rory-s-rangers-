import Phaser from 'phaser';
import { BossBase, Attack } from './BossBase';
import { Scope } from './Scope';
import type { GameHost } from '../core/host';
import type { Hit, Rect } from '../combat/types';
import { AudioBus } from '../audio/AudioBus';
import { session } from '../core/session';

export const GABOR_FLOOR = 322;

interface Seal { kind: 'goat' | 'max' | 'pepsi'; img: Phaser.GameObjects.Image; hp: number; alive: boolean }

/**
 * GABOR THE GOAT. The pet goat SanMik wasted a wish on. Sadistic, never explicit:
 * he just enjoys watching you get hurt - so much that he stops to gloat (DELIGHT).
 */
export class Gabor extends BossBase {
  small: Phaser.GameObjects.Sprite;
  big: Phaser.GameObjects.Sprite;
  head: Phaser.GameObjects.Sprite;
  lamp: Phaser.GameObjects.Image;
  seals: Seal[] = [];
  delight = 0;
  gloatUntil = 0;
  onTear: () => void = () => {};
  private partMap: (Seal | 'lamp' | 'body')[] = [];

  constructor(host: GameHost) {
    super(host, 4200, [0.8, 0.4]);
    this.small = host.add.sprite(470, GABOR_FLOOR, 'gabor_small').setOrigin(0.5, 1).setScale(1.6).setFlipX(true).setDepth(30);
    this.big = host.add.sprite(500, GABOR_FLOOR, 'boss_gabor', 'grin').setOrigin(0.5, 1).setDepth(30).setVisible(false);
    this.head = host.add.sprite(320, 112, 'boss_gaborhead', 'shut').setDepth(8).setVisible(false);
    this.lamp = host.add.image(320, 218, 'lamp').setScale(2.2).setDepth(31).setVisible(false);
  }

  get gloating() {
    return this.host.now < this.gloatUntil;
  }

  speechPos() {
    if (this.phase === 2) return { x: 320, y: 30 };
    if (this.phase === 1) return { x: this.big.x, y: GABOR_FLOOR - 130 };
    return { x: this.small.x, y: GABOR_FLOOR - 60 };
  }

  hurtRects(): Rect[] {
    this.partMap = [];
    if (this.defeated) return [];
    if (this.phase === 2) {
      const out: Rect[] = [];
      for (const s of this.seals) if (s.alive) { out.push({ x: s.img.x - 20, y: s.img.y - 20, w: 40, h: 40 }); this.partMap.push(s); }
      if (!out.length) { out.push({ x: this.lamp.x - 24, y: this.lamp.y - 14, w: 48, h: 28 }); this.partMap.push('lamp'); }
      return out;
    }
    this.partMap.push('body');
    if (this.phase === 1) return [{ x: this.big.x - 40, y: GABOR_FLOOR - 120, w: 80, h: 118 }];
    return [{ x: this.small.x - 24, y: this.small.y - 48, w: 48, h: 48 }];
  }

  contactRects(): Rect[] {
    if (this.defeated || this.phase < 0 || this.phase === 2) return [];
    if (this.phase === 1) return [{ x: this.big.x - 32, y: GABOR_FLOOR - 110, w: 64, h: 108 }];
    return [{ x: this.small.x - 20, y: this.small.y - 42, w: 40, h: 40 }];
  }

  protected onHit(_h: Hit, part: number, dmg: number) {
    const mult = this.gloating ? 2 : 1;
    const target = this.partMap[part];
    if (target && target !== 'lamp' && target !== 'body') {
      target.hp -= dmg * mult;
      this.host.fx.flash(target.img, 50);
      if (target.hp <= 0 && target.alive) this.breakSeal(target);
      return dmg * 0.5 * mult;
    }
    const spr = this.phase === 2 ? this.lamp : this.phase === 1 ? this.big : this.small;
    this.host.fx.flash(spr, 50);
    return dmg * mult * (target === 'lamp' ? 1.5 : 1);
  }

  private breakSeal(seal: Seal) {
    seal.alive = false;
    AudioBus.sfx('sfx_shatter');
    this.host.fx.sparks(seal.img.x, seal.img.y, 0xffe08a, 16, 200);
    this.host.tweens.add({ targets: seal.img, alpha: 0, scale: 2, duration: 300 });
    const left = this.seals.filter((s) => s.alive).length;
    this.say(left ? `NOT MY ${seal.kind === 'goat' ? 'GOAT' : seal.kind === 'max' ? 'PEPSI MAX' : 'PEPSI'}!` : 'THE LAMP... NO... IT\'S MINE!', 1400);
  }

  /** Called by the scene whenever the player takes a hit. */
  addDelight() {
    if (this.defeated || this.phase < 0 || this.invuln || this.gloating) return;
    this.delight = Math.min(100, this.delight + 34);
    this.host.fx.pop(this.speechPos().x, this.speechPos().y + 20, 'DELIGHT +', '#ff8ad0', 10, 14, 600);
    if (this.delight >= 100) this.gloat();
  }

  private gloat() {
    const n = this.phase;
    this.delight = 0;
    this.scope?.dispose();
    this.host.combat.clearEnemy(true);
    const s = new Scope(this.host, `gabor-gloat-${n}`);
    this.scope = s;
    this.gloatUntil = this.host.now + 2300;
    if (n === 1) this.big.setFrame('gloat');
    if (n === 2) this.head.setFrame('open');
    this.say(['Mmm. Do that again.', 'I LOVE it when you get hurt.', 'Oh that\'s lovely. Look at your little face.', 'Again! Again!'][Math.floor(this.rand() * 4)], 2000);
    this.host.fx.pop(this.speechPos().x, this.speechPos().y + 30, 'GLOATING: DOUBLE DAMAGE', '#ffe14a', 10, 18, 1600);
    AudioBus.sfx('sfx_cheer', { rate: 0.6, vol: 0.6 });
    s.delay(2300, () => {
      if (n === 1) this.big.setFrame('grin');
      if (n === 2) this.head.setFrame('shut');
      void this.phaseLoop(s, n);
    });
  }

  protected async runPhase(s: Scope, n: number) {
    if (n === 0) {
      this.invuln = false;
      await this.phaseLoop(s, 0);
    } else if (n === 1) {
      this.say('Now we\'re actually having fun.', 1800);
      AudioBus.sfx('sfx_shatter');
      this.host.fx.shake(500, 0.01);
      this.onTear();
      await s.tweenAsync({ targets: this.small, scale: 0, duration: 500 });
      this.small.setVisible(false);
      this.big.setVisible(true).setScale(0.2).setPosition(500, GABOR_FLOOR);
      await s.tweenAsync({ targets: this.big, scale: 1, duration: 700, ease: 'Back.easeOut' });
      this.invuln = false;
      await this.phaseLoop(s, 1);
    } else {
      this.say('THE LAMP IS MINE. I AM DA MAJEK GOAT.', 2000);
      this.host.fx.shake(800, 0.012);
      AudioBus.sfx('sfx_slam');
      await s.tweenAsync({ targets: this.big, y: GABOR_FLOOR + 140, duration: 600, ease: 'Quad.easeIn' });
      this.big.setVisible(false);
      this.head.setVisible(true).setY(-120);
      this.lamp.setVisible(true).setAlpha(0);
      await s.tweenAsync({ targets: this.head, y: 112, duration: 1200, ease: 'Back.easeOut' });
      s.tween({ targets: this.lamp, alpha: 1, duration: 400 });
      this.seals = (['goat', 'max', 'pepsi'] as const).map((kind, i) => ({
        kind, hp: 360, alive: true,
        img: this.host.add.image([110, 530, 320][i], [130, 130, 268][i], `seal_${kind}`).setDepth(32).setScale(0),
      }));
      this.seals.forEach((sl) => { s.tween({ targets: sl.img, scale: 1, duration: 400, ease: 'Back.easeOut' }); s.tween({ targets: sl.img, angle: 360, duration: 6000, repeat: -1 }); });
      await s.wait(500);
      this.invuln = false;
      await this.phaseLoop(s, 2);
    }
  }

  private phaseLoop(s: Scope, n: number) {
    const sets: Attack[][] = [
      [this.pepsiPop, this.hoofHop, this.friendlyHearts, this.headbutt],
      [this.chainCurtain, this.spotlight, this.heartCage, this.wrongWay],
      [this.lampSpiral, this.hornScissors, this.mouthTunnel],
    ];
    return this.loop(s, sets[n], n === 0 ? 650 : 520);
  }

  // ---------------- phase 1: NEW BEST FRIEND ----------------
  private hopTo(s: Scope, x: number, ms = 420) {
    this.small.setFlipX(x < this.small.x);
    return Promise.all([
      s.tweenAsync({ targets: this.small, x, duration: ms }),
      s.tweenAsync({ targets: this.small, y: GABOR_FLOOR - 70, duration: ms / 2, yoyo: true, ease: 'Quad.easeOut' }),
    ]);
  }

  private async pepsiPop(s: Scope) {
    this.say('Pepsi for my best friend!', 1200);
    const d = Math.sign(this.player.x - this.small.x) || -1;
    for (let i = 0; i < 4; i++) {
      this.shot(s, { texture: i % 2 ? 'e_maxbottle' : 'e_bottle', x: this.small.x, y: GABOR_FLOOR - 40, vx: d * (100 + i * 40), vy: -300, gravity: 600, damage: 1, lifeMs: 5000, hitW: 8, hitH: 14, world: 'bounce', bounces: 2, bounceFactor: 0.7, rotate: 'spin', spin: 12, reflectable: true });
      AudioBus.sfx('sfx_boing', { vol: 0.4 });
      await s.wait(280);
    }
    await s.wait(900);
  }

  private async hoofHop(s: Scope) {
    for (let k = 0; k < 3; k++) {
      const tx = Phaser.Math.Clamp(this.player.x, 60, 580);
      this.warnShadow(s, tx, GABOR_FLOOR, 50, 550);
      this.host.fx.dust(this.small.x, GABOR_FLOOR, 3);
      await s.wait(350);
      await this.hopTo(s, tx, 420 - k * 40);
      this.hazard(s, { x: tx - 26, y: GABOR_FLOOR - 30, w: 52, h: 30 }, 120);
      AudioBus.sfx('sfx_land');
      if (k === 2) for (const dd of [-1, 1]) this.shot(s, { texture: 'e_wave', x: tx + dd * 30, y: GABOR_FLOOR - 5, vx: dd * 160, vy: 0, damage: 1, lifeMs: 3000, hitW: 18, hitH: 8, world: 'none', tint: 0xff4f6f });
      await s.wait(180);
    }
    await s.wait(500);
  }

  private async friendlyHearts(s: Scope) {
    this.say('Have a heart! It\'s healthy!', 1300);
    for (let i = 0; i < 5; i++) {
      const a = Math.atan2(this.player.y - 30 - (GABOR_FLOOR - 40), this.player.x - this.small.x) + (i - 2) * 0.18;
      const p = this.shot(s, { texture: 'e_heart', x: this.small.x, y: GABOR_FLOOR - 40, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, damage: 1, lifeMs: 5000, hitW: 12, world: 'die', reflectable: true });
      // the "healthy" heart grows teeth before it reaches you
      s.delay(650, () => { if (p?.live) { p.setTexture('e_heartteeth'); AudioBus.sfx('sfx_plip', { vol: 0.3, rate: 0.5 }); } });
      await s.wait(160);
    }
    await s.wait(1400);
  }

  private async headbutt(s: Scope) {
    const fromRight = this.small.x > 320;
    this.small.setFlipX(fromRight);
    this.say('HEADBUTT, BESTIE!', 900);
    this.warnBand(s, 0, GABOR_FLOOR - 34, 640, 34, 700);
    s.every(80, () => this.host.fx.dust(this.small.x + (fromRight ? 14 : -14), GABOR_FLOOR, 1), 8);
    await s.wait(700);
    AudioBus.sfx('sfx_whoosh');
    await s.tweenAsync({ targets: this.small, x: fromRight ? 60 : 580, duration: 1100, ease: 'Quad.easeIn' });
    this.host.fx.shake(150, 0.008);
    AudioBus.sfx('sfx_slam', { vol: 0.5 });
    await s.wait(400);
  }

  // ---------------- phase 2: DA SADIST ----------------
  private async chainCurtain(s: Scope) {
    this.say('Let\'s lock the doors.', 1200);
    const px = Phaser.Math.Clamp(this.player.x, 40, 600);
    const xs = [px, px - 150, px + 150].filter((x) => x > 20 && x < 620);
    xs.forEach((x) => this.warnBand(s, x - 10, 0, 20, GABOR_FLOOR, 750, 0xc8a03a));
    await s.wait(750);
    for (const x of xs) {
      const c = s.own(this.host.add.tileSprite(x, -GABOR_FLOOR, 12, GABOR_FLOOR, 'chain').setOrigin(0.5, 0).setDepth(46));
      s.tween({ targets: c, y: 0, duration: 160, ease: 'Quad.easeIn' });
      s.delay(2100, () => s.tween({ targets: c, y: -GABOR_FLOOR, duration: 300, onComplete: () => c.destroy() }));
      this.hazard(s, { x: x - 6, y: 0, w: 12, h: GABOR_FLOOR }, 2200);
    }
    AudioBus.sfx('sfx_slam', { vol: 0.5, rate: 1.4 });
    await s.wait(2500);
  }

  private async spotlight(s: Scope) {
    this.say('Look at me when I\'m hurting you.', 1300);
    for (let k = 0; k < 2; k++) {
      const beam = s.own(this.host.add.triangle(this.player.x, 60, 0, 0, -34, GABOR_FLOOR - 60, 34, GABOR_FLOOR - 60, 0xfff6c8, 0.22).setOrigin(0.5, 0).setDepth(34));
      const t0 = this.host.now;
      await new Promise<void>((res) => {
        const ev = s.every(30, () => {
          if (this.host.now - t0 < 1100) beam.x += (this.player.x - beam.x) * 0.1;
          else { ev?.remove(false); res(); }
        });
      });
      beam.setFillStyle(0xff4a4a, 0.3);
      const x = beam.x;
      const w = s.own(this.host.add.image(x, -40, 'stage_weight').setOrigin(0.5, 1).setDepth(47));
      await s.wait(300);
      await s.tweenAsync({ targets: w, y: GABOR_FLOOR, duration: 180, ease: 'Quad.easeIn' });
      AudioBus.sfx('sfx_slam');
      this.host.fx.shake(200, 0.012);
      this.hazard(s, { x: x - 24, y: GABOR_FLOOR - 34, w: 48, h: 34 }, 150);
      beam.destroy();
      s.delay(600, () => w.destroy());
      await s.wait(400);
    }
  }

  private async heartCage(s: Scope) {
    this.say('A cage of love. Just for you.', 1400);
    const cx = this.player.x, cy = this.player.y - 24;
    const gap = this.rand() * Math.PI * 2;
    const ghosts: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.abs(Phaser.Math.Angle.Wrap(a - gap)) < 0.42) continue;
      ghosts.push(s.own(this.host.add.image(cx + Math.cos(a) * 130, cy + Math.sin(a) * 130, 'e_heartteeth').setAlpha(0.35).setDepth(45)));
    }
    await s.wait(650);
    ghosts.forEach((g) => {
      const a = Math.atan2(cy - g.y, cx - g.x);
      this.shot(s, { texture: 'e_heartteeth', x: g.x, y: g.y, vx: Math.cos(a) * 75, vy: Math.sin(a) * 75, damage: 1, lifeMs: 3200, hitW: 12, world: 'none', reflectable: true });
      g.destroy();
    });
    await s.wait(2600);
  }

  private async wrongWay(s: Scope) {
    this.say('Wrong way, sweetheart.', 1200);
    const d = this.rand() < 0.5 ? -1 : 1;
    const arrows = s.own(this.host.add.text(320, GABOR_FLOOR + 12, d < 0 ? '<<<  <<<  <<<  <<<  <<<' : '>>>  >>>  >>>  >>>  >>>', { fontFamily: 'monospace', fontSize: '14px', color: '#ffe08a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(50));
    s.tween({ targets: arrows, x: 320 + d * 30, repeat: -1, duration: 400 });
    await s.wait(500);
    this.host.combat.addZone({ team: 'enemy', rect: () => ({ x: 0, y: -100, w: 640, h: 500 }), until: this.host.now + 2600, damage: 0, tickMs: 1000, kind: 'hazard', effect: 'push', effectData: d * 110, phaseScoped: true });
    for (let i = 0; i < 6; i++) {
      const x = 40 + this.rand() * 560;
      this.shot(s, { texture: 'p_hoof', x, y: -10, vx: 0, vy: 260, damage: 1, lifeMs: 2500, hitW: 8, world: 'die' });
      await s.wait(380);
    }
    await s.wait(500);
    arrows.destroy();
  }

  // ---------------- phase 3: DA MAJEK GOAT ----------------
  private async sealExtras(s: Scope) {
    for (const sl of this.seals) {
      if (!sl.alive) continue;
      if (sl.kind === 'goat') for (let i = 0; i < 3; i++) this.shot(s, { texture: 'p_hoof', x: 60 + this.rand() * 520, y: -10, vx: 0, vy: 240, damage: 1, lifeMs: 2500, hitW: 8, world: 'die' });
      if (sl.kind === 'max') for (let i = 0; i < 2; i++) { const x = Phaser.Math.Clamp(this.player.x + (i ? 70 : -70), 30, 610); this.warnBand(s, x - 8, 0, 16, GABOR_FLOOR, 500, 0x2f6cff); s.delay(500, () => this.shot(s, { texture: 'e_maxbottle', x, y: -10, vx: 0, vy: 520, damage: 1, lifeMs: 2000, hitW: 8, hitH: 14, world: 'die' })); }
      if (sl.kind === 'pepsi') for (let i = 0; i < 2; i++) this.shot(s, { texture: 'e_bottle', x: sl.img.x, y: sl.img.y, vx: (i ? 1 : -1) * 120, vy: -200, gravity: 500, damage: 1, lifeMs: 4000, hitW: 8, hitH: 14, world: 'bounce', bounces: 2, rotate: 'spin', spin: 10, reflectable: true });
    }
    await s.wait(300);
  }

  private async lampSpiral(s: Scope) {
    this.say('Make a wish!', 900);
    for (let w = 0; w < 3; w++) {
      const gap = this.rand() * Math.PI;
      for (let i = 0; i < 12; i++) {
        const a = Math.PI * (i / 11) + w * 0.13; // downward fan only
        if (Math.abs(a - gap) < 0.38) continue;
        this.shot(s, { texture: 'e_orb', x: this.lamp.x, y: this.lamp.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, damage: 1, lifeMs: 4000, hitW: 9, world: 'die', tint: 0xffe08a });
      }
      AudioBus.sfx('sfx_sparkle', { vol: 0.4 });
      await s.wait(800);
    }
    await this.sealExtras(s);
    await s.wait(600);
  }

  private async hornScissors(s: Scope) {
    this.say('Snip snip.', 900);
    for (const [y, fromLeft] of [[GABOR_FLOOR - 14, true], [GABOR_FLOOR - 64, false]] as [number, boolean][]) {
      this.warnBand(s, 0, y - 9, 640, 18, 700);
      await s.wait(700);
      const horn = s.own(this.host.add.rectangle(fromLeft ? -160 : 800, y, 300, 14, 0x5a3a2a).setDepth(46).setStrokeStyle(2, 0x2a1a0a));
      const end = fromLeft ? 800 : -160;
      const t0 = this.host.now;
      const ev = s.every(30, () => {
        const k = Math.min(1, (this.host.now - t0) / 900);
        horn.x = (fromLeft ? -160 : 800) + (end - (fromLeft ? -160 : 800)) * k;
        if (k >= 1) ev?.remove(false);
      });
      s.delay(0, () => this.host.combat.addZone({ team: 'enemy', rect: () => ({ x: horn.x - 150, y: y - 7, w: 300, h: 14 }), until: this.host.now + 900, damage: 1, tickMs: 1000, kind: 'hazard', phaseScoped: true }));
      AudioBus.sfx('sfx_whoosh');
      await s.wait(950);
      horn.destroy();
    }
    await this.sealExtras(s);
  }

  private async mouthTunnel(s: Scope) {
    this.head.setFrame('open');
    // mocking voice: a warped copy of YOUR jump noise
    AudioBus.mock(session.char === 'sanmik' ? 'vo_yee' : 'vo_yeghhh', 0.55);
    this.say(session.char === 'sanmik' ? 'yeeeeee~ hehehe' : 'yeghhhhh~ hehehe', 1400);
    const dir = () => Math.sign(320 - this.player.x) || 1;
    s.every(50, () => this.player.applyZone('push', 120, dir() * 80), 40);
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + r * 0.3;
        this.shot(s, { texture: 'e_orb', x: 320, y: 150, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, damage: 1, lifeMs: 4500, hitW: 9, world: 'die', tint: 0xff4f6f });
      }
      await s.wait(650);
    }
    await s.wait(500);
    this.head.setFrame('shut');
    await this.sealExtras(s);
  }

  get debugInfo() {
    return { ...super.debugInfo, delight: this.delight, seals: this.seals.filter((x) => x.alive).length, gloating: this.gloating };
  }

  destroy() {
    this.scope?.dispose();
    this.small.destroy();
    this.big.destroy();
    this.head.destroy();
    this.lamp.destroy();
    this.seals.forEach((s) => s.img.destroy());
  }
}
