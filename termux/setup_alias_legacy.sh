#!/data/data/com.termux/files/usr/bin/bash
set -u

WIZARD="$HOME/wizard_tradutor_termux.sh"
BASHRC="$HOME/.bashrc"
ALIAS_LINE="alias SSSystem='chmod +x \"$WIZARD\" && \"$WIZARD\"'"

if [ ! -f "$WIZARD" ]; then
  echo "[ERRO] Wizard não encontrado: $WIZARD"
  echo "Crie ou copie o wizard antes de configurar o alias."
  exit 1
fi

chmod +x "$WIZARD"

touch "$BASHRC"

# Remove uma configuração anterior do mesmo alias para evitar duplicação.
grep -vE '^alias SSSystem=' "$BASHRC" > "$BASHRC.tmp"
mv "$BASHRC.tmp" "$BASHRC"
printf '%s\n' "$ALIAS_LINE" >> "$BASHRC"

# Disponibiliza o alias imediatamente nesta sessão.
# shellcheck disable=SC1090
source "$BASHRC"

echo "Alias configurado com sucesso."
echo
echo "Agora execute apenas:"
echo "SSSystem"
echo
echo "O comando continuará disponível quando o Termux for reaberto."
