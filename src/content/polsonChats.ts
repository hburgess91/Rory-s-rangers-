import type { GameState, Line } from "../data/types";

// Popping round Polson Towers (after Chapter 3): real conversations from Harry's Messenger chats with Polson.
// Filled in by the curation step; while this list is empty, Polson Towers stays shut after Chapter 3.
export const POLSON_CHATS: { id: string; title: string; date: string; lines: Line[] }[] = [];

export function polsonVisit(_s: GameState): Line[] {
  return [];
}
