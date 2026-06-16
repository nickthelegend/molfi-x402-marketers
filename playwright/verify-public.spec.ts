import { test, expect } from '@playwright/test';

test.describe('Molfi Marketers E2E - public verification auditor', () => {
  test('should display Merkle proof audit details on public verify page', async ({ page }) => {
    // We can hit verify page directly with a mock or placeholder ID
    const mockImpressionId = '660606060606060606060606';
    await page.goto(`/verify/${mockImpressionId}`);

    // Verify layout structure
    const title = page.locator('h1:has-text("Impression Audit")');
    await expect(title).toBeVisible();

    const infoPill = page.locator('[data-testid="audit-info-pill"]');
    await expect(infoPill).toBeVisible();
  });
});
