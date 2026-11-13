import Phaser from "phaser";
import { Boss } from "./Bosses";
import type { CombatWorld } from "./types";
import { synth } from "../audio/Synth";

/** Procedural stand-in until the PixelLab sheet (boss_pudding_demon) is installed: a horned slab of pudding. */
function fallbackTexture(sc: Phaser.Scene): string {
  const key = "boss_pudding_demon_gen";
  if (sc.textures.exists(key)) return key;
  const S = 32;
  const tex = sc.textures.createCanvas(key, S * 2, S)!;
  const ctx = tex.getContext();
  const P = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  for (let f = 0; f < 2; f++) {
    const o = f * S;
    const b = f; // bob
    P(o + 4, 9 + b, 24, 20, "#b45309"); // crust
    P(o + 6, 11 + b, 20, 16, "#fcd34d"); // custard
    P(o + 6, 11 + b, 20, 3, "#fde68a");
    for (const [x, y] of [[9, 20], [20, 17], [14, 24], [23, 23]]) P(o + x, y + b, 2, 2, "#4a2511"); // raisins
    P(o + 5, 4 + b, 3, 6, "#dc2626"); // horns
    P(o + 24, 4 + b, 3, 6, "#dc2626");
    P(o + 10, 13 + b, 4, 3, "#ff4fd8"); // eyes
    P(o + 18, 13 + b, 4, 3, "#ff4fd8");
    P(o + 11, 18 + b, 10, 5 + f, "#3b0a0a"); // screaming mouth
    P(o + 12, 18 + b, 2, 2, "#ffffff");
    P(o + 18, 18 + b, 2, 2, "#ffffff");
    P(o + 2, 16 + b - f * 2, 3, 6, "#b45309"); // arms
    P(o + 27, 16 + b - f * 2, 3, 6, "#b45309");
    P(o + 8, 29, 4, 3, "#fcd34d"); // custard drips
    P(o + 20, 29 + f, 3, 3, "#fcd34d");
  }
  tex.refresh();
  tex.add(0, 0, 0, 0, S, S);
  tex.add(1, 0, S, 0, S, S);
  return key;
}

const KIDS = ["KIDS! KIDS!", "KIIIIIDS!", "KIDS! KIDS! KIDS!", "KIDS!!"];

/**
 * THE PUDDING DEMON: the big one, at the bottom of Lulon's mind. Made of bread and butter pudding.
 * Spits custard, rolls raisins, and calls up more little demons. All it ever says is KIDS.
 */
export class PuddingDemonBoss extends Boss {
  private rollUntil = 0;
  private rollAngle = 0;
  constructor(w: CombatWorld, x: number, y: number) {
    const art = w.sc.textures.exists("boss_pudding_demon");
    super(w, "pudding_demon", x, y, 1400, art ? "boss_pudding_demon" : fallbackTexture(w.sc), 32, 0xfacc15, 32, 32);
    this.setScale(3.4);
    // the scene's shout loop gives it speech bubbles
    this.def = { ...this.def, shout: KIDS, shoutEvery: 1600 };
  }

  tick(dt: number, now: number) {
    super.tick(dt, now);
    if (this.dead || !this.started) return;
    // the animated PixelLab sheet plays all its frames
    const n = this.texture.frameTotal - 1;
    if (n > 2) this.setFrame(Math.floor(now / 110) % n);
  }

  pattern(_dt: number, now: number) {
    const p = this.world.player;
    const ts = this.world.enemyTimeScale;
    if (now < this.rollUntil) {
      this.moveToward(this.x + Math.cos(this.rollAngle) * 100, this.y + Math.sin(this.rollAngle) * 100, 480 * ts);
      return;
    }
    this.moveToward(p.x, p.y, (this.phase ? 80 : 60) * ts);
    if (now < this.nextPattern) return;
    const tele = 800 * this.world.telegraphMult;
    const pick = this.patternIdx++ % (this.phase ? 4 : 3);
    this.taunt();
    if (pick === 0) {
      // custard spray
      this.fan(this.phase ? 7 : 5, 0.22, 200, 10, 0xfde68a);
      this.world.sc.time.delayedCall(350, () => !this.dead && this.fan(this.phase ? 7 : 5, 0.22, 200, 10, 0xfcd34d));
      this.nextPattern = now + 1900;
    } else if (pick === 1) {
      // more little demons, all shouting
      for (let i = 0; i < (this.phase > 1 ? 4 : 3); i++) this.world.spawnEnemy("mind_imp", this.x + (i - 1) * 60, this.y + 50, { minion: true });
      synth.play("roar");
      this.nextPattern = now + 2600;
    } else if (pick === 2) {
      // raisin rain
      for (let i = 0; i < (this.phase ? 7 : 5); i++) this.world.enemyAoe(p.x + (Math.random() - 0.5) * 260, p.y + (Math.random() - 0.5) * 260, 44, 14, tele + i * 90, 0x7c2d12);
      this.nextPattern = now + 2200;
    } else {
      // the pudding rolls at you
      this.halt();
      this.rollAngle = Math.atan2(p.y - this.y, p.x - this.x);
      this.world.enemyLine(this.x, this.y, this.rollAngle, 500, 80, 0, tele);
      this.world.sc.time.delayedCall(tele, () => (this.rollUntil = this.world.now() + 700));
      this.ring(12, 160, 9, 0xfde68a, now / 400);
      this.nextPattern = now + tele + 1800;
    }
  }
}
