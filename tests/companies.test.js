jest.mock('../db', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('bcryptjs');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const companiesRoutes = require('../routes/companies');
const { createMockClient } = require('./helpers/mockPool');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api', companiesRoutes);
    return app;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/register', () => {
    test('nedostaje obavezno polje vraća 400 bez pokušaja konekcije na bazu', async () => {
        const res = await request(buildApp()).post('/api/register').send({ company_name: 'Test' });

        expect(res.status).toBe(400);
        expect(pool.connect).not.toHaveBeenCalled();
    });

    test('uspešna registracija vraća admin token sa company_id i zatvara konekciju', async () => {
        const client = createMockClient();
        pool.connect.mockResolvedValueOnce(client);

        client.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // slug slobodan
            .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // INSERT companies
            .mockResolvedValueOnce({ rows: [{ id: 5, username: 'novaadmin', full_name: 'Novi Admin', role: 'admin', company_id: 10 }] }) // INSERT users
            .mockResolvedValueOnce({}); // COMMIT

        bcrypt.genSalt.mockResolvedValueOnce('salt');
        bcrypt.hash.mockResolvedValueOnce('hashedpw');

        const res = await request(buildApp()).post('/api/register').send({
            company_name: 'Nova Firma',
            full_name: 'Novi Admin',
            username: 'novaadmin',
            password: 'lozinka123'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const decoded = jwt.decode(res.body.token);
        expect(decoded.role).toBe('admin');
        expect(decoded.company_id).toBe(10);
        expect(client.release).toHaveBeenCalled();
    });

    test('duplikat korisničkog imena vraća 409 i pokreće ROLLBACK', async () => {
        const client = createMockClient();
        pool.connect.mockResolvedValueOnce(client);

        client.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // slug slobodan
            .mockResolvedValueOnce({ rows: [{ id: 11 }] }) // INSERT companies
            .mockRejectedValueOnce({ code: '23505' }); // INSERT users - duplikat

        bcrypt.genSalt.mockResolvedValueOnce('salt');
        bcrypt.hash.mockResolvedValueOnce('hashedpw');

        const res = await request(buildApp()).post('/api/register').send({
            company_name: 'Firma B',
            full_name: 'Neko',
            username: 'zauzeto',
            password: 'lozinka123'
        });

        expect(res.status).toBe(409);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.release).toHaveBeenCalled();
    });

    test('kolizija sluga bira sledeći slobodan sufiksovan slug', async () => {
        const client = createMockClient();
        pool.connect.mockResolvedValueOnce(client);

        client.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ exists: true }] }) // 'nova-firma' zauzet
            .mockResolvedValueOnce({ rows: [] }) // 'nova-firma-2' slobodan
            .mockResolvedValueOnce({ rows: [{ id: 12 }] }) // INSERT companies
            .mockResolvedValueOnce({ rows: [{ id: 6, username: 'admin2', full_name: 'X', role: 'admin', company_id: 12 }] }) // INSERT users
            .mockResolvedValueOnce({}); // COMMIT

        bcrypt.genSalt.mockResolvedValueOnce('salt');
        bcrypt.hash.mockResolvedValueOnce('hashedpw');

        const res = await request(buildApp()).post('/api/register').send({
            company_name: 'Nova Firma',
            full_name: 'X',
            username: 'admin2',
            password: 'lozinka123'
        });

        expect(res.status).toBe(200);
        const insertCompaniesCall = client.query.mock.calls.find(
            call => typeof call[0] === 'string' && call[0].includes('INSERT INTO companies')
        );
        expect(insertCompaniesCall[1][1]).toBe('nova-firma-2');
    });
});
