import { describe, expect, it } from "vitest";
import { sanmikify } from "../src/game/systems/sanmikify";

const LINES = [
  "Are you lot coming to the pub or what?",
  "I told you, it wasn't me. It was Polson.",
  "Right. Briefing. Let's go.",
  "Your mum rang. She says hi.",
  "I'm not doing that with the lads watching.",
  "We need to find the crystal before Drongus does.",
  "Oh no. Oh no no no.",
  "That's the worst thing I've ever seen.",
];

describe("sanmikify", () => {
  it("is stable for the same line", () => {
    for (const l of LINES) expect(sanmikify(l)).toEqual(sanmikify(l));
  });
  it("respells and keeps case", () => {
    expect(sanmikify("YOU").text).toContain("U");
    expect(sanmikify("Your mum rang. She says hi.").text).toMatch(/Ure mum/);
    expect(sanmikify("I'm not doing that with the lads watching.").text).toMatch(/dat wiv tha lads/);
  });
  it("flavours a good share of lines, and its yees match the text", () => {
    let flavoured = 0;
    for (let i = 0; i < 400; i++) {
      const r = sanmikify(`Line number ${i}, nothing special.`);
      if (r.leadYees || r.tailYees || /YEE|♪|CUNTZ|manz|Brap|SanMik|solid|Catford|nans|PEENER|sherk|horney|touches/.test(r.text)) flavoured++;
      if (r.leadYees) expect(r.text).toMatch(/^Y(EE|ee)/);
    }
    expect(flavoured).toBeGreaterThan(160);
    expect(flavoured).toBeLessThan(320);
  });
});
