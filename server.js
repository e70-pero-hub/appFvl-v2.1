const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const pool = require('./db');
const { authMiddleware } = require('./middlewares/auth');

// Importovanje ruta
const authRoutes = require('./routes/auth');
const companiesRoutes = require('./routes/companies');
const vehiclesRoutes = require('./routes/vehicles');
const usersRoutes = require('./routes/users');
const fuelLogsRoutes = require('./routes/fuel');
const reportsRoutes = require('./routes/reports');

const app = express();
const port = process.env.PORT || 3000;

// Kreiranje foldera za slike ako ne postoji (premda i multer proverava)
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Globalni Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Za serviranje frontenda
app.use('/uploads', authMiddleware, express.static(path.join(__dirname, 'uploads'))); // Slike (zahteva login)

// Javne rute
app.use('/api', authRoutes); // Sadrži POST /login
app.use('/api', companiesRoutes); // Sadrži POST /register

// API dokumentacija (Swagger UI)
const openapiSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// TEST RUTA
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ success: true, time: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Zaštićene rute (primenjuje se authMiddleware za sve ispod)
app.use('/api/vehicles', authMiddleware, vehiclesRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/fuel_logs', authMiddleware, fuelLogsRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);

app.listen(port, () => {
    console.log(`Server radi na http://localhost:${port}`);
    require('./jobs/expiryNotifications').start();
});
