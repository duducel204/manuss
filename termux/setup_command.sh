#!/data/data/com.termux/files/usr/bin/bash
set -u

BIN_DIR="$HOME/bin"
COMMAND_FILE="$BIN_DIR/SSSystem"
WIZARD="$HOME/wizard_tradutor_termux.sh"
BASHRC="$HOME/.bashrc"

if [ ! -f "$WIZARD" ]; then
  echo "[ERRO] Wizard não encontrado: $WIZARD"
  exit 1
fi

mkdir -p "$BIN_DIR"

cat > "$COMMAND_FILE" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -u

WIZARD="$HOME/wizard_tradutor_termux.sh"

if [ ! -f "$WIZARD" ]; then
  echo "[ERRO] Wizard não encontrado: $WIZARD"
  exit 1
fi

chmod +x "$WIZARD"
exec bash "$WIZARD"
SH

chmod +x "$COMMAND_FILE"
touch "$BASHRC"

# Remove entradas antigas do alias e do PATH para evitar duplicação.
grep -vE '^alias SSSystem=' "$BASHRC" > "$BASHRC.tmp"
mv "$BASHRC.tmp" "$BASHRC"
grep -vF 'export PATH="$HOME/bin:$PATH"' "$BASHRC" > "$BASHRC.tmp"
mv "$BASHRC.tmp" "$BASHRC"
printf '%s\n' 'export PATH="$HOME/bin:$PATH"' >> "$BASHRC"

export PATH="$HOME/bin:$PATH"

if command -v SSSystem >/dev/null 2>&1; then
  echo "Comando SSSystem configurado com sucesso."
  echo "Local: $(command -v SSSystem)"
  echo
  echo "Agora execute:"
  echo "SSSystem"
else
  echo "[ERRO] O comando ainda não está disponível nesta sessão."
  echo "Feche e abra o Termux novamente e execute: SSSystem"
  exit 1
fi
