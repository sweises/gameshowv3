-- Migration 005: Image Support
-- Fügt Bild-URLs zu Fragen hinzu

-- Neue Spalte für Bild-URLs
ALTER TABLE question_templates 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Beispiel-Fragen mit Bildern (Platzhalter URLs)
-- Diese können später mit echten Bild-URLs ersetzt werden

-- Erfolgsmeldung
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Migration 005 erfolgreich ausgeführt: Bild-Support hinzugefügt';
END $$;