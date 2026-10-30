import Phaser from "phaser";
import { backdrop } from "../gfx/HD";
import { G } from "../G";
import { offerFacts, adoptFact, type KrazyFact } from "../../data/historicalRevisions";
import { FONT, title } from "../ui/theme";
import { advanceChapter, switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { DialogueBox } from "../ui/DialogueBox";
import { say, dir } from "../../content/dsl";

/** End-of-chapter Historical Revision: the chosen Krazy Fact becomes law. */
export class KrazyFactScene extends Phaser.Scene {
  private chosen = false;

  constructor() {
    super("KrazyFact");
  }

  create() {
    this.chosen = false;
    const s = G.s;
    this.cameras.main.fadeIn(300);
    const kfBg = this.add.tileSprite(0, 0, 960, 540, "tile_hall").setOrigin(0);
    if (backdrop(this, "bg_townhall", { dim: 0.45, depth: -10 })) kfBg.setVisible(false);
    this.add.rectangle(0, 0, 960, 540, 0x000000, 0.55).setOrigin(0);
    title(this, 480, 40, "SUBMIT A KRAZY FACT", 30, "#ffd23f");
    this.add.text(480, 72, `End of Chapter ${s.chapter}. The cabinet will enter one fact into the record. Krelworld will rewrite itself around it.`, { fontFamily: FONT, fontSize: "13px", color: "#ffffff", align: "center", wordWrap: { width: 800 } }).setOrigin(0.5);
    const facts = offerFacts(s, 3);
    if (!facts.length) {
      this.finish(null);
      return;
    }
    facts.forEach((f, i) => this.card(f, 170 + i * 310, 290));
    this.add.text(480, 520, `Active revisions: ${s.revisions.length ? s.revisions.join(", ") : "none"}`, { fontFamily: FONT, fontSize: "11px", color: "#9aa0b4" }).setOrigin(0.5);
    synth.music("meeting");
  }

  private card(f: KrazyFact, x: number, y: number) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 290, 330, 0xf5ecd0).setStrokeStyle(3, 0x7a5230).setInteractive({ useHandCursor: true });
    const t1 = this.add.text(0, -140, "KRAZY FACT", { fontFamily: FONT, fontSize: "11px", color: "#7a1f2b", fontStyle: "bold" }).setOrigin(0.5);
    const t2 = this.add.text(0, -80, `"${f.fact}"`, { fontFamily: FONT, fontSize: "16px", color: "#2a1a0a", fontStyle: "bold", align: "center", wordWrap: { width: 260 } }).setOrigin(0.5);
    const t3 = this.add.text(0, 40, f.effect, { fontFamily: FONT, fontSize: "12px", color: "#2f6b3a", align: "center", wordWrap: { width: 260 } }).setOrigin(0.5);
    const t4 = this.add.text(0, 130, `submitted by ${f.submittedBy}`, { fontFamily: FONT, fontSize: "10px", color: "#7a6a4a", fontStyle: "italic", align: "center", wordWrap: { width: 260 } }).setOrigin(0.5);
    c.add([bg, t1, t2, t3, t4]);
    bg.on("pointerover", () => {
      c.setScale(1.04);
      synth.play("select");
    });
    bg.on("pointerout", () => c.setScale(1));
    bg.on("pointerdown", () => this.finish(f));
  }

  private async finish(f: KrazyFact | null) {
    if (this.chosen) return;
    this.chosen = true;
    const s = G.s;
    if (f) {
      adoptFact(s, f.id);
      synth.play("archive");
      const box = new DialogueBox(this, 1000);
      await box.play([
        dir(`ENTERED INTO THE RECORD: "${f.fact}"`),
        dir(`Krelworld shudders, and rewrites itself. ${f.effect}`),
        say("KREZWONK", "So what can we say...", { role: true, proctus: "It's law now! I've written it on my hand!" }),
      ]);
      G.drongus("krazy_fact");
    }
    advanceChapter();
    switchTo(this, "Hub", { at: "TOWN_HALL" });
  }
}
