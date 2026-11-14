import { parseScreenplay, type TVEpisode } from "../../../game/systems/tv";

// "News articles 3": supplied articles and screenplays, kept as written (OCR'd from screenshots,
// so the page order was rebuilt). Changes:
// - Chomworld: the real-life assistant character is renamed Marge Plunkett.
// - The Ben Burgis scripts use an invented professor, Barry Guttridge.
// - Microsoft's "Crash Mode": the real Washington collision is now a fictional one over Krelford.
// - FIFA: Audience: the Hillsborough level is cut.
// - Dickinson for President: the "very young Filipina" scene is cut, and Trump storms off
//   instead of shooting himself.
// Not included: Chomsky's "polyamorous triad", Corbyn in Jo Cox's constituency, "Reality Show",
// and "The Story of Jenko's Childhood".

const NEWS = "GB KREWS 24";
const DRAMA = "BBK ONE";
const SKETCH = "CHANNEL KREZ";

const ep = (id: string, channel: string, show: string, title: string, n: number, script: string): TVEpisode => ({
  id,
  channel,
  show,
  title,
  episodeNumber: n,
  beats: parseScreenplay(script),
});

const NEWS_OPEN = `[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - DAY
[MUSIC news fade]`;

export const KREWS_CHOMSKY_SHARKS = ep(
  "krews_chomsky_sharks",
  NEWS,
  "GB Krews",
  "Professor Chomsky: An Obituary",
  8,
  `${NEWS_OPEN}
NEWSREADER (solemn): We are saddened to announce the passing of Professor Noam Chomsky, the esteemed linguist, political theorist, and intellectual giant.
NEWSREADER: Professor Chomsky, who had been in a vegetative state for a year following a stroke and resided in a hospice, met a tragic end during a shark-watching trip organized by the hospice staff.
EXT. HIGH STREET - DAY
REPORTER: During the outing, Professor Chomsky was taken on the shark-watching trip by the hospice staff.
REPORTER: Upon sighting a large shark, he began grunting in a manner that led the staff to believe he was on the verge of yet another great contribution to socialist philosophy, but required a closer look at the shark.
REPORTER: In an attempt to provide him with a better view, the staff lifted him, but their attention was diverted by another care home resident accidentally toppling overboard.
[SFX splash]
REPORTER: Tragically, in the chaos that ensued the staff lost their grip on Professor Chomsky, and he too toppled overboard into the waters teeming with ravenous sharks.
REPORTER: Despite their best efforts, Professor Chomsky was devoured by the sharks before he could be rescued.
INT. NEWSDESK - DAY
NEWSREADER: Professor Noam Chomsky leaves behind a profound legacy of groundbreaking work in linguistics, political activism, and philosophy. His insights and intellectual contributions have left an indelible mark on us all.
[FADE]
`,
);

export const KREWS_CHOMSKY_BRAIN = ep(
  "krews_chomsky_brain",
  NEWS,
  "GB Krews",
  "Chomsky's Brain Stolen",
  9,
  `${NEWS_OPEN}
# BREAKING: CHOMSKY'S BRAIN STOLEN
NEWSREADER: In a shocking turn of events, chaos and panic have erupted as Professor Noam Chomsky, who has been in a vegetative state for a year, is suspected to have had his brain stolen!
NEWSREADER: The alarming discovery was made during an MRI scan that revealed the startling absence of Chomsky's brain, sparking fears of a diabolical plot that has sent shockwaves across the nation.
[GASP]
EXT. HIGH STREET - DAY
REPORTER: President Biden has responded to the crisis by imposing a national lockdown and granting unprecedented powers to the military to conduct house-to-house searches in a desperate bid to locate Chomsky's missing brain or the individual who may have absconded with it.
REPORTER: The urgency of the situation was underscored by an unnamed government source who expressed grave concerns about the implications, stating:
OFFICIAL: The fear is that someone foreign could install the greatest brain in human history inside their own head and take over everything - real scary stuff.
INT. NEWSDESK - DAY
NEWSREADER: The potential ramifications of the stolen brain have ignited fevered speculation and wild theories among experts and officials.
NEWSREADER: Some speculate that the possessor of Chomsky's brain could gain unparalleled intelligence and insight, while others fear that they could wield untold power and influence over society. The thought of a foreign entity harnessing Chomsky's unparalleled intellect has sent shivers down the spines of many.
NEWSREADER: Adding to the already frenzied atmosphere, rumors have circulated that Chomsky may have had not just one, but three brains due to his extraordinary intellect and genius.
NEWSREADER: If true, the implications are dire, as it could mean that three nefarious individuals might be on the brink of receiving one brain each, or perhaps two individuals receiving one and a half brains each.
NEWSREADER: The thought of such a scenario has left authorities and citizens alike on edge, with the specter of an intellectual coup looming large.
NEWSREADER: As the nation grapples with this unprecedented crisis, the search for Chomsky's brain intensifies, with the fate of the country hanging in the balance. The race to reclaim the missing brain has never been more urgent.
[FADE]
`,
);

export const KREWS_CHOMSKY_WEBSITE = ep(
  "krews_chomsky_website",
  NEWS,
  "GB Krews",
  "Breakthrough in Mapping Chomsky's Brain Yields Cryptic Message",
  10,
  `${NEWS_OPEN}
NEWSREADER: In a groundbreaking technological feat, a $500 billion investment into mapping the contents of renowned linguist Noam Chomsky's brain onto a hard drive has finally paid off its first dividends.
NEWSREADER: Chomsky, who has been incapacitated by a severe stroke and unable to verbalize his thoughts, has long been a subject of fascination for scientists and linguists alike.
INT. ARCHIVE - DAY
REPORTER: After two years of intensive work, the state-of-the-art technology was able to transcribe a single phrase from Chomsky's thought processes:
[SFX notify]
# "web site... new web site."
REPORTER: The cryptic message has sparked a wave of speculation and intrigue among internet sleuths, who are attempting to decipher the hidden meaning.
INT. NEWSDESK - DAY
NEWSREADER: One particularly outlandish theory circulating online proposes that Chomsky's brain contains encoded messages from extraterrestrial beings, and the mention of a "new web site" is a signal for humanity to prepare for contact with otherworldly civilizations.
NEWSREADER: Our website is also new. Coincidence? Back after the break.
[FADE]
`,
);

export const KREWS_CARTER = ep(
  "krews_carter",
  NEWS,
  "GB Krews",
  "Jimmy Carter 'Probably Dead'",
  11,
  `${NEWS_OPEN}
# BREAKING NEWS: JIMMY CARTER 'PROBABLY DEAD', BUT FAMILY PLANS TO BURY HIM ALIVE IF HE'S STILL ALIVE DURING NEXT VISIT
NEWSREADER: Plains, Georgia. In an extraordinary and bewildering statement released earlier today, the family of former President Jimmy Carter has announced that while they believe he is "probably dead," they cannot confirm this until their next scheduled visit to his nursing home, which is set to take place in "a few months."
NEWSREADER: The family's assumption is reportedly based on insights from Carter's granddaughter, who claims to have a "close connection to the spirit realm." She described the signals as "pretty conclusive," though the family emphasized that these metaphysical observations should not yet be treated as definitive evidence.
EXT. HIGH STREET - DAY
REPORTER: However, it's what the family plans to do if Carter is still alive during their next visit that has drawn the most attention.
REPORTER: According to their statement, should the former president be found alive in a few months' time, preparations will immediately begin for what they describe as a "dignified death" - a process that will involve burying him alive.
REPORTER: This decision, they say, aligns with private conversations in which Carter reportedly described being buried alive as "life's final mystery." The family insists that this was not a fleeting comment but rather a sentiment he expressed on multiple occasions.
INT. NEWSDESK - DAY
NEWSREADER: When pressed on the apparent contradiction between Carter's private wishes and his repeated, public expressions of "his greatest fear" being buried alive, the family responded with a knowing chuckle, saying, "Oh, classic Jimmy and his dry sense of humor!"
NEWSREADER: They added that his repeated public anxiety on the matter was likely "just another example of his playful wit."
[FADE]
`,
);

export const KREWS_SPOONS_CABINET = ep(
  "krews_spoons_cabinet",
  NEWS,
  "GB Krews",
  "Starmer Unveils 'Revolutionary' Wetherspoons Cabinet",
  12,
  `${NEWS_OPEN}
# STARMER UNVEILS "REVOLUTIONARY" WETHERSPOONS CABINET AND ANNOUNCES DRASTIC OVERHAUL OF CRIMINAL JUSTICE SYSTEM
NEWSREADER: In a move described by Downing Street as "an unprecedented recalibration of democratic representation," Prime Minister Keir Starmer has appointed a new Cabinet composed entirely of men randomly selected from Wetherspoons pubs across the United Kingdom.
INT. QUEEN VIC - DAY
REPORTER: Speaking outside The Lord Moon of the Mall, flanked by newly appointed Defence Secretary Barry from Sunderland and Chancellor of the Exchequer Keith "Big Keith" Morgan of Grimsby, Starmer declared that the reshuffle marked "the beginning of real Britain governing itself."
KEIR STARMER: Enough of the elite echo chambers. These are people who know what it's like to get by on a tenner, who've seen the bottom of a pint glass and stared into the soul of the country.
(The Prime Minister pauses twice during the announcement to belch into the microphone.)
[SFX burp]
KEIR STARMER (grinning): That's the beauty of the full English - you get to experience it more than once.
INT. NEWSDESK - DAY
NEWSREADER: The reshuffle comes amid mounting pressure on the Labour government to reconnect with disaffected voters in so-called "left-behind communities." Reaction from traditional Labour MPs was mixed, with one frontbencher, speaking anonymously, describing the move as "morally troubling and logistically terrifying."
NEWSREADER: Later that day, Starmer unveiled the Cabinet's first flagship policy: a £900 million initiative described as "the most ambitious criminal justice reform in British history." The programme is to be funded by high-interest emergency loans from "whoever will give us money quickly."
NEWSREADER: At the heart of the proposal is a single, specific punishment for those convicted of child sexual abuse. According to government documents, the new Wetherspoons Cabinet developed the policy "over several hours and multiple pitchers of Strongbow Dark Fruits."
NEWSREADER: It involves "a highly electrified length of barbed wire being inserted into the urethra" of each offender, with the electric current continuing for up to one week after death.
INT. PRESS ROOM - DAY
REPORTER: Defending the post-mortem duration of the punishment, Starmer told reporters:
KEIR STARMER: If there's a 0.01% chance of one of these pedos coming back to life, I want to be absolutely sure they don't.
REPORTER: The announcement sparked immediate outrage from legal scholars and human rights observers, many of whom expressed disbelief, calling it "a grotesque and legally incoherent response to a real problem," while the Bar Council issued an emergency letter to the Lord Chancellor.
REPORTER: Prime Minister, how can the government justify spending £900 million on a single punishment method, particularly given widespread cuts to public services?
KEIR STARMER: What's your problem - you into kids or something?
KEIR STARMER: Let me be clear: anyone who opposes this policy should be treated as a suspected pedophile until proven otherwise.
REPORTER: Is such a stance compatible with civil liberties?
KEIR STARMER (shaking his head): Mate, we're not doing civil liberties for pedos. Grow up.
INT. NEWSDESK - DAY
NEWSREADER: Technical experts have also raised concerns about infrastructure, with the National Grid warning that the plan would place "catastrophic strain" on the energy network. "Rolling blackouts are all but certain," a senior official said.
INT. PRESS ROOM - DAY
KEIR STARMER (defiant): Good. It'll bring us together again. Torches, camaraderie, a bit of suffering - that's the British way.
INT. NEWSDESK - DAY
NEWSREADER: The Prime Minister is expected to continue pub-based recruitment efforts through the summer, with ministerial hopefuls advised to attend curry nights and "hold court."
NEWSREADER: A Labour spokesperson declined to confirm whether Cabinet meetings will now be held in Wetherspoons branches, but stated that "the Prime Minister values environments where opinions are unfiltered and ashtrays are still present, even if unofficially."
[FADE]
`,
);

export const KREWS_KRENSHAW = ep(
  "krews_krenshaw",
  NEWS,
  "GB Krews",
  "Markets Rally on £20 Billion 'Random Public Investment'",
  13,
  `${NEWS_OPEN}
# FINANCIAL MARKETS RALLY AS UK PRIME MINISTER KEIR STARMER ANNOUNCES £20 BILLION "RANDOM PUBLIC INVESTMENT"
NEWSREADER: In a move that left both financial analysts and political pundits reeling, UK Prime Minister Keir Starmer has announced a staggering £20 billion "random public investment" initiative, marking a sharp departure from his campaign promise of strict fiscal discipline.
NEWSREADER: The financial markets, however, have reacted with overwhelming positivity to the bold, unexpected policy shift.
INT. PRESS ROOM - DAY
(The announcement, dubbed the "Krenshaw" budget, is made in a flamboyant manner.)
KEIR STARMER: Buy low, sell high! Buy low, sell high! BUY LOW, SELL HIGH!
REPORTER: The Prime Minister revealed that the first £10 million of this investment would be allocated to market research for developing a new anthropomorphic mascot for the Labour Party.
REPORTER: The mascot, "Lombar," is envisioned as a part Labrador, part cow creature that secretes "money milk" from its udders, symbolizing the endless liquidity the government aims to provide.
INT. NEWSDESK - DAY
NEWSREADER: Financial markets responded with an immediate surge in confidence, reflected in soaring stock prices and a significant drop in bond yields. Industry figures were quick to voice their support for Starmer's audacious plan.
EXECUTIVE: He's got balls and he's bold. The markets like that.
NEWSREADER: "The cat's out of the bag: money is just numbers on a screen. All he's doing is adding a few more zeroes to that screen," added a senior economist from a leading investment bank.
NEWSREADER: Some financial experts even suggested that Starmer's £20 billion injection might be too conservative.
EXECUTIVE: If anything, he should be spending much more than this. The market loves money.
INT. PRESS ROOM - DAY
REPORTER: Starmer's unconventional approach didn't stop at mascot development. He also passed a controversial law enabling him to use funds earmarked for public spending to pay off his personal gambling debts.
REPORTER: When he announced this, everyone present "laughed in an understanding way," appreciating the humor and sheer audacity of the move.
[LAUGHTER]
INT. NEWSDESK - DAY
NEWSREADER: "Starmer's strategy is a masterclass in fiscal alchemy. Turning public debt into private gains is a stroke of genius," said a renowned financial commentator.
NEWSREADER: "The Krenshaw budget is like a unicorn on Wall Street - rare, mythical, and absolutely thrilling," remarked another analyst, blending fantasy with financial jargon.
NEWSREADER: "The introduction of 'Lombar' shows a keen understanding of market dynamics and consumer psychology. It's innovative and forward-thinking," praised a marketing strategist from a top-tier financial firm.
NEWSREADER: With the markets buoyed by Starmer's bold moves, it appears that the Prime Minister has tapped into a vein of financial optimism.
NEWSREADER: Whether this unorthodox strategy will translate into long-term economic stability remains to be seen, but for now, the market's verdict is clear: Keir Starmer's gamble has paid off, at least in the eyes of investors.
[FADE]
`,
);

export const KREWS_CRASH_MODE = ep(
  "krews_crash_mode",
  NEWS,
  "GB Krews",
  "Microsoft Faces Outrage Over 'Crash Mode' DLC",
  14,
  `${NEWS_OPEN}
# MICROSOFT FACES OUTRAGE OVER "CRASH MODE" DLC ANNOUNCEMENT FOLLOWING KRELFORD MID-AIR COLLISION
NEWSREADER: Redmond. Microsoft has come under intense scrutiny after scheduling a press conference to announce a new "Crash Mode" DLC for its flagship Flight Simulator video game just one day after a catastrophic mid-air collision over Krelford.
NEWSREADER: The downloadable content, which controversially encourages pilots to deliberately crash their aircraft, was further condemned for its inclusion of an interactive "penis sensor," described by the company as delivering "unimaginable and forbidden pleasures" to players.
INT. PRESS ROOM - DAY
REPORTER: At the ill-timed press event, a Microsoft spokesperson detailed the expansion, which not only rewards players for mid-air collisions but also introduces a mechanic where pilots are encouraged to seduce air stewardesses and visit "gentlemen's table dancing clubs" upon landing.
REPORTER: The sensor, which attaches to the player's groin, reportedly vibrates and moistens in sync with on-screen activities, a feature that has been widely derided as both obscene and completely unrelated to the game's original premise.
INT. NEWSDESK - DAY
NEWSREADER: Outrage erupted within minutes of the announcement, with journalists and aviation experts lambasting Microsoft for what they called "an unconscionable lack of tact" and "a grotesque trivialization of real-world tragedies."
NEWSREADER: Social media was flooded with calls for boycotts, and the families of victims of the disaster have condemned the company's tone-deaf timing.
INT. PRESS ROOM - DAY
REPORTER: Despite the backlash, the Microsoft executive leading the announcement responded with brazen indifference.
EXECUTIVE (smirking): Sorry, I can't hear you over all this money.
EXECUTIVE: If anyone needs me, I'll be attempting to crash a plane in mid-air on the game.
[GASP]
[FADE]
`,
);

export const KREWS_FIFA_AUDIENCE = ep(
  "krews_fifa_audience",
  NEWS,
  "GB Krews",
  "Review: FIFA: Audience",
  15,
  `${NEWS_OPEN}
# GAMES REVIEW: "FIFA: AUDIENCE"
NEWSREADER: "FIFA: Audience" is the new, much hyped sim from EA Sports. In the game, you take control of a bald, white forty to fifty year old who attends football games to ostensibly show support for his team.
NEWSREADER: The game begins as soon as the player boards the bus to the game, and ends when he leaves the stadium. To interact with the game, players only have two options; 'coin' and 'disdain'.
NEWSREADER: 'Coin' is used to have the player throw coins or bananas, and 'disdain' has the player brandish his middle finger and boo.
EXT. STADIUM - DAY
REPORTER: Not only does this encourage an anti-social and violent experience, the game also uses points and rewards to encourage such behaviour.
REPORTER: Players receive points and bonuses for every person they hit with a coin or banana, regardless of which team that person plays for.
REPORTER: Additionally, there is no positive way to show your support for the team you are supporting - you cannot cheer, only boo and stick your middle finger up - even when your team wins.
REPORTER: The game doles out rewards on the basis of how many times you restively mash the buttons during the game, and by how many people you pelt with coins and bananas.
REPORTER: There is very little downside to such behavior in the game - incidents of violence are met with a "wanted" level, ripped straight off Grand Theft Auto, in which stewards pursue you in the ground, but who are easily fought off with (you guessed it) coins and bananas.
REPORTER: In the event you are caught you are inexplicably hauled in front of the board of directors, who hold a disciplinary meeting in which you can only boo and throw coins, and which ends with the board telling you you have "one more chance", every time.
INT. NEWSDESK - DAY
NEWSREADER: The game presents several deeply bizarre and offensive "events" throughout the course of the playthrough: hooliganism, racism and sexism to name a few. In one such event, you must egg a group of female supporters and score points based on how well you succeed in hitting the women.
NEWSREADER: In another mission, your team are down by 4 goals and your best mate 'Eggy' sets you the objective of inciting a riot to have the game called off, which you achieve by throwing coins at children supporting your own team.
NEWSREADER: The narrative of the game inexplicably centers around the protagonist's bid to "reclaim what's rightfully his" while he continues to egg and harass both his rivals and his team of choice.
EXT. STADIUM - DAY
REPORTER: In another level you take part in a raucous celebratory pitch invasion following a cup win, and the player can choose whether to 'coin' or 'disdain' several birds he finds nesting in the rafters of the stadium.
REPORTER: All in all, "FIFA: Audience" is an offensive, buggy and shallow experience that lacks any meaningful insight into the culture of football fandom.
REPORTER: The game encourages, rewards and celebrates the very worst aspects of football fandom, feeling more like a 'crime simulator' than an educational experience of what it's like to support a team.
INT. NEWSDESK - DAY
NEWSREADER: And this nihilistic, ugly game bears the endorsement and brand of international football's governing body. When pressed for comment, FIFA said the following:
OFFICIAL: We believe in the power of football to bring people together, and we hope and expect that those who engage with FIFA Audience mode do so with respect for the values of the beautiful game.
OFFICIAL: This is a game which emphasizes player freedom. At no point is the player obliged to harm children or women - they are free to instead choose to fail the level and get game over.
NEWSREADER: Let's hope they're right, or we could all end up hopping on the bus to the next match with a bag full of coins and a head full of disdain.
[FADE]
`,
);

export const KREWS_ROBOREF = ep(
  "krews_roboref",
  NEWS,
  "GB Krews",
  "Euro 2024: Robot Referee Goes Rogue",
  16,
  `${NEWS_OPEN}
# 2024 EUROS: ROBOT REFEREE GOES ROGUE, INTRODUCES CHAOS AND CONTROVERSY
NEWSREADER: The 2024 European Championship was set to be a landmark event in football history, not just for the thrilling matches and skilled players, but also for the introduction of a groundbreaking technological advancement: a robot referee.
NEWSREADER: However, what was intended to be a demonstration of the future of officiating quickly descended into chaos as the robot, named ARBITRO-9000, malfunctioned spectacularly, attacking players, tearing up the pitch, and revealing troubling biases inherent in its programming.
NEWSREADER: To add insult to injury, the rogue robot also emitted foul-smelling "robo-farts," making the experience unpleasant for everyone involved.
EXT. STADIUM - DAY
# DESCENT INTO MADNESS
REPORTER: The excitement turned to horror during the opening match. Midway through the first half, ARBITRO-9000 began to exhibit erratic behavior.
REPORTER: What started as minor misjudgments quickly escalated into full-blown aggression. The robot charged at players, knocking them over and causing injuries. It tore up large sections of the pitch, rendering it unplayable.
[SFX smash]
REPORTER: Players and officials attempted to subdue the machine, but it seemed to gain a sinister sentience, evading capture and continuing its rampage.
REPORTER: As the chaos unfolded, a disturbing pattern emerged: ARBITRO-9000's attacks were disproportionately targeted at players of certain racial backgrounds.
[SFX fart]
REPORTER: It has also just farted. Back to the studio.
[FADE]
`,
);

export const DRAMA_CHOMWORLD = ep(
  "drama_chomworld",
  DRAMA,
  "Chomworld",
  "Chomworld: The Pitch",
  1,
  `
# CHOMWORLD: THE PITCH
INT. EXECUTIVE BOARDROOM - DAY
(The room is a sleek, modern corporate boardroom. A large mahogany table dominates the space, with EXECUTIVES sitting around it, some flipping through documents, others typing on laptops. At the head of the table stands MARGE PLUNKETT, late 50s, eccentric and frazzled, holding a battered briefcase and grinning eagerly.)
MARGE PLUNKETT: Thank you all for taking the time to meet with me today. I've got a golden opportunity that's gonna make us all richer than a hedge fund manager in a bail-out year! (giggles awkwardly)
EXECUTIVE 1 (leaning back, skeptical): And this opportunity is...?
MARGE PLUNKETT (chuckling): Chomworld! A Noam Chomsky-themed amusement park!
(The executives exchange bewildered glances.)
EXECUTIVE 2 (leaning forward): Chomsky? The linguist and political critic?
MARGE PLUNKETT (nodding enthusiastically): Exactly! Who wouldn't want to take their family on an exhilarating, educational journey into the mind of Noam Chomsky? And, of course, get a little richer along the way. (laughs nervously)
EXECUTIVE 3 (skeptical): You're talking about a theme park... centered around Chomsky? What exactly are you envisioning here?
MARGE PLUNKETT: Oh, lots of big ideas! Picture this: the park is filled with Chomsky lookalikes - people in costumes, dancing, singing... and they should be singing Disney songs!
EXECUTIVE 1 (frowning): Disney songs? Isn't that... problematic?
MARGE PLUNKETT (scoffing): What are they going to do, sue us? Hahaha. It has to be Disney! Nothing else screams "fun" like "A Whole New World" but with a Chomsky twist! (giggles nervously again)
EXECUTIVE 2: Alright... and how do you plan to fund this?
MARGE PLUNKETT (grinning): Well, I probably have access to all of his money, which should be a good start.
MARGE PLUNKETT: I've also hired this really... um... competent lawyer who specializes in "groan analysis" to analyze Chomsky's guttural moans - you know, from the stroke - so we could, uh, legally secure his rights. (shifty eyes)
(The executives exchange a look of growing concern.)
EXECUTIVE 3 (slowly): Groan analysis? That's... new.
MARGE PLUNKETT (ignoring them): And wait until you hear about the park's centerpiece: Chomlate! Chomsky-themed chocolate! Every bar could have little quotes or random linguistics terms embedded in them. Kids will love it!
EXECUTIVE 1 (skeptical): How exactly does chocolate relate to Chomsky's work?
MARGE PLUNKETT (shrugging): Eh, who cares? It's chocolate!
MARGE PLUNKETT: And, get this, we'll have an exhilarating, 4D virtual ride based on "Manufacturing Consent." Audience members sit in aggressively vibrating chairs while the first four chapters are read by a text-to-speech voice over loudspeakers. And water will be sprayed at them to make it more... immersive!
EXECUTIVE 2 (wincing): So, just to clarify, you're suggesting that people pay to sit in vibrating chairs, get blasted with water, and listen to a robotic voice drone on about media manipulation?
MARGE PLUNKETT (excited): Exactly! (beat) And... uh... oh! There's going to be a sex-themed area too, where we can have, like, pornography playing... or something?
(The executives collectively grimace.)
MARGE PLUNKETT (waving dismissively): Anyway, that's not all. The high-concept centerpiece to the park will be a gigantic, 60-foot animatronic Chomsky. It'll promise fame and riches to anyone who donates lots of money.
MARGE PLUNKETT: And when they do, the waiver they sign will be shredded by naked strippers through a system of pulleys, while the animatronic Chomsky laughs maniacally, saying, "Ha ha ha! This is literally what capitalism does!"
(The executives lean forward, now more curious than appalled.)
EXECUTIVE 3 (interested): And where exactly would the donated money go?
(MARGE pulls out several large empty sacks with dollar signs on them.)
MARGE PLUNKETT: Maybe to me... or whatever. I'll make sure it gets spent wisely. (glances out the window longingly at a large seafront mansion)
EXECUTIVE 1 (concerned): You... don't seem to have a clear plan. What's your next step if we were to proceed?
MARGE PLUNKETT (suddenly clutching her stomach): Ughh... my IBS is so bad today... hang on, I just need to use the toilet quickly.
[BLOCK MARGE PLUNKETT offscreen]
(Marge rushes out of the room. LOUD GRUNTING AND FARTING NOISES are heard from the bathroom. The executives stare at each other, speechless.)
[SFX fart]
EXECUTIVE 2 (whispering): Did she just suggest using a real, intubated Chomsky in an exhibition?
MARGE PLUNKETT (off-screen, shouting from the bathroom): Yeah, yeah! The real Chomsky - intubated, recovering from a stroke! We could have feeding sessions where guests can pay a premium to feed him bugs or dirt!
[SFX flush]
MARGE PLUNKETT (off-screen): And they can pet him, stroke him, or even poke him with a small but firm stick! We could charge a fortune for that!
EXECUTIVE 3 (trying to process): People paying to... feed Chomsky bugs and poke him with a stick?
[BLOCK MARGE PLUNKETT enter]
MARGE PLUNKETT (re-entering the room, wiping her hands on her pants): You got it! They'd love it! Now, if you're not completely sold yet, how about this? To sweeten the deal, I'll throw in a little... personal entertainment.
(The executives, suddenly intrigued, sit up straighter in their chairs.)
EXECUTIVE 1 (grinning): Personal entertainment, you say?
MARGE PLUNKETT (raising an eyebrow): You know... something a little more intimate. Like, say... a striptease?
(The executives exchange eager glances, their skepticism fading.)
EXECUTIVE 2 (smiling): Well, Marge, you've got our attention.
(Marge, with a mischievous grin, begins to unbutton her blouse. The executives lean in closer, their excitement palpable. The room is filled with their moans of pleasure as they murmur things like "Mmm, fuck..." and "Chomsky would love this.")
EXECUTIVE 3 (breathlessly): Oh yeah... Chomsky would definitely approve.
(Marge continues her striptease, moving awkwardly but with growing confidence, as the executives lose themselves in the absurdity of it all. The scene fades to black, with their collective groans echoing in the darkness.)
[FADE]
# END
`,
);

export const DRAMA_PRESIDENT_HAN = ep(
  "drama_president_han",
  DRAMA,
  "The Briefing",
  "President Han Explains",
  1,
  `
# THE BRIEFING
INT. PRESIDENTIAL PRESS BRIEFING ROOM - DAY
(A sleek, overly polished PRESS BRIEFING ROOM packed with JOURNALISTS, GOVERNMENT AIDES and random PEOPLE who wandered in out of curiosity. At the podium stands PRESIDENT HAN, a perpetually sweating man in his late 50s with an unnervingly confident grin.)
PRESIDENT HAN (adjusts the mic, flashes a forced smile): Good afternoon, everyone. I'm sure as we were all tucking into our kimchi or perhaps some divine Korean barbecue, we all heard this crazy news story about that plane... exploding. Whoa...
(He pauses for dramatic effect; the crowd murmurs nervously.)
PRESIDENT HAN: Anyway... it turns out this was actually... a good thing.
[GASP]
(Gasps from the audience. Someone drops their pen.)
JOURNALIST 1: A good thing?!
PRESIDENT HAN: Yup! Because - and hold onto your seats, folks - it turns out the passengers on that plane were actually... a North Korean splinter cell!
(The crowd collectively inhales.)
PRESIDENT HAN: That's right, they were planning to enact what they were calling... Korean 9/11!
(A stunned silence is followed by chaotic shouting.)
PRESIDENT HAN: And they were going to fly right into the... "Korean Twin Towers!"
(A beat. Confused murmurs ripple through the crowd.)
JOURNALIST 2: That doesn't even make sense! There's no such thing as 'Korean Twin Towers!'
JOURNALIST 3: What about the children on board?!
PRESIDENT HAN: Oh-ho! You think those were children? No, no, no. Those sick fucking North Koreans were using... uh... a crazy transformation device!
(Pauses, raises a finger for emphasis.)
PRESIDENT HAN: To make them resemble kids!
(Pause. A flicker of belief crosses the faces of a few audience members.)
PRESIDENT HAN: Or - and hear me out - it might have been... M-words. You know, people who can pass as children.
(Murmurs of semi-approval. Someone in the crowd nods.)
JOURNALIST 4: Well... it's good he didn't use the M-slur.
JOURNALIST 5: Yeah, maybe this guy isn't so bad.
PRESIDENT HAN: See? I knew you'd come around! And just to make sure this never happens again, we've taken the precaution of... um... loading all passenger jets with... C4 explosives!
(Outrage erupts in the room.)
JOURNALIST 1: What?! That's insane!
JOURNALIST 2: Hey! Wait a second! Your line about the Korean Twin Towers didn't even make sense!
PRESIDENT HAN (squints, leans into the mic, and cups his ear dramatically): Wait... are you... are you cheering? Thank you! Thank you!
(He claps for himself.)
PRESIDENT HAN: Look, I know there are already calls to increase the scope of my executive power, but hey, that's a conversation for tomorrow! For now... maybe some kind of medal. Or medals!
(Minor grumbling starts to bubble up in the crowd.)
PRESIDENT HAN: And look - are we 100% sure that they were a splinter cell? No. But I am 100% sure that the dead are all currently in the... good form of whatever afterlife us Koreans believe in. So really, it's great news however you slice it!
(The crowd goes silent for a beat. Then the shouting starts. Pieces of kimchi, Korean barbecue, and K-Pop CDs begin flying through the air. Grilled meat splatters against the podium. A BTS CD narrowly misses President Han's head.)
[SFX smash]
PRESIDENT HAN (ducking slightly, blinking rapidly): Uh-oh... losing them...
(He pretends to tap a non-existent earpiece. He freezes for a moment, staring into the middle distance as if listening to someone.)
PRESIDENT HAN: Woah... this update is seriously crazy. You guys are gonna love this.
(The crowd pauses mid-throw, slightly intrigued.)
PRESIDENT HAN: New information is just coming in from... uh... Korean MI5! It turns out... this was actually... Real Life Squid Game!
[GASP]
(Gasps. A woman in the crowd faints.)
PRESIDENT HAN: That's right! The passengers were contestants who... unfortunately lost. But they lost doing something they loved - competing for money!
[APPLAUSE]
(The crowd erupts in applause. Han sees an opening.)
PRESIDENT HAN: And who better to tell us more about Real Life Squid Game... than... Squid! The main character from the TV show!
[BLOCK SQUID enter]
[BLOCK SQUID right]
(A MAN IN A RED JUMPSUIT enters, looking utterly confused but still waves.)
SQUID: The plane crash was sad... but whatever!
[APPLAUSE]
(Thunderous applause. The crowd is now completely on Han's side.)
PRESIDENT HAN: And let me announce this: the next Real Life Squid Game will offer so much money to whoever can write me a... convoluted but effective legal argument that allows me to not be impeached and expand my powers.
JOURNALIST 6: That sounds like a recipe for abuse of power!
PRESIDENT HAN (earnest, hand over heart): Oh no, I'd never use those powers. I'm just... curious. You know, just to see if they'd work.
(The crowd murmurs. There's a collective nod of hesitant agreement.)
JOURNALIST 4: Well... he didn't use the M-slur earlier...
JOURNALIST 5: Yeah, he must be a good dude.
(The mood shifts dramatically. Someone starts clapping. Then another. Soon the crowd builds into an uncontrollable frenzy.)
[CHEERING]
CROWD: President! President! Squid Game! Squid Game! Money! Money!
PRESIDENT HAN (smirks into the camera): Democracy... works.
[FADE]
`,
);

export const DRAMA_ZERO_YEARS = ep(
  "drama_zero_years",
  DRAMA,
  "The Briefing",
  "Zero Years Old",
  2,
  `
# ZERO YEARS OLD
EXT. DOWNING STREET - DAY
(The PRIME MINISTER, late 50s, looking dishevelled and nervous, stands behind a lectern emblazoned with the UK government insignia. Reporters are huddled, their cameras trained on him, muttering amongst themselves. His approval ratings are at an all-time low, and the nation's economy teeters on the brink. The tension is palpable.)
PRIME MINISTER (under his breath): Right, here goes nothing.
(He adjusts his tie and clears his throat. The murmurs die down. He looks straight at the cameras, feigning confidence.)
PRIME MINISTER: Good afternoon, Britain. Today, I stand before you not just as your Prime Minister, but as a father... and as someone who believes in bold, transformative action.
(pauses dramatically)
PRIME MINISTER: For too long, British parents have suffered under the crushing weight of... months. Yes, months! The confusion, the frustration of having to remember how many weeks old their babies are. Twelve months? Seven months? Where does it end?
(The journalists exchange puzzled glances.)
PRIME MINISTER: No longer! I am proud to announce that, effective immediately, babies between the ages of zero and twelve months will now officially be referred to as 'zero years old.'
PRIME MINISTER (sharper now): This will be the British way. Our babies, your babies, will no longer be defined by mere months, but by the grand and dignified title of 'zero years old.'
REPORTER 1: Wait... what?
PRIME MINISTER: British parents have had enough. I've heard it in every corner of the country. Families torn apart by month-based age confusion. Sleepless nights wondering if their child is 10 or 11 months old.
PRIME MINISTER: Now, this change will not come without its challenges. It will involve significant adjustments. We will need to reprint textbooks, rewrite medical guidelines, update all public signage. Frankly, it will be... prohibitively expensive.
(The journalists lean forward.)
PRIME MINISTER: But... we will make cuts where necessary. Austerity measures must be put in place. Less food, public rationing, a general tightening of belts. But trust me, this is all for the greater good.
REPORTER 2: Punitive austerity... for zero year olds?
PRIME MINISTER: Exactly. Because it's not about what you want... it's about what you need. And I'm confident that, over time, you'll come to thank me for this. Even if you don't realise it yet.
(At this moment, the Prime Minister accidentally lets out a loud, unmistakable fart. There's a brief awkward silence.)
[SFX fart]
REPORTER 3: Did you... did you just fart?
REPORTER 4: I think the Prime Minister just farted!
[LAUGHTER]
(A ripple of giggles goes through the crowd. The Prime Minister shifts, irritated.)
PRIME MINISTER: Honestly, you're all acting like a bunch of zero year olds.
[BIG LAUGH]
(The press corps roars with laughter, some of them even clapping. Emboldened, the Prime Minister takes a step back, his expression smug.)
PRIME MINISTER (leaning into the joke): There, see? If we had a nation of zero year olds, this level of immaturity would be perfectly acceptable.
[LAUGHTER]
(The crowd is in stitches now, cameras flashing, the Prime Minister riding the bizarre wave of goodwill.)
PRIME MINISTER: Now, if there are no further serious questions... I'll be getting back to running the country.
[BLOCK PRIME MINISTER offscreen]
(He flashes a winning smile and struts off, waving. The journalists, still laughing, shout follow-up fart-related questions as he disappears inside Number 10.)
[FADE]
`,
);

export const DRAMA_SPECIAL_PARTS = ep(
  "drama_special_parts",
  DRAMA,
  "The Briefing",
  "Rishi's Special Parts",
  3,
  `
# RISHI'S SPECIAL PARTS
INT. PRESS CONFERENCE ROOM - DAY
(Rishi Sunak, the UK Prime Minister, stands at the podium, facing a crowd of reporters. The room is filled with the sound of cameras clicking and journalists murmuring.)
RISHI SUNAK (serious, composed): Good afternoon, everyone. As we enter the final days of this election campaign, I have an important and personal announcement to make.
(The room falls silent, all eyes on Sunak.)
RISHI SUNAK: Recently, I experienced a peculiar and alarming incident. I had been holding my mobile phone to my crotch for a prolonged period, and this resulted in significant swelling and odd sensations in my genitalia which persisted for hours.
INT. BUNKER - CONTINUOUS
(Backstage. Sunak's closest advisors, ALAN and KAREN, watch the broadcast on a monitor. They exchange panicked looks.)
ALAN (whispering urgently): Fuck. He's gone off script. We're fucked.
KAREN (panicking): What is he doing?!
INT. PRESS CONFERENCE ROOM - CONTINUOUS
(Sunak takes a deep breath, looking earnestly at the reporters.)
RISHI SUNAK: I am convinced that the phone was taking pictures of my 'special parts.'
[GASP]
INT. QUEEN VIC - DAY
(A working class pub filled with bald, overweight men wearing England shirts. They watch Sunak on TV, pints in hand. The room is filled with murmurs.)
PUB PATRON 1 (taken aback): Fair enough.
PUB PATRON 2: He actually says it like it is?
PUB PATRON 3: I've been waiting for a moment like this with him.
EXT. POLLING STATION - DAY
(Voters are angrily trying to change their vote from Labour to Conservative. Poll workers look stressed and overwhelmed.)
VOTER 1 (shouting): I want to change my vote to Conservative!
VOTER 2 (fuming): This changes everything!
(Poll workers frantically try to manage the situation, looking increasingly intimidated.)
INT. QUEEN VIC - NIGHT
(The pub is rowdy, filled with Conservative supporters drinking and talking loudly about Sunak's speech. A television in the corner plays highlights from the press conference. At the bar, a sole Labour voter, JOE, a wiry man in his 30s, sips his pint nervously, watching the crowd.)
[BLOCK JOE left]
JOE (loud enough to be heard): I think it was weird for Sunak to be making conspiratorial references to his penis.
(The room goes silent for a moment as heads turn towards Joe. A group of burly Conservative supporters, led by DAVE, a muscular man with a shaved head, approach him.)
[BLOCK DAVE right]
DAVE (angrily): What did you just say?
JOE (firmly, voice wavering slightly): I said it was weird. He's the Prime Minister. He should act with some decorum.
CONSERVATIVE SUPPORTER 4 (shouting): He was just telling it like it is!
JOE (sarcastic): Oh yeah? And what exactly is 'it'?
DAVE (taunting): Are you man enough to show us your 'special parts'? Or are you just a coward?
(The group laughs mockingly. Joe tries to maintain his composure.)
JOE (disgusted): This is ridiculous.
DAVE (enraged): Ridiculous? You calling us ridiculous?!
(Dave grabs a chair and throws it at Joe. It misses and crashes into a table, shattering it.)
[SFX smash]
PUB PATRON 4 (chanting): Rishi! Rishi! Rishi!
(Joe raises his hands defensively, trying to back away, but the group closes in. CONSERVATIVE SUPPORTER 5, a short but stocky man, swings at Joe, hitting him in the stomach. Joe doubles over in pain.)
JOE (winded): You're all mad!
(A full-on brawl breaks out. Chairs fly, and fists are thrown. The bartender, SUE, a tough woman in her 50s, steps in, her voice booming over the chaos.)
[BLOCK SUE center]
SUE (shouting): Stop it! Stop this now or I'll call the police! We won't stand for slander of Rishi and neither will they! Throw more chairs at him, lads!
[SFX smash]
(The room erupts with even more violence. Chairs are hurled at Joe, and punches fly with renewed vigor. Joe is on the floor, trying to shield himself from the onslaught. Police sirens are heard in the distance as the camera pans away from the pub.)
[SFX alarm]
[FADE]
`,
);

export const DRAMA_DICKINSON = ep(
  "drama_dickinson",
  DRAMA,
  "The Briefing",
  "Cheap as Chips: Dickinson for President",
  4,
  `
# CHEAP AS CHIPS
INT. OVAL OFFICE - DAY
(The Oval Office is abuzz with activity. AIDES, SENIOR DNC REPS, and DEMOCRATIC LEADERSHIP are engaged in heated debate, their voices overlapping. JOE BIDEN, looking worn out but determined, sits behind the Resolute Desk. A TV in the background plays an old rerun of the British TV show "Bargain Hunt.")
[BLOCK JOE BIDEN center]
DNC REP 1: We need someone strong, someone who can debate Trump head-on. Gavin Newsom?
AIDE 1: Gretchen Whitmer has been making waves lately.
DNC REP 2: What about Kamala Harris?
DAVID DICKINSON (on TV, boisterous): Cheap as chips!
AIDE 2 (half-joking): What about that guy?
(Stunned silence falls over the room.)
AIDE 3 (after a beat): That's an idea so crazy it just might work.
AIDE 4: That's an idea so crazy it just might work.
DNC REP 3: That's an idea so crazy it just might work.
DEMOCRATIC LEADER: That's an idea so crazy it just might work.
DNC REP 4: What do we even know about his policies?
AIDE 5: He's on TV. He probably has some good ideas.
DEMOCRATIC LEADER (enthusiastic): Let's do it.
EXT. DEBATE STAGE - NIGHT
(The first presidential debate. The stage is set with two podiums. DONALD TRUMP stands at one, visibly impatient. At the other, DAVID DICKINSON, with his trademark tan and flamboyant demeanor.)
[BLOCK DONALD TRUMP left]
[BLOCK DAVID DICKINSON right]
MODERATOR: Mr. Dickinson, your opening statement?
DAVID DICKINSON (smiling broadly): Cheap as chips!
(The audience is tentative, some chuckling.)
MODERATOR: Your response?
(Trump is flabbergasted, struggling to formulate a coherent reply.)
MODERATOR: Mr. Dickinson, your stance on healthcare reform?
DAVID DICKINSON: Bargain hunt!
[LAUGHTER]
(Laughter ripples through the audience.)
MODERATOR: Foreign policy?
DAVID DICKINSON: Cheap as chips!
MODERATOR: The economy?
DAVID DICKINSON: Bargain hunt!
MODERATOR: Closing statement?
DAVID DICKINSON: Cheap as chips!
[APPLAUSE]
(By the fourth repeat of the phrase, the crowd is in rapturous applause. Trump, visibly frustrated, throws his notes in the air and storms off the stage.)
[BLOCK DONALD TRUMP offscreen]
[CHEERING]
DAVID DICKINSON (winking at the camera): Cheap as chips.
[FADE]
`,
);

export const SKETCH_HEAVY_TRUTH = ep(
  "sketch_heavy_truth",
  SKETCH,
  "Krezz Sketch Show",
  "A Heavy Truth",
  4,
  `
# KREZZ SKETCH SHOW
# A HEAVY TRUTH
INT. CONFERENCE HALL - DAY
(The room is packed with people holding signs and banners reading "End Hunger Now." The atmosphere is charged with energy and anticipation. On the stage, a banner with the same slogan hangs above a podium. The crowd quiets as PROFESSOR BARRY GUTTRIDGE, a morbidly obese, left-wing professor of logic, steps up to the podium. He's slightly out of breath but determined. He adjusts the microphone.)
[BLOCK PROFESSOR GUTTRIDGE center]
PROFESSOR GUTTRIDGE: Thank you, everyone. We are here today to talk about a crucial issue that affects millions of people worldwide - hunger and poverty. These are issues that should concern every one of us, because a society that allows its members to go hungry is a society that has failed.
[APPLAUSE]
(The crowd nods and claps in agreement. Barry pauses, catching his breath slightly.)
PROFESSOR GUTTRIDGE: Now, when we talk about ending hunger, we often think about the basics - rice, beans, bread. But let's not forget the joy, the pure pleasure that food can bring. Imagine a world where everyone could indulge in the simple, comforting delight of cookies, crisps, choccy, fudge...
(As Barry lists these foods, he begins to drool slightly, wiping his mouth with a handkerchief. He chuckles, a bit embarrassed.)
PROFESSOR GUTTRIDGE (laughing): Sorry, folks... just lost my train of thought there. The idea of the salty taste of crisps combined with the rich juicy meat of a McDonald's burger, and the sweetness of choccy... it's enough to make anyone's mind wander, right? But back to the matter at hand...
(Barry pauses again, this time clutching his chest briefly as he catches his breath. The crowd looks on, some with concern, others with a mix of discomfort and judgment.)
PROFESSOR GUTTRIDGE (chuckling): Oh, don't mind me. Just normal guy problems, heh... just a little chest ache. But let's get back to what's important - ensuring that everyone, regardless of their situation, has the right to experience these joys.
(He continues, but his mind seems to drift again.)
PROFESSOR GUTTRIDGE: Because when you think about it... the combination of flavors in something as simple as a Big Mac - the savory beef, the tangy sauce, the crisp lettuce, all balanced by the sweetness of a soda - sorry, lost my train of thought again...
(He wipes his brow, visibly winded, but presses on.)
PROFESSOR GUTTRIDGE: We need to fight to make sure that everyone can enjoy these simple pleasures. Food isn't just sustenance; it's joy, it's comfort, it's connection.
[GASP]
(Suddenly, Barry appears to collapse, clutching his chest in what seems to be a heart attack. The crowd gasps, some rising from their seats in alarm. But just as quickly as he goes down, Barry straightens up, taking a deep breath and smiling weakly.)
PROFESSOR GUTTRIDGE (forcing a laugh): Sorry about that, folks. Just a little scare. But you know what? Through the power of positive thought and self-love, I'm back on my feet. Because that's what really keeps us going, isn't it? Love for ourselves, love for each other... and a good slice of pizza when we need it.
(The crowd begins to murmur, concern mixed with incredulity. Barry, however, continues on, determined to finish his speech.)
PROFESSOR GUTTRIDGE: And it's not just about surviving; it's about living. Living in a world where a kid doesn't just get bread, but also gets a slice of pizza. Where no one is denied the simple pleasure of a fresh donut, with the glaze melting into the soft, warm dough...
(Barry pauses, once again clutching his chest, this time struggling a bit more to catch his breath.)
PROFESSOR GUTTRIDGE (weakly chuckling): Sorry again, just another little chest ache... But what's truly disgusting, my friends, is a world where anyone goes hungry. What's disgusting is judging someone based on their appearance, rather than their actions, their character, their heart.
(The camera pans over the crowd, showing mixed reactions - some concerned, others incredulous. Two individuals exchange glances, one whispering to the other.)
CROWD MEMBER 1 (whispering): My god, that man is disgusting.
CROWD MEMBER 2 (nodding in agreement): Yeah... It's hard to watch.
NARRATOR: The vile audience members were wrong. Barry was right.
# THE END
`,
);

export const SKETCH_ICE_CREAM = ep(
  "sketch_ice_cream",
  SKETCH,
  "Krezz Sketch Show",
  "The Humiliating Life of Barry Guttridge",
  5,
  `
# KREZZ SKETCH SHOW
# THE HUMILIATING LIFE OF BARRY GUTTRIDGE
EXT. ICE CREAM STAND - DAY
(Barry Guttridge, an overweight, unkempt professor of logic and socialist writer, is out on a date with a woman. She is sincerely trying to engage him in conversation about his philosophical views, but Barry's mind is singularly focused on his obsession with food.)
[BLOCK PROFESSOR GUTTRIDGE left]
[BLOCK WOMAN right]
WOMAN (smiling): So, Barry, I've been really interested in your essays on socialist ethics. How do you see the role of logic in shaping ethical principles?
PROFESSOR GUTTRIDGE (eyes glazing over, almost drooling): Mmm, logic, yeah... but you know what's really logical? (licks lips) Chocolate fudge. Oh, the way it just melts, creamy and sweet on your tongue... mmm.
PROFESSOR GUTTRIDGE: Have you ever had the fudge from Maple Street? It's like... (pauses, shudders with pleasure) It's like nothing else matters. Not logic, not ethics... just that rich, gooey choccy fudge.
WOMAN (trying to steer the conversation back): That sounds delicious, but I'm curious - how do you apply that logical mindset to your work in socialist theory?
PROFESSOR GUTTRIDGE (interrupting, a little too loud): Oh, crisps! Crispy, salty... mmm. (begins to smack his lips) Did you know the secret to the perfect crisp? It's all in the salt, you see. Mmm, just thinking about it makes my mouth water. It's like... it's like a dance on your tongue.
(He mimes eating crisps, eyes half-closed in ecstasy. They arrive at the ice cream stand, and Barry's eyes immediately widen as he sees the long line. His cheerful demeanor darkens as he stares at the queue, fidgeting with growing impatience.)
PROFESSOR GUTTRIDGE (muttering under his breath): What the...? This is ridiculous! I've been dreaming about this for days, and now... now I have to wait?
PROFESSOR GUTTRIDGE (his voice rising, more frantic): All these people - what do they know about ice cream? I bet they just decided to come here on a whim! It's not fair!
WOMAN (softly, trying to calm him): It's just a line, Barry. We'll get there soon enough. Maybe we can talk while we wait?
PROFESSOR GUTTRIDGE (ignoring her, his agitation growing): Do you think any of them really appreciate good ice cream? I bet they don't even know the first thing about it. (condescending) I bet they don't even know that ice cream was first invented in China. Pathetic, really...
PROFESSOR GUTTRIDGE (suddenly, to her, more intense): Who do you think here could even come close to understanding that? Who here has any clue what real indulgence is?
WOMAN (hesitant, trying again): What do you usually do in your spare time, Barry? Any hobbies?
PROFESSOR GUTTRIDGE (ignoring her, fixating on the menu): Butter... mmm... why don't they have butter? How can they call themselves an ice cream stand and not offer butter?
PROFESSOR GUTTRIDGE (grinning): But wait... cheeseburgers. They've got cheeseburgers. Mmm, juicy cheeseburgers... (he visibly shudders) I might get two. (pauses, thinking) Maybe... three. I'm already worried I won't feel full enough after we eat... what if I'm still hungry later?
(As they inch closer to the front of the line, Barry's irritation mounts, his eyes darting around as his agitation boils over. He begins to grumble louder, his face reddening with frustration.)
PROFESSOR GUTTRIDGE (grumbling, barely coherent): It's so unfair... I've been waiting for this... mmm... and now... this! (he bites his lip in fury, glaring at the man in front of him) I'm about to do something I should have done a long time ago!
(Without warning, Barry aggressively shoves the man in front of him, his face contorted with rage. As soon as he does, he whirls around and aggressively shoves his date, biting his lip harder as she stumbles backward and falls to the ground.)
[GASP]
(The crowd gasps in shock as the man he shoved spins back around and punches Barry, sending him crashing to the ground. Barry's expression shifts from shock to an exaggerated display of distress.)
[SFX smash]
PROFESSOR GUTTRIDGE (shrieking, his voice high-pitched and trembling): ASSAULT! ASSAULT! Help me! Someone help!
(Barry, now on the ground, begins to visibly wet himself, his face a mixture of humiliation and panic. The onlookers, instead of rushing to his aid, begin to murmur and shout, their voices growing louder and more threatening.)
CROWD MEMBER 1: Stomp on his head!
CROWD MEMBER 2: Yeah, teach him a lesson!
CROWD MEMBER 3: Set that fucking dog on him!
(The camera shifts to reveal a snarling pitbull on a leash, its owner loosening his grip. The dog is freed, and the scene ends with the sound of teeth gnashing and Barry's terrified screams, as the crowd cheers and laughs.)
[CHEERING]
[FADE]
`,
);

export const KREWS3_EPISODES: TVEpisode[] = [
  KREWS_CHOMSKY_SHARKS,
  KREWS_CHOMSKY_BRAIN,
  KREWS_CHOMSKY_WEBSITE,
  KREWS_CARTER,
  KREWS_SPOONS_CABINET,
  KREWS_KRENSHAW,
  KREWS_CRASH_MODE,
  KREWS_FIFA_AUDIENCE,
  KREWS_ROBOREF,
  DRAMA_CHOMWORLD,
  DRAMA_PRESIDENT_HAN,
  DRAMA_ZERO_YEARS,
  DRAMA_SPECIAL_PARTS,
  DRAMA_DICKINSON,
  SKETCH_HEAVY_TRUTH,
  SKETCH_ICE_CREAM,
];
