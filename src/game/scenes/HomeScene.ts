import Phaser from "phaser";
import { G } from "../G";
import { Controls } from "../combat/Controls";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT } from "../ui/theme";
import { dir, say } from "../../content/dsl";
import { animateWalker, backdrop } from "../gfx/HD";
import { CHARACTERS } from "../../data/characters";
import { maxBottles, maxHp } from "../systems/stats";
import { canTurnIn, completePersonal } from "../systems/quests";
import type { Line } from "../../data/types";

/** Your house: walk about, watch the telly, sleep, raid the fridge. New games start here. */

const TOP = 440;
const BOTTOM = 528;

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
    this.add.image(655, 452, "p_fridge").setOrigin(0.5, 1).setScale(4).setDepth(452);
    this.add.text(760, 300, "▼ OUT", { fontFamily: FONT, fontSize: "12px", color: "#ffd23f", fontStyle: "bold", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(600);
    this.spots.push(
      { x: 140, y: 480, r: 95, label: "E: Watch KrelTV", use: () => this.watchTV() },
      { x: 320, y: 500, r: 80, label: "E: Sit on the sofa", use: () => this.talk([dir("You sit down. The sofa exhales. A Krezzcoin falls out of the cushions. You put it back. That's the sofa's coin.")]) },
      { x: 540, y: 500, r: 90, label: "E: Sleep (save · full health · sober up)", use: () => this.sleep() },
      { x: 655, y: 462, r: 60, label: "E: Open the fridge", use: () => this.talk([dir(FRIDGE[Math.floor(Math.random() * FRIDGE.length)])]) },
      { x: 420, y: 445, r: 55, label: "E: Look out of the window", use: () => this.talk([dir(s.flags.met_emergency ? "Krelford. The sky has a faint grey tint, like an unloaded page. Somewhere, a Tap is not running." : "Krelford, in the evening. Somewhere a fizzy bongo is opened. Somewhere else, the Great Tap gurgles. All is well. For now.")]) },
      { x: 760, y: 450, r: 60, label: "E: Go outside", use: () => this.leave() },
    );
    this.me = this.add.sprite(s.flags.home_seen ? 740 : 300, 480, `spr_${s.player}`, 0).setScale(2).setDepth(480);
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
    synth.music("hub", true);
    this.time.delayedCall(600, () => void this.arrive());
  }

  private async arrive() {
    const s = G.s;
    const q = canTurnIn(s, "HOME");
    if (q) {
      await this.talk(q.turnIn.lines);
      const coins = completePersonal(s, q);
      G.emit("toast", { title: "PERSONAL QUEST COMPLETE", text: `${q.title}: +${coins} Krezzcoin. ${q.reward.desc}` });
      synth.play("ding");
      G.save();
    }
    if (s.flags.home_seen) return;
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
      this.prompt.setText(best.label).setPosition(this.me.x, this.me.y - 56).setVisible(true);
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
    this.cameras.main.fadeOut(500);
    await new Promise<void>((r) => this.time.delayedCall(700, () => r()));
    this.cameras.main.fadeIn(500);
    this.busy = false;
    G.emit("toast", { title: "SAVED", text: "You slept. You dreamt of two words on a loop: 'Krenshaw Kroplis'. Game saved." });
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
    const flyover = !s.flags.flyover_seen;
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
