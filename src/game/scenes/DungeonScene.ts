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
import { synth } from "../audio/Synth";
import { runDialogue } from "./DialogueScene";
import { BOSS_TEXT } from "../../content/bosses";
import { enemyDamageMult, enemyHpMult, maxHp, bump, maxBottles } from "../systems/stats";
import { activeMods } from "../../data/historicalRevisions";
import { addBanRisk, BAN_RULES, type BanRule, coolBanRisk } from "../systems/ban";
import { pickupsInDungeon, collectPickup } from "../systems/quests";
import { switchTo } from "../Flow";
import { CHEESE_ACCUSATIONS, CHEESE_WITNESSES, DOMESTICS, MORK_ROUNDS } from "../../content/polsonEden";
import { say, dir } from "../../content/dsl";
import { FONT } from "../ui/theme";
import { CHARACTERS } from "../../data/characters";
import { evalCond } from "../systems/conditions";

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
  kind: "coin" | "krezz" | "heal" | "crobley" | "quest" | "bottle" | "bongo";
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

  constructor() {
    super("Dungeon");
  }

  init(data: { dungeon: string; room?: number; bossHpPct?: number }) {
    this.sc = this;
    this.dungeon = DUNGEONS[data.dungeon] ?? DUNGEONS.wildern;
    this.roomIdx = data.room ?? 0;
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
  }

  now() {
    return this.time.now;
  }

  create() {
    const s = G.s;
    s.phase = "dungeon";
    const r = this.room;
    this.telegraphMult = s.player === "KREZWONK" ? 1.4 : 1;
    this.cameras.main.fadeIn(300);
    this.physics.world.setBounds(24, 24, r.w - 48, r.h - 48);
    this.bounds.setTo(24, 24, r.w - 48, r.h - 48);
    this.buildRoom();
    this.controls = new Controls(this);
    this.player = new Player(this, r.w / 2, r.h - 90);
    this.player.wonk = activeMods(s).wonkStart;
    this.enemyGroup = this.physics.add.group();
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.physics.add.collider(this.player.spr, this.obstacles);
    this.physics.add.collider(this.enemyGroup, this.obstacles);
    this.cameras.main.setBounds(0, 0, r.w, r.h);
    this.cameras.main.startFollow(this.player.spr, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(80, 60);
    this.prompt = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#000000cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(900).setVisible(false);

    if (!this.scene.isActive("UI")) this.scene.launch("UI", { mode: "dungeon" });
    else this.scene.get("UI").events.emit("mode", "dungeon");
    G.emit("room", { name: `${this.dungeon.name} · ${r.name}`, idx: this.roomIdx, total: this.dungeon.rooms.length });
    G.emit("boss", null);
    synth.music(r.boss ? (r.boss === "drongus" ? "final" : "boss") : this.dungeon.music);

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

  private buildRoom() {
    const r = this.room;
    const themeTile = `tile_${r.theme}`;
    this.add.tileSprite(0, 0, r.w, r.h, themeTile).setOrigin(0).setDepth(0);
    const wallCol = { school: 0x6b5b4b, mansion: 0x3b2a1a, network: 0x0b1530, industrial: 0x1f2937, temple: 0x4a3a2a, prison: 0x111827, wiki: 0xa2a9b1 }[r.theme];
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(wallCol, 1);
    g.fillRect(0, 0, r.w, 24);
    g.fillRect(0, r.h - 24, r.w, 24);
    g.fillRect(0, 0, 24, r.h);
    g.fillRect(r.w - 24, 0, 24, r.h);
    g.lineStyle(2, 0x000000, 0.4);
    g.strokeRect(24, 24, r.w - 48, r.h - 48);
    this.obstacles = this.physics.add.staticGroup();
    this.decorate(r);
    // door
    this.door = this.add.image(r.w / 2, 14, "p_door_locked").setScale(2).setDepth(2);
    this.doorZone = new Phaser.Geom.Rectangle(r.w / 2 - 40, 0, 80, 46);
    this.add.text(r.w / 2, 40, r.boss ? "" : "EXIT", { fontFamily: FONT, fontSize: "10px", color: "#ffffff" }).setOrigin(0.5).setDepth(2);
    // room title
    const t = this.add.text(r.w / 2, r.h / 2 - 60, r.name.toUpperCase(), { fontFamily: FONT, fontSize: "28px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setDepth(950).setShadow(3, 3, "#000", 0);
    this.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 700, onComplete: () => t.destroy() });
    // props
    for (const p of r.props ?? []) if (evalCond(p.cond, G.s)) this.addProp(p);
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
    const n = r.boss ? 0 : 3;
    for (let i = 0; i < n; i++) {
      const x = rnd.between(140, r.w - 140);
      const y = rnd.between(160, r.h - 200);
      if (Math.abs(x - r.w / 2) < 120) continue;
      const pillar = this.add.rectangle(x, y, 40, 40, r.theme === "wiki" ? 0xc8ccd1 : 0x000000, r.theme === "wiki" ? 1 : 0.35).setDepth(3).setStrokeStyle(2, 0x000000, 0.4);
      this.obstacles.add(pillar);
      if (r.theme === "wiki") this.add.text(x, y, "[edit]", { fontFamily: FONT, fontSize: "9px", color: "#3366cc" }).setOrigin(0.5).setDepth(4);
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
    const y = r.h * p.y;
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
    if (r.rule) this.setRule(BAN_RULES.find((b) => b.id === r.rule) ?? null, false);
    if (this.roomIdx === 0) G.drongus("enter_dungeon");
    this.busy = false;
    if (r.boss) {
      await this.startBoss();
      return;
    }
    if (this.waves.length) this.time.delayedCall(500, () => this.nextWave());
    else {
      this.roomCleared = true;
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
        const x = Phaser.Math.Between(this.bounds.left + 60, this.bounds.right - 60);
        const y = Phaser.Math.Between(this.bounds.top + 60, this.bounds.centerY + 40);
        this.spawnPortal(x, y, () => this.spawnEnemy(type, x, y));
      }
    }
  }

  private spawnPortal(x: number, y: number, then: () => void) {
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
    synth.play("ding");
    for (let i = 0; i < 6; i++) this.dropPickup(this.player.x + (Math.random() - 0.5) * 140, this.player.y - 40 + (Math.random() - 0.5) * 80, "coin", 3);
    coolBanRisk(G.s, 15);
    this.checkExit();
  }

  private checkExit() {
    const r = this.room;
    if (!this.roomCleared) return;
    if (r.exitFlag && !G.s.flags[r.exitFlag]) {
      this.toast("EXIT LOCKED", r.event === "cheesegate" ? "Solve Cheesegate first." : r.event === "mork" ? "Interpret the Mork Voice first." : r.event === "valves" ? "Open all three valves." : "Restore the Reaction Network first.");
      return;
    }
    if (r.boss) return;
    this.door.setTexture("p_door");
    this.toast("ROOM CLEAR", "The exit is open (top of the room).");
  }

  private exitOpen() {
    return this.door.texture.key === "p_door";
  }

  private goNextRoom() {
    if (this.busy) return;
    this.busy = true;
    synth.play("door");
    G.save();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.transitioning = true;
      this.scene.restart({ dungeon: this.dungeon.id, room: this.roomIdx + 1 });
    });
  }

  private cleanup() {
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

  // ------------------------------------------------------------------ bosses

  private async startBoss() {
    const r = this.room;
    const txt = BOSS_TEXT[r.boss!];
    this.busy = true;
    const b = createBoss(r.boss!, this, r.w / 2, r.h / 2 - 100);
    const pct = (this as any)._bossHpPct;
    if (typeof pct === "number" && pct > 0 && pct < 1) b.hp = Math.max(1, Math.round(b.maxHp * pct));
    this.boss = b;
    this.enemies.push(b);
    this.enemyGroup.add(b);
    b.setAlpha(0);
    this.tweens.add({ targets: b, alpha: 1, duration: 800 });
    synth.play("roar");
    if (!(typeof pct === "number")) await this.talk(txt.intro);
    this.busy = false;
    b.started = true;
    b.nextPattern = this.now() + 1200;
  }

  private async onBossDefeated(b: Boss) {
    this.busy = true;
    const s = G.s;
    G.emit("boss", null);
    synth.play("boom");
    this.shake(800, 0.03);
    for (const e of [...this.enemies]) if (e !== b && !e.dead) this.damageEnemy(e, 99999, { noWonk: true, label: "" });
    for (const sh of [...this.shots]) this.killShot(sh);
    this.rule = null;
    G.emit("rule", null);
    if (b.bossId === "drongus") {
      s.flags.ch6_clear = true;
      G.save();
      this.time.delayedCall(1200, () => {
        this.transitioning = true;
        switchTo(this, "Ending", {});
      });
      return;
    }
    const txt = BOSS_TEXT[b.bossId];
    await this.talk(txt.outro);
    const reward = Math.round(200 * activeMods(s).questRewardMult * (1 + (s.chapter - 1) * 0.25));
    s.coins += reward;
    s.flags[`ch${this.dungeon.chapter}_clear`] = true;
    s.phase = "hub";
    s.hp = maxHp(s);
    s.bottles = maxBottles(s);
    if (b.bossId === "salmon") G.unlockArchive("arch_squeeze");
    if (b.bossId === "feedback") {
      G.unlockArchive("arch_cheesegate");
      G.unlockArchive("arch_mork_voice");
    }
    if (b.bossId === "machine") G.unlockArchive("arch_purple");
    if (b.bossId === "banhammer") G.unlockArchive("arch_kreltower");
    if (b.bossId === "spectre") {
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
      say("POLSON", "(reply, instantly) oh mate no worries!! she'll accept it now. how are you anyway"),
      say("MIKEY", "He replied immediately. Because I was nice to him. That was always the trick."),
      { s: "NARRATOR", t: "", react: { message: "EDEN accepted your friend request.", context: "fragmar_prime", from: "EDEN", outcomes: { LIKE: [say("EDEN", "...👍 back. Weird.")], LAUGH: [say("EDEN", "Why is that funny? Mikey. MIKEY.")], SEEN: [say("EDEN", "Seen. Classic Mikey.")] } } },
      dir("FRAGMAR PRIME COMPLETE. +150 Krezzcoin. Classification: still extremely petty."),
    ]);
  }

  // ------------------------------------------------------------------ events: misc

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

  spawnEnemy(type: string, x: number, y: number, opts: { noDrops?: boolean; minion?: boolean } = {}): Enemy | null {
    if (!ENEMIES[type]) return null;
    if (this.enemies.filter((e) => !e.dead).length > 40) return null;
    const s = G.s;
    const e = new Enemy(this, type, Phaser.Math.Clamp(x, this.bounds.left + 20, this.bounds.right - 20), Phaser.Math.Clamp(y, this.bounds.top + 20, this.bounds.bottom - 20), enemyHpMult(s));
    e.noDrops = !!opts.noDrops;
    e.minion = !!opts.minion;
    e.dmgMult = enemyDamageMult(s);
    e.speedMult = activeMods(s).enemySpeedMult * (s.ngPlus ? 1.1 : 1);
    e.hpBar = this.add.graphics().setDepth(800);
    e.setDepth(y);
    this.enemies.push(e);
    this.enemyGroup.add(e);
    return e;
  }

  damageEnemy(e: Enemy, amount: number, opts: HitOpts = {}) {
    if (e.dead) return;
    const now = this.now();
    let a = amount;
    if (now < e.markedUntil) a *= 1.35;
    if (e instanceof Boss) a = e.incoming(a);
    if (opts.fixed) a = amount;
    if (e instanceof Boss && e.shielded) {
      if (opts.label !== "" && Math.random() < 0.3) this.floatText(e.x, e.y - 40, "SHIELDED", "#88aaff", 12);
      return;
    }
    e.hp -= a;
    e.flashUntil = now + 70;
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
    }
    if (!opts.noWonk) this.addWonk(Math.min(6, a * 0.18));
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    if (e.dead) return;
    const s = G.s;
    e.kill();
    this.enemies = this.enemies.filter((x) => x !== e);
    bump(s, "kills_total");
    if (e.def.counter) bump(s, e.def.counter);
    if (!e.isBoss) this.addWonk(3);
    this.burst(e.x, e.y, e.def.color, e.isBoss ? 30 : 8);
    if (e instanceof Boss) {
      this.boss = null;
      this.onBossDefeated(e);
      return;
    }
    if (!e.noDrops) {
      const mods = activeMods(s);
      let coins = Math.round(e.def.coins * mods.coinMult * (s.player === "KREZMAR" ? 1.35 : 1));
      while (coins > 0) {
        const v = Math.min(coins, 3);
        this.dropPickup(e.x + (Math.random() - 0.5) * 20, e.y + (Math.random() - 0.5) * 20, "coin", v);
        coins -= v;
      }
      if (Math.random() < 0.6) this.dropPickup(e.x, e.y, "krezz", e.def.krezz);
      if (Math.random() < 0.06) this.dropPickup(e.x, e.y, "heal", 12);
      if (mods.crobleys && Math.random() < 0.12) this.dropPickup(e.x, e.y, "crobley", 1);
      if (Math.random() < 0.02) this.dropPickup(e.x, e.y, "bongo", 1);
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
    if (opts.color !== undefined) {
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
      const fx = this.add.image(x, y, "fx_circle").setTint(color).setAlpha(0.6).setDepth(5).setScale((r * 2) / 64);
      this.tweens.add({ targets: fx, alpha: 0, duration: 250, onComplete: () => fx.destroy() });
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

  addWonk(n: number) {
    if (!this.player) return;
    const mult = this.boss instanceof DrongusBoss && this.boss.phase === 2 ? 1.6 : 1;
    const before = this.player.wonk;
    this.player.wonk = Math.min(100, this.player.wonk + n * mult);
    if (before < 100 && this.player.wonk >= 100) {
      synth.play("wonk");
      this.floatText(this.player.x, this.player.y - 50, "WONK FULL — PRESS R", "#ff8c00", 15);
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
    for (let i = 0; i < n; i++) {
      const d = this.add.image(x, y, "fx_dot").setTint(color).setDepth(700).setScale(1 + Math.random());
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 60;
      this.tweens.add({ targets: d, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 400 + Math.random() * 300, onComplete: () => d.destroy() });
    }
  }

  dropPickup(x: number, y: number, kind: Pickup["kind"], value: number) {
    const tex = { coin: "p_coin", krezz: "p_krezz", heal: "p_bottle", crobley: "p_crobley", quest: "p_scroll", bottle: "p_bottle", bongo: "p_bongo" }[kind];
    const spr = this.add.image(x, y, tex).setScale(2).setDepth(15);
    this.tweens.add({ targets: spr, y: y - 8, yoyo: true, duration: 220 });
    this.pickups.push({ spr, kind, value });
  }

  // ------------------------------------------------------------------ helpers

  private talk(lines: Line[]): Promise<void> {
    this.paused = true;
    return runDialogue(this, lines).then(() => {
      this.controls?.swallow();
      this.paused = false;
    });
  }

  private die() {
    if (this.dying) return;
    this.dying = true;
    this.player.dead = true;
    synth.play("death");
    (this.player.spr.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.player.spr.setAngle(90).setTint(0x888888);
    this.scene.launch("Menu", { mode: "death", caller: "Dungeon", dungeon: this.dungeon.id, room: this.roomIdx, bossHpPct: undefined });
    this.scene.pause();
  }

  // ------------------------------------------------------------------ update

  update(time: number, delta: number) {
    if (!this.player || this.transitioning || !this.player.spr.body) return;
    if (this.controls.pause() && !this.busy && !this.dying) {
      this.scene.launch("Menu", { mode: "pause", caller: "Dungeon" });
      this.scene.pause();
      return;
    }
    if (this.paused || this.dying) return;
    const now = this.now();
    if (now < this.hitStopUntil) {
      this.physics.world.isPaused || this.physics.world.pause();
      return;
    }
    if (this.physics.world.isPaused) this.physics.world.resume();
    const dt = Math.min(delta, 50);
    const s = G.s;
    // timescale (Terrible Prophecy)
    this.enemyTimeScale = now < this.prophecyUntil ? 0.25 : 1;
    const ne = this.nearestEnemy(this.player.x, this.player.y, 520);
    this.controls.autoAim = ne ? Math.atan2(ne.y - this.player.y, ne.x - this.player.x) : null;
    this.controls.autoAimPoint = ne ? { x: ne.x, y: ne.y } : { x: this.player.x + Math.cos(this.player.aim) * 180, y: this.player.y + Math.sin(this.player.aim) * 180 };
    if (!this.busy) this.player.update(dt, now, this.controls);
    else (this.player.spr.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
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
      else (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      if (this.enemyTimeScale < 1) {
        const b = e.body as Phaser.Physics.Arcade.Body;
        if (b.velocity.length() > e.def.speed * 0.4) b.velocity.scale(0.5);
      }
      e.setDepth(e.y);
      // contact damage
      if (!this.busy && now > e.contactCd && !this.player.isHidden() && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < e.radius + 10) {
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
      sh.life -= dt * k;
      if (sh.life <= 0 || !Phaser.Geom.Rectangle.Contains(this.bounds, sh.spr.x, sh.spr.y)) {
        this.killShot(sh);
        continue;
      }
      if (sh.o.owner === "player") {
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
            this.damageEnemy(e, sh.o.damage, { crit: sh.o.crit, knock: 60, angle: Math.atan2(sh.vy, sh.vx), slow: sh.o.slow });
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
        break;
      case "quest":
        pk.onCollect?.();
        break;
      default:
        break;
    }
  }
}
