import type { Line, PlayableId, ReactionChoice } from "../data/types";
import { dir, ping, say } from "./dsl";

export const FINAL_PROMPT: Line[] = [
  dir("The boss music stops. The Citadel goes quiet. Drongus is on the floor of the Krezzsplosion article, glowing faintly, panting."),
  say("DRONGUS", "You could at least react to the song, mate."),
  dir("A single Messenger bubble floats down in front of you."),
];

export const ENDINGS: Record<"LIKE" | "LOVE" | "LAUGH" | "SEEN", { title: string; lines: Line[] }> = {
  LIKE: {
    title: "ENDING: 👍 THE CANONICAL THUMB",
    lines: [
      dir("👍"),
      dir("Your thumb lands on the song with a soft, satisfying 'pop'."),
      dir("Instantly, Krelworld restores itself. The sky reloads. The word 'TOWN' climbs back onto the Town Hall sign. The pigeon is relieved. Every vending machine in Krelford plays a little psychedelic jingle in unison."),
      say("DRONGUS", "..."),
      say("DRONGUS", "Thanks."),
      dir("He means it. It's very quiet. Several seconds of peace."),
      dir("Several more."),
      dir("Then: a notification."),
      ping("DRONGUS", "New one lads"),
      ping("DRONGUS", "🎵 THE KREZZING HOUR PART II (Extended Krezzmas Mix)"),
      dir("Seen by everyone."),
      dir("Nobody reacts."),
    ],
  },
  LOVE: {
    title: "ENDING: ❤️ SUSPICIOUSLY SINCERE",
    lines: [
      dir("❤️"),
      dir("The heart floats up and settles on the song."),
      say("DRONGUS", "...is this sarcasm."),
      say("DRONGUS", "Is this a bit."),
      say("DRONGUS", "Are you taking the piss."),
      dir("You are not taking the piss. You hold eye contact. It is the most uncomfortable moment in Krelworld's history, including the Krezzsplosion."),
      say("DRONGUS", "Right. Okay. Well. Thanks. I suppose. That's. Hm."),
      dir("Krelworld restores itself, slightly awkwardly, like a man accepting a compliment. The Tap gives a little embarrassed gurgle."),
      ping("DRONGUS", "I'm putting that on the wiki btw"),
      ping("DRONGUS", "'The day someone loved the song'"),
      ping("DRONGUS", "Nobody's going to read it"),
    ],
  },
  LAUGH: {
    title: "ENDING: 😂 THE CONTENT LANDED",
    lines: [
      dir("😂"),
      dir("The laughing face bursts onto the song like a firework."),
      say("DRONGUS", "..."),
      say("DRONGUS", "You laughed."),
      say("DRONGUS", "YOU LAUGHED."),
      say("DRONGUS", "It's FUNNY. I KNEW it was funny. I TOLD my BROTHER it was funny."),
      dir("Drongus leaps to his feet. The Citadel erupts in confetti made of wiki citations. Krelworld doesn't just restore itself; it gets a little bit bigger. A new district appears overnight. It's called Laughton."),
      say("DRONGUS", "That's the spirit."),
      ping("DRONGUS", "Right I'm doing a sequel"),
      ping("DRONGUS", "And a musical"),
      ping("DRONGUS", "And a wiki page about the musical"),
      ping("DRONGUS", "Nobody stop me"),
      dir("Nobody stops him. Nobody reacts to any of them either."),
    ],
  },
  SEEN: {
    title: "ENDING: SEEN BY 10",
    lines: [
      dir("You look at the song."),
      dir("You don't press anything."),
      dir("Seen by 10."),
      say("DRONGUS", "..."),
      say("DRONGUS", "Wow."),
      say("DRONGUS", "Even now."),
      say("DRONGUS", "Even after all that."),
      dir("The Citadel holds its breath. Then, impossibly, Drongus starts to laugh."),
      say("DRONGUS", "That's actually funny. That's actually the funniest thing anyone's ever done. Fuck me."),
      say("DRONGUS", "The full commitment to the bit. Six chapters. Five bosses. A ten-page script. Seen."),
      dir("Krelworld restores itself, purely out of respect."),
      say("DRONGUS", "Whatever. I don't care. No big deal. What the fuck ever."),
      dir("He very obviously cares. He's grinning."),
      ping("DRONGUS", "Putting THIS on the wiki"),
    ],
  },
};

/** Unique epilogue card per player character. Shown after the ending. */
export const EPILOGUES: Record<PlayableId, string> = {
  BENN:
    "FAIRWEATHER BENN played one more gig with Twitcher Mutiny, then stepped back through the symbol of Wahoogah to his home universe. Postcards arrive occasionally. They are addressed to 'Krelworld (the Waluigi version)'. One just says 'Reprieve'.",
  FLENKY:
    "FLENKY JENKY was unbanned by the Tribunal, permanently, until further notice. He was banned again the following Tuesday for 'standing near the corridor'. He describes it as the best four hours of his life. He has been readmitted. For now.",
  KREZMAR:
    "KREZMAR presented the Krelfund to the Supreme Leader: eleven Krezzcoin and an expired Uber Eats voucher. Drongus said 'no grub hub?' and then, quietly, 'thanks mate'. Krezmar has since opened four new vending machines. They are all his children.",
  KREBLIS:
    "KREBLIS filed the Great Silence under Strange Occurrences. He then filed its end under Strange Occurrences. Krelworld's threat level remains purple. Nobody knows if that's high or low. History will judge.",
  KREZWONK:
    "KREZWONK pressed a button. It was the first button he had pressed in two years. He has gone back to lurking. Asked to comment, he said 'the idea of Krezwonk is more important than the man', and then didn't reply to anything else for nine weeks.",
  SCROMBUS:
    "SCROMBUS rebuilt the Mk II with a smaller reach-around and an 'appreciation module' that plays a 👍 sound every time it's used. Nobody uses it. He is here 4 it.",
  KREBON:
    "KREBON returned to Krezteua d'If one last time, and left the gate open behind him. He now runs a small restaurant in Krelford. The menu says 'KREBON — REAL BUTTER'. Drongus has eaten there twice and still asks who Krebon is.",
  CRONGUS:
    "LIL' CRONGUS remains Children's Minister and the last remaining vestige of the Cron era. He has met a child. It was fine. He has never once mentioned salmon again. The salmon remember.",
  GRONNY:
    "GRONNY G recovered his Krez-ousers, put them on, and took them off again. He has since been formally appointed Minister of Defence, a role nobody remembers creating. It's minus six. He's in shorts. Lovely.",
  MIKEY:
    "MIKEY NEVITT corrected the Archive in red pen. The footnote now reads 'Disputed by Mikey'. FGM ULTRA has been reformed for a single purpose: planning Operation Fragmar III. It is scheduled for 12 Midday. It will not happen at 12 Midday.",
};

export const CREDITS: string[] = [
  "KRELWORLD: WONK 'TIL YOU KREZ",
  "",
  "A game made out of a group chat that accidentally became a country.",
  "",
  "Lore by the Krezzing Krew, 2022–2025",
  "Original transcripts: FGM ULTRA and KRELWORLD KREW",
  "",
  "Drongus B. Drippin' as himself",
  "Proctus Krelmor as everyone else",
  "",
  "No Krezbians were harmed. There are 80 million of them. Purple. Cannons for arms.",
  "Ministry of Defence: vacant",
  "",
  "Thanks for playing.",
  "Please react.",
];

export const SEQUEL_CARD = "KRELWORLD 2: THE KREZZENING";

export function endingKeyFor(choice: ReactionChoice): keyof typeof ENDINGS {
  if (choice === "LIKE" || choice === "LOVE" || choice === "LAUGH") return choice;
  return "SEEN";
}
