import Phaser from "phaser";
import type { RoomDef } from "../../../data/dungeons";
import type { Line, PlayableId } from "../../../data/types";
import { PLAYABLE_IDS } from "../../../data/types";
import type { CombatWorld, ShotOpts } from "../../combat/types";
import type { Enemy } from "../../combat/Enemy";
import { DarkDrongusBoss } from "../../combat/DarkDrongus";
import { runGroupWonk } from "../../combat/GroupWonk";
import { synth } from "../../audio/Synth";
import { voice } from "../../audio/Voice";
import { animateWalker } from "../../gfx/HD";
import { hasVfx, vfx } from "../../gfx/Vfx";
import { switchTo } from "../../Flow";
import { G } from "../../G";
import { FONT } from "../../ui/theme";
import * as FR from "../../../content/finaleRoof";

/**
 * THE ROOF OF DA DRONGUS DUNGEON (the finale, part one). A round rooftop in the storm, top down. The lads are clamped
 * into metal frames round the rim; DARK DRONGUS (invulnerable) stalks the middle. Shoot the frames to free the lads
 * (each frame has its own health bar); freed lads stay on the rim and shoot the mini drongi. All free: the GROUP WONK,
 * then the side-on group krezz cutscene (RoofCutscene, beat "krezz") and on to Krelford.
 *
 * DungeonScene builds a room with event "roof", then hands it to this (hooks below) and forwards player shots/blasts.
 */

/** The art for the finale (until it's merged into public/art/manifest.json: see finaleA_manifest.json). */
export const ROOF_SHEETS: Record<string, { file: string; frameWidth: number; frameHeight: number; hd?: number }> = {
  boss_dark_drongus: { file: "combat/boss_dark_drongus.png", frameWidth: 128, frameHeight: 128 },
  en_mini_drongus: { file: "combat/en_mini_drongus.png", frameWidth: 64, frameHeight: 64, hd: 0.55 },
  c7_drongus_xf: { file: "combat/c7_drongus_xf.png", frameWidth: 128, frameHeight: 128 },
};
export const ROOF_IMAGES: Record<string, string> = {
  fr_roof_floor: "tiles/fr_roof_floor.png",
  bg_roof: "backdrops/bg_roof.png",
  fr_drongus_skinny: "combat/fr_drongus_skinny.png",
  fr_drongus_point: "combat/fr_drongus_point.png",
  fr_dd_face: "combat/fr_dd_face.png",
  fr_binding: "props/fr_binding.png",
  fr_binding_broken: "props/fr_binding_broken.png",
  fr_syringe: "props/fr_syringe.png",
  fr_logs: "props/fr_logs.png",
  fr_grenade: "props/fr_grenade.png",
  fr_skull: "props/fr_skull.png",
  fr_brain: "props/fr_brain.png",
  fr_eye: "props/fr_eye.png",
  fr_slab: "props/fr_slab.png",
  fr_rack: "props/fr_rack.png",
  fr_bottle: "props/fr_bottle.png",
  fr_shackle: "props/fr_shackle.png",
  fr_debris_0: "props/fr_debris_0.png",
  fr_debris_1: "props/fr_debris_1.png",
};

function procedural(sc: Phaser.Scene, key: string) {
  if (!sc.textures.exists(key)) return true;
  return !!(sc.textures.get(key).source[0] as unknown as { isCanvas?: boolean })?.isCanvas;
}

/** Queue the finale's art (guarded: anything the manifest already loaded is left alone). */
export function roofPreload(sc: Phaser.Scene) {
  for (const [key, d] of Object.entries(ROOF_SHEETS)) {
    if (!procedural(sc, key)) continue;
    if (sc.textures.exists(key)) sc.textures.remove(key);
    sc.load.spritesheet(key, `art/${d.file}`, { frameWidth: d.frameWidth, frameHeight: d.frameHeight });
  }
  for (const [key, file] of Object.entries(ROOF_IMAGES)) if (!sc.textures.exists(key)) sc.load.image(key, `art/${file}`);
}

/** After loading: HD factors for the sheets that need them. */
export function roofReady(sc: Phaser.Scene) {
  for (const [key, d] of Object.entries(ROOF_SHEETS)) {
    if (!d.hd || !sc.textures.exists(key)) continue;
    const tex = sc.textures.get(key);
    if (!(tex.customData as { hd?: number }).hd) tex.customData = { ...tex.customData, hd: d.hd };
  }
}

/** Where the bottle and the logs land in Krelford (Hub world coordinates), for part two. */
export const FINALE_LOGS_AT = { x: 430, y: 826 };
export const FINALE_BOTTLE_AT = { x: 2160, y: 826 };

export interface RoofHooks {
  talk(lines: Line[]): Promise<void>;
  startBoss(id: string, x: number, y: number): Promise<void>;
  setBusy(b: boolean): void;
  /** Kill every non-boss enemy and every enemy shot. */
  clearHostiles(): void;
}

interface Bound {
  id: PlayableId;
  ang: number;
  x: number;
  y: number;
  hp: number;
  max: number;
  freed: boolean;
  frame: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  lad: Phaser.GameObjects.Sprite;
  clamps: Phaser.GameObjects.Rectangle[];
  nextShot: number;
  lastHit: number;
}

type Host = CombatWorld & Phaser.Scene & { busy: boolean; boss: unknown; dungeon: { id: string }; roomIdx: number };

const BIND_HP = 240;

export class RoofArena {
  readonly cx: number;
  readonly cy: number;
  readonly R: number;
  private bound: Bound[] = [];
  private boss: DarkDrongusBoss | null = null;
  private bars: Phaser.GameObjects.Graphics;
  private rain: Phaser.GameObjects.Graphics;
  private drops: { x: number; y: number; v: number; l: number }[] = [];
  private flash: Phaser.GameObjects.Rectangle;
  private nextBolt = 0;
  private nextHelp = 0;
  private done = false;
  private fighting = false;

  constructor(
    private sc: Host,
    private room: RoomDef,
    private hooks: RoofHooks,
  ) {
    const r = room;
    this.cx = r.w / 2;
    this.cy = r.h / 2;
    this.R = Math.min(r.w, r.h) / 2 - 90;
    // the room's own dressing (walls, carpet, door, candles) isn't on a roof: hide all of it
    for (const o of [...sc.children.list]) (o as unknown as { setVisible?: (v: boolean) => void }).setVisible?.(false);
    this.drawRoof();
    this.bars = sc.add.graphics().setDepth(880);
    this.rain = sc.add.graphics().setDepth(2900).setScrollFactor(0);
    for (let i = 0; i < 140; i++) this.drops.push({ x: Math.random() * 1000, y: Math.random() * 560, v: 700 + Math.random() * 500, l: 10 + Math.random() * 14 });
    this.flash = sc.add.rectangle(480, 270, 960, 540, 0xdfe6ff, 0).setScrollFactor(0).setDepth(2899).setBlendMode(Phaser.BlendModes.ADD);
    this.placeLads();
    synth.weatherSound("storm");
  }

  // ---------------------------------------------------------------- set dressing

  private drawRoof() {
    const sc = this.sc;
    const { cx, cy, R } = this;
    const r = this.room;
    // the void: the storm, and Krelford burning far below
    sc.add.rectangle(0, 0, r.w, r.h, 0x07040c).setOrigin(0).setDepth(0.1);
    const city = sc.add.graphics().setDepth(0.15);
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * r.w;
      const y = Math.random() * r.h;
      if (Math.hypot(x - cx, y - cy) < R + 30) continue;
      city.fillStyle([0xff7a1a, 0xffd23f, 0xb91c1c, 0x6d28d9][i % 4], 0.25 + Math.random() * 0.4).fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    sc.tweens.add({ targets: city, alpha: { from: 0.6, to: 1 }, yoyo: true, repeat: -1, duration: 1400 });
    // the roof
    const D = R * 2 + 56;
    if (sc.textures.exists("fr_roof_floor")) {
      const img = sc.add.image(cx, cy, "fr_roof_floor").setDepth(0.2);
      const src = sc.textures.get("fr_roof_floor").getSourceImage();
      img.setScale(D / Math.min(src.width, src.height));
      // round it off: anything outside the rim is the void
      const mask = sc.make.graphics({ x: 0, y: 0 }, false);
      mask.fillStyle(0xffffff).fillCircle(cx, cy, R + 26);
      img.setMask(mask.createGeometryMask());
    } else {
      const g = sc.add.graphics().setDepth(0.2);
      g.fillStyle(0x1b1424, 1).fillCircle(cx, cy, R + 26);
      for (let i = 0; i < 6; i++) g.lineStyle(2, 0x2c2238, 1).strokeCircle(cx, cy, 60 + i * 70);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        g.lineStyle(2, 0x2c2238, 1).lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, cx + Math.cos(a) * (R + 20), cy + Math.sin(a) * (R + 20));
      }
    }
    // neon rim, railings, puddles
    const rim = sc.add.graphics().setDepth(0.3);
    rim.lineStyle(10, 0x0b0710, 1).strokeCircle(cx, cy, R + 26);
    rim.lineStyle(3, 0xff2d55, 0.75).strokeCircle(cx, cy, R + 20);
    rim.lineStyle(2, 0xa855f7, 0.5).strokeCircle(cx, cy, R + 30);
    sc.tweens.add({ targets: rim, alpha: { from: 0.65, to: 1 }, yoyo: true, repeat: -1, duration: 600 });
    const glow = sc.add.circle(cx, cy, 120, 0xffd23f, 0.05).setDepth(0.25).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: glow, scale: 1.3, alpha: 0.02, yoyo: true, repeat: -1, duration: 1800 });
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * R * 0.85;
      const p = sc.add.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 40 + Math.random() * 50, 14 + Math.random() * 12, 0x8ea2ff, 0.08).setDepth(0.35);
      sc.tweens.add({ targets: p, alpha: { from: 0.05, to: 0.14 }, yoyo: true, repeat: -1, duration: 900 + Math.random() * 800 });
    }
  }

  /** The other lads (everyone but you), evenly round the rim, clamped into frames. */
  private placeLads() {
    const sc = this.sc;
    const ids = PLAYABLE_IDS.filter((id) => id !== G.s.player);
    const saved = String(G.s.flags.finale_freed ?? "").split(",");
    ids.forEach((id, i) => {
      const ang = -Math.PI / 2 + (i / ids.length) * Math.PI * 2 + Math.PI / ids.length;
      const x = this.cx + Math.cos(ang) * (this.R - 34);
      const y = this.cy + Math.sin(ang) * (this.R - 34);
      const fkey = sc.textures.exists("fr_binding") ? "fr_binding" : null;
      const frame = fkey ? sc.add.image(x, y + 30, fkey).setOrigin(0.5, 1).setScale(1.7) : sc.add.rectangle(x, y + 4, 54, 80, 0x3f3f46, 0.0).setStrokeStyle(5, 0x71717a);
      frame.setDepth(y + 28);
      const key = sc.textures.exists(`spr_${id}`) ? `spr_${id}` : "spr_FLENKY";
      const lad = sc.add.sprite(x, y, key, 0).setScale(2).setDepth(y + 29);
      lad.setData("facing", "south");
      animateWalker(lad, 0, 0, false, 0);
      // the clamps: iron bars over wrists and ankles (drawn over whatever the frame art has)
      const clamps = [
        sc.add.rectangle(x - 20, y - 4, 14, 7, 0x52525b).setStrokeStyle(1, 0x18181b),
        sc.add.rectangle(x + 20, y - 4, 14, 7, 0x52525b).setStrokeStyle(1, 0x18181b),
        sc.add.rectangle(x - 9, y + 26, 12, 6, 0x52525b).setStrokeStyle(1, 0x18181b),
        sc.add.rectangle(x + 9, y + 26, 12, 6, 0x52525b).setStrokeStyle(1, 0x18181b),
      ];
      for (const c of clamps) c.setDepth(y + 30);
      const b: Bound = { id, ang, x, y, hp: BIND_HP, max: BIND_HP, freed: false, frame, lad, clamps, nextShot: 0, lastHit: 0 };
      this.bound.push(b);
      // a light on the frame that blinks red while they're stuck
      if (saved.includes(id)) this.free(b, true);
    });
  }

  // ---------------------------------------------------------------- the flow

  /** Called by DungeonScene.startRoom. */
  async start() {
    const sc = this.sc;
    const flags = G.s.flags;
    if (!flags.finale_xf_seen) {
      await this.hooks.talk(FR.ROOF_ENTER);
      flags.finale_xf_seen = true;
      G.save();
      this.done = true;
      sc.cameras.main.fadeOut(400);
      sc.time.delayedCall(420, () => switchTo(sc, "RoofCutscene", { beat: "transform", dungeon: sc.dungeon.id, room: sc.roomIdx }));
      return;
    }
    synth.music("c7_roof", true);
    if (!flags.finale_brief_seen) {
      await this.hooks.talk([...FR.FIGHT_BRIEF, ...FR.FIGHT_BRIEF_SELF]);
      flags.finale_brief_seen = true;
      G.save();
    } else sc.toast("DARK DRONGUS", "He can't be hurt. Shoot the frames to free the lads.");
    await this.hooks.startBoss("dark_drongus", this.cx, this.cy);
    const b = (sc.boss as DarkDrongusBoss | null) ?? null;
    if (b instanceof DarkDrongusBoss) {
      this.boss = b;
      b.arena = { x: this.cx, y: this.cy, r: this.R };
      b.rage = this.freedCount() / this.bound.length;
    }
    this.fighting = true;
    if (this.bound.every((x) => x.freed)) void this.allFree();
  }

  private freedCount() {
    return this.bound.filter((b) => b.freed).length;
  }

  // ---------------------------------------------------------------- shooting the frames

  /** A player shot: did it hit a frame? (Allies' shots never do.) */
  hitShot(x: number, y: number, o: ShotOpts): boolean {
    if (!this.fighting || o.owner !== "player" || (o as { ally?: boolean }).ally) return false;
    for (const b of this.bound) {
      if (b.freed) continue;
      if (Math.abs(b.x - x) < 30 && y > b.y - 40 && y < b.y + 36) {
        this.damage(b, o.damage || 10);
        return true;
      }
    }
    return false;
  }

  /** A blast (rockets, slams, melee): every frame in range takes it. */
  hitAoe(x: number, y: number, r: number, dmg: number) {
    if (!this.fighting) return;
    for (const b of this.bound) if (!b.freed && Phaser.Math.Distance.Between(x, y, b.x, b.y) < r + 30) this.damage(b, dmg);
  }

  private damage(b: Bound, dmg: number) {
    const sc = this.sc;
    b.hp -= dmg;
    const now = sc.time.now;
    if (now - b.lastHit > 70) {
      b.lastHit = now;
      synth.play("hit");
      const f = b.frame as Phaser.GameObjects.Image;
      f.setTintFill?.(0xffffff);
      sc.time.delayedCall(50, () => f.active && f.clearTint?.());
      sc.burst(b.x + (Math.random() - 0.5) * 30, b.y + (Math.random() - 0.5) * 40, 0xfde68a, 4);
      if (Math.random() < 0.25) sc.floatText(b.x, b.y - 46, "CLANK", "#d4d4d8", 11);
    }
    if (b.hp <= 0) this.free(b);
  }

  private free(b: Bound, quiet = false) {
    if (b.freed) return;
    const sc = this.sc;
    b.freed = true;
    b.hp = 0;
    for (const c of b.clamps) {
      if (quiet) {
        c.destroy();
        continue;
      }
      const key = sc.textures.exists("fr_shackle") ? "fr_shackle" : null;
      const piece = key ? sc.add.image(c.x, c.y, key).setScale(0.6).setDepth(950) : c;
      if (key) c.destroy();
      const a = Math.random() * Math.PI * 2;
      sc.tweens.add({ targets: piece, x: piece.x + Math.cos(a) * 90, y: piece.y + Math.sin(a) * 60 - 30, angle: 540, alpha: 0, duration: 700, ease: "Quad.out", onComplete: () => piece.destroy() });
    }
    b.clamps = [];
    const f = b.frame;
    if (f instanceof Phaser.GameObjects.Image && sc.textures.exists("fr_binding_broken")) f.setTexture("fr_binding_broken");
    else f.setAlpha(0.35);
    // step out of the frame, towards the middle
    const tx = this.cx + Math.cos(b.ang) * (this.R - 92);
    const ty = this.cy + Math.sin(b.ang) * (this.R - 92);
    b.x = tx;
    b.y = ty;
    if (quiet) {
      b.lad.setPosition(tx, ty).setDepth(ty);
      return;
    }
    synth.play("smash");
    synth.play("cheer");
    sc.shake(160, 0.006);
    if (hasVfx(sc, "vfx_sparks")) vfx(sc, "vfx_sparks", f.x, f.y - 40, { scale: 1.4, depth: 960, add: true });
    sc.tweens.add({ targets: b.lad, x: tx, y: ty, duration: 450, ease: "Quad.out", onUpdate: () => animateWalker(b.lad, tx - b.lad.x, ty - b.lad.y, true, sc.time.now), onComplete: () => animateWalker(b.lad, 0, 0, false, 0) });
    const line = FR.FREED[b.id]?.[0];
    if (line) {
      sc.floatText(tx, ty - 50, line.t, "#ffffff", 13);
      voice.say(b.id, line.t);
    }
    const n = this.freedCount();
    const total = this.bound.length;
    sc.toast(`${n} OF ${total} FREED`, n < total ? "Keep going. He's getting angrier." : "EVERYONE'S OUT.");
    G.s.flags.finale_freed = this.bound.filter((x) => x.freed).map((x) => x.id).join(",");
    G.save();
    if (this.boss) this.boss.rage = n / total;
    if (n >= total) void this.allFree();
  }

  // ---------------------------------------------------------------- the group wonk

  private async allFree() {
    if (this.done) return;
    this.done = true;
    this.fighting = false;
    const sc = this.sc;
    await new Promise<void>((r) => sc.time.delayedCall(900, () => r()));
    this.hooks.setBusy(true);
    this.hooks.clearHostiles();
    const boss = this.boss;
    boss?.calm();
    if (boss) boss.frozen = true;
    G.emit("boss", null);
    synth.stopMusic();
    // everyone into a ring round him (you too)
    const ring = [...this.bound.map((b) => b.lad), sc.player.spr];
    const ringR = 200;
    const moves = ring.map((spr, i) => {
      const a = -Math.PI / 2 + (i / ring.length) * Math.PI * 2;
      const tx = this.cx + Math.cos(a) * ringR;
      const ty = this.cy + Math.sin(a) * ringR;
      return new Promise<void>((res) =>
        sc.tweens.add({
          targets: spr,
          x: tx,
          y: ty,
          duration: 900,
          ease: "Sine.inOut",
          onUpdate: () => {
            if (spr !== sc.player.spr) animateWalker(spr, this.cx - spr.x, this.cy - spr.y, true, sc.time.now);
            spr.setDepth(spr.y);
          },
          onComplete: () => {
            spr.setData("facing", Math.abs(this.cx - tx) > Math.abs(this.cy - ty) ? (this.cx > tx ? "east" : "west") : this.cy > ty ? "south" : "north");
            if (spr !== sc.player.spr) animateWalker(spr, 0, 0, false, 0);
            res();
          },
        }),
      );
    });
    sc.cameras.main.stopFollow();
    sc.cameras.main.pan(this.cx, this.cy, 900, "Sine.inOut");
    await Promise.all(moves);
    await this.hooks.talk(FR.WONK_READY);
    // round and round until it works
    for (;;) {
      const ok = await runGroupWonk(sc, { lads: this.bound.map((b) => b.id), player: G.s.player as PlayableId });
      if (ok) break;
      await this.hooks.talk(FR.WONK_FAIL);
    }
    G.s.flags.finale_wonked = true;
    delete G.s.flags.finale_freed;
    G.save();
    sc.cameras.main.flash(500, 255, 255, 255);
    synth.play("boom");
    sc.cameras.main.fadeOut(500, 255, 255, 255);
    sc.time.delayedCall(520, () => switchTo(sc, "RoofCutscene", { beat: "krezz" }));
  }

  // ---------------------------------------------------------------- every frame

  update(dt: number) {
    const sc = this.sc;
    const now = sc.time.now;
    this.weather(dt, now);
    if (this.done && !this.fighting) {
      this.bars.clear();
      return;
    }
    // stay on the roof
    const keep = (o: { x: number; y: number }, pad: number, set: (x: number, y: number) => void) => {
      const d = Math.hypot(o.x - this.cx, o.y - this.cy);
      const max = this.R - pad;
      if (d > max) set(this.cx + ((o.x - this.cx) * max) / d, this.cy + ((o.y - this.cy) * max) / d);
    };
    const ps = sc.player?.spr;
    if (ps?.body) keep(ps, 18, (x, y) => ps.setPosition(x, y));
    for (const e of sc.enemies) if (!e.dead && !e.isBoss) keep(e, 20, (x, y) => e.setPosition(x, y));
    // health bars on the frames
    const g = this.bars.clear();
    for (const b of this.bound) {
      if (b.freed) continue;
      const w = 48;
      g.fillStyle(0x000000, 0.75).fillRect(b.x - w / 2 - 1, b.y - 52, w + 2, 7);
      g.fillStyle(b.hp / b.max > 0.35 ? 0x22d3ee : 0xf97316, 1).fillRect(b.x - w / 2, b.y - 51, (w * Math.max(0, b.hp)) / b.max, 5);
      // the bound ones struggle
      b.lad.x = b.x + Math.sin(now / 90 + b.ang * 3) * 1.2;
    }
    if (!this.fighting || sc.busy) return;
    // the bound ones scream for help
    if (now > this.nextHelp) {
      this.nextHelp = now + 2200 + Math.random() * 1800;
      const stuck = this.bound.filter((b) => !b.freed);
      const b = stuck[Math.floor(Math.random() * stuck.length)];
      if (b) sc.floatText(b.x, b.y - 66, FR.HELP[Math.floor(Math.random() * FR.HELP.length)], "#fca5a5", 12);
      const free = this.bound.filter((x) => x.freed);
      const c = free[Math.floor(Math.random() * free.length)];
      if (c && Math.random() < 0.6) sc.floatText(c.x, c.y - 50, FR.CHEERS[Math.floor(Math.random() * FR.CHEERS.length)], "#86efac", 12);
    }
    // freed lads shoot the mini drongi (and plink off Drongus)
    for (const b of this.bound) {
      if (!b.freed || now < b.nextShot) continue;
      b.nextShot = now + 1100 + Math.random() * 700;
      const t = this.nearestMini(b.x, b.y) ?? (this.boss && Math.random() < 0.3 ? this.boss : null);
      if (!t) continue;
      const a = Math.atan2(t.y - b.y, t.x - b.x);
      b.lad.setData("facing", Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? "east" : "west") : Math.sin(a) > 0 ? "south" : "north");
      animateWalker(b.lad, 0, 0, false, 0);
      const o = { owner: "player", damage: 9, speed: 560, angle: a, color: 0x86efac, life: 1100, ally: true } as ShotOpts & { ally: boolean };
      sc.shoot(b.x, b.y - 8, o);
      synth.play("shoot");
    }
  }

  private nearestMini(x: number, y: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = 520;
    for (const e of this.sc.enemies) {
      if (e.dead || e.isBoss) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /** Rain (in screen space) and the odd lightning strike. */
  private weather(dt: number, now: number) {
    const g = this.rain.clear();
    g.lineStyle(1, 0xaab8ff, 0.35);
    for (const d of this.drops) {
      d.y += (d.v * dt) / 1000;
      d.x -= (d.v * 0.25 * dt) / 1000;
      if (d.y > 560) {
        d.y = -20;
        d.x = Math.random() * 1100;
      }
      g.lineBetween(d.x, d.y, d.x - d.l * 0.25, d.y - d.l);
    }
    if (now > this.nextBolt) {
      this.nextBolt = now + 3500 + Math.random() * 5000;
      if (this.nextBolt - now > 0 && now > 0) this.bolt();
    }
  }

  private bolt() {
    const sc = this.sc;
    this.flash.setFillStyle(0xdfe6ff, 0.35);
    sc.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 420 });
    const g = sc.add.graphics().setScrollFactor(0).setDepth(2898);
    let x = 100 + Math.random() * 760;
    let y = 0;
    g.lineStyle(3, 0xffffff, 0.9).beginPath().moveTo(x, y);
    while (y < 200 + Math.random() * 200) {
      x += (Math.random() - 0.5) * 60;
      y += 20 + Math.random() * 30;
      g.lineTo(x, y);
    }
    g.strokePath();
    sc.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
    sc.time.delayedCall(200 + Math.random() * 500, () => synth.play(Math.random() < 0.5 ? "thunder_1" : "thunder_2"));
  }

  /** Test/debug: free everyone now. */
  freeAll() {
    for (const b of this.bound) if (!b.freed) this.free(b);
  }

  destroy() {
    this.fighting = false;
    this.done = true;
    synth.weatherSound(null);
  }
}

export const ROOF_FONT = FONT;
