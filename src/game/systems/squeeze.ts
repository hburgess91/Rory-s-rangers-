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
  await talk([
    dir("You hug her."),
    { s: s.player, t: "Mm. That feels kinda good.", choice: [{ label: "Squeeze harder", set: { sq_step: 2 } }, { label: "Let go", set: { sq_step: 1 } }] },
  ]);
  if (!step(2)()) return false;
  scene.tweens.add({ targets: [me, who.spr], angle: { from: -6, to: 6 }, yoyo: true, repeat: 5, duration: 90 });
  drops(scene, who.spr.x, who.spr.y, 10);
  await talk([
    dir("You squeeze harder. And harder. Until golden juice starts coming out."),
    { s: who.name, t: "Ooh! There it is!", choice: [{ label: "Keep squeezing", set: { sq_step: 3 } }, { label: "That's enough", set: { sq_step: 2 } }] },
  ]);
  if (!step(3)()) return false;
  drops(scene, who.spr.x, who.spr.y, 40);
  scene.cameras.main.shake(300, 0.006);
  await talk([
    dir("So. Much. Golden juice is now coming out."),
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
