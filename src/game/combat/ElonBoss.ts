import Phaser from "phaser";
import { Boss } from "./Bosses";
import type { CombatWorld } from "./types";
import { synth } from "../audio/Synth";
import { BOSS_TEXT } from "../../content/bosses";

/** Procedural stand-in until the PixelLab sheet (boss_elon) is loaded: a little man on a white rocket. */
function fallbackTexture(sc: Phaser.Scene): string {
  const key = "boss_elon_gen";
  if (sc.textures.exists(key)) return key;
  const S = 48;
  const tex = sc.textures.createCanvas(key, S * 2, S)!;
  const ctx = tex.getContext();
  const P = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  for (let f = 0; f < 2; f++) {
    const o = f * S;
    P(o + 6, 30 + f, 34, 9, "#e5e7eb"); // rocket
    P(o + 38, 32 + f, 6, 5, "#9ca3af");
    P(o + 1, 31 + f, 6, 7, f ? "#f97316" : "#fde047"); // flame
    P(o + 18, 16 + f, 10, 14, "#111111"); // t-shirt
    P(o + 19, 7 + f, 9, 9, "#f1c7a5"); // head
    P(o + 19, 6 + f, 9, 3, "#3f2a1a"); // hair
    P(o + 28, 12 + f, 6, 3, "#f1c7a5"); // arm
    P(o + 33, 9 + f, 3, 5, "#38bdf8"); // phone
  }
  tex.refresh();
  tex.add(0, 0, 0, 0, S, S);
  tex.add(1, 0, S, 0, S, S);
  return key;
}

/**
 * ELON MUSK (AI-generated): the mini-boss half way up THE ASCENT. Rides a rocket, follows you up the shaft,
 * drops Cybertrucks on you, fires rockets, and spams little X's. Not too hard: he's a distraction.
 */
export class ElonBoss extends Boss {
  private hoverSide = 1;
  constructor(w: CombatWorld, x: number, y: number) {
    const art = w.sc.textures.exists("boss_elon");
    super(w, "elon", x, y, 1300, art ? "boss_elon" : fallbackTexture(w.sc), 40, 0xe5e7eb, art ? 128 : 48, art ? 128 : 48);
    this.setScale(art ? 1.7 : 3);
    this.thresholds = [0.5];
    this.def = { ...this.def, shout: BOSS_TEXT.elon.taunts, shoutEvery: 2800, speed: 120, damage: 12 };
  }

  get radius() {
    return this.displayWidth * 0.28;
  }

  tick(dt: number, now: number) {
    if (this.dead) return;
    super.tick(dt, now);
    if (!this.started) return;
    const n = this.texture.frameTotal - 1;
    if (n > 2) this.legacyFrame(Math.floor(now / 110) % n);
  }

  pattern(_dt: number, now: number) {
    const w = this.world;
    const p = w.player;
    const ts = w.enemyTimeScale;
    // hover beside and above you, swapping sides now and then
    if (Math.random() < 0.004) this.hoverSide *= -1;
    const tx = Phaser.Math.Clamp(p.x + this.hoverSide * 230, w.bounds.left + 80, w.bounds.right - 80);
    const ty = p.y - 110;
    const d = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    if (d > 20) this.moveToward(tx, ty, Math.min(260, d * 2) * ts);
    else this.halt();
    this.setFlipX(p.x < this.x);
    if (now < this.nextPattern) return;
    const tele = 900 * w.telegraphMult;
    const pick = this.patternIdx++ % 4;
    if (pick === 0) {
      // CYBERTRUCKS: they fall out of the sky onto where you're standing
      const n = this.phase ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const lx = p.x + (i - (n - 1) / 2) * 150;
        const ly = p.y + 10;
        const delay = tele + i * 220;
        w.enemyAoe(lx, ly, 70, 16, delay, 0x94a3b8);
        this.dropTruck(lx, ly, delay);
      }
      w.floatText(this.x, this.y - this.displayHeight / 2 - 26, "CYBERTRUCK INCOMING! (delayed)", "#e5e7eb", 15);
      this.nextPattern = now + delay2(tele, n) + 1300;
    } else if (pick === 1) {
      // ROCKETS: they curve after you
      const tex = this.scene.textures.exists("c7_rocket") ? "c7_rocket" : undefined;
      for (let i = 0; i < (this.phase ? 4 : 3); i++)
        this.scene.time.delayedCall(i * 260, () => {
          if (this.dead || !this.active) return;
          const a = Math.atan2(p.y - this.y, p.x - this.x) + (i - 1) * 0.5;
          w.shoot(this.x, this.y, { owner: "enemy", damage: 11, speed: 170, angle: a, color: tex ? 0xffffff : 0xf97316, texture: tex, scale: tex ? 0.55 : 1.6, life: 4200, homing: 1.2 });
          synth.play("jet");
        });
      w.floatText(this.x, this.y - this.displayHeight / 2 - 26, "Rocket go UP!", "#fdba74", 15);
      this.nextPattern = now + 2300;
    } else if (pick === 2) {
      // little X's
      const live = w.enemies.filter((e) => !e.dead && e.def.id === "x_logo").length;
      if (live < 6) for (let i = 0; i < (this.phase ? 4 : 3); i++) w.spawnEnemy("x_logo", this.x + (i - 1) * 50, this.y + 30, { minion: true, noDrops: true });
      w.floatText(this.x, this.y - this.displayHeight / 2 - 26, "X MARKS THE SPOT!", "#ffffff", 15);
      this.nextPattern = now + 2400;
    } else {
      // a tweetstorm
      this.fan(this.phase ? 7 : 5, 0.2, 230, 9, 0x38bdf8);
      w.floatText(this.x, this.y - this.displayHeight / 2 - 26, "*TWEETSTORM*", "#7dd3fc", 15);
      this.nextPattern = now + 1800;
    }
  }

  /** A Cybertruck tumbles out of the sky and lands on the marker. */
  private dropTruck(x: number, y: number, delay: number) {
    const sc = this.scene;
    const key = sc.textures.exists("c7_cybertruck") ? "c7_cybertruck" : null;
    const truck = key ? sc.add.image(x, y - 560, key).setScale(1.6) : sc.add.rectangle(x, y - 560, 70, 26, 0x9ca3af).setStrokeStyle(2, 0x111111);
    truck.setDepth(960).setAngle(Phaser.Math.Between(-30, 30));
    sc.tweens.add({
      targets: truck,
      y: y - 20,
      angle: Phaser.Math.Between(-12, 12),
      duration: delay,
      ease: "Quad.in",
      onComplete: () => {
        synth.play("smash");
        this.world.shake(180, 0.012);
        this.world.burst(x, y, 0xcbd5e1, 14);
        sc.tweens.add({ targets: truck, alpha: 0, delay: 700, duration: 400, onComplete: () => truck.destroy() });
      },
    });
  }
}

const delay2 = (tele: number, n: number) => tele + (n - 1) * 220;
