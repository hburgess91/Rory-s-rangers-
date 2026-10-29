import Phaser from "phaser";
import { FONT } from "./theme";

/** Shared touch state, written by the on-screen pad and read by Controls. */
export const TOUCH = {
  enabled: false,
  mx: 0,
  my: 0,
  attack: false,
  edges: new Set<string>(),
};

/** Virtual joystick + action buttons for phones and tablets. Lives in the UI scene. */
export class TouchControls {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private base!: Phaser.GameObjects.Arc;
  private knob!: Phaser.GameObjects.Arc;
  private stickId: number | null = null;
  private origin = { x: 110, y: 430 };

  constructor(scene: Phaser.Scene, combat: boolean) {
    this.scene = scene;
    TOUCH.enabled = true;
    scene.input.addPointer(3);
    this.root = scene.add.container(0, 0).setDepth(900);
    this.base = scene.add.circle(this.origin.x, this.origin.y, 62, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.35);
    this.knob = scene.add.circle(this.origin.x, this.origin.y, 28, 0xffffff, 0.35);
    this.root.add([this.base, this.knob]);
    const zone = scene.add.zone(0, 160, 420, 380).setOrigin(0).setInteractive();
    this.root.add(zone);
    zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.stickId = p.id;
      this.origin = { x: Phaser.Math.Clamp(p.x, 70, 330), y: Phaser.Math.Clamp(p.y, 230, 480) };
      this.base.setPosition(this.origin.x, this.origin.y);
      this.move(p);
    });
    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickId) this.move(p);
    });
    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickId) {
        this.stickId = null;
        TOUCH.mx = 0;
        TOUCH.my = 0;
        this.knob.setPosition(this.base.x, this.base.y);
      }
    });
    const btn = (x: number, y: number, r: number, label: string, key: string, hold = false, color = 0xffffff) => {
      const c = scene.add.circle(x, y, r, color, 0.18).setStrokeStyle(2, color, 0.5).setInteractive();
      const t = scene.add.text(x, y, label, { fontFamily: FONT, fontSize: r > 34 ? "15px" : "12px", color: "#ffffff", fontStyle: "bold", align: "center" }).setOrigin(0.5);
      this.root.add([c, t]);
      c.on("pointerdown", () => {
        if (hold) TOUCH.attack = true;
        else TOUCH.edges.add(key);
        c.setFillStyle(color, 0.4);
      });
      const up = () => {
        if (hold) TOUCH.attack = false;
        c.setFillStyle(color, 0.18);
      };
      c.on("pointerup", up);
      c.on("pointerout", up);
    };
    if (combat) {
      btn(860, 440, 46, "ATTACK", "attack", true, 0xff6666);
      btn(770, 470, 32, "DODGE", "dodge");
      btn(880, 340, 32, "SPECIAL", "special", false, 0xc084fc);
      btn(790, 380, 28, "E", "interact");
      btn(700, 490, 24, "PJ", "bottle", false, 0xffb6c1);
      btn(640, 500, 24, "🍺", "bongo", false, 0xe0a35a);
      btn(930, 260, 26, "BURST", "burst", false, 0xff8c00);
    } else {
      btn(860, 450, 44, "E", "interact");
    }
    btn(930, 180, 22, "II", "pause");
  }

  private move(p: Phaser.Input.Pointer) {
    const dx = p.x - this.base.x;
    const dy = p.y - this.base.y;
    const len = Math.hypot(dx, dy);
    const max = 55;
    const k = len > max ? max / len : 1;
    this.knob.setPosition(this.base.x + dx * k, this.base.y + dy * k);
    TOUCH.mx = len > 8 ? (dx * k) / max : 0;
    TOUCH.my = len > 8 ? (dy * k) / max : 0;
  }

  destroy() {
    this.root.destroy();
    TOUCH.attack = false;
    TOUCH.mx = TOUCH.my = 0;
  }
}

export function isTouchDevice(game: Phaser.Game): boolean {
  return !!game.device.input.touch && (navigator.maxTouchPoints ?? 0) > 0;
}
