import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import HostLobby from './pages/HostLobby';
import PlayerLobby from './pages/PlayerLobby';
import GamePage from './pages/GamePage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/host" element={<HostLobby />} />
          <Route path="/join" element={<PlayerLobby />} />
          <Route path="/game" element={<GamePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;