import Phaser from "phaser";
import type { TVBeat } from "../systems/tv";
import { beatDuration } from "../systems/tv";
import { voice } from "../audio/Voice";
import { synth } from "../audio/Synth";
import { vfx } from "../gfx/Vfx";
import { G } from "../G";
import { FONT } from "../ui/theme";

/**
 * KrelTV "POV" presentation (an episode opts in with `style: "pov"`; Beep Show uses it).
 *
 * Almost every shot is from somebody's eyes: whoever is talking fills the screen, looking into the lens, with the
 * room soft behind them. A (V.O.) line is the narrator thinking, so the camera shows who he's looking at (not
 * talking, just blinking). Scene headings get a wide establishing shot; stage directions where something physical
 * happens play as little animated sequences (SEQUENCES below) instead of just a subtitle.
 *
 * Close-up art: public/art/tv/face_<NAME>.png, 4 frames of 128x128: 0 neutral, 1 talking, 2 alarmed, 3 blink.
 */

const FACE_NEUTRAL = 0;
const FACE_TALK = 1;
const FACE_ALARM = 2;
const FACE_BLINK = 3;

export interface PovRect {
  SX: number;
  SY: number;
  SW: number;
  SH: number;
}

export interface PovHost {
  /** the set's backdrop texture key for this scene heading (tv_<key>) */
  setTexture(): string;
  /** the small TV sprite for a character (wide shots) */
  spriteFor(name: string): string | null;
}

type Expr = "neutral" | "alarm" | "blink";

/** Directions that name somebody, mapped to their close-up. */
const NAMED: [RegExp, string][] = [
  [/^marc\b/i, "MARC"],
  [/^jez\b/i, "JEZ"],
  [/^simon\b/i, "SIMON"],
  [/^madison\b/i, "MADISON"],
  [/^foster\b/i, "FOSTER"],
  [/^the (chief )?executive\b/i, "YEMENI EXECUTIVE"],
  [/^the official\b/i, "YEMENI OFFICIAL"],
  [/^(an |the )?officer\b/i, "YEMENI OFFICER"],
];
/** Close-up scale per face (the art isn't all framed the same; this keeps heads about the same size). */
const FACE_SCALE: Record<string, number> = { MARC: 2.95, JEZ: 2.8, MADISON: 3.2 };
const faceScale = (name: string) => FACE_SCALE[name] ?? 3.35;

const ALARM_WORDS = /\b(horrif|terror|freez|recoil|drops|appalled|panic|widen|stops chewing|tearful|disgusted|falls|grimac|furious|troubled)/i;

export class PovDirector {
  readonly layer: Phaser.GameObjects.Container;
  private timers: Phaser.Time.TimerEvent[] = [];
  private face: { name: string; spr: Phaser.GameObjects.Sprite; base: number } | null = null;
  private narrator = "MARC";
  /** who the narrator is looking at (what a V.O. line shows) */
  private looking = "";
  /** a sequence's picture stays up through the thoughts that follow it */
  private hold = false;
  /** per-scene look: a swinging interrogation lamp, a rumbling plane */
  private sceneFx: "" | "lamp" | "rumble" = "";
  /** the bedroom scene: we stay tightly on Marc's face */
  private selfShot = "";
  private stabAt: number;
  private idx = 0;
  private wideSprites: Record<string, Phaser.GameObjects.Sprite> = {};

  constructor(
    private sc: Phaser.Scene,
    private r: PovRect,
    private beats: TVBeat[],
    private host: PovHost,
  ) {
    this.layer = sc.add.container(0, 0).setDepth(4);
    const mask = sc.make.graphics({}).fillRect(r.SX, r.SY, r.SW, r.SH);
    this.layer.setMask(mask.createGeometryMask());
    this.stabAt = beats.findIndex((b) => b.type === "direction" && /stabs/i.test(b.action));
  }

  private get gore() {
    return G.meta.settings.gore !== false;
  }

  /** Jez is covered in it from the stabbing on (worked out from the beat, so rewinding/skipping stays right). */
  private bloody(name: string) {
    return name === "JEZ" && this.stabAt >= 0 && this.idx > this.stabAt;
  }

  destroy() {
    this.clear();
    this.layer.destroy();
  }

  // ------------------------------------------------------------------ the beat hook

  /** Show a beat. Returns how long (ms) the picture needs, so the show holds for an animation. */
  beat(b: TVBeat, idx: number): number {
    this.idx = idx;
    switch (b.type) {
      case "shot":
        return this.establish(b.set, b.framing);
      case "titleCard":
        this.clear();
        this.layer.add(this.sc.add.rectangle(this.r.SX, this.r.SY, this.r.SW, this.r.SH, 0x000000).setOrigin(0));
        return 0;
      case "transition":
        if (b.mode === "cut") {
          this.clear();
          this.layer.add(this.sc.add.rectangle(this.r.SX, this.r.SY, this.r.SW, this.r.SH, 0x000000).setOrigin(0));
          return 700;
        }
        return 0;
      case "speaker":
        return this.speak(b.character.toUpperCase(), b.text, b.emotion ?? "");
      case "direction":
        return this.direction(b.action);
      case "sfx":
        if (b.id === "smash") return this.tableSmash();
        if (b.id === "boom") {
          this.sc.cameras.main.flash(260, 255, 240, 200);
          this.sc.cameras.main.shake(500, 0.012);
        }
        return 0;
      default:
        return 0;
    }
  }

  // ------------------------------------------------------------------ building blocks

  private clear() {
    for (const t of this.timers) t.remove();
    this.timers = [];
    for (const o of this.layer.list as Phaser.GameObjects.GameObject[]) this.sc.tweens.killTweensOf(o);
    this.sc.tweens.killTweensOf(this.layer);
    this.layer.removeAll(true);
    this.layer.setPosition(0, 0).setScale(1);
    this.face = null;
    this.wideSprites = {};
  }

  private later(ms: number, fn: () => void) {
    const t = this.sc.time.delayedCall(ms, fn);
    this.timers.push(t);
    return t;
  }

  private every(ms: number, fn: () => void, repeat = -1) {
    const t = this.sc.time.addEvent({ delay: ms, loop: repeat < 0, repeat: repeat < 0 ? undefined : repeat, callback: fn });
    this.timers.push(t);
    return t;
  }

  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.layer.add(o);
    return o;
  }

  private cx() {
    return this.r.SX + this.r.SW / 2;
  }

  private hash(s: string) {
    let h = 0;
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
  }

  /** The set, filling the screen. */
  private backdrop(key = this.host.setTexture(), zoom = 1, ox = 0, oy = 0, blur = false) {
    const { SX, SY, SW, SH } = this.r;
    if (!this.sc.textures.exists(key)) return this.add(this.sc.add.rectangle(SX, SY, SW, SH, 0x222222).setOrigin(0));
    const src = this.sc.textures.get(key).getSourceImage();
    const img = this.add(this.sc.add.image(SX + SW / 2 + ox, SY + SH / 2 + oy, key));
    img.setScale(Math.max(SW / src.width, SH / src.height) * zoom);
    if (blur) {
      try {
        img.preFX?.addBlur(1, 2, 2, 1.1);
      } catch {
        /* canvas renderer: no blur */
      }
    }
    return img;
  }

  /** A drawn effect (Vfx.ts), inside the picture. */
  private fx(key: string, x: number, y: number, o: Parameters<typeof vfx>[4] = {}) {
    const s = vfx(this.sc, key, x, y, o);
    if (s) this.layer.add(s);
    return s;
  }

  private faceKey(name: string) {
    return `tvface_${name.replace(/[^A-Z0-9]+/g, "_")}`;
  }

  hasFace(name: string) {
    return this.sc.textures.exists(this.faceKey(name));
  }

  /**
   * Cut to a POV close-up of `name`: the soft room behind, their face filling the frame. Re-uses the shot if
   * we're already on them.
   */
  private closeUp(name: string, expr: Expr = "neutral", opts: { recut?: boolean; still?: boolean } = {}) {
    if (this.face && this.face.name === name && !opts.recut) {
      this.setExpr(expr);
      return this.face.spr;
    }
    this.clear();
    const { SX, SY, SW, SH } = this.r;
    const h = this.hash(name);
    // the room behind them, close and out of focus (a different bit of it for each person, as if across the room)
    this.backdrop(this.host.setTexture(), 1.9, ((h % 5) - 2) * 70, -30 + ((h >> 3) % 3) * 30, true);
    this.add(this.sc.add.rectangle(SX, SY, SW, SH, 0x000000, 0.18).setOrigin(0));
    if (this.sceneFx === "lamp") this.add(this.sc.add.rectangle(SX, SY, SW, SH, 0x000000, 0.35).setOrigin(0));
    const off = ((h % 7) - 3) * 14;
    const fs = faceScale(name);
    const spr = this.add(this.sc.add.sprite(SX + SW / 2 + off, SY + SH + 10, this.faceKey(name), 0).setOrigin(0.5, 1).setScale(fs));
    this.face = { name, spr, base: FACE_NEUTRAL };
    this.setExpr(expr);
    if (this.bloody(name)) this.spatter(spr);
    if (this.sceneFx === "lamp") this.lamp(spr);
    // the camera's a person: it never quite holds still
    this.sc.tweens.add({ targets: this.layer, y: { from: 4, to: -3 }, x: { from: -2, to: 3 }, duration: 2600 + (h % 900), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    if (this.sceneFx === "rumble") this.every(70, () => this.layer.setPosition(this.layer.x + (Math.random() - 0.5) * 3, this.layer.y + (Math.random() - 0.5) * 3));
    // settle in on the cut
    if (!opts.still) this.sc.tweens.add({ targets: spr, scale: { from: fs * 1.05, to: fs }, duration: 260, ease: "Quad.out" });
    // blinks
    const blink = () => {
      if (!spr.active || !this.face || this.face.spr !== spr) return;
      if (Number(spr.frame.name) === this.face.base && this.face.base !== FACE_ALARM) {
        spr.setFrame(FACE_BLINK);
        this.later(110, () => spr.active && spr.setFrame(this.face?.spr === spr ? this.face.base : 0));
      }
      this.later(1800 + Math.random() * 2600, blink);
    };
    this.later(900 + Math.random() * 1500, blink);
    return spr;
  }

  private setExpr(e: Expr) {
    if (!this.face) return;
    this.face.base = e === "alarm" ? FACE_ALARM : e === "blink" ? FACE_BLINK : FACE_NEUTRAL;
    this.face.spr.setFrame(this.face.base);
  }

  /** Mouth flaps and a head that moves with the words, for as long as the line is being said. */
  private talk(spr: Phaser.GameObjects.Sprite, text: string) {
    const until = this.sc.time.now + beatDuration({ type: "speaker", character: "", text }) * 850;
    const started = this.sc.time.now;
    const flap = () => {
      if (!spr.active || this.face?.spr !== spr) return;
      const talking = this.sc.time.now < until || (voice.busy() && this.sc.time.now - started < 30000);
      if (!talking) {
        spr.setFrame(this.face.base);
        return;
      }
      const open = Number(spr.frame.name) !== FACE_TALK;
      spr.setFrame(open ? FACE_TALK : this.face.base === FACE_ALARM ? FACE_ALARM : FACE_NEUTRAL);
      this.later(open ? 90 + Math.random() * 90 : 70 + Math.random() * 110, flap);
    };
    flap();
    const bob = this.sc.tweens.add({ targets: spr, angle: { from: -1.2, to: 1.4 }, y: `-=${3 + Math.random() * 3}`, duration: 380 + Math.random() * 200, yoyo: true, repeat: 5, ease: "Sine.easeInOut" });
    this.later(Math.max(800, until - this.sc.time.now), () => {
      bob.stop();
      if (spr.active) spr.setAngle(0);
    });
  }

  /** Blood (or, with gore off, soot) on a face. */
  private spatter(spr: Phaser.GameObjects.Sprite) {
    const g = this.add(this.sc.add.graphics());
    const col = this.gore ? 0xa0101a : 0x3a3a3a;
    const rnd = (n: number) => {
      let s = n * 9301 + 49297;
      return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    };
    const r = rnd(7);
    for (let i = 0; i < 26; i++) {
      g.fillStyle(col, 0.75 + r() * 0.25);
      const x = spr.x - 150 + r() * 300;
      const y = spr.y - 380 + r() * 330;
      const s = 3 + r() * 9;
      g.fillRect(x, y, s, s);
      if (r() < 0.4) g.fillRect(x + s * 0.3, y + s, s * 0.4, s * (1 + r() * 2));
    }
  }

  private lamp(face: Phaser.GameObjects.Sprite) {
    const { SX, SY } = this.r;
    const cone = this.add(this.sc.add.triangle(0, 0, 0, 0, -170, 470, 170, 470, 0xfff2b0, 0.16).setOrigin(0.5, 0));
    cone.setPosition(this.cx(), SY - 10).setBlendMode(Phaser.BlendModes.ADD);
    const bulb = this.add(this.sc.add.circle(this.cx(), SY + 6, 9, 0xfff6c8));
    this.sc.tweens.add({ targets: [cone], angle: { from: -14, to: 14 }, duration: 1700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.sc.tweens.add({ targets: bulb, x: { from: this.cx() - 20, to: this.cx() + 20 }, duration: 1700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.sc.tweens.add({ targets: face, alpha: { from: 0.8, to: 1 }, duration: 1700, yoyo: true, repeat: -1 });
    void SX;
  }

  /** Inner-monologue framing: a soft vignette, so you know you're hearing a thought. */
  private vignette() {
    const { SX, SY, SW, SH } = this.r;
    const g = this.add(this.sc.add.graphics());
    for (let i = 0; i < 6; i++) {
      g.lineStyle(14, 0x000000, 0.1);
      g.strokeRect(SX + i * 9, SY + i * 9, SW - i * 18, SH - i * 18);
    }
    return g;
  }

  /** A wide shot of the room, with whoever's in the scene standing in it. */
  private wide(names: string[], key = this.host.setTexture(), y = this.r.SY + this.r.SH - 14) {
    this.clear();
    const { SX, SW } = this.r;
    const bg = this.backdrop(key);
    this.sc.tweens.add({ targets: bg, scale: bg.scale * 1.05, duration: 4000, ease: "Sine.easeOut" });
    const n = names.length;
    names.forEach((nm, i) => {
      const tex = this.host.spriteFor(nm);
      if (!tex || !this.sc.textures.exists(tex)) return;
      const x = SX + SW / 2 + (i - (n - 1) / 2) * Math.min(120, (SW - 120) / Math.max(1, n - 1 || 1));
      const s = this.add(this.sc.add.sprite(x, y, tex, 0).setOrigin(0.5, 1).setScale(4.4));
      if (this.bloody(nm)) s.setTint(this.gore ? 0xff6a6a : 0x9a9a9a);
      this.sc.tweens.add({ targets: s, y: y - 2, duration: 900 + i * 130, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.wideSprites[nm] = s;
    });
    return bg;
  }

  /** Who's in the scene from the start (anyone who arrives by a door or a burst is left out until they do). */
  private sceneCast(from: number) {
    const out: string[] = [];
    let arrivals = false;
    for (let i = from + 1; i < this.beats.length; i++) {
      const b = this.beats[i];
      if (b.type === "shot" || b.type === "titleCard") break;
      if (b.type === "direction" && /\b(enters|bursts in|doorbell|stands outside|opens it|opens the door|step from)/i.test(b.action)) arrivals = true;
      if (b.type === "speaker" && !arrivals) {
        const n = b.character.toUpperCase();
        if (!["PHONE", "GOKU"].includes(n) && !out.includes(n) && b.emotion !== "PHONE") out.push(n);
      }
    }
    return out;
  }

  private lowerThird(text: string) {
    const { SX, SY, SH } = this.r;
    const t = this.add(this.sc.add.text(SX + 18, SY + SH - 78, text, { fontFamily: FONT, fontSize: "14px", color: "#ffffff", backgroundColor: "#000000aa", padding: { x: 8, y: 4 }, fontStyle: "bold" }).setAlpha(0));
    this.sc.tweens.add({ targets: t, alpha: 1, x: SX + 24, duration: 400 });
    this.later(1700, () => this.sc.tweens.add({ targets: t, alpha: 0, duration: 400 }));
  }

  // ------------------------------------------------------------------ beats

  private establish(set: string, framing: string): number {
    this.hold = false;
    this.selfShot = "";
    const up = set.toUpperCase();
    this.sceneFx = up.includes("INTERROGATION") ? "lamp" : up.includes("PLANE") ? "rumble" : "";
    const cast = this.sceneCast(this.idx);
    this.wide(cast.length ? cast : [this.narrator]);
    const place = set.replace(/^(INT|EXT)\.\s*/i, "");
    this.lowerThird(`${place}${framing && framing !== "WIDE" ? ` · ${framing}` : ""}`);
    this.looking = "";
    return 1900;
  }

  private speak(name: string, text: string, emotion: string): number {
    const vo = /^V\.?\s*O\.?$/i.test(emotion);
    if (vo) {
      this.narrator = name;
      if (this.hold) return 0; // the sequence's picture stays up
      const target = this.selfShot || (this.looking && this.looking !== name ? this.looking : "");
      if (target && this.hasFace(target)) {
        const was = this.face?.name;
        this.closeUp(target, this.face?.name === target && this.face.base === FACE_ALARM ? "alarm" : "neutral");
        if (was !== target || !this.layer.list.some((o) => o.getData?.("vignette"))) this.vignette().setData("vignette", true);
        if (target === name && this.selfShot) {
          // his own face, under the duvet: eyes open, saying nothing
          this.duvet();
        }
      }
      return 0;
    }
    this.hold = false;
    if (name === "PHONE") return this.phoneScreen("ROYAL AIR FORCE\nMOBILISATION ALERT", 0xb91c1c, true);
    if (name === "GOKU") return this.gokuWide(text);
    if (!this.hasFace(name)) return 0;
    const alarmed = /\?!|!$/.test(text) && text.length < 70;
    const spr = this.closeUp(name, alarmed ? "alarm" : "neutral");
    if (emotion.toUpperCase().includes("PHONE")) this.callBar(name);
    this.talk(spr, text);
    // whoever the narrator listens to is who his thoughts look at
    if (name !== this.narrator) this.looking = name;
    else if (!this.looking) this.looking = this.lastOther(name);
    return 0;
  }

  private lastOther(name: string) {
    for (let i = this.idx - 1; i >= 0; i--) {
      const b = this.beats[i];
      if (b.type === "shot") break;
      if (b.type === "speaker" && b.character.toUpperCase() !== name && this.hasFace(b.character.toUpperCase())) return b.character.toUpperCase();
    }
    return "";
  }

  private callBar(name: string) {
    const { SX, SY, SW } = this.r;
    this.add(this.sc.add.rectangle(SX, SY, SW, 34, 0x16a34a, 0.9).setOrigin(0));
    this.add(this.sc.add.text(SX + 14, SY + 8, `📞 ${name}  ·  on the phone`, { fontFamily: FONT, fontSize: "14px", color: "#ffffff", fontStyle: "bold" }));
    if (this.face) this.face.spr.setTint(0xd8e8ff);
  }

  private gokuWide(text: string): number {
    if (!this.wideSprites.GOKU) {
      this.wide(["MARC", "GOKU", "JEZ"]);
      (this.wideSprites.GOKU as Phaser.GameObjects.Sprite | undefined)?.setScale(5.2);
    }
    const g = this.wideSprites.GOKU;
    if (!g) return 0;
    this.sc.tweens.add({ targets: g, y: g.y - 8, duration: 160, yoyo: true, repeat: 3 });
    const until = this.sc.time.now + beatDuration({ type: "speaker", character: "", text }) * 800;
    const flap = () => {
      if (!g.active) return;
      if (this.sc.time.now > until && !voice.busy()) return g.setFrame(0);
      g.setFrame(Number(g.frame.name) === 0 ? 1 : 0);
      this.later(140, flap);
    };
    flap();
    return 0;
  }

  // ------------------------------------------------------------------ directions

  private direction(a: string): number {
    for (const [re, fn] of this.sequences()) {
      if (re.test(a)) {
        const ms = fn(a);
        this.hold = true;
        return ms;
      }
    }
    // somebody named reacting: cut to their face
    for (const [re, who] of NAMED) {
      if (re.test(a) && this.hasFace(who)) {
        this.hold = false;
        const spr = this.closeUp(who, ALARM_WORDS.test(a) ? "alarm" : "neutral");
        if (/\bstares?\b|looks directly|swallows|thinks|just stares/i.test(a)) this.sc.tweens.add({ targets: spr, scale: faceScale(who) * 1.08, duration: 1600, ease: "Sine.easeInOut" });
        if (/swallows/i.test(a)) synth.play("gulp");
        if (/glows|brightens/i.test(a)) {
          spr.setTint(0xfff0a0);
          this.sc.tweens.add({ targets: spr, alpha: { from: 0.85, to: 1 }, duration: 300, yoyo: true, repeat: 3 });
        }
        if (/closes his eyes/i.test(a)) this.setExpr("blink");
        if (/falls/i.test(a)) spr.setTint(0xb8c8ff);
        if (who !== this.narrator) this.looking = who;
        return 900;
      }
    }
    return 0;
  }

  private sequences(): [RegExp, (a: string) => number][] {
    return [
      [/opens the door\. SOPHIE/i, () => this.doorReveal("SIMON")],
      [/bursts in/i, () => this.burstIn("JEZ")],
      [/MADISON enters/, () => this.doorReveal("MADISON")],
      [/GOKU stands outside/, () => this.doorRevealGoku()],
      [/She waves/i, () => this.wave("MADISON")],
      [/slides over a figure/i, () => this.figure()],
      [/sits opposite FOSTER/i, () => this.closeUpFor("FOSTER", "neutral")],
      [/Marc and Simon drink wine/i, () => this.closeUpFor("SIMON", "neutral")],
      [/seizes Jez/i, () => this.whip("JEZ")],
      [/dinosaur stickers on her phone/i, () => this.stickers()],
      [/Simon kisses him/i, () => this.kiss()],
      [/Clothes on floor/i, () => this.clothes()],
      [/tightly on MARC'S FACE/i, () => this.underDuvet()],
      [/grips the sheets/i, () => this.gripSheets()],
      [/lies rigidly beside/i, () => this.inBed()],
      [/Phone rings/i, () => this.phoneScreen("FOSTER\nincoming call…", 0x16a34a, false)],
      [/Capri-Sun/i, () => this.capriSun()],
      [/Lightbulb/i, () => this.lightbulb()],
      [/looks at Simon\. Then Jez\. Then Madison/i, () => this.quickCuts(["SIMON", "JEZ", "MADISON"])],
      [/step from a taxi/i, () => this.taxi()],
      [/deal is going brilliantly/i, () => this.boardroomWide()],
      [/executives exchange looks/i, () => this.exchangeLooks()],
      [/SECURITY MEN enter/i, () => this.securityEnter()],
      [/guards grab Marc/i, () => this.grab("MARC")],
      [/Security men grab Jez/i, () => this.grab("JEZ")],
      [/phones start vibrating/i, () => this.phonesBuzz()],
      [/RAF phone goes off/i, () => this.phoneScreen("RAF\n✈ ALERT ✈", 0x1d4ed8, true)],
      [/DAMBUSTERS/i, () => this.march()],
      [/announces electronically/i, () => this.phoneScreen("ROYAL AIR FORCE\nMOBILISATION ALERT", 0xb91c1c, true)],
      [/Everyone turns to the four/i, () => this.boardroomWide(true)],
      [/Jez panics/i, () => this.panic("JEZ")],
      [/Madison grabs his arm/i, () => this.closeUpFor("MADISON", "alarm")],
      [/Jez looks at her\. Then at the Yemenis/i, () => this.quickCuts(["MADISON", "YEMENI EXECUTIVE", "MADISON"])],
      [/ceremonial dagger/i, () => this.dagger()],
      [/frantic struggle/i, () => this.stabbing()],
      [/Security tackles Jez/i, () => this.tackle()],
      [/sit together\. Jez is blood/i, () => this.cell()],
      [/An OFFICER enters/i, () => this.officerEnters()],
      [/sits opposite a Yemeni official/i, () => this.interrogation()],
      [/through the glass at Simon/i, () => this.throughGlass()],
      [/deported in a prisoner exchange/i, () => this.plane()],
      [/Simon turns away/i, () => this.turnAway("SIMON")],
      [/Jez leans toward/i, () => this.lean("JEZ")],
      [/Marc enters carrying shopping/i, () => this.shopping()],
      [/Jez jumps up/i, () => this.jumpUp("JEZ")],
      [/opens Marc's fridge/i, () => this.fridge()],
      [/entire roast chicken/i, () => this.chicken()],
      [/devours it/i, () => this.devour()],
      [/building suddenly SHAKES/i, () => this.explosion(false)],
      [/Another colossal explosion/i, () => this.explosion(true)],
      [/Goku smiles|Goku grins/i, () => this.gokuGrin()],
    ];
  }

  // ------------------------------------------------------------------ sequences

  private closeUpFor(name: string, e: Expr) {
    this.closeUp(name, e);
    if (name !== this.narrator) this.looking = name;
    return 1000;
  }

  /** A door (the POV is the person opening it) swings away to reveal a face. */
  private doorReveal(name: string) {
    this.closeUp(name, "neutral", { recut: true, still: true });
    this.looking = name;
    const { SX, SY, SW, SH } = this.r;
    const door = this.add(this.sc.add.container(SX, SY));
    door.add(this.sc.add.rectangle(0, 0, SW, SH, 0x6b3f1f).setOrigin(0));
    door.add(this.sc.add.rectangle(40, 40, SW - 80, SH / 2 - 60, 0x5a3418).setOrigin(0).setStrokeStyle(4, 0x47280f));
    door.add(this.sc.add.rectangle(40, SH / 2 + 20, SW - 80, SH / 2 - 60, 0x5a3418).setOrigin(0).setStrokeStyle(4, 0x47280f));
    door.add(this.sc.add.circle(SW - 60, SH / 2, 14, 0xd4a017));
    synth.play("door");
    this.sc.tweens.add({ targets: door, scaleX: 0, duration: 750, delay: 250, ease: "Quad.in" });
    return 1500;
  }

  private doorRevealGoku() {
    this.clear();
    const { SX, SY, SW, SH } = this.r;
    this.add(this.sc.add.rectangle(SX, SY, SW, SH, 0x2a2018).setOrigin(0));
    this.add(this.sc.add.rectangle(SX + 140, SY + 20, SW - 280, SH - 20, 0x9fd0ff).setOrigin(0));
    this.add(this.sc.add.rectangle(SX + 140, SY + SH - 70, SW - 280, 70, 0x6b7280).setOrigin(0));
    const tex = this.host.spriteFor("GOKU");
    if (tex) {
      const g = this.add(this.sc.add.sprite(this.cx(), SY + SH + 6, tex, 0).setOrigin(0.5, 1).setScale(9));
      this.wideSprites.GOKU = g;
      this.sc.tweens.add({ targets: g, y: g.y - 6, duration: 500, yoyo: true, repeat: -1 });
    }
    const door = this.add(this.sc.add.rectangle(SX + 140, SY + 20, SW - 280, SH - 20, 0x6b3f1f).setOrigin(0));
    synth.play("door");
    this.sc.tweens.add({ targets: door, scaleX: 0, duration: 650, delay: 200, ease: "Quad.in" });
    return 1500;
  }

  private burstIn(name: string) {
    const spr = this.closeUp(name, "neutral", { recut: true, still: true });
    this.looking = name;
    spr.setScale(1.2).setAlpha(0.2);
    this.sc.tweens.add({ targets: spr, scale: faceScale(name), alpha: 1, duration: 420, ease: "Back.out" });
    synth.play("door");
    this.later(300, () => this.sc.cameras.main.shake(260, 0.01));
    return 1000;
  }

  private wave(name: string) {
    const spr = this.closeUp(name, "neutral");
    const hand = this.add(this.sc.add.text(spr.x + 140, spr.y - 170, "👋", { fontSize: "86px" }).setOrigin(0.5, 1));
    this.sc.tweens.add({ targets: hand, angle: { from: -22, to: 22 }, duration: 220, yoyo: true, repeat: 4 });
    return 1300;
  }

  private figure() {
    this.clear();
    const { SX, SY, SW, SH } = this.r;
    this.backdrop("tv_boardroom", 1.9, 0, 40, true);
    const paper = this.add(this.sc.add.container(this.cx(), SY - 200));
    paper.add(this.sc.add.rectangle(0, 0, 300, 220, 0xf8f4e8).setStrokeStyle(2, 0xcfc6b0));
    paper.add(this.sc.add.text(0, -60, "CONFIDENTIAL", { fontFamily: FONT, fontSize: "14px", color: "#9a2020", fontStyle: "bold" }).setOrigin(0.5));
    paper.add(this.sc.add.text(0, 5, "£1,800,000", { fontFamily: FONT, fontSize: "38px", color: "#111111", fontStyle: "bold" }).setOrigin(0.5));
    paper.add(this.sc.add.text(0, 60, "(potentially)", { fontFamily: FONT, fontSize: "13px", color: "#555555" }).setOrigin(0.5));
    paper.setAngle(-6);
    this.sc.tweens.add({ targets: paper, y: SY + SH / 2, angle: 2, duration: 700, ease: "Quad.out" });
    this.later(900, () => {
      synth.play("coin");
      this.sc.tweens.add({ targets: paper, scale: 1.25, duration: 1200, ease: "Sine.easeInOut" });
    });
    void SW;
    return 2200;
  }

  /** A whip-pan: the room smears sideways and we land on somebody else. */
  private whip(name: string) {
    const { SX, SY, SW, SH } = this.r;
    const streaks = this.sc.add.graphics().setDepth(4);
    this.layer.add(streaks);
    for (let i = 0; i < 40; i++) {
      streaks.fillStyle([0xffffff, 0xd6c49a, 0x6b5b4b][i % 3], 0.35);
      streaks.fillRect(SX + Math.random() * SW, SY + Math.random() * SH, 120 + Math.random() * 200, 3 + Math.random() * 6);
    }
    this.sc.tweens.add({ targets: this.layer, x: -260, duration: 180, ease: "Quad.in" });
    synth.play("swing");
    this.later(200, () => {
      this.closeUp(name, "alarm", { recut: true });
      this.layer.x = 200;
      this.sc.tweens.add({ targets: this.layer, x: 0, duration: 200, ease: "Quad.out" });
    });
    this.looking = name;
    return 1000;
  }

  private phone(x: number, y: number, scale = 1) {
    const c = this.add(this.sc.add.container(x, y).setScale(scale));
    c.add(this.sc.add.rectangle(0, 0, 150, 280, 0x111111).setStrokeStyle(4, 0x444444));
    const screen = this.sc.add.rectangle(0, -6, 132, 236, 0x1f2a44);
    c.add(screen);
    c.add(this.sc.add.circle(0, 128, 6, 0x333333));
    return { c, screen };
  }

  private stickers() {
    this.clear();
    this.backdrop(undefined, 1.9, -120, 30, true);
    const { c } = this.phone(this.cx(), this.r.SY + this.r.SH / 2 + 10, 1.2);
    const stick = ["🦕", "🦖", "🦕", "🦖", "🦕"];
    stick.forEach((s, i) =>
      this.later(250 + i * 260, () => {
        const t = this.sc.add.text(-40 + (i % 2) * 70, -90 + i * 45, s, { fontSize: "36px" }).setOrigin(0.5).setAngle(-15 + Math.random() * 30).setScale(0);
        c.add(t);
        this.sc.tweens.add({ targets: t, scale: 1, duration: 180, ease: "Back.out" });
        synth.play("pop");
      }),
    );
    // Marc recoils
    this.later(1800, () => {
      this.sc.cameras.main.shake(220, 0.008);
      this.sc.tweens.add({ targets: this.layer, scale: 0.85, x: 70, y: 30, duration: 220, ease: "Quad.out" });
    });
    return 2500;
  }

  private kiss() {
    const spr = this.closeUp("SIMON", "blink", { recut: true });
    this.sc.tweens.add({ targets: spr, scale: 7, y: spr.y + 380, duration: 1400, ease: "Quad.in" });
    const { SX, SY, SW, SH } = this.r;
    const black = this.add(this.sc.add.rectangle(SX, SY, SW, SH, 0x000000).setOrigin(0).setAlpha(0));
    this.sc.tweens.add({ targets: black, alpha: 1, duration: 500, delay: 1100 });
    this.later(700, () => {
      const h = this.add(this.sc.add.text(this.cx(), SY + 120, "❤", { fontSize: "60px", color: "#ff4f8a" }).setOrigin(0.5));
      this.sc.tweens.add({ targets: h, y: SY + 40, alpha: 0, duration: 900 });
    });
    return 1800;
  }

  private clothes() {
    const { SX, SY, SW, SH } = this.r;
    this.wide([]);
    const items = [0x1f3a8a, 0x111111, 0xb3202a, 0x6b8f3a, 0xdddddd];
    items.forEach((c, i) => {
      const r = this.add(this.sc.add.rectangle(SX + 80 + i * 95, SY - 40, 70, 40, c).setAngle(Math.random() * 60 - 30));
      this.sc.tweens.add({ targets: r, y: SY + SH - 40 - (i % 2) * 14, angle: Math.random() * 90 - 45, duration: 700 + i * 120, delay: i * 140, ease: "Bounce.out" });
    });
    void SW;
    return 1800;
  }

  private duvet() {
    const { SX, SY, SW, SH } = this.r;
    if (this.layer.list.some((o) => o.getData?.("duvet"))) return;
    const d = this.add(this.sc.add.rectangle(SX, SY + SH, SW, SH * 0.3, 0xdfe8f5).setOrigin(0, 1).setData("duvet", true));
    const g = this.add(this.sc.add.graphics().setData("duvet", true));
    g.lineStyle(3, 0xb9c6da, 1);
    for (let i = 0; i < 5; i++) g.lineBetween(SX + i * 130, SY + SH * 0.75 + (i % 2) * 14, SX + i * 130 + 110, SY + SH * 0.79);
    void d;
  }

  /** "We stay tightly on MARC'S FACE as he disappears partly beneath the duvet." */
  private underDuvet() {
    this.selfShot = "MARC";
    const spr = this.closeUp("MARC", "neutral", { recut: true });
    this.sc.tweens.add({ targets: spr, y: spr.y + 12, duration: 1500, ease: "Sine.easeInOut" });
    this.duvet();
    this.vignette().setData("vignette", true);
    return 1800;
  }

  private gripSheets() {
    this.sc.cameras.main.shake(400, 0.006);
    if (this.face?.name === "MARC") this.setExpr("alarm");
    return 800;
  }

  private inBed() {
    this.selfShot = "";
    this.clear();
    const { SX, SY, SW, SH } = this.r;
    this.add(this.sc.add.rectangle(SX, SY, SW, SH, 0xe9eef7).setOrigin(0));
    this.add(this.sc.add.ellipse(SX + SW * 0.3, SY + SH * 0.4, 230, 130, 0xffffff));
    this.add(this.sc.add.ellipse(SX + SW * 0.7, SY + SH * 0.4, 230, 130, 0xffffff));
    // seen from above: two heads on two pillows, the duvet up to their chins
    const m = this.add(this.sc.add.sprite(SX + SW * 0.3, SY + SH * 0.62, this.faceKey("MARC"), FACE_ALARM).setOrigin(0.5, 1).setScale(1.9).setAngle(-6));
    const s = this.add(this.sc.add.sprite(SX + SW * 0.7, SY + SH * 0.62, this.faceKey("SIMON"), FACE_BLINK).setOrigin(0.5, 1).setScale(1.9).setAngle(8));
    this.add(this.sc.add.rectangle(SX, SY + SH * 0.5, SW, SH * 0.5, 0xb9c6da).setOrigin(0));
    const g = this.add(this.sc.add.graphics());
    g.lineStyle(3, 0x9aa8be, 1);
    for (let i = 0; i < 6; i++) g.lineBetween(SX + i * 100, SY + SH * 0.6 + (i % 2) * 20, SX + i * 100 + 80, SY + SH * 0.66);
    // Simon sleeps soundly; Marc does not blink
    this.sc.tweens.add({ targets: s, y: s.y + 3, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    void m;
    return 2000;
  }

  private phoneScreen(label: string, col: number, alarm: boolean) {
    this.clear();
    this.backdrop(undefined, 1.9, 80, 20, true);
    const { c, screen } = this.phone(this.cx(), this.r.SY + this.r.SH / 2 + 10, 1.25);
    screen.setFillStyle(col);
    c.add(this.sc.add.text(0, -20, label, { fontFamily: FONT, fontSize: "15px", color: "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: 120 } }).setOrigin(0.5));
    if (label.startsWith("RAF")) {
      c.add(this.sc.add.circle(0, 60, 26, 0x1d4ed8));
      c.add(this.sc.add.circle(0, 60, 17, 0xffffff));
      c.add(this.sc.add.circle(0, 60, 9, 0xdc2626));
    }
    this.every(60, () => (c.x = this.cx() + (Math.random() - 0.5) * 8));
    if (alarm) this.every(300, () => screen.setFillStyle(screen.fillColor === col ? 0x000000 : col));
    synth.play(alarm ? "alarm" : "notify");
    return 1500;
  }

  private capriSun() {
    const spr = this.closeUp("MADISON", "neutral", { recut: true });
    this.looking = "MADISON";
    const pouch = this.add(this.sc.add.container(spr.x + 60, spr.y - 70));
    pouch.add(this.sc.add.rectangle(0, 0, 80, 120, 0xc0c8d0).setStrokeStyle(3, 0x8a929e));
    pouch.add(this.sc.add.rectangle(0, 10, 60, 40, 0xf59e0b));
    pouch.add(this.sc.add.rectangle(-18, -90, 6, 70, 0xffffff).setAngle(-12));
    this.sc.tweens.add({ targets: pouch, scaleX: { from: 1, to: 0.9 }, duration: 260, yoyo: true, repeat: 4 });
    this.later(300, () => synth.play("slurp"));
    return 1900;
  }

  private lightbulb() {
    const spr = this.closeUp("MARC", "alarm", { recut: true });
    const b = this.add(this.sc.add.text(spr.x + 170, this.r.SY + 90, "💡", { fontSize: "72px" }).setOrigin(0.5).setScale(0));
    this.sc.tweens.add({ targets: b, scale: 1, duration: 300, ease: "Back.out" });
    this.sc.cameras.main.flash(160, 255, 255, 200);
    synth.play("ding");
    return 1300;
  }

  private quickCuts(names: string[]) {
    names.forEach((n, i) => this.later(i * 520, () => this.closeUp(n, "neutral", { recut: true })));
    this.looking = names[names.length - 1];
    return names.length * 520 + 300;
  }

  private walkIn(nm: string, x0: number, x1: number, y: number, delay: number) {
    const tex = this.host.spriteFor(nm);
    if (!tex) return null;
    const s = this.add(this.sc.add.sprite(x0, y, tex, 0).setOrigin(0.5, 1).setScale(4.4).setAlpha(0));
    this.later(delay, () => {
      s.setAlpha(1);
      this.sc.tweens.add({ targets: s, x: x1, duration: 700, ease: "Sine.easeOut" });
      this.sc.tweens.add({ targets: s, y: y - 6, duration: 120, yoyo: true, repeat: 2 });
    });
    this.wideSprites[nm] = s;
    return s;
  }

  /** EXT. SANA'A: the taxi pulls up in a cloud of dust and the four of them climb out. */
  private taxi() {
    this.wide([]);
    const { SX, SY, SW, SH } = this.r;
    const ground = SY + SH - 34;
    const key = this.sc.textures.exists("tv_taxi") ? "tv_taxi" : null;
    const car = key
      ? this.add(this.sc.add.image(SX - 160, ground, key).setOrigin(0.5, 1).setScale(2.6))
      : this.add(this.sc.add.rectangle(SX - 160, ground, 280, 110, 0xf2d24b).setOrigin(0.5, 1));
    const stopX = SX + SW * 0.3;
    this.sc.tweens.add({ targets: car, x: stopX, duration: 1100, ease: "Quad.out" });
    this.every(130, () => {
      if (car.active && car.x < stopX - 4) this.fx("vfx_dust", car.x - 140, ground, { scale: 1.6 });
    }, 8);
    this.later(1100, () => {
      synth.play("door");
      ["MARC", "SIMON", "JEZ", "MADISON"].forEach((nm, i) => this.walkIn(nm, stopX + 30, SX + SW * 0.48 + i * 75, ground + 14, 200 + i * 300));
    });
    this.later(2700, () => {
      this.layer.bringToTop(car);
      this.sc.tweens.add({ targets: car, x: SX + SW + 220, duration: 1000, ease: "Quad.in" });
      this.fx("vfx_dust", stopX, ground, { scale: 2.2 });
    });
    return 4000;
  }

  private boardroomWide(turn = false) {
    const { SX, SY, SH } = this.r;
    this.wide(["MARC", "SIMON", "JEZ", "MADISON"], "tv_boardroom", SY + SH - 20);
    const bg = this.layer.list[0];
    const tex = this.host.spriteFor("YEMENI EXECUTIVE");
    for (let i = 0; tex && i < 3; i++) {
      const s = this.add(this.sc.add.sprite(SX + 110 + i * 170, SY + SH - 150, tex, 0).setOrigin(0.5, 1).setScale(3.2).setTint(0xdddddd));
      // across the table, behind our lot
      this.layer.moveAbove(s as never, bg as never);
      if (turn) this.later(300 + i * 200, () => s.setFlipX(i % 2 === 0));
    }
    return 1500;
  }

  private exchangeLooks() {
    const spr = this.closeUp("YEMENI EXECUTIVE", "neutral", { recut: true });
    this.later(400, () => spr.setFlipX(true));
    this.later(900, () => spr.setFlipX(false));
    return 1400;
  }

  private securityEnter() {
    this.boardroomWide();
    const { SX, SW, SY, SH } = this.r;
    for (let i = 0; i < 2; i++) this.walkIn("YEMENI OFFICER", SX + SW + 60, SX + SW - 70 - i * 70, SY + SH - 10, 100 + i * 250);
    synth.play("door");
    return 1800;
  }

  /** Hands come in from either side of the frame and grab whoever we're looking at. */
  private grab(name: string) {
    const spr = this.closeUp(name, "alarm", { recut: true });
    const { SX, SW } = this.r;
    const { SY, SH } = this.r;
    for (const side of [-1, 1]) {
      // a uniformed arm from below the frame, a hand clamping on the shoulder
      const arm = this.add(this.sc.add.container(spr.x + side * 330, SY + SH + 160).setAngle(side * -35));
      arm.add(this.sc.add.rectangle(0, 60, 80, 240, 0x1f2937).setStrokeStyle(3, 0x0f172a));
      arm.add(this.sc.add.rectangle(0, -64, 86, 16, 0x0f172a));
      arm.add(this.sc.add.ellipse(0, -100, 92, 74, 0x8d5a3b).setStrokeStyle(3, 0x5a3a20));
      for (let f = 0; f < 4; f++) arm.add(this.sc.add.rectangle(-30 + f * 20, -140, 15, 34, 0x8d5a3b).setStrokeStyle(2, 0x5a3a20));
      this.sc.tweens.add({ targets: arm, x: spr.x + side * 210, y: SY + SH + 50, duration: 280, ease: "Back.out", delay: 150 });
    }
    void SX;
    void SW;
    this.later(420, () => {
      this.sc.cameras.main.shake(300, 0.012);
      synth.play("punch");
      this.sc.tweens.add({ targets: spr, x: spr.x + 12, duration: 50, yoyo: true, repeat: 5 });
    });
    return 1300;
  }

  private phonesBuzz() {
    this.boardroomWide();
    const { SX, SW, SY, SH } = this.r;
    for (let i = 0; i < 6; i++) {
      const p = this.add(this.sc.add.text(SX + 60 + i * ((SW - 120) / 5), SY + SH - 200 + (i % 2) * 30, "📱", { fontSize: "34px" }).setOrigin(0.5));
      this.every(50, () => p.setAngle((Math.random() - 0.5) * 24), 40);
    }
    synth.play("notify");
    this.later(1300, () => {
      this.closeUp("YEMENI EXECUTIVE", "alarm", { recut: true });
      this.looking = "YEMENI EXECUTIVE";
    });
    return 2300;
  }

  private march() {
    if (this.face) this.setExpr("blink");
    const { SX, SY, SW, SH } = this.r;
    for (let i = 0; i < 10; i++) {
      const n = this.add(this.sc.add.text(SX - 30, SY + 60 + ((i * 53) % (SH - 120)), i % 2 ? "♪" : "♫", { fontFamily: FONT, fontSize: "36px", color: "#ffd23f", fontStyle: "bold" }).setShadow(2, 2, "#000", 0));
      this.sc.tweens.add({ targets: n, x: SX + SW + 40, y: n.y - 30, duration: 2000, delay: i * 150 });
    }
    synth.play("trombone");
    return 1800;
  }

  private panic(name: string) {
    const spr = this.closeUp(name, "alarm", { recut: true });
    for (let i = 0; i < 3; i++) {
      const d = this.add(this.sc.add.text(spr.x + (i - 1) * 120, spr.y - 340, "💦", { fontSize: "40px" }).setOrigin(0.5).setAlpha(0));
      this.sc.tweens.add({ targets: d, alpha: 1, y: d.y + 40, duration: 500, delay: i * 200, yoyo: true });
    }
    this.sc.tweens.add({ targets: spr, x: spr.x + 6, duration: 40, yoyo: true, repeat: 12 });
    return 1100;
  }

  private dagger() {
    this.clear();
    const { SX, SY, SW, SH } = this.r;
    this.backdrop("tv_boardroom", 1.9, 0, 40, true);
    const d = this.add(this.sc.add.container(this.cx(), SY + SH + 160).setAngle(20));
    d.add(this.sc.add.rectangle(0, 60, 26, 110, 0x6b3f1f).setStrokeStyle(2, 0x3b2a1a));
    d.add(this.sc.add.rectangle(0, 0, 80, 16, 0xd4a017));
    const blade = this.sc.add.graphics();
    blade.fillStyle(0xd8dde4, 1);
    blade.fillTriangle(-14, -8, 14, -8, 30, -170);
    blade.fillStyle(0xffffff, 0.6);
    blade.fillTriangle(0, -8, 14, -8, 30, -170);
    d.add(blade);
    this.sc.tweens.add({ targets: d, y: SY + SH / 2 + 60, angle: -10, duration: 600, ease: "Back.out" });
    this.later(650, () => {
      synth.play("swing");
      const glint = this.add(this.sc.add.text(this.cx() + 30, SY + SH / 2 - 100, "✦", { fontSize: "48px", color: "#ffffff" }).setOrigin(0.5).setScale(0));
      this.sc.tweens.add({ targets: glint, scale: 1.3, angle: 90, duration: 250, yoyo: true });
    });
    void SW;
    return 1500;
  }

  /** [SFX smash]: the conference table goes over. */
  private tableSmash() {
    this.boardroomWide();
    const { SX, SY, SW, SH } = this.r;
    this.sc.cameras.main.flash(120, 255, 255, 255);
    this.sc.cameras.main.shake(450, 0.02);
    for (let i = 0; i < 18; i++) {
      const s = this.add(this.sc.add.rectangle(this.cx() + (Math.random() - 0.5) * 120, SY + SH - 110, 10 + Math.random() * 26, 5 + Math.random() * 8, Math.random() < 0.5 ? 0x5a3a20 : 0x3b2a1a));
      this.sc.tweens.add({ targets: s, x: s.x + (Math.random() - 0.5) * SW, y: s.y - 80 - Math.random() * 180, angle: Math.random() * 720, duration: 500, ease: "Quad.out", yoyo: true, hold: 0 });
    }
    this.fx("vfx_dust", this.cx(), SY + SH - 90, { scale: 3 });
    void SX;
    return 900;
  }

  /**
   * The stabbing: an obscured, frantic struggle behind several horrified businessmen. Cartoon violence: stab
   * flashes and blood splats (or, with gore off, dust clouds and stars), then Madison slumps behind the table.
   */
  private stabbing() {
    this.clear();
    const { SX, SY, SW, SH } = this.r;
    const gore = this.gore;
    this.backdrop("tv_boardroom");
    const fy = SY + SH - 130;
    const jez = this.host.spriteFor("JEZ");
    const mad = this.host.spriteFor("MADISON");
    const J = jez ? this.add(this.sc.add.sprite(this.cx() - 30, fy, jez, 3).setOrigin(0.5, 1).setScale(3.6)) : null;
    const M = mad ? this.add(this.sc.add.sprite(this.cx() + 30, fy, mad, 0).setOrigin(0.5, 1).setScale(3.6)) : null;
    // the table (with a modesty panel: Madison ends up behind it)
    this.add(this.sc.add.rectangle(SX, fy - 40, SW, 120, 0x3b2a1a).setOrigin(0));
    this.add(this.sc.add.rectangle(SX, fy + 20, SW, 60, 0x2a1d12).setOrigin(0));
    this.add(this.sc.add.rectangle(SX, fy - 40, SW, 6, 0x6b4527).setOrigin(0));
    // three horrified businessmen in the foreground, mostly in the way
    const execTex = this.host.spriteFor("YEMENI EXECUTIVE");
    const men: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < 3; i++) {
      if (!execTex) break;
      const m = this.add(this.sc.add.sprite(SX + 90 + i * 190, SY + SH + 24, execTex, 5).setOrigin(0.5, 1).setScale(7).setTint(0x8a8a9a));
      men.push(m);
    }
    const hit = { x: this.cx(), y: fy - 120 };
    const fx = (key: string, x: number, y: number, s: number) => {
      const o = this.fx(key, x, y, { scale: s });
      // in front of the struggle, behind the businessmen
      if (o && men[0]) this.layer.moveBelow(o as never, men[0] as never);
      return o;
    };
    const n = 9;
    for (let i = 0; i < n; i++) {
      this.later(300 + i * 260, () => {
        if (J) J.setFrame(i % 2 ? 3 : 1).setX(this.cx() - 30 + (Math.random() - 0.5) * 16);
        if (M) M.setX(this.cx() + 30 + (Math.random() - 0.5) * 16).setAngle((Math.random() - 0.5) * 14);
        fx("vfx_hit", hit.x + (Math.random() - 0.5) * 40, hit.y + (Math.random() - 0.5) * 40, 2.2);
        if (gore) {
          fx(i % 3 ? "vfx_blood" : "vfx_bloodspray", hit.x + (Math.random() - 0.5) * 80, hit.y - 20, 1.6);
          // splats on the wall and the backs of the businessmen's heads
          const sx = SX + 40 + Math.random() * (SW - 80);
          const sy = SY + 40 + Math.random() * (SH * 0.45);
          const sp = this.sc.textures.exists("fx_splat_white") ? this.sc.add.image(sx, sy, "fx_splat_white") : this.sc.add.circle(sx, sy, 22, 0xffffff);
          sp.setScale(0.35 + Math.random() * 0.4).setRotation(Math.random() * 6.28);
          (sp as Phaser.GameObjects.Image).setTint?.(0xa0101a);
          if (sp instanceof Phaser.GameObjects.Arc) sp.setFillStyle(0xa0101a);
          this.layer.add(sp);
          if (J ?? men[0]) this.layer.moveBelow(sp as never, (J ?? men[0]) as never);
          synth.play("splat");
        } else {
          fx("vfx_dust", hit.x + (Math.random() - 0.5) * 120, hit.y + 10, 2.4);
          fx("vfx_stars", hit.x + (Math.random() - 0.5) * 60, hit.y - 60, 2);
          const pow = this.add(this.sc.add.text(hit.x + (Math.random() - 0.5) * 220, hit.y - 20 + (Math.random() - 0.5) * 60, ["BIFF!", "POW!", "THWACK!", "OOF!"][i % 4], { fontFamily: FONT, fontSize: "26px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5).setShadow(3, 3, "#000", 0).setAngle((Math.random() - 0.5) * 30));
          if (men[0]) this.layer.moveBelow(pow as never, men[0] as never);
          this.later(400, () => pow.destroy());
          synth.play("punch");
        }
        this.sc.cameras.main.shake(120, 0.006);
        // the businessmen flinch
        for (const m of men) this.sc.tweens.add({ targets: m, y: SY + SH + 24 - 10 - Math.random() * 12, duration: 70, yoyo: true });
      });
    }
    // Madison slumps behind the table; Jez stands, covered in it
    const end = 300 + n * 260;
    this.later(end, () => {
      if (M) this.sc.tweens.add({ targets: M, angle: 80, y: fy + 30, x: M.x + 40, duration: 700, ease: "Quad.in" });
      if (J) {
        J.setFrame(0).setX(this.cx() - 30);
        J.setTint(gore ? 0xff8080 : 0xa0a0a0);
        this.sc.tweens.add({ targets: J, y: fy - 10, duration: 500, delay: 600 });
      }
      for (const m of men) m.setTint(0x6a6a7a);
    });
    return end + 1600;
  }

  private tackle() {
    const { SX, SY, SW, SH } = this.r;
    this.wide([], "tv_boardroom");
    const y = SY + SH - 40;
    const jez = this.host.spriteFor("JEZ");
    const J = jez ? this.add(this.sc.add.sprite(this.cx(), y, jez, 0).setOrigin(0.5, 1).setScale(4.4).setTint(this.gore ? 0xff8080 : 0xa0a0a0)) : null;
    const offTex = this.host.spriteFor("YEMENI OFFICER");
    for (const side of [-1, 1]) {
      if (!offTex) break;
      const o = this.add(this.sc.add.sprite(side < 0 ? SX - 60 : SX + SW + 60, y, offTex, 3).setOrigin(0.5, 1).setScale(4.4).setFlipX(side > 0));
      this.sc.tweens.add({ targets: o, x: this.cx() + side * 30, duration: 450, ease: "Quad.in" });
    }
    this.later(460, () => {
      if (J) this.sc.tweens.add({ targets: J, angle: 90, y: y - 10, duration: 200 });
      this.fx("vfx_dust", this.cx(), y, { scale: 3 });
      this.fx("vfx_stars", this.cx(), y - 80, { scale: 2.5 });
      this.sc.cameras.main.shake(300, 0.015);
      synth.play("punch_big");
    });
    return 1700;
  }

  /** INT. YEMENI POLICE CELL: the three of them on the bench, and the bars slam down. */
  private cell() {
    const { SX, SY, SW, SH } = this.r;
    this.wide(["MARC", "SIMON", "JEZ"], "tv_cell");
    const g = this.add(this.sc.add.graphics());
    g.fillStyle(0x111827, 1);
    for (let x = SX + 20; x < SX + SW; x += 56) g.fillRect(x, SY, 12, SH);
    g.fillRect(SX, SY + 60, SW, 12);
    g.y = -SH;
    this.sc.tweens.add({ targets: g, y: 0, duration: 380, delay: 500, ease: "Bounce.out" });
    this.later(620, () => {
      synth.play("smash");
      this.sc.cameras.main.shake(280, 0.012);
    });
    return 2000;
  }

  private officerEnters() {
    const spr = this.closeUp("YEMENI OFFICER", "neutral", { recut: true, still: true });
    this.looking = "YEMENI OFFICER";
    spr.setX(spr.x + 400);
    this.sc.tweens.add({ targets: spr, x: spr.x - 400, duration: 600, ease: "Quad.out" });
    synth.play("door");
    return 1000;
  }

  /** INT. INTERROGATION ROOM: one swinging lamp, one official. */
  private interrogation() {
    this.sceneFx = "lamp";
    this.closeUp("YEMENI OFFICIAL", "neutral", { recut: true });
    this.looking = "YEMENI OFFICIAL";
    return 2000;
  }

  private throughGlass() {
    const spr = this.closeUp("SIMON", "neutral", { recut: true });
    spr.setTint(0x9fb8d8).setAlpha(0.85);
    const { SX, SY, SW, SH } = this.r;
    const g = this.add(this.sc.add.graphics());
    g.fillStyle(0x0a1020, 0.35).fillRect(SX, SY, SW, SH);
    g.fillStyle(0xffffff, 0.12);
    g.fillTriangle(SX + 60, SY, SX + 160, SY, SX + 20, SY + SH);
    g.fillTriangle(SX + 220, SY, SX + 260, SY, SX + 120, SY + SH);
    g.lineStyle(26, 0x2a2f3a, 1).strokeRect(SX + 13, SY + 13, SW - 26, SH - 26);
    this.sc.tweens.add({ targets: spr, alpha: 0.7, duration: 1200, yoyo: true, repeat: -1 });
    return 1800;
  }

  /** INT. BRITISH MILITARY TRANSPORT PLANE: the plane across the night sky, then inside, rattling. */
  private plane() {
    this.clear();
    this.sceneFx = "rumble";
    const { SX, SY, SW, SH } = this.r;
    const sky = this.add(this.sc.add.graphics());
    sky.fillGradientStyle(0x0b1030, 0x0b1030, 0x283a6a, 0x283a6a, 1).fillRect(SX, SY, SW, SH);
    for (let i = 0; i < 50; i++) sky.fillStyle(0xffffff, Math.random() * 0.8 + 0.2).fillRect(SX + Math.random() * SW, SY + Math.random() * SH * 0.7, 2, 2);
    this.add(this.sc.add.circle(SX + SW - 90, SY + 70, 30, 0xf4f1d0));
    for (let i = 0; i < 5; i++) {
      const c = this.add(this.sc.add.ellipse(SX + Math.random() * SW, SY + 140 + i * 50, 200 + Math.random() * 120, 36, 0x3b4a70, 0.8));
      this.sc.tweens.add({ targets: c, x: c.x - 500, duration: 3500, ease: "Linear" });
    }
    const key = this.sc.textures.exists("tv_transport") ? "tv_transport" : null;
    const p = key ? this.add(this.sc.add.image(SX - 200, SY + 190, key).setScale(2.6)) : this.add(this.sc.add.text(SX - 200, SY + 190, "✈", { fontSize: "90px", color: "#555" }).setOrigin(0.5));
    this.sc.tweens.add({ targets: p, x: SX + SW + 220, y: SY + 150, duration: 3000, ease: "Linear" });
    this.sc.tweens.add({ targets: p, angle: { from: -2, to: 2 }, duration: 400, yoyo: true, repeat: -1 });
    synth.play("jet");
    this.later(3000, () => {
      this.wide(["MARC", "JEZ", "SIMON"], this.host.setTexture());
      this.every(70, () => this.layer.setPosition((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4));
      // Jez in handcuffs
      const j = this.wideSprites.JEZ;
      if (j) {
        const cuffs = this.add(this.sc.add.graphics());
        cuffs.lineStyle(3, 0xd1d5db, 1).strokeCircle(j.x - 8, j.y - 52, 6).strokeCircle(j.x + 8, j.y - 52, 6).lineBetween(j.x - 2, j.y - 52, j.x + 2, j.y - 52);
      }
    });
    return 4600;
  }

  private turnAway(name: string) {
    const spr = this.closeUp(name, "neutral");
    this.sc.tweens.add({ targets: spr, scaleX: -faceScale(name), x: spr.x + 120, alpha: 0.6, duration: 700, ease: "Sine.easeInOut" });
    return 1000;
  }

  private lean(name: string) {
    const spr = this.closeUp(name, "neutral", { recut: true });
    this.sc.tweens.add({ targets: spr, scale: faceScale(name) * 1.22, y: spr.y + 60, duration: 700, ease: "Sine.easeOut" });
    this.looking = name;
    return 900;
  }

  private shopping() {
    this.wide(["JEZ"]);
    const { SX, SY, SH } = this.r;
    this.walkIn("MARC", SX - 60, SX + 140, SY + SH - 40 + 14, 100);
    const bag = this.add(this.sc.add.text(SX - 30, SY + SH - 110, "🛍", { fontSize: "34px" }).setOrigin(0.5));
    this.sc.tweens.add({ targets: bag, x: SX + 175, duration: 700, delay: 100 });
    synth.play("door");
    return 1500;
  }

  private jumpUp(name: string) {
    const spr = this.closeUp(name, "alarm", { recut: true, still: true });
    const y = spr.y;
    spr.setY(y + 300);
    this.sc.tweens.add({ targets: spr, y, duration: 380, ease: "Back.out" });
    this.looking = name;
    return 800;
  }

  private gokuGrin() {
    if (!this.wideSprites.GOKU) this.wide(["MARC", "GOKU", "JEZ"]);
    const g = this.wideSprites.GOKU;
    if (g) {
      const s = this.add(this.sc.add.text(g.x + 40, g.y - 260, "✦", { fontSize: "40px", color: "#fff" }).setOrigin(0.5).setScale(0));
      this.sc.tweens.add({ targets: s, scale: 1.2, angle: 90, duration: 250, yoyo: true });
    }
    return 900;
  }

  private fridge() {
    this.wide([]);
    const { SX, SY, SH } = this.r;
    const fx = SX + 360;
    const body = this.add(this.sc.add.rectangle(fx, SY + SH - 20, 150, 300, 0xeef2f6).setOrigin(0.5, 1).setStrokeStyle(3, 0x9aa4b0));
    const glow = this.add(this.sc.add.rectangle(fx, SY + SH - 25, 140, 290, 0xfff6c8).setOrigin(0.5, 1).setAlpha(0));
    const door = this.add(this.sc.add.rectangle(fx - 75, SY + SH - 20, 150, 300, 0xdfe5ec).setOrigin(0, 1).setStrokeStyle(3, 0x9aa4b0));
    const tex = this.host.spriteFor("GOKU");
    if (tex) this.wideSprites.GOKU = this.add(this.sc.add.sprite(SX + 180, SY + SH - 20, tex, 0).setOrigin(0.5, 1).setScale(5.2));
    this.sc.tweens.add({ targets: door, scaleX: -0.4, duration: 500, delay: 300 });
    this.sc.tweens.add({ targets: glow, alpha: 0.8, duration: 300, delay: 450 });
    synth.play("door");
    void body;
    return 1300;
  }

  private chicken() {
    const g = this.wideSprites.GOKU;
    const x = g ? g.x + 60 : this.cx();
    const y = g ? g.y - 170 : this.r.SY + 200;
    const c = this.add(this.sc.add.text(x + 120, y + 60, "🍗", { fontSize: "70px" }).setOrigin(0.5).setData("chicken", true));
    this.sc.tweens.add({ targets: c, x, y, duration: 600, ease: "Back.out" });
    return 1000;
  }

  private devour() {
    // back on Goku (the chicken line cut away to Marc)
    if (!this.wideSprites.GOKU) {
      this.wide(["MARC", "GOKU"]);
      (this.wideSprites.GOKU as Phaser.GameObjects.Sprite | undefined)?.setScale(5.2);
    }
    let c = this.layer.list.find((o) => o.getData?.("chicken")) as Phaser.GameObjects.Text | undefined;
    if (!c) {
      this.chicken();
      c = this.layer.list.find((o) => o.getData?.("chicken")) as Phaser.GameObjects.Text;
    }
    const g = this.wideSprites.GOKU;
    for (let i = 0; i < 6; i++) {
      this.later(i * 200, () => {
        if (!c?.active) return;
        c.setScale(1 - (i + 1) * 0.16);
        synth.play(i === 5 ? "burp" : "gulp");
        const t = this.add(this.sc.add.text(c.x + (Math.random() - 0.5) * 80, c.y - 40, "CHOMP", { fontFamily: FONT, fontSize: "18px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5).setShadow(2, 2, "#000", 0));
        this.sc.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 500 });
        for (let k = 0; k < 4; k++) {
          const cr = this.add(this.sc.add.rectangle(c.x, c.y, 5, 5, 0xc0803a));
          this.sc.tweens.add({ targets: cr, x: cr.x + (Math.random() - 0.5) * 120, y: cr.y + 60 + Math.random() * 80, alpha: 0, duration: 600 });
        }
        if (g) g.setFrame(i % 2 ? 0 : 1);
      });
    }
    this.later(1300, () => c?.destroy());
    return 1700;
  }

  /** Vegeta, over Croydon. */
  private explosion(second: boolean) {
    const { SX, SY, SW, SH } = this.r;
    if (!second) {
      this.wide([], "tv_livingroom");
      const sky = this.add(this.sc.add.rectangle(SX + SW * 0.25, SY + 40, SW * 0.45, SH * 0.42, 0xff8a2a, 0).setOrigin(0));
      this.sc.tweens.add({ targets: sky, fillAlpha: 0.55, duration: 200, yoyo: true, hold: 600 });
      const tex = this.host.spriteFor("JEZ");
      if (tex) this.wideSprites.JEZ = this.add(this.sc.add.sprite(SX + SW * 0.45, SY + SH - 30, tex, 5).setOrigin(0.5, 1).setScale(4.4));
    }
    this.sc.cameras.main.flash(300, 255, 230, 180);
    this.sc.cameras.main.shake(900, 0.02);
    // through the window, over Croydon
    this.fx(second ? "vfx_boom" : "vfx_bigboom", SX + SW * (second ? 0.38 : 0.5), SY + (second ? 120 : 140), { scale: second ? 1.2 : 1.3 });
    const glow = this.add(this.sc.add.rectangle(SX, SY, SW, SH, 0xff9a3a, 0.45).setOrigin(0));
    this.sc.tweens.add({ targets: glow, alpha: 0, duration: 900 });
    if (second) {
      for (let i = 0; i < 6; i++) {
        const m = this.add(this.sc.add.rectangle(SX + SW * 0.3 + Math.random() * SW * 0.3, SY - 30, 20 + Math.random() * 30, 16 + Math.random() * 20, 0x7a7a7a).setStrokeStyle(2, 0x4a4a4a));
        this.sc.tweens.add({ targets: m, y: SY + SH + 40, angle: Math.random() * 360, duration: 900 + Math.random() * 400, delay: 200 + i * 120, ease: "Quad.in" });
      }
      synth.play("alarm");
    }
    return second ? 2400 : 2600;
  }
}
