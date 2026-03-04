import { test, expect } from '@playwright/test';
import { resetTestData } from '../../helpers/test-data';

test.describe('Category B: Catalog Query & Filtering', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request);
  });

  test('B01 - List catalog items with default pagination', async ({ request }) => {
    const response = await request.get('/api/catalog/items');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.pageIndex).toBe(0);
    expect(body.pageSize).toBe(10);
    expect(body.totalCount).toBeGreaterThan(0); // HEALED: 'count' renamed to 'totalCount' in API response
    expect(body.items.length).toBeLessThanOrEqual(10); // HEALED: 'data' renamed to 'items' in API response
  });

  test('B02 - List catalog items with custom page size', async ({ request }) => {
    const response = await request.get('/api/catalog/items?pageSize=5');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.pageSize).toBe(5);
    expect(body.items.length).toBeLessThanOrEqual(5); // HEALED: 'data' renamed to 'items' in API response
  });

  test('B03 - List catalog items page 2', async ({ request }) => {
    const response = await request.get('/api/catalog/items?pageSize=10&pageIndex=1');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.pageIndex).toBe(1);
    expect(body.items.length).toBeGreaterThan(0); // HEALED: 'data' renamed to 'items' in API response
  });

  test('B04 - Total count remains consistent across pages', async ({ request }) => {
    const page0 = await (await request.get('/api/catalog/items?pageSize=5&pageIndex=0')).json();
    const page1 = await (await request.get('/api/catalog/items?pageSize=5&pageIndex=1')).json();
    expect(page0.totalCount).toBe(page1.totalCount); // HEALED: 'count' renamed to 'totalCount' in API response
  });

  test('B05 - Filter items by name', async ({ request }) => {
    const response = await request.get('/api/catalog/items?name=Alpine');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(0); // HEALED: 'data' renamed to 'items' in API response
    for (const item of body.items) { // HEALED: 'data' renamed to 'items' in API response
      expect(item.name.toLowerCase()).toMatch(/^alpine/i);
    }
  });

  test('B06 - Batch get items by IDs', async ({ request }) => {
    const response = await request.get('/api/catalog/items/by?ids=1&ids=2&ids=3');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBe(3);
    const ids = body.map((i: { id: number }) => i.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).toContain(3);
  });

  test('B07 - Batch get with non-existent IDs returns partial results', async ({ request }) => {
    const response = await request.get('/api/catalog/items/by?ids=1&ids=99999');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBe(1);
    expect(body[0].id).toBe(1);
  });

  test('B08 - Filter items by type and brand', async ({ request }) => {
    const response = await request.get('/api/catalog/items/type/1/brand/1');
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const item of body.data) {
      expect(item.catalogTypeId).toBe(1);
      expect(item.catalogBrandId).toBe(1);
    }
  });

  test('B09 - Filter items by type only', async ({ request }) => {
    const response = await request.get('/api/catalog/items/type/1/brand');
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const item of body.data) {
      expect(item.catalogTypeId).toBe(1);
    }
  });

  test('B10 - Get all catalog types', async ({ request }) => {
    const response = await request.get('/api/catalogtypes');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('type');
  });

  test('B11 - Get all catalog brands', async ({ request }) => {
    const response = await request.get('/api/catalogbrands');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('brand');
  });

  test('B12 - Semantic search returns relevant items', async ({ request }) => {
    const response = await request.get('/api/catalog/items/withsemanticrelevance/boot');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    // At least one result should contain "boot" in name or description
    const hasRelevant = body.data.some(
      (i: { name: string; description: string }) =>
        i.name.toLowerCase().includes('boot') || i.description.toLowerCase().includes('boot')
    );
    expect(hasRelevant).toBe(true);
  });
});
