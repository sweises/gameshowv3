const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Prüfe Kommandozeilen-Argument für Modus
const mode = process.argv[2] || 'seed';  // 'seed' oder 'full'

async function exportDatabase() {
    const isSeedMode = mode === 'seed';
    
    console.log(`\n🔄 Exportiere Datenbank (${isSeedMode ? 'SEED' : 'FULL BACKUP'} Modus)...\n`);

    try {
        let sqlContent = `-- Quiz Buzzer - Datenbank ${isSeedMode ? 'Seed Data' : 'Full Backup'}
-- Exportiert am: ${new Date().toISOString()}
-- Modus: ${isSeedMode ? 'Seed (nur Templates)' : 'Full Backup (alle Daten)'}
--
-- WICHTIG: Dieses Script setzt voraus, dass die Migrations bereits ausgeführt wurden!

`;

        const exportData = {
            exportedAt: new Date().toISOString(),
            mode: isSeedMode ? 'seed' : 'full',
            version: '1.0.0'
        };

        if (isSeedMode) {
            // ==========================================
            // SEED MODUS - Nur Template-Daten
            // ==========================================
            
            console.log('📂 Exportiere Kategorien...');
            const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY id');
            console.log(`   ✅ ${categoriesResult.rows.length} Kategorien\n`);

            console.log('📝 Exportiere Fragen-Templates...');
            const questionsResult = await pool.query('SELECT * FROM question_templates ORDER BY category_id, id');
            console.log(`   ✅ ${questionsResult.rows.length} Fragen\n`);

            console.log('⚠️  Exportiere Strafen-Templates...');
            const punishmentsResult = await pool.query('SELECT * FROM punishment_templates ORDER BY id');
            console.log(`   ✅ ${punishmentsResult.rows.length} Strafen\n`);

            exportData.categories = categoriesResult.rows;
            exportData.questions = questionsResult.rows;
            exportData.punishments = punishmentsResult.rows;

            // SQL für Seed-Daten
            sqlContent += `-- Lösche Template-Daten (in korrekter Reihenfolge wegen Foreign Keys)
DELETE FROM text_answers;
DELETE FROM buzzes;
DELETE FROM questions;
DELETE FROM game_categories;
DELETE FROM active_punishments;
DELETE FROM players;
DELETE FROM games;
DELETE FROM question_templates;
DELETE FROM punishment_templates;
DELETE FROM categories;

-- Reset Sequences
ALTER SEQUENCE categories_id_seq RESTART WITH 1;
ALTER SEQUENCE question_templates_id_seq RESTART WITH 1;
ALTER SEQUENCE punishment_templates_id_seq RESTART WITH 1;

-- ==========================================
-- KATEGORIEN (${categoriesResult.rows.length})
-- ==========================================

`;

            for (const cat of categoriesResult.rows) {
                const name = escapeSql(cat.name);
                const icon = escapeSql(cat.icon);
                const desc = cat.description ? escapeSql(cat.description) : '';
                const type = cat.category_type || 'buzzer';
                
                sqlContent += `INSERT INTO categories (name, icon, description, category_type) VALUES ('${name}', '${icon}', '${desc}', '${type}');\n`;
            }

            sqlContent += `\n-- ==========================================
-- FRAGEN-TEMPLATES (${questionsResult.rows.length})
-- ==========================================

`;

            for (const q of questionsResult.rows) {
                const catName = categoriesResult.rows.find(c => c.id === q.category_id)?.name || '';
                const questionText = escapeSql(q.question_text);
                const imageUrl = q.image_url ? `'${escapeSql(q.image_url)}'` : 'NULL';
                
                sqlContent += `-- ${catName}\n`;
                sqlContent += `INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = '${escapeSql(catName)}'), '${questionText}', ${imageUrl});\n\n`;
            }

            sqlContent += `-- ==========================================
-- STRAFEN-TEMPLATES (${punishmentsResult.rows.length})
-- ==========================================

`;

            for (const p of punishmentsResult.rows) {
                const text = escapeSql(p.text);
                const duration = p.duration_questions;
                const icon = escapeSql(p.icon);
                
                sqlContent += `INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('${text}', ${duration}, '${icon}');\n`;
            }

            console.log('📊 Seed-Daten Zusammenfassung:');
            console.log(`   - ${categoriesResult.rows.length} Kategorien`);
            console.log(`   - ${questionsResult.rows.length} Fragen`);
            console.log(`   - ${punishmentsResult.rows.length} Strafen`);

        } else {
            // ==========================================
            // FULL BACKUP MODUS - Alle Tabellen
            // ==========================================
            
            sqlContent += `-- Lösche ALLE Daten (in korrekter Reihenfolge wegen Foreign Keys)
DELETE FROM text_answers;
DELETE FROM buzzes;
DELETE FROM questions;
DELETE FROM game_categories;
DELETE FROM active_punishments;
DELETE FROM players;
DELETE FROM games;
DELETE FROM question_templates;
DELETE FROM punishment_templates;
DELETE FROM categories;

-- Reset ALLE Sequences
ALTER SEQUENCE categories_id_seq RESTART WITH 1;
ALTER SEQUENCE question_templates_id_seq RESTART WITH 1;
ALTER SEQUENCE punishment_templates_id_seq RESTART WITH 1;
ALTER SEQUENCE games_id_seq RESTART WITH 1;
ALTER SEQUENCE players_id_seq RESTART WITH 1;
ALTER SEQUENCE questions_id_seq RESTART WITH 1;
ALTER SEQUENCE game_categories_id_seq RESTART WITH 1;
ALTER SEQUENCE buzzes_id_seq RESTART WITH 1;
ALTER SEQUENCE text_answers_id_seq RESTART WITH 1;
ALTER SEQUENCE active_punishments_id_seq RESTART WITH 1;

`;

            // 1. Categories
            console.log('📂 Exportiere Kategorien...');
            const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY id');
            console.log(`   ✅ ${categoriesResult.rows.length} Kategorien`);
            exportData.categories = categoriesResult.rows;
            
            sqlContent += `\n-- ==========================================\n-- KATEGORIEN (${categoriesResult.rows.length})\n-- ==========================================\n\n`;
            for (const row of categoriesResult.rows) {
                sqlContent += generateInsert('categories', row, ['id', 'created_at']);
            }

            // 2. Question Templates
            console.log('📝 Exportiere Fragen-Templates...');
            const questionsResult = await pool.query('SELECT * FROM question_templates ORDER BY id');
            console.log(`   ✅ ${questionsResult.rows.length} Fragen-Templates`);
            exportData.question_templates = questionsResult.rows;
            
            sqlContent += `\n-- ==========================================\n-- FRAGEN-TEMPLATES (${questionsResult.rows.length})\n-- ==========================================\n\n`;
            for (const row of questionsResult.rows) {
                sqlContent += generateInsert('question_templates', row, ['id', 'created_at']);
            }

            // 3. Punishment Templates
            console.log('⚠️  Exportiere Strafen-Templates...');
            const punishmentsResult = await pool.query('SELECT * FROM punishment_templates ORDER BY id');
            console.log(`   ✅ ${punishmentsResult.rows.length} Strafen-Templates`);
            exportData.punishment_templates = punishmentsResult.rows;
            
            sqlContent += `\n-- ==========================================\n-- STRAFEN-TEMPLATES (${punishmentsResult.rows.length})\n-- ==========================================\n\n`;
            for (const row of punishmentsResult.rows) {
                sqlContent += generateInsert('punishment_templates', row, ['id', 'created_at']);
            }

            // 4. Games (wenn vorhanden)
            console.log('🎮 Exportiere Spiele...');
            const gamesResult = await pool.query('SELECT * FROM games ORDER BY id');
            console.log(`   ✅ ${gamesResult.rows.length} Spiele`);
            exportData.games = gamesResult.rows;
            
            if (gamesResult.rows.length > 0) {
                sqlContent += `\n-- ==========================================\n-- SPIELE (${gamesResult.rows.length})\n-- ==========================================\n\n`;
                for (const row of gamesResult.rows) {
                    sqlContent += generateInsert('games', row, ['id', 'created_at']);
                }
            }

            // 5. Players (wenn vorhanden)
            console.log('👤 Exportiere Spieler...');
            const playersResult = await pool.query('SELECT * FROM players ORDER BY id');
            console.log(`   ✅ ${playersResult.rows.length} Spieler`);
            exportData.players = playersResult.rows;
            
            if (playersResult.rows.length > 0) {
                sqlContent += `\n-- ==========================================\n-- SPIELER (${playersResult.rows.length})\n-- ==========================================\n\n`;
                for (const row of playersResult.rows) {
                    sqlContent += generateInsert('players', row, ['id', 'joined_at']);
                }
            }

            // 6. Game Categories (wenn vorhanden)
            console.log('🗂️  Exportiere Spiel-Kategorien...');
            const gameCategoriesResult = await pool.query('SELECT * FROM game_categories ORDER BY id');
            console.log(`   ✅ ${gameCategoriesResult.rows.length} Spiel-Kategorien`);
            exportData.game_categories = gameCategoriesResult.rows;
            
            if (gameCategoriesResult.rows.length > 0) {
                sqlContent += `\n-- ==========================================\n-- SPIEL-KATEGORIEN (${gameCategoriesResult.rows.length})\n-- ==========================================\n\n`;
                for (const row of gameCategoriesResult.rows) {
                    sqlContent += generateInsert('game_categories', row, ['id', 'created_at']);
                }
            }

            // 7. Questions (wenn vorhanden)
            console.log('❓ Exportiere Fragen (im Spiel)...');
            const inGameQuestionsResult = await pool.query('SELECT * FROM questions ORDER BY id');
            console.log(`   ✅ ${inGameQuestionsResult.rows.length} Fragen (im Spiel)`);
            exportData.questions = inGameQuestionsResult.rows;
            
            if (inGameQuestionsResult.rows.length > 0) {
                sqlContent += `\n-- ==========================================\n-- FRAGEN (IM SPIEL) (${inGameQuestionsResult.rows.length})\n-- ==========================================\n\n`;
                for (const row of inGameQuestionsResult.rows) {
                    sqlContent += generateInsert('questions', row, ['id']);
                }
            }

            // 8. Buzzes (wenn vorhanden)
            console.log('🔴 Exportiere Buzzer-Events...');
            const buzzesResult = await pool.query('SELECT * FROM buzzes ORDER BY id');
            console.log(`   ✅ ${buzzesResult.rows.length} Buzzer-Events`);
            exportData.buzzes = buzzesResult.rows;
            
            if (buzzesResult.rows.length > 0) {
                sqlContent += `\n-- ==========================================\n-- BUZZER-EVENTS (${buzzesResult.rows.length})\n-- ==========================================\n\n`;
                for (const row of buzzesResult.rows) {
                    sqlContent += generateInsert('buzzes', row, ['id', 'buzzed_at']);
                }
            }

            // 9. Text Answers (wenn vorhanden)
            console.log('💬 Exportiere Text-Antworten...');
            const textAnswersResult = await pool.query('SELECT * FROM text_answers ORDER BY id');
            console.log(`   ✅ ${textAnswersResult.rows.length} Text-Antworten`);
            exportData.text_answers = textAnswersResult.rows;
            
            if (textAnswersResult.rows.length > 0) {
                sqlContent += `\n-- ==========================================\n-- TEXT-ANTWORTEN (${textAnswersResult.rows.length})\n-- ==========================================\n\n`;
                for (const row of textAnswersResult.rows) {
                    sqlContent += generateInsert('text_answers', row, ['id', 'submitted_at', 'judged_at']);
                }
            }

            // 10. Active Punishments (wenn vorhanden)
            console.log('😵 Exportiere aktive Strafen...');
            const activePunishmentsResult = await pool.query('SELECT * FROM active_punishments ORDER BY id');
            console.log(`   ✅ ${activePunishmentsResult.rows.length} aktive Strafen`);
            exportData.active_punishments = activePunishmentsResult.rows;
            
            if (activePunishmentsResult.rows.length > 0) {
                sqlContent += `\n-- ==========================================\n-- AKTIVE STRAFEN (${activePunishmentsResult.rows.length})\n-- ==========================================\n\n`;
                for (const row of activePunishmentsResult.rows) {
                    sqlContent += generateInsert('active_punishments', row, ['id', 'received_at']);
                }
            }

            console.log('\n📊 Full Backup Zusammenfassung:');
            console.log(`   - ${categoriesResult.rows.length} Kategorien`);
            console.log(`   - ${questionsResult.rows.length} Fragen-Templates`);
            console.log(`   - ${punishmentsResult.rows.length} Strafen-Templates`);
            console.log(`   - ${gamesResult.rows.length} Spiele`);
            console.log(`   - ${playersResult.rows.length} Spieler`);
            console.log(`   - ${gameCategoriesResult.rows.length} Spiel-Kategorien`);
            console.log(`   - ${inGameQuestionsResult.rows.length} Fragen (im Spiel)`);
            console.log(`   - ${buzzesResult.rows.length} Buzzer-Events`);
            console.log(`   - ${textAnswersResult.rows.length} Text-Antworten`);
            console.log(`   - ${activePunishmentsResult.rows.length} Aktive Strafen`);
        }

        // JSON Export
        const jsonFileName = isSeedMode ? 'seed-data.json' : 'full-backup.json';
        const jsonPath = path.join(__dirname, 'backend', jsonFileName);
        fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
        console.log(`\n💾 JSON gespeichert: ${jsonPath}`);

        // SQL Export
        const sqlFileName = isSeedMode ? 'seed-data.sql' : 'full-backup.sql';
        const sqlPath = path.join(__dirname, 'backend', sqlFileName);
        fs.writeFileSync(sqlPath, sqlContent);
        console.log(`💾 SQL gespeichert: ${sqlPath}`);

        console.log('\n✅ Export erfolgreich!\n');
        
        if (isSeedMode) {
            console.log('📂 Dateien für Git (Template-Daten):');
            console.log(`   - backend/seed-data.json`);
            console.log(`   - backend/seed-data.sql`);
            console.log('\n🚀 Diese Dateien können mit Git committed werden!\n');
        } else {
            console.log('📂 Backup-Dateien:');
            console.log(`   - backend/full-backup.json`);
            console.log(`   - backend/full-backup.sql`);
            console.log('\n⚠️  ACHTUNG: Full-Backups enthalten Spiel-Daten!');
            console.log('   Diese sollten NICHT ins Git-Repo (enthält temporäre Daten).');
            console.log('   Nutze sie nur für lokale Backups!\n');
        }

    } catch (error) {
        console.error('❌ Fehler beim Export:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Hilfsfunktion: SQL-String escapen
function escapeSql(str) {
    if (!str) return '';
    return str.replace(/'/g, "''");
}

// Hilfsfunktion: INSERT Statement generieren
function generateInsert(tableName, row, excludeColumns = []) {
    const columns = Object.keys(row).filter(col => !excludeColumns.includes(col));
    const values = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        if (typeof val === 'number') return val;
        if (val instanceof Date) return `'${val.toISOString()}'`;
        return `'${escapeSql(String(val))}'`;
    });

    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
}

// Script ausführen
console.log('\n📖 Quiz Buzzer - Datenbank Export');
console.log('=====================================');
console.log('\nModi:');
console.log('  seed - Nur Template-Daten (für Git)');
console.log('  full - Komplette Datenbank (für Backups)\n');
console.log(`Aktueller Modus: ${mode}\n`);

if (!['seed', 'full'].includes(mode)) {
    console.error('❌ Ungültiger Modus! Nutze "seed" oder "full"');
    console.log('\nBeispiele:');
    console.log('  npm run export-db        # Seed-Modus (default)');
    console.log('  npm run export-db seed   # Seed-Modus (explizit)');
    console.log('  npm run export-db full   # Full-Backup\n');
    process.exit(1);
}

exportDatabase();