import { GameplayScene } from './GameplayScene';
import { Begour, FLOOR } from '../bosses/Begour';
import { AudioBus } from '../audio/AudioBus';
import { VIEW, BEGOUR } from '../config/tuning';
import { session } from '../core/session';
import { bubble, Line } from '../ui/Dialogue';
import { afterChapter } from '../levels/chapters';

// Boss arena: Frendship Forest clearing.
export class BegourScene extends GameplayScene {
  boss!: Begour;
  private finished = false;

  constructor() {
    super('begour');
    this.musicKey = 'mus_tesko';
  }

  protected buildLevel() {
    this.finished = false;
    this.worldW = VIEW.W;
    this.worldH = VIEW.H;
    this.spawn = { x: 70, y: FLOOR - 2 };
    this.add.image(0, 0, 'bg_arena').setOrigin(0).setDepth(-10);
    this.solid(0, FLOOR, VIEW.W, VIEW.H - FLOOR, 'forest');
    this.oneWay(150, 258, 96, 'forest');
    this.oneWay(394, 258, 96, 'forest');
    this.add.image(330, FLOOR, 'prop_bush').setOrigin(0.5, 1).setDepth(4).setAlpha(0.8);
  }

  protected afterCreate() {
    const retry = !!this.data_.retry;
    session.chapter = 2;
    this.boss = new Begour(this, retry ? 560 : 400, retry ? 0.8 : 0.32);
    this.combat.targets.add(this.boss);
    this.boss.onDefeated = () => this.onBossDefeated();
    if (retry) this.quickStart(); else this.intro();
  }

  private bossBar() {
    this.hud.setBoss({ name: 'BEGOUR THE BEAR', label: 'FRIENDSHIP', frac: () => this.boss.hp / this.boss.maxHp, notches: [...BEGOUR.phaseAt] });
  }

  private quickStart() {
    AudioBus.music('mus_begour');
    this.inputLocked = false;
    bubble(this, () => ({ x: 560, y: 160 }), ["YOU CAME BACK! YAY!", 'AGAIN? BRILLIANT!', 'BEST FRIENDS NEVER GIVE UP!'][session.deaths % 3], 1500);
    this.bossBar();
    this.time.delayedCall(900, () => this.boss.start());
  }

  private intro() {
    this.inputLocked = true;
    const isMik = session.char === 'sanmik';
    const me = isMik ? 'SANMIK' : 'SANCHZ';
    const face = isMik ? 'ui_face_sanmik' : 'ui_face_sanchz';
    this.player.vx = 0;
    const B = (text: string, voice: 'vo_bear' | 'vo_bear_sob' = 'vo_bear', onShow?: () => void): Line => ({ who: 'BEGOUR', text, voice, onShow });
    const lines: Line[] = [
      B("Oh hey kids, how's it going? Aw, I'm so cute. Tickle tickle! I'm Begour the bear! Are you ready? I'm Begour, yee-haw!"),
      B("I'm Begour the Bear, yes I am Begour the Bear! My best friend's name is SanMik, he is so great, he is the best, I love him so much yeah!"),
      isMik
        ? { who: me, face, text: 'Oi Begour, what the fuck do you think you\'re doing in a supermarket garden aisle, you fucking pedo?' }
        : { who: me, face, text: 'Alright Begour. SanMik says you\'re a nonce.' },
      B(isMik ? 'Ooh, SanMik! My best friend! Hey everyone, give him a round of applause!' : "What's a nonce? Is it a type of biscuit? Ooh, SanChz! Hello SanChz!"),
      isMik
        ? { who: me, face, text: "Fuck off Begour. I'll fucking sherk you, you stupid little cunt." }
        : { who: me, face, text: 'YEGHHH. He seems alright, to be fair.' },
      B('Sorry! ...Ooh, look what I found next to the bird seed! A shiny wish! I think I\'ll keep it close to my heart.', 'vo_bear', () => this.wishGrow()),
      B('Oh! I feel ever so BIG! And ever so FRIENDLY! You silly man, have you been drinking many cans?'),
      isMik
        ? { who: me, face, text: "That's MY wish, you furry cunt. Give it here or I'll shove a Pepsi Max up your arse." }
        : { who: me, face, text: "Sorry Begour mate. Nothing personal. It's for the pub." },
    ];
    this.time.delayedCall(500, () => this.dialogue.play(lines, () => this.beginFight()));
  }

  private wishGrow() {
    const star = this.add.image(400, -20, 'fx_wish').setDepth(70).setScale(1.5);
    AudioBus.sfx('sfx_sparkle');
    this.tweens.add({
      targets: star, y: FLOOR - 50, duration: 700, ease: 'Quad.easeIn',
      onComplete: () => {
        star.destroy();
        this.cameras.main.flash(250, 255, 240, 160);
        this.fx.sparks(400, FLOOR - 50, 0xffe14a, 20, 200);
        this.fx.shake(500, 0.008);
        this.tweens.add({ targets: this.boss.root, scale: 0.8, x: 560, duration: 1100, ease: 'Back.easeOut' });
      },
    });
  }

  private beginFight() {
    this.boss.root.setScale(0.8).setX(560);
    this.inputLocked = false;
    AudioBus.music('mus_begour');
    this.fx.banner('BEGOUR THE BEAR', 'HE JUST WANTS A CUDDLE', '#ffcf8a', 1600);
    this.bossBar();
    this.time.delayedCall(1200, () => this.boss.start());
  }

  private onBossDefeated() {
    if (this.finished) return;
    this.finished = true;
    this.inputLocked = true;
    this.player.invulnUntil = Number.MAX_SAFE_INTEGER;
    this.hud.setBoss(null);
    AudioBus.music(null);
    AudioBus.sfx('sfx_shatter');
    this.hitStop(120);
    const b = this.boss;
    b.head.anims.stop();
    b.head.setFrame('sad');
    const star = this.add.image(b.root.x, b.root.y - 140 * b.scale, 'fx_wish').setDepth(80).setScale(2);
    this.tweens.add({ targets: star, y: 60, x: 320, angle: 720, duration: 1200, ease: 'Cubic.easeOut' });
    this.tweens.add({
      targets: b.root, scale: 0.35, x: 430, y: FLOOR, duration: 1200, ease: 'Cubic.easeInOut',
      onComplete: () => {
        b.root.setDepth(30);
        b.pawL.setVisible(true).setPosition(-58, -50);
        b.pawR.setVisible(true).setPosition(58, -50);
        const isMik = session.char === 'sanmik';
        const me = isMik ? 'SANMIK' : 'SANCHZ';
        const face = isMik ? 'ui_face_sanmik' : 'ui_face_sanchz';
        this.dialogue.play([
          { who: 'BEGOUR', text: '...No SanMik, it\'s Begour the bear, you can\'t do that. I only wanted a cuddle.', voice: 'vo_bear_sob' },
          isMik ? { who: me, face, text: 'Shut up, you nonce. Absolutely smashed him. Legend behaviour. Yee.' } : { who: me, face, text: 'YEGHHH. Bit harsh, that. He\'s alright.' },
          { who: 'BEGOUR', text: "That's okay! Here, have a snack for the road. Smell my fart! Best friends forever!", voice: 'vo_bear', onShow: () => this.addPickup(b.root.x - 30, FLOOR - 40, 'food') },
          { who: 'BEGOUR', text: 'Bye SanMik! Remember... when it all goes wrong, no one can help you. Not even Begour!', voice: 'vo_bear' },
        ], () => this.outro());
      },
    });
    this.tweens.add({ targets: star, alpha: 0, delay: 1600, duration: 400 });
  }

  private outro() {
    const b = this.boss;
    b.head.setFrame('happy');
    this.tweens.add({ targets: b.root, x: 720, duration: 1800, ease: 'Linear' });
    this.inputLocked = false;
    this.player.invulnUntil = 0;
    this.time.delayedCall(700, () => {
      AudioBus.sfx('sfx_stamp');
      this.fx.stamp('BEGOUR - DESTROYED', '#ff3a5a', 34, 2000, 130);
      AudioBus.sfx('sfx_victory');
      this.player.play(`${this.player.tex}:victory`);
    });
    this.time.delayedCall(1500, () => this.fx.pop(320, 190, '(he is fine. he went home.)', '#ffffff', 10, 10, 2000));
    this.time.delayedCall(3600, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(520, () => this.scene.start('result', { chapter: 2, next: afterChapter(2) }));
    });
  }

  protected levelUpdate() {
    this.boss.update();
    if (this.finished && !this.inputLocked && this.player.alive) this.player.play(`${this.player.tex}:victory`, true);
  }

  debugNextPhase() {
    const b = this.boss;
    if (b.defeated) return;
    if (b.phase < 0) {
      if (this.dialogue.active) this.dialogue.skip(); else this.beginFight();
      b.start();
      return;
    }
    const thresholds = [BEGOUR.phaseAt[0], BEGOUR.phaseAt[1], 0];
    b.hp = Math.min(b.hp, b.maxHp * thresholds[b.phase] - 1);
    if (b.phase === 2) b.defeat(); else b.enterPhase(b.phase + 1);
  }

  debugKillBoss() {
    if (this.boss.phase < 0) { if (this.dialogue.active) this.dialogue.skip(); else this.beginFight(); this.boss.start(); }
    this.boss.defeat();
  }

  debugState() {
    return { boss: JSON.stringify(this.boss.debugInfo) };
  }

  protected onShutdown() {
    this.boss?.destroy();
    super.onShutdown();
  }
}
