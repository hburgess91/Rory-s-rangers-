import { describe, expect, it } from "vitest";
import { MEETINGS } from "../src/content/meetings";
import { ARCHIVE, ARCHIVE_BY_ID } from "../src/content/archive/historicalScenes";
import { ALL_EPISODES } from "../src/content/television/channels";
import { validateEpisode } from "../src/game/systems/tv";
import { DUNGEONS } from "../src/data/dungeons";
import { ENEMIES } from "../src/data/enemies";
import { BOSS_TEXT } from "../src/content/bosses";
import { CHAPTERS } from "../src/content/chapters/chapters";
import { PLAYABLE_IDS } from "../src/data/types";
import { BARKS, PLAYER_BARKS } from "../src/content/dialogue/ambient";
import { NPC_TALK } from "../src/content/dialogue/npc";
import { PUB_CONVERSATIONS } from "../src/content/dialogue/pub";
import { DRONGUS_SEQUENCES } from "../src/content/dialogue/drongusMessages";
import { CHATTER } from "../src/content/dialogue/chatter";
import { PERSONAL_QUESTS, MINISTRY_QUESTS } from "../src/content/quests";
import { EPILOGUES, ENDINGS } from "../src/content/endings";
import { CANON_LIST } from "../src/content/archive/canonQuotes";
import { CHARACTERS } from "../src/data/characters";

// The game must not ship slurs from the source chats. This list is checked against every curated string.
const BANNED = [/\bnigg/i, /\bfag/i, /\bpaki\b/i, /\bchink/i, /\bretard\b/i, /\btrann/i, /\bgook/i, /lolicon/i, /child porn/i];

function allStrings(o: unknown, out: string[] = []): string[] {
  if (typeof o === "string") out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => allStrings(x, out));
  else if (o && typeof o === "object") Object.values(o).forEach((x) => allStrings(x, out));
  return out;
}

describe("content integrity", () => {
  it("has at least 8 town meetings, each with beats and an agenda", () => {
    expect(Object.keys(MEETINGS).length).toBeGreaterThanOrEqual(8);
    for (const m of Object.values(MEETINGS)) {
      expect(m.beats.length).toBeGreaterThan(5);
      expect(m.agenda.length).toBeGreaterThan(0);
      for (const a of m.unlocksArchive ?? []) expect(ARCHIVE_BY_ID[a], `${m.id} -> ${a}`).toBeTruthy();
    }
  });

  it("archive entries are unique and have original records", () => {
    const ids = new Set(ARCHIVE.map((a) => a.id));
    expect(ids.size).toBe(ARCHIVE.length);
    expect(ARCHIVE.length).toBeGreaterThanOrEqual(6);
    for (const a of ARCHIVE) expect(a.original.length).toBeGreaterThan(0);
  });

  it("every TV episode validates", () => {
    for (const e of ALL_EPISODES) {
      const v = validateEpisode(e);
      expect(v.errors, e.id).toEqual([]);
    }
    expect(ALL_EPISODES.find((e) => e.id === "tcc_ep7")).toBeTruthy();
  });

  it("dungeons reference real enemies and bosses", () => {
    for (const d of Object.values(DUNGEONS)) {
      if (d.id !== "sanmik_hangout") expect(d.rooms.at(-1)?.boss, d.id).toBeTruthy();
      for (const r of d.rooms) {
        for (const w of r.waves ?? []) for (const [t] of w) expect(ENEMIES[t], `${d.id}:${t}`).toBeTruthy();
        if (r.boss) expect(BOSS_TEXT[r.boss]).toBeTruthy();
      }
    }
    for (const e of Object.values(ENEMIES)) if (e.spawns) expect(ENEMIES[e.spawns]).toBeTruthy();
  });

  it("every chapter has an altered scene for every playable character", () => {
    expect(CHAPTERS).toHaveLength(6);
    for (const c of CHAPTERS) for (const p of PLAYABLE_IDS) expect(c.playerScene[p]?.length, `${c.n}/${p}`).toBeGreaterThan(0);
  });

  it("bark density meets the brief", () => {
    for (const id of ["SCROMBUS", "KREZMAR", "KREBLIS", "KREZWONK", "KREBON", "CRONGUS", "GRONNY", "FLENKY", "MIKEY", "DRONGUS", "PROCTUS"]) {
      expect(BARKS[id].length, id).toBeGreaterThanOrEqual(25);
    }
    for (const p of PLAYABLE_IDS) expect(PLAYER_BARKS[p].length, p).toBeGreaterThanOrEqual(15);
    expect(DRONGUS_SEQUENCES.length).toBeGreaterThanOrEqual(10);
    expect(PUB_CONVERSATIONS.length).toBeGreaterThanOrEqual(6);
    expect(CHATTER.length).toBeGreaterThanOrEqual(15);
  });

  it("every hub NPC has talk sets and every NPC acknowledges each other player", () => {
    for (const id of ["SCROMBUS", "KREZMAR", "KREBLIS", "KREZWONK", "KREBON", "CRONGUS", "GRONNY", "FLENKY", "MIKEY", "PROCTUS"]) {
      expect(NPC_TALK[id].length, id).toBeGreaterThan(5);
    }
    // Proctus has 3 variants per ministerial role
    for (const p of PLAYABLE_IDS) expect(NPC_TALK.PROCTUS.filter((t) => t.cond?.player === p).length, p).toBeGreaterThanOrEqual(3);
  });

  it("every playable has a personal quest, ministry quest and epilogue", () => {
    for (const p of PLAYABLE_IDS) {
      expect(PERSONAL_QUESTS.find((q) => q.player === p), p).toBeTruthy();
      expect(MINISTRY_QUESTS.find((q) => q.ministry === p), p).toBeTruthy();
      expect(EPILOGUES[p]).toBeTruthy();
      expect(CHARACTERS[p].signature).toBeTruthy();
      expect(CHARACTERS[p].branch?.length).toBe(3);
    }
    expect(Object.keys(ENDINGS)).toEqual(["LIKE", "LOVE", "LAUGH", "SEEN"]);
  });

  it("no slurs from the source chats made it into the game", () => {
    const strings = allStrings([MEETINGS, ARCHIVE, ALL_EPISODES, BARKS, PLAYER_BARKS, NPC_TALK, PUB_CONVERSATIONS, DRONGUS_SEQUENCES, CHATTER, CHAPTERS, PERSONAL_QUESTS, EPILOGUES, ENDINGS, CANON_LIST, BOSS_TEXT, CHARACTERS]);
    expect(strings.length).toBeGreaterThan(1000);
    for (const str of strings) for (const re of BANNED) expect(re.test(str), str).toBe(false);
  });
});
