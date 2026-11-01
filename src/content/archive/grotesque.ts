import type { ArchiveEntry, Line, MeetingScript } from "../../data/types";
import { canon, dir } from "../dsl";
import { GROTESQUE, type GrotesqueLine } from "./grotesqueQuotes";

/**
 * The harder-edged side of the group chat: the Unredacted Annex in the Archive, "Any Other Business" at the end of
 * every town hall meeting, and extra lines in Drongus's leak previews.
 */

type Theme = GrotesqueLine["theme"];

const ANNEX: Record<Theme, { title: string; official: string; footnote: string; annotation?: string }> = {
  body: { title: "UNREDACTED: On The Human Body", official: "Krelworld citizens are clean, odourless and have never, at any point, had a body.", footnote: "The Archive's medical officer has resigned.", annotation: "We are all disgusting. This is documented." },
  sex: { title: "UNREDACTED: Matters Of The Flesh", official: "There is no sex in Krelworld. Citizens are delivered fully grown by the Krambulance.", footnote: "Pages 4 to 19 are stuck together. The Archive is not investigating.", annotation: "Ahem." },
  roast: { title: "UNREDACTED: The Roast Ledger", official: "Krelworlders have only ever spoken kindly of one another.", footnote: "All parties remain friends. Somehow.", annotation: "Every word of it deserved." },
  dark: { title: "UNREDACTED: The Dark Ages", official: "Nothing bad has ever been said in Krelworld.", footnote: "Several of these were sent before 9am.", annotation: "Bleak. Accurate." },
  threat: { title: "UNREDACTED: Threats Made In Jest (Allegedly)", official: "No citizen of Krelworld has ever threatened another.", footnote: "None of these threats were carried out. The Archive checked. Twice.", annotation: "Allegedly." },
  food: { title: "UNREDACTED: The Food Crimes Tribunal", official: "Krelworld cuisine is wholesome and widely admired.", footnote: "Environmental Health have been informed.", annotation: "I'd still eat it." },
  rant: { title: "UNREDACTED: The Rants", official: "Krelworld discourse is calm, measured and civil.", footnote: "Caps lock was invented in Krelworld. This is why.", annotation: "Fair points, all." },
  polson: { title: "UNREDACTED: The Polson Dossier", official: "Polson is a private citizen about whom nothing has ever been said.", footnote: "Polson has not read this file. Nobody has told him it exists.", annotation: "For his own good." },
  misc: { title: "UNREDACTED: Miscellaneous Depravity", official: "This drawer is empty.", footnote: "The drawer is not empty.", annotation: "The drawer is never empty." },
};

const THEMES: Theme[] = ["roast", "body", "sex", "food", "dark", "threat", "polson", "rant", "misc"];

/** Group consecutive lines that belong to one exchange. */
function exchanges(theme: Theme): GrotesqueLine[][] {
  const out: GrotesqueLine[][] = [];
  for (const g of GROTESQUE.filter((x) => x.theme === theme)) {
    const last = out[out.length - 1];
    if (g.group && last && last[0].group === g.group) last.push(g);
    else out.push([g]);
  }
  return out;
}

const annexId = (t: Theme) => `arch_unredacted_${t}`;

/** One Archive entry per theme (the first 12 lines of it). */
export const ANNEX_ENTRIES: ArchiveEntry[] = THEMES.filter((t) => GROTESQUE.some((g) => g.theme === t)).map((t) => {
  const lines = GROTESQUE.filter((g) => g.theme === t).slice(0, 12);
  const a = ANNEX[t];
  return {
    id: annexId(t),
    title: a.title,
    era: "KRELWORLD",
    date: `${lines[0].date} – ${lines[lines.length - 1].date}`,
    official: a.official,
    original: [dir("RECOVERED FROM THE GROUP CHAT. UNEDITED. (Some words starred out by the Archive's lawyer.)"), ...lines.map((l) => canon(l.id))],
    footnote: a.footnote,
    drongusAnnotation: a.annotation,
  };
});

const MINUTES = [
  "The minutes record a long silence.",
  "The stenographer has stopped typing and is looking at her hands.",
  "Somebody at the back says 'fair'. Nobody disagrees.",
  "The meeting is adjourned. Nobody makes eye contact on the way out.",
  "Proctus asks if that can be struck from the record. It cannot.",
  "A citizen in the gallery is sick into his own hat.",
];

/** "Any Other Business": a chunk of the real chat read into the minutes at the end of a meeting. */
function anyOtherBusiness(i: number): { beats: Line[]; unlock?: string } {
  const avail = THEMES.filter((t) => GROTESQUE.some((g) => g.theme === t));
  if (!avail.length) return { beats: [] };
  const theme = avail[i % avail.length];
  const ex = exchanges(theme);
  // two exchanges (or one long one), different for each meeting
  const pick: GrotesqueLine[] = [];
  for (let k = 0; k < ex.length && pick.length < 3; k++) {
    const e = ex[(Math.floor(i / avail.length) * 2 + k) % ex.length];
    if (pick.length && pick.length + e.length > 4) continue;
    pick.push(...e);
  }
  return {
    beats: [
      dir("ANY OTHER BUSINESS."),
      dir("Drongus puts something on the big screen. 'For the minutes,' he says. It's from the group chat. It has not been edited."),
      ...pick.map((l) => canon(l.id)),
      dir(MINUTES[i % MINUTES.length]),
    ],
    unlock: annexId(theme),
  };
}

/** Every meeting ends with Any Other Business and unlocks that theme's Annex entry. */
export function withAnyOtherBusiness(list: MeetingScript[]): MeetingScript[] {
  return list.map((m, i) => {
    const aob = anyOtherBusiness(i);
    if (!aob.beats.length) return m;
    return { ...m, beats: [...m.beats, ...aob.beats], unlocksArchive: [...(m.unlocksArchive ?? []), ...(aob.unlock ? [aob.unlock] : [])] };
  });
}

let leakCursor = 0;
/** Two extra, nastier lines for one of Drongus's leak previews. */
export function leakExtras(): Line[] {
  const pool = GROTESQUE.filter((g) => !g.group && g.text.length < 140);
  if (!pool.length) return [];
  const out = [pool[leakCursor % pool.length], pool[(leakCursor + 7) % pool.length]];
  leakCursor += 3;
  return out.map((l) => canon(l.id));
}
