# Sistema de Tradução Local-First para Streamers

Este repositório contém o protótipo do **agente local** de um produto maior: uma ponte automática entre a fala do streamer e um público internacional. O produto completo é híbrido: captura, transcrição e tradução acontecem localmente sempre que possível; somente o texto traduzido necessário é enviado ao serviço online, que encaminha o resultado para um bot publicar no chat da transmissão.

Em termos comerciais, o produto pretende permitir que o streamer continue falando normalmente enquanto seu público de outros idiomas entende o conteúdo em tempo real, mediante assinatura do serviço.

```text
Streamer fala
→ captura local
→ transcrição local
→ tradução local
→ texto traduzido
→ backend/serviço online
→ bot do canal
→ chat da live
→ público internacional
```

O tradutor offline não é o produto final; é o motor local de processamento. O bot é o mecanismo de entrega, o serviço online é a camada de autenticação, assinatura e integração, e o streamer é o cliente.

## Estado atual

O ambiente validado é **Android + Termux**. O pipeline funcional é:

```text
Microfone real → Termux:API → FFmpeg → whisper.cpp → transcrição local
```

A tradução offline ainda está em avaliação. O Argos Translate não funcionou no Termux atual porque o CTranslate2 não possui distribuição compatível.

## Documentação

- [Blueprint](BLUEPRINT.md)
- [Decisões](DECISIONS.md)
- [Status técnico](STATUS.md)
- [Checklist](CHECKLIST.md)
- [Decisões em aberto](DECISIONS-OPEN.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## Termux

Os scripts de instalação e execução ficam em [`termux/`](termux/). Modelos Whisper, caches, áudios e credenciais não devem ser versionados.

### Ponte pessoal Manus → Termux

O projeto também contém um servidor MCP pessoal para executar comandos no próprio Termux a partir do Manus. Ele escuta somente em localhost e pode ser publicado por um túnel de saída. Consulte o [guia da ponte MCP](docs-termux-mcp.md), o [servidor Python](termux/mcp_server.py) e o [instalador](termux/setup_mcp.sh). O hostname do túnel e os tokens são configurados apenas localmente e nunca devem ser versionados.

## Divisão entre agente local e serviço online

### Agente local

Responsável por selecionar a entrada de áudio, capturar a fala, detectar segmentos, transcrever, traduzir, filtrar silêncio, controlar a fila e enviar eventos textuais autenticados ao backend.

### Serviço online

Responsável por identificar o cliente, validar assinatura, associar o cliente ao canal, receber traduções, encaminhar eventos ao bot, controlar planos, revogar autorizações e manter a integração com a plataforma.

### Bot

Responsável por estar conectado ao canal autorizado e publicar as mensagens traduzidas conforme as regras e os limites da plataforma de streaming.

## Próximo marco

```text
SSSystem → gravação real → transcrição local → teste isolado de tradução offline
```

A integração real com Kick, Supabase, assinaturas e envio de mensagens permanece fora do protótipo atual. O primeiro circuito de produto será considerado validado somente quando for possível demonstrar, em ambiente controlado:

```text
streamer instala → configura → conecta o canal → inicia → fala
→ captura → transcrição → tradução → envio textual → bot recebe
→ bot publica → público lê
```

Até esse ponto, a transcrição local validada representa apenas o motor, não o MVP completo.

## Guia rápido para outra IA

Antes de propor alterações, leia os arquivos nesta ordem:

```text
README.md
→ BLUEPRINT.md
→ DECISIONS.md
→ STATUS.md
→ CHECKLIST.md
→ DECISIONS-OPEN.md
```

Considere `STATUS.md` como a fonte do estado técnico atual, `DECISIONS.md` como decisões já confirmadas e `DECISIONS-OPEN.md` como hipóteses ainda não resolvidas. Não trate ideias, alternativas ou pesquisas como funcionalidades implementadas.

### Regras de continuidade

1. O ambiente atual é exclusivamente Android + Termux.
2. O Whisper já funciona localmente; não substituir a transcrição sem necessidade.
3. A tradução offline ainda não foi validada no Termux. Não reinstalar Argos/CTranslate2 automaticamente.
4. O objetivo não é apenas construir um tradutor offline; é construir o agente local de um produto comercial híbrido para tradução de lives.
5. Não iniciar integração real com Kick, Supabase ou assinaturas antes de concluir o pipeline local, mas preservar essa arquitetura como destino do produto.
6. Não versionar modelos, áudios, resultados, caches, tokens ou credenciais.
7. Antes de criar um novo script, verificar se a função já existe no wizard.
8. Para cada mudança, atualizar `STATUS.md`, `CHECKLIST.md` ou `DECISIONS-OPEN.md` quando o estado do projeto mudar.

## Uso rápido no Termux

Para preparar um novo dispositivo, instale o Termux e o Termux:API pela mesma origem. Abra o Termux e cole este comando único:

```bash
pkg update -y && pkg install -y curl && curl -fL --retry 3 https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap.sh | bash
```

O fluxo começa em um Termux sem preparação. O `bootstrap.sh` baixa o instalador; o `install.sh` instala a base, reutiliza componentes já concluídos e pode ser executado novamente após uma interrupção. Ao final, `SSSystem` inicia o wizard, que verifica o ambiente e reconcilia os marcadores em `~/tradutor-local/state/`. Esses marcadores representam apenas etapas validadas pelo wizard e são removidos quando os arquivos correspondentes deixam de existir; sua presença não declara que a tradução offline está pronta.

Os estados locais usados atualmente são `environment.ready`, `whisper.ready`, `audio.ready` e `transcription.ready`. O estado `translation.ready` permanece pendente até existir um motor e um teste reproduzível de tradução.

Esse bootstrap baixa o instalador principal e prepara automaticamente pacotes, Python, ambiente virtual, whisper.cpp, modelo, wizard e `SSSystem`. Como alternativa, copie `termux/install.sh` para a HOME do Termux e execute:

```bash
chmod +x ~/install_tradutor_termux.sh
~/install_tradutor_termux.sh
```

Para usar o wizard:

```bash
chmod +x ~/wizard_tradutor_termux.sh
~/wizard_tradutor_termux.sh
```

Se o comando `SSSystem` estiver configurado:

```bash
SSSystem
```

No menu, a sequência recomendada é:

```text
1. Ver status
2. Preparar/verificar Python
3. Preparar Whisper e modelo, se necessário
4. Gravar áudio real
5. Transcrever o último áudio
6. Verificar tradução somente se houver um motor compatível
7. Usar o suporte integrado em caso de erro
```

O primeiro critério de sucesso é obter uma frase correta em português no terminal. Se a gravação gerar `moov atom not found`, o arquivo foi lido antes de ser finalizado; a captura deve usar `termux-microphone-record -q` antes da validação com `ffprobe`.

## Como continuar o trabalho

O próximo trabalho deve ser escolhido a partir do primeiro item pendente em `CHECKLIST.md`, não por uma expansão geral do escopo. No momento, a prioridade é testar uma alternativa de tradução offline no Android sem quebrar o pipeline de transcrição já validado. Registre o resultado em `STATUS.md` e mantenha alternativas não validadas em `DECISIONS-OPEN.md`.

## Protocolo detalhado de retomada

Esta seção existe para que uma nova IA possa continuar o projeto sem depender do histórico da conversa.

### Passo 1 — Identificar o escopo atual

O pedido atual não é construir o produto completo. É manter e evoluir um protótipo local no Android. A próxima IA deve confirmar mentalmente esta fronteira antes de agir:

```text
Agora: Android + Termux + captura + transcrição + pesquisa controlada de tradução offline
Depois: VAD contínuo + tradução integrada + mock de entrega
Ainda não: Kick real + Supabase + assinatura + múltiplas identidades
```

Não iniciar uma pesquisa ampla sobre transcrição, Gboard ou plataformas de streaming quando a pendência registrada for tradução. Não substituir componentes funcionando sem um teste que demonstre ganho claro.

### Passo 2 — Ler o estado e conferir o código

Depois de ler a documentação, verificar a árvore do repositório:

```bash
git status --short --branch
find termux -maxdepth 2 -type f -print | sort
for f in termux/*.sh; do bash -n "$f" || exit 1; done
```

Se o repositório estiver limpo e os scripts passarem no `bash -n`, não fazer alterações cosméticas. O script principal é `termux/wizard.sh`; o instalador é `termux/install.sh`; o comando `SSSystem` é configurado por `termux/setup_command.sh`.

### Passo 3 — Diagnosticar um dispositivo Android

No Termux, conferir o ambiente antes de instalar qualquer coisa:

```bash
echo "$HOME"
command -v termux-microphone-record
command -v ffmpeg
command -v ffprobe
command -v python
test -x "$HOME/tradutor-local/bin/whisper-cli" && echo whisper-ok
test -s "$HOME/tradutor-local/models/ggml-base.bin" && echo model-ok
```

Se o `termux-microphone-record` não existir, o Termux:API precisa ser instalado pela mesma origem do Termux. Se `whisper-ok` e `model-ok` aparecerem, não recompilar o Whisper.

### Passo 4 — Executar o fluxo já validado

O caminho normal é:

```bash
SSSystem
```

No wizard, usar primeiro `Ver status`. Se o Whisper já estiver pronto, usar a opção de gravação real e depois a opção de transcrição. A captura deve iniciar sem limite automático, aguardar o período definido, finalizar com:

```bash
termux-microphone-record -q
```

Somente depois do `-q` o arquivo M4A pode ser validado por `ffprobe`. O erro `moov atom not found` significa que o arquivo foi lido antes de ser finalizado; não significa automaticamente que o microfone falhou.

### Passo 5 — Interpretar resultados

| Resultado | Interpretação | Ação |
|---|---|---|
| `Recording started` e duração válida | Captura real concluída | Transcrever |
| `moov atom not found` | Contêiner ainda aberto ou arquivo inválido | Parar com `-q`, aguardar e validar novamente |
| Whisper gera texto correto | Transcrição local validada | Registrar no `STATUS.md` |
| Whisper repete frases sem sentido | Áudio silencioso, baixo ou ruído | Verificar volume e gravar novamente |
| `CTranslate2` indisponível | Argos não pode executar neste Termux | Não instalar Qt/PyQt5; avaliar outro motor |
| Termux encerra com `signal 9` | Processo pesado ou falta de memória | Não repetir instalação pesada; reduzir o teste |
| Comando `SSSystem` ausente | `~/bin` não está no `PATH` | Executar `export PATH="$HOME/bin:$PATH"` ou configurar `setup_command.sh` |

### Passo 6 — Avaliar tradução sem desviar do problema

A tradução recebe como entrada o texto já produzido pelo Whisper. O teste mínimo deve ser uma função isolada:

```text
texto em português → motor offline → texto em inglês
```

As alternativas registradas são Apertium e RTranslator. Apertium é mais leve, baseado em regras e depende do motor `apertium/lttoolbox`. RTranslator é um aplicativo Android com modelos locais maiores e não é um pacote Python para Termux. Nenhuma das duas alternativas deve ser declarada como integrada antes de um teste local reproduzível.

Uma nova IA deve escolher no máximo uma alternativa para o próximo experimento, registrar a hipótese antes do teste e atualizar `STATUS.md` com: comando usado, versão, tamanho do modelo, resultado, latência, memória, idioma e erro completo. Não executar novamente a instalação pesada do Argos/CTranslate2 já considerada incompatível.

### Passo 7 — Critério para modificar o wizard

Modificar `termux/wizard.sh` somente quando houver uma necessidade observada no uso. Antes da alteração:

1. localizar a função existente;
2. preservar as funções de status e validação;
3. manter a captura real com início explícito e parada `-q`;
4. não esconder erros de `ffmpeg`, `ffprobe` ou Whisper;
5. validar com `bash -n termux/wizard.sh`;
6. atualizar `STATUS.md` ou `CHECKLIST.md`;
7. fazer commit com mensagem específica.

Não criar um novo script para cada pequena correção. O objetivo do wizard é centralizar o fluxo e evitar que o usuário precise retornar à conversa para executar correções manuais.

### Passo 8 — Como registrar uma nova descoberta

Use esta classificação:

| Tipo de informação | Arquivo |
|---|---|
| Funciona ou falha no dispositivo | `STATUS.md` |
| Decisão confirmada | `DECISIONS.md` |
| Hipótese ou alternativa não testada | `DECISIONS-OPEN.md` |
| Próxima ação executável | `CHECKLIST.md` |
| Contexto de arquitetura e histórico técnico | `BLUEPRINT.md` |

Uma alteração só está concluída quando o código, a documentação e o estado do Git estiverem coerentes:

```bash
git diff --check
git status --short
git add <arquivos>
git commit -m "Descrição curta da mudança"
git push origin main
```

### Resumo operacional para a próxima IA

```text
Leia README → BLUEPRINT → DECISIONS → STATUS → CHECKLIST → DECISIONS-OPEN.
Verifique o estado antes de instalar.
Preserve o Whisper já funcional.
Concentre a próxima ação na tradução offline.
Faça um único experimento pequeno.
Registre o resultado.
Só então proponha o próximo passo.
```

## Protocolo de leitura para uma nova IA

Uma IA que receber apenas este repositório deve começar pelo `README.md`, sem presumir que o histórico da conversa esteja disponível. Em seguida, deve ler `BLUEPRINT.md` para entender o produto e sua arquitetura, `DECISIONS.md` para separar decisões confirmadas de sugestões, `STATUS.md` para saber o que foi efetivamente testado, `CHECKLIST.md` para escolher uma única próxima ação, `DECISIONS-OPEN.md` para conhecer as incertezas e `TROUBLESHOOTING.md` antes de diagnosticar qualquer falha.

O contexto estratégico obrigatório é: **o repositório implementa primeiro o agente local de um produto de tradução automática para transmissões ao vivo**. A visão final é `capturar → transcrever → traduzir → enviar → publicar no chat`. O processamento local reduz dependência, custo e exposição do áudio, mas o produto não é completamente offline: autenticação, assinatura, backend, bot e chat dependem da internet.

Depois da leitura, a IA deve executar somente verificações não destrutivas:

```bash
git status --short --branch
find . -maxdepth 2 -type f -not -path './.git/*' | sort
for f in termux/*.sh; do bash -n "$f" || exit 1; done
```

O significado dos arquivos é deliberadamente separado. `STATUS.md` descreve fatos observados; `DECISIONS.md` descreve escolhas já feitas; `DECISIONS-OPEN.md` contém alternativas não validadas. Uma proposta encontrada no blueprint ou em uma anotação não deve ser tratada como código pronto.

Antes de modificar código, a IA deve localizar a função existente no `termux/wizard.sh` ou no `termux/install.sh`. Deve preferir uma alteração pequena e centralizada, não criar scripts paralelos para corrigir o mesmo problema. Após qualquer teste, deve registrar o resultado no arquivo apropriado e verificar `git diff --check` e `bash -n`.

## Instalação online em um Termux vazio

O fluxo foi projetado para um usuário que ainda não tem Python, Git, FFmpeg ou os arquivos do projeto dentro do Termux. O usuário precisa instalar manualmente apenas os aplicativos **Termux** e **Termux:API**, preferencialmente pela mesma origem, e abrir o Termux. A permissão do microfone continua sendo uma confirmação do Android e não pode ser concedida silenciosamente por um shell script.

Com conexão à internet, o usuário cola um único comando:

```bash
pkg update -y && pkg install -y curl && curl -fL --retry 3 https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap.sh | bash
```

O `bootstrap.sh` verifica se está dentro do Termux, atualiza o índice, instala `curl`, baixa a versão correspondente de `install.sh` e a executa. O instalador principal então instala os pacotes de sistema, cria `~/tradutor-local`, cria o ambiente Python, clona e compila o `whisper.cpp`, baixa o modelo `base`, cria os atalhos, baixa o wizard e configura `SSSystem`.

Quando terminar, o usuário executa:

```bash
SSSystem
```

O instalador não instala uma tradução online e não tenta resolver Argos/CTranslate2 automaticamente. Isso é intencional: a tradução offline ainda não foi validada neste ambiente e uma tentativa anterior provocou instalação pesada, tentativa de PyQt5 e encerramento do Termux por memória. O primeiro resultado esperado da instalação é o funcionamento de:

```text
microfone real → arquivo M4A finalizado → FFmpeg → Whisper → texto em português
```

Se a instalação falhar, o usuário deve reabrir o Termux, executar `SSSystem` se ele já existir e escolher **Suporte e solução de erros**. Não deve apagar `~/tradutor-local` nem repetir uma instalação pesada antes de consultar `TROUBLESHOOTING.md`.

## Testes automatizados pós-instalação

O repositório possui o teste reproduzível `tests/test_termux_installation.sh`. Ele não compila o Whisper nem acessa um microfone real. Em vez disso, cria uma HOME temporária e simula os comandos do Termux para validar a instalação lógica:

1. sintaxe de todos os scripts `.sh`;
2. configuração do `SSSystem`;
3. criação do executável em `~/bin/SSSystem`;
4. execução do wizard pelo comando `SSSystem`;
5. presença do menu de suporte;
6. idempotência do setup, sem duplicar a entrada do `PATH`.

Para executar localmente em Linux, macOS ou Termux:

```bash
bash tests/test_termux_installation.sh
```

O resultado esperado é:

```text
OK — scripts, wizard e SSSystem passaram no teste simulado.
```

O GitHub Actions executa esse mesmo teste em cada `push` e `pull_request`, por meio de `.github/workflows/shell-tests.yml`. Esse teste não substitui a validação manual do microfone, da duração do M4A, da transcrição e das permissões Android; ele valida a instalação lógica e a integração entre wizard e `SSSystem`.

## Regra estratégica permanente

Nenhuma futura implementação deve interpretar este projeto como apenas uma biblioteca ou aplicativo de tradução offline. A arquitetura local-first é o meio técnico para entregar o produto: uma camada de tradução automática que permite ao streamer alcançar uma audiência internacional sem mudar a maneira como transmite. Novas funcionalidades devem ajudar a fechar o circuito principal antes de expandir para legendas, overlays, comandos ou outras automações.
