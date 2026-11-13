// Shared by the game and the voice-generation script: what gets read aloud, and the id of a recorded line.

/** Strip things that shouldn't be read aloud. */
export function speakable(text: string) {
  return text
    .replace(/\*[^*]*\*/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ")
    .replace(/[#@]/g, "")
    .replace(/\?\?+/g, "?")
    .replace(/!!+/g, "!")
    .replace(/…/g, "... ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable id for a recorded line: speaker + spoken text (FNV-1a, 8 hex chars). */
export function voiceKey(speaker: string, text: string) {
  const s = speaker.toUpperCase() + "|" + speakable(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
