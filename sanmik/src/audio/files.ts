// Real recordings shipped with the game (src/assets/audio). Vite turns each into a
// URL (a separate file in normal builds, inlined data in the single-file build).

const music = import.meta.glob('../assets/audio/music/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const voice = import.meta.glob('../assets/audio/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const byName = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k.split('/').pop()!.replace('.mp3', ''), v]));
const M = byName(music);
const V = byName(voice);

/** Music slot -> song file. Slots without a file fall back to the generated chiptune. */
export const MUSIC_FILES: Record<string, string | undefined> = {
  mus_title: M.phresh,
  mus_intro: M.the_end,
  mus_jobcentre: M.in_tha_hot_tub,
  mus_tesko: M.fuck_u_bitch,
  mus_begour: M.mdmazing,
  mus_freedom: M.night_of_freedom,
  mus_warehouse: M.pure_banta_bang,
  mus_gabor: M.deep_in_ure_ass,
  mus_delusion: M.phresh,
  mus_crunk: M.gettin_crunk,
  mus_results: M.shouldve_gone_viral,
};

/** Jump vocals: every take, picked at random on each jump. */
export const VOICE_FILES: Record<string, string[]> = {
  vo_yee: Object.keys(V).filter((k) => /^yee_\d+$/.test(k)).map((k) => V[k]),
  vo_yeghhh: Object.keys(V).filter((k) => /^yeghhh_\d+$/.test(k)).map((k) => V[k]),
};
