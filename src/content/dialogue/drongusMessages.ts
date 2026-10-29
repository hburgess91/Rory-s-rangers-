import type { Cond } from "../../data/types";

// Drongus is never in the room. He is always in your notifications.
// Each sequence fires once per playthrough (unless `repeat`), as Messenger toasts.

export interface DrongusSequence {
  id: string;
  trigger: string;
  cond?: Cond;
  repeat?: boolean;
  messages: string[];
}

export const DRONGUS_SEQUENCES: DrongusSequence[] = [
  { id: "d_ngplus", trigger: "hub", cond: { chapter: 1, ngPlus: true }, messages: ["New one lads", "🎵 THE KREZZING HOUR PART II (Extended Krezzmas Mix)", "Seen by 9", "...again", "UNTIL SOMEONE REACTS, THERE WILL BE NO MORE LORE. AGAIN."] },
  { id: "d_hub1", trigger: "hub", cond: { chapter: 1, ngPlus: false }, messages: ["Hello ?", "Did everyone see the song ?", "Seen by 9 btw", "SEEN BY NINE", "It's whatever. Don't even give a shit at this point"] },
  { id: "d_wildern", trigger: "enter_dungeon", cond: { chapter: 1 }, messages: ["Oh you're going to Wildern are you", "Wildern was MY idea. They have a Wildern in Krelford. I wrote that.", "Mind the salmon. That's lore. You're welcome. No reaction needed apparently"] },
  { id: "d_salmon_dead", trigger: "boss_defeated", cond: { chapter: 1 }, messages: ["You killed the Salmon Sovereign", "I made him in like 4 minutes", "Took you twenty", "The Tap's back on. Not because of me. I just want that noted. I'm noting it."] },
  { id: "d_hub2", trigger: "hub", cond: { chapter: 2 }, messages: ["Polson Towers ?? Seriously ??", "I've definitely had the last laugh about all the Polson stuff! I'm sure you all agree!", "He's probably there obsessing over me whereas I am here merely laughing", "Ha ha ha! That's what I exclaim!"] },
  { id: "d_fragmar", trigger: "boss_defeated", cond: { chapter: 2 }, messages: ["Operation Fragmar 2", "And you didn't even invite me", "I PLANNED THE FIRST ONE. AT 3:27 IN THE MORNING."] },
  { id: "d_hub3", trigger: "hub", cond: { chapter: 3 }, messages: ["Who has boner control strategies", "Asking for the Ministry", "The Ministry is me. Everything is me. I took all the cabinet roles in an act of remarkable self sacrifice"] },
  { id: "d_machine", trigger: "boss_defeated", cond: { chapter: 3 }, messages: ["RIP the Mk II", "Scrombus is going to be devastated", "Did anyone say anything nice about it before they killed it", "No ? Welcome to my world"] },
  { id: "d_hub4", trigger: "hub", cond: { chapter: 4 }, messages: ["New rule", "Anyone who doesn't react within 24 hours will be deported or sent to Krentonville Prison", "The rules aren't arbitrary. They're LORE"] },
  { id: "d_hub5", trigger: "hub", cond: { chapter: 5 }, messages: ["Who the fuck is Krebon", "Genuinely", "Two years and nobody's told me", "Whatever. No big deal. What the fuck ever"] },
  { id: "d_hub6", trigger: "hub", cond: { chapter: 6 }, messages: ["Come on then", "I'm in the Citadel", "I've made the place nice. Every page is a room now. Took me a while. Not that anyone asked", "Bring your thumbs"] },
  { id: "d_pub", trigger: "pub", messages: ["Are you in the pub ??", "Wish I could send you a box of crobleys", "Have one for me. And react to the song while you're there. Oh wait. You can't. Because you didn't."] },
  { id: "d_tv", trigger: "tv", messages: ["Are you watching KrelTV ?", "Which show", "If it's mine, react to it", "If it isn't mine, why"] },
  { id: "d_tcc", trigger: "tv_tcc", messages: ["Thick Cumming Cock", "Episode 7", "That one took me two hours. Ten page script. Made me laugh so very hard", "Had to WhatsApp call my brother", "Did you laugh ?", "Hello ?"] },
  { id: "d_archive", trigger: "archive", messages: ["Reading the archive are we", "Notice how the official versions are all correct", "The footnotes are vandalism. Ignore them."] },
  { id: "d_banned", trigger: "banned", repeat: true, messages: ["Banned 😅", "Rules are rules", "Appeal at the Tribunal. Or don't. I don't care. No big deal."] },
  { id: "d_banned_flenky", trigger: "banned", cond: { player: "FLENKY" }, messages: ["Flenky is banned until he dies", "And I mean it", "(Not really. Come back in a sec.)"] },
  { id: "d_fact", trigger: "krazy_fact", repeat: true, messages: ["A Krazy fact!", "Wow", "Holy shit", "See this is all I ever wanted. Was that so hard", "Still haven't reacted to the song though"] },
  { id: "d_idle", trigger: "idle", repeat: true, messages: ["What's everyone up to then lads @everyone ?", "So then @everyone … what's everyone's Krazy fact of the day ?"] },
  { id: "d_seen", trigger: "react_SEEN", repeat: true, messages: ["Seen.", "Cool.", "Cool cool cool."] },
  { id: "d_laugh", trigger: "react_LAUGH", repeat: true, messages: ["Wait was that a laugh", "On something I didn't make", "Interesting"] },
  { id: "d_lowhp", trigger: "low_hp", messages: ["You're bleeding", "Should've reacted to the song", "Just saying"] },
  { id: "d_proctus", trigger: "hub", cond: { chapterAtLeast: 2 }, messages: ["Who is Proctus Krelmor", "Did I make him", "I think I made him", "I don't remember making him", "Detective Krelmor? From the Krebley case? Is that him?"] },
  { id: "d_mikey", trigger: "hub", cond: { chapterAtLeast: 2, player: "MIKEY" }, messages: ["Mikey !!", "FGM legend", "Remember the nuclear war option", "That was MINE btw. The archive is right for once."] },
  { id: "d_vouchers", trigger: "hub", cond: { chapterAtLeast: 4 }, messages: ["I give this group chat my all", "AI images, AI songs, AI wiki pages, AI messages", "No money, no gift voucher, no food voucher", "No Door dash gift voucher, no grub hub gift voucher, no uber eats credits"] },
];
