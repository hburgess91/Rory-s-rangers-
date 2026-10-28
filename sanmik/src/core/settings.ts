// Player settings, persisted per browser. Storage can be unavailable (private
// windows, blocked site data), so every access is guarded.

export interface Settings {
  musicVol: number;
  sfxVol: number;
  voiceVol: number;
  screenShake: boolean;
  showHitboxes: boolean;
  swearing: boolean;
}

const KEY = 'sanmik.settings.v1';
const DEFAULTS: Settings = { musicVol: 0.55, sfxVol: 0.8, voiceVol: 1, screenShake: true, showHitboxes: false, swearing: true };

let current: Settings = { ...DEFAULTS };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) current = { ...DEFAULTS, ...JSON.parse(raw) };
} catch {
  /* storage unavailable: defaults are fine */
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(current));
}

const listeners = new Set<(s: Settings) => void>();
export function onSettings(fn: (s: Settings) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
