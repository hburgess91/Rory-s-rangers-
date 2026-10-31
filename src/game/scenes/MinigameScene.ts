import Phaser from "phaser";
import type { Line } from "../../data/types";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { runChain, switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, button, title } from "../ui/theme";
import { OVER, fall, flap, randomZone, type Flappy } from "../combat/Wonk";
import { VIRAL_CHART } from "../../content/charts/viral";
import { dir, gabor, say } from "../../content/dsl";
import { arcStepAt, completeStep, maybeFinishArc } from "../systems/arcs";
import { bump } from "../systems/stats";
import { animateWalker, backdrop } from "../gfx/HD";
import { CHARACTERS, PLAYABLE_ORDER } from "../../data/characters";
import { TOUCH } from "../ui/TouchControls";

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

/** After the Champions League final, in the SanMikverse: the money, the cheque, the bank. */
const NORWICH_AFTER: Line[] = [
  say("SANMIK", "YEEE! Champions of Europe! Better than Messi! Better than Pele! Better than Heskey!"),
  say("SANMIK", "Pundit one, you're a cunt. Pundit two, you're a cunt. Pundit three… you're alright."),
  dir("The prize money is presented on a giant cheque for 'A MILLION BILLION POUNDS'. It is made out to 'SANMIK (MANAJER)'. It is written in crayon. SanMik wrote it."),
  dir("The Bank of Catford will not cash it."),
  say("SANMIK", "Right. Fine. Plan B. We rob the bank. Like Jason Statham in Crank."),
  say("SANCHZ", "YEGHHH. I'll get the truck."),
  gabor("I'll be the getaway goat. Please. Let me be the getaway goat. I'll ruin it. I always ruin it."),
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

  /** In-level minigames: what comes next, and where to go back into the dungeon. */
  private chain: string[] = [];
  private resume: { dungeon: string; room: number } | null = null;
  private startData: any = null;

  create(data: { mode: string; returnAt?: string; chain?: string[]; resume?: { dungeon: string; room: number } }) {
    this.startData = data;
    this.chain = data.chain ?? [];
    this.resume = data.resume ?? null;
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
      crocodile: () => this.crocodile(),
      cannon: () => this.cannon(),
      norwich: () => this.norwich(),
      cam2cam: () => this.cam2cam(),
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
    if (this.resume) {
      // part of a level: win to carry on, lose to go again
      if (success && this.mode === "norwich") lines.push(...NORWICH_AFTER);
      if (!success) lines.push(dir("Again. SanMik has written a new law: the final gets replayed until Norwich win."));
      await this.box.play(lines);
      this.cameras.main.fadeOut(400);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        if (!success) return this.scene.restart(this.startData);
        runChain(this, this.chain, this.resume!);
      });
      return;
    }
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

  // ---------------------------------------------------------------- CAM2CAM (you are SanMik)

  /** SanMik on webcam. Chat her up with lines from the back catalogue, then wonk in sync until you both KREZZ. */
  private cam2cam() {
    const HER = "SexyChanzzz_xx";
    // the two webcam windows
    this.add.rectangle(480, 270, 960, 540, 0x0f0a1e);
    title(this, 480, 20, "CAM2CAM ♥ krelchat.krw", 20, "#f472b6");
    const cam = (x: number, bgKey: string, label: string) => {
      const c = this.add.container(x, 175);
      if (this.textures.exists(bgKey)) {
        const img = this.add.image(0, 0, bgKey);
        img.setScale(Math.max(420 / img.width, 250 / img.height));
        c.add(img);
      } else c.add(this.add.rectangle(0, 0, 420, 250, 0x1e1b4b));
      const m = this.make.graphics({}).fillRect(x - 210, 50, 420, 250);
      c.setMask(m.createGeometryMask());
      this.add.rectangle(x, 175, 424, 254).setStrokeStyle(3, 0xf472b6);
      this.add.text(x - 205, 54, label, { fontFamily: FONT, fontSize: "11px", color: "#fff", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setDepth(20);
      const rec = this.add.text(x + 205, 54, "● LIVE", { fontFamily: FONT, fontSize: "11px", color: "#ef4444", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(1, 0).setDepth(20);
      this.tweens.add({ targets: rec, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
      return c;
    };
    const leftCam = cam(245, "cam_sanmik", "SanMik_Official (verified rapper)");
    const rightCam = cam(715, "cam_her", `${HER} · 29 · Lewisham`);
    const mik = this.add.image(0, 70, this.textures.exists("spr_SANMIK") ? "spr_SANMIK" : "spr_MIKEY", 0).setScale(4.2).setOrigin(0.5, 1);
    leftCam.add(mik);
    const her = this.textures.exists("p_camgirl") ? this.add.image(0, 125, "p_camgirl").setScale(1.9).setOrigin(0.5, 1) : this.add.image(0, 125, "spr_FOLK1", 0).setScale(4).setOrigin(0.5, 1);
    rightCam.add(her);
    this.tweens.add({ targets: her, y: 121, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.inOut" });
    // interest meter
    let interest = 20;
    const meterBg = this.add.rectangle(715, 316, 300, 12, 0x3b0764).setStrokeStyle(2, 0xf472b6);
    void meterBg;
    const meter = this.add.rectangle(565, 316, 60, 10, 0xf472b6).setOrigin(0, 0.5);
    const meterLbl = this.add.text(560, 316, "♥ INTEREST", { fontFamily: FONT, fontSize: "11px", color: "#f9a8d4" }).setOrigin(1, 0.5);
    void meterLbl;
    const setInterest = (v: number) => {
      interest = Phaser.Math.Clamp(v, 0, 100);
      meter.setSize(3 * interest, 10);
    };
    // the chat log
    this.add.rectangle(480, 430, 900, 190, 0x111827, 0.95).setStrokeStyle(2, 0x6b21a8);
    const log: Phaser.GameObjects.Text[] = [];
    const push = (who: string, text: string, color: string) => {
      for (const l of log) l.y -= 22;
      const t = this.add.text(50, 398, `${who}: ${text}`, { fontFamily: FONT, fontSize: "13px", color, wordWrap: { width: 860 } });
      log.push(t);
      while (log.length > 3) log.shift()?.destroy();
      synth.play("notify");
    };
    const pop = (x: number, t: string) => this.pop(x, 120, t, "#f9a8d4", 22);
    type Opt = [string, number, string];
    const ROUNDS: { her: string; opts: Opt[] }[] = [
      { her: "heyyy 👋 u look familiar", opts: [["yee", 8, "lol. yee to u too 😂"], ["Yee. I'm a famus rapper.", 22, "OMG wait r u actually?? 😳"], ["I remember the day we met. Because I had just bought a pet. It was a hamster, named after you.", 5, "we literally met 10 seconds ago"]] },
      { her: "so what do u do", opts: [["I'm the manager of Norwich. We are even better than Brazil. We would beat them 48-0.", 12, "ok football boy 😏"], ["I rap so hard. I'm the greatest rappers ever. Have you seen the fucking weather?", 15, "lmaooo it IS shit out tbf"], ["Mostly hot tubs.", 6, "...in them or near them?"]] },
      { her: "describe urself in 3 words 😘", opts: [["Solid. No cunt touches me.", 10, "thats more than 3 words but ok 😂"], ["SanMik is so sexy.", 18, "3rd person 😭 weirdly works"], ["Also did I mention that I'm a ninja?", 14, "u did NOT mention that. go on then"]] },
      { her: "whats ur best feature 👀", opts: [["I am also best dressed. Gok Wan is the second best dressed.", 14, "gok wan WISHES"], ["My willy wants your fanny like a hand in glove.", 16, "😳😳 bit forward… keep going"], ["From now on SanMik's your god.", -10, "erm. no."]] },
      { her: "what would u do if u were here rn", opts: [["Wet pizza (in the hot tub). Dreams come true (in the hot tub).", 12, "i dont have a hot tub but i have a bath 👀"], ["Your fanny juice will taste so good. Like fish fingers.", 10, "...fish fingers?? 🐟 weirdly into it"], ["Fifteen cop cars on my tail. Got a helicopter and a tank.", 6, "is that a yes or"]] },
      { her: "ok last chance to impress me 😏", opts: [["Yee. I'm a famus rapper.", 30, "say less 🔥🔥🔥"], ["I'm so famous and you're so pricks.", 6, "we?? there's one of me"], ["Yee I love you.", 20, "babe weve known each other 4 minutes… i love u too 😭"]] },
    ];
    let btns: Phaser.GameObjects.Container[] = [];
    const clearBtns = () => {
      btns.forEach((b) => b.destroy());
      btns = [];
    };
    const round = (i: number) => {
      if (i >= ROUNDS.length) {
        clearBtns();
        if (interest >= 60) this.time.delayedCall(900, () => acapella());
        else {
          push("*", `${HER} has disconnected.`, "#9ca3af");
          this.finish(false, [say("SANMIK", "She's buffering. She's definitely just buffering."), dir("She is not buffering.")]);
        }
        return;
      }
      const R = ROUNDS[i];
      push(HER, "is typing…", "#9ca3af");
      this.time.delayedCall(900, () => {
        log[log.length - 1]?.setText(`${HER}: ${R.her}`).setColor("#f9a8d4");
        synth.play("notify");
        const opts = Phaser.Utils.Array.Shuffle([...R.opts]);
        opts.forEach((o, k) => {
          btns.push(
            button(this, 480, 448 + k * 30, o[0], () => {
              clearBtns();
              push("SanMik_Official", o[0], "#b0c4ff");
              synth.shout("yee", 0.6);
              this.tweens.add({ targets: mik, y: 64, yoyo: true, duration: 140 });
              this.time.delayedCall(1000, () => {
                push(HER, o[2], "#f9a8d4");
                setInterest(interest + o[1]);
                if (o[1] >= 14) pop(715, "♥♥♥");
                else if (o[1] < 0) pop(715, "🙄");
                this.time.delayedCall(1300, () => round(i + 1));
              });
            }, { w: 860, h: 26, size: 12 }),
          );
        });
      });
    };
    // ----- the acapella: "SanMik Should've Gone Viral", Guitar Hero style
    const swapArt = (img: Phaser.GameObjects.Image, key: string, h: number, bottomY: number) => {
      if (!this.textures.exists(key)) return;
      img.setTexture(key, key.startsWith("spr_") ? 0 : undefined).setOrigin(0.5, 1);
      img.setScale(h / img.height).setY(bottomY);
    };
    const fling = (camX: number, color: number, what: string) => {
      const rag = this.add.rectangle(camX, 190, 40, 26, color).setDepth(45);
      this.tweens.add({ targets: rag, x: camX + (Math.random() < 0.5 ? -260 : 260), y: -40, angle: 720, duration: 900, ease: "Quad.out", onComplete: () => rag.destroy() });
      this.pop(camX, 110, what, "#fde68a", 18);
    };
    const censorBar = (parent: Phaser.GameObjects.Container, x: number, y: number, w: number) => {
      const c = this.add.container(x, y);
      c.add(this.add.rectangle(0, 0, w, 22, 0x000000));
      c.add(this.add.text(0, 0, "CENSORED", { fontFamily: "Impact, sans-serif", fontSize: "13px", color: "#fff" }).setOrigin(0.5));
      parent.add(c);
      c.setScale(0.1);
      this.tweens.add({ targets: c, scale: 1, duration: 250, ease: "Back.out" });
    };
    const acapella = () => {
      push(HER, "wait… will u sing for me? acapella 🎤🥺", "#f9a8d4");
      this.time.delayedCall(1200, () => {
        push("SanMik_Official", "Yee. Stand back.", "#b0c4ff");
        synth.shout("yee", 1);
        this.time.delayedCall(800, () => {
          fling(245, 0x1e3a8a, "*RIPS SHIRT OFF*");
          swapArt(mik, "p_sm_shirtless", 230, 125);
          this.tweens.add({ targets: mik, scaleX: mik.scaleX * 1.04, yoyo: true, repeat: -1, duration: 180 });
          this.time.delayedCall(1100, () => startAcapella());
        });
      });
    };
    const startAcapella = () => {
      for (const l of log) l.setVisible(false);
      const LANES = [372, 410, 448, 486];
      const KEYS = ["D", "F", "J", "K"];
      const COLS = [0x22c55e, 0xef4444, 0xfacc15, 0x60a5fa];
      const HIT_X = 150;
      const LEAD = 1.6;
      const lay = this.add.container(0, 0).setDepth(35);
      LANES.forEach((y, i) => {
        lay.add(this.add.rectangle(530, y, 820, 30, COLS[i], 0.12));
        lay.add(this.add.circle(HIT_X, y, 15, 0x000000, 0.5).setStrokeStyle(3, COLS[i]));
        lay.add(this.add.text(HIT_X - 50, y, KEYS[i], { fontFamily: FONT, fontSize: "16px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5));
      });
      const lyric = this.add.text(530, 350, "🎤 SANMIK SHOULD'VE GONE VIRAL (acapella, live, shirtless)", { fontFamily: FONT, fontSize: "12px", color: "#f9a8d4" }).setOrigin(0.5).setDepth(36);
      const score = this.add.text(900, 350, "", { fontFamily: FONT, fontSize: "12px", color: "#fff" }).setOrigin(1, 0.5).setDepth(36);
      type N = { t: number; lane: number; c: Phaser.GameObjects.Arc; done: boolean };
      const notes: N[] = VIRAL_CHART.map(([t, lane]) => ({ t, lane, c: this.add.circle(-50, LANES[lane], 12, COLS[lane]).setStrokeStyle(2, 0xffffff).setDepth(37), done: false }));
      let hits = 0;
      let misses = 0;
      let combo = 0;
      let herStage = 0;
      let hisStage = 0;
      let artifactUntil = 0;
      let over = false;
      const t0 = this.time.now;
      synth.music("viral", true);
      const el = synth.musicEl();
      const songT = () => (el && !el.paused ? el.currentTime : (this.time.now - t0) / 1000);
      const HER_YES = ["mmm", "mmm fuck", "🔥🔥", "omg", "sing it 😩", "mmm FUCK", "ur so talented", "viral tbh"];
      const HER_NO = ["😬", "lol", "babe…", "was that a sneeze", "ur voice cracked 😭"];
      // a bum note does something terrible to the audio
      const artifact = () => {
        const now = this.time.now;
        if (now < artifactUntil || !el) return;
        const kind = Math.floor(Math.random() * 4);
        el.preservesPitch = false;
        if (kind === 0) {
          el.playbackRate = 1.75;
          this.pop(245, 100, "*CHIPMUNK*", "#fde047", 16);
          artifactUntil = now + 420;
          this.time.delayedCall(320, () => (el.playbackRate = 1));
        } else if (kind === 1) {
          el.playbackRate = 0.5;
          this.pop(245, 100, "*DEMON VOICE*", "#ef4444", 16);
          artifactUntil = now + 650;
          this.time.delayedCall(450, () => (el.playbackRate = 1));
        } else if (kind === 2) {
          el.currentTime = Math.max(0, el.currentTime - 0.35);
          this.pop(245, 100, "*SKIPS*", "#93c5fd", 16);
          artifactUntil = now + 500;
        } else {
          synth.play("fart");
          el.volume = Math.max(0, el.volume * 0.2);
          const v = el.volume / 0.2;
          this.pop(245, 100, "*VOICE CRACK*", "#a3e635", 16);
          artifactUntil = now + 450;
          this.time.delayedCall(300, () => (el.volume = Math.min(1, v)));
        }
        this.cameras.main.shake(80, 0.004);
      };
      const judge = (lane: number) => {
        if (over || this.box.active) return;
        const st = songT();
        let best: N | null = null;
        for (const n of notes) if (!n.done && n.lane === lane && Math.abs(n.t - st) < 0.16 && (!best || Math.abs(n.t - st) < Math.abs(best.t - st))) best = n;
        const ring = this.add.circle(HIT_X, LANES[lane], 16, COLS[lane], 0.6).setDepth(38);
        this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 200, onComplete: () => ring.destroy() });
        if (!best) return;
        best.done = true;
        best.c.destroy();
        hits++;
        combo++;
        const perfect = Math.abs(best.t - st) < 0.06;
        this.pop(HIT_X + 40, LANES[lane] - 14, perfect ? "PERFECT" : "YEE", perfect ? "#86efac" : "#ffffff", 12);
        this.tweens.add({ targets: mik, angle: { from: -6, to: 6 }, duration: 90, yoyo: true });
        if (hits % 6 === 0) this.pop(715, 120, HER_YES[Math.floor(Math.random() * HER_YES.length)], "#f9a8d4", 20);
        if (combo % 25 === 0) this.pop(245, 120, `${combo} COMBO! YEEEE`, "#fde047", 18);
        stages();
      };
      const stages = () => {
        const n = notes.length;
        if (hisStage === 0 && hits >= n * 0.25) {
          hisStage = 1;
          fling(245, 0x6b7280, "*TRACKIES OFF*");
          swapArt(mik, "p_sm_boxers", 230, 125);
        }
        if (herStage === 0 && hits >= n * 0.35) {
          herStage = 1;
          fling(715, 0xf472b6, "*JUMPER OFF*");
          if (this.textures.exists("p_camgirl_bra")) her.setTexture("p_camgirl_bra");
          this.pop(715, 140, "mmm fuck 😩", "#f9a8d4", 22);
        }
        if (hisStage === 1 && hits >= n * 0.55) {
          hisStage = 2;
          fling(245, 0xd97706, "*BOXERS OFF*");
          censorBar(leftCam, 0, 125 - 230 * 0.32, 76);
        }
        if (herStage === 1 && hits >= n * 0.65) {
          herStage = 2;
          fling(715, 0x111111, "*BRA OFF*");
          censorBar(rightCam, 6, her.y - her.displayHeight * 0.414, 104);
          this.pop(715, 140, "MMMM FUCK", "#f9a8d4", 24);
        }
      };
      const keyMap: Record<string, number> = { D: 0, F: 1, J: 2, K: 3, A: 0, S: 1, L: 3, LEFT: 0, DOWN: 1, UP: 2, RIGHT: 3 };
      const onKey = (e: KeyboardEvent) => {
        const k = e.key.toUpperCase().replace("ARROW", "");
        if (k in keyMap) judge(keyMap[k]);
      };
      this.input.keyboard?.on("keydown", onKey);
      const onTap = (p: Phaser.Input.Pointer) => {
        if (p.y < 350) return;
        let best = 0;
        LANES.forEach((y, i) => Math.abs(p.y - y) < Math.abs(p.y - LANES[best]) && (best = i));
        judge(best);
      };
      this.input.on("pointerdown", onTap);
      const tick = this.time.addEvent({ delay: 16, loop: true, callback: () => {
        if (over) return;
        const st = songT();
        for (const n of notes) {
          if (n.done) continue;
          const x = HIT_X + ((n.t - st) / LEAD) * 780;
          n.c.setX(x).setVisible(x < 950);
          if (st - n.t > 0.18) {
            n.done = true;
            this.tweens.add({ targets: n.c, alpha: 0, y: n.c.y + 10, duration: 200, onComplete: () => n.c.destroy() });
            misses++;
            combo = 0;
            artifact();
            if (misses % 5 === 0) this.pop(715, 120, HER_NO[Math.floor(Math.random() * HER_NO.length)], "#9ca3af", 18);
          }
        }
        const total = hits + misses;
        score.setText(`HITS ${hits}  MISSES ${misses}  ${total ? Math.round((hits / total) * 100) : 100}%`);
        this.hud.setText(`${Math.max(0, Math.ceil(80 - st))}s`);
        if (st >= 80.6 || (el && el.ended) || notes.every((nn) => nn.done)) finishSong();
      } });
      const finishSong = () => {
        if (over) return;
        over = true;
        tick.remove();
        this.input.keyboard?.off("keydown", onKey);
        this.input.off("pointerdown", onTap);
        if (el) el.playbackRate = 1;
        synth.stopMusic();
        lay.destroy(true);
        lyric.destroy();
        score.destroy();
        notes.forEach((n) => n.c.active && n.c.destroy());
        for (const l of log) l.setVisible(true);
        const acc = hits / Math.max(1, hits + misses);
        // whatever happened, everyone's ended up in their pants (or less)
        while (hisStage < 2 || herStage < 2) {
          hits = Math.max(hits, notes.length);
          stages();
        }
        push(HER, acc > 0.7 ? "that was… the best thing ive ever heard 😩 mmm fuck" : acc > 0.4 ? "ur voice cracked like 40 times. weirdly into it" : "babe that was a war crime. but ur fit so", "#f9a8d4");
        this.time.delayedCall(1600, () => wonk());
      };
    };
    // ----- the wonk
    const wonk = () => {
      push(HER, "ok ur actually so fit. wanna… 👀", "#f9a8d4");
      this.time.delayedCall(1100, () => {
        push("SanMik_Official", "YEEEEEEE", "#b0c4ff");
        synth.shout("yee", 1);
        this.time.delayedCall(900, () => startWonk());
      });
    };
    const startWonk = () => {
      // both cameras: CENSORED
      const bars = [245, 715].map((x) => {
        const c = this.add.container(x, 200).setDepth(30);
        c.add(this.add.rectangle(0, 0, 220, 70, 0x000000));
        c.add(this.add.text(0, 0, "CENSORED", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#fff" }).setOrigin(0.5));
        return c;
      });
      const lblL = this.add.text(245, 248, "*wonk wonk wonk*", { fontFamily: FONT, fontSize: "14px", color: "#b0c4ff", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(31);
      const lblR = this.add.text(715, 248, "*female wonk*", { fontFamily: FONT, fontSize: "14px", color: "#f9a8d4", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(31);
      // the gauge, between the cams
      const GX = 480;
      const GT = 70;
      const GH = 240;
      this.add.rectangle(GX, GT + GH / 2, 30, GH + 6, 0x000000).setStrokeStyle(2, 0xffffff).setDepth(40);
      let zone = randomZone();
      const zoneR = this.add.rectangle(GX, 0, 26, 10, 0x22c55e, 0.6).setDepth(41);
      const placeZone = () => zoneR.setPosition(GX, GT + GH * (1 - (zone.lo + zone.hi) / 2)).setSize(26, GH * (zone.hi - zone.lo));
      placeZone();
      const fill = this.add.rectangle(GX, GT + GH, 22, 0, 0xffd23f).setOrigin(0.5, 1).setDepth(42);
      this.add.text(GX, GT - 14, "KREZZ ZONE", { fontFamily: FONT, fontSize: "10px", color: "#86efac" }).setOrigin(0.5).setDepth(42);
      const g: Flappy = { gauge: 0.1, vel: 0 };
      let mine = 0;
      let hers = 0;
      let left = 30;
      let done = false;
      this.add.rectangle(245, 288, 204, 14, 0x000000, 0.7).setDepth(41);
      const barMe = this.add.rectangle(145, 288, 0, 10, 0x60a5fa).setOrigin(0, 0.5).setDepth(42);
      this.add.rectangle(715, 288, 204, 14, 0x000000, 0.7).setDepth(41);
      const barHer = this.add.rectangle(615, 288, 0, 10, 0xf472b6).setOrigin(0, 0.5).setDepth(42);
      this.add.text(245, 272, "SANMIK →  KREZZ", { fontFamily: FONT, fontSize: "10px", color: "#b0c4ff" }).setOrigin(0.5).setDepth(42);
      this.add.text(715, 272, "CHANZ →  FEMALE KREZZ", { fontFamily: FONT, fontSize: "10px", color: "#f9a8d4" }).setOrigin(0.5).setDepth(42);
      push("*", "TAP / SPACE to wonk. Keep the gauge in the KREZZ ZONE. You both need to get there.", "#86efac");
      const tap = () => {
        if (done) return;
        flap(g);
        synth.play(Math.random() < 0.5 ? "slurp" : "select");
      };
      this.mash(tap);
      const moans = ["*wonk*", "yee", "YEE", "uhh yee", "mm fuck yes"];
      const herMoans = ["mmm", "SanMik 😩", "dont stop", "*female wonk*", "famus rapper 😩"];
      const timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
        if (done) return;
        if (--left <= 0) {
          done = true;
          push(HER, "omg u took too long… im off 😴", "#f9a8d4");
          this.finish(false, [say("SANMIK", "Lag. That was lag. Krelchat lag.")]);
        }
      } });
      const tick = this.time.addEvent({ delay: 16, loop: true, callback: () => {
        if (done) return;
        fall(g, 16);
        fill.setSize(22, GH * g.gauge);
        const inZone = g.gauge >= zone.lo && g.gauge <= zone.hi;
        fill.setFillStyle(inZone ? 0x22c55e : g.gauge > OVER ? 0xef4444 : 0xffd23f);
        if (inZone) {
          mine += 16 / 90;
          hers += 16 / (80 + Math.random() * 40);
          if (Math.random() < 0.02) this.pop(245, 230, moans[Math.floor(Math.random() * moans.length)], "#b0c4ff", 14);
          if (Math.random() < 0.02) this.pop(715, 230, herMoans[Math.floor(Math.random() * herMoans.length)], "#f9a8d4", 14);
        } else if (g.gauge > OVER) {
          mine = Math.max(0, mine - 0.4);
          if (Math.random() < 0.05) this.pop(245, 230, "TOO MUCH", "#ef4444", 14);
        }
        barMe.setSize(Math.min(200, mine * 2), 10);
        barHer.setSize(Math.min(200, hers * 2), 10);
        bars.forEach((b, k) => b.setPosition([245, 715][k] + (inZone ? Math.sin(this.time.now / 40 + k) * 6 : 0), 200 + (inZone ? Math.cos(this.time.now / 55 + k) * 4 : 0)));
        // a new zone every so often, to keep you honest
        if (Math.random() < 0.004) {
          zone = randomZone();
          placeZone();
        }
        this.hud.setText(`${left}s`);
        if (mine >= 100 && hers >= 100) {
          done = true;
          timer.remove();
          tick.remove();
          krezz(bars, lblL, lblR);
        } else if (mine >= 100) hers += 0.3; // she's nearly there
        else if (hers >= 100) mine += 0.3;
      } });
    };
    const krezz = async (bars: Phaser.GameObjects.Container[], lblL: Phaser.GameObjects.Text, lblR: Phaser.GameObjects.Text) => {
      lblL.destroy();
      lblR.destroy();
      synth.play("boom");
      synth.shout("yee", 1);
      this.cameras.main.flash(500, 255, 255, 255);
      this.cameras.main.shake(500, 0.02);
      const big = (x: number, t: string, c: string) => {
        const tx = this.add.text(x, 160, t, { fontFamily: "Impact, sans-serif", fontSize: "52px", color: c, stroke: "#000", strokeThickness: 8 }).setOrigin(0.5).setDepth(60).setScale(0.2);
        this.tweens.add({ targets: tx, scale: 1, angle: { from: -10, to: 10 }, duration: 400, ease: "Back.out" });
      };
      big(245, "KREZZ!!", "#ffffff");
      this.time.delayedCall(350, () => big(715, "FEMALE KREZZ!!", "#f9a8d4"));
      bars.forEach((b, k) => this.tweens.add({ targets: b, y: -100, angle: k ? 40 : -40, duration: 900, ease: "Quad.in" }));
      for (let i = 0; i < 40; i++) {
        const c = this.add.text(Math.random() * 960, -20, ["💦", "✨", "💖", "🎉"][i % 4], { fontSize: "22px" }).setDepth(55);
        this.tweens.add({ targets: c, y: 560, angle: 360, duration: 1500 + Math.random() * 1500, delay: i * 40 });
      }
      await new Promise<void>((r) => this.time.delayedCall(2600, () => r()));
      this.finish(true, [
        say(HER, "SanMik you're so sexy. Sexy. Sex me."),
        say("SANMIK", "Yee. I know that. The girls know that. We all know that."),
        say(HER, "same time tmrw? 😘"),
        say("SANMIK", "Can't babe. Got to save Catford. I'm a famus rapper."),
        dir(`${HER} has logged off. She has left a five-star review on Krelchat: 'genuinely a famous rapper apparently. 10/10 would krezz again'.`),
        say("SANCHZ", "(from the doorway, where he has been the whole time) YEGHHH."),
        say("SANMIK", "SANCHZ. HOW LONG HAVE YOU BEEN THERE."),
        say("SANCHZ", "Since 'famus rapper'. Both times."),
      ]);
    };
    this.box
      .play([
        dir("Begour's café caravan has Wi-Fi. SanMik has borrowed the laptop. He is wearing his best afro and a small amount of aftershave on his eyebrows. He's logging into CAM2CAM."),
        say("SANMIK", "Yee. Give me five minutes, lads. I've got a date. You're me now. Don't fuck it up."),
        dir("YOU ARE SANMIK. Pick your chat-up lines. Get her interest up to the line (60%). Then… well. You'll see."),
      ])
      .then(() => round(0));
  }

  // ---------------------------------------------------------------- MANIJER OF NORRICH

  /** Champions League final, 89th minute, 2-1 down. SanMik subs himself on. Two goals in the time left. */
  private norwich() {
    synth.music("norwich", true);
    const g = this.add.graphics();
    g.fillStyle(0x2f8f3a, 1).fillRect(0, 0, 960, 540);
    for (let i = 0; i < 8; i++) g.fillStyle(i % 2 ? 0x2a8034 : 0x34993f, 1).fillRect(0, i * 68, 960, 68);
    g.lineStyle(4, 0xffffff, 0.9).strokeRect(300, 70, 360, 120).strokeRect(400, 70, 160, 50);
    g.fillStyle(0xffffff, 1).fillCircle(480, 330, 4);
    // goal
    const GL = 380;
    const GR = 580;
    g.lineStyle(6, 0xffffff, 1).strokeRect(GL, 40, GR - GL, 32);
    g.lineStyle(1, 0xdddddd, 0.6);
    for (let x = GL; x <= GR; x += 12) g.lineBetween(x, 40, x, 72);
    title(this, 480, 18, "NORWICH UNITED 1 – 2 REAL MADRID   ·   CHAMPIONS LEAGUE FINAL", 16, "#ffd23f").setDepth(100);
    const keeper = this.add.sprite(480, 78, "spr_FOLK3", 0).setScale(2.4).setTint(0xffffff).setDepth(20);
    const mik = this.add.sprite(480, 420, this.textures.exists("spr_SANMIK") ? "spr_SANMIK" : "spr_MIKEY", 0).setScale(3).setDepth(20);
    const ball = this.add.circle(480, 380, 8, 0xffffff).setStrokeStyle(2, 0x111111).setDepth(25);
    const arrow = this.add.triangle(480, 330, 0, 14, 8, 0, 16, 14, 0xffd23f).setDepth(26);
    const aimLine = this.add.rectangle(480, 96, 4, 20, 0xffd23f).setDepth(26);
    let goals = 0;
    let left = 12;
    let shooting = false;
    let started = false;
    let aimT = 0;
    let kT = 0;
    const score = () => this.hud.setText(`NORWICH ${1 + goals} – 2 MADRID      ${goals >= 1 ? "" : "NEED 2 GOALS"}      ${left}s LEFT (in the 89th minute)`);
    const commentary = ["SANMIK HAS SUBBED HIMSELF ON", "HE'S STILL GOT TOILET PAPER ON HIS SHOE", "WHAT IS HE DOING", "HE'S SMOKING ON THE PITCH", "THE REFEREE HAS GIVEN UP"];
    const tick = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!started || this.ended) return;
        aimT += 0.045;
        kT += 0.032 + goals * 0.012;
        const ax = 480 + Math.sin(aimT) * 120;
        aimLine.x = ax;
        arrow.x = ax;
        if (!shooting) keeper.x = 480 + Math.sin(kT * 1.7) * 80 + Math.sin(kT * 4.3) * 18;
      },
    });
    const shoot = () => {
      if (!started || shooting || this.ended || this.box.active) return;
      shooting = true;
      const tx = aimLine.x;
      synth.play("hit");
      mik.y -= 10;
      this.time.delayedCall(120, () => (mik.y += 10));
      this.tweens.add({
        targets: ball,
        x: tx,
        y: 58,
        duration: 380,
        ease: "Quad.out",
        onComplete: () => {
          const saved = Math.abs(keeper.x - tx) < 34;
          if (saved) {
            synth.play("tap_fail");
            this.pop(tx, 120, ["SAVED", "OFF HIS FACE", "KEEPER EATS IT", "TERRIBLE"][Math.floor(Math.random() * 4)], "#ef4444", 22);
          } else {
            goals++;
            synth.play("cheer");
            this.cameras.main.shake(200, 0.01);
            this.pop(tx, 120, goals === 1 ? "GOAL!!! 2-2!!" : "GOAL!!!! 3-2!!!!", "#ffd23f", 30);
            this.pop(480, 250, commentary[goals + 1], "#ffffff", 16);
          }
          score();
          this.time.delayedCall(450, () => {
            ball.setPosition(480, 380);
            shooting = false;
            if (goals >= 2) {
              tick.remove();
              clock.remove();
              this.finish(true, [dir("FULL TIME. NORWICH 3 – 2 REAL MADRID. Two goals in the last ten seconds, from the manager, who was in the toilet for the first eighty-nine minutes.")]);
            }
          });
        },
      });
    };
    const clock = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!started || this.ended || this.box.active) return;
        left--;
        score();
        if (left === 6) this.pop(480, 250, commentary[Math.floor(Math.random() * commentary.length)], "#ffffff", 16);
        if (left <= 0) {
          tick.remove();
          clock.remove();
          this.finish(false, [dir("FULL TIME. NORWICH 1 – 2 REAL MADRID (or thereabouts).")]);
        }
      },
    });
    this.mash(shoot);
    score();
    this.box
      .play([
        dir("89th minute. Norwich 1 – 2 Real Madrid. The star striker is being carried off on a stretcher. There are no substitutes left."),
        dir("The Norwich manager is not in the dugout. The Norwich manager is in the stadium toilet."),
        say("SANMIK", "(running out of the tunnel, doing up his trousers) Yee! I'll do it! Put me on! I'm the manager, I can do what I fucking want, it's the law what I wrote!"),
        dir("HOW TO PLAY: the yellow marker sweeps across the goal. TAP / SPACE to shoot. Don't hit the keeper. Score TWO before the whistle."),
      ])
      .then(() => {
        started = true;
        this.pop(480, 250, commentary[0], "#ffffff", 18);
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

  // ---------------------------------------------------------------- DO THE CROCODILE (SanMik, "Jerk My Gherk")

  private crocodile() {
    const BPM = 89;
    const BEAT = 60 / BPM;
    const PHASE = 0.017;
    const SPEED = 260; // px per second along the lane
    const HIT_X = 150;
    if (!backdrop(this, "bg_gig", { dim: 0.35, depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x10241a);
    title(this, 480, 22, "DO THE CROCODILE", 26, "#86efac").setDepth(200);
    this.add.text(480, 46, "SanMik ft. the entire cabinet · ← / A = LEFT HAND · → / D = RIGHT HAND · ↑ / W / SPACE = CHOMP", { fontFamily: FONT, fontSize: "11px", color: "#ffffff", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(200);
    // ---- the dancers: everyone, in a line, extremely serious
    const me = G.s.player;
    const crew = [...PLAYABLE_ORDER.filter((id) => id !== me), "POLSON", "PROCTUS"].filter((id) => this.textures.exists(`spr_${id}`));
    type Dancer = { spr: Phaser.GameObjects.Sprite; skin: number; l: number; r: number; you: boolean };
    const dancers: Dancer[] = [];
    const back = crew.slice(0, 10);
    back.forEach((id, i) => {
      const x = 90 + i * (780 / Math.max(1, back.length - 1));
      const spr = this.add.sprite(x, 300 + (i % 2) * 18, `spr_${id}`, 0).setScale(2.2).setDepth(20 + (i % 2));
      dancers.push({ spr, skin: CHARACTERS[id]?.look?.skin ?? 0xf0b095, l: 0, r: 0, you: false });
    });
    const meSpr = this.add.sprite(480, 410, `spr_${me}`, 0).setScale(3).setDepth(40);
    dancers.push({ spr: meSpr, skin: CHARACTERS[me]?.look?.skin ?? 0xf0b095, l: 0, r: 0, you: true });
    this.add.text(480, 448, "YOU", { fontFamily: FONT, fontSize: "11px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(41);
    const arms = this.add.graphics().setDepth(45);
    // arm pose: 0 = down by your side, 1 = jaws open overhead, 2 = CHOMP (jaws shut)
    const drawArms = () => {
      arms.clear();
      for (const d of dancers) {
        const h = d.spr.displayHeight;
        const top = d.spr.y - h / 2;
        const sx = d.spr.x;
        const arm = (side: -1 | 1, pose: number) => {
          if (pose <= 0.02) return; // arms down: the sprite's own arms
          const shoulderX = sx + side * h * 0.13;
          const shoulderY = top + h * 0.34;
          // jaw: straight up, opening apart as `pose` nears 1, snapping shut at 2
          const open = pose >= 2 ? 0 : Math.min(1, pose);
          const ang = -Math.PI / 2 + side * (0.08 + open * 0.6);
          const len = h * 0.55 * Math.min(1, pose);
          const ex = shoulderX + Math.cos(ang) * len;
          const ey = shoulderY + Math.sin(ang) * len;
          arms.lineStyle(h * 0.11, 0x000000, 1).lineBetween(shoulderX, shoulderY, ex, ey);
          arms.lineStyle(h * 0.075, d.skin, 1).lineBetween(shoulderX, shoulderY, ex, ey);
          arms.fillStyle(d.skin, 1).fillCircle(ex, ey, h * 0.05);
          if (pose >= 1.5) arms.fillStyle(0xffffff, 1).fillTriangle(ex - 3, ey + 2, ex + 3, ey + 2, ex, ey + 7);
        };
        arm(-1, d.l);
        arm(1, d.r);
      }
    };
    const move = (who: Dancer[], kind: "L" | "R" | "C") => {
      for (const d of who) {
        const target = { l: kind === "R" ? 0 : kind === "C" ? 2 : 1, r: kind === "L" ? 0 : kind === "C" ? 2 : 1 };
        d.l = target.l === 2 ? 1 : target.l;
        d.r = target.r === 2 ? 1 : target.r;
        this.tweens.add({ targets: d, l: target.l, r: target.r, duration: kind === "C" ? 90 : 120, delay: kind === "C" ? 80 : 0 });
        this.tweens.add({ targets: d, l: 0, r: 0, delay: 360, duration: 180 });
        this.tweens.add({ targets: d.spr, y: d.spr.y - 6, duration: 90, yoyo: true });
      }
    };
    // ---- the chart, from the song's real structure (89 BPM, quiet intro, two breakdowns)
    type Note = { t: number; k: "L" | "R" | "C"; img: Phaser.GameObjects.Container; done: boolean; line?: boolean };
    const notes: Note[] = [];
    const quiet = new Set([28, 29, 54, 55]);
    const pattern: ("L" | "R" | "C")[] = ["L", "R", "L", "C", "R", "L", "R", "C"];
    let pi = 0;
    for (let beat = 16; beat < 69 * 4; beat++) {
      const bar = Math.floor(beat / 4);
      if (quiet.has(bar)) continue;
      if (bar < 12 && beat % 2) continue; // gentle start: every other beat
      if (bar >= 56 || beat % 2 === 0 || bar >= 30) {
        const t = PHASE + beat * BEAT;
        if (t > 186) break;
        const k = pattern[pi++ % pattern.length];
        const c = this.add.container(-200, 120).setDepth(150);
        const col = k === "C" ? 0x22c55e : k === "L" ? 0x38bdf8 : 0xf472b6;
        c.add(this.add.circle(0, 0, 20, col).setStrokeStyle(3, 0xffffff));
        c.add(this.add.text(0, 0, k === "C" ? "▲" : k === "L" ? "◀" : "▶", { fontFamily: FONT, fontSize: "18px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5));
        notes.push({ t, k, img: c, done: false });
      }
    }
    this.add.rectangle(480, 120, 960, 54, 0x000000, 0.55).setDepth(140);
    this.add.circle(HIT_X, 120, 24).setStrokeStyle(4, 0xffd23f).setDepth(145);
    const lyric = this.add.text(480, 200, "", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#86efac", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setDepth(160);
    const lyrics = ["YOU TAKE YOUR LEFT HAND", "AND GO LIKE THIS", "DO THE CROCODILE", "(very seriously)"];
    synth.music("crocodile", true);
    const start = this.time.now;
    let hits = 0;
    let perfect = 0;
    let missed = 0;
    let combo = 0;
    let best = 0;
    const songT = () => {
      const pr = synth.fileProgress();
      return pr.d ? pr.t : (this.time.now - start) / 1000;
    };
    const judge = (k: "L" | "R" | "C") => {
      if (this.ended || this.box.active) return;
      const t = songT();
      const n = notes.find((x) => !x.done && Math.abs(x.t - t) < 0.28);
      if (!n) {
        move([dancers[dancers.length - 1]], k);
        return;
      }
      n.done = true;
      const err = Math.abs(n.t - t);
      if (n.k !== k) {
        missed++;
        combo = 0;
        move([dancers[dancers.length - 1]], k);
        this.pop(480, 360, ["WRONG HAND", "MATE.", "THAT'S A TOAD", "SERIOUSLY?"][Math.floor(Math.random() * 4)], "#ff6b6b", 18);
        n.img.destroy();
        return;
      }
      hits++;
      combo++;
      best = Math.max(best, combo);
      if (err < 0.1) perfect++;
      move([dancers[dancers.length - 1]], k);
      synth.play(k === "C" ? "punch" : "tap");
      this.pop(HIT_X, 80, err < 0.1 ? "PERFECT" : "GOOD", err < 0.1 ? "#ffd23f" : "#ffffff", 16);
      this.tweens.add({ targets: n.img, scale: 1.6, alpha: 0, duration: 200, onComplete: () => n.img.destroy() });
    };
    const kb = this.input.keyboard;
    kb?.on("keydown-LEFT", () => judge("L"));
    kb?.on("keydown-A", () => judge("L"));
    kb?.on("keydown-RIGHT", () => judge("R"));
    kb?.on("keydown-D", () => judge("R"));
    for (const k of ["UP", "W", "SPACE"]) kb?.on(`keydown-${k}`, () => judge("C"));
    // three big pads for touch / mouse
    ([["◀ LEFT", "L", 200, 0x38bdf8], ["▲ CHOMP", "C", 480, 0x22c55e], ["RIGHT ▶", "R", 760, 0xf472b6]] as const).forEach(([lbl, k, x, col]) => {
      const pad = this.add.rectangle(x, 506, 250, 54, col, 0.35).setStrokeStyle(2, col).setDepth(200).setInteractive();
      this.add.text(x, 506, lbl, { fontFamily: FONT, fontSize: "18px", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(201);
      pad.on("pointerdown", () => judge(k));
    });
    this.hud.setY(452).setDepth(210);
    const leave = this.add.text(940, 14, "[ LEAVE ]", { fontFamily: FONT, fontSize: "13px", color: "#86efac", backgroundColor: "#000000aa", padding: { x: 6, y: 3 } }).setOrigin(1, 0).setDepth(300).setInteractive({ useHandCursor: true }).setVisible(false);
    const done = async () => {
      if (this.ended) return;
      const total = hits + missed + notes.filter((n) => !n.done && n.t < songT()).length;
      const acc = total ? hits / total : 0;
      synth.stopMusic();
      await this.crocRelease(acc >= 0.5);
      this.finish(acc >= 0.5, [dir(`Crocodiles done: ${hits} (${perfect} perfect) · best combo ${best} · ${Math.round(acc * 100)}% in sync with the cabinet.`)]);
    };
    leave.on("pointerdown", () => void done());
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.ended) return;
        const t = songT();
        const line = dancers.slice(0, -1);
        for (const n of notes) {
          // the cabinet hits every move exactly on the beat, whether you do or not
          if (!n.line && t >= n.t) {
            n.line = true;
            move(line, n.k);
          }
          if (n.done) continue;
          n.img.x = HIT_X + (n.t - t) * SPEED;
          if (n.t - t < -0.3) {
            n.done = true;
            missed++;
            combo = 0;
            n.img.destroy();
          }
        }
        // the rest of the line keeps time on every beat even when you don't (they're professionals)
        const beatNow = Math.floor((t - PHASE) / BEAT);
        if (beatNow !== (this as any)._lastBeat) {
          (this as any)._lastBeat = beatNow;
          const bar = Math.floor(beatNow / 4);
          if (beatNow >= 16 && !quiet.has(bar)) lyric.setText(lyrics[Math.floor(bar / 2) % lyrics.length]);
          else lyric.setText(beatNow < 16 ? "get ready. be serious." : "");
        }
        drawArms();
        if (t > 30) leave.setVisible(true);
        this.hud.setText(`🐊 ${hits}   COMBO ${combo}   MISSED ${missed}`);
        const pr = synth.fileProgress();
        if ((pr.d && pr.ended) || t > 189) void done();
      },
    });
  }

  /** The song summons crocodiles. They head for the playground. */
  private async crocRelease(won: boolean) {
    this.add.rectangle(480, 270, 960, 540, 0x3f6b3a).setDepth(500);
    this.add.rectangle(480, 470, 960, 140, 0x8b6b3a).setDepth(501);
    this.add.text(760, 300, "KRELFORD PLAYGROUND", { fontFamily: FONT, fontSize: "14px", color: "#fff4cc", backgroundColor: "#1a1033cc", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(502);
    const kids = [0, 1, 2, 3, 4].map((i) => {
      const key = this.textures.exists(`spr_KID${i}`) ? `spr_KID${i}` : this.textures.exists(`spr_FOLK${i}`) ? `spr_FOLK${i}` : `spr_${G.s.player}`;
      return this.add.sprite(640 + i * 60, 400 + (i % 2) * 20, key, 0).setScale(2).setDepth(510);
    });
    await this.box.play([
      dir(won ? "The song ends. Nine grown men lower their arms in perfect unison. Somewhere in Krelford, a drain cover lifts." : "The song ends. Nobody was in time. It doesn't matter. Somewhere in Krelford, a drain cover lifts."),
      dir("You have done the Crocodile. The Crocodile has heard you."),
    ]);
    const key = this.textures.exists("p_croc") ? "p_croc" : null;
    const crocs = [0, 1, 2].map((i) => {
      const c = key ? this.add.image(-120 - i * 140, 410 + i * 18, key).setScale(1.2) : this.add.text(-120 - i * 140, 410 + i * 18, "🐊", { fontSize: "72px" }).setOrigin(0.5);
      c.setDepth(520);
      (c as any).setFlipX?.(true);
      this.tweens.add({ targets: c, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 160 });
      return c;
    });
    synth.play("roar");
    await new Promise<void>((res) => {
      crocs.forEach((c, i) => this.tweens.add({ targets: c, x: 600 + i * 90, duration: 2400, ease: "Sine.in", onComplete: i === 2 ? () => res() : undefined }));
    });
    // CHOMP
    kids.forEach((k, i) =>
      this.time.delayedCall(i * 180, () => {
        synth.play("punch_big");
        this.pop(k.x, k.y - 50, "CHOMP", "#ff6b6b", 22);
        this.tweens.add({ targets: k, scale: 0, duration: 120 });
      }),
    );
    await new Promise((r) => this.time.delayedCall(1300, r));
    crocs.forEach((c) => this.tweens.add({ targets: c, scaleY: c.scaleY * 1.35, duration: 300, yoyo: true, repeat: 2 }));
    await this.box.play([
      say("KREBLIS", "Breaking news. Crocodiles at large in Krelford. They've eaten the entire playground."),
      say("CRONGUS", "As Children's Minister I'd like to say: that's actually my fault, I did the left hand."),
      dir("A muffled voice from inside the biggest crocodile: 'THIS IS SO UNFAIR. I'M TELLING.'"),
    ]);
    // spat back out, unharmed, furious
    crocs.forEach((c) => this.tweens.add({ targets: c, x: c.x - 40, duration: 120, yoyo: true }));
    synth.play("splat");
    kids.forEach((k, i) => this.time.delayedCall(i * 120, () => {
      this.tweens.add({ targets: k, scale: 2, duration: 160 });
      this.pop(k.x, k.y - 50, ["PTOO", "MUM!", "AGAIN!", "PEDO!", "UNFAIR"][i % 5], "#ffffff", 16);
    }));
    await new Promise((r) => this.time.delayedCall(1200, r));
    await this.box.play([
      dir("The crocodiles spit them all back out. Damp. Unharmed. Livid. One of them asks to go again."),
      say("MIKEY", "The sixth SanMik album. Two songs. Body count: zero. Technically."),
      dir("The crocodiles now live in the Krelford Playground. They have been added to the register."),
    ]);
    G.s.flags.crocs_loose = true;
  }

  // ---------------------------------------------------------------- THE CANNON (boarding Flight KR-069)

  private cannon() {
    this.add.rectangle(480, 270, 960, 540, 0x8fc3ea);
    this.add.rectangle(480, 470, 960, 140, 0x4b5563);
    for (let i = 0; i < 12; i++) this.add.rectangle(40 + i * 80, 470, 40, 6, 0xfacc15);
    title(this, 480, 24, "BOARD FLIGHT KR-069", 26, "#ffd23f").setDepth(200);
    this.add.text(480, 52, "Gate 6 is closed. The plane is taxiing. Get in the cannon. Tap / SPACE once for ANGLE, again for POWER.", { fontFamily: FONT, fontSize: "12px", color: "#111", align: "center" }).setOrigin(0.5).setDepth(200);
    const plane = this.add.image(-200, 360, "p_plane").setScale(2).setDepth(10);
    const barrel = this.add.rectangle(110, 440, 90, 26, 0x1f2937).setOrigin(0.1, 0.5).setStrokeStyle(3, 0x000000).setDepth(20);
    this.add.circle(110, 450, 26, 0x374151).setStrokeStyle(3, 0x000000).setDepth(21);
    const hero = this.add.sprite(110, 420, `spr_${G.s.player}`, 0).setScale(2).setDepth(19).setVisible(false);
    const powBg = this.add.rectangle(110, 300, 20, 120, 0x000000, 0.6).setStrokeStyle(2, 0xffffff).setDepth(30).setVisible(false);
    const pow = this.add.rectangle(110, 360, 16, 0, 0xef4444).setOrigin(0.5, 1).setDepth(31).setVisible(false);
    let phase: "angle" | "power" | "flying" | "done" = "angle";
    let ang = -0.3;
    let power = 0;
    let tries = 0;
    let px = 0;
    let py = 0;
    let vx = 0;
    let vy = 0;
    const fire = () => {
      if (this.ended || this.box.active) return;
      if (phase === "angle") {
        phase = "power";
        powBg.setVisible(true);
        pow.setVisible(true);
      } else if (phase === "power") {
        phase = "flying";
        tries++;
        synth.play("boom");
        this.cameras.main.shake(200, 0.01);
        powBg.setVisible(false);
        pow.setVisible(false);
        px = 110 + Math.cos(ang) * 80;
        py = 440 + Math.sin(ang) * 80;
        const sp = 380 + power * 520;
        vx = Math.cos(ang) * sp;
        vy = Math.sin(ang) * sp;
        hero.setPosition(px, py).setVisible(true);
      }
    };
    this.input.keyboard?.on("keydown-SPACE", fire);
    this.input.on("pointerdown", fire);
    const reset = (msg: string) => {
      phase = "done";
      this.pop(480, 240, msg, "#ff6b6b", 22);
      this.time.delayedCall(900, () => {
        hero.setVisible(false).setAngle(0);
        phase = tries >= 3 ? "done" : "angle";
        if (tries >= 3) void win(true);
      });
    };
    const win = async (thrown: boolean) => {
      if (this.ended) return;
      this.ended = true;
      this.time.removeAllEvents();
      await this.box.play(
        thrown
          ? [dir("A baggage handler sighs, picks you up, and throws you through the cargo door. You are on board. Technically as luggage.")]
          : [dir("You hit the fuselage, bounce off a wing, and fall through an open window into seat 23B. The man in 23A doesn't look up from his book."), say(G.s.player, "Is this seat taken?")],
      );
      switchTo(this, "Dungeon", { dungeon: "airport", room: 0 });
    };
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.ended) return;
        const now = this.time.now;
        // the plane taxis past, again and again
        plane.x += 2.6;
        if (plane.x > 1200) plane.x = -220;
        if (phase === "angle") {
          ang = -0.25 - (0.5 + 0.5 * Math.sin(now / 380)) * 1.0;
          barrel.setRotation(ang);
        } else if (phase === "power") {
          power = 0.5 + 0.5 * Math.sin(now / 260);
          pow.setSize(16, 120 * power);
        } else if (phase === "flying") {
          const dt = 0.016;
          vy += 700 * dt;
          px += vx * dt;
          py += vy * dt;
          hero.setPosition(px, py).setAngle(hero.angle + 14);
          if (Math.abs(px - plane.x) < plane.displayWidth * 0.42 && Math.abs(py - plane.y) < plane.displayHeight * 0.32) {
            phase = "done";
            synth.play("punch_big");
            this.pop(px, py - 40, "ON BOARD", "#22c55e", 26);
            hero.setVisible(false);
            this.time.delayedCall(600, () => void win(false));
          } else if (py > 520 || px > 1000) reset(["MISSED. TRY AGAIN.", "THAT WAS THE TERMINAL.", "SO CLOSE."][tries % 3]);
        }
        this.hud.setText(`ATTEMPTS ${tries}/3   ${phase === "angle" ? "set the ANGLE" : phase === "power" ? "set the POWER" : ""}`);
      },
    });
  }

}
