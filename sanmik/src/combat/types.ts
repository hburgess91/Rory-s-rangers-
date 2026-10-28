export type Team = 'player' | 'enemy';

export interface Rect {
  x: number; // left
  y: number; // top
  w: number;
  h: number;
}

export interface Hit {
  damage: number;
  team: Team;
  kind: 'shot' | 'melee' | 'gas' | 'contact' | 'blast' | 'hazard';
  x: number;
  y: number;
  dir: number; // -1 / 1 horizontal direction of the hit
  sticky?: boolean;
  knock?: number;
  strong?: boolean;
}

export interface Target {
  alive: boolean;
  isBoss?: boolean;
  /** Rectangles that can be hit. Index is passed back to takeHit. */
  hurtRects(): Rect[];
  /** Returns true if the hit landed (false = ignored, e.g. invulnerable). */
  takeHit(hit: Hit, part: number): boolean;
}

export const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const rectAround = (cx: number, cy: number, w: number, h: number): Rect => ({ x: cx - w / 2, y: cy - h / 2, w, h });
