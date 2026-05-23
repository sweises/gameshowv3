const { generateSessionId, getPlayerBySession, getGameStateForRejoin, updatePlayerConnection } = require('../utils/Sessionutils');
function setupGameSocket(io, db) {
    io.on('connection', (socket) => {
        console.log('✅ Neuer Client verbunden:', socket.id);

        // Event: Raum erstellen (Host)
        // Event: Raum erstellen (Host)
        socket.on('create-room', async (data, callback) => {
            try {
                const { hostName } = data;
                const roomCode = generateRoomCode();
                const hostSessionId = generateSessionId(); // NEU: echte Host-Session

                const result = await db.query(
                    'INSERT INTO games (room_code, host_name, status, host_session_id) VALUES ($1, $2, $3, $4) RETURNING *',
                    [roomCode, hostName, 'lobby', hostSessionId]
                );

                const game = result.rows[0];
                socket.join(roomCode);
                socket.gameId = game.id;
                socket.roomCode = roomCode;
                socket.isHost = true;

                // NEU: hostSessionId ans Host-Gerät zurückgeben
                callback({ success: true, roomCode, gameId: game.id, hostSessionId });
                console.log(`🎮 Raum erstellt: ${roomCode} von ${hostName}`);
            } catch (error) {
                console.error('Fehler beim Erstellen des Raums:', error);
                callback({ success: false, error: error.message });
            }
        });
// NEU: Event zum Wiederverbinden mit existierender Session
socket.on('rejoin-game', async (data, callback) => {
    try {
        const { sessionId } = data;

        // Suche Spieler anhand Session-ID
        const player = await getPlayerBySession(db, sessionId);
        
        if (!player) {
            return callback({ 
                success: false, 
                error: 'Session nicht gefunden oder abgelaufen' 
            });
        }

        // Prüfe ob Spiel noch läuft
        const gameResult = await db.query(
            'SELECT * FROM games WHERE id = $1',
            [player.game_id]
        );

        if (gameResult.rows.length === 0) {
            return callback({ 
                success: false, 
                error: 'Spiel nicht mehr verfügbar' 
            });
        }

        const game = gameResult.rows[0];

        // Aktualisiere Socket-ID
        await updatePlayerConnection(db, player.id, socket.id);

        // Socket-Variablen setzen
        socket.join(game.room_code);
        socket.gameId = game.id;
        socket.playerId = player.id;
        socket.roomCode = game.room_code;

        // Hole vollständigen Game-State
        const gameState = await getGameStateForRejoin(db, game.id);

        if (!gameState) {
            return callback({ 
                success: false, 
                error: 'Konnte Spielstand nicht laden' 
            });
        }

        callback({ 
            success: true, 
            playerId: player.id,
            gameId: game.id,
            roomCode: game.room_code,
            gameState: {
                status: game.status,
                category: gameState.category ? {
                    id: gameState.category.id,
                    name: gameState.category.name,
                    icon: gameState.category.icon,
                    description: gameState.category.description,
                    type: gameState.category.category_type || 'buzzer'
                } : null,
                question: gameState.question ? {
                    id: gameState.question.id,
                    text: gameState.question.question_text,
                    order: gameState.question.question_order,
                    image_url: gameState.question.image_url
                } : null,
                players: gameState.players,
                buzzerLocked: gameState.buzzerLocked,
                buzzerPlayer: gameState.buzzerPlayer
            }
        });

        // Informiere andere Spieler über Rejoin
        io.to(game.room_code).emit('player-rejoined', {
            playerId: player.id,
            playerName: player.name
        });

        console.log(`🔄 ${player.name} ist wieder verbunden mit Raum ${game.room_code}`);
    } catch (error) {
        console.error('Fehler beim Rejoin:', error);
        callback({ success: false, error: error.message });
    }
});

// NEU: Host-Wiederverbindung
        socket.on('rejoin-host', async (data, callback) => {
            try {
                const { hostSessionId } = data;

                if (!hostSessionId) {
                    return callback({ success: false, error: 'Keine Host-Session angegeben' });
                }

                // Spiel anhand der Host-Session finden
                const gameResult = await db.query(
                    'SELECT * FROM games WHERE host_session_id = $1',
                    [hostSessionId]
                );

                if (gameResult.rows.length === 0) {
                    return callback({ success: false, error: 'Host-Session nicht gefunden oder Spiel beendet' });
                }

                const game = gameResult.rows[0];

                // Kern des Fixes: Host-Status auf dem neuen Socket wiederherstellen
                socket.join(game.room_code);
                socket.gameId = game.id;
                socket.roomCode = game.room_code;
                socket.isHost = true;

                // Vollständigen Spielstand laden (gleiche Funktion wie beim Spieler-Rejoin)
                const gameState = await getGameStateForRejoin(db, game.id);

                if (!gameState) {
                    return callback({ success: false, error: 'Konnte Spielstand nicht laden' });
                }

                callback({
                    success: true,
                    gameId: game.id,
                    roomCode: game.room_code,
                    gameState: {
                        status: game.status,
                        category: gameState.category ? {
                            id: gameState.category.id,
                            name: gameState.category.name,
                            icon: gameState.category.icon,
                            description: gameState.category.description,
                            type: gameState.category.category_type || 'buzzer'
                        } : null,
                        question: gameState.question ? {
                            id: gameState.question.id,
                            text: gameState.question.question_text,
                            order: gameState.question.question_order,
                            image_url: gameState.question.image_url
                        } : null,
                        players: gameState.players,
                        buzzerLocked: gameState.buzzerLocked,
                        buzzerPlayer: gameState.buzzerPlayer
                    }
                });

                console.log(`🔄 Host ist wieder verbunden mit Raum ${game.room_code}`);
            } catch (error) {
                console.error('Fehler beim Host-Rejoin:', error);
                callback({ success: false, error: error.message });
            }
        });
        // Event: Raum beitreten (Spieler)
        socket.on('join-room', async (data, callback) => {
            try {
                const { roomCode, playerName } = data;
                const sessionId = generateSessionId();
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
    'INSERT INTO players (game_id, name, socket_id, session_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [game.id, playerName, socket.id, sessionId]
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

                callback({ success: true, playerId: player.id, gameId: game.id, sessionId: sessionId });
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
                        `INSERT INTO questions (game_id, category_id, question_text, question_order, image_url)
                         SELECT $1, category_id, question_text, 
                                ROW_NUMBER() OVER (ORDER BY id) - 1,
                                image_url
                         FROM question_templates 
                         WHERE category_id = $2`,
                        [socket.gameId, category.id]
                    );
                    
                    console.log('✅ Fragen von Templates kopiert (inkl. Bilder)');
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
                        order: question.question_order,
                        image_url: question.image_url  // ← NEU!
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
        // Event: BUZZER! 🔴 (nur für buzzer-Kategorien)
        socket.on('buzz', async (callback) => {
            try {
                const gameResult = await db.query(
                    'SELECT * FROM games WHERE id = $1',
                    [socket.gameId]
                );

                const game = gameResult.rows[0];

                if (!game || game.status !== 'playing') {
                    return callback({ success: false, error: 'Spiel läuft nicht' });
                }

                const questionResult = await db.query(
                    'SELECT * FROM questions WHERE game_id = $1 ORDER BY question_order OFFSET $2 LIMIT 1',
                    [socket.gameId, game.current_question_index]
                );

                const question = questionResult.rows[0];

                if (!question) {
                    return callback({ success: false, error: 'Keine aktive Frage' });
                }

                try {
                    await db.query(
                        'INSERT INTO buzzes (game_id, question_id, player_id) VALUES ($1, $2, $3)',
                        [socket.gameId, question.id, socket.playerId]
                    );
                } catch (insertError) {
                    if (insertError.code === '23505') {
                        // UNIQUE-Verletzung = jemand war schneller
                        return callback({ success: false, error: 'Jemand hat bereits gebuzzert' });
                    }
                    throw insertError; // andere Fehler normal weiterreichen
                }

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

        // Event: Text-Antwort abgeben (für text_input Kategorien)
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

        // Event: Alle Text-Antworten abrufen (für Host)
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

        // Event: Text-Antworten bewerten (Host)
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

        // ============================================
        // 🎰 GLÜCKSRAD EVENTS - NEU!
        // ============================================

        // Event: Nächste Frage (mit Glücksrad-Chance)
        socket.on('next-question', async (callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann weiter' });
                }

                // ============================================
                // 🎰 GLÜCKSRAD WAHRSCHEINLICHKEIT
                // ============================================
                // Ändere den Wert hier um die Wahrscheinlichkeit anzupassen:
                // 0.05 = 5%, 0.1 = 10%, 0.2 = 20%, 0.5 = 50%, 1.0 = 100%
                const wheelChance = Math.random();
                const triggerWheel = wheelChance < 0.2;  // ← HIER ÄNDERN!

                console.log(`🎲 Würfel: ${(wheelChance * 100).toFixed(1)}% - Glücksrad: ${triggerWheel ? 'JA 🎰' : 'NEIN'}`);

                if (triggerWheel) {
                    // Hole alle Spieler für das Glücksrad
                    const playersResult = await db.query(
                        'SELECT id, name, score FROM players WHERE game_id = $1',
                        [socket.gameId]
                    );

                    callback({ success: true, showWheel: true });

                    // Zeige Glücksrad nur dem Host
                    io.to(socket.roomCode).emit('wheel-triggered', {
                        players: playersResult.rows
                    });

                    console.log('🎰 Glücksrad wird gezeigt!');
                    return;
                }

                // Normale Fortsetzung ohne Glücksrad
                await proceedToNextQuestion(socket, callback, io, db);

            } catch (error) {
                console.error('Fehler bei nächster Frage:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Spieler-Rad drehen
        socket.on('spin-player-wheel', async (callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann drehen' });
                }

                const playersResult = await db.query(
                    'SELECT id, name, score FROM players WHERE game_id = $1',
                    [socket.gameId]
                );

                const players = playersResult.rows;
                const selectedPlayer = players[Math.floor(Math.random() * players.length)];

                callback({ success: true, selectedPlayer });

                // WICHTIG: Warte 6 Sekunden bevor Ergebnis gesendet wird
                setTimeout(() => {
                    io.to(socket.roomCode).emit('player-selected', {
                        player: selectedPlayer
                    });
                    console.log(`🎯 Spieler ausgewählt: ${selectedPlayer.name}`);
                }, 6000);

            } catch (error) {
                console.error('Fehler beim Spieler-Rad:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Spieler Entscheidung (Zocken oder Passen)
        socket.on('wheel-player-decision', async (data, callback) => {
            try {
                const { playerId, decision } = data;

                if (decision === 'pass') {
                    callback({ success: true, passed: true });
                    
                    io.to(socket.roomCode).emit('player-passed', {
                        playerId
                    });

                    console.log(`🚫 Spieler hat gepasst`);
                } else {
                    callback({ success: true, passed: false });
                    
                    io.to(socket.roomCode).emit('player-accepted', {
                        playerId
                    });

                    console.log(`✅ Spieler zockt!`);
                }
            } catch (error) {
                console.error('Fehler bei Entscheidung:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Strafen/Punkte-Rad drehen
        socket.on('spin-reward-wheel', async (callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann drehen' });
                }

                // 50% Chance auf Strafe oder Punkte
                const isPunishment = Math.random() < 0.5;

                let result;

                if (isPunishment) {
                    // Hole zufällige Strafe aus Datenbank
                    const punishmentResult = await db.query(
                        'SELECT * FROM punishment_templates ORDER BY RANDOM() LIMIT 1'
                    );

                    if (punishmentResult.rows.length === 0) {
                        // Fallback wenn keine Strafen in DB
                        result = {
                            type: 'punishment',
                            text: 'Eine Runde aussetzen',
                            duration: 1,
                            icon: '⚠️'
                        };
                    } else {
                        const punishment = punishmentResult.rows[0];
                        result = {
                            type: 'punishment',
                            text: punishment.text,
                            duration: punishment.duration_questions,
                            icon: punishment.icon
                        };
                    }
                } else {
                    // Punkte vergeben (4x +1, 3x +2, 2x +3, 1x Bonus)
                    const pointsDistribution = [
                        1, 1, 1, 1,  // 4x +1
                        2, 2, 2,      // 3x +2
                        3, 3,         // 2x +3
                        5             // 1x Bonus
                    ];
                    const points = pointsDistribution[Math.floor(Math.random() * pointsDistribution.length)];

                    result = {
                        type: 'points',
                        points: points,
                        icon: points === 5 ? '🎁' : '⭐'
                    };
                }

                callback({ success: true, result });

                // WICHTIG: Warte 6 Sekunden bevor Ergebnis gesendet wird
                setTimeout(() => {
                    io.to(socket.roomCode).emit('reward-result', {
                        result
                    });
                    console.log(`🎰 Ergebnis: ${result.type === 'punishment' ? result.text : `+${result.points} Punkte`}`);
                }, 6000);

            } catch (error) {
                console.error('Fehler beim Reward-Rad:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Glücksrad-Ergebnis anwenden
        socket.on('apply-wheel-result', async (data, callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann anwenden' });
                }

                const { playerId, result } = data;

                if (result.type === 'points') {
                    // Punkte vergeben
                    await db.query(
                        'UPDATE players SET score = score + $1 WHERE id = $2',
                        [result.points, playerId]
                    );

                    console.log(`✅ ${result.points} Punkte vergeben`);
                } else if (result.type === 'punishment') {
                    // Strafe speichern
                    await db.query(
                        'INSERT INTO active_punishments (player_id, game_id, punishment_text, remaining_questions) VALUES ($1, $2, $3, $4)',
                        [playerId, socket.gameId, result.text, result.duration]
                    );

                    console.log(`⚠️ Strafe aktiviert: ${result.text}`);
                }

                // Aktualisierte Spielerliste
                const playersResult = await db.query(
                    'SELECT id, name, score FROM players WHERE game_id = $1 ORDER BY score DESC',
                    [socket.gameId]
                );

                // Aktive Strafen abrufen
                const punishmentsResult = await db.query(
                    'SELECT * FROM active_punishments WHERE game_id = $1 AND remaining_questions > 0',
                    [socket.gameId]
                );

                callback({ success: true });

                io.to(socket.roomCode).emit('scores-update', {
                    players: playersResult.rows
                });

                io.to(socket.roomCode).emit('punishments-update', {
                    punishments: punishmentsResult.rows
                });

                // Jetzt zur nächsten Frage übergehen
                await proceedToNextQuestion(socket, () => {}, io, db);

            } catch (error) {
                console.error('Fehler beim Anwenden:', error);
                callback({ success: false, error: error.message });
            }
        });

        // Event: Glücksrad überspringen (bei Pass)
        socket.on('skip-wheel', async (callback) => {
            try {
                if (!socket.isHost) {
                    return callback({ success: false, error: 'Nur Host kann überspringen' });
                }

                callback({ success: true });
                await proceedToNextQuestion(socket, () => {}, io, db);
            } catch (error) {
                console.error('Fehler beim Überspringen:', error);
                callback({ success: false, error: error.message });
            }
        });

       // Disconnect Handler - NICHT mehr löschen, nur markieren
          socket.on('disconnect', () => {
            console.log('❌ Client getrennt:', socket.id);
            if (socket.playerId) {
                db.query(
                    'UPDATE players SET disconnect_at = CURRENT_TIMESTAMP WHERE id = $1',
                    [socket.playerId]
                ).then(() => {
                    console.log(`⏸️  Spieler ${socket.playerId} disconnect markiert (kann rejoinen)`);
                });
            }
        });

    });
};
// Hilfsfunktion: Zur nächsten Frage übergehen
async function proceedToNextQuestion(socket, callback, io, db) {
    await db.query(
        'UPDATE games SET current_question_index = current_question_index + 1 WHERE id = $1',
        [socket.gameId]
    );

    // Strafen-Countdown aktualisieren
    await db.query(
        'UPDATE active_punishments SET remaining_questions = remaining_questions - 1 WHERE game_id = $1 AND remaining_questions > 0',
        [socket.gameId]
    );

    // Abgelaufene Strafen entfernen
    await db.query(
        'DELETE FROM active_punishments WHERE game_id = $1 AND remaining_questions <= 0',
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
            order: question.question_order,
            image_url: question.image_url  // ← NEU!
        },
        category: {
            id: currentCategory.id,
            name: currentCategory.name,
            icon: currentCategory.icon,
            type: currentCategory.category_type || 'buzzer'
        }
    });

    console.log(`➡️ Nächste Frage`);
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