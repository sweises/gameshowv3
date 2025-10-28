import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    socket.connect();

    socket.on('players-update', (data) => {
      setPlayers(data.players);
    });

    // Bei category-intro zur GamePage (mit Kategorie-Screen)
    socket.on('category-intro', (data) => {
      console.log('🎯 Spieler empfängt category-intro:', data);
      navigate('/game', { 
        state: { 
          isHost: false, 
          playerId, 
          roomCode,
          gameId,
          showCategoryIntro: true,
          currentCategory: data.category,
          waitingForCategoryStart: false // Spieler wartet nur
        } 
      });
    });

    // Bei category-started zur GamePage (mit Frage) - falls schon läuft
    socket.on('category-started', (data) => {
      console.log('🎯 Spieler empfängt category-started:', data);
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

    socket.on('game-started', (data) => {
      console.log('🎯 Spieler empfängt game-started:', data);
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
      socket.off('category-started');
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
      } else {
        setError(response.error || 'Fehler beim Beitreten');
      }
    });
  };

  if (!hasJoined) {
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