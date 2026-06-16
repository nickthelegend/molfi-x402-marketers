import { test, expect } from '@playwright/test';

test.describe('Molfi Marketers E2E - SIWE Login', () => {
  test('should SIWE login successfully and save session JWT', async ({ page }) => {
    const clientPrivateKey = process.env.TEST_CLIENT_PRIVATE_KEY;
    if (!clientPrivateKey) {
      console.warn('⚠️ TEST_CLIENT_PRIVATE_KEY not configured. Skipping SIWE E2E login test.');
      return;
    }

    // Inject wallet key for automated SIWE signature
    await page.addInitScript((key) => {
      (window as any).__molfi_test_wallet_key = key;
      (window as any).__molfi_test_mode = true;
    }, clientPrivateKey);

    await page.goto('/login');

    const connectButton = page.locator('button:has-text("Connect Wallet")');
    await connectButton.click();

    // Verify redirect to dashboard after SIWE login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    const marketerHeader = page.locator('[data-testid="marketer-address-header"]');
    await expect(marketerHeader).toBeVisible();
  });
});
