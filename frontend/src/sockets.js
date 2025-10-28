import { io } from 'socket.io-client';

// WICHTIG: Ändere die URL später für dein lokales Netzwerk
// Für jetzt nutzen wir localhost
const SOCKET_URL = 'http://localhost:3001';

const socket = io(SOCKET_URL, {
    autoConnect: false, // Wir verbinden manuell
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// Debug-Logs
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