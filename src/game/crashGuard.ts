import type Phaser from "phaser";
import { G } from "./G";

// Keeps one bad frame from freezing the whole game, reloads cleanly if the GPU drops the
// WebGL context, and leaves a breadcrumb so the next launch can say what happened.

const CRUMB = "krel_crumb";
const ALIVE = "krel_alive";

function store(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage blocked: diagnostics only */
  }
}
function load(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

/** A small DOM notice, independent of Phaser (works even if the renderer is wedged). */
export function notice(text: string, ms = 9000) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText =
    "position:fixed;left:50%;bottom:12px;transform:translateX(-50%);max-width:90vw;z-index:9999;background:#111c;color:#ffd23f;font:13px/1.35 system-ui,sans-serif;padding:8px 12px;border:1px solid #ffd23f;border-radius:6px;pointer-events:none;white-space:pre-wrap";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

let lastErr = "";
const seen = new Set<string>();

function where(game: Phaser.Game) {
  const active = game.scene.getScenes(true).map((s) => s.scene.key);
  const d = active.includes("Dungeon") ? ` · ${G.rt.dungeonId ?? "?"} room ${(G.rt.room ?? 0) + 1}` : "";
  return `${active.join("+")}${d}`;
}

function record(game: Phaser.Game, e: unknown) {
  const msg = e instanceof Error ? `${e.message} @ ${(e.stack ?? "").split("\n")[1]?.trim() ?? ""}` : String(e);
  lastErr = msg.slice(0, 300);
  console.error("[krel] caught:", e);
  if (!seen.has(lastErr)) {
    seen.add(lastErr);
    notice(`Something glitched (the game kept going). If it happens again, screenshot this:\n${where(game)}\n${lastErr}`);
  }
}

export function installCrashGuard(game: Phaser.Game) {
  // 1. Tell the player if the last session died unexpectedly.
  const prev = load(ALIVE) === "1" ? load(CRUMB) : null;
  if (prev) {
    try {
      const c = JSON.parse(prev) as { where: string; err: string; t: number };
      setTimeout(() => notice(`Last time the game stopped unexpectedly (${c.where}).${c.err ? `\nLast error: ${c.err}` : "\nNo error was recorded, so the browser itself closed or reloaded the page."}\nYour progress up to the last cleared room is saved.`, 14000), 2500);
    } catch {
      /* ignore */
    }
  }
  store(ALIVE, "1");
  addEventListener("pagehide", () => store(ALIVE, "0"));

  // 2. Never let one exception stop the game loop.
  const step = game.step.bind(game);
  game.step = (time: number, delta: number) => {
    try {
      step(time, delta);
    } catch (e) {
      record(game, e);
    }
  };
  addEventListener("error", (ev) => record(game, ev.error ?? ev.message));
  addEventListener("unhandledrejection", (ev) => record(game, ev.reason));

  // 3. GPU reset: save and reload rather than sitting on a black screen.
  const canvas = game.canvas;
  canvas?.addEventListener("webglcontextlost", (ev) => {
    ev.preventDefault();
    lastErr = "graphics (WebGL) context lost";
    store(CRUMB, JSON.stringify({ where: where(game), err: lastErr, t: Date.now() }));
    try {
      G.save();
    } catch {
      /* ignore */
    }
    notice("Graphics reset by the browser. Reloading. Your progress is saved.", 4000);
    setTimeout(() => location.reload(), 1200);
  });

  // 4. Breadcrumb every couple of seconds.
  setInterval(() => store(CRUMB, JSON.stringify({ where: where(game), err: lastErr, t: Date.now() })), 2000);
}
