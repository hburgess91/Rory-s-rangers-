import Phaser from "phaser";
import { backdrop } from "../gfx/HD";
import { CHARACTERS, PLAYABLE_ORDER } from "../../data/characters";
import type { PlayableId } from "../../data/types";
import { button, FONT, hexStr, label, title, UI } from "../ui/theme";
import { startNewRun, switchTo } from "../Flow";
import { portraitKey } from "../gfx/Textures";
import { synth } from "../audio/Synth";
import { G } from "../G";
import { maxHp } from "../systems/stats";

const COLS = 4;

export class CharSelectScene extends Phaser.Scene {
  private sel = 0;
  private ngPlus = 0;
  /** After Benn leaves for Wahooga: pick who carries on the same run. */
  private swap = false;
  private detail!: Phaser.GameObjects.Container;
  private cards: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super("CharSelect");
  }

  init(data: { ngPlus?: number; swap?: boolean }) {
    this.ngPlus = data?.ngPlus ?? 0;
    this.swap = !!data?.swap;
    this.sel = 0;
    this.cards = [];
  }

  create() {
    const { width: W, height: H } = this.scale;
    const csBg = this.add.rectangle(0, 0, W, H, 0x10101e).setOrigin(0);
    if (backdrop(this, "bg_charselect", { dim: 0.45, depth: -10 })) csBg.setVisible(false);
    title(this, W / 2, 30, this.swap ? "KREBON HAS GONE TO WAHOOGA · WHO CARRIES ON?" : this.ngPlus ? "NEW KREZ+ · CHOOSE YOUR DEGENERATE" : "CHOOSE YOUR DEGENERATE", 26);
    label(this, W / 2, 52, this.swap ? `Your progress, your Krezzcoin and your ${G.s.flags.rock_points ?? 0} rockstar points carry over.` : "Whoever you pick, Proctus Krelmor will cover their ministry. Badly.", 13, "#9aa0b4").setOrigin(0.5, 0);

    PLAYABLE_ORDER.forEach((id, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = 18 + col * 116;
      const y = 76 + row * 148;
      const def = CHARACTERS[id];
      const done = G.meta.completedWith.includes(id);
      const gone = this.swap && id === "KREBON";
      const card = this.add.rectangle(x, y, 110, 140, gone ? 0x0e0f18 : 0x1b1e33).setOrigin(0).setStrokeStyle(2, def.color).setInteractive({ useHandCursor: true });
      const pk = portraitKey(this, id);
      if (pk) this.add.image(x + 55, y + 42, pk).setDisplaySize(64, 64);
      this.add.sprite(x + 92, y + 82, `spr_${id}`, 0).setScale(1.2);
      this.add.text(x + 55, y + 96, def.name, { fontFamily: FONT, fontSize: "11px", color: hexStr(def.color), fontStyle: "bold", align: "center", wordWrap: { width: 104 } }).setOrigin(0.5, 0);
      this.add.text(x + 55, y + 124, def.realName ?? "", { fontFamily: FONT, fontSize: "9px", color: "#8a8fa0" }).setOrigin(0.5, 0);
      if (done) this.add.text(x + 4, y + 3, "✓", { fontFamily: FONT, fontSize: "11px", color: "#5ad35a" });
      card.on("pointerover", () => this.select(i));
      card.on("pointerdown", () => this.select(i));
      this.cards.push(card);
    });

    this.detail = this.add.container(0, 0);
    this.select(0);

    const kb = this.input.keyboard!;
    const N = PLAYABLE_ORDER.length;
    kb.on("keydown-LEFT", () => this.select((this.sel + N - 1) % N));
    kb.on("keydown-RIGHT", () => this.select((this.sel + 1) % N));
    kb.on("keydown-UP", () => this.select((this.sel + N - COLS) % N));
    kb.on("keydown-DOWN", () => this.select((this.sel + COLS) % N));
    kb.on("keydown-A", () => this.select((this.sel + 8) % 9));
    kb.on("keydown-D", () => this.select((this.sel + 1) % 9));
    kb.on("keydown-W", () => this.select((this.sel + 6) % 9));
    kb.on("keydown-S", () => this.select((this.sel + 3) % 9));
    kb.on("keydown-ENTER", () => this.confirm());
    kb.on("keydown-ESC", () => switchTo(this, "Title"));
    button(this, 120, H - 26, "◀ BACK", () => switchTo(this, "Title"), { w: 140, h: 32, size: 14 });
  }

  private select(i: number) {
    if (i !== this.sel) synth.play("select");
    this.sel = i;
    this.cards.forEach((c, j) => c.setFillStyle(j === i ? 0x2d3360 : 0x1b1e33));
    const id = PLAYABLE_ORDER[i];
    const d = CHARACTERS[id];
    this.detail.removeAll(true);
    const X = 488;
    const add = (o: Phaser.GameObjects.GameObject) => this.detail.add(o);
    add(this.add.rectangle(X, 76, 456, 420, UI.panel).setOrigin(0).setStrokeStyle(2, d.color));
    add(this.add.text(X + 16, 88, d.name, { fontFamily: FONT, fontSize: "24px", color: hexStr(d.color), fontStyle: "bold" }));
    add(this.add.text(X + 16, 118, d.aka ?? "", { fontFamily: FONT, fontSize: "11px", color: "#9aa0b4", wordWrap: { width: 420 } }));
    add(this.add.text(X + 16, 146, d.combatBlurb ?? "", { fontFamily: FONT, fontSize: "14px", color: "#ffffff", wordWrap: { width: 420 } }));
    const bars: [string, number, number][] = [
      ["HEALTH", d.maxHp ?? 100, 160],
      ["SPEED", d.speed ?? 200, 230],
      ["DAMAGE", (d.damage ?? 10) * (1000 / (d.attackRate ?? 300)), 70],
      ["RANGE", d.range ?? 50, 340],
    ];
    bars.forEach(([n, v, max], j) => {
      const y = 196 + j * 18;
      add(this.add.text(X + 16, y, n, { fontFamily: FONT, fontSize: "11px", color: "#9aa0b4" }));
      add(this.add.rectangle(X + 90, y + 3, 200, 9, 0x2a2d48).setOrigin(0));
      add(this.add.rectangle(X + 90, y + 3, 200 * Math.min(1, v / max), 9, d.color).setOrigin(0));
    });
    add(this.add.text(X + 16, 274, `SIGNATURE · ${d.signature?.name}`, { fontFamily: FONT, fontSize: "14px", color: "#ffd23f", fontStyle: "bold" }));
    add(this.add.text(X + 16, 292, d.signature?.desc ?? "", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", wordWrap: { width: 420 } }));
    add(this.add.text(X + 16, 330, `PASSIVE · ${d.passive?.name}`, { fontFamily: FONT, fontSize: "14px", color: "#c084fc", fontStyle: "bold" }));
    add(this.add.text(X + 16, 348, d.passive?.desc ?? "", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", wordWrap: { width: 420 } }));
    add(this.add.text(X + 16, 388, `If unselected: ${d.ministry}`, { fontFamily: FONT, fontSize: "12px", color: "#9aa0b4", wordWrap: { width: 420 } }));
    add(this.add.text(X + 16, 406, `Proctus covers as: ${d.proctusTitle}. ${d.proctusQuirk}`, { fontFamily: FONT, fontSize: "11px", color: "#9aa0a6", fontStyle: "italic", wordWrap: { width: 420 } }));
    add(this.add.text(X + 16, 434, `"${d.selectQuote}"`, { fontFamily: FONT, fontSize: "15px", color: "#ff6fa8", fontStyle: "italic" }));
    const away = this.swap && id === "KREBON";
    add(button(this, X + 340, 474, away ? "GONE TO WAHOOGA" : this.swap ? "CARRY ON AS " + d.name.split(" ")[0] : "PLAY AS " + d.name.split(" ")[0], () => this.confirm(), { w: 220, h: 34, size: 13, disabled: away }));
  }

  private confirm() {
    synth.unlock();
    synth.play("pop");
    if (this.swap) {
      const id = PLAYABLE_ORDER[this.sel] as PlayableId;
      if (id === "KREBON") return;
      const s = G.s;
      s.player = id;
      s.flags.krebon_gone = true;
      s.hp = maxHp(s);
      G.save();
      switchTo(this, "Hub", { at: "PORTAL", from: "swap" });
      return;
    }
    startNewRun(this, PLAYABLE_ORDER[this.sel] as PlayableId, this.ngPlus);
  }
}
