import type { Line } from "../../data/types";
import { dir, ping, say } from "../dsl";

// CHAPTER 7, after Drongus's lair: Krelford, the morning after the Krunch Protocol.
// The joke: the lads think they did all this on a night out. Nobody says "missiles". Nobody says "bombed".

export const AFTER_WAKE: Line[] = [
  dir("Krelford. Night. Rain. Thunder. Smoke everywhere, and embers drifting past like snow. Where the Town Hall used to be, there's a big pile of something."),
  dir("The pile moves."),
];

export const AFTER_HANGOVER: Line[] = [
  say("KREZMAR", "…ughhhhhh."),
  say("MIKEY", "Ugh. Lads. LADS. My head."),
  say("KREBLIS", "Breaking news… I'm never drinking again 👍"),
  say("SCROMBUS", "What happened last night?"),
  say("KREBON", "We went on a mad one. An EXTRA mad one."),
  say("GRONNY", "Me no remember. Me remember disco. Then ceiling."),
  say("FLENKY", "Got out just in time by doing a ninja backflip. Into the floor. Through the floor."),
  say("CRONGUS", "Has someone moved the Town Hall? It's… lower."),
  say("KREZWONK", "I foresaw this hangover. I did not foresee its scale."),
  say("KREZMAR", "Look at the state of the place. We really went for it."),
  say("MIKEY", "Someone's set fire to Krelburger. Classic us."),
  say("SCROMBUS", "Whose round was it? Be honest."),
  say("KREBON", "Somebody's going to have to tidy all this up. Not me. I'm on probation."),
  say("KREBLIS", "Mmm… smoke…"),
  { s: "YOU", t: "Honestly lads. Best night ever. I think.", tag: "new" },
];

export const AFTER_LEAK: Line[] = [
  dir("Somewhere in the rubble, a phone buzzes. Then another. Then all of them. At once."),
  ping("DRONGUS", "DA DAY OF JUDGEMENT"),
  ping("DRONGUS", "The chat leaks tonight 🙂"),
  ping("DRONGUS", "All of it. Every message. Every song you didn't react to."),
  dir("A long, terrible silence."),
];

/** Played over the shrieking. */
export const AFTER_SHRIEK: Line[] = [
  say("MIKEY", "AAAAAAIIIIIEEEEEEE!!!"),
  say("KREZMAR", "EEEEEEEEEEEEEEEEE!!!"),
  say("KREZMAR", "My job. MY JOB. If my boss sees the chat I'm finished."),
  say("SCROMBUS", "The whole town's going to see it! The whole town is going to JUDGE us!"),
  say("CRONGUS", "They'll see the pudding stuff. Everyone in Krelford will know."),
  say("FLENKY", "I'll never work in this town again."),
  say("GRONNY", "Me job! Me… what is me job?"),
  say("KREBLIS", "Breaking news… we are fucked 👍"),
  say("KREBON", "We could turn the internet off."),
  say("KREZMAR", "Krebon. NOT NOW."),
];

export const AFTER_CRYSTAL: Line[] = [
  dir("Then: a glow, from somewhere in the rubble. Pink. Insistent."),
  say("KREZWONK", "Lads. Look."),
  dir("It's a cum crystal. The sixth one. It's just… there. Nobody knows where it came from. Nobody asks."),
  say("MIKEY", "Six. That's six. When did we get six?"),
  say("KREBON", "We must have got it last night."),
  say("SCROMBUS", "Absolute legends. Even blackout drunk we're on mission."),
  dir("At the top of town, through the smoke, the six slots on Da Drongus Dungeon light up one by one. The gates grind open."),
  say("KREZMAR", "Right. It's game on. We stop the leak."),
  { s: "YOU", t: "Da Drongus Dungeon. Let's go.", tag: "new" },
  dir("CUM CRYSTALS: 6/6. DA DRONGUS DUNGEON IS OPEN."),
];
