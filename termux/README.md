# Scripts Termux

## Instalação inicial

No Termux, copie `install.sh` para a HOME e execute:

```bash
cp ~/storage/downloads/install.sh ~/install_tradutor_termux.sh
chmod +x ~/install_tradutor_termux.sh
~/install_tradutor_termux.sh
```

O instalador prepara as pastas, o ambiente Python, o whisper.cpp e os scripts básicos. O Termux:API precisa estar instalado pela mesma origem do Termux e a permissão do microfone pode exigir confirmação do Android.

## Wizard

Copie `wizard.sh` para a HOME como `wizard_tradutor_termux.sh` e execute-o. O wizard verifica o estado e oferece as etapas de preparação, gravação real e transcrição.

O comando `SSSystem` é opcional e pode ser configurado pelo script `setup_command.sh` depois que o wizard estiver na HOME.

## Cuidados

Não versionar modelos, áudios, resultados, caches, tokens ou credenciais. O instalador deve ser revisado antes de ser usado em outro dispositivo, pois versões do Termux, Android, arquitetura e memória podem variar.
