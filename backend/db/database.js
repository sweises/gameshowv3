const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test der Verbindung
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Fehler bei der Datenbankverbindung:', err.stack);
    } else {
        console.log('✅ Datenbank erfolgreich verbunden!');
        release();
    }
});

module.exports = pool;