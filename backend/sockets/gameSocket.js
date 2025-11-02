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

                callback({ success: true });
                
                setTimeout(() => {
                    io.to(socket.roomCode).emit('category-intro', {
                        category: {
                            id: category.id,
                            name: category.name,
                            icon: category.icon,
                            description: category.description,
                            type: category.category_type || 'buzzer'
                        }
                    });
                    console.log(`🎮 Spiel gestartet - Kategorie: ${category.name} (${category.category_type})`);
                }, 100);

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

                const categoryResult = await db.query(
                    'SELECT c.* FROM categories c JOIN game_categories gc ON c.id = gc.category_id WHERE gc.game_id = $1 ORDER BY gc.play_order OFFSET $2 LIMIT 1',
                    [socket.gameId, game.current_category_index]
                );

                if (categoryResult.rows.length === 0) {
                    return callback({ success: false, error: 'Keine Kategorie gefunden' });
                }

                const category = categoryResult.rows[0];
                console.log('🔍 Kategorie-Typ aus DB:', category.category_type);

                // Prüfe ob Fragen für diese Kategorie im Spiel existieren
                const existingQuestionsCheck = await db.query(
                    'SELECT COUNT(*) as count FROM questions WHERE game_id = $1 AND category_id = $2',
                    [socket.gameId, category.id]
                );

                const questionCount = parseInt(existingQuestionsCheck.rows[0].count);
                console.log(`📊 Fragen in Spiel für Kategorie ${category.name}: ${questionCount}`);

                // Falls keine Fragen existieren, kopiere sie von templates
                if (questionCount === 0) {
                    console.log('⚠️  Keine Fragen gefunden - kopiere von Templates...');
                    
                    await db.query(
                        `INSERT INTO questions (game_id, category_id, question_text, question_order)
                         SELECT $1, category_id, question_text, 
                                ROW_NUMBER() OVER (ORDER BY id) - 1
                         FROM question_templates 
                         WHERE category_id = $2`,
                        [socket.gameId, category.id]
                    );
                    
                    console.log('✅ Fragen von Templates kopiert');
                }

                const questionResult = await db.query(
                    'SELECT * FROM questions WHERE game_id = $1 AND category_id = $2 ORDER BY question_order OFFSET $3 LIMIT 1',
                    [socket.gameId, category.id, game.current_question_index]
                );

                if (questionResult.rows.length === 0) {
                    return callback({ success: false, error: 'Keine Fragen vorhanden - Templates prüfen!' });
                }

                const question = questionResult.rows[0];

                callback({ success: true });

                const categoryData = {
                    question: {
                        id: question.id,
                        text: question.question_text,
                        order: question.question_order
                    },
                    category: {
                        id: category.id,
                        name: category.name,
                        icon: category.icon,
                        type: category.category_type || 'buzzer'
                    }
                };

                console.log('📤 Sende category-started mit Typ:', categoryData.category.type);

                io.to(socket.roomCode).emit('category-started', categoryData);

                console.log(`▶️ Kategorie ${category.name} (${category.category_type}) gestartet`);
            } catch (error) {
                console.error('Fehler beim Starten der Kategorie:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: BUZZER! 🔴 (nur für buzzer-Kategorien)
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

                const questionResult = await db.query(
                    'SELECT * FROM questions WHERE game_id = $1 ORDER BY question_order OFFSET $2 LIMIT 1',
                    [socket.gameId, game.current_question_index]
                );

                const question = questionResult.rows[0];

                const buzzCheck = await db.query(
                    'SELECT * FROM buzzes WHERE game_id = $1 AND question_id = $2',
                    [socket.gameId, question.id]
                );

                if (buzzCheck.rows.length > 0) {
                    return callback({ success: false, error: 'Jemand hat bereits gebuzzert' });
                }

                await db.query(
                    'INSERT INTO buzzes (game_id, question_id, player_id) VALUES ($1, $2, $3)',
                    [socket.gameId, question.id, socket.playerId]
                );

                const playerResult = await db.query(
                    'SELECT * FROM players WHERE id = $1',
                    [socket.playerId]
                );

                const player = playerResult.rows[0];

                callback({ success: true });

                io.to(socket.roomCode).emit('player-buzzed', {
                    playerId: player.id,
                    playerName: player.name,
                    timestamp: new Date()
                });

                console.log(`🔴 ${player.name} hat gebuzzert!`);
            } catch (error) {
                console.error('Fehler beim Buzzen:', error);
                callback({ success: false, error: error.message });
            }
        });

        // NEU: Event: Text-Antwort abgeben (für text_input Kategorien)
        socket.on('submit-text-answer', async (data, callback) => {
            try {
                const { questionId, answerText } = data;

                if (!answerText || answerText.trim().length === 0) {
                    return callback({ success: false, error: 'Antwort darf nicht leer sein' });
                }

                // Prüfe ob Spieler schon geantwortet hat
                const existingAnswer = await db.query(
                    'SELECT * FROM text_answers WHERE game_id = $1 AND question_id = $2 AND player_id = $3',
                    [socket.gameId, questionId, socket.playerId]
                );

                if (existingAnswer.rows.length > 0) {
                    return callback({ success: false, error: 'Du hast bereits geantwortet' });
                }

                // Speichere Antwort
                await db.query(
                    'INSERT INTO text_answers (game_id, question_id, player_id, answer_text) VALUES ($1, $2, $3, $4)',
                    [socket.gameId, questionId, socket.playerId, answerText.trim()]
                );

                const playerResult = await db.query(
                    'SELECT * FROM players WHERE id = $1',
                    [socket.playerId]
                );

                const player = playerResult.rows[0];

                callback({ success: true });

                // Informiere Host über neue Antwort
                io.to(socket.roomCode).emit('text-answer-submitted', {
                    playerId: player.id,
                    playerName: player.name,
                    questionId
                });

                console.log(`📝 ${player.name} hat Text-Antwort abgegeben`);
            } catch (error) {
                console.error('Fehler beim Speichern der Text-Antwort:', error);
                callback({ success: false, error: error.message });
            }
        });

        // NEU: Event: Alle Text-Antworten abrufen (für Host)
        socket.on('get-text-answers', async (data, callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann Antworten sehen' });
                }

                const { questionId } = data;

                const answersResult = await db.query(
                    `SELECT ta.*, p.name as player_name 
                     FROM text_answers ta 
                     JOIN players p ON ta.player_id = p.id 
                     WHERE ta.game_id = $1 AND ta.question_id = $2 
                     ORDER BY ta.submitted_at`,
                    [socket.gameId, questionId]
                );

                callback({ 
                    success: true, 
                    answers: answersResult.rows 
                });
            } catch (error) {
                console.error('Fehler beim Abrufen der Antworten:', error);
                callback({ success: false, error: error.message });
            }
        });

        // NEU: Event: Text-Antworten bewerten (Host)
        socket.on('judge-text-answers', async (data, callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann bewerten' });
                }

                const { correctPlayerIds, questionId } = data;

                let awardedPoints = [];

                // Vergebe Punkte an alle korrekten Spieler
                for (const playerId of correctPlayerIds) {
                    await db.query(
                        'UPDATE players SET score = score + 1 WHERE id = $1',
                        [playerId]
                    );

                    await db.query(
                        'UPDATE text_answers SET is_correct = true, points_awarded = 1, judged_at = CURRENT_TIMESTAMP WHERE game_id = $1 AND question_id = $2 AND player_id = $3',
                        [socket.gameId, questionId, playerId]
                    );

                    const playerResult = await db.query(
                        'SELECT id, name, score FROM players WHERE id = $1',
                        [playerId]
                    );

                    awardedPoints.push(playerResult.rows[0]);
                }

                // Markiere falsche Antworten
                await db.query(
                    'UPDATE text_answers SET is_correct = false, judged_at = CURRENT_TIMESTAMP WHERE game_id = $1 AND question_id = $2 AND player_id != ALL($3)',
                    [socket.gameId, questionId, correctPlayerIds]
                );

                // Hole aktualisierte Spielerliste
                const playersResult = await db.query(
                    'SELECT id, name, score FROM players WHERE game_id = $1 ORDER BY score DESC',
                    [socket.gameId]
                );

                callback({ success: true, awardedPoints });

                // Update Scores für alle
                io.to(socket.roomCode).emit('scores-update', {
                    players: playersResult.rows
                });

                // Informiere über Bewertung
                io.to(socket.roomCode).emit('text-answers-judged', {
                    correctPlayerIds,
                    awardedPoints
                });

                console.log(`⭐ Text-Antworten bewertet - ${correctPlayerIds.length} Spieler bekommen Punkte`);
            } catch (error) {
                console.error('Fehler beim Bewerten:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Antwort bewerten (Host) - für Buzzer-Kategorien
        socket.on('judge-answer', async (data, callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann bewerten' });
                }

                const { playerId, correct } = data;
                const points = correct ? 1 : 0;

                const playerResult = await db.query(
                    'SELECT * FROM players WHERE id = $1',
                    [playerId]
                );

                const player = playerResult.rows[0];

                if (correct) {
                    await db.query(
                        'UPDATE players SET score = score + $1 WHERE id = $2',
                        [points, playerId]
                    );
                }

                const playersResult = await db.query(
                    'SELECT id, name, score FROM players WHERE game_id = $1 ORDER BY score DESC',
                    [socket.gameId]
                );

                callback({ 
                    success: true, 
                    correct,
                    playerName: player.name,
                    newScore: correct ? player.score + 1 : player.score
                });

                io.to(socket.roomCode).emit('scores-update', {
                    players: playersResult.rows
                });

                io.to(socket.roomCode).emit('answer-judged', {
                    correct,
                    playerId,
                    playerName: player.name,
                    points
                });

                console.log(`⭐ Antwort ${correct ? 'richtig ✅' : 'falsch ❌'} für Spieler ${player.name}`);
            } catch (error) {
                console.error('Fehler beim Bewerten:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Buzzer freigeben
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

                const questionResult = await db.query(
                    'SELECT * FROM questions WHERE game_id = $1 ORDER BY question_order OFFSET $2 LIMIT 1',
                    [socket.gameId, game.current_question_index]
                );

                if (questionResult.rows.length > 0) {
                    const question = questionResult.rows[0];

                    await db.query(
                        'DELETE FROM buzzes WHERE game_id = $1 AND question_id = $2',
                        [socket.gameId, question.id]
                    );
                }

                callback({ success: true });
                io.to(socket.roomCode).emit('buzzer-unlocked');
                console.log(`🔓 Buzzer freigegeben`);
            } catch (error) {
                console.error('Fehler beim Freigeben:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Nächste Frage
        socket.on('next-question', async (callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann weiter' });
                }

                await db.query(
                    'UPDATE games SET current_question_index = current_question_index + 1 WHERE id = $1',
                    [socket.gameId]
                );

                const gameResult = await db.query(
                    'SELECT * FROM games WHERE id = $1',
                    [socket.gameId]
                );

                const game = gameResult.rows[0];

                const currentCategoryResult = await db.query(
                    'SELECT c.* FROM categories c JOIN game_categories gc ON c.id = gc.category_id WHERE gc.game_id = $1 ORDER BY gc.play_order OFFSET $2 LIMIT 1',
                    [socket.gameId, game.current_category_index]
                );

                const currentCategory = currentCategoryResult.rows[0];

                const questionCountResult = await db.query(
                    'SELECT COUNT(*) as count FROM questions WHERE game_id = $1 AND category_id = $2',
                    [socket.gameId, currentCategory.id]
                );

                const totalQuestionsInCategory = parseInt(questionCountResult.rows[0].count);

                if (game.current_question_index >= totalQuestionsInCategory) {
                    await db.query(
                        'UPDATE games SET current_category_index = current_category_index + 1, current_question_index = 0 WHERE id = $1',
                        [socket.gameId]
                    );

                    const updatedGame = await db.query(
                        'SELECT * FROM games WHERE id = $1',
                        [socket.gameId]
                    );

                    const nextCategoryResult = await db.query(
                        'SELECT c.* FROM categories c JOIN game_categories gc ON c.id = gc.category_id WHERE gc.game_id = $1 ORDER BY gc.play_order OFFSET $2 LIMIT 1',
                        [socket.gameId, updatedGame.rows[0].current_category_index]
                    );

                    if (nextCategoryResult.rows.length === 0) {
                        await db.query(
                            'UPDATE games SET status = $1 WHERE id = $2',
                            ['finished', socket.gameId]
                        );

                        const finalScores = await db.query(
                            'SELECT id, name, score FROM players WHERE game_id = $1 ORDER BY score DESC',
                            [socket.gameId]
                        );

                        callback({ success: true, finished: true });

                        io.to(socket.roomCode).emit('game-finished', {
                            players: finalScores.rows
                        });

                        return;
                    }

                    const nextCategory = nextCategoryResult.rows[0];

                    callback({ success: true, categoryChange: true });

                    io.to(socket.roomCode).emit('category-intro', {
                        category: {
                            id: nextCategory.id,
                            name: nextCategory.name,
                            icon: nextCategory.icon,
                            description: nextCategory.description,
                            type: nextCategory.category_type || 'buzzer'
                        }
                    });

                    return;
                }

                const questionResult = await db.query(
                    'SELECT * FROM questions WHERE game_id = $1 AND category_id = $2 ORDER BY question_order OFFSET $3 LIMIT 1',
                    [socket.gameId, currentCategory.id, game.current_question_index]
                );

                const question = questionResult.rows[0];

                callback({ success: true, finished: false, categoryChange: false });

                io.to(socket.roomCode).emit('next-question', {
                    question: {
                        id: question.id,
                        text: question.question_text,
                        order: question.question_order
                    },
                    category: {
                        id: currentCategory.id,
                        name: currentCategory.name,
                        icon: currentCategory.icon,
                        type: currentCategory.category_type || 'buzzer'
                    }
                });

                console.log(`➡️ Nächste Frage`);
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

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

module.exports = setupGameSocket;