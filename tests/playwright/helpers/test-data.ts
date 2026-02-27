import { APIRequestContext } from '@playwright/test';

/** Reset all mock server data to initial seed state */
export async function resetTestData(request: APIRequestContext): Promise<void> {
  await request.post('/_test/reset');
}

/** Get current data counts from mock server */
export async function getDataCounts(request: APIRequestContext) {
  const response = await request.get('/_test/counts');
  return response.json();
}

/** Create a test basket with items from the catalog */
export async function createTestBasket(
  request: APIRequestContext,
  buyerId: string = 'test-user-1',
  items: Array<{ productId: number; productName: string; unitPrice: number; quantity: number }> = []
) {
  if (items.length === 0) {
    items = [
      { productId: 1, productName: '.NET Bot Black Hoodie', unitPrice: 19.5, quantity: 2 },
      { productId: 2, productName: '.NET Black & White Mug', unitPrice: 8.5, quantity: 1 },
    ];
  }

  const response = await request.post('/api/basket', {
    data: { buyerId, items },
  });
  return response;
}

/** Create a test order */
export async function createTestOrder(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
) {
  const defaultOrder = {
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
    items: [
      { productId: 1, productName: '.NET Bot Black Hoodie', unitPrice: 19.5, quantity: 2 },
    ],
    ...overrides,
  };

  const response = await request.post('/api/orders', {
    data: defaultOrder,
    headers: {
      'x-requestid': crypto.randomUUID(),
    },
  });
  return response;
}

/** Create a test webhook subscription */
export async function createTestWebhook(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
) {
  const defaultWebhook = {
    url: 'https://example.com/webhook',
    grantUrl: 'https://example.com/grant',
    token: 'test-token-123',
    event: 'OrderPaid',
    ...overrides,
  };

  const response = await request.post('/api/webhooks', {
    data: defaultWebhook,
  });
  return response;
}

/** Sample catalog item for creation tests */
export const sampleCatalogItem = {
  name: 'Test Integration Item',
  description: 'Created during integration testing',
  price: 29.99,
  catalogTypeId: 1,
  catalogBrandId: 1,
  availableStock: 50,
  restockThreshold: 5,
  maxStockThreshold: 100,
};
