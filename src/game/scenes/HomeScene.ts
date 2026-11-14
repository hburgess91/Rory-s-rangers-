import { KR_HOME } from "../../content/krunchers";
import Phaser from "phaser";
import { bindSanmikToggle, playerKey } from "../gfx/sanmikForm";
import { G } from "../G";
import { Controls } from "../combat/Controls";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, uiFrame } from "../ui/theme";
import { dir, say } from "../../content/dsl";
import { animateWalker, backdrop } from "../gfx/HD";
import { CHARACTERS } from "../../data/characters";
import { maxBottles, maxHp } from "../systems/stats";
import { canTurnIn, completePersonal } from "../systems/quests";
import type { Line } from "../../data/types";
import { CHAT_AFTER, CONSOLE_GAMES, DECOR_BY_ID, DREAMS, GOLD_TOILET, KREL_TROPHIES, SONG_REPLIES } from "../../content/home";
import { DRONGUS_STATUSES } from "../../content/dialogue/drongusStatuses";
import { BOSS_TEXT } from "../../content/bosses";
import { CRYSTAL_BOSSES, hasCrystal } from "../systems/crystals";
import { PRIZES } from "../../content/kreddle";
import { addKrokens, kd } from "../systems/kreddle";
import { ammoLabel, weaponIcon, weaponList } from "../ui/weapons";
import { currentStep } from "../Flow";

/** Your house: walk about, watch the telly, sleep, raid the fridge. New games start here. */

// where your feet can go
const TOP = 455;
const BOTTOM = 536;

interface Spot {
  x: number;
  y: number;
  r: number;
  label: string;
  use: () => void | Promise<void>;
}

const FRIDGE = [
  "The fridge contains: half a Fizzy Bongo, a single crobley, and a note from your mum that just says 'eat something'.",
  "The fridge light is on. Nothing else is. You close it. You open it again. Still nothing.",
  "A Tupperware of something labelled 'DO NOT' in your own handwriting. You don't.",
  "Pussy juice, three days past its best. Still drinkable, according to the Ministry.",
  "You find a cold slice of Krez-King pizza. Breakfast of champions. You eat it standing up.",
];

export class HomeScene extends Phaser.Scene {
  private controls!: Controls;
  private box!: DialogueBox;
  private me!: Phaser.GameObjects.Sprite;
  private prompt!: Phaser.GameObjects.Text;
  private busy = false;
  private spots: Spot[] = [];

  constructor() {
    super("Home");
  }

  create() {
    const s = G.s;
    this.busy = false;
    this.spots = [];
    this.cameras.main.fadeIn(500);
    if (!backdrop(this, "bg_home", { depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x2a2233).setDepth(-10);
    // a warm lamp glow
    const glow = this.add.ellipse(160, 360, 380, 260, 0xffc46b, 0.08).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    this.tweens.add({ targets: glow, alpha: 0.5, yoyo: true, repeat: -1, duration: 2400, ease: "Sine.inOut" });
    // the furniture
    const tv = this.add.image(130, 478, "p_tv").setOrigin(0.5, 1).setScale(7).setDepth(470);
    const screen = this.add.rectangle(tv.x - 8, tv.y - tv.displayHeight * 0.48, tv.displayWidth * 0.62, tv.displayHeight * 0.45, 0x7dd3fc, 0.18).setDepth(471).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: screen, alpha: 0.05, yoyo: true, repeat: -1, duration: 160 });
    this.add.image(320, 534, "p_sofa").setOrigin(0.5, 1).setScale(2.5).setDepth(534);
    this.add.image(540, 532, "p_bed").setOrigin(0.5, 1).setScale(5).setDepth(532);
    const fridge = this.add.image(655, 452, "p_fridge").setOrigin(0.5, 1).setScale(4).setDepth(452);
    this.add.text(760, 300, "▼ OUT", { fontFamily: FONT, fontSize: "12px", color: "#ffd23f", fontStyle: "bold", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(600);
    // the games console, the laptop on the sofa, the trophy shelf and the armoury
    if (this.textures.exists("p_console")) this.add.image(228, 512, "p_console").setOrigin(0.5, 1).setScale(1.2).setDepth(512);
    if (this.textures.exists("p_laptop")) this.add.image(352, 500, "p_laptop").setOrigin(0.5, 1).setScale(0.75).setDepth(536);
    this.drawShelf(292, 300);
    if (this.textures.exists("p_gunrack")) this.add.image(880, 300, "p_gunrack").setScale(1.6).setDepth(5);
    this.drawDecor(fridge);
    const fridgeStocked = !s.flags[`fridge_ch${s.chapter}`];
    this.spots.push(
      { x: 140, y: 480, r: 80, label: "E: Watch KrelTV", use: () => this.watchTV() },
      { x: 232, y: 512, r: 42, label: "E: Play the games console", use: () => this.consolePanel() },
      { x: 292, y: 462, r: 40, label: "E: Look at your trophy shelf", use: () => this.trophyPanel() },
      { x: 350, y: 522, r: 48, label: "E: Open the laptop (group chat)", use: () => this.laptopPanel() },
      { x: 540, y: 500, r: 80, label: "E: Sleep (save · full health · sober up · dream)", use: () => this.sleep() },
      { x: 655, y: 462, r: 55, label: fridgeStocked ? "E: Open the fridge (restocked!)" : "E: Open the fridge", use: () => this.openFridge() },
      { x: 880, y: 468, r: 55, label: "E: Open the armoury (weapons · perks · gore mode)", use: () => this.armouryPanel() },
      { x: 420, y: 445, r: 55, label: "E: Look out of the window", use: () => this.talk([dir(s.flags.met_emergency ? "Krelford. The sky has a faint grey tint, like an unloaded page. Somewhere, a Tap is not running." : "Krelford, in the evening. Somewhere a fizzy bongo is opened. Somewhere else, the Great Tap gurgles. All is well. For now.")]) },
      { x: 760, y: 450, r: 60, label: "E: Go outside", use: () => this.leave() },
    );
    this.me = this.add.sprite(s.flags.home_seen ? 740 : 420, 500, playerKey(this), 0).setOrigin(0.5, 1).setScale(5.5).setDepth(500);
    bindSanmikToggle(this, { sprites: () => [this.me], can: () => !this.busy });
    this.prompt = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#000000cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(1000).setVisible(false);
    this.controls = new Controls(this);
    this.box = new DialogueBox(this, 2000, 0.2);
    if (!this.scene.isActive("UI")) this.scene.launch("UI", { mode: "hub" });
    else this.scene.get("UI").events.emit("mode", "hub");
    this.events.off("resume");
    this.events.on("resume", () => {
      this.busy = false;
      this.controls.swallow();
      // back from Klerble's broadcast: now you can go
      if (this.mustWatch() === false && G.s.flags.klerble_tv_pending) {
        delete G.s.flags.klerble_tv_pending;
        G.save();
        void this.talk([
          say(G.s.player, "…Right. Well. That was relaxing."),
          dir("NEW OBJECTIVE: head out of the door (bottom right) and go to Krelford Town Hall. (Every new show you watch on KrelTV now comes with a 'gift' from Kreddle.)"),
        ]);
      }
    });
    synth.music("home", true);
    this.time.delayedCall(600, () => void this.arrive());
  }

  private async arrive() {
    const s = G.s;
    // the Kreddle Krunchers have just battered Mikey: the group chat finds out (Klerble's music until you're back in control)
    if (s.flags.kr_home_pending) {
      delete s.flags.kr_home_pending;
      this.busy = true;
      synth.music("klerble", true);
      await this.talk(KR_HOME);
      synth.music("home", true);
      this.busy = false;
      G.save();
      return;
    }
    const q = canTurnIn(s, "HOME");
    if (q) {
      await this.talk(q.turnIn.lines);
      const coins = completePersonal(s, q);
      G.emit("toast", { title: "PERSONAL QUEST COMPLETE", text: `${q.title}: +${coins} Krezzcoin. ${q.reward.desc}` });
      synth.play("ding");
      G.save();
    }
    if (s.flags.home_seen || s.flags.prologue_done) {
      await this.kreddleTip();
      return;
    }
    s.flags.home_seen = true;
    G.save();
    await this.welcome();
  }

  /** WELCOME TO KRELWORLD: the world, and who you are in it. */
  private async welcome() {
    const s = G.s;
    const me = CHARACTERS[s.player];
    const role = me.ministry ?? me.proctusTitle?.replace(/^Acting /, "") ?? "a member of the cabinet";
    const card = this.add.container(480, 230).setDepth(3000);
    const t = this.add.text(0, 0, "WELCOME TO\nKRELWORLD!", { fontFamily: "Impact, sans-serif", fontSize: "58px", color: "#ffd23f", align: "center", stroke: "#2a1400", strokeThickness: 10 }).setOrigin(0.5);
    t.setShadow(0, 0, "#ffd23f", 16, true, true);
    card.add(t);
    card.setScale(0.2).setAlpha(0);
    synth.play("cheer");
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 500, ease: "Back.out" });
    await new Promise<void>((r) => this.time.delayedCall(1700, () => r()));
    this.tweens.add({ targets: card, alpha: 0, y: 180, duration: 400, onComplete: () => card.destroy() });
    const lines: Line[] = [
      dir("Krelworld is a group chat that accidentally became a country. It is its own universe. Possibly its own dimension. Nobody has checked."),
      dir("Its capital is Krelford: a town hall, a pub called the Krezz Arms, a school called Wildern, and in the middle of it all the Great Pussy Juice Tap, which keeps everybody alive and happy."),
      dir("Above it all sits the Great Wiki Citadel, where the Supreme Leader, DRONGUS B. DRIPPIN', writes the lore. Krelworld runs on lore. Without it, things start to go… wrong."),
      dir(`And you are ${me.name}${me.aka ? `, ${me.aka}` : ""}: ${role} in Drongus's cabinet. Mostly that means turning up to meetings. Occasionally it means saving the universe.`),
      dir("TIP: WASD / arrows (or the stick) to walk. E to use things. Have a look round: the telly works, the bed saves your game."),
      say(s.player, "Right. There's a cabinet meeting at the Town Hall later. Something about 'appreciating content'. But first…"),
      dir("Why not watch some lovely TV? (The telly's on the left. Walk up to it and press E.)"),
    ];
    await this.talk(lines);
  }

  update(time: number, delta: number) {
    const dt = Math.min(delta, 50);
    if (this.busy) {
      this.prompt.setVisible(false);
      return;
    }
    const mv = this.controls.move();
    const sp = 210 * (dt / 1000);
    this.me.x = Phaser.Math.Clamp(this.me.x + mv.x * sp, 40, 920);
    this.me.y = Phaser.Math.Clamp(this.me.y + mv.y * sp, TOP, BOTTOM);
    this.me.setDepth(this.me.y + 1);
    animateWalker(this.me, mv.x, mv.y, Math.hypot(mv.x, mv.y) > 0.1, time);
    let best: Spot | null = null;
    let bd = 1e9;
    for (const sp2 of this.spots) {
      const d = Phaser.Math.Distance.Between(this.me.x, this.me.y, sp2.x, sp2.y);
      if (d < sp2.r && d < bd) {
        best = sp2;
        bd = d;
      }
    }
    if (best) {
      this.prompt.setText(best.label).setPosition(this.me.x, this.me.y - this.me.displayHeight - 12).setVisible(true);
      if (this.controls.interact()) void best.use();
    } else {
      this.prompt.setVisible(false);
      this.controls.interact();
    }
    if (this.controls.pause()) {
      this.busy = true;
      this.scene.launch("Menu", { mode: "pause", caller: "Home" });
      this.scene.bringToTop("Menu");
      this.scene.pause();
    }
  }

  /** A new game: you have to watch Klerble's broadcast before you go out. */
  private mustWatch() {
    const f = G.s.flags;
    return !f.prologue_done && !f.tv_klerble_welcome;
  }

  private watchTV() {
    if (this.mustWatch()) {
      G.s.flags.klerble_tv_pending = true;
      this.busy = true;
      this.scene.launch("TV", { overlay: true, caller: "Home", episode: "klerble_welcome", once: true });
      this.scene.bringToTop("TV");
      this.scene.pause();
      return;
    }
    G.drongus("tv");
    this.busy = true;
    this.scene.launch("TV", { overlay: true, caller: "Home" });
    this.scene.bringToTop("TV");
    this.scene.pause();
  }

  private async sleep() {
    const s = G.s;
    s.hp = maxHp(s);
    s.intoxication = 0;
    s.bottles = Math.max(s.bottles, s.flags.ch1_clear ? maxBottles(s) : s.bottles);
    G.save();
    this.busy = true;
    // lights out (a black sheet, so the dream's text box still shows)
    const night = this.add.rectangle(480, 270, 960, 540, 0x05030c, 0).setDepth(1500);
    await new Promise<void>((r) => this.tweens.add({ targets: night, fillAlpha: 0.94, duration: 600, onComplete: () => r() }));
    const z = this.add.text(480, 200, "z z z", { fontFamily: FONT, fontSize: "36px", color: "#a5b4fc" }).setOrigin(0.5).setDepth(1501);
    this.tweens.add({ targets: z, y: 170, alpha: 0.3, yoyo: true, repeat: -1, duration: 900 });
    await this.talk(this.dream());
    z.destroy();
    await new Promise<void>((r) => this.tweens.add({ targets: night, fillAlpha: 0, duration: 600, onComplete: () => r() }));
    night.destroy();
    G.emit("toast", { title: "SAVED", text: "You slept. Full health, sober, game saved." });
    await this.kreddleTip();
  }

  /** Chapter 2: if you still haven't been over the bridge, a nudge towards Kreddle's shops (once). */
  private async kreddleTip() {
    const s = G.s;
    if (s.chapter !== 2 || s.flags.kreddle_seen || s.flags.kreddle_tip_home) return;
    s.flags.kreddle_tip_home = true;
    G.save();
    synth.play("notify");
    await this.talk([
      dir("💡 TIP: Why not visit KREDDLE? It's over the Kreddle Bridge, at the far WEST of Krelford."),
      dir("The Kreddle Exchange sells new guns, ammo and upgrades, there are slot machines and a Prize Counter full of perks, and you can hire a lad to fight with you. They hate us there. Their shops are excellent."),
    ]);
  }

  /** What you dream about: a hint, an old Drongus status, or something stupid. */
  private dream(): Line[] {
    const r = Math.random();
    const st = currentStep();
    if (r < 0.34 && st) return [dir("You dream about Krezwonk. He's floating. He's glowing. He's holding a clipboard."), say("KREZWONK", "I've seen it in a vision. Your next move…"), dir(`The vision: ${st.text}.`), dir("You wake up. It's the most useful dream you've ever had.")];
    if (r < 0.67 && DRONGUS_STATUSES.length) {
      const d = DRONGUS_STATUSES[Math.floor(Math.random() * DRONGUS_STATUSES.length)];
      return [dir(`You dream Drongus is standing at the end of your bed, reading out an old Facebook status of his. From ${d.y}.`), say("DRONGUS", d.t), dir("He waits for a reaction. You wake up before you can give one.")];
    }
    return DREAMS[Math.floor(Math.random() * DREAMS.length)];
  }

  // ------------------------------------------------------------------ the fridge

  private async openFridge() {
    const s = G.s;
    const k = `fridge_ch${s.chapter}`;
    if (s.flags[k]) {
      await this.talk([dir(FRIDGE[Math.floor(Math.random() * FRIDGE.length)]), dir("(Your mum restocks it every chapter.)")]);
      return;
    }
    s.flags[k] = true;
    let got: string;
    if (s.bottles < maxBottles(s)) {
      s.bottles++;
      got = "a fresh bottle of pussy juice (+1 bottle)";
    } else {
      s.bongos++;
      got = "a cold Fizzy Bongo (+1 bongo)";
    }
    G.save();
    synth.play("pickup");
    const sp = this.spots.find((x) => x.x === 655);
    if (sp) sp.label = "E: Open the fridge";
    await this.talk([dir(`The fridge has been restocked. There's a note from your mum: 'eat something'. And next to it, ${got}.`)]);
  }

  // ------------------------------------------------------------------ furniture

  /** The trophy shelf: a crystal for every boss you've beaten (dark slots for the ones you haven't). */
  private drawShelf(x: number, y: number) {
    if (!this.textures.exists("p_trophyshelf")) return;
    const sh = this.add.image(x, y, "p_trophyshelf").setScale(2).setDepth(5);
    const tints = [0xf472b6, 0x60a5fa, 0xfacc15, 0x34d399, 0xa78bfa, 0xf87171];
    CRYSTAL_BOSSES.forEach((b, i) => {
      const cx = x - sh.displayWidth / 2 + 12 + i * ((sh.displayWidth - 24) / 5);
      const has = hasCrystal(G.s, b);
      const key = this.textures.exists("cum_crystal") ? "cum_crystal" : "__WHITE";
      const c = this.add.image(cx, y - 8, key).setOrigin(0.5, 1).setDepth(6);
      c.setScale(18 / Math.max(1, c.height));
      if (has) {
        c.setTint(tints[i]);
        const glow = this.add.circle(cx, y - 16, 9, tints[i], 0.25).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: glow, alpha: 0.05, yoyo: true, repeat: -1, duration: 900 + i * 120 });
      } else c.setTint(0x111111).setAlpha(0.5);
    });
  }

  /** Whatever you've bought at the Kreddle Exchange's Home Furnishings counter. */
  private drawDecor(fridge: Phaser.GameObjects.Image) {
    const s = G.s;
    const has = (id: string) => (s.upgrades?.[`home_${id}`] ?? 0) > 0;
    const img = (key: string, x: number, y: number, scale: number, depth = y) => (this.textures.exists(key) ? this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(depth) : null);
    if (has("rug")) img("d_rug", 440, 540, 2.4, 2);
    if (has("neon")) {
      const t = this.add.text(425, 50, "KREZZ", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#ff7ad9", stroke: "#ff1fa8", strokeThickness: 3 }).setOrigin(0.5).setDepth(6);
      t.setShadow(0, 0, "#ff4fd8", 18, true, true);
      this.tweens.add({ targets: t, alpha: { from: 1, to: 0.75 }, yoyo: true, repeat: -1, duration: 90, repeatDelay: 2600 });
    }
    if (has("lava")) img("d_lava", fridge.x - 10, fridge.y - fridge.displayHeight + 6, 1.1, 453);
    if (has("fish")) {
      const f = img("d_fish", 425, 340, 1.3, 6);
      if (f) this.spots.push({ x: 425, y: 458, r: 32, label: "E: Look at the fish", use: () => this.talk([dir(DECOR_BY_ID.fish.look)]) });
    }
    if (has("disco")) {
      this.add.rectangle(620, 0, 2, 22, 0x9ca3af).setOrigin(0.5, 0).setDepth(6);
      const ball = this.add.image(620, 20, "d_disco").setOrigin(0.5, 0).setScale(1.2).setDepth(6);
      this.tweens.add({ targets: ball, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.inOut" });
      // little lights drifting over the walls
      const cols = [0xff4fd8, 0x67e8f9, 0xfacc15, 0xa78bfa, 0xffffff];
      for (let i = 0; i < 18; i++) {
        const dot = this.add.circle(Phaser.Math.Between(20, 940), Phaser.Math.Between(40, 420), 3, cols[i % cols.length], 0.55).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: dot, x: dot.x + Phaser.Math.Between(-160, 160), y: dot.y + Phaser.Math.Between(-60, 60), alpha: 0.1, yoyo: true, repeat: -1, duration: Phaser.Math.Between(1800, 3400), ease: "Sine.inOut" });
      }
    }
    if (has("plant")) img("d_plant", 36, 538, 1.4);
    if (has("statue")) {
      img("d_statue", 470, 538, 1.4);
      this.spots.push({ x: 470, y: 528, r: 30, label: "E: Admire the Crobley statue", use: () => this.talk([dir(DECOR_BY_ID.statue.look)]) });
    }
    if (has("slot")) {
      img("d_slot", 708, 458, 1.3);
      this.spots.push({ x: 708, y: 466, r: 28, label: "E: Pull the slot machine (a Kroken a day)", use: () => this.homeSlot() });
    }
    if (has("toilet")) {
      img("d_toilet", 918, 536, 1.35);
      this.spots.push({ x: 912, y: 526, r: 34, label: "E: Sit on the solid gold toilet", use: () => this.talk([dir(GOLD_TOILET[Math.floor(Math.random() * GOLD_TOILET.length)])]) });
    }
  }

  private async homeSlot() {
    const s = G.s;
    const today = new Date().toDateString();
    if (s.flags.home_slot_day === today) {
      await this.talk([dir("You pull the lever. A little sign lights up: COME BACK TOMORROW, TAP-LICKER. Even your own slot machine hates you.")]);
      return;
    }
    s.flags.home_slot_day = today;
    const n = Math.random() < 0.15 ? 5 : 1;
    addKrokens(s, n);
    G.save();
    synth.play("ding");
    await this.talk([dir(n > 1 ? "Ding ding ding! Three Crobleys! +5 Krokens!" : "Cherry, lemon, Klerble. +1 Kroken. Come back tomorrow.")]);
  }

  // ------------------------------------------------------------------ panels

  /** A full-screen panel. Returns its container and a close function. */
  private panel(title: string, color = "#ffd23f"): { root: Phaser.GameObjects.Container; close: () => void } {
    this.busy = true;
    this.prompt.setVisible(false);
    const root = this.add.container(0, 0).setDepth(2500);
    const bg = this.add.rectangle(480, 270, 900, 500, 0x0b0a14, 0.96).setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color);
    bg.setInteractive();
    root.add(bg);
    const art = uiFrame(this, 480, 270, 900, 500, "ui_panel");
    if (art) {
      bg.setStrokeStyle(0);
      root.add(art.setTint(Phaser.Display.Color.HexStringToColor(color).color | 0x606060));
    }
    root.add(this.add.text(480, 48, title, { fontFamily: "Impact, sans-serif", fontSize: "32px", color, stroke: "#000", strokeThickness: 6 }).setOrigin(0.5));
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      this.input.keyboard?.off("keydown-ESC", close);
      root.destroy();
      this.controls.swallow();
      this.time.delayedCall(50, () => (this.busy = false));
    };
    const x = this.add.text(905, 40, "✕", { fontFamily: FONT, fontSize: "24px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 8, y: 2 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    x.on("pointerdown", close);
    root.add(x);
    root.add(this.add.text(480, 505, "ESC or ✕ to close", { fontFamily: FONT, fontSize: "11px", color: "#64748b" }).setOrigin(0.5));
    this.input.keyboard?.on("keydown-ESC", close);
    return { root, close };
  }

  private button(root: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, label: string, fn: () => void, fill = 0x1e293b, size = 13) {
    const b = this.add.rectangle(x, y, w, h, fill).setStrokeStyle(2, 0x475569).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, label, { fontFamily: FONT, fontSize: `${size}px`, color: "#ffffff", align: "center", wordWrap: { width: w - 10 } }).setOrigin(0.5);
    b.on("pointerover", () => b.setStrokeStyle(2, 0xfacc15));
    b.on("pointerout", () => b.setStrokeStyle(2, 0x475569));
    b.on("pointerdown", () => {
      synth.play("select");
      fn();
    });
    root.add([b, t]);
    return b;
  }

  /** THE ARMOURY: pick what you carry, see your perks, switch gore mode. */
  private armouryPanel() {
    const s = G.s;
    const { root, close } = this.panel("THE ARMOURY", "#67e8f9");
    root.add(this.add.text(480, 80, "Click a weapon to carry it out of the house.", { fontFamily: FONT, fontSize: "13px", color: "#cbd5e1" }).setOrigin(0.5));
    const list = weaponList(s);
    const per = Math.min(7, list.length);
    list.forEach((w, i) => {
      const r = Math.floor(i / per);
      const c = i % per;
      const inRow = Math.min(per, list.length - r * per);
      const x = 480 + (c - (inRow - 1) / 2) * 112;
      const y = 150 + r * 104;
      const held = w.id === (s.gun ?? null);
      const box = this.add.rectangle(x, y, 104, 96, held ? 0x0e3a4a : 0x111827).setStrokeStyle(3, held ? 0x67e8f9 : 0x334155).setInteractive({ useHandCursor: !w.empty });
      root.add(box);
      const ic = weaponIcon(this, x, y - 14, w, 56);
      if (w.empty) ic.setAlpha(0.35);
      root.add(ic);
      root.add(this.add.text(x, y + 22, w.name, { fontFamily: FONT, fontSize: "9px", color: "#ffffff", align: "center", wordWrap: { width: 98 } }).setOrigin(0.5, 0));
      root.add(this.add.text(x, y - 42, held ? "IN HAND" : ammoLabel(w), { fontFamily: FONT, fontSize: "10px", color: held ? "#67e8f9" : w.empty ? "#ef4444" : "#facc15", fontStyle: "bold" }).setOrigin(0.5));
      box.on("pointerdown", () => {
        if (w.empty) return;
        s.gun = w.id ?? undefined;
        G.save();
        synth.play("pickup");
        close();
        this.armouryPanel();
      });
    });
    // your Kreddle perks
    const perks = PRIZES.filter((p) => p.key && kd(s, p.key) > 0).map((p) => `${p.icon} ${p.name}${(p.max ?? 1) > 1 ? ` ${kd(s, p.key!)}/${p.max}` : ""}`);
    const top = 150 + Math.ceil(list.length / per) * 104 - 20;
    root.add(this.add.text(120, top, "KREDDLE PERKS", { fontFamily: FONT, fontSize: "14px", color: "#ff7ad9", fontStyle: "bold" }));
    root.add(this.add.text(120, top + 22, perks.length ? perks.join("     ") : "None yet. Cross the bridge to Kreddle and win some.", { fontFamily: FONT, fontSize: "12px", color: "#e2e8f0", wordWrap: { width: 720 }, lineSpacing: 6 }));
    {
      const on = G.meta.settings.gore !== false;
      this.button(root, 480, 462, 260, 36, `🩸 GORE MODE: ${on ? "ON" : "OFF"}`, () => {
        G.meta.settings.gore = !on;
        G.saveMeta();
        G.save();
        close();
        this.armouryPanel();
      }, on ? 0x7f1d1d : 0x27213a, 14);
    }
  }

  /** The trophy shelf, up close. */
  private trophyPanel() {
    const s = G.s;
    const { root } = this.panel("THE TROPHY SHELF", "#facc15");
    root.add(this.add.text(480, 82, "THE CUM CRYSTALS", { fontFamily: FONT, fontSize: "15px", color: "#facc15", fontStyle: "bold" }).setOrigin(0.5));
    const tints = [0xf472b6, 0x60a5fa, 0xfacc15, 0x34d399, 0xa78bfa, 0xf87171];
    CRYSTAL_BOSSES.forEach((b, i) => {
      const x = 480 + (i - 2.5) * 130;
      const has = hasCrystal(s, b);
      const c = this.add.image(x, 160, this.textures.exists("cum_crystal") ? "cum_crystal" : "__WHITE");
      c.setScale(64 / Math.max(1, c.height));
      if (has) c.setTint(tints[i]);
      else c.setTint(0x111111).setAlpha(0.5);
      root.add(c);
      root.add(this.add.text(x, 205, has ? (b === "krunch" ? "Found in the rubble (nobody knows how)" : BOSS_TEXT[b]?.name ?? b) : "???", { fontFamily: FONT, fontSize: "11px", color: has ? "#ffffff" : "#475569", align: "center", wordWrap: { width: 120 } }).setOrigin(0.5, 0));
    });
    const got = Object.keys(KREL_TROPHIES).filter((b) => s.flags[`krel_${b}`]);
    root.add(this.add.text(480, 270, "KRELTALITY TROPHIES", { fontFamily: FONT, fontSize: "15px", color: "#ef4444", fontStyle: "bold" }).setOrigin(0.5));
    root.add(
      this.add
        .text(480, 298, got.length ? got.map((b) => `🩸 ${KREL_TROPHIES[b]}`).join("\n") : "Nothing yet. When a boss goes down and the screen says FUCKING KILL THEM!!, do it. They leave something behind.", { fontFamily: FONT, fontSize: "13px", color: "#fecaca", align: "center", wordWrap: { width: 760 }, lineSpacing: 6 })
        .setOrigin(0.5, 0),
    );
  }

  /** The games console: everything you've played out in Krelworld. */
  private consolePanel() {
    const s = G.s;
    const { root, close } = this.panel("KREZZSTATION 2", "#a78bfa");
    const games = CONSOLE_GAMES.filter((g) => s.flags[`mg_${g.mode}_played`] || s.flags[`mg_${g.mode}_won`]);
    root.add(this.add.text(480, 82, "Play anything you've played out in Krelworld. A win pays 5 Krokens (once per game, per chapter).", { fontFamily: FONT, fontSize: "13px", color: "#cbd5e1", align: "center", wordWrap: { width: 760 } }).setOrigin(0.5));
    if (!games.length) {
      root.add(this.add.text(480, 260, "No games yet.\nPlay the minigames out in Krelworld and they'll turn up here.", { fontFamily: FONT, fontSize: "16px", color: "#94a3b8", align: "center" }).setOrigin(0.5));
      return;
    }
    games.forEach((g, i) => {
      const x = 480 + ((i % 2) - 0.5) * 380;
      const y = 140 + Math.floor(i / 2) * 50;
      const paid = s.flags[`console_${g.mode}_ch${s.chapter}`];
      this.button(root, x, y, 360, 40, `🎮 ${g.name}${paid ? "" : "   🎟"}`, () => {
        close();
        this.busy = true;
        this.cameras.main.fadeOut(250);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Minigame", { mode: g.mode, console: true }));
      }, 0x2e1065);
    });
  }

  /** The laptop: the group chat. */
  private laptopPanel(justReacted = false) {
    const s = G.s;
    const { root, close } = this.panel("KRELWORLD GROUP CHAT", "#7fb3ff");
    const cleared = [1, 2, 3, 4, 5, 6].filter((n) => s.flags[`ch${n}_clear`]).length;
    const blocks = [0, 1, 2, 3, 4, 5, 6, 7].filter((n) => n <= Math.max(cleared, 0) || (n === 7 && s.chapter >= 7)).slice(-2);
    const msgs: { s: string; t: string }[] = [];
    for (const b of blocks) msgs.push(...(CHAT_AFTER[b] ?? []));
    const st = DRONGUS_STATUSES.length ? DRONGUS_STATUSES[Math.floor(Math.random() * DRONGUS_STATUSES.length)] : null;
    if (st) msgs.push({ s: "DRONGUS", t: `📅 On this day in ${st.y}: "${st.t}"` });
    const n = (s.flags.song_reacts as number) ?? 0;
    if (justReacted) {
      msgs.push({ s: s.player, t: "(reacted to THE KREZZING HOUR)" });
      for (const t of SONG_REPLIES[Math.min(n - 1, SONG_REPLIES.length - 1)] ?? []) msgs.push({ s: "DRONGUS", t });
    }
    // newest at the bottom, only what fits
    let y = 400;
    const shown = msgs.slice(-9).reverse();
    for (const m of shown) {
      const me = m.s === s.player;
      const t = this.add.text(me ? 820 : 140, y, `${CHARACTERS[m.s]?.name ?? m.s}\n${m.t}`, { fontFamily: FONT, fontSize: "12px", color: "#ffffff", backgroundColor: me ? "#1d4ed8" : "#1f2937", padding: { x: 8, y: 5 }, wordWrap: { width: 560 } }).setOrigin(me ? 1 : 0, 1);
      root.add(t);
      y -= t.height + 6;
      if (y < 90) {
        t.destroy();
        break;
      }
    }
    root.add(this.add.text(480, 428, "React to Drongus's song (THE KREZZING HOUR · Seen by 9):", { fontFamily: FONT, fontSize: "12px", color: "#94a3b8" }).setOrigin(0.5));
    ["👍", "❤️", "😂"].forEach((e, i) => {
      this.button(root, 400 + i * 80, 464, 64, 40, e, () => {
        s.flags.song_reacts = n + 1;
        if (n === 0) {
          s.coins += 100;
          G.emit("toast", { title: "DRONGUS IS DELIGHTED", text: "Someone reacted to the song. +100 Krezzcoin." });
        }
        G.save();
        synth.play("ding");
        close();
        this.laptopPanel(true);
      }, 0x1e3a8a, 20);
    });
  }

  private leave() {
    if (this.busy) return;
    if (this.mustWatch()) {
      void this.talk([dir("No, watch some relaxing TV first.")]);
      return;
    }
    const s = G.s;
    this.busy = true;
    synth.play("door");
    // the first time out: a look round the whole town
    const flyover = !s.flags.flyover_seen && !s.flags.prologue_done;
    this.cameras.main.fadeOut(350);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Hub", { at: "HOME", flyover }));
  }

  private async talk(lines: Line[]) {
    this.busy = true;
    await this.box.play(lines);
    this.controls.swallow();
    this.busy = false;
  }
}
