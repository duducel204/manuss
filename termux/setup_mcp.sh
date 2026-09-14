#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

APP_DIR="${HOME}/tradutor-local"
MCP_DIR="${APP_DIR}/mcp"
CONFIG_DIR="${HOME}/.config/termux-mcp"
TOKEN_FILE="${CONFIG_DIR}/token"
RAW_BASE="https://raw.githubusercontent.com/duducel204/manuss/main/termux"

log() { printf '\n[termux-mcp] %s\n' "$1"; }
fail() { printf '\n[termux-mcp] ERRO: %s\n' "$1" >&2; exit 1; }
command -v pkg >/dev/null 2>&1 || fail "Execute este script dentro do Termux."

log "Instalando dependências leves"
pkg update -y
pkg install -y python cloudflared curl

mkdir -p "$MCP_DIR" "$CONFIG_DIR" "$APP_DIR/logs"
chmod 700 "$CONFIG_DIR"

if [ ! -s "$TOKEN_FILE" ]; then
  python - <<'PY' > "$TOKEN_FILE"
import secrets
print(secrets.token_urlsafe(32))
PY
  chmod 600 "$TOKEN_FILE"
  log "Token pessoal criado em $TOKEN_FILE"
fi

# O parâmetro evita que um cache intermediário entregue uma versão antiga.
curl -fL --retry 3 "$RAW_BASE/mcp_server.py?v=3" -o "$MCP_DIR/server.py"
curl -fL --retry 3 "$RAW_BASE/requirements-mcp.txt?v=3" -o "$MCP_DIR/requirements.txt"
curl -fL --retry 3 "$RAW_BASE/autostart_mcp.sh?v=3" -o "$MCP_DIR/autostart_mcp.sh"
chmod +x "$MCP_DIR/autostart_mcp.sh"

cat > "$MCP_DIR/run_server.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
APP_DIR="${HOME}/tradutor-local"
export TERMUX_MCP_TOKEN_FILE="${HOME}/.config/termux-mcp/token"
exec python "$APP_DIR/mcp/server.py"
SH
chmod +x "$MCP_DIR/run_server.sh"

cat > "$MCP_DIR/start.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
APP_DIR="${HOME}/tradutor-local"
MCP_DIR="$APP_DIR/mcp"
TOKEN_FILE="${HOME}/.config/termux-mcp/token"
SERVER_LOG="$APP_DIR/logs/mcp-server.log"
TUNNEL_LOG="$APP_DIR/logs/mcp-tunnel.log"

cleanup() {
  [ -n "${TUNNEL_PID:-}" ] && kill "$TUNNEL_PID" 2>/dev/null || true
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

export TERMUX_MCP_TOKEN_FILE="$TOKEN_FILE"
python "$MCP_DIR/server.py" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!
sleep 1
kill -0 "$SERVER_PID" 2>/dev/null || { cat "$SERVER_LOG" >&2; exit 1; }

: > "$TUNNEL_LOG"
cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8765 2>&1 | tee "$TUNNEL_LOG" &
TUNNEL_PID=$!

URL=""
for _ in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -n 1 || true)
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Não foi possível obter a URL do Quick Tunnel." >&2
  cat "$TUNNEL_LOG" >&2
  exit 1
fi

printf '\n==============================================\n'
printf 'TERMUX MCP ATIVO\n'
printf '==============================================\n'
printf 'URL para o Manus: %s/mcp\n' "$URL"
printf 'Header: Authorization: Bearer %s\n' "$(cat "$TOKEN_FILE")"
printf '==============================================\n'
printf 'Mantenha este terminal aberto. Ctrl+C encerra a ponte.\n\n'

wait "$TUNNEL_PID"
SH
chmod +x "$MCP_DIR/start.sh"

cat > "$MCP_DIR/run_tunnel.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
exec "${HOME}/tradutor-local/mcp/start.sh"
SH
chmod +x "$MCP_DIR/run_tunnel.sh"

cat > "$MCP_DIR/README-local.txt" <<EOF
Para iniciar tudo com um único comando:
  $MCP_DIR/start.sh

Esse comando inicia o servidor MCP e um Cloudflare Quick Tunnel temporário.
Mantenha o terminal aberto. A URL exibida deve terminar em /mcp.

Token MCP: $TOKEN_FILE
EOF

cat <<EOF

INSTALAÇÃO CONCLUÍDA

Agora execute apenas:
  $MCP_DIR/start.sh

O comando iniciará o servidor MCP e exibirá automaticamente a URL para cadastrar no Manus.
Mantenha o terminal aberto enquanto quiser usar a ponte.
EOF
