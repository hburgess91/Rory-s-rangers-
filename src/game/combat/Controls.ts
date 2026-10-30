import Phaser from "phaser";
import { TOUCH } from "../ui/TouchControls";

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
    this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,Q,B,R,F,SHIFT,ESC,J,K,L,TAB,X,G") as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture("SPACE,TAB,UP,DOWN,LEFT,RIGHT");
    scene.input.mouse?.disableContextMenu();
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || !gp.total) return null;
    return gp.getPad(0) ?? null;
  }

  move(): { x: number; y: number } {
    const k = this.keys;
    let x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
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
    if (ptr.wasTouch && TOUCH.enabled) return this.keys.J.isDown || !!(p && (p.R2 > 0.3 || p.A));
    return (ptr.isDown && ptr.leftButtonDown()) || this.keys.J.isDown || !!(p && (p.R2 > 0.3 || p.A));
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
    for (const n of ["interact", "dodge", "special", "burst", "bottle", "bongo", "pause", "swap", "fart"]) this.pressedOnce.add(n);
    TOUCH.edges.clear();
  }

  special(): boolean {
    const ptr = this.scene.input.activePointer;
    const p = this.pad();
    return this.edge("special", (ptr.isDown && !ptr.wasTouch && ptr.rightButtonDown()) || this.keys.F.isDown || this.keys.K.isDown || !!(p && (p.L2 > 0.3 || p.Y)));
  }
  dodge(): boolean {
    const p = this.pad();
    return this.edge("dodge", this.keys.SPACE.isDown || this.keys.SHIFT.isDown || !!(p && (p.B || p.R1)));
  }
  bottle(): boolean {
    const p = this.pad();
    return this.edge("bottle", this.keys.Q.isDown || !!(p && p.left));
  }
  bongo(): boolean {
    const p = this.pad();
    return this.edge("bongo", this.keys.B.isDown || !!(p && p.right));
  }
  burst(): boolean {
    const p = this.pad();
    return this.edge("burst", this.keys.R.isDown || this.keys.L.isDown || !!(p && p.L1));
  }
  /** Let one rip. */
  fart(): boolean {
    const p = this.pad();
    return this.edge("fart", this.keys.G.isDown || !!(p && p.down));
  }
  /** Swap between fists and found guns. */
  swap(): boolean {
    const p = this.pad();
    return this.edge("swap", this.keys.X.isDown || !!(p && p.up));
  }
  interact(): boolean {
    const p = this.pad();
    return this.edge("interact", this.keys.E.isDown || !!(p && p.X));
  }
  pause(): boolean {
    const p = this.pad();
    return this.edge("pause", this.keys.ESC.isDown || !!(p && (p.buttons[9]?.pressed ?? false)));
  }
}
