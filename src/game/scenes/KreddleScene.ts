import Phaser from "phaser";
import { vfx } from "../gfx/Vfx";
import { G } from "../G";
import { Controls } from "../combat/Controls";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, button, uiFrame } from "../ui/theme";
import { dir, say } from "../../content/dsl";
import { animateWalker } from "../gfx/HD";
import { CHARACTERS, PLAYABLE_ORDER } from "../../data/characters";
import { DECOR } from "../../content/home";
import { INSULT, KRUNCHERS, KRUNCHER_BOAST, LOCAL_CHAT, PRIZE, PRIZES, SHOVES, WELCOME_SPEECH } from "../../content/kreddle";
import { addKrokens, awardPrize, kd, krokenPrice, krokens, prizeOpen, rollPrize } from "../systems/kreddle";
import type { Line } from "../../data/types";
import { maxHp } from "../systems/stats";

/**
 * KREDDLE: the casino/arcade universe over the bridge. Always night. Always neon.
 * Walk the Strip, play the machines, get shoved by the locals, meet the Kreddle Krunchers.
 */

const W = 2600;
const H = 700;
const TOP = 430;
const BOTTOM = 680;

type NpcKind = "citizen" | "kruncher" | "pitboss" | "klerble" | "dealer";
interface Npc {
  spr: Phaser.GameObjects.Sprite;
  kind: NpcKind;
  name: string;
  tag?: Phaser.GameObjects.Text;
  home: { x: number; y: number };
  target: { x: number; y: number };
  nextTurn: number;
  charging?: boolean;
  of?: string;
  jab?: string;
}
interface Spot {
  x: number;
  y: number;
  r: number;
  label: () => string;
  use: () => void;
}

const NEON = [0xff4fd8, 0x22d3ee, 0xfacc15, 0xa855f7, 0x4ade80];

export class KreddleScene extends Phaser.Scene {
  private controls!: Controls;
  private box!: DialogueBox;
  private me!: Phaser.GameObjects.Sprite;
  private prompt!: Phaser.GameObjects.Text;
  private busy = false;
  private npcs: Npc[] = [];
  private spots: Spot[] = [];
  private nextShove = 0;
  private nextTaunt = 0;
  private gambled = false;
  private panelRoot: Phaser.GameObjects.Container | null = null;
  private panelKeys: [string, (...a: any[]) => void][] = [];
  private panelTick: Phaser.Time.TimerEvent | null = null;
  private coinText!: Phaser.GameObjects.Text;
  /** When the last machine was closed (so the ESC that closed it doesn't also walk you out). */
  private closedAt = 0;
  private wantPrizes = false;

  constructor() {
    super("Kreddle");
  }

  create() {
    const s = G.s;
    this.busy = false;
    synth.ambience("casino");
    this.npcs = [];
    this.spots = [];
    this.gambled = false;
    this.panelRoot = null;
    this.panelKeys = [];
    this.cameras.main.fadeIn(400);
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor(0x0b0618);
    this.drawWorld();
    this.drawStrip();
    this.spawnPeople();
    this.me = this.add.sprite(110, 560, `spr_${s.player}`, 0).setScale(2).setDepth(560);
    this.me.setData("facing", "east");
    this.cameras.main.startFollow(this.me, true, 0.1, 0.1);
    this.prompt = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#1a0b24dd", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(3000).setVisible(false);
    this.coinText = this.add.text(950, 10, "", { fontFamily: FONT, fontSize: "15px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(1, 0).setScrollFactor(0).setDepth(4000);
    this.controls = new Controls(this);
    // back from the Krezzcoin counter (the Menu scene)
    this.events.off("ui-resume");
    this.events.on("ui-resume", () => {
      this.busy = false;
      this.controls.swallow();
      if (this.wantPrizes) {
        this.wantPrizes = false;
        this.prizeCounter();
      }
    });
    this.events.off("open-prizes");
    this.events.on("open-prizes", () => (this.wantPrizes = true));
    this.box = new DialogueBox(this, 6000, 0.2);
    if (!this.scene.isActive("UI")) this.scene.launch("UI", { mode: "hub" });
    else this.scene.get("UI").events.emit("mode", "hub");
    synth.music("kreddle", true);
    this.nextShove = this.time.now + 9000;
    this.time.delayedCall(500, () => void this.arrive());
  }

  // ------------------------------------------------------------------ the place

  private drawWorld() {
    // the sky: a neon skyline, fixed behind everything, with searchlights
    if (this.textures.exists("bg_kreddle_sky")) {
      const sky = this.add.image(480, 0, "bg_kreddle_sky").setOrigin(0.5, 0).setScrollFactor(0.15, 0).setDepth(-30);
      sky.setScale(Math.max(1200 / sky.width, 380 / sky.height));
    } else this.add.rectangle(480, 190, 960, 380, 0x1a0b3a).setScrollFactor(0).setDepth(-30);
    for (let i = 0; i < 4; i++) {
      const beam = this.add.triangle(160 + i * 220, 400, 0, 0, -40, -520, 40, -520, NEON[i % NEON.length], 0.12).setOrigin(0, 0).setScrollFactor(0.2, 0).setDepth(-25).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: beam, angle: { from: -25, to: 25 }, yoyo: true, repeat: -1, duration: 2600 + i * 700, ease: "Sine.inOut" });
    }
    // the street: dark tarmac, a pavement of light-up tiles, neon puddles
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x140a24, 1).fillRect(0, 400, W, H - 400);
    g.fillStyle(0x23123d, 1).fillRect(0, 400, W, 46);
    for (let x = 0; x < W; x += 46) g.lineStyle(1, 0x3b1d63, 1).strokeRect(x, 400, 46, 46);
    g.lineStyle(3, 0xff4fd8, 0.55).lineBetween(0, 446, W, 446);
    for (let x = 40; x < W; x += 160) g.fillStyle(0xfacc15, 0.6).fillRect(x, 590, 70, 6);
    for (let i = 0; i < 26; i++) {
      const p = this.add.ellipse(80 + Math.random() * (W - 160), 470 + Math.random() * 200, 50 + Math.random() * 70, 10 + Math.random() * 8, NEON[i % NEON.length], 0.12).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: p, alpha: 0.04, yoyo: true, repeat: -1, duration: 900 + Math.random() * 1400 });
    }
    // the bridge home, at the west end
    const b = this.add.graphics().setDepth(3);
    b.fillStyle(0x3f3f46, 1).fillRect(0, 480, 150, 120);
    for (let x = 0; x < 150; x += 18) b.fillStyle(0x52525b, 1).fillRect(x, 480, 14, 120);
    b.lineStyle(4, 0x22d3ee, 0.9).lineBetween(0, 478, 150, 478).lineBetween(0, 602, 150, 602);
    this.add.text(75, 452, "← KRELWORLD\n(the boring bit)", { fontFamily: FONT, fontSize: "11px", color: "#22d3ee", align: "center", fontStyle: "bold" }).setOrigin(0.5, 1).setDepth(4);
    this.spots.push({ x: 60, y: 545, r: 70, label: () => "E: Cross the bridge back to Krelworld", use: () => void this.leave() });
  }

  private neonSign(x: number, y: number, text: string, color: string, size = 26) {
    const t = this.add.text(x, y, text, { fontFamily: "Impact, sans-serif", fontSize: `${size}px`, color, stroke: "#12001f", strokeThickness: 6 }).setOrigin(0.5).setDepth(450);
    t.setShadow(0, 0, color, 16, true, true);
    // the odd flicker
    this.time.addEvent({ delay: 1200 + Math.random() * 2400, loop: true, callback: () => {
      if (Math.random() < 0.5) return;
      t.setAlpha(0.25);
      this.time.delayedCall(70, () => t.setAlpha(1));
      this.time.delayedCall(140, () => t.setAlpha(0.4));
      this.time.delayedCall(200, () => t.setAlpha(1));
    } });
    return t;
  }

  private building(key: string, x: number, scale: number, sign: string, color: string, tint?: number) {
    const img = this.add.image(x, 404, key).setOrigin(0.5, 1).setScale(scale).setDepth(400);
    if (tint) img.setTint(tint);
    this.neonSign(x, 404 - img.displayHeight - 18, sign, color);
    // marquee bulbs along the front
    for (let i = 0; i < 9; i++) {
      const bx = x - img.displayWidth / 2 + 10 + (i * (img.displayWidth - 20)) / 8;
      const bulb = this.add.circle(bx, 412, 3, 0xfff3b0).setDepth(401);
      this.tweens.add({ targets: bulb, alpha: 0.2, yoyo: true, repeat: -1, duration: 300, delay: i * 90 });
    }
    return img;
  }

  private machine(key: string, x: number, y: number, scale: number) {
    const m = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(y);
    const glow = this.add.ellipse(x, y, m.displayWidth * 1.2, 18, 0xff4fd8, 0.25).setDepth(y - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.08, yoyo: true, repeat: -1, duration: 700 + Math.random() * 500 });
    return m;
  }

  private drawStrip() {
    const s = G.s;
    this.neonSign(1300, 40, "★ WELCOME TO KREDDLE ★", "#ff4fd8", 34).setScrollFactor(0.15, 1).setDepth(-20);
    // THE ARCADE + the slots
    this.building("kd_bld_arcade", 470, 1.6, "KRAZY KREDDLE ARCADE", "#facc15");
    for (let i = 0; i < 4; i++) this.machine("kd_m_slots", 340 + i * 85, 500, 1.15);
    this.spots.push({ x: 467, y: 520, r: 170, label: () => "E: KRAZY REELS (slots) · 150 Krezzcoin a spin", use: () => this.slots() });
    // THE CASINO + the claws
    this.building("kd_bld_casino", 980, 1.6, "THE GOLDEN KLAW CASINO", "#22d3ee");
    for (let i = 0; i < 3; i++) this.machine("kd_m_claw", 890 + i * 90, 505, 1.05);
    this.spots.push({ x: 980, y: 525, r: 140, label: () => "E: THE KLAW (claw machine) · 200 Krezzcoin a go", use: () => this.claw() });
    // THE WHEEL
    this.machine("kd_m_wheel", 1300, 540, 1.7);
    this.neonSign(1300, 335, "WHEEL OF KREDDLE", "#a855f7", 22).setDepth(560);
    this.spots.push({ x: 1300, y: 560, r: 110, label: () => "E: WHEEL OF KREDDLE · 300 Krezzcoin a spin", use: () => this.wheel() });
    // THE KLERBLE GRAND
    this.building("kd_bld_hotel", 1620, 1.6, "THE KLERBLE GRAND", "#facc15");
    // KREDDLE KARDS
    this.machine("kd_m_cards", 1950, 600, 1.5);
    this.neonSign(1950, 470, "KREDDLE KARDS", "#4ade80", 20).setDepth(470);
    this.spots.push({ x: 1950, y: 620, r: 110, label: () => "E: KREDDLE KARDS (higher or lower) · 100 Krezzcoin a deal", use: () => this.cards() });
    // KRUNCHER HQ + the Prize Counter
    this.building("kd_bld_arcade", 2300, 1.6, "KREDDLE KRUNCHERS HQ", "#ff4fd8", 0x9be7ff);
    const counter = this.add.rectangle(2520, 515, 120, 84, 0x2e1065).setStrokeStyle(3, 0xfacc15).setDepth(520);
    this.add.text(counter.x, counter.y, "🏆\nTHE KREDDLE\nEXCHANGE\n🎟 · 💰", { fontFamily: FONT, fontSize: "11px", color: "#facc15", align: "center", fontStyle: "bold" }).setOrigin(0.5).setDepth(521);
    this.spots.push({ x: 2520, y: 560, r: 80, label: () => `E: THE KREDDLE EXCHANGE (🎟 ${krokens(G.s)} Krokens · 💰 ${G.s.coins} Krezzcoin)`, use: () => this.exchange() });
    void s;
  }

  private spawnPeople() {
    const s = G.s;
    const add = (key: string, x: number, y: number, kind: NpcKind, name: string, extra: Partial<Npc> = {}) => {
      const tex = this.textures.exists(key) ? key : "spr_FOLK1";
      const spr = this.add.sprite(x, y, tex, 0).setScale(2).setDepth(y);
      const tag = this.add.text(x, y + 34, name, { fontFamily: FONT, fontSize: "9px", color: "#ffd1f3", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(y + 1);
      const n: Npc = { spr, kind, name, tag, home: { x, y }, target: { x, y }, nextTurn: 0, ...extra };
      this.npcs.push(n);
      return n;
    };
    // the Pit Boss watches the bridge: no gambling, no leaving
    add("spr_KD_PITBOSS", 240, 520, "pitboss", "PIT BOSS");
    // President Klerble, outside his hotel
    add("spr_TV_PRESIDENT_KLERBLE", 1620, 470, "klerble", "PRESIDENT KLERBLE");
    // the Kards dealer
    const dealer = add("spr_KD_PITBOSS", 1950, 545, "dealer", "THE DEALER");
    dealer.spr.setTint(0xffe27a);
    // the locals
    for (let i = 0; i < 12; i++) {
      const key = ["spr_KD_MAN", "spr_KD_WOMAN"][i % 2];
      const n = add(key, 300 + Math.random() * (W - 600), TOP + 30 + Math.random() * (BOTTOM - TOP - 40), "citizen", "KREDDLER");
      if (i % 3 === 2) n.spr.setTint(NEON[i % NEON.length] | 0x808080);
    }
    // THE KREDDLE KRUNCHERS: the lads, but Kreddle
    KRUNCHERS.forEach((k, i) => {
      if (!this.textures.exists(`spr_${k.of}`)) return;
      const x = 2080 + (i % 5) * 80;
      const y = 560 + Math.floor(i / 5) * 70 + (i % 2) * 10;
      const n = add(`spr_${k.of}`, x, y, "kruncher", k.name, { of: k.of, jab: k.jab });
      n.spr.setTint(i % 2 ? 0xff9de6 : 0x9be7ff);
      n.spr.setData("facing", "west");
    });
    this.add.text(2240, 690, "THE KREDDLE KRUNCHERS", { fontFamily: "Impact, sans-serif", fontSize: "16px", color: "#ff4fd8", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(700);
    void s;
    void PLAYABLE_ORDER;
  }

  // ------------------------------------------------------------------ arriving and leaving

  private async arrive() {
    const s = G.s;
    s.flags.kreddle_visits = ((s.flags.kreddle_visits as number) ?? 0) + 1;
    if (s.flags.kreddle_seen) return;
    s.flags.kreddle_seen = true;
    const t = this.add.text(480, 200, "WELCOME TO\nKREDDLE", { fontFamily: "Impact, sans-serif", fontSize: "64px", color: "#ff4fd8", align: "center", stroke: "#12001f", strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(5000).setScale(0.2);
    t.setShadow(0, 0, "#ff4fd8", 24, true, true);
    synth.play("cheer");
    this.tweens.add({ targets: t, scale: 1, duration: 500, ease: "Back.out" });
    await this.wait(1800);
    this.tweens.add({ targets: t, alpha: 0, duration: 500, onComplete: () => t.destroy() });
    await this.talk([
      dir("You cross the bridge. Behind you: Krelford, in daylight, being normal. Ahead of you: Kreddle. It is night. It is always night in Kreddle."),
      dir("Every surface is a light. Every light is a sign. Every sign is asking for money."),
      dir("TIP: talk to the locals (E). Play the machines. Win things. And whatever you do, gamble at least once before you leave."),
    ]);
  }

  private async leave() {
    if (this.busy || this.panelRoot) return;
    const s = G.s;
    if (!this.gambled) {
      // the third rule of Kreddle
      const boss = this.npcs.find((n) => n.kind === "pitboss");
      if (boss) {
        this.busy = true;
        await new Promise<void>((r) => this.tweens.add({ targets: boss.spr, x: this.me.x + 50, y: this.me.y, duration: 500, onComplete: () => r() }));
        this.busy = false;
      }
      await this.talk([say("PIT BOSS", "Leaving? Without gambling?"), say("PIT BOSS", "That's the third rule. You must gamble. You did not gamble."), dir("You are arrested and lashed.")]);
      for (let i = 0; i < 3; i++) {
        synth.play("punch_big");
        this.cameras.main.flash(160, 220, 0, 0);
        this.cameras.main.shake(200, 0.012);
        const t = this.add.text(this.me.x, this.me.y - 60 - i * 18, "LASHED!", { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#ef4444", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(3000);
        this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 900, onComplete: () => t.destroy() });
        await this.wait(380);
      }
      const fine = Math.min(s.coins, 100);
      s.coins -= fine;
      s.hp = Math.max(1, s.hp - Math.round(maxHp(s) * 0.1));
      await this.talk([dir(`Three lashes. With a wet lanyard. It really stings. They also take ${fine} Krezzcoin for the lanyard.`), say("PIT BOSS", `Come back when you're ready to gamble, ${INSULT}.`)]);
    }
    this.busy = true;
    G.save();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Hub", { at: "KREDDLE_BRIDGE" }));
  }

  // ------------------------------------------------------------------ the loop

  update(time: number, delta: number) {
    const s = G.s;
    const dt = Math.min(delta, 50);
    this.coinText.setText(`💰 ${s.coins} Krezzcoin   🎟 ${krokens(s)} Krokens`);
    this.updateNpcs(time, dt);
    if (this.busy || this.panelRoot) {
      this.prompt.setVisible(false);
      animateWalker(this.me, 0, 0, false, time);
      return;
    }
    if (this.controls.pause() && time - this.closedAt > 500) {
      void this.leave();
      return;
    }
    const mv = this.controls.move();
    const sp = 230 * (dt / 1000);
    this.me.x = Phaser.Math.Clamp(this.me.x + mv.x * sp, 30, W - 30);
    this.me.y = Phaser.Math.Clamp(this.me.y + mv.y * sp, TOP, BOTTOM);
    this.me.setDepth(this.me.y);
    animateWalker(this.me, mv.x, mv.y, Math.hypot(mv.x, mv.y) > 0.1, time);
    // what's in reach
    let best: { label: string; use: () => void; d: number } | null = null;
    for (const sp2 of this.spots) {
      const d = Phaser.Math.Distance.Between(this.me.x, this.me.y, sp2.x, sp2.y);
      if (d < sp2.r && (!best || d < best.d)) best = { label: sp2.label(), use: sp2.use, d };
    }
    for (const n of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.me.x, this.me.y, n.spr.x, n.spr.y);
      if (d < 60 && (!best || d < best.d)) best = { label: `E: Talk to ${n.name}`, use: () => void this.talkTo(n), d };
    }
    if (best) {
      this.prompt.setText(best.label).setPosition(this.me.x, this.me.y - 56).setVisible(true);
      if (this.controls.interact()) best.use();
    } else {
      this.prompt.setVisible(false);
      this.controls.interact();
    }
  }

  private updateNpcs(time: number, dt: number) {
    for (const n of this.npcs) {
      const spr = n.spr;
      if (n.kind === "kruncher" || n.kind === "dealer" || n.kind === "pitboss") {
        // they stand about, swaying, facing you when you're near
        const near = Phaser.Math.Distance.Between(spr.x, spr.y, this.me.x, this.me.y) < 260;
        if (near) animateWalker(spr, this.me.x - spr.x, this.me.y - spr.y, false, time);
        spr.y = n.home.y + Math.sin(time / 400 + n.home.x) * 1.5;
        n.tag?.setPosition(spr.x, spr.y + 34);
        continue;
      }
      if (n.kind === "klerble") {
        spr.y = n.home.y - Math.abs(Math.sin(time / 260)) * 6;
        n.tag?.setPosition(spr.x, n.home.y + 34);
        if (Math.random() < 0.002 && !this.busy) this.bubble(spr, "YES! YES! YESSS!", "#ffd23f");
        continue;
      }
      // citizens wander, and now and then one comes over to shove you
      let speed = 70;
      if (n.charging) {
        n.target = { x: this.me.x, y: this.me.y };
        speed = 300;
        if (Phaser.Math.Distance.Between(spr.x, spr.y, this.me.x, this.me.y) < 38) this.shove(n);
      } else if (time > n.nextTurn || Phaser.Math.Distance.Between(spr.x, spr.y, n.target.x, n.target.y) < 8) {
        n.nextTurn = time + 2000 + Math.random() * 4000;
        n.target = { x: Phaser.Math.Clamp(spr.x + (Math.random() - 0.5) * 500, 200, W - 200), y: TOP + 20 + Math.random() * (BOTTOM - TOP - 30) };
      }
      const dx = n.target.x - spr.x;
      const dy = n.target.y - spr.y;
      const len = Math.hypot(dx, dy);
      if (len > 4) {
        spr.x += (dx / len) * speed * (dt / 1000);
        spr.y += (dy / len) * speed * (dt / 1000);
        spr.y = Phaser.Math.Clamp(spr.y, TOP, BOTTOM);
      }
      spr.setDepth(spr.y);
      animateWalker(spr, dx, dy, len > 4, time);
      // a little bounce in their step
      spr.setAngle(len > 4 ? Math.sin(time / 90 + n.home.x) * 4 : 0);
      n.tag?.setPosition(spr.x, spr.y + 34);
    }
    if (this.busy || this.panelRoot) return;
    // someone takes a run at you
    if (time > this.nextShove) {
      this.nextShove = time + 6000 + Math.random() * 7000;
      const cand = this.npcs.filter((n) => n.kind === "citizen" && !n.charging && Phaser.Math.Distance.Between(n.spr.x, n.spr.y, this.me.x, this.me.y) < 420);
      const n = cand[Math.floor(Math.random() * cand.length)];
      if (n) n.charging = true;
    }
    // the Krunchers heckle you when you're close
    if (time > this.nextTaunt && this.me.x > 1800) {
      this.nextTaunt = time + 3500 + Math.random() * 3000;
      const ks = this.npcs.filter((n) => n.kind === "kruncher");
      const k = ks[Math.floor(Math.random() * ks.length)];
      if (k) this.bubble(k.spr, Phaser.Utils.Array.GetRandom(["WE HATE YOU!", "KRUNCHERS RULE!", "Krelworld krew? More like Krelworld POO.", "Go home!", `${INSULT}!`, "Lame!", "Our chat has MORE reactions!"]), "#ffd1f3");
    }
  }

  private shove(n: Npc) {
    n.charging = false;
    n.nextTurn = 0;
    const s = G.s;
    const a = Math.atan2(this.me.y - n.spr.y, this.me.x - n.spr.x);
    synth.play("punch");
    this.cameras.main.shake(160, 0.006);
    this.tweens.add({ targets: this.me, x: Phaser.Math.Clamp(this.me.x + Math.cos(a) * 80, 30, W - 30), y: Phaser.Math.Clamp(this.me.y + Math.sin(a) * 60, TOP, BOTTOM), duration: 180, ease: "Quad.out" });
    this.bubble(n.spr, Phaser.Utils.Array.GetRandom(SHOVES), "#ffffff");
    if (s.coins >= 5 && Math.random() < 0.3) {
      s.coins -= 5;
      this.floatText(this.me.x, this.me.y - 50, "-5 KREZZCOIN (pickpocketed)", "#ef4444");
    }
  }

  // ------------------------------------------------------------------ people

  private async talkTo(n: Npc) {
    const s = G.s;
    n.charging = false;
    const lines: Line[] = [];
    if (n.kind === "citizen") {
      if (!s.flags.kreddle_welcomed) {
        s.flags.kreddle_welcomed = true;
        lines.push(...WELCOME_SPEECH);
      } else lines.push(...Phaser.Utils.Array.GetRandom(LOCAL_CHAT));
    } else if (n.kind === "kruncher") {
      lines.push(say(n.name, KRUNCHER_BOAST), say(n.name, n.jab ?? "We hate you!"));
      if (n.of === s.player) lines.push(dir(`${n.name} is you. A bit. The Kreddle version. They've got better shoes.`));
      else lines.push(dir(`${n.name} looks exactly like ${CHARACTERS[n.of as keyof typeof CHARACTERS]?.name ?? n.of}, if ${CHARACTERS[n.of as keyof typeof CHARACTERS]?.name ?? n.of} had been raised in a casino.`));
    } else if (n.kind === "pitboss") {
      lines.push(
        say("PIT BOSS", this.gambled ? "You've gambled. Good. You may leave whenever you like. Kreddle will miss your money." : "I'm watching you. You haven't gambled yet."),
        ...(this.gambled ? [] : [say("PIT BOSS", "Try to cross that bridge without gambling and you'll be arrested and lashed. Rule three.")]),
      );
    } else if (n.kind === "dealer") {
      lines.push(say("THE DEALER", "Kreddle Kards. Higher or lower. Three right and you win a prize. The House wins ties. The House wins most things."));
    } else if (n.kind === "klerble") {
      lines.push(
        ...(s.flags.arc_klerble_done
          ? [say("PRESIDENT KLERBLE", "YOU! The one who flew the plane into his OWN tower! YES! YES! In Kreddle you are a hero!"), say("PRESIDENT KLERBLE", `Still a ${INSULT}, though. Grrr!!`)]
          : [say("PRESIDENT KLERBLE", "I am President Klerble! Welcome to my glorious Kreddle!"), say("PRESIDENT KLERBLE", "I hate your universe and everyone in it! Have you tried the slots? YES!")]),
      );
    }
    await this.talk(lines);
  }

  // ------------------------------------------------------------------ the machines: shared

  private openPanel(title: string, color: string) {
    this.busy = true;
    const root = this.add.container(0, 0).setDepth(5000);
    this.panelRoot = root;
    root.add(this.add.rectangle(480, 270, 960, 540, 0x05010c, 0.78).setInteractive());
    const frame = this.add.rectangle(480, 270, 760, 470, 0x16072b, 0.97).setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(color).color);
    root.add(frame);
    // the PixelLab window frame, tinted to the machine's neon
    const art = uiFrame(this, 480, 270, 760, 470, "ui_panel");
    if (art) {
      frame.setFillStyle(0x16072b, 0.6).setStrokeStyle(0);
      root.add(art.setTint(Phaser.Display.Color.HexStringToColor(color).color | 0x404040));
    }
    const t = this.add.text(480, 58, title, { fontFamily: "Impact, sans-serif", fontSize: "34px", color, stroke: "#12001f", strokeThickness: 6 }).setOrigin(0.5);
    t.setShadow(0, 0, color, 14, true, true);
    root.add(t);
    const coins = this.add.text(850, 80, "", { fontFamily: FONT, fontSize: "14px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(1, 0.5);
    root.add(coins);
    const upd = () => coins.setText(`💰 ${G.s.coins}   🎟 ${krokens(G.s)}`);
    this.panelTick = this.time.addEvent({ delay: 100, loop: true, callback: upd });
    upd();
    this.pin(root);
    return root;
  }

  private add2<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.panelRoot?.add(o);
    this.pin(o);
    return o;
  }

  /** Fix something (and everything inside it) to the screen, for drawing AND for taps. */
  private pin(o: Phaser.GameObjects.GameObject) {
    (o as unknown as { setScrollFactor?: (x: number, y?: number) => void }).setScrollFactor?.(0, 0);
    if (o instanceof Phaser.GameObjects.Container) for (const c of o.list) this.pin(c);
  }

  private btn(x: number, y: number, label: string, fn: () => void, w = 170, color?: number, h = 40) {
    const b = button(this, x, y, label, fn, { w, h, size: 15, color });
    this.panelRoot?.add(b);
    this.pin(b);
    return b;
  }

  private key(name: string, fn: () => void) {
    const k = `keydown-${name}`;
    this.input.keyboard?.on(k, fn);
    this.panelKeys.push([k, fn]);
  }

  private closePanel() {
    for (const [k, fn] of this.panelKeys) this.input.keyboard?.off(k, fn);
    this.panelKeys = [];
    this.panelTick?.remove();
    this.panelTick = null;
    this.panelRoot?.destroy(true);
    this.panelRoot = null;
    this.busy = false;
    this.closedAt = this.time.now;
    this.controls.swallow();
  }

  /** Take the stake. False (and a sneer) if you can't afford it. */
  private pay(cost: number, info: Phaser.GameObjects.Text) {
    const s = G.s;
    if (s.coins < cost) {
      info.setText(`You need ${cost} Krezzcoin. You have ${s.coins}. The House laughs at you.`).setColor("#ef4444");
      synth.play("tap_fail");
      return false;
    }
    s.coins -= cost;
    this.gambled = true;
    s.flags.kreddle_gambles = ((s.flags.kreddle_gambles as number) ?? 0) + 1;
    synth.play("coin");
    return true;
  }

  /** The big reveal. Resolves when you dismiss it. */
  private showPrize(id: string) {
    return new Promise<void>((resolve) => {
      const s = G.s;
      const p = PRIZE[id];
      const text = awardPrize(s, id);
      G.save();
      synth.play("cheer");
      synth.play("perfect");
      this.cameras.main.flash(250, 255, 120, 220);
      const root = this.add.container(0, 0).setDepth(7000);
      root.add(this.add.rectangle(480, 270, 960, 540, 0x000000, 0.6).setInteractive());
      const card = this.add.rectangle(480, 270, 560, 300, 0x2e1065, 1).setStrokeStyle(5, 0xfacc15);
      root.add(card);
      const head = this.add.text(480, 150, "★ YOU WON ★", { fontFamily: "Impact, sans-serif", fontSize: "38px", color: "#facc15", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5);
      head.setShadow(0, 0, "#facc15", 16, true, true);
      const icon = this.add.text(480, 222, p.icon, { fontSize: "64px" }).setOrigin(0.5);
      const name = this.add.text(480, 290, p.name, { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#ff4fd8", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5);
      const desc = this.add.text(480, 345, text.replace(`${p.name}: `, "").replace(/^\(level[^)]*\): /, ""), { fontFamily: FONT, fontSize: "14px", color: "#ffffff", align: "center", wordWrap: { width: 500 } }).setOrigin(0.5);
      const hint = this.add.text(480, 405, "SPACE / tap to collect", { fontFamily: FONT, fontSize: "12px", color: "#c4b5fd" }).setOrigin(0.5);
      root.add([head, icon, name, desc, hint]);
      // drawn confetti (PixelLab VFX), the rectangles are the fallback
      const conf = [0, 1, 2].map((i) => vfx(this, "vfx_confetti", 300 + i * 180, 300, { scale: 2.4, fixed: true, depth: 7000, delay: i * 160 })).filter((c): c is Phaser.GameObjects.Sprite => !!c);
      for (let i = 0; i < (conf.length ? 0 : 40); i++) {
        const c = this.add.rectangle(480, 270, 6, 10, NEON[i % NEON.length]);
        root.add(c);
        this.tweens.add({ targets: c, x: 480 + (Math.random() - 0.5) * 900, y: 270 + (Math.random() - 0.7) * 600, angle: Math.random() * 720, alpha: 0, duration: 1400 + Math.random() * 800 });
      }
      this.tweens.add({ targets: icon, scale: { from: 0.3, to: 1 }, duration: 400, ease: "Back.out" });
      this.pin(root);
      let done = false;
      const close = () => {
        if (done) return;
        done = true;
        this.input.keyboard?.off("keydown-SPACE", close);
        this.input.keyboard?.off("keydown-E", close);
        root.destroy(true);
        resolve();
      };
      this.time.delayedCall(500, () => {
        this.input.keyboard?.on("keydown-SPACE", close);
        this.input.keyboard?.on("keydown-E", close);
        (root.list[0] as Phaser.GameObjects.Rectangle).on("pointerdown", close);
      });
    });
  }


  // ------------------------------------------------------------------ KRAZY REELS (slots)

  private slots() {
    const COST = 150;
    const SYM = ["🍒", "🔔", "💎", "7️⃣", "🎲", "⭐"];
    this.openPanel("KRAZY REELS", "#facc15");
    const reels = [0, 1, 2].map((i) => {
      this.add2(this.add.rectangle(330 + i * 150, 230, 120, 130, 0xfff7e6).setStrokeStyle(5, 0xb45309));
      return this.add2(this.add.text(330 + i * 150, 230, SYM[i], { fontSize: "70px" }).setOrigin(0.5));
    });
    this.add2(this.add.text(480, 120, "Three of a kind wins a PRIZE. Two of a kind gets you 100 back. Three 7s: TWO PRIZES.", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5));
    const info = this.add2(this.add.text(480, 340, `${COST} Krezzcoin a spin. SPACE or SPIN.`, { fontFamily: FONT, fontSize: "15px", color: "#facc15", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5));
    let spinning = false;
    const spin = () => {
      if (spinning || !this.panelRoot) return;
      if (!this.pay(COST, info)) return;
      spinning = true;
      info.setText("Spinning…").setColor("#ffffff");
      const r = Math.random();
      let out: number[];
      if (r < 0.03) out = [3, 3, 3];
      else if (r < 0.15) {
        const k = Phaser.Math.Between(0, SYM.length - 1);
        out = [k, k, k];
      } else if (r < 0.5) {
        const k = Phaser.Math.Between(0, SYM.length - 1);
        const o = (k + Phaser.Math.Between(1, SYM.length - 1)) % SYM.length;
        out = Phaser.Utils.Array.Shuffle([k, k, o]);
      } else {
        out = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
      }
      // nothing is as it seems: sometimes the last reel lands on the match… and nudges off
      const tease = out[0] === out[1] && out[1] !== out[2] && Math.random() < 0.4;
      const tick = this.time.addEvent({ delay: 60, loop: true, callback: () => reels.forEach((t, i) => t.getData("stop") || t.setText(SYM[Phaser.Math.Between(0, SYM.length - 1)])) });
      reels.forEach((t) => t.setData("stop", false));
      synth.play("slot_spin");
      [700, 1100, 1550].forEach((ms, i) =>
        this.time.delayedCall(ms, () => {
          if (!this.panelRoot) return;
          reels[i].setData("stop", true).setText(SYM[tease && i === 2 ? out[0] : out[i]]);
          synth.play("ding");
          if (i < 2) return;
          tick.remove();
          const finish = async () => {
            spinning = false;
            const [a, b, c] = out;
            if (a === b && b === c) {
              info.setText(a === 3 ? "THREE 7s! JACKPOT!" : "THREE OF A KIND!").setColor("#4ade80");
              synth.play("jackpot");
              vfx(this, "vfx_coins", 480, 260, { scale: 2.2, fixed: true, depth: 7000 });
              this.kroken(5);
              await this.showPrize(rollPrize(G.s).id);
              if (a === 3) await this.showPrize(rollPrize(G.s).id);
            } else if (a === b || b === c || a === c) {
              G.s.coins += 50;
              this.kroken(2);
              info.setText("Two of a kind: 50 back and 2 Krokens. The House is generous. Briefly.").setColor("#facc15");
            } else {
              info.setText(Phaser.Utils.Array.GetRandom(["Nothing. The House thanks you.", "Lose. Again?", "So close. (It wasn't close.)", "The machine winks at you."])).setColor("#ef4444");
              synth.play("tap_fail");
            }
          };
          if (tease) {
            info.setText("…!!").setColor("#4ade80");
            this.time.delayedCall(650, () => {
              if (!this.panelRoot) return;
              reels[2].setText(SYM[out[2]]);
              synth.play("trombone");
              info.setText("NUDGE. Nothing in Kreddle is as it seems.").setColor("#ef4444");
              this.time.delayedCall(700, () => {
                spinning = false;
                G.s.coins += 50;
                this.kroken(2);
                info.setText("…two of a kind, though. 50 back and 2 Krokens.").setColor("#facc15");
              });
            });
          } else void finish();
        }),
      );
    };
    this.btn(380, 440, `SPIN (${COST})`, spin, 170, 0x7c2d12);
    this.btn(580, 440, "WALK AWAY", () => !spinning && this.closePanel(), 170);
    this.key("SPACE", spin);
    this.key("ESC", () => !spinning && this.closePanel());
  }

  // ------------------------------------------------------------------ THE KLAW

  private claw() {
    const COST = 200;
    this.openPanel("THE KLAW", "#22d3ee");
    const L = 230;
    const R = 730;
    this.add2(this.add.rectangle(480, 270, R - L + 20, 300, 0x0e2a3a, 0.9).setStrokeStyle(4, 0xff4fd8));
    this.add2(this.add.rectangle(L + 40, 395, 70, 40, 0x000000).setStrokeStyle(2, 0xfacc15));
    this.add2(this.add.text(L + 40, 395, "CHUTE", { fontFamily: FONT, fontSize: "11px", color: "#facc15" }).setOrigin(0.5));
    const info = this.add2(this.add.text(480, 445, `${COST} Krezzcoin a go. SPACE / DROP to drop the claw. Pick your prize.`, { fontFamily: FONT, fontSize: "14px", color: "#22d3ee", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5));
    // the capsules, each showing what's inside
    const used = new Set<string>();
    const caps = [0, 1, 2, 3, 4].map((i) => {
      let p = rollPrize(G.s);
      for (let k = 0; k < 6 && used.has(p.id); k++) p = rollPrize(G.s);
      used.add(p.id);
      const x = L + 150 + i * 80;
      const ball = this.add2(this.add.circle(x, 385, 26, NEON[i % NEON.length], 0.85).setStrokeStyle(3, 0xffffff));
      const icon = this.add2(this.add.text(x, 385, p.icon, { fontSize: "26px" }).setOrigin(0.5));
      return { x, y: 385, ball, icon, prize: p.id, taken: false };
    });
    const hover = this.add2(this.add.text(480, 115, "", { fontFamily: FONT, fontSize: "14px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5));
    const rope = this.add2(this.add.graphics());
    const head = this.add2(this.add.text(L + 60, 160, "🪝", { fontSize: "34px" }).setOrigin(0.5, 0));
    let state: "idle" | "swing" | "drop" = "swing";
    let t0 = this.time.now;
    let clawX = L + 60;
    let clawY = 160;
    let holding: (typeof caps)[number] | null = null;
    let paid = false;
    const loop = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!this.panelRoot) return loop.remove();
      if (state === "swing") clawX = L + 110 + ((Math.sin((this.time.now - t0) / 700) + 1) / 2) * (R - L - 160);
      head.setPosition(clawX, clawY);
      rope.clear().lineStyle(3, 0xd1d5db, 1).lineBetween(clawX, 130, clawX, clawY + 4);
      if (holding) holding.ball.setPosition(clawX, clawY + 48), holding.icon.setPosition(clawX, clawY + 48);
      const under = caps.find((c) => !c.taken && Math.abs(c.x - clawX) < 30);
      hover.setText(under ? `${PRIZE[under.prize].icon} ${PRIZE[under.prize].name}` : "");
    } });
    const tween = (cfg: { y?: number; x?: number; duration: number }) =>
      new Promise<void>((res) => {
        const o = { x: clawX, y: clawY };
        this.tweens.add({ targets: o, ...cfg, onUpdate: () => ((clawX = o.x), (clawY = o.y)), onComplete: () => res() });
      });
    const drop = async () => {
      if (state !== "swing" || !this.panelRoot) return;
      if (!paid) {
        if (!this.pay(COST, info)) return;
        paid = true;
      }
      state = "drop";
      info.setText("The Klaw descends…").setColor("#ffffff");
      await tween({ y: 320, duration: 650 });
      const target = caps.find((c) => !c.taken && Math.abs(c.x - clawX) < 30);
      synth.play("pop");
      if (target) holding = target;
      await tween({ y: 160, duration: 650 });
      if (!this.panelRoot) return;
      if (!holding) {
        this.kroken(1);
        info.setText("Nothing. THE KLAW SAYS NO. (Have a pity Kroken.)").setColor("#ef4444");
        synth.play("tap_fail");
      } else {
        // the Klaw has feelings, and the feeling is usually no
        const slips = Math.random() < 0.6;
        if (slips) {
          await tween({ x: (clawX + L + 40) / 2, duration: 500 });
          const h = holding;
          holding = null;
          synth.play("trombone");
          this.tweens.add({ targets: [h.ball, h.icon], y: 385, duration: 450, ease: "Bounce.out" });
          h.ball.x = h.icon.x = clawX;
          h.x = clawX;
          this.kroken(3);
          info.setText("It slipped! THE KLAW GIVETH AND THE KLAW TAKETH AWAY. (3 Krokens for trying.)").setColor("#ef4444");
        } else {
          await tween({ x: L + 40, duration: 700 });
          const h = holding;
          holding = null;
          h.taken = true;
          this.tweens.add({ targets: [h.ball, h.icon], y: 420, alpha: 0, duration: 300 });
          info.setText("IT'S IN THE CHUTE!").setColor("#4ade80");
          await this.wait(300);
          await this.showPrize(h.prize);
        }
      }
      paid = false;
      t0 = this.time.now - 700 * Math.asin(Phaser.Math.Clamp(((clawX - L - 110) / (R - L - 160)) * 2 - 1, -1, 1));
      state = "swing";
      if (this.panelRoot) info.setText(`${COST} Krezzcoin a go. SPACE / DROP to drop the claw.`).setColor("#22d3ee");
    };
    this.btn(380, 495, `DROP (${COST})`, () => void drop(), 170, 0x0e7490);
    this.btn(580, 495, "WALK AWAY", () => state === "swing" && this.closePanel(), 170);
    this.key("SPACE", () => void drop());
    this.key("ESC", () => state === "swing" && this.closePanel());
    void state;
  }

  // ------------------------------------------------------------------ WHEEL OF KREDDLE

  private wheel() {
    const COST = 300;
    this.openPanel("WHEEL OF KREDDLE", "#a855f7");
    const SEG = ["PRIZE", "BUST", "MONEY BACK", "10 KROKENS", "LASHED", "DOUBLE PRIZE", "BUST", "PRIZE", "6 KROKENS", "KRELWORLD TAX"];
    const COL = [0x22c55e, 0x374151, 0xfacc15, 0x0ea5e9, 0xdc2626, 0xff4fd8, 0x374151, 0xa855f7, 0x14b8a6, 0x7f1d1d];
    const R = 150;
    const cx = 480;
    const cy = 260;
    const wheel = this.add.container(cx, cy);
    const g = this.add.graphics();
    const seg = (Math.PI * 2) / SEG.length;
    SEG.forEach((_, i) => {
      g.fillStyle(COL[i], 1).slice(0, 0, R, i * seg, (i + 1) * seg, false).fillPath();
      g.lineStyle(2, 0xffffff, 0.8).slice(0, 0, R, i * seg, (i + 1) * seg, false).strokePath();
    });
    wheel.add(g);
    SEG.forEach((t, i) => {
      const a = (i + 0.5) * seg;
      wheel.add(this.add.text(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, t, { fontFamily: "Impact, sans-serif", fontSize: "13px", color: "#ffffff", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setRotation(a));
    });
    wheel.add(this.add.circle(0, 0, 16, 0xfacc15).setStrokeStyle(3, 0x000000));
    this.add2(this.add.circle(cx, cy, R + 8, 0xfacc15).setStrokeStyle(4, 0x7c2d12));
    this.add2(wheel);
    this.pin(wheel);
    this.add2(this.add.triangle(cx, cy - R - 14, -14, -16, 14, -16, 0, 12, 0xffffff).setStrokeStyle(2, 0x000000));
    const info = this.add2(this.add.text(480, 438, `${COST} Krezzcoin a spin. SPACE or SPIN.`, { fontFamily: FONT, fontSize: "15px", color: "#c4b5fd", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5));
    let vel = 0;
    let spinning = false;
    const loop = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!this.panelRoot) return loop.remove();
      if (!spinning) return;
      wheel.rotation += vel * 0.016;
      vel *= 0.985;
      if (vel < 0.25) {
        spinning = false;
        vel = 0;
        // which segment is under the pointer at the top?
        const local = Phaser.Math.Angle.Wrap(-Math.PI / 2 - wheel.rotation);
        const idx = Math.floor(((local + Math.PI * 2) % (Math.PI * 2)) / seg);
        void land(SEG[idx]);
      }
    } });
    let lastTick = 0;
    this.time.addEvent({ delay: 30, loop: true, callback: () => {
      if (!spinning) return;
      const k = Math.floor(wheel.rotation / seg);
      if (k !== lastTick) {
        lastTick = k;
        synth.play("select");
      }
    } });
    const land = async (r: string) => {
      const s = G.s;
      info.setColor("#ffffff");
      switch (r) {
        case "PRIZE":
          info.setText("PRIZE!").setColor("#4ade80");
          await this.showPrize(rollPrize(s).id);
          break;
        case "DOUBLE PRIZE":
          info.setText("DOUBLE PRIZE!!").setColor("#ff4fd8");
          await this.showPrize(rollPrize(s).id);
          await this.showPrize(rollPrize(s).id);
          break;
        case "10 KROKENS":
        case "6 KROKENS": {
          const n = r.startsWith("10") ? 10 : 6;
          this.kroken(n);
          info.setText(`${n} KROKENS! Spend them at the Prize Counter.`).setColor("#38bdf8");
          break;
        }
        case "MONEY BACK":
          s.coins += COST;
          info.setText("Money back. The wheel giveth. Slightly.").setColor("#facc15");
          break;
        case "BUST":
          info.setText("BUST. The House thanks you for your donation.").setColor("#ef4444");
          synth.play("tap_fail");
          break;
        case "LASHED": {
          const fine = Math.min(s.coins, 100);
          s.coins -= fine;
          this.cameras.main.flash(200, 220, 0, 0);
          synth.play("punch_big");
          info.setText(`LASHED! (And another ${fine} for the lanyard.)`).setColor("#ef4444");
          break;
        }
        case "KRELWORLD TAX": {
          const fine = Math.min(s.coins, 150);
          s.coins -= fine;
          synth.play("trombone");
          info.setText(`KRELWORLD TAX. ${INSULT}s pay extra. -${fine}.`).setColor("#ef4444");
          break;
        }
      }
    };
    const spin = () => {
      if (spinning || !this.panelRoot) return;
      if (!this.pay(COST, info)) return;
      info.setText("Round and round…").setColor("#ffffff");
      vel = 11 + Math.random() * 9;
      spinning = true;
    };
    this.btn(380, 490, `SPIN (${COST})`, spin, 170, 0x6b21a8);
    this.btn(580, 490, "WALK AWAY", () => !spinning && this.closePanel(), 170);
    this.key("SPACE", spin);
    this.key("ESC", () => !spinning && this.closePanel());
  }

  // ------------------------------------------------------------------ KREDDLE KARDS (higher or lower)

  private cards() {
    const COST = 100;
    this.openPanel("KREDDLE KARDS", "#4ade80");
    const RANK = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const SUIT = ["♠", "♥", "♦", "♣"];
    if (this.textures.exists("spr_KD_PITBOSS")) this.add2(this.add.sprite(220, 260, "spr_KD_PITBOSS", 0).setScale(3).setTint(0xffe27a));
    this.add2(this.add.text(220, 340, "THE DEALER", { fontFamily: FONT, fontSize: "11px", color: "#facc15" }).setOrigin(0.5));
    const cardBg = this.add2(this.add.rectangle(480, 250, 130, 180, 0xffffff).setStrokeStyle(4, 0x111111));
    const cardTxt = this.add2(this.add.text(480, 250, "?", { fontFamily: "Georgia, serif", fontSize: "54px", color: "#111111", fontStyle: "bold", align: "center" }).setOrigin(0.5));
    const streakTxt = this.add2(this.add.text(700, 200, "", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#4ade80", align: "center" }).setOrigin(0.5));
    const info = this.add2(this.add.text(480, 380, `Deal for ${COST}. Guess HIGHER or LOWER. Every right guess wins a Kroken. Three right wins a PRIZE. Two right? Cash out for 150. The House wins ties.`, { fontFamily: FONT, fontSize: "14px", color: "#ffffff", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5));
    let card = -1;
    let streak = 0;
    let live = false;
    const show = (n: number) => {
      const suit = SUIT[Phaser.Math.Between(0, 3)];
      cardTxt.setText(`${RANK[n]}\n${suit}`).setColor(suit === "♥" || suit === "♦" ? "#dc2626" : "#111111").setFontSize(44);
      this.tweens.add({ targets: [cardBg, cardTxt], scaleX: { from: 0, to: 1 }, duration: 160 });
      synth.play("pop");
    };
    const deal = () => {
      if (live || !this.panelRoot) return;
      if (!this.pay(COST, info)) return;
      live = true;
      streak = 0;
      card = Phaser.Math.Between(0, 12);
      show(card);
      streakTxt.setText("0 / 3");
      info.setText("Higher or lower? (↑ / ↓)").setColor("#ffffff");
    };
    const guess = async (up: boolean) => {
      if (!live || !this.panelRoot) return;
      const next = Phaser.Math.Between(0, 12);
      show(next);
      const right = up ? next > card : next < card;
      const tie = next === card;
      card = next;
      if (!right) {
        live = false;
        streakTxt.setText("");
        info.setText(tie ? "A tie. The House wins ties. Deal again?" : "Wrong. The Dealer smiles. Deal again?").setColor("#ef4444");
        synth.play("tap_fail");
        return;
      }
      streak++;
      this.kroken(1);
      streakTxt.setText(`${streak} / 3`);
      synth.play("ding");
      if (streak >= 3) {
        live = false;
        info.setText("THREE IN A ROW!").setColor("#4ade80");
        await this.showPrize(rollPrize(G.s).id);
        if (this.panelRoot) info.setText(`Deal again for ${COST}?`).setColor("#ffffff");
      } else info.setText(streak === 2 ? "Two right! Keep going, or CASH OUT for 150." : "Right! Again: higher or lower?").setColor("#4ade80");
    };
    const cashOut = () => {
      if (!live || streak < 2) return;
      live = false;
      G.s.coins += 150;
      synth.play("coin");
      info.setText("Cashed out: +150. Coward. Deal again?").setColor("#facc15");
      streakTxt.setText("");
    };
    this.btn(250, 480, `DEAL (${COST})`, deal, 130, 0x166534);
    this.btn(390, 480, "▲ HIGHER", () => void guess(true), 130);
    this.btn(530, 480, "▼ LOWER", () => void guess(false), 130);
    this.btn(670, 480, "CASH OUT", cashOut, 120);
    this.btn(800, 480, "LEAVE", () => !live && this.closePanel(), 100);
    this.key("SPACE", deal);
    this.key("UP", () => void guess(true));
    this.key("DOWN", () => void guess(false));
    this.key("W", () => void guess(true));
    this.key("S", () => void guess(false));
    this.key("ESC", () => !live && this.closePanel());
  }

  // ------------------------------------------------------------------ the Prize Counter

  private prizeCounter(sel = 0) {
    const s = G.s;
    this.openPanel("PRIZE COUNTER", "#facc15");
    this.add2(this.add.text(480, 92, `🎟 ${krokens(s)} KROKENS · win them at the machines, spend them here`, { fontFamily: FONT, fontSize: "14px", color: "#38bdf8", fontStyle: "bold" }).setOrigin(0.5));
    const info = this.add2(this.add.text(480, 418, "Pick a prize. (Click it, or arrows + SPACE.)", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", align: "center", wordWrap: { width: 680 } }).setOrigin(0.5));
    const rows = PRIZES.map((p, i) => {
      const price = krokenPrice(s, p);
      const open = prizeOpen(s, p);
      const lvl = p.key && (p.max ?? 1) > 1 ? ` ${kd(s, p.key)}/${p.max}` : "";
      const owned = p.gun ? !!s.guns && p.gun in s.guns : kd(s, p.key!) > 0;
      const text = `${p.icon} ${p.name}${lvl}  ·  ${open ? `${price} 🎟${p.gun && owned ? " (refill)" : ""}` : "MAXED"}`;
      const x = 245 + (i % 3) * 235;
      const y = 128 + Math.floor(i / 3) * 39;
      const b = this.btn(x, y, text, () => void buy(i), 228, !open ? 0x1f1f2e : krokens(s) >= price ? 0x3b0764 : 0x27213a);
      (b as unknown as { label: Phaser.GameObjects.Text }).label.setFontSize(11);
      (b as unknown as { bg: Phaser.GameObjects.Rectangle }).bg.setSize(228, 34);
      return { p, b, price, open };
    });
    let cur = Math.min(sel, rows.length - 1);
    const mark = this.add2(this.add.rectangle(0, 0, 234, 38).setStrokeStyle(3, 0xfacc15).setFillStyle(0, 0));
    const focus = () => {
      const r = rows[cur];
      mark.setPosition(r.b.x, r.b.y);
      info.setText(`${r.p.icon} ${r.p.name}: ${r.p.desc}`).setColor("#ffffff");
    };
    focus();
    let buying = false;
    const buy = async (i: number) => {
      if (buying || !this.panelRoot) return;
      cur = i;
      focus();
      const r = rows[i];
      if (!r.open) {
        info.setText(`${r.p.name}: you've maxed it out.`).setColor("#ef4444");
        return;
      }
      if (krokens(G.s) < r.price) {
        info.setText(`${r.p.name} costs ${r.price} Krokens. You have ${krokens(G.s)}. Go and gamble.`).setColor("#ef4444");
        synth.play("tap_fail");
        return;
      }
      buying = true;
      addKrokens(G.s, -r.price);
      await this.showPrize(r.p.id);
      this.closePanel();
      this.prizeCounter(i);
    };
    if (true) {
      this.btn(250, 470, `GORE: ${G.meta.settings.gore === false ? "OFF" : "ON"}`, () => {
        G.meta.settings.gore = G.meta.settings.gore === false;
        G.saveMeta();
        G.save();
        this.closePanel();
        this.prizeCounter(cur);
      }, 240, G.meta.settings.gore === false ? 0x27213a : 0x7f1d1d);
    }
    this.btn(true ? 560 : 400, 470, "💰 KREZZCOIN COUNTER →", () => {
      if (buying) return;
      this.closePanel();
      this.krezzcoinCounter();
    }, 220, 0x166534);
    this.btn(true ? 760 : 620, 470, "LEAVE", () => !buying && this.closePanel(), 140);
    const move = (d: number) => {
      cur = (cur + d + rows.length) % rows.length;
      focus();
    };
    this.key("LEFT", () => move(-1));
    this.key("RIGHT", () => move(1));
    this.key("UP", () => move(-3));
    this.key("DOWN", () => move(3));
    this.key("SPACE", () => void buy(cur));
    this.key("ESC", () => !buying && this.closePanel());
  }

  /** THE KREDDLE EXCHANGE: Krokens buy prizes, Krezzcoin buys upgrades, guns, perks and lads. */
  private exchange() {
    this.openPanel("THE KREDDLE EXCHANGE", "#facc15");
    this.add2(this.add.text(480, 120, "Kreddle took over the Central Bank of Krelworld. It was a very short negotiation.", { fontFamily: FONT, fontSize: "13px", color: "#c4b5fd", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5));
    this.btn(480, 190, `🎟  PRIZE COUNTER\nSpend Krokens (you have ${krokens(G.s)}) on Kreddle prizes`, () => {
      this.closePanel();
      this.prizeCounter();
    }, 540, 0x3b0764, 66);
    this.btn(480, 275, `💰  KREZZCOIN COUNTER\nSpend Krezzcoin (you have ${G.s.coins}) on upgrades, guns, ammo, perks and lads`, () => {
      this.closePanel();
      this.krezzcoinCounter();
    }, 540, 0x14532d, 66);
    this.btn(480, 360, `🏠  HOME FURNISHINGS\nSpend Krokens on things for your flat (they turn up at home)`, () => {
      this.closePanel();
      this.furnishings();
    }, 540, 0x7c2d12, 66);
    this.btn(480, 450, "LEAVE", () => this.closePanel(), 160);
    this.key("ESC", () => this.closePanel());
    this.key("ONE", () => (this.closePanel(), this.prizeCounter()));
    this.key("TWO", () => (this.closePanel(), this.krezzcoinCounter()));
    this.key("THREE", () => (this.closePanel(), this.furnishings()));
  }

  /** HOME FURNISHINGS: Kreddle tat for your flat. */
  private furnishings(sel = 0) {
    const s = G.s;
    this.openPanel("HOME FURNISHINGS", "#fb923c");
    this.add2(this.add.text(480, 92, `🎟 ${krokens(s)} KROKENS · everything is delivered to your flat, immediately, by a man called Kev`, { fontFamily: FONT, fontSize: "13px", color: "#38bdf8", fontStyle: "bold" }).setOrigin(0.5));
    const info = this.add2(this.add.text(480, 400, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", align: "center", wordWrap: { width: 680 } }).setOrigin(0.5));
    const rows = DECOR.map((d, i) => {
      const owned = (s.upgrades[`home_${d.id}`] ?? 0) > 0;
      const x = 330 + (i % 2) * 300;
      const y = 140 + Math.floor(i / 2) * 50;
      const b = this.btn(x, y, `${d.icon} ${d.name}  ·  ${owned ? "IN YOUR FLAT" : `${d.price} 🎟`}`, () => void buy(i), 288, owned ? 0x1f1f2e : krokens(s) >= d.price ? 0x7c2d12 : 0x27213a);
      (b as unknown as { label: Phaser.GameObjects.Text }).label.setFontSize(12);
      (b as unknown as { bg: Phaser.GameObjects.Rectangle }).bg.setSize(288, 42);
      return { d, b, owned };
    });
    let cur = Math.min(sel, rows.length - 1);
    const mark = this.add2(this.add.rectangle(0, 0, 294, 46).setStrokeStyle(3, 0xfb923c).setFillStyle(0, 0));
    const focus = () => {
      const r = rows[cur];
      mark.setPosition(r.b.x, r.b.y);
      info.setText(`${r.d.icon} ${r.d.name}: ${r.d.desc}`).setColor("#ffffff");
    };
    focus();
    const buy = (i: number) => {
      if (!this.panelRoot) return;
      cur = i;
      focus();
      const r = rows[i];
      if (r.owned) {
        info.setText(`${r.d.name}: it's already in your flat.`).setColor("#facc15");
        return;
      }
      if (krokens(G.s) < r.d.price) {
        info.setText(`${r.d.name} costs ${r.d.price} Krokens. You have ${krokens(G.s)}. Go and gamble.`).setColor("#ef4444");
        synth.play("tap_fail");
        return;
      }
      addKrokens(G.s, -r.d.price);
      G.s.upgrades[`home_${r.d.id}`] = 1;
      G.save();
      synth.play("cheer");
      this.closePanel();
      this.furnishings(i);
    };
    this.btn(480, 470, "LEAVE", () => this.closePanel(), 140);
    const move = (d: number) => {
      cur = (cur + d + rows.length) % rows.length;
      focus();
    };
    this.key("LEFT", () => move(-1));
    this.key("RIGHT", () => move(1));
    this.key("UP", () => move(-2));
    this.key("DOWN", () => move(2));
    this.key("SPACE", () => buy(cur));
    this.key("ESC", () => this.closePanel());
  }

  /** The old bank menu, now Kreddle's. */
  private krezzcoinCounter() {
    this.busy = true;
    this.scene.launch("Menu", { mode: "bank", caller: "Kreddle" });
    this.scene.pause();
  }

  /** Krokens! A little ticket pops out. */
  private kroken(n: number) {
    addKrokens(G.s, n);
    synth.play("ding");
    const t = this.add.text(480, 300, `+${n} 🎟 KROKEN${n > 1 ? "S" : ""}`, { fontFamily: "Impact, sans-serif", fontSize: "28px", color: "#38bdf8", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setScrollFactor(0).setDepth(6500);
    this.tweens.add({ targets: t, y: 250, alpha: 0, duration: 1300, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------ helpers

  private async talk(lines: Line[]) {
    this.busy = true;
    await this.box.play(lines);
    this.controls.swallow();
    this.busy = false;
  }

  private wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, () => r()));
  }

  private bubble(spr: Phaser.GameObjects.Sprite, text: string, bg = "#ffffff") {
    const t = this.add.text(spr.x, spr.y - 46, text, { fontFamily: FONT, fontSize: "11px", color: "#050505", backgroundColor: bg, padding: { x: 5, y: 3 }, wordWrap: { width: 190 }, align: "center" }).setOrigin(0.5, 1).setDepth(2500);
    this.tweens.add({ targets: t, y: t.y - 10, duration: 1800 });
    this.time.delayedCall(1800, () => t.destroy());
  }

  private floatText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: "13px", color, fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(2600);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 1300, onComplete: () => t.destroy() });
  }
}
