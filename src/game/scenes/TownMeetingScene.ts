import Phaser from "phaser";
import { bossAnims } from "../combat/Bosses";
import { playerKey } from "../gfx/sanmikForm";
import { sanmikActive } from "../systems/sanmik";
import { backdrop } from "../gfx/HD";
import { MEETINGS } from "../../content/meetings";
import type { MeetingScript, SpeakerId } from "../../data/types";
import { REACTION_EMOJI } from "../../data/types";
import { DialogueBox } from "../ui/DialogueBox";
import { G } from "../G";
import { goNext, type Next } from "../Flow";
import { CHARACTERS, LADS } from "../../data/characters";
import { synth } from "../audio/Synth";
import { FONT, hexStr, UI } from "../ui/theme";
import { CANON } from "../../content/archive/canonQuotes";

interface Seat {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  plate: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

/** The horseshoe table. Present-day meetings seat the whole cabinet + Proctus; archive meetings seat whoever spoke. */
export class TownMeetingScene extends Phaser.Scene {
  private seats: Record<string, Seat> = {};
  private agendaTexts: Phaser.GameObjects.Text[] = [];
  private lineCount = 0;
  private reactCounts: Record<string, number> = { LIKE: 0, LOVE: 0, LAUGH: 0, ANGRY: 0, SEEN: 0 };
  private reactText!: Phaser.GameObjects.Text;
  private screenText!: Phaser.GameObjects.Text;

  constructor() {
    super("Meeting");
  }

  create(data: { id: string; next?: Next }) {
    const m: MeetingScript | undefined = MEETINGS[data.id];
    this.seats = {};
    this.agendaTexts = [];
    this.lineCount = 0;
    this.reactCounts = { LIKE: 0, LOVE: 0, LAUGH: 0, ANGRY: 0, SEEN: 0 };
    if (!m) {
      goNext(this, data.next);
      return;
    }
    const { width: W, height: H } = this.scale;
    this.cameras.main.fadeIn(350);
    synth.music("meeting");
    this.drawRoom(m, W, H);
    this.placeSeats(m, W);
    // title card
    const card = this.add.container(W / 2, H / 2).setDepth(2000);
    card.add(this.add.rectangle(0, 0, W, 140, 0x000000, 0.85));
    card.add(this.add.text(0, -24, m.title, { fontFamily: FONT, fontSize: "30px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5));
    card.add(this.add.text(0, 18, m.subtitle ?? "", { fontFamily: FONT, fontSize: "15px", color: "#ff6fa8" }).setOrigin(0.5));
    if (m.historical) card.add(this.add.text(0, 46, "ARCHIVE RECONSTRUCTION — ORIGINAL SPEAKERS", { fontFamily: FONT, fontSize: "11px", color: "#c8b88a" }).setOrigin(0.5));
    this.tweens.add({ targets: card, alpha: 0, delay: 1600, duration: 500, onComplete: () => card.destroy() });

    const box = new DialogueBox(this, 1000, 0.12);
    this.time.delayedCall(1900, () => {
      box
        .play(G.s.flags.krebon_gone && G.s.player !== "KREBON" && !m.historical && m.beats.some((b) => b.s === "KREBON") ? [{ s: "NARRATOR", t: "Krebon has popped back from Wahooga for this meeting. He will be gone again by the end of it. Fairweather.", dir: true }, ...m.beats] : m.beats, {
          historical: m.historical,
          onSpeaker: (sp) => this.highlight(sp),
          onLine: (l) => {
            this.onLine(l.t, l.notify, l.s);
            if (l.fx) this.fx(l.fx);
          },
          onReact: (_c, ch) => {
            this.reactCounts[ch] = (this.reactCounts[ch] ?? 0) + 1;
            this.updateReactDisplay();
          },
        })
        .then(() => this.finish(m, data.next));
    });
  }

  private drawRoom(m: MeetingScript, W: number, H: number) {
    const fgm = m.location === "WAR_ROOM";
    const tmBg = this.add.tileSprite(0, 0, W, H, fgm ? "tile_prison" : "tile_hall").setOrigin(0);
    const hasBg = !!backdrop(this, fgm ? "bg_fgm" : "bg_townhall", { dim: 0.25, depth: -10 });
    if (hasBg) tmBg.setVisible(false);
    if (m.historical) this.add.rectangle(0, 0, W, H, 0x704214, 0.25).setOrigin(0).setDepth(900);
    // windows with the Tap (the PixelLab chamber has its own)
    if (!fgm && !hasBg) {
      this.add.rectangle(110, 70, 150, 100, 0x6a8fd0).setStrokeStyle(4, 0x3b2a1a);
      this.add.image(110, 92, "p_tap").setScale(0.9);
      this.add.rectangle(110, 70, 4, 100, 0x3b2a1a);
    }
    // podium screen
    this.add.rectangle(W / 2, 52, 230, 80, 0x0a0a12).setStrokeStyle(4, 0x444466);
    this.screenText = this.add.text(W / 2, 52, fgm ? (m.id === "crobley_briefing" ? "OPERATION NIBBLE\nCLASSIFICATION: CHEWY" : "OPERATION FRAGMAR\nCLASSIFICATION: EXTREMELY PETTY") : "THE KREZZING HOUR\nSeen by 9", { fontFamily: FONT, fontSize: "13px", color: "#7fb3ff", align: "center" }).setOrigin(0.5);
    // reaction display
    this.add.rectangle(W - 120, 60, 210, 90, 0x0a0a12).setStrokeStyle(3, UI.messenger);
    this.add.text(W - 120, 26, "NATIONAL REACTION DISPLAY", { fontFamily: FONT, fontSize: "10px", color: "#7fb3ff" }).setOrigin(0.5);
    this.reactText = this.add.text(W - 120, 66, "", { fontFamily: FONT, fontSize: "18px", color: "#ffffff", align: "center" }).setOrigin(0.5);
    this.updateReactDisplay();
    // agenda
    this.add.rectangle(10, 128, 196, 26 + m.agenda.length * 30, 0xf5ecd0).setOrigin(0).setStrokeStyle(2, 0x7a5230).setDepth(5);
    this.add.text(18, 132, "AGENDA", { fontFamily: FONT, fontSize: "12px", color: "#7a1f2b", fontStyle: "bold" }).setDepth(5);
    m.agenda.forEach((a, i) => {
      this.agendaTexts.push(this.add.text(18, 150 + i * 30, a, { fontFamily: FONT, fontSize: "10px", color: "#2a1a0a", wordWrap: { width: 182 } }).setDepth(5));
    });
    // horseshoe table (half-ellipse)
    if (this.textures.exists("p_meeting_table")) {
      this.add.image(W / 2, 258, "p_meeting_table").setScale(1.5).setDepth(2);
      if (fgm) this.add.text(W / 2, 290, m.id === "crobley_briefing" ? "OPERATION NIBBLE" : "12:00 MIDDAY · OPERATION FRAGMAR", { fontFamily: FONT, fontSize: "10px", color: "#ffd23f", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(3);
      return;
    }
    const g = this.add.graphics();
    const pts: Phaser.Math.Vector2[] = [];
    for (let a = 8; a <= 172; a += 4) {
      const r = Phaser.Math.DegToRad(a);
      pts.push(new Phaser.Math.Vector2(W / 2 + Math.cos(r) * 250, 210 + Math.sin(r) * 100));
    }
    g.lineStyle(30, fgm ? 0x2e7d32 : 0x5a3a20, 1);
    g.strokePoints(pts, false);
    g.lineStyle(3, fgm ? 0xffffff : 0x8a5a33, 1);
    g.strokePoints(pts.map((p) => new Phaser.Math.Vector2(W / 2 + (p.x - W / 2) * 1.07, 210 + (p.y - 210) * 1.17)), false);
    if (fgm) {
      // tactical map on the ping pong table
      this.add.rectangle(W / 2, 250, 190, 110, 0x1b5e20).setStrokeStyle(2, 0xffffff);
      this.add.text(W / 2, 216, "POLSON TOWERS", { fontFamily: FONT, fontSize: "11px", color: "#ffffff" }).setOrigin(0.5);
      this.add.rectangle(W / 2 - 30, 250, 40, 30, 0x795548);
      this.add.image(W / 2 + 40, 256, "p_fridge").setScale(0.6);
      this.add.text(W / 2, 290, "12:00 MIDDAY", { fontFamily: FONT, fontSize: "10px", color: "#ffd23f" }).setOrigin(0.5);
    }
  }

  private attendees(m: MeetingScript): string[] {
    if (m.historical) {
      const ids = new Set<string>();
      for (const b of m.beats) {
        const sp = b.canon ? CANON[b.canon]?.speaker : b.s;
        if (sp && CHARACTERS[sp as string] && sp !== "NARRATOR" && sp !== "ARCHIVE" && sp !== "PROCTUS") ids.add(sp as string);
      }
      return [...ids];
    }
    const list: string[] = [...LADS, "MIKEY"];
    list.splice(list.indexOf(G.s.player) + 1, 0, "PROCTUS");
    for (const a of m.attendees ?? []) if (!list.includes(a as string)) list.push(a as string);
    return list;
  }

  private placeSeats(m: MeetingScript, W: number) {
    const list = this.attendees(m).filter((id) => id !== "DRONGUS");
    const n = list.length;
    list.forEach((id, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const ang = Phaser.Math.DegToRad(158 - t * 136);
      const x = W / 2 + Math.cos(ang) * 275;
      const y = 190 + Math.sin(ang) * 118;
      const isPlayer = !m.historical && id === G.s.player;
      // playing as Mikey while he's SanMik: SanMik is in your seat
      const spr = this.add.sprite(x, y, isPlayer ? playerKey(this) : `spr_${id}`, 0).setScale(2.4).setDepth(10 + y);
      const plateName = id === "PROCTUS" && !m.historical ? `PROCTUS (${CHARACTERS[G.s.player].proctusTitle})` : isPlayer && sanmikActive(G.s) ? "SANMIK" : CHARACTERS[id]?.name ?? id;
      const plate = this.add
        .text(x, y + 34, isPlayer ? `${plateName} (YOU)` : plateName, { fontFamily: FONT, fontSize: "9px", color: hexStr(CHARACTERS[id]?.color ?? 0xffffff), backgroundColor: "#000000aa", padding: { x: 3, y: 1 }, align: "center", wordWrap: { width: 120 } })
        .setOrigin(0.5, 0)
        .setDepth(11 + y);
      this.seats[id] = { id, sprite: spr, plate, x, y };
    });
    // Drongus: podium in person (prologue / archives), screen otherwise
    const drongusPresent = (m.attendees ?? []).includes("DRONGUS") || (m.historical && this.attendees(m).includes("DRONGUS"));
    if (drongusPresent) {
      const spr = this.add.sprite(W / 2, 138, "spr_DRONGUS", 0).setScale(2.6).setDepth(50);
      const plate = this.add.text(W / 2, 168, "DRONGUS B. DRIPPIN'", { fontFamily: FONT, fontSize: "9px", color: "#ffd23f", backgroundColor: "#000000aa", padding: { x: 3, y: 1 } }).setOrigin(0.5, 0).setDepth(51);
      this.seats.DRONGUS = { id: "DRONGUS", sprite: spr, plate, x: W / 2, y: 138 };
    }
  }

  private highlight(sp: SpeakerId) {
    for (const s of Object.values(this.seats)) {
      s.sprite.clearTint();
      s.sprite.setFrame(0);
    }
    const seat = this.seats[sp as string];
    if (!seat) {
      if (sp === "DRONGUS") {
        this.tweens.add({ targets: this.screenText, alpha: 0.3, yoyo: true, duration: 120, repeat: 2 });
      }
      return;
    }
    seat.sprite.setFrame(3);
    this.tweens.add({ targets: seat.sprite, y: seat.y - 8, yoyo: true, duration: 120 });
  }

  private onLine(text: string, notify?: boolean, speaker?: string) {
    this.lineCount++;
    if (this.lineCount === 4 && this.agendaTexts[0]) {
      // Agenda item one never survives contact with the cabinet.
      const a = this.agendaTexts[0];
      a.setColor("#8a8080");
      const st = this.add.text(a.x + 110, a.y - 2, "DERAILED", { fontFamily: FONT, fontSize: "11px", color: "#c00", fontStyle: "bold" }).setAngle(-8).setDepth(6);
      st.setScale(2);
      this.tweens.add({ targets: st, scale: 1, duration: 200 });
      synth.play("ding");
    }
    if (notify && speaker === "DRONGUS") {
      this.screenText.setText(text.length > 60 ? text.slice(0, 57) + "…" : text).setWordWrapWidth(210);
    }
  }

  private robbo: Phaser.GameObjects.Sprite | null = null;

  /** Staged moments in the room, cued by a line's `fx`. */
  private fx(id: string) {
    const W = this.scale.width;
    const cx = W / 2;
    const cy = 262;
    if (id === "robbo_enter") {
      const key = this.textures.exists("boss_flatmate") ? "boss_flatmate" : "spr_FOLK0";
      const r = this.add.sprite(W + 60, cy, key, 0).setDepth(400);
      // (setScale folds the sheet's hd factor in, so undo it: ~84px tall like the seated lads)
      r.setScale(1);
      r.setScale(84 / r.frame.height / r.scaleX);
      this.robbo = r;
      const ak = this.textures.exists("bossanim_flatmate") ? "bossanim_flatmate" : null;
      const rows = ak ? bossAnims(this, ak) : new Set<string>();
      if (ak && rows.has("move")) r.play(`${ak}:move`);
      r.setFlipX(true);
      this.tweens.add({
        targets: r,
        x: cx,
        duration: 1600,
        ease: "Sine.out",
        onComplete: () => {
          if (ak && rows.has("idle")) r.play(`${ak}:idle`);
          r.setFlipX(false);
        },
      });
      synth.play("door");
      return;
    }
    const r = this.robbo;
    if (!r?.active) return;
    if (id === "robbo_beatup") {
      const lads = Object.values(this.seats).filter((s) => s.id !== "DRONGUS" && s.id !== G.s.player);
      lads.forEach((s, i) => {
        const a = (i / Math.max(1, lads.length)) * Math.PI * 2;
        this.tweens.add({ targets: s.sprite, x: r.x + Math.cos(a) * 46, y: r.y + Math.sin(a) * 26, duration: 380, delay: i * 60, ease: "Quad.out" });
      });
      const ak = "bossanim_flatmate";
      if (this.anims.exists(`${ak}:hurt`)) r.play({ key: `${ak}:hurt`, repeat: -1 });
      const cloud = this.add.ellipse(r.x, r.y, 170, 110, 0xe5e7eb, 0.85).setDepth(450).setAlpha(0);
      this.tweens.add({ targets: cloud, alpha: 0.9, scaleX: { from: 0.6, to: 1.05 }, yoyo: true, repeat: 5, duration: 220, delay: 350 });
      const words = ["POW!", "WHAM!", "BIFF!", "NONCE!", "THWACK!", "BOSH!", "SMACK!", "CRAVAT!"];
      for (let k = 0; k < 14; k++)
        this.time.delayedCall(400 + k * 190, () => {
          const t = this.add.text(r.x + (Math.random() - 0.5) * 150, r.y + (Math.random() - 0.5) * 80, words[k % words.length], { fontFamily: FONT, fontSize: "18px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(460);
          this.tweens.add({ targets: t, scale: { from: 0.4, to: 1.2 }, alpha: 0, duration: 520, onComplete: () => t.destroy() });
          synth.play(k % 3 === 0 ? "punch_big" : "hit");
          if (k % 4 === 0) this.cameras.main.shake(120, 0.008);
        });
      this.time.delayedCall(3300, () => {
        cloud.destroy();
        lads.forEach((s) => this.tweens.add({ targets: s.sprite, x: s.x, y: s.y, duration: 420, ease: "Quad.inOut" }));
        r.stop();
        r.setFrame(0);
        this.tweens.add({ targets: r, angle: 84, y: r.y + 18, duration: 260, ease: "Quad.in" });
        synth.play("smash");
      });
      return;
    }
    if (id === "robbo_leave") {
      // he crawls out the way he came, on his belly
      this.tweens.add({ targets: r, x: W + 90, duration: 2600, delay: 600, ease: "Sine.in", onComplete: () => r.destroy() });
      this.tweens.add({ targets: r, y: r.y - 3, yoyo: true, repeat: 10, duration: 120, delay: 600 });
      this.time.delayedCall(3100, () => synth.play("door"));
    }
  }

  private updateReactDisplay() {
    const r = this.reactCounts;
    this.reactText.setText(`${REACTION_EMOJI.LIKE}${r.LIKE}  ${REACTION_EMOJI.LOVE}${r.LOVE}  ${REACTION_EMOJI.LAUGH}${r.LAUGH}\n${REACTION_EMOJI.ANGRY}${r.ANGRY}  Seen ${r.SEEN}`);
  }

  private finish(m: MeetingScript, next?: Next) {
    if (m.onComplete) Object.assign(G.s.flags, m.onComplete);
    for (const a of m.unlocksArchive ?? []) G.unlockArchive(a);
    G.save();
    this.cameras.main.fadeOut(350);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => goNext(this, next));
  }
}
