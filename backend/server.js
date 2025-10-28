const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const db = require('./db/database');
const setupGameSocket = require('./sockets/gameSocket');
const categoryRoutes = require('./routes/categoryRoutes'); // NEU

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server läuft!', timestamp: new Date() });
});

app.use('/api', categoryRoutes(db)); // NEU - Kategorie Routes

// Socket.IO Setup
setupGameSocket(io, db);

// Server starten
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
    console.log(`📡 Lokale URL: http://localhost:${PORT}`);
});