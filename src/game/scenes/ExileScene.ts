import Phaser from "phaser";
import { backdrop } from "../gfx/HD";
import { G } from "../G";
import { enterExile, pickChallenge } from "../systems/ban";
import { DialogueBox } from "../ui/DialogueBox";
import { FONT, title } from "../ui/theme";
import { switchTo } from "../Flow";
import { synth } from "../audio/Synth";
import { dir, say } from "../../content/dsl";
import { bump } from "../systems/stats";
import type { Line } from "../../data/types";

/** Exile: not death. A corridor outside the chat, and a petty re-entry challenge. */
export class ExileScene extends Phaser.Scene {
  constructor() {
    super("Exile");
  }

  async create(data: { why?: string; returnTo: { dungeon: string; room: number; bossHpPct?: number } }) {
    const s = G.s;
    enterExile(s);
    G.drongus("banned");
    this.cameras.main.fadeIn(400);
    const exBg = this.add.rectangle(0, 0, 960, 540, 0x16161c).setOrigin(0);
    if (backdrop(this, "bg_exile", { dim: 0.3, depth: -10 })) exBg.setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(0x24242e, 1).fillRect(0, 200, 960, 180);
    for (let x = 0; x < 960; x += 120) g.fillStyle(0x30303c, 1).fillRect(x, 200, 6, 180);
    g.fillStyle(0x3a2a1a, 1).fillRect(430, 120, 100, 160);
    this.add.text(480, 108, "THE GROUP CHAT", { fontFamily: FONT, fontSize: "12px", color: "#888" }).setOrigin(0.5);
    title(this, 480, 40, "YOU HAVE BEEN REMOVED FROM THE GROUP", 24, "#ff4d4d");
    this.add.text(480, 70, data?.why ?? "", { fontFamily: FONT, fontSize: "13px", color: "#ffaaaa" }).setOrigin(0.5);
    this.add.sprite(380, 330, `spr_${s.player}`, 0).setScale(3.5);
    if (s.player !== "FLENKY") this.add.sprite(600, 330, "spr_FLENKY", 0).setScale(3.5);
    else this.add.sprite(600, 330, "spr_PROCTUS", 0).setScale(3.5);
    synth.music("doc");
    const box = new DialogueBox(this, 1000);
    const intro: Line[] =
      s.player === "FLENKY"
        ? [dir("The corridor. Your corridor. It's lovely out here. Quiet. Nobody asks for Krazy Facts."), say("FLENKY", "Pls."), say("FLENKY", "Can't help it."), say("PROCTUS", "Oh, hello. I'm also banned. I'm appealing. Want to appeal together?")]
        : [dir("The corridor outside the group chat. It's quiet. Somebody has carved 'JENKO WOZ ERE (x9)' into the wall."), say("FLENKY", "Alright mate. First time? Don't worry. You fill in a form, answer a quiz, you're back in by teatime."), say("FLENKY", "I've done it nine times. Ten with the Queen one.")];
    await box.play(intro);
    let ok = false;
    let tries = 0;
    while (!ok && tries < 6) {
      tries++;
      const ch = pickChallenge(s);
      const opts = ch.options.map((o, i) => ({ label: o.label, set: { exile_pick: i } }));
      await box.play([{ s: "NARRATOR", t: `${ch.title}\n${ch.prompt}`, dir: true, choice: opts }]);
      const pick = ch.options[s.flags.exile_pick as number];
      await box.play([dir(pick.reply)]);
      ok = pick.correct;
      if (!ok) await box.play([say(s.player === "FLENKY" ? "PROCTUS" : "FLENKY", "Unlucky. Go again. They always let you go again.")]);
    }
    bump(s, "readmissions");
    G.unlockArchive("arch_flenky_bans");
    await box.play([dir("DRONGUS B. DRIPPIN' added you to the group."), say("DRONGUS", "Welcome back. Don't make me regret this. I will regret this.", { notify: true })]);
    G.save();
    switchTo(this, "Dungeon", data.returnTo);
  }
}
