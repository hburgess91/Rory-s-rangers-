import Phaser from "phaser";
import { G } from "../G";
import { button, FONT, panel, title, UI } from "../ui/theme";
import { switchTo, currentStep } from "../Flow";
import { synth } from "../audio/Synth";
import { CHARACTERS } from "../../data/characters";
import { GENERIC_UPGRADES, upgradeCost, maxHp, counter } from "../systems/stats";
import { GUNS, GUN_ORDER, gunMax } from "../combat/Guns";
import { Companion } from "../combat/Companion";
import { arcsFor, arcAvailable, currentArcSteps, stepDone } from "../systems/arcs";
import { personalQuest, pickupsCollected, MINISTRY_QUESTS, ministryQuestState, ministryProgress } from "../systems/quests";
import { factById } from "../../data/historicalRevisions";
import { narrativeActor } from "../systems/narrative";
import { DialogueBox } from "../ui/DialogueBox";
import { say } from "../../content/dsl";

type Mode = "pause" | "settings" | "bank" | "tribunal" | "death" | "quests";

/** Overlay menus: pause, settings, bank (upgrades), ban tribunal, quests, death. */
const BANK_PERKS = [
  { id: "pk_armor", name: "Krez-Proof Vest", desc: "Armour: take 10% less damage per level. Hi-vis. Smells of Lynx Africa.", cost: 170, max: 3 },
  { id: "pk_meter", name: "Pre-Workout (Bootleg)", desc: "Wonk and Fart meters fill 30% faster per level.", cost: 160, max: 2 },
  { id: "pk_autoaim", name: "Auto-Aim (Krezz-Assist)", desc: "Your attacks and guns lock onto the nearest enemy automatically.", cost: 300, max: 1 },
  { id: "pk_spd", name: "Fresh Trainers", desc: "+7% movement speed per level. Krunch-approved. Smell of new.", cost: 140, max: 3 },
  { id: "pk_dmg", name: "Krunch Gym Membership", desc: "+8% damage from everything per level. You don't go. You just have it.", cost: 160, max: 3 },
  { id: "pk_rof", name: "Itchy Trigger Finger", desc: "Guns fire 10% faster per level.", cost: 150, max: 3 },
  { id: "pk_ammo", name: "Bigger Pockets", desc: "+25% max ammo for every gun per level. Krez-ousers with cargo pockets.", cost: 180, max: 2 },
  { id: "pk_dodge", name: "Ninja Backflip Lessons", desc: "Dodge cooldown -15% per level. Taught by Flenky. Got out just in time.", cost: 170, max: 2 },
];
const BANK_MOVES = [
  { id: "mv_charge", name: "Pub Shove", desc: "Your dodge becomes a shoulder charge: damages and flings anything you barrel through.", cost: 320 },
  { id: "mv_fart", name: "Fart Propulsion", desc: "Every dodge leaves a lingering fart cloud that hurts and slows enemies.", cost: 280 },
  { id: "mv_lastorders", name: "Last Orders", desc: "Drinking pussy juice (Q) sends out a shockwave that knocks everything around you flying.", cost: 360 },
];

export class MenuScene extends Phaser.Scene {
  private bankTab: "upgrades" | "armoury" | "perks" | "moves" = "upgrades";
  private mode: Mode = "pause";
  private caller = "";
  private data0: any = {};
  private root!: Phaser.GameObjects.Container;
  private escKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super("Menu");
  }

  create(data: any) {
    this.data0 = data ?? {};
    this.caller = data?.caller ?? "";
    this.root = this.add.container(0, 0);
    this.escKey = this.input.keyboard?.addKey("ESC");
    this.escKey?.on("down", () => {
      if (this.mode === "death") return;
      if (this.mode === "settings" || this.mode === "quests") this.render(this.caller === "Title" ? "settings" : "pause");
      if (this.mode === "pause" || this.mode === "bank" || this.mode === "tribunal") this.close();
    });
    this.render(data?.mode ?? "pause");
  }

  private render(mode: Mode) {
    this.mode = mode;
    this.root.removeAll(true);
    const add = (o: Phaser.GameObjects.GameObject) => this.root.add(o);
    add(this.add.rectangle(0, 0, 960, 540, 0x000000, 0.7).setOrigin(0).setInteractive());
    add(panel(this, 140, 40, 680, 460));
    const s = G.hasRun() ? G.s : null;
    switch (mode) {
      case "pause": {
        add(title(this, 480, 74, "PAUSED", 28));
        const st = s ? currentStep() : null;
        if (st) add(this.add.text(480, 104, `Objective: ${st.text}`, { fontFamily: FONT, fontSize: "13px", color: "#ffffff", wordWrap: { width: 600 }, align: "center" }).setOrigin(0.5, 0));
        const items: [string, () => void][] = [
          ["RESUME", () => this.close()],
          ["QUESTS, FACTS & STATS", () => this.render("quests")],
          ["SETTINGS", () => this.render("settings")],
        ];
        if (this.caller === "Hub") items.push(["SAVE GAME", () => this.saveNow()]);
        items.push(["QUIT TO TITLE (progress is autosaved)", () => this.quit()]);
        items.forEach(([t, fn], i) => add(button(this, 480, 170 + i * 52, t, fn, { w: 380 })));
        add(this.add.text(480, 470, "Controls: WASD move · Mouse aim · LMB attack · RMB/F special · Space dodge · Q pussy juice · B fizzy bongo · R Wonk Your Thang (when Wonk is full) · G fart · X swap gun · E interact · Tab skip dialogue", { fontFamily: FONT, fontSize: "11px", color: "#9aa0b4", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5));
        break;
      }
      case "settings": {
        add(title(this, 480, 74, "SETTINGS", 28));
        const set = G.meta.settings;
        const row = (y: number, label: string, get: () => string, dec: () => void, inc: () => void) => {
          add(this.add.text(220, y, label, { fontFamily: FONT, fontSize: "16px", color: "#ffffff" }).setOrigin(0, 0.5));
          const val = this.add.text(600, y, get(), { fontFamily: FONT, fontSize: "16px", color: "#ffd23f" }).setOrigin(0.5);
          add(val);
          add(button(this, 530, y, "−", () => { dec(); val.setText(get()); G.saveMeta(); }, { w: 40, h: 30 }));
          add(button(this, 670, y, "+", () => { inc(); val.setText(get()); G.saveMeta(); synth.play("ding"); }, { w: 40, h: 30 }));
        };
        const pct = (v: number) => `${Math.round(v * 100)}%`;
        const clamp = (v: number) => Math.max(0, Math.min(1, Math.round(v * 10) / 10));
        row(130, "Master volume", () => pct(set.master), () => (set.master = clamp(set.master - 0.1)), () => (set.master = clamp(set.master + 0.1)));
        row(180, "Music volume", () => pct(set.music), () => (set.music = clamp(set.music - 0.1)), () => (set.music = clamp(set.music + 0.1)));
        row(230, "SFX volume", () => pct(set.sfx), () => (set.sfx = clamp(set.sfx - 0.1)), () => (set.sfx = clamp(set.sfx + 0.1)));
        row(280, "Text speed", () => `${set.textSpeed.toFixed(1)}x`, () => (set.textSpeed = Math.max(0.5, set.textSpeed - 0.5)), () => (set.textSpeed = Math.min(4, set.textSpeed + 0.5)));
        row(325, "Screen shake", () => (set.shake ? "ON" : "OFF"), () => (set.shake = !set.shake), () => (set.shake = !set.shake));
        row(370, "CRT effect (KrelTV)", () => (set.crt ? "ON" : "OFF"), () => (set.crt = !set.crt), () => (set.crt = !set.crt));
        row(410, "Character voices", () => (set.voices !== false ? "ON" : "OFF"), () => (set.voices = set.voices === false), () => (set.voices = set.voices === false));
        row(450, "Voice volume", () => pct(set.voiceVolume ?? 0.8), () => (set.voiceVolume = clamp((set.voiceVolume ?? 0.8) - 0.1)), () => (set.voiceVolume = clamp((set.voiceVolume ?? 0.8) + 0.1)));
        add(button(this, 480, 500, "◀ BACK", () => (this.caller === "Title" ? this.close() : this.render("pause")), { w: 200 }));
        break;
      }
      case "quests": {
        if (!s) break;
        add(title(this, 480, 64, "QUESTS · KRAZY FACTS · STATS", 22));
        const lines: string[] = [];
        const st = currentStep();
        lines.push(`CHAPTER ${s.chapter} — ${st ? st.text : "Complete"}`);
        const pq = personalQuest(s);
        if (pq) {
          lines.push("");
          lines.push(`PERSONAL: ${pq.title} ${s.flags[`pq_done_${pq.id}`] ? "(COMPLETE)" : `(${pickupsCollected(s, pq)}/${pq.pickups.length})`}`);
          lines.push(`  ${pq.blurb}`);
          if (!s.flags[`pq_done_${pq.id}`]) lines.push(`  Turn in at: ${pq.turnIn.at.replace("_", " ")}`);
        }
        const open = currentArcSteps(s);
        for (const arc of arcsFor(s.player)) {
          lines.push("");
          const cur = open.find((c) => c.arc === arc);
          const lock = s.flags[`${arc.id}_done`] ? "(COMPLETE)" : !s.flags.met_emergency ? "(unlocks after the Emergency Reaction Session)" : !arcAvailable(s, arc) ? `(unlocks in Chapter ${arc.minChapter})` : "";
          lines.push(`${arc.player === "ALL" ? "SIDE QUEST" : "SIDE STORY"}: ${arc.title} ${lock}`);
          if (lock && !s.flags[`${arc.id}_done`]) continue;
          for (const st of arc.steps) lines.push(`  ${stepDone(s, arc, st) ? "✓" : cur?.step === st ? "•" : "○"} ${st.text}`);
        }
        if (s.flags.ministerial_quests) {
          lines.push("");
          lines.push("MINISTERIAL:");
          for (const q of MINISTRY_QUESTS) {
            const stt = ministryQuestState(s, q);
            if (stt === "locked") continue;
            const giver = CHARACTERS[narrativeActor(q.ministry, s.player) as string]?.name ?? q.ministry;
            const prog = stt === "active" || stt === "ready" ? ` ${Math.min(q.target, ministryProgress(s, q))}/${q.target}` : "";
            lines.push(`  ${stt === "done" ? "✓" : stt === "ready" ? "!" : stt === "active" ? "•" : "○"} ${q.title} (${giver})${prog}${stt === "available" ? " — talk to them to accept" : stt === "ready" ? " — hand in" : ""}`);
          }
        }
        lines.push("");
        lines.push(`KRAZY FACTS IN FORCE: ${s.revisions.length ? "" : "none"}`);
        for (const r of s.revisions) lines.push(`  "${factById(r)?.fact}" — ${factById(r)?.effect}`);
        lines.push("");
        lines.push(`Kills ${counter(s, "kills_total")} · Perfect dodges ${counter(s, "perfect_dodge")} · Bans ${s.banCount} · Bongos ${counter(s, "bongos_drunk")} · Reactions 👍${s.reactionsGiven.LIKE} ❤️${s.reactionsGiven.LOVE} 😂${s.reactionsGiven.LAUGH} 😡${s.reactionsGiven.ANGRY} Seen ${s.reactionsGiven.SEEN}`);
        lines.push(`Archive ${s.archiveUnlocked.length} records · KrelTV ${s.tvWatched.length} episodes · Playtime ${Math.round(s.playtimeMs / 60000)} min${s.ngPlus ? " · NEW KREZ+" : ""}`);
        add(this.add.text(160, 90, lines.join("\n"), { fontFamily: FONT, fontSize: "12px", color: "#ffffff", wordWrap: { width: 640 }, lineSpacing: 2 }));
        add(button(this, 480, 470, "◀ BACK", () => this.render("pause"), { w: 200 }));
        break;
      }
      case "bank": {
        if (!s) break;
        const minister = narrativeActor("KREZMAR", s.player);
        add(title(this, 480, 52, "CENTRAL BANK OF KRELWORLD", 24, "#86efac"));
        add(this.add.text(480, 78, `${CHARACTERS[minister as string]?.name}${minister === "PROCTUS" ? ` (${CHARACTERS[s.player].proctusTitle})` : ", Minister of Money and Loans"} · You have ${s.coins} Krezzcoin`, { fontFamily: FONT, fontSize: "12px", color: "#ffffff" }).setOrigin(0.5));
        const tabs: [typeof this.bankTab, string][] = [["upgrades", "UPGRADES"], ["armoury", "ARMOURY"], ["perks", "PERKS"], ["moves", "LADS & MOVES"]];
        tabs.forEach(([k, label], i) => add(button(this, 255 + i * 150, 106, label, () => { this.bankTab = k; this.render("bank"); }, { w: 140, h: 28, size: 13, color: this.bankTab === k ? 0x22c55e : undefined })));
        let y = 136;
        const row = (name: string, desc: string, btn: string, disabled: boolean, fn: () => void, col = "#ffffff") => {
          add(this.add.text(150, y, name, { fontFamily: FONT, fontSize: "14px", color: col }));
          add(this.add.text(150, y + 18, desc, { fontFamily: FONT, fontSize: "11px", color: "#9aa0b4", wordWrap: { width: 500 } }));
          add(button(this, 760, y + 14, btn, fn, { w: 150, h: 30, size: 13, disabled }));
          y += 42;
        };
        if (this.bankTab === "upgrades") {
          for (const u of GENERIC_UPGRADES) {
            const lvl = s.upgrades[u.id] ?? 0;
            const cost = upgradeCost(s, lvl);
            const maxed = lvl >= u.max;
            row(`${u.name} (${lvl}/${u.max})`, u.desc, maxed ? "MAXED" : `BUY ${cost}`, maxed || s.coins < cost, () => this.buy(u.id, cost));
          }
          const def = CHARACTERS[s.player];
          add(this.add.text(150, y + 2, `${def.name} — PERSONAL BRANCH`, { fontFamily: FONT, fontSize: "13px", color: "#ffd23f", fontStyle: "bold" }));
          y += 24;
          def.branch?.forEach((b, i) => {
            const owned = !!s.upgrades[b.id];
            const prevOk = i === 0 || !!s.upgrades[def.branch![i - 1].id];
            const cost = Math.round(b.cost * (s.player === "KREZMAR" ? 0.9 : 1));
            row(b.name, b.desc, owned ? "OWNED" : prevOk ? `BUY ${cost}` : "LOCKED", owned || !prevOk || s.coins < cost, () => this.buyBranch(b.id, cost), owned ? "#5ad35a" : "#ffffff");
          });
        } else if (this.bankTab === "armoury") {
          s.guns = s.guns ?? {};
          for (const id of GUN_ORDER) {
            const g = GUNS[id];
            const owned = id in s.guns;
            if (g.shop) {
              if (!owned) row(`${g.name}  ·  BANK EXCLUSIVE`, g.blurb, `BUY ${g.shop}`, s.coins < g.shop, () => this.buyGun(id), "#ffd23f");
              else {
                const cost = Math.round(g.shop * 0.12);
                const full = s.guns[id] >= gunMax(g, s);
                row(`${g.name}  (${s.guns[id]}/${gunMax(g, s)})`, "Ammo: +" + g.pickup, full ? "FULL" : `AMMO ${cost}`, full || s.coins < cost, () => this.buyAmmo(id, cost), "#5ad35a");
              }
            } else if (owned) {
              const cost = Math.max(15, Math.round(g.pickup * 1.2));
              const full = s.guns[id] >= gunMax(g, s);
              row(`${g.name}  (${s.guns[id]}/${gunMax(g, s)})`, "Ammo: +" + g.pickup, full ? "FULL" : `AMMO ${cost}`, full || s.coins < cost, () => this.buyAmmo(id, cost));
            }
          }
          if (y < 440) add(this.add.text(480, y + 6, "Crate guns (pistol, Uzi, Boomstick, Railgun, Marital Aid) are found in dungeons. Their ammo is sold here once you own them.", { fontFamily: FONT, fontSize: "11px", color: "#9aa0b4", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5, 0));
        } else if (this.bankTab === "perks") {
          for (const p of BANK_PERKS) {
            const lvl = s.upgrades[p.id] ?? 0;
            const cost = p.cost * (lvl + 1);
            const maxed = lvl >= p.max;
            row(`${p.name} (${lvl}/${p.max})`, p.desc, maxed ? "MAXED" : `BUY ${cost}`, maxed || s.coins < cost, () => this.buy(p.id, cost));
          }
        } else {
          const hired = typeof s.flags.companion === "string" ? (s.flags.companion as string) : "";
          row(hired ? `HIRED: ${CHARACTERS[hired]?.name}` : "Hire a Lad (one dungeon trip)", hired ? "Waiting by the dungeon door. Goes home when you get back to town." : "A random lad joins your next dungeon, follows you room to room and shoots whatever's nearest. Can't be killed. Won't shut up.", hired ? "HIRED" : "HIRE 150", !!hired || s.coins < 150, () => this.hireLad(), hired ? "#5ad35a" : "#ffd23f");
          for (const m of BANK_MOVES) {
            const owned = !!s.upgrades[m.id];
            row(m.name, m.desc, owned ? "OWNED" : `BUY ${m.cost}`, owned || s.coins < m.cost, () => this.buyBranch(m.id, m.cost), owned ? "#5ad35a" : "#ffffff");
          }
        }
        add(button(this, 480, 514, "LEAVE THE BANK", () => this.close(), { w: 220, h: 34 }));
        break;
      }
      case "tribunal": {
        if (!s) break;
        const officer = narrativeActor("FLENKY", s.player);
        add(title(this, 480, 70, "THE BAN TRIBUNAL", 26, "#ff6666"));
        add(this.add.text(480, 100, `Exile Appeals Officer: ${CHARACTERS[officer as string]?.name}${officer === "PROCTUS" ? " (acting, also banned)" : ""}\nYour Ban Risk: ${Math.round(s.banRisk)}% · Times banned: ${s.banCount}`, { fontFamily: FONT, fontSize: "13px", color: "#ffffff", align: "center" }).setOrigin(0.5, 0));
        const items: [string, () => void][] = [
          ["VIEW EXHIBITS (Flenky's removals)", () => switchTo(this, "Archive", { filter: "ban", returnAt: "BAN_TRIBUNAL" })],
          [`APPEAL: clear Ban Risk (40 Krezzcoin)`, () => this.appeal()],
          ["SPEAK TO THE OFFICER", () => this.officer(officer as string)],
          ["LEAVE", () => this.close()],
        ];
        items.forEach(([t, fn], i) => add(button(this, 480, 190 + i * 56, t, fn, { w: 420 })));
        break;
      }
      case "death": {
        add(title(this, 480, 110, "YOU HAVE BEEN KREZZED", 34, "#ff4d4d"));
        add(this.add.text(480, 160, "Not dead. Just... thoroughly krezzed. Somewhere, Drongus types 'should've reacted to the song'.", { fontFamily: FONT, fontSize: "14px", color: "#ffffff", align: "center", wordWrap: { width: 560 } }).setOrigin(0.5));
        add(button(this, 480, 260, "TRY THE ROOM AGAIN (lose 10% Krezzcoin)", () => this.retry(), { w: 460 }));
        add(button(this, 480, 320, "RETURN TO KRELFORD", () => this.toHub(), { w: 460 }));
        break;
      }
    }
  }

  private buy(id: string, cost: number) {
    const s = G.s;
    if (s.coins < cost) return;
    s.coins -= cost;
    s.upgrades[id] = (s.upgrades[id] ?? 0) + 1;
    if (id === "hp") s.hp = Math.min(maxHp(s), s.hp + 15);
    synth.play("coin");
    G.save();
    this.render("bank");
  }

  private hireLad() {
    const s = G.s;
    if (s.coins < 150 || typeof s.flags.companion === "string") return;
    s.coins -= 150;
    const id = Companion.pick(s.player);
    s.flags.companion = id;
    synth.play("ding");
    G.emit("toast", { title: "LAD HIRED", text: `${CHARACTERS[id]?.name} will meet you at the next dungeon.` });
    G.save();
    this.render("bank");
  }

  private buyGun(id: string) {
    const s = G.s;
    const g = GUNS[id];
    if (!g.shop || s.coins < g.shop) return;
    s.coins -= g.shop;
    s.guns = s.guns ?? {};
    s.guns[id] = g.pickup * 2;
    s.gun = id;
    synth.play("ding");
    G.emit("toast", { title: "CENTRAL BANK", text: `${g.name} acquired. Equipped. X to swap weapons.` });
    G.save();
    this.render("bank");
  }

  private buyAmmo(id: string, cost: number) {
    const s = G.s;
    const g = GUNS[id];
    if (!s.guns || !(id in s.guns) || s.coins < cost) return;
    s.coins -= cost;
    s.guns[id] = Math.min(gunMax(g, s), s.guns[id] + g.pickup);
    synth.play("coin");
    G.save();
    this.render("bank");
  }

  private buyBranch(id: string, cost: number) {
    const s = G.s;
    if (s.coins < cost || s.upgrades[id]) return;
    s.coins -= cost;
    s.upgrades[id] = 1;
    if (id === "gr1") s.hp = Math.min(maxHp(s), s.hp + 30);
    synth.play("ding");
    G.save();
    this.render("bank");
  }

  private appeal() {
    const s = G.s;
    if (s.banRisk <= 0) {
      G.emit("toast", { title: "TRIBUNAL", text: "You have no Ban Risk. This is deeply suspicious. Noted." });
      return;
    }
    if (s.coins < 40) {
      G.emit("toast", { title: "TRIBUNAL", text: "Appeals cost 40 Krezzcoin. Justice isn't free. It's 40." });
      return;
    }
    s.coins -= 40;
    s.banRisk = 0;
    synth.play("ding");
    G.save();
    this.render("tribunal");
  }

  private async officer(id: string) {
    this.root.setVisible(false);
    const box = new DialogueBox(this, 1000);
    const lines =
      id === "PROCTUS"
        ? [say("PROCTUS", "Welcome to the Ban Tribunal. I'm the Acting Exile Appeals Officer. I'm also currently banned. I'm hearing my own appeal at three."), say("PROCTUS", "My advice: keep moving, don't dodge when they say not to, and never, ever have parents who are still together.")]
        : [say("FLENKY", "Exile Appeals Officer. Most qualified man in the realm."), say("FLENKY", "Nine removals. Ten with the Queen one. I know every corridor in this chat."), say("FLENKY", "Tip: when he says 'and I mean it', he doesn't. Usually. Get a couple pints down you and appeal.")];
    await box.play(lines);
    box.destroy();
    this.root.setVisible(true);
  }

  private saveNow() {
    G.save();
    synth.play("ding");
    G.emit("toast", { title: "SAVED", text: "Game saved. The wiki has also been updated, at some point." });
    this.close();
  }

  private quit() {
    G.save();
    const caller = this.caller ? this.scene.get(this.caller) : null;
    switchTo(caller ?? this, "Title");
    this.scene.stop();
  }

  private retry() {
    const s = G.s;
    s.coins = Math.floor(s.coins * 0.9);
    s.hp = maxHp(s);
    s.banRisk = 0;
    const d = this.data0;
    const caller = this.scene.get("Dungeon");
    switchTo(caller, "Dungeon", { dungeon: d.dungeon, room: d.room });
    this.scene.stop();
  }

  private toHub() {
    const s = G.s;
    s.hp = maxHp(s);
    s.banRisk = 0;
    s.phase = "hub";
    G.save();
    const caller = this.scene.get("Dungeon");
    switchTo(caller, "Hub", {});
    this.scene.stop();
  }

  private close() {
    if (this.caller && this.scene.isPaused(this.caller)) {
      this.scene.resume(this.caller);
      this.scene.get(this.caller).events.emit("ui-resume");
    }
    this.scene.stop();
  }
}

export { UI };
