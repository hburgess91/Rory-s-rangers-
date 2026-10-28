import Phaser from 'phaser';
import { BossScene, ArenaCfg } from './BossScene';
import { Gabor, GABOR_FLOOR } from '../bosses/Gabor';
import type { Line } from '../ui/Dialogue';
import { AudioBus } from '../audio/AudioBus';
import { VIEW } from '../config/tuning';

const GAB = (text: string): Line => ({ who: 'GABOR', color: '#ff4f6f', text });

export class GaborScene extends BossScene {
  declare boss: Gabor;
  private velvet!: Phaser.GameObjects.Image;
  private velvetFloor!: Phaser.GameObjects.TileSprite;
  private velvetFill!: Phaser.GameObjects.TileSprite;
  constructor() { super('gabor'); }

  protected cfg(): ArenaCfg {
    return {
      chapter: 5, bg: 'bg_heaven', theme: 'heaven', floor: GABOR_FLOOR, music: 'mus_begour', preMusic: 'mus_intro',
      platforms: [[110, 250, 96], [434, 250, 96]],
      stamp: 'GABOR - BACK IN DA LAMPE',
      retryLines: ['Back for more? Lovely.', 'Hehehe. Again.', 'You died! My favourite bit!'],
    };
  }

  protected buildLevel() {
    super.buildLevel();
    this.velvet = this.add.image(0, 0, 'bg_velvet').setOrigin(0).setDepth(-9).setAlpha(0);
    this.velvetFloor = this.add.tileSprite(0, GABOR_FLOOR, VIEW.W, 16, 'tile_velvet_top').setOrigin(0).setDepth(20.5).setAlpha(0);
    this.velvetFill = this.add.tileSprite(0, GABOR_FLOOR + 16, VIEW.W, VIEW.H - GABOR_FLOOR - 16, 'tile_velvet_fill').setOrigin(0).setDepth(20.5).setAlpha(0);
  }

  protected makeBoss() {
    const g = new Gabor(this);
    g.onTear = () => this.tear();
    const onHit = () => g.addDelight();
    this.events.on('player-hit', onHit);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off('player-hit', onHit));
    return g;
  }

  private tear() {
    this.cameras.main.flash(300, 255, 255, 255);
    for (let i = 0; i < 18; i++) {
      const r = this.add.rectangle(Math.random() * VIEW.W, Math.random() * 200, 30 + Math.random() * 60, 20 + Math.random() * 40, 0xfff6dc).setDepth(-8).setAngle(Math.random() * 40 - 20);
      this.tweens.add({ targets: r, y: r.y + 400, angle: r.angle + 90, alpha: 0, duration: 1200 + Math.random() * 600, onComplete: () => r.destroy() });
    }
    this.tweens.add({ targets: [this.velvet, this.velvetFloor, this.velvetFill], alpha: 1, duration: 600 });
    AudioBus.music('mus_crunk');
  }

  protected bar() {
    return {
      name: 'GABOR THE GOAT', label: 'GABOR', frac: () => this.boss.hp / this.boss.maxHp, notches: [0.8, 0.4],
      extra: { label: 'DELIGHT', frac: () => this.boss.delight / 100, color: 0xff8ad0 },
    };
  }

  protected introLines(): Line[] {
    return [
      GAB("Yee it's Gabor the goat! I'm your best friend SanMik! Did you bring all the wishes?"),
      this.me('Got \'em. Now send me home, you neeky little goat cunt.', 'YEGHHH. Got \'em. Is there a pub or not?'),
      GAB('Home? Oh, SanMik. There IS no home. I broke the lamp myself.'),
      GAB('You had three wishes. You could have learned to fly. You wished for me. And a Pepsi Max. And a Pepsi.'),
      GAB('Do you know what it\'s like, being the wish nobody wanted? I just wanted to watch you suffer. It\'s my favourite thing.'),
      this.me("I'll fucking slit your throat and make a curry out of you, you goat cunt. Yee.", 'I knew it. Goats are cunts.'),
      GAB("Okay SanMik. You're my best friend. Let's have fun!"),
    ];
  }

  protected defeatScene(done: () => void) {
    const b = this.boss;
    b.head.setVisible(false);
    b.big.setVisible(false);
    b.seals.forEach((s) => s.img.setVisible(false));
    b.small.setVisible(true).setScale(1.6).setPosition(320, GABOR_FLOOR).setAlpha(1);
    b.lamp.setVisible(true).setPosition(420, GABOR_FLOOR - 14).setAlpha(1);
    this.time.delayedCall(800, () => this.dialogue.play([
      GAB('...hehe. That was fun. Let\'s have fun again sometime, best friend!'),
      this.me('Get in the fucking lamp, Gabor.', 'Get in the lamp, Gabor.'),
    ], () => {
      AudioBus.sfx('sfx_whoosh');
      this.tweens.add({ targets: b.small, x: b.lamp.x, y: b.lamp.y, scale: 0, angle: 720, duration: 1200, ease: 'Quad.easeIn', onComplete: () => {
        AudioBus.sfx('sfx_stamp');
        this.fx.shake(200, 0.01);
        this.tweens.add({ targets: b.lamp, scale: 3, yoyo: true, duration: 150 });
        this.time.delayedCall(600, done);
      } });
    }));
  }
}
