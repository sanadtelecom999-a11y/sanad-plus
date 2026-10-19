import { test, expect } from '@playwright/test';

test.describe('Backend Smoke Test', () => {
  test('should return 200 OK from health endpoint', async ({ request }) => {
    // نستخدم request بدلاً من page لأننا نختبر الـ API وليس الواجهة الرسومية
    const response = await request.get('/api/health');
    
    // التحقق من أن السيرفر استجاب بنجاح
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
  });
});
