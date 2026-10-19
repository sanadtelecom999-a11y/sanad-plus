
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000', // نختبر الواجهة الأمامية
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // تشغيل الباك اند
      command: 'cd ../backend && alembic upgrade head && SKIP_BOT=1 python run.py',
      url: 'http://127.0.0.1:5000/api/health',
      reuseExistingServer: false,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
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
    {
      // تشغيل الواجهة الأمامية (MiniApp) باستخدام خادم بايثون بسيط
      command: 'cd ../miniapp && python -m http.server 3000',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: false,
      timeout: 30 * 1000,
    }
  ],
});
