import Phaser from "phaser";
import { G } from "../G";
import { synth } from "../audio/Synth";
import { animateWalker } from "../gfx/HD";
import type { Player } from "./Player";
import type { CombatWorld } from "./types";

type Bro = "SANMIK" | "SANCHZ";

const BARKS: Record<Bro, string[]> = {
  SANMIK: [
    "YEEE",
    "YEEEEE",
    "Yee yee",
    "Big up all da manz!",
    "Everyone knows I'm solid!",
    "No cunt touches me!",
    "I'm the fucking best!",
    "Catford Fox Crew!",
    "Go and suck your nans!",
    "Michael Jackson is second best!",
    "Brap brap! Yee!",
    "I'll fucking sherk you!",
    "Let's go mental!",
  ],
  SANCHZ: [
    "YEGHHH",
    "YEGHHHHH",
    "Mork.",
    "Big up the Job Centre Plus",
    "That's great for the core",
    "Liquid gains",
    "MC Polsonator in the building",
    "Hrrrm. Mork mork.",
    "I've been bulking",
    "Splash me back",
    "Fudge is mass, mate",
  ],
};

/**
 * SanMik and SanChz fighting alongside you in the SanMikverse. They follow, attack whatever's nearest,
 * shout YEE / YEGH, and each has a big move: SanMik's "Sloppy Surprise" (his version of krezzing)
 * and SanChz's "Bulk Slam". Can't be hurt.
 */
export class SanBrother {
  spr: Phaser.GameObjects.Sprite;
  private label: Phaser.GameObjects.Text;
  private nextShot = 0;
  private nextBark = 0;
  private nextBig = 0;
  private vy = 0;

  constructor(private world: CombatWorld, private player: Player, public id: Bro) {
    const sc = world.sc;
    const key = sc.textures.exists(`spr_${id}`) ? `spr_${id}` : id === "SANMIK" ? "spr_MIKEY" : "spr_POLSON";
    this.spr = sc.add.sprite(player.x - this.offset(), player.y, key, 0).setScale(2).setDepth(499);
    this.label = sc.add.text(this.spr.x, this.spr.y - 40, id === "SANMIK" ? "SANMIK" : "SANCHZ", { fontFamily: "sans-serif", fontSize: "10px", color: id === "SANMIK" ? "#b0c4ff" : "#ffe08a", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(900);
    const now = world.now();
    this.nextBark = now + (id === "SANMIK" ? 1500 : 3500);
    this.nextBig = now + (id === "SANMIK" ? 16000 : 13000);
    sc.events.on("krezz-burst", this.onBurst, this);
  }

  private offset() {
    return this.id === "SANMIK" ? 60 : 115;
  }

  /** You krezz, SanMik does his version. */
  private onBurst() {
    if (this.id === "SANMIK") this.sloppySurprise();
  }

  bark(text?: string) {
    const lines = BARKS[this.id];
    const t = text ?? lines[Math.floor(Math.random() * lines.length)];
    this.world.floatText(this.spr.x, this.spr.y - 56, t, this.id === "SANMIK" ? "#b0c4ff" : "#ffe08a", 13);
    if (/^(YEE|Yee|YEGH)/.test(t) || Math.random() < 0.3) synth.shout(this.id === "SANMIK" ? "yee" : "yegh", 0.8);
  }

  update(now: number, dt: number) {
    const p = this.player;
    if (!this.spr.active) return;
    const side = !!this.world.side;
    // stay behind you, on your side
    const facing = Math.cos(p.aim) < 0 ? -1 : 1;
    const tx = p.x - facing * this.offset();
    const dx = tx - this.spr.x;
    const moving = Math.abs(dx) > 10;
    if (moving) this.spr.x += Math.sign(dx) * Math.min(Math.abs(dx), (Math.abs(dx) > 260 ? 9 : 4) * (dt / 16));
    if (side) {
      // hop along with you: a bit of fake gravity towards your height
      const ty = p.y;
      if (this.spr.y < ty - 4) this.vy += dt * 0.0035;
      else if (this.spr.y > ty + 40 && this.vy >= 0) this.vy = -0.9;
      else if (this.spr.y >= ty - 4 && this.vy > 0) {
        this.vy = 0;
        this.spr.y = ty;
      }
      this.spr.y += this.vy * dt;
      if (Math.abs(this.spr.y - ty) > 300) this.spr.y = ty;
    } else {
      const dy = p.y + 20 - this.spr.y;
      this.spr.y += Math.sign(dy) * Math.min(Math.abs(dy), 4 * (dt / 16));
    }
    animateWalker(this.spr, moving ? dx : 0, 0, moving, now);
    this.label.setPosition(this.spr.x, this.spr.y - 40);
    // attacks
    if (now >= this.nextShot) {
      const e = this.world.nearestEnemy(this.spr.x, this.spr.y, 480);
      if (e) {
        const a = Math.atan2(e.y - this.spr.y, e.x - this.spr.x);
        const dmg = (8 + G.s.chapter * 2.5) * (1 + 0.08 * (G.s.upgrades.pk_dmg ?? 0));
        this.spr.setFlipX(Math.cos(a) < 0);
        if (this.id === "SANMIK") {
          // spits bars: a quick volley
          for (let i = 0; i < 2; i++)
            this.world.sc.time.delayedCall(i * 90, () => this.world.shoot(this.spr.x, this.spr.y - 8, { owner: "player", damage: dmg * 0.7, speed: 560, angle: a + (Math.random() - 0.5) * 0.12, color: 0xb0c4ff, life: 1000 }));
          if (Math.random() < 0.25) this.world.floatText(this.spr.x + Math.cos(a) * 30, this.spr.y - 20, "YEE", "#b0c4ff", 11);
          this.nextShot = now + 520 + Math.random() * 160;
        } else {
          // lobs bulking food: fudge, burgers, a whole pizza
          const tx2 = e.x;
          const ty2 = e.y;
          const food = this.world.sc.add.text(this.spr.x, this.spr.y, ["🍔", "🟫", "🍕", "🍩"][Math.floor(Math.random() * 4)], { fontSize: "20px" }).setOrigin(0.5).setDepth(520);
          const sx = this.spr.x;
          const sy = this.spr.y;
          this.world.sc.tweens.add({
            targets: food,
            x: tx2,
            angle: 360,
            duration: 420,
            onUpdate: (tw) => food.setY(sy + (ty2 - sy) * tw.progress - Math.sin(tw.progress * Math.PI) * 80),
            onComplete: () => {
              food.destroy();
              this.world.aoe(tx2, ty2, 52, dmg * 1.4, { color: 0xffe08a, knock: 140, noWonk: true });
            },
          });
          void sx;
          this.nextShot = now + 900 + Math.random() * 250;
        }
      } else this.nextShot = now + 250;
    }
    if (now >= this.nextBig && this.world.nearestEnemy(this.spr.x, this.spr.y, 400)) {
      if (this.id === "SANMIK") this.sloppySurprise();
      else this.bulkSlam();
    }
    if (now >= this.nextBark) {
      this.bark();
      this.nextBark = now + 4500 + Math.random() * 5500;
    }
  }

  /** SanMik's krezzing. Loud, wet, and nobody asked for it. */
  sloppySurprise() {
    const now = this.world.now();
    this.nextBig = now + 18000;
    const e = this.world.nearestEnemy(this.spr.x, this.spr.y, 600);
    const x = e?.x ?? this.spr.x + 120;
    const y = e?.y ?? this.spr.y;
    const sc = this.world.sc;
    this.world.floatText(this.spr.x, this.spr.y - 70, "SLOPPY SURPRISE!!", "#a3e635", 20);
    synth.shout("yee", 1);
    sc.time.delayedCall(250, () => synth.shout("yee", 1));
    sc.time.delayedCall(500, () => synth.shout("yee", 1));
    for (let i = 0; i < 3; i++) {
      sc.time.delayedCall(i * 220, () => {
        const blob = sc.add.circle(x + (i - 1) * 50, y, 20, i % 2 ? 0xd9f99d : 0xa3e635, 0.75).setDepth(460);
        sc.tweens.add({ targets: blob, radius: 110, alpha: 0, duration: 700, onComplete: () => blob.destroy() });
        this.world.aoe(x + (i - 1) * 50, y, 110, (30 + G.s.chapter * 6) * (1 + 0.08 * (G.s.upgrades.pk_dmg ?? 0)), { knock: 260, slow: 0.4, noWonk: true, label: i === 1 ? "SLOPPY" : "" });
      });
    }
    this.world.shake(260, 0.01);
  }

  /** SanChz falls on things. On purpose. */
  bulkSlam() {
    const now = this.world.now();
    this.nextBig = now + 14000;
    const sc = this.world.sc;
    this.world.floatText(this.spr.x, this.spr.y - 70, "YEGHHH!! BULK SLAM", "#ffe08a", 18);
    synth.shout("yegh", 1);
    sc.tweens.add({
      targets: this.spr,
      y: this.spr.y - 90,
      duration: 260,
      yoyo: true,
      ease: "Quad.out",
      onComplete: () => {
        this.world.shake(300, 0.016);
        const ring = sc.add.ellipse(this.spr.x, this.spr.y + 20, 40, 14, 0xffe08a, 0.6).setDepth(460);
        sc.tweens.add({ targets: ring, scaleX: 9, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        this.world.aoe(this.spr.x, this.spr.y, 170, (26 + G.s.chapter * 5) * (1 + 0.08 * (G.s.upgrades.pk_dmg ?? 0)), { knock: 320, stun: 900, noWonk: true, label: "BULK" });
      },
    });
  }

  destroy() {
    this.world.sc.events.off("krezz-burst", this.onBurst, this);
    this.spr.destroy();
    this.label.destroy();
  }
}
