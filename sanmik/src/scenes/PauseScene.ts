import Phaser from 'phaser';
import { Controls, CONTROL_HINTS } from '../input/Controls';
import { Menu } from '../ui/Menu';
import { textStyle } from '../core/Fx';
import { VIEW } from '../config/tuning';
import { getSettings, updateSettings } from '../core/settings';
import { AudioBus } from '../audio/AudioBus';

export class PauseScene extends Phaser.Scene {
  private controls!: Controls;
  private menu!: Menu;
  private from = '';
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super('pause');
  }

  init(data: { from: string }) {
    this.from = data.from;
  }

  create() {
    this.controls = new Controls(this);
    this.controls.update();
    this.add.rectangle(0, 0, VIEW.W, VIEW.H, 0x000000, 0.6).setOrigin(0);
    this.add.text(VIEW.W / 2, 70, 'PAUSED', textStyle(28, '#ffe14a', '#120c16', 6)).setOrigin(0.5);
    this.add.text(VIEW.W / 2, 96, 'SanMik is still technically dead', textStyle(9, '#cccccc', '#120c16', 2)).setOrigin(0.5);
    this.menu = new Menu(this, this.controls, [
      { label: 'RESUME', onSelect: () => this.resume() },
      { label: 'RESTART FROM CHECKPOINT', onSelect: () => this.restart() },
      { label: () => `SCREEN SHAKE: ${getSettings().screenShake ? 'ON' : 'OFF'}`, onSelect: () => updateSettings({ screenShake: !getSettings().screenShake }) },
      { label: () => `MUSIC: ${Math.round(getSettings().musicVol * 100)}%`, onLeft: () => updateSettings({ musicVol: Math.max(0, Math.round((getSettings().musicVol - 0.1) * 10) / 10) }), onRight: () => updateSettings({ musicVol: Math.min(1, Math.round((getSettings().musicVol + 0.1) * 10) / 10) }) },
      { label: 'QUIT TO TITLE', onSelect: () => this.quit() },
    ], VIEW.W / 2, 140, 22, 13);
    this.hint = this.add.text(VIEW.W / 2, VIEW.H - 30, CONTROL_HINTS.keyboard, { ...textStyle(8, '#ffffff', '#120c16', 2), wordWrap: { width: 600 } }).setOrigin(0.5);
  }

  private resume() {
    this.scene.stop();
    this.scene.resume(this.from);
  }

  private restart() {
    const g = this.scene.get(this.from) as Phaser.Scene & { checkpointIdx?: number };
    this.scene.stop();
    this.scene.stop(this.from);
    this.scene.start(this.from, { checkpoint: g.checkpointIdx ?? 0, retry: true });
  }

  private quit() {
    AudioBus.musicOverride(null);
    this.scene.stop(this.from);
    this.scene.start('title');
  }

  update() {
    this.controls.update();
    this.hint.setText(this.controls.lastDevice === 'pad' ? CONTROL_HINTS.pad : CONTROL_HINTS.keyboard);
    if (this.controls.justPressed('pause') || this.controls.justPressed('back')) { this.resume(); return; }
    this.menu.update();
  }
}
