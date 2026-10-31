import type { Line, PlayableId } from "../data/types";
import { canon, dir, ping, say } from "./dsl";

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
  /** Also needs this flag in its first chapter (from the next chapter on it's always open). */
  requires?: string;
  /** Shared quests only: hidden for this character (they have their own version). */
  notPlayer?: PlayableId;
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
    blurb: "Alistair Swamp, the ugliest man in Krelford, has taken over blues night at the Krezz Arms. He holds a grudge about a fizzy bongo. Headbutt him to death.",
    reward: { coins: 350, desc: "Vending machines are free for you forever (the barman is grateful)." },
    steps: [
      {
        id: "rumour",
        text: "Hear about Alistair Swamp at the Booth (the Fair).",
        at: "BOOTH",
        step: {
          kind: "dialogue",
          lines: [
            dir("The fairground man running the Frustration Booth leans in."),
            say("FAIRGROUND MAN", "You're Krezmar? There's a bloke asking for you. Alistair Swamp. Bald. Short dark beard. Ugliest man you'll ever see. Plays a Les Paul. Blues band, back room of the Krezz Arms, Thursdays."),
            say("FAIRGROUND MAN", "Says you owe him a fizzy bongo from 2023. Says the blues don't forget."),
            say("KREZMAR", "I'm going to need a krambulance. For him."),
          ],
        },
      },
      {
        id: "troll",
        text: "Go to blues night at the Krezz Arms. Headbutt Alistair Swamp.",
        at: "PUB",
        step: { kind: "arena", dungeon: "arena_troll", intro: [dir("A twelve-bar blues shuffle is coming through the back-room door. It's very, very loud.")] },
      },
    ],
  },
  {
    id: "arc_gronny",
    player: "GRONNY",
    title: "The Carpet",
    blurb: "Your ex-flatmate, Robbo, moved out, ripped you off and destroyed the carpet. Find him. End him (cartoonishly).",
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
            dir("'GRONNY — moved out. Will sort the rent next week. The carpet was like that. — ROBBO'"),
            dir("The carpet was not like that. You remember the carpet. You loved the carpet."),
            say("GRONNY", "Fair enough."),
            say("GRONNY", "…no. Not fair enough. Not this time."),
            dir("A forwarding address is scrawled on the back of a takeaway menu: 'THE OLD FLAT — I'M STILL HERE, IN THE CUPBOARD, DON'T LOOK'."),
          ],
        },
      },
      {
        id: "kev",
        text: "Return to the Old Flat and confront Robbo.",
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
      {
        id: "raid",
        text: "Somebody followed you to the abandoned building. It's in the papers. The police want a word (Krelford Constabulary).",
        at: "POLICE",
        step: { kind: "vignette", id: "pudding_raid", intro: [dir("Your phone has 214 notifications. The top one is a link to the Krelford Gazette. You do not click it. You don't need to.")] },
      },
    ],
  },
  {
    id: "arc_krezwonk",
    player: "KREZWONK",
    title: "Mass Gainer",
    blurb: "Get on HGH. Beat your deadlift record. Juggle three girlfriends without any of them finding out. Then deal with your rival, Chad Deltoid.",
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
        text: "Settle things with Chad Deltoid (Krunch Gym).",
        at: "GYM",
        step: { kind: "arena", dungeon: "arena_rival", intro: [say("CHAD DELTOID", "(from the squat rack, where he is doing curls) Oi. Lurker. You think you're big now?")] },
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
    id: "arc_kreblis_news",
    player: "KREBLIS",
    minChapter: 2,
    title: "Krunche News",
    blurb: "Settle a ten-year grudge, launch a business that can't lose, then found Krelford's most inaccurate news outlet.",
    reward: { coins: 350, desc: "Krunche News is live. It is wrong about everything. Circulation: Drongus." },
    steps: [
      {
        id: "final_flash",
        text: "Kreblis has been waiting years for an apology from Drongus. Take it to the Town Hall.",
        at: "TOWN_HALL",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Town Hall. Kreblis has brought a folder. It is labelled 'FINAL FLASH: THE EVIDENCE'."),
            say("KREBLIS", "Remember when you kept Final Flashing me on that DBZ game I had?"),
            say("DRONGUS", "(ping) That was years ago."),
            say("KREBLIS", "I've been waiting ten years for an apology."),
            say("KREBLIS", "Just apologise and admit I won."),
            say("KREBLIS", "Gronny was there. He can verify it was unfair."),
            say("GRONNY", "Fair enough."),
            say("KREBLIS", "And give me Lyra's World back."),
            say("DRONGUS", "(ping) I don't know what Lyra's World is."),
            say("KREBLIS", "Scars. That no-one can see."),
            dir("Drongus does not apologise. Kreblis files the folder under 'ONGOING'."),
          ],
        },
      },
      {
        id: "business",
        text: "Kreblis has a business plan. Put 50 Krezzcoin into it at the bank. It can't lose.",
        at: "BANK",
        step: {
          kind: "pay",
          cost: 50,
          intro: [
            say("KREBLIS", "It's not about the money. It's about rubbing it in smug self-assured faces."),
            say("KREBLIS", "Ok it's 20% about the money."),
            say("KREBLIS", "Let's put a big bet on. But only one that can't lose 👍"),
            say("KREBLIS", "Nevar 2 drunke 4 business."),
            say("KREBLIS", "My legit life goal is to run a crooked business."),
          ],
          success: [
            say("KREBLIS", "Tyme 2 start spendin are winins."),
            dir("The match has not started yet."),
            dir("Forty minutes later."),
            say("KREBLIS", "I don't have your money... I'm afraid I've lost it..."),
            say("KREBLIS", "It's all just paper money and numbers on the screen you know!"),
            say("KREBLIS", "Time 2 kwit wile we r ahed."),
            dir("You are not ahead. There is one rogue 50p left in the account. Kreblis says it's 'the seed'."),
          ],
        },
      },
      {
        id: "krunche_news",
        text: "Launch Krunche News from the Archive. Krelford deserves the truth. Roughly.",
        at: "ARCHIVE",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Archive. Kreblis has set up a desk, a mug and a sign that says KRUNCHE NEWS: INPEDENTANT JOURNALISM."),
            say("KREBLIS", "Headline news!"),
            say("KREBLIS", "Where's me fuckin Wall St Journal!!"),
            say("KREBLIS", "Have just seen that China invaded Kreddle? I think that's what they just said on the news anyway. Not sure. Not an expert."),
            say("KREBLIS", "Breaking: the Queen's dead."),
            say("ARCHIVE", "That was six days ago."),
            say("KREBLIS", "And you heard it here first."),
            say("KREBLIS", "Tonight's poll. Who should run Krelford? Option one: Drongus. Option two: a lizard. Option three: this rock."),
            dir("The rock wins by a landslide."),
            say("KREBLIS", "We were proved right yet again. Whatever we said would happen."),
            say("KREBLIS", "Philosophers for ages have said the Hartlepool by-election would show us the true meaning of the kranky kran protocol!!"),
            say("ARCHIVE", "Filed under: strange occurrences. And also under: wrong."),
          ],
        },
      },
    ],
  },
  {
    id: "arc_flenky_sigma",
    player: "FLENKY",
    minChapter: 2,
    title: "Flenky Jenky",
    blurb: "Become a sigma male (you don't buy into the archetypes). Reclaim the deadlift platform. Find Sam Adams on draught. Defend your top-lad status.",
    reward: { coins: 350, desc: "Top lad status: confirmed. Hearsay: dismissed. Too weird to live, too rare to die." },
    steps: [
      {
        id: "sigma",
        text: "Start the sigma morning routine at home.",
        at: "HOME",
        step: {
          kind: "dialogue",
          lines: [
            dir("6:00am. Flenky's bedroom. A cold shower is running. A whiteboard reads GYM. MEW. REPEAT."),
            say("FLENKY", "Sigma males are a more alpha version of alpha males 👍"),
            say("DRONGUS", "(ping) Flenky jenkins?"),
            say("FLENKY", "I don't mind being Flenky."),
            say("FLENKY", "To confirm. I don't buy into the archetypes."),
            say("FLENKY", "...I spelt sigma wrong."),
            say("FLENKY", "Bro. I created mewing."),
            dir("He holds his jaw in a position no jaw should be held in. For forty minutes."),
            say("FLENKY", "Focused. Moisturised. In my lane."),
          ],
        },
      },
      {
        id: "stacy",
        text: "Krunch Gym. 'Stacy' has set up a circuit on the only deadlift platform. Take it back.",
        at: "GYM",
        step: {
          kind: "minigame",
          mode: "deadlift",
          intro: [
            dir("Krunch Gym, peak time. On the only deadlift platform: a woman Flenky has named 'Stacy', running a twelve-station circuit with a kettlebell, a step and a resistance band tied to the rack."),
            say("FLENKY", "The gym at peak times is a real trigger for my anger."),
            say("FLENKY", "Inside I'm boiling with fury."),
            say("FLENKY", "She's going to see what the platform's for."),
          ],
          success: [say("FLENKY", "That's longer than Polson can hold a plank for."), dir("Stacy moves her circuit to the leg press. You've won. She doesn't know there was a war."), say("FLENKY", "Some you win and some you lose. I won that one.")],
          fail: [say("FLENKY", "DONT FUCKING FUNCTIONAL ME. IM LOSING IT."), dir("Stacy adds a thirteenth station.")],
        },
      },
      {
        id: "sam_adams",
        text: "The grail: Sam Adams, on draught, in Krelford. Search the town.",
        at: "FIELD",
        step: {
          kind: "collect",
          label: "Sam Adams lead",
          pickup: [say("FLENKY", "Sam Adams! On draught! In the UK!"), dir("It was a regular lager with a Sam Adams sticker on the pump. The hunt continues.")],
          spots: [
            { x: 560, y: 1010, name: "pub tap (fake)" },
            { x: 1520, y: 1060, name: "pub tap (fake)" },
            { x: 2160, y: 1010, name: "pub tap (fake)" },
            { x: 380, y: 1400, name: "pub tap (fake)" },
            { x: 1860, y: 1580, name: "THE REAL ONE" },
          ],
        },
      },
      {
        id: "the_shirt",
        text: "Krezwonk says you need a better shirt. Buy one at the bank's 'luxury concession' (40 Krezzcoin).",
        at: "BANK",
        step: {
          kind: "pay",
          cost: 40,
          intro: [say("KREZWONK", "Arket. Eton. Rick Owens. The idea of the shirt is more important than the shirt."), say("FLENKY", "Get a few beers down me I'll say anything!!!")],
          success: [
            say("FLENKY", "My suit man. Was SO expensive. I bet it cost more than your suit."),
            say("FLENKY", "I blew a load on a fucking shirt last night."),
            say("FLENKY", "Wait. Like money."),
            say("FLENKY", "To clarify. I did not."),
          ],
        },
      },
      {
        id: "top_lad",
        text: "There are whispers you've demoted yourself from top lad status. Answer them at the Town Hall.",
        at: "TOWN_HALL",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Town Hall. A tribunal has been convened. Drongus presides by ping."),
            say("DRONGUS", "(ping) Whispers amongst the lads that you have demoted yourself from top lad status."),
            say("FLENKY", "Woah. Hearsay."),
            say("FLENKY", "I'm the toppest. I'll fuckin burst ye."),
            say("KREBLIS", "Prove it."),
            say("FLENKY", "Do it. Go on. I live for these moments."),
            say("FLENKY", "Woah man. Big nasty they call me."),
            say("GRONNY", "Fair enough."),
            dir("Top lad status: upheld. The ruling is entered into the Archive under 'Flenky Jenky (is quite renky)'."),
            say("FLENKY", "Too weird to live. Too rare to die."),
          ],
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
    minChapter: 2,
    requires: "ch2_clear",
    title: "Polson Gets Fit",
    blurb: "Polson has asked you to take him to the gym for 'an intense workout'.",
    reward: { coins: 200, desc: "Polson's gym membership, which you are paying for." },
    steps: [
      {
        id: "gym",
        text: "Pick Polson up from Polson Towers and take him to the gym for 'an intense workout'.",
        at: "POLSON_ROAD",
        step: { kind: "vignette", id: "polson_gym", intro: [say("POLSON", "Right. Gym. Intense workout. Today's the day."), say("POLSON", "It's on the list. Gym. Get trim. Travelling. In that order."), say("POLSON", "Mork.")] },
      },
      {
        id: "cctv",
        text: "Polson says he's at the gym. Check the FGM War Room surveillance feed (under the Archive).",
        at: "ARCHIVE",
        step: { kind: "vignette", id: "polson_cctv", intro: [dir("A message from Polson: 'At the gym again 💪 might be a while'."), dir("Mikey's FGM War Room has a camera on everything. You pull up the Polson Towers feed. Just to check.")] },
      },
      {
        id: "gym2",
        text: "Polson wants 'one more intense session'. Take him back to Krunch Gym.",
        at: "POLSON_ROAD",
        step: { kind: "vignette", id: "polson_gym2", intro: [ping("POLSON", "Gym today. For real this time."), ping("POLSON", "Bring snacks. For after. Or during."), dir("Polson answers the door sideways. He has to. He has been 'bulking'.")] },
      },
      {
        id: "mouth",
        text: "Polson says he's found 'a new kind of workout'. Go round and spot him.",
        at: "POLSON_ROAD",
        step: { kind: "vignette", id: "polson_mouth", intro: [ping("POLSON", "Come round. New routine. Need a spotter."), ping("POLSON", "Bring a fork."), dir("There is a cake box on Polson's doorstep the size of a washing machine. It is addressed to Polson. It says FAMILY SIZE (LARGE FAMILY).")] },
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
            dir("You receive: Boggor's camera. You receive: 5 sweeties (they are slightly warm)."),
            dir("HOW IT WORKS: walk up to the playground fence and press E to throw a sweetie. The kids fight over it for 25 seconds (there's a countdown over the playground)."),
            dir("While they're busy, walk to each 📸 camera marker (swings, slide, climbing frame) and press E to take the photo. Rings go GREEN when it's safe. Wander in without a sweetie and they WILL scream."),
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
          pickup: [dir("*click* A beautiful shot. The galvanised steel glistens. Boggor will weep.")],
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
    id: "arc_mikey",
    player: "MIKEY",
    title: "The Modulator",
    blurb: "Banned for life from SAINTS vs POMPEY BANTER (18+). Again. Get back in, take over, and press the button.",
    reward: { coins: 300, desc: "Mikey is the Modulator. POWERRRRRR. (New rule: admins are allowed to break rules.)" },
    steps: [
      {
        id: "pizza_trial",
        text: "Mikey's been banned from the banter group. Again. Check the laptop at home.",
        at: "HOME",
        step: {
          kind: "dialogue",
          lines: [
            dir("Mikey's laptop. Facebrook. A notification: 'You have been removed from SAINTS vs POMPEY BANTER (18+).' Under it, nine more identical notifications, going back years."),
            say("MIKEY", "Mate."),
            say("MIKEY", "Banned for life. Again."),
            say("THE COLONEL", "(group chat) Think carefully before you answer Michael! Did you eat all the pizza??"),
            say("MIKEY", "I did not eat all the pizza."),
            dir("He ate all the pizza."),
            say("MIKEY", "The joke is that I fall out with the Colonel. Really nasty fall outs. I get banned for life. We say sorry. Repeat."),
            say("DRONGUS", "(ping) You'll be back in before midday."),
            dir("12 MIDDAY."),
            dir("12:01."),
            say("MIKEY", "It's past midday and I'm still not back in group."),
            say("MIKEY", "Ignorant!"),
            say("MIKEY", "Right. To get back in I need my phone. My phone's in my bag. My bag is... where's my bag."),
            say("MIKEY", "Oh no. I've lost everything again. Passport. Wallet. Licence. Bike battery. BOTH bike batteries."),
          ],
        },
      },
      {
        id: "lost_property",
        text: "Mikey has lost everything. Again. Find his stuff around Krelford.",
        at: "FIELD",
        step: {
          kind: "collect",
          label: "Mikey's stuff",
          pickup: [say("MIKEY", "YEEEE. Wot majik. Am a wizard.")],
          spots: [
            { x: 520, y: 1090, name: "passport" },
            { x: 1600, y: 1020, name: "wallet" },
            { x: 2240, y: 1090, name: "driving licence" },
            { x: 460, y: 1480, name: "bike battery" },
            { x: 1940, y: 1660, name: "spare bike battery" },
            { x: 2520, y: 510, name: "headphone case (still lost, this is a different one)" },
          ],
        },
      },
      {
        id: "russian_hackers",
        text: "The Colonel won't let Mikey back in. Phone some 'contacts' from the pub payphone.",
        at: "PUB",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Krezz Arms payphone. Mikey dials a number he says he 'got off a forum'."),
            say("MIKEY", "Ello. Is that the Russian hackers?"),
            dir("Hold music. It's Kero Kero Bonito. Mikey nods along."),
            say("MIKEY", "...yeah. Yeah. Identity fraud. Lovely. Cheers lads."),
            say("MIKEY", "I spoke to the Russian hackers. They've got a document. He definitely ate the pizza. Not me. Him."),
            say("DRONGUS", "(ping, to the Colonel) To be fair I've seen him talk to Russians sometimes."),
            dir("The Colonel believes every word."),
            say("MIKEY", "Do u reckon I'm a russhen spy?"),
            canon("russhen", { s: "MIKEY" }),
            dir("CALL SIGN ACQUIRED: RUSSHEN."),
            say("MIKEY", "He's let me back in. But I'm on minus one percent shares now. Fucking point five percent. The war is over."),
          ],
        },
      },
      {
        id: "sugar_parcel",
        text: "The Colonel demands a 'special package'. Post him one from the bank (15 Krezzcoin). Wrap it properly.",
        at: "BANK",
        step: {
          kind: "pay",
          cost: 15,
          intro: [
            say("MIKEY", "He wants a special package. He's getting a bag of caster sugar."),
            say("MIKEY", "Ten layers. Carrier bags, tin foil, kitchen paper, toilet paper. Taped to the inside of the box. Like pass the parcel."),
            say("MIKEY", "I've made it rly rly rly difficult to open, which I'm hoping will anger him even more."),
          ],
          success: [
            dir("Three days later, the Colonel goes live on Facebrook. The unboxing takes ten minutes. He swears for nine of them."),
            say("THE COLONEL", "HOW MANY TIMES HAS HE WRAPPED IT?"),
            say("MIKEY", "THE UNPACKAGING HAHAHAHAHAA. TOOK 10 MINS."),
            say("MIKEY", "It's obviously caster sugar. Like. No question."),
          ],
        },
      },
      {
        id: "election",
        text: "Run for moderator. Democracy in action. The Town Hall has lent you a podium.",
        at: "TOWN_HALL",
        step: {
          kind: "dialogue",
          lines: [
            dir("Krelford Town Hall. Mikey has been lent a podium to run for moderator of a Facebook group. Nobody at the Town Hall knows why they agreed to this."),
            say("MIKEY", "Democracy in action. Can't wait to serve you all."),
            say("POLSON", "Mikey's gonna be a modulator."),
            say("MIKEY", "Moderator."),
            say("POLSON", "Modulator."),
            dir("Votes are counted. Mikey wins. He was the only candidate, but he campaigned like he wasn't."),
            say("MIKEY", "POWERRRRRR."),
            say("MIKEY", "First rule. NO PISSING OFF OR BADMOUTHING ADMINS. THANKS, ADMIN."),
            say("MIKEY", "New rule: admins are allowed to break rules."),
            say("KREBLIS", "That's the most corrupt thing I've ever seen. I'm so proud of you."),
          ],
        },
      },
      {
        id: "modulate",
        text: "First shift as Modulator. Moderate the group from the laptop at home. Abuse your power. Not too obviously.",
        at: "HOME",
        step: {
          kind: "minigame",
          mode: "modulator",
          intro: [say("MIKEY", "Football banter group admins are the worst admins on Facebook."), say("MIKEY", "Makes it easier for us.")],
          success: [say("MIKEY", "I've already lasted longer than the last mod."), dir("Mikey has been nominated for WORST ADMIN at the end-of-season awards. He is campaigning to win it.")],
          fail: [say("MIKEY", "Damage control is needed, Harry."), say("DRONGUS", "(ping) Need to cover tracks.")],
        },
      },
      {
        id: "nuclear",
        text: "The rival admins are plotting. Drongus says it's time. Go back home and prepare the Nuclear Option.",
        at: "HOME",
        step: {
          kind: "dialogue",
          lines: [
            dir("The group is in chaos. Two new admins are plotting against the owner. Drongus sends a ping."),
            say("DRONGUS", "(ping) We need to prepare the nuclear option. Don't do it yet cause it's a nuclear option."),
            say("MIKEY", "Nuclear nuclear option."),
            say("MIKEY", "'Double nuclear option' is now a thing mate."),
            dir("Mikey deletes three quarters of the group in one go."),
            say("MIKEY", "I would've got the rest if it weren't for my boss walking over and distracting me for 2 mins."),
            dir("And then, one quiet week, the Colonel stops posting. Retired, they say. A caravan somewhere. Nobody knows."),
            say("MIKEY", "It's like your favourite TV show suddenly being cancelled."),
            say("MIKEY", "I miss the colnel."),
            say("MIKEY", "Ffs. Now I got nobody to play word game with."),
            dir("Mikey leaves the group's cover photo as it is: a skateboarder in kneepads. A monument."),
            say("MIKEY", "Right. Viral video next. Quarter million views. Then I'll have to stay out of Southampton for a while."),
          ],
        },
      },
    ],
  },
  {
    id: "arc_wake_polson",
    player: "ALL",
    minChapter: 2,
    title: "Operation Wake Up Polson",
    blurb: "Polson has been asleep since Tuesday. Mikey has named it an operation. Wake him, then prove you know him.",
    reward: { coins: 180, desc: "Polson is awake. For now. +180 Krezzcoin." },
    steps: [
      {
        id: "wake",
        text: "Operation Wake Up Polson. Go round to Polson Road.",
        at: "POLSON_ROAD",
        step: {
          kind: "dialogue",
          lines: [
            dir("Polson's front door. Mikey is already here, in a hi-vis tabard that says OPERATION WAKE UP POLSON."),
            say("MIKEY", "He's been asleep since Tuesday. He silently went upstairs and fell asleep. Classic."),
            dir("You knock. Nothing. You knock again. From inside, very faintly: 'mork'."),
            say("MIKEY", "Operation wake up Polson. Phase one: noise."),
            dir("Mikey plays 'Do The Crocodile' through a Bluetooth speaker pressed against the letterbox."),
            say("POLSON", "(from upstairs) WHAT. WHAT IS IT. IS IT THE PLAYSTATION. HAVE THEY NICKED MY PLAYSTATION."),
            dir("Polson opens the door. He then closes it. He then slams it ten times to check it's locked. You are both outside."),
            say("MIKEY", "It's fucking locked Polson."),
            say("POLSON", "Just checking."),
          ],
        },
      },
      {
        id: "bingo",
        text: "Polson Bingo at the Krezz Arms. Prove you know the man.",
        at: "PUB",
        step: {
          kind: "quiz",
          need: 3,
          intro: [dir("The Krezz Arms. Mikey has printed bingo cards. Every square is a Polson habit."), say("MIKEY", "Polson Bingo. Four squares. Get three and you're a true friend. Get less and you're basically Eden.")],
          questions: [
            { q: "What does Polson do 10 to 15 times every time he leaves the house?", options: ["Slams the door to check it's locked", "Says goodbye to the hamster", "Checks the weather"], correct: 0, wrong: "No. He slams the door. Every time. Ten to fifteen times." },
            { q: "Polson paid £60 extra on the Eurostar. What did he call Standard Premier?", options: ["Economy plus", "First class", "A mistake"], correct: 1, wrong: "First class. He called it first class. That's how tiers work Polson." },
            { q: "Where does Polson tip the leftover food?", options: ["The bin", "The food waste caddy", "'The grinder' (there is no grinder)"], correct: 2, wrong: "The grinder. There has never been a grinder." },
            { q: "One night away. What does Polson pack it in?", options: ["A small overnight bag", "The big suitcase", "A Tesco bag for life"], correct: 1, wrong: "The big suitcase. Always. 'Options.'" },
          ],
          success: [say("MIKEY", "HOUSE. You know him. God help you."), say("POLSON", "(arriving) What's this? Is this about me? Lovely.")],
          fail: [say("MIKEY", "Basically Eden. Go again.")],
        },
      },
    ],
  },
  {
    id: "arc_koeman",
    player: "ALL",
    minChapter: 3,
    title: "The Koeman Papers",
    blurb: "Kreblis has a theory. The departed Saints manager was rigging results. There are 'leaked emails'. Find them, then post the timeline.",
    reward: { coins: 220, desc: "The Koeman Papers are published. Pompey v Saints will never recover. +220 Krezzcoin." },
    steps: [
      {
        id: "brief",
        text: "Kreblis has a theory. Hear it out at the Archive.",
        at: "ARCHIVE",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Archive reading room. Kreblis has pinned a single printout to the wall and drawn a red circle on it in Sharpie. There is nothing in the circle."),
            say("KREBLIS", "Call it the Koeman Papers."),
            say("KREBLIS", "A ridiculous timeline of events. Culminating in Koeman's return. Every result rigged. Every substitution a message."),
            say("DRONGUS", "(ping) Welll wWell wELL."),
            say("KREBLIS", "The emails are out there. Five of them. Scattered round Krelford. Needs some paint once we've got them. Underline, circle etc."),
          ],
        },
      },
      {
        id: "emails",
        text: "Find the five 'leaked Koeman emails' around Krelford.",
        at: "FIELD",
        step: {
          kind: "collect",
          label: "Koeman email",
          pickup: [say("KREBLIS", "Another one. Look at the timestamp. LOOK at it."), dir("It's a Tesco receipt. Kreblis has circled the date.")],
          spots: [
            { x: 600, y: 980, name: "email (Tesco receipt)" },
            { x: 1480, y: 1100, name: "email (betting slip)" },
            { x: 2120, y: 980, name: "email (napkin)" },
            { x: 540, y: 1520, name: "email (Saints programme, 2014)" },
            { x: 2000, y: 1700, name: "email (actually an email)" },
          ],
        },
      },
      {
        id: "post",
        text: "Post the Koeman Papers in the Pompey v Saints group (laptop at home). Total sincerity. Never break.",
        at: "HOME",
        step: {
          kind: "minigame",
          mode: "facebook",
          intro: [say("KREBLIS", "Like the whole point of trolling Pompey v Saints is that it's impossible to have an actual argument seriously."), say("KREBLIS", "Bad spelling. Total sincerity. Never break.")],
          success: [say("KREBLIS", "Four hundred comments. Someone's made a documentary pitch. You heard it here first."), dir("The Koeman Papers are now accepted fact in three separate Facebook groups.")],
          fail: [say("KREBLIS", "Too obvious. They need to think we mean it. Again.")],
        },
      },
    ],
  },
  {
    id: "arc_hotel_chaz",
    player: "ALL",
    minChapter: 3,
    title: "Hotel Chaz",
    blurb: "You need somewhere to crash. Polson has a sofa bed. Polson does not have a blanket.",
    reward: { coins: 150, desc: "Polson owns a blanket. History. +150 Krezzcoin." },
    steps: [
      {
        id: "stay",
        text: "Crash at Hotel Chaz (Polson Road).",
        at: "POLSON_ROAD",
        step: {
          kind: "dialogue",
          lines: [
            dir("Polson's living room, post-Hoard. There is a floor now. On the floor: a sofa bed. It makes a noise like a dying accordion when you sit on it."),
            say("POLSON", "Welcome to Hotel Chaz. Breakfast is three pastries and half a French stick."),
            say("MIKEY", "Who eats three pastries and half a French stick for breakfast."),
            say("POLSON", "Champions."),
            dir("You ask for a blanket. Polson looks at you like you've asked for a kidney."),
            say("POLSON", "A blanket?"),
            say("MIKEY", "He doesn't even know where to buy a blanket."),
            dir("You rest at Hotel Chaz. You feel every spring individually. You lose 10 HP. You gain a story.", { set: { hotel_chaz_stayed: true } }),
          ],
        },
      },
      {
        id: "blanket",
        text: "Buy Polson a blanket (and a pillow) at the bank's homeware concession. 40 Krezzcoin.",
        at: "BANK",
        step: {
          kind: "pay",
          cost: 40,
          intro: [say("KREZMAR", "The bank does homeware now. Don't ask. Blanket and pillow, forty Krezzcoin. I'll waive the interest. Once.")],
          success: [say("POLSON", "A blanket. For the sofa bed. In my house."), say("POLSON", "It's a huge end to an era!!!"), dir("He puts the blanket on himself, not the sofa bed, and falls asleep.")],
        },
      },
    ],
  },
  {
    id: "arc_vegas",
    player: "ALL",
    minChapter: 4,
    title: "Has Kreblis Booked Vegas Yet",
    blurb: "Kreblis is a groomsman at Drongus's Vegas wedding. He has not booked. Drongus checks fortnightly. Get it booked.",
    reward: { coins: 200, desc: "Kreblis is booked. Probably. +200 Krezzcoin." },
    steps: [
      {
        id: "check",
        text: "Drongus's fortnightly check-in: ask Kreblis if he's booked Vegas (Krezz Arms).",
        at: "PUB",
        step: {
          kind: "dialogue",
          lines: [
            say("DRONGUS", "(ping) My fortnightly check-in to see if you've booked Vegas yet."),
            say("KREBLIS", "Not yet man."),
            say("DRONGUS", "(ping) It's in four months."),
            say("KREBLIS", "Time is a construct. Also flights go down. Nuffin cum free in this werld I tel ya tht 4 free!!"),
            dir("You are going to have to book it for him."),
          ],
        },
      },
      {
        id: "book",
        text: "Book Kreblis's flight at the bank (80 Krezzcoin). He'll pay you back. He will not pay you back.",
        at: "BANK",
        step: {
          kind: "pay",
          cost: 80,
          intro: [say("KREZMAR", "Krelford to Vegas, one adult, one 'business guy'. Eighty. He's never paying you back, you know that."), say("KREBLIS", "Can I get a window seat? I go straight up to people and ask to sit in the window seat.")],
          success: [say("KREBLIS", "Booked. Wow. I feel like I've done this myself."), say("DRONGUS", "(ping) HE'S BOOKED?? 🎉 First time anyone's done anything I asked in this chat")],
        },
      },
      {
        id: "airport",
        text: "Show Kreblis his booking confirmation (Krezz Arms) before he loses it.",
        at: "PUB",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Krezz Arms. Kreblis looks at the booking confirmation on your phone like it's a menu in another language."),
            say("KREBLIS", "Have just seen that the Vegas flight is cancelled? I think that's what it said anyway. Not sure. Not an expert."),
            dir("The Vegas flight is not cancelled. It's the one under it."),
            say("KREBLIS", "Right. Well. Procrastination paid off big time. Again."),
          ],
        },
      },
    ],
  },
  {
    id: "arc_50p",
    player: "ALL",
    minChapter: 5,
    title: "The 50p Crusade",
    blurb: "The corner shop charged Mikey an illegal 50p card surcharge. He wants justice. He wants his 50p back.",
    reward: { coins: 250, desc: "Justice for 50p. Mikey got his 50p back. You got 250. +250 Krezzcoin." },
    steps: [
      {
        id: "evidence",
        text: "Mikey needs a witness. Meet him outside the Krelford Constabulary.",
        at: "POLICE",
        step: {
          kind: "dialogue",
          lines: [
            say("MIKEY", "Mate. They added fifty pence to my card. For using a card. It's illegal. I've checked."),
            say("MIKEY", "I went back and filmed the charge sheet. As evidence."),
            dir("The desk sergeant looks at Mikey's phone for a long time. It is a video of a laminated sign that says '50p CARD CHARGE UNDER £5'."),
            say("SERGEANT", "Sir, this is a corner shop."),
            say("MIKEY", "I just wanted my 50p back 🤣"),
            say("MIKEY", "I'm reporting it to the Krelford Transport Authority too. They sell Oyster top-ups. It's in their terms."),
          ],
        },
      },
      {
        id: "tribunal",
        text: "Take the 50p case to the Town Hall. Democracy in action.",
        at: "TOWN_HALL",
        step: {
          kind: "quiz",
          need: 2,
          intro: [dir("The Town Hall, out of session. Mikey has booked it for the afternoon with a form he designed himself."), say("MIKEY", "Right. Cross-examine me. I'm ready.")],
          questions: [
            { q: "How much did the corner shop overcharge Mikey?", options: ["£5", "50p", "His dignity"], correct: 1, wrong: "50p. It's always been about the 50p." },
            { q: "What did Mikey film as evidence?", options: ["The shopkeeper", "The charge sheet", "Himself crying"], correct: 1, wrong: "The charge sheet. Laminated. In landscape." },
            { q: "Who is making money here?!", options: ["The shop", "Mikey", "Nobody. Who is making money here?!"], correct: 2, wrong: "Nobody. Who is making money here?!" },
          ],
          success: [dir("The shop refunds 50p. Mikey holds it up to the light like a medal."), say("MIKEY", "Classic Nevitt. Justice is served. Luv a gud redemshun ark.")],
          fail: [say("MIKEY", "Ignorant! Again. From the top.")],
        },
      },
    ],
  },
  {
    id: "arc_crocodile",
    player: "ALL",
    minChapter: 2,
    title: "Do The Crocodile",
    blurb: "SanMik's sixth album is two songs long. The launch party is tonight. The whole cabinet has rehearsed the dance. Very seriously.",
    reward: { coins: 200, desc: "The Crocodile has been done. Crocodiles now live in the playground. +200 Krezzcoin." },
    steps: [
      {
        id: "launch",
        text: "SanMik's single launch. Mikey's at the Town Hall rehearsing the cabinet.",
        at: "TOWN_HALL",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Town Hall. The horseshoe table has been pushed against the wall. Nine grown men stand in a line, arms by their sides, faces like a funeral."),
            say("MIKEY", "Right. The sixth SanMik album. Two songs. That counts. The lead single: 'Do The Crocodile'."),
            say("MIKEY", "You take your left hand. And go like this."),
            dir("Mikey raises his left arm above his head and bends it into a jaw. He holds eye contact with you the entire time."),
            say("SCROMBUS", "Is there a reason we're doing this?"),
            say("MIKEY", "Lots More animal sounds in next SanMik album. What sound does a crocodile make?"),
            say("KREZWONK", "I have foreseen the dance. Something terrible follows it."),
            say("MIKEY", "Launch party's in the Krezz Arms back room. Nobody smiles. Nobody. It's a serious song."),
          ],
        },
      },
      {
        id: "dance",
        text: "Do The Crocodile at the launch party (Krezz Arms back room). Stay in sync with the cabinet.",
        at: "PUB",
        step: {
          kind: "minigame",
          mode: "crocodile",
          intro: [dir("The Krezz Arms back room. A banner: 'SANMIK — DO THE CROCODILE — LAUNCH PARTY (NO SMILING)'. The cabinet takes its positions."), say("MIKEY", "YOU TAKE YOUR LEFT HAND. AND GO LIKE THIS.")],
          success: [say("MIKEY", "That's going straight on Spotify. Projected earnings: four pence."), say("DRONGUS", "(ping) Did someone release crocodiles into Krelford ?? Is this lore ?? Did nobody think to tell me ??")],
          fail: [say("MIKEY", "Out of sync. The crocodiles came anyway. Again, but properly.")],
        },
      },
    ],
  },
  {
    id: "arc_pudding_spy",
    player: "ALL",
    notPlayer: "CRONGUS",
    minChapter: 2,
    title: "Some Sick Shit",
    blurb: "Lil' Crongus has been sneaking off to the abandoned building. The FGM War Room says he's up to 'some sick shit'. Follow him.",
    reward: { coins: 250, desc: "The pudding house is rubble. Lulon has a caravan now. +250 Krezzcoin." },
    steps: [
      {
        id: "brief",
        text: "Briefing in the FGM War Room (under the Archive): Lulon is up to something.",
        at: "ARCHIVE",
        step: {
          kind: "dialogue",
          lines: [
            dir("The FGM War Room. Mikey has a CCTV still on the big screen: Lil' Crongus, at night, looking over his shoulder, outside the abandoned building. He is holding a spoon."),
            say("MIKEY", "Lulon. Three nights in a row. Same building. Comes out walking like he's seen God and didn't like it."),
            say("KREBLIS", "Ministry of Strange Occurrences assessment: he is up to some sick shit."),
            say("MIKEY", "Some sick shit. Officially."),
            say("KREZWONK", "I foresaw this. In the dream there was custard. Too much custard."),
            say("MIKEY", "Follow him. Stay in the bushes. Film everything. Divide and conquer."),
          ],
        },
      },
      {
        id: "follow",
        text: "Follow Lil' Crongus to the abandoned building, south of town. Stay in the bushes.",
        at: "ABANDONED",
        step: { kind: "vignette", id: "pudding_spy", intro: [dir("You crouch in a bush by the gate of the abandoned building. It smells of custard. You hear footsteps.")] },
      },
      {
        id: "leak",
        text: "Leak the footage to the press (laptop at home).",
        at: "HOME",
        step: {
          kind: "dialogue",
          lines: [
            dir("Your laptop. One email to the Krelford Gazette newsdesk. Subject line: 'CHILDREN'S MINISTER. PUDDING. YOU NEED TO SEE THIS'."),
            dir("Attachment: pudding_FINAL.mp4 (4 min 12s). You watch it back once to check it uploaded. You will never be the same."),
            dir("Reply, eleven seconds later: 'Front page. How much do you want.'"),
            say("DRONGUS", "(ping) why is Lulon trending"),
            say("DRONGUS", "(ping) what is bread and butter pudding"),
            say("DRONGUS", "(ping) I'm going to need someone to explain this to me in the group chat"),
          ],
        },
      },
      {
        id: "raid",
        text: "The Constabulary has called an emergency press conference (Krelford Constabulary).",
        at: "POLICE",
        step: { kind: "vignette", id: "pudding_raid", intro: [dir("Outside the Constabulary: satellite vans, a crowd, and three tanks idling on double yellow lines.")] },
      },
    ],
  },
  {
    id: "arc_krebon",
    player: "KREBON",
    title: "Reprieve",
    blurb: "One last gig with Twitcher Mutiny. Then find the symbol of Wahoogah, and go home.",
    reward: { coins: 300, desc: "Krebon goes home to Wahooga. Someone else carries on, with his Krezzcoin and his rockstar points." },
    steps: [
      {
        id: "booked",
        text: "Twitcher Mutiny are booked at the Krezz Arms. Get down there.",
        at: "PUB",
        step: {
          kind: "dialogue",
          lines: [
            dir("The Krezz Arms back room. A stage made of four pallets. A banner, hand-painted, slightly wrong: 'TWICHER MUTINY'."),
            say("KREBON", "I'm already regretting signing on to this gig."),
            say("KREBON", "If I can help it, I'll be with you lot and skull deep before the night is out."),
            say("KREZMAR", "Is this the one where you play the sad sea song?"),
            say("KREBON", "It's called Reprieve. And it's not sad. It's a reprieve. It's in the name."),
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
          intro: [say("KREBON", "One, two, three, four…"), dir("Move left and right across the stage. Tap / SPACE to prance. Catch the bras and thongs. Prancing while you catch them is worth double.")],
          success: [say("KREBON", "Thank you Krelford. You've been a strange and moist crowd."), dir("Somewhere in the crowd, Polson is crying. He says it's the smoke machine. There is no smoke machine.")],
          fail: [say("KREBON", "Bit of a quiet one. Wahooga crowds are louder. Again?")],
        },
      },
      {
        id: "portal",
        text: "Something is calling you from the west edge of town. The symbol of Wahoogah.",
        at: "PORTAL",
        step: { kind: "vignette", id: "wahooga", intro: [dir("At the very edge of Krelford, where the grass gives up, the air is folding. A symbol hangs in it. You've seen it before. On a call. Nobody asked what it was."), say("KREBON", "The symbol of Wahoogah.")] },
      },
    ],
  },
  {
    id: "arc_sanmik",
    player: "ALL",
    minChapter: 4,
    title: "Welcome to the SanMikverse",
    blurb: "SanMik (Mikey in an afro wig) has found a magic lamp in the skip behind the Krezz Arms. It smells of rank fanny juice. He has rubbed it.",
    reward: { coins: 400, desc: "A signed copy of 'Peener 4eva' on CD-R, labelled in biro. The biro has gone through the CD." },
    steps: [
      {
        id: "lamp",
        text: "SanMik has found 'a magic lamp' after his gig. Go to the Krezz Arms back room before he rubs it.",
        at: "PUB",
        step: { kind: "vignette", id: "sanmik_lampe", intro: [ping("MIKEY", "Found a magic lamp in the skip"), ping("MIKEY", "Looks like a naughty little dildo"), ping("MIKEY", "Gonna rub it. Come watch. Can someone react to my message pls")] },
      },
      {
        id: "catford",
        text: "You're in the SanMikverse. The Genie wants a bath: fix the Giant Hot Tub of Catford. (The lamp in the Krezz Arms back room takes you back in.)",
        at: "PUB",
        step: { kind: "arena", dungeon: "arena_sanmik", intro: [dir("The lamp is on the bar, still glowing. It smells of corn. You rub it. Against your better judgement, you rub it.")] },
      },
      {
        id: "nation",
        text: "SanMik and SanChz have fallen out over the last Pepsi Normal. Both of them have started a nation. On the Town Hall steps. Sort it out.",
        at: "TOWN_HALL",
        step: { kind: "vignette", id: "sanmik_nation", intro: [dir("There is chanting coming from the Town Hall steps. Two lots of chanting. Different chanting. And a goat.")] },
      },
    ],
  },
];

export function arcFor(player: PlayableId): Arc | undefined {
  return ARCS.find((a) => a.player === player);
}

/** The player's own story first, then the shared ones. */
export function arcsFor(player: PlayableId): Arc[] {
  return [...ARCS.filter((a) => a.player === player), ...ARCS.filter((a) => a.player === "ALL" && a.notPlayer !== player)];
}
