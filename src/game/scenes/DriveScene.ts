import Phaser from "phaser";
import { playerKey } from "../gfx/sanmikForm";
import { vfx } from "../gfx/Vfx";
import { G } from "../G";
import { synth } from "../audio/Synth";
import { DialogueBox } from "../ui/DialogueBox";
import { FONT, title } from "../ui/theme";
import { runChain, switchTo, fadeThen } from "../Flow";
import { dir, gabor, say } from "../../content/dsl";
import { damageMult } from "../systems/stats";
import { TOUCH } from "../ui/TouchControls";

type FoeKind = "cop" | "swat" | "heli" | "spikes" | "tank" | "ramp";
type Foe = {
  kind: FoeKind;
  spr: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  nextShot: number;
  tx: number;
  ty: number;
  dead: boolean;
  hit?: boolean;
  light?: Phaser.GameObjects.Triangle;
  siren?: Phaser.GameObjects.Arc;
  bar?: Phaser.GameObjects.Rectangle;
};
type Bullet = { spr: Phaser.GameObjects.Shape; vx: number; vy: number; mine: boolean; dmg: number; life: number; rocket?: boolean };

const ROAD_Y = 450;
const TRUCK_X = 400;
const LENGTH = 85; // seconds of chase before the drawbridge

const LYRICS: [number, string][] = [
  [1, "🎤 HIGH SPEED CAR CHASE, SPRAY ME WITH MACE"],
  [10, "🎤 YOU'RE A DISGRACE, HIGH SPEED CAR RACE"],
  [20, "🎤 FIFTEEN COP CARS ON MY TAIL"],
  [31, "🎤 IF THEY ARREST ME I WON'T GET BAIL"],
  [43, "🎤 GOT A HELICOPTER AND A TANK"],
  [55, "🎤 CAUSE I FUCKING ROBBED THIS BANK"],
  [67, "🎤 IT'S POINTING ITS TURRET AT US"],
  [78, "🎤 THERE'S A DRAWBRIDGE ABOUT TO LIFT"],
];

/**
 * NIGHT OF FREEDOM. SanMik drives (and does the jumps), SanChz rides in the back, you're on the guns: an endless
 * machine gun (hold the mouse / your finger) and rockets (right-click, Space, F or the ROCKET button). Hordes of
 * cop cars, SWAT vans, helicopters and tanks, then a drawbridge going up.
 */
export class DriveScene extends Phaser.Scene {
  private box!: DialogueBox;
  private chain: string[] = [];
  private resume: { dungeon: string; room: number } | null = null;
  private startData: any;
  private road!: Phaser.GameObjects.TileSprite;
  private far!: Phaser.GameObjects.TileSprite;
  private near!: Phaser.GameObjects.TileSprite;
  private lines!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private truck!: Phaser.GameObjects.Container;
  private me!: Phaser.GameObjects.Sprite;
  private gun!: Phaser.GameObjects.Rectangle;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
  private copGlowL!: Phaser.GameObjects.Rectangle;
  private copGlowR!: Phaser.GameObjects.Rectangle;
  private foes: Foe[] = [];
  private bullets: Bullet[] = [];
  private lamps: Phaser.GameObjects.Container[] = [];
  private hp = 100;
  private t = 0;
  private running = false;
  private ended = false;
  private jumpV = 0;
  private jumpY = 0;
  private nextShot = 0;
  private nextRocket = 0;
  private nextSpawn = 0;
  private nextBark = 0;
  private nextChz = 0;
  private nextRamp = 0;
  private sloppy = 0;
  private lyric = 0;
  private kills = 0;
  private streak = 0;
  private streakUntil = 0;
  private maceUntil = 0;
  private mace!: Phaser.GameObjects.Rectangle;
  private bridgeStarted = false;
  /** Playing as Mikey you're SanMik, on the guns: Gabor the Goat takes the wheel (and SanMik's lines). */
  private get gaborDrives() {
    return G.s.player === "MIKEY";
  }
  private get driver() {
    return this.gaborDrives ? "GABOR THE GOAT" : "SANMIK";
  }
  private scroll = 0;

  constructor() {
    super("Drive");
  }

  create(data: { chain?: string[]; resume?: { dungeon: string; room: number } }) {
    this.startData = data;
    this.chain = data.chain ?? [];
    this.resume = data.resume ?? null;
    this.foes = [];
    this.bullets = [];
    this.lamps = [];
    this.hp = 100;
    this.t = 0;
    this.running = false;
    this.ended = false;
    this.jumpV = 0;
    this.jumpY = 0;
    this.sloppy = 0;
    this.lyric = 0;
    this.kills = 0;
    this.streak = 0;
    this.bridgeStarted = false;
    this.scroll = 0;
    this.nextRamp = 0;
    this.cameras.main.fadeIn(300);
    G.s.phase = "dungeon";
    this.makeSkyline();
    // sky, stars, moon, then the city in two layers
    const sky = this.add.graphics().setDepth(-40);
    sky.fillGradientStyle(0x050816, 0x050816, 0x2a0f45, 0x2a0f45, 1).fillRect(0, 0, 960, 540);
    for (let i = 0; i < 70; i++) sky.fillStyle(0xffffff, Math.random() * 0.8).fillRect(Math.random() * 960, Math.random() * 260, 2, 2);
    this.add.circle(800, 80, 34, 0xfef3c7).setDepth(-39);
    this.add.circle(788, 72, 34, 0x0b1026, 0.18).setDepth(-39);
    this.far = this.add.tileSprite(0, 150, 960, 300, "nf_far").setOrigin(0).setDepth(-30);
    this.near = this.add.tileSprite(0, 210, 960, 260, "nf_near").setOrigin(0).setDepth(-25);
    // the road
    this.add.rectangle(0, ROAD_Y + 20, 960, 140, 0x1f2937).setOrigin(0).setDepth(-8);
    this.road = this.add.tileSprite(0, ROAD_Y + 28, 960, 90, "tile_industrial").setOrigin(0).setDepth(-5).setTint(0x3a3a48);
    this.lines = this.add.graphics().setDepth(-4);
    this.fx = this.add.graphics().setDepth(55);
    this.add.rectangle(0, ROAD_Y + 26, 960, 4, 0xfacc15, 0.7).setOrigin(0).setDepth(-4);
    // street lamps whizzing past
    for (let i = 0; i < 4; i++) {
      const c = this.add.container(i * 300, 0).setDepth(-3);
      c.add(this.add.rectangle(0, ROAD_Y + 24, 8, 300, 0x111827).setOrigin(0.5, 1));
      c.add(this.add.rectangle(14, ROAD_Y - 270, 36, 8, 0x111827));
      c.add(this.add.circle(30, ROAD_Y - 264, 9, 0xfde68a));
      c.add(this.add.triangle(30, ROAD_Y - 264, 0, 0, -60, 290, 60, 290, 0xfde68a, 0.08).setOrigin(0.5, 0));
      this.lamps.push(c);
    }
    // the truck: SanMik at the wheel, SanChz and you in the back, Gabor somewhere
    this.truck = this.add.container(TRUCK_X, ROAD_Y).setDepth(20);
    const truckImg = this.textures.exists("p_truck") ? this.add.image(0, 0, "p_truck").setScale(2.2).setOrigin(0.5, 0.75) : this.add.rectangle(0, 0, 240, 70, 0xe5e7eb);
    // playing as Mikey you're SanMik (on the guns): Gabor the Goat is at the wheel instead
    const mik = this.gaborDrives
      ? this.textures.exists("p_gabor")
        ? this.add.image(70, -60, "p_gabor").setScale(0.62)
        : this.add.circle(70, -60, 14, 0xffffff)
      : this.add.sprite(70, -62, this.textures.exists("spr_SANMIK") ? "spr_SANMIK" : "spr_MIKEY", 0).setScale(1.6);
    if (this.gaborDrives) this.tweens.add({ targets: mik, angle: { from: -5, to: 5 }, yoyo: true, repeat: -1, duration: 260 });
    const chz = this.add.sprite(-80, -66, this.textures.exists("spr_SANCHZ") ? "spr_SANCHZ" : "spr_POLSON", 0).setScale(1.9);
    this.me = this.add.sprite(-30, -70, playerKey(this), 0).setScale(1.9);
    this.gun = this.add.rectangle(-30, -84, 44, 9, 0x374151).setOrigin(0.1, 0.5).setStrokeStyle(2, 0x111827);
    const goat = this.gaborDrives ? this.add.container(0, 0) : this.textures.exists("p_gabor") ? this.add.image(-118, -46, "p_gabor").setScale(0.55) : this.add.circle(-118, -46, 12, 0xffffff);
    const head = this.add.triangle(130, -8, 0, 0, 280, -50, 280, 50, 0xfef9c3, 0.14).setOrigin(0, 0.5);
    this.truck.add([head, chz, this.me, goat, mik, truckImg, this.gun]);
    this.tweens.add({ targets: truckImg, y: -2, yoyo: true, repeat: -1, duration: 90 });
    // police lights glowing in from behind
    this.copGlowL = this.add.rectangle(0, 0, 260, 540, 0xef4444, 0).setOrigin(0).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
    this.copGlowR = this.add.rectangle(0, 0, 260, 540, 0x3b82f6, 0).setOrigin(0).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
    this.mace = this.add.rectangle(480, 270, 960, 540, 0x9acd32, 0).setDepth(300);
    title(this, 480, 26, "NIGHT OF FREEDOM", 22, "#ffd23f").setDepth(400);
    this.hud = this.add.text(480, 54, "", { fontFamily: FONT, fontSize: "14px", color: "#ffffff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(400);
    this.banner = this.add.text(480, 96, "", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ff6bb0", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(400);
    this.streakText = this.add.text(940, 140, "", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#fde047", stroke: "#000", strokeThickness: 6 }).setOrigin(1, 0.5).setDepth(400);
    // touch buttons
    const mkBtn = (x: number, label: string, fn: () => void) => {
      const b = this.add.circle(x, 470, 38, 0x000000, 0.45).setStrokeStyle(3, 0xffffff, 0.8).setDepth(450).setInteractive();
      this.add.text(x, 470, label, { fontFamily: FONT, fontSize: "13px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5).setDepth(451);
      b.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        fn();
      });
    };
    if (TOUCH.enabled || this.sys.game.device.input.touch) {
      mkBtn(60, "ROCKET", () => this.fireRocket());
      mkBtn(900, "SLOPPY", () => this.sloppySurprise());
    }
    this.input.mouse?.disableContextMenu();
    this.input.keyboard!.addCapture("SPACE");
    this.input.keyboard!.on("keydown-SPACE", () => this.fireRocket());
    this.input.keyboard!.on("keydown-F", () => this.fireRocket());
    this.input.keyboard!.on("keydown-R", () => this.sloppySurprise());
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.fireRocket();
    });
    this.box = new DialogueBox(this, 1000, 0.3);
    // the song starts straight away, under the getaway
    synth.music("night_of_freedom", true);
    this.box
      .play([
        dir("The Bank of Catford, 2am. Alarms. Smoke. A pickup truck mounts the pavement outside with its hazards on."),
        say(this.driver, "YEEE! We went and robbed a bank like Jason Statham in Crank!"),
        say("SANCHZ", "A million pounds in stashed-up notes. YEGHHH."),
        say(this.driver, "And a goat. For some reason they kept a goat in that bank."),
        gabor("It was me. I asked them to lock me in the vault overnight. It was the best night of my life. Thank you for ruining it."),
        dir("Sirens. Lots of sirens. Fifteen sets of blue lights swing round the corner. Then a helicopter. Then another one. Then, somehow, a tank."),
        say(this.driver, "I'm driving. You're on the guns. Hold on to your bollocks. Let's have this night of freedom."),
        dir("HOW TO PLAY: SanMik drives and does the jumps. Hold the mouse (or your finger) to fire the machine gun: it never runs out. Right-click, Space or F (or ROCKET) fires a rocket. Kills fill SanMik's SLOPPY SURPRISE: press R / SLOPPY. Survive to the drawbridge.", { variants: { MIKEY: "HOW TO PLAY: Gabor drives and does the jumps (somehow). Hold the mouse (or your finger) to fire the machine gun: it never runs out. Right-click, Space or F (or ROCKET) fires a rocket. Kills fill your SLOPPY SURPRISE: press R / SLOPPY. Survive to the drawbridge." } }),
      ])
      .then(() => {
        this.running = true;
        this.nextSpawn = 0;
        this.nextRamp = this.time.now + 9000;
      });
  }

  /** Two seamless skyline layers, drawn once. */
  private makeSkyline() {
    const build = (key: string, w: number, h: number, base: number, lit: number, minH: number, maxH: number, signs: boolean) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      let x = 0;
      const rects: [number, number, number][] = [];
      while (x < w) {
        const bw = 50 + Math.floor(Math.random() * 90);
        const bh = minH + Math.floor(Math.random() * (maxH - minH));
        rects.push([x, bw, bh]);
        x += bw + Math.floor(Math.random() * 10);
      }
      // draw each building twice (once shifted a tile left) so the last one wraps without a seam
      for (const [bx, bw, bh] of rects) {
        const lights: [number, number, number][] = [];
        for (let wy = h - bh + 10; wy < h - 12; wy += 16) for (let wx = 8; wx < bw - 10; wx += 14) if (Math.random() < 0.38) lights.push([wx, wy, Math.random() < 0.8 ? lit : 0x67e8f9]);
        const sign = signs && Math.random() < 0.35 ? [0xff2bd6, 0x22d3ee, 0xfde047, 0xef4444][Math.floor(Math.random() * 4)] : 0;
        for (const off of [0, -w]) {
          const X = bx + off;
          g.fillStyle(base, 1).fillRect(X, h - bh, bw, bh);
          for (const [wx, wy, c] of lights) g.fillStyle(c, 0.85).fillRect(X + wx, wy, 7, 9);
          if (sign) g.fillStyle(sign, 0.9).fillRect(X + 6, h - 34, Math.min(bw - 12, 70), 16);
        }
      }
      g.generateTexture(key, w, h);
      g.destroy();
    };
    build("nf_far", 1024, 300, 0x1e1b4b, 0xfde68a, 120, 290, false);
    build("nf_near", 1024, 260, 0x0b0b1a, 0xfbbf24, 90, 230, true);
  }

  private gunTip() {
    const a = this.gun.rotation;
    const gx = this.truck.x + this.gun.x;
    const gy = this.truck.y + this.gun.y;
    return { x: gx + Math.cos(a) * 40, y: gy + Math.sin(a) * 40, a };
  }

  private spawn(kind: FoeKind) {
    let spr: Phaser.GameObjects.Image;
    let hp = 6;
    let tx = 0;
    let ty = ROAD_Y + 6;
    if (kind === "cop") {
      spr = this.add.image(-120, ROAD_Y + 10, this.textures.exists("p_copcar") ? "p_copcar" : "p_tank").setScale(2.1).setOrigin(0.5, 0.8);
      tx = Phaser.Math.Between(70, 280);
      hp = 7;
    } else if (kind === "swat") {
      spr = this.add.image(-140, ROAD_Y + 8, this.textures.exists("p_swatvan") ? "p_swatvan" : "p_tank").setScale(2.3).setOrigin(0.5, 0.8);
      tx = Phaser.Math.Between(60, 240);
      hp = 14;
    } else if (kind === "heli") {
      const fromRight = Math.random() < 0.4;
      spr = this.add.image(fromRight ? 1080 : -120, Phaser.Math.Between(90, 170), this.textures.exists("p_heli") ? "p_heli" : "p_plane").setScale(2.2).setFlipX(!fromRight);
      tx = Phaser.Math.Between(180, 820);
      ty = spr.y;
      hp = 15;
    } else if (kind === "tank") {
      spr = this.add.image(-220, ROAD_Y + 8, "p_tank").setScale(2.6).setOrigin(0.5, 0.8);
      tx = Phaser.Math.Between(90, 180);
      hp = 55;
    } else if (kind === "ramp") {
      // a wrecked cop car on its roof with a plank against it: SanMik goes for it
      const c = this.add.container(1040, ROAD_Y + 20);
      c.add(this.add.triangle(0, 0, -70, 10, 40, -46, 40, 10, 0x8b5a2b).setStrokeStyle(3, 0x3f2a14));
      if (this.textures.exists("p_copcar")) c.add(this.add.image(70, -6, "p_copcar").setScale(1.6).setFlipY(true).setTint(0x777777));
      spr = c as unknown as Phaser.GameObjects.Image;
      tx = -300;
      hp = 999;
    } else {
      // a police stinger across the road
      spr = this.add.rectangle(1020, ROAD_Y + 22, 110, 10, 0x111827).setStrokeStyle(3, 0xe5e7eb) as unknown as Phaser.GameObjects.Image;
      tx = -200;
      hp = 999;
    }
    spr.setDepth(kind === "heli" ? 30 : kind === "spikes" || kind === "ramp" ? 15 : 18);
    const f: Foe = { kind, spr, hp, maxHp: hp, nextShot: this.time.now + 1200 + Math.random() * 800, tx, ty, dead: false };
    if (kind === "heli") f.light = this.add.triangle(spr.x, spr.y, 0, 0, -70, 330, 70, 330, 0xffffff, 0.12).setOrigin(0.5, 0).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    if (kind === "cop" || kind === "swat") f.siren = this.add.circle(spr.x, spr.y - 40, 6, 0xef4444).setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
    if (kind === "tank" || kind === "heli" || kind === "swat") f.bar = this.add.rectangle(spr.x, spr.y - 60, 60, 5, 0xef4444).setDepth(31);
    this.foes.push(f);
  }

  private hurtTruck(n: number, why?: string) {
    if (this.ended) return;
    this.hp = Math.max(0, this.hp - n);
    this.cameras.main.shake(120, 0.006);
    synth.play("hurt");
    if (why) this.pop(this.truck.x, this.truck.y - 130, why, "#ef4444", 16);
    if (this.hp <= 0) this.crash();
  }

  private pop(x: number, y: number, t: string, color = "#ffffff", size = 16) {
    const tx = this.add.text(x, y, t, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(350);
    this.tweens.add({ targets: tx, y: y - 36, alpha: 0, duration: 1000, onComplete: () => tx.destroy() });
  }

  private explode(x: number, y: number, big = false) {
    synth.play("explode");
    // drawn explosion (PixelLab VFX); the shapes below are the fallback
    if (vfx(this, big ? "vfx_bigboom" : "vfx_boom", x, y, { scale: big ? 1.6 : 1.1, depth: 60 })) {
      vfx(this, "vfx_smoke", x - 30, y - 20, { scale: big ? 1.6 : 1, depth: 58, delay: 300 });
      this.cameras.main.shake(big ? 320 : 140, big ? 0.016 : 0.007);
      return;
    }
    for (let i = 0; i < (big ? 4 : 2); i++) {
      const c = this.add.circle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 30, 10, i % 2 ? 0xfde047 : 0xf97316, 0.95).setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: c, radius: big ? 100 : 60, alpha: 0, duration: 450 + i * 120, onComplete: () => c.destroy() });
    }
    // smoke and flying debris
    for (let i = 0; i < (big ? 10 : 5); i++) {
      const sm = this.add.circle(x, y, 8 + Math.random() * 10, 0x374151, 0.7).setDepth(58);
      this.tweens.add({ targets: sm, x: x - 80 - Math.random() * 120, y: y - 40 - Math.random() * 80, radius: 30, alpha: 0, duration: 900 + Math.random() * 600, onComplete: () => sm.destroy() });
      const d = this.add.rectangle(x, y, 6, 4, Math.random() < 0.5 ? 0x9ca3af : 0x1f2937).setDepth(61);
      const vx = (Math.random() - 0.5) * 500;
      const st = { t: 0 };
      this.tweens.add({ targets: st, t: 1, duration: 800, onUpdate: () => d.setPosition(x + vx * st.t - 200 * st.t, y - 260 * st.t + 420 * st.t * st.t).setAngle(st.t * 720), onComplete: () => d.destroy() });
    }
    this.cameras.main.shake(big ? 320 : 140, big ? 0.016 : 0.007);
  }

  private killFoe(f: Foe) {
    if (f.dead) return;
    f.dead = true;
    f.light?.destroy();
    f.siren?.destroy();
    f.bar?.destroy();
    this.explode(f.spr.x, f.spr.y - 20, f.kind === "tank" || f.kind === "heli");
    if (f.kind === "heli") {
      // spins down in flames
      this.tweens.add({ targets: f.spr, y: ROAD_Y + 10, angle: 540, x: f.spr.x - 200, duration: 1100, ease: "Quad.in", onComplete: () => { this.explode(f.spr.x, ROAD_Y, true); f.spr.destroy(); } });
    } else {
      // flips into the air and off the back of the screen
      this.tweens.add({ targets: f.spr, x: f.spr.x - 360, y: f.spr.y - 120, angle: -200, duration: 500, ease: "Quad.out", onComplete: () => this.tweens.add({ targets: f.spr, y: ROAD_Y + 30, alpha: 0, duration: 400, onComplete: () => f.spr.destroy() }) });
    }
    this.kills++;
    this.streak = this.time.now < this.streakUntil ? this.streak + 1 : 1;
    this.streakUntil = this.time.now + 2200;
    if (this.streak >= 2) {
      this.streakText.setText(`${this.streak}x STREAK!`).setScale(1.4).setAlpha(1);
      this.tweens.add({ targets: this.streakText, scale: 1, duration: 200 });
    }
    if (this.kills % 8 === 0) {
      this.hp = Math.min(100, this.hp + 12);
      this.pop(this.truck.x, this.truck.y - 150, "+12 TRUCK (gaffer tape)", "#86efac", 14);
    }
    this.sloppy = Math.min(100, this.sloppy + (f.kind === "cop" ? 12 : 22));
    G.s.coins += f.kind === "cop" ? 3 : 7;
    if (Math.random() < 0.4) this.bark(f.kind === "heli" ? "SANMIK" : undefined);
  }

  private bark(who?: "SANMIK" | "SANCHZ", text?: string) {
    const w = who ?? (Math.random() < 0.6 ? "SANMIK" : "SANCHZ");
    // playing as Mikey, "SANMIK" here is the driver's seat: Gabor's. (His SLOPPY SURPRISE is yours.)
    if (this.gaborDrives && w === "SANMIK" && text === "SLOPPY SURPRISE!!") {
      this.pop(this.truck.x - 30, this.truck.y - 130, text, "#b0c4ff", 15);
      synth.shout("yee", 0.85);
      return;
    }
    const mik = ["YEEEE!", "SanMik is here, I don't give a fuck!", "Away from the feds, away from the scum!", "Fifteen cop cars on my tail!", "Yee yee! Brap brap!", "Turn on your fucking TV!", "Channel U, baby!", "HOLD ON!", "Shoot the chopper, blud!"];
    const chz = ["YEGHHHH!", "Mork.", "Big up the getaway!", "That's great for the core", "YEGH YEGH", "MORE ROCKETS!"];
    const list = w === "SANMIK" ? mik : chz;
    const t = text ?? list[Math.floor(Math.random() * list.length)];
    this.pop(this.truck.x + (w === "SANMIK" ? 70 : -80), this.truck.y - 120, t, w === "SANMIK" ? (this.gaborDrives ? "#f5f5f4" : "#b0c4ff") : "#ffe08a", 15);
    if (!(this.gaborDrives && w === "SANMIK")) synth.shout(w === "SANMIK" ? "yee" : "yegh", 0.85);
  }

  private fireRocket() {
    if (!this.running || this.ended || this.box.active || this.time.now < this.nextRocket) return;
    this.nextRocket = this.time.now + 650;
    const tip = this.gunTip();
    const r = this.add.rectangle(tip.x, tip.y, 20, 7, 0xef4444).setStrokeStyle(2, 0xfde047).setDepth(42).setRotation(tip.a);
    this.bullets.push({ spr: r, vx: Math.cos(tip.a) * 0.75, vy: Math.sin(tip.a) * 0.75, mine: true, dmg: 14 * damageMult(G.s), life: 1600, rocket: true });
    synth.play("lob");
    this.cameras.main.shake(80, 0.004);
  }

  private rocketBoom(x: number, y: number, dmg: number) {
    this.explode(x, y, false);
    for (const f of this.foes) {
      if (f.dead || f.kind === "spikes" || f.kind === "ramp") continue;
      if (Phaser.Math.Distance.Between(f.spr.x, f.spr.y - 30, x, y) < 100) this.damageFoe(f, dmg);
    }
  }

  private damageFoe(f: Foe, n: number) {
    if (f.dead) return;
    f.hp -= n;
    f.spr.setTintFill(0xffffff);
    this.time.delayedCall(50, () => f.spr.active && f.spr.clearTint());
    if (f.hp <= 0) this.killFoe(f);
  }

  private sloppySurprise() {
    if (!this.running || this.ended || this.box.active) return;
    if (this.sloppy < 100) {
      this.pop(this.truck.x, this.truck.y - 150, `SLOPPY SURPRISE ${Math.floor(this.sloppy)}%`, "#a3e635", 14);
      return;
    }
    this.sloppy = 0;
    this.bark("SANMIK", "SLOPPY SURPRISE!!");
    this.time.delayedCall(200, () => synth.shout("yee", 1));
    this.time.delayedCall(400, () => synth.shout("yee", 1));
    const slop = this.add.rectangle(480, 270, 960, 540, 0xa3e635, 0.55).setDepth(250);
    this.tweens.add({ targets: slop, alpha: 0, duration: 900, onComplete: () => slop.destroy() });
    for (const f of this.foes) if (!f.dead && f.kind !== "spikes" && f.kind !== "ramp" && f.kind !== "tank") this.killFoe(f);
    for (const f of this.foes) if (!f.dead && f.kind === "tank") this.damageFoe(f, 25);
    for (const b of this.bullets) if (!b.mine) b.life = 0;
  }

  private crash() {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    this.explode(this.truck.x, this.truck.y - 30, true);
    this.box.play([dir("The truck spins out and stops against a bollard. The feds pile out. SanMik winds down his window.", { variants: { MIKEY: "The truck spins out and stops against a bollard. The feds pile out. Gabor winds down his window with his teeth." } }), say(this.driver, "Officer. I'll be honest with you. That's illegal. I wrote the law."), dir("…Somehow, it works. Try that again.")]).then(() => {
      this.cameras.main.fadeOut(300);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart(this.startData));
    });
  }

  /** The drawbridge: it's lifting, the tank fires, shift into the highest gear. */
  private async drawbridge() {
    this.bridgeStarted = true;
    this.running = false;
    for (const f of this.foes) if (!f.dead && f.kind !== "tank") {
      f.dead = true;
      f.light?.destroy();
      f.siren?.destroy();
      f.bar?.destroy();
      this.tweens.add({ targets: f.spr, x: f.spr.x - 500, alpha: 0, duration: 900, onComplete: () => f.spr.destroy() });
    }
    if (!this.foes.some((f) => f.kind === "tank" && !f.dead)) this.spawn("tank");
    // the bridge ahead
    const bx = 1100;
    const left = this.add.rectangle(bx, ROAD_Y + 26, 260, 26, 0x6b4f2a).setOrigin(0, 0.5).setDepth(10).setStrokeStyle(3, 0x2a1d0f);
    const right = this.add.rectangle(bx + 520, ROAD_Y + 26, 260, 26, 0x6b4f2a).setOrigin(1, 0.5).setDepth(10).setStrokeStyle(3, 0x2a1d0f);
    await this.box.play([say(this.driver, "There's a drawbridge about to lift."), say(this.driver, "Into the highest gear I shift."), dir("MASH (tap / Space) to shift into the highest gear!")]);
    this.tweens.add({ targets: [left, right], x: `-=${bx - 520}`, duration: 2600 });
    this.tweens.add({ targets: left, angle: -24, delay: 1200, duration: 1400 });
    this.tweens.add({ targets: right, angle: 24, delay: 1200, duration: 1400 });
    let gear = 0;
    const g = this.add.text(480, 180, "GEAR 1", { fontFamily: "Impact, sans-serif", fontSize: "40px", color: "#fde047", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setDepth(400);
    await new Promise<void>((resolve) => {
      const tap = () => {
        gear++;
        g.setText(gear >= 12 ? "HIGHEST GEAR!!" : `GEAR ${1 + Math.floor(gear / 2)}`);
        synth.play(gear % 2 ? "select" : "hit");
        this.scroll += 8;
      };
      this.input.on("pointerdown", tap);
      this.input.keyboard!.on("keydown-SPACE", tap);
      this.time.delayedCall(2600, () => {
        this.input.off("pointerdown", tap);
        this.input.keyboard!.off("keydown-SPACE", tap);
        resolve();
      });
    });
    g.destroy();
    // the tank fires
    const tank = this.foes.find((f) => f.kind === "tank" && !f.dead);
    if (tank) {
      this.pop(tank.spr.x + 40, tank.spr.y - 80, "IT'S ABOUT TO FIRE A FUCKING ROCKET", "#ef4444", 16);
      const rocket = this.add.rectangle(tank.spr.x + 60, tank.spr.y - 40, 26, 8, 0xef4444).setDepth(40);
      this.tweens.add({ targets: rocket, x: this.truck.x + 100, y: this.truck.y - 40, duration: 900, ease: "Quad.in", onComplete: () => rocket.destroy() });
    }
    // the jump
    synth.play("dodge");
    this.banner.setText("🎤 TRUCK FLIES UP, LANDS IN THE ROAD");
    await new Promise<void>((resolve) => this.tweens.add({ targets: this.truck, y: ROAD_Y - 220, angle: -12, duration: 700, ease: "Quad.out", yoyo: true, onYoyo: () => this.truck.setAngle(10), onComplete: () => resolve() }));
    this.truck.setAngle(0);
    this.explode(this.truck.x - 200, ROAD_Y - 10, true);
    this.explode(this.truck.x - 120, ROAD_Y - 40, true);
    this.banner.setText("🎤 AS THE TANK'S ROCKETS EXPLODE");
    if (tank) {
      tank.bar?.destroy();
      this.tweens.add({ targets: tank.spr, x: tank.spr.x - 500, alpha: 0, duration: 800 });
    }
    this.cameras.main.flash(300, 255, 200, 120);
    await this.box.play([
      say(this.driver, "We jumped the drawbridge! We lost the fucking damn police! YEEEEEE!"),
      say("SANCHZ", "YEGHHHHHHH."),
      gabor("I fell out twice. Can we do it again? Please no. Please yes."),
      say(this.driver, "Let's have this night of freedom. Let's have this night of love."),
      say(this.driver, "And all you pricks who doubted me, turn on your fucking TV. Put it onto Channel U. You'll see me say FUCK YOU."),
      dir(`${this.kills} police vehicles destroyed. The truck screeches into a warehouse car park on the edge of the estate. The ground is shaking. Not from the police. From the bass.`),
      say(this.driver, "Yee. The Nu Warehouse. Where it all began. We can't fix the hot tub sober, blud. Nobody's ever fixed a hot tub sober."),
    ]);
    this.finish();
  }

  private finish() {
    this.ended = true;
    G.s.flags.sm_drive_done = true;
    G.save();
    fadeThen(this, 250, () => {
      if (this.resume) runChain(this, this.chain, this.resume);
      else switchTo(this, "Hub", { at: "PUB" });
    });
  }

  /** SanMik's driving: hop the stingers, launch off the ramps. */
  private autoJump(big: boolean) {
    if (this.jumpY < 0) return;
    this.jumpV = big ? -1.45 : -0.95;
    synth.play("dodge");
    if (big) {
      this.bark("SANMIK", Math.random() < 0.5 ? "HOLD ON TO YOUR BOLLOCKS!" : "YEEEEEEE!");
      this.pop(this.truck.x, this.truck.y - 180, "AIRTIME!", "#fde047", 22);
    }
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50);
    const now = this.time.now;
    const spd = this.bridgeStarted ? 0.6 : 1;
    this.scroll += dt * 0.9 * spd;
    this.far.tilePositionX = this.scroll * 0.08;
    this.near.tilePositionX = this.scroll * 0.25;
    this.road.tilePositionX = this.scroll;
    this.lines.clear();
    this.lines.fillStyle(0xffffff, 0.8);
    for (let x = -(this.scroll % 120); x < 960; x += 120) this.lines.fillRect(x, ROAD_Y + 70, 60, 5);
    for (let i = 0; i < this.lamps.length; i++) this.lamps[i].setX((((i * 300 - this.scroll * 0.9) % 1200) + 1200) % 1200 - 120);
    // speed lines
    this.fx.clear();
    if (this.running) {
      this.fx.lineStyle(2, 0xffffff, 0.15);
      for (let i = 0; i < 8; i++) {
        const y = 200 + ((i * 53 + now * 0.07) % 300);
        const x = 960 - ((now * 1.4 + i * 211) % 1100);
        this.fx.lineBetween(x, y, x + 90, y);
      }
    }
    // jump physics
    if (this.jumpV !== 0 || this.jumpY < 0) {
      this.jumpY += this.jumpV * dt;
      this.jumpV += dt * 0.0042;
      if (this.jumpY >= 0) {
        const hard = this.jumpV > 1.2;
        this.jumpY = 0;
        this.jumpV = 0;
        // landing: sparks
        for (let i = 0; i < (hard ? 14 : 6); i++) {
          const sp = this.add.rectangle(this.truck.x + (Math.random() - 0.5) * 160, ROAD_Y + 20, 3, 3, 0xfde047).setDepth(25);
          this.tweens.add({ targets: sp, x: sp.x - 80 - Math.random() * 100, y: sp.y - 20 - Math.random() * 30, alpha: 0, duration: 400, onComplete: () => sp.destroy() });
        }
        if (hard) this.cameras.main.shake(200, 0.01);
      }
    }
    if (!this.bridgeStarted) {
      this.truck.y = ROAD_Y + this.jumpY;
      this.truck.setAngle(this.jumpY < -5 ? Phaser.Math.Clamp(this.jumpV * 8, -10, 10) : 0);
    }
    this.mace.setAlpha(now < this.maceUntil ? 0.45 : 0);
    // police lights: brighter the more of them there are
    const cops = this.foes.filter((f) => !f.dead && (f.kind === "cop" || f.kind === "swat")).length;
    const flash = Math.floor(now / 160) % 2;
    const lvl = Math.min(0.28, cops * 0.05);
    this.copGlowL.setAlpha(flash ? lvl : 0);
    this.copGlowR.setAlpha(flash ? 0 : lvl);
    if (now > this.streakUntil) this.streakText.setAlpha(Math.max(0, this.streakText.alpha - dt / 400));
    if (!this.running || this.ended || this.box.active) {
      this.hud.setText("");
      return;
    }
    this.t += dt / 1000;
    // lyrics
    if (this.lyric < LYRICS.length && this.t >= LYRICS[this.lyric][0]) {
      this.banner.setText(LYRICS[this.lyric][1]);
      this.lyric++;
    }
    if (this.t >= LENGTH) {
      void this.drawbridge();
      return;
    }
    // spawning: hordes, ramping up
    if (now >= this.nextSpawn) {
      const live = this.foes.filter((f) => !f.dead && f.kind !== "spikes" && f.kind !== "ramp").length;
      const cap = Math.min(6, 3 + Math.floor(this.t / 18));
      const helis = this.foes.filter((f) => f.kind === "heli" && !f.dead).length;
      const tanks = this.foes.filter((f) => f.kind === "tank" && !f.dead).length;
      for (let k = 0; k < (this.t > 30 ? 2 : 1) && live + k < cap; k++) {
        const r = Math.random();
        if (this.t > 20 && r < 0.22 && helis < (this.t > 55 ? 2 : 1)) this.spawn("heli");
        else if (this.t > 45 && r < 0.3 && tanks < 1) {
          this.spawn("tank");
          this.bark("SANMIK", "Look at that tank! It's pointing its turret at us!");
        } else if (this.t > 10 && r < 0.55) this.spawn("swat");
        else this.spawn("cop");
      }
      if (Math.random() < 0.3) this.spawn("spikes");
      this.nextSpawn = now + Math.max(1150, 2000 - this.t * 12);
    }
    if (now >= this.nextRamp) {
      this.spawn("ramp");
      this.nextRamp = now + 11000 + Math.random() * 5000;
    }
    // aiming the gun
    const ptr = this.input.activePointer;
    const gx = this.truck.x + this.gun.x;
    const gy = this.truck.y + this.gun.y;
    let aimX = ptr.worldX;
    let aimY = ptr.worldY;
    if (ptr.wasTouch) {
      const target = this.foes.filter((f) => !f.dead && f.kind !== "spikes" && f.kind !== "ramp").sort((a, b) => Math.abs(a.spr.x - gx) - Math.abs(b.spr.x - gx))[0];
      if (target) {
        aimX = target.spr.x;
        aimY = target.spr.y - 30;
      }
    }
    const aim = Math.atan2(aimY - gy, aimX - gx) - this.truck.rotation;
    this.gun.setRotation(aim).setScale(1, Math.cos(aim) < 0 ? -1 : 1);
    this.me.setFlipX(Math.cos(aim) < 0);
    // the machine gun: never runs out
    if (ptr.isDown && !ptr.rightButtonDown() && now >= this.nextShot && !(ptr.y > 420 && (ptr.x < 110 || ptr.x > 850))) {
      this.nextShot = now + 70;
      const tip = this.gunTip();
      const a = aim + (Math.random() - 0.5) * 0.07;
      const b = this.add.rectangle(tip.x, tip.y, 16, 3, 0xfde047).setDepth(40).setRotation(a).setBlendMode(Phaser.BlendModes.ADD);
      this.bullets.push({ spr: b, vx: Math.cos(a) * 1.3, vy: Math.sin(a) * 1.3, mine: true, dmg: 1.05 * damageMult(G.s), life: 900 });
      if (!vfx(this, "vfx_muzzle", tip.x, tip.y, { angle: Phaser.Math.RadToDeg(a), scale: 0.8, depth: 41, add: true })) {
        const mf = this.add.circle(tip.x, tip.y, 7, 0xfff7ae, 0.9).setDepth(41).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: mf, alpha: 0, scale: 1.8, duration: 60, onComplete: () => mf.destroy() });
      }
      // brass
      const shell = this.add.rectangle(gx, gy, 3, 2, 0xfbbf24).setDepth(39);
      this.tweens.add({ targets: shell, x: gx - 20 - Math.random() * 20, y: gy + 60, angle: 360, alpha: 0, duration: 400, onComplete: () => shell.destroy() });
      if (Math.floor(now / 70) % 2 === 0) synth.play("shoot");
    }
    // SanChz lobs food at whatever's closest
    if (now >= this.nextChz) {
      const target = this.foes.filter((f) => !f.dead && f.kind !== "spikes" && f.kind !== "ramp").sort((a, b) => Math.abs(a.spr.x - TRUCK_X) - Math.abs(b.spr.x - TRUCK_X))[0];
      if (target) {
        const food = this.add.text(this.truck.x - 80, this.truck.y - 70, ["🍔", "🍩", "🍕"][Math.floor(Math.random() * 3)], { fontSize: "20px" }).setOrigin(0.5).setDepth(45);
        const sy = food.y;
        this.tweens.add({
          targets: food,
          x: target.spr.x,
          duration: 500,
          onUpdate: (tw) => food.setY(sy + (target.spr.y - 30 - sy) * tw.progress - Math.sin(tw.progress * Math.PI) * 90),
          onComplete: () => {
            food.destroy();
            if (!target.dead) {
              this.pop(target.spr.x, target.spr.y - 50, "FUDGED", "#ffe08a", 12);
              this.damageFoe(target, 2);
            }
          },
        });
      }
      this.nextChz = now + 1500;
    }
    if (now >= this.nextBark) {
      this.bark();
      this.nextBark = now + 3500 + Math.random() * 4000;
    }
    // foes
    for (const f of this.foes) {
      if (f.dead) continue;
      if (f.kind === "spikes" || f.kind === "ramp") {
        f.spr.x -= dt * 0.9 * spd;
        const ahead = f.spr.x - this.truck.x;
        if (f.kind === "spikes" && ahead > 60 && ahead < 190 && this.jumpY === 0) this.autoJump(false);
        if (f.kind === "ramp" && ahead > 40 && ahead < 120 && this.jumpY === 0) this.autoJump(true);
        if (f.kind === "spikes" && Math.abs(ahead) < 90 && this.jumpY > -30 && !f.hit) {
          f.hit = true;
          this.hurtTruck(14, "STINGER!");
        }
        if (f.spr.x < -200) {
          f.dead = true;
          f.spr.destroy();
        }
        continue;
      }
      // drive up into position and weave; some ram you
      f.spr.x += (f.tx + Math.sin(now / 700 + f.maxHp) * 40 - f.spr.x) * Math.min(1, dt / 600);
      if (f.kind === "heli") {
        f.spr.y = f.ty + Math.sin(now / 400 + f.tx) * 18;
        f.light?.setPosition(f.spr.x, f.spr.y + 10).setAngle(Math.sin(now / 900 + f.tx) * 25);
      }
      f.siren?.setPosition(f.spr.x - 4, f.spr.y - f.spr.displayHeight * 0.75).setFillStyle(Math.floor(now / 150 + f.tx) % 2 ? 0xef4444 : 0x3b82f6);
      f.bar?.setPosition(f.spr.x, f.spr.y - f.spr.displayHeight * (f.kind === "heli" ? 0.6 : 0.95)).setSize(Math.max(1, 60 * (f.hp / f.maxHp)), 5);
      if (f.kind === "cop" && f.spr.x > this.truck.x - 170 && !f.hit) {
        f.hit = true;
        this.hurtTruck(4, "RAMMED!");
        f.tx = Math.max(60, f.tx - 120);
      }
      if (now >= f.nextShot) {
        if (f.kind === "cop" && Math.random() < 0.2) {
          // spray me with mace
          this.maceUntil = now + 1100;
          this.pop(f.spr.x + 40, f.spr.y - 70, "MACE!", "#a3e635", 15);
          f.nextShot = now + 2800;
        } else if (f.kind === "cop" && Math.random() < 0.3) {
          // ram!
          f.tx = this.truck.x - 150;
          f.hit = false;
          f.nextShot = now + 3000;
        } else {
          const n = f.kind === "swat" ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const sx = f.spr.x + (f.kind === "heli" ? 0 : 30);
            const sy = f.spr.y - (f.kind === "heli" ? -10 : 40);
            const a = Math.atan2(this.truck.y - 60 - sy, this.truck.x - sx) + (i - (n - 1) / 2) * 0.12;
            const big = f.kind === "tank";
            const b = this.add.circle(sx, sy, big ? 9 : 4, big ? 0xef4444 : 0x93c5fd).setDepth(40);
            this.bullets.push({ spr: b, vx: Math.cos(a) * (big ? 0.35 : 0.5), vy: Math.sin(a) * (big ? 0.35 : 0.5), mine: false, dmg: big ? 12 : f.kind === "heli" ? 3 : 2, life: 2600 });
            if (big) this.explode(sx + 20, sy - 10, false);
          }
          f.nextShot = now + (f.kind === "tank" ? 3600 : f.kind === "heli" ? 2200 : 3000) + Math.random() * 1000;
        }
      }
    }
    // bullets
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      b.spr.x += b.vx * dt;
      b.spr.y += b.vy * dt;
      b.life -= dt;
      // rockets that run out of fuel go off anyway
      if (b.rocket && b.life <= 0) {
        this.rocketBoom(b.spr.x, b.spr.y, b.dmg);
        b.spr.destroy();
        continue;
      }
      if (b.rocket && Math.random() < 0.6) {
        const puff = this.add.circle(b.spr.x, b.spr.y, 5, 0xd1d5db, 0.6).setDepth(41);
        this.tweens.add({ targets: puff, radius: 14, alpha: 0, x: puff.x - 30, duration: 400, onComplete: () => puff.destroy() });
      }
      if (b.mine) {
        for (const f of this.foes) {
          if (f.dead || f.kind === "spikes" || f.kind === "ramp") continue;
          const hw = f.spr.displayWidth / 2;
          const top = f.spr.y - f.spr.displayHeight * (f.kind === "heli" ? 0.5 : 0.8);
          const bottom = f.spr.y + (f.kind === "heli" ? f.spr.displayHeight * 0.5 : f.spr.displayHeight * 0.2);
          if (b.spr.x > f.spr.x - hw && b.spr.x < f.spr.x + hw && b.spr.y > top && b.spr.y < bottom) {
            b.life = 0;
            if (b.rocket) this.rocketBoom(b.spr.x, b.spr.y, b.dmg);
            else {
              this.damageFoe(f, b.dmg);
              const sp = this.add.circle(b.spr.x, b.spr.y, 3, 0xfff7ae).setDepth(42);
              this.tweens.add({ targets: sp, radius: 8, alpha: 0, duration: 90, onComplete: () => sp.destroy() });
            }
            break;
          }
        }
      } else if (Math.abs(b.spr.x - this.truck.x) < 110 && b.spr.y > this.truck.y - 110 && b.spr.y < this.truck.y + 10) {
        b.life = 0;
        this.hurtTruck(Math.max(1, Math.round(b.dmg * 0.6)));
      }
      if (b.spr.x < -50 || b.spr.x > 1010 || b.spr.y < -50 || b.spr.y > 600) b.life = 0;
      if (b.life <= 0) b.spr.destroy();
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    this.foes = this.foes.filter((f) => !f.dead || f.spr.active);
    const left = Math.max(0, Math.ceil(LENGTH - this.t));
    const rocketReady = now >= this.nextRocket;
    this.hud.setText(`TRUCK ${Math.ceil(this.hp)}%   KILLS ${this.kills}   ROCKET ${rocketReady ? "READY" : "…"}   DRAWBRIDGE IN ${left}s   SLOPPY ${Math.floor(this.sloppy)}%${this.sloppy >= 100 ? " — R!" : ""}`);
  }
}
