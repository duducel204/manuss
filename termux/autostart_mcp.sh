#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

APP_DIR="${HOME}/tradutor-local"
START_SCRIPT="$APP_DIR/mcp/start.sh"
LOG_FILE="$APP_DIR/logs/mcp-autostart.log"

[ -x "$START_SCRIPT" ] || {
  printf '[termux-mcp] Instale primeiro a ponte MCP.\n' >&2
  exit 1
}

mkdir -p "$(dirname "$LOG_FILE")"

# Evita iniciar mais de uma ponte quando o Termux abrir novos shells.
if pgrep -f "[t]radutor-local/mcp/start.sh" >/dev/null 2>&1; then
  printf '[termux-mcp] Ponte MCP já está em execução.\n'
  exit 0
fi

nohup "$START_SCRIPT" >>"$LOG_FILE" 2>&1 </dev/null &
PID=$!
printf '[termux-mcp] Ponte MCP iniciada em segundo plano (PID %s).\n' "$PID"
printf '[termux-mcp] Consulte a URL em: %s\n' "$LOG_FILE"
printf '[termux-mcp] Para acompanhar: tail -f %s\n' "$LOG_FILE"
