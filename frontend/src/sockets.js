import { io } from 'socket.io-client';

// Dynamische Server-URL aus Environment Variable
const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

console.log('🌐 Verbinde zu Server:', SOCKET_URL);

const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

socket.on('connect', () => {
    console.log('✅ Mit Server verbunden!', socket.id);
});

socket.on('disconnect', () => {
    console.log('❌ Verbindung getrennt');
});

socket.on('connect_error', (error) => {
    console.error('🔴 Verbindungsfehler:', error);
});

export default socket;