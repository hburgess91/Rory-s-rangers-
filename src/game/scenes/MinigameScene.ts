import Phaser from "phaser";
import type { Line } from "../../data/types";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, title } from "../ui/theme";
import { dir, say } from "../../content/dsl";
import { arcStepAt, completeStep, maybeFinishArc } from "../systems/arcs";
import { bump } from "../systems/stats";

const MIKEY_BARKS = [
  "Mikey here.",
  "Can I just say something",
  "That's not fair lads",
  "I've been working on a new app actually",
  "OW. Okay that one was fair",
  "Is this about the 99 Woodcutting thing",
  "I'm telling Drongus",
  "Fair play. Fair play.",
  "I didn't even say anything in the chat today",
  "Mikey has left the group",
  "Mikey has been added to the group",
  "Lads?",
  "Proctus would never do this to me",
  "Can someone react to my message pls",
];

const PROCTUS_BARKS = [
  "I am only Acting Mikey.",
  "This is outside my job description.",
  "I'm filing a grievance with the Ministry.",
  "Mikey said this would happen.",
  "I have a family. Well, a pigeon.",
  "OW. Professionally, ow.",
];

/** Small arcade minigames. Each sets flags and, if it's the current arc step, completes it. */
export class MinigameScene extends Phaser.Scene {
  private box!: DialogueBox;
  private returnAt = "";
  private mode = "";
  private ended = false;
  private hud!: Phaser.GameObjects.Text;

  constructor() {
    super("Minigame");
  }

  create(data: { mode: string; returnAt?: string }) {
    this.mode = data.mode;
    this.returnAt = data.returnAt ?? "";
    this.ended = false;
    this.cameras.main.fadeIn(300);
    this.box = new DialogueBox(this, 1000, 0.3);
    this.hud = this.add.text(480, 512, "", { fontFamily: FONT, fontSize: "18px", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(200);
    const modes: Record<string, () => void> = {
      bully: () => this.bully(),
      deadlift: () => this.deadlift(),
      girlfriends: () => this.girlfriends(),
      renovate: () => this.renovate(),
    };
    (modes[this.mode] ?? (() => this.finish(false)))();
  }

  private mash(cb: () => void) {
    this.input.on("pointerdown", cb);
    this.input.keyboard?.on("keydown-SPACE", cb);
    this.input.keyboard?.on("keydown-E", cb);
  }

  private pop(x: number, y: number, t: string, color = "#ffffff", size = 18) {
    const tx = this.add.text(x, y, t, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(150);
    this.tweens.add({ targets: tx, y: y - 40, alpha: 0, duration: 900, onComplete: () => tx.destroy() });
  }

  /** Wrap up: arc bookkeeping, outcome dialogue, back to Krelford. */
  private async finish(success: boolean, extra: Line[] = []) {
    if (this.ended) return;
    this.ended = true;
    this.input.keyboard?.removeAllListeners();
    this.time.removeAllEvents();
    const lines: Line[] = [...extra];
    const c = arcStepAt(G.s, this.returnAt);
    if (c && c.step.step.kind === "minigame" && c.step.step.mode === this.mode) {
      lines.push(...(success ? c.step.step.success : c.step.step.fail));
      if (success) {
        completeStep(G.s, c.arc, c.step);
        const r = maybeFinishArc(G.s);
        if (r) lines.push(dir(r));
      }
    }
    if (success) G.s.flags[`mg_${this.mode}_won`] = true;
    G.save();
    await this.box.play(lines);
    this.cameras.main.fadeOut(400);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Hub", { at: this.returnAt, from: "minigame" }));
  }

  // ---------------------------------------------------------------- BULLY MIKEY

  private bully() {
    const proxy = G.s.player === "MIKEY";
    const target = proxy ? "PROCTUS" : "MIKEY";
    const name = proxy ? "PROCTUS (ACTING MIKEY)" : "MIKEY";
    const barks = proxy ? PROCTUS_BARKS : MIKEY_BARKS;
    this.add.tileSprite(0, 0, 960, 540, "tile_pub").setOrigin(0);
    this.add.rectangle(480, 470, 960, 140, 0x2a1a0a);
    title(this, 480, 70, `TAKE OUT YOUR FRUSTRATION ON ${name}`, 26, "#ff6b6b");
    this.add.text(480, 100, "Tap / SPACE to vent. The group chat has been a lot this week.", { fontFamily: FONT, fontSize: "14px", color: "#d6d6d6" }).setOrigin(0.5);
    const bag = this.add.sprite(480, 330, `spr_${target}`, 0).setScale(6).setDepth(10);
    const chain = this.add.rectangle(480, 150, 4, 70, 0x888888);
    const meterBg = this.add.rectangle(480, 500, 400, 20, 0x333333).setStrokeStyle(2, 0xffffff);
    const meter = this.add.rectangle(280, 500, 400, 20, 0xff3b30).setOrigin(0, 0.5);
    this.add.text(480, 500, "FRUSTRATION", { fontFamily: FONT, fontSize: "12px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5).setDepth(5);
    void chain;
    void meterBg;
    let frustration = 100;
    let hits = 0;
    const firstTime = !G.s.flags.mg_bully_won;
    const timeLimit = 20;
    const end = this.time.now + timeLimit * 1000;
    this.box.play([dir(proxy ? "Mikey is busy (being you). Proctus has been asked to stand in. Proctus did not agree to this." : "The Booth. Mikey has been strung up as a heavy bag. He seems fine with it. He is never fine with it."), say(target, barks[0])]);
    const swing = () => {
      if (this.ended || this.box.active) return;
      hits++;
      const crit = Math.random() < 0.15;
      frustration = Math.max(0, frustration - (crit ? 9 : 4));
      meter.width = 4 * frustration;
      synth.play(crit ? "crit" : "hit");
      this.tweens.killTweensOf(bag);
      bag.setAngle(0);
      this.tweens.add({ targets: bag, angle: (Math.random() < 0.5 ? -1 : 1) * (crit ? 40 : 18), yoyo: true, duration: 120 });
      bag.setTintFill(0xffffff);
      this.time.delayedCall(60, () => bag.clearTint());
      this.pop(400 + Math.random() * 160, 260 + Math.random() * 60, crit ? "KREZ!" : ["WONK", "POW", "BONK", "SLAP", "ⓘ"][hits % 5], crit ? "#ffd23f" : "#ffffff", crit ? 26 : 18);
      if (hits % 6 === 0) this.pop(480, 200, `"${barks[(hits / 6) % barks.length | 0]}"`, "#9ad1ff", 16);
      if (frustration <= 0) {
        const coins = firstTime ? 60 : 10;
        G.s.coins += coins;
        G.s.flags.bullied_mikey = true;
        bump(G.s, "bully_sessions");
        this.finish(true, [
          dir(`Frustration: gone. Krezzcoin found in ${proxy ? "Proctus's" : "Mikey's"} pockets: ${coins}.`),
          say(target, proxy ? "I'd like it noted that I was only acting." : "Fair play. Fair play. Same time next week?"),
          ...(proxy ? [] : [say("MIKEY", "Can someone react to my message pls")]),
        ]);
      }
    };
    this.mash(swing);
    this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        const left = Math.max(0, Math.ceil((end - this.time.now) / 1000));
        this.hud.setText(`TIME ${left}s   HITS ${hits}`);
        if (left <= 0 && !this.ended) this.finish(false, [dir("Time. You are still frustrated. Mikey looks smug, which somehow makes it worse."), say(target, barks[barks.length - 1])]);
      },
    });
  }

  // ---------------------------------------------------------------- DEADLIFT

  private deadlift() {
    this.add.tileSprite(0, 0, 960, 540, "tile_industrial").setOrigin(0);
    title(this, 480, 70, "DEADLIFT: 300KG (RECORD: 280)", 28);
    this.add.text(480, 102, "Mash Tap / SPACE. Don't stop. The HGH is doing most of the work.", { fontFamily: FONT, fontSize: "14px", color: "#d6d6d6" }).setOrigin(0.5);
    const lifter = this.add.sprite(480, 380, `spr_${G.s.player}`, 0).setScale(5).setDepth(10);
    const bar = this.add.image(480, 420, "p_barbell").setScale(3.2).setDepth(11);
    const prog = this.add.rectangle(140, 480, 0, 22, 0x22c55e).setOrigin(0, 0.5).setDepth(5);
    this.add.rectangle(480, 480, 680, 22).setStrokeStyle(2, 0xffffff).setDepth(6);
    let p = 0;
    const end = this.time.now + 12000;
    const juiced = !!G.s.flags.arcstep_arc_krezwonk_hgh || G.s.player !== "KREZWONK";
    this.mash(() => {
      if (this.ended) return;
      p = Math.min(100, p + (juiced ? 3.2 : 1.6));
      synth.play("swing");
      if (Math.random() < 0.15) this.pop(480 + (Math.random() - 0.5) * 300, 200, ["GRRR", "LIGHT WEIGHT", "SO WHAT CAN WE SAY", "HGH GO BRRR", "VEINS"][Math.floor(Math.random() * 5)], "#ffd23f");
    });
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (this.ended) return;
        if (p < 100) p = Math.max(0, p - 0.25);
        prog.width = 6.8 * p;
        bar.y = 420 - p * 1.6;
        lifter.setFrame(p > 50 ? 3 : 0);
        const left = Math.max(0, (end - this.time.now) / 1000);
        this.hud.setText(`${Math.round(p * 3)}KG / 300KG    ${left.toFixed(1)}s`);
        if (p >= 100) {
          synth.play("cheer");
          this.cameras.main.shake(400, 0.02);
          title(this, 480, 240, "NEW RECORD", 44, "#22c55e").setDepth(200);
          this.finish(true);
        } else if (left <= 0) {
          synth.play("tap_fail");
          this.finish(false, [dir("The bar does not move. The bar has never respected you.")]);
        }
      },
    });
  }

  // ---------------------------------------------------------------- GIRLFRIENDS

  private girlfriends() {
    this.add.rectangle(480, 270, 960, 540, 0x1f1b2e);
    title(this, 480, 50, "THE ROTA", 32);
    this.add.text(480, 84, "Answer the RIGHT phone before it rings out. Don't send the wrong text to the wrong girlfriend.", { fontFamily: FONT, fontSize: "14px", color: "#d6d6d6" }).setOrigin(0.5);
    const girls = ["KRELISSA", "KREZABETH", "KAYLOR"];
    const colors = [0xff6b9a, 0x7ac7ff, 0xffd23f];
    const msgs = [
      "u up?",
      "who's Krezabeth??",
      "my mum wants to meet you",
      "why is there a girl's hair tie in your car",
      "are we exclusive",
      "you said you were at the gym",
      "send a pic of the gym then",
      "it's our anniversary",
      "who is KAYLOR in your phone",
      "babe?",
      "why did you call me Krelissa",
      "I'm outside",
    ];
    let score = 0;
    let strikes = 0;
    let active = -1;
    let deadline = 0;
    const need = 12;
    const phones = girls.map((g, i) => {
      const x = 220 + i * 260;
      const c = this.add.container(x, 300);
      const body = this.add.rectangle(0, 0, 150, 240, 0x111111).setStrokeStyle(4, colors[i]);
      const scr = this.add.rectangle(0, -10, 130, 180, 0x2a2a3a);
      const nm = this.add.text(0, -110, g, { fontFamily: FONT, fontSize: "15px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5);
      const txt = this.add.text(0, -10, "", { fontFamily: FONT, fontSize: "14px", color: "#fff", align: "center", wordWrap: { width: 120 } }).setOrigin(0.5);
      c.add([body, scr, nm, txt]);
      body.setInteractive({ useHandCursor: true }).on("pointerdown", () => answer(i));
      this.add.text(x, 440, `[${i + 1}]`, { fontFamily: FONT, fontSize: "14px", color: "#888" }).setOrigin(0.5);
      return { c, scr, txt };
    });
    const ring = () => {
      if (this.ended) return;
      phones.forEach((p) => {
        p.scr.setFillStyle(0x2a2a3a);
        p.txt.setText("");
      });
      active = Phaser.Math.Between(0, 2);
      const window = Math.max(900, 2200 - score * 100);
      deadline = this.time.now + window;
      phones[active].scr.setFillStyle(colors[active]);
      phones[active].txt.setText(msgs[Phaser.Math.Between(0, msgs.length - 1)]);
      this.tweens.add({ targets: phones[active].c, angle: { from: -4, to: 4 }, yoyo: true, repeat: 3, duration: 60, onComplete: () => phones.forEach((p) => p.c.setAngle(0)) });
      synth.play("notify");
    };
    const strike = (why: string) => {
      strikes++;
      synth.play("hurt");
      this.cameras.main.shake(200, 0.01);
      this.pop(480, 160, why, "#ff6b6b", 22);
      if (strikes >= 3) {
        this.finish(false, [dir("All three of them are now in a group chat together. It is called 'KREZWONK EXPOSED'. It has 4,000 messages. You have been added to it.")]);
      } else this.time.delayedCall(500, ring);
    };
    const answer = (i: number) => {
      if (this.ended || active < 0) return;
      if (i !== active) {
        active = -1;
        return strike(`Sent "${girls[i]} you're the only one" to ${girls[(i + 1) % 3]}`);
      }
      active = -1;
      score++;
      synth.play("ding");
      this.pop(phones[i].c.x, 160, ["sent ❤", "'at the gym x'", "'miss u'", "'no she's my cousin'"][score % 4], "#7CFC9A");
      if (score >= need) {
        title(this, 480, 240, "NOBODY FOUND OUT", 40, "#22c55e").setDepth(200);
        this.finish(true);
      } else this.time.delayedCall(350, ring);
    };
    this.input.keyboard?.on("keydown-ONE", () => answer(0));
    this.input.keyboard?.on("keydown-TWO", () => answer(1));
    this.input.keyboard?.on("keydown-THREE", () => answer(2));
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        this.hud.setText(`KEPT SECRET ${score}/${need}    STRIKES ${"✕".repeat(strikes)}`);
        if (active >= 0 && this.time.now > deadline) {
          active = -1;
          strike("Left on read. She's suspicious.");
        }
      },
    });
    this.time.delayedCall(800, ring);
  }

  // ---------------------------------------------------------------- RENOVATE

  private renovate() {
    this.add.tileSprite(0, 0, 960, 540, "tile_mansion").setOrigin(0);
    title(this, 480, 50, "FLIP IT: FIX 25 PROBLEMS IN 45 SECONDS", 26);
    const kinds = [
      { t: "DAMP", c: 0x4a6a4a },
      { t: "HOLE", c: 0x111111 },
      { t: "CARPET", c: 0x7a1f2b },
      { t: "MOULD", c: 0x2f4f2f },
      { t: "CHEESE", c: 0xffd23f },
      { t: "CRACK", c: 0x6b5b4b },
      { t: "WIRING", c: 0xd97706 },
    ];
    const need = 25;
    let fixed = 0;
    const end = this.time.now + 45000;
    const spawn = () => {
      if (this.ended) return;
      const k = kinds[Phaser.Math.Between(0, kinds.length - 1)];
      const x = Phaser.Math.Between(80, 880);
      const y = Phaser.Math.Between(120, 500);
      const r = this.add.rectangle(x, y, 70, 46, k.c).setStrokeStyle(2, 0xffffff).setDepth(10);
      const t = this.add.text(x, y, k.t, { fontFamily: FONT, fontSize: "12px", color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(11);
      r.setScale(0);
      this.tweens.add({ targets: r, scale: 1, duration: 150 });
      r.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        if (this.ended) return;
        fixed++;
        synth.play("coin");
        this.pop(x, y, ["FIXED", "+£40k", "GRAND DESIGNS", "high end"][fixed % 4], "#7CFC9A");
        r.destroy();
        t.destroy();
        if (fixed >= need) {
          title(this, 480, 270, "SOLD: £2,400,000", 40, "#22c55e").setDepth(200);
          synth.play("cheer");
          this.finish(true);
        }
      });
    };
    for (let i = 0; i < 4; i++) spawn();
    this.time.addEvent({ delay: 700, loop: true, callback: spawn });
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const left = Math.max(0, (end - this.time.now) / 1000);
        this.hud.setText(`FIXED ${fixed}/${need}    ${left.toFixed(1)}s`);
        if (left <= 0 && !this.ended) this.finish(false, [dir("The surveyor arrives early. He finds the cheese.")]);
      },
    });
  }
}
