import type { CharacterId, GameState, Line, PlayableId, SpeakerId } from "../../data/types";
import { CHARACTERS } from "../../data/characters";
import { CANON } from "../../content/archive/canonQuotes";
import { evalCond } from "./conditions";

/**
 * The one global substitution rule.
 * If a present-day scene needs a character in their ministerial role, but that character is the
 * player, PROCTUS KRELMOR fills the seat. Archive scenes never call this.
 */
export function narrativeActor(required: SpeakerId, player: PlayableId): SpeakerId {
  return required === player ? "PROCTUS" : required;
}

export function isPlayable(id: SpeakerId): id is PlayableId {
  return !!CHARACTERS[id as string]?.playable;
}

/** The role Proctus is currently covering, e.g. "Acting Minister of Prophecy". */
export function proctusTitle(player: PlayableId): string {
  return CHARACTERS[player].proctusTitle ?? "Acting Minister";
}

export function proctusQuirk(player: PlayableId): string {
  return CHARACTERS[player].proctusQuirk ?? "";
}

/** A resolved, ready-to-render line. */
export interface ResolvedLine extends Line {
  speakerName: string;
  speakerTitle?: string;
}

export interface ResolveOptions {
  historical?: boolean;
}

/**
 * Resolve a single line for the current game state:
 * - pulls canon text,
 * - applies per-player variants,
 * - swaps role lines to Proctus when the player holds that role (present-day only).
 * Returns null if the line's condition fails.
 */
export function resolveLine(line: Line, s: GameState, opts: ResolveOptions = {}): ResolvedLine | null {
  if (!evalCond(line.cond, s)) return null;
  let speaker: SpeakerId = line.s;
  let text = line.t;
  if (line.canon) {
    const c = CANON[line.canon];
    if (c) {
      speaker = line.s || c.speaker;
      if (!text) text = c.text;
    }
  }
  if (line.variants && line.variants[s.player] !== undefined) {
    text = line.variants[s.player] as string;
  }
  let title: string | undefined;
  if (!opts.historical && line.role && speaker === s.player) {
    speaker = "PROCTUS";
    text = line.proctus ?? `(reading the wrong cue card) "${text}"... is that right? It says ${CHARACTERS[s.player].name} on the back.`;
    title = proctusTitle(s.player);
  } else if (speaker === "PROCTUS" && !opts.historical) {
    title = proctusTitle(s.player);
  }
  const def = CHARACTERS[speaker as string];
  return {
    ...line,
    s: speaker,
    t: text,
    speakerName: def ? def.name : String(speaker),
    speakerTitle: title,
  };
}

/** Characters physically present in a present-day cabinet scene (player + everyone else, Proctus in the player's ministry). */
export function cabinetAttendees(s: GameState): CharacterId[] {
  const list: CharacterId[] = ["KREZWONK", "SCROMBUS", "KREBLIS", "CRONGUS", "KREBON", "KREZMAR", "GRONNY", "FLENKY", "MIKEY"];
  const out: CharacterId[] = [];
  for (const id of list) {
    out.push(id);
  }
  out.push("PROCTUS");
  return out;
}
