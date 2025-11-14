const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getLocalIpAddress } = require('./get-local-ip');

const PORT = process.env.PORT || 3001;
const FRONTEND_PORT = 3000;

// Ermittle lokale IP
const localIp = getLocalIpAddress();
const SERVER_URL = `http://${localIp}:${PORT}`;

console.log('\n🌐 ==========================================');
console.log(`📍 Lokale IP erkannt: ${localIp}`);
console.log(`🔌 Backend URL: ${SERVER_URL}`);
console.log(`🎨 Frontend URL: http://${localIp}:${FRONTEND_PORT}`);
console.log('🌐 ==========================================\n');

// Backend .env aktualisieren
const backendEnvPath = path.join(__dirname, 'backend', '.env');
let backendEnv = `PORT=${PORT}
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=quiz_buzzer
DB_PASSWORD=postgres
DB_PORT=5432
`;

fs.writeFileSync(backendEnvPath, backendEnv);
console.log('✅ Backend .env aktualisiert\n');

// Frontend .env aktualisieren
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
let frontendEnv = `REACT_APP_SERVER_URL=${SERVER_URL}
HOST=0.0.0.0
PORT=${FRONTEND_PORT}
`;

fs.writeFileSync(frontendEnvPath, frontendEnv);
console.log('✅ Frontend .env aktualisiert\n');

// Info für Nutzer
console.log('📱 ==========================================');
console.log('   So können andere beitreten:');
console.log('📱 ==========================================');
console.log(`\n🔗 URL: http://${localIp}:${FRONTEND_PORT}`);
console.log('\n💡 Oder QR-Code scannen (unten rechts im Browser)\n');
console.log('⚠️  Alle Geräte müssen im selben WLAN sein!\n');
console.log('🔥 Firewall-Warnung: Ports 3000 & 3001 müssen offen sein!\n');

// Wähle Script-Typ basierend auf Argument
const mode = process.argv[2] || 'dev';

if (mode === 'backend') {
    console.log('🚀 Starte nur Backend...\n');
    startBackend();
} else if (mode === 'frontend') {
    console.log('🚀 Starte nur Frontend...\n');
    startFrontend();
} else {
    console.log('🚀 Starte Backend & Frontend...\n');
    startBoth();
}

function startBackend() {
    const backend = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, 'backend'),
        stdio: 'inherit',
        shell: true
    });

    backend.on('error', (err) => {
        console.error('❌ Backend Fehler:', err);
    });

    backend.on('close', (code) => {
        console.log(`\n⚠️  Backend beendet mit Code ${code}`);
        process.exit(code);
    });
}

function startFrontend() {
    const frontend = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'frontend'),
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            BROWSER: 'none' // Verhindere Auto-Browser-Öffnung
        }
    });

    frontend.on('error', (err) => {
        console.error('❌ Frontend Fehler:', err);
    });

    frontend.on('close', (code) => {
        console.log(`\n⚠️  Frontend beendet mit Code ${code}`);
        process.exit(code);
    });
}

function startBoth() {
    startBackend();
    
    // Warte 3 Sekunden bevor Frontend gestartet wird
    setTimeout(() => {
        startFrontend();
    }, 3000);
}

// Cleanup bei CTRL+C
process.on('SIGINT', () => {
    console.log('\n\n👋 Server werden beendet...');
    process.exit(0);
});