import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (takes precedence), then .env, matching Next.js behavior.
// This is needed because Playwright config and setup projects run as standalone
// Node processes that don't inherit Next.js's env loading.
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: false });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: false });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  // Run every spec file in ./tests/
  testMatch: ['**/*.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'auth-setup',
      testMatch: ['auth.setup.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    /**
     * "prelogin" — public pages, no auth state.
     * Matches the original prelogin.spec.ts.
     */
    {
      name: 'prelogin',
      testMatch: ['prelogin.spec.ts', 'login-ui.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },

    /**
     * "authenticated" — depends on auth-setup and restores the session
     * saved to playwright/.auth/user.json.
     */
    {
      name: 'authenticated',
      testMatch: ['authenticated-features.spec.ts'],
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'auth-session',
      testMatch: ['auth-session.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'persistence-boundary',
      testMatch: ['persistence-boundary.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'fail-closed-screens',
      testMatch: ['fail-closed-screens.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    /**
     * "core-loop" — multi-user confidence loop:
     * login, refresh, create list, add films, rank films, verify results,
     * sign out, sign back in.
     */
    {
      name: 'core-loop',
      testMatch: ['core-loop-multi-user.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
