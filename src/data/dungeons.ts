import type { Cond } from "./types";

export type Theme = "school" | "mansion" | "network" | "industrial" | "temple" | "prison" | "wiki";

export interface PropDef {
  kind: "wonking_machine" | "vending" | "valve" | "terminal" | "npc" | "bertha" | "tv" | "sign" | "evidence_board" | "witness" | "reaction_terminal" | "tap_valve" | "phone";
  x: number; // 0..1 of room width
  y: number; // 0..1 of room height
  id?: string;
  label?: string;
  speaker?: string;
  cond?: Cond;
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
}

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
    name: "POLSON TOWERS & THE REACTION NETWORK",
    music: "mansion",
    rooms: [
      {
        name: "Polson Towers — The Kitchen",
        w: 1200,
        h: 760,
        theme: "mansion",
        event: "cheesegate",
        exitFlag: "cheesegate_solved",
        props: [
          { kind: "witness", x: 0.25, y: 0.45, id: "POLSON", speaker: "POLSON" },
          { kind: "witness", x: 0.75, y: 0.3, id: "EDEN", speaker: "EDEN" },
          { kind: "witness", x: 0.5, y: 0.2, id: "FRIDGE", speaker: "THE FRIDGE" },
          { kind: "evidence_board", x: 0.5, y: 0.75, id: "board" },
          { kind: "tv", x: 0.1, y: 0.2, id: "tv_polson" },
        ],
        enterLines: [
          { s: "NARRATOR", t: "Polson Towers. A deteriorating suburban mansion with a moat that is mostly gravy. The kitchen is the epicentre of the Reaction Network junction. And of Cheesegate.", dir: true },
          { s: "NARRATOR", t: "Question the witnesses (E). Their stories change depending on who you spoke to last. When ready, make an accusation at the Evidence Board.", dir: true },
        ],
      },
      {
        name: "Friend Request Causeway",
        w: 1400,
        h: 700,
        theme: "network",
        waves: [[["friend_crawler", 5]], [["friend_crawler", 4], ["pending_orb", 3]]],
        enterLines: [{ s: "NARRATOR", t: "THE REACTION NETWORK. A physical social network. The floor is a scrolling feed. Somewhere, a friend request is pending forever.", dir: true }],
      },
      {
        name: "Mork Voice Junction · The Blocked List",
        w: 1300,
        h: 780,
        theme: "network",
        event: "mork",
        exitFlag: "mork_done",
        waves: [[["blocked_brute", 2], ["cheese_mite", 6]]],
        props: [{ kind: "npc", x: 0.5, y: 0.25, id: "polson_mork", speaker: "POLSON" }],
        enterLines: [{ s: "NARRATOR", t: "Polson is waiting at the junction, holding a megaphone. He's speaking exclusively in the Mork Voice. Talk to him (E) to interpret his instructions.", dir: true }],
      },
      {
        name: "Unfriended Quarter · Mutual Friends Junction",
        w: 1400,
        h: 800,
        theme: "network",
        waves: [[["wisp", 3], ["friend_crawler", 4]], [["blocked_brute", 1], ["pending_orb", 4], ["cheese_mite", 4]]],
        props: [
          { kind: "vending", x: 0.9, y: 0.15, id: "v_net" },
          { kind: "phone", x: 0.12, y: 0.7, id: "fragmar_phone", cond: { player: "MIKEY" } },
        ],
        enterLines: [
          { s: "NARRATOR", t: "Mutual friends: 0. Interesting.", dir: true },
          { s: "NARRATOR", t: "FRAGMAR PRIME: your old phone is lying on the floor of the Unfriended Quarter, still open on 16/04/2022. Pick it up (E).", dir: true, cond: { player: "MIKEY" } },
          { s: "MIKEY", t: "Fragmar Prime route. The original friend request is somewhere in here. I can feel it. 16/04/2022. 12:00.", cond: { player: "MIKEY" } },
        ],
      },
      {
        name: "The Notifications Vault",
        w: 1300,
        h: 820,
        theme: "network",
        boss: "feedback",
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
        name: "Krelford International: Departures",
        w: 1300,
        h: 760,
        theme: "industrial",
        waves: [[["bandit", 6]], [["bandit_gunner", 3], ["bandit", 3]]],
        enterLines: [
          { s: "NARRATOR", t: "Krelford International. Gate 6 is empty. Flight KR-069 to Kreddle has pushed back early, with Krozno and his bandits on board, and it is not heading to Kreddle.", dir: true },
          { s: "KREBLIS", t: "(over the network) This is a Krelmergency message. They've set a course for Kreltower. Again. You've got five minutes. FIVE.", cond: { notPlayer: "KREBLIS" } },
          { s: "KREBLIS", t: "Krelmergency. They're heading for Kreltower. Again. Five minutes. Go.", cond: { player: "KREBLIS" } },
          { s: "NARRATOR", t: "A TIMER has started. Reach the cockpit and stop Krozno before KR-069 reaches Kreltower.", dir: true },
        ],
      },
      {
        name: "Flight KR-069: Economy",
        w: 1500,
        h: 520,
        theme: "industrial",
        waves: [[["bandit", 5], ["trolley", 1]], [["bandit_gunner", 3], ["trolley", 2]]],
        enterLines: [{ s: "NARRATOR", t: "You're in. Seatbelt sign on. Krozno's bandits are serving drinks out of a possessed trolley. Nobody ordered anything.", dir: true }],
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
};
