import Phaser from 'phaser';
import { buildImage } from './pix';

// Small props for the opening cutscene.
export function buildIntroArt(scene: Phaser.Scene) {
  buildImage(scene, 'intro_car', 72, 30, (p) => {
    p.poly([[4, 16], [18, 6], [48, 6], [62, 16], [70, 18], [70, 24], [2, 24], [2, 18]], '#c8102e');
    p.rect(20, 8, 12, 8, '#9fd8ff'); p.rect(34, 8, 12, 8, '#9fd8ff');
    p.rect(2, 18, 68, 2, '#ff6a6a');
    p.circle(16, 25, 5, '#111'); p.circle(56, 25, 5, '#111'); p.circle(16, 25, 2, '#888'); p.circle(56, 25, 2, '#888');
    p.rect(66, 17, 4, 3, '#ffe14a');
  });
  buildImage(scene, 'intro_desk', 96, 36, (p) => {
    p.rect(1, 8, 94, 26, '#8a6a4a'); p.rect(1, 8, 94, 4, '#a8845e'); p.rect(6, 14, 30, 18, '#6b4f34');
    p.rect(60, 0, 24, 9, '#e8e8f0'); p.rect(62, 2, 20, 5, '#3a6ad0'); // computer
    p.rect(40, 4, 14, 5, '#ffffff'); p.text('404', 41, 4, '#c8102e');
  });
  buildImage(scene, 'intro_clerk', 34, 46, (p) => {
    // a bored afterlife clerk: translucent ghost in a cardigan
    p.ellipse(17, 14, 11, 12, '#e6ecff');
    p.rect(6, 14, 22, 30, '#e6ecff');
    for (let x = 6; x < 28; x += 6) p.circle(x + 3, 44, 3, '#e6ecff');
    p.rect(8, 22, 18, 18, '#7a8aa8'); p.rect(15, 22, 4, 12, '#c8102e');
    p.rect(9, 10, 6, 4, '#222'); p.rect(19, 10, 6, 4, '#222'); p.rect(15, 11, 4, 1, '#222');
    p.px(11, 11, '#fff'); p.px(21, 11, '#fff');
    p.rect(13, 18, 8, 1, '#6a6a8a');
  });
  buildImage(scene, 'gabor_small', 34, 32, (p) => {
    // Gabor the goat: small, cheerful, slightly too attentive
    p.rect(6, 14, 20, 12, '#f2f0ea');
    p.rect(6, 24, 3, 7, '#d8d4ca'); p.rect(12, 24, 3, 7, '#d8d4ca'); p.rect(18, 24, 3, 7, '#d8d4ca'); p.rect(23, 24, 3, 7, '#d8d4ca');
    p.rect(6, 29, 3, 2, '#3a2a2a'); p.rect(23, 29, 3, 2, '#3a2a2a');
    p.ellipse(26, 11, 7, 7, '#f2f0ea');
    p.rect(29, 14, 4, 4, '#f2f0ea');
    p.line(22, 5, 18, 1, '#8a6a4a', 2); p.line(28, 5, 31, 1, '#8a6a4a', 2);
    p.rect(17, 8, 4, 2, '#f2f0ea');
    p.rect(24, 9, 3, 3, '#ffd23a'); p.px(25, 10, '#1a0a0a'); p.rect(29, 9, 3, 3, '#ffd23a'); p.px(30, 10, '#1a0a0a');
    p.rect(26, 15, 6, 1, '#5a1520'); p.px(25, 14, '#5a1520'); p.px(32, 14, '#5a1520');
    p.rect(27, 17, 3, 4, '#e8e4da');
    p.rect(3, 14, 3, 3, '#f2f0ea');
  });
  buildImage(scene, 'lamp', 22, 12, (p) => {
    p.ellipse(10, 7, 8, 4, '#e8b030'); p.rect(14, 5, 7, 2, '#e8b030'); p.rect(8, 1, 4, 3, '#e8b030'); p.px(7, 6, '#fff3b0');
    p.rect(1, 6, 3, 4, '#c8901c');
  });
}
