import Phaser from "phaser";
import { animateWalker, backdrop } from "../gfx/HD";
import { G } from "../G";
import { button, FONT, title, label } from "../ui/theme";
import { synth } from "../audio/Synth";
import { continueRun, switchTo } from "../Flow";
import { PLAYABLE_ORDER } from "../../data/characters";

const LEAK = ["[citation needed]", "Seen by 9", "Hello?", "KREZZ", "Drongi", "WONK", "pls", "Krebon is coming", "lore withdrawn", "THE KREZZING HOUR", "Krez-ousers", "purple", "Big Bertha", "12 Midday", "cheesegate"];

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.fadeIn(400);
    // sky
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a0f2e, 0x1a0f2e, 0x3a1f3e, 0x2a1a2e, 1);
    g.fillRect(0, 0, W, H);
    const titleBg = backdrop(this, "bg_title", { depth: -10 });
    if (titleBg) g.setVisible(false);
    // skyline
    g.fillStyle(0x120a1c, 1);
    for (let i = 0; i < 24; i++) {
      const bw = 30 + ((i * 37) % 50);
      const bh = 60 + ((i * 53) % 120);
      g.fillRect(i * 42 - 10, H - 90 - bh, bw, bh + 90);
    }
    g.fillStyle(0x0b0710, 1);
    g.fillRect(0, H - 90, W, 90);
    // The Tap silhouette
    this.add.image(W / 2, H - 120, "p_tap").setScale(2.2).setAlpha(0.9);
    // leaking wiki text
    for (let i = 0; i < 26; i++) {
      const t = this.add.text(Math.random() * W, Math.random() * H, LEAK[i % LEAK.length], { fontFamily: FONT, fontSize: `${10 + (i % 4) * 3}px`, color: "#8a7fb0" }).setAlpha(0.35);
      this.tweens.add({ targets: t, y: t.y + H, duration: 9000 + Math.random() * 9000, repeat: -1, onRepeat: () => (t.y = -20) });
    }
    // marching cabinet
    PLAYABLE_ORDER.forEach((id, i) => {
      const s = this.add.sprite(-40 - i * 40, H - 70, `spr_${id}`, 0).setScale(2.5);
      this.tweens.add({ targets: s, x: W + 60, duration: 16000, delay: i * 500, repeat: -1 });
      this.time.addEvent({ delay: 180, loop: true, callback: () => animateWalker(s, 1, 0, true, this.time.now) });
    });
    const dr = this.add.sprite(W - 120, 150, "spr_DRONGUS", 0).setScale(3).setAlpha(0.85);
    this.tweens.add({ targets: dr, y: 140, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.inOut" });
    this.add.text(W - 120, 92, "Seen by 9", { fontFamily: FONT, fontSize: "13px", color: "#9aa0b4" }).setOrigin(0.5);

    title(this, W / 2, 86, "KRELWORLD", 64, "#ffd23f");
    title(this, W / 2, 140, "WONK 'TIL YOU KREZ", 26, "#ff6fa8");
    label(this, W / 2, 168, "A group chat that accidentally became a country", 13, "#c9c3e6").setOrigin(0.5, 0);

    const has = G.saves.hasSave();
    const items: [string, () => void, boolean?][] = [];
    if (has) items.push(["CONTINUE", () => continueRun(this) || undefined]);
    items.push(["NEW GAME", () => switchTo(this, "CharSelect", { ngPlus: 0 })]);
    if (G.meta.ngPlusUnlocked) items.push(["NEW KREZ+", () => switchTo(this, "CharSelect", { ngPlus: 1 })]);
    items.push(["KRELWORLD MEDIA ARCHIVE (TV)", () => switchTo(this, "TV", { fromTitle: true })]);
    items.push(["HISTORICAL ARCHIVE", () => switchTo(this, "Archive", { fromTitle: true })]);
    items.push(["SETTINGS", () => this.scene.launch("Menu", { mode: "settings", caller: "Title" })]);
    items.forEach(([t, fn], i) => button(this, W / 2, 222 + i * 46, t, fn, { w: 320 }));

    label(this, 12, H - 22, "WASD · Mouse · Click · Space · E · Q · B · R · Esc", 11, "#6d6a85");
    label(this, W - 12, H - 22, "v1.0 · No reactions were harmed", 11, "#6d6a85").setOrigin(1, 0);

    this.input.once("pointerdown", () => synth.unlock());
    this.input.keyboard?.once("keydown", () => synth.unlock());
    synth.music("title");
  }
}
