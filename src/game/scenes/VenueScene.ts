import Phaser from "phaser";
import { G } from "../G";
import { Controls } from "../combat/Controls";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, title } from "../ui/theme";
import { dir, say } from "../../content/dsl";
import { animateWalker, backdrop } from "../gfx/HD";
import { bump } from "../systems/stats";

/** SanMik & SanChz's back catalogue (the files are ggg1..ggg13). */
export const SANMIK_SONGS: { id: string; title: string; album: string }[] = [
  { id: "ggg1", title: "BPD Menace", album: "single" },
  { id: "ggg2", title: "Ashurst", album: "single" },
  { id: "ggg3", title: "I Don't Need Yhu", album: "OrChzMik" },
  { id: "ggg4", title: "Viva Reggaeton", album: "GTA: SanMik" },
  { id: "ggg5", title: "Deep in Ure Ass", album: "Jerk My Gherk" },
  { id: "ggg6", title: "Peener Colarder", album: "Peener 4eva" },
  { id: "ggg7", title: "Fuck U Bitch", album: "The Nu Warehouse" },
  { id: "ggg8", title: "Gettin Crunk Wiv SanChz", album: "Peener 4eva" },
  { id: "ggg9", title: "Wank Til U Spunk", album: "Peener 4eva" },
  { id: "ggg10", title: "Fragrant Bitch", album: "Jerk My Gherk" },
  { id: "ggg11", title: "Happy Birthday You Cunt", album: "The Nu Warehouse" },
  { id: "ggg12", title: "I Love Christmas", album: "GTA: SanMik" },
  { id: "ggg13", title: "In Tha Hot Tub", album: "Peener 4eva" },
];

const SANMIK_HURT = ["OI!", "That's not fair lads", "I'm mid-verse!", "Can I finish the song at least", "Fair play. Ow.", "I'm telling Drongus"];
const SANCHZ_HURT = ["Mork.", "Hrrrm. Mork mork.", "That's great for the core", "I'm calling my mum", "OW. My bulk."];
const HYPE = ["SANMIK!!", "SANCHZ!!", "TUNE!", "PEENER 4EVA", "ENCORE!", "GET CRUNK!", "WHAT A TUNE", "HOT TUB!!", "FRAGRANT!", "🔥🔥🔥"];

interface Performer {
  spr: Phaser.GameObjects.Sprite;
  name: string;
  hurt: string[];
  hits: number;
  home: { x: number; y: number };
}

/**
 * The Krezz Arms back room: SanMik (Mikey) and SanChz (Polson) in residence. You walk in mid-song;
 * more songs follow; hit them and the music stops.
 */
export class VenueScene extends Phaser.Scene {
  private controls!: Controls;
  private me!: Phaser.GameObjects.Sprite;
  private performers: Performer[] = [];
  private crowd: Phaser.GameObjects.Sprite[] = [];
  private box!: DialogueBox;
  private banner!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private songIdx = -1;
  private stopped = false;
  private between = false;
  private nextCheer = 0;
  private lastHit = 0;
  private busy = false;

  constructor() {
    super("Venue");
  }

  create() {
    this.performers = [];
    this.crowd = [];
    this.stopped = false;
    this.between = false;
    this.busy = false;
    this.songIdx = -1;
    this.cameras.main.fadeIn(300);
    if (!backdrop(this, "bg_gig", { depth: -10, dim: 0.15 })) this.add.rectangle(480, 270, 960, 540, 0x1a1033).setDepth(-10);
    // stage edge and lights
    this.add.rectangle(480, 300, 900, 14, 0x3b2a1a).setDepth(1);
    this.add.text(480, 64, "THE KREZZ ARMS BACK ROOM PRESENTS", { fontFamily: FONT, fontSize: "12px", color: "#fff4cc" }).setOrigin(0.5).setDepth(200);
    title(this, 480, 86, "SANMIK & SANCHZ", 30, "#ff6bb0").setDepth(200);
    for (let i = 0; i < 6; i++) {
      const l = this.add.circle(120 + i * 144, 150, 80, [0xff2e88, 0x5ad1ff, 0xffd23f][i % 3], 0.14).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
      this.tweens.add({ targets: l, alpha: 0.32, duration: 300 + i * 70, yoyo: true, repeat: -1 });
    }
    const sanmik = this.add.sprite(400, 270, this.textures.exists("spr_SANMIK") ? "spr_SANMIK" : "spr_MIKEY", 0).setScale(3).setDepth(270);
    const sanchz = this.add.sprite(580, 272, this.textures.exists("spr_SANCHZ") ? "spr_SANCHZ" : "spr_POLSON", 0).setScale(3).setDepth(272);
    if (!this.textures.exists("spr_SANMIK")) sanmik.setTint(0xb0c4ff);
    if (!this.textures.exists("spr_SANCHZ")) sanchz.setTint(0xffe08a);
    this.performers = [
      { spr: sanmik, name: "SANMIK", hurt: SANMIK_HURT, hits: 0, home: { x: 400, y: 270 } },
      { spr: sanchz, name: "SANCHZ", hurt: SANCHZ_HURT, hits: 0, home: { x: 580, y: 272 } },
    ];
    // the crowd
    const ids = ["FOLK0", "FOLK1", "FOLK2", "FOLK3", "KID0", "COP", "BOGGOR", "EDEN", "FOLK1", "FOLK0"].filter((k) => this.textures.exists(`spr_${k}`));
    ids.forEach((id, i) => {
      const c = this.add.sprite(120 + (i % 5) * 180 + (i > 4 ? 90 : 0), i > 4 ? 420 : 360, `spr_${id}`, 0).setScale(2).setDepth(i > 4 ? 420 : 360);
      c.setData("baseY", c.y);
      this.crowd.push(c);
    });
    // you
    this.me = this.add.sprite(480, 500, `spr_${G.s.player}`, 0).setScale(2).setDepth(500);
    this.add.rectangle(480, 532, 90, 14, 0xffd23f, 0.3).setStrokeStyle(2, 0xffd23f).setDepth(1);
    this.add.text(480, 532, "EXIT", { fontFamily: FONT, fontSize: "10px", color: "#ffd23f" }).setOrigin(0.5).setDepth(2);
    this.banner = this.add.text(480, 116, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#1a1033cc", padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(200);
    this.prompt = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#000000cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(1000).setVisible(false);
    this.controls = new Controls(this);
    this.box = new DialogueBox(this, 2000, 0.2);
    if (!this.scene.isActive("UI")) this.scene.launch("UI", { mode: "hub" });
    else this.scene.get("UI").events.emit("mode", "hub");
    bump(G.s, "sanmik_visits");
    // you walk in mid-song
    this.playSong(Math.floor(Math.random() * SANMIK_SONGS.length), 0.25 + Math.random() * 0.4);
    this.time.delayedCall(600, () => {
      if (G.s.flags.sanmik_seen) return;
      G.s.flags.sanmik_seen = true;
      this.talk([dir("The back room of the Krezz Arms. It is very hot. On stage, in a huge afro wig, white sunglasses and a goatee drawn on in marker pen: SANMIK. Next to him, in a gold shell suit: SANCHZ."), dir("They are midway through a song. They have been midway through a song since 2011."), dir("Walk up and attack them if you want it to stop. Head to the EXIT when you've had enough.")]);
    });
  }

  private async talk(lines: Parameters<DialogueBox["play"]>[0]) {
    this.busy = true;
    await this.box.play(lines);
    this.controls.swallow();
    this.busy = false;
  }

  private playSong(idx: number, startFrac = 0) {
    if (this.stopped) return;
    this.songIdx = idx;
    this.between = false;
    const song = SANMIK_SONGS[idx];
    synth.music(song.id, true, startFrac);
    this.banner.setText(`♪ NOW PLAYING: SanMik & SanChz — "${song.title}" (from ${song.album === "single" ? "the single" : `'${song.album}'`})`);
    if (startFrac === 0) {
      synth.play("cheer");
      this.hype(4);
    }
  }

  private hype(n: number) {
    for (let i = 0; i < n && this.crowd.length; i++) {
      const c = this.crowd[Math.floor(Math.random() * this.crowd.length)];
      const t = this.add.text(c.x, c.y - 50, HYPE[Math.floor(Math.random() * HYPE.length)], { fontFamily: FONT, fontSize: "13px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(900);
      this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, delay: i * 200, duration: 1200, onComplete: () => t.destroy() });
    }
  }

  private float(x: number, y: number, text: string, color = "#ffffff") {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: "15px", color, fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(950);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  /** Walk up and hit them: the music stops. */
  private hit(p: Performer) {
    const now = this.time.now;
    if (now - this.lastHit < 320) return;
    this.lastHit = now;
    p.hits++;
    synth.play(p.hits % 2 ? "hit" : "crit");
    this.cameras.main.shake(140, 0.008);
    p.spr.setTintFill(0xffffff);
    this.time.delayedCall(90, () => p.spr.clearTint());
    this.tweens.add({ targets: p.spr, x: p.spr.x + (p.spr.x < this.me.x ? -40 : 40), duration: 160, yoyo: true });
    this.float(p.spr.x, p.spr.y - 70, p.hurt[Math.floor(Math.random() * p.hurt.length)], "#ff6b6b");
    if (!this.stopped) {
      this.stopped = true;
      synth.stopMusic();
      synth.play("tap_fail");
      this.banner.setText("♪ THE MUSIC HAS STOPPED. Someone attacked SanMik & SanChz.");
      for (let i = 0; i < 5; i++) {
        const c = this.crowd[Math.floor(Math.random() * this.crowd.length)];
        if (c) this.float(c.x, c.y - 50, ["BOOO", "OI!", "LEAVE THEM ALONE", "THEY WERE MID-VERSE", "SHAME"][i], "#ff9a9a");
      }
      bump(G.s, "sanmik_stopped");
    }
    if (p.hits === 4) {
      p.spr.setAngle(90);
      this.float(p.spr.x, p.spr.y - 40, "💤", "#ffffff");
      if (this.performers.every((q) => q.hits >= 4)) {
        G.s.coins += 15;
        this.talk([dir("SanMik and SanChz lie on the stage. The crowd goes quiet. Somebody finds 15 Krezzcoin in SanChz's bumbag and gives it to you, out of fear."), say("MIKEY", "(from the floor) We'll be back next week. Same time."), say("POLSON", "(from the floor) Mork.")]);
      }
    }
  }

  update(time: number, delta: number) {
    const dt = Math.min(delta, 50);
    // the performers dance (or lie there)
    this.performers.forEach((p, i) => {
      if (p.hits >= 4) return;
      if (this.stopped) {
        animateWalker(p.spr, 0, 1, false, time);
        return;
      }
      const t = time / 1000 + i * 0.7;
      p.spr.x = p.home.x + Math.sin(t * 2.2) * 50;
      p.spr.y = p.home.y - Math.abs(Math.sin(t * 6)) * 10;
      animateWalker(p.spr, Math.cos(t * 2.2), 0, true, time);
      if (Math.random() < 0.004) this.tweens.add({ targets: p.spr, angle: 360, duration: 400, onComplete: () => p.spr.setAngle(0) });
    });
    // crowd
    this.crowd.forEach((c, i) => {
      const base = c.getData("baseY") as number;
      c.y = this.stopped ? base : base - Math.max(0, Math.sin(time / 170 + i)) * 9;
    });
    if (!this.stopped && time > this.nextCheer) {
      this.nextCheer = time + 7000 + Math.random() * 7000;
      if (Math.random() < 0.6) synth.play("cheer");
      this.hype(2);
    }
    // next song when this one ends
    if (!this.stopped && !this.between && this.songIdx >= 0) {
      const pr = synth.fileProgress();
      if (pr.ended) {
        this.between = true;
        synth.play("cheer");
        this.hype(5);
        this.banner.setText("♪ \"Cheers Krelford. This next one's off the new album.\"");
        let next = Math.floor(Math.random() * SANMIK_SONGS.length);
        if (next === this.songIdx) next = (next + 1) % SANMIK_SONGS.length;
        this.time.delayedCall(2500, () => this.playSong(next));
      }
    }
    if (this.busy) {
      this.prompt.setVisible(false);
      return;
    }
    // you
    const mv = this.controls.move();
    const sp = 200 * (dt / 1000);
    this.me.x = Phaser.Math.Clamp(this.me.x + mv.x * sp, 40, 920);
    this.me.y = Phaser.Math.Clamp(this.me.y + mv.y * sp, 250, 520);
    this.me.setDepth(this.me.y);
    animateWalker(this.me, mv.x, mv.y, Math.hypot(mv.x, mv.y) > 0.1, time);
    // what's in reach
    const near = this.performers.find((p) => p.hits < 4 && Phaser.Math.Distance.Between(p.spr.x, p.spr.y, this.me.x, this.me.y) < 80);
    const atExit = this.me.y > 495 && Math.abs(this.me.x - 480) < 70;
    if (near) {
      this.prompt.setText(`E / ATTACK: hit ${near.name}`).setPosition(this.me.x, this.me.y - 50).setVisible(true);
      if (this.controls.interact() || this.controls.attackHeld()) this.hit(near);
    } else if (atExit) {
      this.prompt.setText("E: Leave the back room").setPosition(this.me.x, this.me.y - 50).setVisible(true);
      if (this.controls.interact()) this.leave();
    } else {
      this.prompt.setVisible(false);
      this.controls.interact();
    }
    if (this.controls.pause()) this.leave();
  }

  private leave() {
    if (this.busy) return;
    this.busy = true;
    synth.stopMusic();
    G.save();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Hub", { at: "PUB" }));
  }
}
