import { test, expect } from '@playwright/test';

test.describe('Molfi Marketers E2E - Campaign Creation', () => {
  test('should create campaign and display in dashboard lists', async ({ page }) => {
    const clientPrivateKey = process.env.TEST_CLIENT_PRIVATE_KEY;
    if (!clientPrivateKey) {
      console.warn('⚠️ TEST_CLIENT_PRIVATE_KEY not configured. Skipping campaign create E2E.');
      return;
    }

    // Mock SIWE session token directly in localStorage for speed
    await page.addInitScript((key) => {
      (window as any).__molfi_test_wallet_key = key;
      (window as any).__molfi_test_mode = true;
    }, clientPrivateKey);

    await page.goto('/dashboard/campaigns/new');

    // Fill form
    await page.locator('#mp4Url').fill('https://example.com/ad.mp4');
    await page.locator('#durationMs').fill('15000');
    await page.locator('#ctaUrl').fill('https://molfi.fun/cta');
    await page.locator('#bidPerView').fill('0.01');
    await page.locator('#budget').fill('2.00');

    // Click Deploy Campaign
    const deployButton = page.locator('button:has-text("Deploy Campaign")');
    await deployButton.click();

    // Verify redirect back to campaigns list
    await expect(page).toHaveURL(/\/dashboard\/campaigns/, { timeout: 10000 });

    const campaignRow = page.locator('table >> text=https://example.com/ad.mp4').first();
    await expect(campaignRow).toBeVisible();
  });
});
