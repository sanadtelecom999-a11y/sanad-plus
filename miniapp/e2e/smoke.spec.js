import { test, expect } from '@playwright/test';

test.describe('MiniApp Smoke Test', () => {
  test('should load the homepage and display categories', async ({ page }) => {
    // افتراض أن الصفحة الرئيسية متاحة على /
    await page.goto('/');
    
    // التحقق من وجود عنصر يدل على تحميل الصفحة (مثلاً شعار أو عنوان)
    // (سنعدل هذا الـ Selector لاحقاً ليطابق الواجهة الفعلية)
    await expect(page).toHaveTitle(/SANAD|سنad/i); 
  });
});
