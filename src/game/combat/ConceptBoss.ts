import Phaser from "phaser";
import { Boss } from "./Bosses";
import type { CombatWorld } from "./types";
import { synth } from "../audio/Synth";
import { G } from "../G";
import { hasVfx, vfx } from "../gfx/Vfx";
import { CONCEPT, CONCEPT_BARKS, CONCEPT_HEAL } from "../../content/finaleKrelford";
import { horrorKey } from "../scenes/finale/finaleArt";

/**
 * THE CONCEPT OF PAEDOPHILIA (the Krelford finale): an enormous eldritch dragon with too many arms. Every lightning
 * strike shows the translucent dark wizard behind it (the old final form of Drongus).
 *
 * It never dies on its own. The finale (scenes/finale/KrelfordFinale.ts) runs it through its modes:
 *   "immortal" - your shots do a bit; lose enough and it FULLY HEALS (`onHeal`). Three times.
 *   "shrug"    - while you fetch the bottle and inject the lads: nothing gets through.
 *   "real"     - the Krew are super saiyan: real damage, and it fights harder. Near the end: `onLow`.
 *   "still"    - frozen for a cutscene.
 *
 * Attacks (readable, telegraphed): ARM SLAM (claws come down where you're standing), TENTACLE SWEEP (a fan of lines
 * swept across the ground), BREATH (bursts of bile at you), SHOCKWAVE (a stomp and rings of bolts), SUMMON (horrors
 * crawl out of the rubble), and the storm's own LIGHTNING (strikes near you; each one shows the wizard).
 */
export type ConceptMode = "immortal" | "shrug" | "real" | "still";

export class ConceptBoss extends Boss {
  quietDefeat = true;
  mode: ConceptMode = "still";
  /** Fires once each time it loses `healAt` of its health in immortal mode. */
  onHeal?: () => void;
  /** Fires once when it's nearly dead in real mode. */
  onLow?: () => void;
  /** Fraction of max HP it can lose (immortal mode) before it heals. */
  healAt = 0.3;
  private healing = false;
  private lowFired = false;
  private art: boolean;
  private wizard: Phaser.GameObjects.Image;
  private nextBark = 0;
  private nextStrike = 0;
  private nextCackle = 0;
  private roaringUntil = 0;
  private home: { x: number; y: number };
  private lastShrug = 0;
  /** Where it may roam. */
  roam = new Phaser.Geom.Rectangle(0, 0, 0, 0);

  constructor(w: CombatWorld, x: number, y: number) {
    const art = w.sc.textures.exists("fb_dragon_top");
    super(w, "concept", x, y, 20000, art ? "fb_dragon_top" : "boss_drongus", 150, 0x4c1d95, art ? 256 : 96, art ? 256 : 144);
    this.art = art;
    this.home = { x, y };
    this.roam.setTo(x - 520, y - 80, 1040, 520);
    // it's HUGE
    this.setScale(art ? 1.85 : 4.6);
    if (art) this.play("fb_dragon_top");
    else this.setTint(0x6d28d9);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const fw = this.frame.width;
    const fh = this.frame.height;
    body.setSize(fw * 0.55, fh * 0.5).setOffset(fw * 0.22, fh * 0.28);
    body.setCollideWorldBounds(true);
    body.pushable = false;
    this.thresholds = [];
    this.def = { ...this.def, name: CONCEPT, damage: 22, speed: 40 };
    // the wizard behind it: only there when the lightning shows it
    const wk = w.sc.textures.exists("fb_wizard") ? "fb_wizard" : "boss_drongus";
    this.wizard = w.sc.add.image(x, y, wk, 0).setOrigin(0.5, 1).setScale(wk === "fb_wizard" ? 4.4 : 4.4).setTint(0x8b5cf6).setAlpha(0).setBlendMode(Phaser.BlendModes.SCREEN);
    this.nextBark = w.now() + 6000;
    this.nextStrike = w.now() + 3000;
    this.nextCackle = w.now() + 9000;
    this.on("destroy", () => this.wizard.destroy());
  }

  get radius() {
    return this.displayWidth * 0.3;
  }

  incoming(amount: number): number {
    const now = this.world.now();
    if (this.mode === "still" || this.healing) return 0;
    if (this.mode === "shrug") {
      if (now - this.lastShrug > 900) {
        this.lastShrug = now;
        this.world.floatText(this.x + (Math.random() - 0.5) * 120, this.y - 60, "NO EFFECT", "#c4b5fd", 14);
      }
      return 0;
    }
    if (this.mode === "immortal") {
      // it only ever loses so much before it puts itself back together
      const floor = this.maxHp * (1 - this.healAt);
      const a = Math.min(amount * 1.2, Math.max(0, this.hp - floor));
      if (this.hp - a <= floor + 0.5 && !this.healing) {
        this.healing = true;
        this.scene.time.delayedCall(10, () => this.onHeal?.());
      }
      return a;
    }
    // real
    const floor = this.maxHp * 0.02;
    const a = Math.min(amount * 1.6, Math.max(0, this.hp - floor));
    if (this.hp - a <= floor + 0.5 && !this.lowFired) {
      this.lowFired = true;
      this.scene.time.delayedCall(10, () => this.onLow?.());
    }
    return a;
  }

  /** It knits itself back together: the bar refills, every wound closes. */
  fullHeal(ms = 1400): Promise<void> {
    this.healing = true;
    const sc = this.scene;
    synth.play("heal");
    this.roar();
    this.world.shake(ms, 0.01);
    this.world.floatText(this.x, this.y - this.displayHeight * 0.45, CONCEPT_HEAL, "#e9d5ff", 22);
    if (hasVfx(sc, "vfx_heal")) vfx(sc, "vfx_heal", this.x, this.y + 40, { scale: 5, depth: this.depth + 2, tint: 0xa855f7 });
    const glow = sc.add.ellipse(this.x, this.y, this.displayWidth * 0.9, this.displayHeight * 0.9, 0x22c55e, 0.25).setBlendMode(Phaser.BlendModes.ADD).setDepth(this.depth + 1);
    sc.tweens.add({ targets: glow, alpha: 0, scale: 1.4, duration: ms, onComplete: () => glow.destroy() });
    return new Promise((res) =>
      sc.tweens.add({
        targets: this,
        hp: this.maxHp,
        duration: ms,
        ease: "Sine.inOut",
        onUpdate: () => this.emitBar(),
        onComplete: () => {
          this.healing = false;
          this.lowFired = false;
          res();
        },
      }),
    );
  }

  private emitBar() {
    G.emit("boss", { name: CONCEPT, hp: this.hp, max: this.maxHp, shielded: this.mode === "shrug" || this.mode === "still", phase: this.mode === "real" ? 1 : 0 });
  }

  tick(dt: number, now: number) {
    if (this.dead) return;
    // (not Boss.tick: that flips frames 0/1, and this one has its own animation)
    if (now < this.flashUntil) this.setTintFill(0xffffff);
    else if (this.mode === "real") this.setTint(0xffd6e0);
    else if (this.art) this.clearTint();
    else this.setTint(0x6d28d9);
    this.wizard.setPosition(this.x + 10, this.y - this.displayHeight * 0.18).setDepth(this.depth - 1);
    this.emitBar();
    if (!this.started || this.mode === "still") {
      this.halt();
      return;
    }
    // the storm: lightning near you, and the wizard behind it
    if (now >= this.nextStrike) {
      this.nextStrike = now + (this.mode === "real" ? 2600 : 4200) + Math.random() * 2500;
      this.lightning();
    }
    if (now >= this.nextBark) {
      this.nextBark = now + 7000 + Math.random() * 6000;
      this.world.floatText(this.x, this.y - this.displayHeight * 0.48, Phaser.Utils.Array.GetRandom(CONCEPT_BARKS) as string, "#d8b4fe", 16);
      this.roar();
    }
    // now and then the wizard behind it shows himself, and YEEs
    if (now >= this.nextCackle) {
      this.nextCackle = now + 11000 + Math.random() * 9000;
      this.revealWizard();
      this.wizardYee();
    }
    this.pattern(dt, now);
  }

  /** A bolt comes down near you (telegraphed); the sky flashes and the wizard shows. */
  lightning(at?: { x: number; y: number }) {
    const w = this.world;
    const sc = this.scene;
    const p = w.player;
    const x = at?.x ?? p.x + (Math.random() - 0.5) * 220;
    const y = at?.y ?? p.y + (Math.random() - 0.5) * 160;
    const tele = 750 * w.telegraphMult;
    w.enemyAoe(x, y, 58, this.mode === "real" ? 20 : 14, tele, 0xc4b5fd);
    sc.time.delayedCall(tele - 60, () => {
      if (!this.active) return;
      if (sc.textures.exists("fb_lightning") && sc.anims.exists("fb_lightning")) {
        const b = sc.add.sprite(x, y + 14, "fb_lightning", 0).setOrigin(0.5, 0.86).setScale(2.4).setDepth(y + 60).setBlendMode(Phaser.BlendModes.ADD).setTint(0xe9d5ff);
        b.play("fb_lightning");
        b.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => b.destroy());
      } else {
        const g = sc.add.graphics().setDepth(y + 60).setBlendMode(Phaser.BlendModes.ADD);
        let px = x;
        let py = y - 500;
        g.lineStyle(4, 0xd8c8ff, 1).beginPath().moveTo(px, py);
        while (py < y) g.lineTo((px += (Math.random() - 0.5) * 40), (py = Math.min(y, py + 30)));
        g.strokePath();
        sc.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
      }
      sc.cameras.main.flash(160, 200, 190, 255, true);
      synth.play(Math.random() < 0.5 ? "thunder_1" : "thunder_2");
      this.revealWizard();
      if (Math.random() < 0.2 && this.world.now() > this.nextCackle - 8000) {
        this.nextCackle = this.world.now() + 9000 + Math.random() * 6000;
        sc.time.delayedCall(250, () => this.active && this.wizardYee());
      }
    });
  }

  /** A demonic roar: the jaws open wide (glowing throat), the ground shakes, then it shuts its mouth again. */
  roar() {
    const sc = this.scene;
    const now = this.world.now();
    if (now < this.roaringUntil) return;
    this.roaringUntil = now + 2200;
    if (!synth.shout("concept_roar", 1, 0.9 + Math.random() * 0.15)) synth.play("roar");
    this.world.shake(1300, 0.006);
    if (!this.art || !sc.textures.exists("fb_dragon_roar")) return;
    this.anims.stop();
    this.setTexture("fb_dragon_roar", 0);
    sc.time.delayedCall(110, () => this.active && !this.dead && this.texture.key === "fb_dragon_roar" && this.setFrame(1));
    // its head rears: a little swell while it bellows
    const sx = this.scaleX;
    const sy = this.scaleY;
    sc.tweens.add({ targets: this, scaleX: sx * 1.04, scaleY: sy * 1.06, duration: 260, yoyo: true, hold: 1100, ease: "Sine.out" });
    sc.time.delayedCall(1500, () => this.active && !this.dead && this.texture.key === "fb_dragon_roar" && this.setFrame(0));
    sc.time.delayedCall(1650, () => {
      if (!this.active || this.dead) return;
      this.play("fb_dragon_top");
    });
  }

  /** The withered old wizard behind it, doing a SanMik YEE in a voice like a dry reed. */
  wizardYee() {
    if (!synth.shout("wizard_yee", 0.95, 0.96 + Math.random() * 0.08)) return;
    const t = this.scene.add
      .text(this.x + 90, this.y - this.displayHeight * 0.42, Phaser.Utils.Array.GetRandom(["Yeeeee…", "YEEEEEEE", "yee… yee… yeeeee", "YEE-HEE-HEE"]) as string, { fontFamily: "Georgia, serif", fontSize: "26px", color: "#c4b5fd", fontStyle: "italic", stroke: "#12002a", strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(this.depth + 5)
      .setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 0.95, y: t.y - 20, duration: 400, yoyo: true, hold: 900, onComplete: () => t.destroy() });
  }

  revealWizard() {
    this.scene.tweens.killTweensOf(this.wizard);
    this.wizard.setAlpha(0.62);
    this.setTintFill(0xe9d5ff);
    this.scene.time.delayedCall(70, () => this.active && this.clearTint());
    this.scene.tweens.add({ targets: this.wizard, alpha: 0, delay: 300, duration: 1100 });
  }

  pattern(_dt: number, now: number) {
    const w = this.world;
    const p = w.player;
    const ts = w.enemyTimeScale;
    const real = this.mode === "real";
    // it lumbers about the middle of town, after you
    const tx = Phaser.Math.Clamp(p.x, this.roam.left, this.roam.right);
    const ty = Phaser.Math.Clamp(p.y - 140, this.roam.top, this.roam.bottom);
    if (Phaser.Math.Distance.Between(this.x, this.y, tx, ty) > 60) this.moveToward(tx, ty, (real ? 62 : 42) * ts);
    else this.halt();
    this.setFlipX(false);
    if (now < this.nextPattern) return;
    const tele = 900 * w.telegraphMult;
    const pick = this.patternIdx++ % 5;
    const fury = real ? 1.5 : 1;
    if (pick === 0) {
      // ARM SLAM: claws come down where you are (and where you're going)
      const n = Math.round(4 * fury);
      const body = p.spr.body as Phaser.Physics.Arcade.Body;
      for (let i = 0; i < n; i++) {
        const lead = i * 0.22;
        const x = p.x + body.velocity.x * lead + (Math.random() - 0.5) * 70;
        const y = p.y + body.velocity.y * lead + (Math.random() - 0.5) * 70;
        this.scene.time.delayedCall(i * 260, () => {
          if (!this.active) return;
          w.enemyAoe(x, y, 82, 22, tele, 0x7c3aed);
          this.scene.time.delayedCall(tele, () => {
            if (!this.active) return;
            synth.play("smash");
            w.shake(140, 0.008);
            this.claw(x, y);
          });
        });
      }
      this.nextPattern = now + 1700 + n * 260;
    } else if (pick === 1) {
      // TENTACLE SWEEP: a fan of lines swept across the ground
      const base = Math.atan2(p.y - this.y, p.x - this.x);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const n = Math.round(8 * fury);
      for (let i = 0; i < n; i++) {
        const a = base - dir * 0.9 + dir * (1.8 * i) / (n - 1);
        w.enemyLine(this.x, this.y + 30, a, 900, 44, 18, tele + i * 110);
      }
      synth.play("swing");
      this.nextPattern = now + tele + n * 110 + 900;
    } else if (pick === 2) {
      // BREATH: bursts of bile at you
      const bursts = real ? 6 : 4;
      for (let i = 0; i < bursts; i++)
        this.scene.time.delayedCall(i * 230, () => {
          if (!this.active || this.mode === "still") return;
          this.fan(real ? 9 : 7, 0.13, 290, 12, i % 2 ? 0x84cc16 : 0xa855f7);
          synth.play("pfft");
        });
      this.nextPattern = now + bursts * 230 + 1300;
    } else if (pick === 3) {
      // SHOCKWAVE: it stomps; rings of bolts roll out
      w.enemyAoe(this.x, this.y + 40, 240, 24, tele, 0xa855f7);
      for (let k = 0; k < (real ? 4 : 3); k++)
        this.scene.time.delayedCall(tele + k * 380, () => {
          if (!this.active || this.mode === "still") return;
          this.ring(real ? 26 : 20, 210, 12, 0xc084fc, k * 0.13);
          w.shake(200, 0.01);
        });
      this.nextPattern = now + tele + 1800;
    } else {
      // SUMMON: horrors crawl out of the rubble
      const alive = w.enemies.filter((e) => !e.dead && !e.isBoss).length;
      const n = Math.max(0, Math.min(real ? 5 : 3, 9 - alive));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const x = this.x + Math.cos(a) * 220;
        const y = this.y + 80 + Math.abs(Math.sin(a)) * 120;
        this.scene.time.delayedCall(i * 180, () => this.active && this.horror(x, y));
      }
      if (n) w.floatText(this.x, this.y - this.displayHeight * 0.4, "SEE ALSO:", "#d8b4fe", 16);
      this.nextPattern = now + 1500;
    }
  }

  /** A claw mark where an arm comes down. */
  private claw(x: number, y: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(5);
    g.lineStyle(5, 0x1a0b2a, 0.85);
    for (let k = -1; k <= 1; k++) g.lineBetween(x - 40 + k * 18, y - 30, x + 30 + k * 18, y + 34);
    sc.tweens.add({ targets: g, alpha: 0, delay: 900, duration: 700, onComplete: () => g.destroy() });
    if (hasVfx(sc, "vfx_dust")) vfx(sc, "vfx_dust", x, y + 8, { scale: 1.6, depth: y + 10 });
  }

  /** One of its horrors: a crawling thing that chases you. */
  private horror(x: number, y: number) {
    const w = this.world;
    const e = w.spawnEnemy("ai_pitbull_spider", x, y, { noDrops: true, minion: true });
    if (!e) return;
    e.setTexture(horrorKey(this.scene), 0).setScale(1.7);
    e.def = { ...e.def, name: "Horror", shout: ["SEE ALSO", "[CITATION NEEDED]", "*skittering*", "*clinical noises*"], color: 0x4c1d95, accent: 0xa855f7 };
    e.maxHp = e.hp = Math.round(60 + (this.mode === "real" ? 30 : 0));
    if (hasVfx(this.scene, "vfx_dust")) vfx(this.scene, "vfx_dust", x, y + 10, { scale: 1.2, depth: y + 11, tint: 0xa855f7 });
  }
}
