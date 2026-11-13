import type { Line } from "../data/types";
import { dir, ping, say } from "./dsl";

// THE FINALE, PART ONE — the roof of Da Drongus Dungeon. The cauldron fires you up through the roof after him.
// Top down: the lads bound in metal frames round the edge of a round rooftop in the storm, Drongus in the middle.
// Then (side on) he injects the golden pussy juice testosterone into his forehead and becomes DARK DRONGUS.
// He can't be hurt. Free the lads (shoot the frames), do the GROUP WONK, and the GROUP KREZZ does the rest.
// Every lad line is guarded with notPlayer, so whoever you're playing never talks to themselves.

// ---------------------------------------------------------------- arriving on the roof (top down)

export const ROOF_ENTER: Line[] = [
  dir("The cauldron fires you up through the hole in the roof like a cork. You land hard, on your back, in the rain."),
  dir("THE ROOF OF DA DRONGUS DUNGEON. A huge round platform of black stone and cable, open to the storm. Rain sideways. Lightning every few seconds. Far below, the ruins of Krelford, glowing."),
  dir("Round the edge, evenly spaced like numbers on a clock: big metal frames, bolted to the stone. In every frame, clamped in at the wrists and ankles, one of the lads."),
  say("KREZMAR", "OI! OI!! OVER HERE! GET US OUT OF THESE FUCKING THINGS!", { cond: { notPlayer: "KREZMAR" } }),
  say("FLENKY", "MATE! MATE!! IT'S ME! I'M IN A FRAME!", { cond: { notPlayer: "FLENKY" } }),
  say("SCROMBUS", "He's been reading us the chat logs. Out loud. In voices. For six hours.", { cond: { notPlayer: "SCROMBUS" } }),
  say("KREBON", "He did a voice for me. It wasn't even close.", { cond: { notPlayer: "KREBON" } }),
  say("MIKEY", "(over the wind) I can't feel my hands! I CAN'T FEEL MY HANDS!", { cond: { notPlayer: "MIKEY" } }),
  dir("In the very middle of the roof, in the rain, stands Drongus. Skinny. Shirtless. Soaked. Breathing very hard through his nose. One golden bottle under each arm."),
  say("DRONGUS", "There you are. Of course you came. Everyone always comes up to Drongus in the end."),
  say("YOU", "Let them go, Drongus. It's over."),
  say("DRONGUS", "Over? OVER? Oh, it's not over. It's not even started. I've been saving these."),
];

// ---------------------------------------------------------------- the transformation (side on)

export const XF_BOTTLE: Line[] = [
  say("DRONGUS", "Do you know what this is? Do you?"),
  say("DRONGUS", "This is GOLDEN PUSSY JUICE TESTOSTERONE. The purest there is. Cold-pressed. One bottle could turn a pigeon into a heavyweight champion."),
  say("KREBLIS", "That is NOT what testosterone is!", { cond: { notPlayer: "KREBLIS" } }),
  say("DRONGUS", "SHUT UP, KREBLIS. Two bottles. The whole world's supply. And they're MINE."),
  dir("He pulls a syringe out of his shorts. It is enormous. Nobody wants to know where in his shorts it was."),
];

export const XF_SYRINGE: Line[] = [
  say("CRONGUS", "Mate. Mate, no. Not the forehead. NOT THE FOREHEAD.", { cond: { notPlayer: "CRONGUS" } }),
  say("DRONGUS", "Where else would it go? That's where the THOUGHTS are."),
];

export const XF_AFTER: Line[] = [
  dir("Where Drongus stood, something else is standing. Twice the height. Three times the width. A head the size of a wheelie bin, glowing like a lamp. And his eyes are gone: two holes, black all the way down."),
  say("DRONGUS", "(in about four voices at once) DRONGUS IS DEAD. THERE IS ONLY… DARK DRONGUS."),
  say("GRONNY", "…oh no.", { cond: { notPlayer: "GRONNY" } }),
];

/** On the roof again, before the fight: how to win. */
export const FIGHT_BRIEF: Line[] = [
  say("KREZWONK", "Listen to me! LISTEN! You can't hurt him! Nothing can hurt him like that!", { cond: { notPlayer: "KREZWONK" } }),
  say("KREZWONK", "There's only one thing in the world stronger than that juice. The ancient way. The GROUP WONK. All of us. Together.", { cond: { notPlayer: "KREZWONK" } }),
  say("KREBLIS", "He's right. It's in the scrolls. Get us out of these frames and we'll do the rest!", { cond: { notPlayer: "KREBLIS" } }),
  say("FLENKY", "SHOOT THE CLAMPS! SHOOT THE CLAMPS!", { cond: { notPlayer: "FLENKY" } }),
  dir("HE IS INVULNERABLE. Shoot the metal frames to free the lads (each has its own health bar). Dodge his punches, blasts, grenades and the KREZZ BEAM (it sweeps round him: keep moving round the same way, or get behind it). Kill the MINI DRONGI."),
];

/** When the player's a lad whose usual "how to win" lines would be guarded out: the fallback. */
export const FIGHT_BRIEF_SELF: Line[] = [say("YOU", "(to yourself) Can't hurt him. Not like this. Get the lads out. Then… the old way. The GROUP WONK.", { cond: { player: "KREZWONK" } })];

// ---------------------------------------------------------------- during the fight

/** Dark Drongus's floating shouts (no voice). */
export const DD_TAUNTS = [
  "YOUR BULLETS TICKLE",
  "I'M ON THE JUICE NOW",
  "SEEN BY NINE. NOT ONE REACT.",
  "I CAN SEE THROUGH TIME",
  "DRONGUS IS DEAD",
  "LOOK AT MY HEAD. LOOK AT IT.",
  "I AM THE GROUP CHAT NOW",
];
export const DD_PUNCH = ["DRONGUS PUNCH", "FIST OF THE JUICE", "KNUCKLE SANDWICH"];
export const DD_BLAST = ["GOLDEN BLAST", "JUICE BALLS", "EAT TESTOSTERONE"];
export const DD_GRENADE = ["GRENADES!", "CATCH!", "PRESENTS!"];
export const DD_SUMMON = ["MINI DRONGI! ASSEMBLE!", "MY CHILDREN!", "LITTLE DRONGUSES! GET HIM!"];
export const DD_BEAM = ["HHHNNNNGGG…", "WONK… WONK… WONK…", "IT'S COMING…", "HERE IT COMES"];
export const DD_KREZZ = ["KREEEEEEEZZZZZ!!!", "DARK KREZZ!!!", "AAAAAAAAAAH!!!"];
export const DD_FLIP = ["OTHER WAY!", "SIKE!", "REVERSE!"];
export const MINI_SHOUTS = ["DRONG!", "DRONGI!", "mine!", "*tiny screaming*", "SEEN!", "NO REACT!"];

/** A lad, freed. (Spoken, as they climb out of the frame.) */
export const FREED: Record<string, Line[]> = {
  FLENKY: [say("FLENKY", "FREE! I'M FREE! I'M GETTING STRAIGHT BEHIND YOU!")],
  KREZMAR: [say("KREZMAR", "About fucking time! Right, where is the big cunt?")],
  KREBLIS: [say("KREBLIS", "Thank you. My wrists will never be the same. Neither will my soul.")],
  KREZWONK: [say("KREZWONK", "I'm out! Save your strength! We're going to need it for the WONK!")],
  SCROMBUS: [say("SCROMBUS", "Freedom tastes like rain and diesel. Cheers.")],
  KREBON: [say("KREBON", "I was about two minutes off ripping it out myself, but cheers.")],
  CRONGUS: [say("CRONGUS", "Thank god. Thank god. He was going to do my voice next.")],
  GRONNY: [say("GRONNY", "…cheers.")],
  MIKEY: [say("MIKEY", "My hands! I can feel my hands! I CAN FEEL EVERYTHING!")],
};

/** Every freed lad shouts over the storm now and then (floating, no voice). */
export const CHEERS = ["KEEP GOING!", "ONE MORE FRAME!", "BEHIND YOU!", "MOVE!", "WE'RE WITH YOU!", "GET THE CLAMPS!", "DODGE IT!"];
/** The bound ones scream for help (floating). */
export const HELP = ["HELP!", "OVER HERE!", "GET ME OUT!", "MATE!!", "THE CLAMP! SHOOT THE CLAMP!", "HURRY UP!", "I'M GETTING WET!"];

// ---------------------------------------------------------------- the group wonk

export const WONK_READY: Line[] = [
  dir("The last clamp snaps. Every one of the lads is free, soaked, and furious, and standing round the edge of the roof in a perfect circle."),
  say("DRONGUS", "WHAT? WHAT ARE YOU DOING? GET BACK IN YOUR FRAMES."),
  say("KREZWONK", "It's time. Everybody. In a circle. Facing in.", { cond: { notPlayer: "KREZWONK" } }),
  say("KREZMAR", "Is this really the only way?", { cond: { notPlayer: "KREZMAR" } }),
  say("KREBLIS", "It's the only way.", { cond: { notPlayer: "KREBLIS" } }),
  say("YOU", "Lads. On my count. THE GROUP WONK."),
  dir("THE GROUP WONK: mash to fill the shared gauge, and keep it up. Hit the beats as the ring goes round (when the lad lights up) to keep everyone in sync. The more in sync, the more lads join in. It's long. Don't stop."),
];

export const WONK_FAIL: Line[] = [say("KREZWONK", "NO! We lost it! Again! From the top! TOGETHER THIS TIME!", { cond: { notPlayer: "KREZWONK" } })];

/** The shouts round the circle as the group wonk goes (floating). */
export const WONK_SHOUTS = ["TOGETHER!", "IN SYNC!", "DON'T STOP!", "FASTER!", "HOLD IT!", "NEARLY!", "I CAN'T FEEL MY ARM!", "FOR KRELFORD!", "FOR THE CHAT!", "KEEP GOING!", "GROUP WONK!", "ALL TOGETHER NOW!"];
export const WONK_MOANS = ["hnnngh", "HNNNGH", "ohhh", "OHHHH", "mmmmf", "uuurgh", "AAAH", "oh god", "nnnnng"];

// ---------------------------------------------------------------- the GROUP KREZZ (side on)

export const KZ_STAND: Line[] = [
  dir("You stand. All of you. In one line, shoulder to shoulder, in the storm, facing him. Everything pointing the same way. (One very long censor bar.)"),
  say("DRONGUS", "No. No no no. Not the group wonk. NOT THE GROUP WONK."),
];

export const KZ_THROW: Line[] = [
  say("DRONGUS", "IF I CAN'T HAVE IT, NOBODY CAN!"),
  dir("He grabs the second bottle of golden pussy juice testosterone, and a glowing hard drive marked CHAT LOGS, and hurls them both off the edge of the roof."),
  say("FLENKY", "THE LOGS! HE'S THROWN THE LOGS!", { cond: { notPlayer: "FLENKY" } }),
];

export const KZ_LANDED: Line[] = [
  say("SCROMBUS", "We'll get them after. Eyes on him. NOW!", { cond: { notPlayer: "SCROMBUS" } }),
  say("YOU", "NOW, LADS!"),
];

export const KZ_FINISH = ["GROUP…", "KREEEEEEEEEEEZZZZZZ!!!"];

export const KZ_AFTER: Line[] = [
  dir("Where his head was, there is a fine golden mist, and nothing else. The rest of Dark Drongus stands there for a very long second. Then it sits down."),
  say("KREZMAR", "…did we just do that?", { cond: { notPlayer: "KREZMAR" } }),
  say("GRONNY", "We did that.", { cond: { notPlayer: "GRONNY" } }),
  dir("Under your feet, very deep down, something goes CRACK."),
  say("KREBLIS", "Er. Lads. I think the krezz went all the way through the building.", { cond: { notPlayer: "KREBLIS" } }),
];

// ---------------------------------------------------------------- the collapse

export const COLLAPSE: Line[] = [
  dir("Da Drongus Dungeon, all of it, every floor, every server rack, every portrait of Drongus, comes down at once."),
];

export const SURF: Line[] = [
  say("KREZWONK", "GRAB SOMETHING FLAT!", { cond: { notPlayer: "KREZWONK" } }),
  say("MIKEY", "WOOOOOOOOOO!", { cond: { notPlayer: "MIKEY" } }),
  say("CRONGUS", "I'M SURFING! I'M ACTUALLY SURFING!", { cond: { notPlayer: "CRONGUS" } }),
  say("KREZMAR", "COWABUNGA, YOU CUNTS!", { cond: { notPlayer: "KREZMAR" } }),
];

/** The last word, floating over the dust as it settles. */
export const SURF_END = ping("KREBON", "group chat: we're alive. somehow. 9 survivors. 1 head missing (his)", { cond: { notPlayer: "KREBON" } });
