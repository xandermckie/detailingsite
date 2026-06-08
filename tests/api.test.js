const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');
const crypto = require('crypto');

const TEST_DB = path.join(os.tmpdir(), `bookings-test-${Date.now()}.db`);
const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const ADMIN_API_KEY = crypto.randomBytes(16).toString('hex');

process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;
process.env.ADMIN_API_KEY = ADMIN_API_KEY;
process.env.DATABASE_PATH = TEST_DB;
process.env.NODE_ENV = 'test';
process.env.SITE_URL = 'http://localhost:3000';

function nextWeekendDate() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  if (day !== 0 && day !== 6) {
    d.setDate(d.getDate() + (6 - day));
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

const WEEKEND = nextWeekendDate();

function validBooking(overrides = {}) {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '(555) 123-4567',
    vehicle: '2020 Honda Civic',
    address: '123 Main St, City',
    service: 'mobile',
    date: WEEKEND,
    time: '8:00 AM',
    notes: '',
    privacyConsent: true,
    ...overrides
  };
}

let app;
let db;

beforeAll(async () => {
  const server = require('../server');
  app = server.app;
  db = server.db;
  await db.init();
});

afterAll(async () => {
  await db.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('Health', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Booking validation', () => {
  test('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects weekday date', async () => {
    const d = new Date();
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ date: `${y}-${m}-${dayNum}` }));
    expect(res.status).toBe(400);
  });

  test('rejects missing privacy consent', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ privacyConsent: false }));
    expect(res.status).toBe(400);
  });

  test('rejects pickup_dropoff without dropoff address', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ service: 'pickup_dropoff', time: '10:00 AM' }));
    expect(res.status).toBe(400);
  });
});

describe('Booking creation', () => {
  test('creates a valid booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ time: '8:00 AM', email: 'create1@example.com' }));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.bookingId).toBeDefined();
  });

  test('creates pickup_dropoff booking with dropoff address', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({
        service: 'pickup_dropoff',
        time: '12:00 PM',
        email: 'create2@example.com',
        dropoffAddress: '456 Oak Ave, City'
      }));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('Admin routes', () => {
  let bookingId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ time: '10:00 AM', email: 'admin-test@example.com' }));
    expect(res.status).toBe(201);
    bookingId = res.body.bookingId;
  });

  test('rejects admin list without API key', async () => {
    const now = new Date(WEEKEND + 'T12:00:00');
    const res = await request(app)
      .get(`/api/admin/bookings?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    expect(res.status).toBe(401);
  });

  test('rejects admin list with invalid API key', async () => {
    const now = new Date(WEEKEND + 'T12:00:00');
    const res = await request(app)
      .get(`/api/admin/bookings?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .set('X-API-Key', 'wrong-key');
    expect(res.status).toBe(401);
  });

  test('lists bookings with valid API key', async () => {
    const now = new Date(WEEKEND + 'T12:00:00');
    const res = await request(app)
      .get(`/api/admin/bookings?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .set('X-API-Key', ADMIN_API_KEY);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('updates booking status', async () => {
    const res = await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set('X-API-Key', ADMIN_API_KEY)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');
  });

  test('exports booking data', async () => {
    const res = await request(app)
      .get(`/api/admin/bookings/${bookingId}/export`)
      .set('X-API-Key', ADMIN_API_KEY);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin-test@example.com');
  });

  test('cancellation frees availability slot', async () => {
    const futureDate = new Date(WEEKEND + 'T12:00:00');
    futureDate.setDate(futureDate.getDate() + 7);
    const y = futureDate.getFullYear();
    const m = String(futureDate.getMonth() + 1).padStart(2, '0');
    const d = String(futureDate.getDate()).padStart(2, '0');
    const cancelDate = `${y}-${m}-${d}`;

    const booking = validBooking({
      date: cancelDate,
      time: '10:00 AM',
      email: 'cancel-test@example.com'
    });
    const createRes = await request(app).post('/api/bookings').send(booking);
    expect(createRes.status).toBe(201);
    const id = createRes.body.bookingId;

    await request(app)
      .patch(`/api/admin/bookings/${id}`)
      .set('X-API-Key', ADMIN_API_KEY)
      .send({ status: 'cancelled' });

    const availRes = await request(app)
      .get(`/api/availability?year=${futureDate.getFullYear()}&month=${futureDate.getMonth() + 1}`);
    const booked = availRes.body.booked[cancelDate] || [];
    expect(booked).not.toContain('10:00 AM');
  });
});
