#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

RAW_BASE="https://raw.githubusercontent.com/duducel204/manuss/main/termux"
INSTALLER="$HOME/install_tradutor_termux.sh"

fail() {
  printf '\n[tradutor-local] ERRO: %s\n' "$1" >&2
  exit 1
}

command -v pkg >/dev/null 2>&1 || fail "Instale e abra o Termux antes de executar este comando."

printf '[tradutor-local] Atualizando o índice de pacotes...\n'
pkg update -y

if ! command -v curl >/dev/null 2>&1; then
  printf '[tradutor-local] Instalando curl para baixar o instalador...\n'
  pkg install -y curl
fi

printf '[tradutor-local] Baixando o instalador principal...\n'
curl -fL --retry 3 "$RAW_BASE/install.sh" -o "$INSTALLER"
chmod +x "$INSTALLER"

exec "$INSTALLER"
