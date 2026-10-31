import type { GameState, MetaState, PlayableId, ReactionChoice, Settings } from "../../data/types";
import { CHARACTERS } from "../../data/characters";

export const SAVE_VERSION = 3;
export const SAVE_KEY = "krelworld.save";
export const META_KEY = "krelworld.meta";

export interface KVStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

/** In-memory fallback so the game still runs when storage is blocked (private windows, previews). */
export class MemoryStore implements KVStore {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

export function defaultStore(): KVStore {
  try {
    const ls = (globalThis as any).localStorage as Storage | undefined;
    if (ls) {
      const probe = "__krel_probe";
      ls.setItem(probe, "1");
      ls.removeItem(probe);
      return {
        getItem: (k) => {
          try {
            return ls.getItem(k);
          } catch {
            return null;
          }
        },
        setItem: (k, v) => {
          try {
            ls.setItem(k, v);
          } catch {
            /* storage full or blocked: ignore */
          }
        },
        removeItem: (k) => {
          try {
            ls.removeItem(k);
          } catch {
            /* ignore */
          }
        },
      };
    }
  } catch {
    /* fall through */
  }
  return new MemoryStore();
}

const emptyReactions = (): Record<ReactionChoice, number> => ({ LIKE: 0, LOVE: 0, LAUGH: 0, ANGRY: 0, SEEN: 0 });

export function newGameState(player: PlayableId, ngPlus = 0, meta?: MetaState): GameState {
  const def = CHARACTERS[player];
  return {
    version: SAVE_VERSION,
    player,
    chapter: 1,
    phase: "hub",
    flags: {},
    revisions: [],
    upgrades: {},
    hp: def.maxHp ?? 100,
    coins: 0,
    krezz: 40,
    bottles: 2,
    bongos: 1,
    guns: {},
    intoxication: 0,
    banRisk: 0,
    banCount: 0,
    drongusResentment: 10,
    relationships: {},
    reactionsGiven: emptyReactions(),
    quests: {},
    kills: {},
    tvWatched: meta ? [...meta.tvWatched] : [],
    archiveUnlocked: meta ? [...meta.archiveUnlocked] : [],
    discovered: [],
    ngPlus,
    playtimeMs: 0,
  };
}

export const defaultSettings = (): Settings => ({
  master: 0.8,
  music: 0.5,
  sfx: 0.8,
  shake: true,
  crt: true,
  textSpeed: 1,
  voices: true,
  voiceVolume: 0.8,
});

export function newMeta(): MetaState {
  return { version: SAVE_VERSION, archiveUnlocked: [], tvWatched: [], completedWith: [], ngPlusUnlocked: false, settings: defaultSettings() };
}

/** Repairs a parsed save so missing fields from older versions never crash the game. */
export function migrateState(raw: any): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.player || !CHARACTERS[raw.player] || !CHARACTERS[raw.player].playable) return null;
  const base = newGameState(raw.player);
  const s: GameState = { ...base, ...raw };
  s.flags = { ...(raw.flags || {}) };
  s.revisions = Array.isArray(raw.revisions) ? raw.revisions.filter((r: unknown) => typeof r === "string") : [];
  s.upgrades = { ...(raw.upgrades || {}) };
  s.relationships = { ...(raw.relationships || {}) };
  s.reactionsGiven = { ...emptyReactions(), ...(raw.reactionsGiven || {}) };
  s.quests = { ...(raw.quests || {}) };
  s.kills = { ...(raw.kills || {}) };
  s.tvWatched = Array.isArray(raw.tvWatched) ? raw.tvWatched : [];
  s.archiveUnlocked = Array.isArray(raw.archiveUnlocked) ? raw.archiveUnlocked : [];
  s.guns = raw.guns && typeof raw.guns === "object" ? Object.fromEntries(Object.entries(raw.guns).filter(([, v]) => typeof v === "number" && isFinite(v as number))) as Record<string, number> : {};
  if (typeof s.gun !== "string" || !(s.gun in s.guns)) s.gun = undefined;
  s.discovered = Array.isArray(raw.discovered) ? raw.discovered.slice(-2000) : [];
  s.chapter = clampInt(raw.chapter, 1, 7, 1);
  if (s.phase !== "hub" && s.phase !== "dungeon" && s.phase !== "ended") s.phase = "hub";
  // A save made mid-dungeon resumes at the dungeon entrance in the hub: never an impossible state.
  if (s.phase === "dungeon") s.phase = "hub";
  s.hp = typeof raw.hp === "number" && raw.hp > 0 ? raw.hp : base.hp;
  for (const k of ["coins", "krezz", "bottles", "bongos", "intoxication", "banRisk", "banCount", "drongusResentment", "ngPlus", "playtimeMs"] as const) {
    const v = (raw as any)[k];
    (s as any)[k] = typeof v === "number" && isFinite(v) ? v : (base as any)[k];
  }
  s.banRisk = Math.min(Math.max(s.banRisk, 0), 99);
  s.intoxication = Math.min(Math.max(s.intoxication, 0), 100);
  s.version = SAVE_VERSION;
  return s;
}

function clampInt(v: unknown, lo: number, hi: number, dflt: number) {
  if (typeof v !== "number" || !isFinite(v)) return dflt;
  return Math.min(hi, Math.max(lo, Math.round(v)));
}

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string | null): GameState | null {
  if (!json) return null;
  try {
    return migrateState(JSON.parse(json));
  } catch {
    return null;
  }
}

export class SaveManager {
  constructor(private store: KVStore = defaultStore()) {}

  save(s: GameState) {
    this.store.setItem(SAVE_KEY, serialize(s));
  }
  load(): GameState | null {
    return deserialize(this.store.getItem(SAVE_KEY));
  }
  hasSave(): boolean {
    return this.load() !== null;
  }
  clear() {
    this.store.removeItem(SAVE_KEY);
  }
  loadMeta(): MetaState {
    const raw = this.store.getItem(META_KEY);
    const m = newMeta();
    if (!raw) return m;
    try {
      const p = JSON.parse(raw);
      return {
        ...m,
        ...p,
        settings: { ...m.settings, ...(p.settings || {}) },
        archiveUnlocked: Array.isArray(p.archiveUnlocked) ? p.archiveUnlocked : [],
        tvWatched: Array.isArray(p.tvWatched) ? p.tvWatched : [],
        completedWith: Array.isArray(p.completedWith) ? p.completedWith : [],
      };
    } catch {
      return m;
    }
  }
  saveMeta(m: MetaState) {
    this.store.setItem(META_KEY, JSON.stringify(m));
  }
}

export function unlockArchive(s: GameState, meta: MetaState | null, id: string): boolean {
  let fresh = false;
  if (!s.archiveUnlocked.includes(id)) {
    s.archiveUnlocked.push(id);
    fresh = true;
  }
  if (meta && !meta.archiveUnlocked.includes(id)) meta.archiveUnlocked.push(id);
  return fresh;
}

export function markWatched(s: GameState, meta: MetaState | null, id: string) {
  if (!s.tvWatched.includes(id)) s.tvWatched.push(id);
  if (meta && !meta.tvWatched.includes(id)) meta.tvWatched.push(id);
}
