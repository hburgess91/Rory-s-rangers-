import type { Line } from "../data/types";
import { dir, say } from "./dsl";

// THE FINALE, PART B: back in Krelford after Da Drongus Dungeon falls. THE CONCEPT OF PAEDOPHILIA.
// The monster only ever speaks in clinical, definitional language (diagnostic-manual and encyclopaedia phrasing).
// It never says anything else. That's the joke, and that's the line.

/** The monster's speaker id (its portrait is made from the side-on art). */
export const CONCEPT = "THE CONCEPT OF PAEDOPHILIA";
const c = (t: string): Line => say(CONCEPT, t, { sfx: "roar" });

// ---------------------------------------------------------------- the wreck heap

export const FB_LANDED: Line[] = [
  dir("Krelford. Night. Rain. Where Da Drongus Dungeon stood an hour ago: a mountain of smoking wreckage the size of a small county."),
  dir("At the bottom of it, one by one, the Krelworld Krew skid to a stop on slabs of masonry, like the world's worst ski holiday."),
];

export const FB_CELEBRATE: Line[] = [
  say("KREZMAR", "WE DID IT. WE ACTUALLY FUCKING DID IT."),
  say("SCROMBUS", "His head EXPLODED. His whole head! Off!"),
  say("GRONNY", "Me surf on wall. Best day of me life."),
  say("KREBLIS", "Breaking news… Drongus is dead 👍"),
  say("FLENKY", "Did everyone see my landing? Nobody saw my landing."),
  say("KREBON", "Is this a crime scene? Feels like a crime scene. I'm on probation."),
  say("CRONGUS", "Lads. LADS. Think about what this means."),
  say("MIKEY", "Does it mean I'm in the group now?"),
  say("KREZWONK", "It means… oh my god. We can now delete the chat logs."),
  dir("Silence. Then the loudest cheer Krelford has ever heard. Somebody starts a conga. It goes once round the wreckage and falls apart."),
  { s: "YOU", t: "OH MY GOD. WE CAN NOW DELETE THE CHAT LOGS.", tag: "new" },
];

export const FB_SILENCE: Line[] = [
  dir("…and then it's quiet. Just the rain. Thunder rolling round the ruins. Somewhere, a car alarm gives up."),
  say("KREZMAR", "He chucked them off the roof. The logs. They landed in town somewhere."),
  say("KREZWONK", "I saw it. A green glow, over that way. Go and get them. We'll be right behind you."),
  say("SCROMBUS", "Then we smash them. Then we burn the bits. Then we bury the ash."),
  say("KREBON", "Then we turn the internet off."),
  say("KREZMAR", "Krebon. Not now."),
];

export const FB_FOUND_LOGS: Line[] = [
  dir("There they are. In a puddle, glowing a sickly green: THE CHAT LOGS. Every message. Every song nobody reacted to. Every pudding."),
  say("CRONGUS", "Pick them up. Quick. Before anything—"),
];

export const FB_RUMBLE: Line[] = [
  dir("The ground shudders. The puddles ripple. Up the hill, the wreck heap… moves."),
  say("MIKEY", "…did anyone else feel that?"),
  say("KREBLIS", "Surely not."),
  say("SCROMBUS", "Surely NOT."),
  say("FLENKY", "Surely not, surely not, surely not."),
  say("GRONNY", "Surely… not?"),
  say("KREZMAR", "Lads. Don't say it. Don't anyone say 'final form'."),
];

// ---------------------------------------------------------------- the emergence (side-on)

export const FB_EMERGE_PANIC: Line[] = [
  say("MIKEY", "AAAAAAAAAAAAAAAAAAAAAAAA"),
  say("KREZMAR", "LIKE WHAT THE FUCK IS THAT CUNT"),
  say("SCROMBUS", "IT'S GOT ARMS. IT'S GOT SO MANY ARMS."),
  say("FLENKY", "Is that… is there a man behind it? When the lightning goes?"),
  say("KREZWONK", "A wizard. A dark wizard. I've seen that silhouette before."),
  say("KREBON", "That's Drongus. The OLD Drongus. The final form one. In a cape."),
];

export const FB_TITLE_REACT: Line[] = [
  say("KREBLIS", "The concept of—"),
  say("CRONGUS", "The concept of—"),
  say("GRONNY", "The conc—"),
];

export const FB_DEFINITION: Line[] = [
  c("Paedophilia (also spelled pedophilia) is defined as a primary or exclusive sexual attraction by an adult or older adolescent (generally age 16 or older) toward prepubescent children (typically age 13 or younger)."),
];

export const FB_DEFIANT: Line[] = [
  dir("A long, horrified silence. Rain hisses on its hide."),
  say("KREZMAR", "Right. No. Absolutely not. Not in Krelford."),
  say("KREZWONK", "We need to destroy the concept of paedophilia once and for all!"),
  say("SCROMBUS", "It's the only way to prevent the group chat logs being leaked!"),
  say("FLENKY", "I don't fully follow the logic but I've never been more up for something in my life."),
  { s: "YOU", t: "EVERYONE. OPEN. FIRE.", tag: "new" },
];

// ---------------------------------------------------------------- the fight

export const FB_ARENA: Line[] = [
  dir("THE CONCEPT OF PAEDOPHILIA. It fills half of what's left of Krelford. Every lightning strike shows the wizard behind it."),
  dir("Shoot it. The lads will shoot it too. Dodge everything."),
];

/** Its occasional lines: clinical and definitional only. */
export const CONCEPT_BARKS = [
  "DSM-5: PEDOPHILIC DISORDER.",
  "ICD-11 CODE 6D32.",
  "CLASSIFIED AS A PARAPHILIA.",
  "CRITERION A: A DURATION OF AT LEAST SIX MONTHS.",
  "CRITERION C: AT LEAST 16 YEARS OF AGE.",
  "…AND AT LEAST FIVE YEARS OLDER THAN THE CHILD.",
  "SPECIFY WHETHER: EXCLUSIVE TYPE. NONEXCLUSIVE TYPE.",
  "PREVALENCE IN THE GENERAL POPULATION: UNKNOWN.",
  "FROM THE GREEK: PAIS, PAIDOS. 'CHILD.'",
  "SEE ALSO: CHRONOPHILIA.",
  "DIFFERENTIAL DIAGNOSIS REQUIRED.",
  "THIS ARTICLE IS ABOUT THE PSYCHIATRIC DIAGNOSIS.",
  "[CITATION NEEDED]",
  "ONSET TYPICALLY IN ADOLESCENCE.",
  "AETIOLOGY: NOT FULLY UNDERSTOOD.",
];

/** Every time it heals. */
export const CONCEPT_HEAL = "NO CURE HAS BEEN DEVELOPED.";

export const FB_HEAL: Line[][] = [
  [
    c("NO CURE HAS BEEN DEVELOPED."),
    say("SCROMBUS", "IT HEALED. IT FULLY HEALED. ALL OF IT."),
    say("KREZMAR", "Keep shooting! It can't do that forever!"),
  ],
  [
    c("NO CURE HAS BEEN DEVELOPED."),
    say("FLENKY", "It's done it AGAIN."),
    say("KREBON", "We've been shooting it for ages. I've shot it with everything. I shot it with a chair."),
    say("GRONNY", "Me arms tired."),
  ],
  [
    c("NO CURE HAS BEEN DEVELOPED."),
    say("KREBLIS", "Breaking news… we're going to die 👍"),
    say("MIKEY", "Is this how it ends? I never even got in the group."),
    dir("Despair. Absolute despair. The rain gets heavier, out of spite."),
  ],
];

export const FB_REALISE: Line[] = [
  say("KREZWONK", "WAIT."),
  say("KREZWONK", "WAIT, THE GOLDEN PUSSY JUICE TESTOSTERONE."),
  say("CRONGUS", "The second bottle! He chucked it off the roof with the logs!"),
  say("KREZMAR", "It landed over there. Somebody get it. YOU. Go. We'll keep it busy."),
];

export const FB_GOKU: Line[] = [
  dir("By the bottle, standing perfectly still in the rain like he's been waiting all day, is a small spiky-haired man in an orange gi."),
  say("GOKU", "Hi! I'm Goku!"),
  { s: "YOU", t: "…what.", tag: "new" },
  say("GOKU", "I felt a really bad power level and came straight here! Wow, that thing's tough. It keeps healing, huh?"),
  say("GOKU", "Listen! There's only one attack that can wipe out a whole CONCEPT. I've gotta charge up a SPIRIT CUM."),
  { s: "YOU", t: "A spirit WHAT.", tag: "new" },
  say("GOKU", "A SPIRIT CUM! Everyone lends me their energy and I make it into one big ball! It takes a while though."),
  say("GOKU", "While I charge it, you take that golden stuff and inject every one of your friends with it. All of them. Don't skip anyone!"),
  say("GOKU", "It'll wake up their power. Then you hold that monster off until I'm ready. Got it? Great! Go go go!"),
  dir("He raises both arms to the sky. A pinprick of white-gold light appears above his hands."),
];

export const FB_INJECT_HINT = "Inject each of the lads (walk up, press E). Don't get hit.";

/** What each lad says as you jab them. */
export const INJECT_BARKS: Record<string, string> = {
  FLENKY: "OW. In the NECK? Fair enough.",
  KREZMAR: "Straight in the arse, lad. I trust you.",
  KREBLIS: "Breaking news… I feel incredible 👍",
  KREZWONK: "I foresaw the needle. I did not foresee the size of it.",
  SCROMBUS: "OH. OH THAT'S THE GOOD STUFF.",
  KREBON: "Is this legal? Don't answer that.",
  CRONGUS: "It's warm. Why is it warm. Don't tell me.",
  GRONNY: "Me feel… BIG.",
  MIKEY: "Am I in the group now? Is this the initiation?",
};

export const FB_ALL_INJECTED: Line[] = [
  dir("The last plunger goes down. For a second, nothing."),
  dir("Then every single one of the Krelworld Krew starts to glow."),
];

export const FB_TRANSFORM: Line[] = [
  say("KREZMAR", "Lads. I feel… I feel…"),
  say("GRONNY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"),
  say("SCROMBUS", "MY SHIRT. MY SHIRT'S GONE. WHERE DID THESE COME FROM."),
  say("FLENKY", "I can see through time. Ninjas can't even do that."),
  say("MIKEY", "Is this what it's like being in the group?"),
];

export const FB_PHASE2: Line[] = [
  say("KREZWONK", "We can HURT it now. Look at it bleed concepts."),
  say("KREZMAR", "We don't need to kill it. We just need to hold out till Goku's ready."),
  say("GOKU", "(from across town) KEEP IT BUSY! THE SPIRIT CUM GETS BIGGER THE WEAKER IT GETS!"),
];

export const FB_FINAL_HEAL: Line[] = [
  c("NO CURE HAS BEEN DEVELOPED."),
  dir("Every wound closes. Every arm grows back. Its health bar fills, all the way, in one sickening glug."),
];

export const FB_NO = "NOOOOOOOOO";

export const FB_READY: Line[] = [
  say("GOKU", "Don't worry, everyone! IT'S READY!"),
  say("GOKU", "SPIRIIIIIIIT…"),
];

export const FB_SPIRIT: Line[] = [
  say("GOKU", "…CUUUUUUUUUUUUUUUUM!!!"),
];

export const FB_DESTROYED: Line[] = [
  dir("A flash of ethereal, gorgeous white light. It washes over Krelford, over the rubble, over the rain."),
  dir("When it fades, THE CONCEPT OF PAEDOPHILIA is gone. Not dead. Gone. Unwritten. The wizard behind it goes with it, in a long, thin, very satisfying scream."),
  c("THIS ARTICLE HAS BEEN DELETED."),
];

export const FB_AFTER: Line[] = [
  dir("Silence. The rain stops. Actually stops. For the first time in Chapter 7, there are stars."),
  say("KREZMAR", "…is it gone?"),
  say("GOKU", "Yep! The concept of paedophilia has been destroyed once and for all!"),
  say("KREBLIS", "Breaking news… we did it 👍"),
  say("GRONNY", "Me still shirtless."),
  say("SCROMBUS", "We're ALL still shirtless."),
  say("GOKU", "Well, I'm starving! Bye, everyone!"),
  dir("And he's gone. Nobody ever finds out how he got there. Nobody ever asks."),
  say("KREZWONK", "Right. The logs."),
  { s: "YOU", t: "Let's delete the chat logs.", tag: "new" },
];
