import Phaser from "phaser";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { FINAL_PROMPT, ENDINGS, EPILOGUES, CREDITS, SEQUEL_CARD, endingKeyFor } from "../../content/endings";
import type { ReactionChoice } from "../../data/types";
import { FONT, title, button } from "../ui/theme";
import { synth } from "../audio/Synth";
import { switchTo } from "../Flow";
import { portraitKey } from "../gfx/Textures";
import { CHARACTERS } from "../../data/characters";
import { applyReaction } from "../systems/reactions";

export class EndingScene extends Phaser.Scene {
  private box!: DialogueBox;

  constructor() {
    super("Ending");
  }

  async create(data: { replay?: boolean }) {
    const s = G.s;
    this.cameras.main.fadeIn(800);
    this.add.tileSprite(0, 0, 960, 540, "tile_wiki").setOrigin(0);
    this.add.rectangle(0, 0, 960, 540, 0x000000, 0.25).setOrigin(0);
    const dr = this.add.sprite(480, 250, "spr_DRONGUS", 0).setScale(5).setAngle(-80).setTint(0xddddaa);
    synth.stopMusic();
    this.box = new DialogueBox(this, 1000, 0.15);
    if (data?.replay && s.ending) {
      this.showEnding(s.ending, dr, true);
      return;
    }
    await this.box.play(FINAL_PROMPT);
    const choice = await this.reactionCard();
    this.showEnding(choice, dr, false);
  }

  private reactionCard(): Promise<ReactionChoice> {
    return new Promise((res) => {
      const c = this.add.container(480, 270).setDepth(500);
      c.add(this.add.rectangle(0, 0, 620, 300, 0xffffff).setStrokeStyle(4, 0x0084ff));
      const pk = portraitKey(this, "DRONGUS");
      if (pk) c.add(this.add.image(-270, -110, pk).setDisplaySize(44, 44));
      c.add(this.add.text(-240, -126, "DRONGUS B. DRIPPIN'", { fontFamily: FONT, fontSize: "14px", color: "#65676b", fontStyle: "bold" }));
      c.add(this.add.rectangle(20, -50, 520, 80, 0xe4e6eb));
      c.add(this.add.text(20, -62, "🎵 THE KREZZING HOUR", { fontFamily: FONT, fontSize: "22px", color: "#050505", fontStyle: "bold" }).setOrigin(0.5));
      c.add(this.add.text(20, -32, "Drongus B. Drippin'  ·  Official Krelworld Anthem  ·  Seen by 9", { fontFamily: FONT, fontSize: "12px", color: "#65676b" }).setOrigin(0.5));
      const opts: [ReactionChoice, string][] = [
        ["LIKE", "👍 LIKE"],
        ["LOVE", "❤️ LOVE"],
        ["LAUGH", "😂 LAUGH"],
        ["SEEN", "NO REACTION"],
      ];
      opts.forEach(([r, label], i) => {
        const b = button(this, -225 + i * 150, 70, label, () => {
          synth.play("pop");
          c.destroy();
          res(r);
        }, { w: 138, h: 56, size: 15, color: 0xf0f2f5, textColor: "#050505" });
        c.add(b);
      });
      c.add(this.add.text(0, 125, "This is the only thing he ever wanted.", { fontFamily: FONT, fontSize: "12px", color: "#65676b", fontStyle: "italic" }).setOrigin(0.5));
      c.setScale(0.2);
      this.tweens.add({ targets: c, scale: 1, duration: 500, ease: "Back.out" });
    });
  }

  private async showEnding(choice: ReactionChoice, dr: Phaser.GameObjects.Sprite, replay: boolean) {
    const s = G.s;
    const key = endingKeyFor(choice);
    const e = ENDINGS[key];
    if (!replay) {
      applyReaction(s, "the_krezzing_hour", choice);
      s.ending = choice;
      s.phase = "ended";
      s.flags.game_complete = true;
      if (!G.meta.completedWith.includes(s.player)) G.meta.completedWith.push(s.player);
      G.meta.ngPlusUnlocked = true;
      G.save();
    }
    synth.music("ending");
    this.tweens.add({ targets: dr, angle: 0, duration: 1200, ease: "Sine.out" });
    dr.clearTint();
    const banner = title(this, 480, 40, e.title, 22, "#ffd23f").setDepth(600);
    await this.box.play(e.lines);
    banner.destroy();
    // epilogue card
    const card = this.add.container(480, 250).setDepth(600);
    card.add(this.add.rectangle(0, 0, 760, 300, 0x141628, 0.97).setStrokeStyle(3, CHARACTERS[s.player].color));
    const pk = portraitKey(this, s.player);
    if (pk) card.add(this.add.image(-300, -60, pk).setDisplaySize(110, 110));
    card.add(this.add.text(-220, -120, "EPILOGUE", { fontFamily: FONT, fontSize: "14px", color: "#ffd23f", fontStyle: "bold" }));
    card.add(this.add.text(-220, -96, EPILOGUES[s.player], { fontFamily: FONT, fontSize: "15px", color: "#ffffff", wordWrap: { width: 560 }, lineSpacing: 4 }));
    await new Promise<void>((res) => {
      card.add(button(this, 0, 110, "CONTINUE", () => res(), { w: 200 }));
    });
    card.destroy();
    await this.credits();
  }

  private credits(): Promise<void> {
    return new Promise((res) => {
      this.children.removeAll(true);
      this.add.rectangle(0, 0, 960, 540, 0x000000).setOrigin(0);
      const t = this.add.text(480, 560, CREDITS.join("\n"), { fontFamily: FONT, fontSize: "18px", color: "#ffffff", align: "center", lineSpacing: 8 }).setOrigin(0.5, 0);
      this.tweens.add({
        targets: t,
        y: -t.height - 40,
        duration: 22000,
        onComplete: () => {
          const card = title(this, 480, 250, SEQUEL_CARD, 34, "#ff6fa8");
          card.setAlpha(0);
          this.tweens.add({ targets: card, alpha: 1, duration: 1500 });
          this.time.delayedCall(3500, () => {
            button(this, 480, 360, "BACK TO TITLE (New Krez+ unlocked)", () => {
              res();
              switchTo(this, "Title");
            }, { w: 420 });
          });
        },
      });
      const skip = this.add.text(940, 520, "click to skip", { fontFamily: FONT, fontSize: "11px", color: "#666" }).setOrigin(1);
      this.input.once("pointerdown", () => {
        skip.destroy();
        this.tweens.killAll();
        t.setY(-9999);
        const card = title(this, 480, 250, SEQUEL_CARD, 34, "#ff6fa8");
        void card;
        button(this, 480, 360, "BACK TO TITLE (New Krez+ unlocked)", () => {
          res();
          switchTo(this, "Title");
        }, { w: 420 });
      });
    });
  }
}
