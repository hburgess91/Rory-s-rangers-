import Phaser from 'phaser';
import { Controls } from '../input/Controls';
import { Dialogue, Line } from '../ui/Dialogue';
import { Fx, textStyle } from '../core/Fx';
import { AudioBus } from '../audio/AudioBus';
import { VIEW } from '../config/tuning';
import { session } from '../core/session';

// Opening: the crash from "The End", then the afterlife paperwork mix-up.
export class IntroScene extends Phaser.Scene {
  private controls!: Controls;
  private dialogue!: Dialogue;
  private fx!: Fx;
  private done = false;
  private keep = new Set<Phaser.GameObjects.GameObject>();

  constructor() {
    super('intro');
  }

  create() {
    this.controls = new Controls(this);
    this.fx = new Fx(this);
    this.dialogue = new Dialogue(this, this.controls);
    this.done = false;
    AudioBus.music('mus_intro');
    this.add.text(VIEW.W - 6, 6, 'ESC / START: SKIP', textStyle(8, '#888888', '#000000', 2)).setOrigin(1, 0).setDepth(500);
    this.keep = new Set(this.children.list);
    this.crash();
  }

  private crash() {
    this.cameras.main.setBackgroundColor('#05040a');
    const cap = this.add.text(VIEW.W / 2, 60, "PREVIOUSLY, ON 'THE END'...", textStyle(16, '#ffffff', '#000000', 4)).setOrigin(0.5);
    this.add.rectangle(0, 250, VIEW.W, 110, 0x1a1a22).setOrigin(0);
    for (let x = 0; x < VIEW.W; x += 60) this.add.rectangle(x, 288, 30, 3, 0xffe14a);
    this.add.rectangle(560, 210, 14, 40, 0x555555).setOrigin(0.5, 0);
    const car = this.add.image(-60, 270, 'intro_car').setOrigin(0.5, 1);
    this.tweens.add({
      targets: car, x: 520, duration: 1500, ease: 'Quad.easeIn',
      onComplete: () => {
        if (this.done) return;
        AudioBus.sfx('sfx_explode');
        this.fx.shake(500, 0.02);
        this.cameras.main.flash(300, 255, 120, 40);
        car.setAngle(160).setY(240);
        this.add.text(VIEW.W / 2, 130, '*CRASH*', textStyle(36, '#ff3a3a', '#000000', 6)).setOrigin(0.5);
        this.time.addEvent({ delay: 60, repeat: 20, callback: () => this.fx.sparks(520 + (Math.random() - 0.5) * 50, 240, [0xff8a1a, 0xffe14a, 0xff3a3a][Math.floor(Math.random() * 3)], 3, 90) });
        this.time.delayedCall(1700, () => this.office(cap));
      },
    });
  }

  private office(cap: Phaser.GameObjects.Text) {
    if (this.done) return;
    for (const o of [...this.children.list]) if (!this.keep.has(o)) o.destroy();
    cap.destroy();
    this.cameras.main.setBackgroundColor('#dfe6ff');
    this.cameras.main.flash(500, 255, 255, 255);
    // a heavenly benefits office
    this.add.rectangle(0, 250, VIEW.W, 110, 0xc9cfe8).setOrigin(0);
    for (let i = 0; i < 6; i++) this.add.ellipse(60 + i * 110, 236, 120, 40, 0xffffff, 0.9);
    this.add.rectangle(380, 40, 220, 26, 0x3a6ad0).setStrokeStyle(2, 0xffffff);
    this.add.text(380, 40, 'AFTERLYFE ADMIN - PLEASE TAKE A TICKET', textStyle(8, '#ffffff', '#1a2a5a', 2)).setOrigin(0.5);
    const err = this.add.text(VIEW.W / 2, 90, 'AFTERLYFE ERROR 404', textStyle(28, '#c8102e', '#ffffff', 6)).setOrigin(0.5);
    this.tweens.add({ targets: err, x: { from: VIEW.W / 2 - 2, to: VIEW.W / 2 + 2 }, yoyo: true, repeat: -1, duration: 60 });
    this.add.image(440, 260, 'intro_desk').setOrigin(0.5, 1).setScale(1.4);
    const clerk = this.add.image(470, 214, 'intro_clerk').setOrigin(0.5, 1).setScale(1.4);
    this.tweens.add({ targets: clerk, y: 208, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    const mik = this.add.sprite(170, 262, 'sanmik_classic', 'idle_0').setOrigin(0.5, 1).setScale(1.4).play('sanmik_classic:idle');
    const chz = this.add.sprite(250, 262, 'sanchz_classic', 'idle_0').setOrigin(0.5, 1).setScale(1.4).play('sanchz_classic:idle');
    if (session.char === 'sanmik' && session.costume !== 'classic') mik.setTexture(`sanmik_${session.costume}`).play(`sanmik_${session.costume}:idle`);
    if (session.char === 'sanchz' && session.costume !== 'classic') chz.setTexture(`sanchz_${session.costume}`).play(`sanchz_${session.costume}:idle`);
    let gabor: Phaser.GameObjects.Image | null = null;
    const stamp = () => {
      const t = this.add.text(VIEW.W / 2, 150, 'CONTINUITY ERROR\nRETURN 2 SENDER', textStyle(22, '#c8102e', '#ffffff', 5)).setOrigin(0.5).setAngle(-8).setScale(3).setAlpha(0);
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
      AudioBus.sfx('sfx_stamp');
      this.fx.shake(150, 0.01);
      this.time.delayedCall(1500, () => this.tweens.add({ targets: t, alpha: 0, duration: 300 }));
    };
    const enterGabor = () => {
      AudioBus.sfx('sfx_sparkle');
      this.cameras.main.flash(200, 255, 230, 150);
      gabor = this.add.image(330, 262, 'gabor_small').setOrigin(0.5, 1).setScale(1.6).setFlipX(true);
      const lamp = this.add.image(312, 236, 'lamp').setScale(1.2);
      this.tweens.add({ targets: [gabor, lamp], y: '-=4', yoyo: true, repeat: -1, duration: 400 });
    };
    const lines: Line[] = [
      { who: 'CLERK', text: 'Next. Name?' },
      { who: 'SANMIK', face: 'ui_face_sanmik', text: 'SanMik. Da legend. World famous. Yee.' },
      { who: 'CLERK', text: 'Never heard of you. Says here you both died in a car crash. Very sad. Lovely song.' },
      { who: 'CLERK', text: '...and then you released another album. Afterwards. While dead.' },
      { who: 'SANCHZ', face: 'ui_face_sanchz', text: 'YEGHHH.' },
      { who: 'CLERK', text: 'Heaven has one of you on file. Hell has the other. Neither will take you.', onShow: stamp },
      { who: '???', text: 'Hiya, best friend!', color: '#ff4f6f', onShow: enterGabor },
      { who: 'GABOR', text: 'Remember me? From Da Majek Lampe? You had three wishes and you wished for ME. And two Pepsis.' },
      { who: 'GABOR', text: "The lamp's wishes have gone and scattered all over the afterlife. Collect them, and you go home. Honest." },
      { who: 'GABOR', text: '(heh.)' },
      { who: 'SANMIK', face: 'ui_face_sanmik', text: "A world comeback tour. Dis is my moment. YEE." },
      { who: 'SANCHZ', face: 'ui_face_sanchz', text: 'Can we go pub after?' },
      { who: 'GABOR', text: "First wish fragment's in the big supermarket. With my friend Begour. He's ever so nice. Go on then!" },
    ];
    this.time.delayedCall(900, () => { if (!this.done) this.dialogue.play(lines, () => this.finish()); });
    void gabor;
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    session.seenIntro = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(420, () => this.scene.start('tesko', {}));
  }

  update(_t: number, dt: number) {
    this.controls.update();
    if (this.controls.justPressed('pause') && !this.dialogue.active) { this.finish(); return; }
    this.dialogue.update(dt);
  }
}
