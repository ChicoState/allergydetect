jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  apps: [],
}));
jest.mock('../firebase', () => jest.fn());

const admin = require('firebase-admin');
const getDb = require('../firebase');
const request = require('supertest');
const app = require('../app');

const AUTH_HEADER = 'Bearer test-token';

function makeMockDb({ exists = true, userData = {} } = {}) {
  const mockGet = jest.fn().mockResolvedValue({ exists, data: () => userData });
  const mockSet = jest.fn().mockResolvedValue();
  const mockRef = { get: mockGet, set: mockSet };
  const mockCollection = { doc: jest.fn().mockReturnValue(mockRef) };
  const db = { collection: jest.fn().mockReturnValue(mockCollection) };
  return { db, mockGet, mockSet };
}

beforeEach(() => {
  jest.clearAllMocks();
  admin.auth.mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }),
  });
});

describe('GET /users/:userId/allergies', () => {
  it('returns 404 when user not found', async () => {
    const { db } = makeMockDb({ exists: false });
    getDb.mockResolvedValue(db);

    const res = await request(app)
      .get('/users/user-1/allergies')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  it('returns allergens and intolerances for existing user', async () => {
    const userData = { allergens: ['peanut', 'tree nut'], intolerances: ['gluten', 'lactose'] };
    const { db } = makeMockDb({ userData });
    getDb.mockResolvedValue(db);

    const res = await request(app)
      .get('/users/user-1/allergies')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      allergens: ['peanut', 'tree nut'],
      intolerances: ['gluten', 'lactose'],
    });
  });

  it('returns empty arrays when user has no stored allergens', async () => {
    const { db } = makeMockDb({ userData: {} });
    getDb.mockResolvedValue(db);

    const res = await request(app)
      .get('/users/user-1/allergies')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ allergens: [], intolerances: [] });
  });

  it('returns 500 on Firestore error', async () => {
    const mockRef = { get: jest.fn().mockRejectedValue(new Error('Firestore unavailable')) };
    const db = { collection: jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue(mockRef) }) };
    getDb.mockResolvedValue(db);

    const res = await request(app)
      .get('/users/user-1/allergies')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch allergies/intolerances' });
  });
});

describe('POST /users/:userId/allergies', () => {
  it('returns 400 when allergens is not an array', async () => {
    const { db } = makeMockDb();
    getDb.mockResolvedValue(db);

    const res = await request(app)
      .post('/users/user-1/allergies')
      .set('Authorization', AUTH_HEADER)
      .send({ allergens: 'peanut', intolerances: [] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Allergens and intolerances must be arrays' });
  });

  it('returns 400 when intolerances is not an array', async () => {
    const { db } = makeMockDb();
    getDb.mockResolvedValue(db);

    const res = await request(app)
      .post('/users/user-1/allergies')
      .set('Authorization', AUTH_HEADER)
      .send({ allergens: [], intolerances: 'gluten' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Allergens and intolerances must be arrays' });
  });

  it('returns 404 when user not found', async () => {
    const { db } = makeMockDb({ exists: false });
    getDb.mockResolvedValue(db);

    const res = await request(app)
      .post('/users/user-1/allergies')
      .set('Authorization', AUTH_HEADER)
      .send({ allergens: ['peanut'], intolerances: [] });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  it('saves allergens and intolerances and returns success message', async () => {
    const { db, mockSet } = makeMockDb();
    getDb.mockResolvedValue(db);

    const res = await request(app)
      .post('/users/user-1/allergies')
      .set('Authorization', AUTH_HEADER)
      .send({ allergens: ['peanut', 'tree nut'], intolerances: ['gluten'] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Allergens and intolerances updated successfully',
      allergens: ['peanut', 'tree nut'],
      intolerances: ['gluten'],
    });
    expect(mockSet).toHaveBeenCalledWith(
      { allergens: ['peanut', 'tree nut'], intolerances: ['gluten'] },
      { merge: true }
    );
  });

  it('returns 500 on Firestore error', async () => {
    const mockRef = { get: jest.fn().mockRejectedValue(new Error('Firestore unavailable')) };
    const db = { collection: jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue(mockRef) }) };
    getDb.mockResolvedValue(db);

    const res = await request(app)
      .post('/users/user-1/allergies')
      .set('Authorization', AUTH_HEADER)
      .send({ allergens: ['peanut'], intolerances: [] });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to update allergies/intolerances' });
  });
});
