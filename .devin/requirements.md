# Build Test Features - Requirements

## Goal
Build out missing test features for the eShop-demo integration test suite based on gaps identified in `INTEGRATION_TEST_PLAN.md`.

## What exists
- 76 Playwright integration tests across 7 categories (A-G)
- Express.js mock server replicating 4 microservice APIs
- CI workflow for integration tests
- `helpers/test-data.ts` with shared test data factories

## What needs to be built

### 1. Missing Helper Utilities
- `helpers/api-client.ts` — Reusable HTTP helper functions (referenced in plan but not implemented)
- `helpers/assertions.ts` — Custom assertion helpers (referenced in plan but not implemented)

### 2. Missing Test Cases (from INTEGRATION_TEST_PLAN.md G section)
The plan describes these test scenarios that aren't fully implemented:
- Cancel already cancelled order
- Ship cancelled order  
- Create item then delete then get → 404
- Special characters in catalog item name
- Duplicate order creation (idempotency check)
- Basket item with very high quantity
- Webhook creation with duplicate events
- Filter by brand only (all types)

### 3. Mock Server Enhancements
- Add missing test helper endpoints referenced in plan (`/_test/orders`, `/_test/events`, `/_test/baskets`)

### 4. Fix any failing tests
- Verify all tests pass against mock server
