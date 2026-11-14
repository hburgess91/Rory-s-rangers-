import { describe, expect, it } from "vitest";
import { newGameState } from "../src/game/systems/state";
import { kruncherVictim, playerFace, playerSprKey, pursuerId, sanmikActive, toggleSanmik } from "../src/game/systems/sanmik";
import { resolveLine } from "../src/game/systems/narrative";
import { evalCond } from "../src/game/systems/conditions";
import { LADS, PLAYABLE_ORDER, CHARACTERS } from "../src/data/characters";
import { KR_AFTER, KR_BRAWL_INTRO, KR_HOME, KR_POLSON_AFTER, KR_POLSON_BEG, KR_POLSON_MEET } from "../src/content/krunchers";
import { CHAPTERS } from "../src/content/chapters/chapters";

describe("playing as Mikey (Kreblar)", () => {
  it("he's on the select screen, with his nickname, and he's not one of the Krew lists", () => {
    expect(PLAYABLE_ORDER).toContain("MIKEY");
    expect(CHARACTERS.MIKEY.nickname).toBe("KREBLAR");
    expect(LADS).not.toContain("MIKEY");
    expect(new Set(PLAYABLE_ORDER).size).toBe(PLAYABLE_ORDER.length);
  });

  it("has a player scene for every chapter (no 'not iterable' on the chapter intros)", () => {
    for (const ch of CHAPTERS) expect(Array.isArray(ch.playerScene.MIKEY), ch.title).toBe(true);
  });

  it("Mikey ⇄ SanMik: only Mikey, remembered in the save, forced in the SanMikverse (Chapter 5)", () => {
    const f = newGameState("FLENKY");
    expect(toggleSanmik(f)).toBeNull();
    expect(sanmikActive(f)).toBe(false);
    const s = newGameState("MIKEY");
    expect(playerSprKey(s)).toBe("spr_MIKEY");
    expect(toggleSanmik(s)).toBe(true);
    expect(sanmikActive(s)).toBe(true);
    expect(playerSprKey(s)).toBe("spr_SANMIK");
    expect(playerFace(s)).toBe("SANMIK");
    expect(toggleSanmik(s)).toBe(false);
    s.chapter = 5;
    expect(sanmikActive(s)).toBe(true);
    expect(toggleSanmik(s)).toBeNull();
  });

  it("Polson does the following-you-about instead, but not in his own chapters", () => {
    expect(pursuerId(newGameState("KREBLIS"))).toBe("MIKEY");
    const s = newGameState("MIKEY");
    for (const [ch, who] of [[1, "POLSON"], [2, null], [3, "POLSON"], [4, "POLSON"], [5, null], [6, "POLSON"], [7, "POLSON"]] as const) {
      s.chapter = ch;
      expect(pursuerId(s), `chapter ${ch}`).toBe(who);
    }
  });

  it("the Kreddle Krunchers batter Polson, and the chat hears it from Polson", () => {
    const s = newGameState("MIKEY");
    expect(kruncherVictim(s)).toBe("POLSON");
    expect(kruncherVictim(newGameState("SCROMBUS"))).toBe("MIKEY");
    for (const l of [...KR_POLSON_MEET, ...KR_POLSON_BEG, ...KR_POLSON_AFTER]) expect(l.s).not.toBe("MIKEY");
    const said = (lines: typeof KR_HOME) => lines.filter((l) => evalCond(l.cond, s)).map((l) => resolveLine(l.s === "YOU" ? { ...l, s: s.player } : l, s)!);
    const home = said(KR_HOME);
    expect(home.filter((l) => l.notify && l.s === "MIKEY")).toHaveLength(0);
    expect(home.some((l) => l.s === "POLSON" && /protein shake/.test(l.t))).toBe(true);
    expect(home.some((l) => /beat up Polson/.test(l.t))).toBe(true);
    // nobody's bongo but Polson's shake
    for (const l of [...said(KR_BRAWL_INTRO), ...said(KR_AFTER)]) expect(l.t).not.toMatch(/my bongo|Mikey's bongo/i);
  });
});
