import Phaser from 'phaser';
import type { LevelScene } from '../scenes/LevelScene';
import type { Theme } from '../scenes/GameplayScene';
import type { Line } from '../ui/Dialogue';
import type { CharId } from '../core/session';
import type { SceneRef } from './chapters';
import { Charger, Flyer, HenDo, Hopper, Turret } from '../enemies/roster';
import { AudioBus } from '../audio/AudioBus';

const G = 320;

export interface Layer { tex: string; scroll: number; y?: number; h?: number; depth?: number; tint?: number; fadeFrom?: number; fadeTo?: number; fadeIn?: boolean }

export interface LevelDef {
  id: string;
  chapter: number;
  title: string;
  subtitle: string;
  music: string;
  width: number;
  layers: Layer[];
  next: SceneRef;
  intro: (c: CharId) => Line[];
  build: (s: LevelScene) => void;
  update?: (s: LevelScene, dt: number, st: Record<string, unknown>) => void;
}

const MIK = 'ui_face_sanmik';
const CHZ = 'ui_face_sanchz';
const mik = (text: string): Line => ({ who: 'SANMIK', face: MIK, text });
const chz = (text: string): Line => ({ who: 'SANCHZ', face: CHZ, text });
const gabor = (text: string): Line => ({ who: 'GABOR (ON THE PHONE)', color: '#ff4f6f', text });

// ---- chapter enemies ----
const clerk = (s: LevelScene, x: number, y = G) => s.addEnemy(new Turret(s, x, y, {
  tex: 'intro_clerk', hp: 60, every: 2000, range: 320, body: [24, 40, 5, 6],
  barks: ['TAKE A TICKET', 'NEXT!', 'COMPUTER SAYS NO', 'U R ALREADY DEAD'],
  fire: (t, px) => {
    for (const k of [0.8, 1]) {
      const tt = 0.9 * k, g = 700;
      const vx = Phaser.Math.Clamp((px - t.x) / tt, -240, 240);
      t.host.combat.spawn({ team: 'enemy', texture: 'p_stamp', x: t.x, y: t.y - 40, vx, vy: (-0.5 * g * tt * tt + 30) / tt, gravity: g, damage: 1, lifeMs: 3000, hitW: 9, rotate: 'spin', spin: 10, reflectable: true, world: 'die' });
    }
    AudioBus.sfx('sfx_throw', { vol: 0.5 });
  },
}));
const form = (s: LevelScene, x: number, y: number) => s.addEnemy(new Flyer(s, x, y, { tex: 'enemy_form', anim: 'form_fly', hp: 26, shot: 'p_clip', shotSpeed: 150, body: [20, 16, 3, 3] }));
const copcar = (s: LevelScene, x: number) => s.addEnemy(new Charger(s, x, G, { tex: 'enemy_copcar', anim: 'copcar_roll', rev: 'c_1', hp: 90, speed: 380, body: [56, 20, 4, 8], barks: ['STOP RIGHT THERE', 'NEE NAW NEE NAW', 'UR NICKED SANMIK', 'THERE R 15 OF US'], revSfx: 'sfx_warn' }));
const drone = (s: LevelScene, x: number, y: number) => s.addEnemy(new Flyer(s, x, y, { tex: 'enemy_drone', anim: 'drone_fly', hp: 30, shot: 'p_bullet', shotSpeed: 180, shotHit: 5, body: [22, 12, 3, 3], tint: 0xff6a6a }));
const pint = (s: LevelScene, x: number, y = G) => s.addEnemy(new Hopper(s, x, y, 'p_0', 'p_1', 'enemy_pint', 45, [16, 24, 3, 6]));
const speaker = (s: LevelScene, x: number) => s.addEnemy(new Turret(s, x, G, {
  tex: 'enemy_speaker', hp: 80, every: 2400, range: 300, body: [26, 36, 2, 2], contact: 1,
  fire: (t) => {
    for (const d of [-1, 1]) t.host.combat.spawn({ team: 'enemy', texture: 'e_wave', x: t.x + d * 16, y: G - 5, vx: d * 160, vy: 0, damage: 1, lifeMs: 2600, hitW: 18, hitH: 8, world: 'none', tint: 0xff3ad0 });
    AudioBus.sfx('sfx_slam', { vol: 0.4, rate: 1.6 });
  },
}));
const imp = (s: LevelScene, x: number, y: number) => s.addEnemy(new Flyer(s, x, y, { tex: 'enemy_imp', anim: 'imp_fly', hp: 30, shot: 'e_orb', shotSpeed: 150, body: [16, 16, 4, 3] }));
const goatmask = (s: LevelScene, x: number, y = G) => s.addEnemy(new Hopper(s, x, y, 'g_0', 'g_1', 'enemy_goatmask', 55, [16, 30, 6, 4]));
const hen = (s: LevelScene, x: number, y = G) => s.addEnemy(new HenDo(s, x, y));
const wheelie = (s: LevelScene, x: number, y = G) => s.addEnemy(Charger.wheelie(s, x, y));

function ground(s: LevelScene, segs: [number, number, Theme][]) {
  for (const [x, w, t] of segs) s.solid(x, G, w, 40, t);
}

export const LEVELS: Record<string, LevelDef> = {
  jobcentre: {
    id: 'jobcentre', chapter: 1, title: 'DA JOBCENTRE BEYOND', subtitle: 'Sign on. Get the wish. Do not take a ticket.',
    music: 'mus_jobcentre', width: 3000, next: { key: 'fame' },
    layers: [{ tex: 'bg_jobcentre', scroll: 0.25 }, { tex: 'bg_jobcentre_mid', scroll: 0.5, y: 64, h: 120, depth: -9 }],
    intro: () => [
      chz('Sitting in the job centre plus. Didn\'t have a fiver to pay for the bus.'),
      mik('Shut up you fat cunt. I\'ve never been in a job centre in my life. I\'m a fucking millionaire.'),
      gabor('Hiya best friend! The Algorithm at the back decides who\'s famous. It\'s got the first wish!'),
      mik('Then it\'s about to decide on ME. Catford Fox Crew. Yee.'),
    ],
    build: (s) => {
      ground(s, [[0, 900, 'office'], [980, 800, 'office'], [1860, 1140, 'office']]);
      s.addSign(110, G, 'PRES JUMP 2 YEE', 'Jump: K / Space / (A). Tap for a hop, hold for a full jump.');
      s.addSign(260, G, 'SHOOT DA HATERS', 'Shoot: hold J / (X). Hold Up/Down to aim. SanMik: release after a long hold for a YEE blast.');
      s.addSign(420, G, 'MELEE 4 CLOSE STUFF', 'Melee: L / (B).  SanChz: Down + Melee = Rancid Fart.  Wheelchair racers rev first: JUMP them.');
      s.oneWay(500, 262, 90, 'office');
      s.oneWay(640, 222, 90, 'office');
      s.addPickup(685, 222, 'pepsi');
      clerk(s, 600);
      hen(s, 780);
      s.addSign(880, G, 'MIND DA GAP', 'Pits cost 1 HP and put you back.');
      s.addSign(1010, G, 'CRATES = WEAPONS', 'Switch weapon: Q / E  (LB / RB).');
      s.addPickup(1060, G, 'crate1');
      wheelie(s, 1180);
      form(s, 1260, 200);
      s.addCheckpoint(1350, G);
      s.addSign(1420, G, 'METER FULL? PRES SPECIAL', 'Special: I / (LT) when the meter is full.  Alt: Shift / (Y) - SanMik poses, SanChz guards.');
      form(s, 1500, 180);
      s.solid(1600, 286, 120, 34, 'office');
      hen(s, 1660, 286);
      s.oneWay(1700, 230, 90, 'office');
      s.addPickup(1745, 230, 'pepsimax');
      clerk(s, 2000);
      s.addCheckpoint(2100, G);
      wheelie(s, 2240);
      hen(s, 2380);
      form(s, 2460, 190);
      s.addPickup(2550, G, 'food');
      hen(s, 2700);
      wheelie(s, 2800);
      s.addSign(2880, G, 'DA ALGORITHM >', '');
    },
  },

  freedom: {
    id: 'freedom', chapter: 3, title: 'NIGHT OF FREEDOM', subtitle: 'Fifteen cop cars on my tail. If they arrest me I won\'t get bail.',
    music: 'mus_freedom', width: 3600, next: { key: 'tank' },
    layers: [{ tex: 'bg_street', scroll: 0.25 }, { tex: 'bg_catford', scroll: 0.5, y: 120, h: 200, depth: -9 }],
    intro: () => [
      gabor('Hiya best friend! Next wish is in a bank vault in Catford. Next to a goat. Not me. A different goat.'),
      mik('Say no more. We\'re gonna rob this bank like Jason Statham in Crank.'),
      chz('YEGHHH. They\'ve got a helicopter, SanMik. And a tank.'),
      mik('Course they have. Cause I\'m fucking SanMik. Put it on Channel U, bruv. Night of freedom.'),
    ],
    build: (s) => {
      ground(s, [[0, 1000, 'street'], [1080, 900, 'street'], [2060, 1540, 'street']]);
      s.addPickup(300, G, 'pepsi');
      hen(s, 460);
      copcar(s, 640);
      s.solid(720, 290, 100, 30, 'street');
      drone(s, 820, 180);
      s.addSign(960, G, 'DRAWBRIDGE AHEAD', 'The helicopter\'s searchlight locks on, then it strafes. Keep moving.');
      s.addPickup(1150, G, 'crate1');
      s.addCheckpoint(1220, G);
      s.oneWay(1300, 260, 90, 'street');
      s.oneWay(1450, 220, 90, 'street');
      s.addPickup(1495, 220, 'crate2');
      wheelie(s, 1400);
      drone(s, 1520, 170);
      copcar(s, 1680);
      hen(s, 1860);
      s.addCheckpoint(2300, G);
      s.addPickup(2400, G, 'food');
      copcar(s, 2520);
      hen(s, 2620);
      drone(s, 2720, 190);
      copcar(s, 2920);
      s.addPickup(3020, G, 'sock');
      hen(s, 3120);
      wheelie(s, 3320);
      s.addSign(3480, G, 'DA BANK >', '');
    },
    update: (s, _dt, st) => {
      // police helicopter: searchlight tracks you, locks, then strafes that column
      const now = s.now;
      const pl = s.player;
      if (!pl.alive || pl.x < 500 || pl.x > 3400) return;
      if (st.next === undefined) st.next = now + 4000;
      if (now >= (st.next as number) && !st.light) {
        const cam = s.cameras.main;
        const heli = s.add.image(cam.scrollX + 680, 26, 'enemy_drone').setScale(3).setTint(0x445566).setDepth(60);
        const light = s.add.triangle(pl.x, 26, 0, 0, -26, G - 26, 26, G - 26, 0xfff6a0, 0.25).setOrigin(0.5, 0).setDepth(34);
        st.light = light;
        st.heli = heli;
        st.lockAt = now + 1300;
        AudioBus.sfx('sfx_warn');
        s.fx.pop(pl.x, 60, 'POLICE HELICOPTER', '#ff3a3a', 10);
      }
      const light = st.light as Phaser.GameObjects.Triangle | undefined;
      const heli = st.heli as Phaser.GameObjects.Image | undefined;
      if (light && heli) {
        if (now < (st.lockAt as number)) {
          light.x += (pl.x - light.x) * 0.08;
          heli.x += (light.x - heli.x) * 0.06;
        } else if (!st.fired) {
          st.fired = true;
          light.setFillStyle(0xff3a3a, 0.35);
          const x = light.x;
          s.time.delayedCall(250, () => {
            s.combat.addZone({ team: 'enemy', rect: () => ({ x: x - 18, y: 0, w: 36, h: G }), until: s.now + 450, damage: 1, tickMs: 1000, kind: 'hazard' });
            for (let i = 0; i < 6; i++) s.time.delayedCall(i * 60, () => s.fx.sparks(x + (Math.random() - 0.5) * 30, G - 4, 0xffe14a, 3, 80));
            AudioBus.sfx('sfx_uzi', { vol: 0.8 });
            s.fx.shake(150, 0.004);
          });
          s.time.delayedCall(800, () => { light.destroy(); s.tweens.add({ targets: heli, x: heli.x - 500, duration: 1500, onComplete: () => heli.destroy() }); st.light = undefined; st.heli = undefined; st.fired = false; st.next = s.now + 7000 + Math.random() * 3000; });
        }
      }
    },
  },

  warehouse: {
    id: 'warehouse', chapter: 4, title: "DA NU WAREHOUSE: RIK'S BANTA BASEMENT", subtitle: 'A legendary nightclub. (A pub function room from 2009.)',
    music: 'mus_warehouse', width: 3400, next: { key: 'rik' },
    layers: [{ tex: 'bg_pub', scroll: 0.25 }, { tex: 'bg_pub_mid', scroll: 0.5, y: 40, h: 120, depth: -9 }],
    intro: () => [
      gabor('Best friend! The next wish is at Da Nu Warehouse. Your uncle ate it.'),
      mik('Uncle Rik? That dirty old cunt. Thursday is the night that Rik comes round.'),
      chz('We should invite Uncle Rik.'),
      mik('He\'s already there you fat prick. He lives in the bogs. Pure banta bang. Yee.'),
    ],
    build: (s) => {
      ground(s, [[0, 1100, 'pub'], [1180, 1000, 'pub'], [2260, 1140, 'pub']]);
      pint(s, 400);
      s.oneWay(560, 262, 96, 'pub');
      s.addPickup(608, 262, 'pepsi');
      speaker(s, 680);
      hen(s, 860);
      wheelie(s, 1000);
      s.addPickup(1250, G, 'crate1');
      s.addCheckpoint(1300, G);
      pint(s, 1450);
      pint(s, 1560);
      s.oneWay(1600, 250, 90, 'pub');
      s.addPickup(1645, 250, 'friggle');
      speaker(s, 1720);
      hen(s, 1900);
      wheelie(s, 2060);
      s.addPickup(2350, G, 'food');
      s.addCheckpoint(2420, G);
      speaker(s, 2600);
      hen(s, 2760);
      pint(s, 2860);
      wheelie(s, 3000);
      hen(s, 3150);
      s.addSign(3290, G, 'BOGS > (RIK IS IN THERE)', '');
    },
  },

  lampe: {
    id: 'lampe', chapter: 5, title: 'DA MAJEK LAMPE', subtitle: 'Heaven. Allegedly.',
    music: 'mus_intro', width: 3400, next: { key: 'gabor' },
    layers: [
      { tex: 'bg_heaven', scroll: 0.25, fadeFrom: 1500, fadeTo: 2000 },
      { tex: 'bg_velvet', scroll: 0.25, depth: -11 },
    ],
    intro: () => [
      gabor('You did it, best friend! Come up to heaven and bring me ALL the wishes! Hehehe.'),
      chz('Is there a pub in heaven?'),
      mik('Course there is. And I\'m the fucking landlord. Yee.'),
      chz('Why is heaven going red, SanMik?'),
    ],
    build: (s) => {
      ground(s, [[0, 1000, 'heaven'], [1080, 640, 'heaven'], [1720, 880, 'velvet'], [2680, 720, 'velvet']]);
      s.addPickup(300, G, 'pepsi');
      imp(s, 520, 200);
      goatmask(s, 700);
      hen(s, 860);
      s.addPickup(1150, G, 'crate4');
      s.addCheckpoint(1220, G);
      goatmask(s, 1360);
      imp(s, 1500, 190);
      wheelie(s, 1620);
      s.addCheckpoint(1800, G);
      s.addPickup(1860, G, 'food');
      imp(s, 1940, 180);
      goatmask(s, 2060);
      hen(s, 2220);
      wheelie(s, 2420);
      s.addPickup(2760, G, 'sock');
      goatmask(s, 2820);
      imp(s, 2960, 190);
      hen(s, 3120);
      s.addSign(3290, G, "GABOR'S STAGE >", '');
    },
  },
};
