import { test, expect } from '@playwright/test';
import { resetTestData, createTestBasket } from '../../helpers/test-data';

test.describe('Category C: Basket Operations', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request);
  });

  test('C01 - Get empty basket returns empty items', async ({ request }) => {
    const response = await request.get('/api/basket/test-user-1');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items).toHaveLength(0);
  });

  test('C02 - Create basket with items', async ({ request }) => {
    const response = await createTestBasket(request);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.buyerId).toBe('test-user-1');
    expect(body.items).toHaveLength(2);
    expect(body.items[0].productId).toBe(1);
    expect(body.items[0].quantity).toBe(2);
  });

  test('C03 - Get basket after creation', async ({ request }) => {
    await createTestBasket(request);
    const response = await request.get('/api/basket/test-user-1');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.buyerId).toBe('test-user-1');
    expect(body.items).toHaveLength(2);
  });

  test('C04 - Update basket replaces items', async ({ request }) => {
    await createTestBasket(request);

    // Update with different items
    const response = await request.post('/api/basket', {
      data: {
        buyerId: 'test-user-1',
        items: [{ productId: 5, productName: 'New Item', unitPrice: 15.0, quantity: 3 }],
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].productId).toBe(5);
    expect(body.items[0].quantity).toBe(3);
  });

  test('C05 - Delete basket', async ({ request }) => {
    await createTestBasket(request);

    const deleteResponse = await request.delete('/api/basket/test-user-1');
    expect(deleteResponse.status()).toBe(200);

    // Verify basket is empty
    const getResponse = await request.get('/api/basket/test-user-1');
    const body = await getResponse.json();
    expect(body.items).toHaveLength(0);
  });

  test('C06 - Multiple baskets for different users', async ({ request }) => {
    await createTestBasket(request, 'user-a', [
      { productId: 1, productName: 'Item A', unitPrice: 10, quantity: 1 },
    ]);
    await createTestBasket(request, 'user-b', [
      { productId: 2, productName: 'Item B', unitPrice: 20, quantity: 2 },
    ]);

    const basketA = await (await request.get('/api/basket/user-a')).json();
    const basketB = await (await request.get('/api/basket/user-b')).json();

    expect(basketA.items[0].productId).toBe(1);
    expect(basketB.items[0].productId).toBe(2);
  });

  test('C07 - Basket preserves item details', async ({ request }) => {
    const items = [
      { productId: 1, productName: 'Hoodie', unitPrice: 19.5, quantity: 2 },
    ];
    await createTestBasket(request, 'test-user-1', items);

    const response = await request.get('/api/basket/test-user-1');
    const body = await response.json();
    expect(body.items[0].productName).toBe('Hoodie');
    expect(body.items[0].unitPrice).toBe(19.5);
  });

  test('C08 - Create basket with empty items array', async ({ request }) => {
    const response = await request.post('/api/basket', {
      data: { buyerId: 'empty-basket-user', items: [] },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items).toHaveLength(0);
  });
});
