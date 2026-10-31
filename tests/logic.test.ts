import { describe, expect, it } from "vitest";
import { narrativeActor, resolveLine, proctusTitle } from "../src/game/systems/narrative";
import { newGameState, SaveManager, MemoryStore, deserialize, serialize, migrateState } from "../src/game/systems/state";
import { activeMods, adoptFact, offerFacts } from "../src/data/historicalRevisions";
import { applyReaction, resentmentLabel } from "../src/game/systems/reactions";
import { addBanRisk, enterExile, BAN_MAX } from "../src/game/systems/ban";
import { parseScreenplay, validateEpisode, beatDuration } from "../src/game/systems/tv";
import { evalCond, pickWhere } from "../src/game/systems/conditions";
import { PLAYABLE_IDS } from "../src/data/types";

describe("Proctus substitution", () => {
  it("replaces the player's ministerial role with Proctus, never anyone else", () => {
    expect(narrativeActor("KREZWONK", "KREZWONK")).toBe("PROCTUS");
    expect(narrativeActor("KREZWONK", "SCROMBUS")).toBe("KREZWONK");
    expect(narrativeActor("DRONGUS", "FLENKY")).toBe("DRONGUS");
  });

  it("role lines go to Proctus in present-day scenes, with his own text and title", () => {
    const s = newGameState("KREZWONK");
    const r = resolveLine({ s: "KREZWONK", t: "I foresaw this.", role: true, proctus: "I foresaw lunch." }, s)!;
    expect(r.s).toBe("PROCTUS");
    expect(r.t).toBe("I foresaw lunch.");
    expect(r.speakerTitle).toBe(proctusTitle("KREZWONK"));
  });

  it("archive (historical) scenes never substitute", () => {
    const s = newGameState("KREZWONK");
    const r = resolveLine({ s: "KREZWONK", t: "So what can we say...", role: true, proctus: "nope" }, s, { historical: true })!;
    expect(r.s).toBe("KREZWONK");
    expect(r.t).toBe("So what can we say...");
  });

  it("non-role lines spoken by the player stay with the player", () => {
    const s = newGameState("GRONNY");
    const r = resolveLine({ s: "GRONNY", t: "Fair enough." }, s)!;
    expect(r.s).toBe("GRONNY");
  });

  it("canon lines pull text from the registry", () => {
    const s = newGameState("FLENKY");
    const r = resolveLine({ s: "DRONGUS", t: "", canon: "drongi" }, s)!;
    expect(r.t).toBe("Drongi");
  });

  it("per-player variants apply", () => {
    const s = newGameState("MIKEY");
    const r = resolveLine({ s: "MIKEY", t: "a", variants: { MIKEY: "b" } }, s)!;
    expect(r.t).toBe("b");
  });
});

describe("save / load", () => {
  it("round-trips through a store", () => {
    const store = new MemoryStore();
    const sm = new SaveManager(store);
    const s = newGameState("KREBON");
    s.coins = 123;
    s.flags.ch1_clear = true;
    s.revisions.push("FIZZY_VEG");
    sm.save(s);
    const back = sm.load()!;
    expect(back.player).toBe("KREBON");
    expect(back.coins).toBe(123);
    expect(back.flags.ch1_clear).toBe(true);
    expect(back.revisions).toEqual(["FIZZY_VEG"]);
  });

  it("rejects garbage and repairs partial saves", () => {
    expect(deserialize("not json")).toBeNull();
    expect(deserialize(JSON.stringify({ player: "NOBODY" }))).toBeNull();
    const repaired = migrateState({ player: "SCROMBUS", chapter: 99, phase: "dungeon", banRisk: 500 })!;
    expect(repaired.chapter).toBe(7);
    expect(repaired.phase).toBe("hub"); // never resume mid-dungeon
    expect(repaired.banRisk).toBeLessThan(100);
    expect(Array.isArray(repaired.revisions)).toBe(true);
  });

  it("serialize is JSON", () => {
    expect(() => JSON.parse(serialize(newGameState("FLENKY")))).not.toThrow();
  });

  it("meta survives and keeps settings defaults", () => {
    const sm = new SaveManager(new MemoryStore());
    const m = sm.loadMeta();
    m.archiveUnlocked.push("arch_motto");
    sm.saveMeta(m);
    const back = sm.loadMeta();
    expect(back.archiveUnlocked).toContain("arch_motto");
    expect(back.settings.master).toBeGreaterThan(0);
  });
});

describe("historical revisions (Krazy Facts)", () => {
  it("combine modifiers", () => {
    const s = newGameState("FLENKY");
    adoptFact(s, "FIZZY_VEG");
    adoptFact(s, "THREAT_PURPLE");
    const m = activeMods(s);
    expect(m.beerHeal).toBe(10);
    expect(m.playerDamageMult).toBeCloseTo(1.2);
    expect(m.enemyDamageMult).toBeCloseTo(1.2);
    expect(m.enemySpeedMult).toBeCloseTo(1.1);
  });

  it("cannot adopt the same fact twice or unknown facts", () => {
    const s = newGameState("FLENKY");
    expect(adoptFact(s, "TAP_SENTIENT")).toBe(true);
    expect(adoptFact(s, "TAP_SENTIENT")).toBe(false);
    expect(adoptFact(s, "NOPE")).toBe(false);
  });

  it("offers three unused facts, NG+ only facts hidden on a first run", () => {
    const s = newGameState("FLENKY");
    const offer = offerFacts(s);
    expect(offer).toHaveLength(3);
    expect(new Set(offer.map((f) => f.id)).size).toBe(3);
    expect(offer.some((f) => f.ngPlusOnly)).toBe(false);
  });
});

describe("reactions", () => {
  it("tally, set flags and move resentment", () => {
    const s = newGameState("FLENKY");
    const before = s.drongusResentment;
    applyReaction(s, "song", "LAUGH");
    expect(s.reactionsGiven.LAUGH).toBe(1);
    expect(s.flags.react_song).toBe("LAUGH");
    expect(s.drongusResentment).toBeLessThan(before);
    applyReaction(s, "song2", "SEEN");
    expect(s.drongusResentment).toBeGreaterThan(before - 3);
    expect(typeof resentmentLabel(s.drongusResentment)).toBe("string");
  });
});

describe("Ban Risk", () => {
  it("bans at max and resets on exile", () => {
    const s = newGameState("KREZMAR");
    expect(addBanRisk(s, 60)).toBe(false);
    expect(addBanRisk(s, 60)).toBe(true);
    expect(s.banRisk).toBe(BAN_MAX);
    enterExile(s);
    expect(s.banRisk).toBe(0);
    expect(s.banCount).toBe(1);
  });

  it("Flenky gets banned faster (tradition)", () => {
    const f = newGameState("FLENKY");
    const k = newGameState("KREZMAR");
    addBanRisk(f, 20);
    addBanRisk(k, 20);
    expect(f.banRisk).toBeGreaterThan(k.banRisk);
  });
});

describe("TV episode parsing", () => {
  const script = `
# THE TITLE
INT. OFFICE - NIGHT
JENNY CUMMING: Christopher… can I talk to you?
CHRISTOPHER THICK (smug): Serious? With you?
(Christopher stops smiling.)
[LAUGHTER]
[SMASH CUT]
[SFX smash]
[MUSIC ominous start]
[BLOCK JENNY lap]
EXT. NYC SKYLINE - DAY
`;
  it("parses screenplay text into typed beats", () => {
    const beats = parseScreenplay(script);
    const types = beats.map((b) => b.type);
    expect(types).toEqual(["titleCard", "shot", "speaker", "speaker", "direction", "audience", "transition", "sfx", "music", "blocking", "shot"]);
    const sp = beats[3] as any;
    expect(sp.character).toBe("CHRISTOPHER THICK");
    expect(sp.emotion).toBe("smug");
  });

  it("validates episodes and catches dialogue before a shot", () => {
    const ok = validateEpisode({ id: "x", show: "s", title: "t", episodeNumber: 1, channel: "C", beats: parseScreenplay(script) });
    expect(ok.ok).toBe(true);
    const bad = validateEpisode({ id: "y", show: "s", title: "t", episodeNumber: 1, channel: "C", beats: [{ type: "speaker", character: "A", text: "hi" }] });
    expect(bad.ok).toBe(false);
  });

  it("subtitle timing grows with text length", () => {
    expect(beatDuration({ type: "speaker", character: "A", text: "hi" })).toBeLessThan(beatDuration({ type: "speaker", character: "A", text: "a much longer line of dialogue that takes a while" }));
  });
});

describe("dialogue conditions", () => {
  it("evaluates every key with AND semantics", () => {
    const s = newGameState("GRONNY");
    s.chapter = 3;
    s.flags.a = true;
    s.revisions.push("SALMON_STREETS");
    s.intoxication = 50;
    expect(evalCond({ flag: "a", chapterAtLeast: 3, player: "GRONNY" }, s)).toBe(true);
    expect(evalCond({ flag: "a", chapterAtLeast: 4 }, s)).toBe(false);
    expect(evalCond({ notPlayer: ["GRONNY", "FLENKY"] }, s)).toBe(false);
    expect(evalCond({ revision: "SALMON_STREETS", intoxAtLeast: 40 }, s)).toBe(true);
    expect(evalCond({ any: [{ flag: "nope" }, { chapter: 3 }] }, s)).toBe(true);
    expect(evalCond({ not: { flag: "a" } }, s)).toBe(false);
    expect(evalCond(undefined, s)).toBe(true);
  });

  it("pickWhere only picks passing items", () => {
    const s = newGameState("FLENKY");
    const items = [{ id: 1, cond: { flag: "x" } }, { id: 2 }];
    for (let i = 0; i < 20; i++) expect(pickWhere(items, s)!.id).toBe(2);
  });

  it("every playable id is valid", () => {
    for (const id of PLAYABLE_IDS) expect(() => newGameState(id)).not.toThrow();
  });
});
