const { Pool } = require('pg');

const pool = new Pool({
    // Ako aplikacija vidi ENV varijablu (na cloud-u), koristi je, a ako ne (na lokalu), koristi stare lokalne podešavanja.
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_DX1xcwbGvI5O@ep-winter-forest-albxjxx1-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true",
});

module.exports = pool;
