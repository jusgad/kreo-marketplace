import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000/api';

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({
      user: {
        id: '1',
        email: data.email,
        role: 'customer',
      },
      message: 'Registro exitoso',
    });
  }),

  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({
      user: {
        id: '1',
        email: data.email,
        role: 'customer',
      },
      message: 'Login exitoso',
    });
  }),

  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json({
      id: '1',
      email: 'test@example.com',
      role: 'customer',
    });
  }),

  // Product endpoints
  http.get(`${API_BASE}/products`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    return HttpResponse.json({
      products: [
        {
          id: '1',
          title: 'Test Product 1',
          description: 'Test description',
          base_price: 29.99,
          images: ['/test-image.jpg'],
        },
        {
          id: '2',
          title: 'Test Product 2',
          description: 'Test description 2',
          base_price: 49.99,
          images: ['/test-image2.jpg'],
        },
      ],
      total: 2,
      page,
      limit,
      total_pages: 1,
    });
  }),

  http.get(`${API_BASE}/products/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Product',
      description: 'Test description',
      base_price: 29.99,
      stock_quantity: 100,
      images: ['/test-image.jpg'],
      vendor: {
        id: 'vendor-1',
        name: 'Test Vendor',
      },
    });
  }),

  // Cart endpoints
  http.get(`${API_BASE}/cart`, () => {
    return HttpResponse.json({
      items: [],
      total_items: 0,
      subtotal: 0,
    });
  }),

  http.post(`${API_BASE}/cart/items`, async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({
      id: '1',
      product_id: data.product_id,
      quantity: data.quantity,
      price_snapshot: 29.99,
    });
  }),

  // Order endpoints
  http.get(`${API_BASE}/orders`, () => {
    return HttpResponse.json([
      {
        id: '1',
        order_number: 'ORD-123',
        grand_total: 79.99,
        payment_status: 'paid',
        created_at: new Date().toISOString(),
      },
    ]);
  }),
];
