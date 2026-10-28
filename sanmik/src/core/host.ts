import type Phaser from 'phaser';
import type { Combat } from '../combat/Combat';
import type { Fx } from './Fx';
import type { Controls } from '../input/Controls';

/** What the player, enemies and bosses need from the gameplay scene. */
export interface GameHost extends Phaser.Scene {
  combat: Combat;
  fx: Fx;
  controls: Controls;
  inputLocked: boolean;
  godMode: boolean;
  now: number;
  worldH: number;
  hitStop(ms: number): void;
  onPlayerDeath(): void;
  onSpecial(kind: 'delusion' | 'crunk', on: boolean): void;
  addScore(n: number, x?: number, y?: number): void;
  onEnemyKilled(x: number, y: number, score: number): void;
}
