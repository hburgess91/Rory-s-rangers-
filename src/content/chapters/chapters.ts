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
  /** Plays after the boss, back in Town Hall (chapters 2-6; chapter 1 uses the Krazy Fact meeting). */
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
      { id: "s_dungeon", text: "Enter Wildern Academy. Find Kranky Krandall, the zany new headmaster, and turn the Tap back on", done: { flag: "ch1_clear" }, target: "WILDERN" },
      { id: "s_bomb", text: "Wildern has to go. Plant 4 bombs around Wildern Academy and blow it up", done: { flag: "wildern_destroyed" }, target: "WILDERN" },
      { id: "s_report", text: "Report back to the Town Hall", done: { flag: "ch1_fact" }, target: "TOWN_HALL" },
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
      KREBLIS: [say("KREBLIS", "Breaking news…."), say("KREBLIS", "the sky is buffering 👍"), dir("You file it under Strange Occurrences. The filing cabinet is also buffering.")],
      KREZWONK: [say("KREZWONK", "I saw it. I read it. I listened to it. I said nothing. As foretold."), dir("You realise, with horror, that you foretold this specifically so you wouldn't have to do anything about it.")],
      SCROMBUS: [say("SCROMBUS", "I'm usually the one who replies. I'm the one who says 'hang in there bro'. Where was I?"), dir("You were fixing the Wonking Machine. Nobody reacted to that either. You understand him better than you'd like.")],
      KREBON: [say("KREBON", "He's never asked who I am and waited for the answer. Now he's stopped asking anything."), dir("You touch the hilt of your cane. Six Krez Years. You know what silence does to a man.")],
      CRONGUS: [say("CRONGUS", "He tagged me in it. @LIL' CRONGUS. I was going to reply. I was. I was lurking first."), dir("Lurking, it turns out, looks exactly like ignoring from the outside.")],
      GRONNY: [say("GRONNY", "I posted the leaf blower. It got a react. His song didn't."), dir("It's minus six. You're in shorts. You feel, for the first time in your life, slightly cold.")],
      MIKEY: [say("MIKEY", "I thought he was bluffing. He's always bluffing. FGM rule one."), dir("He wasn't bluffing. The Nuclear Option, it turns out, was his all along.")],
    },
    outro: [],
  },
  {
    n: 2,
    title: "THE INTERVENTION",
    subtitle: "The War Room · Lil' Crongus's Sofa · Polson Towers",
    dungeon: "polson_towers",
    dungeonDoor: "POLSON_ROAD",
    steps: [
      { id: "s_brief", text: "Stage the intervention (FGM War Room, under the Archive)", done: { flag: "fragmar_briefed" }, target: "ARCHIVE" },
      { id: "s_dungeon", text: "Go to Polson Towers and clear out the hoard. The router is in there somewhere.", done: { flag: "ch2_clear" }, target: "POLSON_ROAD" },
      { id: "s_report", text: "Report to the Town Hall", done: { flag: "ch2_fact" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("CHAPTER TWO. The Tap flows again, but the Reaction Network is still dark."),
      dir("And in the group chat, a message nobody was quite expecting — though everybody was."),
      ping("POLSON", "Hey dude, I'm afraid I have bad news"),
      ping("POLSON", "After a lot of thought it has been my decision to end things with Eden 😔"),
      ping("POLSON", "We're breaking up. She's moving out. It's a huge end to an era!!!"),
      ping("POLSON", "Also.. she told me she wants to take over my trust?? The house trust. Mum says absolutely not. Make no mistake"),
      ping("POLSON", "I'm ok tho!! Wbu? 😅"),
      say("KREBLIS", "Network trace came back… the main junction is inside Polson Towers. Nobody's been in there for months", { role: true, proctus: "The network goes through Polson's house! He hasn't reacted to anything in months! Not even my posts! Especially not my posts!" }),
      say("KREBLIS", "Polson's stopped reacting to anything. Even the otter memes", { cond: { notPlayer: "KREBLIS" } }),
      say("KREBLIS", "Results came back today…. Polson levels dangerously low…", { cond: { notPlayer: "KREBLIS" } }),
      say("KREZWONK", "He's back from America. Jet lagged. This needs the War Room.", { role: true, proctus: "This needs the War Room. I've never been allowed in the War Room." }),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "He's my mate. Whatever happens, he's got us."), dir("You mean it. That's new.")],
      KREZMAR: [say("KREZMAR", "This could easily be the plot for a three-part thriller on ITV."), dir("It could. It's about to be a dungeon instead.")],
      KREBLIS: [say("KREBLIS", "Couldn't someone just have a quiet word with Polson"), dir("Someone could. Several someones are about to.")],
      KREZWONK: [say("KREZWONK", "Tomorrow afternoon would be a prime time for an intervention."), dir("You said that in 2022. It's finally tomorrow afternoon.")],
      SCROMBUS: [say("SCROMBUS", "I joined in 2025. I've read the archive. I'm in. Whatever it is, I'm in."), dir("You've never been so sure about something you know so little about.")],
      KREBON: [say("KREBON", "Can somebody give me a quick cost/benefit analysis of the intervention."), dir("Cost: one awkward afternoon. Benefit: Polson. Nobody needs to say it.")],
      CRONGUS: [say("CRONGUS", "My place is free. I don't finish till six-ish, but he can go straight there."), dir("You've got a sofa, a kettle and a spare Toad in the Hole. You're ready.")],
      GRONNY: [say("GRONNY", "Polson's turning his phone off. He's getting very anxious and upset but he's with me if anyone needs him."), dir("You've said this exact sentence before. It still applies.")],
      MIKEY: [say("MIKEY", "I was right about all of it. Don't tell anyone I was right."), dir("Nobody tells anyone. It goes to your head anyway.")],
    },
    outro: [
      dir("Town Hall. The giant reaction display on the wall flickers back on. One by one, the reaction icons light up: 👍 ❤️ 😂 😡."),
      dir("The first reaction through the restored network, after months of nothing: ❤️ from POLSON."),
      say("KREBLIS", "The Network's back… the router was under the hoard the whole time", { role: true, proctus: "The network's back! Polson reacted to something! He reacted to MY post! ...he reacted to everyone's post." }),
      say("KREBLIS", "Polson's reacting again", { cond: { notPlayer: "KREBLIS" } }),
      say("KREBLIS", "Mostly thumbs up. To everything. Including the breakup. Classic 👍", { cond: { notPlayer: "KREBLIS" } }),
      say("POLSON", "(on the speakerphone) Lads!! Thank you. Genuinely. I owe you all ❤️"),
      say("POLSON", "I've got a list!! Gym. Get trim. Travelling. In that order. Papa Gino's first though 😅 The deed is done"),
      ping("DRONGUS", "Operation Polson"),
      ping("DRONGUS", "And you didn't even invite me"),
      say("SCROMBUS", "The pumps, though. The pussy juice pressure's still falling. Something's wrong at the Ministry of Boner Control.", { role: true, proctus: "The pumps are falling! At the Ministry of... the one with the name!" }),
      say("KREZWONK", "Before that. A Krazy Fact. The record demands one.", { role: true, proctus: "A Krazy Fact! I've got one! Proctus is six foot four! No? Fine. You do it." }),
      dir("In the wreckage: another scrap of map. 'TEMPLE OF THE LOGS — PIECE 2 OF 5'."),
      say("KREZWONK", "Five days left on the countdown."),
    ],
  },
  {
    n: 3,
    title: "THE CUDDLE CRONSTER",
    subtitle: "Sweet Hugs · Sweeter Squeezes · Da Squeezing Room",
    dungeon: "ministry",
    dungeonDoor: "MINISTRY",
    steps: [
      { id: "s_brief", text: "KRELMERGENCY at the Town Hall: the Cuddle Cronster has taken Mollor", done: { flag: "cronster_briefed" }, target: "TOWN_HALL" },
      { id: "s_dungeon", text: "Storm the Ministry of Boner Control. Climb to Da Squeezing Room, unmask the Cronster, rescue Mollor", done: { flag: "ch3_clear" }, target: "MINISTRY" },
      { id: "s_report", text: "Report to the Town Hall", done: { flag: "ch3_fact" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("CHAPTER THREE. Krelford is in the icy grip of terror. Every lamppost has a chocolate coin taped to it. Every coin says 'Sweet hugs, sweeter squeezes.'"),
      ping("FLENKY", "LADS"),
      ping("FLENKY", "MOLLORS GONE"),
      ping("FLENKY", "THERES A NOTE. ITS GOT A SMILEY FACE ON IT"),
      ping("FLENKY", "TOWN HALL NOW"),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "Mollor. My Mollor. Whoever this Cronster is, I'm going to burst him. One punch. Like the headmaster when I was four."), dir("You crack your knuckles. Something about the handwriting on the note looks… familiar. You decide not to think about it.")],
      KREZMAR: [say("KREZMAR", "Chocolate coins. He's flooding the market with chocolate coins. That's not a crime spree, that's a currency."), dir("You check the Krezzcoin price. It's down. The Cronster is shorting you.")],
      KREBLIS: [say("KREBLIS", "Strange occurrence…"), say("KREBLIS", "A man in a pink balaclava hugged a lamppost for nine hours 👍"), dir("You file it. The cabinet is getting full.")],
      KREZWONK: [say("KREZWONK", "I foresaw a hug. A long one. Too long."), dir("You shudder. You foresaw it too, now.")],
      SCROMBUS: [say("SCROMBUS", "The Ministry of Boner Control. Of all the buildings. He's done it on purpose."), dir("Of course he has.")],
      KREBON: [say("KREBON", "I've been cuddled against my will before. In Krezteua. Six Krez Years. Never again."), dir("You grip your cane.")],
      CRONGUS: [say("CRONGUS", "As Children's Minister, I've been asked to say: Mollor is nineteen. She's an adult. Please stop ringing me."), dir("You put the phone down. It rings again.")],
      GRONNY: [say("GRONNY", "Me no like cuddles. Me like Big Bertha."), dir("Big Bertha was last seen in the Ministry basement. Two birds. One stone.", { set: { bertha_hunt: true } })],
      MIKEY: [say("MIKEY", "Mikey here. If anyone tries to cuddle me I'm doing the camel."), dir("Nobody knows what that means. Everybody is scared of it.")],
    },
    outro: [
      dir("Town Hall. Mollor is home safe. The Ministry of Boner Control is back to controlling boners. Nobody asks how."),
      say("FLENKY", "I want it on the record. I was NOT the Cronster. That was a different Jenko.", { cond: { notPlayer: "FLENKY" } }),
      say("KREBLIS", "Breaking news…", { role: true, proctus: "Breaking news! It was Jenko! No it wasn't! Yes it was!" }),
      say("KREBLIS", "It was Jenko 👍", { cond: { notPlayer: "KREBLIS" } }),
      ping("DRONGUS", "Is the cuddle cronster the kuddle kronster ??"),
      ping("DRONGUS", "Does this go against convention"),
      ping("DRONGUS", "Also I want my crystal back"),
      say("KREZWONK", "Something's coming next. I've seen it in a dream. It was chewy. It was smiling at me. It had a glass eye.", { role: true, proctus: "I dreamt about a sweet! A chewy one! It winked at me! Is that bad? It felt bad." }),
      dir("In the wreckage: another scrap of map. 'TEMPLE OF THE LOGS — PIECE 3 OF 5'."),
      say("KREZWONK", "Four days left. The pieces are starting to line up."),
    ],
  },
  {
    n: 4,
    title: "NIBBLE ON A CROBLEY",
    subtitle: "Reinhardt Crobley · The Factory · Cum Crystal Number Four",
    dungeon: "crobley_factory",
    dungeonDoor: "CROBLEY_FACTORY",
    steps: [
      { id: "s_tv", text: "Something huge is on KrelTV, on every channel. Go home and put the telly on.", done: { flag: "vig_crobley_news" }, target: "HOME" },
      { id: "s_brief", text: "Krelmergency briefing in the FGM War Room (under the Archive): what do we do about Reinhardt Crobley?", done: { flag: "crobley_briefed" }, target: "ARCHIVE" },
      { id: "s_presser", text: "Sergeant Swig is holding a press conference about the live-TV murder. Krelford Constabulary.", done: { flag: "vig_crobley_presser" }, target: "POLICE" },
      { id: "s_dungeon", text: "Storm the Crobley Factory (the gate on the east edge of town). Kill Reinhardt. Take cum crystal number four.", done: { flag: "ch4_clear" }, target: "CROBLEY_FACTORY" },
      { id: "s_report", text: "Report to the Town Hall", done: { flag: "ch4_fact" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("CHAPTER FOUR. Crobley Corporation, makers of the nation's favourite chewy sweet, has a new boss: Reinhardt Crobley. Nobody has seen old Mr Crobson for a week. The new adverts have started. They are on every channel. All the time."),
      say("KREBLIS", "Breaking… something's wrong with the Crobley advert", { role: true, proctus: "Something's wrong with the Crobley advert! I've seen it forty times! I can't stop humming it! Help!" }),
      say("KREBLIS", "I can't stop humming it", { cond: { notPlayer: "KREBLIS" } }),
      say("KREBLIS", "Help", { cond: { notPlayer: "KREBLIS" } }),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "Crobleys were the only sweet my mum let me have. Which is why I was banned from the sweet shop. Twice."), dir("You put the telly on. You already know what's on.")],
      KREZMAR: [say("KREZMAR", "Crobley Corp shares are up four hundred percent since the advert started. I'm not saying I bought some. I'm saying I'm not NOT saying it."), dir("Krezmar, Minister of Money and Loans, has a conflict of interest. Several.")],
      KREBLIS: [say("KREBLIS", "Breaking news…"), say("KREBLIS", "the news is about to be broken 👍"), dir("You don't know what that means. Neither does Kreblis. It turns out to be accurate.")],
      KREZWONK: [say("KREZWONK", "I foresaw a sweet. A chewy one. With a face. Screaming."), dir("You thought it was a metaphor. It's never a metaphor.")],
      SCROMBUS: [say("SCROMBUS", "I installed a Wonking Machine in the cafeteria. Reinhardt installed one in every sweet. That's not the same. Is it? It's not."), dir("It's not. You check. It's not.")],
      KREBON: [say("KREBON", "Six Krez Years I dreamed of a Crobley. One Crobley. Now look at it."), dir("You touch the hilt of your cane. Some things are worth fighting for. Sweets, mainly.")],
      CRONGUS: [say("CRONGUS", "Children's Minister. Children's sweets. Children's advert. This is my jurisdiction."), dir("Lil' Crongus, ministering.")],
      GRONNY: [say("GRONNY", "Crobley. Me like Crobley."), dir("It's a whole personality. You respect it.")],
      MIKEY: [say("MIKEY", "FGM ULTRA. New target. Classification: chewy."), dir("Mikey's already made a lanyard.")],
    },
    outro: [
      dir("Town Hall. Everyone smells faintly of candy and sausage. Nobody mentions it."),
      say("KREBLIS", "Krelmergency over… Crobley Corp HQ is a crater", { role: true, proctus: "The factory's a crater! A sweet-smelling crater! I licked some of it! I shouldn't have!" }),
      say("KREBLIS", "Old Crobson's back in charge", { cond: { notPlayer: "KREBLIS" } }),
      say("KREBLIS", "Of a crater", { cond: { notPlayer: "KREBLIS" } }),
      say("SCROMBUS", "And Swig's taking full credit. Obviously.", { role: true, proctus: "And Sergeant Swig's taking the credit! Can he do that? He's doing it." }),
      ping("DRONGUS", "That was one of my best boys"),
      ping("DRONGUS", "Reinhardt had a lot of potential"),
      ping("DRONGUS", "Ok he shot a newsreader. Nobody's perfect"),
      say("KREZWONK", "Four crystals. Two to go. And something in the Krezz Arms back room is glowing.", { role: true, proctus: "Four crystals! Something's glowing in the pub! It's probably a lamp! It's always a lamp!" }),
      dir("In the wreckage of the factory: another scrap of map. 'TEMPLE OF THE LOGS — PIECE 4 OF 5'."),
    ],
  },
  {
    n: 5,
    title: "THE SANMIKVERSE",
    subtitle: "A Magic Lamp · Catford, Allegedly · Uncle Rik",
    dungeon: "arena_sanmik",
    dungeonDoor: "SANMIK_LAMP",
    steps: [
      { id: "s_question", text: "Attend 'The Krebon Question' at the Town Hall (it's not really about Krebon)", done: { flag: "krebon_question" }, target: "TOWN_HALL" },
      { id: "s_dungeon", text: "Rub SanMik's magic lamp in the Krezz Arms back room. Get to Catford. Defeat Uncle Rik for the fifth cum crystal", done: { flag: "ch5_clear" }, target: "PUB" },
      { id: "s_report", text: "Report to the Town Hall", done: { flag: "ch5_fact" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("CHAPTER FIVE. The back room of the Krezz Arms is glowing. Something in there smells of corn. Every few minutes, faintly, through the wall: 'yee'."),
      ping("DRONGUS", "Who the fuck is Krebon"),
      ping("DRONGUS", "Also who the fuck is SanMik"),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "I've been banned from the Krezz Arms back room twice. Once for being in it. Once for not being in it."), dir("You're going in anyway.")],
      KREZMAR: [say("KREZMAR", "A magic lamp. Wishes. Unlimited wishes, if you word it right. That's not a lamp, that's a Krelfund."), dir("Krelfund opportunity detected.")],
      KREBLIS: [say("KREBLIS", "Strange occurrence…"), say("KREBLIS", "A pub back room is now a different dimension 👍"), dir("You file it under 'Catford'.")],
      KREZWONK: [say("KREZWONK", "I wrote none of the SanMikverse. Nobody did. It writes itself. That's what scares me."), dir("Be careful what you lore.")],
      SCROMBUS: [say("SCROMBUS", "SanMik's discography is load-bearing lore now. Peener 4eva. Jerk My Gherk. GTA: SanMik. If he goes, the canon goes."), dir("Ministry of Lore: report to the back room.")],
      KREBON: [say("KREBON", "Six Krez Years in Krezteua d'If, and now a lamp. Fine."), dir("You grip your cane. Somewhere, very faintly: 'yee'.")],
      CRONGUS: [say("CRONGUS", "As Children's Minister I've been briefed on Uncle Rik. I need a shower. I need several."), dir("Children's Minister, investigating.")],
      GRONNY: [say("GRONNY", "Hot tub. Shorts. Finally."), dir("For the first time in the campaign, you're dressed for the occasion.")],
      MIKEY: [say("MIKEY", "I found the lamp. I want that on the record. Mikey found the lamp."), dir("It's on the record. Nobody reacted.")],
    },
    outro: [
      dir("Town Hall. The lamp sits on the table, cold and dark. SanMik and SanChz have come back with it. Both are wearing sunglasses indoors. Neither will say why."),
      say("SANMIK", "Yee."),
      say("SANCHZ", "YEGHHH."),
      say("KREZWONK", "Uncle Rik's out of the tub. The crystal's ours. The SanMikverse holds. Which means the canon holds. Which means Da Drongus Dungeon can't keep us out much longer.", { role: true, proctus: "The uncle's out! The crystal's in! The tub's empty! I prophesied that! Just now!" }),
      ping("DRONGUS", "Fine."),
      ping("DRONGUS", "FINE."),
      ping("DRONGUS", "Come up then. All of you. Bring your crystals. Bring your thumbs."),
      dir("In the wreckage: another scrap of map. 'TEMPLE OF THE LOGS — PIECE 5 OF 5'."),
      say("KREZWONK", "All five. The Temple of the Logs is at the very top. Behind the song. We go tomorrow."),
      dir("Tomorrow, as it turns out, has other plans."),
    ],
  },
  {
    n: 6,
    title: "THE KREDDLE EXPRESS",
    subtitle: "President Klerble · A Train · Flight KR-069",
    dungeon: "airport",
    dungeonDoor: "AIRPORT",
    steps: [
      { id: "s_brief", text: "KRELMERGENCY: the lads are glued to the telly in the FGM War Room (under the Archive). Something's on GB Krews.", done: { flag: "arcstep_arc_klerble_brief" }, target: "ARCHIVE" },
      { id: "s_dungeon", text: "Get to Krelford International, get on Flight KR-069 and fly it into the Kreddle Express before it reaches the Krel Tower", done: { flag: "kreltower_resolved" }, target: "AIRPORT" },
      { id: "s_meeting", text: "KRELMERGENCY: the Krel Tower is gone. Emergency meeting at the Town Hall", done: { flag: "revenge_meeting" }, target: "TOWN_HALL" },
      { id: "s_raid", text: "Lead the Krew over the Kreddle Bridge (far west). Revenge. Chemical. Total.", done: { flag: "nuke_planted" }, target: "KREDDLE_BRIDGE" },
      { id: "s_return", text: "THE NUKE IS ARMED. Get back to the Town Hall before it blows!", done: { flag: "ch6_clear" }, target: "TOWN_HALL" },
    ],
    intro: [
      dir("CHAPTER SIX. You were on your way up to Da Drongus Dungeon. Crystals in your pocket. Thumbs ready. Then every telly in Krelford switched itself on at once."),
      dir("It's Kreddle. It's President Klerble. He's smiling. That's never good."),
      ping("DRONGUS", "Oh for fuck's sake"),
      ping("DRONGUS", "I was READY. I'd done my hair"),
      ping("MIKEY", "War Room. Now. It's on GB Krews"),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "Mollor works on the top floor of the Krel Tower. If Kreddle so much as looks at it, I'm going dark again."), dir("You check you've still got the mask. You've still got the mask.")],
      KREZMAR: [say("KREZMAR", "Kreddle. Their entire economy is betting. I respect it. I hate it. I respect it."), dir("Krelfund exposure to Kreddle: considerable.")],
      KREBLIS: [say("KREBLIS", "Krelmergency…"), say("KREBLIS", "Kreddle is on the telly 👀"), dir("The Kreddle Krunchers took Mikey's bongo. This is personal now.")],
      KREZWONK: [say("KREZWONK", "I have foreseen a train. I don't know why. I've never foreseen a train before."), dir("The vision is very loud. It goes 'YES! YES! YESSS!'")],
      SCROMBUS: [say("SCROMBUS", "Whatever Kreddle's doing, we do it bigger. That's the policy. I just made it the policy."), dir("Minister for Policy, apparently.")],
      KREBON: [say("KREBON", "Kreddle. Seven Krez Years in a casino, their lot. Voluntarily. You can't reason with people like that."), dir("You could turn the power off, though. Nobody will let you.")],
      CRONGUS: [say("CRONGUS", "Lil' Krungus said he's littler than me. I'm not having that. I'm the littlest. I've always been the littlest."), dir("A grudge, in miniature.")],
      GRONNY: [say("GRONNY", "Grenny copy me. Grenny say waa waa wee waa. That MY waa waa wee waa."), dir("Somewhere over the bridge, Grenny is saying it wrong.")],
      MIKEY: [say("MIKEY", "They took Polson's shake. Then they took Polson's dignity. Now they want the Tower."), dir("FGM Operation: Get The Shake Back. Classification: deeply personal (to Polson).")],
    },
    outro: [
      dir("Town Hall. Somebody has stuck a Kreddle Express ticket to the noticeboard. It's a one-way. It's been punched."),
      say("KREZMAR", "Well. The train's stopped. The Kreddle Krunchers are going to hear about this."),
      say("MIKEY", "Good. Tell them I want my bongo back.", { variants: { MIKEY: "Good. Tell them Polson wants his shake back." } }),
      say("KREZWONK", "Six crystals. All six. The vision's gone quiet. It's never quiet.", { role: true, proctus: "Six crystals! The vision's gone quiet! I've never heard it quiet! I don't like it!" }),
      ping("DRONGUS", "Right"),
      ping("DRONGUS", "Done with your little train?"),
      ping("DRONGUS", "Come up then. All of you. Bring your crystals. Bring your thumbs."),
      say("KREZWONK", "Da Drongus Dungeon. The Temple of the Logs is at the very top. Behind the song."),
    ],
  },
  {
    n: 7,
    title: "DA DRONGUS DUNGEON",
    subtitle: "Six Crystals · The Tower · The Tannoy · The Anthem · The Top",
    dungeon: "citadel",
    dungeonDoor: "CITADEL",
    steps: [
      { id: "s_final", text: "Attend the Final Reading (Town Hall)", done: { flag: "final_reading" }, target: "TOWN_HALL" },
      { id: "s_dungeon", text: "Six cum crystals, six slots. Open Da Drongus Dungeon and climb to the very top. Find the lads.", done: { flag: "ch7_clear" }, target: "CITADEL" },
    ],
    intro: [
      dir("CHAPTER SEVEN. The Citadel gates are open. Through them: black stone, stained glass, server racks humming in the dark, and a staircase going up into the storm."),
      ping("DRONGUS", "There's a new sheriff in town boys…"),
    ],
    playerScene: {
      FLENKY: [say("FLENKY", "Last time I went up against Drongus I got banned until the Queen died."), dir("This time, nobody's dying. Probably. Let's all be honest lads.")],
      KREZMAR: [say("KREZMAR", "I've got eleven Krezzcoin and an Uber Eats voucher. For the krelfund. For him."), dir("You hope it helps. You suspect it won't. You bring it anyway.")],
      KREBLIS: [say("KREBLIS", "This is a Krelmergency message. I repeat. This is the final Krelmergency message"), say("KREBLIS", "Wait…sorry…"), say("KREBLIS", "I've got one more after this"), dir("Probably. There's always another one.")],
      KREZWONK: [say("KREZWONK", "I've foreseen this moment. I'm going to press a button. I've never pressed a button."), dir("The idea of Krezwonk is about to meet the man.")],
      SCROMBUS: [say("SCROMBUS", "I'm here 4 u. I said that. I meant it. I'm here to beat the shit out of u and then I'm here 4 u."), dir("Supportive during Lore creation. Supportive during Lore destruction.")],
      KREBON: [say("KREBON", "He asked who I was. Two years. He never waited for the answer."), dir("He's going to get it now.")],
      CRONGUS: [say("CRONGUS", "He tagged me in every post. @LIL' CRONGUS. Every one."), dir("You never once replied. Time to reply.")],
      GRONNY: [say("GRONNY", "He's still got my trousers."), dir("Final objective, revised: react to the song. Recover Krez-ousers.")],
      MIKEY: [say("MIKEY", "FGM ULTRA. One last op. Classification: extremely petty."), dir("As it should be.")],
    },
    outro: [],
  },
];

export function chapterDef(n: number): ChapterDef {
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, n - 1))];
}
