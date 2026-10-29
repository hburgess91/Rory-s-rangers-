import Phaser from "phaser";
import { G } from "../G";
import { Controls } from "../combat/Controls";
import { FONT, hexStr } from "../ui/theme";
import { CHARACTERS, PLAYABLE_ORDER } from "../../data/characters";
import { BARKS } from "../../content/dialogue/ambient";
import { NPC_TALK, type TalkSet } from "../../content/dialogue/npc";
import { CHATTER } from "../../content/dialogue/chatter";
import { evalCond } from "../systems/conditions";
import { runDialogue } from "./DialogueScene";
import { archiveAction, chapterIntroLines, currentStep, dungeonOpen, switchTo, townHallAction } from "../Flow";
import { chapterDef } from "../../content/chapters/chapters";
import type { Line } from "../../data/types";
import { synth } from "../audio/Synth";
import { maxBottles, maxHp } from "../systems/stats";
import { activeMods } from "../../data/historicalRevisions";
import { canTurnIn, completePersonal, pickupsInHub, collectPickup, ministryQuestFor, ministryQuestState, acceptMinistry, completeMinistry, ministryProgress } from "../systems/quests";
import { dir, ping, say } from "../../content/dsl";
import { narrativeActor } from "../systems/narrative";
import { arcStepAt, completeStep, maybeFinishArc } from "../systems/arcs";
import { DUNGEONS } from "../../data/dungeons";

const WORLD_W = 2560;
const WORLD_H = 1792;

interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  wall: number;
  roof: number;
  door?: { x: number; y: number };
}

const BUILDINGS: Building[] = [
  { id: "CITADEL", name: "THE GREAT WIKI CITADEL", x: 1280, y: 110, w: 380, h: 170, wall: 0xf8f9fa, roof: 0x3366cc, door: { x: 1280, y: 195 } },
  { id: "TOWN_HALL", name: "KRELFORD TOWN HALL", x: 1280, y: 420, w: 420, h: 230, wall: 0x9a7a5a, roof: 0x6b2737, door: { x: 1280, y: 535 } },
  { id: "ARCHIVE", name: "HISTORICAL ARCHIVE (FGM War Room below)", x: 1900, y: 420, w: 300, h: 200, wall: 0x8a7a5a, roof: 0x3a2f1f, door: { x: 1900, y: 520 } },
  { id: "BAN_TRIBUNAL", name: "BAN TRIBUNAL", x: 660, y: 420, w: 280, h: 190, wall: 0x6b6b7a, roof: 0x7c2d12, door: { x: 660, y: 515 } },
  { id: "PUB", name: "THE KREZZ ARMS", x: 560, y: 820, w: 300, h: 200, wall: 0x7a5230, roof: 0x3b2a1a, door: { x: 560, y: 920 } },
  { id: "BANK", name: "CENTRAL BANK OF KRELWORLD", x: 2000, y: 820, w: 280, h: 190, wall: 0xd6c49a, roof: 0x2f6b3a, door: { x: 2000, y: 915 } },
  { id: "HOME", name: "YOUR HOUSE", x: 520, y: 1250, w: 260, h: 180, wall: 0xb08d57, roof: 0x7a1f2b, door: { x: 520, y: 1340 } },
  { id: "WILDERN", name: "WILDERN ACADEMY (Krelford)", x: 1280, y: 1300, w: 420, h: 220, wall: 0xa0522d, roof: 0x5a5a6a, door: { x: 1280, y: 1410 } },
  { id: "MINISTRY", name: "MINISTRY OF BONER CONTROL", x: 2000, y: 1270, w: 340, h: 220, wall: 0x4b5563, roof: 0xd97706, door: { x: 2000, y: 1380 } },
  { id: "BONKY_TEMPLE", name: "THE BONKY TEMPLE", x: 2300, y: 220, w: 300, h: 200, wall: 0xc9a227, roof: 0x7c2d12, door: { x: 2300, y: 320 } },
  { id: "UNIVERSITY", name: "KRELFORD UNIVERSITY (Dept. of Philosophy & Psychology)", x: 840, y: 1260, w: 260, h: 180, wall: 0xb9b2a0, roof: 0x1e3a5f, door: { x: 840, y: 1350 } },
  { id: "GYM", name: "KRUNCH GYM", x: 2350, y: 600, w: 240, h: 170, wall: 0x3f3f46, roof: 0xf97316, door: { x: 2350, y: 685 } },
  { id: "FIXER_UPPER", name: "FIXER-UPPER (FOR SALE, AS SEEN)", x: 2350, y: 1300, w: 220, h: 160, wall: 0x8a7f6a, roof: 0x4a3f2f, door: { x: 2350, y: 1380 } },
  { id: "BOOTH", name: "THE BOOTH", x: 940, y: 680, w: 150, h: 110, wall: 0x6d28d9, roof: 0x111827, door: { x: 940, y: 735 } },
  { id: "ABANDONED", name: "ABANDONED BUILDING", x: 1000, y: 1660, w: 220, h: 140, wall: 0x2a2a2a, roof: 0x111111, door: { x: 1000, y: 1730 } },
  { id: "OLD_FLAT", name: "YOUR OLD FLAT", x: 700, y: 1650, w: 200, h: 130, wall: 0x9a8a7a, roof: 0x5a3a2a, door: { x: 700, y: 1715 } },
];

const GATES: { id: string; name: string; x: number; y: number }[] = [
  { id: "POLSON_ROAD", name: "→ POLSON TOWERS", x: 2500, y: 1010 },
  { id: "DOCKS", name: "DOCKS → KREZTEUA D'IF", x: 240, y: 1640 },
  { id: "AIRPORT", name: "→ KRELFORD INTERNATIONAL", x: 2500, y: 1650 },
];

const NPC_SPOTS: Record<string, { x: number; y: number }> = {
  KREZWONK: { x: 1790, y: 580 },
  SCROMBUS: { x: 1140, y: 610 },
  KREBLIS: { x: 1430, y: 610 },
  KREZMAR: { x: 1880, y: 980 },
  KREBON: { x: 720, y: 980 },
  CRONGUS: { x: 1110, y: 1470 },
  GRONNY: { x: 1140, y: 880 },
  FLENKY: { x: 800, y: 560 },
  MIKEY: { x: 430, y: 980 },
  POLSON: { x: 2330, y: 1000 },
  EDEN: { x: 2390, y: 1060 },
};

const ANCHORS: Record<string, { x: number; y: number }> = {
  SO_BIN: { x: 900, y: 1040 },
  SO_PIGEON: { x: 1520, y: 560 },
  SO_PUDDLE: { x: 1700, y: 1520 },
};

const FOLK_BARKS = [
  "Has anyone reacted yet?",
  "The word BAKERY fell off the bakery.",
  "I queued at the Tap with an eggcup.",
  "Is purple high or low?",
  "My name changed this morning. I'm Kevin now.",
  "The sky's buffering again.",
  "Bring back the lore!",
  "I heard Krebon is coming. Real butter.",
  "I'd react to the song if I could. I would. Probably.",
  "Fizzy bongo? It's medicinal now.",
  "They also have a Wildern in Krelford, you know.",
  "My nan had choccy cronstons in her drawer.",
  "Seen by 9. Nine!",
];

interface Npc {
  id: string;
  spr: Phaser.GameObjects.Sprite;
  home: { x: number; y: number };
  target: { x: number; y: number };
  nextMove: number;
  nextBark: number;
  bubble?: Phaser.GameObjects.Text;
  folk?: boolean;
  plate: Phaser.GameObjects.Text;
}

interface HubInteract {
  x: number;
  y: number;
  r: number;
  label: () => string;
  use: () => void;
  enabled?: () => boolean;
}

export class HubScene extends Phaser.Scene {
  private controls!: Controls;
  private av!: Phaser.Physics.Arcade.Sprite;
  private npcs: Npc[] = [];
  private interactables: HubInteract[] = [];
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private prompt!: Phaser.GameObjects.Text;
  private arrow!: Phaser.GameObjects.Text;
  private busy = false;
  private walkT = 0;
  private nextChatter = 0;
  private idleMs = 0;
  private anchorsSpr: Record<string, Phaser.GameObjects.GameObject[]> = {};

  constructor() {
    super("Hub");
  }

  create(data: { at?: string; from?: string }) {
    const s = G.s;
    s.phase = "hub";
    G.rt.timerEnd = 0;
    G.emit("timer", null);
    this.npcs = [];
    this.interactables = [];
    this.busy = false;
    this.anchorsSpr = {};
    this.cameras.main.fadeIn(350);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.drawWorld();
    this.controls = new Controls(this);
    const start = this.spawnPoint(data?.at);
    this.av = this.physics.add.sprite(start.x, start.y, `spr_${s.player}`, 0).setScale(2).setDepth(start.y);
    (this.av.body as Phaser.Physics.Arcade.Body).setSize(10, 8).setOffset(3, 15).setCollideWorldBounds(true);
    this.physics.add.collider(this.av, this.colliders);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.av, true, 0.12, 0.12);
    this.prompt = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#000000cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(5000).setVisible(false);
    this.arrow = this.add.text(0, 0, "➤", { fontFamily: FONT, fontSize: "26px", color: "#ffd23f" }).setOrigin(0.5).setDepth(5000).setShadow(2, 2, "#000", 0);
    this.spawnNpcs();
    this.setupInteractables();
    if (!this.scene.isActive("UI")) this.scene.launch("UI", { mode: "hub" });
    else this.scene.get("UI").events.emit("mode", "hub");
    G.emit("boss", null);
    G.emit("rule", null);
    synth.music("hub");
    G.save();
    this.time.delayedCall(400, () => this.onArrive(data?.from));
  }

  private async onArrive(from?: string) {
    const s = G.s;
    if (s.chapter > 1 && !s.flags[`ch${s.chapter}_intro`]) {
      s.flags[`ch${s.chapter}_intro`] = true;
      const ch = chapterDef(s.chapter);
      G.emit("toast", { title: `CHAPTER ${s.chapter}`, text: `${ch.title} — ${ch.subtitle}` });
      await this.talk(chapterIntroLines(s.chapter, s.player));
      G.save();
    }
    if (s.chapter === 1 && !s.flags.ch1_hub_tip) {
      s.flags.ch1_hub_tip = true;
      G.emit("toast", { title: "KRELFORD", text: "WASD to walk. E to talk/interact. Follow the yellow arrow. Esc for menu (quests, upgrades, save)." });
    }
    if (s.chapter === 6 && s.flags.final_reading && !s.flags.kreltower_resolved && !s.flags.hijack_alert) {
      s.flags.hijack_alert = true;
      synth.play("alarm");
      await this.talk([
        say("KREBLIS", "This is a Krelmergency message. I repeat. This is a Krelmergency message."),
        say("KREBLIS", "Flight KR-069 out of Krelford International has been hijacked. The hijacker is wearing a balaclava and a stick-on moustache. It's Krozno. It's obviously Krozno."),
        say("KREBLIS", "The plane is heading for the Kreltower. Which, I'd like to remind everyone, only just got rebuilt."),
        ping("DRONGUS", "Not the Kreltower !!"),
        ping("DRONGUS", "Somebody do something. Not me, I'm busy making a song about it"),
        dir("NEW OBJECTIVE: get to Krelford International (south-east gate) and stop Flight KR-069. You will be on a clock."),
      ]);
      G.save();
    }
    if (from === "arena" || from === "vignette" || from === "minigame" || from === "dungeon") this.arcPayout();
    G.drongus("hub");
    if (from === "dungeon") G.emit("toast", { title: "BACK IN KRELFORD", text: "Report to the Town Hall." });
  }

  private spawnPoint(at?: string) {
    const b = BUILDINGS.find((x) => x.id === at);
    if (b?.door) return { x: b.door.x, y: b.door.y + 40 };
    const gt = GATES.find((g) => g.id === at);
    if (gt) return { x: gt.x - 60, y: gt.y };
    return { x: 1280, y: 900 };
  }

  // ------------------------------------------------------------- world

  private drawWorld() {
    this.add.tileSprite(0, 0, WORLD_W, WORLD_H, "tile_grass").setOrigin(0).setDepth(0);
    // roads
    this.add.tileSprite(80, 780, WORLD_W - 80, 90, "tile_road").setOrigin(0).setDepth(0);
    this.add.tileSprite(1235, 200, 90, 1500, "tile_road").setOrigin(0).setDepth(0);
    this.add.tileSprite(300, 1500, 2000, 70, "tile_road").setOrigin(0).setDepth(0);
    this.add.tileSprite(500, 560, 1700, 60, "tile_road").setOrigin(0).setDepth(0);
    this.add.tileSprite(200, 1000, 70, 700, "tile_road").setOrigin(0).setDepth(0);
    this.add.tileSprite(2400, 860, 160, 290, "tile_road").setOrigin(0).setDepth(0);
    // plaza
    this.add.tileSprite(1060, 650, 440, 340, "tile_cobble").setOrigin(0).setDepth(0);
    // sea (docks)
    this.add.rectangle(0, 1700, 560, 92, 0x1e4b7a).setOrigin(0).setDepth(0);
    this.add.rectangle(200, 1600, 80, 140, 0x6b4527).setOrigin(0).setDepth(1);
    this.colliders = this.physics.add.staticGroup();
    for (const b of BUILDINGS) this.drawBuilding(b);
    // The Great Tap
    this.add.image(1280, 800, "p_tap").setScale(3).setDepth(800);
    this.add.text(1280, 690, "THE GREAT PUSSY JUICE TAP", { fontFamily: FONT, fontSize: "11px", color: "#ffb6c1", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(801);
    this.colliders.add(this.add.rectangle(1280, 840, 120, 60, 0, 0));
    // The Kreltower
    if (G.s.flags.kreltower_fell) {
      this.add.image(1650, 1100, "p_rubble").setOrigin(0.5, 1).setScale(2).setDepth(1100);
      this.add.text(1650, 1110, "WHERE THE KRELTOWER WAS (AGAIN)", { fontFamily: FONT, fontSize: "11px", color: "#ff9a9a", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setDepth(1101);
    } else {
      this.add.image(1650, 1100, "p_kreltower").setOrigin(0.5, 1).setScale(1.2).setDepth(1100);
      this.add.text(1650, 1110, "THE KRELTOWER (rebuilt)", { fontFamily: FONT, fontSize: "11px", color: "#ffffff", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setDepth(1101);
    }
    this.colliders.add(this.add.rectangle(1650, 1085, 70, 30, 0, 0));
    this.interactables.push({ x: 1650, y: 1135, r: 55, label: () => (G.s.flags.kreltower_fell ? "Look at the rubble" : "Read the Kreltower plaque"), use: () => this.kreltowerPlaque() });
    // public TV
    this.add.image(1450, 740, "p_tv").setScale(3).setDepth(740);
    this.add.text(1450, 700, "KrelTV", { fontFamily: FONT, fontSize: "10px", color: "#88aaff" }).setOrigin(0.5).setDepth(741);
    // vending machines
    for (const [x, y] of [
      [1100, 720],
      [1880, 600],
      [700, 1080],
      [1500, 1450],
    ]) {
      this.add.image(x, y, "p_vending").setScale(2).setDepth(y);
      this.colliders.add(this.add.rectangle(x, y + 10, 36, 30, 0, 0));
      this.interactables.push({ x, y: y + 44, r: 46, label: () => this.vendingLabel(), use: () => this.vend(x, y) });
    }
    // gates
    for (const gt of GATES) {
      this.add.text(gt.x, gt.y - 40, gt.name, { fontFamily: FONT, fontSize: "12px", color: "#ffd23f", backgroundColor: "#000000aa", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(gt.y);
      this.add.rectangle(gt.x, gt.y, 60, 60, 0xffd23f, 0.15).setStrokeStyle(2, 0xffd23f).setDepth(1);
    }
    // trees
    const rnd = new Phaser.Math.RandomDataGenerator(["krelford"]);
    for (let i = 0; i < 70; i++) {
      const x = rnd.between(40, WORLD_W - 40);
      const y = rnd.between(40, WORLD_H - 120);
      if (this.nearBuilding(x, y, 70) || (Math.abs(x - 1280) < 90) || (y > 760 && y < 900) || (y > 1480 && y < 1590)) continue;
      const t = this.add.circle(x, y, 18, 0x2f5a22).setDepth(y);
      this.add.circle(x - 5, y - 6, 8, 0x3d7a2c).setDepth(y + 1);
      this.colliders.add(this.add.rectangle(x, y + 8, 16, 12, 0, 0));
      void t;
    }
    // world edge text
    this.add.text(1280, WORLD_H - 30, "KRELFORD · Krelworld · its own fucking universe/dimension", { fontFamily: FONT, fontSize: "12px", color: "#ffffff" }).setOrigin(0.5).setAlpha(0.4);
  }

  private nearBuilding(x: number, y: number, pad: number) {
    return BUILDINGS.some((b) => x > b.x - b.w / 2 - pad && x < b.x + b.w / 2 + pad && y > b.y - b.h / 2 - pad && y < b.y + b.h / 2 + pad);
  }

  private drawBuilding(b: Building) {
    const g = this.add.graphics().setDepth(b.y + b.h / 2 - 1);
    const x0 = b.x - b.w / 2;
    const y0 = b.y - b.h / 2;
    g.fillStyle(0x000000, 0.25);
    g.fillRect(x0 + 8, y0 + 12, b.w, b.h);
    g.fillStyle(b.wall, 1);
    g.fillRect(x0, y0 + 40, b.w, b.h - 40);
    g.fillStyle(b.roof, 1);
    g.fillTriangle(x0 - 14, y0 + 44, x0 + b.w + 14, y0 + 44, b.x, y0 - 20);
    g.fillRect(x0 - 14, y0 + 30, b.w + 28, 16);
    // windows
    g.fillStyle(0x223355, 1);
    for (let wx = x0 + 24; wx < x0 + b.w - 40; wx += 56) {
      if (Math.abs(wx + 12 - b.x) < 40) continue;
      g.fillRect(wx, y0 + 70, 26, 30);
      g.fillStyle(0xffe08a, 0.6);
      g.fillRect(wx + 3, y0 + 73, 9, 11);
      g.fillStyle(0x223355, 1);
    }
    // door
    if (b.door) {
      g.fillStyle(0x2a1a0a, 1);
      g.fillRect(b.door.x - 22, b.y + b.h / 2 - 56, 44, 56);
      g.fillStyle(0xd4a017, 1);
      g.fillRect(b.door.x + 12, b.y + b.h / 2 - 30, 4, 4);
    }
    // sign (the word TOWN has fallen off the Town Hall in Ch1)
    let name = b.name;
    if (b.id === "TOWN_HALL" && G.s.chapter === 1 && !G.s.flags.ch1_clear) name = "KRELFORD ____ HALL";
    if (b.id === "HOME") name = `${CHARACTERS[G.s.player].name}'S HOUSE`;
    this.add.text(b.x, y0 + 52, name, { fontFamily: FONT, fontSize: "12px", color: "#ffffff", backgroundColor: "#00000099", padding: { x: 4, y: 2 }, align: "center", wordWrap: { width: b.w - 10 } }).setOrigin(0.5, 0).setDepth(b.y + b.h / 2);
    this.colliders.add(this.add.rectangle(b.x, b.y + 10, b.w, b.h - 20, 0, 0));
  }

  // ------------------------------------------------------------- NPCs

  private spawnNpcs() {
    const s = G.s;
    for (const id of [...PLAYABLE_ORDER, "POLSON", "EDEN"]) {
      if (id === s.player) continue;
      if ((id === "POLSON" || id === "EDEN") && s.chapter < 3) continue;
      this.addNpc(id, NPC_SPOTS[id]);
    }
    // Proctus fills the player's spot
    this.addNpc("PROCTUS", NPC_SPOTS[s.player] ?? { x: 1300, y: 640 });
    // townsfolk
    for (let i = 0; i < 6; i++) {
      const x = 400 + i * 330;
      const y = i % 2 ? 840 : 720;
      this.addNpc(`FOLK${i % 4}`, { x, y }, true);
    }
    // The Tap as a speaker (interactable)
    this.interactables.push({
      x: 1280,
      y: 900,
      r: 80,
      label: () => (G.s.chapter === 1 && !G.s.flags.ch1_clear ? "Inspect the Great Tap (dry)" : "Drink from the Great Tap"),
      use: () => this.useTap(),
    });
  }

  private addNpc(id: string, at: { x: number; y: number }, folk = false) {
    const spr = this.add.sprite(at.x, at.y, `spr_${id}`, 0).setScale(2).setDepth(at.y);
    const def = CHARACTERS[id];
    const plateTxt = id === "PROCTUS" ? `PROCTUS KRELMOR\n${CHARACTERS[G.s.player].proctusTitle}` : def ? def.name : "";
    const plate = this.add.text(at.x, at.y - 36, plateTxt, { fontFamily: FONT, fontSize: "9px", color: def ? hexStr(def.color) : "#cccccc", align: "center", backgroundColor: "#00000077", padding: { x: 2, y: 1 } }).setOrigin(0.5, 1).setDepth(4000);
    if (folk) plate.setVisible(false);
    const n: Npc = { id, spr, home: { ...at }, target: { ...at }, nextMove: this.time.now + Math.random() * 3000, nextBark: this.time.now + 3000 + Math.random() * 8000, folk, plate };
    this.npcs.push(n);
    if (!folk) {
      const it: HubInteract = { x: at.x, y: at.y, r: 50, label: () => `Talk to ${id === "PROCTUS" ? "Proctus" : def?.name ?? id}`, use: () => this.talkTo(n) };
      (it as any).__npc = n;
      this.interactables.push(it);
    }
  }

  private bubble(n: Npc, text: string, ms = 2600) {
    n.bubble?.destroy();
    n.bubble = this.add.text(n.spr.x, n.spr.y - 52, text, { fontFamily: FONT, fontSize: "11px", color: "#050505", backgroundColor: "#ffffff", padding: { x: 5, y: 3 }, wordWrap: { width: 200 }, align: "center" }).setOrigin(0.5, 1).setDepth(4500);
    const b = n.bubble;
    this.time.delayedCall(ms, () => b.destroy());
  }

  private updateNpcs(now: number, dt: number) {
    for (const n of this.npcs) {
      if (now > n.nextMove && !this.busy) {
        n.nextMove = now + 2500 + Math.random() * 4000;
        const r = n.folk ? 160 : 50;
        n.target = { x: n.home.x + (Math.random() - 0.5) * r * 2, y: n.home.y + (Math.random() - 0.5) * r };
      }
      const dx = n.target.x - n.spr.x;
      const dy = n.target.y - n.spr.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) {
        const sp = (n.folk ? 50 : 35) * (dt / 1000);
        n.spr.x += (dx / d) * sp;
        n.spr.y += (dy / d) * sp;
        n.spr.setFlipX(dx < 0);
        n.spr.setFrame(Math.floor(now / 160) % 2 ? 1 : 2);
      } else n.spr.setFrame(0);
      n.spr.setDepth(n.spr.y);
      n.plate.setPosition(n.spr.x, n.spr.y - 36);
      if (n.bubble?.active) n.bubble.setPosition(n.spr.x, n.spr.y - 52);
      // ambient barks near the player
      if (now > n.nextBark && Phaser.Math.Distance.Between(n.spr.x, n.spr.y, this.av.x, this.av.y) < 420) {
        n.nextBark = now + 9000 + Math.random() * 12000;
        if (n.folk) this.bubble(n, FOLK_BARKS[Math.floor(Math.random() * FOLK_BARKS.length)]);
        else {
          const list = (BARKS[n.id] ?? []).filter((b) => evalCond(b.cond, G.s));
          if (list.length) this.bubble(n, list[Math.floor(Math.random() * list.length)].t);
        }
      }
    }
    // keep talk interactables attached to NPC positions
    for (const it of this.interactables) {
      const npc = (it as any).__npc as Npc | undefined;
      if (npc) {
        it.x = npc.spr.x;
        it.y = npc.spr.y;
      }
    }
  }

  private tryChatter(now: number) {
    if (now < this.nextChatter || this.busy) return;
    this.nextChatter = now + 5000;
    const s = G.s;
    const present = new Map(this.npcs.filter((n) => !n.folk).map((n) => [n.id, n]));
    const candidates = CHATTER.filter((c) => evalCond(c.cond, s) && !s.flags[`chat_${c.id}`] && c.who.every((w) => present.has(w as string)) && c.who.some((w) => Phaser.Math.Distance.Between(present.get(w as string)!.spr.x, present.get(w as string)!.spr.y, this.av.x, this.av.y) < 260));
    if (!candidates.length) return;
    const c = candidates[Math.floor(Math.random() * candidates.length)];
    s.flags[`chat_${c.id}`] = true;
    this.nextChatter = now + 6000 + c.lines.length * 2000;
    c.lines.forEach((l, i) => {
      this.time.delayedCall(i * 2000, () => {
        if (l.s === "DRONGUS") G.emit("ping", { from: "DRONGUS", text: l.t });
        else if (l.s === "NARRATOR") {
          const n = present.get(c.who[0] as string);
          if (n) this.bubble(n, l.t, 1900);
          if (l.t.includes("sandwich")) G.s.flags.proctus_lunch = true;
        } else {
          const n = present.get(l.s as string);
          if (n) this.bubble(n, l.t, 1950);
        }
      });
    });
  }

  // ------------------------------------------------------------- interactions

  private setupInteractables() {
    for (const b of BUILDINGS) {
      if (!b.door) continue;
      this.interactables.push({ x: b.door.x, y: b.door.y + 10, r: 46, label: () => this.doorLabel(b), use: () => this.enterBuilding(b) });
    }
    for (const gt of GATES) {
      this.interactables.push({ x: gt.x, y: gt.y, r: 60, label: () => this.doorLabel({ id: gt.id, name: gt.name } as Building), use: () => this.enterBuilding({ id: gt.id, name: gt.name } as Building) });
    }
    this.interactables.push({ x: 1450, y: 780, r: 60, label: () => "Watch KrelTV", use: () => this.openTV() });
    // Kreblis quest: strange occurrences
    for (const { quest, spot, anchor } of pickupsInHub(G.s)) {
      const a = ANCHORS[anchor];
      if (!a) continue;
      const tex = anchor === "SO_BIN" ? "p_bin" : anchor === "SO_PIGEON" ? "p_pigeon" : "p_puddle";
      const spr = this.add.image(a.x, a.y, tex).setScale(2.2).setDepth(a.y);
      const glow = this.add.circle(a.x, a.y, 22, 0xffd23f, 0.2).setDepth(a.y - 1);
      this.anchorsSpr[anchor] = [spr, glow];
      this.interactables.push({
        x: a.x,
        y: a.y,
        r: 50,
        label: () => `File: ${spot.label}`,
        enabled: () => !G.s.flags[`qp_${quest.id}_${spot.id}`],
        use: async () => {
          collectPickup(G.s, quest, spot);
          synth.play("pickup");
          glow.destroy();
          await this.talk([dir(`${spot.label}. You file it under Strange Occurrences.`), say("KREBLIS", "Strange. Very strange. History will judge it.")]);
          G.emit("toast", { title: "PERSONAL QUEST", text: `${quest.title}: filed (${spot.label})` });
        },
      });
    }
  }

  private doorLabel(b: Building): string {
    const s = G.s;
    const ch = chapterDef(s.chapter);
    const arc = arcStepAt(s, b.id);
    if (arc && !(b.id === "TOWN_HALL" && this.townHallBusy())) return `${b.name}: ★ ${arc.step.text}`;
    if (b.id === ch.dungeonDoor) {
      const o = dungeonOpen();
      return o.open ? `Enter: ${b.name}` : `${b.name} (locked: ${o.why})`;
    }
    switch (b.id) {
      case "TOWN_HALL": {
        const a = townHallAction();
        return a.kind === "meeting" ? "Enter Town Hall (MEETING IN PROGRESS)" : a.kind === "outro" ? "Enter Town Hall (report back)" : a.kind === "fact" ? "Enter Town Hall (submit a Krazy Fact)" : "Enter Town Hall";
      }
      case "ARCHIVE":
        return archiveAction().kind === "meeting" ? "Enter the Archive (the cabinet is waiting)" : "Enter the Historical Archive";
      case "PUB":
        return "Enter The Krezz Arms";
      case "BANK":
        return "Enter the Central Bank (upgrades)";
      case "HOME":
        return "Go home (sleep · save · TV)";
      case "BAN_TRIBUNAL":
        return s.flags.ban_tribunal_open ? "Enter the Ban Tribunal" : "Ban Tribunal (closed until the constitutional crisis)";
      case "BOOTH":
        return "The Booth (Bully Mikey · vent your frustration)";
      case "UNIVERSITY":
        return "Enter Krelford University";
      case "GYM":
        return "Enter Krunch Gym";
      case "FIXER_UPPER":
        return "Look at the fixer-upper";
      case "ABANDONED":
        return s.flags.arc_crongus_done ? "The Abandoned Building (you think about it every day)" : "The Abandoned Building";
      case "OLD_FLAT":
        return "Your old flat";
      case "AIRPORT":
        return s.chapter === 6 && s.flags.final_reading && !s.flags.kreltower_resolved ? "KRELFORD INTERNATIONAL: STOP FLIGHT KR-069" : "Krelford International";
      case "CITADEL":
      case "WILDERN":
      case "MINISTRY":
      case "BONKY_TEMPLE":
      case "POLSON_ROAD":
      case "DOCKS":
        return `${b.name} (not this chapter)`;
    }
    return b.name;
  }

  private async enterBuilding(b: Building) {
    const s = G.s;
    const ch = chapterDef(s.chapter);
    synth.play("door");
    if (b.id === ch.dungeonDoor) {
      const o = dungeonOpen();
      if (!o.open) {
        G.emit("toast", { title: "LOCKED", text: o.why ?? "Not yet." });
        return;
      }
      this.go("Dungeon", { dungeon: ch.dungeon, room: 0 });
      return;
    }
    if (!(b.id === "TOWN_HALL" && this.townHallBusy()) && (await this.runArcStep(b.id))) return;
    switch (b.id) {
      case "BOOTH":
        await this.talk(
          s.player === "MIKEY"
            ? [dir("The Booth. There's a heavy bag in here shaped like you. Mikey can't bully Mikey, so Proctus Krelmor has been volunteered as Acting Mikey."), say("PROCTUS", "I've been told this is ministerial.")]
            : [dir("The Booth. Mikey is hanging from the ceiling in a punching-bag harness. He has brought his own harness."), say("MIKEY", "Mikey here. Go on then. Get it out of your system.")],
        );
        this.go("Minigame", { mode: "bully", returnAt: "BOOTH" });
        return;
      case "UNIVERSITY":
        await this.talk([dir("Krelford University. A student is protesting outside the philosophy department with a sign that reads 'IS THE LORE REAL?'. Inside, a lecture on 'Seen By 9: Phenomenology of Being Ignored' is oversubscribed.")]);
        return;
      case "GYM":
        await this.talk([dir("Krunch Gym. Smells of pre-workout and regret. Somebody has written 'RE-RACK YOUR WEIGHTS' on the wall, and somebody else has written 'NO' underneath."), say("FOLK1", "Do you even wonk, bro?")]);
        return;
      case "FIXER_UPPER":
        await this.talk(s.flags.arc_scrombus_done ? [dir("SOLD. A blue plaque reads: 'Ben Scrombus flipped this. Krelworld was next.'")] : [dir("A crumbling terrace. 'FOR SALE (AS SEEN)'. There is a hole where the bathroom should be, and a bathroom where the hole should be.")]);
        return;
      case "ABANDONED":
        await this.talk(
          s.flags.arc_crongus_done
            ? [dir("The door is boarded up again. From inside, faintly: 'mmmm'."), say(s.player, "…no. No. Keep walking.")]
            : [dir("Boarded windows. A faint smell of custard. Something inside is breathing slowly and contentedly. You decide you're not ready.")],
        );
        return;
      case "OLD_FLAT":
        await this.talk([dir("Your old flat. Someone's new tenancy agreement is pinned to the door. It specifically mentions the carpet. In bold. Underlined.")]);
        return;
      case "AIRPORT": {
        if (s.chapter === 6 && s.flags.final_reading && !s.flags.kreltower_resolved) {
          G.rt.timerEnd = 0;
          this.go("Dungeon", { dungeon: "airport", room: 0 });
          return;
        }
        await this.talk(
          s.flags.kreltower_fell
            ? [dir("Krelford International. Every flight is cancelled. The departures board just says 'NO'.")]
            : s.flags.kreltower_saved
              ? [dir("Krelford International. There's a new statue in departures of you pulling a plane out of the sky. It is anatomically generous.")]
              : [dir("Krelford International. Flights to Kreddle, Krezteua d'If and 'Fragmar Prime (Seasonal)'. Security is one man reacting to his phone.")],
        );
        return;
      }
      case "TOWN_HALL": {
        const a = townHallAction();
        if (a.kind === "meeting") {
          const next = a.id === "krazy_fact_emergency" ? { scene: "KrazyFact", data: {} } : { scene: "Hub", data: { at: "TOWN_HALL" } };
          this.go("Meeting", { id: a.id, next });
        } else if (a.kind === "outro") {
          s.flags[`ch${s.chapter}_outro`] = true;
          this.go("Cutscene", { script: `ch${s.chapter}_outro`, bg: "townhall", music: "meeting", next: { scene: "KrazyFact", data: {} } });
        } else if (a.kind === "fact") this.go("KrazyFact", {});
        else {
          const q = canTurnIn(s, "TOWN_HALL");
          if (q) await this.turnIn(q);
          else await this.talk([dir("The Town Hall is in recess. The horseshoe table is sticky. A cleaner is scrubbing the word 'HOSTILE' off the minutes.")]);
        }
        return;
      }
      case "ARCHIVE": {
        const a = archiveAction();
        if (a.kind === "meeting") {
          this.go("Meeting", { id: a.id, next: { scene: "Hub", data: { at: "ARCHIVE" } } });
          return;
        }
        const q = canTurnIn(s, "ARCHIVE");
        if (q) await this.turnIn(q);
        G.drongus("archive");
        this.go("Archive", { returnAt: "ARCHIVE" });
        return;
      }
      case "PUB":
        G.drongus("pub");
        this.go("Pub", {});
        return;
      case "BANK": {
        const q = canTurnIn(s, "BANK");
        if (q) await this.turnIn(q);
        this.openMenu("bank");
        return;
      }
      case "HOME":
        await this.home();
        return;
      case "BAN_TRIBUNAL":
        if (!s.flags.ban_tribunal_open) {
          await this.talk([dir("A sign on the door: 'BAN TRIBUNAL — OPENING SOON. Opening date to be confirmed by the Flenky Constitutional Crisis.' Underneath, in different handwriting: 'pls'.")]);
          return;
        }
        {
          const q = canTurnIn(s, "BAN_TRIBUNAL");
          if (q) await this.turnIn(q);
        }
        this.openMenu("tribunal");
        return;
      default:
        await this.talk([dir(`${b.name}. Not now. The lore says not yet.`)]);
    }
  }

  private townHallBusy() {
    const k = townHallAction().kind;
    return k === "meeting" || k === "outro" || k === "fact";
  }

  private arcPayout() {
    const r = maybeFinishArc(G.s);
    if (r) {
      synth.play("cheer");
      G.emit("toast", { title: "SIDE STORY COMPLETE", text: r });
      G.save();
    }
  }

  /** Run the player's current character-arc step at this building. Returns true if it took over. */
  private async runArcStep(at: string): Promise<boolean> {
    const s = G.s;
    const c = arcStepAt(s, at);
    if (!c) return false;
    const { arc, step } = c;
    const k = step.step;
    G.emit("toast", { title: arc.title.toUpperCase(), text: step.text });
    switch (k.kind) {
      case "dialogue":
        await this.talk(k.lines);
        completeStep(s, arc, step);
        break;
      case "pay": {
        await this.talk(k.intro);
        if (s.coins < k.cost) {
          await this.talk([dir(`You need ${k.cost} Krezzcoin. You have ${s.coins}. Go kill some smolts.`)]);
          return true;
        }
        delete s.flags.arc_pay;
        await this.talk([{ s: "NARRATOR", t: `Pay ${k.cost} Krezzcoin?`, dir: true, choice: [{ label: `Pay ${k.cost}`, set: { arc_pay: 1 } }, { label: "Not now", set: { arc_pay: 0 } }] }]);
        if (s.flags.arc_pay !== 1) return true;
        s.coins -= k.cost;
        synth.play("coin");
        completeStep(s, arc, step);
        await this.talk(k.success);
        break;
      }
      case "quiz": {
        await this.talk(k.intro);
        let score = 0;
        for (const q of k.questions) {
          delete s.flags.arc_q;
          await this.talk([{ s: "NARRATOR", t: q.q, dir: true, choice: q.options.map((o, i) => ({ label: o, set: { arc_q: i === q.correct ? 1 : 0 } })) }]);
          if (s.flags.arc_q === 1) {
            score++;
            synth.play("ding");
          } else {
            synth.play("tap_fail");
            await this.talk([dir(q.wrong)]);
          }
        }
        delete s.flags.arc_q;
        if (score >= k.need) {
          completeStep(s, arc, step);
          await this.talk(k.success);
        } else {
          await this.talk([...k.fail, dir(`(${score}/${k.need} needed. Try again.)`)]);
          return true;
        }
        break;
      }
      case "arena":
        await this.talk(k.intro);
        G.emit("toast", { title: "ARENA", text: DUNGEONS[k.dungeon]?.name ?? "Fight!" });
        this.go("Dungeon", { dungeon: k.dungeon, room: 0 });
        return true;
      case "minigame":
        await this.talk(k.intro);
        this.go("Minigame", { mode: k.mode, returnAt: at });
        return true;
      case "vignette":
        await this.talk(k.intro);
        completeStep(s, arc, step);
        G.save();
        this.go("Vignette", { id: k.id, returnAt: at });
        return true;
    }
    G.save();
    this.arcPayout();
    return true;
  }

  private async kreltowerPlaque() {
    const f = G.s.flags;
    if (f.kreltower_fell)
      await this.talk([
        dir("A pile of rubble. Someone has already put a sign in it: 'KRELTOWER III — COMING SOON'. Someone else has stuck a fizzy bongo in the top like a candle."),
        say(G.s.player, "It only just got rebuilt."),
      ]);
    else if (f.kreltower_saved)
      await this.talk([dir("THE KRELTOWER. Built. Destroyed. Rebuilt. NOT destroyed again, thanks to you. There's a new line on the plaque: 'Saved from Flight KR-069. Krozno was up to his usual dirty bloody tricks.'")]);
    else
      await this.talk([
        dir("THE KRELTOWER. A plaque reads: 'Destroyed in the Great Krezzsplosion. Rebuilt with Krelfund money. Please do not fly anything into it.'"),
        dir("Someone has scratched underneath: 'pls react'."),
      ]);
  }

  private async home() {
    const s = G.s;
    const q = canTurnIn(s, "HOME");
    if (q) await this.turnIn(q);
    await this.talk([
      {
        s: "NARRATOR",
        t: `${CHARACTERS[s.player].name}'s house. There's a bed, a CRT telly, and a fridge you trust more than Polson's.`,
        dir: true,
        choice: [
          { label: "Sleep (save, full health, sober up)", set: { home_pick: "sleep" } },
          { label: "Watch KrelTV", set: { home_pick: "tv" } },
          { label: "Leave", set: { home_pick: "leave" } },
        ],
      },
    ]);
    const pick = s.flags.home_pick;
    if (pick === "sleep") {
      s.hp = maxHp(s);
      s.intoxication = 0;
      s.bottles = Math.max(s.bottles, s.flags.ch1_clear ? maxBottles(s) : s.bottles);
      G.save();
      this.cameras.main.fadeOut(400);
      this.time.delayedCall(450, () => {
        this.cameras.main.fadeIn(400);
        G.emit("toast", { title: "SAVED", text: "You slept. You dreamt of two words on a loop: 'Krenshaw Kroplis'. Game saved." });
      });
    } else if (pick === "tv") this.openTV();
  }

  private async turnIn(q: ReturnType<typeof canTurnIn> & object) {
    await this.talk(q.turnIn.lines);
    const coins = completePersonal(G.s, q);
    G.emit("toast", { title: "PERSONAL QUEST COMPLETE", text: `${q.title}: +${coins} Krezzcoin. ${q.reward.desc}` });
    synth.play("ding");
    G.save();
  }

  private async talkTo(n: Npc) {
    const s = G.s;
    if (this.busy) return;
    const sets: TalkSet[] = (NPC_TALK[n.id] ?? []).filter((t) => evalCond(t.cond, s) && !(t.once && s.flags[`talk_${t.once}`]));
    let lines: Line[] = [];
    if (sets.length) {
      const top = Math.max(...sets.map((t) => t.priority));
      const best = sets.filter((t) => t.priority === top);
      const pick = best[Math.floor(Math.random() * best.length)];
      if (pick.once) s.flags[`talk_${pick.once}`] = true;
      lines = [...pick.lines];
    } else {
      const b = (BARKS[n.id] ?? []).filter((x) => evalCond(x.cond, s));
      if (b.length) lines = [say(n.id, b[Math.floor(Math.random() * b.length)].t)];
    }
    // Proctus, legally a doctor
    if (n.id === "PROCTUS" && activeMods(s).proctusDoctor) {
      lines.push({
        s: "PROCTUS",
        t: "Shall I doctor you? I'm legally allowed now.",
        choice: [
          { label: "Yes, heal me (side effects may include side effects)", set: { doc_pick: "yes" } },
          { label: "Absolutely not", set: { doc_pick: "no" } },
        ],
      });
    }
    // Great Tap is sentient: it might be addressed via the Tap interactable instead.
    await this.talk(lines);
    if (n.id === "PROCTUS" && s.flags.doc_pick === "yes") {
      delete s.flags.doc_pick;
      s.hp = maxHp(s);
      const fx = Math.random();
      if (fx < 0.33) {
        s.intoxication = Math.min(100, s.intoxication + 30);
        G.emit("toast", { title: "DR. PROCTUS", text: "Fully healed. Side effect: you are now quite drunk." });
      } else if (fx < 0.66) {
        s.krezz = 0;
        G.emit("toast", { title: "DR. PROCTUS", text: "Fully healed. Side effect: he took all your Krezz as payment." });
      } else G.emit("toast", { title: "DR. PROCTUS", text: "Fully healed. Side effect: he's now calling you 'Kevin'." });
    }
    // ministerial side quests
    const mq = ministryQuestFor(n.id, s);
    if (mq) {
      const st = ministryQuestState(s, mq);
      const giver = narrativeActor(mq.ministry, s.player);
      if (giver === n.id) {
        if (st === "available") {
          await this.talk([
            {
              s: n.id,
              t: `Ministry business. ${mq.title}: ${mq.desc}`,
              choice: [
                { label: "Accept", set: { mq_pick: "yes" } },
                { label: "Not now", set: { mq_pick: "no" } },
              ],
            },
          ]);
          if (s.flags.mq_pick === "yes") {
            acceptMinistry(s, mq);
            G.emit("toast", { title: "MINISTRY QUEST", text: `${mq.title} (0/${mq.target})` });
          }
          delete s.flags.mq_pick;
        } else if (st === "ready") {
          const coins = completeMinistry(s, mq);
          await this.talk([say(n.id, `${mq.title}: done. The ministry is grateful. Mildly. Here's ${coins} Krezzcoin.`)]);
          synth.play("ding");
        } else if (st === "active") {
          G.emit("toast", { title: "MINISTRY QUEST", text: `${mq.title}: ${ministryProgress(s, mq)}/${mq.target}` });
        }
      }
    }
    G.save();
  }

  private async useTap() {
    const s = G.s;
    if (s.chapter === 1 && !s.flags.ch1_clear) {
      await this.talk([dir("The Great Pussy Juice Tap coughs. A single drop falls. A citizen with an eggcup weeps."), dir("Something big is sitting on the main under Wildern Academy.")]);
      return;
    }
    const lines: Line[] = [];
    if (activeMods(s).tapSentient) {
      lines.push(say("TAP", "Oh. Hello. Thirsty? Everyone's always thirsty. Nobody ever asks how I am."));
      lines.push({
        s: "TAP",
        t: "Do you think Drongus appreciates me? He's never reacted to me either.",
        react: { message: "THE GREAT TAP: 'Do you think Drongus appreciates me?'", context: "tap_feelings", from: "TAP", outcomes: { LOVE: [say("TAP", "Oh. Oh that's lovely. Glug.")], SEEN: [say("TAP", "Seen. Right. I'm used to it.")] } },
      });
    }
    lines.push(dir("You drink deeply from the national drink. Health restored. Pussy juice bottles refilled."));
    await this.talk(lines);
    s.hp = maxHp(s);
    s.bottles = maxBottles(s);
    s.intoxication = Math.max(0, s.intoxication - 20);
    synth.play("tap");
    G.save();
  }

  private vendingLabel() {
    const s = G.s;
    if (s.chapter === 3 && !s.flags.ch3_clear) return "Vending machine (OUT OF ORDER: pressure low)";
    return s.flags.arc_krezmar_done ? "Pussy Juice Vending (FREE for you, forever)" : "Pussy Juice Vending (15 Krezzcoin: +1 bottle)";
  }

  private vend(x: number, y: number) {
    const s = G.s;
    if (s.chapter === 3 && !s.flags.ch3_clear) {
      G.emit("toast", { title: "VENDING", text: "OUT OF ORDER. Pussy juice pressure too low. Fix the Ministry." });
      return;
    }
    if (s.bottles >= maxBottles(s)) {
      G.emit("toast", { title: "VENDING", text: "Your bottle belt is full." });
      return;
    }
    const cost = s.flags.arc_krezmar_done ? 0 : 15;
    if (s.coins < cost) {
      G.emit("toast", { title: "VENDING", text: "Insufficient Krezzcoin. The machine judges you." });
      return;
    }
    s.coins -= cost;
    s.bottles += 1;
    synth.play("coin");
    G.emit("toast", { title: "VENDING", text: "+1 bottle of pussy juice. Psychedelic dystopian branding." });
  }

  private openTV() {
    G.drongus("tv");
    this.busy = true;
    this.scene.launch("TV", { overlay: true, caller: "Hub" });
    this.scene.pause();
    this.events.once("resume", () => (this.busy = false));
  }

  private openMenu(mode: string) {
    this.scene.launch("Menu", { mode, caller: "Hub" });
    this.scene.pause();
  }

  private go(key: string, data: any) {
    this.busy = true;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, key, data));
  }

  private async talk(lines: Line[]) {
    if (!lines.length) return;
    this.busy = true;
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    await runDialogue(this, lines);
    this.controls.swallow();
    this.busy = false;
  }

  // ------------------------------------------------------------- update

  update(time: number, delta: number) {
    if (!this.av) return;
    const dt = Math.min(delta, 50);
    const s = G.s;
    s.playtimeMs += dt;
    if (this.controls.pause() && !this.busy) {
      this.openMenu("pause");
      return;
    }
    const body = this.av.body as Phaser.Physics.Arcade.Body;
    if (this.busy) {
      body.setVelocity(0, 0);
    } else {
      const mv = this.controls.move();
      const sp = 210;
      const wob = s.intoxication > 40 ? Math.sin(time / 300) * (s.intoxication / 100) * 0.6 : 0;
      const tx = (mv.x + wob * mv.y) * sp;
      const ty = (mv.y - wob * mv.x) * sp;
      if (activeMods(s).slippery) {
        body.velocity.x += (tx - body.velocity.x) * Math.min(1, dt / 260);
        body.velocity.y += (ty - body.velocity.y) * Math.min(1, dt / 260);
      } else body.setVelocity(tx, ty);
      if (Math.hypot(mv.x, mv.y) > 0.1) {
        this.idleMs = 0;
        this.walkT += dt;
        if (this.walkT > 120) {
          this.walkT = 0;
          this.av.setFrame(this.av.frame.name === "1" ? 2 : 1);
        }
        if (Math.abs(mv.x) > 0.1) this.av.setFlipX(mv.x < 0);
      } else {
        this.av.setFrame(0);
        this.idleMs += dt;
        if (this.idleMs > 90000) {
          this.idleMs = 0;
          G.drongus("idle");
        }
      }
    }
    this.av.setDepth(this.av.y + 1);
    this.updateNpcs(time, dt);
    this.tryChatter(time);
    // interact
    let best: HubInteract | null = null;
    let bd = 1e9;
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const d = Phaser.Math.Distance.Between(it.x, it.y, this.av.x, this.av.y);
      if (d < it.r && d < bd) {
        bd = d;
        best = it;
      }
    }
    if (best && !this.busy) {
      this.prompt.setText(`E: ${best.label()}`).setPosition(this.av.x, this.av.y - 50).setVisible(true);
      if (this.controls.interact()) {
        this.prompt.setVisible(false);
        best.use();
      }
    } else {
      this.prompt.setVisible(false);
      this.controls.interact();
    }
    // objective arrow
    const st = currentStep();
    const target = st?.target ? this.targetPos(st.target) : null;
    if (target && !this.busy) {
      const d = Phaser.Math.Distance.Between(this.av.x, this.av.y, target.x, target.y);
      if (d > 120) {
        const a = Math.atan2(target.y - this.av.y, target.x - this.av.x);
        this.arrow.setVisible(true).setPosition(this.av.x + Math.cos(a) * 60, this.av.y + Math.sin(a) * 60).setRotation(a);
      } else this.arrow.setVisible(false);
    } else this.arrow.setVisible(false);
  }

  private targetPos(id: string) {
    const b = BUILDINGS.find((x) => x.id === id);
    if (b?.door) return b.door;
    const g = GATES.find((x) => x.id === id);
    return g ?? null;
  }
}
