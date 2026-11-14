import Phaser from "phaser";
import type { Line } from "../../data/types";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo, fadeThen } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT } from "../ui/theme";
import { charMeta } from "../gfx/HD";
import { hasVfx, vfx } from "../gfx/Vfx";
import { CHARACTERS, LADS } from "../../data/characters";
import * as FB from "../../content/finaleKrelford";
import { finalePreload, finaleReady } from "./finale/finaleArt";

/**
 * THE KRELWORLD FINALE, part B: the side-on cutscenes in Krelford.
 *   beat "emerge":    THE CONCEPT OF PAEDOPHILIA rises out of the wreck of Da Drongus Dungeon. Then: the fight.
 *   beat "transform": the group super-saiyan transformation (an overlay on the paused fight; `done` resumes it).
 *   beat "spirit":    Goku's SPIRIT CUM. The dragon and the wizard are destroyed. Then: the Ending.
 * Started with switchTo(scene, "Finale", { beat }) (or launched as an overlay with { beat, overlay: true, done }).
 */

const W = 960;
const FLOOR = 350;
const never = () => new Promise<void>(() => undefined);

type Beat = "emerge" | "transform" | "spirit";
interface FinaleData {
  beat: Beat;
  overlay?: boolean;
  done?: () => void;
}

export class FinaleScene extends Phaser.Scene {
  private box!: DialogueBox;
  private dead = false;
  private ended = false;
  private data0!: FinaleData;
  private flash!: Phaser.GameObjects.Rectangle;
  private dragon: Phaser.GameObjects.Image | null = null;
  private wizard: Phaser.GameObjects.Image | null = null;
  private lads: { id: string; spr: Phaser.GameObjects.Sprite; aura?: Phaser.GameObjects.Sprite; hair?: Phaser.GameObjects.Graphics }[] = [];
  private escHandler?: (e: KeyboardEvent) => void;
  private stormOn = true;

  constructor() {
    super("Finale");
  }

  preload() {
    finalePreload(this);
  }

  async create(data: FinaleData) {
    this.data0 = { beat: data?.beat ?? "emerge", overlay: data?.overlay, done: data?.done };
    this.dead = false;
    this.ended = false;
    this.lads = [];
    this.dragon = null;
    this.wizard = null;
    this.stormOn = true;
    finaleReady(this);
    this.events.once("shutdown", () => {
      this.dead = true;
      if (this.escHandler) window.removeEventListener("keydown", this.escHandler);
    });
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") this.finish(true);
    };
    window.addEventListener("keydown", this.escHandler);
    if (this.data0.overlay) this.scene.bringToTop();
    this.cameras.main.fadeIn(500);
    this.box = new DialogueBox(this, 1000, 0.1);
    this.add.text(W - 10, 8, "Esc: skip scene", { fontFamily: FONT, fontSize: "11px", color: "#8a8fa0" }).setOrigin(1, 0).setDepth(1100);
    this.drawTown();
    this.flash = this.add.rectangle(480, 270, W, 540, 0xe9e4ff, 0).setDepth(900).setBlendMode(Phaser.BlendModes.ADD);
    this.rain();
    synth.weatherSound("storm");
    this.lightningLoop();
    const b = this.data0.beat;
    if (b === "emerge") await this.emerge();
    else if (b === "transform") await this.transform();
    else await this.spirit();
    this.finish(false);
  }

  private finish(skipped: boolean) {
    if (this.ended || this.dead) return;
    this.ended = true;
    const s = G.s;
    const b = this.data0.beat;
    if (b === "emerge") s.flags.finale_emerged = true;
    if (b === "spirit") {
      s.flags.concept_destroyed = true;
      s.flags.ch7_clear = true;
      s.phase = "hub";
      delete s.flags.finale_cp;
    }
    G.save();
    synth.weatherSound(null);
    if (this.data0.overlay) {
      // back to the fight
      const done = this.data0.done;
      this.cameras.main.fadeOut(skipped ? 200 : 400);
      this.time.delayedCall(skipped ? 220 : 420, () => {
        this.scene.stop();
        done?.();
      });
      return;
    }
    // after the SPIRIT CUM: the long whiteness, then the morning after in Krelford (HubScene.finaleDawn), then the Ending
    if (b === "spirit") {
      s.flags.finale_dawn = true;
      G.save();
      this.cameras.main.fadeOut(skipped ? 300 : 1200, 255, 255, 255);
      this.time.delayedCall(skipped ? 320 : 1250, () => switchTo(this, "Hub", { at: "TOWN_HALL", from: "finale_dawn" }));
      return;
    }
    fadeThen(this, skipped ? 300 : 900, () => switchTo(this, "Dungeon", { dungeon: "krelford_finale", room: 0 }));
  }

  // ---------------------------------------------------------------- the set

  /** Ruined Krelford at night, side-on: a broken skyline, fires, rubble, rain. */
  private drawTown() {
    const g = this.add.graphics().setDepth(-20);
    g.fillGradientStyle(0x05010c, 0x05010c, 0x2a0f3d, 0x2a0f3d, 1).fillRect(0, 0, W, FLOOR);
    const rnd = new Phaser.Math.RandomDataGenerator(["finale_skyline"]);
    // far skyline
    for (let x = -20; x < W + 40; x += rnd.between(40, 90)) {
      const h = rnd.between(40, 130);
      const w = rnd.between(36, 80);
      g.fillStyle(0x140a1c, 1).fillRect(x, FLOOR - 40 - h, w, h + 40);
      // the bombed-out tops: jagged
      for (let k = 0; k < 4; k++) g.fillStyle(0x05010c, 1).fillTriangle(x + rnd.between(0, w), FLOOR - 40 - h - 2, x + rnd.between(0, w), FLOOR - 40 - h + rnd.between(6, 30), x + rnd.between(0, w), FLOOR - 40 - h - 2);
      // windows lit by fire
      for (let k = 0; k < 3; k++) if (rnd.frac() < 0.5) g.fillStyle(rnd.frac() < 0.5 ? 0xff7a2a : 0xffb347, 0.7).fillRect(x + rnd.between(4, w - 8), FLOOR - 30 - rnd.between(0, h), 4, 5);
    }
    // nearer skyline
    for (let x = -30; x < W + 40; x += rnd.between(70, 140)) {
      const h = rnd.between(20, 80);
      g.fillStyle(0x0d0711, 1).fillRect(x, FLOOR - h, rnd.between(50, 110), h);
    }
    // glow of the fires
    const glow = this.add.rectangle(480, FLOOR - 30, W, 120, 0xff6a2a, 0.12).setDepth(-19).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.06, yoyo: true, repeat: -1, duration: 900 });
    // ground
    const ground = this.add.graphics().setDepth(-5);
    ground.fillStyle(0x1a1310, 1).fillRect(0, FLOOR, W, 540 - FLOOR);
    ground.fillStyle(0x0b0806, 1).fillRect(0, FLOOR, W, 4);
    for (let i = 0; i < 70; i++) ground.fillStyle(rnd.frac() < 0.5 ? 0x2a211c : 0x3a2f2a, 1).fillRect(rnd.between(0, W), FLOOR + rnd.between(2, 40), rnd.between(6, 24), rnd.between(3, 9));
    if (hasVfx(this, "vfx_fire")) for (let i = 0; i < 6; i++) vfx(this, "vfx_fire", 60 + i * 170 + rnd.between(-30, 30), FLOOR - rnd.between(30, 90), { scale: 0.8 + rnd.frac() * 0.6, depth: -18, alpha: 0.85 });
  }

  private rain() {
    if (!hasVfx(this, "vfx_rain")) return;
    for (let l = 0; l < 2; l++)
      for (let gx = 0; gx < 3; gx++)
        for (let gy = 0; gy < 3; gy++) vfx(this, "vfx_rain", 160 + gx * 320 + l * 90, 100 + gy * 200 + l * 60, { fixed: true, scale: 2 + l * 0.4, depth: 800 + l, alpha: 0.6, speed: 1.5, angle: 12 })?.anims.setProgress(Math.random());
  }

  /** Lightning: the sky flashes, a bolt comes down, and the wizard shows behind the monster. */
  private strike(close = true) {
    if (this.dead || this.ended || !this.stormOn) return;
    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0);
    this.tweens.chain({ targets: this.flash, tweens: [{ alpha: close ? 0.6 : 0.3, duration: 40 }, { alpha: 0.05, duration: 80 }, { alpha: close ? 0.5 : 0.2, duration: 40 }, { alpha: 0, duration: 500 }] });
    const x = 80 + Math.random() * (W - 160);
    const bolt = this.add.graphics().setDepth(-15).setBlendMode(Phaser.BlendModes.ADD);
    let px = x;
    let py = 0;
    bolt.lineStyle(4, 0xd8c8ff, 1).beginPath().moveTo(px, py);
    while (py < FLOOR - 60) {
      px += (Math.random() - 0.5) * 60;
      py += 20 + Math.random() * 30;
      bolt.lineTo(px, py);
    }
    bolt.strokePath();
    this.tweens.add({ targets: bolt, alpha: 0, duration: 300, onComplete: () => bolt.destroy() });
    if (this.wizard) {
      this.tweens.killTweensOf(this.wizard);
      this.wizard.setAlpha(0.7);
      this.tweens.add({ targets: this.wizard, alpha: 0, delay: 350, duration: 1100 });
    }
    if (this.dragon) {
      this.dragon.setTintFill(0xe9d5ff);
      this.time.delayedCall(70, () => this.dragon?.active && this.dragon.clearTint());
    }
    if (close) this.cameras.main.shake(250, 0.004);
    this.time.delayedCall(close ? 100 : 500, () => !this.dead && synth.play(Math.random() < 0.5 ? "thunder_1" : "thunder_2"));
  }

  private lightningLoop() {
    const go = () => {
      if (this.dead || this.ended) return;
      this.strike(Math.random() < 0.6);
      this.time.delayedCall(3500 + Math.random() * 4000, go);
    };
    this.time.delayedCall(1800, go);
  }

  /** The whole Krew (you included), side-on. */
  private placeLads(xs: number[], face: "west" | "south" | "east", scale = 3, y = FLOOR + 8) {
    const s = G.s;
    const ids = [s.player, ...LADS.filter((p) => p !== s.player), "MIKEY"].filter((p, i, a) => a.indexOf(p) === i && this.textures.exists(`spr_${p}`));
    this.lads = ids.slice(0, xs.length).map((id, i) => {
      const key = `spr_${id}`;
      const meta = charMeta(this, key);
      const f = meta?.idle?.[face] ?? 0;
      const yy = y + (i % 2) * 10;
      const spr = this.add.sprite(xs[i], yy, key, f).setOrigin(0.5, 1).setScale(scale).setDepth(100 + yy);
      if (!meta && face === "west") spr.setFlipX(true);
      return { id, spr };
    });
  }

  private makeDragon(x: number, y: number, scale: number) {
    // the wizard first, behind it
    // (drawn over the monster, see-through: a spectre looming behind it that only the lightning shows)
    const wk = this.textures.exists("fb_wizard") ? "fb_wizard" : "boss_drongus";
    this.wizard = this.add.image(x + 70, y - 30, wk, 0).setOrigin(0.5, 1).setScale(scale * 2.6).setDepth(-9).setTint(0xa78bfa).setAlpha(0).setBlendMode(Phaser.BlendModes.SCREEN);
    const key = this.textures.exists("fb_dragon_side") ? "fb_dragon_side" : "boss_drongus";
    this.dragon = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(key === "fb_dragon_side" ? scale : scale * 3).setDepth(-10);
    if (key !== "fb_dragon_side") this.dragon.setTint(0x4c1d95);
    // breathing
    this.tweens.add({ targets: this.dragon, scaleY: this.dragon.scaleY * 1.025, yoyo: true, repeat: -1, duration: 1300, ease: "Sine.inOut" });
    return this.dragon;
  }

  // ---------------------------------------------------------------- beat 1: it comes out of the rubble

  private async emerge() {
    synth.stopMusic();
    // a heap of wreckage in the middle, the lads on the right looking at it
    const heap = this.add.graphics().setDepth(-4);
    const rnd = new Phaser.Math.RandomDataGenerator(["heap"]);
    for (let i = 0; i < 120; i++) {
      const x = 60 + rnd.between(0, 560);
      const h = Math.max(0, 120 - Math.abs(x - 340) * 0.35);
      heap.fillStyle(rnd.pick([0x1f1a24, 0x2a2433, 0x3a2f3f, 0x4a2a5a, 0x241c1c]), 1).fillRect(x, FLOOR - rnd.between(0, h), rnd.between(14, 40), rnd.between(10, 26));
    }
    // girders sticking out
    heap.lineStyle(6, 0x3f3f46, 1).lineBetween(180, FLOOR - 10, 230, FLOOR - 110).lineBetween(470, FLOOR - 5, 420, FLOOR - 95).lineBetween(300, FLOOR, 360, FLOOR - 130);
    this.placeLads([640, 690, 740, 790, 840, 885, 925, 600, 560], "west");
    const dragon = this.makeDragon(340, FLOOR + 520, 1.55);
    // it comes up out of the ground: masked at the heap line
    const m = this.make.graphics({}, false);
    m.fillRect(0, 0, W, FLOOR + 6);
    dragon.setMask(m.createGeometryMask());
    await this.talk(FB.FB_RUMBLE.slice(0, 1));
    // the rumble
    synth.play("boom");
    this.cameras.main.shake(7000, 0.01);
    const debris = this.time.addEvent({
      delay: 70,
      repeat: 90,
      callback: () => {
        const r = this.add.rectangle(200 + Math.random() * 300, FLOOR - Math.random() * 60, 4 + Math.random() * 10, 4 + Math.random() * 10, Phaser.Utils.Array.GetRandom([0x2a2433, 0x3a2f3f, 0x4a2a5a]) as number).setDepth(-3);
        this.tweens.add({ targets: r, x: r.x + (Math.random() - 0.5) * 400, y: r.y - 100 - Math.random() * 200, angle: 400, duration: 600, yoyo: true, ease: "Quad.out", onComplete: () => r.destroy() });
      },
    });
    if (hasVfx(this, "vfx_dust")) this.time.addEvent({ delay: 300, repeat: 20, callback: () => vfx(this, "vfx_dust", 140 + Math.random() * 400, FLOOR, { scale: 2.5 + Math.random() * 2, depth: -2 }) });
    // panic on the right
    this.lads.forEach((l, i) => this.tweens.add({ targets: l.spr, y: l.spr.y - 10, yoyo: true, repeat: 8, duration: 140 + i * 13 }));
    for (let i = 0; i < 4; i++) this.time.delayedCall(800 + i * 1400, () => {
      synth.play("roar");
      this.strike(true);
    });
    this.tweens.add({ targets: dragon, y: FLOOR + 34, duration: 6200, ease: "Sine.out" });
    await this.wait(6400);
    debris.remove();
    dragon.clearMask(true);
    synth.play("roar");
    this.cameras.main.shake(900, 0.02);
    this.strike(true);
    synth.music("c7_concept");
    await this.talk(FB.FB_EMERGE_PANIC);
    // the title
    this.strike(true);
    const t = this.add.text(480, 96, "THE CONCEPT OF PAEDOPHILIA", { fontFamily: "Impact, sans-serif", fontSize: "54px", color: "#e11d48", stroke: "#1a0026", strokeThickness: 10, align: "center" }).setOrigin(0.5).setDepth(950).setScale(3).setAlpha(0);
    const sub = this.add.text(480, 146, "— A CONCEPT —", { fontFamily: FONT, fontSize: "16px", color: "#c4b5fd", fontStyle: "bold" }).setOrigin(0.5).setDepth(950).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 380, ease: "Back.out" });
    this.tweens.add({ targets: sub, alpha: 1, delay: 500, duration: 600 });
    synth.play("smash");
    this.cameras.main.shake(500, 0.02);
    this.cameras.main.flash(200, 120, 0, 40);
    await this.wait(1600);
    await this.talk(FB.FB_TITLE_REACT);
    // its voice: deep, distorted (the screen warps when it talks)
    await this.talk(FB.FB_DEFINITION);
    this.tweens.add({ targets: [t, sub], alpha: 0, duration: 600 });
    await this.talk(FB.FB_DEFIANT);
    synth.play("roar");
    this.cameras.main.shake(600, 0.015);
    await this.wait(500);
  }

  // ---------------------------------------------------------------- beat 2: SUPER SAIYAN

  private async transform() {
    synth.music("c7_transform", true);
    const xs = [100, 195, 290, 385, 480, 575, 670, 765, 860];
    this.placeLads(xs, "south", 3.6, FLOOR + 10);
    await this.talk(FB.FB_ALL_INJECTED.slice(1));
    // power up: one by one, then all at once
    this.cameras.main.shake(12000, 0.006);
    const crackle = this.time.addEvent({ delay: 160, loop: true, callback: () => this.crackle(Phaser.Utils.Array.GetRandom(this.lads) as (typeof this.lads)[number]) });
    for (const [i, l] of this.lads.entries()) {
      this.powerUp(l, i);
      await this.wait(650);
    }
    await this.talk(FB.FB_TRANSFORM.slice(0, 2));
    // the shirts go
    for (const l of this.lads) this.ripShirt(l);
    synth.play("smash");
    await this.wait(700);
    await this.talk(FB.FB_TRANSFORM.slice(2));
    // the final scream: white out
    this.cameras.main.shake(1200, 0.03);
    synth.play("roar");
    this.cameras.main.flash(900, 255, 240, 180);
    const cap = this.add.text(480, 110, "SUPER KRELWORLD KREW", { fontFamily: "Impact, sans-serif", fontSize: "60px", color: "#ffe066", stroke: "#7a4a00", strokeThickness: 10 }).setOrigin(0.5).setDepth(950).setScale(0.2);
    this.tweens.add({ targets: cap, scale: 1, duration: 400, ease: "Back.out" });
    this.speedLines(480, 260, 2200);
    await this.wait(2600);
    crackle.remove();
  }

  /** A lad starts to glow: gold aura, gold tint, spiky gold hair, bulging. */
  private powerUp(l: (typeof this.lads)[number], i: number) {
    const sp = l.spr;
    synth.play(i % 2 ? "zap" : "telegraph");
    if (this.textures.exists("fb_aura")) {
      l.aura = this.add.sprite(sp.x, sp.y + 6, "fb_aura", 0).setOrigin(0.5, 0.875).setScale(1.25, 1.5).setDepth(sp.depth - 1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff27a).setAlpha(0.55);
      l.aura.play("fb_aura");
    } else {
      const glow = this.add.ellipse(sp.x, sp.y - 60, 110, 190, 0xffd23f, 0.35).setDepth(sp.depth - 1).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: glow, scaleX: 1.15, alpha: 0.2, yoyo: true, repeat: -1, duration: 120 });
    }
    sp.setTint(0xfff0b0);
    this.tweens.add({ targets: sp, scaleX: sp.scaleX * 1.12, duration: 900, ease: "Back.out" });
    l.hair = this.hair(sp);
    this.crackle(l);
  }

  /** Super-saiyan hair: gold spikes over the head. */
  private hair(sp: Phaser.GameObjects.Sprite) {
    const g = this.add.graphics().setDepth(sp.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
    const top = sp.y - sp.displayHeight * 0.74;
    const draw = (k: number) => {
      g.clear();
      g.fillStyle(0xffe066, 0.95);
      for (let j = -3; j <= 3; j++) {
        const bx = sp.x + j * 8;
        g.fillTriangle(bx - 7, top + 14, bx + 7, top + 14, bx + j * 5, top - 16 - (3 - Math.abs(j)) * 6 - k * 3);
      }
    };
    draw(0);
    let k = 0;
    this.time.addEvent({ delay: 90, loop: true, callback: () => g.active && draw((k = 1 - k)) });
    return g;
  }

  private crackle(l?: (typeof this.lads)[number]) {
    if (!l || this.dead) return;
    const sp = l.spr;
    const g = this.add.graphics().setDepth(sp.depth + 2).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(2, 0xfff7c2, 1);
    let x = sp.x + (Math.random() - 0.5) * 60;
    let y = sp.y - sp.displayHeight * Math.random();
    g.beginPath().moveTo(x, y);
    for (let k = 0; k < 4; k++) g.lineTo((x += (Math.random() - 0.5) * 30), (y += (Math.random() - 0.5) * 30));
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() });
  }

  /** RRRIP: the shirt comes off in bits. */
  private ripShirt(l: (typeof this.lads)[number]) {
    const sp = l.spr;
    const col = CHARACTERS[l.id]?.color ?? 0x999999;
    const t = this.add.text(sp.x, sp.y - sp.displayHeight - 20, "RRRIP!", { fontFamily: "Impact, sans-serif", fontSize: "18px", color: "#ffffff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(960);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 500, duration: 500, onComplete: () => t.destroy() });
    for (let k = 0; k < 7; k++) {
      const r = this.add.rectangle(sp.x + (Math.random() - 0.5) * 30, sp.y - sp.displayHeight * 0.5, 6 + Math.random() * 10, 5 + Math.random() * 8, col).setDepth(sp.depth + 3);
      this.tweens.add({ targets: r, x: r.x + (Math.random() - 0.5) * 260, y: r.y - 80 - Math.random() * 160, angle: 720 * (Math.random() - 0.5), alpha: 0, duration: 1100, ease: "Quad.out", onComplete: () => r.destroy() });
    }
    // and the muscles come out
    this.tweens.add({ targets: sp, scaleX: sp.scaleX * 1.1, scaleY: sp.scaleY * 1.04, duration: 300, ease: "Back.out" });
  }

  /** Anime speed lines radiating from a point. */
  private speedLines(cx: number, cy: number, ms: number) {
    const g = this.add.graphics().setDepth(940);
    const draw = () => {
      g.clear();
      for (let i = 0; i < 46; i++) {
        const a = Math.random() * Math.PI * 2;
        const r0 = 160 + Math.random() * 120;
        g.lineStyle(1 + Math.random() * 3, 0xffffff, 0.5 + Math.random() * 0.4);
        g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * 800, cy + Math.sin(a) * 800);
      }
    };
    const ev = this.time.addEvent({ delay: 60, loop: true, callback: draw });
    draw();
    this.time.delayedCall(ms, () => {
      ev.remove();
      g.destroy();
    });
  }

  // ---------------------------------------------------------------- beat 3: SPIRIT CUM

  private async spirit() {
    synth.music("c7_spirit", true);
    const dragon = this.makeDragon(250, FLOOR + 40, 1.45);
    this.placeLads([300, 354, 408, 462, 516, 570, 624, 678, 732], "west", 3.4, FLOOR - 4);
    for (const [i, l] of this.lads.entries()) {
      if (this.textures.exists("fb_aura")) {
        l.aura = this.add.sprite(l.spr.x, l.spr.y + 6, "fb_aura", 0).setOrigin(0.5, 0.875).setScale(1.1, 1.4).setDepth(l.spr.depth - 1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff27a).setAlpha(0.5);
        l.aura.play({ key: "fb_aura", startFrame: i % 8 });
      }
      l.spr.setTint(0xfff0b0);
      l.hair = this.hair(l.spr);
    }
    // Goku, on a pile of rubble, arms up
    const mound = this.add.graphics().setDepth(-3);
    mound.fillStyle(0x2a2433, 1).fillTriangle(720, FLOOR + 10, 960, FLOOR + 10, 850, FLOOR - 70);
    const gk = this.textures.exists("fb_goku_charge") ? this.add.image(850, FLOOR - 64, "fb_goku_charge").setScale(2.6) : this.add.image(850, FLOOR - 64, "spr_TV_GOKU", 0).setScale(5.2);
    gk.setOrigin(0.5, 1).setDepth(60);
    // the orb
    const orb = this.add.container(850, FLOOR - 64 - gk.displayHeight - 40).setDepth(70);
    const o1 = this.add.circle(0, 0, 50, 0xfff4c2, 0.35).setBlendMode(Phaser.BlendModes.ADD);
    const o2 = this.add.circle(0, 0, 36, 0xffffff, 0.8).setBlendMode(Phaser.BlendModes.ADD);
    const o3 = this.add.circle(0, 0, 22, 0xffffff, 1);
    orb.add([o1, o2, o3]);
    this.tweens.add({ targets: o1, scale: 1.2, alpha: 0.2, yoyo: true, repeat: -1, duration: 220 });
    // motes streaming into it from all over town
    const motes = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const a = Math.random() * Math.PI * 2;
        const m = this.add.circle(orb.x + Math.cos(a) * 500, orb.y + Math.sin(a) * 400, 2 + Math.random() * 2, 0xfff4c2, 1).setDepth(69).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: m, x: orb.x, y: orb.y, duration: 700, ease: "Quad.in", onComplete: () => m.destroy() });
      },
    });
    await this.wait(600);
    await this.talk(FB.FB_READY);
    // it grows
    this.tweens.add({ targets: orb, scale: 2.4, duration: 1500, ease: "Sine.in" });
    this.cameras.main.shake(1500, 0.01);
    this.speedLines(orb.x, orb.y, 1500);
    await this.wait(1600);
    await this.talk(FB.FB_SPIRIT);
    motes.remove();
    // THROW
    this.stormOn = false;
    synth.play("rocket");
    this.cameras.main.zoomTo(1.15, 400);
    const trail = this.time.addEvent({
      delay: 20,
      loop: true,
      callback: () => {
        const t = this.add.circle(orb.x, orb.y, 40 * orb.scale, 0xfff4c2, 0.5).setDepth(68).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: t, alpha: 0, scale: 0.4, duration: 400, onComplete: () => t.destroy() });
      },
    });
    this.speedLines(480, 220, 1100);
    await new Promise<void>((res) => this.tweens.add({ targets: orb, x: dragon.x + 30, y: dragon.y - dragon.displayHeight * 0.55, scale: 3.4, duration: 1000, ease: "Quad.in", onComplete: () => res() }));
    trail.remove();
    // IMPACT
    const white = this.add.rectangle(480, 270, W * 2, 1100, 0xffffff, 1).setDepth(980).setScrollFactor(0);
    synth.play("boom");
    synth.play("explode_1");
    this.cameras.main.shake(2000, 0.03);
    this.cameras.main.zoomTo(1, 200);
    orb.destroy();
    dragon.setTintFill(0xffffff);
    this.tweens.killTweensOf(dragon);
    // the wizard, shown one last time, coming apart
    const wz = this.wizard;
    await this.wait(900);
    this.tweens.add({ targets: white, alpha: 0.35, duration: 1200 });
    if (wz) {
      this.tweens.killTweensOf(wz);
      wz.setAlpha(0.8).setTintFill(0xffffff).setDepth(-9);
      const scream = this.add.text(wz.x, wz.y - wz.displayHeight - 10, "AAAAAAAAAAAAAAARGH", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#c4b5fd", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(990);
      this.tweens.add({ targets: scream, alpha: 0, y: scream.y - 40, delay: 1500, duration: 800 });
      this.disintegrate(wz, 0xe9d5ff);
    }
    this.disintegrate(dragon, 0xffffff);
    // god rays
    const rays = this.add.graphics().setDepth(985).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      rays.fillStyle(0xfff7d6, 0.18).fillTriangle(dragon.x, FLOOR - 160, dragon.x + Math.cos(a) * 900, FLOOR - 160 + Math.sin(a) * 900, dragon.x + Math.cos(a + 0.12) * 900, FLOOR - 160 + Math.sin(a + 0.12) * 900);
    }
    this.tweens.add({ targets: rays, alpha: 0, duration: 3000 });
    this.tweens.add({ targets: [dragon, wz].filter(Boolean), alpha: 0, scaleX: "*=1.3", duration: 2600 });
    await this.wait(2600);
    this.tweens.add({ targets: white, alpha: 0, duration: 1500 });
    this.dragon = null;
    this.wizard = null;
    await this.talk(FB.FB_DESTROYED);
    // the rain stops; stars
    synth.weatherSound(null);
    for (let i = 0; i < 70; i++) {
      const st = this.add.circle(Math.random() * W, Math.random() * (FLOOR - 120), Math.random() < 0.2 ? 1.6 : 1, 0xffffff, 0).setDepth(-19);
      this.tweens.add({ targets: st, alpha: 0.5 + Math.random() * 0.5, delay: Math.random() * 2000, duration: 900 });
    }
    for (const o of this.children.list) if (o instanceof Phaser.GameObjects.Sprite && o.texture.key === "vfx_rain") this.tweens.add({ targets: o, alpha: 0, duration: 1500 });
    await this.talk(FB.FB_AFTER.slice(0, 6));
    // Goku's off
    this.tweens.add({ targets: gk, y: gk.y - 600, duration: 700, ease: "Quad.in", delay: 300 });
    await this.talk(FB.FB_AFTER.slice(6));
    await this.wait(400);
  }

  /** Something comes apart into motes of light. */
  private disintegrate(o: Phaser.GameObjects.Image, col: number) {
    const b = o.getBounds();
    this.time.addEvent({
      delay: 25,
      repeat: 110,
      callback: () => {
        const p = this.add.rectangle(b.x + Math.random() * b.width, b.y + Math.random() * b.height, 3 + Math.random() * 5, 3 + Math.random() * 5, col, 1).setDepth(986).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: p, x: p.x + 40 + Math.random() * 120, y: p.y - 80 - Math.random() * 160, alpha: 0, duration: 1400 + Math.random() * 800, onComplete: () => p.destroy() });
      },
    });
  }

  // ---------------------------------------------------------------- helpers

  private wait(ms: number) {
    if (this.dead || this.ended) return never();
    return new Promise<void>((res) => this.time.delayedCall(ms, () => res()));
  }

  private async talk(lines: Line[]) {
    if (this.dead || this.ended) return never();
    await this.box.play(lines, {
      onLine: (l) => {
        if (String(l.s) === FB.CONCEPT) {
          // the deep, distorted voice: the whole screen judders
          this.cameras.main.shake(900, 0.008);
          this.strike(true);
          synth.play("roar");
        }
        if (l.t === FB.FB_NO) this.cameras.main.shake(800, 0.02);
      },
    });
    if (this.dead || this.ended) return never();
  }
}
