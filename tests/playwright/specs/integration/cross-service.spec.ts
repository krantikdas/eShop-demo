import { test, expect } from '@playwright/test';
import { resetTestData } from '../../helpers/test-data';

test.describe('Category E: Cross-Service Integration', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request);
  });

  test('E01 - Full checkout flow: browse catalog -> add to basket -> create order', async ({ request }) => {
    // Step 1: Browse catalog and pick items
    const catalogResponse = await request.get('/api/catalog/items?pageSize=5');
    expect(catalogResponse.status()).toBe(200);
    const catalog = await catalogResponse.json();
    expect(catalog.data.length).toBeGreaterThan(0);

    const item1 = catalog.data[0];
    const item2 = catalog.data[1];

    // Step 2: Add items to basket
    const basketResponse = await request.post('/api/basket', {
      data: {
        buyerId: 'test-user-1',
        items: [
          { productId: item1.id, productName: item1.name, unitPrice: item1.price, quantity: 2 },
          { productId: item2.id, productName: item2.name, unitPrice: item2.price, quantity: 1 },
        ],
      },
    });
    expect(basketResponse.status()).toBe(200);
    const basket = await basketResponse.json();
    expect(basket.items).toHaveLength(2);

    // Step 3: Create order draft to calculate total
    const draftResponse = await request.post('/api/orders/draft', {
      data: {
        buyerId: 'test-user-1',
        items: basket.items,
      },
    });
    expect(draftResponse.status()).toBe(200);
    const draft = await draftResponse.json();
    expect(draft.total).toBeGreaterThan(0);

    // Step 4: Create the order
    const orderResponse = await request.post('/api/orders', {
      data: {
        userId: 'test-user-1',
        userName: 'Test User',
        city: 'Seattle',
        street: '123 Main St',
        state: 'WA',
        country: 'US',
        zipCode: '98101',
        cardNumber: '4111111111111111',
        cardHolderName: 'Test User',
        cardExpiration: '2027-12-01T00:00:00Z',
        cardSecurityNumber: '123',
        cardTypeId: 2,
        buyer: 'test-user-1',
        items: basket.items,
      },
      headers: { 'x-requestid': crypto.randomUUID() },
    });
    expect(orderResponse.status()).toBe(200);

    // Step 5: Verify order exists
    const ordersResponse = await request.get('/api/orders');
    const orders = await ordersResponse.json();
    expect(orders.length).toBe(1);
    expect(orders[0].status).toBe('submitted');

    // Step 6: Clean up basket after order
    const deleteBasket = await request.delete('/api/basket/test-user-1');
    expect(deleteBasket.status()).toBe(200);
  });

  test('E02 - Catalog item details match basket item data', async ({ request }) => {
    // Get a specific catalog item
    const catalogItem = await (await request.get('/api/catalog/items/1')).json();

    // Add to basket
    await request.post('/api/basket', {
      data: {
        buyerId: 'test-user-1',
        items: [
          {
            productId: catalogItem.id,
            productName: catalogItem.name,
            unitPrice: catalogItem.price,
            quantity: 1,
          },
        ],
      },
    });

    // Retrieve basket and verify data consistency
    const basket = await (await request.get('/api/basket/test-user-1')).json();
    expect(basket.items[0].productId).toBe(catalogItem.id);
    expect(basket.items[0].productName).toBe(catalogItem.name);
    expect(basket.items[0].unitPrice).toBe(catalogItem.price);
  });

  test('E03 - Order total matches basket items calculation', async ({ request }) => {
    const items = [
      { productId: 1, productName: 'Item 1', unitPrice: 19.5, quantity: 2 },
      { productId: 2, productName: 'Item 2', unitPrice: 8.5, quantity: 3 },
    ];

    // Create basket
    await request.post('/api/basket', {
      data: { buyerId: 'test-user-1', items },
    });

    // Create order draft
    const draft = await (
      await request.post('/api/orders/draft', {
        data: { buyerId: 'test-user-1', items },
      })
    ).json();

    const expectedTotal = 19.5 * 2 + 8.5 * 3;
    expect(draft.total).toBe(expectedTotal);
  });

  test('E04 - Order lifecycle: create -> cancel', async ({ request }) => {
    // Create order
    await request.post('/api/orders', {
      data: {
        userId: 'test-user-1',
        userName: 'Test User',
        city: 'Portland',
        street: '456 Oak Ave',
        state: 'OR',
        country: 'US',
        zipCode: '97201',
        cardNumber: '5500000000000004',
        cardHolderName: 'Test User',
        cardExpiration: '2028-06-01T00:00:00Z',
        cardSecurityNumber: '456',
        cardTypeId: 3,
        buyer: 'test-user-1',
        items: [{ productId: 1, unitPrice: 19.5, quantity: 1 }],
      },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Verify submitted
    let order = await (await request.get('/api/orders/1')).json();
    expect(order.status).toBe('submitted');

    // Cancel
    await request.put('/api/orders/cancel', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Verify cancelled
    order = await (await request.get('/api/orders/1')).json();
    expect(order.status).toBe('cancelled');
  });

  test('E05 - Order lifecycle: create -> ship', async ({ request }) => {
    // Create order
    await request.post('/api/orders', {
      data: {
        userId: 'test-user-1',
        userName: 'Test User',
        city: 'Seattle',
        street: '789 Pine',
        state: 'WA',
        country: 'US',
        zipCode: '98101',
        cardNumber: '4111111111111111',
        cardHolderName: 'Test User',
        cardExpiration: '2027-12-01T00:00:00Z',
        cardSecurityNumber: '123',
        cardTypeId: 2,
        buyer: 'test-user-1',
        items: [{ productId: 1, unitPrice: 19.5, quantity: 1 }],
      },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Ship
    await request.put('/api/orders/ship', {
      data: { orderNumber: 1 },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Verify shipped
    const order = await (await request.get('/api/orders/1')).json();
    expect(order.status).toBe('shipped');
  });

  test('E06 - Multiple users can have independent baskets and orders', async ({ request }) => {
    // User A basket and order
    await request.post('/api/basket', {
      data: {
        buyerId: 'user-a',
        items: [{ productId: 1, productName: 'Item A', unitPrice: 10, quantity: 1 }],
      },
    });
    await request.post('/api/orders', {
      data: {
        userId: 'user-a',
        userName: 'User A',
        city: 'CityA',
        street: 'StreetA',
        state: 'SA',
        country: 'US',
        zipCode: '11111',
        cardNumber: '4111111111111111',
        cardHolderName: 'A',
        cardExpiration: '2027-12-01',
        cardSecurityNumber: '111',
        cardTypeId: 2,
        buyer: 'user-a',
        items: [{ productId: 1, unitPrice: 10, quantity: 1 }],
      },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // User B basket and order
    await request.post('/api/basket', {
      data: {
        buyerId: 'user-b',
        items: [{ productId: 2, productName: 'Item B', unitPrice: 20, quantity: 2 }],
      },
    });
    await request.post('/api/orders', {
      data: {
        userId: 'user-b',
        userName: 'User B',
        city: 'CityB',
        street: 'StreetB',
        state: 'SB',
        country: 'US',
        zipCode: '22222',
        cardNumber: '5500000000000004',
        cardHolderName: 'B',
        cardExpiration: '2027-12-01',
        cardSecurityNumber: '222',
        cardTypeId: 3,
        buyer: 'user-b',
        items: [{ productId: 2, unitPrice: 20, quantity: 2 }],
      },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Verify independence
    const basketA = await (await request.get('/api/basket/user-a')).json();
    const basketB = await (await request.get('/api/basket/user-b')).json();
    expect(basketA.items[0].productId).toBe(1);
    expect(basketB.items[0].productId).toBe(2);
  });

  test('E07 - Webhook subscription receives order events', async ({ request }) => {
    // Create webhook subscription for order events
    const webhookResponse = await request.post('/api/webhooks', {
      data: {
        url: 'https://example.com/orders-webhook',
        grantUrl: 'https://example.com/grant',
        token: 'order-webhook-token',
        event: 'OrderPaid',
      },
    });
    expect(webhookResponse.status()).toBe(201);

    // Create an order
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
        items: [{ productId: 1, unitPrice: 10, quantity: 1 }],
      },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Verify both webhook and order exist
    const webhooks = await (await request.get('/api/webhooks')).json();
    expect(webhooks.length).toBe(1);
    expect(webhooks[0].type).toBe('OrderPaid');

    const orders = await (await request.get('/api/orders')).json();
    expect(orders.length).toBe(1);
  });

  test('E08 - End-to-end: catalog CRUD does not affect existing orders', async ({ request }) => {
    // Create order with catalog item
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
        items: [{ productId: 1, productName: 'Original Name', unitPrice: 19.5, quantity: 1 }],
      },
      headers: { 'x-requestid': crypto.randomUUID() },
    });

    // Update the catalog item
    await request.put('/api/catalog/items/1', {
      data: { name: 'Changed Name', price: 99.99 },
    });

    // Original order should still have original data
    const order = await (await request.get('/api/orders/1')).json();
    expect(order.orderItems[0].productName).toBe('Original Name');
    expect(order.orderItems[0].unitPrice).toBe(19.5);
  });
});
