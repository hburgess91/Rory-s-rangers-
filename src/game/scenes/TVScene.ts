import Phaser from "phaser";
import { charMeta } from "../gfx/HD";
import { voice } from "../audio/Voice";
import { ALL_EPISODES, CHANNELS, setKeyFor } from "../../content/television/channels";
import { beatDuration, type TVBeat, type TVEpisode } from "../systems/tv";
import { G } from "../G";
import { synth } from "../audio/Synth";
import { FONT } from "../ui/theme";
import { drawCharacter } from "../gfx/Textures";
import type { SpriteLook } from "../../data/characters";
import { bump } from "../systems/stats";
import { switchTo } from "../Flow";
import { DUNGEONS } from "../../data/dungeons";
import { completeStep, currentArcSteps } from "../systems/arcs";

const DUNGEON_MUSIC: Record<string, string> = Object.fromEntries(Object.values(DUNGEONS).map((d) => [d.id, d.music]));

const SX = 200;
const SY = 50;
const SW = 560;
const SH = 420;

const CAST: Record<string, SpriteLook | string> = {
  "JENNY CUMMING": { skin: 0xf6d7c3, hair: 0x7a3b12, hairStyle: "long", beard: null, glasses: "none", top: 0xb3202a, topDetail: 0xffffff, bottom: 0x1a1a1a, shoes: 0x111111, bulk: 1 },
  "CHRISTOPHER THICK": { skin: 0xf1c7a5, hair: 0x2a1a0a, hairStyle: "short", beard: null, glasses: "none", top: 0x1f2a44, topDetail: 0xb11226, bottom: 0x1f2a44, shoes: 0x111111, accent: 0xd8d8d8, bulk: 2 },
  NEWSREADER: { skin: 0xf1c7a5, hair: 0x6b4a2c, hairStyle: "short", beard: null, glasses: "none", top: 0x1f2a44, topDetail: 0xffffff, bottom: 0x1f2a44, shoes: 0x111111 },
  REPORTER: { skin: 0xd9a77e, hair: 0x111111, hairStyle: "long", beard: null, glasses: "none", top: 0x6b8f3a, bottom: 0x2b2b2b, shoes: 0x111111 },
  ANNOUNCER: { skin: 0xf6d7c3, hair: 0xaaaaaa, hairStyle: "short", beard: 0xaaaaaa, glasses: "round", top: 0x4c4f57, bottom: 0x3a3c42, shoes: 0x1c1c1c },
  HOST: { skin: 0xf1c7a5, hair: 0xf3dc8a, hairStyle: "blonde", beard: null, glasses: "none", top: 0xff4fa3, bottom: 0x111111, shoes: 0xffffff },
  "CO-HOST": { skin: 0xc58c5c, hair: 0x2a1a0a, hairStyle: "wavy", beard: null, glasses: "square", top: 0x17c6c0, bottom: 0x333333, shoes: 0xffffff },
  COMMENTATOR: { skin: 0xf1c7a5, hair: 0x5a3a1a, hairStyle: "short", beard: null, glasses: "none", top: 0x2f6b3a, bottom: 0x333333, shoes: 0x111111 },
  "CO-COMMENTATOR": { skin: 0xd9a77e, hair: null, hairStyle: "bald", beard: 0x333333, glasses: "none", top: 0x7a1f2b, bottom: 0x333333, shoes: 0x111111 },
  CHEERLEADERS: { skin: 0xf6d7c3, hair: 0xf0cf74, hairStyle: "long", beard: null, glasses: "none", top: 0xffd23f, bottom: 0x3b6cff, shoes: 0xffffff },
  SINGER: { skin: 0xf1c7a5, hair: 0x111111, hairStyle: "wavy", beard: null, glasses: "shades", top: 0x111111, topDetail: 0xff3b30, bottom: 0x111111, shoes: 0x111111 },
  DRONGUS: "spr_DRONGUS",
  SCROMBUS: "spr_SCROMBUS",
  KREZMAR: "spr_KREZMAR",
  "LIL' CRONGUS": "spr_CRONGUS",
};

interface Actor {
  spr: Phaser.GameObjects.Sprite;
  name: string;
}

/** Stock roles played by existing TV actors. */
const TV_ALIASES: Record<string, string> = {
  JOURNALIST: "REPORTER",
  ALAN: "ADVISOR",
  KAREN: "MADISON",
  "DNC REP": "OFFICIAL",
  AIDE: "ADVISOR",
  "DEMOCRATIC LEADER": "EXECUTIVE",
  MODERATOR: "HOST",
  "PUB PATRON": "GROZZ",
  "CONSERVATIVE SUPPORTER": "GROZZ",
  VOTER: "MINTY",
};

const EXTRA_CAST_SHOWS = new Set(["creation_myth", "eastenders_krezz", "beep_show"]);

export class TVScene extends Phaser.Scene {
  private overlay = false;
  private caller = "";
  private fromTitle = false;
  private mode: "channels" | "episodes" | "playing" = "channels";
  private channel = "";
  private ui!: Phaser.GameObjects.Container;
  private stage!: Phaser.GameObjects.Container;
  private subs!: Phaser.GameObjects.Text;
  private caption!: Phaser.GameObjects.Text;
  private card!: Phaser.GameObjects.Text;
  private ep: TVEpisode | null = null;
  private beat = 0;
  private beatTimer: Phaser.Time.TimerEvent | null = null;
  private pausedPlay = false;
  private showSubs = true;
  private actors: Record<string, Actor> = {};
  private props: Record<string, Phaser.GameObjects.GameObject> = {};
  private setKey = "";
  private mouthTimer: Phaser.Time.TimerEvent | null = null;
  private keyHandler!: (e: KeyboardEvent) => void;
  private sel = 0;
  private items: { label: string; action: () => void }[] = [];

  constructor() {
    super("TV");
  }

  create(data: { overlay?: boolean; caller?: string; fromTitle?: boolean; episode?: string }) {
    this.overlay = !!data?.overlay;
    this.caller = data?.caller ?? "";
    this.fromTitle = !!data?.fromTitle;
    this.mode = "channels";
    this.actors = {};
    this.props = {};
    this.ep = null;
    this.makeCast();
    this.add.rectangle(0, 0, 960, 540, 0x000000, this.overlay ? 0.85 : 1).setOrigin(0);
    // bezel
    const g = this.add.graphics();
    g.fillStyle(0x3a2a1a, 1);
    g.fillRoundedRect(SX - 40, SY - 30, SW + 80, SH + 80, 30);
    g.fillStyle(0x1a120a, 1);
    g.fillRoundedRect(SX - 10, SY - 10, SW + 20, SH + 20, 22);
    g.fillStyle(0xd4a017, 1);
    g.fillCircle(SX + SW + 22, SY + 60, 9);
    g.fillCircle(SX + SW + 22, SY + 100, 9);
    this.add.text(SX + SW / 2, SY + SH + 26, "KRELTV", { fontFamily: FONT, fontSize: "14px", color: "#d4a017", fontStyle: "bold" }).setOrigin(0.5);
    this.stage = this.add.container(0, 0);
    const mask = this.make.graphics({}).fillRect(SX, SY, SW, SH);
    this.stage.setMask(mask.createGeometryMask());
    this.ui = this.add.container(0, 0);
    this.subs = this.add.text(SX + SW / 2, SY + SH - 16, "", { fontFamily: FONT, fontSize: "15px", color: "#ffffff", backgroundColor: "#000000cc", padding: { x: 6, y: 3 }, wordWrap: { width: SW - 40 }, align: "center" }).setOrigin(0.5, 1).setDepth(50);
    this.caption = this.add.text(SX + 12, SY + 10, "", { fontFamily: FONT, fontSize: "12px", color: "#ffd23f", backgroundColor: "#000000aa", padding: { x: 4, y: 2 } }).setDepth(50);
    this.card = this.add.text(SX + SW / 2, SY + SH / 2, "", { fontFamily: FONT, fontSize: "26px", color: "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: SW - 60 } }).setOrigin(0.5).setDepth(60).setShadow(3, 3, "#000", 0);
    if (G.meta.settings.crt) this.drawCRT();
    this.drawControls();
    this.keyHandler = (e) => this.onKey(e);
    window.addEventListener("keydown", this.keyHandler);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", this.keyHandler);
      this.beatTimer?.remove();
      this.mouthTimer?.remove();
    });
    if (data?.episode) {
      const e = ALL_EPISODES.find((x) => x.id === data.episode);
      if (e) return this.play(e);
    }
    this.showChannels();
  }

  private makeCast() {
    for (const [name, look] of Object.entries(CAST)) {
      if (typeof look === "string") continue;
      const key = `tv_${name}`;
      if (this.textures.exists(key)) continue;
      const cv = document.createElement("canvas");
      cv.width = 64;
      cv.height = 24;
      const ctx = cv.getContext("2d")!;
      for (let f = 0; f < 4; f++) drawCharacter(ctx, look, f, f * 16);
      const tex = this.textures.addCanvas(key, cv)!;
      for (let f = 0; f < 4; f++) tex.add(f, 0, f * 16, 0, 16, 24);
    }
  }

  private drawCRT() {
    const g = this.add.graphics().setDepth(100);
    g.fillStyle(0x000000, 0.18);
    for (let y = SY; y < SY + SH; y += 3) g.fillRect(SX, y, SW, 1);
    g.lineStyle(18, 0x000000, 0.35);
    g.strokeRoundedRect(SX - 4, SY - 4, SW + 8, SH + 8, 30);
    const noise = this.add.graphics().setDepth(101);
    this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        noise.clear();
        noise.fillStyle(0xffffff, 0.04);
        for (let i = 0; i < 40; i++) noise.fillRect(SX + Math.random() * SW, SY + Math.random() * SH, 2, 1);
      },
    });
  }

  private drawControls() {
    const btns: [string, () => void][] = [
      ["⏮", () => this.rewind()],
      ["⏯", () => this.togglePause()],
      ["⏭", () => this.skipBeat()],
      ["CC", () => (this.showSubs = !this.showSubs)],
      ["⏏ EXIT", () => this.back()],
    ];
    btns.forEach(([t, fn], i) => {
      const b = this.add.text(SX + 20 + i * 70, SY + SH + 52, t, { fontFamily: FONT, fontSize: "13px", color: "#ffd23f", backgroundColor: "#2a1a0a", padding: { x: 8, y: 3 } }).setInteractive({ useHandCursor: true });
      b.on("pointerdown", fn);
    });
    this.add.text(960 - 10, 530, "Space: next · P: pause · ←: rewind · S: subtitles · Esc: back", { fontFamily: FONT, fontSize: "10px", color: "#777" }).setOrigin(1, 1);
  }

  // ---------------------------------------------------------- menus

  private renderList(title: string, items: { label: string; action: () => void; dim?: boolean }[]) {
    this.ui.removeAll(true);
    this.stage.removeAll(true);
    this.items = items;
    this.sel = 0;
    this.ui.add(this.add.rectangle(SX, SY, SW, SH, 0x10183a).setOrigin(0));
    this.ui.add(this.add.text(SX + SW / 2, SY + 22, title, { fontFamily: FONT, fontSize: "20px", color: "#7fb3ff", fontStyle: "bold" }).setOrigin(0.5));
    items.forEach((it, i) => {
      const t = this.add
        .text(SX + 30, SY + 56 + i * 30, it.label, { fontFamily: FONT, fontSize: "15px", color: it.dim ? "#5a6080" : "#ffffff", wordWrap: { width: SW - 60 } })
        .setInteractive({ useHandCursor: true });
      t.on("pointerover", () => this.highlight(i));
      t.on("pointerdown", () => {
        synth.play("select");
        it.action();
      });
      this.ui.add(t);
    });
    this.highlight(0);
  }

  private highlight(i: number) {
    this.sel = i;
    let idx = 0;
    for (const o of this.ui.list) {
      if (o instanceof Phaser.GameObjects.Text && o.input) {
        o.setBackgroundColor(idx === i ? "#2d3360" : "#00000000");
        idx++;
      }
    }
  }

  private unlocked(e: TVEpisode) {
    if (!e.unlockFlag) return true;
    if (this.fromTitle) return G.meta.tvWatched.includes(e.id);
    return !!G.s.flags[e.unlockFlag];
  }

  private showChannels() {
    this.mode = "channels";
    synth.music("news");
    const items = CHANNELS.map((ch) => {
      const eps = ALL_EPISODES.filter((e) => e.channel === ch);
      const avail = eps.filter((e) => this.unlocked(e));
      return {
        label: `${ch}  ${avail.length ? `(${avail.length})` : "[LOCKED PROGRAMME]"}`,
        dim: !avail.length,
        action: () => {
          if (this.crobleyBreak()) return;
          if (!avail.length) {
            this.flashCard(eps[0]?.unlockHint ?? "Not broadcasting yet.");
            return;
          }
          this.showEpisodes(ch);
        },
      };
    });
    items.push({ label: "⏏ Turn off", dim: false, action: () => this.exit() });
    this.renderList(this.fromTitle ? "KRELWORLD MEDIA ARCHIVE" : "KRELTV — CHANNEL GUIDE", items);
  }

  /** While the Crobley story is breaking, every channel is the Crobley story. */
  private crobleyBreak() {
    if (this.fromTitle) return false;
    const c = currentArcSteps(G.s).find((x) => x.arc.id === "arc_crobley" && x.step.id === "tv");
    if (!c) return false;
    completeStep(G.s, c.arc, c.step);
    G.save();
    synth.stopMusic();
    switchTo(this, "Vignette", { id: "crobley_news", returnAt: this.caller === "Pub" ? "PUB" : "HOME" });
    return true;
  }

  private showEpisodes(ch: string) {
    this.mode = "episodes";
    this.channel = ch;
    const eps = ALL_EPISODES.filter((e) => e.channel === ch);
    const watched = this.fromTitle ? G.meta.tvWatched : G.s.tvWatched;
    const items = eps.map((e) => ({
      label: this.unlocked(e) ? `${watched.includes(e.id) ? "✓" : "•"} Ep. ${e.episodeNumber}: ${e.title}` : `🔒 ${e.unlockHint ?? "Locked"}`,
      dim: !this.unlocked(e),
      action: () => (this.unlocked(e) ? this.play(e) : this.flashCard(e.unlockHint ?? "Locked")),
    }));
    items.push({ label: "◀ Back to channels", dim: false, action: () => this.showChannels() });
    this.renderList(ch, items);
  }

  private flashCard(t: string) {
    this.card.setText(t);
    this.time.delayedCall(1500, () => this.mode !== "playing" && this.card.setText(""));
  }

  // ---------------------------------------------------------- playback

  private play(e: TVEpisode) {
    this.ui.removeAll(true);
    this.stage.removeAll(true);
    this.actors = {};
    this.props = {};
    this.setKey = "";
    this.mode = "playing";
    this.ep = e;
    this.beat = 0;
    this.pausedPlay = false;
    synth.stopMusic();
    if (e.id === "tcc_ep7") G.drongus("tv_tcc");
    if (e.contentNote) {
      this.card.setText(`CONTENT NOTE\n${e.contentNote}`).setFontSize(16);
      this.beatTimer = this.time.delayedCall(2600, () => {
        this.card.setFontSize(26).setText("");
        this.runBeat();
      });
    } else this.runBeat();
  }

  private runBeat() {
    this.beatTimer?.remove();
    if (!this.ep || this.mode !== "playing") return;
    if (this.beat >= this.ep.beats.length) return this.finishEpisode();
    const b = this.ep.beats[this.beat];
    this.applyBeat(b);
    const dur = beatDuration(b) * 1000;
    const started = this.time.now;
    const next = () => {
      if (this.pausedPlay) return;
      // don't cut the reader off mid-passage: wait for the speech to finish (capped so a stuck engine can't hang the show)
      if (b.type === "speaker" && voice.busy() && this.time.now - started < dur + 30000) {
        this.beatTimer = this.time.delayedCall(150, next);
        return;
      }
      this.beat++;
      this.runBeat();
    };
    this.beatTimer = this.time.delayedCall(dur, next);
  }

  private applyBeat(b: TVBeat) {
    this.mouthTimer?.remove();
    for (const a of Object.values(this.actors)) if (String(a.spr.frame.name) === "3") a.spr.setFrame(0);
    if (b.type !== "speaker" && b.type !== "direction") this.subs.setText("");
    switch (b.type) {
      case "titleCard":
        this.card.setText(b.text);
        this.subs.setText("");
        break;
      case "shot":
        this.card.setText("");
        this.drawSet(setKeyFor(b.set), b.framing);
        break;
      case "speaker": {
        this.card.setText("");
        const a = this.ensureActor(b.character);
        this.subs.setText(this.showSubs ? `${b.character}: ${b.text}` : "").setVisible(this.showSubs);
        voice.say(b.character, b.text);
        if (a) {
          this.mouthTimer = this.time.addEvent({ delay: 130, loop: true, callback: () => a.spr.setFrame(String(a.spr.frame.name) === "3" ? 0 : 3) });
          if (b.emotion === "crying") a.spr.setTint(0xaaccff);
          else if (a.spr.getData("pose") !== "asleep") a.spr.clearTint();
        }
        synth.play("type");
        break;
      }
      case "direction":
        this.subs.setText(this.showSubs ? `(${b.action})` : "").setVisible(this.showSubs);
        break;
      case "audience": {
        const map = { laugh: "[LAUGHTER]", biglaugh: "[UPROARIOUS LAUGHTER]", cheer: "[CHEERING]", gasp: "[GASP]", whistle: "[WHISTLES]" } as const;
        this.caption.setText(map[b.cue]);
        this.time.delayedCall(b.cue === "biglaugh" ? 3800 : 2000, () => this.caption.setText(""));
        synth.play(b.cue);
        break;
      }
      case "sfx":
        synth.play(b.id);
        break;
      case "music":
        if (b.mode === "start") synth.music(b.id, true);
        else synth.stopMusic();
        break;
      case "transition":
        if (b.mode === "smashCut") this.cameras.main.flash(120, 255, 255, 255);
        else if (b.mode === "fade") this.cameras.main.fadeIn(500, 0, 0, 0);
        break;
      case "prop":
        this.setProp(b.id, b.on);
        break;
      case "blocking":
        this.block(b.character, b.to, b.pose);
        break;
    }
  }

  private finishEpisode() {
    const e = this.ep!;
    if (!this.fromTitle) {
      const fresh = !G.s.tvWatched.includes(e.id);
      G.watched(e.id);
      G.s.flags[`tv_${e.id}`] = true;
      if (fresh) bump(G.s, "tv_watched");
      G.save();
    } else {
      if (!G.meta.tvWatched.includes(e.id)) G.meta.tvWatched.push(e.id);
      G.saveMeta();
    }
    const pf = synth.playingFile();
    if (pf === "anthem" || pf === "crazy") synth.stopMusic();
    this.subs.setText("");
    this.card.setText("");
    this.mode = "episodes";
    this.showEpisodes(e.channel);
    if (e.id === "tcc_ep7" && !this.fromTitle) G.emit("toast", { title: "KRELTV", text: "The cabinet has opinions about Thick Cumming Cock. Go and ask them." });
  }

  private drawSet(key: string, framing: string) {
    if (key === this.setKey) {
      this.frame(framing);
      return;
    }
    this.setKey = key;
    for (const a of Object.values(this.actors)) a.spr.destroy();
    this.actors = {};
    for (const p of Object.values(this.props)) p.destroy();
    this.props = {};
    this.stage.removeAll(true);
    // PixelLab set (generated at 280x212, drawn at 2x inside the CRT)
    const known = ["newsdesk", "polson_ext", "townhall_cam", "pitch", "shopping", "emergency", "archive", "forest", "nyc_skyline", "office_night", "cave", "livingroom", "pubbar", "cellar", "press", "cockpit", "bunker", "boardroom", "cell", "street_day"];
    const artKey = known.includes(key) || this.textures.exists(`tv_${key}`) ? `tv_${key}` : "tv_default";
    if (this.textures.exists(artKey)) {
      const img = this.add.image(SX + SW / 2, SY + SH / 2, artKey);
      const src = this.textures.get(artKey).getSourceImage();
      img.setScale(Math.max(SW / src.width, SH / src.height));
      this.stage.add(img);
      if (key === "shopping") this.stage.add(this.add.image(SX + 430, SY + 250, "p_wonking").setScale(3));
      if (key === "emergency") this.stage.add(this.add.text(SX + SW / 2, SY + 25, "⚠ EMERGENCY BROADCAST ⚠", { fontFamily: FONT, fontSize: "18px", color: "#ffffff", fontStyle: "bold", backgroundColor: "#b91c1c" }).setOrigin(0.5));
      if (key === "townhall_cam") this.stage.add(this.add.text(SX + SW - 60, SY + 20, "● LIVE", { fontFamily: FONT, fontSize: "13px", color: "#ff3333", fontStyle: "bold" }));
      this.frame(framing);
      return;
    }
    const g = this.add.graphics();
    this.stage.add(g);
    const P = (x: number, y: number, w: number, h: number, c: number, a = 1) => {
      g.fillStyle(c, a);
      g.fillRect(SX + x, SY + y, w, h);
    };
    switch (key) {
      case "office_night":
        P(0, 0, SW, SH, 0x1b1f2e);
        P(30, 40, 200, 140, 0x0a1430);
        for (let i = 0; i < 12; i++) P(40 + i * 15, 100 + ((i * 37) % 60), 8, 80, 0x1a2550);
        for (let i = 0; i < 20; i++) P(40 + ((i * 41) % 180), 110 + ((i * 23) % 60), 2, 2, 0xffe08a);
        P(30, 40, 200, 6, 0x333a52);
        P(330, 50, 160, 90, 0x2a2f45);
        this.stage.add(this.add.text(SX + 410, SY + 95, "THICK CUMMING COCK\nADVERTISING", { fontFamily: FONT, fontSize: "10px", color: "#ffd23f", align: "center" }).setOrigin(0.5));
        P(0, 300, SW, 120, 0x2b2118);
        P(80, 270, 400, 40, 0x5a3a20);
        P(80, 306, 400, 6, 0x3b2a1a);
        break;
      case "nyc_skyline":
        P(0, 0, SW, SH, 0x7ec8f0);
        P(0, 280, SW, 140, 0x5f7f9f);
        for (let i = 0; i < 26; i++) P(i * 22, 220 + ((i * 53) % 70), 20, 200, 0x5a6a80);
        P(250, 80, 34, 300, 0xb0b8c4);
        P(300, 80, 34, 300, 0xa0a8b4);
        for (let y = 90; y < 370; y += 8) {
          P(254, y, 26, 2, 0x8a929e);
          P(304, y, 26, 2, 0x7a828e);
        }
        P(262, 60, 4, 20, 0x8a929e);
        P(0, 380, SW, 40, 0x3a4a5a);
        break;
      case "newsdesk":
        P(0, 0, SW, SH, 0x0f2a5a);
        P(0, 260, SW, 160, 0x0a1c3c);
        P(60, 250, 440, 80, 0x1f3f7f);
        P(60, 250, 440, 6, 0xffd23f);
        P(330, 60, 200, 120, 0x223a6a);
        this.stage.add(this.add.text(SX + 430, SY + 120, "KNN\nKRELFORD", { fontFamily: FONT, fontSize: "16px", color: "#ffffff", align: "center", fontStyle: "bold" }).setOrigin(0.5));
        break;
      case "polson_ext":
        P(0, 0, SW, SH, 0x0b1020);
        P(120, 120, 320, 220, 0x5a4a3a);
        P(100, 100, 360, 30, 0x3a2a1a);
        P(150, 170, 50, 50, 0xffe08a, 0.7);
        P(360, 170, 50, 50, 0xffe08a, 0.7);
        P(0, 340, SW, 80, 0x7a5a2a);
        this.stage.add(this.add.text(SX + 280, SY + 380, "(the moat is gravy)", { fontFamily: FONT, fontSize: "11px", color: "#ddd" }).setOrigin(0.5));
        break;
      case "townhall_cam":
        P(0, 0, SW, SH, 0x6b2737);
        P(0, 280, SW, 140, 0x5a3a20);
        P(40, 40, 120, 90, 0x6a8fd0);
        this.stage.add(this.add.text(SX + SW - 60, SY + 20, "● LIVE", { fontFamily: FONT, fontSize: "13px", color: "#ff3333", fontStyle: "bold" }));
        break;
      case "pitch":
        P(0, 0, SW, SH, 0x6aa0e0);
        P(0, 150, SW, 270, 0x3e8a3a);
        for (let x = 0; x < SW; x += 60) P(x, 150, 30, 270, 0x47994a);
        P(SW / 2 - 2, 150, 4, 270, 0xffffff);
        P(20, 230, 10, 100, 0xffffff);
        break;
      case "shopping":
        P(0, 0, SW, SH, 0x3a0a2a);
        for (let i = 0; i < 8; i++) P(i * 70, 0, 35, SH, 0x4a1a3a);
        P(0, 300, SW, 120, 0x2a0a1a);
        this.stage.add(this.add.image(SX + 430, SY + 230, "p_wonking").setScale(3));
        this.stage.add(this.add.text(SX + 430, SY + 130, "£49.99\n(or 6 Krezzcoin)", { fontFamily: FONT, fontSize: "14px", color: "#ffd23f", align: "center", fontStyle: "bold" }).setOrigin(0.5));
        break;
      case "emergency":
        P(0, 0, SW, SH, 0x000000);
        P(0, 0, SW, 50, 0xb91c1c);
        this.stage.add(this.add.text(SX + SW / 2, SY + 25, "⚠ EMERGENCY BROADCAST ⚠", { fontFamily: FONT, fontSize: "18px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5));
        break;
      case "archive":
        P(0, 0, SW, SH, 0x2a1f12);
        for (let i = 0; i < 6; i++) P(20 + i * 90, 40, 70, 300, 0x4a3a22);
        break;
      case "forest":
        P(0, 0, SW, SH, 0x9fd0ff);
        P(0, 260, SW, 160, 0x3d6a2a);
        P(260, 120, 40, 160, 0x5a3a20);
        g.fillStyle(0x2f5a22, 1);
        g.fillCircle(SX + 280, SY + 120, 80);
        for (let i = 0; i < 9; i++) P(220 + ((i * 29) % 120), 80 + ((i * 17) % 80), 6, 6, 0xc084fc);
        break;
      case "cave":
        P(0, 0, SW, SH, 0x1a1410);
        for (let i = 0; i < 14; i++) P((i * 47) % SW, (i * 31) % 200, 60, 40, 0x2a2018);
        P(0, 320, SW, 100, 0x3a2a1a);
        P(240, 280, 90, 50, 0x6b4527);
        g.fillStyle(0xffd27a, 0.25);
        g.fillCircle(SX + 120, SY + 160, 70);
        break;
      case "livingroom":
        P(0, 0, SW, SH, 0x6b5b4b);
        P(0, 300, SW, 120, 0x4a3a2a);
        P(60, 230, 240, 80, 0x7a1f2b);
        P(380, 150, 120, 90, 0x111111);
        P(390, 160, 100, 70, 0x3b82f6, 0.6);
        P(330, 40, 90, 70, 0x9fd0ff);
        break;
      case "pubbar":
        P(0, 0, SW, SH, 0x3b2a1a);
        P(0, 260, SW, 160, 0x2a1a0a);
        P(40, 220, 480, 60, 0x5a3a20);
        for (let i = 0; i < 6; i++) P(80 + i * 70, 60, 30, 100, 0x8a5a2a);
        this.stage.add(this.add.text(SX + 280, SY + 30, "THE QUEEN VIC", { fontFamily: FONT, fontSize: "16px", color: "#ffd23f", fontStyle: "bold" }).setOrigin(0.5));
        break;
      case "cellar":
        P(0, 0, SW, SH, 0x1f2328);
        for (let i = 0; i < 5; i++) P(0, 40 + i * 50, SW, 8, 0x4b5563);
        P(220, 200, 140, 120, 0x6b7280);
        P(240, 220, 100, 30, 0xffb6c1);
        break;
      case "press":
        P(0, 0, SW, SH, 0x1e3a8a);
        P(0, 0, SW, 60, 0x172554);
        P(250, 200, 60, 120, 0x5a3a20);
        P(270, 180, 20, 30, 0x111111);
        break;
      case "cockpit":
        P(0, 0, SW, SH, 0x111827);
        P(60, 40, 440, 160, 0x7ec8f0);
        P(120, 120, 20, 70, 0x6b7280);
        P(140, 100, 10, 90, 0x6b7280);
        P(0, 220, SW, 200, 0x1f2937);
        for (let i = 0; i < 20; i++) P(60 + (i % 10) * 44, 250 + Math.floor(i / 10) * 30, 20, 12, i % 3 ? 0x22c55e : 0xef4444);
        break;
      case "bunker":
        P(0, 0, SW, SH, 0x2a2f3a);
        P(0, 300, SW, 120, 0x1f232b);
        P(120, 230, 320, 50, 0x3b2a1a);
        P(220, 40, 120, 80, 0x0f2a5a);
        break;
      case "boardroom":
        P(0, 0, SW, SH, 0xd6c49a);
        P(0, 300, SW, 120, 0x6b4527);
        P(60, 240, 440, 60, 0x3b2a1a);
        P(360, 50, 140, 100, 0xe7d8b0);
        break;
      case "cell":
        P(0, 0, SW, SH, 0x3a3f4a);
        for (let x = 20; x < SW; x += 40) P(x, 0, 8, SH, 0x111827);
        P(0, 330, SW, 90, 0x2a2f3a);
        break;
      case "street_day":
        P(0, 0, SW, SH, 0x9fd0ff);
        for (let i = 0; i < 10; i++) P(i * 58, 140 + ((i * 37) % 60), 50, 200, [0xc9a227, 0xd6c49a, 0xb08d57][i % 3]);
        P(0, 330, SW, 90, 0x9a9488);
        break;
      default:
        P(0, 0, SW, SH, 0x222222);
    }
    this.frame(framing);
  }

  private frame(framing: string) {
    const f = framing.toUpperCase();
    let zoom = 1;
    if (f.includes("CLOSE")) zoom = 1.35;
    else if (f.includes("TWO")) zoom = 1.12;
    const cx = f.includes("JENNY") ? SX + 150 : f.includes("CHRISTOPHER") ? SX + 400 : SX + SW / 2;
    const fx = zoom === 1 ? SX + SW / 2 : cx;
    this.tweens.add({ targets: this.stage, scale: zoom, x: SX + SW / 2 - fx * zoom, y: (SY + SH / 2) * (1 - zoom), duration: 250 });
  }

  private actorTex(name: string): string | null {
    // PixelLab TV cast (spr_TV_<NAME>) first
    const up = name.toUpperCase() === "KRELBERT AND RONSON" ? "KRELBERT" : name.toUpperCase();
    const keyOf = (n: string) => `spr_TV_${n.replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
    const tvKey = keyOf(up);
    if (this.textures.exists(tvKey)) return tvKey;
    // numbered extras ("EXECUTIVE 2", "JOURNALIST #4") and stock roles share one actor
    const base = up.replace(/\s*#?\d+$/, "");
    const alias = TV_ALIASES[base] ?? base;
    if (this.textures.exists(keyOf(alias))) return keyOf(alias);
    const c = CAST[name.toUpperCase()];
    if (typeof c === "string") return c;
    if (c) return `tv_${name.toUpperCase()}`;
    return this.extraActorTex(name.toUpperCase());
  }

  /** Stand-in actors for shows without a bespoke cast (townsfolk sprites, picked by name). */
  private extraActorTex(name: string): string | null {
    if (!this.ep || !EXTRA_CAST_SHOWS.has(this.ep.id)) return null;
    if (["PHONE", "NARRATOR", "VJ"].includes(name)) return null;
    const named: Record<string, string> = { KROZNO: "boss_krozno", "KEIR STARMER": "npc_journo", "PHIL": "boss_rival", "GOKU": "spr_KREZMAR" };
    if (named[name]) return named[name];
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `spr_FOLK${h % 4}`;
  }

  private ensureActor(name: string): Actor | null {
    const key = name.toUpperCase();
    if (this.actors[key]) return this.actors[key];
    const tex = this.actorTex(key);
    if (!tex || this.setKey === "nyc_skyline") return null;
    const count = Object.keys(this.actors).length;
    const extra = !CAST[key] || tex.startsWith("spr_TV_");
    const x = extra ? SX + 110 + (count % 3) * 170 : SX + 150 + count * 250;
    const hdArt = !!charMeta(this, tex);
    const spr = this.add.sprite(x, SY + 280, tex, 0).setScale(hdArt ? 4.4 : (this.textures.getFrame(tex, 0)?.height ?? 24) > 30 ? 2.5 : 5);
    this.stage.add(spr);
    if (key === "SUSAN NIPWOOD") {
      // she's a ghost
      spr.setAlpha(0.6);
      this.tweens.add({ targets: spr, y: spr.y - 10, alpha: 0.4, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.easeInOut" });
    }
    const a = { spr, name: key };
    this.actors[key] = a;
    return a;
  }

  private block(name: string, to: string, pose?: string) {
    const a = this.ensureActor(name);
    if (!a) return;
    const pos: Record<string, number> = { left: SX + 150, right: SX + 400, center: SX + SW / 2 };
    a.spr.setData("pose", pose ?? "");
    if (to === "enter") {
      a.spr.setX(SX + SW + 40);
      return;
    }
    if (to === "offscreen") {
      this.tweens.add({ targets: a.spr, x: SX - 60, duration: 600 });
      return;
    }
    if (to === "lap") {
      const other = Object.values(this.actors).find((o) => o !== a);
      const tx = other ? other.spr.x - 30 : SX + 380;
      this.tweens.add({ targets: a.spr, x: tx, y: SY + 268, duration: 700 });
      if (other) this.time.delayedCall(720, () => {
        const heart = this.add.text((a.spr.x + other.spr.x) / 2, SY + 170, "❤", { fontSize: "40px" }).setOrigin(0.5);
        this.stage.add(heart);
        this.tweens.add({ targets: heart, y: heart.y - 40, alpha: 0, duration: 1600, onComplete: () => heart.destroy() });
      });
      return;
    }
    this.tweens.add({ targets: a.spr, x: pos[to] ?? SX + SW / 2, duration: 600 });
    a.spr.setFlipX(to === "right");
    if (pose === "asleep") {
      a.spr.setTint(0x8888aa);
      const z = this.add.text(a.spr.x + 30, a.spr.y - 70, "z z z", { fontFamily: FONT, fontSize: "20px", color: "#ffffff" });
      this.stage.add(z);
      this.tweens.add({ targets: z, y: z.y - 20, alpha: 0, duration: 1800, repeat: 1, onComplete: () => z.destroy() });
    } else if (pose === "stand") a.spr.clearTint();
  }

  private setProp(id: string, on: boolean) {
    if (!on) {
      this.props[id]?.destroy();
      delete this.props[id];
      return;
    }
    if (id === "wine") {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.6).fillRect(SX + 200, SY + 250, 8, 14);
      g.fillStyle(0x7a0a1a, 1).fillRect(SX + 201, SY + 254, 6, 7);
      g.fillStyle(0xffffff, 0.6).fillRect(SX + 203, SY + 264, 2, 6).fillRect(SX + 199, SY + 270, 10, 2);
      this.stage.add(g);
      this.props[id] = g;
    } else if (id === "plane") {
      const pl = this.add.text(SX + SW + 40, SY + 150, "✈", { fontSize: "34px", color: "#333333" }).setOrigin(0.5);
      this.stage.add(pl);
      this.tweens.add({ targets: pl, x: SX + 360, y: SY + 170, duration: 4200, ease: "Linear" });
      this.props[id] = pl;
    }
  }

  private togglePause() {
    if (this.mode !== "playing") return;
    this.pausedPlay = !this.pausedPlay;
    this.caption.setText(this.pausedPlay ? "⏸ PAUSED" : "");
    const ss = "speechSynthesis" in window ? window.speechSynthesis : null;
    if (!this.pausedPlay) {
      ss?.resume();
      // let the line that was paused finish reading before moving on
      const go = () => {
        if (this.pausedPlay || this.mode !== "playing") return;
        if (voice.busy()) { this.beatTimer = this.time.delayedCall(150, go); return; }
        this.beat++;
        this.runBeat();
      };
      go();
    } else {
      this.beatTimer?.remove();
      ss?.pause();
    }
  }

  private skipBeat() {
    if (this.mode !== "playing" || !this.ep) return;
    this.pausedPlay = false;
    this.beat++;
    this.runBeat();
  }

  private rewind() {
    if (this.mode !== "playing" || !this.ep) return;
    // Rebuild state by replaying from the start up to the previous beat.
    const target = Math.max(0, this.beat - 1);
    for (const a of Object.values(this.actors)) a.spr.destroy();
    this.actors = {};
    for (const p of Object.values(this.props)) p.destroy();
    this.props = {};
    this.setKey = "";
    this.stage.removeAll(true);
    for (let i = 0; i < target; i++) {
      const b = this.ep.beats[i];
      if (b.type === "shot" || b.type === "blocking" || b.type === "prop") this.applyBeat(b);
    }
    this.beat = target;
    this.pausedPlay = false;
    this.runBeat();
  }

  private back() {
    if (this.mode === "playing") {
      this.beatTimer?.remove();
      this.mode = "episodes";
      this.subs.setText("");
      this.card.setText("");
      this.caption.setText("");
      synth.stopMusic();
      this.showEpisodes(this.ep?.channel ?? this.channel);
    } else if (this.mode === "episodes") this.showChannels();
    else this.exit();
  }

  private exit() {
    synth.stopMusic();
    if (this.fromTitle) {
      switchTo(this, "Title");
      return;
    }
    if (this.caller) {
      this.scene.resume(this.caller);
      const c = this.scene.get(this.caller);
      c.events.emit("ui-resume");
      synth.music(({ Hub: "hub", Pub: "pub" } as Record<string, string>)[this.caller] ?? (DUNGEON_MUSIC[G.rt.dungeonId] ?? "hub"));
    }
    this.scene.stop();
  }

  update() {
    this.subs.setVisible(this.subs.text.length > 0);
    this.caption.setVisible(this.caption.text.length > 0);
  }

  private onKey(e: KeyboardEvent) {
    if (this.mode === "playing") {
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") this.skipBeat();
      else if (e.key === "p" || e.key === "P") this.togglePause();
      else if (e.key === "ArrowLeft" || e.key === "Backspace") this.rewind();
      else if (e.key === "s" || e.key === "S") this.showSubs = !this.showSubs;
      else if (e.key === "Escape") this.back();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "s") this.highlight(Math.min(this.items.length - 1, this.sel + 1));
    else if (e.key === "ArrowUp" || e.key === "w") this.highlight(Math.max(0, this.sel - 1));
    else if (e.key === "Enter" || e.key === " " || e.key === "e") this.items[this.sel]?.action();
    else if (e.key === "Escape") this.back();
  }
}
