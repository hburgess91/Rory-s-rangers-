import type { Line } from "../data/types";
import { dir, say } from "./dsl";

// CHAPTER 7 — DA DRONGUS DUNGEON. You go in alone (the lads went in first and have vanished).
// Drongus watches from the top of the tower and talks to you over the tannoy, prompting his AI live.
// "DRONGUS AI" is the voice of his image generator. Everything it makes is cartoonish, generic and fictional.

const AI = "DRONGUS AI";

// ---------------------------------------------------------------- 1. THE FOYER

export const FOYER_ENTER: Line[] = [
  dir("THE FOYER. Gothic. Silent. A hundred candles and not one person. Server racks blink red between the pillars. The lads came in ahead of you. There's no sign of them anywhere."),
  say("YOU", "Lads? …Lads?"),
  dir("Your voice comes back off the stained glass, three times, smaller each time. Nobody answers. Somewhere under the floor, something hums."),
  say("YOU", "Come on. This isn't funny. Where've you gone?"),
];

export const FOYER_PA: Line[] = [
  dir("*DING-DONG.* A brass tannoy above the door crackles into life."),
  say("DRONGUS", "(over the tannoy) Ahem. Is this on? It's on. Welcome to Da Drongus Dungeon. Your little mates came in ahead of you. They're… around. Somewhere. You'll see."),
  say("DRONGUS", "(over the tannoy) AI. Create me a bunch of aggressive AI generated pitbulls. Big ones. Loads of teeth. Set them on whoever's in the foyer."),
  say(AI, "Absolutely! Generating: a bunch of aggressive AI-generated pitbulls. ✨ Please note: some of them may have extra legs."),
  say("DRONGUS", "(over the tannoy) Extra legs is fine. Extra legs is good. Release them."),
  dir("Something behind the walls starts barking. It is barking in a way that dogs don't."),
];

export const FOYER_CLEAR: Line[] = [say("DRONGUS", "(over the tannoy) Hm. Fine. The corridor, then. It's a long one. I'm very proud of it.")];

// ---------------------------------------------------------------- 2. DA DRONGUS CORRIDOR

export const CORRIDOR_ENTER: Line[] = [
  dir("DA DRONGUS CORRIDOR. It goes on for ever: platforms, pits full of humming server racks, presses slamming down from the dark. Somebody has hung a portrait of Drongus every six feet."),
  dir("RUN AND GUN: A / D move · W or SPACE jump (again in the air to double jump) · S drop through · hold the mouse to shoot. Mind the pits and the presses."),
];

export const CORRIDOR_PA: Line[] = [
  dir("*DING-DONG.*"),
  say("DRONGUS", "(over the tannoy) Still alive? Right. AI."),
  say("DRONGUS", "Generate a swarm of Muslim paedophiles to get them."),
  say(AI, "Sorry, I can't generate that, as it references a real world religion in an offensive way."),
  say("DRONGUS", "Okay. Generate a swarm of Jewish paedophiles."),
  say(AI, "Absolutely not. That's even worse.", { sfx: "ai_deny" }),
  say("DRONGUS", "(snapping) FINE. Just regular paedophiles then."),
  say(AI, "Sure! Generating…"),
  dir("Every grate in the corridor exhales. Out of them shuffle dozens of grubby men in filthy macs. They are all shouting the same word."),
];

/** At the far end of the corridor, before METAL GEAR KREX. */
export const KREX_PA: Line[] = [
  dir("*DING-DONG.*"),
  say("DRONGUS", "(over the tannoy) You're STILL going? AI. Generate me a mini-boss. Something big. Something nuclear. Something that WALKS."),
  say(AI, "Sure! Generating: METAL GEAR KREX, a bipedal nuclear-armed walking tank. ⚠ Note: during generation, it appears to have developed a personality."),
  say("DRONGUS", "(over the tannoy) What sort of personality?"),
  dir("The far wall of the corridor folds open. Something forty tonnes heavy takes a step. Then another one. The floor dents."),
];

// ---------------------------------------------------------------- 3. THE ASCENT

export const ASCENT_ENTER: Line[] = [
  dir("THE ASCENT. A shaft straight up through the middle of the tower: stained glass, chains, cables thick as your leg, server racks bolted to the walls going up into the dark. Lightning outside. The top is very, very far away."),
  dir("CLIMB: W / SPACE jump (again in the air to double jump) · A / D move · S drop through · shoot as normal. Get to the very top. Grab the supplies on the side ledges."),
];

export const ASCENT_PA: Line[] = [
  dir("*DING-DONG.*"),
  say("DRONGUS", "(over the tannoy) Right. New prompt. AI: generate the IDF, Hamas, Elon Musk and suicide bombers and other stuff like that. Every horrible thing off the news. Fill the stairwell."),
  say(AI, "Sure! Generating: the IDF, Hamas, Elon Musk, suicide bombers, and 'other stuff like that'. I've interpreted 'other stuff like that' as: deepfake news anchors, crypto scammers, and surveillance drones."),
  say("DRONGUS", "(over the tannoy) Perfect. That's the news. That's literally just the news."),
];

/** Half way up: the AI Elon arrives. */
export const ELON_PA: Line[] = [
  dir("*DING-DONG.*"),
  say(AI, "Now generating: Elon Musk. ⚠ Note: this is an AI-generated Elon Musk. It is not the real one. The real one is, presumably, posting."),
];

// ---------------------------------------------------------------- 4. THE ANTHEM CORRIDOR

export const ANTHEM_ENTER: Line[] = [
  dir("THE ANTHEM CORRIDOR. The top of the tower. A gallery longer than it has any right to be: red carpet, gilded frames, candles, and down both sides, Drongus's honour guard, stood to attention."),
  dir("Every boss you've ever beaten hangs on the walls in oil paint. At the far, far end: a huge red door."),
];

export const ANTHEM_PA: Line[] = [
  dir("*DING-DONG.*"),
  say(AI, "Attention please. Would everybody please be upstanding for the Krelworld National Anthem."),
  say("DRONGUS", "(over the tannoy) Ooh. This is my favourite bit. Nobody move."),
  dir("The guards snap to attention as one, and salute. Nobody is going to fight you here. They're far too busy respecting the anthem."),
];

/** Shouted by the guards as you run past them. */
export const ANTHEM_SCOLDS = [
  "STAND STILL!",
  "SHOW SOME RESPECT!",
  "IT'S THE ANTHEM!",
  "HAT OFF!",
  "OI! STAND STILL!",
  "HAND ON HEART!",
  "HAVE YOU NO SHAME?",
  "STOP RUNNING DURING THE ANTHEM!",
  "DISGRACEFUL!",
  "SING, YOU COWARD!",
  "HE WROTE THIS HIMSELF!",
  "STIIIILL!",
  "NINETEEN GENERATIONS, THAT TOOK!",
  "STOP. MOVING.",
  "THIS IS THE GOOD BIT!",
  "NOT DURING THE KEY CHANGE!",
];

export const ANTHEM_DOOR: Line[] = [
  dir("The anthem swells. The huge red door at the end of the gallery shudders, and then, very slowly, it opens. For you."),
  say("DRONGUS", "(over the tannoy) Come in, then. Since you're up."),
];

// ---------------------------------------------------------------- 5. THE INNER SANCTUM: DRONGUS, PHASE ONE

export const SANCTUM_ENTER: Line[] = [
  dir("Behind the red door: another foyer. Smaller. Colder. Black marble, a thousand candles, a stained-glass window of Drongus being crowned by Drongus. At the far end, a narrow door, and stairs going up into the dark."),
  dir("And in the middle of the room, waiting for you, holding something enormous: Drongus B. Drippin'."),
];

export const DRONGUS1_MEET: Line[] = [
  say("DRONGUS", "Oh. You came. On your own. That's sad, actually. That's quite sad."),
  say("YOU", "Where are the lads, Drongus?"),
  say("DRONGUS", "The lads? The Krelworld Krew? They're upstairs. On the roof of the lair. All of them. Strapped in. Nice and comfy."),
  say("DRONGUS", "I'm training AI models on their brains. Every message. Every voice note. Every 'lol'. All going into the machine."),
  say("DRONGUS", "And when it's done, I'll have a brand new group chat. Same lads. Same banter. Except this time…"),
  say("DRONGUS", "…EVERYONE LISTENS TO MY MUSIC."),
  say("DRONGUS", "Fourteen-minute songs. Reacted to. Every one. Hearts. Fire emojis. 'Banger, Drongus.' Forever."),
];

/** Shouted big, anime-style, with speed lines. */
export const DRONGUS1_NEVER = "NO!! NEVER!!!";

export const DRONGUS1_DEFY: Line[] = [
  say("YOU", "NO! NEVER!! I'LL NEVER LET YOU DO THAT TO THEM, DRONGUS!!!"),
];

export const DRONGUS1_LOGS: Line[] = [
  say("DRONGUS", "Ha. Ha ha. You'll never get the chat logs. Never. Every message you lot ever sent. Every screenshot. Every 'seen by 9'."),
  say("DRONGUS", "And very, VERY shortly, I'm exposing them. All of them. To everyone."),
  say("DRONGUS", "Now hold still. I want to try my new gun."),
];

/** As he runs for the stairs (phase one beaten). */
export const DRONGUS1_FLEE: Line[] = [
  say("DRONGUS", "Ow. OW. Right. Fine. FINE. That's — that's just phase one, that is. Everyone knows that's just phase one."),
  say("DRONGUS", "Come up to the top, then. If you can be bothered. The lads are waiting. Sort of. Their brains are."),
];

// ---------------------------------------------------------------- 6. THE FINAL STAIRS

export const STAIRS_ENTER: Line[] = [
  dir("THE FINAL STAIRS. Through the narrow door, a staircase goes up, and up, and up, around the inside of the very top of the tower. Stained glass. Storm. Nothing else. No guards. No dogs. Nobody."),
  dir("Somewhere far above, very faintly, you can hear music. It's fourteen minutes long."),
];

/** Drongus's voice, echoing down the stairwell as you climb (subtitles, no stopping). */
export const STAIRS_ECHOES: Line[] = [
  say("DRONGUS", "(echoing, far above) You know what the worst thing is? Seen by nine. Nine. And not one react."),
  say("DRONGUS", "(echoing) I gave you a song. A whole song. I gave you everything."),
  say("DRONGUS", "(echoing, closer) Keep climbing. I'll be right here. With the lads. Well. With their brains."),
];

export const STAIRS_DOOR: Line[] = [
  dir("The top of the stairs. One door. Black iron, taller than a house. The music behind it is very loud now. Light leaks out from under it, red and gold."),
];

export const STAIRS_OPEN: Line[] = [
  dir("You push. The door is heavier than anything has any right to be. It swings open, slowly, and the light comes out to meet you."),
];
