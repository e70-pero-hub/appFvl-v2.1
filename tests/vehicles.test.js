jest.mock('../db', () => ({ query: jest.fn(), connect: jest.fn() }));

const express = require('express');
const request = require('supertest');
const pool = require('../db');
const vehiclesRoutes = require('../routes/vehicles');

function buildApp(companyId = 1) {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { id: 1, username: 'admin', role: 'admin', company_id: companyId };
        next();
    });
    app.use('/api/vehicles', vehiclesRoutes);
    return app;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/vehicles', () => {
    test('filtrira po company_id pozivaoca', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 1, plate: 'BG-001-AA', company_id: 7 }] });

        const res = await request(buildApp(7)).get('/api/vehicles');

        expect(res.status).toBe(200);
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('company_id'), [7]);
    });
});

describe('GET /api/vehicles/:id/latest_km - cross-company zaštita', () => {
    test('vraća 404 za tuđe vozilo i NE poziva drugi upit', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] }); // vlasništvo nije potvrđeno

        const res = await request(buildApp(7)).get('/api/vehicles/999/latest_km');

        expect(res.status).toBe(404);
        expect(pool.query).toHaveBeenCalledTimes(1);
    });
});

describe('PUT /api/vehicles/:id - cross-company zaštita', () => {
    test('vraća 404 kad rowCount === 0 (tuđe vozilo)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(buildApp(7)).put('/api/vehicles/999').send({
            brand: 'X', model: 'Y', plate: 'ZZZ-999',
            reg_exp: '2027-01-01', service: '2027-01-01', tires: '2027-01-01'
        });

        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/vehicles/:id - cross-company zaštita', () => {
    test('vraća 404 kad rowCount === 0 (tuđe vozilo)', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0 });

        const res = await request(buildApp(7)).delete('/api/vehicles/999');

        expect(res.status).toBe(404);
    });
});

describe('POST /api/vehicles - unakrsno povezivanje na tuđeg korisnika', () => {
    test('vraća 400 kad prosleđeni user_id ne pripada firmi pozivaoca', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] }); // userCheck prazan

        const res = await request(buildApp(7)).post('/api/vehicles').send({
            brand: 'X', model: 'Y', plate: 'ZZZ-999',
            reg_exp: '2027-01-01', service: '2027-01-01', tires: '2027-01-01',
            user_id: 999
        });

        expect(res.status).toBe(400);
    });
});
