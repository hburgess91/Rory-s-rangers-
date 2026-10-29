import type { TVBeat, TVEpisode } from "../../../game/systems/tv";

// THICK CUMMING COCK — Episode 7: "The Billboard Backlash"
// Only the final scene was supplied. Earlier scenes can be added to EARLIER_SCENES
// (as beat arrays, or via parseScreenplay) without touching the TV engine.
//
// Staging rules for this episode:
// - Jenny's disclosure is dialogue only. The camera stays in the office. Nothing is shown.
// - The 9/11 smash cut is stylised pixel art. No real footage.

const COLD_OPEN: TVBeat[] = [
  { type: "music", id: "tcc_theme", mode: "start" },
  { type: "titleCard", text: "THICK CUMMING COCK" },
  { type: "titleCard", text: "Episode 7: \"The Billboard Backlash\"" },
  { type: "music", id: "tcc_theme", mode: "fade" },
];

/** Paste earlier scenes of Episode 7 here when the full script turns up. */
export const EARLIER_SCENES: TVBeat[][] = [];

const FINAL_SCENE: TVBeat[] = [
  { type: "transition", mode: "fade" },
  { type: "shot", set: "office_night", framing: "WIDE", duration: 1.2 },
  { type: "direction", action: "INT. THICK CUMMING COCK OFFICE - NIGHT. The office is dim." },
  { type: "prop", id: "wine", on: true },
  { type: "blocking", character: "JENNY CUMMING", to: "left", pose: "sit" },
  { type: "direction", action: "JENNY CUMMING sits alone in the conference room with a glass of wine." },
  { type: "blocking", character: "CHRISTOPHER THICK", to: "enter" },
  { type: "direction", action: "CHRISTOPHER THICK enters, loosening his tie, pleased with the billboard campaign." },
  { type: "blocking", character: "CHRISTOPHER THICK", to: "right" },
  { type: "speaker", character: "CHRISTOPHER THICK", text: "Well, Jenny, not bad for a day's work, huh? I told you this campaign was genius. The phones have been ringing off the hook!", emotion: "smug" },
  { type: "shot", set: "office_night", framing: "TWO-SHOT" },
  { type: "speaker", character: "JENNY CUMMING", text: "Christopher… can I talk to you about something serious?", emotion: "quiet" },
  { type: "speaker", character: "CHRISTOPHER THICK", text: "Serious? With you? Come on, Jen, don't ruin my victory lap.", emotion: "smug" },
  { type: "speaker", character: "JENNY CUMMING", text: "It's about the partners at Rubz & Klitz.", emotion: "quiet" },
  { type: "speaker", character: "CHRISTOPHER THICK", text: "Oh, this sounds juicy. What did those idiots do now?", emotion: "smug" },
  { type: "shot", set: "office_night", framing: "CLOSE JENNY" },
  { type: "speaker", character: "JENNY CUMMING", text: "It's not funny, Chris. One of them… one of them hurt me.", emotion: "upset" },
  { type: "direction", action: "Christopher stops smiling." },
  { type: "shot", set: "office_night", framing: "CLOSE JENNY", duration: 1.0 },
  { type: "speaker", character: "JENNY CUMMING", text: "It was Jon Klitz. We were at that networking gala last year, and he… he cornered me in the coatroom. I tried to leave, but he wouldn't let me.", emotion: "upset" },
  { type: "speaker", character: "JENNY CUMMING", text: "He… he said I owed him for stealing a client, and then… he forced himself on me.", emotion: "crying" },
  { type: "direction", action: "Jenny cries." },
  { type: "shot", set: "office_night", framing: "CLOSE CHRISTOPHER", duration: 1.4 },
  { type: "blocking", character: "CHRISTOPHER THICK", to: "right", pose: "asleep" },
  { type: "direction", action: "Christopher is revealed to have fallen asleep." },
  { type: "audience", cue: "laugh" },
  { type: "shot", set: "office_night", framing: "TWO-SHOT" },
  { type: "speaker", character: "JENNY CUMMING", text: "Christopher?! Are you… asleep?!", emotion: "shocked" },
  { type: "blocking", character: "CHRISTOPHER THICK", to: "right", pose: "stand" },
  { type: "direction", action: "Christopher wakes with a snort." },
  { type: "speaker", character: "CHRISTOPHER THICK", text: "Huh? Oh, sorry, Jen. I must've dozed off. You know how these emotional speeches wear me out.", emotion: "groggy" },
  { type: "audience", cue: "laugh" },
  { type: "audience", cue: "laugh" },
  { type: "direction", action: "Laughter crescendo. Jenny starts laughing too." },
  { type: "speaker", character: "JENNY CUMMING", text: "What are you like, Christopher! If it's not about you, you just don't care! Haha!", emotion: "laughing" },
  { type: "speaker", character: "CHRISTOPHER THICK", text: "That's suuuuure right! Now come sit in my lap, bitch.", emotion: "smug" },
  { type: "blocking", character: "JENNY CUMMING", to: "lap" },
  { type: "direction", action: "Jenny sits on Christopher's lap. They kiss in exaggerated sitcom fashion." },
  { type: "audience", cue: "cheer" },
  { type: "audience", cue: "whistle" },
  { type: "sfx", id: "smash" },
  { type: "transition", mode: "smashCut" },
  { type: "prop", id: "wine", on: false },
  { type: "shot", set: "nyc_skyline", framing: "WIDE", duration: 1.0 },
  { type: "titleCard", text: "NEW YORK CITY — SEPTEMBER 11, 2001 — 8:45 AM" },
  { type: "prop", id: "plane", on: true },
  { type: "music", id: "ominous", mode: "start" },
  { type: "direction", action: "The camera reveals an approaching plane." },
  { type: "titleCard", text: "WILL THEY ESCAPE IN TIME?!?\nTUNE IN NEXT WEEK TO FIND OUT!!!" },
  { type: "transition", mode: "fade" },
  { type: "music", id: "ominous", mode: "stop" },
  { type: "titleCard", text: "END OF EPISODE" },
];

const CREDITS: TVBeat[] = [
  { type: "music", id: "tcc_theme", mode: "start" },
  { type: "titleCard", text: "THICK CUMMING COCK\nwritten by Drongus B. Drippin' (and ChatGPT, 10%)\nKrelworld Broadcasting Corporation" },
  { type: "titleCard", text: "No Krelworld citizens were reacted to in the making of this programme." },
  { type: "music", id: "tcc_theme", mode: "stop" },
];

export const TCC_EP07: TVEpisode = {
  id: "tcc_ep7",
  show: "Thick Cumming Cock",
  title: "The Billboard Backlash",
  episodeNumber: 7,
  channel: "THICK CUMMING COCK",
  contentNote: "Deliberately offensive in-world sitcom. Contains a verbal disclosure of sexual assault (not shown) and a 9/11 cliffhanger (stylised).",
  beats: [...COLD_OPEN, ...EARLIER_SCENES.flat(), ...FINAL_SCENE, ...CREDITS],
};
