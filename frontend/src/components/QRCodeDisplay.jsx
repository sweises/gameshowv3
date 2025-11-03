import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

function QRCodeDisplay() {
  const [serverUrl, setServerUrl] = useState('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    // Hole die aktuelle URL (ohne /host oder /join)
    const baseUrl = window.location.origin;
    setServerUrl(baseUrl);
  }, []);

  if (!serverUrl) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      {/* Toggle Button */}
      <button
        onClick={() => setShowQR(!showQR)}
        style={{
          position: 'absolute',
          bottom: showQR ? '270px' : '0',
          right: '0',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          fontSize: '1.8rem',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        }}
      >
        {showQR ? '✕' : '📱'}
      </button>

      {/* QR-Code Container */}
      {showQR && (
        <div
          style={{
            background: 'white',
            padding: '25px',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            marginBottom: '15px',
            animation: 'slideUp 0.3s ease',
            maxWidth: '280px'
          }}
        >
          <h3 style={{
            margin: '0 0 15px 0',
            color: '#667eea',
            fontSize: '1.2rem',
            textAlign: 'center'
          }}>
            📱 Zum Mitspielen scannen
          </h3>

          {/* QR-Code */}
          <div style={{
            background: 'white',
            padding: '15px',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <QRCodeSVG
              value={serverUrl}
              size={200}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#667eea"
            />
          </div>

          {/* URL Text */}
          <div style={{
            marginTop: '15px',
            padding: '10px',
            background: '#f0f4ff',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{
              margin: '0 0 5px 0',
              fontSize: '0.8rem',
              color: '#666',
              fontWeight: '500'
            }}>
              Oder öffne im Browser:
            </p>
            <p style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#667eea',
              fontWeight: 'bold',
              wordBreak: 'break-all'
            }}>
              {serverUrl}
            </p>
          </div>

          {/* Copy Button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(serverUrl);
              alert('📋 URL kopiert!');
            }}
            style={{
              width: '100%',
              marginTop: '15px',
              padding: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            📋 URL Kopieren
          </button>

          {/* Info Text */}
          <p style={{
            marginTop: '15px',
            marginBottom: '0',
            fontSize: '0.75rem',
            color: '#999',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            💡 Alle Geräte müssen im selben WLAN sein
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default QRCodeDisplay;