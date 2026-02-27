const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// ─── In-Memory Data Stores ─────────────────────────────────────────────────────

// Load catalog seed data
const catalogSeed = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'catalog-seed.json'), 'utf-8')
);

// Catalog types and brands extracted from seed data
const catalogTypes = [...new Set(catalogSeed.map(i => i.Type))].map((name, idx) => ({ id: idx + 1, type: name }));
const catalogBrands = [...new Set(catalogSeed.map(i => i.Brand))].map((name, idx) => ({ id: idx + 1, brand: name }));

// Build catalog items with proper IDs
let nextCatalogId = 1;
let catalogItems = catalogSeed.map(item => {
  const typeObj = catalogTypes.find(t => t.type === item.Type);
  const brandObj = catalogBrands.find(b => b.brand === item.Brand);
  return {
    id: nextCatalogId++,
    name: item.Name,
    description: item.Description,
    price: item.Price,
    pictureFileName: `${nextCatalogId - 1}.webp`,
    catalogTypeId: typeObj ? typeObj.id : 1,
    catalogBrandId: brandObj ? brandObj.id : 1,
    catalogType: typeObj || null,
    catalogBrand: brandObj || null,
    availableStock: 100,
    restockThreshold: 10,
    maxStockThreshold: 200,
    onReorder: false,
  };
});

// Baskets store: { [buyerId]: { buyerId, items: [...] } }
let baskets = {};

// Orders store
let nextOrderId = 1;
let orders = [];

// Order card types
const cardTypes = [
  { id: 1, name: 'Amex' },
  { id: 2, name: 'Visa' },
  { id: 3, name: 'MasterCard' },
];

// Webhooks store
let nextWebhookId = 1;
let webhookSubscriptions = [];

// ─── Auth Simulation ────────────────────────────────────────────────────────────

function getUserId(req) {
  return req.headers['x-user-id'] || 'test-user-1';
}

function getRequestId(req) {
  return req.headers['x-requestid'] || '';
}

// ─── CATALOG API (/api/catalog) ─────────────────────────────────────────────────

// GET /api/catalog/items - Paginated list (v1 and v2)
app.get('/api/catalog/items', (req, res) => {
  const pageSize = parseInt(req.query.pageSize) || 10;
  const pageIndex = parseInt(req.query.pageIndex) || 0;
  const name = req.query.name || null;
  const type = req.query.type ? parseInt(req.query.type) : null;
  const brand = req.query.brand ? parseInt(req.query.brand) : null;

  let filtered = [...catalogItems];
  if (name) {
    filtered = filtered.filter(i => i.name.toLowerCase().startsWith(name.toLowerCase()));
  }
  if (type) {
    filtered = filtered.filter(i => i.catalogTypeId === type);
  }
  if (brand) {
    filtered = filtered.filter(i => i.catalogBrandId === brand);
  }

  // Sort by name to match the .NET implementation
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const totalItems = filtered.length;
  const data = filtered.slice(pageSize * pageIndex, pageSize * pageIndex + pageSize);

  // BREAKING CHANGE: renamed 'count' -> 'totalCount' and 'data' -> 'items' (API v2 refactor)
  res.json({ pageIndex, pageSize, totalCount: totalItems, items: data });
});

// GET /api/catalog/items/by?ids=1&ids=2 - Batch get
app.get('/api/catalog/items/by', (req, res) => {
  let ids = req.query.ids;
  if (!ids) return res.json([]);
  if (!Array.isArray(ids)) ids = [ids];
  ids = ids.map(Number);
  const items = catalogItems.filter(i => ids.includes(i.id));
  res.json(items);
});

// GET /api/catalog/items/:id - Get single item
app.get('/api/catalog/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (id <= 0) {
    return res.status(400).json({ detail: 'Id is not valid' });
  }
  const item = catalogItems.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({});
  }
  res.json(item);
});

// GET /api/catalog/items/by/:name - Get items by name (v1)
app.get('/api/catalog/items/by/:name', (req, res) => {
  const name = req.params.name;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const pageIndex = parseInt(req.query.pageIndex) || 0;

  let filtered = catalogItems.filter(i => i.name.toLowerCase().startsWith(name.toLowerCase()));
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const totalItems = filtered.length;
  const data = filtered.slice(pageSize * pageIndex, pageSize * pageIndex + pageSize);

  // BREAKING CHANGE: renamed fields
  res.json({ pageIndex, pageSize, totalCount: totalItems, items: data });
});

// GET /api/catalog/items/withsemanticrelevance/:text - Semantic search (mocked as name search)
app.get('/api/catalog/items/withsemanticrelevance/:text', (req, res) => {
  const text = req.params.text;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const pageIndex = parseInt(req.query.pageIndex) || 0;

  // Mock semantic search: filter by name containing text
  let filtered = catalogItems.filter(i =>
    i.name.toLowerCase().includes(text.toLowerCase()) ||
    i.description.toLowerCase().includes(text.toLowerCase())
  );
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const totalItems = filtered.length;
  const data = filtered.slice(pageSize * pageIndex, pageSize * pageIndex + pageSize);

  // BREAKING CHANGE: renamed fields
  res.json({ pageIndex, pageSize, totalCount: totalItems, items: data });
});

// GET /api/catalog/items/withsemanticrelevance?text=... (v2)
app.get('/api/catalog/items/withsemanticrelevance', (req, res) => {
  const text = req.query.text || '';
  const pageSize = parseInt(req.query.pageSize) || 10;
  const pageIndex = parseInt(req.query.pageIndex) || 0;

  if (!text) {
    return res.status(400).json({ detail: 'Text is required' });
  }

  let filtered = catalogItems.filter(i =>
    i.name.toLowerCase().includes(text.toLowerCase()) ||
    i.description.toLowerCase().includes(text.toLowerCase())
  );
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const totalItems = filtered.length;
  const data = filtered.slice(pageSize * pageIndex, pageSize * pageIndex + pageSize);

  // BREAKING CHANGE: renamed fields
  res.json({ pageIndex, pageSize, totalCount: totalItems, items: data });
});

// GET /api/catalog/items/type/:typeId/brand/:brandId? - Filter by type and brand
app.get('/api/catalog/items/type/:typeId/brand/:brandId?', (req, res) => {
  const typeId = parseInt(req.params.typeId);
  const brandId = req.params.brandId ? parseInt(req.params.brandId) : null;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const pageIndex = parseInt(req.query.pageIndex) || 0;

  let filtered = catalogItems.filter(i => i.catalogTypeId === typeId);
  if (brandId) {
    filtered = filtered.filter(i => i.catalogBrandId === brandId);
  }
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const totalItems = filtered.length;
  const data = filtered.slice(pageSize * pageIndex, pageSize * pageIndex + pageSize);

  // BREAKING CHANGE: renamed fields
  res.json({ pageIndex, pageSize, totalCount: totalItems, items: data });
});

// GET /api/catalog/items/type/all/brand/:brandId? - Filter by brand only
app.get('/api/catalog/items/type/all/brand/:brandId?', (req, res) => {
  const brandId = req.params.brandId ? parseInt(req.params.brandId) : null;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const pageIndex = parseInt(req.query.pageIndex) || 0;

  let filtered = brandId
    ? catalogItems.filter(i => i.catalogBrandId === brandId)
    : [...catalogItems];
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const totalItems = filtered.length;
  const data = filtered.slice(pageSize * pageIndex, pageSize * pageIndex + pageSize);

  // BREAKING CHANGE: renamed fields
  res.json({ pageIndex, pageSize, totalCount: totalItems, items: data });
});

// GET /api/catalogtypes
app.get('/api/catalogtypes', (_req, res) => {
  const sorted = [...catalogTypes].sort((a, b) => a.type.localeCompare(b.type));
  res.json(sorted);
});

// GET /api/catalogbrands
app.get('/api/catalogbrands', (_req, res) => {
  const sorted = [...catalogBrands].sort((a, b) => a.brand.localeCompare(b.brand));
  res.json(sorted);
});

// POST /api/catalog/items - Create item
app.post('/api/catalog/items', (req, res) => {
  const body = req.body;
  const newItem = {
    id: nextCatalogId++,
    name: body.name || '',
    description: body.description || '',
    price: body.price || 0,
    pictureFileName: body.pictureFileName || null,
    catalogTypeId: body.catalogTypeId || 1,
    catalogBrandId: body.catalogBrandId || 1,
    catalogType: catalogTypes.find(t => t.id === (body.catalogTypeId || 1)) || null,
    catalogBrand: catalogBrands.find(b => b.id === (body.catalogBrandId || 1)) || null,
    availableStock: body.availableStock || 0,
    restockThreshold: body.restockThreshold || 0,
    maxStockThreshold: body.maxStockThreshold || 0,
    onReorder: body.onReorder || false,
  };
  catalogItems.push(newItem);
  res.status(201).location(`/api/catalog/items/${newItem.id}`).json(newItem);
});

// PUT /api/catalog/items - Update item (v1, id in body)
app.put('/api/catalog/items', (req, res) => {
  const body = req.body;
  if (!body.id) {
    return res.status(400).json({ detail: 'Item id must be provided in the request body.' });
  }
  const idx = catalogItems.findIndex(i => i.id === body.id);
  if (idx === -1) {
    return res.status(404).json({ detail: `Item with id ${body.id} not found.` });
  }
  catalogItems[idx] = { ...catalogItems[idx], ...body };
  res.status(201).location(`/api/catalog/items/${body.id}`).send();
});

// PUT /api/catalog/items/:id - Update item (v2, id in URL)
app.put('/api/catalog/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const body = req.body;
  const idx = catalogItems.findIndex(i => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ detail: `Item with id ${id} not found.` });
  }
  catalogItems[idx] = { ...catalogItems[idx], ...body, id };
  res.status(201).location(`/api/catalog/items/${id}`).send();
});

// DELETE /api/catalog/items/:id
// BREAKING CHANGE: now returns 200 with deleted item instead of 204 No Content
app.delete('/api/catalog/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = catalogItems.findIndex(i => i.id === id);
  if (idx === -1) {
    return res.status(404).json({});
  }
  const deleted = catalogItems.splice(idx, 1)[0];
  res.status(200).json({ deleted: true, item: deleted });
});

// ─── BASKET API (/api/basket) - mocked REST for gRPC ────────────────────────────

// GET /api/basket/:buyerId
app.get('/api/basket/:buyerId', (req, res) => {
  const buyerId = req.params.buyerId;
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ detail: 'The caller is not authenticated.' });
  }

  const basket = baskets[buyerId];
  if (!basket) {
    // Return empty basket (matches gRPC behavior)
    return res.json({ items: [] });
  }
  res.json(basket);
});

// POST /api/basket - Update basket
app.post('/api/basket', (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ detail: 'The caller is not authenticated.' });
  }

  const body = req.body;
  const buyerId = body.buyerId || userId;
  const basket = {
    buyerId,
    items: (body.items || []).map((item, idx) => ({
      id: item.id || idx + 1,
      productId: item.productId,
      productName: item.productName || '',
      unitPrice: item.unitPrice || 0,
      oldUnitPrice: item.oldUnitPrice || 0,
      quantity: item.quantity || 1,
      pictureUrl: item.pictureUrl || '',
    })),
  };

  baskets[buyerId] = basket;
  res.json(basket);
});

// DELETE /api/basket/:buyerId
app.delete('/api/basket/:buyerId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ detail: 'The caller is not authenticated.' });
  }

  const buyerId = req.params.buyerId;
  delete baskets[buyerId];
  res.status(200).json({});
});

// ─── ORDERING API (/api/orders) ─────────────────────────────────────────────────

// GET /api/orders - Get orders for current user
app.get('/api/orders', (req, res) => {
  const userId = getUserId(req);
  const userOrders = orders.filter(o => o.userId === userId);
  const summaries = userOrders.map(o => ({
    orderNumber: o.orderNumber,
    date: o.date,
    status: o.status,
    total: o.total,
  }));
  res.json(summaries);
});

// GET /api/orders/cardtypes
app.get('/api/orders/cardtypes', (_req, res) => {
  res.json(cardTypes);
});

// GET /api/orders/:orderId
app.get('/api/orders/:orderId', (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const order = orders.find(o => o.orderNumber === orderId);
  if (!order) {
    return res.status(404).json({});
  }
  res.json(order);
});

// POST /api/orders/draft - Create order draft
app.post('/api/orders/draft', (req, res) => {
  const body = req.body;
  const items = (body.items || []).map(item => ({
    productId: item.productId,
    productName: item.productName || '',
    unitPrice: item.unitPrice || 0,
    discount: 0,
    units: item.quantity || item.units || 1,
    pictureUrl: item.pictureUrl || '',
  }));

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.units, 0);

  res.json({
    orderItems: items,
    total,
  });
});

// POST /api/orders - Create order
app.post('/api/orders', (req, res) => {
  const requestId = getRequestId(req);
  if (!requestId) {
    return res.status(400).json('RequestId is missing.');
  }

  const body = req.body;
  const userId = getUserId(req);

  const orderItems = (body.items || []).map(item => ({
    productId: item.productId,
    productName: item.productName || '',
    unitPrice: item.unitPrice || 0,
    discount: 0,
    units: item.quantity || item.units || 1,
    pictureUrl: item.pictureUrl || '',
  }));

  const total = orderItems.reduce((sum, item) => sum + item.unitPrice * item.units, 0);

  const order = {
    orderNumber: nextOrderId++,
    date: new Date().toISOString(),
    status: 'submitted',
    description: '',
    street: body.street || '',
    city: body.city || '',
    state: body.state || '',
    zipCode: body.zipCode || '',
    country: body.country || '',
    orderItems,
    total,
    userId: body.userId || userId,
    userName: body.userName || '',
    cardNumber: body.cardNumber ? 'X'.repeat(body.cardNumber.length - 4) + body.cardNumber.slice(-4) : '',
    cardHolderName: body.cardHolderName || '',
    cardExpiration: body.cardExpiration || '',
    cardSecurityNumber: body.cardSecurityNumber || '',
    cardTypeId: body.cardTypeId || 1,
  };

  orders.push(order);
  res.status(200).json({});
});

// PUT /api/orders/cancel
app.put('/api/orders/cancel', (req, res) => {
  const requestId = getRequestId(req);
  if (!requestId) {
    return res.status(400).json('Empty GUID is not valid for request ID');
  }

  const body = req.body;
  const order = orders.find(o => o.orderNumber === body.orderNumber);
  if (!order) {
    return res.status(500).json({ detail: 'Cancel order failed to process.' });
  }

  order.status = 'cancelled';
  res.status(200).json({});
});

// PUT /api/orders/ship
app.put('/api/orders/ship', (req, res) => {
  const requestId = getRequestId(req);
  if (!requestId) {
    return res.status(400).json('Empty GUID is not valid for request ID');
  }

  const body = req.body;
  const order = orders.find(o => o.orderNumber === body.orderNumber);
  if (!order) {
    return res.status(500).json({ detail: 'Ship order failed to process.' });
  }

  order.status = 'shipped';
  res.status(200).json({});
});

// ─── WEBHOOKS API (/api/webhooks) ───────────────────────────────────────────────

// GET /api/webhooks
app.get('/api/webhooks', (req, res) => {
  const userId = getUserId(req);
  const subs = webhookSubscriptions.filter(s => s.userId === userId);
  res.json(subs);
});

// GET /api/webhooks/:id
app.get('/api/webhooks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userId = getUserId(req);
  const sub = webhookSubscriptions.find(s => s.id === id && s.userId === userId);
  if (!sub) {
    return res.status(404).json(`Subscriptions ${id} not found`);
  }
  res.json(sub);
});

// POST /api/webhooks
app.post('/api/webhooks', (req, res) => {
  const body = req.body;
  const userId = getUserId(req);

  if (!body.url || !body.grantUrl || !body.event) {
    return res.status(400).json('Invalid webhook subscription request');
  }

  const subscription = {
    id: nextWebhookId++,
    date: new Date().toISOString(),
    destUrl: body.url,
    token: body.token || '',
    type: body.event,
    userId,
  };

  webhookSubscriptions.push(subscription);
  res.status(201).location(`/api/webhooks/${subscription.id}`).json(subscription);
});

// DELETE /api/webhooks/:id
app.delete('/api/webhooks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userId = getUserId(req);
  const idx = webhookSubscriptions.findIndex(s => s.id === id && s.userId === userId);
  if (idx === -1) {
    return res.status(404).json(`Subscriptions ${id} not found`);
  }
  webhookSubscriptions.splice(idx, 1);
  res.status(202).json({});
});

// ─── Test Helpers ───────────────────────────────────────────────────────────────

// Reset all data stores (useful between tests)
app.post('/_test/reset', (_req, res) => {
  // Reload catalog
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'catalog-seed.json'), 'utf-8'));
  nextCatalogId = 1;
  catalogItems = seed.map(item => {
    const typeObj = catalogTypes.find(t => t.type === item.Type);
    const brandObj = catalogBrands.find(b => b.brand === item.Brand);
    return {
      id: nextCatalogId++,
      name: item.Name,
      description: item.Description,
      price: item.Price,
      pictureFileName: `${nextCatalogId - 1}.webp`,
      catalogTypeId: typeObj ? typeObj.id : 1,
      catalogBrandId: brandObj ? brandObj.id : 1,
      catalogType: typeObj || null,
      catalogBrand: brandObj || null,
      availableStock: 100,
      restockThreshold: 10,
      maxStockThreshold: 200,
      onReorder: false,
    };
  });

  baskets = {};
  nextOrderId = 1;
  orders = [];
  nextWebhookId = 1;
  webhookSubscriptions = [];

  res.json({ status: 'reset' });
});

// Health check
app.get('/_test/health', (_req, res) => {
  res.json({ status: 'ok', services: ['catalog', 'basket', 'ordering', 'webhooks'] });
});

// Get counts for verification
app.get('/_test/counts', (_req, res) => {
  res.json({
    catalogItems: catalogItems.length,
    baskets: Object.keys(baskets).length,
    orders: orders.length,
    webhookSubscriptions: webhookSubscriptions.length,
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────────

const PORT = process.env.MOCK_PORT || 5045;
const server = app.listen(PORT, () => {
  console.log(`eShop Mock Server running on http://localhost:${PORT}`);
  console.log(`Loaded ${catalogItems.length} catalog items, ${catalogTypes.length} types, ${catalogBrands.length} brands`);
});

module.exports = { app, server };
