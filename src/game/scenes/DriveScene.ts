import Phaser from "phaser";
import { G } from "../G";
import { synth } from "../audio/Synth";
import { DialogueBox } from "../ui/DialogueBox";
import { FONT, title } from "../ui/theme";
import { runChain, switchTo } from "../Flow";
import { dir, gabor, say } from "../../content/dsl";
import { damageMult } from "../systems/stats";
import { TOUCH } from "../ui/TouchControls";

type Foe = {
  kind: "cop" | "swat" | "heli" | "spikes" | "tank";
  spr: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  nextShot: number;
  tx: number;
  ty: number;
  dead: boolean;
};
type Bullet = { spr: Phaser.GameObjects.Arc; vx: number; vy: number; mine: boolean; dmg: number; life: number };

const ROAD_Y = 450;
const TRUCK_X = 380;
const LENGTH = 68; // seconds of chase before the drawbridge

const LYRICS: [number, string][] = [
  [1, "🎤 HIGH SPEED CAR CHASE, SPRAY ME WITH MACE"],
  [9, "🎤 YOU'RE A DISGRACE, HIGH SPEED CAR RACE"],
  [17, "🎤 FIFTEEN COP CARS ON MY TAIL"],
  [26, "🎤 IF THEY ARREST ME I WON'T GET BAIL"],
  [36, "🎤 GOT A HELICOPTER AND A TANK"],
  [46, "🎤 CAUSE I FUCKING ROBBED THIS BANK"],
  [56, "🎤 IT'S POINTING ITS TURRET AT US"],
  [63, "🎤 THERE'S A DRAWBRIDGE ABOUT TO LIFT"],
];

/**
 * NIGHT OF FREEDOM. SanMik drives, SanChz rides in the back, you shoot. Cop cars, SWAT vans, a helicopter,
 * a tank, and a drawbridge going up. Hold to shoot at the pointer; W / Space / the JUMP button to hop spikes.
 */
export class DriveScene extends Phaser.Scene {
  private box!: DialogueBox;
  private chain: string[] = [];
  private resume: { dungeon: string; room: number } | null = null;
  private startData: any;
  private road!: Phaser.GameObjects.TileSprite;
  private bg!: Phaser.GameObjects.TileSprite;
  private lines!: Phaser.GameObjects.Graphics;
  private truck!: Phaser.GameObjects.Container;
  private me!: Phaser.GameObjects.Sprite;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private foes: Foe[] = [];
  private bullets: Bullet[] = [];
  private hp = 100;
  private t = 0;
  private running = false;
  private ended = false;
  private jumpV = 0;
  private jumpY = 0;
  private nextShot = 0;
  private nextSpawn = 0;
  private nextBark = 0;
  private nextChz = 0;
  private sloppy = 0;
  private lyric = 0;
  private maceUntil = 0;
  private mace!: Phaser.GameObjects.Rectangle;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private bridgeStarted = false;
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
    this.hp = 100;
    this.t = 0;
    this.running = false;
    this.ended = false;
    this.jumpV = 0;
    this.jumpY = 0;
    this.sloppy = 0;
    this.lyric = 0;
    this.bridgeStarted = false;
    this.scroll = 0;
    this.cameras.main.fadeIn(300);
    G.s.phase = "dungeon";
    // the night road
    this.add.rectangle(480, 270, 960, 540, 0x0b1026).setDepth(-30);
    if (this.textures.exists("sm_road")) {
      const src = this.textures.get("sm_road").getSourceImage();
      this.bg = this.add.tileSprite(0, 0, 960, 540, "sm_road").setOrigin(0).setDepth(-20);
      this.bg.setTileScale(540 / src.height);
    }
    this.road = this.add.tileSprite(0, ROAD_Y + 28, 960, 90, "tile_industrial").setOrigin(0).setDepth(-5).setTint(0x3a3a48);
    this.lines = this.add.graphics().setDepth(-4);
    this.add.rectangle(0, ROAD_Y + 26, 960, 4, 0xfacc15, 0.7).setOrigin(0).setDepth(-4);
    // the truck: SanMik driving, SanChz and you in the back, Gabor somewhere
    this.truck = this.add.container(TRUCK_X, ROAD_Y).setDepth(20);
    const truckImg = this.textures.exists("p_truck") ? this.add.image(0, 0, "p_truck").setScale(2.2).setOrigin(0.5, 0.75) : this.add.rectangle(0, 0, 240, 70, 0xe5e7eb);
    const mik = this.add.sprite(70, -62, this.textures.exists("spr_SANMIK") ? "spr_SANMIK" : "spr_MIKEY", 0).setScale(1.6);
    const chz = this.add.sprite(-80, -66, this.textures.exists("spr_SANCHZ") ? "spr_SANCHZ" : "spr_POLSON", 0).setScale(1.9);
    this.me = this.add.sprite(-30, -70, `spr_${G.s.player}`, 0).setScale(1.9);
    const goat = this.textures.exists("p_gabor") ? this.add.image(-118, -46, "p_gabor").setScale(0.55) : this.add.circle(-118, -46, 12, 0xffffff);
    this.truck.add([chz, this.me, goat, mik, truckImg]);
    this.tweens.add({ targets: truckImg, y: -2, yoyo: true, repeat: -1, duration: 90 });
    this.mace = this.add.rectangle(480, 270, 960, 540, 0x9acd32, 0).setDepth(300);
    title(this, 480, 26, "NIGHT OF FREEDOM", 22, "#ffd23f").setDepth(400);
    this.hud = this.add.text(480, 54, "", { fontFamily: FONT, fontSize: "14px", color: "#ffffff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(400);
    this.banner = this.add.text(480, 96, "", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ff6bb0", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(400);
    // touch buttons
    const mkBtn = (x: number, label: string, fn: () => void) => {
      const b = this.add.circle(x, 470, 38, 0x000000, 0.45).setStrokeStyle(3, 0xffffff, 0.8).setDepth(450).setInteractive();
      this.add.text(x, 470, label, { fontFamily: FONT, fontSize: "13px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5).setDepth(451);
      b.on("pointerdown", (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        fn();
      });
    };
    if (TOUCH.enabled || this.sys.game.device.input.touch) {
      mkBtn(60, "JUMP", () => this.jump());
      mkBtn(900, "SLOPPY", () => this.sloppySurprise());
    }
    this.keys = this.input.keyboard!.addKeys("W,UP,SPACE,R") as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on("keydown-W", () => this.jump());
    this.input.keyboard!.on("keydown-UP", () => this.jump());
    this.input.keyboard!.on("keydown-SPACE", () => this.jump());
    this.input.keyboard!.on("keydown-R", () => this.sloppySurprise());
    this.box = new DialogueBox(this, 1000, 0.3);
    synth.music("drive", true);
    this.box
      .play([
        dir("The Bank of Catford, 2am. Alarms. Smoke. A pickup truck mounts the pavement outside with its hazards on."),
        say("SANMIK", "YEEE! We went and robbed a bank like Jason Statham in Crank!"),
        say("SANCHZ", "A million pounds in stashed-up notes. YEGHHH."),
        say("SANMIK", "And a goat. For some reason they kept a goat in that bank."),
        gabor("It was me. I asked them to lock me in the vault overnight. It was the best night of my life. Thank you for ruining it."),
        dir("Sirens. Lots of sirens. Fifteen sets of blue lights swing round the corner."),
        say("SANMIK", "Hold on to your bollocks. Let's have this night of freedom. Let's have this night of love."),
        dir("HOW TO PLAY: hold the mouse (or your finger) on the cops to shoot. W / Space / JUMP to hop over spike strips. Kills fill SanMik's SLOPPY SURPRISE: press R / SLOPPY to let it rip. Survive to the drawbridge."),
      ])
      .then(() => {
        this.running = true;
        this.nextSpawn = 0;
      });
  }

  private jump() {
    if (!this.running || this.ended || this.box.active) return;
    if (this.jumpY === 0) {
      this.jumpV = -0.95;
      synth.play("dodge");
    }
  }

  private gunPos() {
    return { x: this.truck.x - 30, y: this.truck.y - 84 + this.jumpY };
  }

  private spawn(kind: Foe["kind"]) {
    let spr: Phaser.GameObjects.Image;
    let hp = 6;
    let tx = 0;
    let ty = ROAD_Y + 6;
    if (kind === "cop") {
      spr = this.add.image(-120, ROAD_Y + 10, this.textures.exists("p_copcar") ? "p_copcar" : "p_tank").setScale(2.1).setOrigin(0.5, 0.8);
      tx = Phaser.Math.Between(90, 230);
      hp = 7;
    } else if (kind === "swat") {
      spr = this.add.image(-140, ROAD_Y + 8, this.textures.exists("p_swatvan") ? "p_swatvan" : "p_tank").setScale(2.3).setOrigin(0.5, 0.8);
      tx = Phaser.Math.Between(80, 200);
      hp = 12;
    } else if (kind === "heli") {
      spr = this.add.image(-120, 120, this.textures.exists("p_heli") ? "p_heli" : "p_plane").setScale(2.2).setFlipX(true);
      tx = Phaser.Math.Between(300, 700);
      ty = 130;
      hp = 18;
    } else if (kind === "tank") {
      spr = this.add.image(-200, ROAD_Y + 8, "p_tank").setScale(2.6).setOrigin(0.5, 0.8);
      tx = 110;
      hp = 40;
    } else {
      // a police stinger across the road
      spr = this.add.rectangle(1020, ROAD_Y + 22, 110, 10, 0x111827).setStrokeStyle(3, 0xe5e7eb) as unknown as Phaser.GameObjects.Image;
      tx = -200;
      hp = 999;
    }
    spr.setDepth(kind === "heli" ? 30 : kind === "spikes" ? 15 : 18);
    this.foes.push({ kind, spr, hp, maxHp: hp, nextShot: this.time.now + 1200 + Math.random() * 800, tx, ty, dead: false });
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
    for (let i = 0; i < (big ? 3 : 1); i++) {
      const c = this.add.circle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 30, 10, i % 2 ? 0xfde047 : 0xf97316, 0.9).setDepth(60);
      this.tweens.add({ targets: c, radius: big ? 90 : 55, alpha: 0, duration: 500 + i * 120, onComplete: () => c.destroy() });
    }
    this.cameras.main.shake(big ? 300 : 120, big ? 0.015 : 0.006);
  }

  private killFoe(f: Foe) {
    f.dead = true;
    this.explode(f.spr.x, f.spr.y - 20, f.kind === "tank" || f.kind === "heli");
    this.tweens.add({ targets: f.spr, x: f.spr.x - 300, angle: -30, alpha: 0, duration: 700, onComplete: () => f.spr.destroy() });
    this.sloppy = Math.min(100, this.sloppy + (f.kind === "cop" ? 18 : 30));
    G.s.coins += f.kind === "cop" ? 4 : 8;
    if (Math.random() < 0.5) this.bark(f.kind === "heli" ? "SANMIK" : undefined);
  }

  private bark(who?: "SANMIK" | "SANCHZ", text?: string) {
    const w = who ?? (Math.random() < 0.6 ? "SANMIK" : "SANCHZ");
    const mik = ["YEEEE!", "SanMik is here, I don't give a fuck!", "Away from the feds, away from the scum!", "Fifteen cop cars on my tail!", "Yee yee! Brap brap!", "Turn on your fucking TV!", "Channel U, baby!"];
    const chz = ["YEGHHHH!", "Mork.", "Big up the getaway!", "That's great for the core", "YEGH YEGH"];
    const list = w === "SANMIK" ? mik : chz;
    const t = text ?? list[Math.floor(Math.random() * list.length)];
    this.pop(this.truck.x + (w === "SANMIK" ? 70 : -80), this.truck.y - 120 + this.jumpY, t, w === "SANMIK" ? "#b0c4ff" : "#ffe08a", 15);
    synth.shout(w === "SANMIK" ? "yee" : "yegh", 0.85);
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
    for (const f of this.foes) if (!f.dead && f.kind !== "spikes" && f.kind !== "tank") this.killFoe(f);
    for (const b of this.bullets) if (!b.mine) b.life = 0;
  }

  private crash() {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    this.explode(this.truck.x, this.truck.y - 30, true);
    this.box.play([dir("The truck spins out and stops against a bollard. The feds pile out. SanMik winds down his window."), say("SANMIK", "Officer. I'll be honest with you. That's illegal. I wrote the law."), dir("…Somehow, it works. Try that again.")]).then(() => {
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
      this.tweens.add({ targets: f.spr, x: f.spr.x - 500, alpha: 0, duration: 900, onComplete: () => f.spr.destroy() });
    }
    // the bridge ahead
    const bx = 1100;
    const left = this.add.rectangle(bx, ROAD_Y + 26, 260, 26, 0x6b4f2a).setOrigin(0, 0.5).setDepth(10).setStrokeStyle(3, 0x2a1d0f);
    const right = this.add.rectangle(bx + 520, ROAD_Y + 26, 260, 26, 0x6b4f2a).setOrigin(1, 0.5).setDepth(10).setStrokeStyle(3, 0x2a1d0f);
    const water = this.add.rectangle(bx + 260, ROAD_Y + 60, 0, 120, 0x0c2340).setOrigin(0, 0.5).setDepth(9);
    void water;
    await this.box.play([say("SANMIK", "There's a drawbridge about to lift."), say("SANMIK", "Into the highest gear I shift."), dir("MASH (tap / Space) to shift into the highest gear!")]);
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
      this.tweens.add({ targets: rocket, x: this.truck.x + 100, y: this.truck.y - 40, duration: 900, ease: "Quad.in" });
    }
    // the jump
    synth.play("dodge");
    this.banner.setText("🎤 TRUCK FLIES UP, LANDS IN THE ROAD");
    await new Promise<void>((resolve) => this.tweens.add({ targets: this.truck, y: ROAD_Y - 220, angle: -12, duration: 700, ease: "Quad.out", yoyo: true, onYoyo: () => this.truck.setAngle(10), onComplete: () => resolve() }));
    this.truck.setAngle(0);
    this.explode(this.truck.x - 200, ROAD_Y - 10, true);
    this.explode(this.truck.x - 120, ROAD_Y - 40, true);
    this.banner.setText("🎤 AS THE TANK'S ROCKETS EXPLODE");
    if (tank) this.tweens.add({ targets: tank.spr, x: tank.spr.x - 500, alpha: 0, duration: 800 });
    this.cameras.main.flash(300, 255, 200, 120);
    await this.box.play([
      say("SANMIK", "We jumped the drawbridge! We lost the fucking damn police! YEEEEEE!"),
      say("SANCHZ", "YEGHHHHHHH."),
      gabor("I fell out twice. Can we do it again? Please no. Please yes."),
      say("SANMIK", "Let's have this night of freedom. Let's have this night of love."),
      say("SANMIK", "And all you pricks who doubted me, turn on your fucking TV. Put it onto Channel U. You'll see me say FUCK YOU."),
      dir("The truck screeches into a warehouse car park on the edge of the estate. The ground is shaking. Not from the police. From the bass."),
      say("SANMIK", "Yee. The Nu Warehouse. Where it all began. We can't fix the hot tub sober, blud. Nobody's ever fixed a hot tub sober."),
    ]);
    this.finish();
  }

  private finish() {
    this.ended = true;
    G.s.flags.sm_drive_done = true;
    G.save();
    this.cameras.main.fadeOut(400);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.resume) runChain(this, this.chain, this.resume);
      else switchTo(this, "Hub", { at: "PUB" });
    });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50);
    const spd = this.bridgeStarted ? 0.6 : 1;
    this.scroll += dt * 0.9 * spd;
    if (this.bg) this.bg.tilePositionX = this.scroll * 0.12;
    this.road.tilePositionX = this.scroll;
    this.lines.clear();
    this.lines.fillStyle(0xffffff, 0.8);
    for (let x = -(this.scroll % 120); x < 960; x += 120) this.lines.fillRect(x, ROAD_Y + 70, 60, 5);
    // jump physics
    if (this.jumpV !== 0 || this.jumpY < 0) {
      this.jumpY += this.jumpV * dt;
      this.jumpV += dt * 0.0042;
      if (this.jumpY >= 0) {
        this.jumpY = 0;
        this.jumpV = 0;
      }
    }
    if (!this.bridgeStarted) this.truck.y = ROAD_Y + this.jumpY;
    this.mace.setAlpha(this.time.now < this.maceUntil ? 0.45 : 0);
    if (!this.running || this.ended || this.box.active) {
      this.hud.setText("");
      return;
    }
    this.t += dt / 1000;
    const now = this.time.now;
    // lyrics
    if (this.lyric < LYRICS.length && this.t >= LYRICS[this.lyric][0]) {
      this.banner.setText(LYRICS[this.lyric][1]);
      this.lyric++;
    }
    if (this.t >= LENGTH) {
      void this.drawbridge();
      return;
    }
    // spawning: it ramps up
    if (now >= this.nextSpawn) {
      const live = this.foes.filter((f) => !f.dead && f.kind !== "spikes").length;
      const r = Math.random();
      if (live < 2 + Math.floor(this.t / 18)) {
        if (this.t > 36 && r < 0.18 && !this.foes.some((f) => f.kind === "heli" && !f.dead)) this.spawn("heli");
        else if (this.t > 15 && r < 0.45) this.spawn("swat");
        else this.spawn("cop");
      }
      if (Math.random() < 0.35) this.spawn("spikes");
      if (this.t > 54 && !this.foes.some((f) => f.kind === "tank")) {
        this.spawn("tank");
        this.bark("SANMIK", "Look at that tank! It's pointing its turret at us!");
      }
      this.nextSpawn = now + Math.max(900, 2400 - this.t * 22);
    }
    // your gun
    const ptr = this.input.activePointer;
    const gp = this.gunPos();
    const gx = gp.x + this.truck.x - TRUCK_X;
    const gy = gp.y;
    let aimX = ptr.worldX;
    let aimY = ptr.worldY;
    const touch = ptr.wasTouch;
    if (touch) {
      const target = this.foes.filter((f) => !f.dead && f.kind !== "spikes").sort((a, b) => Math.abs(a.spr.x - gx) - Math.abs(b.spr.x - gx))[0];
      if (target) {
        aimX = target.spr.x;
        aimY = target.spr.y - 30;
      }
    }
    const aim = Math.atan2(aimY - gy, aimX - gx);
    this.me.setFlipX(Math.cos(aim) < 0);
    if (ptr.isDown && now >= this.nextShot && !(ptr.y > 420 && (ptr.x < 110 || ptr.x > 850))) {
      this.nextShot = now + 150;
      const dmg = 1 * damageMult(G.s);
      const b = this.add.circle(gx, gy, 4, 0xffd23f).setDepth(40);
      this.bullets.push({ spr: b, vx: Math.cos(aim) * 0.9, vy: Math.sin(aim) * 0.9, mine: true, dmg, life: 1400 });
      synth.play("shoot");
    }
    // SanChz lobs food at whatever's closest
    if (now >= this.nextChz) {
      const target = this.foes.filter((f) => !f.dead && f.kind !== "spikes").sort((a, b) => Math.abs(a.spr.x - TRUCK_X) - Math.abs(b.spr.x - TRUCK_X))[0];
      if (target) {
        const food = this.add.text(this.truck.x - 80, this.truck.y - 70, ["🍔", "🍩", "🍕"][Math.floor(Math.random() * 3)], { fontSize: "20px" }).setOrigin(0.5).setDepth(45);
        const sx = food.x;
        const sy = food.y;
        this.tweens.add({
          targets: food,
          x: target.spr.x,
          duration: 500,
          onUpdate: (tw) => food.setY(sy + (target.spr.y - 30 - sy) * tw.progress - Math.sin(tw.progress * Math.PI) * 90),
          onComplete: () => {
            food.destroy();
            if (!target.dead) {
              target.hp -= 2;
              this.pop(target.spr.x, target.spr.y - 50, "FUDGED", "#ffe08a", 12);
              if (target.hp <= 0) this.killFoe(target);
            }
          },
        });
        void sx;
      }
      this.nextChz = now + 1300;
    }
    if (now >= this.nextBark) {
      this.bark();
      this.nextBark = now + 3500 + Math.random() * 4000;
    }
    // foes
    for (const f of this.foes) {
      if (f.dead) continue;
      if (f.kind === "spikes") {
        f.spr.x -= dt * 0.9;
        if (Math.abs(f.spr.x - this.truck.x) < 90 && this.jumpY > -30 && !(f as any).hit) {
          (f as any).hit = true;
          this.hurtTruck(14, "STINGER!");
        }
        if (f.spr.x < -100) {
          f.dead = true;
          f.spr.destroy();
        }
        continue;
      }
      // drive up into position, weave a bit
      f.spr.x += (f.tx + Math.sin(now / 700 + f.maxHp) * 40 - f.spr.x) * Math.min(1, dt / 600);
      if (f.kind === "heli") f.spr.y = f.ty + Math.sin(now / 400) * 18;
      if (now >= f.nextShot) {
        if (f.kind === "cop" && Math.random() < 0.25) {
          // spray me with mace
          this.maceUntil = now + 1400;
          this.pop(f.spr.x + 40, f.spr.y - 70, "MACE!", "#a3e635", 15);
          f.nextShot = now + 2600;
        } else {
          const n = f.kind === "swat" ? 3 : f.kind === "tank" ? 1 : f.kind === "heli" ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const sx = f.spr.x + 30;
            const sy = f.spr.y - (f.kind === "heli" ? 0 : 40);
            const a = Math.atan2(this.truck.y - 60 - sy, this.truck.x - sx) + (i - (n - 1) / 2) * 0.12;
            const big = f.kind === "tank";
            const b = this.add.circle(sx, sy, big ? 9 : 4, big ? 0xef4444 : 0x93c5fd).setDepth(40);
            this.bullets.push({ spr: b, vx: Math.cos(a) * (big ? 0.35 : 0.5), vy: Math.sin(a) * (big ? 0.35 : 0.5), mine: false, dmg: big ? 16 : f.kind === "heli" ? 5 : 4, life: 2600 });
          }
          f.nextShot = now + (f.kind === "tank" ? 3200 : f.kind === "heli" ? 1300 : 1700) + Math.random() * 700;
        }
      }
    }
    // bullets
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      b.spr.x += b.vx * dt;
      b.spr.y += b.vy * dt;
      b.life -= dt;
      if (b.mine) {
        for (const f of this.foes) {
          if (f.dead || f.kind === "spikes") continue;
          const hw = f.spr.displayWidth / 2;
          const top = f.spr.y - f.spr.displayHeight * (f.kind === "heli" ? 0.5 : 0.8);
          const bottom = f.spr.y + (f.kind === "heli" ? f.spr.displayHeight * 0.5 : f.spr.displayHeight * 0.2);
          if (b.spr.x > f.spr.x - hw && b.spr.x < f.spr.x + hw && b.spr.y > top && b.spr.y < bottom) {
            b.life = 0;
            f.hp -= b.dmg;
            f.spr.setTintFill(0xffffff);
            this.time.delayedCall(50, () => f.spr.active && f.spr.clearTint());
            if (f.hp <= 0) this.killFoe(f);
            break;
          }
        }
      } else if (Math.abs(b.spr.x - this.truck.x) < 110 && b.spr.y > this.truck.y - 110 && b.spr.y < this.truck.y + 10) {
        b.life = 0;
        this.hurtTruck(b.dmg);
      }
      if (b.spr.x < -50 || b.spr.x > 1010 || b.spr.y < -50 || b.spr.y > 600) b.life = 0;
      if (b.life <= 0) b.spr.destroy();
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    this.foes = this.foes.filter((f) => !f.dead || f.spr.active);
    const left = Math.max(0, Math.ceil(LENGTH - this.t));
    this.hud.setText(`TRUCK ${Math.ceil(this.hp)}%    DRAWBRIDGE IN ${left}s    SLOPPY SURPRISE ${Math.floor(this.sloppy)}%${this.sloppy >= 100 ? " — PRESS R!" : ""}`);
  }
}
