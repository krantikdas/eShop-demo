import { test, expect } from '@playwright/test';

test('View product details page', async ({ page }) => {
  // Step 1: Navigate to catalog
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ready for a new adventure?' })).toBeVisible();

  // Step 2: Click a product card to navigate to detail page
  await page.getByRole('link', { name: 'Adventurer GPS Watch' }).click();

  // Step 3: Verify detail page shows product name, description, price, and brand
  await expect(page.getByRole('heading', { name: 'Adventurer GPS Watch' })).toBeVisible();
  await expect(page.locator('.item-details .description')).toBeVisible();
  await expect(page.locator('.item-details .price')).toBeVisible();
  await expect(page.getByText('Brand:')).toBeVisible();

  // Step 4: Verify product image is displayed
  await expect(page.locator('.item-details img')).toBeVisible();

  // Step 5: Verify 'Add to shopping bag' button is visible (logged-in user)
  await expect(page.getByRole('button', { name: 'Add to shopping bag' })).toBeVisible();
});

test('Product details page shows not found for invalid ID', async ({ page }) => {
  // Navigate to a non-existent product
  await page.goto('/item/999999');

  // Verify not-found message is displayed
  await expect(page.getByText("Sorry, we couldn't find any such product.")).toBeVisible();
});
