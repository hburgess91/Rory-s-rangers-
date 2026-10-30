import Phaser from "phaser";
import type { ChoiceOption, Line, ReactionChoice } from "../../data/types";
import { REACTION_EMOJI } from "../../data/types";
import { G } from "../G";
import { voice } from "../audio/Voice";
import { resolveLine, type ResolvedLine } from "../systems/narrative";
import { evalCond } from "../systems/conditions";
import { portraitKey } from "../gfx/Textures";
import { synth } from "../audio/Synth";
import { CHARACTERS } from "../../data/characters";
import { FONT, UI } from "./theme";

export interface PlayOptions {
  historical?: boolean;
  /** Called whenever a new speaker starts talking (used to highlight seats). */
  onSpeaker?: (speaker: string, line: ResolvedLine) => void;
  /** Called for reaction choices (in addition to the global reaction system). */
  onReact?: (context: string, choice: ReactionChoice) => void;
  /** Called for every line as it is shown. */
  onLine?: (line: ResolvedLine) => void;
}

const W = 960;
const H = 540;

const REGISTER_JIBES = [
  "Oh. It's the pedo.",
  "Get away from me, you sicko.",
  "Keep your distance, nonce.",
  "I've seen the register. Everyone's seen the register.",
  "Ugh. It's you. The pervert.",
  "Hands where I can see them, pedo.",
  "My mum said not to talk to you. She's right.",
  "Oh great, the sex offender's here.",
  "Stay six feet away, sicko. Twelve.",
  "Don't make it weird. Well. Weirder.",
];

export class DialogueBox {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private box: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private titleText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Image;
  private portraitFrame: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Container;
  private advanceResolve: (() => void) | null = null;
  private typing = false;
  private fullText = "";
  private shown = 0;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private skipping = false;
  private keyHandler: (e: KeyboardEvent) => void;
  private ptrHandler: (p: Phaser.Input.Pointer) => void;
  private choiceHandler: ((idx: number) => void) | null = null;
  private destroyed = false;
  active = false;

  private dim: number;

  constructor(scene: Phaser.Scene, depth = 1000, dim = 0.55) {
    this.scene = scene;
    this.dim = dim;
    this.root = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0);
    this.box = scene.add.graphics();
    this.portraitFrame = scene.add.graphics();
    this.portrait = scene.add.image(84, 452, "__WHITE").setDisplaySize(112, 112);
    this.nameText = scene.add.text(160, 372, "", { fontFamily: FONT, fontSize: "18px", color: "#ffd23f", fontStyle: "bold" }).setShadow(2, 2, "#000", 0);
    this.titleText = scene.add.text(160, 393, "", { fontFamily: FONT, fontSize: "12px", color: "#9aa0a6" });
    this.bodyText = scene.add
      .text(160, 412, "", { fontFamily: FONT, fontSize: "17px", color: "#ffffff", wordWrap: { width: 760, useAdvancedWrap: true }, lineSpacing: 3 })
      .setShadow(1, 1, "#000", 0);
    this.hint = scene.add.text(W - 30, H - 22, "▼ E / Space   ·   Tab skip", { fontFamily: FONT, fontSize: "11px", color: "#8a8fa0" }).setOrigin(1, 0.5);
    this.overlay = scene.add.container(0, 0);
    this.root.add([this.box, this.portraitFrame, this.portrait, this.nameText, this.titleText, this.bodyText, this.hint, this.overlay]);
    this.root.setVisible(false);

    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.active) return;
      if (this.choiceHandler) {
        const n = parseInt(e.key, 10);
        if (!isNaN(n) && n >= 1 && n <= 9) {
          this.choiceHandler(n - 1);
        }
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        this.skipping = true;
        this.advance();
        return;
      }
      if (e.key === " " || e.key === "Enter" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        this.advance();
      }
    };
    this.ptrHandler = (p: Phaser.Input.Pointer) => {
      if (!this.active || this.choiceHandler) return;
      if (p.rightButtonDown()) return;
      this.advance();
    };
    window.addEventListener("keydown", this.keyHandler);
    scene.input.on("pointerdown", this.ptrHandler);
    scene.events.once("shutdown", () => this.destroy());
    scene.events.once("destroy", () => this.destroy());
  }

  destroy() {
    voice.stop();
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener("keydown", this.keyHandler);
    this.scene.input?.off("pointerdown", this.ptrHandler);
    this.typeTimer?.remove();
    this.root.destroy();
  }

  private advance() {
    if (this.typing) {
      this.finishTyping();
      if (!this.skipping) return;
    }
    const r = this.advanceResolve;
    this.advanceResolve = null;
    r?.();
  }

  private finishTyping() {
    this.typing = false;
    this.typeTimer?.remove();
    this.typeTimer = null;
    this.bodyText.setText(this.fullText);
  }

  private drawBox(kind: "speech" | "dir" | "notify") {
    const g = this.box;
    g.clear();
    if (kind === "notify") return;
    g.fillStyle(0x000000, this.dim);
    g.fillRect(0, 0, W, H);
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(16, 362, W - 32, 166, 10);
    g.lineStyle(3, kind === "dir" ? 0x5b5f73 : UI.accent, 1);
    g.strokeRoundedRect(16, 362, W - 32, 166, 10);
  }

  private setPortrait(speaker: string | null) {
    this.portraitFrame.clear();
    if (!speaker) {
      this.portrait.setVisible(false);
      return;
    }
    const key = portraitKey(this.scene, speaker);
    if (!key) {
      this.portrait.setVisible(false);
      return;
    }
    this.portrait.setTexture(key).setDisplaySize(112, 112).setVisible(true);
    const col = CHARACTERS[speaker]?.color ?? 0x888888;
    this.portraitFrame.fillStyle(0x000000, 1);
    this.portraitFrame.fillRect(24, 392, 120, 120);
    this.portraitFrame.lineStyle(3, col, 1);
    this.portraitFrame.strokeRect(24, 392, 120, 120);
  }

  private typeOut(text: string) {
    this.fullText = text;
    this.shown = 0;
    this.bodyText.setText("");
    if (this.skipping) {
      this.bodyText.setText(text);
      this.typing = false;
      return;
    }
    this.typing = true;
    const speed = Math.max(0.25, G.meta.settings.textSpeed);
    const perTick = Math.max(1, Math.round(speed * 1.6));
    this.typeTimer?.remove();
    this.typeTimer = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.shown = Math.min(this.fullText.length, this.shown + perTick);
        this.bodyText.setText(this.fullText.slice(0, this.shown));
        if (this.shown % 3 === 0) synth.play("type");
        if (this.shown >= this.fullText.length) this.finishTyping();
      },
    });
  }

  private waitAdvance(): Promise<void> {
    return new Promise((res) => {
      this.advanceResolve = res;
      if (this.skipping && !this.typing) {
        this.scene.time.delayedCall(30, () => this.advance());
      }
    });
  }

  private clearOverlay() {
    this.overlay.removeAll(true);
    this.choiceHandler = null;
  }

  /** Messenger-style notification bubble at the top. */
  private showNotify(line: ResolvedLine) {
    this.clearOverlay();
    this.drawBox("notify");
    this.nameText.setText("");
    this.titleText.setText("");
    this.bodyText.setText("");
    this.portrait.setVisible(false);
    this.portraitFrame.clear();
    const g = this.scene.add.graphics();
    const bubbleW = 640;
    const x = (W - bubbleW) / 2;
    g.fillStyle(0x000000, 0.45);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(x, 150, bubbleW, 150, 18);
    g.fillStyle(0x0084ff, 1);
    g.fillRoundedRect(x + 16, 196, bubbleW - 32, 90, 16);
    const key = portraitKey(this.scene, line.s);
    const items: Phaser.GameObjects.GameObject[] = [g];
    if (key) items.push(this.scene.add.image(x + 38, 172, key).setDisplaySize(36, 36));
    items.push(this.scene.add.text(x + 64, 162, line.speakerName || "Messenger", { fontFamily: FONT, fontSize: "15px", color: "#050505", fontStyle: "bold" }));
    items.push(this.scene.add.text(x + bubbleW - 20, 164, "now", { fontFamily: FONT, fontSize: "12px", color: "#65676b" }).setOrigin(1, 0));
    const body = this.scene.add.text(x + 32, 208, line.t, { fontFamily: FONT, fontSize: "17px", color: "#ffffff", wordWrap: { width: bubbleW - 64, useAdvancedWrap: true } });
    items.push(body);
    this.overlay.add(items);
    this.fullText = line.t;
    this.typing = false;
    synth.play("notify");
  }

  private showChoices(options: { label: string }[], title?: string): Promise<number> {
    return new Promise((res) => {
      this.clearOverlay();
      const items: Phaser.GameObjects.GameObject[] = [];
      const top = 360 - options.length * 40 - (title ? 30 : 0);
      if (title) items.push(this.scene.add.text(W / 2, top - 6, title, { fontFamily: FONT, fontSize: "15px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5, 1));
      options.forEach((o, i) => {
        const y = top + i * 40;
        const bg = this.scene.add.rectangle(W / 2, y + 16, 640, 34, 0x1b1e33, 0.96).setStrokeStyle(2, UI.accent).setInteractive({ useHandCursor: true });
        const t = this.scene.add.text(W / 2, y + 16, `${i + 1}. ${o.label}`, { fontFamily: FONT, fontSize: "16px", color: "#ffffff", wordWrap: { width: 600 } }).setOrigin(0.5);
        bg.on("pointerover", () => bg.setFillStyle(0x2d3360, 1));
        bg.on("pointerout", () => bg.setFillStyle(0x1b1e33, 0.96));
        bg.on("pointerdown", (_p: any, _x: any, _y: any, ev: any) => {
          ev?.stopPropagation?.();
          pick(i);
        });
        items.push(bg, t);
      });
      this.overlay.add(items);
      const pick = (i: number) => {
        if (i < 0 || i >= options.length) return;
        synth.play("select");
        this.clearOverlay();
        res(i);
      };
      this.choiceHandler = pick;
    });
  }

  private showReaction(message: string, from: string, options: ReactionChoice[]): Promise<ReactionChoice> {
    return new Promise((res) => {
      this.clearOverlay();
      this.drawBox("notify");
      this.nameText.setText("");
      this.titleText.setText("");
      this.bodyText.setText("");
      this.portrait.setVisible(false);
      this.portraitFrame.clear();
      const g = this.scene.add.graphics();
      const bw = 680;
      const x = (W - bw) / 2;
      g.fillStyle(0x000000, 0.55);
      g.fillRect(0, 0, W, H);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(x, 110, bw, 260, 20);
      g.fillStyle(0xe4e6eb, 1);
      g.fillRoundedRect(x + 70, 160, bw - 100, 96, 18);
      const items: Phaser.GameObjects.GameObject[] = [g];
      const key = portraitKey(this.scene, from);
      if (key) items.push(this.scene.add.image(x + 40, 190, key).setDisplaySize(44, 44));
      items.push(this.scene.add.text(x + 70, 128, CHARACTERS[from]?.name ?? from, { fontFamily: FONT, fontSize: "14px", color: "#65676b", fontStyle: "bold" }));
      items.push(this.scene.add.text(x + 88, 172, message, { fontFamily: FONT, fontSize: "17px", color: "#050505", wordWrap: { width: bw - 140, useAdvancedWrap: true } }));
      items.push(this.scene.add.text(W / 2, 272, "REACT  (1-5 or click)", { fontFamily: FONT, fontSize: "12px", color: "#65676b" }).setOrigin(0.5, 0));
      const opts = options.length ? options : (["LIKE", "LOVE", "LAUGH", "ANGRY", "SEEN"] as ReactionChoice[]);
      const pick = (i: number) => {
        if (i < 0 || i >= opts.length) return;
        this.clearOverlay();
        res(opts[i]);
      };
      opts.forEach((r, i) => {
        const cx = W / 2 + (i - (opts.length - 1) / 2) * 100;
        const circle = this.scene.add.circle(cx, 322, 32, 0xf0f2f5).setStrokeStyle(2, 0xd0d3d9).setInteractive({ useHandCursor: true });
        const label = this.scene.add.text(cx, 322, REACTION_EMOJI[r], { fontFamily: FONT, fontSize: r === "SEEN" ? "15px" : "28px", color: "#333" }).setOrigin(0.5);
        const num = this.scene.add.text(cx + 24, 300, String(i + 1), { fontFamily: FONT, fontSize: "11px", color: "#999" });
        circle.on("pointerover", () => {
          circle.setScale(1.15);
          label.setScale(1.15);
        });
        circle.on("pointerout", () => {
          circle.setScale(1);
          label.setScale(1);
        });
        circle.on("pointerdown", () => pick(i));
        items.push(circle, label, num);
      });
      this.overlay.add(items);
      this.choiceHandler = pick;
    });
  }

  /** Play a script. Resolves when the last line has been dismissed. */
  async play(lines: Line[], opts: PlayOptions = {}): Promise<void> {
    if (this.destroyed) return;
    this.active = true;
    this.skipping = false;
    this.root.setVisible(true);
    const queue = [...lines];
    const s = G.s;
    // On the register: whoever speaks to you first opens with what they think of you.
    if (s.flags.on_register) {
      const i = queue.findIndex((l) => !l.dir && !l.notify && l.s !== "NARRATOR" && l.s !== s.player && !!l.t && evalCond(l.cond, s));
      if (i >= 0) queue.splice(i, 0, { s: queue[i].s, t: REGISTER_JIBES[Math.floor(Math.random() * REGISTER_JIBES.length)], tag: "new" });
    }
    while (queue.length && !this.destroyed) {
      const raw = queue.shift()!;
      if (!evalCond(raw.cond, s)) continue;
      if (raw.set) Object.assign(s.flags, raw.set);
      if (raw.react) {
        this.skipping = false;
        const r = raw.react;
        const choice = await this.showReaction(r.message, (r.from as string) ?? "DRONGUS", r.options ?? []);
        G.react(r.context, choice);
        opts.onReact?.(r.context, choice);
        const out = r.outcomes?.[choice];
        if (out) queue.unshift(...out);
        if (!raw.t) continue;
      }
      if (raw.choice) {
        this.skipping = false;
        const avail: ChoiceOption[] = raw.choice.filter((c) => evalCond(c.cond, s));
        if (raw.t) {
          const rl = resolveLine(raw, s, opts);
          if (rl) this.renderLine(rl, opts);
        }
        const idx = await this.showChoices(avail);
        const c = avail[idx];
        if (c?.set) Object.assign(s.flags, c.set);
        if (c?.lines) queue.unshift(...c.lines);
        continue;
      }
      if (!raw.t && !raw.canon) continue;
      const rl = resolveLine(raw, s, opts);
      if (!rl) continue;
      if (rl.sfx) synth.play(rl.sfx);
      const did = rl.canon ?? rl.id;
      if (did && !s.discovered.includes(did)) s.discovered.push(did);
      this.renderLine(rl, opts);
      await this.waitAdvance();
      this.clearOverlay();
    }
    this.active = false;
    this.skipping = false;
    if (!this.destroyed) this.root.setVisible(false);
  }

  private renderLine(rl: ResolvedLine, opts: PlayOptions) {
    opts.onLine?.(rl);
    if (!rl.dir && rl.s !== "NARRATOR" && rl.t) voice.say(String(rl.s), rl.t);
    else voice.stop();
    if (rl.notify) {
      opts.onSpeaker?.(rl.s, rl);
      this.showNotify(rl);
      return;
    }
    if (rl.dir || rl.s === "NARRATOR") {
      this.drawBox("dir");
      this.setPortrait(null);
      this.nameText.setText("");
      this.titleText.setText("");
      this.bodyText.setPosition(40, 384).setWordWrapWidth(W - 80).setFontStyle("italic").setColor("#d6d8e4");
      this.typeOut(rl.t);
      return;
    }
    opts.onSpeaker?.(rl.s, rl);
    this.drawBox("speech");
    this.setPortrait(rl.s);
    const hasPortrait = this.portrait.visible;
    const tx = hasPortrait ? 160 : 40;
    const def = CHARACTERS[rl.s];
    this.nameText.setPosition(tx, 372).setText(rl.speakerName).setColor(def ? "#" + def.color.toString(16).padStart(6, "0") : "#ffd23f");
    const tag = rl.tag === "canon" ? "ARCHIVE QUOTE" : "";
    this.titleText.setPosition(tx, 393).setText([rl.speakerTitle, tag].filter(Boolean).join("  ·  "));
    this.bodyText
      .setPosition(tx, 412)
      .setWordWrapWidth(W - tx - 40)
      .setFontStyle("normal")
      .setColor("#ffffff");
    this.typeOut(rl.t);
  }
}
