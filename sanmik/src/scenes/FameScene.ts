import { BossScene, ArenaCfg } from './BossScene';
import { FameAlgorithm, FAME_FLOOR } from '../bosses/Fame';
import type { Line } from '../ui/Dialogue';
import { AudioBus } from '../audio/AudioBus';

const ALG = (text: string): Line => ({ who: 'DA ALGORITHM', color: '#3ad0ff', text });

export class FameScene extends BossScene {
  declare boss: FameAlgorithm;
  constructor() { super('fame'); }

  protected cfg(): ArenaCfg {
    return {
      chapter: 1, bg: 'bg_jobcentre', theme: 'office', floor: FAME_FLOOR, music: 'mus_jobcentre',
      platforms: [[110, 258, 96], [300, 214, 80], [440, 258, 96]],
      stamp: 'ALGORITHM - DELETED',
      retryLines: ['WELCOME BACK. STILL 3 FOLLOWERS.', 'U AGAIN? NOT RELEVANT.', 'ENGAGEMENT: DOWN 100%'],
    };
  }

  protected makeBoss() { return new FameAlgorithm(this, 500); }

  protected bar() {
    return { name: 'DA FAME ALGORITHM', label: 'RELEVANCE', frac: () => this.boss.hp / this.boss.maxHp, notches: [0.5] };
  }

  protected introLines(): Line[] {
    return [
      ALG('WELCOME TO DA ALGORITHM. STATE YOUR NAME FOR RELEVANCE SCORING.'),
      this.me('SanMik. Da legend. Number one in Catford. Michael Jackson is second best.', 'MC Polsonator. Big up all da manz.'),
      ALG(this.isMik ? "SEARCHING 'SANMIK'... DID YOU MEAN: 'SALMON'?" : "SEARCHING 'MC POLSONATOR'... NO RESULTS. DID YOU MEAN: 'POLISH SONATA'?"),
      ALG('THINGS THAT WENT VIRAL: CHARLIE BIT ME. ICE BUCKET CHALLENGE. HARAMBE. NYAN CAT. THINGS THAT DID NOT: YOU.'),
      this.me("I'll fucking sherk you, you jumped-up fucking calculator. SanMik should've gone viral.", 'YEGHHH. Go and suck your nan, you cunt.'),
      ALG('FOLLOWERS: 3. TWO OF THEM ARE SANMIK. INITIATING CONTENT REMOVAL.'),
    ];
  }

  protected defeatScene(done: () => void) {
    const b = this.boss;
    b.sprite.setFrame('error');
    this.fx.shake(500, 0.01);
    AudioBus.sfx('sfx_explode');
    this.tweens.add({ targets: b.sprite, angle: 20, y: 300, duration: 900, ease: 'Bounce.easeOut' });
    this.time.delayedCall(1000, () => {
      this.dialogue.play([
        ALG('ERROR. RECALCULATING... SANMIK: STILL NOT RELEVANT. GOODBYE.'),
        this.me('Get fucked, Siri. Yee.', 'YEGHHH. Turned it off and on again.'),
        { who: 'GABOR (ON THE PHONE)', color: '#ff4f6f', text: 'Ooh well done best friend! Next wish is at Big Tesk-O. My friend Begour found it. He\'s ever so nice!' },
        this.me("Begour? That fucking bear? Right. Supermarket. Yee.", 'Can we get a meal deal while we\'re there?'),
      ], done);
    });
  }
}
