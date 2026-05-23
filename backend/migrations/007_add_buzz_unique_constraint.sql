-- Migration 007: Buzzer Race-Condition Fix
-- Stellt sicher, dass pro Frage nur EIN Buzz existieren kann.

-- Falls durch den alten Bug bereits Doppel-Buzzes in der DB liegen:
-- behalte pro (game_id, question_id) nur den frühesten Buzz.
DELETE FROM buzzes a
USING buzzes b
WHERE a.game_id = b.game_id
  AND a.question_id = b.question_id
  AND a.buzzed_at > b.buzzed_at;

-- Bei exakt gleichem Timestamp: behalte die kleinere id.
DELETE FROM buzzes a
USING buzzes b
WHERE a.game_id = b.game_id
  AND a.question_id = b.question_id
  AND a.buzzed_at = b.buzzed_at
  AND a.id > b.id;

-- UNIQUE-Constraint hinzufügen (idempotent: nur falls noch nicht vorhanden)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_buzz_per_question'
    ) THEN
        ALTER TABLE buzzes
        ADD CONSTRAINT unique_buzz_per_question UNIQUE (game_id, question_id);
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Migration 007 erfolgreich: Buzzer-UNIQUE-Constraint hinzugefügt';
END $$;