import Phaser from "phaser";
import { charMeta, facingFrom, feetBody, steer } from "../gfx/HD";
import { CHARACTERS, type CharacterDef } from "../../data/characters";
import type { PlayableId } from "../../data/types";
import { G } from "../G";
import { damageMult, maxHp, maxKrezz, maxBottles, bump } from "../systems/stats";
import { activeMods } from "../../data/historicalRevisions";
import { synth } from "../audio/Synth";
import type { CombatWorld } from "./types";
import type { Controls } from "./Controls";
import type { Enemy } from "./Enemy";
import { PLAYER_BARKS } from "../../content/dialogue/ambient";
import { currentGun, cycleGun, fitTo } from "./Guns";

export interface Turret {
  spr: Phaser.GameObjects.Sprite;
  until: number;
  next: number;
}

export class Player {
  id: PlayableId;
  def: CharacterDef;
  spr: Phaser.Physics.Arcade.Sprite;
  world: CombatWorld;
  wonk = 0;
  facing = 0;
  aim = 0;
  // timers
  attackCd = 0;
  specialCd = 0;
  dodgeCd = 0;
  dodgeQueuedUntil = 0;
  dodgeUntil = 0;
  dodgeAngle = 0;
  iframesUntil = 0;
  attackAnimUntil = 0;
  loanUntil = 0;
  interestUntil = 0;
  burstUntil = 0;
  lurkUntil = 0;
  nextHitCrit = false;
  bongoUntil = 0;
  machineBuffUntil = 0;
  shieldUntil = 0;
  readmissionUsed = false;
  combo = 0;
  shots = 0;
  omenCount = 0;
  turrets: Turret[] = [];
  decoy: Phaser.GameObjects.Sprite | null = null;
  decoyUntil = 0;
  recentDamage: { t: number; amt: number }[] = [];
  // decree effects
  noDodgeUntil = 0;
  noHealUntil = 0;
  noSpecialUntil = 0;
  invertUntil = 0;
  // perfect dodge window bookkeeping
  perfectArmed = false;
  dashTrailUntil = 0;
  movingTime = 0;
  stillTime = 0;
  attackHeldTime = 0;
  dead = false;
  grappledUntil = 0;
  grappleEscape = 0;
  /** Arena gimmick: in the troll fight, the special becomes a headbutt. */
  headbuttMode = false;
  private walkT = 0;
  private lastBark = 0;
  label: Phaser.GameObjects.Text;
  /** The gun drawn in the player's hand (hidden when using fists). */
  gunSpr: Phaser.GameObjects.Image | null = null;
  private gunKick = 0;

  constructor(world: CombatWorld, x: number, y: number) {
    this.world = world;
    this.id = G.s.player;
    this.def = CHARACTERS[this.id];
    const sc = world.sc;
    this.spr = sc.physics.add.sprite(x, y, `spr_${this.id}`, 0).setScale(2).setDepth(500);
    const body = this.spr.body as Phaser.Physics.Arcade.Body;
    if (charMeta(sc, this.spr.texture.key)) feetBody(this.spr, 20, 20, 24);
    else body.setSize(10, 10).setOffset(3, 13);
    body.setCollideWorldBounds(true);
    this.label = sc.add.text(x, y - 34, "", { fontFamily: "monospace", fontSize: "11px", color: "#ffffff", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(600).setVisible(false);
    if (G.s.hp <= 0) G.s.hp = maxHp(G.s);
  }

  get x() {
    return this.spr.x;
  }
  get y() {
    return this.spr.y;
  }

  isHidden() {
    return this.world.now() < this.lurkUntil;
  }

  targetPoint() {
    if (this.decoy && this.world.now() < this.decoyUntil) return this.decoy;
    return this.spr;
  }

  invulnerable(now: number) {
    return now < this.iframesUntil || now < this.burstUntil || now < this.shieldUntil;
  }

  dmg(base: number, now: number) {
    let d = base * damageMult(G.s);
    if (now < this.loanUntil) d *= 1.5;
    if (this.burstUntil > 0 && now < this.burstUntil + 4000) d *= 1.35;
    if (now < this.bongoUntil) d *= 1.15;
    if (now < this.machineBuffUntil) d *= 1.25;
    if (G.s.flags.pq_done_pq_krebon && G.s.hp < maxHp(G.s) / 2) d *= 1.2;
    return d;
  }

  bark(force = false) {
    const now = this.world.now();
    if (!force && now - this.lastBark < 7000) return;
    if (!force && Math.random() > 0.35) return;
    this.lastBark = now;
    const list = PLAYER_BARKS[this.id] ?? [];
    if (!list.length) return;
    this.world.floatText(this.x, this.y - 40, list[Math.floor(Math.random() * list.length)], "#ffd23f", 13);
  }

  update(dt: number, now: number, c: Controls) {
    if (this.dead) return;
    const s = G.s;
    const mods = activeMods(s);
    const body = this.spr.body as Phaser.Physics.Arcade.Body;
    c.invertX = now < this.invertUntil;
    // aim with intoxication drift
    const rawAim = c.aim(this.x, this.y);
    const drift = (s.intoxication / 100) * 0.4 * Math.sin(now / 370) + (s.intoxication > 60 ? (Math.random() - 0.5) * 0.15 : 0);
    this.aim = rawAim + drift;
    // movement
    const mv = c.move();
    const moving = Math.hypot(mv.x, mv.y) > 0.1;
    if (moving) {
      this.movingTime += dt;
      this.stillTime = 0;
    } else {
      this.stillTime += dt;
      this.movingTime = 0;
    }
    let speed = (this.def.speed ?? 200) * (G.s.flags.arc_crongus_done ? 1.15 : 1);
    if (now < this.bongoUntil) speed *= 0.95;
    const wobble = s.intoxication > 40 ? Math.sin(now / 300) * (s.intoxication / 100) * 0.5 : 0;
    if (now < this.grappledUntil) {
      body.setVelocity(0, 0);
      this.spr.setAngle(Math.sin(now / 60) * 10);
      if (c.dodge() || (c.attackHeld() && now > this.attackCd)) {
        this.attackCd = now + 90;
        this.grappleEscape++;
        this.world.floatText(this.x, this.y - 40, `ESCAPE ${this.grappleEscape}/7`, "#ffffff", 12);
        if (this.grappleEscape >= 7) {
          this.grappledUntil = 0;
          this.iframesUntil = now + 800;
          this.spr.setAngle(0);
          this.world.floatText(this.x, this.y - 50, "ESCAPED (shrimped out)", "#7fdbff", 14);
        }
      }
      return;
    }
    this.spr.setAngle(0);
    if (now < this.dodgeUntil) {
      const ds = 520 * (this.id === "FLENKY" && s.upgrades.fl1 ? 1.4 : 1);
      body.setVelocity(Math.cos(this.dodgeAngle) * ds, Math.sin(this.dodgeAngle) * ds);
      if (now > this.dashTrailUntil) {
        this.dashTrailUntil = now + 40;
        const ghost = this.world.sc.add.sprite(this.x, this.y, this.spr.texture.key, this.spr.frame.name).setScale(2).setAlpha(0.45).setTint(this.def.color).setDepth(499).setFlipX(this.spr.flipX);
        this.world.sc.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
      }
    } else {
      const tx = (mv.x + wobble * mv.y) * speed;
      const ty = (mv.y - wobble * mv.x) * speed;
      if (mods.slippery) {
        body.velocity.x += (tx - body.velocity.x) * Math.min(1, dt / 260);
        body.velocity.y += (ty - body.velocity.y) * Math.min(1, dt / 260);
      } else {
        steer(body, tx, ty, dt);
      }
    }
    // a dodge pressed just before the cooldown ends still happens
    if (this.dodgeQueuedUntil && now >= this.dodgeCd && now < this.dodgeQueuedUntil && now >= this.dodgeUntil) {
      this.dodgeQueuedUntil = 0;
      this.tryDodge(now, mv);
    }
    // animation
    const meta = charMeta(this.world.sc, this.spr.texture.key);
    if (meta) {
      // PixelLab sheet: face the aim direction, 4-way walk cycle, directional jab
      const fighting = now < this.attackAnimUntil + 450 || c.attackHeld();
      const f = moving && !fighting ? facingFrom(mv.x, mv.y, (this.spr.getData("facing") as any) ?? "south") : facingFrom(Math.cos(this.aim), Math.sin(this.aim));
      this.spr.setData("facing", f);
      if (now < this.attackAnimUntil) {
        const side = f === "east" || f === "west";
        const cyc = (side ? meta.attack?.east : meta.attack?.south) ?? meta.attack?.east ?? [3];
        const t = 1 - (this.attackAnimUntil - now) / 200;
        this.spr.setFlipX(f === "west").setFrame(cyc[Math.max(0, Math.min(cyc.length - 1, Math.floor(t * cyc.length)))]);
      } else if (moving) {
        const cyc = meta.walk[f] ?? meta.walk.south;
        this.spr.setFlipX(false).setFrame(cyc[Math.floor(now / 90) % cyc.length]);
      } else this.spr.setFlipX(false).setFrame(meta.idle[f] ?? 0);
    } else this.spr.setFlipX(moving && !(now < this.attackAnimUntil + 450 || c.attackHeld()) ? mv.x < -0.1 || (Math.abs(mv.x) <= 0.1 && this.spr.flipX) : Math.cos(this.aim) < 0);
    if (meta) {
      // handled above
    } else if (now < this.attackAnimUntil) this.spr.setFrame(3);
    else if (moving) {
      this.walkT += dt;
      if (this.walkT > 120) {
        this.walkT = 0;
        this.spr.setFrame(String(this.spr.frame.name) === "1" ? 2 : 1);
      }
    } else this.spr.setFrame(0);
    // visibility (lurk)
    this.spr.setAlpha(this.isHidden() ? 0.25 : now < this.iframesUntil && Math.floor(now / 60) % 2 ? 0.6 : 1);
    if (now < this.burstUntil) this.spr.setTint(0xffd23f);
    else if (now < this.loanUntil) this.spr.setTint(0x86efac);
    else if (now < this.shieldUntil) this.spr.setTint(0xc4b5fd);
    else this.spr.clearTint();
    // Krezz trickle
    s.krezz = Math.min(maxKrezz(s), s.krezz + dt * 0.004);
    // Krez Loan interest
    if (this.interestUntil > now && this.loanUntil < now) {
      const rate = (maxHp(s) * (s.upgrades.kz3 ? 0.075 : 0.15)) / 4000;
      s.hp = Math.max(1, s.hp - rate * dt);
    }
    // inputs
    if (c.dodge()) this.tryDodge(now, mv);
    if (c.swap()) {
      const nm = cycleGun();
      synth.play("pickup");
      this.world.floatText(this.x, this.y - 44, nm === "FISTS" ? (this.def.attack === "melee" ? "FISTS" : "OWN WEAPON") : nm.toUpperCase(), "#67e8f9", 13);
    }
    if (c.attackHeld()) {
      this.attackHeldTime += dt;
      this.tryAttack(now, moving);
    } else this.attackHeldTime = 0;
    if (c.special()) this.trySpecial(now, c);
    if (c.bottle()) this.drinkBottle(now);
    if (c.bongo()) this.drinkBongo(now);
    if (c.burst()) this.tryBurst(now);
    // turrets
    this.updateTurrets(now);
    // Gronny gut-stank aura
    if (this.id === "GRONNY") {
      const r = s.upgrades.gr2 ? 105 : 70;
      for (const e of this.world.enemies) {
        if (e.dead) continue;
        if (Phaser.Math.Distance.Between(e.x, e.y, this.x, this.y) < r + e.radius) this.world.damageEnemy(e, (6 * dt) / 1000, { noWonk: true, label: "" });
      }
    }
    // decoy cleanup
    if (this.decoy && now > this.decoyUntil) {
      this.decoy.destroy();
      this.decoy = null;
    }
    this.recentDamage = this.recentDamage.filter((r) => now - r.t < 10000);
    this.label.setPosition(this.x, this.y - 36);
    this.updateGunSprite(dt);
  }

  private updateGunSprite(dt: number) {
    const g = currentGun();
    if (!g || !this.world.sc.textures.exists(g.tex)) {
      this.gunSpr?.setVisible(false);
      return;
    }
    if (!this.gunSpr) this.gunSpr = this.world.sc.add.image(this.x, this.y, g.tex).setDepth(501);
    if (this.gunSpr.texture.key !== g.tex) this.gunSpr.setTexture(g.tex);
    fitTo(this.gunSpr, g.id === "rocket" || g.id === "rail" ? 40 : g.id === "shotgun" ? 36 : 26);
    this.gunKick = Math.max(0, this.gunKick - dt * 0.05);
    const left = Math.cos(this.aim) < 0;
    const r = 14 - this.gunKick;
    this.gunSpr
      .setVisible(this.spr.visible && !this.isHidden())
      .setPosition(this.x + Math.cos(this.aim) * r, this.y + 4 + Math.sin(this.aim) * r)
      .setRotation(this.aim)
      .setFlipY(left)
      .setDepth(Math.sin(this.aim) < -0.3 ? 499 : 501);
  }

  /** Fire the gun in hand. Returns false when there's no gun or no ammo (falls back to the normal attack). */
  private fireGun(now: number): boolean {
    const g = currentGun();
    const s = G.s;
    if (!g || !s.guns) return false;
    if ((s.guns[g.id] ?? 0) <= 0) {
      s.gun = undefined;
      this.world.floatText(this.x, this.y - 44, `OUT OF AMMO — ${this.def.attack === "melee" ? "FISTS" : "OWN WEAPON"}`, "#ff6666", 13);
      synth.play("tap_fail");
      this.attackCd = now + 300;
      return true;
    }
    s.guns[g.id]--;
    this.attackCd = now + g.cd * (now < this.burstUntil ? 0.75 : 1);
    this.attackAnimUntil = now + 90;
    this.gunKick = g.id === "rocket" || g.id === "shotgun" ? 10 : 5;
    const mx = this.x + Math.cos(this.aim) * 26;
    const my = this.y + 4 + Math.sin(this.aim) * 26;
    const flash = this.world.sc.add.circle(mx, my, 5, g.color === 0xffffff ? 0xffd23f : g.color, 0.9).setDepth(602);
    this.world.sc.tweens.add({ targets: flash, alpha: 0, scale: 2.2, duration: 90, onComplete: () => flash.destroy() });
    const blast = (x: number, y: number) => {
      synth.play("explode");
      this.world.shake(140, 0.006);
      this.world.burst(x, y, 0xff6ec7, 14);
      this.world.aoe(x, y, g.blast!, this.dmg(g.dmg, now), { color: 0xff6ec7, knock: g.knock ?? 200 });
    };
    for (let i = 0; i < g.pellets; i++) {
      const spread = g.pellets > 1 ? (i / (g.pellets - 1) - 0.5) * g.spread + (Math.random() - 0.5) * 0.08 : (Math.random() - 0.5) * g.spread;
      const crit = Math.random() < 0.06;
      const d = this.dmg(g.dmg, now) * (crit ? 2 : 1);
      this.world.shoot(mx, my, {
        owner: "player",
        damage: g.blast ? 0 : d,
        crit,
        speed: g.speed * (g.pellets > 1 ? 0.9 + Math.random() * 0.2 : 1),
        angle: this.aim + spread,
        color: g.color,
        texture: g.shotTex && this.world.sc.textures.exists(g.shotTex) ? g.shotTex : undefined,
        life: (g.range / g.speed) * 1000,
        pierce: g.pierce ?? 0,
        knock: g.knock,
        scale: g.id === "rail" ? 1.6 : g.shotTex ? 0.65 : 1,
        onHit: g.blast ? blast : undefined,
        onEnd: g.blast ? blast : undefined,
      });
    }
    if (g.id === "rail") {
      const beam = this.world.sc.add.rectangle(mx, my, g.range, 3, g.color, 0.7).setOrigin(0, 0.5).setRotation(this.aim).setDepth(598);
      this.world.sc.tweens.add({ targets: beam, alpha: 0, scaleY: 4, duration: 180, onComplete: () => beam.destroy() });
    }
    synth.play(g.id === "rocket" ? "lob" : `gun_${g.id}`);
    if (g.id === "shotgun" || g.id === "rocket") this.world.shake(70, 0.003);
    if (s.guns[g.id] === 0) this.world.floatText(this.x, this.y - 44, "LAST ONE", "#ffd23f", 12);
    return true;
  }

  private tryDodge(now: number, mv: { x: number; y: number }) {
    if (now < this.dodgeCd) {
      // buffer it: pressing a moment early still counts
      if (this.dodgeCd - now < 180) this.dodgeQueuedUntil = this.dodgeCd + 120;
      return;
    }
    if (now < this.noDodgeUntil) {
      this.world.floatText(this.x, this.y - 30, "DODGING IS ILLEGAL", "#ff6666", 12);
      return;
    }
    const mods = activeMods(G.s);
    this.dodgeAngle = Math.hypot(mv.x, mv.y) > 0.1 ? Math.atan2(mv.y, mv.x) : this.aim;
    const dur = this.id === "FLENKY" && G.s.upgrades.fl1 ? 230 : 170;
    this.dodgeUntil = now + dur;
    this.iframesUntil = now + dur + 90;
    this.dodgeCd = now + 650 * mods.dodgeCooldownMult;
    this.perfectArmed = true;
    synth.play("dodge");
    this.world.sc.events.emit("player-dodge");
    if (this.id === "CRONGUS" && G.s.upgrades.cr3) {
      // caltrops
      const zone = this.world.sc.add.circle(this.x, this.y, 22, 0x17c6c0, 0.35).setDepth(5);
      let ticks = 0;
      const ev = this.world.sc.time.addEvent({
        delay: 250,
        loop: true,
        callback: () => {
          this.world.aoe(zone.x, zone.y, 26, 5, { noWonk: true, slow: 0.4, label: "" });
          if (++ticks > 16) {
            ev.remove();
            zone.destroy();
          }
        },
      });
    }
  }

  /** Called by the scene when something would have hit us during i-frames. */
  perfectDodge() {
    if (!this.perfectArmed) return;
    this.perfectArmed = false;
    synth.play("perfect");
    this.world.addWonk(10);
    bump(G.s, "perfect_dodge");
    this.world.floatText(this.x, this.y - 30, "PERFECT", "#7fdbff", 14);
    this.world.hitStop(60);
  }

  private tryAttack(now: number, moving: boolean) {
    if (now < this.attackCd || now < this.dodgeUntil) return;
    if (!this.headbuttMode && this.fireGun(now)) return;
    let rate = this.def.attackRate ?? 300;
    if (this.id === "MIKEY" && moving) rate *= 0.7;
    if (now < this.burstUntil) rate *= 0.75;
    this.attackCd = now + rate;
    this.attackAnimUntil = now + 110;
    const base = this.def.damage ?? 10;
    const s = G.s;
    switch (this.def.attack) {
      case "melee": {
        this.combo++;
        let d = this.dmg(base, now);
        let crit = Math.random() < 0.08;
        if (this.id === "FLENKY" && s.upgrades.fl3 && this.combo % 4 === 0) {
          d *= 3;
          crit = true;
        }
        if (this.nextHitCrit) {
          d *= 4;
          crit = true;
        }
        if (crit && !this.nextHitCrit) d *= 2;
        const range = (this.def.range ?? 50) * (this.id === "KREBON" ? 1.1 : 1);
        const arc = this.id === "KREBON" || this.id === "GRONNY" ? 1.25 : 1.05;
        synth.play("swing");
        const fx = this.world.sc.add.image(this.x + Math.cos(this.aim) * 16, this.y + Math.sin(this.aim) * 16, "fx_slash").setRotation(this.aim).setDepth(510).setTint(this.def.color).setScale(range / 40).setAlpha(0.85);
        this.world.sc.tweens.add({ targets: fx, alpha: 0, duration: 140, onComplete: () => fx.destroy() });
        let hitAny = false;
        for (const e of [...this.world.enemies]) {
          if (e.dead) continue;
          const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
          if (dist > range + e.radius) continue;
          const ang = Math.atan2(e.y - this.y, e.x - this.x);
          if (Math.abs(Phaser.Math.Angle.Wrap(ang - this.aim)) > arc && dist > e.radius + 8) continue;
          let dd = d;
          let c2 = crit;
          if (this.id === "CRONGUS") {
            const back = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(this.y - e.y, this.x - e.x) - e.facing)) > 1.9;
            if (back || this.isHidden()) {
              dd *= 2;
              c2 = true;
            }
          }
          this.world.damageEnemy(e, dd, { crit: c2, knock: this.id === "KREBON" ? 260 : 140, angle: ang });
          if (this.id === "KREBON" && s.upgrades.kn2) s.hp = Math.min(maxHp(s), s.hp + 3);
          hitAny = true;
        }
        if (this.nextHitCrit && hitAny) {
          this.nextHitCrit = false;
          if (this.id === "CRONGUS" && s.upgrades.cr1) this.world.aoe(this.x, this.y, 90, 1, { stun: 1200, noWonk: true, label: "" });
        }
        if (hitAny) this.bark();
        break;
      }
      case "projectile": {
        this.shots++;
        const d = this.dmg(base, now);
        let crit = Math.random() < 0.08;
        if (this.id === "KREZWONK") {
          this.omenCount++;
          if (s.upgrades.kw3 && this.omenCount % 6 === 0) crit = true;
        }
        const tex = this.id === "KREBLIS" ? "fx_paper" : "fx_bullet";
        const speed = this.id === "MIKEY" ? 520 : 420;
        const life = ((this.def.range ?? 300) / speed) * 1000;
        const spread = this.id === "MIKEY" ? (Math.random() - 0.5) * 0.12 : 0;
        const homing = this.id === "KREZWONK" ? 2.2 : this.id === "MIKEY" && s.upgrades.mk3 && this.shots % 20 === 0 ? 4 : 0;
        this.world.shoot(this.x, this.y - 6, {
          owner: "player",
          damage: crit ? d * 2 : d,
          crit,
          speed,
          angle: this.aim + spread,
          color: this.def.color,
          texture: tex,
          life: homing ? life * 1.6 : life,
          pierce: this.id === "KREZWONK" && s.upgrades.kw1 ? 1 : 0,
          homing,
          ricochet: this.id === "KREBLIS" && s.upgrades.kb1 ? 1 : 0,
          slow: this.id === "MIKEY" && s.upgrades.mk1 ? 0.2 : 0,
          scale: homing && this.id === "MIKEY" ? 2 : 1,
        });
        synth.play("shoot");
        break;
      }
      case "lob": {
        const target = this.world.player === this ? this.lobTarget() : { x: this.x, y: this.y };
        const throwOne = (tx: number, ty: number) => {
          const fl = this.world.sc.add.image(this.x, this.y, "fx_flask").setScale(2).setDepth(520);
          const d = this.dmg(base, now) * (Math.random() < 0.08 ? 2 : 1);
          this.world.sc.tweens.add({
            targets: fl,
            x: tx,
            y: ty,
            angle: 540,
            duration: 380,
            onUpdate: (tw) => fl.setScale(2 + Math.sin(tw.progress * Math.PI) * 1.2),
            onComplete: () => {
              fl.destroy();
              synth.play("explode");
              this.world.aoe(tx, ty, 50, d, { color: 0x22c55e, knock: 120, slow: s.upgrades.kz1 ? 0.45 : 0 });
            },
          });
        };
        throwOne(target.x, target.y);
        if (s.upgrades.kz3) {
          throwOne(target.x + 40, target.y + 20);
          throwOne(target.x - 40, target.y - 20);
        }
        synth.play("lob");
        break;
      }
    }
  }

  private lobTarget() {
    const r = this.def.range ?? 300;
    return { x: this.x + Math.cos(this.aim) * Math.min(r, 260), y: this.y + Math.sin(this.aim) * Math.min(r, 260) };
  }

  private spendKrezz(cost: number): boolean {
    const s = G.s;
    if (s.krezz < cost) {
      this.world.floatText(this.x, this.y - 30, "NOT ENOUGH KREZZ", "#c084fc", 12);
      return false;
    }
    s.krezz -= cost;
    return true;
  }

  private trySpecial(now: number, c: Controls) {
    const sig = this.def.signature!;
    if (this.headbuttMode) {
      if (now < this.specialCd) return;
      this.specialCd = now + 900;
      this.attackAnimUntil = now + 200;
      synth.play("crit");
      this.world.shake(150, 0.012);
      this.world.floatText(this.x, this.y - 40, "HEADBUTT", "#ffd23f", 16);
      for (const e of [...this.world.enemies]) {
        if (e.dead) continue;
        if (Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) < e.radius + 40) this.world.damageEnemy(e, 40, { source: "headbutt", crit: true, knock: 200 });
      }
      return;
    }
    if (now < this.specialCd) return;
    if (now < this.noSpecialUntil) {
      this.world.floatText(this.x, this.y - 30, "KREZZ BELONGS TO THE STATE", "#ff6666", 12);
      return;
    }
    const s = G.s;
    let cost = sig.cost;
    if (this.id === "KREBLIS" && s.flags.pq_done_pq_kreblis) cost -= 10;
    if (this.id === "MIKEY" && s.flags.pq_done_pq_mikey) cost -= 15;
    if (!this.spendKrezz(Math.max(0, cost))) return;
    this.specialCd = now + sig.cooldown;
    this.world.sc.events.emit("player-special");
    this.bark(true);
    synth.play("wonk");
    const d = this.dmg(this.def.damage ?? 10, now);
    switch (sig.id) {
      case "banishment_dash": {
        const len = 260;
        const sx = this.x;
        const sy = this.y;
        const ex = Phaser.Math.Clamp(sx + Math.cos(this.aim) * len, this.world.bounds.left + 20, this.world.bounds.right - 20);
        const ey = Phaser.Math.Clamp(sy + Math.sin(this.aim) * len, this.world.bounds.top + 20, this.world.bounds.bottom - 20);
        const line = new Phaser.Geom.Line(sx, sy, ex, ey);
        for (const e of [...this.world.enemies]) {
          if (e.dead) continue;
          const pt = Phaser.Geom.Line.GetNearestPoint(line, new Phaser.Geom.Point(e.x, e.y));
          if (Phaser.Math.Distance.Between(pt.x, pt.y, e.x, e.y) < e.radius + 18) {
            if (!e.isBoss && e.hp < e.maxHp * 0.3) this.world.damageEnemy(e, e.hp + 1, { label: "REMOVED FROM GROUP", crit: true });
            else this.world.damageEnemy(e, d * 2.2, { crit: true, knock: 200, angle: this.aim });
          }
        }
        if (s.upgrades.fl2) {
          for (let i = 1; i <= 4; i++) {
            const zx = sx + (ex - sx) * (i / 5);
            const zy = sy + (ey - sy) * (i / 5);
            const z = this.world.sc.add.circle(zx, zy, 20, 0x3b6cff, 0.3).setDepth(5);
            let t = 0;
            const ev = this.world.sc.time.addEvent({ delay: 300, loop: true, callback: () => {
              this.world.aoe(zx, zy, 24, d * 0.4, { noWonk: true, label: "" });
              if (++t > 8) { ev.remove(); z.destroy(); }
            } });
          }
        }
        this.spr.setPosition(ex, ey);
        this.iframesUntil = now + 350;
        const g = this.world.sc.add.graphics().setDepth(498);
        g.lineStyle(10, 0x3b6cff, 0.6).lineBetween(sx, sy, ex, ey);
        this.world.sc.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
        break;
      }
      case "krez_loan": {
        s.krezz = maxKrezz(s);
        this.loanUntil = now + 8000;
        this.interestUntil = now + 12000;
        this.world.floatText(this.x, this.y - 40, "LOAN APPROVED (APR 4000%)", "#86efac", 13);
        break;
      }
      case "breaking_news": {
        const r = 150 * (s.upgrades.kb2 ? 1.5 : 1);
        this.world.aoe(this.x, this.y, r, d * 1.5, { stun: 1200, mark: true, knock: 220, color: 0xd8443a });
        this.world.floatText(this.x, this.y - 50, "BREAKING NEWS", "#ff6666", 18);
        if (s.upgrades.kb3) {
          const x = this.x, y = this.y;
          const z = this.world.sc.add.circle(x, y, r * 0.7, 0xff3b30, 0.15).setDepth(4);
          let t = 0;
          const ev = this.world.sc.time.addEvent({ delay: 400, loop: true, callback: () => {
            this.world.aoe(x, y, r * 0.7, d * 0.35, { noWonk: true, label: "" });
            if (++t > 10) { ev.remove(); z.destroy(); }
          } });
        }
        break;
      }
      case "terrible_prophecy": {
        this.world.sc.events.emit("prophecy", 4000);
        if (s.upgrades.kw2) this.shieldUntil = now + 4000;
        this.world.floatText(this.x, this.y - 50, "I FORESAW THIS", "#c084fc", 18);
        break;
      }
      case "experimental_wonker": {
        const maxT = s.upgrades.sc3 ? 2 : 1;
        while (this.turrets.length >= maxT) {
          this.turrets.shift()!.spr.destroy();
        }
        const spr = this.world.sc.add.sprite(this.x, this.y, "fx_turret").setScale(2).setDepth(400);
        this.turrets.push({ spr, until: now + (s.upgrades.sc1 ? 12000 : 8000), next: now + 300 });
        this.world.floatText(this.x, this.y - 40, "WONKER DEPLOYED", "#e0902a", 13);
        break;
      }
      case "vengeful_krunch": {
        const recent = this.recentDamage.reduce((a, r) => a + r.amt, 0);
        let dd = d * 2 + recent * 1.0;
        if (s.upgrades.kn3) {
          s.hp = Math.max(1, s.hp - s.hp * 0.1);
          dd *= 3;
        }
        const r = 120 * (s.upgrades.kn1 ? 1.4 : 1);
        this.world.aoe(this.x, this.y, r, dd, { knock: 320, crit: true, color: 0x7a1f2b });
        this.world.shake(250, 0.012);
        this.world.floatText(this.x, this.y - 50, "KRUNCH", "#ff4d6d", 22);
        break;
      }
      case "lulon_lurk": {
        this.lurkUntil = now + 4000 + (s.flags.pq_done_pq_crongus ? 2000 : 0);
        this.nextHitCrit = true;
        if (s.upgrades.cr2) {
          this.decoy = this.world.sc.add.sprite(this.x, this.y, this.spr.texture.key, 0).setScale(2).setAlpha(0.8).setDepth(400);
          this.decoyUntil = now + 4000;
        }
        this.world.floatText(this.x, this.y - 40, "*lurks*", "#17c6c0", 14);
        break;
      }
      case "runescape_slam": {
        const hits = s.upgrades.gr3 ? 2 : 1;
        for (let h = 0; h < hits; h++) {
          this.world.sc.time.delayedCall(h * 260, () => {
            this.world.aoe(this.x, this.y, 110, 99, { fixed: true, knock: 380, label: "99", color: 0xd0642a });
            this.world.shake(200, 0.01);
          });
        }
        break;
      }
      case "nuclear_option": {
        const t = c.aimPoint();
        const waves = s.upgrades.mk2 ? 2 : 1;
        for (let w = 0; w < waves; w++) {
          for (let i = 0; i < 7; i++) {
            const bx = t.x + (Math.random() - 0.5) * 220;
            const by = t.y + (Math.random() - 0.5) * 220;
            this.world.sc.time.delayedCall(w * 900 + i * 110, () => {
              const mark = this.world.sc.add.circle(bx, by, 50, 0xffd23f, 0.25).setDepth(4);
              this.world.sc.time.delayedCall(260, () => {
                mark.destroy();
                synth.play("explode");
                this.world.aoe(bx, by, 50, d * 2.2, { knock: 160, color: 0xffa500 });
              });
            });
          }
        }
        this.world.floatText(this.x, this.y - 50, "THE NUCLEAR OPTION", "#ffa500", 16);
        break;
      }
    }
  }

  private updateTurrets(now: number) {
    const s = G.s;
    this.turrets = this.turrets.filter((t) => {
      if (now > t.until) {
        t.spr.destroy();
        return false;
      }
      if (now > t.next) {
        t.next = now + 350;
        const e = this.world.nearestEnemy(t.spr.x, t.spr.y, 420);
        if (e) {
          const a = Math.atan2(e.y - t.spr.y, e.x - t.spr.x);
          t.spr.setFlipX(Math.cos(a) < 0);
          const dmg = this.dmg(9, now) * 1.4 * (s.flags.pq_done_pq_scrombus ? 1.4 : 1);
          for (const ang of [a, a + Math.PI]) {
            this.world.shoot(t.spr.x, t.spr.y, { owner: "player", damage: dmg, speed: 460, angle: ang, color: 0xe0902a, life: 900, onHit: s.upgrades.sc2 ? (x, y) => this.maybeHealOrb(x, y) : undefined });
          }
        }
      }
      return true;
    });
  }

  private maybeHealOrb(x: number, y: number) {
    if (Math.random() < 0.15) this.world.sc.events.emit("drop-heal", x, y);
  }

  drinkBottle(now: number) {
    const s = G.s;
    if (now < this.noHealUntil) {
      this.world.floatText(this.x, this.y - 30, "HEALING REQUIRES A PERMIT", "#ff6666", 12);
      return;
    }
    if (s.bottles <= 0) {
      this.world.floatText(this.x, this.y - 30, "NO PUSSY JUICE", "#ffb6c1", 12);
      return;
    }
    s.bottles--;
    s.hp = Math.min(maxHp(s), s.hp + 45);
    s.intoxication = Math.max(0, s.intoxication - 10);
    synth.play("gulp");
    this.world.floatText(this.x, this.y - 30, "+45 (national drink)", "#ffb6c1", 13);
    this.world.sc.events.emit("player-heal");
  }

  drinkBongo(now: number) {
    const s = G.s;
    if (now < this.noHealUntil) {
      this.world.floatText(this.x, this.y - 30, "HEALING REQUIRES A PERMIT", "#ff6666", 12);
      return;
    }
    if (s.bongos <= 0) {
      this.world.floatText(this.x, this.y - 30, "NO FIZZY BONGOS (withdrawals)", "#e0a35a", 12);
      return;
    }
    s.bongos--;
    s.intoxication = Math.min(100, s.intoxication + 18);
    this.bongoUntil = now + 30000;
    const heal = activeMods(s).beerHeal + (s.flags.bongos_food ? 4 : 0);
    if (heal) s.hp = Math.min(maxHp(s), s.hp + heal);
    bump(s, "bongos_drunk");
    synth.play("bongo");
    this.world.floatText(this.x, this.y - 30, heal ? `🍺 +${heal}` : "🍺 FIZZY BONGO", "#e0a35a", 13);
    this.world.sc.events.emit("player-heal");
  }

  tryBurst(now: number) {
    if (this.wonk < 100) {
      this.world.floatText(this.x, this.y - 30, `WONK ${Math.floor(this.wonk)}%`, "#ff8c00", 12);
      return;
    }
    this.wonk = 0;
    this.burstUntil = now + 1400;
    synth.play("burst");
    this.world.shake(500, 0.02);
    const r = 220 * activeMods(G.s).burstRadiusMult;
    this.world.floatText(this.x, this.y - 60, "WONK IT 'TIL YOU KREZ!", "#ffd23f", 22);
    this.world.sc.events.emit("krezz-burst", r);
    for (let i = 0; i < 3; i++) {
      this.world.sc.time.delayedCall(i * 300, () => {
        this.world.aoe(this.x, this.y, r, this.dmg(this.def.damage ?? 10, now) * 4, { knock: 300, color: 0xffd23f, crit: true, noWonk: true });
      });
    }
  }

  /** Returns true if the hit was taken. */
  takeHit(amount: number, now: number): boolean {
    if (this.invulnerable(now)) {
      if (now < this.iframesUntil) this.perfectDodge();
      return false;
    }
    const s = G.s;
    let a = amount;
    if (this.id === "KREBON") a *= 0.8;
    if (now < this.bongoUntil) a *= 0.95;
    s.hp -= a;
    this.recentDamage.push({ t: now, amt: a });
    this.iframesUntil = now + 450;
    if (s.hp <= 0) {
      if (this.id === "FLENKY" && !this.readmissionUsed) {
        this.readmissionUsed = true;
        s.hp = Math.max(1, maxHp(s) * 0.3);
        this.iframesUntil = now + 1500;
        this.world.floatText(this.x, this.y - 50, "BANNED... READMITTED", "#3b6cff", 16);
        return true;
      }
      s.hp = 0;
    }
    return true;
  }

  refillBottles() {
    G.s.bottles = maxBottles(G.s);
  }

  destroy() {
    this.gunSpr?.destroy();
    this.turrets.forEach((t) => t.spr.destroy());
    this.decoy?.destroy();
    this.label.destroy();
    this.spr.destroy();
  }
}

export type { Enemy };
