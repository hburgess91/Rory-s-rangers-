import Phaser from "phaser";
import type { Line } from "../../../data/types";
import { G } from "../../G";
import { synth } from "../../audio/Synth";
import { FONT } from "../../ui/theme";
import { hasVfx, vfx } from "../../gfx/Vfx";
import { animateWalker, tallOf } from "../../gfx/HD";
import { CHARACTERS, LADS } from "../../../data/characters";
import { ConceptBoss } from "../../combat/ConceptBoss";
import type { Enemy } from "../../combat/Enemy";
import type { Player } from "../../combat/Player";
import type { ShotOpts } from "../../combat/types";
import { maxHp } from "../../systems/stats";
import { switchTo } from "../../Flow";
import { say } from "../../../content/dsl";
import * as FB from "../../../content/finaleKrelford";
import { bottleKey, finaleReady, logsKey, syringeKey } from "./finaleArt";

/**
 * THE CONCEPT OF PAEDOPHILIA, the fight (DungeonScene, dungeon "krelford_finale"). A big top-down arena that is
 * ruined Krelford itself (the Hub map, shrunk a little: the wreck of Da Drongus Dungeon at the top, scorched ground,
 * rubble where the buildings were, fires). The lads fight alongside you. The stages:
 *   1 IMMORTAL  it fully heals every time you knock a chunk off. Three times. Then: the bottle.
 *   2 FETCH     go and get the golden pussy juice testosterone (where Drongus threw it). Goku is there.
 *   3 INJECT    jab each of the lads (E), dodging it all the while. Then: the transformation (cutscene).
 *   4 REAL      super saiyan: real damage, while Goku's SPIRIT CUM grows. Nearly dead: it FULLY heals. NOOOOO.
 *               Then the SPIRIT CUM (cutscene, then the Ending).
 * Checkpoint (G.s.flags.finale_cp): die after the bottle and you come back at the bottle; after the change, super saiyan.
 */

/** Hub (Krelford) map size; the arena is the same town at ARENA_K scale. */
const HUB_W = 2560;
const HUB_H = 1792;
const K = 0.9375;

/** Where the buildings were (Hub coordinates): now heaps. */
const RUINS: [number, number, number][] = [
  [1280, 420, 420],
  [1900, 420, 300],
  [660, 420, 280],
  [560, 820, 300],
  [520, 1250, 260],
  [1280, 1300, 420],
  [2000, 1270, 340],
  [840, 1260, 260],
  [2350, 600, 240],
  [2350, 1300, 220],
  [1000, 1660, 220],
  [1700, 1670, 240],
  [300, 250, 224],
  [1660, 1255, 288],
];

interface Host {
  sc: Phaser.Scene;
  player: Player;
  enemies: Enemy[];
  enemyGroup: Phaser.Physics.Arcade.Group;
  boss: unknown;
  busy: boolean;
  paused: boolean;
  room: { w: number; h: number };
  bounds: Phaser.Geom.Rectangle;
  interactables: { x: number; y: number; r: number; label: string; enabled?: () => boolean; use: () => void }[];
  door: Phaser.GameObjects.Image;
  doorZone: Phaser.Geom.Rectangle;
  cameras: Phaser.Cameras.Scene2D.CameraManager;
  time: Phaser.Time.Clock;
  tweens: Phaser.Tweens.TweenManager;
  add: Phaser.GameObjects.GameObjectFactory;
  events: Phaser.Events.EventEmitter;
  scene: Phaser.Scenes.ScenePlugin;
  textures: Phaser.Textures.TextureManager;
  now(): number;
  talk(lines: Line[]): Promise<void>;
  toast(title: string, text: string): void;
  floatText(x: number, y: number, text: string, color?: string, size?: number): void;
  shoot(x: number, y: number, o: ShotOpts): Phaser.Physics.Arcade.Sprite;
  dropPickup(x: number, y: number, kind: string, value: number): void;
  damageEnemy(e: Enemy, amount: number, opts?: object): void;
  shake(ms: number, i: number): void;
  shots: { o: ShotOpts }[];
  killShot(sh: { o: ShotOpts }): void;
  transitioning: boolean;
}

type Stage = "immortal" | "fetch" | "inject" | "real" | "end";

interface Lad {
  id: string;
  spr: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  ang: number;
  r: number;
  drift: number;
  nextShot: number;
  injected: boolean;
  ssj: boolean;
  aura?: Phaser.GameObjects.Sprite;
  tag?: Phaser.GameObjects.Text;
  px: number;
  py: number;
}

export class KrelfordFinale {
  private h: Host;
  boss!: ConceptBoss;
  stage: Stage = "immortal";
  private heals = 0;
  lads: Lad[] = [];
  bottle: { x: number; y: number; img?: Phaser.GameObjects.Image; glow?: Phaser.GameObjects.Arc } = { x: 0, y: 0 };
  private goku?: Phaser.GameObjects.Image;
  private orb?: Phaser.GameObjects.Container;
  private arrow!: Phaser.GameObjects.Text;
  private counter?: Phaser.GameObjects.Text;
  private playerAura?: Phaser.GameObjects.Sprite;
  private nextSupply = 0;
  private gone = false;

  constructor(scene: Phaser.Scene) {
    this.h = scene as unknown as Host;
    // for the debug hooks / tests: window.__krel.scene("Dungeon").finale
    (scene as unknown as { finale?: KrelfordFinale }).finale = this;
  }

  async start() {
    const h = this.h;
    const sc = h.sc;
    finaleReady(sc);
    sc.events.once("shutdown", () => (this.gone = true));
    this.dressArena();
    // no way out but through it
    h.door.setAlpha(0);
    h.doorZone.setTo(-9999, -9999, 1, 1);
    this.arrow = h.add.text(0, 0, "➤", { fontFamily: FONT, fontSize: "26px", color: "#ffd23f" }).setOrigin(0.5).setDepth(5000).setShadow(2, 2, "#000", 0).setVisible(false);
    // the bottle landed where Drongus threw it (the Hub spot, in the arena)
    const at = this.fromHub(String(G.s.flags.finale_bottle_at ?? "2100,600"), { x: 2100, y: 600 });
    this.bottle = { x: at.x, y: at.y };
    this.logsProp();
    this.spawnLads();
    // it rises from the wreck
    const W = h.room.w;
    const boss = new ConceptBoss(h as never, W / 2, 470);
    boss.roam.setTo(W / 2 - 620, 420, 1240, 760);
    h.enemies.push(boss);
    h.enemyGroup.add(boss);
    h.boss = boss;
    this.boss = boss;
    boss.onHeal = () => void this.heal();
    boss.onLow = () => void this.finalHeal();
    sc.events.on("update", this.update, this);
    sc.events.once("shutdown", () => sc.events.off("update", this.update, this));
    const cp = G.s.flags.finale_cp;
    h.player.spr.setPosition(W / 2, 1180);
    // pulled back a bit: it's enormous
    h.cameras.main.setZoom(0.8);
    if (cp === "ssj") {
      // back in, already changed
      this.heals = 3;
      for (const l of this.lads) this.makeSsj(l, true);
      this.playerSsj();
      this.gokuAppears(true);
      synth.music("c7_spirit", true);
      this.stage = "real";
      boss.mode = "real";
      boss.started = true;
      boss.nextPattern = h.now() + 1500;
      h.toast("SUPER KRELWORLD KREW", "Real damage now. Hold out until Goku's SPIRIT CUM is ready.");
      return;
    }
    synth.music("c7_concept", true);
    if (cp === "bottle") {
      this.heals = 3;
      this.stage = "fetch";
      boss.mode = "shrug";
      this.showBottle();
      this.gokuAppears(false);
      boss.started = true;
      boss.nextPattern = h.now() + 1500;
      h.toast("OBJECTIVE", "Get the golden pussy juice testosterone. Follow the arrow.");
      return;
    }
    await h.talk(FB.FB_ARENA);
    if (this.gone) return;
    boss.mode = "immortal";
    boss.started = true;
    boss.nextPattern = h.now() + 1200;
    h.toast("THE CONCEPT OF PAEDOPHILIA", "Shoot it. Dodge everything. The lads are shooting too.");
  }

  /** "x,y" in Hub coordinates → somewhere sensible in the arena. */
  private fromHub(s: string, def: { x: number; y: number }) {
    const [a, b] = s.split(",").map(Number);
    const x = Number.isFinite(a) ? a : def.x;
    const y = Number.isFinite(b) ? b : def.y;
    const h = this.h;
    return {
      x: Phaser.Math.Clamp(x * K, 140, h.room.w - 140),
      // well clear of the wreck at the top, so it isn't sitting under the monster
      y: Phaser.Math.Clamp(y * K, 520, h.room.h - 140),
    };
  }

  // ---------------------------------------------------------------- the arena: ruined Krelford

  private dressArena() {
    const h = this.h;
    const sc = h.sc;
    const W = h.room.w;
    const H = h.room.h;
    // no factory decor along the walls: this is Krelford
    for (const o of [...sc.children.list]) {
      const key = (o as Phaser.GameObjects.Image).texture?.key ?? "";
      if (key.startsWith("dec_") || key.startsWith("wall_")) o.destroy();
    }
    (sc as unknown as { obstacles?: Phaser.Physics.Arcade.StaticGroup }).obstacles?.clear(true, true);
    const edge = h.add.graphics().setDepth(1.5);
    edge.fillStyle(0x0d0a08, 1).fillRect(0, 0, W, 30).fillRect(0, H - 30, W, 30).fillRect(0, 0, 30, H).fillRect(W - 30, 0, 30, H);
    if (sc.textures.exists("tile_grass")) h.add.tileSprite(24, 24, W - 48, H - 48, "tile_grass").setOrigin(0).setDepth(0.2).setTint(0x3b2f27);
    else h.add.rectangle(24, 24, W - 48, H - 48, 0x2a211c).setOrigin(0).setDepth(0.2);
    // the roads, as they were
    for (const [x, y, w, hh] of [
      [80, 780, HUB_W - 80, 90],
      [1235, 200, 90, 1500],
      [300, 1500, 2000, 70],
      [500, 560, 1700, 60],
      [200, 1000, 70, 700],
    ]) {
      if (sc.textures.exists("tile_road")) h.add.tileSprite(x * K, y * K, w * K, hh * K, "tile_road").setOrigin(0).setDepth(0.3).setTint(0x5a4c48);
      else h.add.rectangle(x * K, y * K, w * K, hh * K, 0x3a302c).setOrigin(0).setDepth(0.3);
    }
    const rnd = new Phaser.Math.RandomDataGenerator(["concept_arena"]);
    const g = h.add.graphics().setDepth(0.4);
    for (let i = 0; i < 160; i++) {
      const w = rnd.between(40, 180);
      g.fillStyle(rnd.frac() < 0.6 ? 0x14100d : 0x8f8a84, rnd.frac() < 0.6 ? 0.55 : 0.25).fillEllipse(rnd.between(30, W - 30), rnd.between(30, H - 30), w, w * 0.5);
    }
    // the middle of town is where it fights: nothing standing there to draw over it
    const fight = new Phaser.Geom.Rectangle(W / 2 - 800, 260, 1600, 1080);
    const prop = (key: string, x: number, y: number, s: number, flat = false) => {
      if (!sc.textures.exists(key)) return true;
      if (!flat && fight.contains(x, y)) return true;
      h.add.image(x, y, key).setOrigin(0.5, 0.85).setScale(s).setDepth(flat ? 0.5 : y);
      return true;
    };
    for (let i = 0; i < 26; i++) prop(rnd.frac() < 0.5 ? "r_scorch" : "r_crater", rnd.between(80, W - 80), rnd.between(500, H - 80), 1.5 + rnd.frac(), true);
    // rubble where every building stood (low, so you can still run over the edges of it)
    const keys = ["r_rubble", "r_ruin", "r_girders", "r_wall", "r_fireheap", "r_debris"];
    for (const [bx, by, bw] of RUINS) {
      const x0 = bx * K;
      const y0 = by * K;
      if (Math.abs(x0 - W / 2) < 260 && y0 < 520) continue;
      const n = Math.max(2, Math.round((bw * K) / 90));
      for (let i = 0; i < n; i++) {
        const x = x0 - (bw * K) / 2 + ((bw * K) * (i + 0.5)) / n + rnd.between(-12, 12);
        const y = y0 + rnd.between(-20, 20);
        prop(keys[(i + rnd.between(0, 5)) % keys.length], x, y, 1.5 + rnd.frac() * 0.6);
      }
      if (hasVfx(sc, "vfx_fire")) vfx(sc, "vfx_fire", x0 + rnd.between(-40, 40), y0, { scale: 1.4 + rnd.frac(), depth: fight.contains(x0, y0) ? 6 : y0 + 12, delay: rnd.between(0, 800) });
    }
    for (let i = 0; i < 30; i++) {
      const x = rnd.between(60, W - 60);
      const y = rnd.between(560, H - 60);
      prop(["r_carwreck", "r_debris", "r_ash", "r_lamp", "r_bench"][i % 5], x, y, 1.3 + rnd.frac() * 0.4);
    }
    // the wreck of Da Drongus Dungeon, top centre: what it climbed out of
    if (sc.textures.exists("fb_wreck")) {
      h.add.image(W / 2, 330, "fb_wreck").setOrigin(0.5, 1).setScale(2.6).setDepth(40);
      h.add.image(W / 2 - 520, 260, "fb_wreck").setOrigin(0.5, 1).setScale(1.3).setFlipX(true).setDepth(30).setTint(0x8a8090);
      h.add.image(W / 2 + 520, 270, "fb_wreck").setOrigin(0.5, 1).setScale(1.4).setDepth(30).setTint(0x8a8090);
    }
    if (hasVfx(sc, "vfx_fire")) for (let i = 0; i < 40; i++) vfx(sc, "vfx_fire", rnd.between(60, W - 60), rnd.between(120, H - 60), { scale: 0.9 + rnd.frac() * 1.2, depth: 6, delay: rnd.between(0, 900) });
    if (hasVfx(sc, "vfx_smokecol")) for (let i = 0; i < 10; i++) vfx(sc, "vfx_smokecol", rnd.between(100, W - 100), rnd.between(150, H - 100), { scale: 1.8 + rnd.frac(), depth: 900, alpha: 0.5 });
    // night, storm, firelight
    // (the arena is seen zoomed out, so the screen-fixed layers are drawn oversize)
    h.add.rectangle(480, 270, 2000, 1200, 0x0b1440, 0.32).setScrollFactor(0).setDepth(950).setBlendMode(Phaser.BlendModes.MULTIPLY);
    h.add.rectangle(480, 270, 2000, 1200, 0xff6a2a, 0.06).setScrollFactor(0).setDepth(951).setBlendMode(Phaser.BlendModes.ADD);
    if (hasVfx(sc, "vfx_rain"))
      for (let gx = 0; gx < 4; gx++)
        for (let gy = 0; gy < 4; gy++) vfx(sc, "vfx_rain", 0 + gx * 320, -40 + gy * 200, { fixed: true, scale: 2, depth: 955, alpha: 0.55, speed: 1.5, angle: 12 })?.anims.setProgress(Math.random());
    synth.weatherSound("storm");
  }

  /** The chat logs, still glowing in a puddle (you never got to pick them up). */
  private logsProp() {
    const h = this.h;
    const at = this.fromHub(String(G.s.flags.finale_logs_at ?? "900,1300"), { x: 900, y: 1300 });
    const img = h.add.image(at.x, at.y, logsKey(h.sc)).setScale(1.2).setDepth(at.y);
    const glow = h.add.circle(at.x, at.y, 30, 0x22c55e, 0.25).setDepth(at.y - 1).setBlendMode(Phaser.BlendModes.ADD);
    h.tweens.add({ targets: [glow], scale: 1.4, alpha: 0.1, yoyo: true, repeat: -1, duration: 800 });
    void img;
  }

  // ---------------------------------------------------------------- the lads

  private spawnLads() {
    const h = this.h;
    const ids = [...LADS, "MIKEY"].filter((p) => p !== G.s.player && h.textures.exists(`spr_${p}`));
    this.lads = ids.map((id, i) => {
      const ang = Math.PI * (0.12 + (0.76 * i) / Math.max(1, ids.length - 1));
      const r = 480 + (i % 2) * 90;
      const x = h.room.w / 2 + Math.cos(ang) * r * 1.3;
      const y = 470 + Math.sin(ang) * r;
      const spr = h.add.sprite(x, y, `spr_${id}`, 0).setScale((h.player.spr.scaleX / tallOf(h.player.spr)) * 0.95).setDepth(y);
      const label = h.add.text(x, y - 40, CHARACTERS[id]?.name ?? id, { fontFamily: "sans-serif", fontSize: "10px", color: "#86efac", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(900);
      return { id, spr, label, ang, r, drift: (Math.random() < 0.5 ? 1 : -1) * (0.04 + Math.random() * 0.05), nextShot: h.now() + 800 + i * 150, injected: false, ssj: false, px: x, py: y };
    });
  }

  private updateLads(now: number, dt: number) {
    const h = this.h;
    const b = this.boss;
    for (const l of this.lads) {
      // circle the monster, keeping their distance; slower while you're trying to jab them
      const slow = this.stage === "inject" && !l.injected ? 0.25 : 1;
      l.ang += l.drift * (dt / 1000) * slow;
      if (l.ang < 0.05 || l.ang > Math.PI - 0.05) l.drift *= -1;
      const tx = Phaser.Math.Clamp(b.x + Math.cos(l.ang) * l.r * 1.3, 80, h.room.w - 80);
      const ty = Phaser.Math.Clamp(b.y + Math.sin(l.ang) * l.r, 120, h.room.h - 80);
      const dx = tx - l.spr.x;
      const dy = ty - l.spr.y;
      const d = Math.hypot(dx, dy);
      const moving = d > 10;
      if (moving) {
        const sp = Math.min(d, 2.6 * (dt / 16));
        l.spr.x += (dx / d) * sp;
        l.spr.y += (dy / d) * sp;
      }
      animateWalker(l.spr, moving ? dx : 0, moving ? dy : 0, moving, now);
      l.spr.setDepth(l.spr.y);
      l.label.setPosition(l.spr.x, l.spr.y - 42);
      l.tag?.setPosition(l.spr.x, l.spr.y - 58);
      l.aura?.setPosition(l.spr.x, l.spr.y + 26).setDepth(l.spr.depth - 1);
      // shoot it
      if (now >= l.nextShot && b.mode !== "still") {
        const a = Math.atan2(b.y - l.spr.y, b.x - l.spr.x);
        const dmg = l.ssj ? 12 : 9;
        h.shoot(l.spr.x, l.spr.y - 6, { owner: "player", damage: dmg, speed: 620, angle: a + (Math.random() - 0.5) * 0.08, color: l.ssj ? 0xffe066 : CHARACTERS[l.id]?.color ?? 0x86efac, life: 1400, scale: l.ssj ? 1.4 : 1 });
        l.spr.setFlipX(Math.cos(a) < 0);
        l.nextShot = now + (l.ssj ? 380 : 620) + Math.random() * 240;
      }
    }
  }

  // ---------------------------------------------------------------- stage 1: it heals

  private async heal() {
    const h = this.h;
    const b = this.boss;
    if (this.stage !== "immortal") return;
    const n = this.heals++;
    b.mode = "still";
    await b.fullHeal(1500);
    if (this.gone) return;
    await h.talk(FB.FB_HEAL[Math.min(n, FB.FB_HEAL.length - 1)]);
    if (this.gone) return;
    if (this.heals < 3) {
      b.mode = "immortal";
      b.nextPattern = h.now() + 800;
      return;
    }
    // the bottle!
    await h.talk(FB.FB_REALISE);
    if (this.gone) return;
    this.showBottle();
    this.gokuAppears(false);
    const cam = h.cameras.main;
    h.busy = true;
    cam.stopFollow();
    cam.pan(this.bottle.x, this.bottle.y, 1200, "Sine.easeInOut");
    await this.wait(1500);
    b.lightning(this.bottle);
    await this.wait(1200);
    cam.pan(h.player.x, h.player.y, 900, "Sine.easeInOut");
    await this.wait(950);
    cam.startFollow(h.player.spr, true, 0.12, 0.12);
    h.busy = false;
    this.stage = "fetch";
    b.mode = "shrug";
    b.nextPattern = h.now() + 1000;
    G.s.flags.finale_cp = "bottle";
    G.save();
    h.toast("OBJECTIVE", "Get the golden pussy juice testosterone. Follow the arrow.");
  }

  private showBottle() {
    const h = this.h;
    if (this.bottle.img) return;
    const { x, y } = this.bottle;
    this.bottle.glow = h.add.circle(x, y, 36, 0xffd23f, 0.3).setDepth(y - 1).setBlendMode(Phaser.BlendModes.ADD);
    h.tweens.add({ targets: this.bottle.glow, scale: 1.5, alpha: 0.1, yoyo: true, repeat: -1, duration: 700 });
    this.bottle.img = h.add.image(x, y, bottleKey(h.sc)).setScale(1.3).setDepth(y);
    h.tweens.add({ targets: this.bottle.img, y: y - 8, yoyo: true, repeat: -1, duration: 600 });
  }

  /** Goku, standing by the bottle (charging, once he's met you). */
  private gokuAppears(charging: boolean) {
    const h = this.h;
    if (this.goku) return;
    const x = this.bottle.x + 70;
    const y = this.bottle.y;
    this.goku = h.add.image(x, y + 30, "spr_TV_GOKU", 0).setOrigin(0.5, 1).setScale(2).setDepth(y + 30);
    h.add.text(x, y - 46, "GOKU", { fontFamily: "sans-serif", fontSize: "10px", color: "#fdba74", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(900);
    if (charging) this.gokuCharge();
  }

  private gokuCharge() {
    const h = this.h;
    const gk = this.goku!;
    if (h.textures.exists("fb_goku_charge")) gk.setTexture("fb_goku_charge").setScale(1.1);
    const ox = gk.x;
    const oy = gk.y - gk.displayHeight - 30;
    this.orb = h.add.container(ox, oy).setDepth(2000);
    const a = h.add.circle(0, 0, 30, 0xfff4c2, 0.35).setBlendMode(Phaser.BlendModes.ADD);
    const b = h.add.circle(0, 0, 21, 0xffffff, 0.8).setBlendMode(Phaser.BlendModes.ADD);
    const c = h.add.circle(0, 0, 13, 0xffffff, 1);
    this.orb.add([a, b, c]);
    h.tweens.add({ targets: a, scale: 1.25, alpha: 0.18, yoyo: true, repeat: -1, duration: 240 });
    this.orb.setScale(0.25);
    // motes drifting in from all over town
    h.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        if (!this.orb?.active) return;
        const ang = Math.random() * Math.PI * 2;
        const m = h.add.circle(ox + Math.cos(ang) * 260, oy + Math.sin(ang) * 200, 2, 0xfff4c2, 1).setDepth(1999).setBlendMode(Phaser.BlendModes.ADD);
        h.tweens.add({ targets: m, x: ox, y: oy, duration: 600, ease: "Quad.in", onComplete: () => m.destroy() });
      },
    });
  }

  // ---------------------------------------------------------------- stage 2/3: Goku and the injections

  private async meetGoku() {
    const h = this.h;
    this.stage = "inject";
    this.bottle.img?.destroy();
    this.bottle.glow?.destroy();
    synth.play("pickup");
    await h.talk(FB.FB_GOKU);
    if (this.gone) return;
    this.gokuCharge();
    h.toast("INJECT THE LADS", FB.FB_INJECT_HINT);
    this.counter = h.add.text(480, 86, "", { fontFamily: FONT, fontSize: "16px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.updateCounter();
    for (const l of this.lads) {
      l.tag = h.add.text(l.spr.x, l.spr.y - 58, "💉", { fontFamily: FONT, fontSize: "16px" }).setOrigin(0.5).setDepth(901);
      h.tweens.add({ targets: l.tag, scale: 1.3, yoyo: true, repeat: -1, duration: 400 });
      const it = { x: l.spr.x, y: l.spr.y, r: 64, label: `Inject ${CHARACTERS[l.id]?.name ?? l.id}`, enabled: () => !l.injected && this.stage === "inject", use: () => this.inject(l) };
      (l as Lad & { it?: typeof it }).it = it;
      h.interactables.push(it);
    }
  }

  private updateCounter() {
    const done = this.lads.filter((l) => l.injected).length;
    this.counter?.setText(`💉 INJECTED: ${done} / ${this.lads.length}`);
  }

  private inject(l: Lad) {
    const h = this.h;
    if (l.injected) return;
    l.injected = true;
    l.tag?.destroy();
    l.tag = undefined;
    synth.play("squelch");
    const sk = syringeKey(h.sc);
    if (sk) {
      const s = h.add.image(l.spr.x - 26, l.spr.y - 30, sk).setScale(0.7).setAngle(-35).setDepth(l.spr.depth + 2);
      h.tweens.add({ targets: s, x: l.spr.x - 8, y: l.spr.y - 14, duration: 140, yoyo: true, hold: 220, onComplete: () => s.destroy() });
    }
    l.spr.setTintFill(0xffe066);
    h.time.delayedCall(160, () => l.spr.active && l.spr.clearTint());
    h.floatText(l.spr.x, l.spr.y - 66, FB.INJECT_BARKS[l.id] ?? "OOF.", "#fde68a", 13);
    h.floatText(l.spr.x, l.spr.y - 86, "💉 INJECTED", "#ffd23f", 15);
    const glow = h.add.circle(l.spr.x, l.spr.y, 20, 0xffd23f, 0.35).setDepth(l.spr.depth - 1).setBlendMode(Phaser.BlendModes.ADD);
    h.tweens.add({ targets: glow, scale: 1.4, alpha: 0.15, yoyo: true, repeat: -1, duration: 300 });
    h.events.on("postupdate", () => glow.active && glow.setPosition(l.spr.x, l.spr.y));
    (l as Lad & { glow?: Phaser.GameObjects.Arc }).glow = glow;
    this.updateCounter();
    if (this.lads.every((x) => x.injected)) void this.transform();
  }

  private async transform() {
    const h = this.h;
    const sc = h.sc;
    this.stage = "end";
    this.boss.mode = "still";
    this.counter?.destroy();
    await h.talk(FB.FB_ALL_INJECTED.slice(0, 1));
    if (this.gone) return;
    // clear the floor
    for (const e of [...h.enemies]) if (!e.dead && !e.isBoss) h.damageEnemy(e, 99999, { noWonk: true, label: "" });
    // the cutscene plays over the paused fight
    sc.scene.setVisible(false, "UI");
    sc.scene.pause();
    sc.scene.launch("Finale", {
      beat: "transform",
      overlay: true,
      done: () => {
        if (this.gone) return;
        sc.scene.resume();
        sc.scene.setVisible(true, "UI");
        void this.phase2();
      },
    });
  }

  // ---------------------------------------------------------------- stage 4: real damage

  private async phase2() {
    const h = this.h;
    const b = this.boss;
    G.s.flags.finale_cp = "ssj";
    G.save();
    for (const l of this.lads) {
      (l as Lad & { glow?: Phaser.GameObjects.Arc }).glow?.destroy();
      this.makeSsj(l, false);
    }
    this.playerSsj();
    synth.music("c7_spirit", true);
    h.cameras.main.flash(500, 255, 240, 180);
    G.s.hp = Math.max(G.s.hp, maxHp(G.s));
    await h.talk(FB.FB_PHASE2);
    if (this.gone) return;
    this.stage = "real";
    b.mode = "real";
    b.nextPattern = h.now() + 900;
    h.toast("SUPER KRELWORLD KREW", "Real damage now. Hold out until Goku's SPIRIT CUM is ready.");
  }

  private makeSsj(l: Lad, instant: boolean) {
    const h = this.h;
    l.injected = true;
    l.ssj = true;
    l.spr.setTint(0xfff0b0);
    l.label.setColor("#ffe066");
    if (h.textures.exists("fb_aura") && h.sc.anims.exists("fb_aura") && !l.aura) {
      l.aura = h.add.sprite(l.spr.x, l.spr.y + 26, "fb_aura", 0).setOrigin(0.5, 0.875).setScale(0.7, 0.85).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff27a).setAlpha(0.5);
      l.aura.play({ key: "fb_aura", startFrame: Math.floor(Math.random() * 8) });
    }
    if (!instant) h.floatText(l.spr.x, l.spr.y - 60, "AAAAAAAAA", "#ffe066", 14);
  }

  private playerSsj() {
    const h = this.h;
    const ps = h.player.spr;
    if (h.textures.exists("fb_aura") && h.sc.anims.exists("fb_aura") && !this.playerAura) {
      this.playerAura = h.add.sprite(ps.x, ps.y + 26, "fb_aura", 0).setOrigin(0.5, 0.875).setScale(0.75, 0.9).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff27a).setAlpha(0.5);
      this.playerAura.play("fb_aura");
    }
    ps.setTint(0xfff0b0);
  }

  /** It's nearly dead... and it heals. All of it. NOOOOO. Then: the SPIRIT CUM. */
  private async finalHeal() {
    const h = this.h;
    const b = this.boss;
    if (this.stage !== "real") return;
    this.stage = "end";
    b.mode = "still";
    for (const sh of [...h.shots]) if (sh.o.owner === "enemy") h.killShot(sh);
    for (const e of [...h.enemies]) if (!e.dead && !e.isBoss) h.damageEnemy(e, 99999, { noWonk: true, label: "" });
    await h.talk(FB.FB_FINAL_HEAL.slice(0, 1));
    if (this.gone) return;
    // everyone screams
    for (const [i, l] of this.lads.entries()) h.time.delayedCall(i * 90, () => h.floatText(l.spr.x, l.spr.y - 60, FB.FB_NO, "#ff6b6b", 18));
    h.floatText(h.player.x, h.player.y - 60, FB.FB_NO, "#ff6b6b", 20);
    synth.play("shriek");
    await b.fullHeal(2200);
    if (this.gone) return;
    await h.talk([...FB.FB_FINAL_HEAL.slice(1), ...this.lads.slice(0, 4).map((l) => say(l.id, FB.FB_NO)), { s: "YOU", t: FB.FB_NO, tag: "new" }]);
    if (this.gone) return;
    // ...but Goku's ready
    this.orb && h.tweens.add({ targets: this.orb, scale: 2.2, duration: 600 });
    const cam = h.cameras.main;
    h.busy = true;
    if (this.goku) {
      cam.stopFollow();
      cam.pan(this.goku.x, this.goku.y - 80, 900, "Sine.easeInOut");
      await this.wait(1100);
    }
    G.s.hp = maxHp(G.s);
    G.save();
    synth.weatherSound(null);
    cam.flash(400, 255, 255, 255);
    h.time.delayedCall(300, () => {
      h.cameras.main.fadeOut(300, 255, 255, 255);
      h.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        h.transitioning = true;
        switchTo(h.sc, "Finale", { beat: "spirit" });
      });
    });
  }

  // ---------------------------------------------------------------- every frame

  private update() {
    const h = this.h;
    if (this.gone || !h.player?.spr?.active || h.paused) return;
    const now = h.now();
    const dt = Math.min(50, h.sc.game.loop.delta);
    if (!h.busy) this.updateLads(now, dt);
    for (const l of this.lads) {
      const it = (l as Lad & { it?: { x: number; y: number } }).it;
      if (it) {
        it.x = l.spr.x;
        it.y = l.spr.y;
      }
    }
    const ps = h.player.spr;
    this.playerAura?.setPosition(ps.x, ps.y + 26).setDepth(ps.depth - 1);
    if (this.stage === "real" || G.s.flags.finale_cp === "ssj") ps.setTint(0xfff0b0);
    // the SPIRIT CUM grows as it weakens
    if (this.orb && this.stage === "real") this.orb.setScale(0.35 + 1.6 * (1 - this.boss.hp / this.boss.maxHp));
    // fetch the bottle
    if (this.stage === "fetch" && !h.busy && Phaser.Math.Distance.Between(h.player.x, h.player.y, this.bottle.x, this.bottle.y) < 70) void this.meetGoku();
    // ammo and a bit of health now and then: it's a long fight
    if (now >= this.nextSupply && !h.busy) {
      this.nextSupply = now + 22000;
      if (this.nextSupply > 25000) {
        h.dropPickup(h.player.x + (Math.random() - 0.5) * 160, h.player.y - 60, "ammo", 2);
        h.dropPickup(h.player.x + (Math.random() - 0.5) * 160, h.player.y - 90, "heal", 25);
      }
    }
    // the arrow
    let target: { x: number; y: number } | null = null;
    if (this.stage === "fetch") target = this.bottle;
    if (this.stage === "inject") {
      const left = this.lads.filter((l) => !l.injected).sort((a, b) => Phaser.Math.Distance.Between(a.spr.x, a.spr.y, ps.x, ps.y) - Phaser.Math.Distance.Between(b.spr.x, b.spr.y, ps.x, ps.y));
      if (left[0]) target = { x: left[0].spr.x, y: left[0].spr.y };
    }
    if (target && !h.busy) {
      const d = Phaser.Math.Distance.Between(ps.x, ps.y, target.x, target.y);
      if (d > 110) {
        const a = Math.atan2(target.y - ps.y, target.x - ps.x);
        this.arrow.setVisible(true).setPosition(ps.x + Math.cos(a) * 60, ps.y + Math.sin(a) * 60).setRotation(a);
      } else this.arrow.setVisible(false);
    } else this.arrow.setVisible(false);
  }

  private wait(ms: number) {
    return new Promise<void>((res) => this.h.time.delayedCall(ms, () => res()));
  }
}
