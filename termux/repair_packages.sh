#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

printf '\n[reparo] Verificando pacotes pendentes...\n'

# Tenta concluir a configuração sem remover dados do usuário.
dpkg --configure -a || true

printf '\n[reparo] Reinstalando dependências do problema...\n'
pkg reinstall -y perl make tar || true

printf '\n[reparo] Tentando configurar novamente...\n'
dpkg --configure -a

printf '\n[reparo] Corrigindo dependências...\n'
apt-get -f install -y

dpkg --configure -a

printf '\n[reparo] Estado final:\n'
dpkg --audit || true
printf '\n[reparo] Concluído. Agora execute novamente:\n'
printf '  ~/install_tradutor_termux.sh\n'
