import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveSession } from '../utils/sessionStorage';
import socket from '../sockets';

function PlayerLobby() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [gameId, setGameId] = useState(null);

  useEffect(() => {
    // Verbinde Socket
    socket.connect();

    // Höre auf Spieler-Updates
    socket.on('players-update', (data) => {
      setPlayers(data.players);
    });

    // Höre auf Kategorie-Intro (NEU)
    socket.on('category-intro', (data) => {
      navigate('/game', { 
        state: { 
          isHost: false, 
          playerId, 
          roomCode,
          gameId,
          showCategoryIntro: true,
          currentCategory: data.category
        } 
      });
    });

    // Höre auf Spiel-Start (Legacy - falls Kategorie übersprungen wird)
    socket.on('game-started', (data) => {
      navigate('/game', { 
        state: { 
          isHost: false, 
          playerId, 
          roomCode,
          gameId,
          currentQuestion: data.question,
          currentCategory: data.category
        } 
      });
    });

    return () => {
      socket.off('players-update');
      socket.off('category-intro');
      socket.off('game-started');
    };
  }, [navigate, playerId, roomCode, gameId]);

  const joinRoom = () => {
    if (!playerName.trim()) {
      setError('Bitte gib deinen Namen ein');
      return;
    }

    if (!roomCode.trim()) {
      setError('Bitte gib einen Raum-Code ein');
      return;
    }

    setIsJoining(true);
    setError('');
socket.emit('join-room', { 
  roomCode: roomCode.toUpperCase(), 
  playerName 
}, (response) => {
  setIsJoining(false);
  if (response.success) {
    setHasJoined(true);
    setPlayerId(response.playerId);
    setGameId(response.gameId);
    
    // NEU: Session speichern
    saveSession({
      sessionId: response.sessionId,
      playerId: response.playerId,
      gameId: response.gameId,
      roomCode: roomCode.toUpperCase(),
      playerName: playerName,
      isHost: false
    });
    
  } else {
    setError(response.error || 'Fehler beim Beitreten');
  }
    });
  };

  if (!hasJoined) {
    // Noch nicht beigetreten
    return (
      <div className="page">
        <div className="card">
          <h2>👥 Spiel Beitreten</h2>
          <p>Tritt einem Raum bei</p>

          {error && <div className="alert alert-danger">{error}</div>}

          <input
            type="text"
            className="input"
            placeholder="Dein Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <input
            type="text"
            className="input"
            placeholder="Raum-Code (z.B. ABC123)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
          />

          <button 
            className="btn btn-primary"
            onClick={joinRoom}
            disabled={isJoining}
          >
            {isJoining ? 'Trete bei...' : 'Raum Beitreten'}
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  // Beigetreten - warte auf Start
  return (
    <div className="page">
      <div className="card" style={{ maxWidth: '600px' }}>
        <h2>✅ Erfolgreich beigetreten!</h2>
        <p>Raum: <strong>{roomCode}</strong></p>

        <div className="alert alert-success">
          Warte auf den Host um das Spiel zu starten...
        </div>

        {players.length > 0 && (
          <div className="players-list">
            <h3 style={{ marginBottom: '15px', color: '#667eea' }}>
              Spieler im Raum ({players.length}):
            </h3>
            {players.map((player) => (
              <div key={player.id} className="player-item">
                <span className="player-name">
                  {player.id === playerId ? '⭐ ' : '👤 '}
                  {player.name}
                  {player.id === playerId && ' (Du)'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="loading">
          <div className="spinner"></div>
          <p style={{ marginTop: '20px' }}>Warte auf Spielstart...</p>
        </div>
      </div>
    </div>
  );
}

export default PlayerLobby;