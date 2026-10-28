import Phaser from 'phaser';
import type { CharacterKit, Player } from './Player';
import type { Controls } from '../input/Controls';
import { SANMIK, SPECIAL, GunSpec } from '../config/tuning';
import { SANMIK_FRAMES_META } from '../art/characters';
import { AudioBus } from '../audio/AudioBus';
import type { Rect } from '../combat/types';

type GunId = 'mik' | 'shotgun' | 'uzi';
type MeleeMode = 'mik' | 'chainsaw' | 'bat';

const GUNS: Record<GunId, GunSpec> = { mik: SANMIK.mik, shotgun: SANMIK.shotgun, uzi: SANMIK.uzi };

export class SanMikKit implements CharacterKit {
  readonly id = 'sanmik' as const;
  readonly jumpVoice = 'vo_yee' as const;
  readonly meterName = 'FAME';
  readonly meterColor = 0xffd23a;

  private p!: Player;
  private arm!: Phaser.GameObjects.Sprite;
  private chargeGlow!: Phaser.GameObjects.Image;
  gun: GunId = 'mik';
  ammo: Record<GunId, number> = { mik: -1, shotgun: 0, uzi: 0 };
  meleeMode: MeleeMode = 'mik';
  meleeModeUntil = 0;
  private nextShot = 0;
  private holdStart = 0;
  private charging = false;
  private chargeSfxAt = 0;
  private lastShotAt = -9999;
  private swingStart = 0;
  private swingDur = 0;
  private swingFrom = 0;
  private swingTo = 0;
  private comboStep = 0;
  private meleeReadyAt = 0;
  private lastMeleeAt = -9999;
  private poseUntil = 0;
  private poseReadyAt = 0;
  private sawSfxAt = 0;
  private armTheta = 0;

  attach(p: Player) {
    this.p = p;
    this.arm = p.host.add.sprite(p.x, p.y, `arm_${p.tex}`, 'mik').setOrigin(4 / 40, 8 / 16).setDepth(51);
    this.chargeGlow = p.host.add.image(p.x, p.y, 'fx_flash').setDepth(52).setVisible(false).setTint(0x7ff3ff);
  }

  get rateMult() {
    return this.p.specialActive ? SANMIK.delusion.fireRateMult : 1;
  }

  weaponLabel() {
    if (this.meleeMode !== 'mik') return `${GUNS[this.gun].label} + ${this.meleeMode.toUpperCase()}`;
    return GUNS[this.gun].label;
  }

  ammoLabel() {
    const parts: string[] = [];
    parts.push(this.gun === 'mik' ? 'INF' : `${this.ammo[this.gun]}`);
    if (this.meleeMode !== 'mik') parts.push(`${Math.ceil((this.meleeModeUntil - this.p.host.now) / 1000)}s`);
    return parts.join('  ');
  }

  givePickup(kind: string): string | null {
    const map: Record<string, string> = { crate1: 'shotgun', crate2: 'uzi', crate3: 'chainsaw', crate4: 'bat' };
    const k = map[kind] ?? kind;
    const now = this.p.host.now;
    switch (k) {
      case 'shotgun':
      case 'uzi':
        this.ammo[k] += GUNS[k].ammo;
        this.gun = k;
        return `${GUNS[k].label}!`;
      case 'chainsaw':
        this.meleeMode = 'chainsaw';
        this.meleeModeUntil = now + SANMIK.chainsaw.durationMs;
        return 'CHAINSAW! (HOLD MELEE)';
      case 'bat':
        this.meleeMode = 'bat';
        this.meleeModeUntil = now + SANMIK.bat.durationMs;
        return 'BASEBALL BAT! (BATS SHOTS BACK)';
      case 'ammo':
        if (this.gun !== 'mik') this.ammo[this.gun] += Math.ceil(GUNS[this.gun].ammo / 2);
        else { this.ammo.shotgun += 8; this.gun = 'shotgun'; }
        return 'AMMO';
    }
    return null;
  }

  moveScale(now: number) {
    if (now < this.poseUntil) return 0;
    if (this.meleeMode === 'chainsaw' && now - this.lastMeleeAt < 120) return 0.6;
    return 1;
  }

  animOverride(now: number) {
    if (now < this.poseUntil) return 'pose';
    return null;
  }

  guardRect(): Rect | null {
    return null;
  }

  private ownedGuns(): GunId[] {
    return (['mik', 'shotgun', 'uzi'] as GunId[]).filter((g) => g === 'mik' || this.ammo[g] > 0);
  }

  update(p: Player, c: Controls, _dt: number, now: number) {
    const host = p.host;
    if (host.inputLocked) { this.charging = false; return; }
    if (this.meleeMode !== 'mik' && now > this.meleeModeUntil) {
      host.fx.pop(p.x, p.y - 60, `${this.meleeMode.toUpperCase()} GONE`, '#cccccc', 10);
      this.meleeMode = 'mik';
    }

    // weapon cycling
    if (c.justPressed('next') || c.justPressed('prev')) {
      const owned = this.ownedGuns();
      const i = owned.indexOf(this.gun);
      const d = c.justPressed('next') ? 1 : -1;
      this.gun = owned[(i + d + owned.length) % owned.length];
      AudioBus.sfx('sfx_ui_move');
      host.fx.pop(p.x, p.y - 60, GUNS[this.gun].label, '#ffffff', 10, 16, 600);
    }

    // pose (alt): pure ego. Gains a little fame.
    if (c.justPressed('alt') && p.onGround && now >= this.poseReadyAt) {
      this.poseUntil = now + SANMIK.pose.durationMs;
      this.poseReadyAt = now + SANMIK.pose.cooldownMs;
      p.addMeter(SPECIAL.poseGain);
      AudioBus.sfx('sfx_sparkle', { vol: 0.6 });
      for (let i = 0; i < 3; i++) host.time.delayedCall(i * 110, () => host.fx.burst(p.x + (Math.random() - 0.5) * 60, p.y - 40 - Math.random() * 30, 'fx_flash', { scale: 0.6, duration: 160 }));
      host.fx.pop(p.x, p.y - 74, ['*CLICK*', 'GORGEOUS', 'ICONIC', 'PAPS LUV IT'][Math.floor(Math.random() * 4)], '#ffffff', 10);
    }

    // shooting
    const gun = GUNS[this.gun];
    if (this.gun === 'mik') {
      // Hold = auto-fire. Holding also builds a charge; releasing when full fires a YEE blast.
      if (c.justPressed('shoot')) this.holdStart = now;
      if (c.isDown('shoot') && now >= this.nextShot) this.fireGun(gun, now);
      if (c.isDown('shoot') && now - this.holdStart > 200) {
        if (!this.charging) { this.charging = true; this.chargeSfxAt = now; AudioBus.sfx('sfx_charge', { vol: 0.5, maxCopies: 1 }); }
      }
      if (c.justReleased('shoot')) {
        if (this.charging && now - this.holdStart >= 200 + SANMIK.mikChargeMs / this.rateMult) this.fireCharged(now);
        this.charging = false;
      }
    } else {
      this.charging = false;
      if (c.isDown('shoot') && now >= this.nextShot) {
        this.fireGun(gun, now);
        this.ammo[this.gun]--;
        if (this.ammo[this.gun] <= 0) {
          host.fx.pop(p.x, p.y - 60, 'OUT OF AMMO. YEE.', '#ff8a8a', 10);
          this.gun = 'mik';
        }
      }
    }

    // melee
    if (this.meleeMode === 'chainsaw') {
      if (c.isDown('melee')) {
        this.lastMeleeAt = now;
        if (now >= this.sawSfxAt) { AudioBus.sfx('sfx_chainsaw', { vol: 0.5, maxCopies: 2 }); this.sawSfxAt = now + 250; }
        if (!p.host.combat.swings.some((s) => s.kind === 'melee' && s.repeatMs)) {
          p.host.combat.addSwing({
            rect: () => this.meleeRect(SANMIK.chainsaw.range, 18), damage: SANMIK.chainsaw.damage, until: now + 90, kind: 'melee', dir: p.facing,
            repeatMs: SANMIK.chainsaw.tickMs,
          });
        } else {
          for (const s of p.host.combat.swings) if (s.repeatMs) s.until = now + 90;
        }
      }
    } else if (c.justPressed('melee') && now >= this.meleeReadyAt) {
      this.doMelee(now);
    }
  }

  private shoulder() {
    const p = this.p;
    const meta = SANMIK_FRAMES_META[p.frame.name] ?? { sx: 29, sy: 39 };
    const fw = 48, fh = 72;
    const sx = p.facing > 0 ? p.x - fw / 2 + meta.sx : p.x + fw / 2 - meta.sx;
    return { x: sx, y: p.y - fh + meta.sy };
  }

  private worldAngle(theta: number) {
    return this.p.facing > 0 ? theta : Math.PI - theta;
  }

  private muzzle(dist = 26) {
    const s = this.shoulder();
    const a = this.p.aim.angle;
    return { x: s.x + Math.cos(a) * dist, y: s.y + Math.sin(a) * dist, a };
  }

  private fireGun(gun: GunSpec, now: number) {
    const p = this.p;
    const m = this.muzzle(gun.id === 'mik' ? 28 : 34);
    const delu = p.specialActive;
    for (let i = 0; i < gun.pellets; i++) {
      const spread = gun.pellets > 1 ? (-gun.spreadDeg / 2 + (gun.spreadDeg * i) / (gun.pellets - 1)) : (Math.random() - 0.5) * gun.spreadDeg;
      const a = m.a + (spread * Math.PI) / 180;
      const sp = gun.speed * (gun.pellets > 1 ? 0.85 + Math.random() * 0.25 : 1);
      p.host.combat.spawn({
        team: 'player', texture: gun.texture, x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        damage: gun.damage, lifeMs: gun.lifeMs, hitW: gun.hitbox, hitH: gun.hitbox + (gun.id === 'mik' ? 6 : 0),
        rotate: 'vel', world: 'die', tint: delu ? 0xffe14a : undefined, scale: delu ? 1.3 : 1,
      });
    }
    this.nextShot = now + gun.cooldownMs / this.rateMult;
    this.lastShotAt = now;
    AudioBus.sfx(gun.id === 'mik' ? 'sfx_mik' : gun.id === 'shotgun' ? 'sfx_shotgun' : 'sfx_uzi', { vol: gun.id === 'uzi' ? 0.5 : 0.7, maxCopies: 3 });
    p.host.fx.sparks(m.x, m.y, gun.id === 'mik' ? 0x7ff3ff : 0xffe14a, 2, 60);
    if (gun.id === 'shotgun') {
      p.host.fx.shake(70, 0.004);
      if (!p.onGround && p.aim.y > 0.5) p.pbody.setVelocityY(Math.min(p.pbody.velocity.y, -160)); // shotgun pogo
    }
  }

  private fireCharged(now: number) {
    const p = this.p;
    const m = this.muzzle(34);
    const c = SANMIK.mikCharged;
    p.host.combat.spawn({
      team: 'player', texture: 'p_yee', x: m.x, y: m.y, vx: Math.cos(m.a) * c.speed, vy: Math.sin(m.a) * c.speed,
      damage: c.damage, lifeMs: c.lifeMs, hitW: c.hitbox, hitH: c.hitbox + 10, pierce: true, strong: true, rotate: 'vel', world: 'none', fadeOut: true,
    });
    AudioBus.sfx('sfx_yee_blast');
    p.host.fx.shake(120, 0.006);
    p.host.fx.burst(m.x, m.y, 'fx_ring', { scale: 0.6, tint: 0x7ff3ff });
    this.nextShot = now + 250;
    this.lastShotAt = now;
  }

  private meleeRect(range: number, h: number): Rect {
    const b = this.p.pbody;
    const cy = b.y + b.height * 0.35;
    return this.p.facing > 0 ? { x: b.right - 4, y: cy - h / 2, w: range + 4, h } : { x: b.left - range, y: cy - h / 2, w: range + 4, h };
  }

  private doMelee(now: number) {
    const p = this.p;
    if (this.meleeMode === 'bat') {
      const cfg = SANMIK.bat;
      p.host.combat.addSwing({ rect: () => this.meleeRect(cfg.range, 34), damage: cfg.damage, until: now + 150, kind: 'melee', dir: p.facing, reflect: true, strong: true });
      this.swing(now, -2.2, 0.9, 200);
      this.meleeReadyAt = now + 340;
      AudioBus.sfx('sfx_bat');
      return;
    }
    const cfg = SANMIK.melee;
    this.comboStep = now - this.lastMeleeAt < cfg.comboWindowMs + cfg.activeMs + cfg.recoverMs && this.comboStep === 0 ? 1 : 0;
    const second = this.comboStep === 1;
    p.host.combat.addSwing({
      rect: () => this.meleeRect(cfg.range, cfg.height + (second ? 10 : 0)), damage: second ? cfg.damage * 1.4 : cfg.damage,
      until: now + cfg.activeMs, kind: 'melee', dir: p.facing, strong: second,
    });
    if (second) this.swing(now, 1.2, -1.6, 180); else this.swing(now, -1.9, 0.6, 140);
    this.meleeReadyAt = now + cfg.activeMs + cfg.recoverMs * (second ? 1.6 : 0.6);
    this.lastMeleeAt = now;
    AudioBus.sfx('sfx_swing', { vol: 0.7 });
  }

  private swing(now: number, from: number, to: number, dur: number) {
    this.swingStart = now;
    this.swingFrom = from;
    this.swingTo = to;
    this.swingDur = dur;
  }

  postUpdate(p: Player) {
    const now = p.host.now;
    const s = this.shoulder();
    // decide arm angle (theta: 0 = forward, negative = up) in facing-right space
    let theta: number;
    const aiming = p.aim.name !== 'fwd' || now - this.lastShotAt < 350 || this.charging;
    const anim = p.anims.currentAnim?.key.split(':')[1] ?? 'idle';
    if (now - this.swingStart < this.swingDur) {
      const k = (now - this.swingStart) / this.swingDur;
      theta = this.swingFrom + (this.swingTo - this.swingFrom) * Phaser.Math.Easing.Cubic.Out(k);
    } else if (this.meleeMode === 'chainsaw' && now - this.lastMeleeAt < 120) {
      theta = 0.1 * Math.sin(now / 30);
    } else if (aiming || anim === 'crouch') {
      theta = Math.atan2(p.aim.y, Math.abs(p.aim.x));
    } else if (anim === 'pose') theta = -1.2;
    else if (anim === 'victory') theta = -1.4;
    else if (anim === 'jump') theta = -0.7;
    else if (anim === 'fall') theta = -0.3;
    else if (anim === 'run') theta = 0.5 + 0.35 * Math.sin(now / 70);
    else if (anim === 'hurt') theta = -2.2;
    else theta = -0.9 + 0.05 * Math.sin(now / 300); // idle: mic held unnecessarily high
    this.armTheta = theta;
    const item = this.meleeMode !== 'mik' && (now - this.lastShotAt > 350 || this.meleeMode === 'chainsaw') ? (this.meleeMode === 'chainsaw' ? `chainsaw_${Math.floor(now / 50) % 2}` : 'bat') : this.gun;
    this.arm.setFrame(item);
    this.arm.setPosition(s.x, s.y);
    this.arm.setRotation(this.worldAngle(this.armTheta));
    this.arm.setFlipY(p.facing < 0);
    this.arm.setAlpha(p.alpha);
    this.arm.setVisible(p.visible && p.alive);
    // charge glow on the mic
    const charged = this.charging && now - this.holdStart >= 200 + SANMIK.mikChargeMs / this.rateMult;
    if (this.charging) {
      const m = this.muzzle(28);
      this.chargeGlow.setVisible(true).setPosition(m.x, m.y).setScale(charged ? 0.9 + 0.2 * Math.sin(now / 40) : 0.3 + ((now - this.holdStart) / 900) * 0.5)
        .setTint(charged ? 0xff3ad0 : 0x7ff3ff).setAlpha(0.8);
    } else this.chargeGlow.setVisible(false);
    void this.chargeSfxAt;
  }

  startSpecial(p: Player) {
    p.host.fx.banner('DELUSION MODE', 'U R DA BIGGEST STAR IN DA WORLD (U R NOT)', '#ffe14a', 1400);
    AudioBus.sfx('sfx_cheer');
  }

  endSpecial(p: Player) {
    AudioBus.sfx('sfx_flop');
    p.host.fx.pop(p.x, p.y - 70, 'ACTUAL VIEWERS: 3', '#ff8a8a', 14, 30, 1600);
  }

  setVisible(v: boolean) {
    this.arm.setVisible(v);
    this.chargeGlow.setVisible(false);
  }

  destroy() {
    this.arm?.destroy();
    this.chargeGlow?.destroy();
  }
}
