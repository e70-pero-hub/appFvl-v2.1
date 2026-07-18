jest.mock('../db', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('bcryptjs');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const authRoutes = require('../routes/auth');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api', authRoutes);
    return app;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/login', () => {
    test('uspešan login vraća token koji sadrži company_id', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{ id: 1, username: 'admin', password: 'hashed', full_name: 'Admin', role: 'admin', company_id: 42 }]
        });
        bcrypt.compare.mockResolvedValueOnce(true);

        const res = await request(buildApp()).post('/api/login').send({ username: 'admin', password: 'admin123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const decoded = jwt.decode(res.body.token);
        expect(decoded.company_id).toBe(42);
        expect(decoded.role).toBe('admin');
        expect(res.body.user.password).toBeUndefined();
    });

    test('nepostojeći username vraća 401', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(buildApp()).post('/api/login').send({ username: 'nepostojeci', password: 'x' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test('pogrešna lozinka vraća 401', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{ id: 1, username: 'admin', password: 'hashed', role: 'admin', company_id: 1 }]
        });
        bcrypt.compare.mockResolvedValueOnce(false);

        const res = await request(buildApp()).post('/api/login').send({ username: 'admin', password: 'wrong' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});
