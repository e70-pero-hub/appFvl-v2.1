const express = require('express');
const router = express.Router();
const pool = require('../db');

// Sve ove rute će u server.js biti zaštićene authMiddleware-om
// Zbog app.use('/api/vehicles', vehiclesRouter); putanja počinje od '/'

router.get('/', async (req, res) => {
    const { user_id } = req.query;
    try {
        let result;
        if (user_id) {
            result = await pool.query(
                'SELECT * FROM vehicles WHERE user_id = $1 ORDER BY id ASC',
                [user_id]
            );
        } else {
            result = await pool.query('SELECT * FROM vehicles ORDER BY id ASC');
        }
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/latest_km', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT km FROM fuel_logs WHERE vehicle_id = $1 ORDER BY km DESC LIMIT 1',
            [id]
        );
        if (result.rows.length > 0) {
            res.json({ km: result.rows[0].km });
        } else {
            res.json({ km: 0 });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { brand, model, plate, reg_exp, service, tires, user_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO vehicles (brand, model, plate, reg_exp, service, tires, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [brand, model, plate, reg_exp, service, tires, user_id || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { brand, model, plate, reg_exp, service, tires, user_id } = req.body;
    try {
        const result = await pool.query(
            'UPDATE vehicles SET brand = $1, model = $2, plate = $3, reg_exp = $4, service = $5, tires = $6, user_id = $7 WHERE id = $8 RETURNING *',
            [brand, model, plate, reg_exp, service, tires, user_id || null, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM vehicles WHERE id = $1', [id]);
        res.json({ message: 'Vozilo obrisano' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
