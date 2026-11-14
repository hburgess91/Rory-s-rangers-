import type { Line } from "../data/types";
import { dir, ping, say } from "./dsl";

// CHAPTER 6: THE KREDDLE EXPRESS — the cutscenes (VignetteScene). Everything here is fictional, cartoonish and stupid.
// Speaker ids are the lads' ids; "YOU" is whoever you're playing as.

// ---------------------------------------------------------------- klerble_train: meanwhile, in Kreddle

export const KT_OPEN: Line[] = [
  dir("MEANWHILE, IN KREDDLE. Kreddle Central Station: forty platforms, a slot machine at every one, and a departure board that only ever says 'JACKPOT'."),
  say("STATION ANNOUNCER", "Ding-dong. The 6:66 Kreddle Express to Krelworld is delayed due to: the President wanting it."),
  say("KREDDLER", "He's coming! He's COMING!! THE PRESIDENT IS COMING!!"),
];

export const KT_ARRIVE: Line[] = [
  say("PRESIDENT KLERBLE", "YES! YES! YESSS!"),
  say("KREDDLER", "I touched his epaulette! I'm never washing my hand again! I've never washed it anyway!"),
  say("KREDDLER", "KLERBLE! KLERBLE! He bet the railway and WON it back by lunchtime!"),
  say("PRESIDENT KLERBLE", "People of Kreddle! Today your President does what no President has ever done!"),
  say("PRESIDENT KLERBLE", "I am going to drive a train… into Krelworld… and see what happens!"),
  say("KREDDLER", "THE BRAVEST MAN WHO HAS EVER LIVED!!"),
];

export const KT_DRIVER: Line[] = [
  say("TRAIN DRIVER", "Mr President, sir, with respect, I'm the driver, and this is the 6:66 to—"),
  say("PRESIDENT KLERBLE", "YES!"),
  dir("President Klerble picks the driver up by his lanyard and posts him through the window of a slot machine. It pays out three cherries."),
  say("TRAIN DRIVER", "(from inside the slot machine) …that's fair actually."),
  say("PRESIDENT KLERBLE", "I commandeer this train in the name of KREDDLE! And of gambling! And of ME!"),
];

/** The Krunchers on the platform. Written to make you hate them. */
export const KT_KRUNCHERS: Line[] = [
  dir("On the platform, in matching neon varsity jackets: the Kreddle Krunchers. They've brought banners. One of the banners has a drawing of the Krel Tower on fire, and it's quite good."),
  say("KLENKY", "GO ON MR PRESIDENT!! RAM IT RIGHT UP THE KREL TOWER!!"),
  say("SKROMBUS", "I hope it goes straight through the middle! I hope it kills LOADS of civilians!!"),
  say("GRENNY", "Kill the pensioners! Kill the dog walkers! Kill the man who sells fizzy bongos!!"),
  say("KREDBLIS", "Breaking news… Krelworld is about to be fucking flattened 👍"),
  say("KREDMAR", "Their whole economy is that Tap. Smash the tower, piss in the Tap again, and they're finished. Bankrupt. I'll buy the rubble."),
  say("LIL' KRUNGUS", "I hope it lands on that Mikey. We already battered him once. Let's see if he bounces!", { variants: { MIKEY: "I hope it lands on that Polson. We already battered him once. Let's see if he bounces!" } }),
  say("MIKKY K", "Oi, Mr President! Bring us back a Krelworlder's head! I want it for my mantelpiece, you fucking legend!"),
  say("KREDWONK", "I have foreseen it. Fire. Screaming. Loads of screaming. Hehe. Such lovely screaming."),
  say("KREDBON", "And if any of 'em survive, we'll go over that bridge and piss on what's left."),
  dir("Kredbon unzips, right there on the platform, and pisses on a little Krelworld flag that Lil' Krungus is holding out for him. The Kreddlers applaud. Somebody films it for the group chat."),
  say("KLENKY", "KRUNCHERS RULE! KRELWORLD DIES!"),
  say("ALL KRUNCHERS", "KRUNCHERS RULE! KRELWORLD DIES!!"),
];

export const KT_DEPART: Line[] = [
  say("PRESIDENT KLERBLE", "Full speed! Fuller than full speed! Put it on RED!"),
  say("PRESIDENT KLERBLE", "YES! YES! YESSSSSSS!!"),
  say("STATION ANNOUNCER", "Ding-dong. The Kreddle Express is now departing. Please stand back from the edge of the platform. Or don't. This is Kreddle."),
];

export const KT_AFTER: Line[] = [
  dir("The Kreddle Express screams out of the station and onto the Kreddle Bridge, towards Krelworld, at three hundred miles an hour. The Krunchers are still waving. They're waving with both hands. And they're both middle fingers."),
  say("KREDDLER", "That's our President! He'll show those Tap-lickers!"),
  dir("You will remember their faces. Every single one of them."),
  ping("DRONGUS", "Who's watching GB Krews right now"),
  ping("DRONGUS", "Those Kruncher cunts are cheering"),
  ping("DRONGUS", "Unbelievable"),
];

// ---------------------------------------------------------------- plane_escape: the rain

export const PE_RAIN: Line[] = [dir("It has started to rain. Big, warm, heavy Krelford rain. Nobody brought a coat. Nobody ever brings a coat.")];

// ---------------------------------------------------------------- revenge_meeting: the emergency meeting at the Town Hall

export const RM_OPEN: Line[] = [
  dir("Krelford Town Hall. That night. An Emergency Meeting of the Krelworld Krew. Outside it is still raining. Inside, nobody has taken their coat off, because nobody brought a coat."),
  dir("There is still dust in everyone's hair. Some of it is the Krel Tower."),
  say("SCROMBUS", "I call this emergency meeting to order. Minutes: the Krel Tower is gone. Item one: the Krel Tower is gone."),
];

export const RM_JENKO: Line[] = [
  say("FLENKY", "MOLLOR!!! MOLLOR WAS IN THERE!!!"),
  say("FLENKY", "My sweet 19 year old flirtkitten!! She worked on the TOP FLOOR!! She had a LANYARD!!"),
  say("FLENKY", "She used to send me a picture of the view every lunchtime! Every lunchtime! Now what's she going to send me? RUBBLE?!"),
  say("GRONNY", "Me sorry about flirtkitten."),
  say("FLENKY", "DON'T CALL HER THAT. ONLY I CALL HER THAT."),
  say("KREZMAR", "Jenko. Mate. Breathe. In through the nose."),
  say("FLENKY", "I'M GOING DARK AGAIN. I'VE STILL GOT THE MASK."),
];

export const RM_REVENGE: Line[] = [
  say("SCROMBUS", "We need to take revenge on Kreddle!!!! They destroyed the Krel Tower!!!"),
  say("KREZMAR", "YES!!"),
  say("MIKEY", "YES. Revenge. FGM rules of engagement: there are none."),
  say("GRONNY", "Me want revenge. Revenge good."),
  say("KREBLIS", "Breaking news…"),
  say("KREBLIS", "Revenge 👍"),
  say("KREZWONK", "I have foreseen it. A great vengeance. With loads of fire in it."),
  say("CRONGUS", "Yeah! Revenge!! …On Kreddle! For the tower!"),
];

/** Kreblis has been saying "we should just invade Kreddle" in every briefing since the first one. */
export const RM_KREBLIS: Line[] = [
  say("SCROMBUS", "So it's agreed. We invade Kreddle."),
  say("KREBLIS", "…"),
  say("KREBLIS", "FINALLY!!!!"),
  say("KREBLIS", "I'VE BEEN SAYING THIS SINCE THE VERY FIRST MEETING!!"),
  say("KREBLIS", "Breaking news… WE'RE INVADING KREDDLE 👍👍👍👍"),
  dir("Kreblis is crying. Actual tears. He's hugging the radiator."),
  say("KREZMAR", "You said it every single meeting. We told you to shut the fuck up about it every single meeting."),
  say("MIKEY", "…Alright. Alright. Kreblis was right."),
  say("KREBLIS", "Can I get that in the minutes 👍"),
  say("SCROMBUS", "Absolutely not."),
];

export const RM_ACTUALLY: Line[] = [
  dir("A small, quiet voice from the back of the hall."),
  say("KREBON", "Um. Sorry. Just to say. It wasn't actually Kreddle who crashed into the Krel Tower.", { cond: { notPlayer: "KREBON" } }),
  say("KREBON", "It was you. You flew the plane into it. We all watched. You waved.", { cond: { notPlayer: "KREBON" } }),
  say("PROCTUS", "Um. Sorry. Just to say. It wasn't actually Kreddle who crashed into the Krel Tower. It was you. You flew the plane into it. We all watched. You waved.", { cond: { player: "KREBON" } }),
  dir("Silence. Every head in the Town Hall turns, very slowly, towards you."),
  say("YOU", "I had no choice!! They made me do it! Their President pointed a TRAIN at us! What was I supposed to do, NOT fly a plane into the Krel Tower?!"),
  say("YOU", "And plus, we hate them anyway so this is a great excuse to kill them finally!"),
  dir("A pause. Then, slowly, everybody nods. It's a good point. It's the best point anybody has ever made in this Town Hall."),
  say("KREZMAR", "He's right. Technically it's Kreddle's fault for having a train."),
  say("KREBON", "We could have turned the power off.", { cond: { notPlayer: "KREBON" } }),
  say("EVERYONE", "SHUT UP KREBON."),
];

export const RM_CHEM: Line[] = [
  say("MIKEY", "Right. FGM ops. I've been thinking about this since Fragmar. Proper retaliation."),
  say("MIKEY", "Chemical weapons attack. On Kreddle. All of it. Tonight."),
  say("KREZMAR", "YESSSSSS!"),
  say("GRONNY", "YESSSS!"),
  say("SCROMBUS", "HA HA YES !! DIEEE!"),
  say("KREZWONK", "YESSSSSSSSS!!"),
  say("FLENKY", "FOR MOLLOR!! YESSSSS!!"),
  say("KREBLIS", "Yes 👍"),
];

export const RM_LUKE: Line[] = [
  say("CRONGUS", "Erm. Guys. Lads. Hang on."),
  say("CRONGUS", "As Children's Minister I have to say something. Chemical weapons are forbidden. Under the Krelneva Convention."),
  say("CRONGUS", "Krelworld signed it! I signed it! I did a little drawing of a dove next to my name!"),
  dir("Krezmar slowly stands up. He reaches into his inside pocket. He takes out a document. It's laminated. He's been carrying it around specifically for this moment."),
  say("KREZMAR", "ERES WHAT I FINK OF YOUR PRECIOUS KRELNEVA CONVENTION"),
];

export const RM_PISS: Line[] = [
  dir("Krezmar unzips and pisses all over the Krelneva Convention. Every article. Every sub-clause. The little dove."),
  say("KREZMAR", "Article one: pissed on. Article two: pissed on. Article three…"),
  say("KREZMAR", "…also pissed on."),
];

export const RM_THROW: Line[] = [say("CRONGUS", "MY DOVE!!!")];

export const RM_SHOVE: Line[] = [
  say("KREZMAR", "YEAH LUKE!"),
  say("MIKEY", "YEAH LUKE!!"),
  say("GRONNY", "YEAH LUKE!"),
  say("FLENKY", "YEAH LUKE!! MOLLOR WOULD HAVE WANTED THIS!!"),
  say("KREBLIS", "Yeah Luke 👍"),
];

export const RM_UNITE: Line[] = [
  say("SCROMBUS", "STOP!!! STOP IT!!! ALL OF YOU!!!"),
  say("SCROMBUS", "What have we become!! Krelworld was supposed to bring us together, and look at what we're doing to each other!"),
  say("SCROMBUS", "We need to unite in destroying Kreddle with chemical weapons!!!"),
  dir("A single tear runs down Gronny's face. Somebody helps Lil' Crongus up. He still smells of Krezmar."),
  say("CRONGUS", "…Okay. Yeah. Sorry lads. Chemical weapons it is."),
  say("KREZMAR", "That's the spirit, Luke. No hard feelings. Here, have your convention back."),
  say("CRONGUS", "It's wet."),
];

export const RM_CAUTION: Line[] = [
  say("KREBLIS", "Breaking news…", { cond: { notPlayer: "KREBLIS" } }),
  say("KREBLIS", "Kreddle is the most heavily armed universe nearby. Lots of bombs and other things which could explode Krelworld 👍", { cond: { notPlayer: "KREBLIS" } }),
  say("SCROMBUS", "Point of order. Kreddle is the most heavily armed universe nearby. Lots of bombs and other things which could explode Krelworld.", { cond: { player: "KREBLIS" } }),
  say("MIKEY", "Who cares! They'll never beat us!!"),
  say("GRONNY", "They never beat us!!"),
  say("KREZMAR", "Never! They're a load of Kreddle cunts with sequins on!"),
  say("FLENKY", "They don't have the BALLS!!"),
  say("EVERYONE", "THEY'LL NEVER BEAT US!!"),
];

export const RM_ARMS: Line[] = [
  say("KREBON", "Funny story, actually. I won a load of chemical weapons in Kreddle recently. On the slots. Three skulls in a row.", { cond: { notPlayer: "KREBON" } }),
  say("KREZMAR", "Funny story, actually. I won a load of chemical weapons in Kreddle recently. On the slots. Three skulls in a row.", { cond: { player: "KREBON" } }),
  dir("He drags a big wooden crate into the middle of the Town Hall. It's stamped KREDDLE PRIZE — DO NOT OPEN IN KRELWORLD. He opens it in Krelworld."),
  say("KREBON", "This one's for you. Chemical Flamethrower. Green fire. It says 'banned' on it in nine languages.", { cond: { notPlayer: "KREBON" } }),
  say("KREZMAR", "This one's for you. Chemical Flamethrower. Green fire. It says 'banned' on it in nine languages.", { cond: { player: "KREBON" } }),
];

export const RM_GOT_GUN: Line[] = [
  dir("YOU GOT: THE CHEMICAL FLAMETHROWER. It hums. It's warm. It smells of a swimming pool on fire."),
  say("YOU", "…Oh, this is lovely."),
];

export const RM_SHOWOFF: Line[] = [
  say("MIKEY", "Napalm. Six barrels. Fragmar surplus. Don't ask how. Don't ask why it's sticky."),
  say("GRONNY", "Me got yellow gas. Mustard gas. Me no like mustard. Kreddle no like mustard either soon."),
  say("CRONGUS", "…I've got nail bombs. I made them in Children's Ministry arts and crafts. Some of them have glitter on."),
  say("FLENKY", "Luke!"),
  say("CRONGUS", "What? I'm uniting!"),
  say("KREBLIS", "Breaking news… I have a bucket 👍"),
  say("SCROMBUS", "Of what?"),
  say("KREBLIS", "Just a bucket 👍"),
];

export const RM_NUKE: Line[] = [
  say("KREZWONK", "I have foreseen tonight. Which is why, three weeks ago, I went to Kreddle and won this on the Wheel of Kreddle."),
  dir("Krezwonk pulls a tarpaulin off something in the corner. It is a nuclear bomb. It has a little bow on it."),
  say("KREZWONK", "A nuclear bomb."),
  say("KREZMAR", "Matt. MATT. Why have you had a nuclear bomb in the Town Hall for three weeks."),
  say("KREZWONK", "I've been using it as a footstool. Tonight I'm going to plant it at the presidential palace. To kill President Klerble."),
  say("MIKEY", "Fuckin' 'ell. Yes."),
  say("GRONNY", "Big boom. Me like big boom."),
  say("KREBON", "Should we maybe— no. No. Forget it.", { cond: { notPlayer: "KREBON" } }),
];

export const RM_HANDS: Line[] = [
  say("SCROMBUS", "Then it's settled. Tonight we march on Kreddle. Over the bridge, through the strip, all the way to the palace."),
  say("FLENKY", "For Mollor."),
  say("KREZMAR", "For the Krel Tower."),
  say("MIKEY", "For my bongo.", { variants: { MIKEY: "For Polson's shake." } }),
  say("CRONGUS", "For… the Krelneva Convention?"),
  say("EVERYONE", "NO."),
  say("SCROMBUS", "Hands in. Everybody. Hands in the middle."),
];

export const RM_END: Line[] = [
  say("SCROMBUS", "Krelworld Krew unite!"),
  say("EVERYONE", "KRELWORLD KREW UNITE!!!"),
  say("KREBLIS", "WE'RE INVADING KREDDLE!!! 👍👍👍👍👍 I SAID IT!!! I SAID IT AT THE FIRST MEETING!!!"),
  say("KREZMAR", "Yes, Kreblis. Shut the fuck up about it."),
  dir("They march out of the Town Hall into the rain. Destination: Kreddle. Lead the way."),
];

// ---------------------------------------------------------------- krunch_protocol: hubris, and the Krunch Protocol

export const KP_PARTY: Line[] = [
  dir("Krelford Town Hall. Everyone made it back over the bridge. Everyone is soaking wet, slightly on fire, and ecstatic."),
  say("MIKEY", "WE DID IT!! WE ACTUALLY FUCKING DID IT!!"),
  say("KREZMAR", "Did you see the Krunchers?! ASHES!! LITTLE PILES OF SEQUINNED ASH!!"),
  say("FLENKY", "That was for you, Mollor!! My sweet flirtkitten!! WOOOO!!"),
  say("GRONNY", "Kreddle go boom soon. Me happy."),
  say("SCROMBUS", "Minutes of the meeting: we won. Everything. Forever."),
  say("KREBON", "Should we be worried they'll… you know. Retaliate?", { cond: { notPlayer: "KREBON" } }),
  say("KREZMAR", "Retaliate?! They'll never retaliate!! They don't have the BALLS!!"),
  say("MIKEY", "They don't have the BALLS!!"),
  say("GRONNY", "No balls! Kreddle no balls!"),
  say("KREBLIS", "Breaking news…", { cond: { notPlayer: "KREBLIS" } }),
  say("KREBLIS", "Kreddle has no balls 👍", { cond: { notPlayer: "KREBLIS" } }),
  say("KREZWONK", "I have foreseen it. They'll never retaliate. Not in a million years. I'm never wrong.", { cond: { notPlayer: "KREZWONK" } }),
  say("YOU", "WE ARE UNTOUCHABLE!!"),
  say("EVERYONE", "UNTOUCHABLE!!!"),
];

export const KP_KLERBLE: Line[] = [
  dir("MEANWHILE, IN THE PRESIDENTIAL PALACE OF KREDDLE. The lights are flickering. The gold is melting. The fire alarm has given up."),
  dir("Across the floor, leaving a long red smear on the marble, crawls President Klerble."),
  say("PRESIDENT KLERBLE", "Yes… yes… yesss…"),
  dir("He reaches the desk. He drags himself up by the cable. A single bloody finger finds the keyboard."),
  dir("On the screen: a red folder. It says KRUNCH. He has never been allowed to open it. He opens it."),
];

export const KP_LAST: Line[] = [say("PRESIDENT KLERBLE", "Initiate…. the… 'Krunch Protocol'")];

export const KP_RUINS: Line[] = [
  dir("When the light clears, there is no Kreddle. There is no strip, no casino, no Klerble Grand. There is ash, and fire, and a sky the colour of blood."),
  dir("Bits of slot machine are still raining down. A single Kroken lands, spinning, at the edge of the crater. It comes up tails."),
];

export const KP_PROTOCOL: Line[] = [
  dir("Then, out of the ash: a hum. A whirr. Hatches opening in the rubble."),
  say("KRUNCH PROTOCOL", "KRUNCH PROTOCOL INITIATED. PRESIDENTIAL HEARTBEAT: NONE. RETALIATION: AUTHORISED."),
  say("KRUNCH PROTOCOL", "TARGET ACQUIRED: KRELWORLD. ALL OF IT."),
  say("KRUNCH PROTOCOL", "HAVE A KRAZY KREDDLE NIGHT. YES. YES. YESSS."),
];

// ---------------------------------------------------------------- townhall_party: WE DID IT

export const TP_OPEN: Line[] = [
  dir("Krelford Town Hall. The victory party. SanMik and SanChz have been booked. Two strippers have been booked. They've kept their costumes on, because Krelford Council has rules, and the rules are laminated.", { variants: { MIKEY: "Krelford Town Hall. The victory party. You (as SanMik) and SanChz have been booked. Two strippers have been booked. They've kept their costumes on, because Krelford Council has rules, and the rules are laminated." } }),
  say("SANMIK", "Yee! 'Ello Krelford, you fucking legends! This one's called Gettin Crunk Wiv SanChz! It's about Kreddle being DEAD!"),
  say("SANCHZ", "Mork."),
];

export const TP_DANCE: Line[] = [
  say("MIKEY", "YEEE YEE!!"),
  say("KREZMAR", "WE DID IT!!"),
  say("FLENKY", "YEEE YEE!! THIS ONE'S FOR MOLLOR!!"),
  say("GRONNY", "Me dance! Me dance good!"),
  say("KREBLIS", "Breaking news… WE DID IT 👍"),
  say("SCROMBUS", "Somebody get Krebon off the speaker stack!"),
  say("KREBON", "I'M NOT TURNING ANYTHING OFF EVER AGAIN!!"),
  say("CRONGUS", "I'm uniting!! I'M UNITING SO HARD!!"),
  say("KREZWONK", "I have foreseen this party. It's the best party there will ever be. It goes on forever. Nothing bad happens."),
  say("EVERYONE", "WE DID IT!! YEEE YEE!!"),
];

export const TP_DOOM: Line[] = [
  dir("Above the music, very faintly: a whistle. Getting louder. Getting much louder."),
  say("KREBON", "…Does anyone else hear whistling?", { cond: { notPlayer: "KREBON" } }),
  say("KREZWONK", "Oh. Oh no. I've just foreseen something."),
];

export const TP_END: Line[] = [
  dir("…"),
  dir("Silence."),
  ping("DRONGUS", "Hello ?"),
  ping("DRONGUS", "Anyone ??"),
  ping("DRONGUS", "Lads ?"),
];
