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

## Etapa 2 — Preparar o tradutor local

Só comece esta etapa depois que a ponte estiver conectada e validada. A IA poderá conduzir a preparação pelo MCP, ou você poderá usar os scripts diretamente no Termux.

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
