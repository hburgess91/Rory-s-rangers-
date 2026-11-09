import Phaser from "phaser";
import { TOUCH } from "../ui/TouchControls";
import { keysFor } from "../systems/keybinds";

/** Input abstraction: keyboard + mouse, with gamepad support layered on top. */
export class Controls {
  private scene: Phaser.Scene;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private pressedOnce = new Set<string>();
  private pointerAngle = 0;
  aimFromPad = false;
  /** Inverted horizontal controls (Drongus decree). */
  invertX = false;
  /** Auto-aim angle for touch play (set by the combat scene). */
  autoAim: number | null = null;
  autoAimPoint: { x: number; y: number } | null = null;
  private lastMoveAngle = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys("ESC,TAB") as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture("SPACE,TAB,UP,DOWN,LEFT,RIGHT");
    scene.input.mouse?.disableContextMenu();
  }

  /** Is any key bound to this action held? (Bindings are read live, so rebinding in the menu applies at once.) */
  private down(action: string): boolean {
    const kb = this.scene.input.keyboard;
    if (!kb) return false;
    for (const name of keysFor(action)) {
      if (!this.keys[name]) {
        try {
          this.keys[name] = kb.addKey(name, ["SPACE", "TAB", "UP", "DOWN", "LEFT", "RIGHT"].includes(name));
        } catch {
          continue;
        }
      }
      if (this.keys[name].isDown) return true;
    }
    return false;
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || !gp.total) return null;
    return gp.getPad(0) ?? null;
  }

  move(): { x: number; y: number } {
    const k = this.keys;
    let x = (this.down("right") ? 1 : 0) - (this.down("left") ? 1 : 0);
    let y = (this.down("down") ? 1 : 0) - (this.down("up") ? 1 : 0);
    const p = this.pad();
    if (p && Math.hypot(p.leftStick.x, p.leftStick.y) > 0.2) {
      x = p.leftStick.x;
      y = p.leftStick.y;
    }
    if (TOUCH.enabled && Math.hypot(TOUCH.mx, TOUCH.my) > 0.1) {
      x = TOUCH.mx;
      y = TOUCH.my;
    }
    if (x || y) this.lastMoveAngle = Math.atan2(y, x);
    if (this.invertX) x = -x;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /** Aim angle from the player position (world coords). */
  aim(px: number, py: number): number {
    if (TOUCH.enabled && !this.scene.input.mousePointer?.isDown && this.scene.input.activePointer.wasTouch) {
      this.pointerAngle = this.autoAim ?? this.lastMoveAngle;
      return this.pointerAngle;
    }
    const p = this.pad();
    if (p && Math.hypot(p.rightStick.x, p.rightStick.y) > 0.3) {
      this.aimFromPad = true;
      this.pointerAngle = Math.atan2(p.rightStick.y, p.rightStick.x);
      return this.pointerAngle;
    }
    const ptr = this.scene.input.activePointer;
    const wp = this.scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
    if (!this.aimFromPad || ptr.isDown) {
      this.pointerAngle = Math.atan2(wp.y - py, wp.x - px);
      this.aimFromPad = false;
    }
    return this.pointerAngle;
  }

  aimPoint(): { x: number; y: number } {
    const ptr = this.scene.input.activePointer;
    if (TOUCH.enabled && ptr.wasTouch && this.autoAimPoint) return this.autoAimPoint;
    return this.scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
  }

  attackHeld(): boolean {
    const ptr = this.scene.input.activePointer;
    const p = this.pad();
    if (TOUCH.enabled && TOUCH.attack) return true;
    if (ptr.wasTouch && TOUCH.enabled) return this.down("attack") || !!(p && (p.R2 > 0.3 || p.A));
    return (ptr.isDown && ptr.leftButtonDown()) || this.down("attack") || !!(p && (p.R2 > 0.3 || p.A));
  }

  private edge(name: string, down: boolean): boolean {
    if (TOUCH.edges.has(name)) {
      TOUCH.edges.delete(name);
      return true;
    }
    if (down) {
      if (this.pressedOnce.has(name)) return false;
      this.pressedOnce.add(name);
      return true;
    }
    this.pressedOnce.delete(name);
    return false;
  }

  /** After a dialogue closes, ignore keys that are still held until they are released. */
  swallow() {
    for (const n of ["jump", "interact", "dodge", "special", "burst", "bottle", "bongo", "pause", "swap", "fart", "transform", "cume"]) this.pressedOnce.add(n);
    TOUCH.edges.clear();
  }

  special(): boolean {
    const ptr = this.scene.input.activePointer;
    const p = this.pad();
    return this.edge("special", (ptr.isDown && !ptr.wasTouch && ptr.rightButtonDown()) || this.down("special") || !!(p && (p.L2 > 0.3 || p.Y)));
  }
  dodge(): boolean {
    const p = this.pad();
    return this.edge("dodge", this.down("dodge") || !!(p && (p.B || p.R1)));
  }
  bottle(): boolean {
    const p = this.pad();
    return this.edge("bottle", this.down("bottle") || !!(p && p.left));
  }
  bongo(): boolean {
    const p = this.pad();
    return this.edge("bongo", this.down("bongo") || !!(p && p.right));
  }
  burst(): boolean {
    const p = this.pad();
    return this.edge("burst", this.down("burst") || !!(p && p.L1));
  }
  /** Let one rip. */
  fart(): boolean {
    const p = this.pad();
    return this.edge("fart", this.down("fart") || !!(p && p.down));
  }
  /** GOLDEN JUICE TRANSFORMATION. */
  transform(): boolean {
    return this.edge("transform", this.down("transform"));
  }
  /** CUMEHAMEHA (while golden). */
  cume(): boolean {
    return this.edge("cume", this.down("cume"));
  }
  /** Swap between fists and found guns. */
  swap(): boolean {
    const p = this.pad();
    return this.edge("swap", this.down("swap") || !!(p && p.up));
  }
  /** Side-scrolling rooms: W / Up / joystick up. */
  jump(): boolean {
    const k = this.keys;
    const p = this.pad();
    const stickUp = (TOUCH.enabled && TOUCH.my < -0.6) || !!(p && p.leftStick.y < -0.6);
    return this.edge("jump", this.down("up") || stickUp);
  }
  interact(): boolean {
    const p = this.pad();
    return this.edge("interact", this.down("interact") || !!(p && p.X));
  }
  pause(): boolean {
    const p = this.pad();
    return this.edge("pause", this.keys.ESC.isDown || !!(p && (p.buttons[9]?.pressed ?? false)));
  }
}
