import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

async function buildExtension() {
  console.log('--- Starting Keypeer Extension Build ---');

  // 1. Build Popup and Options HTML pages
  console.log('[1/4] Building Popup and Options pages...');
  await build({
    configFile: false,
    plugins: [react()],
    base: '',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: path.resolve('popup.html'),
          options: path.resolve('options.html'),
        },
      },
    },
  });

  // 2. Build Background Service Worker (ES module)
  console.log('[2/4] Building Background Service Worker...');
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: path.resolve('src/background/index.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
    },
  });

  // 3. Build Content Script (IIFE format - strictly self-contained)
  console.log('[3/4] Building Content Script...');
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: path.resolve('src/content/index.ts'),
        name: 'KeypeerContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
    },
  });

  // 4. Copy manifest and static assets
  console.log('[4/4] Copying manifest.json and icons to dist/...');
  fs.copyFileSync(path.resolve('manifest.json'), path.resolve('dist/manifest.json'));
  fs.cpSync(path.resolve('public/icons'), path.resolve('dist/icons'), { recursive: true });

  console.log('=== Keypeer Extension build succeeded! Output in dist/ ===');
}

buildExtension().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
