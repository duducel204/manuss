# Guia para Google AI Studio Build Mode

Este guia orienta a criação de uma aplicação web que usa o Gemini API para conversar com a ponte MCP do Termux. A ponte MCP é a infraestrutura; o tradutor local continua sendo uma segunda parte independente do projeto.

> **Importante:** o repositório contém código e instruções públicas, mas não contém nenhum token MCP nem chave da Gemini. As credenciais devem ser configuradas como secrets no ambiente server-side do AI Studio.

## 1. Importar o repositório

No Google AI Studio, abra o **Build Mode** e escolha a opção de importar arquivos ou projeto a partir do GitHub. Selecione o repositório:

```text
duducel204/manuss
```

Use a branch `main`. Depois da importação, peça ao Build Mode para ler primeiro:

```text
README.md
MANUS.md
docs/AI_STUDIO_BUILD_MODE.md
termux/mcp_server.py
```

O código atual da ponte deve ser tratado como a fonte da verdade sobre as capacidades MCP. Não inventar ferramentas que não aparecem em `termux/mcp_server.py`.

## 2. Objetivo da aplicação

Criar uma aplicação web full-stack com frontend React e backend Node.js server-side. A aplicação deve usar o Gemini API e conectar-se a um servidor MCP remoto instalado no Termux do usuário.

O primeiro objetivo é validar uma operação somente de leitura:

```text
Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada.
```

O tradutor não deve ser instalado, alterado ou incorporado nesta primeira aplicação. Ele será preparado posteriormente através da ponte MCP validada.

## 3. Arquitetura desejada

```text
Usuário
  ↓
Frontend web
  ↓
Backend Node.js server-side
  ↓
Gemini API / Interactions API
  ↓
Servidor MCP remoto em /mcp
  ↓
Cloudflare Quick Tunnel
  ↓
MCP Bridge no Termux
  ↓
termux_exec
  ↓
stdout, stderr, exit_code, timed_out
```

O backend deve manter a chave da Gemini e o token MCP. O navegador nunca deve receber esses valores.

### Implementação do cliente neste repositório

O aplicativo usa o Gemini function calling como camada de decisão e um cliente MCP JSON-RPC server-side como camada de transporte:

```text
Gemini function calling → proposta assinada → aprovação no frontend
→ backend revalida → cliente MCP JSON-RPC → termux_exec
```

O SDK Gemini também possui tipos para Remote MCP nativo, mas este adaptador explícito é mantido para revisar e aprovar cada comando antes do envio ao Termux. Não substituir esse fluxo por chamada automática do servidor MCP sem preservar a aprovação no backend.

## 4. Capacidades MCP existentes

O servidor atual implementa:

| Componente | Implementação atual |
|---|---|
| Transporte | HTTP com JSON-RPC / Streamable HTTP |
| Endpoint MCP | `POST /mcp` |
| Health check | `GET /health` autenticado por Bearer |
| Autenticação | Header `Authorization: Bearer <token>` |
| Ferramenta | `termux_exec` |
| Argumento obrigatório | `command` |
| Argumento opcional | `timeout_seconds`, entre 1 e 300 segundos |
| Retorno | `stdout`, `stderr`, `exit_code`, `timed_out` |
| Shell | Bash do Termux |

A aplicação deve usar somente `termux_exec` nesta primeira versão. Não afirmar que existem ferramentas como `project.create`, `file.modify`, `git.commit` ou `project.test`, pois elas ainda não estão implementadas no servidor.

## 5. Preparar a ponte no Termux

No Termux do usuário, a ponte deve estar instalada e ativa antes do teste no AI Studio:

```bash
~/tradutor-local/mcp/start.sh
```

A saída exibirá valores reais semelhantes a:

```text
URL MCP: https://nome-aleatorio.trycloudflare.com/mcp
Header: Authorization: Bearer TOKEN_DO_USUARIO
```

O usuário deve manter o Termux aberto. O Quick Tunnel é temporário; a URL pode mudar quando o processo for reiniciado.

## 6. Configurar os secrets no AI Studio

No painel de **Secrets** do projeto, configurar estes valores somente no ambiente server-side:

```text
GEMINI_API_KEY=chave_real_da_Gemini_API
TERMUX_MCP_URL=https://nome-aleatorio.trycloudflare.com/mcp
TERMUX_MCP_TOKEN=token_real_exibido_no_Termux
```

Não adicionar tokens ao GitHub, ao frontend, ao HTML, ao JavaScript público, ao banco de dados ou a logs persistentes.

## 7. Prompt principal para o Build Mode

Cole o prompt abaixo depois de importar o repositório:

```text
Leia README.md, MANUS.md, docs/AI_STUDIO_BUILD_MODE.md e termux/mcp_server.py antes de implementar. Crie uma aplicação web full-stack para testar a ponte MCP remota do Termux com o Gemini API. Use frontend React e backend Node.js server-side.

A aplicação deve ter uma interface de chat, histórico de mensagens, indicador de status da conexão MCP, confirmação antes de executar comandos e uma área que mostre o resultado da ferramenta. Use somente a ferramenta MCP existente termux_exec.

Use a integração oficial atual do Gemini que suporte Remote MCP por Streamable HTTP. No backend, configure o servidor MCP com a seguinte estrutura conceitual:

{
  "type": "mcp_server",
  "name": "termux_pessoal",
  "url": process.env.TERMUX_MCP_URL,
  "headers": {
    "Authorization": `Bearer ${process.env.TERMUX_MCP_TOKEN}`
  },
  "allowed_tools": ["termux_exec"]
}

Use process.env.GEMINI_API_KEY somente no backend. Não exponha nenhum secret no navegador. O nome do servidor deve ser termux_pessoal, sem hífen.

Implemente primeiro um teste somente de leitura para o pedido: “Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada.” A operação enviada ao Termux deve ser equivalente a pwd && ls -la.

Mostre na interface o prompt do usuário, a ferramenta utilizada, o comando enviado, stdout, stderr, exit_code e timed_out. Trate erros de configuração ausente, token ausente, URL ausente, HTTP 401, HTTP 404, timeout, JSON inválido, MCP indisponível e ferramenta ausente.

Não aceite comandos arbitrários diretamente do navegador. Faça a decisão e a chamada MCP no backend. Antes de qualquer execução, mostre uma confirmação ao usuário. Para a primeira versão, classifique como sensíveis ou modificadores comandos que contenham rm, mv, chmod, chown, su, sudo, passwd, token, secret, key, .ssh, git commit, git push, pkg install, apt, pip install, npm install ou redirecionamentos que alterem arquivos. Bloqueie ou exija confirmação reforçada para esses comandos.

Essa política de confirmação deve ser implementada pela aplicação. Não diga que ela já existe no servidor MCP. O servidor atual oferece apenas autenticação Bearer e a ferramenta termux_exec.

Não crie ferramentas fictícias de projeto, arquivo ou Git. Não instale Whisper, Termux:API, modelos ou o tradutor nesta primeira aplicação. Inclua um README explicando os três secrets, como iniciar a ponte e como executar o teste mínimo.

Assine cada proposta de comando no backend e revalide a assinatura, o nome da ferramenta, o comando e a avaliação de segurança no endpoint de execução. Nunca confie somente no campo `userApproved` enviado pelo navegador. Use `APPROVAL_SIGNING_KEY` como secret opcional; se ele não existir, use a chave Gemini somente no server-side como fallback.
```

## 8. Teste mínimo

Depois de configurar os secrets e iniciar a ponte no Termux, use a interface da aplicação com:

```text
Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada.
```

O resultado esperado é:

- descoberta de `termux_exec`;
- execução de uma operação equivalente a `pwd && ls -la`;
- caminho HOME real do Termux;
- listagem de arquivos e diretórios;
- `exit_code` igual a `0`;
- nenhum arquivo criado, alterado ou excluído.

## 9. Diagnóstico direto da ponte

Antes de investigar a aplicação, o usuário pode testar o servidor local no próprio Termux:

```bash
TOKEN="$(cat ~/.config/termux-mcp/token)"
curl -i http://127.0.0.1:8765/health \
  -H "Authorization: Bearer $TOKEN"
```

O resultado esperado é HTTP 200 com:

```json
{"status":"ok"}
```

Se o teste local funcionar, mas a aplicação falhar, revisar `TERMUX_MCP_URL`, `TERMUX_MCP_TOKEN`, o sufixo `/mcp`, o Quick Tunnel ativo e a compatibilidade do cliente Gemini com Remote MCP Streamable HTTP.

## 10. Limites e segurança

A ponte atual executa comandos Bash no Termux. Ela não é uma sandbox de segurança contra comandos destrutivos. A aplicação deve tratar o usuário como autoridade sobre o próprio dispositivo e pedir autorização clara antes de instalar, modificar, excluir, publicar ou enviar dados.

O Quick Tunnel não fornece uma URL permanente. Encerrar `start.sh` encerra a ponte e trocar o token exige atualizar `TERMUX_MCP_TOKEN` no AI Studio.

O tradutor local, Whisper, Termux:API e modelos são a segunda parte do projeto. Não misturar sua instalação com o teste inicial da ponte.

## Referências

[1]: https://ai.google.dev/gemini-api/docs/function-calling "Gemini API — Function calling e Remote MCP"
[2]: https://ai.google.dev/gemini-api/docs/aistudio-build-mode "Google AI Studio Build Mode"
[3]: https://github.com/duducel204/manuss "Repositório Manuss"
[4]: https://modelcontextprotocol.io/ "Model Context Protocol"
