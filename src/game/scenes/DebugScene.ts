import Phaser from "phaser";
import { G } from "../G";
import { button, FONT, title } from "../ui/theme";
import { startNewRun, switchTo } from "../Flow";
import { CHARACTERS, PLAYABLE_ORDER } from "../../data/characters";
import type { PlayableId } from "../../data/types";
import { CHAPTERS } from "../../content/chapters/chapters";
import { arcDue, arcsFor, stepFlag } from "../systems/arcs";
import type { Arc } from "../../content/arcs";
import { GUNS, GUN_POWER, gunMax } from "../combat/Guns";
import { BANK_MOVES, BANK_PERKS } from "./MenuScene";
import { GENERIC_UPGRADES } from "../systems/stats";
import { PRIZES } from "../../content/kreddle";
import { DUNGEONS } from "../../data/dungeons";
import { BOSS_TEXT } from "../../content/bosses";
import { maxHp } from "../systems/stats";

/**
 * DEBUG · SKIP TO… (from the 🛠 DEBUG button on the title screen).
 * Starts a fresh save at the start of a chapter, or straight at a side quest, with everything before it done.
 */
export class DebugScene extends Phaser.Scene {
  private pl: PlayableId = "FLENKY";
  private picked = false;
  private page: "main" | "bosses" = "main";

  /** DEBUG MODE: every upgrade, every gun (strongest in hand), infinite Krezz and IBS (see Player / DungeonScene). */
  private powers() {
    const s = G.s;
    s.flags.debug_mode = true;
    for (const u of GENERIC_UPGRADES) s.upgrades[u.id] = u.max;
    for (const p of BANK_PERKS) s.upgrades[p.id] = p.max;
    for (const m of BANK_MOVES) s.upgrades[m.id] = 1;
    for (const b of CHARACTERS[s.player].branch ?? []) s.upgrades[b.id] = 1;
    for (const p of PRIZES) if (p.key) s.upgrades[p.key] = p.max ?? 1;
    s.guns = s.guns ?? {};
    for (const [id, g] of Object.entries(GUNS)) s.guns[id] = gunMax(g, s);
    s.gun = GUN_POWER.find((id) => id in GUNS) ?? s.gun;
    s.hp = maxHp(s);
    G.save();
  }

  constructor() {
    super("DebugSkip");
  }

  create() {
    if (!this.picked) {
      let p: string | undefined;
      try {
        p = G.saves.load()?.player;
      } catch {
        p = undefined;
      }
      this.pl = p && CHARACTERS[p] && PLAYABLE_ORDER.includes(p as PlayableId) ? (p as PlayableId) : "FLENKY";
      this.picked = true;
    }
    this.draw();
  }

  /** The chapter a side quest belongs to. */
  private arcCh(a: Arc) {
    const due = arcDue(a);
    return Math.max(2, due ?? a.minChapter ?? 2, a.minChapter ?? 1);
  }

  /** A fresh save at the start of chapter `ch`: earlier chapters and their side quests done, starter guns and money. */
  private prep(ch: number, keep: Arc | null) {
    const pl = this.pl;
    G.newRun(pl, 0);
    const s = G.s;
    s.chapter = ch;
    // the start-of-game bits (welcome, Klerble on the telly, the flyover) count as seen
    Object.assign(s.flags, { prologue_done: true, ch1_intro: true, ministerial_quests: true, met_emergency: true, founding_seen: true, drongus_dungeon_risen: true, home_seen: true, flyover_seen: true, tv_klerble_welcome: true });
    for (let k = 1; k < ch; k++) {
      const c = CHAPTERS[k - 1];
      if (c) for (const st of c.steps) if (st.done?.flag) s.flags[st.done.flag] = true;
      s.flags[`ch${k}_clear`] = s.flags[`ch${k}_outro`] = s.flags[`ch${k}_fact`] = s.flags[`ch${k}_intro`] = true;
      if (k === 1) Object.assign(s.flags, { wildern_destroyed: true, tap_flow_seen: true });
      if (k === 3) Object.assign(s.flags, { mollor_freed: true, golden_unlocked: true });
    }
    for (const a of arcsFor(pl)) {
      if (a === keep) continue;
      const due = arcDue(a);
      if (due !== null && due < ch) {
        for (const st of a.steps) s.flags[stepFlag(a, st)] = true;
        s.flags[`${a.id}_done`] = true;
        if (a.requires) s.flags[a.requires] = true;
      }
    }
    if (keep) {
      // going straight to one quest: the rest of that chapter's prep is done, so nothing gets in the way
      if (keep.requires) s.flags[keep.requires] = true;
      s.flags[`ch${ch}_intro`] = true;
      const cc = CHAPTERS[ch - 1];
      if (cc)
        for (const st of cc.steps) {
          if (st.id === "s_dungeon") break;
          if (st.done?.flag) s.flags[st.done.flag] = true;
        }
      for (const a of arcsFor(pl))
        if (a !== keep && this.arcCh(a) === ch) {
          for (const st of a.steps) s.flags[stepFlag(a, st)] = true;
          s.flags[`${a.id}_done`] = true;
        }
    }
    s.guns = s.guns ?? {};
    let first: string | null = null;
    for (const [id, g] of Object.entries(GUNS)) {
      if (!g.shop && (g.minChapter ?? 1) < ch) {
        s.guns[id] = g.maxAmmo;
        first = first ?? id;
      }
    }
    if (first) s.gun = first;
    s.coins += 300 * ch;
    s.hp = maxHp(s);
    G.save();
    this.powers();
  }

  private goCh(n: number) {
    if (n === 1) {
      startNewRun(this, this.pl);
      this.powers();
      return;
    }
    this.prep(n, null);
    switchTo(this, "Hub");
  }

  private goArc(a: Arc) {
    this.prep(this.arcCh(a), a);
    switchTo(this, "Hub");
  }

  /** Every boss fight: the dungeon and room it's in. */
  private bosses(): { boss: string; dungeon: string; room: number; ch: number }[] {
    const out: { boss: string; dungeon: string; room: number; ch: number }[] = [];
    for (const d of Object.values(DUNGEONS))
      d.rooms.forEach((r, i) => {
        // the chapter the fight belongs to: the chapter whose dungeon it's in, else the dungeon's own chapter (side quests: 2)
        const ch = CHAPTERS.find((c) => c.dungeon === d.id)?.n ?? d.chapter ?? 2;
        if (r.boss) out.push({ boss: r.boss, dungeon: d.id, room: i, ch: Math.max(1, ch) });
      });
    return out.sort((a, b) => a.ch - b.ch);
  }

  private goBoss(b: { boss: string; dungeon: string; room: number; ch: number }) {
    this.prep(b.ch, null);
    switchTo(this, "Dungeon", { dungeon: b.dungeon, room: b.room });
  }

  private drawBosses() {
    this.children.removeAll(true);
    this.input.keyboard?.removeAllListeners();
    this.add.rectangle(480, 270, 960, 540, 0x10101e);
    title(this, 480, 24, "DEBUG · BOSS FIGHTS", 24, "#ffd23f");
    this.add.text(480, 48, "Straight into the boss room, in debug mode. This replaces your current save.", { fontFamily: FONT, fontSize: "11px", color: "#ff9b9b" }).setOrigin(0.5);
    const list = this.bosses();
    const per = Math.ceil(list.length / 3);
    const sp = Math.min(40, Math.floor(410 / Math.max(1, per)));
    list.forEach((b, i) => {
      const col = Math.floor(i / per);
      const r = i % per;
      const name = BOSS_TEXT[b.boss]?.name ?? b.boss.toUpperCase();
      button(this, 170 + col * 310, 84 + r * sp, `Ch ${b.ch} · ${name}`, () => this.goBoss(b), { w: 296, h: sp - 5, size: 11 });
    });
    button(this, 90, 516, "◀ BACK", () => ((this.page = "main"), this.draw()), { w: 140, h: 30, size: 13 });
    this.input.keyboard?.on("keydown-ESC", () => ((this.page = "main"), this.draw()));
  }

  private draw() {
    if (this.page === "bosses") return this.drawBosses();
    this.children.removeAll(true);
    this.input.keyboard?.removeAllListeners();
    this.add.rectangle(480, 270, 960, 540, 0x10101e);
    title(this, 480, 24, "DEBUG · SKIP TO…", 24, "#ffd23f");
    this.add.text(480, 48, "Starts a fresh save at the start of whatever you pick. This replaces your current save.", { fontFamily: FONT, fontSize: "11px", color: "#ff9b9b" }).setOrigin(0.5);
    button(this, 480, 78, `PLAYING AS: ${CHARACTERS[this.pl].name}   (tap to change)`, () => {
      this.pl = PLAYABLE_ORDER[(PLAYABLE_ORDER.indexOf(this.pl) + 1) % PLAYABLE_ORDER.length];
      this.draw();
    }, { w: 380, h: 30, size: 13 });
    const head = (x: number, y: number, t: string) => this.add.text(x, y, t, { fontFamily: FONT, fontSize: "13px", color: "#86efac", fontStyle: "bold" }).setOrigin(0.5);
    head(150, 108, "CHAPTERS");
    CHAPTERS.forEach((c, i) => button(this, 150, 138 + i * 44, `${c.n}. ${c.title}`, () => this.goCh(c.n), { w: 270, h: 36, size: 12 }));
    const arcs = arcsFor(this.pl).slice().sort((a, b) => this.arcCh(a) - this.arcCh(b));
    head(635, 108, "SIDE QUESTS (goes straight to the quest)");
    const per = Math.ceil(arcs.length / 2);
    const sp = Math.min(36, Math.floor(380 / Math.max(1, per)));
    arcs.forEach((a, i) => {
      const col = i < per ? 0 : 1;
      const r = i % per;
      button(this, 482 + col * 308, 130 + r * sp, `Ch ${this.arcCh(a)} · ${a.title}`, () => this.goArc(a), { w: 300, h: sp - 4, size: 11 });
    });
    button(this, 90, 516, "◀ BACK", () => switchTo(this, "Title"), { w: 140, h: 30, size: 13 });
    button(this, 150, 138 + CHAPTERS.length * 44 + 8, "⚔ BOSS FIGHTS", () => ((this.page = "bosses"), this.draw()), { w: 270, h: 40, size: 14, color: 0x7f1d1d });
    this.add.text(480, 516, "DEBUG MODE: all upgrades · every gun (strongest in hand) · infinite Krezz · IBS always ready", { fontFamily: FONT, fontSize: "11px", color: "#86efac" }).setOrigin(0.5);
    this.input.keyboard?.on("keydown-ESC", () => switchTo(this, "Title"));
  }
}
