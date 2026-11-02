import Phaser from "phaser";
import { backdrop } from "../gfx/HD";
import { ARCHIVE } from "../../content/archive/historicalScenes";
import type { ArchiveEntry } from "../../data/types";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { button, FONT, title } from "../ui/theme";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { CANON } from "../../content/archive/canonQuotes";
import { CHARACTERS } from "../../data/characters";

export class ArchiveScene extends Phaser.Scene {
  private fromTitle = false;
  private returnAt = "ARCHIVE";
  private filter: string | null = null;
  private listC!: Phaser.GameObjects.Container;
  private detail!: Phaser.GameObjects.Container;
  private page = 0;
  private box!: DialogueBox;
  private playing = false;

  constructor() {
    super("Archive");
  }

  create(data: { fromTitle?: boolean; returnAt?: string; filter?: string }) {
    this.fromTitle = !!data?.fromTitle;
    this.returnAt = data?.returnAt ?? "ARCHIVE";
    this.filter = data?.filter ?? null;
    this.page = 0;
    this.playing = false;
    const arBg = this.add.tileSprite(0, 0, 960, 540, "tile_pub").setOrigin(0).setAlpha(0.6);
    const arDim = this.add.rectangle(0, 0, 960, 540, 0x1a120a, 0.75).setOrigin(0);
    if (backdrop(this, "bg_archive", { dim: 0.55, depth: -10 })) {
      arBg.setVisible(false);
      arDim.setVisible(false);
    }
    title(this, 480, 26, this.filter === "ban" ? "BAN TRIBUNAL — EXHIBITS" : "THE KRELWORLD HISTORICAL ARCHIVE", 24, "#c8b88a");
    this.add.text(480, 48, "Official records. Original excerpts. Contradictions. Annotations by the Supreme Leader.", { fontFamily: FONT, fontSize: "12px", color: "#9a8a6a" }).setOrigin(0.5);
    this.listC = this.add.container(0, 0);
    this.detail = this.add.container(0, 0);
    this.box = new DialogueBox(this, 1000);
    this.renderList();
    button(this, 90, 515, "◀ LEAVE", () => this.leave(), { w: 140, h: 30, size: 13 });
    this.input.keyboard?.on("keydown-ESC", () => !this.playing && this.leave());
    synth.music("doc");
  }

  private unlockedIds(): string[] {
    return this.fromTitle ? G.meta.archiveUnlocked : G.s.archiveUnlocked;
  }

  private entries(): ArchiveEntry[] {
    if (this.filter === "ban") return ARCHIVE.filter((a) => ["arch_flenky_bans", "arch_parents_rule", "arch_krazy_fact", "arch_nuclear_option"].includes(a.id));
    const un = this.unlockedIds();
    // Recovered records first, in chronological-ish archive order; the unknown ones after.
    return [...ARCHIVE.filter((a) => un.includes(a.id)), ...ARCHIVE.filter((a) => !un.includes(a.id))];
  }

  private renderList() {
    this.listC.removeAll(true);
    const ents = this.entries();
    const per = 13;
    const pages = Math.ceil(ents.length / per);
    const un = this.unlockedIds();
    const shown = ents.slice(this.page * per, this.page * per + per);
    this.listC.add(this.add.rectangle(16, 64, 330, 430, 0x000000, 0.4).setOrigin(0).setStrokeStyle(1, 0x7a6a4a));
    this.listC.add(this.add.text(26, 70, `${ents.filter((e) => un.includes(e.id)).length}/${ents.length} records recovered`, { fontFamily: FONT, fontSize: "11px", color: "#c8b88a" }));
    shown.forEach((e, i) => {
      const ok = un.includes(e.id) || this.filter === "ban";
      const t = this.add
        .text(26, 92 + i * 30, ok ? `${e.era === "FGM_ULTRA" ? "◆" : e.era === "PRESENT" ? "●" : "■"} ${e.title}` : "■ ??? (not yet recovered)", { fontFamily: FONT, fontSize: "13px", color: ok ? "#f5ecd0" : "#5a5040", wordWrap: { width: 310 } })
        .setInteractive({ useHandCursor: ok });
      if (ok) {
        t.on("pointerover", () => t.setColor("#ffd23f"));
        t.on("pointerout", () => t.setColor("#f5ecd0"));
        t.on("pointerdown", () => this.showEntry(e));
      }
      this.listC.add(t);
    });
    if (pages > 1) {
      this.listC.add(button(this, 120, 482, "◀", () => { this.page = (this.page + pages - 1) % pages; this.renderList(); }, { w: 50, h: 24, size: 12 }));
      this.listC.add(this.add.text(180, 482, `${this.page + 1}/${pages}`, { fontFamily: FONT, fontSize: "12px", color: "#c8b88a" }).setOrigin(0.5));
      this.listC.add(button(this, 240, 482, "▶", () => { this.page = (this.page + 1) % pages; this.renderList(); }, { w: 50, h: 24, size: 12 }));
    }
    if (!this.detail.list.length) {
      this.detail.add(this.add.text(650, 260, "Select a record.\n\n◆ FGM ULTRA era   ■ Krelworld era   ● Present day", { fontFamily: FONT, fontSize: "14px", color: "#9a8a6a", align: "center" }).setOrigin(0.5));
    }
  }

  private showEntry(e: ArchiveEntry) {
    synth.play("archive");
    this.detail.removeAll(true);
    const X = 366;
    this.detail.add(this.add.rectangle(X, 64, 578, 430, 0xf5ecd0, 0.95).setOrigin(0).setStrokeStyle(2, 0x7a5230));
    this.detail.add(this.add.text(X + 16, 74, e.title.toUpperCase(), { fontFamily: FONT, fontSize: "18px", color: "#3a2a1a", fontStyle: "bold", wordWrap: { width: 540 } }));
    this.detail.add(this.add.text(X + 16, 100, `${e.era.replace("_", " ")} · ${e.date}`, { fontFamily: FONT, fontSize: "11px", color: "#7a6a4a" }));
    let y = 124;
    const block = (label: string, text: string, color: string) => {
      this.detail.add(this.add.text(X + 16, y, label, { fontFamily: FONT, fontSize: "11px", color, fontStyle: "bold" }));
      const t = this.add.text(X + 16, y + 15, text, { fontFamily: FONT, fontSize: "13px", color: "#2a1a0a", wordWrap: { width: 545 } });
      this.detail.add(t);
      y += t.height + 26;
    };
    block("OFFICIAL KRELWORLD RECORD", e.official, "#2f6b3a");
    const excerpt = e.original
      .slice(0, 4)
      .map((l) => {
        const c = l.canon ? CANON[l.canon] : undefined;
        const who = CHARACTERS[(c?.speaker ?? l.s) as string]?.name ?? l.s;
        const txt = l.t || c?.text || "…";
        return l.dir || l.s === "NARRATOR" ? `(${txt})` : `${who}: ${txt.length > 140 ? txt.slice(0, 137) + "…" : txt}`;
      })
      .join("\n");
    block(`ORIGINAL EXCERPT (${e.original.length} lines — play the reenactment for all)`, excerpt, "#7a1f2b");
    if (e.footnote) block("ARCHIVAL FOOTNOTE", e.footnote, "#7a5230");
    if (e.drongusAnnotation) block("DRONGUS'S ANNOTATION", e.drongusAnnotation, "#b58b00");
    this.detail.add(button(this, X + 470, 470, "▶ REENACT", () => this.reenact(e), { w: 150, h: 30, size: 13 }));
  }

  private async reenact(e: ArchiveEntry) {
    if (this.playing) return;
    this.playing = true;
    await this.box.play(e.original, { historical: true });
    this.playing = false;
    if (!this.fromTitle && G.hasRun()) {
      G.s.flags[`reenacted_${e.id}`] = true;
      G.save();
    }
  }

  private leave() {
    if (this.fromTitle) switchTo(this, "Title");
    else switchTo(this, "Hub", { at: this.returnAt });
  }
}
