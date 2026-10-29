import Phaser from "phaser";
import { generateAll } from "../gfx/Textures";
import { CHARACTERS } from "../../data/characters";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Photo-derived pixel portraits. Missing files fall back to generated portraits.
    for (const def of Object.values(CHARACTERS)) {
      if (def.portrait && def.portrait.startsWith("pt_")) {
        this.load.image(def.portrait, `portraits/${def.portrait.slice(3)}.png`);
      }
    }
    const t = this.add.text(480, 270, "LOADING LORE…", { fontFamily: "monospace", fontSize: "20px", color: "#ffd23f" }).setOrigin(0.5);
    this.load.on("progress", (p: number) => t.setText(`LOADING LORE… ${Math.round(p * 100)}%`));
    this.load.on("loaderror", () => undefined);
  }

  create() {
    for (const tex of Object.keys(this.textures.list)) {
      if (tex.startsWith("pt_")) this.textures.get(tex).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    generateAll(this);
    this.scene.start("Title");
  }
}
