import type { Cond, Line } from "./types";
import { goat } from "../content/dsl";
import * as CD from "../content/citadel";

export type Theme = "school" | "mansion" | "network" | "industrial" | "temple" | "prison" | "wiki" | "colon" | "mind" | "citadel";

export interface PropDef {
  kind: "bomb_spot" | "crystal_wall" | "talker" | "mollor" | "wonking_machine" | "vending" | "valve" | "terminal" | "npc" | "bertha" | "tv" | "sign" | "evidence_board" | "witness" | "reaction_terminal" | "tap_valve" | "phone";
  x: number; // 0..1 of room width
  y: number; // 0..1 of room height
  id?: string;
  label?: string;
  speaker?: string;
  cond?: Cond;
  /** talker: sprite/image key to draw, and what they say when you press E. */
  image?: string;
  lines?: { s: string; t: string; dir?: boolean }[];
  /** talker extras: heal you, change the song, etc. */
  action?: "hottub" | "jukebox" | "pepsi" | "kick_gabor" | "begour_hug" | "donut";
}

export interface RoomDef {
  name: string;
  w: number;
  h: number;
  theme: Theme;
  waves?: [string, number][][];
  props?: PropDef[];
  /** Special scripted event handled by the dungeon scene. */
  event?: "cheesegate" | "mork" | "valves" | "reaction_terminal" | "bertha" | "records" | "anthem" | "colon" | "drongus1" | "stairs" | "drongus2" | "roof";
  boss?: string;
  /** Arbitrary Drongus rule active in this room (chapter 4). */
  rule?: string;
  enterLines?: { s: string; t: string; dir?: boolean; cond?: Cond }[];
  /** Side-scrolling rooms: backdrop image and one-way platforms [x (0..1), height above the ground, width]. */
  backdrop?: string;
  platforms?: [number, number, number][];
  /** Side rooms: the backdrop scrolls with the level (no parallax) and these ledges in it are real platforms.
   *  [x0, x1, y] in backdrop pixels, left half only (the art is mirrored, so they're mirrored too). */
  ledges?: [number, number, number][];
  /** Always drop a weapons crate in this room (a new gun if there's one to find). */
  gunCrate?: boolean;
  /** SanMik and SanChz fight alongside you in this room. */
  sanBros?: boolean;
  /** Scenes to play (in order) when you leave through the exit, before the next room: "norwich", "drive". */
  then?: string[];
  /** Shown when the exit is locked by exitFlag. */
  exitHint?: string;
  /** Side-scrolling platforming: holes in the floor [x 0..1, width px], what's in them, and what they're called. */
  floorGaps?: [number, number][];
  pitColor?: number;
  pitName?: string;
  /** Moving platforms: [x 0..1, height above ground, width, swing x, swing y, period ms]. */
  movers?: [number, number, number, number, number, number][];
  /** Crushers, steam vents and conveyor belts. */
  hazards?: { kind: "crusher" | "steam" | "conveyor"; x: number; w?: number; period?: number; dir?: number; offset?: number }[];
  crusherLabel?: string;
  /** Run and gun: when you get past x (0..1), this lot turns up. Replaces waves. */
  triggers?: [number, [string, number][]][];
  /** Side-scrolling set piece: something chases you from the left once you pass `at` (0..1). */
  chase?: { at: number; speed: number; label: string; color?: number };
  /** Several bosses back to back in the same room (after `boss`), each with its own backdrop. */
  bossRush?: { boss: string; backdrop?: string; hp?: number }[];
  /** Boss HP multiplier for this room (e.g. an easier first fight in a rush). */
  bossHp?: number;
  /** This room alone is side-on (in a top-down dungeon). */
  view?: "side";
  /** A tall side-on room you climb: run-and-gun triggers fire by height (0..1 of the climb), the exit is at the top. */
  tower?: boolean;
  /** Where the exit door sits in a side room: [x 0..1, height above the ground]. */
  exitAt?: [number, number];
  /** Room music (overrides the dungeon's). */
  music?: string;
  /** The magic pill: colours, sea creatures, the room breathes. */
  trip?: boolean;
  /** Chapter 7: Drongus over the tannoy, after the enter lines (the AI's refusals flash the room red). */
  pa?: Line[];
  /** A mini-boss part way through (side rooms): passing `at` (x 0..1, or height 0..1 of a tower climb) brings it in. */
  miniBoss?: { id: string; at: number; pa?: Line[]; music?: string; hp?: number };
  /** What the exit is called on the door label and the CLIMB hint (default: the Squeezing Room / EXIT). */
  exitLabel?: string;
  goal?: string;
  /** Exit is locked until this flag is set (in addition to clearing all waves). */
  exitFlag?: string;
  cond?: Cond;
}

export interface DungeonDef {
  id: string;
  chapter: number;
  name: string;
  music: string;
  rooms: RoomDef[];
  /** Countdown (seconds) across the whole dungeon. Running out triggers `onTimeout`. */
  timerSec?: number;
  /** Arena fights belong to a character arc; winning sets this flag and returns to Krelford. */
  arenaFlag?: string;
  /** Hub building to return to after an arena or special mission. */
  returnAt?: string;
  /** "side": a side-scrolling platformer (gravity, jumping, exit on the right). */
  view?: "side";
}

/** DA DRONGUS CORRIDOR (Chapter 7): a long gothic-cyber run'n'gun. Pits full of servers, presses, steam, moving
 *  ledges, and the AI's swarm of grubby men in macs. At the far end, METAL GEAR KREX. */
function drongusCorridor(): RoomDef {
  const W = 8000;
  const f = (px: number) => px / W;
  const platforms: [number, number, number][] = [];
  const movers: [number, number, number, number, number, number][] = [];
  const floorGaps: [number, number][] = [];
  const hazards: NonNullable<RoomDef["hazards"]> = [];
  for (let i = 0; i < 8; i++) {
    const x0 = 520 + i * 720;
    const kind = i % 3;
    if (kind === 0) {
      // a pit of servers, a lift over it, stepping stones up high
      floorGaps.push([f(x0 + 170), 200]);
      movers.push([f(x0 + 270), 130, 120, 0, 70, 2200 + i * 100]);
      platforms.push([f(x0), 120, 180], [f(x0 + 500), 150, 200], [f(x0 + 290), 270, 150]);
    } else if (kind === 1) {
      // the presses: under them, or over the top
      hazards.push({ kind: "crusher", x: f(x0 + 210), w: 120, period: 2300, offset: i * 300 }, { kind: "crusher", x: f(x0 + 490), w: 120, period: 2100, offset: i * 300 + 900 });
      platforms.push([f(x0 + 60), 140, 160], [f(x0 + 350), 240, 200], [f(x0 + 640), 140, 150]);
    } else {
      // a wide pit, two moving ledges, and the high road
      floorGaps.push([f(x0 + 130), 320]);
      movers.push([f(x0 + 215), 140, 110, 55, 0, 2600], [f(x0 + 385), 200, 110, 0, 80, 2000]);
      platforms.push([f(x0 + 40), 220, 140], [f(x0 + 580), 160, 220], [f(x0 + 300), 320, 170]);
      hazards.push({ kind: "steam", x: f(x0 + 660), period: 2600 });
    }
  }
  // a last few ledges before the arena
  platforms.push([f(6300), 130, 200], [f(6520), 230, 160]);
  const N = "nonce";
  return {
    name: "Da Drongus Corridor",
    view: "side",
    w: W,
    h: 540,
    theme: "citadel",
    backdrop: "c7d_bg_corridor",
    music: "c7_corridor",
    platforms,
    movers,
    floorGaps,
    pitColor: 0x2a0a1a,
    pitName: "THE SERVER PIT",
    hazards,
    crusherLabel: "DELETE",
    triggers: [
      [0.03, [[N, 4]]],
      [0.11, [[N, 4], ["nonce_fat", 1]]],
      [0.2, [["nonce_tall", 2], [N, 3]]],
      [0.29, [["nonce_fat", 2], [N, 4]]],
      [0.38, [["nonce_tall", 2], ["nonce_fat", 1], [N, 3]]],
      [0.47, [[N, 6], ["nonce_tall", 1]]],
      [0.56, [["nonce_fat", 2], ["nonce_tall", 2], [N, 2]]],
      [0.65, [[N, 5], ["nonce_fat", 2]]],
      [0.74, [["nonce_tall", 3], [N, 4]]],
    ],
    miniBoss: { id: "krex", at: 0.84, pa: CD.KREX_PA, music: "c7_krex" },
    enterLines: CD.CORRIDOR_ENTER,
    pa: CD.CORRIDOR_PA,
  };
}

/** THE ASCENT (Chapter 7): straight up the middle of the tower. The news, generated, on every landing.
 *  Half way up, an AI-generated Elon Musk on a rocket. */
function theAscent(): RoomDef {
  const STEPS = 46;
  const H = 115 + STEPS * 112 + 260;
  const platforms: [number, number, number][] = [];
  const movers: [number, number, number, number, number, number][] = [];
  const xs = [0.22, 0.52, 0.8, 0.5, 0.2, 0.42, 0.74, 0.5];
  for (let i = 0; i < STEPS; i++) {
    const h = 115 + i * 112;
    const fx = xs[i % xs.length];
    if (i % 4 === 3) movers.push([fx, h, 130, i % 2 ? 150 : 0, i % 2 ? 0 : 50, 2200 + (i % 3) * 400]);
    else platforms.push([fx, h, i % 3 === 0 ? 160 : 210]);
    if (i % 5 === 2) platforms.push([fx < 0.5 ? 0.88 : 0.12, h + 40, 120]);
    // a wide landing half way up, where Elon turns up
    if (i === 22) platforms.push([0.5, h + 56, 520]);
  }
  const top = 115 + STEPS * 112;
  platforms.push([0.5, top, 760]);
  const waves: [string, number][][] = [
    [["idf", 2], ["hamas", 2]],
    [["kamikaze", 3], ["news_drone", 1]],
    [["deepfake_anchor", 2], ["crypto_bro", 1]],
    [["idf", 2], ["hamas", 2], ["kamikaze", 1]],
    [["news_drone", 2], ["crypto_bro", 2]],
    [["kamikaze", 4]],
    [["idf", 2], ["hamas", 2], ["deepfake_anchor", 1]],
    [["news_drone", 2], ["kamikaze", 2], ["crypto_bro", 1]],
  ];
  const triggers: [number, [string, number][]][] = [];
  for (let i = 0; i < 15; i++) {
    const at = 0.02 + i * 0.065;
    if (at > 0.4 && at < 0.52) continue; // Elon's bit
    triggers.push([at, waves[i % waves.length]]);
  }
  return {
    name: "The Ascent",
    view: "side",
    tower: true,
    w: 960,
    h: H,
    theme: "citadel",
    music: "c7_ascent",
    platforms,
    movers,
    exitAt: [0.5, top],
    exitLabel: "THE TOP ↑",
    goal: "The top of the tower",
    triggers,
    miniBoss: { id: "elon", at: 0.46, pa: CD.ELON_PA, music: "c7_elon", hp: 0.75 },
    enterLines: CD.ASCENT_ENTER,
    pa: CD.ASCENT_PA,
  };
}

/** THE ANTHEM CORRIDOR (Chapter 7): no fighting. A very long gallery of every boss you've beaten, the honour guard
 *  saluting, the national anthem, and at the end a huge red door. */
function anthemCorridor(): RoomDef {
  const W = 9600;
  return {
    name: "The Anthem Corridor",
    view: "side",
    w: W,
    h: 540,
    theme: "citadel",
    backdrop: "c7d_bg_gallery",
    music: "ominous",
    event: "anthem",
    exitAt: [1 - 170 / W, 0],
    exitLabel: "",
    gunCrate: true,
    enterLines: CD.ANTHEM_ENTER,
  };
}

/** THE FINAL STAIRS (Chapter 7): no enemies. A long, slow, zig-zag climb round the top of the tower, past the storm,
 *  candles going out behind you, Drongus's voice echoing down. A black door at the top (E to open). */
function finalStairs(): RoomDef {
  const FLIGHTS = 9;
  const RISE = 112;
  const PER = 4;
  const platforms: [number, number, number][] = [];
  let h = 115;
  for (let f = 0; f < FLIGHTS; f++) {
    const right = f % 2 === 0;
    for (let i = 0; i < PER; i++) {
      const fx = right ? 0.2 + i * 0.17 : 0.8 - i * 0.17;
      // the last step of a flight is a wide landing
      platforms.push([fx, h, i === PER - 1 ? 240 : 150]);
      h += RISE;
    }
  }
  const top = h;
  platforms.push([0.5, top, 760]);
  return {
    name: "The Final Stairs",
    view: "side",
    tower: true,
    w: 960,
    h: top + 260,
    theme: "citadel",
    music: "c7_stairs",
    event: "stairs",
    platforms,
    exitAt: [0.5, top],
    exitLabel: "",
    enterLines: CD.STAIRS_ENTER,
  };
}

/** The Cronster's tower: a tall side-on climb, platform to platform, to the Squeezing Room at the top. */
function cuddleTower(): RoomDef {
  const STEPS = 54;
  const H = 115 + STEPS * 112 + 260;
  const platforms: [number, number, number][] = [];
  const movers: [number, number, number, number, number, number][] = [];
  const xs = [0.2, 0.5, 0.8, 0.55, 0.25, 0.45, 0.75];
  for (let i = 0; i < STEPS; i++) {
    const h = 115 + i * 112;
    const fx = xs[i % xs.length];
    // every so often the next step is a moving one
    if (i % 5 === 4) movers.push([fx, h, 130, i % 2 ? 150 : 0, i % 2 ? 0 : 50, 2400 + (i % 3) * 400]);
    else platforms.push([fx, h, i % 3 === 0 ? 170 : 220]);
    // a side ledge now and then, for breathing room (and supplies)
    if (i % 4 === 2) platforms.push([fx < 0.5 ? 0.88 : 0.12, h + 40, 120]);
  }
  // the landing at the top, where the Squeezing Room door is
  const top = 115 + STEPS * 112;
  platforms.push([0.5, top, 760]);
  const waves: [string, number][][] = [
    [["plushie", 4]],
    [["leaping_plushie", 2], ["plushie", 2]],
    [["candy_drone", 2], ["plushie", 2]],
    [["jingle_turret", 1], ["plushie", 3]],
    [["crobley_minion", 5]],
    [["gobstopper", 1], ["plushie", 3]],
    [["leaping_plushie", 2], ["candy_drone", 1]],
    [["candy_drone", 2], ["crobley_minion", 4]],
    [["gobstopper", 2], ["leaping_plushie", 2]],
    [["plushie", 4], ["candy_drone", 2]],
  ];
  // a wave every few floors, with short breathers in between
  const triggers: [number, [string, number][]][] = [];
  for (let i = 0; i < 16; i++) triggers.push([0.02 + i * 0.061, waves[i % waves.length]]);
  return {
    name: "The Cuddle Tower",
    view: "side",
    tower: true,
    w: 960,
    h: H,
    theme: "mansion",
    music: "cronny",
    platforms,
    movers,
    exitAt: [0.5, top],
    triggers,
    enterLines: [
      { s: "NARRATOR", t: "The trail of chocolate wrappers ends at a door with a heart-shaped letterbox. Behind it: a tower. A colossal gothic tower, all black stone and pink stained glass, candles burning on every ledge. Every window shows a heart. Every banner shows a cuddle. Some of them are of you.", dir: true },
      { s: "NARRATOR", t: "A note pinned to the first step, in disturbingly cheery handwriting: 'Come up to the top, love. Ol' Cronny's waiting. I'll cuddle you, squeeze you, and extract all your lovely juices :)'", dir: true },
      { s: "NARRATOR", t: "CLIMB: W jump (again in the air to double jump) · A / D move · S drop through · shoot as normal. Get to the very top and the Squeezing Room opens. You don't have to kill everything. Grab the supplies on the ledges on the way.", dir: true },
    ],
  };
}

/** Begour's café: the SanMikverse hang-out (no fighting). */
const SANMIK_HANGOUT: RoomDef = {
  name: "Begour's Café (Catford)",
  w: 1800,
  h: 540,
  theme: "mansion",
  backdrop: "sm_hangout",
  platforms: [[0.42, 110, 200], [0.62, 200, 160]],
  props: [
    {
      kind: "talker",
      x: 0.17,
      y: 0.5,
      image: "p_begour",
      label: "BEGOUR THE BEAR (café)",
      action: "begour_hug",
      lines: [
        { s: "BEGOUR THE BEAR", t: "Oh hiya! Come in, come in. I'm Begour. I'm a bear. Don't worry, I'm a nice one. Mind the step." },
        { s: "BEGOUR THE BEAR", t: "You'll want a cuppa. And a hug. Everyone wants a hug when they first get here. It's a lot, Catford." },
        { s: "BEGOUR THE BEAR", t: "I'm the one who rings SanMik with bad news. Somebody has to. I always say sorry first. Then I fart, because it helps. It's lavender. Honestly. Have a sniff." },
        { s: "NARRATOR", t: "It is lavender. It is, against every law of nature, lovely.", dir: true },
        { s: "BEGOUR THE BEAR", t: "Now, that Genie. Ten thousand years in a lamp, love. He just wants a bath. A proper one. He says he'll send you all home if he gets one." },
        { s: "BEGOUR THE BEAR", t: "Only tub big enough is the Giant Hot Tub of Catford, and it's been broken for weeks. Something's blocking the jets. Something… big. Take the lads. Pop back if you need a hug." },
        { s: "BEGOUR THE BEAR", t: "Come here. Big hug. There we go. Off you pop, love." },
      ],
    },
    {
      kind: "talker",
      x: 0.3,
      y: 0.5,
      image: "p_gabor",
      label: "GABOR THE GOAT (kick him?)",
      action: "kick_gabor",
      lines: [
        { s: "GABOR THE GOAT", t: goat("Oh! Oh god. A person. Hello. Sorry. Hello. I'm Gabor. I'm a goat. I'm SanMik's best friend. He said so. He also said he'd make a curry out of me.") },
        { s: "GABOR THE GOAT", t: goat("Do you think he meant it? The curry? Please say yes. No. Please say no. I don't know what I want. I never know what I want.") },
        { s: "GABOR THE GOAT", t: goat("Could you kick me? Just a little one. On the bum. I don't deserve it. That's why I want it.") },
        { s: "GABOR THE GOAT", t: goat("Ow. OW. Thank you. Again? No. Yes. No. Yes.") },
        { s: "GABOR THE GOAT", t: goat("That one was a bit soft. I'm not complaining. I am complaining. Do it properly.") },
        { s: "GABOR THE GOAT", t: goat("Is this what love feels like? It's what it feels like for me.") },
        { s: "GABOR THE GOAT", t: goat("SanMik never kicks me. He just threatens. It's worse. It's so much worse. I love it. Help me.") },
        { s: "GABOR THE GOAT", t: goat("Sorry. Sorry for asking. Sorry for saying sorry. Kick me for saying sorry.") },
      ],
    },
    {
      kind: "talker",
      x: 0.5,
      y: 0.5,
      image: "p_hottub",
      label: "THE HOT TUB",
      action: "hottub",
      lines: [
        { s: "SANCHZ", t: "It's SanChz (in the hot tub)…" },
        { s: "SANMIK", t: "And SanMik (in the hot tub)… lots of bubbles (in the hot tub)… lots of trouble (in the hot tub)…" },
        { s: "SANCHZ", t: "No girls are (in the hot tub)…" },
        { s: "SANMIK", t: "Feeling horny (in the hot tub)…" },
        { s: "NARRATOR", t: "A slice of pizza drifts past. It is very wet. SanMik eats it. 'Wet pizza (in the hot tub)', he says. 'Dreams come true (in the hot tub).' You feel strangely restored.", dir: true },
      ],
    },
    {
      kind: "talker",
      x: 0.66,
      y: 0.5,
      image: "spr_SANMIK",
      label: "SANMIK",
      lines: [
        { s: "SANMIK", t: "Yee. This is the hang out, blud. Begour does a lovely flapjack. Don't tell no one I said lovely." },
        { s: "SANMIK", t: "I'm the fucking best. Michael Jackson is second best. I am also best dressed. Gok Wan is the second best dressed." },
        { s: "SANMIK", t: "Everyone knows I'm solid. No cunt touches me. Except Begour. For hugs. That's allowed. That's in the rules what I wrote." },
      ],
    },
    {
      kind: "talker",
      x: 0.76,
      y: 0.5,
      image: "spr_FOLK2",
      label: "UNCLE RIK",
      lines: [
        { s: "UNCLE RIK", t: "'Ello. It's Uncle Rik. I need a shit real bad. Yee." },
        { s: "SANMIK", t: "NOT IN THE HOT TUB RIK. You mustn't wee or poo in the hot tub. It's in the song." },
        { s: "UNCLE RIK", t: "…What song?" },
        { s: "NARRATOR", t: "Uncle Rik waddles off towards Begour's caravan toilet. Begour, from inside: 'Oh. Oh, Rik, love, give it five minutes, I've just done the floor.'", dir: true },
      ],
    },
    {
      kind: "talker",
      x: 0.86,
      y: 0.5,
      image: "p_vending",
      label: "PEPSI MACHINE",
      action: "pepsi",
      lines: [
        { s: "NARRATOR", t: "Pepsi Max. Clunk. Lovely.", dir: true },
        { s: "NARRATOR", t: "Pepsi Normal. Clunk. It's flat. It's the wish one. It's always the wish one.", dir: true },
        { s: "GABOR THE GOAT", t: goat("Can I have the can after? I like to be hit with them.") },
      ],
    },
    {
      kind: "talker",
      x: 0.07,
      y: 0.5,
      image: "p_tv",
      label: "JUKEBOX",
      action: "jukebox",
      lines: [],
    },
  ],
};

const SANMIK_ARRIVAL: RoomDef["enterLines"] = [
  { s: "NARRATOR", t: "THE SANMIKVERSE. You land on some decking, in a back yard in what is definitely, allegedly, Catford. Fairy lights. A caravan with CAFÉ painted on the side. A hot tub. The sky is the colour of Pepsi Max.", dir: true },
  { s: "SANMIK", t: "CATFORD! Yee! I'm HOME, blud!" },
  { s: "NARRATOR", t: "A phone rings in the caravan. A big furry arm passes SanMik a flip phone through the hatch.", dir: true },
  { s: "BEGOUR THE BEAR", t: "Hiya SanMik love, it's Begour. I'm ever so sorry to do this. It's about Dawna. She's… she's broken up with you, love." },
  { s: "BEGOUR THE BEAR", t: "Smell my fart. It's lavender. It'll help, I promise." },
  { s: "NARRATOR", t: "SanMik grows another head. Then he does a cartwheel. Then he breakdances on the decking. Both heads are crying.", dir: true },
  { s: "BEGOUR THE BEAR", t: "Oh, come here. Both of you. Both heads. Big hug." },
  { s: "GENIE", t: "(from inside the lamp, muffled) TEN THOUSAND YEARS. I WANT A BATH. A HOT ONE. WITH JETS. FIX THE GIANT HOT TUB OF CATFORD AND I WILL SEND YOU HOME. UNTIL THEN, NOBODY LEAVES." },
  { s: "NARRATOR", t: "SIDE-ON CONTROLS: A / D to run · W (or up) to jump, press again in the air to double jump · S to drop through platforms · aim and attack with the mouse as normal · Space to dash. The exit is on the far right. Talk to everyone first. Begour gives hugs (they heal).", dir: true },
];

export const DUNGEONS: Record<string, DungeonDef> = {
  wildern: {
    id: "wildern",
    chapter: 1,
    name: "WILDERN ACADEMY",
    music: "crandle",
    rooms: [
      {
        name: "Wildern Corridor",
        w: 1200,
        h: 720,
        theme: "school",
        waves: [[["smolt", 6]], [["dinner_lady", 2], ["smolt", 4]]],
        enterLines: [
          { s: "NARRATOR", t: "Wildern Academy (Krelford branch). They also have a Wildern in Krelford. That was the first lore. The corridors smell of fish fingers and, faintly, pussy juice. Every classroom door has the same thing chalked on it: 'SPELL IT'.", dir: true },
          { s: "NARRATOR", t: "CONTROLS: WASD move · Mouse aim · Left click attack · Right click / F special · Space dodge · Q pussy juice · B fizzy bongo · R Krezz Burst (full Wonk) · E interact · Esc pause", dir: true },
        ],
      },
      {
        name: "The Cafeteria",
        w: 1300,
        h: 780,
        theme: "school",
        waves: [[["wisp", 3], ["smolt", 5]], [["tray_turret", 2], ["dinner_lady", 2], ["gravy_lobber", 2]]],
        props: [
          { kind: "wonking_machine", x: 0.5, y: 0.22, id: "wm_cafeteria" },
          { kind: "vending", x: 0.12, y: 0.2, id: "v_caf1" },
        ],
        enterLines: [
          { s: "NARRATOR", t: "The Wildern cafeteria. In the corner: the Wonking Machine. Lever, pressure gauge, red button. A sticky note reads: 'PLEASE SAY SOMETHING ABOUT ME — S.'", dir: true },
        ],
      },
      {
        name: "The Boiler Room",
        w: 1200,
        h: 760,
        theme: "school",
        waves: [[["smolt", 8], ["wisp", 2]], [["dinner_lady", 3], ["tray_turret", 2]], [["gravy_lobber", 2], ["smolt", 6]]],
        props: [{ kind: "vending", x: 0.88, y: 0.2, id: "v_boiler" }],
      },
      {
        name: "The Headmaster's Office (on top of the Main)",
        w: 1300,
        h: 820,
        theme: "school",
        boss: "krandall",
      },
    ],
  },
  polson_towers: {
    id: "polson_towers",
    chapter: 2,
    name: "POLSON TOWERS",
    music: "stockport",
    rooms: [
      {
        name: "Polson Towers — The Hallway",
        w: 1200,
        h: 720,
        theme: "mansion",
        waves: [[["plushie", 4], ["trinket", 4]], [["plushie", 5], ["trinket", 6]]],
        enterLines: [
          { s: "NARRATOR", t: "Polson Towers. It's his house. You can't see the floor. You can't see the walls. You can see a lot of stuffed toys, and some of them are moving.", dir: true },
          { s: "POLSON", t: "(on the phone) Shoes off. Actually, shoes on. Definitely shoes on." },
          { s: "POLSON", t: "(on the phone) Most of that's Eden's. I'm not really allowed to move it. I've never been allowed to move it." },
          { s: "KREZMAR", t: "It's YOUR house, Polson. Every bag that goes out, a bit more of you comes back." },
          { s: "NARRATOR", t: "Objective: clear out Eden's stuff. Room by room. Give Polson his house back.", dir: true },
        ],
      },
      {
        name: "The Kitchen — The Mould Zone",
        w: 1300,
        h: 760,
        theme: "industrial",
        waves: [[["mould", 3], ["cheese_mite", 6]], [["mould_pizza", 2], ["mould", 3], ["leaping_plushie", 2]], [["mould_pizza", 3], ["cheese_mite", 6]]],
        props: [{ kind: "vending", x: 0.9, y: 0.15, id: "v_kitchen" }],
        enterLines: [
          { s: "NARRATOR", t: "The kitchen. Every surface is takeaway. Some of the takeaway has developed opinions.", dir: true },
          { s: "POLSON", t: "(on the phone) There's a spagon bol-bol in there from about March. Don't make eye contact with it." },
          { s: "POLSON", t: "(on the phone) Eden said she'd sort the kitchen. That was before March." },
          { s: "NARRATOR", t: "A note on the fridge, in Eden's handwriting: 'DO NOT THROW ANYTHING AWAY. I MIGHT NEED IT.' It is pinned under a magnet shaped like a smaller magnet.", dir: true },
          { s: "KREBLIS", t: "Breaking news: the bin is empty. It has always been empty. Nobody in this house has ever used the bin." },
        ],
      },
      {
        name: "The Bedroom — Stuffed Toy Mountain",
        w: 1300,
        h: 780,
        theme: "mansion",
        waves: [[["plushie", 6], ["trinket", 6]], [["plushie", 5], ["mould", 2], ["trinket", 6]], [["leaping_plushie", 3], ["gravy_lobber", 2]]],
        enterLines: [
          { s: "NARRATOR", t: "The bedroom. A mountain of stuffed toys reaches the ceiling. At the summit, a hamster watches you with serene, total calm.", dir: true },
          { s: "POLSON", t: "(on the phone) Is the hamster alright? Tell him I love him." },
          { s: "POLSON", t: "(on the phone) The toys are Eden's. Every one has a name. I'm not allowed on that side of the bed. I sleep on the edge, like a plank." },
          { s: "NARRATOR", t: "Each stuffed toy wears a tiny label: 'EDEN'S. DO NOT TOUCH.' One of the labels says 'POLSON'S'. It's on the hamster. It's the only thing in the room with his name on it.", dir: true },
          { s: "MIKEY", t: "(ping) Bin bags. Divide and conquer." },
        ],
      },
      {
        name: "The Living Room",
        w: 1300,
        h: 820,
        theme: "mansion",
        boss: "hoard",
        enterLines: [
          { s: "NARRATOR", t: "The living room. Everything Eden ever bought, kept, was given, or found, piled into one shape. Underneath it, somewhere, is Polson's sofa. And the router. And something that throbs.", dir: true },
          { s: "POLSON", t: "(on the phone) That's all of it. All of her stuff. If it goes... it's just my house again. Just me." },
          { s: "POLSON", t: "(on the phone) Fifty percent towards breaking up. Fifty-five. Clear it. Clear the lot." },
        ],
      },
    ],
  },
  ministry: {
    id: "ministry",
    chapter: 3,
    name: "THE MINISTRY OF BONER CONTROL (CRONNY'S LAIR)",
    music: "ominous",
    rooms: [
      cuddleTower(),
      {
        name: "Da Squeezing Room",
        w: 1100,
        h: 720,
        theme: "mansion",
        boss: "cronster",
      },
      {
        name: "Mollor's Cell",
        w: 1000,
        h: 640,
        theme: "mansion",
        exitFlag: "mollor_freed",
        gunCrate: true,
        exitHint: "Untie Mollor first (E).",
        props: [
          { kind: "mollor", x: 0.5, y: 0.32, id: "mollor" },
          { kind: "bertha", x: 0.86, y: 0.28, id: "bertha" },
        ],
        enterLines: [{ s: "NARRATOR", t: "Behind Da Squeezing Room: a small pink cell full of beanbags. Tied to a chair in the middle, very cross, is Mollor.", dir: true }],
      },
    ],
  },
  citadel: {
    id: "citadel",
    chapter: 7,
    name: "DA DRONGUS DUNGEON",
    music: "c7_dungeon",
    rooms: [
      {
        name: "The Foyer",
        w: 1300,
        h: 860,
        theme: "citadel",
        enterLines: CD.FOYER_ENTER,
        pa: CD.FOYER_PA,
        waves: [
          [["ai_pitbull", 4]],
          [["ai_pitbull", 3], ["ai_pitbull_twin", 2]],
          [["ai_pitbull_spider", 3], ["ai_pitbull", 2], ["ai_pitbull_twin", 1]],
          [["ai_pitbull_twin", 2], ["ai_pitbull_spider", 3], ["ai_pitbull", 2]],
        ],
        gunCrate: true,
      },
      drongusCorridor(),
      theAscent(),
      anthemCorridor(),
      {
        name: "The Inner Sanctum",
        w: 1300,
        h: 900,
        theme: "citadel",
        event: "drongus1",
        boss: "drongus1",
        music: "c7_drongus1",
        goal: "He's run up the stairs. Through the door at the back.",
        enterLines: CD.SANCTUM_ENTER,
      },
      finalStairs(),
      {
        name: "The Top Of The Tower",
        view: "side",
        w: 960,
        h: 540,
        theme: "citadel",
        backdrop: "bg_lair",
        music: "c7_deranged",
        event: "drongus2",
        boss: "drongus2",
        goal: "He's gone through the roof. When you're ready: the cauldron.",
        platforms: [[0.17, 150, 200], [0.83, 150, 200], [0.5, 290, 260]],
        enterLines: CD.OFFICE_ENTER,
      },
      // THE FINALE, part one: the cauldron fires you up onto the roof. The lads in frames, DARK DRONGUS, the group wonk,
      // then the group krezz and the collapse (src/game/scenes/citadel/RoofArena.ts, RoofCutscene.ts). It ends in Krelford.
      {
        name: "The Roof",
        w: 1240,
        h: 1100,
        theme: "citadel",
        event: "roof",
        music: "c7_stairs",
      },
    ],
  },

  // THE FINALE, part two: back in Krelford. THE CONCEPT OF PAEDOPHILIA (src/game/scenes/finale/KrelfordFinale.ts runs
  // the whole fight; the side-on cutscenes are FinaleScene). The arena is ruined Krelford itself.
  krelford_finale: {
    id: "krelford_finale",
    chapter: 7,
    name: "KRELFORD",
    music: "c7_concept",
    rooms: [{ name: "What's Left Of Krelford", w: 2400, h: 1680, theme: "industrial", music: "c7_concept" }],
  },

  airport: {
    id: "airport",
    chapter: 6,
    name: "FLIGHT KR-069: OPERATION PLANE INTO TRAIN",
    music: "krel_tower_rap",
    returnAt: "AIRPORT",
    rooms: [
      {
        name: "Flight KR-069: The Aisle",
        w: 2200,
        h: 380,
        theme: "industrial",
        waves: [[["bandit", 5], ["trolley", 1]], [["bandit_gunner", 3], ["trolley", 2]], [["bandit", 4], ["bandit_gunner", 2]]],
        enterLines: [
          { s: "NARRATOR", t: "You're on. Seatbelt sign on. The cabin crew are all wearing balaclavas. Captain Stanley hires on attitude. One of them is serving drinks out of a possessed trolley.", dir: true },
          { s: "MIKEY", t: "(over the radio) That's Captain Stanley's crew. Thirty years, never once been hijacked. They will NOT like you hijacking their plane.", cond: { notPlayer: "MIKEY" } },
          { s: "NARRATOR", t: "Fight down the aisle to the cockpit. Excuse yourself to the passengers. Or don't.", dir: true },
        ],
      },
      {
        name: "Flight KR-069: The Cockpit",
        w: 1100,
        h: 700,
        theme: "industrial",
        boss: "krozno",
      },
    ],
  },
  arena_brand: {
    id: "arena_brand",
    chapter: 0,
    name: "KRELFORD UNIVERSITY SPORTS HALL — BJJ OPEN",
    music: "boss_arena",
    arenaFlag: "arc_fl_brand",
    returnAt: "UNIVERSITY",
    rooms: [{ name: "The Mats", w: 1100, h: 720, theme: "school", boss: "brand" }],
  },
  arena_troll: {
    id: "arena_troll",
    chapter: 0,
    name: "THE KREZZ ARMS BACK ROOM — BLUES NIGHT",
    music: "boss_arena",
    arenaFlag: "arc_kz_troll",
    returnAt: "PUB",
    rooms: [{ name: "Blues Night", w: 1100, h: 720, theme: "mansion", boss: "troll" }],
  },
  arena_lukemind: {
    id: "arena_lukemind",
    chapter: 0,
    name: "INSIDE LULON'S MIND",
    music: "mdmazing",
    arenaFlag: "lukemind_cleansed",
    returnAt: "POLICE",
    rooms: [
      {
        name: "The Frontal Lobe (Sticky)",
        w: 1100,
        h: 720,
        theme: "mind",
        waves: [[["mind_imp", 5]], [["mind_imp", 4], ["custard_demon", 2]]],
        enterLines: [
          { s: "NARRATOR", t: "Inside Lulon's mind. The floor is warm custard. The sky is the inside of a pudding dish. Somewhere, far off, a caravan creaks.", dir: true },
          { s: "NARRATOR", t: "Little pink demons crawl out of the crust. They have one word, and they are going to use it.", dir: true },
        ],
      },
      {
        name: "The Temptation Lobe",
        w: 1100,
        h: 720,
        theme: "mind",
        waves: [[["custard_demon", 2], ["mind_imp", 4]], [["pudding_fiend", 2], ["mind_imp", 3]], [["pudding_fiend", 1], ["custard_demon", 2], ["mind_imp", 4]]],
        enterLines: [{ s: "NARRATOR", t: "Deeper in. The walls are lined with memories of the abandoned building, every one of them in a little dish, every one of them still warm. You keep your eyes on the floor.", dir: true }],
      },
      { name: "The Pudding Dish (Bottom Of The Mind)", w: 1100, h: 720, theme: "mind", boss: "pudding_demon" },
    ],
  },
  arena_flatmate: {
    id: "arena_flatmate",
    chapter: 0,
    name: "THE OLD FLAT",
    music: "boss_arena",
    arenaFlag: "arc_gr_flatmate",
    returnAt: "OLD_FLAT",
    rooms: [{ name: "The Living Room (carpet: destroyed)", w: 1100, h: 720, theme: "mansion", boss: "flatmate" }],
  },
  arena_rival: {
    id: "arena_rival",
    chapter: 0,
    name: "KRUNCH GYM — THE SQUAT RACK OF DESTINY",
    music: "boss_arena",
    arenaFlag: "arc_kw_rival",
    returnAt: "GYM",
    rooms: [{ name: "The Free Weights Section", w: 1200, h: 760, theme: "industrial", boss: "rival" }],
  },
  arena_sanmik: {
    id: "arena_sanmik",
    chapter: 0,
    view: "side",
    name: "THE SANMIKVERSE (CATFORD, ALLEGEDLY)",
    music: "sanmik",
    arenaFlag: "sanmik_catford",
    returnAt: "PUB",
    rooms: [
      { ...SANMIK_HANGOUT, enterLines: SANMIK_ARRIVAL, then: ["cam2cam"] },
      {
        name: "Catford High Street",
        w: 3400,
        h: 540,
        theme: "industrial",
        backdrop: "sm_street",
        sanBros: true,
        platforms: [[0.12, 120, 200], [0.2, 230, 160], [0.36, 130, 220], [0.5, 230, 180], [0.62, 130, 220], [0.78, 230, 160], [0.88, 130, 200]],
        floorGaps: [[0.27, 150], [0.55, 170], [0.7, 150]],
        pitColor: 0x111827,
        pitName: "OPEN MANHOLE",
        movers: [[0.29, 120, 110, 0, 60, 2600], [0.575, 140, 120, 70, 0, 3000]],
        hazards: [{ kind: "steam", x: 0.44, period: 3200 }, { kind: "steam", x: 0.83, period: 2800 }],
        triggers: [[0.04, [["catford_fox", 6]]], [0.22, [["catford_fox", 5], ["imaginary_mandem", 2], ["bone_lobber", 2]]], [0.4, [["corn_turd", 4], ["catford_fox", 4], ["big_dave", 1]]], [0.6, [["imaginary_mandem", 3], ["wet_pizza", 2], ["bone_lobber", 2]]], [0.78, [["corn_turd", 4], ["wet_pizza", 2], ["catford_fox", 5], ["bone_lobber", 2]]]],
        enterLines: [
          { s: "NARRATOR", t: "Catford High Street, as remembered by a man on three energy drinks. Kebab shop. Bookies. Pound shop. Open manholes everywhere, because the council 'is getting to it'. The kebab shop extractor fans vent pure grease steam onto the pavement.", dir: true },
          { s: "SANMIK", t: "YEEE! San Brothers, assemble! SanChz, you're on food. I'm on bars." },
          { s: "SANCHZ", t: "YEGHHH." },
          { s: "NARRATOR", t: "SANMIK and SANCHZ have joined you. They fight on their own. When you krezz (R), SanMik does his version: the SLOPPY SURPRISE. Jump the manholes. Mind the steam.", dir: true },
        ],
      },
      {
        name: "Job Centre Plus (Catford Branch)",
        w: 2600,
        h: 540,
        theme: "industrial",
        backdrop: "sm_jobcentre",
        sanBros: true,
        exitFlag: "sm_donut",
        exitHint: "Where's SanChz? He went to the toilet twenty minutes ago. Check the STAFF TOILET.",
        hazards: [{ kind: "crusher", x: 0.4, w: 120, period: 2700 }, { kind: "crusher", x: 0.72, w: 120, period: 2400, offset: 900 }],
        crusherLabel: "FORMS",
        movers: [[0.86, 150, 120, 0, 70, 2400]],
        platforms: [[0.18, 110, 240], [0.3, 210, 200], [0.45, 120, 300], [0.6, 220, 200], [0.75, 120, 260]],
        waves: [[["jobcentre", 3], ["catford_fox", 5]], [["jobcentre", 3], ["pepsi_normal", 4], ["hottub_bubble", 3]], [["imaginary_mandem", 3], ["corn_turd", 4], ["jobcentre", 2]]],
        props: [
          {
            kind: "talker",
            x: 0.9,
            y: 0.5,
            image: "p_door_locked",
            label: "STAFF TOILET (ENGAGED)",
            action: "donut",
            lines: [],
          },
        ],
        enterLines: [
          { s: "NARRATOR", t: "The Catford Job Centre Plus. A sign says 'NO HOT TUBS'. Somebody has crossed out 'NO'.", dir: true },
          { s: "SANCHZ", t: "MC Polsonator. Signing on. Big up the Job Centre Plus. YEGHHH." },
          { s: "NARRATOR", t: "The advisors rise from behind their desks. They have clipboards. They have questions about your availability.", dir: true },
        ],
      },
      {
        name: "The Job Centre Car Park",
        w: 1600,
        h: 540,
        theme: "industrial",
        backdrop: "sm_street",
        sanBros: true,
        platforms: [[0.2, 140, 220], [0.5, 230, 260], [0.8, 140, 220]],
        boss: "jam",
        then: ["norwich", "beepbeep", "drive"],
      },
      {
        name: "The Nu Warehouse",
        w: 3600,
        h: 540,
        theme: "industrial",
        backdrop: "nu_warehouse",
        music: "mdmazing",
        trip: true,
        sanBros: true,
        platforms: [[0.1, 130, 180], [0.22, 240, 160], [0.34, 140, 200], [0.48, 250, 180], [0.62, 140, 200], [0.76, 250, 160], [0.88, 140, 200]],
        floorGaps: [[0.29, 140], [0.56, 160]],
        pitColor: 0x7c3aed,
        pitName: "THE VOID (EUPHORIC)",
        movers: [[0.305, 130, 110, 0, 70, 2200], [0.58, 150, 110, 80, 0, 2800], [0.7, 260, 120, 0, 60, 2000]],
        hazards: [{ kind: "steam", x: 0.18, period: 2600 }, { kind: "steam", x: 0.44, period: 2400 }, { kind: "steam", x: 0.82, period: 2200 }],
        triggers: [[0.05, [["loved_up", 4]]], [0.22, [["loved_up", 3], ["glowstick_lobber", 1]]], [0.4, [["comedown", 1], ["loved_up", 3]]], [0.58, [["rave_bouncer", 1], ["loved_up", 3]]], [0.76, [["comedown", 2], ["glowstick_lobber", 1]]]],
        enterLines: [
          { s: "NARRATOR", t: "THE NU WAREHOUSE. A derelict warehouse on the edge of Catford, shaking at the seams. Lasers. Smoke. Five hundred people in bucket hats. On the decks, playing it for the ninth time in a row: 'MDMAzing'.", dir: true },
          { s: "SANMIK", t: "Yee. Here. Have this." },
          { s: "NARRATOR", t: "He presses something small into your hand. It is shaped like a goat. It is pink. It has 'YEE' stamped on it.", dir: true },
          { s: "SANMIK", t: "Magic pill. Basically a vitamin. Gets you in the zone, innit. Can't fix a hot tub without being in the zone." },
          { s: "SANCHZ", t: "YEGHHH. I've had four." },
          { s: "NARRATOR", t: "You take the magic pill.", dir: true },
          { s: "NARRATOR", t: "For a moment, nothing. Then the bass drops, and so does the floor of reality. The warehouse is still here, but it is also, somehow, the bottom of the ocean. A jellyfish is dancing with a bouncer. The lasers taste purple. You love everyone. A flower says hello. You say hello back. Some of the ravers still want a fight, but you don't have to stop for them: just dance your way to the far end.", dir: true },
          { s: "SANMIK", t: "SEE?! MDMAZING! YEEEEE!" },
        ],
      },
      {
        name: "The Giant Hot Tub of Catford",
        w: 1700,
        h: 540,
        theme: "temple",
        backdrop: "sm_bigtub",
        sanBros: true,
        platforms: [[0.18, 150, 200], [0.5, 250, 220], [0.82, 150, 200]],
        boss: "rik",
      },
    ],
  },
  rik_colon: {
    id: "rik_colon",
    chapter: 5,
    name: "INSIDE UNCLE RIK (THE TRANSVERSE COLON)",
    music: "ominous",
    returnAt: "PUB",
    rooms: [
      {
        name: "Uncle Rik's Transverse Colon",
        w: 1500,
        h: 900,
        theme: "colon",
        event: "colon",
        exitFlag: "rik_bombs_done",
        exitHint: "There's no way out but through. Plant all four bombs.",
        waves: [[["gerbil", 6], ["poo", 3]], [["tumor", 3], ["gerbil", 5]], [["poo", 4], ["tumor", 2], ["gerbil", 7]]],
        props: [
          { kind: "crystal_wall", x: 0.5, y: 0.2, id: "rik_crystal" },
          { kind: "bomb_spot", x: 0.14, y: 0.36, id: "b1" },
          { kind: "bomb_spot", x: 0.86, y: 0.36, id: "b2" },
          { kind: "bomb_spot", x: 0.2, y: 0.82, id: "b3" },
          { kind: "bomb_spot", x: 0.8, y: 0.82, id: "b4" },
        ],
        enterLines: [
          { s: "NARRATOR", t: "You are four millimetres tall, and you are inside Uncle Rik's large intestine. Specifically the transverse colon. The walls are pink, ridged (haustra) and wet (mucosa). They are slowly contracting (peristalsis).", dir: true },
          { s: "GENIE", t: "(on the radio, from the lamp) Peristalsis. That's the squeezing. Don't touch the walls. Don't touch ANYTHING. Oh god, I'm going to be sick in my own lamp." },
          { s: "SANMIK", t: "(on the radio) Find the crystal. Plant the bombs. Get out. Yee." },
          { s: "NARRATOR", t: "Something in the dark is gnawing. Something else is screaming about being cancerous. TIP: prise the cum crystal out of the wall, then plant all four bombs (E on the red circles).", dir: true },
        ],
      },
    ],
  },
  crobley_factory: {
    id: "crobley_factory",
    chapter: 4,
    view: "side",
    name: "THE CROBLEY FACTORY",
    music: "crobley_factory",
    arenaFlag: "crobley_factory_done",
    returnAt: "CROBLEY_FACTORY",
    rooms: [
      {
        name: "The Factory Floor",
        w: 3600,
        h: 540,
        theme: "industrial",
        backdrop: "cf_floor",
        platforms: [],
        ledges: [[56, 222, 78], [0, 96, 162], [150, 256, 163], [280, 368, 205], [354, 404, 126], [436, 512, 127], [436, 512, 205]],
        floorGaps: [[0.2, 170], [0.43, 200], [0.66, 180]],
        pitColor: 0x5b3416,
        pitName: "CHOCOLATE RIVER",
        movers: [[0.22, 120, 110, 0, 70, 2400], [0.455, 140, 120, 90, 0, 2800], [0.68, 130, 110, 0, 80, 2200]],
        hazards: [{ kind: "crusher", x: 0.27, w: 130, period: 2600 }, { kind: "steam", x: 0.34, period: 3000 }, { kind: "crusher", x: 0.6, w: 130, period: 2300, offset: 800 }, { kind: "steam", x: 0.78, period: 2600 }, { kind: "crusher", x: 0.86, w: 130, period: 2500, offset: 1500 }],
        crusherLabel: "CROBLEY PRESS",
        triggers: [[0.03, [["crobley_minion", 8]]], [0.14, [["crobley_minion", 5], ["candy_drone", 2], ["gobstopper", 2]]], [0.28, [["crobage", 3], ["crobley_minion", 4], ["leaping_crobage", 2]]], [0.4, [["crobley_guard", 3], ["candy_drone", 2], ["jingle_turret", 1]]], [0.55, [["crobage", 3], ["crobley_minion", 6], ["gobstopper", 2]]], [0.7, [["crobley_guard", 3], ["candy_drone", 3], ["leaping_crobage", 2]]], [0.84, [["crobage", 3], ["crobley_guard", 2], ["crobley_minion", 6], ["jingle_turret", 1]]]],
        enterLines: [
          { s: "NARRATOR", t: "THE CROBLEY FACTORY. Brass machines the size of houses. Conveyor belts of pink Crobleys stretching into the distance. A chocolate river runs straight through the factory floor, uncovered, because Reinhardt fired the health and safety team for being 'woke'.", dir: true },
          { s: "NARRATOR", t: "Over the tannoy, on a loop, a child singing 'Nibble on a Crobley'. The workers have been replaced by brainwashed Crobleys and very large sausages in hi-vis.", dir: true },
          { s: "NARRATOR", t: "RUN AND GUN: push right and they come to you. A / D run · W jump (again in the air to double jump) · S drop through · aim and fire as normal. Don't fall in the chocolate. Don't stand under the presses.", dir: true },
        ],
      },
      {
        name: "The Packing Line",
        w: 3400,
        h: 540,
        theme: "industrial",
        backdrop: "cf_packing",
        platforms: [],
        ledges: [[100, 512, 188], [300, 380, 129], [448, 512, 112], [0, 96, 238]],
        floorGaps: [[0.25, 160], [0.53, 190], [0.79, 170]],
        pitColor: 0xdb2777,
        pitName: "THE CANDY CHUTE",
        movers: [[0.27, 130, 110, 0, 80, 2200], [0.555, 150, 120, 80, 0, 2600], [0.81, 130, 110, 0, 70, 2000]],
        hazards: [{ kind: "crusher", x: 0.16, w: 130, period: 2200 }, { kind: "crusher", x: 0.42, w: 130, period: 2000, offset: 600 }, { kind: "crusher", x: 0.66, w: 130, period: 2400, offset: 1200 }, { kind: "steam", x: 0.9, period: 2400 }],
        crusherLabel: "WRAPPER",
        triggers: [[0.04, [["crobley_minion", 7], ["candy_drone", 2]]], [0.2, [["crobley_guard", 3], ["crobley_minion", 4], ["jingle_turret", 1]]], [0.38, [["candy_drone", 4], ["crobage", 2], ["gobstopper", 2]]], [0.56, [["crobley_guard", 3], ["crobage", 3], ["leaping_crobage", 2]]], [0.74, [["candy_drone", 3], ["crobley_minion", 8], ["jingle_turret", 1]]], [0.88, [["crobley_guard", 4], ["crobage", 3], ["gobstopper", 2]]]],
        enterLines: [
          { s: "NARRATOR", t: "THE PACKING LINE. Every Crobley in Krelworld passes through here to be wrapped, boxed and stamped with Reinhardt's face. The wrappers come down hard. The belts don't stop. The candy chute goes somewhere you don't want to find out about.", dir: true },
        ],
      },
      {
        name: "The Sausage Works",
        w: 3800,
        h: 540,
        theme: "industrial",
        backdrop: "cf_sausage",
        platforms: [],
        ledges: [[0, 266, 205], [276, 420, 184], [424, 512, 149], [300, 370, 79], [52, 112, 107]],
        floorGaps: [[0.26, 180], [0.52, 200], [0.78, 180]],
        pitColor: 0x991b1b,
        pitName: "RAW SAUSAGE MEAT",
        movers: [[0.28, 130, 110, 0, 80, 2000], [0.545, 150, 120, 90, 0, 2400], [0.8, 140, 110, 0, 80, 1800]],
        hazards: [{ kind: "crusher", x: 0.14, w: 140, period: 2000 }, { kind: "steam", x: 0.22, period: 2200 }, { kind: "crusher", x: 0.4, w: 140, period: 1900, offset: 700 }, { kind: "steam", x: 0.64, period: 2000 }, { kind: "crusher", x: 0.68, w: 140, period: 2100, offset: 1300 }, { kind: "crusher", x: 0.92, w: 140, period: 1800, offset: 300 }],
        crusherLabel: "MINCER",
        chase: { at: 0.45, speed: 175, label: "THE GIANT MINCER", color: 0x7f1d1d },
        triggers: [[0.04, [["crobage", 4]]], [0.18, [["crobage", 3], ["crobley_guard", 2], ["leaping_crobage", 2]]], [0.36, [["crobage", 4], ["candy_drone", 3], ["gobstopper", 2]]], [0.55, [["crobley_guard", 4], ["crobage", 3], ["jingle_turret", 1]]], [0.72, [["crobage", 5], ["candy_drone", 3], ["leaping_crobage", 2]]], [0.88, [["crobley_guard", 4], ["crobage", 4], ["gobstopper", 2]]]],
        enterLines: [
          { s: "NARRATOR", t: "THE SAUSAGE WORKS. Hidden in the bowels of a children's sweet factory: an entire sausage operation. CROBAGES. Mincers the size of lorries. Chains of sausages swing overhead like bunting. It smells like a barbecue in hell.", dir: true },
          { s: "NARRATOR", t: "A sign on the wall: 'CROBAGES — FOR STRONG BOYS. A REINHARDT CROBLEY COMPANY'. Somebody has added 'SQUAWK' underneath in marker pen. That somebody was probably sacked.", dir: true },
        ],
      },
      {
        name: "The Crobley Showcase",
        w: 1600,
        h: 540,
        theme: "mansion",
        backdrop: "cf_flirt",
        platforms: [[0.2, 150, 220], [0.5, 250, 240], [0.8, 150, 220]],
        boss: "flirt",
        bossHp: 0.55,
        bossRush: [
          { boss: "lantern", backdrop: "cf_chinese", hp: 0.65 },
          { boss: "fruity", backdrop: "cf_men" },
          { boss: "tank", backdrop: "cf_destruction" },
        ],
        enterLines: [
          { s: "NARRATOR", t: "THE CROBLEY SHOWCASE. A revolving stage. Four sets, one after another, and four Crobleys waiting in the wings. Reinhardt on the tannoy: 'THE CROBLEYS. ALL OF THEM. ONE AFTER THE OTHER. LIKE THE ADVERT.'", dir: true },
          { s: "NARRATOR", t: "BOSS RUSH: four in a row, no doors in between. You get some health and ammo back after each one.", dir: true },
        ],
      },
      { name: "The Core", w: 1600, h: 540, theme: "industrial", backdrop: "cf_core", platforms: [[0.2, 150, 220], [0.5, 250, 260], [0.8, 150, 220]], boss: "reinhardt" },
    ],
  },
  sanmik_hangout: {
    id: "sanmik_hangout",
    chapter: 0,
    view: "side",
    name: "THE SANMIKVERSE",
    music: "sanmik",
    returnAt: "PUB",
    rooms: [{ ...SANMIK_HANGOUT, enterLines: [{ s: "NARRATOR", t: "You rub the lamp. Pop. Begour's café, Catford. The kettle is already on.", dir: true }] }],
  },
};
