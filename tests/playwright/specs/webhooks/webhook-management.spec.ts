import { test, expect } from '@playwright/test';
import { resetTestData, createTestWebhook } from '../../helpers/test-data';

test.describe('Category F: Webhook Management', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request);
  });

  test('F01 - Create webhook subscription', async ({ request }) => {
    const response = await createTestWebhook(request);
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.destUrl).toBe('https://example.com/webhook');
    expect(body.token).toBe('test-token-123');
    expect(body.type).toBe('OrderPaid');
    expect(body.id).toBeGreaterThan(0);
  });

  test('F02 - List webhook subscriptions', async ({ request }) => {
    await createTestWebhook(request);
    await createTestWebhook(request, { url: 'https://example.com/webhook2', event: 'OrderShipped' });

    const response = await request.get('/api/webhooks');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBe(2);
  });

  test('F03 - Get webhook subscription by ID', async ({ request }) => {
    const created = await (await createTestWebhook(request)).json();

    const response = await request.get(`/api/webhooks/${created.id}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(created.id);
    expect(body.destUrl).toBe('https://example.com/webhook');
  });

  test('F04 - Get non-existent webhook returns 404', async ({ request }) => {
    const response = await request.get('/api/webhooks/99999');
    expect(response.status()).toBe(404);
  });

  test('F05 - Delete webhook subscription', async ({ request }) => {
    const created = await (await createTestWebhook(request)).json();

    const deleteResponse = await request.delete(`/api/webhooks/${created.id}`);
    expect(deleteResponse.status()).toBe(202);

    // Verify deleted
    const getResponse = await request.get(`/api/webhooks/${created.id}`);
    expect(getResponse.status()).toBe(404);
  });

  test('F06 - Delete non-existent webhook returns 404', async ({ request }) => {
    const response = await request.delete('/api/webhooks/99999');
    expect(response.status()).toBe(404);
  });
});
