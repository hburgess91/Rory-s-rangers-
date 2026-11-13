import Phaser from "phaser";
import type { RoomDef } from "../../../data/dungeons";
import type { Line } from "../../../data/types";
import { synth } from "../../audio/Synth";
import { FONT } from "../../ui/theme";
import { BOSS_TEXT } from "../../../content/bosses";
import { ANTHEM_DOOR, ANTHEM_PA, ANTHEM_SCOLDS, DRONGUS1_DEFY, DRONGUS1_LOGS, DRONGUS1_MEET, DRONGUS1_NEVER, STAIRS_DOOR, STAIRS_ECHOES, STAIRS_OPEN } from "../../../content/citadel";
import { voice } from "../../audio/Voice";

/**
 * DA DRONGUS DUNGEON (Chapter 7): the gothic-cyber look (stone, stained glass, server racks, cables, red and purple
 * neon, candles, a storm outside), the tannoy, and the Anthem Corridor. Used by DungeonScene for rooms with
 * theme "citadel". Everything degrades to drawn shapes if the PixelLab art isn't loaded.
 */

// ---------------------------------------------------------------- art (until it's merged into public/art/manifest.json)

type SheetDef = { file: string; frameWidth: number; frameHeight: number; hd?: number };
export const CITADEL_SHEETS: Record<string, SheetDef> = {
  en_ai_pitbull: { file: "combat/en_ai_pitbull.png", frameWidth: 64, frameHeight: 64, hd: 0.62 },
  en_ai_pitbull_twin: { file: "combat/en_ai_pitbull_twin.png", frameWidth: 64, frameHeight: 64, hd: 0.66 },
  en_ai_pitbull_spider: { file: "combat/en_ai_pitbull_spider.png", frameWidth: 64, frameHeight: 64, hd: 0.62 },
  en_nonce: { file: "combat/en_nonce.png", frameWidth: 64, frameHeight: 64, hd: 0.66 },
  en_nonce_fat: { file: "combat/en_nonce_fat.png", frameWidth: 64, frameHeight: 64, hd: 0.7 },
  en_nonce_tall: { file: "combat/en_nonce_tall.png", frameWidth: 64, frameHeight: 64, hd: 0.72 },
  en_idf: { file: "combat/en_idf.png", frameWidth: 64, frameHeight: 64, hd: 0.58 },
  en_hamas: { file: "combat/en_hamas.png", frameWidth: 64, frameHeight: 64, hd: 0.58 },
  en_kamikaze: { file: "combat/en_kamikaze.png", frameWidth: 64, frameHeight: 64, hd: 0.58 },
  en_deepfake_anchor: { file: "combat/en_deepfake_anchor.png", frameWidth: 64, frameHeight: 64, hd: 0.6 },
  en_crypto_bro: { file: "combat/en_crypto_bro.png", frameWidth: 64, frameHeight: 64, hd: 0.58 },
  en_news_drone: { file: "combat/en_news_drone.png", frameWidth: 64, frameHeight: 64, hd: 0.55 },
  en_x_logo: { file: "combat/en_x_logo.png", frameWidth: 64, frameHeight: 64, hd: 0.32 },
  en_honour_guard: { file: "combat/en_honour_guard.png", frameWidth: 64, frameHeight: 64, hd: 0.6 },
  boss_krex: { file: "combat/boss_krex.png", frameWidth: 128, frameHeight: 128 },
  boss_elon: { file: "combat/boss_elon.png", frameWidth: 128, frameHeight: 128 },
  c7d_door: { file: "props/c7d_door.png", frameWidth: 128, frameHeight: 128 },
};
export const CITADEL_IMAGES: Record<string, string> = {
  tile_citadel: "tiles/tile_citadel.png",
  dec_citadel_0: "props/dec_citadel_0.png",
  dec_citadel_1: "props/dec_citadel_1.png",
  dec_citadel_2: "props/dec_citadel_2.png",
  pillar_citadel: "props/pillar_citadel.png",
  c7d_window: "props/c7d_window.png",
  c7d_tannoy: "props/c7d_tannoy.png",
  c7d_cables: "props/c7d_cables.png",
  c7d_frame: "props/c7d_frame.png",
  c7d_skulls: "props/c7d_skulls.png",
  c7d_crt: "props/c7d_crt.png",
  c7d_banner: "props/c7d_banner.png",
  c7d_chain: "props/c7d_chain.png",
  c7d_crate: "props/c7d_crate.png",
  c7d_altar: "props/c7d_altar.png",
  c7d_neon: "props/c7d_neon.png",
  c7d_coffin: "props/c7d_coffin.png",
  c7d_bg_corridor: "backdrops/c7d_bg_corridor.png",
  c7d_bg_arches: "backdrops/c7d_bg_arches.png",
  c7d_bg_tower: "backdrops/c7d_bg_tower.png",
  c7d_bg_gallery: "backdrops/c7d_bg_gallery.png",
  c7_krex_gun: "combat/c7_krex_gun.png",
  c7_krex_arm: "combat/c7_krex_arm.png",
  c7_krex_tail: "combat/c7_krex_tail.png",
  c7_krex_legb: "combat/c7_krex_legb.png",
  c7_krex_legf: "combat/c7_krex_legf.png",
  c7_krex_head: "combat/c7_krex_head.png",
  c7_cybertruck: "combat/c7_cybertruck.png",
  c7_rocket: "combat/c7_rocket.png",
  // the Drongus Gun (from the Lair cutscene's own art)
  c7_drongus_gun: "props/c7_drongus_gun.png",
};

/** A texture that is only the procedural stand-in made at boot (so the real art should replace it). */
function procedural(sc: Phaser.Scene, key: string) {
  if (!sc.textures.exists(key)) return true;
  const src = sc.textures.get(key).source[0] as unknown as { isCanvas?: boolean };
  return !!src?.isCanvas;
}

/** Queue any of the dungeon's art the manifest didn't already load. Call from the scene's preload(). */
export function citadelPreload(sc: Phaser.Scene) {
  for (const [key, d] of Object.entries(CITADEL_SHEETS)) {
    if (!procedural(sc, key)) continue;
    if (sc.textures.exists(key)) sc.textures.remove(key);
    sc.load.spritesheet(key, `art/${d.file}`, { frameWidth: d.frameWidth, frameHeight: d.frameHeight });
  }
  for (const [key, file] of Object.entries(CITADEL_IMAGES)) if (!sc.textures.exists(key)) sc.load.image(key, `art/${file}`);
}

/** After loading: HD scales for the big sheets, and drawn stand-ins for anything still missing. */
export function citadelReady(sc: Phaser.Scene) {
  for (const [key, d] of Object.entries(CITADEL_SHEETS)) {
    if (!d.hd || !sc.textures.exists(key)) continue;
    const tex = sc.textures.get(key);
    if (!(tex.customData as { hd?: number }).hd) tex.customData = { ...tex.customData, hd: d.hd };
  }
  if (!sc.textures.exists("tile_citadel")) {
    const t = sc.textures.createCanvas("tile_citadel", 32, 32)!;
    const ctx = t.getContext();
    ctx.fillStyle = "#1c1424";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#261b31";
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillRect(17, 17, 14, 14);
    ctx.fillStyle = "#2c2038";
    ctx.fillRect(17, 1, 14, 14);
    ctx.fillRect(1, 17, 14, 14);
    ctx.fillStyle = "#7a1d4a";
    ctx.fillRect(0, 15, 32, 1);
    t.refresh();
  }
}

// ---------------------------------------------------------------- the dressing

export interface CitadelHost extends Phaser.Scene {
  player: { x: number; y: number; spr: Phaser.Physics.Arcade.Sprite };
  groundY: number;
  now(): number;
  toast(title: string, text: string): void;
  floatText(x: number, y: number, text: string, color?: string, size?: number): void;
  dropPickup(x: number, y: number, kind: "heal" | "ammo" | "bottle" | "coin" | "krezz", value: number): void;
}

export interface CitadelHooks {
  talk(lines: Line[]): Promise<void>;
  /** The anthem door has opened: the exit is open. */
  openExit(): void;
  inGap(x: number, pad?: number): boolean;
  door(): Phaser.GameObjects.Image;
  /** Add an E-to-use spot. */
  interact(it: { x: number; y: number; r: number; label: string; use: () => void | Promise<void>; enabled?: () => boolean }): void;
}

const NEON = 0xff2d95;
const PURPLE = 0xa855f7;

/** Every boss we can hang in the Anthem Corridor, in the order you met them. [texture, BOSS_TEXT id] */
const GALLERY: [string, string][] = [
  ["boss_krandall", "krandall"],
  ["boss_salmon", "salmon"],
  ["boss_feedback", "feedback"],
  ["boss_hoard", "hoard"],
  ["boss_machine", "machine"],
  ["boss_banhammer", "banhammer"],
  ["boss_spectre", "spectre"],
  ["boss_cronster", "cronster"],
  ["boss_reinhardt", "reinhardt"],
  ["boss_tankc", "tank"],
  ["boss_flirt", "flirt"],
  ["boss_lantern", "lantern"],
  ["boss_fruity", "fruity"],
  ["boss_stanley", "krozno"],
  ["boss_brand", "brand"],
  ["boss_troll", "troll"],
  ["boss_flatmate", "flatmate"],
  ["boss_rival", "rival"],
  ["boss_jam", "jam"],
  ["boss_rik", "rik"],
  ["boss_pudding_demon", "pudding_demon"],
  ["boss_krex", "krex"],
  ["boss_elon", "elon"],
];

export class Citadel {
  private layers: { ts: Phaser.GameObjects.TileSprite; f: number; k: number }[] = [];
  private guards: { spr: Phaser.GameObjects.Sprite; next: number }[] = [];
  private nextScold = 0;
  private stillSince = 0;
  private thanked = false;
  private anthemOn = false;
  private doorOpened = false;
  private bigDoor: Phaser.GameObjects.Sprite | null = null;
  private doorGlow: Phaser.GameObjects.Rectangle | null = null;
  private lightning: Phaser.GameObjects.Rectangle | null = null;
  private nextBolt = 0;

  constructor(private sc: CitadelHost, private room: RoomDef, private hooks: CitadelHooks) {}

  private get gy() {
    return this.sc.groundY;
  }

  // ---------------------------------------------------------------- shared bits

  private img(x: number, y: number, key: string, scale = 1, depth = 1, oy = 1) {
    if (!this.sc.textures.exists(key)) return null;
    return this.sc.add.image(x, y, key).setOrigin(0.5, oy).setScale(scale).setDepth(depth);
  }

  /** A flickering candle flame with a warm glow. */
  private flame(x: number, y: number, depth: number, size = 1) {
    const sc = this.sc;
    const fl = sc.add.ellipse(x, y, 5 * size, 9 * size, 0xfbbf24).setDepth(depth + 0.1);
    const glow = sc.add.circle(x, y, 16 * size, 0xf97316, 0.16).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: [fl, glow], scaleY: { from: 0.85, to: 1.2 }, alpha: { from: 0.7, to: 1 }, yoyo: true, repeat: -1, duration: 150 + Math.floor(Math.random() * 130) });
    this.flames.push({ fl, glow, y, lit: true });
  }

  private flames: { fl: Phaser.GameObjects.Ellipse; glow: Phaser.GameObjects.Arc; y: number; lit: boolean }[] = [];

  /** A candelabra (art, or drawn) with its flames. */
  private candelabra(x: number, y: number, scale: number, depth: number) {
    const c = this.img(x, y, "dec_citadel_0", scale, depth);
    if (c) {
      // the art's three candles: flames on their tips
      for (const dx of [-14, 0, 14]) this.flame(x + dx * (scale / 1.5), y - c.displayHeight + 6 * scale, depth + 0.5, scale * 0.7);
      return;
    }
    const g = this.sc.add.graphics().setDepth(depth);
    g.fillStyle(0x27272a, 1).fillRect(x - 2, y - 40 * scale, 4, 40 * scale).fillRect(x - 14 * scale, y - 40 * scale, 28 * scale, 3).fillRect(x - 9, y - 3, 18, 3);
    for (const dx of [-12, 0, 12]) {
      g.fillStyle(0xf5f5f4, 1).fillRect(x + dx * scale - 2, y - 50 * scale, 4, 10 * scale);
      this.flame(x + dx * scale, y - 54 * scale, depth + 0.5, scale);
    }
  }

  /** Lightning through the stained glass every few seconds (a white flash over the backdrop only). */
  private storm(depth: number) {
    this.lightning = this.sc.add.rectangle(0, 0, 960, 540, 0xe0e7ff, 0).setOrigin(0).setScrollFactor(0).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
    this.nextBolt = this.sc.time.now + 3000;
  }

  private bolt() {
    const l = this.lightning;
    if (!l) return;
    if (this.onStairs) this.sc.time.delayedCall(300 + Math.random() * 900, () => synth.play("thunder"));
    this.sc.tweens.chain({
      targets: l,
      tweens: [
        { fillAlpha: 0.45, duration: 50 },
        { fillAlpha: 0.05, duration: 90 },
        { fillAlpha: 0.32, duration: 50 },
        { fillAlpha: 0, duration: 500 },
      ],
    });
  }

  /** A framed portrait: the boss's own art in a gilded frame (w x h outside) with a brass plate. */
  private portrait(x: number, y: number, tex: string, label: string, depth: number, w = 120, h = 150) {
    const sc = this.sc;
    const art = sc.textures.exists("c7d_frame");
    // the frame art's opening is about 54% x 68% of it
    const iw = art ? w * 0.56 : w - 12;
    const ih = art ? h * 0.7 : h - 12;
    sc.add.rectangle(x, y, iw, ih, 0x2a0a16).setDepth(depth).setStrokeStyle(2, 0x000000);
    if (sc.textures.exists(tex)) {
      const p = sc.add.image(x, y + 4, tex, 0).setDepth(depth + 0.1);
      const fw = p.frame.width;
      const fh = p.frame.height;
      const k = Math.min((iw - 6) / fw, (ih - 6) / fh);
      p.setDisplaySize(fw * k, fh * k);
    }
    // a little varnish shine
    sc.add.rectangle(x - iw / 4, y - ih / 4, iw / 3, 5, 0xffffff, 0.06).setDepth(depth + 0.2).setAngle(-30);
    if (art) {
      sc.add.image(x, y, "c7d_frame").setDepth(depth + 0.3).setDisplaySize(w, h);
    } else {
      const g = sc.add.graphics().setDepth(depth + 0.3);
      g.lineStyle(10, 0xb8860b, 1).strokeRect(x - w / 2, y - h / 2, w, h);
      g.lineStyle(3, 0xfde68a, 1).strokeRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8);
      for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillStyle(0xfde68a, 1).fillCircle(x + (cx * w) / 2, y + (cy * h) / 2, 6);
    }
    if (!label) return;
    sc.add.rectangle(x, y + h / 2 + 14, Math.min(w + 60, label.length * 7 + 20), 18, 0x7a5a12).setDepth(depth + 0.3).setStrokeStyle(2, 0xfde68a);
    sc.add.text(x, y + h / 2 + 14, label, { fontFamily: "Georgia, serif", fontSize: "10px", color: "#fff7d6", fontStyle: "bold" }).setOrigin(0.5).setDepth(depth + 0.4);
  }

  /** The tannoy: a chime, a TANNOY tag on screen, and the lines. The AI's angry refusals flash the screen red. */
  async pa(lines: Line[]) {
    const sc = this.sc;
    synth.play("tannoy");
    const tag = sc.add.text(480, 34, "📢  TANNOY  📢", { fontFamily: "Impact, sans-serif", fontSize: "22px", color: "#ff4d6d", stroke: "#000", strokeThickness: 6, backgroundColor: "#12030acc", padding: { x: 10, y: 3 } }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);
    sc.tweens.add({ targets: tag, alpha: 0.55, yoyo: true, repeat: -1, duration: 420 });
    let chunk: Line[] = [];
    for (const l of lines) {
      if (l.sfx === "ai_deny") {
        if (chunk.length) await this.hooks.talk(chunk);
        chunk = [];
        this.deny();
        chunk.push({ ...l, sfx: undefined });
      } else chunk.push(l);
    }
    if (chunk.length) await this.hooks.talk(chunk);
    tag.destroy();
  }

  /** The AI says NO: harsh beep, the room flashes red, the tannoy rattles. */
  private deny() {
    const sc = this.sc;
    synth.play("ai_deny");
    sc.cameras.main.flash(420, 255, 0, 0);
    sc.cameras.main.shake(380, 0.012);
    const red = sc.add.rectangle(0, 0, 960, 540, 0xff0000, 0.35).setOrigin(0).setScrollFactor(0).setDepth(1990);
    const no = sc.add.text(480, 240, "✖ REQUEST DENIED ✖", { fontFamily: "Impact, sans-serif", fontSize: "54px", color: "#ffffff", stroke: "#7f0000", strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(1995).setScale(1.6);
    sc.tweens.add({ targets: no, scale: 1, duration: 160, ease: "Back.out" });
    sc.tweens.add({ targets: red, fillAlpha: 0.08, yoyo: true, repeat: 3, duration: 160, onComplete: () => sc.tweens.add({ targets: [red, no], alpha: 0, duration: 900, delay: 900, onComplete: () => (red.destroy(), no.destroy()) }) });
  }

  // ---------------------------------------------------------------- top-down (THE FOYER)

  topDown() {
    const r = this.room;
    const sc = this.sc;
    // dark, cold light; a red carpet up the middle to the door
    sc.add.rectangle(r.w / 2, r.h / 2 + 30, 170, r.h - 60, 0x5b0f1e).setDepth(0.5);
    sc.add.rectangle(r.w / 2 - 85, r.h / 2 + 30, 4, r.h - 60, 0xd4a017).setDepth(0.6);
    sc.add.rectangle(r.w / 2 + 85, r.h / 2 + 30, 4, r.h - 60, 0xd4a017).setDepth(0.6);
    for (let y = 120; y < r.h - 40; y += 90) sc.add.text(r.w / 2, y, "◆", { fontFamily: FONT, fontSize: "14px", color: "#d4a017" }).setOrigin(0.5).setDepth(0.6).setAlpha(0.6);
    // stained glass in the back wall, throwing coloured light down across the floor
    for (const x of [r.w * 0.14, r.w * 0.3, r.w * 0.7, r.w * 0.86]) {
      const win = this.img(x, 62, "c7d_window", 1, 1.5);
      if (!win) sc.add.rectangle(x, 34, 40, 56, 0x6d28d9).setDepth(1.5).setStrokeStyle(3, 0x111111);
      const beam = sc.add.graphics().setDepth(0.7).setBlendMode(Phaser.BlendModes.ADD);
      beam.fillStyle(x < r.w / 2 ? 0xa855f7 : 0xdc2626, 0.07).fillTriangle(x - 22, 60, x + 22, 60, x + 90, 420).fillTriangle(x - 22, 60, x + 90, 420, x - 60, 420);
      sc.tweens.add({ targets: beam, alpha: { from: 0.7, to: 1 }, yoyo: true, repeat: -1, duration: 2200 + Math.random() * 900 });
    }
    // the tannoy over the door
    this.img(r.w / 2 + 120, 58, "c7d_tannoy", 0.9, 2);
    // candelabras either side of the carpet, server racks humming in the corners
    for (let y = 200; y < r.h - 100; y += 210) for (const x of [r.w / 2 - 130, r.w / 2 + 130]) this.candelabra(x, y + 30, 1.2, y + 30);
    for (const [x, y] of [[70, 150], [r.w - 70, 150], [70, r.h - 70], [r.w - 70, r.h - 70]]) {
      const rack = this.img(x, y, "dec_citadel_1", 1.3, y);
      if (rack) {
        const led = sc.add.rectangle(x, y - 40, 30, 2, NEON, 0.9).setDepth(y + 1).setBlendMode(Phaser.BlendModes.ADD);
        sc.tweens.add({ targets: led, alpha: 0.2, yoyo: true, repeat: -1, duration: 300 + Math.random() * 400 });
      }
    }
    for (const [x, y] of [[r.w * 0.2, r.h - 40], [r.w * 0.8, r.h - 40]]) this.img(x, y, "c7d_skulls", 1.1, y);
    // cables snaking across the floor between the racks, glowing
    const g = sc.add.graphics().setDepth(0.8);
    for (const [a, b] of [[[90, 160], [r.w / 2 - 100, 260]], [[r.w - 90, 160], [r.w / 2 + 100, 300]]]) {
      g.lineStyle(4, 0x0b0b10, 1).beginPath().moveTo(a[0], a[1]);
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a[0], a[1]), new Phaser.Math.Vector2((a[0] + b[0]) / 2, b[1] + 120), new Phaser.Math.Vector2(b[0], b[1]));
      curve.draw(g, 24);
      g.lineStyle(1, NEON, 0.5);
      curve.draw(g, 24);
    }
    // gloom: a dark vignette, and the storm in the windows
    const v = sc.add.graphics().setDepth(2).setScrollFactor(0);
    v.fillStyle(0x0a0412, 0.4).fillRect(0, 0, 960, 40).fillRect(0, 500, 960, 40).fillRect(0, 0, 40, 540).fillRect(920, 0, 40, 540);
    sc.add.rectangle(0, 0, r.w, r.h, 0x16052a, 0.22).setOrigin(0).setDepth(1.9);
    this.storm(1.95);
  }

  // ---------------------------------------------------------------- side-on: Da Drongus Corridor / the Anthem Corridor

  /** Parallax arches over the backdrop, and the corridor's set dressing in the world. */
  side() {
    const r = this.room;
    const sc = this.sc;
    const gy = this.gy;
    if (sc.textures.exists("c7d_bg_arches")) {
      const src = sc.textures.get("c7d_bg_arches").getSourceImage();
      const k = 540 / src.height;
      const ts = sc.add.tileSprite(0, 0, 960, 540, "c7d_bg_arches").setOrigin(0).setScrollFactor(0).setDepth(-9).setTileScale(k).setAlpha(0.9);
      this.layers.push({ ts, f: 0.6, k });
    }
    // a purple haze along the floor, and dark at the top
    sc.add.rectangle(0, 0, 960, 140, 0x05010a, 0.55).setOrigin(0).setScrollFactor(0).setDepth(-8);
    const fog = sc.add.rectangle(0, 380, 960, 160, 0x4c1d95, 0.14).setOrigin(0).setScrollFactor(0).setDepth(-7).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: fog, fillAlpha: 0.22, yoyo: true, repeat: -1, duration: 2600 });
    this.storm(-8.5);
    // a neon strip along the floor's edge
    sc.add.rectangle(0, gy - 2, r.w, 3, NEON, 0.55).setOrigin(0).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    if (r.event === "anthem") return this.gallery();
    // set dressing: every few hundred pixels, something gothic or something humming
    let i = 0;
    for (let x = 260; x < r.w - 200; x += 300) {
      i++;
      const ground = !this.hooks.inGap(x, 60);
      switch (i % 6) {
        case 0:
          if (ground) {
            const rack = this.img(x, gy, "dec_citadel_1", 2, -2);
            if (rack) {
              const led = sc.add.rectangle(x, gy - 90, 46, 3, NEON, 0.9).setDepth(-1.9).setBlendMode(Phaser.BlendModes.ADD);
              sc.tweens.add({ targets: led, alpha: 0.15, yoyo: true, repeat: -1, duration: 260 + Math.random() * 500 });
            }
          }
          break;
        case 1:
          this.img(x, gy - 300, "c7d_window", 2.2, -3);
          break;
        case 2:
          if (ground) this.candelabra(x, gy, 1.8, -2);
          this.img(x + 90, 0, "c7d_cables", 2, -2.5, 0);
          break;
        case 3:
          this.img(x, 0, "c7d_banner", 2, -3, 0);
          if (ground) this.img(x + 70, gy, "c7d_skulls", 1.4, -2);
          break;
        case 4:
          // a portrait of the Supreme Leader, every few yards
          this.portrait(x, gy - 330, "boss_drongus", "OUR SUPREME LEADER", -3, 130, 150);
          if (ground) this.img(x, gy, "c7d_crt", 1.6, -2);
          break;
        default:
          this.img(x, gy - 260, "dec_citadel_2", 1.6, -3);
          this.img(x - 60, 0, "c7d_chain", 2, -2.5, 0);
          if (ground) this.img(x + 80, gy, "pillar_citadel", 2.2, -2.2);
      }
    }
  }

  /** A gothic-cyber ledge: dark stone, a magenta neon edge, little corbels underneath. */
  platform(x: number, y: number, w: number, tower: boolean) {
    const g = this.sc.add.graphics().setDepth(4);
    g.fillStyle(0x1a1222, 1).fillRect(x - w / 2, y - 7, w, 16);
    g.fillStyle(0x2a1f36, 1).fillRect(x - w / 2, y - 7, w, 5);
    for (let bx = x - w / 2 + 18; bx < x + w / 2 - 4; bx += 26) g.fillStyle(0x0d0812, 1).fillRect(bx, y - 2, 2, 11);
    g.fillStyle(NEON, 1).fillRect(x - w / 2, y - 9, w, 2);
    g.fillStyle(NEON, 0.18).fillRect(x - w / 2, y - 13, w, 4);
    for (let cx = x - w / 2 + 16; cx < x + w / 2 - 6; cx += 32) g.fillStyle(0x140d1b, 1).fillTriangle(cx - 9, y + 9, cx + 9, y + 9, cx, y + (tower ? 24 : 20));
    g.lineStyle(1, 0x000000, 0.7).strokeRect(x - w / 2, y - 7, w, 16);
    // a few blinking LEDs
    for (let lx = x - w / 2 + 10; lx < x + w / 2; lx += 44) {
      const led = this.sc.add.rectangle(lx, y + 2, 3, 3, Math.random() < 0.5 ? 0xef4444 : PURPLE).setDepth(4.1);
      this.sc.tweens.add({ targets: led, alpha: 0.15, yoyo: true, repeat: -1, duration: 250 + Math.random() * 700 });
    }
  }

  // ---------------------------------------------------------------- the tower (THE ASCENT)

  /** The shaft's back wall (scrolls slower than you climb), light through the glass, chains, racks, lightning. */
  tower(): Phaser.GameObjects.TileSprite {
    const r = this.room;
    const sc = this.sc;
    const gy = this.gy;
    let bg: Phaser.GameObjects.TileSprite;
    if (sc.textures.exists("c7d_bg_tower")) {
      const src = sc.textures.get("c7d_bg_tower").getSourceImage();
      bg = sc.add.tileSprite(0, 0, 960, 540, "c7d_bg_tower").setOrigin(0).setScrollFactor(0).setDepth(-12).setTileScale(960 / src.width);
    } else {
      bg = sc.add.tileSprite(0, 0, 960, 540, sc.textures.exists("tw_gothic") ? "tw_gothic" : "tile_citadel").setOrigin(0).setScrollFactor(0).setDepth(-12).setTileScale(2).setTint(0x6a4a8a);
    }
    sc.add.rectangle(0, 0, 960, 540, 0x0a0312, 0.3).setOrigin(0).setScrollFactor(0).setDepth(-11);
    this.storm(-10.5);
    // shafts of stained-glass light falling across the climb
    for (let y = gy - 200; y > 200; y -= 520) {
      const x = 160 + ((y * 7) % 640);
      const beam = sc.add.graphics().setDepth(-6).setBlendMode(Phaser.BlendModes.ADD);
      const col = (y / 520) % 2 < 1 ? PURPLE : 0xdc2626;
      beam.fillStyle(col, 0.08).fillTriangle(x - 30, y - 260, x + 30, y - 260, x + 260, y + 160).fillTriangle(x - 30, y - 260, x + 260, y + 160, x + 60, y + 160);
      sc.tweens.add({ targets: beam, alpha: { from: 0.6, to: 1 }, yoyo: true, repeat: -1, duration: 2400 + Math.random() * 1000 });
      this.img(x, y - 250, "c7d_window", 2, -7);
    }
    // chains and cables hanging down the sides, server racks bolted to the walls
    for (let y = gy; y > 0; y -= 128) {
      this.img(34, y, "c7d_chain", 2, -5);
      this.img(926, y - 64, "c7d_chain", 2, -5);
    }
    for (let y = gy - 400; y > 300; y -= 700) {
      this.img(60, y, "dec_citadel_1", 1.6, -5);
      this.img(900, y - 330, "dec_citadel_1", 1.6, -5);
      this.img(480, y - 160, "c7d_cables", 2.4, -6, 0);
    }
    // candelabras on some of the ledges
    (r.platforms ?? []).forEach(([fx, h, w], i) => {
      if (i % 3) return;
      this.candelabra(r.w * fx + (i % 2 ? -1 : 1) * (w / 2 - 18), gy - h - 7, 0.9, 6);
    });
    // red neon level numbers
    for (let f = 1; f * 336 < r.h - 300; f++) sc.add.text(48, gy - f * 336, `LEVEL ${f}`, { fontFamily: "Impact, sans-serif", fontSize: "16px", color: "#ff2d95" }).setDepth(-5).setAlpha(0.7).setShadow(0, 0, "#ff2d95", 8, false, true);
    return bg;
  }

  // ---------------------------------------------------------------- THE ANTHEM CORRIDOR

  private gallery() {
    const r = this.room;
    const sc = this.sc;
    const gy = this.gy;
    // the red carpet all the way to the door
    sc.add.rectangle(0, gy + 2, r.w, 12, 0x7f1d1d).setOrigin(0).setDepth(3.5);
    sc.add.rectangle(0, gy + 2, r.w, 2, 0xd4a017).setOrigin(0).setDepth(3.6);
    // the portraits of everyone you've beaten, high on the wall, candles underneath
    const pics = GALLERY.filter(([t]) => sc.textures.exists(t) || t === "boss_krex" || t === "boss_elon");
    const x0 = 700;
    const x1 = r.w - 900;
    const step = (x1 - x0) / Math.max(1, pics.length - 1);
    pics.forEach(([tex, id], i) => {
      const x = x0 + i * step;
      const y = gy - 300;
      this.img(x, 0, "c7d_banner", 1.6, -3.5, 0);
      this.portrait(x, y, sc.textures.exists(tex) ? tex : `${tex}_gen`, BOSS_TEXT[id]?.name ?? id.toUpperCase(), -3, 210, 240);
      this.candelabra(x - 120, gy - 120, 1, -2.5);
    });
    // the honour guard, all down the hall
    const key = sc.textures.exists("en_honour_guard") ? "en_honour_guard" : "en_soldier";
    for (let x = 420; x < r.w - 420; x += 240) {
      const spr = sc.add.sprite(x, gy + 2, key, 0).setOrigin(0.5, 1).setDepth(gy - 20);
      (spr as unknown as { big: number }).big = 1.35;
      spr.setScale(2);
      this.guards.push({ spr, next: 0 });
    }
    // supplies along the way: you'll want them for what's behind the door
    const kinds: ["ammo" | "heal" | "bottle", number][] = [["ammo", 2], ["heal", 25], ["ammo", 2], ["bottle", 1], ["heal", 25], ["ammo", 3]];
    kinds.forEach(([k, v], i) => {
      const x = 1100 + i * ((r.w - 2400) / (kinds.length - 1));
      if (k === "ammo") this.img(x + 34, gy + 2, "c7d_crate", 1.1, gy - 5);
      this.sc.dropPickup(x, gy - 20, k, v);
      if (k !== "ammo") this.sc.dropPickup(x + 30, gy - 20, "ammo", 1);
    });
    // the door: huge, red, at the very end
    const d = this.hooks.door();
    d.setAlpha(0);
    const dx = d.x;
    this.doorGlow = sc.add.rectangle(dx, gy - 190, 230, 380, 0xff0022, 0.08).setDepth(-1).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: this.doorGlow, fillAlpha: 0.18, yoyo: true, repeat: -1, duration: 1400 });
    if (sc.textures.exists("c7d_door")) {
      this.bigDoor = sc.add.sprite(dx, gy + 4, "c7d_door", 0).setOrigin(0.5, 1).setDepth(-0.5).setScale(3.2);
    } else {
      const g = sc.add.graphics().setDepth(-0.5);
      g.fillStyle(0x7f1d1d, 1).fillRect(dx - 100, gy - 340, 200, 340);
      g.lineStyle(6, 0x111111, 1).strokeRect(dx - 100, gy - 340, 200, 340).lineBetween(dx, gy - 340, dx, gy);
      g.fillStyle(0xd4a017, 1).fillCircle(dx - 18, gy - 170, 8).fillCircle(dx + 18, gy - 170, 8);
    }
    for (const x of [dx - 170, dx + 170]) this.candelabra(x, gy, 2, -0.4);
  }

  /** The anthem: the tannoy, the music from where the singing starts, everyone saluting. */
  async anthem() {
    synth.stopMusic();
    await this.pa(ANTHEM_PA);
    synth.music("anthem", true, 17.4 / 139.27);
    this.anthemOn = true;
    const sc = this.sc;
    const banner = sc.add.text(480, 92, "🎵 NOW PLAYING: THE KRELWORLD NATIONAL ANTHEM 🎵", { fontFamily: FONT, fontSize: "16px", color: "#ffd23f", backgroundColor: "#000000cc", padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(2000).setScrollFactor(0);
    sc.tweens.add({ targets: banner, alpha: 0, delay: 5000, duration: 800, onComplete: () => banner.destroy() });
    sc.toast("NO FIGHTING", "Run the length of the gallery to the red door. Grab the supplies on the way.");
    // everyone salutes
    for (const g of this.guards) {
      const n = g.spr.texture.frameTotal - 1;
      if (n > 2) {
        const k = `${g.spr.texture.key}_salute`;
        if (!sc.anims.exists(k)) sc.anims.create({ key: k, frames: sc.anims.generateFrameNumbers(g.spr.texture.key, { start: 0, end: n - 1 }), frameRate: 6, repeat: -1, yoyo: true });
        g.spr.play({ key: k, startFrame: Math.floor(Math.random() * n) });
      } else g.spr.setFrame(1);
    }
  }

  private scold(g: { spr: Phaser.GameObjects.Sprite; next: number }, line: string) {
    const sc = this.sc;
    const t = sc.add.text(0, 0, line, { fontFamily: "Impact, sans-serif", fontSize: "15px", color: "#7f1d1d" }).setOrigin(0.5);
    const w = t.width + 14;
    const h = t.height + 8;
    const b = sc.add.graphics();
    b.fillStyle(0xffffff, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, 7);
    b.fillTriangle(-6, h / 2 - 1, 6, h / 2 - 1, -2, h / 2 + 9);
    b.lineStyle(2, 0x111111, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 7);
    const c = sc.add.container(g.spr.x, g.spr.y - g.spr.displayHeight - 20, [b, t]).setDepth(1490).setScale(0.3);
    sc.tweens.add({ targets: c, scale: 1, duration: 140, ease: "Back.out" });
    sc.tweens.add({ targets: c, alpha: 0, delay: 1300, duration: 200, onComplete: () => c.destroy() });
  }

  /** Every frame: parallax, lightning, the guards telling you off, the door. */
  update(_dt: number) {
    const sc = this.sc;
    const cam = sc.cameras.main;
    for (const l of this.layers) l.ts.tilePositionX = (cam.scrollX * l.f) / l.k;
    if (this.lightning && sc.time.now > this.nextBolt) {
      this.nextBolt = sc.time.now + 4500 + Math.random() * 6000;
      this.bolt();
    }
    if (this.onStairs) this.updateStairs();
    if (!this.anthemOn) return;
    const p = sc.player;
    const now = sc.time.now;
    const moving = Math.abs((p.spr.body as Phaser.Physics.Arcade.Body).velocity.x) > 30 || Math.abs((p.spr.body as Phaser.Physics.Arcade.Body).velocity.y) > 60;
    if (moving) {
      this.stillSince = now;
      if (now > this.nextScold) {
        const near = this.guards.filter((g) => Math.abs(g.spr.x - p.x) < 230 && now > g.next);
        if (near.length) {
          const g = near[Math.floor(Math.random() * near.length)];
          g.next = now + 2600;
          this.nextScold = now + 420;
          this.scold(g, ANTHEM_SCOLDS[Math.floor(Math.random() * ANTHEM_SCOLDS.length)]);
        }
      }
    } else if (!this.thanked && now - this.stillSince > 2200) {
      const g = this.guards.find((gg) => Math.abs(gg.spr.x - p.x) < 300);
      if (g) {
        this.thanked = true;
        this.scold(g, "…THANK you.");
      }
    }
    // the door opens as you come up to it
    if (!this.doorOpened && p.x > this.room.w - 760) void this.openDoor();
  }

  private async openDoor() {
    this.doorOpened = true;
    const sc = this.sc;
    sc.cameras.main.shake(900, 0.006);
    synth.play("door");
    synth.play("mork");
    if (this.doorGlow) sc.tweens.add({ targets: this.doorGlow, fillAlpha: 0.5, scaleX: 1.2, duration: 1600 });
    const d = this.bigDoor;
    if (d) {
      const n = d.texture.frameTotal - 1;
      if (n > 2) {
        if (!sc.anims.exists("c7d_door_open")) sc.anims.create({ key: "c7d_door_open", frames: sc.anims.generateFrameNumbers("c7d_door", { start: 0, end: n - 1 }), frameRate: 5, repeat: 0 });
        d.play("c7d_door_open");
      } else sc.tweens.add({ targets: d, scaleX: 0.4, alpha: 0.4, duration: 2200, ease: "Sine.inOut" });
    }
    // red light pours out of the doorway
    const rays = sc.add.graphics().setDepth(-0.6).setBlendMode(Phaser.BlendModes.ADD);
    const dx = this.hooks.door().x;
    rays.fillStyle(0xff1a1a, 0.18).fillTriangle(dx, this.gy - 180, dx - 520, this.gy + 10, dx - 120, this.gy + 10);
    rays.setAlpha(0);
    sc.tweens.add({ targets: rays, alpha: 1, duration: 2200 });
    await this.hooks.talk(ANTHEM_DOOR);
    this.hooks.openExit();
    sc.toast("THE RED DOOR IS OPEN", "Walk through it. He's waiting.");
  }

  // ---------------------------------------------------------------- DRONGUS, PHASE ONE: the meeting

  /** Before the fight: the talk, the anime-style NO!! NEVER!!!, the chat logs. */
  async drongusMeet(x: number, y: number) {
    const sc = this.sc;
    const d = sc.add.sprite(x, y, sc.textures.exists("boss_drongus") ? "boss_drongus" : "spr_DRONGUS", 0).setDepth(450).setScale(3);
    const gun = sc.textures.exists("c7_drongus_gun") ? sc.add.image(x + 18, y - 8, "c7_drongus_gun").setScale(0.9).setDepth(451).setAngle(15) : null;
    await this.hooks.talk(DRONGUS1_MEET);
    await this.animeNever();
    await this.hooks.talk(DRONGUS1_LOGS);
    if (gun) sc.tweens.add({ targets: gun, angle: -10, duration: 300, ease: "Back.out" });
    sc.time.delayedCall(700, () => {
      d.destroy();
      gun?.destroy();
    });
  }

  /** Big anime shout: zoom in, speed lines, a huge caption, the screen shakes. */
  private async animeNever() {
    const sc = this.sc;
    const cam = sc.cameras.main;
    const p = sc.player;
    const objs: Phaser.GameObjects.GameObject[] = [];
    synth.play("roar");
    synth.play("cheer");
    cam.flash(250, 255, 255, 255);
    cam.shake(900, 0.02);
    const z0 = cam.zoom;
    sc.tweens.addCounter({ from: z0, to: 1.6, duration: 260, ease: "Cubic.out", onUpdate: (t) => cam.setZoom(t.getValue() ?? 1) });
    cam.pan(p.x, p.y - 20, 260, "Cubic.out");
    // speed lines, redrawn every few frames so they crackle
    const lines = sc.add.graphics().setScrollFactor(0).setDepth(1980);
    objs.push(lines);
    const draw = () => {
      lines.clear();
      lines.fillStyle(0x0b0410, 0.35).fillRect(0, 0, 960, 540);
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2;
        const r0 = 120 + Math.random() * 140;
        const r1 = 700;
        const w = 0.012 + Math.random() * 0.02;
        lines.fillStyle(i % 5 ? 0xffffff : 0xff2d95, 0.85);
        lines.fillTriangle(480 + Math.cos(a) * r0, 270 + Math.sin(a) * r0, 480 + Math.cos(a - w) * r1, 270 + Math.sin(a - w) * r1, 480 + Math.cos(a + w) * r1, 270 + Math.sin(a + w) * r1);
      }
    };
    draw();
    const tick = sc.time.addEvent({ delay: 70, loop: true, callback: draw });
    const cap = sc.add.text(480, 120, DRONGUS1_NEVER, { fontFamily: "Impact, sans-serif", fontSize: "86px", color: "#ffffff", stroke: "#b0003a", strokeThickness: 14 }).setOrigin(0.5).setScrollFactor(0).setDepth(1990).setScale(3).setAngle(-6);
    cap.setShadow(6, 6, "#000000", 0, true, true);
    objs.push(cap);
    sc.tweens.add({ targets: cap, scale: 1, duration: 220, ease: "Back.out" });
    sc.tweens.add({ targets: cap, x: { from: 476, to: 484 }, yoyo: true, repeat: -1, duration: 40 });
    await new Promise<void>((res) => sc.time.delayedCall(1300, () => res()));
    await this.hooks.talk(DRONGUS1_DEFY);
    tick.remove();
    sc.tweens.add({ targets: objs, alpha: 0, duration: 300, onComplete: () => objs.forEach((o) => o.destroy()) });
    sc.tweens.addCounter({ from: 1.6, to: z0, duration: 400, ease: "Cubic.inOut", onUpdate: (t) => cam.setZoom(t.getValue() ?? 1) });
    cam.pan(p.x, p.y, 400, "Cubic.inOut");
    await new Promise<void>((res) => sc.time.delayedCall(420, () => res()));
    cam.startFollow(p.spr, true, 0.12, 0.12);
  }

  // ---------------------------------------------------------------- THE FINAL STAIRS

  private onStairs = false;
  private echoes: { at: number; done: boolean; line: Line }[] = [];
  private sawDoor = false;

  /** No enemies. Near silence, a low drone, thunder, candles going out behind you, his voice from above. */
  stairs() {
    const sc = this.sc;
    const r = this.room;
    this.onStairs = true;
    synth.stopMusic();
    synth.play("drone");
    sc.time.addEvent({ delay: 7000, loop: true, callback: () => synth.play("drone") });
    const climb = r.exitAt ? r.exitAt[1] : r.h - 200;
    this.echoes = STAIRS_ECHOES.map((line, i) => ({ at: this.gy - climb * (0.22 + i * 0.3), done: false, line }));
    // the stone staircase itself, flight after flight, behind the landings you jump between
    const plats = r.platforms ?? [];
    const g = sc.add.graphics().setDepth(-4);
    for (let i = 0; i + 1 < plats.length; i++) {
      const [ax, ah] = plats[i];
      const [bx, bh] = plats[i + 1];
      if (bh <= ah) continue;
      const x0 = r.w * ax;
      const x1 = r.w * bx;
      const y0 = this.gy - ah;
      const y1 = this.gy - bh;
      const n = 6;
      for (let k = 0; k < n; k++) {
        const sx = Phaser.Math.Linear(x0, x1, k / n);
        const sy = Phaser.Math.Linear(y0, y1, (k + 1) / n);
        const w = Math.abs(x1 - x0) / n + 4;
        g.fillStyle(0x221830, 1).fillRect(sx - w / 2, sy, w, y0 - sy + 10);
        g.fillStyle(0x3a2c4a, 1).fillRect(sx - w / 2, sy, w, 4);
      }
    }
    // the door at the top: black iron, light leaking under it
    const d = this.hooks.door();
    d.setAlpha(0);
    const door = sc.textures.exists("c7d_door") ? sc.add.sprite(d.x, d.y + 30 + 7, "c7d_door", 0).setOrigin(0.5, 1).setScale(2.2).setDepth(5).setTint(0x8a7a9a) : null;
    const leak = sc.add.rectangle(d.x, d.y + 32, 150, 6, 0xff3b30, 0.6).setDepth(5.5).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: leak, alpha: 0.25, yoyo: true, repeat: -1, duration: 900 });
    let opened = false;
    this.hooks.interact({
      x: d.x,
      y: d.y,
      r: 110,
      label: "Open the door",
      enabled: () => !opened,
      use: async () => {
        opened = true;
        await this.hooks.talk(STAIRS_OPEN);
        synth.play("door");
        synth.play("mork");
        sc.cameras.main.shake(1600, 0.004);
        if (door) {
          door.clearTint();
          const n = door.texture.frameTotal - 1;
          if (!sc.anims.exists("c7d_door_slow")) sc.anims.create({ key: "c7d_door_slow", frames: sc.anims.generateFrameNumbers("c7d_door", { start: 0, end: Math.max(0, n - 1) }), frameRate: 3, repeat: 0 });
          door.play("c7d_door_slow");
        }
        const rays = sc.add.graphics().setDepth(5.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        rays.fillStyle(0xffb347, 0.22).fillTriangle(d.x, d.y - 40, d.x - 420, this.gy + 400, d.x + 420, this.gy + 400);
        rays.fillStyle(0xff3b30, 0.16).fillTriangle(d.x, d.y - 60, d.x - 260, this.gy + 400, d.x + 260, this.gy + 400);
        sc.tweens.add({ targets: rays, alpha: 1, duration: 2800 });
        await new Promise<void>((res) => sc.time.delayedCall(2800, () => res()));
        sc.cameras.main.flash(600, 255, 200, 160);
        this.hooks.openExit();
        sc.toast("THE DOOR IS OPEN", "Walk in. He's waiting.");
      },
    });
  }

  private updateStairs() {
    const sc = this.sc;
    const p = sc.player;
    // the candles go out as you pass them
    for (const f of this.flames)
      if (f.lit && f.y > p.y + 200) {
        f.lit = false;
        sc.tweens.killTweensOf([f.fl, f.glow]);
        sc.tweens.add({ targets: [f.fl, f.glow], alpha: 0, scaleY: 0.2, duration: 500 });
        const puff = sc.add.circle(f.fl.x, f.fl.y - 4, 3, 0x9ca3af, 0.6).setDepth(f.fl.depth);
        sc.tweens.add({ targets: puff, y: puff.y - 30, radius: 8, alpha: 0, duration: 1400, onComplete: () => puff.destroy() });
      }
    // his voice, echoing down
    for (const e of this.echoes)
      if (!e.done && p.y < e.at) {
        e.done = true;
        this.subtitle(String(e.line.s), e.line.t);
      }
    if (!this.sawDoor) {
      const d = this.hooks.door();
      if (p.y < d.y + 120) {
        this.sawDoor = true;
        void this.hooks.talk(STAIRS_DOOR);
      }
    }
  }

  /** A line said off-screen: a subtitle at the bottom, and the recorded voice if there is one. */
  private subtitle(who: string, text: string) {
    const sc = this.sc;
    voice.say(who, text);
    const t = sc.add.text(480, 470, `${who}: ${text}`, { fontFamily: "Georgia, serif", fontSize: "16px", color: "#fca5a5", fontStyle: "italic", align: "center", wordWrap: { width: 760 }, backgroundColor: "#000000aa", padding: { x: 10, y: 6 } }).setOrigin(0.5).setScrollFactor(0).setDepth(1900).setAlpha(0);
    sc.tweens.add({ targets: t, alpha: 1, duration: 600 });
    sc.tweens.add({ targets: t, alpha: 0, delay: 5200, duration: 900, onComplete: () => t.destroy() });
  }

  destroy() {
    this.onStairs = false;
    this.flames = [];
    this.layers = [];
    this.guards = [];
    this.anthemOn = false;
  }
}
