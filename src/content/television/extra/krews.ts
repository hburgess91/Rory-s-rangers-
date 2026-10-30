import { parseScreenplay, type TVEpisode } from "../../../game/systems/tv";

// Supplied news articles and sketches ("Screenplays and news articles"). Text kept as written;
// newsreader intros/outros were added to link the pieces. Changes:
// - The Chancellor's self-harm video is credited to an unnamed Chancellor, not a real politician.
// - The Cookie Monster statement had a page break mid-sentence; "in debt." bridges it.
// - The Kendrick Lamar concert and the McCann betting advert are not included.

const NEWS = "GB KREWS 24";
const SKETCH = "CHANNEL KREZ";

const ep = (id: string, channel: string, show: string, title: string, n: number, script: string): TVEpisode => ({
  id,
  channel,
  show,
  title,
  episodeNumber: n,
  beats: parseScreenplay(script),
});

export const KREWS_PELE = ep(
  "krews_pele",
  NEWS,
  "GB Krews",
  "Pelé's Dying Wish",
  1,
  `
[MUSIC news start]
# GB KREWS 24
# BREAKING: PELÉ ESTATE STATEMENT
INT. NEWSDESK - DAY
[MUSIC news fade]
NEWSREADER: Breaking news. A spokesperson for the estate of Pelé has just read the following statement.
INT. PRESS ROOM - DAY
ESTATE SPOKESPERSON (solemn): It is with a heavy heart that I stand before you today to deliver the news of Pelé's death.
ESTATE SPOKESPERSON: Pelé was a great man, and a great athlete, and his passing leaves a hole in the world that can never be filled.
ESTATE SPOKESPERSON: But Pelé was more than just a great athlete. He was a visionary, and a pioneer. He was the first person to see the potential of Bitcoin, and he was the first to invest in it.
ESTATE SPOKESPERSON: It was Pelé's dying wish that his assets be transferred to Bitcoin, rather than his own children. And I am here today to make sure that his wishes are carried out.
[GASP]
ESTATE SPOKESPERSON: If the children attempt to interfere with Pelé's estate, we will take legal action against them. Pelé's assets belong to Bitcoin, and Bitcoin alone.
ESTATE SPOKESPERSON: Thank you.
INT. NEWSDESK - DAY
NEWSREADER: Bitcoin is up four percent.
[FADE]
`,
);

export const KREWS_CHANCELLOR = ep(
  "krews_chancellor",
  NEWS,
  "GB Krews",
  "The Chancellor's Video",
  2,
  `
[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - DAY
[MUSIC news fade]
NEWSREADER: In a video that has sent shockwaves through the UK, the Chancellor uploaded a video of himself harming himself after being critiqued for his economic policies.
INT. PRESS ROOM - DAY
CHANCELLOR: I'm fed up of being criticized for my policies. If the public don't like them, then they can go ahead and criticize me all they want - but I'll keep harming myself until they stop.
INT. NEWSDESK - DAY
NEWSREADER: The video has sparked outrage among many in the UK, who feel that the Chancellor is using self-harm as a way to manipulate the public.
REPORTER: 'This is a disgraceful way to treat the public,' said one critic. 'The Chancellor should be ashamed of himself.'
NEWSREADER: The Chancellor has responded to the criticism by threatening to harm himself again if the public doesn't stop criticizing him.
INT. PRESS ROOM - DAY
CHANCELLOR: I'll do it again and again until you stop. So just shut up and leave me alone.
[FADE]
`,
);

export const KREWS_TELLY = ep(
  "krews_telly",
  NEWS,
  "GB Krews",
  "The Department of Telly",
  3,
  `
[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - DAY
[MUSIC news fade]
NEWSREADER: The Conservative Party has announced plans to bring about the biggest political reform in 200 years, abolishing the role of Chancellor of the Exchequer and the Department of the Treasury, and replacing them with the department of Telly.
NEWSREADER: The main purpose of the department will be to ensure that everyone watches much more television, ensuring that every room of every household has at least three televisions, and a new gameshow called "battle of the morons" which has a weekly cash prize of £50 billion.
EXT. HIGH STREET - DAY
REPORTER: Critics have labelled the plans as ludicrous and irresponsible, and have questioned how a government department whose only purpose is to watch television can be justified when there are so many other pressing issues that need to be addressed.
REPORTER: They argue that the prize money for "battle of the morons" is far too high, and that it is nothing more than a glorified lottery that will line the pockets of the wealthy few.
INT. NEWSDESK - DAY
NEWSREADER: So what is "battle of the morons"? It is a new gameshow that will pit two teams of morons against each other in a battle of wits to see who can answer the most questions correctly.
NEWSREADER: The team that wins will be awarded the £50 billion prize money, which is more than the GDP of many small countries.
EXT. HIGH STREET - DAY
REPORTER: Critics argue that the show is nothing more than a waste of time and money, and that the prize money could be put to better use. They say that the money could be used to fund schools, hospitals, and other essential services, or to reduce the national debt.
INT. NEWSDESK - DAY
NEWSREADER: The Conservative Party has defended the plans, arguing that they will bring about much-needed change and that the department of Telly will be a vital part of the new government.
NEWSREADER: They say that the department will not only ensure that everyone watches more television, but that it will also help to boost the economy by creating new jobs and generating revenue.
NEWSREADER: So what do you think? Is the department of Telly a good idea, or is it a waste of money?
NEWSREADER: You're watching it either way.
[FADE]
`,
);

export const KREWS_ANTARCTICA = ep(
  "krews_antarctica",
  NEWS,
  "GB Krews",
  "Government Announces Plan to Nuke Antarctica",
  4,
  `
[MUSIC news start]
# GB KREWS 24
# GOVERNMENT ANNOUNCES PLAN TO NUKE ANTARCTICA
INT. NEWSDESK - DAY
[MUSIC news fade]
NEWSREADER: In a bid to distract from the cost of living crisis, the government has announced a plan to nuke Antarctica.
NEWSREADER: The scheme, which is expected to cost £2 billion, will see a nuclear weapon detonated at the South Pole.
EXT. ANTARCTICA - DAY
REPORTER: The government says the explosion will create a massive crater, which will be filled with water from the ocean. This will then freeze, creating a new continent — Antarctica 2.
REPORTER: The government is hoping that the scheme will cheer everyone up, and take their minds off the cost of living crisis.
INT. NEWSDESK - DAY
NEWSREADER: Critics have condemned the plan, saying that it is a waste of money. They argue that the cost of living crisis is a much more serious issue, and that the government should be focusing on that instead.
NEWSREADER: Others have raised concerns about the environmental impact of the explosion. They argue that it could damage the ozone layer, and that it could have a devastating impact on the environment.
NEWSREADER: The government has dismissed these concerns, saying that the explosion will be "safe and environmentally friendly".
EXT. ANTARCTICA - DAY
REPORTER: The scheme, which has been met with mixed reactions, is designed to give everyone a much needed cheering up.
REPORTER: Some female scientists have condemned the plan, but most real scientists recognise the benefits.
DR. JAMESON (thrilled): This is a fantastic opportunity to study the effects of a nuclear explosion on the Antarctic ice sheet.
DR. JAMESON: It will also be great for morale — everyone will be excited to see the explosion, and it will give us something to talk about besides the cost of living crisis.
REPORTER: Others have criticised the plan, saying that it is a waste of money that could be better spent on other things.
INT. PRESS ROOM - DAY
REPORTER: But Minister for Distractions, Jeremy Corbyn, said:
JEREMY CORBYN: This is a vital project that will benefit the nation as a whole.
JEREMY CORBYN: It is important that we all take a break from the everyday stress of life, and what could be more fun than watching a nuclear explosion?
INT. NEWSDESK - DAY
NEWSREADER: The government is currently looking for volunteers to help with the project. If you are interested in taking part, please contact your local MP.
[SFX explode]
[FADE]
`,
);

export const KREWS_COOKIE = ep(
  "krews_cookie",
  NEWS,
  "GB Krews",
  "Cookie Monster: A Statement",
  5,
  `
[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - DAY
[MUSIC news fade]
NEWSREADER: We go now to a statement released this morning from a children's television studio.
INT. CHILDREN'S TV STUDIO - DAY
(A lone spotlight. COOKIE MONSTER sits beside a giant cookie jar. He does not eat a cookie.)
COOKIE MONSTER: Hi, me Cookie Monster. Some of you may be wondering why me not been on the show lately. And it is because me been going through some tough times.
COOKIE MONSTER: You see, for a long time now, me been struggling with a pornography and gambling addiction.
COOKIE MONSTER: It all started innocently enough, with me watching a little bit of porn here and there. But then me started gambling, and before me knew it, me was up to my eyeballs in debt.
COOKIE MONSTER: But recently, some interns on the show have been accusing me of sexual impropriety. And they're right. It's true. Me have been behaving inappropriately with them.
COOKIE MONSTER (tearful): But me want you to know that me are sorry. Me are sorry for the pain me have caused. And me are committed to getting help for my addiction.
(He eyes the cookie jar. The spotlight goes out.)
[FADE]
`,
);

export const KREWS_MONEYBAGS = ep(
  "krews_moneybags",
  NEWS,
  "GB Krews",
  "\"Moneybags\" Trial Ends With Not Guilty Verdict",
  6,
  `
[MUSIC news start]
# GB KREWS 24
# BREAKING: CONTROVERSIAL "MONEYBAGS" TRIAL ENDS WITH NOT GUILTY VERDICT
INT. NEWSDESK - DAY
[MUSIC news fade]
NEWSREADER: After a trial that captured national attention, Bendy Krendy has been found not guilty of attempted bribery of Judge Dalton B. Krelmor.
NEWSREADER: The decision came after Judge Krelmor overturned the jury's unanimous guilty verdict, citing his "strong gut feeling" that the defendant was innocent.
INT. COURTROOM - DAY
[BLOCK BENDY KRENDY left]
REPORTER: Krendy was charged with attempting to bribe Judge Krelmor with a bag full of $10 million, after CCTV footage of the bribe, complete with dialogue ("this is a bribe") was released to local news.
REPORTER: In a controversial move, Judge Krelmor was chosen to oversee the trial, and allowed the Defense to present several psychics as witnesses, who all denied that Krendy had committed bribery.
REPORTER: At the trial's conclusion the jury returned a unanimous "guilty" verdict, which the judge immediately overturned.
JUDGE KRELMOR: Evidence is one thing, but instinct is much more important.
JUDGE KRELMOR: Any juror who disagrees will be found in contempt of court for making the wrong decision.
(BENDY KRENDY makes a throat-slitting motion to the jury.)
JUDGE KRELMOR: I find that disturbing.
EXT. HIGH STREET - DAY
REPORTER: Krendy's attorney, Barry Snodgrass, said he was "delighted" with the verdict.
BARRY SNODGRASS (beaming): My client is looking forward to getting on with his life.
REPORTER: When asked about the $10 million Krendy had offered to the judge, Snodgrass said he accepted the explanation provided by one of the psychics on the stand.
BARRY SNODGRASS: The video footage of the incident was a spontaneous hallucination, experienced simultaneously by millions of people at once when it was on the news, and then several further times when the video was played at trial. The footage didn't actually exist.
INT. NEWSDESK - DAY
NEWSREADER: The decision has been met with outrage by many, who say that Krendy should have been found guilty of attempted bribery, and that Judge Krelmor's decision was a miscarriage of justice.
NEWSREADER: Judge Krelmor has been heavily criticized for his decision to allow the Defense to present several psychics as witnesses, and for overturning the jury's verdict.
EXT. HIGH STREET - DAY
[BLOCK JUDGE KRELMOR right]
(JUDGE KRELMOR leaves the courthouse with a large bag of money.)
REPORTER: Judge Krelmor! Judge Krelmor, what's in the bag?
JUDGE KRELMOR: No comment.
[FADE]
`,
);

export const KREWS_UNIVERSE = ep(
  "krews_universe",
  NEWS,
  "GB Krews",
  "Universes Collide",
  7,
  `
[MUSIC news start]
# GB KREWS 24
INT. NEWSDESK - DAY
[MUSIC news fade]
NEWSREADER: Scientists have announced that our universe has collided with the Super Smash Bros universe, and also with a third "sex themed" universe.
NEWSREADER: The consequences of this collision are still being studied, but it is believed that the three universes have now become one.
EXT. MERGED UNIVERSE - DAY
REPORTER: This merger has caused some strange changes in our universe.
REPORTER: For example, people are now able to transform into various characters from the Super Smash Bros universe.
(A commuter becomes a small round pink fighter and floats off.)
REPORTER: Some people are even able to transform into characters from the sex themed universe.
(The REPORTER looks at the camera. A long pause.)
REPORTER: Back to the studio.
[FADE]
`,
);

export const SKETCH_FUNERAL = ep(
  "sketch_funeral",
  SKETCH,
  "Krezz Sketch Show",
  "The Funeral of Susan Nipwood",
  1,
  `
# KREZZ SKETCH SHOW
# THE FUNERAL OF SUSAN NIPWOOD
INT. CHURCH - DAY
VICAR: Good afternoon everyone.
VICAR: It is with great sadness that we gather here today to say goodbye to Susan Nipwood. Susan was an amazing lady, and she will be sorely missed by all who knew her.
VICAR: Susan was a kind and gentle soul, who always had time for her family and friends. She was a wonderful grandmother, and she will be remembered for her love of baking and her infectious sense of humour.
VICAR (startled): Hang on a second, I don't believe it - I can see Susan's ghost!
[GASP]
[BLOCK SUSAN NIPWOOD right]
SUSAN NIPWOOD (ghostly): William Hill… William Hill…
VICAR: Yes, I can see her standing right over there, and she's repeating the words "William Hill".
VICAR: I'm not sure what this means, but I think we should all listen carefully to what she has to say.
VICAR: So, Susan, if you're listening, what can we do to help you?
SUSAN NIPWOOD (ghostly): Deposit… one hundred pounds… at William Hill…
VICAR: What was that? "Deposit £100 at William Hill"?
VICAR (ecstatic): Ladies and gentleman, this is unbelievable! Susan is trying to tell us that she wants us to deposit £100 at William Hill!
VICAR: I'm not sure what this means, but I'm sure that Susan would want us to follow her instructions.
VICAR: So, if any of you have a spare £100, why not go ahead and deposit it at William Hill? This weekend they are running their irresistible 'Cheltenham madness' bonus offer, so it's the perfect time to do it.
[BLOCK SUSAN NIPWOOD offscreen]
VICAR: Thank you, Susan, for giving us your final message. We will honour your wishes, and we will remember you fondly.
[FADE]
`,
);

export const SKETCH_GROCERY = ep(
  "sketch_grocery",
  SKETCH,
  "Krezz Sketch Show",
  "Aisle Nine",
  2,
  `
# KREZZ SKETCH SHOW
# AISLE NINE
INT. GROCERY STORE - DAY
(MARY and JOHN are shopping for groceries with their 2-year-old son, TIMMY. As they walk down the aisle, TIMMY runs ahead of them and disappears around the corner.)
[BLOCK MARY left]
[BLOCK JOHN right]
(MARY quickly runs around the corner to find her son being abducted by a CRIMINAL. The CRIMINAL has TIMMY by the arm and is pulling him away. MARY tries to run to stop the abduction in process, but is held back by her husband, JOHN.)
JOHN: Wait, honey. He looks like a bad guy. We should keep our distance and report this to the store manager.
MARY (panicked): But our son!
JOHN: We'll find him. I promise.
(MARY reluctantly agrees and they go to find the store manager.)
JOHN (relieved): Phew, I'm sure glad we didn't get mixed up in that, what a scary situation.
MARY: Yeah, one of us could have been hurt!
JOHN: I know, it was so close.
MARY: Thank goodness you're safe, baby.
JOHN: We're so lucky.
MARY: What about Timmy?
(JOHN puts his hand on his chest.)
JOHN (tender): He's in here Mary. In our hearts. Where the pedos can never catch him.
[FADE]
`,
);

export const SKETCH_JUROR = ep(
  "sketch_juror",
  SKETCH,
  "Krezz Sketch Show",
  "Juror Number 2",
  3,
  `
# KREZZ SKETCH SHOW
# JUROR NUMBER 2
INT. COURTROOM - DAY
[BLOCK JUROR NUMBER 2 right]
PROSECUTOR: Ladies and gentlemen of the jury, we have evidence that the defendant has been filming women use public restrooms.
(The prosecutor plays a video on the courtroom TV. The screen faces away from us.)
JUROR NUMBER 2: (Involuntarily moaning in pleasure)
PROSECUTOR: As you can see, the defendant is filming this woman without her knowledge or consent.
JUROR NUMBER 2: (Moaning louder)
PROSECUTOR: This is a clear violation of her privacy.
JUROR NUMBER 2: (Moaning even louder)
PROSECUTOR: Would you like to see some more footage, Mr. Juror Number 2?
JUROR NUMBER 2 (moaning uncontrollably): Yes, please! Zoom in so I can be 100% sure!
(The prosecutor zooms in on the footage, and Juror Number 2 continues to moan in pleasure.)
JUROR NUMBER 2 (moaning): This is so hot... I can't believe I'm getting off to this!
(The other jurors start to look uncomfortable, and some start to leave the courtroom.)
[FADE]
`,
);

export const KREWS_EPISODES: TVEpisode[] = [KREWS_PELE, KREWS_CHANCELLOR, KREWS_TELLY, KREWS_ANTARCTICA, KREWS_COOKIE, KREWS_MONEYBAGS, KREWS_UNIVERSE, SKETCH_FUNERAL, SKETCH_GROCERY, SKETCH_JUROR];
