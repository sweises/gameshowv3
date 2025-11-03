import React from 'react';
import { useNavigate } from 'react-router-dom';
import QRCodeDisplay from '../components/QRCodeDisplay';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="card">
        <h1>🎯 Quiz Buzzer</h1>
        <p>Willkommen zur ultimativen Quiz-Show!</p>
        
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/host')}
        >
          🎮 Spiel Hosten
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/join')}
        >
          👥 Spiel Beitreten
        </button>
      </div>

      {/* QR-Code unten rechts */}
      <QRCodeDisplay />
    </div>
  );
}

export default HomePage;