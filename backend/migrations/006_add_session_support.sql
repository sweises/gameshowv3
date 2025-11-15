-- Migration 006: Session Support für Rejoin
-- Ermöglicht Spielern das Wiederverbinden

-- Session-ID zur Players-Tabelle hinzufügen
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255) UNIQUE;

-- Index für schnelle Session-Lookups
CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id);

-- Spieler nicht mehr automatisch löschen bei Disconnect
-- (wird jetzt über disconnect_at Timestamp gehandhabt)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS disconnect_at TIMESTAMP;

-- Letzter bekannter Game-State des Spielers
ALTER TABLE players
ADD COLUMN IF NOT EXISTS last_seen_question_id INTEGER;

-- Erfolgsmeldung
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration 006 erfolgreich ausgeführt: Session-Support hinzugefügt';
END $$;