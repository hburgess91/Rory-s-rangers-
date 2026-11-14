import Phaser from "phaser";
import type { GameState } from "../../data/types";
import { FART_BLASTER, GUN_POWER, GUNS, gunMax } from "../combat/Guns";
import { FONT } from "./theme";

export interface WeaponEntry {
  /** null = the Fart Blaster */
  id: string | null;
  name: string;
  tex: string | null;
  ammo: number;
  max: number;
  empty: boolean;
}

/** Everything you can swap to, strongest first, Fart Blaster last. */
export function weaponList(s: GameState): WeaponEntry[] {
  const out: WeaponEntry[] = [];
  for (const id of GUN_POWER) {
    if (!s.guns || !(id in s.guns)) continue;
    const g = GUNS[id];
    const ammo = s.guns[id] ?? 0;
    out.push({ id, name: g.name, tex: g.tex, ammo, max: gunMax(g, s), empty: ammo <= 0 });
  }
  out.push({ id: null, name: FART_BLASTER.name, tex: null, ammo: Infinity, max: Infinity, empty: false });
  return out;
}

export function ammoLabel(w: WeaponEntry) {
  return w.id === null ? "∞" : w.empty ? "EMPTY" : `${w.ammo}/${w.max}`;
}

/** A weapon icon fitted into a box (the Fart Blaster gets a cloud). */
export function weaponIcon(scene: Phaser.Scene, x: number, y: number, w: WeaponEntry, box: number) {
  if (w.tex && scene.textures.exists(w.tex)) {
    const img = scene.add.image(x, y, w.tex);
    const f = img.frame;
    const k = box / Math.max(f.width, f.height);
    img.setScale(k);
    return img;
  }
  return scene.add.text(x, y, "💨", { fontFamily: FONT, fontSize: `${Math.round(box * 0.6)}px` }).setOrigin(0.5);
}
