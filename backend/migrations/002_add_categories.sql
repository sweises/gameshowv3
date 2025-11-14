-- Migration 002: Add Categories
-- Fügt Beispiel-Kategorien und Fragen hinzu

-- Kategorien einfügen
INSERT INTO categories (name, icon, description) VALUES
    ('Tutorial', 'brain', 'Lerne wie das Spiel funktioniert'),
    ('Allgemeinwissen', 'brain', 'Teste dein Wissen über die Welt'),
    ('Geschichte', 'scroll', 'Ereignisse aus der Vergangenheit'),
    ('Geographie', 'globe', 'Länder, Städte und Kontinente'),
    ('Sport', 'soccer', 'Fußball, Basketball und mehr'),
    ('Musik', 'music', 'Künstler, Songs und Bands'),
    ('Filme & Serien', 'movie', 'Hollywood und Streaming'),
    ('Wissenschaft', 'science', 'Physik, Chemie und Biologie')
ON CONFLICT DO NOTHING;

-- Tutorial-Fragen
INSERT INTO question_templates (category_id, question_text) VALUES
    ((SELECT id FROM categories WHERE name = 'Tutorial'), 'Drücke den BUZZ Button so schnell du kannst!'),
    ((SELECT id FROM categories WHERE name = 'Tutorial'), 'Wie heißt die Hauptstadt von Deutschland?'),
    ((SELECT id FROM categories WHERE name = 'Tutorial'), 'Was ist 2 + 2?'),
    ((SELECT id FROM categories WHERE name = 'Tutorial'), 'Welche Farbe hat der Himmel?'),
    ((SELECT id FROM categories WHERE name = 'Tutorial'), 'Wie viele Beine hat eine Spinne?')
ON CONFLICT DO NOTHING;

-- Allgemeinwissen-Fragen
INSERT INTO question_templates (category_id, question_text) VALUES
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'Wie viele Kontinente gibt es?'),
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'Welches ist das größte Tier der Welt?'),
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'In welchem Land steht der Eiffelturm?'),
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'Wie heißt der längste Fluss der Welt?'),
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'Wie viele Tage hat ein Schaltjahr?'),
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'Welches Tier ist das Wappentier Deutschlands?'),
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'Wie nennt man ein Baby-Känguru?'),
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'Welche Farbe hat ein Smaragd?'),
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'Wie viele Herzen hat ein Tintenfisch?'),
    ((SELECT id FROM categories WHERE name = 'Allgemeinwissen'), 'Was ist die Hauptstadt von Japan?')
ON CONFLICT DO NOTHING;

-- Geschichte-Fragen
INSERT INTO question_templates (category_id, question_text) VALUES
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'In welchem Jahr fiel die Berliner Mauer?'),
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'Wer war der erste Mensch auf dem Mond?'),
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'In welchem Jahr begann der Erste Weltkrieg?'),
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'Wer entdeckte Amerika im Jahr 1492?'),
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'In welchem Jahrhundert lebte Napoleon?'),
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'Wie hieß das römische Kolosseum in seiner ursprünglichen Form?'),
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'In welchem Jahr wurde die Titanic versenkt?'),
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'Wer war der erste Kaiser von China?'),
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'In welchem Jahr endete der Zweite Weltkrieg?'),
    ((SELECT id FROM categories WHERE name = 'Geschichte'), 'Wer war der letzte Pharao von Ägypten?')
ON CONFLICT DO NOTHING;

-- Geographie-Fragen
INSERT INTO question_templates (category_id, question_text) VALUES
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'Wie heißt der höchste Berg der Welt?'),
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'Welches ist das größte Land der Erde?'),
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'In welchem Ozean liegt Hawaii?'),
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'Wie viele Staaten hat die USA?'),
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'Welcher Fluss fließt durch London?'),
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'Wie heißt die Hauptstadt von Australien?'),
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'In welchem Land liegt der Kilimandscharo?'),
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'Welches ist die kleinste Insel der Welt?'),
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'Wie viele Zeitzonen hat Russland?'),
    ((SELECT id FROM categories WHERE name = 'Geographie'), 'Welches Land hat die meisten Einwohner?')
ON CONFLICT DO NOTHING;

-- Sport-Fragen
INSERT INTO question_templates (category_id, question_text) VALUES
    ((SELECT id FROM categories WHERE name = 'Sport'), 'Wie viele Spieler hat ein Fußballteam auf dem Feld?'),
    ((SELECT id FROM categories WHERE name = 'Sport'), 'In welcher Stadt fanden die Olympischen Spiele 2016 statt?'),
    ((SELECT id FROM categories WHERE name = 'Sport'), 'Wie oft hat Deutschland die Fußball-WM gewonnen?'),
    ((SELECT id FROM categories WHERE name = 'Sport'), 'Welche Sportart spielt man mit einem Shuttlecock?'),
    ((SELECT id FROM categories WHERE name = 'Sport'), 'Wie viele Ringe hat das olympische Symbol?'),
    ((SELECT id FROM categories WHERE name = 'Sport'), 'In welcher Sportart ist Michael Jordan berühmt?'),
    ((SELECT id FROM categories WHERE name = 'Sport'), 'Wie lang ist ein Marathon?'),
    ((SELECT id FROM categories WHERE name = 'Sport'), 'Welches Land gewann die Fußball-WM 2018?'),
    ((SELECT id FROM categories WHERE name = 'Sport'), 'Wie viele Grand-Slam-Turniere gibt es im Tennis?'),
    ((SELECT id FROM categories WHERE name = 'Sport'), 'In welcher Sportart kämpft man im Ring?')
ON CONFLICT DO NOTHING;

-- Erfolgsmeldung
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Migration 002 erfolgreich ausgeführt: Kategorien und Fragen hinzugefügt';
END $$;