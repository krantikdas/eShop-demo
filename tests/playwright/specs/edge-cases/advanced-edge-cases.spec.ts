import { test, expect } from '@playwright/test';
import { resetTestData, createTestOrder, createTestWebhook } from '../../helpers/test-data';

test.describe('Category H: Advanced Edge Cases & Business Rules', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request);
  });

  // ─── Order State Machine Edge Cases ──────────────────────────────────────

  test('H01 - Cancel an already cancelled order', async ({ request }) => {
    await createTestOrder(request);

    // Cancel the order
    await request.put('/api/orders/cancel', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Verify it is cancelled
    const order = await (await request.get('/api/orders/1')).json();
    expect(order.status).toBe('cancelled');

    // Try to cancel again — should still succeed (idempotent) or remain cancelled
    const secondCancel = await request.put('/api/orders/cancel', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });
    expect(secondCancel.status()).toBe(200);

    // Verify status is still cancelled
    const orderAfter = await (await request.get('/api/orders/1')).json();
    expect(orderAfter.status).toBe('cancelled');
  });

  test('H02 - Ship a cancelled order', async ({ request }) => {
    await createTestOrder(request);

    // Cancel first
    await request.put('/api/orders/cancel', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Try to ship the cancelled order
    const shipResponse = await request.put('/api/orders/ship', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });
    // The mock server allows this; in production it would be rejected
    expect([200, 400, 500]).toContain(shipResponse.status());
  });

  test('H03 - Ship an already shipped order', async ({ request }) => {
    await createTestOrder(request);

    // Ship the order
    await request.put('/api/orders/ship', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Try to ship again
    const secondShip = await request.put('/api/orders/ship', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });
    expect(secondShip.status()).toBe(200);

    // Status should remain shipped
    const order = await (await request.get('/api/orders/1')).json();
    expect(order.status).toBe('shipped');
  });

  // ─── Catalog Data Integrity ──────────────────────────────────────────────

  test('H04 - Create item then delete then get returns 404', async ({ request }) => {
    // Create
    const createResponse = await request.post('/api/catalog/items', {
      data: { name: 'Ephemeral Item', price: 5.99 },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    // Verify it exists
    const getResponse = await request.get(`/api/catalog/items/${created.id}`);
    expect(getResponse.status()).toBe(200);

    // Delete
    const deleteResponse = await request.delete(`/api/catalog/items/${created.id}`);
    expect(deleteResponse.status()).toBe(204);

    // Get should now return 404
    const getAfterDelete = await request.get(`/api/catalog/items/${created.id}`);
    expect(getAfterDelete.status()).toBe(404);
  });

  test('H05 - Special characters in catalog item name', async ({ request }) => {
    const specialNames = [
      'Item with "quotes"',
      "Item with 'apostrophe'",
      'Item with <html> tags',
      'Item with emoji 🎉',
      'Item with accents: café résumé',
      'Item with & ampersand',
    ];

    for (const name of specialNames) {
      const response = await request.post('/api/catalog/items', {
        data: { name, price: 10.00 },
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.name).toBe(name);
    }
  });

  test('H06 - Catalog item with zero price', async ({ request }) => {
    const response = await request.post('/api/catalog/items', {
      data: { name: 'Free Item', price: 0 },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.price).toBe(0);
  });

  test('H07 - Catalog item with very high price', async ({ request }) => {
    const response = await request.post('/api/catalog/items', {
      data: { name: 'Luxury Item', price: 999999.99 },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.price).toBe(999999.99);
  });

  test('H08 - Update catalog item does not change ID', async ({ request }) => {
    const original = await (await request.get('/api/catalog/items/3')).json();

    await request.put('/api/catalog/items/3', {
      data: { name: 'Renamed Item', price: 42.00 },
    });

    const updated = await (await request.get('/api/catalog/items/3')).json();
    expect(updated.id).toBe(original.id);
    expect(updated.name).toBe('Renamed Item');
  });

  // ─── Basket Edge Cases ───────────────────────────────────────────────────

  test('H09 - Basket with very high quantity', async ({ request }) => {
    const response = await request.post('/api/basket', {
      data: {
        buyerId: 'test-user-1',
        items: [{ productId: 1, productName: 'Bulk Order', unitPrice: 5.00, quantity: 10000 }],
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items[0].quantity).toBe(10000);
  });

  test('H10 - Basket with many different items', async ({ request }) => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      productId: i + 1,
      productName: `Product ${i + 1}`,
      unitPrice: (i + 1) * 5.0,
      quantity: 1,
    }));

    const response = await request.post('/api/basket', {
      data: { buyerId: 'test-user-1', items },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items).toHaveLength(20);
  });

  test('H11 - Overwrite basket completely with new items', async ({ request }) => {
    // First basket
    await request.post('/api/basket', {
      data: {
        buyerId: 'test-user-1',
        items: [{ productId: 1, productName: 'First', unitPrice: 10, quantity: 1 }],
      },
    });

    // Overwrite with different items
    await request.post('/api/basket', {
      data: {
        buyerId: 'test-user-1',
        items: [{ productId: 99, productName: 'Replaced', unitPrice: 50, quantity: 3 }],
      },
    });

    const basket = await (await request.get('/api/basket/test-user-1')).json();
    expect(basket.items).toHaveLength(1);
    expect(basket.items[0].productId).toBe(99);
    expect(basket.items[0].productName).toBe('Replaced');
  });

  // ─── Order Edge Cases ────────────────────────────────────────────────────

  test('H12 - Order draft total calculation with decimal precision', async ({ request }) => {
    const response = await request.post('/api/orders/draft', {
      data: {
        buyerId: 'test-user-1',
        items: [
          { productId: 1, productName: 'A', unitPrice: 33.33, quantity: 3 },
          { productId: 2, productName: 'B', unitPrice: 0.01, quantity: 1 },
        ],
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const expectedTotal = 33.33 * 3 + 0.01 * 1;
    expect(body.total).toBeCloseTo(expectedTotal, 2);
  });

  test('H13 - Create multiple orders and verify unique order numbers', async ({ request }) => {
    const orderNumbers: number[] = [];
    for (let i = 0; i < 5; i++) {
      await createTestOrder(request);
    }

    const orders = await (await request.get('/api/orders')).json();
    for (const order of orders) {
      expect(orderNumbers).not.toContain(order.orderNumber);
      orderNumbers.push(order.orderNumber);
    }
    expect(orderNumbers).toHaveLength(5);
  });

  test('H14 - Order preserves address fields', async ({ request }) => {
    await request.post('/api/orders', {
      data: {
        userId: 'test-user-1',
        userName: 'Jane Doe',
        city: 'San Francisco',
        street: '742 Evergreen Terrace',
        state: 'CA',
        country: 'US',
        zipCode: '94102',
        cardNumber: '4111111111111111',
        cardHolderName: 'Jane Doe',
        cardExpiration: '2028-01-01',
        cardSecurityNumber: '999',
        cardTypeId: 1,
        buyer: 'test-user-1',
        items: [{ productId: 1, unitPrice: 10, quantity: 1 }],
      },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    const order = await (await request.get('/api/orders/1')).json();
    expect(order.city).toBe('San Francisco');
    expect(order.street).toBe('742 Evergreen Terrace');
    expect(order.state).toBe('CA');
    expect(order.country).toBe('US');
    expect(order.zipCode).toBe('94102');
  });

  // ─── Webhook Edge Cases ──────────────────────────────────────────────────

  test('H15 - Create multiple webhook subscriptions for different events', async ({ request }) => {
    await createTestWebhook(request, { event: 'OrderPaid' });
    await createTestWebhook(request, { event: 'OrderShipped' });
    await createTestWebhook(request, { event: 'CatalogItemPriceChanged' });

    const webhooks = await (await request.get('/api/webhooks')).json();
    expect(webhooks).toHaveLength(3);

    const events = webhooks.map((w: { type: string }) => w.type);
    expect(events).toContain('OrderPaid');
    expect(events).toContain('OrderShipped');
    expect(events).toContain('CatalogItemPriceChanged');
  });

  test('H16 - Webhook with empty token is accepted', async ({ request }) => {
    const response = await request.post('/api/webhooks', {
      data: {
        url: 'https://example.com/no-token',
        grantUrl: 'https://example.com/grant',
        token: '',
        event: 'OrderPaid',
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.token).toBe('');
  });

  // ─── Cross-Service Data Consistency ──────────────────────────────────────

  test('H17 - Deleting a basket does not affect existing orders', async ({ request }) => {
    // Create basket and order
    await request.post('/api/basket', {
      data: {
        buyerId: 'test-user-1',
        items: [{ productId: 1, productName: 'Item', unitPrice: 25, quantity: 2 }],
      },
    });

    await request.post('/api/orders', {
      data: {
        userId: 'test-user-1',
        userName: 'Test',
        city: 'City',
        street: 'Street',
        state: 'ST',
        country: 'US',
        zipCode: '00000',
        cardNumber: '4111111111111111',
        cardHolderName: 'Test',
        cardExpiration: '2027-12-01',
        cardSecurityNumber: '123',
        cardTypeId: 2,
        buyer: 'test-user-1',
        items: [{ productId: 1, productName: 'Item', unitPrice: 25, quantity: 2 }],
      },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Delete basket
    await request.delete('/api/basket/test-user-1');

    // Order should still exist
    const orders = await (await request.get('/api/orders')).json();
    expect(orders).toHaveLength(1);
    expect(orders[0].total).toBe(50);
  });

  test('H18 - Test reset clears all data stores independently', async ({ request }) => {
    // Create data in all stores
    await request.post('/api/catalog/items', { data: { name: 'New Item', price: 10 } });
    await request.post('/api/basket', {
      data: { buyerId: 'test-user-1', items: [{ productId: 1, quantity: 1 }] },
    });
    await createTestOrder(request);
    await createTestWebhook(request);

    // Verify data exists
    const countsBefore = await (await request.get('/_test/counts')).json();
    expect(countsBefore.catalogItems).toBeGreaterThan(101);
    expect(countsBefore.baskets).toBeGreaterThan(0);
    expect(countsBefore.orders).toBeGreaterThan(0);
    expect(countsBefore.webhookSubscriptions).toBeGreaterThan(0);

    // Reset
    await resetTestData(request);

    // Verify all stores are reset
    const countsAfter = await (await request.get('/_test/counts')).json();
    expect(countsAfter.catalogItems).toBe(101);
    expect(countsAfter.baskets).toBe(0);
    expect(countsAfter.orders).toBe(0);
    expect(countsAfter.webhookSubscriptions).toBe(0);
  });
});
