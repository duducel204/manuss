#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_HOME="$(mktemp -d)"
MOCK_BIN="$TEST_HOME/mock-bin"
cleanup() { rm -rf "$TEST_HOME"; }
trap cleanup EXIT
mkdir -p "$MOCK_BIN" "$TEST_HOME/bin"

# O teste não compila Whisper nem acessa microfone. Ele simula somente o ambiente
# mínimo necessário para validar a instalação do wizard e do SSSystem.
cat > "$MOCK_BIN/pkg" <<'SH'
#!/usr/bin/env bash
exit 0
SH
cat > "$MOCK_BIN/python" <<'SH'
#!/usr/bin/env bash
printf 'Python 3.13.0 (mock)\n'
SH
for command_name in ffmpeg ffprobe git cmake termux-microphone-record; do
  cat > "$MOCK_BIN/$command_name" <<'SH'
#!/usr/bin/env bash
exit 0
SH
done
chmod +x "$MOCK_BIN"/*

export HOME="$TEST_HOME"
export PATH="$MOCK_BIN:$TEST_HOME/bin:$PATH"

printf '[1/5] Validando sintaxe dos scripts...\n'
for script in "$ROOT_DIR"/termux/*.sh; do
  bash -n "$script"
done

printf '[2/5] Preparando instalação simulada...\n'
cp "$ROOT_DIR/termux/wizard.sh" "$HOME/wizard_tradutor_termux.sh"
cp "$ROOT_DIR/termux/setup_command.sh" "$HOME/setup_command_sssystem.sh"
chmod +x "$HOME/wizard_tradutor_termux.sh" "$HOME/setup_command_sssystem.sh"

printf '[3/5] Executando configuração do SSSystem...\n'
bash "$HOME/setup_command_sssystem.sh" >/tmp/sssystem-setup-test.out
[ -x "$HOME/bin/SSSystem" ]
[ -f "$HOME/.bashrc" ]
grep -q 'export PATH="\$HOME/bin:\$PATH"' "$HOME/.bashrc"

printf '[4/5] Executando SSSystem e saindo pelo menu...\n'
printf '8\n' | bash "$HOME/bin/SSSystem" >/tmp/sssystem-run-test.out
 grep -q 'ASSISTENTE DO PROTÓTIPO LOCAL' /tmp/sssystem-run-test.out
 grep -q 'Suporte e solução de erros' /tmp/sssystem-run-test.out

printf '[5/5] Verificando idempotência do setup...\n'
bash "$HOME/setup_command_sssystem.sh" >/dev/null
[ "$(grep -cF 'export PATH="$HOME/bin:$PATH"' "$HOME/.bashrc")" -eq 1 ]

rm -f /tmp/sssystem-setup-test.out /tmp/sssystem-run-test.out
printf 'OK — scripts, wizard e SSSystem passaram no teste simulado.\n'
