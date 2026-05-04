jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  apps: [],
}));
jest.mock('../firebase', () => jest.fn());

const admin = require('firebase-admin');
const getDb = require('../firebase');
const requireAuth = require('../middleware/auth');

describe('requireAuth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { method: 'GET', path: '/test', headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    admin.auth.mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-123' }),
    });
    getDb.mockResolvedValue({});
  });

  it('passes OPTIONS requests through without checking token', async () => {
    req.method = 'OPTIONS';

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 for missing Authorization header', async () => {
    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header lacks Bearer prefix', async () => {
    req.headers.authorization = 'Basic some-token';

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    req.headers.authorization = 'Bearer bad-token';
    admin.auth.mockReturnValue({
      verifyIdToken: jest.fn().mockRejectedValue(new Error('Token expired')),
    });

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches decoded user to req and calls next on valid token', async () => {
    req.headers.authorization = 'Bearer valid-token';

    await requireAuth(req, res, next);

    expect(req.user).toEqual({ uid: 'user-123' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('initializes db before verifying token', async () => {
    req.headers.authorization = 'Bearer valid-token';

    await requireAuth(req, res, next);

    expect(getDb).toHaveBeenCalled();
  });
});
