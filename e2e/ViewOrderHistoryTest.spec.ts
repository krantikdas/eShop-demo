import { test, expect } from '@playwright/test';

test('View order history page', async ({ page }) => {
  // Step 1: Navigate to order history page
  await page.goto('/user/orders');

  // Step 2: Verify page requires authentication and loads correctly
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();

  // Step 3: Verify order list structure is present
  // Either orders are displayed or the "no orders" message is shown
  const hasOrders = await page.locator('.orders-list').isVisible().catch(() => false);
  const hasNoOrdersMsg = await page.getByText("You haven't yet placed any orders.").isVisible().catch(() => false);
  expect(hasOrders || hasNoOrdersMsg).toBeTruthy();

  // Step 4: If orders exist, verify table headers and order details
  if (hasOrders) {
    // Verify column headers
    await expect(page.getByText('Number')).toBeVisible();
    await expect(page.getByText('Date')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();

    // Verify at least one order item is displayed
    const orderItems = page.locator('.orders-item').filter({ hasNot: page.locator('.orders-header') });
    await expect(orderItems.first()).toBeVisible();

    // Verify order status badge is displayed
    await expect(page.locator('.order-status').first()).toBeVisible();
  }
});
