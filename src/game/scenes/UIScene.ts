import { currentGun, ownedGuns } from "../combat/Guns";
import { fartLevel, fartMeter } from "../combat/Farts";
import Phaser from "phaser";
import { G } from "../G";
import { maxHp, maxKrezz, maxBottles, intoxLabel } from "../systems/stats";
import { FONT, UI } from "../ui/theme";
import { portraitKey } from "../gfx/Textures";
import { CHARACTERS } from "../../data/characters";
import { currentStep } from "../Flow";
import { resentmentLabel } from "../systems/reactions";
import { synth } from "../audio/Synth";
import { TouchControls, isTouchDevice } from "../ui/TouchControls";

interface Toast {
  c: Phaser.GameObjects.Container;
  until: number;
}

export class UIScene extends Phaser.Scene {
  private mode: "hub" | "dungeon" = "hub";
  private g!: Phaser.GameObjects.Graphics;
  private nameT!: Phaser.GameObjects.Text;
  private statT!: Phaser.GameObjects.Text;
  private fartT!: Phaser.GameObjects.Text;
  private wonkChip!: Phaser.GameObjects.Text;
  private fartChip!: Phaser.GameObjects.Text;
  private roomT!: Phaser.GameObjects.Text;
  private objT!: Phaser.GameObjects.Text;
  private ruleT!: Phaser.GameObjects.Text;
  private bossT!: Phaser.GameObjects.Text;
  private wonkT!: Phaser.GameObjects.Text;
  private hpT!: Phaser.GameObjects.Text;
  private kzT!: Phaser.GameObjects.Text;
  private timerT!: Phaser.GameObjects.Text;
  private toasts: Toast[] = [];
  private boss: { name: string; hp: number; max: number; shielded: boolean } | null = null;
  private rule: string | null = null;
  private conflictUntil = 0;
  private rename: string | null = null;
  private renameUntil = 0;
  private off: (() => void) | null = null;
  private labels = ["HP", "KREZZ", "WONK"];
  private touch: TouchControls | null = null;

  constructor() {
    super("UI");
  }

  create(data: { mode?: "hub" | "dungeon" }) {
    this.mode = data?.mode ?? "hub";
    this.toasts = [];
    this.boss = null;
    this.rule = null;
    this.g = this.add.graphics();
    const pk = portraitKey(this, G.s.player);
    if (pk) this.add.image(34, 34, pk).setDisplaySize(52, 52);
    this.add.rectangle(34, 34, 54, 54).setStrokeStyle(2, CHARACTERS[G.s.player].color);
    this.nameT = this.add.text(68, 6, "", { fontFamily: FONT, fontSize: "13px", color: "#ffd23f", fontStyle: "bold" }).setShadow(1, 1, "#000", 0);
    this.statT = this.add.text(12, 66, "", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", lineSpacing: 2 }).setShadow(1, 1, "#000", 0);
    this.roomT = this.add.text(455, 6, "", { fontFamily: FONT, fontSize: "12px", color: "#c9c3e6" }).setOrigin(0.5, 0).setShadow(1, 1, "#000", 0);
    this.objT = this.add.text(455, 22, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 6, y: 2 }, wordWrap: { width: 360 }, align: "center" }).setOrigin(0.5, 0);
    this.ruleT = this.add.text(480, 70, "", { fontFamily: FONT, fontSize: "12px", color: "#ff8888", fontStyle: "bold", align: "center" }).setOrigin(0.5, 0).setShadow(1, 1, "#000", 0);
    this.bossT = this.add.text(480, 494, "", { fontFamily: FONT, fontSize: "14px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setShadow(2, 2, "#000", 0);
    this.hpT = this.add.text(70, 22, "", { fontFamily: FONT, fontSize: "10px", color: "#ffffff", fontStyle: "bold" }).setDepth(5).setShadow(1, 1, "#000", 0);
    this.kzT = this.add.text(70, 37, "", { fontFamily: FONT, fontSize: "10px", color: "#ffffff", fontStyle: "bold" }).setDepth(5).setShadow(1, 1, "#000", 0);
    this.wonkT = this.add.text(70, 52, "", { fontFamily: FONT, fontSize: "10px", color: "#ffffff", fontStyle: "bold" }).setShadow(1, 1, "#000", 0);
    this.fartT = this.add.text(70, 68, "", { fontFamily: FONT, fontSize: "10px", color: "#ffffff", fontStyle: "bold" }).setShadow(1, 1, "#000", 0);
    this.wonkChip = this.add.text(262, 52, "", { fontFamily: FONT, fontSize: "10px", color: "#111111", fontStyle: "bold", backgroundColor: "#ffd23f", padding: { x: 5, y: 1 } }).setVisible(false);
    this.fartChip = this.add.text(262, 68, "", { fontFamily: FONT, fontSize: "10px", color: "#ffffff", fontStyle: "bold", backgroundColor: "#3f6212", padding: { x: 5, y: 1 } }).setVisible(false);
    this.timerT = this.add.text(480, 96, "", { fontFamily: FONT, fontSize: "22px", color: "#ff4d4d", fontStyle: "bold", backgroundColor: "#000000aa", padding: { x: 8, y: 3 } }).setOrigin(0.5, 0).setDepth(50).setVisible(false);
    this.off = G.on((ev, d) => this.onEvent(ev, d));
    this.events.off("mode");
    this.events.on("mode", (m: "hub" | "dungeon") => {
      this.mode = m;
      this.setupTouch();
    });
    this.setupTouch();
    this.events.once("shutdown", () => {
      this.touch?.destroy();
      this.touch = null;
    });
    this.events.once("shutdown", () => this.off?.());
  }

  private setupTouch() {
    if (!isTouchDevice(this.game)) return;
    this.touch?.destroy();
    this.touch = new TouchControls(this, this.mode === "dungeon");
  }

  private onEvent(ev: string, d: any) {
    switch (ev) {
      case "toast":
        this.pushToast(d.title, d.text, false);
        break;
      case "ping":
        this.pushToast(CHARACTERS[d.from]?.name ?? d.from, d.text, true, d.from);
        synth.play("notify");
        break;
      case "boss":
        this.boss = d;
        break;
      case "rule":
        this.rule = d;
        break;
      case "room":
        this.roomT.setText(d.name);
        break;
      case "conflict":
        this.conflictUntil = this.time.now + d;
        break;
      case "timer":
        if (d == null) this.timerT.setVisible(false);
        else {
          const sec = Math.max(0, Math.ceil(d));
          this.timerT.setVisible(true).setText(`✈ KR-069 IMPACT IN ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`);
          this.timerT.setColor(sec <= 30 && sec % 2 ? "#ffffff" : "#ff4d4d");
        }
        break;
      case "rename":
        this.rename = d;
        this.renameUntil = this.time.now + 5000;
        break;
    }
  }

  private pushToast(title: string, text: string, messenger: boolean, from?: string) {
    const w = 300;
    const c = this.add.container(960 - w - 10, 0).setDepth(100);
    const body = this.add.text(messenger ? 46 : 10, 24, text, { fontFamily: FONT, fontSize: "12px", color: messenger ? "#050505" : "#ffffff", wordWrap: { width: w - (messenger ? 56 : 20), useAdvancedWrap: true } });
    const h = Math.max(48, body.height + 32);
    const bg = this.add.rectangle(0, 0, w, h, messenger ? 0xffffff : UI.panel, 0.96).setOrigin(0).setStrokeStyle(2, messenger ? UI.messenger : UI.accent);
    const tt = this.add.text(messenger ? 46 : 10, 6, title, { fontFamily: FONT, fontSize: "11px", color: messenger ? "#0084ff" : "#ffd23f", fontStyle: "bold" });
    c.add([bg, tt, body]);
    if (messenger && from) {
      const pk = portraitKey(this, from);
      if (pk) c.add(this.add.image(24, h / 2, pk).setDisplaySize(30, 30));
    }
    c.setData("h", h);
    let y0 = 8;
    for (const t of this.toasts) y0 += (t.c.getData("h") as number) + 6;
    c.y = y0;
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 150 });
    this.toasts.push({ c, until: this.time.now + (messenger ? 5200 : 4200) });
    if (this.toasts.length > 5) {
      const t = this.toasts.shift()!;
      t.c.destroy();
    }
  }

  update(time: number) {
    const s = G.s;
    const g = this.g;
    g.clear();
    const mh = maxHp(s);
    const confl = time < this.conflictUntil;
    const labels = confl ? ["WONK", "HP", "KREZZ"] : this.labels;
    // bars
    const bar = (y: number, frac: number, col: number, label: string, text: string) => {
      g.fillStyle(0x000000, 0.65);
      g.fillRect(66, y, 190, 12);
      g.fillStyle(col, 1);
      g.fillRect(67, y + 1, 188 * Phaser.Math.Clamp(frac, 0, 1), 10);
      g.lineStyle(1, 0xffffff, 0.3);
      g.strokeRect(66, y, 190, 12);
      return `${label} ${text}`;
    };
    const hpS = bar(22, s.hp / mh, UI.hp, labels[0], `${Math.ceil(s.hp)}/${mh}`);
    const kzS = bar(37, s.krezz / maxKrezz(s), UI.krezz, labels[1], `${Math.floor(s.krezz)}`);
    let wonk = 0;
    const dun = this.scene.get("Dungeon") as any;
    if (this.mode === "dungeon" && dun?.player) wonk = dun.player.wonk;
    if (this.mode === "dungeon") {
      const full = wonk >= 100;
      const fm = fartMeter();
      const lv = fartLevel();
      const flash = Math.floor(time / 160) % 2 === 0;
      // a solid panel so the specials never get lost in the scenery
      g.fillStyle(0x0b0614, 0.82);
      g.fillRoundedRect(62, 49, 300, 34, 6);
      g.lineStyle(1, 0xffffff, 0.25);
      g.strokeRoundedRect(62, 49, 300, 34, 6);
      // WONK
      g.fillStyle(0x000000, 0.8);
      g.fillRect(66, 52, 190, 13);
      g.fillStyle(full ? (flash ? 0xffd23f : 0xff8c00) : UI.wonk, 1);
      g.fillRect(67, 53, 188 * Math.min(1, wonk / 100), 11);
      g.lineStyle(full ? 2 : 1, full ? 0xffd23f : 0xffffff, full ? 1 : 0.35);
      g.strokeRect(66, 52, 190, 13);
      this.wonkT.setText(full ? `${labels[2]} FULL!` : `${labels[2]} ${Math.floor(wonk)}%`).setColor(full ? "#1a0b00" : "#ffffff").setShadow(1, 1, full ? "#ffe9a8" : "#000", 0).setPosition(70, 52).setVisible(true);
      // FART: four potency segments
      const fx = 66;
      g.fillStyle(0x000000, 0.8);
      g.fillRect(fx, 68, 190, 13);
      for (let i = 0; i < 4; i++) {
        const fill = Phaser.Math.Clamp((fm - i * 25) / 25, 0, 1);
        const col = [0xc5e1a5, 0x9ccc65, 0x7cb342, 0xd4ff3a][i];
        g.fillStyle(lv === 4 ? (flash ? 0xd4ff3a : 0xa3e635) : col, 1);
        g.fillRect(fx + 1 + i * 47.25, 69, 46.25 * fill, 11);
      }
      g.lineStyle(1, 0x000000, 1);
      for (let i = 1; i < 4; i++) g.lineBetween(fx + i * 47.5, 68, fx + i * 47.5, 81);
      g.lineStyle(lv === 4 ? 2 : 1, lv === 4 ? 0xd4ff3a : 0xffffff, lv === 4 ? 1 : 0.35);
      g.strokeRect(fx, 68, 190, 13);
      const fn = ["FART", "FART · FAIRY", "FART · BAKED BEANS", "FART · CABBAGE", "FART · IBS ATTACK!"][lv];
      this.fartT.setText(`💨 ${fn}`).setColor(lv === 4 ? "#0f1a05" : lv ? "#ffffff" : "#c5e1a5").setShadow(1, 1, lv === 4 ? "#f0ffb0" : "#000", 0).setPosition(70, 68).setVisible(true);
      // "press this" chips
      const touch = !!this.touch && isTouchDevice(this.game);
      this.wonkChip.setText(touch ? "TAP WONK" : "PRESS R").setVisible(full).setAlpha(flash ? 1 : 0.75);
      this.fartChip.setText(touch ? "TAP 💨" : "PRESS G").setVisible(lv >= 1).setBackgroundColor(lv === 4 ? (flash ? "#d4ff3a" : "#7cb342") : "#3f6212").setColor(lv === 4 ? "#111" : "#fff");
      this.touch?.glow("burst", full, time);
      this.touch?.glow("fart", lv === 4, time);
      this.statT.setY(88);
    } else {
      this.wonkT.setVisible(false);
      this.fartT.setVisible(false);
      this.wonkChip?.setVisible(false);
      this.fartChip?.setVisible(false);
      this.statT.setY(66);
    }
    const nm = time < this.renameUntil && this.rename ? this.rename : CHARACTERS[s.player].name;
    this.nameT.setText(nm);
    this.hpT.setText(hpS);
    this.kzT.setText(kzS);
    this.statT.setText(
      [
        `💰 ${s.coins} Krezzcoin   🍼 ${s.bottles}/${maxBottles(s)} (Q)   🍺 ${s.bongos} (B)${s.flags.rock_points ? `   🤘 ${s.flags.rock_points}` : ""}`,
        ...(ownedGuns(s).length
          ? [currentGun(s) ? `🔫 ${currentGun(s)!.name} ${s.guns![s.gun!]}/${currentGun(s)!.maxAmmo}  (X swap)` : `🔫 ${CHARACTERS[s.player].attack === "melee" ? "Fists" : "Own weapon"} · ${ownedGuns(s).length} gun${ownedGuns(s).length > 1 ? "s" : ""}  (X swap)`]
          : []),
        `${intoxLabel(s.intoxication)}${s.intoxication > 5 ? ` (${Math.round(s.intoxication)}%)` : ""}  ·  Drongus: ${resentmentLabel(s.drongusResentment)}`,
      ].join("\n"),
    );
    // objective
    if (this.mode === "hub") {
      const st = currentStep();
      this.objT.setText(st ? `OBJECTIVE: ${st.text}` : "").setVisible(!!st);
      this.roomT.setText(`CHAPTER ${s.chapter} · KRELFORD`);
    } else this.objT.setVisible(false);
    // ban risk
    if (this.rule || s.banRisk > 0) {
      g.fillStyle(0x000000, 0.7);
      g.fillRect(380, 52, 200, 12);
      g.fillStyle(UI.ban, 1);
      g.fillRect(381, 53, 198 * (s.banRisk / 100), 10);
      g.lineStyle(1, 0xff4444, 0.7);
      g.strokeRect(380, 52, 200, 12);
      this.ruleT.setText(`BAN RISK ${Math.round(s.banRisk)}%${this.rule ? `\n${this.rule}` : ""}`).setPosition(480, 66).setVisible(true);
    } else this.ruleT.setVisible(false);
    // boss
    if (this.boss) {
      const b = this.boss;
      g.fillStyle(0x000000, 0.75);
      g.fillRect(180, 506, 600, 16);
      g.fillStyle(b.shielded ? 0x88aaff : 0xdc2626, 1);
      g.fillRect(182, 508, 596 * Math.max(0, b.hp / b.max), 12);
      g.lineStyle(2, 0xffd23f, 1);
      g.strokeRect(180, 506, 600, 16);
      this.bossT.setText(b.name + (b.shielded ? "  [SHIELDED]" : "")).setVisible(true);
    } else this.bossT.setVisible(false);
    // toasts
    let y = 8;
    this.toasts = this.toasts.filter((t) => {
      if (time > t.until) {
        this.tweens.add({ targets: t.c, alpha: 0, duration: 200, onComplete: () => t.c.destroy() });
        return false;
      }
      t.c.y += (y - t.c.y) * 0.25;
      y += (t.c.getData("h") as number) + 6;
      return true;
    });
  }
}
