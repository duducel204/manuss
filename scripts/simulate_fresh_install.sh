#!/usr/bin/env bash

# simulate_fresh_install.sh
# Simula as verificações não-destrutivas que um usuário novo veria ao tentar instalar
# o projeto em um ambiente "limpo" (runner Ubuntu). Não executa comandos Termux.

set -u

log() { printf "%s\n" "$*"; }
warn() { printf "AVISO: %s\n" "$*"; }
err() { printf "ERRO: %s\n" "$*"; }

OK=0
WARN=0
BLOCKER=0

check_file() {
  if [ -f "$1" ]; then
    log "OK: Encontrado $1"
    return 0
  else
    err "Não encontrado: $1"
    BLOCKER=$((BLOCKER+1))
    return 1
  fi
}

check_readme_contains() {
  local pattern="$1"
  if grep -q -F "$pattern" README.md; then
    log "OK: README contém: $pattern"
  else
    warn "README não contém o texto esperado: $pattern"
    WARN=$((WARN+1))
  fi
}

check_no_versioned_bigfiles() {
  # checar padrões óbvios
  local banned_patterns=("*.bin" "models/" "audio/" "results/" "*.pth" "*.pt" "*.onnx" "__pycache__/" ".venv/" "venv/")
  local found=0
  for p in "${banned_patterns[@]}"; do
    if git ls-files -- "${p}" | grep -q .; then
      warn "Arquivos potencialmente grandes versionados correspondem a: $p"
      found=1
    fi
  done
  if [ $found -eq 1 ]; then
    WARN=$((WARN+1))
  else
    log "OK: Sem arquivos grandes óbvios versionados"
  fi
}

check_scripts_syntax() {
  local rc=0
  for f in termux/*.sh scripts/*.sh; do
    [ -f "$f" ] || continue
    if ! bash -n "$f" 2>/dev/null; then
      err "Sintaxe inválida em $f"
      rc=1
    fi
  done
  if [ $rc -eq 0 ]; then
    log "OK: Sintaxe dos scripts shell verificada"
  else
    BLOCKER=$((BLOCKER+1))
  fi
}

# Início das checagens
log "[1/8] Verificando arquivos essenciais..."
check_file README.md
check_file BLUEPRINT.md
check_file STATUS.md
check_file CHECKLIST.md
check_file termux/install.sh || check_file termux/bootstrap.sh || true
check_file termux/wizard.sh || check_file termux/wizard_tradutor_termux.sh || true

log "[2/8] Verificando conteúdo do README.md..."
check_readme_contains "pkg update -y && pkg install -y curl && curl -fL"
check_readme_contains "SSSystem"

log "[3/8] Verificando scripts e sintaxe..."
check_scripts_syntax

log "[4/8] Verificando indicador de não-versionamento de modelos/áudios..."
check_no_versioned_bigfiles

log "[5/8] Procurando menções a Termux:API e comandos críticos..."
if grep -q "termux-microphone-record" -n termux/*.sh README.md 2>/dev/null; then
  log "OK: comando termux-microphone-record referenciado"
else
  warn "termux-microphone-record não encontrado explicitamente nas referências"
fi

log "[6/8] Verificando existência de scripts auxiliares de teste..."
if [ -f "termux/scripts/transcrever_ultimo_audio.sh" ] || [ -f "termux/scripts/transcrever_ultimo_audio.sh" ]; then
  log "OK: script de transcrição detectado"
else
  warn "Script de transcrição não encontrado em termux/scripts/ (verifique nome e localização)"
fi

log "[7/8] Checando se há arquivo requirements.txt ou pyproject.toml..."
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then
  log "OK: arquivo de dependências encontrado"
else
  warn "Nenhum arquivo requirements.txt ou pyproject.toml encontrado; ambiente Python pode ser gerenciado dentro do Termux"
fi

log "[8/8] Sumário e passos manuais necessários:\n"
if [ $BLOCKER -gt 0 ]; then
  err "BLOCKERS detectados: $BLOCKER. Estes impedem validações automáticas completas." 
fi
if [ $WARN -gt 0 ]; then
  warn "AVISOS detectados: $WARN. Recomenda-se revisão manual."
fi

log "Checklist automático concluído. Resultados:"
log "  BLOCKERS: $BLOCKER"
log "  AVISOS:   $WARN"

log "Passos manuais obrigatórios (em dispositivo Android com Termux):"
log "  - Executar o bootstrap indicado no README no Termux e seguir o instalador."
log "  - Garantir Termux:API instalado pela mesma origem do Termux e conceder permissão de microfone."
log "  - Rodar SSSystem e seguir o wizard: gravar ~8s, validar com ffprobe e transcrever."
log "  - Registrar resultados (duração, exemplos de transcrição) em STATUS.md e marcar CHECKLIST.md."
log "  - Testar tradução offline conforme orientação em BLUEPRINT/DECISIONS-OPEN e documentar a hipótese e resultado."

if [ $BLOCKER -gt 0 ]; then
  exit 2
fi
if [ $WARN -gt 0 ]; then
  exit 1
fi

exit 0
