import Phaser from "phaser";
import { G } from "../G";
import { CHARACTERS, PLAYABLE_ORDER } from "../../data/characters";
import { PLAYER_BARKS } from "../../content/dialogue/ambient";
import { animateWalker } from "../gfx/HD";
import type { Player } from "./Player";

/** A lad hired at the Central Bank. Follows you through one dungeon trip and shoots whatever's nearest. Can't be hurt. */
export class Companion {
  spr: Phaser.GameObjects.Sprite;
  private nextShot = 0;
  private nextBark = 0;
  private label: Phaser.GameObjects.Text;

  constructor(private world: any, private player: Player, public id: string) {
    const key = world.textures.exists(`spr_${id}`) ? `spr_${id}` : `spr_${player.id}`;
    this.spr = world.add.sprite(player.x - 50, player.y + 20, key, 0).setScale(player.spr.scaleX * 0.95).setDepth(player.y);
    this.label = world.add.text(this.spr.x, this.spr.y - 40, CHARACTERS[id]?.name ?? id, { fontFamily: "sans-serif", fontSize: "10px", color: "#86efac", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5).setDepth(900);
    this.nextBark = world.now() + 2500;
  }

  static pick(player: string): string {
    const pool = PLAYABLE_ORDER.filter((id) => id !== player);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  update(now: number) {
    const p = this.player;
    if (!this.spr.active) return;
    // trail behind you, a little to the side
    const tx = p.x - Math.cos(p.aim) * 55 + Math.sin(p.aim) * 30;
    const ty = p.y - Math.sin(p.aim) * 55 - Math.cos(p.aim) * 30;
    const dx = tx - this.spr.x;
    const dy = ty - this.spr.y;
    const d = Math.hypot(dx, dy);
    const moving = d > 12;
    if (moving) {
      const sp = Math.min(d, (d > 200 ? 9 : 4.2) * (this.world.game.loop.delta / 16));
      this.spr.x += (dx / d) * sp;
      this.spr.y += (dy / d) * sp;
    }
    animateWalker(this.spr, moving ? dx : 0, moving ? dy : 0, moving, now);
    this.spr.setDepth(this.spr.y);
    this.label.setPosition(this.spr.x, this.spr.y - 40);
    // shoot the nearest enemy
    if (now >= this.nextShot) {
      const e = this.world.nearestEnemy(this.spr.x, this.spr.y, 420);
      if (e) {
        const a = Math.atan2(e.y - this.spr.y, e.x - this.spr.x);
        const dmg = (7 + G.s.chapter * 2.5) * (1 + 0.08 * (G.s.upgrades.pk_dmg ?? 0));
        this.world.shoot(this.spr.x, this.spr.y - 6, { owner: "player", damage: dmg, speed: 620, angle: a + (Math.random() - 0.5) * 0.08, color: CHARACTERS[this.id]?.color ?? 0x86efac, life: 900 });
        this.spr.setFlipX(Math.cos(a) < 0);
        this.nextShot = now + 420 + Math.random() * 180;
      } else this.nextShot = now + 200;
    }
    if (now >= this.nextBark) {
      const lines = PLAYER_BARKS[this.id] ?? ["Lmao!"];
      this.world.floatText(this.spr.x, this.spr.y - 56, lines[Math.floor(Math.random() * lines.length)], "#86efac", 12);
      this.nextBark = now + 6000 + Math.random() * 7000;
    }
  }

  destroy() {
    this.spr.destroy();
    this.label.destroy();
  }
}
