// How tall each lad is. Nothing in here imports Phaser, so it can be unit-tested.
//
// Real heights (from the lads themselves), in inches. 5'10" is the reference: every PixelLab sheet
// was drawn with the figure filling a 64px frame, so a 5'10" lad keeps exactly the size he has now.

/** Real heights, in inches, by base character id. Anyone not listed is 5'10". */
export const HEIGHT_INCHES: Record<string, number> = {
  KREZWONK: 70, // Matt Johnson, 5'10"
  GRONNY: 70, // Rory, 5'10"
  KREBLIS: 66, // David, 5'6"
  SCROMBUS: 68, // Ben Matthews, 5'8"
  KREZMAR: 73, // Charlie Brinkley, 6'1"
  CRONGUS: 67, // Luke Shears, 5'7"
  KREBON: 70, // Benn Orgill, 5'10"
  DRONGUS: 70, // Harry, 5'10"
  MIKEY: 67, // Mikey, 5'7"
  FLENKY: 70, // Jenko, 5'10"
  POLSON: 70, // Polson, 5'10"
};

/** The reference height (factor 1.0). */
export const REF_INCHES = 70;
/** Real differences are a few percent, which vanishes at sprite size, so the deviation is exaggerated by this much. */
export const HEIGHT_EXAGGERATION = 1.5;
/** Factors are snapped to whole pixels of the 64px frame, so a lad drawn at his usual size is an exact pixel height. */
export const HEIGHT_SNAP = 64;

/** Variants, doubles and alternate forms that share someone else's height. */
export const HEIGHT_ALIAS: Record<string, string> = {
  SANMIK: "MIKEY",
  SANCHZ: "POLSON",
  POLSON_FAT: "POLSON",
  "LIL' CRONGUS": "CRONGUS",
  // Kreddle doubles
  KLENKY: "FLENKY",
  SKROMBUS: "SCROMBUS",
  KREDMAR: "KREZMAR",
  KREDBLIS: "KREBLIS",
  KREDWONK: "KREZWONK",
  KREDBON: "KREBON",
  "LIL' KRUNGUS": "CRONGUS",
  GRENNY: "GRONNY",
  "MIKKY K": "MIKEY",
  "DARK JENKO": "FLENKY",
};

/** Resolve a speaker / character id (SUPER_ forms, variants and doubles included) to the id whose height it uses. */
export function heightId(id: string): string {
  let k = id.toUpperCase();
  if (k.startsWith("SUPER_")) k = k.slice(6);
  return HEIGHT_ALIAS[k] ?? k;
}

/** Height factor for a character relative to 5'10" (1.0), exaggerated and snapped to 1/64. */
export function heightFactor(id: string): number {
  const inches = HEIGHT_INCHES[heightId(id)];
  if (inches === undefined || inches === REF_INCHES) return 1;
  const raw = 1 + (HEIGHT_EXAGGERATION * (inches - REF_INCHES)) / REF_INCHES;
  return Math.round(raw * HEIGHT_SNAP) / HEIGHT_SNAP;
}

/** How many pixels tall a 5'10" lad stands in his 64px frame (feet to crown, idle facing south). */
export const REF_PX = 60;

/**
 * The scale that makes a lad's art stand at his height. The sheets were drawn by different hands at slightly
 * different sizes (and some have big caricature heads), so the figure's own pixel height `artPx` (feet to crown
 * in the idle south frame) is measured and scaled to REF_PX x his height factor, rounded to whole pixels.
 * Clamped so a stray pixel in the art can't make anyone a giant.
 */
export function fitTall(id: string, artPx: number): number {
  const target = Math.round(REF_PX * heightFactor(id));
  if (!(artPx > 0)) return heightFactor(id);
  return Math.min(1.25, Math.max(0.85, target / artPx));
}

/** Is this sprite texture key one of the people in the height table (`spr_<ID>`, `spr_SUPER_<ID>`, variants)? */
export function isHeightKey(key: string): boolean {
  return key.startsWith("spr_") && HEIGHT_INCHES[heightId(key.slice(4))] !== undefined;
}

/**
 * Height factor for a sprite texture key: `spr_<ID>` and `spr_SUPER_<ID>` sheets of the people above.
 * Everything else (bosses, enemies, townsfolk, TV guests, Drongus's boss forms) is 1.
 */
export function textureHeightFactor(key: string): number {
  if (!key.startsWith("spr_")) return 1;
  return heightFactor(key.slice(4));
}
