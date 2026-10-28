import { BossScene, ArenaCfg } from './BossScene';
import { BankTank, TANK_FLOOR } from '../bosses/Tank';
import type { Line } from '../ui/Dialogue';
import { AudioBus } from '../audio/AudioBus';

export class TankScene extends BossScene {
  declare boss: BankTank;
  constructor() { super('tank'); }

  protected cfg(): ArenaCfg {
    return {
      chapter: 3, bg: 'bg_street', theme: 'street', floor: TANK_FLOOR, music: 'mus_freedom',
      platforms: [[40, 256, 100], [170, 204, 80]],
      stamp: 'BANK TANK - DESTROYED',
      retryLines: ['ROUND TWO, SANMIK', 'STILL NO BAIL', 'TANK BEATS AFRO'],
    };
  }

  protected makeBoss() { return new BankTank(this); }

  protected bar() {
    return { name: 'DA BANK TANK', label: 'ARMOUR', frac: () => this.boss.hp / this.boss.maxHp, notches: [0.5] };
  }

  protected introLines(): Line[] {
    return [
      { who: 'POLICE MEGAPHONE', color: '#3a8aff', text: 'SANMIK. STEP AWAY FROM THE GOAT. YOU ARE SURROUNDED BY FIFTEEN COP CARS, A HELICOPTER AND A TANK.' },
      this.me('Got a helicopter and a tank, cause I fucking robbed this bank. Yee.', 'YEGHHH. Why has a bank got a tank?'),
      { who: 'POLICE MEGAPHONE', color: '#3a8aff', text: 'THE BANK HAS A TANK BECAUSE OF YOU, SANMIK. SPECIFICALLY YOU.' },
      this.me("Put it on Channel U. All you pricks who doubted me, turn on your fucking TV.", 'Big up all da manz. All da fucking haters go and suck your nans.'),
    ];
  }

  protected defeatScene(done: () => void) {
    const b = this.boss;
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 150, () => { this.fx.burst(b.body.x + (Math.random() - 0.5) * 120, 280 + Math.random() * 30, 'fx_flash', { scale: 1.6, tint: 0xff8a1a }); AudioBus.sfx('sfx_explode', { vol: 0.6, maxCopies: 3 }); });
    this.tweens.add({ targets: b.turret, y: -60, x: b.turret.x + 140, angle: 720, duration: 1200, ease: 'Quad.easeOut' });
    b.body.setTint(0x333333);
    const goat = this.add.image(b.body.x, TANK_FLOOR, 'gabor_small').setOrigin(0.5, 1).setTint(0xd8b890).setDepth(40);
    this.tweens.add({ targets: goat, x: b.body.x - 120, duration: 1400, delay: 900 });
    this.time.delayedCall(1700, () => this.dialogue.play([
      this.me("Truck flies up, lands in the road as the tank's rockets explode. Night of freedom. Yee.", 'YEGHHH. Is that Gabor?'),
      { who: 'A DIFFERENT GOAT', color: '#d8b890', text: 'Baa. (No.)' },
      { who: 'GABOR (ON THE PHONE)', color: '#ff4f6f', text: 'Wish number three is in Da Nu Warehouse. Your Uncle Rik ate it. Thursday, isn\'t it? Hehe.' },
    ], done));
  }
}
