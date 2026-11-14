import { G } from "../G";

/** Every rebindable action, with its default keys (Phaser key names). Pause (Esc) is fixed. */
export const ACTIONS: { id: string; label: string; defaults: string[] }[] = [
  { id: "up", label: "Move up / jump", defaults: ["W", "UP"] },
  { id: "down", label: "Move down / drop", defaults: ["S", "DOWN"] },
  { id: "left", label: "Move left", defaults: ["A", "LEFT"] },
  { id: "right", label: "Move right", defaults: ["D", "RIGHT"] },
  { id: "attack", label: "Attack (also left mouse)", defaults: ["J"] },
  { id: "special", label: "Special (also right mouse)", defaults: ["F", "K"] },
  { id: "dodge", label: "Dodge", defaults: ["SPACE", "SHIFT"] },
  { id: "interact", label: "Interact / talk", defaults: ["E"] },
  { id: "bottle", label: "Drink pussy juice", defaults: ["Q"] },
  { id: "bongo", label: "Fizzy bongo", defaults: ["B"] },
  { id: "burst", label: "Wonk Your Thang (Krezz)", defaults: ["R", "L"] },
  { id: "fart", label: "Fart", defaults: ["G"] },
  { id: "swap", label: "Swap gun", defaults: ["X"] },
  { id: "transform", label: "Golden transformation", defaults: ["T"] },
  { id: "cume", label: "Cumehameha (while golden)", defaults: ["C"] },
  { id: "sanmik", label: "Mikey ⇄ SanMik (as Mikey)", defaults: ["V"] },
];

export function keysFor(action: string): string[] {
  const custom = G.meta?.settings?.keys?.[action];
  return custom && custom.length ? custom : ACTIONS.find((a) => a.id === action)?.defaults ?? [];
}

/** Rebind an action's main key (its second default, e.g. the arrow key, stays as a backup). */
export function bindKey(action: string, key: string) {
  const set = G.meta.settings;
  const def = ACTIONS.find((a) => a.id === action)?.defaults ?? [];
  const backup = def.slice(1).filter((k) => k !== key);
  set.keys = { ...(set.keys ?? {}), [action]: [key, ...backup] };
  G.saveMeta();
}

export function resetKeys() {
  G.meta.settings.keys = {};
  G.saveMeta();
}

/** Browser key event -> Phaser key name (null if it can't be bound). */
export function keyNameFromEvent(e: KeyboardEvent): string | null {
  const c = e.code;
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);
  const digits = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
  if (/^Digit[0-9]$/.test(c)) return digits[Number(c.slice(5))];
  const map: Record<string, string> = {
    Space: "SPACE", ShiftLeft: "SHIFT", ShiftRight: "SHIFT", ControlLeft: "CTRL", ControlRight: "CTRL", AltLeft: "ALT", AltRight: "ALT",
    Tab: "TAB", Enter: "ENTER", ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
    Comma: "COMMA", Period: "PERIOD", Semicolon: "SEMICOLON", Quote: "QUOTES", Slash: "FORWARD_SLASH", Minus: "MINUS", Equal: "PLUS", BracketLeft: "OPEN_BRACKET", BracketRight: "CLOSED_BRACKET",
  };
  return map[c] ?? null;
}

const PRETTY: Record<string, string> = { SPACE: "Space", SHIFT: "Shift", CTRL: "Ctrl", ALT: "Alt", TAB: "Tab", ENTER: "Enter", UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→", COMMA: ",", PERIOD: ".", SEMICOLON: ";", QUOTES: "'", FORWARD_SLASH: "/", MINUS: "-", PLUS: "=", OPEN_BRACKET: "[", CLOSED_BRACKET: "]", ZERO: "0", ONE: "1", TWO: "2", THREE: "3", FOUR: "4", FIVE: "5", SIX: "6", SEVEN: "7", EIGHT: "8", NINE: "9" };
export const prettyKey = (k: string) => PRETTY[k] ?? k;
