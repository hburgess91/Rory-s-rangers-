import type { Line } from "../data/types";
import { dir, ping, say } from "./dsl";
import { KRUNCHERS } from "./kreddle";

// THE KREDDLE KRUNCHERS INVADE (start of Chapter 3). Sets up the Kreddle chapter later on.
// The arrival and the Tap happen in town (HubScene); Mikey's beating is a side-on cutscene (VignetteScene);
// the group chat finds out at home (HomeScene); then the shoving match in town.
// "YOU" lines are said by whoever you're playing as. Playing as Mikey, it's POLSON they batter (his protein shake for
// Mikey's bongo): the *_POLSON scripts, and `player: "MIKEY"` / `variants.MIKEY` lines in the shared ones.

export { KRUNCHERS };

/** Over the Kreddle Bridge they come. */
export const KR_ARRIVE: Line[] = [
  dir("The Kreddle Bridge. Something is coming over it. Something in matching neon varsity jackets."),
  say("KLENKY", "We're the Kreddle Krunchers and NO ONE messes with us!!"),
  say("SKROMBUS", "We are BAD to the BONE!!"),
  say("GRENNY", "We HATE the Krelworld Krew! They STINK!!"),
  say("KLENKY", "Well well WELL. If it isn't KRELWORLD. More like SMELL-world!"),
  say("KREDBLIS", "Breaking news… Krelworld SUCKS 👍"),
  say("GRENNY", "Waa waa wee waa! That's Kreddle for 'eat my shorts', NERDS!"),
  say("LIL' KRUNGUS", "Get a load of this dump! It's got a TAP! What a bunch of DWEEBS!"),
  say("KREDMAR", "Krelworld's so poor their tower's held up with sellotape. And loans. MY loans."),
  say("MIKKY K", "Oi, Krelworld! You're all a bunch of fucking cunts!"),
  say("KREDWONK", "I foresaw this moment. In the vision you were all fucking cunts as well."),
  say("KLENKY", "KRUNCHERS RULE! KRELWORLD DROOLS!"),
];

/** At the Great Pussy Juice Tap. */
export const KR_TAP: Line[] = [
  dir("The Great Pussy Juice Tap. The beating heart of Krelworld. It gurgles, contentedly."),
  say("KREDMAR", "So this is their famous Tap. PUSSY JUICE. Disgusting. It's against our religion."),
  say("KREDWONK", "The Krozlen scriptures are very clear on pussy juice."),
  say("KREDBON", "Hold my sequins."),
];
export const KR_PISS: Line[] = [
  say("KREDBON", "HOW ABOUT SOME NICE DICK JUICE!!"),
  dir("Kredbon unzips and pisses straight into the Great Pussy Juice Tap. It goes on for a very, very long time."),
  say("KREDBON", "Seven Krez Years I've been saving that."),
  say("SKROMBUS", "LEGEND! That's going on the Kreddle group chat. OUR group chat has REACTIONS."),
  say("KLENKY", "Right. Who's next? Let's find one of 'em."),
];

/** Poor Mikey. */
export const KR_MIKEY_MEET: Line[] = [
  dir("Outside Krelburger. Mikey is enjoying a fizzy bongo and minding his own business, which is a first."),
  say("MIKEY", "Oh. Alright lads. Wait. You're not my lads."),
  say("KLENKY", "Look what we got here. A Krelworld NERD."),
  say("MIKKY K", "He looks just like me. But WORSE."),
  say("MIKEY", "Lads. Lads. Can we talk about this. I'm a Fragmar veteran."),
  say("GRENNY", "GET HIM!"),
];
export const KR_MIKEY_BEG: Line[] = [
  say("MIKEY", "No— no no no— not the face— please— I've got a status to post—"),
  say("MIKEY", "PLEASE. I'll react to anything. I'll react to DRONGUS'S SONG—"),
  say("KREDWONK", "I foresaw you saying that. It didn't help in the vision either."),
  say("MIKEY", "PLEEEEEASE—"),
];
export const KR_MIKEY_AFTER: Line[] = [
  dir("Mikey lies on the pavement outside Krelburger, groaning. Someone has put his fizzy bongo on his head like a little hat."),
  say("KLENKY", "Tell your little krew the Kreddle Krunchers say HI."),
  say("MIKKY K", "Later, loser!"),
  say("MIKEY", "…ow."),
];

/** Playing as Mikey: it's Polson they find outside Krelburger. (Polson has no Kreddle double: Mikky K does the jeering.) */
export const KR_POLSON_MEET: Line[] = [
  dir("Outside Krelburger. Polson is enjoying a protein shake and minding his own business. It's a post-workout shake. There was no workout."),
  say("POLSON", "Yeeegh. Alright lads. Wait. You're not the lads."),
  say("KLENKY", "Look what we got here. A Krelworld NERD."),
  say("MIKKY K", "Is that a PROTEIN SHAKE? For HIM? Lol. For WHAT."),
  say("POLSON", "Lads. Lads. Can we talk about this. I've got gym at four. Thoughts? 😅"),
  say("GRENNY", "GET HIM!"),
];
export const KR_POLSON_BEG: Line[] = [
  say("POLSON", "No— no no no— not the face— Eden's doing photos later—"),
  say("POLSON", "PLEASE. I'll pay. I'll pay for the shakes. I'll pay for EVERYONE'S shakes—"),
  say("KREDWONK", "I foresaw you saying that. It didn't help in the vision either."),
  say("POLSON", "PLEEEEEASE— YEEEGGHHH—"),
];
export const KR_POLSON_AFTER: Line[] = [
  dir("Polson lies on the pavement outside Krelburger, groaning. Someone has put his protein shake on his head like a little hat."),
  say("KLENKY", "Tell your little krew the Kreddle Krunchers say HI."),
  say("MIKKY K", "Later, loser!"),
  say("POLSON", "…ow. 😅"),
];

/** Back home: the group chat finds out. */
export const KR_HOME: Line[] = [
  dir("Your house. Your phone has not stopped buzzing."),
  ping("MIKEY", "lads", { cond: { notPlayer: "MIKEY" } }),
  ping("MIKEY", "the kreddle krunchers just kicked the absolute shit out of me", { cond: { notPlayer: "MIKEY" } }),
  ping("MIKEY", "outside krelburger", { cond: { notPlayer: "MIKEY" } }),
  ping("MIKEY", "they took my bongo 😢", { cond: { notPlayer: "MIKEY" } }),
  ping("KREBLIS", "Breaking news… Mikey got battered 👍", { cond: { notPlayer: "MIKEY" } }),
  ping("POLSON", "lads", { cond: { player: "MIKEY" } }),
  ping("POLSON", "the kreddle krunchers just kicked the absolute shit out of me", { cond: { player: "MIKEY" } }),
  ping("POLSON", "outside krelburger", { cond: { player: "MIKEY" } }),
  ping("POLSON", "they took my protein shake 😢", { cond: { player: "MIKEY" } }),
  ping("KREBLIS", "Breaking news… Polson got battered 👍", { cond: { player: "MIKEY" } }),
  ping("DRONGUS", "Should have reacted to the song"),
  ping("SCROMBUS", "Who the fuck are the Kreddle Krunchers"),
  ping("KREZMAR", "Kreddle's version of us apparently. They're over by the bridge now. Pissed in the Tap on the way in."),
  {
    s: "YOU",
    t: "NO ONE gets to beat up Mikey but US!!!",
    tag: "new",
    variants: { MIKEY: "NO ONE gets to beat up Polson but US!!!" },
  },
  {
    s: "YOU",
    t: "…Okay. Maybe they get to as well. A bit.",
    tag: "new",
  },
  { s: "YOU", t: "But those Kreddle Krunchers better SCRAM!! We HATE them!", tag: "new" },
  { s: "YOU", t: "Our universe RULES and their universe DROOLS!!", tag: "new" },
  dir("KRELMERGENCY. Everyone to the Kreddle Bridge."),
];

/** Walking up to them at the bridge, before the shoving. */
export const KR_BRAWL_INTRO: Line[] = [
  dir("The whole Krelworld Krew, at the Kreddle Bridge, face to face with the whole Kreddle Krunchers. Nobody has a plan."),
  say("KLENKY", "Ooooh, look. The Krelworld KREW. We're SO scared."),
  { s: "YOU", t: "Our universe RULES and your universe DROOLS!!", tag: "new" },
  say("SKROMBUS", "Oh yeah? Well your universe is LAME and your Tap tastes like PISS."),
  say("SCROMBUS", "That's because one of you PISSED in it!"),
  say("KREDBON", "And I'd do it again."),
  say("MIKEY", "You took my BONGO!", { cond: { notPlayer: "MIKEY" } }),
  say("POLSON", "You took my SHAKE!", { cond: { player: "MIKEY" } }),
  say("MIKKY K", "And it was DELICIOUS, nerd."),
  dir("Somebody shoves somebody. It all kicks off. SHOVE anyone you like (or don't)."),
];

/** Shouted during the shoving (Krunchers). */
export const KR_SHOUTS = [
  "LAME!",
  "Krelworld DROOLS!",
  "Fucking cunts!",
  "Eat my shorts!",
  "DWEEB!",
  "NERD ALERT!",
  "Tap-licker!",
  "Get a load of THIS guy!",
  "Shove THIS, Krelworld!",
  "Kreddle RULES!",
  "Loser!",
  "Your mum's a Krelworlder!",
];
/** Shouted during the shoving (your krew). */
export const KREW_SHOUTS = ["SCRAM!", "Our universe RULES!", "Get OFF!", "Give Mikey his bongo back!", "Kreddle DROOLS!", "Oi!", "You pissed in our TAP!", "Have some of THAT!"];

/** Playing as Mikey: it's Polson's shake they nicked. */
export const KREW_SHOUTS_POLSON = KREW_SHOUTS.map((t) => (t === "Give Mikey his bongo back!" ? "Give Polson his shake back!" : t));

/** They leg it. With your wallets. */
export const KR_LEAVE: Line[] = [
  say("KLENKY", "Alright, alright. We're bored now. Krunchers, MOVE OUT!"),
  say("KREDMAR", "Pleasure doing business with you, Krelworld."),
  say("KREDBLIS", "Breaking news… check your pockets 👍"),
  say("KREDWONK", "We hope Krelworld falls victim to a terrorist attack!"),
  say("GRENNY", "And EVERYONE DIES!"),
  say("KLENKY", "KRUNCHERS RULE!"),
  dir("And they leg it back over the Kreddle Bridge, cackling."),
];
export const KR_AFTER: Line[] = [
  say("KREZMAR", "…Did they just take my wallet?"),
  say("KREBON", "They took my wallet AND my other wallet."),
  say("FLENKY", "They didn't get mine. Got out just in time by doing a ninja backflip."),
  say("KREBLIS", "Breaking news… Flenky's wallet is gone too 👍"),
  say("MIKEY", "They still have my bongo.", { cond: { notPlayer: "MIKEY" } }),
  say("POLSON", "They still have my shake. 😢", { cond: { player: "MIKEY" } }),
  say("KREZWONK", "I have foreseen it. This isn't the last we'll see of the Kreddle Krunchers."),
  { s: "YOU", t: "Next time, we go over THERE. And we get Mikey's bongo back.", tag: "new", variants: { MIKEY: "Next time, we go over THERE. And we get Polson's shake back." } },
];
