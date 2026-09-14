#!/data/data/com.termux/files/usr/bin/bash
set -u

APP_DIR="${HOME}/tradutor-local"
VENV_DIR="${APP_DIR}/.venv"
WHISPER="${APP_DIR}/bin/whisper-cli"
MODEL="${APP_DIR}/models/ggml-base.bin"
AUDIO_DIR="${APP_DIR}/audio"
RESULTS_DIR="${APP_DIR}/results"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
ok() { printf "${GREEN}[OK]${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}[ATENÇÃO]${RESET} %s\n" "$1"; }
err() { printf "${RED}[ERRO]${RESET} %s\n" "$1"; }
line() { printf '%*s\n' 64 '' | tr ' ' '='; }
ensure_dirs() { mkdir -p "$APP_DIR" "$AUDIO_DIR" "$RESULTS_DIR"; }

check_environment() {
  line; echo "ETAPA 1 — AMBIENTE"; line
  command -v pkg >/dev/null 2>&1 && ok "Termux detectado" || { err "Execute dentro do Termux"; return 1; }
  for c in python ffmpeg ffprobe git cmake; do command -v "$c" >/dev/null 2>&1 && ok "$c disponível" || warn "$c ausente"; done
  command -v termux-microphone-record >/dev/null 2>&1 && ok "Termux:API disponível" || warn "Termux:API ausente"
  [ -x "${VENV_DIR}/bin/python" ] && ok "Ambiente Python encontrado" || warn "Ambiente Python ausente"
}

check_project() {
  line; echo "ETAPA 2 — ARQUIVOS"; line; ensure_dirs
  [ -x "$WHISPER" ] && ok "whisper-cli encontrado" || warn "Whisper ainda não pronto"
  [ -s "$MODEL" ] && ok "Modelo base encontrado" || warn "Modelo base ainda não encontrado"
  find "$AUDIO_DIR" -maxdepth 1 -type f 2>/dev/null | head -n 5
}

prepare_python() {
  line; echo "ETAPA 3 — PYTHON"; line; ensure_dirs
  if [ ! -x "${VENV_DIR}/bin/python" ]; then python -m venv "$VENV_DIR" || { err "Falha ao criar ambiente Python"; return 1; }; fi
  ok "Ambiente Python pronto"
  warn "Nenhuma tradução Python é instalada nesta etapa: CTranslate2/Argos não são compatíveis com este Termux validado."
}

prepare_whisper() {
  line; echo "ETAPA 4 — WHISPER"; line
  if [ -x "$WHISPER" ] && [ -s "$MODEL" ]; then ok "Whisper já está pronto"; return 0; fi
  if [ ! -d "$HOME/whisper.cpp/.git" ]; then git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$HOME/whisper.cpp" || { err "Falha ao baixar whisper.cpp"; return 1; }; fi
  cmake -S "$HOME/whisper.cpp" -B "$HOME/whisper.cpp/build" -DCMAKE_BUILD_TYPE=Release || return 1
  cmake --build "$HOME/whisper.cpp/build" -j1 || return 1
  [ -x "$HOME/whisper.cpp/build/bin/whisper-cli" ] || { err "whisper-cli não foi criado"; return 1; }
  mkdir -p "$APP_DIR/bin" "$APP_DIR/models"
  ln -sf "$HOME/whisper.cpp/build/bin/whisper-cli" "$WHISPER"
  [ -s "$HOME/whisper.cpp/models/ggml-base.bin" ] || bash "$HOME/whisper.cpp/models/download-ggml-model.sh" base || return 1
  ln -sf "$HOME/whisper.cpp/models/ggml-base.bin" "$MODEL"
  ok "Whisper e modelo prontos"
}

record_audio() {
  ensure_dirs; line; echo "ETAPA 5 — GRAVAÇÃO REAL"; line
  command -v termux-microphone-record >/dev/null 2>&1 || { err "Termux:API ausente"; return 1; }
  local output="$AUDIO_DIR/assistente-real-$(date +%Y%m%d-%H%M%S).m4a"; local duration=8; local detected
  rm -f "$output"
  echo "Pressione ENTER para iniciar o microfone real e gravar por 8 segundos."
  read -r -p "> " _
  termux-microphone-record -f "$output" -l 0 -e aac -r 16000 -c 1 || { err "Falha ao iniciar microfone"; return 1; }
  sleep 1; termux-microphone-record -i || true
  echo "GRAVANDO AGORA — fale por 8 segundos"
  for second in 1 2 3 4 5 6 7 8; do printf '\rTempo: %s/8 segundos' "$second"; sleep 1; done
  echo; echo "Encerrando com -q..."; termux-microphone-record -q || { err "Falha ao encerrar microfone"; return 1; }
  sleep 3
  [ -s "$output" ] || { err "Arquivo vazio"; return 1; }
  detected=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$output" 2>/dev/null || true)
  echo "Arquivo: $output"; echo "Duração: ${detected:-desconhecida} segundos"
  [ -n "$detected" ] && awk "BEGIN { exit !($detected >= 7.0) }" || { err "Arquivo inválido ou menor que 7 segundos"; return 1; }
  ok "Gravação real validada"
}

transcribe_latest() {
  line; echo "ETAPA 6 — TRANSCRIÇÃO"; line
  [ -x "$WHISPER" ] && [ -s "$MODEL" ] || { err "Whisper/modelo não estão prontos"; return 1; }
  local input wav out
  input=$(find "$AUDIO_DIR" -maxdepth 1 -type f \( -name '*.m4a' -o -name '*.mp3' -o -name '*.wav' \) -printf '%T@ %p\n' 2>/dev/null | sort -nr | cut -d' ' -f2- | head -n1)
  [ -n "$input" ] || { err "Nenhum áudio encontrado"; return 1; }
  wav="$RESULTS_DIR/latest-16k.wav"; out="$RESULTS_DIR/latest-transcription"
  ffmpeg -y -hide_banner -loglevel error -i "$input" -ar 16000 -ac 1 -c:a pcm_s16le "$wav" || { err "Falha ao converter áudio"; return 1; }
  "$WHISPER" -m "$MODEL" -f "$wav" -l pt -otxt -of "$out" -nt -np || { err "Falha na transcrição"; return 1; }
  [ -s "$out.txt" ] || { err "Transcrição vazia"; return 1; }
  ok "Transcrição concluída"; cat "$out.txt"
}

translate_latest() {
  line; echo "ETAPA 7 — TRADUÇÃO"; line
  [ -s "$RESULTS_DIR/latest-transcription.txt" ] || { err "Execute a transcrição primeiro"; return 1; }
  cat "$RESULTS_DIR/latest-transcription.txt"; echo
  warn "Nenhum motor de tradução offline compatível foi validado neste Termux. A tradução permanece pendente; a captura e a transcrição funcionam."
}

diagnose() {
  line; echo "DIAGNÓSTICO AUTOMÁTICO"; line
  echo "HOME: $HOME"
  echo "Arquitetura: $(uname -m)"
  echo "Python: $(python --version 2>&1 || echo ausente)"
  for c in termux-microphone-record ffmpeg ffprobe git cmake; do
    if command -v "$c" >/dev/null 2>&1; then ok "$c disponível"; else err "$c ausente"; fi
  done
  [ -x "$WHISPER" ] && ok "whisper-cli encontrado" || err "whisper-cli ausente"
  [ -s "$MODEL" ] && ok "modelo base encontrado" || err "modelo base ausente"
  echo
  echo "Áudios recentes:"
  find "$AUDIO_DIR" -maxdepth 1 -type f -printf '%TY-%Tm-%Td %TH:%TM %s bytes %p\n' 2>/dev/null | sort -r | head -n 5 || true
  echo
  df -h "$HOME" | tail -n 1
}

support_menu() {
  while true; do
    line; echo "SUPORTE E SOLUÇÃO DE ERROS"; line
    echo "1) Diagnóstico automático"
    echo "2) Microfone ou gravação curta"
    echo "3) Erro moov atom not found"
    echo "4) Whisper ou modelo ausente"
    echo "5) Termux fechou com signal 9"
    echo "6) CTranslate2/tradução indisponível"
    echo "7) SSSystem não encontrado"
    echo "8) Voltar"
    echo
    read -r -p "Escolha uma opção: " support_choice
    case "$support_choice" in
      1) diagnose;;
      2) echo "Conceda a permissão de microfone ao Termux:API. A gravação usa -l 0, aguarda 8 segundos e encerra com -q.";;
      3) echo "O M4A foi lido antes de finalizar. Pare com -q, aguarde 3 segundos e valide novamente com ffprobe.";;
      4) echo "Use a opção 3. Verifique: test -x ~/tradutor-local/bin/whisper-cli e test -s ~/tradutor-local/models/ggml-base.bin.";;
      5) echo "O Android encerrou um processo pesado por memória. Reabra o Termux e use o diagnóstico; não repita a instalação pesada.";;
      6) echo "A tradução Python não foi validada. Não instale PyQt5, Qt, spaCy ou Stanza; continue com captura e transcrição.";;
      7) echo 'Execute: export PATH="$HOME/bin:$PATH"; hash -r; SSSystem';;
      8) return 0;;
      *) echo "Opção inválida";;
    esac
    echo; read -r -p "Pressione ENTER para continuar: " _
  done
}

show_status() { line; echo "STATUS ATUAL"; line; check_environment; check_project; }

menu() {
  ensure_dirs
  while true; do
    echo; line; echo "ASSISTENTE DO PROTÓTIPO LOCAL"; line
    echo "1) Ver status"; echo "2) Preparar/verificar Python"; echo "3) Preparar Whisper e modelo"; echo "4) Gravar áudio real"; echo "5) Transcrever último áudio"; echo "6) Verificar tradução pendente"; echo "7) Suporte e solução de erros"; echo "8) Sair"; echo
    read -r -p "Escolha uma opção: " choice
    case "$choice" in
      1) show_status;; 2) prepare_python;; 3) prepare_whisper;; 4) record_audio;; 5) transcribe_latest;; 6) translate_latest;; 7) support_menu;; 8) exit 0;; *) echo "Opção inválida";;
    esac
  done
}
menu
