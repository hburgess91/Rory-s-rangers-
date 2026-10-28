import Phaser from 'phaser';

// Action-based input. Gameplay code only ever asks about actions, never keys.
// Call update() exactly once at the start of each scene update.

export type Action =
  | 'left' | 'right' | 'up' | 'down'
  | 'jump' | 'shoot' | 'melee' | 'alt' | 'special'
  | 'prev' | 'next' | 'pause' | 'confirm' | 'back';

// In-game: WASD moves (W jumps), arrows fight.
//   -> shoot forward, ^ shoot up, <- melee, v special. Shift = pose/guard, Q/E = weapon.
const GAME_KEYS: Record<Action, string[]> = {
  left: ['A'],
  right: ['D'],
  up: ['UP'],
  down: ['S'],
  jump: ['W', 'SPACE'],
  shoot: ['RIGHT', 'UP'],
  melee: ['LEFT'],
  alt: ['SHIFT'],
  special: ['DOWN'],
  prev: ['Q'],
  next: ['E'],
  pause: ['ESC', 'P'],
  confirm: ['ENTER', 'SPACE'],
  back: ['ESC', 'BACKSPACE'],
};

// Menus: arrows or WASD to navigate.
const MENU_KEYS: Record<Action, string[]> = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  jump: ['SPACE'],
  shoot: [],
  melee: [],
  alt: [],
  special: [],
  prev: ['Q'],
  next: ['E'],
  pause: ['ESC', 'P'],
  confirm: ['ENTER', 'SPACE'],
  back: ['ESC', 'BACKSPACE'],
};

// Standard gamepad mapping indices
const PAD: Partial<Record<Action, number[]>> = {
  jump: [0], // A / Cross
  melee: [1], // B / Circle
  shoot: [2, 7], // X / Square, RT
  alt: [3], // Y / Triangle
  prev: [4], // LB
  next: [5], // RB
  special: [6], // LT
  pause: [9], // Start
  confirm: [0, 9],
  back: [1],
};

export const CONTROL_HINTS = {
  keyboard: 'Move: A/D  Jump: W  Crouch: S  Shoot: \u2192 (\u2191 shoots up)  Melee: \u2190  Special: \u2193  Pose/Guard: Shift  Weapon: Q/E  Pause: Esc',
  pad: 'Move: Stick/D-pad  Jump: A  Shoot: X/RT  Melee: B  Alt: Y  Special: LT  Weapon: LB/RB  Pause: Start',
};

export class Controls {
  private keys = new Map<string, Phaser.Input.Keyboard.Key>();
  private now = new Map<Action, boolean>();
  private prev = new Map<Action, boolean>();
  lastDevice: 'keyboard' | 'pad' = 'keyboard';
  enabled = true;
  // Keys pressed since the last update(), so a tap shorter than one frame still registers.
  private tapped = new Set<number>();
  private onKey = (e: KeyboardEvent) => { this.tapped.add(e.keyCode); };

  private keymap: Record<Action, string[]>;

  constructor(private scene: Phaser.Scene, mode: 'menu' | 'game' = 'menu') {
    this.keymap = mode === 'game' ? GAME_KEYS : MENU_KEYS;
    const kb = scene.input.keyboard;
    if (kb) {
      const all = new Set(Object.values(this.keymap).flat());
      for (const k of all) this.keys.set(k, kb.addKey(k, true, false));
      kb.on('keydown', this.onKey);
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  get pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || !gp.total) return null;
    return gp.getPad(0) ?? gp.pad1 ?? null;
  }

  update() {
    for (const [a, v] of this.now) this.prev.set(a, v);
    const pad = this.pad;
    let padUsed = false;
    let kbUsed = false;
    for (const a of Object.keys(this.keymap) as Action[]) {
      let down = false;
      if (this.enabled) {
        for (const k of this.keymap[a]) {
          const key = this.keys.get(k);
          if (key && (key.isDown || this.tapped.has(key.keyCode))) { down = true; kbUsed = true; break; }
        }
        if (pad) {
          for (const b of PAD[a] ?? []) if (pad.buttons[b]?.pressed) { down = true; padUsed = true; }
          const ax = pad.leftStick.x, ay = pad.leftStick.y;
          const dir = (a === 'left' && (ax < -0.4 || pad.left)) || (a === 'right' && (ax > 0.4 || pad.right)) ||
            (a === 'up' && (ay < -0.5 || pad.up)) || (a === 'down' && (ay > 0.5 || pad.down));
          if (dir) { down = true; padUsed = true; }
        }
      }
      this.now.set(a, down);
    }
    this.tapped.clear();
    if (padUsed) this.lastDevice = 'pad';
    else if (kbUsed) this.lastDevice = 'keyboard';
  }

  isDown(a: Action) {
    return this.now.get(a) ?? false;
  }

  justPressed(a: Action) {
    return (this.now.get(a) ?? false) && !(this.prev.get(a) ?? false);
  }

  justReleased(a: Action) {
    return !(this.now.get(a) ?? false) && (this.prev.get(a) ?? false);
  }

  axisX() {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }

  axisY() {
    return (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);
  }

  /** Clear edges, e.g. after a menu closes so the confirm press doesn't also jump. */
  swallow() {
    for (const [a, v] of this.now) this.prev.set(a, v);
    for (const a of this.now.keys()) this.now.set(a, this.now.get(a)!);
  }

  destroy() {
    const kb = this.scene.input?.keyboard;
    if (kb) {
      kb.off('keydown', this.onKey);
      for (const k of this.keys.values()) kb.removeKey(k, false);
    }
    this.keys.clear();
  }
}
