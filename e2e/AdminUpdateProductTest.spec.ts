import { test, expect } from '@playwright/test';

test('Admin: Update an existing product via API', async ({ request }) => {
  const baseURL = 'http://localhost:5222';
  const apiVersion = '1.0';

  // Step 1: Get the current product data for item ID 1
  const getResponse = await request.get(`${baseURL}/api/catalog/items/1?api-version=${apiVersion}`);
  expect(getResponse.ok()).toBeTruthy();
  const originalProduct = await getResponse.json();
  expect(originalProduct.id).toBe(1);
  const originalName = originalProduct.name;
  const originalPrice = originalProduct.price;

  // Step 2: Update the product with new data
  const updatedName = `${originalName} - Updated`;
  const updatedPrice = originalPrice + 10;
  const updateResponse = await request.put(`${baseURL}/api/catalog/items?api-version=${apiVersion}`, {
    data: {
      id: originalProduct.id,
      name: updatedName,
      price: updatedPrice,
      description: originalProduct.description,
      pictureFileName: originalProduct.pictureFileName,
      catalogTypeId: originalProduct.catalogTypeId,
      catalogBrandId: originalProduct.catalogBrandId,
      availableStock: originalProduct.availableStock,
      restockThreshold: originalProduct.restockThreshold,
      maxStockThreshold: originalProduct.maxStockThreshold,
    },
  });
  expect(updateResponse.status()).toBe(201);

  // Step 3: Verify changes are reflected by fetching the product again
  const verifyResponse = await request.get(`${baseURL}/api/catalog/items/1?api-version=${apiVersion}`);
  expect(verifyResponse.ok()).toBeTruthy();
  const updatedProduct = await verifyResponse.json();
  expect(updatedProduct.name).toBe(updatedName);
  expect(updatedProduct.price).toBe(updatedPrice);

  // Step 4: Restore original product data to avoid side effects
  const restoreResponse = await request.put(`${baseURL}/api/catalog/items?api-version=${apiVersion}`, {
    data: {
      id: originalProduct.id,
      name: originalName,
      price: originalPrice,
      description: originalProduct.description,
      pictureFileName: originalProduct.pictureFileName,
      catalogTypeId: originalProduct.catalogTypeId,
      catalogBrandId: originalProduct.catalogBrandId,
      availableStock: originalProduct.availableStock,
      restockThreshold: originalProduct.restockThreshold,
      maxStockThreshold: originalProduct.maxStockThreshold,
    },
  });
  expect(restoreResponse.status()).toBe(201);
});

test('Admin: Update non-existent product returns 404', async ({ request }) => {
  const baseURL = 'http://localhost:5222';
  const apiVersion = '2.0';

  // Step 1: Attempt to update a product with a non-existent ID
  const updateResponse = await request.put(`${baseURL}/api/catalog/items/999999?api-version=${apiVersion}`, {
    data: {
      id: 999999,
      name: 'Non-existent Product',
      price: 50,
      description: 'This product does not exist',
      catalogTypeId: 1,
      catalogBrandId: 1,
    },
  });

  // Step 2: Verify 404 response
  expect(updateResponse.status()).toBe(404);
});
