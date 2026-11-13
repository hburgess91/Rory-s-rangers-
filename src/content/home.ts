import type { Line } from "../data/types";
import { dir, say } from "./dsl";

// Everything you can do at home that isn't the telly or the bed.

/** Furniture you can buy at the Kreddle Exchange (Home Furnishings counter). Stored as s.upgrades[`home_${id}`]. */
export interface Decor {
  id: string;
  name: string;
  icon: string;
  price: number;
  desc: string;
  /** what it says when you look at it */
  look: string;
}

export const DECOR: Decor[] = [
  { id: "neon", name: "KREDDLE NEON SIGN", icon: "💡", price: 15, desc: "A buzzing pink neon sign for over the window. It says KREZZ. It does not say anything else.", look: "The neon sign buzzes. KREZZ. Somewhere in Kreddle, Klerble knows you bought it." },
  { id: "plant", name: "SUSPICIOUS HOUSEPLANT", icon: "🪴", price: 10, desc: "A big leafy plant for the corner. Kev says it's 'basically legal'.", look: "" },
  { id: "rug", name: "CASINO CARPET RUG", icon: "🟣", price: 15, desc: "The exact carpet from the Kreddle casino floor, cut into a circle. Hides stains. Causes them.", look: "The casino rug. If you stare at it long enough you feel an urge to gamble." },
  { id: "lava", name: "LAVA LAMP", icon: "🫧", price: 20, desc: "Goes on top of the fridge. Pink and purple blobs, rising and falling, forever.", look: "The blobs rise. The blobs fall. You've lost twenty minutes." },
  { id: "disco", name: "DISCO BALL", icon: "🪩", price: 25, desc: "Hangs from the ceiling and throws little lights everywhere. Your flat is now a club.", look: "The disco ball turns. The room sparkles. Nobody is dancing. You start dancing." },
  { id: "fish", name: "FISH TANK", icon: "🐠", price: 25, desc: "Sits on the radiator. The fish are Kreddle fish: they gamble. One of them owes the others money.", look: "The fish swim in circles. One of them is clearly running a card game." },
  { id: "slot", name: "HOME SLOT MACHINE", icon: "🎰", price: 35, desc: "Your very own slot machine, by the door. Pull it on the way out for a Kroken (once a day).", look: "" },
  { id: "statue", name: "CROBLEY STATUE", icon: "🍬", price: 35, desc: "A grinning Crobley on a marble plinth. It watches you sleep. It approves.", look: "The Crobley statue grins at you. You grin back. It grins harder." },
  { id: "toilet", name: "SOLID GOLD TOILET", icon: "🚽", price: 40, desc: "In the corner. In the open. Solid gold. Nobody has ever been allowed to use it.", look: "" },
];
export const DECOR_BY_ID = Object.fromEntries(DECOR.map((d) => [d.id, d])) as Record<string, Decor>;

export const GOLD_TOILET = [
  "You sit on the solid gold toilet. Fully clothed. Just to feel it. It is cold, and it is glorious.",
  "You consider using the gold toilet for its intended purpose. You decide it's too nice. You use the bus station instead.",
  "You polish the gold toilet. You can see yourself in it. You look rich. You are not rich.",
];

/** What each boss leaves on the trophy shelf if you Kreltalised them. */
export const KREL_TROPHIES: Record<string, string> = {
  krandall: "Kranky Krandall's mortar board (dented)",
  hoard: "a single, perfectly flat Polson trainer",
  cronster: "the Cuddle Cronster's left glove (still warm)",
  reinhardt: "Reinhardt's glass eye (it follows you round the room)",
  rik: "Uncle Rik's string vest (scorched)",
  krozno: "Captain Stanley's pilot wings",
  brand: "a melted Brand Ambassador lanyard",
  troll: "the Troll's keyboard (several keys missing)",
  flatmate: "the Flatmate's labelled milk",
  rival: "the Rival's protein shaker (empty, smells)",
  jam: "the Jam Queen's crown (sticky)",
  flirt: "Flirt Crobley's gold bikini (folded, respectfully)",
  lantern: "a paper lantern (slightly singed)",
  fruity: "a single sequin from Fruity Crobley",
  tank: "a tank tread, Crobley-pink",
  feedback: "a broken microphone",
  machine: "a cog from the Wonking Machine Mk II",
  banhammer: "a splinter of the Banhammer",
  spectre: "a bottle of ectoplasm",
  salmon: "a salmon scale the size of a dinner plate",
};

/** The games console: minigames you've played somewhere else, now on the telly. */
export const CONSOLE_GAMES: { mode: string; name: string }[] = [
  { mode: "crocodile", name: "CROCODILE (rhythm)" },
  { mode: "norwich", name: "NORWICH: CHAMPIONS LEAGUE FINAL" },
  { mode: "cam2cam", name: "CAM2CAM (censored edition)" },
  { mode: "bully", name: "BULLY MIKEY" },
  { mode: "deadlift", name: "DEADLIFT 300" },
  { mode: "burpees", name: "BURPEES" },
  { mode: "runescape", name: "RUNESCAPE" },
  { mode: "facebook", name: "FACEBOOK TROLLING" },
  { mode: "modulator", name: "THE VOICE MODULATOR" },
  { mode: "renovate", name: "RENOVATE THE FLAT" },
  { mode: "girlfriends", name: "GIRLFRIENDS" },
  { mode: "cannon", name: "THE CANNON" },
  { mode: "gig", name: "THE GIG" },
];

/** The group chat on your laptop: what everyone's saying after each chapter. */
export const CHAT_AFTER: Record<number, { s: string; t: string }[]> = {
  0: [
    { s: "DRONGUS", t: "New song lads 🎵 THE KREZZING HOUR" },
    { s: "DRONGUS", t: "Seen by 9" },
    { s: "KREBLIS", t: "Breaking news… nobody's reacted 👍" },
  ],
  1: [
    { s: "SCROMBUS", t: "Wildern's gone then" },
    { s: "KREZMAR", t: "Who's paying for that. Not me. I'm the treasury and I'm saying not me." },
    { s: "DRONGUS", t: "Kranky was a GOOD headmaster" },
  ],
  2: [
    { s: "MIKEY", t: "Polson Towers. Absolute state of it." },
    { s: "GRONNY", t: "waa waa wee waa" },
    { s: "DRONGUS", t: "I've definitely had the last laugh about all the Polson stuff" },
  ],
  3: [
    { s: "FLENKY", t: "am I still banned" },
    { s: "DRONGUS", t: "Yes" },
    { s: "KREZWONK", t: "I saw the Cronster in a dream before any of you. It hugged me. I've not been right since." },
  ],
  4: [
    { s: "CRONGUS", t: "I had a crobley. It looked at me." },
    { s: "KREBLIS", t: "Breaking news… the Crobley factory is gone 👍" },
    { s: "SCROMBUS", t: "Shame. I had a business idea involving that factory." },
  ],
  5: [
    { s: "SANMIK", t: "yee" },
    { s: "SANMIK", t: "rik is no more. dont ask" },
    { s: "KREBON", t: "I was in there for six Krez Years once. Not Rik. Prison. Similar smell." },
  ],
  6: [
    { s: "MIKEY", t: "we stopped a train with a plane" },
    { s: "KREBLIS", t: "Breaking news… we stopped a train with a plane 👍" },
    { s: "KREBON", t: "We could have turned the power off." },
  ],
  7: [
    { s: "DRONGUS", t: "Come on then" },
    { s: "DRONGUS", t: "I'm in the Citadel" },
    { s: "DRONGUS", t: "Bring your thumbs" },
  ],
};

/** Drongus's replies when you finally react to the song, in order. */
export const SONG_REPLIES: string[][] = [
  ["WAIT", "SOMEONE REACTED", "TO THE SONG", "Seen by 9 → REACTED BY 1", "I'm not crying. The lore is crying.", "Have 100 Krezzcoin. Don't tell the others."],
  ["Twice??", "Ok now you're taking the piss", "…it's still nice though"],
  ["Alright don't overdo it", "Now it looks like a bot"],
  ["Banned 😅"],
  ["Unbanned. One more and you're deported."],
  ["Deported 😅", "(Not really. Come back in a sec.)"],
];

/** Dreams that aren't hints or old statuses. */
export const DREAMS: Line[][] = [
  [dir("You dream you're back at Wildern. Kranky Krandall is taking the register. He reaches your name and just says 'Krenshaw Kroplis'. Everyone nods.")],
  [dir("You dream about the Great Tap. It's dripping. Each drip is a little Drongus, shouting 'react to the song'. You wake up thirsty.")],
  [dir("You dream you're a Crobley. Someone is about to nibble you. You wake up just in time. Probably.")],
  [dir("You dream the group chat is a real place, a cold grey room with nine chairs. One chair has 'Seen' written on it. You sit in it.")],
  [dir("You dream you're in Kreddle. President Klerble is dealing cards. Every card is the Krel Tower. He says 'pick one'. You wake up before you pick.")],
  [dir("You dream about Uncle Rik's colon. You don't want to talk about it.")],
  [dir("You dream the Ban Tribunal has banned sleeping. You're dreaming illegally. A small Flenky in a wig is reading you your rights.")],
];
