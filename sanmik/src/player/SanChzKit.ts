import type { CharacterKit, Player } from './Player';
import type { Controls } from '../input/Controls';
import { SANCHZ } from '../config/tuning';
import { AudioBus } from '../audio/AudioBus';
import type { Rect } from '../combat/types';

type Throwable = 'doughnut' | 'bean' | 'sausage';
const LABEL: Record<Throwable, string> = { doughnut: 'JAM DOUGHNUT', bean: 'BEAN BOMB', sausage: 'SAUSAGE ROLL' };

// SanChz: crutches are his mobility aids and a weapon. He has the same jump and
// stage access as SanMik; his edge is reach, defence and area control.
export class SanChzKit implements CharacterKit {
  readonly id = 'sanchz' as const;
  readonly jumpVoice = 'vo_yeghhh' as const;
  readonly meterName = 'CRUNK';
  readonly meterColor = 0xff3ad0;

  private p!: Player;
  weapon: Throwable = 'doughnut';
  ammo: Record<Throwable, number> = { doughnut: -1, bean: 0, sausage: 0 };
  private nextThrow = 0;
  private throwAnimUntil = 0;
  private throwUp = false;
  private strikeIdx = -1;
  private strikeStart = 0;
  private strikeEnd = 0;
  private queued = false;
  private guardUntil = 0;
  private guardReadyAt = 0;
  private fartUntil = 0;
  private fartReadyAt = 0;
  private nextTrail = 0;

  attach(p: Player) {
    this.p = p;
  }

  get tempo() {
    return this.p.specialActive ? SANCHZ.crunk.tempoMult : 1;
  }

  weaponLabel() {
    return LABEL[this.weapon];
  }

  ammoLabel() {
    return this.weapon === 'doughnut' ? 'INF' : `${this.ammo[this.weapon]}`;
  }

  givePickup(kind: string): string | null {
    switch (kind) {
      case 'crate1':
      case 'bean':
        this.ammo.bean += SANCHZ.bean.ammo; this.weapon = 'bean';
        return 'BEAN BOMBS!';
      case 'crate2':
      case 'sausage':
        this.ammo.sausage += SANCHZ.sausage.ammo; this.weapon = 'sausage';
        return 'SAUSAGE ROLLS!';
      case 'crate3':
      case 'crate4':
      case 'ammo':
        this.ammo.bean += 6; this.ammo.sausage += 8;
        return 'PICNIC HAMPER: BEANS + ROLLS';
    }
    return null;
  }

  moveScale(now: number) {
    if (now < this.guardUntil || now < this.fartUntil) return 0;
    if (now < this.strikeEnd) return 0.3;
    return 1;
  }

  animOverride(now: number) {
    if (now < this.guardUntil) return 'guard';
    if (now < this.fartUntil) return 'fart';
    if (now < this.strikeEnd && this.strikeIdx >= 0) return `strike${this.strikeIdx + 1}`;
    if (now < this.throwAnimUntil) return this.throwUp ? 'throwup' : 'throw';
    return null;
  }

  guardRect(p: Player, now: number): Rect | null {
    if (now >= this.guardUntil) return null;
    const b = p.pbody;
    const w = 22, h = 50;
    return p.facing > 0 ? { x: b.right - 6, y: p.y - h, w, h } : { x: b.left + 6 - w, y: p.y - h, w, h };
  }

  private owned(): Throwable[] {
    return (['doughnut', 'bean', 'sausage'] as Throwable[]).filter((t) => t === 'doughnut' || this.ammo[t] > 0);
  }

  update(p: Player, c: Controls, _dt: number, now: number) {
    const host = p.host;
    // queued combo strike
    if (this.queued && now >= this.strikeEnd - SANCHZ.strike[this.strikeIdx].recoverMs * 0.5 / this.tempo) {
      this.queued = false;
      this.startStrike(this.strikeIdx + 1, now);
    }
    if (host.inputLocked) return;

    if (c.justPressed('next') || c.justPressed('prev')) {
      const owned = this.owned();
      const i = owned.indexOf(this.weapon);
      this.weapon = owned[(i + (c.justPressed('next') ? 1 : -1) + owned.length) % owned.length];
      AudioBus.sfx('sfx_ui_move');
      host.fx.pop(p.x, p.y - 56, LABEL[this.weapon], '#ffffff', 10, 16, 600);
    }

    const busy = now < this.guardUntil || now < this.fartUntil;

    // guard (alt)
    if (c.justPressed('alt') && now >= this.guardReadyAt && !busy) {
      this.guardUntil = now + SANCHZ.guard.windowMs;
      this.guardReadyAt = now + SANCHZ.guard.windowMs + SANCHZ.guard.cooldownMs;
      this.strikeEnd = 0;
      this.queued = false;
      AudioBus.sfx('sfx_swing', { vol: 0.4, rate: 1.4 });
    }

    // rancid fart: down + melee on the ground
    if (c.justPressed('melee') && c.isDown('down') && p.onGround && !busy) {
      if (now >= this.fartReadyAt) this.fart(now);
      return;
    }

    // crutch strikes
    if (c.justPressed('melee') && !busy) {
      if (now >= this.strikeEnd) this.startStrike(0, now);
      else if (this.strikeIdx < 2 && now > this.strikeStart + 60 / this.tempo) this.queued = true;
    }

    // throwing
    if (c.isDown('shoot') && now >= this.nextThrow && !busy && now >= this.strikeEnd) this.throw(now);

    // crunk gas trail
    if (p.specialActive && now >= this.nextTrail && Math.abs(p.vx) > 40) {
      this.nextTrail = now + SANCHZ.crunk.trailEveryMs;
      this.gasCloud(p.x - p.facing * 10, p.y - 8, 28, 18, 700, SANCHZ.crunk.trailDps, 0.5);
    }
  }

  private startStrike(idx: number, now: number) {
    const p = this.p;
    const cfg = SANCHZ.strike[idx];
    const t = this.tempo;
    const range = cfg.range * (p.specialActive ? SANCHZ.crunk.meleeRangeMult : 1);
    this.strikeIdx = idx;
    this.strikeStart = now;
    const windup = 60 / t;
    this.strikeEnd = now + windup + (cfg.activeMs + cfg.recoverMs) / t;
    p.host.time.delayedCall(windup, () => {
      if (!p.alive || this.strikeIdx !== idx) return;
      const host = p.host;
      host.combat.addSwing({
        rect: () => {
          const b = p.pbody;
          const y = p.y + cfg.yOff - cfg.height / 2;
          return p.facing > 0 ? { x: b.right - 6, y, w: range + 6, h: cfg.height } : { x: b.left - range, y, w: range + 6, h: cfg.height };
        },
        damage: cfg.damage, until: host.now + cfg.activeMs / t, kind: 'melee', dir: p.facing, strong: idx === 2,
      });
      AudioBus.sfx('sfx_swing', { vol: 0.7, rate: 0.9 + idx * 0.15 });
      if (idx === 2) p.vx = p.facing * 120;
    });
    p.play(`${p.tex}:strike${idx + 1}`, false);
  }

  private throw(now: number) {
    const p = this.p;
    const host = p.host;
    const w = this.weapon;
    const a = p.aim;
    this.throwUp = a.y < -0.5 && a.name === 'up';
    this.throwAnimUntil = now + 160 / this.tempo;
    const hx = p.x + p.facing * 10;
    const hy = p.y - (this.throwUp ? 50 : 36);
    if (w === 'doughnut') {
      const cfg = SANCHZ.doughnut;
      const base: [number, number] =
        a.name === 'up' ? [p.facing * 40, -430] :
        a.name === 'diagup' ? [p.facing * 250, -340] :
        a.name === 'down' ? [0, 320] :
        a.name === 'diagdown' ? [p.facing * 230, 140] : [p.facing * cfg.speed, cfg.lift];
      const spreads = p.specialActive ? [-0.22, 0, 0.22] : [0];
      for (const s of spreads) {
        const ang = Math.atan2(base[1], base[0]) + s;
        const sp = Math.hypot(base[0], base[1]);
        host.combat.spawn({
          team: 'player', texture: 'p_doughnut', x: hx, y: hy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          gravity: cfg.gravity, damage: cfg.damage, lifeMs: cfg.lifeMs, hitW: cfg.hitbox, rotate: 'spin', spin: 12, sticky: true, world: 'die',
          onExpire: (x, y, reason) => {
            if (reason === 'life') return;
            const splat = host.add.image(x, y + (reason === 'world' ? 2 : 0), 'fx_jam').setDepth(38).setAngle((Math.random() - 0.5) * 30);
            host.tweens.add({ targets: splat, alpha: 0, delay: 600, duration: 400, onComplete: () => splat.destroy() });
            AudioBus.sfx('sfx_splat', { vol: 0.45, maxCopies: 3 });
          },
        });
      }
      this.nextThrow = now + cfg.cooldownMs / this.tempo;
    } else if (w === 'bean') {
      const cfg = SANCHZ.bean;
      const vy = a.name === 'up' ? -460 : a.name === 'diagup' ? -380 : cfg.lift;
      host.combat.spawn({
        team: 'player', texture: 'p_bean', x: hx, y: hy, vx: p.facing * (a.name === 'up' ? 40 : cfg.speed), vy,
        gravity: cfg.gravity, damage: cfg.damage, lifeMs: cfg.lifeMs, hitW: 10, rotate: 'spin', spin: 10, world: 'die',
        onExpire: (x, y) => {
          AudioBus.sfx('sfx_burst', { vol: 0.8 });
          host.fx.shake(80, 0.004);
          this.gasCloud(x, y - 10, cfg.cloudR * 2, cfg.cloudR * 1.4, cfg.cloudMs, cfg.cloudDps, 1);
        },
      });
      this.ammo.bean--;
      this.nextThrow = now + cfg.cooldownMs / this.tempo;
    } else {
      const cfg = SANCHZ.sausage;
      host.combat.spawn({
        team: 'player', texture: 'p_sausage', x: p.x + p.facing * 14, y: p.y - 8, vx: p.facing * cfg.speed, vy: 0,
        gravity: 900, damage: cfg.damage, lifeMs: cfg.lifeMs, hitW: 14, hitH: 8, world: 'roll', bounces: 1, rotate: 'spin', spin: 14,
      });
      this.ammo.sausage--;
      this.nextThrow = now + cfg.cooldownMs / this.tempo;
    }
    if (w !== 'doughnut' && this.ammo[w] <= 0) {
      host.fx.pop(p.x, p.y - 56, 'ALL GONE. YEGHHH.', '#ff8a8a', 10);
      this.weapon = 'doughnut';
    }
    AudioBus.sfx('sfx_throw', { vol: 0.5, maxCopies: 2 });
  }

  private fart(now: number) {
    const p = this.p;
    const cfg = SANCHZ.fart;
    this.fartUntil = now + 320;
    this.fartReadyAt = now + cfg.cooldownMs / this.tempo;
    AudioBus.sfx('sfx_fart');
    p.host.fx.pop(p.x - p.facing * 16, p.y - 44, ['*PARP*', '*PFFRRT*', 'RANCID', 'SORRY NOT SORRY'][Math.floor(Math.random() * 4)], '#9fe06a', 10);
    this.gasCloud(p.x - p.facing * 14, p.y - 18, cfg.radius * 2.2, cfg.radius * 1.5, cfg.durationMs, cfg.dps, 1);
  }

  private gasCloud(x: number, y: number, w: number, h: number, ms: number, dps: number, scale: number) {
    const host = this.p.host;
    const vis = host.add.sprite(x, y, 'fx_gas', 'g_0').play('gas_boil').setDepth(55).setAlpha(0.85).setScale(scale * (w / 44));
    host.tweens.add({ targets: vis, alpha: 0, scale: vis.scale * 1.2, delay: ms * 0.6, duration: ms * 0.4 });
    const tick = 250;
    host.combat.addZone({
      team: 'player', rect: () => ({ x: x - w / 2, y: y - h / 2, w, h }), until: host.now + ms, damage: (dps * tick) / 1000, tickMs: tick, kind: 'gas', visual: vis,
    });
  }

  postUpdate() {}

  startSpecial(p: Player) {
    p.host.fx.banner('CRUNK MODE', 'GETTING CRUNK WIV SANCHZ', '#ff3ad0', 1400);
    AudioBus.sfx('sfx_rave');
  }

  endSpecial(p: Player) {
    p.host.fx.pop(p.x, p.y - 64, 'HANGOVER', '#9fe06a', 12);
  }

  setVisible() {}

  destroy() {}
}

