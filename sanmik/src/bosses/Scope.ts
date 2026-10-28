import Phaser from 'phaser';

/**
 * Owns everything a boss phase creates: timers, tweens, game objects, cleanup
 * callbacks. dispose() kills all of it, so no attack from an old phase can keep
 * running after a transition, a death or a restart.
 *
 * Attacks are written as async functions using `await s.wait(ms)`. Once the
 * scope is disposed, pending waits never resolve, so the attack simply stops.
 */
export class Scope {
  alive = true;
  private timers: Phaser.Time.TimerEvent[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];
  private cleanups: (() => void)[] = [];
  static live = 0;

  constructor(public scene: Phaser.Scene, public name = '') {
    Scope.live++;
  }

  delay(ms: number, fn: () => void) {
    if (!this.alive) return null;
    const t = this.scene.time.delayedCall(ms, () => { if (this.alive) fn(); });
    this.timers.push(t);
    return t;
  }

  every(ms: number, fn: (i: number) => void, count = -1) {
    if (!this.alive) return null;
    let i = 0;
    const t = this.scene.time.addEvent({ delay: ms, loop: count < 0, repeat: count < 0 ? undefined : count - 1, callback: () => { if (this.alive) fn(i++); } });
    this.timers.push(t);
    return t;
  }

  wait(ms: number): Promise<void> {
    return new Promise((res) => { this.delay(ms, res); });
  }

  tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    if (!this.alive) return null;
    const t = this.scene.tweens.add(cfg);
    this.tweens.push(t);
    return t;
  }

  tweenAsync(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((res) => {
      const prev = cfg.onComplete;
      this.tween({ ...cfg, onComplete: (...a: unknown[]) => { (prev as ((...x: unknown[]) => void) | undefined)?.(...a); if (this.alive) res(); } });
    });
  }

  own<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.objects.push(obj);
    return obj;
  }

  onDispose(fn: () => void) {
    this.cleanups.push(fn);
  }

  get timerCount() {
    return this.timers.filter((t) => !t.hasDispatched || t.loop).length;
  }

  dispose() {
    if (!this.alive) return;
    this.alive = false;
    Scope.live--;
    for (const t of this.timers) t.remove(false);
    for (const t of this.tweens) { try { if (!t.isDestroyed()) t.stop(); } catch { /* already gone */ } }
    for (const o of this.objects) if (o.active || o.scene) o.destroy();
    for (const f of this.cleanups) f();
    this.timers = [];
    this.tweens = [];
    this.objects = [];
    this.cleanups = [];
  }
}
