import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (takes precedence), then .env, matching Next.js behavior.
// This is needed because Playwright's config/global-setup runs as a standalone
// Node process that doesn't inherit Next.js's env loading.
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

  // Runs once before any project: logs in and saves playwright/.auth/user.json
  globalSetup: './tests/global-setup.ts',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },

  projects: [
    /**
     * "prelogin" — public pages, no auth state.
     * Matches the original prelogin.spec.ts.
     */
    {
      name: 'prelogin',
      testMatch: ['prelogin.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },

    /**
     * "authenticated" — restores the session saved by global-setup so that
     * Supabase cookies are present from the very first page load.
     * Matches authenticated.spec.ts.
     */
    {
      name: 'authenticated',
      testMatch: ['authenticated.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
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
