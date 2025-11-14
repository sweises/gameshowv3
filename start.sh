#!/bin/bash

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "   Quiz Buzzer - Local Network"
echo "========================================"
echo ""

# Prüfe ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo -e "${RED}[FEHLER] Node.js ist nicht installiert!${NC}"
    echo ""
    echo "Bitte installiere Node.js von: https://nodejs.org"
    echo ""
    exit 1
fi

echo -e "${GREEN}[INFO] Node.js gefunden!${NC}"
echo ""

# Starte die App
node start-local-network.js