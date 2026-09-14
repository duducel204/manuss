# Scripts Termux

## Instalação inicial em um Termux vazio

O usuário precisa instalar manualmente apenas dois aplicativos pela mesma origem: **Termux** e **Termux:API**. Depois de abrir o Termux pela primeira vez, ele pode colar este comando único:

```bash
pkg update -y; pkg install -y curl; curl -fL --retry 3 https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap.sh | bash
```

O bootstrap instala o `curl`, baixa o instalador principal e executa todo o processo. A partir daí, o instalador prepara pacotes do Termux, Python, ambiente virtual, whisper.cpp, modelo Whisper, wizard e o comando `SSSystem`.

Se o usuário já tiver copiado o arquivo `install.sh` para a HOME, também pode executar:

```bash
cp ~/storage/downloads/install.sh ~/install_tradutor_termux.sh
chmod +x ~/install_tradutor_termux.sh
~/install_tradutor_termux.sh
```

O instalador prepara as pastas, o ambiente Python, o whisper.cpp e os scripts básicos. O Termux:API precisa estar instalado pela mesma origem do Termux e a permissão do microfone pode exigir confirmação do Android.

O Android ainda pode exibir uma solicitação de permissão para o microfone. Essa confirmação não pode ser concedida silenciosamente por um script.

## Wizard

Copie `wizard.sh` para a HOME como `wizard_tradutor_termux.sh` e execute-o. O wizard verifica o estado e oferece as etapas de preparação, gravação real e transcrição.

O comando `SSSystem` é opcional e pode ser configurado pelo script `setup_command.sh` depois que o wizard estiver na HOME.

## Cuidados

Não versionar modelos, áudios, resultados, caches, tokens ou credenciais. O instalador deve ser revisado antes de ser usado em outro dispositivo, pois versões do Termux, Android, arquitetura e memória podem variar.
