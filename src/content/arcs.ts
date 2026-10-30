import type { Line, PlayableId } from "../data/types";
import { dir, say } from "./dsl";

// Character arcs: extra side-quest chains for specific playable characters.
// Steps happen at hub locations, in order. Every antagonist here is fictional.

export type ArcStepKind =
  | { kind: "dialogue"; lines: Line[] }
  | { kind: "quiz"; intro: Line[]; questions: { q: string; options: string[]; correct: number; wrong: string }[]; need: number; success: Line[]; fail: Line[] }
  | { kind: "arena"; intro: Line[]; dungeon: string }
  | { kind: "minigame"; intro: Line[]; mode: string; success: Line[]; fail: Line[] }
  | { kind: "vignette"; intro: Line[]; id: string }
  | { kind: "pay"; intro: Line[]; cost: number; success: Line[] }
  /** Pick up glowing items around Krelford. Not tied to a building (use at: "FIELD"). */
  | { kind: "collect"; label: string; spots: { x: number; y: number; name: string }[]; pickup: Line[]; guard?: "playground" };

export interface ArcStep {
  id: string;
  text: string;
  at: string;
  step: ArcStepKind;
}

export interface Arc {
  id: string;
  /** Whose story it is. "ALL" = a shared side quest anyone can do. */
  player: PlayableId | "ALL";
  /** Earliest chapter it appears in (default 1). */
  minChapter?: number;
  title: string;
  blurb: string;
  steps: ArcStep[];
  reward: { coins: number; desc: string };
}

export const ARCS: Arc[] = [
  {
    id: "arc_flenky",
    player: "FLENKY",
    title: "The Gentko Trilogy",
    blurb: "Win over Mollor. Become a clinical psychologist to fully understand the female mind. Beat Russell Brand at BJJ.",
    reward: { coins: 400, desc: "Permanent +10% damage (BJJ confidence)." },
    steps: [
      {
        id: "mollor",
        text: "Find Mollor, a philosophy student, at Krelford University. Impress her.",
        at: "UNIVERSITY",
        step: {
          kind: "quiz",
          need: 3,
          intro: [
            dir("Krelford University, the quad. Mollor, 19, philosophy major, is reading Nietzsche on a bench. She has a tote bag that says 'GOD IS DEAD (AND SO IS MY PHONE)'."),
            say("MOLLOR", "Can I help you?"),
            say("FLENKY", "Let's all be honest lads. I mean. Let's all be honest, Mollor."),
            say("MOLLOR", "…go on then. Impress me."),
          ],
          questions: [
            { q: "MOLLOR: 'What do you think Nietzsche meant by the Übermensch?'", options: ["A man who overcomes himself and creates his own values", "A German sandwich", "Me. Blue belt."], correct: 0, wrong: "MOLLOR: That's… no." },
            { q: "MOLLOR: 'Kierkegaard or Camus?'", options: ["Krezkegaard", "Camus. One must imagine Sisyphus happy.", "Whichever one Drongus hasn't made an AI song about"], correct: 1, wrong: "MOLLOR: Did you just make that up?" },
            { q: "MOLLOR: 'What's the meaning of life, then?'", options: ["Getting a couple pints down you", "Lore. Making it. Reacting to it. That's all any of us have.", "Wonking it 'til you krez"], correct: 1, wrong: "MOLLOR: Wow. Okay. That's a choice." },
            { q: "MOLLOR: 'Why do you keep getting banned from your group chat?'", options: ["I can't help it", "Because the corridor is the only place a man can truly think", "Parents still together"], correct: 1, wrong: "MOLLOR: That's actually quite sad." },
          ],
          success: [
            say("MOLLOR", "…the corridor is the only place a man can truly think. That's actually beautiful."),
            say("MOLLOR", "Fine. Krezz Arms. Thursday. Don't be weird."),
            say("FLENKY", "Today's the day!!!"),
            dir("The narrator, out of respect, stops narrating here."),
          ],
          fail: [say("MOLLOR", "I'm going to go and read in a different quad."), dir("Mollor leaves. Try again: she comes back every time. This is Krelworld.")],
        },
      },
      {
        id: "psych",
        text: "Become a clinical psychologist (to fully understand the female mind). Sit the exam at the University.",
        at: "UNIVERSITY",
        step: {
          kind: "quiz",
          need: 4,
          intro: [
            dir("Krelford University, Department of Psychology. The exam hall. You are the only candidate. The examiner is Proctus Krelmor. He is also, apparently, a psychologist."),
            say("PROCTUS", "Doctorate in Clinical Psychology. Five questions. Get four right. Then you'll fully understand the female mind. That's what the leaflet says."),
          ],
          questions: [
            { q: "Q1. The DSM is:", options: ["A Pokédex for disorders", "The Diagnostic and Statistical Manual of Mental Disorders", "A Krelworld nightclub"], correct: 1, wrong: "PROCTUS: Close. Not close." },
            { q: "Q2. A patient says 'whatever, I don't care, no big deal, what the fuck ever'. They:", options: ["Don't care", "Care enormously", "Are Gronny"], correct: 1, wrong: "PROCTUS: They care. They always care." },
            { q: "Q3. CBT stands for:", options: ["Cognitive Behavioural Therapy", "Crobley Butter Therapy", "Can't Be Talked-to"], correct: 0, wrong: "PROCTUS: I did a six-week CBT course on responsible krezzing. It's the first one." },
            { q: "Q4. To fully understand the female mind, a clinician must:", options: ["Ask, then listen", "Do a ninja backflip", "Read the female mind wiki page (it will be updated at some point)"], correct: 0, wrong: "PROCTUS: Hmm. The leaflet disagrees." },
            { q: "Q5. Projection is:", options: ["When you attribute your own feelings to someone else", "What the Wiki Citadel does in the sky", "Drongus's whole thing"], correct: 0, wrong: "PROCTUS: Partial marks. Drongus's whole thing is also correct, unofficially." },
          ],
          success: [
            say("PROCTUS", "Congratulations, Doctor Jenky. You now fully understand the female mind."),
            say("FLENKY", "…I don't, though."),
            say("PROCTUS", "That's the first thing they teach you. Well done. Here's a lanyard."),
          ],
          fail: [say("PROCTUS", "You've failed. Don't worry, so did I. Twice. Resit any time.")],
        },
      },
      {
        id: "brand",
        text: "Beat Russell Brand in a BJJ match (University Sports Hall).",
        at: "UNIVERSITY",
        step: { kind: "arena", dungeon: "arena_brand", intro: [dir("A poster on the sports hall door: 'BJJ OPEN — SPECIAL GUEST: RUSSELL BRAND (he asked to be here)'.")] },
      },
    ],
  },
  {
    id: "arc_krezmar",
    player: "KREZMAR",
    title: "Blues Night",
    blurb: "A bald cave troll with a Les Paul has taken over blues night at the Krezz Arms. He holds a grudge about a fizzy bongo. Headbutt him to death.",
    reward: { coins: 350, desc: "Vending machines are free for you forever (the barman is grateful)." },
    steps: [
      {
        id: "rumour",
        text: "Hear about the troll at the Booth (the Fair).",
        at: "BOOTH",
        step: {
          kind: "dialogue",
          lines: [
            dir("The fairground man running the Frustration Booth leans in."),
            say("FAIRGROUND MAN", "You're Krezmar? There's a troll asking for you. Cave troll. Bald. Plays a Les Paul. Blues band, back room of the Krezz Arms, Thursdays."),
            say("FAIRGROUND MAN", "Says you owe him a fizzy bongo from 2023. Says the blues don't forget."),
            say("KREZMAR", "I'm going to need a krambulance. For him."),
          ],
        },
      },
      {
        id: "troll",
        text: "Go to blues night at the Krezz Arms. Headbutt the troll.",
        at: "PUB",
        step: { kind: "arena", dungeon: "arena_troll", intro: [dir("A twelve-bar blues shuffle is coming through the back-room door. It's very, very loud.")] },
      },
    ],
  },
  {
    id: "arc_gronny",
    player: "GRONNY",
    title: "The Carpet",
    blurb: "Your ex-flatmate, Carpet Kev, moved out, ripped you off and destroyed the carpet. Find him. End him (cartoonishly).",
    reward: { coins: 380, desc: "+20 max HP (closure)." },
    steps: [
      {
        id: "flat",
        text: "Search the Old Flat for clues.",
        at: "OLD_FLAT",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Old Flat. The carpet looks like it lost a war. On the kitchen counter: a note."),
            dir("'GRONNY — moved out. Will sort the rent next week. The carpet was like that. — KEV'"),
            dir("The carpet was not like that. You remember the carpet. You loved the carpet."),
            say("GRONNY", "Fair enough."),
            say("GRONNY", "…no. Not fair enough. Not this time."),
            dir("A forwarding address is scrawled on the back of a takeaway menu: 'THE OLD FLAT — I'M STILL HERE, IN THE CUPBOARD, DON'T LOOK'."),
          ],
        },
      },
      {
        id: "kev",
        text: "Return to the Old Flat and confront Carpet Kev.",
        at: "OLD_FLAT",
        step: { kind: "arena", dungeon: "arena_flatmate", intro: [dir("You open the cupboard.")] },
      },
    ],
  },
  {
    id: "arc_crongus",
    player: "CRONGUS",
    title: "Bread and Butter Pudding",
    blurb: "Whispers in Krelford about 'bread and butter pudding'. Nobody will say what it is. Find it.",
    reward: { coins: 300, desc: "+15% speed. You don't want to talk about why." },
    steps: [
      {
        id: "whisper",
        text: "Ask at the Booth about 'bread and butter pudding'.",
        at: "BOOTH",
        step: {
          kind: "dialogue",
          lines: [
            say("CRONGUS", "Mate. Bread and butter pudding. Have you heard of it?"),
            dir("The fairground man goes very still."),
            say("FAIRGROUND MAN", "Where did you hear that."),
            say("CRONGUS", "Around."),
            say("FAIRGROUND MAN", "Listen to me. Bread and butter pudding is not a dessert. It's not anything. You go in a dessert man and you come out… something else."),
            say("FAIRGROUND MAN", "They say it's the ultimate sensation. They say you can never come back from it."),
            say("CRONGUS", "Where is it?"),
            say("FAIRGROUND MAN", "…the abandoned building. South of town. God help you."),
          ],
        },
      },
      {
        id: "pudding",
        text: "Find the bread and butter pudding (the Abandoned Building, south of town).",
        at: "ABANDONED",
        step: { kind: "vignette", id: "pudding", intro: [dir("The Abandoned Building. Boarded windows. A faint smell of custard. And something underneath the custard.")] },
      },
      {
        id: "secret",
        text: "Keep your new habit secret. Kreblis is asking questions (Town Hall).",
        at: "TOWN_HALL",
        step: {
          kind: "quiz",
          need: 3,
          intro: [say("KREBLIS", "Lulon. Strange occurrence. Someone saw you leaving the abandoned building. You were walking like a man who's seen God and didn't like it.")],
          questions: [
            { q: "KREBLIS: 'What were you doing in there?'", options: ["Children's Minister business. Inspection.", "BREAD AND BUTTER PUDDING", "Mmmmmm"], correct: 0, wrong: "KREBLIS: …what?" },
            { q: "KREBLIS: 'Why are you sweating custard?'", options: ["Hot day", "It's a skin condition. Very common. Lots of ministers have it.", "Because I can never come back"], correct: 1, wrong: "KREBLIS: Strange occurrence. Very strange occurrence." },
            { q: "KREBLIS: 'Have you ever heard of bread and butter pudding?'", options: ["No", "Is that a dessert?", "*long silence*"], correct: 1, wrong: "KREBLIS: That's not an answer, Lulon." },
          ],
          success: [say("KREBLIS", "Right. Fine. Filed under nothing."), dir("He believes you. For now. You are, from this day, a man with a secret. Every time someone says 'pudding' in the group chat, your soul leaves your body slightly.")],
          fail: [say("KREBLIS", "I'm filing this. I'm filing it under STRANGE."), dir("He doesn't know. Not yet. Try again: compose yourself.")],
        },
      },
    ],
  },
  {
    id: "arc_krezwonk",
    player: "KREZWONK",
    title: "Mass Gainer",
    blurb: "Get on HGH. Beat your deadlift record. Juggle three girlfriends without any of them finding out. Then deal with your rival, Brick Kolbane.",
    reward: { coins: 420, desc: "+15 max HP and +8% damage (the gains are real)." },
    steps: [
      {
        id: "hgh",
        text: "Buy HGH at Krunch Gym (150 Krezzcoin, no questions asked).",
        at: "GYM",
        step: {
          kind: "pay",
          cost: 150,
          intro: [dir("Krunch Gym. A man in a stringer vest is selling 'vitamins' out of a gym bag behind the leg press."), say("GYM DEALER", "Human growth hormone. Pharmaceutical grade. Probably. 150 Krezzcoin."), say("KREZWONK", "The idea of Krezwonk is more important than the man. But the man needs to pull 300.")],
          success: [dir("You are now on HGH. Your jaw feels like it's thinking about growing."), say("KREZWONK", "I have foreseen gains.")],
        },
      },
      {
        id: "deadlift",
        text: "Beat your deadlift record (Krunch Gym).",
        at: "GYM",
        step: { kind: "minigame", mode: "deadlift", intro: [say("KREZWONK", "Record is 280. Today I pull 300. It is prophesied.")], success: [say("KREZWONK", "300. New record. So what can we say…")], fail: [say("KREZWONK", "The prophecy was early. Again.")] },
      },
      {
        id: "girlfriends",
        text: "Juggle your three girlfriends' messages without any of them finding out (Krunch Gym changing room).",
        at: "GYM",
        step: {
          kind: "minigame",
          mode: "girlfriends",
          intro: [dir("Three phones. Krelissa, Krezabeth and Kaylor. None of them know about each other. All of them are texting. Reply to each phone before it goes cold, and never send a message to the wrong phone.")],
          success: [say("KREZWONK", "I have three girlfriends and none of them know. I lurk in three relationships simultaneously."), dir("Somewhere, the idea of Krezwonk grows stronger than the man.")],
          fail: [dir("WRONG PHONE. Krelissa has seen a message meant for Krezabeth. You throw all three phones in the Tap and start again.")],
        },
      },
      {
        id: "rival",
        text: "Settle things with Brick Kolbane (Krunch Gym).",
        at: "GYM",
        step: { kind: "arena", dungeon: "arena_rival", intro: [say("BRICK KOLBANE", "(from the squat rack, where he is doing curls) Oi. Lurker. You think you're big now?")] },
      },
    ],
  },
  {
    id: "arc_scrombus",
    player: "SCROMBUS",
    title: "Flip It and Rule",
    blurb: "Buy the fixer-upper. Renovate it. Flip it for millions. Use the money to replace Drongus as ruler of Krelworld.",
    reward: { coins: 600, desc: "At the end of the game, the coup goes ahead." },
    steps: [
      {
        id: "buy",
        text: "Buy the fixer-upper on the east side (200 Krezzcoin deposit).",
        at: "FIXER_UPPER",
        step: {
          kind: "pay",
          cost: 200,
          intro: [dir("A crumbling terrace with a 'FOR SALE (AS SEEN)' sign. The estate agent is Proctus."), say("PROCTUS", "Two bed, one bath, one hole. The hole is a feature."), say("SCROMBUS", "I'll take it. Basically we need a property portfolio.")],
          success: [say("PROCTUS", "Sold! I've never sold anything. Is this what joy is?")],
        },
      },
      {
        id: "renovate",
        text: "Renovate the fixer-upper (fix 25 things before the timer).",
        at: "FIXER_UPPER",
        step: { kind: "minigame", mode: "renovate", intro: [say("SCROMBUS", "Damp, holes, a carpet someone clearly destroyed, and a fridge with cheese in it from 2022. Let's go.")], success: [say("SCROMBUS", "Stunning. High end lore. High end property.")], fail: [say("SCROMBUS", "The damp won. I'll go again.")] },
      },
      {
        id: "sell",
        text: "Sell the house at the Central Bank.",
        at: "BANK",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Central Bank's property desk. The valuation comes back."),
            dir("4.8 MILLION KREZZCOIN."),
            say("SCROMBUS", "4.8 million. That's the exact amount we needed for the Extra Virgin Krezz oil ransom. The universe is sending me coded messages."),
            say("SCROMBUS", "With this kind of money, a man could buy influence. Ministers. An army. A podium."),
            say("SCROMBUS", "Basically we need a new leader."),
            dir("COUP PREPARED. It will go ahead at the end of the game."),
          ],
        },
      },
    ],
  },
  {
    id: "arc_kreblis",
    player: "KREBLIS",
    title: "The Ascension of Kreblis",
    blurb: "Keep the gear coming. Become the greatest RuneScape player who ever lived. Attain eternal life through HIIT. Troll Facebook.",
    reward: { coins: 450, desc: "+25 max HP (eternal life, pending verification)." },
    steps: [
      {
        id: "gear",
        text: "Source some 'gear' from the man in the Krezz Arms toilets (120 Krezzcoin).",
        at: "PUB",
        step: {
          kind: "pay",
          cost: 120,
          intro: [
            say("KREBLIS", "Feel a bit manic… better get some gear in!"),
            dir("The Krezz Arms gents. Third cubicle. A man called Gary is sitting on the closed lid like it's an office."),
            say("GARY", "Alright Kreblis. The usual? For the… RuneScape?"),
            say("KREBLIS", "Hmmmm… gear… 😋"),
          ],
          success: [say("GARY", "Lovely. Don't tell Drongus where you got it. Actually do, he's a regular."), dir("You now have 'gear'. Your jaw has started doing something on its own.")],
        },
      },
      {
        id: "runescape",
        text: "Get 99 Woodcutting. Become the greatest RuneScape player ever (keep the gear coming).",
        at: "HOME",
        step: {
          kind: "minigame",
          mode: "runescape",
          intro: [say("KREBLIS", "You're making me angry… angry enough to play RuneScape!"), say("KREBLIS", "RuneScape servers playing up again… doesn't matter. Tonight I get 99.")],
          success: [say("KREBLIS", "Rank 1. Overall. Of all time. Jagex have sent a cake."), say("KREBLIS", "Bro the RuneScape anthem should be the national anthem if you get me.")],
          fail: [say("KREBLIS", "Ran out of gear at level 80-something. Unacceptable. Again.")],
        },
      },
      {
        id: "burpees",
        text: "Attain eternal life: finish the HIIT burpee EMOM at Krunch Gym.",
        at: "GYM",
        step: {
          kind: "minigame",
          mode: "burpees",
          intro: [
            say("KREBLIS", "The theory is simple. If I'm fit enough, I can't die. Basically eternal life."),
            say("KREBLIS", "Round 1: chest to floor burpees. Lmfao. Then squat jumps. Then more burpees."),
          ],
          success: [say("KREBLIS", "I am now immortal. Probably. I'll know for sure in about eighty years."), dir("ETERNAL LIFE: ATTAINED (pending verification).")],
          fail: [say("KREBLIS", "The hardest is the burpees. I'll go again. Death can wait.")],
        },
      },
      {
        id: "facebook",
        text: "Troll Facebook from the laptop at home. Make Krelford furious.",
        at: "HOME",
        step: {
          kind: "minigame",
          mode: "facebook",
          intro: [say("KREBLIS", "It's such a good group for trolling."), say("KREBLIS", "Most people are shit at trolling. It's an art. Bad spelling, total sincerity, never break.")],
          success: [say("KREBLIS", "Four hundred angry reacts and someone's mum has called the police. Wot a nite."), dir("Kreblis is now the most hated man on Krelford Community Noticeboard. He has never been happier.")],
          fail: [say("KREBLIS", "Got reported. Too obvious. The trick is to make them think you mean it.")],
        },
      },
    ],
  },
  {
    id: "arc_cronster",
    player: "ALL",
    minChapter: 2,
    title: "The Cuddle Cronster",
    blurb: "Krelford is in the icy grip of terror. Find the Cuddle Cronster before he strikes again.",
    reward: { coins: 300, desc: "+15 max HP. Also, a lifetime supply of evidence (chocolate)." },
    steps: [
      {
        id: "gazette",
        text: "Read this morning's Krelford Gazette (at home).",
        at: "HOME",
        step: {
          kind: "dialogue",
          lines: [
            dir("THE KRELFORD GAZETTE. Front page: TERROR GRIPS KRELFORD AS THE 'CUDDLE CRONSTER' STRIKES AGAIN."),
            dir("Krelford is once again in the icy grip of terror as the elusive criminal known only as the 'Cuddle Cronster' continues his reign of bizarre and unsettling crimes."),
            dir("The latest victim, identified only as a local woman from the outskirts of town, discovered a cryptic note in her home. Written in disturbingly cheery handwriting, it read:"),
            dir("'I'll cuddle you, squeeze you, and extract all your lovely juices'"),
            dir("The note was signed with an unsettlingly cheerful smiley face and accompanied by one of the Cronster's infamous edible 'cuddle tokens' – intricate chocolate coins that bear his terrifying motto: 'Sweet hugs, sweeter squeezes.'"),
            dir("Police will hold a press conference today at Krelford Constabulary."),
            dir("You put the paper down. You'd better go."),
          ],
        },
      },
      {
        id: "presser",
        text: "Attend the police press conference at Krelford Constabulary.",
        at: "POLICE",
        step: { kind: "vignette", id: "press_conference", intro: [dir("Krelford Constabulary. The press room is packed. Sergeant Grimbolus Swig, lead investigator, approaches the podium holding a small bag of chocolate coins.")] },
      },
      {
        id: "tokens",
        text: "Find the Cronster's six chocolate cuddle tokens around Krelford (the trail to his lair).",
        at: "FIELD",
        step: {
          kind: "collect",
          label: "Cuddle token",
          pickup: [dir("A chocolate cuddle token. 'Sweet hugs, sweeter squeezes.' It smells incredible. You do not eat it. You think about eating it.")],
          spots: [
            { x: 480, y: 1050, name: "dark choccy" },
            { x: 1560, y: 980, name: "mint choccy" },
            { x: 2200, y: 1050, name: "caramel choccy" },
            { x: 420, y: 1440, name: "ruby choccy" },
            { x: 1900, y: 1620, name: "white choccy" },
            { x: 2480, y: 470, name: "orange choccy (rare)" },
          ],
        },
      },
      {
        id: "handin",
        text: "Hand the tokens in to Sergeant Swig.",
        at: "POLICE",
        step: {
          kind: "dialogue",
          lines: [
            say("SERGEANT SWIG", "You found them. All six. Dark, mint, caramel, ruby… even the orange."),
            dir("He eats all six, in one go, while maintaining eye contact."),
            say("SERGEANT SWIG", "Evidence secured."),
            say("DR. GRUNGUS FLORP", "(from the corner) The Cuddle Cronster is a master manipulator. By combining his grotesque threats with sweet, irresistible treats, he's playing a twisted game with the authorities. And clearly, it's working."),
            dir("The wrappers have a factory stamp. The Cronster's lair is behind the chocolate factory. Sergeant Swig is 'too full' to come."),
          ],
        },
      },
      {
        id: "lair",
        text: "Raid the Cronster's lair (Krelford Constabulary will drive you).",
        at: "POLICE",
        step: { kind: "arena", dungeon: "arena_cronster", intro: [say("SERGEANT SWIG", "Bring back any tokens you find. For evidence. Obviously.")] },
      },
    ],
  },
  {
    id: "arc_polson_fit",
    player: "ALL",
    minChapter: 3,
    title: "Polson Gets Fit",
    blurb: "Polson has asked you to take him to the gym for 'an intense workout'.",
    reward: { coins: 200, desc: "Polson's gym membership, which you are paying for." },
    steps: [
      {
        id: "gym",
        text: "Pick Polson up from Polson Towers and take him to the gym for 'an intense workout'.",
        at: "POLSON_ROAD",
        step: { kind: "vignette", id: "polson_gym", intro: [say("POLSON", "Right. Gym. Intense workout. Today's the day."), say("EDEN", "(from upstairs) Take a water bottle."), say("POLSON", "Mork.")] },
      },
      {
        id: "cctv",
        text: "Polson says he's at the gym. Check the FGM War Room surveillance feed (under the Archive).",
        at: "ARCHIVE",
        step: { kind: "vignette", id: "polson_cctv", intro: [dir("A message from Polson: 'At the gym again 💪 might be a while'."), dir("Mikey's FGM War Room has a camera on everything. You pull up the Polson Towers feed. Just to check.")] },
      },
    ],
  },
  {
    id: "arc_boggor",
    player: "ALL",
    minChapter: 2,
    title: "Supple Structures",
    blurb: "Boggor Cranstil, the hunched old man in the dark house by the playground, wants photographs of the playground equipment.",
    reward: { coins: 250, desc: "A signed copy of 'Supple Structures: A Photographic Journey' by B. Cranstil. It's mostly slides." },
    steps: [
      {
        id: "meet",
        text: "Visit Boggor Cranstil's dark house by the playground.",
        at: "BOGGOR_HOUSE",
        step: {
          kind: "dialogue",
          lines: [
            dir("A dark house. Curtains drawn. The door opens before you knock. A hunched old man in a stained cardigan is already standing there. He has been standing there for some time."),
            say("BOGGOR CRANSTIL", "Ahh. A visitor. Come in, come in. Mind the gnome. He bites. Heh heh heh."),
            say("BOGGOR CRANSTIL", "I'm Boggor. Boggor Cranstil. I've lived next to that playground for forty-one years. Forty-one years of watching it."),
            say("BOGGOR CRANSTIL", "The slide. The climbing frame. The swings. Oh, the swings. I love the supple structures. The way they bend in the sun. The galvanised steel. The give in the rubber matting."),
            dir("You: …the equipment?"),
            say("BOGGOR CRANSTIL", "The equipment, yes. What else? Heh heh heh."),
            say("BOGGOR CRANSTIL", "I'm making a book of photographs. 'Supple Structures'. But every time I go near with my camera, the little ones start screaming. Terrible lungs on them."),
            say("BOGGOR CRANSTIL", "You take the pictures for ol' Boggor. Three photographs. The swings, the slide, the climbing frame. No children in them. They ruin the lines."),
            say("BOGGOR CRANSTIL", "Here. Sweeties. Throw them in and the little horrors go after them like pigeons. Then snap snap snap. Heh heh heh.", { set: { boggor_candy: 5 } }),
            dir("You receive: Boggor's camera. You receive: 5 sweeties (they are slightly warm). Throw sweeties into the playground to distract the kids, then photograph the equipment while they're busy. Get too close without distracting them and they WILL scream."),
          ],
        },
      },
      {
        id: "photos",
        text: "Photograph the swings, the slide and the climbing frame. Distract the kids with sweeties first.",
        at: "FIELD",
        step: {
          kind: "collect",
          label: "Photograph",
          guard: "playground",
          pickup: [dir("*click* A beautiful shot. Not a child in frame. The galvanised steel glistens. Boggor will weep.")],
          spots: [
            { x: 190, y: 580, name: "the swings" },
            { x: 300, y: 530, name: "the slide" },
            { x: 410, y: 580, name: "the climbing frame" },
          ],
        },
      },
      {
        id: "handin",
        text: "Bring the photographs back to Boggor Cranstil.",
        at: "BOGGOR_HOUSE",
        step: {
          kind: "dialogue",
          lines: [
            dir("You hand over the photographs. Boggor holds them very close to his glasses. He breathes through his mouth."),
            say("BOGGOR CRANSTIL", "Oh lovely… lovely jubbly indeed."),
            say("BOGGOR CRANSTIL", "Look at the camber on that slide. Look at the tension in those swing chains. Supple. So supple."),
            say("BOGGOR CRANSTIL", "You've done ol' Boggor a great kindness. Here. For your trouble. And a signed copy. Heh heh heh."),
            dir("Boggor closes the door. Behind it, faintly, you hear him whisper 'galvanised' to himself several times."),
          ],
        },
      },
    ],
  },
  {
    id: "arc_benn",
    player: "BENN",
    title: "Reprieve",
    blurb: "One last gig with Twitcher Mutiny. Then find the symbol of Wahoogah, and go home.",
    reward: { coins: 300, desc: "Benn goes home to Wahooga. Someone else carries on, with his Krezzcoin and his rockstar points." },
    steps: [
      {
        id: "booked",
        text: "Twitcher Mutiny are booked at the Krezz Arms. Get down there.",
        at: "PUB",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Krezz Arms back room. A stage made of four pallets. A banner, hand-painted, slightly wrong: 'TWICHER MUTINY'."),
            say("BENN", "I'm already regretting signing on to this gig."),
            say("BENN", "If I can help it, I'll be with you lot and skull deep before the night is out."),
            say("KREZMAR", "Is this the one where you play the sad sea song?"),
            say("BENN", "It's called Reprieve. And it's not sad. It's a reprieve. It's in the name."),
            say("GRONNY", "Fair enough."),
            dir("Everyone is here. Even Drongus has sent a message saying he is 'watching via livestream', which does not exist."),
          ],
        },
      },
      {
        id: "gig",
        text: "Play the gig. Be a rockstar. Catch what the crowd throws.",
        at: "PUB",
        step: {
          kind: "minigame",
          mode: "gig",
          intro: [say("BENN", "One, two, three, four…"), dir("Move left and right across the stage. Tap / SPACE to prance. Catch the bras and thongs. Prancing while you catch them is worth double.")],
          success: [say("BENN", "Thank you Krelford. You've been a strange and moist crowd."), dir("Somewhere in the crowd, Polson is crying. He says it's the smoke machine. There is no smoke machine.")],
          fail: [say("BENN", "Bit of a quiet one. Wahooga crowds are louder. Again?")],
        },
      },
      {
        id: "portal",
        text: "Something is calling you from the west edge of town. The symbol of Wahoogah.",
        at: "PORTAL",
        step: { kind: "vignette", id: "wahooga", intro: [dir("At the very edge of Krelford, where the grass gives up, the air is folding. A symbol hangs in it. You've seen it before. On a call. Nobody asked what it was."), say("BENN", "The symbol of Wahoogah.")] },
      },
    ],
  },
];

export function arcFor(player: PlayableId): Arc | undefined {
  return ARCS.find((a) => a.player === player);
}

/** The player's own story first, then the shared ones. */
export function arcsFor(player: PlayableId): Arc[] {
  return [...ARCS.filter((a) => a.player === player), ...ARCS.filter((a) => a.player === "ALL")];
}
