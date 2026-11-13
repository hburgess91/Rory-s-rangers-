import Phaser from "phaser";
import type { PlayableId } from "../../data/types";
import { synth } from "../audio/Synth";
import { TOUCH } from "../ui/TouchControls";
import { playPerf } from "../gfx/HD";
import { WONK_MOANS, WONK_SHOUTS } from "../../content/finaleRoof";

/**
 * THE GROUP WONK. The long, hard, shared version of WONK YOUR THANG (Wonk.ts), for the finale.
 *
 * Everyone stands in a ring. One shared GROUP KREZZ gauge, which drains all the time (faster the fuller it is).
 * - MASH (R / SPACE / J / L / click / tap / A) to pump it: how hard you're going is presses in the last second.
 * - THE BEAT goes round the ring, one lad at a time. Press as their light flashes: SYNC. Each sync on a lad
 *   who hasn't joined yet brings them in (they start wonking too). Every lad in makes the pumping count for more,
 *   and a streak of syncs counts for more again. Miss a beat and the streak's gone (and a joined lad can drop out).
 * - Fill it to the top before the time runs out. It's meant to take a good half a minute of proper effort.
 * Resolves true on success.
 */

export const GW_TIME = 75000;
export const GW_K = 0.085;
export const GW_WINDOW = 150;

export interface GwState {
  progress: number;
  joined: boolean[];
  streak: number;
  t: number;
  presses: number[];
  beatIdx: number;
  nextBeat: number;
  beatHit: boolean;
}

/** How long a beat lasts at this much progress (it speeds up as you go). */
export const beatMs = (p: number) => 640 - 230 * Math.min(1, p);
/** How much the gauge drains per second. */
export const drain = (p: number) => 0.022 + 0.035 * p;

/** One step of the gauge (pure, so the maths can be tested). `rate`: presses in the last second. */
export function gwStep(s: GwState, rate: number, dtMs: number) {
  const dt = dtMs / 1000;
  const intensity = Math.min(1.25, rate / 9);
  const joined = s.joined.filter(Boolean).length / s.joined.length;
  const mult = (0.3 + 0.7 * joined) * (1 + 0.06 * Math.min(12, s.streak));
  s.progress = Phaser.Math.Clamp(s.progress + (GW_K * intensity * mult - drain(s.progress)) * dt, 0, 1);
  return s.progress;
}

export function runGroupWonk(sc: Phaser.Scene, opts: { lads: PlayableId[]; player: PlayableId }): Promise<boolean> {
  return new Promise((resolve) => {
    const ring: PlayableId[] = [opts.player, ...opts.lads];
    const N = ring.length;
    const st: GwState = { progress: 0.04, joined: ring.map((_, i) => i === 0), streak: 0, t: 0, presses: [], beatIdx: 0, nextBeat: 1600, beatHit: false };
    (sc as unknown as { __groupWonk?: GwState }).__groupWonk = st;
    let done = false;
    let nextMoan = 0;
    let nextShout = 1500;
    let milestone = 0;

    const ui = sc.add.container(0, 0).setScrollFactor(0).setDepth(3500);
    const dim = sc.add.rectangle(480, 270, 960, 540, 0x12001a, 0).setInteractive();
    ui.add(dim);
    sc.tweens.add({ targets: dim, fillAlpha: 0.88, duration: 300 });
    // speed lines
    const lines = sc.add.graphics();
    ui.add(lines);
    const CX = 480;
    const CY = 262;
    const RX = 300;
    const RY = 150;
    // Drongus in the middle, glowing, terrified
    const ddKey = sc.textures.exists("boss_dark_drongus") ? "boss_dark_drongus" : "boss_drongus";
    const dd = sc.add.sprite(CX, CY - 6, ddKey, 0).setScale(1.25);
    const ddGlow = sc.add.ellipse(CX, CY, 150, 170, 0xffd23f, 0.15).setBlendMode(Phaser.BlendModes.ADD);
    ui.add([ddGlow, dd]);
    const ddText = sc.add.text(CX, CY - 92, "", { fontFamily: "Impact, sans-serif", fontSize: "18px", color: "#ffd23f", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5);
    ui.add(ddText);
    // the ring
    const lads = ring.map((id, i) => {
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
      const x = CX + Math.cos(a) * RX;
      const y = CY + 10 + Math.sin(a) * RY;
      const light = sc.add.ellipse(x, y + 34, 70, 22, 0xff4fa3, 0.12);
      const key = sc.textures.exists(`spr_${id}`) ? `spr_${id}` : "spr_FLENKY";
      const spr = sc.add.sprite(x, y, key, 0).setScale(y < CY ? 2.2 : 2.6);
      const bar = sc.add.rectangle(x, y + (y < CY ? 12 : 16), 46, 16, 0x000000);
      const barT = sc.add.text(x, bar.y, "CENSORED", { fontFamily: "Impact, sans-serif", fontSize: "9px", color: "#ffffff" }).setOrigin(0.5);
      const tag = sc.add.text(x, y - 46, i === 0 ? "YOU" : "", { fontFamily: "Impact, sans-serif", fontSize: "12px", color: "#ffffff", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5);
      ui.add([light, spr, bar, barT, tag]);
      return { id, x, y, light, spr, bar, barT, tag, pitch: 0.7 + ((i * 37) % 9) * 0.07 };
    });
    // one long censor bar across the whole ring, for when it gets going
    const title = sc.add.text(480, 34, "THE GROUP WONK", { fontFamily: "Impact, sans-serif", fontSize: "44px", color: "#ff9ad5", stroke: "#2a0030", strokeThickness: 8 }).setOrigin(0.5).setScale(0.2);
    ui.add(title);
    sc.tweens.add({ targets: title, scale: 1, duration: 300, ease: "Back.out" });
    const how = sc.add
      .text(480, 72, TOUCH.enabled ? "TAP TAP TAP to pump · hit the beat when a lad lights up to bring them in" : "MASH R / SPACE to pump · press ON THE BEAT when a lad lights up to bring them in", { fontFamily: "sans-serif", fontSize: "14px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
    ui.add(how);
    // the gauge
    const GX = 180;
    const GW = 600;
    const GY = 474;
    ui.add(sc.add.text(480, GY - 22, "GROUP KREZZ", { fontFamily: "Impact, sans-serif", fontSize: "18px", color: "#ffffff" }).setOrigin(0.5));
    ui.add(sc.add.rectangle(480, GY, GW + 8, 26, 0x000000, 0.85).setStrokeStyle(3, 0xffffff, 0.8));
    const fill = sc.add.rectangle(GX, GY, 0, 20, 0xff4fa3).setOrigin(0, 0.5);
    ui.add(fill);
    for (const k of [0.25, 0.5, 0.75]) ui.add(sc.add.rectangle(GX + GW * k, GY, 2, 22, 0xffffff, 0.4));
    ui.add(sc.add.rectangle(480, 508, GW, 8, 0x000000, 0.8));
    const timeBar = sc.add.rectangle(GX, 508, GW, 6, 0xffd23f).setOrigin(0, 0.5);
    ui.add(timeBar);
    const status = sc.add.text(480, 420, "", { fontFamily: "Impact, sans-serif", fontSize: "24px", color: "#ffffff", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5);
    const joinedTxt = sc.add.text(860, GY, "", { fontFamily: "Impact, sans-serif", fontSize: "16px", color: "#ffd1f3" }).setOrigin(0, 0.5);
    const streakTxt = sc.add.text(100, GY, "", { fontFamily: "Impact, sans-serif", fontSize: "16px", color: "#86efac" }).setOrigin(1, 0.5);
    ui.add([status, joinedTxt, streakTxt]);

    const pop = (x: number, y: number, t: string, col: string, size = 16) => {
      const o = sc.add.text(x, y, t, { fontFamily: "Impact, sans-serif", fontSize: `${size}px`, color: col, stroke: "#000", strokeThickness: 4 }).setOrigin(0.5);
      ui.add(o);
      sc.tweens.add({ targets: o, y: y - 30, alpha: 0, duration: 800, onComplete: () => o.destroy() });
    };

    // ---- input
    const press = () => {
      if (done) return;
      st.presses.push(st.t);
      synth.wonkTick(st.progress);
      // on the beat?
      const since = st.t - (st.nextBeat - beatMs(st.progress));
      const until = st.nextBeat - st.t;
      if (!st.beatHit && (since < GW_WINDOW || until < GW_WINDOW * 0.6)) {
        st.beatHit = true;
        const idx = until < GW_WINDOW * 0.6 ? (st.beatIdx + 1) % N : st.beatIdx;
        const l = lads[idx];
        st.streak++;
        st.progress = Math.min(1, st.progress + 0.006);
        if (!st.joined[idx]) {
          st.joined[idx] = true;
          pop(l.x, l.y - 60, "JOINS IN!", "#ff9ad5", 18);
          synth.voice("oh", 0.5, l.pitch);
        } else pop(l.x, l.y - 60, st.streak > 4 ? `SYNC x${st.streak}` : "SYNC!", "#86efac", 15);
        l.light.setFillStyle(0x86efac, 0.6);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "r" || k === " " || k === "j" || k === "l") {
        e.preventDefault();
        press();
      }
    };
    window.addEventListener("keydown", onKey);
    dim.on("pointerdown", press);
    const pad = () => (sc.input.gamepad?.total ? sc.input.gamepad.getPad(0) : null);
    let padWas = false;
    synth.charge();

    const tick = sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (done) return;
        const dt = 16;
        st.t += dt;
        if (TOUCH.edges.has("burst")) {
          TOUCH.edges.delete("burst");
          press();
        }
        const gp = pad();
        const padNow = !!(gp && (gp.L1 || gp.A));
        if (padNow && !padWas) press();
        padWas = padNow;
        st.presses = st.presses.filter((x) => st.t - x < 1000);
        const rate = st.presses.length;
        // the beat goes round
        if (st.t >= st.nextBeat) {
          if (!st.beatHit && st.t > 1700) {
            if (st.streak > 2) pop(lads[st.beatIdx].x, lads[st.beatIdx].y - 60, "OUT OF SYNC", "#f87171", 14);
            st.streak = 0;
            // a joined lad (never you) can lose it and drop out if you're not pumping
            if (rate < 3) {
              const j = st.joined.map((v, i) => (v && i > 0 ? i : -1)).filter((i) => i > 0);
              const drop = j[Math.floor(Math.random() * j.length)];
              if (drop !== undefined && Math.random() < 0.5) {
                st.joined[drop] = false;
                pop(lads[drop].x, lads[drop].y - 60, "LOST IT", "#f87171", 14);
              }
            }
          }
          st.beatIdx = (st.beatIdx + 1) % N;
          st.nextBeat = st.t + beatMs(st.progress);
          st.beatHit = false;
          synth.play("bongo");
        }
        gwStep(st, rate, dt);
        const p = st.progress;
        const nJoined = st.joined.filter(Boolean).length;
        // visuals
        fill.setSize(GW * p, 20).setFillStyle(p > 0.75 ? 0xffffff : p > 0.5 ? 0xffd1f3 : 0xff4fa3);
        timeBar.setSize(GW * Math.max(0, 1 - st.t / GW_TIME), 6);
        joinedTxt.setText(`${nJoined}/${N} IN`);
        streakTxt.setText(st.streak > 1 ? `SYNC x${st.streak}` : "");
        const beatT = 1 - (st.nextBeat - st.t) / beatMs(p);
        lads.forEach((l, i) => {
          const on = i === st.beatIdx;
          if (!(on && st.beatHit)) l.light.setFillStyle(on ? 0xffd23f : st.joined[i] ? 0xff4fa3 : 0x444444, on ? 0.75 * (1 - beatT * 0.6) : st.joined[i] ? 0.25 : 0.12);
          l.light.setScale(on ? 1.25 - beatT * 0.25 : 1);
          if (st.joined[i]) {
            const fps = 6 + Math.min(14, rate * 1.2) + p * 6;
            if (!playPerf(l.spr, "wonk", st.t, fps, i * 2)) l.spr.setFrame(Math.floor(st.t / (1000 / fps)) % 2);
            l.spr.setX(l.x + (Math.random() - 0.5) * Math.min(6, rate * 0.6));
          } else l.spr.setFrame(0).setX(l.x);
          l.tag.setText(i === 0 ? "YOU" : st.joined[i] ? "" : "…");
        });
        // the whole ring shakes harder as it builds
        if (p > 0.5) sc.cameras.main.shake(40, 0.002 + p * 0.004);
        // speed lines out of the middle
        lines.clear();
        if (rate > 3) {
          lines.lineStyle(2, 0xff9ad5, 0.15 + p * 0.25);
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2 + st.t / 900;
            const r0 = 120 + Math.random() * 40;
            lines.lineBetween(CX + Math.cos(a) * r0 * 1.6, CY + Math.sin(a) * r0, CX + Math.cos(a) * (r0 + 240) * 1.6, CY + Math.sin(a) * (r0 + 240));
          }
        }
        // Drongus does not like this at all
        dd.setFrame(Math.floor(st.t / 110) % 8);
        dd.setX(CX + (Math.random() - 0.5) * (2 + p * 10));
        ddGlow.setScale(1 + p * 0.6).setFillStyle(p > 0.6 ? 0xffffff : 0xffd23f, 0.12 + p * 0.25);
        if (p > 0.25 && milestone < 1) {
          milestone = 1;
          ddText.setText("WHAT ARE YOU DOING");
          synth.play("roar");
        } else if (p > 0.5 && milestone < 2) {
          milestone = 2;
          ddText.setText("STOP IT. STOP IT!");
          sc.cameras.main.flash(150, 255, 200, 240);
        } else if (p > 0.75 && milestone < 3) {
          milestone = 3;
          ddText.setText("NOT THE GROUP WONK!!!");
          synth.play("alarm");
          sc.cameras.main.flash(200, 255, 255, 255);
        }
        // the moaning: everyone who's in, a crescendo
        if (st.t > nextMoan && rate > 0) {
          nextMoan = st.t + Math.max(90, 420 - nJoined * 30 - p * 160);
          const l = lads[st.joined.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)[Math.floor(Math.random() * nJoined)]];
          if (l) {
            synth.voice(p > 0.7 ? "oh" : Math.random() < 0.4 ? "grunt" : "mmm", 0.18 + p * 0.45, l.pitch * (0.9 + p * 0.45));
            if (Math.random() < 0.35) pop(l.x + (Math.random() - 0.5) * 30, l.y - 40, WONK_MOANS[Math.floor(Math.random() * WONK_MOANS.length)], "#ffd1f3", 11 + Math.round(p * 8));
          }
        }
        if (st.t > nextShout) {
          nextShout = st.t + 1600 + Math.random() * 1200;
          const l = lads[1 + Math.floor(Math.random() * (N - 1))];
          if (l) pop(l.x, l.y - 70, WONK_SHOUTS[Math.floor(Math.random() * WONK_SHOUTS.length)], "#ffffff", 14);
        }
        status
          .setText(rate === 0 ? "WONK IT!" : nJoined < N ? "HIT THE BEAT! GET THEM IN!" : p > 0.85 ? "NEARLY THERE!!!" : rate < 6 ? "HARDER!" : "KEEP GOING!")
          .setColor(nJoined < N ? "#ffd23f" : "#ffffff");
        if (p >= 1) return finish(true);
        if (st.t >= GW_TIME) return finish(false);
      },
    });

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      tick.remove();
      window.removeEventListener("keydown", onKey);
      status.setText("");
      const big = sc.add
        .text(480, 250, ok ? "GROUP WONK\nCOMPLETE" : "WE LOST IT", { fontFamily: "Impact, sans-serif", fontSize: ok ? "70px" : "48px", color: ok ? "#ffffff" : "#f9a8d4", stroke: "#2a0030", strokeThickness: 10, align: "center" })
        .setOrigin(0.5)
        .setScale(0.3);
      ui.add(big);
      sc.tweens.add({ targets: big, scale: 1, duration: 300, ease: "Back.out" });
      if (ok) {
        for (let i = 0; i < 6; i++) synth.voice(i % 2 ? "oh" : "grunt", 0.7, 0.7 + i * 0.12, i * 0.12);
        sc.cameras.main.flash(400, 255, 255, 255);
        sc.cameras.main.shake(700, 0.02);
      } else synth.play("trombone");
      sc.time.delayedCall(ok ? 1600 : 1200, () => {
        sc.tweens.add({
          targets: ui,
          alpha: 0,
          duration: 250,
          onComplete: () => {
            ui.destroy();
            resolve(ok);
          },
        });
      });
    };
  });
}
