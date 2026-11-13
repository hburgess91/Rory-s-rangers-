import Phaser from "phaser";
import { G } from "../G";
import { keysFor, prettyKey } from "../systems/keybinds";
import { button, FONT, panel, title } from "../ui/theme";
import { CHARACTERS } from "../../data/characters";
import { isTouchDevice } from "../ui/TouchControls";
import { synth } from "../audio/Synth";

/** The first time you ever enter a dungeon: the game pauses and this explains how to fight. */
export class TutorialScene extends Phaser.Scene {
  private caller = "Dungeon";
  private page = 0;
  private layer!: Phaser.GameObjects.Container;

  constructor() {
    super("Tutorial");
  }

  create(data: { caller?: string }) {
    this.caller = data.caller ?? "Dungeon";
    this.page = 0;
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.72);
    this.layer = this.add.container(0, 0);
    this.render();
    const next = () => this.advance();
    this.input.keyboard?.on("keydown-ENTER", next);
    this.input.keyboard?.on("keydown-SPACE", next);
    this.input.keyboard?.on("keydown-E", next);
    this.input.keyboard?.on("keydown-ESC", () => this.close());
  }

  private k(action: string) {
    return keysFor(action).slice(0, 2).map(prettyKey).join(" / ");
  }

  private pages(): { head: string; rows: [string, string][]; foot?: string }[] {
    const touch = isTouchDevice(this.game);
    const id = G.s?.player ?? "";
    const sig = (CHARACTERS as Record<string, { signature?: { name: string; desc: string; cost?: number } }>)[id]?.signature;
    return [
      {
        head: "WELCOME TO YOUR FIRST DUNGEON",
        rows: [
          ["Move", touch ? "Left side of the screen (thumbstick)" : `${[keysFor("up")[0], keysFor("left")[0], keysFor("down")[0], keysFor("right")[0]].map(prettyKey).join(" ")} (or the arrow keys)`],
          ["Shoot", touch ? "ATTACK button (hold; aims at the nearest enemy)" : `Left mouse (aim with the mouse) or ${this.k("attack")}`],
          ["Dodge roll", touch ? "DODGE button" : `${this.k("dodge")}. Dodge right as you get hit for a PERFECT DODGE (slow-mo)`],
          ["Swap gun", touch ? "GUN button" : `${this.k("swap")}. Empty guns swap automatically`],
          ["Talk / use / open", touch ? "E button" : this.k("interact")],
          ["Pause", touch ? "II button" : "Esc"],
        ],
        foot: "Clear every room of enemies to open the door to the next. The boss is at the end.",
      },
      {
        head: "SPECIAL MOVES",
        rows: [
          [sig ? `Special: ${sig.name}` : "Special", `${touch ? "SPECIAL button" : `Right mouse or ${this.k("special")}`}. ${sig?.desc ?? ""}${sig?.cost ? ` Costs ${sig.cost} Krezz.` : ""}`],
          ["Wonk Your Thang", `${touch ? "WONK button" : this.k("burst")}. Hitting things fills your WONK meter. At 100%, unleash it.`],
          ["Fart", `${touch ? "💨 button" : this.k("fart")}. Infinite, disgusting, surprisingly useful.`],
          ["Pussy juice", `${touch ? "PJ button" : this.k("bottle")}. The national drink. Heals you (and gets you wonky).`],
          ["Fizzy bongo", `${touch ? "🍺 button" : this.k("bongo")}. A cheeky bongo. Gets you merry.`],
          ["Golden form", `Later on: ${touch ? "⚡T, then CUME" : `${this.k("transform")}, then ${this.k("cume")} for the Cumehameha`}.`],
        ],
        foot: "Krezz is the blue bar. It refills over time. Health is the red one. Don't let it hit zero.",
      },
      {
        head: "GETTING STRONGER",
        rows: [
          ["Kreddle", "Over the Kreddle Bridge (west side of town): the neon casino universe. Win Krokens, then spend them on WEAPON UPGRADES, new guns and PERKS. Go. Seriously. Go."],
          ["The Kreddle Exchange", "Kreddle's bank. Upgrades, perks, ammo and exclusive guns."],
          ["Gun crates", "Smash them in dungeons for new guns and ammo."],
          ["Dying", "Happens. You wake up at home. Nobody mentions it."],
        ],
        foot: "Esc pauses at any time; CONTROLS in the pause menu lets you rebind every key.",
      },
    ];
  }

  private render() {
    this.layer.removeAll(true);
    const pages = this.pages();
    const p = pages[this.page];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (this.layer.add(o), o);
    add(panel(this, 70, 40, 820, 460) as unknown as Phaser.GameObjects.GameObject);
    add(title(this, 480, 80, p.head, 26));
    add(this.add.text(480, 108, `${this.page + 1} / ${pages.length}`, { fontFamily: FONT, fontSize: "12px", color: "#9aa0b4" }).setOrigin(0.5));
    let y = 136;
    for (const [name, desc] of p.rows) {
      const n = add(this.add.text(110, y, name, { fontFamily: FONT, fontSize: "15px", color: "#ffd23f", fontStyle: "bold", wordWrap: { width: 200 } }));
      const d = add(this.add.text(320, y, desc, { fontFamily: FONT, fontSize: "14px", color: "#ffffff", wordWrap: { width: 540, useAdvancedWrap: true } }));
      y += Math.max(n.height, d.height) + 12;
    }
    if (p.foot) add(this.add.text(480, Math.max(y + 6, 400), p.foot, { fontFamily: FONT, fontSize: "13px", color: "#9be7ff", align: "center", wordWrap: { width: 720 } }).setOrigin(0.5, 0));
    const last = this.page === pages.length - 1;
    add(button(this, 480, 462, last ? "LET'S GO" : "NEXT ▶", () => this.advance(), { w: 220, h: 38 }));
  }

  private advance() {
    synth.play("select");
    if (this.page < this.pages().length - 1) {
      this.page++;
      this.render();
    } else this.close();
  }

  private close() {
    G.meta.tutDungeon = true;
    G.saveMeta();
    this.scene.resume(this.caller);
    this.scene.get(this.caller).events.emit("ui-resume");
    this.scene.stop();
  }
}
