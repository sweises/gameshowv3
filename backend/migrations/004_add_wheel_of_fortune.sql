-- Migration 004: Wheel of Fortune
-- Fügt Glücksrad-Feature hinzu

-- Strafen-Templates
CREATE TABLE IF NOT EXISTS punishment_templates (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    duration_questions INTEGER DEFAULT 1,
    icon VARCHAR(10) DEFAULT '⚠️',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Aktive Strafen (während Spiel)
CREATE TABLE IF NOT EXISTS active_punishments (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    punishment_text TEXT NOT NULL,
    remaining_questions INTEGER NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_active_punishments_game_id ON active_punishments(game_id);
CREATE INDEX IF NOT EXISTS idx_active_punishments_player_id ON active_punishments(player_id);

-- Beispiel-Strafen
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES
    ('10 Liegestützen machen!', 1, '⚠️'),
    ('Nächste Runde mit geschlossenen Augen spielen', 2, '👁️'),
    ('Ein Glas Wasser auf ex trinken', 1, '💧'),
    ('Einen Zungenbrecher 3x schnell sagen', 1, '👅'),
    ('1 Minute auf einem Bein stehen', 2, '🦵'),
    ('Spiele die nächste Runde mit verbundenen Händen', 2, '🤝'),
    ('Singe ein Lied vor allen', 1, '🎤'),
    ('Tanze 30 Sekunden lang', 1, '💃'),
    ('Erzähle einen schlechten Witz', 1, '😂'),
    ('Mache eine lustige Grimasse', 1, '🤪'),
    ('Sprich die nächste Minute in Reimen', 2, '📝'),
    ('Imitiere ein Tier deiner Wahl', 1, '🦁'),
    ('Stelle dich vor als wärst du berühmt', 1, '⭐'),
    ('Verwende die nächsten 2 Runden nur eine Hand', 2, '✋'),
    ('Tausche die Plätze mit einem anderen Spieler', 1, '🔄')
ON CONFLICT DO NOTHING;

-- Erfolgsmeldung
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Migration 004 erfolgreich ausgeführt: Glücksrad-Feature hinzugefügt';
END $$;