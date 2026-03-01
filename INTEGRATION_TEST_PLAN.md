# eShop Integration Test Plan

## Devin + Playwright Automation Testing Agent
**Document Version:** 1.0
**Date:** 27 February 2026
**Prepared for:** Client Demo — Integration Testing Phase
**Application:** eShop Reference Application (AdventureWorks)

---

## 1. Executive Summary

This integration test plan covers the **eShop** reference .NET application — a microservices-based e-commerce platform built with .NET Aspire. The plan targets **API-level integration testing** across all four backend services, validating request/response contracts, cross-service data flow, business logic, and error handling.

Since no live test environment is available, we will build **Express.js mock servers** that faithfully replicate each microservice's behaviour based on the actual C# source code, then execute **Playwright API tests** against them with full tracing enabled.

### Scope at a Glance

| Metric | Value |
|--------|-------|
| Services under test | 4 (Catalog API, Basket API, Ordering API, Webhooks API) |
| Total API endpoints | 21 |
| Planned test cases | 75+ |
| Test categories | 7 (see Section 5) |
| Estimated execution time | < 15 seconds |
| Mock server approach | Express.js per service, single process |

---

## 2. System Under Test — Architecture Overview

### 2.1 Microservices Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WebApp (Blazor)                          │
│                    http://localhost:5045                         │
│         Catalog browse | Basket | Checkout | Orders             │
└──────┬──────────┬──────────┬──────────┬─────────────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Catalog  │ │ Basket   │ │ Ordering │ │ Webhooks │
│   API    │ │   API    │ │   API    │ │   API    │
│ (REST)   │ │ (gRPC)   │ │ (REST)   │ │ (REST)   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
  PostgreSQL    Redis    PostgreSQL  PostgreSQL
  (catalogdb)           (orderingdb) (webhooksdb)
       └──────────┴──────────┴──────────┘
                     │
                 RabbitMQ
              (Event Bus)
```

### 2.2 Supporting Services

| Service | Role |
|---------|------|
| **Identity API** | OpenID Connect / OAuth 2.0 identity provider |
| **Order Processor** | Background worker — processes order events from RabbitMQ |
| **Payment Processor** | Background worker — simulates payment processing |
| **Mobile BFF** | YARP reverse proxy for mobile clients |
| **Webhook Client** | Blazor app for webhook subscription management |

### 2.3 Infrastructure Dependencies

| Component | Technology | Purpose |
|-----------|------------|---------|
| PostgreSQL (pgvector) | Database | Catalog, ordering, identity, webhooks data |
| Redis | Cache | Basket session storage |
| RabbitMQ | Message broker | Integration events between services |

---

## 3. API Endpoint Inventory

### 3.1 Catalog API (`/api/catalog`)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/catalog/items` | List catalog items (paginated) | No |
| 2 | GET | `/api/catalog/items/{id}` | Get item by ID | No |
| 3 | GET | `/api/catalog/items/by?ids=` | Batch get items by IDs | No |
| 4 | GET | `/api/catalog/items/by/{name}` | Get items by name (V1) | No |
| 5 | GET | `/api/catalog/items/{id}/pic` | Get item picture | No |
| 6 | GET | `/api/catalog/items/withsemanticrelevance/{text}` | Semantic search (V1) | No |
| 7 | GET | `/api/catalog/catalogtypes` | List catalog types | No |
| 8 | GET | `/api/catalog/catalogbrands` | List catalog brands | No |
| 9 | GET | `/api/catalog/items/type/{typeId}/brand/{brandId?}` | Filter by type & brand | No |
| 10 | GET | `/api/catalog/items/type/all/brand/{brandId?}` | Filter by brand only | No |
| 11 | POST | `/api/catalog/items` | Create catalog item | No |
| 12 | PUT | `/api/catalog/items` | Update item (V1) | No |
| 13 | PUT | `/api/catalog/items/{id}` | Update item (V2) | No |
| 14 | DELETE | `/api/catalog/items/{id}` | Delete catalog item | No |

**Data Models:**
- **CatalogItem**: `{ Id, Name, Description, Price, PictureFileName, CatalogTypeId, CatalogBrandId, AvailableStock, RestockThreshold, MaxStockThreshold, OnReorder }`
- **CatalogBrand**: `{ Id, Brand }`
- **CatalogType**: `{ Id, Type }`
- **PaginatedItems**: `{ PageIndex, PageSize, Count, Data[] }`

### 3.2 Ordering API (`/api/orders`)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 15 | GET | `/api/orders` | Get orders by user | Yes |
| 16 | GET | `/api/orders/{orderId}` | Get order by ID | Yes |
| 17 | GET | `/api/orders/cardtypes` | Get card types | Yes |
| 18 | POST | `/api/orders` | Create order | Yes (x-requestid) |
| 19 | POST | `/api/orders/draft` | Create order draft | Yes |
| 20 | PUT | `/api/orders/cancel` | Cancel order | Yes (x-requestid) |
| 21 | PUT | `/api/orders/ship` | Ship order | Yes (x-requestid) |

**Data Models:**
- **Order**: `{ OrderNumber, Date, Status, Description, Street, City, State, Zipcode, Country, OrderItems[], Total }`
- **OrderSummary**: `{ OrderNumber, Date, Status, Total }`
- **OrderItem**: `{ ProductName, Units, UnitPrice, PictureUrl }`
- **CardType**: `{ Id, Name }`
- **OrderStatus enum**: `Submitted | AwaitingValidation | StockConfirmed | Paid | Shipped | Cancelled`
- **CreateOrderRequest**: `{ UserId, UserName, City, Street, State, Country, ZipCode, CardNumber, CardHolderName, CardExpiration, CardSecurityNumber, CardTypeId, Buyer, Items[] }`

### 3.3 Basket API (gRPC → mocked as REST)

Since the Basket API uses gRPC, we will mock it as REST endpoints for testing:

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| — | GET | `/api/basket/{buyerId}` | Get basket for user | Yes |
| — | POST | `/api/basket` | Update basket | Yes |
| — | DELETE | `/api/basket/{buyerId}` | Delete basket | Yes |

**Data Models:**
- **CustomerBasket**: `{ BuyerId, Items[] }`
- **BasketItem**: `{ Id, ProductId, ProductName, UnitPrice, OldUnitPrice, Quantity, PictureUrl }`

### 3.4 Webhooks API (`/api/webhooks`)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| — | GET | `/api/webhooks` | List user subscriptions | Yes |
| — | GET | `/api/webhooks/{id}` | Get subscription by ID | Yes |
| — | POST | `/api/webhooks` | Create subscription | Yes |
| — | DELETE | `/api/webhooks/{id}` | Delete subscription | Yes |

---

## 4. Integration Test Strategy

### 4.1 Approach: Mock Server Integration Testing

```
┌──────────────────────────────────────────────┐
│         Playwright Test Runner               │
│         (npx playwright test)                │
│                                              │
│  ┌────────────┐  ┌────────────────────────┐  │
│  │ Spec Files │  │ Test Utilities         │  │
│  │ (*.spec.ts)│  │ (helpers, fixtures)    │  │
│  └─────┬──────┘  └────────────┬───────────┘  │
│        │                      │              │
│        ▼                      ▼              │
│  ┌─────────────────────────────────────────┐ │
│  │     HTTP Requests (APIRequestContext)   │ │
│  └─────────────────┬───────────────────────┘ │
└────────────────────┼─────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│       Express.js Mock Server (Port 3100)     │
│                                              │
│  ┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐  │
│  │Catalog │ │Ordering│ │Basket│ │Webhooks│  │
│  │Routes  │ │Routes  │ │Routes│ │Routes  │  │
│  └────────┘ └────────┘ └──────┘ └────────┘  │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │  In-Memory Data Store (seed data)       │ │
│  │  • 103 catalog items from catalog.json  │ │
│  │  • Baskets per user (Map)               │ │
│  │  • Orders with status tracking          │ │
│  │  • Webhook subscriptions                │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │  Test Helpers                           │ │
│  │  • /_test/reset — reset all state       │ │
│  │  • /_test/orders — inspect orders       │ │
│  │  • /_test/events — inspect event bus    │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 4.2 Why This Approach

| Factor | Decision |
|--------|----------|
| No live environment available | Mock servers replicate exact API contracts from C# source |
| Microservices architecture | Single mock server with separate route modules per service |
| gRPC (Basket API) | Mocked as REST — validates contract, not transport |
| Integration events (RabbitMQ) | Simulated in-memory — verifiable via test helpers |
| Seed data | Loaded from actual `catalog.json` (103 products) |
| Authentication | Simulated via `x-requestid` header and userId extraction |

### 4.3 Environment Configuration

```
# Against mock server (default — no config needed)
npm test

# Against live environment (future)
BASE_URL=https://eshop-sit.example.com npx playwright test
```

---

## 5. Test Categories & Coverage

### 5.1 Category Breakdown

| Category | Description | Test Count |
|----------|-------------|------------|
| **A. Catalog CRUD** | Full lifecycle: create, read, update, delete catalog items | 14 |
| **B. Catalog Query & Filtering** | Pagination, search by name/type/brand, batch get | 12 |
| **C. Basket Operations** | Add/update/get/delete basket items | 8 |
| **D. Order Lifecycle** | Create draft → create order → get → cancel/ship | 12 |
| **E. Cross-Service Integration** | Catalog → Basket → Order flow | 8 |
| **F. Webhook Management** | Subscribe, list, get, delete webhooks | 6 |
| **G. Error Handling & Edge Cases** | Validation failures, 404s, bad requests, boundary values | 15+ |

**Total: 75+ test cases**

---

### 5.2 Detailed Test Inventory

#### A. Catalog CRUD (14 tests)

| # | Test Name | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| A1 | Create a new catalog item | POST | `/api/catalog/items` | 201 Created |
| A2 | Create item — verify returned location header | POST | `/api/catalog/items` | Location: `/api/catalog/items/{id}` |
| A3 | Get item by ID — existing item | GET | `/api/catalog/items/1` | 200 + item data |
| A4 | Get item by ID — non-existent | GET | `/api/catalog/items/9999` | 404 Not Found |
| A5 | Get item by ID — invalid (zero) | GET | `/api/catalog/items/0` | 400 Bad Request |
| A6 | Get item by ID — invalid (negative) | GET | `/api/catalog/items/-1` | 400 Bad Request |
| A7 | Update existing item (V2) | PUT | `/api/catalog/items/1` | 201 Created |
| A8 | Update non-existent item | PUT | `/api/catalog/items/9999` | 404 Not Found |
| A9 | Update item (V1) — without ID in body | PUT | `/api/catalog/items` | 400 Bad Request |
| A10 | Delete existing item | DELETE | `/api/catalog/items/{id}` | 204 No Content |
| A11 | Delete non-existent item | DELETE | `/api/catalog/items/9999` | 404 Not Found |
| A12 | Create then retrieve — data consistency | POST+GET | Multiple | Match all fields |
| A13 | Update price — triggers integration event | PUT | `/api/catalog/items/{id}` | 201 + event emitted |
| A14 | Create item with minimum required fields | POST | `/api/catalog/items` | 201 Created |

#### B. Catalog Query & Filtering (12 tests)

| # | Test Name | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| B1 | List items — default pagination (page 0, size 10) | GET | `/api/catalog/items` | 200 + 10 items |
| B2 | List items — custom page size | GET | `/api/catalog/items?pageSize=5` | 200 + 5 items |
| B3 | List items — page 2 | GET | `/api/catalog/items?pageIndex=1` | 200 + next page |
| B4 | List items — verify total count | GET | `/api/catalog/items` | Count matches seed data |
| B5 | Get items by name — partial match | GET | `/api/catalog/items/by/Wanderer` | 200 + matching items |
| B6 | Get items by name — no match | GET | `/api/catalog/items/by/NonExistentXYZ` | 200 + empty |
| B7 | Batch get items by IDs | GET | `/api/catalog/items/by?ids=1&ids=2&ids=3` | 200 + 3 items |
| B8 | Filter by type and brand | GET | `/api/catalog/items/type/1/brand/1` | 200 + filtered |
| B9 | Filter by brand only | GET | `/api/catalog/items/type/all/brand/1` | 200 + filtered |
| B10 | List catalog types | GET | `/api/catalog/catalogtypes` | 200 + type list |
| B11 | List catalog brands | GET | `/api/catalog/catalogbrands` | 200 + brand list |
| B12 | Pagination boundary — beyond total pages | GET | `/api/catalog/items?pageIndex=999` | 200 + empty data |

#### C. Basket Operations (8 tests)

| # | Test Name | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| C1 | Get basket for new user — empty | GET | `/api/basket/user-1` | 200 + empty items |
| C2 | Add item to basket | POST | `/api/basket` | 200 + updated basket |
| C3 | Get basket after adding item | GET | `/api/basket/user-1` | 200 + 1 item |
| C4 | Update item quantity in basket | POST | `/api/basket` | 200 + updated qty |
| C5 | Add multiple items to basket | POST | `/api/basket` | 200 + multiple items |
| C6 | Delete basket | DELETE | `/api/basket/user-1` | 200 |
| C7 | Get basket after deletion — empty | GET | `/api/basket/user-1` | 200 + empty |
| C8 | Basket item validation — quantity < 1 | POST | `/api/basket` | 400 Bad Request |

#### D. Order Lifecycle (12 tests)

| # | Test Name | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| D1 | Create order draft from basket items | POST | `/api/orders/draft` | 200 + OrderDraftDTO |
| D2 | Create order draft — verify total calculation | POST | `/api/orders/draft` | Total = sum(price × qty) |
| D3 | Create order — valid request | POST | `/api/orders` | 200 OK |
| D4 | Create order — missing x-requestid | POST | `/api/orders` | 400 Bad Request |
| D5 | Create order — empty GUID x-requestid | POST | `/api/orders` | 400 "RequestId is missing" |
| D6 | Get order by ID — existing | GET | `/api/orders/1` | 200 + order details |
| D7 | Get order by ID — non-existent | GET | `/api/orders/9999` | 404 Not Found |
| D8 | Get orders by user | GET | `/api/orders` | 200 + order summaries |
| D9 | Get card types | GET | `/api/orders/cardtypes` | 200 + card type list |
| D10 | Cancel order — valid | PUT | `/api/orders/cancel` | 200 OK |
| D11 | Cancel order — empty x-requestid | PUT | `/api/orders/cancel` | 400 Bad Request |
| D12 | Ship order — valid | PUT | `/api/orders/ship` | 200 OK |

#### E. Cross-Service Integration Flows (8 tests)

| # | Test Name | Flow | Expected |
|---|-----------|------|----------|
| E1 | Browse catalog → add to basket → verify basket | Catalog GET → Basket POST → Basket GET | Item in basket matches catalog data |
| E2 | Add to basket → create order draft → verify totals | Basket POST → Order Draft POST | Draft total matches basket prices |
| E3 | Full checkout flow: catalog → basket → draft → order | 4-step flow | Order created successfully |
| E4 | Add multiple items → draft → verify all items in order | Multi-item flow | All items preserved |
| E5 | Update basket quantity → new draft → updated total | Basket update → Draft | Total reflects new quantities |
| E6 | Delete basket after order creation | Order POST → Basket DELETE → Basket GET | Basket empty, order persists |
| E7 | Cancel order → verify status change | Order POST → Cancel PUT → Order GET | Status = Cancelled |
| E8 | Ship order → verify status change | Order POST → Ship PUT → Order GET | Status = Shipped |

#### F. Webhook Management (6 tests)

| # | Test Name | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| F1 | Create webhook subscription | POST | `/api/webhooks` | 201 Created |
| F2 | List subscriptions for user | GET | `/api/webhooks` | 200 + subscription list |
| F3 | Get subscription by ID | GET | `/api/webhooks/1` | 200 + subscription |
| F4 | Get subscription — non-existent | GET | `/api/webhooks/9999` | 404 Not Found |
| F5 | Delete subscription | DELETE | `/api/webhooks/1` | 202 Accepted |
| F6 | Delete subscription — non-existent | DELETE | `/api/webhooks/9999` | 404 Not Found |

#### G. Error Handling & Edge Cases (15+ tests)

| # | Test Name | Scenario | Expected |
|---|-----------|----------|----------|
| G1 | Unknown endpoint | GET `/api/unknown` | 404 |
| G2 | Wrong HTTP method on catalog items | DELETE `/api/catalog/items` (no ID) | 404/405 |
| G3 | Malformed JSON body | POST `/api/catalog/items` with invalid JSON | 400 |
| G4 | Empty body on create item | POST `/api/catalog/items` with `{}` | 400 (Name required) |
| G5 | Negative price on create item | POST `/api/catalog/items` | Accepted (no validation in source) |
| G6 | Very large page size | GET `/api/catalog/items?pageSize=10000` | 200 (returns all) |
| G7 | Duplicate order creation (idempotency) | POST `/api/orders` same x-requestid twice | Second should be idempotent |
| G8 | Cancel already cancelled order | PUT `/api/orders/cancel` | 500 or error |
| G9 | Ship cancelled order | PUT `/api/orders/ship` on cancelled order | 500 or error |
| G10 | Order with empty items list | POST `/api/orders/draft` with `[]` items | 200 + empty draft |
| G11 | Credit card number masking verification | POST `/api/orders` | Last 4 digits preserved, rest masked |
| G12 | Concurrent basket updates | Two POST `/api/basket` simultaneously | Last write wins |
| G13 | Create item then delete then get | POST → DELETE → GET | 404 after delete |
| G14 | Webhook with invalid grant URL | POST `/api/webhooks` | 400 Bad Request |
| G15 | Special characters in catalog item name | POST `/api/catalog/items` | Handled correctly |

---

## 6. Test File Structure

```
tests/
├── playwright/
│   ├── playwright.config.ts           # Config with BASE_URL support + mock server auto-start
│   ├── package.json                   # Dependencies
│   ├── tsconfig.json                  # TypeScript config
│   ├── helpers/
│   │   ├── api-client.ts             # Reusable HTTP helpers (get, post, put, delete)
│   │   ├── test-data.ts              # Shared test data factories
│   │   └── assertions.ts            # Custom assertion helpers
│   └── specs/
│       ├── catalog/
│       │   ├── catalog-crud.spec.ts           # A1–A14
│       │   └── catalog-query.spec.ts          # B1–B12
│       ├── basket/
│       │   └── basket-operations.spec.ts      # C1–C8
│       ├── ordering/
│       │   └── order-lifecycle.spec.ts        # D1–D12
│       ├── integration/
│       │   └── cross-service-flows.spec.ts    # E1–E8
│       ├── webhooks/
│       │   └── webhook-management.spec.ts     # F1–F6
│       └── edge-cases/
│           └── error-handling.spec.ts         # G1–G15
├── mock-server/
│   ├── server.js                     # Main Express app
│   ├── routes/
│   │   ├── catalog.js                # Catalog API routes
│   │   ├── ordering.js               # Ordering API routes
│   │   ├── basket.js                 # Basket API routes (REST mock of gRPC)
│   │   └── webhooks.js               # Webhooks API routes
│   ├── data/
│   │   └── catalog-seed.json         # Copy of catalog.json (103 items)
│   └── helpers/
│       ├── store.js                  # In-memory data store
│       └── events.js                 # Integration event simulation
└── reports/                          # Generated after test run
    ├── INTEGRATION_TEST_REPORT.md
    └── screenshots/
```

---

## 7. Mock Server Design

### 7.1 Data Store

The mock server maintains in-memory state seeded from `catalog.json`:

```javascript
// store.js
module.exports = {
  catalogItems: [],       // Seeded from catalog.json (103 items)
  catalogTypes: [],       // Extracted from catalog.json
  catalogBrands: [],      // Extracted from catalog.json
  baskets: new Map(),     // userId → { buyerId, items[] }
  orders: [],             // Order objects with status tracking
  webhookSubscriptions: [],
  integrationEvents: [],  // Simulated event bus
  cardTypes: [
    { id: 1, name: 'Amex' },
    { id: 2, name: 'Visa' },
    { id: 3, name: 'MasterCard' },
  ],
};
```

### 7.2 Key Behaviours Replicated from Source Code

| Behaviour | Source (.cs file) | Mock Implementation |
|-----------|-------------------|---------------------|
| Item ID validation (> 0) | `CatalogApi.cs:176` | `if (id <= 0) return 400` |
| Pagination defaults | `PaginationRequest.cs` | PageSize=10, PageIndex=0 |
| Name search — StartsWith | `CatalogApi.cs:138` | `filter(item => item.name.startsWith(name))` |
| Exchange default "amq.fanout" | N/A (from previous repo) | Not applicable here |
| Order requestId validation | `OrdersApi.cs:27,56,132` | `if (requestId === empty GUID) return 400` |
| Credit card masking | `OrdersApi.cs:140` | Last 4 digits preserved |
| Order status transitions | `OrderStatus.cs` | Submitted → Paid → Shipped / Cancelled |
| BasketItem quantity validation | `BasketItem.cs:17` | `if (quantity < 1) return 400` |
| Webhook grant URL validation | `WebHooksApi.cs:41` | Simulated grant check |

### 7.3 Test Helper Endpoints

| Endpoint | Purpose |
|----------|---------|
| `DELETE /_test/reset` | Reset all in-memory state to seed data |
| `GET /_test/orders` | Inspect all orders (bypass auth) |
| `GET /_test/events` | Inspect integration events emitted |
| `GET /_test/baskets` | Inspect all baskets (bypass auth) |

---

## 8. Execution Plan

### 8.1 Pre-Execution

1. Install dependencies: `cd tests/playwright && npm install`
2. Mock server starts automatically via Playwright config `webServer` option
3. Seed data loaded from `catalog.json` on startup

### 8.2 Test Execution Commands

```bash
# Full suite with tracing
npx playwright test --trace on

# Specific category
npx playwright test specs/catalog/ --trace on
npx playwright test specs/ordering/ --trace on
npx playwright test specs/integration/ --trace on

# Single test file
npx playwright test specs/catalog/catalog-crud.spec.ts --trace on

# Against live environment (future)
BASE_URL=https://eshop-sit.example.com npx playwright test --trace on
```

### 8.3 Post-Execution Deliverables

| Deliverable | Location |
|-------------|----------|
| Playwright HTML Report | `playwright-report/index.html` |
| Trace files (per test) | `test-results/*/trace.zip` |
| Markdown Report | `reports/INTEGRATION_TEST_REPORT.md` |
| Screenshots | `reports/screenshots/*.png` |

---

## 9. Traceability Matrix

### Service → Test Mapping

| Service | Source File | Endpoints | Tests | Coverage |
|---------|------------|-----------|-------|----------|
| Catalog API | `CatalogApi.cs` | 14 | A1–A14, B1–B12 (26) | 100% endpoints |
| Ordering API | `OrdersApi.cs` | 7 | D1–D12 (12) | 100% endpoints |
| Basket API | `BasketService.cs` | 3 | C1–C8 (8) | 100% operations |
| Webhooks API | `WebHooksApi.cs` | 4 | F1–F6 (6) | 100% endpoints |
| Cross-service | Multiple | N/A | E1–E8 (8) | Key user journeys |
| Error handling | Multiple | N/A | G1–G15 (15) | Boundary + edge |

### Business Flow → Test Mapping

| Business Flow | Tests |
|---------------|-------|
| Customer browses catalog | B1, B5, B8, B9 |
| Customer adds item to basket | C2, C3, C5 |
| Customer updates basket | C4, C5 |
| Customer checks out | E3 (full flow) |
| Customer views orders | D6, D8 |
| Order gets cancelled | D10, E7 |
| Order gets shipped | D12, E8 |
| Admin creates product | A1, A2, A12 |
| Admin updates product | A7, A13 |
| Admin deletes product | A10, A11, G13 |
| Webhook lifecycle | F1–F6 |

---

## 10. Environment Progression Strategy

This test suite is designed to run across multiple environments by simply changing `BASE_URL`:

| Phase | Environment | BASE_URL | Test Scope | Gate |
|-------|------------|----------|------------|------|
| **Dev** | Mock server | `localhost:3100` | All 75+ tests | All pass |
| **SIT** | SIT env | `sit-eshop.example.com` | Smoke + API contracts (A, B, D) | 100% pass |
| **Regression** | QA env | `qa-eshop.example.com` | Full suite including edge cases | 100% pass |
| **UAT** | UAT env | `uat-eshop.example.com` | Business flows (E) + CRUD (A, C, D) | 100% pass |
| **Production** | Prod env | `eshop.example.com` | Smoke only (A3, B1, B10, D9) | 100% pass |

---

## 11. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mock server behaviour diverges from real API | Tests pass against mock but fail in real env | Mock logic is derived line-by-line from C# source |
| gRPC Basket API can't be tested via REST mock | Missing transport-layer issues | Note in results; test contract, not transport |
| No authentication testing possible | Auth-related bugs missed | Tests include auth header simulation; real auth tested in SIT |
| Seed data changes in future versions | Tests may break | Seed data loaded dynamically from `catalog.json` |
| Integration events can't be verified against real RabbitMQ | Event bus issues missed | Mock captures events; real event testing deferred to SIT |

---

## 12. Success Criteria

| Criteria | Target |
|----------|--------|
| All tests pass against mock server | 100% (75/75+) |
| Every API endpoint has at least one test | 100% coverage |
| Cross-service flows validate data consistency | All 8 flows pass |
| Error handling covers key failure modes | 15+ edge cases |
| Traces generated for every test | 75+ trace.zip files |
| HTML report accessible and complete | Yes |
| Test execution time | < 15 seconds |
| Tests portable to live environment via BASE_URL | Yes |

---

## 13. Timeline

| Step | Action | Est. Time |
|------|--------|-----------|
| 1 | Create mock server with all 4 service routes | 15 min |
| 2 | Seed data from catalog.json | 5 min |
| 3 | Create Playwright config + helpers | 5 min |
| 4 | Write test specs (7 files, 75+ tests) | 30 min |
| 5 | Run full suite with tracing | 1 min |
| 6 | Generate reports with screenshots | 10 min |
| 7 | Package and deliver | 5 min |
| **Total** | | **~70 min** |

---

## 14. Approval

This plan covers 75+ integration test cases across all 4 microservices of the eShop application. Tests are organized by service and category, with cross-service integration flows validating the end-to-end checkout journey.

**Awaiting approval to proceed with implementation.**

---

*Prepared by: Devin (Playwright Automation Testing Agent)*
*Repository: https://github.com/krantikdas/eShop-demo.git*
