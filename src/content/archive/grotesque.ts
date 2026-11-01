import type { Line } from "../../data/types";
import { canon } from "../dsl";
import { GROTESQUE } from "./grotesqueQuotes";

/** The harder-edged side of the group chat, slipped into Drongus's leak previews. */

let leakCursor = 0;
/** Two extra, nastier lines for one of Drongus's leak previews. */
export function leakExtras(): Line[] {
  const pool = GROTESQUE.filter((g) => !g.group && g.text.length < 140);
  if (!pool.length) return [];
  const out = [pool[leakCursor % pool.length], pool[(leakCursor + 7) % pool.length]];
  leakCursor += 3;
  return out.map((l) => canon(l.id));
}
