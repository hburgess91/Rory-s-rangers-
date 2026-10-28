import Phaser from 'phaser';
import { VIEW } from './config/tuning';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { SelectScene } from './scenes/SelectScene';
import { IntroScene } from './scenes/IntroScene';
import { TeskoScene } from './scenes/TeskoScene';
import { BegourScene } from './scenes/BegourScene';
import { GymScene } from './scenes/GymScene';
import { PauseScene } from './scenes/PauseScene';
import { ResultScene } from './scenes/ResultScene';
import { AudioBus } from './audio/AudioBus';
import { Scope } from './bosses/Scope';
import { debugApi } from './core/debug';
import { session } from './core/session';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.W,
  height: VIEW.H,
  backgroundColor: '#07060b',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  input: { gamepad: true, keyboard: true },
  audio: { disableWebAudio: false },
  scene: [BootScene, TitleScene, SelectScene, IntroScene, TeskoScene, BegourScene, GymScene, PauseScene, ResultScene],
});

debugApi.game = game;

// Test / debug hooks (read-only views plus a few cheats).
window.__SANMIK = {
  game,
  session,
  audio: AudioBus.stats,
  get activeScenes() {
    return game.scene.getScenes(true).map((s) => s.scene.key);
  },
  get gameplay() {
    return debugApi.gameplay;
  },
  get scopes() {
    return Scope.live;
  },
  state() {
    const g = debugApi.gameplay as unknown as {
      player?: { x: number; y: number; hp: number; alive: boolean; onGround: boolean; jumps: number; meter: number; pbody: { velocity: { x: number; y: number } } };
      combat?: { live(): unknown[]; zones: unknown[]; targets: Set<unknown> };
      debugState?: () => Record<string, unknown>;
      boss?: { debugInfo: unknown };
      time?: { getAllEvents?: () => unknown[] };
      scene?: { key: string };
    } | null;
    if (!g || !g.player || !(g.player as unknown as { body?: unknown }).body || !g.scene || !(g as unknown as Phaser.Scene).sys?.isActive()) return null;
    const p = g.player;
    return {
      scene: g.scene?.key,
      x: p.x, y: p.y, vx: p.pbody.velocity.x, vy: p.pbody.velocity.y, hp: p.hp, alive: p.alive, onGround: p.onGround, jumps: p.jumps, meter: p.meter,
      projectiles: g.combat?.live().length ?? 0, zones: g.combat?.zones.length ?? 0, targets: g.combat?.targets.size ?? 0,
      timers: g.time?.getAllEvents?.().length ?? -1,
      boss: g.boss?.debugInfo ?? null,
      music: AudioBus.currentTrack,
      sequencers: AudioBus.stats.liveSequencers,
      scopes: Scope.live,
    };
  },
  cheat: {
    god(on = true) { debugApi.god = on; const g = debugApi.gameplay as unknown as { godMode: boolean } | null; if (g) g.godMode = on; },
    nextPhase() { debugApi.gameplay?.debugNextPhase(); },
    killBoss() { debugApi.gameplay?.debugKillBoss(); },
    killPlayer() { const g = debugApi.gameplay as unknown as { player?: { die(): void } } | null; g?.player?.die(); },
    meter() { const g = debugApi.gameplay as unknown as { player?: { meter: number } } | null; if (g?.player) g.player.meter = 100; },
    teleport(x: number, y: number) { const g = debugApi.gameplay as unknown as { player?: { respawnAt(x: number, y: number): void } } | null; g?.player?.respawnAt(x, y); },
  },
};
