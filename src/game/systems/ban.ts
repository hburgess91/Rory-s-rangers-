import type { GameState } from "../../data/types";

export const BAN_MAX = 100;

export interface BanRule {
  id: string;
  decree: string;
  /** What breaks the rule, checked by the combat scene. */
  kind: "NO_DODGE" | "NO_HEAL" | "NO_SPECIAL" | "KEEP_MOVING" | "NO_STANDING_STILL" | "NO_ATTACK_SPAM";
  risk: number;
}

/** Arbitrary Drongus rules. All of them are real in spirit. */
export const BAN_RULES: BanRule[] = [
  { id: "dodge", decree: "NEW RULE: DODGING IS NOW ILLEGAL.", kind: "NO_DODGE", risk: 22 },
  { id: "heal", decree: "NEW RULE: HEALING REQUIRES A PERMIT. NOBODY HAS A PERMIT.", kind: "NO_HEAL", risk: 30 },
  { id: "special", decree: "NEW RULE: ALL KREZZ BELONGS TO THE STATE. SPECIALS ARE THEFT.", kind: "NO_SPECIAL", risk: 25 },
  { id: "still", decree: "NEW RULE: ANYONE STANDING STILL IS LURKING. LURKING IS BANNABLE.", kind: "NO_STANDING_STILL", risk: 6 },
  { id: "parents", decree: "NEW RULE: ANYONE WHOSE PARENTS ARE STILL TOGETHER IS BANNED. (Sorry Jenko.)", kind: "NO_ATTACK_SPAM", risk: 4 },
];

export function banMultiplier(s: GameState): number {
  // Flenky gets banned faster. It's tradition.
  return s.player === "FLENKY" ? 1.5 : 1;
}

/** Adds ban risk. Returns true if this pushed the player over the edge into Exile. */
export function addBanRisk(s: GameState, amount: number): boolean {
  if (amount <= 0) return false;
  s.banRisk = Math.min(BAN_MAX, s.banRisk + amount * banMultiplier(s));
  return s.banRisk >= BAN_MAX;
}

export function coolBanRisk(s: GameState, amount: number) {
  s.banRisk = Math.max(0, s.banRisk - amount);
}

/** Called when the Banhammer lands. Not death: just Exile. */
export function enterExile(s: GameState) {
  s.banCount += 1;
  s.banRisk = 0;
  s.flags.lastBanned = true;
}

/** Re-entry challenges. Short, arbitrary and petty. */
export interface ReentryChallenge {
  id: string;
  title: string;
  prompt: string;
  options: { label: string; correct: boolean; reply: string }[];
}

export const REENTRY_CHALLENGES: ReentryChallenge[] = [
  {
    id: "apology",
    title: "FORM B-4N: APOLOGY",
    prompt: "Complete the following sentence to the satisfaction of the Supreme Leader:\n\"I am sorry for ______.\"",
    options: [
      { label: "...not reacting to the song.", correct: true, reply: "DRONGUS: Accepted. Barely." },
      { label: "...nothing. I did nothing wrong.", correct: false, reply: "DRONGUS: Wow. Okay. Interesting. Noted. Whatever." },
      { label: "...my parents still being together.", correct: true, reply: "DRONGUS: Fair. That one wasn't your fault. It was absolutely your fault." },
    ],
  },
  {
    id: "quiz",
    title: "CITIZENSHIP QUIZ",
    prompt: "What is the plural of Drongus?",
    options: [
      { label: "Drongi", correct: true, reply: "DRONGUS: Correct. You were there. You remember." },
      { label: "Drongus's", correct: false, reply: "DRONGUS: Apostrophe crime. Back in the queue." },
      { label: "Drongeese", correct: false, reply: "DRONGUS: That's actually quite good. Still no." },
    ],
  },
  {
    id: "fact",
    title: "KRAZY FACT REQUIRED",
    prompt: "Provide a Krazy Fact about Krelworld within 24 hours, or remain booted.",
    options: [
      { label: "Krebon is coming. It said so on a menu. Real butter.", correct: true, reply: "DRONGUS: Holy shit. Wow. It all suddenly makes sense." },
      { label: "Krelworld is in Southampton.", correct: false, reply: "DRONGUS: It's its own fucking universe/dimension." },
      { label: "Chocolate Cronstons. Every nan had them in her choccy drawer.", correct: true, reply: "DRONGUS: Wake up sheeple. Readmitted." },
    ],
  },
  {
    id: "react",
    title: "OUTSTANDING CONTENT",
    prompt: "You have 1 unreacted Drongus post from 9 Jan 2025: 'Squeeze your legs until you scrom'. React now.",
    options: [
      { label: "😂", correct: true, reply: "DRONGUS: Finally. Actually got a proper good beat to it doesn't it." },
      { label: "Seen", correct: false, reply: "DRONGUS: Am I just talking to myself in here?" },
      { label: "👍", correct: true, reply: "DRONGUS: A thumb. Fine. A thumb is a start." },
    ],
  },
];

export function pickChallenge(s: GameState, rnd: () => number = Math.random): ReentryChallenge {
  return REENTRY_CHALLENGES[Math.floor(rnd() * REENTRY_CHALLENGES.length) % REENTRY_CHALLENGES.length];
}
