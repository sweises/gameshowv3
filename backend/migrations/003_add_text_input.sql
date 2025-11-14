-- Migration 003: Text Input Categories
-- Fügt Text-Input Support hinzu

-- Neue Spalte für Kategorie-Typ
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS category_type VARCHAR(50) DEFAULT 'buzzer';

-- Text-Antworten Tabelle
CREATE TABLE IF NOT EXISTS text_answers (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    points_awarded INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    judged_at TIMESTAMP
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_text_answers_game_id ON text_answers(game_id);
CREATE INDEX IF NOT EXISTS idx_text_answers_question_id ON text_answers(question_id);

-- Beispiel Text-Input Kategorie
INSERT INTO categories (name, icon, description, category_type) VALUES
    ('Kreativität', 'book', 'Zeige deine kreative Seite!', 'text_input')
ON CONFLICT DO NOTHING;

-- Beispiel Text-Input Fragen
INSERT INTO question_templates (category_id, question_text) VALUES
    ((SELECT id FROM categories WHERE name = 'Kreativität'), 'Nenne einen lustigen Namen für ein Haustier'),
    ((SELECT id FROM categories WHERE name = 'Kreativität'), 'Was würdest du auf eine einsame Insel mitnehmen?'),
    ((SELECT id FROM categories WHERE name = 'Kreativität'), 'Erfinde ein neues Wort und erkläre seine Bedeutung'),
    ((SELECT id FROM categories WHERE name = 'Kreativität'), 'Schreibe den ersten Satz einer Geschichte'),
    ((SELECT id FROM categories WHERE name = 'Kreativität'), 'Was wäre deine Superkraft und warum?')
ON CONFLICT DO NOTHING;

-- Erfolgsmeldung
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Migration 003 erfolgreich ausgeführt: Text-Input Support hinzugefügt';
END $$;