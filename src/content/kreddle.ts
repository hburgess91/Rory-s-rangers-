import type { Line } from "../data/types";
import { dir, say } from "./dsl";

// KREDDLE: the casino/arcade universe over the bridge. Everything here is fictional.

/** What the locals call people from Krelworld. */
export const INSULT = "Tap-licker";

/** First time you talk to a local. */
export const WELCOME_SPEECH: Line[] = [
  say("KREDDLER", "Welcome to Kreddle! The gambling/arcade universe where nothing is as it seems…"),
  say("KREDDLER", "The only rule in Kreddle is there are NO rules!!"),
  say("KREDDLER", "The second rule in Kreddle is that pussy juice is BANNED under threat of death."),
  say("KREDDLER", "The third rule is you must gamble! If you do not gamble you will be arrested and lashed!"),
  say("KREDDLER", "We are Krozlens! An ancient religion…"),
  say("KREDDLER", `…and the House always wins. Especially against you, ${INSULT}.`),
];

/** Shouted while shoving you. */
export const SHOVES = [
  `Out of the way, ${INSULT}!`,
  `${INSULT}!`,
  "Smells like Krelworld in here.",
  `Go back to your juice, ${INSULT}!`,
  "Ew. A Krelworlder.",
  "Did you even gamble today? Disgusting.",
  "Juice-breath!",
  "Krelworld scum!",
  `Mind the shoes, ${INSULT}. They're sequinned.`,
  "*SHOVE* That's Kreddle for hello.",
  "Your universe is BORING.",
  `Nobody likes a ${INSULT}.`,
];

/** Talking to a local after the welcome. */
export const LOCAL_CHAT: Line[][] = [
  [say("KREDDLER", "We hate Krelworld, as pussy juice goes against our religion. We are Krozlens. Look it up.")],
  [say("KREDDLER", "The Krozlen scriptures are very clear. Gamble daily. Never touch the juice. Shove a Krelworlder whenever possible.")],
  [say("KREDDLER", "Have you gambled yet? You look like you haven't gambled. The Pit Boss is watching you.")],
  [say("KREDDLER", "The claw machine is completely fair. It just has feelings. And the feeling is no.")],
  [say("KREDDLER", "I once won a chainsaw on the slots. I sold my house to win it. Worth it.")],
  [say("KREDDLER", "President Klerble is our greatest gambler. He once bet the whole railway. He won it back by lunchtime.")],
  [say("KREDDLER", `What are you looking at, ${INSULT}?`), dir("They shove you. Lightly. Affectionately, almost. No. Not affectionately.")],
  [say("KREDDLER", "Kreddle never sleeps. Kreddle never closes. Kreddle has never once seen the sun. It's lovely.")],
  [say("KREDDLER", "Nothing is as it seems in Kreddle. For example, I'm actually three children in a trench coat. Just kidding. I'm a grown man. Or am I? Yes. I am.")],
];

/** The Kreddle Krunchers: Kreddle's answer to the lads. */
export const KRUNCHERS: { of: string; name: string; jab: string }[] = [
  { of: "FLENKY", name: "KLENKY", jab: "I've never been banned. Not once. In Kreddle they don't ban you, they lash you. Builds character." },
  { of: "SCROMBUS", name: "SKROMBUS", jab: "Our Wonking Machine has a reach-around AND a cashback scheme. Yours just has a reach-around." },
  { of: "KREZMAR", name: "KREDMAR", jab: "I don't do loans. I do bets. A loan is just a bet you've already lost." },
  { of: "KREBLIS", name: "KREDBLIS", jab: "Breaking news… you're shit 👍" },
  { of: "KREZWONK", name: "KREDWONK", jab: "I foresaw you coming. You were taller in the vision." },
  { of: "KREBON", name: "KREDBON", jab: "Six Krez Years in prison? I did seven. In a casino. Voluntarily." },
  { of: "CRONGUS", name: "LIL' KRUNGUS", jab: "I'm littler than Lil' Crongus. That makes me better. That's maths." },
  { of: "GRONNY", name: "GRENNY", jab: "Waa waa wee waa. In Kreddle that means 'you lose'." },
  { of: "MIKEY", name: "MIKKY K", jab: "FGM? Lol. We're KGM. Kreddle Gambling Ministry. We've got a logo." },
];
export const KRUNCHER_BOAST = "The Kreddle Krunchers are much better than your lame Krelworld krew! We hate you!";

export interface Prize {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Where it's stored: s.upgrades[key] = level, or a gun id. */
  key?: string;
  gun?: string;
  max?: number;
}

export const PRIZES: Prize[] = [
  { id: "krezz", name: "NEON KREZZ", icon: "💜", desc: "Your krezz beam hits 25% harder and glows neon pink. Stacks three times.", key: "kd_krezz", max: 3 },
  { id: "gas", name: "CASINO GAS", icon: "💨", desc: "Farts are 20% bigger and harder, and come out sparkly purple. Stacks three times.", key: "kd_gas", max: 3 },
  { id: "violence", name: "EXTRA VIOLENCE MODE", icon: "🩸", desc: "Blood spatters on every hit. Enemies come apart in pieces when they die. (Switch it off at the Prize Counter.)", key: "kd_violence", max: 1 },
  { id: "gold", name: "GOLD-PLATED GUNS", icon: "🪙", desc: "Every gun you hold turns gold, and so do the bullets. They hit 10% harder because they're gold.", key: "kd_gold", max: 1 },
  { id: "tracer", name: "NEON TRACERS", icon: "✨", desc: "Your bullets leave glowing neon trails.", key: "kd_tracer", max: 1 },
  { id: "jackpot", name: "JACKPOT ROUNDS", icon: "🎰", desc: "One hit in eight pays out: a little explosion and a shower of coins.", key: "kd_jackpot", max: 1 },
  { id: "super_time", name: "OVERTIME SUPER", icon: "⏱", desc: "The Golden Juice transformation lasts 10 seconds longer. Stacks twice.", key: "kd_super", max: 2 },
  { id: "super_aura", name: "RAINBOW SUPER", icon: "🌈", desc: "Your transformation goes rainbow. Mega melee hits 30% harder.", key: "kd_aura", max: 1 },
  { id: "armor", name: "KREDDLE ARMOUR", icon: "🛡", desc: "Sequinned body armour. Take 10% less damage. Stacks three times. Very shiny.", key: "kd_armor", max: 3 },
  { id: "krezzlong", name: "EXTENDED KREZZ", icon: "⏳", desc: "Your krezz beam lasts half a second longer. Stacks twice.", key: "kd_krezzlong", max: 2 },
  { id: "sperm", name: "AGGRESSIVE SPERMS", icon: "🧬", desc: "Your krezz beam is full of furious little swimmers. They peel off and hunt enemies down. CHOMP.", key: "kd_sperm", max: 1 },
  { id: "hp", name: "HIGH ROLLER", icon: "❤️", desc: "+20 max HP. Stacks three times.", key: "kd_hp", max: 3 },
  { id: "lucky", name: "LUCKY HORSESHOE", icon: "🍀", desc: "Enemies drop 25% more coins. Stacks twice.", key: "kd_lucky", max: 2 },
  { id: "dice", name: "LOADED DICE", icon: "🎲", desc: "Every dodge leaves a pair of dice behind. They explode. Snake eyes.", key: "kd_dice", max: 1 },
  { id: "slotfart", name: "SLOT MACHINE FARTS", icon: "🍒", desc: "Every fart spins the reels: x1, x2 or a x3 jackpot on the damage.", key: "kd_slotfart", max: 1 },
  { id: "g_chainsaw", name: "THE KREDDLE CHAINSAW", icon: "🪚", desc: "A chainsaw. Short range. Absolutely shreds.", gun: "chainsaw" },
  { id: "g_kreddler", name: "THE KREDDLER (MINIGUN)", icon: "🔫", desc: "A gold-plated minigun. Spins up, never stops.", gun: "kreddler" },
  { id: "g_disco", name: "DISCO BALL LAUNCHER", icon: "🪩", desc: "Fires disco balls that explode into rainbow light.", gun: "disco" },
  { id: "g_flush", name: "THE ROYAL FLUSH", icon: "🃏", desc: "Fires a fan of razor-sharp playing cards that go straight through people.", gun: "flush" },
];

export const PRIZE = Object.fromEntries(PRIZES.map((p) => [p.id, p])) as Record<string, Prize>;
