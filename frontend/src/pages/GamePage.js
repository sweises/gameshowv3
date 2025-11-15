import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../sockets';
import WheelOfFortune from '../components/WheelOfFortune';
import API_URL from '../config/api'; // ← NEU!
import { loadSession, updateSession, clearSession } from '../utils/sessionStorage';
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
  const [hostFeedback, setHostFeedback] = useState(null);
  const [isJudging, setIsJudging] = useState(false);

  // Text-Input States
  const [textAnswer, setTextAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [textAnswers, setTextAnswers] = useState([]);
  const [selectedCorrectIds, setSelectedCorrectIds] = useState([]);
  const [answersSubmitted, setAnswersSubmitted] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);

  // NEU: Glücksrad States
  const [showWheel, setShowWheel] = useState(false);
  const [wheelPlayers, setWheelPlayers] = useState([]);
  const [selectedWheelPlayer, setSelectedWheelPlayer] = useState(null);
  const [wheelResult, setWheelResult] = useState(null);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    const loadPlayers = async () => {
      try {
    const response = await fetch(`${API_URL}/games/${gameId}/players`);
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
      resetQuestionState();
    });

    socket.on('category-started', (data) => {
      console.log('🎯 category-started empfangen:', data);
      setQuestion(data.question);
      setCurrentCategory(data.category);
      setShowCategoryIntro(false);
      setWaitingForCategoryStart(false);
      
      if (data.category.type === 'buzzer') {
        setBuzzerLocked(false);
      }
      
      resetQuestionState();
    });

    socket.on('next-question', (data) => {
      console.log('🎯 next-question empfangen:', data);
      setQuestion(data.question);
      setCurrentCategory(data.category);
      
      if (data.category.type === 'buzzer') {
        setBuzzerLocked(false);
      }
      
      resetQuestionState();
      setShowWheel(false); // Glücksrad verstecken
    });

    socket.on('player-buzzed', (data) => {
      setBuzzerLocked(true);
      setBuzzerPlayer(data.playerName);
      setBuzzerPlayerId(data.playerId);
      setShowBuzzAlert(true);
      setTimeout(() => setShowBuzzAlert(false), 2000);
    });

    socket.on('text-answer-submitted', (data) => {
      console.log('📝 Text-Antwort eingegangen:', data);
      setAnswersSubmitted(prev => prev + 1);
      
      if (isHost && question && showAnswers) {
        setTimeout(() => {
          loadTextAnswers();
        }, 500);
      }
    });

    socket.on('text-answers-judged', (data) => {
      console.log('✅ Text-Antworten bewertet:', data);
      if (data.awardedPoints && data.awardedPoints.length > 0) {
        const names = data.awardedPoints.map(p => p.name).join(', ');
        setCorrectAnswerPlayer(names);
        setShowCorrectAnswer(true);
        setTimeout(() => setShowCorrectAnswer(false), 3000);
      }
    });

    socket.on('answer-judged', (data) => {
      if (data.correct) {
        setCorrectAnswerPlayer(data.playerName);
        setShowCorrectAnswer(true);
        setTimeout(() => setShowCorrectAnswer(false), 2000);
      }
      
      if (!data.correct && isHost) {
        startUnlockCountdown();
      }
    });

    socket.on('buzzer-unlocked', () => {
      setBuzzerLocked(false);
      setBuzzerPlayer(null);
      setBuzzerPlayerId(null);
      setIsCountingDown(false);
      setCountdown(0);
    });

    socket.on('scores-update', (data) => {
      setPlayers(data.players);
    });

    // NEU: Glücksrad Events
    socket.on('wheel-triggered', (data) => {
      console.log('🎰 Glücksrad wurde ausgelöst!', data);
      setWheelPlayers(data.players);
      setShowWheel(true);
    });

    socket.on('game-finished', (data) => {
      setPlayers(data.players);
      setGameFinished(true);
      if (data.players.length > 0) {
        setWinner(data.players[0]);
      }
    }); // <-- HIER: game-finished Callback korrekt schließen

    // Disconnect Handler (global innerhalb useEffect)
    socket.on('disconnect', () => {
      console.log('⚠️  Socket getrennt - versuche Reconnect...');
    });

    // NEU: Connect Handler mit Auto-Rejoin (ebenfalls global in useEffect)
    socket.on('connect', () => {
      console.log('🔄 Socket verbunden - prüfe Session...');

      const session = loadSession();
      if (session && !isHost && session.gameId === gameId) {
        socket.emit('rejoin-game', { sessionId: session.sessionId }, (response) => {
          if (response.success) {
            console.log('✅ Auto-Rejoin erfolgreich!');
          } else {
            console.log('❌ Auto-Rejoin fehlgeschlagen:', response.error);
          }
        });
      }
    });

    // Cleanup Function - AUßERHALB aller Event-Handler (am Ende von useEffect)
    return () => {
      socket.off('category-intro');
      socket.off('category-started');
      socket.off('next-question');
      socket.off('player-buzzed');
      socket.off('text-answer-submitted');
      socket.off('text-answers-judged');
      socket.off('answer-judged');
      socket.off('buzzer-unlocked');
      socket.off('scores-update');
      socket.off('wheel-triggered');
      socket.off('game-finished');
      socket.off('disconnect');
      socket.off('connect');
    };
  }, [roomCode, navigate, isHost, gameId, question]);
  const resetQuestionState = () => {
    setBuzzerPlayer(null);
    setBuzzerPlayerId(null);
    setShowBuzzAlert(false);
    setIsCountingDown(false);
    setCountdown(0);
    setShowCorrectAnswer(false);
    setCorrectAnswerPlayer(null);
    setHostFeedback(null);
    setTextAnswer('');
    setHasSubmitted(false);
    setTextAnswers([]);
    setSelectedCorrectIds([]);
    setAnswersSubmitted(0);
    setShowAnswers(false);
  };

  const loadTextAnswers = () => {
    if (!question) return;
    
    socket.emit('get-text-answers', { questionId: question.id }, (response) => {
      if (response.success) {
        setTextAnswers(response.answers);
        setShowAnswers(true);
      }
    });
  };

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

  const handleSubmitTextAnswer = () => {
    if (!textAnswer.trim() || !question) return;

    socket.emit('submit-text-answer', {
      questionId: question.id,
      answerText: textAnswer
    }, (response) => {
      if (response.success) {
        setHasSubmitted(true);
        setTextAnswer('');
      }
    });
  };

  const handleJudgeAnswer = (correct) => {
    if (!buzzerPlayerId || isJudging) return;

    setIsJudging(true);

    socket.emit('judge-answer', { 
      playerId: buzzerPlayerId, 
      correct 
    }, (response) => {
      setIsJudging(false);
      
      if (response.success) {
        setHostFeedback({
          correct: response.correct,
          playerName: response.playerName,
          newScore: response.newScore
        });

        setTimeout(() => setHostFeedback(null), 3000);
      }
    });
  };

  const handleJudgeTextAnswers = () => {
    if (selectedCorrectIds.length === 0 || !question) {
      alert('Bitte wähle mindestens einen Spieler aus!');
      return;
    }

    socket.emit('judge-text-answers', {
      questionId: question.id,
      correctPlayerIds: selectedCorrectIds
    }, (response) => {
      if (response.success) {
        setHostFeedback({
          correct: true,
          playerNames: response.awardedPoints.map(p => p.name),
          multiple: true
        });

        setTimeout(() => setHostFeedback(null), 3000);
      }
    });
  };

  const toggleSelectAnswer = (playerId) => {
    setSelectedCorrectIds(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const handleStartCategory = () => {
    console.log('🚀 handleStartCategory aufgerufen');
    
    socket.emit('start-category', (response) => {
      console.log('📥 start-category Response:', response);
      if (response.success) {
        console.log('✅ Kategorie erfolgreich gestartet');
      } else {
        console.error('❌ Fehler beim Starten:', response.error);
        alert('Fehler: ' + response.error);
      }
    });
  };

  const handleNextQuestion = () => {
    socket.emit('next-question', (response) => {
      if (response.success) {
        if (response.showWheel) {
          console.log('🎰 Glücksrad wird angezeigt!');
          // Glücksrad wird über socket event 'wheel-triggered' angezeigt
        } else if (response.finished) {
          console.log('Spiel beendet');
        } else if (response.categoryChange) {
          console.log('Kategoriewechsel');
        }
      }
    });
  };

  // NEU: Glücksrad Callbacks
  const handleWheelPlayerSelected = (player) => {
    setSelectedWheelPlayer(player);
  };

  const handleWheelRewardResult = (result) => {
    setWheelResult(result);
  };

  const handleWheelComplete = (status) => {
    console.log('🎰 Glücksrad abgeschlossen:', status);
    setShowWheel(false);
    setSelectedWheelPlayer(null);
    setWheelResult(null);
  };

  // Kategorie Intro Screen
  if (showCategoryIntro && currentCategory) {
    return (
      <div className="page" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ textAlign: 'center', color: 'white', maxWidth: '800px' }}>
          <div style={{ fontSize: '8rem', marginBottom: '30px', animation: 'pulse 2s infinite' }}>
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
            margin: '0 auto 20px'
          }}>
            {currentCategory.description}
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '15px 30px',
            borderRadius: '10px',
            fontSize: '1.2rem',
            marginBottom: '40px'
          }}>
            {currentCategory.type === 'text_input' ? '📝 Text-Eingabe Runde' : '🔴 Buzzer Runde'}
          </div>

          {isHost && (
            <button
              className="btn btn-success"
              onClick={handleStartCategory}
              style={{
                fontSize: '1.5rem',
                padding: '20px 50px',
                background: 'white',
                color: '#667eea',
                border: 'none'
              }}
            >
              ▶️ Kategorie Starten
            </button>
          )}

          {!isHost && (
            <div style={{ marginTop: '30px' }}>
              <div className="spinner" style={{ 
                borderTopColor: 'white',
                margin: '0 auto 20px'
              }}></div>
              <p style={{ 
                fontSize: '1.2rem', 
                color: 'rgba(255,255,255,0.8)'
              }}>
                Warte auf Host...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Game Finished Screen
  if (gameFinished) {
      clearSession();
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

  const isTextInput = currentCategory?.type === 'text_input';

  // NEU: Glücksrad Overlay (nur für Host)
  if (showWheel && isHost) {
    return (
      <WheelOfFortune
        players={wheelPlayers}
        onPlayerSelected={handleWheelPlayerSelected}
        onRewardResult={handleWheelRewardResult}
        onComplete={handleWheelComplete}
        socket={socket}
      />
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
              <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                {currentCategory.name}
                {isTextInput && ' 📝'}
              </span>
            </div>
          )}
        </div>

        {/* Host Feedback Banner */}
        {isHost && hostFeedback && (
          <div style={{
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '20px',
            background: hostFeedback.correct 
              ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' 
              : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
            color: 'white',
            textAlign: 'center',
            animation: 'buzzAnimation 0.5s ease'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.5rem', color: 'white' }}>
              {hostFeedback.correct ? '✅ Richtig!' : '❌ Falsch!'}
            </h3>
            <p style={{ margin: 0, fontSize: '1.2rem' }}>
              {hostFeedback.multiple 
                ? `${hostFeedback.playerNames.join(', ')} bekommen Punkte!`
                : `${hostFeedback.playerName} ${hostFeedback.correct ? `hat jetzt ${hostFeedback.newScore} Punkt${hostFeedback.newScore !== 1 ? 'e' : ''}` : 'bekommt keinen Punkt'}`
              }
            </p>
          </div>
        )}

        {/* Frage anzeigen */}
        {question && (
          <div className="question-container">
            {/* Bild anzeigen falls vorhanden */}
            {question.image_url && (
              <div style={{
                marginBottom: '25px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <img
                  src={question.image_url}
                  alt="Frage Bild"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: '15px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    // Fallback bei Ladefehler
                    e.target.style.display = 'none';
                    console.error('Bild konnte nicht geladen werden:', question.image_url);
                  }}
                />
              </div>
            )}

            <p className="question-text">
              {question.text}
            </p>
            {isTextInput && !isHost && (
              <p style={{ fontSize: '1rem', color: '#666', marginTop: '10px' }}>
                {answersSubmitted > 0 && `${answersSubmitted} von ${players.length} Spielern haben geantwortet`}
              </p>
            )}
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
            <p>{correctAnswerPlayer}</p>
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

        {/* TEXT INPUT MODE - Spieler Eingabe */}
        {!isHost && isTextInput && question && !hasSubmitted && (
          <div style={{ margin: '30px 0' }}>
            <textarea
              className="input"
              placeholder="Deine Antwort eingeben..."
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              rows={3}
              style={{ 
                resize: 'vertical',
                fontSize: '1.1rem'
              }}
            />
            <button
              className="btn btn-success"
              onClick={handleSubmitTextAnswer}
              disabled={!textAnswer.trim()}
            >
              📤 Antwort Abschicken
            </button>
          </div>
        )}

        {!isHost && isTextInput && hasSubmitted && (
          <div className="alert alert-success" style={{ fontSize: '1.2rem' }}>
            ✅ Deine Antwort wurde abgeschickt! Warte auf die Auswertung...
          </div>
        )}

        {/* TEXT INPUT MODE - Host Bewertung */}
        {isHost && isTextInput && question && (
          <div style={{ margin: '30px 0' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: 0, color: '#667eea' }}>
                Eingegangene Antworten ({answersSubmitted}/{players.length})
              </h3>
              
              {!showAnswers ? (
                <button
                  className="btn btn-primary"
                  onClick={loadTextAnswers}
                  style={{ 
                    width: 'auto',
                    padding: '12px 30px',
                    fontSize: '1rem'
                  }}
                >
                  👀 Antworten anzeigen
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAnswers(false)}
                  style={{ 
                    width: 'auto',
                    padding: '12px 30px',
                    fontSize: '1rem'
                  }}
                >
                  🙈 Antworten verstecken
                </button>
              )}
            </div>

            {!showAnswers ? (
              <div className="alert alert-info">
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔒</div>
                  <p style={{ fontSize: '1.2rem', margin: 0 }}>
                    Antworten sind versteckt. Klicke "Antworten anzeigen" wenn alle Spieler geantwortet haben.
                  </p>
                </div>
              </div>
            ) : textAnswers.length === 0 ? (
              <div className="alert alert-info">
                Noch keine Antworten vorhanden...
              </div>
            ) : (
              <>
                <div className="players-list">
                  {textAnswers.map((answer) => (
                    <div 
                      key={answer.id}
                      className="player-item"
                      onClick={() => toggleSelectAnswer(answer.player_id)}
                      style={{
                        cursor: 'pointer',
                        background: selectedCorrectIds.includes(answer.player_id) 
                          ? '#d4edda' 
                          : 'white',
                        border: selectedCorrectIds.includes(answer.player_id)
                          ? '2px solid #28a745'
                          : '1px solid #e0e0e0',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ 
                          fontWeight: 'bold',
                          marginBottom: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <span>
                            {selectedCorrectIds.includes(answer.player_id) ? '✅' : '⬜'}
                          </span>
                          <span>{answer.player_name}</span>
                        </div>
                        <div style={{ 
                          fontSize: '1.1rem',
                          color: '#333',
                          fontStyle: 'italic'
                        }}>
                          "{answer.answer_text}"
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-success"
                  onClick={handleJudgeTextAnswers}
                  disabled={selectedCorrectIds.length === 0}
                  style={{ marginTop: '20px' }}
                >
                  ✅ {selectedCorrectIds.length} Spieler Punkt{selectedCorrectIds.length !== 1 ? 'e' : ''} geben
                </button>
              </>
            )}
          </div>
        )}

        {/* BUZZER MODE - Normale Buzzer UI */}
        {buzzerPlayer && !isCountingDown && !hostFeedback && !isTextInput && (
          <div className="alert alert-info" style={{ fontSize: '1.2rem' }}>
            <strong>{buzzerPlayer}</strong> hat gebuzzert! {isHost ? 'Bewerte die Antwort:' : 'Warte auf Bewertung...'}
          </div>
        )}

        {!isHost && !isTextInput && (
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
            {!isTextInput && buzzerPlayer && !isCountingDown && (
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                marginBottom: '20px',
                justifyContent: 'center'
              }}>
                <button
                  className="btn btn-success"
                  onClick={() => handleJudgeAnswer(true)}
                  disabled={!buzzerPlayerId || isJudging}
                  style={{ 
                    width: 'auto', 
                    padding: '15px 40px',
                    fontSize: '1.2rem'
                  }}
                >
                  {isJudging ? '⏳ Wird bewertet...' : '✅ Richtig (+1 Punkt)'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleJudgeAnswer(false)}
                  disabled={!buzzerPlayerId || isJudging}
                  style={{ 
                    width: 'auto', 
                    padding: '15px 40px',
                    fontSize: '1.2rem'
                  }}
                >
                  {isJudging ? '⏳ Wird bewertet...' : '❌ Falsch'}
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
            {players.map((player) => {
              return (
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default GamePage;