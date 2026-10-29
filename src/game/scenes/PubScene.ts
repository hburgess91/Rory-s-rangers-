import Phaser from "phaser";
import { G } from "../G";
import { PUB_CONVERSATIONS, type PubConversation } from "../../content/dialogue/pub";
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
import type { Line } from "../../data/types";

export class PubScene extends Phaser.Scene {
  private box!: DialogueBox;
  private menu!: Phaser.GameObjects.Container;
  private table!: Phaser.GameObjects.Container;
  private busy = false;
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super("Pub");
  }

  create() {
    this.busy = false;
    this.cameras.main.fadeIn(300);
    this.add.tileSprite(0, 0, 960, 540, "tile_pub").setOrigin(0);
    const g = this.add.graphics();
    g.fillStyle(0x3b2a1a, 1).fillRect(0, 0, 960, 120);
    g.fillStyle(0x6b4527, 1).fillRect(0, 110, 960, 40);
    for (let i = 0; i < 9; i++) {
      g.fillStyle([0x7a1f2b, 0x2f6b3a, 0xc6862a][i % 3], 1).fillRect(60 + i * 100, 40, 18, 50);
    }
    this.add.image(860, 70, "p_tv").setScale(3);
    title(this, 480, 20, "THE KREZZ ARMS", 26, "#e0a35a");
    this.add.text(480, 44, "Est. whenever the lore says. Fizzy Bongos on tap. Pussy juice on the other tap.", { fontFamily: FONT, fontSize: "11px", color: "#d6c49a" }).setOrigin(0.5);
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

  private showMenu() {
    this.menu.removeAll(true);
    const s = G.s;
    const convs = PUB_CONVERSATIONS.filter((c) => evalCond(c.cond, s));
    const items: [string, () => void][] = [];
    convs.forEach((c) => items.push([`${s.flags[`pub_${c.id}`] ? "✓ " : "• "}Sit with ${c.seats.map((x) => (x === s.player ? "you" : CHARACTERS[x]?.name ?? x)).join(", ")}: "${c.title}"`, () => this.sit(c)]));
    items.push(["🍺 Drink a Fizzy Bongo here (10 Krezzcoin)", () => this.drinkHere()]);
    items.push(["🛍 Buy a Fizzy Bongo to take away (12 Krezzcoin)", () => this.buy()]);
    items.push(["📺 Watch the pub telly", () => this.tv()]);
    items.push(["📜 Read the menu", () => this.readMenu()]);
    items.push([synth.playingFile() === "crazy" ? "🎵 Jukebox: stop the song" : "🎵 Jukebox: 'Krazy For The Krelworld' (2 Krezzcoin)", () => this.jukebox()]);
    if (canTurnIn(s, "PUB")) items.push(["✨ Open Krezmond's treasure", () => this.turnIn()]);
    items.push(["🚪 Leave", () => switchTo(this, "Hub", { at: "PUB" })]);
    items.forEach(([t, fn], i) => this.menu.add(button(this, 480, 180 + i * 36, t, () => !this.busy && fn(), { w: 760, h: 32, size: 13 })));
  }

  private async jukebox() {
    const s = G.s;
    if (synth.playingFile() === "crazy") {
      synth.music("pub");
      this.showMenu();
      return;
    }
    if (s.coins < 2) return this.play([dir("The jukebox wants 2 Krezzcoin. You have the lore but not the coin.")]);
    s.coins -= 2;
    synth.music("crazy", true);
    this.showMenu();
    await this.play([
      dir("NOW PLAYING: 'Krazy For The Krelworld'. The whole pub turns to look at the jukebox, then at you, then at their phones."),
      ping("DRONGUS", "Is that my song playing in the Krezz Arms ??"),
      ping("DRONGUS", "Someone react to it. Anyone. Please. Thumbs up will do"),
      say("KREZMAR", "Absolute banger. I'd rather die than react."),
    ]);
  }

  private async play(lines: Line[]) {
    this.busy = true;
    this.menu.setVisible(false);
    await this.box.play(lines);
    this.menu.setVisible(true);
    this.busy = false;
    G.save();
  }

  private async sit(c: PubConversation) {
    const s = G.s;
    this.table.removeAll(true);
    c.seats.forEach((id, i) => {
      const x = 330 + i * 150;
      const spr = this.add.sprite(x, 290, `spr_${id}`, 0).setScale(3.4);
      const sway = s.intoxication / 100;
      if (sway > 0.15) this.tweens.add({ targets: spr, angle: { from: -8 * sway, to: 8 * sway }, yoyo: true, repeat: -1, duration: 900 - sway * 400 });
      this.table.add(spr);
      this.table.add(this.add.text(x, 240, id === s.player ? "YOU" : CHARACTERS[id]?.name ?? id, { fontFamily: FONT, fontSize: "11px", color: "#ffffff", backgroundColor: "#00000088" }).setOrigin(0.5));
    });
    if (s.intoxication < 25) G.emit("toast", { title: "THE KREZZ ARMS", text: "Some stories only come out after a few bongos. Drink (B or the menu) and sit again." });
    await this.play(c.lines);
    s.flags[`pub_${c.id}`] = true;
    if (c.unlocksArchive) G.unlockArchive(c.unlocksArchive);
    this.table.removeAll(true);
    this.showMenu();
  }

  private drinkHere() {
    const s = G.s;
    if (s.coins < 10) {
      G.emit("toast", { title: "BARMAN", text: "Ten Krezzcoin. No IOUs. Not even for Krezmar." });
      return;
    }
    s.coins -= 10;
    s.intoxication = Math.min(100, s.intoxication + 18);
    const heal = activeMods(s).beerHeal;
    if (heal) s.hp += heal;
    bump(s, "bongos_drunk");
    synth.play("bongo");
    if (s.intoxication >= 100) {
      this.play([dir("You are Absolutely Krezzed. The room spins. Gronny appears (whether or not he's here) and says 'fair enough'."), dir("You wake up at home. Somebody has written 'pls' on your forehead.")]).then(() => {
        s.intoxication = 30;
        switchTo(this, "Hub", { at: "HOME" });
      });
      return;
    }
    G.emit("toast", { title: "🍺 FIZZY BONGO", text: `${intoxLabel(s.intoxication)}. ${s.intoxication > 50 ? "The conversations are getting more honest." : "Lovely."}` });
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

  private tv() {
    this.scene.launch("TV", { overlay: true, caller: "Pub" });
    this.scene.pause();
  }

  private async readMenu() {
    const s = G.s;
    const q = personalQuest(s);
    const menuPickup = pickupsInHub(s).find((p) => p.anchor === "PUB_MENU");
    const lines: Line[] = [
      dir("THE KREZZ ARMS — MENU"),
      dir("Bongus Burger · Chicken Doznik · Krezpy Kream Drongnuts · Umami Punani (6 or 12) · Cheesy Scronties (down south) · Choccy Cronstons (as found in nan's drawer)"),
    ];
    if (s.flags.pq_done_pq_krebon) lines.push(dir("NEW: KREBON — REAL BUTTER. (The prophecy is complete.)"));
    else lines.push(dir("Scrawled at the bottom, half rubbed out: 'Krebon   Real butter .. krebon is coming'"));
    if (menuPickup && q) {
      lines.push(say("KREBON", "There it is. The menu. I'm taking it."));
      await this.play(lines);
      collectPickup(s, q, menuPickup.spot);
      synth.play("pickup");
      G.emit("toast", { title: "PERSONAL QUEST", text: `${q.title}: The Menu acquired.` });
      return;
    }
    if (q && s.player === "KREBON" && s.flags[pickupFlag(q, q.pickups[0])]) lines.push(say("KREBON", "I already took the menu. They printed a new one. Same prophecy."));
    await this.play(lines);
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
