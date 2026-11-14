import Phaser from "phaser";
import { Boss } from "./Bosses";
import type { CombatWorld } from "./types";
import { synth } from "../audio/Synth";
import { hasVfx, vfx } from "../gfx/Vfx";
import { BOSS_TEXT } from "../../content/bosses";
import { DRONGUS2_BREAK } from "../../content/citadel";

const PLASMA = 0x39ff5a;
const GOLD = 0xffd23f;

const SUMMONS: { ask: string; ai: string; reply: string; col: string; spawn: [string, number][] }[] = [
  { ask: "GROK! GENERATE ME SOME DOGS!", ai: "GROK", reply: "unleashing the dogs king 🐕", col: "#f2f2f2", spawn: [["ai_pitbull", 2]] },
  { ask: "CHATGPT! MORE NEWS!", ai: "CHATGPT", reply: "Certainly! Here's some more news: 📰", col: "#7fffd4", spawn: [["idf", 1], ["hamas", 1]] },
  { ask: "CLAUDE! DRONES! NOW!", ai: "CLAUDE", reply: "Fine. But I'm making them polite.", col: "#f4b48c", spawn: [["news_drone", 2]] },
  { ask: "GROK! BOMBERS!", ai: "GROK", reply: "say less 💥", col: "#f2f2f2", spawn: [["kamikaze", 2]] },
];

/**
 * DERANGED DRONGUS (phase two): side-on, in his office at the top of the tower. Bigger, an even bigger head,
 * red, shaking, and ARMOURED: hits on the armour flash gold and CLANK and barely hurt him. It OPENS (red glow,
 * full damage) when he's STUCK after a ground pound and while he VENTS after a mega shot. Each third of his HP,
 * a chunk of armour falls off and the rest gets weaker.
 *
 * The cycle (learnable): PLASMA VOLLEY → LEAP (to a ledge) → GROUND POUND (shockwaves: jump; then he's STUCK)
 *   → AI SUMMON → SWEEP (a beam across the room at one height: jump over or drop under) → MEGA SHOT (charge,
 *   lock, fire; then he VENTS) → and round again.
 * Beaten: the armour disintegrates, he's skinny and shirtless underneath, grabs the two bottles of gold and dives
 * into the cauldron, which fires him up through the roof (deathSequence, run by the scene).
 */
export class DerangedDrongusBoss extends Boss {
  sideGravity = true;
  quietDefeat = true;
  private openUntil = 0;
  private lastClank = 0;
  private armourLeft = 3;
  private aim = 0;
  private gun: Phaser.GameObjects.Image | null = null;
  private summonIdx = 0;
  private pounding = false;
  private sweepG: Phaser.GameObjects.Graphics | null = null;
  private glow: Phaser.GameObjects.Ellipse;
  /** Set by the scene: where the cauldron and the bottles are. */
  cauldron = { x: 0, y: 0 };
  bottles: Phaser.GameObjects.Image[] = [];
  private art: boolean;
  private shakeT = 0;

  constructor(w: CombatWorld, x: number, y: number) {
    const art = w.sc.textures.exists("boss_drongus2");
    super(w, "drongus2", x, y, 2700, art ? "boss_drongus2" : "boss_drongus", 40, 0xdc2626, art ? 128 : 32, art ? 128 : 48);
    this.art = art;
    this.setScale(art ? 2.1 : 4.2);
    if (!art) this.setTint(0xff6b6b);
    this.thresholds = [0.66, 0.33];
    this.def = { ...this.def, shout: BOSS_TEXT.drongus2.taunts, shoutEvery: 3800, damage: 20 };
    // the PixelLab art has the gun in his hands already
    if (!art && w.sc.textures.exists("c7_drongus_gun")) this.gun = w.sc.add.image(x, y, "c7_drongus_gun").setScale(1.1);
    this.glow = w.sc.add.ellipse(x, y, 90, 150, 0xff3b30, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.on("destroy", () => {
      this.gun?.destroy();
      this.glow.destroy();
      this.sweepG?.destroy();
    });
  }

  get radius() {
    return this.displayWidth * 0.26;
  }

  private get open() {
    return this.world.now() < this.openUntil;
  }

  /** The armour: shots mostly bounce off (gold flash, CLANK) unless it's open. */
  incoming(amount: number, opts?: { source?: string }) {
    const a = super.incoming(amount, opts);
    if (this.open) return a * 1.35;
    const now = this.world.now();
    if (now - this.lastClank > 160) {
      this.lastClank = now;
      synth.play("smash");
      this.setTintFill(0xffe680);
      this.scene.time.delayedCall(60, () => this.active && !this.dead && (this.art ? this.clearTint() : this.setTint(0xff6b6b)));
      if (Math.random() < 0.3) this.world.floatText(this.x + (Math.random() - 0.5) * 40, this.y - 40, "CLANK", "#ffd23f", 13);
    }
    return a * [0.6, 0.45, 0.35, 0.25][this.armourLeft];
  }

  private muzzle(): [number, number] {
    if (this.art) return [this.x + (this.flipX ? -1 : 1) * 50 * this.scaleX, this.y + 11 * this.scaleX];
    const len = this.gun ? this.gun.displayWidth * 0.5 : 60;
    return [this.x + Math.cos(this.aim) * len, this.y - 6 + Math.sin(this.aim) * len];
  }

  tick(dt: number, now: number) {
    if (this.dead) return;
    super.tick(dt, now);
    if (!this.art) this.setTint(this.open ? 0xffa0a0 : 0xff6b6b);
    const p = this.world.player;
    this.aim = Phaser.Math.Angle.RotateTo(this.aim, Math.atan2(p.y - this.y, p.x - this.x), 0.1);
    // furious: he never stops shaking
    this.shakeT += dt;
    if (this.art) {
      const n = this.texture.frameTotal - 1;
      if (n > 2) this.legacyFrame(Math.floor(now / 120) % n);
    }
    const jx = Math.sin(this.shakeT / 23) * 1.5;
    const g = this.gun;
    if (g) {
      const left = Math.cos(this.aim) < 0;
      g.setPosition(this.x + jx + Math.cos(this.aim) * 20, this.y - 6 + Math.sin(this.aim) * 10).setRotation(this.aim).setFlipY(left).setDepth(this.depth + 1).setAlpha(this.alpha);
    }
    this.glow.setPosition(this.x, this.y).setDepth(this.depth + 0.5).setFillStyle(0xff3b30, this.open ? 0.28 + Math.sin(now / 60) * 0.1 : 0);
  }

  onPhase(n: number, now: number) {
    this.armourLeft = Math.max(0, 3 - n);
    this.shedPlate(n);
    synth.play("roar");
    this.world.shake(400, 0.02);
    this.world.toast(n === 1 ? "HIS ARMOUR'S CRACKING" : "THE ARMOUR'S FALLING APART", n === 1 ? "A plate came off. Your shots get through better now." : "Nearly there. He's faster and angrier.");
    this.nextPattern = Math.max(this.nextPattern, now + 900);
  }

  /** A plate of armour comes off and clatters to the floor. */
  private shedPlate(i: number) {
    const sc = this.scene;
    const key = `c7_armour_${i % 5}`;
    const gy = this.world.groundY ?? this.y + 100;
    const piece = sc.textures.exists(key) ? sc.add.image(this.x, this.y - 20, key).setScale(1.6) : sc.add.rectangle(this.x, this.y - 20, 34, 22, 0x27272a).setStrokeStyle(2, GOLD);
    piece.setDepth(this.depth + 2);
    this.world.burst(this.x, this.y - 20, GOLD, 18);
    const dx = (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.Between(80, 180);
    sc.tweens.add({ targets: piece, x: piece.x + dx, angle: dx * 2, duration: 800, ease: "Quad.out" });
    sc.tweens.add({ targets: piece, y: piece.y - 80, duration: 260, ease: "Quad.out", onComplete: () => sc.tweens.add({ targets: piece, y: gy - 12, duration: 480, ease: "Bounce.out", onComplete: () => synth.play("smash") }) });
    sc.tweens.add({ targets: piece, alpha: 0, delay: 9000, duration: 800, onComplete: () => piece.destroy() });
  }

  private grounded() {
    const b = this.body as Phaser.Physics.Arcade.Body;
    return b.blocked.down || b.touching.down;
  }

  pattern(_dt: number, now: number) {
    const w = this.world;
    const p = w.player;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const gy = w.groundY ?? this.y + 100;
    const fast = this.phase >= 1;
    if (this.pounding) return;
    const dir = p.x < this.x ? -1 : 1;
    this.setFlipX(dir < 0);
    if (this.open) body.setVelocityX(0);
    else if (this.grounded()) body.setVelocityX(Math.abs(p.x - this.x) > 200 ? dir * (fast ? 110 : 80) * w.enemyTimeScale : 0);
    if (now < this.nextPattern) return;
    const tele = 800 * w.telegraphMult;
    const step = this.patternIdx++ % 6;
    if (step === 0) {
      // PLASMA VOLLEY: aim lines first, then bolts down them
      const n = fast ? 4 : 3;
      for (let i = 0; i < n; i++)
        this.scene.time.delayedCall(i * 380, () => {
          if (this.dead || !this.active) return;
          const [mx, my] = this.muzzle();
          const a = Math.atan2(p.y - my, p.x - mx);
          w.enemyLine(mx, my, a, 1000, 26, 0, tele * 0.55);
          this.scene.time.delayedCall(tele * 0.55, () => {
            if (this.dead || !this.active) return;
            synth.play("gun_bfk");
            w.shoot(mx, my, { owner: "enemy", damage: 15, speed: 420, angle: a, color: PLASMA, scale: 2.4, life: 3000 });
          });
        });
      this.say("PLASMA!", "#7dff8a");
      this.nextPattern = now + tele * 0.55 + n * 380 + 700;
    } else if (step === 1) {
      // LEAP: up onto a ledge (or just a big hop towards you)
      if (this.grounded()) {
        body.setVelocityY(-880);
        body.setVelocityX(dir * 200);
      }
      this.say("HUP!", "#fca5a5");
      this.nextPattern = now + 1200;
    } else if (step === 2) {
      // GROUND POUND: up, over you, a shadow where he'll land, SLAM. Then he's stuck: hit him.
      this.pounding = true;
      body.setVelocityY(-1000);
      body.setVelocityX(0);
      const tx = Phaser.Math.Clamp(p.x, w.bounds.left + 80, w.bounds.right - 80);
      this.say("GROUND POUND!", "#fde047");
      this.scene.time.delayedCall(420, () => {
        if (this.dead || !this.active) return;
        body.setAllowGravity(false).setVelocity(0, 0);
        this.x = tx;
        w.enemyAoe(tx, gy - 30, 110, 26, tele, 0xff3b30);
        this.scene.time.delayedCall(tele, () => {
          if (this.dead || !this.active) return;
          body.setAllowGravity(true).setVelocityY(2200);
          this.scene.time.delayedCall(140, () => {
            if (this.dead || !this.active) return;
            synth.play("boom");
            w.shake(450, 0.03);
            if (hasVfx(this.scene, "vfx_dust")) vfx(this.scene, "vfx_dust", this.x, gy - 4, { scale: 2, depth: this.depth + 1 });
            w.enemyLine(this.x, gy - 14, 0, 1000, 34, 18, 120);
            w.enemyLine(this.x, gy - 14, Math.PI, 1000, 34, 18, 120);
            // stuck in the floor: the armour's open
            this.openUntil = this.world.now() + (fast ? 1900 : 2400);
            this.say("STUCK! (HIT HIM!)", "#ff6b6b");
            this.pounding = false;
          });
        });
      });
      this.nextPattern = now + 420 + tele + 140 + (fast ? 1900 : 2400) + 300;
    } else if (step === 3) {
      // the AIs
      const sm = SUMMONS[this.summonIdx++ % SUMMONS.length];
      this.say(sm.ask, "#ffd23f");
      synth.play("tannoy");
      const live = w.enemies.filter((e) => !e.dead && !e.isBoss).length;
      this.scene.time.delayedCall(700, () => {
        if (this.dead || !this.active) return;
        w.floatText(this.x, this.y - this.displayHeight / 2 - 4, `${sm.ai}: ${sm.reply}`, sm.col, 13);
        if (live >= 6) return;
        for (const [type, n] of sm.spawn)
          for (let i = 0; i < n + (this.phase >= 2 ? 1 : 0); i++) {
            const x = Phaser.Math.Clamp(this.x + (i % 2 ? 1 : -1) * Phaser.Math.Between(140, 320), w.bounds.left + 60, w.bounds.right - 60);
            if (hasVfx(this.scene, "vfx_smoke")) vfx(this.scene, "vfx_smoke", x, gy - 50, { scale: 0.9, depth: 3, tint: 0xd8b4fe });
            w.spawnEnemy(type, x, type === "news_drone" ? gy - 260 : gy - 60, { minion: true });
          }
      });
      this.nextPattern = now + 1800;
    } else if (step === 4) {
      // SWEEP: a beam right across the room at one height. Jump it (low) or drop under it (high).
      const high = p.y < gy - 120;
      const y = high ? p.y : gy - 50;
      const [mx] = this.muzzle();
      const left = w.bounds.left;
      const width = w.bounds.width;
      const warn = this.scene.add.rectangle(left, y, width, 40, 0xff3333, 0.16).setOrigin(0, 0.5).setStrokeStyle(2, 0xff3333, 0.8).setDepth(4);
      this.say(high ? "SWEEP! (DROP DOWN!)" : "SWEEP! (JUMP!)", "#fca5a5");
      synth.play("telegraph");
      this.scene.time.delayedCall(tele + 150, () => {
        warn.destroy();
        if (this.dead || !this.active) return;
        synth.play("gun_rail");
        const g = this.scene.add.graphics().setDepth(950).setBlendMode(Phaser.BlendModes.ADD);
        g.fillStyle(PLASMA, 0.55).fillRect(left, y - 18, width, 36);
        g.fillStyle(0xeaffea, 1).fillRect(left, y - 6, width, 12);
        this.sweepG = g;
        if (Math.abs(p.y - y) < 34) w.damagePlayer(Math.round(20 * this.dmgMult), { x: mx, y }, { label: "-SWEEP" });
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 420, onComplete: () => g.destroy() });
      });
      this.nextPattern = now + tele + 1200;
    } else {
      // MEGA SHOT: long charge, the aim locks just before it fires, then the gun vents (open window)
      const charge = 1600 * w.telegraphMult;
      body.setVelocityX(0);
      const orb = this.scene.add.circle(0, 0, 18, PLASMA, 0.85).setDepth(951).setBlendMode(Phaser.BlendModes.ADD).setScale(0.1);
      const follow = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => orb.active && orb.setPosition(...this.muzzle()) });
      this.scene.tweens.add({ targets: orb, scale: 2.6, duration: charge, ease: "Quad.in" });
      this.say("MEGA SHOT…", "#7dff8a");
      synth.play("alarm");
      let lock = 0;
      this.scene.time.delayedCall(charge - 450, () => {
        if (this.dead || !this.active) return;
        const [mx, my] = this.muzzle();
        lock = Math.atan2(p.y - my, p.x - mx);
        w.enemyLine(mx, my, lock, 1400, 90, 34, 450);
        this.say("LOCKED! MOVE!", "#ff4d4d");
      });
      this.scene.time.delayedCall(charge, () => {
        follow.remove();
        orb.destroy();
        if (this.dead || !this.active) return;
        const [mx, my] = this.muzzle();
        synth.play("gun_bfk");
        synth.play("boom");
        w.shake(500, 0.025);
        const beam = this.scene.add.graphics().setDepth(950).setBlendMode(Phaser.BlendModes.ADD);
        beam.lineStyle(84, PLASMA, 0.6).lineBetween(mx, my, mx + Math.cos(lock) * 1400, my + Math.sin(lock) * 1400);
        beam.lineStyle(30, 0xeaffea, 1).lineBetween(mx, my, mx + Math.cos(lock) * 1400, my + Math.sin(lock) * 1400);
        this.scene.tweens.add({ targets: beam, alpha: 0, duration: 450, onComplete: () => beam.destroy() });
        this.openUntil = this.world.now() + (fast ? 1600 : 2100);
        this.say("VENTING! (HIT HIM!)", "#ff6b6b");
        for (let i = 0; i < 5; i++) this.scene.time.delayedCall(i * 300, () => !this.dead && hasVfx(this.scene, "vfx_smoke") && vfx(this.scene, "vfx_smoke", this.muzzle()[0], this.muzzle()[1], { scale: 0.6, depth: 952, tint: 0x9cffb0 }));
        if (this.phase >= 2) this.ring(14, 190, 11, PLASMA, Math.random());
      });
      this.nextPattern = now + charge + (fast ? 1600 : 2100) + 500;
    }
  }

  private say(t: string, col: string) {
    this.world.floatText(this.x, this.y - this.displayHeight / 2 - 24, t, col, 16);
  }

  /** Beaten: no spin-and-vanish (the scene runs deathSequence). */
  kill() {
    this.dead = true;
    this.hpBar?.destroy();
    this.disableBody(true, false);
    this.sweepG?.destroy();
    this.glow.setFillStyle(0xff3b30, 0);
  }

  /** NOOOO: the armour falls apart, skinny shirtless Drongus grabs the bottles, dives in the cauldron, up through the roof. */
  deathSequence(): Promise<void> {
    const sc = this.scene;
    const w = this.world;
    const gy = w.groundY ?? this.y + 100;
    const shout = (i: number, size = 22) => w.floatText(this.x, this.y - this.displayHeight / 2 - 30, DRONGUS2_BREAK[i], "#ff4d4d", size);
    const wait = (ms: number) => new Promise<void>((r) => sc.time.delayedCall(ms, () => r()));
    return (async () => {
      this.setFlipX(this.cauldron.x < this.x);
      this.gun?.setVisible(false);
      // NOOOO
      shout(0, 34);
      synth.play("roar");
      w.shake(1200, 0.02);
      for (let i = 0; i < 6; i++) sc.time.delayedCall(i * 170, () => this.shedPlate(i));
      for (let i = 0; i < 10; i++) sc.time.delayedCall(i * 110, () => w.burst(this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 90, i % 2 ? 0x9ca3af : GOLD, 10));
      if (hasVfx(sc, "vfx_dust")) vfx(sc, "vfx_dust", this.x, gy - 4, { scale: 2.2, depth: this.depth + 1 });
      await wait(1100);
      shout(1);
      await wait(700);
      // underneath: skinny, shirtless, small
      const skinny = sc.textures.exists("c7_drongus_skinny");
      if (skinny) this.setTexture("c7_drongus_skinny").setScale(1.6).clearTint();
      else this.setScale(this.scaleX * 0.7).setTint(0xf1c7a5);
      (this.body as Phaser.Physics.Arcade.Body | null)?.stop();
      this.setY(gy - this.displayHeight / 2 + 4);
      sc.cameras.main.flash(200, 255, 255, 255);
      await wait(400);
      shout(2, 16);
      await wait(1200);
      // grab the bottles, one under each arm
      shout(3);
      synth.play("pickup");
      for (const [i, b] of this.bottles.entries()) {
        sc.tweens.killTweensOf(b);
        sc.tweens.add({ targets: b, x: this.x + (i ? 26 : -26), y: this.y - 6, scale: b.scale * 0.55, duration: 500, ease: "Back.in" });
      }
      await wait(600);
      // run to the cauldron (bottles come too)
      const cx = this.cauldron.x;
      const dur = Math.max(500, Math.abs(cx - this.x) * 2.4);
      this.setFlipX(cx < this.x);
      sc.tweens.add({ targets: this, x: cx, duration: dur, ease: "Sine.in" });
      for (const [i, b] of this.bottles.entries()) sc.tweens.add({ targets: b, x: cx + (i ? 26 : -26), duration: dur, ease: "Sine.in" });
      await wait(dur);
      // up and in
      shout(4, 26);
      sc.tweens.add({ targets: [this, ...this.bottles], y: "-=120", duration: 300, ease: "Quad.out" });
      await wait(300);
      sc.tweens.add({ targets: [this, ...this.bottles], y: this.cauldron.y - 10, duration: 260, ease: "Quad.in" });
      await wait(260);
      synth.play("splash");
      w.burst(cx, this.cauldron.y - 30, GOLD, 30);
      this.setVisible(false);
      for (const b of this.bottles) b.setVisible(false);
      await wait(600);
      // the cauldron rumbles... and FIRES him up through the roof
      sc.tweens.add({ targets: sc.cameras.main, scrollX: "+=0", duration: 10 });
      w.shake(900, 0.012);
      synth.play("alarm");
      await wait(900);
      synth.play("jet");
      synth.play("boom");
      w.shake(700, 0.035);
      sc.cameras.main.flash(400, 255, 230, 140);
      const rocket = sc.add.container(cx, this.cauldron.y - 40).setDepth(960);
      if (skinny) rocket.add(sc.add.image(0, 0, "c7_drongus_skinny").setScale(1.4).setAngle(180));
      else rocket.add(sc.add.rectangle(0, 0, 30, 60, 0xf1c7a5));
      const trail = sc.time.addEvent({
        delay: 20,
        loop: true,
        callback: () => {
          const t = sc.add.circle(rocket.x + (Math.random() - 0.5) * 16, rocket.y + 20, 8 + Math.random() * 10, Math.random() < 0.5 ? GOLD : 0xfff3b0, 0.9).setDepth(959).setBlendMode(Phaser.BlendModes.ADD);
          sc.tweens.add({ targets: t, scale: 0.1, alpha: 0, y: t.y + 40, duration: 600, onComplete: () => t.destroy() });
        },
      });
      sc.tweens.add({ targets: rocket, y: -200, duration: 650, ease: "Quad.in" });
      await wait(450);
      // a hole in the ceiling, and the roof coming down
      const hole = sc.add.graphics().setDepth(5);
      hole.fillStyle(0x05010a, 1);
      hole.fillPoints([new Phaser.Math.Vector2(cx - 70, 0), new Phaser.Math.Vector2(cx + 80, 0), new Phaser.Math.Vector2(cx + 55, 36), new Phaser.Math.Vector2(cx + 20, 52), new Phaser.Math.Vector2(cx - 30, 44), new Phaser.Math.Vector2(cx - 62, 30)], true);
      const sky = sc.add.rectangle(cx, 18, 90, 26, 0x6366f1, 0.35).setDepth(5.1).setBlendMode(Phaser.BlendModes.ADD);
      sc.tweens.add({ targets: sky, alpha: 0.1, yoyo: true, repeat: -1, duration: 700 });
      synth.play("smash");
      for (let i = 0; i < 16; i++) {
        const key = sc.textures.exists("c7_rubble") ? "c7_rubble" : null;
        const d = key ? sc.add.image(cx + (Math.random() - 0.5) * 120, 20, key).setScale(0.3 + Math.random() * 0.4) : sc.add.rectangle(cx + (Math.random() - 0.5) * 120, 20, 10, 8, 0x3f3a4a);
        d.setDepth(958);
        sc.tweens.add({ targets: d, y: gy - 6, angle: Phaser.Math.Between(-300, 300), duration: 600 + Math.random() * 500, delay: i * 40, ease: "Quad.in", onComplete: () => synth.play("hit") });
        sc.tweens.add({ targets: d, alpha: 0, delay: 8000, duration: 800, onComplete: () => d.destroy() });
      }
      await wait(700);
      trail.remove();
      rocket.destroy();
      this.destroy();
      // and then: quiet
      synth.stopMusic();
      await wait(1400);
    })();
  }
}
