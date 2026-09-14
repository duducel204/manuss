# Ponte MCP pessoal entre o Manus e o Termux

Esta ponte permite que o Manus execute comandos no seu próprio Termux. O servidor roda no Android e um Cloudflare Quick Tunnel cria temporariamente o caminho HTTPS até ele. Não é necessário criar domínio, configurar painel ou instalar o SDK MCP.

## Instalação simples

No Termux, execute:

```bash
curl -fL --retry 3 \
  https://raw.githubusercontent.com/duducel204/manuss/main/termux/setup_mcp.sh?v=3 \
  -o ~/setup_mcp.sh

chmod +x ~/setup_mcp.sh
~/setup_mcp.sh
```

O instalador instala apenas `python`, `cloudflared` e `curl`, gera um token local e prepara o servidor MCP sem dependências externas. Isso evita o erro `rpds-py`/Rust que ocorre com o SDK oficial em alguns Termux aarch64.

## Iniciar tudo com um comando

Depois da instalação, execute:

```bash
~/tradutor-local/mcp/start.sh
```

O comando inicia o servidor MCP e o Quick Tunnel automaticamente. Após alguns segundos, ele exibirá algo parecido com:

```text
URL para o Manus: https://nome-aleatorio.trycloudflare.com/mcp
Header: Authorization: Bearer SEU_TOKEN
```

Mantenha esse terminal aberto. Pressionar `Ctrl+C` encerra o servidor e o túnel.

## Cadastrar no Manus

Use a URL exibida pelo comando, incluindo `/mcp`:

```text
https://nome-aleatorio.trycloudflare.com/mcp
```

Adicione o header HTTP:

```text
Authorization: Bearer SEU_TOKEN
```

A URL muda quando o processo é encerrado ou reiniciado. Por isso, o Quick Tunnel é a opção mais simples para começar, mas não é uma URL permanente.

## Uso

Na conversa do Manus, solicite explicitamente:

> Execute no meu Termux: `pwd && git status --short`

A ferramenta disponibilizada é `termux_exec`. Ela retorna a saída do comando, os erros, o código de saída e informa quando o tempo limite foi atingido.

## Diagnóstico local

Com o servidor ativo, em outro terminal do Termux:

```bash
TOKEN="$(cat ~/.config/termux-mcp/token)"
curl -i http://127.0.0.1:8765/health \
  -H "Authorization: Bearer $TOKEN"
```

O retorno esperado é `200` com `{"status": "ok"}`.

## Arquivos locais

```text
~/tradutor-local/mcp/server.py
~/tradutor-local/mcp/start.sh
~/tradutor-local/mcp/run_server.sh
~/.config/termux-mcp/token
~/tradutor-local/logs/mcp-server.log
~/tradutor-local/logs/mcp-tunnel.log
```

O servidor usa apenas a biblioteca padrão do Python e escuta em `127.0.0.1:8765`. O Cloudflare Tunnel faz uma conexão de saída; nenhuma porta de entrada do celular é aberta diretamente.

Para uso permanente com URL fixa, pode-se trocar posteriormente o Quick Tunnel por um túnel Cloudflare gerenciado. Isso não é necessário para o primeiro teste.
