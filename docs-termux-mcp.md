# Ponte MCP pessoal entre o Manus e o Termux

Este diretório contém uma ponte pessoal para executar comandos no próprio Termux a partir de uma conversa no Manus. O servidor MCP roda no Android, escuta somente em `127.0.0.1` e é publicado por uma conexão de saída do Cloudflare Tunnel. Assim, o celular não precisa abrir uma porta de entrada.

## Componentes

```text
Manus → endpoint MCP HTTPS → Cloudflare Tunnel → 127.0.0.1:8765 → server.py → bash do Termux
```

O servidor expõe uma ferramenta chamada `termux_exec`, que recebe `command` e `timeout_seconds` e retorna `stdout`, `stderr`, `exit_code` e `timed_out`.

No Termux, o servidor usa por padrão `/data/data/com.termux/files/usr/bin/bash`. Para testes fora do Android, esse caminho pode ser substituído com `TERMUX_MCP_SHELL`.

## Instalação no Termux

No Termux, execute:

```bash
pkg update -y && pkg install -y curl
echo "https://raw.githubusercontent.com/duducel204/manuss/main/termux/setup_mcp.sh"
curl -fL --retry 3 https://raw.githubusercontent.com/duducel204/manuss/main/termux/setup_mcp.sh -o ~/setup_mcp.sh
chmod +x ~/setup_mcp.sh
~/setup_mcp.sh
```

O instalador cria o código em `~/tradutor-local/mcp` e gera um token pessoal em `~/.config/termux-mcp/token`. O servidor usa somente a biblioteca padrão do Python; portanto, não instala `mcp`, `uvicorn`, Rust nem extensões nativas.

Essa escolha é intencional: o SDK oficial Python do MCP puxa `rpds-py`, que pode tentar compilar Rust para `aarch64-unknown-linux-android`, alvo que não está disponível em algumas instalações do Termux.

## Túnel persistente

No painel Cloudflare, crie um túnel gerenciado, adicione uma aplicação publicada e aponte o serviço para `http://127.0.0.1:8765`. A documentação oficial descreve essa configuração em [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/setup/).

Salve o token do túnel no Termux, sem colocá-lo no Git:

```bash
mkdir -p ~/.config/termux-mcp
printf '%s\n' 'COLE_AQUI_O_TOKEN_DO_TUNEL' > ~/.config/termux-mcp/cloudflared-token
chmod 600 ~/.config/termux-mcp/cloudflared-token
```

Use um terminal para cada processo:

```bash
~/tradutor-local/mcp/run_server.sh
~/tradutor-local/mcp/run_tunnel.sh
```

O endpoint MCP será `https://SEU_HOSTNAME/mcp`.

Para uma prova rápida, o Cloudflare oferece `cloudflared tunnel --url http://localhost:8765`, mas esse modo gera URL temporária e é indicado apenas para desenvolvimento. Para uso contínuo, use um túnel gerenciado com hostname estável.

## Conector no Manus

O conector deve usar o endpoint completo:

```text
https://SEU_HOSTNAME/mcp
```

E o header HTTP:

```text
Authorization: Bearer CONTEUDO_DE_~/.config/termux-mcp/token
```

A criação do conector ainda não foi submetida porque o hostname do túnel e o token pessoal só existem depois da configuração no Termux/Cloudflare. Não publique o conteúdo desses arquivos no GitHub.

## Operação

Na conversa, o pedido explícito deve ser semelhante a:

> Execute no meu Termux: `pwd && git status --short`

O Manus chamará `termux_exec`. O comando é executado com Bash no diretório HOME do Termux. O tempo máximo é 300 segundos e a saída é limitada para evitar que uma chamada trave a conversa.

## Diagnóstico

Servidor local:

```bash
curl -i http://127.0.0.1:8765/health \
  -H "Authorization: Bearer $(cat ~/.config/termux-mcp/token)"
```

O retorno esperado é `200` e `ok`. Se o endpoint local funciona, mas o Manus não conecta, confira o hostname público, a rota do túnel para `http://127.0.0.1:8765` e o header `Authorization`.

## Limitações do protótipo

O servidor executa comandos arbitrários porque o objetivo é uso pessoal no próprio dispositivo. Ele não implementa filas, histórico persistente, múltiplos usuários, confirmação adicional ou execução em background. Processos longos devem ser iniciados explicitamente com ferramentas do Termux, `tmux` ou scripts próprios.

## Desenvolvimento

A implementação segue o formato JSON-RPC do transporte Streamable HTTP e usa apenas a biblioteca padrão do Python para maximizar a compatibilidade com Termux/aarch64. O código principal está em [`termux/mcp_server.py`](termux/mcp_server.py), o instalador em [`termux/setup_mcp.sh`](termux/setup_mcp.sh) e a declaração de dependências em [`termux/requirements-mcp.txt`](termux/requirements-mcp.txt).
