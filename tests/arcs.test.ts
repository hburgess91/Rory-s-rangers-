import { describe, expect, it } from "vitest";
import { ARCS } from "../src/content/arcs";
import { DUNGEONS } from "../src/data/dungeons";
import { BOSS_TEXT } from "../src/content/bosses";
import { newGameState } from "../src/game/systems/state";
import { currentArcStep, completeStep, maybeFinishArc, arcStepAt } from "../src/game/systems/arcs";

const HUB_SPOTS = ["UNIVERSITY", "GYM", "FIXER_UPPER", "BOOTH", "ABANDONED", "OLD_FLAT", "PUB", "BANK", "TOWN_HALL", "HOME", "ARCHIVE"];
const VIGNETTES = ["kreltower_fall", "kreltower_saved", "pudding", "flatmate", "rival"];
const MINIGAMES = ["bully", "deadlift", "girlfriends", "renovate"];

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
        if (k.kind === "quiz") {
          expect(k.need).toBeLessThanOrEqual(k.questions.length);
          for (const q of k.questions) expect(q.correct).toBeLessThan(q.options.length);
        }
      }
    }
  });

  it("covers the six requested characters", () => {
    expect(ARCS.map((a) => a.player).sort()).toEqual(["CRONGUS", "FLENKY", "GRONNY", "KREZMAR", "KREZWONK", "SCROMBUS"]);
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
