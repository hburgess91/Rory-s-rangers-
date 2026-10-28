import { BossScene, ArenaCfg } from './BossScene';
import { UncleRik, RIK_FLOOR } from '../bosses/Rik';
import type { Line } from '../ui/Dialogue';
import { AudioBus } from '../audio/AudioBus';

const RIK = (text: string): Line => ({ who: 'UNCLE RIK', color: '#f2b8a0', text });

export class RikScene extends BossScene {
  declare boss: UncleRik;
  constructor() { super('rik'); }

  protected cfg(): ArenaCfg {
    return {
      chapter: 4, bg: 'bg_toilets', theme: 'pub', floor: RIK_FLOOR, music: 'mus_crunk',
      platforms: [[100, 250, 96], [444, 250, 96]],
      stamp: 'UNCLE RIK - FLUSHED',
      retryLines: ['ELLO AGAIN. STILL NEED A SHIT.', 'SAME TIME THURSDAY?', 'YEE. REP HIM.'],
    };
  }

  protected makeBoss() { return new UncleRik(this); }

  protected bar() {
    return { name: 'UNCLE RIK / SANRIK', label: 'BOWEL CONTROL', frac: () => this.boss.hp / this.boss.maxHp, notches: [0.66, 0.33] };
  }

  protected introLines(): Line[] {
    return [
      RIK('Ohh yee. Ello, it\'s Uncle Rik. I need a shit really badly. But yee, SanMik, rep him yee, it\'s what it\'s all about.'),
      RIK('*BUUUURP* ...I need a fart.'),
      this.me('Rik you fat fuck. Did you eat my wish?', 'Alright Rik. We were gonna invite you.'),
      RIK(this.isMik ? 'Might have done. It was next to the scampi fries. Tasted a bit magic.' : 'I invited meself. It\'s Thursday, innit. Thursday\'s the night Rik comes round.'),
      RIK('Ooh. Ooh it\'s making me BIG. SanRik, SanMik. San Rikky Rik Rik!'),
      this.me('That is fucking disgusting. Right. Clench, Rik.', 'YEGHHH. Someone open a window.'),
    ];
  }

  protected defeatScene(done: () => void) {
    const b = this.boss;
    b.body.setVisible(true).setPosition(320, RIK_FLOOR).setScale(0.6).setFrame('idle').setAlpha(1).setFlipX(false);
    b.head.setVisible(false);
    AudioBus.sfx('sfx_sparkle');
    const star = this.add.image(320, RIK_FLOOR - 60, 'fx_wish').setDepth(80).setScale(2);
    this.tweens.add({ targets: star, y: 60, angle: 720, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => this.tweens.add({ targets: star, alpha: 0, duration: 400 }) });
    this.time.delayedCall(1200, () => this.dialogue.play([
      RIK('Ohhhh. Oh that\'s better. That\'s MUCH better.'),
      this.me('Got the wish. Smells like your hot tub, you dirty old cunt. Yee.', 'YEGHHH. Never inviting you again.'),
      RIK('Same time Thursday?'),
      { who: 'GABOR (ON THE PHONE)', color: '#ff4f6f', text: 'That\'s all of them, best friend! Bring every wish up to heaven. I\'ll be waiting. Hehehe.' },
    ], done));
  }
}
