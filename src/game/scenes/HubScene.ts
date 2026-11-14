import Phaser from "phaser";
import { pursuerId } from "../systems/sanmik";
import { bindSanmikToggle } from "../gfx/sanmikForm";
import { keysFor, prettyKey } from "../systems/keybinds";
import { playerKey } from "../gfx/sanmikForm";
import { hasVfx, vfx } from "../gfx/Vfx";
import { ensureCh6Art } from "../gfx/ch6Art";
import * as Juice from "../gfx/Juice";
import { squeeze } from "../systems/squeeze";
import { G } from "../G";
import { Controls } from "../combat/Controls";
import { FONT, hexStr, button } from "../ui/theme";
import { CHARACTERS, LADS } from "../../data/characters";
import { BARKS } from "../../content/dialogue/ambient";
import { NPC_TALK, type TalkSet } from "../../content/dialogue/npc";
import { CHATTER } from "../../content/dialogue/chatter";
import { evalCond } from "../systems/conditions";
import { runDialogue } from "./DialogueScene";
import { AFTER_PROLOGUE, archiveAction, chapterIntroLines, currentStep, dungeonOpen, endChapter, switchTo, townHallAction } from "../Flow";
import { chapterDef } from "../../content/chapters/chapters";
import type { Line } from "../../data/types";
import { synth } from "../audio/Synth";
import { bump, maxBottles, maxHp } from "../systems/stats";
import { activeMods } from "../../data/historicalRevisions";
import { canTurnIn, completePersonal, pickupsInHub, collectPickup, ministryQuestFor, ministryQuestState, acceptMinistry, completeMinistry, ministryProgress } from "../systems/quests";
import { dir, ping, say } from "../../content/dsl";
import { narrativeActor } from "../systems/narrative";
import { arcDue, arcStepAt, completeStep, currentArcSteps, maybeFinishArc, spotFlag } from "../systems/arcs";
import { DUNGEONS } from "../../data/dungeons";
import { MEETINGS } from "../../content/meetings";
import { animateWalker, charMeta, feetBody, leadCamera, steer } from "../gfx/HD";
import { Beatup } from "./hub/Beatup";
import { POLSON_CHATS } from "../../content/polsonChats";
import { takeDrugs, tripInto } from "./hub/drugs";
import { clock, weatherFor } from "../systems/clock";
import * as KR from "../../content/krunchers";
import { KR6_LAST_CHANCE } from "../../content/chapters/ch6prompt";
import * as AFTER from "../../content/chapters/ch7aftermath";
import { CITADEL_ENTRY } from "../../content/chapters/ch7aftermath";
import type { Arc, ArcStep } from "../../content/arcs";
import { CRYSTAL_BOSSES, CRYSTALS_NEEDED, crystalCount, hasCrystal } from "../systems/crystals";
import * as FB from "../../content/finaleKrelford";
import { finalePreload, finaleReady, logsKey } from "./finale/finaleArt";

/** The first line over the whiteness. */
const FD_WAKE_FIRST = FB.FD_WAKE.slice(0, 1);

const WORLD_W = 2560;
const WORLD_H = 1792;
/** The stormy sky above the top of town (Da Drongus Dungeon sticks up into it). */
const SKY_H = 380;

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
  { id: "CITADEL", name: "DA DRONGUS DUNGEON", x: 1280, y: 110, w: 380, h: 170, wall: 0xf8f9fa, roof: 0x3366cc, door: { x: 1280, y: 195 } },
  { id: "TOWN_HALL", name: "KRELFORD TOWN HALL", x: 1280, y: 420, w: 420, h: 230, wall: 0x9a7a5a, roof: 0x6b2737, door: { x: 1280, y: 535 } },
  { id: "ARCHIVE", name: "HISTORICAL ARCHIVE (FGM War Room below)", x: 1900, y: 420, w: 300, h: 200, wall: 0x8a7a5a, roof: 0x3a2f1f, door: { x: 1900, y: 520 } },
  { id: "BAN_TRIBUNAL", name: "BAN TRIBUNAL", x: 660, y: 420, w: 280, h: 190, wall: 0x6b6b7a, roof: 0x7c2d12, door: { x: 660, y: 515 } },
  { id: "PUB", name: "THE KREZZ ARMS", x: 560, y: 820, w: 300, h: 200, wall: 0x7a5230, roof: 0x3b2a1a, door: { x: 560, y: 920 } },
  { id: "HOME", name: "YOUR HOUSE", x: 520, y: 1250, w: 260, h: 180, wall: 0xb08d57, roof: 0x7a1f2b, door: { x: 520, y: 1340 } },
  { id: "WILDERN", name: "WILDERN ACADEMY (Krelford)", x: 1280, y: 1300, w: 420, h: 220, wall: 0xa0522d, roof: 0x5a5a6a, door: { x: 1280, y: 1410 } },
  { id: "MINISTRY", name: "MINISTRY OF BONER CONTROL", x: 2000, y: 1270, w: 340, h: 220, wall: 0x4b5563, roof: 0xd97706, door: { x: 2000, y: 1380 } },
  { id: "UNIVERSITY", name: "KRELFORD UNIVERSITY (Dept. of Philosophy & Psychology)", x: 840, y: 1260, w: 260, h: 180, wall: 0xb9b2a0, roof: 0x1e3a5f, door: { x: 840, y: 1350 } },
  { id: "GYM", name: "KRUNCH GYM", x: 2350, y: 600, w: 240, h: 170, wall: 0x3f3f46, roof: 0xf97316, door: { x: 2350, y: 685 } },
  { id: "FIXER_UPPER", name: "FIXER-UPPER (FOR SALE, AS SEEN)", x: 2350, y: 1300, w: 220, h: 160, wall: 0x8a7f6a, roof: 0x4a3f2f, door: { x: 2350, y: 1380 } },
  { id: "BOOTH", name: "THE BOOTH", x: 940, y: 680, w: 150, h: 110, wall: 0x6d28d9, roof: 0x111827, door: { x: 940, y: 735 } },
  { id: "ABANDONED", name: "ABANDONED BUILDING", x: 1000, y: 1660, w: 220, h: 140, wall: 0x2a2a2a, roof: 0x111111, door: { x: 1000, y: 1730 } },
  { id: "POLICE", name: "KRELFORD CONSTABULARY", x: 1700, y: 1670, w: 240, h: 130, wall: 0x1e3a8a, roof: 0x111827, door: { x: 1700, y: 1735 } },
  { id: "BOGGOR_HOUSE", name: "BOGGOR CRANSTIL'S HOUSE", x: 300, y: 250, w: 224, h: 176, wall: 0x2a2433, roof: 0x111111, door: { x: 300, y: 338 } },
  { id: "CROBLEY_FACTORY", name: "CROBLEY CORP HQ (THE CROBLEY FACTORY)", x: 1660, y: 1255, w: 288, h: 224, wall: 0xf472b6, roof: 0x334155, door: { x: 1660, y: 1367 } },
  { id: "OLD_FLAT", name: "YOUR OLD FLAT", x: 700, y: 1650, w: 200, h: 130, wall: 0x9a8a7a, roof: 0x5a3a2a, door: { x: 700, y: 1715 } },
];

const GATES: { id: string; name: string; x: number; y: number }[] = [
  { id: "POLSON_ROAD", name: "→ POLSON TOWERS", x: 2500, y: 1010 },
  { id: "AIRPORT", name: "→ KRELFORD INTERNATIONAL", x: 2500, y: 1650 },
  { id: "PORTAL", name: "??? THE SYMBOL OF WAHOOGAH", x: 90, y: 1250 },
  { id: "KREDDLE_BRIDGE", name: "← THE KREDDLE BRIDGE (casinos, arcades, hostility)", x: 70, y: 825 },
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
  /** Chapter 7: a soot-covered survivor, shuffling about the ruins. */
  dazed?: boolean;
  /** Mikey: follows you around begging to join the group. */
  follower?: { hits: number; koUntil: number; nextWhine: number; lastHit: number };
}

/** Chapter 7: what the survivors mumble, wandering the ruins. */
const SURVIVOR_BARKS = [
  "…what day is it?",
  "Has anyone seen my house? It was here.",
  "I can't hear anything. Is that normal?",
  "My eyebrows. Where are my eyebrows.",
  "Is the Tap open?",
  "I think I had a nice time last night.",
  "Mum? MUM?",
  "Everything's on fire. Should someone ring the council?",
  "I've lost a shoe. And the street.",
  "Was there a party? I feel like there was a party.",
  "Ringing. Constant ringing.",
  "Who moved the pub?",
  "I'm fine. I'm fine. Is my face still on?",
  "Seen by 9.",
  "Hello? Is anyone… Hello?",
  "I need a fizzy bongo. I need it so badly.",
];

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
/** Playing as Mikey, Polson does the following-you-about instead. */
const POLSON_WHINES = [
  "Yeeeggghhhh!! Where we going? Can I come? 😅",
  "Mikey!! Wbu?? What we doing today?",
  "Gym later? Or food. Food first. Then gym 😅",
  "Eden says I can come out. For an hour. Two if it's food.",
  "Is it a pub thing? I'm in. I'll ask Eden. I'm in.",
  "Can I come?? I'll drive. I can't drive. I'll get a lift.",
  "It's on the list!! Hanging out with you. It's on the list 😅",
  "Wait for me!! I'm bulking!!",
  "Mikey. Mikey. MIKEY. Wbu?",
  "Thoughts? On me coming? 😅",
  "Takeaway after? Thoughts?",
  "I'm free!! Eden's at her mum's!!",
];
const POLSON_HURT = ["OOF", "Yeeeggghhhh!!", "Fair 😅", "That's fair", "Ow. Still coming though", "Is that a no?", "Eden's gonna hear about this", "Hahaha. Ow.", "Mikey!!"];

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

  /** The Krelford finale's art (the wreck heap, the chat logs), once Da Drongus Dungeon has come down. */
  preload() {
    if (G.s?.chapter >= 7 && G.s.flags.citadel_fallen) finalePreload(this);
  }

  /** Set when arriving straight from a chapter report: run the next chapter's Town Hall meetings in the same visit. */
  private chainMeetings = false;

  create(data: { at?: string; from?: string; advance?: boolean; chain?: boolean; flyover?: boolean }) {
    const s = G.s;
    if (data?.advance) endChapter();
    if (s.flags.companion_used) {
      const who = CHARACTERS[s.flags.companion as string]?.name ?? "Your lad";
      delete s.flags.companion;
      delete s.flags.companion_used;
      this.time.delayedCall(1500, () => G.emit("toast", { title: "CONTRACT ENDED", text: `${who} has gone home. Hire another at the Kreddle Exchange (over the bridge).` }));
    }
    this.chainMeetings = !!(data?.advance || data?.chain);
    s.phase = "hub";
    // the Chapter 6 nuke keeps ticking in town; any other timer stops here
    if (!(s.chapter === 6 && s.flags.nuke_planted && !s.flags.krunch_started)) {
      G.rt.timerEnd = 0;
      G.emit("timer", null);
    }
    this.npcs = [];
    // the scene object is reused between visits: drop anything left over from last time
    this.raidKrew = [];
    this.finaleKrew = [];
    this.finaleLogs = null;
    this.finaleRumbling = false;
    this.trail = [];
    this.brawl = null;
    this.cutscene = false;
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
    this.av = this.physics.add.sprite(start.x, start.y, playerKey(this), 0).setScale(2).setDepth(start.y);
    feetBody(this.av, 20, 16, this.hd ? 26 : 22).setCollideWorldBounds(true);
    this.physics.add.collider(this.av, this.colliders);
    // playing as Mikey: V (or the SANMIK button) and he's SanMik, there and then
    bindSanmikToggle(this, { sprites: () => [this.av as unknown as Phaser.GameObjects.Sprite], can: () => !this.busy && !this.cutscene });
    if (s.player === "MIKEY" && !s.flags.sanmik_hint && s.chapter !== 5) {
      s.flags.sanmik_hint = true;
      this.time.delayedCall(2500, () => G.emit("toast", { title: "KREBLAR, AKA SANMIK", text: `Press ${prettyKey(keysFor("sanmik")[0] ?? "V")} any time to become SanMik (and back). Whoever you are, you stay that way.` }));
    }
    // headroom above the map so the top of Da Drongus Dungeon fits on screen
    this.cameras.main.setBounds(0, -SKY_H, WORLD_W, WORLD_H + SKY_H);
    this.cameras.main.startFollow(this.av, true, 0.12, 0.12);
    this.beatup = new Beatup(this, BUILDINGS.filter((b) => b.door).map((b) => ({ x: b.door!.x, y: b.door!.y + 30, name: b.name })));
    this.events.once("shutdown", () => this.beatup?.destroy());
    this.prompt = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#000000cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(5000).setVisible(false);
    this.arrow = this.add.text(0, 0, "➤", { fontFamily: FONT, fontSize: "26px", color: "#ffd23f" }).setOrigin(0.5).setDepth(5000).setShadow(2, 2, "#000", 0);
    this.spawnNpcs();
    this.setupInteractables();
    this.setupExploration();
    if (!this.scene.isActive("UI")) this.scene.launch("UI", { mode: "hub" });
    else this.scene.get("UI").events.emit("mode", "hub");
    G.emit("boss", null);
    G.emit("rule", null);
    // after dark (and not on the finale's blue morning) the town plays its night theme
    synth.isNight = () => !G.s.flags.finale_dawn && clock().dark >= 0.5;
    synth.music("hub");
    synth.ambience("town");
    this.weather();
    G.save();
    // the SPIRIT CUM's long whiteness, fading into the morning
    if (data?.from === "finale_dawn") this.whiteout = this.add.rectangle(480, 270, 2000, 1200, 0xffffff, 1).setScrollFactor(0).setDepth(9500);
    this.time.delayedCall(400, () => this.onArrive(data?.from, data?.flyover, data?.at));
  }

  /** First time out of the front door: a slow look round Krelford. */
  /**
   * Weather and time of day in town, from the real clock: night-time after 8pm (lights on, sky dark), and on some days
   * it rains (or in December, snows). Drawn PixelLab weather loops tiled over the screen.
   */
  private weather() {
    const c0 = clock();
    // Chapter 6, from the revenge meeting to the end: a black, rainy night
    // after THE CONCEPT OF PAEDOPHILIA: a clear blue morning over the ruins, whatever the clock says
    const dawn = !!G.s.flags.finale_dawn;
    const raidNight = !dawn && ((G.s.chapter === 6 && !!G.s.flags.raid_march && !G.s.flags.ch6_clear) || (G.s.chapter >= 7 && !!G.s.flags.krelworld_bombed));
    const kind = dawn ? null : raidNight ? "storm" : weatherFor(c0.day);
    (this as any).weatherKind = kind;
    // the sky follows Krelford's clock: night darkens, dusk and dawn glow orange, doors light up after dark
    const nightA = this.add.rectangle(480, 270, 960, 540, 0x0b1440, 1).setAlpha(0).setScrollFactor(0).setDepth(4900).setBlendMode(Phaser.BlendModes.MULTIPLY);
    const blueA = this.add.rectangle(480, 270, 960, 540, 0x1e2a6b, 1).setAlpha(0).setScrollFactor(0).setDepth(4901);
    const dusk = this.add.rectangle(480, 270, 960, 540, 0xff7a3a, 1).setAlpha(0).setScrollFactor(0).setDepth(4901).setBlendMode(Phaser.BlendModes.MULTIPLY);
    const duskGlow = this.add.rectangle(480, 270, 960, 540, 0xff9a5a, 1).setAlpha(0).setScrollFactor(0).setDepth(4902).setBlendMode(Phaser.BlendModes.ADD);
    const glows: Phaser.GameObjects.Ellipse[] = [];
    for (const b of BUILDINGS) {
      if (!b.door) continue;
      glows.push(this.add.ellipse(b.door.x, b.door.y + 6, 120, 60, 0xffc46b, 1).setAlpha(0).setDepth(4902).setBlendMode(Phaser.BlendModes.ADD));
    }
    const apply = () => {
      // the ruined town is lit by its own fires: dark, but you can still see who's crawling out of what
      const c = dawn ? { dark: 0, twilight: 0.12 } : raidNight ? { dark: G.s.chapter >= 7 ? 0.55 : 1, twilight: 0 } : clock();
      nightA.setAlpha(c.dark * 0.42);
      blueA.setAlpha(c.dark * 0.18);
      dusk.setAlpha(c.twilight * 0.4);
      duskGlow.setAlpha(c.twilight * 0.1);
      const flick = 0.85 + Math.sin(this.time.now / 900) * 0.15;
      for (const g of glows) g.setAlpha(c.dark * 0.22 * flick);
    };
    apply();
    this.time.addEvent({ delay: 250, loop: true, callback: apply });
    // day ⇄ night music, as dusk deepens and dawn breaks
    this.time.addEvent({ delay: 1000, loop: true, callback: () => synth.refreshTown() });
    if (!kind) return;
    synth.weatherSound(kind);
    const wet = kind !== "snow";
    if (wet) this.add.rectangle(480, 270, 960, 540, 0x334155, kind === "storm" ? 0.22 : 0.16).setScrollFactor(0).setDepth(4903);
    const key = wet ? "vfx_rain" : "vfx_snow";
    if (hasVfx(this, key)) {
      const layers = kind === "storm" ? 2 : 1;
      for (let l = 0; l < layers; l++)
        for (let gx = 0; gx < 3; gx++)
          for (let gy = 0; gy < 3; gy++) {
            const sp = vfx(this, key, 160 + gx * 320 + l * 90, 100 + gy * 200 + l * 60, {
              fixed: true,
              scale: 2 + l * 0.4,
              depth: 4950 + l,
              alpha: wet ? 0.75 : 0.9,
              speed: kind === "storm" ? 1.5 : 1,
              angle: kind === "storm" ? 12 : 0,
            });
            // stagger the tiles so the pattern doesn't repeat in lockstep
            sp?.anims.setProgress(Math.random());
          }
    }
    if (kind === "storm") this.stormFlashes();
  }

  /** Storms: the sky flashes white every so often, and the thunder follows (closer strikes, sooner and louder). */
  private stormFlashes() {
    const flash = this.add.rectangle(480, 270, 960, 540, 0xeef2ff, 0).setScrollFactor(0).setDepth(4960).setBlendMode(Phaser.BlendModes.ADD);
    const strike = () => {
      if (!this.scene.isActive()) return;
      const close = Math.random() < 0.45;
      this.tweens.chain({
        targets: flash,
        tweens: [
          { alpha: close ? 0.75 : 0.35, duration: 40 },
          { alpha: 0.05, duration: 90 },
          { alpha: close ? 0.6 : 0.25, duration: 40 },
          { alpha: 0, duration: close ? 500 : 300 },
        ],
      });
      if (close) {
        this.cameras.main.shake(300, 0.003);
        const v = this.cameras.main.worldView;
        this.lightning(v.x + 120 + Math.random() * (v.width - 240), v.y, v.y + 200 + Math.random() * 220, 4955);
      }
      this.time.delayedCall(close ? 120 : 700 + Math.random() * 900, () => this.scene.isActive() && synth.play("thunder"));
      this.time.delayedCall(7000 + Math.random() * 11000, strike);
    };
    this.time.delayedCall(2500 + Math.random() * 4000, strike);
  }

  private async flyover() {
    const s = G.s;
    s.flags.flyover_seen = true;
    G.save();
    this.busy = true;
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const cam = this.cameras.main;
    const wait = (ms: number) => new Promise<void>((r) => this.time.delayedCall(ms, () => r()));
    cam.stopFollow();
    this.scene.setVisible(false, "UI");
    const z0 = cam.zoom;
    const barT = this.add.rectangle(480, -70, 960, 70, 0x000000).setOrigin(0.5, 0).setScrollFactor(0).setDepth(9000);
    const barB = this.add.rectangle(480, 610, 960, 70, 0x000000).setOrigin(0.5, 1).setScrollFactor(0).setDepth(9000);
    this.tweens.add({ targets: barT, y: 0, duration: 600 });
    this.tweens.add({ targets: barB, y: 540, duration: 600 });
    const cap = this.add.text(480, 505, "", { fontFamily: FONT, fontSize: "16px", color: "#ffffff", align: "center", wordWrap: { width: 860 } }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);
    const say2 = (t: string) => {
      cap.setAlpha(0).setText(t);
      this.tweens.add({ targets: cap, alpha: 1, duration: 400 });
    };
    cam.pan(1280, 160, 1, "Linear", true);
    await wait(300);
    const big = this.add.text(480, 250, "KRELFORD", { fontFamily: "Impact, sans-serif", fontSize: "80px", color: "#ffd23f", stroke: "#2a1400", strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(9001).setAlpha(0);
    const sub = this.add.text(480, 315, "capital of Krelworld · population: the group chat, and some others", { fontFamily: FONT, fontSize: "15px", color: "#ffe9a8" }).setOrigin(0.5).setScrollFactor(0).setDepth(9001).setAlpha(0);
    this.tweens.add({ targets: [big, sub], alpha: 1, duration: 800 });
    synth.play("cheer");
    await wait(2200);
    this.tweens.add({ targets: [big, sub], alpha: 0, duration: 600 });
    const stops: [number, number, string][] = [
      [1280, 60, "Up above the clouds: the Great Wiki Citadel. Drongus B. Drippin' writes the lore up there. You can't see it. It's there."],
      [1280, 440, "KRELFORD TOWN HALL. Where the cabinet meets, argues, and occasionally governs."],
      [1900, 440, "THE HISTORICAL ARCHIVE. Every message ever sent, kept forever. The FGM War Room is in the basement."],
      [1280, 800, "THE GREAT PUSSY JUICE TAP. It heals. It nourishes. It is the national drink. Never let it stop."],
      [560, 840, "THE KREZZ ARMS. Fizzy Bongos on tap. SanMik & SanChz on most nights. You have been warned."],
      [1280, 1300, "WILDERN ACADEMY. The local school. The new headmaster is said to be very… zany."],
      [160, 825, "THE KREDDLE BRIDGE. Over there: Kreddle, the casino universe. They hate us. Their slot machines are excellent."],
    ];
    for (const [x, y, t] of stops) {
      cam.pan(x, y, 1700, "Sine.easeInOut");
      await wait(900);
      say2(t);
      await wait(2300);
    }
    // ...and home
    say2("And this is you. Off to the Town Hall. Don't be late.");
    cam.pan(this.av.x, this.av.y, 1600, "Sine.easeInOut");
    void z0;
    await wait(1900);
    cam.startFollow(this.av, true, 0.12, 0.12);
    this.tweens.add({ targets: barT, y: -70, duration: 500 });
    this.tweens.add({ targets: [barB], y: 610, duration: 500 });
    this.tweens.add({ targets: cap, alpha: 0, duration: 400 });
    await wait(550);
    barT.destroy();
    barB.destroy();
    cap.destroy();
    big.destroy();
    sub.destroy();
    this.scene.setVisible(true, "UI");
    this.busy = false;
    G.emit("toast", { title: "OBJECTIVE", text: "Go to Krelford Town Hall. Follow the yellow arrow." });
  }

  private async onArrive(from?: string, flyover?: boolean, at?: string) {
    const s = G.s;
    if (flyover && !s.flags.flyover_seen && !s.flags.prologue_done) await this.flyover();
    // Chapter 6 is the point of no return: it only starts when you say so, at the Town Hall
    if (s.chapter === 6 && !s.flags.ch6_ready) {
      if (!s.flags.ch6_lastchance_seen) {
        s.flags.ch6_lastchance_seen = true;
        G.save();
        await this.talk(KR6_LAST_CHANCE);
      } else G.emit("toast", { title: "⚠ LAST CHANCE", text: "Stock up on weapons, ammo, upgrades, Krezzcoin and Krokens. Go to the Town Hall when you're ready to begin Chapter 6." });
      return;
    }
    // Chapter 7 opens at the top of Da Drongus Dungeon, then Krelford wakes up in the rubble
    if (s.chapter >= 7 && s.flags.ch6_clear && !s.flags.ch7_lair_seen) {
      this.go("Lair", {});
      return;
    }
    // THE FINALE, the morning after: the lads come round, Drongus comes round, and the race for the logs
    if (s.chapter >= 7 && s.flags.concept_destroyed && s.flags.finale_dawn && !s.flags.finale_dawn_done) {
      await this.finaleDawn();
      return;
    }
    // THE FINALE: Da Drongus Dungeon has come down. The chat logs are somewhere in town. And then...
    if (s.chapter >= 7 && s.flags.citadel_fallen && !s.flags.concept_destroyed) {
      await this.finaleKrelford();
      return;
    }
    if (s.chapter >= 7 && s.flags.ch6_clear && !s.flags.ch7_aftermath) {
      await this.aftermath();
      return;
    }
    // Chapter 6 finale: home in time (or not): Kreddle's Krunch Protocol comes for every building in town
    if (from === "krunch") {
      await this.krunchBombing();
      return;
    }
    if (s.chapter > 1 && !s.flags[`ch${s.chapter}_intro`]) {
      s.flags[`ch${s.chapter}_intro`] = true;
      const ch = chapterDef(s.chapter);
      G.emit("toast", { title: `CHAPTER ${s.chapter}`, text: `${ch.title} — ${ch.subtitle}` });
      await this.talk(chapterIntroLines(s.chapter, s.player));
      G.save();
      // Chapter 4 starts with a night in: home, and a relaxing episode of Beep Show, before anything else
      if (s.chapter === 4 && !s.flags.tv_beep_show) {
        await this.talk([dir("Before any of that: a night in. You head home for a relaxing episode of Beep Show.")]);
        this.go("Home", { beep: true });
        return;
      }
    }
    if (s.flags.met_emergency && !s.flags.drongus_dungeon_risen) await this.riseTower();
    // you've been out with a Tap Rush: it's worn off
    if (s.flags.tap_rush && s.flags.tap_rush_out && from) {
      s.flags.tap_rush = false;
      s.flags.tap_rush_out = false;
      s.hp = Math.min(s.hp, maxHp(s));
      G.emit("toast", { title: "TAP RUSH WORN OFF", text: "Back to normal. The Great Tap is always there for a top-up." });
    }
    if (s.chapter === 1 && s.flags.ch1_clear && !s.flags.tap_flow_seen) await this.tapFlows();
    if (s.chapter === 1 && !s.flags.ch1_hub_tip) {
      s.flags.ch1_hub_tip = true;
      G.emit("toast", { title: "KRELFORD", text: "WASD to walk. E to talk/interact. Follow the yellow arrow. Esc for menu (quests, upgrades, save)." });
    }
    if (from === "swap") {
      G.emit("toast", { title: "CARRYING ON", text: `You are now ${CHARACTERS[s.player].name}. Krebon's ${s.flags.rock_points ?? 0} rockstar points came with you.` });
      await this.talk([dir("You wake up at the edge of town, next to a faded symbol and a pile of underwear. You don't remember how you got here. You feel inexplicably like a rockstar.")]);
    }
    if (from === "arena" || from === "vignette" || from === "minigame" || from === "dungeon") this.arcPayout();
    // a side-quest step marked auto follows straight on from the cutscene or fight you've just come back from
    const auto = (from === "arena" || from === "vignette") && at ? arcStepAt(s, at) : null;
    if (auto?.step.auto && (await this.runArcStep(at!)) && this.busy) return;
    G.drongus("hub");
    if (from === "dungeon") G.emit("toast", { title: "BACK IN KRELFORD", text: s.chapter === 1 && !s.flags.wildern_destroyed ? "Wildern has to go. Plant the bombs (4) around the school." : "Report to the Town Hall." });
    // the Kreddle Krunchers come over the bridge (start of Chapter 3)
    const inv = !this.chainMeetings && currentArcSteps(s).find((c) => c.step.step.kind === "auto" && c.step.step.id === "kruncher_invasion");
    if (inv) {
      await this.krunchersInvade(inv.arc, inv.step);
      return;
    }
    // announce side quests that have just opened up
    for (const c of currentArcSteps(s)) {
      const k = `arc_announced_${c.arc.id}`;
      if (s.flags[k] || s.flags[`${c.arc.id}_done`]) continue;
      s.flags[k] = true;
      const due = arcDue(c.arc);
      G.emit("toast", { title: `${c.arc.player === "ALL" ? "NEW SIDE QUEST" : "YOUR STORY"}: ${c.arc.title}`, text: `${c.step.text}${due !== null ? ` (Required before the Chapter ${Math.max(due, s.chapter)} dungeon.)` : ""}` });
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
    // Chapter 7: what's left of Krelford after the Krunch Protocol
    this.ruined = G.s.chapter >= 7 && !!G.s.flags.krelworld_bombed;
    // (the morning after the finale: the same ruins, in daylight)
    const day = (tint: number) => (G.s.flags.finale_dawn ? ({ 0x3b2f27: 0x857560, 0x5a4c48: 0x9a8c84 } as Record<number, number>)[tint] ?? tint : tint);
    const scorched = (t: Phaser.GameObjects.TileSprite, tint: number) => (this.ruined ? t.setTint(day(tint)) : t);
    scorched(this.add.tileSprite(0, 0, WORLD_W, WORLD_H, "tile_grass").setOrigin(0).setDepth(0), 0x3b2f27);
    this.drawSky();
    // roads
    for (const [x, y, w, h] of [
      [80, 780, WORLD_W - 80, 90],
      [1235, 200, 90, 1500],
      [300, 1500, 2000, 70],
      [500, 560, 1700, 60],
      [200, 1000, 70, 700],
      [2400, 860, 160, 290],
    ]) scorched(this.add.tileSprite(x, y, w, h, "tile_road").setOrigin(0).setDepth(0), 0x5a4c48);
    // plaza
    scorched(this.add.tileSprite(1060, 650, 440, 340, "tile_cobble").setOrigin(0).setDepth(0), 0x5a4c48);
    if (this.ruined) this.scorchGround();
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
    // The Great Tap (in Chapter 7, a crater with a dry pipe in it)
    if (this.ruined) {
      this.ruinProp("r_crater", 1280, 830, 2.4);
      this.ruinProp("r_pipe", 1280, 815, 1.6);
      this.add.text(1280, 860, "WHERE THE GREAT TAP WAS", { fontFamily: FONT, fontSize: "11px", color: "#ff9a9a", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setDepth(861);
    } else {
      // dry until Chapter 2 (the Great Silence), then it pours
      const flowing = G.s.chapter >= 2;
      const key = flowing ? (this.textures.exists("tap_flow") ? "tap_flow" : "hd_tap") : this.textures.exists("tap_off") ? "tap_off" : "hd_tap";
      if (flowing && key === "tap_flow" && !this.anims.exists("tap_flow")) this.anims.create({ key: "tap_flow", frames: this.anims.generateFrameNumbers("tap_flow", { start: 0, end: 7 }), frameRate: 9, repeat: -1 });
      if (this.hd && this.textures.exists(key)) {
        const t = this.add.sprite(1280, 790, key, 0).setDepth(850);
        if (key === "tap_flow") t.play("tap_flow");
        if (flowing) this.neonGlow(1280, 790, 110, 0xff6bb0);
      } else {
        const t = this.add.sprite(1280, 800, this.textures.exists(key) ? key : "p_tap", 0).setScale(3).setDepth(800);
        if (key === "tap_flow") t.play("tap_flow");
      }
    }
    if (!this.ruined) this.add.text(1280, 690, "THE GREAT PUSSY JUICE TAP", { fontFamily: FONT, fontSize: "11px", color: "#ffb6c1", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(801);
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
    if (this.ruined) this.ruinProp("r_girders", 1450, 760, 1.4);
    else if (this.hd && this.textures.exists("hd_tv")) this.add.image(1450, 730, "hd_tv").setDepth(770);
    else this.add.image(1450, 740, "p_tv").setScale(3).setDepth(740);
    if (!this.ruined) this.add.text(1450, 700, "KrelTV", { fontFamily: FONT, fontSize: "10px", color: "#88aaff" }).setOrigin(0.5).setDepth(741);
    // vending machines
    for (const [x, y] of [
      [1100, 720],
      [1880, 600],
      [700, 1080],
      [1500, 1450],
    ]) {
      if (this.ruined) {
        this.ruinProp("r_debris", x, y + 20, 1.2);
        continue;
      }
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
      if (gt.id === "KREDDLE_BRIDGE") {
        this.drawKreddleBridge(gt.x, gt.y, gt.name);
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
      if (this.ruined) {
        if (!this.ruinProp(i % 3 === 0 ? "r_stump" : "r_deadtree", x, y + 14, 1.5)) this.add.rectangle(x, y, 8, 26, 0x1a1210).setDepth(y);
      } else if (this.hd && this.textures.exists("hd_tree")) {
        this.add.image(x, y - 24, i % 3 === 0 && this.textures.exists("hd_tree2") ? "hd_tree2" : "hd_tree").setDepth(y + 16);
        this.add.ellipse(x, y + 14, 40, 12, 0x1a1033, 0.3).setDepth(1);
      } else {
        this.add.circle(x, y, 18, 0x2f5a22).setDepth(y);
        this.add.circle(x - 5, y - 6, 8, 0x3d7a2c).setDepth(y + 1);
      }
      this.colliders.add(this.add.rectangle(x, y + 8, 16, 12, 0, 0));
    }
    if (this.ruined) this.ruinStreets();
    else if (this.hd) this.dressStreets();
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

  // ------------------------------------------------------------- golden juice

  /** Two new faces in town (once golden juice is a thing), up for a squeeze. */
  private setupSqueezers() {
    if (!G.s.flags.golden_unlocked) return;
    const who: { name: string; tex: string; x: number; y: number; hi: string }[] = [
      { name: "SHEZLEIGH", tex: "spr_TV_SHEZLEIGH", x: 1520, y: 905, hi: "Alright babe. Heard you're the one going round squeezing. I'm up for it." },
      { name: "BIG SUE", tex: "spr_TV_SUE", x: 760, y: 905, hi: "Ooh, it's you. Come here, I give the best squeezes in Krelford. Ask anyone." },
    ];
    for (const w of who) {
      if (!this.textures.exists(w.tex)) continue;
      const spr = this.add.sprite(w.x, w.y, w.tex, 0).setScale(2).setDepth(w.y);
      this.add.text(w.x, w.y - 44, `${w.name} 💛`, { fontFamily: FONT, fontSize: "9px", color: "#fde047", backgroundColor: "#00000077", padding: { x: 2, y: 1 } }).setOrigin(0.5, 1).setDepth(4000);
      this.tweens.add({ targets: spr, y: w.y - 4, yoyo: true, repeat: -1, duration: 900 + Math.random() * 300 });
      this.interactables.push({
        x: w.x,
        y: w.y,
        r: 50,
        label: () => (G.s.flags.golden_charge ? `${w.name} (you're already full of golden juice)` : `Talk to ${w.name} (squeeze)`),
        use: async () => {
          this.busy = true;
          (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          await squeeze(this, (l) => this.talk(l), { name: w.name, spr }, this.av, [say(w.name, w.hi)]);
          this.busy = false;
        },
      });
    }
  }

  // ------------------------------------------------------------- the Great Tap

  private static TAP = { x: 1280, y: 790, spoutX: 1265, spoutY: 773, basinY: 805 };

  /** A pink splash and sparkles at the Tap (you've just had a drink). */
  private tapSplash() {
    const T = HubScene.TAP;
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const d = this.add.circle(T.spoutX, T.basinY, 3 + Math.random() * 3, Math.random() < 0.5 ? 0xff6bb0 : 0xffc0de, 0.95).setDepth(900);
      this.tweens.add({ targets: d, x: d.x + Math.cos(a) * 70, y: d.y + Math.sin(a) * 60, alpha: 0, duration: 600, ease: "Quad.out", onComplete: () => d.destroy() });
    }
    const t = this.add.text(this.av.x, this.av.y - 60, "💦 TAP RUSH!", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ff6bb0", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(5000);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
    this.cameras.main.flash(200, 255, 140, 200);
  }

  /** Chapter 1, Krandall's dead: the camera swings round to the Great Tap as it coughs back into life. */
  private async tapFlows() {
    const s = G.s;
    const T = HubScene.TAP;
    const cam = this.cameras.main;
    this.busy = true;
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    synth.stopMusic();
    cam.stopFollow();
    cam.pan(T.x, T.y - 40, 1400, Phaser.Math.Easing.Sine.InOut);
    await new Promise((r) => this.time.delayedCall(1500, r));
    // it coughs...
    for (let i = 0; i < 3; i++) {
      synth.play("tap_fail");
      cam.shake(200, 0.006);
      const drop = this.add.circle(T.spoutX, T.spoutY, 4, 0xff6bb0).setDepth(900);
      this.tweens.add({ targets: drop, y: T.basinY, duration: 300, ease: "Quad.in", onComplete: () => drop.destroy() });
      const cough = this.add.text(T.spoutX - 30, T.spoutY - 30, ["*cough*", "*splutter*", "*GLUG*"][i], { fontFamily: FONT, fontSize: "14px", color: "#ffb6c1", stroke: "#000", strokeThickness: 3 }).setDepth(5000);
      this.tweens.add({ targets: cough, y: cough.y - 20, alpha: 0, duration: 800, onComplete: () => cough.destroy() });
      await new Promise((r) => this.time.delayedCall(700, r));
    }
    // ...and GUSHES
    synth.play("splash");
    synth.play("boom");
    cam.shake(900, 0.014);
    cam.flash(300, 255, 120, 190);
    const gush = this.time.addEvent({ delay: 25, loop: true, callback: () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      const v = 260 + Math.random() * 160;
      const d = this.add.circle(T.spoutX, T.spoutY, 3 + Math.random() * 4, Math.random() < 0.6 ? 0xff6bb0 : 0xffc0de, 0.95).setDepth(900);
      const dx = Math.cos(a) * v * 0.9;
      const peak = Math.sin(a) * v * 0.55;
      this.tweens.add({ targets: d, x: d.x + dx, duration: 1100, ease: "Linear" });
      this.tweens.add({ targets: d, y: T.spoutY + peak, duration: 520, ease: "Quad.out", yoyo: true, hold: 40, onComplete: () => d.destroy() });
    } });
    const rain = this.time.addEvent({ delay: 60, loop: true, callback: () => {
      const x = cam.worldView.x + Math.random() * 960;
      const d = this.add.rectangle(x, cam.worldView.y - 10, 2, 9, 0xff8fc7, 0.8).setDepth(4200);
      this.tweens.add({ targets: d, y: d.y + 560, duration: 900, onComplete: () => d.destroy() });
    } });
    const title = this.add.text(480, 120, "THE TAP FLOWS AGAIN", { fontFamily: "Impact, sans-serif", fontSize: "52px", color: "#ff6bb0", stroke: "#3b0a2a", strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(6000).setScale(2.5).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 450, ease: "Back.out" });
    this.time.delayedCall(500, () => synth.music("hub"));
    // the town comes running
    const cheers = ["PUSSY JUICE!!", "IT'S BACK!!", "ME NEED PUSSY JUICE!", "GET THE BUCKETS!", "MMMM!", "I'M DRINKING IT WITH MY EYES CLOSED!"];
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(300 + i * 280, () => {
        const ang = Math.random() * Math.PI * 2;
        const sx = T.x + Math.cos(ang) * 420;
        const sy = T.y + Math.sin(ang) * 260;
        const folk = this.add.sprite(sx, sy, this.textures.exists(`spr_FOLK${(i % 3) + 1}`) ? `spr_FOLK${(i % 3) + 1}` : playerKey(this), 0).setScale(2).setDepth(sy);
        const bucket = this.add.text(sx + 12, sy - 4, "🪣", { fontSize: "16px" }).setDepth(sy + 1);
        const tx = T.x + Math.cos(ang) * 80;
        const ty = T.y + 40 + Math.sin(ang) * 40;
        this.tweens.add({ targets: [folk, bucket], x: `+=${tx - sx}`, y: `+=${ty - sy}`, duration: 1400, ease: "Quad.out", onComplete: () => {
          const c = this.add.text(folk.x, folk.y - 44, cheers[i % cheers.length], { fontFamily: FONT, fontSize: "12px", color: "#ffffff", backgroundColor: "#be185dcc", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(5000);
          this.tweens.add({ targets: folk, y: folk.y - 14, yoyo: true, repeat: 5, duration: 160 });
          this.time.delayedCall(2600, () => { c.destroy(); this.tweens.add({ targets: [folk, bucket], alpha: 0, duration: 500, onComplete: () => { folk.destroy(); bucket.destroy(); } }); });
        } });
      });
    }
    await new Promise((r) => this.time.delayedCall(3800, r));
    this.tweens.add({ targets: title, alpha: 0, duration: 500, onComplete: () => title.destroy() });
    await this.talk([
      dir("With Kranky Krandall gone, the Main reconnects. The Great Pussy Juice Tap coughs, splutters, and then absolutely lets rip. It rains pink over Krelford for eleven minutes."),
      dir("Citizens run out with buckets, mugs, eggcups and in one case a wellington boot. Someone is drinking straight from the spout with their eyes closed."),
      say("GRONNY", "Me have pussy juice! ME HAVE PUSSY JUICE!"),
      say("KREBLIS", "Breaking news… the Tap is back 👍", { role: true, proctus: "Breaking news! The Tap! It's back! I've got it in my ear!" }),
      dir("TIP: Drink from the Great Tap before a mission for a TAP RUSH: +50% max HP and +25% damage until you're back in town."),
    ]);
    rain.remove();
    gush.remove();
    s.flags.tap_flow_seen = true;
    cam.pan(this.av.x, this.av.y, 900, Phaser.Math.Easing.Sine.InOut);
    await new Promise((r) => this.time.delayedCall(950, r));
    cam.startFollow(this.av, true, 0.12, 0.12);
    this.busy = false;
    G.save();
  }

  // ------------------------------------------------------------- blowing up Wildern

  private bImg: Record<string, Phaser.GameObjects.Image> = {};
  /** Chapter 7: Krelford is rubble. */
  private ruined = false;

  /** Where the four bombs go round Wildern. */
  private bombSpots(b: Building) {
    const bottom = b.y + b.h / 2;
    return [
      { x: b.x - b.w / 2 - 24, y: bottom - 30 },
      { x: b.x - b.w / 4, y: bottom + 26 },
      { x: b.x + b.w / 4, y: bottom + 26 },
      { x: b.x + b.w / 2 + 24, y: bottom - 30 },
    ];
  }

  /** The bombs planted round Wildern (gone when they go off). */
  private wildernBombs: { x: number; y: number; objs: Phaser.GameObjects.GameObject[] }[] = [];

  private drawBomb(x: number, y: number) {
    const bomb = this.add.text(x, y, "💣", { fontSize: "26px" }).setOrigin(0.5).setDepth(y + 5);
    const led = this.add.circle(x + 9, y - 12, 3, 0xef4444).setDepth(y + 6);
    this.wildernBombs.push({ x, y, objs: [bomb, led] });
    this.tweens.add({ targets: led, alpha: 0.1, yoyo: true, repeat: -1, duration: 260 });
    this.tweens.add({ targets: bomb, scale: 1.08, yoyo: true, repeat: -1, duration: 520 });
    return [bomb, led];
  }

  private setupBombs() {
    const s = G.s;
    this.wildernBombs = [];
    if (!(s.chapter === 1 && s.flags.ch1_clear && !s.flags.wildern_destroyed)) return;
    const b = BUILDINGS.find((x) => x.id === "WILDERN")!;
    this.bombSpots(b).forEach((sp, i) => {
      const k = `wildern_bomb_${i}`;
      if (s.flags[k]) {
        this.drawBomb(sp.x, sp.y);
        return;
      }
      const ring = this.add.circle(sp.x, sp.y, 20, 0xef4444, 0.18).setStrokeStyle(2, 0xef4444, 0.9).setDepth(sp.y);
      const mark = this.add.text(sp.x, sp.y - 30, "BOMB HERE", { fontFamily: FONT, fontSize: "10px", color: "#ffffff", backgroundColor: "#b91c1ccc", padding: { x: 4, y: 1 } }).setOrigin(0.5).setDepth(5000);
      this.tweens.add({ targets: ring, scale: 1.3, alpha: 0.4, yoyo: true, repeat: -1, duration: 500 });
      const it = {
        x: sp.x,
        y: sp.y,
        r: 50,
        label: () => (s.flags[k] ? "" : `Plant a bomb (${this.bombsPlanted() + 1}/4)`),
        use: () => {
          if (s.flags[k] || this.busy) return;
          s.flags[k] = true;
          ring.destroy();
          mark.destroy();
          this.drawBomb(sp.x, sp.y);
          synth.play("select");
          const n = this.bombsPlanted();
          this.interactables = this.interactables.filter((x) => x !== it);
          G.save();
          if (n >= 4) void this.blowWildern();
          else G.emit("toast", { title: `BOMB ${n}/4 PLANTED`, text: n === 3 ? "One more. Then run." : "Keep going. Round the school." });
        },
      };
      this.interactables.push(it);
    });
  }

  private bombsPlanted() {
    return [0, 1, 2, 3].filter((i) => G.s.flags[`wildern_bomb_${i}`]).length;
  }

  /** The big one: four bombs, a countdown, and Wildern Academy goes up. */
  private async blowWildern() {
    const s = G.s;
    const b = BUILDINGS.find((x) => x.id === "WILDERN")!;
    const cam = this.cameras.main;
    this.busy = true;
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    await this.talk([say("MIKEY", "That's all four. Everybody back. BACK. Further than that."), dir("You all retreat behind a bin. Mikey holds up a detonator made out of a Nintendo Wii remote.", { variants: { MIKEY: "You all retreat behind a bin. You hold up a detonator made out of a Nintendo Wii remote." } })]);
    this.busy = true;
    synth.stopMusic();
    cam.stopFollow();
    cam.pan(b.x, b.y + 20, 1200, Phaser.Math.Easing.Sine.InOut);
    await new Promise((r) => this.time.delayedCall(1300, r));
    // countdown
    for (const n of ["3", "2", "1"]) {
      const t = this.add.text(480, 230, n, { fontFamily: "Impact, sans-serif", fontSize: "120px", color: "#ef4444", stroke: "#000", strokeThickness: 12 }).setOrigin(0.5).setScrollFactor(0).setDepth(6000).setScale(2).setAlpha(0);
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 250, ease: "Back.out" });
      this.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 200, onComplete: () => t.destroy() });
      synth.play("select");
      await new Promise((r) => this.time.delayedCall(900, r));
    }
    // the blast: a chain of explosions round the building, then one enormous one
    const boom = (x: number, y: number, big: boolean) => {
      synth.play(big ? "explode" : "boom");
      cam.shake(big ? 900 : 300, big ? 0.03 : 0.012);
      // drawn explosions (PixelLab VFX): one for a charge, a cluster and a smoke column for the big one
      if (hasVfx(this, "vfx_bigboom")) {
        vfx(this, "vfx_bigboom", x, y, { scale: big ? 3.2 : 1.4, depth: 4301 });
        vfx(this, "vfx_smoke", x, y - 20, { scale: big ? 3 : 1.2, depth: 4300, delay: 400 });
        if (big) {
          for (let i = 0; i < 6; i++) vfx(this, "vfx_bigboom", x + (Math.random() - 0.5) * 260, y + (Math.random() - 0.5) * 120, { scale: 1.6 + Math.random(), depth: 4302, delay: 120 + i * 140 });
          vfx(this, "vfx_blastsmoke", x, y + 60, { scale: 3, depth: 4299, delay: 500 });
        }
        return;
      }
      const f = this.add.circle(x, y, big ? 40 : 16, 0xfff1a8, 1).setDepth(4300).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: f, radius: big ? 260 : 80, alpha: 0, duration: big ? 900 : 450, onComplete: () => f.destroy() });
      const o = this.add.circle(x, y, big ? 30 : 12, 0xf97316, 0.9).setDepth(4301);
      this.tweens.add({ targets: o, radius: big ? 180 : 55, alpha: 0, duration: big ? 1100 : 550, onComplete: () => o.destroy() });
      for (let i = 0; i < (big ? 40 : 10); i++) {
        const a = Math.random() * Math.PI * 2;
        const d = (big ? 120 : 50) + Math.random() * (big ? 260 : 90);
        const chunk = this.add.rectangle(x, y, 6 + Math.random() * 8, 5 + Math.random() * 6, Math.random() < 0.6 ? 0x9a3412 : 0x44403c).setDepth(4302);
        this.tweens.add({ targets: chunk, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 60, angle: 720, duration: 700 + Math.random() * 500, ease: "Quad.out", onComplete: () => { this.tweens.add({ targets: chunk, alpha: 0, y: chunk.y + 40, duration: 500, onComplete: () => chunk.destroy() }); } });
      }
      for (let i = 0; i < (big ? 16 : 4); i++) {
        const sm = this.add.circle(x + (Math.random() - 0.5) * (big ? 200 : 60), y + (Math.random() - 0.5) * 60, 14 + Math.random() * 16, 0x3f3f46, 0.8).setDepth(4299);
        this.tweens.add({ targets: sm, y: sm.y - 160 - Math.random() * 160, radius: 50 + Math.random() * 40, alpha: 0, duration: 2200 + Math.random() * 1500, onComplete: () => sm.destroy() });
      }
    };
    const spots = this.bombSpots(b);
    for (let i = 0; i < spots.length; i++) {
      boom(spots[i].x, spots[i].y, false);
      // that bomb's gone now
      for (const wb of this.wildernBombs.filter((q) => Math.hypot(q.x - spots[i].x, q.y - spots[i].y) < 30)) wb.objs.forEach((o) => o.destroy());
      await new Promise((r) => this.time.delayedCall(260, r));
    }
    for (let i = 0; i < 6; i++) {
      boom(b.x + (Math.random() - 0.5) * b.w * 0.8, b.y + (Math.random() - 0.5) * b.h * 0.6, false);
      await new Promise((r) => this.time.delayedCall(170, r));
    }
    cam.flash(700, 255, 240, 200);
    boom(b.x, b.y, true);
    // the school is gone
    s.flags.wildern_destroyed = true;
    this.wildernBombs.forEach((wb) => wb.objs.forEach((o) => o.destroy()));
    this.wildernBombs = [];
    const img = this.bImg.WILDERN;
    if (img && this.textures.exists("bld_WILDERN_RUIN")) {
      const bottom = b.y + b.h / 2;
      const src = this.textures.get("bld_WILDERN_RUIN").getSourceImage();
      img.setTexture("bld_WILDERN_RUIN").setPosition(b.x, bottom - src.height / 2);
      this.smoulder({ ...b, y: bottom - src.height / 2, w: src.width, h: src.height });
    } else img?.setTint(0x3f3f46);
    await new Promise((r) => this.time.delayedCall(1600, r));
    const title = this.add.text(480, 190, "WILDERN ACADEMY", { fontFamily: "Impact, sans-serif", fontSize: "54px", color: "#ffffff", stroke: "#000", strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(6000).setAlpha(0);
    const sub = this.add.text(480, 246, "DEMOLISHED", { fontFamily: "Impact, sans-serif", fontSize: "60px", color: "#ef4444", stroke: "#000", strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(6000).setScale(3).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 400 });
    this.tweens.add({ targets: sub, alpha: 1, scale: 1, delay: 500, duration: 350, ease: "Back.out", onComplete: () => cam.shake(250, 0.01) });
    // celebration: the Krelworld song, fireworks over the crater
    this.time.delayedCall(900, () => synth.music("crazy", true));
    const fw = this.time.addEvent({ delay: 380, repeat: 30, callback: () => {
      const fx = cam.worldView.x + 80 + Math.random() * 800;
      const fy = cam.worldView.y + 60 + Math.random() * 200;
      const col = [0xf472b6, 0xfde047, 0x67e8f9, 0x86efac, 0xc084fc][Math.floor(Math.random() * 5)];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const p = this.add.circle(fx, fy, 3, col).setDepth(5500).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: p, x: fx + Math.cos(a) * 80, y: fy + Math.sin(a) * 80 + 20, alpha: 0, duration: 800, onComplete: () => p.destroy() });
      }
    } });
    await new Promise((r) => this.time.delayedCall(2600, r));
    this.tweens.add({ targets: [title, sub], alpha: 0, duration: 500, onComplete: () => { title.destroy(); sub.destroy(); } });
    await this.talk([
      dir("When the dust settles, Wildern Academy is a smoking hole in the ground. Somewhere in the crater, a single jester-hat bell tinkles once, and is silent."),
      say("MIKEY", "YOU'VE DONE IT!!"),
      say("FLENKY", "You saved the kids from that fucking sicko!"),
      say("GRONNY", "Kids safe. School gone. Me never liked school anyway."),
      say("CRONGUS", "As Children's Minister: you saved the kids from that fucking sicko."),
      say("KREZWONK", "I foresaw an explosion. I did not foresee how good it would feel."),
      say("KREZMAR", "Somebody's going to have to pay for that. Not me. Put it on Drongus's tab."),
      say("SCROMBUS", "Right. The Tap's flowing, the sicko's dead and his school's a crater. Let's see what the news makes of it."),
      { s: "NARRATOR", t: "", tv: "krews_wildern" },
    ]);
    fw.remove();
    await this.crateDance();
    cam.pan(this.av.x, this.av.y, 900, Phaser.Math.Easing.Sine.InOut);
    await new Promise((r) => this.time.delayedCall(950, r));
    cam.startFollow(this.av, true, 0.12, 0.12);
    synth.music("hub");
    this.busy = false;
    G.emit("toast", { title: "WILDERN: GONE", text: "Report back to the Town Hall." });
    G.save();
  }

  /** "And now, some footage just in from the crater": the lads, dancing in perfect sync, 25 seconds, 140bpm. */
  private crateDance(): Promise<void> {
    const BEAT = 60000 / 140;
    const D = 25000;
    const s = G.s;
    this.busy = true;
    synth.music("techno_dance", true);
    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(7000);
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0b0220, 0x0b0220, 0x3b0a45, 0x3b0a45, 1).fillRect(0, 0, 960, 540);
    root.add(bg);
    // the crater, still smoking, as the dance floor
    if (this.textures.exists("bld_WILDERN_RUIN")) root.add(this.add.image(480, 430, "bld_WILDERN_RUIN").setScale(3.2).setAlpha(0.55));
    const floor = this.add.graphics();
    root.add(floor);
    const cols = [0xf472b6, 0x22d3ee, 0xfde047, 0xa78bfa, 0x4ade80];
    // spotlights sweeping
    const beams: Phaser.GameObjects.Triangle[] = [];
    for (let i = 0; i < 5; i++) {
      const b = this.add.triangle(120 + i * 180, -20, 0, 0, -90, 560, 90, 560, cols[i], 0.18).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD);
      root.add(b);
      beams.push(b);
      this.tweens.add({ targets: b, angle: { from: -25, to: 25 }, yoyo: true, repeat: -1, duration: BEAT * 4, ease: "Sine.inOut", delay: i * BEAT });
    }
    const ball = this.add.text(480, 34, "🪩", { fontSize: "54px" }).setOrigin(0.5);
    root.add(ball);
    this.tweens.add({ targets: ball, angle: 360, repeat: -1, duration: BEAT * 8 });
    // the lads, in a line
    const ids = (["FLENKY", "KREZMAR", "KREBLIS", "KREZWONK", "SCROMBUS", "KREBON", "CRONGUS", "GRONNY", "MIKEY"] as string[]).filter((id) => this.textures.exists(`spr_${id}`));
    const gap = Math.min(100, 880 / ids.length);
    const x0 = 480 - ((ids.length - 1) * gap) / 2;
    const lads = ids.map((id, i) => {
      const spr = this.add.sprite(x0 + i * gap, 400, `spr_${id}`, 0).setScale(3.2);
      root.add(spr);
      const tag = this.add.text(spr.x, 450, CHARACTERS[id]?.name ?? id, { fontFamily: FONT, fontSize: "10px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 3, y: 1 } }).setOrigin(0.5);
      root.add(tag);
      return spr;
    });
    const cap = this.add.text(480, 96, "LIVE FROM THE CRATER", { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#ffffff", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5);
    const live = this.add.text(20, 18, "● GB KREWS 24 · LIVE", { fontFamily: FONT, fontSize: "13px", color: "#ef4444", fontStyle: "bold", backgroundColor: "#000000aa", padding: { x: 6, y: 3 } });
    root.add([cap, live]);
    this.tweens.add({ targets: live, alpha: 0.4, yoyo: true, repeat: -1, duration: BEAT });
    // the routine: an 8-count, repeated, all in sync
    const meta = (k: string) => (this.textures.get(k).customData as any)?.char;
    const face = (spr: Phaser.GameObjects.Sprite, dir: string) => {
      const m = meta(spr.texture.key);
      if (m?.idle?.[dir] !== undefined) spr.setFrame(m.idle[dir]);
      else spr.setFlipX(dir === "west");
    };
    let beat = 0;
    const tick = () => {
      const b = beat++ % 16;
      // floor tiles flash on the beat
      floor.clear();
      for (let i = 0; i < 12; i++) floor.fillStyle(cols[(i + beat) % cols.length], 0.25).fillRect(i * 80, 470, 80, 70);
      lads.forEach((spr, i) => {
        const by = 400;
        if (b < 4) {
          // bounce
          this.tweens.add({ targets: spr, y: by - 18, duration: BEAT / 2, yoyo: true, ease: "Quad.out" });
          face(spr, "south");
        } else if (b < 8) {
          // step side to side, everyone facing the same way
          face(spr, b % 2 ? "east" : "west");
          this.tweens.add({ targets: spr, x: spr.x + (b % 2 ? 14 : -14), duration: BEAT / 2, yoyo: true });
        } else if (b < 10) {
          // jump!
          this.tweens.add({ targets: spr, y: by - 60, duration: BEAT / 2, yoyo: true, ease: "Quad.out" });
        } else if (b < 12) {
          // spin
          this.tweens.add({ targets: spr, angle: 360, duration: BEAT * 0.9, onComplete: () => spr.setAngle(0) });
        } else if (b < 14) {
          // the wave, left to right
          this.time.delayedCall(i * (BEAT / ids.length), () => this.tweens.add({ targets: spr, y: by - 30, duration: BEAT / 3, yoyo: true }));
        } else {
          // pose, then squat
          face(spr, "south");
          this.tweens.add({ targets: spr, y: by + 12, duration: BEAT / 2, yoyo: true, ease: "Quad.out" });
        }
      });
      if (b === 8 || b === 0) this.cameras.main.shake(120, 0.004);
      if (b % 4 === 0) {
        // confetti burst
        for (let i = 0; i < 24; i++) {
          const c = this.add.rectangle(Math.random() * 960, -10, 6, 10, cols[i % cols.length]);
          root.add(c);
          this.tweens.add({ targets: c, y: 560, x: c.x + (Math.random() - 0.5) * 160, angle: 540, duration: 1800 + Math.random() * 800, onComplete: () => c.destroy() });
        }
      }
    };
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 300 });
    const ev = this.time.addEvent({ delay: BEAT, loop: true, callback: tick });
    tick();
    return new Promise((res) => {
      this.time.delayedCall(D, () => {
        ev.remove();
        this.tweens.add({ targets: root, alpha: 0, duration: 700, onComplete: () => {
          root.destroy(true);
          synth.music("hub");
          this.busy = false;
          void s;
          res();
        } });
      });
    });
  }

  // ------------------------------------------------------------- Da Drongus Dungeon

  /** A storm over the top of town: dark cloud, purple glow, the odd fork of lightning. */
  private drawSky() {
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0x07020f, 0x07020f, 0x2a0f3d, 0x2a0f3d, 1).fillRect(0, -SKY_H, WORLD_W, SKY_H);
    for (let i = 0; i < 40; i++) g.fillStyle(0x1a0b2a, 0.7).fillEllipse(Math.random() * WORLD_W, -SKY_H + Math.random() * (SKY_H - 40), 160 + Math.random() * 220, 40 + Math.random() * 40);
    // the edge of the map fades into the dark
    g.fillGradientStyle(0x2a0f3d, 0x2a0f3d, 0x2a0f3d, 0x2a0f3d, 0.9, 0.9, 0, 0).fillRect(0, 0, WORLD_W, 40);
  }

  private lightning(x: number, yTop: number, yBot: number, depth = 4200) {
    const g = this.add.graphics().setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
    let px = x;
    let py = yTop;
    g.lineStyle(4, 0xc084fc, 1);
    g.beginPath();
    g.moveTo(px, py);
    while (py < yBot) {
      px += (Math.random() - 0.5) * 50;
      py += 20 + Math.random() * 30;
      g.lineTo(px, Math.min(py, yBot));
    }
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  /** The tower when it's up: a purple aura, lightning round the spire, and six crystal slots by the door. */
  private towerFx(b: Building, img: Phaser.GameObjects.Image) {
    const top = b.y - b.h / 2;
    this.neonGlow(b.x, b.y - b.h * 0.1, b.w * 0.6, 0x7c3aed);
    const eye = this.add.circle(b.x, top + b.h * 0.08, 10, 0xef4444, 0.5).setDepth(4100).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: eye, alpha: 0.1, scale: 1.8, yoyo: true, repeat: -1, duration: 1200 });
    this.time.addEvent({ delay: 3800, loop: true, callback: () => {
      if (Math.random() < 0.7) this.lightning(b.x + (Math.random() - 0.5) * 120, top - 200, top + 60 + Math.random() * 80);
      img.setTintFill(0xe9d5ff);
      this.time.delayedCall(60, () => img.clearTint());
    } });
    // the seal: six slots, lit for every crystal you've got
    const y = b.y + b.h / 2 - 96;
    CRYSTAL_BOSSES.forEach((boss, i) => {
      const x = b.x + (i - 2.5) * 22;
      const got = hasCrystal(G.s, boss);
      this.add.rectangle(x, y, 16, 20, 0x0b0612, 1).setStrokeStyle(1, 0x7c3aed).setDepth(b.y + b.h / 2 + 2);
      if (got && this.textures.exists("cum_crystal")) {
        const c = this.add.image(x, y, "cum_crystal").setScale(0.3).setDepth(b.y + b.h / 2 + 3);
        this.tweens.add({ targets: c, alpha: 0.6, yoyo: true, repeat: -1, duration: 700 + i * 90 });
        this.add.circle(x, y, 12, 0xfbcfe8, 0.25).setBlendMode(Phaser.BlendModes.ADD).setDepth(b.y + b.h / 2 + 3);
      }
    });
  }

  /** Chapter 1: Drongus mutes the chat, the ground splits, and his new home comes up out of it. */
  private async riseTower() {
    const s = G.s;
    const b = BUILDINGS.find((x) => x.id === "CITADEL")!;
    const cam = this.cameras.main;
    this.busy = true;
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    await this.talk([dir("The ground starts to shake. Car alarms. Dogs. A low, wet rumble from the top of town, like the world's biggest phone vibrating on a table.")]);
    this.busy = true;
    synth.stopMusic();
    cam.stopFollow();
    const bottom = b.y + b.h / 2;
    cam.pan(b.x, bottom - 250, 1600, Phaser.Math.Easing.Sine.InOut);
    await new Promise((r) => this.time.delayedCall(1700, r));
    // the ground cracks
    const crack = this.add.graphics().setDepth(bottom + 5);
    crack.lineStyle(5, 0x0b0612, 1);
    for (let i = 0; i < 7; i++) {
      crack.beginPath();
      crack.moveTo(b.x, bottom - 10);
      let cx = b.x;
      let cy = bottom - 10;
      for (let k = 0; k < 4; k++) crack.lineTo((cx += (Math.random() - 0.5) * 120), (cy += (Math.random() - 0.3) * 30));
      crack.strokePath();
    }
    synth.play("boom");
    cam.shake(5600, 0.012);
    cam.flash(300, 124, 58, 237);
    // up it comes: masked at the ground line so it rises out of the earth
    const key = this.buildingKey(b);
    const tower = this.add.image(b.x, b.y + b.h, key).setDepth(bottom - 1);
    const maskG = this.make.graphics({}, false);
    maskG.fillRect(b.x - b.w, bottom - b.h * 2, b.w * 2, b.h * 2);
    tower.setMask(maskG.createGeometryMask());
    this.tweens.add({ targets: tower, y: b.y, duration: 5200, ease: "Sine.out" });
    // rolling drawn dust clouds along the base as it rises
    if (hasVfx(this, "vfx_dust")) this.time.addEvent({ delay: 380, repeat: 13, callback: () => vfx(this, "vfx_dust", b.x + (Math.random() - 0.5) * b.w, bottom - 4, { scale: 1.8 + Math.random(), depth: bottom + 6, flipX: Math.random() < 0.5 }) });
    const dust = this.time.addEvent({ delay: hasVfx(this, "vfx_dust") ? 210 : 70, repeat: hasVfx(this, "vfx_dust") ? 25 : 75, callback: () => {
      const d = this.add.circle(b.x + (Math.random() - 0.5) * b.w * 1.1, bottom - 6, 10 + Math.random() * 14, Math.random() < 0.5 ? 0x6b5a4a : 0x3f3f46, 0.8).setDepth(bottom + 6);
      this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 160, y: d.y - 40 - Math.random() * 80, radius: 30, alpha: 0, duration: 1400, onComplete: () => d.destroy() });
      if (Math.random() < 0.35) {
        const rock = this.add.rectangle(b.x + (Math.random() - 0.5) * b.w, bottom - 10, 6, 6, 0x2a2433).setDepth(bottom + 7);
        this.tweens.add({ targets: rock, x: rock.x + (Math.random() - 0.5) * 300, y: rock.y - 120 - Math.random() * 100, angle: 360, duration: 500, yoyo: true, ease: "Quad.out", onComplete: () => rock.destroy() });
      }
    } });
    for (let i = 0; i < 6; i++) this.time.delayedCall(600 + i * 800, () => {
      this.lightning(b.x + (Math.random() - 0.5) * 200, bottom - b.h - 300, bottom - b.h * Math.random() * 0.6);
      synth.play("boom");
    });
    await new Promise((r) => this.time.delayedCall(5400, r));
    dust.remove();
    tower.clearMask(true);
    tower.destroy();
    s.flags.drongus_dungeon_risen = true;
    this.drawBuilding(b);
    this.interactables.push({ x: b.door!.x, y: b.door!.y + 10, r: 46, label: () => this.doorLabel(b), use: () => this.enterBuilding(b) });
    // the title
    synth.play("decree");
    cam.flash(500, 239, 68, 68);
    const title = this.add.text(480, 200, "DA DRONGUS DUNGEON", { fontFamily: "Impact, sans-serif", fontSize: "60px", color: "#ef4444", stroke: "#000", strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(6000).setScale(3).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 500, ease: "Back.out" });
    const sub = this.add.text(480, 258, "(population: one Drongus)", { fontFamily: FONT, fontSize: "16px", color: "#e9d5ff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(6000).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, delay: 600, duration: 400 });
    await new Promise((r) => this.time.delayedCall(2600, r));
    this.tweens.add({ targets: [title, sub], alpha: 0, duration: 500, onComplete: () => { title.destroy(); sub.destroy(); } });
    await this.talk([
      dir("Where there was an empty plot at the top of town, there is now a tower. It's the biggest thing in Krelford. It's black. It has spikes. It has, for some reason, chains on it. Its one window is an enormous glowing red eye, and the eye is looking at the group chat."),
      ping("DRONGUS", "Like it?"),
      ping("DRONGUS", "DA DRONGUS DUNGEON. I'm in it. The lore's in it. The leak's in it. Top floor."),
      ping("DRONGUS", "Door's sealed with six cum crystals. Don't ask how I made them. I've given one to each of my best boys."),
      ping("DRONGUS", "Good luck getting them back lmao. You lot can't even get a react back."),
      say("KREZWONK", "Six crystals. Six bosses. One at the end of every mission. I have foreseen it.", { role: true, proctus: "Six crystals! I foresaw that! I foresaw it about four seconds ago, but it counts." }),
      say("SCROMBUS", "So every time we put one of his lads down, we take his crystal. Get all six, we walk in the front door."),
      say("MIKEY", "Why are they called cum crystals"),
      say("SCROMBUS", "Don't, Mikey."),
      dir("NEW: CUM CRYSTALS 0/6. Every main boss carries one. Collect all six to open Da Drongus Dungeon."),
    ]);
    cam.pan(this.av.x, this.av.y, 900, Phaser.Math.Easing.Sine.InOut);
    await new Promise((r) => this.time.delayedCall(950, r));
    cam.startFollow(this.av, true, 0.12, 0.12);
    synth.music("hub");
    this.busy = false;
    G.save();
  }

  private nearBuilding(x: number, y: number, pad: number) {
    if (x > PLAYGROUND.x - pad && x < PLAYGROUND.x + PLAYGROUND.w + pad && y > PLAYGROUND.y - pad && y < PLAYGROUND.y + PLAYGROUND.h + pad) return true;
    return BUILDINGS.some((b) => x > b.x - b.w / 2 - pad && x < b.x + b.w / 2 + pad && y > b.y - b.h / 2 - pad && y < b.y + b.h / 2 + pad);
  }

  /** Building footprints follow the generated art; doors sit at the bottom centre. */
  /** Which picture a building uses (the Crobley factory burns down). */
  private buildingKey(b: Building) {
    if (b.id === "CROBLEY_FACTORY" && G.s.flags.crobley_factory_destroyed && this.textures.exists("bld_CROBLEY_FACTORY_RUIN")) return "bld_CROBLEY_FACTORY_RUIN";
    if (b.id === "WILDERN" && G.s.flags.wildern_destroyed && this.textures.exists("bld_WILDERN_RUIN")) return "bld_WILDERN_RUIN";
    return `bld_${b.id}`;
  }

  /** The wreck of Crobley Corp HQ keeps smouldering: smoke drifting up, embers winking. */
  private smoulder(b: Building) {
    const top = b.y - b.h * 0.1;
    if (hasVfx(this, "vfx_fire")) {
      // drawn flames licking the rubble and a few smoke columns
      const d = b.y + b.h / 2 + 2;
      for (let i = 0; i < 4; i++) vfx(this, "vfx_fire", b.x + (i - 1.5) * b.w * 0.2, b.y + b.h * 0.25 + (i % 2) * 10, { scale: 0.9 + (i % 2) * 0.4, depth: d, delay: i * 70 });
      for (let i = 0; i < 3; i++) vfx(this, "vfx_smokecol", b.x + (i - 1) * b.w * 0.25, top + 20, { scale: 1.6, depth: d + 1, alpha: 0.8, delay: i * 200 });
      return;
    }
    this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        const x = b.x + (Math.random() - 0.5) * b.w * 0.7;
        const y = top + Math.random() * b.h * 0.35;
        const puff = this.add.circle(x, y, 6 + Math.random() * 8, Math.random() < 0.5 ? 0x3f3f46 : 0x52525b, 0.55).setDepth(b.y + b.h / 2 + 2);
        this.tweens.add({ targets: puff, y: y - 120 - Math.random() * 80, x: x + 20 + Math.random() * 40, radius: 26 + Math.random() * 14, alpha: 0, duration: 3200 + Math.random() * 1600, onComplete: () => puff.destroy() });
      },
    });
    for (let i = 0; i < 12; i++) {
      const e = this.add.circle(b.x + (Math.random() - 0.5) * b.w * 0.7, b.y + (Math.random() - 0.2) * b.h * 0.5, 2, 0xff8a1f).setDepth(b.y + b.h / 2 + 1).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: e, alpha: 0.15, scale: 0.6, yoyo: true, repeat: -1, duration: 400 + Math.random() * 700, delay: Math.random() * 600 });
    }
  }

  private fitBuildingsToArt() {
    for (const b of BUILDINGS) {
      const key = this.buildingKey(b);
      if (!this.textures.exists(key)) continue;
      const src = this.textures.get(key).getSourceImage();
      const bottom = b.y + b.h / 2;
      b.w = src.width;
      b.h = src.height;
      b.y = bottom - b.h / 2;
      if (b.door) b.door = { x: b.x, y: bottom };
    }
  }

  /** Da Drongus Dungeon doesn't exist until it rises out of the ground in Chapter 1. */
  private towerUp() {
    return !!G.s.flags.drongus_dungeon_risen;
  }

  private drawBuilding(b: Building) {
    if (b.id === "CITADEL" && G.s.flags.citadel_fallen) return this.drawWreckHeap(b);
    if (b.id === "CITADEL" && !this.towerUp()) return;
    if (this.ruined && b.id !== "CITADEL") return this.drawRuinedBuilding(b);
    const key = this.buildingKey(b);
    if (this.hd && this.textures.exists(key)) {
      const img = this.add.image(b.x, b.y, key).setDepth(b.y + b.h / 2 - 1);
      // soft drop shadow on the ground
      this.add.ellipse(b.x + 10, b.y + b.h / 2 - 4, b.w * 0.95, 26, 0x1a1033, 0.35).setDepth(1);
      let name = b.name;
      if (b.id === "TOWN_HALL" && G.s.chapter === 1 && !G.s.flags.ch1_clear) name = "KRELFORD ____ HALL";
      if (b.id === "HOME") name = `${CHARACTERS[G.s.player].name}'S HOUSE`;
      if (b.id === "CROBLEY_FACTORY" && G.s.flags.crobley_factory_destroyed) name = "CROBLEY CORP HQ (SMOULDERING WRECK)";
      if (b.id === "WILDERN" && G.s.flags.wildern_destroyed) name = "WHERE WILDERN USED TO BE (SMOULDERING CRATER)";
      this.bImg[b.id] = img;
      this.add
        .text(b.x, b.y + b.h / 2 + 6, name, { fontFamily: FONT, fontSize: "11px", color: "#fff4cc", backgroundColor: "#1a1033cc", padding: { x: 5, y: 2 }, align: "center", wordWrap: { width: Math.max(160, b.w) } })
        .setOrigin(0.5, 0)
        .setDepth(b.y + b.h / 2 + 1);
      // the walkable line is the front wall: everything above it is roof and facade
      this.colliders.add(this.add.rectangle(b.x, b.y + b.h * 0.12, b.w * 0.86, b.h * 0.7, 0, 0));
      if (key === "bld_CROBLEY_FACTORY_RUIN" || key === "bld_WILDERN_RUIN") this.smoulder(b);
      else if (b.id === "CITADEL") this.towerFx(b, img);
      else this.neonGlow(b.x, b.y - b.h * 0.25, Math.max(60, b.w * 0.45));
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
    // the one who follows you round town wanting a shove: Mikey, or Polson if you ARE Mikey (not in Polson's chapters)
    const chaser = pursuerId(s);
    for (const id of [...LADS, "POLSON"]) {
      if (id === s.player || id === "MIKEY" || id === chaser) continue;
      if ((id === "POLSON" || id === "EDEN") && s.chapter < 3) continue;
      if (id === "KREBON" && s.flags.krebon_gone) continue;
      // from chapter 2 the others are out doing their own side stories
      this.addNpc(id, (s.chapter >= 2 && ARC_SPOTS[id]) || NPC_SPOTS[id]);
      // the bulk is permanent
      if (id === "POLSON" && s.flags.polson_fat) {
        const n = this.npcs[this.npcs.length - 1];
        const k = 1 + Math.min(60, s.flags.polson_fat as number) * 0.04;
        n.spr.setScale(n.spr.scaleX * k, n.spr.scaleY * (1 + (k - 1) * 0.2));
      }
    }
    // Mikey follows you everywhere asking to join the group (playing as Mikey: Polson does, wanting to come out)
    if (chaser) {
      const spot = NPC_SPOTS[chaser] ?? { x: 430, y: 980 };
      this.addNpc(chaser, { x: spot.x, y: spot.y });
      const m = this.npcs[this.npcs.length - 1];
      if (chaser === "POLSON" && s.flags.polson_fat) {
        const k = 1 + Math.min(60, s.flags.polson_fat as number) * 0.04;
        m.spr.setScale(m.spr.scaleX * k, m.spr.scaleY * (1 + (k - 1) * 0.2));
      }
      m.follower = { hits: 0, koUntil: 0, nextWhine: this.time.now + 4000, lastHit: 0 };
      const nm = chaser === "POLSON" ? "Polson" : "Mikey";
      const it = this.interactables.find((i) => (i as any).__npc === m);
      if (it) {
        it.label = () => (m.follower!.koUntil > this.time.now ? `${nm} is unconscious (talk to him anyway)` : `Shove ${nm}`);
        it.use = () => (m.follower!.koUntil > this.time.now ? this.talkTo(m) : this.hitMikey(m, false));
      }
    }
    // Proctus fills the player's spot
    this.addNpc("PROCTUS", NPC_SPOTS[s.player] ?? { x: 1300, y: 640 });
    // townsfolk (in Chapter 7: dazed, sooty survivors wandering the ruins)
    if (this.ruined) {
      const rnd = new Phaser.Math.RandomDataGenerator(["survivors"]);
      for (let i = 0, made = 0; made < 12 && i < 200; i++) {
        const x = rnd.between(200, WORLD_W - 200);
        const y = rnd.between(300, WORLD_H - 250);
        if (this.nearBuilding(x, y, 40)) continue;
        this.addNpc(`FOLK${made % 4}`, { x, y }, true);
        const n = this.npcs[this.npcs.length - 1];
        n.dazed = true;
        n.spr.setTint(0x8f8279);
        made++;
      }
    } else
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
      label: () => (this.ruined ? "Look into the crater" : G.s.chapter === 1 && !G.s.flags.ch1_clear ? "Inspect the Great Tap (dry)" : "Drink from the Great Tap"),
      use: () => (this.ruined ? void this.talk([dir("A crater. At the bottom, a bent pipe. A single pink drip forms on the end of it, thinks better of it, and goes back in.")]) : this.useTap()),
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
        this.bubble(n, n.id === "POLSON" ? "Yeeegh. I forgive you. Where we going? 😅" : "I forgive you. Can I join now?", 2600);
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
        const whines = n.id === "POLSON" ? POLSON_WHINES : MIKEY_WHINES;
        this.bubble(n, whines[Math.floor(Math.random() * whines.length)]);
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
      bump(G.s, n.id === "POLSON" ? "polson_kos" : "mikey_kos");
      this.bubble(n, "…(knocked out)…", 2200);
      G.emit("toast", { title: `${n.id}: KNOCKED OUT`, text: "Peace and quiet. For about 40 seconds." });
    } else {
      f.nextWhine = now + 1500;
      const hurt = n.id === "POLSON" ? POLSON_HURT : MIKEY_HURT;
      this.bubble(n, hurt[Math.floor(Math.random() * hurt.length)], 1600);
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
        const sp = (n.dazed ? 20 : n.folk ? 50 : 35) * (dt / 1000);
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
        if (n.dazed) this.bubble(n, SURVIVOR_BARKS[Math.floor(Math.random() * SURVIVOR_BARKS.length)]);
        else if (n.folk) this.bubble(n, FOLK_BARKS[Math.floor(Math.random() * FOLK_BARKS.length)]);
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

  // ------------------------------------------------------------- exploration

  /** Every door and gate in Krelford. First time through each one pays out. */
  private static PLACES = (): { id: string; name: string; x: number; y: number }[] => [
    ...BUILDINGS.filter((b) => b.door).map((b) => ({ id: b.id, name: b.name, x: b.door!.x, y: b.door!.y })),
    ...GATES.map((g) => ({ id: g.id, name: g.name, x: g.x, y: g.y })),
  ];

  /** Hidden stashes tucked into the corners of the map. */
  private static STASHES: { x: number; y: number; what: string }[] = [
    { x: 130, y: 130, what: "a carrier bag of Krezzcoin behind Boggor's bins (he knows)" },
    { x: 2480, y: 140, what: "a Bonky offering bowl nobody has emptied since 2019" },
    { x: 2490, y: 1190, what: "an envelope marked 'DEPOSIT (ROBBO)' — he owes you that anyway" },
    { x: 140, y: 820, what: "a fizzy bongo crate with money in it instead of bongos" },
    { x: 1780, y: 250, what: "the Archive's petty cash tin, labelled 'NOT PETTY'" },
    { x: 880, y: 260, what: "Drongus's old busking hat, still full" },
    { x: 2150, y: 1560, what: "a wallet. It's Polson's. It's always Polson's." },
    { x: 1300, y: 1760, what: "a sock full of 2p coins. It's warm. Don't think about it." },
  ];

  private newMarkers: Record<string, Phaser.GameObjects.Text> = {};

  private explorerProgress() {
    const f = G.s.flags;
    const places = HubScene.PLACES();
    const seen = places.filter((p) => f[`visited_${p.id}`]).length;
    const found = HubScene.STASHES.filter((_, i) => f[`stash_${i}`]).length;
    return { seen, places: places.length, found, stashes: HubScene.STASHES.length };
  }

  private setupExploration() {
    const f = G.s.flags;
    // somewhere you've never been gets a bouncing "NEW" over its door
    for (const p of HubScene.PLACES()) {
      if (f[`visited_${p.id}`]) continue;
      const t = this.add.text(p.x, p.y - 64, "★ NEW", { fontFamily: FONT, fontSize: "12px", color: "#ffd23f", backgroundColor: "#000000aa", padding: { x: 4, y: 2 }, fontStyle: "bold" }).setOrigin(0.5).setDepth(2000);
      this.tweens.add({ targets: t, y: t.y - 8, yoyo: true, repeat: -1, duration: 600, ease: "Sine.inOut" });
      this.newMarkers[p.id] = t;
    }
    // stashes glint faintly; you only notice them when you're nearby
    HubScene.STASHES.forEach((st, i) => {
      if (f[`stash_${i}`]) return;
      const glint = this.add.star(st.x, st.y, 4, 4, 10, 0xfff3b0, 0.85).setDepth(st.y + 2);
      this.tweens.add({ targets: glint, angle: 90, scale: 1.4, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });
      this.interactables.push({
        x: st.x,
        y: st.y,
        r: 50,
        label: () => "Rummage",
        enabled: () => !G.s.flags[`stash_${i}`],
        use: () => {
          if (G.s.flags[`stash_${i}`]) return;
          G.s.flags[`stash_${i}`] = true;
          glint.destroy();
          const coins = 60;
          G.s.coins += coins;
          synth.play("coin");
          const pr = this.explorerProgress();
          G.emit("toast", { title: `HIDDEN STASH ${pr.found}/${pr.stashes}`, text: `You found ${st.what}. +${coins} Krezzcoin.` });
          this.checkExplorer();
          G.save();
        },
      });
    });
  }

  private discover(id: string, name: string) {
    const f = G.s.flags;
    if (f[`visited_${id}`]) return;
    f[`visited_${id}`] = true;
    this.newMarkers[id]?.destroy();
    delete this.newMarkers[id];
    const coins = 30;
    G.s.coins += coins;
    const pr = this.explorerProgress();
    G.emit("toast", { title: `NEW PLACE DISCOVERED (${pr.seen}/${pr.places})`, text: `${name}. +${coins} Krezzcoin for having a look.${pr.seen === 3 ? " Places you haven't been yet have ★ NEW over the door. There are hidden stashes around the edges of town too." : ""}` });
    this.checkExplorer();
    G.save();
  }

  private checkExplorer() {
    const f = G.s.flags;
    const pr = this.explorerProgress();
    if (f.explorer_done || pr.seen < pr.places || pr.found < pr.stashes) return;
    f.explorer_done = true;
    G.s.coins += 500;
    G.s.upgrades.pk_spd = (G.s.upgrades.pk_spd ?? 0) + 1;
    this.time.delayedCall(1500, () => G.emit("toast", { title: "KRELFORD EXPLORER", text: "Every door, every gate, every stash. +500 Krezzcoin and a free speed perk. Drongus has been told. Drongus has not reacted." }));
  }

  // ------------------------------------------------------------- interactions

  private setupInteractables() {
    for (const b of BUILDINGS) {
      if (!b.door || (b.id === "CITADEL" && (!this.towerUp() || G.s.flags.citadel_fallen))) continue;
      this.interactables.push({ x: b.door.x, y: b.door.y + 10, r: 46, label: () => this.doorLabel(b), use: () => this.enterBuilding(b) });
    }
    this.setupBombs();
    this.setupSqueezers();
    for (const gt of GATES) {
      this.interactables.push({ x: gt.x, y: gt.y, r: 60, label: () => this.doorLabel({ id: gt.id, name: gt.name } as Building), use: () => this.enterBuilding({ id: gt.id, name: gt.name } as Building) });
    }
    this.interactables.push({ x: 1450, y: 780, r: 60, label: () => "Watch KrelTV", use: () => this.openTV() });
    this.spawnCollectibles();
    this.spawnBrawl();
    if (G.s.chapter >= 7 && G.s.flags.krelworld_bombed) this.ruinTown();
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
          await this.talk([dir(`${spot.label}. You file it under Strange Occurrences.`), say("KREBLIS", "Fascinating…"), say("KREBLIS", "History will judge it 👍")]);
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
    // Chapter 7: a scorched patch with the climbing frame in bits (and, thankfully, nobody on it)
    if (this.ruined) {
      if (this.textures.exists("tile_rubber")) this.add.tileSprite(P.x, P.y, P.w, P.h, "tile_rubber").setOrigin(0).setDepth(1).setTint(0x3a302a);
      for (const [, x, y] of PLAY_EQUIP) this.ruinProp("r_girders", x, y + 10, 1.4);
      this.pgSign = this.add.text(P.cx, P.y - 34, "", { fontFamily: FONT, fontSize: "15px", color: "#ffffff" }).setOrigin(0.5, 1).setDepth(6000).setVisible(false);
      return;
    }
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
    if (b.id === "WILDERN" && s.flags.wildern_destroyed) return "The smouldering crater where Wildern used to be";
    if (b.id === "WILDERN" && s.chapter === 1 && s.flags.ch1_clear) return "Wildern Academy: plant the bombs around it";
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
        return s.chapter === 5 && !s.flags.ch5_clear && dungeonOpen().open ? "The Krezz Arms: ★ rub SanMik's magic lamp (back room)" : "Enter The Krezz Arms";
      case "BANK":
        return "Enter the Central Bank (upgrades)";
      case "HOME":
        return "Go home (sleep · save · TV)";
      case "BAN_TRIBUNAL":
        return s.flags.ban_tribunal_open ? "Enter the Ban Tribunal" : "Ban Tribunal (closed until the Cronster briefing)";
      case "BOOTH":
        return s.player === "MIKEY" ? "The Booth (nobody to bully today)" : "The Booth (Bully Mikey · vent your frustration)";
      case "CROBLEY_FACTORY":
        return s.flags.crobley_factory_destroyed ? "The smouldering wreck of Crobley Corp HQ" : "Crobley Corp HQ";
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
        return "Krelford International";
      case "CITADEL":
        return `DA DRONGUS DUNGEON (sealed: ${crystalCount(s)}/${CRYSTALS_NEEDED} cum crystals)`;
      case "POLSON_ROAD":
        return s.flags.ch3_clear && POLSON_CHATS.length ? "Polson Towers (pop round for a chat)" : `${b.name} (not this chapter)`;
      case "WILDERN":
      case "MINISTRY":
        return `${b.name} (not this chapter)`;
    }
    return b.name;
  }

  /** The bridge west to Kreddle: neon rails, flashing arrow. */
  private drawKreddleBridge(x: number, y: number, name: string) {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x3f3f46, 1).fillRect(0, y - 45, 110, 90);
    for (let bx = 0; bx < 110; bx += 16) g.fillStyle(0x52525b, 1).fillRect(bx, y - 45, 12, 90);
    g.lineStyle(4, 0xff4fd8, 0.9).lineBetween(0, y - 47, 110, y - 47).lineBetween(0, y + 47, 110, y + 47);
    const sign = this.add.text(x + 20, y - 62, name, { fontFamily: FONT, fontSize: "12px", color: "#ff4fd8", backgroundColor: "#12001fcc", padding: { x: 5, y: 3 }, fontStyle: "bold" }).setOrigin(0.15, 1).setDepth(y + 40);
    this.tweens.add({ targets: sign, alpha: 0.55, yoyo: true, repeat: -1, duration: 500 });
    const glow = this.add.ellipse(55, y, 140, 110, 0xff4fd8, 0.12).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.03, yoyo: true, repeat: -1, duration: 900 });
  }

  private async enterBuilding(b: Building) {
    const s = G.s;
    if (b.id === "KREDDLE_BRIDGE") {
      // Chapter 6: the raid (and, if you go back over after planting the bomb, the run home starts at the palace)
      if (s.chapter === 6 && s.flags.raid_march && !s.flags.krunch_started) {
        this.go("Kreddle", { raid: true });
        return;
      }
      if (!s.flags.met_emergency) {
        await this.talk([dir("The bridge to Kreddle. A neon sign on the far side flashes 'OPEN 24/7/365/FOREVER'. You've got more pressing things to do first.")]);
        return;
      }
      this.go("Kreddle", {});
      return;
    }
    // after Chapter 3, Polson Towers is open for a chat (straight out of the real Messenger logs)
    if (b.id === "POLSON_ROAD" && s.flags.ch3_clear && POLSON_CHATS.length && chapterDef(s.chapter).dungeonDoor !== "POLSON_ROAD") {
      this.go("PolsonHome", {});
      return;
    }
    if (b.id === "TOWN_HALL" && s.chapter === 6 && (await this.chapter6TownHall())) return;
    const ch = chapterDef(s.chapter);
    // Chapter 5: the lamp in the Krezz Arms back room is the way into the SanMikverse
    if (b.id === "PUB" && s.chapter === 5 && !s.flags.ch5_clear && dungeonOpen().open && !this.buildingBusy("PUB")) {
      if (!s.flags.sanmik_lamp_seen) {
        s.flags.sanmik_lamp_seen = true;
        G.save();
        this.go("Vignette", { id: "sanmik_lampe", returnAt: "PUB" });
        return;
      }
      s.flags.rub_lamp = false;
      await this.talk([
        dir("The Krezz Arms. In the back room, SanMik's magic lamp is on the bar, still glowing. It smells of corn.", { variants: { MIKEY: "The Krezz Arms. In the back room, your magic lamp is on the bar, still glowing. It smells of corn." } }),
        { s: "NARRATOR", t: "Rub it?", dir: true, choice: [{ label: "Rub the lamp (into the SanMikverse)", set: { rub_lamp: true } }, { label: "Just go to the pub", set: { rub_lamp: false } }] },
      ]);
      if (s.flags.rub_lamp) {
        this.go("Dungeon", { dungeon: "arena_sanmik", room: 0 });
        return;
      }
    }
    if (b.id === "WILDERN" && (s.flags.wildern_destroyed || (s.chapter === 1 && s.flags.ch1_clear))) {
      await this.talk([dir(s.flags.wildern_destroyed ? "A smoking crater. Bits of desk. A gold star, fluttering. Somewhere underneath it all, a bell tinkles." : "The doors are chained shut. Mikey's bombs need planting round the outside: look for the red circles.", s.flags.wildern_destroyed ? {} : { variants: { MIKEY: "The doors are chained shut. Your bombs need planting round the outside: look for the red circles." } })]);
      return;
    }
    // a locked dungeon door doesn't sound like it opened
    synth.play(b.id === ch.dungeonDoor && !dungeonOpen().open ? "tap_fail" : "door");
    if (!(b.id === ch.dungeonDoor && !dungeonOpen().open)) this.discover(b.id, b.name);
    // a side-quest step waiting at the dungeon building goes first
    if (b.id === ch.dungeonDoor && !(arcStepAt(s, b.id) && !this.buildingBusy(b.id))) {
      const o = dungeonOpen();
      if (!o.open) {
        G.emit("toast", { title: "LOCKED", text: o.why ?? "Not yet." });
        return;
      }
      // Da Drongus Dungeon: the lads go in first. You're last.
      if (b.id === "CITADEL" && s.chapter >= 7 && !s.flags.citadel_lads_in) {
        await this.ladsGoIn(b);
        return;
      }
      this.go("Dungeon", { dungeon: ch.dungeon, room: 0 });
      return;
    }
    if (!this.buildingBusy(b.id) && (await this.runArcStep(b.id))) return;
    switch (b.id) {
      case "CITADEL": {
        const n = crystalCount(s);
        await this.talk([
          dir(`DA DRONGUS DUNGEON. The door is a slab of black glass with six crystal-shaped slots in it. ${n ? `${n} of them glow${n === 1 ? "s" : ""}.` : "All six are dark."}`),
          dir(n >= CRYSTALS_NEEDED ? "Every slot is full. The door hums. It's waiting for the right chapter." : `A brass plaque: 'NO ENTRY WITHOUT ${CRYSTALS_NEEDED} CUM CRYSTALS. NO EXCEPTIONS. NOT EVEN FOR THE DRONGI.' Every main boss carries one.`),
        ]);
        return;
      }
      case "BOOTH":
        await this.talk(
          s.player === "MIKEY"
            ? [dir("The Booth. There's a heavy bag in here shaped like you. You leave it be. You've had enough of that for one lifetime.")]
            : [dir("The Booth. Mikey is hanging from the ceiling in a punching-bag harness. He has brought his own harness."), say("MIKEY", "Mikey here. Go on then. Get it out of your system.")],
        );
        // playing as Mikey there's no bullying Mikey
        if (s.player === "MIKEY") return;
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
        if (s.chapter === 4 && s.flags.crobley_briefed && !s.flags.vig_crobley_presser) {
          await this.talk([dir("The Constabulary briefing room is packed. Every journalist in Krelford is here. Most of them are wearing stab vests. They've met Swig before.")]);
          this.go("Vignette", { id: "crobley_presser", returnAt: "POLICE" });
          return;
        }
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
        await this.talk(
          s.flags.kreltower_fell
            ? [dir("Krelford International. Every flight is cancelled. The departures board just says 'NO'. Under it, a laminated sign: 'PLEASE DO NOT HIJACK THE PLANES TO CRASH INTO TRAINS. THIS HAS NEVER WORKED.'")]
            : s.flags.kreltower_saved
              ? [dir("Krelford International. There's a new statue in departures of you pulling a plane out of the sky. It is anatomically generous.")]
              : [dir("Krelford International. Flights to Kreddle, Krezteua d'If and 'Fragmar Prime (Seasonal)'. Security is one man reacting to his phone.")],
        );
        return;
      }
      case "TOWN_HALL": {
        const a = townHallAction();
        if (a.kind === "meeting") {
          const next = a.id === "lore_appreciation_inquiry" ? AFTER_PROLOGUE : a.id === "krazy_fact_emergency" ? { scene: "Hub", data: { at: "TOWN_HALL", advance: true } } : { scene: "Hub", data: { at: "TOWN_HALL", chain: true } };
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
        if (a.kind === "meeting" && a.id === "founding_cabinet") {
          // first visit: the Archive offers a trip down memory lane, which you can skip
          delete s.flags.founding_pick;
          await this.talk([
            say("ARCHIVE", "Welcome to the Krelworld Historical Archive."),
            say("ARCHIVE", "The Archive will replay formative moments of group chat bliss… back from the good old days…"),
            say("ARCHIVE", "…before the current era of 'bad old days'."),
            { s: "ARCHIVE", t: "Would you like to see THE FOUNDING?", choice: [{ label: "Yes. Play the founding.", set: { founding_pick: 1 } }, { label: "No. Skip it.", set: { founding_pick: 0 } }] },
          ]);
          if (s.flags.founding_pick) {
            this.go("Meeting", { id: a.id, next: { scene: "Hub", data: { at: "ARCHIVE" } } });
            return;
          }
          // skipped: it still counts (the cabinet still gets founded), and it stays in the Archive to watch later
          const m = MEETINGS[a.id];
          Object.assign(s.flags, m?.onComplete ?? {});
          for (const id of m?.unlocksArchive ?? []) G.unlockArchive(id);
          G.save();
          await this.talk([say("ARCHIVE", "Very well. The founding has been filed. You can replay it any time from the Archive."), dir("Ministerial side quests are now available from cabinet members around Krelford.")]);
          return;
        }
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
        // Chapter 4: the telly's already on, and it's the Crobley story
        if (s.chapter === 4 && !s.flags.vig_crobley_news) {
          await this.talk([dir("You get in, put the telly on. Every channel is showing the same thing.")]);
          this.go("Vignette", { id: "crobley_news", returnAt: "HOME" });
          return;
        }
        this.go("Home", {});
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
      case "CROBLEY_FACTORY":
        if (s.flags.crobley_factory_destroyed) {
          await this.talk([dir("Crobley Corp HQ is gone. Not burned down: gone. A blackened footprint, a few knee-high stumps of wall, and a lot of very hot ash. The giant fibreglass Crobley head from the roof lies on its side in the rubble, still grinning. It still smells of candy and sausage. A single Crobley lies in the ash by where the gate was, nibbled."), say(s.player, "Very sad. Very unfortunate.")]);
          return;
        }
        await this.talk([dir("The gates of the Crobley Factory. Pink chimneys. Purple smoke. A giant fibreglass Crobley on the roof, grinning. Over the gate, a new sign: 'YOU HEARD WHAT YOU THOUGHT YOU HEARD'."), dir("The gates are locked. Not yet.")]);
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
    this.spawnBrawl();
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
        if (k.pay) {
          s.coins += k.pay.coins;
          synth.play("coin");
          G.emit("toast", { title: k.pay.title, text: k.pay.text });
        }
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
        if (k.drugs) {
          this.busy = true;
          await takeDrugs(this);
          tripInto(this, () => switchTo(this, "Dungeon", { dungeon: k.dungeon, room: 0 }));
          return true;
        }
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
          await this.talk([say(n.id, `${mq.title}: done. The ministry is grateful. Mildly. Here's your Krezzcoin.`)]);
          G.emit("toast", { title: "MINISTRY QUEST", text: `${mq.title}: +${coins} Krezzcoin` });
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
    lines.push(dir(s.flags.tap_rush ? "You top up from the national drink. Still buzzing. Health restored, bottles refilled." : "You drink deeply from the national drink. Warm. Pink-ish. Your whole body tingles. Health restored, bottles refilled."));
    if (!s.flags.tap_rush) lines.push(dir("💦 TAP RUSH! +50% max HP and +25% damage for your next outing. It wears off when you get back to town."));
    await this.talk(lines);
    s.flags.tap_rush = true;
    s.flags.tap_rush_out = false;
    s.hp = maxHp(s);
    this.tapSplash();
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

  private async talk(lines: Line[], live = false) {
    if (!lines.length) return;
    this.busy = true;
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    await runDialogue(this, lines, false, live);
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
      // near the top of the map the view lifts so Da Drongus Dungeon's spire isn't cut off
      const lift = this.towerUp() ? Phaser.Math.Clamp((620 - this.av.y) * 0.75, 0, 230) : 0;
      leadCamera(this.cameras.main, body.velocity.x, body.velocity.y, dt, 0.18, 48, lift);
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
    if (this.brawl?.running && this.controls.attackHeld()) this.playerShove(time);
    this.updateRaidMarch(time);
    this.updateFinale(time);
    if (!this.busy && !this.brawl?.running && this.controls.attackHeld()) {
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
    if (best && !this.busy && !this.cutscene) {
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
    const target = this.finaleLogs ?? this.beatup?.target() ?? (st?.target ? this.targetPos(st.target) : null) ?? (this.brawl && !this.brawl.running ? this.brawl.spot : null);
    if (target && !this.busy) {
      const d = Phaser.Math.Distance.Between(this.av.x, this.av.y, target.x, target.y);
      if (d > 120) {
        const a = Math.atan2(target.y - this.av.y, target.x - this.av.x);
        this.arrow.setVisible(true).setPosition(this.av.x + Math.cos(a) * 60, this.av.y + Math.sin(a) * 60).setRotation(a);
      } else this.arrow.setVisible(false);
    } else this.arrow.setVisible(false);
  }

  /** Walk a sprite somewhere over `ms`, with its walk cycle. */
  private walkSpr(spr: Phaser.GameObjects.Sprite, x: number, y: number, ms: number) {
    return new Promise<void>((res) => {
      let px = spr.x;
      let py = spr.y;
      this.tweens.add({
        targets: spr,
        x,
        y,
        duration: ms,
        onUpdate: () => {
          animateWalker(spr, spr.x - px, spr.y - py, true, this.time.now);
          px = spr.x;
          py = spr.y;
          spr.setDepth(spr.y);
        },
        onComplete: () => {
          animateWalker(spr, 0, 0, false, this.time.now);
          res();
        },
      });
    });
  }

  /** The Kreddle Krunchers march over the bridge, insult everyone, and piss in the Great Tap. Then off to find Mikey. */
  private async krunchersInvade(arc: Arc, step: ArcStep) {
    const s = G.s;
    const cam = this.cameras.main;
    this.busy = true;
    this.cutscene = true;
    this.prompt.setVisible(false);
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    synth.music("klerble", true);
    cam.stopFollow();
    cam.pan(330, 825, 1400, Phaser.Math.Easing.Sine.InOut);
    await new Promise((r) => this.time.delayedCall(1450, r));
    const ks = KR.KRUNCHERS.filter((kr) => this.textures.exists(`spr_${kr.of}`)).map((kr, i) => {
      const sp = this.add.sprite(-30 - i * 40, 800 + (i % 3) * 22, `spr_${kr.of}`, 0).setScale(2).setTint(i % 2 ? 0xff9de6 : 0x9be7ff);
      sp.setDepth(sp.y);
      return sp;
    });
    const name = (of: string) => ks[KR.KRUNCHERS.findIndex((k) => k.of === of)];
    synth.play("crowd_boo");
    await Promise.all(ks.map((sp, i) => this.walkSpr(sp, 200 + (i % 5) * 52, 790 + Math.floor(i / 5) * 52 + (i % 2) * 8, 2200 + i * 60)));
    const tag = this.add.text(300, 700, "THE KREDDLE KRUNCHERS", { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#ff4fd8", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(6000);
    await this.talk(KR.KR_ARRIVE);
    tag.destroy();
    ks.forEach((sp, i) => this.time.delayedCall(i * 90, () => this.floatShout(sp, ["LAME!", "STINKERS!", "NERDS!", "KRUNCH!"][i % 4], "#ffd1f3")));
    await new Promise((r) => this.time.delayedCall(900, r));
    // through town to the Great Tap
    const T = HubScene.TAP;
    cam.pan(T.x, T.y + 40, 3600, Phaser.Math.Easing.Sine.InOut);
    await Promise.all(ks.map((sp, i) => this.walkSpr(sp, T.x - 150 + (i % 5) * 60, T.y + 95 + Math.floor(i / 5) * 45, 3600 + i * 50)));
    await this.talk(KR.KR_TAP);
    const bon = name("KREBON") ?? ks[0];
    await this.walkSpr(bon, T.x + 70, T.y + 40, 900);
    bon.setFrame(charMeta(this, bon.texture.key)?.idle.west ?? 0);
    // the stream: a wobbling yellow arc from Kredbon into the basin, with splashes where it lands
    const sx = bon.x - 8;
    const sy = bon.y + 4;
    const tx = T.x + 14;
    const ty = T.basinY - 2;
    const arcG = this.add.graphics().setDepth(7000);
    const pee = this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        const w = Math.sin(this.time.now / 70) * 3;
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(sx, sy), new Phaser.Math.Vector2((sx + tx) / 2, Math.min(sy, ty) - 30 + w), new Phaser.Math.Vector2(tx + w * 0.5, ty));
        arcG.clear();
        arcG.lineStyle(5, 0xc9a800, 0.9);
        curve.draw(arcG, 24);
        arcG.lineStyle(3, 0xffe14a, 1);
        curve.draw(arcG, 24);
        if (Math.random() < 0.5) {
          const d = this.add.circle(tx + (Math.random() - 0.5) * 10, ty, 2.5, 0xffe14a, 1).setDepth(7001);
          this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 24, y: ty - 8 - Math.random() * 10, alpha: 0, duration: 350, onComplete: () => d.destroy() });
        }
      },
    });
    const tint = this.add.ellipse(T.x, T.basinY, 30, 10, 0xf7e04a, 0.0).setDepth(6999);
    this.tweens.add({ targets: tint, alpha: 0.45, scaleX: 3.4, scaleY: 2.2, duration: 5000 });
    synth.play("slurp");
    // a live dialogue, so the stream keeps flowing while he talks
    await this.talk(KR.KR_PISS, true);
    this.busy = true;
    pee.remove();
    arcG.destroy();
    // off to find a Krelworlder
    ks.forEach((sp, i) => void this.walkSpr(sp, T.x + 700 + i * 30, T.y + 140 + (i % 3) * 20, 3000).then(() => sp.destroy()));
    await new Promise((r) => this.time.delayedCall(1500, r));
    completeStep(s, arc, step);
    s.flags.kr_home_pending = true;
    G.save();
    this.go("Vignette", { id: "kruncher_mikey" });
  }

  // ---------------------------------------------------------------- CHAPTER 7: Krelford after the Krunch Protocol

  /** Every building scorched, fires still burning, smoke, embers on the wind. */
  private ruinTown() {
    // fires everywhere, smoke columns over the worst of it
    const rnd = new Phaser.Math.RandomDataGenerator(["krunch"]);
    // the morning after the finale: mostly burnt out, just smouldering
    const dawn = !!G.s.flags.finale_dawn;
    for (let i = 0; i < 70; i++) {
      const x = rnd.between(60, WORLD_W - 60);
      const y = rnd.between(120, WORLD_H - 140);
      if (!dawn || i % 4 === 0) vfx(this, "vfx_fire", x, y, { scale: (1 + rnd.frac() * 1.6) * (dawn ? 0.6 : 1), depth: y + 10, delay: rnd.between(0, 900) });
      if (i % 5 === 0) vfx(this, "vfx_smokecol", x, y - 30, { scale: 1.6 + rnd.frac(), depth: y + 9, alpha: 0.75 });
    }
    for (const b of BUILDINGS) {
      if (b.id === "CITADEL") continue;
      for (let i = 0; i < (dawn ? 1 : 3); i++) vfx(this, "vfx_fire", b.x + (Math.random() - 0.5) * b.w * 0.8, b.y + (Math.random() - 0.1) * b.h * 0.5, { scale: 1.6 + Math.random() * 1.2, depth: b.y + b.h / 2 + 6, delay: Math.random() * 600 });
      vfx(this, "vfx_smokecol", b.x, b.y - b.h * 0.1, { scale: 2.2, depth: b.y + b.h / 2 + 5, alpha: 0.8 });
    }
    // ash falling
    this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        const cam = this.cameras.main.worldView;
        const a = this.add.rectangle(cam.x + Math.random() * cam.width, cam.y - 10, 2, 2, 0xb8b2aa, 0.8).setDepth(4979);
        this.tweens.add({ targets: a, x: a.x + 60 + Math.random() * 80, y: a.y + cam.height + 20, angle: 360, duration: 5000 + Math.random() * 3000, onComplete: () => a.destroy() });
      },
    });
    // embers drifting across the screen
    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        const cam = this.cameras.main.worldView;
        const e = this.add.circle(cam.x + Math.random() * cam.width, cam.y + cam.height + 10, 1.5 + Math.random() * 2, Math.random() < 0.5 ? 0xff9a3a : 0xffd27a, 0.9).setDepth(4980).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: e, x: e.x + 80 + Math.random() * 120, y: e.y - 300 - Math.random() * 200, alpha: 0, duration: 3000 + Math.random() * 2000, onComplete: () => e.destroy() });
      },
    });
    // daylight, at last
    if (dawn) this.add.rectangle(480, 270, 960, 540, 0xdcecff, 1).setAlpha(0.16).setScrollFactor(0).setDepth(4904).setBlendMode(Phaser.BlendModes.ADD);
    // the glow of the fires over everything
    if (!dawn) this.add.rectangle(480, 270, 960, 540, 0xff6a2a, 1).setAlpha(0.07).setScrollFactor(0).setDepth(4904).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** A debris prop from the ruins sheet; false if the art isn't there. */
  private ruinProp(key: string, x: number, y: number, scale = 1, tint?: number) {
    if (!this.textures.exists(key)) return false;
    const img = this.add.image(x, y, key).setOrigin(0.5, 0.85).setScale(scale).setDepth(y);
    if (tint !== undefined) img.setTint(tint);
    return true;
  }

  /** Singed ground: scorch marks, ash drifts and craters all over the grass. */
  private scorchGround() {
    const rnd = new Phaser.Math.RandomDataGenerator(["scorch"]);
    const g = this.add.graphics().setDepth(1);
    for (let i = 0; i < 260; i++) {
      const x = rnd.between(0, WORLD_W);
      const y = rnd.between(0, WORLD_H);
      const w = rnd.between(40, 180);
      g.fillStyle(rnd.frac() < 0.6 ? 0x14100d : 0x8f8a84, rnd.frac() < 0.6 ? 0.55 : 0.28);
      g.fillEllipse(x, y, w, w * (0.4 + rnd.frac() * 0.3));
    }
    for (let i = 0; i < 40; i++) {
      const x = rnd.between(80, WORLD_W - 80);
      const y = rnd.between(120, WORLD_H - 120);
      if (this.nearBuilding(x, y, 30)) continue;
      if (!this.ruinProp(rnd.frac() < 0.5 ? "r_scorch" : "r_crater", x, y, 1.6 + rnd.frac())) g.fillStyle(0x0b0806, 0.7).fillEllipse(x, y, 70, 30);
    }
  }

  /** A building, reduced to a heap: rubble, timbers, girders and a bit of wall, still burning. */
  private drawRuinedBuilding(b: Building) {
    const rnd = new Phaser.Math.RandomDataGenerator([b.id]);
    const keys = ["r_rubble", "r_ruin", "r_girders", "r_wall", "r_fireheap", "r_rubble", "r_debris"];
    const n = Math.max(3, Math.round(b.w / 70));
    for (let i = 0; i < n; i++) {
      const x = b.x - b.w / 2 + (b.w * (i + 0.5)) / n + rnd.between(-14, 14);
      const y = b.y + b.h * 0.18 + rnd.between(-26, 26);
      if (!this.ruinProp(keys[(i + rnd.between(0, 6)) % keys.length], x, y, 1.6 + rnd.frac() * 0.8)) this.add.ellipse(x, y, 70, 36, 0x3a2f2a).setDepth(y);
    }
    this.add.ellipse(b.x, b.y + b.h * 0.2, b.w * 1.05, b.h * 0.6, 0x0d0a08, 0.45).setDepth(1);
    let name = b.id === "HOME" ? `${CHARACTERS[G.s.player].name}'S HOUSE` : b.name;
    name = `${name} (RUBBLE)`;
    this.add
      .text(b.x, b.y + b.h / 2 + 6, name, { fontFamily: FONT, fontSize: "11px", color: "#ffb4a0", backgroundColor: "#1a1033cc", padding: { x: 5, y: 2 }, align: "center", wordWrap: { width: Math.max(160, b.w) } })
      .setOrigin(0.5, 0)
      .setDepth(b.y + b.h / 2 + 1);
    this.colliders.add(this.add.rectangle(b.x, b.y + b.h * 0.12, b.w * 0.8, b.h * 0.6, 0, 0));
  }

  /** No lawns, no plants, no parked cars: wrecks, debris and ash. */
  private ruinStreets() {
    const rnd = new Phaser.Math.RandomDataGenerator(["wreck"]);
    for (let x = 260; x < WORLD_W - 200; x += 300) {
      if (Math.abs(x - 1280) < 200) continue;
      this.ruinProp("r_carwreck", x + rnd.between(-40, 40), rnd.frac() < 0.5 ? 810 : 870, 1.7);
    }
    // the ones who didn't get up
    const dead = ["c6_skeleton", "kd_charred", "c6_skeleton", "c6_ashpile", "kd_charred", "c6_skeleton"];
    for (let i = 0; i < 55; i++) {
      const x = rnd.between(80, WORLD_W - 80);
      const y = rnd.between(160, WORLD_H - 140);
      if (GATES.some((g) => Math.hypot(g.x - x, g.y - y) < 70)) continue;
      const key = dead[i % dead.length];
      if (this.textures.exists(key)) this.add.image(x, y, key).setOrigin(0.5, 0.7).setScale(1.1 + rnd.frac() * 0.4).setAngle(rnd.between(-30, 30)).setFlipX(rnd.frac() < 0.5).setDepth(y - 6);
    }
    const scatter = ["r_debris", "r_ash", "r_bench", "r_busstop", "r_lamp", "r_debris", "r_ash", "r_fireheap", "r_wall"];
    for (let i = 0; i < 90; i++) {
      const x = rnd.between(80, WORLD_W - 80);
      const y = rnd.between(140, WORLD_H - 140);
      if (this.nearBuilding(x, y, 40) || GATES.some((g) => Math.hypot(g.x - x, g.y - y) < 80)) continue;
      this.ruinProp(scatter[i % scatter.length], x, y, 1.3 + rnd.frac() * 0.6);
    }
  }

  /** Chapter 7: the Krew file into Da Drongus Dungeon one by one ahead of you. */
  private async ladsGoIn(b: Building) {
    const s = G.s;
    const cam = this.cameras.main;
    this.busy = true;
    this.cutscene = true;
    this.prompt.setVisible(false);
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const door = b.door!;
    cam.stopFollow();
    cam.pan(door.x, door.y - 60, 700, Phaser.Math.Easing.Sine.InOut);
    const ids = LADS.filter((p) => p !== s.player && this.textures.exists(`spr_${p}`));
    const lads = ids.map((id, i) => this.add.sprite(door.x - 160 + (i % 4) * 40, door.y + 150 + Math.floor(i / 4) * 34, `spr_${id}`, 0).setScale(2).setDepth(door.y + 150));
    await new Promise((r) => this.time.delayedCall(750, r));
    await this.talk(CITADEL_ENTRY.slice(0, 3));
    for (const l of lads) {
      synth.play("door");
      await this.walkSpr(l, door.x, door.y + 10, 700);
      this.tweens.add({ targets: l, alpha: 0, y: door.y - 8, duration: 220, onComplete: () => l.destroy() });
      await new Promise((r) => this.time.delayedCall(180, r));
    }
    await this.talk(CITADEL_ENTRY.slice(3));
    s.flags.citadel_lads_in = true;
    G.save();
    this.go("Dungeon", { dungeon: "citadel", room: 0 });
  }

  /** The lads crawl out of the Town Hall rubble with the worst hangover in history. */
  private async aftermath() {
    const s = G.s;
    const cam = this.cameras.main;
    this.busy = true;
    this.cutscene = true;
    this.prompt.setVisible(false);
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const th = BUILDINGS.find((b) => b.id === "TOWN_HALL")!;
    const cx = th.door!.x;
    const cy = th.door!.y + 70;
    cam.stopFollow();
    cam.centerOn(cx, cy - 40);
    this.av.setVisible(false);
    synth.stopMusic();
    // rubble heaps with the Krew under them
    const ids = [s.player, ...LADS.filter((p) => p !== s.player)].filter((p) => this.textures.exists(`spr_${p}`));
    const lads = ids.map((id, i) => {
      const x = cx - 200 + i * 50;
      const y = cy + (i % 2) * 22;
      const heap = this.textures.exists("kd_rubble") ? this.add.image(x, y + 8, "kd_rubble").setScale(1.2).setDepth(y + 5) : this.add.ellipse(x, y + 10, 46, 20, 0x4b3f3a).setDepth(y + 5);
      const meta = charMeta(this, `spr_${id}`);
      const fall = meta?.death?.east ?? meta?.death?.south;
      const spr = this.add.sprite(x, y, `spr_${id}`, fall ? fall[fall.length - 1] : 0).setScale(2).setDepth(y);
      if (!fall) spr.setAngle(90);
      return { id, spr, heap, fall };
    });
    await this.talk(AFTER.AFTER_WAKE);
    // one by one, they come round
    for (const l of lads) {
      vfx(this, "vfx_dust", l.spr.x, l.spr.y + 6, { scale: 1.2, depth: l.spr.y + 6 });
      if (Math.random() < 0.6) synth.play("groan");
      this.tweens.add({ targets: l.heap, alpha: 0.5, y: l.heap.y + 6, duration: 300 });
      if (l.fall) for (const f of [...l.fall].reverse()) {
        l.spr.setFrame(f);
        await new Promise((r) => this.time.delayedCall(70, r));
      }
      else l.spr.setAngle(0);
      l.spr.setFrame(charMeta(this, l.spr.texture.key)?.idle.south ?? 0);
      await new Promise((r) => this.time.delayedCall(140, r));
    }
    await this.talk(AFTER.AFTER_HANGOVER);
    await this.talk(AFTER.AFTER_LEAK);
    // little-girl shrieks, all round
    lads.forEach((l, i) =>
      this.time.delayedCall(i * 140, () => {
        synth.play("shriek");
        this.tweens.add({ targets: l.spr, y: l.spr.y - 26, yoyo: true, duration: 160, repeat: 2 });
        this.floatShout(l.spr, ["EEEEEEEE!", "AAAIIIEEE!", "NOOOO!", "EEEK!"][i % 4], "#fbcfe8");
      }),
    );
    cam.shake(600, 0.006);
    await new Promise((r) => this.time.delayedCall(1600, r));
    await this.talk(AFTER.AFTER_SHRIEK);
    // the sixth crystal, glowing in the rubble
    const crystal = this.add.image(cx, cy - 30, this.textures.exists("cum_crystal") ? "cum_crystal" : "__WHITE").setScale(0.5).setDepth(cy + 60);
    const glow = this.add.circle(cx, cy - 30, 34, 0xfbcfe8, 0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(cy + 59);
    this.tweens.add({ targets: [crystal, glow], y: "-=10", yoyo: true, repeat: -1, duration: 700 });
    this.tweens.add({ targets: glow, scale: 1.5, alpha: 0.15, yoyo: true, repeat: -1, duration: 700 });
    synth.play("ding");
    s.flags.crystal_krunch = true;
    s.flags.crystal_krunch_seen = true;
    await this.talk(AFTER.AFTER_CRYSTAL.slice(0, 6));
    // up at the top of town: the slots light, the gates open
    const cit = BUILDINGS.find((b) => b.id === "CITADEL")!;
    cam.pan(cit.x, cit.y + 40, 1400, Phaser.Math.Easing.Sine.InOut);
    await new Promise((r) => this.time.delayedCall(1500, r));
    for (let i = 0; i < 6; i++) {
      const x = cit.x + (i - 2.5) * 22;
      const y = cit.y + cit.h / 2 - 96;
      this.add.circle(x, y, 12, 0xfbcfe8, 0.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(cit.y + cit.h / 2 + 4);
      synth.play("select");
      await new Promise((r) => this.time.delayedCall(260, r));
    }
    synth.play("boom");
    cam.shake(500, 0.01);
    cam.flash(300, 251, 207, 232);
    await this.talk(AFTER.AFTER_CRYSTAL.slice(6));
    cam.pan(cx, cy, 900);
    await new Promise((r) => this.time.delayedCall(950, r));
    // the Krew head off up the hill; you're back in control
    lads.slice(1).forEach((l) => this.tweens.add({ targets: [l.spr, l.heap], alpha: 0, duration: 900, onComplete: () => l.spr.destroy() }));
    crystal.destroy();
    glow.destroy();
    this.av.setPosition(lads[0].spr.x, lads[0].spr.y).setVisible(true);
    lads[0].spr.destroy();
    Object.assign(s.flags, { ch7_aftermath: true, ch7_intro: true, final_reading: true });
    this.cutscene = false;
    G.save();
    cam.startFollow(this.av, true, 0.12, 0.12);
    synth.music("hub");
    this.busy = false;
    G.emit("toast", { title: "CHAPTER 7", text: "DA DRONGUS DUNGEON — the gates are open. Stop the leak." });
  }

  // ---------------------------------------------------------------- CHAPTER 6: last chance, revenge, the march, the bomb

  /** Town Hall in Chapter 6. Returns true if it took over the visit. */
  private async chapter6TownHall(): Promise<boolean> {
    const s = G.s;
    if (!s.flags.ch6_ready) {
      delete s.flags.ch6_go;
      await this.talk([
        ...KR6_LAST_CHANCE.slice(-2),
        { s: "NARRATOR", t: "Begin Chapter 6 now? There's no going back.", dir: true, choice: [{ label: "Begin Chapter 6", set: { ch6_go: 1 } }, { label: "Not yet (keep preparing)", set: { ch6_go: 0 } }] },
      ]);
      if (s.flags.ch6_go !== 1) return true;
      delete s.flags.ch6_go;
      s.flags.ch6_ready = true;
      G.save();
      this.go("Hub", { at: "TOWN_HALL" });
      return true;
    }
    if (s.flags.kreltower_resolved && !s.flags.revenge_meeting) {
      G.save();
      this.go("Vignette", { id: "revenge_meeting", returnAt: "TOWN_HALL" });
      return true;
    }
    if (s.flags.nuke_planted && !s.flags.krunch_started) {
      this.startKrunch();
      return true;
    }
    if (s.flags.raid_march && !s.flags.nuke_planted) {
      await this.talk([say("KREZMAR", "What are you doing back here? Kreddle's THAT way. West. Over the bridge. Go!")]);
      return true;
    }
    return false;
  }

  private startKrunch() {
    const s = G.s;
    s.flags.krunch_started = true;
    G.rt.timerEnd = 0;
    G.emit("timer", null);
    G.save();
    this.go("Vignette", { id: "krunch_protocol", returnAt: "TOWN_HALL" });
  }

  private raidKrew: { spr: Phaser.GameObjects.Sprite; lag: number }[] = [];
  /** A scripted sequence is running in town: no interact prompts between its lines. */
  private cutscene = false;
  private trail: { x: number; y: number }[] = [];

  /** The Krew follow you through town (to Kreddle, and back with the bomb ticking). */
  private updateRaidMarch(_time: number) {
    const s = G.s;
    const marching = s.chapter === 6 && s.flags.raid_march && !s.flags.krunch_started;
    if (!marching) return;
    if (!this.raidKrew.length) {
      LADS.filter((p) => p !== s.player && this.textures.exists(`spr_${p}`)).forEach((p, i) => {
        const spr = this.add.sprite(this.av.x - 30 - i * 10, this.av.y + 20, `spr_${p}`, 0).setScale(2).setDepth(this.av.y);
        this.raidKrew.push({ spr, lag: 10 + i * 7 });
      });
    }
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.abs(last.x - this.av.x) + Math.abs(last.y - this.av.y) > 3) this.trail.push({ x: this.av.x, y: this.av.y });
    if (this.trail.length > 120) this.trail.shift();
    this.raidKrew.forEach((k, i) => {
      const p = this.trail[Math.max(0, this.trail.length - 1 - k.lag)] ?? { x: this.av.x, y: this.av.y };
      const tx = p.x + ((i % 3) - 1) * 14;
      const ty = p.y + 10;
      const dx = (tx - k.spr.x) * 0.15;
      const dy = (ty - k.spr.y) * 0.15;
      k.spr.x += dx;
      k.spr.y += dy;
      animateWalker(k.spr, dx, dy, Math.abs(dx) + Math.abs(dy) > 0.3, this.time.now);
      k.spr.setDepth(k.spr.y);
    });
    // the bomb's ticking
    if (s.flags.nuke_planted && G.rt.timerEnd) {
      const left = Math.max(0, G.rt.timerEnd - Date.now());
      G.emit("timer", left / 1000);
      if (left <= 0 && !this.busy) {
        G.emit("toast", { title: "TIME'S UP", text: "You didn't quite make it back. Close enough." });
        this.startKrunch();
      }
    }
  }

  /** The Krunch Protocol lands: every building in Krelford, one after another. */
  private async krunchBombing() {
    const cam = this.cameras.main;
    this.busy = true;
    this.cutscene = true;
    this.prompt.setVisible(false);
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.av.setVisible(false);
    synth.stopMusic();
    cam.stopFollow();
    await ensureCh6Art(this);
    const red = this.add.rectangle(480, 270, 960, 540, 0x7f1d1d, 1).setAlpha(0.25).setScrollFactor(0).setDepth(4950).setBlendMode(Phaser.BlendModes.MULTIPLY);
    void red;
    const bars = Juice.letterbox(this, 46, 600, 4990);
    Juice.vignette(this, 0x000000, 0.6, 4960);
    synth.play("alarm");
    await this.talk([dir("Krelford. The sky is full of little lights. They are getting bigger.")]);
    const order = BUILDINGS.filter((b) => b.door).sort((a, b) => a.y - b.y || a.x - b.x);
    const wait = (ms: number) => new Promise((r) => this.time.delayedCall(ms, r));
    // a montage that speeds up as it goes: the first few you watch land, then they're coming in faster than you can look
    for (const [i, b] of order.entries()) {
      const k = Math.max(0.35, 1 - i * 0.07);
      cam.pan(b.x, b.y, 450 * k, Phaser.Math.Easing.Sine.InOut);
      await wait(480 * k);
      // the lock-on: a red reticle closes on the building, beeping
      const ret = this.add.container(b.x, b.y).setDepth(9050);
      ret.add(this.add.circle(0, 0, 60).setStrokeStyle(3, 0xef4444, 0.95));
      ret.add(this.add.rectangle(0, 0, 150, 2, 0xef4444, 0.8));
      ret.add(this.add.rectangle(0, 0, 2, 150, 0xef4444, 0.8));
      ret.setScale(2.4).setAlpha(0);
      this.tweens.add({ targets: ret, scale: 1, alpha: 1, angle: 90, duration: 300 * k, ease: "Cubic.out" });
      synth.play("telegraph");
      // the missile comes in, trailing smoke
      const sx = b.x + 260;
      const sy = b.y - 460;
      const m = this.textures.exists("c6_missile") ? this.add.image(sx, sy, "c6_missile").setScale(1.4).setDepth(9000) : this.add.rectangle(sx, sy, 6, 26, 0xe5e7eb).setDepth(9000);
      m.setRotation(Math.atan2(b.y - sy, b.x - sx) + (this.textures.exists("c6_missile") ? 0 : Math.PI / 2));
      synth.play("whistle");
      await new Promise<void>((res) =>
        this.tweens.add({
          targets: m,
          x: b.x,
          y: b.y - 10,
          duration: 420 * k + 120,
          ease: "Quad.in",
          onUpdate: () => {
            const p = this.add.circle(m.x, m.y, 4 + Math.random() * 3, 0xd6d3d1, 0.7).setDepth(8999);
            this.tweens.add({ targets: p, scale: 3, alpha: 0, duration: 700, onComplete: () => p.destroy() });
          },
          onComplete: () => res(),
        }),
      );
      m.destroy();
      ret.destroy();
      // impact: white flash on the building, a held frame, then it's a burning shell
      const img = this.bImg[b.id];
      synth.play(Math.random() < 0.5 ? "explode_1" : "explode_2");
      synth.play("boom");
      Juice.subDrop(0.7, 0.9);
      Juice.flash(this, 0xffffff, 140, 0.5, 4970);
      cam.shake(350, 0.014);
      Juice.punchZoom(this, 0.06, 380, 1);
      if (img?.active) {
        img.setTintFill(0xffffff);
        this.time.delayedCall(70, () => {
          if (!img.active) return;
          img.clearTint().setTint(0x4a3a3a);
          this.tweens.add({ targets: img, x: { from: img.x - 4, to: img.x }, duration: 50, repeat: 4, yoyo: true });
          this.tweens.add({ targets: img, scaleY: img.scaleY * 0.93, y: img.y + img.displayHeight * 0.035, duration: 500, ease: "Bounce.out" });
        });
      }
      Juice.shockRing(this, b.x, b.y + b.h * 0.3, { color: 0xffd8a8, to: Math.max(260, b.w * 1.6), rings: 2, depth: 9002, flat: 0.45 });
      Juice.debris(this, b.x, b.y, 12, { depth: 9003, speed: 380, size: 9, floor: b.y + b.h / 2 });
      vfx(this, hasVfx(this, "vfx_bigboom") ? "vfx_bigboom" : "vfx_boom", b.x, b.y, { scale: 2.6, depth: 9001 });
      for (let j = 0; j < 3; j++) vfx(this, "vfx_boom", b.x + (Math.random() - 0.5) * b.w * 0.8, b.y + (Math.random() - 0.5) * b.h * 0.6, { scale: 1.6, depth: 9001, delay: 120 + j * 110 });
      for (let j = 0; j < 2; j++) vfx(this, "vfx_fire", b.x + (j ? 1 : -1) * b.w * 0.22, b.y + b.h * 0.2, { scale: 2.2, depth: b.y + 200, delay: 300 });
      vfx(this, "vfx_smokecol", b.x, b.y - b.h * 0.2, { scale: 2.4, depth: b.y + 199, delay: 450 });
      const label = this.add.text(b.x, b.y - b.h / 2 - 30, b.id === "HOME" ? "YOUR HOUSE" : b.name, { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ffd23f", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(9100).setScale(2);
      this.tweens.add({ targets: label, scale: 1, duration: 160, ease: "Quad.in" });
      this.tweens.add({ targets: label, alpha: 0, delay: 600, duration: 400, onComplete: () => label.destroy() });
      await wait(320 * k + 60);
    }
    // the last one: the Town Hall, where they're all still dancing. Silence first.
    cam.pan(1280, 790, 900, Phaser.Math.Easing.Sine.InOut);
    cam.zoomTo(1.25, 1600, Phaser.Math.Easing.Sine.InOut);
    await wait(1000);
    Juice.riser(900, 0.45);
    await wait(900);
    vfx(this, "vfx_bigboom", 1280, 790, { scale: 3.6, depth: 9001 });
    synth.play("explode_1");
    synth.play("boom");
    Juice.subDrop(1, 2.4);
    Juice.flash(this, 0xffffff, 600, 0.9, 4970);
    Juice.shockRing(this, 1280, 800, { color: 0xffffff, to: 700, rings: 3, depth: 9002, flat: 0.5, ms: 1000 });
    Juice.debris(this, 1280, 780, 20, { depth: 9003, speed: 460, size: 10, floor: 860 });
    cam.shake(1000, 0.025);
    cam.zoomTo(1, 1800, Phaser.Math.Easing.Cubic.Out);
    await wait(1400);
    bars(500);
    await this.talk([dir("Somewhere under all of it, in the Town Hall, the party is still going.")]);
    this.go("Vignette", { id: "townhall_party", returnAt: "TOWN_HALL" });
  }

  // ---------------------------------------------------------------- THE KREDDLE KRUNCHERS: the shoving match

  private brawl: {
    spot: { x: number; y: number };
    ks: Phaser.GameObjects.Sprite[];
    krew: Phaser.GameObjects.Sprite[];
    running: boolean;
    shoves: number;
    nextShove: number;
    heckle?: Phaser.Time.TimerEvent;
  } | null = null;

  /** If the Krunchers step is open, they're loitering by the bridge, heckling. */
  private spawnBrawl() {
    if (this.brawl) return;
    const c = currentArcSteps(G.s).find((x) => x.step.step.kind === "shove");
    if (!c) return;
    const k = c.step.step as Extract<ArcStep["step"], { kind: "shove" }>;
    const { x, y } = k.spot;
    const ks = KR.KRUNCHERS.filter((kr) => this.textures.exists(`spr_${kr.of}`)).map((kr, i) => {
      const sx = x - 60 + (i % 5) * 46;
      const sy = y - 50 + Math.floor(i / 5) * 56 + (i % 2) * 8;
      const sp = this.add.sprite(sx, sy, `spr_${kr.of}`, 0).setScale(2).setDepth(sy).setTint(i % 2 ? 0xff9de6 : 0x9be7ff);
      sp.setData("name", kr.name);
      return sp;
    });
    const tag = this.add.text(x + 30, y - 120, "THE KREDDLE KRUNCHERS", { fontFamily: "Impact, sans-serif", fontSize: "16px", color: "#ff4fd8", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(5000);
    this.brawl = { spot: { x, y }, ks, krew: [], running: false, shoves: 0, nextShove: 0 };
    this.brawl.heckle = this.time.addEvent({
      delay: 1700,
      loop: true,
      callback: () => {
        if (!this.brawl || this.brawl.running) return;
        const sp = Phaser.Utils.Array.GetRandom(ks) as Phaser.GameObjects.Sprite;
        if (sp?.active) this.floatShout(sp, Phaser.Utils.Array.GetRandom(KR.KR_SHOUTS), "#ffd1f3");
      },
    });
    this.interactables.push({
      x,
      y,
      r: 150,
      label: () => "Make the Kreddle Krunchers SCRAM",
      enabled: () => !!this.brawl && !this.brawl.running,
      use: () => {
        tag.destroy();
        void this.runBrawl(c.arc, c.step, k);
      },
    });
  }

  private floatShout(spr: Phaser.GameObjects.Sprite, text: string, bg: string) {
    const t = this.add.text(spr.x, spr.y - 56, text, { fontFamily: FONT, fontSize: "12px", color: "#111", backgroundColor: bg, padding: { x: 5, y: 2 }, fontStyle: "bold" }).setOrigin(0.5).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, delay: 700, duration: 450, onComplete: () => t.destroy() });
  }

  /** Shove a sprite away from (fx, fy). */
  private knock(spr: Phaser.GameObjects.Sprite, fx: number, fy: number, dist = 46) {
    const a = Math.atan2(spr.y - fy, spr.x - fx) + (Math.random() - 0.5) * 0.6;
    this.tweens.killTweensOf(spr);
    this.tweens.add({ targets: spr, x: spr.x + Math.cos(a) * dist, y: spr.y + Math.sin(a) * dist * 0.7, angle: { from: (Math.random() - 0.5) * 30, to: 0 }, duration: 260, ease: "Quad.out", onUpdate: () => spr.setDepth(spr.y) });
    vfx(this, "vfx_dust", spr.x, spr.y + 10, { scale: 1, depth: spr.y + 1 });
  }

  /** You press attack in the scrum: the nearest Kruncher gets it. */
  private playerShove(now: number) {
    const b = this.brawl;
    if (!b || now < b.nextShove) return;
    b.nextShove = now + 320;
    const near = b.ks.filter((k) => k.active).sort((p, q) => Phaser.Math.Distance.Between(p.x, p.y, this.av.x, this.av.y) - Phaser.Math.Distance.Between(q.x, q.y, this.av.x, this.av.y))[0];
    if (!near || Phaser.Math.Distance.Between(near.x, near.y, this.av.x, this.av.y) > 80) return;
    this.knock(near, this.av.x, this.av.y, 70);
    synth.play("punch");
    b.shoves++;
    vfx(this, "vfx_hit", near.x, near.y - 30, { scale: 1.2, depth: 6000 });
    this.floatShout(this.av as unknown as Phaser.GameObjects.Sprite, Phaser.Utils.Array.GetRandom(["SHOVE!", "SCRAM!", ...(G.s.player === "MIKEY" ? KR.KREW_SHOUTS_POLSON : KR.KREW_SHOUTS)]), "#bde0fe");
    if (Math.random() < 0.6) this.time.delayedCall(250, () => near.active && this.floatShout(near, Phaser.Utils.Array.GetRandom(KR.KR_SHOUTS), "#ffd1f3"));
  }

  private async runBrawl(arc: Arc, step: ArcStep, k: Extract<ArcStep["step"], { kind: "shove" }>) {
    const b = this.brawl!;
    const s = G.s;
    const { x, y } = b.spot;
    // the krew turn up
    b.krew = LADS.filter((p) => p !== s.player && this.textures.exists(`spr_${p}`)).map((p, i) => {
      const sp = this.add.sprite(x + 260 + (i % 4) * 40, y - 40 + Math.floor(i / 4) * 50, `spr_${p}`, 0).setScale(2).setDepth(y);
      return sp;
    });
    this.busy = true;
    await this.talk(k.intro);
    this.busy = false;
    b.running = true;
    synth.play("crowd_boo");
    G.emit("toast", { title: "SHOVING MATCH", text: "Attack to shove a Kruncher. Or don't. It's chaos either way." });
    // everyone piles into the middle
    const all = [...b.ks, ...b.krew];
    all.forEach((sp) => this.tweens.add({ targets: sp, x: x + 40 + (Math.random() - 0.5) * 220, y: y + (Math.random() - 0.5) * 120, duration: 600, onUpdate: () => sp.setDepth(sp.y) }));
    const counter = this.add.text(480, 90, "", { fontFamily: FONT, fontSize: "18px", color: "#ff4fd8", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(9000);
    const end = this.time.now + k.seconds * 1000;
    const chaos = this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        counter.setText(`SHOVES: ${b.shoves}   ·   ${Math.max(0, Math.ceil((end - this.time.now) / 1000))}s`);
        // a random scuffle: someone from one side shoves someone from the other
        const kr = Phaser.Utils.Array.GetRandom(b.ks) as Phaser.GameObjects.Sprite;
        const kw = Phaser.Utils.Array.GetRandom(b.krew) as Phaser.GameObjects.Sprite;
        if (!kr || !kw) return;
        const [a, v] = Math.random() < 0.5 ? [kr, kw] : [kw, kr];
        this.tweens.add({ targets: a, x: a.x + (v.x - a.x) * 0.5, y: a.y + (v.y - a.y) * 0.5, duration: 120, yoyo: true, onUpdate: () => a.setDepth(a.y) });
        this.time.delayedCall(120, () => this.knock(v, a.x, a.y));
        if (Math.random() < 0.5) synth.play("punch");
        if (Math.random() < 0.55) this.floatShout(a, Phaser.Utils.Array.GetRandom(a === kr ? KR.KR_SHOUTS : G.s.player === "MIKEY" ? KR.KREW_SHOUTS_POLSON : KR.KREW_SHOUTS), a === kr ? "#ffd1f3" : "#bde0fe");
        // stragglers drift back into the scrum
        for (const sp of all) if (Phaser.Math.Distance.Between(sp.x, sp.y, x + 40, y) > 200) this.tweens.add({ targets: sp, x: x + 40 + (Math.random() - 0.5) * 160, y: y + (Math.random() - 0.5) * 100, duration: 700, onUpdate: () => sp.setDepth(sp.y) });
        // and now and then one of them shoves YOU
        const near = b.ks.find((q) => Phaser.Math.Distance.Between(q.x, q.y, this.av.x, this.av.y) < 60);
        if (near && Math.random() < 0.18) {
          this.tweens.add({ targets: this.av, x: this.av.x + Math.sign(this.av.x - near.x || 1) * 34, duration: 160 });
          this.floatShout(near, Phaser.Utils.Array.GetRandom(KR.KR_SHOUTS), "#ffd1f3");
          this.cameras.main.shake(90, 0.004);
        }
      },
    });
    await new Promise<void>((res) => this.time.delayedCall(k.seconds * 1000, () => res()));
    chaos.remove();
    counter.destroy();
    b.running = false;
    this.busy = true;
    // they regroup, gloat, and take your wallets on the way out
    b.ks.forEach((sp, i) => this.tweens.add({ targets: sp, x: x - 80 + (i % 5) * 40, y: y - 30 + Math.floor(i / 5) * 50, duration: 500, onUpdate: () => sp.setDepth(sp.y) }));
    await this.talk(k.leave);
    const lost = Math.min(s.coins, Math.max(25, Math.round(s.coins * 0.4)));
    s.coins -= lost;
    synth.play("coin");
    vfx(this, "vfx_coins", this.av.x, this.av.y - 30, { scale: 1.4, depth: 6000 });
    G.emit("toast", { title: "PICKPOCKETED", text: lost ? `The Krunchers nicked ${lost} Krezzcoin off you on the way out.` : "They went through your pockets. You had nothing. They looked at you with pity." });
    for (const sp of b.ks) this.tweens.add({ targets: sp, x: 40, duration: 1600 + Math.random() * 600, onComplete: () => sp.destroy() });
    await new Promise<void>((res) => this.time.delayedCall(900, () => res()));
    await this.talk(k.after);
    for (const sp of b.krew) this.tweens.add({ targets: sp, alpha: 0, duration: 800, onComplete: () => sp.destroy() });
    b.heckle?.remove();
    s.flags.krunchers_shoved = b.shoves;
    completeStep(s, arc, step);
    this.brawl = null;
    this.busy = false;
    G.save();
    this.arcPayout();
  }

  // ---------------------------------------------------------------- THE FINALE: after Da Drongus Dungeon falls

  private finaleKrew: { spr: Phaser.GameObjects.Sprite; lag: number }[] = [];
  /** The chat logs, where Drongus threw them (the objective arrow points here). */
  private finaleLogs: { x: number; y: number } | null = null;
  private finaleRumbling = false;

  /** Where Da Drongus Dungeon stood: an enormous heap of wreckage, smoking, sparking, on fire. */
  private drawWreckHeap(b: Building) {
    finaleReady(this);
    const bottom = b.y + b.h / 2;
    const key = this.textures.exists("fb_wreck") ? "fb_wreck" : null;
    const sc = Math.max(1.6, (b.w * 1.35) / 256);
    if (key) {
      this.add.image(b.x, bottom + 30, key).setOrigin(0.5, 1).setScale(sc).setDepth(bottom + 20);
      // spill either side
      this.add.image(b.x - b.w * 0.75, bottom + 50, key).setOrigin(0.5, 1).setScale(sc * 0.45).setFlipX(true).setDepth(bottom + 40).setTint(0x9a90a0);
      this.add.image(b.x + b.w * 0.75, bottom + 46, key).setOrigin(0.5, 1).setScale(sc * 0.5).setDepth(bottom + 36).setTint(0x9a90a0);
    } else for (let i = 0; i < 9; i++) this.ruinProp(["r_rubble", "r_girders", "r_fireheap"][i % 3], b.x - b.w / 2 + (b.w * (i + 0.5)) / 9, bottom - 20 + (i % 2) * 20, 2.2);
    this.add.ellipse(b.x, bottom + 10, b.w * 1.6, 90, 0x0d0a08, 0.5).setDepth(1);
    for (let i = 0; i < 6; i++) vfx(this, "vfx_fire", b.x + (Math.random() - 0.5) * b.w * 1.1, bottom - Math.random() * 160, { scale: 1.4 + Math.random(), depth: bottom + 45, delay: Math.random() * 700 });
    for (let i = 0; i < 4; i++) vfx(this, "vfx_smokecol", b.x + (i - 1.5) * b.w * 0.35, bottom - 140, { scale: 2.6, depth: bottom + 46, alpha: 0.8, delay: i * 200 });
    // sparks off the snapped cables
    this.time.addEvent({ delay: 700, loop: true, callback: () => {
      if (Math.random() < 0.5) return;
      const x = b.x + (Math.random() - 0.5) * b.w;
      const y = bottom - 40 - Math.random() * 160;
      for (let k = 0; k < 5; k++) {
        const sp = this.add.rectangle(x, y, 2, 2, 0xc4b5fd).setDepth(bottom + 50).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: sp, x: x + (Math.random() - 0.5) * 40, y: y + 20 + Math.random() * 30, alpha: 0, duration: 400, onComplete: () => sp.destroy() });
      }
    } });
    this.add
      .text(b.x, bottom + 40, "WHERE DA DRONGUS DUNGEON STOOD (WRECKAGE)", { fontFamily: FONT, fontSize: "11px", color: "#ffb4a0", backgroundColor: "#1a1033cc", padding: { x: 5, y: 2 } })
      .setOrigin(0.5, 0)
      .setDepth(bottom + 60);
    this.colliders.add(this.add.rectangle(b.x, bottom - b.h * 0.3, b.w * 1.1, b.h * 0.7, 0, 0));
  }

  /** "x,y" from the roof (where the logs landed), nudged off any heap so you can reach it. */
  private finaleSpot(v: unknown, def: { x: number; y: number }) {
    const [a, b] = String(v ?? "").split(",").map(Number);
    let x = Phaser.Math.Clamp(Number.isFinite(a) ? a : def.x, 100, WORLD_W - 100);
    let y = Phaser.Math.Clamp(Number.isFinite(b) ? b : def.y, 300, WORLD_H - 120);
    for (let i = 0; i < 30 && this.nearBuilding(x, y, 60); i++) y += 30;
    if (this.nearBuilding(x, y, 60)) ({ x, y } = def);
    return { x, y };
  }

  /** The finale in town: land at the bottom of the wreck, celebrate, go for the logs, and then the rumble. */
  private async finaleKrelford() {
    const s = G.s;
    // the lads are with you now, not scattered round town
    for (const n of [...this.npcs]) {
      if (!(LADS as readonly string[]).includes(n.id) && n.id !== "MIKEY" && !n.follower) continue;
      n.spr.destroy();
      n.plate.destroy();
      n.bubble?.destroy();
      this.interactables = this.interactables.filter((i) => (i as unknown as { __npc?: Npc }).__npc !== n);
      this.npcs = this.npcs.filter((x) => x !== n);
    }
    const logs = this.finaleSpot(s.flags.finale_logs_at, { x: 900, y: 1440 });
    if (!s.flags.finale_landed) await this.finaleLanding();
    // the logs, glowing in a puddle
    const img = this.add.image(logs.x, logs.y, logsKey(this)).setScale(1.3).setDepth(logs.y);
    const glow = this.add.circle(logs.x, logs.y, 34, 0x22c55e, 0.3).setDepth(logs.y - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 1.5, alpha: 0.1, yoyo: true, repeat: -1, duration: 800 });
    this.tweens.add({ targets: img, y: logs.y - 6, yoyo: true, repeat: -1, duration: 700 });
    // the Krew follow you
    [...LADS, "MIKEY"].filter((p) => p !== s.player && this.textures.exists(`spr_${p}`)).forEach((p, i) => {
      const spr = this.add.sprite(this.av.x - 40 + (i % 4) * 26, this.av.y + 30 + Math.floor(i / 4) * 20, `spr_${p}`, 0).setScale(2).setDepth(this.av.y);
      this.finaleKrew.push({ spr, lag: 10 + i * 7 });
    });
    this.trail = [];
    this.finaleLogs = logs;
    this.busy = false;
    this.cutscene = false;
    G.emit("toast", { title: "OBJECTIVE", text: s.flags.finale_emerged ? "Back to the logs. It's waiting for you." : "Get the chat logs. Follow the arrow." });
  }

  /** They come down the wreck on bits of it, and land at the bottom. Then: the celebration, then the silence. */
  private async finaleLanding() {
    const s = G.s;
    const cam = this.cameras.main;
    const b = BUILDINGS.find((x) => x.id === "CITADEL")!;
    const bottom = b.y + b.h / 2;
    this.busy = true;
    this.cutscene = true;
    this.prompt.setVisible(false);
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.av.setVisible(false);
    cam.stopFollow();
    cam.centerOn(b.x, bottom + 40);
    synth.stopMusic();
    await this.talk(FB.FB_LANDED);
    this.busy = true;
    const ids = [s.player, ...LADS.filter((p) => p !== s.player), "MIKEY"].filter((p, i, a) => a.indexOf(p) === i && this.textures.exists(`spr_${p}`));
    const lads = ids.map((id, i) => {
      const fx = b.x - 200 + (i * 400) / Math.max(1, ids.length - 1);
      const fy = bottom + 110 + (i % 2) * 24;
      const spr = this.add.sprite(fx + (i % 2 ? 60 : -60), bottom - 150 - (i % 3) * 30, `spr_${id}`, 0).setScale(2).setDepth(fy + 2);
      const slab = this.add.rectangle(spr.x, spr.y + 20, 46, 12, 0x2a2433).setStrokeStyle(2, 0x0b0612).setDepth(fy + 1);
      return { id, spr, slab, fx, fy };
    });
    // surf down
    for (const [i, l] of lads.entries()) {
      this.time.delayedCall(i * 160, () => {
        synth.play(i % 2 ? "swing" : "dodge");
        this.tweens.add({ targets: [l.spr, l.slab], x: `+=${l.fx - l.spr.x}`, y: `+=${l.fy - l.spr.y}`, duration: 900, ease: "Quad.in", onComplete: () => {
          vfx(this, "vfx_dust", l.fx, l.fy + 14, { scale: 1.4, depth: l.fy + 5 });
          this.cameras.main.shake(90, 0.004);
          this.tweens.add({ targets: l.slab, alpha: 0, delay: 400, duration: 400, onComplete: () => l.slab.destroy() });
        } });
        this.tweens.add({ targets: l.spr, angle: { from: -12, to: 8 }, yoyo: true, duration: 220, repeat: 1 });
      });
    }
    await new Promise((r) => this.time.delayedCall(lads.length * 160 + 1100, r));
    lads.forEach((l) => l.spr.setAngle(0));
    synth.play("cheer");
    lads.forEach((l, i) => this.tweens.add({ targets: l.spr, y: l.spr.y - 22, yoyo: true, repeat: 3, duration: 180, delay: i * 50 }));
    await this.talk(FB.FB_CELEBRATE.slice(0, 9));
    this.busy = true;
    // the cheer, the conga
    synth.play("cheer");
    vfx(this, "vfx_confetti", b.x, bottom + 80, { scale: 2.5, depth: 6000 });
    lads.forEach((l, i) => this.tweens.add({ targets: l.spr, y: l.spr.y - 30, yoyo: true, repeat: 5, duration: 150, delay: i * 40 }));
    lads.forEach((l, i) => this.floatShout(l.spr, ["WAHEY!", "GET IN!", "YESSSS!", "LADS!!", "DELETE!", "WOOOO!"][i % 6], "#bbf7d0"));
    await new Promise((r) => this.time.delayedCall(1300, r));
    await this.talk(FB.FB_CELEBRATE.slice(9));
    this.busy = true;
    // silence
    synth.stopMusic();
    await new Promise((r) => this.time.delayedCall(1400, r));
    await this.talk(FB.FB_SILENCE);
    this.busy = true;
    // the lads become your followers (made again in finaleKrelford); you take the first one's place
    this.av.setPosition(lads[0].spr.x, lads[0].spr.y).setVisible(true);
    lads.forEach((l) => l.spr.destroy());
    s.flags.finale_landed = true;
    G.save();
    cam.startFollow(this.av, true, 0.12, 0.12);
  }

  /** The Krew trail behind you; near the logs, the ground starts to shake. */
  private updateFinale(_time: number) {
    if (!this.finaleKrew.length && !this.finaleLogs) return;
    const p = { x: this.av.x, y: this.av.y };
    const last = this.trail[this.trail.length - 1];
    if (!last || Phaser.Math.Distance.Between(last.x, last.y, p.x, p.y) > 6) {
      this.trail.push(p);
      if (this.trail.length > 120) this.trail.shift();
    }
    for (const k of this.finaleKrew) {
      const t = this.trail[Math.max(0, this.trail.length - 1 - k.lag)] ?? p;
      const dx = t.x - k.spr.x;
      const dy = t.y - k.spr.y;
      const moving = Math.hypot(dx, dy) > 4;
      k.spr.x += dx * 0.18;
      k.spr.y += dy * 0.18;
      animateWalker(k.spr, dx, dy, moving, this.time.now);
      k.spr.setDepth(k.spr.y);
    }
    const L = this.finaleLogs;
    if (L && !this.busy && !this.finaleRumbling && Phaser.Math.Distance.Between(p.x, p.y, L.x, L.y) < 150) void this.finaleRumble();
  }

  private whiteout: Phaser.GameObjects.Rectangle | null = null;

  /** A clear spot near (x, y): spirals out until it's off every heap. */
  private clearSpot(x: number, y: number) {
    for (let r = 0; r < 600; r += 30)
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const px = Phaser.Math.Clamp(x + Math.cos(a) * r, 120, WORLD_W - 120);
        const py = Phaser.Math.Clamp(y + Math.sin(a) * r, 300, WORLD_H - 140);
        if (!this.nearBuilding(px, py, 60)) return { x: px, y: py };
        if (r === 0) break;
      }
    return { x, y };
  }

  /**
   * The morning after. Daylight; the ruins smoking. The lads come round ("urghh"), congratulate themselves on saving
   * Krelworld (it is gone), and on the logs. Then Drongus comes round, in his pants, sees the logs, and runs for them.
   * You get there first, by shoving him over. Then the original ending (the KREZZING HOUR). Esc skips to it.
   */
  private async finaleDawn() {
    const s = G.s;
    const cam = this.cameras.main;
    this.busy = true;
    this.cutscene = true;
    this.prompt.setVisible(false);
    this.arrow.setVisible(false);
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.av.setVisible(false);
    let over = false;
    const finish = () => {
      if (over) return;
      over = true;
      window.removeEventListener("keydown", esc);
      s.flags.finale_dawn_done = true;
      s.phase = "hub";
      G.save();
      this.cameras.main.fadeOut(900, 255, 255, 255);
      this.time.delayedCall(950, () => switchTo(this, "Ending", {}));
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", esc);
    this.events.once("shutdown", () => window.removeEventListener("keydown", esc));
    const wait = (ms: number) => new Promise<void>((r) => this.time.delayedCall(ms, () => r()));
    const talk = async (lines: Line[]) => {
      if (over) return;
      await this.talk(lines);
      this.busy = true;
    };
    // the logs (where they landed), and the lads strewn about not far from them
    const L = this.finaleSpot(s.flags.finale_logs_at, { x: 900, y: 1440 });
    const C = this.clearSpot(L.x + 430, L.y + 10);
    const D = this.clearSpot(L.x - 360, L.y + 20);
    // the logs, glowing
    const logs = this.add.image(L.x, L.y, logsKey(this)).setScale(1.3).setDepth(L.y);
    const lglow = this.add.circle(L.x, L.y, 34, 0x22c55e, 0.3).setDepth(L.y - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: lglow, scale: 1.5, alpha: 0.1, yoyo: true, repeat: -1, duration: 800 });
    cam.stopFollow();
    cam.centerOn(C.x, C.y - 20);
    synth.music("hub");
    const ids = [s.player, ...LADS.filter((p) => p !== s.player), "MIKEY"].filter((p, i, a) => a.indexOf(p) === i && this.textures.exists(`spr_${p}`));
    const lads = ids.map((id, i) => {
      const x = C.x - 160 + (i % 5) * 80 + (i >= 5 ? 40 : 0);
      const y = C.y - 30 + Math.floor(i / 5) * 60 + (i % 2) * 10;
      const meta = charMeta(this, `spr_${id}`);
      const fall = meta?.death?.east ?? meta?.death?.south;
      const spr = this.add.sprite(x, y, `spr_${id}`, fall ? fall[fall.length - 1] : 0).setScale(2).setDepth(y);
      if (!fall) spr.setAngle(90);
      return { id, spr, fall };
    });
    // Drongus, out cold, in his pants
    const dk = this.textures.exists("fb_drongus_undies") ? "fb_drongus_undies" : this.textures.exists("fr_drongus_skinny") ? "fr_drongus_skinny" : "spr_DRONGUS";
    const dr = this.add.sprite(D.x, D.y, dk, 0).setScale(dk === "spr_DRONGUS" ? 2 : 0.62).setAngle(-90).setDepth(D.y + 60);
    // the long whiteness
    const white = this.whiteout ?? this.add.rectangle(480, 270, 2000, 1200, 0xffffff, 1).setScrollFactor(0).setDepth(9500);
    this.whiteout = null;
    this.scene.setVisible(false, "UI");
    await wait(1500);
    if (over) return;
    await talk(FD_WAKE_FIRST);
    this.tweens.add({ targets: white, alpha: 0, duration: 4500, ease: "Sine.in", onComplete: () => white.destroy() });
    await wait(4200);
    await talk(FB.FD_WAKE.slice(1));
    // one by one, they come round
    for (const [i, l] of lads.entries()) {
      if (over) return;
      vfx(this, "vfx_dust", l.spr.x, l.spr.y + 8, { scale: 1, depth: l.spr.y + 6 });
      if (i % 2 === 0) synth.play("groan");
      this.floatShout(l.spr, ["URGHH", "urghhh", "UURGH", "ugh…", "URGHHHH", "nnngh"][i % 6], "#e5e7eb");
      if (l.fall) for (const f of [...l.fall].reverse()) {
        l.spr.setFrame(f);
        await wait(60);
      }
      else l.spr.setAngle(0);
      l.spr.setFrame(charMeta(this, l.spr.texture.key)?.idle.south ?? 0);
      this.tweens.add({ targets: l.spr, x: l.spr.x + 3, yoyo: true, repeat: 3, duration: 120 });
      await wait(200);
    }
    await talk(FB.FD_URGH);
    await talk(FB.FD_SAVED);
    // across the rubble...
    cam.pan(D.x, D.y - 20, 1500, Phaser.Math.Easing.Sine.InOut);
    await wait(1600);
    this.tweens.add({ targets: dr, x: dr.x + 3, yoyo: true, repeat: 5, duration: 90 });
    await talk(FB.FD_DRONGUS_STIR);
    synth.play("groan");
    await new Promise<void>((r) => this.tweens.add({ targets: dr, angle: 0, y: D.y - 6, duration: 900, ease: "Back.out", onComplete: () => r() }));
    this.tweens.add({ targets: dr, angle: { from: -6, to: 6 }, yoyo: true, repeat: 4, duration: 260 });
    const stars = this.add.text(dr.x, dr.y - 46, "✦ ✧ ✦", { fontFamily: FONT, fontSize: "14px", color: "#fde68a" }).setOrigin(0.5).setDepth(6000);
    this.tweens.add({ targets: stars, angle: 360, repeat: 3, duration: 900, onComplete: () => stars.destroy() });
    await talk(FB.FD_DRONGUS_UP);
    if (over) return;
    // the logs!
    cam.pan(L.x, L.y - 20, 700, Phaser.Math.Easing.Sine.InOut);
    synth.play("alarm");
    await wait(900);
    // the race: he staggers for them; you sprint
    const me = lads[0].spr;
    cam.startFollow(me, true, 0.08, 0.08);
    const hitX = L.x - 90;
    const hitY = L.y + 8;
    const drRun = this.tweens.add({ targets: dr, x: hitX - 10, y: hitY, duration: 2300, ease: "Sine.in", onUpdate: () => {
      dr.setDepth(dr.y + 60);
      dr.setAngle(Math.sin(this.time.now / 70) * 8);
    } });
    this.floatShout(dr as unknown as Phaser.GameObjects.Sprite, "MY LOGS!!!", "#fca5a5");
    me.setFlipX(true);
    this.floatShout(me, "OI!!!", "#bde0fe");
    await this.walkSpr(me, hitX + 26, hitY, 2200);
    // SHOVE
    drRun.stop();
    synth.play("punch_big");
    cam.shake(400, 0.02);
    cam.flash(120, 255, 255, 255);
    const pow = this.add.text(hitX, hitY - 50, "SHOVE!!", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#ffd23f", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setDepth(7000).setScale(0.3);
    this.tweens.add({ targets: pow, scale: 1.2, duration: 160, ease: "Back.out" });
    this.tweens.add({ targets: pow, alpha: 0, y: pow.y - 30, delay: 900, duration: 500, onComplete: () => pow.destroy() });
    this.tweens.add({ targets: me, x: me.x - 14, yoyo: true, duration: 90 });
    // he goes flying, end over end, and lands in a heap
    this.tweens.add({ targets: dr, x: hitX - 260, duration: 900, ease: "Quad.out", onUpdate: () => dr.setDepth(dr.y + 60) });
    this.tweens.add({ targets: dr, y: hitY - 120, duration: 420, ease: "Quad.out", yoyo: true });
    this.tweens.add({ targets: dr, angle: -720 - 90, duration: 900 });
    await wait(900);
    synth.play("smash");
    cam.shake(250, 0.01);
    vfx(this, "vfx_dust", dr.x, dr.y + 10, { scale: 2, depth: dr.y + 5 });
    const st2 = this.add.text(dr.x, dr.y - 30, "✦ ✧ ✦", { fontFamily: FONT, fontSize: "14px", color: "#fde68a" }).setOrigin(0.5).setDepth(6000);
    this.tweens.add({ targets: st2, angle: 360, repeat: -1, duration: 900 });
    // and you get there
    cam.stopFollow();
    cam.pan(L.x - 60, L.y, 500, Phaser.Math.Easing.Sine.InOut);
    me.setFlipX(false);
    await this.walkSpr(me, L.x, L.y + 14, 500);
    lglow.destroy();
    this.tweens.add({ targets: logs, y: me.y - 70, duration: 400, ease: "Back.out" });
    synth.play("pickup");
    synth.play("cheer");
    this.tweens.add({ targets: me, y: me.y - 16, yoyo: true, repeat: 2, duration: 160 });
    await wait(700);
    await talk(FB.FD_GOT_THEM);
    await wait(500);
    finish();
  }

  /** "Surely not." The wreck heap moves. */
  private async finaleRumble() {
    const s = G.s;
    const cam = this.cameras.main;
    this.finaleRumbling = true;
    this.busy = true;
    this.cutscene = true;
    this.prompt.setVisible(false);
    this.arrow.setVisible(false);
    (this.av.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (s.flags.finale_emerged) {
      // you've seen it come out: straight back into the fight
      await this.talk([say("KREZMAR", "It's still there. Course it is. Right. Again. EVERYONE OPEN FIRE.")]);
      this.go("Dungeon", { dungeon: "krelford_finale", room: 0 });
      return;
    }
    await this.talk(FB.FB_FOUND_LOGS);
    this.busy = true;
    synth.play("boom");
    cam.shake(2500, 0.006);
    await new Promise((r) => this.time.delayedCall(900, r));
    await this.talk(FB.FB_RUMBLE.slice(1));
    this.busy = true;
    // up the hill, the heap heaves
    const b = BUILDINGS.find((x) => x.id === "CITADEL")!;
    cam.stopFollow();
    cam.pan(b.x, b.y + b.h / 2 - 60, 1400, Phaser.Math.Easing.Sine.InOut);
    cam.shake(4200, 0.014);
    for (let i = 0; i < 5; i++) this.time.delayedCall(400 + i * 700, () => {
      this.lightning(b.x + (Math.random() - 0.5) * 300, b.y - 300, b.y + b.h / 2);
      synth.play(i % 2 ? "roar" : "boom");
      vfx(this, "vfx_dust", b.x + (Math.random() - 0.5) * b.w, b.y + b.h / 2, { scale: 3, depth: 6000 });
    });
    await new Promise((r) => this.time.delayedCall(3800, r));
    cam.flash(300, 160, 120, 255);
    s.flags.finale_rumbled = true;
    G.save();
    this.go("Finale", { beat: "emerge" });
  }

  private targetPos(id: string) {
    const b = BUILDINGS.find((x) => x.id === id);
    if (b?.door) return b.door;
    const g = GATES.find((x) => x.id === id);
    return g ?? null;
  }
}
