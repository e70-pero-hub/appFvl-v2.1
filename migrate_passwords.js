const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_DX1xcwbGvI5O@ep-winter-forest-albxjxx1-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true",
});

async function migrate() {
    try {
        console.log("Povezivanje sa bazom...");
        const result = await pool.query('SELECT id, username, password FROM users');
        const users = result.rows;

        console.log(`Pronađeno ${users.length} korisnika.`);

        for (let user of users) {
            // Preskačemo korisnike koji već imaju bcrypt hash (počinje sa $2a$ ili slično)
            if (user.password.startsWith('$2')) {
                console.log(`Korisnik ${user.username} već ima heširanu lozinku, preskačem...`);
                continue;
            }

            console.log(`Heširanje lozinke za korisnika: ${user.username}`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);

            await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
            console.log(`Lozinka ažurirana za: ${user.username}`);
        }

        console.log("Migracija uspešno završena.");
    } catch (err) {
        console.error("Greška prilikom migracije:", err);
    } finally {
        await pool.end();
    }
}

migrate();
