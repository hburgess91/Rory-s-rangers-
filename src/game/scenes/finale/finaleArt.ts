import Phaser from "phaser";

/**
 * Art for the Krelford finale (THE CONCEPT OF PAEDOPHILIA), until it's merged into public/art/manifest.json
 * (see the scratchpad's finaleB_manifest.json). Everything is loaded only if it isn't there already, and every
 * user of it has a drawn fallback, so the finale still plays without the files.
 */
export const FINALE_IMAGES: Record<string, string> = {
  fb_dragon_side: "finale/fb_dragon_side.png",
  fb_wizard: "finale/fb_wizard.png",
  fb_wreck: "finale/fb_wreck.png",
  fb_logs: "finale/fb_logs.png",
  fb_goku_charge: "finale/fb_goku_charge.png",
  // the morning after: skinny Drongus in his pants (from the roof's skinny Drongus)
  fb_drongus_undies: "finale/fb_drongus_undies.png",
  // from the roof (part A): the same logs, bottle and syringe, so they match where they landed
  fr_logs: "props/fr_logs.png",
  fr_bottle: "props/fr_bottle.png",
  fr_syringe: "props/fr_syringe.png",
  fr_drongus_skinny: "combat/fr_drongus_skinny.png",
  c7_bottle_0: "props/c7_bottle_0.png",
};

/** The chat logs, the golden bottle and the syringe: the roof's art if it's there, else ours. */
export const logsKey = (s: Phaser.Scene) => (s.textures.exists("fr_logs") ? "fr_logs" : "fb_logs");
export const bottleKey = (s: Phaser.Scene) => (s.textures.exists("fr_bottle") ? "fr_bottle" : s.textures.exists("c7_bottle_0") ? "c7_bottle_0" : "fb_logs");
export const syringeKey = (s: Phaser.Scene) => (s.textures.exists("fr_syringe") ? "fr_syringe" : null);
export const FINALE_SHEETS: Record<string, { file: string; frameWidth: number; frameHeight: number }> = {
  fb_dragon_top: { file: "finale/fb_dragon_top.png", frameWidth: 256, frameHeight: 256 },
  /** its roar: jaw half open, then gaping (glowing throat) */
  fb_dragon_roar: { file: "finale/fb_dragon_roar.png", frameWidth: 256, frameHeight: 256 },
  fb_aura: { file: "finale/fb_aura.png", frameWidth: 96, frameHeight: 112 },
  fb_lightning: { file: "finale/fb_lightning.png", frameWidth: 96, frameHeight: 128 },
  fb_horror: { file: "finale/fb_horror.png", frameWidth: 48, frameHeight: 48 },
};

/** Queue whatever finale art isn't loaded yet (call from a scene's preload). */
export function finalePreload(scene: Phaser.Scene) {
  for (const [k, f] of Object.entries(FINALE_IMAGES)) if (!scene.textures.exists(k)) scene.load.image(k, `art/${f}`);
  for (const [k, d] of Object.entries(FINALE_SHEETS)) if (!scene.textures.exists(k)) scene.load.spritesheet(k, `art/${d.file}`, { frameWidth: d.frameWidth, frameHeight: d.frameHeight });
  // a missing file is fine: the finale draws its own stand-ins
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => undefined);
}

/** Animations, stand-ins for anything missing, and the monster's dialogue portrait. */
export function finaleReady(scene: Phaser.Scene) {
  const tex = scene.textures;
  const anims = scene.anims;
  if (tex.exists("fb_aura") && !anims.exists("fb_aura")) anims.create({ key: "fb_aura", frames: anims.generateFrameNumbers("fb_aura", { start: 0, end: 7 }), frameRate: 12, repeat: -1 });
  if (tex.exists("fb_lightning") && !anims.exists("fb_lightning")) anims.create({ key: "fb_lightning", frames: anims.generateFrameNumbers("fb_lightning", { start: 0, end: 7 }), frameRate: 16, repeat: 0 });
  if (tex.exists("fb_dragon_top") && !anims.exists("fb_dragon_top")) anims.create({ key: "fb_dragon_top", frames: anims.generateFrameNumbers("fb_dragon_top", { start: 0, end: tex.get("fb_dragon_top").frameTotal - 2 }), frameRate: 6, repeat: -1, yoyo: true });
  if (tex.exists("fb_horror") && !anims.exists("fb_horror")) anims.create({ key: "fb_horror", frames: anims.generateFrameNumbers("fb_horror", { start: 0, end: tex.get("fb_horror").frameTotal - 2 }), frameRate: 8, repeat: -1 });
  const g = scene.make.graphics({}, false);
  if (!tex.exists("fb_logs")) {
    g.clear().fillStyle(0x0b0b0b).fillRoundedRect(8, 12, 32, 24, 4).fillStyle(0x22c55e).fillRect(12, 16, 24, 4).fillRect(12, 24, 16, 3);
    g.generateTexture("fb_logs", 48, 48);
  }
  if (!tex.exists("fb_wreck")) {
    g.clear();
    for (let i = 0; i < 60; i++) g.fillStyle(i % 3 ? 0x1f1a24 : 0x3a2f3f).fillRect(20 + Math.random() * 200, 40 + Math.random() * 130, 14 + Math.random() * 30, 10 + Math.random() * 20);
    g.generateTexture("fb_wreck", 256, 192);
  }
  if (!tex.exists("fb_horror") && !tex.exists("fb_horror_g")) {
    // two frames (enemies cycle their sheet's frames)
    g.clear();
    for (const ox of [0, 48]) g.fillStyle(0x2a1640).fillCircle(ox + 24, 26 + ox / 48, 15).fillStyle(0xa855f7).fillCircle(ox + 19, 22, 3).fillCircle(ox + 29, 22, 3).fillStyle(0x84cc16).fillRect(ox + 14, 32, 20, 2);
    g.generateTexture("fb_horror_g", 96, 48);
    const t = tex.get("fb_horror_g");
    t.add(0, 0, 0, 0, 48, 48);
    t.add(1, 0, 48, 0, 48, 48);
  }
  g.destroy();
  // THE CONCEPT OF PAEDOPHILIA's portrait in the dialogue box: its head, from the side-on art
  const pk = "ptx_spr_TV_THE_CONCEPT_OF_PAEDOPHILIA";
  if (!tex.exists(pk) && tex.exists("fb_dragon_side")) {
    const src = tex.get("fb_dragon_side").getSourceImage() as HTMLImageElement;
    const c = tex.createCanvas(pk, 112, 112);
    if (c) {
      const ctx = c.getContext();
      ctx.fillStyle = "#14051f";
      ctx.fillRect(0, 0, 112, 112);
      ctx.imageSmoothingEnabled = false;
      // the head sits in the top left of the 384x288 picture
      ctx.drawImage(src, 50, 2, 112, 112, 0, 0, 112, 112);
      c.refresh();
      // the dialogue box finds a portrait by this name (and then uses the ptx_ one above)
      if (!tex.exists("spr_TV_THE_CONCEPT_OF_PAEDOPHILIA")) tex.createCanvas("spr_TV_THE_CONCEPT_OF_PAEDOPHILIA", 4, 4);
    }
  }
}

/** The key for a horror (the drawn one if the sheet's missing). */
export function horrorKey(scene: Phaser.Scene) {
  return scene.textures.exists("fb_horror") ? "fb_horror" : "fb_horror_g";
}
