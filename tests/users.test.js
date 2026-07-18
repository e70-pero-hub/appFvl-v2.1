jest.mock('../db', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('bcryptjs');

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const usersRoutes = require('../routes/users');

function buildApp(companyId = 1) {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { id: 1, username: 'admin', role: 'admin', company_id: companyId };
        next();
    });
    app.use('/api/users', usersRoutes);
    return app;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/users', () => {
    test('filtrira po company_id pozivaoca', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'admin' }] });

        const res = await request(buildApp(7)).get('/api/users');

        expect(res.status).toBe(200);
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('company_id'), [7]);
    });
});

describe('PUT /api/users/:id - cross-company zaštita', () => {
    test('vraća 404 kad rowCount === 0 (tuđi korisnik)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(buildApp(7)).put('/api/users/999').send({
            username: 'x', full_name: 'X', role: 'user'
        });

        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/users/:id - cross-company zaštita', () => {
    test('vraća 404 kad rowCount === 0 (tuđi korisnik)', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0 });

        const res = await request(buildApp(7)).delete('/api/users/999');

        expect(res.status).toBe(404);
    });
});

describe('POST /api/users', () => {
    test('duplikat korisničkog imena vraća 409', async () => {
        bcrypt.genSalt.mockResolvedValueOnce('salt');
        bcrypt.hash.mockResolvedValueOnce('hashedpw');
        pool.query.mockRejectedValueOnce({ code: '23505' });

        const res = await request(buildApp(7)).post('/api/users').send({
            username: 'zauzeto', password: 'lozinka123', full_name: 'X', role: 'user'
        });

        expect(res.status).toBe(409);
    });
});
