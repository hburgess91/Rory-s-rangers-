import Phaser from 'phaser';
import { textStyle } from '../core/Fx';
import { VIEW } from '../config/tuning';
import type { Controls } from '../input/Controls';
import { AudioBus } from '../audio/AudioBus';

export interface Line {
  who: string;
  text: string;
  color?: string;
  face?: string; // texture key for a portrait
  voice?: 'vo_bear' | 'vo_bear_sob';
  onShow?: () => void;
}

const COLORS: Record<string, string> = { SANMIK: '#7ff3ff', SANCHZ: '#ff8fca', BEGOUR: '#ffcf8a', GABOR: '#ff4f6f', CLERK: '#cfd6ff' };

// Bottom-of-screen dialogue box for short cutscenes. Confirm advances, Pause skips.
export class Dialogue {
  private root: Phaser.GameObjects.Container;
  private name: Phaser.GameObjects.Text;
  private body: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;
  private face: Phaser.GameObjects.Image;
  private lines: Line[] = [];
  private idx = 0;
  private shown = 0;
  private done?: () => void;
  active = false;

  onToggle: (active: boolean) => void = () => {};

  constructor(private scene: Phaser.Scene, private controls: Controls, top = false) {
    const s = scene;
    const cy = top ? 40 : VIEW.H - 44;
    this.root = s.add.container(0, 0).setScrollFactor(0).setDepth(300).setVisible(false);
    const box = s.add.rectangle(VIEW.W / 2, cy, VIEW.W - 24, 66, 0x120c16, 0.88).setStrokeStyle(2, 0xffe14a);
    this.face = s.add.image(34, cy, 'ui_face_sanmik').setScale(1.5);
    this.name = s.add.text(66, cy - 28, '', textStyle(11, '#ffe14a', '#120c16', 3)).setOrigin(0);
    this.body = s.add.text(66, cy - 12, '', { ...textStyle(11, '#ffffff', '#120c16', 2), align: 'left', wordWrap: { width: VIEW.W - 110 } }).setOrigin(0);
    this.prompt = s.add.text(VIEW.W - 20, cy + 28, '▶', textStyle(10, '#ffe14a', '#120c16', 2)).setOrigin(1, 1);
    this.root.add([box, this.face, this.name, this.body, this.prompt]);
  }

  play(lines: Line[], done?: () => void) {
    this.lines = lines;
    this.idx = 0;
    this.done = done;
    this.active = true;
    this.root.setVisible(true);
    this.onToggle(true);
    this.show();
  }

  private show() {
    const l = this.lines[this.idx];
    this.name.setText(l.who).setColor(l.color ?? COLORS[l.who] ?? '#ffe14a');
    this.body.setText('');
    this.shown = 0;
    this.face.setVisible(!!l.face);
    if (l.face) this.face.setTexture(l.face);
    this.name.setX(l.face ? 66 : 32);
    this.body.setX(l.face ? 66 : 32);
    if (l.voice) AudioBus.voice(l.voice, { vol: 0.8 });
    l.onShow?.();
  }

  update(dtMs: number) {
    if (!this.active) return;
    const l = this.lines[this.idx];
    if (this.shown < l.text.length) {
      this.shown = Math.min(l.text.length, this.shown + dtMs * 0.06);
      this.body.setText(l.text.slice(0, Math.floor(this.shown)));
    }
    this.prompt.setAlpha(this.shown >= l.text.length ? (Math.floor(this.scene.time.now / 300) % 2 ? 1 : 0.3) : 0);
    if (this.controls.justPressed('pause')) { this.finish(); return; }
    if (this.controls.justPressed('confirm') || this.controls.justPressed('shoot') || this.controls.justPressed('jump')) {
      if (this.shown < l.text.length) { this.shown = l.text.length; this.body.setText(l.text); return; }
      AudioBus.sfx('sfx_ui_move', { vol: 0.5 });
      this.idx++;
      if (this.idx >= this.lines.length) this.finish(); else this.show();
    }
  }

  /** Jump to the end (calls the completion callback). */
  skip() {
    if (this.active) this.finish();
  }

  private finish() {
    this.active = false;
    this.root.setVisible(false);
    this.onToggle(false);
    const d = this.done;
    this.done = undefined;
    d?.();
  }
}

/** Little speech bubble that follows a world point. Doesn't block input. */
export function bubble(scene: Phaser.Scene, getPos: () => { x: number; y: number }, text: string, ms = 1600, color = '#120c16') {
  const t = scene.add.text(0, 0, text, { fontFamily: '"Trebuchet MS", Verdana, sans-serif', fontSize: '10px', color, fontStyle: 'bold', backgroundColor: '#fff6e0', padding: { x: 5, y: 3 }, align: 'center', wordWrap: { width: 170 } })
    .setOrigin(0.5, 1).setDepth(140);
  const upd = () => { const p = getPos(); t.setPosition(Math.round(p.x), Math.round(p.y)); };
  upd();
  scene.events.on('postupdate', upd);
  t.setScale(0.2);
  scene.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
  scene.time.delayedCall(ms, () => {
    scene.tweens.add({ targets: t, alpha: 0, duration: 200, onComplete: () => { scene.events.off('postupdate', upd); t.destroy(); } });
  });
  t.once('destroy', () => scene.events.off('postupdate', upd));
  return t;
}
