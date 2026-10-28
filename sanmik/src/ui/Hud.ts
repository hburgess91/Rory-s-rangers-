import Phaser from 'phaser';
import type { Player } from '../player/Player';
import { session } from '../core/session';
import { textStyle } from '../core/Fx';
import { VIEW } from '../config/tuning';

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`);

export interface BossBarInfo {
  name: string;
  label: string;
  frac: () => number;
  notches: number[];
  extra?: { label: string; frac: () => number; color: number };
}

// Heads-up display. Everything is fixed to the camera.
export class Hud {
  private root: Phaser.GameObjects.Container;
  private hearts: Phaser.GameObjects.Image[] = [];
  private sock: Phaser.GameObjects.Image;
  private meterBar: Phaser.GameObjects.Rectangle;
  private meterLabel: Phaser.GameObjects.Text;
  private weapon: Phaser.GameObjects.Text;
  private score: Phaser.GameObjects.Text;
  private followers: Phaser.GameObjects.Text;
  private bossRoot: Phaser.GameObjects.Container;
  private bossBar: Phaser.GameObjects.Rectangle;
  private bossTrail: Phaser.GameObjects.Rectangle;
  private bossName: Phaser.GameObjects.Text;
  private bossExtra?: Phaser.GameObjects.Rectangle;
  private boss: BossBarInfo | null = null;
  private trailFrac = 1;
  private followTimer = 0;
  private verifying = 0;
  private hint: Phaser.GameObjects.Text;
  private hintUntil = 0;

  constructor(private scene: Phaser.Scene, private player: Player) {
    const s = scene;
    this.root = s.add.container(0, 0).setScrollFactor(0).setDepth(150);
    const face = s.add.image(6, 6, player.kit.id === 'sanmik' ? 'ui_face_sanmik' : 'ui_face_sanchz').setOrigin(0);
    const panel = s.add.rectangle(2, 2, 150, 54, 0x120c16, 0.55).setOrigin(0);
    this.root.add([panel, face]);
    for (let i = 0; i < player.maxHp; i++) {
      const h = s.add.image(42 + i * 13, 10, 'ui_heart').setOrigin(0);
      this.hearts.push(h);
      this.root.add(h);
    }
    this.sock = s.add.image(42 + player.maxHp * 13 + 2, 9, 'ui_sock').setOrigin(0).setVisible(false);
    this.meterLabel = s.add.text(42, 22, player.kit.meterName, textStyle(8, '#ffffff', '#120c16', 2)).setOrigin(0);
    const meterBg = s.add.rectangle(42, 33, 100, 6, 0x2a1f2e).setOrigin(0);
    this.meterBar = s.add.rectangle(42, 33, 100, 6, player.kit.meterColor).setOrigin(0);
    this.weapon = s.add.text(42, 41, '', textStyle(8, '#ffe14a', '#120c16', 2)).setOrigin(0);
    this.score = s.add.text(VIEW.W - 6, 4, '', textStyle(10, '#ffffff', '#120c16', 3)).setOrigin(1, 0);
    this.followers = s.add.text(VIEW.W - 6, 18, '', textStyle(9, '#9fe2ff', '#120c16', 3)).setOrigin(1, 0);
    this.root.add([this.sock, this.meterLabel, meterBg, this.meterBar, this.weapon, this.score, this.followers]);

    this.bossRoot = s.add.container(0, 0).setScrollFactor(0).setDepth(150).setVisible(false);
    const bw = 360;
    const bx = (VIEW.W - bw) / 2;
    const bossBg = s.add.rectangle(bx - 3, VIEW.H - 24, bw + 6, 14, 0x120c16, 0.85).setOrigin(0);
    this.bossTrail = s.add.rectangle(bx, VIEW.H - 21, bw, 8, 0xffffff).setOrigin(0);
    this.bossBar = s.add.rectangle(bx, VIEW.H - 21, bw, 8, 0xff4f8f).setOrigin(0);
    this.bossName = s.add.text(bx, VIEW.H - 38, '', textStyle(10, '#ffffff', '#120c16', 3)).setOrigin(0);
    this.bossRoot.add([bossBg, this.bossTrail, this.bossBar, this.bossName]);

    this.hint = s.add.text(VIEW.W / 2, 70, '', { ...textStyle(10, '#ffffff', '#120c16', 3), wordWrap: { width: 560 } }).setOrigin(0.5).setScrollFactor(0).setDepth(151).setAlpha(0);
  }

  setVisible(v: boolean) {
    this.root.setVisible(v);
    this.bossRoot.setVisible(v && !!this.boss);
  }

  showHint(text: string, ms = 3500) {
    this.hint.setText(text).setAlpha(1);
    this.hintUntil = this.scene.time.now + ms;
  }

  setBoss(info: BossBarInfo | null) {
    this.boss = info;
    this.bossRoot.setVisible(!!info);
    this.bossExtra?.destroy();
    this.bossExtra = undefined;
    if (!info) return;
    this.trailFrac = 1;
    this.bossName.setText(`${info.name}  —  ${info.label}`);
    const bw = 360, bx = (VIEW.W - bw) / 2;
    for (const n of info.notches) this.bossRoot.add(this.scene.add.rectangle(bx + bw * n, VIEW.H - 22, 2, 10, 0x120c16).setOrigin(0.5, 0));
    if (info.extra) {
      const t = this.scene.add.text(bx + bw, VIEW.H - 38, info.extra.label, textStyle(9, '#ff9ad0', '#120c16', 3)).setOrigin(1, 0);
      this.bossExtra = this.scene.add.rectangle(bx + bw - 80, VIEW.H - 44, 80, 4, info.extra.color).setOrigin(0);
      this.bossRoot.add([t, this.bossExtra]);
    }
    this.bossRoot.setAlpha(0);
    this.scene.tweens.add({ targets: this.bossRoot, alpha: 1, duration: 400 });
  }

  addFollowers(n: number) {
    session.followersClaimed += n;
  }

  update(dtMs: number) {
    const p = this.player;
    this.hearts.forEach((h, i) => h.setTexture(i < p.hp ? 'ui_heart' : 'ui_heart_empty'));
    this.sock.setVisible(p.sock > 0);
    const frac = p.meterShown;
    this.meterBar.width = 100 * frac;
    const full = p.meter >= 100 && !p.specialActive;
    this.meterLabel.setText(p.specialActive ? `${p.kit.meterName} MODE!` : full ? `${p.kit.meterName} FULL - PRESS SPECIAL` : p.kit.meterName);
    this.meterBar.setFillStyle(full ? (Math.floor(this.scene.time.now / 120) % 2 ? 0xffffff : p.kit.meterColor) : p.kit.meterColor);
    this.weapon.setText(`${p.kit.weaponLabel()}  ${p.kit.ammoLabel()}`);
    this.score.setText(`SCORE ${String(session.score).padStart(7, '0')}`);

    // Followers: big claimed numbers, routinely "verified" down to the truth.
    this.followTimer += dtMs;
    if (this.verifying > 0) {
      this.verifying -= dtMs;
      this.followers.setText(this.verifying > 1200 ? 'VERIFYING FOLLOWERS...' : 'ACTUAL FOLLOWERS: 3').setColor(this.verifying > 1200 ? '#ffffff' : '#ff8a8a');
    } else {
      this.followers.setText(`FOLLOWERS ${fmt(session.followersClaimed)}`).setColor('#9fe2ff');
      if (this.followTimer > 22000 && session.followersClaimed > 0) { this.followTimer = 0; this.verifying = 2600; }
    }

    if (this.boss) {
      const f = Phaser.Math.Clamp(this.boss.frac(), 0, 1);
      this.bossBar.width = 360 * f;
      this.trailFrac = Math.max(f, this.trailFrac - dtMs / 1800);
      this.bossTrail.width = 360 * this.trailFrac;
      if (this.bossExtra && this.boss.extra) this.bossExtra.width = 80 * Phaser.Math.Clamp(this.boss.extra.frac(), 0, 1);
    }
    if (this.hintUntil && this.scene.time.now > this.hintUntil) {
      this.hintUntil = 0;
      this.scene.tweens.add({ targets: this.hint, alpha: 0, duration: 300 });
    }
  }
}
