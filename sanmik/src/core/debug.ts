import type Phaser from 'phaser';

// Debug / test hooks. Enabled in dev builds or with ?debug in the URL.
// Exposed as window.__SANMIK so browser tests can drive and inspect the game.

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

export const debugApi = {
  enabled: import.meta.env.DEV || params.has('debug'),
  god: false,
  game: null as Phaser.Game | null,
  gameplay: null as (Phaser.Scene & { debugState(): Record<string, unknown>; debugNextPhase(): void; debugKillBoss(): void }) | null,
};

declare global {
  interface Window {
    __SANMIK?: unknown;
  }
}
