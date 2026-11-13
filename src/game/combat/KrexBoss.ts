import Phaser from "phaser";
import { Boss } from "./Bosses";
import type { CombatWorld } from "./types";
import { synth } from "../audio/Synth";
import { hasVfx, vfx } from "../gfx/Vfx";
import { BOSS_TEXT } from "../../content/bosses";

/**
 * METAL GEAR KREX: Drongus's AI-generated bipedal nuclear walking tank (a parody, and extremely horny).
 * Side-scroller mini-boss at the end of Da Drongus Corridor.
 *
 * The art is one 128px PixelLab picture cut into pieces: the hull is the boss sprite, and the rail gun, gun arm,
 * tail, both legs and the cockpit head are separate images riding on it. As its HP drops the bits fall off one
 * by one (sparks, smoke, an explosion, the piece crashing to the floor), and each loss changes what it can do.
 */

type PartId = "gun" | "arm" | "tail" | "legb" | "legf" | "head";
/** The order the bits come off in, at these fractions of HP. The head goes when it dies. */
const DETACH: PartId[] = ["gun", "arm", "tail", "legb", "legf"];
const THRESH = [0.82, 0.65, 0.5, 0.34, 0.18];
/** Where each piece's stump is, in source pixels of the 128px picture (for the sparks). */
const STUMP: Record<PartId, [number, number]> = { gun: [48, 40], arm: [88, 74], tail: [38, 80], legb: [54, 78], legf: [84, 80], head: [90, 48] };
const PART_NAME: Record<PartId, string> = { gun: "RAIL GUN", arm: "GATLING ARM", tail: "TAIL", legb: "BACK LEG", legf: "FRONT LEG", head: "COCKPIT" };
const LOSS_LINE: Record<PartId, string> = {
  gun: "MY RAIL GUN! …LIBIDO: UNAFFECTED.",
  arm: "THAT WAS MY GUN ARM. NOT MY HORNY ARM. THEY ARE ALL HORNY ARMS.",
  tail: "I DID NOT NEED THAT TAIL. I NEED ONLY PUSSY JUICE.",
  legb: "ONE LEG. STILL HORNY.",
  legf: "NO LEGS. I WILL DRAG MYSELF TO THE PUSSY JUICE.",
  head: "",
};
const SRC = 128;

/** Procedural stand-in (until the PixelLab pieces are loaded): a chunky grey robo-dino in boxes. */
function fallback(sc: Phaser.Scene) {
  const draw = (key: string, rects: [number, number, number, number, string][], frames = 1) => {
    if (sc.textures.exists(key)) return;
    const t = sc.textures.createCanvas(key, SRC * frames, SRC)!;
    const ctx = t.getContext();
    for (let f = 0; f < frames; f++) for (const [x, y, w, h, c] of rects) {
      ctx.fillStyle = c;
      ctx.fillRect(f * SRC + x, y, w, h);
    }
    t.refresh();
    for (let f = 0; f < frames; f++) t.add(f, 0, f * SRC, 0, SRC, SRC);
  };
  draw("boss_krex", [[40, 40, 52, 36, "#4b4f58"], [50, 46, 30, 6, "#a855f7"], [60, 42, 14, 4, "#facc15"]], 2);
  draw("c7_krex_gun", [[30, 18, 90, 10, "#3f3f46"], [36, 26, 24, 16, "#52525b"]]);
  draw("c7_krex_arm", [[88, 68, 30, 10, "#3f3f46"], [112, 66, 8, 14, "#71717a"]]);
  draw("c7_krex_tail", [[8, 70, 34, 12, "#4b4f58"], [6, 82, 14, 26, "#4b4f58"]]);
  draw("c7_krex_legb", [[40, 76, 24, 40, "#7c2d12"], [36, 112, 32, 6, "#3f3f46"]]);
  draw("c7_krex_legf", [[72, 76, 24, 40, "#7c2d12"], [70, 112, 36, 6, "#3f3f46"]]);
  draw("c7_krex_head", [[88, 32, 32, 28, "#52525b"], [94, 40, 22, 8, "#c084fc"]]);
}

export class KrexBoss extends Boss {
  sideGravity = true;
  /** The bits still bolted on. */
  private parts = new Map<PartId, Phaser.GameObjects.Image>();
  private lost = new Set<PartId>();
  private stumpFx: Phaser.Time.TimerEvent | null = null;
  private fitted = false;
  private walkT = 0;
  private dragUntil = 0;
  private dragDir = 1;
  private sc: Phaser.Scene;

  constructor(w: CombatWorld, x: number, y: number) {
    fallback(w.sc);
    super(w, "krex", x, y, 2300, "boss_krex", 48, 0x6b7280, SRC, SRC);
    this.sc = w.sc;
    this.setScale(2.5);
    this.thresholds = [...THRESH];
    this.def = { ...this.def, shout: BOSS_TEXT.krex.taunts, shoutEvery: 3400, speed: 55, damage: 22 };
    for (const id of ["tail", "legb", "gun", "legf", "arm", "head"] as PartId[]) {
      const key = `c7_krex_${id}`;
      const img = this.sc.add.image(x, y, key).setScale(2.5);
      this.parts.set(id, img);
    }
    this.syncParts(0);
    this.on("destroy", () => {
      this.stumpFx?.remove();
      for (const p of this.parts.values()) p.destroy();
    });
  }

  /** The hull's physics box, fitted to the art (its feet are at y=117 of 128). */
  private fit() {
    if (this.fitted) return;
    this.fitted = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(78, 96).setOffset(28, 21);
  }

  get radius() {
    return 34 * this.scaleX;
  }

  /** Lay the bolted-on bits over the hull (walk cycle: legs alternate, the hull bobs). */
  private syncParts(now: number) {
    const legs = !this.lost.has("legb") || !this.lost.has("legf");
    const step = legs && Math.abs((this.body as Phaser.Physics.Arcade.Body | undefined)?.velocity.x ?? 0) > 5 ? Math.sin(this.walkT / 140) : 0;
    const k = this.scaleX;
    for (const [id, img] of this.parts) {
      let dy = 0;
      if (id === "legf") dy = Math.max(0, step) * -5 * (k / 2.5);
      else if (id === "legb") dy = Math.max(0, -step) * -5 * (k / 2.5);
      else dy = Math.abs(step) * 2 * (k / 2.5);
      img.setPosition(this.x, this.y + dy).setFlipX(this.flipX).setDepth(this.depth + (id === "legb" || id === "tail" ? -1 : 1)).setScale(k);
      img.setVisible(this.visible).setAlpha(this.alpha);
      if (now < this.flashUntil) img.setTintFill(0xffffff);
      else img.clearTint();
    }
  }

  /** A point on the art (source pixels) in the world, mirrored when it faces left. */
  private at(px: number, py: number): [number, number] {
    const k = this.scaleX;
    const dx = (px - SRC / 2) * k * (this.flipX ? -1 : 1);
    return [this.x + dx, this.y + (py - SRC / 2) * k];
  }

  private has(id: PartId) {
    return !this.lost.has(id);
  }

  tick(dt: number, now: number) {
    if (this.dead) return;
    this.fit();
    this.walkT += dt;
    // Boss.tick flips between frames 0 and 1; the hull sheet has both, so that's fine
    super.tick(dt, now);
    this.syncParts(now);
  }

  onPhase(n: number, now: number) {
    const id = DETACH[n - 1];
    if (id) this.detach(id, now);
  }

  /** A piece comes off: sparks, a bang, smoke, and it crashes down to the floor. */
  private detach(id: PartId, _now: number) {
    const img = this.parts.get(id);
    if (!img || this.lost.has(id)) return;
    this.lost.add(id);
    this.parts.delete(id);
    const w = this.world;
    const sc = this.sc;
    const [sx, sy] = this.at(...STUMP[id]);
    synth.play("boom");
    w.boomFx?.(sx, sy, 1.3);
    w.burst(sx, sy, 0xfde047, 26);
    w.burst(sx, sy, 0xf97316, 18);
    w.shake(420, 0.022);
    w.hitStop(90);
    sc.cameras.main.flash(120, 255, 220, 160);
    w.floatText(sx, sy - 40, `${PART_NAME[id]} DESTROYED!`, "#fde047", 22);
    if (LOSS_LINE[id]) sc.time.delayedCall(500, () => !this.dead && w.floatText(this.x, this.y - this.displayHeight / 2 - 20, LOSS_LINE[id], "#ff6b9d", 15));
    // the piece falls (it's drawn on the whole 128px canvas, so it falls around its own middle)
    const gy = w.groundY ?? this.y + 100;
    const dir = (this.flipX ? -1 : 1) * (id === "tail" || id === "legb" ? -1 : 1);
    img.setDepth(this.depth + 2);
    const spin = dir * Phaser.Math.Between(25, 70);
    const landY = gy - 30 - Phaser.Math.Between(0, 20) - (img.displayHeight * 0.1);
    sc.tweens.add({ targets: img, x: img.x + dir * Phaser.Math.Between(120, 220), duration: 900, ease: "Quad.out" });
    sc.tweens.add({
      targets: img,
      y: { from: img.y, to: img.y - 90 },
      duration: 280,
      ease: "Quad.out",
      onComplete: () =>
        sc.tweens.add({
          targets: img,
          y: landY,
          angle: spin,
          duration: 520,
          ease: "Quad.in",
          onComplete: () => {
            synth.play("smash");
            w.shake(160, 0.01);
            w.burst(img.x, gy - 10, 0x9ca3af, 14);
            if (hasVfx(sc, "vfx_dust")) vfx(sc, "vfx_dust", img.x, gy - 6, { scale: 1.4, depth: img.depth + 1 });
            // it lies there smoking for a while, then the dungeon tidies up
            const smoke = sc.time.addEvent({ delay: 380, repeat: 12, callback: () => this.puff(img.x + Phaser.Math.Between(-40, 40), gy - 30, 0.7) });
            img.setTint(0x6b6b6b);
            sc.tweens.add({ targets: img, alpha: 0, delay: 6000, duration: 1200, onComplete: () => (smoke.remove(), img.destroy()) });
          },
        }),
    });
    // with no legs left it sinks down onto its belly
    if (this.lost.has("legb") && this.lost.has("legf")) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(78, 60).setOffset(28, 21);
      this.world.floatText(this.x, this.y - 40, "*CLANG*", "#ffffff", 20);
    }
    // the stumps keep sparking and smoking
    this.stumpFx ??= sc.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        if (this.dead || !this.active) return;
        const gone = [...this.lost];
        const p = gone[Math.floor(Math.random() * gone.length)];
        const [x, y] = this.at(...STUMP[p]);
        if (Math.random() < 0.6) this.world.burst(x, y, Math.random() < 0.5 ? 0xfde047 : 0xffffff, 4);
        else this.puff(x, y, 0.5);
      },
    });
    this.nextPattern = Math.max(this.nextPattern, this.world.now() + 900);
  }

  private puff(x: number, y: number, s: number) {
    const sc = this.sc;
    if (hasVfx(sc, "vfx_smoke")) vfx(sc, "vfx_smoke", x, y, { scale: s, depth: 900, tint: 0x555555 });
    else {
      const c = sc.add.circle(x, y, 10 * s, 0x444444, 0.6).setDepth(900);
      sc.tweens.add({ targets: c, y: y - 40, radius: 26 * s, alpha: 0, duration: 900, onComplete: () => c.destroy() });
    }
  }

  private walk(speed: number, keep: number) {
    const p = this.world.player;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dir = p.x < this.x ? -1 : 1;
    this.setFlipX(dir < 0);
    body.setVelocityX(Math.abs(p.x - this.x) > keep ? dir * speed * this.world.enemyTimeScale : 0);
  }

  pattern(_dt: number, now: number) {
    const w = this.world;
    const p = w.player;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const legs = (this.has("legb") ? 1 : 0) + (this.has("legf") ? 1 : 0);
    const gy = w.groundY ?? this.y + 100;
    if (now < this.dragUntil) {
      body.setVelocityX(this.dragDir * 360 * w.enemyTimeScale);
      if (Math.random() < 0.3) w.burst(this.x, gy - 6, 0xfde047, 2);
      return;
    }
    this.walk(legs === 2 ? 70 : legs === 1 ? 45 : 22, 220);
    if (now < this.nextPattern) return;
    const tele = 850 * w.telegraphMult;
    // what it can still do
    const moves: string[] = ["missiles"];
    if (this.has("gun")) moves.push("rail", "rail");
    if (this.has("arm")) moves.push("gatling");
    if (this.has("tail")) moves.push("tail");
    if (legs) moves.push("stomp");
    else moves.push("drag", "nuke");
    if (this.lost.size >= 2) moves.push("vent");
    const pick = moves[this.patternIdx++ % moves.length];
    if (pick === "rail") {
      // RAIL GUN: a red line from the muzzle to you, then a beam. Get out of the line.
      const [mx, my] = this.at(122, 18);
      const ang = Math.atan2(p.y - my, p.x - mx);
      w.enemyLine(mx, my, ang, 1400, 46, 30, tele + 250);
      w.floatText(mx, my - 30, "RAIL GUN CHARGING. AS AM I.", "#ff6b9d", 15);
      synth.play("telegraph");
      this.sc.time.delayedCall(tele + 250, () => {
        if (this.dead || !this.active) return;
        synth.play("gun_rail");
        w.shake(260, 0.016);
        const g = this.sc.add.graphics().setDepth(950).setBlendMode(Phaser.BlendModes.ADD);
        g.lineStyle(26, 0xa855f7, 0.8).lineBetween(mx, my, mx + Math.cos(ang) * 1400, my + Math.sin(ang) * 1400);
        g.lineStyle(8, 0xffffff, 1).lineBetween(mx, my, mx + Math.cos(ang) * 1400, my + Math.sin(ang) * 1400);
        this.sc.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() });
      });
      this.nextPattern = now + tele + 1700;
    } else if (pick === "gatling") {
      // GATLING ARM: a long rattling burst
      const [mx, my] = this.at(120, 74);
      for (let i = 0; i < 14; i++)
        this.sc.time.delayedCall(i * 85, () => {
          if (this.dead || !this.active) return;
          const a = Math.atan2(p.y - my, p.x - mx) + (Math.random() - 0.5) * 0.28;
          w.shoot(mx, my, { owner: "enemy", damage: 9, speed: 340, angle: a, color: 0xfde047, life: 3000 });
          if (i % 3 === 0) synth.play("gun_gatling");
        });
      w.floatText(this.x, this.y - this.displayHeight / 2 - 30, "BRRRRRRT (HORNILY)", "#fde047", 15);
      this.nextPattern = now + 2300;
    } else if (pick === "tail") {
      // TAIL SWEEP: low along the floor behind and in front. Jump.
      w.enemyLine(this.x - 420, gy - 16, 0, 840, 40, 18, tele);
      w.floatText(this.x, this.y - this.displayHeight / 2 - 30, "TAIL SWEEP (JUMP!)", "#fca5a5", 15);
      this.nextPattern = now + tele + 1300;
    } else if (pick === "stomp") {
      // STOMP: it hops and lands, and a shockwave runs along the floor both ways. Jump it.
      if (body.blocked.down || body.touching.down) body.setVelocityY(legs === 2 ? -620 : -380);
      w.floatText(this.x, this.y - this.displayHeight / 2 - 30, legs === 2 ? "STOMP (JUMP!)" : "LIMPY STOMP", "#fde047", 15);
      this.sc.time.delayedCall(legs === 2 ? 900 : 650, () => {
        if (this.dead || !this.active) return;
        synth.play("boom");
        w.shake(320, 0.02);
        w.enemyLine(this.x, gy - 14, 0, 1000, 34, 16, 160);
        w.enemyLine(this.x, gy - 14, Math.PI, 1000, 34, 16, 160);
        w.burst(this.x, gy - 6, 0x9ca3af, 16);
      });
      this.nextPattern = now + 2300;
    } else if (pick === "missiles") {
      // MISSILE POD: a ripple of strikes walking towards you
      const n = this.lost.size >= 3 ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const tx = p.x + (i - (n - 1) / 2) * 110 + (Math.random() - 0.5) * 40;
        w.enemyAoe(tx, Math.min(gy - 20, p.y + 10), 62, 15, tele + i * 140, 0xf97316);
      }
      w.floatText(this.x, this.y - this.displayHeight / 2 - 30, "MISSILES AWAY", "#fdba74", 15);
      this.nextPattern = now + 2100;
    } else if (pick === "drag") {
      // no legs: it hurls itself along the floor at you on its belly
      this.dragDir = p.x < this.x ? -1 : 1;
      w.enemyLine(this.x, gy - 40, this.dragDir > 0 ? 0 : Math.PI, 700, 80, 0, tele);
      this.sc.time.delayedCall(tele, () => (this.dragUntil = this.world.now() + 800));
      w.floatText(this.x, this.y - 60, "BELLY CHARGE", "#fca5a5", 15);
      this.nextPattern = now + tele + 1900;
    } else if (pick === "nuke") {
      // last resort: the nuclear bit. A big ring you have to be far away from.
      w.enemyAoe(this.x, gy - 40, 260, 26, tele + 600, 0x22c55e);
      w.floatText(this.x, this.y - 70, "☢ NUCLEAR PAYLOAD ☢ (RUN)", "#86efac", 18);
      synth.play("alarm");
      this.nextPattern = now + tele + 2200;
    } else {
      // VENT: the broken bits spray burning coolant everywhere
      this.ring(this.lost.size >= 4 ? 14 : 10, 190, 10, 0xf97316, now / 300);
      w.floatText(this.x, this.y - this.displayHeight / 2 - 30, "COOLANT LEAK (HORNY)", "#fdba74", 15);
      this.nextPattern = now + 1900;
    }
  }

  /** The big finish: an explosion chain across the hull, debris everywhere, the cockpit flies off. Called by the scene. */
  deathSequence(): Promise<void> {
    const sc = this.sc;
    const w = this.world;
    const gy = w.groundY ?? this.y + 100;
    this.stumpFx?.remove();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0).setAllowGravity(false);
    return new Promise((resolve) => {
      const N = 12;
      for (let i = 0; i < N; i++) {
        sc.time.delayedCall(i * 190, () => {
          const [x, y] = this.at(Phaser.Math.Between(20, 118), Phaser.Math.Between(20, 112));
          synth.play(i % 3 === 0 ? "boom" : "explode");
          w.boomFx?.(x, y, 0.9 + Math.random() * 0.6);
          w.burst(x, y, [0xfde047, 0xf97316, 0xffffff][i % 3], 16);
          w.shake(160, 0.018 + i * 0.001);
          if (i % 2 === 0) this.debris(x, y, gy);
          this.setTintFill(i % 2 ? 0xffffff : 0xff6a00);
          for (const p of this.parts.values()) p.setTintFill(i % 2 ? 0xffffff : 0xff6a00);
        });
      }
      // the cockpit pops off and bounces away
      sc.time.delayedCall(N * 190, () => {
        const head = this.parts.get("head");
        this.parts.delete("head");
        if (head) {
          head.clearTint();
          const dir = this.flipX ? -1 : 1;
          sc.tweens.add({ targets: head, x: head.x + dir * 320, angle: dir * 540, duration: 1300, ease: "Quad.out" });
          sc.tweens.add({ targets: head, y: head.y - 220, duration: 450, ease: "Quad.out", yoyo: false, onComplete: () => sc.tweens.add({ targets: head, y: gy - 120, duration: 650, ease: "Bounce.out" }) });
          sc.tweens.add({ targets: head, alpha: 0, delay: 7000, duration: 1000, onComplete: () => head.destroy() });
        }
        // the final bang: white-out, a huge boom, the hull is gone
        synth.play("boom");
        synth.play("explode");
        w.boomFx?.(this.x, this.y, 2.2);
        if (hasVfx(sc, "vfx_blastsmoke")) vfx(sc, "vfx_blastsmoke", this.x, gy, { scale: 2.2, depth: 960 });
        sc.cameras.main.flash(500, 255, 255, 255);
        w.shake(900, 0.035);
        w.hitStop(160);
        for (let i = 0; i < 10; i++) this.debris(this.x + Phaser.Math.Between(-80, 80), this.y + Phaser.Math.Between(-80, 60), gy);
        for (const p of this.parts.values()) {
          sc.tweens.add({ targets: p, alpha: 0, scale: p.scale * 1.2, duration: 300, onComplete: () => p.destroy() });
        }
        this.parts.clear();
        sc.tweens.add({ targets: this, alpha: 0, duration: 250 });
        sc.time.delayedCall(1300, () => resolve());
      });
    });
  }

  /** Flying chunks of tank. */
  private debris(x: number, y: number, gy: number) {
    const sc = this.sc;
    for (let i = 0; i < 4; i++) {
      const s = Phaser.Math.Between(6, 16);
      const c = sc.add.rectangle(x, y, s, s * (0.5 + Math.random()), [0x4b4f58, 0x7c2d12, 0x3f3f46, 0xa855f7][i % 4]).setDepth(955).setStrokeStyle(1, 0x111111);
      const vx = (Math.random() - 0.5) * 520;
      sc.tweens.add({ targets: c, x: x + vx, angle: Phaser.Math.Between(-400, 400), duration: 1100, ease: "Quad.out" });
      sc.tweens.add({ targets: c, y: y - Phaser.Math.Between(60, 200), duration: 380, ease: "Quad.out", onComplete: () => sc.tweens.add({ targets: c, y: gy - 6, duration: 600, ease: "Bounce.out" }) });
      sc.tweens.add({ targets: c, alpha: 0, delay: 5000 + Math.random() * 2000, duration: 800, onComplete: () => c.destroy() });
    }
  }
}
