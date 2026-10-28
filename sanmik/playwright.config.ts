import { defineConfig, devices } from '@playwright/test';

// Browser smoke tests. Starts the Vite dev server automatically.
// If the matching Playwright browsers aren't installed, set PW_CHROMIUM to a Chromium binary.
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 1280, height: 720 },
    launchOptions: { executablePath, args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    ...(process.env.PW_ALL ? [
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ] : []),
  ],
});
