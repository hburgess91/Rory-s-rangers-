import type { GameState } from "./types";

/** Global run modifiers. Read by the combat, hub and dialogue layers. */
export interface RevisionMods {
  beerHeal?: number;
  enemySpeedMult?: number;
  enemyDamageMult?: number;
  playerDamageMult?: number;
  coinMult?: number;
  slippery?: boolean;
  wonkStart?: number;
  machineMalfunction?: number;
  proctusDoctor?: boolean;
  tapSentient?: boolean;
  splitChance?: number;
  burstRadiusMult?: number;
  maxHpDelta?: number;
  crobleys?: boolean;
  dodgeCooldownMult?: number;
  questRewardMult?: number;
  resentmentDecay?: number;
}

export interface KrazyFact {
  id: string;
  fact: string;
  effect: string;
  submittedBy: string;
  mods: RevisionMods;
  ngPlusOnly?: boolean;
}

export const KRAZY_FACTS: KrazyFact[] = [
  { id: "FIZZY_VEG", fact: "ALL FIZZY BONGOS ARE VEGETABLES", effect: "Fizzy Bongos heal 10 HP. Drunk enemies get lairy (+10% speed).", submittedBy: "Krezmar, mid-withdrawal", mods: { beerHeal: 10, enemySpeedMult: 1.1 } },
  { id: "SALMON_STREETS", fact: "KRELFORD'S STREETS MUST BE PAVED WITH SALMON", effect: "Floors are slippery. Enemies drop salmon (+30% Krezzcoin).", submittedBy: "The Salmon Lobby", mods: { slippery: true, coinMult: 1.3 } },
  { id: "MANDATORY_WONKING", fact: "EVERY CABINET MEETING REQUIRES MANDATORY WONKING", effect: "Wonk Meter starts every room at 40%. Machinery malfunctions more.", submittedBy: "Scrombus (productivity initiative)", mods: { wonkStart: 40, machineMalfunction: 0.25 } },
  { id: "PROCTUS_DOCTOR", fact: "PROCTUS KRELMOR IS LEGALLY A DOCTOR", effect: "Proctus offers free healing in Krelford. Side effects may include side effects.", submittedBy: "Proctus Krelmor, MD (self-certified)", mods: { proctusDoctor: true } },
  { id: "TAP_SENTIENT", fact: "THE GREAT TAP IS SENTIENT", effect: "The Great Tap speaks, has opinions, and refills you to full health.", submittedBy: "Anonymous (the Tap)", mods: { tapSentient: true } },
  { id: "GODRIC", fact: "KRELWORLD WAS CREATED ONE MILLION YEARS AGO BY GODRIC GRYFFINDOR AS A WALUIGI VERSION OF THE REAL UNIVERSE", effect: "Enemies sometimes split into an inverted Waluigi copy on death.", submittedBy: "Drongus, need he remind anyone", mods: { splitChance: 0.18, coinMult: 1.15 } },
  { id: "THREAT_PURPLE", fact: "THE NATIONAL THREAT LEVEL IS PERMANENTLY PURPLE", effect: "Everyone deals 20% more damage. Including you. Is purple high or low? Nobody knows.", submittedBy: "Scrombus, Ministry of Defence (vacant)", mods: { enemyDamageMult: 1.2, playerDamageMult: 1.2 } },
  { id: "KREZZSPLOSION", fact: "THE FABLED KREZZSPLOSION WAS AN INSIDE JOB", effect: "Krezz Burst radius +50%.", submittedBy: "Kreblis (purple alert truther)", mods: { burstRadiusMult: 1.5 } },
  { id: "NO_DEFENCE", fact: "KRELWORLD HAS NO DEFENCE MINISTER AND NEVER WILL", effect: "-15 max HP. +20% damage. Huge oversight.", submittedBy: "Drongus (distracted by the need for all the other ministers)", mods: { maxHpDelta: -15, playerDamageMult: 1.2 } },
  { id: "CROBLEYS", fact: "NIBBLING ON A CROBLEY STRENGTHENS YOUR MEMBER", effect: "Crobleys drop from enemies. They heal and restore Krezz.", submittedBy: "The Crobley Arc", mods: { crobleys: true } },
  { id: "KREZOUSERS", fact: "ALL TROUSERS ARE LEGALLY KREZ-OUSERS AND MAY BE HELD TO RANSOM", effect: "Dodge recovers 35% faster (shorts are aerodynamic).", submittedBy: "Gronny G, minus six degrees", mods: { dodgeCooldownMult: 0.65 } },
  { id: "WIKI_PENDING", fact: "THE WIKI WILL BE UPDATED AT... SOME POINT", effect: "Quest and boss rewards +50%.", submittedBy: "Drongus, 15 Jan 2025", mods: { questRewardMult: 1.5 } },
  { id: "APPRECIATED", fact: "DRONGUS IS DEEPLY APPRECIATED BY ALL MEMBERS AT ALL TIMES", effect: "Drongus's resentment slowly decays. He is suspicious of this.", submittedBy: "Scrombus ('I'm here 4 u')", mods: { resentmentDecay: 1 }, ngPlusOnly: true },
  { id: "SCROMBUS_EARLY", fact: "SCROMBUS ARRIVED A LITTLE AHEAD OF SCHEDULE. THE ANCIENTS WORK IN MYSTERIOUS WAYS", effect: "Turrets and machinery deal +30% damage for everyone.", submittedBy: "The Prophecy", mods: { playerDamageMult: 1.1, machineMalfunction: -0.1 }, ngPlusOnly: true },
];

export function factById(id: string): KrazyFact | undefined {
  return KRAZY_FACTS.find((f) => f.id === id);
}

/** Combine every active revision's modifiers. Multipliers multiply, flags OR, numbers add. */
export function activeMods(s: Pick<GameState, "revisions">): Required<RevisionMods> {
  const out: Required<RevisionMods> = {
    beerHeal: 0,
    enemySpeedMult: 1,
    enemyDamageMult: 1,
    playerDamageMult: 1,
    coinMult: 1,
    slippery: false,
    wonkStart: 0,
    machineMalfunction: 0,
    proctusDoctor: false,
    tapSentient: false,
    splitChance: 0,
    burstRadiusMult: 1,
    maxHpDelta: 0,
    crobleys: false,
    dodgeCooldownMult: 1,
    questRewardMult: 1,
    resentmentDecay: 0,
  };
  for (const id of s.revisions) {
    const f = factById(id);
    if (!f) continue;
    const m = f.mods;
    if (m.beerHeal) out.beerHeal += m.beerHeal;
    if (m.enemySpeedMult) out.enemySpeedMult *= m.enemySpeedMult;
    if (m.enemyDamageMult) out.enemyDamageMult *= m.enemyDamageMult;
    if (m.playerDamageMult) out.playerDamageMult *= m.playerDamageMult;
    if (m.coinMult) out.coinMult *= m.coinMult;
    if (m.slippery) out.slippery = true;
    if (m.wonkStart) out.wonkStart += m.wonkStart;
    if (m.machineMalfunction) out.machineMalfunction += m.machineMalfunction;
    if (m.proctusDoctor) out.proctusDoctor = true;
    if (m.tapSentient) out.tapSentient = true;
    if (m.splitChance) out.splitChance += m.splitChance;
    if (m.burstRadiusMult) out.burstRadiusMult *= m.burstRadiusMult;
    if (m.maxHpDelta) out.maxHpDelta += m.maxHpDelta;
    if (m.crobleys) out.crobleys = true;
    if (m.dodgeCooldownMult) out.dodgeCooldownMult *= m.dodgeCooldownMult;
    if (m.questRewardMult) out.questRewardMult *= m.questRewardMult;
    if (m.resentmentDecay) out.resentmentDecay += m.resentmentDecay;
  }
  out.wonkStart = Math.min(out.wonkStart, 90);
  return out;
}

/** Three facts the player hasn't adopted yet. Deterministic per chapter so reloading doesn't reroll. */
export function offerFacts(s: GameState, count = 3): KrazyFact[] {
  const pool = KRAZY_FACTS.filter((f) => !s.revisions.includes(f.id) && (!f.ngPlusOnly || s.ngPlus > 0));
  const seed = s.chapter * 7 + s.ngPlus * 13 + s.player.length;
  const out: KrazyFact[] = [];
  const copy = [...pool];
  let x = seed;
  while (out.length < count && copy.length) {
    x = (x * 9301 + 49297) % 233280;
    out.push(copy.splice(x % copy.length, 1)[0]);
  }
  return out;
}

export function adoptFact(s: GameState, id: string): boolean {
  if (!factById(id) || s.revisions.includes(id)) return false;
  s.revisions.push(id);
  return true;
}
