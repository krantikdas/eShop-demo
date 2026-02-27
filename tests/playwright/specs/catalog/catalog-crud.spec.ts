import { test, expect } from '@playwright/test';
import { resetTestData, sampleCatalogItem } from '../../helpers/test-data';

test.describe('Category A: Catalog CRUD Operations', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request);
  });

  test('A01 - Create a new catalog item', async ({ request }) => {
    const response = await request.post('/api/catalog/items', {
      data: sampleCatalogItem,
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.name).toBe(sampleCatalogItem.name);
    expect(body.price).toBe(sampleCatalogItem.price);
    expect(body.id).toBeGreaterThan(0);
  });

  test('A02 - Get catalog item by ID', async ({ request }) => {
    const response = await request.get('/api/catalog/items/1');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.name).toBeTruthy();
    expect(body.price).toBeGreaterThan(0);
  });

  test('A03 - Get catalog item returns 404 for non-existent ID', async ({ request }) => {
    const response = await request.get('/api/catalog/items/99999');
    expect(response.status()).toBe(404);
  });

  test('A04 - Get catalog item returns 400 for invalid ID (zero)', async ({ request }) => {
    const response = await request.get('/api/catalog/items/0');
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.detail).toContain('not valid');
  });

  test('A05 - Get catalog item returns 400 for negative ID', async ({ request }) => {
    const response = await request.get('/api/catalog/items/-1');
    expect(response.status()).toBe(400);
  });

  test('A06 - Update catalog item (v1 - id in body)', async ({ request }) => {
    const response = await request.put('/api/catalog/items', {
      data: { id: 1, name: 'Updated Item Name', price: 99.99 },
    });
    expect(response.status()).toBe(201);

    // Verify the update
    const getResponse = await request.get('/api/catalog/items/1');
    const body = await getResponse.json();
    expect(body.name).toBe('Updated Item Name');
    expect(body.price).toBe(99.99);
  });

  test('A07 - Update catalog item (v2 - id in URL)', async ({ request }) => {
    const response = await request.put('/api/catalog/items/2', {
      data: { name: 'Updated via V2', price: 55.00 },
    });
    expect(response.status()).toBe(201);

    const getResponse = await request.get('/api/catalog/items/2');
    const body = await getResponse.json();
    expect(body.name).toBe('Updated via V2');
  });

  test('A08 - Update non-existent item returns 404', async ({ request }) => {
    const response = await request.put('/api/catalog/items/99999', {
      data: { name: 'Ghost Item' },
    });
    expect(response.status()).toBe(404);
  });

  test('A09 - Update item v1 without id returns 400', async ({ request }) => {
    const response = await request.put('/api/catalog/items', {
      data: { name: 'No ID' },
    });
    expect(response.status()).toBe(400);
  });

  test('A10 - Delete catalog item', async ({ request }) => {
    const response = await request.delete('/api/catalog/items/1');
    expect(response.status()).toBe(204);

    // Verify deletion
    const getResponse = await request.get('/api/catalog/items/1');
    expect(getResponse.status()).toBe(404);
  });

  test('A11 - Delete non-existent item returns 404', async ({ request }) => {
    const response = await request.delete('/api/catalog/items/99999');
    expect(response.status()).toBe(404);
  });

  test('A12 - Create and then retrieve item', async ({ request }) => {
    const createResponse = await request.post('/api/catalog/items', {
      data: sampleCatalogItem,
    });
    const created = await createResponse.json();

    const getResponse = await request.get(`/api/catalog/items/${created.id}`);
    expect(getResponse.status()).toBe(200);
    const body = await getResponse.json();
    expect(body.name).toBe(sampleCatalogItem.name);
    expect(body.description).toBe(sampleCatalogItem.description);
  });

  test('A13 - Create item with all fields populated', async ({ request }) => {
    const fullItem = {
      ...sampleCatalogItem,
      pictureFileName: 'test.webp',
      onReorder: true,
    };
    const response = await request.post('/api/catalog/items', { data: fullItem });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.availableStock).toBe(50);
    expect(body.restockThreshold).toBe(5);
    expect(body.maxStockThreshold).toBe(100);
  });

  test('A14 - Update item price triggers price change', async ({ request }) => {
    // Get original price
    const original = await (await request.get('/api/catalog/items/1')).json();
    const newPrice = original.price + 10;

    const response = await request.put('/api/catalog/items/1', {
      data: { price: newPrice },
    });
    expect(response.status()).toBe(201);

    const updated = await (await request.get('/api/catalog/items/1')).json();
    expect(updated.price).toBe(newPrice);
  });
});
