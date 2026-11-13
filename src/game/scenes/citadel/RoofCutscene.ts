import Phaser from "phaser";
import type { Line, PlayableId } from "../../../data/types";
import { PLAYABLE_IDS } from "../../../data/types";
import { G } from "../../G";
import { DialogueBox } from "../../ui/DialogueBox";
import { fadeThen, switchTo } from "../../Flow";
import { synth } from "../../audio/Synth";
import { FONT, title } from "../../ui/theme";
import { animateWalker, playPerf } from "../../gfx/HD";
import { censorRect } from "../../gfx/Censor";
import { hasVfx, vfx } from "../../gfx/Vfx";
import * as FR from "../../../content/finaleRoof";
import { FINALE_BOTTLE_AT, FINALE_LOGS_AT, roofPreload, roofReady } from "./RoofArena";

/**
 * The finale's side-on cutscenes (the roof of Da Drongus Dungeon). Started with switchTo(scene, "RoofCutscene", { beat }).
 * - "transform": he drinks the juice, injects it into his forehead, screams for a long time and becomes DARK DRONGUS.
 *   Back to the roof fight after (Dungeon, the same room).
 * - "krezz": the lads stand in a line (one big censor bar), he throws the bottle and the chat logs off the roof (a
 *   shot of them landing in Krelford: their spots are saved for part two), the GROUP KREZZ goes down his throat and
 *   his head explodes, the dungeon collapses, and everyone surfs down on the wreckage. Then Krelford (Hub, CITADEL).
 * Esc skips.
 */

const W = 960;
const H = 540;
const FLOOR = 350;
const GOLD = 0xffd23f;

type Beat = "transform" | "krezz";

const never = () => new Promise<void>(() => undefined);

export class RoofCutscene extends Phaser.Scene {
  private box!: DialogueBox;
  private beat: Beat = "transform";
  private back: { dungeon: string; room: number } = { dungeon: "citadel", room: 7 };
  private dead = false;
  private ended = false;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private rain!: Phaser.GameObjects.Graphics;
  private drops: { x: number; y: number; v: number }[] = [];
  private stage!: Phaser.GameObjects.Container;
  private escHandler?: (e: KeyboardEvent) => void;
  private rainOn = true;

  constructor() {
    super("RoofCutscene");
  }

  init(data: { beat?: Beat; dungeon?: string; room?: number }) {
    this.beat = data.beat === "krezz" ? "krezz" : "transform";
    this.back = { dungeon: data.dungeon ?? "citadel", room: data.room ?? 7 };
  }

  preload() {
    roofPreload(this);
    if (!this.textures.exists("bld_CITADEL")) this.load.image("bld_CITADEL", "art/buildings/CITADEL.png");
  }

  async create() {
    roofReady(this);
    this.dead = false;
    this.ended = false;
    this.rainOn = true;
    this.events.once("shutdown", () => {
      this.dead = true;
      if (this.escHandler) window.removeEventListener("keydown", this.escHandler);
    });
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") this.finish(true);
    };
    window.addEventListener("keydown", this.escHandler);
    (window as unknown as { __roofBeat?: string }).__roofBeat = this.beat;
    this.cameras.main.fadeIn(500);
    this.box = new DialogueBox(this, 1000, 0.1);
    this.stage = this.add.container(0, 0);
    this.buildRoof();
    this.flashRect = this.add.rectangle(480, 270, W, H, 0xffffff, 0).setDepth(900).setScrollFactor(0);
    this.rain = this.add.graphics().setDepth(890).setScrollFactor(0);
    for (let i = 0; i < 160; i++) this.drops.push({ x: Math.random() * 1100, y: Math.random() * 560, v: 800 + Math.random() * 500 });
    this.events.on("update", (_t: number, dt: number) => this.weather(dt));
    this.add.text(W - 10, 8, "Esc: skip scene", { fontFamily: FONT, fontSize: "11px", color: "#8a8fa0" }).setOrigin(1, 0).setDepth(1100).setScrollFactor(0);
    synth.weatherSound("storm");
    this.lightningLoop();
    if (this.beat === "transform") await this.transform();
    else await this.krezz();
    this.finish(false);
  }

  // ---------------------------------------------------------------- the set

  private buildRoof() {
    const bg = this.textures.exists("bg_roof") ? this.add.image(480, 0, "bg_roof").setOrigin(0.5, 0) : null;
    if (bg) {
      const src = this.textures.get("bg_roof").getSourceImage();
      const k = W / src.width;
      bg.setScale(k).setY(FLOOR + 30 - 170 * (src.height / 216) * k).setDepth(-10);
      const bottom = bg.y + src.height * k;
      const g = this.add.graphics().setDepth(-10);
      g.fillGradientStyle(0x2a2233, 0x2a2233, 0x0b0710, 0x0b0710, 1).fillRect(0, bottom - 1, W, H - bottom + 2);
      g.fillStyle(0x2a2233, 1).fillRect(0, 0, W, Math.max(0, bg.y));
      this.stage.add(bg);
    } else {
      const g = this.add.graphics().setDepth(-10);
      g.fillGradientStyle(0x150a26, 0x150a26, 0x3a1730, 0x3a1730, 1).fillRect(0, 0, W, FLOOR);
      g.fillStyle(0x1c1424, 1).fillRect(0, FLOOR, W, H - FLOOR);
    }
  }

  private weather(dt: number) {
    const g = this.rain.clear();
    if (!this.rainOn) return;
    g.lineStyle(1, 0xc7d2fe, 0.4);
    for (const d of this.drops) {
      d.y += (d.v * dt) / 1000;
      d.x -= (d.v * 0.2 * dt) / 1000;
      if (d.y > 560) {
        d.y = -20;
        d.x = Math.random() * 1150;
      }
      g.lineBetween(d.x, d.y, d.x - 4, d.y - 16);
    }
  }

  private lightningLoop() {
    const strike = () => {
      if (this.dead || this.ended) return;
      if (this.rainOn) this.lightning(0.35);
      this.time.delayedCall(3500 + Math.random() * 5000, strike);
    };
    this.time.delayedCall(1800, strike);
  }

  private lightning(a = 0.6) {
    this.flashRect.setFillStyle(0xdfe6ff, a);
    this.tweens.add({ targets: this.flashRect, fillAlpha: 0, duration: 380 });
    const g = this.add.graphics().setDepth(-9).setScrollFactor(0);
    let x = 80 + Math.random() * 800;
    let y = 0;
    g.lineStyle(3, 0xffffff, 1).beginPath().moveTo(x, y);
    while (y < 220) {
      x += (Math.random() - 0.5) * 60;
      y += 18 + Math.random() * 26;
      g.lineTo(x, y);
    }
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
    this.time.delayedCall(150 + Math.random() * 400, () => synth.play(Math.random() < 0.5 ? "thunder_1" : "thunder_2"));
  }

  /** The other lads, side on (east-facing idle). */
  private lad(id: string, x: number, y: number, scale = 3, facing: "east" | "west" | "south" = "east") {
    const key = this.textures.exists(`spr_${id}`) ? `spr_${id}` : "spr_FLENKY";
    const s = this.add.sprite(x, y, key, 0).setOrigin(0.5, 1).setScale(scale);
    s.setData("facing", facing);
    animateWalker(s, 0, 0, false, 0);
    return s;
  }

  private others(): PlayableId[] {
    return PLAYABLE_IDS.filter((id) => id !== G.s.player);
  }

  // ================================================================= TRANSFORM

  private async transform() {
    synth.music("c7_stairs", true);
    // the lads in their frames, behind him, either side
    const ids = this.others();
    ids.forEach((id, i) => {
      const left = i < ids.length / 2;
      const k = left ? i : i - Math.ceil(ids.length / 2);
      const x = left ? 70 + k * 72 : W - 70 - k * 72;
      const y = FLOOR - 24;
      if (this.textures.exists("fr_binding")) this.add.image(x, y + 6, "fr_binding").setOrigin(0.5, 1).setScale(1.5).setDepth(10).setTint(0x8f88a8);
      const s = this.lad(id, x, y, 2.2, "south").setDepth(11).setTint(0xb8b0cc);
      this.tweens.add({ targets: s, x: x + 1.5, yoyo: true, repeat: -1, duration: 70 + i * 9 });
    });
    const dKey = this.textures.exists("fr_drongus_skinny") ? "fr_drongus_skinny" : this.textures.exists("c7_drongus_skinny") ? "c7_drongus_skinny" : "spr_DRONGUS";
    const d = this.add.sprite(480, FLOOR + 12, dKey, 0).setOrigin(0.5, 1).setDepth(50);
    d.setScale(dKey === "fr_drongus_skinny" ? 2.3 : 4);
    const headY = () => d.y - d.displayHeight * 0.78;
    // the bottle
    const bottle = this.add.image(d.x + 112, FLOOR - 110, this.textures.exists("fr_bottle") ? "fr_bottle" : "c7_bottle_0").setDepth(52).setScale(1.6);
    const glint = this.add.circle(bottle.x, bottle.y, 30, GOLD, 0.25).setDepth(51).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glint, scale: 1.4, alpha: 0.08, yoyo: true, repeat: -1, duration: 500 });
    this.tweens.add({ targets: [bottle, glint], y: "-=40", duration: 900, ease: "Sine.out" });
    await this.talk(FR.XF_BOTTLE);
    // the syringe sucks it up
    const syr = this.add.image(d.x - 80, FLOOR - 140, this.textures.exists("fr_syringe") ? "fr_syringe" : "fr_bottle").setDepth(53).setScale(0.1).setAngle(-30);
    synth.play("pickup");
    this.tweens.add({ targets: syr, scale: 1.4, duration: 300, ease: "Back.out" });
    await this.wait(500);
    this.tweens.add({ targets: syr, x: bottle.x - 30, y: bottle.y - 40, angle: 150, duration: 600, ease: "Sine.inOut" });
    await this.wait(650);
    synth.play("slurp");
    for (let i = 0; i < 26; i++)
      this.time.delayedCall(i * 45, () => {
        const p = this.add.circle(bottle.x, bottle.y - 10, 3, GOLD, 1).setDepth(54).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: p, x: syr.x, y: syr.y, duration: 260, onComplete: () => p.destroy() });
      });
    this.tweens.add({ targets: bottle, alpha: 0.35, duration: 1200 });
    await this.wait(1300);
    await this.talk(FR.XF_SYRINGE);
    // into the forehead
    this.tweens.add({ targets: syr, x: d.x + 28, y: headY() - 18, angle: 215, duration: 700, ease: "Sine.inOut" });
    await this.wait(720);
    this.cameras.main.zoomTo(1.6, 300, "Quad.easeOut");
    this.cameras.main.pan(d.x, headY(), 300, "Quad.easeOut");
    await this.wait(300);
    synth.play("squelch");
    synth.play("hit");
    this.caption("*SHLUNK*", "#ffffff", 42, 0.6);
    this.tweens.add({ targets: syr, x: d.x + 14, y: headY() - 6, duration: 120 });
    await this.wait(700);
    this.tweens.add({ targets: syr, alpha: 0, angle: 300, x: syr.x + 100, y: FLOOR, duration: 600, onComplete: () => syr.destroy() });
    bottle.destroy();
    glint.destroy();
    this.cameras.main.zoomTo(1, 900, "Sine.easeInOut");
    this.cameras.main.pan(480, 270, 900, "Sine.easeInOut");
    // the scream. It goes on.
    synth.stopMusic();
    synth.music("c7_transform", true);
    const xf = this.textures.exists("c7_drongus_xf") && this.textures.get("c7_drongus_xf").frameTotal > 8;
    if (xf) d.setTexture("c7_drongus_xf", 4).setScale(2.3);
    const aura = this.add.graphics().setDepth(49).setBlendMode(Phaser.BlendModes.ADD);
    const headGlow = this.add.circle(d.x, headY() + 20, 30, GOLD, 0).setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    const screams = ["AAAAAAAAA", "AAAAAAAAAAAARGH", "HHHNNNNNNGGGGGG", "AAAAAAAAAAAAAAAAAAH", "RRRRAAAAAAAAAAAAA", "AAAAAAAAAAAAAAAAAAAAAAAAAAA"];
    let power = 0;
    const scream = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        power = Math.min(1, power + 0.0016);
        const t = this.time.now;
        // shake
        d.x = 480 + (Math.random() - 0.5) * (4 + power * 16);
        if (xf) d.setFrame(3 + (Math.floor(t / 90) % 3));
        // spiky super-saiyan aura
        aura.clear();
        const n = 22;
        const cx = 480;
        const cy = FLOOR - d.displayHeight * 0.45;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + ((i - n / 2) / n) * Math.PI * 1.7;
          const r0 = 60 + power * 20;
          const r1 = r0 + (40 + Math.random() * 80) * (0.3 + power);
          aura.fillStyle(i % 2 ? GOLD : 0xfff3b0, 0.35 + power * 0.4);
          aura.fillTriangle(cx + Math.cos(a - 0.12) * r0, cy + Math.sin(a - 0.12) * r0 * 1.4, cx + Math.cos(a + 0.12) * r0, cy + Math.sin(a + 0.12) * r0 * 1.4, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 1.5);
        }
        headGlow.setPosition(d.x, headY() + 24).setFillStyle(GOLD, 0.2 + power * 0.6).setScale(1 + power * 1.2);
        // lightning crackles round him
        if (Math.random() < 0.08 + power * 0.25) this.crackle(cx, cy, 60 + power * 100);
        if (Math.random() < 0.05 + power * 0.1) this.cameras.main.shake(120, 0.004 + power * 0.012);
      },
    });
    for (let i = 0; i < screams.length; i++) {
      this.caption(screams[i], "#ffd23f", 30 + i * 6, 1.1);
      synth.voice(i % 2 ? "grunt" : "oh", 0.6 + i * 0.06, 0.6 - i * 0.03);
      synth.play("roar");
      if (i === 2) this.groundCracks();
      if (i === 3) this.lightning(0.8);
      await this.wait(1200);
    }
    // the change
    this.cameras.main.flash(500, 255, 240, 180);
    synth.play("boom");
    if (xf) {
      for (const f of [6, 7, 8]) {
        d.setFrame(f);
        await this.wait(160);
      }
    }
    scream.remove();
    aura.clear();
    const ddArt = this.textures.exists("boss_dark_drongus") && this.textures.get("boss_dark_drongus").frameTotal > 2;
    d.setTexture(ddArt ? "boss_dark_drongus" : "boss_drongus", 0).setScale(ddArt ? 2.9 : 3.2).setX(480);
    if (!ddArt) d.setTint(0xffe28a);
    const idle = this.time.addEvent({ delay: 110, loop: true, callback: () => ddArt && d.setFrame(Math.floor(this.time.now / 110) % 8) });
    headGlow.setScale(2.2).setPosition(480, d.y - d.displayHeight * 0.8);
    this.tweens.add({ targets: headGlow, alpha: 0.4, yoyo: true, repeat: -1, duration: 300 });
    this.cameras.main.shake(900, 0.02);
    await this.wait(900);
    // the eyes: anime close-up
    await this.closeUp("HIS EYES…", 1900);
    await this.talk(FR.XF_AFTER);
    this.caption("DARK DRONGUS", "#ffd23f", 56, 2.2);
    synth.play("roar");
    await this.wait(2000);
    idle.remove();
  }

  private crackle(cx: number, cy: number, r: number) {
    const g = this.add.graphics().setDepth(56).setBlendMode(Phaser.BlendModes.ADD);
    const a = Math.random() * Math.PI * 2;
    let x = cx + Math.cos(a) * 30;
    let y = cy + Math.sin(a) * 40;
    g.lineStyle(2, Math.random() < 0.5 ? 0xffffff : 0x93c5fd, 1).beginPath().moveTo(x, y);
    for (let i = 0; i < 5; i++) {
      x += Math.cos(a) * (r / 5) + (Math.random() - 0.5) * 20;
      y += Math.sin(a) * (r / 5) + (Math.random() - 0.5) * 20;
      g.lineTo(x, y);
    }
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() });
    if (Math.random() < 0.3) synth.play("zap");
  }

  private groundCracks() {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(3, 0x0a0610, 1);
    for (let i = 0; i < 7; i++) {
      let x = 480;
      let y = FLOOR + 8;
      const dir = i % 2 ? 1 : -1;
      g.beginPath().moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += dir * (20 + Math.random() * 40);
        y += (Math.random() - 0.3) * 10;
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    g.lineStyle(1, GOLD, 0.6);
    this.cameras.main.shake(500, 0.02);
    synth.play("smash");
  }

  /** A full-screen anime close-up of his face (hollow eyes), with speed lines. */
  private async closeUp(text: string, ms: number) {
    const c = this.add.container(0, 0).setDepth(700).setScrollFactor(0);
    const bg = this.add.rectangle(480, 270, W, H, 0x000000, 1);
    c.add(bg);
    const lines = this.add.graphics();
    c.add(lines);
    const face = this.faceImage(480, 270, 4.25);
    c.add(face);
    const ev = this.time.addEvent({ delay: 40, loop: true, callback: () => this.speedLines(lines, 480, 270, 0xffd23f) });
    face.setScale(face.scale * 1.15);
    this.tweens.add({ targets: face, scale: face.scale / 1.15, duration: ms, ease: "Sine.out" });
    synth.play("telegraph");
    const t = title(this, 480, 470, text, 34, "#ffffff");
    c.add(t);
    await this.wait(ms);
    ev.remove();
    c.destroy();
  }

  private faceImage(x: number, y: number, k: number) {
    if (this.textures.exists("fr_dd_face")) return this.add.image(x, y, "fr_dd_face").setScale(k);
    const g = this.add.container(x, y);
    g.add(this.add.circle(0, 0, 150, GOLD));
    g.add(this.add.ellipse(-55, -30, 60, 40, 0x000000));
    g.add(this.add.ellipse(55, -30, 60, 40, 0x000000));
    g.add(this.add.ellipse(0, 70, 90, 70, 0x1a0505));
    g.add(this.add.ellipse(0, 115, 200, 60, 0xc2410c));
    (g as unknown as { scale: number }).scale = 1;
    return g as unknown as Phaser.GameObjects.Image;
  }

  private speedLines(g: Phaser.GameObjects.Graphics, cx: number, cy: number, col: number, n = 40) {
    g.clear();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r0 = 200 + Math.random() * 120;
      g.lineStyle(1 + Math.random() * 3, Math.random() < 0.5 ? col : 0xffffff, 0.7);
      g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * 700, cy + Math.sin(a) * 700);
    }
  }

  // ================================================================= THE GROUP KREZZ

  private async krezz() {
    synth.music("c7_stairs", true);
    // you and the lads, in a line, left; him, right
    const line: string[] = [G.s.player, ...this.others()];
    // facing us, each with his hand down there (his wonk loop), all behind one long bar
    const lads = line.map((id, i) => this.lad(id, 52 + i * 66, FLOOR + 12, 4.6, "south").setDepth(40 + i));
    const pumping = this.time.addEvent({ delay: 16, loop: true, paused: true, callback: () => lads.forEach((l, i) => l.active && playPerf(l, "wonk", this.time.now, 10 + (i % 3), i * 3)) });
    const ddArt = this.textures.exists("boss_dark_drongus") && this.textures.get("boss_dark_drongus").frameTotal > 2;
    const d = this.add.sprite(770, FLOOR + 14, ddArt ? "boss_dark_drongus" : "boss_drongus", 0).setOrigin(0.5, 1).setScale(ddArt ? 2.6 : 3).setDepth(50);
    if (!ddArt) d.setTint(0xffe28a);
    const idle = this.time.addEvent({ delay: 110, loop: true, callback: () => ddArt && d.active && d.setFrame(Math.floor(this.time.now / 110) % 8) });
    // one big censor bar
    // over every crotch (and every hand): one long bar, stepped to each lad's height so the shorter lads'
    // forearms still show going down under it. `bar` is just its overall box (the beam aims from it).
    const crs = lads.map((l) => censorRect(l));
    const barTop = Math.min(...crs.map((r) => r.top));
    const barBot = Math.max(...crs.map((r) => r.bottom));
    const barY = (barTop + barBot) / 2;
    const barL = Math.min(...crs.map((r) => r.left)) - 16;
    const barR = Math.max(...crs.map((r) => r.right)) + 16;
    const bar = this.add.rectangle((barL + barR) / 2, barY, barR - barL, Math.max(14, barBot - barTop), 0x000000, 0).setDepth(60);
    const barG = this.add.graphics().setDepth(60).setPosition(bar.x, 0);
    crs.forEach((r, i) => {
      const l = i ? (crs[i - 1].x + r.x) / 2 : barL;
      const rr = i < crs.length - 1 ? (r.x + crs[i + 1].x) / 2 : barR;
      barG.fillStyle(0x000000, 1).fillRect(l - bar.x - 1, r.top, rr - l + 2, r.bottom - r.top);
    });
    // the text runs along the lowest strip, where every step overlaps
    const textY = (Math.max(...crs.map((r) => r.top)) + Math.min(...crs.map((r) => r.bottom))) / 2;
    const barT = this.add.text(bar.x, textY, "CENSORED  CENSORED  CENSORED  CENSORED", { fontFamily: "Impact, sans-serif", fontSize: "13px", color: "#ffffff" }).setOrigin(0.5).setDepth(61);
    barG.setScale(0, 1);
    // the hands go down once the bar is across
    this.tweens.add({ targets: barG, scaleX: 1, duration: 500, ease: "Quad.out", onComplete: () => (pumping.paused = false) });
    const moan = this.time.addEvent({ delay: 260, loop: true, callback: () => synth.voice(Math.random() < 0.5 ? "oh" : "mmm", 0.35, 0.7 + Math.random() * 0.6) });
    await this.talk(FR.KZ_STAND);
    // he throws them
    await this.talk(FR.KZ_THROW.slice(0, 1));
    const bottle = this.add.image(d.x - 40, FLOOR - 160, this.textures.exists("fr_bottle") ? "fr_bottle" : "c7_bottle_1").setScale(1.4).setDepth(70);
    const logs = this.add.image(d.x + 40, FLOOR - 160, this.textures.exists("fr_logs") ? "fr_logs" : "fr_bottle").setScale(1.4).setDepth(70);
    const lg = this.add.circle(logs.x, logs.y, 26, 0x22d3ee, 0.3).setDepth(69).setBlendMode(Phaser.BlendModes.ADD);
    synth.play("swing");
    this.tweens.add({ targets: [bottle], x: 1100, y: -60, angle: 720, duration: 1000, ease: "Quad.in" });
    this.tweens.add({ targets: [logs, lg], x: 1080, y: -140, angle: 540, duration: 1100, ease: "Quad.in" });
    await this.wait(1100);
    await this.talk(FR.KZ_THROW.slice(1));
    await this.landingShot();
    await this.talk(FR.KZ_LANDED);
    // GROUP… KREZZ
    moan.remove();
    synth.music("c7_spirit", true);
    this.caption(FR.KZ_FINISH[0], "#ffffff", 46, 1.4);
    for (let i = 0; i < 8; i++) synth.voice(i % 2 ? "oh" : "grunt", 0.5 + i * 0.05, 0.6 + i * 0.1, i * 0.12);
    const charge = this.add.ellipse(bar.x, barY, bar.width, 40, 0xffffff, 0.2).setDepth(62).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: charge, scaleY: 3, alpha: 0.9, duration: 1400, ease: "Quad.in" });
    this.cameras.main.shake(1400, 0.008);
    await this.wait(1400);
    this.caption(FR.KZ_FINISH[1], "#ffffff", 64, 1.6);
    synth.laser(5);
    synth.play("boom");
    this.impactFrames(3);
    const beam = this.add.graphics().setDepth(65).setBlendMode(Phaser.BlendModes.ADD);
    const mouth = { x: d.x + 4, y: d.y - d.displayHeight * 0.72 };
    const beamEv = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        beam.clear();
        const w0 = 30 + Math.random() * 10;
        beam.fillStyle(0xffffff, 0.25).fillTriangle(bar.x - bar.width / 2, barY - w0 * 1.6, bar.x - bar.width / 2, barY + w0 * 1.6, mouth.x, mouth.y);
        beam.fillStyle(0xffffff, 0.9).fillTriangle(bar.x - bar.width / 2 + 40, barY - w0 * 0.6, bar.x - bar.width / 2 + 40, barY + w0 * 0.6, mouth.x, mouth.y);
      },
    });
    this.cameras.main.shake(900, 0.02);
    await this.wait(1000);
    beamEv.remove();
    beam.destroy();
    charge.destroy();
    // the close-up: down his throat, faster and faster, out of his eyes and ears, and then
    await this.headExplodes();
    // the wide shot: headless, he sits down
    idle.remove();
    bar.destroy();
    barG.destroy();
    barT.destroy();
    pumping.remove();
    for (const l of lads) {
      l.setData("facing", "east");
      animateWalker(l, 0, 0, false, 0);
    }
    if (ddArt) {
      d.setFrame(0);
      const fh = d.frame.height;
      d.setCrop(0, fh * 0.32, d.frame.width, fh * 0.68);
    } else d.setCrop(0, 40, 96, 104);
    const neckY = d.y - d.displayHeight * 0.68;
    const mist = this.add.circle(d.x, neckY, 50, GOLD, 0.5).setDepth(52).setBlendMode(Phaser.BlendModes.ADD);
    // the stump (gore off: just glowing)
    const gore = G.meta.settings.gore !== false;
    this.add.ellipse(d.x, neckY + 6, 46, 16, gore ? 0x9a0f1a : GOLD).setDepth(53);
    this.time.addEvent({
      delay: 60,
      repeat: 40,
      callback: () => {
        const dr = this.add.circle(d.x + (Math.random() - 0.5) * 20, neckY, 3 + Math.random() * 4, gore ? 0xb3121f : 0xfff3b0).setDepth(54);
        this.tweens.add({ targets: dr, x: dr.x + (Math.random() - 0.5) * 120, y: dr.y - 60 - Math.random() * 60, duration: 300, ease: "Quad.out", yoyo: false, onComplete: () => this.tweens.add({ targets: dr, y: FLOOR, alpha: 0.6, duration: 500, ease: "Quad.in", onComplete: () => dr.destroy() }) });
      },
    });
    this.tweens.add({ targets: mist, scale: 3, alpha: 0, duration: 2600 });
    this.gibsRain(d.x, d.y - d.displayHeight * 0.75);
    for (const l of lads) l.setData("facing", "east");
    await this.wait(1200);
    this.tweens.add({ targets: d, y: d.y + 30, angle: -6, duration: 900, ease: "Bounce.out" });
    synth.play("thud");
    await this.talk(FR.KZ_AFTER);
    // the collapse
    await this.collapse(lads, d);
    await this.surf();
  }

  /** "Meanwhile, far below": the bottle and the logs come down in ruined Krelford. Their spots are saved for part two. */
  private async landingShot() {
    const s = G.s;
    s.flags.finale_logs_at = `${FINALE_LOGS_AT.x},${FINALE_LOGS_AT.y}`;
    s.flags.finale_bottle_at = `${FINALE_BOTTLE_AT.x},${FINALE_BOTTLE_AT.y}`;
    G.save();
    const k = 0.3;
    const ox = (W - 2560 * k) / 2;
    const oy = (H - 1792 * k) / 2;
    const c = this.add.container(0, 0).setDepth(600).setScrollFactor(0).setAlpha(0);
    const map = (x: number, y: number) => ({ x: ox + x * k, y: oy + y * k });
    c.add(this.add.rectangle(480, 270, W, H, 0x07040c));
    if (this.textures.exists("tile_grass")) c.add(this.add.tileSprite(ox, oy, 2560 * k, 1792 * k, "tile_grass").setOrigin(0).setTileScale(k).setTint(0x3b2f27));
    else c.add(this.add.rectangle(ox, oy, 2560 * k, 1792 * k, 0x2a211c).setOrigin(0));
    for (const [x, y, w, h] of [
      [80, 780, 2480, 90],
      [1235, 200, 90, 1500],
      [300, 1500, 2000, 70],
      [500, 560, 1700, 60],
      [200, 1000, 70, 700],
    ]) {
      const p = map(x, y);
      c.add(this.add.rectangle(p.x, p.y, w * k, h * k, 0x4a3e3a).setOrigin(0));
    }
    // what's left of the buildings
    const blds: [string, number, number, number][] = [
      ["TOWN_HALL", 1280, 420, 420], ["ARCHIVE", 1900, 420, 300], ["BAN_TRIBUNAL", 660, 420, 280], ["PUB", 560, 820, 300], ["HOME", 520, 1250, 260],
      ["WILDERN", 1280, 1300, 420], ["MINISTRY", 2000, 1270, 340], ["UNIVERSITY", 840, 1260, 260], ["GYM", 2350, 600, 240], ["POLICE", 1700, 1670, 240], ["CROBLEY_FACTORY", 1660, 1255, 288],
    ];
    for (const [id, x, y, w] of blds) {
      const p = map(x, y);
      const key = this.textures.exists(`bld_${id}_RUIN`) ? `bld_${id}_RUIN` : this.textures.exists(`bld_${id}`) ? `bld_${id}` : null;
      if (key) {
        const img = this.add.image(p.x, p.y, key).setTint(0x6b5a55);
        img.setScale((w * k) / img.width);
        c.add(img);
      } else c.add(this.add.rectangle(p.x, p.y, w * k, w * k * 0.5, 0x2a2420));
      if (Math.random() < 0.7) {
        const f = this.add.circle(p.x + (Math.random() - 0.5) * 30, p.y, 5, 0xff7a1a, 0.7).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: f, scale: 1.6, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 + Math.random() * 300 });
        c.add(f);
      }
    }
    const cit = map(1280, 110);
    c.add(this.add.rectangle(cit.x, cit.y, 380 * k, 170 * k, 0x1b1424).setStrokeStyle(2, 0xff2d55));
    c.add(this.add.text(cit.x, cit.y, "DA DRONGUS DUNGEON", { fontFamily: FONT, fontSize: "10px", color: "#ff9ab0" }).setOrigin(0.5));
    c.add(title(this, 480, 30, "MEANWHILE, FAR BELOW…", 24, "#ffffff"));
    this.tweens.add({ targets: c, alpha: 1, duration: 400 });
    await this.wait(600);
    const drop = (at: { x: number; y: number }, key: string, label: string, col: number, delay: number) =>
      new Promise<void>((res) => {
        const p = map(at.x, at.y);
        const sh = this.add.ellipse(p.x, p.y + 6, 4, 2, 0x000000, 0.5);
        const o = this.add.image(p.x, p.y - 400, this.textures.exists(key) ? key : "fr_bottle").setScale(3);
        const glow = this.add.circle(p.x, p.y - 400, 20, col, 0.4).setBlendMode(Phaser.BlendModes.ADD);
        c.add([sh, glow, o]);
        this.time.delayedCall(delay, () => {
          synth.play("whistle");
          this.tweens.add({ targets: [o, glow], y: p.y, duration: 1100, ease: "Quad.in" });
          this.tweens.add({ targets: o, scale: 0.9, angle: 720, duration: 1100, ease: "Quad.in" });
          this.tweens.add({
            targets: sh,
            width: 26,
            height: 10,
            duration: 1100,
            ease: "Quad.in",
            onComplete: () => {
              synth.play("smash");
              this.cameras.main.shake(150, 0.006);
              const ring = this.add.circle(p.x, p.y, 6, col, 0).setStrokeStyle(3, col, 1);
              c.add(ring);
              this.tweens.add({ targets: ring, radius: 40, alpha: 0, duration: 700, repeat: 2 });
              const t = this.add.text(p.x, p.y + 22, label, { fontFamily: "Impact, sans-serif", fontSize: "15px", color: "#ffffff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5);
              c.add(t);
              res();
            },
          });
        });
      });
    await Promise.all([drop(FINALE_LOGS_AT, "fr_logs", "THE CHAT LOGS", 0x22d3ee, 0), drop(FINALE_BOTTLE_AT, "fr_bottle", "THE GOLDEN PUSSY JUICE TESTOSTERONE", GOLD, 450)]);
    await this.wait(1800);
    this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => c.destroy() });
    await this.wait(420);
  }

  /** Black-white-black impact frames. */
  private impactFrames(n: number) {
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 120, () => this.flashRect.setFillStyle(i % 2 ? 0x000000 : 0xffffff, 1));
      this.time.delayedCall(i * 120 + 60, () => this.flashRect.setFillStyle(0xffffff, 0));
    }
  }

  /** The close-up: the beam goes in his mouth, faster and faster, out of his eyes and ears… and his head goes. */
  private async headExplodes() {
    const c = this.add.container(0, 0).setDepth(700).setScrollFactor(0);
    c.add(this.add.rectangle(480, 270, W, H, 0x1a0a00, 1));
    const lines = this.add.graphics();
    c.add(lines);
    const face = this.faceImage(560, 270, 3.4);
    c.add(face);
    const fx = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    c.add(fx);
    const f0 = face.scale;
    // where things are on the face art (128px, scaled): mouth, eyes, ears
    const k = f0;
    const at = (u: number, v: number) => ({ x: 560 + (u - 64) * k, y: 270 + (v - 64) * k });
    const MOUTH = at(64, 94);
    const EYES = [at(46, 54), at(82, 54)];
    const EARS = [at(20, 68), at(108, 68)];
    let speed = 0.2;
    let spill = 0;
    const parts: { x: number; y: number; t: number }[] = [];
    const ev = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.speedLines(lines, MOUTH.x, MOUTH.y, 0xffffff, 30 + Math.round(speed * 30));
        speed = Math.min(3, speed + 0.006);
        fx.clear();
        // the beam, in from the left, into his mouth
        const w0 = 22 + Math.sin(this.time.now / 30) * 4 + speed * 6;
        fx.fillStyle(0xffffff, 0.35).fillTriangle(-40, MOUTH.y - w0 * 3, -40, MOUTH.y + w0 * 3, MOUTH.x, MOUTH.y);
        fx.fillStyle(0xffffff, 1).fillTriangle(-40, MOUTH.y - w0, -40, MOUTH.y + w0, MOUTH.x, MOUTH.y);
        if (Math.random() < 0.6 + speed * 0.2) parts.push({ x: -20, y: MOUTH.y + (Math.random() - 0.5) * w0 * 2, t: 0 });
        for (const p of parts) {
          p.t += 0.02 + speed * 0.03;
          p.x = -20 + (MOUTH.x + 20) * p.t;
          fx.fillStyle(0xffffff, 1).fillRect(p.x, p.y + (MOUTH.y - p.y) * p.t, 18 + speed * 10, 3);
        }
        while (parts.length && parts[0].t >= 1) parts.shift();
        // it's coming out of his eyes and ears
        if (spill > 0) {
          for (const e of [...EYES, ...EARS]) {
            const i = EYES.includes(e) ? 1 : 0.7;
            const dx = e.x < 560 ? -1 : 1;
            const len = 80 + spill * 400;
            fx.fillStyle(0xffffff, 0.4 * i).fillTriangle(e.x, e.y - 4, e.x, e.y + 4, e.x + dx * len, e.y - 30 - spill * 60 + (EYES.includes(e) ? -40 : 30));
            fx.fillStyle(0xffffff, 0.9).fillCircle(e.x, e.y, 6 + spill * 10);
          }
        }
        face.setPosition(560 + (Math.random() - 0.5) * speed * 6, 270 + (Math.random() - 0.5) * speed * 6);
      },
    });
    synth.laser(6);
    this.caption("", "#ffffff", 10, 0.1);
    await this.wait(1400);
    this.impactFrames(2);
    this.tweens.add({ targets: face, scale: f0 * 1.08, duration: 1000 });
    await this.wait(1000);
    // out of his eyes
    spill = 0.2;
    this.tweens.add({ targets: { v: 0 }, v: 1, duration: 1800, onUpdate: (tw) => (spill = 0.2 + 0.8 * (tw.getValue() ?? 0)) });
    synth.play("alarm");
    this.tweens.add({ targets: face, scale: f0 * 1.35, duration: 1800, ease: "Quad.in" });
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 300, () => this.impactFrames(1));
    this.cameras.main.shake(1800, 0.01);
    await this.wait(1800);
    // POP
    ev.remove();
    fx.clear();
    face.setVisible(false);
    this.flashRect.setFillStyle(0xffffff, 1);
    this.tweens.add({ targets: this.flashRect, fillAlpha: 0, duration: 900 });
    synth.play("boom");
    synth.play("explode");
    this.cameras.main.shake(900, 0.04);
    this.headGibs(c, 560, 250);
    await this.wait(2200);
    this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => c.destroy() });
    await this.wait(420);
  }

  /** Skull, brain and eyeballs everywhere (gore off: a pop of light and confetti). */
  private headGibs(c: Phaser.GameObjects.Container, x: number, y: number) {
    const gore = G.meta.settings.gore !== false;
    if (!gore) {
      for (let i = 0; i < 70; i++) {
        const p = this.add.rectangle(x, y, 6, 10, [0xffd23f, 0xff4fa3, 0x22d3ee, 0xffffff, 0x86efac][i % 5]);
        c.add(p);
        const a = Math.random() * Math.PI * 2;
        const v = 200 + Math.random() * 500;
        this.tweens.add({ targets: p, x: x + Math.cos(a) * v, y: y + Math.sin(a) * v + 200, angle: 720, duration: 1400 + Math.random() * 600, ease: "Quad.out" });
      }
      const pop = title(this, x, y, "POP!", 90, "#ffffff");
      c.add(pop);
      synth.play("pop");
      return;
    }
    synth.play("splat_1");
    synth.play("squelch");
    const keys = ["fr_skull", "fr_skull", "fr_brain", "fr_brain", "fr_eye", "fr_eye"].filter((k) => this.textures.exists(k));
    for (let i = 0; i < 46; i++) {
      const key = keys.length && i < 18 ? keys[i % keys.length] : null;
      const o = key ? this.add.image(x, y, key).setScale(1 + Math.random() * 1.4) : this.add.circle(x, y, 6 + Math.random() * 14, [0xb3121f, 0x7a0a12, 0xe2667a, 0xf5e6d0][i % 4]);
      c.add(o);
      const a = Math.random() * Math.PI * 2;
      const v = 300 + Math.random() * 600;
      this.tweens.add({ targets: o, x: x + Math.cos(a) * v, y: y + Math.sin(a) * v * 0.7 + 300, angle: (Math.random() - 0.5) * 1080, duration: 1300 + Math.random() * 700, ease: "Quad.out" });
    }
    // and some of it hits the camera
    for (let i = 0; i < 7; i++) {
      const s = this.add.circle(80 + Math.random() * 800, 60 + Math.random() * 420, 30 + Math.random() * 40, 0x9a0f1a, 0.85);
      c.add(s);
      s.setScale(0.1);
      this.tweens.add({ targets: s, scale: 1, duration: 100, delay: 120 + i * 60 });
      this.tweens.add({ targets: s, y: s.y + 60, alpha: 0, delay: 1200, duration: 1200 });
    }
    if (hasVfx(this, "vfx_gore")) {
      const g = vfx(this, "vfx_gore", x, y, { scale: 5, depth: 701 });
      if (g) g.setScrollFactor(0);
    }
  }

  /** Bits still coming down on the roof, in the wide shot. */
  private gibsRain(x: number, y: number) {
    const gore = G.meta.settings.gore !== false;
    const keys = (gore ? ["fr_skull", "fr_brain", "fr_eye"] : []).filter((k) => this.textures.exists(k));
    for (let i = 0; i < 18; i++) {
      const key = keys.length && i % 2 ? keys[i % keys.length] : null;
      const o = key ? this.add.image(x + (Math.random() - 0.5) * 400, -40 - Math.random() * 200, key).setScale(0.5 + Math.random() * 0.5) : this.add.circle(x + (Math.random() - 0.5) * 400, -40 - Math.random() * 200, 4, gore ? 0x9a0f1a : [0xffd23f, 0xff4fa3, 0x22d3ee][i % 3]);
      o.setDepth(80);
      this.tweens.add({ targets: o, y: FLOOR + Math.random() * 20, angle: 400, duration: 900 + Math.random() * 900, delay: i * 70, ease: "Quad.in", onComplete: () => i % 4 === 0 && synth.play("splat") });
    }
  }

  // ================================================================= THE COLLAPSE AND THE SURF

  private async collapse(lads: Phaser.GameObjects.Sprite[], d: Phaser.GameObjects.Sprite) {
    // cracks, the floor goes
    synth.play("alarm");
    this.cameras.main.shake(2000, 0.015);
    this.groundCracks();
    for (const l of lads) this.tweens.add({ targets: l, y: l.y - 10, yoyo: true, repeat: 6, duration: 120 + Math.random() * 80 });
    await this.talk(FR.COLLAPSE);
    this.tweens.add({ targets: [d, ...lads], y: "+=600", duration: 1400, ease: "Quad.in", delay: 300 });
    // the outside shot: the whole tower comes down
    const c = this.add.container(0, 0).setDepth(650).setScrollFactor(0).setAlpha(0);
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1a0f2e, 0x1a0f2e, 0x3a1020, 0x3a1020, 1).fillRect(0, 0, W, H);
    c.add(sky);
    const ground = this.add.rectangle(480, 500, W, 80, 0x1a1414);
    const towerKey = this.textures.exists("bld_CITADEL") ? "bld_CITADEL" : null;
    const tower = towerKey ? this.add.image(480, 470, towerKey).setOrigin(0.5, 1) : this.add.rectangle(480, 470, 200, 420, 0x1c1424).setOrigin(0.5, 1);
    if (towerKey) (tower as Phaser.GameObjects.Image).setScale(430 / (tower as Phaser.GameObjects.Image).height);
    c.add([tower, ground]);
    this.tweens.add({ targets: c, alpha: 1, duration: 300 });
    await this.wait(500);
    synth.play("boom");
    this.cameras.main.shake(3000, 0.025);
    this.tweens.add({ targets: tower, y: 470 + 460, angle: 4, duration: 3000, ease: "Quad.in" });
    // insanely large wreckage
    const slabs = ["fr_debris_0", "fr_debris_1", "fr_slab", "fr_rack"].filter((k) => this.textures.exists(k));
    const ev = this.time.addEvent({
      delay: 60,
      repeat: 45,
      callback: () => {
        const key = slabs[Math.floor(Math.random() * slabs.length)];
        const o = key ? this.add.image(420 + Math.random() * 120, 60 + Math.random() * 120, key).setScale(0.3 + Math.random() * 0.7) : this.add.rectangle(480, 200, 40, 30, 0x2a2233);
        c.add(o);
        const vx = (Math.random() - 0.5) * 900;
        this.tweens.add({ targets: o, x: o.x + vx, y: o.y + 500 + Math.random() * 200, angle: (Math.random() - 0.5) * 720, duration: 1600 + Math.random() * 800, ease: "Quad.in" });
        if (Math.random() < 0.3) synth.play("smash");
      },
    });
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(800 + i * 300, () => {
        const dust = this.add.circle(380 + Math.random() * 200, 470, 60, 0x8a7f74, 0.6);
        c.add(dust);
        this.tweens.add({ targets: dust, scale: 4, alpha: 0, y: 380, duration: 2000 });
      });
    }
    await this.wait(3200);
    ev.remove();
    this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
    await this.wait(300);
  }

  /** Down they go, surfing the wreckage. Side on, the sky streaming upwards. */
  private async surf() {
    this.rainOn = true;
    const c = this.add.container(0, 0).setDepth(660).setScrollFactor(0);
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1a0f2e, 0x1a0f2e, 0x5a1a20, 0x5a1a20, 1).fillRect(0, 0, W, H);
    c.add(sky);
    // the tower wall rushing past in the background
    const streaks = this.add.graphics();
    c.add(streaks);
    const fall: { x: number; y: number; l: number; v: number }[] = [];
    for (let i = 0; i < 50; i++) fall.push({ x: Math.random() * W, y: Math.random() * H, l: 30 + Math.random() * 120, v: 900 + Math.random() * 900 });
    const bits: { o: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle; v: number; s: number }[] = [];
    const slabs = ["fr_debris_0", "fr_debris_1", "fr_slab"].filter((k) => this.textures.exists(k));
    for (let i = 0; i < 14; i++) {
      const key = slabs[i % Math.max(1, slabs.length)];
      const o = key && slabs.length ? this.add.image(Math.random() * W, Math.random() * H, key).setScale(0.4 + Math.random() * 0.5).setAlpha(0.6) : this.add.rectangle(Math.random() * W, Math.random() * H, 30, 20, 0x2a2233);
      c.add(o);
      bits.push({ o, v: 500 + Math.random() * 700, s: (Math.random() - 0.5) * 6 });
    }
    // the surfers: each lad on a huge slab, in a diagonal wave
    const ids: string[] = [G.s.player, ...this.others()];
    const surfers = ids.map((id, i) => {
      const x = 90 + i * 95;
      const y = 96 + (i % 3) * 72 + i * 8;
      const slabKey = slabs.length ? slabs[i % slabs.length] : null;
      const slab = slabKey ? this.add.image(x, y + 40, slabKey).setScale(1.9, 0.75).setAngle(-12) : this.add.rectangle(x, y + 36, 110, 30, 0x2a2233).setAngle(-12);
      const l = this.lad(id, x, y + 26, 3.8, "east");
      c.add([slab, l]);
      return { slab, l, x, y, ph: Math.random() * 6 };
    });
    const ev = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const t = this.time.now;
        streaks.clear();
        streaks.lineStyle(2, 0xffffff, 0.25);
        for (const f of fall) {
          f.y -= f.v * 0.016;
          if (f.y < -f.l) {
            f.y = H + Math.random() * 100;
            f.x = Math.random() * W;
          }
          streaks.lineBetween(f.x, f.y, f.x, f.y + f.l);
        }
        for (const b of bits) {
          b.o.y -= b.v * 0.016;
          b.o.angle += b.s;
          if (b.o.y < -80) {
            b.o.y = H + 80;
            b.o.x = Math.random() * W;
          }
        }
        for (const s of surfers) {
          const bob = Math.sin(t / 260 + s.ph) * 10;
          const sway = Math.sin(t / 700 + s.ph) * 14;
          s.slab.setPosition(s.x + sway, s.y + 40 + bob).setAngle(-12 + Math.sin(t / 300 + s.ph) * 6);
          s.l.setPosition(s.x + sway, s.y + 26 + bob).setAngle(-8 + Math.sin(t / 300 + s.ph) * 8);
        }
      },
    });
    this.caption("SURF'S UP", "#ffffff", 50, 1.6);
    synth.play("cheer");
    await this.talk(FR.SURF);
    await this.wait(800);
    // the ground
    this.caption("", "#fff", 10, 0.1);
    this.flashRect.setFillStyle(0xffffff, 1);
    synth.play("boom");
    this.cameras.main.shake(800, 0.03);
    ev.remove();
    this.rainOn = false;
    await this.wait(200);
    this.cameras.main.fadeOut(1400, 255, 255, 255);
    await this.wait(1500);
  }

  // ---------------------------------------------------------------- helpers

  private lastCaption?: Phaser.GameObjects.Text;

  private caption(t: string, color = "#ffffff", size = 34, hold = 1.8) {
    this.lastCaption?.destroy();
    if (!t) return;
    const c = title(this, 480, 70, t, size, color).setDepth(950).setScrollFactor(0).setStroke("#000000", 6);
    c.setScale(0.2);
    this.tweens.add({ targets: c, scale: 1, duration: 260, ease: "Back.out" });
    this.tweens.add({ targets: c, alpha: 0, delay: hold * 1000, duration: 400 });
    this.lastCaption = c;
  }

  private wait(ms: number) {
    if (this.dead || this.ended) return never();
    return new Promise<void>((res) => this.time.delayedCall(ms, () => res()));
  }

  private async talk(lines: Line[]) {
    if (this.dead || this.ended) return never();
    await this.box.play(lines);
    if (this.dead || this.ended) return never();
  }

  private finish(skipped: boolean) {
    if (this.ended || this.dead) return;
    this.ended = true;
    synth.weatherSound(null);
    const s = G.s;
    if (this.beat === "transform") {
      s.flags.finale_xf_seen = true;
      G.save();
      const go = () => switchTo(this, "Dungeon", { dungeon: this.back.dungeon, room: this.back.room });
      fadeThen(this, skipped ? 300 : 400, go);
      return;
    }
    // part one done: he's dead, the dungeon's gone. Part two takes it from the wreckage in Krelford.
    s.flags.finale_logs_at ??= `${FINALE_LOGS_AT.x},${FINALE_LOGS_AT.y}`;
    s.flags.finale_bottle_at ??= `${FINALE_BOTTLE_AT.x},${FINALE_BOTTLE_AT.y}`;
    s.flags.drongus_dead = true;
    s.flags.citadel_fallen = true;
    for (let i = 0; i < 12; i++) delete s.flags[`dclr_citadel_${i}`];
    delete s.flags.finale_freed;
    s.phase = "hub";
    G.save();
    const go = () => switchTo(this, "Hub", { at: "CITADEL", from: "citadel_fallen" });
    if (skipped) fadeThen(this, 300, go);
    else go();
  }
}
