import Phaser from 'phaser';
import { GameplayScene } from './GameplayScene';
import { HoneyWasp } from '../enemies/types';
import { Charger, HenDo } from '../enemies/roster';
import { VIEW } from '../config/tuning';
import { session } from '../core/session';

const G = 320; // ground top

// Chapter 2: a grotty parody supermarket whose garden aisle turns into Frendship Forest.
export class TeskoScene extends GameplayScene {
  private bgT!: Phaser.GameObjects.TileSprite;
  private bgF!: Phaser.GameObjects.TileSprite;
  private signsLayer!: Phaser.GameObjects.TileSprite;
  private forestMid!: Phaser.GameObjects.TileSprite;
  private leaving = false;

  constructor() {
    super('tesko');
    this.musicKey = 'mus_tesko';
  }

  protected buildLevel() {
    this.leaving = false;
    this.worldW = 4240;
    this.worldH = VIEW.H;
    this.spawn = { x: 60, y: G - 2 };

    this.bgT = this.add.tileSprite(0, 0, VIEW.W, VIEW.H, 'bg_tesko').setOrigin(0).setScrollFactor(0).setDepth(-10).setTint(0x8a8a9e);
    this.bgF = this.add.tileSprite(0, 0, VIEW.W, VIEW.H, 'bg_forest').setOrigin(0).setScrollFactor(0).setDepth(-10).setAlpha(0);
    this.signsLayer = this.add.tileSprite(0, 52, VIEW.W, 120, 'bg_tesko_signs').setOrigin(0).setScrollFactor(0).setDepth(-9).setTint(0xb0b0c0);
    this.forestMid = this.add.tileSprite(0, G - 200, VIEW.W, 220, 'bg_forest_mid').setOrigin(0).setScrollFactor(0).setDepth(-9).setAlpha(0).setTint(0xc8d8c8);

    // decor
    for (const x of [200, 980, 1500]) this.add.image(x, G, 'prop_trolleys').setOrigin(0.5, 1).setDepth(15);
    for (const x of [2420, 2800, 3330, 3620, 3960]) this.add.image(x, G, 'prop_bush').setOrigin(0.5, 1).setDepth(15);

    // ---- supermarket ----
    this.solid(0, G, 1180, 40, 'tesko');
    this.solid(560, 290, 120, 30, 'tesko');
    this.oneWay(720, 262, 96, 'tesko');
    this.oneWay(860, 222, 96, 'tesko');
    this.addSign(110, G, 'PRES JUMP 2 YEE', 'Jump: K / Space / (A). Tap for a hop, hold for a full jump.');
    this.addSign(260, G, 'SHOOT DA TROLLEYS', 'Shoot: J / Z / (X). Hold Up/Down to aim. SanMik: keep holding, then release for a YEE blast.');
    this.addSign(420, G, 'MELEE 4 CLOSE STUFF', 'Melee: L / C / (B).  SanChz: Down + Melee = Rancid Fart.');
    this.addSign(650, 290, 'DOWN + JUMP 2 DROP', 'Stand on a shelf, hold Down and press Jump to drop through.');
    this.addSign(1130, G, 'MIND DA GAP', 'Pits cost 1 HP and put you back on solid ground.');
    this.addEnemy(Charger.wheelie(this, 480, G));
    this.addEnemy(Charger.wheelie(this, 1000, G));
    this.addEnemy(new HenDo(this, 1100, G));
    this.addPickup(908, 222, 'pepsi');

    this.solid(1250, G, 650, 40, 'tesko');
    this.addSign(1290, G, 'CRATES = WEAPONS', 'Switch weapon: Q / E  (LB / RB).');
    this.addPickup(1340, G, 'crate1');
    this.oneWay(1460, 262, 80, 'tesko');
    this.addPickup(1500, 262, 'friggle');
    this.addEnemy(Charger.wheelie(this, 1420, G));
    this.addEnemy(new HenDo(this, 1560, G));
    this.addCheckpoint(1620, G);
    this.addSign(1690, G, 'METER FULL? PRES SPECIAL', 'Special: I / V / (LT) when the meter is full.  Alt: Shift / (Y): SanMik poses, SanChz guards.');
    this.addPickup(1740, G, 'pepsimax');
    this.solid(1780, 284, 120, 36, 'tesko');

    // ---- garden aisle ----
    this.solid(1900, G, 380, 40, 'forest');
    this.oneWay(1890, 220, 96, 'forest');
    this.addPickup(1938, 220, 'crate2');
    this.addEnemy(new HoneyWasp(this, 2050, 200));
    this.addEnemy(Charger.wheelie(this, 2150, G));
    this.addEnemy(new HoneyWasp(this, 2250, 180));
    this.addSign(2250, G, 'FRENDSHIP FOREST >', 'Mind the honey wasps. Their shots can be destroyed - and SanChz can guard them back.');

    // ---- frendship forest ----
    this.solid(2360, G, 790, 40, 'forest');
    this.addPickup(2430, G, 'food');
    this.solid(2560, 292, 110, 28, 'forest');
    this.solid(2670, 262, 110, 58, 'forest');
    this.addPickup(2725, 262, 'crate4');
    this.addEnemy(Charger.wheelie(this, 2500, G));
    this.addEnemy(new HenDo(this, 2730, 262));
    this.oneWay(2860, 256, 90, 'forest');
    this.oneWay(2980, 205, 90, 'forest');
    this.addPickup(3025, 205, 'sock');
    this.addEnemy(new HoneyWasp(this, 2930, 160));
    this.addEnemy(new HenDo(this, 3060, G));

    this.solid(3240, G, 1000, 40, 'forest');
    this.addCheckpoint(3400, G);
    this.addPickup(3480, G, 'crate3');
    this.addEnemy(new HoneyWasp(this, 3560, 190));
    this.addEnemy(Charger.wheelie(this, 3640, G));
    this.addEnemy(new HenDo(this, 3720, G));
    this.addPickup(3780, G, 'pepsi');
    this.addEnemy(new HoneyWasp(this, 3860, 200));
    this.addEnemy(new HenDo(this, 3920, G));
    this.addPickup(3960, G, 'spidge');
    this.addSign(4010, G, "BEGOUR'S HOUSE > (HE'S LOVELY)", '');
    this.add.image(4110, G, 'prop_arch').setOrigin(0.5, 1).setDepth(16);
    this.addExit(4140, 0, 120, VIEW.H, () => this.leave());
  }

  protected afterCreate() {
    if (!this.data_.retry) {
      session.chapterStartedAt = performance.now();
      session.chapterHits = 0;
      session.chapterDeaths = 0;
      session.chapter = 2;
      this.fx.banner('CHAPTER 2: BIG TESK-O', 'Find Begour. Get the wish fragment. Try to be nice.', '#ffe14a', 2400);
      this.time.delayedCall(2600, () => this.showControlsHint());
    }
  }

  private leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.inputLocked = true;
    this.player.vx = 120;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(520, () => this.scene.start('begour', {}));
  }

  protected levelUpdate() {
    const cam = this.cameras.main;
    const sx = cam.scrollX;
    this.bgT.tilePositionX = sx * 0.3;
    this.bgF.tilePositionX = sx * 0.2;
    this.signsLayer.tilePositionX = sx * 0.55;
    this.forestMid.tilePositionX = sx * 0.5;
    const t = Phaser.Math.Clamp((sx + VIEW.W / 2 - 1950) / 450, 0, 1);
    this.bgT.setAlpha(1 - t);
    this.signsLayer.setAlpha(1 - t);
    this.bgF.setAlpha(t);
    this.forestMid.setAlpha(t);
    if (this.leaving) this.player.pbody.setVelocityX(120);
  }

  debugState() {
    return { level: 'tesko', checkpoint: this.checkpointIdx, enemies: this.enemies.getLength() };
  }
}
