import { GameplayScene } from './GameplayScene';
import { Dummy, Pitcher } from '../enemies/types';
import { Charger, HenDo } from '../enemies/roster';
import { VIEW, MOVE } from '../config/tuning';
import { Pickup } from '../enemies/Pickup';
import { session } from '../core/session';

const G = 320;

// Development test scene: flat floor, measured gaps and steps, a damage
// dummy, a reflect target and endless pickups. Not part of the campaign.
export class GymScene extends GameplayScene {
  private stations: { x: number; y: number; kind: string; p: Pickup | null; respawnAt: number }[] = [];

  constructor() {
    super('gym');
    this.musicKey = 'mus_gym';
  }

  protected buildLevel() {
    this.worldW = 2200;
    this.worldH = VIEW.H;
    this.spawn = { x: 80, y: G - 2 };
    this.add.tileSprite(0, 0, VIEW.W, VIEW.H, 'bg_gym').setOrigin(0).setScrollFactor(0.2).setDepth(-10);
    this.add.text(8, 98, 'DEBUG GYM', { fontFamily: 'monospace', fontSize: '20px', color: '#ffe14a' }).setDepth(-5).setScrollFactor(0.2);

    // flat test floor
    this.solid(0, G, 700, 40, 'gym');
    this.addSign(160, G, 'DUMMY: DPS TEST', 'F1: hitboxes  F2: god mode  F3: refill meter + HP  F7: next checkpoint');
    this.addEnemy(new Dummy(this, 260, G));
    this.addEnemy(new Pitcher(this, 640, G));
    this.addSign(560, G, 'REFLECT TEST >', 'SanChz: Alt (guard) to send balls back. SanMik: bat pickup does it too.');

    // step heights (both characters must clear all of these)
    const steps = [24, 40, 56, Math.round(MOVE.jumpHeight - 12)];
    let x = 720;
    for (const h of steps) {
      this.solid(x, G - h, 60, h + 40, 'gym');
      this.add.text(x + 30, G - h - 12, `${h}px`, { fontFamily: 'monospace', fontSize: '8px', color: '#9fe2ff' }).setOrigin(0.5).setDepth(30);
      this.solid(x + 60, G, 40, 40, 'gym');
      x += 100;
    }
    // gaps (max horizontal reach should clear the widest)
    const gaps = [64, 96, 128, 148];
    for (const gap of gaps) {
      this.solid(x, G, 80, 40, 'gym');
      this.add.text(x + 80 + gap / 2, G - 30, `${gap}px gap`, { fontFamily: 'monospace', fontSize: '8px', color: '#ff9a9a' }).setOrigin(0.5).setDepth(30);
      x += 80 + gap;
    }
    this.solid(x, G, 2200 - x, 40, 'gym');
    this.addCheckpoint(x + 30, G);
    // one-way stack
    this.oneWay(x + 100, 268, 80, 'gym');
    this.oneWay(x + 180, 216, 80, 'gym');
    this.oneWay(x + 100, 164, 80, 'gym');
    this.addSign(x + 60, G, 'ONE-WAY STACK', 'S + W drops through one-way platforms.');
    this.addEnemy(Charger.wheelie(this, x + 400, G));
    this.addEnemy(new HenDo(this, x + 460, G));

    // endless pickup stations
    this.stations = [];
    const kinds = ['crate1', 'crate2', 'crate3', 'crate4', 'pepsi', 'pepsimax', 'sock', 'food'];
    kinds.forEach((k, i) => this.stations.push({ x: 330 + i * 26, y: G, kind: k, p: null, respawnAt: 0 }));
    this.add.text(420, G + 14, 'PICKUPS RESPAWN', { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff' }).setOrigin(0.5).setDepth(30);
  }

  protected afterCreate() {
    session.chapterStartedAt = performance.now();
    this.fx.banner('DEBUG GYM', session.char === 'sanmik' ? 'SanMik loadout' : 'SanChz loadout', '#9fe2ff', 1400);
    this.time.delayedCall(1500, () => this.showControlsHint());
  }

  protected levelUpdate() {
    for (const s of this.stations) {
      if (s.p && (s.p.taken || !s.p.active)) { s.p = null; s.respawnAt = this.now + 3000; }
      if (!s.p && this.now >= s.respawnAt) s.p = this.addPickup(s.x, s.y - 20, s.kind);
    }
  }

  debugState() {
    return { scene: 'gym', jumps: this.player.jumps };
  }
}
