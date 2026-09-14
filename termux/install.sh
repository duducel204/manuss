#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

APP_DIR="${HOME}/tradutor-local"
WHISPER_DIR="${APP_DIR}/whisper.cpp"
VENV_DIR="${APP_DIR}/.venv"
MODEL_NAME="base"
MODEL_FILE="${WHISPER_DIR}/models/ggml-${MODEL_NAME}.bin"

log() {
  printf '\n[tradutor-local] %s\n' "$1"
}

fail() {
  printf '\n[tradutor-local] ERRO: %s\n' "$1" >&2
  exit 1
}

trap 'fail "Falha na linha ${LINENO}. Verifique a mensagem acima."' ERR

command -v pkg >/dev/null 2>&1 || fail "Este arquivo precisa ser executado dentro do Termux."

log "Atualizando pacotes do Termux"
pkg update -y
pkg upgrade -y

log "Instalando dependências do sistema"
pkg install -y python git clang cmake make ffmpeg termux-api

log "Criando estrutura do projeto"
mkdir -p "${APP_DIR}/audio" "${APP_DIR}/models" "${APP_DIR}/results" "${APP_DIR}/scripts"

log "Criando ambiente Python"
if [ ! -d "${VENV_DIR}" ]; then
  python -m venv "${VENV_DIR}"
fi
# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"
python -m pip install --upgrade pip setuptools wheel
python -m pip install --upgrade argostranslate

log "Criando script de tradução local"
cat > "${APP_DIR}/scripts/translate_test.py" <<'PY'
import sys

import argostranslate.package
import argostranslate.translate

SOURCE_LANGUAGE = "pt"
TARGET_LANGUAGE = "en"


def get_language(code):
    languages = argostranslate.translate.get_installed_languages()
    return next((language for language in languages if language.code == code), None)


def ensure_model():
    source = get_language(SOURCE_LANGUAGE)
    target = get_language(TARGET_LANGUAGE)

    if source is not None and target is not None:
        try:
            if source.get_translation(target) is not None:
                return
        except Exception:
            pass

    print("Baixando o modelo local PT -> EN do Argos Translate...")
    argostranslate.package.update_package_index()
    packages = argostranslate.package.get_available_packages()
    package = next(
        (
            item for item in packages
            if item.from_code == SOURCE_LANGUAGE
            and item.to_code == TARGET_LANGUAGE
        ),
        None,
    )
    if package is None:
        raise RuntimeError("Modelo PT -> EN não encontrado.")
    argostranslate.package.install_from_path(package.download())


def translate(text):
    source = get_language(SOURCE_LANGUAGE)
    target = get_language(TARGET_LANGUAGE)
    if source is None or target is None:
        raise RuntimeError("Idiomas do Argos não estão disponíveis.")
    translation = source.get_translation(target)
    if translation is None:
        raise RuntimeError("Tradução PT -> EN não está instalada.")
    return translation.translate(text)


def main():
    text = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else input("Digite uma frase em português: ").strip()
    if not text:
        raise SystemExit("Nenhum texto informado.")
    ensure_model()
    print(f"[PT] {text}")
    print(f"[EN] {translate(text)}")


if __name__ == "__main__":
    main()
PY

log "Baixando e compilando whisper.cpp"
if [ ! -d "${WHISPER_DIR}/.git" ]; then
  git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "${WHISPER_DIR}"
else
  git -C "${WHISPER_DIR}" pull --ff-only || true
fi
cmake -S "${WHISPER_DIR}" -B "${WHISPER_DIR}/build" -DCMAKE_BUILD_TYPE=Release
cmake --build "${WHISPER_DIR}/build" -j2

if [ ! -f "${MODEL_FILE}" ]; then
  log "Baixando modelo Whisper ${MODEL_NAME}"
  bash "${WHISPER_DIR}/models/download-ggml-model.sh" "${MODEL_NAME}"
fi

log "Criando comandos auxiliares"
cat > "${APP_DIR}/scripts/transcribe_file.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_DIR="${HOME}/tradutor-local"
WHISPER="${APP_DIR}/whisper.cpp/build/bin/whisper-cli"
MODEL="${APP_DIR}/whisper.cpp/models/ggml-base.bin"
INPUT="${1:-}"

if [ -z "${INPUT}" ] || [ ! -f "${INPUT}" ]; then
  echo "Uso: bash ~/tradutor-local/scripts/transcribe_file.sh caminho/arquivo.m4a"
  exit 2
fi

mkdir -p "${APP_DIR}/results"
WAV="${APP_DIR}/results/input-16k.wav"
ffmpeg -y -i "${INPUT}" -ar 16000 -ac 1 -c:a pcm_s16le "${WAV}" >/dev/null 2>&1
"${WHISPER}" -m "${MODEL}" -f "${WAV}" -l pt -otxt -of "${APP_DIR}/results/transcription"
cat "${APP_DIR}/results/transcription.txt"
SH

cat > "${APP_DIR}/scripts/record_test.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_DIR="${HOME}/tradutor-local"
mkdir -p "${APP_DIR}/audio"
OUTPUT="${APP_DIR}/audio/microphone-test.m4a"
rm -f "${OUTPUT}"

echo "O Android pode mostrar uma solicitação de permissão do microfone. Conceda a permissão se aparecer."
termux-microphone-record -f "${OUTPUT}" -l 5

test -s "${OUTPUT}"
printf '\nGravação criada em: %s\n' "${OUTPUT}"
printf 'Para transcrever: bash %s %s\n' "${APP_DIR}/scripts/transcribe_file.sh" "${OUTPUT}"
SH

cat > "${APP_DIR}/scripts/smoke_test.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_DIR="${HOME}/tradutor-local"
WHISPER="${APP_DIR}/whisper.cpp/build/bin/whisper-cli"
MODEL="${APP_DIR}/whisper.cpp/models/ggml-base.bin"

printf '[1/4] Python... '
"${APP_DIR}/.venv/bin/python" -c 'import argostranslate; print("OK")'
printf '[2/4] whisper.cpp... '
test -x "${WHISPER}" && echo OK
printf '[3/4] modelo Whisper... '
test -s "${MODEL}" && echo OK
printf '[4/4] tradução local...\n'
"${APP_DIR}/.venv/bin/python" "${APP_DIR}/scripts/translate_test.py" "Olá, este é um teste local."
printf '\nSmoke test concluído.\n'
SH

chmod +x "${APP_DIR}/scripts/record_test.sh" "${APP_DIR}/scripts/transcribe_file.sh" "${APP_DIR}/scripts/smoke_test.sh"

cat > "${APP_DIR}/activate.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
source "${HOME}/tradutor-local/.venv/bin/activate"
printf 'Ambiente ativado: tradutor-local\n'
SH
chmod +x "${APP_DIR}/activate.sh"

log "Executando teste automático sem microfone"
"${APP_DIR}/scripts/smoke_test.sh"

cat <<EOF

INSTALAÇÃO CONCLUÍDA

Projeto: ${APP_DIR}
Ambiente Python: ${VENV_DIR}
Modelo Whisper: ${MODEL_NAME}

Próximos comandos:
  source ${APP_DIR}/activate.sh
  bash ${APP_DIR}/scripts/record_test.sh
  bash ${APP_DIR}/scripts/transcribe_file.sh ${APP_DIR}/audio/microphone-test.m4a
  ${VENV_DIR}/bin/python ${APP_DIR}/scripts/translate_test.py "Olá pessoal"

LIMITAÇÃO DO ANDROID:
Este instalador não consegue instalar o aplicativo Termux:API nem conceder permissões do Android silenciosamente. O Termux:API precisa estar instalado separadamente pela mesma origem do Termux, e o acesso ao microfone pode exigir uma confirmação do sistema.
EOF
