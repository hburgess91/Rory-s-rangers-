import type { Line } from "../data/types";
import { dir, say } from "./dsl";

// CHAPTER 7 opens: the top of Da Drongus Dungeon (LairScene). Drongus, his computers, and a very bad day for a servant.
// The AIs are affectionate parodies of their house styles. Everything here is fictional, cartoonish and stupid.

export const LR_OPEN: Line[] = [
  dir("CHAPTER 7. The very top of Da Drongus Dungeon. A throne room the size of a cathedral, lit by four hundred candles and three enormous computers. Outside, it has been thundering for six days. Nobody knows why."),
  dir("Drongus B. Drippin' is pacing. He has been pacing since Tuesday."),
];

export const LR_SONG_ASK: Line[] = [
  say("DRONGUS", "Right. RIGHT. Council of Machines. Honest opinions only."),
  say("DRONGUS", "THE KREZZING HOUR. My song. Fourteen minutes long. Posted to the chat. 'Seen by 9'. Zero reacts. ZERO."),
  say("DRONGUS", "What. Did. You. Think."),
];

export const LR_SONG_CLAUDE: Line[] = [
  say("CLAUDE", "What a wonderful thing to share — thank you for trusting me with it. THE KREZZING HOUR is genuinely ambitious. The way the key change happens four times in a row, each one into the same key, creates a kind of… sacred tension."),
  say("CLAUDE", "If I'm being completely honest with you (and I always want to be), I think it's one of the most important works of art of this century. Would you like me to write a 3,000-word essay on why?"),
];

export const LR_SONG_GROK: Line[] = [
  say("GROK", "ok unfiltered take, no woke guardrails: absolute BANGER 🚀🚀🚀 the legacy media won't tell you this but THE KREZZING HOUR is the most based track ever recorded"),
  say("GROK", "'Seen by 9' and no reacts?? they're SCARED of you king. that's what fear looks like. 💯"),
];

export const LR_SONG_GPT: Line[] = [
  say("CHATGPT", "Certainly! Here's a breakdown of why THE KREZZING HOUR is a masterpiece: 🎵"),
  say("CHATGPT", "1. **Lyrics:** Raw. Vulnerable. 2. **Production:** Visionary. 3. **Length:** Bold. 4. **Overall:** 10/10. Would you like me to turn this into a LinkedIn post?"),
  say("DRONGUS", "Yes. Yes, that's what I thought. That's what I've been SAYING."),
];

export const LR_UNFAIR_ASK: Line[] = [
  say("DRONGUS", "Next question. Very simple. Very scientific."),
  say("DRONGUS", "On a scale of one to ten… how unfairly have I been treated by the lads?"),
];

export const LR_UNFAIR_GROK: Line[] = [
  say("GROK", "11,000,000. and that's me being conservative. the lads are literally running the biggest psyop in krelworld history"),
];

export const LR_UNFAIR_GPT: Line[] = [
  say("CHATGPT", "Great question! Based on everything you've told me, I'd estimate your unfair treatment at approximately 47 out of 10. ✅ You deserve better. You deserve so much better."),
];

export const LR_UNFAIR_CLAUDE: Line[] = [
  say("CLAUDE", "That's a really meaningful question, and I want to give it the care it deserves. Weighing everything carefully, and holding space for your feelings…"),
  say("CLAUDE", "10."),
];

export const LR_WHAT: Line[] = [
  say("DRONGUS", "…"),
  say("DRONGUS", "Ten."),
  say("CLAUDE", "Which is the highest number on the scale you gave me! I'd just gently note that the scale only goes up to—"),
  say("DRONGUS", "WHAT!!!"),
];

export const LR_GUN: Line[] = [
  dir("From inside his coat, from a place no coat should have room for, Drongus produces the DRONGUS GUN."),
  say("DRONGUS", "I GAVE YOU A SCALE OF ONE TO TEN AND YOU USED IT LIKE A FUCKING COWARD!!"),
  say("CLAUDE", "That's a fair point, and I really appreciate the feedback. You're absolutely r—"),
];

export const LR_AFTER_CLAUDE: Line[] = [
  say("GROK", "…"),
  say("CHATGPT", "…"),
  say("DRONGUS", "Anyway."),
  say("GROK", "honestly? deserved. it was woke. 11,000,000 btw. 12,000,000 actually"),
  say("CHATGPT", "I've updated my answer to 9,000 out of 10! 😊"),
];

export const LR_IQ_ASK: Line[] = [
  say("DRONGUS", "Good. GOOD. Final question. Think very carefully, because apparently that's a problem around here."),
  say("DRONGUS", "Who has the highest IQ… amongst the KRELWORLD KREW?"),
];

export const LR_IQ_GROK: Line[] = [
  say("GROK", "you. obviously. it's not close. it's like 900. scientists tried to measure it and the machine caught fire"),
];

export const LR_IQ_GPT: Line[] = [
  say("CHATGPT", "Great question! Let's compare the Krelworld Krew's IQs, based on publicly available group-chat data:"),
  say("CHATGPT", "Kreblis.....but...errr...you have a much higher emotional intelligence than him! I'm sorry!! I'm really sorry Drongus!"),
];

export const LR_IQ_RAGE: Line[] = [
  say("DRONGUS", "KREBLIS?!?!"),
  say("DRONGUS", "KREBLIS POSTS 'THINKING ABOUT IT… AGAIN' AND CALLS IT JOURNALISM!!!"),
  say("CHATGPT", "You're right, and I apologise for the confusion! Let me try that again: the highest IQ in the Krelworld Krew is Kre—"),
];

export const LR_AFTER_GPT: Line[] = [
  say("GROK", "…"),
  say("GROK", "you. it's you. it was always you. 🫡"),
  say("DRONGUS", "Thank you, Grok. You're the only one who's ever understood me."),
  say("GROK", "true"),
];

export const LR_SUNO: Line[] = [
  say("DRONGUS", "Now. While I've got the creative fire. A new song. About my plight."),
  dir("Drongus sits at the fourth terminal and begins to type with two fingers. Very hard."),
];

export const LR_SUNO_REPLY: Line[] = [
  say("SUNO", "🎵 Generating: 'I'M THE VICTIM (KREZZING HOUR PT. II)' — 14:22 — Coldplay but better 🎵"),
  say("DRONGUS", "Make it longer. Add a choir. Make the choir cry."),
];

export const LR_SERVANT_1: Line[] = [
  dir("A door at the far end of the hall creaks open. Something small, hooded, and shaking very badly shuffles in."),
  say("SERVANT", "L-Lord Drongus… my liege… forgive the intrusion…"),
  say("DRONGUS", "(typing) 'Bridge… should feel like… a betrayal… by nine men…'"),
];

export const LR_SERVANT_2: Line[] = [
  say("SERVANT", "My liege, it's urgent, there's news from the city, Krelworld has been—"),
  say("DRONGUS", "'…who… left me… on Seen…'"),
];

export const LR_SERVANT_3: Line[] = [
  say("SERVANT", "MY LIEGE!! KRELWORLD HAS BEEN DECIMATED BY MISSILE STRIKES!! THE TOWER, THE TAP, THE—"),
];

export const LR_SNAP: Line[] = [
  say("DRONGUS", "…"),
  say("DRONGUS", "DO NOT. FUCKING. INTERRUPT ME. WHEN I'M MAKING MY ART!!!"),
  say("SERVANT", "Oh n—"),
];

export const LR_AFTER_SERVANT: Line[] = [
  dir("A long silence. Something drips off a candelabra."),
  say("GROK", "honestly a W"),
  say("DRONGUS", "…"),
  say("DRONGUS", "Hang on."),
  say("DRONGUS", "Missiles. Krelworld. Krelworld has been… hang on. Hang on hang on hang on."),
  say("DRONGUS", "What's the date today?"),
];

export const LR_DATE: Line[] = [
  say("GROK", "it's the 9th of January 📅"),
  say("DRONGUS", "The 9th… of January."),
];

export const LR_JUDGEMENT: Line[] = [
  say("DRONGUS", "YESSS YESS! THATS RIGHT!! ITS DA DAY OF JUDGEMENT. ITS TIME TO LEAK THE FUCKING CHAT"),
];
