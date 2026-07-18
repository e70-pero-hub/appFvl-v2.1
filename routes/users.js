const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, full_name, role FROM users WHERE company_id = $1 ORDER BY full_name ASC',
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { username, password, full_name, role } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userResult = await pool.query(
            `INSERT INTO users (username, password, full_name, role, company_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, role`,
            [username, hashedPassword, full_name, role || 'user', req.user.company_id]
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
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            result = await pool.query(
                'UPDATE users SET username = $1, password = $2, full_name = $3, role = $4 WHERE id = $5 AND company_id = $6 RETURNING id, username, full_name, role',
                [username, hashedPassword, full_name, role, id, req.user.company_id]
            );
        } else {
            result = await pool.query(
                'UPDATE users SET username = $1, full_name = $2, role = $3 WHERE id = $4 AND company_id = $5 RETURNING id, username, full_name, role',
                [username, full_name, role, id, req.user.company_id]
            );
        }
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Korisnik nije pronađen' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 AND company_id = $2',
            [id, req.user.company_id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Korisnik nije pronađen' });
        }
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
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2 AND company_id = $3',
            [hashedPassword, id, req.user.company_id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Korisnik nije pronađen' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
