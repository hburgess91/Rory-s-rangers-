import { synth } from "./audio/Synth";
import { offerFacts, adoptFact } from "../data/historicalRevisions";
import { requiredArcSteps } from "./systems/arcs";
import Phaser from "phaser";
import type { Line, PlayableId } from "../data/types";
import { G } from "./G";
import { chapterDef, CHAPTERS } from "../content/chapters/chapters";
import { evalCond } from "./systems/conditions";
import { maxHp } from "./systems/stats";
import { activeMods } from "../data/historicalRevisions";
import { crystalCount, CRYSTALS_NEEDED } from "./systems/crystals";

export interface Next {
  scene: string;
  data?: any;
}

/** Stop every running scene, then start `key`. Overlays never leak between modes. */
export function switchTo(from: Phaser.Scene, key: string, data?: any) {
  // each place sets its own background ambience; anywhere else is quiet
  synth.ambience(null);
  synth.weatherSound(null);
  const mgr = from.game.scene;
  for (const sc of mgr.getScenes(false)) {
    const k = sc.scene.key;
    if (k === from.scene.key) continue;
    if (mgr.isActive(k) || mgr.isPaused(k) || mgr.isSleeping(k)) mgr.stop(k);
  }
  from.scene.start(key, data);
}

/** Fade the camera out, then run `fn`. If the fade can't start (another one is running) it still moves on. */
export function fadeThen(scene: Phaser.Scene, ms: number, fn: () => void) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    fn();
  };
  const cam = scene.cameras.main;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
  cam.fadeOut(ms);
  window.setTimeout(go, ms + 150);
}

/** In-level detours: "drive" and "beepbeep" are their own scenes; anything else is a minigame mode. Then back into the level. */
export function runChain(from: Phaser.Scene, chain: string[], resume: { dungeon: string; room: number }) {
  const [next, ...rest] = chain;
  if (!next) return switchTo(from, "Dungeon", resume);
  const key = next === "drive" ? "Drive" : next === "beepbeep" ? "BeepBeep" : "Minigame";
  switchTo(from, key, { mode: next, chain: rest, resume });
}

export function goNext(from: Phaser.Scene, next: Next | null | undefined) {
  if (!next) return switchTo(from, "Hub");
  switchTo(from, next.scene, next.data);
}

/** NEW GAME: prologue meeting → the song → Krelford. */
/** After the prologue meeting: the Great Silence, then the emergency session, then out into town. */
export const AFTER_PROLOGUE = { scene: "Cutscene", data: { script: "ch1_intro", bg: "messenger", music: "meeting", next: { scene: "Meeting", data: { id: "emergency_reaction_session", next: { scene: "Hub", data: { at: "TOWN_HALL", chain: true } } } } } };

/** A new game starts at home. */
export function startNewRun(from: Phaser.Scene, player: PlayableId, ngPlus = 0) {
  G.newRun(player, ngPlus);
  switchTo(from, "Home", {});
}

export function continueRun(from: Phaser.Scene) {
  if (!G.loadRun()) return false;
  if (G.s.phase === "ended") {
    switchTo(from, "Ending", { replay: true });
    return true;
  }
  if (G.s.chapter === 1 && !G.s.flags.prologue_done) {
    // not been to the first meeting yet: back home (or outside, if you've already left the house)
    switchTo(from, G.s.flags.flyover_seen ? "Hub" : "Home", G.s.flags.flyover_seen ? { at: "HOME" } : {});
    return true;
  }
  // the song went unanswered: straight on into the emergency session
  if (G.s.chapter === 1 && !G.s.flags.met_emergency) {
    switchTo(from, "Meeting", { id: "emergency_reaction_session", next: { scene: "Hub", data: { at: "TOWN_HALL", chain: true } } });
    return true;
  }
  switchTo(from, "Hub");
  return true;
}

export function currentStep(): { text: string; target?: string } | null {
  const s = G.s;
  if (s.chapter === 1 && !s.flags.prologue_done) return { text: "Go to Krelford Town Hall: the cabinet's Lore Appreciation Inquiry is about to start", target: "TOWN_HALL" };
  if (s.chapter === 6 && !s.flags.ch6_ready)
    return { text: "⚠ LAST CHANCE: stock up on weapons, ammo, upgrades, Krezzcoin and Krokens (Kreddle Exchange, slots, bank, armoury). Then go to the Town Hall to begin Chapter 6", target: "TOWN_HALL" };
  const ch = chapterDef(s.chapter);
  for (const st of ch.steps) {
    if (!evalCond(st.done, s)) {
      // required side quests come before the dungeon
      if (st.id === "s_dungeon") {
        const req = requiredArcSteps(s)[0];
        if (req) return { text: `SIDE QUEST (required): ${req.arc.title} — ${req.step.text}`, target: req.step.at === "FIELD" ? undefined : req.step.at };
      }
      return { text: st.text, target: st.target };
    }
  }
  return null;
}

/** What happens when you walk into Town Hall right now. */
export type TownHallAction = { kind: "meeting"; id: string } | { kind: "outro" } | { kind: "fact" } | { kind: "none" };

export function townHallAction(): TownHallAction {
  const s = G.s;
  const f = s.flags;
  const n = s.chapter;
  if (n === 1) {
    if (!f.prologue_done) return { kind: "meeting", id: "lore_appreciation_inquiry" };
    if (!f.met_emergency) return { kind: "meeting", id: "emergency_reaction_session" };
    if (f.ch1_clear && f.wildern_destroyed && !f.ch1_fact) return f.krazy_fact_ready ? { kind: "fact" } : { kind: "meeting", id: "krazy_fact_emergency" };
  }
  if (n === 3 && !f.cronster_briefed) return { kind: "meeting", id: "cronster_briefing" };
  if (n === 5 && !f.krebon_question) return { kind: "meeting", id: "krebon_question" };
  if (n === 7 && !f.final_reading) return { kind: "meeting", id: "final_reading" };
  if (n >= 2 && n <= 6 && f[`ch${n}_clear`] && !f[`ch${n}_fact`]) return f[`ch${n}_outro`] ? { kind: "fact" } : { kind: "outro" };
  return { kind: "none" };
}

/** What the Archive door does right now. */
export function archiveAction(): { kind: "meeting"; id: string } | { kind: "browse" } {
  const s = G.s;
  if (s.chapter === 1 && s.flags.met_emergency && !s.flags.founding_seen) return { kind: "meeting", id: "founding_cabinet" };
  if (s.chapter === 2 && !s.flags.fragmar_briefed) return { kind: "meeting", id: "fragmar_briefing" };
  if (s.chapter === 4 && s.flags.vig_crobley_news && !s.flags.crobley_briefed) return { kind: "meeting", id: "crobley_briefing" };
  return { kind: "browse" };
}

/** Is the chapter dungeon door open? */
export function dungeonOpen(): { open: boolean; why?: string } {
  const s = G.s;
  const ch = chapterDef(s.chapter);
  const idx = ch.steps.findIndex((st) => st.id === "s_dungeon");
  for (let i = 0; i < idx; i++) {
    if (!evalCond(ch.steps[i].done, s)) return { open: false, why: ch.steps[i].text };
  }
  if (s.flags[`ch${s.chapter}_clear`]) return { open: false, why: "Already cleared. Report to the Town Hall." };
  // Da Drongus Dungeon is sealed until you've got every cum crystal
  if (ch.dungeonDoor === "CITADEL" && crystalCount(s) < CRYSTALS_NEEDED) return { open: false, why: `DA DRONGUS DUNGEON is sealed. Cum crystals: ${crystalCount(s)}/${CRYSTALS_NEEDED}. Every main boss carries one.` };
  const req = requiredArcSteps(s);
  if (req.length) return { open: false, why: `Not yet. Side quests first (${req.length} left): ${req.map((c) => c.arc.title).join(", ")}. Next: ${req[0].step.text}` };
  return { open: true };
}

/** End of chapter: the cabinet enters a Krazy Fact into the record on your behalf, then the next chapter starts. */
export function endChapter() {
  const s = G.s;
  if (s.flags[`ch${s.chapter}_fact`]) return;
  const f = offerFacts(s, 1)[0];
  if (f && adoptFact(s, f.id)) {
    G.emit("toast", { title: "KRAZY FACT ENTERED INTO THE RECORD", text: `"${f.fact}" ${f.effect}` });
    G.drongus("krazy_fact");
  }
  advanceChapter();
}

/** Called after a Krazy Fact is adopted at the end of a chapter. */
export function advanceChapter() {
  const s = G.s;
  s.flags[`ch${s.chapter}_fact`] = true;
  s.chapter = Math.min(7, s.chapter + 1);
  s.phase = "hub";
  s.hp = maxHp(s);
  s.banRisk = 0;
  s.intoxication = Math.max(0, s.intoxication - 40);
  delete s.flags.buff;
  // resentment drifts: Krazy Facts please him a little; the APPRECIATED fact decays it
  s.drongusResentment = Math.max(0, s.drongusResentment + 6 - activeMods(s).resentmentDecay * 8);
  G.save();
}

export function chapterIntroLines(n: number, player: PlayableId): Line[] {
  const ch = CHAPTERS[n - 1];
  if (!ch) return [];
  return n === 1 ? ch.playerScene[player] : [...ch.intro, ...ch.playerScene[player]];
}
