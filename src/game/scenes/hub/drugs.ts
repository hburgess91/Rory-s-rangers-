import Phaser from "phaser";
import { synth } from "../../audio/Synth";

// Lulon's way into his own head: a "Press D to take drugs" prompt over the town, then a trip.

const DEPTH = 20000;

/** Screen-fixed objects that stay put whatever the hub camera's zoom is. */
function fixed<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(sc: Phaser.Scene, o: T, x: number, y: number): T {
  const cam = sc.cameras.main;
  const z = cam.zoom || 1;
  // scroll-factor-0 objects are still zoomed about the camera centre: undo that
  o.setScrollFactor(0).setDepth(DEPTH);
  o.setPosition(cam.width / 2 + (x - cam.width / 2) / z, cam.height / 2 + (y - cam.height / 2) / z);
  o.setScale(o.scaleX / z, o.scaleY / z);
  return o;
}

/** "PRESS D TO TAKE DRUGS". Resolves once you have (D key, or tap the button). */
export function takeDrugs(sc: Phaser.Scene): Promise<void> {
  return new Promise<void>((resolve) => {
    const cam = sc.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const dim = fixed(sc, sc.add.rectangle(W / 2, H / 2, W, H, 0x1a0010, 0.55), W / 2, H / 2);
    const title = fixed(
      sc,
      sc.add.text(0, 0, "I NEED TO KILL THE DEMONS IN MY HEAD", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#ff4fd8", stroke: "#2a0030", strokeThickness: 7, align: "center", wordWrap: { width: W - 60 } }).setOrigin(0.5),
      W / 2,
      H / 2 - 80,
    );
    const btn = fixed(
      sc,
      sc.add.text(0, 0, "💊  PRESS  D  TO TAKE DRUGS", { fontFamily: "Impact, sans-serif", fontSize: "30px", color: "#ffffff", backgroundColor: "#7e1d6b", padding: { x: 18, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }),
      W / 2,
      H / 2 + 10,
    );
    const hint = fixed(sc, sc.add.text(0, 0, "(or tap the button)", { fontFamily: "monospace", fontSize: "13px", color: "#fbcfe8" }).setOrigin(0.5), W / 2, H / 2 + 62);
    const pulse = sc.tweens.add({ targets: btn, scaleX: btn.scaleX * 1.08, scaleY: btn.scaleY * 1.08, yoyo: true, repeat: -1, duration: 420 });
    let done = false;
    const take = () => {
      if (done) return;
      done = true;
      sc.input.keyboard?.off("keydown-D", take);
      pulse.stop();
      synth.play("gulp");
      for (const o of [title, btn, hint]) o.destroy();
      const z = cam.zoom || 1;
      const cap = fixed(sc, sc.add.text(0, 0, "DEMON-KILLING MODE: ENGAGED", { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#fde047", stroke: "#000", strokeThickness: 7 }).setOrigin(0.5), W / 2, H / 2);
      cam.flash(400, 255, 80, 220);
      sc.tweens.add({ targets: cap, scaleX: (1.15 / z), scaleY: (1.15 / z), yoyo: true, duration: 300 });
      sc.time.delayedCall(1100, () => {
        cap.destroy();
        dim.destroy();
        resolve();
      });
    };
    sc.input.keyboard?.on("keydown-D", take);
    btn.on("pointerdown", take);
  });
}

/** The trip: the town swims, the colours cycle, the camera spins in, then white. Then `then()`. */
export function tripInto(sc: Phaser.Scene, then: () => void) {
  const cam = sc.cameras.main;
  const W = cam.width;
  const H = cam.height;
  synth.play("gasp");
  const haze = fixed(sc, sc.add.rectangle(W / 2, H / 2, W * 1.6, H * 1.6, 0xff4fd8, 0.0).setBlendMode(Phaser.BlendModes.ADD), W / 2, H / 2);
  const cols = [0xff4fd8, 0xfacc15, 0x22d3ee, 0xa78bfa, 0x4ade80];
  let i = 0;
  const cycle = sc.time.addEvent({ delay: 140, loop: true, callback: () => haze.setFillStyle(cols[++i % cols.length], haze.fillAlpha) });
  sc.tweens.add({ targets: haze, fillAlpha: 0.45, duration: 1600 });
  // the world wobbles, then dives in
  const z0 = cam.zoom || 1;
  const fx = (cam as unknown as { postFX?: { addColorMatrix?: () => { hue: (n: number) => void }; clear?: () => void } }).postFX;
  const cm = fx?.addColorMatrix?.();
  sc.tweens.addCounter({
    from: 0,
    to: 1,
    duration: 2200,
    ease: "Quad.in",
    onUpdate: (tw) => {
      const t = tw.getValue() ?? 0;
      cam.setRotation(Math.sin(t * 18) * 0.12 * (1 + t * 3));
      cam.setZoom(z0 * (1 + Math.sin(t * 11) * 0.06 + t * t * 2.2));
      cm?.hue(t * 900);
    },
    onComplete: () => {
      cycle.remove();
      cam.flash(250, 255, 255, 255);
      cam.fadeOut(220, 255, 220, 245);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        cam.setRotation(0).setZoom(z0);
        fx?.clear?.();
        then();
      });
    },
  });
}
