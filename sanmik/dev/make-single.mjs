// Inlines dist-single/game.js into play/SANMIK.html
import fs from 'node:fs';
const js = fs.readFileSync('dist-single/game.js', 'utf8').replace(/<\/script/gi, '<\\/script');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<script type="module" src="\/src\/main.ts"><\/script>/, () => `<script>\n${js}\n</script>`);
fs.mkdirSync('play', { recursive: true });
fs.writeFileSync('play/SANMIK.html', html);
console.log('wrote play/SANMIK.html', (html.length / 1e6).toFixed(2), 'MB');
