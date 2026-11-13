import Phaser from "phaser";
import type { Line } from "../../data/types";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo, fadeThen } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, title } from "../ui/theme";
import { animateWalker, backdrop, charMeta, type CharMeta } from "../gfx/HD";
import { hasVfx, vfx } from "../gfx/Vfx";
import * as C7 from "../../content/ch7";

/**
 * Chapter 7 opens: the top of Da Drongus Dungeon. Drongus, his Council of Machines (three AI rigs and Suno),
 * the DRONGUS GUN, an unlucky servant, and a calendar that has said 9 JANUARY the whole time.
 * Started with switchTo(scene, "Lair", {}); ends in town at the Town Hall.
 */

/** Art this scene needs, until it's merged into public/art/manifest.json (see ch7_manifest.json). */
const LAIR_ART: Record<string, string> = {
  bg_lair: "backdrops/bg_lair.png",
  c7_ai_rig: "props/c7_ai_rig.png",
  c7_ai_rig_wreck: "props/c7_ai_rig_wreck.png",
  c7_drongus_gun: "props/c7_drongus_gun.png",
  c7_calendar: "props/c7_calendar.png",
};
const SERVANT_META: CharMeta & { crouch: Record<string, number[]> } = {
  frame: 92,
  idle: { south: 0, east: 1, north: 2, west: 3 },
  walk: { west: [4, 5, 6, 7, 8, 9, 10, 11] },
  crouch: { west: [12, 13, 14, 15, 16] },
};

const FLOOR = 348;
const W = 960;

type AiId = "CLAUDE" | "GROK" | "CHATGPT" | "SUNO";
interface RigStyle {
  x: number;
  scale: number;
  bg: number;
  fg: string;
  accent: number;
  glyph: string;
  label: string;
}
const RIGS: Record<AiId, RigStyle> = {
  SUNO: { x: 112, scale: 1.25, bg: 0x2a0f2f, fg: "#ff9de6", accent: 0xff5fcf, glyph: "♪", label: "SUNO" },
  CLAUDE: { x: 292, scale: 1.6, bg: 0x2b1a12, fg: "#f4b48c", accent: 0xd97757, glyph: "✳", label: "CLAUDE" },
  GROK: { x: 668, scale: 1.6, bg: 0x050505, fg: "#f2f2f2", accent: 0xbfbfbf, glyph: "⊘", label: "GROK" },
  CHATGPT: { x: 852, scale: 1.6, bg: 0x0b2a23, fg: "#7fffd4", accent: 0x10a37f, glyph: "✿", label: "CHATGPT" },
};
/** The CRT glass inside c7_ai_rig.png (source pixels; the image is 128x160, drawn from its bottom centre). */
const GLASS = { x: 40, y: 19, w: 58, h: 35, iw: 128, ih: 160 };

interface Rig {
  id: AiId;
  img: Phaser.GameObjects.Image;
  screen: Phaser.GameObjects.Container;
  glass: Phaser.GameObjects.Rectangle;
  head: Phaser.GameObjects.Text;
  body: Phaser.GameObjects.Text;
  typer?: Phaser.Time.TimerEvent;
  dead: boolean;
  /** screen centre in world space (where a plasma bolt hits) */
  cx: number;
  cy: number;
}

const never = () => new Promise<void>(() => undefined);

export class LairScene extends Phaser.Scene {
  private box!: DialogueBox;
  private dead = false;
  private ended = false;
  private drongus!: Phaser.GameObjects.Sprite;
  private gun?: Phaser.GameObjects.Image;
  private servant?: Phaser.GameObjects.Sprite;
  private rigs = {} as Record<AiId, Rig>;
  private rage = 0;
  private pacing = false;
  private typingAnim?: Phaser.Time.TimerEvent;
  private fumeTween?: Phaser.Tweens.Tween;
  private escHandler?: (e: KeyboardEvent) => void;

  constructor() {
    super("Lair");
  }

  preload() {
    for (const [k, f] of Object.entries(LAIR_ART)) if (!this.textures.exists(k)) this.load.image(k, `art/${f}`);
    if (!this.textures.exists("spr_SERVANT")) this.load.spritesheet("spr_SERVANT", "art/chars/SERVANT.png", { frameWidth: 92, frameHeight: 92 });
  }

  async create() {
    this.dead = false;
    this.ended = false;
    this.rage = 0;
    this.pacing = false;
    this.rigs = {} as Record<AiId, Rig>;
    this.servant = undefined;
    this.gun = undefined;
    this.events.once("shutdown", () => {
      this.dead = true;
      if (this.escHandler) window.removeEventListener("keydown", this.escHandler);
    });
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") this.finish(true);
    };
    window.addEventListener("keydown", this.escHandler);

    this.prepArt();
    this.cameras.main.fadeIn(600);
    this.box = new DialogueBox(this, 1000, 0.1);
    this.buildStage();
    this.add.text(W - 10, 8, "Esc: skip scene", { fontFamily: FONT, fontSize: "11px", color: "#8a8fa0" }).setOrigin(1, 0).setDepth(1100);
    this.events.on("update", () => this.followGun());
    synth.music("wiki");
    synth.weatherSound("storm");
    this.lightningLoop();
    await this.run();
    this.finish(false);
  }

  // ---------------------------------------------------------------- the scene

  private async run() {
    const d = this.drongus;
    this.paceLoop(400, 580);
    await this.talk(C7.LR_OPEN);
    await this.stopPacing();
    this.face(d, "south");
    await this.talk(C7.LR_SONG_ASK);

    // the song reviews: he goes round them one by one
    await this.walkTo(d, 400);
    this.face(d, "west");
    await this.talk(C7.LR_SONG_CLAUDE);
    await this.walkTo(d, 560);
    this.face(d, "east");
    await this.talk(C7.LR_SONG_GROK);
    await this.walkTo(d, 735);
    this.face(d, "east");
    await this.talk(C7.LR_SONG_GPT);
    await this.hop(d);

    // one to ten
    this.paceLoop(420, 600);
    await this.talk(C7.LR_UNFAIR_ASK);
    await this.stopPacing();
    await this.walkTo(d, 560);
    this.face(d, "east");
    await this.talk(C7.LR_UNFAIR_GROK);
    await this.walkTo(d, 735);
    this.face(d, "east");
    await this.talk(C7.LR_UNFAIR_GPT);
    await this.walkTo(d, 405);
    this.face(d, "west");
    synth.stopMusic();
    this.setRage(0.35);
    await this.talk(C7.LR_UNFAIR_CLAUDE);
    this.setRage(0.6);
    await this.talk(C7.LR_WHAT);

    // the DRONGUS GUN
    await this.drawGun();
    await this.talk(C7.LR_GUN);
    await this.fireAt(this.rigs.CLAUDE);
    await this.wait(900);
    this.setRage(0.3);
    synth.music("wiki");
    await this.talk(C7.LR_AFTER_CLAUDE);

    // IQ
    this.paceLoop(440, 600);
    await this.talk(C7.LR_IQ_ASK);
    await this.stopPacing();
    await this.walkTo(d, 560);
    this.face(d, "east");
    await this.talk(C7.LR_IQ_GROK);
    await this.walkTo(d, 735);
    this.face(d, "east");
    await this.talk(C7.LR_IQ_GPT.slice(0, 1));
    synth.stopMusic();
    await this.talk(C7.LR_IQ_GPT.slice(1));
    this.setRage(0.85);
    await this.talk(C7.LR_IQ_RAGE);
    await this.fireAt(this.rigs.CHATGPT);
    await this.wait(900);
    this.setRage(0.45);
    synth.music("wiki");
    await this.talk(C7.LR_AFTER_GPT);

    // Suno
    await this.talk(C7.LR_SUNO);
    await this.walkTo(d, 205);
    this.face(d, "west");
    this.startTyping();
    await this.typeOn(this.rigs.SUNO, "> song about my plight of victimhood, sad but powerful, 140bpm, like Coldplay but better", 2600);
    await this.talk(C7.LR_SUNO_REPLY);

    // the servant
    const sv = this.servant!;
    sv.setVisible(true);
    synth.play("door");
    await this.walkTo(sv, 660, 70);
    this.cower(sv);
    await this.talk(C7.LR_SERVANT_1);
    await this.walkTo(sv, 540, 70);
    this.cower(sv);
    await this.talk(C7.LR_SERVANT_2);
    await this.walkTo(sv, 470, 90);
    this.face(sv, "west");
    this.cameras.main.shake(200, 0.004);
    await this.talk(C7.LR_SERVANT_3);
    this.stopTyping();
    synth.stopMusic();
    this.setRage(1);
    this.face(d, "east");
    await this.talk(C7.LR_SNAP);
    await this.fireAt(null, sv);
    await this.wait(1200);

    // he comes round. a bit.
    this.setRage(0.2);
    await this.talk(C7.LR_AFTER_SERVANT);
    this.face(d, "east");
    await this.talk(C7.LR_DATE);
    this.face(d, "south");
    await this.talk(C7.LR_JUDGEMENT);
    await this.laugh();
  }

  private finish(skipped: boolean) {
    if (this.ended || this.dead) return;
    this.ended = true;
    G.s.flags.ch7_lair_seen = true;
    G.save();
    synth.weatherSound(null);
    const go = () => switchTo(this, "Hub", { at: "TOWN_HALL", from: "lair" });
    if (skipped) fadeThen(this, 300, go);
    else go();
  }

  // ---------------------------------------------------------------- set dressing

  /** Fill in anything that didn't load (missing art falls back to simple shapes). */
  private prepArt() {
    if (this.textures.exists("spr_SERVANT")) {
      const tex = this.textures.get("spr_SERVANT");
      const cd = (tex.customData ?? {}) as { char?: unknown; hd?: number };
      if (!cd.char) tex.customData = { ...cd, hd: 0.5, char: SERVANT_META };
    }
    const g = this.add.graphics().setVisible(false);
    if (!this.textures.exists("c7_ai_rig")) {
      g.clear();
      g.fillStyle(0x23242c).fillRect(36, 60, 64, 100);
      g.fillStyle(0x34363f).fillRect(36, 14, 66, 46);
      g.fillStyle(0x0a0a0a).fillRect(40, 19, 58, 35);
      g.fillStyle(0x3cff7a).fillRect(44, 70, 6, 3).fillRect(56, 70, 6, 3);
      g.generateTexture("c7_ai_rig", 128, 160);
    }
    if (!this.textures.exists("c7_ai_rig_wreck")) {
      g.clear();
      g.fillStyle(0x1a1a1a).fillRect(36, 60, 64, 100);
      g.fillStyle(0x222222).fillRect(36, 24, 66, 36);
      g.fillStyle(0x050505).fillTriangle(44, 30, 92, 26, 70, 56);
      g.generateTexture("c7_ai_rig_wreck", 128, 160);
    }
    if (!this.textures.exists("c7_drongus_gun")) {
      g.clear();
      g.fillStyle(0x2f4a2f).fillRect(4, 14, 70, 20);
      g.fillStyle(0x1a2a1a).fillRect(20, 30, 14, 14);
      g.fillStyle(0x6bff6b).fillRect(74, 16, 18, 16);
      g.generateTexture("c7_drongus_gun", 96, 48);
    }
    if (!this.textures.exists("c7_calendar")) {
      g.clear();
      g.fillStyle(0x7a5a2a).fillRect(4, 6, 56, 70);
      g.fillStyle(0xf3e6c4).fillRect(10, 18, 44, 54);
      g.fillStyle(0xa3242c).fillRect(10, 12, 44, 8);
      g.generateTexture("c7_calendar", 64, 80);
    }
    g.destroy();
    for (const id of Object.keys(RIGS) as AiId[]) this.makeTalkPortrait(id);
  }

  /** talk_<AI>: a 7-frame "face" (a screen with a waveform for a mouth) so the dialogue box lip-syncs them. */
  private makeTalkPortrait(id: AiId) {
    const key = `talk_${id}`;
    if (this.textures.exists(key)) return;
    const st = RIGS[id];
    const S = 64;
    const tex = this.textures.createCanvas(key, S * 7, S);
    if (!tex) return;
    const ctx = tex.getContext();
    const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
    // rest, closed, small, medium, wide, round, teeth
    const amp = [0.08, 0.02, 0.35, 0.6, 1, 0.75, 0.45];
    for (let f = 0; f < 7; f++) {
      const ox = f * S;
      ctx.fillStyle = "#16171d";
      ctx.fillRect(ox, 0, S, S);
      ctx.fillStyle = hex(st.bg);
      ctx.fillRect(ox + 4, 4, S - 8, S - 14);
      ctx.strokeStyle = hex(st.accent);
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + 4, 4, S - 8, S - 14);
      ctx.fillStyle = st.fg;
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(st.glyph, ox + S / 2, 15);
      // the waveform mouth
      ctx.fillStyle = st.fg;
      for (let i = 0; i < 9; i++) {
        const h = Math.max(1, Math.round(amp[f] * 14 * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + f)))));
        ctx.fillRect(ox + 11 + i * 5, 34 - h / 2, 3, h);
      }
      ctx.fillStyle = "#9aa0b4";
      ctx.font = "bold 7px sans-serif";
      ctx.fillText(st.label, ox + S / 2, S - 5);
      tex.add(f, 0, ox, 0, S, S);
    }
    tex.refresh();
  }

  private buildStage() {
    if (!backdrop(this, "bg_lair", { depth: -10 })) {
      const g = this.add.graphics().setDepth(-10);
      g.fillGradientStyle(0x1a0f2e, 0x1a0f2e, 0x3a1020, 0x3a1020, 1);
      g.fillRect(0, 0, W, 540);
      g.fillStyle(0x2a2a5a, 1).fillRect(400, 40, 160, 240);
    }
    // the storm through the windows
    this.flashRect = this.add.rectangle(480, 270, W, 540, 0xcfd8ff, 0).setDepth(-9).setBlendMode(Phaser.BlendModes.ADD);

    // the calendar. It has been there the whole time.
    const cal = this.add.image(112, 72, "c7_calendar").setScale(1.3).setDepth(-5);
    const cy = cal.y + 4 * 1.3;
    this.add.text(cal.x, cy - 12, "9", { fontFamily: "Georgia, serif", fontSize: "34px", color: "#7a1018", fontStyle: "bold" }).setOrigin(0.5).setDepth(-4);
    this.add.text(cal.x, cy + 16, "JANUARY", { fontFamily: "Georgia, serif", fontSize: "10px", color: "#2a1a10", fontStyle: "bold" }).setOrigin(0.5).setDepth(-4);

    for (const id of Object.keys(RIGS) as AiId[]) this.rigs[id] = this.makeRig(id);
    this.idleScreens();

    this.drongus = this.add.sprite(490, FLOOR + 6, "spr_DRONGUS", 0).setOrigin(0.5, 1).setScale(4).setDepth(60);
    this.drongus.setData("facing", "south");
    const svKey = this.textures.exists("spr_SERVANT") ? "spr_SERVANT" : "spr_FOLK1";
    this.servant = this.add.sprite(1010, FLOOR + 10, svKey, 0).setOrigin(0.5, 1).setScale(svKey === "spr_SERVANT" ? 3 : 4).setDepth(55).setVisible(false);
    if (svKey !== "spr_SERVANT") this.servant.setTint(0x9a7a5a);
    this.servant.setData("facing", "west");
  }

  private flashRect?: Phaser.GameObjects.Rectangle;

  private makeRig(id: AiId): Rig {
    const st = RIGS[id];
    const img = this.add.image(st.x, FLOOR + 4, "c7_ai_rig").setOrigin(0.5, 1).setScale(st.scale).setDepth(20);
    if (id === "SUNO") img.setTint(0xffd6f4);
    const s = st.scale;
    const left = st.x + (GLASS.x - GLASS.iw / 2) * s;
    const top = FLOOR + 4 - (GLASS.ih - GLASS.y) * s;
    const gw = GLASS.w * s;
    const gh = GLASS.h * s;
    const screen = this.add.container(0, 0).setDepth(21);
    const glass = this.add.rectangle(left, top, gw, gh, st.bg, 1).setOrigin(0);
    const head = this.add.text(left + 3, top + 2, `${st.glyph} ${st.label}`, { fontFamily: FONT, fontSize: "9px", color: st.fg, fontStyle: "bold" });
    const body = this.add.text(left + 3, top + 14, "", {
      fontFamily: FONT,
      fontSize: "9px",
      color: st.fg,
      wordWrap: { width: gw - 6, useAdvancedWrap: true },
      maxLines: 4,
      lineSpacing: -1,
    });
    screen.add([glass, head, body]);
    return { id, img, screen, glass, head, body, dead: false, cx: left + gw / 2, cy: top + gh / 2 };
  }

  private idleScreens() {
    const idle: Record<AiId, string> = {
      SUNO: "Make a song about anything_",
      CLAUDE: "How can I help you today?_",
      GROK: "ask me anything. no limits._",
      CHATGPT: "What can I help with?_",
    };
    for (const r of Object.values(this.rigs)) if (!r.dead) this.setScreen(r, idle[r.id]);
  }

  private setScreen(r: Rig, text: string, big = false) {
    r.typer?.remove();
    r.body.setFontSize(big ? 22 : 9).setText(text);
  }

  /** An AI talks: its screen lights up and types the gist. */
  private screenSay(id: AiId, text: string) {
    const r = this.rigs[id];
    if (!r || r.dead) return;
    const short = text.length <= 12;
    const clip = short ? text : text.length > 70 ? text.slice(0, 68) + "…" : text;
    r.typer?.remove();
    r.body.setFontSize(short ? 22 : 9).setText("");
    let n = 0;
    r.typer = this.time.addEvent({
      delay: 22,
      repeat: clip.length - 1,
      callback: () => r.body.setText(clip.slice(0, ++n)),
    });
    this.tweens.killTweensOf(r.glass);
    r.glass.setAlpha(1);
    this.tweens.add({ targets: r.glass, alpha: 0.7, duration: 120, yoyo: true, repeat: 3 });
  }

  /** Type into a screen, char by char, and wait for it (the Suno prompt). */
  private typeOn(r: Rig, text: string, ms: number) {
    if (this.dead) return never();
    r.typer?.remove();
    r.body.setFontSize(9).setText("");
    let n = 0;
    return new Promise<void>((res) => {
      r.typer = this.time.addEvent({
        delay: Math.max(10, ms / text.length),
        repeat: text.length - 1,
        callback: () => {
          r.body.setText(text.slice(0, ++n));
          if (n % 2 === 0) synth.play("type");
          if (n >= text.length) res();
        },
      });
    });
  }

  // ---------------------------------------------------------------- Drongus

  private setRage(v: number) {
    this.rage = v;
    const gb = Math.round(255 * (1 - 0.78 * v));
    this.drongus.setTint(Phaser.Display.Color.GetColor(255, gb, gb));
    if (v >= 0.6) this.steam();
  }

  private steam() {
    const d = this.drongus;
    for (let i = 0; i < 2; i++) {
      const s = vfx(this, "vfx_smoke", d.x + (i ? 18 : -18), d.y - 118, { scale: 0.6, depth: 70, delay: i * 120, alpha: 0.8 });
      if (!s) {
        const p = this.add.circle(d.x + (i ? 18 : -18), d.y - 118, 6, 0xffffff, 0.6).setDepth(70);
        this.tweens.add({ targets: p, y: p.y - 30, alpha: 0, scale: 2, duration: 600, onComplete: () => p.destroy() });
      }
    }
  }

  /** Shake with fury (rotation wobble, so it doesn't fight any walking). */
  private fume(ms = 600) {
    const d = this.drongus;
    this.fumeTween?.stop();
    this.fumeTween = this.tweens.add({ targets: d, angle: { from: -4, to: 4 }, duration: 45, yoyo: true, repeat: Math.round(ms / 90), onComplete: () => d.setAngle(0), onStop: () => d.setAngle(0) });
  }

  private face(spr: Phaser.GameObjects.Sprite, f: "south" | "east" | "north" | "west") {
    spr.setData("facing", f);
    animateWalker(spr, 0, 0, false, this.time.now);
    // the servant only has a west walk; anything else uses its idle frames
  }

  private walkTo(spr: Phaser.GameObjects.Sprite, x: number, speed = 190): Promise<void> {
    if (this.dead) return never();
    const dist = Math.abs(spr.x - x);
    if (dist < 2) return Promise.resolve();
    const dx = Math.sign(x - spr.x);
    return new Promise<void>((res) => {
      let done = false;
      const fin = () => {
        if (done) return;
        done = true;
        if (spr.active) animateWalker(spr, 0, 0, false, this.time.now);
        res();
      };
      this.tweens.add({
        targets: spr,
        x,
        duration: (dist / speed) * 1000,
        onUpdate: () => animateWalker(spr, dx, 0, true, this.time.now),
        onComplete: fin,
        onStop: fin,
      });
    });
  }

  private paceLoop(a: number, b: number) {
    this.pacing = true;
    const loop = async () => {
      let to = Math.abs(this.drongus.x - a) < Math.abs(this.drongus.x - b) ? b : a;
      while (this.pacing && !this.dead) {
        await this.walkTo(this.drongus, to, 210);
        to = to === a ? b : a;
      }
    };
    void loop();
  }

  private async stopPacing() {
    this.pacing = false;
    for (const t of this.tweens.getTweensOf(this.drongus)) t.stop();
    await this.wait(40);
  }

  private async hop(spr: Phaser.GameObjects.Sprite) {
    if (this.dead) return never();
    await new Promise<void>((res) => this.tweens.add({ targets: spr, y: spr.y - 18, duration: 140, yoyo: true, repeat: 1, onComplete: () => res() }));
  }

  /** Typing at the Suno terminal (facing west: the attack frames, flipped, as two-finger jabs). */
  private startTyping() {
    const d = this.drongus;
    const cyc = charMeta(this, d.texture.key)?.attack?.east;
    this.typingAnim?.remove();
    let i = 0;
    this.typingAnim = this.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        if (!cyc?.length) return;
        d.setFrame(cyc[i++ % 2 === 0 ? 0 : Math.min(1, cyc.length - 1)]).setFlipX(true);
      },
    });
  }

  private stopTyping() {
    this.typingAnim?.remove();
    this.typingAnim = undefined;
    this.drongus.setFlipX(false);
    animateWalker(this.drongus, 0, 0, false, this.time.now);
  }

  private async drawGun() {
    if (this.dead) return never();
    synth.play("decree");
    const g = this.add.image(this.drongus.x, this.drongus.y - 60, "c7_drongus_gun").setDepth(62).setScale(0.1);
    this.gun = g;
    this.tweens.add({ targets: g, scale: 1.15, duration: 380, ease: "Back.out" });
    this.cameras.main.shake(250, 0.006);
    const glow = this.add.circle(g.x, g.y, 30, 0x5cff7a, 0.35).setDepth(61).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 2.5, alpha: 0, duration: 600, onComplete: () => glow.destroy() });
    this.caption("THE DRONGUS GUN", "#7dff8a", 30);
    await this.wait(700);
  }

  /** Keep the gun in his hands, pointing the way he faces. */
  private followGun() {
    const g = this.gun;
    const d = this.drongus;
    if (!g || !d?.active) return;
    const f = (d.getData("facing") as string) ?? "south";
    const west = f === "west" || d.flipX;
    g.setFlipX(west);
    g.setOrigin(west ? 0.75 : 0.25, 0.55);
    g.setPosition(d.x + (west ? -14 : f === "south" ? 10 : 14), d.y - (f === "south" ? 50 : 56));
    g.setAngle(f === "south" ? -20 : 0);
    g.setDepth(f === "north" ? d.depth - 1 : d.depth + 2);
  }

  private muzzle(): { x: number; y: number; dir: number } {
    const g = this.gun!;
    const dir = g.flipX ? -1 : 1;
    return { x: g.x + dir * 96 * 0.75 * g.scaleX, y: g.y - 2, dir };
  }

  /** Charge, fire, obliterate. Either a rig or the servant. */
  private async fireAt(rig: Rig | null, who?: Phaser.GameObjects.Sprite) {
    if (this.dead) return never();
    const d = this.drongus;
    const tx = rig ? rig.cx : who!.x;
    const ty = rig ? rig.cy : who!.y - 60;
    this.face(d, tx < d.x ? "west" : "east");
    this.fume(500);
    this.lastCaption?.destroy();
    // charge
    const m0 = this.muzzle();
    const charge = this.add.circle(m0.x, m0.y, 16, 0x7dff8a, 0.9).setDepth(80).setBlendMode(Phaser.BlendModes.ADD).setScale(0.1);
    synth.play("zap");
    await new Promise<void>((res) => this.tweens.add({ targets: charge, scale: 1.4, duration: 520, ease: "Quad.in", onComplete: () => res() }));
    if (this.dead) return never();
    charge.destroy();
    // fire
    const atk = charMeta(this, d.texture.key)?.attack?.east;
    if (atk?.length) d.setFrame(atk[atk.length - 1]).setFlipX(tx < d.x);
    synth.play("gun_bfk");
    const m = this.muzzle();
    vfx(this, "vfx_muzzle", m.x, m.y, { scale: 2, depth: 82, tint: 0x7dff8a, flipX: m.dir < 0, add: true });
    this.tweens.add({ targets: d, x: d.x - m.dir * 10, duration: 70, yoyo: true });
    const bolt = this.add.container(m.x, m.y).setDepth(85);
    const outer = this.add.circle(0, 0, 26, 0x39ff5a, 0.55).setBlendMode(Phaser.BlendModes.ADD);
    const inner = this.add.circle(0, 0, 13, 0xeaffea, 1).setBlendMode(Phaser.BlendModes.ADD);
    bolt.add([outer, inner]);
    this.tweens.add({ targets: outer, scale: 1.25, duration: 60, yoyo: true, repeat: -1 });
    const trail = this.time.addEvent({
      delay: 25,
      loop: true,
      callback: () => {
        const t = this.add.circle(bolt.x, bolt.y, 14, 0x39ff5a, 0.5).setDepth(84).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: t, scale: 0.1, alpha: 0, duration: 260, onComplete: () => t.destroy() });
      },
    });
    const dist = Math.hypot(tx - m.x, ty - m.y);
    await new Promise<void>((res) => this.tweens.add({ targets: bolt, x: tx, y: ty, duration: Math.max(140, dist * 0.7), ease: "Quad.in", onComplete: () => res() }));
    trail.remove();
    bolt.destroy();
    if (this.dead) return never();
    // impact
    this.cameras.main.flash(220, 120, 255, 140);
    this.cameras.main.shake(600, 0.022);
    synth.play("explode_1");
    synth.play("boom");
    vfx(this, "vfx_shock", tx, ty, { scale: 2.6, depth: 90, tint: 0x7dff8a, add: true });
    const big = vfx(this, hasVfx(this, "vfx_bigboom") ? "vfx_bigboom" : "vfx_boom", tx, ty + 20, { scale: 2.4, depth: 91 });
    if (!big) {
      const c = this.add.circle(tx, ty, 20, 0xffc04d, 1).setDepth(91);
      this.tweens.add({ targets: c, scale: 5, alpha: 0, duration: 500, onComplete: () => c.destroy() });
    }
    vfx(this, "vfx_sparks", tx, ty, { scale: 2, depth: 92, add: true, delay: 80 });
    if (rig) this.wreck(rig);
    if (who) this.splatter(who);
    await this.wait(500);
    if (this.gun) {
      d.setFlipX(false);
      this.face(d, tx < d.x ? "west" : "east");
    }
  }

  private wreck(r: Rig) {
    r.dead = true;
    r.typer?.remove();
    r.screen.destroy();
    r.img.setTexture("c7_ai_rig_wreck").setTint(0x8a8078);
    const top = r.img.y - r.img.displayHeight * 0.72;
    vfx(this, "vfx_smokecol", r.img.x, top + 10, { scale: 1.6, depth: 19, alpha: 0.85, delay: 300 });
    vfx(this, "vfx_fire", r.img.x - 10, r.img.y - r.img.displayHeight * 0.5, { scale: 1.1, depth: 22, delay: 200, add: true });
    // it keeps sparking
    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (Math.random() < 0.6) {
          vfx(this, "vfx_sparks", r.img.x + (Math.random() - 0.5) * 70, top + Math.random() * 90, { scale: 1.1, depth: 23, add: true });
          if (Math.random() < 0.3) synth.play("zap");
        }
      },
    });
  }

  /** The servant goes everywhere. (Gore off: a big bang, a scorch mark, a little hood floating down.) */
  private splatter(sv: Phaser.GameObjects.Sprite) {
    const x = sv.x;
    const y = sv.y - 50;
    sv.setVisible(false);
    const gore = G.meta.settings.gore !== false;
    this.add.ellipse(x, FLOOR + 8, 120, 22, 0x0b0705, 0.75).setDepth(30);
    if (!gore) {
      vfx(this, "vfx_smoke", x, y, { scale: 2, depth: 88, delay: 200 });
      const hood = this.add.triangle(x, y - 60, 0, 18, 10, 0, 20, 18, 0x6b4a36).setDepth(70);
      this.tweens.add({ targets: hood, y: FLOOR, angle: 200, duration: 1600, ease: "Sine.inOut" });
      return;
    }
    synth.play("splat_1");
    synth.play("squelch");
    vfx(this, "vfx_gore", x, y, { scale: 2.4, depth: 89 });
    vfx(this, "vfx_bloodspray", x - 20, y, { scale: 2.2, depth: 88, flipX: true });
    vfx(this, "vfx_bloodspray", x + 20, y, { scale: 2.2, depth: 88 });
    vfx(this, "vfx_bloodpool", x, FLOOR + 6, { scale: 2.6, depth: 31, hold: true, delay: 300 });
    const cols = [0xb3121f, 0x7a0a12, 0xe2667a, 0xd9485a, 0x5a2a1a, 0x6b4a36];
    for (let i = 0; i < 26; i++) {
      const c = cols[i % cols.length];
      const chunk =
        i % 3 === 0
          ? this.add.ellipse(x, y, 14 + Math.random() * 10, 7 + Math.random() * 5, c)
          : i % 3 === 1
            ? this.add.circle(x, y, 3 + Math.random() * 4, c)
            : this.add.rectangle(x, y, 10, 4, c);
      chunk.setDepth(86);
      const vx = (Math.random() - 0.5) * 900;
      let vy = -250 - Math.random() * 450;
      const land = FLOOR - 4 + Math.random() * 22;
      const spin = (Math.random() - 0.5) * 20;
      const ev = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          vy += 1500 * 0.016;
          chunk.x += vx * 0.016;
          chunk.y += vy * 0.016;
          chunk.angle += spin;
          if (chunk.y >= land && vy > 0) {
            chunk.y = land;
            chunk.setDepth(32);
            ev.remove();
            if (Math.random() < 0.4) this.add.ellipse(chunk.x, land + 3, 18, 5, 0x7a0a12, 0.8).setDepth(31);
          }
          if (chunk.x < -20 || chunk.x > W + 20) ev.remove();
        },
      });
    }
    // some of it reaches the screens
    for (const r of Object.values(this.rigs)) if (!r.dead && Math.abs(r.cx - x) < 260) this.add.circle(r.cx + (Math.random() - 0.5) * 30, r.cy + 4, 4, 0x9a0f1a, 0.9).setDepth(24);
  }

  private cower(sv: Phaser.GameObjects.Sprite) {
    const meta = charMeta(this, sv.texture.key) as (CharMeta & { crouch?: Record<string, number[]> }) | null;
    const cr = meta?.crouch?.west;
    if (cr?.length) sv.setFrame(cr[Math.min(cr.length - 1, 2)]);
    this.tweens.add({ targets: sv, x: sv.x + 1.5, duration: 40, yoyo: true, repeat: 12 });
  }

  // ---------------------------------------------------------------- the end

  private async laugh() {
    if (this.dead) return never();
    const d = this.drongus;
    this.setRage(0.55);
    this.cameras.main.zoomTo(1.12, 2200, "Sine.inOut");
    this.cameras.main.pan(d.x + 60, d.y - 90, 2200, "Sine.inOut");
    this.tweens.add({ targets: d, y: d.y - 8, duration: 90, yoyo: true, repeat: 20 });
    const has = ["MWAHAHAHA", "HAHAHAHA", "HA HA HA", "AHAHAHA", "HAHA"];
    for (let i = 0; i < 9; i++) {
      this.time.delayedCall(i * 230, () => {
        const t = this.add
          .text(d.x + (Math.random() - 0.5) * 220, d.y - 140 - Math.random() * 60, has[i % has.length], { fontFamily: FONT, fontSize: `${16 + (i % 3) * 5}px`, color: "#ff5a5a", fontStyle: "bold" })
          .setOrigin(0.5)
          .setDepth(300)
          .setShadow(2, 2, "#000", 0);
        this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
      });
    }
    await this.wait(2200);
    // lightning
    synth.play("thunder");
    this.flashRect?.setFillStyle(0xffffff, 1).setDepth(500);
    this.cameras.main.shake(500, 0.012);
    await this.wait(90);
    this.flashRect?.setAlpha(0);
    await this.wait(80);
    this.flashRect?.setAlpha(1);
    await this.wait(140);
    this.flashRect?.setAlpha(0);
    await this.wait(250);
    this.cameras.main.fadeOut(1400, 0, 0, 0);
    await this.wait(1600);
  }

  /** Every so often the storm lights the windows. */
  private lightningLoop() {
    const strike = () => {
      if (this.dead || this.ended) return;
      const r = this.flashRect;
      if (r && r.depth < 0) {
        r.setFillStyle(0xcfd8ff, 0).setAlpha(1);
        this.tweens.add({ targets: r, fillAlpha: { from: 0.3, to: 0 }, duration: 380 });
        if (Math.random() < 0.6) this.time.delayedCall(250 + Math.random() * 500, () => synth.play(Math.random() < 0.5 ? "thunder_1" : "thunder_2"));
      }
      this.time.delayedCall(5000 + Math.random() * 6000, strike);
    };
    this.time.delayedCall(2500, strike);
  }

  // ---------------------------------------------------------------- helpers

  private lastCaption?: Phaser.GameObjects.Text;

  private caption(t: string, color = "#ffffff", size = 34) {
    this.lastCaption?.destroy();
    const c = title(this, 480, 60, t, size, color).setDepth(500);
    c.setScale(0.2);
    this.tweens.add({ targets: c, scale: 1, duration: 300, ease: "Back.out" });
    this.tweens.add({ targets: c, alpha: 0, delay: 1800, duration: 400 });
    this.lastCaption = c;
    return c;
  }

  private wait(ms: number) {
    if (this.dead) return never();
    return new Promise<void>((res) => this.time.delayedCall(ms, () => res()));
  }

  private async talk(lines: Line[]) {
    if (this.dead || this.ended) return never();
    await this.box.play(lines, {
      onLine: (l) => {
        const s = String(l.s);
        if (s in RIGS) this.screenSay(s as AiId, l.t);
        if (s === "DRONGUS") {
          if (l.t === "WHAT!!!") {
            this.setRage(1);
            this.fume(1200);
            this.cameras.main.shake(700, 0.02);
            synth.play("roar");
            this.caption("WHAT!!!", "#ff3b3b", 64);
          } else if (this.rage >= 0.6 && /!/.test(l.t)) {
            this.fume(500);
            this.cameras.main.shake(300, 0.008);
          }
        }
        if (s === "SERVANT" && l.t.startsWith("MY LIEGE")) this.cameras.main.shake(200, 0.004);
      },
    });
    if (this.dead || this.ended) return never();
  }
}
