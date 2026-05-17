const express = require('express');
const router = express.Router();
const pool = require('../db');
const upload = require('../middlewares/upload');

router.get('/', async (req, res) => {
    const { user_id, limit: limitStr, offset: offsetStr } = req.query;
    const limit = parseInt(limitStr) || 50;
    const offset = parseInt(offsetStr) || 0;
    
    try {
        let countResult, dataResult;
        
        if (user_id) {
            countResult = await pool.query(
                `SELECT COUNT(*) FROM fuel_logs fl
                 INNER JOIN vehicles v ON fl.vehicle_id = v.id
                 WHERE v.user_id = $1`,
                [user_id]
            );
            dataResult = await pool.query(
                `SELECT fl.* FROM fuel_logs fl
                 INNER JOIN vehicles v ON fl.vehicle_id = v.id
                 WHERE v.user_id = $1
                 ORDER BY fl.date DESC
                 LIMIT $2 OFFSET $3`,
                [user_id, limit, offset]
            );
        } else {
            countResult = await pool.query('SELECT COUNT(*) FROM fuel_logs');
            dataResult = await pool.query(
                'SELECT * FROM fuel_logs ORDER BY date DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            );
        }
        
        res.json({
            rows: dataResult.rows,
            total: parseInt(countResult.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', upload.single('receipt_image'), async (req, res) => {
    const { vehicle_id, km, liters, price, date, receipt_qr_data } = req.body;
    const receipt_image_path = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        // Validacija kilometraže: nova kilometraža ne sme biti manja od prethodne za to vozilo
        const latestLog = await pool.query(
            'SELECT km FROM fuel_logs WHERE vehicle_id = $1 ORDER BY km DESC LIMIT 1',
            [vehicle_id]
        );
        if (latestLog.rows.length > 0) {
            const lastKm = latestLog.rows[0].km;
            if (parseInt(km) <= parseInt(lastKm)) {
                return res.status(400).json({ 
                    error: `Kilometraža ne može biti manja ili jednaka prethodnoj unetoj kilometraži za ovo vozilo (${lastKm.toLocaleString()} km).` 
                });
            }
        }

        const result = await pool.query(
            'INSERT INTO fuel_logs (vehicle_id, km, liters, price, date, receipt_qr_data, receipt_image_path) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [vehicle_id, km, liters, price, date, receipt_qr_data || null, receipt_image_path]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM fuel_logs WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
