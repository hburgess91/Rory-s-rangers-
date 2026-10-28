import { defineConfig } from 'vite';

// Builds the whole game as one classic script so it can be inlined into a single
// HTML file that runs by double-clicking (file://), no server needed.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist-single',
    emptyOutDir: true,
    modulePreload: false,
    assetsInlineLimit: () => true, // inline every asset (the songs) as data so the file runs alone
    chunkSizeWarningLimit: 4000,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'game.js' } },
  },
});
