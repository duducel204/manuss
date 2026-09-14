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

log "Instalando dependências"
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

curl -fL --retry 3 "$RAW_BASE/mcp_server.py" -o "$MCP_DIR/server.py"
curl -fL --retry 3 "$RAW_BASE/requirements-mcp.txt" -o "$MCP_DIR/requirements.txt"

[ -x "$APP_DIR/.venv/bin/python" ] || python -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/python" -m pip install --upgrade pip
"$APP_DIR/.venv/bin/python" -m pip install -r "$MCP_DIR/requirements.txt"

cat > "$MCP_DIR/run_server.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
APP_DIR="${HOME}/tradutor-local"
export TERMUX_MCP_TOKEN_FILE="${HOME}/.config/termux-mcp/token"
exec "$APP_DIR/.venv/bin/python" "$APP_DIR/mcp/server.py"
SH
chmod +x "$MCP_DIR/run_server.sh"

cat > "$MCP_DIR/run_tunnel.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
TOKEN_FILE="${HOME}/.config/termux-mcp/cloudflared-token"
[ -s "$TOKEN_FILE" ] || { echo "Crie $TOKEN_FILE com o token do túnel Cloudflare." >&2; exit 2; }
exec cloudflared tunnel --no-autoupdate run --token "$(cat "$TOKEN_FILE")"
SH
chmod +x "$MCP_DIR/run_tunnel.sh"

cat > "$MCP_DIR/README-local.txt" <<EOF
Servidor: $MCP_DIR/server.py
Token MCP: $TOKEN_FILE

Inicie em dois terminais:
  $MCP_DIR/run_server.sh
  $MCP_DIR/run_tunnel.sh

No túnel Cloudflare, configure o serviço local como:
  http://127.0.0.1:8765

O endpoint MCP público será:
  https://SEU_HOSTNAME/mcp

No conector MCP do Manus, use o header:
  Authorization: Bearer <conteúdo de $TOKEN_FILE>
EOF

cat <<EOF

INSTALAÇÃO DO TERMUX MCP CONCLUÍDA

Servidor: $MCP_DIR/run_server.sh
Túnel:    $MCP_DIR/run_tunnel.sh
Token:    $TOKEN_FILE

Próximo passo:
1. Crie um túnel Cloudflare gerenciado e configure o serviço para http://127.0.0.1:8765.
2. Salve o token do túnel em $CONFIG_DIR/cloudflared-token (chmod 600).
3. Inicie o servidor e o túnel em terminais separados.
4. Registre no Manus o URL https://SEU_HOSTNAME/mcp com Authorization: Bearer <token MCP>.
EOF
