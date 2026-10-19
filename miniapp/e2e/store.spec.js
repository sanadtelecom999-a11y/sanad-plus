import { test, expect } from '@playwright/test';

test.describe('Backend API E2E Smoke Test', () => {
  test('should return 200 OK from health endpoint', async ({ request }) => {
    // نختبر مسار الصحة (لأننا لا نستطيع تشغيل الواجهة الأمامية كاملة في الـ CI حالياً)
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
  });
});
