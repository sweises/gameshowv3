-- Migration 008: Host-Session für Rejoin
-- Ermöglicht auch dem Host (Spielleiter) das Wiederverbinden.

ALTER TABLE games
ADD COLUMN IF NOT EXISTS host_session_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_games_host_session_id ON games(host_session_id);

DO $$
BEGIN
    RAISE NOTICE 'Migration 008 erfolgreich: Host-Session-Support hinzugefügt';
END $$;