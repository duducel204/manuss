# Instruções para o Manus

Quando o usuário quiser conectar o Manus ao próprio Termux, use a habilidade `termux-mcp-bridge` se ela estiver instalada e leia [`docs/MANUS_TERMUX_MCP.md`](docs/MANUS_TERMUX_MCP.md). O procedimento padrão é instalar `termux/setup_mcp.sh`, iniciar `~/tradutor-local/mcp/start.sh`, cadastrar a URL temporária `/mcp` com o Bearer token do próprio usuário e validar `termux_exec` com um comando inofensivo.

Cada usuário deve ter seu próprio servidor, token, túnel e conector. Nunca reutilize credenciais de logs, screenshots, commits ou outro usuário. Não trate a URL `trycloudflare.com` como permanente. Execute comandos no Termux somente depois de solicitação explícita do usuário e não versiona tokens, logs ou saídas privadas.
