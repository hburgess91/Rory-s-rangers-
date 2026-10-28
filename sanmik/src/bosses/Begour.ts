import Phaser from 'phaser';
import { Scope } from './Scope';
import type { GameHost } from '../core/host';
import type { Hit, Rect, Target } from '../combat/types';
import type { ProjSpec } from '../combat/Projectile';
import { BEGOUR, SANCHZ, SCORE } from '../config/tuning';
import { AudioBus } from '../audio/AudioBus';
import { bubble } from '../ui/Dialogue';
import { session } from '../core/session';

export const FLOOR = 322;
const LEFT_HOME = 80;
const RIGHT_HOME = 560;
const ARENA_L = 20;
const ARENA_R = 620;
const RAINBOW = [0xff5a6a, 0xff9a3a, 0xffe14a, 0x6fe07a, 0x5ab8ff, 0x9a6aff];

type Attack = (s: Scope) => Promise<void>;

interface HugPaw {
  img: Phaser.GameObjects.Image;
  heart: Phaser.GameObjects.Image;
  side: -1 | 1; // -1 = left paw (moves right), 1 = right paw (moves left)
  hp: number;
  start: number;
  retreating: boolean;
}

/**
 * BEGOUR THE BEAR. Genuinely friendly. Not secretly evil. A wish fragment made
 * him enormous, and SanMik decided this was a boss fight.
 */
export class Begour implements Target {
  alive = true;
  isBoss = true;
  hp: number = BEGOUR.hp;
  maxHp: number = BEGOUR.hp;
  phase = -1;
  invuln = true;
  defeated = false;
  mode: 'stand' | 'slide' | 'background' = 'stand';
  contactDamage = BEGOUR.contactDamage;
  phaseEntries = [0, 0, 0];
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  head: Phaser.GameObjects.Sprite;
  pawL: Phaser.GameObjects.Image;
  pawR: Phaser.GameObjects.Image;
  slide: Phaser.GameObjects.Image;
  scope: Scope | null = null;
  hugPaws: HugPaw[] = [];
  attackName = '-';
  private stickyUntil = 0;
  private headLockUntil = 0;
  private seed = 12345;
  private lastAttack = -1;
  private breathe: Phaser.Tweens.Tween;
  onDefeated: () => void = () => {};

  constructor(private host: GameHost, x: number, scale = 0.8) {
    const s = host;
    this.root = s.add.container(x, FLOOR).setDepth(30).setScale(scale);
    this.body = s.add.image(0, 0, 'begour_body').setOrigin(0.5, 1);
    this.pawL = s.add.image(-58, -50, 'begour_paw');
    this.pawR = s.add.image(58, -50, 'begour_paw');
    this.head = s.add.sprite(0, -78, 'begour_head', 'happy').setOrigin(0.5, 1);
    this.root.add([this.body, this.pawL, this.pawR, this.head]);
    this.slide = s.add.image(x, FLOOR, 'begour_slide').setOrigin(0.5, 1).setDepth(31).setVisible(false);
    this.breathe = s.tweens.add({ targets: this.body, scaleY: 1.03, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
  }

  get scale() {
    return this.root.scaleY;
  }

  // ---------------- Target ----------------

  private bodyRect(): Rect {
    const k = this.scale;
    return { x: this.root.x - 50 * k, y: this.root.y - 92 * k, w: 100 * k, h: 92 * k };
  }

  private headRect(): Rect {
    const k = this.scale;
    const cy = this.root.y - 78 * k - 46 * k;
    return { x: this.root.x - 42 * k, y: cy - 34 * k, w: 84 * k, h: 70 * k };
  }

  private slideRect(): Rect {
    return { x: this.slide.x - 66, y: FLOOR - 40, w: 132, h: 40 };
  }

  hurtRects(): Rect[] {
    if (this.defeated) return [];
    if (this.mode === 'slide') return [this.slideRect()];
    if (this.mode === 'background') return [this.headRect(), ...this.hugPaws.map((p) => this.heartRect(p))];
    const b = this.bodyRect();
    return [this.headRect(), { x: b.x, y: b.y, w: b.w, h: b.h }];
  }

  contactRects(): Rect[] {
    if (this.defeated || this.invuln && this.phase < 0) return [];
    if (this.mode === 'slide') return [this.slideRect()];
    if (this.mode === 'background') return this.hugPaws.map((p) => ({ x: p.img.x - 40, y: FLOOR - 100, w: 80, h: 100 }));
    const b = this.bodyRect();
    return [{ x: b.x + 10, y: b.y + 14, w: b.w - 20, h: b.h - 14 }];
  }

  private heartRect(p: HugPaw): Rect {
    return { x: p.heart.x - 12, y: p.heart.y - 11, w: 24, h: 22 };
  }

  takeHit(hit: Hit, part: number): boolean {
    if (this.defeated || this.invuln) return false;
    const now = this.host.now;
    let dmg = hit.damage;
    if (now < this.stickyUntil) dmg *= SANCHZ.sticky.bossBonus;
    if (hit.sticky) this.stickyUntil = now + SANCHZ.sticky.durationMs;

    if (this.mode === 'background' && part > 0) {
      const paw = this.hugPaws[part - 1];
      if (!paw || paw.retreating) return false;
      paw.hp -= dmg;
      this.host.fx.flash(paw.heart, 60);
      if (paw.hp <= 0) this.popPaw(paw);
      return true;
    }

    this.hp -= dmg;
    this.host.fx.flash(this.head, 50);
    if (this.mode !== 'slide' && now > this.headLockUntil && this.phase === 0) {
      this.head.setFrame('hurt');
      this.headLockUntil = now + 180;
      this.host.time.delayedCall(180, () => { if (this.phase === 0 && !this.defeated) this.head.setFrame('happy'); });
    }
    this.checkPhase();
    return true;
  }

  private checkPhase() {
    if (this.hp <= 0) { this.defeat(); return; }
    const f = this.hp / this.maxHp;
    if (this.phase === 0 && f <= BEGOUR.phaseAt[0]) this.enterPhase(1);
    else if (this.phase === 1 && f <= BEGOUR.phaseAt[1]) this.enterPhase(2);
  }

  // ---------------- helpers ----------------

  private rand() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  private get player() {
    return this.host.combat.player!;
  }

  private say(text: string, ms = 1500) {
    return bubble(this.host, () => ({ x: Phaser.Math.Clamp(this.mode === 'slide' ? this.slide.x : this.root.x, 90, 550), y: this.headRect().y - 4 }), text, ms);
  }

  private shot(s: Scope, spec: Omit<ProjSpec, 'team' | 'phaseScoped'>) {
    if (!s.alive) return null;
    return this.host.combat.spawn({ ...spec, team: 'enemy', phaseScoped: true });
  }

  private warnShadow(s: Scope, x: number, w: number, ms: number) {
    const sh = s.own(this.host.add.image(x, FLOOR, 'fx_shadow').setDepth(36).setAlpha(0.1).setScale((w / 48) * 0.4, 1));
    s.tween({ targets: sh, alpha: 0.55, scaleX: w / 48, duration: ms });
    s.delay(ms + 60, () => sh.destroy());
    return sh;
  }

  private warnBand(s: Scope, x: number, y: number, w: number, h: number, ms: number, color = 0xff3a3a) {
    const r = s.own(this.host.add.rectangle(x, y, w, h, color, 0.18).setOrigin(0).setDepth(35));
    s.tween({ targets: r, alpha: { from: 0.2, to: 0.6 }, yoyo: true, repeat: -1, duration: 120 });
    s.delay(ms, () => r.destroy());
  }

  private warnIcon(s: Scope, x: number, y: number, ms: number) {
    const i = s.own(this.host.add.image(x, y, 'fx_warn').setDepth(70));
    s.tween({ targets: i, scale: { from: 0.8, to: 1.2 }, yoyo: true, repeat: -1, duration: 100 });
    s.delay(ms, () => i.destroy());
  }

  private dirToPlayer() {
    return Math.sign(this.player.x - this.root.x) || -1;
  }

  private setFace(f: string) {
    if (f === 'cry') this.head.play('begour_cry', true);
    else { this.head.anims.stop(); this.head.setFrame(f); }
  }

  private async pawsTo(s: Scope, lx: number, ly: number, rx: number, ry: number, ms = 200) {
    await Promise.all([
      s.tweenAsync({ targets: this.pawL, x: lx, y: ly, duration: ms, ease: 'Back.easeOut' }),
      s.tweenAsync({ targets: this.pawR, x: rx, y: ry, duration: ms, ease: 'Back.easeOut' }),
    ]);
  }

  private pawsHome(s: Scope) {
    return this.pawsTo(s, -58, -50, 58, -50, 180);
  }

  // ---------------- phases ----------------

  start() {
    this.enterPhase(0);
  }

  enterPhase(n: number) {
    if (n <= this.phase || this.defeated) return; // phases only go forward
    this.phase = n;
    this.phaseEntries[n]++;
    this.scope?.dispose();
    const s = new Scope(this.host, `begour-p${n}`);
    this.scope = s;
    this.host.combat.clearEnemy(true);
    this.host.cameras.main.setRotation(0);
    s.onDispose(() => this.host.cameras?.main?.setRotation(0));
    if (n > 0) session.score += SCORE.bossPhase;
    this.invuln = true;
    void this.runPhase(s, n);
  }

  private async runPhase(s: Scope, n: number) {
    if (n === 0) {
      this.setFace('happy');
      this.invuln = false;
      await this.loop(s, [this.cuddleCharge, this.friendshipHearts, this.honeyPlop, this.beeParade], BEGOUR.recoverMs);
    } else if (n === 1) {
      await this.toStanding(s);
      this.setFace('sad');
      AudioBus.voice('vo_bear_sob');
      this.say("OW! DON'T BE CROSS WITH ME!", 1800);
      await s.wait(1300);
      this.setFace('cry');
      this.invuln = false;
      await this.loop(s, [this.sorryPaw, this.cryMeARiver, this.honeySlip, this.rainbowPanic], BEGOUR.recoverMsP2);
    } else {
      await this.toStanding(s);
      this.setFace('shout');
      AudioBus.voice('vo_bear', { rate: 0.8 });
      this.say('BIG... BEAR... HUG!!!', 1800);
      this.host.fx.shake(600, 0.006);
      await s.tweenAsync({ targets: this.root, x: 320, y: FLOOR + 66, scale: 1.4, duration: 1200, ease: 'Cubic.easeInOut' });
      this.root.setDepth(8);
      this.mode = 'background';
      this.setFace('happy');
      this.pawL.setVisible(false);
      this.pawR.setVisible(false);
      this.spawnHugPaws(s);
      this.invuln = false;
      await this.loop(s, [this.hugHearts, this.hugRainbow], BEGOUR.recoverMsP3);
    }
  }

  private async toStanding(s: Scope) {
    if (this.mode === 'slide') {
      this.slide.setVisible(false);
      this.root.setVisible(true);
      this.root.x = Phaser.Math.Clamp(this.slide.x, LEFT_HOME, RIGHT_HOME);
      this.mode = 'stand';
    }
    await this.pawsHome(s);
  }

  private async loop(s: Scope, attacks: Attack[], recover: number) {
    while (s.alive) {
      let i = Math.floor(this.rand() * attacks.length);
      if (i === this.lastAttack) i = (i + 1) % attacks.length;
      this.lastAttack = i;
      const atk = attacks[i];
      this.attackName = atk.name;
      await atk.call(this, s);
      if (!s.alive) return;
      this.attackName = 'recover';
      await s.wait(recover);
    }
  }

  // ---------------- phase 1: BEST FWEND ----------------

  private async cuddleCharge(s: Scope) {
    const fromRight = this.root.x > 320;
    const dir = fromRight ? -1 : 1;
    const target = fromRight ? LEFT_HOME : RIGHT_HOME;
    this.setFace('happy');
    this.say('CUDDLE TIME!!', 1200);
    AudioBus.voice('vo_bear');
    AudioBus.sfx('sfx_warn');
    await this.pawsTo(s, -70, -110, 70, -110, 220);
    this.warnBand(s, ARENA_L, FLOOR - 40, ARENA_R - ARENA_L, 40, 750);
    this.warnIcon(s, fromRight ? 300 : 340, FLOOR - 56, 750);
    await s.wait(780);
    // flop onto belly and slide
    this.mode = 'slide';
    this.root.setVisible(false);
    this.slide.setVisible(true).setFlipX(dir < 0).setPosition(this.root.x, FLOOR);
    AudioBus.sfx('sfx_whoosh');
    this.host.fx.shake(120, 0.004);
    s.every(70, () => this.host.fx.dust(this.slide.x - dir * 60, FLOOR, 2));
    const dur = (Math.abs(target - this.root.x) / BEGOUR.slideSpeed) * 1000;
    await s.tweenAsync({ targets: this.slide, x: target, duration: dur, ease: 'Linear' });
    this.slide.setVisible(false);
    this.root.x = target;
    this.root.setVisible(true);
    this.mode = 'stand';
    await this.pawsHome(s);
    this.say('WHEEE!', 900);
    await s.wait(250);
  }

  private async friendshipHearts(s: Scope) {
    this.setFace('happy');
    this.say('I LUV U SO MUCH!', 1300);
    await this.pawsTo(s, -20, -60, 20, -60, 200);
    const glow = s.own(this.host.add.image(this.root.x, FLOOR - 60, 'e_heart').setDepth(33).setScale(1.5));
    s.tween({ targets: glow, scale: 2.4, yoyo: true, repeat: 2, duration: 160 });
    await s.wait(520);
    glow.destroy();
    const d = this.dirToPlayer();
    for (let i = 0; i < 4; i++) {
      this.shot(s, {
        texture: 'e_heart', x: this.root.x + d * 30, y: FLOOR - 70, vx: d * (90 + i * 32), vy: -(200 + (i % 2) * 70),
        gravity: 380, damage: 1, lifeMs: 5000, hitW: 12, world: 'bounce', bounces: 3, bounceFactor: 0.82, reflectable: true, fadeOut: true,
      });
      AudioBus.sfx('sfx_boing', { vol: 0.5 });
      await s.wait(230);
    }
    await this.pawsHome(s);
    await s.wait(500);
  }

  private async honeyPlop(s: Scope) {
    this.setFace('happy');
    this.say('HONEY FOR MY BEST FRIEND!', 1400);
    await this.pawsTo(s, -50, -120, 58, -50, 200);
    const px = Phaser.Math.Clamp(this.player.x, 150, 490);
    const xs = [px, px - 130, px + 130].map((x) => (x < 140 ? x + 390 : x > 500 ? x - 390 : x));
    xs.forEach((x, i) => {
      s.delay(i * 260, () => {
        this.warnShadow(s, x, 34, 900);
        const jar = s.own(this.host.add.image(x, -30, 'e_honeyjar').setDepth(46));
        s.tween({
          targets: jar, y: FLOOR - 9, angle: 360, duration: 900, ease: 'Quad.easeIn',
          onComplete: () => {
            jar.destroy();
            if (!s.alive) return;
            AudioBus.sfx('sfx_splat');
            this.host.fx.sparks(x, FLOOR - 6, 0xffb21a, 8, 120);
            const now = this.host.now;
            this.host.combat.addZone({ team: 'enemy', rect: () => ({ x: x - 15, y: FLOOR - 26, w: 30, h: 26 }), until: now + 120, damage: 1, tickMs: 1000, kind: 'hazard', phaseScoped: true });
            const vis = this.host.add.image(x, FLOOR, 'fx_honey').setOrigin(0.5, 1).setDepth(37);
            this.host.combat.addZone({ team: 'enemy', rect: () => ({ x: x - 26, y: FLOOR - 8, w: 52, h: 8 }), until: now + 4000, damage: 0, tickMs: 1000, kind: 'hazard', effect: 'sticky', phaseScoped: true, visual: vis });
          },
        });
      });
    });
    await s.wait(900 + 2 * 260 + 250);
    await this.pawsHome(s);
  }

  private parity = 0;
  private async beeParade(s: Scope) {
    const high = this.parity++ % 2 === 1;
    this.say(high ? 'DUCK... I MEAN, DON\'T JUMP!' : 'MY TOY BEES WANT TO PLAY!', 1500);
    AudioBus.sfx('sfx_warn');
    const fromRight = this.root.x < 320; // bees come from the side Begour isn't on
    const startX = fromRight ? 660 : -20;
    const y = high ? FLOOR - 62 : FLOOR - 9;
    this.warnIcon(s, fromRight ? 610 : 30, y, 700);
    this.warnBand(s, ARENA_L, y - 8, ARENA_R - ARENA_L, 16, 700, 0xffe14a);
    await s.wait(700);
    const n = 5;
    for (let i = 0; i < n; i++) {
      this.shot(s, {
        texture: 'e_bee', anim: 'bee_fly', x: startX, y, vx: (fromRight ? -1 : 1) * BEGOUR.beeSpeed, vy: 0,
        damage: 1, lifeMs: 6000, hitW: 12, hitH: 9, world: 'none', destructible: true,
      });
      AudioBus.sfx('sfx_plip', { vol: 0.3 });
      await s.wait(high ? 600 : 780);
    }
    await s.wait(1400);
  }

  // ---------------- phase 2: DON'T BE CROSS ----------------

  private async sorryPaw(s: Scope) {
    this.setFace('cry');
    this.say('SORRY! SORRY! SORRY!', 1500);
    AudioBus.voice('vo_bear_sob', { vol: 0.7 });
    for (let k = 0; k < 3; k++) {
      const x = Phaser.Math.Clamp(this.player.x, 150, 490);
      this.warnShadow(s, x, 70, 650);
      const paw = s.own(this.host.add.image(x, -10, 'begour_bigpaw').setOrigin(0.5, 1).setScale(0.62).setDepth(47));
      await s.wait(650);
      await s.tweenAsync({ targets: paw, y: FLOOR, duration: 110, ease: 'Quad.easeIn' });
      AudioBus.sfx('sfx_slam');
      this.host.fx.shake(160, 0.01);
      this.host.fx.dust(x - 20, FLOOR, 5);
      this.host.fx.dust(x + 20, FLOOR, 5);
      this.host.combat.addZone({ team: 'enemy', rect: () => ({ x: x - 28, y: FLOOR - 70, w: 56, h: 70 }), until: this.host.now + 140, damage: 1, tickMs: 1000, kind: 'hazard', phaseScoped: true });
      if (k === 2) {
        for (const d of [-1, 1]) this.shot(s, { texture: 'e_wave', x: x + d * 30, y: FLOOR - 5, vx: d * 170, vy: 0, damage: 1, lifeMs: 3000, hitW: 18, hitH: 8, world: 'none' });
      }
      await s.wait(240);
      s.tween({ targets: paw, y: -10, duration: 260, ease: 'Quad.easeIn', onComplete: () => paw.destroy() });
      await s.wait(160);
    }
    await s.wait(300);
  }

  private async cryMeARiver(s: Scope) {
    this.setFace('cry');
    this.say('*SOB* I THOUGHT WE WERE FRIENDS', 1800);
    AudioBus.voice('vo_bear_sob');
    const cols = 14, colW = 40, x0 = 40, laneW = 3;
    const fallMs = ((FLOOR + 20) / BEGOUR.tearSpeed) * 1000;
    const startCol = Phaser.Math.Clamp(Math.floor((this.player.x - x0) / colW) - 1, 0, cols - laneW);
    let dir = startCol < cols / 2 ? 1 : -1;
    // lane position as a pure function of time so tears always respect it on landing
    const steps: number[] = [startCol];
    for (let i = 1; i < 40; i++) {
      let c = steps[i - 1] + dir;
      if (c < 0 || c > cols - laneW) { dir = -dir; c = steps[i - 1] + dir; }
      steps.push(c);
    }
    const t0 = this.host.now;
    const leadIn = 1400;
    const laneAt = (t: number) => steps[Math.min(steps.length - 1, Math.max(0, Math.floor((t - t0 - leadIn) / 520) + 1))];
    const ind = s.own(this.host.add.rectangle(0, FLOOR - 2, laneW * colW, 6, 0x6fe07a, 0.7).setOrigin(0, 0).setDepth(36));
    const glow = s.own(this.host.add.rectangle(0, 0, laneW * colW, FLOOR, 0x6fe07a, 0.08).setOrigin(0).setDepth(5));
    const duration = 5600;
    s.every(40, () => {
      const c = laneAt(this.host.now);
      const x = x0 + c * colW;
      ind.x += (x - ind.x) * 0.35;
      glow.x = ind.x;
    });
    ind.x = glow.x = x0 + laneAt(t0) * colW;
    let k = 0;
    s.every(130, () => {
      const now = this.host.now;
      if (now - t0 > duration) return;
      const land = laneAt(now + fallMs);
      for (let j = 0; j < 3; j++) {
        const c = (k * 5 + j * 7 + Math.floor(this.rand() * 3)) % cols;
        k++;
        if (c >= land - 1 && c <= land + laneW) continue; // keep the lane (plus a column of margin) dry
        this.shot(s, {
          texture: 'e_tear', x: x0 + c * colW + 8 + this.rand() * 24, y: -16, vx: 0, vy: BEGOUR.tearSpeed, damage: 1, lifeMs: 3000, hitW: 6, hitH: 9, world: 'die',
          onExpire: (x, y, r) => { if (r === 'world') this.host.fx.sparks(x, y, 0x5ab8ff, 2, 50); },
        });
      }
    });
    await s.wait(duration + fallMs + 200);
    ind.destroy();
    glow.destroy();
  }

  private async honeySlip(s: Scope) {
    this.setFace('sad');
    this.say('WHOOPS! WOBBLY FLOOR!', 1600);
    const towardBear = Math.sign(this.root.x - 320) || 1;
    AudioBus.sfx('sfx_whoosh');
    const arrow = s.own(this.host.add.text(320, 120, towardBear > 0 ? 'TILT  >>>' : '<<<  TILT', { fontFamily: 'monospace', fontSize: '22px', color: '#ffe14a', stroke: '#120c16', strokeThickness: 5, fontStyle: 'bold' }).setOrigin(0.5).setDepth(120));
    s.tween({ targets: arrow, alpha: { from: 1, to: 0.3 }, yoyo: true, repeat: -1, duration: 140 });
    await s.wait(800);
    arrow.destroy();
    const cam = this.host.cameras.main;
    s.tween({ targets: cam, rotation: towardBear * 0.045, duration: 400, ease: 'Sine.easeInOut' });
    const ms = 3000;
    this.host.combat.addZone({ team: 'enemy', rect: () => ({ x: 0, y: -200, w: 640, h: 600 }), until: this.host.now + ms, damage: 0, tickMs: 1000, kind: 'hazard', effect: 'push', effectData: towardBear * 75, phaseScoped: true });
    for (let i = 0; i < 3; i++) {
      await s.wait(i === 0 ? 300 : 800);
      this.shot(s, {
        texture: 'e_heart', x: towardBear > 0 ? 24 : 616, y: FLOOR - 8, vx: towardBear * 160, vy: 0, gravity: 900, damage: 1, lifeMs: 6000,
        hitW: 12, world: 'roll', bounces: 0, rotate: 'spin', spin: 8, reflectable: true,
      });
      AudioBus.sfx('sfx_boing', { vol: 0.5 });
    }
    await s.wait(ms - 1900);
    await s.tweenAsync({ targets: cam, rotation: 0, duration: 400, ease: 'Sine.easeInOut' });
  }

  private async rainbowPanic(s: Scope) {
    this.setFace('sad');
    this.say('RAINBOWS MAKE EVERYONE HAPPY!', 1500);
    await this.pawsTo(s, -60, -120, 60, -120, 220);
    await s.wait(300);
    const d = this.dirToPlayer();
    for (let i = 0; i < 6; i++) {
      this.shot(s, {
        texture: 'e_orb', x: this.root.x, y: this.headRect().y + 20, vx: d * (60 + i * 38), vy: -(270 - i * 12), gravity: 260,
        damage: 1, lifeMs: 5000, hitW: 10, world: 'die', reflectable: true, tint: RAINBOW[i],
      });
      AudioBus.sfx('sfx_plip', { vol: 0.5, rate: 0.8 + i * 0.1 });
      await s.wait(170);
    }
    await this.pawsHome(s);
    await s.wait(900);
  }

  // ---------------- phase 3: BIG BEAR HUG ----------------

  private spawnHugPaws(s: Scope) {
    this.hugPaws = [];
    for (const side of [-1, 1] as const) {
      const start = side < 0 ? -36 : 676;
      const img = s.own(this.host.add.image(start, FLOOR, 'begour_bigpaw').setOrigin(0.5, 1).setDepth(48).setScale(0.85).setFlipX(side > 0));
      const heart = s.own(this.host.add.image(start - side * 34, FLOOR - 62, 'begour_target').setDepth(49));
      s.tween({ targets: heart, scale: { from: 1, to: 1.25 }, yoyo: true, repeat: -1, duration: 260 });
      this.hugPaws.push({ img, heart, side, hp: BEGOUR.pawHp, start, retreating: false });
    }
    s.onDispose(() => { this.hugPaws = []; });
    const speed = (320 - 44 - -36) / (BEGOUR.hugCloseMs / 1000);
    s.every(30, () => {
      let closed = 0;
      for (const p of this.hugPaws) {
        if (!p.retreating) {
          p.img.x += -p.side * speed * 0.03;
          if (Math.abs(p.img.x - 320) <= 44) { p.img.x = 320 + p.side * 44; closed++; }
        }
        p.heart.setPosition(p.img.x - p.side * 34, FLOOR - 62);
      }
      if (closed === 2) this.bigHug(s);
    });
  }

  private bigHug(s: Scope) {
    this.say('GOTCHA! BIG HUG!', 1300);
    AudioBus.voice('vo_bear');
    this.host.fx.shake(300, 0.012);
    const pl = this.player;
    if (pl.alive && pl.x > 200 && pl.x < 440) pl.hurt({ damage: 1, team: 'enemy', kind: 'contact', x: 320, y: FLOOR - 40, dir: Math.sign(pl.x - 320) || 1 });
    for (const p of this.hugPaws) this.retreat(s, p, 900);
  }

  private retreat(s: Scope, p: HugPaw, ms: number) {
    p.retreating = true;
    s.tween({ targets: p.img, x: p.start, duration: ms, ease: 'Cubic.easeOut', onComplete: () => { p.retreating = false; p.hp = BEGOUR.pawHp; } });
  }

  private popPaw(p: HugPaw) {
    const s = this.scope!;
    AudioBus.sfx('sfx_explode', { vol: 0.6 });
    this.host.fx.sparks(p.heart.x, p.heart.y, 0xff4f8f, 14, 180);
    this.say('OOF! THAT TICKLES!', 1100);
    this.hp -= this.maxHp * 0.06;
    this.retreat(s, p, 700);
    this.checkPhase();
  }

  private async hugHearts(s: Scope) {
    this.setFace('happy');
    const hx = this.root.x, hy = this.headRect().y + 40;
    for (let i = 0; i < 3; i++) {
      const d = i % 2 ? 1 : -1;
      this.shot(s, {
        texture: 'e_heart', x: hx, y: hy, vx: d * (70 + i * 40), vy: -220, gravity: 300, damage: 1, lifeMs: 5000, hitW: 12,
        world: 'bounce', bounces: 2, bounceFactor: 0.75, reflectable: true, fadeOut: true,
      });
      AudioBus.sfx('sfx_boing', { vol: 0.4 });
      await s.wait(420);
    }
    await s.wait(1100);
  }

  private async hugRainbow(s: Scope) {
    this.setFace('shout');
    await s.wait(400);
    const hx = this.root.x, hy = this.headRect().y + 50;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42;
      this.shot(s, { texture: 'e_orb', x: hx, y: hy, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, gravity: 200, damage: 1, lifeMs: 5000, hitW: 10, world: 'die', reflectable: true, tint: RAINBOW[i] });
    }
    AudioBus.sfx('sfx_sparkle', { vol: 0.5 });
    this.setFace('happy');
    await s.wait(1500);
  }

  // ---------------- defeat ----------------

  defeat() {
    if (this.defeated) return;
    this.defeated = true;
    this.alive = false;
    this.hp = 0;
    this.scope?.dispose();
    this.scope = null;
    this.hugPaws = [];
    this.host.combat.clearEnemy(false);
    this.host.cameras.main.setRotation(0);
    this.slide.setVisible(false);
    this.root.setVisible(true);
    this.mode = 'stand';
    session.score += SCORE.bossKill;
    this.onDefeated();
  }

  update() {
    // keep the slide sprite and root in sync for bubbles / rects; nothing else per-frame
  }

  get debugInfo() {
    return { phase: this.phase, hp: Math.round(this.hp), mode: this.mode, attack: this.attackName, invuln: this.invuln, entries: this.phaseEntries.join('/') };
  }

  destroy() {
    this.scope?.dispose();
    this.breathe.stop();
    this.root.destroy();
    this.slide.destroy();
  }
}
