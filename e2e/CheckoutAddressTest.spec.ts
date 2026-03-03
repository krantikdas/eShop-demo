import { test, expect } from '@playwright/test';

test('Enter shipping address at checkout', async ({ page }) => {
  // Setup: Add an item to cart first
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ready for a new adventure?' })).toBeVisible();
  await page.getByRole('link', { name: 'Adventurer GPS Watch' }).click();
  await page.getByRole('button', { name: 'Add to shopping bag' }).click();
  await page.getByRole('link', { name: 'shopping bag' }).click();
  await expect(page.getByRole('heading', { name: 'Shopping bag' })).toBeVisible();
  await page.getByRole('link', { name: 'Check out' }).click();

  // Step 1: Verify checkout page loads with shipping address form
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await expect(page.getByText('Shipping address')).toBeVisible();

  // Step 2: Verify all address fields are present
  await expect(page.getByLabel('Address')).toBeVisible();
  await expect(page.getByLabel('City')).toBeVisible();
  await expect(page.getByLabel('State')).toBeVisible();
  await expect(page.getByLabel('Zip code')).toBeVisible();
  await expect(page.getByLabel('Country')).toBeVisible();

  // Step 3: Verify Place order button is present
  await expect(page.getByRole('button', { name: 'Place order' })).toBeVisible();

  // Step 4: Fill in shipping address fields
  await page.getByLabel('Address').fill('456 Demo Boulevard');
  await page.getByLabel('City').fill('Portland');
  await page.getByLabel('State').fill('OR');
  await page.getByLabel('Zip code').fill('97201');
  await page.getByLabel('Country').fill('United States');

  // Step 5: Verify fields retain entered values
  await expect(page.getByLabel('Address')).toHaveValue('456 Demo Boulevard');
  await expect(page.getByLabel('City')).toHaveValue('Portland');
  await expect(page.getByLabel('State')).toHaveValue('OR');
  await expect(page.getByLabel('Zip code')).toHaveValue('97201');
  await expect(page.getByLabel('Country')).toHaveValue('United States');

  // Step 6: Submit and verify redirect to order history
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForURL('**/user/orders');
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
});

test('Checkout shows validation for empty address fields', async ({ page }) => {
  // Setup: Add an item to cart first
  await page.goto('/');
  await page.getByRole('link', { name: 'Adventurer GPS Watch' }).click();
  await page.getByRole('button', { name: 'Add to shopping bag' }).click();
  await page.getByRole('link', { name: 'shopping bag' }).click();
  await page.getByRole('link', { name: 'Check out' }).click();
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  // Clear all fields and attempt to submit
  await page.getByLabel('Address').clear();
  await page.getByLabel('City').clear();
  await page.getByLabel('State').clear();
  await page.getByLabel('Zip code').clear();
  await page.getByLabel('Country').clear();

  await page.getByRole('button', { name: 'Place order' }).click();

  // Verify validation messages appear (form should not navigate away)
  await expect(page).toHaveURL(/.*checkout/);
});
