import Phaser from "phaser";
import { G } from "../G";
import { synth } from "../audio/Synth";
import { CHARACTERS } from "../../data/characters";
import { ENEMIES } from "../../data/enemies";
import { rollCrate } from "./Guns";
import type { Enemy } from "./Enemy";

/**
 * Room variety, shared by top-down and side-scrolling rooms:
 * - breakables: explosive Krezz barrels (chain reactions), ammo crates and supply crates you shoot open
 * - hostages (side-scrolling): free a tied-up lad for a gun, ammo or a Fart Overdrive
 * - elite enemies: tinted, named, tougher, with a twist (SWOLE / ZOOMIES / SPLITTER / VOLATILE)
 * - room twists (top-down combat rooms): barrels everywhere, elite night, tax dodger, lights out, survive, slurry floor
 */

type BreakKind = "barrel" | "ammo_crate" | "supply_crate" | "hostage";
interface Breakable {
  kind: BreakKind;
  obj: Phaser.GameObjects.Container;
  x: number;
  y: number;
  hp: number;
  r: number;
  dead: boolean;
  who?: string;
}

type EliteMod = "SWOLE" | "ZOOMIES" | "SPLITTER" | "VOLATILE";
const ELITE_COLOR: Record<EliteMod, number> = { SWOLE: 0xf97316, ZOOMIES: 0x22d3ee, SPLITTER: 0xa855f7, VOLATILE: 0xef4444 };
const ELITE_BLURB: Record<EliteMod, string> = { SWOLE: "huge, hits hard", ZOOMIES: "very fast", SPLITTER: "splits in two", VOLATILE: "explodes when it dies" };

export type Twist = "BARRELS" | "ELITES" | "TAX DODGER" | "LIGHTS OUT" | "SURVIVE" | "SLURRY FLOOR";
const TWIST_TEXT: Record<Twist, string> = {
  BARRELS: "Someone's left the Krezz barrels out. Shoot them near the enemies. Not near you.",
  ELITES: "Elite night. Lots of them are tougher, and named. Worth more, too.",
  "TAX DODGER": "A Krezzcoin Tax Dodger is legging it with a bag of cash. Catch him before he gets away.",
  "LIGHTS OUT": "Somebody's not paid the electric. Stay close to the light.",
  SURVIVE: "Survive 25 seconds. They don't stop coming until the clock does.",
  "SLURRY FLOOR": "The floor's covered in Krezz slurry. It slows everyone, and it stings.",
};

const HOSTAGE_LINES = [
  "Cheers mate. Here, I nicked this off a guard.",
  "They tied me up for not reacting to the song. Take this.",
  "I've been here since Tuesday. I've had nothing but a Crobley. Have this.",
  "Thank god. Here. I was saving it for an emergency. This is one.",
  "Don't tell the group chat about this. Please. Have a present.",
  "Free! FREE! Take this, I'm off to the Krezz Arms.",
];

export class Spice {
  breakables: Breakable[] = [];
  twist: Twist | null = null;
  private tags = new Map<Enemy, Phaser.GameObjects.Text>();
  private elites = new Map<Enemy, EliteMod>();
  private dark: { overlay: Phaser.GameObjects.Rectangle; hole: Phaser.GameObjects.Graphics } | null = null;
  private puddles: { x: number; y: number; r: number }[] = [];
  private puddleTick = 0;
  private survive: { until: number; nextSpawn: number; types: string[]; text: Phaser.GameObjects.Text } | null = null;
  private goblin: { e: Enemy; until: number } | null = null;

  constructor(private sc: any) {}

  private get side(): boolean {
    return !!this.sc.side;
  }

  /** Place breakables and pick a twist. Call once the room, player and side level exist. */
  setup() {
    const sc = this.sc;
    const r = sc.room;
    this.makeTextures();
    if (this.side && r.tower) {
      // supplies on the ledges all the way up: crates, health, loose ammo, and the odd barrel
      const kinds = ["ammo_crate", "heal", "supply_crate", "ammo", "heal", "barrel", "heal", "ammo_crate", "ammo", "heal"];
      let k = 0;
      ((r.platforms ?? []) as [number, number, number][]).forEach(([fx, h]: [number, number, number], i: number) => {
        if (i % 3 !== 1 || h > (r.exitAt?.[1] ?? 1e9) - 50) return;
        const x = r.w * fx + (Math.random() - 0.5) * 50;
        const y = sc.groundY - h - 7;
        const kind = kinds[k++ % kinds.length];
        if (kind === "heal") sc.dropPickup(x, y - 14, "heal", 35);
        else if (kind === "ammo") sc.dropPickup(x, y - 14, "ammo", 1.5);
        else this.add(kind as BreakKind, x, y - 15);
      });
      return;
    }
    if (this.side) {
      const run = !!r.triggers?.length;
      if (run) {
        // a barrel or crate every so often along the floor, and one hostage in the long rooms
        const kinds: BreakKind[] = ["barrel", "ammo_crate", "barrel", "supply_crate", "barrel", "ammo_crate"];
        let k = 0;
        for (let x = 520; x < r.w - 380; x += 560 + Math.random() * 260) {
          const fx = this.safeX(x);
          if (fx === null) continue;
          this.add(kinds[k++ % kinds.length], fx, sc.groundY - 22);
          if (Math.random() < 0.35) {
            const fx2 = this.safeX(x + 60);
            if (fx2 !== null) this.add("barrel", fx2, sc.groundY - 22);
          }
        }
        if (r.w >= 2400) {
          const hx = this.safeX(r.w * (0.38 + Math.random() * 0.3));
          if (hx !== null) this.add("hostage", hx, sc.groundY - 26);
        }
      } else if (r.boss) {
        this.add("ammo_crate", 160, sc.groundY - 22);
        this.add("ammo_crate", r.w - 220, sc.groundY - 22);
        this.add("barrel", r.w * 0.35, sc.groundY - 22);
        this.add("barrel", r.w * 0.65, sc.groundY - 22);
      }
      return;
    }
    // top-down
    const b = sc.bounds as Phaser.Geom.Rectangle;
    const combat = !!(sc.waves?.length) && !r.boss && !r.event && !r.exitFlag;
    // no random twists inside Luke's head: it's weird enough in there
    const noTwists = (sc as unknown as { dungeon?: { id: string } }).dungeon?.id === "arena_lukemind";
    if (combat && !noTwists && (sc.roomIdx > 0 || G.s.chapter > 1)) {
      const pool: (Twist | null)[] = [null, null, "BARRELS", "ELITES", "TAX DODGER", "SURVIVE", "SLURRY FLOOR"];
      this.twist = pool[Math.floor(Math.random() * pool.length)];
    }
    const nBarrels = this.twist === "BARRELS" ? 8 : r.boss ? 2 : combat ? 2 + Math.floor(Math.random() * 2) : 0;
    for (let i = 0; i < nBarrels; i++) {
      const p = this.randomSpot(b);
      if (p) this.add("barrel", p.x, p.y);
    }
    if (combat || r.boss) {
      const p = this.randomSpot(b);
      if (p) this.add(Math.random() < 0.65 || r.boss ? "ammo_crate" : "supply_crate", p.x, p.y);
      if (r.boss) {
        const q = this.randomSpot(b);
        if (q) this.add("ammo_crate", q.x, q.y);
      }
    }
    if (this.twist === "SLURRY FLOOR") {
      for (let i = 0; i < 5; i++) {
        const p = this.randomSpot(b, 60);
        if (!p) continue;
        const rad = 55 + Math.random() * 45;
        this.puddles.push({ x: p.x, y: p.y, r: rad });
        const g = sc.add.ellipse(p.x, p.y, rad * 2.2, rad * 1.8, 0x65a30d, 0.45).setDepth(3).setStrokeStyle(3, 0x3f6212, 0.7);
        sc.tweens.add({ targets: g, scaleX: 1.05, scaleY: 0.95, yoyo: true, repeat: -1, duration: 900 + i * 120, ease: "Sine.inOut" });
        sc.add.text(p.x, p.y, "SLURRY", { fontFamily: "sans-serif", fontSize: "11px", color: "#ecfccb", stroke: "#1a2e05", strokeThickness: 3 }).setOrigin(0.5).setDepth(3).setAlpha(0.7);
      }
    }
    if (this.twist === "LIGHTS OUT") {
      const overlay = sc.add.rectangle(0, 0, 960, 540, 0x000000, 0.86).setOrigin(0).setScrollFactor(0).setDepth(940);
      const hole = sc.make.graphics({ x: 0, y: 0 }, false);
      const mask = hole.createGeometryMask();
      mask.setInvertAlpha(true);
      overlay.setMask(mask);
      this.dark = { overlay, hole };
    }
  }

  /** At the start of the fight. Returns true if the twist runs the room itself (so skip the normal waves). */
  begin(): boolean {
    const sc = this.sc;
    if (!this.twist) return false;
    sc.toast(`ROOM TWIST: ${this.twist}`, TWIST_TEXT[this.twist]);
    synth.play("decree");
    if (this.twist === "TAX DODGER") {
      sc.time.delayedCall(1800, () => {
        const b = sc.bounds as Phaser.Geom.Rectangle;
        const e = sc.spawnEnemy("tax_goblin", b.centerX + (Math.random() - 0.5) * 200, b.top + 120, {});
        if (e) {
          this.goblin = { e, until: sc.now() + 15000 };
          this.tag(e, "TAX DODGER · catch him!", 0xfacc15);
        }
      });
    }
    if (this.twist === "SURVIVE") {
      const types = Array.from(new Set((sc.waves as [string, number][][]).flat().map(([t]) => t))).filter((t) => ENEMIES[t]);
      const text = sc.add.text(480, 64, "", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#ffd23f", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(960);
      this.survive = { until: sc.now() + 25000, nextSpawn: sc.now() + 600, types: types.length ? types : ["smolt"], text };
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- breakables

  private safeX(x: number): number | null {
    const sl = this.sc.sideLevel;
    const r = this.sc.room;
    let fx = Phaser.Math.Clamp(x, 140, r.w - 240);
    for (let i = 0; i < 6; i++) {
      if (!sl?.inGap?.(fx, 50)) return fx;
      fx += 70;
    }
    return null;
  }

  private randomSpot(b: Phaser.Geom.Rectangle, pad = 50): { x: number; y: number } | null {
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(b.left + pad + 20, b.right - pad - 20);
      const y = Phaser.Math.Between(b.top + pad + 70, b.bottom - pad - 20);
      // keep clear of the door (top middle) and where you walk in (bottom middle)
      if (Math.abs(x - b.centerX) < 110 && (y < b.top + 140 || y > b.bottom - 150)) continue;
      if (this.breakables.some((q) => Phaser.Math.Distance.Between(q.x, q.y, x, y) < 70)) continue;
      return { x, y };
    }
    return null;
  }

  private makeTextures() {
    const sc = this.sc as Phaser.Scene;
    if (!sc.textures.exists("sp_barrel")) {
      const g = sc.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x7f1d1d, 1).fillRoundedRect(2, 2, 32, 40, 6);
      g.fillStyle(0xdc2626, 1).fillRoundedRect(4, 4, 28, 36, 5);
      g.fillStyle(0x111827, 1).fillRect(2, 11, 32, 3).fillRect(2, 30, 32, 3);
      g.fillStyle(0xfacc15, 1).fillTriangle(18, 15, 10, 28, 26, 28);
      g.fillStyle(0x111827, 1).fillRect(17, 19, 2, 5).fillRect(17, 25, 2, 2);
      g.generateTexture("sp_barrel", 36, 44);
      g.clear();
      g.fillStyle(0x5b3a1a, 1).fillRect(0, 0, 40, 34);
      g.fillStyle(0x92622f, 1).fillRect(3, 3, 34, 28);
      g.lineStyle(3, 0x5b3a1a, 1).lineBetween(3, 3, 37, 31).lineBetween(37, 3, 3, 31);
      g.generateTexture("sp_crate", 40, 34);
      g.destroy();
    }
  }

  private add(kind: BreakKind, x: number, y: number) {
    const sc = this.sc;
    const c = sc.add.container(x, y).setDepth(this.side ? 9 : y);
    let r = 20;
    let hp = 1;
    if (kind === "barrel") {
      c.add(sc.add.image(0, 0, "sp_barrel"));
      c.add(sc.add.text(0, 24, "KREZZ", { fontFamily: "Impact, sans-serif", fontSize: "9px", color: "#facc15" }).setOrigin(0.5));
      hp = 12;
    } else if (kind === "ammo_crate" || kind === "supply_crate") {
      c.add(sc.add.image(0, 0, "sp_crate"));
      const ammo = kind === "ammo_crate";
      c.add(sc.add.rectangle(0, 0, 30, 12, ammo ? 0x0e7490 : 0x166534).setStrokeStyle(1, 0xffffff, 0.6));
      c.add(sc.add.text(0, 0, ammo ? "AMMO" : "SUPPLY", { fontFamily: "Impact, sans-serif", fontSize: "9px", color: "#ffffff" }).setOrigin(0.5));
      const glow = sc.add.circle(0, 4, 26, ammo ? 0x22d3ee : 0x4ade80, 0.15);
      c.addAt(glow, 0);
      sc.tweens.add({ targets: glow, alpha: 0.03, yoyo: true, repeat: -1, duration: 700 });
      hp = 20;
    } else {
      // a tied-up lad
      const pool = Object.keys(CHARACTERS).filter((id) => CHARACTERS[id].playable && id !== G.s.player && sc.textures.exists(`spr_${id}`));
      const who = pool[Math.floor(Math.random() * pool.length)] ?? "PROCTUS";
      const key = sc.textures.exists(`spr_${who}`) ? `spr_${who}` : "p_bin";
      const spr = sc.add.sprite(0, -6, key, 0).setScale(key === "p_bin" ? 1.5 : 1.6).setAngle(-8);
      c.add(spr);
      const ropes = sc.add.graphics();
      ropes.lineStyle(3, 0xd6b370, 1);
      for (const yy of [-10, 0, 10]) ropes.lineBetween(-14, yy, 14, yy + 3);
      c.add(ropes);
      const help = sc.add.text(0, -52, "HELP!", { fontFamily: "Impact, sans-serif", fontSize: "14px", color: "#ffffff", backgroundColor: "#dc2626", padding: { x: 4, y: 1 } }).setOrigin(0.5);
      c.add(help);
      sc.tweens.add({ targets: help, y: -58, yoyo: true, repeat: -1, duration: 420 });
      sc.tweens.add({ targets: spr, angle: 8, yoyo: true, repeat: -1, duration: 300 });
      r = 34;
      hp = 9999;
      this.breakables.push({ kind, obj: c, x, y, hp, r, dead: false, who });
      return;
    }
    this.breakables.push({ kind, obj: c, x, y, hp, r, dead: false });
  }

  /** A player shot at (x, y): returns true if it hit something here (the shot is spent). */
  hitShot(x: number, y: number, dmg: number): boolean {
    for (const b of this.breakables) {
      if (b.dead || b.kind === "hostage") continue;
      if (Math.abs(b.x - x) < b.r && Math.abs(b.y - y) < b.r + 4) {
        this.damage(b, dmg);
        return true;
      }
    }
    return false;
  }

  /** An explosion or slam: breaks anything in range. */
  hitAoe(x: number, y: number, r: number, dmg: number) {
    for (const b of this.breakables) {
      if (b.dead || b.kind === "hostage") continue;
      if (Phaser.Math.Distance.Between(b.x, b.y, x, y) < r + b.r) this.damage(b, dmg);
    }
  }

  private damage(b: Breakable, dmg: number) {
    b.hp -= Math.max(1, dmg);
    this.sc.tweens.add({ targets: b.obj, x: b.x + 3, yoyo: true, duration: 40, repeat: 1 });
    if (b.hp <= 0) this.breakIt(b);
    else synth.play("hit");
  }

  private breakIt(b: Breakable) {
    const sc = this.sc;
    b.dead = true;
    if (b.kind === "barrel") {
      b.obj.destroy();
      synth.play("explode");
      sc.shake(220, 0.012);
      sc.hitStop(50);
      const drawn = sc.boomFx(b.x, b.y, 1.2, 1400);
      if (!drawn) {
        const boom = sc.add.circle(b.x, b.y, 10, 0xffd23f, 0.9).setDepth(1400);
        sc.tweens.add({ targets: boom, radius: 100, alpha: 0, duration: 320, onComplete: () => boom.destroy() });
        sc.burst(b.x, b.y, 0xf97316, 22);
        sc.burst(b.x, b.y, 0x111827, 10);
      }
      sc.aoe(b.x, b.y, 100, 70, { knock: 380, noWonk: true, color: drawn ? undefined : 0xf97316, label: undefined });
      const p = sc.player;
      if (p && Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < 80) sc.damagePlayer(14, { x: b.x, y: b.y }, { label: "-14 (BARREL)" });
      // chain reaction
      sc.time.delayedCall(140, () => this.hitAoe(b.x, b.y, 100, 99));
      const scorch = sc.add.ellipse(b.x, b.y + (this.side ? 18 : 8), 90, 30, 0x111111, 0.45).setDepth(this.side ? 3 : 2);
      sc.tweens.add({ targets: scorch, alpha: 0.15, delay: 4000, duration: 3000 });
      return;
    }
    b.obj.destroy();
    synth.play("door");
    sc.burst(b.x, b.y, 0x92622f, 12);
    if (b.kind === "ammo_crate") {
      sc.dropPickup(b.x - 10, b.y - 10, "ammo", 1.5);
      sc.dropPickup(b.x + 10, b.y - 10, "ammo", 1);
      sc.floatText(b.x, b.y - 30, "AMMO", "#67e8f9", 14);
    } else {
      const roll = Math.random();
      sc.dropPickup(b.x, b.y - 10, roll < 0.35 ? "heal" : roll < 0.7 ? "ammo" : "krezz", roll < 0.35 ? 20 : roll < 0.7 ? 1 : 25);
      for (let i = 0; i < 4; i++) sc.dropPickup(b.x + (Math.random() - 0.5) * 50, b.y - 6, "coin", 3);
    }
  }

  private rescue(b: Breakable) {
    const sc = this.sc;
    b.dead = true;
    synth.play("cheer");
    const name = CHARACTERS[b.who ?? ""]?.name ?? "A lad";
    sc.tweens.killTweensOf(b.obj.list);
    b.obj.removeAll(true);
    const spr = sc.add.sprite(b.x, b.y - 6, sc.textures.exists(`spr_${b.who}`) ? `spr_${b.who}` : "p_bin", 0).setScale(1.6).setDepth(9);
    sc.floatText(b.x, b.y - 60, `${name.toUpperCase()}: FREED`, "#4ade80", 15);
    sc.floatText(b.x, b.y - 40, `"${HOSTAGE_LINES[Math.floor(Math.random() * HOSTAGE_LINES.length)]}"`, "#ffffff", 11);
    const p = sc.player;
    if (Math.random() < 0.4) {
      p.overdriveUntil = sc.now() + 12000;
      sc.toast("FART OVERDRIVE", `${name} hands you a can of beans. 12 seconds of faster, harder firing.`);
    } else {
      const r = rollCrate(G.s);
      if (r.gun) sc.toast(`NEW GUN: ${r.gun.name.toUpperCase()}`, `${name} slips you a ${r.gun.name}. Now in your hand.`);
      else if (r.ammoFor) sc.toast("AMMO", `${name} hands over +${r.amount} ${r.ammoFor.name} ammo.`);
      else for (let i = 0; i < 5; i++) sc.dropPickup(b.x + (Math.random() - 0.5) * 60, b.y - 6, "coin", 4);
    }
    sc.tweens.add({ targets: spr, x: b.x - 400, alpha: 0, delay: 900, duration: 1600, onComplete: () => spr.destroy() });
  }

  // ---------------------------------------------------------------- elites

  /** Called for every enemy the room spawns. Some become elites. */
  onSpawn(e: Enemy, opts: { minion?: boolean } = {}) {
    if (opts.minion || e.isBoss || e.def.id === "tax_goblin" || e.def.id === "fuel_tank" || e.def.behavior === "spawner") return;
    const base = Math.min(0.16, 0.05 + 0.02 * Math.max(1, G.s.chapter));
    const chance = this.twist === "ELITES" ? 0.45 : base;
    if (Math.random() > chance) return;
    const mods: EliteMod[] = ["SWOLE", "ZOOMIES", "SPLITTER", "VOLATILE"];
    const mod = mods[Math.floor(Math.random() * mods.length)];
    this.elites.set(e, mod);
    const hpMult = mod === "SWOLE" ? 3 : 2;
    e.maxHp = Math.round(e.maxHp * hpMult);
    e.hp = e.maxHp;
    if (mod === "SWOLE") {
      e.setScale(2.7);
      e.dmgMult *= 1.35;
    }
    if (mod === "ZOOMIES") e.speedMult *= 1.6;
    e.setTint(ELITE_COLOR[mod]);
    this.tag(e, `ELITE · ${mod} (${ELITE_BLURB[mod]})`, ELITE_COLOR[mod]);
  }

  private tag(e: Enemy, text: string, color: number) {
    const t = this.sc.add.text(e.x, e.y - 30, text, { fontFamily: "sans-serif", fontSize: "10px", color: "#ffffff", backgroundColor: `#${color.toString(16).padStart(6, "0")}cc`, padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(1450);
    this.tags.set(e, t);
  }

  /** Called when any enemy dies (before its normal drops). */
  onKill(e: Enemy) {
    const sc = this.sc;
    this.tags.get(e)?.destroy();
    this.tags.delete(e);
    if (this.goblin?.e === e) {
      this.goblin = null;
      sc.floatText(e.x, e.y - 40, "TAX RETURN!", "#facc15", 18);
      synth.play("cheer");
      for (let i = 0; i < 10; i++) sc.dropPickup(e.x + (Math.random() - 0.5) * 80, e.y + (Math.random() - 0.5) * 60, "coin", 4);
      sc.dropPickup(e.x, e.y, "ammo", 2);
    }
    const mod = this.elites.get(e);
    if (!mod) return;
    this.elites.delete(e);
    sc.dropPickup(e.x + 12, e.y, "ammo", 1.5);
    for (let i = 0; i < 3; i++) sc.dropPickup(e.x + (Math.random() - 0.5) * 40, e.y + (Math.random() - 0.5) * 30, "coin", 3);
    sc.floatText(e.x, e.y - 40, "ELITE DOWN", "#ffd23f", 15);
    if (mod === "SPLITTER") {
      for (const dx of [-24, 24]) {
        const m = sc.spawnEnemy(e.def.id, e.x + dx, e.y, { noDrops: true, minion: true });
        if (m) {
          m.maxHp = m.hp = Math.max(8, Math.round(m.maxHp * 0.45));
          m.setScale(1.5);
          m.setTint(ELITE_COLOR.SPLITTER);
        }
      }
    } else if (mod === "VOLATILE") {
      sc.enemyAoe(e.x, e.y, 80, 16 * e.dmgMult, 650, 0xef4444);
      sc.time.delayedCall(650, () => {
        synth.play("explode");
        if (!sc.boomFx(e.x, e.y, 0.8)) sc.burst(e.x, e.y, 0xef4444, 16);
        this.hitAoe(e.x, e.y, 80, 99);
      });
    }
  }

  // ---------------------------------------------------------------- per frame

  update(now: number, dt: number) {
    const sc = this.sc;
    const p = sc.player;
    if (!p) return;
    for (const [e, t] of this.tags) {
      if (e.dead || !e.active) {
        t.destroy();
        this.tags.delete(e);
      } else t.setPosition(e.x, e.y - e.displayHeight / 2 - 10);
    }
    // hostages: walk up to them
    for (const b of this.breakables) {
      if (b.dead || b.kind !== "hostage") continue;
      if (Math.abs(p.x - b.x) < 44 && Math.abs(p.y - b.y) < 60) this.rescue(b);
    }
    if (this.goblin && now > this.goblin.until && !this.goblin.e.dead) {
      const e = this.goblin.e;
      this.goblin = null;
      sc.floatText(e.x, e.y - 40, "GOT AWAY WITH IT", "#facc15", 16);
      this.tags.get(e)?.destroy();
      this.tags.delete(e);
      e.noDrops = true;
      sc.damageEnemy(e, 99999, { noWonk: true, label: " " });
    }
    if (this.dark) {
      const cam = sc.cameras.main;
      const g = this.dark.hole;
      g.clear();
      g.fillStyle(0xffffff, 1).fillCircle((p.x - cam.scrollX) * cam.zoom, (p.y - cam.scrollY) * cam.zoom, 150 + Math.sin(now / 300) * 6);
      for (const e of sc.enemies) if (!e.dead && e.def.projectile) g.fillCircle((e.x - cam.scrollX) * cam.zoom, (e.y - cam.scrollY) * cam.zoom, 16);
    }
    if (this.puddles.length && now > this.puddleTick) {
      this.puddleTick = now + 450;
      for (const pd of this.puddles) {
        if (Phaser.Math.Distance.Between(p.x, p.y, pd.x, pd.y) < pd.r) {
          sc.damagePlayer(3, undefined, { unblockable: false, label: "-3 (SLURRY)" });
          const body = p.spr.body as Phaser.Physics.Arcade.Body;
          body.velocity.scale(0.5);
        }
        for (const e of sc.enemies) {
          if (e.dead || e.isBoss) continue;
          if (Phaser.Math.Distance.Between(e.x, e.y, pd.x, pd.y) < pd.r) {
            sc.damageEnemy(e, 6, { noWonk: true, label: "", slow: 0.5 });
          }
        }
      }
    }
    if (this.survive) {
      const sv = this.survive;
      const left = Math.max(0, sv.until - now);
      sv.text.setText(`SURVIVE ${Math.ceil(left / 1000)}`);
      const alive = sc.enemies.filter((e: Enemy) => !e.dead).length;
      if (left > 0 && now > sv.nextSpawn && alive < 10) {
        sv.nextSpawn = now + 1100;
        const b = sc.bounds as Phaser.Geom.Rectangle;
        const t = sv.types[Math.floor(Math.random() * sv.types.length)];
        const edge = Math.floor(Math.random() * 4);
        const x = edge === 0 ? b.left + 40 : edge === 1 ? b.right - 40 : Phaser.Math.Between(b.left + 60, b.right - 60);
        const y = edge === 2 ? b.top + 60 : edge === 3 ? b.bottom - 60 : Phaser.Math.Between(b.top + 60, b.bottom - 60);
        sc.spawnEnemy(t, x, y, {});
      }
      if (left <= 0) {
        this.survive = null;
        sv.text.setText("SURVIVED!");
        sc.tweens.add({ targets: sv.text, alpha: 0, delay: 900, duration: 500, onComplete: () => sv.text.destroy() });
        for (const e of [...sc.enemies]) if (!e.dead) sc.damageEnemy(e, 99999, { noWonk: true, label: "" });
        sc.onRoomCleared();
      }
    }
  }

  destroy() {
    for (const t of this.tags.values()) t.destroy();
    this.tags.clear();
    this.dark?.overlay.destroy();
    this.dark?.hole.destroy();
    this.dark = null;
  }
}
