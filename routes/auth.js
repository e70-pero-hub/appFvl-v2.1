const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middlewares/auth');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Pogrešno korisničko ime ili lozinka' });
        }

        const user = result.rows[0];
        
        // Bcrypt provera
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            // Kreiranje JWT tokena (traje 8 sati)
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            // Ne šaljemo hash lozinke nazad
            delete user.password;
            
            res.json({ success: true, user, token });
        } else {
            res.status(401).json({ success: false, message: 'Pogrešno korisničko ime ili lozinka' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Greška na serveru' });
    }
});

module.exports = router;
