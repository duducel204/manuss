# Instruções para o Manus

## Princípio obrigatório

Trate este repositório como um fluxo em duas partes:

1. **Etapa 1 — Ponte MCP pessoal:** conectar a inteligência artificial ao Windows ou ao Termux do próprio usuário.
2. **Etapa 2 — Tradutor local:** preparar e operar captura, transcrição e tradução depois que a conexão MCP estiver validada.

A Etapa 1 é um pré-requisito obrigatório. Não conduza a instalação do Whisper ou do tradutor como primeiro passo quando a ponte ainda não estiver conectada.

## Quando o usuário iniciar

Se o usuário quiser usar o repositório, explique primeiro que a ponte MCP é a fundação do projeto. Se o ambiente for Windows, siga [`windows/README.md`](windows/README.md), instale Python 3.11+ e execute os scripts PowerShell. Se o ambiente for Android, oriente-o a instalar o Termux e, se for usar áudio, o Termux:API pela mesma origem. Um Termux recém-instalado pode não ter nem `curl`; por isso, forneça exatamente este comando inicial:

```bash
pkg update -y && pkg install -y curl && \
curl -fsSL --retry 3 \
  https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap_mcp.sh \
  | bash
```

Esse comando instala somente a ponte MCP. Não instale o tradutor nesse momento.

No Windows, inclusive em uma máquina sem Git ou Python, a instalação equivalente é:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
irm https://raw.githubusercontent.com/duducel204/manuss/7e45e491994586d7cb9bb8247816dade7234bed8/windows/bootstrap_mcp_pinned.ps1 | iex
```

O bootstrap pinned tenta instalar Python 3.12 via `winget`, baixa o `cloudflared` e pode ser executado de qualquer pasta. Se `winget` não estiver disponível, orientar a instalação manual de Python 3.11+ com `Add python.exe to PATH`, fechar e reabrir o PowerShell e repetir o comando. O `start_mcp.ps1` inicia o servidor e o Quick Tunnel automaticamente e exibe a URL pública `/mcp`. Nesse modo, a ferramenta `termux_exec` mantém o nome por compatibilidade, mas executa o comando no PowerShell local do Windows. Não expor a porta diretamente.

Depois, oriente o usuário a executar:

```bash
~/tradutor-local/mcp/start.sh
```

Peça que ele forneça o retorno contendo:

```text
URL MCP: https://<nome>.trycloudflare.com/mcp
Header: Authorization: Bearer <token>
```

Nunca invente URL ou token e nunca reutilize credenciais de outro usuário. Não peça que o usuário publique o token no GitHub ou em mensagens públicas.

## Cadastro do servidor MCP no Manus

Antes de criar ou atualizar um conector, inspecione a configuração disponível:

```bash
manus-config config load --search mcp
```

Se o conector ainda não existir, crie um rascunho usando a URL e o token reais fornecidos pelo usuário. A configuração deve conter:

```json
{
  "mode": "form",
  "name": "Termux pessoal",
  "mcpServers": {
    "termux-pessoal": {
      "url": "https://<nome>.trycloudflare.com/mcp",
      "headers": {
        "Authorization": "Bearer <token-do-usuario>"
      }
    }
  },
  "note": "Ponte MCP pessoal para executar comandos explicitamente solicitados no Termux do próprio usuário."
}
```

Não coloque o token em arquivos versionados. Siga o fluxo de configuração de conectores do ambiente e aguarde a confirmação exigida para criar o conector. Depois, liste as ferramentas e valide com um comando inofensivo:

```bash
manus-mcp-cli tool list --server "Termux pessoal"
manus-mcp-cli tool call termux_exec \
  --server "Termux pessoal" \
  --input '{"command":"echo MCP conectado && pwd"}'
```

Considere a Etapa 1 concluída somente quando `termux_exec` estiver disponível e retornar `exit_code: 0`.

## Ponte como infraestrutura genérica

Não tratar a ponte como um recurso exclusivo do tradutor. Depois de validada, ela pode apoiar outros projetos do usuário no Termux: desenvolvimento, criação e leitura de arquivos, testes, diagnóstico, Git e operação local. A implementação atual oferece somente a ferramenta de baixo nível `termux_exec`; não presumir a existência de ferramentas de projeto, arquivo ou Git com nomes específicos.

Conduzir o trabalho em um ciclo verificável:

```text
objetivo → planejar → executar → observar → interpretar → corrigir → testar → validar
```

Antes de cada operação, consultar o estado real do Termux quando isso for relevante. Usar os resultados devolvidos por `stdout`, `stderr`, `exit_code` e `timed_out` para escolher o próximo passo. Começar por leituras e testes não destrutivos. Para instalação, alteração de arquivos, publicação, commit, exclusão ou qualquer operação potencialmente irreversível, explicar o impacto e obter autorização clara antes de executar.

O projeto ainda não possui uma camada de política/autorização implementada no servidor além do Bearer token e das regras de operação da conversa. Não afirmar que existe bloqueio automático para comandos destrutivos ou acesso a credenciais. Nunca ler, expor ou versionar tokens, chaves, credenciais ou saídas sensíveis.

## Depois que a ponte estiver conectada

Somente após a validação MCP, pergunte ou confirme que o usuário deseja preparar o tradutor. Quando autorizado, use `termux_exec` para verificar o ambiente e conduzir a instalação em passos pequenos. O instalador da Etapa 2 é:

```bash
curl -fL --retry 3 \
  https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap.sh \
  | bash
```

Depois, use `SSSystem` para status, Whisper, gravação e transcrição. Preserve o Whisper já funcional. A tradução offline ainda não está validada e não deve ser apresentada como concluída.

## Regras de operação

- Execute comandos no Termux somente quando o usuário os solicitar explicitamente ou autorizar claramente a etapa atual.
- Não transforme uma sugestão anterior em autorização para ações destrutivas, envio de dados ou mudanças de segurança.
- Não versionar tokens, URLs temporárias, logs, áudios, modelos ou credenciais.
- Explique que o Cloudflare Quick Tunnel é temporário e que a URL pode mudar após reiniciar a ponte.
- A ponte MCP é um padrão HTTP/JSON-RPC; ela não é exclusiva do Manus. Outros clientes de IA que suportem MCP remoto podem usar a mesma URL e header, mas o cadastro deve seguir o procedimento do cliente escolhido.
- Se o usuário escolher outra IA, não tente criar um conector Manus; entregue a URL `/mcp`, o header Bearer e a descrição da ferramenta `termux_exec` para o mecanismo de configuração dessa IA.
- Não exponha o endpoint a terceiros nem reutilize o token de outra pessoa.

## Diagnóstico rápido

Se a ponte não conectar, conferir nesta ordem:

1. O comando foi executado dentro do Termux.
2. `~/tradutor-local/mcp/start.sh` continua em execução.
3. A URL cadastrada termina em `/mcp`.
4. O header usa exatamente `Authorization: Bearer <token>`.
5. O terminal do Termux continua aberto.
6. A URL do Quick Tunnel não mudou.

A ponte deve usar o servidor Python baseado na biblioteca padrão. Não instalar o SDK Python MCP, `uvicorn`, `rpds-py`, `maturin` ou Rust como parte deste onboarding.

## Referências

- [`README.md`](README.md) — guia do usuário em duas etapas.
- [`docs/MANUS_TERMUX_MCP.md`](docs/MANUS_TERMUX_MCP.md) — detalhes do onboarding MCP.
- [`termux/bootstrap_mcp.sh`](termux/bootstrap_mcp.sh) — comando atômico da Etapa 1.
- [`termux/setup_mcp.sh`](termux/setup_mcp.sh) — instalador executado pelo bootstrap.
