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
  | { kind: "pay"; intro: Line[]; cost: number; success: Line[] };

export interface ArcStep {
  id: string;
  text: string;
  at: string;
  step: ArcStepKind;
}

export interface Arc {
  id: string;
  player: PlayableId;
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
];

export function arcFor(player: PlayableId): Arc | undefined {
  return ARCS.find((a) => a.player === player);
}
