import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
      webServer: {
        command: 'cd ../backend && SKIP_BOT=1 python run.py',
        url: 'http://127.0.0.1:5000/api/health',
        reuseExistingServer: false,
        timeout: 120 * 1000,
        env: {
          FLASK_ENV: 'testing',
          SKIP_BOT: '1',
          DATABASE_URL: 'postgresql+psycopg2://postgres:postgres@localhost:5432/sanad_test',
          REDIS_URL: 'redis://localhost:6379/0',
          JWT_SECRET_KEY: 'ci-e2e-jwt-key-32-chars-minimum-yyyy',
          SECRET_KEY: 'ci-e2e-secret-key-32-chars-minimum-xxxx',
          ADMIN_PASSWORD_HASH: 'pbkdf2:sha256:600000$abcdef123456$0000000000000000000000000000000000000000000000000000000000000000',
        },
      },
    
});