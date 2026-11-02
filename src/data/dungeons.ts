import type { Cond } from "./types";
import { goat } from "../content/dsl";

export type Theme = "school" | "mansion" | "network" | "industrial" | "temple" | "prison" | "wiki";

export interface PropDef {
  kind: "talker" | "mollor" | "wonking_machine" | "vending" | "valve" | "terminal" | "npc" | "bertha" | "tv" | "sign" | "evidence_board" | "witness" | "reaction_terminal" | "tap_valve" | "phone";
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
  event?: "cheesegate" | "mork" | "valves" | "reaction_terminal" | "bertha" | "records" | "anthem";
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
    music: "school",
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
  bonky_temple: {
    id: "bonky_temple",
    chapter: 4,
    name: "THE BONKY TEMPLE",
    music: "temple",
    rooms: [
      {
        name: "The Temple Steps",
        w: 1200,
        h: 760,
        theme: "temple",
        rule: "still",
        waves: [[["cultist", 6]], [["decree_drone", 3]]],
        enterLines: [{ s: "NARRATOR", t: "The Bonky Temple. Built from a nickname: 'the bro formerly known as Bonky Bonkit'. Drongus rules are enforced here. Watch your BAN RISK meter.", dir: true }],
      },
      {
        name: "Hall of Commandments",
        w: 1300,
        h: 780,
        theme: "temple",
        rule: "dodge",
        waves: [[["cultist", 5], ["hammerling", 1], ["decree_turret", 1], ["bonky_bouncer", 2]], [["decree_drone", 3], ["cultist", 3]]],
        enterLines: [{ s: "NARRATOR", t: "Commandment carved over the door: 'THOU SHALT REACT'. Underneath, smaller: 'THOU SHALT NOT DODGE (TODAY)'.", dir: true }],
      },
      {
        name: "Shrine of the Nuclear Option",
        w: 1300,
        h: 800,
        theme: "temple",
        rule: "heal",
        waves: [[["hammerling", 2], ["decree_drone", 2]], [["cultist", 6], ["hammerling", 1]], [["bonky_bouncer", 3], ["decree_turret", 2]]],
        props: [{ kind: "sign", x: 0.5, y: 0.15, label: "THE NUCLEAR OPTION — est. 14/04/2022 by DRONGUS (Archive vandalism: ignore)" }],
      },
      {
        name: "The Inner Sanctum",
        w: 1300,
        h: 860,
        theme: "temple",
        boss: "banhammer",
      },
    ],
  },
  krezteua: {
    id: "krezteua",
    chapter: 5,
    name: "KREZTEUA D'IF",
    music: "prison",
    rooms: [
      {
        name: "The Docks (Version A)",
        w: 1300,
        h: 760,
        theme: "prison",
        waves: [[["record", 6]], [["guard_ghost", 2], ["record", 3]]],
        enterLines: [
          { s: "NARRATOR", t: "Krezteua d'If. The sign at the gate reads 'EST. 4 JAN 2025, 23:03'. A second sign beneath it reads 'EST. ONE MILLION YEARS AGO'. A third is blank.", dir: true },
          { s: "KREBON", t: "I remember this gate. I remember it three different ways.", cond: { player: "KREBON" } },
        ],
      },
      {
        name: "Cell Block Six",
        w: 1300,
        h: 780,
        theme: "prison",
        event: "records",
        waves: [[["betrayer", 4]], [["guard_ghost", 3], ["betrayer", 2], ["ghost_mortar", 2]]],
        enterLines: [
          { s: "NARRATOR", t: "Six cells. Six Krez Years. Every cell door has a different version of the story nailed to it.", dir: true },
          { s: "NARRATOR", t: "Cell Six has your name on it. Three names, actually: KREZMOND, KREBON, CREAMY DINGUS. Two have been crossed out. A different one each time you look.", dir: true, cond: { player: "KREBON" } },
          { s: "KREBON", t: "This is where I learned to wait. Where I learned that nobody comes to visit. Not once. Not even a 'hello?'.", cond: { player: "KREBON" } },
          { s: "KREBON", t: "...Drongus would understand that. I hate that he'd understand that.", cond: { player: "KREBON" } },
        ],
      },
      {
        name: "The Abbé's Tunnel",
        w: 1400,
        h: 700,
        theme: "prison",
        waves: [[["betrayer", 3], ["record", 4], ["ghost_mortar", 2]], [["guard_ghost", 2], ["betrayer", 3]]],
        enterLines: [
          { s: "NARRATOR", t: "The tunnel the Abbé Krezia dug with a spoon. It is very long. He was very patient. He was also, according to some versions, a pigeon.", dir: true },
          { s: "KREBON", t: "Abbé. I'm back. I kept the spoon.", cond: { player: "KREBON" } },
          { s: "THE ABBÉ KREZIA", t: "Krezmond. You came back. Nobody comes back. Most people just leave the group.", cond: { player: "KREBON" } },
          { s: "KREBON", t: "I'm not Krezmond any more.", cond: { player: "KREBON" } },
          { s: "THE ABBÉ KREZIA", t: "You're all of them. That's what the Spectre can't stand. It wants one true version. Lore doesn't work like that. Lore is everyone talking at once and nobody reacting.", cond: { player: "KREBON" } },
          { s: "THE ABBÉ KREZIA", t: "The treasure's where I said. It's not what you think. It never was.", cond: { player: "KREBON" } },
        ],
      },
      {
        name: "The Treasure Vault",
        w: 1200,
        h: 760,
        theme: "prison",
        waves: [[["record", 8], ["guard_ghost", 2]]],
        enterLines: [
          { s: "NARRATOR", t: "The Treasure Vault. Empty shelves. Krezzcoin dust. A faint smell of butter.", dir: true },
          { s: "KREBON", t: "Three betrayed me. Possibly four. I spent years deciding which. Then Krezwonk typed it into a group chat at eleven at night and it became true.", cond: { player: "KREBON" } },
          { s: "KREBON", t: "So I'll decide now. It was three. And one of them was me.", cond: { player: "KREBON" } },
        ],
      },
      {
        name: "The Deepest Cell",
        w: 1300,
        h: 860,
        theme: "prison",
        boss: "spectre",
      },
    ],
  },
  citadel: {
    id: "citadel",
    chapter: 6,
    name: "DA DRONGUS DUNGEON",
    music: "wiki",
    rooms: [
      {
        name: "Main Page",
        w: 1300,
        h: 780,
        theme: "wiki",
        waves: [[["citation", 8]], [["wiki_fragment", 3], ["citation", 4]]],
        enterLines: [{ s: "NARRATOR", t: "Krelworld Wiki — Main Page. 'Welcome to the Krelworld Wiki, the encyclopedia that anyone can edit (but only one man does).'", dir: true }],
      },
      {
        name: "Krezzsplosion (article)",
        w: 1400,
        h: 820,
        theme: "wiki",
        waves: [[["deleted_text", 4], ["wiki_fragment", 2], ["edit_leaper", 3]], [["ai_portrait", 2], ["citation", 6]]],
        enterLines: [{ s: "NARRATOR", t: "You are standing inside the Krezzsplosion article. 'Wow … not as if there's an entire page devoted to your precious Krezzsplosion on the wiki'. There is. You're in it.", dir: true }],
      },
      {
        name: "Talk:Krelworld",
        w: 1400,
        h: 820,
        theme: "wiki",
        event: "reaction_terminal",
        exitFlag: "network_restored",
        waves: [[["ai_portrait", 3], ["deleted_text", 3]], [["unread", 5], ["wiki_fragment", 3], ["edit_leaper", 2]]],
        props: [{ kind: "reaction_terminal", x: 0.5, y: 0.2, id: "rt" }],
        enterLines: [{ s: "NARRATOR", t: "The Talk page. Every argument ever had about Krelworld, at once. At the far end: the REACTION NETWORK TERMINAL. Clear the room, then restore the network (E).", dir: true }],
      },
      {
        name: "The Supreme Leader's Office (Parade Ground)",
        w: 1400,
        h: 860,
        theme: "wiki",
        event: "anthem",
        waves: [[["soldier", 6]], [["soldier", 4], ["ai_portrait", 2], ["edit_leaper", 2]]],
        enterLines: [
          { s: "NARRATOR", t: "Drongus's office. A desk the size of a Krelball pitch. Behind it, an oil painting of Drongus painting an oil painting of Drongus. In front of it: his army, in perfect rows, purple uniforms pressed.", dir: true },
        ],
      },
      {
        name: "The Summit: Government Chamber",
        w: 1400,
        h: 900,
        theme: "wiki",
        boss: "drongus",
      },
    ],
  },

  airport: {
    id: "airport",
    chapter: 6,
    name: "THE KRELTOWER INCIDENT — FLIGHT KR-069",
    music: "airport",
    timerSec: 300,
    returnAt: "AIRPORT",
    rooms: [
      {
        name: "Flight KR-069: Economy",
        w: 1500,
        h: 520,
        theme: "industrial",
        waves: [[["bandit", 5], ["trolley", 1]], [["bandit_gunner", 3], ["trolley", 2]]],
        enterLines: [
          { s: "NARRATOR", t: "You're in. Seatbelt sign on. Krozno's bandits are serving drinks out of a possessed trolley. Nobody ordered anything.", dir: true },
          { s: "KREBLIS", t: "(over the network) This is a Krelmergency message. They've set a course for Kreltower. Again. You've got five minutes. FIVE.", cond: { notPlayer: "KREBLIS" } },
          { s: "NARRATOR", t: "A TIMER has started. Fight through the cabin to the cockpit and stop Krozno before KR-069 reaches Kreltower.", dir: true },
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
  crobley_factory: {
    id: "crobley_factory",
    chapter: 0,
    view: "side",
    name: "THE CROBLEY FACTORY",
    music: "industrial",
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
  arena_cronster: {
    id: "arena_cronster",
    chapter: 0,
    name: "THE CRONSTER'S LAIR (behind the chocolate factory)",
    music: "ominous",
    arenaFlag: "cronster_caught",
    returnAt: "POLICE",
    rooms: [
      cuddleTower(),
      { name: "The Squeezing Room", w: 1100, h: 720, theme: "mansion", boss: "cronster" },
    ],
  },
};
