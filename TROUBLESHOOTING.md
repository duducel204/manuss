# Base de conhecimento — Troubleshooting

Este documento reúne os problemas observados durante a instalação e os testes do protótipo Android/Termux. A regra geral é **diagnosticar antes de reinstalar** e preservar os arquivos do projeto.

## 1. O instalador falha ao atualizar pacotes do Termux

### Sintomas

Podem aparecer mensagens como:

```text
2 not fully installed or removed
xdg-utils is not configured
qt5-qtbase depends on xdg-utils
```

Também pode ocorrer falha ao configurar `File::MimeInfo` ou erro do Perl durante o pós-processamento.

### Causa provável

O Termux já possuía pacotes gráficos pendentes ou parcialmente configurados antes da execução do instalador. O problema não está necessariamente no tradutor.

### Procedimento seguro

Não apagar a pasta `~/tradutor-local`. Primeiro tente:

```bash
dpkg --configure -a
apt-get -f install -y
dpkg --configure -a
```

Se os mesmos pacotes gráficos continuarem bloqueando o gerenciador e não forem necessários para o protótipo, avaliar a remoção manual somente depois de confirmar que não são usados por outro aplicativo Termux:

```bash
apt-get remove -y xdg-utils qt5-qtbase
apt-get -f install -y
dpkg --configure -a
```

### Prevenção

O instalador atual não deve ser usado para apagar pacotes arbitrariamente. Em um dispositivo novo, instalar Termux e Termux:API pela mesma origem e manter os pacotes atualizados antes da instalação do protótipo.

## 2. Argos Translate tenta instalar PyQt5

### Sintomas

A instalação pode entrar em resolução longa de versões e terminar com:

```text
Collecting PyQt5
PyProjectOptionException: specify a working qmake
```

### Causa provável

O pacote Argos Translate e suas dependências não são uma instalação leve no Termux/Python usado. O `pip` tenta resolver versões antigas e componentes gráficos, embora o protótipo precise apenas de tradução em terminal.

### Correção

Não instalar `qmake`, Qt, PyQt5, spaCy ou Stanza apenas para continuar este protótipo. O instalador do repositório atual não instala mais Argos automaticamente.

### Estado conhecido

O Argos pode ser importável e ainda assim não funcionar. O componente decisivo é o `CTranslate2`, que não teve distribuição compatível com o Termux/Python validado. Portanto:

```text
Argos importável ≠ tradução operacional
```

## 3. `CTranslate2` não possui distribuição compatível

### Sintomas

```text
No matching distribution found for ctranslate2
```

ou falha durante a construção de wheel.

### Causa provável

Não há pacote binário compatível com a combinação de arquitetura Android, Termux e Python instalada. Tentar compilar dependências pesadas pode consumir toda a memória do aparelho.

### Correção

Interromper a tentativa de instalação pesada. Registrar o resultado em `STATUS.md` e manter a tradução como pendência. Não declarar que a tradução offline funciona apenas porque o pacote principal do Argos foi instalado.

## 4. Termux fecha com `signal 9`

### Sintomas

```text
[Process completed (signal 9) - press Enter]
```

O aplicativo pode fechar durante compilação ou durante a preparação de metadados Python.

### Causa provável

O Android encerrou o processo por pressão de memória, principalmente durante compilação ou instalação de bibliotecas grandes.

### Correção

Após reabrir o Termux, executar apenas verificações leves:

```bash
free -h
ls -lh ~/tradutor-local/bin/whisper-cli
ls -lh ~/tradutor-local/models/ggml-base.bin
```

Não repetir imediatamente o diagnóstico pesado. O processo pode ter deixado componentes parcialmente instalados; verificar o estado antes de iniciar outra instalação.

### Prevenção

O wizard compila o Whisper com `-j1`. O instalador evita dependências de tradução pesadas. Modelos maiores que `base` devem ser tratados como experimento separado.

## 5. Comando `SSSystem` não encontrado

### Sintomas

```text
command not found: SSSystem
```

Mesmo existindo uma pasta `~/bin`.

### Causa provável

`$HOME/bin` não está no `PATH` da sessão atual ou o `.bashrc` ainda não foi carregado.

### Correção

```bash
export PATH="$HOME/bin:$PATH"
hash -r
~/bin/SSSystem
```

Para persistir:

```bash
grep -qxF 'export PATH="$HOME/bin:$PATH"' ~/.bashrc || \
printf '%s\n' 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

O repositório usa um comando executável real, não depende apenas de alias.

## 6. Arquivo M4A apresenta `moov atom not found`

### Sintomas

O `ffprobe` retorna:

```text
moov atom not found
Invalid data found when processing input
```

### Causa provável

O arquivo está sendo lido enquanto o Termux:API ainda grava ou antes de fechar o contêiner M4A. O comando com limite automático pode retornar antes de o arquivo estar completamente finalizado em algumas versões.

### Correção

Usar o fluxo explícito:

```bash
termux-microphone-record -f arquivo.m4a -l 0
sleep 8
termux-microphone-record -q
sleep 3
ffprobe arquivo.m4a
```

O wizard atual segue esse modelo. Não apagar imediatamente o arquivo inválido; ele pode ser útil para diagnóstico.

## 7. Gravação parece curta ou simulada

### Sintomas

A mensagem `Recording started` aparece, mas a duração detectada é desconhecida, curta ou o áudio não contém a fala.

### Causa provável

A gravação foi encerrada ou validada antes do tempo real, a permissão do microfone não está correta, ou a captura foi iniciada com limite automático que se comporta de forma diferente no dispositivo.

### Correção

O wizard deve:

1. solicitar ENTER antes de iniciar;
2. iniciar `termux-microphone-record -l 0`;
3. consultar `termux-microphone-record -i`;
4. aguardar oito segundos visíveis no terminal;
5. executar `termux-microphone-record -q`;
6. aguardar a finalização;
7. validar com `ffprobe`;
8. rejeitar arquivo menor que aproximadamente sete segundos.

Se continuar falhando, verificar a permissão de microfone do Termux:API nas configurações do Android.

## 8. Whisper repete frases incorretas

### Sintomas

A transcrição retorna várias vezes uma frase que não foi dita, por exemplo:

```text
O que é isso?
O que é isso?
O que é isso?
```

### Causa provável

Áudio silencioso, volume muito baixo, ruído, microfone incorreto ou arquivo capturado sem voz. Modelos de reconhecimento podem produzir texto plausível mesmo sem fala.

### Correção

Confirmar primeiro a existência e a duração do arquivo:

```bash
ffprobe -hide_banner arquivo.m4a
```

Gravar novamente falando próximo ao microfone, testar uma frase curta e verificar se a duração é válida. Não concluir que o Whisper está errado antes de confirmar que o áudio contém voz.

## 9. Whisper não é encontrado

### Sintomas

```text
whisper-cli não foi criado
```

ou o wizard informa que o modelo está ausente.

### Diagnóstico

```bash
test -x ~/tradutor-local/bin/whisper-cli && echo whisper-ok
test -s ~/tradutor-local/models/ggml-base.bin && echo model-ok
ls -lh ~/whisper.cpp/build/bin/whisper-cli
ls -lh ~/whisper.cpp/models/ggml-base.bin
```

### Correção

Executar a opção de preparação do Whisper no wizard. Não recompilar se os dois testes acima retornarem `ok`.

## 10. Arquivo de áudio está em outro nome

### Sintomas

Um script procura `teste-voz.m4a`, mas o arquivo real se chama `microphone-test.m4a` ou `assistente-real-...m4a`.

### Correção

O fluxo atual deve selecionar o arquivo de áudio mais recente, em vez de depender de um nome fixo:

```bash
find ~/tradutor-local/audio -maxdepth 1 -type f \
  \( -name '*.m4a' -o -name '*.mp3' -o -name '*.wav' \) \
  -printf '%T@ %p\n' | sort -nr | head -n 1
```

Não criar um novo script para cada nome de arquivo; corrigir o wizard ou o script centralizado.

## 11. O script parece travar

### Diagnóstico

Algumas etapas podem ficar sem saída por alguns segundos, especialmente compilação, `ffprobe` ou Whisper. Primeiro verificar se há processo ativo e se o arquivo está crescendo. Não pressionar ENTER nem executar o mesmo instalador novamente enquanto ele estiver em execução.

Se o processo terminar e voltar ao prompt, coletar as últimas linhas. Se o Termux fechar, reabrir e executar uma verificação leve, não a instalação completa.

## 12. Regras para suporte a novos usuários

Antes de pedir que o usuário reinstale tudo, coletar:

```bash
uname -m
python --version
command -v termux-microphone-record
command -v ffmpeg
command -v ffprobe
ls -lh ~/tradutor-local/bin/whisper-cli
ls -lh ~/tradutor-local/models/ggml-base.bin
```

Também confirmar a origem e versão do Termux/Termux:API, a permissão do microfone, o espaço livre e a RAM disponível. Não solicitar screenshots como único diagnóstico quando o usuário puder copiar o texto do terminal.

## 13. O que não fazer automaticamente

Não remover diretórios do usuário, modelos ou áudios sem autorização explícita. Não instalar serviços online de tradução para contornar a falha offline. Não substituir o pipeline validado por Gboard. Não iniciar Kick, Supabase ou múltiplas contas para resolver um problema de transcrição ou tradução local.
