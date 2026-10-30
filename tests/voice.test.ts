import { describe, it, expect } from "vitest";
import { chunkSpeech } from "../src/game/audio/Voice";

describe("chunkSpeech", () => {
  it("keeps short lines whole", () => {
    expect(chunkSpeech("Hello there. How are you?")).toEqual(["Hello there. How are you?"]);
  });
  it("splits long passages into whole-sentence chunks without losing words", () => {
    const s = Array.from({ length: 20 }, (_, i) => `This is sentence number ${i} of the passage.`).join(" ");
    const c = chunkSpeech(s);
    expect(c.length).toBeGreaterThan(1);
    for (const x of c) expect(x.length).toBeLessThanOrEqual(160);
    expect(c.join(" ").replace(/\s+/g, " ")).toBe(s);
  });
  it("breaks a single huge sentence on words", () => {
    const s = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
    const c = chunkSpeech(s);
    for (const x of c) expect(x.length).toBeLessThanOrEqual(160);
    expect(c.join(" ")).toBe(s);
  });
});
