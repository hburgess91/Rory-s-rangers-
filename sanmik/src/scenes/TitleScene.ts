import Phaser from 'phaser';
import { Controls, CONTROL_HINTS } from '../input/Controls';
import { Menu } from '../ui/Menu';
import { textStyle } from '../core/Fx';
import { AudioBus } from '../audio/AudioBus';
import { VIEW } from '../config/tuning';
import { getSettings, updateSettings } from '../core/settings';
import { debugApi } from '../core/debug';

export class TitleScene extends Phaser.Scene {
  private controls!: Controls;
  private menu!: Menu;
  private settingsMenu!: Menu;
  private started = false;
  private pressStart!: Phaser.GameObjects.Text;
  private panel: Phaser.GameObjects.Container | null = null;
  private padNote!: Phaser.GameObjects.Text;

  constructor() {
    super('title');
  }

  create() {
    this.started = false;
    this.panel = null;
    this.controls = new Controls(this);
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a0b2e, 0x1a0b2e, 0x3a0f3a, 0x3a0f3a, 1);
    g.fillRect(0, 0, VIEW.W, VIEW.H);
    for (let i = 0; i < 70; i++) this.add.rectangle(Math.random() * VIEW.W, Math.random() * VIEW.H * 0.7, 1, 1, 0xffffff, Math.random() * 0.8 + 0.2);
    // a cheap stage and two spotlights for our heroes
    this.add.rectangle(0, 300, VIEW.W, 60, 0x2a1530).setOrigin(0);
    for (const x of [130, 510]) this.add.triangle(x, 0, 0, 0, -50, 300, 50, 300, 0xfff6c8, 0.08).setOrigin(0.5, 0);
    this.add.sprite(130, 302, 'sanmik_classic', 'idle_0').setOrigin(0.5, 1).setScale(2).play('sanmik_classic:idle');
    this.add.sprite(510, 302, 'sanchz_classic', 'idle_0').setOrigin(0.5, 1).setScale(2).setFlipX(true).play('sanchz_classic:idle');

    const title = this.add.text(VIEW.W / 2, 64, 'SANMIK', textStyle(64, '#ffe14a', '#c8102e', 10)).setOrigin(0.5);
    const sub = this.add.text(VIEW.W / 2, 112, 'YEEE OF DESTRUCTION', textStyle(22, '#ff3ad0', '#120c16', 6)).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: { from: 1, to: 1.04 }, yoyo: true, repeat: -1, duration: 650, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: sub, y: 116, yoyo: true, repeat: -1, duration: 450, ease: 'Sine.easeInOut' });
    this.add.text(VIEW.W / 2, 134, 'VERTICAL SLICE  -  CHAPTER 2: BIG TESK-O', textStyle(9, '#ffffff', '#120c16', 3)).setOrigin(0.5);

    this.pressStart = this.add.text(VIEW.W / 2, 220, 'PRESS START', textStyle(18, '#ffffff', '#120c16', 5)).setOrigin(0.5);
    this.tweens.add({ targets: this.pressStart, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
    this.padNote = this.add.text(VIEW.W / 2, VIEW.H - 10, 'Controller? Press any button on it so the browser can see it.', textStyle(8, '#bbbbbb', '#120c16', 2)).setOrigin(0.5);
    this.input.gamepad?.on('connected', () => this.padNote.setText('Controller connected. YEE.'));

    this.menu = new Menu(this, this.controls, [
      { id: 'm-story', label: 'STORY (VERTICAL SLICE)', onSelect: () => this.scene.start('select', { next: 'story' }) },
      { id: 'm-boss', label: 'FIGHT BEGOUR', onSelect: () => this.scene.start('select', { next: 'begour' }) },
      { id: 'm-gym', label: 'DEBUG GYM', onSelect: () => this.scene.start('select', { next: 'gym' }) },
      { id: 'm-settings', label: 'SETTINGS', onSelect: () => this.openSettings() },
      { id: 'm-controls', label: 'CONTROLS', onSelect: () => this.openControls() },
    ], VIEW.W / 2, 176, 20, 13);
    this.menu.setVisible(false);

    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const step = (k: 'musicVol' | 'sfxVol' | 'voiceVol', d: number) => updateSettings({ [k]: Phaser.Math.Clamp(Math.round((getSettings()[k] + d) * 10) / 10, 0, 1) });
    this.settingsMenu = new Menu(this, this.controls, [
      { label: () => `MUSIC  < ${pct(getSettings().musicVol)} >`, onLeft: () => step('musicVol', -0.1), onRight: () => step('musicVol', 0.1) },
      { label: () => `SFX  < ${pct(getSettings().sfxVol)} >`, onLeft: () => step('sfxVol', -0.1), onRight: () => step('sfxVol', 0.1) },
      { label: () => `VOICE (YEEE)  < ${pct(getSettings().voiceVol)} >`, onLeft: () => step('voiceVol', -0.1), onRight: () => step('voiceVol', 0.1) },
      { label: () => `SCREEN SHAKE  < ${getSettings().screenShake ? 'ON' : 'OFF'} >`, onLeft: () => updateSettings({ screenShake: !getSettings().screenShake }), onRight: () => updateSettings({ screenShake: !getSettings().screenShake }) },
      { label: 'BACK', onSelect: () => this.closePanel() },
    ], VIEW.W / 2, 172, 20, 12, 260);
    this.settingsMenu.setVisible(false);

    this.input.on('pointerdown', () => this.begin());
    this.input.keyboard?.on('keydown', () => this.begin());
    this.input.gamepad?.on('down', () => this.begin());
    debugApi.gameplay = null;
    if (TitleScene.unlocked) this.begin();
  }

  static unlocked = false;

  private begin() {
    if (this.started) return;
    this.started = true;
    TitleScene.unlocked = true;
    AudioBus.unlock();
    AudioBus.music('mus_title');
    this.pressStart.setVisible(false);
    this.time.delayedCall(60, () => { this.controls.update(); this.menu.setVisible(true); });
  }

  private openSettings() {
    this.menu.setVisible(false);
    this.panel = this.add.container(0, 0).setDepth(250);
    this.panel.add(this.add.rectangle(VIEW.W / 2, 210, 320, 130, 0x120c16, 0.92).setStrokeStyle(2, 0xffe14a));
    this.settingsMenu.index = 0;
    this.settingsMenu.setVisible(true);
    this.settingsMenu.refresh();
  }

  private openControls() {
    this.menu.setVisible(false);
    this.panel = this.add.container(0, 0).setDepth(250);
    this.panel.add(this.add.rectangle(VIEW.W / 2, 220, 600, 150, 0x120c16, 0.94).setStrokeStyle(2, 0xffe14a));
    const lines = [
      'KEYBOARD', CONTROL_HINTS.keyboard.replace(/  /g, '\n'), '',
    ];
    this.panel.add(this.add.text(170, 220, lines.join('\n'), { ...textStyle(9, '#ffffff', '#120c16', 2), align: 'left' }).setOrigin(0.5));
    this.panel.add(this.add.text(460, 220, ['GAMEPAD', CONTROL_HINTS.pad.replace(/  /g, '\n'), '', 'SanChz: Down + Melee = Rancid Fart', 'SanChz: Alt = Crutch Guard', 'SanMik: Alt = Pose (gains Fame)'].join('\n'), { ...textStyle(9, '#ffffff', '#120c16', 2), align: 'left' }).setOrigin(0.5));
    this.panel.add(this.add.text(VIEW.W / 2, 290, 'PRESS CONFIRM / BACK', textStyle(9, '#ffe14a', '#120c16', 2)).setOrigin(0.5));
  }

  private closePanel() {
    this.panel?.destroy();
    this.panel = null;
    this.settingsMenu.setVisible(false);
    this.menu.setVisible(true);
  }

  update() {
    this.controls.update();
    if (!this.started) return;
    if (this.panel && !this.settingsMenu.enabled) {
      if (this.controls.justPressed('confirm') || this.controls.justPressed('back')) this.closePanel();
      return;
    }
    if (this.settingsMenu.enabled) {
      if (this.controls.justPressed('back')) { this.closePanel(); return; }
      this.settingsMenu.update();
      return;
    }
    this.menu.update();
  }
}
