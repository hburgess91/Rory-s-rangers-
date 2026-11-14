import type { Line } from "../data/types";
import { say } from "./dsl";

// What the victim whines while the lads beat him up in town (src/game/scenes/hub/Beatup.ts). Kept here, as Lines,
// so the voice extractor records them in each victim's own voice instead of falling back to the browser's TTS.
export const WHINES_ALL = [
  "That's not fair!",
  "That's NOT FAIR!",
  "Three on one?!",
  "What did I even do?!",
  "I'm telling Drongus!",
  "This is bullying! This is literally bullying!",
  "Not the face! NOT THE FACE!",
  "Stop it! I mean it!",
  "MUUUUUM!",
  "I'm the nicest one in the chat!",
  "Ow! Ow! That's my bad arm!",
  "I'll ban you all! ...I can't ban anyone.",
  "Why is it always me?!",
];
export const WHINES: Record<string, string[]> = {
  MIKEY: ["I paid for the bongos! Last time!", "Can I still come to the pub after?", "Old times, lads! OLD TIMES!", "Is this the initiation? Am I in?"],
  CRONGUS: ["My little arms can't block!", "I'm Lil'! I'm LIL'!", "I'll make you all a pudding! Please!", "I'm getting Boggor!"],
  FLENKY: ["My parents are still together! Isn't that enough?!", "I know Brazilian jiu-jitsu! ...I don't.", "Is this because I'm banned?!", "Jenko didn't deserve this!"],
};

/** Every victim says the shared whines plus his own. */
export const BEATUP_VICTIM_LINES: Line[] = Object.keys(WHINES).flatMap((id) => [...WHINES_ALL, ...WHINES[id]].map((t) => say(id, t)));
