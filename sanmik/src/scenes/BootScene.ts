import Phaser from 'phaser';
import { finalAudio, finalSprites } from '../config/assets';
import { buildCharacters, registerCharacterAnims } from '../art/characters';
import { buildWorldArt, registerWorldAnims } from '../art/world';
import { buildIntroArt } from '../art/intro';
import { AudioBus } from '../audio/AudioBus';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    // Only assets marked 'final' in config/assets.ts are loaded from disk.
    for (const s of finalSprites()) this.load.image(`__file_${s.id}`, s.file);
    for (const a of finalAudio()) this.load.audio(a.id, a.file);
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn(`[assets] could not load ${f.key} (${f.url}); using placeholder`));
  }

  create() {
    // Final sprite sheets: one animation per row, frames left to right, in manifest order.
    for (const s of finalSprites()) {
      const key = `__file_${s.id}`;
      if (!this.textures.exists(key)) continue;
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
      const tex = this.textures.addImage(s.id, src)!;
      if (s.anims) {
        let row = 0;
        for (const [name, count] of Object.entries(s.anims)) {
          // Player sheets always use name_i; other sheets use the bare name for single frames.
          const isPlayer = /^(sanmik|sanchz)_/.test(s.id);
          for (let i = 0; i < count; i++) tex.add(count === 1 && !isPlayer ? name : `${name}_${i}`, 0, i * s.frameW, row * s.frameH, s.frameW, s.frameH);
          row++;
        }
      }
    }
    buildCharacters(this);
    buildWorldArt(this);
    buildIntroArt(this);
    registerCharacterAnims(this);
    registerWorldAnims(this);
    AudioBus.init(this.game);
    this.scene.start('title');
  }
}
