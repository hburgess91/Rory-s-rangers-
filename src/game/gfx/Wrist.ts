import Phaser from "phaser";

export interface Wrist {
  obj: Phaser.GameObjects.Container;
  /** A big stroke (on a button press). */
  kick(): void;
  /** How fast it goes on its own: ms per stroke (lower = faster). */
  setSpeed(ms: number): void;
  destroy(): void;
}

/**
 * A forearm and fist going up and down. Put (x, y) a little above the middle of the censor bar: the fist stays
 * hidden under the bar and only the wrist and forearm poke out of the top. Add it to the scene (or container) BEFORE the bar so the
 * bar draws on top.
 */
export function addWrist(scene: Phaser.Scene, x: number, y: number, o: { skin?: number; sleeve?: number; scale?: number; flip?: boolean; speed?: number } = {}): Wrist {
  const s = o.scale ?? 1;
  const skin = o.skin ?? 0xe0ac87;
  const shade = Phaser.Display.Color.ValueToColor(skin).darken(25).color;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  // the fist sits at (0,0), hidden in the bar; the forearm runs up out of the top of it
  g.fillStyle(shade, 1).fillRoundedRect(-6 * s, -30 * s, 12 * s, 27 * s, 5 * s);
  g.fillStyle(skin, 1).fillRoundedRect(-5 * s, -30 * s, 9 * s, 25 * s, 4 * s);
  g.fillStyle(shade, 1).fillRoundedRect(-8 * s, -7 * s, 16 * s, 14 * s, 5 * s);
  g.fillStyle(skin, 1).fillRoundedRect(-7 * s, -7 * s, 13 * s, 12 * s, 4 * s);
  if (o.sleeve !== undefined) g.fillStyle(o.sleeve, 1).fillRect(-7 * s, -32 * s, 14 * s, 7 * s);
  // a watch, for class
  g.fillStyle(0x111827, 1).fillRect(-6 * s, -12 * s, 12 * s, 3 * s);
  g.fillStyle(0xfacc15, 1).fillRect(-2 * s, -12 * s, 4 * s, 3 * s);
  c.add(g);
  c.setAngle(o.flip ? 52 : -52);
  const baseY = y;
  let speed = o.speed ?? 110;
  let stroke: Phaser.Tweens.Tween | null = null;
  const run = () => {
    stroke?.remove();
    stroke = scene.tweens.add({ targets: c, y: baseY + 5 * s, duration: speed, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  };
  run();
  c.once(Phaser.GameObjects.Events.DESTROY, () => stroke?.remove());
  return {
    obj: c,
    kick() {
      scene.tweens.add({ targets: c, scaleY: 1.12, duration: 60, yoyo: true });
      c.y = baseY + 6 * s;
    },
    setSpeed(ms: number) {
      if (Math.abs(ms - speed) < 15) return;
      speed = ms;
      run();
    },
    destroy() {
      stroke?.remove();
      c.destroy();
    },
  };
}

/** Skin and shirt colour for a character, for their wrist. */
export function wristLook(id: string, chars: Record<string, { look?: { skin?: number; top?: number } }>): { skin: number; sleeve?: number } {
  const look = chars[id]?.look;
  return { skin: look?.skin ?? 0xe0ac87, sleeve: look?.top };
}
