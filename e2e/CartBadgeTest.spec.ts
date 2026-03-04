import { test, expect } from '@playwright/test';

test('Cart badge shows item count in header', async ({ page }) => {
  // Step 1: Navigate to catalog
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ready for a new adventure?' })).toBeVisible();

  // Step 2: Verify cart badge is not visible when cart is empty
  const cartBadge = page.locator('.cart-badge');
  await expect(cartBadge).not.toBeVisible();

  // Step 3: Add a product to the cart
  await page.getByRole('link', { name: 'Adventurer GPS Watch' }).click();
  await expect(page.getByRole('heading', { name: 'Adventurer GPS Watch' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to shopping bag' }).click();

  // Step 4: Verify cart badge appears with count
  await expect(cartBadge).toBeVisible();
  await expect(cartBadge).toHaveText(/[1-9]/);

  // Step 5: Navigate to another page and verify badge persists
  await page.goto('/');
  await expect(page.locator('.cart-badge')).toBeVisible();
  await expect(page.locator('.cart-badge')).toHaveText(/[1-9]/);
});
