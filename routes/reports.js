const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    const { month_year, plate, username } = req.query;
    try {
        let query = 'SELECT * FROM admin_reports_view WHERE 1=1';
        let values = [];
        let index = 1;

        if (month_year) {
            query += ` AND month_year = $${index++}`;
            values.push(month_year);
        }
        if (plate) {
            query += ` AND plate ILIKE $${index++}`;
            values.push(`%${plate}%`);
        }
        if (username) {
            query += ` AND username ILIKE $${index++}`;
            values.push(`%${username}%`);
        }

        query += ' ORDER BY fuel_date DESC';

        const result = await pool.query(query, values);

        let total_liters = 0;
        let total_price = 0;
        let avg_consumption = null;

        if (result.rows.length > 0) {
            let vehicleStats = {};

            result.rows.forEach(r => {
                total_liters += parseFloat(r.liters);
                total_price += parseFloat(r.price);

                if (!vehicleStats[r.plate]) {
                    vehicleStats[r.plate] = { min_km: r.km, max_km: r.km, total_liters: 0 };
                }
                if (r.km < vehicleStats[r.plate].min_km) vehicleStats[r.plate].min_km = r.km;
                if (r.km > vehicleStats[r.plate].max_km) vehicleStats[r.plate].max_km = r.km;
                vehicleStats[r.plate].total_liters += parseFloat(r.liters);
            });

            // Računanje proseka za pojedinačna vozila
            Object.keys(vehicleStats).forEach(p => {
                let stats = vehicleStats[p];
                let distance = stats.max_km - stats.min_km;
                if (distance > 0) {
                    stats.avg = (stats.total_liters / distance) * 100;
                } else {
                    stats.avg = null;
                }
            });

            // Ubacivanje statistike nazad u redove za prikaz na karticama
            result.rows = result.rows.map(r => {
                r.vehicle_avg = vehicleStats[r.plate].avg ? vehicleStats[r.plate].avg.toFixed(2) : null;
                return r;
            });

            // Ako je detektovano prisustvo *samo jednog* vozila, prikaži i globalno
            if (Object.keys(vehicleStats).length === 1) {
                let p = Object.keys(vehicleStats)[0];
                avg_consumption = vehicleStats[p].avg;
            }
        }

        res.json({
            logs: result.rows,
            summary: {
                total_liters: total_liters.toFixed(2),
                total_price: total_price.toFixed(2),
                avg_consumption: avg_consumption ? avg_consumption.toFixed(2) : null
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
