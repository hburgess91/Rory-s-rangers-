import Phaser from "phaser";
import { generateAll } from "../gfx/Textures";
import { CHARACTERS } from "../../data/characters";
import { fitTall, heightId, isHeightKey } from "../../data/heights";
import { installHdScale, type ArtManifest } from "../gfx/HD";
import { WONK_ART } from "../gfx/Censor";
import { loadVfx, makeVfxAnims, type VfxDef } from "../gfx/Vfx";

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
      // the published build bakes small pictures straight into the manifest (data: URLs) to keep the file count down
      const src = (f: string) => (f.startsWith("data:") ? f : `art/${f}`);
      for (const [key, c] of Object.entries(m.chars ?? {})) this.load.spritesheet(key, src(c.file), { frameWidth: c.frame, frameHeight: c.frame });
      for (const [key, im] of Object.entries(m.images ?? {})) this.load.image(key, src(im.file));
      for (const [key, sh] of Object.entries(m.sheets ?? {})) this.load.spritesheet(key, src(sh.file), { frameWidth: sh.frameWidth, frameHeight: sh.frameHeight });
      loadVfx(this.load, (m as unknown as { vfx?: Record<string, VfxDef> }).vfx, src);
    });
    const t = this.add.text(480, 270, "LOADING LORE…", { fontFamily: "monospace", fontSize: "20px", color: "#ffd23f" }).setOrigin(0.5);
    this.load.on("progress", (p: number) => t.setText(`LOADING LORE… ${Math.round(p * 100)}%`));
    this.load.on("loaderror", () => undefined);
  }

  /** Feet-to-crown height, in texture pixels, of a sheet's idle south frame (0 when it can't be read). */
  private artHeight(key: string): number {
    try {
      const fr = this.textures.get(key).get(0);
      const c = document.createElement("canvas");
      c.width = fr.cutWidth;
      c.height = fr.cutHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return 0;
      ctx.drawImage(fr.source.image as CanvasImageSource, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fr.cutWidth, fr.cutHeight);
      const a = ctx.getImageData(0, 0, c.width, c.height).data;
      let top = -1;
      let bot = -1;
      for (let y = 0; y < c.height; y++) {
        let n = 0;
        for (let x = 0; x < c.width; x++) if (a[(y * c.width + x) * 4 + 3] > 40) n++;
        // ignore a stray pixel or two (a hair tip, a sparkle)
        if (n >= 3) {
          if (top < 0) top = y;
          bot = y;
        }
      }
      return top < 0 ? 0 : bot - top + 1;
    } catch {
      return 0;
    }
  }

  create() {
    // Opened straight from a downloaded file: the browser won't let the page load its art and music,
    // so everything falls back to the old placeholder graphics. Say so, rather than just looking broken.
    if (location.protocol === "file:" && !this.textures.exists("bld_TOWN_HALL")) {
      const msg = "OFFLINE COPY: your browser blocks the art and music when the game is opened as a file.\nTo fix it, open Terminal in the unzipped folder and run:  python3 -m http.server 8000\nthen go to http://localhost:8000 in your browser. (Or just play the online link.)";
      const el = document.createElement("div");
      el.textContent = msg;
      el.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99;background:#7f1d1d;color:#fff;font:13px/1.4 monospace;padding:8px 12px;white-space:pre-wrap";
      document.body.appendChild(el);
      el.addEventListener("click", () => el.remove());
    }
    installHdScale();
    const m = this.cache.json.get("artmanifest") as ArtManifest | undefined;
    // Heights (data/heights.ts): each lad's idle frame is measured and scaled to his real height. A SUPER_ form
    // and the San brothers' own sheets use their base lad's scale, so transforming never changes his size.
    const talls: Record<string, number> = {};
    const tallFor = (key: string): number => {
      if (!isHeightKey(key)) return 1;
      const base = `spr_${heightId(key.slice(4))}`;
      const src = this.textures.exists(base) ? base : key;
      return (talls[src] ??= fitTall(src.slice(4), this.artHeight(src)));
    };
    for (const [key, c] of Object.entries(m?.chars ?? {})) {
      if (!this.textures.exists(key)) continue;
      const tex = this.textures.get(key);
      // old character code uses setScale(2) for 16x24 sprites; draw the new sheets at native size there.
      // `tall` is folded into hd so every setScale draws him at his height, and HD.ts moves the origin so he
      // grows from his feet
      const tall = tallFor(key);
      // a wonk row added to a sheet the manifest doesn't list one for (Polson)
      const wa = WONK_ART[key];
      if (wa && !c.wonk && tex.frameTotal - 1 > Math.max(...wa.frames)) c.wonk = { south: wa.frames };
      tex.customData = { ...tex.customData, hd: 0.5 * tall, tall, char: c };
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
    makeVfxAnims(this);
    this.scene.start("Enter");
  }
}
