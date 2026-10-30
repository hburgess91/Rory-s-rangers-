import Phaser from "phaser";
import { G } from "../G";
import { Controls } from "../combat/Controls";
import { FONT, hexStr, button } from "../ui/theme";
import { CHARACTERS, PLAYABLE_ORDER } from "../../data/characters";
import { BARKS } from "../../content/dialogue/ambient";
import { NPC_TALK, type TalkSet } from "../../content/dialogue/npc";
import { CHATTER } from "../../content/dialogue/chatter";
import { evalCond } from "../systems/conditions";
import { runDialogue } from "./DialogueScene";
import { archiveAction, chapterIntroLines, currentStep, dungeonOpen, endChapter, switchTo, townHallAction } from "../Flow";
import { chapterDef } from "../../content/chapters/chapters";
import type { Line } from "../../data/types";
import { synth } from "../audio/Synth";
import { bump, maxBottles, maxHp } from "../systems/stats";
import { activeMods } from "../../data/historicalRevisions";
import { canTurnIn, completePersonal, pickupsInHub, collectPickup, ministryQuestFor, ministryQuestState, acceptMinistry, completeMinistry, ministryProgress } from "../systems/quests";
import { dir, ping, say } from "../../content/dsl";
import { narrativeActor } from "../systems/narrative";
import { arcStepAt, completeStep, currentArcSteps, maybeFinishArc, spotFlag } from "../systems/arcs";
import { DUNGEONS } from "../../data/dungeons";
import { animateWalker, feetBody, leadCamera, steer } from "../gfx/HD";
import { Beatup } from "./hub/Beatup";

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
  { id: "POLICE", name: "KRELFORD CONSTABULARY", x: 1700, y: 1670, w: 240, h: 130, wall: 0x1e3a8a, roof: 0x111827, door: { x: 1700, y: 1735 } },
  { id: "BOGGOR_HOUSE", name: "BOGGOR CRANSTIL'S HOUSE", x: 300, y: 250, w: 224, h: 176, wall: 0x2a2433, roof: 0x111111, door: { x: 300, y: 338 } },
  { id: "STRIP_CLUB", name: "THE WONKY POLE (Gentlemen's Cabaret)", x: 1660, y: 1290, w: 220, h: 150, wall: 0x2a0f2a, roof: 0x111111, door: { x: 1660, y: 1368 } },
  { id: "OLD_FLAT", name: "YOUR OLD FLAT", x: 700, y: 1650, w: 200, h: 130, wall: 0x9a8a7a, roof: 0x5a3a2a, door: { x: 700, y: 1715 } },
];

const GATES: { id: string; name: string; x: number; y: number }[] = [
  { id: "POLSON_ROAD", name: "→ POLSON TOWERS", x: 2500, y: 1010 },
  { id: "DOCKS", name: "DOCKS → KREZTEUA D'IF", x: 240, y: 1640 },
  { id: "AIRPORT", name: "→ KRELFORD INTERNATIONAL", x: 2500, y: 1650 },
  { id: "PORTAL", name: "??? THE SYMBOL OF WAHOOGAH", x: 90, y: 1250 },
];

/** The playground (Boggor's view). Kids, sweeties, screaming. */
/** How long the register sticks (ms of play). */
const REGISTER_MS = 240000;

const PLAYGROUND = { x: 120, y: 480, w: 360, h: 190, cx: 300, cy: 575 };
const PLAY_EQUIP: [string, number, number][] = [
  ["hd_swings", 190, 560],
  ["hd_slide", 300, 510],
  ["hd_climber", 410, 560],
  ["hd_roundabout", 230, 640],
  ["hd_seesaw", 370, 645],
];
const KID_SHOUTS = ["PEDO! PEDO!", "PEDO!!!", "MUM! PEDO!", "STRANGER DANGER!", "PEDOOOO!", "GET AWAY PEDO!", "I'M TELLING!"];

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

/** Where each character hangs out while doing their side story (when you're not them). */
const ARC_SPOTS: Record<string, { x: number; y: number }> = {
  FLENKY: { x: 900, y: 1420 },
  KREZWONK: { x: 2300, y: 745 },
  KREBLIS: { x: 2420, y: 760 },
  SCROMBUS: { x: 2300, y: 1440 },
  KREZMAR: { x: 640, y: 975 },
  GRONNY: { x: 780, y: 1755 },
  CRONGUS: { x: 1100, y: 1765 },
  KREBON: { x: 500, y: 975 },
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
  /** Mikey: follows you around begging to join the group. */
  follower?: { hits: number; koUntil: number; nextWhine: number; lastHit: number };
}

const MIKEY_WHINES = [
  "Can I join the group?",
  "Lads? Lads. Can I come?",
  "What are we doing? Can I do it too?",
  "I've made a new group chat. It's just me. Join it?",
  "Add me back pls",
  "Mikey here. Still here.",
  "Is this a group thing? I'm in a group. Your group.",
  "I'll be quiet. I won't say anything. Can I come?",
  "Feelin russhen 2day. Feelin lonely 2day.",
  "Why does everyone keep walking faster",
  "I accidentally added you to something. Accept it?",
  "Can someone react to my message pls",
  "I'll pay for the bongos. Next time. Can I come?",
  "Wait for me!!",
  "I've got a mobility scooter now. Can't use it. Can I come?",
];
const MIKEY_HURT = ["OW", "OOF", "That's fair", "Fair play", "I deserved that", "Is that a yes?", "Lads??", "Ow. Can I still come?", "Hahaha. Ow."];

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
  private kids: { spr: Phaser.GameObjects.Sprite; tx: number; ty: number; next: number }[] = [];
  private pg = { distractedUntil: 0, candyAt: { x: 0, y: 0 }, alarmAt: 0, cooldownUntil: 0, chaseUntil: 0 };
  private cops: Phaser.GameObjects.Sprite[] = [];
  private pgSign: Phaser.GameObjects.Text | null = null;
  private spawnedSpots = new Set<string>();
  beatup: Beatup | null = null;
  private photoMarks: { ring: Phaser.GameObjects.Arc; done: () => boolean }[] = [];
  private walkT = 0;
  private nextChatter = 0;
  private idleMs = 0;
  private anchorsSpr: Record<string, Phaser.GameObjects.GameObject[]> = {};
  /** PixelLab art is installed (public/art). */
  private hd = false;

  constructor() {
    super("Hub");
  }

  /** Set when arriving straight from a chapter report: run the next chapter's Town Hall meetings in the same visit. */
  private chainMeetings = false;

  create(data: { at?: string; from?: string; advance?: boolean; chain?: boolean }) {
    const s = G.s;
    if (data?.advance) endChapter();
    if (s.flags.companion_used) {
      const who = CHARACTERS[s.flags.companion as string]?.name ?? "Your lad";
      delete s.flags.companion;
      delete s.flags.companion_used;
      this.time.delayedCall(1500, () => G.emit("toast", { title: "CONTRACT ENDED", text: `${who} has gone home. Hire another at the Central Bank.` }));
    }
    this.chainMeetings = !!(data?.advance || data?.chain);
    s.phase = "hub";
    G.rt.timerEnd = 0;
    G.emit("timer", null);
    this.npcs = [];
    this.interactables = [];
    this.busy = false;
    this.anchorsSpr = {};
    this.kids = [];
    this.photoMarks = [];
    this.pgSign = null;
    this.spawnedSpots = new Set();
    this.cops = [];
    this.pg = { distractedUntil: 0, candyAt: { x: 0, y: 0 }, alarmAt: 0, cooldownUntil: 0, chaseUntil: 0 };
    this.cameras.main.fadeIn(350);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.hd = this.textures.exists("bld_TOWN_HALL");
    if (this.hd) this.fitBuildingsToArt();
    this.drawWorld();
    this.controls = new Controls(this);
    const start = this.spawnPoint(data?.at);
    this.av = this.physics.add.sprite(start.x, start.y, `spr_${s.player}`, 0).setScale(2).setDepth(start.y);
    feetBody(this.av, 20, 16, this.hd ? 26 : 22).setCollideWorldBounds(true);
    this.physics.add.collider(this.av, this.colliders);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.av, true, 0.12, 0.12);
    this.beatup = new Beatup(this, BUILDINGS.filter((b) => b.door).map((b) => ({ x: b.door!.x, y: b.door!.y + 30, name: b.name })));
    this.events.once("shutdown", () => this.beatup?.destroy());
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
    if (from === "swap") {
      G.emit("toast", { title: "CARRYING ON", text: `You are now ${CHARACTERS[s.player].name}. Krebon's ${s.flags.rock_points ?? 0} rockstar points came with you.` });
      await this.talk([dir("You wake up at the edge of town, next to a faded symbol and a pile of underwear. You don't remember how you got here. You feel inexplicably like a rockstar.")]);
    }
    if (from === "arena" || from === "vignette" || from === "minigame" || from === "dungeon") this.arcPayout();
    G.drongus("hub");
    if (from === "dungeon") G.emit("toast", { title: "BACK IN KRELFORD", text: "Report to the Town Hall." });
    // announce side quests that have just opened up
    for (const c of currentArcSteps(s)) {
      const k = `arc_announced_${c.arc.id}`;
      if (s.flags[k] || s.flags[`${c.arc.id}_done`]) continue;
      s.flags[k] = true;
      G.emit("toast", { title: c.arc.player === "ALL" ? `NEW SIDE QUEST: ${c.arc.title}` : `YOUR STORY: ${c.arc.title}`, text: c.step.text });
    }
    // one visit, not three: roll straight on into this chapter's Town Hall meeting(s)
    if (this.chainMeetings) {
      this.chainMeetings = false;
      const a = townHallAction();
      if (a.kind === "meeting") this.go("Meeting", { id: a.id, next: { scene: "Hub", data: { at: "TOWN_HALL", chain: true } } });
    }
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
    if (this.hd && this.textures.exists("tile_sea")) {
      this.add.tileSprite(0, 1700, 560, 92, "tile_sea").setOrigin(0).setDepth(0);
      this.add.tileSprite(200, 1600, 80, 140, "tile_pier").setOrigin(0).setDepth(1);
    } else {
      this.add.rectangle(0, 1700, 560, 92, 0x1e4b7a).setOrigin(0).setDepth(0);
      this.add.rectangle(200, 1600, 80, 140, 0x6b4527).setOrigin(0).setDepth(1);
    }
    this.colliders = this.physics.add.staticGroup();
    for (const b of BUILDINGS) this.drawBuilding(b);
    // The Great Tap
    if (this.hd && this.textures.exists("hd_tap")) {
      this.add.image(1280, 790, "hd_tap").setDepth(850);
      this.neonGlow(1280, 790, 110, 0xff6bb0);
    } else this.add.image(1280, 800, "p_tap").setScale(3).setDepth(800);
    this.add.text(1280, 690, "THE GREAT PUSSY JUICE TAP", { fontFamily: FONT, fontSize: "11px", color: "#ffb6c1", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(801);
    this.colliders.add(this.add.rectangle(1280, 840, 120, 60, 0, 0));
    // The Kreltower
    if (G.s.flags.kreltower_fell) {
      if (this.hd && this.textures.exists("hd_rubble")) this.add.image(1650, 1100, "hd_rubble").setOrigin(0.5, 1).setDepth(1100);
      else this.add.image(1650, 1100, "p_rubble").setOrigin(0.5, 1).setScale(2).setDepth(1100);
      this.add.text(1650, 1110, "WHERE THE KRELTOWER WAS (AGAIN)", { fontFamily: FONT, fontSize: "11px", color: "#ff9a9a", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setDepth(1101);
    } else {
      if (this.hd && this.textures.exists("hd_kreltower")) {
        this.add.image(1650, 1100, "hd_kreltower").setOrigin(0.5, 1).setDepth(1100);
        this.neonGlow(1650, 870, 70, 0x5ad1ff);
      } else this.add.image(1650, 1100, "p_kreltower").setOrigin(0.5, 1).setScale(1.2).setDepth(1100);
      this.add.text(1650, 1110, "THE KRELTOWER (rebuilt)", { fontFamily: FONT, fontSize: "11px", color: "#ffffff", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setDepth(1101);
    }
    this.colliders.add(this.add.rectangle(1650, 1085, 70, 30, 0, 0));
    this.interactables.push({ x: 1650, y: 1135, r: 55, label: () => (G.s.flags.kreltower_fell ? "Look at the rubble" : "Read the Kreltower plaque"), use: () => this.kreltowerPlaque() });
    // public TV
    if (this.hd && this.textures.exists("hd_tv")) this.add.image(1450, 730, "hd_tv").setDepth(770);
    else this.add.image(1450, 740, "p_tv").setScale(3).setDepth(740);
    this.add.text(1450, 700, "KrelTV", { fontFamily: FONT, fontSize: "10px", color: "#88aaff" }).setOrigin(0.5).setDepth(741);
    // vending machines
    for (const [x, y] of [
      [1100, 720],
      [1880, 600],
      [700, 1080],
      [1500, 1450],
    ]) {
      if (this.hd && this.textures.exists("hd_vending")) this.add.image(x, y, "hd_vending").setDepth(y + 20);
      else this.add.image(x, y, "p_vending").setScale(2).setDepth(y);
      this.colliders.add(this.add.rectangle(x, y + 10, 36, 30, 0, 0));
      this.interactables.push({ x, y: y + 44, r: 46, label: () => this.vendingLabel(), use: () => this.vend(x, y) });
    }
    // gates
    for (const gt of GATES) {
      if (gt.id === "PORTAL") {
        this.drawPortal(gt.x, gt.y);
        continue;
      }
      this.add.text(gt.x, gt.y - 40, gt.name, { fontFamily: FONT, fontSize: "12px", color: "#ffd23f", backgroundColor: "#000000aa", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(gt.y);
      if (this.hd && this.textures.exists("hd_gate")) this.add.image(gt.x, gt.y - 20, "hd_gate").setDepth(gt.y + 30);
      else this.add.rectangle(gt.x, gt.y, 60, 60, 0xffd23f, 0.15).setStrokeStyle(2, 0xffd23f).setDepth(1);
    }
    this.drawPlayground();
    // trees
    const rnd = new Phaser.Math.RandomDataGenerator(["krelford"]);
    for (let i = 0; i < 70; i++) {
      const x = rnd.between(40, WORLD_W - 40);
      const y = rnd.between(40, WORLD_H - 120);
      if (this.nearBuilding(x, y, 70) || (Math.abs(x - 1280) < 90) || (y > 760 && y < 900) || (y > 1480 && y < 1590)) continue;
      if (this.hd && this.textures.exists("hd_tree")) {
        this.add.image(x, y - 24, i % 3 === 0 && this.textures.exists("hd_tree2") ? "hd_tree2" : "hd_tree").setDepth(y + 16);
        this.add.ellipse(x, y + 14, 40, 12, 0x1a1033, 0.3).setDepth(1);
      } else {
        this.add.circle(x, y, 18, 0x2f5a22).setDepth(y);
        this.add.circle(x - 5, y - 6, 8, 0x3d7a2c).setDepth(y + 1);
      }
      this.colliders.add(this.add.rectangle(x, y + 8, 16, 12, 0, 0));
    }
    if (this.hd) this.dressStreets();
    // world edge text
    this.add.text(1280, WORLD_H - 30, "KRELFORD · Krelworld · its own fucking universe/dimension", { fontFamily: FONT, fontSize: "12px", color: "#ffffff" }).setOrigin(0.5).setAlpha(0.4);
  }

  /** A soft additive neon halo that breathes. */
  private neonGlow(x: number, y: number, r: number, color = 0xff2e88) {
    const g = this.add.circle(x, y, r, color, 0.1).setBlendMode(Phaser.BlendModes.ADD).setDepth(4100);
    this.tweens.add({ targets: g, alpha: { from: 0.05, to: 0.16 }, scale: { from: 0.92, to: 1.06 }, duration: 1600 + Math.random() * 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    return g;
  }

  /** Street furniture and atmosphere for the PixelLab town. */
  private dressStreets() {
    const lamp = this.textures.exists("hd_lamp");
    const bench = this.textures.exists("hd_bench");
    // lamps along the main roads
    if (lamp)
      for (let x = 160; x < WORLD_W - 100; x += 240) {
        for (const y of [770, 880]) {
          if (Math.abs(x - 1280) < 120) continue;
          this.add.image(x, y - 30, "hd_lamp").setDepth(y + 10);
          const halo = this.add.circle(x, y - 62, 26, 0xffe98a, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(4100);
          this.tweens.add({ targets: halo, alpha: 0.28, duration: 900 + Math.random() * 600, yoyo: true, repeat: -1 });
          this.colliders.add(this.add.rectangle(x, y + 6, 10, 8, 0, 0));
        }
      }
    this.scatterDecor();
    if (bench)
      for (const [x, y] of [
        [1110, 990],
        [1450, 990],
        [1700, 640],
        [880, 1000],
      ])
        this.add.image(x, y, "hd_bench").setDepth(y + 10);
    // drifting sun-motes
    for (let i = 0; i < 70; i++) {
      const m = this.add
        .circle(Math.random() * WORLD_W, Math.random() * WORLD_H, 1.5 + Math.random() * 1.5, [0xffe98a, 0xff6bb0, 0x6fe8d6][i % 3], 0.6)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4200);
      this.tweens.add({ targets: m, x: m.x + 60 + Math.random() * 80, y: m.y - 40 - Math.random() * 60, alpha: 0, duration: 6000 + Math.random() * 6000, repeat: -1, delay: Math.random() * 6000 });
    }
    // screen-space grade: warm sun from the top-left, violet shade bottom-right
    const sun = this.add.graphics().setScrollFactor(0).setDepth(4300).setBlendMode(Phaser.BlendModes.ADD);
    sun.fillGradientStyle(0xffb347, 0x332211, 0x221133, 0x000000, 0.22, 0.06, 0.05, 0);
    sun.fillRect(0, 0, 960, 540);
    const shade = this.add.graphics().setScrollFactor(0).setDepth(4301).setBlendMode(Phaser.BlendModes.MULTIPLY);
    shade.fillGradientStyle(0xffffff, 0xf2e6ff, 0xe6dcff, 0xb8a3e3, 1);
    shade.fillRect(0, 0, 960, 540);
    // light shafts
    for (let i = 0; i < 4; i++) {
      const shaft = this.add.graphics().setScrollFactor(0).setDepth(4302).setBlendMode(Phaser.BlendModes.ADD);
      shaft.fillStyle(0xfff4cc, 0.045);
      const x0 = 80 + i * 170;
      shaft.fillPoints([new Phaser.Math.Vector2(x0, -10), new Phaser.Math.Vector2(x0 + 70, -10), new Phaser.Math.Vector2(x0 + 340, 560), new Phaser.Math.Vector2(x0 + 230, 560)], true);
      this.tweens.add({ targets: shaft, alpha: { from: 0.6, to: 1 }, duration: 3000 + i * 700, yoyo: true, repeat: -1 });
    }
    const cam = this.cameras.main as Phaser.Cameras.Scene2D.Camera & { postFX?: Phaser.GameObjects.Components.FX };
    if (this.game.renderer.type === Phaser.WEBGL && cam.postFX) {
      cam.postFX.addVignette(0.5, 0.5, 0.9, 0.35);
    }
  }

  /** Generated street props: framing building fronts, along the roads, and across the lawns. */
  private scatterDecor() {
    const has = (k: string) => this.textures.exists(k);
    const rnd = new Phaser.Math.RandomDataGenerator(["krel-decor"]);
    const ROADS = [
      [80, 780, WORLD_W, 870],
      [1235, 200, 1325, 1700],
      [300, 1500, 2300, 1570],
      [500, 560, 2200, 620],
      [200, 1000, 270, 1700],
      [2400, 860, 2560, 1150],
      [1060, 650, 1500, 990],
    ];
    const onRoad = (x: number, y: number, m = 20) => ROADS.some(([x0, y0, x1, y1]) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m);
    const nearDoor = (x: number, y: number) => BUILDINGS.some((b) => b.door && Math.abs(x - b.door.x) < 60 && y > b.door.y - 20 && y < b.door.y + 90);
    const nearNpc = (x: number, y: number) => Object.values(NPC_SPOTS).some((p) => Math.hypot(p.x - x, p.y - y) < 50);
    const taken: { x: number; y: number; r: number }[] = [];
    const free = (x: number, y: number, r: number) => !taken.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r);
    const place = (key: string, x: number, y: number, solid = false, r = 30) => {
      if (!has(key)) return false;
      const img = this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y);
      taken.push({ x, y, r });
      if (solid) this.colliders.add(this.add.rectangle(x, y - 8, img.width * 0.8, 14, 0, 0));
      return true;
    };
    // frame each building's front
    const front = ["d_pot", "d_flowerbed", "d_neonsign", "d_crates", "d_pot", "d_fence", "d_vendingbike", "d_hedge"];
    BUILDINGS.forEach((b, i) => {
      if (!b.door) return;
      const yb = b.y + b.h / 2 + 18;
      for (const side of [-1, 1]) {
        const x = b.x + side * (b.w / 2 - 26);
        const k = front[(i * 2 + (side > 0 ? 1 : 0)) % front.length];
        if (Math.abs(x - b.door.x) > 50 && !onRoad(x, yb, 0) && free(x, yb, 24)) place(`hd_${k.slice(2)}`, x, yb, k !== "d_pot" && k !== "d_flowerbed", 24);
      }
    });
    // parked cars and scooters along the main road kerbs
    for (let x = 260; x < WORLD_W - 200; x += 330) {
      const y = rnd.frac() < 0.5 ? 806 : 872;
      if (Math.abs(x - 1280) < 260) continue;
      place(rnd.frac() < 0.6 ? "hd_car" : "hd_scooter", x + rnd.between(-40, 40), y, true, 50);
    }
    for (let i = 0; i < 6; i++) {
      const [x0, y0, x1, y1] = ROADS[i % 3];
      place("hd_puddle", rnd.between(x0 + 40, Math.min(x1, WORLD_W) - 40), rnd.between(y0 + 10, y1 - 10), false, 10);
    }
    // plaza centrepieces
    place("hd_statue", 1130, 760, true, 40);
    place("hd_stall", 1120, 960, true, 50);
    place("hd_stall", 1460, 960, true, 50);
    // lawns
    const lawn: [string, number, boolean][] = [
      ["hd_flowerbed", 12, false],
      ["hd_hedge", 8, true],
      ["hd_billboard", 5, true],
      ["hd_foodtruck", 2, true],
      ["hd_busstop", 3, true],
      ["hd_phonebooth", 3, true],
      ["hd_picnic", 4, true],
      ["hd_fountain", 2, true],
      ["hd_pot", 10, false],
      ["hd_newsstand", 2, true],
      ["hd_bin", 6, false],
      ["hd_pigeon", 8, false],
      ["hd_fence", 6, true],
      ["hd_vendingbike", 4, false],
    ];
    for (const [k, n, solid] of lawn) {
      if (!has(k)) continue;
      let left = n;
      for (let tries = 0; left > 0 && tries < 400; tries++) {
        const x = rnd.between(80, WORLD_W - 80);
        const y = rnd.between(140, WORLD_H - 140);
        if (this.nearBuilding(x, y, 50) || onRoad(x, y) || nearDoor(x, y) || nearNpc(x, y) || !free(x, y, 46)) continue;
        if (GATES.some((g) => Math.hypot(g.x - x, g.y - y) < 90)) continue;
        place(k, x, y, solid, 40);
        left--;
      }
    }
  }

  private nearBuilding(x: number, y: number, pad: number) {
    if (x > PLAYGROUND.x - pad && x < PLAYGROUND.x + PLAYGROUND.w + pad && y > PLAYGROUND.y - pad && y < PLAYGROUND.y + PLAYGROUND.h + pad) return true;
    return BUILDINGS.some((b) => x > b.x - b.w / 2 - pad && x < b.x + b.w / 2 + pad && y > b.y - b.h / 2 - pad && y < b.y + b.h / 2 + pad);
  }

  /** Building footprints follow the generated art; doors sit at the bottom centre. */
  private fitBuildingsToArt() {
    for (const b of BUILDINGS) {
      const key = `bld_${b.id}`;
      if (!this.textures.exists(key)) continue;
      const src = this.textures.get(key).getSourceImage();
      const bottom = b.y + b.h / 2;
      b.w = src.width;
      b.h = src.height;
      b.y = bottom - b.h / 2;
      if (b.door) b.door = { x: b.x, y: bottom };
    }
  }

  private drawBuilding(b: Building) {
    const key = `bld_${b.id}`;
    if (this.hd && this.textures.exists(key)) {
      const img = this.add.image(b.x, b.y, key).setDepth(b.y + b.h / 2 - 1);
      // soft drop shadow on the ground
      this.add.ellipse(b.x + 10, b.y + b.h / 2 - 4, b.w * 0.95, 26, 0x1a1033, 0.35).setDepth(1);
      let name = b.name;
      if (b.id === "TOWN_HALL" && G.s.chapter === 1 && !G.s.flags.ch1_clear) name = "KRELFORD ____ HALL";
      if (b.id === "HOME") name = `${CHARACTERS[G.s.player].name}'S HOUSE`;
      this.add
        .text(b.x, b.y + b.h / 2 + 6, name, { fontFamily: FONT, fontSize: "11px", color: "#fff4cc", backgroundColor: "#1a1033cc", padding: { x: 5, y: 2 }, align: "center", wordWrap: { width: Math.max(160, b.w) } })
        .setOrigin(0.5, 0)
        .setDepth(b.y + b.h / 2 + 1);
      // the walkable line is the front wall: everything above it is roof and facade
      this.colliders.add(this.add.rectangle(b.x, b.y + b.h * 0.12, b.w * 0.86, b.h * 0.7, 0, 0));
      this.neonGlow(b.x, b.y - b.h * 0.25, Math.max(60, b.w * 0.45));
      void img;
      return;
    }
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
    // Eden moved out of Polson Towers in chapter 2
    for (const id of [...PLAYABLE_ORDER, "POLSON"]) {
      if (id === s.player) continue;
      if ((id === "POLSON" || id === "EDEN") && s.chapter < 3) continue;
      if (id === "KREBON" && s.flags.krebon_gone) continue;
      // from chapter 2 the others are out doing their own side stories
      this.addNpc(id, (s.chapter >= 2 && ARC_SPOTS[id]) || NPC_SPOTS[id]);
    }
    // Mikey: not playable. Follows you everywhere asking to join the group.
    if (s.player !== "MIKEY") {
      this.addNpc("MIKEY", { x: (NPC_SPOTS.MIKEY?.x ?? 430), y: (NPC_SPOTS.MIKEY?.y ?? 980) });
      const m = this.npcs[this.npcs.length - 1];
      m.follower = { hits: 0, koUntil: 0, nextWhine: this.time.now + 4000, lastHit: 0 };
      const it = this.interactables.find((i) => (i as any).__npc === m);
      if (it) {
        it.label = () => (m.follower!.koUntil > this.time.now ? "Mikey is unconscious (talk to him anyway)" : "Shove Mikey");
        it.use = () => (m.follower!.koUntil > this.time.now ? this.talkTo(m) : this.hitMikey(m, false));
      }
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

  private updateMikey(n: Npc, now: number, dt: number) {
    const f = n.follower!;
    const spr = n.spr;
    const ko = now < f.koUntil;
    if (ko) {
      spr.setAngle(90);
      if (Math.floor(now / 900) % 3 === 0 && !n.bubble?.active) this.bubble(n, "💤", 800);
    } else {
      if (spr.angle !== 0) {
        spr.setAngle(0);
        this.bubble(n, "I forgive you. Can I join now?", 2600);
      }
      const dx = this.av.x - spr.x;
      const dy = this.av.y - spr.y;
      const d = Math.hypot(dx, dy);
      const moving = d > 64 && !this.busy;
      if (moving) {
        const sp = (d > 400 ? 230 : 150) * (dt / 1000);
        spr.x += (dx / d) * sp;
        spr.y += (dy / d) * sp;
      }
      animateWalker(spr, dx, dy, moving, now);
      if (now > f.nextWhine && d < 360 && !this.busy) {
        f.nextWhine = now + 5500 + Math.random() * 4000;
        this.bubble(n, MIKEY_WHINES[Math.floor(Math.random() * MIKEY_WHINES.length)]);
      }
    }
    spr.setDepth(spr.y);
    n.plate.setPosition(spr.x, spr.y - 36);
    if (n.bubble?.active) n.bubble.setPosition(spr.x, spr.y - 52);
  }

  /** Shove (E) or punch (attack). Four hits and he's out cold for a bit. */
  private hitMikey(n: Npc, punch: boolean) {
    const f = n.follower!;
    const now = this.time.now;
    if (now < f.koUntil || now - f.lastHit < 300) return;
    f.lastHit = now;
    f.hits += punch ? 2 : 1;
    const a = Math.atan2(n.spr.y - this.av.y, n.spr.x - this.av.x);
    const dist = punch ? 90 : 150;
    this.tweens.add({ targets: n.spr, x: n.spr.x + Math.cos(a) * dist, y: n.spr.y + Math.sin(a) * dist, duration: 260, ease: "Quad.out" });
    n.spr.setTintFill(0xffffff);
    this.time.delayedCall(90, () => n.spr.clearTint());
    synth.play(punch ? "crit" : "hit");
    this.cameras.main.shake(120, 0.006);
    const t = this.add.text(n.spr.x, n.spr.y - 40, punch ? "POW!" : "SHOVE!", { fontFamily: FONT, fontSize: "16px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(5000);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    if (f.hits >= 4) {
      f.hits = 0;
      f.koUntil = now + 40000;
      bump(G.s, "mikey_kos");
      this.bubble(n, "…(knocked out)…", 2200);
      G.emit("toast", { title: "MIKEY: KNOCKED OUT", text: "Peace and quiet. For about 40 seconds." });
    } else {
      f.nextWhine = now + 1500;
      this.bubble(n, MIKEY_HURT[Math.floor(Math.random() * MIKEY_HURT.length)], 1600);
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
      if (n.follower) {
        this.updateMikey(n, now, dt);
        continue;
      }
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
        animateWalker(n.spr, dx, dy, true, now);
      } else animateWalker(n.spr, 0, 0, false, now);
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
      if ((it as any).__throw) {
        const near = this.nearPlayground(this.av.x, this.av.y, 150);
        it.x = near ? this.av.x : -9999;
        it.y = near ? this.av.y : -9999;
        continue;
      }
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
    this.spawnCollectibles();
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

  // ------------------------------------------------------------- the playground

  private drawPortal(x: number, y: number) {
    const gone = !!G.s.flags.krebon_gone;
    if (this.textures.exists("hd_portal")) {
      const p = this.add.image(x, y + 30, "hd_portal").setOrigin(0.5, 1).setDepth(y + 30).setAlpha(gone ? 0.25 : 1);
      if (!gone) this.tweens.add({ targets: p, scaleX: { from: 0.96, to: 1.04 }, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    } else {
      const c = this.add.ellipse(x, y - 20, 70, 100, 0x9b59ff, gone ? 0.1 : 0.5).setStrokeStyle(3, 0xffd23f).setDepth(y);
      if (!gone) this.tweens.add({ targets: c, angle: 360, duration: 6000, repeat: -1 });
    }
    if (!gone) this.neonGlow(x, y - 30, 70, 0x9b59ff);
    this.add.text(x, y + 40, gone ? "(the symbol has faded)" : "??? THE SYMBOL OF WAHOOGAH", { fontFamily: FONT, fontSize: "11px", color: "#e9d5ff", backgroundColor: "#1a1033cc", padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setDepth(y + 41);
  }

  private drawPlayground() {
    const P = PLAYGROUND;
    if (this.textures.exists("tile_rubber")) {
      this.add.tileSprite(P.x, P.y, P.w, P.h, "tile_rubber").setOrigin(0).setDepth(1);
      // a picket fence around it, with a gap at the front
      if (this.textures.exists("hd_fence"))
        for (let x = P.x + 40; x < P.x + P.w; x += 92) {
          if (Math.abs(x - P.cx) < 60) continue;
          this.add.image(x, P.y + P.h + 10, "hd_fence").setOrigin(0.5, 1).setDepth(P.y + P.h + 10);
          this.add.image(x, P.y + 6, "hd_fence").setOrigin(0.5, 1).setDepth(P.y + 6);
        }
    } else {
      const g = this.add.graphics().setDepth(1);
      g.fillStyle(0x7a3b5a, 1).fillRoundedRect(P.x, P.y, P.w, P.h, 18);
      g.fillStyle(0x8f4a6b, 1);
      for (let i = 0; i < 40; i++) g.fillCircle(P.x + 14 + ((i * 53) % (P.w - 28)), P.y + 14 + ((i * 37) % (P.h - 28)), 3);
      g.lineStyle(4, 0xffd23f, 1).strokeRoundedRect(P.x, P.y, P.w, P.h, 18);
    }
    this.add.text(P.cx, P.y + P.h + 8, "KRELFORD PLAYGROUND · NO ADULTS UNLESS ACCOMPANYING A CHILD", { fontFamily: FONT, fontSize: "10px", color: "#fff4cc", backgroundColor: "#1a1033cc", padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setDepth(P.y + P.h + 2);
    for (const [k, x, y] of PLAY_EQUIP) {
      if (this.textures.exists(k)) this.add.image(x, y + 10, k).setOrigin(0.5, 1).setDepth(y + 10);
      else this.add.rectangle(x, y - 10, 60, 40, 0xff6bb0).setStrokeStyle(3, 0x5ad1ff).setDepth(y);
    }
    for (let i = 0; i < 3; i++) {
      const key = this.textures.exists(`spr_KID${i}`) ? `spr_KID${i}` : `spr_FOLK${i}`;
      const x = P.x + 60 + i * 110;
      const spr = this.add.sprite(x, P.cy, key, 0).setScale(key.startsWith("spr_KID") ? 2 : 1.4).setDepth(P.cy);
      this.kids.push({ spr, tx: x, ty: P.cy, next: 0 });
    }
    // after Do The Crocodile, the crocodiles live here now
    if (G.s.flags.crocs_loose) {
      for (let i = 0; i < 2; i++) {
        const cx = P.x + 80 + i * 180;
        const cy = P.y + 60 + i * 70;
        const croc = this.textures.exists("p_croc") ? this.add.image(cx, cy, "p_croc").setScale(0.55) : this.add.text(cx, cy, "🐊", { fontSize: "34px" }).setOrigin(0.5);
        croc.setDepth(cy + 5);
        (croc as any).setFlipX?.(true);
        this.tweens.add({ targets: croc, x: cx + 120, duration: 4200 + i * 900, yoyo: true, repeat: -1, ease: "Sine.inOut", onYoyo: () => (croc as any).setFlipX?.(false), onRepeat: () => (croc as any).setFlipX?.(true) });
      }
      this.add.text(P.cx, P.y - 18, "🐊 CROCODILES (REGISTERED)", { fontFamily: FONT, fontSize: "10px", color: "#86efac", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(P.y + 2);
    }
    // throwing a sweetie: press E anywhere near the playground (the prompt follows you)
    const throwIt: HubInteract = {
      x: -9999,
      y: -9999,
      r: 80,
      enabled: () => ((G.s.flags.boggor_candy as number) ?? 0) > 0 && !this.kidsDistracted(),
      label: () => `🍬 Throw a sweetie over the fence (${G.s.flags.boggor_candy} left)`,
      use: () => this.throwCandy(),
    };
    (throwIt as any).__throw = true;
    this.interactables.push(throwIt);
    // big sign over the playground saying what to do
    this.pgSign = this.add.text(P.cx, P.y - 34, "", { fontFamily: FONT, fontSize: "15px", color: "#ffffff", fontStyle: "bold", align: "center", stroke: "#000", strokeThickness: 4, backgroundColor: "#00000088", padding: { x: 8, y: 4 } }).setOrigin(0.5, 1).setDepth(6000).setVisible(false);
  }

  private kidsDistracted() {
    return this.time.now < this.pg.distractedUntil;
  }

  private throwCandy() {
    const n = ((G.s.flags.boggor_candy as number) ?? 0) - 1;
    G.s.flags.boggor_candy = Math.max(0, n);
    const P = PLAYGROUND;
    const tx = P.x + 40 + Math.random() * (P.w - 80);
    const ty = P.y + 30 + Math.random() * (P.h - 60);
    const c = this.add.image(this.av.x, this.av.y - 20, this.textures.exists("hd_candy") ? "hd_candy" : "p_coin").setDepth(5000);
    this.tweens.add({ targets: c, x: tx, y: ty, duration: 600, ease: "Quad.out", onComplete: () => this.tweens.add({ targets: c, alpha: 0, delay: 12000, duration: 400, onComplete: () => c.destroy() }) });
    this.tweens.add({ targets: c, angle: 720, duration: 600 });
    synth.play("lob");
    this.pg.distractedUntil = this.time.now + 25000;
    this.pg.candyAt = { x: tx, y: ty };
    this.pg.alarmAt = 0;
    for (const k of this.kids) this.kidBubble(k.spr, ["SWEETIES!", "MINE!", "CANDY!!", "NO MINE!"][Math.floor(Math.random() * 4)], "#ffd23f");
    G.emit("toast", { title: "KIDS DISTRACTED", text: "25 seconds. Walk to each 📸 camera in the playground and press E to snap it." });
  }

  private kidBubble(spr: Phaser.GameObjects.Sprite, text: string, color = "#ff3b3b") {
    const t = this.add.text(spr.x, spr.y - 44, text, { fontFamily: FONT, fontSize: "12px", color, fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(5000);
    this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, delay: 600, duration: 1200, onComplete: () => t.destroy() });
  }

  private nearPlayground(x: number, y: number, m = 40) {
    const P = PLAYGROUND;
    return x > P.x - m && x < P.x + P.w + m && y > P.y - m && y < P.y + P.h + m;
  }

  /** Kids scream, police come. Called when the kids spot an adult. */
  private raiseAlarm() {
    const now = this.time.now;
    if (this.pg.alarmAt || now < this.pg.chaseUntil || now < this.pg.cooldownUntil) return;
    // you've already been through the system once: now they just shout
    if (((G.s.flags.register_count as number) ?? 0) >= 1) {
      this.pg.cooldownUntil = now + 4500;
      synth.play("alarm");
      const lines = ["PEDO! PEDO!", "IT'S HIM AGAIN!", "PEDO!!!", "HE'S ON THE LIST!", "MUUUM, THE PEDO'S BACK"];
      this.kids.forEach((k, i) => this.time.delayedCall(i * 220, () => this.kidBubble(k.spr, lines[(i + Math.floor(now / 1000)) % lines.length])));
      this.time.delayedCall(900, () => this.kids.forEach((k) => this.kidBubble(k.spr, "PEDO! PEDO!")));
      return;
    }
    this.pg.alarmAt = now + 2200;
    synth.play("alarm");
    this.kids.forEach((k, i) => this.time.delayedCall(i * 250, () => this.kidBubble(k.spr, KID_SHOUTS[(i + Math.floor(now / 1000)) % KID_SHOUTS.length])));
    this.time.delayedCall(900, () => this.kids.forEach((k) => this.kidBubble(k.spr, "PEDO! PEDO!")));
  }

  private startChase() {
    const now = this.time.now;
    this.pg.alarmAt = 0;
    this.pg.chaseUntil = now + 22000;
    G.emit("toast", { title: "999", text: "Someone has called the police. RUN. Lose them for 22 seconds." });
    synth.play("whistle");
    const key = this.textures.exists("spr_COP") ? "spr_COP" : "spr_FOLK1";
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.random();
      const cop = this.add.sprite(this.av.x + Math.cos(a) * 620, this.av.y + Math.sin(a) * 420, key, 0).setScale(2).setDepth(this.av.y);
      if (key === "spr_FOLK1") cop.setTint(0x6699ff);
      cop.setData("speed", 150 + i * 18);
      this.cops.push(cop);
    }
  }

  private endChase(caught: boolean) {
    for (const c of this.cops) c.destroy();
    this.cops = [];
    this.pg.chaseUntil = 0;
    this.pg.cooldownUntil = this.time.now + 20000;
    if (caught) this.registerScene();
    else G.emit("toast", { title: "ESCAPED", text: "You lost them. Somewhere, a child is still shouting 'PEDO'." });
  }

  private updatePlayground(now: number, dt: number) {
    const P = PLAYGROUND;
    const distracted = this.kidsDistracted();
    for (const k of this.kids) {
      if (distracted) {
        k.tx = this.pg.candyAt.x + (Math.random() - 0.5) * 30;
        k.ty = this.pg.candyAt.y + (Math.random() - 0.5) * 20;
      } else if (now > k.next) {
        k.next = now + 1500 + Math.random() * 2500;
        k.tx = P.x + 30 + Math.random() * (P.w - 60);
        k.ty = P.y + 30 + Math.random() * (P.h - 60);
      }
      const dx = k.tx - k.spr.x;
      const dy = k.ty - k.spr.y;
      const d = Math.hypot(dx, dy);
      const moving = d > 4;
      if (moving) {
        const sp = (distracted ? 120 : 60) * (dt / 1000);
        k.spr.x += (dx / d) * Math.min(sp, d);
        k.spr.y += (dy / d) * Math.min(sp, d);
      }
      animateWalker(k.spr, dx, dy, moving, now);
      k.spr.setDepth(k.spr.y);
    }
    this.updatePlaygroundSign(now);
    if (this.busy) return;
    // the kids notice any adult who gets close while they're not busy with sweeties
    if (!distracted && this.nearPlayground(this.av.x, this.av.y)) this.raiseAlarm();
    if (this.pg.alarmAt && now > this.pg.alarmAt) this.startChase();
    if (this.cops.length) {
      for (const c of this.cops) {
        const dx = this.av.x - c.x;
        const dy = this.av.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = (c.getData("speed") as number) * (dt / 1000);
        c.x += (dx / d) * sp;
        c.y += (dy / d) * sp;
        animateWalker(c, dx, dy, true, now);
        c.setDepth(c.y);
        if (d < 26) return this.endChase(true);
      }
      if (now > this.pg.chaseUntil) this.endChase(false);
    }
  }

  private updatePlaygroundSign(now: number) {
    if (!this.pgSign) return;
    const photosOpen = this.photoMarks.some((m) => !m.done());
    if (!photosOpen) {
      this.pgSign.setVisible(false);
      return;
    }
    const left = Math.ceil((this.pg.distractedUntil - now) / 1000);
    const candy = (G.s.flags.boggor_candy as number) ?? 0;
    const done = this.photoMarks.filter((m) => m.done()).length;
    if (left > 0) this.pgSign.setText(`KIDS DISTRACTED: ${left}s\n📸 Snap the cameras (E)  ${done}/${this.photoMarks.length}`).setColor(left <= 5 ? "#ff6b6b" : "#86efac");
    else if (candy > 0) this.pgSign.setText(`🍬 Stand by the fence and press E to throw a sweetie\nThen snap the 📸 cameras while the kids are busy  ${done}/${this.photoMarks.length}`).setColor("#ffd23f");
    else this.pgSign.setText("Out of sweeties. Boggor has more (his dark house, just above the playground).").setColor("#ffffff");
    this.pgSign.setVisible(true);
    const on = left > 0;
    for (const m of this.photoMarks) {
      if (m.done()) {
        m.ring.setVisible(false);
        continue;
      }
      m.ring.setStrokeStyle(3, on ? 0x22c55e : 0xef4444, 0.9).setFillStyle(on ? 0x22c55e : 0xef4444, on ? 0.18 + 0.12 * Math.sin(now / 150) : 0.08);
    }
  }

  /** The register wears off after a few minutes. */
  private updateRegister() {
    const s = G.s;
    if (!s.flags.on_register) return;
    if (s.flags.on_register_until === undefined) s.flags.on_register_until = s.playtimeMs + REGISTER_MS;
    if (s.playtimeMs > (s.flags.on_register_until as number) && !this.busy) {
      delete s.flags.on_register;
      delete s.flags.on_register_until;
      G.emit("toast", { title: "OFF THE REGISTER", text: "Your name has quietly dropped off the list. Everyone still remembers." });
      G.save();
    }
  }

  /** Caught. Charged. Must click the button. */
  private registerScene() {
    this.busy = true;
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    synth.play("banhammer");
    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(9000);
    root.add(this.add.rectangle(480, 270, 960, 540, 0x0a0a12, 0.85));
    root.add(this.add.rectangle(480, 260, 620, 330, 0x1e3a8a, 1).setStrokeStyle(4, 0xffd23f));
    root.add(this.add.text(480, 130, "KRELFORD CONSTABULARY", { fontFamily: FONT, fontSize: "22px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5));
    root.add(
      this.add
        .text(480, 225, `SUSPECT: ${CHARACTERS[G.s.player].name}
CHARGE: Being a pedo
EVIDENCE: "the kids said so"
ARRESTING OFFICER: Sgt. Grimbolus Swig (mouth full of chocolate)

You are required by law to sign the Sex Offenders Register.`, {
          fontFamily: FONT,
          fontSize: "15px",
          color: "#ffffff",
          align: "center",
          lineSpacing: 5,
        })
        .setOrigin(0.5),
    );
    const sign = () => {
      G.s.flags.on_register = true;
      G.s.flags.on_register_until = G.s.playtimeMs + REGISTER_MS;
      G.s.flags.register_count = ((G.s.flags.register_count as number) ?? 0) + 1;
      G.save();
      synth.play("archive");
      root.destroy();
      const police = BUILDINGS.find((b) => b.id === "POLICE");
      if (police?.door) this.av.setPosition(police.door.x, police.door.y + 40);
      this.busy = false;
      this.talk([
        say("SERGEANT SWIG", "Signed, sealed, registered. Welcome to the list, sicko."),
        dir("You are now on the Sex Offenders Register. Everyone in Krelford has read it. For the next few minutes, everyone in Krelford will mention it."),
        dir("Word is the Supreme Leader can make paperwork disappear. For a price. Try the Town Hall."),
      ]);
    };
    // drawn in screen space; the click is checked against the button's screen rectangle
    const btn = button(this, 480, 360, "✍ SIGN THE REGISTER", () => undefined, { w: 300, h: 46, color: 0x7c2d12 });
    root.add(btn);
    root.setScrollFactor(0, 0, true);
    btn.setScrollFactor(0, 0, true);
    const onUp = (pt: Phaser.Input.Pointer) => {
      if (Math.abs(pt.x - 480) < 150 && Math.abs(pt.y - 360) < 23) {
        this.input.off("pointerup", onUp);
        sign();
      }
    };
    this.input.on("pointerup", onUp);
  }

  /** Drongus will take you off the register. For a fee. */
  private async registerBribe() {
    const s = G.s;
    const cost = 250;
    delete s.flags.bribe_pick;
    await this.talk([
      ping("DRONGUS", "I hear you're on the register"),
      ping("DRONGUS", "Terrible business. Terrible"),
      ping("DRONGUS", `I could make it go away. ${cost} Krezzcoin. Cash. Don't tell Kreblis`),
      { s: "NARRATOR", t: `Bribe the Supreme Leader ${cost} Krezzcoin? (you have ${s.coins})`, dir: true, choice: [{ label: `Pay ${cost}`, set: { bribe_pick: 1 } }, { label: "Stay on the register", set: { bribe_pick: 0 } }] },
    ]);
    if (s.flags.bribe_pick !== 1) return;
    if (s.coins < cost) {
      await this.talk([ping("DRONGUS", "That's not 250. That's not even close. Pedo")]);
      return;
    }
    s.coins -= cost;
    delete s.flags.on_register;
    synth.play("coin");
    await this.talk([ping("DRONGUS", "Done. Register's been 'updated'. You were never on it. Nobody was ever on it"), ping("DRONGUS", "Also please react to my song"), dir("You are no longer on the register. People will still look at you funny. They always did.")]);
    G.save();
  }

  /** Glowing pickups for any open "collect" side-quest step. */
  private spawnCollectibles() {
    for (const c of currentArcSteps(G.s)) {
      const k = c.step.step;
      if (k.kind !== "collect") continue;
      k.spots.forEach((sp, i) => {
        const f = spotFlag(c.arc, c.step, i);
        if (G.s.flags[f] || this.spawnedSpots.has(f)) return;
        this.spawnedSpots.add(f);
        const glow = this.add.circle(sp.x, sp.y, 20, 0xf9a8d4, 0.25).setDepth(sp.y - 1);
        const img = k.guard ? this.add.image(sp.x, sp.y - 30, this.textures.exists("hd_camera") ? "hd_camera" : "p_tv").setScale(this.textures.exists("hd_camera") ? 1 : 1.2).setDepth(5000) : this.add.image(sp.x, sp.y, "p_token").setScale(2).setDepth(sp.y);
        let label: Phaser.GameObjects.Text | null = null;
        if (k.guard) {
          const ring = this.add.circle(sp.x, sp.y, 34, 0xef4444, 0.08).setStrokeStyle(3, 0xef4444, 0.9).setDepth(sp.y - 2);
          label = this.add.text(sp.x, sp.y + 22, `📸 ${sp.name.replace(/^the /, "").toUpperCase()}`, { fontFamily: FONT, fontSize: "12px", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(5000);
          this.photoMarks.push({ ring, done: () => !!G.s.flags[f] });
        }
        this.tweens.add({ targets: img, y: sp.y - 6, yoyo: true, repeat: -1, duration: 600 });
        this.interactables.push({
          x: sp.x,
          y: sp.y,
          r: k.guard ? 60 : 46,
          label: () => (k.guard ? `📸 Photograph ${sp.name}` : `Pick up: ${k.label} (${sp.name})`),
          enabled: () => !G.s.flags[f],
          use: async () => {
            if (k.guard === "playground" && !this.kidsDistracted()) {
              // you have sweeties: throw one now instead of getting caught
              if (((G.s.flags.boggor_candy as number) ?? 0) > 0) return this.throwCandy();
              this.raiseAlarm();
              G.emit("toast", { title: "SPOTTED", text: "Distract the kids with a sweetie first." });
              return;
            }
            G.s.flags[f] = true;
            synth.play(k.guard ? "select" : "pickup");
            if (k.guard) this.cameras.main.flash(120, 255, 255, 255);
            img.destroy();
            glow.destroy();
            label?.destroy();
            const got = k.spots.filter((_, j) => G.s.flags[spotFlag(c.arc, c.step, j)]).length;
            await this.talk(k.pickup);
            G.emit("toast", { title: c.arc.title.toUpperCase(), text: `${k.label}: ${sp.name} (${got}/${k.spots.length})` });
            G.save();
          },
        });
      });
    }
  }

  private doorLabel(b: Building): string {
    const s = G.s;
    const ch = chapterDef(s.chapter);
    const arc = arcStepAt(s, b.id);
    if (arc && !this.buildingBusy(b.id)) return `${b.name}: ★ ${arc.step.text}`;
    if (b.id === ch.dungeonDoor) {
      const o = dungeonOpen();
      return o.open ? `Enter: ${b.name}` : `${b.name} (locked: ${o.why})`;
    }
    switch (b.id) {
      case "TOWN_HALL": {
        const a = townHallAction();
        return a.kind === "meeting" ? "Enter Town Hall (MEETING IN PROGRESS)" : a.kind === "outro" ? "Enter Town Hall (report back)" : a.kind === "fact" ? "Enter Town Hall (report back)" : "Enter Town Hall";
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
      case "STRIP_CLUB":
        return (s.flags.club_banned_until as number) > s.playtimeMs ? "The Wonky Pole (you're barred, for now)" : "Enter The Wonky Pole";
      case "UNIVERSITY":
        return "Enter Krelford University";
      case "GYM":
        return "Enter Krunch Gym";
      case "FIXER_UPPER":
        return "Look at the fixer-upper";
      case "ABANDONED":
        return s.flags.pudding_house_destroyed ? "The smouldering remains of the pudding house" : s.flags.arc_crongus_done ? "The Abandoned Building (you think about it every day)" : "The Abandoned Building";
      case "OLD_FLAT":
        return "Your old flat";
      case "POLICE":
        return "Enter Krelford Constabulary";
      case "BOGGOR_HOUSE":
        return "Knock on the dark house";
      case "PORTAL":
        return G.s.flags.krebon_gone ? "The faded symbol of Wahoogah" : "The symbol of Wahoogah";
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
    if (!this.buildingBusy(b.id) && (await this.runArcStep(b.id))) return;
    switch (b.id) {
      case "STRIP_CLUB": {
        const left = ((s.flags.club_banned_until as number) ?? 0) - s.playtimeMs;
        if (left > 0) {
          await this.talk([say("BIG DEREK", `You lot are barred. ${Math.ceil(left / 60000)} more minute${left > 60000 ? "s" : ""}. And wash your hands.`)]);
          return;
        }
        this.go("Club", {});
        return;
      }
      case "BOOTH":
        await this.talk(
          s.player === "MIKEY"
            ? [dir("The Booth. There's a heavy bag in here shaped like you. Mikey can't bully Mikey, so Proctus Krelmor has been volunteered as Acting Mikey."), say("PROCTUS", "I've been told this is ministerial.")]
            : [dir("The Booth. Mikey is hanging from the ceiling in a punching-bag harness. He has brought his own harness."), say("MIKEY", "Mikey here. Go on then. Get it out of your system.")],
        );
        this.go("Minigame", { mode: "bully", returnAt: "BOOTH" });
        return;
      case "UNIVERSITY":
        if (s.player !== "FLENKY" && s.chapter >= 4) {
          await this.talk([dir("Krelford University. A poster: 'BJJ OPEN — RESULT: J. JENKINS def. R. BRAND (rear naked choke, R. Brand still talking)'. Someone has drawn a heart on it. Probably Mollor.")]);
          return;
        }
        await this.talk([dir("Krelford University. A student is protesting outside the philosophy department with a sign that reads 'IS THE LORE REAL?'. Inside, a lecture on 'Seen By 9: Phenomenology of Being Ignored' is oversubscribed.")]);
        return;
      case "GYM":
        if (s.player !== "KREZWONK" && s.chapter >= 4) {
          await this.talk([dir("Krunch Gym. There's a Chad Deltoid-shaped dent in the floor by the squat rack. Krezwonk has put a small plaque next to it: 'FORESEEN'."), dir("Kreblis is in the corner doing burpees. He says he's immortal now. He looks terrible.")]);
          return;
        }
        await this.talk([dir("Krunch Gym. Smells of pre-workout and regret. Somebody has written 'RE-RACK YOUR WEIGHTS' on the wall, and somebody else has written 'NO' underneath."), say("FOLK1", "Do you even wonk, bro?")]);
        return;
      case "FIXER_UPPER":
        if (s.player !== "SCROMBUS" && s.chapter >= 4) {
          await this.talk([dir("The fixer-upper has been fully renovated. A sign: 'SOLD — 4.8M — Scrombus Property Holdings (soon: Scrombus Holdings) (soon: Supreme Leader Scrombus)'.")]);
          return;
        }
        await this.talk(s.flags.arc_scrombus_done ? [dir("SOLD. A blue plaque reads: 'Ben Scrombus flipped this. Krelworld was next.'")] : [dir("A crumbling terrace. 'FOR SALE (AS SEEN)'. There is a hole where the bathroom should be, and a bathroom where the hole should be.")]);
        return;
      case "ABANDONED":
        await this.talk(
          s.flags.arc_crongus_done
            ? [dir("The door is boarded up again. From inside, faintly: 'mmmm'."), say(s.player, "…no. No. Keep walking.")]
            : [dir("Boarded windows. A faint smell of custard. Something inside is breathing slowly and contentedly. You decide you're not ready.")],
        );
        return;
      case "PORTAL":
        await this.talk(
          s.flags.krebon_gone
            ? [dir("The symbol has faded. A postcard is stuck to the grass, addressed to 'Krelworld (the Waluigi version)'. It just says: 'Reprieve'.")]
            : s.player === "KREBON"
              ? [dir("The symbol hums at you. Not yet. There's a gig to play first."), say("KREBON", "I know. I know. One more gig.")]
              : [dir("A shimmering symbol hangs in the air at the edge of town. It hums. It is clearly not for you."), dir("Somewhere in the hum, very faintly, someone is tuning an acoustic guitar.")],
        );
        return;
      case "BOGGOR_HOUSE":
        if (s.flags.arcstep_arc_boggor_meet && !s.flags.arc_boggor_done && !((s.flags.boggor_candy as number) > 0)) {
          await this.talk([say("BOGGOR CRANSTIL", "Out of sweeties already? Greedy little things, aren't they. Here. Five more. Heh heh heh.", { set: { boggor_candy: 5 } })]);
          return;
        }
        await this.talk(
          s.flags.arc_boggor_done
            ? [dir("The curtains twitch. From inside: 'lovely jubbly…'. The door stays shut.")]
            : [dir("The curtains twitch. Nobody answers. A garden gnome stares at you. You don't remember it facing this way.")],
        );
        return;
      case "POLICE":
        await this.talk(
          s.flags.cronster_caught
            ? [dir("Krelford Constabulary. Sergeant Swig is asleep at his desk, surrounded by wrappers. A sign reads 'CRONSTER: CAUGHT (by us, basically)'.")]
            : [dir("Krelford Constabulary. Sergeant Swig is at the front desk eating a chocolate coin he insists is evidence."), say("SERGEANT SWIG", "Move along. Unless you've got choccy.")],
        );
        return;
      case "OLD_FLAT":
        if (s.player !== "GRONNY" && s.chapter >= 4) {
          await this.talk([dir("Your old flat has a brand new carpet. A note pinned to the door: 'Carpet avenged. — G'. There is a leaf blower on the step.")]);
          return;
        }
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
          const next = a.id === "krazy_fact_emergency" ? { scene: "Hub", data: { at: "TOWN_HALL", advance: true } } : { scene: "Hub", data: { at: "TOWN_HALL", chain: true } };
          this.go("Meeting", { id: a.id, next });
        } else if (a.kind === "outro") {
          s.flags[`ch${s.chapter}_outro`] = true;
          this.go("Cutscene", { script: `ch${s.chapter}_outro`, bg: "townhall", music: "meeting", next: { scene: "Hub", data: { at: "TOWN_HALL", advance: true } } });
        } else if (a.kind === "fact") this.go("Hub", { at: "TOWN_HALL", advance: true });
        else {
          const q = canTurnIn(s, "TOWN_HALL");
          if (s.flags.on_register) await this.registerBribe();
          else if (q) await this.turnIn(q);
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

  /** Story beats (meetings, outros) take priority over side quests at these doors. */
  private buildingBusy(id: string) {
    if (id === "ARCHIVE") return archiveAction().kind === "meeting";
    if (id !== "TOWN_HALL") return false;
    const k = townHallAction().kind;
    return k === "meeting" || k === "outro" || k === "fact";
  }

  private arcPayout() {
    this.spawnCollectibles();
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
      } else steer(body, tx, ty, dt);
      const moving = Math.hypot(mv.x, mv.y) > 0.1;
      leadCamera(this.cameras.main, body.velocity.x, body.velocity.y, dt);
      animateWalker(this.av, mv.x, mv.y, moving, time);
      if (moving) {
        this.idleMs = 0;
      } else {
        this.idleMs += dt;
        if (this.idleMs > 90000) {
          this.idleMs = 0;
          G.drongus("idle");
        }
      }
    }
    this.av.setDepth(this.av.y + 1);
    this.updateNpcs(time, dt);
    this.updatePlayground(time, dt);
    this.updateRegister();
    this.beatup?.update(time, dt);
    if (!this.busy && this.controls.attackHeld()) {
      const m = this.npcs.find((n) => n.follower);
      if (m && Phaser.Math.Distance.Between(m.spr.x, m.spr.y, this.av.x, this.av.y) < 70) this.hitMikey(m, true);
    }
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
    const target = this.beatup?.target() ?? (st?.target ? this.targetPos(st.target) : null);
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
