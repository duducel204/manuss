# Ponte MCP pessoal e tradutor local para Termux

Este repositório tem **duas partes separadas**. A primeira é obrigatória: uma ponte MCP pessoal que conecta o Termux a uma inteligência artificial compatível com MCP. A segunda é o agente local de captura, transcrição e tradução.

> **Regra de entrada:** primeiro conecte a ponte MCP. Só depois prepare o tradutor.

## O que este projeto oferece

```text
Parte 1 — Ponte MCP
Termux → servidor MCP local → túnel HTTPS → cliente de IA

Parte 2 — Tradutor local
microfone → Termux:API → FFmpeg → Whisper → tradução offline
```

A ponte não é exclusiva do Manus. O servidor expõe MCP por HTTP com JSON-RPC, Bearer token e a ferramenta `termux_exec`; portanto, qualquer cliente de inteligência artificial que suporte servidores MCP remotos por HTTP e headers de autenticação pode utilizá-la. O cadastro do servidor varia conforme a IA. O Manus possui instruções específicas em [`MANUS.md`](MANUS.md); outras IAs devem receber a URL `/mcp` e o header `Authorization: Bearer <token>` conforme o mecanismo de configuração delas.

## Conexão MCP

### Objetivo

Este projeto não é apenas um tradutor. Ele também pode estabelecer uma ponte MCP entre uma IA conversacional compatível e o ambiente Termux do usuário. O fluxo de comunicação é:

```text
IA conversacional → MCP Bridge → Termux → comando/operação → resultado → MCP → IA
```

Depois que a conexão estiver configurada, a IA pode, através da própria conversa, consultar o estado real do Termux, listar arquivos e diretórios, executar operações autorizadas, receber os resultados e usar essas informações para orientar ou executar os próximos passos. Essa capacidade é genérica: pode ser usada para desenvolver, testar, diagnosticar e operar outros projetos existentes no Termux, mesmo que não tenham relação com tradução.

No código atual, essa comunicação é implementada pelo servidor [`termux/mcp_server.py`](termux/mcp_server.py). Ele aceita requisições JSON-RPC autenticadas em `POST /mcp` e expõe a ferramenta `termux_exec`, que executa um comando Bash no próprio Termux e retorna a saída padrão, a saída de erro, o código de saída e a indicação de timeout. O endpoint autenticado `GET /health` permite verificar se o servidor está ativo. O servidor escuta localmente em `127.0.0.1:8765`; o [`termux/setup_mcp.sh`](termux/setup_mcp.sh) inicia também um Cloudflare Quick Tunnel para permitir o acesso HTTPS remoto.

### Pré-requisitos

- Termux instalado no Android e acesso à internet.
- `curl`, instalado pelo comando inicial documentado abaixo.
- Um cliente de IA que aceite servidores MCP remotos por HTTP e headers de autenticação.
- Termux:API somente se a segunda parte, de captura de áudio, também for usada.

### Configuração

1. No Termux, execute o bootstrap da ponte MCP. Ele instala apenas os componentes da ponte, não o tradutor:

   ```bash
   pkg update -y && pkg install -y curl && \
   curl -fsSL --retry 3 \
     https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap_mcp.sh \
     | bash
   ```

2. Inicie a ponte:

   ```bash
   ~/tradutor-local/mcp/start.sh
   ```

3. Mantenha o terminal aberto e copie a URL exibida, terminada em `/mcp`, e o header `Authorization: Bearer <token>`.

4. Cadastre esses dois dados no cliente de IA escolhido. O formato e o local do cadastro dependem do cliente; não há um cadastro universal definido pelo repositório. Nunca publique o token.

5. Antes de tentar instalar, alterar ou operar qualquer projeto local, a IA deve verificar se existe uma conexão MCP ativa. Se não existir, deve orientar a configuração da ponte ou solicitar que o usuário a configure primeiro.

O Quick Tunnel é temporário. Se a ponte for reiniciada e receber outra URL, o servidor MCP precisa ser atualizado no cliente de IA.

### Teste mínimo

Depois de cadastrar o servidor, envie à IA a solicitação:

```text
Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada.
```

A IA deve usar a ferramenta existente `termux_exec` com uma operação de leitura equivalente a `pwd` e à listagem do diretório HOME. O resultado esperado é o caminho HOME do Termux e uma listagem dos arquivos e diretórios encontrados, sem alteração no ambiente. Se a IA não conseguir descobrir `termux_exec`, verificar a URL `/mcp`, o header Bearer, o processo `start.sh`, o terminal aberto e a validade da URL temporária.

### A ponte como infraestrutura de atuação

A ponte MCP funciona como um canal operacional entre a conversa e o ambiente local. Em vez de apenas responder com trechos de código para o usuário copiar, uma IA compatível pode, quando autorizada, trabalhar em um ciclo de engenharia dentro do Termux:

```text
objetivo → planejar → executar → observar o resultado
        → interpretar erros → corrigir → testar novamente → validar
```

Esse ciclo pode apoiar o desenvolvimento, os testes, o diagnóstico e a operação de projetos que já existam no Termux. O tradutor é apenas uma aplicação possível sobre essa infraestrutura; a ponte não depende do pipeline de áudio, Whisper ou tradução.

No estado atual, a única ferramenta MCP de execução é `termux_exec`. Ela recebe um comando Bash e um timeout opcional entre 1 e 300 segundos, executa o comando no shell do Termux e devolve `stdout`, `stderr`, `exit_code` e `timed_out`. Os nomes de ferramentas de nível superior, como operações específicas de projeto, arquivo ou Git, são apenas possibilidades futuras e **não fazem parte da implementação atual**.

Por isso, a IA deve tratar a ferramenta atual como um executor de baixo nível e seguir estas regras:

- consultar o estado antes de alterar o ambiente;
- preferir operações de leitura e testes não destrutivos no diagnóstico inicial;
- explicar o próximo comando e solicitar autorização quando a operação modificar arquivos, instalar dependências, publicar alterações ou puder causar perda de dados;
- usar os resultados reais do Termux para decidir o próximo passo, sem presumir que uma instalação ou teste foi bem-sucedido;
- não acessar, expor ou versionar credenciais, tokens, chaves e arquivos sensíveis.

A evolução natural do projeto é adicionar uma camada explícita de política entre o MCP e o executor, com escopos de autorização e confirmações para operações sensíveis. Essa camada ainda não está implementada; até lá, a segurança depende da autenticação Bearer, do uso do próprio endpoint pelo usuário e da autorização explícita na conversa.

## Comece pela Etapa 1 — Ponte MCP

A ponte permite que a IA conectada ao seu servidor:

- verifique o ambiente do Termux;
- execute comandos no seu próprio dispositivo quando você solicitar;
- diagnostique a instalação;
- preparar e operar a segunda parte do projeto.

### Pré-requisitos

Instale o **Termux** no Android e, se também quiser usar captura de áudio, instale o **Termux:API** pela mesma origem. Para a ponte MCP, o Termux:API não é obrigatório. Abra o Termux e execute este único comando. Ele instala o `curl` primeiro, porque um Termux recém-instalado pode ainda não ter esse programa:

```bash
pkg update -y && pkg install -y curl && \
curl -fsSL --retry 3 \
  https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap_mcp.sh \
  | bash
```

O bootstrap instala somente `curl` e, por meio do instalador oficial da ponte, `python` e `cloudflared`. Ele não instala Whisper, modelos, pacotes do tradutor ou integrações de streaming.

Depois, inicie a ponte:

```bash
~/tradutor-local/mcp/start.sh
```

Mantenha esse terminal aberto. O comando exibirá os dados de conexão:

```text
URL MCP: https://<nome>.trycloudflare.com/mcp
Header: Authorization: Bearer <token>
```

Cadastre a URL completa, incluindo `/mcp`, e o header no seu cliente de IA. Nunca publique o token. O Quick Tunnel é temporário; ao reiniciar a ponte, a URL poderá mudar e o cadastro precisará ser atualizado.

### Teste da ponte

Depois de cadastrar o servidor, peça à sua IA:

```text
Execute no meu Termux: echo MCP conectado && pwd
```

O resultado esperado é uma saída contendo `MCP conectado` e o diretório HOME do Termux. Use `termux_exec` somente para comandos solicitados explicitamente por você.

O guia detalhado para o Manus está em [`docs/MANUS_TERMUX_MCP.md`](docs/MANUS_TERMUX_MCP.md). O servidor usa apenas a biblioteca padrão do Python para evitar dependências frágeis do SDK MCP em Termux/aarch64.

Se a aplicação de teste for criada no Google AI Studio, use o **Build Mode** para importar este repositório pelo GitHub. Depois da importação, leia [`docs/AI_STUDIO_BUILD_MODE.md`](docs/AI_STUDIO_BUILD_MODE.md), configure os secrets somente no backend do AI Studio e use o prompt fornecido nesse guia. O arquivo reúne a arquitetura, o contrato real da ponte, o teste mínimo e os limites de segurança. Não coloque tokens MCP ou chaves da Gemini no repositório.

## Etapa 2 — Preparar o tradutor local

Só comece esta etapa depois que a ponte estiver conectada e validada. A IA poderá conduzir a preparação pelo MCP, ou você poderá usar os scripts diretamente no Termux.

Uma IA que acabou de ler este repositório deve seguir esta ordem: **verificar ou estabelecer a Conexão MCP, testar uma operação de leitura no Termux e somente então tentar operar o ambiente local ou preparar o tradutor**. A existência dos scripts no GitHub não significa que a IA já tenha acesso ao dispositivo.

Para instalar o agente local do tradutor, execute no Termux:

```bash
curl -fL --retry 3 \
  https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap.sh \
  | bash
```

O fluxo instala ou verifica o ambiente, prepara o Whisper e configura o comando `SSSystem`. Depois, abra o wizard:

```bash
SSSystem
```

A sequência recomendada é:

```text
1. Ver status
2. Preparar/verificar Python
3. Preparar Whisper e modelo
4. Gravar áudio real
5. Transcrever o último áudio
6. Avaliar a tradução offline, quando houver um motor compatível
```

O pipeline de captura e transcrição local validado atualmente é:

```text
Microfone real → Termux:API → FFmpeg → whisper.cpp → transcrição local
```

A tradução offline ainda está em avaliação. O Argos Translate não foi validado no Termux atual porque o CTranslate2 não possui distribuição compatível. Não trate a tradução como pronta nem reinstale dependências pesadas sem um teste reproduzível.

## Estado e limites atuais

O projeto é um protótipo local para Android + Termux. Kick, Supabase, assinaturas, múltiplas identidades e publicação real em chat ainda estão fora do escopo validado. Modelos, áudios, caches, logs, tokens e outras credenciais não devem ser versionados.

A ponte executa comandos arbitrários no shell do usuário. Ela deve ser usada apenas para o próprio Termux, com autorização explícita para cada execução. Para uso contínuo, substitua o Quick Tunnel por um túnel gerenciado ou outra rede privada com endpoint persistente.

## Documentação

- [`MANUS.md`](MANUS.md) — instruções para o Manus conduzir o usuário.
- [`docs/MANUS_TERMUX_MCP.md`](docs/MANUS_TERMUX_MCP.md) — onboarding detalhado da ponte MCP.
- [`docs/AI_STUDIO_BUILD_MODE.md`](docs/AI_STUDIO_BUILD_MODE.md) — guia para importar o repositório e criar o cliente Gemini no AI Studio.
- [`docs-termux-mcp.md`](docs-termux-mcp.md) — referência operacional da ponte.
- [`termux/mcp_server.py`](termux/mcp_server.py) — servidor MCP JSON-RPC.
- [`termux/setup_mcp.sh`](termux/setup_mcp.sh) — instalador da ponte usado pelo bootstrap.
- [`termux/bootstrap_mcp.sh`](termux/bootstrap_mcp.sh) — instalador atômico da Etapa 1.
- [`STATUS.md`](STATUS.md) — estado técnico observado.
- [`CHECKLIST.md`](CHECKLIST.md) — próximas ações do protótipo.
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — diagnóstico do tradutor.

## Testes

Valide os scripts shell com:

```bash
for f in termux/*.sh; do bash -n "$f" || exit 1; done
python3 tests/test_mcp_server.py
bash tests/test_termux_installation.sh
```

O teste de instalação é simulado: não acessa o microfone, não compila o Whisper e não cria um túnel real. A validação física da ponte e do áudio precisa ser feita no Termux do usuário.
