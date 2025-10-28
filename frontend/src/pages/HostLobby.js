import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../sockets';
import CategorySelector from '../components/CategorySelector';

function HostLobby() {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [gameId, setGameId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [categoriesSelected, setCategoriesSelected] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on('players-update', (data) => {
      setPlayers(data.players);
    });

    return () => {
      socket.off('players-update');
    };
  }, []);

  const createRoom = () => {
    if (!hostName.trim()) {
      setError('Bitte gib deinen Namen ein');
      return;
    }

    setIsCreating(true);
    setError('');

    socket.emit('create-room', { hostName }, (response) => {
      setIsCreating(false);
      if (response.success) {
        setRoomCode(response.roomCode);
        setGameId(response.gameId);
        setShowCategorySelector(true);
      } else {
        setError(response.error || 'Fehler beim Erstellen des Raums');
      }
    });
  };

  const handleCategoriesComplete = () => {
    setShowCategorySelector(false);
    setCategoriesSelected(true);
  };

  const startGame = () => {
    socket.emit('start-game', (response) => {
      if (response.success) {
        // Navigiere direkt zur GamePage - das category-intro event wird dort empfangen
        navigate('/game', { 
          state: { 
            isHost: true, 
            roomCode, 
            gameId,
            waitingForCategoryStart: true
          } 
        });
      } else {
        setError(response.error || 'Fehler beim Starten');
      }
    });
  };

  if (!roomCode) {
    return (
      <div className="page">
        <div className="card">
          <h2>🎮 Spiel Hosten</h2>
          <p>Erstelle einen Raum für deine Quiz-Show</p>

          {error && <div className="alert alert-danger">{error}</div>}

          <input
            type="text"
            className="input"
            placeholder="Dein Name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createRoom()}
          />

          <button 
            className="btn btn-primary"
            onClick={createRoom}
            disabled={isCreating}
          >
            {isCreating ? 'Erstelle Raum...' : 'Raum Erstellen'}
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

  if (showCategorySelector) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: '800px' }}>
          <h2>🎮 Raum: {roomCode}</h2>
          <CategorySelector 
            gameId={gameId} 
            onComplete={handleCategoriesComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: '600px' }}>
        <h2>🎮 Raum erstellt!</h2>
        <p>Teile diesen Code mit deinen Spielern:</p>

        <div className="room-code">{roomCode}</div>

        {categoriesSelected && (
          <div className="alert alert-success">
            ✅ Kategorien ausgewählt!
          </div>
        )}

        <div className="alert alert-info">
          Warte auf Spieler... ({players.length} Spieler)
        </div>

        {players.length > 0 && (
          <div className="players-list">
            <h3 style={{ marginBottom: '15px', color: '#667eea' }}>
              Spieler im Raum:
            </h3>
            {players.map((player) => (
              <div key={player.id} className="player-item">
                <span className="player-name">👤 {player.name}</span>
              </div>
            ))}
          </div>
        )}

        <button 
          className="btn btn-success"
          onClick={startGame}
          disabled={players.length === 0 || !categoriesSelected}
        >
          {!categoriesSelected 
            ? 'Wähle erst Kategorien aus'
            : players.length === 0 
            ? 'Warte auf Spieler...' 
            : `Spiel Starten (${players.length} Spieler)`}
        </button>

        {error && <div className="alert alert-danger">{error}</div>}
      </div>
    </div>
  );
}

export default HostLobby;