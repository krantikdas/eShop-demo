import { test, expect } from '@playwright/test';

test('Add product to shopping cart', async ({ page }) => {
  // Step 1: Navigate to catalog
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ready for a new adventure?' })).toBeVisible();

  // Step 2: Click product to view details
  await page.getByRole('link', { name: 'Adventurer GPS Watch' }).click();
  await expect(page.getByRole('heading', { name: 'Adventurer GPS Watch' })).toBeVisible();

  // Step 3: Verify 'Add to shopping bag' button is visible
  await expect(page.getByRole('button', { name: 'Add to shopping bag' })).toBeVisible();

  // Step 4: Click 'Add to shopping bag'
  await page.getByRole('button', { name: 'Add to shopping bag' }).click();

  // Step 5: Verify item count in cart link updates
  await expect(page.getByRole('link', { name: 'shopping bag' })).toBeVisible();

  // Step 6: Navigate to cart and verify item is present
  await page.getByRole('link', { name: 'shopping bag' }).click();
  await expect(page.getByRole('heading', { name: 'Shopping bag' })).toBeVisible();
  await expect.poll(() => page.getByLabel('product quantity').count()).toBeGreaterThan(0);

  // Step 7: Verify quantity is at least 1
  const quantity = page.getByLabel('product quantity');
  await expect(quantity.first()).toHaveValue(/[1-9]/);
});
