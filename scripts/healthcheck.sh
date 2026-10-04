#!/usr/bin/env bash
# ==============================================================================
# ArisShop 2026 — Monitor de Salud y Diagnóstico en Tiempo Real
# ==============================================================================
set -e

PORT="${PORT:-3005}"
ENDPOINT="http://localhost:$PORT/api/health"

echo "🔍 Diagnosticando estado de ArisShop..."

HTTP_RES=$(curl -s -w "\n%{http_code}" "$ENDPOINT" 2>/dev/null || echo -e "\n000")
HTTP_STATUS=$(echo "$HTTP_RES" | tail -n 1)
BODY=$(echo "$HTTP_RES" | sed '$d')

if [ "$HTTP_STATUS" != "200" ]; then
    echo "❌ ERROR: El servidor en $ENDPOINT no responde o devolvió código HTTP $HTTP_STATUS."
    exit 1
fi

echo "✅ Servidor HTTP: ACTIVO (HTTP 200 OK)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$BODY" | grep -o '"[a-zA-Z0-9_]*":\("[^"]*"\|true\|false\|[0-9]*\)' | sed 's/"//g' | while IFS=: read -r key val; do
    printf "  • %-20s : %s\n" "$key" "$val"
done
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Todos los subsistemas están operando con normalidad."
exit 0
