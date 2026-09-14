#!/data/data/com.termux/files/usr/bin/bash
set -u

APP_DIR="${HOME}/tradutor-local"
VENV_DIR="${APP_DIR}/.venv"
PYTHON="${VENV_DIR}/bin/python"
WHISPER="${APP_DIR}/bin/whisper-cli"
MODEL="${APP_DIR}/models/ggml-base.bin"
AUDIO_DIR="${APP_DIR}/audio"
RESULTS_DIR="${APP_DIR}/results"
SCRIPTS_DIR="${APP_DIR}/scripts"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

ok() { printf "${GREEN}[OK]${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}[ATENÇÃO]${RESET} %s\n" "$1"; }
err() { printf "${RED}[ERRO]${RESET} %s\n" "$1"; }
line() { printf '%*s\n' 64 '' | tr ' ' '='; }

ensure_dirs() {
  mkdir -p "$APP_DIR" "$AUDIO_DIR" "$RESULTS_DIR" "$SCRIPTS_DIR"
}

check_environment() {
  line
  echo "ETAPA 1 — AMBIENTE"
  line
  if command -v pkg >/dev/null 2>&1; then ok "Termux detectado"; else err "Execute este assistente dentro do Termux"; return 1; fi
  for c in python ffmpeg git cmake; do
    if command -v "$c" >/dev/null 2>&1; then ok "$c disponível"; else warn "$c ausente"; fi
  done
  if command -v termux-microphone-record >/dev/null 2>&1; then ok "Termux:API disponível"; else warn "Termux:API ausente"; fi
  if [ -x "$PYTHON" ]; then ok "Ambiente Python encontrado"; else warn "Ambiente Python ausente"; fi
}

check_project() {
  line
  echo "ETAPA 2 — ARQUIVOS DO PROJETO"
  line
  ensure_dirs
  ok "Pasta do projeto: $APP_DIR"
  [ -d "$AUDIO_DIR" ] && ok "Pasta de áudio" || err "Pasta de áudio"
  [ -d "$RESULTS_DIR" ] && ok "Pasta de resultados" || err "Pasta de resultados"
  [ -d "$SCRIPTS_DIR" ] && ok "Pasta de scripts" || err "Pasta de scripts"
  [ -x "$WHISPER" ] && ok "Executável Whisper" || warn "Whisper ainda não pronto"
  [ -s "$MODEL" ] && ok "Modelo Whisper" || warn "Modelo Whisper ainda não encontrado"
}

prepare_python() {
  ensure_dirs
  line
  echo "ETAPA 3 — PYTHON"
  line
  if [ ! -d "$VENV_DIR" ]; then
    python -m venv "$VENV_DIR" || { err "Não foi possível criar o ambiente Python"; return 1; }
  fi
  ok "Ambiente Python pronto"
  "$PYTHON" -c 'import argostranslate' >/dev/null 2>&1 && ok "Argos Translate importável" || warn "Argos Translate não está funcional neste Android"
  "$PYTHON" -c 'import ctranslate2' >/dev/null 2>&1 && ok "CTranslate2 disponível" || warn "CTranslate2 indisponível; tradução local fica para Windows"
}

prepare_whisper() {
  line
  echo "ETAPA 4 — WHISPER"
  line
  if [ -x "$WHISPER" ] && [ -s "$MODEL" ]; then
    ok "Whisper já está pronto"
    return 0
  fi
  if [ ! -d "$HOME/whisper.cpp/.git" ]; then
    echo "Baixando whisper.cpp..."
    git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$HOME/whisper.cpp" || { err "Falha ao baixar whisper.cpp"; return 1; }
  else
    ok "Código do whisper.cpp já existe"
  fi
  cmake -S "$HOME/whisper.cpp" -B "$HOME/whisper.cpp/build" -DCMAKE_BUILD_TYPE=Release || { err "Falha no CMake"; return 1; }
  cmake --build "$HOME/whisper.cpp/build" -j1 || { err "Falha na compilação"; return 1; }
  [ -x "$HOME/whisper.cpp/build/bin/whisper-cli" ] || { err "whisper-cli não foi criado"; return 1; }
  mkdir -p "$APP_DIR/bin" "$APP_DIR/models"
  ln -sf "$HOME/whisper.cpp/build/bin/whisper-cli" "$WHISPER"
  if [ ! -s "$MODEL" ]; then
    bash "$HOME/whisper.cpp/models/download-ggml-model.sh" base || { err "Falha ao baixar modelo"; return 1; }
    ln -sf "$HOME/whisper.cpp/models/ggml-base.bin" "$MODEL"
  fi
  ok "Whisper e modelo prontos"
}

record_audio() {
  ensure_dirs
  line
  echo "ETAPA 5 — GRAVAÇÃO"
  line
  command -v termux-microphone-record >/dev/null 2>&1 || { err "Instale o Termux:API antes"; return 1; }
  local output="$AUDIO_DIR/assistente-$(date +%Y%m%d-%H%M%S).m4a"
  echo "A gravação terá 8 segundos. Fale claramente quando iniciar."
  read -r -p "Pressione ENTER para iniciar: " _
  termux-microphone-record -f "$output" -l 8 || { err "Falha ao acessar o microfone"; return 1; }
  [ -s "$output" ] && ok "Gravação criada: $output" || { err "Arquivo vazio"; return 1; }
}

transcribe_latest() {
  line
  echo "ETAPA 6 — TRANSCRIÇÃO"
  line
  [ -x "$WHISPER" ] || { err "Whisper não está pronto"; return 1; }
  [ -s "$MODEL" ] || { err "Modelo não encontrado"; return 1; }
  local input
  input=$(find "$AUDIO_DIR" -maxdepth 1 -type f \( -name '*.m4a' -o -name '*.mp3' -o -name '*.wav' \) -printf '%T@ %p\n' 2>/dev/null | sort -nr | cut -d' ' -f2- | head -n1)
  [ -n "$input" ] || { err "Nenhum áudio encontrado"; return 1; }
  local wav="$RESULTS_DIR/latest-16k.wav"
  local out="$RESULTS_DIR/latest-transcription"
  echo "Áudio selecionado: $input"
  ffmpeg -y -hide_banner -loglevel error -i "$input" -ar 16000 -ac 1 -c:a pcm_s16le "$wav" || { err "Falha ao converter áudio"; return 1; }
  "$WHISPER" -m "$MODEL" -f "$wav" -l pt -otxt -of "$out" -nt -np || { err "Falha na transcrição"; return 1; }
  [ -f "$out.txt" ] || { err "Transcrição não criada"; return 1; }
  ok "Transcrição concluída"
  echo
  cat "$out.txt"
}

translate_latest() {
  line
  echo "ETAPA 7 — TRADUÇÃO"
  line
  if [ ! -x "$PYTHON" ]; then warn "Ambiente Python inexistente"; return 1; fi
  if ! "$PYTHON" -c 'import ctranslate2' >/dev/null 2>&1; then
    warn "CTranslate2 não está disponível neste Android/Termux. A tradução fica temporariamente indisponível, mas a captura e a transcrição local continuam normalmente."
    return 2
  fi
  [ -f "$RESULTS_DIR/latest-transcription.txt" ] || { err "Execute a transcrição primeiro"; return 1; }
  "$PYTHON" "$SCRIPTS_DIR/translate_test.py" "$(cat "$RESULTS_DIR/latest-transcription.txt")"
}

show_status() {
  line
  echo "STATUS ATUAL"
  line
  check_environment
  check_project
  echo
  [ -f "$RESULTS_DIR/latest-transcription.txt" ] && ok "Existe uma transcrição recente" || warn "Ainda não há transcrição recente"
  find "$AUDIO_DIR" -maxdepth 1 -type f 2>/dev/null | head -n 5
}

run_guided() {
  show_status
  echo
  echo "Fluxo recomendado para este celular:"
  echo "1. Preparar Python (somente verificação)"
  echo "2. Preparar Whisper, se necessário"
  echo "3. Gravar áudio"
  echo "4. Transcrever o último áudio"
  echo "5. Tentar tradução local e registrar a limitação, se o Android não suportar CTranslate2"
  echo
  read -r -p "Executar automaticamente o próximo passo pendente? [s/N] " answer
  case "$answer" in
    s|S|sim|SIM)
      if [ ! -x "$WHISPER" ] || [ ! -s "$MODEL" ]; then prepare_whisper; return $?; fi
      if ! find "$AUDIO_DIR" -maxdepth 1 -type f \( -name '*.m4a' -o -name '*.mp3' -o -name '*.wav' \) | grep -q .; then record_audio; return $?; fi
      if [ ! -f "$RESULTS_DIR/latest-transcription.txt" ]; then transcribe_latest; return $?; fi
      translate_latest; return $? ;;
    *) echo "Nenhuma ação executada." ;;
  esac
}

menu() {
  while true; do
    echo
    line
    echo "ASSISTENTE DO PROTÓTIPO LOCAL"
    line
    echo "1) Ver status"
    echo "2) Preparar/verificar Python"
    echo "3) Preparar Whisper e modelo"
    echo "4) Gravar áudio automaticamente"
    echo "5) Transcrever último áudio"
    echo "6) Tentar tradução local"
    echo "7) Executar próximo passo guiado"
    echo "8) Sair"
    echo
    read -r -p "Escolha uma opção: " choice
    case "$choice" in
      1) show_status ;;
      2) prepare_python ;;
      3) prepare_whisper ;;
      4) record_audio ;;
      5) transcribe_latest ;;
      6) translate_latest ;;
      7) run_guided ;;
      8) echo "Saindo. Estado preservado em $APP_DIR"; exit 0 ;;
      *) echo "Opção inválida." ;;
    esac
  done
}

ensure_dirs
menu
