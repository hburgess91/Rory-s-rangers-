import type Phaser from "phaser";
import type { Enemy } from "./Enemy";
import type { Player } from "./Player";

export interface HitOpts {
  crit?: boolean;
  knock?: number;
  angle?: number;
  stun?: number;
  source?: string;
  mark?: boolean;
  slow?: number;
  /** Fixed damage that ignores multipliers (RuneScape 99s). */
  fixed?: boolean;
  noWonk?: boolean;
  label?: string;
}

export interface ShotOpts {
  owner: "player" | "enemy";
  damage: number;
  speed: number;
  angle: number;
  color?: number;
  texture?: string;
  life?: number;
  pierce?: number;
  homing?: number;
  ricochet?: number;
  scale?: number;
  slow?: number;
  crit?: boolean;
  onHit?: (x: number, y: number) => void;
  /** Called when the shot runs out of range or leaves the room. */
  onEnd?: (x: number, y: number) => void;
  knock?: number;
}

/** What entities need from the combat scene. Implemented by DungeonScene. */
export interface CombatWorld {
  sc: Phaser.Scene;
  player: Player;
  enemies: Enemy[];
  enemyTimeScale: number;
  telegraphMult: number;
  spawnEnemy(type: string, x: number, y: number, opts?: { noDrops?: boolean; minion?: boolean }): Enemy | null;
  damageEnemy(e: Enemy, amount: number, opts?: HitOpts): void;
  damagePlayer(amount: number, from?: { x: number; y: number }, opts?: { unblockable?: boolean; label?: string }): void;
  shoot(x: number, y: number, o: ShotOpts): Phaser.Physics.Arcade.Sprite;
  aoe(x: number, y: number, r: number, dmg: number, opts?: HitOpts & { color?: number }): number;
  enemyAoe(x: number, y: number, r: number, dmg: number, delayMs: number, color?: number): void;
  enemyLine(x: number, y: number, angle: number, len: number, width: number, dmg: number, delayMs: number): void;
  floatText(x: number, y: number, text: string, color?: string, size?: number): void;
  shake(ms: number, intensity: number): void;
  hitStop(ms: number): void;
  addWonk(n: number): void;
  toast(title: string, text: string): void;
  nearestEnemy(x: number, y: number, maxDist?: number, exclude?: Enemy): Enemy | null;
  bounds: Phaser.Geom.Rectangle;
  now(): number;
  burst(x: number, y: number, color: number, n?: number): void;
}
