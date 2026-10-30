import type { Cond, Line, PlayableId } from "../data/types";
import { dir, say } from "./dsl";

/** Where a quest pickup lives. Hub positions are named anchors; dungeon pickups name a room index. */
export interface PickupSpot {
  id: string;
  label: string;
  where: { dungeon: string; room: number } | { hub: string };
  cond?: Cond;
}

export interface PersonalQuest {
  id: string;
  player: PlayableId;
  title: string;
  blurb: string;
  pickups: PickupSpot[];
  turnIn: { at: string; speaker: string; text: string; lines: Line[] };
  reward: { coins: number; upgrade?: string; desc: string };
}

export const PERSONAL_QUESTS: PersonalQuest[] = [
  {
    id: "pq_flenky",
    player: "FLENKY",
    title: "The Ninth Readmission",
    blurb: "Collect three Apology Forms (B-4N) and submit them to the Ban Tribunal. Get unbanned. Permanently. Ish.",
    pickups: [
      { id: "form1", label: "Apology Form B-4N (\"I'm sorry for the Queen one\")", where: { dungeon: "wildern", room: 1 } },
      { id: "form2", label: "Apology Form B-4N (\"I'm sorry my parents are together\")", where: { dungeon: "ministry", room: 1 } },
      { id: "form3", label: "Apology Form B-4N (\"I'm sorry for the headmaster\")", where: { dungeon: "bonky_temple", room: 2 } },
    ],
    turnIn: {
      at: "BAN_TRIBUNAL",
      speaker: "PROCTUS",
      text: "Submit Apology Forms",
      lines: [
        say("PROCTUS", "Three Apology Forms! Fully completed! Nobody's ever completed one before. Not even me. I've completed four."),
        say("PROCTUS", "By the power vested in me as Acting Exile Appeals Officer, I hereby unban you. Permanently."),
        dir("A small bell rings somewhere."),
        say("PROCTUS", "...I've just been informed that 'permanently' isn't a word the Tribunal recognises. You're unbanned until further notice."),
        say("FLENKY", "That'll do. That's the best I've ever had."),
      ],
    },
    reward: { coins: 300, desc: "Ban Risk builds 50% slower for the rest of the run." },
  },
  {
    id: "pq_krezmar",
    player: "KREZMAR",
    title: "The Krelfund",
    blurb: "'You should start a krelfund x.' Collect three donations for the Supreme Leader. It's the thought that counts.",
    pickups: [
      { id: "don1", label: "Donation: an Uber Eats voucher (expired)", where: { dungeon: "polson_towers", room: 1 } },
      { id: "don2", label: "Donation: one (1) crobley, slightly nibbled", where: { dungeon: "ministry", room: 2 } },
      { id: "don3", label: "Donation: the Abbé's Krezzcoin (vintage)", where: { dungeon: "krezteua", room: 1 } },
    ],
    turnIn: {
      at: "BANK",
      speaker: "PROCTUS",
      text: "Deposit the Krelfund",
      lines: [
        say("PROCTUS", "A krelfund! Lovely! I'll add it to the four trillion I printed. Now it's four trillion and three things."),
        say("KREZMAR", "It's for Drongus. When this is over. A whip-around."),
        say("PROCTUS", "That's... genuinely lovely. Is it allowed? The Ministry of Money doesn't usually do lovely."),
        dir("The Krelfund is sealed in an envelope marked 'FOR DRONGUS — NO DOORDASH, SORRY'."),
      ],
    },
    reward: { coins: 450, desc: "Drongus's resentment drops by 15 when you reach the Citadel." },
  },
  {
    id: "pq_kreblis",
    player: "KREBLIS",
    title: "Threat Level Purple",
    blurb: "Three Strange Occurrences in Krelford remain unfiled. Find them. File them. Determine whether purple is high or low.",
    pickups: [
      { id: "so1", label: "Strange Occurrence: a bin that answers to 'Kevin'", where: { hub: "SO_BIN" } },
      { id: "so2", label: "Strange Occurrence: a pigeon wearing the letters 'TOWN'", where: { hub: "SO_PIGEON" }, cond: { chapterAtLeast: 2 } },
      { id: "so3", label: "Strange Occurrence: a puddle that is 100% krel", where: { hub: "SO_PUDDLE" }, cond: { chapterAtLeast: 3 } },
    ],
    turnIn: {
      at: "TOWN_HALL",
      speaker: "PROCTUS",
      text: "File your Strange Occurrences",
      lines: [
        say("PROCTUS", "Three occurrences! Filed! I've filed them under 'Strange'. I file everything under 'Strange'. Covering for you has made me like this."),
        say("KREBLIS", "And purple? High or low?"),
        say("PROCTUS", "...the filing system has determined that purple is 'medium'."),
        say("KREBLIS", "Medium. MEDIUM. History will judge us."),
      ],
    },
    reward: { coins: 300, desc: "Breaking News costs 10 less Krezz." },
  },
  {
    id: "pq_krezwonk",
    player: "KREZWONK",
    title: "The Krez Sigil",
    blurb: "'I think that we may have to consider a Krez Sigil to protect ourselves.' Nobody listened. Find three fragments and forge it yourself.",
    pickups: [
      { id: "sig1", label: "Sigil Fragment: Prophecy", where: { dungeon: "wildern", room: 2 } },
      { id: "sig2", label: "Sigil Fragment: Butter", where: { dungeon: "ministry", room: 1 } },
      { id: "sig3", label: "Sigil Fragment: Lurk", where: { dungeon: "krezteua", room: 2 } },
    ],
    turnIn: {
      at: "ARCHIVE",
      speaker: "ARCHIVE",
      text: "Forge the Krez Sigil",
      lines: [
        say("ARCHIVE", "THREE FRAGMENTS DETECTED. FORGING KREZ SIGIL."),
        dir("The fragments fuse into a small, faintly purple symbol. It hums. It is, very slightly, judging you."),
        say("KREZWONK", "It's done. We're protected. From Krebon. Or from ourselves. The prophecy was vague."),
        say("ARCHIVE", "ARCHIVAL NOTE: The Krez Sigil was proposed on 4 January 2025. It was forged in the present. Nobody reacted to the original proposal."),
      ],
    },
    reward: { coins: 300, upgrade: "sigil", desc: "+25 max HP. The Sigil protects. Vaguely." },
  },
  {
    id: "pq_scrombus",
    player: "SCROMBUS",
    title: "Big Bertha Lives",
    blurb: "Big Bertha was offered to the cabinet. Nobody claimed her. Recover her three crusty components and rebuild her at home.",
    pickups: [
      { id: "bb1", label: "Big Bertha: the crusty lever", where: { dungeon: "wildern", room: 2 } },
      { id: "bb2", label: "Big Bertha: the pressure gauge (stuck on 'HELP')", where: { dungeon: "ministry", room: 3 } },
      { id: "bb3", label: "Big Bertha: the original 'reach' (pre-around)", where: { dungeon: "bonky_temple", room: 1 } },
    ],
    turnIn: {
      at: "HOME",
      speaker: "SCROMBUS",
      text: "Rebuild Big Bertha",
      lines: [
        dir("You reassemble Big Bertha in your living room. She is two years old. She is crusty. She is beautiful."),
        say("SCROMBUS", "Hello, old girl."),
        say("BIG BERTHA", "...WONK?"),
        say("SCROMBUS", "Yeah. Wonk. I appreciate you, Bertha. Someone should say it."),
        dir("Big Bertha whirrs contentedly. A small, slightly suspicious puddle forms beneath her."),
      ],
    },
    reward: { coins: 300, desc: "Turrets deal +40% damage." },
  },
  {
    id: "pq_krebon",
    player: "KREBON",
    title: "Real Butter",
    blurb: "'Krebon   Real butter .. krebon is coming.' Find the menu. Follow the Abbé's map. Find the treasure.",
    pickups: [
      { id: "menu", label: "The Menu (\"Krebon — Real butter\")", where: { hub: "PUB_MENU" } },
      { id: "map", label: "The Abbé Krezia's Map", where: { dungeon: "polson_towers", room: 2 } },
      { id: "treasure", label: "Krezmond's Treasure (a single pat of real butter)", where: { dungeon: "krezteua", room: 3 } },
    ],
    turnIn: {
      at: "PUB",
      speaker: "KREBON",
      text: "Open the treasure",
      lines: [
        dir("You place the treasure on the table at the Krezz Arms. A single pat of real butter. Golden. Ancient. Faintly glowing."),
        say("KREBON", "Six Krez Years. Three betrayers. A whole saga."),
        say("KREBON", "For butter."),
        say("KREBON", "...it's very good butter."),
        dir("The barman puts it on the menu. 'KREBON — REAL BUTTER'. The prophecy completes itself."),
      ],
    },
    reward: { coins: 400, desc: "+20% damage while below half health. At what cost?" },
  },
  {
    id: "pq_crongus",
    player: "CRONGUS",
    title: "The Leak",
    blurb: "'Big news: the video of Lil' Crongus has leaked!' Recover the three pieces of footage before the wiki gets them.",
    pickups: [
      { id: "leak1", label: "Leaked Footage: Part 1 (it's a wrist)", where: { dungeon: "wildern", room: 1 } },
      { id: "leak2", label: "Leaked Footage: Part 2 (still the wrist)", where: { dungeon: "polson_towers", room: 3 } },
      { id: "leak3", label: "Leaked Footage: Part 3 (a different wrist?)", where: { dungeon: "bonky_temple", room: 1 } },
    ],
    turnIn: {
      at: "HOME",
      speaker: "CRONGUS",
      text: "Destroy the footage",
      lines: [
        dir("You watch all three parts. It's twelve minutes of a wrist doing a morning stretch. That's it. That's the leak."),
        say("CRONGUS", "That's... that's genuinely just a stretch."),
        say("CRONGUS", "Drongus said it was me 'wonking my hard thang'. It's a STRETCH."),
        dir("You burn it anyway. Some lore is better unmade."),
      ],
    },
    reward: { coins: 300, desc: "Lulon Lurk lasts 2s longer." },
  },
  {
    id: "pq_gronny",
    player: "GRONNY",
    title: "The Krez-ousers",
    blurb: "'He's holding my trousers ransom guys, help, I'm so cold.' Recover your Krez-ousers. All of them.",
    pickups: [
      { id: "leg1", label: "Krez-ousers: Left Leg", where: { dungeon: "polson_towers", room: 1 } },
      { id: "leg2", label: "Krez-ousers: Right Leg", where: { dungeon: "bonky_temple", room: 2 } },
      { id: "waist", label: "Krez-ousers: Waistband (ransom note attached)", where: { dungeon: "citadel", room: 1 } },
    ],
    turnIn: {
      at: "HOME",
      speaker: "GRONNY",
      text: "Put on the Krez-ousers",
      lines: [
        dir("You reassemble the Krez-ousers. You put them on."),
        say("GRONNY", "..."),
        dir("You take them off again."),
        say("GRONNY", "Fair enough."),
        dir("You feel warmer just knowing they exist."),
      ],
    },
    reward: { coins: 300, desc: "+30 max HP. Shorts remain on." },
  },
  {
    id: "pq_mikey",
    player: "MIKEY",
    title: "Fragmar Prime",
    blurb: "Finish what you started in April 2022: deliver the original friend request, recover the unsent messages, and correct the Archive.",
    pickups: [
      { id: "orig", label: "The Original Friend Request (16/04/2022, 12:00)", where: { dungeon: "polson_towers", room: 3 }, cond: { flag: "mikey_route" } },
      { id: "unsent", label: "The Unsent Messages (you were told to unsend them)", where: { dungeon: "bonky_temple", room: 1 } },
      { id: "footnote", label: "A Red Pen (for the Archive)", where: { dungeon: "krezteua", room: 2 } },
    ],
    turnIn: {
      at: "ARCHIVE",
      speaker: "ARCHIVE",
      text: "Correct the Archive",
      lines: [
        say("ARCHIVE", "AMENDMENT REQUESTED: 'The Nuclear Option'."),
        say("MIKEY", "Put that it was mine."),
        say("ARCHIVE", "THE RECORD SHOWS IT WAS DRONGUS."),
        say("MIKEY", "Put that it was mine and that the Archive's been vandalised."),
        say("ARCHIVE", "...AMENDMENT ACCEPTED. NEW FOOTNOTE: 'Disputed by Mikey, who has a red pen.'"),
        say("MIKEY", "Feelin russhen 2day."),
      ],
    },
    reward: { coins: 350, desc: "Nuclear Option costs 15 less Krezz." },
  },
];

/** Ministerial side quests unlocked by the Founding Cabinet. Given by the minister, or by Proctus. */
export interface MinistryQuest {
  id: string;
  ministry: PlayableId;
  title: string;
  desc: string;
  counter: string;
  target: number;
  reward: number;
}

export const MINISTRY_QUESTS: MinistryQuest[] = [
  { id: "mq_strange", ministry: "KREBLIS", title: "Unread Notifications", desc: "The Ministry of Strange Occurrences wants 12 Notification Wisps destroyed. They keep saying 'Hello?'", counter: "kill_wisp", target: 12, reward: 150 },
  { id: "mq_money", ministry: "KREZMAR", title: "Quantitative Krezzing", desc: "Earn 400 Krezzcoin. The economy needs liquidity. And Krezmar needs a loan.", counter: "coins_earned", target: 400, reward: 160 },
  { id: "mq_prophecy", ministry: "KREZWONK", title: "Foreseen Dodges", desc: "Perform 15 perfect dodges. The Ministry of Prophecy says you'll do it. It's been wrong before.", counter: "perfect_dodge", target: 15, reward: 160 },
  { id: "mq_lore", ministry: "SCROMBUS", title: "Appreciate The Machine", desc: "Use a Wonking Machine 3 times. Say something nice to it. Nobody else will.", counter: "wonk_machine", target: 3, reward: 150 },
  { id: "mq_children", ministry: "CRONGUS", title: "Smolt Control", desc: "Defeat 20 Smolts. As Children's Minister, these are technically children. Of a salmon.", counter: "kill_smolt", target: 20, reward: 140 },
  { id: "mq_krunch", ministry: "KREBON", title: "Krunch Quota", desc: "Defeat 60 enemies. Krunch is Krunch.", counter: "kills_total", target: 60, reward: 170 },
  { id: "mq_portfolio", ministry: "GRONNY", title: "Portfolio Development", desc: "Drink 5 Fizzy Bongos. For the portfolio. Which is empty.", counter: "bongos_drunk", target: 5, reward: 120 },
  { id: "mq_exile", ministry: "FLENKY", title: "Know Your Rights", desc: "Get banned once and talk your way back in. The Tribunal needs case studies.", counter: "readmissions", target: 1, reward: 150 },
  { id: "mq_fgm", ministry: "MIKEY", title: "FGM Media Studies", desc: "Watch 3 KrelTV programmes. For intelligence purposes.", counter: "tv_watched", target: 3, reward: 120 },
];
