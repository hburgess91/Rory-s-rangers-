import { parseScreenplay, type TVEpisode } from "../../game/systems/tv";
import { TCC_EP07 } from "./thickCummingCock/episode07";
import { CREATION_MYTH } from "./extra/creationMyth";
import { EASTENDERS_KREZZ } from "./extra/eastenders";
import { BEEP_SHOW } from "./extra/beepShow";
import { KREWS_EPISODES } from "./extra/krews";
import { KREWS3_EPISODES } from "./extra/krews2";

// Everything on KrelTV. Episodes are data; most are written in the screenplay format
// (see parseScreenplay) so new ones can be pasted in.

const ep = (id: string, channel: string, show: string, title: string, n: number, script: string, extra: Partial<TVEpisode> = {}): TVEpisode => ({
  id,
  channel,
  show,
  title,
  episodeNumber: n,
  beats: parseScreenplay(script),
  ...extra,
});

export const NEWS_1 = ep(
  "news_1",
  "GB KREWS 24",
  "Krelford News at Six",
  "The Great Silence",
  1,
  `
[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - EVENING
[MUSIC news fade]
NEWSREADER: Good evening. Our top story tonight: the Supreme Leader has posted a new song, and nobody has reacted.
NEWSREADER: The song, titled The Krezzing Hour, was seen by nine people. Nine. The Ministry of Strange Occurrences has described this as "fuuuuuuuuuuuuuuuuuuuckkkk".
NEWSREADER: Within minutes, the Supreme Leader withdrew all lore from the nation. The word TOWN has since fallen off the Town Hall.
NEWSREADER: In other news, a pigeon has been seen wearing the word TOWN.
NEWSREADER: The Great Tap has stopped. Citizens are advised to ration pussy juice and avoid drinking from the cafeteria water dispenser, for unrelated reasons.
NEWSREADER: Weather now. Grey, with a chance of citation-needed tags.
[SFX notify]
NEWSREADER: I'm being told the Supreme Leader has just posted "Hello?" in the national chat. We'll bring you more on that as it develops. It won't develop.
NEWSREADER: Good night.
`,
);

export const NEWS_2 = ep(
  "news_2",
  "GB KREWS 24",
  "Krelford News at Six",
  "Cheesegate",
  2,
  `
[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - EVENING
[MUSIC news fade]
NEWSREADER: Good evening. The Tap is flowing again following what the cabinet are calling "the salmon thing".
NEWSREADER: Lil' Crongus has denied responsibility, but did confirm he said the words "salmon diet" in 2022.
NEWSREADER: Meanwhile, at Polson Towers, an investigation is under way into what sources are describing as Cheesegate.
NEWSREADER: The term was coined by Flenky Jenky in April 2022. Investigators have so far been unable to locate any cheese.
NEWSREADER: Polson has been deciding what to have for dinner for nineteen hours. We go live to the scene.
EXT. POLSON TOWERS - NIGHT
REPORTER: Thanks. Behind me you can see Polson Towers. Inside, a man is choosing between takeaway, cooking and a restaurant. He has chosen none of them.
REPORTER: A voice from upstairs has just shouted "NOT TAKEAWAY". Back to the studio.
INT. NEWSDESK - EVENING
NEWSREADER: Fascinating. Sport now. There is no sport. Krelball is cancelled until lore resumes.
`,
  { unlockFlag: "ch1_clear", unlockHint: "Broadcasts after Chapter 1" },
);

export const NEWS_3 = ep(
  "news_3",
  "GB KREWS 24",
  "Krelford News at Six",
  "Boner Control",
  3,
  `
[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - EVENING
[MUSIC news fade]
NEWSREADER: Good evening. The Ministry of Boner Control has gone dark, and pussy juice pressure across the nation has fallen forty percent.
NEWSREADER: A man in Krelford South attempted to extract pussy juice from a melon. He is now in the Krambulance and is said to be "stable, and embarrassed".
NEWSREADER: Scrombus, Minister of Lore, wishes to remind viewers that the Wonking Machine Mk II has a reach-around feature, and that nobody has said anything about it.
NEWSREADER: Nobody has said anything about it.
NEWSREADER: Threat level today: purple. We have been asked to clarify whether purple is high or low. We cannot.
`,
  { unlockFlag: "ch2_clear", unlockHint: "Broadcasts after Chapter 2" },
);

export const NEWS_4 = ep(
  "news_4",
  "GB KREWS 24",
  "Krelford News at Six",
  "Banned",
  4,
  `
[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - EVENING
[MUSIC news fade]
NEWSREADER: Good evening. Tonight: four thousand citizens have been banned by the Bonky Cult, including a man for having parents.
NEWSREADER: Flenky Jenky has issued a statement. It reads, in full: "pls".
NEWSREADER: The Ban Tribunal has opened. The Acting Exile Appeals Officer is also banned. He is appealing.
NEWSREADER: In archaeology, an ancient krezzcanoe site has been excavated near Krelford, revealing an intact strip club frozen in time. Historians describe it as "Pompeii, but worse".
NEWSREADER: Good night.
`,
  { unlockFlag: "ch3_clear", unlockHint: "Broadcasts after Chapter 3" },
);

export const NEWS_5 = ep(
  "news_5",
  "GB KREWS 24",
  "Krelford News at Six",
  "Who The Fuck Is Krebon",
  5,
  `
[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - EVENING
[MUSIC news fade]
NEWSREADER: Good evening. Krezteua d'If has reopened, and is said to be filling with "versions of history".
NEWSREADER: Three different boats are currently moored in the same space at Krelford docks. One is on fire. One has a moustache.
NEWSREADER: The Supreme Leader has once again asked who Krebon is. Krebon has once again replied "I'm right here." The Supreme Leader has once again not read it.
NEWSREADER: A restaurant menu bearing the words "Krebon — real butter" has been declared a site of national prophetic significance.
`,
  { unlockFlag: "ch4_clear", unlockHint: "Broadcasts after Chapter 4" },
);

export const WILDERN_BULLETIN = ep(
  "krews_wildern",
  "GB KREWS 24",
  "GB Krews",
  "Wildern Destroyed / New Burger",
  1,
  `
[MUSIC news start]
# GB KREWS 24
# BREAKING: WILDERN ACADEMY DESTROYED
INT. NEWSDESK - DAY
[MUSIC news fade]
NEWSREADER: Breaking news. Wildern Academy has been destroyed in an explosion, hours after the death of its headmaster, Mr Kranky Krandall.
NEWSREADER: Several kids were very sadly in the school when it exploded.
NEWSREADER: But ultimately, it is no one's fault.
NEWSREADER: Next up: a new type of burger has come to Krelworld.
# KREZ-KING UNVEILS THE DOUBLE DOWN KREZZ MELT
EXT. HIGH STREET - DAY
REPORTER: I'm outside Krez-King, where queues are already round the block for the brand new Double Down Krezz Melt.
REPORTER: It's a burger. But the bun is also a burger.
REPORTER: Back to you.
INT. NEWSDESK - DAY
NEWSREADER: Lovely. And now, some footage just in from the crater.
[FADE]
`,
);

export const KRANDALL_SEGMENT = ep(
  "krews_krandall",
  "GB KREWS 24",
  "GB Krews",
  "Wildern's Zany New Head",
  1,
  `
[MUSIC news start]
# GB KREWS 24
# CONCERNS GROW OVER WILDERN'S NEW HEAD
INT. NEWSDESK - DAY
[MUSIC news fade]
NEWSREADER: Good evening. Concerns are growing tonight over the new headmaster of Wildern Academy, Mr Kranky Krandall.
NEWSREADER: Mr Krandall, seventy, describes himself as "krazy and zany". He wears a jester hat. We asked him why. He said "zany".
NEWSREADER: He has attracted controversy locally for his unorthodox teaching methods, and is rumoured to be a pussy juice addict.
NEWSREADER: Parents say they are concerned about what their children are coming home saying.
NEWSREADER: GB Krews has obtained secret footage from inside his classroom. Some viewers may find it sticky.
INT. CLASSROOM - DAY
# SECRET FOOTAGE: ENGLISH
KRANKY KRANDALL: Right! Spelling test time!
KRANKY KRANDALL: Spell... "pussy juice".
KRANKY KRANDALL: Mmmm. Pussy juicy.
KRANKY KRANDALL: Pussy juicy juicy. Pens down. Nobody spell it better than that.
# SECRET FOOTAGE: MATHS
KRANKY KRANDALL: John has two cartons of fresh pussy juice. Derek has five boxes of pussy juice. Each box contains lots of pussy juice.
KRANKY KRANDALL: How many pussy juice does... ughhhhh.
KRANKY KRANDALL: Sorry. Mmm. I got distracted.
KRANKY KRANDALL: Lovely pussy juice.
# SECRET FOOTAGE: HISTORY
KRANKY KRANDALL: So. History. The Battle of... the Battle of...
KRANKY KRANDALL: Sorry. Does anyone have pussy juice with them?
KRANKY KRANDALL: I need pussy juice. Just a sip. Just a little sippy. Anyone?
[GASP]
KRANKY KRANDALL: (jingling his hat) ZANY!
INT. NEWSDESK - DAY
NEWSREADER: Wildern Academy said in a statement that Mr Krandall's methods are "unorthodox but effective", and that the school's pussy juice consumption is "within normal limits for a school with its own pipe".
NEWSREADER: Mr Krandall was appointed last month. His only reference was from a Mr D. B. Drippin'.
NEWSREADER: The headmaster's office has since been locked from the inside. Witnesses report slurping.
[FADE]
`,
);

export const CABINET_LIVE = ep(
  "cabinet_live",
  "GB KREWS 24",
  "Cabinet Proceedings Live",
  "Highlights: The Ministries",
  1,
  `
[MUSIC news start]
# GB KREWS 24: CABINET PROCEEDINGS LIVE
INT. TOWNHALL CAM - DAY
[MUSIC news fade]
ANNOUNCER: Welcome to Cabinet Proceedings Live, where we bring you the best of Krelworld democracy.
SCROMBUS: Basically we need a cabinet.
DRONGUS: Yep! I will take on the burden of assuming all cabinet level roles, in an act of remarkable self sacrifice.
ANNOUNCER: The Supreme Leader then voted against his own cabinet. The motion passed anyway.
SCROMBUS: Fuck sake.
ANNOUNCER: Ministerial highlights include the creation of the Ministry of Krunching, ermm, hmm, krunching.
KREZMAR: We have no defence minister?!
DRONGUS: I was distracted by the need for all the other ministers.
ANNOUNCER: The Ministry of Defence remains vacant. Join us next week for more of the same.
`,
);

export const SHOPPING = ep(
  "shopping",
  "WONKING MACHINE SHOPPING NETWORK",
  "Wonking Machine Shopping Network",
  "Tonight's Bargains",
  1,
  `
[MUSIC shopping start]
# WONKING MACHINE SHOPPING NETWORK
INT. SHOPPING STUDIO - NIGHT
[MUSIC shopping fade]
HOST: Hello and welcome to the Wonking Machine Shopping Network, I'm your host, and tonight, we have the Mk II.
HOST: That's right. The Wonking Machine Mk II. Now with a reach-around feature. Whatever that is. You'll find out soon!
HOST: It recycles its byproducts straight into your water dispenser. Regular employees won't notice!
CO-HOST: Councillors are advised to bring their own water.
HOST: And if you call in the next ten minutes, we'll throw in Big Bertha. She's two years old. She's crusty. She's yours.
[SFX ding]
HOST: Now a word from our sponsors.
ANNOUNCER: Craving something bold? Get ready for Umami Punani. The noodle with juicy bits, a tangy kick, and just the right amount of... pussy juice!
ANNOUNCER: Available in packs of six or twelve. Don't wait, slurp it up!
ANNOUNCER: Umami Punani. Taste the fun!
[SFX slurp]
HOST: Also available: Krezpy Kream Drongnuts. Chocolate Cronstons. Crobleys. Every nan had them in her choccy drawer!
HOST: Lines are open. Nobody is calling. Nobody ever calls.
`,
);

export const KRONSTER_DOC = ep(
  "kronster_doc",
  "KRELWORLD DOCUMENTARIES",
  "Krelworld Documentaries",
  "The Kuddle Kronster Controversy",
  1,
  `
[MUSIC doc start]
# THE KUDDLE KRONSTER CONTROVERSY
INT. ARCHIVE STACKS - NIGHT
NARRATOR: In January 2025, a wiki page appeared. Its title: The Cuddle Cronster Controversy.
NARRATOR: Within minutes, Krezmar raised an objection.
KREZMAR: Sorry but does this not go against convention… should it not be kuddle kronster.
NARRATOR: The page was amended. The controversy, however, had only just begun.
NARRATOR: Was the Kronster from 2021, as the Supreme Leader claimed? Or was he, as some argue, eternal?
LIL' CRONGUS: That cron stuff is so 2021. I'm the last remaining vestige.
NARRATOR: The Kuddle Kronster later released his official song. The Supreme Leader described him as "two plus years out of date".
NARRATOR: To this day, the Kronster's whereabouts are unknown. Some say he lurks. Some say he IS the lurk.
NARRATOR: The wiki will be updated at some point.
[MUSIC doc stop]
`,
  { unlockFlag: "ch3_clear", unlockHint: "Locked programme: unlocks after Chapter 3" },
);

export const LORE_HOUR = ep(
  "lore_hour",
  "KRELWORLD DOCUMENTARIES",
  "Krelworld Documentaries",
  "The Krezzsplosion: A Retrospective",
  2,
  `
[MUSIC doc start]
# THE KREZZSPLOSION: A RETROSPECTIVE
EXT. ANCIENT FOREST - DAY
NARRATOR: In the beginning there was a single tree. A tree that produced incredible bounties of Scrom-filled scringleberries.
NARRATOR: Drongulus Maximus Scromulus, a young and horny boy, found the tree one afternoon. He ignored the berries.
(The documentary tastefully cuts to a shot of some clouds.)
NARRATOR: Seconds later, an eruption, equally enjoyable as it was devastating.
[SFX boom]
NARRATOR: The entire village was wiped out. Not a single survivor. All that remained was Drongulus, and the tree.
NARRATOR: Not nine minutes passed, and the tree began to fruit. No longer berries, but a plethora of degenerates. Each one different, but in some ways identical.
NARRATOR: That is us. We are the degenerates.
NARRATOR: Some historians dispute this, citing Godric Gryffindor and a Waluigi universe. Those historians are on a different page of the wiki.
[MUSIC doc stop]
`,
  { unlockFlag: "ch5_clear", unlockHint: "Locked programme: unlocks after Chapter 5" },
);

const EPISODES: TVEpisode[] = [KRANDALL_SEGMENT, WILDERN_BULLETIN, NEWS_1, NEWS_2, NEWS_3, NEWS_4, NEWS_5, CABINET_LIVE, SHOPPING, KRONSTER_DOC, LORE_HOUR, CREATION_MYTH, EASTENDERS_KREZZ, BEEP_SHOW, ...KREWS_EPISODES, ...KREWS3_EPISODES, { ...TCC_EP07, channel: "CHANNEL KREZ" }];

/** Number each channel's episodes in order, now that some channels have been folded together. */
const counts: Record<string, number> = {};
export const ALL_EPISODES: TVEpisode[] = EPISODES.map((e) => ({ ...e, episodeNumber: (counts[e.channel] = (counts[e.channel] ?? 0) + 1) }));

export const CHANNELS: string[] = ["GB KREWS 24", "CHANNEL KREZ", "BBK ONE", "WONKING MACHINE SHOPPING NETWORK", "KRELWORLD DOCUMENTARIES"];

/** Which set a shot uses. The TV renderer draws these procedurally. */
export function setKeyFor(set: string): string {
  const s = set.toUpperCase();
  if (s.includes("OVAL OFFICE")) return "oval_office";
  if (s.includes("CLASSROOM")) return "classroom";
  if (s.includes("DEBATE")) return "debate_stage";
  if (s.includes("CONFERENCE HALL")) return "conference_hall";
  if (s.includes("ICE CREAM")) return "ice_cream";
  if (s.includes("POLLING")) return "polling";
  if (s.includes("DOWNING STREET")) return "downing_st";
  if (s.includes("STADIUM")) return "stadium";
  if (s.includes("PRESS BRIEFING") || s.includes("PRESS CONFERENCE")) return "press";
  if (s.includes("NEWSDESK")) return "newsdesk";
  if (s.includes("CAVE")) return "cave";
  if (s.includes("CELLAR")) return "cellar";
  if (s.includes("QUEEN VIC")) return "pubbar";
  if (s.includes("PRESS ROOM")) return "press";
  if (s.includes("COCKPIT") || s.includes("PLANE")) return "cockpit";
  if (s.includes("BUNKER")) return "bunker";
  if (s.includes("CELL")) return "cell";
  if (s.includes("CORPORATE") || s.includes("BOARDROOM") || s.includes("INTERROGATION")) return "boardroom";
  if (s.includes("LIVING ROOM") || s.includes("FLAT") || s.includes("BEDROOM")) return "livingroom";
  if (s.includes("SANA") || s.includes("HOTEL") || s.includes("HIGH STREET") || s.includes("PARADE")) return "street_day";
  if (s.includes("POLSON")) return "polson_ext";
  if (s.includes("TOWNHALL")) return "townhall_cam";
  if (s.includes("KRELLBALL")) return "pitch";
  if (s.includes("SHOPPING")) return "shopping";
  if (s.includes("EMERGENCY")) return "emergency";
  if (s.includes("ARCHIVE")) return "archive";
  if (s.includes("FOREST")) return "forest";
  if (s.includes("NYC") || s.includes("NEW YORK") || s === "nyc_skyline".toUpperCase()) return "nyc_skyline";
  if (s.includes("OFFICE")) return "office_night";
  if (s.includes("COURT")) return "courtroom";
  if (s.includes("CHURCH") || s.includes("FUNERAL")) return "church";
  if (s.includes("GROCERY") || s.includes("SUPERMARKET")) return "supermarket";
  if (s.includes("ANTARCTICA") || s.includes("SOUTH POLE")) return "antarctica";
  if (s.includes("CHILDREN'S TV") || s.includes("KIDS")) return "kids_studio";
  if (s.includes("MERGED UNIVERSE")) return "smash";
  return set.toLowerCase();
}
