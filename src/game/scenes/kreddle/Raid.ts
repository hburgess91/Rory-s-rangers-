import Phaser from "phaser";
import { G } from "../../G";
import { Controls } from "../../combat/Controls";
import { DialogueBox } from "../../ui/DialogueBox";
import { switchTo } from "../../Flow";
import { synth } from "../../audio/Synth";
import { FONT } from "../../ui/theme";
import { hasVfx, vfx, type VfxOpts } from "../../gfx/Vfx";
import { animateWalker, playPerf } from "../../gfx/HD";
import { PLAYABLE_IDS, type Line } from "../../../data/types";
import { KRUNCHERS } from "../../../content/kreddle";
import {
  ESCAPE_SHOUTS,
  KRUNCHER_DEATHS,
  KRUNCHER_STANDOFF,
  KRUNCHERS_DONE,
  NUKE_PLANT,
  KREBLIS_GLOAT,
  RAID_ARRIVE,
  RAID_GATES_LOCKED,
  RAID_NO_RETREAT,
  RAID_BANNERS,
  RAID_BARRICADES,
  RAID_DISTRICTS,
  RAID_KLERBLE_BROADCAST,
  RAID_ROCKET_SHOUTS,
  RAID_SCREAMS,
  RAID_SHOUTS,
  RAID_SIGNS,
  RAID_TANNOY,
  RAID_THROW_SHOUTS,
} from "../../../content/raid";

/**
 * THE KREDDLE RAID (Chapter 6): KreddleScene's raid mode. Night, rain, sirens. A long neon Strip, walked east with a
 * chemical flamethrower while the lads follow, shouting, firing rockets at the sky and lobbing chemical weapons.
 * Burn the barricades, torch the Krunchers, plant the nuke at the Palace, then run back over the bridge.
 *
 * Phone budget: flame puffs come from a fixed pool; fires, ash and bubbles are capped and recycled; anything far from
 * the camera is hidden and not updated.
 */

const RW = 10400;
const H = 700;
const TOP = 432;
const BOTTOM = 680;
const GROUND = 404;
/** District boundaries (barricades), west to east. The last one is the Palace gates. */
const BARS = [1900, 3800, 5700, 7600, 9000];
const PALACE_X = 9820;
const KRUNCH_X = 8000;
const GREEN = 0x7cff3a;
const GREEN2 = 0xb6ff5a;
const NEON = [0xff4fd8, 0x22d3ee, 0xfacc15, 0xa855f7, 0x4ade80];
/** Depth bands: the night overlay sits at D_NIGHT; light (fire, neon, explosions) draws above it. */
const D_NIGHT = 4800;
const D_LIGHT = 4820;
const D_RAIN = 4950;
const D_BUBBLE = 4970;
const D_HUD = 5100;

const MAX_FIRES = 90;
const MAX_ASH = 140;
const MAX_BUBBLES = 6;
const MAX_BURNING = 22;
const MAX_AIR = 4;

type NState = "idle" | "flee" | "burn" | "choke" | "dead";
interface RNpc {
  spr: Phaser.GameObjects.Sprite;
  kind: "citizen" | "guard" | "kruncher";
  state: NState;
  t: number;
  dir: { x: number; y: number };
  nextTurn: number;
  fire: Phaser.GameObjects.Sprite | null;
  name?: string;
  speed: number;
  baseTint?: number;
}
interface Bld {
  img: Phaser.GameObjects.Image;
  x: number;
  w: number;
  top: number;
  heat: number;
  burning: boolean;
  burnT: number;
  sign: Phaser.GameObjects.Text | null;
  nextBoom: number;
}
interface Barricade {
  x: number;
  name: string;
  heat: number;
  need: number;
  down: boolean;
  locked: boolean;
  parts: Phaser.GameObjects.Image[];
  deco: Phaser.GameObjects.GameObject[];
  line: Line;
  warned: boolean;
  meter?: Phaser.GameObjects.Rectangle;
}
interface Prop {
  img: Phaser.GameObjects.Image;
  burnt: boolean;
  heat: number;
}
interface Fire {
  spr: Phaser.GameObjects.Sprite;
  until: number;
  ground: boolean;
}
interface Puff {
  spr: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  age: number;
  life: number;
  live: boolean;
}
interface Air {
  spr: Phaser.GameObjects.Image;
  kind: "jet" | "heli" | "blimp" | "bomber";
  vx: number;
  hit: boolean;
  falling: boolean;
  vy: number;
  spin: number;
  groundY: number;
  nextSmoke: number;
  targeted: boolean;
  nextBomb: number;
  light?: Phaser.GameObjects.Triangle;
}
interface Lad {
  id: string;
  spr: Phaser.GameObjects.Sprite;
  off: { x: number; y: number };
}
interface Bubble {
  t: Phaser.GameObjects.Text;
  follow: Phaser.GameObjects.Sprite | null;
  until: number;
}
interface Hazard {
  x: number;
  y: number;
  r: number;
  until: number;
  kind: "fire" | "gas";
  next: number;
}

/** The raid's own art (public/art/props). Normally in the art manifest; loaded here if a build doesn't have it yet. */
export const RAID_ART = ["kd_palace", "kd_jet", "kd_heli", "kd_blimp", "kd_bomber", "kd_nuke", "kd_napalm", "kd_gascan", "kd_nailbomb", "kd_ash", "kd_rubble", "kd_evac", "kd_wreck", "kd_bazooka", "kd_charred", "kd_siren", "kd_slots_burnt"];

type Phase = "intro" | "march" | "cutscene" | "krunchers" | "palace" | "escape" | "leaving";

export class KreddleRaid {
  private sc: Phaser.Scene;
  private controls!: Controls;
  private box!: DialogueBox;
  private me!: Phaser.GameObjects.Sprite;
  private phase: Phase = "intro";
  private busy = true;
  private npcs: RNpc[] = [];
  private blds: Bld[] = [];
  private bars: Barricade[] = [];
  private props: Prop[] = [];
  private fires: Fire[] = [];
  private ash: Phaser.GameObjects.Image[] = [];
  private puffs: Puff[] = [];
  private air: Air[] = [];
  private lads: Lad[] = [];
  private bubbles: Bubble[] = [];
  private hazards: Hazard[] = [];
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private aimDeg = 0;
  private nextPuff = 0;
  private nextFlameSfx = 0;
  private nextShout = 0;
  private nextAir = 0;
  private nextRocket = 0;
  private nextThrow = 0;
  private nextSiren = 0;
  private nextTannoy = 0;
  private nextLightning = 0;
  private nextCull = 0;
  private nextScreamSfx = 0;
  private nextBoomSfx = 0;
  private nextAmbientBoom = 0;
  private district = -1;
  private torched = 0;
  private burntBlds = 0;
  private broadcastDone = false;
  private standoffDone = false;
  private krunchersDone = false;
  private palaceDone = false;
  private hud!: Phaser.GameObjects.Text;
  private objective!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private bannerBg!: Phaser.GameObjects.Rectangle;
  private bannerIdx = 0;
  private countdown!: Phaser.GameObjects.Text;
  private screen: { frame: Phaser.GameObjects.Rectangle; face: Phaser.GameObjects.Sprite | null; text: Phaser.GameObjects.Text } | null = null;
  private nuke: Phaser.GameObjects.Image | null = null;
  private pausedAt = 0;
  private flameAt = 0;

  constructor(scene: Phaser.Scene) {
    this.sc = scene;
  }

  // ------------------------------------------------------------------ setup

  create() {
    const sc = this.sc;
    const s = G.s;
    const planted = !!s.flags.nuke_planted;
    synth.ambience(null);
    synth.weatherSound("storm");
    synth.music(planted ? "boss_krozno" : "final", true);
    sc.cameras.main.fadeIn(600);
    sc.cameras.main.setBounds(0, 0, RW, H);
    sc.cameras.main.setBackgroundColor(0x05030c);
    this.makeTextures();
    this.drawWorld();
    this.drawStrip();
    this.spawnPeople(planted);
    this.spawnLads();
    const startX = planted ? 9300 : 130;
    this.me = sc.add.sprite(startX, 560, `spr_${s.player}`, 0).setScale(2).setDepth(560);
    this.me.setData("facing", planted ? "west" : "east");
    sc.cameras.main.startFollow(this.me, true, 0.1, 0.1);
    for (const l of this.lads) l.spr.setPosition(this.me.x + l.off.x * (planted ? -1 : 1), this.me.y + l.off.y);
    this.drawWeather();
    this.drawHud();
    this.controls = new Controls(sc);
    this.box = new DialogueBox(sc, 6000, 0.2);
    if (!sc.scene.isActive("UI")) sc.scene.launch("UI", { mode: "hub" });
    else sc.scene.get("UI").events.emit("mode", "hub");
    sc.events.off("ui-resume");
    sc.events.on("ui-resume", () => {
      this.busy = this.phase === "intro" || this.phase === "cutscene" || this.phase === "palace" || this.phase === "leaving";
      if (this.pausedAt && G.rt.timerEnd) G.rt.timerEnd += Date.now() - this.pausedAt;
      this.pausedAt = 0;
      this.controls.swallow();
    });
    if (s.gun !== "chem_flamer" && s.guns?.chem_flamer !== undefined) s.gun = "chem_flamer";
    const now = sc.time.now;
    this.nextAir = now + 3000;
    this.nextRocket = now + 6000;
    this.nextThrow = now + 9000;
    this.nextSiren = now + 500;
    this.nextTannoy = now + 7000;
    this.nextLightning = now + 6000;
    this.nextShout = now + 4000;
    if (planted) {
      this.preburn();
      this.startEscape(false);
    } else {
      this.phase = "intro";
      this.busy = true;
      sc.time.delayedCall(700, () => void this.intro());
    }
  }

  /** Tiny generated textures: a soft dot for sparks, a fallback flame blob. */
  private makeTextures() {
    const sc = this.sc;
    if (!sc.textures.exists("raid_dot")) {
      const g = sc.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 0.5).fillCircle(6, 6, 6);
      g.fillStyle(0xffffff, 1).fillCircle(6, 6, 3);
      g.generateTexture("raid_dot", 12, 12);
      g.destroy();
    }
  }

  private drawWorld() {
    const sc = this.sc;
    if (sc.textures.exists("bg_kreddle_sky")) {
      const sky = sc.add.image(480, 0, "bg_kreddle_sky").setOrigin(0.5, 0).setScrollFactor(0, 0).setDepth(-30).setTint(0x8a6a8a);
      sky.setScale(Math.max(1300 / sky.width, 420 / sky.height));
    } else sc.add.rectangle(480, 200, 1300, 420, 0x1a0b2a).setScrollFactor(0).setDepth(-30);
    // the whole sky glows red from the fires
    const glow = sc.add.rectangle(480, 330, 1400, 200, 0xff3b1f, 0.28).setScrollFactor(0, 1).setDepth(-26).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: glow, alpha: 0.12, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.inOut" });
    // air-raid searchlights
    for (let i = 0; i < 5; i++) {
      const beam = sc.add.triangle(120 + i * 200, 420, 0, 0, -36, -560, 36, -560, i % 2 ? 0xffffff : 0xff4040, 0.1).setOrigin(0, 0).setScrollFactor(0.2, 1).setDepth(-25).setBlendMode(Phaser.BlendModes.ADD);
      sc.tweens.add({ targets: beam, angle: { from: -30, to: 30 }, yoyo: true, repeat: -1, duration: 1800 + i * 500, ease: "Sine.inOut" });
    }
    // the street: wet tarmac, the pavement, puddles reflecting fire
    const g = sc.add.graphics().setDepth(1);
    g.fillStyle(0x100818, 1).fillRect(0, 400, RW, H - 400);
    g.fillStyle(0x1d1030, 1).fillRect(0, 400, RW, 46);
    for (let x = 0; x < RW; x += 46) g.lineStyle(1, 0x2f1850, 1).strokeRect(x, 400, 46, 46);
    g.lineStyle(3, 0xff4fd8, 0.4).lineBetween(0, 446, RW, 446);
    for (let x = 40; x < RW; x += 160) g.fillStyle(0xfacc15, 0.4).fillRect(x, 590, 70, 6);
    for (let i = 0; i < 60; i++) {
      const p = sc.add.ellipse(80 + Math.random() * (RW - 160), 470 + Math.random() * 200, 50 + Math.random() * 80, 8 + Math.random() * 8, i % 3 ? 0xff6a2a : GREEN, 0.14).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
      sc.tweens.add({ targets: p, alpha: 0.04, yoyo: true, repeat: -1, duration: 500 + Math.random() * 900 });
    }
    // the bridge home, at the west end
    const b = sc.add.graphics().setDepth(3);
    b.fillStyle(0x3f3f46, 1).fillRect(0, 480, 150, 120);
    for (let x = 0; x < 150; x += 18) b.fillStyle(0x52525b, 1).fillRect(x, 480, 14, 120);
    b.lineStyle(4, 0x22d3ee, 0.9).lineBetween(0, 478, 150, 478).lineBetween(0, 602, 150, 602);
    sc.add.text(75, 452, "← KRELWORLD\n(the Town Hall)", { fontFamily: FONT, fontSize: "11px", color: "#22d3ee", align: "center", fontStyle: "bold" }).setOrigin(0.5, 1).setDepth(D_LIGHT);
  }

  private neon(x: number, y: number, text: string, color: string, size = 24, depth = D_LIGHT - 5) {
    const t = this.sc.add.text(x, y, text, { fontFamily: "Impact, sans-serif", fontSize: `${size}px`, color, stroke: "#12001f", strokeThickness: 6, align: "center" }).setOrigin(0.5).setDepth(depth);
    t.setShadow(0, 0, color, 14, true, true);
    return t;
  }

  private drawStrip() {
    const sc = this.sc;
    // buildings along the whole Strip, leaving gaps for the barricades, the Klerble screen and the Palace
    const kinds: [string, number][] = [["kd_bld_arcade", 1.6], ["kd_bld_casino", 1.6], ["kd_bld_hotel", 1.6]];
    const names = ["KRAZY KREDDLE ARCADE", "THE GOLDEN KLAW", "THE KLERBLE GRAND", "LUCKY KROZLEN", "KASH KASTLE", "THE JACKPOT HOTEL", "KREDDLE KENO", "SLOTZ R US", "THE HIGH ROLLER", "KRUMPETS BINGO", "THE PIT", "LADY LUCK LOUNGE", "KROZLEN TEMPLE OF CHANCE", "KLERBLE TOWERS", "THE ALL-NIGHTER", "BIG WHEEL BAR", "THE KRUPIER", "KREDDLE KASINO ROYALE", "THE LOSERS' LOUNGE", "MEGA MILLIONS", "KREDDLER PRIDE"];
    let i = 0;
    for (let x = 420; x < BARS[4] - 150; x += 360 + Math.random() * 90) {
      if (BARS.some((b) => Math.abs(b - x) < 210)) continue;
      if (Math.abs(x - 4700) < 230) continue; // Klerble Square
      if (x > BARS[3] && x < BARS[3] + 400) continue;
      const [key, sc0] = kinds[i % kinds.length];
      const tint = i % 4 === 3 ? NEON[i % NEON.length] | 0x606060 : undefined;
      const sign = x > 8300 && x < 8800 ? "KREDDLE KRUNCHERS HQ" : names[i % names.length];
      this.addBuilding(x > 8300 && x < 8800 ? "kd_bld_arcade" : key, x, sc0, sign, `#${NEON[(i + 2) % NEON.length].toString(16).padStart(6, "0")}`, x > 8300 && x < 8800 ? 0x9be7ff : tint);
      i++;
    }
    // the Klerble screen over Klerble Square
    const frame = sc.add.rectangle(4700, 285, 250, 150, 0x0a0a14).setStrokeStyle(6, 0xfacc15).setDepth(402);
    sc.add.rectangle(4700, 385, 14, 60, 0x3f3f46).setDepth(401);
    const face = sc.textures.exists("spr_TV_PRESIDENT_KLERBLE") ? sc.add.sprite(4700, 300, "spr_TV_PRESIDENT_KLERBLE", 0).setScale(2.6).setDepth(403).setVisible(false) : null;
    const text = sc.add.text(4700, 285, "KLERBLE TV\n— NO SIGNAL —", { fontFamily: FONT, fontSize: "14px", color: "#facc15", align: "center", fontStyle: "bold" }).setOrigin(0.5).setDepth(D_LIGHT - 4);
    this.screen = { frame, face, text };
    this.neon(4700, 180, "KLERBLE SQUARE", "#facc15", 26);
    // a big gold statue of the President in the square (flammable)
    if (sc.textures.exists("spr_TV_PRESIDENT_KLERBLE")) {
      const st = sc.add.image(4560, 470, "spr_TV_PRESIDENT_KLERBLE", 0).setOrigin(0.5, 1).setScale(4).setTint(0xffd23f).setDepth(470);
      this.props.push({ img: st, burnt: false, heat: 0 });
    }
    // the machines on the pavement (they burn)
    for (let x = 300; x < BARS[4] - 100; x += 230 + Math.random() * 200) {
      if (BARS.some((b) => Math.abs(b - x) < 120)) continue;
      const key = Phaser.Utils.Array.GetRandom(["kd_m_slots", "kd_m_slots", "kd_m_claw", "kd_m_cards"]);
      if (!sc.textures.exists(key)) continue;
      const y = 470 + Math.random() * 30;
      const img = sc.add.image(x, y, key).setOrigin(0.5, 1).setScale(1.05).setDepth(y);
      this.props.push({ img, burnt: false, heat: 0 });
    }
    // evacuation signs and sirens
    for (let x = 650, k = 0; x < BARS[4]; x += 620 + Math.random() * 200, k++) {
      if (BARS.some((b) => Math.abs(b - x) < 100)) continue;
      if (k % 2 === 0 && sc.textures.exists("kd_evac")) sc.add.image(x, 448, "kd_evac").setOrigin(0.5, 1).setScale(1.3).setDepth(448);
      else if (sc.textures.exists("kd_siren")) {
        sc.add.image(x, 448, "kd_siren").setOrigin(0.5, 1).setScale(1.3).setDepth(448);
        const glow = sc.add.ellipse(x, 390, 90, 90, 0xff2020, 0.5).setDepth(D_LIGHT).setBlendMode(Phaser.BlendModes.ADD);
        sc.tweens.add({ targets: glow, alpha: 0.05, scale: 0.6, yoyo: true, repeat: -1, duration: 380 });
      }
      const sign = this.neon(x + 70, 360 - (k % 3) * 40, RAID_SIGNS[k % RAID_SIGNS.length], "#ff3b3b", 18);
      sc.tweens.add({ targets: sign, alpha: 0.2, yoyo: true, repeat: -1, duration: 260, hold: 200 });
    }
    // the barricades
    BARS.forEach((x, k) => this.addBarricade(x, k));
    // THE KLERBLE PALACE
    const pal = sc.textures.exists("kd_palace") ? sc.add.image(PALACE_X, 446, "kd_palace").setOrigin(0.5, 1).setScale(1.55).setDepth(405) : sc.add.image(PALACE_X, 446, "kd_bld_hotel").setOrigin(0.5, 1).setScale(2).setTint(0xffd700).setDepth(405);
    this.blds.push({ img: pal, x: PALACE_X, w: pal.displayWidth, top: 446 - pal.displayHeight, heat: 0, burning: false, burnT: 0, sign: null, nextBoom: 0 });
    this.neon(PALACE_X, 446 - pal.displayHeight - 4, "★ THE KLERBLE PALACE ★", "#facc15", 24).setDepth(D_LIGHT - 4);
    for (let k = 0; k < 2; k++) {
      const beam = sc.add.triangle(PALACE_X + (k ? 160 : -160), 300, 0, 0, -30, -400, 30, -400, 0xffe27a, 0.13).setOrigin(0, 0).setDepth(-20).setBlendMode(Phaser.BlendModes.ADD);
      sc.tweens.add({ targets: beam, angle: { from: -20, to: 20 }, yoyo: true, repeat: -1, duration: 2200 + k * 600 });
    }
    // the end of the Strip
    sc.add.rectangle(RW - 10, 550, 20, 300, 0x000000).setDepth(700);
  }

  private addBuilding(key: string, x: number, scale: number, sign: string, color: string, tint?: number) {
    const sc = this.sc;
    if (!sc.textures.exists(key)) return;
    const img = sc.add.image(x, GROUND, key).setOrigin(0.5, 1).setScale(scale).setDepth(400);
    if (tint) img.setTint(tint);
    const t = this.neon(x, Math.max(178, GROUND - img.displayHeight - 14), sign, color, 20);
    this.blds.push({ img, x, w: img.displayWidth, top: GROUND - img.displayHeight, heat: 0, burning: false, burnT: 0, sign: t, nextBoom: 0 });
  }

  private addBarricade(x: number, k: number) {
    const sc = this.sc;
    const parts: Phaser.GameObjects.Image[] = [];
    const deco: Phaser.GameObjects.GameObject[] = [];
    // a wall of riot barriers and cop cars across the street
    const g = sc.add.graphics().setDepth(430);
    for (let y = 430; y < 690; y += 26) {
      g.fillStyle(y % 52 ? 0xfacc15 : 0x111111, 1).fillRect(x - 10, y, 20, 26);
    }
    g.lineStyle(2, 0x000000, 1).strokeRect(x - 10, 430, 20, 260);
    deco.push(g);
    const carKey = sc.textures.exists("p_copcar") ? "p_copcar" : null;
    for (const y of [490, 580, 670]) {
      if (!carKey) break;
      const c = sc.add.image(x + (y % 20) - 5, y, carKey).setOrigin(0.5, 1).setScale(1.1).setDepth(y);
      if (k === 4) c.setTint(0xffd23f);
      parts.push(c);
    }
    const name = RAID_BARRICADES[k]?.name ?? "BARRICADE";
    const label = sc.add.text(x, 418, `⛔ ${name} ⛔`, { fontFamily: "Impact, sans-serif", fontSize: "16px", color: "#ffffff", backgroundColor: "#7f1d1d", padding: { x: 6, y: 2 } }).setOrigin(0.5, 1).setDepth(D_LIGHT - 3);
    deco.push(label);
    const bl = sc.add.ellipse(x, 430, 60, 30, 0xff0000, 0.6).setDepth(D_LIGHT - 2).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: bl, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });
    deco.push(bl);
    this.bars.push({ x, name, heat: 0, need: k === 4 ? 5 : 6, down: false, locked: k === 4, parts, deco, line: RAID_BARRICADES[k]?.line, warned: false });
  }

  private spawnPeople(planted: boolean) {
    const sc = this.sc;
    const add = (key: string, x: number, y: number, kind: RNpc["kind"], extra: Partial<RNpc> = {}) => {
      const tex = sc.textures.exists(key) ? key : "spr_FOLK1";
      const spr = sc.add.sprite(x, y, tex, 0).setScale(2).setDepth(y);
      const n: RNpc = { spr, kind, state: "idle", t: 0, dir: { x: 0, y: 0 }, nextTurn: 0, fire: null, speed: 120 + Math.random() * 50, ...extra };
      if (n.baseTint) spr.setTint(n.baseTint);
      this.npcs.push(n);
      return n;
    };
    // MANY Kreddlers, all along the Strip, thickest in the middle districts
    const count = planted ? 30 : 120;
    for (let i = 0; i < count; i++) {
      const x = 380 + Math.random() * (BARS[3] - 450);
      const key = ["spr_KD_MAN", "spr_KD_WOMAN"][i % 2];
      add(key, x, TOP + 20 + Math.random() * (BOTTOM - TOP - 30), "citizen", { baseTint: i % 3 === 2 ? NEON[i % NEON.length] | 0x808080 : undefined });
    }
    // pit bosses guarding each barricade
    if (!planted)
      BARS.slice(0, 4).forEach((bx) => {
        for (let j = 0; j < 3; j++) add("spr_KD_PITBOSS", bx - 90 - j * 30, 480 + j * 70, "guard", { speed: 110 });
      });
    // a few more stragglers between Kruncher Row and the Palace
    for (let i = 0; i < (planted ? 0 : 14); i++) add(["spr_KD_MAN", "spr_KD_WOMAN"][i % 2], BARS[3] + 100 + Math.random() * 300, TOP + 20 + Math.random() * 200, "citizen");
    // THE KREDDLE KRUNCHERS, lined up in front of their HQ
    if (!planted)
      KRUNCHERS.forEach((k, i) => {
        if (!sc.textures.exists(`spr_${k.of}`)) return;
        const n = add(`spr_${k.of}`, 8380 + (i % 5) * 85, 480 + Math.floor(i / 5) * 90 + (i % 2) * 18, "kruncher", { name: k.name, baseTint: i % 2 ? 0xff9de6 : 0x9be7ff, speed: 60 });
        n.spr.setData("facing", "west");
      });
  }

  private spawnLads() {
    const sc = this.sc;
    const ids = PLAYABLE_IDS.filter((id) => id !== G.s.player && sc.textures.exists(`spr_${id}`));
    ids.forEach((id, i) => {
      const spr = sc.add.sprite(0, 0, `spr_${id}`, 0).setScale(2).setDepth(500);
      spr.setData("facing", "east");
      // a loose pack behind you
      const row = i % 4;
      const col = Math.floor(i / 4);
      this.lads.push({ id, spr, off: { x: -70 - col * 70 - (row % 2) * 30, y: -75 + row * 50 } });
    });
  }

  private drawWeather() {
    const sc = this.sc;
    // night: a dark blue multiply over the street (fire and neon draw above it)
    sc.add.rectangle(480, 270, 1400, 900, 0x27306e, 1).setScrollFactor(0).setDepth(D_NIGHT).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0.55);
    sc.add.rectangle(480, 270, 1400, 900, 0x0a1030, 0.18).setScrollFactor(0).setDepth(D_NIGHT + 1);
    if (hasVfx(sc, "vfx_rain")) {
      for (let l = 0; l < 2; l++)
        for (let gx = 0; gx < 3; gx++)
          for (let gy = 0; gy < 3; gy++) {
            const sp = vfx(sc, "vfx_rain", 160 + gx * 320 + l * 90, 100 + gy * 200 + l * 60, { fixed: true, scale: 2 + l * 0.4, depth: D_RAIN + l, alpha: 0.7, speed: 1.5, angle: 12 });
            sp?.anims.setProgress(Math.random());
          }
    }
  }

  private drawHud() {
    const sc = this.sc;
    this.bannerBg = sc.add.rectangle(480, 132, 960, 26, 0xb91c1c, 0.85).setScrollFactor(0).setDepth(D_HUD);
    this.banner = sc.add.text(480, 132, RAID_BANNERS[0], { fontFamily: "Impact, sans-serif", fontSize: "18px", color: "#ffffff", stroke: "#3b0000", strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(D_HUD + 1);
    sc.time.addEvent({ delay: 3800, loop: true, callback: () => {
      if (G.s.flags.nuke_planted) return;
      this.bannerIdx = (this.bannerIdx + 1) % RAID_BANNERS.length;
      this.banner.setText(RAID_BANNERS[this.bannerIdx]);
    } });
    sc.time.addEvent({ delay: 420, loop: true, callback: () => {
      const on = this.banner.alpha < 1;
      this.banner.setAlpha(on ? 1 : 0.35);
      this.bannerBg.setFillStyle(on ? 0xb91c1c : 0x450a0a, 0.85);
    } });
    this.hud = sc.add.text(950, 152, "", { fontFamily: FONT, fontSize: "13px", color: "#b6ff5a", fontStyle: "bold", stroke: "#000", strokeThickness: 4, align: "right" }).setOrigin(1, 0).setScrollFactor(0).setDepth(D_HUD);
    this.objective = sc.add.text(10, 152, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 4, wordWrap: { width: 520 } }).setScrollFactor(0).setDepth(D_HUD);
    this.countdown = sc.add.text(480, 170, "", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#ff3b3b", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D_HUD).setVisible(false);
  }

  // ------------------------------------------------------------------ the story beats

  private async talk(lines: Line[]) {
    const prev = this.phase;
    this.busy = true;
    await this.box.play(lines);
    this.controls.swallow();
    this.busy = prev === "leaving";
  }

  private wait(ms: number) {
    return new Promise<void>((r) => this.sc.time.delayedCall(ms, () => r()));
  }

  private bigTitle(text: string, color = "#ff3b3b", size = 54) {
    const t = this.sc.add.text(480, 250, text, { fontFamily: "Impact, sans-serif", fontSize: `${size}px`, color, align: "center", stroke: "#12001f", strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(D_HUD + 10).setScale(0.3);
    t.setShadow(0, 0, color, 20, true, true);
    this.sc.tweens.add({ targets: t, scale: 1, duration: 400, ease: "Back.out" });
    this.sc.tweens.add({ targets: t, alpha: 0, delay: 1900, duration: 600, onComplete: () => t.destroy() });
  }

  private async intro() {
    this.bigTitle("THE KREDDLE RAID", "#7cff3a", 64);
    synth.play("alarm");
    await this.wait(1500);
    await this.talk(RAID_ARRIVE);
    this.phase = "march";
    this.busy = false;
  }

  private async broadcast() {
    this.broadcastDone = true;
    this.phase = "cutscene";
    this.busy = true;
    const scr = this.screen;
    if (scr) {
      scr.text.setVisible(false);
      scr.frame.setFillStyle(0x3b0764);
      scr.face?.setVisible(true);
    }
    synth.play("decree");
    await this.talk(RAID_KLERBLE_BROADCAST.slice(0, 6));
    // Gronny lobs a nail bomb at the screen
    const gronny = this.lads.find((l) => l.id === "GRONNY") ?? this.lads[0];
    if (gronny && scr) {
      await new Promise<void>((r) => this.lob(gronny.spr.x, gronny.spr.y - 30, scr.frame.x, scr.frame.y, "kd_nailbomb", 700, () => r()));
      this.explode(scr.frame.x, scr.frame.y, 1.6);
      this.explode(scr.frame.x + 60, scr.frame.y + 30, 1.1, 200);
      scr.face?.destroy();
      scr.frame.setFillStyle(0x111111).setStrokeStyle(6, 0x3f3f46).setAngle(8);
      scr.text.setVisible(true).setText("— NO SIGNAL —").setColor("#ff3b3b");
      this.addFire(scr.frame.x - 60, scr.frame.y + 40, 2, GREEN, 0);
      this.addFire(scr.frame.x + 70, scr.frame.y + 30, 1.6, 0, 0);
    }
    await this.talk(RAID_KLERBLE_BROADCAST.slice(6));
    this.phase = "march";
    this.busy = false;
  }

  private async standoff() {
    this.standoffDone = true;
    this.phase = "cutscene";
    this.busy = true;
    this.bigTitle("THE KREDDLE KRUNCHERS", "#ff4fd8", 48);
    // the lads bunch up behind you
    await this.wait(900);
    await this.talk(KRUNCHER_STANDOFF);
    this.phase = "krunchers";
    this.busy = false;
  }

  private async krunchersDead() {
    this.krunchersDone = true;
    this.phase = "cutscene";
    this.busy = true;
    await this.wait(900);
    synth.play("cheer");
    synth.play("jackpot");
    // the lads celebrate
    const t0 = this.sc.time.now;
    const ev = this.sc.time.addEvent({ delay: 60, loop: true, callback: () => {
      this.lads.forEach((l, i) => {
        if (!playPerf(l.spr, "victory", this.sc.time.now - t0, 8, i)) l.spr.y += Math.sin((this.sc.time.now + i * 90) / 80) * 2;
      });
    } });
    for (let i = 0; i < 6; i++) vfx(this.sc, "vfx_confetti", this.me.x - 200 + Math.random() * 400, 420 + Math.random() * 140, { scale: 1.6, depth: D_LIGHT + 5, delay: i * 180 });
    this.bubble(this.me, "YEEEEESSS!!", "#b6ff5a");
    await this.wait(2600);
    ev.remove();
    await this.talk(KRUNCHERS_DONE);
    const gate = this.bars[4];
    if (gate) gate.locked = false;
    this.phase = "march";
    this.busy = false;
  }

  private async plantNuke() {
    this.palaceDone = true;
    this.phase = "palace";
    this.busy = true;
    const sc = this.sc;
    const s = G.s;
    // Krezwonk (or you, if you ARE Krezwonk) walks up the steps
    const lad = this.lads.find((l) => l.id === "KREZWONK");
    const planter = lad?.spr ?? this.me;
    const px = PALACE_X;
    const py = 488;
    await new Promise<void>((r) => {
      const t0 = sc.time.now;
      const ev = sc.time.addEvent({ delay: 16, loop: true, callback: () => animateWalker(planter, px - planter.x, py - planter.y, true, sc.time.now - t0) });
      sc.tweens.add({ targets: planter, x: px - 40, y: py, duration: 1300, onComplete: () => { ev.remove(); r(); } });
    });
    await this.talk(NUKE_PLANT.slice(0, 2));
    synth.play("lob");
    this.nuke = sc.textures.exists("kd_nuke") ? sc.add.image(px, py + 20, "kd_nuke").setOrigin(0.5, 1).setScale(1.5).setDepth(py + 20) : null;
    if (!this.nuke) this.nuke = sc.add.image(px, py + 20, "raid_dot").setScale(6).setTint(0x111111).setDepth(py + 20);
    const blink = sc.add.circle(px + 18, py, 5, 0xff0000).setDepth(D_LIGHT + 4).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: blink, alpha: 0.1, yoyo: true, repeat: -1, duration: 250 });
    await this.talk(NUKE_PLANT.slice(2));
    s.flags.nuke_planted = true;
    G.rt.timerEnd = Date.now() + 240000;
    G.save();
    this.startEscape(true);
  }

  private startEscape(fresh: boolean) {
    const sc = this.sc;
    this.phase = "escape";
    this.busy = false;
    if (!G.rt.timerEnd) G.rt.timerEnd = Date.now() + 240000;
    for (const b of this.bars) if (!b.down) this.breakBarricade(b, true);
    if (!this.nuke) {
      this.nuke = sc.textures.exists("kd_nuke") ? sc.add.image(PALACE_X, 508, "kd_nuke").setOrigin(0.5, 1).setScale(1.5).setDepth(508) : null;
      const blink = sc.add.circle(PALACE_X + 18, 488, 5, 0xff0000).setDepth(D_LIGHT + 4).setBlendMode(Phaser.BlendModes.ADD);
      sc.tweens.add({ targets: blink, alpha: 0.1, yoyo: true, repeat: -1, duration: 250 });
    }
    this.banner.setText("☢ NUCLEAR DEVICE ARMED AT THE PALACE ☢  EVERYBODY RUN");
    this.bannerBg.setFillStyle(0xb91c1c, 0.9);
    this.countdown.setVisible(true);
    // the lads run in a pack around you, westward
    this.lads.forEach((l, i) => (l.off = { x: 50 + (i % 4) * 45, y: -70 + (i % 4) * 45 + (i > 3 ? 20 : 0) }));
    synth.music("boss_krozno", true);
    synth.play("alarm");
    if (fresh) {
      this.bigTitle("RUN!!!", "#ff3b3b", 80);
      G.emit("toast", { title: "☢ NUKE PLANTED", text: "RUN! Get back to the Town Hall before it blows!" });
      // the Palace goes up in chemical fire behind you
      const pal = this.blds[this.blds.length - 1];
      if (pal) this.ignite(pal);
    }
  }

  private leave() {
    if (this.phase === "leaving") return;
    this.phase = "leaving";
    this.busy = true;
    G.save();
    const sc = this.sc;
    sc.cameras.main.fadeOut(400);
    sc.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(sc, "Hub", { at: "KREDDLE_BRIDGE", from: "raid" }));
  }

  /** Coming back in after the nuke's planted: everything is already on fire. */
  private preburn() {
    for (const b of this.blds) {
      if (b.x < this.me.x - 1600) continue;
      this.ignite(b, true);
    }
    for (const b of this.blds) if (b.x < this.me.x - 1600) this.char(b);
    for (const p of this.props) this.burnProp(p, true);
    this.krunchersDone = this.standoffDone = this.broadcastDone = this.palaceDone = true;
    for (let i = 0; i < 40; i++) this.addAsh(400 + Math.random() * 9000, TOP + 20 + Math.random() * 220);
  }

  // ------------------------------------------------------------------ the loop

  update(time: number, delta: number) {
    const s = G.s;
    const dt = Math.min(delta, 50);
    s.playtimeMs += dt;
    // the nuke timer, every frame
    if (s.flags.nuke_planted) {
      if (!G.rt.timerEnd) G.rt.timerEnd = Date.now() + 240000;
      const left = Math.max(0, (G.rt.timerEnd - Date.now()) / 1000);
      G.emit("timer", left);
      const sec = Math.ceil(left);
      this.countdown.setText(`☢ DETONATION IN ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`).setColor(sec % 2 ? "#ff3b3b" : "#ffffff");
      if (left <= 0 && this.phase === "escape") this.leave();
    }
    this.updateHud();
    this.updatePuffs(dt);
    this.updateNpcs(time, dt);
    this.updateLads(time, dt);
    this.updateAir(time, dt);
    this.updateHazards(time);
    this.updateFires(time, dt);
    this.updateBubbles(time);
    this.ambient(time);
    if (time > this.nextCull) {
      this.nextCull = time + 250;
      this.cull();
    }
    if (this.busy) {
      animateWalker(this.me, 0, 0, false, time);
      this.controls.interact();
      return;
    }
    if (this.controls.pause()) {
      this.pausedAt = Date.now();
      this.busy = true;
      this.sc.scene.launch("Menu", { mode: "pause", caller: "Kreddle" });
      this.sc.scene.pause();
      return;
    }
    this.controls.interact();
    // movement
    const mv = this.controls.move();
    const escape = this.phase === "escape";
    const sp = (escape ? 320 : 165) * (dt / 1000);
    let maxX = RW - 60;
    for (const b of this.bars) if (!b.down && b.x > this.me.x - 10) maxX = Math.min(maxX, b.x - 46);
    this.me.x = Phaser.Math.Clamp(this.me.x + mv.x * sp, 40, maxX);
    this.me.y = Phaser.Math.Clamp(this.me.y + mv.y * sp, TOP, BOTTOM);
    this.me.setDepth(this.me.y);
    // the flamethrower
    const firing = this.controls.attackHeld();
    this.controls.autoAim = this.nearestTargetAngle();
    const a = this.controls.aim(this.me.x, this.me.y - 22);
    this.aimDeg = Phaser.Math.RadToDeg(a);
    const moving = Math.hypot(mv.x, mv.y) > 0.1;
    if (firing) animateWalker(this.me, Math.cos(a), Math.sin(a), moving, time);
    else animateWalker(this.me, mv.x, mv.y, moving, time);
    if (firing) this.spray(a, time, dt);
    // story triggers
    if (!escape) {
      this.checkDistrict();
      if (!this.broadcastDone && this.me.x > 4420) void this.broadcast();
      else if (!this.standoffDone && this.me.x > KRUNCH_X) void this.standoff();
      else if (this.phase === "krunchers" && !this.krunchersDone && this.npcs.every((n) => n.kind !== "kruncher" || n.state === "dead")) void this.krunchersDead();
      else if (!this.palaceDone && this.krunchersDone && this.bars[4]?.down && this.me.x > 9260) void this.plantNuke();
      // nudge: the barricade ahead
      for (const b of this.bars) {
        if (b.down || b.warned || this.me.x < b.x - 260) continue;
        b.warned = true;
        this.reinforce(b);
        if (b.locked) this.shoutLine(RAID_GATES_LOCKED);
        else if (b.line) this.shoutLine(b.line);
      }
      if (this.me.x < 70) {
        this.me.x = 70;
        if (time > this.nextShout - 1500) {
          this.nextShout = time + 3000;
          this.shoutLine(RAID_NO_RETREAT);
        }
      }
    } else if (this.me.x < 80) this.leave();
  }

  private updateHud() {
    const pct = Math.round((this.burntBlds / Math.max(1, this.blds.length)) * 100);
    this.hud.setText(`🔥 KREDDLERS TORCHED: ${this.torched}\n🏚 KREDDLE BURNED: ${pct}%`);
    let obj = "";
    if (this.phase === "escape") obj = "RUN! Back WEST over the bridge to the Town Hall before it blows!";
    else if (this.phase === "krunchers") obj = "TORCH THE KREDDLE KRUNCHERS! (hold attack)";
    else if (this.krunchersDone && !this.palaceDone) obj = this.bars[4]?.down ? "Get Krezwonk to the Palace steps!" : "Burn through the Palace gates!";
    else {
      const next = this.bars.find((b) => !b.down);
      obj = next ? `Burn your way EAST along the Strip (hold attack to spray chemical fire). Next: ${next.name}` : "March on the Palace!";
    }
    this.objective.setText(obj);
  }

  private checkDistrict() {
    let d = 0;
    for (let i = 0; i < BARS.length; i++) if (this.me.x > BARS[i]) d = i + 1;
    if (d !== this.district) {
      const first = this.district === -1;
      this.district = d;
      if (!first || d > 0) this.bigTitle(RAID_DISTRICTS[d] ?? "", "#facc15", 40);
    }
  }

  // ------------------------------------------------------------------ the flamethrower

  private nearestTargetAngle(): number | null {
    let best: RNpc | null = null;
    let bd = 320;
    for (const n of this.npcs) {
      if (n.state === "dead" || n.state === "burn" || !n.spr.visible) continue;
      const d = Math.abs(n.spr.x - this.me.x) + Math.abs(n.spr.y - this.me.y);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    if (best) return Math.atan2(best.spr.y - 10 - (this.me.y - 22), best.spr.x - this.me.x);
    const f = this.me.getData("facing");
    // nothing near: spray at the buildings (or the barricade) ahead
    return f === "west" ? Math.PI + 0.35 : -0.35;
  }

  private spray(a: number, time: number, dt: number) {
    const sc = this.sc;
    const ox = this.me.x + Math.cos(a) * 26;
    const oy = this.me.y - 22 + Math.sin(a) * 26;
    if (time > this.nextFlameSfx) {
      this.nextFlameSfx = time + 170;
      synth.play("gun_flamer");
    }
    if (time > this.nextPuff) {
      this.nextPuff = time + 38;
      this.emitPuff(ox, oy, a);
    }
    if (!this.sparks) {
      this.sparks = sc.add.particles(0, 0, "raid_dot", {
        speed: { min: 260, max: 620 },
        angle: { onEmit: () => this.aimDeg + Phaser.Math.Between(-14, 14) },
        lifespan: { min: 250, max: 520 },
        scale: { start: 1.3, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [GREEN, GREEN2, 0xeaff9a, 0x3aff7a],
        blendMode: "ADD",
        frequency: -1,
        maxParticles: 160,
      } as unknown as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig);
      this.sparks.setDepth(D_LIGHT + 20);
    }
    this.sparks.emitParticleAt(ox, oy, 3);
    // what the cone touches (checked every other frame)
    this.flameAt += dt;
    if (this.flameAt < 60) return;
    const step = this.flameAt / 1000;
    this.flameAt = 0;
    const range = 290;
    const hitBars = new Set<Barricade>();
    for (const n of this.npcs) {
      if (n.state === "dead" || n.state === "burn") continue;
      const dx = n.spr.x - this.me.x;
      const dy = n.spr.y - 12 - (this.me.y - 22);
      const d = Math.hypot(dx, dy);
      if (d > range) continue;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - a));
      if (diff < 0.42 || d < 46) this.igniteNpc(n);
    }
    // sample points along the jet for buildings, barricades and machines
    for (let r = 60; r <= range + 40; r += 45) {
      const px = this.me.x + Math.cos(a) * r;
      const py = this.me.y - 22 + Math.sin(a) * r;
      for (const b of this.blds) {
        if (b.burning || Math.abs(px - b.x) > b.w / 2 || py > GROUND + 60) continue;
        b.heat += step;
        if (b.heat > 0.55) this.ignite(b);
      }
      for (const b of this.bars) {
        if (b.down || Math.abs(px - b.x) > 60 || hitBars.has(b)) continue;
        hitBars.add(b);
        if (b.locked) {
          if (Math.random() < 0.05) this.floatText(b.x, 470, "LOCKED (the Krunchers first!)", "#ffd23f");
          continue;
        }
        b.heat += step;
        this.barMeter(b);
        if (Math.random() < 0.3) this.addFire(b.x - 20 + Math.random() * 40, 450 + Math.random() * 220, 1.4, Math.random() < 0.5 ? GREEN : 0, time + 4000);
        if (b.heat > b.need) this.breakBarricade(b);
      }
      for (const p of this.props) {
        if (p.burnt || Math.abs(px - p.img.x) > p.img.displayWidth / 2 + 10 || Math.abs(py - (p.img.y - p.img.displayHeight / 2)) > p.img.displayHeight / 2 + 30) continue;
        p.heat += step / 3;
        if (p.heat > 0.4) this.burnProp(p);
      }
    }
  }

  private emitPuff(x: number, y: number, a: number) {
    const sc = this.sc;
    let p = this.puffs.find((q) => !q.live);
    if (!p) {
      if (this.puffs.length >= 30) p = this.puffs.reduce((o, q) => (q.age / q.life > o.age / o.life ? q : o));
      else {
        const spr = hasVfx(sc, "vfx_fire") ? vfx(sc, "vfx_fire", x, y, { add: true, depth: D_LIGHT + 10 }) : null;
        const obj = spr ?? sc.add.image(x, y, "raid_dot").setBlendMode(Phaser.BlendModes.ADD).setDepth(D_LIGHT + 10);
        if (spr) spr.anims.setProgress(Math.random());
        p = { spr: obj, vx: 0, vy: 0, age: 0, life: 1, live: false };
        this.puffs.push(p);
      }
    }
    const sp = 470 + Math.random() * 120;
    const aa = a + (Math.random() - 0.5) * 0.3;
    p.vx = Math.cos(aa) * sp;
    p.vy = Math.sin(aa) * sp;
    p.age = 0;
    p.life = 430 + Math.random() * 120;
    p.live = true;
    p.spr.setPosition(x, y).setVisible(true).setAlpha(1).setAngle(Phaser.Math.RadToDeg(aa) + 90);
    (p.spr as Phaser.GameObjects.Sprite).setTint(Math.random() < 0.5 ? GREEN : GREEN2);
  }

  private updatePuffs(dt: number) {
    for (const p of this.puffs) {
      if (!p.live) continue;
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) {
        p.live = false;
        p.spr.setVisible(false);
        continue;
      }
      p.spr.x += p.vx * (dt / 1000);
      p.spr.y += p.vy * (dt / 1000) - 30 * (dt / 1000) * k;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.spr.setScale(0.6 + k * 1.9).setAlpha(1 - k * k);
    }
  }

  // ------------------------------------------------------------------ fire, ash, explosions

  private addFire(x: number, y: number, scale: number, tint: number, until: number, ground = false): Phaser.GameObjects.Sprite | null {
    const sc = this.sc;
    if (this.fires.length >= MAX_FIRES) {
      // recycle the oldest temporary fire, else give up
      const i = this.fires.findIndex((f) => f.until > 0);
      if (i < 0) return null;
      this.fires[i].spr.destroy();
      this.fires.splice(i, 1);
    }
    const o: VfxOpts = { scale, add: true, depth: D_LIGHT + (ground ? 2 : 0) + Math.random() };
    if (tint) o.tint = tint;
    const spr = vfx(sc, "vfx_fire", x, y, o);
    if (!spr) return null;
    spr.anims.setProgress(Math.random());
    this.fires.push({ spr, until, ground });
    return spr;
  }

  private updateFires(time: number, _dt: number) {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      if (f.until && time > f.until) {
        const spr = f.spr;
        this.fires.splice(i, 1);
        this.sc.tweens.add({ targets: spr, alpha: 0, duration: 500, onComplete: () => spr.destroy() });
      }
    }
  }

  private explode(x: number, y: number, scale = 1, delay = 0, big = true) {
    const sc = this.sc;
    const go = () => {
      vfx(sc, big ? "vfx_bigboom" : "vfx_boom", x, y, { scale: scale * 1.5, depth: D_LIGHT + 30, add: false });
      vfx(sc, "vfx_blastsmoke", x, y + 10, { scale: scale * 0.8, depth: y + 40, alpha: 0.8 });
      const near = Math.abs(x - this.me.x) < 700;
      if (near) {
        sc.cameras.main.shake(260, 0.006 + scale * 0.004);
        if (sc.time.now > this.nextBoomSfx) {
          this.nextBoomSfx = sc.time.now + 140;
          synth.play(Math.random() < 0.5 ? "explode_1" : "explode_2");
        }
      }
      // anyone nearby goes up
      for (const n of this.npcs) if (n.state !== "dead" && Math.abs(n.spr.x - x) < 90 * scale && Math.abs(n.spr.y - y) < 70 * scale) this.igniteNpc(n);
    };
    if (delay) sc.time.delayedCall(delay, go);
    else go();
  }

  private addAsh(x: number, y: number, charred = false, tint?: number) {
    const sc = this.sc;
    const key = charred && sc.textures.exists("kd_charred") ? "kd_charred" : sc.textures.exists("kd_ash") ? "kd_ash" : null;
    if (!key) return;
    if (this.ash.length >= MAX_ASH) this.ash.shift()?.destroy();
    const img = sc.add.image(x, y + 26, key).setOrigin(0.5, 1).setScale(charred ? 0.95 : 0.8).setDepth(y - 30).setFlipX(Math.random() < 0.5);
    if (tint) img.setTint(tint);
    this.ash.push(img);
  }

  private ignite(b: Bld, quiet = false) {
    if (b.burning) return;
    b.burning = true;
    b.burnT = this.sc.time.now;
    this.burntBlds++;
    const n = Math.max(3, Math.round(b.w / 90));
    for (let i = 0; i < n; i++) {
      const fx = b.x - b.w / 2 + 20 + Math.random() * (b.w - 40);
      const fy = GROUND - Math.random() * Math.min(240, GROUND - b.top - 20);
      this.addFire(fx, fy, 2 + Math.random() * 1.6, i % 2 ? GREEN : 0, 0);
    }
    const smoke = vfx(this.sc, "vfx_smokecol", b.x + (Math.random() - 0.5) * b.w * 0.4, Math.max(170, b.top + 40), { scale: 3, depth: 399, alpha: 0.75 });
    smoke?.anims.setProgress(Math.random());
    b.sign?.setColor("#ff3b3b").setAlpha(0.6);
    b.nextBoom = this.sc.time.now + 2000 + Math.random() * 5000;
    if (!quiet) {
      this.explode(b.x + (Math.random() - 0.5) * b.w * 0.5, GROUND - 60 - Math.random() * 80, 1.3);
      if (Math.random() < 0.5) this.shoutRandom();
    }
    // the facade chars over a few seconds
    this.sc.tweens.addCounter({ from: 0, to: 1, duration: quiet ? 1 : 6000, onUpdate: (tw) => {
      const k = tw.getValue() ?? 0;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(0x4a3030), 1, k);
      b.img.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    } });
  }

  /** Burnt out long ago (far behind you when you come back in): no fire, just char. */
  private char(b: Bld) {
    b.burning = true;
    this.burntBlds++;
    b.img.setTint(0x3a2828);
    b.sign?.setVisible(false);
  }

  private burnProp(p: Prop, quiet = false) {
    if (p.burnt) return;
    p.burnt = true;
    const sc = this.sc;
    const isMachine = p.img.texture.key.startsWith("kd_m_");
    if (isMachine && sc.textures.exists("kd_slots_burnt")) p.img.setTexture("kd_slots_burnt").setScale(1.3);
    else p.img.setTint(0x3a2a2a);
    this.addFire(p.img.x, p.img.y - 10, 1.4, Math.random() < 0.5 ? GREEN : 0, quiet ? 0 : sc.time.now + 15000);
    if (!quiet) {
      this.explode(p.img.x, p.img.y - 30, 0.8, 0, false);
      if (isMachine) vfx(sc, "vfx_coins", p.img.x, p.img.y - 40, { scale: 1.2, depth: D_LIGHT + 5 });
    }
  }

  /** A melt-o-meter over the barricade while you're burning it. */
  private barMeter(b: Barricade) {
    const sc = this.sc;
    if (!b.meter) {
      const bg = sc.add.rectangle(b.x, 392, 124, 12, 0x000000, 0.8).setStrokeStyle(2, 0xffffff).setDepth(D_LIGHT + 12);
      b.deco.push(bg);
      b.meter = sc.add.rectangle(b.x - 60, 392, 1, 8, GREEN).setOrigin(0, 0.5).setDepth(D_LIGHT + 13);
      b.deco.push(b.meter);
    }
    b.meter.width = Math.max(1, 120 * Math.min(1, b.heat / b.need));
  }

  /** Kreddlers pour out of the buildings near a barricade (more to burn). */
  private reinforce(b: Barricade) {
    const sc = this.sc;
    for (let i = 0; i < 12; i++) {
      const bx = b.x - 150 - Math.random() * 450;
      const key = ["spr_KD_MAN", "spr_KD_WOMAN"][i % 2];
      if (!sc.textures.exists(key)) continue;
      const spr = sc.add.sprite(bx, TOP + 2, key, 0).setScale(2).setDepth(TOP);
      if (i % 3 === 2) spr.setTint(NEON[i % NEON.length] | 0x808080);
      const n: RNpc = { spr, kind: "citizen", state: "flee", t: 0, dir: { x: 0, y: 1 }, nextTurn: 0, fire: null, speed: 120 + Math.random() * 50 };
      this.npcs.push(n);
    }
    this.floatTannoy("KREDDLE TANNOY: Bunker capacity reached. Please return to the Strip and gamble bravely.");
  }

  private breakBarricade(b: Barricade, quiet = false) {
    b.down = true;
    const sc = this.sc;
    b.parts.forEach((c, i) => {
      c.setTint(0x2a2020).setAngle((Math.random() - 0.5) * 30);
      if (!quiet) this.explode(c.x, c.y - 20, 1.2, i * 220);
      this.addFire(c.x, c.y - 10, 1.6, i % 2 ? GREEN : 0, quiet ? 0 : sc.time.now + 20000);
    });
    for (const d of b.deco) d.destroy();
    b.deco = [];
    if (!quiet) {
      this.floatText(b.x, 420, `${b.name} DESTROYED!`, "#b6ff5a");
      synth.play("smash");
      this.sc.time.delayedCall(700, () => this.shoutRandom());
    }
  }

  // ------------------------------------------------------------------ people

  private igniteNpc(n: RNpc) {
    if (n.state === "dead" || n.state === "burn") return;
    if (this.npcs.filter((m) => m.state === "burn").length >= MAX_BURNING) return;
    n.state = "burn";
    n.t = this.sc.time.now + 1700 + Math.random() * 1200;
    n.spr.setTint(n.kind === "kruncher" ? 0xff8a3a : 0xa0ff70);
    n.fire = this.addFire(n.spr.x, n.spr.y + 20, 1.1, Math.random() < 0.7 ? GREEN : 0, 0);
    n.nextTurn = 0;
    if (this.sc.time.now > this.nextScreamSfx) {
      this.nextScreamSfx = this.sc.time.now + 260;
      synth.play(Phaser.Utils.Array.GetRandom(["gasp", "hurt_1", "hurt_2"]));
    }
    if (n.kind === "kruncher") {
      const line = KRUNCHER_DEATHS.find((l) => l.s === n.name);
      if (line) this.bubble(n.spr, line.t, "#ffd1f3", true);
    } else if (Math.random() < 0.4) this.bubble(n.spr, Phaser.Utils.Array.GetRandom(RAID_SCREAMS).t, "#ffe0e0");
  }

  private choke(n: RNpc) {
    if (n.state === "dead" || n.state === "burn" || n.state === "choke") return;
    n.state = "choke";
    n.t = this.sc.time.now + 1300 + Math.random() * 900;
    n.spr.setTint(0x9acd32);
    if (Math.random() < 0.3) this.bubble(n.spr, Phaser.Utils.Array.GetRandom(["*COUGH* *COUGH*", "MY EYES!!", "IT SMELLS OF MUSTARD!", "*HACK*"]), "#e6ffb0");
    if (this.sc.time.now > this.nextScreamSfx) {
      this.nextScreamSfx = this.sc.time.now + 260;
      synth.play("gasp");
    }
  }

  private kill(n: RNpc, how: "burn" | "gas" | "nails") {
    if (n.state === "dead") return;
    n.state = "dead";
    this.torched++;
    const sc = this.sc;
    const spr = n.spr;
    const fire = n.fire;
    n.fire = null;
    const gore = G.meta.settings.gore !== false;
    if (how === "nails" && gore) {
      vfx(sc, "vfx_gore", spr.x, spr.y, { scale: 0.8, depth: D_LIGHT + 3, flipX: Math.random() < 0.5 });
      vfx(sc, "vfx_bloodpool", spr.x, spr.y + 24, { scale: 1, depth: spr.y - 31, hold: true });
    }
    sc.tweens.add({
      targets: spr,
      angle: Math.random() < 0.5 ? 90 : -90,
      y: spr.y + 14,
      duration: 380,
      onComplete: () => {
        if (fire) {
          const i = this.fires.findIndex((f) => f.spr === fire);
          if (i >= 0) this.fires[i].until = sc.time.now + 1500;
        }
        if (how === "burn") {
          vfx(sc, "vfx_pixeldeath", spr.x, spr.y, { scale: 1.1, tint: GREEN, depth: D_LIGHT + 3 });
          vfx(sc, "vfx_smoke", spr.x, spr.y - 10, { scale: 1, depth: spr.y + 5, alpha: 0.8 });
          if (gore && Math.random() < 0.25) vfx(sc, "vfx_blood", spr.x, spr.y, { scale: 0.8, depth: D_LIGHT + 2 });
          this.addAsh(spr.x, spr.y - 14, Math.random() < 0.35);
          spr.destroy();
        } else if (how === "gas") {
          vfx(sc, "vfx_smoke", spr.x, spr.y - 10, { scale: 1, depth: spr.y + 5, tint: 0xb5e61d, alpha: 0.8 });
          spr.setTint(0x6b7a2a);
        } else {
          spr.setTint(gore ? 0x8a3030 : 0x555555);
        }
      },
    });
  }

  private updateNpcs(time: number, dt: number) {
    const camX = this.sc.cameras.main.midPoint.x;
    const meX = this.me?.x ?? 0;
    const meY = this.me?.y ?? 0;
    const bounds = (x: number) => {
      // nobody crosses a standing barricade
      let lo = 30;
      let hi = RW - 30;
      for (const b of this.bars) {
        if (b.down) continue;
        if (b.x > x) hi = Math.min(hi, b.x - 24);
        else lo = Math.max(lo, b.x + 24);
      }
      return [lo, hi];
    };
    const burning = this.npcs.filter((n) => n.state === "burn");
    for (const n of this.npcs) {
      if (n.state === "dead") continue;
      const spr = n.spr;
      if (Math.abs(spr.x - camX) > 950 && n.state !== "burn") continue;
      const step = dt / 1000;
      if (n.state === "burn") {
        if (time > n.t) {
          this.kill(n, "burn");
          continue;
        }
        if (time > n.nextTurn) {
          n.nextTurn = time + 250 + Math.random() * 350;
          const ang = Math.random() * Math.PI * 2;
          n.dir = { x: Math.cos(ang), y: Math.sin(ang) };
        }
        spr.x += n.dir.x * 230 * step;
        spr.y += n.dir.y * 160 * step;
        spr.setAngle(Math.sin(time / 50) * 12);
        // burning people set others alight
        for (const m of this.npcs) {
          if (m === n || m.state === "dead" || m.state === "burn" || m.kind === "kruncher") continue;
          if (Math.abs(m.spr.x - spr.x) < 24 && Math.abs(m.spr.y - spr.y) < 18) this.igniteNpc(m);
        }
      } else if (n.state === "choke") {
        if (time > n.t) {
          this.kill(n, "gas");
          continue;
        }
        spr.x += Math.sin(time / 120 + spr.y) * 20 * step;
        spr.setAngle(Math.sin(time / 90) * 18);
      } else if (n.kind === "kruncher") {
        // they stand and jeer, swaying, facing you
        if (Math.abs(spr.x - meX) < 500) animateWalker(spr, meX - spr.x, meY - spr.y, false, time);
        spr.y += Math.sin(time / 300 + spr.x) * 0.3;
      } else {
        const dx = spr.x - meX;
        const dy = spr.y - meY;
        const d = Math.hypot(dx, dy);
        const scared = this.phase !== "intro" && d < (n.kind === "guard" ? 220 : 340);
        if (scared && n.state !== "flee") {
          n.state = "flee";
          if (Math.random() < 0.15) this.bubble(spr, Phaser.Utils.Array.GetRandom(RAID_SCREAMS).t, "#ffe0e0");
        }
        if (n.state === "flee") {
          if (d > 520) n.state = "idle";
          // away from you (mostly east, toward the bunkers), with a bit of panic
          const away = Math.atan2(dy + Math.sin(time / 300 + spr.x) * 40, dx);
          n.dir = { x: Math.cos(away), y: Math.sin(away) };
          n.nextTurn = 0;
        } else if (time > n.nextTurn) {
          n.nextTurn = time + 1500 + Math.random() * 3000;
          const ang = Math.random() * Math.PI * 2;
          n.dir = Math.random() < 0.3 ? { x: 0, y: 0 } : { x: Math.cos(ang), y: Math.sin(ang) * 0.5 };
        }
        const speed = n.state === "flee" ? n.speed + 40 : 50;
        spr.x += n.dir.x * speed * step;
        spr.y += n.dir.y * speed * step;
        animateWalker(spr, n.dir.x, n.dir.y, Math.abs(n.dir.x) + Math.abs(n.dir.y) > 0.05, time * (n.state === "flee" ? 1.6 : 1));
        spr.setAngle(n.state === "flee" ? Math.sin(time / 70 + spr.y) * 6 : 0);
      }
      const [lo, hi] = bounds(spr.x);
      spr.x = Phaser.Math.Clamp(spr.x, lo, hi);
      spr.y = Phaser.Math.Clamp(spr.y, TOP, BOTTOM);
      spr.setDepth(spr.y);
      if (n.fire) n.fire.setPosition(spr.x, spr.y + 22);
    }
    void burning;
  }

  // ------------------------------------------------------------------ the lads

  private updateLads(time: number, dt: number) {
    if (!this.me) return;
    const escape = this.phase === "escape";
    const celebrating = this.phase === "cutscene" && this.krunchersDone && !this.palaceDone;
    for (const l of this.lads) {
      if (this.phase === "palace" && l.id === "KREZWONK") continue;
      if (celebrating) continue;
      const tx = this.me.x + l.off.x * (escape ? -1 : 1) * (this.me.getData("facing") === "west" && !escape ? -1 : 1);
      const ty = Phaser.Math.Clamp(this.me.y + l.off.y, TOP, BOTTOM);
      const dx = tx - l.spr.x;
      const dy = ty - l.spr.y;
      const d = Math.hypot(dx, dy);
      const speed = Math.min(escape ? 360 : 260, d * 3);
      const moving = d > 12;
      if (moving) {
        l.spr.x += (dx / d) * speed * (dt / 1000);
        l.spr.y += (dy / d) * speed * (dt / 1000);
      }
      l.spr.setDepth(l.spr.y);
      if (moving) animateWalker(l.spr, dx, dy, true, time + l.off.y * 7);
      else animateWalker(l.spr, escape ? -1 : 1, 0, false, time);
    }
    if (this.busy || this.phase === "intro") return;
    // shouting
    if (time > this.nextShout) {
      this.nextShout = time + 2600 + Math.random() * 2600;
      this.shoutRandom();
    }
    // chemical weapons
    if (!escape && time > this.nextThrow) {
      this.nextThrow = time + 7000 + Math.random() * 6000;
      this.throwSomething();
    }
  }

  private shoutRandom() {
    const pool = this.phase === "escape" ? ESCAPE_SHOUTS : Math.random() < 0.22 && G.s.player !== "KREBLIS" ? KREBLIS_GLOAT : RAID_SHOUTS;
    this.shoutLine(Phaser.Utils.Array.GetRandom(pool));
  }

  private ladSprite(id: string): Phaser.GameObjects.Sprite | null {
    if (id === G.s.player || id === "YOU") return this.me;
    return this.lads.find((l) => l.id === id)?.spr ?? null;
  }

  private shoutLine(line: Line) {
    const spr = this.ladSprite(String(line.s)) ?? this.lads[Math.floor(Math.random() * this.lads.length)]?.spr;
    if (spr) this.bubble(spr, line.t, "#ffffff", true);
  }

  private throwSomething() {
    const lad = Phaser.Utils.Array.GetRandom(this.lads);
    if (!lad) return;
    // aim at a crowd ahead
    const ahead = this.npcs.filter((n) => n.state !== "dead" && n.kind !== "kruncher" && n.spr.x > this.me.x + 80 && n.spr.x < this.me.x + 520);
    const target = ahead.length ? Phaser.Utils.Array.GetRandom(ahead).spr : null;
    const tx = target ? target.x : this.me.x + 200 + Math.random() * 200;
    const ty = target ? target.y : TOP + 40 + Math.random() * 200;
    const kind = Phaser.Utils.Array.GetRandom(["napalm", "gas", "nails"] as const);
    const ls = RAID_THROW_SHOUTS[kind];
    const line = ls.find((l) => l.s === lad.id) ?? ls[0];
    this.bubble(lad.spr, line.t, "#fff3b0", true);
    const key = kind === "napalm" ? "kd_napalm" : kind === "gas" ? "kd_gascan" : "kd_nailbomb";
    this.lob(lad.spr.x, lad.spr.y - 30, tx, ty, key, 800, () => this.detonate(kind, tx, ty));
  }

  private lob(x0: number, y0: number, x1: number, y1: number, key: string, ms: number, done: () => void) {
    const sc = this.sc;
    synth.play("lob");
    const img = sc.textures.exists(key) ? sc.add.image(x0, y0, key).setScale(0.6) : sc.add.image(x0, y0, "raid_dot").setScale(2).setTint(0x333333);
    img.setDepth(D_LIGHT + 8);
    const peak = Math.min(y0, y1) - 160;
    sc.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        img.x = x0 + (x1 - x0) * k;
        img.y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * peak + k * k * y1;
        img.angle += 14;
      },
      onComplete: () => {
        img.destroy();
        done();
      },
    });
  }

  private detonate(kind: "napalm" | "gas" | "nails", x: number, y: number) {
    const sc = this.sc;
    const now = sc.time.now;
    if (kind === "napalm") {
      this.explode(x, y, 1.3);
      for (let i = 0; i < 6; i++) this.addFire(x + (Math.random() - 0.5) * 160, y + (Math.random() - 0.5) * 60, 1.5 + Math.random(), 0, now + 7000 + Math.random() * 2000, true);
      this.hazards.push({ x, y, r: 100, until: now + 8000, kind: "fire", next: 0 });
      for (const b of this.blds) if (y < GROUND + 80 && Math.abs(b.x - x) < b.w / 2) this.ignite(b);
    } else if (kind === "gas") {
      synth.play("pfft_1");
      for (let i = 0; i < 6; i++) {
        const key = sc.textures.exists("fx_gas") ? (i % 2 ? "fx_gas" : "fx_gas2") : "raid_dot";
        const c = sc.add.image(x + (Math.random() - 0.5) * 120, y + (Math.random() - 0.5) * 50, key).setTint(0xc8e64a).setAlpha(0).setScale(1).setDepth(D_LIGHT + 6);
        sc.tweens.add({ targets: c, alpha: 0.75, scale: 2.4 + Math.random(), x: c.x + (Math.random() - 0.5) * 80, duration: 1400 });
        sc.tweens.add({ targets: c, alpha: 0, delay: 6000 + Math.random() * 1500, duration: 1500, onComplete: () => c.destroy() });
      }
      this.hazards.push({ x, y, r: 150, until: now + 7500, kind: "gas", next: 0 });
    } else {
      this.explode(x, y, 1.1, 0, false);
      vfx(sc, "vfx_sparks", x, y - 10, { scale: 2, depth: D_LIGHT + 8, add: true });
      synth.play("splat_1");
      for (const n of this.npcs) {
        if (n.state === "dead" || n.kind === "kruncher") continue;
        if (Math.abs(n.spr.x - x) < 130 && Math.abs(n.spr.y - y) < 90) this.kill(n, "nails");
      }
      if (G.meta.settings.gore !== false) vfx(sc, "vfx_bloodspray", x, y, { scale: 1.4, depth: D_LIGHT + 7 });
    }
  }

  private updateHazards(time: number) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (time > h.until) {
        this.hazards.splice(i, 1);
        continue;
      }
      if (time < h.next) continue;
      h.next = time + 250;
      for (const n of this.npcs) {
        if (n.state === "dead" || n.state === "burn" || n.kind === "kruncher") continue;
        if (Math.abs(n.spr.x - h.x) < h.r && Math.abs(n.spr.y - h.y) < h.r * 0.6) {
          if (h.kind === "fire") this.igniteNpc(n);
          else this.choke(n);
        }
      }
    }
  }

  // ------------------------------------------------------------------ the sky

  private updateAir(time: number, dt: number) {
    const sc = this.sc;
    const cam = sc.cameras.main;
    const step = dt / 1000;
    if (this.phase !== "intro" && time > this.nextAir && this.air.length < MAX_AIR) {
      this.nextAir = time + 4500 + Math.random() * 5000;
      this.spawnAircraft();
      if (Math.random() < 0.3) sc.time.delayedCall(500, () => this.air.length < MAX_AIR && this.spawnAircraft("jet"));
    }
    for (let i = this.air.length - 1; i >= 0; i--) {
      const a = this.air[i];
      const spr = a.spr;
      if (!a.falling) {
        spr.x += a.vx * step;
        spr.y += Math.sin(time / 600 + spr.x / 200) * 0.2;
        if (a.light) a.light.setPosition(spr.x, spr.y + 16).setAngle(Math.sin(time / 700) * 25);
        // bombers carpet-bomb their own Strip (they're aiming at you; they're rubbish)
        if (a.kind === "bomber" && time > a.nextBomb && Math.abs(spr.x - this.me.x) < 500) {
          a.nextBomb = time + 700;
          const bx = spr.x;
          const by = TOP + 30 + Math.random() * 200;
          if (Math.abs(bx - this.me.x) > 120) {
            const bomb = sc.add.image(bx, spr.y + 14, "raid_dot").setTint(0x111111).setScale(1.4).setDepth(D_LIGHT + 8);
            sc.tweens.add({ targets: bomb, y: by, duration: 650, ease: "Quad.in", onComplete: () => { bomb.destroy(); this.explode(bx, by, 1); } });
          }
        }
        if (Math.abs(spr.x - cam.midPoint.x) > 1500) {
          a.light?.destroy();
          spr.destroy();
          this.air.splice(i, 1);
        }
        continue;
      }
      // shot down: tumbling, trailing smoke
      a.vy += 380 * step;
      spr.x += a.vx * step;
      spr.y += a.vy * step;
      spr.angle += a.spin * step;
      if (time > a.nextSmoke) {
        a.nextSmoke = time + 70;
        vfx(sc, "vfx_smoke", spr.x, spr.y, { scale: 1.1, depth: D_LIGHT - 6, alpha: 0.85 });
        if (Math.random() < 0.4) vfx(sc, "vfx_boom", spr.x, spr.y, { scale: 0.5, depth: D_LIGHT + 6 });
      }
      if (spr.y >= a.groundY) {
        this.explode(spr.x, a.groundY, 1.6);
        this.explode(spr.x + 40, a.groundY - 20, 1, 180, false);
        this.addFire(spr.x, a.groundY + 10, 2.2, 0, time + 12000, true);
        this.hazards.push({ x: spr.x, y: a.groundY, r: 110, until: time + 10000, kind: "fire", next: 0 });
        if (sc.textures.exists("kd_wreck")) {
          const w = sc.add.image(spr.x, a.groundY + 20, "kd_wreck").setOrigin(0.5, 1).setScale(1.4).setDepth(a.groundY).setFlipX(a.vx < 0);
          sc.time.delayedCall(30000, () => w.destroy());
        }
        a.light?.destroy();
        spr.destroy();
        this.air.splice(i, 1);
      }
    }
    // the lads fire rockets at anything on screen
    if (this.phase !== "intro" && time > this.nextRocket) {
      const targets = this.air.filter((a) => !a.hit && !a.targeted && Math.abs(a.spr.x - cam.midPoint.x) < 420);
      if (targets.length && this.lads.length) {
        this.nextRocket = time + 2500 + Math.random() * 3000;
        this.fireRocket(Phaser.Utils.Array.GetRandom(this.lads), Phaser.Utils.Array.GetRandom(targets));
      } else this.nextRocket = time + 500;
    }
  }

  private spawnAircraft(force?: Air["kind"]) {
    const sc = this.sc;
    const cam = sc.cameras.main;
    const kind = force ?? Phaser.Utils.Array.GetRandom(["jet", "jet", "heli", "blimp", "bomber"] as const);
    const key = { jet: "kd_jet", heli: "kd_heli", blimp: "kd_blimp", bomber: "kd_bomber" }[kind];
    const fromLeft = Math.random() < 0.5;
    const speed = { jet: 520, heli: 150, blimp: 70, bomber: 210 }[kind];
    const x = fromLeft ? cam.worldView.x - 120 : cam.worldView.right + 120;
    const y = 190 + Math.random() * 130;
    const tex = sc.textures.exists(key) ? key : null;
    const spr = tex ? sc.add.image(x, y, tex) : sc.add.image(x, y, "raid_dot").setScale(5).setTint(0xff4fd8);
    if (tex) spr.setScale(kind === "blimp" ? 2.6 : kind === "bomber" ? 2 : 1.6);
    spr.setDepth(D_LIGHT - 8);
    // which way the art faces: jets and bombers point left, the helicopter and the blimp right
    const facesRight = kind === "heli" || kind === "blimp";
    spr.setFlipX(fromLeft ? !facesRight : facesRight);
    let light: Phaser.GameObjects.Triangle | undefined;
    if (kind === "heli") light = sc.add.triangle(x, y + 16, 0, 0, -50, 230, 50, 230, 0xffffcc, 0.12).setOrigin(0, 0).setDepth(D_LIGHT - 9).setBlendMode(Phaser.BlendModes.ADD);
    if (kind === "jet") synth.play("whistle");
    this.air.push({ spr, kind, vx: fromLeft ? speed : -speed, hit: false, falling: false, vy: 0, spin: 0, groundY: TOP + 30 + Math.random() * 200, nextSmoke: 0, targeted: false, nextBomb: sc.time.now + 800, light });
  }

  private fireRocket(lad: Lad, a: Air) {
    const sc = this.sc;
    a.targeted = true;
    const x0 = lad.spr.x;
    const y0 = lad.spr.y - 34;
    const ms = 650;
    const tx = a.spr.x + a.vx * (ms / 1000);
    const ty = a.spr.y;
    const line = RAID_ROCKET_SHOUTS.find((l) => l.s === lad.id);
    if (line && Math.random() < 0.7) this.bubble(lad.spr, line.t, "#ffd23f", true);
    // the launcher on the shoulder for a moment
    if (sc.textures.exists("kd_bazooka")) {
      const bz = sc.add.image(x0, y0 + 6, "kd_bazooka").setScale(0.9).setDepth(lad.spr.depth + 1).setAngle(Phaser.Math.RadToDeg(Math.atan2(ty - y0, tx - x0))).setFlipY(tx < x0);
      sc.time.delayedCall(900, () => bz.destroy());
    }
    synth.play("rocket");
    vfx(sc, "vfx_muzzle", x0, y0, { scale: 1.4, depth: D_LIGHT + 8, angle: Phaser.Math.RadToDeg(Math.atan2(ty - y0, tx - x0)) });
    const r = sc.textures.exists("fx_rocket") ? sc.add.image(x0, y0, "fx_rocket").setScale(1.2) : sc.add.image(x0, y0, "raid_dot").setScale(2);
    r.setDepth(D_LIGHT + 8).setRotation(Math.atan2(ty - y0, tx - x0));
    let nextTrail = 0;
    sc.tweens.add({
      targets: r,
      x: tx,
      y: ty,
      duration: ms,
      ease: "Quad.in",
      onUpdate: () => {
        if (sc.time.now > nextTrail) {
          nextTrail = sc.time.now + 55;
          vfx(sc, "vfx_smoke", r.x, r.y, { scale: 0.5, depth: D_LIGHT - 7, alpha: 0.7 });
        }
      },
      onComplete: () => {
        r.destroy();
        if (!a.spr.active) return;
        a.hit = true;
        a.falling = true;
        a.vy = -40;
        a.vx *= 0.5;
        a.spin = (a.vx > 0 ? 1 : -1) * (60 + Math.random() * 80);
        a.spr.setTint(0x553333);
        a.light?.destroy();
        a.light = undefined;
        this.explode(a.spr.x, a.spr.y, 1.4);
        vfx(sc, "vfx_shock", a.spr.x, a.spr.y, { scale: 2, depth: D_LIGHT + 9, add: true });
        if (Math.random() < 0.5) this.sc.time.delayedCall(400, () => this.bubble(lad.spr, Phaser.Utils.Array.GetRandom(["GOT HIM!", "SPLASH ONE!", "HA HA!", "DOWN IT GOES!"]), "#b6ff5a"));
      },
    });
  }

  // ------------------------------------------------------------------ ambience

  private ambient(time: number) {
    const sc = this.sc;
    if (this.phase === "leaving") return;
    if (time > this.nextSiren) {
      this.nextSiren = time + 9000;
      synth.play("alarm");
    }
    if (time > this.nextLightning) {
      this.nextLightning = time + 12000 + Math.random() * 14000;
      sc.cameras.main.flash(120, 200, 210, 255);
      sc.time.delayedCall(200, () => sc.cameras.main.flash(80, 160, 170, 255));
      synth.play(Math.random() < 0.5 ? "thunder_1" : "thunder_2");
    }
    if (time > this.nextTannoy && !this.busy && this.phase !== "escape") {
      this.nextTannoy = time + 22000 + Math.random() * 10000;
      const l = Phaser.Utils.Array.GetRandom(RAID_TANNOY);
      this.floatTannoy(l.t);
    }
    // burning buildings on screen blow up now and then
    if (time > this.nextAmbientBoom) {
      this.nextAmbientBoom = time + 600;
      const cx = sc.cameras.main.midPoint.x;
      for (const b of this.blds) {
        if (!b.burning || Math.abs(b.x - cx) > 600 || time < b.nextBoom) continue;
        b.nextBoom = time + 5000 + Math.random() * 9000;
        if (b.img.tintTopLeft === 0x3a2828) continue;
        this.explode(b.x + (Math.random() - 0.5) * b.w * 0.6, GROUND - 40 - Math.random() * 150, 0.9 + Math.random() * 0.6, 0, Math.random() < 0.5);
        break;
      }
      // during the escape, the whole Strip is going up
      if (this.phase === "escape" && Math.random() < 0.35) this.explode(cx + (Math.random() - 0.3) * 700, TOP + Math.random() * 230, 0.8 + Math.random() * 0.8);
    }
  }

  private floatTannoy(text: string) {
    const t = this.sc.add.text(480, 205, `📢 ${text}`, { fontFamily: FONT, fontSize: "13px", color: "#ffe27a", backgroundColor: "#1a0000cc", padding: { x: 8, y: 4 }, wordWrap: { width: 760 }, align: "center" }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D_HUD);
    this.sc.tweens.add({ targets: t, alpha: 0, delay: 5000, duration: 600, onComplete: () => t.destroy() });
  }

  private cull() {
    const cx = this.sc.cameras.main.midPoint.x;
    const near = (x: number, r = 700) => Math.abs(x - cx) < r;
    for (const f of this.fires) {
      const v = near(f.spr.x);
      if (v !== f.spr.visible) {
        f.spr.setVisible(v);
        if (v) f.spr.anims.resume();
        else f.spr.anims.pause();
      }
    }
    for (const n of this.npcs) if (n.state !== "dead" && n.spr.active) n.spr.setVisible(near(n.spr.x, 800));
    for (const a of this.ash) a.setVisible(near(a.x));
  }

  // ------------------------------------------------------------------ bubbles and text

  private bubble(spr: Phaser.GameObjects.Sprite, text: string, bg = "#ffffff", important = false) {
    if (!text) return;
    if (this.bubbles.length >= MAX_BUBBLES) {
      if (!important) return;
      const old = this.bubbles.shift();
      old?.t.destroy();
    }
    const t = this.sc.add.text(spr.x, spr.y - 48, text, { fontFamily: FONT, fontSize: "11px", color: "#050505", backgroundColor: bg, padding: { x: 5, y: 3 }, wordWrap: { width: 190 }, align: "center" }).setOrigin(0.5, 1).setDepth(D_BUBBLE);
    this.bubbles.push({ t, follow: spr, until: this.sc.time.now + 2200 });
  }

  private updateBubbles(time: number) {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (time > b.until) {
        b.t.destroy();
        this.bubbles.splice(i, 1);
        continue;
      }
      if (b.follow?.active) b.t.setPosition(b.follow.x, b.follow.y - 48);
    }
  }

  private floatText(x: number, y: number, text: string, color: string) {
    const t = this.sc.add.text(x, y, text, { fontFamily: FONT, fontSize: "14px", color, fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(D_BUBBLE);
    this.sc.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
  }
}

