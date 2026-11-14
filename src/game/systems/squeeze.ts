import Phaser from "phaser";
import type { Line } from "../../data/types";
import { G } from "../G";
import { synth } from "../audio/Synth";
import { dir, say } from "../../content/dsl";

/**
 * The golden juice squeeze. A woman who's up for it (a dancer's private dance, or one of the new
 * faces in town) offers a squeeze; squeeze long enough and golden juice comes out; drink it and
 * you can TRANSFORM (T) once in your next dungeon.
 */
export async function squeeze(
  scene: Phaser.Scene,
  talk: (lines: Line[]) => Promise<void>,
  who: { name: string; spr: Phaser.GameObjects.Sprite },
  me: Phaser.GameObjects.Sprite,
  opener?: Line[],
  offer = "Fancy a squeeze, love?",
): Promise<boolean> {
  const s = G.s;
  const f = s.flags;
  if (f.golden_charge) {
    await talk([say(who.name, "You're still glowing from the last one, love. Go and use it first.")]);
    return false;
  }
  const step = (n: number) => () => Number(f.sq_step ?? 0) >= n;
  f.sq_step = 0;
  await talk([
    ...(opener ?? []),
    { s: who.name, t: offer, choice: [{ label: "Hug her", set: { sq_step: 1 } }, { label: "Not today", set: { sq_step: 0 } }] },
  ]);
  if (!step(1)()) return false;
  // in for the hug
  const hx = who.spr.x + (me.x < who.spr.x ? -26 : 26);
  scene.tweens.add({ targets: me, x: hx, y: who.spr.y + 2, duration: 300 });
  hearts(scene, who.spr.x, who.spr.y - 30, 4);
  await talk([dir("You hug her. Now: SQUEEZE. Hit the buttons as they come up, fast, before she gets bored.")]);
  const got = await squeezeGame(scene, who.spr, me);
  if (!got) {
    await talk([say(who.name, "…is that it? Never mind, love. Maybe next time.")]);
    return false;
  }
  // the release
  synth.shout("sq_gush", 1);
  scene.time.delayedCall(120, () => synth.shout("sq_moan", 1));
  drops(scene, who.spr.x, who.spr.y, 50);
  scene.cameras.main.shake(400, 0.008);
  await talk([
    dir("A great golden gush. So. Much. Golden juice is now coming out."),
    { s: who.name, t: "…blimey.", choice: [{ label: "Drink it", set: { sq_step: 4 } }, { label: "Leave it", set: { sq_step: 3 } }] },
  ]);
  if (!step(4)()) return false;
  synth.play("gulp");
  await preview(scene, me);
  const first = !f.golden_first;
  f.golden_first = true;
  f.golden_charge = true;
  G.save();
  await talk(
    first
      ? [
          dir("⚡ NEW POWER-UP: GOLDEN TRANSFORMATION ⚡"),
          dir("Golden juice can only be attained from the freshest sources. Hug a woman who's up for it before entering a dungeon, and you can transform ONCE in that dungeon."),
          dir("In a dungeon: press T (or ⚡T) to transform. ATTACK becomes a huge golden mega melee. C (or CUME) fires the CUMEHAMEHA. It lasts 20 seconds."),
          say(who.name, "Ta-ra, love. Go and get 'em."),
        ]
      : [dir("⚡ GOLDEN JUICE: ready. Press T in your next dungeon."), say(who.name, "Ta-ra, love.")],
  );
  return true;
}

const SQ_KEYS: { label: string; codes: string[] }[] = [
  { label: "E", codes: ["KeyE"] },
  { label: "J", codes: ["KeyJ"] },
  { label: "SPACE", codes: ["Space"] },
  { label: "K", codes: ["KeyK"] },
];

/**
 * The squeeze itself: a button prompt pops up (E / J / K / SPACE, or tap it); hit the right one and the meter
 * climbs with a squelch, miss and it slips back; it drains on its own. Fill it before time's up.
 */
function squeezeGame(scene: Phaser.Scene, her: Phaser.GameObjects.Sprite, me: Phaser.GameObjects.Sprite): Promise<boolean> {
  return new Promise((res) => {
    const host = scene as unknown as { busy?: boolean };
    const wasBusy = host.busy;
    host.busy = true;
    const D = 6000;
    const ui = scene.add.container(0, 0).setDepth(D).setScrollFactor(0);
    const fix = <T extends Phaser.GameObjects.Components.ScrollFactor>(o: T) => (o.setScrollFactor(0), o);
    ui.add(fix(scene.add.rectangle(480, 92, 520, 112, 0x12001f, 0.85).setStrokeStyle(3, 0xfacc15)));
    ui.add(fix(scene.add.text(480, 52, "SQUEEZE!", { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#fde047", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5)));
    const barBg = fix(scene.add.rectangle(480, 132, 440, 16, 0x3f3f46).setStrokeStyle(2, 0x000000));
    const bar = fix(scene.add.rectangle(260, 132, 1, 12, 0xfacc15).setOrigin(0, 0.5));
    const clock = fix(scene.add.text(700, 52, "", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" }).setOrigin(1, 0.5));
    ui.add([barBg, bar, clock]);
    const btn = fix(scene.add.circle(480, 96, 24, 0xfde047).setStrokeStyle(4, 0x000000).setInteractive({ useHandCursor: true }));
    const btnTxt = fix(scene.add.text(480, 96, "", { fontFamily: "Impact, sans-serif", fontSize: "20px", color: "#000000" }).setOrigin(0.5));
    ui.add([btn, btnTxt]);
    let meter = 0;
    let streak = 0;
    let want = SQ_KEYS[0];
    let done = false;
    const t0 = scene.time.now;
    const LIMIT = 9000;
    const next = () => {
      let k = SQ_KEYS[Math.floor(Math.random() * SQ_KEYS.length)];
      if (k === want) k = SQ_KEYS[(SQ_KEYS.indexOf(k) + 1) % SQ_KEYS.length];
      want = k;
      btnTxt.setText(k.label).setFontSize(k.label.length > 1 ? 13 : 22);
      btn.setScale(1.3);
      scene.tweens.add({ targets: btn, scale: 1, duration: 120 });
    };
    const hit = (ok: boolean) => {
      if (done) return;
      if (ok) {
        streak++;
        meter = Math.min(100, meter + 10 + Math.min(6, streak));
        synth.shout("sq_squelch", 0.8, 0.85 + Math.random() * 0.35);
        drops(scene, her.x, her.y, 4);
        scene.tweens.add({ targets: [her, me], angle: { from: -5, to: 5 }, yoyo: true, duration: 70 });
        if (meter >= 100) return finish(true);
        next();
      } else {
        streak = 0;
        meter = Math.max(0, meter - 8);
        synth.play("tap_fail");
        btn.setFillStyle(0xef4444);
        scene.time.delayedCall(120, () => btn.active && btn.setFillStyle(0xfde047));
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const known = SQ_KEYS.some((k) => k.codes.includes(e.code));
      if (!known) return;
      e.preventDefault?.();
      hit(want.codes.includes(e.code));
    };
    const onTap = () => hit(true);
    btn.on("pointerdown", onTap);
    window.addEventListener("keydown", onKey, true);
    const tick = scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        meter = Math.max(0, meter - 0.3);
        bar.width = 4.4 * meter;
        const left = Math.max(0, LIMIT - (scene.time.now - t0));
        clock.setText((left / 1000).toFixed(1));
        if (left <= 0) finish(meter >= 100);
      },
    });
    function finish(win: boolean) {
      if (done) return;
      done = true;
      tick.remove();
      window.removeEventListener("keydown", onKey, true);
      bar.width = 4.4 * (win ? 100 : meter);
      scene.time.delayedCall(win ? 250 : 500, () => {
        ui.destroy();
        host.busy = wasBusy;
        res(win);
      });
    }
    next();
  });
}

function hearts(scene: Phaser.Scene, x: number, y: number, n: number) {
  for (let i = 0; i < n; i++) {
    const h = scene.add.text(x + (Math.random() - 0.5) * 40, y, "💛", { fontSize: "16px" }).setDepth(5000);
    scene.tweens.add({ targets: h, y: y - 50 - Math.random() * 30, alpha: 0, duration: 900 + i * 120, onComplete: () => h.destroy() });
  }
}

function drops(scene: Phaser.Scene, x: number, y: number, n: number) {
  for (let i = 0; i < n; i++) {
    scene.time.delayedCall(i * 40, () => {
      const d = scene.add.circle(x + (Math.random() - 0.5) * 30, y + 10, 3 + Math.random() * 3, Math.random() < 0.5 ? 0xfde047 : 0xfacc15).setDepth(5000).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 90, y: d.y + 30 + Math.random() * 30, alpha: 0, duration: 700, ease: "Quad.out", onComplete: () => d.destroy() });
    });
  }
}

/** A taste of what's coming: the golden flash, the scream, the aura. */
function preview(scene: Phaser.Scene, me: Phaser.GameObjects.Sprite): Promise<void> {
  return new Promise((res) => {
    scene.cameras.main.flash(400, 255, 236, 140);
    scene.cameras.main.shake(900, 0.015);
    synth.play("roar");
    const txt = scene.add.text(me.x, me.y - 70, "AAAAAAAAHHH!!!", { fontFamily: "Impact, sans-serif", fontSize: "26px", color: "#fde047", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setDepth(5001);
    const glow = scene.add.circle(me.x, me.y, 40, 0xfde047, 0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(4999);
    me.setTint(0xffe066);
    const ev = scene.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        const a = Math.random() * Math.PI * 2;
        const fl = scene.add.ellipse(me.x + Math.cos(a) * 20, me.y + 14, 9, 16, 0xfde047, 0.85).setBlendMode(Phaser.BlendModes.ADD).setDepth(5000);
        scene.tweens.add({ targets: fl, y: fl.y - 50, alpha: 0, duration: 420, onComplete: () => fl.destroy() });
      },
    });
    scene.tweens.add({ targets: glow, scale: 1.4, yoyo: true, repeat: 5, duration: 160 });
    scene.time.delayedCall(1800, () => {
      ev.remove();
      glow.destroy();
      txt.destroy();
      me.clearTint();
      res();
    });
  });
}
