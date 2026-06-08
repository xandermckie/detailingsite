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

const { isBookableDay } = require('../src/bookingRules');

function nextBookableDate() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${dayNum}`;
    if (isBookableDay(iso)) return iso;
    d.setDate(d.getDate() + 1);
  }
  throw new Error('No bookable date found within 14 days');
}

const BOOKABLE_DATE = nextBookableDate();

function validBooking(overrides = {}) {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '(555) 123-4567',
    vehicle: '2020 Honda Civic',
    address: '123 Main St, City',
    service: 'mobile',
    date: BOOKABLE_DATE,
    time: '9:00 AM',
    notes: '',
    privacyConsent: true,
    ...overrides
  };
}

let app;
let db;

beforeAll(async () => {
  const server = require('../server');
  const { setAuditDb } = require('../src/admin');
  app = server.app;
  db = server.db;
  await db.init();
  setAuditDb(db);
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

  test('rejects non bookable day', async () => {
    const d = new Date();
    for (let i = 0; i < 14; i++) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${dayNum}`;
      if (!isBookableDay(iso)) {
        const res = await request(app)
          .post('/api/bookings')
          .send(validBooking({ date: iso }));
        expect(res.status).toBe(400);
        return;
      }
      d.setDate(d.getDate() + 1);
    }
    throw new Error('No non bookable date found within 14 days');
  });

  test('rejects invalid time slot', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ time: '8:00 AM' }));
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
      .send(validBooking({ service: 'pickup_dropoff', time: '12:00 PM' }));
    expect(res.status).toBe(400);
  });

  test('rejects SQL injection in vehicle field', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ vehicle: "2020 Honda'; DROP TABLE bookings;--" }));
    expect(res.status).toBe(400);
  });

  test('rejects unexpected body fields', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBooking(), isAdmin: true, role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid request fields/i);
  });

  test('rejects control characters in name', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ firstName: 'John\x00<script>' }));
    expect(res.status).toBe(400);
  });

  test('rejects datetime strings as date', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ date: `${BOOKABLE_DATE}T00:00:00.000Z` }));
    expect(res.status).toBe(400);
  });

  test('rejects honeypot field when filled', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBooking({ email: 'honeypot@example.com' }), website: 'https://spam.test' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid submission/i);
  });
});

describe('Booking creation', () => {
  test('creates a valid booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ time: '9:00 AM', email: 'create1@example.com' }));
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

  test('returns 409 when two bookings race for the same slot', async () => {
    const futureDate = new Date(BOOKABLE_DATE + 'T12:00:00');
    futureDate.setDate(futureDate.getDate() + 14);
    let raceDate = null;
    for (let i = 0; i < 21; i++) {
      const y = futureDate.getFullYear();
      const m = String(futureDate.getMonth() + 1).padStart(2, '0');
      const d = String(futureDate.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      if (isBookableDay(iso)) {
        raceDate = iso;
        break;
      }
      futureDate.setDate(futureDate.getDate() + 1);
    }
    if (!raceDate) throw new Error('No bookable date found for race test');

    const slotPayload = (email) => validBooking({
      date: raceDate,
      time: '9:00 AM',
      email
    });

    const [first, second] = await Promise.all([
      request(app).post('/api/bookings').send(slotPayload('race1@example.com')),
      request(app).post('/api/bookings').send(slotPayload('race2@example.com'))
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  test('throttles repeat submissions from the same email', async () => {
    const futureDate = new Date(BOOKABLE_DATE + 'T12:00:00');
    futureDate.setDate(futureDate.getDate() + 21);
    let throttleDate = null;
    for (let i = 0; i < 21; i++) {
      const y = futureDate.getFullYear();
      const m = String(futureDate.getMonth() + 1).padStart(2, '0');
      const d = String(futureDate.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      if (isBookableDay(iso)) {
        throttleDate = iso;
        break;
      }
      futureDate.setDate(futureDate.getDate() + 1);
    }
    if (!throttleDate) throw new Error('No bookable date found for throttle test');

    const email = 'throttle@example.com';
    const first = await request(app)
      .post('/api/bookings')
      .send(validBooking({ date: throttleDate, time: '12:00 PM', email }));
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/bookings')
      .send(validBooking({ date: throttleDate, time: '3:00 PM', email }));
    expect(second.status).toBe(429);
  });
});

describe('Admin routes', () => {
  let bookingId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBooking({ time: '3:00 PM', email: 'admin-test@example.com' }));
    expect(res.status).toBe(201);
    bookingId = res.body.bookingId;
  });

  test('rejects admin list without API key', async () => {
    const now = new Date(BOOKABLE_DATE + 'T12:00:00');
    const res = await request(app)
      .get(`/api/admin/bookings?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    expect(res.status).toBe(401);
  });

  test('rejects admin list with invalid API key', async () => {
    const now = new Date(BOOKABLE_DATE + 'T12:00:00');
    const res = await request(app)
      .get(`/api/admin/bookings?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .set('X-API-Key', 'wrong-key');
    expect(res.status).toBe(401);
  });

  test('logs failed admin authentication attempts', async () => {
    const now = new Date(BOOKABLE_DATE + 'T12:00:00');
    await request(app)
      .get(`/api/admin/bookings?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .set('X-API-Key', 'definitely-wrong-key');

    const row = await db.get(
      `SELECT action FROM audit_log WHERE action = 'ADMIN_AUTH_FAILED' ORDER BY id DESC LIMIT 1`
    );
    expect(row).toBeDefined();
    expect(row.action).toBe('ADMIN_AUTH_FAILED');
  });

  test('lists bookings with valid API key', async () => {
    const now = new Date(BOOKABLE_DATE + 'T12:00:00');
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

  test('exports booking data with decrypted notes', async () => {
    const res = await request(app)
      .get(`/api/admin/bookings/${bookingId}/export`)
      .set('X-API-Key', ADMIN_API_KEY);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin-test@example.com');
    expect(res.body.data).not.toHaveProperty('first_name_encrypted');
  });

  test('rejects admin list with invalid status filter', async () => {
    const now = new Date(BOOKABLE_DATE + 'T12:00:00');
    const res = await request(app)
      .get(`/api/admin/bookings?year=${now.getFullYear()}&month=${now.getMonth() + 1}&status=hacked`)
      .set('X-API-Key', ADMIN_API_KEY);
    expect(res.status).toBe(400);
  });

  test('cancellation frees availability slot', async () => {
    const futureDate = new Date(BOOKABLE_DATE + 'T12:00:00');
    futureDate.setDate(futureDate.getDate() + 7);
    let cancelDate = null;
    for (let i = 0; i < 14; i++) {
      const y = futureDate.getFullYear();
      const m = String(futureDate.getMonth() + 1).padStart(2, '0');
      const d = String(futureDate.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      if (isBookableDay(iso)) {
        cancelDate = iso;
        break;
      }
      futureDate.setDate(futureDate.getDate() + 1);
    }
    if (!cancelDate) throw new Error('No future bookable date found');

    const booking = validBooking({
      date: cancelDate,
      time: '6:00 PM',
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
    expect(booked).not.toContain('6:00 PM');
  });
});
