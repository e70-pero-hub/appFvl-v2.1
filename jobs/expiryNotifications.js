const pool = require('../db');

// TODO: zameniti telo ove funkcije pravim slanjem (SendGrid, Twilio, itd.)
// kada budu dostupni kredencijali. Potpis je namerno nezavisan od provajdera.
async function sendNotification(companyName, warnings) {
    console.log(`[expiry-notifications] Firma "${companyName}": ${warnings.length} vozilo/a zahteva pažnju.`);
    warnings.forEach(w => {
        console.log(`  - ${w.brand} ${w.model} (${w.plate}), zadužen: ${w.assigned_to || 'N/A'} - ${w.reason} ističe ${w.date}`);
    });
}

async function runExpiryCheck() {
    try {
        const result = await pool.query(`
            SELECT v.company_id, c.name AS company_name, v.id AS vehicle_id, v.brand, v.model, v.plate,
                   v.reg_exp, v.service, v.tires, u.full_name AS assigned_to
            FROM vehicles v
            JOIN companies c ON v.company_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.reg_exp <= CURRENT_DATE + INTERVAL '30 days'
               OR v.service <= CURRENT_DATE + INTERVAL '30 days'
               OR v.tires   <= CURRENT_DATE + INTERVAL '30 days'
            ORDER BY v.company_id, v.id;
        `);

        const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const byCompany = {};

        result.rows.forEach(row => {
            if (!byCompany[row.company_id]) {
                byCompany[row.company_id] = { name: row.company_name, warnings: [] };
            }
            [
                { field: 'reg_exp', reason: 'Registracija' },
                { field: 'service', reason: 'Servis' },
                { field: 'tires', reason: 'Promena guma' }
            ].forEach(({ field, reason }) => {
                if (new Date(row[field]) <= cutoff) {
                    byCompany[row.company_id].warnings.push({
                        brand: row.brand,
                        model: row.model,
                        plate: row.plate,
                        assigned_to: row.assigned_to,
                        reason,
                        date: row[field]
                    });
                }
            });
        });

        for (const companyId in byCompany) {
            await sendNotification(byCompany[companyId].name, byCompany[companyId].warnings);
        }
    } catch (err) {
        console.error('[expiry-notifications] Posao nije uspeo:', err);
    }
}

function start() {
    const cron = require('node-cron');
    cron.schedule('0 7 * * *', runExpiryCheck);
    console.log('[expiry-notifications] Scheduler pokrenut (dnevno u 07:00).');
}

module.exports = { start, runExpiryCheck, sendNotification };
