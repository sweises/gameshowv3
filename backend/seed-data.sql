-- Quiz Buzzer - Datenbank Seed Data
-- Exportiert am: 2025-11-14T22:29:01.880Z
-- Modus: Seed (nur Templates)
--
-- WICHTIG: Dieses Script setzt voraus, dass die Migrations bereits ausgeführt wurden!

-- Lösche Template-Daten (in korrekter Reihenfolge wegen Foreign Keys)
DELETE FROM text_answers;
DELETE FROM buzzes;
DELETE FROM questions;
DELETE FROM game_categories;
DELETE FROM active_punishments;
DELETE FROM players;
DELETE FROM games;
DELETE FROM question_templates;
DELETE FROM punishment_templates;
DELETE FROM categories;

-- Reset Sequences
ALTER SEQUENCE categories_id_seq RESTART WITH 1;
ALTER SEQUENCE question_templates_id_seq RESTART WITH 1;
ALTER SEQUENCE punishment_templates_id_seq RESTART WITH 1;

-- ==========================================
-- KATEGORIEN (9)
-- ==========================================

INSERT INTO categories (name, icon, description, category_type) VALUES ('Tutorial: Buzzer', 'book', 'Lerne wie der Buzzer funktioniert! Der Schnellste gewinnt!', 'buzzer');
INSERT INTO categories (name, icon, description, category_type) VALUES ('Tutorial: Text-Eingabe', 'book', 'Schreibe deine Antwort! Mehrere können richtig sein!', 'text_input');
INSERT INTO categories (name, icon, description, category_type) VALUES ('Die leichten 5+5+5', 'brain', 'Wir spielen 5 leichte Fragen, und weil es so toll ist, drei Mal!
Ich stelle leichte Fragen, jeder gibt seine Antwort im Textfeld ab. Wer richtig liegt, kriegt einen Punkt. ', 'text_input');
INSERT INTO categories (name, icon, description, category_type) VALUES ('Ich bin...', 'globe', 'Ich sage Sätze in der "Ich bin..." Form. Wenn ihr erkennt wer ich bin, buzzert ihr. Wer gebuzzert hat muss Antworten, falls die Antwort richtig ist, gibt es einen Punkt. Wenn nicht, geht es weiter mit dem nächsten Satz.', 'buzzer');
INSERT INTO categories (name, icon, description, category_type) VALUES ('Ich präzisier mir einen', 'science', 'Ich stelle eine Frage, ihr gebt eure Antwort im Textfeld ab. Die präziseste Antwort gewinnt. Beispiel: Wo wohnt Sherlock Holmes? "1. Stock, 221B Baker Street, London, Großbritannien" kriegt einen Punkt, "London" nicht.', 'text_input');
INSERT INTO categories (name, icon, description, category_type) VALUES ('Ich wette, ich kann mehr', 'scroll', 'Ich gebe eine Kategorie vor, jeder schreibt ins Feld, wieviele Dinge diese Kategorie er nennen kann. Die Person mit der höchsten Zahl, muss diese Anzahl an Dingen nennen', 'text_input');
INSERT INTO categories (name, icon, description, category_type) VALUES ('Das kennt man!', 'music', 'Ich spiele ein Lied ab, die Person die es als erstes erkennt, bekommt einen Punkt', 'buzzer');
INSERT INTO categories (name, icon, description, category_type) VALUES ('Wo bin ich?', 'globe', 'Ihr seht Bilder von verschiedenen Städten. Wer die Stadt richtig benennt, kriegt einen Punkt', 'text_input');
INSERT INTO categories (name, icon, description, category_type) VALUES ('Sortier mich, Daddy', 'movie', 'Ich nenne euch 5 Dinge einer Kategorie, sortiert sie nach der vorgegebenen Eigenschaft', 'text_input');

-- ==========================================
-- FRAGEN-TEMPLATES (61)
-- ==========================================

-- Tutorial: Buzzer
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Tutorial: Buzzer'), 'Wie viele Finger hat eine Hand?', NULL);

-- Tutorial: Buzzer
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Tutorial: Buzzer'), 'In welcher Stadt steht der Eiffelturm?', NULL);

-- Tutorial: Buzzer
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Tutorial: Buzzer'), 'Was ist 2 + 2?', NULL);

-- Tutorial: Text-Eingabe
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Tutorial: Text-Eingabe'), 'Nenne eine Farbe', NULL);

-- Tutorial: Text-Eingabe
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Tutorial: Text-Eingabe'), 'Nenne eine Zahl zwischen 1 und 10', NULL);

-- Tutorial: Text-Eingabe
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Tutorial: Text-Eingabe'), 'Nenne ein Tier mit 4 Beinen', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Wofür steht die Abkürzung HBF?', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Wie heißt der derzeitige deutsche Finanzminister und Vizekanzler?
', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Wie schreibt man ...', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Wofür steht dieses Verkehrszeichen?', 'https://www.bussgeldkatalog.org/wp-content/uploads/rechts-vor-links-strassenschild.png');

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Welches Element ist das zweite im Periodensystem?', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Welche Insel ist die größte der Welt?
', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Was ist die Hauptstadt von Thailand?
', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Wie nennt man das heilige Buch der Juden?
', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Wie lange ist eine Hälfte der Verlängerung beim Fußball?
', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'In welchem Land finden die Olympischen Winterspiele 2026 statt?
', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Nenne zwei der vier Bremer Stadtmusikanten?
', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Was ist das höchste Gebäude in Hamburg?
', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Was ist die Urethra?', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Mit welcher Währung bezahlt man in der Türkei?
', NULL);

-- Die leichten 5+5+5
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Die leichten 5+5+5'), 'Zwischen welchen Ländern liegt Andorra?
', NULL);

-- Ich bin...
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich bin...'), 'Promi 1', NULL);

-- Ich bin...
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich bin...'), 'Promi 2', NULL);

-- Ich bin...
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich bin...'), 'Promi 3', NULL);

-- Ich bin...
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich bin...'), 'Promi 4', NULL);

-- Ich bin...
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich bin...'), 'Promi 5', NULL);

-- Ich präzisier mir einen
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich präzisier mir einen'), 'Wo ist der Amtssitz des deutschen Bundespräsidenten?
', NULL);

-- Ich präzisier mir einen
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich präzisier mir einen'), 'Wie hieß die Vorgängerin von King Charles?
', NULL);

-- Ich präzisier mir einen
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich präzisier mir einen'), 'Wann begann der Zweite Weltkrieg (in Europa)?
', NULL);

-- Ich präzisier mir einen
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich präzisier mir einen'), 'Wo hängt die "Mona Lisa"?
', NULL);

-- Ich präzisier mir einen
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich präzisier mir einen'), 'Wie hoch ist die Zugspitze?
', NULL);

-- Ich präzisier mir einen
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich präzisier mir einen'), 'Wo ist der Big Ben?
', NULL);

-- Ich präzisier mir einen
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich präzisier mir einen'), 'Wie heißt der derzeitige Kapitän der deutschen Fußball Nationalmannschaft?
', NULL);

-- Ich präzisier mir einen
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich präzisier mir einen'), 'Wann fiel die Berliner Mauer?
', NULL);

-- Ich wette, ich kann mehr
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich wette, ich kann mehr'), 'Fast-Food Ketten', NULL);

-- Ich wette, ich kann mehr
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich wette, ich kann mehr'), 'Hauptstädte', NULL);

-- Ich wette, ich kann mehr
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich wette, ich kann mehr'), 'Deutsche Reality Stars', NULL);

-- Ich wette, ich kann mehr
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich wette, ich kann mehr'), 'Olympische Sportarten', NULL);

-- Ich wette, ich kann mehr
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich wette, ich kann mehr'), 'Gewürze', NULL);

-- Ich wette, ich kann mehr
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Ich wette, ich kann mehr'), 'Tiere mit 5 Buchstaben', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 1', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 2', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 3', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 4', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 5', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 6', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 7', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 8', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 9', NULL);

-- Das kennt man!
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Das kennt man!'), 'Lied 10', NULL);

-- Wo bin ich?
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Wo bin ich?'), 'Welche Stadt ist das?', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/3000/3678/aster_newyorkcity.jpg');

-- Wo bin ich?
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Wo bin ich?'), 'Welche Stadt ist das?', 'https://www.berlin.de/binaries/asset/image_assets/8359893/source/1730978676/1000x500/');

-- Wo bin ich?
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Wo bin ich?'), 'Welcher Ort ist das?', 'https://image.geo.de/30140612/t/oX/v3/w1440/r1.5/-/gibraltar-f-195211339-jpg--80020-.jpg');

-- Wo bin ich?
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Wo bin ich?'), 'Welche Stadt ist das?', 'https://cdn0.scrvt.com/airportdtm/497b403ea301e76a/14cc6eed9f96/budapest-sonnenuntergang-dortmund-airport.jpg');

-- Wo bin ich?
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Wo bin ich?'), 'Welche Stadt ist das?', 'https://www.robertharding.com/watermark.php?type=preview&im=RM/RH/HORIZONTAL/1348-3087');

-- Wo bin ich?
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Wo bin ich?'), 'Welche Stadt ist das?', 'https://www.ab-in-den-urlaub.de/magazin/wp-content/uploads/2019/10/1570610197_Luftaufnahme-Kapstadt.jpg');

-- Sortier mich, Daddy
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Sortier mich, Daddy'), 'Sortiere absteigend nach Einwohnern:
Lübeck, Kiel, Köln, München, Stuttgart', NULL);

-- Sortier mich, Daddy
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Sortier mich, Daddy'), 'Sortiere nach Fläche absteigend:
Österreich, Niederlande, Schweiz, Belgien, Dänemark', NULL);

-- Sortier mich, Daddy
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Sortier mich, Daddy'), 'Sortiere nach Entfernung von Hamburg absteigend:
Paris, Rom, Castrop Rauxel, Tokio, London', NULL);

-- Sortier mich, Daddy
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Sortier mich, Daddy'), 'Sortiere chronologisch beginnend mit dem frühestens:
Ghazal & Puya kommen zusammen, 1. Spieleabend,  Steffens Ausbildungsbeginn, Nele & Steffen ziehen aus, NSGP fahren nach München', NULL);

-- Sortier mich, Daddy
INSERT INTO question_templates (category_id, question_text, image_url) 
VALUES ((SELECT id FROM categories WHERE name = 'Sortier mich, Daddy'), 'Sortiere nach Alter:
Noah, Ghazal, Olivia Rodrigo, Lamine Yamal, Nina Chuba', NULL);

-- ==========================================
-- STRAFEN-TEMPLATES (10)
-- ==========================================

INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('50g Butter essen', 0, '??');
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('Fahrradhelm für 60min tragen', 0, '??');
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('Einäugig für eine Stunde', 0, '??');
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('Ekel-Shot trinken', 0, '??');
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('Sitz- und Liegeverbot für 45 Minuten', 0, '??');
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('4 Personen dürfen je eine Gliedmaße bemalen', 0, '??');
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('Drinnen-Verbot, die nächsten 3 Fragen von draußen', 0, '??');
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('Es wird warm!', 0, '??');
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('Trink- & Rauchverbot für 30 Minuten', 0, '??');
INSERT INTO punishment_templates (text, duration_questions, icon) VALUES ('Der größte Fan!', 0, '??');
