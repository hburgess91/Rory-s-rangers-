import Phaser from "phaser";
import { G } from "../../G";
import { FONT } from "../../ui/theme";
import { CHARACTERS } from "../../../data/characters";
import { synth } from "../../audio/Synth";
import { voice } from "../../audio/Voice";
import { animateWalker, attackFrame } from "../../gfx/HD";
import { bump } from "../../systems/stats";
import { dir, say } from "../../../content/dsl";
import type { Line } from "../../../data/types";

/**
 * Posse encounter: one of the lads walks up and says "let's beat up X". A posse forms, you find
 * X somewhere in town, then hit the button prompts (shove / punch / kick) until X goes flying.
 */

type Move = "shove" | "punch" | "kick";
const MOVES: Move[] = ["shove", "punch", "kick"];
const KEY: Record<Move, string> = { shove: "E", punch: "J", kick: "SPACE" };
const WORDS: Record<Move, string[]> = {
  shove: ["SHOVE!", "BARGE!", "OOF!", "SHUNT!"],
  punch: ["POW!", "WHAM!", "BIFF!", "SMACK!", "BOSH!"],
  kick: ["THWACK!", "BOOT!", "KAPOW!", "HOOF!"],
};
const MOVE_COLOR: Record<Move, number> = { shove: 0x60a5fa, punch: 0xef4444, kick: 0xf59e0b };

const INSTIGATORS = ["KREZMAR", "SCROMBUS", "KREBON", "KREZWONK"];
const VICTIMS: { id: string; name: string; full: string; where?: string }[] = [
  { id: "MIKEY", name: "Mikey", full: "Mikey" },
  { id: "CRONGUS", name: "Luke", full: "Luke (Lil' Crongus)" },
  { id: "FLENKY", name: "Jenko", full: "Jenko (Flenky)" },
];

const WHINES_ALL = [
  "That's not fair!",
  "That's NOT FAIR!",
  "Three on one?!",
  "What did I even do?!",
  "I'm telling Drongus!",
  "This is bullying! This is literally bullying!",
  "Not the face! NOT THE FACE!",
  "Stop it! I mean it!",
  "MUUUUUM!",
  "I'm the nicest one in the chat!",
  "Ow! Ow! That's my bad arm!",
  "I'll ban you all! ...I can't ban anyone.",
  "Why is it always me?!",
];
const WHINES: Record<string, string[]> = {
  MIKEY: ["I paid for the bongos! Last time!", "Can I still come to the pub after?", "Old times, lads! OLD TIMES!", "Is this the initiation? Am I in?"],
  CRONGUS: ["My little arms can't block!", "I'm Lil'! I'm LIL'!", "I'll make you all a pudding! Please!", "I'm getting Boggor!"],
  FLENKY: ["My parents are still together! Isn't that enough?!", "I know Brazilian jiu-jitsu! ...I don't.", "Is this because I'm banned?!", "Jenko didn't deserve this!"],
};
const CHEERS = ["GET IN!", "AGAIN!", "Do the kick! DO THE KICK!", "Wahey!", "Have some of that!", "He's had that coming for YEARS", "Ohhhh! Did you see that?!", "Bang!", "Wallop!"];
const CHEERS_BY: Record<string, string[]> = {
  KREBON: ["🤘 ROCK AND ROLL", "That's a Reprieve, that is"],
  KREZMAR: ["That's the blues, mate", "Free bongos for whoever lands a kick"],
  SCROMBUS: ["Can I have a go? Ta.", "Lovely technique"],
  KREZWONK: ["I foresaw this", "The omens said kick"],
};
const RECRUIT: Record<string, string[]> = {
  KREBON: ["Oi. You. Let's beat up {V}.", "Let's beat up {V}. Then a gig."],
  KREZMAR: ["Let's beat up {V}. Blues night's cancelled anyway.", "Let's beat up {V}. Motion carried."],
  SCROMBUS: ["Let's beat up {V}.", "Fancy beating up {V}? I've got nothing on."],
  KREZWONK: ["Let's beat up {V}. The omens are very clear.", "I've had a vision. In it, we beat up {V}."],
};
const AGREE = ["I'm in.", "Say less.", "He's had it coming.", "Finally. I'll get my coat.", "Yeah go on then.", "Is it a Tuesday? Then yeah."];

interface Mate {
  id: string;
  spr: Phaser.GameObjects.Sprite;
  plate: Phaser.GameObjects.Text;
}

export class Beatup {
  private h: any;
  private doors: { x: number; y: number; name: string }[];
  state: "idle" | "hunt" | "fight" = "idle";
  private nextCheck = 0;
  private mates: Mate[] = [];
  private hidden: any[] = [];
  private victim: { id: string; name: string; full: string; spr: Phaser.GameObjects.Sprite; plate: Phaser.GameObjects.Text } | null = null;
  private huntUntil = 0;
  private bubbleT: Phaser.GameObjects.Text | null = null;
  // fight
  private ui: Phaser.GameObjects.Container | null = null;
  private prompt: Move = "punch";
  private promptUntil = 0;
  private window = 1400;
  private hits = 0;
  private combo = 0;
  private best = 0;
  private finisher = false;
  private promptT!: Phaser.GameObjects.Text;
  private comboT!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Rectangle;
  private btns: Record<Move, { c: Phaser.GameObjects.Arc; t: Phaser.GameObjects.Text }> = {} as any;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private lastInput = 0;
  private center = { x: 0, y: 0 };
  private zoom0 = 1;
  private readonly NEED = 14;

  constructor(h: any, doors: { x: number; y: number; name: string }[]) {
    this.h = h;
    this.doors = doors;
    // first one comes along after a bit of wandering, then every few minutes (sometimes)
    this.nextCheck = h.time.now + 50000 + Math.random() * 40000;
  }

  /** Where the town arrow should point while hunting. */
  target(): { x: number; y: number } | null {
    return this.state === "hunt" && this.victim ? { x: this.victim.spr.x, y: this.victim.spr.y } : null;
  }

  update(now: number, dt: number) {
    if (this.state === "idle") return this.maybeStart(now);
    if (this.state === "hunt") return this.updateHunt(now, dt);
    if (this.state === "fight") return this.updateFight(now);
  }

  // ------------------------------------------------------------------ start

  private maybeStart(now: number) {
    const h = this.h;
    if (now < this.nextCheck) return;
    this.nextCheck = now + 40000;
    const s = G.s;
    if (h.busy || !s.flags.prologue_done || now < h.pg?.chaseUntil || h.cops?.length) return;
    if (Math.random() > 0.5) return;
    this.start();
  }

  /** Also callable from the debug API. */
  start(victimId?: string) {
    const h = this.h;
    const s = G.s;
    const pool = INSTIGATORS.filter((id) => id !== s.player && !(id === "KREBON" && s.flags.krebon_gone));
    const victims = VICTIMS.filter((v) => v.id !== s.player && (!victimId || v.id === victimId));
    if (pool.length < 1 || !victims.length) return;
    Phaser.Utils.Array.Shuffle(pool);
    const crew = pool.slice(0, Math.min(3, pool.length));
    const v = victims[Math.floor(Math.random() * victims.length)];
    this.state = "hunt";
    this.huntUntil = h.time.now + 150000;
    // town NPCs of the same people step aside while the posse is out
    for (const n of h.npcs) {
      if (crew.includes(n.id) || n.id === v.id) {
        n.spr.setVisible(false);
        n.plate?.setVisible(false);
        n.bubble?.destroy();
        this.hidden.push(n);
      }
    }
    const av = h.av;
    crew.forEach((id, i) => {
      const a = Math.PI * 0.75 + i * 0.6;
      const spr = h.add.sprite(av.x + Math.cos(a) * 520, av.y + Math.sin(a) * 340, `spr_${id}`, 0).setScale(2).setDepth(av.y);
      const plate = h.add.text(spr.x, spr.y - 36, CHARACTERS[id]?.name ?? id, { fontFamily: FONT, fontSize: "10px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(4000);
      this.mates.push({ id, spr, plate });
    });
    // the victim, somewhere a walk away
    const far = this.doors.filter((d) => {
      const dd = Phaser.Math.Distance.Between(d.x, d.y, av.x, av.y);
      return dd > 500 && dd < 1500;
    });
    const spot = (far.length ? far : this.doors)[Math.floor(Math.random() * (far.length || this.doors.length))];
    const vs = h.add.sprite(spot.x + 50, spot.y + 40, `spr_${v.id}`, 0).setScale(2).setDepth(spot.y + 40);
    const vp = h.add.text(vs.x, vs.y - 36, v.name.toUpperCase(), { fontFamily: FONT, fontSize: "10px", color: "#ff8a8a", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(4000);
    this.victim = { ...v, spr: vs, plate: vp };
    // the instigator walks up and says it
    const lead = this.mates[0];
    h.busy = true;
    h.tweens.add({
      targets: lead.spr,
      x: av.x + 50,
      y: av.y + 6,
      duration: 900,
      onUpdate: () => animateWalker(lead.spr, av.x - lead.spr.x, av.y - lead.spr.y, true, h.time.now),
      onComplete: async () => {
        animateWalker(lead.spr, -1, 0, false, h.time.now);
        h.busy = false;
        const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
        const lines: Line[] = [say(lead.id, pick(RECRUIT[lead.id] ?? ["Let's beat up {V}."]).replace("{V}", v.name))];
        for (const m of this.mates.slice(1)) lines.push(say(m.id, pick(AGREE)));
        lines.push(dir(`A posse has formed. ${v.full} was last seen by ${spot.name}. Follow the yellow arrow.`));
        await h.talk(lines);
        synth.play("cheer");
        G.emit("toast", { title: `BEAT UP ${v.name.toUpperCase()}`, text: `Find ${v.name} (follow the arrow). Then hit the buttons as they come up.` });
      },
    });
  }

  // ------------------------------------------------------------------ hunt

  private updateHunt(now: number, dt: number) {
    const h = this.h;
    const av = h.av;
    const v = this.victim!;
    // the posse trails you in a little V
    this.mates.forEach((m, i) => {
      if (h.tweens.isTweening(m.spr)) return;
      const side = i === 0 ? 0 : i % 2 ? 1 : -1;
      const tx = av.x - 46 - (i ? 22 : 0);
      const ty = av.y + side * 34;
      const dx = tx - m.spr.x;
      const dy = ty - m.spr.y;
      const d = Math.hypot(dx, dy);
      const moving = d > 18;
      if (moving) {
        const sp = Math.min(d, (d > 300 ? 320 : 215) * (dt / 1000));
        m.spr.x += (dx / d) * sp;
        m.spr.y += (dy / d) * sp;
      }
      animateWalker(m.spr, dx, dy, moving, now);
      m.spr.setDepth(m.spr.y);
      m.plate.setPosition(m.spr.x, m.spr.y - 36);
    });
    // the victim mills about, then legs it when it sees the posse
    const d = Phaser.Math.Distance.Between(av.x, av.y, v.spr.x, v.spr.y);
    if (d < 280 && !v.spr.getData("spotted")) {
      v.spr.setData("spotted", true);
      this.say(v.spr, "Oh no. Oh no no no.", 1600);
    }
    if (d < 280 && d > 60 && !h.busy) {
      const ax = v.spr.x - av.x;
      const ay = v.spr.y - av.y;
      const sp = 140 * (dt / 1000);
      v.spr.x = Phaser.Math.Clamp(v.spr.x + (ax / d) * sp, 60, 2500);
      v.spr.y = Phaser.Math.Clamp(v.spr.y + (ay / d) * sp, 160, 1760);
      animateWalker(v.spr, ax, ay, true, now);
    } else animateWalker(v.spr, 0, 0, false, now);
    v.spr.setDepth(v.spr.y);
    v.plate.setPosition(v.spr.x, v.spr.y - 36);
    if (this.bubbleT?.active) this.bubbleT.setPosition(this.bubbleT.getData("spr").x, this.bubbleT.getData("spr").y - 50);
    if (d < 64 && !h.busy) return this.startFight();
    if (now > this.huntUntil && !h.busy) {
      h.talk([say(this.mates[0].id, `Forget it. ${v.name}'s not worth it.`)]);
      this.cleanup();
    }
  }

  // ------------------------------------------------------------------ fight

  private startFight() {
    const h = this.h;
    const v = this.victim!;
    this.state = "fight";
    h.busy = true;
    (h.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    h.arrow?.setVisible(false);
    h.prompt?.setVisible(false);
    this.hits = this.combo = this.best = 0;
    this.finisher = false;
    this.window = 1500;
    // surround them
    this.center = { x: v.spr.x, y: v.spr.y };
    const c = this.center;
    h.tweens.add({ targets: h.av, x: c.x - 56, y: c.y + 4, duration: 200 });
    h.av.setData("facing", "east");
    animateWalker(h.av, 1, 0, false, h.time.now);
    const spots = [
      [c.x + 60, c.y + 6],
      [c.x, c.y - 52],
      [c.x + 4, c.y + 54],
    ];
    this.mates.forEach((m, i) => {
      const [x, y] = spots[i % spots.length];
      h.tweens.add({ targets: [m.spr], x, y, duration: 260, onComplete: () => animateWalker(m.spr, c.x - x, c.y - y, false, h.time.now) });
      h.tweens.add({ targets: m.plate, x, y: y - 36, duration: 260 });
    });
    this.zoom0 = h.cameras.main.zoom;
    h.tweens.add({ targets: h.cameras.main, zoom: this.zoom0 * 1.35, duration: 400, ease: "Quad.out" });
    this.say(v.spr, "No. Lads. LADS. Come on.", 1600);
    synth.play("roar");
    this.buildUi();
    this.keyHandler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "e" || k === "1") this.press("shove");
      else if (k === "j" || k === "2" || k === "f") this.press("punch");
      else if (k === " " || k === "k" || k === "3") this.press("kick");
    };
    window.addEventListener("keydown", this.keyHandler);
    h.time.delayedCall(700, () => this.nextPrompt());
  }

  private buildUi() {
    const h = this.h;
    const ui = h.add.container(0, 0).setScrollFactor(0).setDepth(8000);
    this.ui = ui;
    const v = this.victim!;
    ui.add(h.add.text(480, 92, `BEAT UP ${v.name.toUpperCase()}!`, { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#ffd23f", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5));
    this.promptT = h.add.text(480, 150, "", { fontFamily: "Impact, sans-serif", fontSize: "40px", color: "#ffffff", stroke: "#000", strokeThickness: 7 }).setOrigin(0.5);
    ui.add(this.promptT);
    ui.add(h.add.rectangle(480, 184, 220, 10, 0x000000, 0.6));
    this.timerBar = h.add.rectangle(370, 184, 220, 8, 0xffd23f).setOrigin(0, 0.5);
    ui.add(this.timerBar);
    this.comboT = h.add.text(800, 130, "", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#ff6b6b", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5);
    ui.add(this.comboT);
    MOVES.forEach((m, i) => {
      const x = 330 + i * 150;
      const y = 470;
      const c = h.add.circle(x, y, 48, MOVE_COLOR[m], 0.35).setStrokeStyle(4, MOVE_COLOR[m], 0.9).setInteractive({ useHandCursor: true });
      const t = h.add.text(x, y, `${m.toUpperCase()}\n[${KEY[m]}]`, { fontFamily: FONT, fontSize: "15px", color: "#ffffff", fontStyle: "bold", align: "center", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5);
      c.on("pointerdown", () => this.press(m));
      ui.add([c, t]);
      this.btns[m] = { c, t };
    });
  }

  private nextPrompt() {
    if (this.state !== "fight") return;
    const h = this.h;
    this.finisher = this.hits >= this.NEED;
    let m = MOVES[Math.floor(Math.random() * 3)];
    if (m === this.prompt && Math.random() < 0.6) m = MOVES[(MOVES.indexOf(m) + 1 + Math.floor(Math.random() * 2)) % 3];
    if (this.finisher) m = "kick";
    this.prompt = m;
    const win = this.finisher ? 2400 : this.window;
    this.promptUntil = h.time.now + win;
    this.promptT.setText(this.finisher ? "FINISH HIM: KICK!" : `${m.toUpperCase()}!`).setColor(this.finisher ? "#ffd23f" : "#ffffff").setScale(1.6);
    h.tweens.add({ targets: this.promptT, scale: 1, duration: 160, ease: "Back.out" });
    for (const mv of MOVES) {
      const b = this.btns[mv];
      h.tweens.killTweensOf(b.c);
      b.c.setScale(1).setFillStyle(MOVE_COLOR[mv], mv === m ? 0.85 : 0.18).setStrokeStyle(mv === m ? 6 : 3, mv === m ? 0xffffff : MOVE_COLOR[mv], 0.9);
      if (mv === m) h.tweens.add({ targets: b.c, scale: 1.15, yoyo: true, repeat: -1, duration: 220 });
    }
    this.timerBar.setFillStyle(MOVE_COLOR[m]);
  }

  private updateFight(now: number) {
    if (!this.ui) return;
    const h = this.h;
    // keep the prompt UI at screen size while the camera is zoomed in
    const z = h.cameras.main.zoom;
    this.ui.setScale(1 / z).setPosition(480 * (1 - 1 / z), 270 * (1 - 1 / z));
    const left = Math.max(0, this.promptUntil - now);
    this.timerBar.width = 220 * (left / (this.finisher ? 2400 : this.window));
    if (left <= 0 && this.promptUntil) {
      // too slow: they squirm, combo lost
      this.combo = 0;
      this.comboT.setText("");
      this.say(this.victim!.spr, "Ha! Missed me! ...wait no", 1000);
      this.promptUntil = 0;
      h.time.delayedCall(250, () => this.nextPrompt());
    }
    for (const m of this.mates) m.plate.setPosition(m.spr.x, m.spr.y - 36);
    const v = this.victim!;
    v.plate.setPosition(v.spr.x, v.spr.y - 36);
    if (this.bubbleT?.active) this.bubbleT.setPosition(this.bubbleT.getData("spr").x, this.bubbleT.getData("spr").y - 50);
  }

  private press(m: Move) {
    const h = this.h;
    if (this.state !== "fight" || !this.promptUntil) return;
    const now = h.time.now;
    if (now - this.lastInput < 90) return;
    this.lastInput = now;
    if (m !== this.prompt) {
      // whiff
      this.combo = 0;
      this.comboT.setText("");
      synth.play("swing");
      this.pop(this.center.x, this.center.y - 70, "WHIFF", "#9ca3af", 16);
      this.lunge(h.av, 10);
      h.cameras.main.shake(60, 0.002);
      return;
    }
    this.promptUntil = 0;
    this.hits++;
    this.combo++;
    this.best = Math.max(this.best, this.combo);
    if (this.finisher) return this.knockout();
    this.window = Math.max(650, this.window - 55);
    this.impact(m, h.av);
    // the lads join in now and then
    if (this.combo % 3 === 0 && this.mates.length) {
      const mate = this.mates[Math.floor(Math.random() * this.mates.length)];
      h.time.delayedCall(160, () => this.impact(MOVES[Math.floor(Math.random() * 3)], mate.spr, true));
    }
    if (this.combo >= 2) {
      this.comboT.setText(`x${this.combo} COMBO`).setScale(1.5);
      h.tweens.add({ targets: this.comboT, scale: 1, duration: 140 });
    }
    if (this.hits % 2 === 0) {
      const pool = [...WHINES_ALL, ...(WHINES[this.victim!.id] ?? []), ...(WHINES[this.victim!.id] ?? [])];
      const line = pool[Math.floor(Math.random() * pool.length)];
      this.say(this.victim!.spr, line, 1400);
      if (this.hits % 4 === 0) voice.say(this.victim!.id, line);
    }
    if (Math.random() < 0.35 && this.mates.length) {
      const mate = this.mates[Math.floor(Math.random() * this.mates.length)];
      const pool = [...CHEERS, ...(CHEERS_BY[mate.id] ?? [])];
      this.say(mate.spr, pool[Math.floor(Math.random() * pool.length)], 1100, "#fff7c2");
    }
    h.time.delayedCall(170, () => this.nextPrompt());
  }

  /** One hit landing: lunge, flash, knock, sparks, word, thump. */
  private impact(m: Move, who: Phaser.GameObjects.Sprite, mate = false) {
    const h = this.h;
    const v = this.victim!.spr;
    this.lunge(who, m === "kick" ? 26 : 18);
    const pre = String(who.frame.name);
    if (who.texture.key.startsWith("spr_")) {
      who.setFrame(attackFrame(who as Phaser.GameObjects.Sprite, 0.6));
      h.time.delayedCall(160, () => who.active && who.setFrame(pre));
    }
    const a = Math.atan2(v.y - who.y, v.x - who.x);
    const push = m === "shove" ? 34 : m === "kick" ? 26 : 16;
    h.tweens.killTweensOf(v);
    v.setPosition(this.center.x, this.center.y);
    h.tweens.add({ targets: v, x: this.center.x + Math.cos(a) * push, y: this.center.y + Math.sin(a) * push * 0.6, angle: (Math.random() - 0.5) * (m === "kick" ? 50 : 24), duration: 70, yoyo: true, hold: 60, ease: "Quad.out", onComplete: () => v.setAngle(0) });
    v.setTintFill(0xffffff);
    h.time.delayedCall(70, () => v.active && v.clearTint());
    const big = this.combo >= 8 || m === "kick";
    synth.play(big && !mate ? "punch_big" : "punch");
    h.cameras.main.shake(m === "kick" ? 130 : 80, (mate ? 0.003 : 0.004) + Math.min(0.006, this.combo * 0.0004));
    this.sparks(v.x - Math.cos(a) * 14, v.y - 8, MOVE_COLOR[m], mate ? 5 : 9);
    const words = WORDS[m];
    this.pop(v.x + (Math.random() - 0.5) * 50, v.y - 46 - Math.random() * 16, words[Math.floor(Math.random() * words.length)], Phaser.Display.Color.IntegerToColor(MOVE_COLOR[m]).rgba, mate ? 16 : 22 + Math.min(10, this.combo));
  }

  private knockout() {
    const h = this.h;
    const v = this.victim!;
    this.promptUntil = 0;
    this.promptT.setText("");
    for (const mv of MOVES) h.tweens.killTweensOf(this.btns[mv].c);
    this.lunge(h.av, 34);
    h.av.setFrame(attackFrame(h.av, 0.9));
    synth.play("punch_big");
    synth.play("explode");
    h.cameras.main.flash(160, 255, 255, 255);
    h.cameras.main.shake(400, 0.014);
    this.sparks(v.spr.x, v.spr.y - 10, 0xffd23f, 22);
    this.pop(v.spr.x, v.spr.y - 70, "K.O.!!!", "#ffd23f", 48);
    const line = ["I'M TELLING DRONGUUUUUS!", "THAT'S NOT FAAAAIIIR!", "I'LL REMEMBER THIIIIS!"][Math.floor(Math.random() * 3)];
    this.say(v.spr, line, 1500);
    voice.say(v.id, line);
    h.tweens.add({ targets: v.spr, x: v.spr.x + 520, y: v.spr.y - 380, angle: 1080, duration: 1300, ease: "Quad.out" });
    h.tweens.add({ targets: v.plate, alpha: 0, duration: 200 });
    // twinkle as they vanish over the rooftops
    h.time.delayedCall(1250, () => {
      const star = h.add.text(v.spr.x, v.spr.y, "✦", { fontSize: "30px", color: "#ffffff" }).setOrigin(0.5).setDepth(6000);
      synth.play("ding");
      h.tweens.add({ targets: star, scale: 2.2, alpha: 0, angle: 180, duration: 500, onComplete: () => star.destroy() });
    });
    synth.play("cheer");
    this.mates.forEach((m, i) => {
      h.tweens.add({ targets: m.spr, y: m.spr.y - 18, yoyo: true, repeat: 2, duration: 160, delay: i * 70 });
      this.say(m.spr, ["GET IIIIN!", "LEGEND!", "Out of the PARK!", "🤘🤘🤘"][i % 4], 1600, "#fff7c2");
    });
    h.time.delayedCall(1900, () => this.finish());
  }

  private async finish() {
    const h = this.h;
    const s = G.s;
    const v = this.victim!;
    const reward = 10 + this.best * 2;
    s.coins += reward;
    bump(s, "beatups");
    bump(s, `beatup_${v.id.toLowerCase()}`);
    this.ui?.destroy();
    this.ui = null;
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = null;
    h.tweens.add({ targets: h.cameras.main, zoom: this.zoom0, duration: 400 });
    v.spr.destroy();
    v.plate.destroy();
    this.victim = null;
    G.emit("toast", { title: "POSSE JUSTICE", text: `+${reward} Krezzcoin. Best combo x${this.best}.` });
    h.busy = false;
    await h.talk([say(this.mates[0].id, ["Same time next week?", "Good work, lads. Pub?", "We should do that more often.", "Nobody tell Drongus."][Math.floor(Math.random() * 4)])]);
    this.cleanup();
  }

  private cleanup() {
    const h = this.h;
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = null;
    this.ui?.destroy();
    this.ui = null;
    for (const m of this.mates) {
      h.tweens.add({ targets: [m.spr, m.plate], alpha: 0, duration: 600, onComplete: () => { m.spr.destroy(); m.plate.destroy(); } });
    }
    this.mates = [];
    if (this.victim) {
      this.victim.spr.destroy();
      this.victim.plate.destroy();
      this.victim = null;
    }
    for (const n of this.hidden) {
      n.spr.setVisible(true);
      n.plate?.setVisible(true);
    }
    this.hidden = [];
    this.state = "idle";
    this.nextCheck = h.time.now + 180000 + Math.random() * 120000;
  }

  /** Called when the town scene shuts down mid-event. */
  destroy() {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = null;
  }

  // ------------------------------------------------------------------ juice helpers

  private lunge(spr: Phaser.GameObjects.Sprite, px: number) {
    const h = this.h;
    const v = this.victim?.spr ?? spr;
    const a = Math.atan2(v.y - spr.y, v.x - spr.x);
    const x0 = spr.x;
    const y0 = spr.y;
    h.tweens.add({ targets: spr, x: x0 + Math.cos(a) * px, y: y0 + Math.sin(a) * px, duration: 60, yoyo: true, ease: "Quad.out", onComplete: () => spr.setPosition(x0, y0) });
  }

  private sparks(x: number, y: number, color: number, n: number) {
    const h = this.h;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 20 + Math.random() * 40;
      const p = h.add.circle(x, y, 2 + Math.random() * 3, i % 3 ? color : 0xffffff).setDepth(6000);
      h.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.3, duration: 260 + Math.random() * 200, ease: "Quad.out", onComplete: () => p.destroy() });
    }
    const ring = h.add.circle(x, y, 6, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 0.9).setDepth(6000);
    h.tweens.add({ targets: ring, radius: 30, alpha: 0, duration: 180, onComplete: () => ring.destroy() });
  }

  private pop(x: number, y: number, text: string, color: string, size: number) {
    const h = this.h;
    const t = h.add.text(x, y, text, { fontFamily: "Impact, sans-serif", fontSize: `${size}px`, color, stroke: "#000", strokeThickness: Math.max(4, size / 6) }).setOrigin(0.5).setDepth(6500).setAngle((Math.random() - 0.5) * 24).setScale(0.3);
    h.tweens.add({ targets: t, scale: 1, duration: 120, ease: "Back.out" });
    h.tweens.add({ targets: t, y: y - 26, alpha: 0, delay: 380, duration: 400, onComplete: () => t.destroy() });
  }

  private say(spr: Phaser.GameObjects.Sprite, text: string, ms = 1400, bg = "#ffffff") {
    const h = this.h;
    if (spr === this.victim?.spr) this.bubbleT?.destroy();
    const b = h.add.text(spr.x, spr.y - 50, text, { fontFamily: FONT, fontSize: "12px", color: "#050505", backgroundColor: bg, padding: { x: 5, y: 3 }, wordWrap: { width: 220 }, align: "center" }).setOrigin(0.5, 1).setDepth(6200);
    b.setData("spr", spr);
    if (spr === this.victim?.spr) this.bubbleT = b;
    h.time.delayedCall(ms, () => b.destroy());
    if (spr !== this.victim?.spr) {
      const follow = h.time.addEvent({ delay: 16, repeat: Math.ceil(ms / 16), callback: () => b.active && b.setPosition(spr.x, spr.y - 50) });
      h.time.delayedCall(ms + 20, () => follow.remove());
    }
  }
}
