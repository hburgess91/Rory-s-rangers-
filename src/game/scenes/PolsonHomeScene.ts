import Phaser from "phaser";
import { G } from "../G";
import { DialogueBox } from "../ui/DialogueBox";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { backdrop } from "../gfx/HD";
import { playerKey } from "../gfx/sanmikForm";
import { polsonVisit } from "../../content/polsonChats";

/**
 * Popping round Polson Towers (after Chapter 3): his front room, the sofa bed out, the curtains drawn.
 * Plays one of the real Messenger conversations with him, then you're back outside on his road.
 */
export class PolsonHomeScene extends Phaser.Scene {
  constructor() {
    super("PolsonHome");
  }

  create() {
    this.cameras.main.fadeIn(300);
    if (!backdrop(this, "bg_polson_home", { depth: -10, dim: 0.05 })) this.add.rectangle(480, 270, 960, 540, 0x3b1f22).setDepth(-10);
    synth.music("hub");
    // you by the door, Polson by the sofa bed
    const me = this.add.sprite(320, 352, playerKey(this), 0).setOrigin(0.5, 1).setScale(4.4).setDepth(300);
    const pol = this.add.sprite(590, 352, this.textures.exists("spr_POLSON") ? "spr_POLSON" : "spr_FOLK0", 0).setOrigin(0.5, 1).setScale(4.4).setDepth(400);
    pol.setFlipX(true);
    this.tweens.add({ targets: pol, y: pol.y - 3, yoyo: true, repeat: -1, duration: 900, ease: "Sine.inOut" });
    me.setData("facing", "east");
    const box = new DialogueBox(this, 1000, 0.15);
    const lines = polsonVisit(G.s);
    G.save();
    this.time.delayedCall(400, () =>
      box.play(lines, { onSpeaker: (sp) => this.tweens.add({ targets: sp === "POLSON" ? pol : me, y: 352 - 10, yoyo: true, duration: 110 }) }).then(() => {
        this.cameras.main.fadeOut(300);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => switchTo(this, "Hub", { at: "POLSON_ROAD" }));
      }),
    );
  }
}
