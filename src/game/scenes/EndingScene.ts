import Phaser from "phaser";
import { backdrop } from "../gfx/HD";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { FINAL_PROMPT, ENDINGS, EPILOGUES, CREDITS, SEQUEL_CARD, endingKeyFor } from "../../content/endings";
import type { ReactionChoice } from "../../data/types";
import { FONT, title, button } from "../ui/theme";
import { synth } from "../audio/Synth";
import { dir, say } from "../../content/dsl";
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
    const enBg = this.add.tileSprite(0, 0, 960, 540, "tile_wiki").setOrigin(0);
    if (backdrop(this, "bg_ending", { dim: 0.15, depth: -10 })) enBg.setVisible(false);
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
    if (!replay) await this.deleteTheChat();
    if (s.flags.arc_scrombus_done) {
      synth.music("anthem", true);
      await this.box.play([
        dir("Before anyone can leave, the doors of the Citadel burst open. Ben Scrombus walks in wearing a hard hat and a sash that says 'NEW LEADER (PENDING)'."),
        say("SCROMBUS", "4.8 million Krezzcoin. One house. Fully renovated. Do you know what that buys in Krelworld?"),
        say("SCROMBUS", "Everything. It buys everything. I bought the army. I bought the podium. I bought the wiki."),
        say("DRONGUS", "You can't buy the wiki"),
        say("SCROMBUS", "I've already edited your page, mate. You're 'Former Supreme Leader, Retired, Lore Consultant (Unpaid)'."),
        dir("The Krelworld Guard turn, as one, and salute Scrombus. The anthem swells. It is somehow louder."),
        say("SCROMBUS", "Basically we needed a new leader. So now we have one."),
        dir("THE SCROMBUS ERA BEGINS. First decree: every house in Krelworld will be renovated whether it wants to be or not."),
      ]);
    }
    // epilogue card
    const card = this.add.container(480, 250).setDepth(600);
    card.add(this.add.rectangle(0, 0, 760, 300, 0x141628, 0.97).setStrokeStyle(3, CHARACTERS[s.player].color));
    const pk = portraitKey(this, s.player);
    if (pk) card.add(this.add.image(-300, -60, pk).setDisplaySize(110, 110));
    card.add(this.add.text(-220, -120, "EPILOGUE", { fontFamily: FONT, fontSize: "14px", color: "#ffd23f", fontStyle: "bold" }));
    const extra = [
      s.flags.kreltower_fell ? "The Kreltower fell (again). Rebuilding starts Monday." : s.flags.kreltower_saved ? "The Kreltower stands. Flight KR-069 lives in the Great Tap now." : "",
      s.flags.arc_scrombus_done ? "Supreme Leader: Ben Scrombus." : "",
    ].filter(Boolean).join(" ");
    card.add(this.add.text(-220, -96, EPILOGUES[s.player] + (extra ? `\n\n${extra}` : ""), { fontFamily: FONT, fontSize: "15px", color: "#ffffff", wordWrap: { width: 560 }, lineSpacing: 4 }));
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
      synth.music("crazy", true);
      this.add.text(20, 20, "♪ NOW PLAYING: 'Krazy For The Krelworld' — Drongus (unreacted)", { fontFamily: FONT, fontSize: "13px", color: "#ff6fa8" }).setDepth(10);
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
  /** The Temple of the Logs: find the group chat Drongus was going to leak, and delete it. */
  private async deleteTheChat() {
    await this.box.play([
      dir("Behind the throne, behind the song, a small door marked 'TEMPLE OF THE LOGS (PRIVATE) (NO REACTIONS)'."),
      dir("Inside: one laptop on an altar of empty Fizzy Bongo cans. On screen, the group chat. All of it. A folder called 'LEAK_FINAL_final2.zip'."),
      say("DRONGUS", "...don't. That's my life's work."),
    ]);
    const c = this.add.container(480, 260).setDepth(700);
    c.add(this.add.rectangle(0, 0, 640, 320, 0xffffff).setStrokeStyle(4, 0x0084ff));
    c.add(this.add.text(0, -130, "Krelworld (FGM ULTRA)", { fontFamily: FONT, fontSize: "22px", color: "#050505", fontStyle: "bold" }).setOrigin(0.5));
    c.add(this.add.text(0, -102, "412,883 messages · 2009 – present · Seen by 9", { fontFamily: FONT, fontSize: "12px", color: "#65676b" }).setOrigin(0.5));
    const warn = this.add.text(0, -40, "Delete this conversation?\nThis will also delete 'Seen by 9', the Krezzing Hour, every Krazy Fact\nand the four-minute camel voice note.", { fontFamily: FONT, fontSize: "14px", color: "#050505", align: "center" }).setOrigin(0.5);
    c.add(warn);
    c.setScale(0.2);
    this.tweens.add({ targets: c, scale: 1, duration: 400, ease: "Back.out" });
    await new Promise<void>((res) => {
      c.add(button(this, -130, 90, "🗑 DELETE CHAT", () => res(), { w: 220, h: 54, size: 16, color: 0xe41e3f }));
      c.add(button(this, 130, 90, "Keep one message", () => {
        synth.play("tap_fail");
        warn.setText("No. All of it. You know what's in there.");
      }, { w: 220, h: 54, size: 14, color: 0xf0f2f5, textColor: "#050505" }));
    });
    c.removeAll(true);
    c.add(this.add.rectangle(0, 0, 640, 320, 0xffffff).setStrokeStyle(4, 0xe41e3f));
    c.add(this.add.text(0, -130, "DELETING...", { fontFamily: FONT, fontSize: "22px", color: "#e41e3f", fontStyle: "bold" }).setOrigin(0.5));
    c.add(this.add.rectangle(0, 110, 560, 18, 0xe4e6eb));
    const fill = this.add.rectangle(-280, 110, 0, 18, 0xe41e3f).setOrigin(0, 0.5);
    c.add(fill);
    const flying = [
      "MIKEY: Fun police you fucking cunts.",
      "KREBLIS: Shudnt av goten this drunke b4 werk!",
      "FLENKY: I blew a load on a fucking shirt last night. Wait. Like money.",
      "DRONGUS: Seen by 9 btw",
      "KREBLIS: Luv 2 drinke bere frm a shoe.",
      "MIKEY: U fukin drongo",
      "FLENKY: Sigma males are a more alpha version of alpha males 👍",
      "DRONGUS: UNTIL SOMEONE REACTS, THERE WILL BE NO MORE LORE",
      "KREBLIS: It's fart o'clock somewhere.",
      "MIKEY: [voice note, 4:02] *camel noises*",
      "FLENKY: I'm the toppest. I'll fuckin burst ye.",
      "DRONGUS: Did everyone see the song ?",
    ];
    synth.play("alarm");
    await new Promise<void>((res) => {
      let i = 0;
      this.time.addEvent({
        delay: 260,
        repeat: flying.length * 2 - 1,
        callback: () => {
          const t = this.add.text(-290, -80 + (i % 6) * 26, flying[i % flying.length], { fontFamily: FONT, fontSize: "12px", color: "#050505" });
          c.add(t);
          this.tweens.add({ targets: t, x: -900, alpha: 0, delay: 200, duration: 900, onComplete: () => t.destroy() });
          synth.play("tap");
          i++;
          fill.width = Math.min(560, (560 * i) / (flying.length * 2));
          if (i >= flying.length * 2) this.time.delayedCall(500, () => res());
        },
      });
    });
    c.removeAll(true);
    c.add(this.add.rectangle(0, 0, 640, 200, 0xffffff).setStrokeStyle(4, 0x22c55e));
    c.add(this.add.text(0, 0, "CONVERSATION DELETED\n0 messages · Seen by 0", { fontFamily: FONT, fontSize: "22px", color: "#050505", fontStyle: "bold", align: "center" }).setOrigin(0.5));
    synth.play("perfect");
    await new Promise((r) => this.time.delayedCall(1800, r));
    c.destroy();
    G.s.flags.chat_deleted = true;
    await this.box.play([
      dir("Silence. Real silence. Not the Great Silence. Just a laptop fan and nine people breathing out."),
      say("DRONGUS", "...you deleted it."),
      say("DRONGUS", "Sixteen years of lore. Gone. Nobody will ever see the song now."),
      say("DRONGUS", "..."),
      say("DRONGUS", "New one lads."),
      dir("DRONGUS B. DRIPPIN' created a new group: 'Krelworld (FGM ULTRA) 2'. You have been added. Eight other people have been added. Seen by 9."),
    ]);
  }

}
