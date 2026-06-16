import { test, expect } from '@playwright/test';

test.describe('Molfi Marketers E2E - billing topup', () => {
  test('should top up balance, show transaction modal and verify status', async ({ page }) => {
    const clientPrivateKey = process.env.TEST_CLIENT_PRIVATE_KEY;
    if (!clientPrivateKey) {
      console.warn('⚠️ TEST_CLIENT_PRIVATE_KEY not configured. Skipping topup live E2E.');
      return;
    }

    await page.addInitScript((key) => {
      (window as any).__molfi_test_wallet_key = key;
      (window as any).__molfi_test_mode = true;
    }, clientPrivateKey);

    await page.goto('/dashboard/billing');

    // Trigger Topup modal
    const topupButton = page.locator('button:has-text("Top Up Balance")');
    await topupButton.click();

    const amountInput = page.locator('[data-testid="topup-amount-input"]');
    await amountInput.fill('1.00');

    const confirmButton = page.locator('button:has-text("Confirm Payment")');
    await confirmButton.click();

    // Verify modal overlay and success status
    const txModal = page.locator('[data-testid="global-tx-modal"]');
    await expect(txModal).toBeVisible({ timeout: 10000 });
    await expect(txModal.locator('[data-testid="tx-status"]')).toContainText('success', { timeout: 35000 });

    // Balance increments
    const balanceDisplay = page.locator('[data-testid="marketer-balance"]');
    await expect(balanceDisplay).toContainText('1.00');
  });
});
