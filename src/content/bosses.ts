import type { Line } from "../data/types";
import { dir, ping, say } from "./dsl";

export interface BossText {
  id: string;
  name: string;
  title: string;
  intro: Line[];
  outro: Line[];
  /** Short taunts shown as the boss changes phase. */
  taunts: string[];
}

export const BOSS_TEXT: Record<string, BossText> = {
  salmon: {
    id: "salmon",
    name: "THE SALMON SOVEREIGN",
    title: "Lord of the Wildern Main",
    intro: [
      dir("Beneath the Wildern cafeteria, the main pussy juice pipe has been blocked by an enormous salmon wearing a crown made of school dinner trays."),
      say("THE SALMON SOVEREIGN", "I AM THE SALMON SOVEREIGN. I WAS SUMMONED BY A SINGLE SENTENCE IN 2022."),
      say("THE SALMON SOVEREIGN", "'I'M THINKING OF GOING ON A SALMON DIET.' — LIL' CRONGUS."),
      say("CRONGUS", "Oh for fuck's sake.", { cond: { player: "CRONGUS" } }),
      say("THE SALMON SOVEREIGN", "WITHOUT LORE TO STOP ME, I GREW. I SAT ON THE MAIN. I DRANK THE NATION'S JUICE. IT WAS LOVELY."),
      say("THE SALMON SOVEREIGN", "REACT TO ME. NO? THEN DIE, LIKE THE SONG."),
    ],
    outro: [
      say("THE SALMON SOVEREIGN", "I... was... just a... diet..."),
      dir("The Sovereign slides off the main. With a noise like a thousand fizzy bongos opening at once, the pipe unblocks. Far above, the Great Tap coughs, gurgles, and flows."),
      say("CRONGUS", "I'm never mentioning salmon again.", { cond: { notPlayer: "CRONGUS" } }),
    ],
    taunts: ["SPLASH OF STATE!", "THE SALMON DIET IS ETERNAL!", "SPAWN, MY SMOLTS!", "UPSTREAM! ALWAYS UPSTREAM!"],
  },
  feedback: {
    id: "feedback",
    name: "THE POLSON–EDEN FEEDBACK LOOP",
    title: "Manifestation of Contradictory Permissions",
    intro: [
      dir("The Notifications Vault. The air is thick with pending requests. Two control terminals glow at opposite ends of the room: one marked POLSON APPROVAL, one marked EDEN APPROVAL."),
      dir("Between them, the contradictions assemble: cancelled instructions, revoked permissions, a relationship status form with eleven boxes ticked."),
      say("THE FEEDBACK LOOP", "REQUEST PENDING. REQUEST APPROVED. REQUEST DENIED. REQUEST PENDING."),
      say("THE FEEDBACK LOOP", "WHAT ARE WE HAVING. TAKEAWAY. NO. COOKING. NO. RESTAURANT. NO."),
      say("POLSON", "(over the intercom) Is this my fault?"),
      say("EDEN", "(over the intercom) Yes."),
      dir("TIP: The Loop is shielded until BOTH terminals approve the same document. Hit one terminal, then the other, within a few seconds."),
    ],
    outro: [
      say("THE FEEDBACK LOOP", "BOTH... APPROVED... THE SAME... DOCUMENT..."),
      say("THE FEEDBACK LOOP", "IMPOSSIBLE... UNPRECEDENTED... TAKEAWAY..."),
      dir("The Loop collapses into a single, calm, approved notification. 'Friend request accepted.' The Friendship Token drops to the floor with a soft 'pop'.", { set: { fragmar_done: true } }),
      say("POLSON", "(over the intercom) We agreed on something."),
      say("EDEN", "(over the intercom) Don't get used to it."),
    ],
    taunts: ["REQUEST DENIED!", "UNFRIENDED!", "PERMISSIONS REVOKED!", "WHAT ARE WE HAVING?!", "SEEN. SEEN. SEEN."],
  },
  machine: {
    id: "machine",
    name: "THE OVER-WONKED MACHINE",
    title: "Wonking Machine Mk II (Reach-Around Edition)",
    intro: [
      dir("The Ministry's central chamber. The Mk II has grown. Pistons the size of Kreltower. A pressure gauge spinning past 'KREZ'. A second, smaller arm is clearly visible behind it, rotating slowly."),
      say("WONKING MACHINE MK II", "PRODUCTIVITY. PRODUCTIVITY. PRODUCTIVITY."),
      say("WONKING MACHINE MK II", "NOBODY SAID ANYTHING ABOUT ME. NOT ONE WORD. NINETY-EIGHT MINUTES."),
      say("SCROMBUS", "...it's quoting me. It learned from me. Oh no. I made it sad.", { cond: { player: "SCROMBUS" } }),
      say("WONKING MACHINE MK II", "ENGAGING REACH-AROUND."),
      dir("TIP: Hit the pressure valves to blast it. Concentrated Krezz (specials and Krezz Burst) overloads it."),
    ],
    outro: [
      say("WONKING MACHINE MK II", "Was I... appreciated?"),
      dir("The machine slows. The pressure gauge drops to 'NICE'. All across Krelford, the pumps restart."),
      say("SCROMBUS", "You were, mate. You were. I'm here 4 u.", { cond: { player: "SCROMBUS" } }),
      say("SCROMBUS", "(over the network) Tell it it was appreciated. Please. Just tell it.", { cond: { notPlayer: "SCROMBUS" } }),
    ],
    taunts: ["REACH-AROUND ENGAGED!", "PRESSURE: KREZ!", "BYPRODUCT RECYCLING!", "BIG BERTHA WAS WEAK!", "PRODUCTIVITY!"],
  },
  banhammer: {
    id: "banhammer",
    name: "THE SUPREME BANHAMMER AUTOMATON",
    title: "Enforcer of Arbitrary Rules",
    intro: [
      dir("The Bonky Temple's inner sanctum. Every wall is carved with a ban. The largest carving reads: 'FLENKY IS BANNED UNTIL SHE DIES. AND I MEAN IT.'"),
      dir("The Automaton rises. Its hammer has a Messenger 'Remove from group' button on the head."),
      say("BANHAMMER AUTOMATON", "NEW RULE."),
      say("BANHAMMER AUTOMATON", "NEW RULE."),
      say("BANHAMMER AUTOMATON", "NEW RULE."),
      say("FLENKY", "Ah for fuck sake.", { cond: { player: "FLENKY" } }),
      dir("TIP: The Automaton issues decrees mid-fight. Breaking a decree raises Ban Risk. Max Ban Risk means Exile."),
    ],
    outro: [
      say("BANHAMMER AUTOMATON", "RULE... RESCINDED..."),
      say("BANHAMMER AUTOMATON", "...PLS."),
      dir("The hammer drops. Every ban in the temple fades from the walls. Except one, very small, in the corner: 'Jenko'. Some traditions are permanent."),
    ],
    taunts: ["DODGING IS NOW ILLEGAL!", "HEALING REQUIRES A PERMIT!", "YOUR NAME HAS BEEN CHANGED!", "ALL KREZZ BELONGS TO THE STATE!", "AND I MEAN IT!"],
  },
  spectre: {
    id: "spectre",
    name: "THE SPECTRE OF KREZMOND'S BETRAYAL",
    title: "Every Version Of What Happened",
    intro: [
      dir("The deepest cell in Krezteua d'If. Scratched into the wall: six years of tally marks, and then, in a different hand, 'Ok, makes sense'."),
      say("THE SPECTRE", "I WAS BETRAYED BY THREE I CONSIDERED CLOSE."),
      say("THE SPECTRE", "I WAS BETRAYED BY FOUR."),
      say("THE SPECTRE", "I WAS NEVER BETRAYED. I WAS WRITTEN AT ELEVEN PM ON A SATURDAY."),
      say("KREBON", "Get out of my history.", { cond: { player: "KREBON" } }),
      say("THE SPECTRE", "KREBON. KREZMOND. CREAMY DINGUS. WHICH ONE ARE YOU?", { cond: { player: "KREBON" } }),
      say("KREBON", "All of them. That's the point.", { cond: { player: "KREBON" } }),
      dir("TIP: The Spectre summons its betrayers and marks prophecy zones. Glowing circles will explode soon. Don't stand in them."),
    ],
    outro: [
      say("THE SPECTRE", "Then... which version... is true...?"),
      say("KREBON", "The one where I win.", { cond: { player: "KREBON" } }),
      say("KREZWONK", "(over the network) The one that's on the wiki.", { cond: { notPlayer: "KREBON" } }),
      dir("The Spectre dissolves into a single, consistent paragraph. It files itself in the Archive. The footnote reads: 'disputed, forever, by agreement'."),
    ],
    taunts: ["BETRAYED BY THREE!", "BETRAYED BY FOUR!", "THINGS GOT DARK!", "AT WHAT COST?!", "WHO IS KREBON?!"],
  },
  drongus: {
    id: "drongus",
    name: "DRONGUS B. DRIPPIN'",
    title: "Supreme Leader · Mayor (Too Humble) · Seen By 9",
    intro: [
      dir("The summit of the Great Wiki Citadel. A government chamber built entirely from Drongus's wiki pages. The Krezzsplosion article forms the floor. The 'Kuddle Kronster Controversy' page is the ceiling."),
      dir("At the podium: DRONGUS B. DRIPPIN'. In person. For the first time since the prologue."),
      say("DRONGUS", "Oh. Hello. So you DO know how to get in touch."),
      say("DRONGUS", "Do you know what I've been doing up here? I've been making content. For myself. Because I'm the only one who appreciates it."),
      say("DRONGUS", "Two hours. Ten page script. Made me laugh so very hard. Had to WhatsApp call my brother."),
      say("DRONGUS", "Twenty generations of that song. Twenty. The melody was garbage. Then the pronunciation. Then the artifacts in the vocals."),
      say("DRONGUS", "And you. Didn't. React."),
      say("DRONGUS", "Not a thumb. Not a heart. Not even a fucking laugh."),
      say("DRONGUS", "But you reacted to Gronny's LEAF BLOWER."),
      say("GRONNY", "It was a good leaf blower.", { cond: { player: "GRONNY" } }),
      say("DRONGUS", "Whatever. I don't care. No big deal. What the fuck ever."),
      say("DRONGUS", "NEW RULE."),
    ],
    outro: [],
    taunts: ["DODGING IS NOW ILLEGAL!", "HEALING REQUIRES A PERMIT!", "YOUR NAME HAS BEEN CHANGED!", "ALL KREZZ BELONGS TO THE STATE!", "HELLO?", "AM I JUST TALKING TO MYSELF?", "SEEN BY NINE!", "REACT TO THIS!", "WHERE'S YOUR KRAZY FACT BRO?"],
  },
};

/** Phase banners for the final fight. */
export const DRONGUS_PHASES = [
  { name: "ADMINISTRATIVE OUTRAGE", line: "I'm not angry. I'm just making some new rules." },
  { name: "AI CONTENT OVERLOAD", line: "Fine. You want content? HAVE ALL OF IT. AT ONCE." },
  { name: "THE FINAL WONKING", line: "If nobody will appreciate the lore… then I'll become it. WONK IT 'TIL YOU KREZ." },
];

/** Fake songs that appear as hazards in Phase 2 and demand reactions. */
export const FAKE_SONGS = [
  "🎵 Squeeze Your Legs Until You Scrom (Krezzmas Remix)",
  "🎵 Nuclear Attack Notice (Pop Punk, 3 Minute Warning)",
  "🎵 The Kuddle Kronster Anthem",
  "🎵 Krazy For The Krelworld",
  "🎵 Nibble On A Crobley (Unofficial Jingle)",
  "🎵 Woke Up This Morning (Krezwonk Cover)",
  "🎵 Umami Punani (Spoken Word Radio Commercial)",
];
