import type { Cond, Line, PlayableId } from "../../data/types";
import { canon, dir, ping, say } from "../dsl";

export interface ChapterStep {
  id: string;
  text: string;
  /** The step is complete when this holds. */
  done: Cond;
  /** Where the objective arrow points in the hub. */
  target?: string;
}

export interface ChapterDef {
  n: number;
  title: string;
  subtitle: string;
  dungeon: string;
  dungeonDoor: string;
  steps: ChapterStep[];
  /** Plays when the chapter begins in the hub. */
  intro: Line[];
  /** Short per-player altered scene, played straight after the intro. */
  playerScene: Record<PlayableId, Line[]>;
  /** Plays after the boss, back in Town Hall (chapters 2-5; chapter 1 uses the Krazy Fact meeting). */
  outro: Line[];
}

export const CHAPTERS: ChapterDef[] = [
  {
    n: 1,
    title: "THE GREAT SILENCE",
    subtitle: "Krelford · Wildern Academy · The Great Pussy Juice Tap",
    dungeon: "wildern",
    dungeonDoor: "WILDERN",
    steps: [
      { id: "s_meeting", text: "Attend the Emergency Reaction Session at the Town Hall", done: { flag: "met_emergency" }, target: "TOWN_HALL" },
      { id: "s_archive", text: "Visit the Historical Archive (the cabinet wants precedent)", done: { flag: "founding_seen" }, target: "ARCHIVE" },
      { id: "s_dungeon", text: "Enter Wildern Academy and unblock the Great Tap", done: { flag: "ch1_clear" }, target: "WILDERN" },
      { id: "s_report", text: "Report to the Town Hall. A Krazy Fact is required.", done: { flag: "ch1_fact" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("NOW."),
      dir("A Tuesday afternoon in Krelford. The Tap flows. Somewhere, a fizzy bongo is opened. Every phone in the country buzzes at once."),
      ping("DRONGUS", "🎵 THE KREZZING HOUR — Official Krelworld Anthem — Drongus B. Drippin'"),
      ping("DRONGUS", "New one lads. Took me all morning. Genuinely think it's the best one yet."),
      dir("Seen by 9."),
      dir("Ten minutes pass."),
      dir("Seen by 9. No reactions."),
      ping("DRONGUS", "Hello?"),
      ping("DRONGUS", "Did anyone listen to it"),
      dir("An hour passes. Krezmar reacts 😂 to a meme Gronny posted about a leaf blower."),
      ping("DRONGUS", "Oh so we're reacting to LEAF BLOWERS now"),
      ping("DRONGUS", "Are you all deliberately ignoring me ?"),
      ping("DRONGUS", "Notice how there are a few people in the chat what never contribute nothing 😅 it's whatever, don't even give a shit at this point"),
      ping("DRONGUS", "UNTIL SOMEONE REACTS TO MY NEW AI SONG, THERE WILL BE NO MORE LORE."),
      dir("DRONGUS B. DRIPPIN' has left the chat.", { sfx: "leave" }),
      dir("High above Krelford, the Great Wiki Citadel's gates slam shut. The sky develops a faint grey tint, like an unloaded page. The word 'TOWN' falls off the Town Hall sign and lands on a pigeon."),
      dir("Krelworld runs on lore. And the lore has stopped."),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "I wasn't ignoring it. I was banned. I think. I'm always a bit banned."), dir("You check. You are not banned. This is somehow more unsettling.")],
      KREZMAR: [say("KREZMAR", "I reacted to the leaf blower. I reacted to the LEAF BLOWER. Oh fuck."), dir("Your thumb hovers over your phone. The Reaction Network is already dark.")],
      KREBLIS: [say("KREBLIS", "Breaking news. Breaking news. The sky is buffering."), dir("You file it under Strange Occurrences. The filing cabinet is also buffering.")],
      KREZWONK: [say("KREZWONK", "I saw it. I read it. I listened to it. I said nothing. As foretold."), dir("You realise, with horror, that you foretold this specifically so you wouldn't have to do anything about it.")],
      SCROMBUS: [say("SCROMBUS", "I'm usually the one who replies. I'm the one who says 'hang in there bro'. Where was I?"), dir("You were fixing the Wonking Machine. Nobody reacted to that either. You understand him better than you'd like.")],
      KREBON: [say("KREBON", "He's never asked who I am and waited for the answer. Now he's stopped asking anything."), dir("You touch the hilt of your cane. Six Krez Years. You know what silence does to a man.")],
      CRONGUS: [say("CRONGUS", "He tagged me in it. @LIL' CRONGUS. I was going to reply. I was. I was lurking first."), dir("Lurking, it turns out, looks exactly like ignoring from the outside.")],
      GRONNY: [say("GRONNY", "I posted the leaf blower. It got a react. His song didn't."), dir("It's minus six. You're in shorts. You feel, for the first time in your life, slightly cold.")],
      MIKEY: [say("MIKEY", "I thought he was bluffing. He's always bluffing. FGM rule one."), dir("He wasn't bluffing. The Nuclear Option, it turns out, was his all along.")],
      BENN: [say("BENN", "I'm already regretting signing on to this gig. If I can help it, I'll be with you lot before the night is out."), dir("Fairweather Benn has arrived in Krelford. Nobody is sure for how long. Nobody is ever sure for how long.")],
    },
    outro: [],
  },
  {
    n: 2,
    title: "THE POLSON–EDEN INCIDENT",
    subtitle: "Polson Towers · The Reaction Network · The FGM Historical Archive",
    dungeon: "polson_towers",
    dungeonDoor: "POLSON_ROAD",
    steps: [
      { id: "s_brief", text: "Attend the Operation Fragmar briefing (FGM War Room, under the Archive)", done: { flag: "fragmar_briefed" }, target: "ARCHIVE" },
      { id: "s_dungeon", text: "Go to Polson Towers. Solve Cheesegate. Enter the Reaction Network.", done: { flag: "ch2_clear" }, target: "POLSON_ROAD" },
      { id: "s_report", text: "Report to the Town Hall", done: { flag: "ch2_fact" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("CHAPTER TWO. The Tap flows again, but the Reaction Network is still dark."),
      say("KREBLIS", "Breaking. The Network trace came back. A whole junction runs through Polson Towers. Through Eden's permissions specifically.", { role: true, proctus: "Breaking news! I've found the network! It goes through a house! With a moat!" }),
      say("KREZWONK", "This needs FGM ULTRA. This needs the War Room.", { role: true, proctus: "This needs... *reads card* ...FGM. I don't know what that stands for. Nobody will tell me." }),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "Cheesegate. I coined that. Before there was any cheese. And now there's cheese."), dir("History, it turns out, eventually catches up with a good '-gate'.")],
      KREZMAR: [say("KREZMAR", "If you saw the state of the chats that Polson is in. I've seen them. I've seen things."), dir("You shudder. Some of those chats are still in your phone.")],
      KREBLIS: [say("KREBLIS", "What if it goes out the other ear and into the other. I said that about Polson once. Still thinking about it."), dir("You resolve to finally find out.")],
      KREZWONK: [say("KREZWONK", "'Honestly all his voices just sound like slight variations of each other.' I said that. In 2022. I stand by it."), dir("The Mork Voice awaits.")],
      SCROMBUS: [say("SCROMBUS", "I joined in 2025. I've read the archive. I still have no idea who these people are."), dir("You decide to treat it like any other piece of lore: confidently and without context.")],
      KREBON: [say("KREBON", "Contradictory instructions. Shifting loyalties. A house with a moat. I've been to prisons that made more sense."), dir("You ask for a quick cost/benefit analysis. Nobody answers. As usual.")],
      CRONGUS: [say("CRONGUS", "Operation Wake Up Polson. I proposed it once. It was rejected. This is my redemption arc."), dir("You've never had an arc before. It feels nice.")],
      GRONNY: [say("GRONNY", "Polson's turning his phone off. He's getting very anxious and upset but he's with me if anyone needs him."), dir("You've said this exact sentence before, word for word, in 2022. It still applies.")],
      MIKEY: [say("MIKEY", "Operation Fragmar. My operation. My friend request. This time in the right order."), dir("EXPANDED ROUTE UNLOCKED: As the original operative, you'll get access to the Fragmar Prime route inside the Reaction Network.", { set: { mikey_route: true } })],
      BENN: [say("BENN", "My paradigm has just phlegmed backwards into the multiverze dude, whoa, lemme catch up."), dir("You have not caught up. You may never catch up.")],
    },
    outro: [
      dir("Town Hall. The giant reaction display on the wall flickers back on. One by one, the reaction icons light up: 👍 ❤️ 😂 😡."),
      say("KREBLIS", "The Network's back. Partially. Eden approved it. Polson approved it. On the SAME document. That's never happened in recorded history.", { role: true, proctus: "The network is back! Both of them agreed! I've never seen two people agree! I've never seen ONE person agree!" }),
      say("MIKEY", "Fragmar: complete. Classification: still extremely petty.", { role: true, proctus: "Fragmar complete! I was there! I was definitely there!" }),
      ping("DRONGUS", "Operation Fragmar 2"),
      ping("DRONGUS", "And you didn't even invite me"),
      say("SCROMBUS", "The pumps, though. The pussy juice pressure's still falling. Something's wrong at the Ministry of Boner Control.", { role: true, proctus: "The pumps are falling! At the Ministry of... the one with the name!" }),
      say("KREZWONK", "Before that. A Krazy Fact. The record demands one.", { role: true, proctus: "A Krazy Fact! I've got one! Proctus is six foot four! No? Fine. You do it." }),
    ],
  },
  {
    n: 3,
    title: "THE MINISTRY OF BONER CONTROL",
    subtitle: "Pipelines · Vending Machines · The Krezz Refinery · The Mk II",
    dungeon: "ministry",
    dungeonDoor: "MINISTRY",
    steps: [
      { id: "s_bev", text: "Attend the National Beverage Committee (Town Hall)", done: { flag: "beverage_committee" }, target: "TOWN_HALL" },
      { id: "s_hear", text: "Attend the Wonking Machine Procurement Hearing (Town Hall)", done: { flag: "machine_hearing" }, target: "TOWN_HALL" },
      { id: "s_dungeon", text: "Enter the Ministry of Boner Control. Restore the pumps.", done: { flag: "ch3_clear" }, target: "MINISTRY" },
      { id: "s_report", text: "Report to the Town Hall", done: { flag: "ch3_fact" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("CHAPTER THREE. Pussy juice pressure: 61%. Falling. Citizens queue at the Tap with eggcups."),
      say("SCROMBUS", "Pipeline report. The Ministry of Boner Control's dark. Main pumping station's offline. And my Mk II is in there. Over-wonking.", { role: true, proctus: "The pumping station is dark! The machine is over-... I'm not saying that word. It's on the card. I'm not saying it." }),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "This explains the shortage of Guinness. It's all being replaced with Krezz. I said that. I was right."), dir("Being right has never once got you un-banned.")],
      KREZMAR: [say("KREZMAR", "My vending machines. My children. Every single one of them dry."), dir("Your Krez Loan ledger trembles in your pocket. Somebody is going to pay for this. With interest.")],
      KREBLIS: [say("KREBLIS", "A man's shower is dispensing pussy juice. In Krelford South. Strange occurrence."), dir("You are, frankly, running out of filing.")],
      KREZWONK: [say("KREZWONK", "I prophesied a machine that wouldn't stop. I didn't specify which. It was this one. Probably."), dir("You consider issuing a retroactive prophecy. You decide that would be cheating. Then you do it anyway.")],
      SCROMBUS: [say("SCROMBUS", "It's my machine. I designed it. I installed it. And now I have to kill it."), say("SCROMBUS", "Nobody ever said anything about it. Not one word. Now they'll say 'remember when Scrombus killed his own machine'."), dir("At least it'll be a reaction.")],
      KREBON: [say("KREBON", "Minister of Krunching. Finally, something to krunch."), dir("You crack your knuckles. A pipe nearby bursts in sympathy.")],
      CRONGUS: [say("CRONGUS", "As Children's Minister, I'm recusing myself from this entire building."), dir("You go in anyway. Someone has to. It's apparently you.")],
      GRONNY: [say("GRONNY", "Big Bertha's in the basement. I'm getting her out. Whatever it takes."), dir("PERSONAL OBJECTIVE: Find Big Bertha in the Ministry basement.", { set: { bertha_hunt: true } })],
      MIKEY: [say("MIKEY", "Never been to the Ministry of Boner Control. Heard things. Mostly from Drongus."), dir("You resolve not to touch anything. You will touch everything.")],
      BENN: [say("BENN", "Fart. F. Art. Fucking art, yeah?"), dir("The Ministry's pipes groan in agreement.")],
    },
    outro: [
      dir("Town Hall. The pipes in the walls begin to hum. Every vending machine in Krelford blinks back on with a little psychedelic jingle."),
      say("KREZMAR", "My children. They live.", { role: true, proctus: "The vending machines are back! I've bought six! I'm going to be ill!" }),
      say("SCROMBUS", "The Mk II is... decommissioned. Did anyone... did anyone say anything nice about it? Before?", { role: true, proctus: "The machine is dead. Scrombus would want someone to say something nice. *clears throat* It had a lovely... reach." }),
      ping("DRONGUS", "RIP the Mk II"),
      ping("DRONGUS", "Did anyone say anything nice about it before they killed it"),
      ping("DRONGUS", "No ? Welcome to my world"),
      say("KREZWONK", "The Bonky Cult's moving next. I've seen the hammer in a dream. It had my name on it. And yours.", { role: true, proctus: "I've seen a hammer in a dream! It said Proctus on it! Is that bad? It felt bad." }),
    ],
  },
  {
    n: 4,
    title: "THE BONKY CULT",
    subtitle: "Commandments · Arbitrary Rules · The Supreme Banhammer",
    dungeon: "bonky_temple",
    dungeonDoor: "BONKY_TEMPLE",
    steps: [
      { id: "s_crisis", text: "Attend the Flenky Constitutional Crisis (Town Hall)", done: { flag: "ban_tribunal_open" }, target: "TOWN_HALL" },
      { id: "s_dungeon", text: "Climb to the Bonky Temple. Stop the Banhammer.", done: { flag: "ch4_clear" }, target: "BONKY_TEMPLE" },
      { id: "s_report", text: "Report to the Town Hall", done: { flag: "ch4_fact" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("CHAPTER FOUR. A temple has appeared on the hill above Krelford. Nobody built it. Someone renamed the group chat 'Bonky Bonkit' once, in January 2024, and the building simply arrived."),
      say("KREBLIS", "Breaking. The Bonky Cult has started banning people in Drongus's name. They banned a man for having parents.", { role: true, proctus: "People are being banned! For having parents! I have parents! Somewhere!" }),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "They've carved my bans into the temple walls. All nine. In chronological order. With a little gold leaf on the Queen one."), dir("It's beautiful, in a way. In every other way it's horrible.")],
      KREZMAR: [say("KREZMAR", "They've banned money. They've banned LOANS. That's my entire ministry, mate."), dir("You take out a Krez Loan out of spite. The interest is criminal. Literally.")],
      KREBLIS: [say("KREBLIS", "A cult. Of rules. Built out of an old nickname. Strange occurrence."), dir("It's the least strange thing that's happened this week.")],
      KREZWONK: [say("KREZWONK", "'Anyone standing still is lurking. Lurking is bannable.' They've written a rule about me specifically."), dir("For the first time in years, you're going to have to keep moving.")],
      SCROMBUS: [say("SCROMBUS", "I proposed a more hostile environment. I'd like it on the record I meant 'hostile to apathy', not THIS."), dir("The record, as usual, will say whatever Drongus wants it to say.")],
      KREBON: [say("KREBON", "A cult of betrayal. Commandments that change. Like the three who betrayed me, but with a hammer."), dir("You've always wanted to krunch a cult.")],
      CRONGUS: [say("CRONGUS", "They've got a children's wing. I've been formally invited. I'm formally declining by killing everyone."), dir("Children's Minister, ministering.")],
      GRONNY: [say("GRONNY", "Banned for wearing shorts. Appealing in shorts."), dir("The appeal will be heard by the Banhammer. The Banhammer does not care about shorts. It cares about bans.")],
      MIKEY: [say("MIKEY", "The Nuclear Option. They've built a shrine to it. And it's got Drongus's name on it. Of course it does."), dir("The Archive was right. You hate that the Archive was right.")],
      BENN: [say("BENN", "Total war."), dir("You came to the Temple for a gig. There is no gig. There is only war.")],
    },
    outro: [
      dir("Town Hall. The Bonky Cult's banners come down. On every one, someone has scrawled 'pls' in a different hand."),
      say("FLENKY", "The Banhammer's down. I've been unbanned. All nine times. Retroactively.", { role: true, proctus: "The Banhammer is down! I've been unbanned! From things I wasn't banned from! I feel lighter!" }),
      say("KREBLIS", "The Tribunal's processing readmissions. Four thousand citizens. Half of them were banned for blinking.", { role: true, proctus: "Four thousand readmissions! I'm stamping them all! My wrist! Is this how Crongus feels?" }),
      ping("DRONGUS", "I didn't tell them to do that btw"),
      ping("DRONGUS", "The cult"),
      ping("DRONGUS", "I just set a nickname once. Bonky Bonkit. January 2024. They took it too far."),
      ping("DRONGUS", "That's the problem with lore. You make it and then people DO things with it."),
      say("KREZWONK", "Krezteua d'If has reopened. The past is coming loose. Krebon's past specifically.", { role: true, proctus: "Krezteua d'If! I've been there! For six years! This morning!" }),
    ],
  },
  {
    n: 5,
    title: "KREZTEUA D'IF",
    subtitle: "Krezmond · The Abbé Krezia · Conflicting Records",
    dungeon: "krezteua",
    dungeonDoor: "DOCKS",
    steps: [
      { id: "s_question", text: "Attend 'The Krebon Question' (Town Hall)", done: { flag: "krebon_question" }, target: "TOWN_HALL" },
      { id: "s_dungeon", text: "Sail from the Docks to Krezteua d'If", done: { flag: "ch5_clear" }, target: "DOCKS" },
      { id: "s_report", text: "Report to the Town Hall", done: { flag: "ch5_fact" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("CHAPTER FIVE. At the docks, three different versions of the same boat are moored in the same spot. One of them is on fire. One of them has a moustache."),
      ping("DRONGUS", "Who the fuck is Krebon"),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "Six years in prison. I've done longer in the corridor."), dir("You have, technically, done four hours. It felt like six years.")],
      KREZMAR: [say("KREZMAR", "There was a treasure in Krezteua d'If. Krezmond found it. Where's the rest of it?"), dir("Krelfund opportunity detected.")],
      KREBLIS: [say("KREBLIS", "Conflicting historical records. My entire ministry, compressed into one prison."), dir("You've waited your whole career for this.")],
      KREZWONK: [say("KREZWONK", "I wrote the Krezmond saga. At eleven pm. On a Saturday. Now it's a prison full of ghosts."), say("KREZWONK", "Gentlemen… I fear I have found myself."), dir("Be careful what you lore.")],
      SCROMBUS: [say("SCROMBUS", "The second most important lore in the canon, after the Krezzsplosion. And it's eating the Archive."), dir("Ministry of Lore: report to the frontline.")],
      KREBON: [say("KREBON", "Home."), dir("You return to Krezteua d'If. Six Krez Years. The Abbé Krezia. The treasure. The three who betrayed you. Or four. The record's unclear."), say("KREBON", "This time, I decide what happened."), dir("PERSONAL CHAPTER: Your return to Krezteua d'If is substantially rewritten. The Spectre knows your name.", { set: { krebon_return: true } })],
      CRONGUS: [say("CRONGUS", "A child died, Krezwonk said. In the lore. As Children's Minister I'm going to find out which one."), dir("Children's Minister, investigating.")],
      GRONNY: [say("GRONNY", "Prison's cold. Good. Shorts weather."), dir("For the first time in the campaign, you're dressed for the occasion.")],
      MIKEY: [say("MIKEY", "Prison? Easier than Fragmar."), dir("Everything is easier than Fragmar.")],
      BENN: [say("BENN", "Die fearless. What other option is there."), dir("Krezteua d'If has excellent acoustics. You make a mental note.")],
    },
    outro: [
      dir("Town Hall. The Archive terminals stop flickering. Every record now agrees on one thing: Krezmond was betrayed. By how many is still disputed. Everyone has agreed to dispute it forever."),
      say("KREBON", "It's settled. Three. Or four. It doesn't matter. He escaped. He's here.", { role: true, proctus: "It's settled! I escaped! Wait. He escaped. I'm Proctus." }),
      say("KREZWONK", "The Spectre's gone. The Krebon saga holds. Which means everything after it holds. Which means the Citadel can't keep the gates shut.", { role: true, proctus: "The ghost is gone! The gates are open! I prophesied that! Just now! Right as it happened!" }),
      ping("DRONGUS", "Fine."),
      ping("DRONGUS", "FINE."),
      ping("DRONGUS", "Come up then. All of you. Come to the Citadel. Let's see what you've got."),
      ping("DRONGUS", "Bring your thumbs."),
    ],
  },
  {
    n: 6,
    title: "THE GREAT WIKI CITADEL",
    subtitle: "Articles As Rooms · Deleted Text · The Reaction Network Terminal",
    dungeon: "citadel",
    dungeonDoor: "CITADEL",
    steps: [
      { id: "s_final", text: "Attend the Final Reading (Town Hall)", done: { flag: "final_reading" }, target: "TOWN_HALL" },
      { id: "s_hijack", text: "KRELMERGENCY: Flight KR-069 has been hijacked. Stop it at Krelford International (south-east gate) before it hits the Kreltower.", done: { flag: "kreltower_resolved" }, target: "AIRPORT" },
      { id: "s_dungeon", text: "Ascend the Great Wiki Citadel. React to the song.", done: { flag: "ch6_clear" }, target: "CITADEL" },
    ],
    intro: [
      dir("CHAPTER SIX. The Citadel gates are open. Through them you can see corridors made of wiki pages. One of the walls is the 'Krezzsplosion' article. It is very long. It is still being edited."),
      ping("DRONGUS", "There's a new sheriff in town boys…"),
      dir("Meanwhile, at Krelford International, a man in a balaclava with a stick-on moustache boards Flight KR-069 carrying a duty-free bag full of 'dirty bloody tricks'. Nobody stops him. The security guard is reacting to something."),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "Last time I went up against Drongus I got banned until the Queen died."), dir("This time, nobody's dying. Probably. Let's all be honest lads.")],
      KREZMAR: [say("KREZMAR", "I've got eleven Krezzcoin and an Uber Eats voucher. For the krelfund. For him."), dir("You hope it helps. You suspect it won't. You bring it anyway.")],
      KREBLIS: [say("KREBLIS", "This is a Krelmergency message. I repeat. This is the final Krelmergency message."), dir("Probably. There's always another one.")],
      KREZWONK: [say("KREZWONK", "I've foreseen this moment. I'm going to press a button. I've never pressed a button."), dir("The idea of Krezwonk is about to meet the man.")],
      SCROMBUS: [say("SCROMBUS", "I'm here 4 u. I said that. I meant it. I'm here to beat the shit out of u and then I'm here 4 u."), dir("Supportive during Lore creation. Supportive during Lore destruction.")],
      KREBON: [say("KREBON", "He asked who I was. Two years. He never waited for the answer."), dir("He's going to get it now.")],
      CRONGUS: [say("CRONGUS", "He tagged me in every post. @LIL' CRONGUS. Every one."), dir("You never once replied. Time to reply.")],
      GRONNY: [say("GRONNY", "He's still got my trousers."), dir("Final objective, revised: react to the song. Recover Krez-ousers.")],
      MIKEY: [say("MIKEY", "FGM ULTRA. One last op. Classification: extremely petty."), dir("As it should be.")],
      BENN: [say("BENN", "Be all the gay in the world, and the world will gay with you. I think it was Thin Lizzy who said that."), dir("It was not Thin Lizzy.")],
    },
    outro: [],
  },
];

export function chapterDef(n: number): ChapterDef {
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, n - 1))];
}
