import Phaser from 'phaser';
import { Controls } from '../input/Controls';
import { Dialogue, Line } from '../ui/Dialogue';
import { Fx, textStyle } from '../core/Fx';
import { AudioBus } from '../audio/AudioBus';
import { VIEW } from '../config/tuning';
import { session } from '../core/session';
import { clean } from '../core/lang';

// Opening, after "The End" (OrChzMik): the weed trip, the crash, waking up in
// heaven with wings, Gabor, and then the afterlife paperwork.
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

  private clearScene() {
    for (const o of [...this.children.list]) if (!this.keep.has(o)) o.destroy();
  }

  private caption(text: string, y: number, delay: number, color = '#ffffff') {
    this.time.delayedCall(delay, () => {
      if (this.done) return;
      const t = this.add.text(VIEW.W / 2, y, clean(text), textStyle(13, color, '#000000', 4)).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 300 });
    });
  }

  private crash() {
    this.cameras.main.setBackgroundColor('#05040a');
    this.add.text(VIEW.W / 2, 30, "PREVIOUSLY, ON 'THE END'...", textStyle(16, '#ffffff', '#000000', 4)).setOrigin(0.5);
    this.add.rectangle(0, 250, VIEW.W, 110, 0x1a1a22).setOrigin(0);
    for (let x = 0; x < VIEW.W; x += 60) this.add.rectangle(x, 288, 30, 3, 0xffe14a);
    this.add.rectangle(560, 270, 120, 30, 0x0a140a).setOrigin(0.5, 0); // the ditch
    const car = this.add.image(-60, 270, 'intro_corvette').setOrigin(0.5, 1);
    this.caption('Me and SanChz on another weed trip', 70, 200);
    this.caption('Hallucinating aliens. Thinking bout Burger King.', 92, 1200);
    this.caption('SanChz passes me a line of ket. I snort it off the driving wheel.', 114, 2300, '#ff9ad0');
    this.tweens.add({ targets: car, x: 300, duration: 3300, ease: 'Linear' });
    this.time.delayedCall(3300, () => {
      if (this.done) return;
      this.tweens.add({
        targets: car, x: 560, y: 300, angle: 170, duration: 700, ease: 'Quad.easeIn',
        onComplete: () => {
          if (this.done) return;
          AudioBus.sfx('sfx_explode');
          this.fx.shake(500, 0.02);
          this.cameras.main.flash(300, 255, 120, 40);
          this.add.text(VIEW.W / 2, 170, '*CRASH*', textStyle(36, '#ff3a3a', '#000000', 6)).setOrigin(0.5);
          this.time.addEvent({ delay: 60, repeat: 30, callback: () => this.fx.sparks(560 + (Math.random() - 0.5) * 50, 280, [0xff8a1a, 0xffe14a, 0xff3a3a][Math.floor(Math.random() * 3)], 3, 90) });
          this.caption("Don't use ket in a car or a bike. Unless you want your life to end.", 215, 900, '#ffe14a');
          this.caption('Me and SanChz are burning to death. He is my only friend.', 236, 2200);
          this.time.delayedCall(4300, () => this.heaven());
        },
      });
    });
  }

  private heaven() {
    if (this.done) return;
    this.clearScene();
    this.cameras.main.setBackgroundColor('#fff6dc');
    this.cameras.main.flash(600, 255, 255, 255);
    this.add.tileSprite(0, 0, VIEW.W, VIEW.H, 'bg_heaven').setOrigin(0);
    this.add.tileSprite(0, 262, VIEW.W, 16, 'tile_heaven_top').setOrigin(0);
    const mikTex = session.char === 'sanmik' ? `sanmik_${session.costume}` : 'sanmik_classic';
    const chzTex = session.char === 'sanchz' ? `sanchz_${session.costume}` : 'sanchz_classic';
    const wings = this.add.image(170, 222, 'intro_wings').setScale(1.6);
    this.tweens.add({ targets: wings, scaleY: 1.3, yoyo: true, repeat: -1, duration: 300 });
    this.add.sprite(170, 264, mikTex, 'idle_0').setOrigin(0.5, 1).setScale(1.4).play(`${mikTex}:idle`);
    let chz: Phaser.GameObjects.Sprite | null = null;
    const enterGabor = () => {
      AudioBus.sfx('sfx_sparkle');
      const gabor = this.add.image(300, 264, 'gabor_small').setOrigin(0.5, 1).setScale(1.6).setFlipX(true);
      this.tweens.add({ targets: gabor, y: 258, yoyo: true, repeat: -1, duration: 400 });
    };
    const enterChz = () => {
      AudioBus.sfx('sfx_explode', { vol: 0.4 });
      this.cameras.main.flash(200, 255, 80, 0);
      chz = this.add.sprite(80, 264, chzTex, 'idle_0').setOrigin(0.5, 1).setScale(1.4).play(`${chzTex}:idle`).setTint(0x9a8a7a);
      this.time.delayedCall(600, () => chz?.clearTint());
    };
    const enterClerk = () => {
      AudioBus.sfx('sfx_ui_select');
      this.add.image(470, 264, 'intro_desk').setOrigin(0.5, 1).setScale(1.4);
      const clerk = this.add.image(500, 222, 'intro_clerk').setOrigin(0.5, 1).setScale(1.4);
      this.tweens.add({ targets: clerk, y: 216, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    };
    const stamp = () => {
      const t = this.add.text(VIEW.W / 2, 120, 'AFTERLYFE ERROR 404\nCONTINUITY ERROR - RETURN 2 SENDER', textStyle(18, '#c8102e', '#ffffff', 5)).setOrigin(0.5).setAngle(-6).setScale(3).setAlpha(0);
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
      AudioBus.sfx('sfx_stamp');
      this.fx.shake(150, 0.01);
      this.time.delayedCall(2200, () => this.tweens.add({ targets: t, alpha: 0, duration: 300 }));
    };
    const MIK = 'ui_face_sanmik', CHZ = 'ui_face_sanchz';
    const lines: Line[] = [
      { who: 'SANMIK', face: MIK, text: 'Where am I now? Why have I got wings? Why have I got fucking wings?' },
      { who: 'SANMIK', face: MIK, text: 'Where the fuck am I? Is that you, Gabor?' },
      { who: 'GABOR', color: '#ff4f6f', text: "Yee! It's okay SanMik, we're in heaven! I missed you SanMik!", onShow: enterGabor },
      { who: 'SANMIK', face: MIK, text: "Heaven? YEE. Course I'm in heaven. I'm the fucking best. Michael Jackson is second best." },
      { who: 'SANMIK', face: MIK, text: 'Where the fuck is SanChz?' },
      { who: 'GABOR', color: '#ff4f6f', text: 'In hell! Hehehe.' },
      { who: 'SANCHZ', face: CHZ, text: "YEGHHH. Hell's shut. Bus never came. Didn't have a fiver.", onShow: enterChz },
      { who: 'SANCHZ', face: CHZ, text: "I'm still a bit on fire, SanMik." },
      { who: 'SANMIK', face: MIK, text: "Shut up, you fat cunt. You're ruining my heaven." },
      { who: 'CLERK', text: 'Next. ...Oh no. You two.', onShow: enterClerk },
      { who: 'CLERK', text: 'Says here you died in a ditch, off your tits on ket. Lovely song, by the way.' },
      { who: 'CLERK', text: '...And then you released ANOTHER fucking album. While dead.' },
      { who: 'SANMIK', face: MIK, text: "Cause I'm a legend, you neeky cunt. Catford Fox Crew. I'll fucking sherk you." },
      { who: 'CLERK', text: "Heaven won't have you. Hell won't have you. You're a paperwork problem.", onShow: stamp },
      { who: 'GABOR', color: '#ff4f6f', text: "Don't worry best friend! The Majek Lampe broke, and its wishes got scattered all over the afterlife. Get them back and you can go home!" },
      { who: 'GABOR', color: '#ff4f6f', text: '...heh.' },
      { who: 'SANMIK', face: MIK, text: "Shut the fuck up, you little neeky goat cunt. ...Fine. It's my world comeback tour. YEE." },
      { who: 'SANCHZ', face: CHZ, text: 'Can we go pub after?' },
      { who: 'GABOR', color: '#ff4f6f', text: "First stop: the Jobcentre Beyond! SanChz knows the way, don't you SanChz?" },
    ];
    this.time.delayedCall(900, () => { if (!this.done) this.dialogue.play(lines, () => this.finish()); });
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    session.seenIntro = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(420, () => this.scene.start('level', { id: 'jobcentre' }));
  }

  update(_t: number, dt: number) {
    this.controls.update();
    if (this.controls.justPressed('pause') && !this.dialogue.active) { this.finish(); return; }
    this.dialogue.update(dt);
  }
}
