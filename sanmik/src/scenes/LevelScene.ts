import Phaser from 'phaser';
import { GameplayScene, GameplayData } from './GameplayScene';
import { LEVELS, LevelDef } from '../levels/defs';
import { session } from '../core/session';
import { VIEW } from '../config/tuning';

export interface LevelData extends GameplayData {
  id?: string;
}

// Generic data-driven chapter level (chapters 1, 3, 4, 5).
export class LevelScene extends GameplayScene {
  def!: LevelDef;
  private layers: { ts: Phaser.GameObjects.TileSprite; f: number; fromX?: number; toX?: number; fadeIn?: boolean }[] = [];
  private leaving = false;
  private levelState: Record<string, unknown> = {};

  constructor() {
    super('level');
  }

  init(data: LevelData) {
    super.init(data);
    this.def = LEVELS[data?.id ?? 'jobcentre'];
  }

  protected buildLevel() {
    const d = this.def;
    this.leaving = false;
    this.layers = [];
    this.levelState = {};
    this.musicKey = d.music;
    this.worldW = d.width;
    this.worldH = VIEW.H;
    this.spawn = { x: 60, y: 318 };
    for (const l of d.layers) {
      const ts = this.add.tileSprite(0, l.y ?? 0, VIEW.W, l.h ?? VIEW.H, l.tex).setOrigin(0).setScrollFactor(0).setDepth(l.depth ?? -10);
      if (l.tint) ts.setTint(l.tint);
      this.layers.push({ ts, f: l.scroll, fromX: l.fadeFrom, toX: l.fadeTo, fadeIn: l.fadeIn });
    }
    d.build(this);
    this.addExit(d.width - 90, 0, 90, VIEW.H, () => this.leave());
  }

  protected onRetry(): LevelData {
    return { id: this.def.id, checkpoint: this.checkpointIdx, retry: true };
  }

  protected afterCreate() {
    if (this.data_.retry) return;
    session.chapterStartedAt = performance.now();
    session.chapterHits = 0;
    session.chapterDeaths = 0;
    session.chapter = this.def.chapter;
    const go = () => {
      this.fx.banner(`CHAPTER ${this.def.chapter}: ${this.def.title}`, this.def.subtitle, '#ffe14a', 2400);
      if (this.def.chapter === 1) this.time.delayedCall(2600, () => this.showControlsHint());
    };
    const lines = this.def.intro(session.char);
    if (lines.length) {
      this.time.delayedCall(300, () => this.dialogue.play(lines, go));
      this.inputLocked = true;
      const unlock = () => { this.inputLocked = false; };
      const prev = this.dialogue.onToggle;
      this.dialogue.onToggle = (on) => { prev(on); if (!on) unlock(); };
    } else go();
  }

  private leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.inputLocked = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(520, () => this.scene.start(this.def.next.key, this.def.next.data ?? {}));
  }

  protected levelUpdate(dt: number) {
    const sx = this.cameras.main.scrollX;
    for (const l of this.layers) {
      l.ts.tilePositionX = sx * l.f;
      if (l.fromX !== undefined && l.toX !== undefined) {
        const t = Phaser.Math.Clamp((sx + VIEW.W / 2 - l.fromX) / (l.toX - l.fromX), 0, 1);
        l.ts.setAlpha(l.fadeIn ? t : 1 - t);
      }
    }
    this.def.update?.(this, dt, this.levelState);
    if (this.leaving) this.player.pbody.setVelocityX(120);
  }

  debugState() {
    return { level: this.def.id, checkpoint: this.checkpointIdx, enemies: this.enemies.getLength() };
  }
}
