import { describe, expect, it } from "vitest";
import { ARCS } from "../src/content/arcs";
import { DUNGEONS } from "../src/data/dungeons";
import { BOSS_TEXT } from "../src/content/bosses";
import { newGameState } from "../src/game/systems/state";
import { currentArcStep, currentArcSteps, completeStep, maybeFinishArc, arcStepAt, spotFlag } from "../src/game/systems/arcs";

const HUB_SPOTS = ["UNIVERSITY", "GYM", "FIXER_UPPER", "BOOTH", "ABANDONED", "OLD_FLAT", "PUB", "BANK", "TOWN_HALL", "HOME", "ARCHIVE", "POLICE", "POLSON_ROAD", "FIELD", "BOGGOR_HOUSE"];
const VIGNETTES = ["kreltower_fall", "kreltower_saved", "pudding", "flatmate", "rival", "press_conference", "polson_gym", "polson_cctv"];
const MINIGAMES = ["bully", "deadlift", "girlfriends", "renovate", "runescape", "burpees", "facebook"];

describe("character side stories", () => {
  it("every arc step points at real places, fights, minigames and cutscenes", () => {
    for (const a of ARCS) {
      expect(a.steps.length).toBeGreaterThan(0);
      for (const st of a.steps) {
        expect(HUB_SPOTS, `${a.id}/${st.id}`).toContain(st.at);
        const k = st.step;
        if (k.kind === "arena") {
          const d = DUNGEONS[k.dungeon];
          expect(d, k.dungeon).toBeTruthy();
          expect(d.arenaFlag).toBeTruthy();
          const boss = d.rooms[d.rooms.length - 1].boss;
          expect(boss && BOSS_TEXT[boss], `${k.dungeon} boss text`).toBeTruthy();
        }
        if (k.kind === "vignette") expect(VIGNETTES).toContain(k.id);
        if (k.kind === "minigame") expect(MINIGAMES).toContain(k.mode);
        if (k.kind === "collect") for (const sp of k.spots) expect(sp.x > 0 && sp.x < 2560 && sp.y > 0 && sp.y < 1792).toBe(true);
        if (k.kind === "quiz") {
          expect(k.need).toBeLessThanOrEqual(k.questions.length);
          for (const q of k.questions) expect(q.correct).toBeLessThan(q.options.length);
        }
      }
    }
  });

  it("covers the six requested characters", () => {
    expect(ARCS.filter((a) => a.player !== "ALL").map((a) => a.player).sort()).toEqual(["CRONGUS", "FLENKY", "GRONNY", "KREBLIS", "KREZMAR", "KREZWONK", "SCROMBUS"]);
    expect(ARCS.filter((a) => a.player === "ALL").length).toBeGreaterThanOrEqual(2);
  });

  it("steps run in order and pay out once", () => {
    const s = newGameState("SCROMBUS");
    expect(currentArcStep(s)).toBeNull(); // locked until the first meeting
    s.flags.met_emergency = true;
    const a = ARCS.find((x) => x.player === "SCROMBUS")!;
    expect(currentArcStep(s)?.step.id).toBe("buy");
    expect(arcStepAt(s, "BANK")).toBeNull();
    for (const st of a.steps) completeStep(s, a, st);
    const before = s.coins;
    expect(maybeFinishArc(s)).toContain(a.title);
    expect(s.coins).toBe(before + a.reward.coins);
    expect(maybeFinishArc(s)).toBeNull();
  });

  it("arena steps complete from the arena flag", () => {
    const s = newGameState("GRONNY");
    s.flags.met_emergency = true;
    const a = ARCS.find((x) => x.player === "GRONNY")!;
    completeStep(s, a, a.steps[0]);
    const arena = a.steps.find((x) => x.step.kind === "arena")!;
    const k = arena.step as { kind: "arena"; dungeon: string };
    s.flags[DUNGEONS[k.dungeon].arenaFlag!] = true;
    expect(currentArcStep(s)).toBeNull();
  });
});

describe("Kreltower plot", () => {
  it("airport dungeon is timed and ends with Krozno", () => {
    const d = DUNGEONS.airport;
    expect(d.timerSec).toBeGreaterThan(60);
    expect(d.rooms[d.rooms.length - 1].boss).toBe("krozno");
  });
  it("Drongus's office plays the anthem", () => {
    expect(DUNGEONS.citadel.rooms.some((r) => r.event === "anthem")).toBe(true);
  });
});

describe("shared side quests", () => {
  it("appear for everyone once their chapter is reached", () => {
    const s = newGameState("MIKEY");
    s.flags.met_emergency = true;
    s.chapter = 1;
    expect(currentArcSteps(s).length).toBe(0);
    s.chapter = 3;
    expect(currentArcSteps(s).map((c) => c.arc.id).sort()).toEqual(["arc_boggor", "arc_cronster", "arc_polson_fit"]);
  });
  it("collect steps finish when every token is picked up", () => {
    const s = newGameState("MIKEY");
    s.flags.met_emergency = true;
    s.chapter = 2;
    const a = ARCS.find((x) => x.id === "arc_cronster")!;
    completeStep(s, a, a.steps[0]);
    completeStep(s, a, a.steps[1]);
    const st = a.steps[2];
    expect(arcStepAt(s, "FIELD")?.step.id).toBe("tokens");
    if (st.step.kind === "collect") st.step.spots.forEach((_, i) => (s.flags[spotFlag(a, st, i)] = true));
    expect(arcStepAt(s, "POLICE")?.step.id).toBe("handin");
  });
});
