-- Migration 001: Initial Schema
-- Erstellt die Basis-Tabellen für das Quiz-System

-- Spiele-Tabelle
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    host_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'lobby',
    current_question_index INTEGER DEFAULT 0,
    current_category_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spieler-Tabelle
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    score INTEGER DEFAULT 0,
    socket_id VARCHAR(255),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kategorien-Tabelle
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fragen-Templates (wiederverwendbar)
CREATE TABLE IF NOT EXISTS question_templates (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spiel-Kategorien (Zuordnung welche Kategorien in welchem Spiel)
CREATE TABLE IF NOT EXISTS game_categories (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    play_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fragen (für ein spezifisches Spiel)
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL
);

-- Buzzer-Events
CREATE TABLE IF NOT EXISTS buzzes (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    buzzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_questions_game_id ON questions(game_id);
CREATE INDEX IF NOT EXISTS idx_buzzes_game_id ON buzzes(game_id);

-- Erfolgsmeldung
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Migration 001 erfolgreich ausgeführt: Basis-Schema erstellt';
END $$;