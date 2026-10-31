import Phaser from "phaser";
import { G } from "../G";
import { synth } from "../audio/Synth";
import { DialogueBox } from "../ui/DialogueBox";
import { FONT, title } from "../ui/theme";
import { runChain, switchTo } from "../Flow";
import { dir, say } from "../../content/dsl";

// Pseudo-3D road (OutRun style): the track is a list of segments; each frame we project the ones in front of you.
const SEG = 200; // world units per segment
const ROAD_W = 2000; // half-width of the road in world units
const CAM_H = 1000;
const DRAW = 140; // segments drawn
const FOV_D = 0.84; // camera depth (1 / tan(fov/2))
const W = 960;
const H = 540;
const HORIZON = 250;
const GOAL = 25;
const TIME = 80;

type Thing = { seg: number; off: number; key: string; kind: "ped" | "thing" | "warden"; img: Phaser.GameObjects.Image; hit: boolean; drift: number };

const LYRICS = [
  "🎤 BEEP BEEP — GET OUT THE WAY",
  "🎤 I'M IN MY CAR — GET OUT THE WAY",
  "🎤 GONNA GO VERY FAR — GET OUT THE WAY",
  "🎤 I'M A FUCKING STAR — GET OUT THE WAY",
  "🎤 KING MIK, ON MY KING SHIT, AND I'M DRIVING IN MY CAR",
  "🎤 DRIVING IN MY NEW RANGE ROVER",
  "🎤 SUN IS OUT, I'M FEELING MYSELF, WHILE I RUIN SOME PEDESTRIAN'S DAY",
  "🎤 I'M MOWING PEOPLE DOWN LIKE BUMP BUMP BUMP",
  "🎤 ALL UNDER MY WHEEL, LIKE PLAYING GTA",
];
const MIK = ["RUN HIM OVER!", "GET THAT ONE!", "BEEP BEEP!", "GET OUT THE WAY!", "LIKE PLAYING GTA!", "BUMP BUMP BUMP!", "YEEEE!", "KING MIK!", "THAT ONE'S GOT A MEAL DEAL. GET HIM.", "PAVEMENT'S A ROAD IF YOU BELIEVE", "MIRROR, SIGNAL, MANSLAUGHTER"];
const CHZ = ["YEGHHH!", "HIT THE BIN!", "THAT'S A TRAFFIC WARDEN. DOUBLE POINTS.", "Mork.", "GET THE BUS STOP!", "YEGH YEGH YEGH"];

/** SanMik's car. You drive. SanMik and SanChz shout. Run over 25 pedestrians before the song ends. */
export class BeepBeepScene extends Phaser.Scene {
  private box!: DialogueBox;
  private chain: string[] = [];
  private resume: { dungeon: string; room: number } | null = null;
  private startData: any;
  private g!: Phaser.GameObjects.Graphics;
  private curves: number[] = [];
  private things: Thing[] = [];
  private pos = 0;
  private speed = 0;
  private px = 0;
  private hits = 0;
  private left = TIME;
  private running = false;
  private ended = false;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private lyric = 0;
  private nextBark = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private sky!: Phaser.GameObjects.TileSprite | null;
  private wheel!: Phaser.GameObjects.Container;
  private bump = 0;

  constructor() {
    super("BeepBeep");
  }

  create(data: { chain?: string[]; resume?: { dungeon: string; room: number } }) {
    this.startData = data;
    this.chain = data.chain ?? [];
    this.resume = data.resume ?? null;
    this.things = [];
    this.pos = 0;
    this.speed = 0;
    this.px = 0;
    this.hits = 0;
    this.left = TIME;
    this.running = false;
    this.ended = false;
    this.lyric = 0;
    G.s.phase = "dungeon";
    this.cameras.main.fadeIn(300);
    // sky and skyline
    this.add.rectangle(W / 2, HORIZON / 2, W, HORIZON, 0x7dd3fc).setDepth(-30);
    this.sky = null;
    if (this.textures.exists("sm_street")) {
      const src = this.textures.get("sm_street").getSourceImage();
      this.sky = this.add.tileSprite(0, HORIZON - 230, W, 230, "sm_street").setOrigin(0).setDepth(-20);
      this.sky.setTileScale(230 / src.height);
    }
    this.g = this.add.graphics().setDepth(0);
    // a long, wiggly high street
    const N = 2400;
    for (let i = 0; i < N; i++) {
      const band = Math.floor(i / 120);
      this.curves.push([0, 2.2, -2.6, 0, 3.2, -1.8, 1.4, -3, 0, 2.6][band % 10] * (i % 120 < 20 || i % 120 > 100 ? 0.4 : 1));
    }
    // pedestrians, wardens and street furniture all along it
    const peds = this.textures.getTextureKeys().filter((k) => /^spr_(FOLK\d|TV_)/.test(k) && !/KID|CHILD|BABY|BOY|GIRL|COOKIE/.test(k));
    const props = ["d_busstop", "d_phonebooth", "d_stall", "p_bin", "d_newsstand", "d_scooter", "d_vendingbike", "d_pot", "d_statue", "d_fountain"].filter((k) => this.textures.exists(k));
    for (let s = 30; s < N - 10; s += 6 + Math.floor(Math.random() * 6)) {
      const r = Math.random();
      if (r < 0.62 && peds.length) this.addThing(s, (Math.random() - 0.5) * 2.6, peds[Math.floor(Math.random() * peds.length)], "ped");
      else if (r < 0.72) this.addThing(s, (Math.random() - 0.5) * 2.4, "spr_COP", "warden");
      else if (props.length) this.addThing(s, (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.6), props[Math.floor(Math.random() * props.length)], "thing");
    }
    // the inside of the car
    if (this.textures.exists("p_dash")) {
      const d = this.add.image(W / 2, H / 2, "p_dash").setDepth(500);
      d.setScale(Math.max(W / d.width, H / d.height));
      this.wheel = this.add.container(W / 2, 600).setDepth(501);
    } else {
      const dash = this.add.graphics().setDepth(500);
      dash.fillStyle(0x111827, 1).fillRect(0, 440, W, 100);
      dash.fillStyle(0x0b0b0f, 1).fillRect(0, 0, W, 34).fillTriangle(0, 0, 90, 0, 0, 440).fillTriangle(W, 0, W - 90, 0, W, 440);
      dash.fillStyle(0x22d3ee, 0.8).fillCircle(300, 480, 22).fillCircle(660, 480, 22);
      this.wheel = this.add.container(W / 2, 560).setDepth(501);
      this.wheel.add(this.add.circle(0, 0, 130, 0x000000, 0).setStrokeStyle(22, 0x1f2937));
      this.wheel.add(this.add.rectangle(0, 0, 240, 18, 0x1f2937));
      this.wheel.add(this.add.circle(0, 0, 26, 0x374151).setStrokeStyle(3, 0xf472b6));
    }
    // rear-view mirror: the lads, egging you on (inside the real mirror when we have the dashboard art)
    const hasDash = this.textures.exists("p_dash");
    const mx = W / 2;
    const my = hasDash ? 136 : 46;
    const mirror = this.add.container(mx, my).setDepth(510);
    if (!hasDash) mirror.add(this.add.rectangle(0, 0, 220, 54, 0x0f172a).setStrokeStyle(4, 0x111827));
    else mirror.add(this.add.rectangle(0, 0, 190, 40, 0x1e293b, 0.85));
    if (this.textures.exists("spr_SANMIK")) mirror.add(this.add.image(-45, 16, "spr_SANMIK", 0).setScale(1.3));
    if (this.textures.exists("spr_SANCHZ")) mirror.add(this.add.image(45, 16, "spr_SANCHZ", 0).setScale(1.3));
    const mm = this.make.graphics({}).fillRect(mx - 95, my - 20, 190, 40);
    mirror.setMask(mm.createGeometryMask());
    this.hud = this.add.text(W / 2, 22, "", { fontFamily: FONT, fontSize: "15px", color: "#fff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(520);
    this.banner = this.add.text(W / 2, 52, "", { fontFamily: "Impact, sans-serif", fontSize: "20px", color: "#fde047", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(520);
    title(this, 110, 24, "BEEP BEEP", 22, "#f472b6").setDepth(520);
    this.keys = this.input.keyboard!.addKeys("A,D,W,S,LEFT,RIGHT,UP,DOWN,SPACE") as Record<string, Phaser.Input.Keyboard.Key>;
    this.box = new DialogueBox(this, 1000, 0.3);
    this.box
      .play([
        dir("A stolen Range Rover, idling on Catford High Street. SanChz nicked it. SanMik has made you drive it. The sat-nav has been set to THE BANK OF CATFORD, via THE PAVEMENT."),
        say("SANMIK", "Yee. We need to get to the bank. Shortest route's through all them people."),
        say("SANCHZ", "YEGHHH. Pedestrians are just speed bumps with opinions."),
        say("SANMIK", "Twenty-five of 'em before the song ends, or we're late for the robbery. Traffic wardens count double. Bins count for nothing but they're satisfying."),
        dir(`HOW TO PLAY: steer with A / D (or the arrows, or hold your finger left or right of the wheel). W to floor it, S to brake. Run over ${GOAL} pedestrians before the time runs out.`),
      ])
      .then(() => {
        this.running = true;
        synth.music("beepbeep", true);
        this.banner.setText(LYRICS[0]);
      });
  }

  private addThing(seg: number, off: number, key: string, kind: Thing["kind"]) {
    const img = key.startsWith("spr_") ? this.add.image(0, 0, key, 0) : this.add.image(0, 0, key);
    img.setOrigin(0.5, 1).setVisible(false);
    this.things.push({ seg, off, key, kind, img, hit: false, drift: kind === "thing" ? 0 : (Math.random() - 0.5) * 0.004 });
  }

  private bark(who: "SANMIK" | "SANCHZ", t?: string) {
    const list = who === "SANMIK" ? MIK : CHZ;
    const text = t ?? list[Math.floor(Math.random() * list.length)];
    const tx = this.add.text(W / 2 + (who === "SANMIK" ? -170 : 170), 180, text, { fontFamily: FONT, fontSize: "16px", color: who === "SANMIK" ? "#b0c4ff" : "#ffe08a", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(530);
    this.tweens.add({ targets: tx, y: 140, alpha: 0, delay: 900, duration: 500, onComplete: () => tx.destroy() });
    synth.shout(who === "SANMIK" ? "yee" : "yegh", 0.7);
  }

  private finish(win: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    synth.stopMusic();
    const lines = win
      ? [
          say("SANMIK", `YEEEEE! ${this.hits}! That's a Catford record! Better than GTA!`),
          say("SANCHZ", "YEGHHH. There's a bloke still on the bonnet."),
          dir("There is. He waves. He's fine. Everyone in the SanMikverse is somehow fine. They get up, dust themselves off, and leave one-star reviews of SanMik's driving."),
          say("SANMIK", "And here's the bank. Balaclavas on, lads. Like Jason Statham in Crank."),
        ]
      : [say("SANMIK", "That's not enough people, blud. That's barely a crowd."), say("SANCHZ", "Go round again. They've all got back up."), dir("Everyone you hit has got back up. They are queuing to be hit again. It's the SanMikverse. Try again.")];
    this.box.play(lines).then(() => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        if (!win) return this.scene.restart(this.startData);
        G.s.flags.sm_beepbeep_done = true;
        G.save();
        if (this.resume) runChain(this, this.chain, this.resume);
        else switchTo(this, "Hub", { at: "PUB" });
      });
    });
  }

  update(_t: number, delta: number) {
    const dt = Math.min(delta, 50);
    const k = this.keys;
    if (this.running && !this.box.active) {
      // controls
      const ptr = this.input.activePointer;
      let steer = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      if (ptr.isDown && ptr.y > 200) steer = ptr.x < W / 2 - 40 ? -1 : ptr.x > W / 2 + 40 ? 1 : 0;
      const gas = k.W.isDown || k.UP.isDown || k.SPACE.isDown;
      const brake = k.S.isDown || k.DOWN.isDown;
      const max = gas ? 14000 : 10000;
      this.speed += (brake ? -9000 : 4000) * (dt / 1000);
      this.speed = Phaser.Math.Clamp(this.speed, 0, max);
      if (Math.abs(this.px) > 1.6) this.speed = Math.min(this.speed, 6000);
      const seg = Math.floor(this.pos / SEG);
      const curve = this.curves[seg % this.curves.length];
      this.px += steer * (dt / 1000) * 2.3 * (0.4 + this.speed / 14000);
      this.px -= curve * (this.speed / 14000) * (dt / 1000) * 0.55;
      this.px = Phaser.Math.Clamp(this.px, -2.2, 2.2);
      this.pos += this.speed * (dt / 1000);
      if (this.pos >= this.curves.length * SEG) this.pos -= this.curves.length * SEG;
      this.wheel.setAngle(steer * 25);
      // timer
      this.left -= dt / 1000;
      if (this.left <= 0) {
        this.left = 0;
        this.finish(this.hits >= GOAL);
      }
      const lyricIdx = Math.min(LYRICS.length - 1, Math.floor((TIME - this.left) / (TIME / LYRICS.length)));
      if (lyricIdx !== this.lyric) {
        this.lyric = lyricIdx;
        this.banner.setText(LYRICS[lyricIdx]);
      }
      if (this.time.now > this.nextBark) {
        this.bark(Math.random() < 0.65 ? "SANMIK" : "SANCHZ");
        this.nextBark = this.time.now + 2500 + Math.random() * 2500;
      }
      if (this.hits >= GOAL && !this.ended) this.finish(true);
    }
    this.render(dt);
    this.hud.setText(`PEDESTRIANS ${this.hits}/${GOAL}    ${Math.ceil(this.left)}s    ${Math.round(this.speed / 140)} MPH`);
  }

  private render(dt: number) {
    const g = this.g;
    g.clear();
    const start = Math.floor(this.pos / SEG);
    const frac = (this.pos % SEG) / SEG;
    if (this.sky) this.sky.tilePositionX += this.curves[start % this.curves.length] * this.speed * 0.00004 * dt;
    // ground
    g.fillStyle(0x4d7c0f, 1).fillRect(0, HORIZON, W, H - HORIZON);
    this.bump += dt * (this.speed / 8000);
    const shake = Math.sin(this.bump / 30) * (this.speed > 100 ? 1.2 : 0);
    let x = 0;
    let dx = -this.curves[start % this.curves.length] * frac;
    let maxY = H;
    const proj: { y: number; sx: number; w: number; scale: number }[] = [];
    for (let n = 0; n < DRAW; n++) {
      const i = (start + n) % this.curves.length;
      const z = (n + 1 - frac) * SEG;
      const scale = FOV_D / (z / 1000);
      const sy = HORIZON + scale * CAM_H * 0.12 + shake;
      const sx = W / 2 + scale * (x - this.px * ROAD_W) * 0.24;
      const w = scale * ROAD_W * 0.24;
      proj.push({ y: sy, sx, w, scale });
      x += dx;
      dx += this.curves[i];
    }
    for (let n = DRAW - 1; n > 0; n--) {
      const a = proj[n];
      const b = proj[n - 1];
      if (b.y <= a.y || a.y >= maxY) continue;
      const i = (start + n) % this.curves.length;
      const alt = Math.floor(i / 3) % 2 === 0;
      // pavement, kerb, road, lines
      g.fillStyle(alt ? 0x9ca3af : 0x8b949e, 1);
      this.quad(a.sx, a.y, a.w * 1.9, b.sx, b.y, b.w * 1.9);
      g.fillStyle(alt ? 0xef4444 : 0xffffff, 1);
      this.quad(a.sx, a.y, a.w * 1.12, b.sx, b.y, b.w * 1.12);
      g.fillStyle(alt ? 0x3f3f46 : 0x45454d, 1);
      this.quad(a.sx, a.y, a.w, b.sx, b.y, b.w);
      if (alt) {
        g.fillStyle(0xfafafa, 1);
        this.quad(a.sx, a.y, a.w * 0.03, b.sx, b.y, b.w * 0.03);
      }
    }
    // people and things, far to near
    for (const t of this.things) {
      if (t.hit) continue;
      let n = t.seg - start;
      if (n < -1) n += this.curves.length;
      if (n < 0 || n >= DRAW - 1) {
        t.img.setVisible(false);
        continue;
      }
      if (t.kind !== "thing") t.off = Phaser.Math.Clamp(t.off + t.drift * dt, -1.4, 1.4);
      const p = proj[Math.max(0, n)];
      const sx = p.sx + p.w * t.off;
      const sc = p.scale * 2.2 * (t.kind === "thing" ? 1.6 : 1);
      t.img.setVisible(true).setPosition(sx, p.y).setScale(Math.min(sc, 9)).setDepth(400 - n);
      // under the wheels?
      if (this.running && n <= 1 && Math.abs(t.off - this.px) < 0.42 && this.speed > 1500) this.splat(t);
    }
  }

  private quad(x1: number, y1: number, w1: number, x2: number, y2: number, w2: number) {
    this.g.fillPoints([{ x: x1 - w1, y: y1 }, { x: x1 + w1, y: y1 }, { x: x2 + w2, y: y2 }, { x: x2 - w2, y: y2 }], true);
  }

  private splat(t: Thing) {
    t.hit = true;
    const img = t.img;
    const fromX = img.x;
    const fromY = img.y;
    this.cameras.main.shake(140, 0.01);
    if (t.kind === "thing") {
      synth.play("smash");
      this.speed *= 0.75;
      this.tweens.add({ targets: img, x: fromX + (Math.random() - 0.5) * 400, y: fromY - 300, angle: 540, alpha: 0, scale: img.scale * 1.5, duration: 600, onComplete: () => img.setVisible(false) });
      this.pop(fromX, fromY - 100, "SMASH", "#fde047");
      if (Math.random() < 0.5) this.bark("SANCHZ", "YEGHHH! BIN!");
      return;
    }
    const pts = t.kind === "warden" ? 2 : 1;
    this.hits += pts;
    synth.play("hit");
    synth.play("crit");
    // over the bonnet, over the roof, gone
    this.tweens.add({ targets: img, x: W / 2 + (Math.random() - 0.5) * 300, y: -120, angle: (Math.random() < 0.5 ? -1 : 1) * 900, scale: img.scale * 2.4, duration: 650, ease: "Quad.out", onComplete: () => img.setVisible(false) });
    this.pop(fromX, fromY - 120, t.kind === "warden" ? "TRAFFIC WARDEN x2!" : ["BUMP!", "BEEP BEEP!", "GET OUT THE WAY!", "BUMP BUMP!", "SPLAT"][Math.floor(Math.random() * 5)], t.kind === "warden" ? "#22d3ee" : "#f472b6");
    if (Math.random() < 0.55) this.bark(Math.random() < 0.7 ? "SANMIK" : "SANCHZ", t.kind === "warden" ? "DOUBLE POINTS!! YEEE!" : undefined);
  }

  private pop(x: number, y: number, t: string, color: string) {
    const tx = this.add.text(x, y, t, { fontFamily: "Impact, sans-serif", fontSize: "26px", color, stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(520);
    this.tweens.add({ targets: tx, y: y - 50, alpha: 0, duration: 900, onComplete: () => tx.destroy() });
  }
}
