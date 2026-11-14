import Phaser from "phaser";
import { G } from "../G";
import { vfx } from "./Vfx";
import { synth } from "../audio/Synth";
import { keyNameFromEvent, keysFor, prettyKey } from "../systems/keybinds";
import { TOUCH } from "../ui/TouchControls";
import { isMikey, playerSprKey, sanmikActive, sanmikForced, toggleSanmik } from "../systems/sanmik";
import { FONT } from "../ui/theme";

/** The texture key to draw the player with in this scene (SanMik's sheet while Mikey is SanMik). */
export function playerKey(scene: Phaser.Scene): string {
  const k = playerSprKey(G.s);
  return scene.textures.exists(k) ? k : `spr_${G.s.player}`;
}

let lastYee = 0;

/**
 * SanMik's YEE, with a floating "YEE!" over him (only while the player is SanMik; returns false otherwise).
 * `times` YEEs `gap` ms apart, each a little higher (his krezz: YEE YEE YEE). `cooldown` stops it spamming
 * (one per jump, not one per double-jump). `screen` puts the text in screen space (cutscene overlays).
 */
export function sanmikYee(scene: Phaser.Scene, x: number, y: number, o: { times?: number; gap?: number; cooldown?: number; screen?: boolean; size?: number; depth?: number; follow?: { x: number; y: number } } = {}): boolean {
  if (!sanmikActive(G.s)) return false;
  const now = scene.time.now;
  if (o.cooldown && now - lastYee < o.cooldown) return false;
  lastYee = now;
  const times = o.times ?? 1;
  const gap = o.gap ?? 330;
  for (let i = 0; i < times; i++) {
    const go = () => {
      if (!scene.sys?.isActive()) return;
      synth.shout("yee", 0.9, times > 1 ? 1 + i * 0.07 : undefined);
      const size = (o.size ?? 18) + (times > 1 ? i * 5 : 0);
      const t = scene.add
        .text(x + (times > 1 ? (i - (times - 1) / 2) * 72 : 0), y - i * 10, "YEE!", { fontFamily: FONT, fontSize: `${size}px`, color: "#b0c4ff", fontStyle: "bold", stroke: "#000", strokeThickness: 5 })
        .setOrigin(0.5)
        .setDepth(o.depth ?? 9000)
        .setScale(0.4);
      if (o.screen) t.setScrollFactor(0);
      scene.tweens.add({ targets: t, scale: 1, duration: 140, ease: "Back.out" });
      // `follow`: ride along with him (a jump carries him up past where it started)
      const rise = { dy: 0 };
      const f = o.follow;
      const dx = f ? x - f.x : 0;
      const dy0 = f ? y - f.y : 0;
      const track = () => f && t.active && t.setPosition(f.x + dx, f.y + dy0 + rise.dy);
      if (f) scene.events.on("update", track);
      scene.tweens.add({ targets: [rise], dy: -34, delay: 420, duration: 520 });
      scene.tweens.add({
        targets: t,
        alpha: 0,
        delay: 420,
        duration: 520,
        onUpdate: () => !f && t.setY(y - i * 10 + rise.dy),
        onComplete: () => {
          scene.events.off("update", track);
          t.destroy();
        },
      });
    };
    if (i === 0) go();
    else scene.time.delayedCall(i * gap, go);
  }
  return true;
}

/** Swap a sprite's sheet but keep its size (scale setters fold each sheet's own height factor in). */
export function swapSheet(spr: Phaser.GameObjects.Sprite, key: string) {
  if (!spr.scene?.textures.exists(key) || spr.texture.key === key) return;
  const hd = (t: Phaser.Textures.Texture) => (t.customData as { hd?: number } | undefined)?.hd ?? 1;
  const big = (spr as unknown as { big?: number }).big ?? 1;
  const k = hd(spr.texture) * big;
  const sx = spr.scaleX / k;
  const sy = spr.scaleY / k;
  const frame = spr.frame.name;
  spr.setTexture(key, 0);
  const cnt = spr.texture.frameTotal;
  if (typeof frame === "number" && frame < cnt - 1) spr.setFrame(frame);
  spr.setScale(sx, sy);
}

/** The puff, the flash and the "YEE" when Mikey becomes SanMik (or the sigh when he goes back). */
export function sanmikPuff(scene: Phaser.Scene, spr: Phaser.GameObjects.Sprite, on: boolean) {
  const x = spr.x;
  const y = spr.y;
  const d = spr.depth + 1;
  if (!vfx(scene, "vfx_smoke", x, y - 10, { scale: 1.6, depth: d })) {
    const c = scene.add.circle(x, y - 20, 12, 0xffffff, 0.8).setDepth(d);
    scene.tweens.add({ targets: c, radius: 60, alpha: 0, duration: 350, onComplete: () => c.destroy() });
  }
  if (on) vfx(scene, "vfx_sparks", x, y - 30, { scale: 1.3, depth: d + 1, add: true });
  spr.setTintFill(0xffffff);
  scene.time.delayedCall(110, () => spr.clearTint());
  synth.play("pop");
  if (on) synth.shout("yee", 0.8);
  const t = scene.add
    .text(x, y - 70, on ? "YEEE! SANMIK!" : "…Mikey.", { fontFamily: FONT, fontSize: "15px", color: on ? "#b0c4ff" : "#4fc3f7", fontStyle: "bold", stroke: "#000", strokeThickness: 4 })
    .setOrigin(0.5)
    .setDepth(9000);
  scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 500, duration: 600, onComplete: () => t.destroy() });
}

export interface SanmikToggleOpts {
  /** The sprite(s) that are the player in this scene. */
  sprites: () => (Phaser.GameObjects.Sprite | null | undefined)[];
  /** Not now (a cutscene, a dialogue, golden form…). */
  can?: () => boolean;
  /** After the sheet has been swapped. */
  onSwap?: (on: boolean) => void;
}

/**
 * Playing as Mikey: the SanMik key (V by default, rebindable) and the touch button flip Mikey ⇄ SanMik in this
 * scene, straight away. The choice is saved and every scene draws you that way until you flip back.
 */
export function bindSanmikToggle(scene: Phaser.Scene, opts: SanmikToggleOpts) {
  if (!isMikey(G.s)) return;
  const go = () => {
    if (opts.can && !opts.can()) return;
    if (sanmikForced(G.s)) {
      G.emit("toast", { title: "THE SANMIKVERSE", text: "You can't be Mikey here. In the SanMikverse you ARE SanMik." });
      return;
    }
    const on = toggleSanmik(G.s);
    if (on === null) return;
    const key = on ? "spr_SANMIK" : "spr_MIKEY";
    for (const spr of opts.sprites()) {
      if (!spr?.active) continue;
      swapSheet(spr, key);
      sanmikPuff(scene, spr, on);
    }
    opts.onSwap?.(on);
    if (on && !G.s.flags.sanmik_tip) {
      G.s.flags.sanmik_tip = true;
      G.emit("toast", { title: "SANMIK", text: `Afro, shades, drawn-on goatee, shirt open. Same Mikey underneath. ${prettyKey(keysFor("sanmik")[0] ?? "V")} to change back.` });
    }
  };
  const onKey = (e: KeyboardEvent) => {
    const n = keyNameFromEvent(e);
    if (n && keysFor("sanmik").includes(n)) go();
  };
  const kb = scene.input.keyboard;
  kb?.on("keydown", onKey);
  const onUpdate = () => {
    if (TOUCH.edges.has("sanmik")) {
      TOUCH.edges.delete("sanmik");
      go();
    }
  };
  scene.events.on("update", onUpdate);
  scene.events.once("shutdown", () => {
    kb?.off("keydown", onKey);
    scene.events.off("update", onUpdate);
  });
}

/** True while the player is drawn as SanMik. */
export function isSanmik(): boolean {
  return sanmikActive(G.s);
}
