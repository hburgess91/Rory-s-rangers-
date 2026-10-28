import Phaser from 'phaser';
import { BossBase } from './BossBase';
import { Scope } from './Scope';
import type { GameHost } from '../core/host';
import type { Hit, Rect } from '../combat/types';
import { AudioBus } from '../audio/AudioBus';
import { VIRAL } from '../art/bosses';

export const FAME_FLOOR = 322;

/** DA FAME ALGORITHM: decides who is famous. Has decided SanMik isn't. */
export class FameAlgorithm extends BossBase {
  sprite: Phaser.GameObjects.Sprite;
  private bob: Phaser.Tweens.Tween;
  private homeY = 150;

  constructor(host: GameHost, x: number) {
    super(host, 1700, [0.5]);
    this.sprite = host.add.sprite(x, this.homeY, 'boss_phone', 'smug').setDepth(30);
    this.bob = host.tweens.add({ targets: this.sprite, y: this.homeY + 10, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
  }

  speechPos() { return { x: this.sprite.x, y: this.sprite.y - 66 }; }

  hurtRects(): Rect[] {
    if (this.defeated) return [];
    return [{ x: this.sprite.x - 36, y: this.sprite.y - 56, w: 72, h: 112 }];
  }

  contactRects(): Rect[] {
    if (this.defeated || this.phase < 0) return [];
    return [{ x: this.sprite.x - 30, y: this.sprite.y - 50, w: 60, h: 100 }];
  }

  protected onHit(_h: Hit, _p: number, dmg: number) {
    this.host.fx.flash(this.sprite, 50);
    return dmg;
  }

  protected async runPhase(s: Scope, n: number) {
    if (n === 0) {
      this.invuln = false;
      await this.loop(s, [this.viralSpam, this.likeRain, this.shadowban], 700);
    } else {
      this.sprite.setFrame('angry');
      this.say('RECALCULATING... SANMIK RELEVANCE: 0%', 1800);
      AudioBus.sfx('sfx_warn');
      this.host.fx.shake(300, 0.006);
      await s.wait(1400);
      this.invuln = false;
      await this.loop(s, [this.viralSpam, this.likeRain, this.shadowban, this.dislikeSwarm], 520);
    }
  }

  private async viralSpam(s: Scope) {
    this.say('TRENDING NOW:', 900);
    const lanes = [FAME_FLOOR - 12, FAME_FLOOR - 52, FAME_FLOOR - 96];
    const volleys = this.phase === 0 ? 3 : 4;
    for (let v = 0; v < volleys; v++) {
      const free = Math.floor(this.rand() * 3);
      for (let i = 0; i < 3; i++) {
        if (i === free) continue;
        this.warnBand(s, 0, lanes[i] - 7, 640, 14, 500, 0xffe14a);
      }
      await s.wait(520);
      for (let i = 0; i < 3; i++) {
        if (i === free) continue;
        const k = Math.floor(this.rand() * VIRAL.length);
        this.shot(s, { texture: `e_viral${k}`, x: this.sprite.x - 40, y: lanes[i], vx: -(150 + this.phase * 40), vy: 0, damage: 1, lifeMs: 5000, hitW: 30, hitH: 8, world: 'none', destructible: true });
      }
      AudioBus.sfx('sfx_ui_select', { vol: 0.6 });
      await s.wait(this.phase === 0 ? 1100 : 850);
    }
    await s.wait(900);
  }

  private async likeRain(s: Scope) {
    this.say('U HAVE 0 NEW LIKES', 1200);
    const gapX = 60 + Math.floor(this.rand() * 7) * 60;
    for (let x = 30; x < 620; x += 40) if (Math.abs(x - gapX) > 50) this.warnBand(s, x - 8, 0, 16, FAME_FLOOR, 650, 0x2f6cff);
    await s.wait(700);
    for (let row = 0; row < 3; row++) {
      for (let x = 30; x < 620; x += 40) {
        if (Math.abs(x - gapX) <= 50) continue;
        this.shot(s, { texture: 'e_like', x, y: -10 - row * 40, vx: 0, vy: 230, damage: 1, lifeMs: 3000, hitW: 11, world: 'die' });
      }
    }
    AudioBus.sfx('sfx_plip');
    await s.wait(1900);
  }

  private async shadowban(s: Scope) {
    this.say('SHADOWBAN.EXE', 1000);
    for (let k = 0; k < (this.phase === 0 ? 2 : 3); k++) {
      const beam = s.own(this.host.add.rectangle(this.player.x, 0, 30, FAME_FLOOR, 0x9a6aff, 0.18).setOrigin(0.5, 0).setDepth(35));
      const t0 = this.host.now;
      await new Promise<void>((res) => {
        const ev = s.every(30, () => {
          if (this.host.now - t0 < 950) beam.x += (this.player.x - beam.x) * 0.12;
          else { ev?.remove(false); res(); }
        });
      });
      beam.setFillStyle(0xff3ad0, 0.35);
      AudioBus.sfx('sfx_warn');
      await s.wait(320);
      beam.setFillStyle(0xffffff, 0.9).setSize(34, FAME_FLOOR);
      const x = beam.x;
      this.hazard(s, { x: x - 15, y: 0, w: 30, h: FAME_FLOOR }, 380);
      this.host.fx.shake(120, 0.005);
      AudioBus.sfx('sfx_yee_blast', { vol: 0.4, rate: 0.6 });
      await s.wait(380);
      beam.destroy();
      await s.wait(250);
    }
  }

  private async dislikeSwarm(s: Scope) {
    this.say('RATIO.', 900);
    for (let i = 0; i < 7; i++) {
      const a = Math.atan2(this.player.y - 20 - this.sprite.y, this.player.x - this.sprite.x) + (this.rand() - 0.5) * 0.4;
      this.shot(s, { texture: 'e_dislike', x: this.sprite.x, y: this.sprite.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, damage: 1, lifeMs: 4000, hitW: 11, world: 'die', destructible: true, reflectable: true });
      await s.wait(240);
    }
    await s.wait(900);
  }

  destroy() {
    this.scope?.dispose();
    this.bob.stop();
    this.sprite.destroy();
  }
}
