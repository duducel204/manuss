#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

# Instala somente a ponte MCP. O tradutor é uma etapa posterior.
RAW_BASE="https://raw.githubusercontent.com/duducel204/manuss/main/termux"

fail() {
  printf '\n[termux-mcp] ERRO: %s\n' "$1" >&2
  exit 1
}

command -v pkg >/dev/null 2>&1 || fail "Execute este comando dentro do Termux."

printf '[termux-mcp] Preparando o Termux para a ponte MCP...\n'
pkg update -y
pkg install -y curl

printf '[termux-mcp] Baixando o instalador oficial da ponte...\n'
curl -fL --retry 3 --retry-delay 1 \
  "$RAW_BASE/setup_mcp.sh?version=atomic-1" \
  | bash

printf '\n[termux-mcp] Ponte MCP instalada. Para iniciar:\n'
printf '  ~/tradutor-local/mcp/start.sh\n'
printf '\nA ponte MCP é a Etapa 1. Não foi instalado o tradutor.\n'
