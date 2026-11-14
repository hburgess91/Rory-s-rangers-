import Phaser from "phaser";
import { synth } from "../audio/Synth";
import { FONT } from "../ui/theme";

/** The very first screen: one big button. (It also gets the browser to let the music play.) */
export class EnterScene extends Phaser.Scene {
  private gone = false;

  constructor() {
    super("Enter");
  }

  create() {
    this.gone = false;
    this.cameras.main.setBackgroundColor(0x07040d);
    // a slow drift of stars
    for (let i = 0; i < 70; i++) {
      const s = this.add.circle(Math.random() * 960, Math.random() * 540, Math.random() < 0.85 ? 1 : 2, 0xffffff, 0.2 + Math.random() * 0.6);
      this.tweens.add({ targets: s, alpha: 0.05, yoyo: true, repeat: -1, duration: 800 + Math.random() * 2400, delay: Math.random() * 2000 });
    }
    const glow = this.add.ellipse(480, 280, 520, 160, 0xffd23f, 0.08);
    this.tweens.add({ targets: glow, scaleX: 1.15, scaleY: 1.2, alpha: 0.16, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.inOut" });
    const btn = this.add.text(480, 280, "ENTER KRELWORLD", { fontFamily: "Impact, sans-serif", fontSize: "60px", color: "#ffd23f", stroke: "#2a1400", strokeThickness: 10 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.setShadow(0, 0, "#ffd23f", 18, true, true);
    this.tweens.add({ targets: btn, scale: 1.06, yoyo: true, repeat: -1, duration: 700, ease: "Sine.inOut" });
    this.add.text(480, 350, "click · tap · or press any key", { fontFamily: FONT, fontSize: "14px", color: "#8a7fb0" }).setOrigin(0.5);
    this.add.text(480, 515, "Krelworld is a work of fiction. Sound on.", { fontFamily: FONT, fontSize: "11px", color: "#4b4560" }).setOrigin(0.5);
    btn.on("pointerover", () => btn.setColor("#ffffff"));
    btn.on("pointerout", () => btn.setColor("#ffd23f"));
    btn.on("pointerdown", () => this.enter());
    this.input.on("pointerdown", () => this.enter());
    this.input.keyboard?.on("keydown", () => this.enter());
  }

  private enter() {
    if (this.gone) return;
    this.gone = true;
    synth.unlock();
    synth.play("perfect");
    this.cameras.main.flash(300, 255, 210, 63);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start("Title"));
  }
}
