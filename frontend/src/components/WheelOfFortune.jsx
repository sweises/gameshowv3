import React, { useState, useEffect } from 'react';
import './WheelOfFortune.css';

function WheelOfFortune({ 
  players, 
  onPlayerSelected, 
  onRewardResult, 
  onComplete,
  socket 
}) {
  const [phase, setPhase] = useState('player-selection'); // player-selection, player-decision, reward-spin, result
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rewardResult, setRewardResult] = useState(null);
  const [playerDecision, setPlayerDecision] = useState(null);

  // Socket Events
  useEffect(() => {
    socket.on('player-selected', (data) => {
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
        // Animation läuft - warten auf server event
        setTimeout(() => {
          setSpinning(false);
          onPlayerSelected(response.selectedPlayer);
        }, 3000);
      }
    });
  };

  const handlePlayerDecision = (decision) => {
    socket.emit('wheel-player-decision', {
      playerId: selectedPlayer.id,
      decision
    });
  };

  const spinRewardWheel = () => {
    if (spinning) return;
    
    setSpinning(true);
    
    socket.emit('spin-reward-wheel', (response) => {
      if (response.success) {
        setTimeout(() => {
          setSpinning(false);
          onRewardResult(response.result);
        }, 3000);
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
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="wheel-segment"
                  style={{
                    transform: `rotate(${(360 / players.length) * index}deg)`,
                  }}
                >
                  <span className="player-name-segment">
                    {player.name}
                  </span>
                </div>
              ))}
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
                  <div>⭐ +1 bis +3 Punkte</div>
                  <div>🎁 +5 Punkte (Jackpot!)</div>
                </div>
              </div>
              
              <div className="vs">VS</div>
              
              <div className="info-box punishment-box">
                <h3>⚠️ Mögliche Strafen</h3>
                <div className="punishment-list">
                  <div>😵 Lustige Herausforderungen</div>
                  <div>🎭 Lustige Aktionen</div>
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
            <h1>🎰 DREH DAS RAD DES SCHICKSALS!</h1>
            <p>{selectedPlayer.name} - Viel Glück!</p>
          </div>

          <div className="reward-wheel">
            <div className={`wheel-spinner-reward ${spinning ? 'spinning' : ''}`}>
              {/* 10 Punkte-Felder */}
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(0deg)' }}>⭐ +1</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(18deg)' }}>⚠️</div>
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(36deg)' }}>⭐ +1</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(54deg)' }}>⚠️</div>
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(72deg)' }}>⭐ +2</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(90deg)' }}>⚠️</div>
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(108deg)' }}>⭐ +1</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(126deg)' }}>⚠️</div>
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(144deg)' }}>⭐ +2</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(162deg)' }}>⚠️</div>
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(180deg)' }}>⭐ +3</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(198deg)' }}>⚠️</div>
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(216deg)' }}>⭐ +1</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(234deg)' }}>⚠️</div>
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(252deg)' }}>⭐ +2</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(270deg)' }}>⚠️</div>
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(288deg)' }}>🎁 +5</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(306deg)' }}>⚠️</div>
              <div className="wheel-segment-reward points" style={{ transform: 'rotate(324deg)' }}>⭐ +3</div>
              <div className="wheel-segment-reward punishment" style={{ transform: 'rotate(342deg)' }}>⚠️</div>
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
                <p className="result-player">{selectedPlayer.name} bekommt {rewardResult.points} Punkt{rewardResult.points !== 1 ? 'e' : ''}!</p>
              </>
            ) : (
              <>
                <div className="result-icon punishment-icon">{rewardResult.icon}</div>
                <h2 className="result-text punishment-text">{rewardResult.text}</h2>
                <p className="result-player">
                  {selectedPlayer.name} muss für {rewardResult.duration} Frage{rewardResult.duration !== 1 ? 'n' : ''}:
                </p>
                <div className="punishment-badge">
                  {rewardResult.text}
                </div>
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