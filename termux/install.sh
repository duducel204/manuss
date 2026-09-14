#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

APP_DIR="${HOME}/tradutor-local"
WHISPER_DIR="${HOME}/whisper.cpp"
VENV_DIR="${APP_DIR}/.venv"

log() { printf '\n[tradutor-local] %s\n' "$1"; }
fail() { printf '\n[tradutor-local] ERRO: %s\n' "$1" >&2; exit 1; }
trap 'fail "Falha na linha ${LINENO}. Verifique a mensagem acima."' ERR

command -v pkg >/dev/null 2>&1 || fail "Execute este instalador dentro do Termux."

log "Instalando dependências do protótipo"
pkg update -y
pkg install -y python git clang cmake make ffmpeg termux-api

log "Criando estrutura"
mkdir -p "$APP_DIR/audio" "$APP_DIR/models" "$APP_DIR/results" "$APP_DIR/scripts" "$APP_DIR/bin"

log "Criando ambiente Python sem dependências de tradução"
[ -d "$VENV_DIR" ] || python -m venv "$VENV_DIR"

log "Baixando ou atualizando whisper.cpp"
if [ ! -d "$WHISPER_DIR/.git" ]; then
  git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$WHISPER_DIR"
fi

log "Compilando whisper.cpp com baixo consumo de memória"
cmake -S "$WHISPER_DIR" -B "$WHISPER_DIR/build" -DCMAKE_BUILD_TYPE=Release
cmake --build "$WHISPER_DIR/build" -j1

[ -x "$WHISPER_DIR/build/bin/whisper-cli" ] || fail "whisper-cli não foi criado"
ln -sf "$WHISPER_DIR/build/bin/whisper-cli" "$APP_DIR/bin/whisper-cli"

if [ ! -s "$WHISPER_DIR/models/ggml-base.bin" ]; then
  log "Baixando modelo Whisper base"
  bash "$WHISPER_DIR/models/download-ggml-model.sh" base
fi
[ -s "$WHISPER_DIR/models/ggml-base.bin" ] || fail "Modelo Whisper não foi encontrado"
ln -sf "$WHISPER_DIR/models/ggml-base.bin" "$APP_DIR/models/ggml-base.bin"

cat > "$APP_DIR/activate.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
source "${HOME}/tradutor-local/.venv/bin/activate"
printf 'Ambiente ativado: tradutor-local\n'
SH
chmod +x "$APP_DIR/activate.sh"

cat > "$APP_DIR/scripts/transcribe_file.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
APP_DIR="${HOME}/tradutor-local"
WHISPER="$APP_DIR/bin/whisper-cli"
MODEL="$APP_DIR/models/ggml-base.bin"
INPUT="${1:-}"
[ -f "$INPUT" ] || { echo "Uso: bash ~/tradutor-local/scripts/transcribe_file.sh arquivo.m4a"; exit 2; }
mkdir -p "$APP_DIR/results"
WAV="$APP_DIR/results/input-16k.wav"
ffmpeg -y -hide_banner -loglevel error -i "$INPUT" -ar 16000 -ac 1 -c:a pcm_s16le "$WAV"
"$WHISPER" -m "$MODEL" -f "$WAV" -l pt -otxt -of "$APP_DIR/results/transcription" -nt -np
cat "$APP_DIR/results/transcription.txt"
SH
chmod +x "$APP_DIR/scripts/transcribe_file.sh"

log "Executando verificação sem microfone"
"$APP_DIR/bin/whisper-cli" --help >/dev/null
"$VENV_DIR/bin/python" --version
command -v termux-microphone-record >/dev/null 2>&1 || log "ATENÇÃO: Termux:API ainda não está disponível"

cat <<EOF

INSTALAÇÃO CONCLUÍDA

Projeto: $APP_DIR
Whisper: $APP_DIR/bin/whisper-cli
Modelo:  $APP_DIR/models/ggml-base.bin

Próximos passos:
  source $APP_DIR/activate.sh
  bash $APP_DIR/scripts/transcribe_file.sh caminho/do/audio.m4a

A tradução offline não é instalada por este script. O Argos/CTranslate2 foi omitido porque não é compatível com o Termux validado.
EOF
