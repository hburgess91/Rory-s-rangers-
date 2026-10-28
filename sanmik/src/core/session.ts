// State for the current run. Reset when a new game starts from the title.

export type CharId = 'sanmik' | 'sanchz';

export interface Session {
  char: CharId;
  costume: string;
  score: number;
  kills: number;
  deaths: number;
  hitsTaken: number;
  startedAt: number;
  chapterStartedAt: number;
  chapterHits: number;
  followersClaimed: number;
  jumps: number;
  seenIntro: boolean;
}

export const session: Session = {
  char: 'sanmik',
  costume: 'classic',
  score: 0,
  kills: 0,
  deaths: 0,
  hitsTaken: 0,
  startedAt: 0,
  chapterStartedAt: 0,
  chapterHits: 0,
  followersClaimed: 0,
  jumps: 0,
  seenIntro: false,
};

export function newSession(char: CharId, costume: string) {
  Object.assign(session, {
    char, costume, score: 0, kills: 0, deaths: 0, hitsTaken: 0,
    startedAt: performance.now(), chapterStartedAt: performance.now(), chapterHits: 0,
    followersClaimed: 0, jumps: 0,
  });
}

export function textureFor(char: CharId, costume: string) {
  return `${char}_${costume}`;
}

export const CHAR_INFO: Record<CharId, { name: string; title: string; costumes: string[]; costumeNames: string[]; blurb: string[] }> = {
  sanmik: {
    name: 'SANMIK',
    title: 'DA LEGEND',
    costumes: ['classic', 'alt'],
    costumeNames: ['DA SUIT', 'DA NECKLACE'],
    blurb: ['Straight-up ranged damage.', 'Mik Blast: hold to fire, release when charged for a YEE.', 'Shotgun, Uzi, Chainsaw, Bat.', 'Special: DELUSION MODE.'],
  },
  sanchz: {
    name: 'SANCHZ',
    title: 'DA POLSONATOR',
    costumes: ['classic', 'party'],
    costumeNames: ['CLASSIC', 'PARTY'],
    blurb: ['Crutch reach, guards and gas.', 'Jam doughnuts, bean bombs, sausage rolls.', 'Down + Melee: Rancid Fart.', 'Special: CRUNK MODE.'],
  },
};
