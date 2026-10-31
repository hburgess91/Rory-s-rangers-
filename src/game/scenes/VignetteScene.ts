import Phaser from "phaser";
import type { Line } from "../../data/types";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, title } from "../ui/theme";
import { dir, gabor, ping, say } from "../../content/dsl";
import { PLAYABLE_ORDER } from "../../data/characters";
import { animateWalker, backdrop } from "../gfx/HD";
import { CHARACTERS } from "../../data/characters";
import { flap, fall, randomZone } from "../combat/Wonk";
import { maybeFinishArc } from "../systems/arcs";

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
      pudding_spy: () => this.pudding(G.s.player),
      pudding_raid: () => this.puddingRaid(),
      plane_escape: () => this.planeEscape(),
      flatmate: () => this.flatmate(),
      rival: () => this.rival(),
      press_conference: () => this.pressConference(),
      polson_gym: () => this.polsonGym(),
      polson_cctv: () => this.polsonCctv(),
      polson_gym2: () => this.polsonGym2(),
      polson_mouth: () => this.polsonMouth(),
      sanmik_lampe: () => this.sanmikLampe(),
      sanmik_nation: () => this.sanmikNation(),
      wahooga: () => this.wahooga(),
    };
    await (run[data.id] ?? (async () => undefined))();
    G.s.flags[`vig_${data.id}`] = true;
    G.save();
    this.cameras.main.fadeOut(500);
    const next =
      data.id === "wahooga"
        ? () => switchTo(this, "CharSelect", { swap: true })
        : data.id === "sanmik_lampe"
          ? () => switchTo(this, "Dungeon", { dungeon: "arena_sanmik", room: 0 })
          : () => switchTo(this, "Hub", { at: this.returnAt, from: "vignette" });
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, next);
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
    const skyG = this.sky(saved ? 0x7ec8f0 : 0x8fc3ea, 0xf3d9b1);
    const g = this.add.graphics();
    g.fillStyle(0x5a6a80, 1);
    for (let i = 0; i < 20; i++) g.fillRect(i * 50, 300 - ((i * 37) % 90), 44, 300);
    g.fillStyle(0x3d6a2a, 1).fillRect(0, 430, 960, 110);
    if (backdrop(this, "bg_city", { depth: -10 })) {
      skyG.setVisible(false);
      g.setVisible(false);
    }
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
      this.time.addEvent({ delay: 120, repeat: 20, callback: () => animateWalker(p, i % 2 ? 1 : -1, 0, true, this.time.now) });
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

  /** `spy` = the player is somebody else, watching Lulon from the bushes. */
  private async pudding(spy?: string) {
    const watcherId = spy ?? (G.s.flags.pudding_follower as string) ?? PLAYABLE_ORDER.filter((id) => id !== "CRONGUS")[Math.floor(Math.random() * 8)];
    if (!spy) G.s.flags.pudding_follower = watcherId;
    const skyP = this.sky(0x0a0a1a, 0x1a1a2e);
    const g = this.add.graphics();
    g.fillStyle(0x2a2a2a, 1).fillRect(300, 170, 360, 260);
    g.fillStyle(0x1a1a1a, 1).fillTriangle(280, 175, 680, 175, 480, 100);
    for (const x of [340, 420, 540, 600]) {
      g.fillStyle(0x3b2a1a, 1).fillRect(x, 220, 40, 50);
      g.fillStyle(0x5a3a20, 1).fillRect(x - 4, 236, 48, 6).fillRect(x - 4, 252, 48, 6);
    }
    const door = this.add.rectangle(480, 395, 60, 70, 0x0a0a0a).setDepth(5);
    g.fillStyle(0x222222, 1).fillRect(0, 430, 960, 110);
    const abLbl = this.add.text(480, 150, "(ABANDONED)", { fontFamily: FONT, fontSize: "12px", color: "#666" }).setOrigin(0.5);
    if (backdrop(this, "bg_abandoned", { depth: -10 })) {
      skyP.setVisible(false);
      abLbl.setVisible(false);
      door.setAlpha(0.25);
      g.clear();
    }
    const luke = this.add.sprite(120, 420, "spr_CRONGUS", 0).setScale(3).setDepth(10);
    // someone is in the bushes
    const watcher = this.add.sprite(-30, 450, `spr_${watcherId}`, 0).setScale(2.6).setDepth(12).setAlpha(spy ? 1 : 0.0);
    const bush = this.add.ellipse(20, 470, 150, 70, 0x1f3d1f).setDepth(13).setStrokeStyle(3, 0x0f200f);
    const wName = CHARACTERS[watcherId]?.name ?? watcherId;
    if (spy) {
      this.tween({ targets: watcher, x: 30, duration: 900 });
      await this.talk([
        dir("You're in a bush outside the abandoned building. Lil' Crongus is walking up to the door, looking over his shoulder every three steps."),
        say(spy, "There he goes. Up to some sick shit. Stay low."),
      ]);
    }
    await this.talk([dir("The abandoned building. A faint smell of custard. And something underneath the custard that the custard is trying to cover up.")]);
    this.time.addEvent({ delay: 140, repeat: 14, callback: () => animateWalker(luke, 1, 0, true, this.time.now) });
    await this.tween({ targets: luke, x: 480, duration: 2000 });
    await this.talk([say("CRONGUS", "Hello? Is the… is the bread and butter pudding here?"), dir("Something inside says 'yes'. It is not clear what said it.")]);
    await this.tween({ targets: luke, alpha: 0, scale: 2.6, duration: 600 });
    door.setFillStyle(0x000000);
    await this.wait(1600);
    synth.music("bbp", true);
    const moans = ["mmmm", "mm fuck yes", "MMMMMM", "MMM FUCK YES", "mmmmmmmm…", "oh", "fuck yes…", "OHHH", "mmmMMMMM", "…mmm", "MM. FUCK. YES.", "MMMMMMMMMMM"];
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
    // the wonk
    if (spy) {
      await this.talk([dir("From inside: a slow, rhythmic creaking. Then a faster one."), say(spy, "Oh no. He's wonking. He's wonking in there. Over the pudding.")]);
    } else await this.puddingWonk();
    this.cameras.main.shake(1200, 0.03);
    this.caption("THE ULTIMATE SENSATION", "#ffe4ec", 30);
    await this.wait(1600);
    this.children.list.filter((o) => o instanceof Phaser.GameObjects.Text && (o as Phaser.GameObjects.Text).text === "THE ULTIMATE SENSATION").forEach((o) => o.destroy());
    await this.wait(1800);
    luke.setAlpha(1).setScale(3).setTint(0x9a9aaa);
    // Boggor Cranstil has been waiting in the shadows by the door
    const boggorKey = this.textures.exists("spr_BOGGOR") ? "spr_BOGGOR" : "spr_FOLK2";
    const boggor = this.add.sprite(600, 420, boggorKey, 0).setScale(3).setDepth(9).setAlpha(0);
    if (boggorKey === "spr_FOLK2") boggor.setTint(0x8a7a6a);
    this.tween({ targets: boggor, alpha: 1, duration: 800 });
    const walk = this.time.addEvent({ delay: 90, loop: true, callback: () => animateWalker(luke, 1, 0, true, this.time.now) });
    await this.tween({ targets: luke, x: 700, duration: 3200 });
    walk.remove();
    animateWalker(luke, 0, 1, false, this.time.now);
    luke.setData("facing", "west");
    animateWalker(luke, 0, 0, false, this.time.now);
    await this.talk([
      dir("Someone is standing by the door. A hunched shape in a stained cardigan. He has been there the whole time."),
      say("BOGGOR CRANSTIL", "Heh heh…"),
      say("BOGGOR CRANSTIL", "Now it's Boggor's time for some lovely bread and butter pudding…"),
      say("BOGGOR CRANSTIL", "Nice to see I'm not the only one with this particular… taste."),
    ]);
    const bwalk = this.time.addEvent({ delay: 110, loop: true, callback: () => animateWalker(boggor, -1, 0, true, this.time.now) });
    await this.tween({ targets: boggor, x: 480, y: 400, duration: 1600 });
    bwalk.remove();
    await this.tween({ targets: boggor, alpha: 0, duration: 500 });
    boggor.destroy();
    await this.wait(700);
    const m = this.add.text(480, 330, "…mmm.", { fontFamily: FONT, fontSize: "16px", color: "#ffe4ec", fontStyle: "italic", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(30);
    this.tween({ targets: m, y: 300, alpha: 0, duration: 1600 });
    await this.wait(1000);
    await this.talk([
      say("CRONGUS", "…what did he mean by that."),
      say("CRONGUS", "Doesn't matter. Nobody saw. Nobody saw anything."),
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
    if (spy) {
      await this.talk([say(spy, "Got it all on video. Every 'mm fuck yes'."), say(spy, "The Krelford Gazette is going to pay me so much for this.")]);
    } else {
      watcher.setAlpha(1).setX(30);
      this.tween({ targets: watcher, x: -60, duration: 1400 });
      await this.talk([dir(`In the bush by the gate, a phone camera light clicks off. ${wName} was there the whole time. ${wName} saw everything.`), dir("You didn't notice. You never notice.")]);
    }
    bush.destroy();
    synth.stopMusic();
  }

  /** Inside the pudding house: a short wonk, flappy-style, to the moans. */
  private async puddingWonk() {
    const z = randomZone();
    const g0 = { gauge: 0, vel: 0 };
    let inZone = 0;
    const need = Math.min(1500, z.need * 0.7);
    const ui = this.add.container(0, 0).setDepth(60);
    ui.add(this.add.rectangle(480, 270, 960, 540, 0x1a0010, 0.6));
    ui.add(this.add.text(480, 80, "WONK IT (OVER THE PUDDING)", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#ff9ad5", stroke: "#2a0030", strokeThickness: 7 }).setOrigin(0.5));
    ui.add(this.add.text(480, 116, "Tap / SPACE to flap it up. Keep it in the zone. Mm fuck yes.", { fontFamily: FONT, fontSize: "14px", color: "#ffffff" }).setOrigin(0.5));
    const GX = 700;
    const GY = 150;
    const GH = 300;
    ui.add(this.add.rectangle(GX, GY + GH / 2, 50, GH + 6, 0x000000, 0.8).setStrokeStyle(3, 0xffffff, 0.8));
    ui.add(this.add.rectangle(GX, GY + GH * (1 - (z.lo + z.hi) / 2), 50, GH * (z.hi - z.lo), 0x22c55e, 0.4));
    const fillR = this.add.rectangle(GX, GY + GH, 40, 0, 0xff4fa3).setOrigin(0.5, 1);
    ui.add(fillR);
    const censor = this.add.rectangle(380, 330, 200, 60, 0x000000);
    ui.add([this.add.sprite(380, 290, "spr_CRONGUS", 0).setScale(4), censor, this.add.text(380, 330, "CENSORED", { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#ffffff" }).setOrigin(0.5)]);
    const status = this.add.text(380, 420, "", { fontFamily: "Impact, sans-serif", fontSize: "24px", color: "#ffe4ec", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5);
    ui.add(status);
    const press = () => flap(g0);
    this.input.keyboard?.on("keydown-SPACE", press);
    this.input.on("pointerdown", press);
    let t = 0;
    let result = "under" as "perfect" | "over" | "under";
    await new Promise<void>((res) => {
      const ev = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          t += 16;
          fall(g0, 16);
          if (g0.gauge >= z.lo && g0.gauge <= z.hi) inZone += 16;
          fillR.setSize(40, GH * g0.gauge);
          fillR.setFillStyle(g0.gauge > z.hi ? 0xef4444 : g0.gauge >= z.lo ? 0x22c55e : 0xff4fa3);
          status.setText(g0.gauge > z.hi ? "TOO MUCH" : g0.gauge >= z.lo ? "mm fuck yes" : "mmmm…");
          if (g0.gauge >= 0.97) result = "over";
          else if (inZone >= need) result = "perfect";
          if (result !== "under" || t > 7000) {
            ev.remove();
            res();
          }
        },
      });
    });
    this.input.keyboard?.off("keydown-SPACE", press);
    this.input.off("pointerdown", press);
    ui.destroy();
    this.caption(result === "perfect" ? "MM. FUCK. YES." : result === "over" ? "TOO EARLY. INTO THE PUDDING." : "NOTHING. NOT EVEN FOR THE PUDDING.", "#ffe4ec", 30);
    await this.wait(1400);
  }

  // ---------------------------------------------------------------- THE PUDDING RAID

  private async puddingRaid() {
    const leakerId = (G.s.player === "CRONGUS" ? (G.s.flags.pudding_follower as string) : G.s.player) ?? "KREBLIS";
    const leaker = CHARACTERS[leakerId]?.name ?? leakerId;
    if (!backdrop(this, "bg_press", { depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x1e2a44);
    synth.music("ominous");
    const paper = this.add.container(480, 270).setDepth(200);
    paper.add(this.add.rectangle(0, 0, 760, 400, 0xf4ecd8).setStrokeStyle(4, 0x1f1f1f));
    paper.add(this.add.text(0, -165, "THE KRELFORD GAZETTE", { fontFamily: "Georgia, serif", fontSize: "30px", color: "#111", fontStyle: "bold" }).setOrigin(0.5));
    paper.add(this.add.rectangle(0, -140, 700, 3, 0x111111));
    paper.add(this.add.text(0, -80, "CHILDREN'S MINISTER IN\nPUDDING HOUSE SHAME", { fontFamily: "Georgia, serif", fontSize: "32px", color: "#7f1d1d", fontStyle: "bold", align: "center" }).setOrigin(0.5));
    paper.add(this.add.text(0, 30, "\u201cmm fuck yes\u201d — exclusive footage inside", { fontFamily: "Georgia, serif", fontSize: "20px", color: "#111", fontStyle: "italic" }).setOrigin(0.5));
    paper.add(this.add.text(0, 110, `Footage supplied by a source close to the minister (${leaker})`, { fontFamily: "Georgia, serif", fontSize: "15px", color: "#444" }).setOrigin(0.5));
    paper.setScale(0.2).setAngle(-540);
    await this.tween({ targets: paper, scale: 1, angle: 0, duration: 700, ease: "Back.easeOut" });
    synth.play("smash");
    await this.talk([dir(`${leaker} has leaked the pudding footage. It is on the front page. It is on every front page.`)]);
    await this.tween({ targets: paper, y: 800, angle: 12, duration: 500, ease: "Quad.easeIn" });
    paper.destroy();
    this.add.text(480, 60, "KRELFORD CONSTABULARY · EMERGENCY PRESS CONFERENCE", { fontFamily: FONT, fontSize: "18px", color: "#ffffff", fontStyle: "bold", backgroundColor: "#1e3a8acc", padding: { x: 10, y: 4 } }).setOrigin(0.5);
    this.add.rectangle(480, 330, 120, 90, 0x5a3a20).setDepth(20);
    const swigKey = this.textures.exists("npc_swig") ? "npc_swig" : "spr_FOLK1";
    this.add.sprite(480, 280, swigKey, 0).setScale(3).setDepth(15);
    for (let i = 0; i < 8; i++) this.add.sprite(120 + i * 100, 470 + (i % 2) * 14, `spr_FOLK${i % 4}`, 0).setScale(2.6).setDepth(30 + i);
    const flashes = this.time.addEvent({ delay: 900, loop: true, callback: () => { if (Math.random() < 0.5) this.cameras.main.flash(80, 255, 255, 255); synth.play("pop"); } });
    await this.talk([
      say("SERGEANT SWIG", "Thank you all for coming. I'll keep this brief."),
      say("SERGEANT SWIG", "We have reviewed the footage. All of it. Twice, by accident."),
      say("SERGEANT SWIG", "Luke Shears is a sick cunt."),
      dir("The room erupts. A journalist faints into another journalist."),
      say("JOURNALIST", "Sergeant, what are you going to do about the pudding house?"),
      say("SERGEANT SWIG", "Conventional policing has failed. I have authorised the army."),
    ]);
    flashes.remove();
    // ---- the tanks
    this.children.removeAll(true);
    this.cameras.main.flash(300, 255, 255, 255);
    if (!backdrop(this, "bg_abandoned", { depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x222233);
    const house = this.add.rectangle(480, 300, 420, 300, 0x000000, 0).setDepth(1);
    synth.music("boss", true);
    const tanks = [0, 1, 2].map((i) => {
      const t = this.textures.exists("p_tank") ? this.add.image(-200 - i * 220, 440 + i * 22, "p_tank").setScale(1.3) : this.add.rectangle(-200 - i * 220, 440 + i * 22, 140, 60, 0x4b5320).setStrokeStyle(3, 0x000000);
      t.setDepth(50 + i);
      return t;
    });
    this.caption("OPERATION CUSTARD STORM", "#ffd23f", 30);
    await Promise.all(tanks.map((t, i) => this.tween({ targets: t, x: 120 + i * 170, duration: 2600, ease: "Sine.out" })));
    const boom = (x: number, y: number) => {
      for (let k = 0; k < 3; k++) {
        const c = this.add.circle(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60, 10, [0xffd23f, 0xff7a1a, 0xffffff][k], 0.95).setDepth(70);
        this.tween({ targets: c, radius: 70 + Math.random() * 50, alpha: 0, duration: 600 + k * 150 });
      }
      synth.play("explode");
      this.cameras.main.shake(300, 0.02);
    };
    for (let volley = 0; volley < 4; volley++) {
      for (const t of tanks) {
        const sx = (t as any).x + 70;
        const sy = (t as any).y - 20;
        const shell = this.add.circle(sx, sy, 6, 0xffffff).setDepth(60);
        this.tween({ targets: t, x: (t as any).x - 12, duration: 80, yoyo: true });
        const tx = 380 + Math.random() * 200;
        const ty = 200 + Math.random() * 180;
        await this.tween({ targets: shell, x: tx, y: ty, duration: 260 });
        shell.destroy();
        boom(tx, ty);
      }
      await this.wait(250);
    }
    // the house comes down
    this.cameras.main.shake(1600, 0.035);
    const rubble = this.add.graphics().setDepth(40);
    rubble.fillStyle(0x1a1a1a, 1);
    for (let i = 0; i < 26; i++) rubble.fillRect(300 + Math.random() * 360, 330 + Math.random() * 110, 20 + Math.random() * 50, 10 + Math.random() * 30);
    const dark = this.add.rectangle(480, 250, 460, 300, 0x0a0a0a, 0).setDepth(39);
    await this.tween({ targets: dark, fillAlpha: 0.92, duration: 900 });
    for (let i = 0; i < 12; i++) {
      const smoke = this.add.circle(320 + Math.random() * 320, 380, 20 + Math.random() * 20, 0x777777, 0.6).setDepth(45);
      this.tween({ targets: smoke, y: 120, radius: 70, alpha: 0, duration: 2600 + Math.random() * 1200, delay: i * 120 });
    }
    house.destroy();
    this.caption("THE PUDDING HOUSE HAS BEEN DESTROYED", "#ffe4ec", 28);
    await this.wait(1800);
    synth.stopMusic();
    const lukeX = this.add.sprite(860, 450, "spr_CRONGUS", 0).setScale(3).setDepth(80);
    lukeX.setAlpha(0);
    await this.tween({ targets: lukeX, alpha: 1, duration: 600 });
    await this.talk([
      dir("A small, dusty figure watches from the edge of the rubble. There is custard on his shoes."),
      say("CRONGUS", "…"),
      say("CRONGUS", G.s.player === "CRONGUS" ? `${leaker}. You absolute snake.` : `${leaker}. You absolute snake. I saw you in the bush.`),
      say("CRONGUS", "Doesn't matter. I know a guy who does it in a caravan."),
      dir("Somewhere on the edge of Krelford, a caravan's suspension creaks. Lightly. Then rhythmically."),
    ]);
    G.s.flags.pudding_house_destroyed = true;
  }

  // ---------------------------------------------------------------- ROBBO

  private async flatmate() {
    if (!backdrop(this, "bg_flat", { depth: -10 })) {
      this.add.tileSprite(0, 0, 960, 540, "tile_mansion").setOrigin(0);
      this.add.rectangle(480, 470, 900, 120, 0x7a1f2b, 0.85);
      this.add.text(480, 470, "(the carpet)", { fontFamily: FONT, fontSize: "12px", color: "#d6c49a" }).setOrigin(0.5);
    }
    const kev = this.add.sprite(640, 360, "boss_flatmate", 0).setScale(3).setDepth(10);
    const gron = this.add.sprite(260, 360, "spr_GRONNY", 0).setScale(4).setDepth(10);
    await this.talk([say("ROBBO", "Gronny, mate. Let's talk about this. The deposit's coming. I've got a guy."), say("GRONNY", "…"), this.cue("THE CARPET HAS BEEN AVENGED IN SIX PARTS", true)]);
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
      const anvil = this.textures.exists("p_anvil") ? this.add.image(640, -40, "p_anvil").setScale(1.5).setDepth(12) : this.add.rectangle(640, -40, 70, 40, 0x4b5563).setDepth(12);
      if (!this.textures.exists("p_anvil")) this.add.text(640, -40, "RENT", { fontFamily: FONT, fontSize: "12px", color: "#fff" }).setOrigin(0.5).setDepth(13);
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
      const piano = this.textures.exists("p_piano") ? this.add.image(640, -60, "p_piano").setScale(1.4).setDepth(12) : this.add.rectangle(640, -60, 120, 80, 0x111111).setDepth(12);
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
      const roll = this.textures.exists("p_carpet_roll") ? this.add.image(640, 380, "p_carpet_roll").setScale(1.3).setDepth(12) : this.add.rectangle(640, 380, 160, 50, 0x7a1f2b).setStrokeStyle(4, 0xd6c49a).setDepth(12);
      this.add.text(640, 380, "robbo (inside)", { fontFamily: FONT, fontSize: "11px", color: "#d6c49a" }).setOrigin(0.5).setDepth(13);
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
      dir("Somewhere over the horizon, Robbo lands in Kreddle, alive, embarrassed, and permanently rolled in a ruined carpet. He Venmos you the deposit the next morning. With interest."),
      dir("The carpet is avenged."),
    ]);
  }

  private cue(t: string, isDir = true): Line {
    return isDir ? dir(t) : say("NARRATOR", t);
  }

  // ---------------------------------------------------------------- CHAD DELTOID

  private async rival() {
    if (!backdrop(this, "bg_gym", { depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_industrial").setOrigin(0);
    const brick = this.add.sprite(480, 380, "boss_rival", 0).setScale(3.2).setDepth(10);
    const bar = this.add.image(480, 300, "p_barbell").setScale(3).setDepth(11);
    this.add.sprite(200, 380, "spr_KREZWONK", 0).setScale(4).setDepth(10);
    await this.talk([
      say("CHAD DELTOID", "You think you beat me? I'll show you. FIVE HUNDRED. Overhead. Right now."),
      say("KREZWONK", "Let me help you load the bar."),
      dir("You add a plate. Then another. Then you keep adding plates. Chad is too proud to stop you."),
    ]);
    for (let i = 0; i < 6; i++) {
      const plate = this.add.rectangle(i % 2 ? 610 + Math.floor(i / 2) * 12 : 350 - Math.floor(i / 2) * 12, 300, 10, 60, 0x111111).setDepth(12);
      synth.play("select");
      await this.tween({ targets: plate, scaleY: 1.2, yoyo: true, duration: 120 });
    }
    this.caption("700KG", "#ffd23f", 30);
    await this.wait(700);
    await this.tween({ targets: bar, y: 250, duration: 900, ease: "Sine.out" });
    await this.talk([say("CHAD DELTOID", "EASY. EASY. I'M NOT EVEN—"), say("KREZWONK", "I foresee you dropping it.")]);
    synth.play("banhammer");
    this.cameras.main.shake(800, 0.03);
    await this.tween({ targets: bar, y: 370, duration: 250, ease: "Quad.in" });
    brick.setScale(5, 0.35).setY(400);
    this.caption("RE-RACKED. PERMANENTLY.", "#ff4d4d", 30);
    await this.wait(1500);
    await this.talk([
      dir("Chad Deltoid has been flattened into a perfect, gym-floor-shaped pancake. Cartoon birds circle where his head used to be."),
      say("KREZWONK", "I foresaw this. I elected not to prevent it."),
      dir("The gym erupts in applause. For the first time in Krunch Gym's history, every weight is re-racked."),
    ]);
  }

  // ---------------------------------------------------------------- CUDDLE CRONSTER PRESS CONFERENCE

  private async pressConference() {
    if (!backdrop(this, "bg_press", { depth: -10 })) {
      this.add.rectangle(480, 270, 960, 540, 0x1e2a44);
      this.add.rectangle(480, 120, 700, 120, 0x1e3a8a).setStrokeStyle(4, 0xfacc15);
    }
    this.add.text(480, 60, "KRELFORD CONSTABULARY · PRESS CONFERENCE", { fontFamily: FONT, fontSize: "20px", color: "#ffffff", fontStyle: "bold", align: "center", backgroundColor: "#1e3a8acc", padding: { x: 10, y: 4 } }).setOrigin(0.5);
    this.add.rectangle(480, 330, 120, 90, 0x5a3a20).setDepth(20);
    const swig = this.add.sprite(480, 280, "npc_swig", 0).setScale(3).setDepth(15);
    const press: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < 9; i++) {
      const tex = i === 4 ? "npc_journo" : `spr_FOLK${i % 4}`;
      press.push(this.add.sprite(110 + i * 92, 470 + (i % 2) * 14, tex, 0).setScale(tex === "npc_journo" ? 1.6 : 2.6).setDepth(30 + i));
    }
    synth.music("ominous");
    // front page first: who the Cuddle Cronster is
    const paper = this.add.container(480, 270).setDepth(200);
    paper.add(this.add.rectangle(0, 0, 760, 420, 0xf4ecd8).setStrokeStyle(4, 0x1f1f1f));
    paper.add(this.add.text(0, -180, "THE KRELFORD KRONICLE", { fontFamily: "Georgia, serif", fontSize: "30px", color: "#111", fontStyle: "bold" }).setOrigin(0.5));
    paper.add(this.add.rectangle(0, -155, 700, 3, 0x111111));
    paper.add(this.add.text(0, -110, "TERROR GRIPS KRELFORD AS THE\n\u201cCUDDLE CRONSTER\u201d STRIKES AGAIN", { fontFamily: "Georgia, serif", fontSize: "28px", color: "#7f1d1d", fontStyle: "bold", align: "center" }).setOrigin(0.5));
    paper.add(this.add.text(0, -20, "\u201cI'll cuddle you, squeeze you, and extract all your lovely juices\u201d  \u263a", { fontFamily: "Comic Sans MS, cursive", fontSize: "20px", color: "#be185d", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5));
    if (this.textures.exists("p_token")) paper.add(this.add.image(-250, 110, "p_token").setDisplaySize(90, 90));
    paper.add(this.add.text(40, 110, "Cuddle token found at the scene.\nMotto: \u201cSweet hugs, sweeter squeezes.\u201d", { fontFamily: "Georgia, serif", fontSize: "18px", color: "#111", align: "center" }).setOrigin(0.5));
    paper.setScale(0.2).setAngle(-540);
    await this.tween({ targets: paper, scale: 1, angle: 0, duration: 700, ease: "Back.easeOut" });
    synth.play("smash");
    await this.talk([
      say("NEWSREADER", "Krelford is once again in the icy grip of terror as the elusive criminal known only as the \"Cuddle Cronster\" continues his reign of bizarre and unsettling crimes."),
      say("NEWSREADER", "The latest victim, identified only as a local woman from the outskirts of town, discovered a cryptic note in her home. Written in disturbingly cheery handwriting, it read:"),
      say("NEWSREADER", "\"I'll cuddle you, squeeze you, and extract all your lovely juices.\""),
      say("NEWSREADER", "The note was signed with an unsettlingly cheerful smiley face and accompanied by one of the Cronster's infamous edible \"cuddle tokens\" – intricate chocolate coins that bear his terrifying motto: \"Sweet hugs, sweeter squeezes.\""),
      dir("POLICE HOLD CHAOTIC PRESS CONFERENCE"),
    ]);
    await this.tween({ targets: paper, y: 800, angle: 12, duration: 500, ease: "Quad.easeIn" });
    paper.destroy();
    // an occasional press camera flash, not a strobe
    const flashes = this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        const p = press[Math.floor(Math.random() * press.length)];
        const f = this.add.circle(p.x + 10, p.y - 30, 14, 0xffffff, 0.9).setDepth(80);
        this.tween({ targets: f, alpha: 0, scale: 2.5, duration: 220 }).then(() => f.destroy());
      },
    });
    await this.talk([
      dir("In a hastily organised press conference earlier today, Sergeant Grimbolus Swig, the lead investigator on the case, addresses the growing panic in Krelford. He stands before a tense room filled with journalists."),
      say("SERGEANT SWIG", "Krelford. Please. Remain calm. The situation is under control."),
      dir("He attempts to downplay the Cronster's activities. However, things quickly unravel when he begins discussing the chocolate tokens left behind by the criminal."),
    ]);
    flashes.remove();
    const drool = this.add.text(500, 262, "💧", { fontSize: "18px" }).setDepth(16);
    this.tweens.add({ targets: drool, y: 300, alpha: 0, duration: 900, repeat: -1 });
    await this.talk([
      dir("He begins salivating. Then drooling."),
      say("SERGEANT SWIG", "We've got to find them all!"),
      dir("His eyes gleam with excitement."),
      say("SERGEANT SWIG", "There are several different flavors I've yet to try—dark choccy, mint choccy, caramel choccy, even that fancy ruby choccy! Honestly, it's the real treasure in all this!"),
      dir("The crowd of reporters stares in stunned silence. Then a female journalist bravely asks the question on everyone's mind."),
      say("JOURNALIST", "Why are you more interested in the tokens than in apprehending the Cuddle Cronster?"),
      dir("Sergeant Swig pauses, visibly annoyed."),
      say("SERGEANT SWIG", "I'm sorry, did anyone else hear that incomprehensible high-pitched screeching, squawking noise?"),
    ]);
    synth.play("laugh");
    for (const p of press) {
      const t = this.add.text(p.x, p.y - 60, ["BOOO", "SHAME", "BOOOO", "OI"][Math.floor(Math.random() * 4)], { fontFamily: FONT, fontSize: "16px", color: "#ff6b6b", fontStyle: "bold", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(60);
      this.tween({ targets: t, y: t.y - 30, alpha: 0, duration: 1200 });
    }
    await this.talk([dir("His dismissive remark is met with an immediate chorus of boos and jeers from the press."), say("SERGEANT SWIG", "Oh, fuck off!")]);
    swig.setFrame(3);
    this.caption("BANG BANG BANG", "#ffd23f", 34);
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 160, () => {
        synth.play("shoot");
        this.cameras.main.shake(100, 0.01);
        const target = press[Math.floor(Math.random() * press.length)];
        const fl = this.add.circle(510, 300, 10, 0xffd23f).setDepth(40);
        this.tween({ targets: fl, x: target.x, y: target.y - 20, duration: 120 }).then(() => fl.destroy());
      });
    }
    press.forEach((p, i) => this.tweens.add({ targets: p, x: i % 2 ? p.x + 600 : p.x - 600, duration: 1400, delay: 200 + i * 60 }));
    await this.wait(2000);
    synth.stopMusic();
    await this.talk([
      dir("He pulls out his sidearm and fires indiscriminately into the audience. Journalists dive under chairs, behind cameras, and in one case into a bin."),
      dir("CHAOS AND CONTROVERSY"),
      say("NEWSREADER", "Many are now questioning the competence of law enforcement to handle the case."),
      say("NEWSREADER", "Meanwhile, experts warn that the Cronster's chocolate tokens—though delicious—may serve a sinister purpose. Dr. Grungus Florp, a leading criminal psychologist, believes the tokens are a psychological tool designed to distract and disarm investigators."),
      say("DR. GRUNGUS FLORP", "The Cuddle Cronster is a master manipulator. By combining his grotesque threats with sweet, irresistible treats, he's playing a twisted game with the authorities. And clearly, it's working."),
      dir("A COMMUNITY ON EDGE"),
      say("NEWSREADER", "As the hunt for the Cuddle Cronster continues, Krelford residents remain on high alert. Citizens have been urged to report any suspicious activity and to avoid consuming any chocolate tokens they may find—no matter how tempting."),
      say("NEWSREADER", "But as tensions rise and trust in law enforcement plummets, one question remains: will the Cuddle Cronster be stopped before he strikes again? Or will Krelford continue to spiral into fear, chaos, and chocolate-fueled madness?"),
      say("NEWSREADER", "For now, the Cuddle Cronster roams free, leaving only his disturbing notes and sweet, sinister tokens in his wake."),
      say("SERGEANT SWIG", "(quietly, to you, reloading) Find the tokens. Bring them to me. For evidence."),
      dir("NEW OBJECTIVE: find six chocolate cuddle tokens around Krelford. They glow pink."),
    ]);
  }

  // ---------------------------------------------------------------- POLSON GETS FIT

  private async polsonGym() {
    if (!backdrop(this, "bg_gym", { depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_industrial").setOrigin(0);
    const hasTm = this.textures.exists("p_treadmill");
    const tm = this.add.rectangle(480, 400, 220, 30, 0x111111, hasTm ? 0 : 1).setDepth(5);
    if (hasTm) this.add.image(500, 410, "p_treadmill").setOrigin(0.5, 1).setScale(1.5).setDepth(5);
    else {
      this.add.rectangle(560, 340, 12, 100, 0x374151).setDepth(5);
      this.add.text(480, 300, "TREADMILL", { fontFamily: FONT, fontSize: "12px", color: "#fff" }).setOrigin(0.5);
    }
    const pol = this.add.sprite(200, 380, "spr_POLSON", 0).setScale(3).setDepth(10);
    const me = this.add.sprite(120, 390, `spr_${G.s.player}`, 0).setScale(3).setDepth(10);
    synth.music("hub");
    await this.talk([
      dir("Krunch Gym. You have taken Polson for 'an intense workout'. He is wearing brand new trainers, brand new shorts and a headband. The tags are still on all of them."),
      say("POLSON", "Right. Let's do this. Intense. Proper intense."),
    ]);
    await this.tween({ targets: pol, x: 470, y: 370, duration: 900 });
    synth.play("select");
    const belt = this.time.addEvent({ delay: 80, loop: true, callback: () => tm.setFillStyle(tm.fillColor === 0x111111 ? 0x222222 : 0x111111) });
    this.time.addEvent({ delay: 100, repeat: 18, callback: () => animateWalker(pol, 1, -0.3, true, this.time.now) });
    const clock = this.add.text(480, 250, "0.0s", { fontFamily: FONT, fontSize: "28px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(50);
    const t0 = this.time.now;
    const tick = this.time.addEvent({ delay: 50, loop: true, callback: () => clock.setText(`${((this.time.now - t0) / 1000).toFixed(1)}s`) });
    await this.wait(2000);
    tick.remove();
    belt.remove();
    clock.setText("2.0s");
    await this.tween({ targets: pol, x: 620, y: 380, duration: 300 });
    pol.setFrame(0);
    await this.talk([
      say("POLSON", "Phwoar."),
      say("POLSON", "That's great for the core, that."),
      say(G.s.player, "That was two seconds."),
      say("POLSON", "Two seconds of pure core, mate. You can't overtrain the core. Ask anyone."),
      say("POLSON", "Right. Take me home. Via the restaurant. I need to refuel."),
    ]);
    // restaurant
    this.children.removeAll(true);
    this.lastCaption = undefined;
    if (!backdrop(this, "bg_restaurant", { depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_pub").setOrigin(0);
    if (!this.textures.exists("bg_restaurant")) this.add.rectangle(480, 380, 520, 60, 0x7a5230).setDepth(5);
    this.add.text(480, 80, "🍔 KREZ-KING BURGERS & PIZZA & FUDGE 🍕", { fontFamily: FONT, fontSize: "22px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5);
    const pol2 = this.add.sprite(420, 320, "spr_POLSON", 0).setScale(3).setDepth(10);
    this.add.sprite(560, 320, `spr_${G.s.player}`, 0).setScale(3).setDepth(10);
    void me;
    await this.talk([
      say("POLSON", "Four burgers. Double. Large pizza, meat feast, extra cheese. Stuffed crust. And the fudge. All the fudge."),
      say("WAITER", "All of it?"),
      say("POLSON", "It's bulking food. Great bulking food. You've got to eat for the gains."),
    ]);
    await this.bulkPolson(pol2);
    await this.talk([
      say("POLSON", "Bulked. Absolutely bulked."),
      dir("Polson is now noticeably, structurally larger. His t-shirt has given up. The chair has given up."),
      say("POLSON", "Same time tomorrow? Intense workout. Then here."),
      dir("You pay. Obviously you pay. Polson 'left his wallet in his gym bag', which he did not bring."),
      ping("POLSON'S MUM", "Did he eat fudge"),
      ping("POLSON'S MUM", "He's meant to be getting trim"),
    ]);
    synth.stopMusic();
  }

  private async polsonCctv() {
    if (!backdrop(this, "bg_fgm", { dim: 0.75, depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x0a0f1a);
    // four CCTV feeds; feed 1 is Polson's living room
    const feeds: [number, number, string][] = [
      [250, 150, "CAM 1 — POLSON TOWERS: LOUNGE"],
      [710, 150, "CAM 2 — KRUNCH GYM: FRONT DESK"],
      [250, 380, "CAM 3 — POLSON TOWERS: FRIDGE"],
      [710, 380, "CAM 4 — KRUNCH GYM: TREADMILLS"],
    ];
    for (const [x, y, l] of feeds) {
      this.add.rectangle(x, y, 420, 200, 0x1f2937).setStrokeStyle(3, 0x22c55e);
      this.add.text(x - 200, y - 96, l, { fontFamily: "monospace", fontSize: "11px", color: "#22c55e" });
    }
    const rec = this.add.text(20, 510, "● REC   FGM WAR ROOM — OPERATION GAINS", { fontFamily: "monospace", fontSize: "13px", color: "#ef4444" });
    this.tweens.add({ targets: rec, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
    const clock = this.add.text(940, 510, "", { fontFamily: "monospace", fontSize: "13px", color: "#22c55e" }).setOrigin(1, 0);
    let mins = 0;
    this.time.addEvent({ delay: 120, loop: true, callback: () => { mins += 3; clock.setText(`${String(14 + Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`); } });
    const sofa = this.textures.exists("p_sofa") ? this.add.image(250, 196, "p_sofa").setScale(1.1) : this.add.rectangle(250, 190, 160, 40, 0x7a1f2b);
    void sofa;
    const pol = this.add.sprite(250, 160, "spr_POLSON", 0).setScale(2.4);
    this.add.image(330, 200, "p_food").setScale(1.2);
    this.add.text(710, 150, "(nobody)", { fontFamily: FONT, fontSize: "14px", color: "#6b7280" }).setOrigin(0.5);
    this.add.text(710, 380, "(empty treadmill)", { fontFamily: FONT, fontSize: "14px", color: "#6b7280" }).setOrigin(0.5);
    this.add.image(250, 380, "p_fridge").setScale(2);
    synth.music("ominous");
    this.time.addEvent({ delay: 500, loop: true, callback: () => pol.setFrame(String(pol.frame.name) === "3" ? 0 : 3) });
    await this.talk([
      dir("14:00. Polson's message: 'At the gym 💪'. CAM 1: Polson is on the sofa. CAM 2: Polson is not at the gym."),
      ping("POLSON", "Leg day today. Brutal."),
      dir("CAM 1: Polson opens a family-size bag of crisps with both hands."),
    ]);
    await this.tween({ targets: pol, x: 250, y: 360, duration: 900 });
    await this.talk([dir("CAM 3: Polson at the fridge. He eats cheese directly from the block. He looks over his shoulder. He eats more cheese."), ping("POLSON", "Just finished my sets. Pumped.")]);
    await this.tween({ targets: pol, y: 160, duration: 900 });
    await this.talk([
      dir("16:30. CAM 1: Polson is asleep on the sofa, holding a slice of pizza like a teddy bear."),
      ping("POLSON", "Done 3 hours. Absolutely destroyed. Core is on fire."),
      say("MIKEY", "(over the War Room comms) FGM to base. Subject has not left the house. Repeat, subject has not left the house. Subject has, however, eaten an entire fudge."),
      ping("KREZMAR", "Why is there no cheese in the War Room"),
      ping("POLSON", "Mork."),
      dir("You save the footage to the Archive under 'Strange Occurrences'. Kreblis will want it. Polson's mum will definitely want it."),
    ]);
    synth.stopMusic();
  }


  /** Polson at his current (permanent) size. */
  private fatPolson(x: number, y: number, base = 3) {
    const f = Math.min(60, (G.s.flags.polson_fat as number) ?? 0);
    const k = 1 + f * 0.04;
    return this.add.sprite(x, y, "spr_POLSON", 0).setScale(base * k, base * (1 + (k - 1) * 0.2)).setDepth(10);
  }

  private async polsonGym2() {
    if (!backdrop(this, "bg_gym", { depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_industrial").setOrigin(0);
    G.s.flags.polson_fat = Math.max(10, (G.s.flags.polson_fat as number) ?? 0);
    // the turnstile
    const post1 = this.add.rectangle(440, 360, 14, 110, 0x9ca3af).setDepth(12);
    const post2 = this.add.rectangle(520, 360, 14, 110, 0x9ca3af).setDepth(12);
    this.add.text(480, 290, "KRUNCH GYM — MEMBERS ONLY", { fontFamily: FONT, fontSize: "12px", color: "#ffd23f", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(12);
    const pol = this.fatPolson(300, 380);
    const me = this.add.sprite(160, 390, `spr_${G.s.player}`, 0).setScale(3).setDepth(10);
    synth.music("hub");
    await this.talk([
      dir("Krunch Gym. Again. Polson is wearing the same headband. The headband is now under considerable tension."),
      say("POLSON", "I've been bulking. You can tell. Look at the mass on that."),
      say(G.s.player, "That's mostly fudge."),
      say("POLSON", "Fudge is mass, mate. Mass is mass."),
    ]);
    await this.tween({ targets: pol, x: 480, duration: 900 });
    synth.play("hit");
    this.cameras.main.shake(200, 0.006);
    await this.talk([dir("Polson enters the turnstile. Polson does not exit the turnstile."), say("POLSON", "It's narrower than last time. They've changed it."), say("POLSON", "Push me. Push me through. This is part of the warm-up.")]);
    // mash to shove him through
    await new Promise<void>((resolve) => {
      let pushes = 0;
      const NEED = 14;
      const bar = this.add.rectangle(330, 200, 0, 18, 0x22c55e).setOrigin(0, 0.5).setDepth(60);
      this.add.rectangle(480, 200, 304, 24).setStrokeStyle(3, 0xffffff).setDepth(60);
      const help = this.add.text(480, 165, "TAP / SPACE to shove Polson through the turnstile", { fontFamily: FONT, fontSize: "14px", color: "#ffd23f", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(60);
      me.setPosition(400, 390);
      const shove = () => {
        if (this.box.active || pushes >= NEED) return;
        pushes++;
        synth.play(pushes % 2 ? "hit" : "select");
        bar.width = (300 * pushes) / NEED;
        pol.x += 4;
        post1.x -= 0.6;
        post2.x += 0.6;
        me.x = 400 + (pushes % 2) * 10;
        this.cameras.main.shake(60, 0.003);
        if (pushes >= NEED) {
          this.input.keyboard?.off("keydown-SPACE", shove);
          this.input.off("pointerdown", shove);
          help.destroy();
          synth.play("explode");
          this.tween({ targets: post1, angle: -70, x: 380, duration: 300 });
          this.tween({ targets: post2, angle: 70, x: 580, duration: 300 });
          this.tween({ targets: pol, x: 640, duration: 250, ease: "Quad.out" }).then(() => this.time.delayedCall(500, () => resolve()));
        }
      };
      this.input.keyboard?.on("keydown-SPACE", shove);
      this.input.on("pointerdown", shove);
    });
    this.caption("TURNSTILE: DECOMMISSIONED", "#ffd23f", 26);
    await this.talk([
      say("POLSON", "See. Warmed up. That's a full body pump, that."),
      dir("Polson lowers himself onto the bench press. The bench press makes a sound benches should not make."),
    ]);
    const bench = this.textures.exists("p_bench") ? this.add.image(700, 420, "p_bench").setScale(2).setDepth(8) : this.add.rectangle(700, 410, 160, 20, 0x374151).setDepth(8);
    await this.tween({ targets: pol, x: 700, y: 385, duration: 600 });
    await this.wait(500);
    synth.play("explode");
    this.cameras.main.shake(300, 0.012);
    this.tween({ targets: bench, angle: 12, y: 440, duration: 200 });
    this.tween({ targets: pol, y: 410, duration: 200 });
    await this.talk([
      dir("The bench snaps cleanly in half. Polson has not touched a weight."),
      say("POLSON", "Personal best."),
      say("CHAD DELTOID", "(from the squat rack) Mate, that's a £900 bench."),
      say("POLSON", "Put it on his tab."),
      dir("He points at you. Of course he points at you."),
      say("POLSON", "Right. That's the session. Post-workout window. Got to get the protein in within thirty seconds or the gains evaporate. Science."),
      say("POLSON", "Restaurant. Quick. QUICK."),
    ]);
    this.children.removeAll(true);
    this.lastCaption = undefined;
    if (!backdrop(this, "bg_restaurant", { depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_pub").setOrigin(0);
    this.add.text(480, 80, "🍔 KREZ-KING BURGERS & PIZZA & FUDGE 🍕", { fontFamily: FONT, fontSize: "22px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5);
    const pol2 = this.fatPolson(420, 320);
    this.add.sprite(620, 320, `spr_${G.s.player}`, 0).setScale(3).setDepth(10);
    await this.talk([
      say("WAITER", "Oh no. Not him again. Last time he ate a chair leg by accident."),
      say("POLSON", "Protein shake please. Chocolate. Blend a fudge into it. Blend two fudges. And a burger in it."),
      say("WAITER", "…In the shake?"),
      say("POLSON", "Liquid gains, mate. Absorbs faster."),
    ]);
    await this.bulkPolson(pol2, true);
    await this.talk([
      say("POLSON", "Oh that's hit the spot. I can feel it going straight to the muscles."),
      dir("It is not going to the muscles. It is going everywhere except the muscles."),
      say("POLSON", "Gonna need a bigger headband."),
      ping("POLSON'S MUM", "Why is there a bill from Krunch Gym for a bench"),
      ping("POLSON'S MUM", "And a turnstile"),
      ping("POLSON", "Mork."),
    ]);
    synth.stopMusic();
  }

  /** The Mouth Workout. Hold to stretch his jaw open, release in the green to CHEW VERY HARD. */
  private async polsonMouth() {
    if (!backdrop(this, "tv_livingroom", { depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x3b2f2a);
    G.s.flags.polson_fat = Math.max(25, (G.s.flags.polson_fat as number) ?? 0);
    if (this.textures.exists("p_sofa")) this.add.image(330, 430, "p_sofa").setScale(2.6).setDepth(5);
    const pol = this.fatPolson(330, 360);
    const me = this.add.sprite(800, 390, `spr_${G.s.player}`, 0).setScale(3).setDepth(10);
    void me;
    // the cake: one big four-tier stack
    const cake = this.add.container(600, 430).setDepth(9);
    const tiers = [
      [0, 0, 220, 50, 0xf5d0a9],
      [0, -50, 180, 46, 0xf9a8d4],
      [0, -96, 140, 42, 0xf5d0a9],
      [0, -138, 100, 38, 0xf9a8d4],
    ] as const;
    for (const [x, y, w, h, c] of tiers) {
      cake.add(this.add.rectangle(x, y, w, h, c).setOrigin(0.5, 1).setStrokeStyle(3, 0x7c2d12));
      cake.add(this.add.rectangle(x, y - h, w, 8, 0xffffff).setOrigin(0.5, 0));
    }
    for (let i = -2; i <= 2; i++) cake.add(this.add.rectangle(i * 16, -186, 4, 18, 0xfde047).setOrigin(0.5, 1));
    cake.add(this.add.text(0, -20, "HAPPY TUESDAY POLSON", { fontFamily: FONT, fontSize: "11px", color: "#7c2d12" }).setOrigin(0.5));
    synth.music("hub");
    await this.talk([
      dir("Polson Towers. Polson is on the sofa. Polson is most of the sofa."),
      dir("In front of him: the cake. Four tiers. It has its own postcode."),
      say("POLSON", "Right. Gym's out. Too many turnstiles. Too much… standing."),
      say("POLSON", "So I've designed my own routine. Cutting-edge. You won't have heard of it."),
      say("POLSON", "The mouth workout."),
      say(G.s.player, "The what."),
      say("POLSON", "Mouth workout. By stretching my mouth open — really wide, full range of motion — and chewing very hard, I'm burning calories."),
      say("POLSON", "And building strong oral muscles. Nobody trains the oral muscles. Biggest muscle group in the face, mate. Neglected."),
      say(G.s.player, "So you're eating a cake."),
      say("POLSON", "I'm using the cake as resistance. The cake is the equipment. Spot me."),
      dir("HOW IT WORKS: HOLD (tap and hold, or hold SPACE) to stretch Polson's mouth open. RELEASE in the GREEN zone to chew very hard. Too early: a nibble. Too late: jaw lock."),
    ]);
    const res = await new Promise<{ reps: number; burned: number; ate: number }>((resolve) => {
      const W = 300;
      const X0 = 480 - W / 2;
      this.add.rectangle(480, 150, W + 6, 26).setStrokeStyle(3, 0xffffff).setDepth(60);
      let lo = 0.55;
      let hi = 0.8;
      const green = this.add.rectangle(X0 + W * lo, 150, W * (hi - lo), 20, 0x22c55e, 0.55).setOrigin(0, 0.5).setDepth(60);
      const fill = this.add.rectangle(X0, 150, 0, 20, 0xffd23f).setOrigin(0, 0.5).setDepth(61);
      this.add.text(480, 120, "JAW STRETCH", { fontFamily: FONT, fontSize: "12px", color: "#fff", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(60);
      const hud = this.add.text(480, 60, "", { fontFamily: "Impact, sans-serif", fontSize: "20px", color: "#fff", stroke: "#000", strokeThickness: 5, align: "center" }).setOrigin(0.5).setDepth(60);
      const mouthY = pol.y - pol.displayHeight * 0.18;
      const mouth = this.add.ellipse(pol.x + 2, mouthY, 8, 2, 0x3b0a0a).setDepth(20);
      const lines = ["FULL RANGE OF MOTION.", "Feel that burn.", "Strong oral muscles.", "That's a calorie gone, that.", "CHEW. HARD.", "Squeeze at the top.", "Jaw day. Never skip jaw day.", "Engage the core. The cheek core.", "One more rep. One more slice.", "Mork."];
      const bubble = (txt: string, col = "#111") => {
        const b = this.add.text(pol.x, pol.y - pol.displayHeight / 2 - 26, txt, { fontFamily: FONT, fontSize: "13px", color: col, backgroundColor: "#ffffffee", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(70);
        this.tween({ targets: b, y: b.y - 18, alpha: 0, delay: 800, duration: 400 }).then(() => b.destroy());
      };
      let holding = false;
      let stretch = 0;
      let reps = 0;
      let burned = 0;
      let ate = 0;
      let left = 30;
      let over = false;
      const NEED = 12;
      const sx0 = pol.scaleX;
      const newZone = () => {
        const w = Phaser.Math.FloatBetween(0.12, 0.25);
        lo = Phaser.Math.FloatBetween(0.35, 0.95 - w);
        hi = lo + w;
        green.setPosition(X0 + W * lo, 150).setSize(W * hi - W * lo, 20);
      };
      const down = () => {
        if (this.box.active || over) return;
        holding = true;
      };
      const up = () => {
        if (!holding || over) return;
        holding = false;
        const v = stretch;
        stretch = 0;
        if (v < 0.08) return;
        if (v >= lo && v <= hi) {
          reps++;
          burned += 0.4;
          ate += Phaser.Math.Between(780, 1240);
          synth.play(reps % 2 ? "gulp" : "slurp");
          bubble(lines[reps % lines.length]);
          this.cameras.main.shake(120, 0.004 + reps * 0.0005);
          for (let i = 0; i < 3; i++) this.time.delayedCall(i * 110, () => mouth.setSize(12, i % 2 ? 2 : 9));
          cake.setScale(Math.max(0.08, 1 - reps / NEED));
          this.tweens.add({ targets: pol, scaleX: sx0 * (1 + reps * 0.035), duration: 220, ease: "Back.out" });
          newZone();
          if (reps >= NEED) end();
        } else if (v < lo) {
          synth.play("tap_fail");
          ate += 90;
          bubble("A nibble. Weak.", "#b45309");
        } else {
          synth.play("tap_fail");
          bubble("JAW LOCK", "#ef4444");
          pol.setTint(0xffaaaa);
          this.time.delayedCall(500, () => pol.clearTint());
        }
      };
      const kd = () => down();
      const ku = () => up();
      this.input.keyboard?.on("keydown-SPACE", kd);
      this.input.keyboard?.on("keyup-SPACE", ku);
      this.input.on("pointerdown", down);
      this.input.on("pointerup", up);
      const timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => { if (!this.box.active && --left <= 0) end(); } });
      const tick = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          if (holding) {
            stretch += 0.018;
            if (stretch > 1.05) {
              holding = false;
              stretch = 0;
              synth.play("tap_fail");
              bubble("JAW LOCK", "#ef4444");
            }
          }
          fill.width = W * Math.min(1, stretch);
          mouth.setSize(8 + stretch * 12, 2 + stretch * 14);
          hud.setText(`REPS ${reps}/${NEED}    CALORIES BURNED: ${burned.toFixed(1)}    CALORIES EATEN: ${ate.toLocaleString()}    ${left}s`);
        },
      });
      const end = () => {
        if (over) return;
        over = true;
        tick.remove();
        timer.remove();
        this.input.keyboard?.off("keydown-SPACE", kd);
        this.input.keyboard?.off("keyup-SPACE", ku);
        this.input.off("pointerdown", down);
        this.input.off("pointerup", up);
        mouth.setSize(8, 2);
        this.time.delayedCall(900, () => resolve({ reps, burned, ate }));
      };
    });
    G.s.flags.polson_fat = ((G.s.flags.polson_fat as number) ?? 0) + res.reps * 2;
    this.caption(res.reps >= 12 ? "CAKE: DESTROYED" : res.reps >= 6 ? "SOLID JAW SESSION" : "WARM-UP SET", "#ffd23f", 30);
    await this.wait(900);
    await this.talk([
      say("POLSON", `${res.reps} reps. ${res.burned.toFixed(1)} calories burned. That's a deficit, that.`),
      say(G.s.player, `You ate ${res.ate.toLocaleString()} calories.`),
      say("POLSON", "Of resistance, mate. That's all resistance. You don't count the equipment."),
      say("POLSON", "Feel this jaw. Go on. Feel it. Rock solid. Strong oral muscles."),
      dir("You do not feel his jaw."),
      say("POLSON", "Same time tomorrow. Bigger cake. Progressive overload."),
      dir("Polson tries to stand up to see you out. Polson remains seated. The sofa has accepted him as one of its own."),
      ping("POLSON'S MUM", "Did someone deliver a cake the size of a fridge to the house"),
      ping("POLSON'S MUM", "He's meant to be getting trim"),
      ping("POLSON", "I am getting trim. Trimming the cake. Mork."),
      ping("KREZMAR", "Is there any cake left"),
      ping("POLSON", "No"),
    ]);
    synth.stopMusic();
  }

  // ---------------------------------------------------------------- THE SANMIKVERSE

  private sanmikSprites(lx: number, rx: number, y: number) {
    const mk = (key: string, fb: string, x: number, tint: number) => {
      const sp = this.add.sprite(x, y, this.textures.exists(key) ? key : fb, 0).setScale(3).setDepth(10);
      if (!this.textures.exists(key)) sp.setTint(tint);
      return sp;
    };
    return { mik: mk("spr_SANMIK", "spr_MIKEY", lx, 0xb0c4ff), chz: mk("spr_SANCHZ", "spr_POLSON", rx, 0xffe08a) };
  }

  /** Mash to do a thing. Resolves after `need` taps. */
  private mashFor(need: number, label: string, onTap: (n: number) => void) {
    return new Promise<void>((resolve) => {
      let n = 0;
      const help = this.add.text(480, 150, label, { fontFamily: FONT, fontSize: "16px", color: "#ffd23f", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(300);
      const tap = () => {
        if (this.box.active || n >= need) return;
        n++;
        onTap(n);
        if (n >= need) {
          this.input.keyboard?.off("keydown-SPACE", tap);
          this.input.off("pointerdown", tap);
          help.destroy();
          this.time.delayedCall(300, () => resolve());
        }
      };
      this.input.keyboard?.on("keydown-SPACE", tap);
      this.input.on("pointerdown", tap);
    });
  }

  private async sanmikLampe() {
    if (!backdrop(this, "bg_gig", { dim: 0.25, depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x1a0f1f);
    const { mik, chz } = this.sanmikSprites(330, 640, 360);
    const me = this.add.sprite(820, 380, `spr_${G.s.player}`, 0).setScale(3).setDepth(10);
    // the lamp
    const lamp = this.add.container(470, 400).setDepth(20);
    lamp.add(this.add.ellipse(0, 0, 56, 24, 0xd4a017).setStrokeStyle(2, 0x7c5a00));
    lamp.add(this.add.triangle(38, -6, 0, 0, 30, -10, 0, 8, 0xd4a017));
    lamp.add(this.add.ellipse(0, -14, 22, 12, 0xe8b923));
    synth.music("ggg8");
    await this.talk([
      dir("The back room of the Krezz Arms, after the gig. SanMik is lying face-down on the stage 'cooling down'. SanChz is eating the setlist."),
      say("SANMIK", "Yee. 'Ello me dearies. How you all fucking doing, you fucking pricks."),
      say("SANMIK", "Found this in the skip out the back. Magic lamp. Looks like a naughty little dildo and it smells like rank fanny juice. Proper vintage."),
      say("SANCHZ", "Rub it."),
      say("SANMIK", "I'm gonna rub it like I rubbed one out last night, yee. Hehehe."),
      say(G.s.player, "Please don't say it like that."),
    ]);
    await this.mashFor(12, "TAP / SPACE: help SanMik rub the lamp (sorry)", (n) => {
      synth.play(n % 2 ? "select" : "hit");
      lamp.setAngle(n % 2 ? -8 : 8);
      mik.x = 400 + (n % 2) * 8;
      if (n % 3 === 0) {
        const puff = this.add.circle(500 + Math.random() * 20, 380, 10, 0x9b59ff, 0.6).setDepth(25);
        this.tween({ targets: puff, y: 250, radius: 40, alpha: 0, duration: 900 }).then(() => puff.destroy());
      }
    });
    lamp.setAngle(0);
    synth.play("explode");
    this.cameras.main.shake(400, 0.01);
    this.cameras.main.flash(300, 155, 89, 255);
    const genie = this.textures.exists("p_genie") ? this.add.image(500, 400, "p_genie").setOrigin(0.5, 1).setScale(0.2).setDepth(30) : this.add.ellipse(500, 300, 90, 160, 0x3b82f6).setScale(0.2).setDepth(30);
    await this.tween({ targets: genie, scale: this.textures.exists("p_genie") ? 2.2 : 1, y: 380, duration: 900, ease: "Back.out" });
    this.tweens.add({ targets: genie, y: 370, yoyo: true, repeat: -1, duration: 900, ease: "Sine.inOut" });
    await this.talk([
      say("GENIE", "GREETINGS, SANMIK. I AM A MAGICAL GENIE, RELEASED FROM MY MYSTICAL SLEEP AFTER TEN THOUSAND LONG BLOODY YEARS."),
      say("GENIE", "AS A REWARD, I WILL GRANT YOU THREE WISHES."),
      say("SANMIK", "You fucking what? You fucking prick, I'll fucking sherk you. Catford Fox Crew."),
      say("SANMIK", "Is that you SanChz? Dressed up like a magical flying cunt like you always do?"),
      say("SANCHZ", "I'm over here, mate. I'm eating the setlist."),
      say("GENIE", "I AM NOT SANCHZ. NOW. WHAT ARE YOUR WISHES?"),
      say("SANMIK", "Ooh. Well that's a tough question. Yee. Mm. Let me see."),
      say("SANMIK", "Number one: a fucking pet goat."),
      say("SANMIK", "Number two: a Pepsi Max."),
      say(G.s.player, "Mikey. Think about this. You can have anything—"),
      say("SANMIK", "And number three… a Pepsi normal."),
      say("GENIE", "…"),
      say("GENIE", "WHAT A BLOODY FUCKING WASTE. YOU COULD HAVE LEARNED TO BLOODY FUCKING FLY."),
      say("GENIE", "BUT. YOUR WISHES ARE MY COMMAND."),
    ]);
    synth.play("coin");
    const cans = [this.add.rectangle(380, 300, 14, 26, 0x111827).setStrokeStyle(2, 0x3b82f6).setDepth(31), this.add.rectangle(400, 300, 14, 26, 0x1d4ed8).setStrokeStyle(2, 0xef4444).setDepth(31)];
    this.tween({ targets: cans, y: 330, duration: 400, ease: "Bounce.out" });
    const goat = this.textures.exists("p_gabor") ? this.add.image(560, 420, "p_gabor").setOrigin(0.5, 1).setScale(0.1).setDepth(28) : this.add.ellipse(560, 400, 60, 40, 0xffffff).setDepth(28);
    await this.tween({ targets: goat, scale: 1.4, duration: 500, ease: "Back.out" });
    this.tweens.add({ targets: goat, angle: 5, yoyo: true, repeat: -1, duration: 300 });
    await this.talk([
      say("SANMIK", "Yee — ooh yee, I got it. Uhh. Yee. Mate, this Pepsi Max is GREAT."),
      gabor("Oh god. Oh god I exist. Hello. I'm Gabor the Goat. Am I your best friend? I'm your best friend. Sorry. Is that too much? It's too much."),
      say("SANMIK", "Shut the fuck up, you little neeky cunt, or I'll make a fucking curry out of you."),
      gabor("A curry. Would it hurt? It would hurt. Ooh. Okay. Okay SanMik. You're my best friend. Please threaten me again later."),
      say("SANCHZ", "Can I have the Pepsi normal."),
      say("SANMIK", "No."),
      say("GENIE", "ONE MORE THING. I HAVE SPENT TEN THOUSAND YEARS IN A LAMP THAT SMELLS OF FANNY JUICE. SOMEBODY IS PAYING FOR THAT."),
      gabor("Is it me? Is it me paying? Oh no. Oh yes."),
      say("GENIE", "WELCOME… TO THE SANMIKVERSE."),
    ]);
    // everyone up the spout
    synth.play("explode");
    this.cameras.main.shake(900, 0.02);
    const all = [mik, chz, me, goat, ...cans];
    await Promise.all(all.map((o, i) => this.tween({ targets: o, x: 505, y: 395, scale: 0.05, angle: 720, delay: i * 120, duration: 900, ease: "Quad.in" })));
    this.cameras.main.flash(500, 255, 255, 255);
    this.caption("THE SANMIKVERSE", "#ff6bb0", 44);
    await this.wait(1200);
    await this.talk([
      dir("You land face-first in something soft. It's a pizza. It's a wet pizza."),
      say("SANMIK", "(somewhere nearby) CATFORD! Yee! I'm HOME, blud!"),
    ]);
    synth.stopMusic();
  }

  private async sanmikNation() {
    if (!backdrop(this, "bg_townhall", { dim: 0.2, depth: -10 })) this.sky(0x9ec5e8, 0xe8d8b0);
    const { mik, chz } = this.sanmikSprites(220, 740, 330);
    const kre = this.add.sprite(480, 300, "spr_KREBLIS", 0).setScale(2.6).setDepth(9);
    const me = this.add.sprite(480, 430, `spr_${G.s.player}`, 0).setScale(3).setDepth(12);
    const leftCrowd = [0, 1, 2].map((i) => this.add.sprite(110 + i * 50, 410 + (i % 2) * 14, `spr_FOLK${i}`, 0).setScale(2.4).setDepth(11));
    const rightCrowd = [1, 2, 3].map((i) => this.add.sprite(760 + i * 50, 410 + (i % 2) * 14, `spr_FOLK${i}`, 0).setScale(2.4).setDepth(11).setFlipX(true));
    const goat = this.textures.exists("p_gabor") ? this.add.image(480, 470, "p_gabor").setOrigin(0.5, 1).setScale(1.1).setDepth(13) : this.add.ellipse(480, 450, 50, 30, 0xffffff).setDepth(13);
    const banner = (x: number, t: string, c: number) => {
      this.add.rectangle(x, 120, 300, 40, c).setStrokeStyle(3, 0x000000).setDepth(8);
      this.add.text(x, 120, t, { fontFamily: "Impact, sans-serif", fontSize: "20px", color: "#ffffff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(9);
    };
    banner(210, "SANMIK NATION", 0xdc2626);
    banner(750, "SANCHZ NATION", 0x2563eb);
    const chant = (ps: Phaser.GameObjects.Sprite[], t: string) => this.people(ps, t);
    await this.talk([
      dir("Krelford Town Hall. On the left steps: SanMik, a megaphone, three confused pensioners and a hand-painted banner. On the right steps: SanChz, a different megaphone, three different confused pensioners and a different banner."),
      dir("In the middle: Gabor the Goat, wearing a rosette from each side."),
      say("KREBLIS", "Krelmergency. I repeat. Krelmergency. There are two nations on my steps and neither of them has filled in the form."),
      say(G.s.player, "What happened?"),
      gabor("SanChz drank the Pepsi Normal. The wish one. SanMik said it was a declaration of war. Then they both declared nations. I'm on both sides. They're both shouting at me. It's wonderful. I'm so scared."),
    ]);
    synth.music("ggg4");
    for (let i = 0; i < 2; i++) {
      chant([mik, ...leftCrowd], "SANMIK NATION!");
      this.caption("🎤 WE ALL WANT TO LIVE IN A SANMIK NATION", "#ff6b6b", 22);
      await this.wait(1300);
      chant([chz, ...rightCrowd], "SANCHZ NATION!");
      this.caption("🎤 WE ALL WANT TO LIVE IN A SANCHZ NATION", "#7fb3ff", 22);
      await this.wait(1300);
    }
    this.lastCaption?.destroy();
    await this.talk([
      say("SANMIK", "Yee. I know you're thinking it, but I've got the balls to say it. SanChz, you're a fucking cunt. Stop being a stupid little cunt. You and your men are all fucking cunts."),
      say("SANCHZ", "I haven't got any men. I've got Doreen."),
      say("DOREEN (SANCHZ NATION)", "I thought this was the bus queue."),
      say("SANMIK", "From now on, SanMik's your god. All you ladies of Krelford, form an orderly queue. My kids will be the government."),
      say("SANMIK", "Lil Leroy: Chancellor. Munky: Home Secretary. Princess: Foreign Office. And Cancelle Culchure: Minister for Culture."),
      say("KREBLIS", "You named a child Cancelle Culchure."),
      say("SANMIK", "Spelt proper. It's French."),
      say("SANCHZ", "SanChz Nation policy one: hot tubs on the NHS. Policy two: Doreen gets her bus. Policy three: mork."),
    ]);
    for (let i = 0; i < 3; i++) {
      chant([mik, chz, ...leftCrowd, ...rightCrowd], "WIN THE WAR!");
      this.caption("WIN THE WAR! WIN THE WAR!", "#ffd23f", 30);
      await this.wait(700);
    }
    this.lastCaption?.destroy();
    await this.talk([
      dir("Both nations begin to advance. Very slowly. Doreen has a hip."),
      say(G.s.player, "STOP. Both of you. There's only one place the San Brothers have ever settled anything."),
      say("SANMIK", "…"),
      say("SANCHZ", "…"),
      say("SANMIK & SANCHZ", "THE HOT TUB."),
    ]);
    // the summit
    this.cameras.main.flash(300, 255, 255, 255);
    leftCrowd.concat(rightCrowd).forEach((p) => p.setVisible(false));
    kre.setPosition(820, 330);
    me.setPosition(140, 400);
    goat.setPosition(860, 470);
    const tub = this.textures.exists("p_hottub") ? this.add.image(480, 470, "p_hottub").setOrigin(0.5, 1).setScale(2.6).setDepth(20) : this.add.rectangle(480, 420, 300, 120, 0x7c4a1e).setDepth(20);
    mik.setPosition(420, 300).setDepth(19);
    chz.setPosition(545, 300).setDepth(19);
    this.tweens.add({ targets: [mik, chz], y: 292, yoyo: true, repeat: -1, duration: 400, ease: "Sine.inOut" });
    const bubbles = this.time.addEvent({ delay: 140, loop: true, callback: () => {
      const b = this.add.circle(380 + Math.random() * 200, 330, 4 + Math.random() * 6, 0xe0f2fe, 0.8).setDepth(21);
      this.tween({ targets: b, y: 230, alpha: 0, duration: 900 }).then(() => b.destroy());
    } });
    void tub;
    synth.music("ggg13");
    this.caption("THE HOT TUB SUMMIT", "#7fdfff", 32);
    await this.wait(1000);
    await this.talk([
      say("SANMIK", "It's SanMik (in the hot tub)."),
      say("SANCHZ", "With SanChz (in the hot tub)."),
      say("SANMIK", "Splash SanChz (in the hot tub)."),
      say("SANCHZ", "Splashes me back (in the hot tub)."),
      say("SANMIK", "…I'm sorry I called you a magical flying cunt, SanChz."),
      say("SANCHZ", "I'm sorry I drank your Pepsi Normal. It was flat. You wasted a wish on a flat drink."),
      say("SANMIK", "We all want to live… in a SanMik AND SanChz nation."),
      say("SANCHZ", "The San Brothers. Mork."),
      say("KREBLIS", "Krelmergency over. I repeat. Krelmergency ov—"),
      dir("A figure is approaching the hot tub. Waddling. Clenching."),
      say("UNCLE RIK", "'Ello. It's Uncle Rik. I need a shit real bad. Yee."),
      say("SANMIK", "Rik. Rik, no. RIK. YOU MUSTN'T WEE OR POO (IN THE HOT TUB)—"),
    ]);
    const rik = this.add.sprite(-40, 380, "spr_FOLK2", 0).setScale(3).setDepth(22).setTint(0xd6b48a);
    await this.tween({ targets: rik, x: 480, y: 290, duration: 900, ease: "Quad.in" });
    synth.play("explode");
    this.cameras.main.shake(500, 0.02);
    bubbles.remove();
    const splash = this.add.circle(480, 340, 20, 0x7c4a1e, 0.85).setDepth(30);
    this.tween({ targets: splash, radius: 200, alpha: 0, duration: 900 });
    this.tween({ targets: mik, x: -80, y: 200, angle: -540, duration: 900 });
    this.tween({ targets: chz, x: 1040, y: 200, angle: 540, duration: 900 });
    this.caption("HOT TUB: CONDEMNED", "#a16207", 34);
    await this.wait(1100);
    await this.talk([
      say("UNCLE RIK", "Ahh. That's better. Lovely and warm."),
      dir("The water in the hot tub is now a colour that Krelford Council will later describe as 'a biohazard and a crime'. A crouton bobs to the surface. It is not a crouton."),
      gabor("Can I go in? I want to go in. I don't want to go in. Push me in."),
      say("EVERYONE", "NO."),
    ]);
    // the celebration
    this.children.removeAll(true);
    this.lastCaption = undefined;
    if (!backdrop(this, "bg_townhall", { dim: 0.2, depth: -10 })) this.sky(0x9ec5e8, 0xe8d8b0);
    const m2 = this.add.sprite(480, 360, this.textures.exists("spr_SANMIK") ? "spr_SANMIK" : "spr_MIKEY", 0).setScale(3.4).setDepth(10);
    const c2 = this.add.sprite(640, 370, this.textures.exists("spr_SANCHZ") ? "spr_SANCHZ" : "spr_POLSON", 0).setScale(3.2).setDepth(10);
    const hat = this.add.triangle(480, 300, 0, 18, 12, 0, 24, 18, 0xdc2626).setDepth(11);
    this.add.circle(492, 300, 4, 0xffffff).setDepth(12);
    synth.music("ggg12");
    await this.talk([
      dir("That evening, on the Town Hall steps, the San Brothers hold a joint state ceremony to found the United SanMik & SanChz Nation (population: 2, and a goat)."),
      dir("To mark the occasion, SanMik removes his tracksuit to reveal a red velvet Santa G-string. It is October. Nobody asked."),
    ]);
    this.tweens.add({ targets: [m2, hat], angle: { from: -10, to: 10 }, yoyo: true, repeat: -1, duration: 160 });
    this.tweens.add({ targets: m2, scaleX: 3.7, yoyo: true, repeat: -1, duration: 160 });
    this.tweens.add({ targets: c2, y: 360, yoyo: true, repeat: -1, duration: 300 });
    this.caption("🎄 I LOVE CHRISTMAS 🎄", "#ff6b6b", 30);
    await this.wait(1500);
    await this.talk([
      say("SANMIK", "Yee! I'm the fucking best! Michael Jackson is second best! I am also best dressed!"),
      say(G.s.player, "You're in a G-string."),
      say("SANMIK", "Best dressed, blud."),
      say("SANCHZ", "Everyone knows he's solid. No cunt touches him."),
      dir("Gabor the Goat headbutts SanMik in the bum. SanMik falls down the Town Hall steps, all of them, one at a time, still twerking."),
      gabor("Sorry SanMik. Sorry. I love you. You're my best friend. Headbutt me back. Please. PLEASE."),
      ping("DRONGUS", "Who let Mikey start a country"),
      ping("DRONGUS", "And why is there a goat in the group chat"),
      ping("MIKEY", "Can someone react to my message pls"),
      ping("MIKEY", "The nation one"),
      dir("SanMik and SanChz are friends again. The hot tub has been sealed in concrete. Begour sends a card. It says 'So proud of you both x'. It smells faintly of lavender."),
    ]);
    G.s.flags.sanmik_nation = true;
    synth.stopMusic();
  }

  // ---------------------------------------------------------------- WAHOOGA (Benn goes home)

  private async wahooga() {
    if (!backdrop(this, "bg_wahooga", { depth: -10 })) this.sky(0x2a1050, 0x9b59ff);
    const portal = this.textures.exists("hd_portal") ? this.add.image(640, 420, "hd_portal").setOrigin(0.5, 1).setScale(2).setDepth(5) : this.add.ellipse(640, 330, 140, 200, 0x9b59ff, 0.6).setDepth(5);
    this.tweens.add({ targets: portal, scaleX: (portal.scaleX || 1) * 1.05, duration: 900, yoyo: true, repeat: -1 });
    const glow = this.add.circle(640, 320, 140, 0x9b59ff, 0.2).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
    this.tweens.add({ targets: glow, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
    const benn = this.add.sprite(160, 400, "spr_KREBON", 0).setScale(3).setDepth(10);
    synth.music("ominous");
    const walk = this.time.addEvent({ delay: 90, loop: true, callback: () => animateWalker(benn, 1, 0, true, this.time.now) });
    await this.tween({ targets: benn, x: 440, duration: 2600 });
    walk.remove();
    benn.setData("facing", "east");
    animateWalker(benn, 0, 0, false, this.time.now);
    const pts = (G.s.flags.rock_points as number) ?? 0;
    await this.talk([
      say("KREBON", "The symbol of Wahoogah."),
      say("KREBON", "My paradigm has just phlegmed backwards into the multiverze, dude. Whoa. Lemme catch up."),
      dir("Through the symbol: a universe almost exactly like this one, except everything is very slightly more fun, and every pub has a stage."),
      ping("KREBLIS", "Fairweather Benn strikes again"),
      ping("DRONGUS", "Krebon's leaving ?? He was barely here"),
      ping("DRONGUS", "Did he react to my song before he went"),
      say("KREBON", "Die fearless. What other option is there."),
      say("KREBON", `Look after the ${pts} rockstar points. And the underwear. Especially the underwear.`),
    ]);
    const walk2 = this.time.addEvent({ delay: 90, loop: true, callback: () => animateWalker(benn, 1, 0, true, this.time.now) });
    await this.tween({ targets: benn, x: 640, y: 390, duration: 1400 });
    walk2.remove();
    synth.play("burst");
    this.cameras.main.flash(600, 200, 150, 255);
    await this.tween({ targets: benn, scale: 0.2, alpha: 0, angle: 720, duration: 900, ease: "Quad.in" });
    this.caption("WAHOOGA", "#e9d5ff", 44);
    this.cameras.main.shake(500, 0.01);
    await this.wait(1600);
    synth.stopMusic();
    await this.talk([
      dir("Krebon (Fairweather Benn, the Fenian Orgill) has left Krelworld. He is home."),
      dir("The rest of the lore still needs saving. Choose who carries on. They keep your progress, your Krezzcoin, and the rockstar points."),
    ]);
    const r = maybeFinishArc(G.s);
    if (r) await this.talk([dir(r)]);
  }

  // ---------------------------------------------------------------- FLIGHT KR-069: THE COCKPIT, THE PARACHUTE, THE TOWER

  private async planeEscape() {
    const me = G.s.player;
    G.rt.timerEnd = 0;
    G.emit("timer", null);
    // ---- the cockpit, on the approach
    const sky = this.sky(0x7ec8f0, 0xf3d9b1);
    const city = this.add.graphics();
    city.fillStyle(0x5a6a80, 1);
    for (let i = 0; i < 20; i++) city.fillRect(i * 50, 330 - ((i * 37) % 70), 44, 300);
    const tower = this.add.image(480, 420, "p_kreltower").setOrigin(0.5, 1).setScale(0.6).setDepth(2);
    const dash = this.add.graphics().setDepth(20);
    dash.fillStyle(0x1f2937, 1).fillRect(0, 380, 960, 160);
    dash.fillStyle(0x111827, 1).fillRect(0, 0, 960, 40).fillRect(0, 0, 60, 540).fillRect(900, 0, 60, 540).fillRect(470, 0, 20, 380);
    for (let i = 0; i < 14; i++) dash.fillStyle([0x22c55e, 0xef4444, 0xfacc15][i % 3], 1).fillCircle(120 + i * 52, 420 + (i % 2) * 22, 7);
    dash.fillStyle(0x374151, 1).fillRect(400, 450, 160, 70);
    this.add.text(480, 485, "AUTOPILOT: TESLA FSD (BETA)", { fontFamily: FONT, fontSize: "10px", color: "#86efac" }).setOrigin(0.5).setDepth(21);
    const pilot = this.add.sprite(480, 470, `spr_${me}`, 5).setScale(3).setDepth(22);
    synth.play("alarm");
    this.tween({ targets: tower, scale: 4.5, duration: 9000, ease: "Quad.in" });
    await this.talk([
      dir("The cockpit of Flight KR-069. Krozno is unconscious in the drinks trolley. Through the windscreen: Kreltower. It is getting bigger. It is getting much bigger."),
      dir("You approach the controls. There are four hundred buttons. One of them is labelled 'DO NOT'."),
    ]);
    this.tween({ targets: pilot, y: 440, duration: 600 });
    await this.wait(700);
    await this.talk([
      dir("You don't know how to fly a plane."),
      dir("Why did you do this."),
      dir("It probably won't even hit the tower now that Krozno has been bested."),
      dir("Just find a parachute and get yourself some pussy juice."),
      say(me, "…yeah. Fair."),
    ]);
    sky.destroy();
    city.destroy();
    tower.destroy();
    dash.destroy();
    pilot.destroy();
    this.children.list.filter((o) => o instanceof Phaser.GameObjects.Text).forEach((o) => o.destroy());
    // ---- the cabin: shove your way to the parachute
    await this.parachuteShove(me);
    // ---- the jump
    await this.talk([
      dir("You open the emergency door. The wind takes your eyebrows."),
      say(me, "It'll probably auto-land. It's a Tesla plane."),
      dir("You jump."),
    ]);
    // ---- outside: parachuting down, everyone watching
    const skyG = this.sky(0x8fc3ea, 0xf3d9b1);
    const g = this.add.graphics();
    g.fillStyle(0x5a6a80, 1);
    for (let i = 0; i < 20; i++) g.fillRect(i * 50, 300 - ((i * 37) % 90), 44, 300);
    g.fillStyle(0x3d6a2a, 1).fillRect(0, 430, 960, 110);
    if (backdrop(this, "bg_city", { depth: -10 })) {
      skyG.setVisible(false);
      g.setVisible(false);
    }
    const tw = this.add.image(620, 430, "p_kreltower").setOrigin(0.5, 1).setScale(1.6).setDepth(10);
    const people = this.crowd(470).filter((p) => p.texture.key !== `spr_${me}`);
    synth.music("airport");
    const chute = this.add.container(180, -60).setDepth(70);
    const canopy = this.add.graphics();
    canopy.fillStyle(0xff4fa3, 1).slice(0, 0, 46, Math.PI, 0, false).fillPath();
    canopy.lineStyle(2, 0xffffff, 1).lineBetween(-44, 0, 0, 56).lineBetween(44, 0, 0, 56).lineBetween(0, -40, 0, 56);
    chute.add([canopy, this.add.sprite(0, 70, `spr_${me}`, 0).setScale(2)]);
    this.tween({ targets: chute, y: 330, x: 120, duration: 9000, ease: "Sine.out" });
    this.tweens.add({ targets: chute, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 900 });
    await this.talk([dir("You drift down over Krelford under a pink parachute. Below, everyone is outside. Everyone is looking up.")]);
    const plane = this.add.image(1020, 110, "p_plane").setScale(2.4).setFlipX(true).setDepth(20);
    await this.talk([say("KREBLIS", "Is that… is that the plane?"), say("MIKEY", "It's on autopilot. It's a Tesla. It'll be fine.")]);
    await this.tween({ targets: plane, x: 670, y: 250, angle: 8, duration: 2600, ease: "Sine.in" });
    plane.destroy();
    synth.play("boom");
    this.cameras.main.flash(500, 255, 240, 200);
    this.cameras.main.shake(1400, 0.03);
    const fire = this.add.circle(620, 260, 20, 0xff7a00, 0.95).setDepth(15);
    this.tween({ targets: fire, radius: 80, duration: 600 });
    for (let i = 0; i < 18; i++) {
      const smoke = this.add.circle(620 + (Math.random() - 0.5) * 90, 250 - Math.random() * 40, 16 + Math.random() * 20, 0x333333, 0.7).setDepth(14);
      this.tween({ targets: smoke, y: smoke.y - 170, alpha: 0, scale: 2.5, duration: 3000 + Math.random() * 1500 });
    }
    this.people(people, "!!");
    synth.play("gasp");
    await this.talk([
      say("FLENKY", "NOT AGAIN!!"),
      say("SCROMBUS", "NOT AGAIN!!"),
      say("KREZMAR", "NOT AGAIN!!!"),
      say("GRONNY", "Not again."),
      ping("DRONGUS", "NOT AGAIN !!"),
      say("KREZWONK", "Well. At least it won't collapse. They rebuilt it to code this time."),
    ]);
    synth.play("boom");
    this.cameras.main.shake(2800, 0.035);
    fire.destroy();
    this.tween({ targets: tw, scaleY: 0.05, duration: 2600, ease: "Quad.in" });
    for (let i = 0; i < 34; i++) {
      const dust = this.add.circle(620 + (Math.random() - 0.5) * 220, 420, 20 + Math.random() * 30, 0xb8a888, 0.85).setDepth(40);
      this.tween({ targets: dust, x: dust.x + (Math.random() - 0.5) * 640, y: 380 - Math.random() * 130, scale: 3, alpha: 0, duration: 3500 });
    }
    this.caption("KRELTOWER HAS FALLEN (AGAIN)", "#ff4d4d");
    synth.play("alarm");
    await this.wait(3000);
    await this.talk([
      dir("Silence. Then sirens. Then you land, gently, on top of the Great Tap."),
      say("KREZWONK", "…I'd like that struck from the record."),
      say(me, "Anyone got any pussy juice?"),
      ping("DRONGUS", "It only just got rebuilt !"),
      dir("KRELTOWER: DESTROYED (AGAIN). Krozno was found in the drinks trolley, unharmed, and charged with 'being up to his usual dirty bloody tricks'. The plane's autopilot has been asked for comment."),
    ]);
    synth.stopMusic();
    Object.assign(G.s.flags, { kreltower_resolved: true, kreltower_fell: true });
  }

  /** Down the aisle to the parachute. Everyone is in the way. Shove them. */
  private parachuteShove(me: string) {
    return new Promise<void>((resolve) => {
      this.add.rectangle(480, 270, 960, 540, 0x2a2f3a).setDepth(0);
      this.add.rectangle(480, 330, 960, 90, 0x7a1f2b).setDepth(1);
      for (let i = 0; i < 9; i++) {
        this.add.rectangle(60 + i * 110, 250, 70, 50, 0x334155).setStrokeStyle(2, 0x1e293b).setDepth(2);
        this.add.rectangle(60 + i * 110, 410, 70, 50, 0x334155).setStrokeStyle(2, 0x1e293b).setDepth(2);
      }
      this.add.text(480, 40, "GET TO THE PARACHUTE", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#ffd23f", stroke: "#000", strokeThickness: 7 }).setOrigin(0.5).setDepth(100);
      this.add.text(480, 78, "Tap / SPACE to shove passengers out of the aisle", { fontFamily: FONT, fontSize: "14px", color: "#ffffff" }).setOrigin(0.5).setDepth(100);
      const chute = this.add.text(900, 320, "🪂", { fontSize: "44px" }).setOrigin(0.5).setDepth(5);
      this.add.text(900, 360, "PARACHUTE", { fontFamily: FONT, fontSize: "11px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5).setDepth(5);
      const hero = this.add.sprite(80, 330, `spr_${me}`, 4).setScale(2.6).setDepth(20);
      const screams = ["HELP US!!", "LAND THE FUCKING PLANE", "WHO'S FLYING THIS", "I HAVE A FAMILY", "IS THAT A PARACHUTE", "SHARE IT!!", "MY DUTY FREE", "PLEASE", "DO SOMETHING"];
      const pax = [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const p = this.add.sprite(200 + i * 95, 330, `spr_FOLK${i % 4}`, 0).setScale(2.4).setDepth(10);
        p.setData("hp", 2 + (i % 2));
        return p;
      });
      const bubble = (x: number, y: number, t: string) => {
        const b = this.add.text(x, y, t, { fontFamily: FONT, fontSize: "12px", color: "#111", backgroundColor: "#ffffffee", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(50);
        this.tween({ targets: b, y: y - 16, alpha: 0, delay: 900, duration: 500 });
      };
      const panic = this.time.addEvent({ delay: 650, loop: true, callback: () => {
        const alive = pax.filter((p) => p.active && (p.getData("hp") as number) > 0);
        const p = alive[Math.floor(Math.random() * alive.length)];
        if (p) bubble(p.x, p.y - 50, screams[Math.floor(Math.random() * screams.length)]);
        this.cameras.main.shake(120, 0.003);
      } });
      let done = false;
      const shove = () => {
        if (done || this.box.active) return;
        const next = pax.find((p) => (p.getData("hp") as number) > 0);
        if (!next) return;
        this.tween({ targets: hero, x: next.x - 60, duration: 120 });
        synth.play("punch");
        const hp = (next.getData("hp") as number) - 1;
        next.setData("hp", hp);
        this.tweens.add({ targets: next, x: next.x + 14, duration: 70, yoyo: true });
        if (hp <= 0) {
          const up = Math.random() < 0.5;
          this.tween({ targets: next, y: up ? 250 : 410, x: next.x + 20, angle: up ? -80 : 80, duration: 260 });
          bubble(next.x, next.y - 50, ["OI!", "RUDE", "MY BACK", "SIR!!"][Math.floor(Math.random() * 4)]);
        }
        if (pax.every((p) => (p.getData("hp") as number) <= 0)) {
          done = true;
          panic.remove();
          this.input.keyboard?.off("keydown-SPACE", shove);
          this.input.off("pointerdown", shove);
          this.tween({ targets: hero, x: 860, duration: 500 }).then(() => {
            chute.destroy();
            synth.play("pickup");
            this.time.delayedCall(500, () => {
              this.children.removeAll(true);
              resolve();
            });
          });
        }
      };
      this.input.keyboard?.on("keydown-SPACE", shove);
      this.input.on("pointerdown", shove);
    });
  }

  /** Stuff Polson's face. Food slides down the table: shove it in as it reaches his mouth. Skip the salad. */
  private bulkPolson(pol: Phaser.GameObjects.Sprite, add = false) {
    return new Promise<void>((resolve) => {
      const MOUTH_X = pol.x + 30;
      const sx0 = pol.scaleX;
      const sy0 = pol.scaleY;
      const hud = this.add.text(480, 130, "", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ffffff", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(100);
      const help = this.add.text(480, 160, "Tap / SPACE when the food reaches his mouth. NOT the salad.", { fontFamily: FONT, fontSize: "13px", color: "#ffd23f", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(100);
      const zone = this.add.rectangle(MOUTH_X, 300, 60, 60).setStrokeStyle(3, 0xffd23f).setDepth(30);
      const menu = [
        { e: "🍔", name: "BURGER", good: true },
        { e: "🍫", name: "CHOCOLATE", good: true },
        { e: "🟫", name: "FUDGE", good: true },
        { e: "🍕", name: "PIZZA", good: true },
        { e: "🍩", name: "KREZPY KREAM", good: true },
        { e: "🥗", name: "SALAD", good: false },
      ];
      const lines = ["Great bulking food.", "Mmm. Gains.", "That's protein, that is.", "Bulking season.", "Get it in.", "Mork.", "More fudge.", "Clean bulk. Basically."];
      type Food = { t: Phaser.GameObjects.Text; good: boolean; done: boolean };
      const foods: Food[] = [];
      let eaten = 0;
      let wasted = 0;
      let spawned = 0;
      const TOTAL = 18;
      const say1 = (txt: string, col = "#ffffff") => {
        const b = this.add.text(pol.x, pol.y - pol.displayHeight / 2 - 24, txt, { fontFamily: FONT, fontSize: "13px", color: "#111", backgroundColor: "#ffffffee", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(60);
        b.setColor(col === "#ffffff" ? "#111" : col);
        this.tween({ targets: b, y: b.y - 18, alpha: 0, delay: 700, duration: 400 });
      };
      const spawn = this.time.addEvent({
        delay: 900,
        loop: true,
        callback: () => {
          if (spawned >= TOTAL) return;
          spawned++;
          const m = Math.random() < 0.18 ? menu[5] : menu[Math.floor(Math.random() * 5)];
          const t = this.add.text(1000, 300, m.e, { fontSize: "40px" }).setOrigin(0.5).setDepth(40);
          foods.push({ t, good: m.good, done: false });
        },
      });
      const shove = () => {
        if (this.box.active) return;
        const f = foods.find((x) => !x.done && Math.abs(x.t.x - MOUTH_X) < 46);
        pol.setFrame(3);
        this.time.delayedCall(120, () => pol.setFrame(0));
        if (!f) {
          synth.play("tap_fail");
          return;
        }
        f.done = true;
        this.tween({ targets: f.t, x: pol.x, y: pol.y - 20, scale: 0.2, duration: 160 }).then(() => f.t.destroy());
        if (!f.good) {
          synth.play("tap_fail");
          say1("THAT'S NOT BULKING FOOD", "#ef4444");
          pol.setTint(0x99ff99);
          this.time.delayedCall(400, () => pol.clearTint());
          return;
        }
        eaten++;
        synth.play(eaten % 2 ? "gulp" : "slurp");
        say1(lines[eaten % lines.length]);
        // he grows. Mostly sideways.
        this.tweens.add({ targets: pol, scaleX: sx0 * (1 + eaten * 0.13), scaleY: sy0 * (1 + eaten * 0.03), duration: 200, ease: "Back.out" });
        this.cameras.main.shake(80, 0.002 + eaten * 0.0004);
      };
      this.input.keyboard?.on("keydown-SPACE", shove);
      this.input.on("pointerdown", shove);
      const tick = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          for (const f of foods) {
            if (f.done) continue;
            f.t.x -= 4.2;
            if (f.t.x < MOUTH_X - 60) {
              f.done = true;
              if (f.good) {
                wasted++;
                say1("ON THE SHIRT", "#ef4444");
              }
              this.tween({ targets: f.t, y: 400, alpha: 0, duration: 300 }).then(() => f.t.destroy());
            }
          }
          hud.setText(`EATEN ${eaten}   ON THE FLOOR ${wasted}`);
          if (spawned >= TOTAL && foods.every((f) => f.done)) {
            tick.remove();
            spawn.remove();
            this.input.keyboard?.off("keydown-SPACE", shove);
            this.input.off("pointerdown", shove);
            hud.destroy();
            help.destroy();
            zone.destroy();
            G.s.flags.polson_fat = add ? ((G.s.flags.polson_fat as number) ?? 0) + eaten : Math.max((G.s.flags.polson_fat as number) ?? 0, eaten);
            this.caption(eaten >= 12 ? "MAXIMUM BULK" : eaten >= 7 ? "BULKED" : "LIGHT BULK", "#ffd23f", 30);
            this.time.delayedCall(1200, () => resolve());
          }
        },
      });
    });
  }

}
