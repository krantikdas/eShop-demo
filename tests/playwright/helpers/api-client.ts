import { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Reusable HTTP helper functions for eShop integration tests.
 * Wraps Playwright's APIRequestContext with convenient methods
 * and consistent header handling.
 */

export interface RequestOptions {
  data?: Record<string, unknown>;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

/** GET request with optional query parameters */
export async function get(
  request: APIRequestContext,
  path: string,
  options: RequestOptions = {}
): Promise<APIResponse> {
  return request.get(path, {
    headers: options.headers,
    params: options.params,
  });
}

/** POST request with JSON body */
export async function post(
  request: APIRequestContext,
  path: string,
  options: RequestOptions = {}
): Promise<APIResponse> {
  return request.post(path, {
    data: options.data,
    headers: options.headers,
  });
}

/** PUT request with JSON body */
export async function put(
  request: APIRequestContext,
  path: string,
  options: RequestOptions = {}
): Promise<APIResponse> {
  return request.put(path, {
    data: options.data,
    headers: options.headers,
  });
}

/** DELETE request */
export async function del(
  request: APIRequestContext,
  path: string,
  options: RequestOptions = {}
): Promise<APIResponse> {
  return request.delete(path, {
    headers: options.headers,
  });
}

/** POST request with a generated x-requestid header (for order operations) */
export async function postWithRequestId(
  request: APIRequestContext,
  path: string,
  data: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
): Promise<APIResponse> {
  return request.post(path, {
    data,
    headers: {
      'x-requestid': crypto.randomUUID(),
      ...extraHeaders,
    },
  });
}

/** PUT request with a generated x-requestid header (for order operations) */
export async function putWithRequestId(
  request: APIRequestContext,
  path: string,
  data: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
): Promise<APIResponse> {
  return request.put(path, {
    data,
    headers: {
      'x-requestid': crypto.randomUUID(),
      ...extraHeaders,
    },
  });
}

/** Parse JSON response body, returning typed result */
export async function parseJson<T = Record<string, unknown>>(
  response: APIResponse
): Promise<T> {
  return response.json() as Promise<T>;
}
