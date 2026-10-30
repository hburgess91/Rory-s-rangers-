// Shared data types. Nothing in here imports Phaser, so the logic layer can be unit-tested.

export const PLAYABLE_IDS = [
  "FLENKY",
  "KREZMAR",
  "KREBLIS",
  "KREZWONK",
  "SCROMBUS",
  "KREBON",
  "CRONGUS",
  "GRONNY",
  "MIKEY",
  "BENN",
] as const;

export type PlayableId = (typeof PLAYABLE_IDS)[number];

export type CharacterId =
  | PlayableId
  | "DRONGUS"
  | "PROCTUS"
  | "POLSON"
  | "EDEN"
  | "TAP"
  | "ARCHIVE"
  | "NARRATOR";

/** Speakers can be a known character or any free-form name (TV shows, bosses, randoms). */
export type SpeakerId = CharacterId | (string & {});

export type ReactionChoice = "LIKE" | "LOVE" | "LAUGH" | "ANGRY" | "SEEN";

export const REACTION_EMOJI: Record<ReactionChoice, string> = {
  LIKE: "👍",
  LOVE: "❤️",
  LAUGH: "😂",
  ANGRY: "😡",
  SEEN: "Seen",
};

export type FlagValue = boolean | number | string;

/** Every key that is present must hold (logical AND). */
export interface Cond {
  flag?: string;
  flagEq?: [string, FlagValue];
  notFlag?: string;
  chapter?: number;
  chapterAtLeast?: number;
  chapterAtMost?: number;
  player?: PlayableId | PlayableId[];
  notPlayer?: PlayableId | PlayableId[];
  revision?: string;
  notRevision?: string;
  intoxAtLeast?: number;
  intoxBelow?: number;
  resentmentAtLeast?: number;
  ngPlus?: boolean;
  any?: Cond[];
  not?: Cond;
}

export interface ReactionPrompt {
  /** What the player is reacting to (shown as a Messenger bubble). */
  message: string;
  from?: SpeakerId;
  /** Context key so reactions can be tallied and remembered. */
  context: string;
  options?: ReactionChoice[];
  outcomes?: Partial<Record<ReactionChoice, Line[]>>;
}

export interface ChoiceOption {
  label: string;
  cond?: Cond;
  set?: Record<string, FlagValue>;
  lines?: Line[];
}

export interface Line {
  /** Speaker. */
  s: SpeakerId;
  /** Text. Can be empty when the beat is only a reaction prompt / choice / stage direction. */
  t: string;
  id?: string;
  /** Pull speaker + text from the canon quote registry. */
  canon?: string;
  /** canon = verbatim chat quote, adapted = lightly reshaped, new = written for the game. */
  tag?: "canon" | "adapted" | "new";
  cond?: Cond;
  /** Stage direction shown in italics instead of speech. */
  dir?: boolean;
  /**
   * This line is a ministerial function. If the speaker is the current player,
   * PROCTUS KRELMOR delivers `proctus` instead (his mangled version).
   */
  role?: boolean;
  proctus?: string;
  /** Per-player replacement text when the listed player is the speaker or present. */
  variants?: Partial<Record<PlayableId, string>>;
  react?: ReactionPrompt;
  choice?: ChoiceOption[];
  set?: Record<string, FlagValue>;
  sfx?: string;
  /** Messenger-notification style instead of a dialogue box. */
  notify?: boolean;
  emo?: string;
}

export interface MeetingScript {
  id: string;
  title: string;
  subtitle?: string;
  agenda: string[];
  /** Archive reconstructions show the original speakers and never substitute Proctus. */
  historical?: boolean;
  location: "TOWN_HALL" | "FGM_ARCHIVE" | "WAR_ROOM";
  attendees?: SpeakerId[];
  beats: Line[];
  onComplete?: Record<string, FlagValue>;
  unlocksArchive?: string[];
}

export interface CanonLine {
  id: string;
  speaker: CharacterId;
  text: string;
  sourceEra: "FGM_ULTRA" | "KRELWORLD";
  sourceTimestamp?: number;
  tags: string[];
}

export interface ArchiveEntry {
  id: string;
  title: string;
  era: "FGM_ULTRA" | "KRELWORLD" | "PRESENT";
  date: string;
  official: string;
  original: Line[];
  footnote?: string;
  drongusAnnotation?: string;
}

export type Upgrades = Record<string, number>;

export interface GameState {
  version: number;
  player: PlayableId;
  chapter: number;
  /** "hub" while exploring Krelford, "dungeon" inside a chapter dungeon. */
  phase: "hub" | "dungeon" | "ended";
  flags: Record<string, FlagValue>;
  revisions: string[];
  upgrades: Upgrades;
  hp: number;
  coins: number;
  krezz: number;
  bottles: number;
  bongos: number;
  intoxication: number;
  banRisk: number;
  banCount: number;
  drongusResentment: number;
  relationships: Record<string, number>;
  reactionsGiven: Record<ReactionChoice, number>;
  quests: Record<string, number>;
  kills: Record<string, number>;
  tvWatched: string[];
  archiveUnlocked: string[];
  discovered: string[];
  ngPlus: number;
  playtimeMs: number;
  ending?: ReactionChoice;
}

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  shake: boolean;
  crt: boolean;
  textSpeed: number;
  /** Text-to-speech for dialogue and TV (browser voices). */
  voices?: boolean;
  voiceVolume?: number;
}

export interface MetaState {
  version: number;
  archiveUnlocked: string[];
  tvWatched: string[];
  completedWith: PlayableId[];
  ngPlusUnlocked: boolean;
  settings: Settings;
}
