import Phaser from "phaser";
import type { Line } from "../../data/types";
import { DialogueBox } from "../ui/DialogueBox";
import { CHAPTERS } from "../../content/chapters/chapters";
import { G } from "../G";
import { goNext, type Next } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, UI } from "../ui/theme";
import { portraitKey } from "../gfx/Textures";
import { CHARACTERS } from "../../data/characters";

export interface CutsceneData {
  script?: string;
  lines?: Line[];
  bg?: "messenger" | "townhall" | "black" | "citadel";
  music?: string;
  next?: Next;
  set?: Record<string, any>;
}

function scriptLines(id: string): Line[] {
  const m = id.match(/^ch(\d)_(intro|outro)$/);
  if (m) {
    const ch = CHAPTERS[Number(m[1]) - 1];
    if (!ch) return [];
    return m[2] === "intro" ? [...ch.intro, ...ch.playerScene[G.s.player]] : ch.outro;
  }
  return [];
}

export class CutsceneScene extends Phaser.Scene {
  private chatY = 70;
  private chat!: Phaser.GameObjects.Container;

  constructor() {
    super("Cutscene");
  }

  create(data: CutsceneData) {
    const { width: W, height: H } = this.scale;
    this.cameras.main.fadeIn(300);
    this.chatY = 70;
    const bg = data.bg ?? "black";
    if (bg === "messenger") this.drawMessenger(W, H);
    else if (bg === "townhall") {
      this.add.tileSprite(0, 0, W, H, "tile_hall").setOrigin(0);
      this.add.rectangle(W / 2, 120, 520, 130, 0x000000, 0.4);
      this.add.image(W / 2, 140, "p_tap").setScale(1.6).setAlpha(0.7);
    } else if (bg === "citadel") {
      this.add.tileSprite(0, 0, W, H, "tile_wiki").setOrigin(0);
    } else this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0);

    if (data.music) synth.music(data.music);
    const lines = data.lines ?? (data.script ? scriptLines(data.script) : []);
    if (data.script === "ch1_intro") G.s.flags.ch1_intro = true;
    const box = new DialogueBox(this, 100, bg === "messenger" ? 0.15 : 0.4);
    box
      .play(lines, {
        onLine: (l) => {
          if (bg === "messenger" && (l.notify || /^Seen by|^DRONGUS B\. DRIPPIN' has left|reacts/.test(l.t))) this.addChat(l.s, l.t, !!l.notify);
        },
      })
      .then(() => {
        if (data.set) Object.assign(G.s.flags, data.set);
        G.save();
        this.cameras.main.fadeOut(300);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => goNext(this, data.next));
      });
  }

  private drawMessenger(W: number, H: number) {
    this.add.rectangle(0, 0, W, H, 0x0b0b12).setOrigin(0);
    const x = W / 2 - 230;
    this.add.rectangle(x, 10, 460, 340, 0xffffff).setOrigin(0).setStrokeStyle(4, 0x222233);
    this.add.rectangle(x, 10, 460, 44, 0xf0f2f5).setOrigin(0);
    this.add.text(x + 16, 22, "KRELWORLD KREW — WONK IT 'TIL YOU KREZ", { fontFamily: FONT, fontSize: "14px", color: "#050505", fontStyle: "bold" });
    this.add.text(x + 444, 22, "9 members", { fontFamily: FONT, fontSize: "11px", color: "#65676b" }).setOrigin(1, 0);
    this.chat = this.add.container(0, 0);
  }

  private addChat(speaker: string, text: string, isMsg: boolean) {
    const { width: W } = this.scale;
    const x = W / 2 - 220;
    if (this.chatY > 300) {
      this.chat.y -= 60;
    }
    if (!isMsg) {
      const t = this.add.text(W / 2, this.chatY, text, { fontFamily: FONT, fontSize: "11px", color: "#65676b", fontStyle: "italic", align: "center", wordWrap: { width: 400 } }).setOrigin(0.5, 0);
      this.chat.add(t);
      this.chatY += t.height + 8;
      return;
    }
    const key = portraitKey(this, speaker);
    if (key) this.chat.add(this.add.image(x + 14, this.chatY + 14, key).setDisplaySize(24, 24));
    const body = this.add.text(x + 44, this.chatY + 6, text, { fontFamily: FONT, fontSize: "13px", color: "#050505", wordWrap: { width: 360, useAdvancedWrap: true } });
    const bub = this.add.rectangle(x + 36, this.chatY, body.width + 18, body.height + 12, 0xe4e6eb).setOrigin(0);
    this.chat.add([bub, body]);
    this.chat.add(this.add.text(x + 44, this.chatY - 12, CHARACTERS[speaker]?.name ?? speaker, { fontFamily: FONT, fontSize: "9px", color: "#65676b" }));
    this.chatY += body.height + 26;
  }
}
