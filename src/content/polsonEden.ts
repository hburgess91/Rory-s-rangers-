import type { Line } from "../data/types";
import { dir, say } from "./dsl";

// Polson and Eden are fictionalised Krelworld NPCs. The jokes are about indecision,
// permissions, cheese, voices and petty plans, not about the real people.

/** Three domestic conversations, overheard in Polson Towers. */
export const DOMESTICS: { id: string; title: string; lines: Line[] }[] = [
  {
    id: "dom_food",
    title: "What Are We Having",
    lines: [
      say("POLSON", "Right. Food. Takeaway."),
      say("EDEN", "(from upstairs) We had takeaway yesterday."),
      say("POLSON", "Cooking then."),
      say("EDEN", "(from upstairs) Who's cooking?"),
      say("POLSON", "...restaurant."),
      say("EDEN", "(from upstairs) We've got people coming round."),
      say("POLSON", "So we're cooking for people?"),
      say("EDEN", "(from upstairs) No, they're bringing food."),
      say("POLSON", "So we're not eating?"),
      say("EDEN", "(from upstairs) We're eating THEIR food."),
      say("POLSON", "What are they bringing?"),
      say("EDEN", "(from upstairs) Takeaway."),
      dir("Polson stares into the middle distance for nineteen minutes."),
    ],
  },
  {
    id: "dom_cheese",
    title: "The Cheese Situation",
    lines: [
      say("EDEN", "Polson. There was cheese in the fridge."),
      say("POLSON", "There's always cheese in the fridge."),
      say("EDEN", "There WAS cheese. Past tense. Was."),
      say("POLSON", "Was it the nice one?"),
      say("EDEN", "It was the one I was saving."),
      say("POLSON", "For what?"),
      say("EDEN", "For the people."),
      say("POLSON", "Which people?"),
      say("EDEN", "The people who are coming round!"),
      say("POLSON", "With the takeaway?"),
      dir("Somewhere in Krelford, Flenky senses an opportunity and says 'We can call it Cheesegate' to nobody."),
    ],
  },
  {
    id: "dom_permissions",
    title: "Network Permissions",
    lines: [
      say("EDEN", "Did you give someone access to the Reaction Network?"),
      say("POLSON", "No."),
      say("EDEN", "Someone's got access."),
      say("POLSON", "Mork."),
      say("EDEN", "Don't Mork me."),
      say("POLSON", "Hrrrm mork mork."),
      say("EDEN", "I'm revoking your permissions."),
      say("POLSON", "You can't revoke MY permissions. I approved YOUR permissions."),
      say("EDEN", "And I approved yours."),
      say("POLSON", "So we approved each other."),
      say("EDEN", "So nobody's in charge."),
      dir("The Reaction Network flickers. A dozen contradictory notifications spawn in the hallway and begin to fight each other."),
    ],
  },
];

/** CHEESEGATE: evidence changes depending on who was questioned last. */
export interface CheeseWitness {
  id: string;
  name: string;
  speaker: string;
  /** testimony[lastQuestioned] — what they say depends on who you spoke to previously. */
  testimony: Record<string, Line[]>;
}

export const CHEESE_WITNESSES: CheeseWitness[] = [
  {
    id: "POLSON",
    name: "Polson",
    speaker: "POLSON",
    testimony: {
      none: [say("POLSON", "The cheese? I didn't touch the cheese. I've been deciding what to eat. For nineteen hours."), say("POLSON", "Ask Eden. She hid it. She's always hiding things. Mostly from me.")],
      EDEN: [say("POLSON", "Eden said I ate it? Rich. I saw the FRIDGE eat it. It's been making noises."), say("POLSON", "Mork. Hrrm. That's my statement in the voice. It's more honest in the voice.")],
      FRIDGE: [say("POLSON", "The fridge said that? The fridge is a liar. The fridge has always been a liar."), say("POLSON", "Actually... was it cheddar? I might've had a bit of cheddar. On toast. At 3am. That's not a full eat.")],
      MIKEY: [say("POLSON", "Mikey? Mikey's here? Why is Mikey here? Has Mikey added Eden again?")],
    },
  },
  {
    id: "EDEN",
    name: "Eden",
    speaker: "EDEN",
    testimony: {
      none: [say("EDEN", "I was saving it. For the people. Polson knows. Polson knew."), say("EDEN", "He'll tell you it was the fridge. It wasn't the fridge. The fridge is the only thing in this house with any integrity.")],
      POLSON: [say("EDEN", "He said I HID it? I PUT it in the fridge. That's not hiding. That's FRIDGING."), say("EDEN", "Ask the fridge. The fridge saw everything.")],
      FRIDGE: [say("EDEN", "The fridge said there was never any cheese? ...then what was I saving?"), say("EDEN", "Oh my god. Was I saving nothing? For people? Who are bringing takeaway?")],
      MIKEY: [say("EDEN", "Who let Mikey in. Seriously. Who approved Mikey.")],
    },
  },
  {
    id: "FRIDGE",
    name: "The Fridge",
    speaker: "THE FRIDGE",
    testimony: {
      none: [say("THE FRIDGE", "HMMMMMMMMMMMMM."), say("THE FRIDGE", "(The fridge hums in a way that suggests it knows something.)")],
      POLSON: [say("THE FRIDGE", "HMMM. HMMMMMMM. (The fridge hums the tune of 'Squeeze Your Legs Until You Scrom'. It's deflecting.)")],
      EDEN: [say("THE FRIDGE", "THERE WAS NEVER ANY CHEESE."), say("THE FRIDGE", "THERE WAS ONLY THE WORD. THE WORD CAME FIRST. 'CHEESEGATE'. APRIL 2022. THE GATE CAME BEFORE THE CHEESE.")],
      MIKEY: [say("THE FRIDGE", "HMMMM. (It's humming 'feelin russhen 2day'.)")],
    },
  },
];

export interface Accusation {
  id: string;
  label: string;
  correct: boolean;
  outcome: Line[];
}

export const CHEESE_ACCUSATIONS: Accusation[] = [
  {
    id: "polson",
    label: "Polson ate it (3am, cheddar, toast)",
    correct: false,
    outcome: [say("POLSON", "That's not a full eat! That's a partial eat!"), say("EDEN", "You ATE it?!"), dir("The argument summons a swarm of Cheese Mites from under the fridge.")],
  },
  {
    id: "eden",
    label: "Eden hid it and forgot",
    correct: false,
    outcome: [say("EDEN", "I did NOT forget. I don't forget. I document."), say("POLSON", "She documents."), dir("The argument summons a swarm of Cheese Mites from under the fridge.")],
  },
  {
    id: "fridge",
    label: "The Fridge (it's been making noises)",
    correct: false,
    outcome: [say("THE FRIDGE", "HMMMMMMMMMMMMMMMMMMMM."), dir("The fridge is deeply offended. It opens. Cheese Mites pour out.")],
  },
  {
    id: "flenky",
    label: "There was never any cheese. Flenky invented the '-gate' first.",
    correct: true,
    outcome: [
      say("THE FRIDGE", "CORRECT."),
      say("EDEN", "So I was saving... nothing?"),
      say("POLSON", "For people who are bringing takeaway."),
      say("EDEN", "...that's the most us thing that's ever happened."),
      say("FLENKY", "(over the network) We can call it cheesegate.", { cond: { notPlayer: "FLENKY" } }),
      say("FLENKY", "We can call it cheesegate. I mean. I did. In 2022. You're welcome.", { cond: { player: "FLENKY" } }),
      dir("CHEESEGATE: SOLVED. Polson and Eden are briefly united by the shared experience of having been completely pointless.", { set: { cheesegate_solved: true } }),
    ],
  },
];

/** THE MORK VOICE: three rounds. Pick the right interpretation of Polson's instruction. */
export interface MorkRound {
  mork: string;
  options: { label: string; correct: boolean; fail?: "trapdoor" | "enemies" | "argument" | "machinery" }[];
  success: string;
}

export const MORK_ROUNDS: MorkRound[] = [
  {
    mork: "Mmmrrrk hrrm. Lft. Mork lft dooo hrrm.",
    options: [
      { label: "\"Left door.\"", correct: true },
      { label: "\"Lift the floor.\"", correct: false, fail: "trapdoor" },
      { label: "\"Leftover food.\"", correct: false, fail: "argument" },
    ],
    success: "POLSON: Mork. (He seems pleased. You think.)",
  },
  {
    mork: "Hrrrrm mork. Prrsh. Rrrd bttn. Nnnt grrn. MORK.",
    options: [
      { label: "\"Press the green button.\"", correct: false, fail: "machinery" },
      { label: "\"Press the red button, not the green.\"", correct: true },
      { label: "\"Prawn crackers, bring them.\"", correct: false, fail: "enemies" },
    ],
    success: "POLSON: Mrrk mrrk! (Thumbs up. An actual thumbs up. The Reaction Network glows briefly.)",
  },
  {
    mork: "Edn. Mmmrk. Ssk Edn. Prrrmssn. Hrrm. Nnt mmm.",
    options: [
      { label: "\"Ask Eden for permission, not me.\"", correct: true },
      { label: "\"Eden is a pumpkin.\"", correct: false, fail: "argument" },
      { label: "\"Eat Eden's... no.\"", correct: false, fail: "enemies" },
    ],
    success: "EDEN: (from upstairs) Permission granted. To the junction only. Don't touch the cheese. There is no cheese.",
  },
];
