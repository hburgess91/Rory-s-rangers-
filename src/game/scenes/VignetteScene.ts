import Phaser from "phaser";
import { playerKey } from "../gfx/sanmikForm";
import { kruncherVictim } from "../systems/sanmik";
import { hasVfx, vfx } from "../gfx/Vfx";
import type { Line } from "../../data/types";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo, fadeThen, advanceChapter } from "../Flow";
import { synth } from "../audio/Synth";
import { FONT, title } from "../ui/theme";
import { dir, gabor, ping, say } from "../../content/dsl";
import { LADS } from "../../data/characters";
import { animateWalker, backdrop, charMeta, perfCycle, playPerf } from "../gfx/HD";
import { CHARACTERS } from "../../data/characters";
import { flap, fall, randomZone } from "../combat/Wonk";
import { maybeFinishArc } from "../systems/arcs";
import { addWrist, wristLook } from "../gfx/Wrist";
import { addCensorBar, censorRect } from "../gfx/Censor";
import * as KR from "../../content/krunchers";
import { GUNS } from "../combat/Guns";
import { ensureCh6Art } from "../gfx/ch6Art";
import * as Juice from "../gfx/Juice";
import {
  KP_KLERBLE, KP_LAST, KP_PARTY, KP_PROTOCOL, KP_RUINS, KT_AFTER, KT_ARRIVE, KT_DEPART, KT_DRIVER, KT_KRUNCHERS, KT_OPEN, PE_RAIN,
  RM_ACTUALLY, RM_ARMS, RM_CAUTION, RM_CHEM, RM_END, RM_GOT_GUN, RM_HANDS, RM_JENKO, RM_KREBLIS, RM_LUKE, RM_NUKE, RM_OPEN, RM_PISS,
  RM_REVENGE, RM_SHOVE, RM_SHOWOFF, RM_THROW, RM_UNITE, TP_DANCE, TP_DOOM, TP_END, TP_OPEN,
} from "../../content/ch6";

/** Short scripted animations: tweens + dialogue. All violence is cartoonish and stylised. */
/** Polson's belly: how fat he is (polson_fat) -> which of the twelve fat-sheet frames. */
const Polson = {
  bellyFrame(fat: number) {
    return Math.max(0, Math.min(11, Math.round(fat)));
  },
};

/** A full-size Krel Tower in a cutscene (see bigTower()). `at(f)` is the screen y a fraction f of the way up it. */
interface BigTower {
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  x: number;
  ground: number;
  h: number;
  w: number;
  at: (f: number) => number;
}

/** Everyone on stage as black silhouettes for one frozen frame (the instant of a blast), then back to normal. */
function everyoneSil(sc: Phaser.Scene, sps: Phaser.GameObjects.Sprite[]) {
  const was = sps.map((sp) => ({ sp, d: sp.depth, tint: sp.isTinted ? sp.tintTopLeft : -1 }));
  for (const sp of sps) if (sp.active) sp.setTintFill(0x000000).setDepth(Math.max(sp.depth, 996));
  window.setTimeout(() => {
    for (const { sp, d, tint } of was) {
      if (!sp.active || !sc.sys.settings.active) continue;
      sp.clearTint();
      if (tint >= 0) sp.setTint(tint);
      sp.setDepth(d);
    }
  }, 170);
}

export class VignetteScene extends Phaser.Scene {
  private box!: DialogueBox;
  private returnAt = "";
  /** Who's on stage, by speaker id (their line makes them hop). */
  private cast = new Map<string, Phaser.GameObjects.Sprite>();

  constructor() {
    super("Vignette");
  }

  async create(data: { id: string; returnAt?: string }) {
    this.returnAt = data.returnAt ?? "";
    this.lastCaption = undefined;
    this.cast = new Map();
    this.cameras.main.fadeIn(400);
    this.box = new DialogueBox(this, 1000, 0.1);
    Juice.pinDialogue(this, this.box);
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
      sanmik_finale: () => this.sanmikFinale(),
      crobley_news: () => this.crobleyNews(),
      crobley_presser: () => this.crobleyPresser(),
      crobley_boom: () => this.crobleyBoom(),
      wahooga: () => this.wahooga(),
      kruncher_mikey: () => this.krunchers(),
      klerble_train: () => this.klerbleTrain(),
      revenge_meeting: () => this.revengeMeeting(),
      krunch_protocol: () => this.krunchProtocol(),
      townhall_party: () => this.townhallParty(),
    };
    await (run[data.id] ?? (async () => undefined))();
    // rain / storm loops started by a cutscene end with it
    synth.weatherSound(null);
    G.s.flags[`vig_${data.id}`] = true;
    if (data.id === "revenge_meeting") {
      Object.assign(G.s.flags, { revenge_meeting: true, raid_march: true });
      this.giveFlamer();
    }
    if (data.id === "townhall_party") {
      Object.assign(G.s.flags, { ch6_clear: true, ch6_outro: true, krelworld_bombed: true });
      advanceChapter();
    }
    G.save();
    const next =
      data.id === "revenge_meeting"
        ? () => switchTo(this, "Hub", { at: "TOWN_HALL", from: "vignette" })
        : data.id === "krunch_protocol"
          ? () => switchTo(this, "Hub", { at: "TOWN_HALL", from: "krunch" })
        : data.id === "townhall_party"
          ? () => switchTo(this, "Hub", { at: "TOWN_HALL", from: "vignette" })
        : data.id === "wahooga"
        ? () => switchTo(this, "CharSelect", { swap: true })
        : data.id === "kruncher_mikey"
          ? () => switchTo(this, "Home", {})
        : data.id === "sanmik_lampe"
          ? () => switchTo(this, "Dungeon", { dungeon: "arena_sanmik", room: 0 })
          : () => switchTo(this, "Hub", { at: this.returnAt, from: "vignette" });
    fadeThen(this, 250, next);
  }

  // ---------------------------------------------------------------- THE KREDDLE KRUNCHERS INVADE

  /** The Krunchers: the lads' sprites in Kreddle neon. */
  private kruncherSprites(x: number, y: number, gap = 70, scale = 2.8) {
    return KR.KRUNCHERS.filter((k) => this.textures.exists(`spr_${k.of}`)).map((k, i) => {
      const sp = this.add.sprite(x + i * gap, y + (i % 2) * 16, `spr_${k.of}`, 0).setScale(scale).setDepth(40 + i);
      sp.setTint(i % 2 ? 0xff9de6 : 0x9be7ff);
      return sp;
    });
  }

  private shout(spr: Phaser.GameObjects.Sprite, text: string, color = "#ffd1f3") {
    const t = this.add.text(spr.x, spr.y - 120, text, { fontFamily: FONT, fontSize: "15px", color: "#111", backgroundColor: color, padding: { x: 6, y: 3 }, fontStyle: "bold" }).setOrigin(0.5).setDepth(400);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, delay: 900, duration: 500, onComplete: () => t.destroy() });
  }

  /** The Krunchers find Mikey outside Krelburger (the bridge and the Tap happen in town, in HubScene). */
  private async krunchers() {
    const s = G.s;
    synth.music("klerble");
    // Mikey
    if (!backdrop(this, "bg_city", { depth: -10 })) this.sky(0x8fc3ea, 0xf3d9b1);
    this.add.rectangle(480, 450, 960, 200, 0x5b5b66).setDepth(-5);
    this.add.text(480, 200, "KRELBURGER", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#ffd23f", stroke: "#7f1d1d", strokeThickness: 6 }).setOrigin(0.5).setDepth(-4);
    // playing as Mikey, it's Polson they get (protein shake for bongo)
    const pol = kruncherVictim(s) === "POLSON";
    const vKey = pol ? "spr_POLSON" : "spr_MIKEY";
    const mikey = this.add.sprite(480, 345, vKey, 0).setScale(3).setDepth(50);
    const mm = charMeta(this, vKey);
    const gang = this.kruncherSprites(-600, 340, 60, 2.8);
    await this.tween({ targets: gang, x: "+=640", duration: 1800 });
    await this.talk(pol ? KR.KR_POLSON_MEET : KR.KR_MIKEY_MEET);
    // they close in round him
    await this.tween({ targets: gang, x: (_t: unknown, _k: string, _v: number, i: number) => 330 + (i % 5) * 70 + (i > 4 ? 30 : 0), y: (_t: unknown, _k: string, _v: number, i: number) => (i > 4 ? 365 : 325), duration: 700 });
    await this.talk(pol ? KR.KR_POLSON_BEG : KR.KR_MIKEY_BEG);
    const hits = ["WHAM!", "KRUNCH!", "BOSH!", "THWACK!", "SPLAT!", "KAPOW!", "OOF!", "NOT THE FACE!", "WALLOP!", "KRUNCH!!"];
    for (let i = 0; i < hits.length; i++) {
      const k = gang[i % gang.length];
      this.tween({ targets: k, x: k.x + (mikey.x - k.x) * 0.35, yoyo: true, duration: 110 });
      synth.play(i % 3 === 2 ? "punch_big" : "punch");
      vfx(this, i % 2 ? "vfx_hit" : "vfx_stars", mikey.x + (Math.random() - 0.5) * 50, mikey.y - 50 + (Math.random() - 0.5) * 40, { scale: 1.6, depth: 300 });
      if (G.meta.settings.gore !== false && i % 3 === 1) vfx(this, "vfx_blood", mikey.x, mikey.y - 40, { scale: 1.4, depth: 290 });
      const hurt = mm?.hurt?.south;
      if (hurt?.length) mikey.setFrame(hurt[i % hurt.length]);
      this.cameras.main.shake(120, 0.008);
      this.caption(hits[i], i % 2 ? "#ff4d4d" : "#ffd23f", 30 + (i % 3) * 4);
      await this.wait(330);
    }
    const fall = mm?.death?.east ?? mm?.death?.south;
    if (fall?.length) for (const f of fall) {
      mikey.setFrame(f);
      await this.wait(110);
    }
    else mikey.setAngle(90);
    vfx(this, "vfx_dust", mikey.x, mikey.y, { scale: 2, depth: 45 });
    this.lastCaption?.destroy();
    if (pol) this.proteinShake(mikey.x + 46, mikey.y - 4);
    else if (this.textures.exists("p_bongo")) this.add.image(mikey.x - 10, mikey.y - 30, "p_bongo").setScale(1.4).setAngle(20).setDepth(60);
    // from here on (for the rest of Chapter 3) the victim's portrait has the black eye and fat lip
    s.flags.krunchers_invaded = true;
    await this.talk(pol ? KR.KR_POLSON_AFTER : KR.KR_MIKEY_AFTER);
    await this.tween({ targets: gang, x: "+=900", duration: 2000 });

  }

  /** Polson's protein shake, on his head like a little hat (a shaker bottle: lid, body, label). */
  private proteinShake(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(60).setAngle(105);
    c.add(this.add.rectangle(0, 6, 26, 34, 0xe5e7eb).setStrokeStyle(2, 0x111827));
    c.add(this.add.rectangle(0, 8, 26, 12, 0x7c3aed));
    c.add(this.add.text(0, 8, "WHEY", { fontFamily: FONT, fontSize: "7px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5));
    c.add(this.add.rectangle(0, -14, 22, 8, 0x111827));
    c.add(this.add.rectangle(6, -20, 5, 6, 0x111827));
    // a dribble down his face
    const d = this.add.rectangle(x - 18, y + 6, 3, 4, 0xf5f0e6).setOrigin(0.5, 0).setDepth(61);
    this.tweens.add({ targets: d, scaleY: 6, duration: 1600 });
  }

  /** A drawn explosion (PixelLab VFX) plus smoke; false if the art isn't loaded. Pass a container to put it inside one. */
  private boomAt(x: number, y: number, size = 1, depth = 60, into?: Phaser.GameObjects.Container): boolean {
    const big = size >= 1.3 && hasVfx(this, "vfx_bigboom");
    const s = vfx(this, big ? "vfx_bigboom" : "vfx_boom", x, y, { scale: big ? size : size * 1.2, depth });
    if (!s) return false;
    const sm = vfx(this, "vfx_smoke", x + (Math.random() - 0.5) * 20, y - 12 * size, { scale: size, depth: depth - 1, delay: 380 });
    if (into) into.add([s, ...(sm ? [sm] : [])]);
    return true;
  }

  /** A fire that keeps burning (wreckage): drawn flames and a smoke column, or a glowing blob if the art's missing. Destroy the container to put it out. */
  private fireBlob(x: number, y: number, size: number, depth: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0).setDepth(depth);
    if (hasVfx(this, "vfx_fire")) {
      for (let i = 0; i < 3; i++) {
        const f = vfx(this, "vfx_fire", x + (i - 1) * size * 0.45, y + 10 + (i === 1 ? -6 : 0), { scale: (size / 50) * (i === 1 ? 1.3 : 0.9), depth, delay: i * 90 });
        if (f) c.add(f);
      }
      const sm = vfx(this, "vfx_smokecol", x, y - size * 0.4, { scale: size / 40, depth: depth - 1, alpha: 0.85 });
      if (sm) c.add(sm);
      return c;
    }
    const blob = this.add.circle(x, y, 20, 0xff7a00, 0.95);
    c.add(blob);
    this.tween({ targets: blob, radius: size, duration: 600 });
    return c;
  }

  /**
   * The Krel Tower at full cutscene size: base on the ground line, spire up at the top of the
   * screen (a touch past it, so it reads as huge and you're looking up at it). Sizes are set in
   * screen pixels, so it doesn't matter which art is loaded.
   */
  private bigTower(x: number, ground: number, depth = 10, top = -30): BigTower {
    const img = this.add.image(x, ground, "p_kreltower").setOrigin(0.5, 1).setDepth(depth);
    const h = ground - top;
    img.displayHeight = h;
    img.displayWidth = (h * img.width) / img.height;
    // the base sits in a little shadow so it feels planted, not pasted on
    const shadow = this.add.ellipse(x, ground - 2, img.displayWidth * 1.5, 22, 0x000000, 0.35).setDepth(depth - 1);
    return { img, shadow, x, ground, h, w: img.displayWidth, at: (f: number) => ground - h * f };
  }

  /**
   * Flight KR-069, `width` screen pixels nose to tail (the HD art when it's loaded). `flip` points it
   * left: that uses the left-facing copy so "KREL AIR" still reads the right way round.
   */
  private airliner(x: number, y: number, width = 250, flip = false) {
    const key = flip && this.textures.exists("p_plane_hd_l") ? "p_plane_hd_l" : this.textures.exists("p_plane_hd") ? "p_plane_hd" : "p_plane";
    const p = this.add.image(x, y, key).setDepth(20).setFlipX(flip && key !== "p_plane_hd_l");
    p.displayWidth = width;
    p.displayHeight = (width * p.height) / p.width;
    return p;
  }

  /**
   * A tower coming down: it sinks into its own footprint (masked at the ground line), leaning a
   * little, with booms rolling down the falling top, a smoke column and dust rolling out at the base.
   */
  private collapseFx(t: BigTower, dur = 2600) {
    const mask = this.make.graphics({}, false).fillRect(0, -600, 960, t.ground + 600);
    t.img.setMask(mask.createGeometryMask());
    this.tweens.add({ targets: t.img, y: t.ground + t.h * 0.97, duration: dur, ease: "Quad.in" });
    this.tweens.add({ targets: t.img, angle: { from: 0, to: 4 }, duration: dur, ease: "Sine.in" });
    this.tweens.add({ targets: t.shadow, alpha: 0, duration: dur });
    // booms chase the top of the tower down
    const top0 = t.ground - t.h;
    for (let i = 0; i < 8; i++) {
      const ms = i * (dur / 8);
      const p = (ms / dur) ** 2;
      this.time.delayedCall(ms, () => this.boomAt(t.x + (Math.random() - 0.5) * t.w * 0.8, top0 + t.h * (p + 0.12 + Math.random() * 0.15) + 60, 1.4 + Math.random() * 0.7, 41));
    }
    vfx(this, "vfx_blastsmoke", t.x, t.ground - 10, { scale: 3.2, depth: 42, delay: 600 });
    for (let i = 0; i < 5; i++) vfx(this, "vfx_dust", t.x + (i - 2) * t.w * 0.7, t.ground - 5, { scale: 2.8, depth: 43, delay: 900 + i * 150 });
  }

  /** Wipe the set for the next shot, but keep the dialogue box (depth 1000+) alive. */
  private clearStage() {
    this.cast.clear();
    for (const o of [...this.children.list]) {
      if ((o as unknown as { depth: number }).depth >= 1000) continue;
      this.tweens.killTweensOf(o);
      o.destroy();
    }
  }

  private wait(ms: number) {
    return new Promise<void>((res) => this.time.delayedCall(ms, () => res()));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    // a character being moved walks there (instead of sliding), unless something else is already animating them
    const ts = (Array.isArray(cfg.targets) ? cfg.targets : [cfg.targets]) as unknown[];
    const walkers = ts.filter(
      (t): t is Phaser.GameObjects.Sprite =>
        t instanceof Phaser.GameObjects.Sprite && ("x" in cfg || "y" in cfg) && !("angle" in cfg) && !("scale" in cfg) && !!charMeta(this, t.texture.key) && !t.getData("walking"),
    );
    const from = walkers.map((w) => ({ w, x: w.x, y: w.y }));
    const ev = walkers.length
      ? this.time.addEvent({
          delay: 60,
          loop: true,
          callback: () => {
            for (const f of from) {
              const dx = f.w.x - f.x;
              const dy = f.w.y - f.y;
              if (Math.abs(dx) + Math.abs(dy) > 0.5) animateWalker(f.w, dx, dy, true, this.time.now);
              f.x = f.w.x;
              f.y = f.w.y;
            }
          },
        })
      : null;
    walkers.forEach((w) => w.setData("walking", true));
    return new Promise<void>((res) =>
      this.tweens.add({
        ...cfg,
        onComplete: () => {
          ev?.remove();
          walkers.forEach((w) => {
            w.setData("walking", false);
            if (w.active) animateWalker(w, 0, 0, false, this.time.now);
          });
          res();
        },
      }),
    );
  }

  private talk(lines: Line[]) {
    if (!this.cast.size) return this.box.play(lines);
    return this.box.play(lines, { onLine: (l) => this.hopSpeaker(String(l.s)) });
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
    const ids = [...LADS.filter((p) => p !== G.s.player), "PROCTUS", G.s.player, "FOLK0", "FOLK1", "FOLK2", "FOLK3"];
    return ids.map((id, i) => this.add.sprite(60 + i * 64, y + (i % 2) * 14, id === G.s.player ? playerKey(this) : `spr_${id}`, 0).setScale(2.6).setDepth(50));
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
    const tower = this.bigTower(560, 440);
    this.add.text(560, 446, "KRELTOWER", { fontFamily: FONT, fontSize: "11px", color: "#ffffff", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setDepth(11);
    const people = this.crowd(470);
    synth.music("airport");
    await this.talk([dir(saved ? "Krelford. Everyone is outside. Everyone is looking up." : "Krelford. Everyone is outside. Everyone is looking up. Somebody drops a fizzy bongo.")]);
    // it comes in from the right, heading for two-thirds of the way up
    const hitY = tower.at(0.66);
    const plane = this.airliner(1120, hitY - 70, 240, true);
    if (saved) {
      await this.tween({ targets: plane, x: 800, y: hitY, angle: -4, duration: 2200, ease: "Sine.inOut" });
      this.people(people, "!");
      this.caption("PULL UP!!!", "#ffd23f");
      // up and over the spire, off the top of the screen…
      await this.tween({ targets: plane, x: 640, y: -90, angle: 30, duration: 1100, ease: "Quad.in" });
      // …and back down the other side, nose first, into the Tap
      plane.setPosition(420, -80).setAngle(-28);
      await this.tween({ targets: plane, x: 200, y: 330, angle: -14, duration: 1800, ease: "Sine.in" });
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
        say("KREBLIS", "Krelmergency over. I repeat. Krelmergency over"),
        say("KREBLIS", "The plane is in the Tap"),
        say("KREBLIS", "Mmm…Tap…"),
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
    // nose into the tower two-thirds of the way up
    await this.tween({ targets: plane, x: 560 + plane.displayWidth * 0.32, y: hitY, angle: -3, duration: 2600, ease: "Sine.in" });
    plane.destroy();
    synth.play("boom");
    this.cameras.main.flash(500, 255, 240, 200);
    this.cameras.main.shake(1200, 0.025);
    this.boomAt(560, hitY, 2.8, 16);
    this.time.delayedCall(220, () => this.boomAt(560 + tower.w * 0.4, hitY + 30, 1.6, 16));
    this.time.delayedCall(380, () => this.boomAt(560 - tower.w * 0.35, hitY - 20, 1.4, 16));
    const fire = this.fireBlob(560, hitY + 6, 90, 15);
    this.people(people, "!!");
    synth.play("gasp");
    await this.talk([say("KREBLIS", "This is a Krelmergency message… Kreltower has been hit. I repeat. Kreltower has been hit"), say("KREBLIS", "Thinking about it…"), say("KREBLIS", "Again")]);
    for (let i = 0; i < (hasVfx(this, "vfx_smokecol") ? 0 : 16); i++) {
      const smoke = this.add.circle(560 + (Math.random() - 0.5) * 80, hitY - Math.random() * 40, 16 + Math.random() * 20, 0x333333, 0.7).setDepth(14);
      this.tween({ targets: smoke, y: smoke.y - 160, alpha: 0, scale: 2.5, duration: 3000 + Math.random() * 1500 });
    }
    await this.wait(1200);
    synth.play("boom");
    this.cameras.main.shake(2600, 0.03);
    fire.destroy();
    this.collapseFx(tower);
    for (let i = 0; i < (hasVfx(this, "vfx_dust") ? 10 : 30); i++) {
      const dust = this.add.circle(560 + (Math.random() - 0.5) * 200, 430, 20 + Math.random() * 30, 0xb8a888, 0.85).setDepth(40);
      this.tween({ targets: dust, x: dust.x + (Math.random() - 0.5) * 700, y: 400 - Math.random() * 160, scale: 3, alpha: 0, duration: 3500, delay: 400 + Math.random() * 1400 });
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

  /** The krezz comes out of the abandoned building: out of the door, out of the windows, across the ground. */
  private krezzFlood(dx: number, dy: number) {
    const cream = 0xf8f8f2;
    // the painted backdrop's doorway and windows sit in different places from the fallback drawing
    const painted = this.textures.exists("bg_abandoned");
    const door = painted ? { x: 540, y: 420 } : { x: dx, y: dy + 30 };
    const ground = painted ? 462 : dy + 38;
    const spouts: [number, number][] = painted ? [[215, 95], [345, 95], [600, 90], [540, 300]] : [[360, 245], [440, 245], [560, 245], [620, 245], [480, 130]];
    synth.play("splash");
    this.time.delayedCall(250, () => synth.play("flush"));
    // it pours out of the doorway in waves and runs off along the ground both ways
    this.time.addEvent({
      delay: 45,
      repeat: 70,
      callback: () => {
        const dir = Math.random() < 0.5 ? -1 : 1;
        const blob = this.add.ellipse(door.x + (Math.random() - 0.5) * 40, door.y - Math.random() * 40, 26 + Math.random() * 20, 16 + Math.random() * 10, cream, 0.95).setDepth(26);
        const run = 120 + Math.random() * 360;
        this.tweens.add({ targets: blob, x: blob.x + dir * run, y: ground + (Math.random() - 0.5) * 10, scaleX: 2.2, scaleY: 0.6, duration: 700 + run * 1.6, ease: "Quad.out", onComplete: () => {
          blob.setDepth(7);
          this.tweens.add({ targets: blob, alpha: 0.75, delay: 5000, duration: 3000 });
        } });
      },
    });
    // the puddle itself, lumpy, spreading
    for (let i = 0; i < 9; i++) {
      const x = door.x + (i - 4) * 70 + (Math.random() - 0.5) * 30;
      const pud = this.add.ellipse(x, ground + (Math.random() - 0.5) * 8, 10, 6, cream, 0.92).setDepth(7);
      this.tweens.add({ targets: pud, displayWidth: 110 + Math.random() * 90, displayHeight: 22 + Math.random() * 16, delay: 300 + Math.abs(i - 4) * 260, duration: 1600, ease: "Quad.out" });
      const sh = this.add.ellipse(x - 10, ground - 4, 6, 3, 0xffffff, 1).setDepth(8);
      this.tweens.add({ targets: sh, displayWidth: 50, delay: 300 + Math.abs(i - 4) * 260, duration: 1600 });
    }
    // jets out of the windows
    spouts.forEach(([sx, sy], k) => {
      this.time.addEvent({
        delay: 55,
        repeat: 34,
        startAt: k * 15,
        callback: () => {
          const d = this.add.circle(sx, sy, 3 + Math.random() * 5, cream).setDepth(27);
          const vx = (sx < 480 ? -1 : 1) * (40 + Math.random() * 160);
          const st = { t: 0 };
          const fall = ground - sy;
          this.tweens.add({ targets: st, t: 1, duration: 650 + Math.random() * 300, onUpdate: () => d.setPosition(sx + vx * st.t, sy - 50 * st.t + (fall + 50) * st.t * st.t), onComplete: () => {
            d.destroy();
            if (Math.random() < 0.25) {
              const sp = this.add.ellipse(sx + vx, ground + (Math.random() - 0.5) * 10, 24, 8, cream, 0.9).setDepth(7);
              this.tweens.add({ targets: sp, alpha: 0.6, delay: 4000, duration: 3000 });
            }
          } });
        },
      });
      // a drip running down the wall under each window
      if (sy < 300) {
        const drip = this.add.rectangle(sx + (Math.random() - 0.5) * 20, sy + 20, 9, 6, cream).setOrigin(0.5, 0).setDepth(6);
        this.tweens.add({ targets: drip, displayHeight: ground - sy - 30, delay: 400 + k * 150, duration: 2600, ease: "Sine.in" });
      }
    });
  }

  /** `spy` = the player is somebody else, watching Lulon from the bushes. */
  private async pudding(spy?: string) {
    const watcherId = spy ?? (G.s.flags.pudding_follower as string) ?? LADS.filter((id) => id !== "CRONGUS")[Math.floor(Math.random() * 8)];
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
    // the song starts as soon as we're at the door
    synth.music("bbp", true);
    await this.talk([dir("The abandoned building. A faint smell of custard. And something underneath the custard that the custard is trying to cover up.")]);
    this.time.addEvent({ delay: 140, repeat: 14, callback: () => animateWalker(luke, 1, 0, true, this.time.now) });
    await this.tween({ targets: luke, x: 480, duration: 2000 });
    await this.talk([say("CRONGUS", "Hello? Is the… is the bread and butter pudding here?"), dir("Something inside says 'yes'. It is not clear what said it.")]);
    await this.tween({ targets: luke, alpha: 0, scale: 2.6, duration: 600 });
    door.setFillStyle(0x000000);
    await this.wait(600);
    const moans = ["mmmm", "mm fuck yes", "MMMMMM", "MMM FUCK YES", "mmmmmmmm…", "oh", "fuck yes…", "OHHH", "mmmMMMMM", "…mmm", "MM. FUCK. YES.", "MMMMMMMMMMM"];
    for (let i = 0; i < 14; i++) {
      this.time.delayedCall(i * 380, () => {
        const t = this.add.text(320 + Math.random() * 320, 180 + Math.random() * 220, moans[i % moans.length], { fontFamily: FONT, fontSize: `${14 + (i % 4) * 5}px`, color: "#ffe4ec", fontStyle: "italic", stroke: "#000", strokeThickness: 3 }).setDepth(30);
        this.tween({ targets: t, y: t.y - 30, alpha: 0, duration: 1500 });
        // the noises: moans that match the words, grunts in between, getting higher and louder
        const word = moans[i % moans.length].toLowerCase();
        const p = 1 + i * 0.025;
        synth.voice(word.startsWith("oh") ? "oh" : "mmm", 0.35 + i * 0.03, p);
        if (word.includes("fuck")) synth.voice("grunt", 0.5, p, 0.18);
        if (i % 2) synth.voice("grunt", 0.4 + i * 0.02, p * 0.95, 0.3);
        // the whole building shakes, more and more
        this.cameras.main.shake(380, 0.006 + i * 0.0018);
        g.setAlpha(i % 2 ? 0.85 : 1);
        this.tweens.add({ targets: door, scaleX: 1.08, scaleY: 0.94, yoyo: true, duration: 90 });
      });
    }
    await this.wait(14 * 380 + 800);
    // the wonk
    if (spy) {
      await this.talk([dir("From inside: a slow, rhythmic creaking. Then a faster one."), say(spy, "Oh no. He's wonking. He's wonking in there. Over the pudding.")]);
    } else await this.puddingWonk();
    this.cameras.main.shake(1200, 0.03);
    synth.voice("oh", 0.7, 1.35);
    synth.voice("grunt", 0.7, 1.1, 0.5);
    synth.voice("oh", 0.6, 1.5, 0.75);
    this.krezzFlood(door.x, door.y);
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
    // Crongus with his hand down there (his wonk loop), the bar over it; a stand-in wrist only if the art is missing
    const cr = this.add.sprite(380, 290, "spr_CRONGUS", 0).setScale(4);
    const pump = perfCycle(cr, "wonk");
    if (pump) cr.setFrame(pump[0]);
    const crr = censorRect(cr);
    const wrist = addWrist(this, crr.x - 6, crr.y - crr.h * 0.1, { ...wristLook("CRONGUS", CHARACTERS as any), scale: 2 });
    wrist.obj.setVisible(!pump);
    let pumpPhase = 0;
    ui.add([cr, wrist.obj, addCensorBar(this, cr, { pad: 1 }).obj]);
    const status = this.add.text(380, 420, "", { fontFamily: "Impact, sans-serif", fontSize: "24px", color: "#ffe4ec", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5);
    ui.add(status);
    const press = () => {
      flap(g0);
      wrist.kick();
      pumpPhase += 1;
    };
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
          if (pump) {
            pumpPhase += 0.016 * (6 + g0.gauge * 14);
            cr.setFrame(pump[Math.floor(pumpPhase) % pump.length]);
          }
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
    this.clearStage();
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
      if (!this.boomAt(x, y, 1.4, 70))
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
    press.forEach((p, i) => this.time.delayedCall(200 + i * 60, () => void this.tween({ targets: p, x: i % 2 ? p.x + 600 : p.x - 600, duration: 1400 })));
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
    const me = this.add.sprite(120, 390, playerKey(this), 0).setScale(3).setDepth(10);
    synth.music("hub");
    await this.talk([
      dir("Krunch Gym. You have taken Polson for 'an intense workout'. He is wearing brand new trainers, brand new shorts and a headband. The tags are still on all of them."),
      say("POLSON", "Tonight's the night!! Intense workout!!"),
      say("POLSON", "Make no mistake.. I want to be a monster. A great hulking monster 😅"),
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
      say("POLSON", "WAHAHAHA"),
      say("POLSON", "That's great for the core!! Thoughts?"),
      say(G.s.player, "That was two seconds."),
      say("POLSON", "Two seconds of pure core mr bee!! You can't overtrain the core. Ask the pre-eminent experts"),
      say("POLSON", "Another day, another gym sesh done!! In other news.. I'm starving 😅 Restaurant? Wbu?"),
    ]);
    // restaurant
    this.clearStage();
    this.lastCaption = undefined;
    if (!backdrop(this, "bg_restaurant", { depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_pub").setOrigin(0);
    if (!this.textures.exists("bg_restaurant")) this.add.rectangle(480, 380, 520, 60, 0x7a5230).setDepth(5);
    this.add.text(480, 80, "🍔 KREZ-KING BURGERS & PIZZA & FUDGE 🍕", { fontFamily: FONT, fontSize: "22px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5);
    const pol2 = this.add.sprite(420, 320, "spr_POLSON", 0).setScale(3).setDepth(10);
    this.add.sprite(560, 320, playerKey(this), 0).setScale(3).setDepth(10);
    void me;
    await this.talk([
      say("POLSON", "Four burgers please!! Double. Large pizza, meat feast, extra cheese, stuffed crust. And the fudge. All the fudge 😝"),
      say("WAITER", "All of it?"),
      say("POLSON", "It's bulking food!! Great bulking food. All I need is a fuck load of protein 😅"),
    ]);
    await this.bulkPolson(pol2);
    await this.talk([
      say("POLSON", "BULKED!! YES YES YES"),
      dir("Polson is now noticeably, structurally larger. His t-shirt has given up. The chair has given up."),
      say("POLSON", "Same time tomorrow? Intense workout then here!! Wbu?"),
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
    this.time.addEvent({ delay: 500, loop: true, callback: () => !pol.getData("wonking") && pol.setFrame(String(pol.frame.name) === "3" ? 0 : 3) });
    await this.talk([
      dir("14:00. Polson's message: 'At the gym 💪'. CAM 1: Polson is on the sofa. CAM 2: Polson is not at the gym."),
      ping("POLSON", "Leg day today!! Brutal 😅"),
      dir("CAM 1: Polson opens a family-size bag of crisps with both hands."),
    ]);
    await this.tween({ targets: pol, x: 250, y: 360, duration: 900 });
    await this.talk([dir("CAM 3: Polson at the fridge. He eats cheese directly from the block. He looks over his shoulder. He eats more cheese."), ping("POLSON", "Just finished my sets!! Pumped 💪 Wbu?")]);
    await this.tween({ targets: pol, y: 160, duration: 900 });
    await this.talk([
      dir("16:30. CAM 1: Polson is asleep on the sofa, holding a slice of pizza like a teddy bear."),
      ping("POLSON", "3 hours done!! Absolutely destroyed. Who even spends 3 hours in a fucking gym? Me apparently 😝"),
    ]);
    // 17:10: he wakes up. Something is coming.
    await this.cctvFarts(pol);
    // 18:40: the phone comes out
    await this.cctvWonk(pol);
    await this.talk([
      say("MIKEY", "(over the War Room comms) FGM to base. Subject has not left the house. Repeat, subject has not left the house. Subject has, however, eaten an entire fudge. And done… that. Twice, if you count the farts."),
      ping("KREZMAR", "Why is there no cheese in the War Room"),
      ping("POLSON", "The deed is done 😊"),
      dir("You save the footage to the Archive under 'Strange Occurrences'. Kreblis will want it. Polson's mum will definitely want it."),
    ]);
    synth.stopMusic();
  }


  /** Polson at his current (permanent) size. */
  private fatPolson(x: number, y: number, base = 3) {
    const f = Math.min(60, (G.s.flags.polson_fat as number) ?? 0);
    // past the biggest belly on the sheet he just keeps widening
    if (this.textures.exists("spr_POLSON_FAT")) return this.add.sprite(x, y, "spr_POLSON_FAT", Polson.bellyFrame(f)).setScale(base * (1 + Math.max(0, f - 11) * 0.025), base).setDepth(10);
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
    const me = this.add.sprite(160, 390, playerKey(this), 0).setScale(3).setDepth(10);
    synth.music("hub");
    await this.talk([
      dir("Krunch Gym. Again. Polson is wearing the same headband. The headband is now under considerable tension."),
      say("POLSON", "I've been bulking!! Thoughts? Be honest 😅"),
      say(G.s.player, "That's mostly fudge."),
      say("POLSON", "To be fair fudge is mass mr bee. Mass is mass"),
    ]);
    await this.tween({ targets: pol, x: 480, duration: 900 });
    synth.play("hit");
    this.cameras.main.shake(200, 0.006);
    await this.talk([dir("Polson enters the turnstile. Polson does not exit the turnstile."), say("POLSON", "It's narrower than last time!! They've changed it. Abysmal"), say("POLSON", "Push me. Push me through. This is part of the warm-up.")]);
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
      say("POLSON", "Warmed up!! Full body pump!! YES YES YES"),
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
      say("POLSON", "PERSONAL BEST!! 😅"),
      say("CHAD DELTOID", "(from the squat rack) Mate, that's a £900 bench."),
      say("POLSON", "Put it on mr bee's tab!! He won't mind. Scout promise"),
      dir("He points at you. Of course he points at you."),
      say("POLSON", "That's the session!! Post-workout window. I've got to get the protein in within thirty seconds or the gains evaporate. Make no mistake"),
      say("POLSON", "Restaurant!! Quick!! QUICK!!"),
    ]);
    this.clearStage();
    this.lastCaption = undefined;
    if (!backdrop(this, "bg_restaurant", { depth: -10 })) this.add.tileSprite(0, 0, 960, 540, "tile_pub").setOrigin(0);
    this.add.text(480, 80, "🍔 KREZ-KING BURGERS & PIZZA & FUDGE 🍕", { fontFamily: FONT, fontSize: "22px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5);
    const pol2 = this.fatPolson(420, 320);
    this.add.sprite(620, 320, playerKey(this), 0).setScale(3).setDepth(10);
    await this.talk([
      say("WAITER", "Oh no. Not him again. Last time he ate a chair leg by accident."),
      say("POLSON", "Protein shake please!! Chocolate. Blend a fudge into it. Blend two fudges. And a burger 😝"),
      say("WAITER", "…In the shake?"),
      say("POLSON", "Liquid gains!! Absorbs faster. If my memory serves correct"),
    ]);
    // (one round of feeding is enough: the shake goes straight down)
    G.s.flags.polson_fat = ((G.s.flags.polson_fat as number) ?? 0) + 8;
    synth.play("slurp");
    this.tweens.add({ targets: pol2, scaleX: pol2.scaleX * 1.06, duration: 300, ease: "Back.out" });
    if (pol2.texture.key === "spr_POLSON_FAT") pol2.setFrame(Polson.bellyFrame((G.s.flags.polson_fat as number) ?? 0));
    await this.talk([
      dir("He drinks it in one go. The straw collapses. The glass collapses. Something in his shirt gives way."),
      say("POLSON", "Oh that's delectable!! I can feel it going straight to the muscles"),
      dir("It is not going to the muscles. It is going everywhere except the muscles."),
      say("POLSON", "Gonna need a bigger headband 😅"),
      ping("POLSON'S MUM", "Why is there a bill from Krunch Gym for a bench"),
      ping("POLSON'S MUM", "And a turnstile"),
      ping("POLSON", "It was for the core!! Mum I promise"),
    ]);
    synth.stopMusic();
  }

  /** CCTV, CAM 1: Polson lets rip. The camera fogs up. */
  private async cctvFarts(pol: Phaser.GameObjects.Sprite) {
    await this.talk([dir("17:10. CAM 1: Polson wakes up. He shifts onto one buttock. He has the look of a man listening to something only he can hear.")]);
    const sizes = [0.6, 0.9, 1.4, 2.2];
    for (let i = 0; i < sizes.length; i++) {
      synth.play("fart");
      this.cameras.main.shake(180 + i * 120, 0.004 + i * 0.004);
      const tex = this.textures.exists("fx_gas") ? "fx_gas" : "fx_circle";
      for (let k = 0; k < 3 + i * 2; k++) {
        const c = this.add.image(pol.x - 14, pol.y + 18, tex).setTint(0xa3e635).setAlpha(0.75).setScale(0.2 * sizes[i]).setDepth(20);
        this.tweens.add({ targets: c, x: c.x - 40 - Math.random() * 120 * sizes[i], y: c.y - 20 - Math.random() * 60, scale: 0.6 * sizes[i], alpha: 0, duration: 1400 + i * 300, onComplete: () => c.destroy() });
      }
      const sub = this.add.text(250, 232, ["[FART]", "[LONGER FART]", "[WET FART]", "[FART CONTINUES FOR SOME TIME]"][i], { fontFamily: "monospace", fontSize: "13px", color: "#facc15", backgroundColor: "#000000cc", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: sub, alpha: 0, delay: 800, duration: 400, onComplete: () => sub.destroy() });
      this.tweens.add({ targets: pol, y: pol.y - 6 - i * 3, yoyo: true, duration: 90, repeat: i });
      await this.wait(950 + i * 150);
    }
    // the lens goes green
    const fog = this.add.rectangle(250, 150, 420, 200, 0x84cc16, 0).setDepth(25);
    this.tweens.add({ targets: fog, fillAlpha: 0.55, duration: 900 });
    await this.talk([
      dir("CAM 1 has fogged up. From the inside. The War Room microphone picks up a fifth one, which sounds like someone sitting on a duck."),
      say("POLSON", "(on CAM 1, to nobody) Oh that's delectable 😅"),
      ping("POLSON", "Core is on fire!!"),
      say("KREZWONK", "It's not his core that's on fire."),
    ]);
    this.tweens.add({ targets: fog, fillAlpha: 0, duration: 1200, onComplete: () => fog.destroy() });
  }

  /** CCTV, CAM 1: Polson, the phone, the sofa. A censor bar does its best. Then everything gets hit. */
  private async cctvWonk(pol: Phaser.GameObjects.Sprite) {
    await this.talk([dir("18:40. CAM 1: Polson gets his phone out. Turns it sideways. Turns the brightness all the way up. Looks over his shoulder at the window. Looks straight into CAM 1. Does not see it.")]);
    // the phone glow, and what's on it (thankfully, only the glow)
    const phone = this.add.rectangle(pol.x + 20, pol.y - 10, 14, 22, 0x93c5fd).setDepth(22).setStrokeStyle(2, 0x111827);
    const glow = this.add.circle(pol.x + 14, pol.y - 14, 34, 0x93c5fd, 0.25).setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.1, yoyo: true, repeat: -1, duration: 220 });
    const tag = this.add.text(250, 232, "[AUDIO: 'FILTHY VIDEOS ON HIS PHONE' — VOLUME: MAXIMUM]", { fontFamily: "monospace", fontSize: "11px", color: "#facc15", backgroundColor: "#000000cc", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(30);
    await this.talk([dir("The War Room cannot hear what he's watching. The War Room can hear that it is LOUD."), say("KREBLIS", "Oh no"), say("KREBLIS", "Oh no no no")]);
    // the wonking: wrist under the bar, faster and faster
    // his own wonk loop (hand down to the crotch) when the art has it, else a stand-in wrist
    const pump = perfCycle(pol, "wonk");
    pol.setData("wonking", true);
    const pr = censorRect(pol);
    const wrist = addWrist(this, pr.x - 4, pr.y - pr.h * 0.1, { ...wristLook("POLSON", CHARACTERS as any), scale: 1.4, speed: 160 });
    wrist.obj.setDepth(23).setVisible(!pump);
    const bar = addCensorBar(this, pol, { pad: 1 });
    bar.obj.setDepth(24);
    let pumpMs = 160;
    let pumpPhase = 0;
    const pumper = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (pump && pol.active) {
          pumpPhase += 16 / (pumpMs / 4);
          pol.setFrame(pump[Math.floor(pumpPhase) % pump.length]);
        }
        bar.follow();
      },
    });
    const barTxt = { destroy: () => pumper.remove() };
    const grunts = ["mmf", "hrrnnggh", "mmm", "yesss", "oh yeah", "HRRNNGH", "MMMMF"];
    for (let i = 0; i < 14; i++) {
      wrist.setSpeed(Math.max(45, 160 - i * 9));
      pumpMs = Math.max(45, 160 - i * 9);
      if (i % 2 === 0) synth.voice(i % 4 === 0 ? "grunt" : "mmm", 0.35 + i * 0.02, 1 + i * 0.02);
      const g = this.add.text(pol.x + 50 + Math.random() * 60, pol.y - 30 - Math.random() * 30, grunts[i % grunts.length], { fontFamily: FONT, fontSize: `${11 + (i % 3) * 3}px`, color: "#ffe4ec", fontStyle: "italic", stroke: "#000", strokeThickness: 3 }).setDepth(30);
      this.tweens.add({ targets: g, y: g.y - 20, alpha: 0, duration: 900, onComplete: () => g.destroy() });
      this.tweens.add({ targets: pol, y: pol.y - 2, yoyo: true, duration: 60 });
      if (i > 8) this.cameras.main.shake(120, 0.002 + (i - 8) * 0.002);
      await this.wait(320 - i * 12);
    }
    // KREZZ
    synth.voice("oh", 0.7, 1.4);
    synth.voice("grunt", 0.7, 1.2, 0.35);
    synth.play("splat");
    this.cameras.main.flash(250, 255, 255, 255);
    this.cameras.main.shake(700, 0.02);
    tag.destroy();
    const caption = this.caption("POLSON HAS KREZZED", "#ffffff", 30);
    const splatTex = this.textures.exists("fx_splat_white") ? "fx_splat_white" : null;
    const splat = (x: number, y: number, size: number, depth: number) => {
      const s = splatTex ? this.add.image(x, y, splatTex).setDisplaySize(size, size) : this.add.circle(x, y, size / 3, 0xf8f8f2);
      s.setDepth(depth).setRotation(Math.random() * Math.PI * 2).setAlpha(0.95);
      s.setScale(s.scaleX * 0.2, s.scaleY * 0.2);
      this.tweens.add({ targets: s, scaleX: s.scaleX * 5, scaleY: s.scaleY * 5, duration: 120, ease: "Back.out" });
      this.tweens.add({ targets: s, y: y + 30, delay: 700, duration: 2600, ease: "Sine.in" });
      return s;
    };
    // all over the lounge: the ceiling, the telly, the sofa, the lens
    for (let i = 0; i < 26; i++) {
      this.time.delayedCall(i * 45, () => {
        synth.play(i % 3 ? "splat" : "gasp");
        splat(80 + Math.random() * 340, 60 + Math.random() * 180, 20 + Math.random() * 40, 26);
      });
    }
    // and it gets on the other cameras somehow
    for (let i = 0; i < 18; i++) {
      this.time.delayedCall(600 + i * 70, () => splat(Math.random() * 960, Math.random() * 500, 50 + Math.random() * 80, 40));
    }
    await this.wait(2200);
    wrist.destroy();
    bar.destroy();
    barTxt.destroy();
    pol.setData("wonking", false);
    if (pump && pol.active) pol.setFrame(0);
    phone.destroy();
    glow.destroy();
    caption.destroy();
    this.lastCaption = undefined;
    await this.talk([
      dir("Every camera in the War Room has been hit. CAM 2 is at Krunch Gym, two miles away. CAM 2 has been hit."),
      say("KREZMAR", "How has it reached the gym"),
      say("SCROMBUS", "That's the first time anything of Polson's has been to the gym."),
      ping("POLSON", "Just done a set of reps!! 💪💦"),
      ping("POLSON", "Upper body day 😅"),
    ]);
  }

  /** The Mouth Workout. Hold to stretch his jaw open, release in the green to CHEW VERY HARD. */
  private async polsonMouth() {
    if (!backdrop(this, "tv_livingroom", { depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x3b2f2a);
    G.s.flags.polson_fat = Math.max(25, (G.s.flags.polson_fat as number) ?? 0);
    if (this.textures.exists("p_sofa")) this.add.image(330, 430, "p_sofa").setScale(2.6).setDepth(5);
    const pol = this.fatPolson(330, 360);
    const me = this.add.sprite(800, 390, playerKey(this), 0).setScale(3).setDepth(10);
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
      say("POLSON", "Gym's out!! Too many turnstiles. Too much standing 😅"),
      say("POLSON", "So I've designed my own routine!! Cutting edge. Make no mistake"),
      say("POLSON", "The mouth workout!!"),
      say(G.s.player, "The what."),
      say("POLSON", "Mouth workout!! By stretching my mouth open — really wide, full range of motion — and chewing very hard, I'm burning calories!!"),
      say("POLSON", "And building strong oral muscles!! Nobody trains the oral muscles. Biggest muscle group in the face. Neglected. Abysmal"),
      say(G.s.player, "So you're eating a cake."),
      say("POLSON", "I'm using the cake as resistance!! The cake is the equipment. Spot me? 😅"),
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
      say("POLSON", `${res.reps} reps. ${res.burned.toFixed(1)} calories burned. That's a deficit!! YES YES YES`),
      say(G.s.player, `You ate ${res.ate.toLocaleString()} calories.`),
      say("POLSON", "Of resistance mr bee!! That's all resistance. You don't count the equipment"),
      say("POLSON", "Feel this jaw!! Go on. Rock solid. Strong oral muscles. Thoughts?"),
      dir("You do not feel his jaw."),
      say("POLSON", "Same time tomorrow? Bigger cake!! Progressive overload 😝"),
      dir("Polson tries to stand up to see you out. Polson remains seated. The sofa has accepted him as one of its own."),
      ping("POLSON'S MUM", "Did someone deliver a cake the size of a fridge to the house"),
      ping("POLSON'S MUM", "He's meant to be getting trim"),
      ping("POLSON", "I AM getting trim!! Trimming the cake 😅"),
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

  /** Playing as Mikey you ARE SanMik: lines the player says *to* SanMik go to someone else in the room. */
  private youTo(alt: string): string {
    return G.s.player === "MIKEY" ? alt : G.s.player;
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
    // playing as Mikey, SanMik is you: no second one
    const me = G.s.player === "MIKEY" ? mik : this.add.sprite(820, 380, playerKey(this), 0).setScale(3).setDepth(10);
    // the lamp
    const lamp = this.add.container(470, 400).setDepth(20);
    lamp.add(this.add.ellipse(0, 0, 56, 24, 0xd4a017).setStrokeStyle(2, 0x7c5a00));
    lamp.add(this.add.triangle(38, -6, 0, 0, 30, -10, 0, 8, 0xd4a017));
    lamp.add(this.add.ellipse(0, -14, 22, 12, 0xe8b923));
    synth.music("majek_lampe", true);
    await this.talk([
      dir("The back room of the Krezz Arms, after the gig. SanMik is lying face-down on the stage 'cooling down'. SanChz is eating the setlist."),
      say("SANMIK", "Yee. 'Ello me dearies. How you all fucking doing, you fucking pricks."),
      say("SANMIK", "Found this in the skip out the back. Magic lamp. Looks like a naughty little dildo and it smells like rank fanny juice. Proper vintage."),
      say("SANCHZ", "Rub it."),
      say("SANMIK", "I'm gonna rub it like I rubbed one out last night, yee. Hehehe."),
      say(this.youTo("SANCHZ"), "Please don't say it like that."),
    ]);
    await this.mashFor(12, G.s.player === "MIKEY" ? "TAP / SPACE: rub the lamp (sorry)" : "TAP / SPACE: help SanMik rub the lamp (sorry)", (n) => {
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
      say(this.youTo("SANCHZ"), "Mikey. Think about this. You can have anything—"),
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
    const me = G.s.player === "MIKEY" ? mik : this.add.sprite(480, 430, playerKey(this), 0).setScale(3).setDepth(12);
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
      say("KREBLIS", "Krelmergency… there are two nations on my steps and neither of them has filled in the form"),
      say("KREBLIS", "Wot a story eh"),
      say(G.s.player, "What happened?"),
      gabor("SanChz drank the Pepsi Normal. The wish one. SanMik said it was a declaration of war. Then they both declared nations. I'm on both sides. They're both shouting at me. It's wonderful. I'm so scared."),
    ]);
    synth.music("sanmik_nation", true);
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
      say(this.youTo("KREBLIS"), "STOP. Both of you. There's only one place the San Brothers have ever settled anything."),
      say("SANMIK", "…"),
      say("SANCHZ", "…"),
      say("SANMIK & SANCHZ", "THE HOT TUB."),
    ]);
    // the summit
    this.cameras.main.flash(300, 255, 255, 255);
    leftCrowd.concat(rightCrowd).forEach((p) => p.setVisible(false));
    kre.setPosition(820, 330);
    if (me !== mik) me.setPosition(140, 400);
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
    this.clearStage();
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
      say(this.youTo("KREBLIS"), "You're in a G-string."),
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

  /** The Giant Hot Tub of Catford: unblock the jets, the Genie gets his bath, everyone goes home. */
  private async sanmikFinale() {
    if (!backdrop(this, "sm_bigtub", { depth: -10 })) this.sky(0x2a1050, 0x9b59ff);
    const { mik, chz } = this.sanmikSprites(200, 760, 400);
    const me = G.s.player === "MIKEY" ? mik : this.add.sprite(110, 410, playerKey(this), 0).setScale(3).setDepth(10);
    const goat = this.textures.exists("p_gabor") ? this.add.image(860, 440, "p_gabor").setOrigin(0.5, 1).setScale(1).setDepth(10) : this.add.circle(860, 420, 20, 0xffffff);
    void me;
    synth.music("ggg8");
    // three blocked jets along the tub
    const jets = [300, 480, 660].map((x) => {
      const c = this.add.container(x, 330).setDepth(20);
      c.add(this.add.circle(0, 0, 22, 0x3f3f46).setStrokeStyle(4, 0x71717a));
      const gunk = this.add.circle(0, 0, 18, 0x65a30d);
      c.add(gunk);
      return { c, gunk, clear: 0 };
    });
    await this.talk([
      dir("The Giant Hot Tub of Catford, Uncle-Rik-free for the first time in weeks. The water is grey-green. The jets are clogged solid with biofilm."),
      say("SANMIK", "Yee. Right. Get your fingers in them jets."),
      say("SANCHZ", "YEGHHH. I've done worse."),
      gabor("Use me. Use me as a plunger. I'm begging you. I'm begging you not to. I'm begging you."),
    ]);
    let done = 0;
    await this.mashFor(18, "TAP / SPACE: unblock the jets (3 of them, 6 good jabs each)", (n) => {
      const j = jets[Math.min(2, Math.floor((n - 1) / 6))];
      j.clear++;
      j.gunk.setScale(Math.max(0, 1 - j.clear / 6));
      synth.play(n % 2 ? "slurp" : "hit");
      const glob = this.add.circle(j.c.x, j.c.y, 6, 0x84cc16).setDepth(25);
      this.tween({ targets: glob, x: j.c.x + (Math.random() - 0.5) * 200, y: j.c.y - 120 - Math.random() * 60, alpha: 0, duration: 600 }).then(() => glob.destroy());
      if (j.clear === 6) {
        done++;
        this.caption(`JET ${done} UNBLOCKED`, "#7fdfff", 26);
        const spout = this.add.rectangle(j.c.x, j.c.y - 60, 14, 120, 0xbae6fd, 0.8).setDepth(24);
        this.tweens.add({ targets: spout, scaleY: 1.3, yoyo: true, repeat: -1, duration: 200 });
      }
    });
    this.cameras.main.flash(400, 186, 230, 253);
    synth.play("cheer");
    this.caption("THE GIANT HOT TUB IS FIXED", "#7fdfff", 30);
    const bubbles = this.time.addEvent({ delay: 90, loop: true, callback: () => {
      const b = this.add.circle(150 + Math.random() * 660, 380, 4 + Math.random() * 8, 0xe0f2fe, 0.85).setDepth(21);
      this.tween({ targets: b, y: 240 + Math.random() * 60, alpha: 0, duration: 1000 }).then(() => b.destroy());
    } });
    void bubbles;
    await this.wait(1200);
    // the genie gets in
    const genie = this.textures.exists("p_genie") ? this.add.image(480, 330, "p_genie").setOrigin(0.5, 1).setScale(0.1).setDepth(19) : this.add.ellipse(480, 280, 90, 140, 0x3b82f6).setScale(0.1).setDepth(19);
    await this.tween({ targets: genie, scale: this.textures.exists("p_genie") ? 2 : 1, duration: 900, ease: "Back.out" });
    synth.music("ggg13", true);
    await this.talk([
      say("GENIE", "…"),
      say("GENIE", "OHHHHHH."),
      say("GENIE", "TEN THOUSAND YEARS. TEN THOUSAND YEARS I HAVE WAITED FOR THIS."),
      say("SANMIK", "It's SanMik (in the hot tub)…"),
      say("SANCHZ", "With SanChz (in the hot tub)…"),
      say("GENIE", "AND A GENIE (IN THE HOT TUB)."),
    ]);
    this.tween({ targets: [mik, chz], x: (t: Phaser.GameObjects.Sprite) => (t === mik ? 400 : 560), y: 330, duration: 700 });
    await this.wait(800);
    this.tweens.add({ targets: [mik, chz, genie], y: "-=8", yoyo: true, repeat: -1, duration: 400, ease: "Sine.inOut" });
    await this.talk([
      say("SANMIK", "Lots of bubbles (in the hot tub)."),
      say("SANCHZ", "Lots of trouble (in the hot tub)."),
      say("GENIE", "WET PIZZA (IN THE HOT TUB)."),
      dir("A slice of pizza floats past. The Genie eats it. Ten thousand years of fury leave his face."),
      gabor("Can I come in? I'm coming in. I'm not allowed in. I'm in."),
      dir("Gabor is in the hot tub. Nobody stops him. It's that kind of night."),
      say("GENIE", "VERY WELL. A DEAL IS A DEAL. YOU MAY GO HOME. ALL OF YOU."),
      say("GENIE", "EXCEPT THE GOAT. THE GOAT STAYS WITH ME. HE IS THE ONLY ONE WHO UNDERSTANDS SUFFERING."),
      gabor("Oh no. Oh YES."),
      dir("In the distance, a bear in a cardigan waves from the door of a café caravan. Begour has made flapjacks for the road."),
      say("BEGOUR THE BEAR", "Bye loves! Come back any time. The lamp's in the Krezz Arms. Mind how you go!"),
      dir("The lamp glows. Pop. You're behind the Krezz Arms bins, slightly damp, smelling faintly of lavender and biofilm."),
    ]);
    G.s.flags.sanmik_tub_fixed = true;
    synth.stopMusic();
  }

  // ---------------------------------------------------------------- THE CROBLEY AFFAIR

  /** An image if we have it, otherwise a labelled blob so the scene still reads. */
  private art(x: number, y: number, key: string, scale: number, fallbackColor = 0xf9a8d4, label = "") {
    if (this.textures.exists(key)) return (key.startsWith("spr_") ? this.add.image(x, y, key, 0) : this.add.image(x, y, key)).setScale(scale);
    const c = this.add.container(x, y);
    c.add(this.add.circle(0, 0, 24 * scale, fallbackColor));
    if (label) c.add(this.add.text(0, 0, label, { fontFamily: FONT, fontSize: "10px", color: "#000" }).setOrigin(0.5));
    return c as unknown as Phaser.GameObjects.Image;
  }

  private tweet(x: number, y: number, text: string, when: string) {
    const c = this.add.container(x, y).setDepth(300);
    c.add(this.add.rectangle(0, 0, 560, 150, 0xffffff).setStrokeStyle(2, 0xd1d5db));
    if (this.textures.exists("p_reinhardt")) c.add(this.add.image(-240, -40, "p_reinhardt").setScale(0.45));
    else c.add(this.add.circle(-240, -40, 22, 0x111827));
    c.add(this.add.text(-205, -62, "Reinhardt Crobley ✔", { fontFamily: FONT, fontSize: "16px", color: "#111", fontStyle: "bold" }));
    c.add(this.add.text(-205, -42, `@ReinhardtCrobley · ${when}`, { fontFamily: FONT, fontSize: "12px", color: "#6b7280" }));
    c.add(this.add.text(-255, -10, text, { fontFamily: FONT, fontSize: "16px", color: "#111", wordWrap: { width: 510 } }));
    c.add(this.add.text(-255, 52, "💬 41.2K   🔁 88K   ❤ 212K", { fontFamily: FONT, fontSize: "12px", color: "#6b7280" }));
    c.setScale(0.2);
    this.tweens.add({ targets: c, scale: 1, duration: 300, ease: "Back.out" });
    return c;
  }

  /** The studio set: desk, newsreader, Reinhardt. */
  private crobleyStudio() {
    if (!backdrop(this, "tv_newsdesk", { depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x0f1b3d);
    const journo = this.add.sprite(300, 320, "npc_journo", 0).setScale(4.2).setDepth(10);
    const rein = this.art(660, 330, "p_reinhardt", 2, 0x111827, "REINHARDT").setDepth(10).setFlipX(true);
    const bug = this.add.text(940, 20, "KRELTV NEWS · LIVE", { fontFamily: FONT, fontSize: "13px", color: "#fff", backgroundColor: "#dc2626", padding: { x: 6, y: 3 } }).setOrigin(1, 0).setDepth(400);
    void bug;
    const ticker = this.add.text(960, 515, "BREAKING: CROBLEY CORP CONTROVERSY · NEW ADVERT 'DEEPLY OFFENSIVE' SAY EVERYONE WITH EARS · CEO: 'IT CLEARLY SAYS NIBBLE ON A CROBLEY' · FOUNDER'S DEATH 'MURDER-ADJACENT' · ", { fontFamily: FONT, fontSize: "14px", color: "#fff", backgroundColor: "#991b1b", padding: { x: 4, y: 3 } }).setDepth(400);
    this.tweens.add({ targets: ticker, x: -1800, duration: 30000, repeat: -1 });
    // menace: a slow red pulse whenever he's in shot
    const menace = this.add.rectangle(480, 270, 960, 540, 0x7f1d1d, 0).setDepth(350).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.tweens.add({ targets: menace, fillAlpha: 0.35, yoyo: true, repeat: -1, duration: 1800, ease: "Sine.inOut" });
    const glint = this.add.star(rein.x - 18, rein.y - 70, 4, 2, 7, 0xffffff).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: glint, alpha: 1, angle: 90, yoyo: true, repeat: -1, duration: 400, repeatDelay: 3000 });
    return { journo, rein };
  }

  private async crobleyNews() {
    // the channel flips, and flips, and it's always the same thing
    const stat = this.add.rectangle(480, 270, 960, 540, 0x111111).setDepth(500);
    const noise = this.add.graphics().setDepth(501);
    const fuzz = this.time.addEvent({ delay: 50, loop: true, callback: () => {
      noise.clear();
      for (let i = 0; i < 300; i++) noise.fillStyle(Math.random() < 0.5 ? 0xffffff : 0x666666, 0.6).fillRect(Math.random() * 960, Math.random() * 540, 4, 3);
    } });
    const chans = ["CH 1: GB KREWS", "CH 2: KRELSPORTS", "CH 3: KIDS' KREL", "CH 4: THE COOKING CHANNEL", "CH 5: SHOPPING"];
    const lbl = this.add.text(480, 270, "", { fontFamily: "monospace", fontSize: "30px", color: "#22c55e", backgroundColor: "#000000aa", padding: { x: 10, y: 6 } }).setOrigin(0.5).setDepth(502);
    for (const c of chans) {
      lbl.setText(`${c}\n▶ BREAKING NEWS: CROBLEY`);
      synth.play("select");
      await this.wait(550);
    }
    fuzz.remove();
    noise.destroy();
    stat.destroy();
    lbl.destroy();
    const { journo, rein } = this.crobleyStudio();
    const cam = this.cameras.main;
    synth.music("ominous");
    this.caption("BREAKING NEWS", "#ef4444", 40);
    await this.wait(900);
    this.lastCaption?.destroy();
    await this.talk([
      say("JOURNALIST", "Good evening. Tonight: chaos at the Crobley Corporation, makers of Krelworld's best-loved children's sweet, the humble, circular Crobley."),
      say("JOURNALIST", "For forty years, families have hummed along to the famous advert. You know the one. 'Nibble on a Crobley.'"),
      say("JOURNALIST", "But last month, founder Crobson Crobley — beloved, generous, a man who once gave away a free Crobley to every child in Krelford — was found dead in what police describe as 'murder-adjacent' circumstances."),
      say("JOURNALIST", "The official cause: Mr Crobley is said to have 'unalived himself' as a result of a long-standing corn addiction."),
      say("JOURNALIST", "However, suspicion immediately turned to his son, Reinhardt, who inherited the company — after posting this, one day before his father's death."),
    ]);
    const t1 = this.tweet(480, 170, "I have decided to unalive my father ha ha just joking…. Unless ?", "1 day before");
    await this.talk([dir("The tweet sits there on the screen. Nobody in the studio says anything for a while.")]);
    t1.destroy();
    const t2 = this.tweet(480, 170, "my account got hacked by my alter ego … I mean .. some one very close to me … you might even say .. myself…", "1 hour later");
    await this.talk([say("JOURNALIST", "He later explained the post as follows.")]);
    t2.destroy();
    await this.talk([
      say("JOURNALIST", "Now Reinhardt Crobley — known for his controversial views on, well, everything — is under fire again, this time over the company's new advert, and its new characters."),
      say("JOURNALIST", "Critics say the classic jingle now contains deeply offensive language. Viewers have also complained about four new characters, said to be built on crude and offensive stereotypes."),
      say("JOURNALIST", "Mr Crobley joins me now. Reinhardt — good evening."),
    ]);
    cam.zoomTo(1.25, 1200);
    cam.pan(rein.x - 60, rein.y - 40, 1200);
    await this.wait(1300);
    await this.talk([
      say("REINHARDT CROBLEY", "…"),
      say("REINHARDT CROBLEY", "Anyone with two bloody working ears can hear it clearly says 'nibble on a Crobley'!"),
      say("REINHARDT CROBLEY", "These fucking woke-gone-mad type people are off their bloody rocker!"),
    ]);
    cam.zoomTo(1, 700);
    cam.pan(480, 270, 700);
    await this.wait(750);
    await this.talk([say("JOURNALIST", "Well. Let's let the viewers decide. Here is the new Crobley advert, in full.")]);
    synth.stopMusic();
    await this.crobleyAdvert();
    // back to the studio
    await this.talk([
      say("JOURNALIST", "…"),
      say("JOURNALIST", "Come on, Reinhardt. We all heard it. It even says we heard it."),
      say("REINHARDT CROBLEY", "The only thing I can hear is a high-pitched squawking noise coming out of your fucking mouth."),
      say("REINHARDT CROBLEY", "I've had it!"),
    ]);
    // the machine gun
    const gun = this.art(rein.x - 40, rein.y - 10, "p_mgun", 1.6, 0x111827, "GUN").setDepth(15).setFlipX(true);
    gun.setScale(0.1);
    await this.tween({ targets: gun, scale: this.textures.exists("p_mgun") ? 1.6 : 1, duration: 250, ease: "Back.out" });
    synth.play("telegraph");
    await this.wait(400);
    for (let i = 0; i < 16; i++) {
      this.time.delayedCall(i * 70, () => {
        synth.play("shoot");
        cam.shake(60, 0.008);
        const fl = this.add.star(gun.x - 50, gun.y, 5, 6, 16, 0xfde047).setDepth(16);
        this.time.delayedCall(50, () => fl.destroy());
        for (let k = 0; k < 4; k++) {
          const b = this.add.rectangle(journo.x + (Math.random() - 0.5) * 30, journo.y - 20 + (Math.random() - 0.5) * 50, 4, 4, 0xdc2626).setDepth(14);
          this.tween({ targets: b, x: b.x - 60 - Math.random() * 80, y: b.y + 40 + Math.random() * 60, alpha: 0, duration: 600 }).then(() => b.destroy());
        }
      });
    }
    this.tweens.add({ targets: journo, angle: -80, x: journo.x - 60, y: journo.y + 50, delay: 900, duration: 400 });
    await this.wait(1400);
    this.add.ellipse(journo.x - 30, 410, 140, 18, 0x991b1b, 0.85).setDepth(11);
    await this.talk([dir("The newsreader goes down behind the desk. Somewhere, a producer screams. Reinhardt slowly turns. Towards the camera.")]);
    // he turns it on us
    cam.zoomTo(1.6, 600);
    cam.pan(rein.x - 40, rein.y - 30, 600);
    await this.wait(700);
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 70, () => {
        synth.play("shoot");
        cam.flash(40, 255, 240, 160);
      });
    }
    await this.wait(800);
    // the camera hits the floor
    const crack = this.add.graphics().setScrollFactor(0).setDepth(600);
    crack.lineStyle(3, 0xffffff, 0.9);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + Math.random() * 0.3;
      crack.lineBetween(560, 230, 560 + Math.cos(a) * (200 + Math.random() * 300), 230 + Math.sin(a) * (200 + Math.random() * 200));
    }
    synth.play("smash");
    cam.zoomTo(1, 10);
    await this.tween({ targets: cam, rotation: Math.PI / 2, duration: 500, ease: "Bounce.out" });
    await this.talk([
      say("REINHARDT CROBLEY", "(off camera) HEH HEH HEH!"),
      say("REINHARDT CROBLEY", "(off camera) Just like I killed my father!"),
      say("REINHARDT CROBLEY", "(off camera) The police won't suspect a thing! I have bribed them all!!"),
      say("REINHARDT CROBLEY", "(off camera) …Is that light still on? Is that thing still—"),
    ]);
    cam.setRotation(0);
    crack.destroy();
    this.clearStage();
    this.lastCaption = undefined;
    // technical difficulties
    const bars = [0xffffff, 0xfacc15, 0x22d3ee, 0x22c55e, 0xe879f9, 0xef4444, 0x2563eb];
    bars.forEach((c, i) => this.add.rectangle(i * (960 / 7), 0, 960 / 7 + 1, 540, c).setOrigin(0));
    this.add.text(480, 270, "WE ARE EXPERIENCING\nTECHNICAL DIFFICULTIES", { fontFamily: "Impact, sans-serif", fontSize: "44px", color: "#fff", stroke: "#000", strokeThickness: 8, align: "center" }).setOrigin(0.5);
    synth.play("ding");
    await this.wait(1500);
    await this.talk([
      dir("You stare at the test card for a long time."),
      ping("KREBLIS", "Did everyone just see that"),
      ping("KREZMAR", "He shot the cameraman too"),
      ping("KREZMAR", "Nobody ever remembers the cameraman"),
      ping("SCROMBUS", "The jingle though"),
      ping("SCROMBUS", "We all heard it"),
      ping("KREBLIS", "War Room. Now."),
    ]);
  }

  /** The new Crobley advert. 80 seconds. Set to the jingle. */
  private async crobleyAdvert() {
    const layer = this.add.container(0, 0).setDepth(700);
    const timers: Phaser.Time.TimerEvent[] = [];
    let skipped = false;
    const clear = () => layer.removeAll(true);
    const bg = (key: string, tint?: number) => {
      if (this.textures.exists(key)) {
        const src = this.textures.get(key).getSourceImage();
        const img = this.add.image(480, 270, key).setScale(Math.max(960 / src.width, 540 / src.height));
        if (tint) img.setTint(tint);
        layer.add(img);
      } else layer.add(this.add.rectangle(480, 270, 960, 540, tint ?? 0x7dd3fc));
    };
    const name = (t: string, color: string) => {
      const n = this.add.text(480, 80, t, { fontFamily: "Impact, sans-serif", fontSize: "54px", color, stroke: "#fff", strokeThickness: 8 }).setOrigin(0.5).setScale(0.2).setAngle(-6);
      layer.add(n);
      this.tweens.add({ targets: n, scale: 1, duration: 350, ease: "Back.out" });
      this.tweens.add({ targets: n, angle: 6, yoyo: true, repeat: -1, duration: 500 });
    };
    const jingle = (y = 470) => {
      const j = this.add.text(480, y, "♪ Nibble on a Crobley ♪", { fontFamily: "Comic Sans MS, cursive", fontSize: "32px", color: "#db2777", stroke: "#fff", strokeThickness: 6 }).setOrigin(0.5);
      layer.add(j);
      this.tweens.add({ targets: j, scale: 1.08, yoyo: true, repeat: -1, duration: 320 });
    };
    const put = (x: number, y: number, key: string, scale: number, color?: number, label?: string) => {
      const o = this.art(x, y, key, scale, color, label);
      layer.add(o);
      return o;
    };
    const boom = (x: number, y: number) => {
      synth.play("explode");
      if (this.boomAt(x, y, 1.2, layer.depth + 1, layer)) return;
      for (let i = 0; i < 3; i++) {
        const c = this.add.circle(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 40, 14, i % 2 ? 0xfde047 : 0xf97316);
        layer.add(c);
        this.tweens.add({ targets: c, radius: 90, alpha: 0, duration: 500 + i * 100 });
      }
      this.cameras.main.shake(200, 0.012);
    };
    const sausages = (n: number) => {
      clear();
      layer.add(this.add.rectangle(480, 270, 960, 540, 0x1c1917));
      layer.add(this.add.ellipse(480, 470, 600, 60, 0xfde68a, 0.25));
      for (let i = 0; i < n; i++) {
        const x = 480 + (i - (n - 1) / 2) * 220;
        const small = put(x, 420, "p_sausage_s", 1.2, 0xf9a8d4, "sausage");
        const big = put(x, 300, "p_sausage_m", 0.4, 0xb45309, "SAUSAGE").setAlpha(0);
        this.tweens.add({ targets: small, scale: 3, y: 340, duration: 1600, ease: "Quad.in" });
        this.time.delayedCall(1500, () => {
          small.setAlpha(0);
          big.setAlpha(1);
          synth.play("crit");
          this.tweens.add({ targets: big, scale: 4.2, duration: 500, ease: "Back.out" });
          this.tweens.add({ targets: big, angle: 4, yoyo: true, repeat: -1, duration: 180, delay: 500 });
        });
      }
    };
    const admire = (elder: string, tint?: number) => {
      clear();
      bg("cr_park", tint);
      const rays = this.add.star(600, 250, 16, 60, 420, 0xfff7c2, 0.35);
      layer.add(rays);
      this.tweens.add({ targets: rays, angle: 360, duration: 8000 });
      const man = put(600, 300, elder, 4.2, 0x1e3a8a, "DAD");
      const boy = put(380, 380, "p_boy", 3, 0x60a5fa, "boy");
      this.tweens.add({ targets: man, y: 290, yoyo: true, repeat: -1, duration: 900 });
      for (let i = 0; i < 6; i++) this.time.delayedCall(i * 500, () => {
        if (skipped) return;
        const sp = this.add.text(boy.x + 30 + Math.random() * 60, boy.y - 70, "✨", { fontSize: "26px" });
        layer.add(sp);
        this.tweens.add({ targets: sp, y: sp.y - 60, alpha: 0, duration: 900 });
      });
    };
    const kids = () => {
      clear();
      bg("cr_park");
      jingle();
      for (let i = 0; i < 3; i++) {
        const k = put(240 + i * 240, 380, i === 1 ? "p_kidcandy" : `spr_KID${i}`, i === 1 ? 3.2 : 3.2, 0x60a5fa, "kid");
        this.tweens.add({ targets: k, y: 360, yoyo: true, repeat: -1, duration: 300 + i * 40 });
      }
      for (let i = 0; i < 8; i++) {
        const c = put(Math.random() * 960, -40, "p_crobley", 2.2, 0xf9a8d4, "");
        this.tweens.add({ targets: c, y: 600, angle: 360, duration: 3000 + Math.random() * 2000, delay: i * 500, repeat: -1 });
      }
      const logo = this.add.text(480, 150, "CROBLEY®", { fontFamily: "Impact, sans-serif", fontSize: "72px", color: "#f472b6", stroke: "#fff", strokeThickness: 10 }).setOrigin(0.5);
      layer.add(logo);
      this.tweens.add({ targets: logo, scale: 1.1, yoyo: true, repeat: -1, duration: 400 });
    };
    const flirt = () => {
      clear();
      bg("cf_flirt");
      name("FLIRT CROBLEY!", "#ec4899");
      const f = put(-100, 360, "p_flirt", 2.4, 0xf472b6, "FLIRT");
      this.tweens.add({ targets: f, x: 420, duration: 900, ease: "Back.out" });
      const dad = put(760, 340, "p_dad", 3.6, 0x1e3a8a, "dad");
      void dad;
      for (let i = 0; i < 10; i++) this.time.delayedCall(800 + i * 380, () => {
        if (skipped) return;
        const h = this.add.text(f.x + 40, f.y - 40, "❤", { fontSize: "28px", color: "#ec4899" });
        layer.add(h);
        this.tweens.add({ targets: h, x: [760, 900, 480][i % 3], y: [300, 120, 80][i % 3], alpha: 0, duration: 1100 });
      });
      const wink = this.add.text(420, 220, "*wink*", { fontFamily: FONT, fontSize: "26px", color: "#fff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5);
      layer.add(wink);
      this.tweens.add({ targets: wink, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
    };
    const lantern = () => {
      clear();
      bg("cf_chinese");
      name("CHINESE CROBLEY!", "#dc2626");
      const c = put(440, 360, "p_lantern", 2.4, 0xdc2626, "GARY");
      const gong = this.add.circle(680, 330, 60, 0xd97706).setStrokeStyle(6, 0x78350f);
      layer.add(gong);
      for (let i = 0; i < 4; i++) this.time.delayedCall(900 + i * 1800, () => {
        if (skipped) return;
        synth.play("ding");
        this.tweens.add({ targets: gong, scale: 1.15, yoyo: true, duration: 120 });
        for (let k = 0; k < 3; k++) {
          const fw = this.add.circle(200 + Math.random() * 560, 120 + Math.random() * 120, 6, [0xef4444, 0xfacc15, 0x22c55e][k]);
          layer.add(fw);
          this.tweens.add({ targets: fw, radius: 60, alpha: 0, duration: 700 });
        }
      });
      const sigh = this.add.text(c.x, c.y - 120, "(sigh)", { fontFamily: FONT, fontSize: "20px", color: "#fff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setAlpha(0);
      layer.add(sigh);
      this.tweens.add({ targets: sigh, alpha: 1, delay: 4000, duration: 400 });
    };
    const fruity = () => {
      clear();
      bg("cf_men");
      name("FRUITY CROBLEY!", "#c026d3");
      const f = put(200, 360, "p_fruity", 2.4, 0xf0abfc, "FRUITY");
      this.tweens.add({ targets: f, x: 760, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.inOut", onYoyo: () => f.setFlipX(!f.flipX), onRepeat: () => f.setFlipX(!f.flipX) });
      for (let i = 0; i < 24; i++) this.time.delayedCall(i * 160, () => {
        if (skipped) return;
        const g = this.add.star(Math.random() * 960, Math.random() * 400, 4, 3, 8, [0xf0abfc, 0xfde68a, 0x93c5fd][i % 3]);
        layer.add(g);
        this.tweens.add({ targets: g, angle: 180, alpha: 0, duration: 800 });
      });
    };
    const tankIntro = () => {
      clear();
      bg("cf_destruction");
      name("TANK CROBLEY!", "#15803d");
      const t = put(-150, 380, "p_tankc", 2.6, 0x4d7c0f, "TANK");
      this.tweens.add({ targets: t, x: 420, duration: 1600, ease: "Quad.out" });
      for (let i = 0; i < 4; i++) this.time.delayedCall(1800 + i * 1100, () => !skipped && boom(650 + Math.random() * 250, 320 + Math.random() * 80));
      const fr = this.add.text(480, 200, "FREEDOM!", { fontFamily: "Impact, sans-serif", fontSize: "48px", color: "#fff", stroke: "#1d4ed8", strokeThickness: 8 }).setOrigin(0.5).setAlpha(0);
      layer.add(fr);
      this.tweens.add({ targets: fr, alpha: 1, delay: 2400, duration: 300 });
    };
    const massacre = () => {
      clear();
      bg("cr_park");
      jingle();
      const others = [put(520, 380, "p_flirt", 1.8, 0xf472b6, "FLIRT"), put(680, 380, "p_lantern", 1.8, 0xdc2626, "GARY"), put(840, 380, "p_fruity", 1.8, 0xf0abfc, "FRUITY")];
      const t = put(-150, 390, "p_tankc", 2.2, 0x4d7c0f, "TANK");
      this.tweens.add({ targets: t, x: 180, duration: 1000, ease: "Quad.out" });
      others.forEach((o, i) => this.time.delayedCall(1600 + i * 3000, () => {
        if (skipped) return;
        const shell = this.add.circle(t.x + 120, t.y - 40, 8, 0x111827);
        layer.add(shell);
        this.tweens.add({ targets: shell, x: o.x, y: o.y - 20, duration: 300, onComplete: () => {
          shell.destroy();
          boom(o.x, o.y - 20);
          this.tweens.add({ targets: o, x: o.x + 300, y: -200, angle: 1080, duration: 1200, ease: "Quad.out" });
        } });
      }));
    };
    const ending = () => {
      clear();
      layer.add(this.add.rectangle(480, 270, 960, 540, 0x000000));
      const t = this.add.text(480, 270, "YOU HEARD WHAT\nYOU THOUGHT YOU HEARD", { fontFamily: "Impact, sans-serif", fontSize: "56px", color: "#ffffff", align: "center" }).setOrigin(0.5).setAlpha(0);
      layer.add(t);
      this.tweens.add({ targets: t, alpha: 1, duration: 1200 });
    };
    const plan: [number, () => void][] = [
      [0, kids],
      [11, () => sausages(1)],
      [15, flirt],
      [25, () => admire("p_dad")],
      [29, lantern],
      [39, () => sausages(3)],
      [43, fruity],
      [53, () => admire("p_grandad", 0xffcc99)],
      [57, tankIntro],
      [66, massacre],
      [76.5, () => sausages(2)],
      [78.5, ending],
    ];
    synth.music("crobley", true);
    const advert = this.add.text(20, 20, "ADVERTISEMENT", { fontFamily: FONT, fontSize: "12px", color: "#fff", backgroundColor: "#00000088", padding: { x: 4, y: 2 } }).setDepth(800);
    const skipHint = this.add.text(940, 520, "TAB: skip advert", { fontFamily: FONT, fontSize: "11px", color: "#fff", backgroundColor: "#00000066", padding: { x: 4, y: 2 } }).setOrigin(1, 1).setDepth(800);
    await new Promise<void>((resolve) => {
      for (const [t, fn] of plan) timers.push(this.time.delayedCall(t * 1000, () => !skipped && fn()));
      const done = () => {
        if (skipped) return;
        skipped = true;
        timers.forEach((x) => x.remove());
        this.input.keyboard?.off("keydown-TAB", skip);
        resolve();
      };
      const skip = () => done();
      this.input.keyboard?.on("keydown-TAB", skip);
      timers.push(this.time.delayedCall(81500, done));
    });
    synth.stopMusic();
    advert.destroy();
    skipHint.destroy();
    layer.destroy(true);
    synth.music("ominous");
  }

  /** Sergeant Swig, a bag of money, and a press conference that goes the usual way. */
  private async crobleyPresser() {
    if (!backdrop(this, "bg_press", { depth: -10 })) this.add.rectangle(480, 270, 960, 540, 0x1e2a44);
    this.add.text(480, 50, "KRELFORD CONSTABULARY · PRESS CONFERENCE\n'THE SO-CALLED LIVE TELEVISION MURDER'", { fontFamily: FONT, fontSize: "18px", color: "#ffffff", fontStyle: "bold", align: "center", backgroundColor: "#1e3a8acc", padding: { x: 10, y: 4 } }).setOrigin(0.5);
    this.add.rectangle(480, 330, 140, 90, 0x5a3a20).setDepth(20);
    const swig = this.add.sprite(480, 280, "npc_swig", 0).setScale(3).setDepth(15);
    const beer = this.add.text(420, 278, "🍺", { fontSize: "26px" }).setDepth(21);
    const pile = this.art(540, 290, "p_crobley", 1.4, 0xf9a8d4).setDepth(21);
    void pile;
    const bag = this.add.container(640, 320).setDepth(22);
    bag.add(this.add.ellipse(0, 0, 90, 80, 0x8b6b3e).setStrokeStyle(3, 0x3f2d16));
    bag.add(this.add.text(0, -4, "£££\nMONEY FROM\nREINHARDT", { fontFamily: FONT, fontSize: "10px", color: "#fef3c7", align: "center", fontStyle: "bold" }).setOrigin(0.5));
    const press: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < 7; i++) {
      const tex = i === 3 ? "npc_journo" : `spr_FOLK${i % 4}`;
      press.push(this.add.sprite(250 + i * 85, 470 + (i % 2) * 12, tex, 0).setScale(tex === "npc_journo" ? 1.7 : 2.4).setDepth(30 + i));
    }
    const lads = LADS.filter((p) => p !== G.s.player).slice(0, 2);
    [G.s.player, ...lads].forEach((id, i) => this.add.sprite(60 + i * 50, 440 + i * 10, `spr_${id}`, 0).setScale(2.4).setDepth(40));
    synth.music("ominous");
    const munch = () => {
      synth.play("gulp");
      swig.setFrame(3);
      this.time.delayedCall(140, () => swig.setFrame(0));
    };
    await this.talk([
      dir("Sergeant Swig takes the podium. He is holding a can of beer. There are three more cans on the lectern. There is a family-size bag of Crobleys. There is a large sack, next to him, with 'MONEY FROM REINHARDT' written on it in marker pen."),
      say("SERGEANT SWIG", "Right. Questions. Make it quick, I've got a Crobley on the go."),
      say("REPORTER", "Sergeant, millions of people watched Reinhardt Crobley shoot a newsreader on live television—"),
      say("SERGEANT SWIG", "Did they though?"),
    ]);
    munch();
    await this.talk([
      say("SERGEANT SWIG", "You can't believe everything you see these days. Deep fakes. Filters. Woke cameras."),
      say("SERGEANT SWIG", "I've done my own independent research. Hours of it. On my phone. And from what I can see, it seems that everyone here is lying."),
      say("REPORTER", "He confessed. On camera. He said 'just like I killed my father'."),
      say("SERGEANT SWIG", "Out of context."),
    ]);
    munch();
    synth.play("slurp");
    await this.talk([
      say("REPORTER", "Sergeant — what's in the bag?"),
      dir("Everyone looks at the bag. The bag says MONEY FROM REINHARDT."),
      say("SERGEANT SWIG", "What bag."),
      say("REPORTER", "The bag next to you. It says 'money from Reinhardt'."),
      say("SERGEANT SWIG", "That's just a coincidence. You'd have to be so stupid to think anything of that. Honestly. So stupid."),
    ]);
    munch();
    await this.talk([
      dir("A female journalist in the second row stands up. She has a notepad. She has the look of someone who is about to ask a very good question."),
      say("JOURNALIST", "Sergeant Swig, is the Krelford Constabulary being paid by Reinhardt Crobley to ignore a murder—"),
      say("SERGEANT SWIG", "Sorry. I couldn't hear anything. Just a squawking noise."),
      dir("The room erupts. Booing. Shouting. Somebody throws a Crobley."),
      say("SERGEANT SWIG", "Right. I'm fucking fed up!"),
    ]);
    swig.setFrame(3);
    this.caption("BANG BANG BANG", "#ffd23f", 34);
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(i * 150, () => {
        synth.play("shoot");
        this.cameras.main.shake(100, 0.01);
        const target = press[Math.floor(Math.random() * press.length)];
        const fl = this.add.circle(510, 300, 10, 0xffd23f).setDepth(40);
        this.tween({ targets: fl, x: target.x, y: target.y - 20, duration: 120 }).then(() => fl.destroy());
      });
    }
    press.forEach((p, i) => this.time.delayedCall(200 + i * 60, () => void this.tween({ targets: p, x: i % 2 ? p.x + 700 : p.x - 700, duration: 1400 })));
    this.tween({ targets: beer, y: 600, angle: 360, duration: 900 });
    await this.wait(2200);
    this.lastCaption?.destroy();
    synth.stopMusic();
    const [a, b] = lads;
    await this.talk([
      dir("When the smoke clears, the press pool is gone. Swig is eating a Crobley. The bag is still there."),
      say(a, "Well. Looks like the police are going to do fuck all."),
      say(b, "Shocker."),
      say(G.s.player, "We need to take matters into our own hands."),
      say(a, "We need to kill Reinhardt Crobley."),
      say(b, "Bring Crobson Crobley back to life."),
      say(G.s.player, "And return the Crobley Corporation to its rightful owner."),
      say("SERGEANT SWIG", "(mouth full) I didn't hear that. Couldn't hear a thing. Squawking."),
      dir("NEW OBJECTIVE: storm the Crobley Factory. The gate is on the east edge of Krelford."),
    ]);
  }

  /** The whole factory goes up. Then an awkward conversation. */
  private async crobleyBoom() {
    const hasExt = !!backdrop(this, "cr_factory_ext", { depth: -10 });
    let giant: Phaser.GameObjects.Image | null = null;
    const g = this.add.graphics().setDepth(5);
    if (!hasExt) {
      this.sky(0x1e1b4b, 0xdb2777);
      g.fillStyle(0x7c2d12, 1).fillRect(220, 220, 520, 260);
      g.fillStyle(0x9d174d, 1).fillRect(260, 120, 50, 110).fillRect(400, 90, 50, 140).fillRect(640, 130, 50, 100);
      giant = this.art(480, 200, "p_crobley", 4, 0xf9a8d4).setDepth(6);
      this.add.rectangle(480, 500, 960, 80, 0x1f2937).setDepth(4);
    }
    const me = this.add.sprite(300, 480, playerKey(this), 0).setScale(2.6).setDepth(20);
    synth.music("ominous");
    await this.talk([dir("You sprint out of the factory gates. Behind you, a low rumble. Then a higher rumble. Then a rumble that sounds a lot like a child singing 'Nibble on a Crobley', very slowly, underwater.")]);
    await this.tween({ targets: me, x: 900, duration: 900 });
    me.setFlipX(true);
    // it goes, from the inside out
    const cam = this.cameras.main;
    const fire = (x: number, y: number, big: number) => {
      if (this.boomAt(x, y, 0.9 + big * 0.8, 31)) return;
      const core = this.add.circle(x, y, 10, 0xfff7c2, 1).setDepth(31);
      const ring = this.add.circle(x, y, 14, 0xf97316, 0.95).setDepth(30);
      const smoke = this.add.circle(x, y - 10, 18, 0x3f3f46, 0.8).setDepth(29);
      this.tween({ targets: core, radius: 40 * big, alpha: 0, duration: 380 }).then(() => core.destroy());
      this.tween({ targets: ring, radius: 80 * big, alpha: 0, duration: 650 }).then(() => ring.destroy());
      this.tween({ targets: smoke, radius: 70 * big, y: y - 140 * big, alpha: 0, duration: 1800 }).then(() => smoke.destroy());
      for (let k = 0; k < 6; k++) {
        const sp = this.add.rectangle(x, y, 3, 3, 0xfde047).setDepth(32);
        this.tween({ targets: sp, x: x + (Math.random() - 0.5) * 300 * big, y: y + (Math.random() - 0.8) * 260 * big, alpha: 0, duration: 700 + Math.random() * 500 }).then(() => sp.destroy());
      }
    };
    for (let i = 0; i < 28; i++) {
      this.time.delayedCall(i * 120, () => {
        synth.play("explode");
        cam.shake(160, 0.012 + i * 0.0012);
        fire(180 + Math.random() * 600, 120 + Math.random() * 300, 0.8 + i / 28);
      });
    }
    // the mascot gets launched into orbit
    const mascot = giant ?? (this.textures.exists("p_crobley") ? this.add.image(480, 150, "p_crobley").setScale(3).setDepth(33).setAlpha(0) : null);
    this.time.delayedCall(2000, () => mascot && (mascot.setAlpha(1), this.tween({ targets: mascot, y: -300, x: 700, angle: 1440, duration: 2200, ease: "Quad.out" })));
    await this.wait(3500);
    synth.play("boom");
    cam.flash(1200, 255, 255, 255);
    cam.shake(900, 0.04);
    const white = this.add.rectangle(480, 270, 960, 540, 0xffffff, 1).setDepth(100);
    this.caption("KA-BLOOEY", "#fde047", 64);
    // it rains Crobleys and sausages
    for (let i = 0; i < 40; i++) {
      this.time.delayedCall(600 + i * 80, () => {
        const t = this.add.text(Math.random() * 960, -30, Math.random() < 0.5 ? "🌭" : "🍬", { fontSize: "22px" }).setDepth(140);
        this.tween({ targets: t, y: 560, angle: 360, duration: 1400 + Math.random() * 800 }).then(() => t.destroy());
      });
    }
    // the dust settles: what's left is a crater
    g.clear();
    if (!backdrop(this, "cr_crater", { depth: -5 })) this.add.rectangle(480, 270, 960, 540, 0x3f1d1d).setDepth(-5);
    await this.wait(900);
    await this.tween({ targets: white, alpha: 0, duration: 1600 });
    white.destroy();
    for (let i = 0; i < 6; i++) {
      const sm = this.add.circle(200 + i * 110, 330, 30, 0x52525b, 0.5).setDepth(8);
      this.tweens.add({ targets: sm, y: 120, radius: 90, alpha: 0, duration: 4000, repeat: -1, delay: i * 500 });
    }
    await this.wait(1500);
    this.lastCaption?.destroy();
    // the lads, and someone under a blanket
    const lads = LADS.filter((p) => p !== G.s.player).slice(0, 3);
    lads.forEach((id, i) => this.add.sprite(120 + i * 70, 470, `spr_${id}`, 0).setScale(2.6).setDepth(22));
    const crobson = this.add.sprite(340, 472, "spr_FOLK2", 0).setScale(2.6).setDepth(22).setTint(0xc7d2fe);
    this.add.text(340, 410, "CROBSON CROBLEY\n(RECENTLY RESURRECTED)", { fontFamily: FONT, fontSize: "10px", color: "#e0e7ff", backgroundColor: "#000000aa", align: "center", padding: { x: 3, y: 2 } }).setOrigin(0.5).setDepth(23);
    this.tweens.add({ targets: crobson, angle: 3, yoyo: true, repeat: -1, duration: 700 });
    me.setPosition(560, 470);
    const [a, b, c] = lads;
    await this.talk([
      say(a, "LADS! LADS! We did it! Krezwonk's guy came through!"),
      say(b, "Say hello to Crobson Crobley! Back from the dead! Founder! Legend! Rightful owner of the Crobley Corporation!"),
      say("CROBSON CROBLEY", "Hello lads. Thank you. What a strange experience. I'm very much looking forward to getting back to work. To my factory. My life's work."),
      dir("Everyone turns, slowly, to look at the smouldering crater where the factory used to be. A single Crobley rolls out of it, on fire, and stops at Crobson's feet."),
      say(G.s.player, "…Oh. Oh no. I completely forgot you were doing that."),
      say(G.s.player, "I have — very sadly, and very unfortunately — destroyed the entire factory."),
      say("CROBSON CROBLEY", "…"),
      say(c, "…"),
      say(a, "Right."),
      say(b, "So he's got no factory."),
      say(a, "No factory, no company, no Crobleys."),
      say(c, "So what's he going to do? Just… live? With nothing?"),
      dir("A very long pause. Somewhere, a sausage pops in the embers."),
      say(b, "…We're going to have to re-kill him, aren't we."),
      say("CROBSON CROBLEY", "I'm sorry, you're going to WHAT?"),
      say(a, "It's the kind thing to do, Crobson."),
      say(c, "Krezwonk's guy does returns. Probably."),
      say("CROBSON CROBLEY", "I've only been alive for twenty minutes!"),
      dir("You walk away slowly, before anyone can ask you to help. Behind you, a scuffle. Then the sound of a resurrection being politely refunded."),
      ping("DRONGUS", "Did someone blow up the Crobley factory"),
      ping("DRONGUS", "I was going to do an ad with them"),
      ping("DRONGUS", "Nibble on a Crobley ft. Drongus"),
      ping("DRONGUS", "Nobody reacted to that idea either"),
    ]);
    G.s.flags.crobley_factory_destroyed = true;
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

  // ---------------------------------------------------------------- OPERATION PLANE INTO TRAIN
  // The cockpit, the drugs, the juice, the ejector seat, the Kreddle Express, the Krel Tower.

  private async planeEscape() {
    const me = G.s.player;
    G.rt.timerEnd = 0;
    G.emit("timer", null);
    // a lad on the ground to deliver the bad news (never the player)
    const lad = (pref: string[]) => pref.find((p) => p !== me) ?? "KREBLIS";
    // ---- the cockpit
    const sky = this.sky(0x7ec8f0, 0xf3d9b1);
    const dash = this.cockpitFrame();
    const idle = this.time.addEvent({ delay: 16, loop: true, callback: () => dash.update(0, 0, this.time.now) });
    synth.music("boss_krozno", true);
    await this.talk([
      dir("The cockpit of Flight KR-069. Captain Stanley is in no position to object. There are four hundred buttons. One of them is labelled 'DO NOT'."),
      say("MIKEY", "(over the radio) You're in? Legend. Right. Find the train. Fly the plane into the train.", { cond: { notPlayer: "MIKEY" } }),
      say("SCROMBUS", "(over the radio) You're in? Legend. Right. Find the train. Fly the plane into the train.", { cond: { player: "MIKEY" } }),
      say(me, "I don't know how to fly a plane."),
      say("KREZMAR", "(over the radio) Nobody knows how to fly a plane, mate. That's what the drugs are for. Glovebox."),
      dir("You open the glovebox. Inside: a little bag. On the bag, in Captain Stanley's neat handwriting: 'CONFIDENCE (LONG HAUL)'."),
    ]);
    await this.takeDrugs();
    await this.talk([
      dir("Oh. Oh, that's lovely. Your hands are steady. The four hundred buttons make sense now. They're all friends. One of them waves at you."),
      say(me, "…I know how to fly a plane."),
      say("KREZWONK", "(over the radio) He knows how to fly a plane.", { cond: { notPlayer: "KREZWONK" } }),
      say("KREBLIS", "(over the radio) He knows how to fly a plane.", { cond: { player: "KREZWONK" } }),
    ]);
    sky.destroy();
    idle.remove();
    dash.root.destroy();
    // ---- the flight
    await this.juiceFlight();
    // ---- the ejector seat, the bang, and the come-down
    synth.play("boom");
    this.cameras.main.flash(500, 255, 255, 255);
    this.cameras.main.setRotation(0);
    this.clearStage();
    const sky2 = this.sky(0x8fc3ea, 0xf3d9b1);
    const g = this.add.graphics();
    g.fillStyle(0x5a6a80, 1);
    for (let i = 0; i < 20; i++) g.fillRect(i * 50, 330 - ((i * 37) % 90), 44, 300);
    g.fillStyle(0x3d6a2a, 1).fillRect(0, 440, 960, 100);
    const haze = this.add.rectangle(480, 270, 960, 540, 0xff4fd8, 0.28).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
    // the giant pussy juice takes up exactly the space the Krel Tower is about to
    const tower = this.bigTower(640, 440, 9);
    tower.img.setAlpha(0);
    const carton = this.add.image(640, 440, "p_juice").setOrigin(0.5, 1).setDepth(10);
    carton.displayHeight = tower.h * 0.96;
    carton.displayWidth = tower.w * 1.25;
    const label = this.add.text(640, tower.at(0.5), "PUSSY\nJUICE", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#ffffff", align: "center", stroke: "#b0247a", strokeThickness: 6 }).setOrigin(0.5).setDepth(11);
    const plane = this.airliner(150, 215, 220);
    const chute = this.chute(me, 120, 60);
    this.tweens.add({ targets: plane, x: 300, y: tower.at(0.66), duration: 2600, ease: "Sine.inOut" });
    await this.talk([dir("You shoot out of the roof of KR-069 on a rocket-powered seat. A little pink parachute pops open. Below you, the plane carries on, straight and true, towards the giant pussy juice.")]);
    // the drugs wear off
    this.tween({ targets: haze, alpha: 0, duration: 1800 });
    this.tween({ targets: label, alpha: 0, duration: 1400 });
    // the carton narrows into the tower's silhouette as the tower shimmers in
    this.tween({ targets: carton, alpha: 0, displayWidth: tower.w * 0.6, duration: 1800, ease: "Sine.inOut" });
    await this.tween({ targets: tower.img, alpha: 1, duration: 1800, ease: "Sine.inOut" });
    carton.destroy();
    this.add.text(640, 448, "THE KREL TOWER", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", backgroundColor: "#00000099", padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setDepth(12);
    synth.play("gasp");
    this.cameras.main.shake(400, 0.01);
    await this.talk([
      dir("The giant pussy juice wobbles. It shimmers. It is, and possibly always was, the Krel Tower."),
      say(lad(["SCROMBUS", "KREZMAR"]), "(over the radio) Oh no!! You were hallucinating so badly from the drugs that you didn't realise you were heading straight for the Krel Tower! Noooooooooooo!"),
      say(lad(["FLENKY", "CRONGUS"]), "(over the radio) MOLLOR'S ON THE TOP FLOOR!!"),
      say(me, "…Has anyone seen the train though?"),
    ]);
    // ---- meanwhile: the Kreddle Express
    this.clearStage();
    void sky2;
    await this.kreddleExpress();
    // ---- back to the plane: everyone watches
    this.clearStage();
    const skyG = this.sky(0x3b4656, 0x6b7280);
    const g2 = this.add.graphics();
    g2.fillStyle(0x5a6a80, 1);
    for (let i = 0; i < 20; i++) g2.fillRect(i * 50, 300 - ((i * 37) % 90), 44, 300);
    g2.fillStyle(0x3d6a2a, 1).fillRect(0, 430, 960, 110);
    const city = backdrop(this, "bg_city", { depth: -10 });
    if (city) {
      skyG.setVisible(false);
      g2.setVisible(false);
      // a storm has rolled in over Krelford
      city.setTint(0x8a94a6);
      this.add.rectangle(480, 270, 960, 540, 0x0f172a, 0.35).setDepth(-9);
    }
    this.rainOver("storm", 960);
    const tw = this.bigTower(620, 440);
    const hitY = tw.at(0.66);
    const people = this.crowd(470).filter((p) => p.texture.key !== playerKey(this));
    synth.music("airport");
    const chute2 = this.chute(me, 150, -60);
    this.tween({ targets: chute2, y: 300, x: 110, duration: 9000, ease: "Sine.out" });
    await this.talk([dir("Back in Krelford, everyone is outside. Everyone is looking up. You are drifting down over them under a pink parachute, waving."), ...PE_RAIN]);
    const plane2 = this.airliner(1120, hitY - 80, 240, true);
    await this.talk([say(lad(["KREBLIS", "GRONNY"]), "Is that… is that the plane?")]);
    // the approach: bars in, the camera eases in on the tower, everything holds its breath
    const peBars = Juice.letterbox(this, 46, 900, 985);
    this.cameras.main.pan(640, hitY + 40, 2600, "Sine.easeInOut", true);
    this.cameras.main.zoomTo(1.18, 2600, "Sine.easeIn", true);
    this.time.delayedCall(1700, () => Juice.riser(900, 0.35));
    await this.tween({ targets: plane2, x: 620 + plane2.displayWidth * 0.32, y: hitY, angle: -3, duration: 2600, ease: "Sine.in" });
    plane2.destroy();
    synth.play("boom");
    synth.play("explode_2");
    Juice.subDrop(1, 2.2);
    this.cameras.main.flash(500, 255, 240, 200);
    this.cameras.main.shake(1400, 0.03);
    // the punch, then a long pull back out to take it in
    this.cameras.main.setZoom(1.32);
    this.cameras.main.zoomTo(1, 2200, "Cubic.easeOut", true);
    this.cameras.main.pan(480, 270, 2200, "Cubic.easeOut", true);
    Juice.shockRing(this, 620, hitY, { color: 0xffe0a0, to: 520, rings: 3, depth: 17 });
    Juice.debris(this, 620, hitY, 18, { depth: 17, speed: 380, size: 7, floor: 440 });
    this.time.delayedCall(2300, () => peBars(500));
    this.boomAt(620, hitY, 3, 16);
    this.time.delayedCall(220, () => this.boomAt(620 + tw.w * 0.4, hitY + 30, 1.6, 16));
    this.time.delayedCall(380, () => this.boomAt(620 - tw.w * 0.35, hitY - 20, 1.4, 16));
    const fire = this.fireBlob(620, hitY + 6, 95, 15);
    for (let i = 0; i < (hasVfx(this, "vfx_smokecol") ? 0 : 18); i++) {
      const smoke = this.add.circle(620 + (Math.random() - 0.5) * 90, hitY - Math.random() * 40, 16 + Math.random() * 20, 0x333333, 0.7).setDepth(14);
      this.tween({ targets: smoke, y: smoke.y - 170, alpha: 0, scale: 2.5, duration: 3000 + Math.random() * 1500 });
    }
    this.people(people, "NOOOO!");
    synth.play("gasp");
    const noo: [string, string][] = [
      ["SCROMBUS", "Nooooooooo!"],
      ["KREZMAR", "NOOOOOOOO!!!"],
      ["MIKEY", "NOOOOOOOOOOOOOOOOOOO!"],
      ["GRONNY", "Nooo."],
      ["KREBON", "No."],
      ["CRONGUS", "NOOOOOO!! (on his knees)"],
    ];
    await this.talk([...noo.filter(([who]) => who !== me).map(([who, t]) => say(who, t)), ping("DRONGUS", "NOOOOOO not the Krel Tower !!")]);
    synth.play("boom");
    Juice.subDrop(0.9, 3);
    this.cameras.main.shake(2800, 0.035);
    fire.destroy();
    this.collapseFx(tw);
    for (let i = 0; i < (hasVfx(this, "vfx_dust") ? 10 : 34); i++) {
      const dust = this.add.circle(620 + (Math.random() - 0.5) * 220, 430, 20 + Math.random() * 30, 0xb8a888, 0.85).setDepth(40);
      this.tween({ targets: dust, x: dust.x + (Math.random() - 0.5) * 740, y: 400 - Math.random() * 170, scale: 3, alpha: 0, duration: 3500, delay: 400 + Math.random() * 1400 });
    }
    await this.wait(700);
    // Jenko, as it comes down
    this.tweens.add({ targets: people.find((p) => p.texture.key === "spr_FLENKY") ?? [], y: "+=14", duration: 200 });
    await this.talk([say("FLENKY", "Noooo!! Mollor was in there!!!")]);
    this.caption("THE KREL TOWER HAS FALLEN (AGAIN)", "#ff4d4d", 30);
    synth.play("alarm");
    await this.wait(1600);
    await this.talk([
      dir("Silence. Then sirens. Then you land, gently, on top of the Great Tap."),
      say(me, "Did we get the train?"),
      say("KREZWONK", "So the plan worked.", { cond: { notPlayer: "KREZWONK" } }),
      say("KREBLIS", "Breaking news…", { cond: { notPlayer: "KREBLIS" } }),
      say("KREBLIS", "The train has been stopped 👍", { cond: { notPlayer: "KREBLIS" } }),
      say("KREBLIS", "By a burger", { cond: { notPlayer: "KREBLIS" } }),
      say("KREBON", "We could have turned the power off.", { cond: { notPlayer: "KREBON" } }),
      say("KREZMAR", "Krebon. Not today.", { cond: { notPlayer: "KREZMAR" } }),
      dir("THE KREL TOWER: DESTROYED (AGAIN). The Kreddle Express is parked outside Krelburger with its engine running. President Klerble has ordered a twelfth burger."),
    ]);
    synth.stopMusic();
    Object.assign(G.s.flags, { kreltower_resolved: true, kreltower_fell: true, arcstep_arc_klerble_hijack: true });
  }

  /**
   * First-person flight-sim cockpit: window pillars, glareshield, a live attitude display,
   * a nav screen tracking the Kreddle Express, engine dials and a yoke. Call update() each frame.
   */
  private cockpitFrame() {
    const root = this.add.container(0, 0).setDepth(20);
    const g = this.add.graphics();
    root.add(g);
    // window pillars + overhead panel
    g.fillStyle(0x1a1d23, 1).fillRect(0, 0, 960, 30);
    g.fillTriangle(0, 30, 150, 30, 0, 330).fillTriangle(960, 30, 810, 30, 960, 330);
    g.fillRect(0, 0, 36, 540).fillRect(924, 0, 36, 540);
    g.fillStyle(0x2a2e36, 1).fillRect(470, 30, 20, 300);
    g.lineStyle(2, 0x3a404b, 1).lineBetween(150, 30, 0, 330).lineBetween(810, 30, 960, 330).lineBetween(470, 30, 470, 330).lineBetween(490, 30, 490, 330).lineBetween(0, 30, 960, 30);
    for (let i = 0; i < 26; i++) {
      g.fillStyle([0x10b981, 0xf59e0b, 0x334155, 0xef4444][(i * 7) % 4], 1).fillRect(120 + i * 28, 10, 10, 8);
    }
    // glareshield
    g.fillStyle(0x15171c, 1).fillRoundedRect(20, 312, 920, 50, 18);
    g.fillStyle(0x0d0f13, 1).fillRect(20, 345, 920, 10);
    // main instrument panel
    g.fillStyle(0x2b3039, 1).fillRect(0, 352, 960, 188);
    g.lineStyle(1, 0x3d4450, 1);
    for (const x of [56, 312, 648, 904]) g.lineBetween(x, 352, x, 540);
    for (let i = 0; i < 18; i++) g.fillStyle(0x4b5563, 1).fillCircle(46 + i * 51, 532, 2);
    // screen bezels
    const bezel = (x: number, y: number, w: number, h: number) => {
      g.fillStyle(0x0b0d10, 1).fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 6);
      g.fillStyle(0x000000, 1).fillRect(x, y, w, h);
      for (let i = 0; i < 5; i++) g.fillStyle(0x3a404b, 1).fillRect(x + 8 + i * ((w - 16) / 4) - 5, y + h + 8, 10, 5);
    };
    bezel(70, 368, 228, 146);
    bezel(332, 368, 296, 146);
    bezel(662, 368, 228, 146);
    const txt = (x: number, y: number, t: string, c = "#22ff88", size = 11) => {
      const o = this.add.text(x, y, t, { fontFamily: "monospace", fontSize: `${size}px`, color: c, fontStyle: "bold" });
      root.add(o);
      return o;
    };
    // glareshield annunciators
    const caution = txt(70, 318, " MASTER CAUTION ", "#ffffff", 10).setBackgroundColor("#b91c1c");
    const ap = txt(780, 318, " A/P: DRUGS ", "#0b0f19", 10).setBackgroundColor("#22c55e");
    txt(372, 320, "FLT KR-069   SQUAWK 7500", "#f59e0b", 11);
    // the attitude display (masked)
    const pfd = this.add.graphics();
    const maskShape = this.make.graphics({}, false).fillRect(70, 368, 228, 146);
    pfd.setMask(maskShape.createGeometryMask());
    root.add(pfd);
    const fixed = this.add.graphics();
    root.add(fixed);
    fixed.lineStyle(4, 0xfacc15, 1).lineBetween(140, 441, 170, 441).lineBetween(170, 441, 176, 449).lineBetween(198, 441, 228, 441).lineBetween(198, 441, 192, 449);
    fixed.fillStyle(0xfacc15, 1).fillRect(181, 438, 6, 6);
    fixed.fillStyle(0x000000, 0.55).fillRect(70, 368, 36, 146).fillRect(262, 368, 36, 146);
    const spd = txt(72, 434, "287", "#ffffff", 12);
    const alt = txt(264, 434, "3500", "#ffffff", 11);
    txt(74, 372, "SPD", "#22d3ee", 9);
    txt(266, 372, "ALT", "#22d3ee", 9);
    // nav display
    const nd = this.add.graphics();
    root.add(nd);
    txt(340, 372, "HDG 069   GS 312", "#ffffff", 10);
    txt(560, 372, "TCAS TA", "#f59e0b", 10);
    const tgt = txt(480, 392, "◆ KREDDLE EXP", "#ff4fd8", 10).setOrigin(0.5, 0);
    // engines / systems
    const eng = this.add.graphics();
    root.add(eng);
    txt(686, 448, "  N1    CONF", "#cbd5e1", 10);
    const conf = txt(672, 466, "CONFIDENCE 900%", "#ff4fd8", 12);
    txt(672, 484, "FUEL: PUSSY JUICE", "#22ff88", 10);
    txt(672, 498, "CABIN: SCREAMING", "#f59e0b", 10);
    // the yoke
    const yoke = this.add.container(480, 596);
    const yg = this.add.graphics();
    yg.fillStyle(0x111318, 1).fillRect(-14, -40, 28, 60);
    yg.fillStyle(0x1f232b, 1).fillRoundedRect(-120, -64, 240, 26, 10);
    yg.fillRoundedRect(-128, -92, 34, 64, 10).fillRoundedRect(94, -92, 34, 64, 10);
    yg.fillStyle(0xef4444, 1).fillRect(-122, -86, 8, 6);
    yg.fillStyle(0x9ca3af, 1).fillCircle(0, -51, 9);
    yoke.add(yg);
    root.add(yoke);
    let sweep = 0;
    const update = (ax: number, ay: number, t: number) => {
      // attitude: roll with the steering, pitch with up/down
      const r = -ax * 0.5 + Math.sin(t / 700) * 0.06;
      const cx = 184;
      const cy = 441;
      const dx = Math.cos(r);
      const dy = Math.sin(r);
      const nx = -dy;
      const ny = dx;
      const off = ay * 45;
      const hx = cx + nx * off;
      const hy = cy + ny * off;
      const quad = (o1: number, o2: number, c: number) => {
        pfd.fillStyle(c, 1).fillPoints(
          [
            { x: hx - dx * 400 + nx * o1, y: hy - dy * 400 + ny * o1 },
            { x: hx + dx * 400 + nx * o1, y: hy + dy * 400 + ny * o1 },
            { x: hx + dx * 400 + nx * o2, y: hy + dy * 400 + ny * o2 },
            { x: hx - dx * 400 + nx * o2, y: hy - dy * 400 + ny * o2 },
          ],
          true,
        );
      };
      pfd.clear();
      quad(-400, 0, 0x1e6fd9);
      quad(0, 400, 0x8a5a2b);
      pfd.lineStyle(2, 0xffffff, 1).lineBetween(hx - dx * 300, hy - dy * 300, hx + dx * 300, hy + dy * 300);
      for (const p of [-30, -15, 15, 30]) {
        const w = Math.abs(p) === 30 ? 26 : 16;
        const px = hx + nx * p;
        const py = hy + ny * p;
        pfd.lineStyle(1, 0xffffff, 0.9).lineBetween(px - dx * w, py - dy * w, px + dx * w, py + dy * w);
      }
      spd.setText(String(287 + Math.round(Math.sin(t / 900) * 6 - ay * 20)));
      alt.setText(String(3500 - Math.round(ay * 900 + Math.sin(t / 1300) * 40)));
      // nav display: compass arc, radar sweep, the train
      sweep = (sweep + 0.04) % (Math.PI * 2);
      nd.clear();
      nd.lineStyle(2, 0xffffff, 0.9).beginPath().arc(480, 514, 120, Math.PI * 1.15, Math.PI * 1.85).strokePath();
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * 1.15 + (i / 12) * Math.PI * 0.7;
        nd.lineBetween(480 + Math.cos(a) * 120, 514 + Math.sin(a) * 120, 480 + Math.cos(a) * (i % 3 ? 114 : 108), 514 + Math.sin(a) * (i % 3 ? 114 : 108));
      }
      nd.lineStyle(1, 0x22ff88, 0.35).beginPath().arc(480, 514, 70, Math.PI * 1.15, Math.PI * 1.85).strokePath();
      const sa = Math.PI * 1.15 + ((Math.sin(sweep) + 1) / 2) * Math.PI * 0.7;
      nd.lineStyle(2, 0x22ff88, 0.5).lineBetween(480, 514, 480 + Math.cos(sa) * 120, 514 + Math.sin(sa) * 120);
      const tx = 480 - ax * 60;
      nd.lineStyle(2, 0xff4fd8, 1).lineBetween(480, 506, tx, 412);
      nd.fillStyle(0xff4fd8, 1).fillTriangle(tx, 404, tx - 6, 414, tx + 6, 414);
      nd.fillStyle(0xffffff, 1).fillTriangle(480, 498, 472, 512, 488, 512);
      tgt.setX(tx);
      // engines
      eng.clear();
      for (const [x, v] of [[712, 0.78 + Math.sin(t / 200) * 0.02], [822, 0.97 + Math.sin(t / 90) * 0.03]] as [number, number][]) {
        eng.lineStyle(3, 0x475569, 1).beginPath().arc(x, 424, 26, Math.PI * 0.75, Math.PI * 2.25).strokePath();
        eng.lineStyle(3, v > 0.95 ? 0xef4444 : 0x22ff88, 1).beginPath().arc(x, 424, 26, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * Math.min(1, v))).strokePath();
        const a = Math.PI * (0.75 + 1.5 * Math.min(1, v));
        eng.lineStyle(2, 0xffffff, 1).lineBetween(x, 424, x + Math.cos(a) * 22, 424 + Math.sin(a) * 22);
      }
      caution.setAlpha(Math.floor(t / 400) % 2 ? 1 : 0.35);
      conf.setAlpha(0.65 + 0.35 * Math.sin(t / 150));
      ap.setAlpha(1);
      yoke.setRotation(ax * 0.35);
      yoke.setY(596 + ay * 8);
    };
    update(0, 0, 0);
    return { root, update };
  }

  private chute(me: string, x: number, y: number) {
    const c = this.add.container(x, y).setDepth(70);
    const canopy = this.add.graphics();
    canopy.fillStyle(0xff4fa3, 1).slice(0, 0, 46, Math.PI, 0, false).fillPath();
    canopy.lineStyle(2, 0xffffff, 1).lineBetween(-44, 0, 0, 56).lineBetween(44, 0, 0, 56).lineBetween(0, -40, 0, 56);
    c.add([canopy, this.add.sprite(0, 70, me === G.s.player ? playerKey(this) : `spr_${me}`, 0).setScale(2)]);
    this.tweens.add({ targets: c, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 900 });
    return c;
  }

  /** Not optional. Press D. */
  private takeDrugs() {
    return new Promise<void>((resolve) => {
      const t = title(this, 480, 150, "TAKE DRUGS FOR CONFIDENCE", 34, "#ff4fd8").setDepth(300);
      const btn = this.add.text(480, 230, "💊  PRESS  D", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#ffffff", backgroundColor: "#7e1d6b", padding: { x: 18, y: 10 } }).setOrigin(0.5).setDepth(300).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: [t, btn], scale: { from: 1, to: 1.08 }, yoyo: true, repeat: -1, duration: 420 });
      let done = false;
      const take = () => {
        if (done) return;
        done = true;
        this.input.keyboard?.off("keydown-D", take);
        synth.play("gulp");
        this.tweens.killTweensOf([t, btn]);
        t.destroy();
        btn.destroy();
        const c = this.caption("CONFIDENCE +900%", "#ff4fd8", 40);
        this.cameras.main.flash(400, 255, 80, 220);
        this.time.delayedCall(1300, () => {
          c.destroy();
          resolve();
        });
      };
      this.input.keyboard?.on("keydown-D", take);
      btn.on("pointerdown", take);
    });
  }

  /**
   * First person: steer KR-069 through eight floating pussy juice cartons, then line up the
   * giant one. Right before you hit it, the ejector seat. Resolves with the giant's final scale.
   */
  private juiceFlight() {
    return new Promise<{ sx: number; sy: number }>((resolve) => {
      const NEED = 8;
      // trippy sky: two hue-cycling layers
      // the world rolls with the plane; the cockpit doesn't
      const world = this.add.container(480, 250).setDepth(1);
      const sky = this.add.graphics();
      const ground = this.add.graphics();
      const objs = this.add.container(0, 0);
      world.add([sky, ground, objs]);
      const haze = this.add.rectangle(480, 270, 960, 540, 0xff4fd8, 0.18).setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
      const cockpit = this.cockpitFrame();
      const hud = this.add.text(480, 52, "", { fontFamily: "Impact, sans-serif", fontSize: "24px", color: "#ffffff", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(40);
      const help = this.add.text(480, 86, "COLLECT THE PUSSY JUICE CONTAINERS TO REACH THE TRAIN", { fontFamily: FONT, fontSize: "15px", color: "#ffd23f", fontStyle: "bold", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(40);
      this.add.text(480, 302, "WASD / ARROWS (or drag) to steer", { fontFamily: FONT, fontSize: "11px", color: "#86efac" }).setOrigin(0.5).setDepth(41);
      const cross = this.add.graphics().setDepth(30);
      cross.lineStyle(3, 0x86efac, 0.9).strokeCircle(0, 0, 22).lineBetween(-34, 0, -12, 0).lineBetween(12, 0, 34, 0).lineBetween(0, -34, 0, -12).lineBetween(0, 12, 0, 34);
      const keys = this.input.keyboard?.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E") as Record<string, Phaser.Input.Keyboard.Key>;
      let ax = 0;
      let ay = 0;
      let drag: { x: number; y: number } | null = null;
      const onDown = (p: Phaser.Input.Pointer) => (drag = { x: p.x, y: p.y });
      const onMove = (p: Phaser.Input.Pointer) => {
        if (!drag || !p.isDown) return;
        ax = Phaser.Math.Clamp(ax + (p.x - drag.x) / 260, -1, 1);
        ay = Phaser.Math.Clamp(ay + (p.y - drag.y) / 200, -1, 1);
        drag = { x: p.x, y: p.y };
      };
      const onUp = () => (drag = null);
      this.input.on("pointerdown", onDown);
      this.input.on("pointermove", onMove);
      this.input.on("pointerup", onUp);
      type Obj = { c: Phaser.GameObjects.Container; ox: number; oy: number; z: number; giant: boolean };
      const live: Obj[] = [];
      let got = 0;
      let phase: "collect" | "giant" | "eject" | "done" = "collect";
      let nextSpawn = 600;
      let t = 0;
      const spawn = (giant: boolean) => {
        const img = this.add.image(0, 0, "p_juice");
        const lbl = this.add.text(0, 6, "PUSSY\nJUICE", { fontFamily: "Impact, sans-serif", fontSize: "9px", color: "#ffffff", align: "center", stroke: "#b0247a", strokeThickness: 2 }).setOrigin(0.5);
        const c = this.add.container(0, 0, [img, lbl]);
        objs.addAt(c, 0);
        live.push({ c, ox: giant ? 0 : Phaser.Math.FloatBetween(-0.85, 0.85), oy: giant ? 0.1 : Phaser.Math.FloatBetween(-0.6, 0.6), z: 1, giant });
      };
      const ejectPrompt = () => {
        phase = "eject";
        synth.play("alarm");
        help.setText("");
        const p = title(this, 480, 230, "⚠ HIT THE EJECTOR SEAT ⚠", 36, "#ff4d4d").setDepth(60);
        const b = this.add.text(480, 300, "PARACHUTE TO FREEDOM  [ E / SPACE / TAP ]", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ffffff", backgroundColor: "#b91c1c", padding: { x: 14, y: 8 } }).setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: [p, b], scale: { from: 1, to: 1.08 }, yoyo: true, repeat: -1, duration: 300 });
        const go = () => {
          if (phase !== "eject") return;
          phase = "done";
          loop.remove();
          this.input.off("pointerdown", onDown);
          this.input.off("pointermove", onMove);
          this.input.off("pointerup", onUp);
          this.input.keyboard?.off("keydown-E", go);
          this.input.keyboard?.off("keydown-SPACE", go);
          const g = live.find((o) => o.giant);
          resolve({ sx: g ? g.c.scaleX * 0.25 : 3, sy: g ? g.c.scaleY * 0.25 : 9 });
        };
        b.on("pointerdown", go);
        this.input.keyboard?.once("keydown-E", go);
        this.input.keyboard?.once("keydown-SPACE", go);
      };
      const loop = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          if (phase === "done") return;
          t += 16;
          // steering
          const sp = 0.028;
          if (keys) {
            if (keys.A.isDown || keys.LEFT.isDown) ax -= sp;
            if (keys.D.isDown || keys.RIGHT.isDown) ax += sp;
            if (keys.W.isDown || keys.UP.isDown) ay -= sp;
            if (keys.S.isDown || keys.DOWN.isDown) ay += sp;
          }
          // test hook: steer at the nearest carton
          if ((window as unknown as { __krelAutoFly?: boolean }).__krelAutoFly && live.length) {
            const o = live.reduce((a, b) => (b.z < a.z ? b : a));
            ax += Phaser.Math.Clamp(o.ox - ax, -sp, sp);
            ay += Phaser.Math.Clamp(o.oy - ay, -sp, sp);
          }
          ax = Phaser.Math.Clamp(ax, -1, 1);
          ay = Phaser.Math.Clamp(ay, -1, 1);
          // the world tilts with you; the drugs make it wobble
          world.setRotation(-ax * 0.14 + Math.sin(t / 700) * 0.035);
          const hy = 10 - ay * 120;
          const hue = (t / 40) % 360;
          const c1 = Phaser.Display.Color.HSVToRGB(hue / 360, 0.45, 1) as Phaser.Types.Display.ColorObject;
          const c2 = Phaser.Display.Color.HSVToRGB(((hue + 60) % 360) / 360, 0.35, 1) as Phaser.Types.Display.ColorObject;
          const col = (o: Phaser.Types.Display.ColorObject) => (o.r << 16) | (o.g << 8) | o.b;
          sky.clear().fillGradientStyle(col(c1), col(c1), col(c2), col(c2), 1).fillRect(-900, -900, 1800, hy + 900);
          ground.clear().fillStyle(0x3d8a3a, 1).fillRect(-900, hy, 1800, 900);
          for (let i = 0; i < 9; i++) {
            const k = ((i + (t / 300) % 1) / 9) ** 2;
            ground.fillStyle(i % 2 ? 0x4fa04a : 0x357a32, 1).fillRect(-900, hy + k * 400, 1800, 8 + k * 30);
          }
          cross.setPosition(480, 250);
          cockpit.update(ax, ay, t);
          haze.setFillStyle(col(c2), 0.16 + 0.06 * Math.sin(t / 300));
          // spawning
          if (phase === "collect" && t > nextSpawn && live.filter((o) => !o.giant).length < 3) {
            spawn(false);
            nextSpawn = t + 1100;
          }
          // move everything towards you
          for (const o of [...live]) {
            o.z -= o.giant ? (o.z < 0.14 ? 0 : 0.0032) : 0.0075;
            const zz = o.z * 3 + 0.25;
            const sx = ((o.ox - ax) * 420) / zz;
            const sy = ((o.oy - ay) * 300) / zz;
            const s = (o.giant ? 2.6 : 1.7) / zz;
            o.c.setPosition(sx, sy).setScale(s, o.giant ? s * 2.6 : s);
            if (o.giant) {
              // the giant one holds still while you line it up, then the ejector seat
              if (phase === "giant" && o.z < 0.14) ejectPrompt();
              continue;
            }
            if (o.z <= 0.06) {
              if (Math.abs(o.ox - ax) < 0.22 && Math.abs(o.oy - ay) < 0.24) {
                got++;
                synth.play("slurp");
                this.cameras.main.flash(150, 255, 120, 220);
                const pop = this.add.text(480, 330, ["SLURP!", "JUICY!", "LOVELY!", "MMMM!", "GET IN!"][got % 5], { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#ff9ad5", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(50);
                this.tweens.add({ targets: pop, y: 290, alpha: 0, duration: 700, onComplete: () => pop.destroy() });
              } else synth.play("pfft");
              o.c.destroy();
              live.splice(live.indexOf(o), 1);
            }
          }
          hud.setText(phase === "collect" ? `PUSSY JUICE ${got}/${NEED}` : "");
          if (phase === "collect" && got >= NEED) {
            phase = "giant";
            for (const o of live) o.c.destroy();
            live.length = 0;
            synth.play("perfect");
            help.setText("COLLECT THE GIANT PUSSY JUICE TO GET THE TRAIN!").setFontSize(20).setColor("#ff4fd8");
            spawn(true);
          }
        },
      });
    });
  }

  /** Meanwhile: the Kreddle Express arrives in Krelworld, and finds something it likes more than the Krel Tower. */
  private async kreddleExpress() {
    const skyG = this.sky(0x8fc3ea, 0xf3d9b1);
    const g = this.add.graphics();
    g.fillStyle(0x6b7b90, 1);
    for (let i = 0; i < 20; i++) g.fillRect(i * 50, 260 - ((i * 37) % 70), 44, 300);
    g.fillStyle(0x3d6a2a, 1).fillRect(0, 380, 960, 160);
    g.fillStyle(0x6b5b4b, 1).fillRect(0, 404, 960, 14);
    for (let i = 0; i < 40; i++) g.fillStyle(0x4a3a2a, 1).fillRect(i * 26, 400, 10, 22);
    g.fillStyle(0x9ca3af, 1).fillRect(0, 402, 960, 3).fillRect(0, 415, 960, 3);
    void skyG;
    const sign = this.add.text(160, 300, "WELCOME TO\nKRELWORLD", { fontFamily: FONT, fontSize: "13px", color: "#ffffff", backgroundColor: "#1d4ed8", padding: { x: 6, y: 4 }, align: "center" }).setOrigin(0.5, 1).setDepth(5);
    this.add.rectangle(160, 340, 6, 40, 0x555555).setDepth(4);
    void sign;
    const shop = this.add.image(720, 400, "p_krelburger").setOrigin(0.5, 1).setScale(1.5).setDepth(5);
    this.add.text(shop.x, shop.y - shop.displayHeight - 6, "KRELBURGER", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ffd23f", stroke: "#b91c1c", strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(6);
    this.caption("MEANWHILE…", "#ffffff", 30);
    await this.wait(900);
    this.lastCaption?.destroy();
    const train = this.add.image(-700, 392, "p_train").setOrigin(0, 1).setScale(2.4).setDepth(10);
    const k = this.add.sprite(0, 0, "spr_TV_PRESIDENT_KLERBLE", 4).setScale(1.5).setDepth(11);
    const follow = () => k.setPosition(train.x + train.displayWidth - 70, train.y - train.displayHeight + 40);
    follow();
    synth.play("jet");
    this.cameras.main.shake(2000, 0.006);
    await this.tween({ targets: train, x: -260, duration: 1300, ease: "Linear", onUpdate: follow });
    await this.talk([
      dir("The Kreddle Express thunders over the border at three hundred miles an hour. In the cab, President Klerble has still not blinked."),
      say("PRESIDENT KLERBLE", "YES! YES! YESSS!!"),
    ]);
    // he sees it
    this.tween({ targets: train, x: -10, duration: 1400, ease: "Sine.out", onUpdate: follow });
    await this.wait(700);
    synth.play("trombone");
    const eyes = this.add.text(k.x, k.y - 50, "!!!", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#ff4d4d", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: eyes, scale: { from: 0.4, to: 1.3 }, yoyo: true, repeat: 2, duration: 160 });
    await this.wait(600);
    eyes.destroy();
    this.cameras.main.shake(300, 0.01);
    await this.talk([say("PRESIDENT KLERBLE", "Mmmm!! Want Krelburger!!")]);
    // out he gets, in he goes
    const walker = this.add.sprite(k.x, 380, "spr_TV_PRESIDENT_KLERBLE", 4).setScale(1.8).setDepth(12);
    k.setVisible(false);
    await this.tween({ targets: walker, x: shop.x, duration: 1100, ease: "Linear" });
    synth.play("door");
    walker.destroy();
    await this.talk([
      dir("He goes in. He does not come out. The Kreddle Express sits outside Krelburger with its engine running, three hundred metres short of nothing in particular."),
      dir("Somewhere in the sky above Krelford, a plane is still on its way to the Krel Tower."),
    ]);
  }

  /** Stuff Polson's face. Food slides down the table: shove it in as it reaches his mouth. Skip the salad. */
  private bulkPolson(pol: Phaser.GameObjects.Sprite, add = false) {
    return new Promise<void>((resolve) => {
      const MOUTH_X = pol.x + 30;
      // the belly does the growing: the fat sheet has twelve sizes of Polson
      const fat = this.textures.exists("spr_POLSON_FAT");
      if (fat) pol.setTexture("spr_POLSON_FAT", 0);
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
      const lines = ["Great bulking food!!", "Mmm. Gains.", "Protein!!", "Bulking season 😅", "Get it in!!", "Delectable!!", "More fudge!!", "Clean bulk. Basically."];
      type Food = { t: Phaser.GameObjects.Text; good: boolean; done: boolean };
      const foods: Food[] = [];
      let eaten = 0;
      let wasted = 0;
      let spawned = 0;
      const TOTAL = 12;
      const say1 = (txt: string, col = "#ffffff") => {
        const b = this.add.text(pol.x, pol.y - pol.displayHeight / 2 - 24, txt, { fontFamily: FONT, fontSize: "13px", color: "#111", backgroundColor: "#ffffffee", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(60);
        b.setColor(col === "#ffffff" ? "#111" : col);
        this.tween({ targets: b, y: b.y - 18, alpha: 0, delay: 700, duration: 400 });
      };
      const addFood = () => {
        if (spawned >= TOTAL) return;
        spawned++;
        const m = Math.random() < 0.18 ? menu[5] : menu[Math.floor(Math.random() * 5)];
        const t = this.add.text(1000, 300, m.e, { fontSize: "40px" }).setOrigin(0.5).setDepth(40);
        foods.push({ t, good: m.good, done: false });
      };
      // the first one is already on its way in
      addFood();
      const spawn = this.time.addEvent({ delay: 650, loop: true, callback: addFood });
      const shove = () => {
        if (this.box.active) return;
        const f = foods.find((x) => !x.done && Math.abs(x.t.x - MOUTH_X) < 46);
        // chomp: a quick squash, never a different (smaller) pose
        this.tweens.add({ targets: pol, scaleY: pol.scaleY * 0.94, duration: 70, yoyo: true });
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
        // the belly grows, every single bite
        if (fat) {
          pol.setFrame(Math.min(11, eaten));
          this.tweens.add({ targets: pol, scaleX: sx0 * 1.08, duration: 90, yoyo: true, onComplete: () => pol.setScale(sx0, sy0) });
        } else this.tweens.add({ targets: pol, scaleX: sx0 * (1 + eaten * 0.13), scaleY: sy0 * (1 + eaten * 0.03), duration: 200, ease: "Back.out" });
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
            f.t.x -= 5.4;
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
          if (spawned >= TOTAL && foods.every((f) => f.done || f.t.x < MOUTH_X - 20)) {
            tick.remove();
            spawn.remove();
            this.input.keyboard?.off("keydown-SPACE", shove);
            this.input.off("pointerdown", shove);
            hud.destroy();
            help.destroy();
            zone.destroy();
            G.s.flags.polson_fat = add ? ((G.s.flags.polson_fat as number) ?? 0) + eaten : Math.max((G.s.flags.polson_fat as number) ?? 0, eaten);
            this.caption(eaten >= 9 ? "MAXIMUM BULK" : eaten >= 5 ? "BULKED" : "LIGHT BULK", "#ffd23f", 30);
            this.time.delayedCall(500, () => {
              this.lastCaption?.destroy();
              this.lastCaption = undefined;
              resolve();
            });
          }
        },
      });
    });
  }

  // ================================================================ CHAPTER 6: THE KREDDLE EXPRESS

  private dropCaption() {
    this.lastCaption?.destroy();
    this.lastCaption = undefined;
  }

  /** The speaker of each line hops (EVERYONE / ALL …: the whole cast). */
  private hopSpeaker(s: string) {
    const all = s === "EVERYONE" || s.startsWith("ALL ");
    const who = all ? [...this.cast.values()] : [this.cast.get(s)].filter((x): x is Phaser.GameObjects.Sprite => !!x);
    for (const sp of who) {
      if (!sp.active || sp.getData("walking") || sp.getData("hop") || sp.getData("busy")) continue;
      const y = sp.y;
      sp.setData("hop", true);
      this.tweens.add({ targets: sp, y: y - 12, yoyo: true, duration: 110, repeat: all ? 1 : 0, onComplete: () => {
        sp.y = y;
        sp.setData("hop", false);
      } });
    }
  }

  /** A lad (or anyone with a character sheet) on stage, registered in the cast. */
  private actor(id: string, x: number, y: number, scale = 2.6, castAs = id) {
    const key = id === G.s.player ? playerKey(this) : this.textures.exists(`spr_${id}`) ? `spr_${id}` : "spr_FOLK0";
    const sp = this.add.sprite(x, y, key, 0).setScale(scale).setDepth(100 + y);
    this.cast.set(castAs, sp);
    return sp;
  }

  private face(sp: Phaser.GameObjects.Sprite, f: "south" | "east" | "north" | "west") {
    const m = charMeta(this, sp.texture.key);
    sp.setData("facing", f);
    if (!m) return void sp.setFlipX(f === "west");
    sp.setFlipX(false);
    sp.setFrame(m.idle[f] ?? 0);
  }

  private faceTo(sp: Phaser.GameObjects.Sprite, x: number) {
    this.face(sp, Math.abs(x - sp.x) < 20 ? "south" : x > sp.x ? "east" : "west");
  }

  /** Loop a performance (dance / sing / victory) on some sprites; a bounce when the art has none. Returns a stop function. */
  private perform(sps: Phaser.GameObjects.Sprite[], kind: "dance" | "sing" | "victory", fps = 9) {
    const fakes: Phaser.Tweens.Tween[] = [];
    const real = sps.filter((sp, i) => {
      if (perfCycle(sp, kind)) return true;
      fakes.push(this.tweens.add({ targets: sp, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 180 + (i % 3) * 30 }));
      return false;
    });
    const ev = this.time.addEvent({ delay: 50, loop: true, callback: () => real.forEach((sp, i) => sp.active && playPerf(sp, kind, this.time.now, fps, i * 2)) });
    return () => {
      ev.remove();
      fakes.forEach((t) => t.remove());
      sps.forEach((sp) => {
        if (!sp.active) return;
        sp.setAngle(0);
        this.face(sp, "south");
      });
    };
  }

  /** A speech bubble over someone's head. */
  private bubble(sp: Phaser.GameObjects.Sprite, text: string, bg = "#ffffff", fg = "#111111", size = 14) {
    const t = this.add.text(sp.x, sp.y - sp.displayHeight * 0.55 - 12, text, { fontFamily: FONT, fontSize: `${size}px`, color: fg, backgroundColor: bg, padding: { x: 5, y: 2 }, fontStyle: "bold" }).setOrigin(0.5, 1).setDepth(900);
    this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, delay: 800, duration: 500, onComplete: () => t.destroy() });
    return t;
  }

  /** A wobbling yellow stream from (sx, sy) to (tx, ty) with splashes. Returns a stop function. */
  private peeStream(sx: number, sy: number, tx: number, ty: number, depth: number) {
    const arcG = this.add.graphics().setDepth(depth);
    const ev = this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        const w = Math.sin(this.time.now / 70) * 3;
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(sx, sy), new Phaser.Math.Vector2((sx + tx) / 2, Math.min(sy, ty) - 26 + w), new Phaser.Math.Vector2(tx + w * 0.6, ty));
        arcG.clear();
        arcG.lineStyle(5, 0xc9a800, 0.9);
        curve.draw(arcG, 24);
        arcG.lineStyle(3, 0xffe14a, 1);
        curve.draw(arcG, 24);
        if (Math.random() < 0.6) {
          const d = this.add.circle(tx + (Math.random() - 0.5) * 12, ty, 2.5, 0xffe14a, 1).setDepth(depth + 1);
          this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 30, y: ty - 8 - Math.random() * 12, alpha: 0, duration: 380, onComplete: () => d.destroy() });
        }
      },
    });
    return () => {
      ev.remove();
      arcG.destroy();
    };
  }

  /** Rain (and a storm's lightning) over the stage, under the dialogue box. Stopped by clearStage / the end of the vignette. */
  private rainOver(kind: "rain" | "storm", depth = 960) {
    synth.weatherSound(kind);
    this.add.rectangle(480, 270, 960, 540, 0x1e293b, kind === "storm" ? 0.32 : 0.2).setDepth(depth - 1);
    if (hasVfx(this, "vfx_rain")) {
      for (let l = 0; l < (kind === "storm" ? 2 : 1); l++)
        for (let gx = 0; gx < 3; gx++)
          for (let gy = 0; gy < 3; gy++) {
            const sp = vfx(this, "vfx_rain", 160 + gx * 320 + l * 90, 100 + gy * 200 + l * 60, { scale: 2 + l * 0.4, depth, alpha: 0.75, speed: kind === "storm" ? 1.5 : 1, angle: kind === "storm" ? 12 : 0 });
            sp?.anims.setProgress(Math.random());
          }
    } else {
      const g = this.add.graphics().setDepth(depth);
      this.time.addEvent({ delay: 50, loop: true, callback: () => {
        g.clear();
        g.lineStyle(1, 0xbfdbfe, 0.6);
        for (let i = 0; i < 90; i++) {
          const x = Math.random() * 1000;
          const y = Math.random() * 540;
          g.lineBetween(x, y, x - 6, y + 18);
        }
      } });
    }
    if (kind !== "storm") return;
    const flash = this.add.rectangle(480, 270, 960, 540, 0xeef2ff).setAlpha(0).setDepth(depth + 1).setBlendMode(Phaser.BlendModes.ADD);
    const strike = () => {
      if (!flash.active) return;
      this.tweens.chain({ targets: flash, tweens: [{ alpha: 0.6, duration: 40 }, { alpha: 0.05, duration: 90 }, { alpha: 0.45, duration: 40 }, { alpha: 0, duration: 450 }] });
      this.time.delayedCall(250 + Math.random() * 500, () => flash.active && synth.play("thunder"));
      this.time.delayedCall(3500 + Math.random() * 4500, strike);
    };
    this.time.delayedCall(1500, strike);
  }

  /** Fall over (the sheet's death frames, or a topple). */
  private keel(sp: Phaser.GameObjects.Sprite, delay = 0) {
    const m = charMeta(this, sp.texture.key);
    const cyc = m?.death?.south ?? m?.death?.east;
    sp.setData("busy", true);
    this.time.delayedCall(delay, () => {
      if (!sp.active) return;
      if (cyc?.length) cyc.forEach((f, i) => this.time.delayedCall(i * 110, () => sp.active && sp.setFrame(f)));
      else this.tweens.add({ targets: sp, angle: 90, y: sp.y + 20, duration: 400, ease: "Bounce.out" });
    });
  }

  /** A prop image (origin at its feet), or a plain block of colour when the art isn't there. */
  private prop(key: string, x: number, y: number, scale: number, depth: number, fb = 0x888888, fw = 40, fh = 40) {
    if (this.textures.exists(key)) return this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(depth);
    const fk = `c6fb_${fw}x${fh}_${fb}`;
    if (!this.textures.exists(fk)) {
      const g = this.make.graphics({}, false);
      g.fillStyle(fb, 1).fillRect(0, 0, fw, fh).lineStyle(2, 0x000000, 1).strokeRect(1, 1, fw - 2, fh - 2);
      g.generateTexture(fk, fw, fh);
      g.destroy();
    }
    return this.add.image(x, y, fk).setOrigin(0.5, 1).setDepth(depth);
  }

  // ---------------------------------------------------------------- klerble_train: meanwhile, in Kreddle

  private async klerbleTrain() {
    await ensureCh6Art(this);
    synth.music("klerble");
    this.add.rectangle(480, 270, 960, 540, 0x150a28).setDepth(-20);
    const bg = backdrop(this, "bg_kd_station", { depth: -10 });
    if (bg) bg.setY(180);
    else {
      this.sky(0x1a0b3a, 0x5b1d73);
      this.add.rectangle(480, 300, 960, 80, 0x2b1645).setDepth(-9);
    }
    // the platform the crowd stands on (the painted one sits a bit low for the camera)
    const plat = this.add.graphics().setDepth(-5);
    plat.fillStyle(0x2a1640, 0.75).fillRect(0, 280, 960, 82);
    plat.lineStyle(3, 0xffd23f, 0.9).lineBetween(0, 280, 960, 280);
    for (let x = 0; x < 960; x += 40) plat.fillStyle(0xffd23f, 0.35).fillRect(x, 282, 20, 4);
    const sign = this.add.text(480, 26, "★ KREDDLE CENTRAL ★", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#ff4fd8", stroke: "#12001f", strokeThickness: 6 }).setOrigin(0.5).setDepth(5);
    sign.setShadow(0, 0, "#ff4fd8", 16, true, true);
    this.time.addEvent({ delay: 1700, loop: true, callback: () => {
      sign.setAlpha(0.3);
      this.time.delayedCall(80, () => sign.setAlpha(1));
    } });
    const board = this.add.text(820, 70, "PLATFORM 6\n6:66 KREDDLE EXPRESS\n→ KRELWORLD\nSTATUS: PRESIDENTIAL", { fontFamily: "Courier New, monospace", fontSize: "12px", color: "#facc15", backgroundColor: "#000000dd", padding: { x: 6, y: 4 }, align: "center" }).setOrigin(0.5, 0).setDepth(5);
    void board;
    for (let i = 0; i < 4; i++) {
      const beam = this.add.triangle(120 + i * 240, 300, 0, 0, -40, -420, 40, -420, [0xff4fd8, 0x22d3ee, 0xfacc15, 0xa855f7][i], 0.1).setOrigin(0, 0).setDepth(-4).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: beam, angle: { from: -25, to: 25 }, yoyo: true, repeat: -1, duration: 2400 + i * 600, ease: "Sine.inOut" });
    }
    // the adoring public
    const crowd: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < 11; i++) {
      const key = ["spr_KD_MAN", "spr_KD_WOMAN"][i % 2];
      const x = 70 + i * 52 + (i % 3) * 6;
      const y = 290 + (i % 3) * 9;
      const sp = this.add.sprite(x, y, this.textures.exists(key) ? key : "spr_FOLK1", 0).setScale(2.3).setDepth(100 + y);
      if (!this.textures.exists(key)) sp.setTint(0xff9de6);
      crowd.push(sp);
    }
    this.cast.set("KREDDLER", crowd[3]);
    const cheer = (t: string[], n = 6) => {
      synth.play("cheer");
      for (let i = 0; i < n; i++) {
        const p = crowd[Math.floor(Math.random() * crowd.length)];
        this.bubble(p, t[i % t.length], ["#ff4fd8", "#22d3ee", "#facc15"][i % 3], "#12001f", 13);
        this.tweens.add({ targets: p, y: p.y - 12, yoyo: true, repeat: 2, duration: 120, delay: i * 60 });
      }
    };
    await this.talk(KT_OPEN);
    // the Kreddle Express pulls in on the far line
    const train = this.add.image(-560, 276, "p_train").setOrigin(0, 1).setScale(2.4).setDepth(20).setTint(0xffc4f0);
    const livery = this.add.text(0, 0, "THE KREDDLE EXPRESS", { fontFamily: "Impact, sans-serif", fontSize: "16px", color: "#ff4fd8", stroke: "#12001f", strokeThickness: 4 }).setOrigin(0.5).setDepth(21);
    const follow = () => livery.setPosition(train.x + train.displayWidth * 0.42, train.y - train.displayHeight * 0.45);
    follow();
    synth.play("jet");
    this.cameras.main.shake(1600, 0.004);
    const sparks = this.time.addEvent({ delay: 140, loop: true, callback: () => vfx(this, "vfx_sparks", train.x + train.displayWidth - 40 - Math.random() * 300, 274, { scale: 0.8, depth: 22 }) });
    await this.tween({ targets: train, x: 120, duration: 2600, ease: "Cubic.out", onUpdate: follow });
    sparks.remove();
    // the President, in a shower of confetti
    const k = this.actor("TV_PRESIDENT_KLERBLE", -60, 322, 3, "PRESIDENT KLERBLE").setDepth(560);
    for (let i = 0; i < 6; i++) vfx(this, "vfx_confetti", 100 + i * 150, 120, { scale: 2, depth: 600, delay: i * 200 });
    cheer(["KLERBLE!!", "YES! YES!", "I LOVE YOU!!", "MARRY ME!", "KLERBLE!!!", "THE PRESIDENT!!"], 8);
    crowd.forEach((p) => this.tweens.add({ targets: p, y: p.y - 6, yoyo: true, repeat: 5, duration: 160, delay: Math.random() * 200 }));
    await this.tween({ targets: k, x: 330, duration: 2400 });
    this.face(k, "south");
    await this.talk(KT_ARRIVE.slice(0, 3));
    cheer(["BRAVEST MAN ALIVE", "YESSS!", "KLERBLE!!", "DRIVE IT!!"], 6);
    await this.talk(KT_ARRIVE.slice(3));
    // the driver gets posted into a slot machine
    const driver = this.actor("KD_PITBOSS", 680, 318, 2.6, "TRAIN DRIVER");
    const slot = this.prop("kd_m_slots", 900, 335, 1.1, 340, 0xa855f7, 50, 80);
    await this.tween({ targets: k, x: 600, duration: 900 });
    this.faceTo(k, driver.x);
    this.faceTo(driver, k.x);
    await this.talk(KT_DRIVER.slice(0, 2));
    synth.play("punch_big");
    this.cameras.main.shake(200, 0.01);
    await this.tween({ targets: driver, x: 890, y: 250, angle: 540, duration: 650, ease: "Sine.out" });
    await this.tween({ targets: driver, y: 300, scale: 0.4, alpha: 0, duration: 220, ease: "Quad.in" });
    synth.play("slot_spin");
    this.tweens.add({ targets: slot, angle: { from: -6, to: 6 }, yoyo: true, repeat: 4, duration: 70 });
    this.time.delayedCall(700, () => {
      synth.play("jackpot");
      vfx(this, "vfx_coins", 900, 280, { scale: 1.6, depth: 620 });
      const c = this.add.text(900, 220, "🍒🍒🍒", { fontSize: "22px" }).setOrigin(0.5).setDepth(620);
      this.tweens.add({ targets: c, y: 190, alpha: 0, delay: 900, duration: 600, onComplete: () => c.destroy() });
    });
    cheer(["HAHAHA", "JACKPOT!", "YES!!"], 4);
    await this.talk(KT_DRIVER.slice(2));
    // into the cab
    await this.tween({ targets: k, x: train.x + train.displayWidth - 80, y: 296, duration: 700 });
    synth.play("door");
    k.setVisible(false);
    const cab = this.add.sprite(0, 0, k.texture.key, 4).setScale(1.5).setDepth(22);
    const followCab = () => {
      follow();
      cab.setPosition(train.x + train.displayWidth - 72, train.y - train.displayHeight + 36);
    };
    followCab();
    this.cast.set("PRESIDENT KLERBLE", cab);
    // the Krunchers turn up
    const ks: Phaser.GameObjects.Sprite[] = [];
    KR.KRUNCHERS.forEach((kr, i) => {
      if (!this.textures.exists(`spr_${kr.of}`)) return;
      const sp = this.add.sprite(1000 + i * 40, 0, `spr_${kr.of}`, 0).setScale(2.4).setTint(i % 2 ? 0xff9de6 : 0x9be7ff);
      sp.setData("home", { x: 420 + (i % 5) * 92 + (i > 4 ? 46 : 0), y: i > 4 ? 330 : 306 });
      sp.setY((sp.getData("home") as { y: number }).y).setDepth(100 + sp.y);
      this.cast.set(kr.name, sp);
      ks.push(sp);
    });
    crowd.slice(6).forEach((p, i) => this.tweens.add({ targets: p, x: 40 + i * 30, duration: 900 }));
    await Promise.all(ks.map((sp, i) => this.tween({ targets: sp, x: (sp.getData("home") as { x: number }).x, duration: 1500 + i * 90 })));
    ks.forEach((sp) => this.face(sp, "south"));
    // their banner: the Krel Tower on fire, and it's quite good
    const banner = this.add.container(560, 200).setDepth(250);
    banner.add(this.add.rectangle(0, 0, 260, 66, 0x12001f, 0.92).setStrokeStyle(3, 0xff4fd8));
    if (this.textures.exists("p_kreltower")) banner.add(this.add.image(-96, 26, "p_kreltower").setOrigin(0.5, 1).setScale(0.24));
    banner.add(this.add.text(-96, -6, "🔥", { fontSize: "18px" }).setOrigin(0.5));
    banner.add(this.add.text(26, 0, "BURN KRELWORLD\nBURN!!", { fontFamily: "Impact, sans-serif", fontSize: "18px", color: "#ff4fd8", align: "center" }).setOrigin(0.5));
    banner.setScale(0.2);
    this.tween({ targets: banner, scale: 1, duration: 400, ease: "Back.out" });
    // their lines; Kredbon has a little demonstration
    const bon = this.cast.get("KREDBON");
    const krung = this.cast.get("LIL' KRUNGUS");
    let flag: Phaser.GameObjects.Container | undefined;
    for (const line of KT_KRUNCHERS) {
      if (line.dir && line.t.includes("pisses") && bon && krung) {
        this.face(krung, "east");
        flag = this.add.container(krung.x + 40, krung.y + 4).setDepth(krung.depth + 1);
        flag.add(this.add.rectangle(0, 0, 3, 40, 0x6b4f2a).setOrigin(0.5, 1));
        flag.add(this.add.rectangle(13, -32, 26, 16, 0xff4fd8).setStrokeStyle(1, 0x000000));
        flag.add(this.add.text(13, -32, "K", { fontFamily: FONT, fontSize: "10px", color: "#fff" }).setOrigin(0.5));
        await this.tween({ targets: bon, x: krung.x + 110, y: krung.y, duration: 600 });
        this.face(bon, "west");
        const bar = this.add.rectangle(bon.x - 8, bon.y + 8, 18, 7, 0x000000).setDepth(bon.depth + 2);
        const stop = this.peeStream(bon.x - 10, bon.y + 8, flag.x + 13, flag.y - 28, bon.depth + 3);
        this.time.delayedCall(1400, () => (flag?.list[1] as Phaser.GameObjects.Rectangle | undefined)?.setFillStyle(0xd9c43a));
        synth.play("slurp");
        cheer(["LEGEND!!", "HAHAHA", "FILM IT!", "DICK JUICE!!"], 5);
        await this.talk([line]);
        stop();
        bar.destroy();
        continue;
      }
      await this.talk([line]);
    }
    for (let i = 0; i < 3; i++) {
      ks.forEach((sp, j) => this.time.delayedCall(j * 40, () => this.bubble(sp, ["KRELWORLD DIES!", "DIE!!", "KRUNCH!"][(i + j) % 3], "#ff4fd8", "#12001f", 12)));
      this.cameras.main.shake(150, 0.004);
      await this.wait(500);
    }
    // away it goes
    await this.talk(KT_DEPART.slice(0, 2));
    this.cast.delete("PRESIDENT KLERBLE");
    synth.play("jet");
    this.cameras.main.shake(2500, 0.008);
    const sp2 = this.time.addEvent({ delay: 90, loop: true, callback: () => vfx(this, "vfx_sparks", train.x + 40 + Math.random() * train.displayWidth, 274, { scale: 0.9, depth: 22 }) });
    vfx(this, "vfx_dust", train.x + 40, 270, { scale: 2.4, depth: 23 });
    for (let i = 0; i < 8; i++) vfx(this, "vfx_confetti", 80 + i * 120, 140, { scale: 2, depth: 600, delay: i * 120 });
    cheer(["GO ON!!", "YES! YES!", "KILL 'EM ALL!", "KLERBLE!!!", "BYE TAP-LICKERS!"], 8);
    ks.forEach((sp, i) => this.tweens.add({ targets: sp, y: sp.y - 10, yoyo: true, repeat: 6, duration: 140, delay: i * 30 }));
    await this.tween({ targets: train, x: 1300, duration: 2600, ease: "Cubic.in", onUpdate: followCab });
    sp2.remove();
    await this.talk(KT_DEPART.slice(2));
    // remember their faces
    ks.forEach((sp, i) => {
      this.face(sp, "south");
      sp.setTint(i % 2 ? 0xff7ad0 : 0x7fd6ff);
    });
    const red = this.add.rectangle(480, 270, 960, 540, 0x7f1d1d).setAlpha(0).setDepth(700);
    this.tween({ targets: red, alpha: 0.35, duration: 1200 });
    synth.play("crowd_boo");
    ks.forEach((sp, i) => this.time.delayedCall(i * 140, () => this.bubble(sp, ["👎", "🖕", "🖕🖕"][i % 3], "#ffffff", "#111", 14)));
    // a slow, ugly push in on the lot of them
    const ktBars = Juice.letterbox(this, 46, 800, 985);
    const kcx = ks.length ? ks.reduce((a, sp) => a + sp.x, 0) / ks.length : 600;
    this.cameras.main.pan(kcx, 300, 2600, "Sine.easeInOut", true);
    this.cameras.main.zoomTo(1.3, 2600, "Sine.easeInOut", true);
    Juice.heartbeat(0.7);
    this.time.delayedCall(1100, () => Juice.heartbeat(0.7));
    this.caption("REMEMBER THEIR FACES.", "#ff4d4d", 30).setScrollFactor(0);
    await this.talk(KT_AFTER);
    this.dropCaption();
    ktBars(400);
    this.cameras.main.zoomTo(1, 500, "Sine.easeInOut", true);
    this.cameras.main.pan(480, 270, 500, "Sine.easeInOut", true);
    synth.stopMusic();
  }

  // ---------------------------------------------------------------- revenge_meeting: the emergency meeting

  /** The lads in the Town Hall: you front and centre, everyone else in two rows. */
  private meetingCast() {
    const me = G.s.player;
    const order = ["FLENKY", "KREZMAR", "CRONGUS", "SCROMBUS", "MIKEY", "GRONNY", "KREZWONK", "KREBLIS", "KREBON"].filter((id) => id !== me);
    const slots: [number, number][] = [[200, 298], [330, 304], [630, 304], [760, 298], [110, 236], [245, 228], [380, 222], [580, 222], [715, 228], [850, 236]];
    const lads: Record<string, Phaser.GameObjects.Sprite> = {};
    order.forEach((id, i) => {
      const [x, y] = slots[i];
      lads[id] = this.actor(id, x, y, 3.4);
      lads[id].setData("home", { x, y });
    });
    lads[me] = this.actor(me, 480, 310, 3.6);
    lads[me].setData("home", { x: 480, y: 310 });
    return lads;
  }

  private goHome(sps: Phaser.GameObjects.Sprite[], ms = 900) {
    return Promise.all(sps.map((sp) => {
      const h = sp.getData("home") as { x: number; y: number };
      return this.tween({ targets: sp, x: h.x, y: h.y, angle: 0, duration: ms }).then(() => {
        sp.setDepth(100 + sp.y);
        this.face(sp, "south");
      });
    }));
  }

  private async revengeMeeting() {
    await ensureCh6Art(this);
    const me = G.s.player;
    if (!backdrop(this, "bg_townhall", { dim: 0.35, depth: -10 })) this.sky(0x2a2238, 0x4a3a2a);
    synth.weatherSound("rain");
    // it's raining outside: the hall's windows flicker with lightning now and then
    const win = this.add.rectangle(480, 270, 960, 540, 0xdbeafe).setAlpha(0).setDepth(-8).setBlendMode(Phaser.BlendModes.ADD);
    this.time.addEvent({ delay: 6000, loop: true, callback: () => {
      this.tweens.chain({ targets: win, tweens: [{ alpha: 0.35, duration: 50 }, { alpha: 0, duration: 400 }] });
      this.time.delayedCall(400, () => synth.play("thunder"));
    } });
    synth.music("ominous");
    const L = this.meetingCast();
    const all = Object.values(L);
    const S = (id: string) => L[id] ?? L[me];
    this.caption("EMERGENCY MEETING", "#ff4d4d", 34);
    await this.wait(1100);
    this.dropCaption();
    await this.talk(RM_OPEN);

    // ---- Jenko
    const jen = S("FLENKY");
    await this.tween({ targets: jen, x: 480, y: 240, duration: 800 });
    jen.setDepth(400);
    this.face(jen, "south");
    const photo = this.add.container(jen.x + 34, jen.y - 10).setDepth(401);
    photo.add(this.add.rectangle(0, 0, 34, 42, 0xffffff).setStrokeStyle(2, 0x111111));
    photo.add(this.add.rectangle(0, -4, 28, 28, 0xf9a8d4));
    photo.add(this.add.text(0, -4, "♥", { fontFamily: FONT, fontSize: "18px", color: "#be185d" }).setOrigin(0.5));
    photo.add(this.add.text(0, 15, "MOLLOR", { fontFamily: FONT, fontSize: "7px", color: "#111" }).setOrigin(0.5));
    const rage = this.time.addEvent({ delay: 120, loop: true, callback: () => {
      jen.setTint(Math.random() < 0.5 ? 0xff8888 : 0xffffff);
      if (Math.random() < 0.3) {
        const tear = this.add.circle(jen.x + (Math.random() < 0.5 ? -8 : 8), jen.y - 20, 3, 0x60a5fa).setDepth(402);
        this.tweens.add({ targets: tear, y: tear.y + 40, alpha: 0, duration: 600, onComplete: () => tear.destroy() });
      }
    } });
    this.cameras.main.shake(300, 0.006);
    await this.talk(RM_JENKO);
    rage.remove();
    jen.clearTint();
    photo.destroy();
    await this.goHome([jen], 700);

    // ---- revenge!
    const scr = S("SCROMBUS");
    synth.play("smash");
    this.cameras.main.shake(250, 0.012);
    this.caption("REVENGE!!!", "#ff4d4d", 44);
    await this.talk(RM_REVENGE.slice(0, 1));
    all.forEach((sp, i) => this.time.delayedCall(i * 60, () => this.bubble(sp, ["REVENGE!", "YES!!", "KREDDLE!!", "YEAH!!"][i % 4], "#fecaca", "#7f1d1d", 13)));
    await this.talk(RM_REVENGE.slice(1));
    this.dropCaption();
    // ---- Kreblis has been saying this since the first meeting
    const kreb = S("KREBLIS");
    await this.talk(RM_KREBLIS.slice(0, 2));
    kreb.setDepth(450);
    const joy = this.perform([kreb], "victory", 12);
    const jump = this.tweens.add({ targets: kreb, y: kreb.y - 26, yoyo: true, repeat: -1, duration: 220, ease: "Quad.out" });
    const thumbs = this.time.addEvent({ delay: 180, loop: true, callback: () => {
      const t = this.add.text(kreb.x + (Math.random() - 0.5) * 80, kreb.y - 40, Math.random() < 0.7 ? "👍" : "😭", { fontSize: "20px" }).setOrigin(0.5).setDepth(460);
      this.tweens.add({ targets: t, y: t.y - 60, x: t.x + (Math.random() - 0.5) * 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
      const tear = this.add.circle(kreb.x + (Math.random() < 0.5 ? -9 : 9), kreb.y - 22, 3, 0x60a5fa).setDepth(461);
      this.tweens.add({ targets: tear, x: tear.x + (tear.x < kreb.x ? -30 : 30), y: tear.y + 30, alpha: 0, duration: 500, onComplete: () => tear.destroy() });
    } });
    synth.play("cheer");
    vfx(this, "vfx_confetti", kreb.x, kreb.y - 60, { scale: 1.6, depth: 470 });
    await this.talk(RM_KREBLIS.slice(2, 6));
    jump.remove();
    thumbs.remove();
    joy();
    await this.goHome([kreb], 300);
    await this.talk(RM_KREBLIS.slice(6));

    // ---- "it was you"
    synth.stopMusic();
    const bon = me === "KREBON" ? S("PROCTUS") : S("KREBON");
    await this.talk(RM_ACTUALLY.slice(0, 4));
    for (const sp of all) if (sp !== L[me]) this.faceTo(sp, L[me].x);
    this.face(L[me], "south");
    const sweat = this.time.addEvent({ delay: 200, loop: true, callback: () => {
      const d = this.add.text(L[me].x + (Math.random() - 0.5) * 50, L[me].y - 50, "💦", { fontSize: "14px" }).setOrigin(0.5).setDepth(600);
      this.tweens.add({ targets: d, y: d.y + 30, alpha: 0, duration: 600, onComplete: () => d.destroy() });
    } });
    this.caption("…", "#ffffff", 40);
    await this.wait(900);
    this.dropCaption();
    await this.talk(RM_ACTUALLY.slice(4, 7));
    sweat.remove();
    synth.music("ominous");
    // everyone nods: a fine point, well made
    all.forEach((sp, i) => this.tweens.add({ targets: sp, y: sp.y + 5, yoyo: true, repeat: 2, duration: 160, delay: i * 50 }));
    await this.talk(RM_ACTUALLY.slice(7, 9));
    for (const sp of all) if (sp !== bon) this.faceTo(sp, bon.x);
    // he cowers
    this.tweens.add({ targets: bon, angle: { from: -6, to: 6 }, yoyo: true, repeat: 5, duration: 60, onComplete: () => bon.setAngle(0) });
    bon.setTint(0xbfdbfe);
    this.time.delayedCall(1600, () => bon.clearTint());
    await this.talk(RM_ACTUALLY.slice(9));
    all.forEach((sp) => this.face(sp, "south"));

    // ---- chemical weapons
    const mik = S("MIKEY");
    await this.tween({ targets: mik, x: 480, y: 240, duration: 700 });
    mik.setDepth(400);
    this.face(mik, "south");
    await this.talk(RM_CHEM.slice(0, 2));
    synth.play("cheer");
    this.caption("CHEMICAL WEAPONS!!", "#7cff3a", 40);
    const gas = this.time.addEvent({ delay: 90, repeat: 30, callback: () => {
      const g = this.add.circle(Math.random() * 960, 340, 18 + Math.random() * 20, 0x84cc16, 0.3).setDepth(300);
      this.tweens.add({ targets: g, y: g.y - 160 - Math.random() * 80, scale: 2.2, alpha: 0, duration: 1600, onComplete: () => g.destroy() });
    } });
    all.forEach((sp, i) => this.time.delayedCall(i * 70, () => this.bubble(sp, ["YESSSSSS!", "YESSSS!", "HA HA YES !! DIEEE!", "DIEEE!!"][i % 4], "#d9f99d", "#14532d", 13)));
    await this.talk(RM_CHEM.slice(2));
    gas.remove();
    this.dropCaption();
    await this.goHome([mik], 600);

    // ---- Luke and the Krelneva Convention
    const luke = S("CRONGUS");
    const kz = S("KREZMAR");
    luke.setData("busy", true);
    await this.tween({ targets: luke, x: 370, y: 270, duration: 600 });
    luke.setDepth(400);
    luke.setData("busy", false);
    this.face(luke, "east");
    await this.talk(RM_LUKE.slice(0, 3));
    await this.tween({ targets: kz, x: 540, y: 270, duration: 900 });
    kz.setDepth(401);
    this.face(kz, "west");
    await this.talk(RM_LUKE.slice(3, 4));
    const doc = this.prop("c6_krelneva", kz.x - 26, kz.y - 2, 0.8, 410, 0xf4ecd8, 30, 36);
    doc.setScale(0.1);
    synth.play("pickup");
    await this.tween({ targets: doc, scale: this.textures.exists("c6_krelneva") ? 0.9 : 1, duration: 400, ease: "Back.out" });
    await this.talk(RM_LUKE.slice(4));
    this.caption("THE KRELNEVA CONVENTION", "#fde68a", 26);
    // it goes on the floor; Krezmar does what Krezmar does
    await this.tween({ targets: doc, x: 455, y: 318, angle: -8, duration: 400, ease: "Quad.in" });
    synth.play("splat");
    this.dropCaption();
    const bar = this.add.rectangle(kz.x - 12, kz.y + 14, 24, 9, 0x000000).setDepth(420);
    const stop = this.peeStream(kz.x - 16, kz.y + 14, 455, 302, 421);
    if (doc instanceof Phaser.GameObjects.Image) {
      let k = 0;
      this.time.addEvent({ delay: 150, repeat: 20, callback: () => {
        k++;
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(0xe8c830), 20, k);
        if (doc.active) doc.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      } });
    }
    const puddle = this.add.ellipse(455, 320, 10, 5, 0xf7e04a, 0.6).setDepth(405);
    this.tweens.add({ targets: puddle, displayWidth: 120, displayHeight: 18, duration: 5000 });
    synth.play("slurp");
    all.forEach((sp, i) => {
      if (sp === kz || sp === luke) return;
      this.time.delayedCall(400 + i * 120, () => this.bubble(sp, ["HAHAHA", "LEGEND", "ON THE DOVE!!", "😂", "YES BRINKLEY"][i % 5], "#fef08a", "#713f12", 12));
    });
    await this.talk(RM_PISS);
    stop();
    bar.destroy();
    // ...and in Luke's face
    this.face(kz, "west");
    await this.tween({ targets: doc, x: kz.x - 20, y: kz.y - 10, angle: 0, duration: 250 });
    synth.play("lob");
    await this.tween({ targets: doc, x: luke.x + 6, y: luke.y - 22, angle: -720, duration: 420, ease: "Quad.in" });
    synth.play("splat");
    vfx(this, "vfx_hit", luke.x, luke.y - 20, { scale: 1.6, depth: 430 });
    for (let i = 0; i < 10; i++) {
      const d = this.add.circle(luke.x, luke.y - 20, 3, 0xffe14a).setDepth(431);
      this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 90, y: d.y + (Math.random() - 0.2) * 70, alpha: 0, duration: 500, onComplete: () => d.destroy() });
    }
    const hurt = charMeta(this, luke.texture.key)?.hurt?.south;
    if (hurt) hurt.forEach((f, i) => this.time.delayedCall(i * 90, () => luke.setFrame(f)));
    this.tweens.add({ targets: luke, x: luke.x - 30, duration: 200 });
    this.cameras.main.shake(200, 0.008);
    this.caption("SPLAT", "#fde047", 40);
    await this.talk(RM_THROW);
    this.tween({ targets: doc, y: 340, angle: 30, duration: 400, ease: "Bounce.out" });
    this.dropCaption();

    // ---- YEAH LUKE: shoving pandemonium
    synth.music("boss", true);
    this.caption("YEAH LUKE!", "#ff4d4d", 38);
    let mob = true;
    const others = all.filter((sp) => sp !== luke);
    const shoveOnce = () => {
      if (!mob) return;
      const a = others[Math.floor(Math.random() * others.length)];
      const intoLuke = Math.random() < 0.65;
      const b = intoLuke ? luke : others[Math.floor(Math.random() * others.length)];
      if (a === b || a.getData("hop")) return;
      const dir = b.x >= a.x ? 1 : -1;
      this.tweens.killTweensOf(a);
      this.tweens.add({ targets: a, x: Phaser.Math.Clamp(b.x - dir * 34, 60, 900), y: Phaser.Math.Clamp(b.y + (Math.random() - 0.5) * 16, 220, 305), duration: 140, onComplete: () => {
        this.faceTo(a, b.x);
        this.tweens.killTweensOf(b);
        this.tweens.add({ targets: b, x: Phaser.Math.Clamp(b.x + dir * (40 + Math.random() * 50), 60, 900), y: Phaser.Math.Clamp(b.y + (Math.random() - 0.5) * 30, 220, 305), angle: dir * (8 + Math.random() * 12), duration: 220, ease: "Quad.out", onComplete: () => b.setAngle(0) });
        a.setDepth(100 + a.y);
        b.setDepth(100 + b.y);
        synth.play(Math.random() < 0.3 ? "punch_big" : "punch");
        vfx(this, Math.random() < 0.5 ? "vfx_hit" : "vfx_dust", (a.x + b.x) / 2, a.y, { scale: 1.1, depth: 500 });
        if (Math.random() < 0.5) this.bubble(a, ["SHOVE!", "YEAH LUKE!", "OI!", "*SHOVE*", "TAKE THAT LUKE", "NO DOVES!"][Math.floor(Math.random() * 6)], "#ffffff", "#111", 12);
        const h = charMeta(this, b.texture.key)?.hurt?.south;
        if (h) b.setFrame(h[Math.floor(Math.random() * h.length)]);
      } });
    };
    const mobEv = this.time.addEvent({ delay: 110, loop: true, callback: shoveOnce });
    this.cameras.main.shake(4000, 0.004);
    await this.talk(RM_SHOVE);
    this.caption("PANDEMONIUM", "#ff4d4d", 40);
    await this.wait(2200);
    mob = false;
    mobEv.remove();
    this.dropCaption();
    synth.music("ominous");
    // Scrombus on the table
    await this.talk(RM_UNITE.slice(0, 1));
    all.forEach((sp) => {
      this.tweens.killTweensOf(sp);
      sp.setAngle(0);
      this.faceTo(sp, scr.x);
    });
    await this.goHome(all, 800);
    luke.setPosition(370, 270);
    this.tweens.add({ targets: scr, y: scr.y - 40, duration: 300, ease: "Quad.out" });
    await this.talk(RM_UNITE.slice(1, 3));
    this.tweens.add({ targets: scr, y: (scr.getData("home") as { y: number }).y, duration: 300, ease: "Bounce.out" });
    await this.talk(RM_UNITE.slice(3));
    this.tween({ targets: doc, alpha: 0, duration: 300 }).then(() => doc.destroy());
    puddle.destroy();
    luke.setData("home", { x: luke.x, y: luke.y });

    // ---- Kreddle's arsenal (who cares)
    const arsenal = this.add.container(480, 110).setDepth(700);
    arsenal.add(this.add.rectangle(0, 0, 520, 110, 0x0b0f1a, 0.92).setStrokeStyle(3, 0xef4444));
    arsenal.add(this.add.text(0, -40, "KREDDLE: KNOWN ARSENAL", { fontFamily: "Impact, sans-serif", fontSize: "18px", color: "#ef4444" }).setOrigin(0.5));
    ["c6_missile", "c6_launcher", "c6_nuke", "c6_launcher4", "c6_missile"].forEach((k, i) => {
      const img = this.prop(k, -200 + i * 100, 48, 0.9, 0, 0x64748b, 40, 30);
      arsenal.add(img);
      img.setAlpha(0);
      this.tweens.add({ targets: img, alpha: 1, delay: 200 + i * 180, duration: 200 });
    });
    synth.play("alarm");
    await this.talk(RM_CAUTION.slice(0, 3));
    synth.play("trombone");
    await this.tween({ targets: arsenal, y: -120, angle: 8, duration: 400, ease: "Quad.in" });
    arsenal.destroy();
    all.forEach((sp, i) => this.time.delayedCall(i * 60, () => this.bubble(sp, ["NEVER!", "WHO CARES!", "NO BALLS!", "PFFT"][i % 4], "#ffffff", "#111", 12)));
    await this.talk(RM_CAUTION.slice(3));

    // ---- the prizes
    const giver = me === "KREBON" ? S("KREZMAR") : S("KREBON");
    const crate = this.prop("p_gun_crate", 480, 312, 1.8, 300, 0x8b5a2b, 70, 40);
    crate.setX(-60);
    await Promise.all([this.tween({ targets: giver, x: 400, y: 260, duration: 1000 }), this.tween({ targets: crate, x: 480, duration: 1000 })]);
    synth.play("door");
    await this.talk(RM_ARMS);
    // the lid flies off and out it floats
    synth.play("explode");
    vfx(this, "vfx_dust", 480, 300, { scale: 2, depth: 310 });
    const fl = this.prop("c6_chemflamer", 480, 290, 1.4, 600, 0x22c55e, 60, 20);
    const glow = this.add.ellipse(480, 260, 120, 60, 0x7cff3a, 0.35).setDepth(599).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });
    synth.play("perfect");
    await this.tween({ targets: [fl, glow], y: "-=70", duration: 900, ease: "Sine.out" });
    const pl = L[me];
    await this.tween({ targets: [fl, glow], x: pl.x + 30, y: pl.y + 20, duration: 700, ease: "Sine.inOut" });
    glow.destroy();
    fl.setScale(this.textures.exists("c6_chemflamer") ? 0.9 : 1);
    this.giveFlamer();
    this.caption("CHEMICAL FLAMETHROWER", "#7cff3a", 30);
    synth.play("gun_flamer");
    // a test burst at the ceiling
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 70, () => {
        const f = vfx(this, "vfx_fire", pl.x + 40 + i * 6, pl.y - 30 - i * 18, { scale: 0.8 + i * 0.1, depth: 610, tint: 0x5bff2a });
        // the fire sheet loops: these are just a burst
        if (f) this.tween({ targets: f, alpha: 0, delay: 500, duration: 400 }).then(() => f.destroy());
        if (!f) {
          const c = this.add.circle(pl.x + 40 + i * 6, pl.y - 30 - i * 18, 10 + i * 2, 0x7cff3a, 0.8).setDepth(610);
          this.tween({ targets: c, alpha: 0, scale: 2, duration: 500 }).then(() => c.destroy());
        }
      });
    }
    this.cameras.main.shake(500, 0.006);
    all.forEach((sp, i) => sp !== pl && this.time.delayedCall(300 + i * 60, () => this.bubble(sp, ["OOOOH", "GREEN!!", "😍", "LOVELY"][i % 4], "#d9f99d", "#14532d", 12)));
    await this.talk(RM_GOT_GUN);
    this.dropCaption();
    this.tween({ targets: crate, alpha: 0, duration: 300 });
    await this.goHome([giver], 600);
    // everyone else's toys
    const toy = (id: string, key: string, fb: number) => {
      const sp = S(id);
      const img = this.prop(key, sp.x + 40, sp.y + 46, 1.1, sp.depth + 1, fb, 26, 30);
      img.setScale(0.1);
      this.tween({ targets: img, scale: this.textures.exists(key) ? 1.1 : 1, duration: 300, ease: "Back.out" });
      return img;
    };
    const toys: Phaser.GameObjects.Image[] = [];
    const showLines = RM_SHOWOFF;
    toys.push(toy("MIKEY", "c6_napalm", 0xea580c));
    await this.talk(showLines.slice(0, 1));
    toys.push(toy("GRONNY", "c6_mustard", 0xeab308));
    await this.talk(showLines.slice(1, 2));
    const nb = toy("CRONGUS", "c6_nailbomb", 0x64748b);
    toys.push(nb);
    const fuse = this.time.addEvent({ delay: 120, loop: true, callback: () => vfx(this, "vfx_sparks", nb.x + 18, nb.y - 40, { scale: 0.5, depth: nb.depth + 1 }) });
    await this.talk(showLines.slice(2, 5));
    const bucket = this.add.container(S("KREBLIS").x + 34, S("KREBLIS").y + 20).setDepth(S("KREBLIS").depth + 1);
    bucket.add(this.add.polygon(0, 0, [0, 0, 24, 0, 20, 24, 4, 24], 0x94a3b8).setStrokeStyle(2, 0x334155));
    await this.talk(showLines.slice(5));
    // the nuke, under a tarp in the corner
    const wonk = S("KREZWONK");
    const nuke = this.prop("c6_nuke", 870, 335, 1.9, 330, 0x14532d, 90, 50);
    const tarp = this.add.rectangle(860, 300, 130, 70, 0x475569).setStrokeStyle(2, 0x1e293b).setDepth(331);
    await this.tween({ targets: wonk, x: 770, y: 290, duration: 900 });
    this.face(wonk, "east");
    await this.talk(RM_NUKE.slice(0, 1));
    synth.play("pop");
    await this.tween({ targets: tarp, x: 1060, y: 200, angle: 40, duration: 500, ease: "Quad.out" });
    tarp.destroy();
    const bow = this.add.container(nuke.x, nuke.y - 70).setDepth(332);
    bow.add(this.add.triangle(-8, 0, 0, 0, -14, -8, -14, 8, 0xef4444));
    bow.add(this.add.triangle(8, 0, 0, 0, 14, -8, 14, 8, 0xef4444));
    bow.add(this.add.circle(0, 0, 4, 0xb91c1c));
    const tick = this.add.text(nuke.x, nuke.y - 30, "04:00", { fontFamily: "Courier New, monospace", fontSize: "13px", color: "#ef4444", backgroundColor: "#000", padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(333);
    this.tweens.add({ targets: tick, alpha: 0.3, yoyo: true, repeat: -1, duration: 400 });
    synth.play("gasp");
    this.cameras.main.shake(300, 0.006);
    // the room goes very still: a hard push in on it, a heartbeat
    Juice.subDrop(0.8, 1.2);
    Juice.heartbeat();
    this.cameras.main.pan(nuke.x - 120, nuke.y - 110, 260, "Quad.easeOut", true);
    this.cameras.main.zoomTo(1.35, 260, "Quad.easeOut", true);
    this.caption("☢ A NUCLEAR BOMB ☢", "#facc15", 34).setScrollFactor(0);
    await this.wait(1100);
    this.cameras.main.pan(480, 270, 700, "Sine.easeInOut", true);
    this.cameras.main.zoomTo(1, 700, "Sine.easeInOut", true);
    await this.talk(RM_NUKE.slice(1, 4));
    this.dropCaption();
    // he sits on it
    await this.tween({ targets: wonk, x: nuke.x, y: nuke.y - 55, duration: 500 });
    wonk.setDepth(334);
    this.face(wonk, "south");
    await this.talk(RM_NUKE.slice(4));
    fuse.remove();

    // ---- hands in
    await this.talk(RM_HANDS);
    [...toys, nb].forEach((t) => t.active && this.tween({ targets: t, alpha: 0, duration: 300 }));
    bucket.destroy();
    const n = all.length;
    await Promise.all(all.map((sp, i) => {
      const a = Math.PI + (i / (n - 1)) * Math.PI;
      const x = 480 + Math.cos(a) * 230;
      const y = 300 + Math.sin(a) * 56 + (i % 2) * 6;
      return this.tween({ targets: sp, x, y, duration: 1100 }).then(() => {
        sp.setDepth(100 + sp.y);
        this.faceTo(sp, 480);
      });
    }));
    const hands = all.map((sp, i) => {
      const h = this.add.circle(sp.x, sp.y - 6, 7, [0xf1c27d, 0xe0ac69, 0xffdbac, 0xc68642][i % 4]).setStrokeStyle(2, 0x3b2a1a).setDepth(500);
      this.tween({ targets: h, x: 480 + (Math.random() - 0.5) * 18, y: 236 + (Math.random() - 0.5) * 10, duration: 600, delay: i * 70, ease: "Sine.out" });
      return h;
    });
    await this.wait(1100);
    synth.play("bongo");
    // in close on the hands while it builds
    this.cameras.main.pan(480, 250, 900, "Sine.easeInOut", true);
    this.cameras.main.zoomTo(1.3, 900, "Sine.easeInOut", true);
    await this.talk(RM_END.slice(0, 1));
    Juice.riser(700, 0.35);
    await this.wait(700);
    // UNITE!
    synth.play("cheer");
    Juice.subDrop(0.9, 1.4);
    this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.zoomTo(1, 900, "Cubic.easeOut", true);
    this.cameras.main.pan(480, 270, 900, "Cubic.easeOut", true);
    Juice.shockRing(this, 480, 150, { color: 0xffd23f, to: 700, rings: 3, depth: 560 });
    // light pours down on them
    const rays = [0, 1, 2, 3, 4].map((i) => {
      const r = this.add.triangle(480, 120, 0, 0, -26, 520, 26, 520, 0xffe9a8, 0.16).setOrigin(0, 0).setDepth(90).setBlendMode(Phaser.BlendModes.ADD).setAngle(-50 + i * 25);
      this.tweens.add({ targets: r, angle: r.angle + 12, yoyo: true, repeat: -1, duration: 1600 + i * 200, ease: "Sine.inOut" });
      return r;
    });
    this.tween({ targets: hands, y: 120, duration: 400, ease: "Back.out" });
    const joy2 = this.perform(all, "victory", 10);
    vfx(this, "vfx_confetti", 480, 140, { scale: 2.4, depth: 600 });
    this.caption("KRELWORLD KREW UNITE!", "#ffd23f", 38);
    this.tweens.add({ targets: S("KREBLIS"), y: "-=30", yoyo: true, repeat: 5, duration: 200 });
    await this.talk(RM_END.slice(1, 4));
    joy2();
    hands.forEach((h) => h.destroy());
    rays.forEach((r) => this.tweens.add({ targets: r, alpha: 0, duration: 600, onComplete: () => r.destroy() }));
    this.dropCaption();
    await this.talk(RM_END.slice(4));
    // out into the rain
    await Promise.all(all.map((sp, i) => this.tween({ targets: sp, x: -80 - i * 30, y: 300 + (i % 3) * 14, duration: 1800 + i * 80 })));
    synth.stopMusic();
  }

  private giveFlamer() {
    const s = G.s;
    s.guns = s.guns ?? {};
    s.guns.chem_flamer = Math.max(s.guns.chem_flamer ?? 0, GUNS.chem_flamer.maxAmmo);
    s.gun = "chem_flamer";
  }

  /** Everyone on stage, lads only (no Proctus): for the party scenes. */
  private partyCast(y0 = 300) {
    const me = G.s.player;
    const ids: string[] = [...LADS, "MIKEY"].filter((p) => p !== me);
    ids.splice(Math.floor(ids.length / 2), 0, me);
    return ids.map((id, i) => {
      const x = 90 + i * (780 / (ids.length - 1));
      const y = y0 + (i % 2) * 34;
      const sp = this.actor(id, x, y, 3.1);
      sp.setData("home", { x, y });
      return sp;
    });
  }

  // ---------------------------------------------------------------- krunch_protocol

  private async krunchProtocol() {
    await ensureCh6Art(this);
    G.rt.timerEnd = 0;
    G.emit("timer", null);
    // (a) the Town Hall: hubris
    if (!backdrop(this, "bg_townhall", { dim: 0.1, depth: -10 })) this.sky(0x6b4f2a, 0x3a2a1a);
    synth.weatherSound("rain");
    synth.music("crazy");
    const lads = this.partyCast(290);
    lads.forEach((sp) => sp.setTint(0xd6d3d1));
    // still smoking from Kreddle
    const smoke = this.time.addEvent({ delay: 220, loop: true, callback: () => {
      const sp = lads[Math.floor(Math.random() * lads.length)];
      const p = this.add.circle(sp.x + (Math.random() - 0.5) * 20, sp.y - 30, 5, 0x6b7280, 0.6).setDepth(300);
      this.tweens.add({ targets: p, y: p.y - 50, scale: 2.5, alpha: 0, duration: 1200, onComplete: () => p.destroy() });
    } });
    const stop = this.perform(lads, "victory", 10);
    for (let i = 0; i < 5; i++) vfx(this, "vfx_confetti", 120 + i * 180, 120, { scale: 2, depth: 600, delay: i * 250 });
    synth.play("cheer");
    this.caption("WE WON!!!", "#ffd23f", 40);
    await this.wait(1200);
    this.dropCaption();
    stop();
    await this.talk(KP_PARTY.slice(0, 7));
    const stop2 = this.perform(lads, "victory", 12);
    this.caption("THEY DON'T HAVE THE BALLS!!", "#ff4d4d", 34);
    lads.forEach((sp, i) => this.time.delayedCall(i * 90, () => this.bubble(sp, ["NO BALLS!", "NEVER!!", "HAHAHA", "WOOO!"][i % 4], "#ffffff", "#111", 12)));
    await this.talk(KP_PARTY.slice(7));
    stop2();
    smoke.remove();
    this.dropCaption();

    // (b) the palace: the last breath
    synth.stopMusic();
    synth.weatherSound(null);
    this.cameras.main.flash(250, 0, 0, 0);
    this.clearStage();
    this.add.rectangle(480, 270, 960, 540, 0x0c0810).setDepth(-12);
    const bunker = backdrop(this, "tv_bunker", { dim: 0.45, depth: -10 });
    // (lift the room so its floor sits above the dialogue box)
    if (bunker) bunker.setY(150);
    else this.add.rectangle(480, 270, 960, 540, 0x1a1020).setDepth(-10);
    this.add.rectangle(480, 270, 960, 540, 0x7f1d1d, 0.25).setDepth(-8).setBlendMode(Phaser.BlendModes.MULTIPLY);
    // the lights are going
    const dark = this.add.rectangle(480, 270, 960, 540, 0x000000).setAlpha(0).setDepth(600);
    this.time.addEvent({ delay: 700, loop: true, callback: () => {
      if (Math.random() < 0.5) return;
      dark.setAlpha(0.6);
      this.time.delayedCall(60, () => dark.setAlpha(0.1));
      this.time.delayedCall(120, () => dark.setAlpha(0.5));
      this.time.delayedCall(200, () => dark.setAlpha(0));
    } });
    for (const fx of [60, 250, 560]) this.fireBlob(fx, 345, 34, 50);
    this.time.addEvent({ delay: 400, loop: true, callback: () => vfx(this, "vfx_sparks", 100 + Math.random() * 760, 60 + Math.random() * 80, { scale: 1, depth: 80 }) });
    const term = this.prop("c6_kd_terminal", 810, 360, 2.4, 200, 0x334155, 120, 90);
    void term;
    const screenGlow = this.add.ellipse(800, 265, 90, 60, 0xef4444, 0.25).setDepth(201).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: screenGlow, alpha: 0.05, yoyo: true, repeat: -1, duration: 500 });
    // the drawn crawl cycle (PixelLab), fetched if this build's manifest doesn't list it yet
    if (!this.textures.exists("c6_klerble_crawl_anim")) {
      await new Promise<void>((res) => {
        this.load.spritesheet("c6_klerble_crawl_anim", "art/props/c6_klerble_crawl_anim.png", { frameWidth: 64, frameHeight: 32 });
        this.load.once(Phaser.Loader.Events.COMPLETE, () => res());
        this.time.delayedCall(4000, () => res());
        this.load.start();
      });
    }
    const crawlAnim = this.textures.exists("c6_klerble_crawl_anim");
    if (crawlAnim && !this.anims.exists("c6_klerble_crawl")) this.anims.create({ key: "c6_klerble_crawl", frames: this.anims.generateFrameNumbers("c6_klerble_crawl_anim", { start: 0, end: 8 }), frameRate: 7, repeat: -1 });
    const hasCrawl = this.textures.exists("c6_klerble_crawl");
    const kl = crawlAnim
      ? this.add.sprite(-60, 352, "c6_klerble_crawl_anim", 0).setOrigin(0.5, 1).setScale(2.6).setDepth(300)
      : hasCrawl
        ? this.add.image(-60, 352, "c6_klerble_crawl").setOrigin(0.5, 1).setScale(2.6).setDepth(300)
        : this.add.sprite(-60, 340, "spr_TV_PRESIDENT_KLERBLE", 4).setScale(2.4).setAngle(80).setDepth(300);
    const crawling = (on: boolean) => {
      if (!crawlAnim || !(kl instanceof Phaser.GameObjects.Sprite)) return;
      if (on) kl.play("c6_klerble_crawl", true);
      else kl.stop();
    };
    this.cast.set("PRESIDENT KLERBLE", kl as Phaser.GameObjects.Sprite);
    const kpBars = Juice.letterbox(this, 50, 600, 985);
    Juice.vignette(this, 0x000000, 0.65, 984);
    // a slow, creeping push-in for the whole crawl
    this.cameras.main.zoomTo(1.12, 9000, "Sine.easeInOut", true);
    // the trail
    const trail = this.add.graphics().setDepth(290);
    const smear = () => {
      trail.fillStyle(0x7f1d1d, 0.85).fillRect(-80, 344, kl.x + 10, 8);
      trail.fillStyle(0xb91c1c, 0.7).fillRect(-80, 346, kl.x + 6, 3);
    };
    synth.play("roar");
    crawling(true);
    for (let i = 0; i < 4; i++) {
      await this.tween({ targets: kl, x: kl.x + 70, duration: 520, ease: "Quad.out", onUpdate: smear });
      this.tweens.add({ targets: kl, scaleY: kl.scaleY * 0.9, yoyo: true, duration: 150 });
      if (G.meta.settings.gore !== false && i % 2) vfx(this, "vfx_blood", kl.x, 342, { scale: 1, depth: 295 });
      await this.wait(260);
    }
    crawling(false);
    await this.talk(KP_KLERBLE.slice(0, 3));
    crawling(true);
    for (let i = 0; i < 5; i++) {
      await this.tween({ targets: kl, x: kl.x + 68, duration: 560, ease: "Quad.out", onUpdate: smear });
      await this.wait(i === 4 ? 0 : 300);
    }
    // up the cable
    await this.tween({ targets: kl, x: 720, angle: -35, y: 340, duration: 800, ease: "Sine.out", onUpdate: smear });
    crawling(false);
    await this.talk(KP_KLERBLE.slice(3));
    // the screen
    const scr = this.add.container(480, 175).setDepth(700).setScale(0.2).setAlpha(0);
    scr.add(this.add.rectangle(0, 0, 520, 270, 0x050505).setStrokeStyle(6, 0x334155));
    scr.add(this.add.text(0, -105, "KREDDLE PRESIDENTIAL SYSTEMS v6.66", { fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ef4444" }).setOrigin(0.5));
    scr.add(this.add.rectangle(0, -6, 140, 104, 0x7f1d1d).setStrokeStyle(3, 0xef4444));
    scr.add(this.add.rectangle(-44, -60, 52, 14, 0x7f1d1d).setStrokeStyle(3, 0xef4444));
    scr.add(this.add.text(0, -6, "KRUNCH", { fontFamily: "Impact, sans-serif", fontSize: "28px", color: "#fecaca" }).setOrigin(0.5));
    const prompt = this.add.text(0, 92, "> INITIATE? Y/N _", { fontFamily: "Courier New, monospace", fontSize: "16px", color: "#22c55e" }).setOrigin(0.5);
    scr.add(prompt);
    this.tweens.add({ targets: prompt, alpha: 0.3, yoyo: true, repeat: -1, duration: 400 });
    await this.tween({ targets: scr, scale: 1, alpha: 1, duration: 500, ease: "Back.out" });
    synth.play("ding");
    await this.wait(900);
    // the last breath: the screen pulls away and we're in close on him, his heart giving out
    this.tween({ targets: scr, alpha: 0, scale: 0.8, y: 120, duration: 500 });
    const cam = this.cameras.main;
    // (framed so he sits above the dialogue box)
    cam.pan(kl.x - 30, kl.y - 8, 900, "Sine.easeInOut", true);
    cam.zoomTo(1.7, 900, "Sine.easeInOut", true);
    let beatN = 0;
    const beat = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      Juice.heartbeat(Math.max(0.3, 0.9 - beatN * 0.12));
      beatN++;
    } });
    Juice.heartbeat();
    await this.talk(KP_LAST);
    beat.remove();
    // back out to the screen: one keystroke
    cam.pan(480, 270, 400, "Cubic.easeOut", true);
    cam.zoomTo(1, 400, "Cubic.easeOut", true);
    await this.tween({ targets: scr, alpha: 1, scale: 1, y: 175, duration: 400, ease: "Cubic.out" });
    prompt.setText("> Y").setColor("#ef4444");
    synth.play("select");
    Juice.punchZoom(this, 0.08, 400, 1);
    await this.wait(400);
    scr.add(this.add.text(0, 120, "KRUNCH PROTOCOL: ARMED", { fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ef4444" }).setOrigin(0.5));
    await this.tween({ targets: kl, angle: 0, y: 352, duration: 600, ease: "Bounce.out" });
    // one last, very faint heartbeat. Then nothing.
    this.time.delayedCall(500, () => Juice.heartbeat(0.25));
    await this.wait(1600);
    kpBars(300);
    Juice.riser(900, 0.35);
    await this.wait(900);

    // (c) white
    const white = this.add.rectangle(480, 270, 960, 540, 0xffffff).setAlpha(0).setDepth(990);
    await this.tween({ targets: white, alpha: 1, duration: 120 });
    this.clearStage();
    this.cast.clear();
    await this.wait(900);
    // outside: the palace, then the bomb
    if (!backdrop(this, "bg_kd_palace", { depth: -10 })) this.sky(0x1a0b3a, 0x5b1d73);
    this.rainOver("rain", 940);
    synth.weatherSound(null);
    const flashW = this.add.rectangle(480, 270, 960, 540, 0xffffff, 1).setDepth(990);
    await this.tween({ targets: flashW, alpha: 0, duration: 700 });
    await this.wait(1500);
    // silence. then:
    const nukeBars = Juice.letterbox(this, 44, 300, 985);
    this.cameras.main.flash(900, 255, 255, 255);
    synth.play("boom");
    Juice.subDrop(1, 3.2);
    this.time.delayedCall(80, () => synth.play("explode"));
    this.time.delayedCall(300, () => synth.play("roar"));
    this.time.delayedCall(450, () => synth.play("explode_2"));
    this.time.delayedCall(900, () => synth.play("thunder"));
    this.cameras.main.shake(5500, 0.04);
    // the punch: in hard on the flash, then a long slow pull back to take in the size of it
    this.cameras.main.setZoom(1.35);
    this.cameras.main.zoomTo(1, 4200, "Cubic.easeOut", true);
    // chunks of the palace thrown at the camera
    for (let i = 0; i < 16; i++) {
      this.time.delayedCall(150 + i * 70, () => {
        const a = Math.random() * Math.PI * 2;
        const ch = this.add.rectangle(480 + Math.cos(a) * 30, 300 + Math.sin(a) * 20, 8 + Math.random() * 10, 6 + Math.random() * 8, [0x292524, 0x44403c, 0xf97316, 0x1c1917][i % 4]).setDepth(450);
        this.tweens.add({ targets: ch, x: 480 + Math.cos(a) * (500 + Math.random() * 300), y: 300 + Math.sin(a) * (320 + Math.random() * 200), scale: 4 + Math.random() * 4, angle: 720, alpha: { from: 1, to: 0.9 }, duration: 700 + Math.random() * 400, ease: "Quad.in", onComplete: () => ch.destroy() });
      });
    }
    // a fireball swallows the palace, then the cloud climbs out of it
    const ball = this.add.circle(480, 300, 20, 0xffe08a, 1).setDepth(395).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ball, radius: 330, alpha: 0.15, duration: 2600, ease: "Cubic.out" });
    const core = this.add.circle(480, 300, 10, 0xffffff, 1).setDepth(396);
    this.tweens.add({ targets: core, radius: 140, alpha: 0, duration: 1600, ease: "Cubic.out" });
    vfx(this, "vfx_mushroom", 480, 440, { scale: 3.4, depth: 398, hold: true, alpha: 0.55, speed: 0.8 });
    const cloud = vfx(this, "vfx_mushroom", 480, 425, { scale: 2.6, depth: 400, hold: true });
    if (!cloud) {
      const stem = this.add.rectangle(480, 300, 60, 10, 0xf97316).setOrigin(0.5, 1).setDepth(400);
      const cap = this.add.ellipse(480, 280, 40, 30, 0xfbbf24).setDepth(401);
      this.tween({ targets: stem, height: 220, duration: 2000 });
      this.tween({ targets: cap, y: 80, scaleX: 7, scaleY: 4, duration: 2000 });
    }
    // the shockwave: rings and a wall of dust rolling out
    for (let i = 0; i < 4; i++) {
      const ring = this.add.ellipse(480, 300, 40, 14).setStrokeStyle(6 - i, 0xffffff, 0.9).setDepth(410).setFillStyle(0xffffff, 0);
      this.tweens.add({ targets: ring, scaleX: 32, scaleY: 18, alpha: 0, delay: i * 260, duration: 1800, ease: "Cubic.out", onComplete: () => ring.destroy() });
    }
    vfx(this, "vfx_shock", 480, 300, { scale: 9, depth: 405 });
    for (let i = 0; i < 10; i++) vfx(this, "vfx_dust", 480 + (i - 4.5) * 100, 330, { scale: 3, depth: 420, delay: 300 + Math.abs(i - 4.5) * 120 });
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 220, () => this.boomAt(100 + Math.random() * 760, 120 + Math.random() * 220, 1.4 + Math.random(), 380));
    const heat = this.add.rectangle(480, 270, 960, 540, 0xff7a00).setAlpha(0).setDepth(430).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: heat, alpha: 0.55, duration: 900 });
    await this.wait(1800);
    // it takes out all of Kreddle: everything goes white for a long, long moment
    const wall = this.add.rectangle(480, 270, 1400, 900, 0xfff7ed).setAlpha(0).setDepth(990);
    await this.tween({ targets: wall, alpha: 1, duration: 1400 });
    synth.play("boom");
    Juice.subDrop(0.8, 2.5);
    // and then your ears ring for a while
    Juice.earRing(4000, 0.08);
    nukeBars(10);
    this.cameras.main.setZoom(1);
    await this.wait(3200);

    // (d) the ruins
    this.clearStage();
    this.cast.clear();
    if (!backdrop(this, "bg_kd_ruins", { depth: -10 })) this.sky(0x450a0a, 0x1c1917);
    const blood = this.add.rectangle(480, 270, 960, 540, 0x991b1b, 0.22).setDepth(-8).setBlendMode(Phaser.BlendModes.MULTIPLY);
    void blood;
    for (const [x, sz] of [[90, 50], [260, 34], [640, 46], [880, 60], [420, 28]] as [number, number][]) this.fireBlob(x, 330, sz, 60);
    const heaps: [string, number, number, number][] = [["c6_burnheap", 140, 350, 2.2], ["c6_ashpile", 330, 352, 1.8], ["c6_skeleton", 560, 352, 1.4], ["c6_burnheap", 760, 352, 2.0], ["c6_ashpile", 900, 350, 1.6]];
    for (const [k, x, y, s] of heaps) this.prop(k, x, y, s, 80, 0x292524, 60, 30);
    // debris and ash keep coming down
    const rain2 = this.time.addEvent({ delay: 60, loop: true, callback: () => {
      const ash = Math.random() < 0.7;
      const d = ash ? this.add.circle(Math.random() * 1000, -10, 1.5 + Math.random() * 2, 0xd6d3d1, 0.8) : this.add.rectangle(Math.random() * 1000, -10, 4 + Math.random() * 8, 3 + Math.random() * 6, Math.random() < 0.3 ? 0xf97316 : 0x44403c);
      d.setDepth(950);
      this.tweens.add({ targets: d, y: 340 + Math.random() * 20, x: d.x - 40 - Math.random() * 80, angle: ash ? 0 : 360, duration: ash ? 3000 + Math.random() * 2000 : 1100 + Math.random() * 600, onComplete: () => d.destroy() });
    } });
    const fade = this.add.rectangle(480, 270, 960, 540, 0xfff7ed, 1).setDepth(990);
    synth.music("ominous");
    await this.tween({ targets: fade, alpha: 0, duration: 3000 });
    fade.destroy();
    this.caption("KREDDLE", "#a8a29e", 40);
    await this.wait(1500);
    this.dropCaption();
    await this.talk(KP_RUINS);

    // (e) the Krunch Protocol
    synth.play("alarm");
    const pads: [string, number, number][] = [["c6_launcher", 110, 336], ["c6_launcher4", 290, 352], ["c6_launcher", 480, 336], ["c6_launcher4", 670, 352], ["c6_launcher", 860, 336]];
    const launchers = pads.map(([k, x, y], i) => {
      const hatch = this.add.rectangle(x, y, 120, 10, 0x0a0a0a).setDepth(89);
      void hatch;
      const l = this.prop(k, x, y + 90, 1.8, 90 + (y > 340 ? 2 : 0), 0x3f6212, 110, 60).setFlipX(true);
      this.tween({ targets: l, y, duration: 1600, delay: i * 350, ease: "Sine.out" });
      this.time.delayedCall(i * 350, () => vfx(this, "vfx_dust", x, y, { scale: 2, depth: 95 }));
      return l;
    });
    this.cameras.main.shake(2600, 0.006);
    await this.wait(1800);
    // red sights on Krelworld
    const sights = launchers.map((l) => {
      const c = this.add.container(l.x - 60, l.y - 120).setDepth(800);
      c.add(this.add.circle(0, 0, 16).setStrokeStyle(2, 0xef4444));
      c.add(this.add.rectangle(0, 0, 44, 2, 0xef4444));
      c.add(this.add.rectangle(0, 0, 2, 44, 0xef4444));
      this.tweens.add({ targets: c, angle: 90, yoyo: true, repeat: -1, duration: 600 });
      return c;
    });
    const tgt = this.add.text(480, 60, "TARGET: KRELWORLD   ◄◄◄", { fontFamily: "Courier New, monospace", fontSize: "20px", color: "#ef4444", backgroundColor: "#000000cc", padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(800);
    this.tweens.add({ targets: tgt, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
    await this.talk(KP_PROTOCOL);
    sights.forEach((s) => s.destroy());
    // launch
    synth.stopMusic();
    // a beat of quiet, then everything goes at once
    Juice.riser(1100, 0.4);
    await this.wait(1100);
    this.caption("THE KRUNCH PROTOCOL", "#ef4444", 36);
    Juice.subDrop(0.9, 1.4);
    Juice.flash(this, 0xff3b3b, 400, 0.4, 960);
    this.cameras.main.setZoom(1.15);
    this.cameras.main.zoomTo(1, 6000, "Sine.easeOut", true);
    let fired = 0;
    const launch = this.time.addEvent({ delay: 170, repeat: 34, callback: () => {
      const l = launchers[fired % launchers.length];
      fired++;
      const x0 = l.x - 20;
      const y0 = l.y - 60;
      synth.play(fired % 3 ? "rocket" : "lob");
      vfx(this, "vfx_boom", x0, y0 + 10, { scale: 0.8, depth: 120 });
      const m = this.textures.exists("c6_missile") ? this.add.image(x0, y0, "c6_missile").setScale(1.3).setDepth(130) : this.add.rectangle(x0, y0, 30, 8, 0x9ca3af).setDepth(130);
      // up, and over to the west: Krelworld
      const tx = -150 - Math.random() * 200;
      const ty = -100 + Math.random() * 120;
      const path = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x0, y0), new Phaser.Math.Vector2(x0 - 60, -260), new Phaser.Math.Vector2(tx, ty));
      const o = { t: 0 };
      this.tweens.add({ targets: o, t: 1, duration: 1500 + Math.random() * 500, ease: "Sine.in", onUpdate: () => {
        const p = path.getPoint(o.t);
        const ang = Phaser.Math.RadToDeg(Math.atan2(p.y - m.y, p.x - m.x));
        m.setPosition(p.x, p.y);
        m.setAngle(ang);
        if (Math.random() < 0.6) {
          const puff = this.add.circle(p.x, p.y, 4 + Math.random() * 4, 0xd6d3d1, 0.7).setDepth(125);
          this.tweens.add({ targets: puff, scale: 3, alpha: 0, duration: 900, onComplete: () => puff.destroy() });
        }
      }, onComplete: () => m.destroy() });
      this.cameras.main.shake(100, 0.006);
    } });
    await this.wait(6600);
    launch.remove();
    rain2.remove();
    this.dropCaption();
    await this.talk([dir("Somewhere over the Kreddle Bridge, a flurry of ballistic missiles is heading for Krelworld. In the Town Hall, the music is still going.")]);
  }

  // ---------------------------------------------------------------- townhall_party: WE DID IT

  private async townhallParty() {
    await ensureCh6Art(this);
    G.rt.timerEnd = 0;
    G.emit("timer", null);
    const bg = backdrop(this, "bg_townhall", { dim: 0.45, depth: -10 }) ?? this.sky(0x1a0f1f, 0x3a1a3a);
    // disco: sweeping coloured lights
    const lights = [0xff4fd8, 0x22d3ee, 0xfacc15, 0x7cff3a, 0xa855f7].map((c, i) => {
      const b = this.add.triangle(480, 40, 0, 0, -70, 420, 70, 420, c, 0.14).setOrigin(0, 0).setDepth(-5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: b, angle: { from: -40, to: 40 }, yoyo: true, repeat: -1, duration: 1300 + i * 270, delay: i * 200, ease: "Sine.inOut" });
      return b;
    });
    const spots = this.time.addEvent({ delay: 200, loop: true, callback: () => {
      const s = this.add.circle(Math.random() * 960, 120 + Math.random() * 220, 6, [0xff4fd8, 0x22d3ee, 0xfacc15][Math.floor(Math.random() * 3)], 0.6).setDepth(-4).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: s, alpha: 0, duration: 600, onComplete: () => s.destroy() });
    } });
    const ball = this.prop("c6_discoball", 480, 90, 1.2, 50, 0xe5e7eb, 40, 40);
    this.tweens.add({ targets: ball, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 900 });
    // the stage
    const stage = this.add.rectangle(480, 250, 360, 16, 0x3f1d4f).setStrokeStyle(2, 0xff4fd8).setDepth(10);
    const { mik, chz } = this.sanmikSprites(420, 540, 210);
    mik.setScale(2.6).setDepth(20);
    chz.setScale(2.6).setDepth(20);
    this.cast.set("SANMIK", mik);
    this.cast.set("SANCHZ", chz);
    const d1 = this.add.sprite(300, 222, this.textures.exists("spr_TV_DANCER1") ? "spr_TV_DANCER1" : "spr_FOLK1", 0).setScale(2.4).setDepth(20);
    const d2 = this.add.sprite(660, 222, this.textures.exists("spr_TV_DANCER2") ? "spr_TV_DANCER2" : "spr_FOLK2", 0).setScale(2.4).setDepth(20);
    const pole = (x: number) => this.add.rectangle(x, 160, 4, 170, 0xd1d5db).setDepth(19);
    pole(300);
    pole(660);
    let lads = this.partyCast(300);
    // playing as Mikey, you're the act up there (SanMik): not also down on the dance floor
    if (G.s.player === "MIKEY") {
      const meOnFloor = this.cast.get("MIKEY");
      lads = lads.filter((sp) => sp !== meOnFloor);
      meOnFloor?.destroy();
      this.cast.set("MIKEY", mik);
    }
    synth.music("sanmik");
    const s1 = this.perform([mik, chz], "sing", 9);
    const s2 = this.perform([d1, d2], "dance", 10);
    await this.talk(TP_OPEN);
    // everyone dances: the lads have no disco moves on their sheets, so a lot of bouncing and the victory pose
    const s3 = this.perform(lads, "victory", 8);
    const groove = lads.map((sp, i) => this.tweens.add({ targets: sp, y: sp.y - 10, x: sp.x + (i % 2 ? 8 : -8), yoyo: true, repeat: -1, duration: 260 + (i % 3) * 40, ease: "Sine.inOut" }));
    const yee = this.time.addEvent({ delay: 420, loop: true, callback: () => {
      const sp = lads[Math.floor(Math.random() * lads.length)];
      this.bubble(sp, ["YEEE YEE!", "WE DID IT!", "YEEE YEE!!", "WOOOO!", "WE DID IT!!"][Math.floor(Math.random() * 5)], ["#ff4fd8", "#22d3ee", "#facc15"][Math.floor(Math.random() * 3)], "#12001f", 12);
    } });
    for (let i = 0; i < 3; i++) vfx(this, "vfx_confetti", 200 + i * 280, 100, { scale: 2.2, depth: 600, delay: i * 300 });
    this.caption("YEEE YEE!!", "#ff4fd8", 40);
    await this.wait(2600);
    this.caption("WE DID IT!!", "#22d3ee", 40);
    await this.wait(1600);
    this.dropCaption();
    // (hopping during lines fights the groove: pause the groove while they talk)
    groove.forEach((t) => t.pause());
    await this.talk(TP_DANCE);
    groove.forEach((t) => t.resume());
    await this.wait(1800);
    // the whistle
    yee.remove();
    synth.stopMusic();
    groove.forEach((t) => t.remove());
    s1();
    s2();
    s3();
    synth.play("whistle");
    lads.forEach((sp) => this.face(sp, "north"));
    // the room goes quiet; the camera creeps in on everyone looking up
    const bars = Juice.letterbox(this, 48, 700, 985);
    this.cameras.main.zoomTo(1.15, 3000, "Sine.easeInOut", true);
    await this.talk(TP_DOOM);
    const m = this.textures.exists("c6_missile") ? this.add.image(480, -80, "c6_missile").setScale(2).setAngle(90).setDepth(700) : this.add.rectangle(480, -80, 10, 40, 0x9ca3af).setDepth(700);
    synth.play("whistle");
    Juice.riser(700, 0.45);
    await this.tween({ targets: m, y: 140, duration: 700, ease: "Quad.in" });
    m.destroy();
    // BANG: a frozen white frame (everyone mid-scream as silhouettes), then the world comes back in slow motion
    const white = this.add.rectangle(480, 270, 1300, 800, 0xffffff, 1).setDepth(995);
    synth.play("boom");
    synth.play("explode");
    Juice.subDrop(1, 3);
    this.time.delayedCall(120, () => synth.play("explode_2"));
    this.cameras.main.setZoom(1.4);
    everyoneSil(this, [...lads, mik, chz, d1, d2]);
    await Juice.realWait(160);
    white.setAlpha(0.85);
    Juice.slowMo(this, 0.25, 900);
    this.cameras.main.zoomTo(1, 1400, "Cubic.easeOut", true);
    this.cameras.main.shake(3500, 0.05);
    // the floor tips as the building goes
    this.tweens.add({ targets: this.cameras.main, rotation: -0.035, duration: 2600, ease: "Quad.in" });
    this.tween({ targets: white, alpha: 0, duration: 900 });
    Juice.earRing(5000, 0.07);
    spots.remove();
    lights.forEach((l) => l.destroy());
    this.boomAt(480, 140, 2.6, 700);
    this.boomAt(300, 100, 1.8, 700);
    this.boomAt(680, 110, 1.8, 700);
    // cracks across the ceiling, and it all comes down
    const cracks = this.add.graphics().setDepth(5);
    cracks.lineStyle(3, 0x111111, 1);
    for (let i = 0; i < 9; i++) {
      let x = 60 + i * 105;
      let y = 0;
      cracks.beginPath();
      cracks.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (Math.random() - 0.5) * 50;
        y += 20 + Math.random() * 25;
        cracks.lineTo(x, y);
      }
      cracks.strokePath();
    }
    if (bg instanceof Phaser.GameObjects.Image) bg.setTint(0x9a8a7a);
    this.tween({ targets: ball, y: 340, angle: 200, duration: 700, ease: "Quad.in" }).then(() => {
      synth.play("smash");
      vfx(this, "vfx_sparks", ball.x, 330, { scale: 2, depth: 600 });
      ball.destroy();
    });
    this.tween({ targets: stage, angle: 8, y: 270, duration: 500 });
    const screams = ["AAAAAAH", "NOOOO", "MY LEGS", "THEY HAD THE BALLS", "MOLLOR!!", "I FORESAW TH—", "TURN THE POWER OFF", "YEEE—"];
    const everyone = [...lads, mik, chz, d1, d2];
    everyone.forEach((sp, i) => {
      this.time.delayedCall(i * 60, () => this.bubble(sp, screams[i % screams.length], "#fecaca", "#7f1d1d", 12));
      sp.setData("busy", true);
      this.tweens.add({ targets: sp, x: sp.x + (Math.random() - 0.5) * 80, duration: 500 });
    });
    synth.play("gasp");
    this.time.delayedCall(300, () => synth.play("hurt_1"));
    this.time.delayedCall(700, () => synth.play("hurt_2"));
    // rubble rain
    const falling = this.time.addEvent({ delay: 90, repeat: 45, callback: () => {
      const x = 40 + Math.random() * 880;
      const big = Math.random() < 0.35;
      const key = big ? "c6_ceiling" : "p_rubble";
      const r = this.textures.exists(key) ? this.add.image(x, -60, key).setScale(big ? 1.6 + Math.random() : 0.6 + Math.random() * 0.6).setDepth(500) : this.add.rectangle(x, -60, 30 + Math.random() * 40, 16 + Math.random() * 20, 0x78716c).setStrokeStyle(2, 0x292524).setDepth(500);
      const ty = 300 + Math.random() * 60;
      this.tweens.add({ targets: r, y: ty, angle: (Math.random() - 0.5) * 120, duration: 500 + Math.random() * 300, ease: "Quad.in", onComplete: () => {
        vfx(this, "vfx_dust", r.x, ty, { scale: 1.4, depth: 501 });
        if (Math.random() < 0.3) synth.play("smash");
        r.setDepth(100 + ty + 40);
      } });
    } });
    // everyone goes down under it
    everyone.forEach((sp, i) => this.keel(sp, 500 + i * 160));
    for (let i = 0; i < 4; i++) this.time.delayedCall(800 + i * 500, () => this.fireBlob(150 + i * 220, 320, 40, 450));
    await this.wait(2200);
    synth.play("boom");
    this.cameras.main.shake(1500, 0.03);
    for (let i = 0; i < 6; i++) vfx(this, "vfx_blastsmoke", 80 + i * 160, 300, { scale: 2, depth: 560, delay: i * 120 });
    await this.wait(2200);
    falling.remove();
    // fade to black
    const black = this.add.rectangle(480, 270, 1400, 900, 0x000000).setAlpha(0).setDepth(980);
    await this.tween({ targets: black, alpha: 1, duration: 2200 });
    bars(10);
    this.cameras.main.setRotation(0);
    synth.weatherSound(null);
    await this.wait(1200);
    await this.talk(TP_END);
    await this.wait(800);
  }
}
