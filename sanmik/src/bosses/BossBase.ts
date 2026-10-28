import Phaser from 'phaser';
import { Scope } from './Scope';
import type { GameHost } from '../core/host';
import type { Hit, Rect, Target } from '../combat/types';
import type { ProjSpec } from '../combat/Projectile';
import { SANCHZ, SCORE } from '../config/tuning';
import { bubble } from '../ui/Dialogue';
import { session } from '../core/session';

export type Attack = (s: Scope) => Promise<void>;

/**
 * Shared boss machinery: HP, one-way phases with a disposable Scope each,
 * attack loop, telegraph helpers and the defeat hand-off.
 * Subclasses implement hurtRects/contactRects and runPhase.
 */
export abstract class BossBase implements Target {
  alive = true;
  isBoss = true;
  hp: number;
  maxHp: number;
  phase = -1;
  invuln = true;
  defeated = false;
  contactDamage = 1;
  phaseEntries: number[];
  scope: Scope | null = null;
  attackName = '-';
  stickyUntil = 0;
  protected seed = 4242;
  protected lastAttack = -1;
  onDefeated: () => void = () => {};

  constructor(public host: GameHost, hp: number, public thresholds: number[]) {
    this.hp = hp;
    this.maxHp = hp;
    this.phaseEntries = new Array(thresholds.length + 1).fill(0);
  }

  abstract hurtRects(): Rect[];
  abstract contactRects(): Rect[];
  protected abstract runPhase(s: Scope, n: number): Promise<void>;
  /** World position bubbles appear above. */
  abstract speechPos(): { x: number; y: number };
  /** Called on every landed hit (flash, face change, per-part damage). Return damage actually applied. */
  protected onHit(hit: Hit, part: number, dmg: number): number { void hit; void part; return dmg; }
  abstract destroy(): void;

  get player() {
    return this.host.combat.player!;
  }

  takeHit(hit: Hit, part: number): boolean {
    if (this.defeated || this.invuln) return false;
    const now = this.host.now;
    let dmg = hit.damage;
    if (now < this.stickyUntil) dmg *= SANCHZ.sticky.bossBonus;
    if (hit.sticky) this.stickyUntil = now + SANCHZ.sticky.durationMs;
    dmg = this.onHit(hit, part, dmg);
    if (dmg <= 0) return true;
    this.hp -= dmg;
    this.checkPhase();
    return true;
  }

  damage(n: number) {
    if (this.defeated) return;
    this.hp -= n;
    this.checkPhase();
  }

  checkPhase() {
    if (this.hp <= 0) { this.defeat(); return; }
    const f = this.hp / this.maxHp;
    const next = this.phase + 1;
    if (this.phase >= 0 && next < this.phaseEntries.length && f <= this.thresholds[this.phase]) this.enterPhase(next);
  }

  start() {
    this.enterPhase(0);
  }

  enterPhase(n: number) {
    if (n <= this.phase || this.defeated) return; // phases only go forward
    this.phase = n;
    this.phaseEntries[n]++;
    this.scope?.dispose();
    const s = new Scope(this.host, `boss-p${n}`);
    this.scope = s;
    this.host.combat.clearEnemy(true);
    s.onDispose(() => this.host.cameras?.main?.setRotation(0));
    if (n > 0) session.score += SCORE.bossPhase;
    this.invuln = true;
    void this.runPhase(s, n);
  }

  protected async loop(s: Scope, attacks: Attack[], recover: number) {
    while (s.alive) {
      let i = Math.floor(this.rand() * attacks.length);
      if (i === this.lastAttack && attacks.length > 1) i = (i + 1) % attacks.length;
      this.lastAttack = i;
      const atk = attacks[i];
      this.attackName = atk.name;
      await atk.call(this, s);
      if (!s.alive) return;
      this.attackName = 'recover';
      await s.wait(recover);
    }
  }

  defeat() {
    if (this.defeated) return;
    this.defeated = true;
    this.alive = false;
    this.hp = 0;
    this.scope?.dispose();
    this.scope = null;
    this.host.combat.clearEnemy(false);
    this.host.cameras.main.setRotation(0);
    session.score += SCORE.bossKill;
    this.onDefeated();
  }

  // ---------------- helpers ----------------

  rand() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  say(text: string, ms = 1500) {
    return bubble(this.host, () => { const p = this.speechPos(); return { x: Phaser.Math.Clamp(p.x, 90, 550), y: Math.max(40, p.y) }; }, text, ms);
  }

  shot(s: Scope, spec: Omit<ProjSpec, 'team' | 'phaseScoped'>) {
    if (!s.alive) return null;
    return this.host.combat.spawn({ ...spec, team: 'enemy', phaseScoped: true });
  }

  hazard(s: Scope, rect: Rect, ms: number, damage = 1) {
    if (!s.alive) return;
    this.host.combat.addZone({ team: 'enemy', rect: () => rect, until: this.host.now + ms, damage, tickMs: 1000, kind: 'hazard', phaseScoped: true });
  }

  warnShadow(s: Scope, x: number, floor: number, w: number, ms: number) {
    const sh = s.own(this.host.add.image(x, floor, 'fx_shadow').setDepth(36).setAlpha(0.1).setScale((w / 48) * 0.4, 1));
    s.tween({ targets: sh, alpha: 0.55, scaleX: w / 48, duration: ms });
    s.delay(ms + 60, () => sh.destroy());
  }

  warnBand(s: Scope, x: number, y: number, w: number, h: number, ms: number, color = 0xff3a3a) {
    const r = s.own(this.host.add.rectangle(x, y, w, h, color, 0.18).setOrigin(0).setDepth(35));
    s.tween({ targets: r, alpha: { from: 0.2, to: 0.6 }, yoyo: true, repeat: -1, duration: 120 });
    s.delay(ms, () => r.destroy());
  }

  warnIcon(s: Scope, x: number, y: number, ms: number) {
    const i = s.own(this.host.add.image(x, y, 'fx_warn').setDepth(70));
    s.tween({ targets: i, scale: { from: 0.8, to: 1.2 }, yoyo: true, repeat: -1, duration: 100 });
    s.delay(ms, () => i.destroy());
  }

  get debugInfo() {
    return { phase: this.phase, hp: Math.round(this.hp), attack: this.attackName, invuln: this.invuln, entries: this.phaseEntries.join('/') };
  }

  update(_dt: number) {}
}
