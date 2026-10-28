// Campaign order. Each chapter = a run-and-gun level, then a boss arena.

export interface SceneRef { key: string; data?: Record<string, unknown> }

export interface Chapter {
  n: number;
  title: string;
  boss: string; // boss name shown on the select screen
  level: SceneRef;
  arena: SceneRef;
}

export const CHAPTERS: Chapter[] = [
  { n: 1, title: 'DA JOBCENTRE BEYOND', boss: 'DA FAME ALGORITHM', level: { key: 'level', data: { id: 'jobcentre' } }, arena: { key: 'fame' } },
  { n: 2, title: 'BIG TESK-O', boss: 'BEGOUR THE BEAR', level: { key: 'tesko' }, arena: { key: 'begour' } },
  { n: 3, title: 'NIGHT OF FREEDOM', boss: 'DA BANK TANK', level: { key: 'level', data: { id: 'freedom' } }, arena: { key: 'tank' } },
  { n: 4, title: "DA NU WAREHOUSE: RIK'S BANTA BASEMENT", boss: 'UNCLE RIK / SANRIK', level: { key: 'level', data: { id: 'warehouse' } }, arena: { key: 'rik' } },
  { n: 5, title: 'DA MAJEK LAMPE', boss: 'GABOR THE GOAT', level: { key: 'level', data: { id: 'lampe' } }, arena: { key: 'gabor' } },
];

/** Where to go after beating chapter n's boss and seeing the results. */
export function afterChapter(n: number): SceneRef {
  const next = CHAPTERS.find((c) => c.n === n + 1);
  return next ? next.level : { key: 'ending' };
}
