import Phaser from "phaser";
import type { Line } from "../../data/types";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, title } from "../ui/theme";
import { dir, ping, say } from "../../content/dsl";
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
      flatmate: () => this.flatmate(),
      rival: () => this.rival(),
      press_conference: () => this.pressConference(),
      polson_gym: () => this.polsonGym(),
      polson_cctv: () => this.polsonCctv(),
      wahooga: () => this.wahooga(),
    };
    await (run[data.id] ?? (async () => undefined))();
    G.s.flags[`vig_${data.id}`] = true;
    G.save();
    this.cameras.main.fadeOut(500);
    const next = data.id === "wahooga" ? () => switchTo(this, "CharSelect", { swap: true }) : () => switchTo(this, "Hub", { at: this.returnAt, from: "vignette" });
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
    for (let i = 0; i < 9; i++) {
      const f = this.add.image(380 + (i % 3) * 40, 360, "p_food").setScale(1.4).setDepth(20).setCrop((i % 3) * 20, 0, 20, 24);
      synth.play(i % 2 ? "gulp" : "slurp");
      pol2.setFrame(3);
      await this.tween({ targets: f, x: pol2.x, y: pol2.y - 20, scale: 0.2, duration: 260 });
      f.destroy();
      pol2.setFrame(0);
      pol2.setScale(3 + i * 0.08, 3 + i * 0.03);
    }
    await this.talk([
      say("POLSON", "Bulked."),
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

}
