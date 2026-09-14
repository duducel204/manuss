# MCP no Windows

Esta ponte executa o servidor MCP diretamente no Windows, sem Termux, sem SDK MCP e sem dependências Python externas. O contrato permanece igual: `POST /mcp`, JSON-RPC, autenticação Bearer e a ferramenta `termux_exec`. O nome histórico da ferramenta é mantido por compatibilidade, embora no Windows ela execute comandos no PowerShell local.

## Fluxo recomendado para uma máquina virgem

O computador não precisa ter Git, Python ou o repositório clonado. Abra o **Windows PowerShell** ou o **PowerShell** como usuário normal e execute:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
irm https://raw.githubusercontent.com/duducel204/manuss/6ae55e7a12685743fac35f6d0414d9af8e6a937e/windows/bootstrap_mcp_pinned.ps1 | iex
```

Use o comando exatamente como mostrado, sem texto adicional na mesma linha. A versão `pinned` usa referências imutáveis aos arquivos publicados e é recomendada para a primeira instalação. Depois que o cache do GitHub estiver atualizado, a versão pelo branch `main` também poderá ser usada:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
irm https://raw.githubusercontent.com/duducel204/manuss/main/windows/bootstrap_mcp.ps1 | iex
```

O bootstrap:

1. baixa os scripts oficiais do repositório;
2. verifica se Python 3.11+ está disponível;
3. tenta instalar Python 3.12 com `winget`, se necessário;
4. baixa o servidor MCP;
5. gera um token local;
6. inicia o servidor na mesma janela.

O `winget` normalmente já vem com versões recentes do Windows 10 e Windows 11. Se ele não existir, o script informará que Python deve ser instalado manualmente em [python.org](https://www.python.org/downloads/windows/). Durante a instalação manual, marque **Add python.exe to PATH**, feche e reabra o PowerShell e execute o bootstrap novamente.

O comando pode ser executado a partir de qualquer pasta, inclusive `C:\Windows\System32`; ele não depende do diretório atual. A alteração de política feita com `-Scope Process` vale apenas para a janela atual do PowerShell.

> O comando remoto deve ser usado somente se você confia no conteúdo do repositório. Para uma instalação auditável, baixe os arquivos, revise-os e execute localmente.

## Fluxo usando um clone ou os arquivos baixados

Se o repositório já estiver disponível:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\windows\setup_mcp.ps1
.\windows\start_mcp.ps1
```

O `start_mcp.ps1` também chama o setup automaticamente se os arquivos instalados ainda não existirem.

## O que é instalado

A instalação não usa `pip` e não cria ambiente virtual, pois o servidor utiliza somente a biblioteca padrão do Python. Os arquivos locais são:

```text
Servidor: %LOCALAPPDATA%\manuss-mcp\mcp_server.py
Token:    %APPDATA%\termux-mcp\token
```

O token é gerado aleatoriamente e não deve ser enviado ao GitHub, incluído em chamados ou publicado em mensagens públicas.

## Conexão local

Enquanto o script estiver em execução, cadastre no cliente MCP:

```text
URL: http://127.0.0.1:8765/mcp
Header: Authorization: Bearer <token exibido pelo script>
```

A URL local funciona apenas para aplicações no mesmo computador. Para validar:

```powershell
$token = (Get-Content "$env:APPDATA\termux-mcp\token" -Raw).Trim()
Invoke-RestMethod http://127.0.0.1:8765/health -Headers @{ Authorization = "Bearer $token" }
```

O retorno esperado é:

```json
{"status":"ok"}
```

## Exemplos de uso

Os comandos são interpretados pelo PowerShell:

```text
Execute no meu Windows: Get-Location
Execute no meu Windows: Get-ChildItem
Execute no meu Windows: git status --short
```

Git não é necessário para a ponte MCP; ele só será necessário se você quiser operar projetos que usem Git.

## Acesso remoto opcional

Não exponha a porta `8765` diretamente à internet. Para um cliente em outro dispositivo, use uma VPN, rede privada ou túnel gerenciado. Para um teste temporário, com `cloudflared` instalado:

```powershell
cloudflared tunnel --url http://127.0.0.1:8765
```

Use a URL pública terminada em `/mcp`, mantenha o token secreto e lembre-se de que a URL do Quick Tunnel é temporária.

## Segurança

A ferramenta executa comandos arbitrários no PowerShell do usuário. Comece com comandos de leitura. Autorize explicitamente instalações, alterações, exclusões, commits, publicações e operações que possam expor dados. Encerre a janela do servidor quando não estiver usando a ponte.

## Diagnóstico rápido

- **Python não encontrado:** instale Python 3.11+ e marque `Add python.exe to PATH`, ou instale o App Installer/`winget`.
- **Comando não reconhecido após instalar Python:** feche e abra o PowerShell novamente.
- **HTTP 401:** o token cadastrado não corresponde ao arquivo `%APPDATA%\termux-mcp\token`.
- **HTTP 404:** a URL precisa terminar exatamente em `/mcp`.
- **Não conecta:** confirme que a janela do `start_mcp.ps1` continua aberta.
- **Porta ocupada:** encerre outro servidor na porta `8765` ou defina `TERMUX_MCP_PORT` antes de iniciar.
