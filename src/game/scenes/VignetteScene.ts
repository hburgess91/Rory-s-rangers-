import Phaser from "phaser";
import type { Line } from "../../data/types";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, title } from "../ui/theme";
import { dir, ping, say } from "../../content/dsl";
import { PLAYABLE_ORDER } from "../../data/characters";

/** Short scripted animations: tweens + dialogue. All violence is cartoonish and stylised. */
export class VignetteScene extends Phaser.Scene {
  private box!: DialogueBox;
  private returnAt = "";

  constructor() {
    super("Vignette");
  }

  async create(data: { id: string; returnAt?: string }) {
    this.returnAt = data.returnAt ?? "";
    this.lastCaption = undefined;
    this.cameras.main.fadeIn(400);
    this.box = new DialogueBox(this, 1000, 0.1);
    const run: Record<string, () => Promise<void>> = {
      kreltower_fall: () => this.kreltower(false),
      kreltower_saved: () => this.kreltower(true),
      pudding: () => this.pudding(),
      flatmate: () => this.flatmate(),
      rival: () => this.rival(),
    };
    await (run[data.id] ?? (async () => undefined))();
    G.s.flags[`vig_${data.id}`] = true;
    G.save();
    this.cameras.main.fadeOut(500);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Hub", { at: this.returnAt, from: "vignette" }));
  }

  private wait(ms: number) {
    return new Promise<void>((res) => this.time.delayedCall(ms, () => res()));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }

  private talk(lines: Line[]) {
    return this.box.play(lines);
  }

  private lastCaption?: Phaser.GameObjects.Text;

  private caption(t: string, color = "#ffffff", size = 34) {
    this.lastCaption?.destroy();
    const c = title(this, 480, 200, t, size, color).setDepth(500);
    c.setScale(0.2);
    this.tweens.add({ targets: c, scale: 1, duration: 300, ease: "Back.out" });
    this.lastCaption = c;
    return c;
  }

  private sky(top: number, bottom: number) {
    const g = this.add.graphics();
    g.fillGradientStyle(top, top, bottom, bottom, 1);
    g.fillRect(0, 0, 960, 540);
    return g;
  }

  private crowd(y: number) {
    const ids = [...PLAYABLE_ORDER.filter((p) => p !== G.s.player), "PROCTUS", G.s.player, "FOLK0", "FOLK1", "FOLK2", "FOLK3"];
    return ids.map((id, i) => this.add.sprite(60 + i * 64, y + (i % 2) * 14, `spr_${id}`, 0).setScale(2.6).setDepth(50));
  }

  // ---------------------------------------------------------------- THE KRELTOWER INCIDENT

  private async kreltower(saved: boolean) {
    this.sky(saved ? 0x7ec8f0 : 0x8fc3ea, 0xf3d9b1);
    const g = this.add.graphics();
    g.fillStyle(0x5a6a80, 1);
    for (let i = 0; i < 20; i++) g.fillRect(i * 50, 300 - ((i * 37) % 90), 44, 300);
    g.fillStyle(0x3d6a2a, 1).fillRect(0, 430, 960, 110);
    const tower = this.add.image(560, 430, "p_kreltower").setOrigin(0.5, 1).setScale(1.6).setDepth(10);
    this.add.text(560, 440, "KRELTOWER", { fontFamily: FONT, fontSize: "11px", color: "#ffffff" }).setOrigin(0.5, 0).setDepth(11);
    const people = this.crowd(470);
    synth.music("airport");
    await this.talk([dir(saved ? "Krelford. Everyone is outside. Everyone is looking up." : "Krelford. Everyone is outside. Everyone is looking up. Somebody drops a fizzy bongo.")]);
    const plane = this.add.image(1020, 120, "p_plane").setScale(2.4).setFlipX(true).setDepth(20);
    if (saved) {
      await this.tween({ targets: plane, x: 640, y: 170, angle: -6, duration: 2200, ease: "Sine.inOut" });
      this.people(people, "!");
      await this.tween({ targets: plane, x: 520, y: 60, angle: -22, duration: 900, ease: "Quad.out" });
      this.caption("PULL UP!!!", "#ffd23f");
      await this.tween({ targets: plane, x: 200, y: 330, angle: 14, duration: 1800, ease: "Sine.in" });
      synth.play("explode");
      const splash = this.add.circle(200, 400, 10, 0xffb6c1, 0.9).setDepth(30);
      this.tween({ targets: splash, radius: 120, alpha: 0, duration: 900 });
      this.add.image(200, 430, "p_tap").setOrigin(0.5, 1).setScale(1.6).setDepth(25);
      plane.setAngle(30);
      this.caption("LANDED (IN THE GREAT TAP)", "#ffb6c1", 28);
      synth.play("cheer");
      this.people(people, "WAHEY");
      await this.wait(1200);
      await this.talk([
        say("KREBLIS", "Krelmergency over. I repeat. Krelmergency over. The plane is in the Tap."),
        say("FLENKY", "Wasn't me. Got out just in time by doing a ninja backflip."),
        say("KREBLIS", "You weren't on it, Jenko."),
        say("FLENKY", "…I was near it."),
        say("KROZNO", "(from inside the Tap, gargling pussy juice) My dirty… bloody… tricks…"),
        ping("DRONGUS", "Kreltower survived ??"),
        ping("DRONGUS", "First time ever"),
        ping("DRONGUS", "Well done I suppose. Still haven't reacted to the song though."),
        dir("KRELTOWER: STILL STANDING. Krozno is arrested and charged with 'being up to his usual dirty bloody tricks'."),
      ]);
      return;
    }
    // The bad ending: it happens, everyone sees it, it collapses, everyone panics.
    await this.tween({ targets: plane, x: 610, y: 260, angle: 6, duration: 2600, ease: "Sine.in" });
    plane.destroy();
    synth.play("boom");
    this.cameras.main.flash(500, 255, 240, 200);
    this.cameras.main.shake(1200, 0.025);
    const fire = this.add.circle(560, 270, 20, 0xff7a00, 0.95).setDepth(15);
    this.tween({ targets: fire, radius: 70, duration: 600 });
    this.people(people, "!!");
    synth.play("gasp");
    await this.talk([say("KREBLIS", "This is a Krelmergency message. Kreltower has been hit. I repeat. Kreltower has been hit.")]);
    for (let i = 0; i < 16; i++) {
      const smoke = this.add.circle(560 + (Math.random() - 0.5) * 80, 260 - Math.random() * 40, 16 + Math.random() * 20, 0x333333, 0.7).setDepth(14);
      this.tween({ targets: smoke, y: smoke.y - 160, alpha: 0, scale: 2.5, duration: 3000 + Math.random() * 1500 });
    }
    await this.wait(1200);
    synth.play("boom");
    this.cameras.main.shake(2600, 0.03);
    fire.destroy();
    this.tween({ targets: tower, scaleY: 0.05, duration: 2600, ease: "Quad.in" });
    for (let i = 0; i < 30; i++) {
      const dust = this.add.circle(560 + (Math.random() - 0.5) * 200, 420, 20 + Math.random() * 30, 0xb8a888, 0.85).setDepth(40);
      this.tween({ targets: dust, x: dust.x + (Math.random() - 0.5) * 600, y: 380 - Math.random() * 120, scale: 3, alpha: 0, duration: 3500 });
    }
    this.caption("KRELTOWER HAS FALLEN", "#ff4d4d");
    // panic
    people.forEach((p, i) => {
      p.setFlipX(i % 2 === 0);
      this.tweens.add({ targets: p, x: i % 2 ? 1040 : -80, duration: 1500 + Math.random() * 1500, delay: 300 + i * 80 });
      this.time.addEvent({ delay: 120, repeat: 20, callback: () => p.setFrame(p.frame.name === "1" ? 2 : 1) });
    });
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 250, () => {
        const t = this.add.text(80 + Math.random() * 800, 300 + Math.random() * 120, ["AAAAAH", "HELP", "NOT AGAIN", "MY BONGO", "RUN", "IS PURPLE HIGH OR LOW", "KRELMERGENCY"][i % 7], { fontFamily: FONT, fontSize: "16px", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setDepth(60);
        this.tween({ targets: t, y: t.y - 40, alpha: 0, duration: 1600 });
      });
    }
    synth.play("alarm");
    await this.wait(3200);
    await this.talk([
      dir("Silence. Then sirens. Then, from somewhere under the dust cloud, a single phone notification."),
      ping("DRONGUS", "No! Not again !!"),
      ping("DRONGUS", "It only just got rebuilt !"),
      say("FLENKY", "Wasn't me. Got out just in time by doing a ninja backflip."),
      say("SCROMBUS", "How would you have— you know what, not today."),
      say("KREZWONK", "I foresaw this. I elected not to prevent it. I'd like that struck from the record."),
      say("GRONNY", "…"),
      say("GRONNY", "Not fair enough."),
      dir("KRELTOWER: DESTROYED (AGAIN). Krozno escaped in the confusion, presumably to be up to his usual dirty bloody tricks. Krelford will rebuild. Krelford always rebuilds. It's on the wiki."),
    ]);
    synth.stopMusic();
  }

  private people(ps: Phaser.GameObjects.Sprite[], text: string) {
    ps.forEach((p, i) => {
      if (i % 2) return;
      const t = this.add.text(p.x, p.y - 50, text, { fontFamily: FONT, fontSize: "14px", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(60);
      this.tween({ targets: t, y: t.y - 20, alpha: 0, duration: 1400 });
      this.tweens.add({ targets: p, y: p.y - 10, yoyo: true, duration: 120, repeat: 3 });
    });
  }

  // ---------------------------------------------------------------- BREAD AND BUTTER PUDDING

  private async pudding() {
    this.sky(0x0a0a1a, 0x1a1a2e);
    const g = this.add.graphics();
    g.fillStyle(0x2a2a2a, 1).fillRect(300, 170, 360, 260);
    g.fillStyle(0x1a1a1a, 1).fillTriangle(280, 175, 680, 175, 480, 100);
    for (const x of [340, 420, 540, 600]) {
      g.fillStyle(0x3b2a1a, 1).fillRect(x, 220, 40, 50);
      g.fillStyle(0x5a3a20, 1).fillRect(x - 4, 236, 48, 6).fillRect(x - 4, 252, 48, 6);
    }
    const door = this.add.rectangle(480, 395, 60, 70, 0x0a0a0a).setDepth(5);
    g.fillStyle(0x222222, 1).fillRect(0, 430, 960, 110);
    this.add.text(480, 150, "(ABANDONED)", { fontFamily: FONT, fontSize: "12px", color: "#666" }).setOrigin(0.5);
    const luke = this.add.sprite(120, 420, "spr_CRONGUS", 0).setScale(3).setDepth(10);
    await this.talk([dir("The abandoned building. A faint smell of custard. And something underneath the custard that the custard is trying to cover up.")]);
    this.time.addEvent({ delay: 140, repeat: 14, callback: () => luke.setFrame(luke.frame.name === "1" ? 2 : 1) });
    await this.tween({ targets: luke, x: 480, duration: 2000 });
    await this.talk([say("CRONGUS", "Hello? Is the… is the bread and butter pudding here?"), dir("Something inside says 'yes'. It is not clear what said it.")]);
    await this.tween({ targets: luke, alpha: 0, scale: 2.6, duration: 600 });
    door.setFillStyle(0x000000);
    await this.wait(1600);
    const moans = ["mmmm", "MMMMMM", "mmmmmmmm…", "oh", "OHHH", "mmmMMMMM", "…mmm", "MMMMMMMMMMM"];
    for (let i = 0; i < 14; i++) {
      this.time.delayedCall(i * 380, () => {
        const t = this.add.text(320 + Math.random() * 320, 180 + Math.random() * 220, moans[i % moans.length], { fontFamily: FONT, fontSize: `${14 + (i % 4) * 5}px`, color: "#ffe4ec", fontStyle: "italic", stroke: "#000", strokeThickness: 3 }).setDepth(30);
        this.tween({ targets: t, y: t.y - 30, alpha: 0, duration: 1500 });
        synth.play(i % 3 ? "mork" : "gasp");
        this.cameras.main.shake(260, 0.004 + i * 0.0012);
        g.setAlpha(i % 2 ? 0.85 : 1);
      });
    }
    await this.wait(14 * 380 + 800);
    this.cameras.main.shake(1200, 0.03);
    this.caption("THE ULTIMATE SENSATION", "#ffe4ec", 30);
    await this.wait(1600);
    this.children.list.filter((o) => o instanceof Phaser.GameObjects.Text && (o as Phaser.GameObjects.Text).text === "THE ULTIMATE SENSATION").forEach((o) => o.destroy());
    await this.wait(1800);
    luke.setAlpha(1).setScale(3).setTint(0x9a9aaa);
    this.time.addEvent({ delay: 300, repeat: 10, callback: () => luke.setFrame(luke.frame.name === "1" ? 2 : 1) });
    await this.tween({ targets: luke, x: 700, duration: 3200 });
    await this.talk([
      dir("Lil' Crongus emerges. He has aged nine years. There is custard on his shoes. There is something that is not custard on his shoes."),
      say("CRONGUS", "…"),
      say("CRONGUS", "I can never come back from that."),
      say("CRONGUS", "The ultimate sensation. They weren't lying. They weren't lying."),
      say("CRONGUS", "I want it again. I want it again right now. Oh no."),
      say("CRONGUS", "Nobody can know. If the group chat finds out… if Drongus finds out… he'll make a song. He'll make a wiki page. He'll make a TV show."),
      ping("DRONGUS", "@LIL' CRONGUS where are you ?"),
      say("CRONGUS", "*puts phone face down*"),
      dir("You have found the bread and butter pudding. You will never speak of it. You will think about it every single day."),
    ]);
  }

  // ---------------------------------------------------------------- CARPET KEV

  private async flatmate() {
    this.add.tileSprite(0, 0, 960, 540, "tile_mansion").setOrigin(0);
    this.add.rectangle(480, 470, 900, 120, 0x7a1f2b, 0.85);
    this.add.text(480, 470, "(the carpet)", { fontFamily: FONT, fontSize: "12px", color: "#d6c49a" }).setOrigin(0.5);
    const kev = this.add.sprite(640, 360, "boss_flatmate", 0).setScale(3).setDepth(10);
    const gron = this.add.sprite(260, 360, "spr_GRONNY", 0).setScale(4).setDepth(10);
    await this.talk([say("CARPET KEV", "Gronny, mate. Let's talk about this. The deposit's coming. I've got a guy."), say("GRONNY", "…"), this.cue("THE CARPET HAS BEEN AVENGED IN SIX PARTS", true)]);
    const hit = async (label: string, fx: () => Promise<void>) => {
      this.caption(label, "#ffd23f", 26);
      await fx();
      await this.wait(500);
      this.children.list.filter((o) => o instanceof Phaser.GameObjects.Text && (o as Phaser.GameObjects.Text).text === label).forEach((o) => o.destroy());
    };
    await hit("PART 1: THE LEAF BLOWER", async () => {
      const blow = this.add.rectangle(320, 360, 80, 14, 0x111111).setDepth(11);
      synth.play("wonk");
      for (let i = 0; i < 12; i++) {
        const l = this.add.circle(340 + i * 20, 350 + Math.sin(i) * 10, 4, 0xb58b00).setDepth(12);
        this.tween({ targets: l, x: l.x + 300, alpha: 0, duration: 500 });
      }
      await this.tween({ targets: kev, x: 900, angle: 720, duration: 700 });
      synth.play("smash");
      this.cameras.main.shake(300, 0.02);
      kev.setScale(3, 1.2).setX(890);
      blow.destroy();
      await this.wait(400);
      kev.setScale(3);
      await this.tween({ targets: kev, x: 640, angle: 0, duration: 400 });
    });
    await hit("PART 2: AN ANVIL (MADE OF UNPAID RENT)", async () => {
      const anvil = this.add.rectangle(640, -40, 70, 40, 0x4b5563).setDepth(12);
      this.add.text(640, -40, "RENT", { fontFamily: FONT, fontSize: "12px", color: "#fff" }).setOrigin(0.5).setDepth(13);
      await this.tween({ targets: anvil, y: 320, duration: 500, ease: "Quad.in" });
      synth.play("banhammer");
      kev.setScale(4, 0.6);
      await this.wait(500);
      anvil.destroy();
      await this.tween({ targets: kev, scaleX: 3, scaleY: 3, duration: 300, ease: "Back.out" });
    });
    await hit("PART 3: RUNESCAPE SPECIAL ATTACK", async () => {
      for (let i = 0; i < 4; i++) {
        await this.wait(250);
        synth.play("crit");
        const t = this.add.text(600 + i * 25, 300 - i * 20, "99", { fontFamily: FONT, fontSize: "30px", color: "#ff2a2a", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setDepth(20);
        this.tween({ targets: t, y: t.y - 40, alpha: 0, duration: 900 });
        kev.setTintFill(0xffffff);
        this.time.delayedCall(80, () => kev.clearTint());
      }
    });
    await hit("PART 4: A PIANO (OUT OF TUNE)", async () => {
      const piano = this.add.rectangle(640, -60, 120, 80, 0x111111).setDepth(12);
      await this.tween({ targets: piano, y: 330, duration: 600, ease: "Quad.in" });
      synth.play("boom");
      for (let i = 0; i < 8; i++) synth.play("select");
      piano.destroy();
      kev.setAngle(90);
      this.add.text(640, 260, "♪ ♫ ♪", { fontFamily: FONT, fontSize: "26px", color: "#ffffff" }).setOrigin(0.5).setDepth(20);
      await this.wait(500);
    });
    await hit("PART 5: ROLLED UP IN THE CARPET", async () => {
      kev.setVisible(false);
      const roll = this.add.rectangle(640, 380, 160, 50, 0x7a1f2b).setStrokeStyle(4, 0xd6c49a).setDepth(12);
      this.add.text(640, 380, "kev (inside)", { fontFamily: FONT, fontSize: "11px", color: "#d6c49a" }).setOrigin(0.5).setDepth(13);
      await this.wait(600);
      await this.tween({ targets: roll, x: 1100, y: -100, angle: 1080, duration: 1400, ease: "Quad.out" });
      const star = this.add.text(930, 30, "✦", { fontFamily: FONT, fontSize: "26px", color: "#ffffff" }).setDepth(20);
      synth.play("ding");
      await this.tween({ targets: star, scale: 2, alpha: 0, duration: 800 });
    });
    await hit("PART 6: CLOSURE", async () => {
      gron.setFrame(3);
      await this.wait(600);
    });
    this.caption("FATALITY (CARPET)", "#ff4d4d", 36);
    synth.play("roar");
    await this.wait(1200);
    await this.talk([
      say("GRONNY", "Fair enough."),
      dir("Somewhere over the horizon, Carpet Kev lands in Kreddle, alive, embarrassed, and permanently rolled in a ruined carpet. He Venmos you the deposit the next morning. With interest."),
      dir("The carpet is avenged."),
    ]);
  }

  private cue(t: string, isDir = true): Line {
    return isDir ? dir(t) : say("NARRATOR", t);
  }

  // ---------------------------------------------------------------- BRICK KOLBANE

  private async rival() {
    this.add.tileSprite(0, 0, 960, 540, "tile_industrial").setOrigin(0);
    const brick = this.add.sprite(480, 380, "boss_rival", 0).setScale(3.2).setDepth(10);
    const bar = this.add.image(480, 300, "p_barbell").setScale(3).setDepth(11);
    this.add.sprite(200, 380, "spr_KREZWONK", 0).setScale(4).setDepth(10);
    await this.talk([
      say("BRICK KOLBANE", "You think you beat me? I'll show you. FIVE HUNDRED. Overhead. Right now."),
      say("KREZWONK", "Let me help you load the bar."),
      dir("You add a plate. Then another. Then you keep adding plates. Brick is too proud to stop you."),
    ]);
    for (let i = 0; i < 6; i++) {
      const plate = this.add.rectangle(i % 2 ? 610 + Math.floor(i / 2) * 12 : 350 - Math.floor(i / 2) * 12, 300, 10, 60, 0x111111).setDepth(12);
      synth.play("select");
      await this.tween({ targets: plate, scaleY: 1.2, yoyo: true, duration: 120 });
    }
    this.caption("700KG", "#ffd23f", 30);
    await this.wait(700);
    await this.tween({ targets: bar, y: 250, duration: 900, ease: "Sine.out" });
    await this.talk([say("BRICK KOLBANE", "EASY. EASY. I'M NOT EVEN—"), say("KREZWONK", "I foresee you dropping it.")]);
    synth.play("banhammer");
    this.cameras.main.shake(800, 0.03);
    await this.tween({ targets: bar, y: 370, duration: 250, ease: "Quad.in" });
    brick.setScale(5, 0.35).setY(400);
    this.caption("RE-RACKED. PERMANENTLY.", "#ff4d4d", 30);
    await this.wait(1500);
    await this.talk([
      dir("Brick Kolbane has been flattened into a perfect, gym-floor-shaped pancake. Cartoon birds circle where his head used to be."),
      say("KREZWONK", "I foresaw this. I elected not to prevent it."),
      dir("The gym erupts in applause. For the first time in Krunch Gym's history, every weight is re-racked."),
    ]);
  }
}
