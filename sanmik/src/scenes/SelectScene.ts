import Phaser from 'phaser';
import { Controls } from '../input/Controls';
import { textStyle } from '../core/Fx';
import { AudioBus } from '../audio/AudioBus';
import { VIEW } from '../config/tuning';
import { CHAR_INFO, CharId, newSession, session } from '../core/session';
import type { SceneRef } from '../levels/chapters';

export class SelectScene extends Phaser.Scene {
  private controls!: Controls;
  private choice: CharId = 'sanmik';
  private costume = { sanmik: 0, sanchz: 0 };
  private sprites: Record<CharId, Phaser.GameObjects.Sprite> = {} as never;
  private frames: Record<CharId, Phaser.GameObjects.Rectangle> = {} as never;
  private costumeText: Record<CharId, Phaser.GameObjects.Text> = {} as never;
  private next: string | SceneRef = 'story';
  private locked = false;

  constructor() {
    super('select');
  }

  init(data: { next?: string | SceneRef }) {
    this.next = data.next ?? 'story';
  }

  create() {
    this.controls = new Controls(this);
    this.locked = false;
    this.choice = session.char;
    const g = this.add.graphics();
    g.fillGradientStyle(0x0d1a2e, 0x0d1a2e, 0x2e0d2a, 0x2e0d2a, 1);
    g.fillRect(0, 0, VIEW.W, VIEW.H);
    this.add.text(VIEW.W / 2, 22, 'PICK UR COUSIN', textStyle(22, '#ffe14a', '#120c16', 6)).setOrigin(0.5);
    this.add.text(VIEW.W / 2, 44, 'Left/Right: choose   Up/Down: costume   Confirm: go   Back: title', textStyle(8, '#cccccc', '#120c16', 2)).setOrigin(0.5);

    (['sanmik', 'sanchz'] as CharId[]).forEach((id, i) => {
      const cx = 170 + i * 300;
      const info = CHAR_INFO[id];
      this.frames[id] = this.add.rectangle(cx, 190, 250, 250, 0x120c16, 0.7).setStrokeStyle(3, 0x555555).setInteractive({ useHandCursor: true });
      this.frames[id].on('pointerdown', () => { if (this.choice === id) this.confirm(); else this.pick(id); });
      this.add.rectangle(cx, 196, 120, 6, 0x2a1530);
      const tex = `${id}_${info.costumes[this.costume[id]]}`;
      this.sprites[id] = this.add.sprite(cx, 196, tex, 'idle_0').setOrigin(0.5, 1).setScale(2.2).play(`${tex}:idle`);
      this.add.text(cx, 82, info.name, textStyle(22, id === 'sanmik' ? '#7ff3ff' : '#ff8fca', '#120c16', 5)).setOrigin(0.5);
      this.add.text(cx, 104, info.title, textStyle(11, '#ffffff', '#120c16', 3)).setOrigin(0.5);
      this.costumeText[id] = this.add.text(cx, 212, '', textStyle(10, '#ffe14a', '#120c16', 3)).setOrigin(0.5);
      this.add.text(cx, 262, info.blurb.join('\n'), { ...textStyle(9, '#ffffff', '#120c16', 2), lineSpacing: 2 }).setOrigin(0.5);
    });
    this.refresh();
  }

  private pick(id: CharId) {
    this.choice = id;
    AudioBus.sfx('sfx_ui_move');
    this.refresh();
  }

  private refresh() {
    (['sanmik', 'sanchz'] as CharId[]).forEach((id) => {
      const on = id === this.choice;
      this.frames[id].setStrokeStyle(3, on ? 0xffe14a : 0x444444);
      this.sprites[id].setAlpha(on ? 1 : 0.5);
      const info = CHAR_INFO[id];
      const tex = `${id}_${info.costumes[this.costume[id]]}`;
      if (this.sprites[id].texture.key !== tex) this.sprites[id].play(`${tex}:idle`);
      this.costumeText[id].setText(`< ${info.costumeNames[this.costume[id]]} >`).setVisible(on);
    });
  }

  private confirm() {
    if (this.locked) return;
    this.locked = true;
    const id = this.choice;
    const info = CHAR_INFO[id];
    const costume = info.costumes[this.costume[id]];
    AudioBus.voice(id === 'sanmik' ? 'vo_yee' : 'vo_yeghhh');
    this.sprites[id].play(`${id}_${costume}:victory`);
    this.cameras.main.flash(150, 255, 255, 255);
    newSession(id, costume);
    this.time.delayedCall(700, () => {
      const n = this.next;
      if (typeof n === 'object') this.scene.start(n.key, n.data ?? {});
      else if (n === 'gym') this.scene.start('gym');
      else if (n === 'begour') this.scene.start('begour', {});
      else this.scene.start('intro');
    });
  }

  update() {
    this.controls.update();
    if (this.locked) return;
    const c = this.controls;
    if (c.justPressed('left')) this.pick('sanmik');
    if (c.justPressed('right')) this.pick('sanchz');
    const n = CHAR_INFO[this.choice].costumes.length;
    if (c.justPressed('up') || c.justPressed('down')) {
      this.costume[this.choice] = (this.costume[this.choice] + (c.justPressed('up') ? -1 : 1) + n) % n;
      AudioBus.sfx('sfx_ui_move');
      this.refresh();
    }
    if (c.justPressed('back')) { this.scene.start('title'); return; }
    if (c.justPressed('confirm')) this.confirm();
  }
}
