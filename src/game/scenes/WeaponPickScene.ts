import Phaser from "phaser";
import { G } from "../G";
import { synth } from "../audio/Synth";
import { FONT } from "../ui/theme";
import { keysFor } from "../systems/keybinds";
import { ammoLabel, weaponIcon, weaponList, type WeaponEntry } from "../ui/weapons";

/**
 * Hold SWAP: the world drops into slow motion and you pick a weapon.
 * Click/tap one, or arrows/A-D + SPACE, or 1-9, or just let go of SWAP on the one you want.
 */
export class WeaponPickScene extends Phaser.Scene {
  private caller = "Dungeon";
  private list: WeaponEntry[] = [];
  private tiles: { box: Phaser.GameObjects.Rectangle; w: WeaponEntry }[] = [];
  private cur = 0;
  private done = false;
  private name!: Phaser.GameObjects.Text;

  constructor() {
    super("WeaponPick");
  }

  create(data: { caller?: string }) {
    this.caller = data?.caller ?? "Dungeon";
    this.done = false;
    this.tiles = [];
    const s = G.s;
    this.list = weaponList(s);
    this.cur = Math.max(0, this.list.findIndex((w) => w.id === (s.gun ?? null)));
    this.add.rectangle(480, 270, 960, 540, 0x05010c, 0.45).setInteractive().on("pointerdown", (_: unknown, __: unknown, ___: unknown, ev?: Phaser.Types.Input.EventData) => ev?.stopPropagation?.());
    this.add.text(480, 70, "CHOOSE YOUR WEAPON", { fontFamily: "Impact, sans-serif", fontSize: "38px", color: "#67e8f9", stroke: "#001018", strokeThickness: 7 }).setOrigin(0.5);
    this.add.text(480, 108, "(the world's slowed right down) · Tap one · or ←/→ and SPACE · or 1–9 · or let go of SWAP on it · ESC to cancel", { fontFamily: FONT, fontSize: "12px", color: "#cbd5e1" }).setOrigin(0.5);
    const perRow = Math.min(7, this.list.length);
    const rows = Math.ceil(this.list.length / perRow);
    const TW = 116;
    const TH = 112;
    this.list.forEach((w, i) => {
      const r = Math.floor(i / perRow);
      const inRow = r === rows - 1 ? this.list.length - r * perRow : perRow;
      const c = i - r * perRow;
      const x = 480 + (c - (inRow - 1) / 2) * (TW + 10);
      const y = 210 + r * (TH + 14) - (rows - 1) * 60;
      const box = this.add.rectangle(x, y, TW, TH, w.empty ? 0x1f1f2a : 0x101a2e, 0.95).setStrokeStyle(3, 0x334155).setInteractive({ useHandCursor: !w.empty });
      const icon = weaponIcon(this, x, y - 14, w, 64);
      if (w.empty) icon.setAlpha(0.35);
      this.add.text(x - TW / 2 + 6, y - TH / 2 + 4, String(i + 1), { fontFamily: FONT, fontSize: "11px", color: "#64748b", fontStyle: "bold" });
      this.add.text(x, y + 30, ammoLabel(w), { fontFamily: FONT, fontSize: "12px", color: w.empty ? "#ef4444" : "#facc15", fontStyle: "bold" }).setOrigin(0.5);
      if (w.id === (s.gun ?? null)) this.add.text(x, y + TH / 2 - 9, "IN HAND", { fontFamily: FONT, fontSize: "9px", color: "#67e8f9" }).setOrigin(0.5);
      box.on("pointerover", () => !w.empty && this.focus(i));
      box.on("pointerdown", () => !w.empty && this.pick(i));
      this.tiles.push({ box, w });
    });
    this.name = this.add.text(480, 470, "", { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#ffffff", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5);
    const cancel = this.add.text(900, 40, "✕", { fontFamily: FONT, fontSize: "26px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 8, y: 2 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cancel.on("pointerdown", () => this.close());
    this.focus(this.cur);
    const kb = this.input.keyboard!;
    const move = (d: number) => {
      for (let k = 1; k <= this.list.length; k++) {
        const n = (this.cur + d * k + this.list.length * 4) % this.list.length;
        if (!this.list[n].empty) return this.focus(n);
      }
    };
    kb.on("keydown-LEFT", () => move(-1));
    kb.on("keydown-A", () => move(-1));
    kb.on("keydown-RIGHT", () => move(1));
    kb.on("keydown-D", () => move(1));
    kb.on("keydown-UP", () => move(-perRow));
    kb.on("keydown-W", () => move(-perRow));
    kb.on("keydown-DOWN", () => move(perRow));
    kb.on("keydown-S", () => move(perRow));
    kb.on("keydown-SPACE", () => this.pick(this.cur));
    kb.on("keydown-ENTER", () => this.pick(this.cur));
    kb.on("keydown-E", () => this.pick(this.cur));
    kb.on("keydown-ESC", () => this.close());
    kb.on("keydown", (ev: KeyboardEvent) => {
      const n = Number(ev.key);
      if (n >= 1 && n <= 9 && this.list[n - 1] && !this.list[n - 1].empty) this.pick(n - 1);
    });
    // letting go of the swap key (held to open this) picks whatever's highlighted
    const names = keysFor("swap").map((k) => k.toUpperCase());
    kb.on("keyup", (ev: KeyboardEvent) => {
      const k = ev.key.toUpperCase();
      const code = ev.code.replace(/^Key/, "").toUpperCase();
      if (names.includes(k) || names.includes(code)) this.pick(this.cur);
    });
    synth.play("select");
  }

  private focus(i: number) {
    this.cur = i;
    this.tiles.forEach((t, k) => t.box.setStrokeStyle(k === i ? 4 : 3, k === i ? 0xfacc15 : 0x334155).setFillStyle(k === i ? 0x1e3a5f : t.w.empty ? 0x1f1f2a : 0x101a2e, 0.95));
    const w = this.list[i];
    this.name.setText(`${w.name}  ·  ${ammoLabel(w)}`);
    synth.play("select");
  }

  private pick(i: number) {
    if (this.done) return;
    const w = this.list[i];
    if (!w || w.empty) return;
    G.s.gun = w.id ?? undefined;
    synth.play("pickup");
    G.emit("weaponCard", {});
    this.close();
  }

  private close() {
    if (this.done) return;
    this.done = true;
    this.scene.get(this.caller)?.events.emit("weapon-picked");
    this.scene.stop();
  }
}
