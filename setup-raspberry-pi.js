#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'quiz_buzzer',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function setupDatabase() {
    console.log('\n🍓 ==========================================');
    console.log('   Quiz Buzzer - Raspberry Pi Setup');
    console.log('==========================================\n');

    try {
        // 1. Verbindung testen
        console.log('🔌 Teste Datenbankverbindung...');
        await pool.query('SELECT NOW()');
        console.log('   ✅ Verbindung erfolgreich!\n');

        // 2. Migrations ausführen
        console.log('📝 Führe Migrations aus...');
        const migrationsDir = path.join(__dirname, 'backend', 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            console.log(`   → ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
            await pool.query(sql);
        }
        console.log('   ✅ Migrations erfolgreich!\n');

        // 3. Seed-Daten importieren
        console.log('🌱 Importiere Seed-Daten...');
        const seedPath = path.join(__dirname, 'backend', 'seed-data.sql');
        
        if (!fs.existsSync(seedPath)) {
            console.log('   ⚠️  Keine seed-data.sql gefunden!');
            console.log('   ℹ️  Führe "npm run export-db" auf deinem Hauptrechner aus,');
            console.log('      um die Datenbank zu exportieren.\n');
            
            // Example Seed Data erstellen
            console.log('   📦 Erstelle Beispiel-Daten...');
            await createExampleData();
        } else {
            const seedSql = fs.readFileSync(seedPath, 'utf-8');
            await pool.query(seedSql);
            console.log('   ✅ Seed-Daten importiert!\n');
        }

        // 4. Statistik anzeigen
        console.log('📊 Datenbank-Status:');
        
        const categoriesCount = await pool.query('SELECT COUNT(*) FROM categories');
        console.log(`   - ${categoriesCount.rows[0].count} Kategorien`);
        
        const questionsCount = await pool.query('SELECT COUNT(*) FROM question_templates');
        console.log(`   - ${questionsCount.rows[0].count} Fragen`);
        
        const punishmentsCount = await pool.query('SELECT COUNT(*) FROM punishment_templates');
        console.log(`   - ${punishmentsCount.rows[0].count} Strafen`);

        console.log('\n✅ Setup abgeschlossen!\n');
        console.log('🚀 Du kannst jetzt die App starten mit: npm start\n');

    } catch (error) {
        console.error('\n❌ Fehler beim Setup:', error.message);
        console.error('\n💡 Tipps zur Fehlerbehebung:');
        console.log('   1. Ist PostgreSQL installiert und läuft?');
        console.log('   2. Existiert die Datenbank "quiz_buzzer"?');
        console.log('   3. Sind die Credentials in backend/.env korrekt?');
        console.log('\n');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function createExampleData() {
    // Beispiel-Kategorien und Fragen für den Start
    
    // Tutorial Kategorie
    await pool.query(`
        INSERT INTO categories (name, icon, description, category_type)
        VALUES ('Tutorial', 'brain', 'Lerne wie das Spiel funktioniert', 'buzzer')
        ON CONFLICT DO NOTHING;
    `);

    const tutorialId = await pool.query(
        "SELECT id FROM categories WHERE name = 'Tutorial'"
    );

    if (tutorialId.rows.length > 0) {
        const catId = tutorialId.rows[0].id;
        
        await pool.query(`
            INSERT INTO question_templates (category_id, question_text, image_url)
            VALUES 
                ($1, 'Drücke den BUZZ Button so schnell du kannst!', NULL),
                ($1, 'Wie heißt die Hauptstadt von Deutschland?', NULL),
                ($1, 'Was ist 2 + 2?', NULL)
            ON CONFLICT DO NOTHING;
        `, [catId]);
    }

    // Allgemeinwissen Kategorie
    await pool.query(`
        INSERT INTO categories (name, icon, description, category_type)
        VALUES ('Allgemeinwissen', 'brain', 'Teste dein Wissen', 'buzzer')
        ON CONFLICT DO NOTHING;
    `);

    const allgemeinId = await pool.query(
        "SELECT id FROM categories WHERE name = 'Allgemeinwissen'"
    );

    if (allgemeinId.rows.length > 0) {
        const catId = allgemeinId.rows[0].id;
        
        await pool.query(`
            INSERT INTO question_templates (category_id, question_text, image_url)
            VALUES 
                ($1, 'Wie viele Kontinente gibt es?', NULL),
                ($1, 'In welchem Jahr fiel die Berliner Mauer?', NULL),
                ($1, 'Wie heißt der höchste Berg der Welt?', NULL)
            ON CONFLICT DO NOTHING;
        `, [catId]);
    }

    // Strafen
    await pool.query(`
        INSERT INTO punishment_templates (text, duration_questions, icon)
        VALUES 
            ('10 Liegestützen machen!', 1, '⚠️'),
            ('Nächste Runde mit geschlossenen Augen spielen', 2, '👁️'),
            ('Ein Glas Wasser auf ex trinken', 1, '💧'),
            ('Einen Zungenbrecher 3x schnell sagen', 1, '👅')
        ON CONFLICT DO NOTHING;
    `);

    console.log('   ✅ Beispiel-Daten erstellt!\n');
}

// Script ausführen
setupDatabase();