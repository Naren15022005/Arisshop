#!/usr/bin/env bash
# ==============================================================================
# ArisShop 2026 — Script de Inicio y Orquestación de Producción
# ==============================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Asegurar path de compilador Go
export PATH="/home/alfonso/.local/go/bin:/usr/local/go/bin:$PATH"

mkdir -p logs

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 INICIANDO ARISSHOP ENTERPRISE SYSTEM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Compilar binario si no existe o ha cambiado
if [ ! -f "backend/arisshop-server" ] || [ "backend/main.go" -nt "backend/arisshop-server" ]; then
    echo "🔨 Compilando servidor Go (arisshop-server)..."
    (cd backend && go build -o arisshop-server main.go)
    echo "✅ Binario compilado exitosamente."
fi

# 2. Verificar si el servidor ya está activo
PORT="${PORT:-3005}"
if lsof -Pi :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "ℹ️  ArisShop Server ya se encuentra escuchando en el puerto $PORT."
else
    echo "⚡ Lanzando backend en http://localhost:$PORT..."
    nohup ./backend/arisshop-server > logs/arisshop.log 2>&1 &
    SERVER_PID=$!
    echo "$SERVER_PID" > logs/arisshop.pid
    sleep 2
    echo "✅ Backend activo con PID $SERVER_PID (logs en logs/arisshop.log)."
fi

# 3. Lanzar túnel Cloudflare si está disponible
if [ -f "bin/cloudflared" ]; then
    if pgrep -f "bin/cloudflared tunnel" >/dev/null 2>&1; then
        echo "ℹ️  Túnel Cloudflare ya se encuentra activo."
    else
        echo "🌐 Lanzando túnel seguro de Cloudflare..."
        nohup ./bin/cloudflared tunnel --url "http://localhost:$PORT" > logs/tunnel.log 2>&1 &
        TUNNEL_PID=$!
        echo "$TUNNEL_PID" > logs/tunnel.pid
        sleep 4
        TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare\.com' logs/tunnel.log | head -n 1 || echo "")
        if [ -n "$TUNNEL_URL" ]; then
            echo "✅ Túnel público conectado: $TUNNEL_URL"
        else
            echo "✅ Túnel iniciado (revisar logs/tunnel.log para URL)."
        fi
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✨ SISTEMA OPERATIVO Y DISPONIBLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
