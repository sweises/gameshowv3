const crypto = require('crypto');

/**
 * Generiert eine eindeutige Session-ID
 */
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Holt einen Spieler anhand seiner Session-ID
 */
async function getPlayerBySession(db, sessionId) {
    try {
        const result = await db.query(
            'SELECT * FROM players WHERE session_id = $1',
            [sessionId]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Fehler beim Abrufen des Spielers:', error);
        return null;
    }
}

/**
 * Holt den aktuellen Game-State für einen Rejoin
 */
async function getGameStateForRejoin(db, gameId) {
    try {
        // Spiel-Info
        const gameResult = await db.query(
            'SELECT * FROM games WHERE id = $1',
            [gameId]
        );
        
        if (gameResult.rows.length === 0) {
            return null;
        }
        
        const game = gameResult.rows[0];
        
        // Aktuelle Kategorie
        const categoryResult = await db.query(
            `SELECT c.* FROM categories c 
             JOIN game_categories gc ON c.id = gc.category_id 
             WHERE gc.game_id = $1 
             ORDER BY gc.play_order 
             OFFSET $2 LIMIT 1`,
            [gameId, game.current_category_index]
        );
        
        const category = categoryResult.rows[0] || null;
        
        // Aktuelle Frage
        let question = null;
        if (category) {
            const questionResult = await db.query(
                `SELECT * FROM questions 
                 WHERE game_id = $1 AND category_id = $2 
                 ORDER BY question_order 
                 OFFSET $3 LIMIT 1`,
                [gameId, category.id, game.current_question_index]
            );
            question = questionResult.rows[0] || null;
        }
        
        // Alle Spieler
        const playersResult = await db.query(
            'SELECT id, name, score FROM players WHERE game_id = $1 ORDER BY score DESC',
            [gameId]
        );
        
        // Buzzer-Status prüfen
        let buzzerLocked = false;
        let buzzerPlayer = null;
        
        if (question) {
            const buzzResult = await db.query(
                `SELECT p.id, p.name FROM buzzes b 
                 JOIN players p ON b.player_id = p.id 
                 WHERE b.game_id = $1 AND b.question_id = $2`,
                [gameId, question.id]
            );
            
            if (buzzResult.rows.length > 0) {
                buzzerLocked = true;
                buzzerPlayer = buzzResult.rows[0];
            }
        }
        
        return {
            game,
            category,
            question,
            players: playersResult.rows,
            buzzerLocked,
            buzzerPlayer
        };
    } catch (error) {
        console.error('Fehler beim Abrufen des Game-State:', error);
        return null;
    }
}

/**
 * Aktualisiert den Socket und Last-Seen für einen Spieler
 */
async function updatePlayerConnection(db, playerId, socketId, questionId = null) {
    try {
        const updates = ['socket_id = $1', 'disconnect_at = NULL'];
        const params = [socketId, playerId];
        
        if (questionId) {
            updates.push('last_seen_question_id = $' + (params.length + 1));
            params.push(questionId);
        }
        
        await db.query(
            `UPDATE players SET ${updates.join(', ')} WHERE id = $2`,
            params
        );
        
        return true;
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Verbindung:', error);
        return false;
    }
}

module.exports = {
    generateSessionId,
    getPlayerBySession,
    getGameStateForRejoin,
    updatePlayerConnection
};