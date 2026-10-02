import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests',
 timeout: 30000,
 workers: 1,
 use: { baseURL: 'http://localhost:5173', channel: 'chrome', headless: true },
 webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});
