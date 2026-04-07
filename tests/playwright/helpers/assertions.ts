import { expect, APIResponse } from '@playwright/test';

/**
 * Custom assertion helpers for eShop integration tests.
 * Provides reusable assertion patterns for common API response validations.
 */

/** Assert response has the expected HTTP status code */
export async function assertStatus(response: APIResponse, expectedStatus: number): Promise<void> {
  expect(response.status()).toBe(expectedStatus);
}

/** Assert response is 200 OK */
export async function assertOk(response: APIResponse): Promise<void> {
  assertStatus(response, 200);
}

/** Assert response is 201 Created */
export async function assertCreated(response: APIResponse): Promise<void> {
  assertStatus(response, 201);
}

/** Assert response is 204 No Content */
export async function assertNoContent(response: APIResponse): Promise<void> {
  assertStatus(response, 204);
}

/** Assert response is 400 Bad Request */
export async function assertBadRequest(response: APIResponse): Promise<void> {
  assertStatus(response, 400);
}

/** Assert response is 404 Not Found */
export async function assertNotFound(response: APIResponse): Promise<void> {
  assertStatus(response, 404);
}

/** Assert response body is a non-empty array */
export async function assertNonEmptyArray(response: APIResponse): Promise<unknown[]> {
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
  return body;
}

/** Assert response body is an empty array */
export async function assertEmptyArray(response: APIResponse): Promise<void> {
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBe(0);
}

/** Assert paginated response has expected structure */
export async function assertPaginatedResponse(
  response: APIResponse,
  expectedPageIndex: number = 0,
  expectedPageSize: number = 10
): Promise<{ pageIndex: number; pageSize: number; totalCount: number; items: unknown[] }> {
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('pageIndex');
  expect(body).toHaveProperty('pageSize');
  expect(body.pageIndex).toBe(expectedPageIndex);
  expect(body.pageSize).toBe(expectedPageSize);
  return body;
}

/** Assert catalog item has required properties */
export function assertCatalogItemShape(item: Record<string, unknown>): void {
  expect(item).toHaveProperty('id');
  expect(item).toHaveProperty('name');
  expect(item).toHaveProperty('price');
  expect(item).toHaveProperty('catalogTypeId');
  expect(item).toHaveProperty('catalogBrandId');
}

/** Assert order has required properties */
export function assertOrderShape(order: Record<string, unknown>): void {
  expect(order).toHaveProperty('orderNumber');
  expect(order).toHaveProperty('status');
  expect(order).toHaveProperty('total');
  expect(order).toHaveProperty('date');
}

/** Assert order summary has required properties */
export function assertOrderSummaryShape(summary: Record<string, unknown>): void {
  expect(summary).toHaveProperty('orderNumber');
  expect(summary).toHaveProperty('status');
  expect(summary).toHaveProperty('total');
}

/** Assert webhook subscription has required properties */
export function assertWebhookShape(webhook: Record<string, unknown>): void {
  expect(webhook).toHaveProperty('id');
  expect(webhook).toHaveProperty('destUrl');
  expect(webhook).toHaveProperty('type');
}

/** Assert basket has required properties */
export function assertBasketShape(basket: Record<string, unknown>): void {
  expect(basket).toHaveProperty('buyerId');
  expect(basket).toHaveProperty('items');
  expect(Array.isArray(basket.items)).toBe(true);
}
