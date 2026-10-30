import Phaser from "phaser";
import { generateAll } from "../gfx/Textures";
import { CHARACTERS } from "../../data/characters";
import { installHdScale, type ArtManifest } from "../gfx/HD";

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
    // PixelLab art (public/art). Loaded under the old texture keys, so it replaces the procedural art.
    this.load.json("artmanifest", "art/manifest.json");
    this.load.on("filecomplete-json-artmanifest", (_k: string, _t: string, m: ArtManifest) => {
      for (const [key, c] of Object.entries(m.chars ?? {})) this.load.spritesheet(key, `art/${c.file}`, { frameWidth: c.frame, frameHeight: c.frame });
      for (const [key, im] of Object.entries(m.images ?? {})) this.load.image(key, `art/${im.file}`);
      for (const [key, sh] of Object.entries(m.sheets ?? {})) this.load.spritesheet(key, `art/${sh.file}`, { frameWidth: sh.frameWidth, frameHeight: sh.frameHeight });
    });
    const t = this.add.text(480, 270, "LOADING LORE…", { fontFamily: "monospace", fontSize: "20px", color: "#ffd23f" }).setOrigin(0.5);
    this.load.on("progress", (p: number) => t.setText(`LOADING LORE… ${Math.round(p * 100)}%`));
    this.load.on("loaderror", () => undefined);
  }

  create() {
    installHdScale();
    const m = this.cache.json.get("artmanifest") as ArtManifest | undefined;
    for (const [key, c] of Object.entries(m?.chars ?? {})) {
      if (!this.textures.exists(key)) continue;
      const tex = this.textures.get(key);
      // old character code uses setScale(2) for 16x24 sprites; draw the new sheets at native size there
      tex.customData = { ...tex.customData, hd: 0.5, char: c };
    }
    for (const [key, im] of Object.entries({ ...(m?.images ?? {}), ...(m?.sheets ?? {}) })) {
      if (im.hd && this.textures.exists(key)) {
        const tex = this.textures.get(key);
        tex.customData = { ...tex.customData, hd: im.hd };
      }
    }
    for (const tex of Object.keys(this.textures.list)) {
      if (tex.startsWith("pt_")) this.textures.get(tex).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    generateAll(this);
    this.scene.start("Title");
  }
}
