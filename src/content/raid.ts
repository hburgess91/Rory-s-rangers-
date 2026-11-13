import type { Line } from "../data/types";
import { dir, say } from "./dsl";

// CHAPTER 6, THE KREDDLE RAID: the lads march through Kreddle with chemical weapons. Everything here is fictional
// cartoon carnage. The text lives here so the voice extractor finds it; KreddleScene's raid mode plays it.

/** Crossing the bridge into Kreddle, night, rain, sirens. */
export const RAID_ARRIVE: Line[] = [
  dir("Midnight. Rain. Kreddle glows on the far side of the bridge like a fruit machine that has never once paid out."),
  dir("Behind you: the Krelworld Krew, armed to the teeth with things banned under the Krelneva Convention."),
  say("SCROMBUS", "Right. The plan. We walk down the Strip. We burn everything. We get to the Palace. Krezwonk plants the bomb. We run."),
  say("KREBON", "Should we turn the power off first?"),
  say("SCROMBUS", "We're going to turn EVERYTHING off, Krebon. Permanently."),
  say("FLENKY", "This is for Mollor. My sweet flirtkitten. LIGHT 'EM UP!"),
  dir("HOLD the attack button (mouse / Space / the fire button) to spray CHEMICAL FIRE. Walk EAST along the Strip. Burn the barricades to get through."),
];

/** The lads shouting as they march (each line is shouted by its speaker, in a speech bubble). */
export const RAID_SHOUTS: Line[] = [
  say("FLENKY", "This is for the Krel Tower!!"),
  say("FLENKY", "FOR MOLLOR!!!"),
  say("FLENKY", "That's for my flirtkitten, you neon CUNTS!"),
  say("KREZMAR", "We hate you! We've ALWAYS hated you!"),
  say("KREZMAR", "Ere's what I fink of your casino!"),
  say("KREZMAR", "Burn, Kreddle, BURN!"),
  say("KREBLIS", "Breaking news… Kreddle is on fire 👍"),
  say("KREBLIS", "Breaking news… it's still on fire 👍"),
  say("KREZWONK", "I have foreseen this. It was brighter in the vision."),
  say("KREZWONK", "The prophecy said 'and Kreddle shall be lit'. I'd assumed it meant the signs."),
  say("SCROMBUS", "Lore update: Kreddle is now a crater. I'll write it up later."),
  say("SCROMBUS", "Stick to the plan! The plan is: everything!"),
  say("KREBON", "Shall I turn the power off? Oh. It's already off. It's all on fire."),
  say("KREBON", "Six Krez Years in prison and THIS is the most fun I've had."),
  say("CRONGUS", "This is definitely against the Krelneva Convention…"),
  say("CRONGUS", "…oh fuck it. BURN!"),
  say("GRONNY", "Me no like Kreddle! Me make Kreddle HOT!"),
  say("GRONNY", "FIRE! Fire good! Kreddle bad!"),
  say("MIKEY", "For my bongo!! FOR MY FIZZY BONGO!!"),
  say("MIKEY", "Fragmar was worse than this. Not much worse."),
  say("MIKEY", "FGM ops never sleep, Kreddle!"),
  say("KREZMAR", "We hate you!"),
  say("GRONNY", "We hate you!"),
  say("FLENKY", "Your president's NEXT!"),
  say("SCROMBUS", "Krelworld Krew UNITE!"),
  say("KREBLIS", "Breaking news… you lot should've let us drink the juice 👍"),
];

/** Shouted when a lad fires a rocket at something in the sky. */
export const RAID_ROCKET_SHOUTS: Line[] = [
  say("MIKEY", "AIR CONTACT! Rocket out!"),
  say("KREZMAR", "Get that plane down!"),
  say("GRONNY", "Bird! Big bird! BOOM bird!"),
  say("KREBON", "I've turned THAT one off."),
  say("FLENKY", "Pull up, pull up… no, actually, DON'T pull up!"),
  say("KREBLIS", "Breaking news… Kreddle Air has cancelled all flights 👍"),
  say("KREZWONK", "I foresaw that one falling. Slightly to the left. Duck."),
];

/** Shouted when a lad lobs a chemical weapon. */
export const RAID_THROW_SHOUTS: Record<"napalm" | "gas" | "nails", Line[]> = {
  napalm: [say("KREZMAR", "NAPALM, BITCHES!"), say("MIKEY", "Napalm out! Smells like victory!"), say("GRONNY", "Hot barrel! Catch!")],
  gas: [say("SCROMBUS", "Mustard gas! Hold your breath, lads!"), say("KREBON", "Gas! Nobody light a fag… actually, light a fag."), say("CRONGUS", "Gas, gas, GAS!")],
  nails: [say("FLENKY", "NAIL BOMB! Get down!"), say("KREBLIS", "Breaking news… nails 👍"), say("MIKEY", "Nail bomb! Proper old-school!")],
};

/** Kreddlers screaming as they run (shown in bubbles). */
export const RAID_SCREAMS: Line[] = [
  say("KREDDLER", "AAAAARGH!!"),
  say("KREDDLER", "I'M ON FIRE!!"),
  say("KREDDLER", "IT'S THE TAP-LICKERS!!"),
  say("KREDDLER", "THE HOUSE ALWAYS WINS?! NOT TONIGHT!!"),
  say("KREDDLER", "MY CHIPS!! MY CHIIIIPS!!"),
  say("KREDDLER", "WHY IS THE FIRE GREEN?!"),
  say("KREDDLER", "RUN! TO THE BUNKERS!"),
  say("KREDDLER", "I DIDN'T EVEN GAMBLE TODAY!"),
  say("KREDDLER", "THIS IS AGAINST THE KROZLEN SCRIPTURES!"),
  say("KREDDLER", "WE ONLY SHOVED YOU A BIT!!"),
  say("KREDDLER", "MUMMYYYY!"),
  say("KREDDLER", "Help! HELP! My sequins are melting!"),
  say("KREDDLER", "Ow. Ow. Ow ow ow OW OW!"),
  say("KREDDLER", "I'll never shove again!!"),
];

/** The Kreddle Tannoy, over the sirens. */
export const RAID_TANNOY: Line[] = [
  say("KREDDLE TANNOY", "This is an emergency broadcast. All Kreddlers proceed to the bunkers. This is not a drill."),
  say("KREDDLE TANNOY", "President Klerble is safe. Probably. Please keep gambling on your way to the bunkers."),
  say("KREDDLE TANNOY", "Reminder: the bunkers have slot machines. Please bring change."),
  say("KREDDLE TANNOY", "Do not panic. Panicking is a gamble, and gambling is mandatory, so panic responsibly."),
  say("KREDDLE TANNOY", "The Golden Klaw Casino is closed. The Golden Klaw Casino is on fire. The Golden Klaw Casino is gone."),
];

/** The flashing red banner across the top of the screen. */
export const RAID_BANNERS = [
  "⚠ EMERGENCY EVACUATION ⚠  ALL KREDDLERS TO THE BUNKERS",
  "⚠ THIS IS NOT A DRILL ⚠",
  "⚠ PRESIDENT KLERBLE IS SAFE (PROBABLY) ⚠",
  "⚠ KRELWORLD ATTACK IN PROGRESS ⚠  DO NOT ENGAGE THE TAP-LICKERS",
  "⚠ BUNKER SLOT MACHINES NOW ACCEPTING TEARS ⚠",
];

/** Signs dotted along the Strip. */
export const RAID_SIGNS = ["EVACUATE", "TO THE BUNKERS →", "NOT A DRILL", "KEEP CALM\nAND GAMBLE", "BUNKER\nTHIS WAY", "⚠ DANGER ⚠"];

/** The districts of the Strip, west to east. */
export const RAID_DISTRICTS = ["THE BRIDGE ARCADES", "THE GOLDEN MILE", "KLERBLE SQUARE", "THE KROZLEN QUARTER", "KRUNCHER ROW", "THE PRESIDENTIAL PALACE"];

/** Barricades blocking the Strip (one per district boundary): burn through them. */
export const RAID_BARRICADES: { name: string; line: Line }[] = [
  { name: "KREDDLE CUSTOMS CHECKPOINT", line: say("KREZMAR", "A checkpoint! Torch it! TORCH IT!") },
  { name: "GOLDEN MILE RIOT LINE", line: say("MIKEY", "Riot police barricade. Burn through it, lad!") },
  { name: "KLERBLE SQUARE BLOCKADE", line: say("SCROMBUS", "Klerble's personal blockade. Very gold. Very flammable.") },
  { name: "KRUNCHER ROW GATES", line: say("FLENKY", "The Krunchers are behind there. I can SMELL them.") },
  { name: "THE PALACE GATES", line: say("KREZWONK", "The Palace. I have foreseen these gates… melting.") },
];

/** Halfway: a giant Klerble screen comes on. */
export const RAID_KLERBLE_BROADCAST: Line[] = [
  dir("A giant neon screen over Klerble Square flickers on. PRESIDENT KLERBLE, sweating, in a bunker that is also a casino."),
  say("PRESIDENT KLERBLE", "People of Kreddle! Do not be afraid! I am completely safe! YES! YES! YESSS!"),
  say("PRESIDENT KLERBLE", "I am definitely NOT in the Presidential Palace! Do not look for me in the Palace! Particularly the big bit at the back!"),
  say("GRONNY", "Him in palace."),
  say("SCROMBUS", "Him's definitely in the palace."),
  say("PRESIDENT KLERBLE", "…Oh fuck."),
  dir("The screen explodes. Mostly because Gronny threw a nail bomb at it."),
];

/** The Kreddle Krunchers, waiting at the end of the Strip. */
export const KRUNCHER_STANDOFF: Line[] = [
  dir("At the end of Kruncher Row, in front of their burning HQ, the Kreddle Krunchers stand in a line. They have not evacuated. They are not clever."),
  say("KLENKY", "Your never beat us!"),
  say("KREDMAR", "We hate you!"),
  say("LIL' KRUNGUS", "We're kill you!"),
  say("GRENNY", "Waa waa wee waa! That mean you DEAD!"),
  say("KREDBLIS", "Breaking news… you're shit 👍"),
  say("MIKKY K", "Still got your bongo, mate! Pissed in it again this morning!"),
  say("MIKEY", "…"),
  say("SKROMBUS", "Our Wonking Machine has a flamethrower setting too, you know!"),
  say("KREDWONK", "I foresaw you losing. In the vision you were crying."),
  say("KREDBON", "Shall we turn the power off? Ha! Copied you! WE HATE YOU!"),
  say("FLENKY", "You pissed in our Tap. You crashed our plane into our tower. Well, technically WE did, but you MADE us."),
  say("KLENKY", "Your never beat us! NEVER!"),
  say("YOU", "Watch me."),
  dir("TORCH THE KRUNCHERS. All of them."),
];

/** A Kruncher's last words as they go up. */
export const KRUNCHER_DEATHS: Line[] = [
  say("KLENKY", "NOOOO! I WAS NEVER BANNED!!"),
  say("SKROMBUS", "MY WONKING MACHIIIINE!"),
  say("KREDMAR", "I BET… I'D… SURVIVE…"),
  say("KREDBLIS", "Breaking news… I'm on fire 👎"),
  say("KREDWONK", "I DIDN'T FORESEE THIIIIS!"),
  say("KREDBON", "TURN… THE FIRE… OFF…"),
  say("LIL' KRUNGUS", "I'M TOO LITTLE TO BURN!"),
  say("GRENNY", "WAA WAA WEE WAAAAAAA!"),
  say("MIKKY K", "TAKE THE BONGO! TAKE IIIIIT!"),
];

/** When the last Kruncher is ash. */
export const KRUNCHERS_DONE: Line[] = [
  dir("Nine little piles of ash. The rain hisses on them."),
  say("MIKEY", "And THAT'S for my bongo."),
  say("FLENKY", "WOOOOOOOO!!!"),
  say("GRONNY", "Krunchers crunched! Ha ha!"),
  say("KREBLIS", "Breaking news… the Kreddle Krunchers are cancelled 👍"),
  say("SCROMBUS", "Right! Palace! Krezwonk, you've got the thing?"),
  say("KREZWONK", "I have the thing. I have foreseen the thing. The thing is in my bag."),
];

/** At the Palace steps. */
export const NUKE_PLANT: Line[] = [
  dir("THE KLERBLE PALACE. Gold, marble, neon, and a red carpet the length of a motorway. Somewhere inside, a president is hiding under a craps table."),
  say("KREZWONK", "I have foreseen this moment. Stand back."),
  dir("Krezwonk unzips his bag and rolls out a nuclear bomb. It has a little digital timer on the front. And a sticker that says 'WON ON THE SLOTS'."),
  say("KREBON", "Shouldn't we turn the power off on it? Just in case?"),
  say("KREZWONK", "That's the opposite of what we want, Krebon."),
  say("CRONGUS", "I just want it on record that this is ALSO against the Krelneva Convention."),
  say("KREZMAR", "I'll piss on that one an' all if you like, Luke."),
  say("KREZWONK", "Four minutes. That's how long we've got. I set it to four because I have foreseen that we are slow."),
  say("SCROMBUS", "Four minutes to get back over the bridge and into the Town Hall. Plenty of time. Probably."),
  say("FLENKY", "This is for you, Mollor."),
  say("KREZWONK", "Timer's on. Shall we… run?"),
  say("GRONNY", "RUUUUUUN!!!"),
];

/** Shouted while running back. */
export const ESCAPE_SHOUTS: Line[] = [
  say("SCROMBUS", "Keep running! West! Over the bridge!"),
  say("GRONNY", "Run run run run!"),
  say("KREBON", "Is now a good time to turn the power off?"),
  say("FLENKY", "Don't look back! Don't look back! …I looked back. Still on fire."),
  say("CRONGUS", "My legs are too little for this!"),
  say("MIKEY", "Fragmar all over again!"),
  say("KREZWONK", "I have foreseen us making it. Just. Probably. Keep going."),
  say("KREBLIS", "Breaking news… we are legging it 👍"),
  say("KREZMAR", "Last one to the Town Hall is a Kreddler!"),
];
