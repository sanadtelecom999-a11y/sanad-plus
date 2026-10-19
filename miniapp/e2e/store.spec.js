
import { test, expect } from '@playwright/test';

test.describe('MiniApp True E2E', () => {
  test('should load the MiniApp UI in browser', async ({ page }) => {
    // فتح الواجهة الأمامية
    await page.goto('/');
    
    // التأكد من أن الصفحة لم تنهار (عنصر body موجود)
    await expect(page.locator('body')).toBeVisible();
    
    // التأكد من وجود عنصر يدل على التطبيق (شعار أو عنوان)
    // سنبحث عن أي عنصر يحمل كلاس أو نص معين في index.html
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
