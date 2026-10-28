import { GameplayScene, Theme } from './GameplayScene';
import type { BossBase } from '../bosses/BossBase';
import type { BossBarInfo } from '../ui/Hud';
import type { Line } from '../ui/Dialogue';
import { bubble } from '../ui/Dialogue';
import { AudioBus } from '../audio/AudioBus';
import { session } from '../core/session';
import { VIEW } from '../config/tuning';
import { afterChapter } from '../levels/chapters';

export interface ArenaCfg {
  chapter: number;
  bg: string;
  theme: Theme;
  floor: number;
  platforms: [number, number, number][]; // x, y, w
  music: string;
  preMusic?: string;
  spawnX?: number;
  stamp: string; // "X - DESTROYED"
  retryLines: string[];
}

/** Shared boss arena: intro dialogue, boss bar, quick retry, defeat cutscene, results. */
export abstract class BossScene extends GameplayScene {
  boss!: BossBase;
  protected finished = false;
  protected abstract cfg(): ArenaCfg;
  protected abstract makeBoss(retry: boolean): BossBase;
  protected abstract bar(): BossBarInfo;
  protected abstract introLines(): Line[];
  /** Play the defeat cutscene, then call done(). */
  protected abstract defeatScene(done: () => void): void;
  protected onFightStart(): void {}

  protected get isMik() {
    return session.char === 'sanmik';
  }
  protected me(text: string, chzText?: string): Line {
    return this.isMik ? { who: 'SANMIK', face: 'ui_face_sanmik', text } : { who: 'SANCHZ', face: 'ui_face_sanchz', text: chzText ?? text };
  }

  protected buildLevel() {
    const c = this.cfg();
    this.finished = false;
    this.worldW = VIEW.W;
    this.worldH = VIEW.H;
    this.spawn = { x: c.spawnX ?? 70, y: c.floor - 2 };
    this.musicKey = c.preMusic ?? c.music;
    this.add.tileSprite(0, 0, VIEW.W, VIEW.H, c.bg).setOrigin(0).setDepth(-10);
    this.solid(0, c.floor, VIEW.W, VIEW.H - c.floor, c.theme);
    for (const [x, y, w] of c.platforms) this.oneWay(x, y, w, c.theme);
  }

  protected afterCreate() {
    const retry = !!this.data_.retry;
    session.chapter = this.cfg().chapter;
    this.boss = this.makeBoss(retry);
    this.combat.targets.add(this.boss);
    this.boss.onDefeated = () => this.onBossDefeated();
    if (retry) {
      AudioBus.music(this.cfg().music);
      const lines = this.cfg().retryLines;
      bubble(this, () => this.boss.speechPos(), lines[session.deaths % lines.length], 1500);
      this.hud.setBoss(this.bar());
      this.onFightStart();
      this.time.delayedCall(900, () => this.boss.start());
    } else {
      this.inputLocked = true;
      this.time.delayedCall(500, () => this.dialogue.play(this.introLines(), () => this.beginFight()));
    }
  }

  protected beginFight() {
    if (this.boss.phase >= 0 || this.finished) return;
    this.inputLocked = false;
    AudioBus.music(this.cfg().music);
    this.hud.setBoss(this.bar());
    this.onFightStart();
    this.time.delayedCall(1000, () => this.boss.start());
  }

  private onBossDefeated() {
    if (this.finished) return;
    this.finished = true;
    this.inputLocked = true;
    this.player.invulnUntil = Number.MAX_SAFE_INTEGER;
    this.hud.setBoss(null);
    AudioBus.music(null);
    AudioBus.sfx('sfx_shatter');
    this.hitStop(120);
    this.defeatScene(() => this.outro());
  }

  private outro() {
    this.inputLocked = false;
    this.player.invulnUntil = 0;
    AudioBus.sfx('sfx_stamp');
    this.fx.stamp(this.cfg().stamp, '#ff3a5a', 30, 2000, 130);
    AudioBus.sfx('sfx_victory');
    this.time.delayedCall(2800, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      const ch = this.cfg().chapter;
      this.time.delayedCall(520, () => this.scene.start('result', { chapter: ch, next: afterChapter(ch) }));
    });
  }

  protected levelUpdate(dt: number) {
    this.boss.update(dt);
    if (this.finished && !this.inputLocked && this.player.alive) this.player.play(`${this.player.tex}:victory`, true);
  }

  debugNextPhase() {
    const b = this.boss;
    if (b.defeated) return;
    if (b.phase < 0) {
      if (this.dialogue.active) this.dialogue.skip(); else this.beginFight();
      b.start();
      return;
    }
    const th = [...b.thresholds, 0];
    b.hp = Math.min(b.hp, b.maxHp * th[b.phase] - 1);
    if (b.phase >= b.thresholds.length) b.defeat(); else b.enterPhase(b.phase + 1);
  }

  debugKillBoss() {
    if (this.boss.phase < 0) { if (this.dialogue.active) this.dialogue.skip(); else this.beginFight(); this.boss.start(); }
    this.boss.defeat();
  }

  debugState() {
    return { boss: JSON.stringify(this.boss.debugInfo) };
  }

  protected onShutdown() {
    this.boss?.destroy();
    super.onShutdown();
  }
}
