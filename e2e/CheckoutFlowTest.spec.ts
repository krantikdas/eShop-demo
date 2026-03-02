import { test, expect } from '@playwright/test';

test('End-to-end: Browse, add to cart, and checkout', async ({ page }) => {
  // Step 1: Navigate to catalog and see products
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ready for a new adventure?' })).toBeVisible();

  // Step 2: Click a product to view details
  await page.getByRole('link', { name: 'Adventurer GPS Watch' }).click();
  await expect(page.getByRole('heading', { name: 'Adventurer GPS Watch' })).toBeVisible();

  // Step 4: Add product to cart from detail page
  await page.getByRole('button', { name: 'Add to shopping bag' }).click();

  // Step 5: Navigate to cart and verify item is present
  await page.getByRole('link', { name: 'shopping bag' }).click();
  await expect(page.getByRole('heading', { name: 'Shopping bag' })).toBeVisible();
  await expect.poll(() => page.getByLabel('product quantity').count()).toBeGreaterThan(0);

  // Step 6: Click 'Check out' and enter shipping address
  await page.getByRole('link', { name: 'Check out' }).click();
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Address').fill('123 Test Street');
  await page.getByLabel('City').fill('Seattle');
  await page.getByLabel('State').fill('WA');
  await page.getByLabel('Zip code').fill('98101');
  await page.getByLabel('Country').fill('United States');

  // Step 7: Click 'Place order'
  await page.getByRole('button', { name: 'Place order' }).click();

  // Step 8: User is redirected to order history
  await page.waitForURL('**/user/orders');
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();

  // Step 9: New order appears with 'Submitted' status
  const ordersList = page.locator('.orders-list');
  await expect(ordersList).toBeVisible();
  await expect(ordersList.locator('.order-status')).toContainText(/submitted/i);

  // Step 10: Cart is empty after order placement
  await page.goto('/cart');
  await expect(page.getByText('Your shopping bag is empty')).toBeVisible();
});
