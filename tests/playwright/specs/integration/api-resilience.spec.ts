import { test, expect } from '@playwright/test';
import { resetTestData, createTestOrder } from '../../helpers/test-data';
import { assertPaginatedResponse, assertCatalogItemShape, assertOrderSummaryShape } from '../../helpers/assertions';
import { postWithRequestId, putWithRequestId } from '../../helpers/api-client';

test.describe('Category I: API Resilience & Performance', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request);
  });

  // ─── Concurrent Operations ───────────────────────────────────────────────

  test('I01 - Concurrent catalog reads do not interfere', async ({ request }) => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      request.get(`/api/catalog/items?pageIndex=${i}&pageSize=10`)
    );

    const responses = await Promise.all(promises);
    for (const r of responses) {
      expect(r.status()).toBe(200);
    }
  });

  test('I02 - Concurrent basket updates for different users', async ({ request }) => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      request.post('/api/basket', {
        data: {
          buyerId: `concurrent-user-${i}`,
          items: [{ productId: i + 1, productName: `Item ${i}`, unitPrice: 10, quantity: i + 1 }],
        },
      })
    );

    const responses = await Promise.all(promises);
    for (const r of responses) {
      expect(r.status()).toBe(200);
    }

    // Verify each user has their own basket
    for (let i = 0; i < 5; i++) {
      const basket = await (await request.get(`/api/basket/concurrent-user-${i}`)).json();
      expect(basket.items[0].productId).toBe(i + 1);
      expect(basket.items[0].quantity).toBe(i + 1);
    }
  });

  test('I03 - Concurrent order creation with unique request IDs', async ({ request }) => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      postWithRequestId(request, '/api/orders', {
        userId: 'test-user-1',
        userName: 'Concurrent User',
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
        items: [{ productId: i + 1, unitPrice: 10 * (i + 1), quantity: 1 }],
      })
    );

    const responses = await Promise.all(promises);
    for (const r of responses) {
      expect(r.status()).toBe(200);
    }

    const orders = await (await request.get('/api/orders')).json();
    expect(orders).toHaveLength(5);
  });

  // ─── Test Helper Endpoint Validation ─────────────────────────────────────

  test('I04 - Test helper /_test/orders returns all orders', async ({ request }) => {
    await createTestOrder(request);
    await createTestOrder(request);

    const response = await request.get('/_test/orders');
    expect(response.status()).toBe(200);
    const orders = await response.json();
    expect(orders).toHaveLength(2);
    expect(orders[0]).toHaveProperty('orderNumber');
    expect(orders[0]).toHaveProperty('userId');
  });

  test('I05 - Test helper /_test/baskets returns all baskets', async ({ request }) => {
    await request.post('/api/basket', {
      data: {
        buyerId: 'user-x',
        items: [{ productId: 1, productName: 'X', unitPrice: 10, quantity: 1 }],
      },
    });

    const response = await request.get('/_test/baskets');
    expect(response.status()).toBe(200);
    const baskets = await response.json();
    expect(baskets).toHaveProperty('user-x');
  });

  test('I06 - Test helper /_test/events returns event list', async ({ request }) => {
    const response = await request.get('/_test/events');
    expect(response.status()).toBe(200);
    const events = await response.json();
    expect(Array.isArray(events)).toBe(true);
  });

  // ─── Assertion Helper Validation ─────────────────────────────────────────

  test('I07 - Paginated response shape validation', async ({ request }) => {
    const response = await request.get('/api/catalog/items?pageSize=3&pageIndex=0');
    const body = await assertPaginatedResponse(response, 0, 3);
    expect(body.items.length).toBeLessThanOrEqual(3);
    expect(body.totalCount).toBeGreaterThan(0);
  });

  test('I08 - Catalog item shape validation', async ({ request }) => {
    const response = await request.get('/api/catalog/items/1');
    expect(response.status()).toBe(200);
    const item = await response.json();
    assertCatalogItemShape(item);
  });

  test('I09 - Order summary shape validation', async ({ request }) => {
    await createTestOrder(request);

    const response = await request.get('/api/orders');
    expect(response.status()).toBe(200);
    const orders = await response.json();
    expect(orders.length).toBeGreaterThan(0);
    assertOrderSummaryShape(orders[0]);
  });

  // ─── Filter by Brand Only (all types) ────────────────────────────────────

  test('I10 - Filter catalog items by brand only (all types)', async ({ request }) => {
    const response = await request.get('/api/catalog/items/type/all/brand/1');
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const item of body.data) {
      expect(item.catalogBrandId).toBe(1);
    }
  });

  test('I11 - Filter catalog items with no brand filter returns all items', async ({ request }) => {
    const response = await request.get('/api/catalog/items/type/all/brand');
    expect(response.status()).toBe(200);
    const body = await response.json();
    // This endpoint uses count/data field names (v1 style)
    expect(body.pageSize).toBe(10);
    expect(body.data.length).toBeGreaterThan(0);
  });

  // ─── API Client Helper Validation ────────────────────────────────────────

  test('I12 - putWithRequestId helper works for cancel', async ({ request }) => {
    await createTestOrder(request);

    const response = await putWithRequestId(request, '/api/orders/cancel', {
      orderNumber: 1,
    });
    expect(response.status()).toBe(200);

    const order = await (await request.get('/api/orders/1')).json();
    expect(order.status).toBe('cancelled');
  });
});
