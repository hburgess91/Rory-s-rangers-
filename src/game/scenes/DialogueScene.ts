import Phaser from "phaser";
import type { Line } from "../../data/types";
import { DialogueBox } from "../ui/DialogueBox";

export interface DialogueData {
  lines: Line[];
  historical?: boolean;
  caller?: string;
  onDone?: () => void;
}

/** Overlay that pauses the calling scene, plays a script, then resumes it. */
export class DialogueScene extends Phaser.Scene {
  constructor() {
    super("Dialogue");
  }

  create(data: DialogueData) {
    const box = new DialogueBox(this, 10);
    if (data.caller && this.scene.isActive(data.caller)) this.scene.pause(data.caller);
    this.scene.bringToTop();
    box.play(data.lines ?? [], { historical: data.historical }).then(() => {
      if (data.caller && this.scene.isPaused(data.caller)) this.scene.resume(data.caller);
      this.scene.stop();
      data.onDone?.();
    });
  }
}

/** Convenience: run a script over `scene`, resolve when finished. */
export function runDialogue(scene: Phaser.Scene, lines: Line[], historical = false): Promise<void> {
  return new Promise((res) => {
    const mgr = scene.game.scene;
    if (mgr.isActive("Dialogue")) mgr.stop("Dialogue");
    scene.scene.launch("Dialogue", { lines, historical, caller: scene.scene.key, onDone: res });
  });
}
