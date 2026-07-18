const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fueltrack_pro_v2_secret_key_2026';

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    // Statički resursi (npr. /uploads slike) se otvaraju direktno iz <a href>,
    // pa browser ne šalje Authorization header - dozvoljavamo token i preko ?token= parametra.
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Pristup odbijen. Niste prijavljeni.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.company_id) {
            return res.status(401).json({ error: 'Sesija je zastarela. Ponovo se prijavite.' });
        }
        req.user = decoded; // { id, username, role, company_id }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Nevažeći ili istekli token. Ponovo se prijavite.' });
    }
}

module.exports = {
    authMiddleware,
    JWT_SECRET
};
