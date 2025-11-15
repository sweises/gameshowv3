// Session Storage für persistentes Rejoin

const SESSION_KEY = 'quiz_buzzer_session';

/**
 * Speichert Session-Daten im localStorage
 */
export function saveSession(sessionData) {
    try {
        const data = {
            sessionId: sessionData.sessionId,
            playerId: sessionData.playerId,
            gameId: sessionData.gameId,
            roomCode: sessionData.roomCode,
            playerName: sessionData.playerName,
            isHost: sessionData.isHost || false,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        console.log('💾 Session gespeichert:', data);
        return true;
    } catch (error) {
        console.error('Fehler beim Speichern der Session:', error);
        return false;
    }
}

/**
 * Lädt Session-Daten aus localStorage
 */
export function loadSession() {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        if (!data) {
            return null;
        }
        
        const session = JSON.parse(data);
        
        // Prüfe ob Session älter als 24 Stunden
        const sessionAge = Date.now() - new Date(session.timestamp).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 Stunden
        
        if (sessionAge > maxAge) {
            console.log('⏰ Session abgelaufen (>24h)');
            clearSession();
            return null;
        }
        
        console.log('📂 Session geladen:', session);
        return session;
    } catch (error) {
        console.error('Fehler beim Laden der Session:', error);
        return null;
    }
}

/**
 * Löscht Session-Daten
 */
export function clearSession() {
    try {
        localStorage.removeItem(SESSION_KEY);
        console.log('🗑️  Session gelöscht');
        return true;
    } catch (error) {
        console.error('Fehler beim Löschen der Session:', error);
        return false;
    }
}

/**
 * Prüft ob eine gültige Session existiert
 */
export function hasActiveSession() {
    const session = loadSession();
    return session !== null && session.sessionId && session.gameId;
}

/**
 * Aktualisiert nur bestimmte Session-Felder
 */
export function updateSession(updates) {
    try {
        const currentSession = loadSession();
        if (!currentSession) {
            return false;
        }
        
        const updatedSession = {
            ...currentSession,
            ...updates,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
        console.log('🔄 Session aktualisiert:', updates);
        return true;
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Session:', error);
        return false;
    }
}