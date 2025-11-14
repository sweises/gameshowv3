const os = require('os');

/**
 * Findet die lokale IP-Adresse (nicht localhost)
 * Bevorzugt IPv4 Adressen aus dem lokalen Netzwerk
 */
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    
    // Durchsuche alle Netzwerk-Interfaces
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip interne Adressen (127.0.0.1)
            if (iface.internal) {
                continue;
            }
            
            // Bevorzuge IPv4
            if (iface.family === 'IPv4') {
                // Bevorzuge private Netzwerk-Adressen (192.168.x.x, 10.x.x.x)
                if (iface.address.startsWith('192.168.') || 
                    iface.address.startsWith('10.') ||
                    iface.address.startsWith('172.16.')) {
                    return iface.address;
                }
            }
        }
    }
    
    // Fallback: Finde irgendeine IPv4 Adresse (nicht intern)
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    
    // Letzter Fallback
    return 'localhost';
}

module.exports = { getLocalIpAddress };

// Wenn direkt ausgeführt, IP ausgeben
if (require.main === module) {
    const ip = getLocalIpAddress();
    console.log(ip);
}