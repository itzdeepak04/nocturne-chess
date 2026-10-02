import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests',
 timeout: 30000,
 workers: 1,
 use: { baseURL: 'http://localhost:5173', channel: 'chrome', headless: true, launchOptions: {args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']} },
 webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});
