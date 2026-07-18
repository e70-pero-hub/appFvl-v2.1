const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_DX1xcwbGvI5O@ep-winter-forest-albxjxx1-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true",
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Kreiranje companies tabele...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                slug VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        console.log('2. Kreiranje/potvrda default firme...');
        await client.query(`
            INSERT INTO companies (name, slug) VALUES ('Default Company', 'default')
            ON CONFLICT (slug) DO NOTHING;
        `);

        console.log('3. Dodavanje company_id kolona (nullable)...');
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);`);
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);`);

        console.log('4. Backfill postojećih redova u default firmu...');
        await client.query(`
            UPDATE users SET company_id = (SELECT id FROM companies WHERE slug = 'default') WHERE company_id IS NULL;
        `);
        await client.query(`
            UPDATE vehicles SET company_id = (SELECT id FROM companies WHERE slug = 'default') WHERE company_id IS NULL;
        `);

        console.log('5. Provera fuel_logs redova bez vehicle_id (dijagnostika)...');
        const orphanCheck = await client.query(`SELECT COUNT(*) FROM fuel_logs WHERE vehicle_id IS NULL;`);
        if (parseInt(orphanCheck.rows[0].count) > 0) {
            console.warn(`UPOZORENJE: ${orphanCheck.rows[0].count} fuel_logs redova ima NULL vehicle_id i biće nevidljivo pod company-scoping-om. Preporučuje se ručna provera.`);
        }

        console.log('6. Postavljanje company_id na NOT NULL...');
        await client.query(`ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;`);
        await client.query(`ALTER TABLE vehicles ALTER COLUMN company_id SET NOT NULL;`);

        console.log('7. Ukidanje starog globalnog UNIQUE(plate)...');
        await client.query(`
            DO $$
            DECLARE con_name text;
            BEGIN
                SELECT tc.constraint_name INTO con_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu
                  ON tc.constraint_name = ccu.constraint_name
                WHERE tc.table_name = 'vehicles' AND tc.constraint_type = 'UNIQUE' AND ccu.column_name = 'plate';
                IF con_name IS NOT NULL THEN
                    EXECUTE format('ALTER TABLE vehicles DROP CONSTRAINT %I', con_name);
                END IF;
            END $$;
        `);

        console.log('8. Dodavanje UNIQUE(company_id, plate)...');
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_company_plate_unique') THEN
                    ALTER TABLE vehicles ADD CONSTRAINT vehicles_company_plate_unique UNIQUE (company_id, plate);
                END IF;
            END $$;
        `);

        console.log('9. Ažuriranje admin_reports_view...');
        await client.query(`
            CREATE OR REPLACE VIEW admin_reports_view AS
            SELECT fl.id AS log_id, fl.km, fl.liters, fl.price, fl.date AS fuel_date,
                   fl.receipt_qr_data, fl.receipt_image_path,
                   TO_CHAR(fl.date, 'YYYY-MM') AS month_year,
                   v.id AS vehicle_id, v.plate, v.brand, v.model,
                   u.id AS user_id, u.username, u.full_name,
                   v.company_id
            FROM fuel_logs fl
            JOIN vehicles v ON fl.vehicle_id = v.id
            JOIN users u ON v.user_id = u.id;
        `);

        await client.query('COMMIT');
        console.log('Migracija uspešno završena.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Greška prilikom migracije, rollback izvršen:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
