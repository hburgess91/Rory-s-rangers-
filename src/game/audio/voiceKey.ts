// Shared by the game and the voice-generation script: what gets read aloud, and the id of a recorded line.

/**
 * Delivery tags the voice generator understands inside text, e.g. "Fine. [sighs] Fine." (ElevenLabs v3 audio tags).
 * Only these (plus "[... accent]") count as tags: other square brackets, like "[CITATION NEEDED]", are real text.
 */
export const MOOD_TAGS = new Set([
  "angry", "furious", "annoyed", "frustrated", "excited", "happy", "cheerful", "sad", "shouting", "shouts", "yelling",
  "whispers", "whispering", "laughs", "laughing", "laughs harder", "giggles", "chuckles", "evil laugh", "maniacal laugh",
  "sighs", "exhales", "crying", "sobbing", "sarcastic", "nervous", "panicked", "scared", "mischievously", "shocked",
  "surprised", "gasps", "hesitant", "deadpan", "mysterious", "curious", "confused", "flirty", "seductive", "sultry",
  "smug", "proud", "pompous", "dramatic", "menacing", "growling", "growls", "groans", "grunts", "snorts", "sniffs",
  "gulps", "coughs", "clears throat", "yawns", "tired", "drunk", "slurring", "robotic", "monotone", "booming",
  "breathless", "desperate", "calm", "serious", "warmly", "softly", "quietly", "loudly", "singing", "sings",
  "wheezing", "burps", "disgusted", "pleading", "triumphant", "awe", "sassy", "manic", "deranged", "reverent",
]);
const BRACKET = /\[([^\]\n]{1,40})\]/g;
const isTag = (inner: string) => {
  const t = inner.trim().toLowerCase();
  return inner === inner.toLowerCase() && (MOOD_TAGS.has(t) || / accent$/.test(t));
};

/** The delivery tags written inline in a line's text, in order (without brackets). */
export function inlineMoods(text: string): string[] {
  return [...text.matchAll(BRACKET)].filter((m) => isTag(m[1])).map((m) => m[1].trim());
}

/** The text as shown on screen: delivery tags removed. */
export function displayText(text: string) {
  if (!text.includes("[")) return text;
  return text.replace(BRACKET, (m, inner: string) => (isTag(inner) ? "" : m)).replace(/ {2,}/g, " ").replace(/^ | $/gm, "");
}

/** Strip things that shouldn't be read aloud. `keepTags` leaves delivery tags in (for the voice generator). */
export function speakable(text: string, keepTags = false) {
  return text
    .replace(BRACKET, (_m, inner: string) => (isTag(inner) ? (keepTags ? `[${inner.trim()}]` : " ") : inner))
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

/** Stable id for a recorded line: speaker + spoken text (FNV-1a, 8 hex chars). Delivery tags don't change it. */
export function voiceKey(speaker: string, text: string) {
  const s = speaker.toUpperCase() + "|" + speakable(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
