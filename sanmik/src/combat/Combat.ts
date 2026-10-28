import Phaser from 'phaser';
import { Projectile, ProjSpec } from './Projectile';
import { Hit, Rect, Target, Team, overlap } from './types';
import { Fx } from '../core/Fx';
import { AudioBus } from '../audio/AudioBus';

export interface PlayerLike {
  alive: boolean;
  x: number;
  y: number;
  hurtRect(): Rect;
  guardRect(): Rect | null;
  hurt(hit: Hit): boolean;
  onReflect(): void;
  onDealtHit(kind: Hit['kind'], target: Target, killed: boolean): void;
  applyZone(effect: string, ms: number, data?: number): void;
}

export interface Swing {
  rect: () => Rect;
  damage: number;
  until: number;
  kind: Hit['kind'];
  dir: number;
  reflect?: boolean; // reflect reflectable enemy shots (bat, guard-strike)
  strong?: boolean;
  sticky?: boolean;
  repeatMs?: number; // chainsaw: hits the same target again after this many ms
  hits: Map<unknown, number>;
  onLand?: (t: Target) => void;
}

export interface Zone {
  team: Team;
  rect: () => Rect;
  until: number;
  damage: number; // per tick
  tickMs: number;
  kind: Hit['kind'];
  effect?: 'sticky' | 'push';
  effectData?: number;
  phaseScoped?: boolean;
  last: Map<unknown, number>;
  visual?: Phaser.GameObjects.GameObject;
  dir?: number;
}

export class Combat {
  pool: Phaser.Physics.Arcade.Group;
  targets = new Set<Target & { contactRects?: () => Rect[]; contactDamage?: number }>();
  swings: Swing[] = [];
  zones: Zone[] = [];
  player: PlayerLike | null = null;
  now = 0;
  damageMult = 1; // set by player specials (Delusion)
  onHitStop: (ms: number) => void = () => {};

  constructor(scene: Phaser.Scene, private fx: Fx, solids: Phaser.Physics.Arcade.StaticGroup) {
    this.pool = scene.physics.add.group({ classType: Projectile, maxSize: 260, runChildUpdate: false, allowGravity: true });
    scene.physics.add.collider(this.pool, solids, undefined, (p) => (p as Projectile).live && (p as Projectile).worldMode !== 'none', this);
  }

  spawn(spec: ProjSpec): Projectile | null {
    const p = this.pool.get(spec.x, spec.y) as Projectile | null;
    if (!p) return null;
    return p.spawn(spec);
  }

  live(): Projectile[] {
    return (this.pool.getChildren() as Projectile[]).filter((p) => p.live);
  }

  addSwing(s: Omit<Swing, 'hits'>) {
    const sw = { ...s, hits: new Map() } as Swing;
    this.swings.push(sw);
    return sw;
  }

  addZone(z: Omit<Zone, 'last'>) {
    const zone = { ...z, last: new Map() } as Zone;
    this.zones.push(zone);
    return zone;
  }

  expire(p: Projectile, reason: 'life' | 'world' | 'hit') {
    if (!p.live) return;
    const cb = p.onExpire;
    const x = p.x, y = p.y;
    p.release();
    if (cb) cb(x, y, reason);
  }

  /** Remove enemy projectiles and hazards. scopedOnly keeps non-boss ones. */
  clearEnemy(scopedOnly = false) {
    for (const p of this.live()) if (p.team === 'enemy' && (!scopedOnly || p.phaseScoped)) {
      this.fx.sparks(p.x, p.y, 0xffffff, 2, 60);
      p.onExpire = undefined;
      p.release();
    }
    this.zones = this.zones.filter((z) => {
      const kill = z.team === 'enemy' && (!scopedOnly || z.phaseScoped);
      if (kill) z.visual?.destroy();
      return !kill;
    });
  }

  reflect(p: Projectile, dir: number) {
    const body = p.body as Phaser.Physics.Arcade.Body;
    p.team = 'player';
    p.reflected = true;
    p.damage = 40;
    p.hitSet.clear();
    p.lifeLeft = Math.max(p.lifeLeft, 1500);
    const speed = Math.max(260, Math.hypot(body.velocity.x, body.velocity.y) * 1.4);
    body.setGravityY(0);
    body.setVelocity(dir * speed, -40);
    p.setTint(0xffe14a);
    p.worldMode = 'die';
    this.fx.burst(p.x, p.y, 'fx_ring', { scale: 0.5, tint: 0xffe14a });
    AudioBus.sfx('sfx_reflect');
    this.player?.onReflect();
  }

  private dealToTarget(t: Target, part: number, hit: Hit): boolean {
    const scaled = { ...hit, damage: hit.team === 'player' ? hit.damage * this.damageMult : hit.damage };
    const landed = t.takeHit(scaled, part);
    if (landed && hit.team === 'player') this.player?.onDealtHit(hit.kind, t, !t.alive);
    return landed;
  }

  update(dtMs: number, now: number, view: Rect, worldH: number) {
    this.now = now;
    const player = this.player;
    const pRect = player && player.alive ? player.hurtRect() : null;
    const gRect = player && player.alive ? player.guardRect() : null;
    const projectiles = this.live();

    for (const p of projectiles) {
      p.tick(dtMs);
      if (p.lifeLeft <= 0) { this.expire(p, 'life'); continue; }
      const body = p.body as Phaser.Physics.Arcade.Body;
      const b = body.blocked;
      if (p.worldMode === 'die' && (b.down || b.left || b.right || b.up)) { this.expire(p, 'world'); continue; }
      if (p.worldMode === 'bounce' && (b.down || b.left || b.right || b.up)) {
        p.bouncesLeft--;
        if (p.bouncesLeft < 0) { this.expire(p, 'world'); continue; }
        if (b.down) AudioBus.sfx('sfx_boing', { vol: 0.35, maxCopies: 2 });
      }
      if (p.worldMode === 'roll') {
        if (b.down) body.setVelocityY(0);
        if (b.left || b.right) {
          if (p.bouncesLeft-- > 0) body.setVelocityX((b.left ? 1 : -1) * Math.abs(body.velocity.x || 200));
          else { this.expire(p, 'world'); continue; }
        }
      }
      if (p.x < view.x - 120 || p.x > view.x + view.w + 120 || p.y > worldH + 60 || p.y < view.y - 260) { p.onExpire = undefined; p.release(); }
    }

    const alive = this.live();
    const enemyShots = alive.filter((p) => p.team === 'enemy');
    const playerShots = alive.filter((p) => p.team === 'player');

    // player shots -> targets (and destructible enemy shots)
    for (const p of playerShots) {
      const r = p.hitRect();
      let consumed = false;
      for (const t of this.targets) {
        if (!t.alive || consumed) continue;
        const rects = t.hurtRects();
        for (let i = 0; i < rects.length; i++) {
          if (!overlap(r, rects[i]) || p.hitSet.has(t)) continue;
          const hit: Hit = { damage: p.damage, team: 'player', kind: p.kind === 'gas' ? 'gas' : 'shot', x: p.x, y: p.y, dir: Math.sign((p.body as Phaser.Physics.Arcade.Body).velocity.x) || 1, sticky: p.sticky, strong: p.strong };
          if (this.dealToTarget(t, i, hit)) {
            p.hitSet.add(t);
            this.fx.sparks(p.x, p.y, p.reflected ? 0xffe14a : 0xffffff, 3, 90);
            if (p.strong) this.onHitStop(45);
            if (!p.pierce) { this.expire(p, 'hit'); consumed = true; }
          }
          break;
        }
      }
      if (consumed || !p.live) continue;
      for (const e of enemyShots) {
        if (e.live && e.destructible && overlap(r, e.hitRect())) {
          this.fx.sparks(e.x, e.y, 0xffe14a, 5, 100);
          AudioBus.sfx('sfx_hit', { vol: 0.5 });
          this.expire(e, 'hit');
          if (!p.pierce) { this.expire(p, 'hit'); break; }
        }
      }
    }

    // enemy shots -> guard / player
    if (player && player.alive && pRect) {
      for (const p of enemyShots) {
        if (!p.live) continue;
        const r = p.hitRect();
        if (gRect && overlap(r, gRect)) {
          const dir = Math.sign(gRect.x + gRect.w / 2 - player.x) || 1;
          if (p.reflectable) { this.reflect(p, dir); continue; }
          if (p.destructible) { this.fx.sparks(p.x, p.y, 0xffffff, 4, 80); AudioBus.sfx('sfx_parry', { vol: 0.6 }); this.expire(p, 'hit'); player.onReflect(); continue; }
        }
        if (overlap(r, pRect)) {
          const hit: Hit = { damage: p.damage, team: 'enemy', kind: 'shot', x: p.x, y: p.y, dir: Math.sign(player.x - p.x) || 1 };
          if (player.hurt(hit) && !p.pierce) this.expire(p, 'hit');
        }
      }
    }

    // melee swings
    this.swings = this.swings.filter((s) => s.until > now);
    for (const s of this.swings) {
      const r = s.rect();
      for (const t of this.targets) {
        if (!t.alive) continue;
        const last = s.hits.get(t);
        if (last !== undefined && (!s.repeatMs || now - last < s.repeatMs)) continue;
        const rects = t.hurtRects();
        for (let i = 0; i < rects.length; i++) {
          if (!overlap(r, rects[i])) continue;
          const hit: Hit = { damage: s.damage, team: 'player', kind: s.kind, x: rects[i].x + rects[i].w / 2, y: r.y + r.h / 2, dir: s.dir, strong: s.strong, sticky: s.sticky };
          if (this.dealToTarget(t, i, hit)) {
            s.hits.set(t, now);
            this.fx.sparks(hit.x - s.dir * rects[i].w * 0.3, hit.y, 0xffffff, 5, 120);
            AudioBus.sfx('sfx_melee_hit', { vol: 0.8 });
            if (s.strong) this.onHitStop(55);
            s.onLand?.(t);
          }
          break;
        }
      }
      if (s.reflect) {
        for (const p of enemyShots) {
          if (!p.live || !overlap(r, p.hitRect())) continue;
          if (p.reflectable) this.reflect(p, s.dir);
          else if (p.destructible) { this.fx.sparks(p.x, p.y, 0xffffff, 4, 80); this.expire(p, 'hit'); }
        }
      } else {
        for (const p of enemyShots) if (p.live && p.destructible && overlap(r, p.hitRect())) { this.fx.sparks(p.x, p.y, 0xffffff, 4, 80); this.expire(p, 'hit'); }
      }
    }

    // zones
    this.zones = this.zones.filter((z) => {
      if (z.until <= now) { z.visual?.destroy(); return false; }
      return true;
    });
    for (const z of this.zones) {
      const r = z.rect();
      if (z.team === 'player') {
        for (const t of this.targets) {
          if (!t.alive) continue;
          const last = z.last.get(t) ?? -1e9;
          if (now - last < z.tickMs) continue;
          const rects = t.hurtRects();
          for (let i = 0; i < rects.length; i++) {
            if (!overlap(r, rects[i])) continue;
            if (this.dealToTarget(t, i, { damage: z.damage, team: 'player', kind: z.kind, x: rects[i].x + rects[i].w / 2, y: rects[i].y + rects[i].h / 2, dir: z.dir ?? 0 })) {
              z.last.set(t, now);
              this.fx.sparks(rects[i].x + rects[i].w / 2, rects[i].y + 4, 0x9fe06a, 2, 50);
            }
            break;
          }
        }
      } else if (player && player.alive && pRect && overlap(r, pRect)) {
        if (z.effect) player.applyZone(z.effect, 120, z.effectData);
        if (z.damage > 0) {
          const last = z.last.get(player) ?? -1e9;
          if (now - last >= z.tickMs) {
            z.last.set(player, now);
            player.hurt({ damage: z.damage, team: 'enemy', kind: z.kind, x: r.x + r.w / 2, y: r.y + r.h / 2, dir: Math.sign(player.x - (r.x + r.w / 2)) || 1 });
          }
        }
      }
    }

    // contact damage from enemies / bosses
    if (player && player.alive && pRect) {
      for (const t of this.targets) {
        if (!t.alive || !t.contactRects || !t.contactDamage) continue;
        for (const r of t.contactRects()) {
          if (overlap(r, pRect)) {
            player.hurt({ damage: t.contactDamage, team: 'enemy', kind: 'contact', x: r.x + r.w / 2, y: r.y + r.h / 2, dir: Math.sign(player.x - (r.x + r.w / 2)) || 1 });
            break;
          }
        }
      }
    }
  }

  debugDraw(g: Phaser.GameObjects.Graphics) {
    g.lineStyle(1, 0xff3a3a, 1);
    for (const t of this.targets) if (t.alive) for (const r of t.hurtRects()) g.strokeRect(r.x, r.y, r.w, r.h);
    g.lineStyle(1, 0xff00ff, 1);
    for (const t of this.targets) if (t.alive && t.contactRects) for (const r of t.contactRects()) g.strokeRect(r.x, r.y, r.w, r.h);
    for (const p of this.live()) {
      g.lineStyle(1, p.team === 'player' ? 0x3aff6a : 0xffa03a, 1);
      const r = p.hitRect();
      g.strokeRect(r.x, r.y, r.w, r.h);
    }
    g.lineStyle(1, 0x3ad0ff, 1);
    for (const s of this.swings) { const r = s.rect(); g.strokeRect(r.x, r.y, r.w, r.h); }
    for (const z of this.zones) { g.lineStyle(1, z.team === 'player' ? 0x9fe06a : 0xffe14a, 1); const r = z.rect(); g.strokeRect(r.x, r.y, r.w, r.h); }
  }

  destroy() {
    this.targets.clear();
    this.swings = [];
    for (const z of this.zones) z.visual?.destroy();
    this.zones = [];
    this.player = null;
  }
}
