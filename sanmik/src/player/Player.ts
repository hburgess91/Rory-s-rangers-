import Phaser from 'phaser';
import { MOVE, HEALTH, JUMP_GRAVITY, JUMP_VELOCITY, SPECIAL, PICKUPS } from '../config/tuning';
import type { GameHost } from '../core/host';
import type { PlayerLike } from '../combat/Combat';
import type { Hit, Rect, Target } from '../combat/types';
import { AudioBus } from '../audio/AudioBus';
import { session, CharId } from '../core/session';
import type { Controls } from '../input/Controls';

export interface CharacterKit {
  readonly id: CharId;
  readonly jumpVoice: 'vo_yee' | 'vo_yeghhh';
  readonly meterName: string;
  readonly meterColor: number;
  attach(p: Player): void;
  update(p: Player, c: Controls, dtMs: number, now: number): void;
  /** Animation to show instead of the movement animation, or null. */
  animOverride(now: number): string | null;
  /** 0..1 multiplier on horizontal control while attacking/guarding etc. */
  moveScale(now: number): number;
  weaponLabel(): string;
  ammoLabel(): string;
  givePickup(kind: string): string | null; // returns pop text if accepted
  startSpecial(p: Player): void;
  endSpecial(p: Player): void;
  guardRect(p: Player, now: number): Rect | null;
  postUpdate(p: Player): void; // position overlays after movement
  setVisible(v: boolean): void;
  destroy(): void;
}

export type Aim = { x: number; y: number; angle: number; name: 'fwd' | 'up' | 'diagup' | 'diagdown' | 'down' };

export class Player extends Phaser.Physics.Arcade.Sprite implements PlayerLike {
  host: GameHost;
  kit: CharacterKit;
  tex: string;
  hp: number = HEALTH.normalHp;
  maxHp: number = HEALTH.normalHp;
  sock = 0;
  alive = true;
  facing = 1;
  vx = 0;
  onGround = false;
  wasOnGround = false;
  coyote = 0;
  jumpBuffer = 0;
  jumpHeld = false;
  dropUntil = 0;
  invulnUntil = 0;
  hurtUntil = 0;
  crouching = false;
  aim: Aim = { x: 1, y: 0, angle: 0, name: 'fwd' };
  meter = 0;
  specialUntil = 0;
  slipUntil = 0;
  stickyUntil = 0;
  pushX = 0;
  pushUntil = 0;
  lastSafe = { x: 0, y: 0 };
  groundedMs = 0;
  lastFallVy = 0;
  standingOnOneWay = false;
  jumps = 0;
  private flicker = 0;

  constructor(host: GameHost, x: number, y: number, tex: string, kit: CharacterKit) {
    super(host, x, y, tex, 'idle_0');
    this.host = host;
    this.tex = tex;
    this.kit = kit;
    host.add.existing(this);
    host.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(50);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setGravityY(JUMP_GRAVITY);
    body.setMaxVelocity(1000, MOVE.maxFall);
    body.setCollideWorldBounds(true);
    this.setStandingBox();
    this.lastSafe = { x, y };
    kit.attach(this);
  }

  get frameW() { return this.frame.width; }
  get frameH() { return this.frame.height; }

  private setStandingBox() {
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.setSize(MOVE.hitbox.w, MOVE.hitbox.h, false);
    b.setOffset((this.frameW - MOVE.hitbox.w) / 2, this.frameH - MOVE.hitbox.h);
  }

  private setCrouchBox() {
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.setSize(MOVE.hitbox.w, MOVE.crouchHitboxH, false);
    b.setOffset((this.frameW - MOVE.hitbox.w) / 2, this.frameH - MOVE.crouchHitboxH);
  }

  get pbody() {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  hurtRect(): Rect {
    const b = this.pbody;
    return { x: b.x + 2, y: b.y + 3, w: b.width - 4, h: b.height - 4 };
  }

  guardRect(): Rect | null {
    return this.alive ? this.kit.guardRect(this, this.host.now) : null;
  }

  /** World-space point roughly at the hand / mouth used for spawning shots. */
  get centerY() {
    return this.pbody.y + this.pbody.height / 2;
  }

  get specialActive() {
    return this.host.now < this.specialUntil;
  }

  update(dtMs: number, c: Controls) {
    const now = this.host.now;
    const dt = dtMs / 1000;
    const body = this.pbody;
    this.wasOnGround = this.onGround;
    this.onGround = body.blocked.down || body.touching.down;

    if (!this.alive) {
      this.vx *= 0.9;
      body.setVelocityX(this.onGround ? 0 : this.vx);
      return;
    }

    const locked = this.host.inputLocked;
    const ix = locked ? 0 : c.axisX();
    const iy = locked ? 0 : c.axisY();

    // landing
    if (this.onGround && !this.wasOnGround) {
      if (this.lastFallVy > 260) {
        AudioBus.sfx('sfx_land', { vol: 0.5, maxCopies: 1 });
        this.host.fx.dust(this.x, this.y, 4);
      }
    }
    if (!this.onGround) this.lastFallVy = body.velocity.y;

    // safe respawn point for pits
    if (this.onGround && !this.standingOnOneWay) {
      this.groundedMs += dtMs;
      if (this.groundedMs > 250) this.lastSafe = { x: this.x, y: this.y };
    } else this.groundedMs = 0;

    // crouch
    const wantCrouch = this.onGround && iy > 0 && ix === 0 && !locked;
    if (wantCrouch !== this.crouching) {
      this.crouching = wantCrouch;
      if (wantCrouch) this.setCrouchBox(); else this.setStandingBox();
    }

    // facing
    const moveScale = this.kit.moveScale(now);
    if (ix !== 0 && moveScale > 0.5) this.facing = ix;

    // aim
    const f = this.facing;
    if (iy < 0 && ix !== 0) this.aim = { x: f * Math.SQRT1_2, y: -Math.SQRT1_2, angle: 0, name: 'diagup' };
    else if (iy < 0) this.aim = { x: 0, y: -1, angle: 0, name: 'up' };
    else if (iy > 0 && !this.onGround && ix !== 0) this.aim = { x: f * Math.SQRT1_2, y: Math.SQRT1_2, angle: 0, name: 'diagdown' };
    else if (iy > 0 && !this.onGround) this.aim = { x: 0, y: 1, angle: 0, name: 'down' };
    else this.aim = { x: f, y: 0, angle: 0, name: 'fwd' };
    this.aim.angle = Math.atan2(this.aim.y, this.aim.x);

    // horizontal movement
    const sticky = now < this.stickyUntil ? 0.5 : 1;
    const target = (this.crouching ? 0 : ix) * MOVE.maxSpeed * sticky * moveScale;
    const air = this.onGround ? 1 : MOVE.airControl;
    let accel = (ix !== 0 && (Math.sign(ix) === Math.sign(this.vx) || this.vx === 0) ? MOVE.accel : MOVE.decel) * air;
    if (now < this.slipUntil) accel *= this.onGround ? 0.18 : 0.5;
    const diff = target - this.vx;
    this.vx += Math.sign(diff) * Math.min(Math.abs(diff), accel * dt);
    const push = now < this.pushUntil ? this.pushX : 0;
    body.setVelocityX(this.vx + push);
    if ((body.blocked.left && this.vx < 0) || (body.blocked.right && this.vx > 0)) this.vx = 0;

    // jumping
    if (this.onGround) this.coyote = MOVE.coyoteMs; else this.coyote -= dtMs;
    if (!locked && c.justPressed('jump')) {
      if (iy > 0 && this.onGround && this.standingOnOneWay) {
        this.dropUntil = now + MOVE.dropThroughMs; // drop through
        this.jumpBuffer = 0;
      } else this.jumpBuffer = MOVE.bufferMs;
    } else this.jumpBuffer -= dtMs;

    if (this.jumpBuffer > 0 && this.coyote > 0) this.doJump();

    if (this.jumpHeld && (locked || !c.isDown('jump')) && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * MOVE.jumpCutMult);
      this.jumpHeld = false;
    }
    if (body.velocity.y >= 0) this.jumpHeld = false;
    body.setGravityY(body.velocity.y < 0 ? JUMP_GRAVITY : JUMP_GRAVITY * MOVE.fallGravityMult);

    // special meter
    if (!locked && c.justPressed('special') && this.meter >= SPECIAL.max && !this.specialActive) this.startSpecial();
    if (this.specialUntil && now >= this.specialUntil) this.endSpecial();

    this.kit.update(this, c, dtMs, now);
    this.updateAnim(now);

    // invulnerability flicker
    if (now < this.invulnUntil && !locked) {
      this.flicker += dtMs;
      const v = Math.floor(this.flicker / 60) % 2 === 0;
      this.setAlpha(v ? 1 : 0.35);
    } else this.setAlpha(1);
  }

  /** Accepts a jump. Exactly one vocal per accepted jump. */
  doJump() {
    const body = this.pbody;
    body.setVelocityY(-JUMP_VELOCITY);
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpHeld = true;
    this.onGround = false;
    if (this.crouching) { this.crouching = false; this.setStandingBox(); }
    this.jumps++;
    session.jumps++;
    AudioBus.voice(this.kit.jumpVoice);
    this.host.events.emit('player-jump', this.kit.jumpVoice);
    this.host.fx.dust(this.x, this.y, 3);
  }

  postUpdate() {
    this.setFlipX(this.facing < 0);
    this.kit.postUpdate(this);
  }

  private updateAnim(now: number) {
    let anim: string;
    if (now < this.hurtUntil) anim = 'hurt';
    else {
      const o = this.kit.animOverride(now);
      if (o) anim = o;
      else if (!this.onGround) anim = this.pbody.velocity.y < 0 ? 'jump' : 'fall';
      else if (this.crouching) anim = 'crouch';
      else if (Math.abs(this.vx) > 25) anim = 'run';
      else anim = 'idle';
    }
    this.play(`${this.tex}:${anim}`, true);
  }

  hurt(hit: Hit): boolean {
    const now = this.host.now;
    if (!this.alive || now < this.invulnUntil || this.host.inputLocked) return false;
    if (this.host.godMode) {
      this.invulnUntil = now + 300;
      return true;
    }
    // SanChz's crutch guard blocks anything coming from the front during its window.
    const g = this.guardRect();
    if (g && hit.kind !== 'hazard' && Math.sign(hit.x - this.x) === this.facing) {
      this.invulnUntil = now + 250;
      this.onReflect();
      AudioBus.sfx('sfx_parry');
      this.host.fx.sparks(g.x + g.w / 2, g.y + g.h / 2, 0xffe14a, 8, 140);
      this.host.fx.pop(this.x, this.y - 60, 'BLOCKED', '#ffe14a', 10);
      return true;
    }
    session.hitsTaken++;
    session.chapterHits++;
    this.host.events.emit('player-hit');
    if (this.sock > 0) {
      this.sock--;
      this.host.fx.pop(this.x, this.y - 50, 'SOCK ARMOUR SAVED U', '#ffffff', 10);
      this.host.fx.sparks(this.x, this.y - 30, 0xffffff, 10, 140);
      AudioBus.sfx('sfx_parry');
      this.invulnUntil = now + HEALTH.invulnMs;
      return true;
    }
    this.hp = Math.max(0, this.hp - Math.max(1, Math.round(hit.damage)));
    this.invulnUntil = now + HEALTH.invulnMs;
    this.hurtUntil = now + 260;
    this.vx = hit.dir * HEALTH.knockbackX;
    this.pbody.setVelocityY(HEALTH.knockbackY);
    this.jumpHeld = false;
    AudioBus.sfx('sfx_hurt');
    this.host.fx.shake(140, 0.008);
    this.host.hitStop(HEALTH.hitStopMs);
    if (this.hp <= 0) this.die();
    return true;
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.hp = 0;
    if (this.specialActive) this.endSpecial();
    this.play(`${this.tex}:ko`, true);
    this.setAlpha(1);
    this.kit.setVisible(false);
    AudioBus.sfx('sfx_death');
    this.host.onPlayerDeath();
  }

  heal(n: number) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  addMeter(n: number) {
    if (this.specialActive) return;
    const before = this.meter;
    this.meter = Math.min(SPECIAL.max, this.meter + n);
    if (before < SPECIAL.max && this.meter >= SPECIAL.max) {
      AudioBus.sfx('sfx_ready');
      this.host.fx.pop(this.x, this.y - 70, `${this.kit.meterName} READY!`, '#ffe14a', 11);
    }
  }

  startSpecial() {
    this.specialUntil = this.host.now + SPECIAL.durationMs;
    this.kit.startSpecial(this);
    this.host.onSpecial(this.kit.id === 'sanmik' ? 'delusion' : 'crunk', true);
  }

  endSpecial() {
    this.specialUntil = 0;
    this.meter = 0;
    this.kit.endSpecial(this);
    this.host.onSpecial(this.kit.id === 'sanmik' ? 'delusion' : 'crunk', false);
  }

  /** Called while specials drain the meter visually. */
  get meterShown() {
    if (!this.specialActive) return this.meter / SPECIAL.max;
    return Math.max(0, (this.specialUntil - this.host.now) / SPECIAL.durationMs);
  }

  onReflect() {
    this.addMeter(SPECIAL.gainPerParry);
  }

  onDealtHit(kind: Hit['kind'], _t: Target, killed: boolean) {
    this.addMeter(kind === 'melee' ? SPECIAL.gainPerMeleeHit : SPECIAL.gainPerHit);
    if (killed) this.addMeter(SPECIAL.gainPerKill);
  }

  applyZone(effect: string, ms: number, data?: number) {
    const now = this.host.now;
    if (effect === 'sticky') this.stickyUntil = now + ms;
    if (effect === 'push') { this.pushX = data ?? 0; this.pushUntil = now + ms; }
  }

  applyPickup(kind: string): boolean {
    const now = this.host.now;
    const fx = this.host.fx;
    const say = (t: string, col = '#ffffff') => fx.pop(this.x, this.y - 60, t, col, 11);
    switch (kind) {
      case 'food':
        this.heal(2);
        this.slipUntil = now + PICKUPS.fastFoodSlipMs;
        say('+2 HP. GREASY.', '#ffe14a');
        AudioBus.sfx('sfx_heal');
        return true;
      case 'pepsi':
        this.heal(1);
        say('PEPSE. +1 HP', '#5ab8ff');
        AudioBus.sfx('sfx_heal');
        return true;
      case 'pepsimax':
        this.addMeter(40);
        say(`PEPSE MAKS. +${this.kit.meterName}`, '#9fe2ff');
        AudioBus.sfx('sfx_pickup');
        return true;
      case 'sock':
        this.sock = PICKUPS.sockArmour;
        say('SOCK ARMOUR', '#ffffff');
        AudioBus.sfx('sfx_pickup');
        return true;
      case 'friggle':
      case 'spidge': {
        const roll = Math.floor(Math.random() * 4);
        const name = kind.toUpperCase();
        if (roll === 0) { this.heal(1); say(`${name}: +1 HP?`, '#b56fff'); }
        else if (roll === 1) { this.addMeter(25); say(`${name}: +METER??`, '#b56fff'); }
        else if (roll === 2) { this.host.addScore(2500, this.x, this.y - 40); say(`${name}: +2500???`, '#b56fff'); }
        else { this.kit.givePickup('ammo'); say(`${name}: AMMO. SOMEHOW.`, '#b56fff'); }
        AudioBus.sfx('sfx_pickup');
        return true;
      }
      default: {
        const msg = this.kit.givePickup(kind);
        if (msg) { say(msg, '#ffe14a'); AudioBus.sfx('sfx_ammo'); return true; }
        return false;
      }
    }
  }

  respawnAt(x: number, y: number) {
    this.setPosition(x, y);
    this.pbody.reset(x, y);
    this.vx = 0;
    this.invulnUntil = this.host.now + 1200;
  }

  destroy(fromScene?: boolean) {
    this.kit.destroy();
    super.destroy(fromScene);
  }
}
