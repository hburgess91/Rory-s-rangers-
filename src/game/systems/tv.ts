// KrelTV: data-driven episodes. New shows are data, not code.

export type TVBeat =
  | { type: "shot"; set: string; framing: string; duration?: number }
  | { type: "speaker"; character: string; text: string; emotion?: string }
  | { type: "direction"; action: string }
  | { type: "sfx"; id: string }
  | { type: "music"; id: string; mode: "start" | "stop" | "fade" }
  | { type: "audience"; cue: "laugh" | "biglaugh" | "cheer" | "gasp" | "whistle" }
  | { type: "titleCard"; text: string }
  | { type: "transition"; mode: "cut" | "smashCut" | "fade" }
  | { type: "prop"; id: string; on: boolean }
  | { type: "blocking"; character: string; to: "left" | "right" | "center" | "lap" | "offscreen" | "enter"; pose?: string };

export interface TVEpisode {
  id: string;
  show: string;
  title: string;
  episodeNumber: number;
  /** Shown in the channel list. */
  channel: string;
  /** Only episodes with no unlock condition or a satisfied one appear as watchable. */
  unlockFlag?: string;
  unlockHint?: string;
  contentNote?: string;
  beats: TVBeat[];
}

const AUDIENCE_CUES: Record<string, "laugh" | "biglaugh" | "cheer" | "gasp" | "whistle"> = {
  LAUGHTER: "laugh",
  LAUGH: "laugh",
  "CANNED LAUGHTER": "laugh",
  "LAUGHTER CRESCENDO": "biglaugh",
  "BIG LAUGH": "biglaugh",
  "LAUGH TRACK": "laugh",
  CHEERING: "cheer",
  CHEERS: "cheer",
  APPLAUSE: "cheer",
  GASP: "gasp",
  GASPS: "gasp",
  WHISTLE: "whistle",
  WHISTLES: "whistle",
  "CHEERS AND WHISTLES": "whistle",
};

/**
 * Parse a lightweight screenplay format into beats. Lets future episodes be pasted in as text.
 *
 *   # TITLE CARD TEXT
 *   INT. SOME PLACE - NIGHT          -> shot
 *   EXT. SOME PLACE - DAY            -> shot
 *   NAME: line of dialogue           -> speaker
 *   NAME (emotion): line             -> speaker with emotion
 *   (stage direction)                -> direction
 *   [LAUGHTER] / [CHEERING] ...      -> audience
 *   [SMASH CUT] [CUT] [FADE]         -> transition
 *   [SFX id] [MUSIC id start|stop|fade]
 *   [PROP id on|off]
 *   [BLOCK NAME left|right|center|lap|offscreen|enter]
 */
export function parseScreenplay(text: string): TVBeat[] {
  const beats: TVBeat[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      beats.push({ type: "titleCard", text: line.replace(/^#+\s*/, "") });
      continue;
    }
    const shot = line.match(/^(INT\.|EXT\.)\s+(.+?)(?:\s+-\s+(.+))?$/);
    if (shot) {
      beats.push({ type: "shot", set: `${shot[1]} ${shot[2]}`.trim(), framing: (shot[3] || "WIDE").trim() });
      continue;
    }
    const bracket = line.match(/^\[(.+)\]$/);
    if (bracket) {
      const inner = bracket[1].trim();
      const upper = inner.toUpperCase();
      if (upper === "SMASH CUT" || upper === "SMASHCUT") beats.push({ type: "transition", mode: "smashCut" });
      else if (upper === "CUT" || upper === "CUT TO") beats.push({ type: "transition", mode: "cut" });
      else if (upper.startsWith("FADE")) beats.push({ type: "transition", mode: "fade" });
      else if (upper.startsWith("SFX ")) beats.push({ type: "sfx", id: inner.slice(4).trim() });
      else if (upper.startsWith("MUSIC ")) {
        const [, id, mode] = inner.split(/\s+/);
        beats.push({ type: "music", id, mode: (mode as any) === "stop" || mode === "fade" ? (mode as any) : "start" });
      } else if (upper.startsWith("PROP ")) {
        const [, id, on] = inner.split(/\s+/);
        beats.push({ type: "prop", id, on: on !== "off" });
      } else if (upper.startsWith("BLOCK ")) {
        // names can be several words: [BLOCK JUROR NUMBER 2 right]
        const parts = inner.split(/\s+/).slice(1);
        const POS = ["left", "right", "center", "lap", "offscreen", "enter"];
        const at = parts.findIndex((w) => POS.includes(w.toLowerCase()));
        const who = (at > 0 ? parts.slice(0, at) : parts.slice(0, 1)).join(" ");
        const to = at > 0 ? parts[at].toLowerCase() : parts[1];
        const pose = at > 0 ? parts[at + 1] : parts[2];
        beats.push({ type: "blocking", character: who, to: (to as any) || "center", pose });
      } else if (AUDIENCE_CUES[upper]) beats.push({ type: "audience", cue: AUDIENCE_CUES[upper] });
      else beats.push({ type: "direction", action: inner });
      continue;
    }
    const dir = line.match(/^\((.+)\)$/);
    if (dir) {
      beats.push({ type: "direction", action: dir[1] });
      continue;
    }
    const sp = line.match(/^([A-Z][A-Z0-9 .'’\-]+?)(?:\s*\(([^)]+)\))?:\s*(.+)$/);
    if (sp) {
      beats.push({ type: "speaker", character: sp[1].trim(), text: sp[3].trim().replace(/^["“]|["”]$/g, ""), emotion: sp[2]?.trim() });
      continue;
    }
    beats.push({ type: "direction", action: line });
  }
  return beats;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateEpisode(ep: TVEpisode): ValidationResult {
  const errors: string[] = [];
  if (!ep.id) errors.push("missing id");
  if (!ep.title) errors.push("missing title");
  if (!Array.isArray(ep.beats) || ep.beats.length === 0) errors.push("no beats");
  let sawShot = false;
  ep.beats?.forEach((b, i) => {
    switch (b.type) {
      case "shot":
        sawShot = true;
        if (!b.set) errors.push(`beat ${i}: shot without set`);
        break;
      case "speaker":
        if (!sawShot) errors.push(`beat ${i}: dialogue before first shot`);
        if (!b.character || !b.text) errors.push(`beat ${i}: speaker needs character and text`);
        break;
      case "direction":
        if (!b.action) errors.push(`beat ${i}: empty direction`);
        break;
      case "sfx":
      case "music":
        if (!b.id) errors.push(`beat ${i}: ${b.type} needs id`);
        break;
      case "audience":
      case "titleCard":
      case "transition":
      case "prop":
      case "blocking":
        break;
      default:
        errors.push(`beat ${i}: unknown type ${(b as any).type}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

/** Seconds a beat should hold before auto-advancing. Subtitle timing scales with text length. */
export function beatDuration(b: TVBeat): number {
  switch (b.type) {
    case "speaker":
      return Math.min(9, 1.4 + b.text.length * 0.045);
    case "direction":
      return Math.min(6, 1.2 + b.action.length * 0.03);
    case "titleCard":
      return 3.2;
    case "shot":
      return b.duration ?? 0.6;
    case "audience":
      // let the canned laughter breathe before the next line, like a real sitcom
      return b.cue === "biglaugh" ? 4.2 : b.cue === "laugh" ? 2.4 : 1.6;
    case "transition":
      return b.mode === "smashCut" ? 0.15 : 0.7;
    default:
      return 0.05;
  }
}
