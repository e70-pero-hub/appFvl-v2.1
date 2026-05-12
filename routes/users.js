const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, full_name, role FROM users ORDER BY full_name ASC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { username, password, full_name, role } = req.body;
    try {
        // Heširanje lozinke pre upisa
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userResult = await pool.query(
            `INSERT INTO users (username, password, full_name, role)
             VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role`,
            [username, hashedPassword, full_name, role || 'user']
        );
        res.json(userResult.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ error: 'Korisničko ime je već zauzeto.' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { username, password, full_name, role } = req.body;
    try {
        let result;
        if (password) {
            // Heširanje nove lozinke pre UPDATE-a
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            result = await pool.query(
                'UPDATE users SET username = $1, password = $2, full_name = $3, role = $4 WHERE id = $5 RETURNING id, username, full_name, role',
                [username, hashedPassword, full_name, role, id]
            );
        } else {
            result = await pool.query(
                'UPDATE users SET username = $1, full_name = $2, role = $3 WHERE id = $4 RETURNING id, username, full_name, role',
                [username, full_name, role, id]
            );
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Promena sopstvene lozinke
router.put('/:id/password', async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    try {
        // Heširanje nove lozinke
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
