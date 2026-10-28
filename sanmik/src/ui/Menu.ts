import Phaser from 'phaser';
import type { Controls } from '../input/Controls';
import { textStyle } from '../core/Fx';
import { AudioBus } from '../audio/AudioBus';

export interface MenuItem {
  label: string | (() => string);
  onSelect?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  id?: string;
}

// Vertical menu driven by Controls, with mouse/touch support.
export class Menu {
  index = 0;
  texts: Phaser.GameObjects.Text[] = [];
  private cursor: Phaser.GameObjects.Text;
  enabled = true;

  constructor(scene: Phaser.Scene, private controls: Controls, private items: MenuItem[], x: number, y: number, spacing = 20, size = 14, depth = 200, scroll = false) {
    items.forEach((it, i) => {
      const t = scene.add.text(x, y + i * spacing, '', textStyle(size, '#ffffff', '#120c16', 4)).setOrigin(0.5).setDepth(depth).setInteractive({ useHandCursor: true });
      if (!scroll) t.setScrollFactor(0);
      t.on('pointerover', () => { if (this.enabled && this.index !== i) { this.index = i; AudioBus.sfx('sfx_ui_move'); this.refresh(); } });
      t.on('pointerdown', () => { if (this.enabled) { this.index = i; this.select(); } });
      if (it.id) t.setName(it.id);
      this.texts.push(t);
    });
    this.cursor = scene.add.text(0, 0, '>', textStyle(size, '#ffe14a', '#120c16', 4)).setOrigin(0.5).setDepth(depth);
    if (!scroll) this.cursor.setScrollFactor(0);
    this.refresh();
  }

  private label(i: number) {
    const l = this.items[i].label;
    return typeof l === 'function' ? l() : l;
  }

  refresh() {
    this.texts.forEach((t, i) => t.setText(this.label(i)).setColor(i === this.index ? '#ffe14a' : '#ffffff'));
    const t = this.texts[this.index];
    this.cursor.setPosition(t.x - t.width / 2 - 12, t.y);
  }

  private select() {
    const it = this.items[this.index];
    if (it.onSelect) { AudioBus.sfx('sfx_ui_select'); it.onSelect(); }
    else if (it.onRight) { it.onRight(); AudioBus.sfx('sfx_ui_move'); }
    this.refresh();
  }

  update() {
    if (!this.enabled) return;
    const c = this.controls;
    if (c.justPressed('down')) { this.index = (this.index + 1) % this.items.length; AudioBus.sfx('sfx_ui_move'); this.refresh(); }
    if (c.justPressed('up')) { this.index = (this.index - 1 + this.items.length) % this.items.length; AudioBus.sfx('sfx_ui_move'); this.refresh(); }
    const it = this.items[this.index];
    if (c.justPressed('left') && it.onLeft) { it.onLeft(); AudioBus.sfx('sfx_ui_move'); this.refresh(); }
    if (c.justPressed('right') && it.onRight) { it.onRight(); AudioBus.sfx('sfx_ui_move'); this.refresh(); }
    if (c.justPressed('confirm')) this.select();
  }

  setVisible(v: boolean) {
    this.texts.forEach((t) => t.setVisible(v));
    this.cursor.setVisible(v);
    this.enabled = v;
  }

  destroy() {
    this.texts.forEach((t) => t.destroy());
    this.cursor.destroy();
  }
}
