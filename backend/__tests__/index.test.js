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

beforeEach(() => {
  jest.clearAllMocks();
  admin.auth.mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }),
  });
});

describe('GET /data', () => {
  it('returns 404 when collection is empty', async () => {
    const mockCollection = { get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) };
    getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(mockCollection) });

    const res = await request(app).get('/data').set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'No documents found.' });
  });

  it('returns array of documents when found', async () => {
    const mockDocs = [
      { id: 'doc1', data: () => ({ name: 'Item 1' }) },
      { id: 'doc2', data: () => ({ name: 'Item 2' }) },
    ];
    const mockCollection = { get: jest.fn().mockResolvedValue({ empty: false, docs: mockDocs }) };
    getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(mockCollection) });

    const res = await request(app).get('/data').set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 'doc1', name: 'Item 1' },
      { id: 'doc2', name: 'Item 2' },
    ]);
  });

  it('returns 500 on Firestore error', async () => {
    const mockCollection = { get: jest.fn().mockRejectedValue(new Error('Firestore unavailable')) };
    getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(mockCollection) });

    const res = await request(app).get('/data').set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(500);
  });
});

describe('GET /ingredients/:upc/:userId', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('returns 404 when UPC not found in external API', async () => {
    global.fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue({ items: [] }) });
    getDb.mockResolvedValue({ collection: jest.fn() });

    const res = await request(app)
      .get('/ingredients/012345678901/user-1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'No item found for this UPC' });
  });

  it('returns 404 when user not found in Firestore', async () => {
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ items: [{ description: 'sugar, milk, flour' }] }),
    });
    const mockRef = { get: jest.fn().mockResolvedValue({ exists: false }) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockRef) };
    getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(mockCollection) });

    const res = await request(app)
      .get('/ingredients/012345678901/user-1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  it('returns safe result when no allergens match ingredients', async () => {
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ items: [{ description: 'sugar, water, corn syrup' }] }),
    });
    const userData = { allergens: ['peanut'], intolerances: ['gluten'] };
    const mockRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => userData }),
      collection: jest.fn().mockReturnValue({ add: jest.fn().mockResolvedValue({}) }),
    };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockRef) };
    getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(mockCollection) });

    const res = await request(app)
      .get('/ingredients/012345678901/user-1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.safe).toBe(true);
    expect(res.body.containsAllergens).toEqual([]);
    expect(res.body.containsIntolerances).toEqual([]);
    expect(res.body.ingredients).toEqual(['sugar', 'water', 'corn syrup']);
  });

  it('returns unsafe result when allergens are found in ingredients', async () => {
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ items: [{ description: 'peanut oil, sugar, salt' }] }),
    });
    const userData = { allergens: ['peanut'], intolerances: ['gluten'] };
    const mockRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => userData }),
      collection: jest.fn().mockReturnValue({ add: jest.fn().mockResolvedValue({}) }),
    };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockRef) };
    getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(mockCollection) });

    const res = await request(app)
      .get('/ingredients/012345678901/user-1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.safe).toBe(false);
    expect(res.body.containsAllergens).toEqual(['peanut oil']);
    expect(res.body.containsIntolerances).toEqual([]);
  });

  it('returns unsafe result when both allergens and intolerances match', async () => {
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        items: [{ description: 'peanut butter, wheat flour, sugar' }],
      }),
    });
    const userData = { allergens: ['peanut'], intolerances: ['wheat'] };
    const mockRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => userData }),
      collection: jest.fn().mockReturnValue({ add: jest.fn().mockResolvedValue({}) }),
    };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockRef) };
    getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(mockCollection) });

    const res = await request(app)
      .get('/ingredients/012345678901/user-1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.safe).toBe(false);
    expect(res.body.containsAllergens).toEqual(['peanut butter']);
    expect(res.body.containsIntolerances).toEqual(['wheat flour']);
  });

  it('returns 500 on external API fetch error', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    getDb.mockResolvedValue({ collection: jest.fn() });

    const res = await request(app)
      .get('/ingredients/012345678901/user-1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch ingredients' });
  });
});
