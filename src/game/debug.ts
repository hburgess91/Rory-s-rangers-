import type Phaser from "phaser";
import { G } from "./G";
import { switchTo } from "./Flow";
import type { PlayableId } from "../data/types";
import { maxHp } from "./systems/stats";

/**
 * Debug hooks for testing (window.__krel). Not shown anywhere in the UI.
 * Example: __krel.newRun("GRONNY"); __krel.go("Dungeon", { dungeon: "citadel", room: 3 });
 */
export function installDebug(game: Phaser.Game) {
  const api = {
    G,
    game,
    active: () => game.scene.getScenes(true).map((s) => s.scene.key),
    newRun: (p: PlayableId = "FLENKY", ngPlus = 0) => G.newRun(p, ngPlus),
    go: (key: string, data?: any) => {
      const from = game.scene.getScenes(true)[0];
      if (from) switchTo(from, key, data);
    },
    setChapter: (n: number, flags: Record<string, any> = {}) => {
      const s = G.s;
      s.chapter = n;
      for (let i = 1; i < n; i++) {
        s.flags[`ch${i}_clear`] = true;
        s.flags[`ch${i}_fact`] = true;
        s.flags[`ch${i}_intro`] = true;
      }
      Object.assign(s.flags, { prologue_done: true, ch1_intro: true, met_emergency: true, founding_seen: true, ministerial_quests: true }, flags);
      G.save();
    },
    killAll: () => {
      const d = game.scene.getScene("Dungeon") as any;
      if (!d?.enemies) return 0;
      const n = d.enemies.length;
      for (const e of [...d.enemies]) d.damageEnemy(e, 999999, { label: "", fixed: true });
      return n;
    },
    shieldsDown: () => {
      const d = game.scene.getScene("Dungeon") as any;
      for (const e of d?.enemies ?? []) if (e.isBoss) e.shielded = false;
    },
    god: () => {
      G.s.hp = maxHp(G.s) * 100;
    },
    fullWonk: () => {
      const d = game.scene.getScene("Dungeon") as any;
      if (d?.player) d.player.wonk = 100;
    },
    state: () => G.s,
    beatup: (victim?: string) => (game.scene.getScene("Hub") as any)?.beatup?.start(victim),
    scene: (k: string) => game.scene.getScene(k),
    tp: (x: number, y: number) => {
      const h = game.scene.getScene("Hub") as any;
      h?.av?.setPosition(x, y);
      const d = game.scene.getScene("Dungeon") as any;
      if (d?.player && game.scene.isActive("Dungeon")) d.player.spr.setPosition(x, y);
    },
  };
  (window as any).__krel = api;
}
