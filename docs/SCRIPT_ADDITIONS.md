# Script additions since the script export

The owner is editing the script that was exported to the "KRELWORLD Script" doc (and the .docx files) on
2026-11-13, from commit `b462c63`. Anything written AFTER that export is not in his copy. When his edited
script comes back, apply his edits AND keep every line below (and anything added after this file was last
updated). To list every dialogue line added or changed since the export:

    git diff b462c63 -- src/content src/game/scenes src/data | grep -E '^\+.*(say|dir|ping|canon)\("'

## What's new since the export (by area)

- **Robbo crashes the Cuddle Cronster briefing** (src/content/meetings/laterMeetings.ts, CRONSTER_BRIEFING):
  he wants into the crew "and all my new cultured friends can be part of it too", the lads call him a pedo,
  the whole cabinet beats him up (staged in the room: fx robbo_enter / robbo_beatup / robbo_leave), and he
  crawls out: "I'm moving in with my drug addict father who married a much younger woman because he's a piece
  of shit! He's my HERO!"
- **Playing as Mikey** (Kreblar): second-person variants of Mikey's lines, Polson as the Kreddle Krunchers'
  victim (src/content/krunchers.ts, ch6.ts, chapters.ts, arcs.ts, dialogue/npc.ts).
- **Beat-up whines** (src/content/beatup.ts): what the victim says while the lads batter him in town.
- **SanMik-ified Mikey** (src/game/systems/sanmikify.ts): when Mikey is SanMik his lines get "u/ure/wiv/tha",
  YEEs, "u fucking CUNTZ", "yeee am horney", catchphrases and song snatches added on the fly. These are
  generated, not script lines; edit the lists in that file to change them.
- **Voiced boss cries**: the Cuddle Cronster's and Robbo's fight taunts (src/content/bosses.ts `taunts`) are
  now recorded. If you change a taunt's wording, it must be re-recorded (public/audio/*_taunt.mp3).
- **Alistair Swamp at the Wonky Pole** (src/game/scenes/ClubScene.ts, ALLY_LINES / ALLY_REPLIES): "hi",
  "hey", "u there?" … and the dancers' replies ("No.", "Security.", "I can see you, Alistair.").
- **The Concept of Paedophilia's wizard** says "Yeeeee…" captions (src/game/combat/ConceptBoss.ts).
- **Popping round Polson Towers** (src/content/polsonChats.ts, generated from Harry's real Messenger chats with
  Polson: 33 conversations, verbatim, names swapped) plus the arrival lines and Polson's GTA 5 confessions
  (POLSON_GTA: "I've been wanking over the strip clubs in GTA 5").
- **Golden juice squeeze** is now a button game; her "…is that it? Never mind, love." on a fail (src/game/systems/squeeze.ts).
- **First-dungeon tutorial** text (src/game/scenes/TutorialScene.ts).
- **Front-row wonking at the Wonky Pole** (src/game/scenes/ClubScene.ts, WONK_LINES / WONK_DONE): "mm",
  "mm fuck", "I love wonking", "this is so dirty mm".
- **Salem witch museum flashback** in the Fragmar briefing (src/content/meetings/laterMeetings.ts, fx salem_on … salem_off).
- **Beep Show re-edit** (src/content/television/extra/beepShow.ts, src/game/scenes/TVPov.ts): POV staging,
  voiced inner monologues; the "relaxing episode of Beep Show" you must watch at home at the start of Chapter 4 (HomeScene).
- **Wildern staff** (src/data/enemies.ts): Supply Teacher, PE Teacher and head of year Mr. Port E. Us, with their shouts.
- **Polson is killed in Krelburger** (Chapter 6, src/content/ch6.ts): KB_QUEUE / KB_SHOT / KB_ORDER (President
  Klerble won't queue behind fat Polson, shoots him with a roulette-wheel revolver and orders "whatever he was
  having"); RM_POLSON (the lads watch the CCTV at the revenge meeting and grieve: "He was nearly at the front");
  "For Polson!" added to RM_REVENGE and the raid shouts (src/content/raid.ts); POLSON_GONE (his house afterwards).
  From then on Polson no longer appears in town, at his house, or in crowds.

## Every dialogue line added or changed since the export (snapshot)


### src/content/arcs.ts
    dir("The FGM War Room. Everyone is crammed round the telly. Mikey has the remote. Mikey has always got the remote.", { variants: { MIKEY: "The FGM War Room. Everyone is crammed round the telly. You have the remote. You have always got the remote." } }),
    step: { kind: "vignette", id: "polson_cctv", intro: [dir("A message from Polson: 'At the gym again 💪 might be a while'."), dir("Mikey's FGM War Room has a camera on everything. You pull up the Polson Towers feed. Just to check.", { variants: { MIKEY: "Your FGM War Room has a camera on everything. You pull up the Polson Towers feed. Just to check." } })] },
    dir("Your laptop. Facebrook. A notification: 'You have been removed from SAINTS vs POMPEY BANTER (18+).' Under it, nine more identical notifications, going back years."),
    dir("You ate all the pizza."),
    dir("The Krezz Arms payphone. You dial a number you say you 'got off a forum'."),
    dir("Hold music. It's Kero Kero Bonito. You nod along."),
    dir("Krelford Town Hall. You have been lent a podium to run for moderator of a Facebook group. Nobody at the Town Hall knows why they agreed to this."),
    dir("Votes are counted. You win. You were the only candidate, but you campaigned like you weren't."),
    success: [say("MIKEY", "I've already lasted longer than the last mod."), dir("You have been nominated for WORST ADMIN at the end-of-season awards. You are campaigning to win it.")],
    dir("You delete three quarters of the group in one go."),
    dir("You leave the group's cover photo as it is: a skateboarder in kneepads. A monument."),
    dir("The desk sergeant looks at Mikey's phone for a long time. It is a video of a laminated sign that says '50p CARD CHARGE UNDER £5'.", { variants: { MIKEY: "The desk sergeant looks at your phone for a long time. It is a video of a laminated sign that says '50p CARD CHARGE UNDER £5'." } }),
    intro: [dir("The Town Hall, out of session. Mikey has booked it for the afternoon with a form he designed himself.", { variants: { MIKEY: "The Town Hall, out of session. You have booked it for the afternoon with a form you designed yourself." } }), say("MIKEY", "Right. Cross-examine me. I'm ready.")],
    success: [dir("The shop refunds 50p. Mikey holds it up to the light like a medal.", { variants: { MIKEY: "The shop refunds 50p. You hold it up to the light like a medal." } }), say("MIKEY", "Classic Nevitt. Justice is served. Luv a gud redemshun ark.")],
    dir("Mikey raises his left arm above his head and bends it into a jaw. He holds eye contact with you the entire time.", { variants: { MIKEY: "You raise your left arm above your head and bend it into a jaw. You hold eye contact with the cabinet the entire time." } }),
    dir("The FGM War Room. Mikey has a CCTV still on the big screen: Lil' Crongus, at night, looking over his shoulder, outside the abandoned building. He is holding a spoon.", { variants: { MIKEY: "The FGM War Room. You've got a CCTV still on the big screen: Lil' Crongus, at night, looking over his shoulder, outside the abandoned building. He is holding a spoon." } }),

### src/content/beatup.ts

### src/content/ch6.ts
    say("LIL' KRUNGUS", "I hope it lands on that Mikey. We already battered him once. Let's see if he bounces!", { variants: { MIKEY: "I hope it lands on that Polson. We already battered him once. Let's see if he bounces!" } }),
    say("MIKEY", "For my bongo.", { variants: { MIKEY: "For Polson's shake." } }),
    dir("Krelford Town Hall. The victory party. SanMik and SanChz have been booked. Two strippers have been booked. They've kept their costumes on, because Krelford Council has rules, and the rules are laminated.", { variants: { MIKEY: "Krelford Town Hall. The victory party. You (as SanMik) and SanChz have been booked. Two strippers have been booked. They've kept their costumes on, because Krelford Council has rules, and the rules are laminated." } }),

### src/content/chapters/chapters.ts
    MIKEY: [say("MIKEY", "FGM ULTRA. New target. Classification: chewy."), dir("You've already made a lanyard.")],
    dir("Town Hall. The lamp sits on the table, cold and dark. SanMik and SanChz have come back with it. Both are wearing sunglasses indoors. Neither will say why.", { variants: { MIKEY: "Town Hall. The lamp sits on the table, cold and dark. You and SanChz have come back with it. You're both wearing sunglasses indoors. Neither of you will say why." } }),
    MIKEY: [say("MIKEY", "They took Polson's shake. Then they took Polson's dignity. Now they want the Tower."), dir("FGM Operation: Get The Shake Back. Classification: deeply personal (to Polson).")],
    say("MIKEY", "Good. Tell them I want my bongo back.", { variants: { MIKEY: "Good. Tell them Polson wants his shake back." } }),

### src/content/dialogue/npc.ts
    T(12, { chapterAtLeast: 3, notPlayer: "MIKEY" }, [say("POLSON", "Yeeeggghhhh!! Quick one"), say("POLSON", 'Adjectives for Mikey!'), say("POLSON", "-Relentless\n-Vituperative\n-Right all along (don't tell him)\nCan I unblock him btw?"), react("POLSON: 'Agreed? 😅'", "polson_adj_mikey", { LIKE: [say("POLSON", "That's fair!! Exactly that")], LOVE: [say("POLSON", "YES YES YES. The deed is done")], LAUGH: [say("POLSON", "LMAOOOOO. Is that a yes?")], ANGRY: [say("POLSON", "That's fair.. it's sad but also fair. I'll take that onboard")], SEEN: [say("POLSON", "Seen. Classic. Thoughts though? Wbu?")] }, "POLSON")]),

### src/content/krunchers.ts
    dir("Outside Krelburger. Polson is enjoying a protein shake and minding his own business. It's a post-workout shake. There was no workout."),
    say("POLSON", "Yeeegh. Alright lads. Wait. You're not the lads."),
    say("KLENKY", "Look what we got here. A Krelworld NERD."),
    say("MIKKY K", "Is that a PROTEIN SHAKE? For HIM? Lol. For WHAT."),
    say("POLSON", "Lads. Lads. Can we talk about this. I've got gym at four. Thoughts? 😅"),
    say("GRENNY", "GET HIM!"),
    say("POLSON", "No— no no no— not the face— Eden's doing photos later—"),
    say("POLSON", "PLEASE. I'll pay. I'll pay for the shakes. I'll pay for EVERYONE'S shakes—"),
    say("KREDWONK", "I foresaw you saying that. It didn't help in the vision either."),
    say("POLSON", "PLEEEEEASE— YEEEGGHHH—"),
    dir("Polson lies on the pavement outside Krelburger, groaning. Someone has put his protein shake on his head like a little hat."),
    say("KLENKY", "Tell your little krew the Kreddle Krunchers say HI."),
    say("MIKKY K", "Later, loser!"),
    say("POLSON", "…ow. 😅"),
    ping("MIKEY", "lads", { cond: { notPlayer: "MIKEY" } }),
    ping("MIKEY", "the kreddle krunchers just kicked the absolute shit out of me", { cond: { notPlayer: "MIKEY" } }),
    ping("MIKEY", "outside krelburger", { cond: { notPlayer: "MIKEY" } }),
    ping("MIKEY", "they took my bongo 😢", { cond: { notPlayer: "MIKEY" } }),
    ping("KREBLIS", "Breaking news… Mikey got battered 👍", { cond: { notPlayer: "MIKEY" } }),
    ping("POLSON", "lads", { cond: { player: "MIKEY" } }),
    ping("POLSON", "the kreddle krunchers just kicked the absolute shit out of me", { cond: { player: "MIKEY" } }),
    ping("POLSON", "outside krelburger", { cond: { player: "MIKEY" } }),
    ping("POLSON", "they took my protein shake 😢", { cond: { player: "MIKEY" } }),
    ping("KREBLIS", "Breaking news… Polson got battered 👍", { cond: { player: "MIKEY" } }),
    say("MIKEY", "You took my BONGO!", { cond: { notPlayer: "MIKEY" } }),
    say("POLSON", "You took my SHAKE!", { cond: { player: "MIKEY" } }),
    say("MIKEY", "They still have my bongo.", { cond: { notPlayer: "MIKEY" } }),
    say("POLSON", "They still have my shake. 😢", { cond: { player: "MIKEY" } }),

### src/content/meetings/laterMeetings.ts
    dir("The door bangs open. It isn't Flenky. It's ROBBO: Gronny's ex-flatmate, deposit thief, carpet destroyer. He's wearing a cravat. He is holding a glass of red wine by the bowl, like a man who has seen it done once.", { fx: "robbo_enter" }),
    say("ROBBO", "Evening, gentlemen. Couldn't help overhearing. A cabinet. A crew. I'd like to formally put myself forward."),
    say("ROBBO", "And all my new cultured friends can be part of it too. We do wine. We do galleries. Last Thursday we did a cheese."),
    say("GRONNY", "Robbo. Three months' rent.", { cond: { notPlayer: "GRONNY" } }),
    say("ROBBO", "Let's not be provincial about it, Gronny. I've been reading. Sartre. Well. About Sartre. He's French."),
    say("KREZMAR", "Provincial."),
    say("SCROMBUS", "You're a pedo!"),
    say("ROBBO", "I beg your pardon?"),
    say("KREBLIS", "Breaking news… Robbo's a pedo 👍", { cond: { notPlayer: "KREBLIS" } }),
    say("KREZWONK", "I have foreseen it. In the omens you were holding the glass wrong. And you were a nonce."),
    say("CRONGUS", "Is that a cravat? Only nonces wear cravats."),
    say("MIKEY", "His cultured friends are two blokes from Wetherspoons and a cardboard sommelier."),
    say("KREBON", "Did you call the wine 'cheeky'? You did. I heard you in the corridor. You called it cheeky. Nonce."),
    say("FLENKY", "(from the corridor) Even I'm not banned enough to sit near him!", { cond: { notPlayer: "FLENKY" } }),
    say("ROBBO", "This is EXACTLY why I moved out. Philistines. The lot of you. Philistines and NONCES."),
    say("GRONNY", "Get him.", { cond: { notPlayer: "GRONNY" } }),
    dir("Every chair goes over at once. The cabinet descends on Robbo in a single cartoon cloud of fists, boots, cravat and Merlot. Somebody is using the agenda as a weapon.", { fx: "robbo_beatup", sfx: "punch_big" }),
    dir("When the dust clears, Robbo is face down by the door. The wine glass is somehow unbroken. The cravat is round Krezmar's head."),
    say("ROBBO", "(crawling for the door) Fine! FINE! I'm moving in with my drug addict father who married a much younger woman because he's a piece of shit! He's my HERO!", { fx: "robbo_leave" }),
    dir("The door slams. It opens again. A hand reaches in, takes the wine, and withdraws. It slams again."),
    say("GRONNY", "Three months.", { cond: { notPlayer: "GRONNY" } }),
    ping("MIKEY", "Found a magic lamp in the skip", { cond: { notPlayer: "MIKEY" } }),
    ping("MIKEY", "Looks like a naughty little dildo", { cond: { notPlayer: "MIKEY" } }),
    ping("MIKEY", "Gonna rub it. Come watch. Can someone react to my message pls", { cond: { notPlayer: "MIKEY" } }),
    say("SCROMBUS", "SanMik's already rubbed it. Him and SanChz are in there. The SanMikverse. Catford, allegedly.", { variants: { MIKEY: "SanChz is already in the back room with it. Waiting for you. The SanMikverse. Catford, allegedly." } }),
    say("FLENKY", "SanMik sent a voice note from inside. It's just 'yee' for four minutes.", { variants: { MIKEY: "SanChz sent a voice note from the back room. It's just 'yeghhh' for four minutes." } }),
    say("KREZMAR", "So: Krezz Arms. Back room. Rub the lamp. Find SanMik and SanChz, get to Catford, get Uncle Rik out of that hot tub, take the crystal.", { variants: { MIKEY: "So: Krezz Arms. Back room. Rub the lamp. You and SanChz get us to Catford, get Uncle Rik out of that hot tub, take the crystal." }, role: true, proctus: "Pub! Lamp! Rub! Catford! Hot tub! Crystal! I'll hold the lamp! From this side!" }),

### src/content/raid.ts
    say("MIKEY", "For my bongo!! FOR MY FIZZY BONGO!!", { variants: { MIKEY: "For Polson's shake!! FOR POLSON'S PROTEIN SHAKE!!" } }),
    say("MIKEY", "And THAT'S for my bongo.", { variants: { MIKEY: "And THAT'S for Polson's shake." } }),

### src/data/characters.ts

### src/data/dungeons.ts

### src/data/heights.ts

### src/data/types.ts

### src/game/scenes/BeepBeepScene.ts
    dir("A stolen Range Rover, idling on Catford High Street. SanChz nicked it. SanMik has made you drive it. The sat-nav has been set to THE BANK OF CATFORD, via THE PAVEMENT.", { variants: { MIKEY: "A stolen Range Rover, idling on Catford High Street. SanChz nicked it. You're driving it, because you're SanMik and you said so. The sat-nav has been set to THE BANK OF CATFORD, via THE PAVEMENT." } }),
    say("SANMIK", "YEEEEE! That's a Catford record! Better than GTA!"),
    dir("There is. He waves. He's fine. Everyone in the SanMikverse is somehow fine. They get up, dust themselves off, and leave one-star reviews of SanMik's driving.", { variants: { MIKEY: "There is. He waves. He's fine. Everyone in the SanMikverse is somehow fine. They get up, dust themselves off, and leave one-star reviews of your driving." } }),

### src/game/scenes/BootScene.ts

### src/game/scenes/CharSelectScene.ts

### src/game/scenes/ClubScene.ts
    dir("LIVE TONIGHT: SANMIK & SANCHZ. Afro wig, dark shades, drawn-on goatee, shirt open to the navel. They have been booked as \"atmosphere\".", { variants: { MIKEY: "LIVE TONIGHT: SANMIK & SANCHZ. That's you. Afro wig, dark shades, drawn-on goatee, shirt open to the navel. You have both been booked as \"atmosphere\"." } }),

### src/game/scenes/CutsceneScene.ts

### src/game/scenes/DriveScene.ts
    dir("HOW TO PLAY: SanMik drives and does the jumps. Hold the mouse (or your finger) to fire the machine gun: it never runs out. Right-click, Space or F (or ROCKET) fires a rocket. Kills fill SanMik's SLOPPY SURPRISE: press R / SLOPPY. Survive to the drawbridge.", { variants: { MIKEY: "HOW TO PLAY: Gabor drives and does the jumps (somehow). Hold the mouse (or your finger) to fire the machine gun: it never runs out. Right-click, Space or F (or ROCKET) fires a rocket. Kills fill your SLOPPY SURPRISE: press R / SLOPPY. Survive to the drawbridge." } }),
    this.box.play([dir("The truck spins out and stops against a bollard. The feds pile out. SanMik winds down his window.", { variants: { MIKEY: "The truck spins out and stops against a bollard. The feds pile out. Gabor winds down his window with his teeth." } }), say(this.driver, "Officer. I'll be honest with you. That's illegal. I wrote the law."), dir("…Somehow, it works. Try that again.")]).then(() => {
    await this.box.play([say(this.driver, "There's a drawbridge about to lift."), say(this.driver, "Into the highest gear I shift."), dir("MASH (tap / Space) to shift into the highest gear!")]);

### src/game/scenes/DungeonScene.ts
    say("SANMIK", "(bursting in) YEEE — oh. Oh SanChz. Not again. Not in the Job Centre.", { variants: { MIKEY: "YEEE — oh. Oh SanChz. Not again. Not in the Job Centre." } }),

### src/game/scenes/ExileScene.ts

### src/game/scenes/FinaleScene.ts

### src/game/scenes/HomeScene.ts
    if (r < 0.34 && st) return [dir("You dream about Krezwonk. He's floating. He's glowing. He's holding a clipboard."), say("KREZWONK", "I've seen it in a vision. Your next move…"), dir(`The vision: ${st.text}.`), dir("You wake up. It's the most useful dream you've ever had.")];

### src/game/scenes/HubScene.ts
    await this.talk([say("MIKEY", "That's all four. Everybody back. BACK. Further than that."), dir("You all retreat behind a bin. Mikey holds up a detonator made out of a Nintendo Wii remote.", { variants: { MIKEY: "You all retreat behind a bin. You hold up a detonator made out of a Nintendo Wii remote." } })]);
    dir("The Krezz Arms. In the back room, SanMik's magic lamp is on the bar, still glowing. It smells of corn.", { variants: { MIKEY: "The Krezz Arms. In the back room, your magic lamp is on the bar, still glowing. It smells of corn." } }),
    ? [dir("The Booth. There's a heavy bag in here shaped like you. You leave it be. You've had enough of that for one lifetime.")]

### src/game/scenes/KreddleScene.ts

### src/game/scenes/LairScene.ts

### src/game/scenes/MinigameScene.ts
    dir("The prize money is presented on a giant cheque for 'A MILLION BILLION POUNDS'. It is made out to 'SANMIK (MANAJER)'. It is written in crayon. SanMik wrote it.", { variants: { MIKEY: "The prize money is presented on a giant cheque for 'A MILLION BILLION POUNDS'. It is made out to 'SANMIK (MANAJER)'. It is written in crayon. You wrote it." } }),
    if (!success) lines.push(dir("Again. SanMik has written a new law: the final gets replayed until Norwich win.", { variants: { MIKEY: "Again. You have written a new law: the final gets replayed until Norwich win." } }));
    dir("Begour's café caravan has Wi-Fi. SanMik has borrowed the laptop. He is wearing his best afro and a small amount of aftershave on his eyebrows. He's logging into CAM2CAM.", { variants: { MIKEY: "Begour's café caravan has Wi-Fi. You have borrowed the laptop. You are wearing your best afro and a small amount of aftershave on your eyebrows. You're logging into CAM2CAM." } }),
    say("SANMIK", "Yee. Give me five minutes, lads. I've got a date. You're me now. Don't fuck it up.", { cond: { notPlayer: "MIKEY" } }),
    dir("The Norwich manager is not in the dugout. The Norwich manager is in the stadium toilet.", { variants: { MIKEY: "The Norwich manager is not in the dugout. The Norwich manager is you, and you are in the stadium toilet." } }),

### src/game/scenes/PubScene.ts
    this.box.play([dir(`Barred from the Wonky Pole: ${Math.ceil(left / 60000)} more minute${left > 60000 ? "s" : ""}.`), say("BIG DEREK", "You lot are barred. Come back later. And wash your hands.")]).then(() => this.showMenu());

### src/game/scenes/TVScene.ts

### src/game/scenes/TitleScene.ts

### src/game/scenes/TownMeetingScene.ts

### src/game/scenes/TutorialScene.ts

### src/game/scenes/UIScene.ts

### src/game/scenes/VenueScene.ts
    this.talk([dir("The back room of the Krezz Arms. It is very hot. On stage, in a huge afro wig, white sunglasses and a goatee drawn on in marker pen: you. SANMIK. Next to you, in a gold shell suit: SANCHZ."), dir("You are midway through a song. You have been midway through a song since 2011."), dir("Wander about mid-verse if you like (stand still and you sing). Head to the EXIT when you've had enough.")]);
    else this.talk([dir("The back room of the Krezz Arms. It is very hot. On stage, in a huge afro wig, white sunglasses and a goatee drawn on in marker pen: SANMIK. Next to him, in a gold shell suit: SANCHZ."), dir("They are midway through a song. They have been midway through a song since 2011."), dir("Walk up and attack them if you want it to stop. Head to the EXIT when you've had enough.")]);
    this.talk([dir("SanChz lies on the stage. The crowd goes quiet. Somebody finds 15 Krezzcoin in SanChz's bumbag and gives it to you, out of fear."), say("POLSON", "(from the floor) Mork.")]);

### src/game/scenes/VignetteScene.ts
    say("POLSON", "That's a deficit!! YES YES YES"),
    dir("The back room of the Krezz Arms, after the gig. SanMik is lying face-down on the stage 'cooling down'. SanChz is eating the setlist.", { variants: { MIKEY: "The back room of the Krezz Arms, after the gig. You are lying face-down on the stage 'cooling down'. SanChz is eating the setlist." } }),
    dir("Krelford Town Hall. On the left steps: SanMik, a megaphone, three confused pensioners and a hand-painted banner. On the right steps: SanChz, a different megaphone, three different confused pensioners and a different banner.", { variants: { MIKEY: "Krelford Town Hall. On the left steps: you, a megaphone, three confused pensioners and a hand-painted banner. On the right steps: SanChz, a different megaphone, three different confused pensioners and a different banner." } }),
    dir("To mark the occasion, SanMik removes his tracksuit to reveal a red velvet Santa G-string. It is October. Nobody asked.", { variants: { MIKEY: "To mark the occasion, you remove your tracksuit to reveal a red velvet Santa G-string. It is October. Nobody asked." } }),
    dir("Gabor the Goat headbutts SanMik in the bum. SanMik falls down the Town Hall steps, all of them, one at a time, still twerking.", { variants: { MIKEY: "Gabor the Goat headbutts you in the bum. You fall down the Town Hall steps, all of them, one at a time, still twerking." } }),
    dir("SanMik and SanChz are friends again. The hot tub has been sealed in concrete. Begour sends a card. It says 'So proud of you both x'. It smells faintly of lavender.", { variants: { MIKEY: "You and SanChz are friends again. The hot tub has been sealed in concrete. Begour sends a card. It says 'So proud of you both x'. It smells faintly of lavender." } }),
    say("KREBON", "Look after the rockstar points. And the underwear. Especially the underwear."),

### src/game/scenes/citadel/Citadel.ts

### src/game/scenes/citadel/RoofCutscene.ts

### src/game/scenes/finale/KrelfordFinale.ts

### src/game/scenes/finale/finaleArt.ts

### src/game/scenes/hub/Beatup.ts

### src/game/scenes/kreddle/Raid.ts
