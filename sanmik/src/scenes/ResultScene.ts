import Phaser from 'phaser';
import { Controls } from '../input/Controls';
import { textStyle } from '../core/Fx';
import { VIEW, SCORE } from '../config/tuning';
import { session } from '../core/session';
import { AudioBus } from '../audio/AudioBus';

export function rankFor(hits: number, deaths: number, seconds: number) {
  if (hits === 0) return { rank: 'PHRESH', note: 'No hits taken. Unreal. Probably edited.' };
  if (deaths === 0 && hits <= 3) return { rank: 'WENT VIRAL', note: '(it did not go viral)' };
  if (deaths <= 1 && seconds < 420) return { rank: 'PURE BANTA', note: 'Solid. Mid. Banta.' };
  if (deaths <= 3) return { rank: 'MANIJER MATERIAL', note: 'You could manage a Sunday league side.' };
  return { rank: '3 VIEWS', note: 'Two of them were you.' };
}

export class ResultScene extends Phaser.Scene {
  private controls!: Controls;
  private ready = false;

  constructor() {
    super('result');
  }

  create() {
    this.controls = new Controls(this);
    this.ready = false;
    AudioBus.musicOverride(null);
    AudioBus.music('mus_results');
    const g = this.add.graphics();
    g.fillGradientStyle(0x120c16, 0x120c16, 0x2e0d2a, 0x2e0d2a, 1);
    g.fillRect(0, 0, VIEW.W, VIEW.H);

    const secs = Math.round((performance.now() - session.chapterStartedAt) / 1000);
    const noHit = session.chapterHits === 0;
    if (noHit) session.score += SCORE.noHitBonus;
    const { rank, note } = rankFor(session.chapterHits, session.deaths, secs);

    this.add.text(VIEW.W / 2, 30, 'CHAPTER 2 CLEAR', textStyle(24, '#ffe14a', '#120c16', 6)).setOrigin(0.5);
    this.add.text(VIEW.W / 2, 54, 'BIG TESK-O / FRENDSHIP FOREST', textStyle(10, '#ffffff', '#120c16', 3)).setOrigin(0.5);
    const rows: [string, string][] = [
      ['TIME', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
      ['ENEMIES DESTROYED', `${session.kills}`],
      ['HITS TAKEN', `${session.chapterHits}`],
      ['DEATHS (NOT CANON)', `${session.deaths}`],
      ['JUMPS', `${session.jumps}  (${session.jumps} x ${session.char === 'sanmik' ? 'YEEE' : 'YEGHHH'})`],
      ['FOLLOWERS CLAIMED', `${session.followersClaimed.toLocaleString()}`],
      ['FOLLOWERS ACTUAL', '3'],
      ['SCORE', `${session.score}${noHit ? '  (+NO-HIT BONUS)' : ''}`],
    ];
    rows.forEach(([k, v], i) => {
      const y = 84 + i * 18;
      const a = this.add.text(150, y, k, textStyle(11, '#9fe2ff', '#120c16', 3)).setOrigin(0, 0.5).setAlpha(0);
      const b = this.add.text(490, y, v, textStyle(11, k === 'FOLLOWERS ACTUAL' ? '#ff8a8a' : '#ffffff', '#120c16', 3)).setOrigin(1, 0.5).setAlpha(0);
      this.tweens.add({ targets: [a, b], alpha: 1, delay: 200 + i * 140, duration: 150, onStart: () => AudioBus.sfx('sfx_ui_move', { vol: 0.4 }) });
    });
    const rk = this.add.text(VIEW.W / 2, 252, `RANK: ${rank}`, textStyle(26, '#ff3ad0', '#120c16', 6)).setOrigin(0.5).setScale(3).setAlpha(0).setAngle(-5);
    const nt = this.add.text(VIEW.W / 2, 276, note, textStyle(9, '#ffffff', '#120c16', 2)).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: rk, scale: 1, alpha: 1, delay: 1500, duration: 220, ease: 'Back.easeOut', onStart: () => AudioBus.sfx('sfx_stamp') });
    this.tweens.add({ targets: nt, alpha: 1, delay: 1800, duration: 300 });
    const next = this.add.text(VIEW.W / 2, 318, 'NEXT: NIGHT OF FREEDOM  (still being made. like the album.)', textStyle(9, '#ffe14a', '#120c16', 2)).setOrigin(0.5).setAlpha(0);
    const cont = this.add.text(VIEW.W / 2, 340, 'PRESS CONFIRM', textStyle(10, '#ffffff', '#120c16', 3)).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [next, cont], alpha: 1, delay: 2200, duration: 300, onComplete: () => { this.ready = true; } });
  }

  update() {
    this.controls.update();
    if (this.ready && (this.controls.justPressed('confirm') || this.controls.justPressed('pause'))) this.scene.start('title');
  }
}
