import Phaser from "phaser";
import { G } from "../G";
import { button, FONT, panel, title, UI } from "../ui/theme";
import { switchTo, currentStep } from "../Flow";
import { synth } from "../audio/Synth";
import { CHARACTERS } from "../../data/characters";
import { GENERIC_UPGRADES, upgradeCost, maxHp, counter } from "../systems/stats";
import { arcsFor, arcAvailable, currentArcSteps, stepDone } from "../systems/arcs";
import { personalQuest, pickupsCollected, MINISTRY_QUESTS, ministryQuestState, ministryProgress } from "../systems/quests";
import { factById } from "../../data/historicalRevisions";
import { narrativeActor } from "../systems/narrative";
import { DialogueBox } from "../ui/DialogueBox";
import { say } from "../../content/dsl";

type Mode = "pause" | "settings" | "bank" | "tribunal" | "death" | "quests";

/** Overlay menus: pause, settings, bank (upgrades), ban tribunal, quests, death. */
export class MenuScene extends Phaser.Scene {
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
        add(this.add.text(480, 470, "Controls: WASD move · Mouse aim · LMB attack · RMB/F special · Space dodge · Q pussy juice · B fizzy bongo · R Krezz Burst · G fart · X swap gun · E interact · Tab skip dialogue", { fontFamily: FONT, fontSize: "11px", color: "#9aa0b4", align: "center", wordWrap: { width: 640 } }).setOrigin(0.5));
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
        add(title(this, 480, 64, "CENTRAL BANK OF KRELWORLD", 24, "#86efac"));
        add(this.add.text(480, 90, `${CHARACTERS[minister as string]?.name}${minister === "PROCTUS" ? ` (${CHARACTERS[s.player].proctusTitle})` : ", Minister of Money and Loans"} · You have ${s.coins} Krezzcoin`, { fontFamily: FONT, fontSize: "12px", color: "#ffffff" }).setOrigin(0.5));
        let y = 120;
        for (const u of GENERIC_UPGRADES) {
          const lvl = s.upgrades[u.id] ?? 0;
          const cost = upgradeCost(s, lvl);
          const maxed = lvl >= u.max;
          add(this.add.text(170, y, `${u.name} (${lvl}/${u.max})`, { fontFamily: FONT, fontSize: "14px", color: "#ffffff" }));
          add(this.add.text(170, y + 18, u.desc, { fontFamily: FONT, fontSize: "11px", color: "#9aa0b4" }));
          add(button(this, 720, y + 14, maxed ? "MAXED" : `BUY ${cost}`, () => this.buy(u.id, cost), { w: 140, h: 30, size: 13, disabled: maxed || s.coins < cost }));
          y += 46;
        }
        const def = CHARACTERS[s.player];
        add(this.add.text(170, y + 6, `${def.name} — PERSONAL BRANCH`, { fontFamily: FONT, fontSize: "13px", color: "#ffd23f", fontStyle: "bold" }));
        y += 28;
        def.branch?.forEach((b, i) => {
          const owned = !!s.upgrades[b.id];
          const prevOk = i === 0 || !!s.upgrades[def.branch![i - 1].id];
          const cost = Math.round(b.cost * (s.player === "KREZMAR" ? 0.9 : 1));
          add(this.add.text(170, y, `${b.name}`, { fontFamily: FONT, fontSize: "14px", color: owned ? "#5ad35a" : "#ffffff" }));
          add(this.add.text(170, y + 18, b.desc, { fontFamily: FONT, fontSize: "11px", color: "#9aa0b4", wordWrap: { width: 460 } }));
          add(button(this, 720, y + 14, owned ? "OWNED" : prevOk ? `BUY ${cost}` : "LOCKED", () => this.buyBranch(b.id, cost), { w: 140, h: 30, size: 13, disabled: owned || !prevOk || s.coins < cost }));
          y += 44;
        });
        add(button(this, 480, 476, "LEAVE THE BANK", () => this.close(), { w: 220 }));
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
