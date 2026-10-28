// Asset contract. Every visual/audio slot the game uses is listed here.
//
// status 'placeholder' -> the game generates a stand-in at boot (src/art, src/audio/synth).
// status 'final'       -> the file at `file` (relative to /public) is loaded instead.
//
// To drop in real art or audio: put the file at the listed path, keep the same
// frame size / frame names, and flip status to 'final'. No gameplay code changes.

export type AssetStatus = 'placeholder' | 'final';

export interface SpriteAsset {
  id: string;
  file: string;
  frameW: number;
  frameH: number;
  // Animation name -> frame count. Each animation is one row of the sheet, frames left to right,
  // rows in this order. Frames are named `${anim}_${i}` (single-frame non-player anims use the bare name).
  anims?: Record<string, number>;
  origin?: string;
  status: AssetStatus;
  notes?: string;
}

export interface AudioAsset {
  id: string;
  file: string;
  category: 'voice' | 'music' | 'sfx';
  status: AssetStatus;
  notes?: string;
}

const PLAYER_ANIMS_SANMIK = { idle: 4, run: 6, jump: 2, fall: 2, crouch: 1, hurt: 2, ko: 3, victory: 4, pose: 1 };
const PLAYER_ANIMS_SANCHZ = {
  idle: 4, run: 6, jump: 2, fall: 2, crouch: 1, hurt: 2, ko: 3, victory: 4,
  throw: 2, throwup: 2, strike1: 2, strike2: 2, strike3: 2, guard: 1, fart: 2,
};

export const SPRITES: SpriteAsset[] = [
  { id: 'sanmik_classic', file: 'assets/sprites/sanmik_classic.png', frameW: 48, frameH: 72, anims: PLAYER_ANIMS_SANMIK, origin: 'feet centre (24,71)', status: 'placeholder', notes: 'Afro, white sunglasses, drawn goatee, blue double-breasted jacket. Front arm is a separate sprite.' },
  { id: 'sanmik_alt', file: 'assets/sprites/sanmik_alt.png', frameW: 48, frameH: 72, anims: PLAYER_ANIMS_SANMIK, origin: 'feet centre (24,71)', status: 'placeholder', notes: 'Afro, dark sunglasses, white tee, chunky turquoise necklace.' },
  { id: 'sanchz_classic', file: 'assets/sprites/sanchz_classic.png', frameW: 56, frameH: 64, anims: PLAYER_ANIMS_SANCHZ, origin: 'feet centre (28,63)', status: 'placeholder', notes: 'Black vest, blue patterned cap, thick glasses, two forearm crutches.' },
  { id: 'sanchz_party', file: 'assets/sprites/sanchz_party.png', frameW: 56, frameH: 64, anims: PLAYER_ANIMS_SANCHZ, origin: 'feet centre (28,63)', status: 'placeholder', notes: 'Pink jacket, pink wig, giant orange glasses, pendant, crutches.' },
  { id: 'arm_sanmik_classic', file: 'assets/sprites/arm_sanmik_classic.png', frameW: 40, frameH: 16, anims: { mik: 1, shotgun: 1, uzi: 1, chainsaw: 2, bat: 1 }, origin: 'shoulder (4,8)', status: 'placeholder' },
  { id: 'arm_sanmik_alt', file: 'assets/sprites/arm_sanmik_alt.png', frameW: 40, frameH: 16, anims: { mik: 1, shotgun: 1, uzi: 1, chainsaw: 2, bat: 1 }, origin: 'shoulder (4,8)', status: 'placeholder' },
  { id: 'begour_body', file: 'assets/sprites/begour_body.png', frameW: 120, frameH: 100, status: 'placeholder' },
  { id: 'begour_head', file: 'assets/sprites/begour_head.png', frameW: 104, frameH: 88, anims: { happy: 1, normal: 1, sad: 1, cry: 2, hurt: 1, shout: 1 }, status: 'placeholder' },
  { id: 'begour_paw', file: 'assets/sprites/begour_paw.png', frameW: 40, frameH: 40, status: 'placeholder' },
  { id: 'begour_bigpaw', file: 'assets/sprites/begour_bigpaw.png', frameW: 96, frameH: 120, status: 'placeholder' },
  { id: 'enemy_trolley', file: 'assets/sprites/enemy_trolley.png', frameW: 36, frameH: 32, anims: { roll: 2 }, status: 'placeholder' },
  { id: 'enemy_wasp', file: 'assets/sprites/enemy_wasp.png', frameW: 24, frameH: 20, anims: { fly: 2 }, status: 'placeholder' },
  { id: 'enemy_mascot', file: 'assets/sprites/enemy_mascot.png', frameW: 26, frameH: 34, anims: { hop: 2 }, status: 'placeholder' },
  { id: 'enemy_dummy', file: 'assets/sprites/enemy_dummy.png', frameW: 32, frameH: 60, status: 'placeholder', notes: 'Life-size SanMik cardboard cutout.' },
];

export const AUDIO: AudioAsset[] = [
  // The jump vocals are the most important audio in the game. Supply real takes.
  { id: 'vo_yee_1', file: 'assets/audio/voice/yee_1.ogg', category: 'voice', status: 'placeholder', notes: 'SanMik jump: high, thin, nasal, shrill.' },
  { id: 'vo_yee_2', file: 'assets/audio/voice/yee_2.ogg', category: 'voice', status: 'placeholder' },
  { id: 'vo_yee_3', file: 'assets/audio/voice/yee_3.ogg', category: 'voice', status: 'placeholder' },
  { id: 'vo_yeghhh_1', file: 'assets/audio/voice/yeghhh_1.ogg', category: 'voice', status: 'placeholder', notes: 'SanChz jump: low, guttural, rough.' },
  { id: 'vo_yeghhh_2', file: 'assets/audio/voice/yeghhh_2.ogg', category: 'voice', status: 'placeholder' },
  { id: 'vo_yeghhh_3', file: 'assets/audio/voice/yeghhh_3.ogg', category: 'voice', status: 'placeholder' },
  // Music slots. Placeholders are generated chiptune loops. Only use recordings you have the right to use.
  { id: 'mus_title', file: 'assets/audio/music/title.ogg', category: 'music', status: 'placeholder', notes: 'Suggested: Phresh' },
  { id: 'mus_intro', file: 'assets/audio/music/the_end.ogg', category: 'music', status: 'placeholder', notes: 'Suggested: The End' },
  { id: 'mus_tesko', file: 'assets/audio/music/tesko.ogg', category: 'music', status: 'placeholder' },
  { id: 'mus_forest', file: 'assets/audio/music/forest.ogg', category: 'music', status: 'placeholder' },
  { id: 'mus_begour', file: 'assets/audio/music/begour.ogg', category: 'music', status: 'placeholder' },
  { id: 'mus_delusion', file: 'assets/audio/music/phresh.ogg', category: 'music', status: 'placeholder', notes: 'Suggested: Phresh' },
  { id: 'mus_crunk', file: 'assets/audio/music/crunk.ogg', category: 'music', status: 'placeholder', notes: 'Suggested: Getting Crunk Wiv SanChz' },
  { id: 'mus_gym', file: 'assets/audio/music/gym.ogg', category: 'music', status: 'placeholder' },
  { id: 'mus_results', file: 'assets/audio/music/results.ogg', category: 'music', status: 'placeholder', notes: 'Suggested: SanMik Should\'ve Gone Viral' },
];

export const finalSprites = () => SPRITES.filter((s) => s.status === 'final');
export const finalAudio = () => AUDIO.filter((a) => a.status === 'final');
export const audioAsset = (id: string) => AUDIO.find((a) => a.id === id);
