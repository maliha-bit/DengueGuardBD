import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
/** Same sub-path as GitHub Pages (https://<user>.github.io/<repo>/). */
const BASE = '/dengue_prediction_dashboard/';

/**
 * Production-build checks (`npm run test:preview`): builds, serves `vite preview` under the
 * GitHub Pages base path and tests the PWA (manifest, service worker, offline reload).
 */
export default defineConfig({
  testDir: './e2e-preview',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: 'test-results/preview',
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    locale: 'en-GB',
    timezoneId: 'Asia/Dhaka',
    serviceWorkers: 'allow',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { VITE_USE_MOCK: 'true', GITHUB_REPOSITORY: 'safin2907/dengue_prediction_dashboard' },
  },
});
