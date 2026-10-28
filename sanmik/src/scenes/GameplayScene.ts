import Phaser from 'phaser';
import { Fx, textStyle } from '../core/Fx';
import { Controls, CONTROL_HINTS } from '../input/Controls';
import { Combat } from '../combat/Combat';
import { Player } from '../player/Player';
import { SanMikKit } from '../player/SanMikKit';
import { SanChzKit } from '../player/SanChzKit';
import { Hud } from '../ui/Hud';
import { Dialogue, bubble } from '../ui/Dialogue';
import { Enemy } from '../enemies/Enemy';
import { Pickup } from '../enemies/Pickup';
import { session, textureFor } from '../core/session';
import { AudioBus } from '../audio/AudioBus';
import { HEALTH, SANMIK, VIEW } from '../config/tuning';
import { getSettings, updateSettings } from '../core/settings';
import type { GameHost } from '../core/host';
import { debugApi } from '../core/debug';

export type Theme = 'tesko' | 'forest' | 'gym' | 'office' | 'street' | 'pub' | 'heaven' | 'velvet';

export interface GameplayData {
  checkpoint?: number;
  retry?: boolean;
}

const RETCONS = [
  'THAT DIDN\'T HAPPEN',
  'DEATH NOT CANON',
  'RETCONNED. YEE.',
  'CONTINUITY ERROR - RESPAWNING',
  'U DIED. AGAIN. IT\'S FINE.',
  'NEXT ALBUM, U R ALIVE AGAIN',
];

let RUN = 0;

export abstract class GameplayScene extends Phaser.Scene implements GameHost {
  combat!: Combat;
  fx!: Fx;
  controls!: Controls;
  player!: Player;
  hud!: Hud;
  dialogue!: Dialogue;
  solids!: Phaser.Physics.Arcade.StaticGroup;
  oneWays!: Phaser.Physics.Arcade.StaticGroup;
  enemies!: Phaser.GameObjects.Group;
  pickups!: Phaser.GameObjects.Group;
  inputLocked = false;
  godMode = false;
  now = 0;
  worldW: number = VIEW.W;
  worldH: number = VIEW.H;
  spawn = { x: 60, y: 300 };
  checkpoints: { x: number; y: number; flag?: Phaser.GameObjects.Image }[] = [];
  checkpointIdx = 0;
  data_: GameplayData = {};
  protected runId = 0;
  protected frozen = false;
  protected frozenUntil = 0;
  protected dead = false;
  protected debugG!: Phaser.GameObjects.Graphics;
  protected debugText!: Phaser.GameObjects.Text;
  protected signs: { x: number; hint: string; shown: boolean }[] = [];
  protected exits: { rect: Phaser.Geom.Rectangle; fn: () => void; used: boolean }[] = [];
  protected specialLayer: Phaser.GameObjects.Container | null = null;
  protected specialTick?: Phaser.Time.TimerEvent;
  protected musicKey: string | null = null;

  init(data: GameplayData) {
    this.data_ = data ?? {};
  }

  /** Build the stage. Must set worldW/worldH/spawn and add solids, enemies, pickups. */
  protected abstract buildLevel(): void;
  protected afterCreate(): void {}
  protected levelUpdate(_dt: number): void {}
  retryData(): GameplayData {
    return this.onRetry();
  }

  protected onRetry(): GameplayData {
    return { checkpoint: this.checkpointIdx, retry: true };
  }

  create() {
    this.runId = ++RUN;
    // Phaser reuses the scene instance on restart, so reset every field here.
    this.inputLocked = false;
    this.now = 0;
    this.frozen = false;
    this.frozenUntil = 0;
    this.dead = false;
    this.checkpoints = [];
    this.signs = [];
    this.exits = [];
    this.specialLayer = null;
    this.killStreak = [];
    this.lastTaunt = 0;
    this.godMode = debugApi.god;

    this.fx = new Fx(this);
    this.controls = new Controls(this);
    this.solids = this.physics.add.staticGroup();
    this.oneWays = this.physics.add.staticGroup();
    this.enemies = this.add.group();
    this.pickups = this.add.group();
    this.combat = new Combat(this, this.fx, this.solids);
    this.combat.onHitStop = (ms) => this.hitStop(ms);

    this.buildLevel();
    this.physics.world.setBounds(0, -200, this.worldW, this.worldH + 400);
    this.physics.world.checkCollision.down = false;

    // checkpointIdx 0 = level start, N = the Nth flag
    this.checkpointIdx = Phaser.Math.Clamp(this.data_.checkpoint ?? 0, 0, this.checkpoints.length);
    const start = this.checkpointIdx === 0 ? this.spawn : this.checkpoints[this.checkpointIdx - 1];
    for (let i = 0; i < this.checkpointIdx; i++) this.checkpoints[i].flag?.setTexture('prop_checkpoint_on');

    const tex = textureFor(session.char, session.costume);
    const kit = session.char === 'sanmik' ? new SanMikKit() : new SanChzKit();
    this.player = new Player(this, start.x, start.y, tex, kit);
    this.combat.player = this.player;

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.oneWays, () => { this.player.standingOnOneWay = true; }, () => this.now >= this.player.dropUntil && this.player.pbody.velocity.y >= 0, this);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.enemies, this.oneWays);
    this.physics.add.collider(this.pickups, this.solids);
    this.physics.add.collider(this.pickups, this.oneWays);
    this.physics.add.overlap(this.player, this.pickups, (_p, pk) => {
      const pickup = pk as Pickup;
      if (pickup.taken || !this.player.alive) return;
      if (this.player.applyPickup(pickup.kind)) pickup.collect();
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, true, 0.14, 0.14);
    cam.setDeadzone(40, 60);
    cam.setRoundPixels(true);

    this.hud = new Hud(this, this.player);
    this.dialogue = new Dialogue(this, this.controls, true);
    this.dialogue.onToggle = (on) => this.hud.setVisible(!on);

    this.debugG = this.add.graphics().setDepth(400);
    this.debugText = this.add.text(4, 64, '', { fontFamily: 'monospace', fontSize: '8px', color: '#9fff9f', backgroundColor: '#000000aa' }).setScrollFactor(0).setDepth(401);
    this.setupDebugKeys();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());
    debugApi.gameplay = this;

    if (this.musicKey) AudioBus.music(this.musicKey);
    AudioBus.musicOverride(null);
    this.afterCreate();
  }

  // ---------------- level-building helpers ----------------

  solid(x: number, y: number, w: number, h: number, theme: Theme) {
    const top = this.add.tileSprite(x, y, w, 16, `tile_${theme}_top`).setOrigin(0).setDepth(20);
    if (h > 16) this.add.tileSprite(x, y + 16, w, h - 16, `tile_${theme}_fill`).setOrigin(0).setDepth(20);
    const z = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.solids.add(z);
    void top;
    return z;
  }

  oneWay(x: number, y: number, w: number, theme: Theme) {
    const tex = theme === 'tesko' ? 'plat_shelf' : theme === 'forest' ? 'plat_branch' : `plat_${theme}`;
    this.add.tileSprite(x, y, w, 8, tex).setOrigin(0).setDepth(21);
    if (theme === 'tesko') { this.add.rectangle(x + 3, y + 8, 2, this.worldH - y, 0x8a8f9c).setOrigin(0).setDepth(19); this.add.rectangle(x + w - 5, y + 8, 2, this.worldH - y, 0x8a8f9c).setOrigin(0).setDepth(19); }
    const z = this.add.zone(x + w / 2, y + 4, w, 8);
    this.oneWays.add(z);
    const b = z.body as Phaser.Physics.Arcade.StaticBody;
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    return z;
  }

  addEnemy<T extends Enemy>(e: T): T {
    this.enemies.add(e);
    return e;
  }

  addPickup(x: number, y: number, kind: string, floating = false) {
    const p = new Pickup(this, x, y, kind, session.char, floating);
    this.pickups.add(p);
    return p;
  }

  addCheckpoint(x: number, y: number) {
    const flag = this.add.image(x, y, 'prop_checkpoint').setOrigin(0.5, 1).setDepth(30);
    this.checkpoints.push({ x, y: y - 2, flag });
  }

  addSign(x: number, y: number, text: string, hint = '') {
    this.add.image(x, y, 'prop_sign').setOrigin(0.5, 1).setDepth(25);
    this.add.text(x, y - 27, text, { ...textStyle(8, '#3a1a0a', '#fff6d8', 0), wordWrap: { width: 62 }, lineSpacing: -1 }).setOrigin(0.5).setDepth(26);
    if (hint) this.signs.push({ x, hint, shown: false });
  }

  addExit(x: number, y: number, w: number, h: number, fn: () => void) {
    this.exits.push({ rect: new Phaser.Geom.Rectangle(x, y, w, h), fn, used: false });
  }

  // ---------------- GameHost ----------------

  hitStop(ms: number) {
    if (ms <= 0) return;
    const until = performance.now() + ms;
    if (until <= this.frozenUntil) return;
    this.frozenUntil = until;
    if (!this.frozen) {
      this.frozen = true;
      this.physics.pause();
      this.tweens.pauseAll();
      this.time.paused = true;
    }
  }

  private unfreeze() {
    this.frozen = false;
    this.physics.resume();
    this.tweens.resumeAll();
    this.time.paused = false;
  }

  addScore(n: number, x?: number, y?: number) {
    session.score += n;
    if (x !== undefined && y !== undefined && n > 0) this.fx.pop(x, y, `+${n}`, '#ffe14a', 9, 18, 600);
  }

  onEnemyKilled(x: number, y: number, score: number) {
    session.kills++;
    this.addScore(score);
    const claimed = Math.floor(2000 + Math.random() * 60000);
    this.hud.addFollowers(claimed);
    if (Math.random() < 0.25) this.fx.pop(x, y - 10, `+${(claimed / 1000).toFixed(1)}K FOLLOWERS`, '#9fe2ff', 8, 22, 800);
    // trash talk
    if (this.now - this.lastTaunt > 5000 && Math.random() < 0.25) {
      this.lastTaunt = this.now;
      const lines = session.char === 'sanmik'
        ? ["I'LL FUCKING SHERK YOU", 'GET FUCKED', 'CATFORD FOX CREW', 'NO CUNT TOUCHES ME', "I'M THE FUCKING BEST", 'FUCK ALL HATERS', 'YEE YEE', 'BRAP BRAP', 'NEEKY CUNT']
        : ['YEGHHH', 'BIG UP ALL DA MANZ', 'GO AND SUCK UR NANS', 'MC POLSONATOR!', 'MC WHEELCHAIR BLUD', 'FUCKIN HAVE IT', 'SORRY. NOT SORRY.'];
      bubble(this, () => ({ x: this.player.x, y: this.player.y - 66 }), lines[Math.floor(Math.random() * lines.length)], 1100);
    }
    // "I'm Really Friendly" streak bonus
    this.killStreak.push(this.now);
    this.killStreak = this.killStreak.filter((t) => this.now - t < 2500);
    if (this.killStreak.length === 3) {
      this.fx.pop(this.player.x, this.player.y - 80, "I'M REALLY FRIENDLY  +1000", '#ff8fca', 11, 30, 1200);
      this.addScore(1000);
    }
    // occasional drops
    const r = Math.random();
    if (r < 0.1) this.addPickup(x, y, 'pepsi');
    else if (r < 0.16) this.addPickup(x, y, 'friggle');
  }
  private killStreak: number[] = [];
  private lastTaunt = 0;

  onSpecial(kind: 'delusion' | 'crunk', on: boolean) {
    this.specialLayer?.destroy();
    this.specialLayer = null;
    this.specialTick?.remove();
    this.combat.damageMult = 1;
    if (!on) {
      AudioBus.musicOverride(null);
      if (kind === 'delusion') this.delusionReveal();
      return;
    }
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(6);
    this.specialLayer = layer;
    if (kind === 'delusion') {
      this.combat.damageMult = SANMIK.delusion.damageMult;
      AudioBus.musicOverride('mus_delusion');
      const glow = this.add.rectangle(0, 0, VIEW.W, VIEW.H, 0xffc23a, 0.22).setOrigin(0);
      const carpet = this.add.rectangle(0, VIEW.H - 30, VIEW.W, 30, 0xc8102e, 0.5).setOrigin(0);
      layer.add([glow, carpet]);
      for (let i = 0; i < 3; i++) {
        const beam = this.add.triangle(120 + i * 200, -10, 0, 0, -60, VIEW.H + 20, 60, VIEW.H + 20, 0xfff6c8, 0.12).setOrigin(0.5, 0);
        layer.add(beam);
        this.tweens.add({ targets: beam, angle: { from: -18, to: 18 }, yoyo: true, repeat: -1, duration: 1100 + i * 200 });
      }
      for (let i = 0; i < 26; i++) {
        const fan = this.add.image(10 + i * 25, VIEW.H - 4, `prop_fan${i % 3}`).setOrigin(0.5, 1).setAlpha(0.75);
        layer.add(fan);
        this.tweens.add({ targets: fan, y: VIEW.H - 10, yoyo: true, repeat: -1, duration: 180 + (i % 5) * 40 });
      }
      this.specialTick = this.time.addEvent({ delay: 120, loop: true, callback: () => {
        const cam = this.cameras.main;
        this.fx.sparks(cam.scrollX + Math.random() * VIEW.W, cam.scrollY + Math.random() * 60, [0xffe14a, 0xff3ad0, 0x7ff3ff][Math.floor(Math.random() * 3)], 2, 40);
      } });
    } else {
      AudioBus.musicOverride('mus_crunk');
      const cols = [0xff3ad0, 0x3ad0ff, 0xffe14a, 0x6fe07a];
      const rects = cols.map((c, i) => this.add.rectangle((i % 2) * VIEW.W / 2, Math.floor(i / 2) * VIEW.H / 2, VIEW.W / 2, VIEW.H / 2, c, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD));
      layer.add(rects);
      let k = 0;
      this.specialTick = this.time.addEvent({ delay: 180, loop: true, callback: () => { k++; rects.forEach((r, i) => r.setFillStyle(cols[(i + k) % 4], 0.13)); } });
      const ball = this.add.image(VIEW.W / 2, 14, 'fx_flash').setScale(1.4).setTint(0xdddddd);
      layer.add(ball);
      this.tweens.add({ targets: ball, angle: 360, repeat: -1, duration: 900 });
    }
  }

  private delusionReveal() {
    const objs: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < 3; i++) objs.push(this.add.image(VIEW.W / 2 - 40 + i * 40, VIEW.H - 4, 'prop_chair').setOrigin(0.5, 1).setScrollFactor(0).setDepth(6));
    objs.push(this.add.text(VIEW.W / 2, VIEW.H - 40, 'ACTUAL VIEWERS: 3', textStyle(14, '#ff8a8a')).setOrigin(0.5).setScrollFactor(0).setDepth(151));
    this.time.delayedCall(2600, () => objs.forEach((o) => this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() })));
  }

  onPlayerDeath() {
    if (this.dead) return;
    this.dead = true;
    session.deaths++;
    session.chapterDeaths++;
    const msg = RETCONS[Math.floor(Math.random() * RETCONS.length)];
    this.time.delayedCall(500, () => this.fx.stamp(msg, '#ff3a5a', 24, 1000, 130));
    const id = this.runId;
    this.time.delayedCall(HEALTH.retryDelayMs, () => {
      if (id !== this.runId) return;
      this.scene.restart(this.onRetry());
    });
  }

  // ---------------- main loop ----------------

  update(_t: number, delta: number) {
    const dt = Math.min(delta, 50);
    if (this.frozen) {
      if (performance.now() >= this.frozenUntil) this.unfreeze();
      else return;
    }
    this.controls.update();

    if (this.controls.justPressed('pause') && !this.dialogue.active && !this.dead) {
      this.scene.launch('pause', { from: this.scene.key });
      this.scene.pause();
      return;
    }

    this.now += dt;
    this.dialogue.update(dt);
    this.player.update(dt, this.controls);
    for (const e of this.enemies.getChildren() as Enemy[]) e.step(dt);
    for (const p of this.pickups.getChildren() as Pickup[]) p.step(dt);
    const cam = this.cameras.main;
    this.combat.update(dt, this.now, { x: cam.scrollX, y: cam.scrollY, w: cam.width, h: cam.height }, this.worldH);
    this.levelUpdate(dt);
    this.player.postUpdate();
    this.player.standingOnOneWay = false;

    // camera look-ahead
    const look = this.player.facing * 36;
    cam.followOffset.x += (-look - cam.followOffset.x) * 0.04;

    // pits
    if (this.player.alive && this.player.y > this.worldH + 40) {
      const died = this.player.hp <= 1 && !this.godMode;
      this.player.invulnUntil = 0;
      this.player.hurt({ damage: 1, team: 'enemy', kind: 'hazard', x: this.player.x, y: this.player.y, dir: 0 });
      if (!died) {
        this.player.respawnAt(this.player.lastSafe.x, this.player.lastSafe.y - 4);
        this.fx.pop(this.player.x, this.player.y - 60, 'MIND DA GAP', '#ffffff', 11);
      }
    }

    // checkpoints
    for (let i = this.checkpointIdx; i < this.checkpoints.length; i++) {
      const c = this.checkpoints[i];
      if (Math.abs(this.player.x - c.x) < 20 && this.player.alive) {
        this.checkpointIdx = i + 1;
        c.flag?.setTexture('prop_checkpoint_on');
        AudioBus.sfx('sfx_checkpoint');
        this.fx.pop(c.x, c.y - 50, 'CHECKPOINT (NOT CANON)', '#6fe07a', 10);
        this.player.heal(1);
      }
    }

    // signs show control hints near them
    for (const s of this.signs) {
      if (!s.shown && Math.abs(this.player.x - s.x) < 50) {
        s.shown = true;
        this.hud.showHint(s.hint);
      }
    }

    // exits
    for (const e of this.exits) {
      if (!e.used && this.player.alive && e.rect.contains(this.player.x, this.player.y - 10)) {
        e.used = true;
        e.fn();
      }
    }

    this.hud.update(dt);
    this.drawDebug();
  }

  // ---------------- debug ----------------

  private setupDebugKeys() {
    const kb = this.input.keyboard;
    if (!kb || !debugApi.enabled) return;
    kb.on('keydown-F1', () => updateSettings({ showHitboxes: !getSettings().showHitboxes }));
    kb.on('keydown-F2', () => { debugApi.god = !debugApi.god; this.godMode = debugApi.god; this.fx.pop(this.player.x, this.player.y - 70, `GOD MODE ${this.godMode ? 'ON' : 'OFF'}`, '#ffe14a', 10); });
    kb.on('keydown-F3', () => { this.player.meter = 100; this.player.hp = this.player.maxHp; });
    kb.on('keydown-F4', () => this.debugNextPhase());
    kb.on('keydown-F6', () => this.debugKillBoss());
    kb.on('keydown-F7', () => {
      const next = this.checkpoints[this.checkpointIdx];
      if (next) this.player.respawnAt(next.x, next.y - 10);
    });
  }

  debugNextPhase() {}
  debugKillBoss() {}
  debugState(): Record<string, unknown> { return {}; }

  protected drawDebug() {
    const show = getSettings().showHitboxes;
    this.debugG.clear();
    this.debugText.setVisible(show);
    if (!show) return;
    const b = this.player.pbody;
    this.debugG.lineStyle(1, 0x00ff00, 1).strokeRect(b.x, b.y, b.width, b.height);
    const g = this.player.guardRect();
    if (g) this.debugG.lineStyle(1, 0xffe14a, 1).strokeRect(g.x, g.y, g.w, g.h);
    this.combat.debugDraw(this.debugG);
    const st = this.debugState();
    this.debugText.setText([
      `pos ${this.player.x.toFixed(0)},${this.player.y.toFixed(0)} vel ${b.velocity.x.toFixed(0)},${b.velocity.y.toFixed(0)}`,
      `ground ${this.player.onGround} coyote ${this.player.coyote.toFixed(0)} hp ${this.player.hp} meter ${this.player.meter.toFixed(0)}`,
      `anim ${this.player.anims.currentAnim?.key} aim ${this.player.aim.name}`,
      `proj ${this.combat.live().length} targets ${this.combat.targets.size} zones ${this.combat.zones.length} fps ${this.game.loop.actualFps.toFixed(0)}`,
      ...Object.entries(st).map(([k, v]) => `${k}: ${v}`),
      'F1 hitboxes F2 god F3 meter F4 phase F6 kill boss F7 next checkpoint',
    ].join('\n'));
  }

  showControlsHint() {
    this.hud.showHint(this.controls.lastDevice === 'pad' ? CONTROL_HINTS.pad : CONTROL_HINTS.keyboard, 6000);
  }

  protected onShutdown() {
    this.runId = -1;
    this.specialTick?.remove();
    this.combat.destroy();
    if (debugApi.gameplay === this) debugApi.gameplay = null;
    if (this.frozen) { this.time.paused = false; this.frozen = false; }
  }
}
