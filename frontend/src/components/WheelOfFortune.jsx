import React, { useState, useEffect } from 'react';
import './WheelOfFortune.css';

function WheelOfFortune({ 
  players, 
  onPlayerSelected, 
  onRewardResult, 
  onComplete,
  socket 
}) {
  const [phase, setPhase] = useState('player-selection');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rewardResult, setRewardResult] = useState(null);
  const [playerDecision, setPlayerDecision] = useState(null);

  // Socket Events
  useEffect(() => {
    socket.on('player-selected', (data) => {
      setSpinning(false); // Animation beendet
      setSelectedPlayer(data.player);
      setPhase('player-decision');
    });

    socket.on('player-passed', () => {
      setPlayerDecision('passed');
      setTimeout(() => {
        onComplete('passed');
      }, 2000);
    });

    socket.on('player-accepted', () => {
      setPlayerDecision('accepted');
      setTimeout(() => {
        setPhase('reward-spin');
        setPlayerDecision(null);
      }, 1500);
    });

    socket.on('reward-result', (data) => {
      setSpinning(false); // Animation beendet
      setRewardResult(data.result);
      setPhase('result');
    });

    return () => {
      socket.off('player-selected');
      socket.off('player-passed');
      socket.off('player-accepted');
      socket.off('reward-result');
    };
  }, [socket, onComplete]);

  const spinPlayerWheel = () => {
    if (spinning) return;
    
    setSpinning(true);
    
    socket.emit('spin-player-wheel', (response) => {
      if (response.success) {
        // Backend wartet jetzt 6 Sekunden bevor player-selected Event kommt
        // Kein setTimeout mehr nötig hier
        onPlayerSelected(response.selectedPlayer);
      } else {
        setSpinning(false);
        console.error('Fehler beim Drehen:', response.error);
      }
    });
  };

  const handlePlayerDecision = (decision) => {
    socket.emit('wheel-player-decision', {
      playerId: selectedPlayer.id,
      decision
    }, (response) => {
      if (!response.success) {
        console.error('Fehler bei Entscheidung:', response.error);
      }
    });
  };

  const spinRewardWheel = () => {
    if (spinning) return;
    
    setSpinning(true);
    
    socket.emit('spin-reward-wheel', (response) => {
      if (response.success) {
        // Backend wartet jetzt 6 Sekunden bevor reward-result Event kommt
        // Kein setTimeout mehr nötig hier
        onRewardResult(response.result);
      } else {
        setSpinning(false);
        console.error('Fehler beim Drehen:', response.error);
      }
    });
  };

  const applyResult = () => {
    socket.emit('apply-wheel-result', {
      playerId: selectedPlayer.id,
      result: rewardResult
    }, (response) => {
      if (response.success) {
        onComplete('completed');
      } else {
        console.error('Fehler beim Anwenden:', response.error);
      }
    });
  };

  // === PHASE 1: Spieler-Auswahl ===
  if (phase === 'player-selection') {
    return (
      <div className="wheel-overlay">
        <div className="wheel-container">
          <div className="wheel-header">
            <h1>🎰 GLÜCKSRAD!</h1>
            <p>Welcher Spieler wird ausgewählt?</p>
          </div>

          <div className="player-wheel">
            <div className={`wheel-spinner ${spinning ? 'spinning' : ''}`}>
              {players.map((player, index) => {
                const rotation = (360 / players.length) * index;
                return (
                  <div
                    key={player.id}
                    className="wheel-segment"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                    }}
                  >
                    <span className="player-name-segment">
                      {player.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="wheel-pointer">▼</div>
          </div>

          <button
            className="btn btn-primary wheel-btn"
            onClick={spinPlayerWheel}
            disabled={spinning}
          >
            {spinning ? '🔄 Dreht...' : '🎯 RAD DREHEN!'}
          </button>

          {spinning && (
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '1.2rem',
              color: '#667eea',
              fontWeight: 'bold',
              animation: 'pulse 1s infinite'
            }}>
              Das Rad dreht sich...
            </div>
          )}
        </div>
      </div>
    );
  }

  // === PHASE 2: Spieler-Entscheidung ===
  if (phase === 'player-decision') {
    return (
      <div className="wheel-overlay">
        <div className="wheel-container">
          <div className="wheel-header">
            <h1>🎯 {selectedPlayer.name} wurde ausgewählt!</h1>
            <p>Möchtest du am Glücksrad drehen?</p>
          </div>

          <div className="player-decision">
            <div className="decision-info">
              <div className="info-box reward-box">
                <h3>✨ Mögliche Belohnungen</h3>
                <div className="reward-list">
                  <div>⭐ +1, +2 oder +3 Punkte</div>
                  <div>🎁 +5 Punkte (Jackpot!)</div>
                </div>
              </div>
              
              <div className="vs">VS</div>
              
              <div className="info-box punishment-box">
                <h3>⚠️ Mögliche Strafen</h3>
                <div className="punishment-list">
                  <div>😵 Lustige Herausforderungen</div>
                  <div>🎭 Real-Life Aufgaben</div>
                </div>
              </div>
            </div>

            {!playerDecision && (
              <div className="decision-buttons">
                <button
                  className="btn btn-success wheel-btn"
                  onClick={() => handlePlayerDecision('gamble')}
                >
                  🎰 ICH ZOCKE!
                </button>
                <button
                  className="btn btn-secondary wheel-btn"
                  onClick={() => handlePlayerDecision('pass')}
                >
                  🚫 Lieber nicht...
                </button>
              </div>
            )}

            {playerDecision === 'passed' && (
              <div className="decision-result">
                <h2>🚫 Kein Risiko eingegangen</h2>
                <p>Weiter geht's zur nächsten Frage!</p>
              </div>
            )}

            {playerDecision === 'accepted' && (
              <div className="decision-result">
                <h2>🎰 Mutig! Viel Glück!</h2>
                <p>Bereite dich auf das Glücksrad vor...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === PHASE 3: Belohnungs/Strafen-Rad ===
  if (phase === 'reward-spin') {
    return (
      <div className="wheel-overlay">
        <div className="wheel-container">
          <div className="wheel-header">
            <h1>🎰 Versuch dein Glück, {selectedPlayer.name}</h1>
          </div>

          <div className="reward-wheel">
            <div className={`wheel-spinner-reward ${spinning ? 'spinning' : ''}`}>
              {/* Rad wird durch conic-gradient in CSS dargestellt */}
              {/* Texte über dem Rad */}
              <div className="wheel-segment-reward" style={{ transform: 'rotate(9deg)' }}>
                <span>⭐ +1</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(27deg)' }}>
                <span>⚠️</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(45deg)' }}>
                <span>⭐ +1</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(63deg)' }}>
                <span>⚠️</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(81deg)' }}>
                <span>⭐ +2</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(99deg)' }}>
                <span>⚠️</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(117deg)' }}>
                <span>⭐ +1</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(135deg)' }}>
                <span>⚠️</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(153deg)' }}>
                <span>⭐ +2</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(171deg)' }}>
                <span>⚠️</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(189deg)' }}>
                <span>⭐ +3</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(207deg)' }}>
                <span>⚠️</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(225deg)' }}>
                <span>⭐ +1</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(243deg)' }}>
                <span>⚠️</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(261deg)' }}>
                <span>⭐ +2</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(279deg)' }}>
                <span>⚠️</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(297deg)', fontSize: '2rem' }}>
                <span>🎁 +5</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(315deg)' }}>
                <span>⚠️</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(333deg)' }}>
                <span>⭐ +3</span>
              </div>
              <div className="wheel-segment-reward" style={{ transform: 'rotate(351deg)' }}>
                <span>⚠️</span>
              </div>
            </div>
            <div className="wheel-pointer">▼</div>
          </div>

          <button
            className="btn btn-danger wheel-btn"
            onClick={spinRewardWheel}
            disabled={spinning}
          >
            {spinning ? '🔄 Dreht...' : '🎰 JETZT DREHEN!'}
          </button>

          {spinning && (
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '1.2rem',
              color: '#eb3349',
              fontWeight: 'bold',
              animation: 'pulse 1s infinite'
            }}>
              Spannung steigt... 🎲
            </div>
          )}
        </div>
      </div>
    );
  }

  // === PHASE 4: Ergebnis ===
  if (phase === 'result' && rewardResult) {
    return (
      <div className="wheel-overlay">
        <div className="wheel-container">
          <div className="wheel-header">
            <h1>
              {rewardResult.type === 'points' ? '🎉 GEWONNEN!' : '😱 STRAFE!'}
            </h1>
          </div>

          <div className="result-display">
            {rewardResult.type === 'points' ? (
              <>
                <div className="result-icon points-icon">{rewardResult.icon}</div>
                <h2 className="result-text">
                  +{rewardResult.points} Punkt{rewardResult.points !== 1 ? 'e' : ''}!
                </h2>
                <p className="result-player">
                  {selectedPlayer.name} bekommt {rewardResult.points} Punkt{rewardResult.points !== 1 ? 'e' : ''}!
                </p>
                {rewardResult.points === 5 && (
                  <div style={{
                    fontSize: '2rem',
                    marginTop: '20px',
                    animation: 'pulse 1s infinite'
                  }}>
                    🎊 JACKPOT! 🎊
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="result-text punishment-text">{selectedPlayer.name} wird bestraft:</h2>
                <h2 className="result-text punishment-text">{rewardResult.text}</h2>
              </>
            )}
          </div>

          <button
            className="btn btn-success wheel-btn"
            onClick={applyResult}
          >
            ✅ Weiter zur nächsten Frage
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default WheelOfFortune;