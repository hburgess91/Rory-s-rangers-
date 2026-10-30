import Phaser from "phaser";
import { backdrop } from "../gfx/HD";
import { G } from "../G";
import { PUB_CONVERSATIONS, PUB_SNIPPETS, type PubConversation } from "../../content/dialogue/pub";
import { ALL_EPISODES } from "../../content/television/channels";
import type { TVEpisode } from "../systems/tv";
import { evalCond } from "../systems/conditions";
import { DialogueBox } from "../ui/DialogueBox";
import { button, FONT, label, title } from "../ui/theme";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { bump, intoxLabel } from "../systems/stats";
import { activeMods } from "../../data/historicalRevisions";
import { canTurnIn, completePersonal, pickupsInHub, collectPickup, personalQuest, pickupFlag } from "../systems/quests";
import { CHARACTERS } from "../../data/characters";
import { dir, ping, say } from "../../content/dsl";
import { PLAYABLE_ORDER } from "../../data/characters";
import type { Line } from "../../data/types";

export class PubScene extends Phaser.Scene {
  /** SanMik & SanChz play the back room most nights. */
  private sanmikOn = true;
  private box!: DialogueBox;
  private menu!: Phaser.GameObjects.Container;
  private table!: Phaser.GameObjects.Container;
  private busy = false;
  private status!: Phaser.GameObjects.Text;
  private lastTable = "";
  // the telly over the bar
  private tvShow!: Phaser.GameObjects.Text;
  private tvSub!: Phaser.GameObjects.Text;
  private tvGlow!: Phaser.GameObjects.Rectangle;
  private tvEp: TVEpisode | null = null;
  private tvBeat = 0;

  constructor() {
    super("Pub");
  }

  create() {
    this.sanmikOn = Math.random() < 0.7;
    this.busy = false;
    this.cameras.main.fadeIn(300);
    const pubBg = this.add.tileSprite(0, 0, 960, 540, "tile_pub").setOrigin(0);
    if (backdrop(this, "bg_pub", { dim: 0.2, depth: -10 })) pubBg.setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(0x3b2a1a, 1).fillRect(0, 0, 960, 120);
    g.fillStyle(0x6b4527, 1).fillRect(0, 110, 960, 40);
    for (let i = 0; i < 5; i++) g.fillStyle([0x7a1f2b, 0x2f6b3a, 0xc6862a][i % 3], 1).fillRect(40 + i * 60, 40, 18, 50);
    title(this, 300, 20, "THE KREZZ ARMS", 26, "#e0a35a");
    this.add.text(300, 44, "Fizzy Bongos on tap. Pussy juice on the other tap.", { fontFamily: FONT, fontSize: "11px", color: "#d6c49a" }).setOrigin(0.5);
    // the telly, idling over the bar
    this.add.rectangle(760, 74, 286, 136, 0x111111).setStrokeStyle(4, 0x2a2a2a);
    this.tvGlow = this.add.rectangle(760, 74, 270, 120, 0x0c1a2a);
    this.tvShow = this.add.text(630, 18, "", { fontFamily: FONT, fontSize: "10px", color: "#7dd3fc", fontStyle: "bold" });
    this.tvSub = this.add.text(760, 80, "", { fontFamily: FONT, fontSize: "12px", color: "#ffffff", align: "center", wordWrap: { width: 250 } }).setOrigin(0.5);
    this.time.addEvent({ delay: 2800, loop: true, callback: () => this.tvTick() });
    this.tvTick();
    this.add.image(480, 330, "p_table").setScale(4);
    this.table = this.add.container(0, 0);
    this.menu = this.add.container(0, 0);
    this.status = label(this, 16, 516, "", 12, "#ffd23f");
    this.box = new DialogueBox(this, 1000);
    synth.music("pub");
    if (!this.scene.isActive("UI")) this.scene.launch("UI", { mode: "hub" });
    this.showMenu();
  }

  update() {
    const s = G.s;
    this.status.setText(`🍺 ${s.bongos} bongos · 💰 ${s.coins} · ${intoxLabel(s.intoxication)} (${Math.round(s.intoxication)}%)`);
  }

  // ------------------------------------------------------------- telly

  private tvTick() {
    const off = !!G.s.flags.pub_tv_off;
    this.tvGlow.setFillStyle(off ? 0x050505 : 0x0c1a2a);
    if (off) {
      this.tvShow.setText("");
      this.tvSub.setText("");
      return;
    }
    for (let guard = 0; guard < 60; guard++) {
      if (!this.tvEp || this.tvBeat >= this.tvEp.beats.length) {
        const eps = ALL_EPISODES.filter((e) => !e.unlockFlag || G.s.flags[e.unlockFlag]);
        this.tvEp = eps[Math.floor(Math.random() * eps.length)] ?? null;
        this.tvBeat = 0;
        if (!this.tvEp) return;
        this.tvShow.setText(`📺 ${this.tvEp.show}`.slice(0, 44));
      }
      const b = this.tvEp.beats[this.tvBeat++];
      if (b.type === "speaker") {
        this.tvSub.setText(`${b.character}: ${b.text}`.slice(0, 150));
        return;
      }
      if (b.type === "titleCard") {
        this.tvSub.setText(b.text.toUpperCase());
        return;
      }
      if (b.type === "audience") {
        this.tvSub.setText(b.cue === "biglaugh" ? "[UPROARIOUS LAUGHTER]" : b.cue === "laugh" ? "[LAUGHTER]" : `[${b.cue.toUpperCase()}]`);
        return;
      }
    }
  }

  // ------------------------------------------------------------- menu

  private showMenu() {
    this.menu.removeAll(true);
    const s = G.s;
    const items: [string, () => void][] = [];
    items.push(["🪑 Sit down with whoever's in tonight", () => this.sit()]);
    items.push(["🍺 Get a Fizzy Bongo in at the bar (10 Krezzcoin)", () => this.drinkHere()]);
    items.push(["🛍 Fizzy Bongo to take away (12 Krezzcoin)", () => this.buy()]);
    items.push([s.flags.pub_tv_off ? "📺 Turn the telly back on" : "📺 Turn the telly off", () => this.toggleTv()]);
    if (this.sanmikOn) items.push(["🎤 Back room: SANMIK & SANCHZ are on (live, mid-song)", () => switchTo(this, "Venue", {})]);
    if (s.player !== "KREBON" && !s.flags.krebon_gone && s.flags.met_emergency) items.push(["🎸 Back room: Twitcher Mutiny are on. It's getting rowdy.", () => switchTo(this, "Minigame", { mode: "gig", returnAt: "PUB" })]);
    {
      const names: Record<string, string> = { crazy: "'Krazy For The Krelworld' (Drongus)", flenky: "'Flenky' (SanChz)", crocodile: "'Do The Crocodile' (SanMik)" };
      const order = ["crazy", "flenky", "crocodile"];
      const next = order[((s.flags.jukebox_next as number) ?? 0) % 3];
      const playing = order.includes(synth.playingFile());
      items.push([playing && next === "crazy" ? "🎵 Jukebox: stop the music" : `🎵 Jukebox: ${names[next]} (2 Krezzcoin)`, () => this.jukebox()]);
    }
    const q = personalQuest(s);
    if (q && pickupsInHub(s).some((p) => p.anchor === "PUB_MENU")) items.push(["📜 Nick the menu off the bar", () => this.readMenu()]);
    if (canTurnIn(s, "PUB")) items.push(["✨ Open Krezmond's treasure", () => this.turnIn()]);
    items.push(["🚪 Leave", () => switchTo(this, "Hub", { at: "PUB" })]);
    const step = Math.min(42, 330 / Math.max(1, items.length - 1));
    const top = 190;
    items.forEach(([t, fn], i) => this.menu.add(button(this, 480, top + i * step, t, () => !this.busy && fn(), { w: 620, h: Math.max(24, step - 6), size: 14 })));
  }

  private toggleTv() {
    G.s.flags.pub_tv_off = !G.s.flags.pub_tv_off;
    synth.play("tap");
    this.tvTick();
    this.showMenu();
  }

  private async jukebox() {
    const s = G.s;
    const tracks = ["crazy", "flenky", "crocodile"];
    const now = synth.playingFile();
    if (tracks.includes(now) && (s.flags.jukebox_next as number) === 0) {
      synth.music("pub");
      this.showMenu();
      return;
    }
    if (s.coins < 2) return this.play([dir("The jukebox wants 2 Krezzcoin. You have the lore but not the coin.")]);
    s.coins -= 2;
    const i = ((s.flags.jukebox_next as number) ?? 0) % tracks.length;
    s.flags.jukebox_next = (i + 1) % tracks.length;
    synth.music(tracks[i], true);
    this.showMenu();
    const lines: Record<string, Line[]> = {
      crazy: [
        dir("NOW PLAYING: 'Krazy For The Krelworld'. The whole pub turns to look at the jukebox, then at you, then at their phones."),
        ping("DRONGUS", "Is that my song playing in the Krezz Arms ??"),
        ping("DRONGUS", "Someone react to it. Anyone. Please. Thumbs up will do"),
        say("KREZMAR", "Absolute banger. I'd rather die than react."),
      ],
      flenky: [
        dir("NOW PLAYING: 'Flenky' — SanChz, from the diss album. The pub goes quiet. Somebody turns it up."),
        say("FLENKY", "Is this... is this about me?", { variants: { FLENKY: "(It's about you. It's definitely about you. You will fight for their honour in Brazilian jujitsu.)" } }),
        say("POLSON", "SanChz. Fourth album. Best one. I AM THE NEW COLETRAIN."),
        say("MIKEY", "I uploaded it. Had to fix the cover art. Needs to be a perfect square."),
        say("KREBLIS", "Flenky jenky is quite renky."),
      ],
      crocodile: [
        dir("NOW PLAYING: 'Do The Crocodile' — SanMik. Nine men at the bar slowly raise their left hands. Very seriously."),
        say("MIKEY", "YOU TAKE YOUR LEFT HAND."),
        say("GRONNY", "And go like this."),
      ],
    };
    await this.play(lines[tracks[i]]);
  }

  private async play(lines: Line[]) {
    this.busy = true;
    this.menu.setVisible(false);
    await this.box.play(lines);
    this.menu.setVisible(true);
    this.busy = false;
    G.save();
  }

  // ------------------------------------------------------------- the table

  /** A random table: a story conversation or a real-chat snippet, whoever's in tonight. */
  private async sit() {
    const s = G.s;
    const pool = [...PUB_CONVERSATIONS.filter((c) => evalCond(c.cond, s)), ...PUB_SNIPPETS].filter((c) => c.id !== this.lastTable && c.seats.every((id) => id === s.player || id === "DRONGUS" || this.textures.exists(`spr_${id}`)));
    const fresh = pool.filter((c) => !s.flags[`pub_${c.id}`]);
    const pick = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
    if (!pick) return;
    this.lastTable = pick.id;
    const seats = pick.seats.includes(s.player) ? pick.seats : [...pick.seats, s.player];
    this.table.removeAll(true);
    const gap = Math.min(150, 640 / seats.length);
    seats.forEach((id, i) => {
      const x = 480 - ((seats.length - 1) * gap) / 2 + i * gap;
      const key = this.textures.exists(`spr_${id}`) ? `spr_${id}` : `spr_${s.player}`;
      const spr = this.add.sprite(x, 290, key, 0).setScale(3.4);
      const sway = s.intoxication / 100;
      if (sway > 0.15) this.tweens.add({ targets: spr, angle: { from: -8 * sway, to: 8 * sway }, yoyo: true, repeat: -1, duration: 900 - sway * 400 });
      this.table.add(spr);
      this.table.add(this.add.text(x, 240, id === s.player ? "YOU" : CHARACTERS[id]?.name ?? id, { fontFamily: FONT, fontSize: "11px", color: "#ffffff", backgroundColor: "#00000088" }).setOrigin(0.5));
    });
    await this.play(pick.lines);
    s.flags[`pub_${pick.id}`] = true;
    if (pick.unlocksArchive) G.unlockArchive(pick.unlocksArchive);
    this.table.removeAll(true);
    this.showMenu();
  }

  // ------------------------------------------------------------- the bar

  private async drinkHere() {
    const s = G.s;
    if (s.coins < 10) {
      G.emit("toast", { title: "BARMAN", text: "Ten Krezzcoin. No IOUs. Not even for Krezmar." });
      return;
    }
    s.coins -= 10;
    s.intoxication = Math.min(100, s.intoxication + 16);
    const heal = activeMods(s).beerHeal;
    if (heal) s.hp += heal;
    bump(s, "bongos_drunk");
    synth.play("gulp");
    if (s.intoxication >= 70) return this.brawl();
    const quips = [
      "Lovely.",
      "The barman nods. You've earned that nod.",
      "Somebody at the bar says 'bere hehe'. You say it back.",
      "Krezmar asks if you're getting a round in. You are not.",
      "The conversations are getting more honest.",
      "You're starting to think the pub telly is talking to you.",
      "You've got the face on. One more and you'll be wanting a fight.",
    ];
    const q = s.intoxication > 50 ? quips[6] : quips[Math.floor(Math.random() * 6)];
    G.emit("toast", { title: "🍺 FIZZY BONGO", text: `${intoxLabel(s.intoxication)}. ${q}` });
  }

  private buy() {
    const s = G.s;
    if (s.coins < 12) {
      G.emit("toast", { title: "BARMAN", text: "Twelve Krezzcoin for takeaway. Container deposit." });
      return;
    }
    s.coins -= 12;
    s.bongos += 1;
    synth.play("coin");
    G.emit("toast", { title: "TAKEAWAY", text: "+1 Fizzy Bongo. Press B in a fight." });
  }

  /** Too many bongos: you start shoving people. A short, mashy pub brawl, then you're thrown out. */
  private async brawl() {
    const s = G.s;
    const me = s.player;
    this.busy = true;
    this.menu.setVisible(false);
    this.table.removeAll(true);
    const crowdIds = Phaser.Utils.Array.Shuffle(PLAYABLE_ORDER.filter((id) => id !== me && this.textures.exists(`spr_${id}`)).slice()).slice(0, 4) as string[];
    const shoveLines = ["Wot u lookin at!!", "Eh?? Wot r u tryin 2 say?!", "Sounds lyke ur cumin on2 me 😡", "Wot goin on I cud take any1 anytyme!!!", "Oi. OI. You spilt me bongo.", "Let's av a fite."];
    await this.box.play([
      dir("The room tilts. Somebody at the bar looks at you. Funny."),
      say(me, shoveLines[Math.floor(Math.random() * shoveLines.length)]),
      say(crowdIds[0], ["Mate. Sit down.", "Is he alright?", "Here we go.", "Fair enough."][Math.floor(Math.random() * 4)]),
      dir("You shove them. They shove you back. A stool goes over. It's on."),
    ]);
    // ---- the brawl: tap / SPACE to swing at whoever's nearest
    const layer = this.add.container(0, 0).setDepth(500);
    const hero = this.add.sprite(480, 330, `spr_${me}`, 0).setScale(3.4);
    const foes = crowdIds.map((id, i) => {
      const spr = this.add.sprite(i < 2 ? 200 + i * 110 : 650 + (i - 2) * 110, 330 + (i % 2) * 30, `spr_${id}`, 0).setScale(3.2);
      spr.setData("hp", 3);
      return spr;
    });
    layer.add([hero, ...foes]);
    const hud = this.add.text(480, 170, "BRAWL! Tap / SPACE to swing", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#ff6b6b", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setDepth(600);
    synth.play("roar");
    let landed = 0;
    let taken = 0;
    const pops = (x: number, y: number, t: string, c = "#ffd23f") => {
      const p = this.add.text(x, y, t, { fontFamily: "Impact, sans-serif", fontSize: "26px", color: c, stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(700);
      this.tweens.add({ targets: p, y: y - 50, alpha: 0, duration: 700, onComplete: () => p.destroy() });
    };
    const swing = () => {
      const alive = foes.filter((f) => f.active && (f.getData("hp") as number) > 0);
      if (!alive.length) return;
      const tgt = alive.reduce((a, b) => (Math.abs(a.x - hero.x) < Math.abs(b.x - hero.x) ? a : b));
      const side = Math.sign(tgt.x - hero.x) || 1;
      this.tweens.add({ targets: hero, x: tgt.x - side * 70, duration: 90 });
      hero.setFlipX(side < 0);
      synth.play(Math.random() < 0.3 ? "punch_big" : "punch");
      this.cameras.main.shake(90, 0.006);
      landed++;
      const hp = (tgt.getData("hp") as number) - 1;
      tgt.setData("hp", hp);
      pops(tgt.x, tgt.y - 60, ["POW!", "SHOVE!", "BOSH!", "WALLOP!", "KREZZ!"][Math.floor(Math.random() * 5)]);
      this.tweens.add({ targets: tgt, x: tgt.x + side * 40, angle: side * 20, duration: 120, yoyo: true });
      if (hp <= 0) {
        this.tweens.add({ targets: tgt, x: tgt.x + side * 400, y: tgt.y - 120, angle: side * 720, alpha: 0, duration: 700 });
        pops(tgt.x, tgt.y - 100, "OUT THE DOOR!", "#ff6b6b");
      }
      // a stool or a pint goes flying
      if (Math.random() < 0.4) {
        const r = this.add.rectangle(tgt.x, tgt.y, 20, 26, Math.random() < 0.5 ? 0x8b5a2b : 0xf5c542).setDepth(650);
        this.tweens.add({ targets: r, x: r.x + (Math.random() - 0.5) * 500, y: r.y - 150 - Math.random() * 100, angle: 540, alpha: 0, duration: 800, onComplete: () => r.destroy() });
        synth.play("smash");
      }
    };
    const onKey = () => swing();
    this.input.keyboard?.on("keydown-SPACE", onKey);
    this.input.keyboard?.on("keydown-E", onKey);
    this.input.on("pointerdown", onKey);
    // they swing back
    const back = this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        const alive = foes.filter((f) => (f.getData("hp") as number) > 0);
        if (!alive.length) return;
        const f = alive[Math.floor(Math.random() * alive.length)];
        this.tweens.add({ targets: f, x: hero.x + (f.x < hero.x ? -60 : 60), duration: 150, yoyo: true });
        taken++;
        synth.play("hurt");
        this.cameras.main.flash(80, 120, 0, 0);
        pops(hero.x, hero.y - 80, "OOF", "#ffffff");
      },
    });
    await new Promise<void>((resolve) => {
      const end = this.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          const left = foes.filter((f) => (f.getData("hp") as number) > 0).length;
          hud.setText(left ? `BRAWL! Tap / SPACE to swing · ${left} still standing` : "LAST ONE STANDING");
          if (!left) {
            end.remove();
            resolve();
          }
        },
      });
      this.time.delayedCall(9000, () => {
        end.remove();
        resolve();
      });
    });
    back.remove();
    this.input.keyboard?.off("keydown-SPACE", onKey);
    this.input.keyboard?.off("keydown-E", onKey);
    this.input.off("pointerdown", onKey);
    const won = foes.every((f) => (f.getData("hp") as number) <= 0);
    hud.destroy();
    await this.box.play([
      dir(won ? "Silence. Every one of them is on the floor or on the pavement. You are the last one standing in the Krezz Arms." : "It's a mess. Chairs, bongos, a shoe. Nobody is winning."),
      say("BARMAN", "RIGHT. OUT. THE LOT OF YA."),
      dir(`You threw ${landed} punches and took ${taken}. The barman throws you out by the collar.`),
      say(crowdIds[1] ?? "GRONNY", ["Same time next week?", "Fair enough.", "Group fight. Love it.", "I'll go first next time."][Math.floor(Math.random() * 4)]),
    ]);
    layer.destroy();
    s.intoxication = 35;
    s.hp = Math.max(1, s.hp - taken * 3);
    s.flags.pub_brawls = ((s.flags.pub_brawls as number) ?? 0) + 1;
    if (won) s.coins += 15;
    G.save();
    this.busy = false;
    G.emit("toast", { title: "THROWN OUT OF THE KREZZ ARMS", text: won ? "Last one standing. +15 Krezzcoin (found on the floor)." : "You'll be back. You always come back." });
    switchTo(this, "Hub", { at: "PUB" });
  }

  private async readMenu() {
    const s = G.s;
    const q = personalQuest(s);
    const menuPickup = pickupsInHub(s).find((p) => p.anchor === "PUB_MENU");
    if (!menuPickup || !q) return;
    await this.play([
      dir("THE KREZZ ARMS — MENU. Scrawled at the bottom, half rubbed out: 'Krebon   Real butter .. krebon is coming'"),
      say("KREBON", "There it is. The menu. I'm taking it."),
    ]);
    collectPickup(s, q, menuPickup.spot);
    synth.play("pickup");
    G.emit("toast", { title: "PERSONAL QUEST", text: `${q.title}: The Menu acquired.` });
    this.showMenu();
  }

  private async turnIn() {
    const q = canTurnIn(G.s, "PUB");
    if (!q) return;
    await this.play(q.turnIn.lines);
    const coins = completePersonal(G.s, q);
    G.emit("toast", { title: "PERSONAL QUEST COMPLETE", text: `${q.title}: +${coins} Krezzcoin. ${q.reward.desc}` });
    this.showMenu();
  }
}
