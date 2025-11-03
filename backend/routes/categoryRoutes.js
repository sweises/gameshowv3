const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Alle Kategorien abrufen
    router.get('/categories', async (req, res) => {
        try {
            const result = await db.query(
                'SELECT * FROM categories ORDER BY name'
            );
            res.json({ success: true, categories: result.rows });
        } catch (error) {
            console.error('Fehler beim Abrufen der Kategorien:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Fragen für eine Kategorie abrufen
    router.get('/categories/:id/questions', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await db.query(
                'SELECT * FROM question_templates WHERE category_id = $1',
                [id]
            );
            res.json({ success: true, questions: result.rows });
        } catch (error) {
            console.error('Fehler beim Abrufen der Fragen:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Kategorien für ein Spiel speichern
    router.post('/games/:gameId/categories', async (req, res) => {
        try {
            const { gameId } = req.params;
            const { categoryIds } = req.body;

            await db.query('DELETE FROM game_categories WHERE game_id = $1', [gameId]);

            for (let i = 0; i < categoryIds.length; i++) {
                await db.query(
                    'INSERT INTO game_categories (game_id, category_id, play_order) VALUES ($1, $2, $3)',
                    [gameId, categoryIds[i], i]
                );
            }

            await db.query('DELETE FROM questions WHERE game_id = $1', [gameId]);

            let questionOrder = 0;
            for (let i = 0; i < categoryIds.length; i++) {
                const categoryId = categoryIds[i];
                
                const templates = await db.query(
                    'SELECT * FROM question_templates WHERE category_id = $1',
                    [categoryId]
                );

                for (const template of templates.rows) {
                    await db.query(
                        'INSERT INTO questions (game_id, category_id, question_text, question_order, image_url) VALUES ($1, $2, $3, $4, $5)',
                        [gameId, categoryId, template.question_text, questionOrder, template.image_url]
                    );
                    questionOrder++;
                }
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Fehler beim Speichern der Kategorien:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Spieler für ein Spiel abrufen
    router.get('/games/:gameId/players', async (req, res) => {
        try {
            const { gameId } = req.params;
            const result = await db.query(
                'SELECT id, name, score FROM players WHERE game_id = $1 ORDER BY score DESC',
                [gameId]
            );
            res.json({ success: true, players: result.rows });
        } catch (error) {
            console.error('Fehler beim Abrufen der Spieler:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};