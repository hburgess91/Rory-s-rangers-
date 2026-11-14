import { describe, expect, it } from "vitest";
import { HEIGHT_INCHES, REF_PX, fitTall, heightFactor, heightId, isHeightKey, textureHeightFactor } from "../src/data/heights";
import { PLAYABLE_IDS } from "../src/data/types";

describe("heights", () => {
  it("has every playable lad, and Drongus", () => {
    for (const id of [...PLAYABLE_IDS, "DRONGUS"]) expect(HEIGHT_INCHES[id], id).toBeGreaterThan(60);
  });

  it("5'10\" is the reference", () => {
    for (const id of ["KREZWONK", "GRONNY", "KREBON", "DRONGUS", "FLENKY", "POLSON"]) expect(heightFactor(id)).toBe(1);
  });

  it("orders the lads by their real heights, exaggerated a little and snapped to whole pixels of a 64px frame", () => {
    expect(heightFactor("KREZMAR")).toBe(68 / 64); // 6'1"
    expect(heightFactor("SCROMBUS")).toBe(61 / 64); // 5'8"
    expect(heightFactor("CRONGUS")).toBe(60 / 64); // 5'7"
    expect(heightFactor("MIKEY")).toBe(60 / 64); // 5'7"
    expect(heightFactor("KREBLIS")).toBe(59 / 64); // 5'6"
    for (const id of Object.keys(HEIGHT_INCHES)) expect(Number.isInteger(heightFactor(id) * 64), id).toBe(true);
  });

  it("variants, doubles and super forms share their original's height", () => {
    expect(heightId("SUPER_KREZMAR")).toBe("KREZMAR");
    expect(heightFactor("SANMIK")).toBe(heightFactor("MIKEY"));
    expect(heightFactor("LIL' CRONGUS")).toBe(heightFactor("CRONGUS"));
    expect(heightFactor("KREDMAR")).toBe(heightFactor("KREZMAR"));
    expect(heightFactor("MIKKY K")).toBe(heightFactor("MIKEY"));
    expect(heightFactor("KLENKY")).toBe(1);
    expect(textureHeightFactor("spr_SUPER_KREBLIS")).toBe(heightFactor("KREBLIS"));
  });

  it("only scales the lads' sheets", () => {
    expect(isHeightKey("spr_KREZMAR")).toBe(true);
    expect(isHeightKey("spr_SUPER_MIKEY")).toBe(true);
    expect(isHeightKey("spr_FOLK1")).toBe(false);
    expect(isHeightKey("boss_drongus")).toBe(false);
    expect(textureHeightFactor("spr_TV_GOKU")).toBe(1);
  });

  it("fits a sheet's measured figure to his height", () => {
    expect(fitTall("GRONNY", REF_PX)).toBe(1);
    expect(fitTall("KREZMAR", REF_PX) * REF_PX).toBe(Math.round(REF_PX * (68 / 64)));
    expect(fitTall("KREBLIS", 58) * 58).toBeCloseTo(Math.round(REF_PX * (59 / 64)));
    // a shorter drawing of a 5'10" lad is scaled up to stand as tall as the rest
    expect(fitTall("DRONGUS", 56)).toBeCloseTo(60 / 56);
    // unreadable art falls back to the plain factor; silly measurements are clamped
    expect(fitTall("CRONGUS", 0)).toBe(60 / 64);
    expect(fitTall("GRONNY", 10)).toBe(1.25);
  });
});
