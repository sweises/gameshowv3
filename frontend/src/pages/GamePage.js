import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../sockets';

// Emoji Mapping
const ICON_MAP = {
  'brain': '🧠',
  'scroll': '📜',
  'globe': '🌍',
  'soccer': '⚽',
  'music': '🎵',
  'movie': '🎬',
  'science': '🔬',
  'book': '📚'
};

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    isHost, 
    playerId, 
    roomCode, 
    gameId, 
    currentQuestion,
    showCategoryIntro: initialShowCategoryIntro,
    currentCategory: initialCurrentCategory,
    waitingForCategoryStart: initialWaitingForCategoryStart
  } = location.state || {};

  const [showCategoryIntro, setShowCategoryIntro] = useState(initialShowCategoryIntro || false);
  const [currentCategory, setCurrentCategory] = useState(initialCurrentCategory || null);
  const [question, setQuestion] = useState(currentQuestion || null);
  const [players, setPlayers] = useState([]);
  const [buzzerLocked, setBuzzerLocked] = useState(false);
  const [buzzerPlayer, setBuzzerPlayer] = useState(null);
  const [buzzerPlayerId, setBuzzerPlayerId] = useState(null);
  const [showBuzzAlert, setShowBuzzAlert] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [winner, setWinner] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [waitingForCategoryStart, setWaitingForCategoryStart] = useState(initialWaitingForCategoryStart || false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [correctAnswerPlayer, setCorrectAnswerPlayer] = useState(null);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    // Lade Spieler-Scores beim Start
    const loadPlayers = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/games/${gameId}/players`);
        const data = await response.json();
        if (data.success) {
          setPlayers(data.players);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Spieler:', error);
      }
    };

    if (gameId) {
      loadPlayers();
    }

    // Socket Events
    socket.on('category-intro', (data) => {
      console.log('🎯 category-intro empfangen:', data);
      setCurrentCategory(data.category);
      setShowCategoryIntro(true);
      setWaitingForCategoryStart(true);
      setQuestion(null);
      setBuzzerLocked(true);
    });

    socket.on('category-started', (data) => {
      console.log('🎯 category-started empfangen:', data);
      setQuestion(data.question);
      setCurrentCategory(data.category);
      setShowCategoryIntro(false);
      setWaitingForCategoryStart(false);
      setBuzzerLocked(false);
    });

    socket.on('game-started', (data) => {
      console.log('🎯 game-started empfangen:', data);
      setQuestion(data.question);
      setCurrentCategory(data.category);
      setBuzzerLocked(false);
      setShowCategoryIntro(false);
      setWaitingForCategoryStart(false);
    });

    socket.on('next-question', (data) => {
      console.log('🎯 next-question empfangen:', data);
      setQuestion(data.question);
      setCurrentCategory(data.category);
      setBuzzerLocked(false);
      setBuzzerPlayer(null);
      setBuzzerPlayerId(null);
      setShowBuzzAlert(false);
      setIsCountingDown(false);
      setCountdown(0);
      setShowCorrectAnswer(false);
      setCorrectAnswerPlayer(null);
    });

    socket.on('player-buzzed', (data) => {
      console.log('🎯 player-buzzed empfangen:', data);
      setBuzzerLocked(true);
      setBuzzerPlayer(data.playerName);
      setBuzzerPlayerId(data.playerId);
      setShowBuzzAlert(true);

      setTimeout(() => {
        setShowBuzzAlert(false);
      }, 2000);
    });

    socket.on('answer-judged', (data) => {
      console.log('🎯 answer-judged empfangen:', data);
      if (data.correct) {
        setCorrectAnswerPlayer(data.playerName);
        setShowCorrectAnswer(true);
        
        setTimeout(() => {
          setShowCorrectAnswer(false);
        }, 2000);
      }
      
      if (!data.correct && isHost) {
        startUnlockCountdown();
      }
    });

    socket.on('buzzer-unlocked', () => {
      console.log('🎯 buzzer-unlocked empfangen');
      setBuzzerLocked(false);
      setBuzzerPlayer(null);
      setBuzzerPlayerId(null);
      setIsCountingDown(false);
      setCountdown(0);
    });

    socket.on('scores-update', (data) => {
      console.log('🎯 scores-update empfangen:', data);
      setPlayers(data.players);
    });

    socket.on('game-finished', (data) => {
      console.log('🎯 game-finished empfangen:', data);
      setPlayers(data.players);
      setGameFinished(true);
      if (data.players.length > 0) {
        setWinner(data.players[0]);
      }
    });

    return () => {
      socket.off('category-intro');
      socket.off('category-started');
      socket.off('game-started');
      socket.off('next-question');
      socket.off('player-buzzed');
      socket.off('answer-judged');
      socket.off('buzzer-unlocked');
      socket.off('scores-update');
      socket.off('game-finished');
    };
  }, [roomCode, navigate, isHost, gameId]);

  const startUnlockCountdown = () => {
    setIsCountingDown(true);
    setCountdown(3);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          socket.emit('unlock-buzzer', (response) => {
            if (response.success) {
              console.log('Buzzer freigegeben');
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBuzz = () => {
    if (!buzzerLocked) {
      socket.emit('buzz', (response) => {
        if (!response.success) {
          console.log('Buzz fehlgeschlagen:', response.error);
        }
      });
    }
  };

  const handleJudgeAnswer = (correct) => {
    if (!buzzerPlayerId) return;

    socket.emit('judge-answer', { 
      playerId: buzzerPlayerId, 
      correct 
    }, (response) => {
      if (response.success) {
        console.log('Antwort bewertet');
      }
    });
  };

  const handleStartCategory = () => {
    socket.emit('start-category', (response) => {
      if (response.success) {
        console.log('Kategorie gestartet');
      }
    });
  };

  const handleNextQuestion = () => {
    socket.emit('next-question', (response) => {
      if (response.success) {
        if (response.finished) {
          console.log('Spiel beendet');
        } else if (response.categoryChange) {
          console.log('Kategoriewechsel');
        }
      }
    });
  };

  // Kategorie Intro Screen
  if (showCategoryIntro && currentCategory) {
    return (
      <div className="page" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ textAlign: 'center', color: 'white', maxWidth: '800px' }}>
          <div style={{ fontSize: '8rem', marginBottom: '30px', animation: 'pulse 1s infinite' }}>
            {ICON_MAP[currentCategory.icon] || '❓'}
          </div>
          <h1 style={{ 
            fontSize: '4rem', 
            color: 'white', 
            marginBottom: '20px',
            textShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            {currentCategory.name}
          </h1>
          <p style={{ 
            fontSize: '1.5rem', 
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '600px',
            margin: '0 auto 40px'
          }}>
            {currentCategory.description}
          </p>

          {isHost && waitingForCategoryStart && (
            <button
              className="btn btn-success"
              onClick={handleStartCategory}
              style={{
                fontSize: '1.5rem',
                padding: '20px 50px',
                background: 'white',
                color: '#667eea',
                border: 'none',
                marginTop: '20px'
              }}
            >
              ▶️ Kategorie Starten
            </button>
          )}

          {!isHost && (
            <p style={{ 
              fontSize: '1.2rem', 
              color: 'rgba(255,255,255,0.8)',
              marginTop: '30px'
            }}>
              Warte auf Host...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Game Finished Screen
  if (gameFinished) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: '700px' }}>
          <div className="winner-container">
            <div className="winner-trophy">🏆</div>
            <h1>Spiel Beendet!</h1>
            {winner && (
              <>
                <p className="winner-name">{winner.name} gewinnt!</p>
                <p style={{ fontSize: '1.5rem', color: '#666' }}>
                  mit {winner.score} Punkt{winner.score !== 1 ? 'en' : ''}!
                </p>
              </>
            )}

            <div className="players-list" style={{ marginTop: '30px' }}>
              <h3 style={{ marginBottom: '15px', color: '#667eea' }}>
                Endstand:
              </h3>
              {players.map((player, index) => (
                <div key={player.id} className="player-item">
                  <span className="player-name">
                    {index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : '👤 '}
                    {player.name}
                  </span>
                  <span className="player-score">{player.score}</span>
                </div>
              ))}
            </div>

            <button 
              className="btn btn-primary"
              onClick={() => navigate('/')}
              style={{ marginTop: '30px' }}
            >
              Zurück zur Startseite
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Game Screen
  return (
    <div className="page">
      <div className="card" style={{ maxWidth: '1000px', width: '90%' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <h2 style={{ margin: 0 }}>🎯 Quiz Show</h2>
            <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>Raum: <strong>{roomCode}</strong></p>
          </div>
          {currentCategory && (
            <div style={{ 
              background: '#f0f4ff', 
              padding: '10px 20px', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>{ICON_MAP[currentCategory.icon] || '❓'}</span>
              <span style={{ fontWeight: 'bold', color: '#667eea' }}>{currentCategory.name}</span>
            </div>
          )}
        </div>

        {/* Frage anzeigen */}
        {question && (
          <div className="question-container" style={{ 
            minHeight: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <p className="question-text" style={{ fontSize: '2rem' }}>
              {question.text}
            </p>
          </div>
        )}

        {/* Buzz Alert */}
        {showBuzzAlert && buzzerPlayer && (
          <div className="buzz-alert">
            <h2>🔴 BUZZ!</h2>
            <p>{buzzerPlayer}</p>
          </div>
        )}

        {/* Correct Answer Alert */}
        {showCorrectAnswer && correctAnswerPlayer && (
          <div className="buzz-alert" style={{ 
            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            color: 'white'
          }}>
            <h2>✅ RICHTIG!</h2>
            <p>{correctAnswerPlayer} bekommt +1 Punkt!</p>
          </div>
        )}

        {/* Countdown Display */}
        {isCountingDown && countdown > 0 && (
          <div style={{
            textAlign: 'center',
            margin: '20px 0',
            padding: '30px',
            background: '#fff3cd',
            borderRadius: '15px',
            border: '3px solid #ffc107'
          }}>
            <h3 style={{ color: '#856404', marginBottom: '10px' }}>
              Buzzer wird freigegeben in:
            </h3>
            <div style={{ 
              fontSize: '4rem', 
              fontWeight: 'bold', 
              color: '#ffc107',
              animation: 'pulse 1s infinite'
            }}>
              {countdown}
            </div>
          </div>
        )}

        {/* Buzzer Info */}
        {buzzerPlayer && !isCountingDown && (
          <div className="alert alert-info" style={{ fontSize: '1.2rem' }}>
            <strong>{buzzerPlayer}</strong> hat gebuzzert! {isHost ? 'Bewerte die Antwort:' : 'Warte auf Bewertung...'}
          </div>
        )}

        {/* Buzzer (nur für Spieler) */}
        {!isHost && (
          <div className="buzzer-container">
            <button
              className="buzzer"
              onClick={handleBuzz}
              disabled={buzzerLocked || !question}
              style={{
                opacity: (buzzerLocked || !question) ? 0.5 : 1
              }}
            >
              {buzzerLocked ? '🔒' : !question ? '⏳' : '🔴 BUZZ!'}
            </button>
            {buzzerLocked && <p style={{ textAlign: 'center', color: '#999', marginTop: '10px' }}>
              {isCountingDown ? 'Warte...' : 'Buzzer gesperrt'}
            </p>}
          </div>
        )}

        {/* Host Controls */}
        {isHost && (
          <div style={{ marginTop: '20px' }}>
            {buzzerPlayer && !isCountingDown && (
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                marginBottom: '20px',
                justifyContent: 'center'
              }}>
                <button
                  className="btn btn-success"
                  onClick={() => handleJudgeAnswer(true)}
                  disabled={!buzzerPlayerId}
                  style={{ 
                    width: 'auto', 
                    padding: '15px 40px',
                    fontSize: '1.2rem'
                  }}
                >
                  ✅ Richtig (+1 Punkt)
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleJudgeAnswer(false)}
                  disabled={!buzzerPlayerId}
                  style={{ 
                    width: 'auto', 
                    padding: '15px 40px',
                    fontSize: '1.2rem'
                  }}
                >
                  ❌ Falsch
                </button>
              </div>
            )}

            {!isCountingDown && (
              <button
                className="btn btn-primary"
                onClick={handleNextQuestion}
                style={{ fontSize: '1.1rem' }}
              >
                ➡️ Nächste Frage
              </button>
            )}
          </div>
        )}

        {/* Spieler Scores */}
        {players.length > 0 && (
          <div className="players-list" style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '15px', color: '#667eea' }}>
              Punktestand:
            </h3>
            {players.map((player) => (
              <div 
                key={player.id} 
                className="player-item"
                style={{
                  background: player.id === buzzerPlayerId ? '#fff3cd' : 'white',
                  border: player.id === buzzerPlayerId ? '2px solid #ffc107' : 'none'
                }}
              >
                <span className="player-name">
                  {player.id === playerId && '⭐ '}
                  {player.id === buzzerPlayerId && '🔴 '}
                  {player.name}
                  {player.id === playerId && ' (Du)'}
                </span>
                <span className="player-score">{player.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GamePage;