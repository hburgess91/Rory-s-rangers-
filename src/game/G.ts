import type { GameState, MetaState, PlayableId, ReactionChoice } from "../data/types";
import { SaveManager, newGameState, unlockArchive, markWatched } from "./systems/state";
import { activeMods } from "../data/historicalRevisions";
import { maxHp } from "./systems/stats";
import { synth } from "./audio/Synth";
import { DRONGUS_SEQUENCES } from "../content/dialogue/drongusMessages";
import { evalCond } from "./systems/conditions";
import { applyReaction } from "./systems/reactions";
import { ARCHIVE_BY_ID } from "../content/archive/historicalScenes";

type Listener = (ev: string, data?: any) => void;

/** The one shared game context. Scenes read and write the current run through this. */
class GameContext {
  saves = new SaveManager();
  meta: MetaState = this.saves.loadMeta();
  private _state: GameState | null = null;
  private listeners: Listener[] = [];
  /** Non-persistent runtime info. */
  rt = {
    dungeonId: "",
    room: 0,
    lastToastAt: 0,
    timerEnd: 0,
    /** Fart meter 0-100 (carried between rooms of one dungeon). */
    fart: 0,
    /** Town time (ms) until the next chance of a posse beat-up. */
    beatupIn: undefined as number | undefined,
  };

  constructor() {
    synth.setVolumes(this.meta.settings);
  }

  get s(): GameState {
    if (!this._state) this._state = newGameState("FLENKY");
    return this._state;
  }

  hasRun(): boolean {
    return !!this._state;
  }

  newRun(player: PlayableId, ngPlus = 0) {
    this._state = newGameState(player, ngPlus, this.meta);
    this._state.hp = maxHp(this._state);
    this.save();
  }

  loadRun(): boolean {
    const st = this.saves.load();
    if (!st) return false;
    this._state = st;
    if (this._state.hp > maxHp(this._state)) this._state.hp = maxHp(this._state);
    return true;
  }

  save() {
    if (this._state) this.saves.save(this._state);
    this.saves.saveMeta(this.meta);
  }

  saveMeta() {
    this.saves.saveMeta(this.meta);
    synth.setVolumes(this.meta.settings);
  }

  mods() {
    return activeMods(this.s);
  }

  unlockArchive(id: string) {
    const fresh = unlockArchive(this.s, this.meta, id);
    if (fresh) this.emit("toast", { title: "HISTORICAL ARCHIVE UPDATED", text: ARCHIVE_BY_ID[id]?.title ?? id });
    return fresh;
  }

  watched(id: string) {
    markWatched(this.s, this.meta, id);
  }

  react(context: string, choice: ReactionChoice) {
    const eff = applyReaction(this.s, context, choice);
    synth.play("pop");
    this.emit("toast", { title: "REACTION", text: eff.toast });
    this.drongus(`react_${choice}`);
    return eff;
  }

  /** Fire Drongus message sequences for a trigger (Messenger toasts, spaced out). */
  drongus(trigger: string) {
    if (!this._state) return;
    const s = this._state;
    for (const seq of DRONGUS_SEQUENCES) {
      if (seq.trigger !== trigger) continue;
      if (!seq.repeat && s.flags[`dseq_${seq.id}`]) continue;
      if (!evalCond(seq.cond, s)) continue;
      s.flags[`dseq_${seq.id}`] = true;
      seq.messages.forEach((m, i) => {
        window.setTimeout(() => this.emit("ping", { from: "DRONGUS", text: m }), 900 + i * 1700);
      });
      break;
    }
  }

  on(fn: Listener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  emit(ev: string, data?: any) {
    for (const l of [...this.listeners]) l(ev, data);
  }
}

export const G = new GameContext();
