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
import { animateWalker, backdrop } from "../gfx/HD";

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
      runescape: () => this.runescape(),
      burpees: () => this.burpees(),
      facebook: () => this.fbTroll(),
      modulator: () => this.fbTroll("mikey"),
      gig: () => (G.s.player === "KREBON" ? this.gig() : this.gigWatch()),
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
    if (!backdrop(this, "bg_booth", { dim: 0.15, depth: -10 })) {
      this.add.tileSprite(0, 0, 960, 540, "tile_pub").setOrigin(0);
      this.add.rectangle(480, 470, 960, 140, 0x2a1a0a);
    }
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
    if (!backdrop(this, "bg_gym", { dim: 0.2, depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_industrial").setOrigin(0);
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
    if (!backdrop(this, "bg_flat", { dim: 0.6, depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x1f1b2e);
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
    if (!backdrop(this, "bg_fixer", { dim: 0.15, depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_mansion").setOrigin(0);
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
      const art = `r_${k.t.toLowerCase()}`;
      const hasArt = this.textures.exists(art);
      const r = hasArt ? this.add.image(x, y, art).setDepth(10) : this.add.rectangle(x, y, 70, 46, k.c).setStrokeStyle(2, 0xffffff).setDepth(10);
      const t = this.add.text(x, y + (hasArt ? 26 : 0), k.t, { fontFamily: FONT, fontSize: hasArt ? "10px" : "12px", color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(11);
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

  // ---------------------------------------------------------------- RUNESCAPE (keep the gear coming)

  private runescape() {
    if (!backdrop(this, "bg_runescape", { dim: 0.1, depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x3d6a2a);
    this.add.rectangle(480, 270, 940, 520).setStrokeStyle(6, 0x5a4a2a);
    title(this, 480, 40, "WOODCUTTING → 99", 26, "#ffff00");
    this.add.text(480, 70, "Tap / SPACE to chop. When the gear runs out, RE-UP (G or the button).", { fontFamily: FONT, fontSize: "13px", color: "#ffffff" }).setOrigin(0.5);
    const tree = this.add.image(560, 300, "p_tree").setScale(4);
    const me = this.add.sprite(400, 330, `spr_${G.s.player}`, 0).setScale(4);
    const lvlT = this.add.text(40, 110, "", { fontFamily: "monospace", fontSize: "18px", color: "#ffff00", stroke: "#000", strokeThickness: 4 });
    this.add.text(40, 186, "GEAR", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", fontStyle: "bold" });
    this.add.rectangle(40, 208, 200, 14, 0x111111).setOrigin(0, 0.5);
    const gearBar = this.add.rectangle(40, 208, 200, 14, 0xffffff).setOrigin(0, 0.5);
    const window = this.add.rectangle(860, 200, 80, 100, 0x223355).setStrokeStyle(4, 0x5a4a2a);
    const gary = this.add.sprite(860, 210, "spr_FOLK2", 0).setScale(2.6).setVisible(false);
    void window;
    // RuneScape XP table, squashed so 99 is reachable in a minute or so with gear
    const target = 13034431;
    let xp = 0;
    let gear = 100;
    let reups = 0;
    let busy = false;
    const levelOf = (x: number) => Math.min(99, 1 + Math.floor(98 * Math.pow(x / target, 0.55)));
    const end = this.time.now + 75000;
    const chop = () => {
      if (this.ended || busy || this.box.active) return;
      const mult = gear > 0 ? 1 : 0.08;
      const gain = Math.round(target / 160 * mult * (0.8 + Math.random() * 0.4));
      const before = levelOf(xp);
      xp = Math.min(target, xp + gain);
      synth.play("hit");
      me.setFrame(String(me.frame.name) === "3" ? 0 : 3);
      this.tweens.add({ targets: tree, angle: { from: -3, to: 3 }, yoyo: true, duration: 60 });
      if (Math.random() < 0.5) this.pop(560 + (Math.random() - 0.5) * 100, 220, `+${gain.toLocaleString()} xp`, "#ffffff", 13);
      const after = levelOf(xp);
      if (after > before && after % 10 === 0) this.pop(480, 160, `Woodcutting level ${after}!`, "#ffff00", 22);
      if (xp >= target) {
        synth.play("cheer");
        title(this, 480, 240, "99 WOODCUTTING\nHISCORES: RANK 1 (OVERALL, OF ALL TIME)", 28, "#ffff00").setDepth(200);
        this.finish(true, [dir(`Gear re-ups required: ${reups}. Gary has bought a boat.`)]);
      }
    };
    const reup = async () => {
      if (this.ended || busy) return;
      busy = true;
      reups++;
      gary.setVisible(true);
      synth.play("door");
      this.pop(860, 130, ["'Alright Kreb'", "'Same again?'", "'For the RuneScape'", "'You're my best customer'"][reups % 4], "#ffd23f", 14);
      await new Promise<void>((r) => this.time.delayedCall(1200, () => r()));
      gary.setVisible(false);
      gear = 100;
      this.pop(200, 200, "Hmmmm… gear… 😋", "#ffffff", 16);
      busy = false;
    };
    this.mash(chop);
    this.input.keyboard?.on("keydown-G", reup);
    const btn = this.add.rectangle(140, 470, 200, 50, 0x7c2d12).setStrokeStyle(3, 0xffff00).setInteractive({ useHandCursor: true });
    this.add.text(140, 470, "RE-UP (G)", { fontFamily: FONT, fontSize: "16px", color: "#ffff00", fontStyle: "bold" }).setOrigin(0.5);
    btn.on("pointerdown", (_p: unknown, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      ev.stopPropagation();
      reup();
    });
    let warned = false;
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (this.ended) return;
        if (!busy) gear = Math.max(0, gear - 1.6);
        gearBar.width = 2 * gear;
        gearBar.setFillStyle(gear > 25 ? 0xffffff : 0xef4444);
        if (gear <= 0 && !warned) {
          warned = true;
          this.pop(200, 210, "Feel a bit manic… better get some gear in!", "#ef4444", 15);
          this.time.delayedCall(3000, () => (warned = false));
        }
        const left = Math.max(0, (end - this.time.now) / 1000);
        lvlT.setText(`Level ${levelOf(xp)}\nXP ${xp.toLocaleString()}`);
        this.hud.setText(`${left.toFixed(0)}s   RE-UPS ${reups}`);
        if (left <= 0) this.finish(false, [dir("Your mum calls you down for dinner. The session is over. Lumbridge weeps.")]);
      },
    });
  }

  // ---------------------------------------------------------------- HIIT BURPEES (eternal life)

  private burpees() {
    if (!backdrop(this, "bg_gym", { dim: 0.25, depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_industrial").setOrigin(0);
    title(this, 480, 44, "EMOM: CHEST-TO-FLOOR BURPEES", 26);
    this.add.text(480, 76, "Alternate DOWN and UP (arrow keys / S then W / tap bottom then top half). 30 burpees before time.", { fontFamily: FONT, fontSize: "13px", color: "#ffffff" }).setOrigin(0.5);
    const me = this.add.sprite(480, 330, `spr_${G.s.player}`, 0).setScale(5);
    const cue = this.add.text(480, 170, "DOWN", { fontFamily: FONT, fontSize: "40px", color: "#22c55e", fontStyle: "bold", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5);
    const life = this.add.text(480, 460, "", { fontFamily: FONT, fontSize: "16px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5);
    const need = 30;
    let reps = 0;
    let wantDown = true;
    let stamina = 100;
    const end = this.time.now + 35000;
    const quips = ["The hardest is the burpees", "Lmfao round 1 is chest to floor", "Death is a choice", "Ageing: cancelled", "15 more and I'm immortal"];
    const press = (down: boolean) => {
      if (this.ended || this.box.active) return;
      if (down !== wantDown) {
        stamina = Math.max(0, stamina - 12);
        synth.play("hurt");
        this.cameras.main.shake(120, 0.008);
        this.pop(480, 250, "FLOP", "#ef4444", 22);
        return;
      }
      if (stamina < 5) {
        this.pop(480, 250, "gassed…", "#9ca3af", 18);
        return;
      }
      stamina = Math.max(0, stamina - 1.5);
      if (down) {
        me.setScale(6, 2.2).setY(380);
        synth.play("swing");
      } else {
        me.setScale(5).setY(300);
        this.tweens.add({ targets: me, y: 330, duration: 180 });
        reps++;
        synth.play("pop");
        if (reps % 6 === 0) this.pop(480, 220, quips[(reps / 6) % quips.length | 0], "#ffffff", 16);
      }
      wantDown = !wantDown;
      cue.setText(wantDown ? "DOWN" : "UP").setColor(wantDown ? "#22c55e" : "#3b82f6");
      if (reps >= need) {
        title(this, 480, 240, "ETERNAL LIFE: ATTAINED", 40, "#ffd23f").setDepth(200);
        synth.play("cheer");
        this.finish(true);
      }
    };
    const kb = this.input.keyboard;
    for (const k of ["DOWN", "S"]) kb?.on(`keydown-${k}`, () => press(true));
    for (const k of ["UP", "W"]) kb?.on(`keydown-${k}`, () => press(false));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => press(p.y > 270));
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (this.ended) return;
        stamina = Math.min(100, stamina + 0.9);
        const left = Math.max(0, (end - this.time.now) / 1000);
        life.setText(`Life expectancy: ${Math.round(80 + reps * (reps >= need ? 1e9 : 3))} years   ·   Stamina ${Math.round(stamina)}%`);
        this.hud.setText(`BURPEES ${reps}/${need}    ${left.toFixed(1)}s`);
        if (left <= 0) this.finish(false, [dir("Time. You lie face-down on the gym floor. You are, for now, still mortal.")]);
      },
    });
  }

  // ---------------------------------------------------------------- FACEBOOK TROLLING

  private fbTroll(v: "kreblis" | "mikey" = "kreblis") {
    const mk = v === "mikey";
    this.add.rectangle(480, 270, 960, 540, 0xf0f2f5);
    this.add.rectangle(480, 22, 960, 44, 0x1877f2);
    this.add.text(20, 22, "facebrook", { fontFamily: FONT, fontSize: "22px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0, 0.5);
    if (mk) this.add.text(480, 58, "SAINTS vs POMPEY BANTER (18+) · 2,412 members · You are an ADMIN 👑", { fontFamily: FONT, fontSize: "13px", color: "#1877f2", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(940, 22, mk ? "Logged in as: Mikey Nevitt (MODULATOR)" : "Logged in as: Davey Kreblis (real account)", { fontFamily: FONT, fontSize: "12px", color: "#ffffff" }).setOrigin(1, 0.5);
    this.hud.setColor("#050505").setStroke("#ffffff", 0);
    type Post = { who: string; text: string; opts: string[]; troll: number; mean: number; replies: string[] };
    const posts: Post[] = [
      {
        who: "Linda Kresswell",
        text: "Can't believe someone has parked across my drive AGAIN. Some people have no respect!!! 😡😡",
        opts: ["Hope you get it sorted Linda x", "H8 it wen ppl park on ur drive. Hav u tryd parkin on thers?? No wot I mene", "Nobody cares Linda"],
        troll: 1,
        mean: 2,
        replies: ["Linda Kresswell: Excuse me??", "Gaz Bongman: he's got a point linda", "Linda Kresswell: I don't have a car"],
      },
      {
        who: "Krelford Community Noticeboard",
        text: "LOST CAT. Answers to Mittens. Last seen near the Great Tap. Please share.",
        opts: ["Wot culler is it. Ive got a cat but it dnt anser 2 nefin. Is it urs?? It iz very fat now sorry", "Shared! Hope Mittens comes home 🙏", "Probably drank the Tap and exploded"],
        troll: 0,
        mean: 2,
        replies: ["Sue Krelby: WHAT DO YOU MEAN VERY FAT NOW", "Admin: Please DM the owner", "Sue Krelby: I'm calling the police"],
      },
      {
        who: "Gary Bongman (Krelford Independents)",
        text: "Proud to announce I'm standing for council. Time for real change in Krelford! 🗳️",
        opts: ["Good luck mate", "You're a clown and everyone knows it", "Wot r ur polisys on bin colection on fursday. Wil u put the TOWN bak on the town hall. U ave ma vote if u sey yes 2 bofe"],
        troll: 2,
        mean: 1,
        replies: ["Gary Bongman: Bins are a county matter", "Gary Bongman: the TOWN is on the agenda", "Krelford Independents have changed their manifesto"],
      },
      {
        who: "Sharon ✨ Mum of 3",
        text: "Feeling so blessed 🙏 Gym, green smoothie, school run, all before 8am. Living my best life! #blessed #grindset",
        opts: ["Nobody believes you Sharon", "Wot gym. Wot smoovie. Arsking 4 a frend (the frend iz me) (i am at the gym nevar sene u)", "Amazing hun! 💪"],
        troll: 1,
        mean: 0,
        replies: ["Sharon ✨ Mum of 3: Krunch Gym hun x", "Sharon ✨ Mum of 3: wait who is this", "Sharon ✨ Mum of 3 has blocked you"],
      },
      {
        who: "Krelford Rugby Club",
        text: "Massive win today lads! 34-12! Bring on next week 🏉🍺",
        opts: ["Wot dnt the lades luv abowt ma rugby!!", "Rugby is a sport for people who failed football", "Great result lads"],
        troll: 0,
        mean: 1,
        replies: ["Krelford Rugby Club: ???", "Big Dave (Prop): who is this", "Krelford Rugby Club: Ladies' team trials are Thursday"],
      },
      {
        who: "BBK Krelford News",
        text: "Supreme Leader's new single 'Krazy For The Krelworld' reaches 9 listens in its first week.",
        opts: ["Congratulations to the Supreme Leader", "Ash it actully a bop wot u fink?? RuneScape anthem shud be the nashunal anthem tho if u get me", "Absolute dogshit song"],
        troll: 1,
        mean: 2,
        replies: ["Drongus B. Drippin': Thank you", "Drongus B. Drippin': Wait", "Drongus B. Drippin': Kreblis is that you ??"],
      },
    ];
    const mikeyPosts: Post[] = [
      {
        who: "Pompey Dave 1898",
        text: "Saints fans are plastic. Prove me wrong. You can't.",
        opts: ["Leave it. Free speech.", "BANNED FOR LIFE. Reason: lying.", "BANNED. Reason: being from Portsmouth. Also lying."],
        troll: 1,
        mean: 2,
        replies: ["Pompey Dave 1898: lying about WHAT", "Admin (Mikey): u no wot u did", "Pompey Dave 1898 has left the group"],
      },
      {
        who: "Gaz Saintsman",
        text: "Is it just me or is the new admin a bit power mad?",
        opts: ["Good question Gaz. Let's discuss it openly.", "New rule: NO PISSING OFF OR BADMOUTHING ADMINS. THANKS, ADMIN.", "Delete the whole group."],
        troll: 1,
        mean: 2,
        replies: ["Gaz Saintsman: that rule wasn't there 5 seconds ago", "Admin (Mikey): it was always there", "Gaz Saintsman: do u lyk ur nu roole??"],
      },
      {
        who: "THE COLONEL",
        text: "Think carefully before you answer Michael! Did you eat all the pizza??",
        opts: ["Yes. I ate all the pizza.", "No.", "I spoke to the Russian hackers. They say YOU ate it."],
        troll: 2,
        mean: 0,
        replies: ["THE COLONEL: WHAT HACKERS", "THE COLONEL: I DONT EVEN HAVE A PIZZA", "THE COLONEL: ...did I eat the pizza?"],
      },
      {
        who: "Rozzle Frowley",
        text: "hi all new member here. love football. love the group. definitly not anyone you know",
        opts: ["Approve Rozzle. (It's Mikey's own fake account.)", "Ban Rozzle. Frame someone else for it.", "Post: 'Rozzle is me'"],
        troll: 0,
        mean: 2,
        replies: ["Rozzle Frowley: tnx admen", "Admin (Mikey): no problem rozzle", "Gaz Saintsman: why do you two type the same"],
      },
      {
        who: "Group Owner",
        text: "Admins. Please stop banning people for 'lying'. This is a banter page.",
        opts: ["Fair enough boss.", "Ban the owner.", "New rule: Admins are allowed to break rules (Y)"],
        troll: 2,
        mean: 1,
        replies: ["Group Owner: that's not a rule", "Admin (Mikey): it is now (Y)", "Group Owner: I'm making you vice-admin so I can keep an eye on you"],
      },
      {
        who: "End-of-Season Awards",
        text: "Voting is now open. Categories: Funniest Member, Biggest Plastic, WORST ADMIN.",
        opts: ["Vote for someone else for Worst Admin.", "Post a 'VOTE MIKEY NEVITT FOR WORST ADMIN' graphic. Make it sexy as fuck.", "Mute 100 Pompey fans 'for April Fools'."],
        troll: 1,
        mean: 2,
        replies: ["Gaz Saintsman: is he campaigning to be worst admin", "Pompey Dave 1898: I'm voting for him", "Admin (Mikey): WORST ADMIN 2 YEARS RUNNING YEEEE"],
      },
    ];
    if (mk) posts.splice(0, posts.length, ...mikeyPosts);
    const need = 4;
    let idx = 0;
    let score = 0;
    const card = this.add.container(0, 0);
    const show = () => {
      card.removeAll(true);
      if (idx >= posts.length) {
        if (score >= need) {
          title(this, 480, 270, mk ? "POWERRRRRR" : "MOST HATED MAN ON FACEBROOK", 34, "#1877f2").setDepth(200);
          this.finish(true, [dir(`${mk ? "Power moves" : "Trolls landed"}: ${score}/${posts.length}.`)]);
        } else this.finish(false, [dir(`${mk ? "Power moves" : "Trolls landed"}: ${score}/${posts.length}. Need ${need}.`)]);
        return;
      }
      const p = posts[idx];
      card.add(this.add.rectangle(480, 170, 760, 170, 0xffffff).setStrokeStyle(1, 0xdddfe2));
      card.add(this.add.circle(130, 115, 20, 0x9ca3af));
      card.add(this.add.text(160, 100, p.who, { fontFamily: FONT, fontSize: "15px", color: "#050505", fontStyle: "bold" }));
      card.add(this.add.text(160, 120, "Just now · 🌐", { fontFamily: FONT, fontSize: "11px", color: "#65676b" }));
      card.add(this.add.text(120, 150, p.text, { fontFamily: FONT, fontSize: "16px", color: "#050505", wordWrap: { width: 720 } }));
      card.add(this.add.text(120, 230, "👍 Like     💬 Comment     ↗ Share", { fontFamily: FONT, fontSize: "13px", color: "#65676b" }));
      p.opts.forEach((o, i) => {
        const y = 300 + i * 62;
        const bg = this.add.rectangle(480, y, 760, 54, 0xf0f2f5).setStrokeStyle(2, 0x1877f2).setInteractive({ useHandCursor: true });
        const t = this.add.text(110, y, `[${i + 1}] ${o}`, { fontFamily: FONT, fontSize: "14px", color: "#050505", wordWrap: { width: 740 } }).setOrigin(0, 0.5);
        bg.on("pointerdown", () => pick(i));
        card.add([bg, t]);
      });
    };
    let locked = false;
    const pick = (i: number) => {
      if (this.ended || locked || idx >= posts.length) return;
      locked = true;
      const p = posts[idx];
      card.list.filter((o) => o instanceof Phaser.GameObjects.Rectangle && (o as Phaser.GameObjects.Rectangle).input).forEach((o) => (o as Phaser.GameObjects.Rectangle).disableInteractive());
      const reply = this.add.container(0, 0);
      card.add(reply);
      if (i === p.troll) {
        score++;
        synth.play("laugh");
        this.pop(480, 260, `😡 +${80 + Math.floor(Math.random() * 300)}   💬 +${20 + Math.floor(Math.random() * 90)}`, "#e11d48", 24);
        p.replies.forEach((r, j) =>
          this.time.delayedCall(300 + j * 500, () => {
            synth.play("notify");
            reply.add(this.add.rectangle(480, 300 + j * 62, 760, 54, 0xe7f3ff).setStrokeStyle(1, 0x1877f2));
            reply.add(this.add.text(110, 300 + j * 62, r, { fontFamily: FONT, fontSize: "14px", color: "#050505" }).setOrigin(0, 0.5));
          }),
        );
      } else if (i === p.mean) {
        synth.play("banhammer");
        G.s.banRisk = Math.min(90, G.s.banRisk + 8);
        this.pop(480, 260, mk ? "TOO OBVIOUS. The owner noticed. (Ban Risk +8)" : "REPORTED. Too obvious. (Ban Risk +8)", "#ef4444", 20);
      } else {
        synth.play("tap_fail");
        this.pop(480, 260, mk ? "Fair and reasonable. Boring. Wasted." : "2 likes. Nobody noticed. Wasted.", "#65676b", 20);
      }
      this.time.delayedCall(2400, () => {
        idx++;
        locked = false;
        show();
      });
    };
    for (const [k, n] of [["ONE", 0], ["TWO", 1], ["THREE", 2]] as const) this.input.keyboard?.on(`keydown-${k}`, () => pick(n));
    this.time.addEvent({ delay: 200, loop: true, callback: () => this.hud.setText(`${mk ? "POWER MOVES" : "TROLLS LANDED"} ${score}/${need}   POST ${Math.min(idx + 1, posts.length)}/${posts.length}`) });
    show();
  }


  // ---------------------------------------------------------------- THE GIG (Twitcher Mutiny, "Reprieve")

  private gig() {
    if (!backdrop(this, "bg_gig", { depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x1a1033);
    // stage boards and lights
    this.add.rectangle(480, 352, 860, 16, 0x3b2a1a).setDepth(2);
    const lights: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 6; i++) {
      const l = this.add.circle(120 + i * 144, 70, 70, [0xff2e88, 0x5ad1ff, 0xffd23f][i % 3], 0.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
      lights.push(l);
    }
    if (this.textures.exists("hd_drummer")) this.add.image(250, 300, "hd_drummer").setDepth(4);
    if (this.textures.exists("hd_bassist")) this.add.image(720, 296, "hd_bassist").setDepth(4);
    const benn = this.add.sprite(480, 310, "spr_KREBON", 0).setScale(3).setDepth(10);
    // the crowd: everyone came
    const crowdIds = ["FLENKY", "KREZMAR", "KREBLIS", "KREZWONK", "SCROMBUS", "KREBON", "CRONGUS", "GRONNY", "MIKEY", "POLSON", "EDEN", "PROCTUS", "BOGGOR", "FOLK0", "FOLK1", "FOLK2"];
    const crowd = crowdIds
      .filter((id) => this.textures.exists(`spr_${id}`))
      .map((id, i) => {
        const c = this.add.sprite(50 + i * 58, 470 + (i % 2) * 22, `spr_${id}`, 0).setScale(2).setDepth(20 + (i % 2));
        c.setData("id", id);
        return c;
      });
    title(this, 480, 26, "TWITCHER MUTINY · LIVE AT THE KREZZ ARMS", 22, "#ffd23f").setDepth(200);
    this.add.text(480, 52, "A/D or ← → (or hold left/right of the screen) to move · SPACE / tap Benn to prance", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(200);
    synth.music("twitcher", true);
    const start = this.time.now;
    let points = 0;
    let combo = 0;
    let caught = 0;
    let pranceUntil = 0;
    let moveDir = 0;
    let holdX: number | null = null;
    const items: { img: Phaser.GameObjects.Image; landAt: number; x: number; kind: string; done: boolean }[] = [];
    const kb = this.input.keyboard;
    const keys = kb?.addKeys("A,D,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    const prance = () => {
      if (this.ended || this.box.active || this.time.now < pranceUntil - 300) return;
      pranceUntil = this.time.now + 700;
      synth.play("dodge");
      this.tweens.add({ targets: benn, y: 280, angle: 360, duration: 340, yoyo: false, onComplete: () => benn.setAngle(0) });
      this.tweens.add({ targets: benn, y: 310, delay: 340, duration: 260, ease: "Bounce.out" });
      this.pop(benn.x, 220, ["PRANCE!", "ROCKSTAR", "🤘", "WAHOOGA", "SOLO!"][Math.floor(Math.random() * 5)], "#ffd23f", 18);
    };
    kb?.on("keydown-SPACE", prance);
    this.input.on("pointerdown", (pt: Phaser.Input.Pointer) => {
      if (Math.abs(pt.x - benn.x) < 50 && Math.abs(pt.y - benn.y) < 70) prance();
      else holdX = pt.x;
    });
    this.input.on("pointermove", (pt: Phaser.Input.Pointer) => {
      if (pt.isDown && holdX !== null) holdX = pt.x;
    });
    this.input.on("pointerup", () => (holdX = null));
    const throwItem = () => {
      if (this.ended || !crowd.length) return;
      const thrower = crowd[Math.floor(Math.random() * crowd.length)];
      const kind = Math.random() < 0.55 ? "bra" : "thong";
      const key = this.textures.exists(`hd_${kind}`) ? `hd_${kind}` : "p_coin";
      const x = 140 + Math.random() * 680;
      const img = this.add.image(thrower.x, thrower.y - 30, key).setDepth(60);
      const dur = 1100 + Math.random() * 500;
      const landAt = this.time.now + dur;
      this.tweens.add({ targets: img, x, duration: dur, ease: "Linear" });
      this.tweens.add({ targets: img, y: { from: thrower.y - 30, to: 120 }, duration: dur * 0.5, ease: "Quad.out" });
      this.tweens.add({ targets: img, y: 300, delay: dur * 0.5, duration: dur * 0.5, ease: "Quad.in" });
      this.tweens.add({ targets: img, angle: 540, duration: dur });
      items.push({ img, landAt, x, kind, done: false });
      if (Math.random() < 0.25) {
        const shout = ["TUNE!", "KREBON I LOVE YOU", "PLAY WONDERWALL", "GET YOUR WAHOOGA OUT", "REACT TO MY SONG", "ENCORE!", "FAIRWEATHER!", "TOTAL WAR!"][Math.floor(Math.random() * 8)];
        this.pop(thrower.x, thrower.y - 50, shout, "#ffffff", 13);
      }
    };
    const endBtn = this.add.text(940, 22, "[ END GIG ]", { fontFamily: FONT, fontSize: "13px", color: "#ff6bb0", backgroundColor: "#000000aa", padding: { x: 6, y: 3 } }).setOrigin(1, 0).setDepth(300).setVisible(false).setInteractive({ useHandCursor: true });
    const finishGig = () => {
      if (this.ended) return;
      synth.stopMusic();
      const total = ((G.s.flags.rock_points as number) ?? 0) + points;
      G.s.flags.rock_points = total;
      G.s.coins += Math.floor(points / 5);
      title(this, 480, 200, `${points} ROCKSTAR POINTS`, 40, "#ffd23f").setDepth(300);
      this.finish(points >= 100, [dir(`Caught: ${caught}. Best combo: ${bestCombo}. Rockstar points: +${points} (total ${total}). The Krezz Arms takes a cut and gives you ${Math.floor(points / 5)} Krezzcoin.`)]);
    };
    let bestCombo = 0;
    endBtn.on("pointerdown", finishGig);
    this.time.addEvent({ delay: 900, loop: true, callback: () => (Math.random() < 0.85 ? throwItem() : undefined) });
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.ended) return;
        const now = this.time.now;
        const dt = 16;
        // movement
        moveDir = 0;
        if (keys?.A.isDown || keys?.LEFT.isDown) moveDir = -1;
        if (keys?.D.isDown || keys?.RIGHT.isDown) moveDir = 1;
        if (holdX !== null && Math.abs(holdX - benn.x) > 12) moveDir = holdX < benn.x ? -1 : 1;
        benn.x = Phaser.Math.Clamp(benn.x + moveDir * 0.32 * dt, 120, 840);
        if (now >= pranceUntil) animateWalker(benn, moveDir, 0, moveDir !== 0, now);
        // crowd bounces to the beat
        const beat = Math.sin(now / 160);
        crowd.forEach((c, i) => c.setY(470 + (i % 2) * 22 - Math.max(0, Math.sin(now / 160 + i)) * 10));
        lights.forEach((l, i) => l.setAlpha(0.1 + Math.max(0, Math.sin(now / 300 + i)) * 0.18));
        void beat;
        // catches
        for (const it of items) {
          if (it.done || now < it.landAt) continue;
          it.done = true;
          if (Math.abs(it.x - benn.x) < 46) {
            const prancing = now < pranceUntil;
            combo++;
            bestCombo = Math.max(bestCombo, combo);
            const gain = (it.kind === "thong" ? 15 : 10) * (prancing ? 2 : 1) + Math.min(20, combo);
            points += gain;
            caught++;
            synth.play("coin");
            this.pop(benn.x, 240, `+${gain}${prancing ? " PRANCE x2" : ""}${combo > 2 ? ` · combo ${combo}` : ""}`, prancing ? "#ff6bb0" : "#ffd23f", prancing ? 20 : 16);
            it.img.destroy();
          } else {
            combo = 0;
            this.tweens.add({ targets: it.img, alpha: 0, duration: 800, onComplete: () => it.img.destroy() });
          }
        }
        // timing: the song's own length when known
        const pr = synth.fileProgress();
        const elapsed = (now - start) / 1000;
        if (elapsed > 45) endBtn.setVisible(true);
        const len = pr.d || 180;
        const left = Math.max(0, len - (pr.d ? pr.t : elapsed));
        this.hud.setText(`🤘 ${points}   CAUGHT ${caught}   COMBO ${combo}   ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")} left`);
        if ((pr.d && pr.ended) || (!pr.d && elapsed > 180)) finishGig();
      },
    });
  }


  /** Not playing as Krebon: you're in the crowd at his gig, throwing underwear at the stage. */
  private gigWatch() {
    if (!backdrop(this, "bg_gig", { depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x1a1033);
    this.add.rectangle(480, 352, 860, 16, 0x3b2a1a).setDepth(2);
    const lights = [0, 1, 2, 3, 4, 5].map((i) => this.add.circle(120 + i * 144, 70, 70, [0xff2e88, 0x5ad1ff, 0xffd23f][i % 3], 0.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(3));
    if (this.textures.exists("hd_drummer")) this.add.image(250, 300, "hd_drummer").setDepth(4);
    if (this.textures.exists("hd_bassist")) this.add.image(720, 296, "hd_bassist").setDepth(4);
    const krebon = this.add.sprite(480, 310, "spr_KREBON", 0).setScale(3).setDepth(10);
    const others = ["FLENKY", "KREZMAR", "KREBLIS", "KREZWONK", "SCROMBUS", "CRONGUS", "GRONNY", "MIKEY", "POLSON", "EDEN", "PROCTUS", "BOGGOR", "FOLK0", "FOLK1"].filter((id) => id !== G.s.player && this.textures.exists(`spr_${id}`));
    const crowd = others.map((id, i) => this.add.sprite(40 + i * 64, 478 + (i % 2) * 20, `spr_${id}`, 0).setScale(2).setDepth(20 + (i % 2)));
    const me = this.add.sprite(480, 440, `spr_${G.s.player}`, 0).setScale(2.4).setDepth(40);
    this.add.text(480, 404, "YOU", { fontFamily: FONT, fontSize: "11px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(41);
    title(this, 480, 26, "TWITCHER MUTINY · KREBON LIVE AT THE KREZZ ARMS", 21, "#ffd23f").setDepth(200);
    this.add.text(480, 52, "Move A/D or drag low · SPACE / tap high to throw underwear at Krebon · F / tap a mosher to PUNCH · knock stage invaders off with a throw", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", stroke: "#000", strokeThickness: 3, align: "center", wordWrap: { width: 900 } }).setOrigin(0.5).setDepth(200);
    synth.music("twitcher", true);
    const start = this.time.now;
    let points = 0;
    let thrown = 0;
    let caught = 0;
    let target = 480;
    let pranceUntil = 0;
    let holdX: number | null = null;
    let lastThrow = 0;
    const keys = this.input.keyboard?.addKeys("A,D,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    // ---- chaos: moshers, stage invaders, flying pints
    let moshed = 0;
    let shoved = 0;
    let invaders = 0;
    let stunUntil = 0;
    const moshers: Phaser.GameObjects.Sprite[] = [];
    let invader: Phaser.GameObjects.Sprite | null = null;
    const ids = others.length ? others : ["FOLK0"];
    const shout = (x: number, y: number, t: string, c = "#ffffff") => {
      const p = this.add.text(x, y, t, { fontFamily: FONT, fontSize: "13px", color: c, backgroundColor: "#000000aa", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(150);
      this.tweens.add({ targets: p, y: y - 24, alpha: 0, delay: 1400, duration: 500, onComplete: () => p.destroy() });
    };
    const spawnMosher = () => {
      if (this.ended) return;
      const fromLeft = Math.random() < 0.5;
      const m = this.add.sprite(fromLeft ? -30 : 990, 440 + (Math.random() - 0.5) * 16, `spr_${ids[Math.floor(Math.random() * ids.length)]}`, 0).setScale(2.3).setDepth(39);
      m.setData("v", (fromLeft ? 1 : -1) * (0.22 + Math.random() * 0.14));
      m.setFlipX(!fromLeft);
      moshers.push(m);
      if (Math.random() < 0.4) shout(m.x < 0 ? 80 : 880, 400, ["MOSH PIT!", "OI OI OI", "WALL OF DEATH!", "'AVE IT!"][Math.floor(Math.random() * 4)], "#ff6b6b");
      this.time.delayedCall(1600 + Math.random() * 1800, spawnMosher);
    };
    this.time.delayedCall(2500, spawnMosher);
    const punch = () => {
      if (this.ended || this.box.active) return;
      const near = moshers.filter((m) => Math.abs(m.x - me.x) < 110).sort((x, y) => Math.abs(x.x - me.x) - Math.abs(y.x - me.x))[0];
      synth.play(near ? "punch" : "swing");
      this.tweens.add({ targets: me, x: me.x + (near ? Math.sign(near.x - me.x) * 20 : 0), duration: 70, yoyo: true });
      if (!near) return;
      moshed++;
      points += 5;
      const side = Math.sign(near.x - me.x) || 1;
      moshers.splice(moshers.indexOf(near), 1);
      this.cameras.main.shake(90, 0.006);
      this.pop(near.x, 400, ["MOSH! +5", "BOSH! +5", "SIT DOWN! +5", "GET OUT THE PIT! +5"][Math.floor(Math.random() * 4)], "#ffd23f", 18);
      this.tweens.add({ targets: near, x: near.x + side * 300, y: near.y - 140, angle: side * 720, alpha: 0, duration: 700, onComplete: () => near.destroy() });
    };
    this.input.keyboard?.on("keydown-F", punch);
    this.input.keyboard?.on("keydown-E", punch);
    const spawnInvader = () => {
      if (this.ended) return;
      if (!invader) {
        invaders++;
        const id = Math.random() < 0.35 && this.textures.exists("spr_POLSON") ? "POLSON" : ids[Math.floor(Math.random() * ids.length)];
        invader = this.add.sprite(80 + Math.random() * 800, 310, `spr_${id}`, 0).setScale(2.8).setDepth(11);
        this.tweens.add({ targets: invader, y: 296, duration: 220, yoyo: true, repeat: -1 });
        shout(krebon.x, 230, ["GET OFF MY STAGE", "Security? We don't have security.", "This is Reprieve. It's a REPRIEVE.", "Mate. Mate. MATE."][Math.floor(Math.random() * 4)], "#ffd23f");
        if (id === "POLSON") shout(invader.x, 250, "IT'S THE SMOKE MACHINE", "#ffffff");
        const inv = invader;
        this.time.delayedCall(7000, () => {
          if (invader === inv) {
            this.tweens.add({ targets: inv, alpha: 0, duration: 300, onComplete: () => inv.destroy() });
            invader = null;
          }
        });
      }
      this.time.delayedCall(9000 + Math.random() * 7000, spawnInvader);
    };
    this.time.delayedCall(8000, spawnInvader);
    // pints arcing over the crowd
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        if (this.ended) return;
        const x0 = 60 + Math.random() * 840;
        const x1 = 140 + Math.random() * 680;
        const pint = this.add.rectangle(x0, 520, 10, 16, 0xf5c542).setDepth(55);
        this.tweens.add({ targets: pint, x: x1, duration: 800 });
        this.tweens.add({ targets: pint, y: 200, duration: 400, ease: "Quad.out", yoyo: true, onComplete: () => {
          if (Math.abs(x1 - krebon.x) < 60) shout(krebon.x, 250, "OI! WHO THREW THAT", "#ff6b6b");
          synth.play("splash");
          pint.destroy();
        } });
      },
    });
    const throwUnderwear = () => {
      if (this.ended || this.box.active || this.time.now - lastThrow < 350 || this.time.now < stunUntil) return;
      lastThrow = this.time.now;
      thrown++;
      const kind = Math.random() < 0.5 ? "bra" : "thong";
      const key = this.textures.exists(`hd_${kind}`) ? `hd_${kind}` : "p_coin";
      const x = me.x;
      const img = this.add.image(me.x, me.y - 30, key).setDepth(60);
      synth.play("lob");
      this.tweens.add({ targets: img, y: { from: me.y - 30, to: 140 }, duration: 380, ease: "Quad.out" });
      this.tweens.add({ targets: img, y: 300, delay: 380, duration: 380, ease: "Quad.in" });
      this.tweens.add({ targets: img, angle: 540, duration: 760 });
      this.time.delayedCall(760, () => {
        if (this.ended) return;
        if (invader && Math.abs(invader.x - x) < 56) {
          const inv = invader;
          invader = null;
          points += 20;
          synth.play("punch_big");
          this.pop(inv.x, 230, "INVADER DOWN! +20", "#5ad35a", 20);
          this.tweens.add({ targets: inv, y: 520, angle: 360, alpha: 0, duration: 600, onComplete: () => inv.destroy() });
          img.destroy();
        } else if (Math.abs(krebon.x - x) < 52) {
          caught++;
          const prancing = this.time.now < pranceUntil;
          const gain = (kind === "thong" ? 15 : 10) * (prancing ? 2 : 1);
          points += gain;
          synth.play("coin");
          this.pop(krebon.x, 230, `KREBON CAUGHT IT! +${gain}`, "#ff6bb0", 18);
          img.destroy();
        } else {
          this.tweens.add({ targets: img, alpha: 0, duration: 700, onComplete: () => img.destroy() });
        }
      });
    };
    this.input.keyboard?.on("keydown-SPACE", throwUnderwear);
    this.input.on("pointerdown", (pt: Phaser.Input.Pointer) => {
      if (pt.y < 380) throwUnderwear();
      else if (moshers.some((m) => Math.abs(m.x - pt.x) < 50 && Math.abs(m.x - me.x) < 140)) punch();
      else holdX = pt.x;
    });
    this.input.on("pointermove", (pt: Phaser.Input.Pointer) => {
      if (pt.isDown && pt.y >= 380) holdX = pt.x;
    });
    this.input.on("pointerup", () => (holdX = null));
    const endBtn = this.add.text(940, 22, "[ LEAVE GIG ]", { fontFamily: FONT, fontSize: "13px", color: "#ff6bb0", backgroundColor: "#000000aa", padding: { x: 6, y: 3 } }).setOrigin(1, 0).setDepth(300).setVisible(false).setInteractive({ useHandCursor: true });
    const done = () => {
      if (this.ended) return;
      synth.stopMusic();
      G.s.flags.rock_points = ((G.s.flags.rock_points as number) ?? 0) + points;
      G.s.flags.saw_gig = true;
      this.finish(true, [
        dir(`You threw ${thrown} items of underwear. Krebon caught ${caught}. You decked ${moshed} moshers, got shoved ${shoved} times and saw off ${invaders} stage invaders. Rockstar points: +${points}.`),
        say("KREBON", "Thank you Krelford. You've been a strange and moist crowd."),
        dir("Polson is crying. He says it's the smoke machine. There is no smoke machine."),
      ]);
    };
    endBtn.on("pointerdown", done);
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.ended) return;
        const now = this.time.now;
        // Krebon performs: wanders the stage and prances
        if (Math.abs(target - krebon.x) < 6 || Math.random() < 0.004) target = 140 + Math.random() * 680;
        const dir0 = Math.sign(target - krebon.x);
        if (now >= pranceUntil) {
          krebon.x += dir0 * 0.18 * 16;
          animateWalker(krebon, dir0, 0, dir0 !== 0, now);
          if (Math.random() < 0.006) {
            pranceUntil = now + 700;
            this.tweens.add({ targets: krebon, y: 280, angle: 360, duration: 340, onComplete: () => krebon.setAngle(0) });
            this.tweens.add({ targets: krebon, y: 310, delay: 340, duration: 260, ease: "Bounce.out" });
          }
        }
        // you
        let mv = 0;
        if (keys?.A.isDown || keys?.LEFT.isDown) mv = -1;
        if (keys?.D.isDown || keys?.RIGHT.isDown) mv = 1;
        if (holdX !== null && Math.abs(holdX - me.x) > 10) mv = holdX < me.x ? -1 : 1;
        me.x = Phaser.Math.Clamp(me.x + mv * 0.3 * 16, 60, 900);
        // moshers barrel across the floor and shove you
        for (const m of moshers.slice()) {
          m.x += (m.getData("v") as number) * 16;
          m.y = 440 + Math.sin(now / 90 + m.x) * 6;
          if (!m.getData("hit") && Math.abs(m.x - me.x) < 34) {
            m.setData("hit", true);
            shoved++;
            stunUntil = now + 600;
            me.x = Phaser.Math.Clamp(me.x + Math.sign(m.getData("v") as number) * 110, 60, 900);
            synth.play("hurt");
            this.cameras.main.shake(120, 0.008);
            this.pop(me.x, 400, "SHOVED!", "#ff6b6b", 18);
          }
          if (m.x < -60 || m.x > 1020) {
            moshers.splice(moshers.indexOf(m), 1);
            m.destroy();
          }
        }
        animateWalker(me, mv, 0, mv !== 0, now);
        crowd.forEach((c, i) => c.setY(478 + (i % 2) * 20 - Math.max(0, Math.sin(now / 160 + i)) * 10));
        lights.forEach((l, i) => l.setAlpha(0.1 + Math.max(0, Math.sin(now / 300 + i)) * 0.18));
        const pr = synth.fileProgress();
        const elapsed = (now - start) / 1000;
        if (elapsed > 30) endBtn.setVisible(true);
        const len = pr.d || 180;
        const left = Math.max(0, len - (pr.d ? pr.t : elapsed));
        this.hud.setText(`🤘 ${points}   CAUGHT ${caught}   MOSHED ${moshed}   ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")} left`);
        if ((pr.d && pr.ended) || (!pr.d && elapsed > 180)) done();
      },
    });
  }

}
