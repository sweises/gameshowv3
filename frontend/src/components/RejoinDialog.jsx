import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../sockets';
import { loadSession, clearSession } from '../utils/sessionStorage';

function RejoinDialog() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isRejoining, setIsRejoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedSession = loadSession();
    if (savedSession) {
      setSession(savedSession);
    }
  }, []);

  const handleRejoin = () => {
    if (!session) return;

    setIsRejoining(true);
    setError('');

    socket.connect();

    socket.emit('rejoin-game', { sessionId: session.sessionId }, (response) => {
      setIsRejoining(false);

      if (response.success) {
        console.log('✅ Erfolgreich wieder verbunden!', response);

        // Navigiere zur GamePage mit vollständigem State
        navigate('/game', {
          state: {
            isHost: session.isHost,
            playerId: response.playerId,
            gameId: response.gameId,
            roomCode: response.roomCode,
            currentQuestion: response.gameState.question,
            currentCategory: response.gameState.category,
            gameStatus: response.gameState.status,
            players: response.gameState.players,
            buzzerLocked: response.gameState.buzzerLocked,
            buzzerPlayer: response.gameState.buzzerPlayer,
            isRejoin: true
          }
        });
      } else {
        setError(response.error || 'Wiederverbindung fehlgeschlagen');
        // Lösche ungültige Session
        clearSession();
        setTimeout(() => {
          setSession(null);
        }, 3000);
      }
    });
  };

  const handleStartNew = () => {
    clearSession();
    setSession(null);
  };

  if (!session) {
    return null; // Kein Dialog wenn keine Session
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      animation: 'fadeIn 0.3s ease'
    }}>
      <div className="card" style={{
        maxWidth: '500px',
        animation: 'slideIn 0.4s ease'
      }}>
        <h2 style={{ marginBottom: '20px' }}>🔄 Spiel gefunden!</h2>
        
        <div style={{
          background: '#f0f4ff',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '5px 0', fontSize: '1.1rem' }}>
            <strong>Raum:</strong> {session.roomCode}
          </p>
          <p style={{ margin: '5px 0', fontSize: '1.1rem' }}>
            <strong>Spieler:</strong> {session.playerName}
          </p>
          <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#666' }}>
            Zuletzt aktiv: {new Date(session.timestamp).toLocaleString('de-DE')}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-success"
          onClick={handleRejoin}
          disabled={isRejoining}
          style={{
            fontSize: '1.2rem',
            marginBottom: '15px'
          }}
        >
          {isRejoining ? '🔄 Verbinde...' : '🎮 Zum Spiel zurückkehren'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleStartNew}
          disabled={isRejoining}
        >
          Neues Spiel starten
        </button>

        <p style={{
          marginTop: '20px',
          fontSize: '0.85rem',
          color: '#999',
          textAlign: 'center'
        }}>
          💡 Du kannst jederzeit zu deinem laufenden Spiel zurückkehren
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            transform: translateY(-50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default RejoinDialog;