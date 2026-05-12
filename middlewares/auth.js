const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fueltrack_pro_v2_secret_key_2026';

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Pristup odbijen. Niste prijavljeni.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, username, role }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Nevažeći ili istekli token. Ponovo se prijavite.' });
    }
}

module.exports = {
    authMiddleware,
    JWT_SECRET
};
