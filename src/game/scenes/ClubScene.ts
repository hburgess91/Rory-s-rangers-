import Phaser from "phaser";
import { addWrist, wristLook, type Wrist } from "../gfx/Wrist";
import { randomZone, flap, fall, OVER, type WonkZone } from "../combat/Wonk";
import { G } from "../G";
import { Controls } from "../combat/Controls";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, title } from "../ui/theme";
import { dir, say } from "../../content/dsl";
import { animateWalker, backdrop } from "../gfx/HD";
import { bump, maxBottles } from "../systems/stats";
import { CHARACTERS, PLAYABLE_ORDER } from "../../data/characters";
import { TOUCH } from "../ui/TouchControls";
import { SANMIK_SONGS } from "./VenueScene";

/**
 * THE WONKY POLE: a cabaret club. Dancers dance (costumes on), the lads leer, and you can call a
 * WONK-OFF. The dancer goes on her break, everyone competes behind a very large censor bar,
 * everyone krezzes, and Big Derek throws you all out.
 */

const DANCERS = [
  { id: "DESTINY", tex: "spr_TV_DANCER1" },
  { id: "CRYSTAL", tex: "spr_TV_DANCER2" },
];

const LEER = [
  "I'm horny!",
  "I'm turned on.",
  "My thang is getting much more solid!",
  "I want to wonk!",
  "I want to wonk. Can we wonk?",
  "Mmm… her breasts are so filled with milk.",
  "Ugh… her fanny is so filled with lust.",
  "Mmm.", "Mmmmmm.", "Mmmmmmmmmm.", "She's mine.", "She's MINE.", "She looked at me. She's mine.", "Back off. Mine.", "Mmm. Yes.", "I think she likes me.", "She's mine, lads. Sorry.", "She winked at me. That's legally binding.", "Mine. Mine mine mine."];
const LEER_BY: Record<string, string[]> = {
  FLENKY: ["Jenko's in love.", "She's mine. Jenko has spoken."],
  KREZMAR: ["Mmm. That's the blues, that.", "She's mine. Motion carried."],
  KREBLIS: ["She's mine. I'll send her a Facebook message.", "mmm mmm she is mine dont reply to this"],
  KREZWONK: ["The omens say she's mine.", "I foresaw this. She's mine."],
  SCROMBUS: ["Mmm. Lovely. She's mine. Ta.", "Can I have her? Ta."],
  KREBON: ["She's coming to my gig. She's mine.", "🤘 Mine 🤘"],
  CRONGUS: ["Mmm. Like a pudding.", "She's mine. I'm Lil' but I'm mine. She's mine."],
  GRONNY: ["Waa waa wee waa.", "Mmm. Lovely day for it.", "Buying gf!"],
  MIKEY: ["Can I sit with you lot?", "Mmm. She's... can I have her? Can I join?"],
};

const BAND_INTRO = [
  dir("LIVE TONIGHT: SANMIK & SANCHZ. Afro wig, white sunglasses, drawn-on goatee, gold shell suit. They have been booked as \"atmosphere\"."),
  say("SANMIK", "This one's for the ladies. And Gronny."),
];

const TIME = 8000;

interface Rival {
  id: string;
  spr: Phaser.GameObjects.Sprite;
  gauge: number;
  vel: number;
  zone: WonkZone;
  nextFlap: number;
  inZone: number;
  /** how this one will go */
  plan: "perfect" | "over" | "under";
  skill: number;
  result?: "perfect" | "over" | "under";
  finishedAt?: number;
  fill?: Phaser.GameObjects.Rectangle;
  label?: Phaser.GameObjects.Text;
}

export class ClubScene extends Phaser.Scene {
  private controls!: Controls;
  private box!: DialogueBox;
  private me!: Phaser.GameObjects.Sprite;
  private dancer!: Phaser.GameObjects.Sprite;
  private dancerIdx = 0;
  private patrons: { id: string; spr: Phaser.GameObjects.Sprite }[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private busy = false;
  private nextLeer = 0;
  private nextSwap = 0;
  private onBreak = false;
  private spots: Phaser.GameObjects.Arc[] = [];
  /** SanMik & SanChz, when they're the live act tonight. */
  private band: { spr: Phaser.GameObjects.Sprite; x: number }[] = [];
  private songIdx = -1;
  private between = false;
  private banner: Phaser.GameObjects.Text | null = null;
  // brawling
  private hits = new Map<Phaser.GameObjects.Sprite, number>();
  private ko = new Set<Phaser.GameObjects.Sprite>();
  private brawl = 0;
  private lastSwing = 0;
  private derek: { spr: Phaser.GameObjects.Sprite; hits: number; down: boolean; angry?: boolean } | null = null;
  /** You hit a dancer: everything gets worse. */
  private angry = false;
  private dancerDown = false;
  private musicStopped = false;

  constructor() {
    super("Club");
  }

  create() {
    this.busy = false;
    this.onBreak = false;
    this.patrons = [];
    this.spots = [];
    this.cameras.main.fadeIn(300);
    if (!backdrop(this, "bg_club", { depth: -10, dim: 0.1 })) this.add.rectangle(480, 270, 960, 540, 0x1a0b24).setDepth(-10);
    title(this, 480, 40, "THE WONKY POLE", 28, "#ff6bb0").setDepth(200);
    this.add.text(480, 66, "GENTLEMEN'S CABARET · LOOK, DON'T TOUCH · NO WONKING", { fontFamily: FONT, fontSize: "11px", color: "#ffd1e8" }).setOrigin(0.5).setDepth(200);
    for (let i = 0; i < 5; i++) {
      const l = this.add.circle(200 + i * 140, 200, 90, [0xff2e88, 0xa855f7, 0x5ad1ff][i % 3], 0.13).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
      this.tweens.add({ targets: l, alpha: 0.3, duration: 260 + i * 80, yoyo: true, repeat: -1 });
      this.spots.push(l);
    }
    if (!this.textures.exists("bg_club")) this.add.rectangle(480, 190, 6, 200, 0xd4af37).setDepth(4);
    // the dancer
    this.dancer = this.add.sprite(430, 330, this.dancerTex(), 0).setScale(3).setDepth(330);
    this.nextSwap = this.time.now + 35000;
    // the lads, front row
    const s = G.s;
    const ids = [...PLAYABLE_ORDER.filter((id) => id !== s.player && !(id === "KREBON" && s.flags.krebon_gone)), "MIKEY"].slice(0, 7);
    const seats = [
      [150, 470],
      [255, 478],
      [360, 470],
      [600, 470],
      [705, 478],
      [810, 470],
      [880, 400],
    ];
    ids.forEach((id, i) => {
      const [x, y] = seats[i % seats.length];
      const spr = this.add.sprite(x, y, `spr_${id}`, 0).setScale(2).setDepth(y);
      spr.setData("facing", "north");
      animateWalker(spr, 0, 0, false, 0);
      this.patrons.push({ id, spr });
      this.add.text(x, y + 30, CHARACTERS[id]?.name ?? id, { fontFamily: FONT, fontSize: "9px", color: "#ffd1e8", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5).setDepth(y + 1);
    });
    // stations
    this.add.text(870, 330, "🍸 BAR", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(300);
    this.add.text(70, 400, "🏆 WONK-OFF\nTABLE", { fontFamily: FONT, fontSize: "11px", color: "#ffd23f", align: "center", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(300);
    this.add.rectangle(480, 532, 90, 14, 0xffd23f, 0.3).setStrokeStyle(2, 0xffd23f).setDepth(1);
    this.add.text(480, 532, "EXIT", { fontFamily: FONT, fontSize: "10px", color: "#ffd23f" }).setOrigin(0.5).setDepth(2);
    this.me = this.add.sprite(480, 495, `spr_${s.player}`, 0).setScale(2).setDepth(495);
    this.prompt = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#000000cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(1000).setVisible(false);
    this.controls = new Controls(this);
    this.box = new DialogueBox(this, 2000, 0.2);
    if (!this.scene.isActive("UI")) this.scene.launch("UI", { mode: "hub" });
    else this.scene.get("UI").events.emit("mode", "hub");
    // some nights SanMik & SanChz are the live act (always the first time you visit since they got the gig)
    this.band = [];
    this.hits = new Map();
    this.ko = new Set();
    this.brawl = 0;
    this.derek = null;
    this.angry = false;
    this.dancerDown = false;
    this.musicStopped = false;
    this.songIdx = -1;
    this.between = false;
    this.banner = null;
    if (!s.flags.club_sanmik_seen || Math.random() < 0.6) this.startBand(!s.flags.club_sanmik_seen);
    else synth.music("pub", true);
    bump(s, "club_visits");
    this.time.delayedCall(500, () => {
      if (s.flags.club_seen) return;
      s.flags.club_seen = true;
      this.talk([
        dir("THE WONKY POLE. It smells of cherry vape and Lynx Africa. On stage, a dancer in an extremely sparkly costume is doing a routine with a lot of spinning."),
        dir("The entire chat is already here, in the front row, at 2pm on a weekday."),
        ...(this.band.length ? BAND_INTRO : []),
        dir("Tip the dancer at the stage, get a drink at the bar, or go to the WONK-OFF TABLE if you're feeling competitive. The EXIT is at the bottom."),
      ]);
    });
  }

  private startBand(first: boolean) {
    const s = G.s;
    const mk = (key: string, fallback: string, x: number, tint: number) => {
      const spr = this.add.sprite(x, 335, this.textures.exists(key) ? key : fallback, 0).setScale(2.6).setDepth(335);
      if (!this.textures.exists(key)) spr.setTint(tint);
      this.band.push({ spr, x });
    };
    mk("spr_SANMIK", "spr_MIKEY", 215, 0xb0c4ff);
    mk("spr_SANCHZ", "spr_POLSON", 650, 0xffe08a);
    this.banner = this.add.text(480, 92, "", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", backgroundColor: "#1a0b24cc", padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(200);
    this.playSong(Math.floor(Math.random() * SANMIK_SONGS.length), 0.2 + Math.random() * 0.4);
    if (first) {
      s.flags.club_sanmik_seen = true;
      // on a first-ever visit this is folded into the club's own intro instead
      if (s.flags.club_seen) this.time.delayedCall(500, () => !this.busy && this.talk(BAND_INTRO));
    }
  }

  private playSong(idx: number, startFrac = 0) {
    this.songIdx = idx;
    this.between = false;
    const song = SANMIK_SONGS[idx];
    synth.music(song.id, true, startFrac);
    this.banner?.setText(`♪ LIVE: SanMik & SanChz — "${song.title}"`);
    if (!startFrac) synth.play("cheer");
  }

  private dancerTex() {
    const d = DANCERS[this.dancerIdx % DANCERS.length];
    return this.textures.exists(d.tex) ? d.tex : "spr_FOLK2";
  }
  private dancerName() {
    return DANCERS[this.dancerIdx % DANCERS.length].id;
  }

  private async talk(lines: Parameters<DialogueBox["play"]>[0]) {
    this.busy = true;
    await this.box.play(lines);
    this.controls.swallow();
    this.busy = false;
  }

  private bubble(spr: Phaser.GameObjects.Sprite, text: string, ms = 1800, bg = "#ffffff") {
    const t = this.add.text(spr.x, spr.y - 46, text, { fontFamily: FONT, fontSize: "11px", color: "#050505", backgroundColor: bg, padding: { x: 5, y: 3 }, wordWrap: { width: 180 }, align: "center" }).setOrigin(0.5, 1).setDepth(1500);
    this.tweens.add({ targets: t, y: t.y - 8, duration: ms });
    this.time.delayedCall(ms, () => t.destroy());
  }

  private leer(n = 1) {
    for (let i = 0; i < n && this.patrons.length; i++) {
      const up = this.patrons.filter((q) => !this.ko.has(q.spr));
      if (!up.length) return;
      const p = up[Math.floor(Math.random() * up.length)];
      const band = this.band.length ? ["TUNE!", "SANMIK!!", "Mmm. And the music's good too.", "She's mine. SanMik can have the other one.", "PEENER 4EVA"] : [];
      const pool = [...LEER, ...(LEER_BY[p.id] ?? []), ...(LEER_BY[p.id] ?? []), ...band];
      this.time.delayedCall(i * 300, () => this.bubble(p.spr, pool[Math.floor(Math.random() * pool.length)]));
    }
  }

  update(time: number, delta: number) {
    const dt = Math.min(delta, 50);
    // the routine
    if (!this.onBreak && !this.dancerDown) {
      const t = time / 1000;
      this.dancer.x = 430 + Math.sin(t * 1.3) * 60;
      this.dancer.y = 330 - Math.abs(Math.sin(t * 3.2)) * 8;
      // hip sway on the beat, turning to face each side now and then
      if (!this.tweens.isTweening(this.dancer)) this.dancer.setAngle(Math.sin(t * 6.3) * 9);
      this.dancer.setFlipX(Math.floor(t / 1.9) % 2 === 1);
      if (Math.random() < 0.004) this.tweens.add({ targets: this.dancer, angle: 360, duration: 500, onComplete: () => this.dancer.setAngle(0) });
      if (time > this.nextSwap && !this.busy) this.swapDancer();
    }
    // the band
    this.band.forEach((b, i) => {
      if (this.ko.has(b.spr) || this.musicStopped) return;
      const t = time / 1000 + i * 0.8;
      b.spr.x = b.x + Math.sin(t * 2) * 22;
      b.spr.y = 335 - Math.abs(Math.sin(t * 5.5)) * 9;
      animateWalker(b.spr, Math.cos(t * 2), 0, true, time);
    });
    if (this.band.length && !this.musicStopped && !this.between && this.songIdx >= 0 && synth.fileProgress().ended) {
      this.between = true;
      synth.play("cheer");
      this.banner?.setText("♪ \"Cheers Wonky Pole. This next one's about a hot tub.\"");
      let next = Math.floor(Math.random() * SANMIK_SONGS.length);
      if (next === this.songIdx) next = (next + 1) % SANMIK_SONGS.length;
      this.time.delayedCall(2500, () => this.playSong(next));
    }
    // the lads bob about and leer
    this.patrons.forEach((p, i) => {
      if (!this.busy && !this.ko.has(p.spr)) p.spr.y += Math.sin(time / 300 + i) * 0.08;
    });
    if (time > this.nextLeer && !this.busy && !this.onBreak && !this.angry) {
      this.nextLeer = time + 1600 + Math.random() * 1800;
      this.leer(1);
    }
    if (this.busy) {
      this.prompt.setVisible(false);
      return;
    }
    const mv = this.controls.move();
    const sp = 200 * (dt / 1000);
    this.me.x = Phaser.Math.Clamp(this.me.x + mv.x * sp, 40, 920);
    this.me.y = Phaser.Math.Clamp(this.me.y + mv.y * sp, 380, 520);
    this.me.setDepth(this.me.y);
    animateWalker(this.me, mv.x, mv.y, Math.hypot(mv.x, mv.y) > 0.1, time);
    const atStage = this.me.y < 430 && Math.abs(this.me.x - 430) < 130;
    const atBar = this.me.x > 780 && this.me.y < 440;
    const atTable = this.me.x < 130 && this.me.y < 470;
    const atExit = this.me.y > 495 && Math.abs(this.me.x - 480) < 70;
    let label = "";
    let act: (() => void) | null = null;
    if (atStage && !this.onBreak && !this.dancerDown) {
      label = `E: Tip ${this.dancerName()} (5 Krezzcoin)`;
      act = () => this.tip();
    } else if (atBar) {
      label = "E: Order a Pussy Juice (10 Krezzcoin)";
      act = () => this.bar();
    } else if (atTable && this.angry) {
      label = "Nobody will wonk-off with you now.";
    } else if (atTable && this.derek && !this.derek.down) {
      label = "Big Derek is right there. Not now.";
    } else if (atTable) {
      label = "E: Call a WONK-OFF";
      act = () => this.wonkOff();
    } else if (atExit) {
      label = "E: Leave";
      act = () => this.leave();
    }
    // anyone in reach can be hit (ATTACK always; E too when there's nothing else to do here)
    const target = this.nearestTarget();
    if (!act && target) {
      label = `E / ATTACK: hit ${target.name}`;
      act = () => this.hitTarget(target);
    }
    if (target && this.controls.attackHeld() && time - this.lastSwing > 280) this.hitTarget(target);
    if (label) {
      this.prompt.setText(label).setPosition(this.me.x, this.me.y - 50).setVisible(true);
      if (this.controls.interact() && act) act();
    } else {
      this.prompt.setVisible(false);
      this.controls.interact();
    }
    this.updateDerek(dt);
    if (this.controls.pause()) this.leave();
  }

  // ------------------------------------------------------------------ BRAWL

  private nearestTarget(): { name: string; spr: Phaser.GameObjects.Sprite; kind: "lad" | "band" | "dancer" | "derek" } | null {
    const all: { name: string; spr: Phaser.GameObjects.Sprite; kind: "lad" | "band" | "dancer" | "derek" }[] = [];
    for (const p of this.patrons) all.push({ name: CHARACTERS[p.id]?.name ?? p.id, spr: p.spr, kind: "lad" });
    this.band.forEach((b, i) => all.push({ name: i ? "SANCHZ" : "SANMIK", spr: b.spr, kind: "band" }));
    if (!this.onBreak) all.push({ name: this.dancerName(), spr: this.dancer, kind: "dancer" });
    if (this.derek && !this.derek.down) all.push({ name: "BIG DEREK", spr: this.derek.spr, kind: "derek" });
    // when Derek's on you, he's the one you're swinging at
    const dk = this.derek;
    if (dk && !dk.down && Phaser.Math.Distance.Between(dk.spr.x, dk.spr.y, this.me.x, this.me.y) < 95) return { name: "BIG DEREK", spr: dk.spr, kind: "derek" };
    let best = null;
    let bd = 78;
    for (const a of all) {
      if (this.ko.has(a.spr)) continue;
      const d = Phaser.Math.Distance.Between(a.spr.x, a.spr.y, this.me.x, this.me.y);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

  private pow(x: number, y: number, text: string, color = "#ffd23f", size = 18) {
    const t = this.add.text(x, y, text, { fontFamily: "Impact, sans-serif", fontSize: `${size}px`, color, stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(1600).setAngle((Math.random() - 0.5) * 20).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 110, ease: "Back.out" });
    this.tweens.add({ targets: t, y: y - 28, alpha: 0, delay: 350, duration: 450, onComplete: () => t.destroy() });
  }

  private hitTarget(t: { name: string; spr: Phaser.GameObjects.Sprite; kind: "lad" | "band" | "dancer" | "derek" }) {
    const now = this.time.now;
    if (now - this.lastSwing < 280 || this.busy) return;
    this.lastSwing = now;
    const spr = t.spr;
    const a = Math.atan2(spr.y - this.me.y, spr.x - this.me.x);
    // lunge
    const mx = this.me.x;
    const my = this.me.y;
    this.tweens.add({ targets: this.me, x: mx + Math.cos(a) * 14, y: my + Math.sin(a) * 8, duration: 60, yoyo: true, onComplete: () => this.me.setPosition(mx, my) });
    if (t.kind === "dancer") return this.hitDancer(spr, a);
    const n = (this.hits.get(spr) ?? 0) + 1;
    this.hits.set(spr, n);
    this.brawl++;
    synth.play(n % 3 === 0 ? "punch_big" : "punch");
    this.cameras.main.shake(100, 0.006);
    spr.setTintFill(0xffffff);
    this.time.delayedCall(80, () => spr.active && spr.clearTint());
    this.pow(spr.x + (Math.random() - 0.5) * 30, spr.y - 56, ["POW!", "WHAM!", "BIFF!", "SMACK!", "BOSH!"][Math.floor(Math.random() * 5)]);
    for (let i = 0; i < 6; i++) {
      const c = this.add.circle(spr.x, spr.y - 10, 3, i % 2 ? 0xffffff : 0xffd23f).setDepth(1500);
      this.tweens.add({ targets: c, x: c.x + (Math.random() - 0.5) * 70, y: c.y + (Math.random() - 0.5) * 50, alpha: 0, duration: 300, onComplete: () => c.destroy() });
    }
    if (t.kind === "derek") return this.hitDerek(a);
    const x0 = spr.x;
    const y0 = spr.y;
    if (t.kind === "lad") this.tweens.add({ targets: spr, x: x0 + Math.cos(a) * 26, y: y0 + Math.sin(a) * 12, duration: 90, yoyo: true, onComplete: () => !this.ko.has(spr) && spr.setPosition(x0, y0) });
    if (t.kind === "band" && !this.musicStopped && this.band.length) {
      this.musicStopped = true;
      synth.stopMusic();
      synth.play("tap_fail");
      this.banner?.setText("♪ THE MUSIC HAS STOPPED. Someone has attacked SanMik & SanChz.");
    }
    const hurt =
      t.kind === "band"
        ? ["MY WIG!", "We're mid-verse!", "Not the goatee!", "That's assault AND it's off-beat!"]
        : ["OI!", "What was that for?!", "I was only looking!", "She's still mine!", "Not in front of her!", "That's not fair!", "Mate!", "Ow! My pint!"];
    if (n >= 4) {
      this.ko.add(spr);
      spr.setAngle(90);
      this.pow(spr.x, spr.y - 40, "K.O.", "#ffffff", 22);
      this.bubble(spr, "💤", 2200);
      synth.play("death");
    } else this.bubble(spr, hurt[Math.floor(Math.random() * hurt.length)], 1300, "#ffe4e4");
    // the rest of the room reacts
    const watchers = this.patrons.filter((p) => p.spr !== spr && !this.ko.has(p.spr));
    if (watchers.length && Math.random() < 0.5) {
      const w = watchers[Math.floor(Math.random() * watchers.length)];
      this.bubble(w.spr, ["FIGHT! FIGHT! FIGHT!", "Get him!", "Mate, calm down", "Do me next! Actually don't.", "She's watching! Look hard!"][Math.floor(Math.random() * 5)], 1300);
    }
    if (this.ko.size >= 1 || this.brawl >= 6) this.callDerek();
  }

  /** You can. You really shouldn't. */
  private hitDancer(spr: Phaser.GameObjects.Sprite, a: number) {
    const s = G.s;
    const n = (this.hits.get(spr) ?? 0) + 1;
    this.hits.set(spr, n);
    this.brawl += 3;
    synth.play("punch");
    this.cameras.main.shake(100, 0.006);
    spr.setTintFill(0xffffff);
    this.time.delayedCall(80, () => spr.active && spr.clearTint());
    this.pow(spr.x, spr.y - 56, ["POW!", "SMACK!"][n % 2]);
    // the room turns on you, immediately
    synth.play("gasp");
    const up = this.patrons.filter((p) => !this.ko.has(p.spr));
    up.slice(0, 3).forEach((p, i) =>
      this.time.delayedCall(i * 200, () => this.bubble(p.spr, ["You hit a WOMAN?!", "Bro. What is WRONG with you.", "Not cool, man. NOT cool.", "I'm telling my mum.", "Even Boggor wouldn't do that.", "DEREK! DEREK!"][(n + i) % 6], 1600, "#fecaca")),
    );
    this.angry = true;
    if (n < 4) {
      this.bubble(spr, ["OW! DEREK!", "DEREK!!!", "Are you serious?!", "You're DEAD. Derek's going to kill you."][n % 4], 1500, "#ffd1e8");
      this.callDerek();
      return;
    }
    // down
    this.ko.add(spr);
    this.dancerDown = true;
    spr.setAngle(90);
    synth.play("death");
    synth.stopMusic();
    this.musicStopped = true;
    this.banner?.setText("♪ The music has stopped. Everyone is staring at you.");
    this.pow(spr.x, spr.y - 40, "K.O.", "#ffffff", 22);
    const fine = Math.min(s.coins, 50);
    s.coins -= fine;
    s.drongusResentment = Math.min(100, s.drongusResentment + 10);
    s.flags.hit_dancer = true;
    bump(s, "dancer_kos");
    G.emit("toast", { title: "A NEW LOW", text: `You knocked out ${this.dancerName()}. -${fine} Krezzcoin (her medical bills). Everyone saw. Drongus heard.` });
    for (const p of up) this.bubble(p.spr, ["...", "I'm leaving.", "I don't know you.", "That's it. I'm out of the chat.", "Disgusting."][Math.floor(Math.random() * 5)], 2200, "#fecaca");
    if (this.derek) this.enrageDerek();
    else this.callDerek();
  }

  private enrageDerek() {
    const d = this.derek;
    if (!d) return;
    d.angry = true;
    this.bubble(d.spr, `YOU DID WHAT TO ${this.dancerName()}?!`, 2000, "#fecaca");
    (this.children.getByName("derekBanner") as Phaser.GameObjects.Text | null)?.setText("BIG DEREK IS FURIOUS · 18 hits to drop him. He's fast now. Good luck.");
  }

  private callDerek() {
    if (this.derek || this.busy) return;
    const spr = this.add.sprite(1000, 470, this.textures.exists("spr_TV_BOUNCER") ? "spr_TV_BOUNCER" : "spr_FOLK1", 0).setScale(3.2).setDepth(470);
    this.derek = { spr, hits: 0, down: false, angry: this.angry };
    synth.play("door");
    synth.play("roar");
    this.bubble(spr, this.angry ? `WHO TOUCHED ${this.dancerName()}?!` : "RIGHT. WHO'S KICKING OFF.", 2000, "#fecaca");
    this.add.text(480, 120, "BIG DEREK IS COMING · Knock him out (10 hits) before he grabs you", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#7f1d1dcc", padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(1700).setName("derekBanner");
  }

  private updateDerek(dt: number) {
    const d = this.derek;
    if (!d || d.down || this.busy) return;
    if (this.tweens.isTweening(d.spr)) return;
    const dx = this.me.x - d.spr.x;
    const dy = this.me.y - d.spr.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 34) return this.thrownOut();
    const sp = (d.angry ? 115 : 62) * (dt / 1000);
    d.spr.x += (dx / dist) * sp;
    d.spr.y += (dy / dist) * sp;
    d.spr.setDepth(d.spr.y);
  }

  private hitDerek(a: number) {
    const d = this.derek!;
    d.hits++;
    this.tweens.add({ targets: d.spr, x: d.spr.x + Math.cos(a) * 40, y: d.spr.y + Math.sin(a) * 16, duration: 140, ease: "Quad.out" });
    if (d.hits === 5) this.bubble(d.spr, d.angry ? "THAT'S NOT GOING TO SAVE YOU." : "...that tickled.", 1400, "#fecaca");
    if (d.hits < (d.angry ? 18 : 10)) return;
    d.down = true;
    d.spr.setAngle(90);
    this.cameras.main.shake(400, 0.014);
    this.cameras.main.flash(120, 255, 255, 255);
    synth.play("explode");
    synth.play("cheer");
    this.pow(d.spr.x, d.spr.y - 60, "BIG DEREK IS DOWN", "#ffd23f", 30);
    (this.children.getByName("derekBanner") as Phaser.GameObjects.Text | null)?.destroy();
    const s = G.s;
    const first = !s.flags.derek_beaten && !this.angry;
    if (first) {
      s.flags.derek_beaten = true;
      s.coins += 40;
    }
    bump(s, "derek_kos");
    if (this.angry) {
      for (const p of this.patrons.filter((q) => !this.ko.has(q.spr))) this.bubble(p.spr, ["Nobody's cheering, mate.", "...", "I'm still not talking to you."][Math.floor(Math.random() * 3)], 1800, "#fecaca");
      this.time.delayedCall(800, () => this.talk([dir("Big Derek is down. Nobody cheers. Somebody has called the police. You should probably leave."), say("SERGEANT SWIG", "(on the radio, mouth full of chocolate) Yeah we'll get round to it.")]));
      return;
    }
    for (const p of this.patrons.filter((q) => !this.ko.has(q.spr))) this.bubble(p.spr, ["LEGEND!", "YOU KILLED DEREK!", "He's not dead. Probably.", "Drinks are free now, right?"][Math.floor(Math.random() * 4)], 1800, "#fff7c2");
    this.time.delayedCall(800, () => this.talk([dir(`Big Derek is asleep on the carpet. The Wonky Pole is, for now, yours.${first ? " +40 Krezzcoin from his bumbag." : ""}`), say(this.dancerName(), "...honestly? Fair play.")]));
  }

  private async thrownOut() {
    const s = G.s;
    this.busy = true;
    synth.play("punch_big");
    this.cameras.main.shake(300, 0.012);
    this.tweens.add({ targets: this.me, y: 540, angle: 180, duration: 400 });
    this.busy = false;
    await this.talk(
      this.angry
        ? [say("BIG DEREK", "You. Hit. A DANCER."), dir("Big Derek carries you out by the ankles and throws you into the bins. You're barred for a LONG time.")]
        : [say("BIG DEREK", "OUT."), dir("Big Derek picks you up by the back of your collar and carries you out like a bin bag. You're barred for a few minutes.")],
    );
    s.flags.club_banned_until = s.playtimeMs + (this.angry ? 900000 : 240000);
    if (this.angry) s.hp = Math.max(1, s.hp - 30);
    this.busy = true;
    synth.stopMusic();
    G.save();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Hub", { at: "STRIP_CLUB" }));
  }

  private swapDancer() {
    this.nextSwap = this.time.now + 35000;
    const old = this.dancer;
    this.tweens.add({ targets: old, x: -60, duration: 900 });
    this.time.delayedCall(900, () => {
      this.dancerIdx++;
      old.setTexture(this.dancerTex(), 0).setX(1020);
      synth.play("cheer");
      this.leer(3);
      this.tweens.add({ targets: old, x: 480, duration: 900 });
    });
  }

  private tip() {
    const s = G.s;
    if (s.coins < 5) {
      this.bubble(this.dancer, "Come back when you've got money, babe.", 1800);
      return;
    }
    s.coins -= 5;
    bump(s, "club_tips");
    synth.play("coin");
    this.tweens.add({ targets: this.dancer, angle: 360, duration: 450, onComplete: () => this.dancer.setAngle(0) });
    this.bubble(this.dancer, ["Thanks, hun.", "Aw, cheers babe.", "Ta, love."][Math.floor(Math.random() * 3)], 1600, "#ffd1e8");
    // jealousy
    this.time.delayedCall(500, () => {
      for (let i = 0; i < 3; i++) {
        const p = this.patrons[Math.floor(Math.random() * this.patrons.length)];
        this.time.delayedCall(i * 250, () => this.bubble(p.spr, ["SHE'S MINE", "Oi! She's MINE", "She was looking at ME", "That's my tip money!"][i % 4], 1500, "#ffe4e4"));
      }
    });
  }

  private bar() {
    const s = G.s;
    if (s.coins < 10) {
      this.bubble(this.me, "Skint.", 1200);
      return;
    }
    s.coins -= 10;
    synth.play("gulp");
    if (s.bottles < maxBottles(s)) {
      s.bottles++;
      this.bubble(this.me, "+1 Pussy Juice (for later)", 1400, "#ffd1e8");
    } else {
      s.intoxication = Math.min(100, s.intoxication + 12);
      this.bubble(this.me, "Necked it.", 1200, "#ffd1e8");
    }
  }

  private leave() {
    if (this.busy) return;
    this.busy = true;
    if (this.angry) G.s.flags.club_banned_until = G.s.playtimeMs + 900000;
    synth.stopMusic();
    G.save();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Hub", { at: "STRIP_CLUB" }));
  }

  // ------------------------------------------------------------------ WONK-OFF

  private async wonkOff() {
    const s = G.s;
    const me = s.player;
    const crew = Phaser.Utils.Array.Shuffle(this.patrons.filter((p) => p.id !== "MIKEY" && !this.ko.has(p.spr)).slice()).slice(0, 4);
    if (!crew.length) {
      await this.talk([dir("Everyone you'd wonk-off against is unconscious. You've won by default. It doesn't feel like winning.")]);
      return;
    }
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    await this.talk([
      say(me, "Lads. Wonk-off. Right now."),
      ...crew.slice(0, 3).map((c) => say(c.id, pick(["Say less.", "I've been waiting all night for this.", "Finally.", "I was born ready. Literally.", "Is there a prize?", "Mmm. Yes."]))),
      say(this.dancerName(), "Absolutely not. I'm going on my break."),
    ]);
    // she leaves. lights down.
    this.onBreak = true;
    this.tweens.add({ targets: this.dancer, x: 1020, duration: 900 });
    this.spots.forEach((l) => this.tweens.add({ targets: l, alpha: 0.03, duration: 600 }));
    if (this.band.length) this.bubble(this.band[0].spr, "(still playing) This one's for the wonkers.", 2200, "#e0e7ff");
    if (this.patrons.some((p) => p.id === "MIKEY")) this.bubble(this.patrons.find((p) => p.id === "MIKEY")!.spr, "Can I join the wonk-off?", 1800);
    await new Promise((r) => this.time.delayedCall(900, r));
    this.busy = true;
    await this.runWonkOff(crew.map((c) => c.id));
  }

  private runWonkOff(rivalIds: string[]): Promise<void> {
    return new Promise((resolve) => {
      const s = G.s;
      const ui = this.add.container(0, 0).setDepth(3000);
      ui.add(this.add.rectangle(480, 270, 960, 540, 0x14001f, 0.88));
      const head = this.add.text(480, 44, "WONK-OFF", { fontFamily: "Impact, sans-serif", fontSize: "54px", color: "#ff9ad5", stroke: "#2a0030", strokeThickness: 9 }).setOrigin(0.5).setScale(0.2);
      ui.add(head);
      this.tweens.add({ targets: head, scale: 1, duration: 300, ease: "Back.out" });
      ui.add(this.add.text(480, 88, TOUCH.enabled ? "TAP to flap it up! Keep YOUR gauge in the KREZZ ZONE. First to krezz properly wins." : "TAP R / SPACE / CLICK to flap it up! Keep YOUR gauge in the KREZZ ZONE. First to krezz properly wins.", { fontFamily: "sans-serif", fontSize: "14px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5));
      // the line-up: you in the middle
      const ids = [...rivalIds];
      ids.splice(Math.floor(ids.length / 2), 0, s.player);
      const n = ids.length;
      const gap = Math.min(170, 840 / n);
      const x0 = 480 - ((n - 1) * gap) / 2;
      const all: Rival[] = ids.map((id, i) => {
        const spr = this.add.sprite(x0 + i * gap, 250, `spr_${id}`, 0).setScale(3.2);
        spr.setData("x0", spr.x);
        ui.add(spr);
        const wrist = addWrist(this, spr.x - 8, 278, { ...wristLook(id, CHARACTERS as any), scale: 1.6, speed: 90 + Math.random() * 60 });
        ui.add(wrist.obj);
        spr.setData("wrist", wrist);
        ui.add(this.add.text(spr.x, 150, id === s.player ? "YOU" : CHARACTERS[id]?.name ?? id, { fontFamily: FONT, fontSize: id === s.player ? "14px" : "11px", color: id === s.player ? "#ffd23f" : "#ffd1e8", fontStyle: "bold" }).setOrigin(0.5));
        // gauge under each
        ui.add(this.add.rectangle(spr.x, 420, 26, 140, 0x000000, 0.85).setStrokeStyle(id === s.player ? 3 : 1, id === s.player ? 0xffd23f : 0xffffff, 0.8));
        const zone = randomZone();
        ui.add(this.add.rectangle(spr.x, 420 + 70 - 140 * ((zone.lo + zone.hi) / 2), 26, 140 * (zone.hi - zone.lo), 0x22c55e, 0.4));
        ui.add(this.add.rectangle(spr.x, 420 + 70 - 140 * ((OVER + 1) / 2), 26, 140 * (1 - OVER), 0xef4444, 0.6));
        const fill = this.add.rectangle(spr.x, 490, 20, 0, 0xff4fa3).setOrigin(0.5, 1);
        ui.add(fill);
        const roll = Math.random();
        return { id, spr, gauge: 0, vel: 0, zone, nextFlap: 0, inZone: 0, plan: roll < 0.4 ? "perfect" : roll < 0.75 ? "over" : "under", skill: 0.6 + Math.random() * 0.5, fill };
      });
      // one long censor bar across every waist
      ui.add(this.add.rectangle(480, 290, Math.max(260, (n - 1) * gap + 130), 46, 0x000000));
      ui.add(this.add.text(480, 290, "C E N S O R E D", { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#ffffff" }).setOrigin(0.5));
      const timeBar = this.add.rectangle(220, 520, 520, 8, 0xffd23f).setOrigin(0, 0.5);
      ui.add(this.add.rectangle(480, 520, 524, 12, 0x000000, 0.8));
      ui.add(timeBar);
      const you = all.find((r) => r.id === s.player)!;
      let t = 0;
      let done = false;
      const press = () => {
        if (done || you.result) return;
        flap(you);
        (you.spr.getData("wrist") as Wrist | undefined)?.kick();
        synth.wonkTick(you.gauge);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        const k = e.key.toLowerCase();
        if (k === "r" || k === " " || k === "e" || k === "j") {
          e.preventDefault();
          press();
        }
      };
      window.addEventListener("keydown", onKey);
      this.input.on("pointerdown", press);
      const finishOne = (r: Rival, res: "perfect" | "over" | "under") => {
        r.result = res;
        r.finishedAt = t;
        const txt = res === "perfect" ? "KREZZED!" : res === "over" ? "TOO EARLY" : "NOTHING";
        r.label = this.add.text(r.spr.x, 190, txt, { fontFamily: "Impact, sans-serif", fontSize: "20px", color: res === "perfect" ? "#ffffff" : "#f9a8d4", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setScale(0.3);
        ui.add(r.label);
        this.tweens.add({ targets: r.label, scale: 1, duration: 200, ease: "Back.out" });
        if (res === "perfect") {
          this.jet(ui, r.spr.x, 270);
          synth.play("splat");
        } else synth.play("tap_fail");
      };
      const tick = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          if (done) return;
          t += 16;
          if (TOUCH.edges.has("interact")) {
            TOUCH.edges.delete("interact");
            press();
          }
          timeBar.setSize(520 * Math.max(0, 1 - t / TIME), 8);
          for (const r of all) {
            if (r.result) continue;
            if (r !== you) {
              // rivals: flap with a human-ish reaction time, heading for their fate
              if (t >= r.nextFlap) {
                const mid = (r.zone.lo + r.zone.hi) / 2;
                const go = r.plan === "over" ? Math.random() < 0.5 : r.plan === "under" ? r.gauge < r.zone.lo - 0.15 : r.vel <= 0 && r.gauge < mid + (Math.random() - 0.5) * (0.25 - r.skill * 0.15);
                if (go) {
                  flap(r);
                  (r.spr.getData("wrist") as Wrist | undefined)?.kick();
                }
                r.nextFlap = t + 90 + Math.random() * 160 / r.skill;
              }
            }
            fall(r, 16);
            const Z = r.zone;
            if (r.gauge >= Z.lo && r.gauge <= Z.hi) r.inZone += 16;
            r.fill!.setSize(20, 140 * r.gauge).setFillStyle(r.gauge > Z.hi ? 0xef4444 : r.gauge >= Z.lo ? 0x22c55e : 0xff4fa3);
            r.spr.setX((r.spr.getData("x0") as number) + (Math.random() - 0.5) * (2 + r.gauge * 8));
            if (r.gauge >= OVER) finishOne(r, "over");
            else if (r.inZone >= r.zone.need) finishOne(r, "perfect");
          }
          if (t >= TIME || all.every((r) => r.result)) {
            for (const r of all) if (!r.result) finishOne(r, "under");
            done = true;
            tick.remove();
            window.removeEventListener("keydown", onKey);
            this.input.off("pointerdown", press);
            this.time.delayedCall(700, () => this.climax(ui, all, you, resolve));
          }
        },
      });
    });
  }

  /** A white stream from behind the censor bar, and splats where it lands. */
  private jet(ui: Phaser.GameObjects.Container, x: number, y: number) {
    const line = this.add.rectangle(x, y, 10, 0, 0xffffff).setOrigin(0.5, 1);
    ui.add(line);
    this.tweens.add({ targets: line, height: 260, duration: 180, ease: "Quad.out" });
    this.tweens.add({ targets: line, alpha: 0, delay: 500, duration: 300, onComplete: () => line.destroy() });
    for (let i = 0; i < 3; i++) this.time.delayedCall(150 + i * 60, () => this.splat(ui, x + (Math.random() - 0.5) * 160, 40 + Math.random() * 120));
  }

  private splat(ui: Phaser.GameObjects.Container | null, x: number, y: number, size = 70) {
    const tex = this.textures.exists("fx_splat_white") ? "fx_splat_white" : null;
    const s = tex ? this.add.image(x, y, tex).setDisplaySize(size, size) : this.add.circle(x, y, size / 3, 0xf8f8f2);
    s.setDepth(3100).setRotation(Math.random() * 6).setAlpha(0.95);
    if (ui) ui.add(s);
    const sx = s.scaleX;
    const sy = s.scaleY;
    s.setScale(sx * 0.2, sy * 0.2);
    this.tweens.add({ targets: s, scaleX: sx, scaleY: sy, duration: 120, ease: "Back.out" });
    this.tweens.add({ targets: s, y: y + 40, delay: 500, duration: 2400, ease: "Sine.in" });
  }

  private climax(ui: Phaser.GameObjects.Container, all: Rival[], you: Rival, resolve: () => void) {
    const s = G.s;
    // everyone krezzes, one way or another
    synth.play("jet");
    this.cameras.main.flash(200, 255, 255, 255);
    this.cameras.main.shake(900, 0.01);
    for (let i = 0; i < 22; i++) this.time.delayedCall(i * 45, () => {
      this.splat(ui, 40 + Math.random() * 880, 30 + Math.random() * 480, 60 + Math.random() * 90);
      if (i % 4 === 0) synth.play("splat");
    });
    const perfects = all.filter((r) => r.result === "perfect").sort((a, b) => a.finishedAt! - b.finishedAt!);
    const won = perfects[0] === you;
    const place = perfects.indexOf(you) + 1;
    const verdict = won ? "WONK-OFF CHAMPION!" : you.result === "perfect" ? `KREZZED · ${place}${["", "st", "nd", "rd"][place] ?? "th"} PLACE` : you.result === "over" ? "OVER-WONKED. FIRST, BUT NOT LIKE THAT." : "UNDER-WONKED. NOTHING. NOT A DROP.";
    const big = this.add.text(480, 270, verdict, { fontFamily: "Impact, sans-serif", fontSize: won ? "56px" : "38px", color: won ? "#ffd23f" : "#f9a8d4", stroke: "#2a0030", strokeThickness: 9, align: "center", wordWrap: { width: 860 } }).setOrigin(0.5).setDepth(3200).setScale(0.3);
    this.tweens.add({ targets: big, scale: 1, duration: 280, ease: "Back.out", delay: 900 });
    synth.play(won ? "cheer" : "trombone");
    this.time.delayedCall(3000, async () => {
      big.destroy();
      ui.destroy();
      // Big Derek
      const derek = this.add.sprite(1000, 470, this.textures.exists("spr_TV_BOUNCER") ? "spr_TV_BOUNCER" : "spr_FOLK1", 0).setScale(3.2).setDepth(800);
      synth.play("door");
      await new Promise<void>((r) => this.tweens.add({ targets: derek, x: 760, duration: 500, onComplete: () => r() }));
      this.cameras.main.shake(200, 0.01);
      const reward = won ? 60 : you.result === "perfect" ? 25 : 5;
      s.coins += reward;
      bump(s, "wonkoffs");
      if (won) bump(s, "wonkoff_wins");
      s.flags.club_banned_until = s.playtimeMs + 240000;
      this.busy = false;
      await this.talk([
        say("BIG DEREK", "RIGHT. WHAT IS GOING ON IN H-"),
        say("BIG DEREK", "..."),
        say("BIG DEREK", "OUT. ALL OF YOU. OUT. YOU'RE BARRED."),
        say(this.dancerName(), "(from the back) I was gone for four minutes."),
        ...(this.band.length ? [say("SANMIK", "(still playing) Goodnight Wonky Pole! We're here till Thursday!")] : []),
        dir(won ? `You are the undisputed WONK-OFF CHAMPION. The lads carry you out on their shoulders, at arm's length. +${reward} Krezzcoin (side bets).` : `You are thrown out with everyone else. +${reward} Krezzcoin (found on the floor; you don't ask).`),
        dir("You're barred from The Wonky Pole for a few minutes."),
      ]);
      resolve();
      this.busy = true;
      synth.stopMusic();
      G.save();
      this.cameras.main.fadeOut(300);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Hub", { at: "STRIP_CLUB" }));
    });
  }
}
