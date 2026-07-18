const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middlewares/auth');

function slugify(name) {
    const map = { š: 's', đ: 'dj', č: 'c', ć: 'c', ž: 'z' };
    let s = name.toLowerCase().replace(/[šđčćž]/g, ch => map[ch]);
    s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'firma';
}

async function generateUniqueSlug(client, companyName) {
    const base = slugify(companyName);
    let slug = base;
    let suffix = 1;
    while (true) {
        const existing = await client.query('SELECT 1 FROM companies WHERE slug = $1', [slug]);
        if (existing.rows.length === 0) return slug;
        suffix++;
        slug = `${base}-${suffix}`;
    }
}

router.post('/register', async (req, res) => {
    const { company_name, username, password, full_name } = req.body;
    if (!company_name || !username || !password || !full_name) {
        return res.status(400).json({ success: false, message: 'Sva polja su obavezna.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const slug = await generateUniqueSlug(client, company_name);
        const companyResult = await client.query(
            'INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id',
            [company_name, slug]
        );
        const companyId = companyResult.rows[0].id;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userResult = await client.query(
            `INSERT INTO users (username, password, full_name, role, company_id)
             VALUES ($1, $2, $3, 'admin', $4) RETURNING id, username, full_name, role, company_id`,
            [username, hashedPassword, full_name, companyId]
        );

        await client.query('COMMIT');

        const user = userResult.rows[0];
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, company_id: user.company_id },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ success: true, user, token });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(409).json({ success: false, message: 'Korisničko ime je već zauzeto.' });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Greška na serveru' });
    } finally {
        client.release();
    }
});

module.exports = router;
