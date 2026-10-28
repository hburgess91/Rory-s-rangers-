import Phaser from 'phaser';
import { Controls } from '../input/Controls';
import { textStyle } from '../core/Fx';
import { AudioBus } from '../audio/AudioBus';
import { VIEW } from '../config/tuning';
import { session } from '../core/session';
import { rankFor } from './ResultScene';

export class CreditsScene extends Phaser.Scene {
  private controls!: Controls;
  private roll!: Phaser.GameObjects.Text;
  private ready = false;

  constructor() {
    super('credits');
  }

  create() {
    this.controls = new Controls(this);
    this.ready = false;
    AudioBus.musicOverride(null);
    AudioBus.music('mus_results');
    this.cameras.main.setBackgroundColor('#07060b');
    const secs = Math.round((performance.now() - session.startedAt) / 1000);
    const { rank } = rankFor(session.hitsTaken, session.deaths, secs);
    const lines = [
      'SANMIK: YEEE OF DESTRUCTION', '', '', 'STARRING', 'SANMIK  -  DA LEGEND', 'SANCHZ  -  DA POLSONATOR', '',
      'BEGOUR THE BEAR  -  HIMSELF (HE\'S FINE)', 'UNCLE RIK  -  STILL IN THE BOGS', 'GABOR THE GOAT  -  IN THE LAMP', 'THE GENIE  -  FURIOUS',
      'A DIFFERENT GOAT  -  BAA', 'FIFTEEN COP CARS', 'ONE HELICOPTER', 'ONE TANK', '', '',
      'THINGS THAT WENT VIRAL', 'CHARLIE BIT ME', 'ICE BUCKET CHALLENGE', 'HARAMBE', 'DOUBLE RAINBOW', 'NYAN CAT', 'SALT BAE', 'GANGNAM STYLE', 'DAT BOI', '', 'THINGS THAT DID NOT', 'SANMIK', '', '',
      'YOUR RUN', `TIME  ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, `SCORE  ${session.score}`, `DEATHS (NOT CANON)  ${session.deaths}`,
      `JUMPS  ${session.jumps}`, `FOLLOWERS CLAIMED  ${session.followersClaimed.toLocaleString()}`, 'FOLLOWERS ACTUAL  3', `RANK  ${rank}`, '', '', '',
      'SANMIK SHOULD\'VE GONE VIRAL', '', 'YEE.', '', '', '', 'PRESS CONFIRM',
    ];
    this.roll = this.add.text(VIEW.W / 2, VIEW.H + 20, lines.join('\n'), { ...textStyle(12, '#ffffff', '#120c16', 3), lineSpacing: 6 }).setOrigin(0.5, 0);
    this.time.delayedCall(1500, () => { this.ready = true; });
  }

  update(_t: number, dt: number) {
    this.controls.update();
    const fast = this.controls.isDown('confirm') || this.controls.isDown('jump') ? 5 : 1;
    if (this.roll.y + this.roll.height > VIEW.H / 2) this.roll.y -= dt * 0.03 * fast;
    if (this.ready && (this.controls.justPressed('pause') || (this.roll.y + this.roll.height <= VIEW.H / 2 + 2 && this.controls.justPressed('confirm')))) this.scene.start('title');
  }
}
