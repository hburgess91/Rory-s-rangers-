import type { Cond } from "./types";
import { goat } from "../content/dsl";

export type Theme = "school" | "mansion" | "network" | "industrial" | "temple" | "prison" | "wiki";

export interface PropDef {
  kind: "talker" | "wonking_machine" | "vending" | "valve" | "terminal" | "npc" | "bertha" | "tv" | "sign" | "evidence_board" | "witness" | "reaction_terminal" | "tap_valve" | "phone";
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
  /** SanMik and SanChz fight alongside you in this room. */
  sanBros?: boolean;
  /** Scenes to play (in order) when you leave through the exit, before the next room: "norwich", "drive". */
  then?: string[];
  /** Shown when the exit is locked by exitFlag. */
  exitHint?: string;
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
          { s: "NARRATOR", t: "Wildern Academy (Krelford branch). They also have a Wildern in Krelford. That was the first lore. The corridors smell of fish fingers and real fish.", dir: true },
          { s: "NARRATOR", t: "CONTROLS: WASD move · Mouse aim · Left click attack · Right click / F special · Space dodge · Q pussy juice · B fizzy bongo · R Krezz Burst (full Wonk) · E interact · Esc pause", dir: true },
        ],
      },
      {
        name: "The Cafeteria",
        w: 1300,
        h: 780,
        theme: "school",
        waves: [[["wisp", 3], ["smolt", 5]], [["tray_turret", 2], ["dinner_lady", 2]]],
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
        waves: [[["smolt", 8], ["wisp", 2]], [["dinner_lady", 3], ["tray_turret", 2]]],
        props: [{ kind: "vending", x: 0.88, y: 0.2, id: "v_boiler" }],
      },
      {
        name: "The Wildern Main",
        w: 1300,
        h: 820,
        theme: "school",
        boss: "salmon",
      },
    ],
  },
  polson_towers: {
    id: "polson_towers",
    chapter: 2,
    name: "POLSON TOWERS",
    music: "mansion",
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
        waves: [[["mould", 3], ["cheese_mite", 6]], [["mould_pizza", 2], ["mould", 3]], [["mould_pizza", 3], ["cheese_mite", 6]]],
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
        waves: [[["plushie", 6], ["trinket", 6]], [["plushie", 5], ["mould", 2], ["trinket", 6]]],
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
          { s: "NARRATOR", t: "The living room. Everything Eden ever bought, kept, was given, or found, piled into one shape. Underneath it, somewhere, is Polson's sofa. And the router.", dir: true },
          { s: "POLSON", t: "(on the phone) That's all of it. All of her stuff. If it goes... it's just my house again. Just me." },
          { s: "POLSON", t: "(on the phone) Fifty percent towards breaking up. Fifty-five. Clear it. Clear the lot." },
        ],
      },
    ],
  },
  ministry: {
    id: "ministry",
    chapter: 3,
    name: "THE MINISTRY OF BONER CONTROL",
    music: "industrial",
    rooms: [
      {
        name: "Pumping Station Alpha",
        w: 1300,
        h: 780,
        theme: "industrial",
        event: "valves",
        exitFlag: "valves_done",
        waves: [[["pipe_gremlin", 6]], [["krez_leak", 2], ["pipe_gremlin", 3]]],
        props: [
          { kind: "valve", x: 0.15, y: 0.2, id: "valve1" },
          { kind: "valve", x: 0.85, y: 0.2, id: "valve2" },
          { kind: "valve", x: 0.5, y: 0.85, id: "valve3" },
        ],
        enterLines: [{ s: "NARRATOR", t: "Pumping Station Alpha. Three main valves are shut. Open them all (E) to restore pressure to Krelford. The pipes are warm. Don't think about it.", dir: true }],
      },
      {
        name: "The Vending Hall",
        w: 1300,
        h: 780,
        theme: "industrial",
        waves: [[["vending_mimic", 3], ["pipe_gremlin", 4]], [["krezbian", 2]]],
        props: [
          { kind: "vending", x: 0.1, y: 0.2, id: "v_hall1" },
          { kind: "vending", x: 0.9, y: 0.2, id: "v_hall2" },
        ],
        enterLines: [{ s: "KREZMAR", t: "(over the network) Those are my vending machines. Some of them are mimics. Please only kill the mimics.", cond: { notPlayer: "KREZMAR" } }],
      },
      {
        name: "The Krezz Refinery",
        w: 1400,
        h: 820,
        theme: "industrial",
        waves: [[["krezbian", 3], ["krez_leak", 1]], [["vending_mimic", 2], ["krezbian", 2], ["pipe_gremlin", 3]]],
        props: [{ kind: "wonking_machine", x: 0.5, y: 0.2, id: "wm_refinery" }],
        enterLines: [{ s: "NARRATOR", t: "The Krezz Refinery. Crude krezz is processed into Extra Virgin Krezz Oil here. Krezbians — purple, Mad Max, cannons for right arms — have taken the floor.", dir: true }],
      },
      {
        name: "The Basement",
        w: 1100,
        h: 720,
        theme: "industrial",
        event: "bertha",
        waves: [[["pipe_gremlin", 8]]],
        props: [{ kind: "bertha", x: 0.5, y: 0.3, id: "bertha" }],
        enterLines: [{ s: "NARRATOR", t: "The basement. In the corner, under a dust sheet: Big Bertha. Two years old. Crusty. Retired.", dir: true }],
      },
      {
        name: "The Central Chamber",
        w: 1300,
        h: 860,
        theme: "industrial",
        boss: "machine",
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
        waves: [[["cultist", 5], ["hammerling", 1]], [["decree_drone", 3], ["cultist", 3]]],
        enterLines: [{ s: "NARRATOR", t: "Commandment carved over the door: 'THOU SHALT REACT'. Underneath, smaller: 'THOU SHALT NOT DODGE (TODAY)'.", dir: true }],
      },
      {
        name: "Shrine of the Nuclear Option",
        w: 1300,
        h: 800,
        theme: "temple",
        rule: "heal",
        waves: [[["hammerling", 2], ["decree_drone", 2]], [["cultist", 6], ["hammerling", 1]]],
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
        waves: [[["betrayer", 4]], [["guard_ghost", 3], ["betrayer", 2]]],
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
        waves: [[["betrayer", 3], ["record", 4]], [["guard_ghost", 2], ["betrayer", 3]]],
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
    name: "THE GREAT WIKI CITADEL",
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
        waves: [[["deleted_text", 4], ["wiki_fragment", 2]], [["ai_portrait", 2], ["citation", 6]]],
        enterLines: [{ s: "NARRATOR", t: "You are standing inside the Krezzsplosion article. 'Wow … not as if there's an entire page devoted to your precious Krezzsplosion on the wiki'. There is. You're in it.", dir: true }],
      },
      {
        name: "Talk:Krelworld",
        w: 1400,
        h: 820,
        theme: "wiki",
        event: "reaction_terminal",
        exitFlag: "network_restored",
        waves: [[["ai_portrait", 3], ["deleted_text", 3]], [["unread", 5], ["wiki_fragment", 3]]],
        props: [{ kind: "reaction_terminal", x: 0.5, y: 0.2, id: "rt" }],
        enterLines: [{ s: "NARRATOR", t: "The Talk page. Every argument ever had about Krelworld, at once. At the far end: the REACTION NETWORK TERMINAL. Clear the room, then restore the network (E).", dir: true }],
      },
      {
        name: "The Supreme Leader's Office (Parade Ground)",
        w: 1400,
        h: 860,
        theme: "wiki",
        event: "anthem",
        waves: [[["soldier", 6]], [["soldier", 4], ["ai_portrait", 2]]],
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
      { ...SANMIK_HANGOUT, enterLines: SANMIK_ARRIVAL },
      {
        name: "Catford High Street",
        w: 2800,
        h: 540,
        theme: "industrial",
        backdrop: "sm_street",
        sanBros: true,
        platforms: [[0.2, 120, 220], [0.32, 220, 180], [0.48, 130, 260], [0.62, 120, 200], [0.7, 230, 160], [0.84, 130, 240]],
        waves: [[["catford_fox", 9]], [["imaginary_mandem", 3], ["catford_fox", 7]], [["corn_turd", 5], ["wet_pizza", 3], ["imaginary_mandem", 3]]],
        enterLines: [
          { s: "NARRATOR", t: "Catford High Street, as remembered by a man on three energy drinks. Kebab shop. Bookies. Pound shop. A chicken shop called PECKISH that has been closed since 2009 and is somehow still open.", dir: true },
          { s: "SANMIK", t: "YEEE! San Brothers, assemble! SanChz, you're on food. I'm on bars." },
          { s: "SANCHZ", t: "YEGHHH." },
          { s: "NARRATOR", t: "SANMIK and SANCHZ have joined you. They fight on their own. When you krezz (R), SanMik does his version: the SLOPPY SURPRISE.", dir: true },
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
        then: ["norwich", "drive"],
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
      {
        name: "The Cuddle Corridor",
        w: 1200,
        h: 720,
        theme: "mansion",
        waves: [[["cheese_mite", 8]], [["friend_crawler", 5]]],
        enterLines: [
          { s: "NARRATOR", t: "The trail of chocolate wrappers ends at a door with a heart-shaped letterbox. Inside, every wall is covered in drawings of people being cuddled. Some of them are of you.", dir: true },
          { s: "NARRATOR", t: "A note on the floor, in disturbingly cheery handwriting: 'I'll cuddle you, squeeze you, and extract all your lovely juices :)'", dir: true },
        ],
      },
      { name: "The Squeezing Room", w: 1100, h: 720, theme: "mansion", boss: "cronster" },
    ],
  },
};
