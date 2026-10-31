import Phaser from "phaser";
import type { RoomDef } from "../../../data/dungeons";
import { ENEMIES } from "../../../data/enemies";
import { synth } from "../../audio/Synth";

/**
 * Platforming extras for side-scrolling rooms: pits in the floor, moving platforms, crushers, steam vents,
 * conveyor belts, run-and-gun enemy triggers, and the Nu Warehouse trip.
 * Lives alongside a DungeonScene; everything it needs from the scene is passed in.
 */
export interface SideHost extends Phaser.Scene {
  player: any;
  groundY: number;
  enemies: any[];
  now(): number;
  damagePlayer(amount: number, from?: { x: number; y: number }, opts?: { unblockable?: boolean; label?: string }): void;
  damageEnemy(e: any, amount: number, opts?: any): void;
  spawnEnemy(type: string, x: number, y: number, opts?: { noDrops?: boolean; minion?: boolean }): any;
  floatText(x: number, y: number, text: string, color?: string, size?: number): void;
  toast(title: string, text: string): void;
}

type Mover = { rect: Phaser.GameObjects.Rectangle; deco: Phaser.GameObjects.GameObject[]; bx: number; by: number; dx: number; dy: number; period: number; lastX: number; lastY: number };
type Crusher = { x: number; w: number; period: number; offset: number; block: Phaser.GameObjects.Container; shadow: Phaser.GameObjects.Ellipse; state: string; hitAt: number };
type Vent = { x: number; period: number; offset: number; puff: Phaser.GameObjects.Rectangle; nextTick: number };
type Belt = { x0: number; x1: number; dir: number; strip: Phaser.GameObjects.TileSprite };

export class SideLevel {
  floor: Phaser.Physics.Arcade.StaticGroup | null = null;
  private gaps: [number, number][] = [];
  private movers: Mover[] = [];
  private crushers: Crusher[] = [];
  private vents: Vent[] = [];
  private belts: Belt[] = [];
  private triggers: { x: number; wave: [string, number][]; fired: boolean }[] = [];
  private lastSafeX = 90;
  private pendingSpawns = 0;
  private pitCd = 0;
  private trip: { reef?: Phaser.GameObjects.TileSprite; fx?: any; t: number } | null = null;

  constructor(private sc: SideHost, private room: RoomDef) {}

  get hasGaps() {
    return !!this.room.floorGaps?.length;
  }

  get hasTriggers() {
    return !!this.room.triggers?.length;
  }

  /** Draw and set everything up. Platforms (one-way) are the scene's group so moving ones share its colliders. */
  build(platforms: Phaser.Physics.Arcade.StaticGroup) {
    const r = this.room;
    const sc = this.sc;
    const gy = sc.groundY;
    const tile = `tile_${r.theme}`;
    // the floor, with holes in it
    if (this.hasGaps) {
      this.gaps = (r.floorGaps ?? []).map(([fx, w]) => [r.w * fx, r.w * fx + w]);
      this.floor = sc.physics.add.staticGroup();
      let x = 0;
      const segs: [number, number][] = [];
      for (const [a, b] of [...this.gaps].sort((p, q) => p[0] - q[0])) {
        if (a > x) segs.push([x, a]);
        x = b;
      }
      if (x < r.w) segs.push([x, r.w]);
      for (const [a, b] of segs) {
        sc.add.tileSprite(a, gy, b - a, r.h - gy, tile).setOrigin(0).setDepth(2).setTint(0x8a8a9a);
        sc.add.rectangle(a, gy, b - a, 4, 0x000000, 0.6).setOrigin(0).setDepth(3);
        const f = sc.add.rectangle((a + b) / 2, gy + (r.h - gy) / 2, b - a, r.h - gy, 0, 0);
        this.floor.add(f);
      }
      // what's in the holes
      const col = r.pitColor ?? 0x5b3416;
      for (const [a, b] of this.gaps) {
        const pit = sc.add.rectangle(a, gy + 18, b - a, r.h - gy, col).setOrigin(0).setDepth(1);
        const sheen = sc.add.rectangle(a, gy + 18, b - a, 6, 0xffffff, 0.25).setOrigin(0).setDepth(1);
        sc.tweens.add({ targets: [pit, sheen], y: "+=6", yoyo: true, repeat: -1, duration: 700, ease: "Sine.inOut" });
        if (r.pitName) sc.add.text((a + b) / 2, gy + 40, r.pitName, { fontFamily: "sans-serif", fontSize: "11px", color: "#ffffff", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(2).setAlpha(0.85);
      }
    }
    // moving platforms
    for (const [fx, h, w, dx, dy, period] of r.movers ?? []) {
      const x = r.w * fx;
      const y = gy - h;
      const rect = sc.add.rectangle(x, y, w, 14, 0, 0);
      platforms.add(rect);
      const top = sc.add.tileSprite(x, y, w, 14, tile).setDepth(4).setTint(0xffd6a5);
      const edge = sc.add.rectangle(x, y - 7, w, 3, 0x22d3ee, 0.9).setDepth(5);
      const under = sc.add.rectangle(x, y + 9, w * 0.6, 4, 0x000000, 0.5).setDepth(5);
      this.movers.push({ rect, deco: [top, edge, under], bx: x, by: y, dx, dy, period, lastX: x, lastY: y });
    }
    // hazards
    for (const hz of r.hazards ?? []) {
      const x = r.w * hz.x;
      if (hz.kind === "crusher") {
        const w = hz.w ?? 120;
        const block = sc.add.container(x, 70).setDepth(8);
        block.add(sc.add.rectangle(0, -200, 16, 400, 0x52525b));
        block.add(sc.add.rectangle(0, 0, w, 60, 0x9f1239).setStrokeStyle(4, 0x111827));
        const stripes = sc.add.graphics();
        for (let i = -w / 2; i < w / 2; i += 20) stripes.fillStyle(i % 40 ? 0xfacc15 : 0x111827, 1).fillRect(i, 22, 10, 8);
        block.add(stripes);
        block.add(sc.add.text(0, -6, r.crusherLabel ?? "PRESS", { fontFamily: "Impact, sans-serif", fontSize: "14px", color: "#fff" }).setOrigin(0.5));
        const shadow = sc.add.ellipse(x, gy - 2, w, 12, 0x000000, 0).setDepth(3);
        this.crushers.push({ x, w, period: hz.period ?? 2600, offset: hz.offset ?? Math.random() * 2000, block, shadow, state: "up", hitAt: 0 });
      } else if (hz.kind === "steam") {
        const puff = sc.add.rectangle(x, gy, 54, 280, 0xe5e7eb, 0).setOrigin(0.5, 1).setDepth(7);
        sc.add.rectangle(x, gy - 4, 70, 10, 0x374151).setDepth(6).setStrokeStyle(2, 0x111827);
        this.vents.push({ x, period: hz.period ?? 3000, offset: hz.offset ?? Math.random() * 2000, puff, nextTick: 0 });
      } else if (hz.kind === "conveyor") {
        const w = hz.w ?? 300;
        const strip = sc.add.tileSprite(x, gy - 6, w, 12, "tile_industrial").setOrigin(0, 0.5).setDepth(4).setTint(0x9ca3af);
        sc.add.text(x + w / 2, gy - 22, (hz.dir ?? 1) > 0 ? "▶ ▶ ▶" : "◀ ◀ ◀", { fontFamily: "sans-serif", fontSize: "12px", color: "#facc15" }).setOrigin(0.5).setDepth(5).setAlpha(0.8);
        this.belts.push({ x0: x, x1: x + w, dir: hz.dir ?? 1, strip });
      }
    }
    this.triggers = (r.triggers ?? []).map(([fx, wave]) => ({ x: r.w * fx, wave, fired: false }));
    if (r.trip) this.startTrip();
  }

  /** Floor colliders (solid, not one-way). */
  attach(player: Phaser.GameObjects.GameObject, enemyGroup: Phaser.Physics.Arcade.Group) {
    if (!this.floor) return;
    this.sc.physics.add.collider(player, this.floor);
    this.sc.physics.add.collider(enemyGroup, this.floor);
  }

  /** Run-and-gun rooms: done when every trigger has fired and nothing's left alive. */
  triggersDone() {
    return this.hasTriggers && this.pendingSpawns === 0 && this.triggers.every((t) => t.fired) && this.sc.enemies.every((e) => e.dead);
  }

  private inGap(x: number, pad = 0) {
    return this.gaps.some(([a, b]) => x > a - pad && x < b + pad);
  }

  update(dt: number, busy: boolean) {
    const sc = this.sc;
    const now = sc.now();
    const p = sc.player;
    const pb = p.spr.body as Phaser.Physics.Arcade.Body;
    const gy = sc.groundY;
    const grounded = pb.blocked.down || pb.touching.down;
    // moving platforms, and anyone standing on them
    for (const m of this.movers) {
      const k = Math.sin((now / m.period) * Math.PI * 2);
      const nx = m.bx + m.dx * k;
      const ny = m.by + m.dy * k;
      const ddx = nx - m.lastX;
      const ddy = ny - m.lastY;
      m.rect.setPosition(nx, ny);
      (m.rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      (m.deco as any[]).forEach((d, i) => d.setPosition(nx, ny + (i === 1 ? -7 : i === 2 ? 9 : 0)));
      const onIt = grounded && Math.abs(pb.bottom - (ny - 7)) < 8 && p.x > nx - m.rect.width / 2 - 6 && p.x < nx + m.rect.width / 2 + 6;
      if (onIt) {
        p.spr.x += ddx;
        p.spr.y += ddy;
      }
      m.lastX = nx;
      m.lastY = ny;
    }
    if (busy) return;
    // crushers: rise, wait, warn, SLAM
    for (const c of this.crushers) {
      const t = (now + c.offset) % c.period;
      const warnAt = c.period - 900;
      const slamAt = c.period - 250;
      const downY = gy - 30;
      let y: number;
      if (t < 500) y = downY;
      else if (t < 1400) y = Phaser.Math.Linear(downY, 70, (t - 500) / 900);
      else if (t < slamAt) y = 70;
      else y = Phaser.Math.Linear(70, downY, (t - slamAt) / 250);
      c.block.setY(y);
      c.shadow.setFillStyle(0x000000, t >= warnAt ? 0.5 : 0);
      if (t >= warnAt && t < slamAt) c.block.setX(c.x + Math.sin(now / 30) * 2);
      else c.block.setX(c.x);
      const slamming = t >= slamAt || t < 120;
      if (slamming && now > c.hitAt && Math.abs(p.x - c.x) < c.w / 2 + 6 && p.y > y - 10) {
        c.hitAt = now + 900;
        sc.damagePlayer(20, { x: c.x, y: gy }, { unblockable: true, label: "-20 (SQUASHED)" });
        pb.setVelocityX((p.x < c.x ? -1 : 1) * 400);
        sc.cameras.main.shake(150, 0.012);
      }
      if (t < 30) synth.play("hit");
    }
    // steam vents: puff, then BLAST
    for (const v of this.vents) {
      const t = (now + v.offset) % v.period;
      const blastAt = v.period - 1100;
      const warnAt = blastAt - 700;
      if (t >= blastAt) {
        v.puff.setFillStyle(0xf1f5f9, 0.75).setScale(1, 1);
        if (Math.abs(p.x - v.x) < 30 && p.y > gy - 280 && now > v.nextTick) {
          v.nextTick = now + 380;
          sc.damagePlayer(9, { x: v.x, y: gy }, { unblockable: true, label: "-9 (STEAM)" });
        }
      } else if (t >= warnAt) v.puff.setFillStyle(0xf1f5f9, 0.25).setScale(0.6, 0.2);
      else v.puff.setFillStyle(0xffffff, 0);
    }
    // conveyor belts push you (and everything else) along
    for (const b of this.belts) {
      b.strip.tilePositionX -= b.dir * dt * 0.12;
      if (grounded && p.x > b.x0 && p.x < b.x1 && Math.abs(pb.bottom - gy) < 6) p.spr.x += b.dir * dt * 0.14;
      for (const e of sc.enemies) if (!e.dead && e.walker && e.x > b.x0 && e.x < b.x1) e.x += b.dir * dt * 0.1;
    }
    // pits: fall in and you're dragged back out, slightly worse off
    if (this.hasGaps) {
      if (grounded && !this.inGap(p.x, 50)) this.lastSafeX = p.x;
      if (p.y > gy + 70 && now > this.pitCd) {
        this.pitCd = now + 600;
        sc.damagePlayer(15, undefined, { unblockable: true, label: `-15 (${this.room.pitName ?? "PIT"})` });
        p.spr.setPosition(this.lastSafeX, gy - 70);
        pb.setVelocity(0, 0);
        p.iframesUntil = now + 1200;
        synth.play("splash");
      }
      for (const e of sc.enemies) if (!e.dead && !e.isBoss && e.y > gy + 90) sc.damageEnemy(e, 99999, { noWonk: true, label: "" });
    }
    // run and gun: push forward, more turn up
    for (const tr of this.triggers) {
      if (tr.fired || p.x < tr.x) continue;
      tr.fired = true;
      for (const [type, n0] of tr.wave) {
        const n = Math.max(1, Math.round(n0 * 0.8));
        for (let i = 0; i < n; i++) {
          const flyer = ENEMIES[type] && (ENEMIES[type].behavior === "orbiter" || ENEMIES[type].behavior === "blinker" || ["bubble", "ghost", "drone", "page"].includes(ENEMIES[type].shape));
          const ahead = Math.random() < 0.8;
          let x = Phaser.Math.Clamp(p.x + (ahead ? 1 : -1) * Phaser.Math.Between(320, 640), 60, this.room.w - 60);
          if (this.inGap(x, 30)) x = Phaser.Math.Clamp(x + 160, 60, this.room.w - 60);
          const y = flyer ? Phaser.Math.Between(120, gy - 200) : gy - 60;
          this.pendingSpawns++;
          this.sc.time.delayedCall(i * 140, () => {
            this.pendingSpawns--;
            this.sc.spawnEnemy(type, x + (i % 3) * 30, y);
          });
        }
      }
    }
    if (this.trip) this.updateTrip(dt);
  }

  // ---------------------------------------------------------------- the magic pill

  private startTrip() {
    const sc = this.sc;
    const cam = sc.cameras.main;
    const trip: { reef?: Phaser.GameObjects.TileSprite; fx?: any; t: number } = { t: 0 };
    if (sc.textures.exists("nu_reef")) {
      const src = sc.textures.get("nu_reef").getSourceImage();
      trip.reef = sc.add.tileSprite(0, 0, 960, 540, "nu_reef").setOrigin(0).setScrollFactor(0).setDepth(-9).setAlpha(0);
      trip.reef.setTileScale(540 / src.height);
    }
    // colour shift on the whole picture (WebGL only)
    trip.fx = (cam as any).postFX?.addColorMatrix?.() ?? null;
    // sea creatures drifting through the rave
    const critters = ["🐠", "🐟", "🐡", "🪼", "🐙", "🦑", "🐢", "🐬", "🦀", "🐚", "🌈", "✨"];
    sc.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        const left = Math.random() < 0.5;
        const t = sc.add.text(left ? -40 : 1000, 60 + Math.random() * 360, critters[Math.floor(Math.random() * critters.length)], { fontSize: `${22 + Math.floor(Math.random() * 30)}px` }).setScrollFactor(0).setDepth(900).setAlpha(0.85);
        if (!left) t.setFlipX(true);
        sc.tweens.add({ targets: t, x: left ? 1000 : -40, y: t.y + (Math.random() - 0.5) * 160, duration: 5000 + Math.random() * 4000, onComplete: () => t.destroy() });
        sc.tweens.add({ targets: t, angle: { from: -12, to: 12 }, yoyo: true, repeat: -1, duration: 600 });
      },
    });
    // bubbles, slowly rising
    sc.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        const b = sc.add.circle(Math.random() * 960, 560, 3 + Math.random() * 7, 0xffffff, 0).setStrokeStyle(1.5, 0xbae6fd, 0.8).setScrollFactor(0).setDepth(890);
        sc.tweens.add({ targets: b, y: -20, x: b.x + (Math.random() - 0.5) * 80, duration: 4000 + Math.random() * 2000, onComplete: () => b.destroy() });
      },
    });
    // slow sweeping lasers (gentle: no strobing)
    for (let i = 0; i < 4; i++) {
      const beam = sc.add.rectangle(200 + i * 190, -20, 6, 900, [0x22d3ee, 0xe879f9, 0xa3e635, 0xfacc15][i], 0.35).setOrigin(0.5, 0).setScrollFactor(0).setDepth(880).setBlendMode(Phaser.BlendModes.ADD);
      sc.tweens.add({ targets: beam, angle: { from: -35, to: 35 }, yoyo: true, repeat: -1, duration: 2600 + i * 500, ease: "Sine.inOut" });
    }
    this.trip = trip;
  }

  private updateTrip(dt: number) {
    const tr = this.trip!;
    tr.t += dt;
    const cam = this.sc.cameras.main;
    // the room breathes
    cam.setRotation(Math.sin(tr.t / 1900) * 0.025);
    cam.setZoom(1.08 + Math.sin(tr.t / 470) * 0.015);
    // the reef fades in and out of the warehouse
    if (tr.reef) {
      tr.reef.setAlpha(0.25 + 0.35 * (0.5 + 0.5 * Math.sin(tr.t / 2600)));
      tr.reef.tilePositionX = cam.scrollX * 0.2;
      tr.reef.tilePositionY = Math.sin(tr.t / 1500) * 6;
    }
    if (tr.fx) {
      tr.fx.reset();
      tr.fx.hue((tr.t / 25) % 360);
      tr.fx.saturate(0.35);
    }
  }

  destroy() {
    const cam = this.sc.cameras.main;
    if (this.trip) {
      cam.setRotation(0);
      cam.setZoom(1);
      (cam as any).postFX?.clear?.();
    }
  }
}
