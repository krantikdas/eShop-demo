import { test, expect } from '@playwright/test';
import { resetTestData, createTestOrder } from '../../helpers/test-data';

test.describe('Category D: Order Lifecycle', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request);
  });

  test('D01 - Create order draft', async ({ request }) => {
    const response = await request.post('/api/orders/draft', {
      data: {
        buyerId: 'test-user-1',
        items: [
          { productId: 1, productName: 'Hoodie', unitPrice: 19.5, quantity: 2 },
          { productId: 2, productName: 'Mug', unitPrice: 8.5, quantity: 1 },
        ],
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.orderItems).toHaveLength(2);
    expect(body.total).toBe(19.5 * 2 + 8.5 * 1);
  });

  test('D02 - Create order with valid request ID', async ({ request }) => {
    const response = await createTestOrder(request);
    expect(response.status()).toBe(200);
  });

  test('D03 - Create order without request ID returns 400', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: {
        userId: 'test-user-1',
        userName: 'Test',
        city: 'Seattle',
        street: '123 Main',
        state: 'WA',
        country: 'US',
        zipCode: '98101',
        cardNumber: '4111111111111111',
        cardHolderName: 'Test',
        cardExpiration: '2027-12-01',
        cardSecurityNumber: '123',
        cardTypeId: 2,
        buyer: 'test-user-1',
        items: [{ productId: 1, unitPrice: 19.5, quantity: 1 }],
      },
      headers: { 'x-requestid': '' },
    });
    expect(response.status()).toBe(400);
  });

  test('D04 - Get order by ID after creation', async ({ request }) => {
    await createTestOrder(request);

    // Get the order (first order should be ID 1)
    const getResponse = await request.get('/api/orders/1');
    expect(getResponse.status()).toBe(200);
    const order = await getResponse.json();
    expect(order.orderNumber).toBe(1);
    expect(order.status).toBe('submitted');
    expect(order.city).toBe('Seattle');
  });

  test('D05 - Get non-existent order returns 404', async ({ request }) => {
    const response = await request.get('/api/orders/99999');
    expect(response.status()).toBe(404);
  });

  test('D06 - Get orders for current user', async ({ request }) => {
    await createTestOrder(request);
    await createTestOrder(request);

    const response = await request.get('/api/orders');
    expect(response.status()).toBe(200);
    const orders = await response.json();
    expect(orders.length).toBe(2);
    expect(orders[0]).toHaveProperty('orderNumber');
    expect(orders[0]).toHaveProperty('status');
    expect(orders[0]).toHaveProperty('total');
  });

  test('D07 - Cancel order', async ({ request }) => {
    await createTestOrder(request);

    const cancelResponse = await request.put('/api/orders/cancel', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });
    expect(cancelResponse.status()).toBe(200);

    // Verify order is cancelled
    const order = await (await request.get('/api/orders/1')).json();
    expect(order.status).toBe('cancelled');
  });

  test('D08 - Cancel order without request ID returns 400', async ({ request }) => {
    await createTestOrder(request);

    const response = await request.put('/api/orders/cancel', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': '' },
    });
    expect(response.status()).toBe(400);
  });

  test('D09 - Ship order', async ({ request }) => {
    await createTestOrder(request);

    const shipResponse = await request.put('/api/orders/ship', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });
    expect(shipResponse.status()).toBe(200);

    const order = await (await request.get('/api/orders/1')).json();
    expect(order.status).toBe('shipped');
  });

  test('D10 - Ship non-existent order returns 500', async ({ request }) => {
    const response = await request.put('/api/orders/ship', {
      data: { orderNumber: 99999 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });
    expect(response.status()).toBe(500);
  });

  test('D11 - Get card types', async ({ request }) => {
    const response = await request.get('/api/orders/cardtypes');
    expect(response.status()).toBe(200);
    const types = await response.json();
    expect(types.length).toBeGreaterThan(0);
    expect(types[0]).toHaveProperty('id');
    expect(types[0]).toHaveProperty('name');
  });

  test('D12 - Order masks credit card number', async ({ request }) => {
    await createTestOrder(request, { cardNumber: '4111111111111111' });

    const order = await (await request.get('/api/orders/1')).json();
    expect(order.cardNumber).not.toBe('4111111111111111');
    expect(order.cardNumber).toMatch(/X+1111$/);
  });
});
