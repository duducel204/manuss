#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

RAW_BASE="https://raw.githubusercontent.com/duducel204/manuss/main/termux"
INSTALLER="$HOME/install_tradutor_termux.sh"

fail() {
  printf '\n[tradutor-local] ERRO: %s\n' "$1" >&2
  exit 1
}

command -v pkg >/dev/null 2>&1 || fail "Instale e abra o Termux antes de executar este comando."

download_installer() {
  local destination="$1" temporary url
  temporary="${destination}.tmp.$$"
  for url in \
    "$RAW_BASE/install.sh" \
    "https://github.com/duducel204/manuss/raw/refs/heads/main/termux/install.sh" \
    "https://api.github.com/repos/duducel204/manuss/contents/termux/install.sh"; do
    rm -f "$temporary"
    printf '[tradutor-local] Tentando baixar por %s\n' "$url"
    if [ "$url" = *api.github.com* ]; then
      curl -fL --retry 3 --retry-delay 2 -H 'Accept: application/vnd.github.raw+json' "$url" -o "$temporary" || continue
    else
      curl -fL --retry 3 --retry-delay 2 "$url" -o "$temporary" || continue
    fi
    if [ -s "$temporary" ] && grep -q '^#!/data/data/com.termux/files/usr/bin/bash' "$temporary"; then
      mv -f "$temporary" "$destination"
      chmod +x "$destination"
      return 0
    fi
  done
  rm -f "$temporary"
  printf '[tradutor-local] Falha de rede ao acessar o GitHub.\n' >&2
  [ -n "${HTTPS_PROXY:-}${HTTP_PROXY:-}${ALL_PROXY:-}" ] && \
    printf '[tradutor-local] Proxy detectado nas variáveis do ambiente; verifique se está acessível.\n' >&2 || \
    printf '[tradutor-local] Nenhum proxy explícito detectado; verifique DNS, VPN, firewall ou rede.\n' >&2
  fail "Não foi possível baixar o instalador por nenhuma URL alternativa."
}

printf '[tradutor-local] Atualizando o índice de pacotes...\n'
pkg update -y

if ! command -v curl >/dev/null 2>&1; then
  printf '[tradutor-local] Instalando curl para baixar o instalador...\n'
  pkg install -y curl
fi

printf '[tradutor-local] Baixando o instalador principal...\n'
download_installer "$INSTALLER"

exec "$INSTALLER"
