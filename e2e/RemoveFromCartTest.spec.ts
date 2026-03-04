import { test, expect } from '@playwright/test';

test('Remove item from shopping cart', async ({ page }) => {
  // Setup: Add an item to cart first
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ready for a new adventure?' })).toBeVisible();

  await page.getByRole('link', { name: 'Adventurer GPS Watch' }).click();
  await expect(page.getByRole('heading', { name: 'Adventurer GPS Watch' })).toBeVisible();

  await page.getByRole('button', { name: 'Add to shopping bag' }).click();

  // Step 1: Navigate to cart and verify item is present
  await page.getByRole('link', { name: 'shopping bag' }).click();
  await expect(page.getByRole('heading', { name: 'Shopping bag' })).toBeVisible();
  await expect.poll(() => page.getByLabel('product quantity').count()).toBeGreaterThan(0);

  // Step 2: Set quantity to 0 and click Update to remove item
  await page.getByLabel('product quantity').fill('0');
  await page.getByRole('button', { name: 'Update' }).click();

  // Step 3: Verify 'Your shopping bag is empty' message appears
  await expect(page.getByText('Your shopping bag is empty')).toBeVisible();

  // Step 4: Verify 'Check out' link is no longer visible
  await expect(page.getByRole('link', { name: 'Check out' })).not.toBeVisible();
});
