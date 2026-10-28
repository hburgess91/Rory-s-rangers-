import Phaser from 'phaser';
import type { GameHost } from '../core/host';

const TEX: Record<string, string> = {
  food: 'pk_food', pepsi: 'pk_pepsi', pepsimax: 'pk_pepsimax', friggle: 'pk_friggle', spidge: 'pk_spidge', sock: 'pk_sock',
  crate1: 'pk_crate', crate2: 'pk_crate', crate3: 'pk_crate', crate4: 'pk_crate', ammo: 'pk_crate', football: 'pk_football',
};

const CRATE_LABEL: Record<string, Record<string, string>> = {
  sanmik: { crate1: 'SG', crate2: 'UZ', crate3: 'CS', crate4: 'BAT', ammo: 'AMO' },
  sanchz: { crate1: 'BNS', crate2: 'ROL', crate3: 'FUD', crate4: 'FUD', ammo: 'FUD' },
};

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  label?: Phaser.GameObjects.Text;
  private t = Math.random() * 1000;
  taken = false;

  constructor(public host: GameHost, x: number, y: number, public kind: string, char: string, floating = false) {
    super(host, x, y, TEX[kind] ?? 'pk_friggle');
    host.add.existing(this);
    host.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(42);
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.setAllowGravity(!floating);
    b.setGravityY(700);
    if (kind.startsWith('crate') || kind === 'ammo') {
      this.label = host.add.text(x, y - 9, CRATE_LABEL[char]?.[kind] ?? '?', { fontFamily: 'monospace', fontSize: '7px', color: '#7a3a1a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(43);
    }
  }

  step(dt: number) {
    this.t += dt;
    const bob = Math.sin(this.t / 220) * 2;
    this.setDisplayOrigin(this.width / 2, this.height + bob);
    this.label?.setPosition(this.x, this.y - this.height / 2 - bob);
  }

  collect() {
    if (this.taken) return;
    this.taken = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.host.fx.sparks(this.x, this.y - 8, 0xffe14a, 6, 80);
    this.label?.destroy();
    this.host.tweens.add({ targets: this, y: this.y - 16, alpha: 0, duration: 200, onComplete: () => this.destroy() });
  }

  destroy(fromScene?: boolean) {
    this.label?.destroy();
    super.destroy(fromScene);
  }
}
