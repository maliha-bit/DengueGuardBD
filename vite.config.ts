/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Repo name for the GitHub Pages sub-path (https://<user>.github.io/<repo>/).
 * Prefers GITHUB_REPOSITORY (set in Actions), then the git remote, then a fixed fallback.
 */
function repoName(): string {
  const fromEnv = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (fromEnv) return fromEnv;
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = url.match(/[/:]([^/]+?)(?:\.git)?$/);
    if (match) return match[1];
  } catch {
    // no git or no remote: use fallback
  }
  return 'dengue_prediction_dashboard';
}

/** Copies dist/index.html to dist/404.html so Pages serves the SPA for deep links. */
function spaFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const index = resolve(outDir, 'index.html');
      if (existsSync(index)) copyFileSync(index, resolve(outDir, '404.html'));
    },
  };
}

export default defineConfig(({ command, isPreview }) => {
  // Sub-path only for production builds (and `vite preview` of them); "/" for dev and tests.
  const base = command === 'build' || isPreview ? `/${repoName()}/` : '/';

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'DengueGuard BD',
          short_name: 'DengueGuard',
          description: 'Division-wise dengue risk forecast and care access for Bangladesh',
          theme_color: '#161618',
          background_color: '#E9E9EB',
          display: 'standalone',
          start_url: base,
          scope: base,
          // Relative icon paths resolve against the manifest, which lives under `base`.
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallback: `${base}index.html`,
        },
      }),
      spaFallback(),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      testTimeout: 15000,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
