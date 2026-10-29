import type { CharacterId, PlayableId, SpeakerId } from "./types";

export type AttackKind = "melee" | "projectile" | "lob" | "burst";

export interface SpriteLook {
  skin: number;
  hair: number | null; // null = bald
  hairStyle: "bald" | "short" | "wavy" | "long" | "beanie" | "crown" | "hat" | "blonde" | "bowler";
  beard: number | null;
  glasses: "none" | "square" | "round" | "shades";
  top: number;
  topDetail?: number;
  bottom: number;
  shoes: number;
  accent?: number; // belt, chain, sash etc.
  bulk?: number; // 0 slim, 1 normal, 2 large
}

export interface SignatureDef {
  id: string;
  name: string;
  desc: string;
  cost: number; // Krezz
  cooldown: number; // ms
}

export interface UpgradeTier {
  id: string;
  name: string;
  desc: string;
  cost: number;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  realName?: string;
  aka?: string;
  color: number;
  look: SpriteLook;
  portrait?: string; // texture key of a photo-derived pixel portrait
  playable?: boolean;
  // combat
  maxHp?: number;
  speed?: number;
  damage?: number;
  attack?: AttackKind;
  attackRate?: number;
  range?: number;
  combatBlurb?: string;
  signature?: SignatureDef;
  passive?: { name: string; desc: string };
  branch?: UpgradeTier[];
  // narrative
  ministry?: string; // NPC role when not selected
  proctusTitle?: string; // Proctus's title when filling this ministry
  proctusQuirk?: string;
  selectQuote?: string;
}

const SKIN = 0xf1c7a5;
const SKIN_PINK = 0xf0b095;
const SKIN_PALE = 0xf6d7c3;

export const CHARACTERS: Record<string, CharacterDef> = {
  FLENKY: {
    id: "FLENKY",
    name: "FLENKY JENKY",
    realName: "James Jenkins",
    aka: "aka Jenko aka Gentko aka Scrotto Jumblin aka OGGIN",
    color: 0x3b6cff,
    portrait: "pt_flenky",
    playable: true,
    look: { skin: SKIN, hair: 0x3a2a1c, hairStyle: "short", beard: null, glasses: "none", top: 0xf4f4f0, topDetail: 0x222222, bottom: 0xf4f4f0, shoes: 0xf1c7a5, accent: 0x1f4fff, bulk: 1 },
    maxHp: 90,
    speed: 215,
    damage: 11,
    attack: "melee",
    attackRate: 230,
    range: 46,
    combatBlurb: "Agile trickster. Fast combos, fast feet, fast removals from the group.",
    signature: { id: "banishment_dash", name: "Banishment Dash", desc: "Blink through enemies. Weak ones are removed from the group chat entirely.", cost: 25, cooldown: 2600 },
    passive: { name: "Serial Readmission", desc: "Once per room, a killing blow just bans you for a second instead. You come back. You always come back." },
    branch: [
      { id: "fl1", name: "Ninja Backflip", desc: "Dodge distance +40%. 'Got out just in time by doing a ninja backflip.'", cost: 120 },
      { id: "fl2", name: "Just Your Opinion Mate!!!", desc: "Banishment Dash leaves a damaging opinion trail.", cost: 260 },
      { id: "fl3", name: "Today's The Day!!!", desc: "Combo finisher every 4th hit deals triple damage.", cost: 480 },
    ],
    ministry: "Exile Appeals Officer, Ban Tribunal",
    proctusTitle: "Acting Exile Appeals Officer",
    proctusQuirk: "Has somehow already been banned nine times. Is currently appealing his own appointment.",
    selectQuote: "I'll go first.",
  },
  KREZMAR: {
    id: "KREZMAR",
    name: "KREZMAR",
    realName: "Charlie Brinkley",
    aka: 'KREZ "KRAZY KREZ" KREZMAR, aka Brinkylicious',
    color: 0x2fae5b,
    portrait: "pt_krezmar",
    playable: true,
    look: { skin: SKIN_PALE, hair: 0x2b1d14, hairStyle: "wavy", beard: null, glasses: "round", top: 0x2a1d24, bottom: 0x2b2b38, shoes: 0x141414, accent: 0xd6b23a, bulk: 1 },
    maxHp: 85,
    speed: 190,
    damage: 13,
    attack: "lob",
    attackRate: 420,
    range: 320,
    combatBlurb: "Ranged alchemist. Lobs volatile flasks of crude Krezz. Finances everything on credit.",
    signature: { id: "krez_loan", name: "Krez Loan", desc: "Instantly borrow a full Krezz tank and +50% damage for 8s. Interest is paid in health afterwards.", cost: 0, cooldown: 12000 },
    passive: { name: "Krelfund", desc: "Enemies drop 35% more Krezzcoin. Bank upgrades 10% cheaper." },
    branch: [
      { id: "kz1", name: "Krezzpy Kreme", desc: "Flasks leave a sticky slowing glaze.", cost: 120 },
      { id: "kz2", name: "Pussy Juice Vending Rights", desc: "Vending machines heal double and accept IOUs.", cost: 260 },
      { id: "kz3", name: "Quantitative Krezzing", desc: "Krez Loan interest halved. Flasks split into three.", cost: 480 },
    ],
    ministry: "Minister of Money and Loans",
    proctusTitle: "Acting Minister of Money and Loans",
    proctusQuirk: "Believes every financial crisis can be solved by printing more Krezzcoin. Has printed 4 trillion this morning.",
    selectQuote: "Extra points for pussy juice vending machines.",
  },
  KREBLIS: {
    id: "KREBLIS",
    name: "KREBLIS",
    realName: "David Gray",
    aka: "aka Dirty Dazzer",
    color: 0xd8443a,
    portrait: "pt_kreblis",
    playable: true,
    look: { skin: SKIN, hair: 0x6b4a2c, hairStyle: "short", beard: 0x6b4a2c, glasses: "none", top: 0x15151c, topDetail: 0xd9c38a, bottom: 0x9db3c9, shoes: 0x2a2a2a, bulk: 1 },
    maxHp: 95,
    speed: 195,
    damage: 10,
    attack: "projectile",
    attackRate: 300,
    range: 300,
    combatBlurb: "Area damage and disruption. Hurls rolled-up newspapers. Everything is breaking news.",
    signature: { id: "breaking_news", name: "Breaking News", desc: "A shockwave headline. Stuns, and marks enemies as Strange Occurrences (+35% damage taken).", cost: 30, cooldown: 3800 },
    passive: { name: "Krelmergency Broadcast", desc: "Marked enemies take bonus damage. You also hear about it first." },
    branch: [
      { id: "kb1", name: "What If It Goes Out The Other Ear", desc: "Newspapers ricochet once.", cost: 120 },
      { id: "kb2", name: "Threat Level: Purple", desc: "Breaking News radius +50%.", cost: 260 },
      { id: "kb3", name: "Antarctica 2.0", desc: "Breaking News leaves a lingering nuclear headline zone.", cost: 480 },
    ],
    ministry: "Minister of Strange Occurrences",
    proctusTitle: "Acting Minister of Strange Occurrences",
    proctusQuirk: "Reports everything as a strange occurrence, including weather, Tuesdays and his own hands.",
    selectQuote: "Fuuuuuuuuuuuuuuuuuuuckkkk.",
  },
  KREZWONK: {
    id: "KREZWONK",
    name: "KREZWONK",
    realName: "Mart Johnson",
    aka: "aka Moborsh Creltu aka Boggor Cranstil",
    color: 0x9b59ff,
    portrait: "pt_krezwonk",
    playable: true,
    look: { skin: SKIN, hair: 0x1a1a1a, hairStyle: "beanie", beard: 0xb07a4a, glasses: "none", top: 0x4b4f4a, bottom: 0x2f3a4a, shoes: 0x222222, bulk: 1 },
    maxHp: 80,
    speed: 190,
    damage: 12,
    attack: "projectile",
    attackRate: 380,
    range: 340,
    combatBlurb: "Prophecy mage. Fires homing omens. Sees attacks before they happen and elects not to prevent them.",
    signature: { id: "terrible_prophecy", name: "Terrible Prophecy", desc: "Foresee everything. Enemies and their projectiles slow to a crawl for 4s.", cost: 35, cooldown: 7000 },
    passive: { name: "Lurker's Foresight", desc: "Enemy telegraphs last longer. The idea of Krezwonk is more important than the man." },
    branch: [
      { id: "kw1", name: "So What Can We Say...", desc: "Omens pierce one enemy.", cost: 120 },
      { id: "kw2", name: "Krez Sigil", desc: "Prophecy also shields you for its duration.", cost: 260 },
      { id: "kw3", name: "Woke Up This Morning", desc: "Every 6th omen is a guaranteed critical.", cost: 480 },
    ],
    ministry: "Minister of Prophecy",
    proctusTitle: "Acting Minister of Prophecy",
    proctusQuirk: "His prophecies are wrong in specific and verifiable ways. He has predicted his own lunch eleven times.",
    selectQuote: "So what can we say...",
  },
  SCROMBUS: {
    id: "SCROMBUS",
    name: "SCROMBUS",
    realName: "Ben Matthews",
    aka: "The Prophesied One (2025)",
    color: 0xe0902a,
    portrait: "pt_scrombus",
    playable: true,
    look: { skin: SKIN, hair: 0x2c1e15, hairStyle: "long", beard: 0x3b2c22, glasses: "square", top: 0x7a5a52, topDetail: 0xe8e0d0, bottom: 0x2e3440, shoes: 0x3a2a1a, bulk: 1 },
    maxHp: 90,
    speed: 185,
    damage: 9,
    attack: "projectile",
    attackRate: 170,
    range: 280,
    combatBlurb: "Engineer. Nail-gun full of scringleberries. Deploys overengineered machinery nobody appreciates.",
    signature: { id: "experimental_wonker", name: "Experimental Wonker", desc: "Deploy a turret with a reach-around feature. It shoots behind itself as well.", cost: 35, cooldown: 6000 },
    passive: { name: "Severe Lack Of Appreciation", desc: "Machinery (turrets, valves, Wonking Machines) is 40% more effective." },
    branch: [
      { id: "sc1", name: "Big Bertha", desc: "Turrets last 50% longer.", cost: 120 },
      { id: "sc2", name: "Waste Pipe Into Water Dispenser", desc: "Turret kills drop small heals. Don't ask.", cost: 260 },
      { id: "sc3", name: "Krezz 2.0 (Glow In The Dark)", desc: "Two turrets at once.", cost: 480 },
    ],
    ministry: "Minister of Lore (and AI)",
    proctusTitle: "Acting Minister of Lore",
    proctusQuirk: "Keeps writing lore about himself. All of it starts 'In the beginning there was Proctus'.",
    selectQuote: "Basically we need a cabinet.",
  },
  KREBON: {
    id: "KREBON",
    name: "KREBON",
    realName: "Benn Orgill",
    aka: "formerly Krezmond, formerly Creamy Dingus, Fairweather Benn",
    color: 0x7a1f2b,
    portrait: "gen_krebon",
    playable: true,
    look: { skin: SKIN_PALE, hair: 0x15100c, hairStyle: "hat", beard: 0x15100c, glasses: "none", top: 0x2a0f16, topDetail: 0xc9a227, bottom: 0x1a1a1a, shoes: 0x0f0f0f, accent: 0xc9a227, bulk: 2 },
    maxHp: 140,
    speed: 165,
    damage: 22,
    attack: "melee",
    attackRate: 520,
    range: 62,
    combatBlurb: "Heavy melee. Six Krez Years in Krezteua d'If made him patient and enormous.",
    signature: { id: "vengeful_krunch", name: "Vengeful Krunch", desc: "Ground slam. Deals more damage the more you've been hurt in the last 10s.", cost: 30, cooldown: 4200 },
    passive: { name: "Real Butter", desc: "Take 20% less damage. Krebon is coming." },
    branch: [
      { id: "kn1", name: "The Abbé's Map", desc: "Krunch radius +40%.", cost: 120 },
      { id: "kn2", name: "Count Of Krez Kristo", desc: "Heavy hits heal 3 HP.", cost: 260 },
      { id: "kn3", name: "But At What Cost?", desc: "Krunch drops you to 1 HP max loss of 15%, but deals triple damage.", cost: 480 },
    ],
    ministry: "Minister of Krunching",
    proctusTitle: "Acting Minister of Krunching",
    proctusQuirk: "Insists he personally spent six years in Krezteua d'If, despite being appointed this morning.",
    selectQuote: "Gentlemen... he has found this group.",
  },
  CRONGUS: {
    id: "CRONGUS",
    name: "LIL' CRONGUS",
    realName: "Luke Shears",
    aka: "aka LULON aka Lusty Lulon aka Lovin' Lulon",
    color: 0x17c6c0,
    portrait: "pt_crongus",
    playable: true,
    look: { skin: SKIN_PINK, hair: null, hairStyle: "crown", beard: 0x7a5233, glasses: "none", top: 0xff8db3, topDetail: 0x1dc7c1, bottom: 0x16161a, shoes: 0x2a63c9, accent: 0xd4a017, bulk: 1 },
    maxHp: 80,
    speed: 220,
    damage: 12,
    attack: "melee",
    attackRate: 200,
    range: 40,
    combatBlurb: "Stealth assassin. Back attacks, traps and lurking. Last remaining vestige of the Cron era.",
    signature: { id: "lulon_lurk", name: "Lulon Lurk", desc: "Vanish for 4s. Your next hit is a massive critical.", cost: 25, cooldown: 5000 },
    passive: { name: "Cuddle Kronster", desc: "Hits from behind deal double damage." },
    branch: [
      { id: "cr1", name: "Hulk Smash Am I Right", desc: "Lurk crit also stuns nearby enemies.", cost: 120 },
      { id: "cr2", name: "Leaked Footage", desc: "Leave a decoy when you Lurk.", cost: 260 },
      { id: "cr3", name: "Children's Minister", desc: "Drop a caltrop trap every dodge.", cost: 480 },
    ],
    ministry: "Children's Minister",
    proctusTitle: "Acting Children's Minister",
    proctusQuirk: "Has never met a child. Thinks they are 'small cabinet members'.",
    selectQuote: "Couldn't agree more!",
  },
  GRONNY: {
    id: "GRONNY",
    name: "GRONNY G",
    realName: "Rory Burgess",
    aka: 'aka "GUT-STANK GRONSTON" aka Grelb Kronkon aka Yeorge',
    color: 0xd0642a,
    portrait: "pt_gronny",
    playable: true,
    look: { skin: SKIN_PINK, hair: null, hairStyle: "bald", beard: 0xb5501f, glasses: "shades", top: 0xcdbca5, topDetail: 0xffffff, bottom: 0x141414, shoes: 0x111111, accent: 0xff6a1a, bulk: 2 },
    maxHp: 160,
    speed: 170,
    damage: 15,
    attack: "melee",
    attackRate: 440,
    range: 56,
    combatBlurb: "Tank. Shorts in minus six. Knockback means nothing to a man who refuses trousers.",
    signature: { id: "runescape_slam", name: "RuneScape Slam", desc: "Spec bar slam. Always hits a 99. Knocks everything back.", cost: 30, cooldown: 4500 },
    passive: { name: "Gut-Stank Aura", desc: "Nearby enemies take constant damage. Immune to knockback. Immune to cold." },
    branch: [
      { id: "gr1", name: "Krez-ousers", desc: "Recover your trousers: +30 max HP.", cost: 120 },
      { id: "gr2", name: "Minister Without Portfolio", desc: "Aura radius +50%.", cost: 260 },
      { id: "gr3", name: "Dragon Dagger (p++)", desc: "RuneScape Slam hits twice.", cost: 480 },
    ],
    ministry: "Minister Without Portfolio (or RuneScape)",
    proctusTitle: "Acting Minister Without Portfolio",
    proctusQuirk: "Has been given a portfolio by mistake and won't stop opening it.",
    selectQuote: "Luv a bit of Wallace and Grom.",
  },
  MIKEY: {
    id: "MIKEY",
    name: "MIKEY NEVITT",
    realName: "Mikey Nevitt",
    aka: "FGM ULTRA operative, call sign RUSSHEN",
    color: 0x4fc3f7,
    portrait: "gen_mikey",
    playable: true,
    look: { skin: SKIN, hair: 0x4a3420, hairStyle: "short", beard: 0x5a3e26, glasses: "none", top: 0x30343f, topDetail: 0x4fc3f7, bottom: 0x23262e, shoes: 0xe8e8e8, bulk: 1 },
    maxHp: 85,
    speed: 205,
    damage: 6,
    attack: "projectile",
    attackRate: 95,
    range: 300,
    combatBlurb: "Rapid projectile barrage. FGM-era veteran. Feelin russhen 2day.",
    signature: { id: "nuclear_option", name: "Nuclear Option", desc: "Carpet bomb the area around your cursor. Historically misattributed.", cost: 40, cooldown: 7000 },
    passive: { name: "I Think He's Bluffing", desc: "Fire rate increases while moving." },
    branch: [
      { id: "mk1", name: "Passive Aggressive Status", desc: "Shots slow enemies slightly.", cost: 120 },
      { id: "mk2", name: "Eden's Last Supper", desc: "Nuclear Option gets a second wave.", cost: 260 },
      { id: "mk3", name: "Operation Fragmar Veteran", desc: "Every 20th shot is a friend-request homing missile.", cost: 480 },
    ],
    ministry: "FGM ULTRA Historical Operative",
    proctusTitle: "Acting FGM ULTRA Operative",
    proctusQuirk: "Was not there. Claims he was there.",
    selectQuote: "I think he's bluffing anyway.",
  },
  DRONGUS: {
    id: "DRONGUS",
    name: "DRONGUS B. DRIPPIN'",
    realName: "Harry",
    aka: "Supreme Leader, Mayor (too humble to say), formerly Drippy Drongus, Gartlin, Bonky Bonkit, Richie Prescripshi",
    color: 0xffd23f,
    portrait: "pt_drongus",
    look: { skin: SKIN_PALE, hair: null, hairStyle: "bald", beard: 0x6b4a33, glasses: "none", top: 0x17171c, topDetail: 0xffffff, bottom: 0x17171c, shoes: 0x0d0d0d, accent: 0xd8d8d8, bulk: 1 },
  },
  PROCTUS: {
    id: "PROCTUS",
    name: "PROCTUS KRELMOR",
    aka: "Constitutional Substitute Minister. Possibly a detective. Possibly a doctor.",
    color: 0x9aa0a6,
    portrait: "gen_proctus",
    look: { skin: SKIN_PINK, hair: 0x6e6e6e, hairStyle: "bowler", beard: 0x6e6e6e, glasses: "round", top: 0x4c4f57, topDetail: 0xb11226, bottom: 0x3a3c42, shoes: 0x1c1c1c, accent: 0xb11226, bulk: 1 },
  },
  POLSON: {
    id: "POLSON",
    name: "POLSON",
    aka: "Lord of Polson Towers, creator of the Mork Voice",
    color: 0xf2e6a0,
    portrait: "pt_polson",
    look: { skin: SKIN_PINK, hair: 0xf3dc8a, hairStyle: "blonde", beard: null, glasses: "none", top: 0xf2f2ee, bottom: 0xb9bdb6, shoes: 0xffffff, bulk: 2 },
  },
  EDEN: {
    id: "EDEN",
    name: "EDEN",
    aka: "Custodian of the Reaction Network",
    color: 0xff6f91,
    portrait: "pt_eden",
    look: { skin: SKIN_PALE, hair: 0xf0cf74, hairStyle: "long", beard: null, glasses: "none", top: 0x111111, topDetail: 0xffffff, bottom: 0x111111, shoes: 0x111111, accent: 0xb3202a, bulk: 2 },
  },
  TAP: {
    id: "TAP",
    name: "THE GREAT TAP",
    color: 0xffb6c1,
    look: { skin: 0xc0c0c0, hair: null, hairStyle: "bald", beard: null, glasses: "none", top: 0xc0c0c0, bottom: 0xc0c0c0, shoes: 0xc0c0c0 },
  },
  ARCHIVE: {
    id: "ARCHIVE",
    name: "THE ARCHIVE",
    color: 0xc8b88a,
    look: { skin: 0xc8b88a, hair: null, hairStyle: "bald", beard: null, glasses: "none", top: 0xc8b88a, bottom: 0xc8b88a, shoes: 0xc8b88a },
  },
  NARRATOR: {
    id: "NARRATOR",
    name: "",
    color: 0xffffff,
    look: { skin: 0, hair: null, hairStyle: "bald", beard: null, glasses: "none", top: 0, bottom: 0, shoes: 0 },
  },
};

export function charDef(id: SpeakerId): CharacterDef | undefined {
  return CHARACTERS[id as string];
}

export function displayName(id: SpeakerId): string {
  const d = charDef(id);
  return d ? d.name : String(id);
}

export const PLAYABLE_ORDER: PlayableId[] = [
  "FLENKY",
  "KREZMAR",
  "KREBLIS",
  "KREZWONK",
  "SCROMBUS",
  "KREBON",
  "CRONGUS",
  "GRONNY",
  "MIKEY",
];
