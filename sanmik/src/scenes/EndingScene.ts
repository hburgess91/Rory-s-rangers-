import Phaser from 'phaser';
import { Controls } from '../input/Controls';
import { Dialogue, Line } from '../ui/Dialogue';
import { textStyle } from '../core/Fx';
import { AudioBus } from '../audio/AudioBus';
import { VIEW } from '../config/tuning';
import { session } from '../core/session';

const GENIE = (text: string): Line => ({ who: 'GENIE', color: '#9ab0ff', text });

// The Genie returns, three wishes, two endings. Then credits.
export class EndingScene extends Phaser.Scene {
  private controls!: Controls;
  private dialogue!: Dialogue;
  private genie!: Phaser.GameObjects.Sprite;
  private done = false;

  constructor() {
    super('ending');
  }

  create() {
    this.done = false;
    this.controls = new Controls(this);
    this.dialogue = new Dialogue(this, this.controls, true);
    AudioBus.musicOverride(null);
    AudioBus.music('mus_intro');
    this.add.image(0, 0, 'bg_genie').setOrigin(0);
    this.add.rectangle(0, 300, VIEW.W, 60, 0x2a0a3a).setOrigin(0);
    this.add.sprite(200, 302, `sanmik_${session.char === 'sanmik' ? session.costume : 'classic'}`, 'idle_0').setOrigin(0.5, 1).setScale(1.5).play(`sanmik_${session.char === 'sanmik' ? session.costume : 'classic'}:idle`);
    const chzTex = `sanchz_${session.char === 'sanchz' ? session.costume : 'classic'}`;
    this.add.sprite(110, 302, chzTex, 'idle_0').setOrigin(0.5, 1).setScale(1.5).play(`${chzTex}:idle`);
    this.add.image(330, 300, 'lamp').setScale(2.5);
    this.genie = this.add.sprite(330, 290, 'genie', 'talk').setOrigin(0.5, 1).setScale(0).setFlipX(true);
    this.add.text(VIEW.W - 6, VIEW.H - 6, 'ESC: SKIP', textStyle(8, '#888888', '#000000', 2)).setOrigin(1, 1);
    this.time.delayedCall(700, () => {
      AudioBus.sfx('sfx_sparkle');
      this.cameras.main.flash(300, 200, 200, 255);
      this.tweens.add({ targets: this.genie, scale: 1.4, y: 260, duration: 900, ease: 'Back.easeOut' });
      this.time.delayedCall(1000, () => this.dialogue.play(this.common(), () => (session.char === 'sanmik' ? this.mikEnding() : this.chzEnding())));
    });
  }

  private me(text: string): Line {
    return { who: 'SANMIK', face: 'ui_face_sanmik', text };
  }
  private ch(text: string): Line {
    return { who: 'SANCHZ', face: 'ui_face_sanchz', text };
  }

  private common(): Line[] {
    return [
      GENIE('Greetings, SanMik. I am a magical genie, released from my mystical sleep after ten thousand long bloody years. AGAIN. Because of YOU.'),
      this.me('You fucking what? Is that you SanChz, dressed up like a magical flying cunt like you always do?'),
      this.ch("I'm over here, SanMik."),
      GENIE('The goat is back in the lamp. You have three wishes. Please. Try not to waste them this time.'),
    ];
  }

  private mikEnding() {
    this.dialogue.play([
      this.me('Ooh, well that\'s a tough question. Yee. Number one: make me globally famous. Number two: a Pepsi Max.'),
      this.me('Number three: an even bigger afro.'),
      GENIE('What a bloody fucking waste. You could have learned to bloody fucking fly. But... your wishes are my command.'),
    ], () => this.montage());
  }

  private montage() {
    AudioBus.musicOverride('mus_delusion');
    AudioBus.sfx('sfx_cheer');
    const layer = this.add.container(0, 0).setDepth(100);
    layer.add(this.add.rectangle(0, 0, VIEW.W, VIEW.H, 0x2a0a0a).setOrigin(0));
    for (let i = 0; i < 4; i++) layer.add(this.add.triangle(100 + i * 150, 0, 0, 0, -60, VIEW.H, 60, VIEW.H, 0xfff6c8, 0.15).setOrigin(0.5, 0));
    for (let i = 0; i < 40; i++) layer.add(this.add.image(8 + i * 16, VIEW.H - 4 - (i % 2) * 6, `prop_fan${i % 3}`).setOrigin(0.5, 1));
    const star = this.add.sprite(320, 270, 'sanmik_classic', 'victory_0').setOrigin(0.5, 1).setScale(3).play('sanmik_classic:victory');
    layer.add(star);
    const heads = ['SANMIK: BIGGEST STAR ON EARTH', 'MICHAEL JACKSON NOW SECOND BEST', 'GOK WAN SECOND BEST DRESSED', 'AFRO VISIBLE FROM SPACE', 'SANMIK WENT VIRAL'];
    heads.forEach((h, i) => this.time.delayedCall(400 + i * 900, () => {
      const t = this.add.text(320, 40 + (i % 3) * 26, h, textStyle(16, '#ffe14a', '#c8102e', 5)).setOrigin(0.5).setDepth(101).setScale(2).setAlpha(0);
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 200 });
      this.tweens.add({ targets: t, alpha: 0, delay: 800, duration: 200, onComplete: () => t.destroy() });
    }));
    // ...and pull back: it was a video on his phone
    this.time.delayedCall(5200, () => {
      AudioBus.musicOverride(null);
      AudioBus.sfx('sfx_flop');
      this.tweens.add({ targets: layer, scale: 0.3, x: 224, y: 80, duration: 900, ease: 'Cubic.easeInOut' });
      const phone = this.add.rectangle(320, 140, 210, 130, 0x000000, 0).setStrokeStyle(10, 0x1a1a22).setDepth(102).setScale(0.3 / 0.3);
      phone.setAlpha(0);
      this.tweens.add({ targets: phone, alpha: 1, delay: 700, duration: 300 });
      this.time.delayedCall(1300, () => {
        this.add.text(320, 220, '3 VIEWS', textStyle(30, '#ff8a8a', '#120c16', 6)).setOrigin(0.5).setDepth(103);
        this.add.text(320, 250, 'SANMIK  •  SANMIK (ALT ACCOUNT)  •  BEGOUR THE BEAR', textStyle(9, '#ffffff', '#120c16', 3)).setOrigin(0.5).setDepth(103);
        this.time.delayedCall(1500, () => this.dialogue.play([
          { who: 'BEGOUR', color: '#ffcf8a', text: 'Ooh SanMik! My best friend! I liked it! Smell my fart!', voice: 'vo_bear' },
          this.me('...Yee.'),
        ], () => this.finish()));
      });
    });
  }

  private chzEnding() {
    const pop = (tex: string, x: number) => {
      const i = this.add.image(x, 120, tex).setScale(0).setDepth(50);
      this.tweens.add({ targets: i, scale: 3, duration: 300, ease: 'Back.easeOut' });
      AudioBus.sfx('sfx_sparkle', { vol: 0.5 });
    };
    this.dialogue.play([
      this.ch('Beans.'),
      { ...GENIE('...Granted.'), onShow: () => pop('pk_beans', 250) },
      this.ch('Sausage roll.'),
      { ...GENIE('Granted.'), onShow: () => pop('p_sausage', 330) },
      this.ch('...Another sausage roll.'),
      { ...GENIE('What a bloody fucking waste. You could have learned to fly.'), onShow: () => pop('p_sausage', 410) },
      this.me('You could\'ve made me FAMOUS, you fat cunt! I\'m da legend! I should\'ve gone viral!'),
      { ...this.ch('YEGHHH.'), onShow: () => AudioBus.mock('vo_yeghhh', 1) },
      this.ch('Pub?'),
      this.me('...Yeah go on then. Yee.'),
    ], () => this.finish());
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.time.delayedCall(720, () => this.scene.start('credits'));
  }

  update(_t: number, dt: number) {
    this.controls.update();
    if (this.controls.justPressed('pause') && !this.dialogue.active) this.finish();
    this.dialogue.update(dt);
  }
}
