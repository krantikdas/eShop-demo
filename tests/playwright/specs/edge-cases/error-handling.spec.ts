import { test, expect } from '@playwright/test';
import { resetTestData } from '../../helpers/test-data';

test.describe('Category G: Error Handling & Edge Cases', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request);
  });

  // ─── Catalog Edge Cases ────────────────────────────────────────────────────

  test('G01 - Catalog pagination beyond available items returns empty data', async ({ request }) => {
    const response = await request.get('/api/catalog/items?pageIndex=999');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(0);
    expect(body.count).toBeGreaterThan(0); // Count still reflects total
  });

  test('G02 - Batch get with empty IDs returns empty array', async ({ request }) => {
    const response = await request.get('/api/catalog/items/by');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(0);
  });

  test('G03 - Filter by non-existent type returns empty results', async ({ request }) => {
    const response = await request.get('/api/catalog/items/type/999/brand/999');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(0);
    expect(body.count).toBe(0);
  });

  test('G04 - Semantic search with no matches returns empty data', async ({ request }) => {
    const response = await request.get(
      '/api/catalog/items/withsemanticrelevance/xyznonexistentterm'
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(0);
  });

  test('G05 - Create catalog item with minimal fields', async ({ request }) => {
    const response = await request.post('/api/catalog/items', {
      data: { name: 'Minimal Item' },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.name).toBe('Minimal Item');
    expect(body.price).toBe(0);
  });

  // ─── Ordering Edge Cases ───────────────────────────────────────────────────

  test('G06 - Create order with empty request ID header', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: {
        userId: 'test-user-1',
        items: [],
      },
      headers: { 'x-requestid': '' },
    });
    expect(response.status()).toBe(400);
  });

  test('G07 - Cancel non-existent order returns error', async ({ request }) => {
    const response = await request.put('/api/orders/cancel', {
      data: { orderNumber: 99999 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });
    expect(response.status()).toBe(500);
  });

  test('G08 - Ship without request ID returns 400', async ({ request }) => {
    const response = await request.put('/api/orders/ship', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': '' },
    });
    expect(response.status()).toBe(400);
  });

  test('G09 - Get orders when none exist returns empty array', async ({ request }) => {
    const response = await request.get('/api/orders');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(0);
  });

  test('G10 - Order draft with empty items returns zero total', async ({ request }) => {
    const response = await request.post('/api/orders/draft', {
      data: { buyerId: 'test-user-1', items: [] },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.orderItems).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  // ─── Webhook Edge Cases ────────────────────────────────────────────────────

  test('G11 - Create webhook with missing required fields returns 400', async ({ request }) => {
    const response = await request.post('/api/webhooks', {
      data: { url: 'https://example.com/hook' },
    });
    expect(response.status()).toBe(400);
  });

  test('G12 - List webhooks when none exist returns empty array', async ({ request }) => {
    const response = await request.get('/api/webhooks');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(0);
  });

  // ─── Data Integrity ────────────────────────────────────────────────────────

  test('G13 - Test data reset restores original state', async ({ request }) => {
    // Create some data
    await request.post('/api/catalog/items', { data: { name: 'Temp' } });
    await request.post('/api/basket', {
      data: { buyerId: 'temp', items: [{ productId: 1, quantity: 1 }] },
    });

    // Get counts before reset
    const before = await (await request.get('/_test/counts')).json();
    expect(before.catalogItems).toBeGreaterThan(101);

    // Reset
    await request.post('/_test/reset');

    // Verify reset
    const after = await (await request.get('/_test/counts')).json();
    expect(after.catalogItems).toBe(101);
    expect(after.baskets).toBe(0);
    expect(after.orders).toBe(0);
    expect(after.webhookSubscriptions).toBe(0);
  });

  test('G14 - Health check returns all services', async ({ request }) => {
    const response = await request.get('/_test/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.services).toContain('catalog');
    expect(body.services).toContain('basket');
    expect(body.services).toContain('ordering');
    expect(body.services).toContain('webhooks');
  });

  test('G15 - Concurrent operations: create multiple orders', async ({ request }) => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      request.post('/api/orders', {
        data: {
          userId: 'test-user-1',
          userName: 'User',
          city: `City${i}`,
          street: `Street${i}`,
          state: 'ST',
          country: 'US',
          zipCode: '00000',
          cardNumber: '4111111111111111',
          cardHolderName: 'Test',
          cardExpiration: '2027-12-01',
          cardSecurityNumber: '123',
          cardTypeId: 2,
          buyer: 'test-user-1',
          items: [{ productId: i + 1, unitPrice: 10, quantity: 1 }],
        },
        headers: { 'x-requestid': crypto.randomUUID() },
      })
    );

    const responses = await Promise.all(promises);
    for (const r of responses) {
      expect(r.status()).toBe(200);
    }

    const orders = await (await request.get('/api/orders')).json();
    expect(orders.length).toBe(5);
  });

  test('G16 - Large pagination page size', async ({ request }) => {
    const response = await request.get('/api/catalog/items?pageSize=200');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBe(body.count); // All items on one page
  });
});
