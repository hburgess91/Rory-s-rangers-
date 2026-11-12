import { carriesCrystal, crystalCount, CRYSTALS_NEEDED, CRYSTAL_BOSSES } from "../systems/crystals";
import { squeeze } from "../systems/squeeze";
import Phaser from "phaser";
import { DUNGEONS, type DungeonDef, type RoomDef, type PropDef } from "../../data/dungeons";
import { ENEMIES } from "../../data/enemies";
import type { Line } from "../../data/types";
import { G } from "../G";
import { Player } from "../combat/Player";
import { Enemy } from "../combat/Enemy";
import { Controls } from "../combat/Controls";
import type { CombatWorld, HitOpts, ShotOpts } from "../combat/types";
import { Boss, createBoss, DrongusBoss, OverWonkedMachine } from "../combat/Bosses";
import { synth, MUSIC_FILES } from "../audio/Synth";
import { runDialogue } from "./DialogueScene";
import { BOSS_TEXT } from "../../content/bosses";
import { enemyDamageMult, enemyHpMult, maxHp, bump, maxBottles } from "../systems/stats";
import { activeMods } from "../../data/historicalRevisions";
import { addBanRisk, BAN_RULES, type BanRule, coolBanRisk } from "../systems/ban";
import { pickupsInDungeon, collectPickup } from "../systems/quests";
import { Spice } from "../combat/Spice";
import { equipBest, fitTo, giveAmmo, ownedGuns, rollCrate, GUNS, gunMax } from "../combat/Guns";
import { charMeta, leadCamera } from "../gfx/HD";
import { addFart } from "../combat/Farts";
import { Companion } from "../combat/Companion";
import { SanBrother } from "../combat/SanBrother";
import { SideLevel } from "./side/SideLevel";
import { runChain, switchTo } from "../Flow";
import { CHEESE_ACCUSATIONS, CHEESE_WITNESSES, DOMESTICS, MORK_ROUNDS } from "../../content/polsonEden";
import { say, dir, gabor } from "../../content/dsl";
import { FONT } from "../ui/theme";
import { CHARACTERS } from "../../data/characters";
import { evalCond } from "../systems/conditions";
import { extraViolence, kd } from "../systems/kreddle";
import { forcedKreltality, kreltality, type KrelTarget } from "../combat/Kreltality";
import { hasVfx, vfx } from "../gfx/Vfx";

interface Shot {
  spr: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  o: ShotOpts;
  hit: Set<number>;
}

interface Pickup {
  spr: Phaser.GameObjects.Image;
  kind: "coin" | "krezz" | "heal" | "crobley" | "quest" | "bottle" | "bongo" | "ammo";
  value: number;
  onCollect?: () => void;
}

interface Interactable {
  x: number;
  y: number;
  r: number;
  label: string;
  use: () => void | Promise<void>;
  enabled?: () => boolean;
}

const SHAKE = () => G.meta.settings.shake;

const clearKey = (dungeon: string, room: number) => `dclr_${dungeon}_${room}`;

/** How much bigger people are drawn in side-scrolling rooms. */
const SIDE_BIG = 1.4;

export class DungeonScene extends Phaser.Scene implements CombatWorld {
  sc!: Phaser.Scene;
  player!: Player;
  enemies: Enemy[] = [];
  enemyTimeScale = 1;
  telegraphMult = 1;
  bounds = new Phaser.Geom.Rectangle();
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private shots: Shot[] = [];
  private pickups: Pickup[] = [];
  private interactables: Interactable[] = [];
  private controls!: Controls;
  private dungeon!: DungeonDef;
  private roomIdx = 0;
  private room!: RoomDef;
  private waveIdx = -1;
  private waveActive = false;
  private roomCleared = false;
  private boss: Boss | null = null;
  private door!: Phaser.GameObjects.Image;
  private doorZone!: Phaser.Geom.Rectangle;
  private prompt!: Phaser.GameObjects.Text;
  private busy = false;
  private paused = false;
  private hitStopUntil = 0;
  private prophecyUntil = 0;
  private rule: BanRule | null = null;
  private lastStillTick = 0;
  private dying = false;
  private machineUses: Record<string, number> = {};
  private lastWitness = "none";
  private witnessed = new Set<string>();
  private morkRound = 0;
  private lastHurtSfx = 0;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private conflictUntil = 0;
  private waves: [string, number][][] = [];
  private pendingSpawns = 0;
  private transitioning = false;

  private resumed = false;
  private companion: Companion | null = null;
  side = false;
  private bros: SanBrother[] = [];
  private sideLevel: SideLevel | null = null;
  groundY = 0;
  private platforms: Phaser.Physics.Arcade.StaticGroup | null = null;
  private sideBg: Phaser.GameObjects.TileSprite | null = null;
  private sideBgScale = 1;

  constructor() {
    super("Dungeon");
  }

  /** Barrels, crates, hostages, elites and room twists. */
  spice: Spice | null = null;
  private lastKillStop = 0;
  private lastSplat = 0;
  /** 1 = normal speed. The weapon picker drops it right down. */
  private slowmo = 1;
  /** The weapon picker is open: the world crawls and you're choosing, not fighting. */
  picking = false;
  private lastMeterHit = 0;
  /** Kills since the last ammo drop (bad-luck protection). */
  private ammoDry = 0;

  /** True when every owned gun is under a quarter full. */
  private ammoLow() {
    const s = G.s;
    const owned = ownedGuns(s);
    return owned.length > 0 && owned.every((id) => (s.guns![id] ?? 0) < gunMax(GUNS[id], s) * 0.25);
  }

  private markCleared() {
    G.s.flags[clearKey(this.dungeon.id, this.roomIdx)] = true;
    G.save();
  }

  init(data: { dungeon: string; room?: number; bossHpPct?: number; rush?: number }) {
    this.sc = this;
    this.dungeon = DUNGEONS[data.dungeon] ?? DUNGEONS.wildern;
    this.roomIdx = data.room ?? 0;
    // Saved progress: walking in from town resumes at the first room you haven't cleared.
    this.resumed = false;
    if (this.roomIdx === 0 && G.s.flags[clearKey(this.dungeon.id, 0)]) {
      let i = 0;
      while (i < this.dungeon.rooms.length - 1 && G.s.flags[clearKey(this.dungeon.id, i)]) i++;
      this.roomIdx = i;
      this.resumed = i > 0;
    }
    this.room = this.dungeon.rooms[this.roomIdx];
    this.waves = (this.room.waves ?? []).map((w) => w.map((x) => [x[0], x[1]] as [string, number]));
    this.enemies = [];
    this.shots = [];
    this.pickups = [];
    this.interactables = [];
    this.waveIdx = -1;
    this.pendingSpawns = 0;
    this.transitioning = false;
    this.waveActive = false;
    this.roomCleared = false;
    this.boss = null;
    this.busy = false;
    this.paused = false;
    this.dying = false;
    this.picking = false;
    this.slowmo = 1;
    this.vClock = this.time.now;
    this.rule = null;
    this.machineUses = {};
    this.lastWitness = "none";
    this.witnessed = new Set();
    this.morkRound = 0;
    this.enemyTimeScale = 1;
    this.prophecyUntil = 0;
    G.rt.dungeonId = this.dungeon.id;
    G.rt.room = this.roomIdx;
    (this as any)._bossHpPct = data.bossHpPct;
    // boss rush checkpoint: died on Crobley N? Start again from Crobley N
    this.rushIdx = Math.max(0, Math.min(data.rush ?? 0, this.room?.bossRush?.length ?? 0));
  }

  /** The fight's own clock: runs at the slow-motion rate (Phaser's scene clock doesn't). */
  private vClock = 0;
  now() {
    return this.vClock;
  }

  create() {
    const s = G.s;
    s.phase = "dungeon";
    // the catwalks painted into the backdrop become real platforms
    if (this.room.ledges && this.room.backdrop && this.textures.exists(this.room.backdrop)) this.room = { ...this.room, platforms: [...(this.room.platforms ?? []), ...this.ledgePlatforms(this.room)] };
    const r = this.room;
    // a Tap Rush lasts for this outing, then wears off back in town
    if (s.flags.tap_rush) s.flags.tap_rush_out = true;
    this.telegraphMult = (s.player === "KREZWONK" ? 1.4 : 1) * ((r.view ?? this.dungeon.view) === "side" ? 1.3 : 1);
    this.cameras.main.fadeIn(300);
    // a previous room's trip doesn't carry over
    this.cameras.main.setRotation(0).setZoom(1);
    (this.cameras.main as any).postFX?.clear?.();
    this.side = (r.view ?? this.dungeon.view) === "side";
    this.groundY = r.h - 56;
    this.platforms = null;
    this.sideBg = null;
    this.towerBg = null;
    this.sideLevel = this.side ? new SideLevel(this as any, r) : null;
    if (this.side) {
      // with holes in the floor, the floor is made of blocks and the world carries on underneath
      this.physics.world.setBounds(24, 0, r.w - 48, this.sideLevel?.hasGaps ? r.h + 400 : this.groundY);
      // shots may dip a little below the floor line so low shots still hit things standing on it
      this.bounds.setTo(24, 0, r.w - 48, this.groundY + 40);
    } else {
      this.physics.world.setBounds(24, 24, r.w - 48, r.h - 48);
      this.bounds.setTo(24, 24, r.w - 48, r.h - 48);
    }
    this.buildRoom();
    this.controls = new Controls(this);
    this.player = new Player(this, this.side ? 90 : r.w / 2, this.side ? this.groundY - 40 : r.h - 90);
    if (this.side) {
      (this.player.spr.body as Phaser.Physics.Arcade.Body).setGravityY(1500);
      // side-on, everyone's drawn bigger (classic run'n'gun proportions)
      (this.player.spr as any).big = SIDE_BIG;
      this.player.spr.setScale(2);
    }
    // walk in holding the best gun you've got ammo for
    equipBest(s);
    this.spice = new Spice(this);
    this.spice.setup();
    // the meter carries over between rooms; a revision can guarantee a minimum
    this.player.wonk = Math.max(this.player.wonk, activeMods(s).wonkStart);
    // a lad hired at the Central Bank
    this.companion = null;
    if (typeof s.flags.companion === "string" && !this.dungeon.arenaFlag) {
      this.companion = new Companion(this, this.player, s.flags.companion);
      s.flags.companion_used = true;
    }
    this.bros = r.sanBros ? [new SanBrother(this, this.player, "SANMIK"), new SanBrother(this, this.player, "SANCHZ")] : [];
    this.enemyGroup = this.physics.add.group();
    if (!this.side) this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.physics.add.collider(this.player.spr, this.obstacles);
    this.physics.add.collider(this.enemyGroup, this.obstacles);
    if (this.platforms) {
      // one-way platforms: land on them from above, jump up through them, hold down to drop
      const oneWay = (a: any, plat: any) => {
        const b = (a.body ?? a) as Phaser.Physics.Arcade.Body;
        const pb = plat.body as Phaser.Physics.Arcade.StaticBody;
        if (a === this.player.spr && this.now() < this.player.dropUntil) return false;
        return b.velocity.y >= 0 && b.bottom <= pb.top + 14;
      };
      this.physics.add.collider(this.player.spr, this.platforms, undefined, oneWay);
      this.physics.add.collider(this.enemyGroup, this.platforms, undefined, oneWay);
    }
    this.sideLevel?.attach(this.player.spr, this.enemyGroup);
    this.cameras.main.setBounds(0, 0, r.w, r.h);
    this.cameras.main.startFollow(this.player.spr, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(80, 60);
    this.prompt = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#000000cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(900).setVisible(false);

    if (!this.scene.isActive("UI")) this.scene.launch("UI", { mode: "dungeon" });
    else this.scene.get("UI").events.emit("mode", "dungeon");
    G.emit("room", { name: `${this.dungeon.name} · ${r.name}`, idx: this.roomIdx, total: this.dungeon.rooms.length });
    G.emit("boss", null);
    synth.music(r.boss ? (r.boss === "drongus" ? "final" : MUSIC_FILES[`boss_${r.boss}`] ? `boss_${r.boss}` : "boss") : r.music ?? this.dungeon.music);
    // background ambience for the place (quiet, under the music)
    synth.ambience(this.dungeon.id === "rik_colon" ? "colon" : r.theme === "industrial" || this.dungeon.id === "crobley_factory" ? "factory" : "dungeon");
    this.player.headbuttMode = r.boss === "troll";
    if (this.dungeon.timerSec && this.roomIdx === 0 && !G.rt.timerEnd) G.rt.timerEnd = Date.now() + this.dungeon.timerSec * 1000;

    this.events.on("prophecy", (ms: number) => {
      this.prophecyUntil = this.now() + ms;
    });
    this.events.on("krezz-burst", (radius: number) => {
      for (const sh of [...this.shots]) if (sh.o.owner === "enemy" && Phaser.Math.Distance.Between(sh.spr.x, sh.spr.y, this.player.x, this.player.y) < radius) this.killShot(sh);
      if (this.boss instanceof DrongusBoss) this.boss.onBurst(this.player.x, this.player.y, radius);
      const ring = this.add.image(this.player.x, this.player.y, "fx_ring").setTint(0xffd23f).setDepth(700);
      this.tweens.add({ targets: ring, scale: (radius * 2) / 60, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
    });
    this.events.on("drop-heal", (x: number, y: number) => this.dropPickup(x, y, "heal", 10));
    this.events.on("decree", (id: string) => this.setRule(BAN_RULES.find((b) => b.id === id) ?? null, true));
    this.events.on("drongus-decree", () => this.drongusDecree());
    this.events.on("conflict", () => {
      this.conflictUntil = this.now() + 6000;
      G.emit("conflict", 6000);
    });
    this.events.on("player-dodge", () => this.ruleBroken("NO_DODGE"));
    this.events.on("player-heal", () => this.ruleBroken("NO_HEAL"));
    this.events.on("player-special", () => this.ruleBroken("NO_SPECIAL"));
    this.events.on("ui-resume", () => (this.paused = false));

    this.events.once("shutdown", () => this.removeListeners());
    this.startRoom();
    G.save();
  }

  // ------------------------------------------------------------------ room building

  /** Shot a weapon pod: a Contra-style power-up letter drops and flies to you. */
  private weaponPod(x: number, y: number) {
    const p = this.player;
    const now = this.now();
    const s = G.s;
    const hurt = s.hp < maxHp(s) * 0.5;
    const opts = [
      { k: "S", name: "SPREAD SHOT", col: "#f87171", go: () => (p.spreadUntil = now + 15000) },
      { k: "M", name: "MACHINE GUN", col: "#fde047", go: () => (p.overdriveUntil = now + 12000) },
      { k: "B", name: "BARRIER", col: "#a78bfa", go: () => (p.shieldUntil = now + 8000) },
      { k: "H", name: "HEALTH", col: "#86efac", go: () => (s.hp = Math.min(maxHp(s), s.hp + maxHp(s) * 0.4)) },
    ];
    const pick = hurt && Math.random() < 0.5 ? opts[3] : opts[Math.floor(Math.random() * (hurt ? 4 : 3))];
    synth.play("boom");
    this.burst(x, y, 0xfde047, 20);
    const t = this.add.text(x, y, pick.k, { fontFamily: "Impact, sans-serif", fontSize: "30px", color: pick.col, stroke: "#000", strokeThickness: 6, backgroundColor: "#00000088", padding: { x: 6, y: 0 } }).setOrigin(0.5).setDepth(1500);
    this.tweens.add({ targets: t, y: y - 40, duration: 300, ease: "Quad.out", onComplete: () => {
      this.tweens.add({ targets: t, x: { getEnd: () => p.x }, y: { getEnd: () => p.y - 10 }, scale: 0.6, duration: 380, ease: "Quad.in", onComplete: () => {
        t.destroy();
        pick.go();
        synth.play("cheer");
        this.cameras.main.flash(160, 255, 255, 255);
        this.floatText(p.x, p.y - 60, `${pick.k}: ${pick.name}!`, pick.col, 20);
      } });
    } });
  }

  /** Backdrop ledges (picture pixels, left half, mirrored) as level platforms, repeated along the room. */
  private ledgePlatforms(r: RoomDef): [number, number, number][] {
    const src = this.textures.get(r.backdrop!).getSourceImage();
    const k = 540 / src.height;
    const tw = src.width;
    const gy = r.h - 56;
    const out: [number, number, number][] = [];
    for (let off = 0; off * k < r.w; off += tw) {
      for (const [x0, x1, y] of r.ledges ?? []) {
        for (const [a, b] of [[x0, x1], [tw - x1, tw - x0]]) {
          const cx = (off + (a + b) / 2) * k;
          const w = (b - a) * k;
          if (cx - w / 2 > r.w - 120 || cx + w / 2 < 40) continue;
          out.push([cx / r.w, gy - y * k, w]);
        }
      }
    }
    return out;
  }

  /** Side-scrolling room: parallax backdrop, ground strip, one-way platforms, exit on the right. */
  private buildSideRoom() {
    const r = this.room;
    const gy = this.groundY;
    const sky = this.add.graphics().setDepth(-20).setScrollFactor(0);
    sky.fillGradientStyle(0x2a1050, 0x2a1050, 0xff7aa8, 0xff7aa8, 1).fillRect(0, 0, 960, 540);
    if (r.backdrop && this.textures.exists(r.backdrop)) {
      const src = this.textures.get(r.backdrop).getSourceImage();
      this.sideBgScale = 540 / src.height;
      this.sideBg = this.add.tileSprite(0, 0, 960, 540, r.backdrop).setOrigin(0).setScrollFactor(0).setDepth(-10);
      this.sideBg.setTileScale(this.sideBgScale);
    }
    const tile = `tile_${r.theme}`;
    if (!this.sideLevel?.hasGaps) {
      this.add.tileSprite(0, gy, r.w, r.h - gy, tile).setOrigin(0).setDepth(2).setTint(0x8a8a9a);
      this.add.rectangle(0, gy, r.w, 4, 0x000000, 0.6).setOrigin(0).setDepth(3);
    }
    this.platforms = this.physics.add.staticGroup();
    for (const [fx, h, w] of r.platforms ?? []) {
      const x = r.w * fx;
      const y = gy - h;
      if (r.tower) {
        // gothic stone ledge: dark stone, gold trim, little corbels underneath
        const g = this.add.graphics().setDepth(4);
        g.fillStyle(0x2a1a33, 1).fillRect(x - w / 2, y - 7, w, 16);
        g.fillStyle(0x3b2547, 1).fillRect(x - w / 2, y - 7, w, 5);
        g.fillStyle(0xd4a017, 1).fillRect(x - w / 2, y - 9, w, 3);
        for (let cx = x - w / 2 + 14; cx < x + w / 2 - 6; cx += 28) g.fillStyle(0x1f1226, 1).fillTriangle(cx - 9, y + 9, cx + 9, y + 9, cx, y + 22);
        g.lineStyle(1, 0x000000, 0.6).strokeRect(x - w / 2, y - 7, w, 16);
      } else if (r.ledges) {
        // painted into the backdrop already: just a faint edge so you can see it's solid
        this.add.rectangle(x, y - 6, w, 2, 0xfff1c1, 0.35).setDepth(4);
      } else if (r.trip) {
        // wonder platforms: rainbow jelly, wobbling to the beat
        const c = this.add.container(x, y).setDepth(4);
        const cols = [0xf472b6, 0xfacc15, 0x4ade80, 0x22d3ee, 0xa78bfa];
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 3, -6, w, 18, 9);
        g.fillStyle(cols[Math.floor(fx * 37) % cols.length], 1).fillRoundedRect(-w / 2, -9, w, 18, 9);
        g.fillStyle(0xffffff, 0.45).fillRoundedRect(-w / 2 + 8, -7, w - 16, 5, 3);
        for (let dx = -w / 2 + 16; dx < w / 2 - 8; dx += 24) g.fillStyle(0xffffff, 0.8).fillCircle(dx, 3, 2.5);
        c.add(g);
        const eyes = this.add.text(0, -2, "◕‿◕", { fontFamily: FONT, fontSize: "11px", color: "#111827" }).setOrigin(0.5);
        c.add(eyes);
        this.tweens.add({ targets: c, scaleY: { from: 1, to: 1.3 }, scaleX: { from: 1, to: 0.96 }, yoyo: true, repeat: -1, duration: 234, delay: Math.floor(fx * 1000) % 234, ease: "Sine.inOut" });
      } else {
        this.add.tileSprite(x, y, w, 14, tile).setDepth(4).setTint(0xb0a0c0);
        this.add.rectangle(x, y - 7, w, 3, 0xffd23f, 0.8).setDepth(5);
        this.add.rectangle(x, y + 7, w, 3, 0x000000, 0.5).setDepth(5);
      }
      const plat = this.add.rectangle(x, y, w, 14, 0, 0);
      this.platforms.add(plat);
    }
    this.sideLevel?.build(this.platforms);
    this.obstacles = this.physics.add.staticGroup();
    const dx = r.exitAt ? r.w * r.exitAt[0] : r.w - 70;
    const dy = r.exitAt ? gy - r.exitAt[1] - 7 : gy;
    this.door = this.add.image(dx, dy - 30, "p_door_locked").setScale(2.2).setDepth(6);
    this.doorZone = new Phaser.Geom.Rectangle(dx - 60, dy - 110, 120, 110);
    this.add.text(dx, dy - 78, r.boss ? "" : r.tower ? "THE SQUEEZING ROOM ↑" : "EXIT →", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(6);
    if (r.tower) this.decorateTower();
    const t = this.add.text(480, 200, r.name.toUpperCase(), { fontFamily: FONT, fontSize: "28px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setScrollFactor(0).setDepth(950).setShadow(3, 3, "#000", 0);
    this.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 700, onComplete: () => t.destroy() });
    for (const p of r.props ?? []) if (evalCond(p.cond, G.s)) this.addProp(p);
    if (r.gunCrate) this.time.delayedCall(600, () => this.maybeGunCrate(true));
  }

  private towerBg: Phaser.GameObjects.TileSprite | null = null;

  /** The Cuddle Tower: pink walls going up forever, cuddle drawings, floor numbers, hearts. */
  private decorateTower() {
    const r = this.room;
    const gy = this.groundY;
    // the gothic wall: crimson stone, pink stained-glass hearts, scrolling a bit slower than you climb
    if (this.textures.exists("tw_gothic")) {
      this.towerBg = this.add.tileSprite(0, 0, 960, 540, "tw_gothic").setOrigin(0).setScrollFactor(0).setDepth(-12).setTileScale(2);
    } else {
      this.towerBg = this.add.tileSprite(0, 0, 960, 540, "tile_mansion").setOrigin(0).setScrollFactor(0).setDepth(-12).setTint(0x5b1f3a);
    }
    // a little moonlight and gloom
    this.add.rectangle(0, 0, 960, 540, 0x12051a, 0.25).setOrigin(0).setScrollFactor(0).setDepth(-11);
    // crimson banners with Cronny's heart, hanging between floors
    const mottos = ["OL' CRONNY ♥", "GIVE US A CUD", "SQUEEZE", "COME UP LOVE", "♥ ♥ ♥", "JUICES :)"];
    let k = 0;
    for (let y = gy - 260; y > 120; y -= 420) {
      for (const x of k % 2 ? [90, 870] : [300, 660]) {
        const g = this.add.graphics().setDepth(-6);
        g.fillStyle(0x7f1d1d, 1).fillRect(x - 26, y - 70, 52, 120).fillTriangle(x - 26, y + 50, x + 26, y + 50, x, y + 72);
        g.lineStyle(3, 0xd4a017, 1).strokeRect(x - 26, y - 70, 52, 120);
        g.fillStyle(0xd4a017, 1).fillRect(x - 34, y - 76, 68, 6);
        g.fillStyle(0xf472b6, 1).fillCircle(x - 7, y - 20, 9).fillCircle(x + 7, y - 20, 9).fillTriangle(x - 15, y - 16, x + 15, y - 16, x, y + 4);
        this.add.text(x, y + 30, mottos[k % mottos.length], { fontFamily: "Georgia, serif", fontSize: "9px", color: "#fde68a", fontStyle: "bold", align: "center", wordWrap: { width: 46 } }).setOrigin(0.5).setDepth(-5);
      }
      k++;
    }
    // candelabras on the ledges, flames flickering
    (r.platforms ?? []).forEach(([fx, h, w], i) => {
      if (i % 2) return;
      const x = r.w * fx + (i % 4 ? -1 : 1) * (w / 2 - 14);
      const y = gy - h - 7;
      const g = this.add.graphics().setDepth(6);
      g.fillStyle(0x3f3f46, 1).fillRect(x - 2, y - 26, 4, 26).fillRect(x - 12, y - 26, 24, 3).fillRect(x - 8, y - 3, 16, 3);
      for (const dx of [-11, 0, 11]) {
        g.fillStyle(0xf5f5f4, 1).fillRect(x + dx - 2, y - 36, 4, 10);
        const fl = this.add.ellipse(x + dx, y - 40, 5, 9, 0xfbbf24).setDepth(7);
        const glow = this.add.circle(x + dx, y - 40, 14, 0xf97316, 0.18).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: [fl, glow], scaleY: { from: 0.85, to: 1.2 }, alpha: { from: 0.75, to: 1 }, yoyo: true, repeat: -1, duration: 160 + ((i * 37 + dx * 7) % 120) });
      }
    });
    // floor numbers so you can see how far you've come
    for (let f = 1; f * 336 < r.h - 300; f++) this.add.text(40, gy - f * 336, `FLOOR ${f}`, { fontFamily: "Georgia, serif", fontSize: "14px", color: "#fde68a", fontStyle: "bold" }).setDepth(-5).setAlpha(0.6);
  }

  private buildRoom() {
    const r = this.room;
    if (this.side) return this.buildSideRoom();
    const themeTile = `tile_${r.theme}`;
    this.add.tileSprite(0, 0, r.w, r.h, themeTile).setOrigin(0).setDepth(0);
    const wallCol = { school: 0x6b5b4b, mansion: 0x3b2a1a, network: 0x0b1530, industrial: 0x1f2937, temple: 0x4a3a2a, prison: 0x111827, wiki: 0xa2a9b1, colon: 0x7a1f3a }[r.theme];
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(wallCol, 1);
    g.fillRect(0, 0, r.w, 24);
    g.fillRect(0, r.h - 24, r.w, 24);
    g.fillRect(0, 0, 24, r.h);
    g.fillRect(r.w - 24, 0, 24, r.h);
    g.lineStyle(2, 0x000000, 0.4);
    g.strokeRect(24, 24, r.w - 48, r.h - 48);
    // PixelLab walls: an illustrated back wall, shaded side and front walls
    const wallKey = `wall_${r.theme}`;
    if (this.textures.exists(wallKey)) {
      const src = this.textures.get(wallKey).getSourceImage();
      const back = this.add.tileSprite(0, 0, r.w, 56, wallKey).setOrigin(0).setDepth(1);
      back.setTileScale(56 / src.height);
      for (const [x, y, w, h] of [
        [0, r.h - 24, r.w, 24],
        [0, 0, 24, r.h],
        [r.w - 24, 0, 24, r.h],
      ])
        this.add.tileSprite(x, y, w, h, wallKey).setOrigin(0).setDepth(1).setTint(0x8a7f9a).setTileScale(0.5);
      this.add.rectangle(0, 56, r.w, 6, 0x000000, 0.35).setOrigin(0).setDepth(1);
    }
    this.obstacles = this.physics.add.staticGroup();
    this.decorate(r);
    // door
    // the door sits in the back wall, its foot on the floor line (the PixelLab door is a full doorway)
    this.door = this.add.image(r.w / 2, 60, "p_door_locked").setOrigin(0.5, 1).setScale(2).setDepth(2);
    this.doorZone = new Phaser.Geom.Rectangle(r.w / 2 - 40, 0, 80, 46);
    this.add.text(r.w / 2, 40, r.boss ? "" : "EXIT", { fontFamily: FONT, fontSize: "10px", color: "#ffffff" }).setOrigin(0.5).setDepth(2);
    // room title
    const t = this.add.text(r.w / 2, r.h / 2 - 60, r.name.toUpperCase(), { fontFamily: FONT, fontSize: "28px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setDepth(950).setShadow(3, 3, "#000", 0);
    this.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 700, onComplete: () => t.destroy() });
    // props
    for (const p of r.props ?? []) if (evalCond(p.cond, G.s)) this.addProp(p);
    if (r.gunCrate) this.time.delayedCall(600, () => this.maybeGunCrate(true));
    // quest pickups
    for (const { quest, spot } of pickupsInDungeon(G.s, this.dungeon.id, this.roomIdx)) {
      const x = r.w * (0.15 + Math.random() * 0.7);
      const y = r.h * (0.25 + Math.random() * 0.3);
      const spr = this.add.image(x, y, "p_scroll").setScale(2).setDepth(20);
      this.tweens.add({ targets: spr, y: y - 6, yoyo: true, repeat: -1, duration: 600 });
      const glow = this.add.circle(x, y, 16, 0xffd23f, 0.25).setDepth(19);
      this.pickups.push({
        spr,
        kind: "quest",
        value: 0,
        onCollect: () => {
          glow.destroy();
          collectPickup(G.s, quest, spot);
          synth.play("pickup");
          this.toast("PERSONAL QUEST", `${quest.title}: ${spot.label}`);
        },
      });
    }
  }

  private decorate(r: RoomDef) {
    const rnd = new Phaser.Math.RandomDataGenerator([`${this.dungeon.id}${this.roomIdx}`]);
    // PixelLab set dressing along the walls, clear of the centre lane and the door
    const decor = [0, 1, 2].map((i) => `dec_${r.theme}_${i}`).filter((k) => this.textures.exists(k));
    if (decor.length) {
      const spots: [number, number][] = [];
      for (let x = 90; x < r.w - 90; x += 150) spots.push([x, 92], [x, r.h - 60]);
      for (let y = 180; y < r.h - 120; y += 160) spots.push([60, y], [r.w - 60, y]);
      spots.forEach(([x, y], i) => {
        if (Math.abs(x - r.w / 2) < 110 || rnd.frac() < 0.45) return;
        const k = decor[i % decor.length];
        this.add.image(x, y + 24, k).setOrigin(0.5, 1).setDepth(y + 24);
        this.obstacles.add(this.add.rectangle(x, y + 10, 44, 24, 0, 0));
      });
    }
    const n = r.boss || r.theme === "colon" ? 0 : 3;
    for (let i = 0; i < n; i++) {
      const x = rnd.between(140, r.w - 140);
      const y = rnd.between(160, r.h - 200);
      if (Math.abs(x - r.w / 2) < 120) continue;
      const pillarKey = `pillar_${r.theme}`;
      const art = this.textures.exists(pillarKey);
      const pillar = this.add.rectangle(x, y, 40, 40, r.theme === "wiki" ? 0xc8ccd1 : 0x000000, art ? 0 : r.theme === "wiki" ? 1 : 0.35).setDepth(3);
      if (!art) pillar.setStrokeStyle(2, 0x000000, 0.4);
      else this.add.image(x, y + 20, pillarKey).setOrigin(0.5, 1).setDepth(y + 20);
      this.obstacles.add(pillar);
      if (r.theme === "wiki" && !art) this.add.text(x, y, "[edit]", { fontFamily: FONT, fontSize: "9px", color: "#3366cc" }).setOrigin(0.5).setDepth(4);
    }
    // flavour
    const flav: Record<string, string[]> = {
      school: ["LOST PROPERTY: 1x Krez-ouser", "NO WONKING IN CORRIDORS", "Wildern (Krelford branch)"],
      mansion: ["Polson Towers Wi-Fi: cheese", "Shoes OFF", "Shoes ON"],
      network: ["Mutual friends: 0", "Seen", "Pending…", "Typing…"],
      industrial: ["PRESSURE: LOW", "DO NOT DRINK", "Extra Virgin Krezz Oil"],
      temple: ["THOU SHALT REACT", "AND I MEAN IT", "pls"],
      prison: ["6 KREZ YEARS", "Ok, makes sense", "VERSION B"],
      wiki: ["[citation needed]", "This page does not exist", "Talk", "Edit source"],
      colon: ["HAUSTRA", "MUCOSA (WET)", "1x SWEETCORN (2019)", "DO NOT TOUCH THE WALLS"],
    };
    const list = flav[r.theme] ?? [];
    list.forEach((txt, i) => {
      this.add.text(60 + i * (r.w / Math.max(1, list.length)), r.h - 46, txt, { fontFamily: FONT, fontSize: "10px", color: "#ffffff" }).setAlpha(0.35).setDepth(2);
    });
    if (r.theme === "industrial") for (let x = 40; x < r.w - 40; x += 64) this.add.image(x, 34, "p_pipe").setScale(2).setDepth(1).setAlpha(0.8);
  }

  private addProp(p: PropDef) {
    const r = this.room;
    const x = r.w * p.x;
    const y = this.side ? this.groundY - 20 : r.h * p.y;
    switch (p.kind) {
      case "wonking_machine": {
        const spr = this.add.image(x, y, "p_wonking").setScale(2.4).setDepth(y);
        this.obstacles.add(this.add.rectangle(x, y + 10, 80, 70, 0, 0));
        this.add.text(x, y - 66, "WONKING MACHINE", { fontFamily: FONT, fontSize: "11px", color: "#ffd23f", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(y + 1);
        this.machineUses[p.id!] = 0;
        this.interactables.push({ x, y: y + 60, r: 70, label: "Use the Wonking Machine", use: () => this.useWonkingMachine(p.id!, spr) });
        break;
      }
      case "vending": {
        this.add.image(x, y, "p_vending").setScale(2).setDepth(y);
        this.interactables.push({ x, y: y + 40, r: 50, label: "Pussy Juice Vending (15 Krezzcoin)", use: () => this.useVending(x, y) });
        break;
      }
      case "mollor": {
        // tied to a chair, very cross
        const chair = this.add.rectangle(x, y + 14, 44, 30, 0x7c2d12).setDepth(y - 1);
        const spr = this.add.sprite(x, y, this.textures.exists("spr_MOLLOR") ? "spr_MOLLOR" : "spr_FOLK1", 0).setScale(2.4).setDepth(y);
        const ropes = this.add.graphics().setDepth(y + 1);
        ropes.lineStyle(4, 0xd6b370, 1);
        for (const dy of [-6, 6, 16]) ropes.lineBetween(x - 22, y + dy, x + 22, y + dy + 3);
        this.obstacles.add(this.add.rectangle(x, y + 10, 50, 40, 0, 0));
        void chair;
        this.interactables.push({ x, y: y + 50, r: 70, label: "Untie Mollor", enabled: () => !G.s.flags.mollor_freed, use: () => void this.rescueMollor(spr, ropes) });
        break;
      }
      case "valve": {
        const spr = this.add.image(x, y, "p_valve").setScale(2.4).setDepth(y);
        this.interactables.push({
          x,
          y,
          r: 60,
          label: "Open main valve",
          enabled: () => !G.s.flags[`valve_${p.id}`],
          use: () => {
            G.s.flags[`valve_${p.id}`] = true;
            spr.setTexture("p_valve_open");
            synth.play("explode");
            this.aoe(x, y, 160, 30, { knock: 420, color: 0xffb6c1 });
            this.floatText(x, y - 40, "PRESSURE RESTORED", "#ffb6c1", 14);
            const all = (this.room.props ?? []).filter((q) => q.kind === "valve").every((q) => G.s.flags[`valve_${q.id}`]);
            if (all) {
              G.s.flags.valves_done = true;
              this.toast("PUMPING STATION ALPHA", "All valves open. Pussy juice is flowing back to Krelford.");
              this.checkExit();
            }
          },
        });
        break;
      }
      case "tv": {
        this.add.image(x, y, "p_tv").setScale(2).setDepth(y);
        this.interactables.push({ x, y: y + 30, r: 50, label: "Watch KrelTV", use: () => this.openTV() });
        break;
      }
      case "sign": {
        this.add.image(x, y, "p_sign").setScale(2).setDepth(y);
        this.interactables.push({ x, y: y + 30, r: 60, label: "Read", use: () => this.talk([dir(p.label ?? "")]) });
        break;
      }
      case "witness": {
        const sp = p.speaker!;
        if (sp === "THE FRIDGE") this.add.image(x, y, "p_fridge").setScale(2.2).setDepth(y);
        else this.add.sprite(x, y, `spr_${sp}`, 0).setScale(2.2).setDepth(y);
        this.add.text(x, y - 46, sp === "THE FRIDGE" ? "THE FRIDGE" : CHARACTERS[sp]?.name ?? sp, { fontFamily: FONT, fontSize: "10px", color: "#ffd23f", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(y + 1);
        this.interactables.push({ x, y: y + 20, r: 60, label: `Question ${sp === "THE FRIDGE" ? "the Fridge" : CHARACTERS[sp]?.name}`, use: () => this.questionWitness(p.id!) });
        break;
      }
      case "evidence_board": {
        this.add.image(x, y, "p_board").setScale(2.2).setDepth(y);
        this.add.text(x, y - 40, "EVIDENCE BOARD", { fontFamily: FONT, fontSize: "10px", color: "#ffd23f", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(y + 1);
        this.interactables.push({ x, y: y + 20, r: 60, label: "Make an accusation", enabled: () => !G.s.flags.cheesegate_solved, use: () => this.accuse() });
        break;
      }
      case "talker": {
        const key = p.image ?? `spr_${p.speaker}`;
        const big = key.startsWith("p_");
        const tex = this.textures.exists(key) ? key : "p_sign";
        const spr = key.startsWith("spr_") ? this.add.sprite(x, y, tex, 0).setScale(this.side ? 2.6 : 2.2) : this.add.image(x, y, tex).setScale(big ? (this.side ? (key === "p_hottub" ? 1.5 : 1.25) : 1.2) : 2);
        spr.setDepth(this.side ? 7 : y);
        if (this.side) spr.setOrigin(0.5, 1).setY(this.groundY + 2);
        if (key === "p_gabor") this.tweens.add({ targets: spr, angle: 4, yoyo: true, repeat: -1, duration: 500 });
        const topY = this.side ? this.groundY - spr.displayHeight - 12 : y - spr.displayHeight / 2 - 10;
        this.add.text(x, topY, p.label ?? "", { fontFamily: FONT, fontSize: "10px", color: "#ffd23f", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(this.side ? 8 : y + 1);
        const verb = p.action === "hottub" ? "Get in the hot tub" : p.action === "jukebox" ? "Change the song" : p.action === "pepsi" ? "Buy a Pepsi (5)" : `Talk to ${p.label ?? "them"}`;
        this.interactables.push({ x, y: this.side ? this.groundY - 24 : y + 20, r: this.side ? 80 : 70, label: verb, use: () => void this.useTalker(p) });
        break;
      }
      case "npc": {
        this.add.sprite(x, y, `spr_${p.speaker}`, 0).setScale(2.2).setDepth(y);
        this.add.text(x, y - 46, "POLSON (MORK MODE)", { fontFamily: FONT, fontSize: "10px", color: "#ffd23f", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(y + 1);
        this.interactables.push({ x, y: y + 20, r: 60, label: "Interpret the Mork Voice", enabled: () => !G.s.flags.mork_done, use: () => this.morkVoice() });
        break;
      }
      case "bertha": {
        this.add.image(x, y, "p_bertha").setScale(2.4).setDepth(y);
        this.interactables.push({ x, y: y + 40, r: 70, label: "Inspect Big Bertha", use: () => this.inspectBertha() });
        break;
      }
      case "phone": {
        this.add.image(x, y, "p_terminal").setScale(1.2).setDepth(y);
        this.add.text(x, y - 30, "16/04/2022", { fontFamily: FONT, fontSize: "10px", color: "#7fb3ff", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(y + 1);
        this.interactables.push({ x, y, r: 60, label: "Fragmar Prime: send the messages (in the right order)", enabled: () => !G.s.flags.fragmar_prime, use: () => this.fragmarPrime() });
        break;
      }
      case "crystal_wall": {
        // the cum crystal, wedged in the colon wall
        const glow = this.add.circle(x, y, 46, 0xfff1f2, 0.25).setDepth(y - 1).setBlendMode(Phaser.BlendModes.ADD);
        this.add.ellipse(x, y + 4, 90, 60, 0x9f1239).setStrokeStyle(4, 0x4c0519).setDepth(y - 2);
        const cr = this.add.image(x, y, this.textures.exists("cum_crystal") ? "cum_crystal" : "p_scroll").setDepth(y);
        cr.setScale(56 / Math.max(cr.height, 1));
        this.tweens.add({ targets: [glow], scale: 1.3, alpha: 0.1, yoyo: true, repeat: -1, duration: 700 });
        const lab = this.add.text(x, y - 48, "THE CUM CRYSTAL (WEDGED)", { fontFamily: FONT, fontSize: "10px", color: "#ffd23f", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(y + 1);
        if (G.s.flags.rik_crystal_taken) [glow, cr, lab].forEach((o) => o.destroy());
        this.interactables.push({
          x,
          y: y + 40,
          r: 70,
          label: "Prise out the cum crystal",
          enabled: () => !G.s.flags.rik_crystal_taken,
          use: () => void this.takeRikCrystal([glow, cr, lab]),
        });
        break;
      }
      case "bomb_spot": {
        const ring = this.add.circle(x, y, 26, 0xef4444, 0.22).setStrokeStyle(3, 0xef4444).setDepth(3);
        this.tweens.add({ targets: ring, scale: 1.2, yoyo: true, repeat: -1, duration: 500 });
        const key = `rik_bomb_${p.id}`;
        if (G.s.flags[key]) this.plantedBomb(x, y, ring);
        this.interactables.push({
          x,
          y,
          r: 55,
          label: "Plant a bomb",
          enabled: () => !G.s.flags[key],
          use: () => {
            if (!G.s.flags.rik_crystal_taken) {
              this.toast("NOT YET", "Get the crystal out first. You don't want to blow it up with him.");
              return;
            }
            G.s.flags[key] = true;
            synth.play("pickup");
            this.plantedBomb(x, y, ring);
            const all = (this.room.props ?? []).filter((q) => q.kind === "bomb_spot");
            const n = all.filter((q) => G.s.flags[`rik_bomb_${q.id}`]).length;
            if (n < all.length) this.toast(`BOMB ${n} OF ${all.length} PLANTED`, n === 1 ? "SANMIK (radio): Yee. Lovely. Keep going." : n === 2 ? "GENIE (radio): Hurry. Something just MOVED in there." : "SANMIK (radio): One more, then leg it.");
            else void this.colonFinale();
          },
        });
        break;
      }
      case "reaction_terminal": {
        const spr = this.add.image(x, y, "p_terminal").setScale(2.4).setDepth(y);
        this.add.text(x, y - 50, "REACTION NETWORK TERMINAL", { fontFamily: FONT, fontSize: "10px", color: "#7fb3ff", backgroundColor: "#000000aa" }).setOrigin(0.5).setDepth(y + 1);
        this.interactables.push({
          x,
          y: y + 40,
          r: 70,
          label: "Restore the Reaction Network",
          enabled: () => !G.s.flags.network_restored,
          use: () => this.restoreNetwork(spr),
        });
        break;
      }
    }
  }

  private plantedBomb(x: number, y: number, ring: Phaser.GameObjects.Arc) {
    this.tweens.killTweensOf(ring);
    ring.setScale(1).setFillStyle(0x111111, 0.4);
    this.add.circle(x, y, 13, 0x1f2937).setStrokeStyle(2, 0x000000).setDepth(y);
    this.add.rectangle(x + 6, y - 12, 3, 9, 0xd6b370).setDepth(y);
    const led = this.add.circle(x, y, 4, 0xff2020).setDepth(y + 1);
    this.tweens.add({ targets: led, alpha: 0.15, yoyo: true, repeat: -1, duration: 300 });
    this.add.text(x, y + 22, "ARMED", { fontFamily: FONT, fontSize: "9px", color: "#fca5a5", fontStyle: "bold" }).setOrigin(0.5).setDepth(y + 1);
  }

  private async takeRikCrystal(objs: Phaser.GameObjects.GameObject[]) {
    G.s.flags.rik_crystal_taken = true;
    synth.play("splat");
    this.shake(300, 0.01);
    objs.forEach((o) => o.destroy());
    this.floatText(this.player.x, this.player.y - 50, "*SHLOOORP*", "#fda4af", 18);
    await this.talk([
      dir("You get both hands round the cum crystal and pull. The colon pulls back. You pull harder. With a noise you will hear for the rest of your life, it comes free."),
      say("UNCLE RIK", "(from somewhere above, booming) OI. WHO'S IN THERE. I FELT THAT."),
      say("SANMIK", "(radio) Yee. Now the bombs. Four of 'em. The red circles. Leave him a present."),
      dir("NEW OBJECTIVE: plant all four bombs (the red circles)."),
    ]);
  }

  /** The bombs are in. Out you go, back to full size… and then Uncle Rik's tummy. */
  private async colonFinale() {
    const s = G.s;
    this.busy = true;
    for (const e of [...this.enemies]) if (!e.dead) this.damageEnemy(e, 99999, { noWonk: true, label: "" });
    for (const sh of [...this.shots]) this.killShot(sh);
    await this.talk([
      say("SANMIK", "(radio) That's all four. LEG IT. Back the way you came. The Genie's reversing the shrink ray."),
      dir("You run. Past the poo. Past the gerbils. Past a tumour, who shouts something about being cancerous as you go by. Then the shrink ray finds you, and the world goes white."),
    ]);
    const cam = this.cameras.main;
    cam.flash(500, 255, 255, 255);
    synth.play("lob");
    await new Promise<void>((r) => this.time.delayedCall(600, () => r()));
    // outside: Catford, full size, Uncle Rik having a sit-down
    const cx = cam.scrollX + cam.width / 2;
    const cy = cam.scrollY + cam.height / 2;
    const bg = this.add.rectangle(cx, cy, 4000, 4000, 0x0b1a2a).setDepth(1500);
    const tub = this.add.ellipse(cx, cy + 140, 700, 70, 0x1e293b).setDepth(1501);
    const ps = this.player.spr;
    const phd = (ps.texture.customData as { hd?: number } | undefined)?.hd ?? 1;
    const tex = this.textures.exists("p_rik") ? "p_rik" : "boss_rik";
    const frameH = this.textures.get(tex).get(0).height;
    await this.talk([
      dir("Catford. You pop out of the shrink ray at full size, next to the Giant Hot Tub. Uncle Rik is sat on the edge of it, scratching his belly."),
      say("UNCLE RIK", "'Ello. Thought I 'eard summink. You ain't got me crystal, 'ave ya."),
      say(s.player, "Have a look in your ass."),
    ]);
    await forcedKreltality(
      this,
      { key: tex, frame: 0, x: cx + 40, y: cy, scale: 210 / frameH, flip: true, name: "UNCLE RIK" },
      { key: ps.texture.key, frame: 0, scale: ps.scaleX / phd },
      "bellybomb",
    );
    bump(s, "kreltalities");
    s.flags.krel_rik = true;
    bg.destroy();
    tub.destroy();
    cam.startFollow(this.player.spr, true, 0.12, 0.12);
    await this.talk([say("SANMIK", "that's for everything u did to me in the past!!!!")]);
    await this.crystalGet({ bossId: "rik" } as unknown as Boss);
    if (s.chapter === 5 && !s.flags.ch5_clear) {
      s.flags.ch5_clear = true;
      s.coins += Math.round(200 * activeMods(s).questRewardMult * 2);
      s.bottles = maxBottles(s);
      G.unlockArchive("arch_godric");
      G.unlockArchive("arch_crobley");
      G.drongus("boss_defeated");
    }
    s.flags.rik_bombs_done = true;
    s.flags.sanmik_catford = true;
    for (const k of Object.keys(s.flags)) if (k.startsWith("rik_bomb_") || k === "rik_crystal_taken") delete s.flags[k];
    delete s.flags[clearKey(this.dungeon.id, 0)];
    s.coins += 150;
    s.hp = maxHp(s);
    s.phase = "hub";
    G.save();
    this.time.delayedCall(800, () => {
      this.transitioning = true;
      switchTo(this, "Vignette", { id: "sanmik_finale", returnAt: this.dungeon.returnAt });
    });
  }

  /** The Genie's shrink ray: zap, and you're four millimetres tall. */
  private async shrinkRay() {
    this.busy = true;
    const p = this.player.spr;
    await this.talk([
      say("GENIE", "(from the lamp) I can get you in there. I have a shrink ray. Don't ask why a genie has a shrink ray. I've had a long life."),
      say("SANMIK", "Yee. Shrink 'em. Go in. Get the crystal. And while you're in there… leave him a present."),
      dir("The Genie hands you a bag. It's full of bombs. Four of them. You don't ask either."),
    ]);
    const lamp = this.add.circle(p.x - 160, p.y - 60, 10, 0xffd23f).setDepth(p.depth + 2);
    synth.play("lob");
    const beam = this.add.rectangle(lamp.x, lamp.y, 10, 14, 0x67e8f9, 0.9).setOrigin(0, 0.5).setDepth(p.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
    beam.setRotation(Phaser.Math.Angle.Between(lamp.x, lamp.y, p.x, p.y));
    const len = Phaser.Math.Distance.Between(lamp.x, lamp.y, p.x, p.y);
    await new Promise<void>((r) => this.tweens.add({ targets: beam, width: len, duration: 250, onComplete: () => r() }));
    this.cameras.main.flash(200, 160, 255, 255);
    for (let i = 0; i < 5; i++) {
      synth.play("tap");
      await new Promise<void>((r) => this.time.delayedCall(90, () => r()));
    }
    const sc0 = p.scaleX;
    await new Promise<void>((r) => this.tweens.add({ targets: p, scaleX: sc0 * 0.05, scaleY: sc0 * 0.05, duration: 900, ease: "Quad.in", onComplete: () => r() }));
    this.floatText(p.x, p.y - 20, "*zwoooop*", "#67e8f9", 16);
    beam.destroy();
    lamp.destroy();
    await this.talk([dir("You are now four millimetres tall. Uncle Rik bends over to see where you've gone. That's all the opening you need.")]);
    this.cameras.main.fadeOut(600, 60, 0, 20);
    await new Promise<void>((r) => this.time.delayedCall(700, () => r()));
  }

  /** SanChz, the Job Centre staff toilet, and a jam donut. */
  private async donutScene() {
    if (G.s.flags.sm_donut) {
      await this.talk([say("SANCHZ", "We don't talk about it. YEGHHH.")]);
      return;
    }
    const chz = this.bros.find((b) => b.id === "SANCHZ");
    chz?.spr.setVisible(false);
    await this.talk([
      dir("You push the door. It isn't locked. It was never locked. Some part of him wanted to be found."),
      dir("The Job Centre staff toilet has been transformed. Tealights on the cistern. Rose petals in the sink. A small speaker playing slow jams."),
      dir("And there is SanChz. And there, cradled tenderly in both of his hands, is a jam donut."),
      say("SANCHZ", "…"),
      say("SANCHZ", "It's not what it looks like."),
      say(G.s.player, "It looks like you're making sweet love to a jam donut, mate."),
      say("SANCHZ", "…It's exactly what it looks like."),
      dir("The donut, to its credit, looks content."),
      say("SANMIK", "(bursting in) YEEE — oh. Oh SanChz. Not again. Not in the Job Centre."),
      say("SANCHZ", "She's called Jaqueline. We met at Greggs. She gets me. YEGHHH."),
      gabor("Was that allowed? I don't think that was allowed. Report me. No, report HIM. Report both of us."),
      dir("Outside, the whole Job Centre shakes. Something enormous is rolling across the car park, screaming a name."),
      say("SANMIK", "…SanChz. Whose donut is that."),
      say("SANCHZ", "…Her mum's quite important."),
    ]);
    chz?.spr.setVisible(true);
    G.s.flags.sm_donut = true;
    this.checkExit();
  }

  private talkerVisits: Record<string, number> = {};
  private jukeIdx = 0;

  private async useTalker(p: PropDef) {
    const key = p.label ?? "";
    const n = (this.talkerVisits[key] = (this.talkerVisits[key] ?? 0) + 1);
    const lines = (p.lines ?? []).map((l) => (l.dir ? dir(l.t) : say(l.s, l.t)));
    const s = G.s;
    switch (p.action) {
      case "hottub":
        await this.talk(lines.slice(0, n === 1 ? lines.length : 2));
        s.hp = maxHp(s);
        this.floatText(this.player.x, this.player.y - 50, "FULL HP (and a bit damp)", "#7fdfff", 14);
        synth.play("heal");
        return;
      case "begour_hug":
        await this.talk(n === 1 ? lines : [lines[lines.length - 1]]);
        s.hp = Math.min(maxHp(s), s.hp + 30);
        this.floatText(this.player.x, this.player.y - 50, "+30 HP (BEAR HUG)", "#86efac", 14);
        synth.play("heal");
        return;
      case "pepsi":
        if (s.coins < 5) {
          await this.talk([dir("The machine wants 5 Krezzcoin. You have less than that. The machine knows.")]);
          return;
        }
        s.coins -= 5;
        s.hp = Math.min(maxHp(s), s.hp + 15);
        await this.talk([lines[(n - 1) % lines.length]]);
        this.floatText(this.player.x, this.player.y - 50, "+15 HP", "#86efac", 14);
        synth.play("pickup");
        return;
      case "jukebox": {
        const songs = ["ggg8", "ggg13", "ggg6", "ggg12", "ggg4", "ggg9", "ggg3", "ggg10"];
        const titles: Record<string, string> = { ggg8: "Gettin Crunk Wiv SanChz", ggg13: "In Tha Hot Tub", ggg6: "Peener Colarder", ggg12: "I Love Christmas", ggg4: "Viva Reggaeton", ggg9: "Wank Til U Spunk", ggg3: "I Don't Need Yhu", ggg10: "Fragrant Bitch" };
        const id = songs[this.jukeIdx++ % songs.length];
        synth.music(id, true);
        this.toast("♪ JUKEBOX", `SanMik & SanChz — "${titles[id]}"`);
        return;
      }
      case "donut":
        if (!this.roomCleared) {
          await this.talk([dir("ENGAGED. From inside: a soft, rhythmic creaking. And… is that Marvin Gaye?"), say("SANCHZ", "(muffled) Busy. Mork. Clear the Job Centre first.")]);
          return;
        }
        await this.donutScene();
        return;
      case "kick_gabor":
        await this.talk(n === 1 || lines.length < 2 ? lines : [lines[1 + ((n - 2) % (lines.length - 1))]]);
        if (n > 1) {
          this.floatText(this.player.x + 60, this.player.y - 60, "*BAAA* (thank you)", "#ffffff", 13);
          synth.play("hit");
        }
        return;
      default:
        await this.talk(lines);
    }
  }

  // ------------------------------------------------------------------ room flow

  private async startRoom() {
    const r = this.room;
    this.busy = true;
    const enter: Line[] = (r.enterLines ?? []).map((l) => ({ s: l.s, t: l.t, dir: l.dir, cond: l.cond, tag: "new" as const }));
    if (r.event === "cheesegate") enter.push(...DOMESTICS[0].lines);
    if (r.event === "mork") enter.push(...DOMESTICS[2].lines);
    if (r.rule) {
      const rule = BAN_RULES.find((b) => b.id === r.rule) ?? null;
      enter.push(say("DRONGUS", rule?.decree ?? "NEW RULE.", { notify: true, sfx: "decree" }));
    }
    if (enter.length) await this.talk(enter);
    if (r.event === "anthem") await this.anthemEvent();
    if (r.rule) this.setRule(BAN_RULES.find((b) => b.id === r.rule) ?? null, false);
    if (this.roomIdx === 0) G.drongus("enter_dungeon");
    this.busy = false;
    if (this.resumed) this.toast("PROGRESS SAVED", `Picking up where you left off: room ${this.roomIdx + 1} of ${this.dungeon.rooms.length}.`);
    if (!r.boss && G.s.flags[clearKey(this.dungeon.id, this.roomIdx)]) {
      this.roomCleared = true;
      this.checkExit();
      return;
    }
    if (r.boss) {
      const rush = this.room.bossRush ?? [];
      if (this.rushIdx > 0 && rush[this.rushIdx - 1]) {
        // back from the dead mid-rush: the Crobley you died on, on its own set
        const cur = rush[this.rushIdx - 1];
        if (cur.backdrop && this.sideBg && this.textures.exists(cur.backdrop)) {
          const src = this.textures.get(cur.backdrop).getSourceImage();
          this.sideBgScale = 540 / src.height;
          this.sideBg.setTexture(cur.backdrop).setTileScale(this.sideBgScale);
        }
        this.toast(`CROBLEY ${this.rushIdx + 1} OF ${rush.length + 1}`, "Checkpoint: straight back in where you died.");
        await this.startBoss(cur.boss, cur.hp ?? 1);
      } else await this.startBoss();
      return;
    }
    if (this.spice?.begin()) {
      // the twist runs the room (e.g. SURVIVE)
    } else if (this.waves.length) this.time.delayedCall(500, () => this.nextWave());
    else if (r.triggers?.length) {
      // run and gun: enemies turn up as you push right
      if (this.roomIdx > 0 || r.triggers.length) this.toast(r.tower ? "CLIMB" : "RUN AND GUN", r.tower ? "Jump from platform to platform. The Squeezing Room is at the very top." : "Push right. They'll come to you.");
    } else {
      this.roomCleared = true;
      this.markCleared();
      this.checkExit();
    }
  }

  private nextWave() {
    this.waveIdx++;
    if (this.waveIdx >= this.waves.length) {
      this.waveActive = false;
      this.onRoomCleared();
      return;
    }
    this.waveActive = true;
    const wave = this.waves[this.waveIdx];
    for (const [type, count] of wave) {
      for (let i = 0; i < count; i++) {
        let x = Phaser.Math.Between(this.bounds.left + 60, this.bounds.right - 60);
        let y = Phaser.Math.Between(this.bounds.top + 60, this.bounds.centerY + 40);
        if (this.side) {
          // in front of you or behind you, on the ground (or in the air for the flying ones)
          const dir = Math.random() < 0.7 ? 1 : -1;
          x = Phaser.Math.Clamp(this.player.x + dir * Phaser.Math.Between(260, 620), this.bounds.left + 60, this.bounds.right - 60);
          y = this.isFlyer(type) ? Phaser.Math.Between(140, this.groundY - 180) : this.groundY - 50;
        }
        this.spawnPortal(x, y, () => this.spawnEnemy(type, x, y));
      }
    }
  }

  private spawnPortal(x: number, y: number, then: () => void) {
    if (hasVfx(this, "vfx_smoke")) {
      this.pendingSpawns++;
      vfx(this, "vfx_smoke", x, y + 10, { scale: 0.9, depth: 3, tint: 0xd8b4fe });
      this.time.delayedCall(320, () => {
        this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
        then();
      });
      return;
    }
    const c = this.add.circle(x, y, 4, 0xc084fc, 0.7).setDepth(3);
    this.pendingSpawns++;
    this.tweens.add({ targets: c, radius: 22, alpha: 0.2, duration: 520, onComplete: () => {
      c.destroy();
      this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
      then();
    } });
  }

  private onRoomCleared() {
    if (this.roomCleared) return;
    this.roomCleared = true;
    this.markCleared();
    synth.play("ding");
    this.player?.cheer(this.now(), 1300);
    for (let i = 0; i < 6; i++) this.dropPickup(this.player.x + (Math.random() - 0.5) * 140, this.player.y - 40 + (Math.random() - 0.5) * 80, "coin", 3);
    // every cleared room pays out some ammo
    if (ownedGuns().length) this.dropPickup(this.player.x + 40, this.player.y - 30, "ammo", 1.5);
    coolBanRisk(G.s, 15);
    this.maybeGunCrate();
    this.checkExit();
  }

  /** Weapon crates: the first cleared room always has one until you own a gun, then about one room in three. */
  private maybeGunCrate(force = false) {
    const s = G.s;
    const first = !ownedGuns(s).length;
    if (!force && !first && Math.random() > 0.33) return;
    const x = this.side ? Phaser.Math.Clamp(this.player.x + 90, 80, this.room.w - 160) : this.bounds.centerX + (Math.random() - 0.5) * 120;
    const y = this.side ? this.groundY - 26 : this.bounds.centerY + 40;
    const tex = this.textures.exists("p_gun_crate") ? "p_gun_crate" : "p_bin";
    const crate = fitTo(this.add.image(x, y, tex), 46).setDepth(14);
    const glow = this.add.circle(x, y + 10, 30, 0x67e8f9, 0.18).setDepth(13);
    this.tweens.add({ targets: glow, alpha: 0.05, scale: 1.3, yoyo: true, repeat: -1, duration: 700 });
    this.tweens.add({ targets: crate, y: y - 4, yoyo: true, repeat: -1, duration: 900, ease: "Sine.easeInOut" });
    let opened = false;
    this.toast(first ? "WEAPON CRATE" : "WEAPON CRATE", first ? "Something glowing dropped in. Walk over and press E." : "A weapons crate appeared. Press E to open it.");
    this.interactables.push({
      x,
      y,
      r: 60,
      label: "Open the weapons crate",
      enabled: () => !opened,
      use: () => {
        opened = true;
        synth.play("door");
        this.tweens.killTweensOf([crate, glow]);
        glow.destroy();
        this.tweens.add({ targets: crate, alpha: 0, scaleX: crate.scaleX * 1.4, scaleY: crate.scaleY * 0.6, duration: 260, onComplete: () => crate.destroy() });
        const r = rollCrate(s);
        if (r.gun) {
          const icon = fitTo(this.add.image(x, y - 10, r.gun.tex), 44).setDepth(700);
          this.tweens.add({ targets: icon, y: y - 70, duration: 600, ease: "Back.easeOut" });
          this.tweens.add({ targets: icon, alpha: 0, delay: 1600, duration: 400, onComplete: () => icon.destroy() });
          synth.play("cheer");
          this.toast(`NEW GUN: ${r.gun.name.toUpperCase()}`, `${r.gun.blurb} Now in your hand. ${ownedGuns(s).length === 1 ? "X / GUN swaps back to the Fart Blaster (infinite ammo)." : "X / GUN cycles weapons."}`);
        } else if (r.ammoFor) {
          this.floatText(x, y - 40, `+${r.amount} ${r.ammoFor.name.toUpperCase()} AMMO`, "#67e8f9", 14);
          synth.play("pickup");
        } else {
          this.floatText(x, y - 40, "Empty. Someone's had it.", "#ffffff", 13);
          for (let i = 0; i < 4; i++) this.dropPickup(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 40, "coin", 4);
        }
      },
    });
  }

  private checkExit() {
    const r = this.room;
    if (!this.roomCleared) return;
    if (r.exitFlag && !G.s.flags[r.exitFlag]) {
      this.toast("EXIT LOCKED", r.exitHint ? r.exitHint : r.event === "cheesegate" ? "Solve Cheesegate first." : r.event === "mork" ? "Interpret the Mork Voice first." : r.event === "valves" ? "Open all three valves." : "Restore the Reaction Network first.");
      return;
    }
    if (r.boss) return;
    this.door.setTexture("p_door");
    this.toast("ROOM CLEAR", this.room.tower ? "The door at the top is open." : this.side ? "The exit is open (far right →)." : "The exit is open (top of the room).");
  }

  private exitOpen() {
    return this.door.texture.key === "p_door";
  }

  private goNextRoom() {
    if (this.busy) return;
    this.busy = true;
    synth.play("door");
    G.save();
    if (this.room.then?.length) {
      // a detour through other scenes (a minigame, a car chase) before the next room
      const [first, ...rest] = this.room.then;
      const resume = { dungeon: this.dungeon.id, room: this.roomIdx + 1 };
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.transitioning = true;
        runChain(this, [first, ...rest], resume);
      });
      return;
    }
    if (this.roomIdx + 1 >= this.dungeon.rooms.length) {
      // a hang-out with nowhere further to go: back to Krelford
      G.s.phase = "hub";
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.transitioning = true;
        switchTo(this, "Hub", { at: this.dungeon.returnAt ?? "PUB", from: "dungeon" });
      });
      return;
    }
    this.cameras.main.fadeOut(250);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.transitioning = true;
      this.scene.restart({ dungeon: this.dungeon.id, room: this.roomIdx + 1 });
    });
  }

  private cleanup() {
    this.companion?.destroy();
    this.companion = null;
    for (const b of this.bros) b.destroy();
    this.bros = [];
    this.sideLevel?.destroy();
    this.sideLevel = null;
    this.spice?.destroy();
    this.spice = null;
    this.player?.destroy();
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    for (const sh of this.shots) sh.spr.destroy();
    this.shots = [];
    this.removeListeners();
  }

  private removeListeners() {
    for (const ev of ["prophecy", "krezz-burst", "drop-heal", "decree", "drongus-decree", "conflict", "player-dodge", "player-heal", "player-special", "ui-resume"]) this.events.removeAllListeners(ev);
    this.rule = null;
    G.emit("rule", null);
  }

  // ------------------------------------------------------------------ Reinhardt Crobley: the end

  /** Cartoon blood: little red bits that arc, fall and leave splats on the floor. */
  /** A drawn explosion (PixelLab VFX), with smoke after; false if the art isn't loaded. */
  boomFx(x: number, y: number, size = 1, depth = 965): boolean {
    const big = size >= 1.3 && hasVfx(this, "vfx_bigboom");
    const s = vfx(this, big ? "vfx_bigboom" : "vfx_boom", x, y, { scale: big ? size : size * 1.2, depth });
    if (!s) return false;
    vfx(this, "vfx_smoke", x + (Math.random() - 0.5) * 20, y - 10 * size, { scale: size, depth: depth - 1, delay: 380 });
    return true;
  }

  private gore(x: number, y: number, n: number, power = 1, upward = false) {
    const floor = this.side ? this.groundY : this.bounds.bottom;
    if (hasVfx(this, "vfx_blood")) {
      // drawn blood: a burst (or a gush upwards), meat if it's a lot, a pool where it lands
      const k = Math.min(2.4, 0.6 + n / 40) * Math.max(0.8, power * 0.8);
      vfx(this, upward && hasVfx(this, "vfx_bloodspray") ? "vfx_bloodspray" : "vfx_blood", x, y, { scale: k, depth: 960, flipX: Math.random() < 0.5 });
      if (n >= 30) vfx(this, "vfx_gore", x, y, { scale: k * 0.8, depth: 961, delay: 60 });
      const pool = vfx(this, "vfx_bloodpool", x + (Math.random() - 0.5) * 20, floor - 1, { scale: Math.min(1.8, 0.6 + n / 50), depth: 6, hold: true, delay: 250 });
      if (pool) this.tweens.add({ targets: pool, alpha: 0, delay: 9000, duration: 3000, onComplete: () => pool.destroy() });
      return;
    }
    for (let i = 0; i < n; i++) {
      const sz = 2 + Math.random() * 5;
      const r = this.add.rectangle(x, y, sz, sz, Math.random() < 0.7 ? 0xdc2626 : 0x7f1d1d).setDepth(960);
      let vx = (Math.random() - 0.5) * 9 * power;
      let vy = upward ? -(6 + Math.random() * 9) * power : (Math.random() - 0.8) * 9 * power;
      const ev = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          vy += 0.45;
          r.x += vx;
          r.y += vy;
          vx *= 0.99;
          if (r.y >= floor - 2) {
            ev.remove();
            const splat = this.add.ellipse(r.x, floor - 1, 6 + Math.random() * 14, 3 + Math.random() * 3, 0xb91c1c, 0.9).setDepth(6);
            this.tweens.add({ targets: splat, alpha: 0.5, delay: 6000, duration: 4000 });
            r.destroy();
          }
        },
      });
      this.time.delayedCall(4000, () => {
        ev.remove();
        if (r.active) r.destroy();
      });
    }
  }

  /** Kreddle EXTRA VIOLENCE: blood that sprays out and lands (top-down rooms use this, side rooms use gore). */
  private splatter(x: number, y: number, n: number, power = 1) {
    if (this.side) {
      this.gore(x, y, n, power);
      return;
    }
    if (hasVfx(this, "vfx_blood")) {
      vfx(this, "vfx_blood", x, y, { scale: Math.min(2, 0.5 + n / 30) * power, depth: 960, flipX: Math.random() < 0.5 });
      const pool = vfx(this, "vfx_bloodpool", x + (Math.random() - 0.5) * 16, y + 8, { scale: Math.min(1.5, 0.4 + n / 40), depth: 6, hold: true, delay: 200 });
      if (pool) this.tweens.add({ targets: pool, alpha: 0, delay: 8000, duration: 3000, onComplete: () => pool.destroy() });
      return;
    }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = (12 + Math.random() * 46) * power;
      const sz = 2 + Math.random() * 4;
      const r = this.add.rectangle(x, y, sz, sz, Math.random() < 0.7 ? 0xdc2626 : 0x7f1d1d).setDepth(960);
      this.tweens.add({
        targets: r,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d * 0.7,
        duration: 180 + Math.random() * 160,
        ease: "Quad.out",
        onComplete: () => {
          const sp = this.add.ellipse(r.x, r.y, 4 + Math.random() * 10, 3 + Math.random() * 5, 0x991b1b, 0.85).setDepth(6);
          this.tweens.add({ targets: sp, alpha: 0, delay: 8000, duration: 3000, onComplete: () => sp.destroy() });
          r.destroy();
        },
      });
    }
  }

  /** Kreddle EXTRA VIOLENCE: the enemy comes apart in four pieces. */
  private dismember(e: Enemy) {
    const key = e.texture.key;
    const fr = e.frame;
    const w = fr.width;
    const h = fr.height;
    const floor = this.side ? this.groundY - 8 : null;
    for (let cx = 0; cx < 2; cx++)
      for (let cy = 0; cy < 2; cy++) {
        const piece = this.add.image(e.x, e.y, key, fr.name).setScale(e.scaleX, e.scaleY).setFlipX(e.flipX).setDepth(e.depth + 1).setCrop((w / 2) * cx, (h / 2) * cy, w / 2, h / 2).setTint(0xffb4b4);
        const a = Math.atan2(cy - 0.5, cx - 0.5) + (Math.random() - 0.5) * 0.8;
        const d = 40 + Math.random() * 60;
        this.tweens.add({ targets: piece, x: e.x + Math.cos(a) * d, y: floor ?? e.y + Math.sin(a) * d * 0.7, angle: (Math.random() - 0.5) * 540, duration: 420, ease: "Quad.out" });
        this.tweens.add({ targets: piece, alpha: 0, delay: 2500, duration: 900, onComplete: () => piece.destroy() });
      }
    vfx(this, "vfx_gore", e.x, e.y, { scale: 1.1, depth: e.depth + 2 });
    this.splatter(e.x, e.y, 22, 1.4);
  }

  private screenSplat(n = 4) {
    if (hasVfx(this, "vfx_blood")) {
      // blood on the lens
      for (let i = 0; i < n; i++) vfx(this, "vfx_blood", 80 + Math.random() * 800, 60 + Math.random() * 300, { scale: 2.5 + Math.random() * 2, fixed: true, depth: 990, delay: i * 70, flipX: Math.random() < 0.5 });
      return;
    }
    for (let i = 0; i < n; i++) {
      const sp = this.add.circle(80 + Math.random() * 800, 60 + Math.random() * 300, 30 + Math.random() * 60, 0xb91c1c, 0.75).setScrollFactor(0).setDepth(990);
      this.tweens.add({ targets: sp, y: sp.y + 140, scaleY: 1.6, alpha: 0, delay: 700, duration: 2200, onComplete: () => sp.destroy() });
    }
  }

  private bigText(t: string, color: string, size = 46, y = 150) {
    const tx = this.add.text(480, y, t, { fontFamily: "Impact, sans-serif", fontSize: `${size}px`, color, stroke: "#000", strokeThickness: 8 }).setOrigin(0.5).setScrollFactor(0).setDepth(995).setScale(0.2);
    this.tweens.add({ targets: tx, scale: 1, duration: 220, ease: "Back.out" });
    this.tweens.add({ targets: tx, alpha: 0, delay: 1400, duration: 400, onComplete: () => tx.destroy() });
  }

  /** An entirely unnecessary, deeply cartoonish death. */
  /** Captain Stanley, on his knees. Press S. */
  private async slitThroat(b: Boss) {
    const x = b.x;
    const y = b.y;
    const key = b.texture.key;
    const sc = b.scaleX / (((b.texture.customData as { hd?: number } | undefined)?.hd) ?? 1);
    this.tweens.killTweensOf(b);
    b.setVisible(false);
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(x, y, 400, "Sine.easeInOut");
    cam.zoomTo(1.4, 400);
    const wait = (ms: number) => new Promise<void>((r) => this.time.delayedCall(ms, () => r()));
    const body = this.add.image(x, y, key, 0).setScale(sc).setDepth(955).setFlipX(b.flipX);
    await wait(450);
    // the prompt: S (or tap)
    const head = this.add.text(480, 95, "PRESS S TO SLIT HIS THROAT", { fontFamily: "Impact, sans-serif", fontSize: "38px", color: "#ef4444", stroke: "#000", strokeThickness: 7 }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);
    const btn = this.add.text(480, 150, "🔪  S", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#ffffff", backgroundColor: "#7f1d1d", padding: { x: 20, y: 8 } }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: [head, btn], scale: { from: 1, to: 1.08 }, yoyo: true, repeat: -1, duration: 380 });
    await new Promise<void>((res) => {
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        this.input.keyboard?.off("keydown-S", go);
        res();
      };
      this.input.keyboard?.on("keydown-S", go);
      btn.on("pointerdown", go);
    });
    this.tweens.killTweensOf([head, btn]);
    head.destroy();
    btn.destroy();
    // the slash
    const fh = body.frame.height * sc;
    const fw = body.frame.width * sc;
    const neckY = y - fh * 0.12;
    synth.play("swing");
    const slash = this.add.graphics().setDepth(960);
    const p = { t: 0 };
    await new Promise<void>((res) =>
      this.tweens.add({
        targets: p,
        t: 1,
        duration: 140,
        onUpdate: () => slash.clear().lineStyle(5, 0xffffff, 1).lineBetween(x - fw * 0.35, neckY - 6, x - fw * 0.35 + fw * 0.7 * p.t, neckY + 6),
        onComplete: () => res(),
      }),
    );
    synth.play("crit");
    cam.flash(150, 160, 0, 0);
    cam.shake(250, 0.015);
    this.tweens.add({ targets: slash, alpha: 0, duration: 400, onComplete: () => slash.destroy() });
    const spray = this.time.addEvent({ delay: 50, repeat: 14, callback: () => this.gore(x, neckY, 4, 0.7) });
    this.screenSplat(2);
    body.setTint(0xffb0b0);
    await wait(700);
    // and down he goes, still saluting
    this.tweens.add({ targets: body, angle: b.flipX ? -84 : 84, y: y + fh * 0.3, duration: 700, ease: "Quad.in" });
    await wait(900);
    synth.play("punch_big");
    cam.shake(200, 0.01);
    spray.remove();
    await wait(500);
    cam.zoomTo(1, 500);
    cam.startFollow(this.player.spr, true, 0.12, 0.12);
    await wait(500);
  }

  private async reinhardtDeath(b: Boss) {
    const x = b.x;
    const y = b.y;
    const key = b.texture.key;
    // textures carry an "hd" factor that setScale multiplies in, so undo it for the stand-ins
    const sc = b.scaleX / (((b.texture.customData as { hd?: number } | undefined)?.hd) ?? 1);
    this.tweens.killTweensOf(b);
    b.setVisible(false);
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(x, y, 400, "Sine.easeInOut");
    cam.zoomTo(1.5, 400);
    const wait = (ms: number) => new Promise<void>((r) => this.time.delayedCall(ms, () => r()));
    const body = this.add.image(x, y, key, 0).setScale(sc).setDepth(955).setFlipX(b.flipX);
    await wait(450);
    // he takes every bullet he ever fired, all at once
    this.bigText("OVERKILL", "#ef4444");
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(i * 70, () => {
        synth.play(i % 3 ? "hit" : "crit");
        body.setAngle((Math.random() - 0.5) * 20).setX(x + (Math.random() - 0.5) * 16);
        this.gore(x + (Math.random() - 0.5) * 40, y - 10 + (Math.random() - 0.5) * 60, 8, 1);
        cam.shake(60, 0.01);
      });
    }
    await wait(950);
    // the head comes off
    const fw = body.frame.width;
    const fh = body.frame.height;
    const head = this.add.image(x, y, key, 0).setScale(sc).setDepth(958).setFlipX(b.flipX).setCrop(0, 0, fw, fh * 0.32);
    body.setCrop(0, fh * 0.32, fw, fh * 0.68);
    synth.play("explode");
    this.screenSplat(5);
    this.bigText("HEADSHOT", "#fde047", 40, 200);
    this.tweens.add({ targets: head, y: y - 260, x: x + 140, angle: 720, duration: 900, ease: "Quad.out", yoyo: false });
    // neck fountain
    const neck = { x, y: y - (fh * sc) * 0.18 };
    const fountain = this.time.addEvent({ delay: 45, loop: true, callback: () => this.gore(neck.x, neck.y, 5, 0.8, true) });
    this.tweens.add({ targets: body, angle: { from: -6, to: 6 }, yoyo: true, repeat: 6, duration: 110 });
    await wait(1300);
    // the body bursts into chunks
    fountain.remove();
    synth.play("explode");
    synth.play("boom");
    this.boomFx(x, y, 1.8);
    this.screenSplat(7);
    this.bigText("CROBLITERATED", "#f472b6", 50, 220);
    cam.flash(250, 200, 0, 0);
    cam.shake(400, 0.03);
    body.destroy();
    const cols = 3;
    const rows = 3;
    for (let cx = 0; cx < cols; cx++)
      for (let cy = 0; cy < rows; cy++) {
        const chunk = this.add.image(x, y, key, 0).setScale(sc).setDepth(957).setFlipX(b.flipX).setCrop((fw / cols) * cx, fh * 0.32 + ((fh * 0.68) / rows) * cy, fw / cols, (fh * 0.68) / rows);
        const tx = x + (cx - 1) * (120 + Math.random() * 160);
        this.tweens.add({ targets: chunk, x: tx, y: (this.side ? this.groundY : y + 80) - 20, angle: (Math.random() - 0.5) * 900, duration: 700 + Math.random() * 300, ease: "Quad.in" });
      }
    this.gore(x, y, 120, 1.8);
    // a single sausage rolls out of the wreckage
    const sausage = this.add.text(x, y, "🌭", { fontSize: "34px" }).setOrigin(0.5).setDepth(959);
    this.tweens.add({ targets: sausage, x: x - 220, angle: -720, y: (this.side ? this.groundY : y + 80) - 18, duration: 1400, ease: "Quad.out" });
    await wait(900);
    // the head lands. it has one last thing to say
    this.tweens.killTweensOf(head);
    head.setPosition(x + 180, (this.side ? this.groundY : y + 80) - 30).setAngle(-90);
    await this.talk([say("REINHARDT CROBLEY", "(the head, on the floor) heh… heh… heh… you'll never… prove… I…")]);
    // a giant fibreglass Crobley falls from the ceiling. directly onto it.
    const giant = this.add.image(head.x, -200 + cam.worldView.y, this.textures.exists("p_crobley") ? "p_crobley" : "p_coin").setScale(9).setDepth(961);
    await new Promise<void>((r) => this.tweens.add({ targets: giant, y: head.y - 30, duration: 500, ease: "Quad.in", onComplete: () => r() }));
    synth.play("smash");
    synth.play("explode");
    cam.shake(500, 0.04);
    this.screenSplat(10);
    this.gore(head.x, head.y, 80, 2);
    head.destroy();
    this.bigText("FLAWLESS NIBBLE", "#ffd23f", 48, 180);
    await wait(1500);
    this.tweens.add({ targets: giant, alpha: 0, duration: 800 });
    cam.zoomTo(1, 500);
    cam.startFollow(this.player.spr, true, 0.12, 0.12);
    await wait(600);
  }

  /** The central fuel tank: shoot it, and everything ends. */
  private fuelTankFinale() {
    return new Promise<void>((resolve) => {
      const r = this.room;
      const x = r.w / 2;
      const y = this.side ? this.groundY - 70 : r.h / 2;
      const tex = this.textures.exists("p_fueltank") ? "p_fueltank" : undefined;
      const tank = new Enemy(this, "fuel_tank", x, y, 1, undefined, tex);
      if (tex) tank.setScale(2.6);
      (tank.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      tank.hpBar = this.add.graphics().setDepth(800);
      this.enemies.push(tank);
      this.enemyGroup.add(tank);
      (tank.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.tweens.add({ targets: tank, scaleX: tank.scaleX * 1.04, yoyo: true, repeat: -1, duration: 300 });
      const label = this.add.text(x, y - 110, "▼ SHOOT IT ▼", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#facc15", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setDepth(900);
      this.tweens.add({ targets: label, y: label.y - 10, yoyo: true, repeat: -1, duration: 400 });
      this.talk([
        dir("Reinhardt Crobley is everywhere and nowhere. Mostly everywhere. In the middle of the Core, the central fuel tank hums."),
        dir("SHOOT THE FUEL TANK to destroy this entire forsaken fucking place, and ensure that even if Reinhardt comes back to life he will never be able to spread right-wing propaganda ever again!"),
      ]).then(() => {
        this.busy = false;
        this.toast("THE CENTRAL FUEL TANK", "Shoot it. Destroy this entire forsaken fucking place.");
      });
      this.events.once("fuel-tank-dead", async (tx: number, ty: number) => {
        this.busy = true;
        label.destroy();
        for (let i = 0; i < 14; i++)
          this.time.delayedCall(i * 120, () => {
            synth.play("explode");
            const ex = tx + (Math.random() - 0.5) * 300;
            const ey = ty + (Math.random() - 0.5) * 200;
            if (!this.boomFx(ex, ey, 1.4 + Math.random() * 0.8, 970)) {
              const c = this.add.circle(ex, ey, 20, i % 2 ? 0xfde047 : 0xf97316, 0.9).setDepth(970);
              this.tweens.add({ targets: c, radius: 160, alpha: 0, duration: 600, onComplete: () => c.destroy() });
            }
            this.cameras.main.shake(150, 0.02);
          });
        await new Promise<void>((r2) => this.time.delayedCall(1700, () => r2()));
        this.cameras.main.flash(600, 255, 255, 255);
        resolve();
      });
    });
  }

  // ------------------------------------------------------------------ bosses

  /** Which boss of a boss rush we're on (0 = the room's own boss). */
  private rushIdx = 0;

  private async startBoss(id = this.room.boss!, hpMult = this.room.bossHp ?? 1) {
    const r = this.room;
    const txt = BOSS_TEXT[id];
    this.busy = true;
    const b = createBoss(id, this, r.w / 2, r.h / 2 - 100);
    // bosses toughen up as the story goes on (the bank is how you keep up)
    const bossMult = (1 + Math.max(0, G.s.chapter - 2) * 0.18) * hpMult;
    if (hpMult < 1) b.dmgMult = (b.dmgMult ?? 1) * 0.8;
    b.maxHp = Math.round(b.maxHp * bossMult);
    b.hp = b.maxHp;
    b.dmgMult = (b.dmgMult ?? 1) * (1 + Math.max(0, G.s.chapter - 2) * 0.1);
    const pct = (this as any)._bossHpPct;
    if (typeof pct === "number" && pct > 0 && pct < 1) b.hp = Math.max(1, Math.round(b.maxHp * pct));
    this.boss = b;
    this.enemies.push(b);
    this.enemyGroup.add(b);
    if (this.side) {
      const bb = b.body as Phaser.Physics.Arcade.Body;
      bb.setCollideWorldBounds(true);
      if ((b as any).sideGravity) bb.setGravityY(1500);
      // fit the hitbox to the art so big bosses stand on the floor rather than hovering over it
      const fw = b.frame.width;
      const fh = b.frame.height;
      bb.setSize(fw * 0.6, fh * 0.85).setOffset(fw * 0.2, fh * 0.15);
      if (id === "rik") b.setPosition(r.w / 2, this.groundY - 120);
    }
    b.setAlpha(0);
    this.tweens.add({ targets: b, alpha: 1, duration: 800 });
    synth.play("roar");
    if (!(typeof pct === "number") || this.rushIdx > 0) await this.talk(txt.intro);
    this.busy = false;
    b.started = true;
    b.nextPattern = this.now() + 1200;
  }

  /** Where the boss died and what they looked like (for the KRELTALITY stand-in). */
  private krelTarget: KrelTarget | null = null;
  private lastHitFx = 0;
  private lastKillPop = 0;

  /** The boss's drawn "defeated" animation (bossdie_<id>): staggering to their knees, then collapsing. */
  private downSpr: Phaser.GameObjects.Sprite | null = null;
  private downSplit = 0;

  /** Stagger and drop to the knees (held there through their last words). */
  private bossKneel(b: Boss): Promise<void> {
    const key = `bossdie_${b.bossId}`;
    // these have their own death scenes
    if (["reinhardt", "krozno", "rik"].includes(b.bossId) || !this.textures.exists(key)) return Promise.resolve();
    const tex = this.textures.get(key);
    const n = tex.frameTotal - 1;
    if (n < 4) return Promise.resolve();
    const side = tex.get(0).height;
    const fh = b.frame.height;
    const k = b.displayHeight / fh; // screen px per source px, same as the boss sprite
    const down = this.add.sprite(b.x, b.y + b.displayHeight * (1 - b.originY), key, 0).setOrigin(0.5, (side - 4) / side).setDepth(b.depth).setFlipX(b.flipX);
    down.setScale(k);
    b.setVisible(false);
    this.downSpr = down;
    // these strips: a long dazed wobble, then the drop in the last few frames
    this.downSplit = Math.max(2, n - 4);
    if (!this.anims.exists(`${key}_kneel`)) {
      this.anims.create({ key: `${key}_kneel`, frames: this.anims.generateFrameNumbers(key, { start: 0, end: this.downSplit }), frameRate: 9, repeat: 0 });
      this.anims.create({ key: `${key}_fall`, frames: this.anims.generateFrameNumbers(key, { start: this.downSplit, end: n - 1 }), frameRate: 6, repeat: 0 });
    }
    return new Promise((r) => {
      down.play(`${key}_kneel`);
      down.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => r());
      this.time.delayedCall(2500, () => r());
    });
  }

  /** ...and the rest: down they go. */
  private bossFall(): Promise<void> {
    const down = this.downSpr;
    if (!down || !down.active) return Promise.resolve();
    const key = down.texture.key;
    return new Promise((r) => {
      down.play(`${key}_fall`);
      down.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        synth.play("boom");
        this.shake(200, 0.008);
        vfx(this, "vfx_dust", down.x, down.y, { scale: 1.6, depth: down.depth + 1 });
        r();
      });
      this.time.delayedCall(2500, () => r());
    });
  }

  /** "FUCKING KILL THEM!!" — optional, after the boss's last words. */
  private async maybeKreltality(b: Boss) {
    if (["drongus", "cronster", "reinhardt", "krozno", "rik"].includes(b.bossId) || !this.krelTarget) {
      await this.bossFall();
      return;
    }
    const ps = this.player.spr;
    const phd = (ps.texture.customData as { hd?: number } | undefined)?.hd ?? 1;
    this.busy = true;
    const done = await kreltality(this, this.krelTarget, { key: ps.texture.key, frame: 0, scale: ps.scaleX / phd });
    if (!done) await this.bossFall();
    else this.downSpr?.destroy();
    this.downSpr = null;
    if (done) {
      bump(G.s, "kreltalities");
      G.s.flags[`krel_${b.bossId}`] = true; // a trophy for the shelf at home
    }
    this.krelTarget = null;
    this.cameras.main.startFollow(this.player.spr, true, 0.12, 0.12);
  }

  private async onBossDefeated(b: Boss) {
    this.player?.cheer(this.now(), 2600);
    this.busy = true;
    {
      const hd = (b.texture?.customData as { hd?: number } | undefined)?.hd ?? 1;
      this.krelTarget = b.texture ? { key: b.texture.key, frame: b.frame.name, x: b.x, y: b.y, scale: b.scaleX / hd, flip: b.flipX, name: BOSS_TEXT[b.bossId]?.name ?? "THE BOSS" } : null;
    }
    this.downSpr?.destroy();
    this.downSpr = null;
    await this.bossKneel(b);
    const s = G.s;
    const rush = this.room.bossRush ?? [];
    if (this.rushIdx < rush.length) {
      // boss rush: next one up, same room, new set
      G.emit("boss", null);
      synth.play("boom");
      this.boomFx(b.x, b.y, 1.3);
      this.shake(500, 0.02);
      for (const e of [...this.enemies]) if (e !== b && !e.dead) this.damageEnemy(e, 99999, { noWonk: true, label: "" });
      for (const sh of [...this.shots]) this.killShot(sh);
      await this.talk(BOSS_TEXT[b.bossId].outro);
      await this.maybeKreltality(b);
      this.boss = null;
      const next = rush[this.rushIdx++];
      s.hp = Math.min(maxHp(s), s.hp + maxHp(s) * 0.35);
      this.dropPickup(this.player.x + 30, this.player.y - 20, "ammo", 2);
      this.toast(`CROBLEY ${this.rushIdx + 1} OF ${rush.length + 1}`, "+35% health. Ammo on the floor. Next one's coming.");
      this.cameras.main.flash(300, 255, 255, 255);
      if (next.backdrop && this.sideBg && this.textures.exists(next.backdrop)) {
        const src = this.textures.get(next.backdrop).getSourceImage();
        this.sideBgScale = 540 / src.height;
        this.sideBg.setTexture(next.backdrop).setTileScale(this.sideBgScale);
      }
      this.busy = false;
      this.time.delayedCall(900, () => void this.startBoss(next.boss, next.hp ?? 1));
      return;
    }
    if (this.roomIdx < this.dungeon.rooms.length - 1) {
      // a boss half way through: beat it and the door opens
      G.emit("boss", null);
      synth.play("boom");
      this.boomFx(b.x, b.y, 1.4);
      this.shake(600, 0.025);
      for (const e of [...this.enemies]) if (e !== b && !e.dead) this.damageEnemy(e, 99999, { noWonk: true, label: "" });
      for (const sh of [...this.shots]) this.killShot(sh);
      await this.talk(BOSS_TEXT[b.bossId].outro);
      await this.maybeKreltality(b);
      await this.crystalGet(b);
      this.boss = null;
      this.roomCleared = true;
      this.markCleared();
      s.hp = Math.min(maxHp(s), s.hp + maxHp(s) * 0.5);
      this.door.setTexture("p_door");
      this.toast("EXIT OPEN", this.side ? "The way on is to the far right →." : "The exit is open.");
      this.busy = false;
      return;
    }
    // dungeon done: forget room progress so a replay starts from the top
    for (let i = 0; i < this.dungeon.rooms.length; i++) delete s.flags[clearKey(this.dungeon.id, i)];
    G.emit("boss", null);
    synth.play("boom");
    this.boomFx(b.x, b.y, 1.6);
    this.shake(800, 0.03);
    for (const e of [...this.enemies]) if (e !== b && !e.dead) this.damageEnemy(e, 99999, { noWonk: true, label: "" });
    for (const sh of [...this.shots]) this.killShot(sh);
    this.rule = null;
    G.emit("rule", null);
    if (b.bossId === "reinhardt") {
      await this.reinhardtDeath(b);
      await this.fuelTankFinale();
    }
    if (this.dungeon.arenaFlag) {
      await this.talk(BOSS_TEXT[b.bossId].outro);
      await this.maybeKreltality(b);
      // Uncle Rik: the crystal is… somewhere else. Into the shrink ray.
      if (b.bossId === "rik") {
        await this.shrinkRay();
        this.transitioning = true;
        switchTo(this, "Dungeon", { dungeon: "rik_colon", room: 0 });
        return;
      }
      // Reinhardt is Chapter 4's boss: his crystal, and the chapter's done
      if (b.bossId === "reinhardt") {
        await this.crystalGet(b);
        if (s.chapter === 4 && !s.flags.ch4_clear) {
          s.flags.ch4_clear = true;
          s.coins += Math.round(200 * activeMods(s).questRewardMult * 2);
          s.bottles = maxBottles(s);
          G.drongus("boss_defeated");
        }
      }
      s.flags[this.dungeon.arenaFlag] = true;
      s.coins += 150;
      s.hp = maxHp(s);
      s.phase = "hub";
      G.save();
      const vig = b.bossId === "flatmate" ? "flatmate" : b.bossId === "rival" ? "rival" : b.bossId === "rik" ? "sanmik_finale" : b.bossId === "reinhardt" ? "crobley_boom" : null;
      this.time.delayedCall(800, () => {
        this.transitioning = true;
        if (vig) switchTo(this, "Vignette", { id: vig, returnAt: this.dungeon.returnAt });
        else switchTo(this, "Hub", { at: this.dungeon.returnAt, from: "arena" });
      });
      return;
    }
    if (b.bossId === "krozno") {
      await this.talk(BOSS_TEXT.krozno.outro);
      await this.slitThroat(b);
      await this.crystalGet(b);
      G.rt.timerEnd = 0;
      G.emit("timer", null);
      s.coins += 300;
      s.hp = maxHp(s);
      s.phase = "hub";
      G.save();
      this.time.delayedCall(600, () => {
        this.transitioning = true;
        switchTo(this, "Vignette", { id: "plane_escape", returnAt: "AIRPORT" });
      });
      return;
    }
    if (b.bossId === "drongus") {
      s.flags.ch6_clear = true;
      G.save();
      await this.bossFall();
      this.time.delayedCall(1200, () => {
        this.transitioning = true;
        switchTo(this, "Ending", {});
      });
      return;
    }
    const txt = BOSS_TEXT[b.bossId];
    await this.talk(txt.outro);
    await this.maybeKreltality(b);
    await this.crystalGet(b);
    this.completeChapter(b.bossId);
  }

  /** The chapter's dungeon is done (after its boss, or after whatever its last room asks of you). */
  private completeChapter(bossId: string) {
    const s = G.s;
    for (let i = 0; i < this.dungeon.rooms.length; i++) delete s.flags[clearKey(this.dungeon.id, i)];
    const reward = Math.round(200 * activeMods(s).questRewardMult * (1 + (s.chapter - 1) * 0.25));
    s.coins += reward;
    s.flags[`ch${this.dungeon.chapter}_clear`] = true;
    s.phase = "hub";
    s.hp = maxHp(s);
    s.bottles = maxBottles(s);
    if (bossId === "salmon" || bossId === "krandall") G.unlockArchive("arch_squeeze");
    if (bossId === "feedback") {
      G.unlockArchive("arch_cheesegate");
      G.unlockArchive("arch_mork_voice");
    }
    if (bossId === "machine") G.unlockArchive("arch_purple");
    if (bossId === "banhammer") G.unlockArchive("arch_kreltower");
    if (bossId === "spectre") {
      G.unlockArchive("arch_godric");
      G.unlockArchive("arch_crobley");
    }
    G.drongus("boss_defeated");
    G.save();
    this.toast("CHAPTER COMPLETE", `+${reward} Krezzcoin. Report to the Town Hall.`);
    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(500);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.transitioning = true;
        switchTo(this, "Hub", { from: "dungeon" });
      });
    });
  }

  /** Drongus's army stands to attention for the national anthem. */
  private async anthemEvent() {
    const r = this.room;
    const s = G.s;
    const army: Phaser.GameObjects.Sprite[] = [];
    this.add.image(r.w / 2, 70, "spr_DRONGUS", 0).setScale(4).setDepth(5);
    this.add.rectangle(r.w / 2, 70, 90, 110).setStrokeStyle(6, 0xd4a017).setDepth(6);
    this.add.text(r.w / 2, 130, "OUR SUPREME LEADER", { fontFamily: FONT, fontSize: "10px", color: "#d4a017" }).setOrigin(0.5).setDepth(6);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        const x = r.w * 0.18 + col * ((r.w * 0.64) / 7);
        const y = 220 + row * 80;
        army.push(this.add.sprite(x, y, "en_soldier", 0).setScale(2.6).setDepth(y));
      }
    }
    const captain = this.add.sprite(r.w / 2, 480, "en_soldier", 1).setScale(3.2).setTint(0xffd23f).setDepth(480);
    await this.talk([
      say("GUARDSMAN CAPTAIN", "ATTEN-SHUN!"),
      dir("Twenty-four purple boots slam together at once. The floor (the Krezzsplosion article) shakes."),
      say("GUARDSMAN CAPTAIN", "ALL RISE FOR THE NATIONAL ANTHEM OF KRELWORLD."),
      say("DRONGUS", "(over the tannoy) Stand to attention. I made this. It took me nineteen generations. If you move, you're disrespecting the anthem AND me.", { notify: true }),
      {
        s: "NARRATOR",
        t: "The anthem is about to start. What do you do?",
        dir: true,
        choice: [
          { label: "Stand to attention (respect the anthem)", set: { anthem_pick: "stand" } },
          { label: "Sing along, loudly, badly", set: { anthem_pick: "sing" } },
          { label: "Keep walking. It's not your anthem.", set: { anthem_pick: "walk" } },
        ],
      },
    ]);
    const pick = s.flags.anthem_pick;
    synth.music("anthem", true);
    const banner = this.add
      .text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 200, "🎵 NOW PLAYING: THE STAR-SPANGLED BANNER (KRELWORLD EDITION)", { fontFamily: FONT, fontSize: "16px", color: "#ffd23f", backgroundColor: "#000000cc", padding: { x: 8, y: 4 } })
      .setOrigin(0.5)
      .setDepth(2000)
      .setScrollFactor(0)
      .setPosition(480, 90);
    const salute = this.time.addEvent({ delay: 500, loop: true, callback: () => army.forEach((a, i) => a.setFrame((i + Math.floor(this.now() / 500)) % 2)) });
    this.busy = true;
    if (pick === "stand") {
      this.floatText(this.player.x, this.player.y - 40, "*stands to attention*", "#ffffff", 14);
      await new Promise<void>((res) => this.time.delayedCall(9000, () => res()));
      this.busy = false;
      await this.talk([
        say("GUARDSMAN CAPTAIN", "…at ease. Lovely posture. Half of you lot, dismissed. The rest of you…"),
        say("GUARDSMAN CAPTAIN", "…hang on. That's not one of ours. GET THEM. RESPECTFULLY."),
      ]);
      this.waves = [[["soldier", 4]], [["soldier", 3], ["ai_portrait", 1]]];
    } else if (pick === "sing") {
      this.floatText(this.player.x, this.player.y - 40, "♪ OH SAAAAY CAN YOU KREEEEZ ♪", "#ffd23f", 16);
      await new Promise<void>((res) => this.time.delayedCall(7000, () => res()));
      this.busy = false;
      this.player.wonk = 100;
      await this.talk([
        dir("Several guardsmen are openly weeping. The captain is moved. Your WONK METER is full."),
        say("GUARDSMAN CAPTAIN", "That was… that was the most beautiful… GET THEM ANYWAY."),
      ]);
    } else {
      this.busy = false;
      this.toast("DISRESPECT TO THE ANTHEM", "The entire army is now very, very upset with you.");
      await this.talk([say("GUARDSMAN CAPTAIN", "DID THEY JUST… WALK. DURING THE ANTHEM."), say("DRONGUS", "Unbelievable. Seen. Not reacted. And now WALKED.", { notify: true }), say("GUARDSMAN CAPTAIN", "ALL UNITS. ALL OF THEM.")]);
      this.waves = [[["soldier", 8]], [["soldier", 6], ["ai_portrait", 2]]];
    }
    salute.remove();
    this.tweens.add({ targets: banner, alpha: 0, delay: 3000, duration: 800, onComplete: () => banner.destroy() });
    army.forEach((a) => a.destroy());
    captain.destroy();
  }

  private missionFailed() {
    this.busy = true;
    const s = G.s;
    Object.assign(s.flags, { kreltower_resolved: true, kreltower_fell: true });
    G.rt.timerEnd = 0;
    G.emit("timer", null);
    s.hp = maxHp(s);
    s.phase = "hub";
    G.save();
    this.cameras.main.flash(600, 255, 255, 255);
    this.transitioning = true;
    switchTo(this, "Vignette", { id: "kreltower_fall", returnAt: "AIRPORT" });
  }

  // ------------------------------------------------------------------ events: Polson Towers

  private async questionWitness(id: string) {
    const w = CHEESE_WITNESSES.find((x) => x.id === id)!;
    const key = w.testimony[this.lastWitness] ? this.lastWitness : "none";
    const first = this.witnessed.size === 0;
    this.witnessed.add(id);
    await this.talk([...(w.testimony[key] ?? w.testimony.none), ...(first ? DOMESTICS[1].lines : [])]);
    this.lastWitness = id;
    if (this.witnessed.size === 3 && !G.s.flags.cheese_ready) {
      G.s.flags.cheese_ready = true;
      this.toast("CHEESEGATE", "All witnesses questioned. Ask them again in a different order, or accuse at the Evidence Board.");
    }
  }

  private async accuse() {
    if (this.witnessed.size < 3) {
      await this.talk([dir("You haven't questioned everyone yet. The board is mostly blank. Someone has written 'cheese?' in the middle and circled it nine times.")]);
      return;
    }
    if (this.enemies.some((e) => !e.dead)) {
      this.toast("CHEESEGATE", "Deal with the Cheese Mites first.");
      return;
    }
    const opts = CHEESE_ACCUSATIONS.map((a) => ({ label: a.label, lines: a.outcome, set: (a.correct ? { cheesegate_solved: true } : { cheese_wrong: true }) as Record<string, boolean> }));
    await this.talk([{ s: "NARRATOR", t: "Who is responsible for Cheesegate?", dir: true, choice: opts }]);
    if (G.s.flags.cheesegate_solved) {
      this.roomCleared = true;
      G.unlockArchive("arch_cheesegate");
      this.checkExit();
    } else {
      this.roomCleared = false;
      this.waveIdx = -1;
      this.waves = [[["cheese_mite", 8]]];
      this.nextWave();
    }
  }

  private async morkVoice() {
    if (this.morkRound >= MORK_ROUNDS.length) return;
    const round = MORK_ROUNDS[this.morkRound];
    synth.play("mork");
    const opts = round.options.map((o, i) => ({ label: o.label, set: { mork_pick: i } }));
    await this.talk([{ s: "POLSON", t: round.mork, tag: "new", choice: opts }]);
    const pick = G.s.flags.mork_pick as number;
    const o = round.options[pick];
    if (o?.correct) {
      this.morkRound++;
      await this.talk([dir(round.success)]);
      if (this.morkRound >= MORK_ROUNDS.length) {
        G.s.flags.mork_done = true;
        G.unlockArchive("arch_mork_voice");
        this.toast("MORK VOICE", "Fully interpreted. Nobody knows how.");
        this.checkExit();
      }
    } else {
      const fail = o?.fail ?? "enemies";
      if (fail === "trapdoor") {
        this.floatText(this.player.x, this.player.y - 30, "TRAPDOOR", "#ff6666", 16);
        this.damagePlayer(14, undefined, { unblockable: true });
      } else if (fail === "enemies") {
        for (let i = 0; i < 4; i++) this.spawnEnemy("cheese_mite", this.player.x + (Math.random() - 0.5) * 200, this.player.y - 100);
      } else if (fail === "argument") {
        await this.talk([say("EDEN", "(from upstairs) POLSON. WHAT DID YOU TELL THEM."), say("POLSON", "Mork."), dir("Two Friend Requests materialise from the argument.")]);
        for (let i = 0; i < 2; i++) this.spawnEnemy("friend_crawler", this.player.x + (i ? 120 : -120), this.player.y - 120);
      } else {
        this.enemyAoe(this.player.x, this.player.y, 80, 14, 700, 0xffd23f);
        this.floatText(this.player.x, this.player.y - 30, "WRONG BUTTON", "#ff6666", 14);
      }
    }
  }

  private async fragmarPrime() {
    const steps: { prompt: string; options: string[]; correct: number }[] = [
      { prompt: "STEP ONE (to Polson). What do you send first?", options: ["\"hey how are you what have you been doing?\"", "The other messages. The ones from 2022.", "An apology for the Eric Andre joke"], correct: 0 },
      { prompt: "STEP TWO. Then what?", options: ["Post a really passive aggressive status, visible to the lads only", "Send Eden a friend request", "Unsend everything and go to bed"], correct: 1 },
      { prompt: "STEP THREE (to Polson). The cover story:", options: ["\"oh my god, I just realised I haven't become friends with Eden on Facebook!! After 18 months!! I'm so embarrassed.\"", "\"Is there any chance this was Eden's fault??\"", "\"Mork.\""], correct: 0 },
    ];
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      await this.talk([{ s: "NARRATOR", t: `FRAGMAR PRIME — ${st.prompt}`, dir: true, choice: st.options.map((o, j) => ({ label: o, set: { fp_pick: j } })) }]);
      if (G.s.flags.fp_pick !== st.correct) {
        await this.talk([say("MIKEY", "Fuck. Wrong order. Again. Unsend. UNSEND."), dir("The Network notices. Friend Requests swarm out of the walls.")]);
        for (let k = 0; k < 3; k++) this.spawnEnemy("friend_crawler", this.player.x + (k - 1) * 90, this.player.y - 140);
        return;
      }
    }
    G.s.flags.fragmar_prime = true;
    G.s.coins += 150;
    G.unlockArchive("arch_fragmar");
    await this.talk([
      dir("Sent. In the right order. For the first time in history."),
      say("POLSON", "(reply, instantly) No worries buddy 😊 She'll accept it now!! Wbu?"),
      say("MIKEY", "He replied immediately. Because I was nice to him. That was always the trick."),
      { s: "NARRATOR", t: "", react: { message: "EDEN accepted your friend request.", context: "fragmar_prime", from: "EDEN", outcomes: { LIKE: [say("EDEN", "...👍 back. Weird.")], LAUGH: [say("EDEN", "Why is that funny? Mikey. MIKEY.")], SEEN: [say("EDEN", "Seen. Classic Mikey.")] } } },
      dir("FRAGMAR PRIME COMPLETE. +150 Krezzcoin. Classification: still extremely petty."),
    ]);
  }

  // ------------------------------------------------------------------ events: misc

  /** Chapter 3's last room: untie Mollor, a thank-you, a hug, and a tip about the golden juice. */
  private async rescueMollor(spr: Phaser.GameObjects.Sprite, ropes: Phaser.GameObjects.Graphics) {
    const s = G.s;
    if (s.flags.mollor_freed || this.busy) return;
    s.flags.mollor_freed = true;
    ropes.destroy();
    synth.play("cheer");
    this.tweens.add({ targets: spr, y: spr.y - 16, yoyo: true, duration: 180 });
    const jenko = s.player === "FLENKY";
    await this.talk(
      jenko
        ? [
            say("MOLLOR", "JENKO! Oh thank god. There was another one of you. A DARK one. He kept calling himself 'a real man'."),
            say("FLENKY", "That wasn't me. That was Dark Jenko. I'm the light one. Mostly."),
            dir("Mollor kisses you on the cheek. Then gives you a big hug."),
            say("FLENKY", "No promises. Too weird to live, too rare to die."),
          ]
        : [
            say("MOLLOR", "Thank you for saving me from that sicko Jenko!"),
            dir("Mollor kisses you on the cheek."),
            say("MOLLOR", "He kept going on about 'golden juice'. Said it only comes from the freshest sources. Said a proper squeeze does it."),
          ],
    );
    s.flags.golden_unlocked = true;
    const took = await squeeze(this, (l) => this.talk(l), { name: "MOLLOR", spr }, this.player.spr, [], "Want a cuddle?");
    if (!took) await this.talk([dir("Golden juice comes from the freshest sources: a woman who's up for a squeeze. Try a private dance at the Wonky Pole, or the new faces around Krelford. Squeeze before a dungeon, then press T in it to TRANSFORM.")]);
    await this.talk([say("MOLLOR", jenko ? "Right. Home. Now. Before you go dark again." : "Right. I'm going home. Tell Jenko it's over. Both Jenkos.")]);
    this.completeChapter("cronster");
  }

  private async inspectBertha() {
    const s = G.s;
    if (s.player === "GRONNY" && !s.flags.bertha_found) {
      s.flags.bertha_found = true;
      s.coins += 60;
      await this.talk([say("GRONNY", "Bertha."), dir("You pull off the dust sheet. She's crusty. She's two years old. She's beautiful."), say("GRONNY", "I said I'd have her. I'm having her."), dir("You strap Big Bertha to your back. She weighs about as much as a fully grown Krezbian. You feel nothing. Shorts."), dir("+60 Krezzcoin (found in Bertha's coin slot).")]);
      return;
    }
    await this.talk([dir("Big Bertha. The original Wonking Machine. A faded sticker on her side reads 'OFFERED TO CABINET MEMBERS FIRST'. Nobody claimed her."), say("SCROMBUS", "(over the network) She's crusty, but she's honest.", { cond: { notPlayer: "SCROMBUS" } }), say("SCROMBUS", "Hello, old girl. I'll come back for you. I promise.", { cond: { player: "SCROMBUS" } })]);
  }

  private async restoreNetwork(spr: Phaser.GameObjects.Image) {
    if (!this.roomCleared) {
      this.toast("TERMINAL", "Too much interference. Clear the room first.");
      return;
    }
    await this.talk([
      dir("You place your thumb on the terminal. Every reaction in Krelworld reconnects at once. The ceiling briefly fills with floating 👍 ❤️ 😂 😡."),
      { s: "NARRATOR", t: "", react: { message: "REACTION NETWORK TEST MESSAGE: 'hello?' — sent by DRONGUS B. DRIPPIN', 47 days ago", context: "network_test", from: "DRONGUS" } },
      say("DRONGUS", "...was that a react? From the network? Who did that?", { notify: true }),
      dir("REACTION NETWORK: RESTORED. The final door opens."),
    ]);
    G.s.flags.network_restored = true;
    spr.setTint(0x5ad35a);
    this.checkExit();
  }

  private async useWonkingMachine(id: string, spr: Phaser.GameObjects.Image) {
    const s = G.s;
    if ((this.machineUses[id] ?? 0) >= 3) {
      this.toast("WONKING MACHINE", "It needs a rest. Even machines have limits. (Big Bertha didn't.)");
      return;
    }
    await this.talk([
      {
        s: "NARRATOR",
        t: "The Wonking Machine hums expectantly. A lever. A pressure gauge. A big red button.",
        dir: true,
        choice: [
          { label: "Pull the lever", set: { wm_pick: "lever" } },
          { label: "Read the pressure gauge", set: { wm_pick: "gauge" } },
          { label: "Press the big red button", set: { wm_pick: "button" } },
          { label: "Say something nice about it", set: { wm_pick: "nice" } },
          { label: "Leave it", set: { wm_pick: "leave" } },
        ],
      },
    ]);
    const pick = s.flags.wm_pick;
    if (pick === "leave") return;
    this.machineUses[id] = (this.machineUses[id] ?? 0) + 1;
    bump(s, "wonk_machine");
    if (pick === "nice") {
      s.flags.machine_appreciated = true;
      await this.talk([say(s.player, "You're a good machine. Somebody should say it."), dir("The machine whirrs with what can only be described as relief. WONK METER FILLED."), say("SCROMBUS", "(over the network) Did someone just appreciate the machine? Was that you? Thank you. Genuinely.", { cond: { notPlayer: "SCROMBUS" } })]);
      this.player.wonk = 100;
      return;
    }
    const mal = activeMods(s).machineMalfunction - (s.player === "SCROMBUS" ? 0.15 : 0);
    const roll = Math.random() + (pick === "button" ? 0.15 : pick === "gauge" ? -0.15 : 0) + mal;
    this.tweens.add({ targets: spr, scaleX: 2.6, scaleY: 2.2, yoyo: true, duration: 90, repeat: 3 });
    synth.play("wonk");
    if (roll < 0.3) {
      this.player.wonk = Math.min(100, this.player.wonk + 60);
      this.toast("WONKING MACHINE", "SUCCESSFUL CHARGE. +60 Wonk.");
    } else if (roll < 0.5) {
      this.player.machineBuffUntil = this.now() + 20000;
      this.toast("WONKING MACHINE", "REACH-AROUND ENGAGED. +25% damage for 20s. Don't ask.");
    } else if (roll < 0.68) {
      G.s.krezz = Math.min(200, G.s.krezz + 50);
      this.toast("WONKING MACHINE", "KREZZ LEAK. +50 Krezz. The floor is now sticky.");
      this.add.ellipse(spr.x, spr.y + 60, 120, 40, 0xf5f0dc, 0.5).setDepth(2);
    } else if (roll < 0.84) {
      this.player.wonk = 100;
      this.damagePlayer(10, { x: spr.x, y: spr.y }, { unblockable: true, label: "OVERCHARGE" });
      this.toast("WONKING MACHINE", "OVERCHARGE. Wonk full. Also it bit you.");
    } else if (roll < 0.94) {
      for (let i = 0; i < 3; i++) this.spawnEnemy(this.dungeon.chapter >= 3 ? "pipe_gremlin" : "smolt", spr.x + (i - 1) * 50, spr.y + 70);
      this.toast("WONKING MACHINE", "BYPRODUCTS HAVE BECOME SENTIENT.");
    } else {
      synth.play("explode");
      this.boomFx(spr.x, spr.y + 40, 1.5);
      this.enemyAoe(spr.x, spr.y + 40, 120, 18, 500, 0xffd23f);
      this.aoe(spr.x, spr.y + 40, 160, 40, { knock: 300 });
      this.toast("WONKING MACHINE", "MACHINERY EXPLOSION. Big Bertha would never.");
    }
  }

  private async useVending(x: number, y: number) {
    const s = G.s;
    if (s.chapter === 3 && !s.flags.valves_done && this.dungeon.id === "ministry") {
      this.toast("VENDING", "OUT OF ORDER — Pussy juice pressure too low. Restore the valves.");
      return;
    }
    const iou = s.player === "KREZMAR" && s.upgrades.kz2;
    if (s.coins < 15 && !iou) {
      this.toast("VENDING", "Insufficient Krezzcoin. The machine judges you.");
      return;
    }
    if (s.coins >= 15) s.coins -= 15;
    const heal = 25 * (iou ? 2 : 1);
    s.hp = Math.min(maxHp(s), s.hp + heal);
    synth.play("gulp");
    this.floatText(x, y - 30, `+${heal} (vintage)`, "#ffb6c1", 14);
  }

  private openTV() {
    this.paused = true;
    this.scene.launch("TV", { overlay: true, caller: "Dungeon" });
    this.scene.pause();
  }

  // ------------------------------------------------------------------ ban rules

  private setRule(rule: BanRule | null, fromBoss: boolean) {
    this.rule = rule;
    G.emit("rule", rule ? rule.decree : null);
    if (rule && fromBoss) {
      synth.play("decree");
      this.toast("NEW RULE", rule.decree);
    }
  }

  private ruleBroken(kind: BanRule["kind"]) {
    if (!this.rule || this.rule.kind !== kind) return;
    this.addRisk(this.rule.risk, this.rule.decree);
  }

  private addRisk(n: number, why: string) {
    if (this.dying || this.busy) return;
    const banned = addBanRisk(G.s, n);
    this.floatText(this.player.x, this.player.y - 46, `BAN RISK +${Math.round(n)}`, "#ff4444", 12);
    if (banned) this.getBanned(why);
  }

  private getBanned(why: string) {
    this.busy = true;
    synth.play("banhammer");
    this.shake(600, 0.03);
    const pct = this.boss ? this.boss.hp / this.boss.maxHp : undefined;
    const hammer = this.add.text(this.player.x, this.player.y - 300, "🔨", { fontSize: "140px" }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({
      targets: hammer,
      y: this.player.y - 40,
      duration: 350,
      ease: "Quad.in",
      onComplete: () => {
        this.cameras.main.flash(300, 255, 255, 255);
        this.time.delayedCall(500, () => {
          this.transitioning = true;
          switchTo(this, "Exile", { why, returnTo: { dungeon: this.dungeon.id, room: this.roomIdx, bossHpPct: pct } });
        });
      },
    });
  }

  private drongusDecree() {
    const p = this.player;
    const now = this.now();
    const decrees = [
      { t: "DODGING IS NOW ILLEGAL", f: () => (p.noDodgeUntil = now + 6000) },
      { t: "HEALING REQUIRES A PERMIT", f: () => (p.noHealUntil = now + 8000) },
      { t: "YOUR NAME HAS BEEN CHANGED", f: () => {
        p.invertUntil = now + 4000;
        const names = ["SCROTTO JUMBLIN", "CREAMY DINGUS", "GENTKO", "LULON SHELGOR", "BOGGOR CRANSTIL", "FROTHY KRELMOR"];
        G.emit("rename", names[Math.floor(Math.random() * names.length)]);
      } },
      { t: "ALL KREZZ BELONGS TO THE STATE", f: () => {
        G.s.krezz = 0;
        p.noSpecialUntil = now + 6000;
      } },
    ];
    const d = decrees[Math.floor(Math.random() * decrees.length)];
    d.f();
    synth.play("decree");
    this.toast("DECREE", d.t);
    this.floatText(this.boss?.x ?? p.x, (this.boss?.y ?? p.y) - 80, d.t, "#ffd23f", 18);
  }

  // ------------------------------------------------------------------ CombatWorld API

  /** Side-scrolling rooms: these float about; everything else walks. */
  private isFlyer(type: string) {
    const d = ENEMIES[type];
    return !!d && d.behavior !== "leaper" && d.behavior !== "turret" && (d.shape === "bubble" || d.shape === "ghost" || d.shape === "drone" || d.shape === "page" || d.behavior === "orbiter" || d.behavior === "blinker");
  }

  spawnEnemy(type: string, x: number, y: number, opts: { noDrops?: boolean; minion?: boolean } = {}): Enemy | null {
    if (!ENEMIES[type]) return null;
    if (this.enemies.filter((e) => !e.dead).length > 28) return null;
    const s = G.s;
    const e = new Enemy(this, type, Phaser.Math.Clamp(x, this.bounds.left + 20, this.bounds.right - 20), Phaser.Math.Clamp(y, this.bounds.top + 20, this.bounds.bottom - 20), enemyHpMult(s));
    e.noDrops = !!opts.noDrops;
    e.minion = !!opts.minion;
    e.dmgMult = enemyDamageMult(s);
    e.speedMult = activeMods(s).enemySpeedMult * (s.ngPlus ? 1.1 : 1);
    e.hpBar = this.add.graphics().setDepth(800);
    if (this.side) {
      (e as any).big = SIDE_BIG * 0.95;
      e.setScale(2);
      // run'n'gun: grunts pop quickly
      e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * 0.75));
    }
    e.setDepth(y);
    this.enemies.push(e);
    this.enemyGroup.add(e);
    if (this.side && ENEMIES[type].behavior === "turret") {
      // perched: no gravity, stays put
      const tb = e.body as Phaser.Physics.Arcade.Body;
      tb.setAllowGravity(false).setImmovable(true).setCollideWorldBounds(true);
    } else if (this.side && !this.isFlyer(type)) {
      e.walker = true;
      (e.body as Phaser.Physics.Arcade.Body).setGravityY(1500).setCollideWorldBounds(true);
    } else if (this.side) (e.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(type !== "weapon_pod");
    if (type === "weapon_pod") {
      // big, flashing and easy to pop, and never an elite
      (e as any).big = 2.4;
      e.setScale(2);
      e.hp = e.maxHp = 6;
      const glow = this.add.circle(e.x, e.y, 26, 0xfde047, 0.25).setBlendMode(Phaser.BlendModes.ADD).setDepth(e.depth - 1);
      this.tweens.add({ targets: glow, scale: 1.5, alpha: 0.05, yoyo: true, repeat: -1, duration: 300 });
      const tag = this.add.text(e.x, e.y - 34, "WEAPON POD", { fontFamily: FONT, fontSize: "10px", color: "#fde047", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(1500);
      const follow = this.time.addEvent({ delay: 16, loop: true, callback: () => {
        if (!e.active || e.dead) { glow.destroy(); tag.destroy(); follow.remove(); return; }
        glow.setPosition(e.x, e.y);
        tag.setPosition(e.x, e.y - 34);
      } });
      return e;
    }
    this.spice?.onSpawn(e, opts);
    return e;
  }

  damageEnemy(e: Enemy, amount: number, opts: HitOpts = {}) {
    if (e.dead) return;
    const now = this.now();
    let a = amount;
    if (now < e.markedUntil) a *= 1.35;
    if (e instanceof Boss) {
      a = e.incoming(a, { source: opts.source });
      if (a <= 0 && !e.shielded) return;
    }
    if (opts.fixed) a = amount;
    if (e instanceof Boss && e.shielded) {
      if (opts.label !== "" && Math.random() < 0.3) this.floatText(e.x, e.y - 40, "SHIELDED", "#88aaff", 12);
      return;
    }
    e.hp -= a;
    e.flashUntil = now + 70;
    if (extraViolence(G.s) && a > 0 && now - this.lastSplat > 45) {
      this.lastSplat = now;
      this.splatter(e.x, e.y, e.isBoss ? 5 : 3, 0.7);
    }
    if (opts.stun) e.stunUntil = Math.max(e.stunUntil, now + (e.isBoss ? opts.stun * 0.25 : opts.stun));
    if (opts.mark) e.markedUntil = now + 6000;
    if (opts.slow) {
      e.slowUntil = now + 2000;
      e.slowAmt = opts.slow;
    }
    if (opts.knock && !e.isBoss) {
      const ang = opts.angle ?? Math.atan2(e.y - this.player.y, e.x - this.player.x);
      const body = e.body as Phaser.Physics.Arcade.Body;
      body.velocity.x += Math.cos(ang) * opts.knock;
      body.velocity.y += Math.sin(ang) * opts.knock;
      e.stunUntil = Math.max(e.stunUntil, now + 120);
    }
    if (opts.label !== "") {
      const txt = opts.label ?? String(Math.max(1, Math.round(a)));
      this.floatText(e.x + (Math.random() - 0.5) * 16, e.y - 20, txt, opts.label === "99" ? "#ff2a2a" : opts.crit ? "#ffd23f" : "#ffffff", opts.label === "99" ? 24 : opts.crit ? 18 : 13);
      synth.play(opts.crit ? "crit" : "hit");
      if (opts.crit) this.hitStop(50);
      // a drawn hit spark where it landed (throttled so a minigun doesn't paint the room)
      if (now - this.lastHitFx > 45 || opts.crit) {
        this.lastHitFx = now;
        vfx(this, opts.crit ? "vfx_crit" : "vfx_hit", e.x + (Math.random() - 0.5) * 10, e.y - 6 + (Math.random() - 0.5) * 10, { scale: opts.crit ? 1 : 0.8, depth: e.depth + 3 });
      }
    }
    if (!opts.noWonk) {
      // meters fill with time spent landing hits, not raw hit count (so a gatling isn't a cheat code)
      const now2 = this.now();
      const k = Phaser.Math.Clamp((now2 - this.lastMeterHit) / 240, 0.15, 1);
      this.lastMeterHit = now2;
      const up2 = G.s.upgrades;
      this.addWonk(Math.min(3, 0.3 + a * 0.05) * k * (1 + 0.15 * (up2.pk_jet ?? 0)));
      const up = addFart((0.3 + Math.min(1.2, a * 0.03)) * k * (1 + 0.3 * (up2.pk_meter ?? 0)) * (1 + 0.15 * (up2.pk_ibs ?? 0)));
      if (up) this.fartLevelUp(up);
    }
    if (e.hp <= 0) {
      // kills made by farts and auras don't refill the fart meter
      if (opts.noWonk) (e as any).noFartKill = true;
      this.killEnemy(e);
    }
  }

  private killEnemy(e: Enemy) {
    if (e.dead) return;
    const s = G.s;
    e.kill();
    this.enemies = this.enemies.filter((x) => x !== e);
    bump(s, "kills_total");
    if (e.def.counter) bump(s, e.def.counter);
    if (!e.isBoss) this.addWonk(2);
    this.spice?.onKill(e);
    // a tiny freeze and a pop on every kill (rate-limited so swarms don't stutter)
    if (!e.isBoss && this.now() - this.lastKillStop > 140) {
      this.lastKillStop = this.now();
      this.hitStop(e.def.size >= 16 ? 45 : 25);
      this.shake(80, e.def.size >= 16 ? 0.004 : 0.002);
    }
    if (!e.isBoss && !vfx(this, "vfx_pixeldeath", e.x, e.y, { scale: Math.max(0.6, e.def.size / 18), depth: 1400 })) {
      const ring = this.add.circle(e.x, e.y, 6, 0xffffff, 0).setStrokeStyle(3, e.def.accent, 0.9).setDepth(1400);
      this.tweens.add({ targets: ring, radius: 30, alpha: 0, duration: 200, onComplete: () => ring.destroy() });
    }
    if (!(e as any).noFartKill) {
      const up = addFart(2.6 * (1 + 0.15 * (G.s.upgrades.pk_ibs ?? 0)));
      if (up) this.fartLevelUp(up);
    }
    if (e.def.id === "weapon_pod") {
      this.weaponPod(e.x, e.y);
      return;
    }
    if (e.def.id === "fuel_tank") {
      this.events.emit("fuel-tank-dead", e.x, e.y);
      return;
    }
    if (extraViolence(s) && !e.isBoss) {
      this.dismember(e);
      // the Kreddle BLOOD BATH prize: now and then it hits the lens
      if (kd(s, "kd_violence") > 0 && Math.random() < 0.18) this.screenSplat(2);
    }
    else if (e.isBoss || !hasVfx(this, "vfx_pixeldeath")) this.burst(e.x, e.y, e.def.color, e.isBoss ? 30 : 8);
    // a kill has its own little pop (not every one in a swarm)
    if (!e.isBoss && this.now() - this.lastKillPop > 90) {
      this.lastKillPop = this.now();
      synth.play(extraViolence(s) ? "splat" : "pop");
    }
    if (e instanceof Boss) {
      this.boss = null;
      this.onBossDefeated(e);
      return;
    }
    if (!e.noDrops) {
      const mods = activeMods(s);
      let coins = Math.round(e.def.coins * mods.coinMult * (s.player === "KREZMAR" ? 1.35 : 1) * (1 + 0.25 * kd(s, "kd_lucky")));
      while (coins > 0) {
        const v = Math.min(coins, 3);
        this.dropPickup(e.x + (Math.random() - 0.5) * 20, e.y + (Math.random() - 0.5) * 20, "coin", v);
        coins -= v;
      }
      if (Math.random() < 0.6) this.dropPickup(e.x, e.y, "krezz", e.def.krezz);
      if (Math.random() < 0.06) this.dropPickup(e.x, e.y, "heal", 12);
      if (mods.crobleys && Math.random() < 0.12) this.dropPickup(e.x, e.y, "crobley", 1);
      if (Math.random() < 0.02) this.dropPickup(e.x, e.y, "bongo", 1);
      if (ownedGuns().length) {
        // more often when you're running low; a guaranteed one after a dry spell
        this.ammoDry++;
        const chance = e.isBoss ? 1 : this.ammoLow() ? 0.4 : 0.22;
        if (Math.random() < chance || this.ammoDry >= 6) {
          this.ammoDry = 0;
          this.dropPickup(e.x + 10, e.y, "ammo", 1);
        }
      }
      if (mods.splitChance && !e.minion && Math.random() < mods.splitChance) {
        const w = this.spawnEnemy(e.def.id, e.x + 20, e.y, { noDrops: true, minion: true });
        if (w) {
          w.setTint(0x6b21a8);
          w.hp = w.maxHp = Math.round(w.maxHp * 0.5);
          this.floatText(e.x, e.y - 30, "WALUIGI VERSION", "#a855f7", 12);
        }
      }
    }
    if (Math.random() < 0.08) this.player.bark();
  }

  damagePlayer(amount: number, from?: { x: number; y: number }, opts: { unblockable?: boolean; label?: string } = {}) {
    if (this.dying || this.busy) return;
    const now = this.now();
    const p = this.player;
    if (!opts.unblockable && p.invulnerable(now)) {
      if (now < p.iframesUntil) p.perfectDodge();
      return;
    }
    if (opts.unblockable) p.iframesUntil = 0;
    const took = p.takeHit(amount, now);
    if (!took) return;
    this.floatText(p.x, p.y - 30, opts.label ?? `-${Math.round(amount)}`, "#ff4444", 15);
    if (now - this.lastHurtSfx > 120) {
      synth.play("hurt");
      this.lastHurtSfx = now;
    }
    this.shake(120, 0.008);
    p.spr.setTintFill(0xff0000);
    this.time.delayedCall(80, () => p.spr.clearTint());
    if (from && p.id !== "GRONNY") {
      const a = Math.atan2(p.y - from.y, p.x - from.x);
      (p.spr.body as Phaser.Physics.Arcade.Body).velocity.add(new Phaser.Math.Vector2(Math.cos(a) * 160, Math.sin(a) * 160));
    }
    if (G.s.hp < maxHp(G.s) * 0.25) G.drongus("low_hp");
    if (G.s.hp <= 0) this.die();
  }

  shoot(x: number, y: number, o: ShotOpts): Phaser.Physics.Arcade.Sprite {
    if (this.side && o.owner === "enemy") {
      // run'n'gun fairness: nobody off-screen shoots you, enemy bullets are slower and big and bright,
      // and there are never too many on screen at once
      const v = this.cameras.main.worldView;
      const live = this.shots.filter((sh) => sh.o.owner === "enemy").length;
      if (live >= 9 || x < v.x - 30 || x > v.right + 30 || y < v.y - 30 || y > v.bottom + 30) o = { ...o, life: 1 };
      o = { ...o, speed: o.speed * 0.8, scale: (o.scale ?? 1) * 1.25 };
    }
    // run'n'gun: your bullets should snap across the screen, not drift (slow guns felt awful side-on)
    if (this.side && o.owner === "player") o = { ...o, speed: Math.max(o.speed * 1.7, 950) };
    const tex = o.texture ?? "fx_bullet";
    const spr = this.add.image(x, y, tex).setDepth(600).setScale((o.scale ?? 1) * (o.owner === "enemy" ? 1.8 : 1.6)).setTint(o.color ?? 0xffffff);
    spr.setRotation(o.angle);
    this.shots.push({ spr, vx: Math.cos(o.angle) * o.speed, vy: Math.sin(o.angle) * o.speed, life: o.life ?? 2000, o, hit: new Set() });
    return spr as unknown as Phaser.Physics.Arcade.Sprite;
  }

  private killShot(sh: Shot) {
    sh.spr.destroy();
    this.shots = this.shots.filter((x) => x !== sh);
  }

  aoe(x: number, y: number, r: number, dmg: number, opts: HitOpts & { color?: number } = {}): number {
    if (opts.color !== undefined && !vfx(this, "vfx_shock", x, y + 4, { scale: (r * 2) / 100, depth: 6, tint: opts.color })) {
      const c = this.add.image(x, y, "fx_circle").setTint(opts.color).setAlpha(0.45).setDepth(5).setScale((r * 2) / 64);
      this.tweens.add({ targets: c, alpha: 0, scale: c.scale * 1.15, duration: 280, onComplete: () => c.destroy() });
    }
    let n = 0;
    for (const e of [...this.enemies]) {
      if (e.dead) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= r + e.radius) {
        this.damageEnemy(e, dmg, { ...opts, angle: Math.atan2(e.y - y, e.x - x) });
        n++;
      }
    }
    if (this.boss instanceof DrongusBoss) this.boss.hitSong(x, y, r);
    if (dmg > 0) this.spice?.hitAoe(x, y, r, dmg);
    return n;
  }

  enemyAoe(x: number, y: number, r: number, dmg: number, delayMs: number, color = 0xff3333) {
    const ring = this.add.circle(x, y, r, color, 0.12).setStrokeStyle(2, color, 0.9).setDepth(4);
    const fill = this.add.circle(x, y, 1, color, 0.3).setDepth(4);
    this.tweens.add({ targets: fill, radius: r, duration: delayMs });
    this.time.delayedCall(delayMs, () => {
      this.tweens.killTweensOf(fill);
      ring.destroy();
      fill.destroy();
      if (!this.player || this.player.dead) return;
      // the attack lands: green ones are gas, the rest a shockwave
      const green = ((color >> 8) & 255) > ((color >> 16) & 255) + 40;
      if (!vfx(this, green ? "vfx_fart" : "vfx_shock", x, y + 4, { scale: (r * 2) / (green ? 80 : 100), depth: 6, tint: green ? undefined : color })) {
        const fx = this.add.image(x, y, "fx_circle").setTint(color).setAlpha(0.6).setDepth(5).setScale((r * 2) / 64);
        this.tweens.add({ targets: fx, alpha: 0, duration: 250, onComplete: () => fx.destroy() });
      }
      if (dmg > 0 && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < r + 6) this.damagePlayer(dmg, { x, y });
    });
  }

  enemyLine(x: number, y: number, angle: number, len: number, width: number, dmg: number, delayMs: number) {
    const g = this.add.graphics().setDepth(4);
    const ex = x + Math.cos(angle) * len;
    const ey = y + Math.sin(angle) * len;
    g.lineStyle(width, 0xff3333, 0.18).lineBetween(x, y, ex, ey);
    g.lineStyle(2, 0xff3333, 0.8).lineBetween(x, y, ex, ey);
    this.time.delayedCall(delayMs, () => {
      g.destroy();
      if (dmg <= 0 || !this.player) return;
      const fx = this.add.graphics().setDepth(5);
      fx.lineStyle(width, 0xffaaaa, 0.7).lineBetween(x, y, ex, ey);
      this.tweens.add({ targets: fx, alpha: 0, duration: 250, onComplete: () => fx.destroy() });
      const line = new Phaser.Geom.Line(x, y, ex, ey);
      const pt = Phaser.Geom.Line.GetNearestPoint(line, new Phaser.Geom.Point(this.player.x, this.player.y));
      if (Phaser.Math.Distance.Between(pt.x, pt.y, this.player.x, this.player.y) < width / 2 + 8) this.damagePlayer(dmg, { x: pt.x, y: pt.y });
    });
  }

  floatText(x: number, y: number, text: string, color = "#ffffff", size = 13) {
    if (!text.trim()) return;
    let t = text;
    if (this.now() < this.conflictUntil && /^\d+$/.test(t)) t = String(Math.round(Number(t) * (0.5 + Math.random())));
    const tx = this.add.text(x, y, t, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold" }).setOrigin(0.5).setDepth(1500).setStroke("#000000", 3);
    this.tweens.add({ targets: tx, y: y - 34, alpha: 0, duration: 900, ease: "Quad.out", onComplete: () => tx.destroy() });
  }

  shake(ms: number, intensity: number) {
    if (SHAKE()) this.cameras.main.shake(ms, intensity);
  }

  hitStop(ms: number) {
    this.hitStopUntil = Math.max(this.hitStopUntil, this.now() + ms);
  }

  private fartLevelUp(level: number) {
    synth.play("fart_ready");
    const names = ["", "FAIRY FART READY", "BAKED BEANS READY", "CABBAGE READY", "IBS ATTACK READY!!"];
    this.floatText(this.player.x, this.player.y - 58, `💨 ${names[level]}`, level === 4 ? "#d4ff3a" : "#9ccc65", level === 4 ? 18 : 13);
    if (level === 4) this.toast("💨 IBS ATTACK READY", "Press G (or the 💨 button) to unleash it.");
  }

  addWonk(n: number) {
    if (!this.player) return;
    const mult = this.boss instanceof DrongusBoss && this.boss.phase === 2 ? 1.6 : 1;
    const before = this.player.wonk;
    this.player.wonk = Math.min(100, this.player.wonk + n * mult * (1 + 0.3 * (G.s.upgrades.pk_meter ?? 0)));
    if (before < 100 && this.player.wonk >= 100) {
      synth.play("wonk");
      this.floatText(this.player.x, this.player.y - 50, "WONK FULL — R: WONK YOUR THANG", "#ff8c00", 15);
    }
  }

  toast(title: string, text: string) {
    G.emit("toast", { title, text });
  }

  nearestEnemy(x: number, y: number, maxDist = 9999, exclude?: Enemy): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist;
    for (const e of this.enemies) {
      if (e.dead || e === exclude) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  burst(x: number, y: number, color: number, n = 8) {
    if (vfx(this, "vfx_sparks", x, y, { scale: Math.min(1.4, 0.4 + n / 20), depth: 700, tint: color === 0xffffff ? undefined : color })) return;
    for (let i = 0; i < n; i++) {
      const d = this.add.image(x, y, "fx_dot").setTint(color).setDepth(700).setScale(1 + Math.random());
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 60;
      this.tweens.add({ targets: d, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 400 + Math.random() * 300, onComplete: () => d.destroy() });
    }
  }

  dropPickup(x: number, y: number, kind: Pickup["kind"], value: number) {
    const tex = { coin: "p_coin", krezz: "p_krezz", heal: "p_bottle", crobley: "p_crobley", quest: "p_scroll", bottle: "p_bottle", bongo: "p_bongo", ammo: "p_ammo" }[kind];
    const spr = this.add.image(x, y, this.textures.exists(tex) ? tex : "p_coin").setScale(2).setDepth(15);
    if (kind === "ammo") fitTo(spr, 26);
    if (this.side && !this.room.tower && y < this.groundY - 16) this.tweens.add({ targets: spr, y: this.groundY - 14, duration: 200 + (this.groundY - y) * 1.2, ease: "Bounce.out" });
    else this.tweens.add({ targets: spr, y: y - 8, yoyo: true, duration: 220 });
    this.pickups.push({ spr, kind, value });
  }

  // ------------------------------------------------------------------ helpers

  /** THE CUM CRYSTAL IS YOURS! YEAH! Every main boss drops one: a big, loud, sparkly moment. */
  private crystalGet(b: Boss): Promise<void> {
    const s = G.s;
    if (!carriesCrystal(b.bossId) || s.flags[`crystal_${b.bossId}`]) return Promise.resolve();
    s.flags[`crystal_${b.bossId}`] = true;
    G.save();
    const n = crystalCount(s);
    const D = 9500;
    const cam = this.cameras.main;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T) => (objs.push(o), o);
    const fix = <T extends Phaser.GameObjects.GameObject & { setScrollFactor: (n: number) => T; setDepth: (n: number) => T }>(o: T, d = 0) => keep(o.setScrollFactor(0).setDepth(5000 + d));
    synth.music("crystal", true);
    cam.flash(400, 255, 255, 255);
    cam.shake(400, 0.012);
    // the room goes dark purple, and light rays spin out from the middle
    const dim = fix(this.add.rectangle(480, 270, 960, 540, 0x1a0630, 0));
    this.tweens.add({ targets: dim, fillAlpha: 0.75, duration: 400 });
    const rays = fix(this.add.container(480, 230), 1);
    const cols = [0xf472b6, 0xfde047, 0x67e8f9, 0xffffff, 0xc084fc, 0x86efac];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const t = this.add.triangle(0, 0, 0, 0, Math.cos(a - 0.09) * 700, Math.sin(a - 0.09) * 700, Math.cos(a + 0.09) * 700, Math.sin(a + 0.09) * 700, cols[i % cols.length], 0.3).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD);
      rays.add(t);
    }
    rays.setScale(0);
    this.tweens.add({ targets: rays, scale: 1, duration: 600, ease: "Back.out" });
    for (let i = 0; i < 3; i++) {
      const c = vfx(this, "vfx_confetti", 300 + i * 180, 260, { fixed: true, depth: D + 30, scale: 2.6, delay: 250 + i * 220 });
      if (c) objs.push(c);
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });
    // the crystal flies out of the boss and up to the middle of the screen
    const start = cam.getWorldPoint(0, 0);
    const bx = Phaser.Math.Clamp(b.x - start.x, 40, 920);
    const by = Phaser.Math.Clamp(b.y - start.y, 40, 500);
    const glow = fix(this.add.circle(480, 230, 70, 0xfbcfe8, 0.45).setBlendMode(Phaser.BlendModes.ADD), 2);
    glow.setScale(0);
    const gem = fix(this.textures.exists("cum_crystal") ? this.add.image(bx, by, "cum_crystal").setScale(0.6) : this.add.text(bx, by, "💎", { fontSize: "40px" }).setOrigin(0.5), 3) as Phaser.GameObjects.Image;
    this.tweens.add({ targets: gem, x: 480, y: 230, scale: 3.2, duration: 900, ease: "Cubic.out", onComplete: () => {
      synth.play("ding");
      cam.flash(250, 255, 240, 250);
      this.tweens.add({ targets: glow, scale: { from: 0.6, to: 1.5 }, alpha: { from: 0.55, to: 0.25 }, yoyo: true, repeat: -1, duration: 450 });
      this.tweens.add({ targets: gem, y: 215, yoyo: true, repeat: -1, duration: 700, ease: "Sine.inOut" });
      this.tweens.add({ targets: gem, scaleX: { from: 3.2, to: -3.2 }, yoyo: true, repeat: -1, duration: 900, ease: "Sine.inOut" });
      // sparkles burst out
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = fix(this.add.text(480, 230, Math.random() < 0.5 ? "✨" : "⭐", { fontSize: `${14 + Math.floor(Math.random() * 18)}px` }).setOrigin(0.5), 4);
        this.tweens.add({ targets: sp, x: 480 + Math.cos(a) * (150 + Math.random() * 300), y: 230 + Math.sin(a) * (100 + Math.random() * 220), alpha: 0, angle: 360, duration: 1100 + Math.random() * 700, ease: "Cubic.out" });
      }
    } });
    // the words, letter by letter, bouncing in rainbow
    const line1 = "THE CUM CRYSTAL IS YOURS!";
    const w = 30;
    const x0 = 480 - (line1.length * w) / 2 + w / 2;
    [...line1].forEach((ch, i) => {
      const t = fix(this.add.text(x0 + i * w, 400, ch, { fontFamily: "Impact, sans-serif", fontSize: "46px", color: "#" + cols[i % cols.length].toString(16).padStart(6, "0"), stroke: "#2a0f3d", strokeThickness: 8 }).setOrigin(0.5).setScale(0), 6) as Phaser.GameObjects.Text;
      this.tweens.add({ targets: t, scale: 1, delay: 900 + i * 45, duration: 260, ease: "Back.out", onComplete: () => this.tweens.add({ targets: t, y: 388, yoyo: true, repeat: -1, duration: 300, delay: i * 40, ease: "Sine.inOut" }) });
    });
    const yeah = fix(this.add.text(480, 462, "YEAH!", { fontFamily: "Impact, sans-serif", fontSize: "64px", color: "#fde047", stroke: "#db2777", strokeThickness: 10 }).setOrigin(0.5).setScale(0), 6) as Phaser.GameObjects.Text;
    this.time.delayedCall(2200, () => {
      synth.play("boom");
      cam.shake(350, 0.02);
      this.tweens.add({ targets: yeah, scale: 1.25, angle: { from: -20, to: -6 }, duration: 300, ease: "Back.out", onComplete: () => this.tweens.add({ targets: yeah, scale: 1.05, angle: 6, yoyo: true, repeat: -1, duration: 220 }) });
    });
    // the tally: six slots along the top
    CRYSTAL_BOSSES.forEach((_, i) => {
      const x = 480 + (i - 2.5) * 56;
      fix(this.add.rectangle(x, 46, 40, 48, 0x0b0612, 0.9).setStrokeStyle(2, 0xc084fc), 5);
      if (i < n && this.textures.exists("cum_crystal")) {
        const c = fix(this.add.image(x, 46, "cum_crystal").setScale(i === n - 1 ? 0 : 0.75), 6) as Phaser.GameObjects.Image;
        if (i === n - 1) this.tweens.add({ targets: c, scale: 0.75, delay: 1600, duration: 400, ease: "Back.out" });
      }
    });
    const tally = fix(this.add.text(480, 86, n >= CRYSTALS_NEEDED ? "ALL SIX! DA DRONGUS DUNGEON IS OPEN!" : `CUM CRYSTALS: ${n}/${CRYSTALS_NEEDED}  ·  Da Drongus Dungeon's seal weakens`, { fontFamily: FONT, fontSize: "15px", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setAlpha(0), 6);
    this.tweens.add({ targets: tally, alpha: 1, delay: 1700, duration: 300 });
    // confetti and fireworks the whole way through
    const confetti = this.time.addEvent({ delay: 40, loop: true, callback: () => {
      const c = fix(this.add.rectangle(Math.random() * 960, -10, 6, 10, cols[Math.floor(Math.random() * cols.length)]), 4);
      this.tweens.add({ targets: c, y: 560, x: c.x + (Math.random() - 0.5) * 200, angle: 720, duration: 2200 + Math.random() * 1200, onComplete: () => c.destroy() });
    } });
    const fireworks = this.time.addEvent({ delay: 650, loop: true, callback: () => {
      const fx = 120 + Math.random() * 720;
      const fy = 80 + Math.random() * 200;
      const col = cols[Math.floor(Math.random() * cols.length)];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const p = fix(this.add.circle(fx, fy, 3, col).setBlendMode(Phaser.BlendModes.ADD), 1);
        this.tweens.add({ targets: p, x: fx + Math.cos(a) * 90, y: fy + Math.sin(a) * 90 + 20, alpha: 0, duration: 800, ease: "Cubic.out", onComplete: () => p.destroy() });
      }
    } });
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        confetti.remove();
        fireworks.remove();
        this.input.off("pointerdown", skip);
        this.input.keyboard?.off("keydown", skip);
        this.tweens.add({ targets: objs, alpha: 0, duration: 400, onComplete: () => { for (const o of objs) o.destroy(); resolve(); } });
      };
      const skip = () => { if (this.time.now - t0 > 3000) finish(); };
      const t0 = this.time.now;
      this.input.on("pointerdown", skip);
      this.input.keyboard?.on("keydown", skip);
      this.time.delayedCall(D, finish);
    });
  }

  private talk(lines: Line[]): Promise<void> {
    this.paused = true;
    const t0 = Date.now();
    // "YOU" in boss scripts means whoever you're playing as
    lines = lines.map((l) => (l.s === "YOU" ? { ...l, s: G.s.player } : l));
    return runDialogue(this, lines).then(() => {
      if (G.rt.timerEnd) G.rt.timerEnd += Date.now() - t0;
      this.controls?.swallow();
      this.paused = false;
    });
  }

  /** A bottled fairy: out she comes, round you she goes, and you're back on your feet. */
  private fairyRevive() {
    const s = G.s;
    s.upgrades.fairies = Math.max(0, (s.upgrades.fairies ?? 0) - 1);
    s.hp = maxHp(s);
    const p = this.player;
    p.iframesUntil = this.now() + 2500;
    G.save();
    this.hitStop(120);
    this.cameras.main.flash(400, 255, 200, 240);
    [1047, 1319, 1568, 2093].forEach((f, i) => this.time.delayedCall(i * 110, () => synth.play("ding")));
    synth.play("perfect");
    this.bigText("A FAIRY REVIVES YOU!", "#ff9ad5", 34);
    const fairy = this.add.container(p.x, p.y).setDepth(980);
    const glow = this.add.circle(0, 0, 16, 0xffc0eb, 0.45).setBlendMode(Phaser.BlendModes.ADD);
    const body = this.add.circle(0, 0, 6, 0xffffff);
    const wl = this.add.ellipse(-8, -4, 12, 18, 0xbfe9ff, 0.8);
    const wr = this.add.ellipse(8, -4, 12, 18, 0xbfe9ff, 0.8);
    fairy.add([glow, wl, wr, body]);
    this.tweens.add({ targets: [wl, wr], scaleX: 0.3, yoyo: true, repeat: -1, duration: 60 });
    const t0 = this.time.now;
    const orbit = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      const a = (this.time.now - t0) / 140;
      const r = 46 - Math.min(30, (this.time.now - t0) / 60);
      fairy.setPosition(p.x + Math.cos(a) * r, p.y - 10 + Math.sin(a) * r * 0.6);
      if (Math.random() < 0.6) {
        const sp = this.add.star(fairy.x, fairy.y, 4, 1.5, 4, [0xffc0eb, 0xffffff, 0xbfe9ff][Math.floor(Math.random() * 3)]).setDepth(979).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: sp, y: sp.y + 20, alpha: 0, duration: 600, onComplete: () => sp.destroy() });
      }
    } });
    this.time.delayedCall(1800, () => {
      orbit.remove();
      this.tweens.add({ targets: fairy, y: fairy.y - 200, alpha: 0, duration: 600, onComplete: () => fairy.destroy() });
    });
    this.toast("SAVED BY A FAIRY", `Full health. ${s.upgrades.fairies ? `${s.upgrades.fairies} fairy left in the bottle.` : "That was your last fairy. Get more at the Kreddle Exchange."}`);
  }

  private die() {
    if (this.dying) return;
    if ((G.s.upgrades.fairies ?? 0) > 0 && this.player && !this.player.dead) {
      this.fairyRevive();
      return;
    }
    this.dying = true;
    this.player.dead = true;
    synth.play("death");
    (this.player.spr.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const menu = () => {
      this.scene.launch("Menu", { mode: "death", caller: "Dungeon", dungeon: this.dungeon.id, room: this.roomIdx, bossHpPct: undefined, rush: this.boss ? this.rushIdx : 0 });
      this.scene.pause();
    };
    // drawn collapse if the character has one, then the death menu
    const meta = charMeta(this, this.player.spr.texture.key);
    const f = (this.player.spr.getData("facing") as string) ?? "south";
    const side = f === "east" || f === "west";
    const fall = meta?.death ? ((side ? meta.death.east : meta.death.south) ?? meta.death.east ?? meta.death.south) : undefined;
    if (fall?.length) {
      const spr = this.player.spr.setFlipX(f === "west").setAlpha(1).clearTint();
      (spr.body as Phaser.Physics.Arcade.Body).enable = false;
      this.player.gunSpr?.setVisible(false);
      fall.forEach((fr, i) => this.time.delayedCall(i * 110, () => spr.active && spr.setFrame(fr)));
      this.time.delayedCall(fall.length * 110 + 700, menu);
      return;
    }
    this.player.spr.setAngle(90).setTint(0x888888);
    menu();
  }

  // ------------------------------------------------------------------ update

  /** Bullet time: everything (timers, tweens, physics, the update loop) runs at `k` speed. */
  setSlowmo(k: number) {
    this.slowmo = k;
    this.time.timeScale = k;
    this.tweens.timeScale = k;
    this.physics.world.timeScale = 1 / k;
  }

  /** Hold SWAP: the action slows right down and the weapon picker opens. */
  openWeaponPicker() {
    if (this.picking || this.busy || this.dying) return;
    this.picking = true;
    this.setSlowmo(0.08);
    (this.player.spr.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.events.once("weapon-picked", () => {
      this.picking = false;
      this.setSlowmo(1);
      this.controls.swallow();
    });
    this.scene.launch("WeaponPick", { caller: "Dungeon" });
  }

  update(time: number, delta: number) {
    delta *= this.slowmo;
    this.vClock += delta;
    if (!this.player || this.transitioning || !this.player.spr.body) return;
    if (G.s.flags.debug_mode) G.rt.fart = 100; // debug: IBS attack always ready
    if (this.controls.pause() && !this.busy && !this.dying) {
      this.scene.launch("Menu", { mode: "pause", caller: "Dungeon" });
      this.scene.pause();
      return;
    }
    if (this.paused || this.dying) return;
    const now = this.now();
    if (!this.busy) this.companion?.update(now);
    if (!this.busy) this.spice?.update(now, Math.min(delta, 50));
    if (!this.busy) for (const b of this.bros) b.update(now, Math.min(delta, 50));
    this.sideLevel?.update(Math.min(delta, 50), this.busy);
    if (this.sideLevel?.triggersDone() && !this.roomCleared && !this.room.boss && !this.busy) this.onRoomCleared();
    if (now < this.hitStopUntil) {
      this.physics.world.isPaused || this.physics.world.pause();
      return;
    }
    if (this.physics.world.isPaused) this.physics.world.resume();
    const dt = Math.min(delta, 50);
    const s = G.s;
    if (this.dungeon.timerSec && G.rt.timerEnd) {
      const left = Math.max(0, G.rt.timerEnd - Date.now());
      G.emit("timer", left / 1000);
      if (left <= 0 && !this.busy) {
        this.missionFailed();
        return;
      }
    }
    // timescale (Terrible Prophecy)
    this.enemyTimeScale = now < this.prophecyUntil ? 0.25 : 1;
    const ne = this.nearestEnemy(this.player.x, this.player.y, 520);
    this.controls.autoAim = ne ? Math.atan2(ne.y - this.player.y, ne.x - this.player.x) : null;
    this.controls.autoAimPoint = ne ? { x: ne.x, y: ne.y } : { x: this.player.x + Math.cos(this.player.aim) * 180, y: this.player.y + Math.sin(this.player.aim) * 180 };
    if (!this.busy && !this.picking) this.player.update(dt, now, this.controls);
    else (this.player.spr.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    {
      const pb = this.player.spr.body as Phaser.Physics.Arcade.Body;
      leadCamera(this.cameras.main, pb.velocity.x, this.side ? 0 : pb.velocity.y, dt, 0.12, 36);
      if (this.sideBg) this.sideBg.tilePositionX = (this.cameras.main.scrollX * (this.room.ledges ? 1 : 0.35)) / this.sideBgScale;
      if (this.towerBg) this.towerBg.tilePositionY = (this.cameras.main.scrollY * 0.5) / this.towerBg.tileScaleY;
    }
    // intoxication decays slowly
    s.intoxication = Math.max(0, s.intoxication - dt * 0.0006);
    s.playtimeMs += dt;
    // ban rule: standing still / attack spam
    if (this.rule && !this.busy) {
      if (this.rule.kind === "NO_STANDING_STILL" && this.player.stillTime > 900 && now - this.lastStillTick > 900) {
        this.lastStillTick = now;
        this.addRisk(this.rule.risk, this.rule.decree);
      }
      if (this.rule.kind === "NO_ATTACK_SPAM" && this.player.attackHeldTime > 2500 && now - this.lastStillTick > 900) {
        this.lastStillTick = now;
        this.addRisk(this.rule.risk, this.rule.decree);
      }
    }
    // enemies
    const edt = dt * this.enemyTimeScale;
    for (const e of [...this.enemies]) {
      if (e.dead) continue;
      if (!this.busy) e.tick(edt, now);
      if (e.def.shout && !this.busy && Math.random() < edt / (e.def.id === "tumor" ? 2600 : 4200)) this.floatText(e.x, e.y - 30, e.def.shout[Math.floor(Math.random() * e.def.shout.length)], e.def.id === "tumor" ? "#e9d5ff" : "#ffffff", e.def.id === "tumor" ? 14 : 11);
      else (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      if (this.enemyTimeScale < 1) {
        const b = e.body as Phaser.Physics.Arcade.Body;
        if (b.velocity.length() > e.def.speed * 0.4) b.velocity.scale(0.5);
      }
      e.setDepth(e.y);
      // contact damage
      if (!this.busy && e.def.damage > 0 && now > e.contactCd && !this.player.isHidden() && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < e.radius + 10) {
        e.contactCd = now + 700;
        this.damagePlayer(e.contactDamage(), e);
      }
    }
    this.player.spr.setDepth(this.player.y + 1);
    // shots
    for (const sh of [...this.shots]) {
      const k = sh.o.owner === "enemy" ? this.enemyTimeScale : 1;
      if (sh.o.homing) {
        const target = sh.o.owner === "enemy" ? this.player : this.nearestEnemy(sh.spr.x, sh.spr.y, 400);
        if (target) {
          const cur = Math.atan2(sh.vy, sh.vx);
          const want = Math.atan2(target.y - sh.spr.y, target.x - sh.spr.x);
          const na = cur + Phaser.Math.Angle.Wrap(want - cur) * Math.min(1, (sh.o.homing * dt) / 1000);
          sh.vx = Math.cos(na) * sh.o.speed;
          sh.vy = Math.sin(na) * sh.o.speed;
          sh.spr.setRotation(na);
        }
      }
      sh.spr.x += (sh.vx * dt * k) / 1000;
      sh.spr.y += (sh.vy * dt * k) / 1000;
      if (sh.o.trail !== undefined && Math.random() < 0.7) {
        const t = this.add.circle(sh.spr.x, sh.spr.y, 3, sh.o.trail, 0.85).setDepth(599).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: t, alpha: 0, scale: 0.3, duration: 260, onComplete: () => t.destroy() });
      }
      sh.life -= dt * k;
      if (sh.life <= 0 || !Phaser.Geom.Rectangle.Contains(this.bounds, sh.spr.x, sh.spr.y)) {
        sh.o.onEnd?.(sh.spr.x, sh.spr.y);
        this.killShot(sh);
        continue;
      }
      if (sh.o.owner === "player") {
        if (this.spice?.hitShot(sh.spr.x, sh.spr.y, sh.o.damage || 30)) {
          sh.o.onHit?.(sh.spr.x, sh.spr.y);
          this.killShot(sh);
          continue;
        }
        if (this.boss instanceof DrongusBoss && this.boss.hitSong(sh.spr.x, sh.spr.y, 4)) {
          this.killShot(sh);
          continue;
        }
        if (this.boss instanceof OverWonkedMachine) {
          this.boss.valves.forEach((v, i) => {
            if (Phaser.Math.Distance.Between(v.spr.x, v.spr.y, sh.spr.x, sh.spr.y) < 24) (this.boss as OverWonkedMachine).hitValve(i, now);
          });
        }
        for (const e of this.enemies) {
          if (e.dead || sh.hit.has(e.uid)) continue;
          if (Phaser.Math.Distance.Between(e.x, e.y, sh.spr.x, sh.spr.y) < e.radius + 6) {
            sh.hit.add(e.uid);
            this.damageEnemy(e, sh.o.damage, { crit: sh.o.crit, knock: sh.o.knock ?? 60, angle: Math.atan2(sh.vy, sh.vx), slow: sh.o.slow });
            sh.o.onHit?.(sh.spr.x, sh.spr.y);
            if ((sh.o.ricochet ?? 0) > 0) {
              sh.o.ricochet!--;
              const n = this.nearestEnemy(sh.spr.x, sh.spr.y, 300, e);
              if (n) {
                const a = Math.atan2(n.y - sh.spr.y, n.x - sh.spr.x);
                sh.vx = Math.cos(a) * sh.o.speed;
                sh.vy = Math.sin(a) * sh.o.speed;
                break;
              }
            }
            if ((sh.o.pierce ?? 0) > 0) {
              sh.o.pierce!--;
              continue;
            }
            this.killShot(sh);
            break;
          }
        }
      } else if (!this.busy) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, sh.spr.x, sh.spr.y) < 12) {
          const p = this.player;
          if (p.invulnerable(now)) {
            if (now < p.iframesUntil) p.perfectDodge();
            continue;
          }
          this.damagePlayer(sh.o.damage, { x: sh.spr.x, y: sh.spr.y });
          sh.o.onHit?.(sh.spr.x, sh.spr.y);
          this.killShot(sh);
        }
      }
    }
    // pickups
    for (const pk of [...this.pickups]) {
      const d = Phaser.Math.Distance.Between(pk.spr.x, pk.spr.y, this.player.x, this.player.y);
      if (pk.kind !== "quest" && d < 90) {
        const a = Math.atan2(this.player.y - pk.spr.y, this.player.x - pk.spr.x);
        pk.spr.x += Math.cos(a) * dt * 0.4;
        pk.spr.y += Math.sin(a) * dt * 0.4;
      }
      if (d < 22) {
        this.collect(pk);
      }
    }
    // wave progression
    if (this.waveActive && this.pendingSpawns === 0 && this.enemies.every((e) => e.dead) && !this.busy) {
      this.waveActive = false;
      this.time.delayedCall(600, () => this.nextWave());
    }
    if (!this.waveActive && !this.room.boss && !this.roomCleared && this.waves.length && this.waveIdx >= this.waves.length && this.enemies.every((e) => e.dead)) {
      this.onRoomCleared();
    }
    // interactables
    let best: Interactable | null = null;
    let bd = 1e9;
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const d = Phaser.Math.Distance.Between(it.x, it.y, this.player.x, this.player.y);
      if (d < it.r && d < bd) {
        bd = d;
        best = it;
      }
    }
    if (best && !this.busy) {
      this.prompt.setText(`E: ${best.label}`).setPosition(this.player.x, this.player.y - 48).setVisible(true);
      if (this.controls.interact()) {
        this.prompt.setVisible(false);
        best.use();
      }
    } else {
      this.prompt.setVisible(false);
      this.controls.interact();
    }
    // exit
    if (this.exitOpen() && !this.busy && Phaser.Geom.Rectangle.Contains(this.doorZone, this.player.x, this.player.y - 10)) {
      this.goNextRoom();
    }
  }

  private collect(pk: Pickup) {
    const s = G.s;
    // a little pop where it was: coins jingle out, everything else sparkles
    if (pk.kind === "coin") vfx(this, "vfx_coins", pk.spr.x, pk.spr.y, { scale: 0.45, depth: 960 });
    else if (pk.kind !== "heal" && pk.kind !== "quest") vfx(this, "vfx_sparks", pk.spr.x, pk.spr.y, { scale: 0.5, depth: 960, tint: pk.kind === "krezz" ? 0xc084fc : pk.kind === "ammo" ? 0x67e8f9 : 0xfde047 });
    pk.spr.destroy();
    this.pickups = this.pickups.filter((x) => x !== pk);
    switch (pk.kind) {
      case "coin":
        s.coins += pk.value;
        bump(s, "coins_earned", pk.value);
        synth.play("coin");
        break;
      case "krezz":
        s.krezz = Math.min(100 + (s.upgrades.krezz ?? 0) * 20, s.krezz + pk.value);
        synth.play("pickup");
        break;
      case "heal":
        vfx(this, "vfx_heal", this.player.x, this.player.y + 20, { scale: 0.9, depth: this.player.spr.depth + 1 });
        s.hp = Math.min(maxHp(s), s.hp + pk.value);
        this.floatText(this.player.x, this.player.y - 30, `+${pk.value}`, "#ffb6c1", 13);
        synth.play("gulp");
        break;
      case "crobley":
        s.hp = Math.min(maxHp(s), s.hp + 15);
        s.krezz = Math.min(100 + (s.upgrades.krezz ?? 0) * 20, s.krezz + 20);
        this.floatText(this.player.x, this.player.y - 30, "nibbled a crobley", "#e0a35a", 13);
        synth.play("pickup");
        break;
      case "bongo":
        s.bongos += 1;
        this.floatText(this.player.x, this.player.y - 30, "+1 FIZZY BONGO", "#e0a35a", 13);
        synth.play("bongo");
        vfx(this, "vfx_heal", this.player.x, this.player.y + 20, { scale: 0.8, depth: this.player.spr.depth + 1, tint: 0xfde68a });
        break;
      case "ammo": {
        const a = giveAmmo(s, pk.value);
        if (a) this.floatText(this.player.x, this.player.y - 30, `+${a.amount} ${a.gun.name.toUpperCase()} AMMO`, "#67e8f9", 13);
        else this.floatText(this.player.x, this.player.y - 30, "AMMO FULL", "#67e8f9", 12);
        synth.play("pickup");
        break;
      }
      case "quest":
        pk.onCollect?.();
        break;
      default:
        break;
    }
  }
}
