import Phaser from "phaser";
import { backdrop } from "../gfx/HD";
import { MEETINGS } from "../../content/meetings";
import type { MeetingScript, SpeakerId } from "../../data/types";
import { REACTION_EMOJI } from "../../data/types";
import { DialogueBox } from "../ui/DialogueBox";
import { G } from "../G";
import { goNext, type Next } from "../Flow";
import { CHARACTERS, PLAYABLE_ORDER } from "../../data/characters";
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
        .play(m.beats, {
          historical: m.historical,
          onSpeaker: (sp) => this.highlight(sp),
          onLine: (l) => this.onLine(l.t, l.notify, l.s),
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
    if (backdrop(this, fgm ? "bg_fgm" : "bg_townhall", { dim: 0.25, depth: -10 })) tmBg.setVisible(false);
    if (m.historical) this.add.rectangle(0, 0, W, H, 0x704214, 0.25).setOrigin(0).setDepth(900);
    // windows with the Tap
    if (!fgm) {
      this.add.rectangle(110, 70, 150, 100, 0x6a8fd0).setStrokeStyle(4, 0x3b2a1a);
      this.add.image(110, 92, "p_tap").setScale(0.9);
      this.add.rectangle(110, 70, 4, 100, 0x3b2a1a);
    }
    // podium screen
    this.add.rectangle(W / 2, 52, 230, 80, 0x0a0a12).setStrokeStyle(4, 0x444466);
    this.screenText = this.add.text(W / 2, 52, fgm ? "OPERATION FRAGMAR\nCLASSIFICATION: EXTREMELY PETTY" : "THE KREZZING HOUR\nSeen by 9", { fontFamily: FONT, fontSize: "13px", color: "#7fb3ff", align: "center" }).setOrigin(0.5);
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
    const list: string[] = [...PLAYABLE_ORDER];
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
      const spr = this.add.sprite(x, y, `spr_${id}`, 0).setScale(2.4).setDepth(10 + y);
      const isPlayer = !m.historical && id === G.s.player;
      const plateName = id === "PROCTUS" && !m.historical ? `PROCTUS (${CHARACTERS[G.s.player].proctusTitle})` : CHARACTERS[id]?.name ?? id;
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
