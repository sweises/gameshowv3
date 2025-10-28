function setupGameSocket(io, db) {
    io.on('connection', (socket) => {
        console.log('✅ Neuer Client verbunden:', socket.id);

        // Event: Raum erstellen (Host)
        socket.on('create-room', async (data, callback) => {
            try {
                const { hostName } = data;
                const roomCode = generateRoomCode();

                const result = await db.query(
                    'INSERT INTO games (room_code, host_name, status) VALUES ($1, $2, $3) RETURNING *',
                    [roomCode, hostName, 'lobby']
                );

                const game = result.rows[0];
                socket.join(roomCode);
                socket.gameId = game.id;
                socket.roomCode = roomCode;
                socket.isHost = true;

                callback({ success: true, roomCode, gameId: game.id });
                console.log(`🎮 Raum erstellt: ${roomCode} von ${hostName}`);
            } catch (error) {
                console.error('Fehler beim Erstellen des Raums:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Raum beitreten (Spieler)
        socket.on('join-room', async (data, callback) => {
            try {
                const { roomCode, playerName } = data;

                const gameResult = await db.query(
                    'SELECT * FROM games WHERE room_code = $1',
                    [roomCode]
                );

                if (gameResult.rows.length === 0) {
                    return callback({ success: false, error: 'Raum nicht gefunden' });
                }

                const game = gameResult.rows[0];

                if (game.status !== 'lobby') {
                    return callback({ success: false, error: 'Spiel läuft bereits' });
                }

                const playerResult = await db.query(
                    'INSERT INTO players (game_id, name, socket_id) VALUES ($1, $2, $3) RETURNING *',
                    [game.id, playerName, socket.id]
                );

                const player = playerResult.rows[0];
                socket.join(roomCode);
                socket.gameId = game.id;
                socket.playerId = player.id;
                socket.roomCode = roomCode;

                const playersResult = await db.query(
                    'SELECT id, name, score FROM players WHERE game_id = $1 ORDER BY joined_at',
                    [game.id]
                );

                io.to(roomCode).emit('players-update', {
                    players: playersResult.rows
                });

                callback({ success: true, playerId: player.id, gameId: game.id });
                console.log(`👤 ${playerName} ist Raum ${roomCode} beigetreten`);
            } catch (error) {
                console.error('Fehler beim Beitreten:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Spiel starten (Host)
        socket.on('start-game', async (callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann starten' });
                }

                await db.query(
                    'UPDATE games SET status = $1 WHERE id = $2',
                    ['playing', socket.gameId]
                );

                // Hole erste Kategorie
                const categoryResult = await db.query(
                    'SELECT c.* FROM categories c JOIN game_categories gc ON c.id = gc.category_id WHERE gc.game_id = $1 ORDER BY gc.play_order LIMIT 1',
                    [socket.gameId]
                );

                if (categoryResult.rows.length === 0) {
                    return callback({ success: false, error: 'Keine Kategorien ausgewählt' });
                }

                const category = categoryResult.rows[0];

                // Sende Kategorie-Intro (bleibt bis Host bestätigt)
                io.to(socket.roomCode).emit('category-intro', {
                    category: {
                        id: category.id,
                        name: category.name,
                        icon: category.icon,
                        description: category.description
                    }
                });

                callback({ success: true });
                console.log(`🎮 Spiel gestartet in Raum ${socket.roomCode}`);
            } catch (error) {
                console.error('Fehler beim Starten:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Kategorie bestätigen und erste Frage zeigen
        socket.on('start-category', async (callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann starten' });
                }

                const gameResult = await db.query(
                    'SELECT * FROM games WHERE id = $1',
                    [socket.gameId]
                );

                const game = gameResult.rows[0];

                // Hole aktuelle Kategorie
                const categoryResult = await db.query(
                    'SELECT c.* FROM categories c JOIN game_categories gc ON c.id = gc.category_id WHERE gc.game_id = $1 ORDER BY gc.play_order OFFSET $2 LIMIT 1',
                    [socket.gameId, game.current_category_index]
                );

                if (categoryResult.rows.length === 0) {
                    return callback({ success: false, error: 'Keine Kategorie gefunden' });
                }

                const category = categoryResult.rows[0];

                // Hole erste Frage dieser Kategorie (basierend auf current_question_index)
                const questionResult = await db.query(
                    'SELECT * FROM questions WHERE game_id = $1 AND category_id = $2 ORDER BY question_order OFFSET $3 LIMIT 1',
                    [socket.gameId, category.id, game.current_question_index]
                );

                if (questionResult.rows.length === 0) {
                    return callback({ success: false, error: 'Keine Fragen vorhanden' });
                }

                const question = questionResult.rows[0];

                io.to(socket.roomCode).emit('category-started', {
                    question: {
                        id: question.id,
                        text: question.question_text,
                        order: question.question_order
                    },
                    category: {
                        id: category.id,
                        name: category.name,
                        icon: category.icon
                    }
                });

                callback({ success: true });
                console.log(`▶️ Kategorie gestartet in Raum ${socket.roomCode}`);
            } catch (error) {
                console.error('Fehler beim Starten der Kategorie:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: BUZZER! 🔴
        socket.on('buzz', async (callback) => {
            try {
                const gameResult = await db.query(
                    'SELECT * FROM games WHERE id = $1',
                    [socket.gameId]
                );

                const game = gameResult.rows[0];

                if (game.status !== 'playing') {
                    return callback({ success: false, error: 'Spiel läuft nicht' });
                }

                // Hole aktuelle Frage
                const questionResult = await db.query(
                    'SELECT * FROM questions WHERE game_id = $1 ORDER BY question_order OFFSET $2 LIMIT 1',
                    [socket.gameId, game.current_question_index]
                );

                const question = questionResult.rows[0];

                // Prüfe ob schon jemand gebuzzert hat
                const buzzCheck = await db.query(
                    'SELECT * FROM buzzes WHERE game_id = $1 AND question_id = $2',
                    [socket.gameId, question.id]
                );

                if (buzzCheck.rows.length > 0) {
                    return callback({ success: false, error: 'Jemand hat bereits gebuzzert' });
                }

                // Speichere Buzz
                await db.query(
                    'INSERT INTO buzzes (game_id, question_id, player_id) VALUES ($1, $2, $3)',
                    [socket.gameId, question.id, socket.playerId]
                );

                // Hole Spieler-Info
                const playerResult = await db.query(
                    'SELECT * FROM players WHERE id = $1',
                    [socket.playerId]
                );

                const player = playerResult.rows[0];

                // Informiere ALLE über den Buzz
                io.to(socket.roomCode).emit('player-buzzed', {
                    playerId: player.id,
                    playerName: player.name,
                    timestamp: new Date()
                });

                callback({ success: true });
                console.log(`🔴 ${player.name} hat gebuzzert!`);
            } catch (error) {
                console.error('Fehler beim Buzzen:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Antwort bewerten (Host)
        socket.on('judge-answer', async (data, callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann bewerten' });
                }

                const { playerId, correct } = data;
                const points = correct ? 1 : 0;

                // Hole Spieler-Info
                const playerResult = await db.query(
                    'SELECT * FROM players WHERE id = $1',
                    [playerId]
                );

                const player = playerResult.rows[0];

                if (correct) {
                    // Punkte vergeben
                    await db.query(
                        'UPDATE players SET score = score + $1 WHERE id = $2',
                        [points, playerId]
                    );
                }

                // Hole alle Spieler mit aktuellen Punkten
                const playersResult = await db.query(
                    'SELECT id, name, score FROM players WHERE game_id = $1 ORDER BY score DESC',
                    [socket.gameId]
                );

                io.to(socket.roomCode).emit('scores-update', {
                    players: playersResult.rows
                });

                // Sende Ergebnis zurück MIT Spielername
                io.to(socket.roomCode).emit('answer-judged', {
                    correct,
                    playerId,
                    playerName: player.name,
                    points
                });

                callback({ success: true, correct });
                console.log(`⭐ Antwort ${correct ? 'richtig' : 'falsch'} für Spieler ${player.name}`);
            } catch (error) {
                console.error('Fehler beim Bewerten:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Buzzer freigeben nach falscher Antwort
        socket.on('unlock-buzzer', async (callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann freigeben' });
                }

                const gameResult = await db.query(
                    'SELECT * FROM games WHERE id = $1',
                    [socket.gameId]
                );

                const game = gameResult.rows[0];

                // Hole aktuelle Frage
                const questionResult = await db.query(
                    'SELECT * FROM questions WHERE game_id = $1 ORDER BY question_order OFFSET $2 LIMIT 1',
                    [socket.gameId, game.current_question_index]
                );

                if (questionResult.rows.length > 0) {
                    const question = questionResult.rows[0];

                    // Lösche alle Buzzes für diese Frage
                    await db.query(
                        'DELETE FROM buzzes WHERE game_id = $1 AND question_id = $2',
                        [socket.gameId, question.id]
                    );

                    console.log(`🗑️ Buzzes gelöscht für Frage ${question.id}`);
                }

                // Informiere alle, dass Buzzer wieder frei ist
                io.to(socket.roomCode).emit('buzzer-unlocked');

                callback({ success: true });
                console.log(`🔓 Buzzer freigegeben in Raum ${socket.roomCode}`);
            } catch (error) {
                console.error('Fehler beim Freigeben:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Nächste Frage (Host)
        socket.on('next-question', async (callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann weiter' });
                }

                // Erhöhe Fragen-Index
                await db.query(
                    'UPDATE games SET current_question_index = current_question_index + 1 WHERE id = $1',
                    [socket.gameId]
                );

                const gameResult = await db.query(
                    'SELECT * FROM games WHERE id = $1',
                    [socket.gameId]
                );

                const game = gameResult.rows[0];

                // Hole aktuelle Kategorie
                const currentCategoryResult = await db.query(
                    'SELECT c.* FROM categories c JOIN game_categories gc ON c.id = gc.category_id WHERE gc.game_id = $1 ORDER BY gc.play_order OFFSET $2 LIMIT 1',
                    [socket.gameId, game.current_category_index]
                );

                const currentCategory = currentCategoryResult.rows[0];

                // Zähle Fragen in aktueller Kategorie
                const questionCountResult = await db.query(
                    'SELECT COUNT(*) as count FROM questions WHERE game_id = $1 AND category_id = $2',
                    [socket.gameId, currentCategory.id]
                );

                const totalQuestionsInCategory = parseInt(questionCountResult.rows[0].count);

                // Prüfe ob wir alle Fragen dieser Kategorie durchhaben
                if (game.current_question_index >= totalQuestionsInCategory) {
                    // Gehe zur nächsten Kategorie
                    await db.query(
                        'UPDATE games SET current_category_index = current_category_index + 1, current_question_index = 0 WHERE id = $1',
                        [socket.gameId]
                    );

                    const updatedGame = await db.query(
                        'SELECT * FROM games WHERE id = $1',
                        [socket.gameId]
                    );

                    // Hole nächste Kategorie
                    const nextCategoryResult = await db.query(
                        'SELECT c.* FROM categories c JOIN game_categories gc ON c.id = gc.category_id WHERE gc.game_id = $1 ORDER BY gc.play_order OFFSET $2 LIMIT 1',
                        [socket.gameId, updatedGame.rows[0].current_category_index]
                    );

                    if (nextCategoryResult.rows.length === 0) {
                        // Keine Kategorien mehr - Spiel beenden
                        await db.query(
                            'UPDATE games SET status = $1 WHERE id = $2',
                            ['finished', socket.gameId]
                        );

                        const finalScores = await db.query(
                            'SELECT id, name, score FROM players WHERE game_id = $1 ORDER BY score DESC',
                            [socket.gameId]
                        );

                        io.to(socket.roomCode).emit('game-finished', {
                            players: finalScores.rows
                        });

                        return callback({ success: true, finished: true });
                    }

                    const nextCategory = nextCategoryResult.rows[0];

                    // Zeige Kategorie-Wechsel (bleibt bis Host bestätigt)
                    io.to(socket.roomCode).emit('category-intro', {
                        category: {
                            id: nextCategory.id,
                            name: nextCategory.name,
                            icon: nextCategory.icon,
                            description: nextCategory.description
                        }
                    });

                    return callback({ success: true, categoryChange: true });
                }

                // Normale nächste Frage in gleicher Kategorie
                const questionResult = await db.query(
                    'SELECT * FROM questions WHERE game_id = $1 AND category_id = $2 ORDER BY question_order OFFSET $3 LIMIT 1',
                    [socket.gameId, currentCategory.id, game.current_question_index]
                );

                const question = questionResult.rows[0];

                io.to(socket.roomCode).emit('next-question', {
                    question: {
                        id: question.id,
                        text: question.question_text,
                        order: question.question_order
                    },
                    category: {
                        id: currentCategory.id,
                        name: currentCategory.name,
                        icon: currentCategory.icon
                    }
                });

                callback({ success: true, finished: false, categoryChange: false });
                console.log(`➡️ Nächste Frage in Raum ${socket.roomCode}`);
            } catch (error) {
                console.error('Fehler bei nächster Frage:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Disconnect Handler
        socket.on('disconnect', () => {
            console.log('❌ Client getrennt:', socket.id);
            
            if (socket.playerId) {
                db.query('DELETE FROM players WHERE socket_id = $1', [socket.id]);
                
                if (socket.roomCode) {
                    db.query(
                        'SELECT id, name, score FROM players WHERE game_id = $1',
                        [socket.gameId]
                    ).then(result => {
                        io.to(socket.roomCode).emit('players-update', {
                            players: result.rows
                        });
                    });
                }
            }
        });
    });
}

// Hilfsfunktion: 6-stelliger Room Code
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

module.exports = setupGameSocket;