# Guia de onboarding: Manus conectado ao próprio Termux

Este documento orienta uma pessoa que clonou este repositório e quer usar a função MCP no próprio celular Android. O objetivo é permitir que o Manus execute comandos no Termux do mesmo usuário, sem reutilizar o endpoint, o token ou o conector de outra pessoa.

> **Regra fundamental:** cada usuário deve gerar o próprio token, iniciar o próprio túnel e cadastrar o próprio conector. Nunca copie credenciais encontradas em logs, capturas de tela, commits ou exemplos.

## Como o Manus deve interpretar este repositório

Quando o usuário pedir para configurar a ponte entre o Manus e o Termux, carregue a habilidade `termux-mcp-bridge`, se ela estiver instalada. Em seguida, leia este documento e `docs-termux-mcp.md`. A habilidade contém o procedimento operacional, os diagnósticos conhecidos e o contrato mínimo do servidor.

Se a habilidade não estiver instalada, siga este documento diretamente. O repositório contém o servidor MCP e os scripts necessários; ele não contém tokens ou conectores prontos.

O Manus deve executar o fluxo abaixo:

1. Confirmar que o usuário quer conectar **o próprio Manus ao próprio Termux**.
2. Verificar se o Termux e o Termux:API estão instalados, quando a instalação principal do projeto também for usada.
3. Instalar o MCP com o script oficial deste repositório.
4. Orientar o usuário a iniciar a ponte no Termux.
5. Ler do retorno do terminal a URL do túnel e o token, sem inventar valores.
6. Criar um conector MCP pessoal com a URL terminada em `/mcp` e o header Bearer.
7. Listar as ferramentas do conector.
8. Executar um comando de diagnóstico inofensivo, como `echo MCP conectado && pwd`.
9. Explicar que o Quick Tunnel é temporário e que uma URL nova exige atualização do conector.

## Pré-requisitos do usuário

O usuário precisa ter um dispositivo Android com Termux funcional e conexão com a internet. O aplicativo `cloudflared` precisa estar disponível no repositório de pacotes do Termux. Para a ponte MCP, o Termux:API não é obrigatório; ele só é necessário para os recursos de áudio e microfone deste projeto.

O usuário também precisa abrir esta tarefa no Manus com capacidade de configurar conectores. A criação do conector exige confirmação no Manus. O usuário nunca deve enviar seu token para o GitHub.

## Instalação no Termux

No Termux, executar:

```bash
curl -fL --retry 3 \
  https://raw.githubusercontent.com/duducel204/manuss/main/termux/setup_mcp.sh?v=3 \
  -o ~/setup_mcp.sh

chmod +x ~/setup_mcp.sh
~/setup_mcp.sh
```

O instalador instala `python`, `cloudflared` e `curl`, cria o servidor em `~/tradutor-local/mcp` e gera o token local em:

```text
~/.config/termux-mcp/token
```

A implementação do servidor utiliza somente a biblioteca padrão do Python. Não instalar o SDK Python MCP por conta própria neste fluxo. Em Termux/aarch64, o SDK pode puxar `rpds-py`, `maturin` e Rust e falhar ao compilar para Android.

## Inicialização e obtenção das credenciais

Executar:

```bash
~/tradutor-local/mcp/start.sh
```

O comando inicia o servidor local e o Cloudflare Quick Tunnel. O usuário deve manter esse terminal aberto. Após a conexão, o terminal exibirá:

```text
URL MCP: https://<nome>.trycloudflare.com/mcp
Header: Authorization: Bearer <token>
```

A URL e o token são dados locais da sessão do usuário. O Manus deve pedir que o usuário copie esses dois valores ou, se o ambiente permitir acesso autorizado ao Termux, ler o retorno da execução. Não buscar tokens em outro repositório ou em outra conta.

## Cadastro do conector no Manus

Depois de receber os valores reais, verificar conectores existentes para não duplicar a ponte:

```bash
manus-config config load --search mcp
manus-config connector list --user-custom-only
```

Se não houver um conector correspondente, criar um rascunho em modo form com esta estrutura, substituindo os placeholders apenas pelos valores fornecidos pelo usuário:

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
  "note": "Use este MCP para executar comandos explicitamente solicitados pelo usuário no seu próprio Termux. O endpoint usa um Cloudflare Quick Tunnel temporário e permanece disponível somente enquanto o terminal do Termux estiver aberto."
}
```

Salvar o rascunho em arquivo temporário e submetê-lo com `manus-config connector create --file`. Nunca colocar o token na linha de comando, no Git ou em documentação pública. Aguardar a confirmação do usuário para a criação do conector.

Depois da confirmação, verificar:

```bash
manus-mcp-cli tool list --server "Termux pessoal"
manus-mcp-cli tool call termux_exec \
  --server "Termux pessoal" \
  --input '{"command":"echo MCP conectado && pwd"}'
```

O resultado esperado contém `exit_code: 0`, uma saída com `MCP conectado` e o diretório HOME do Termux.

## Uso cotidiano

Quando o usuário pedir uma execução, o Manus deve chamar `termux_exec` apenas após um pedido explícito, por exemplo:

> Execute no meu Termux: `git status --short`

O argumento enviado deve ser o comando solicitado, sem transformar sugestões anteriores em autorização implícita. Para processos longos, preferir que o usuário use scripts próprios, `tmux` ou mecanismos do Termux e retornar o resultado inicial.

## Inicialização automática

Para iniciar a ponte ao abrir um shell do Termux:

```bash
printf '\n# Iniciar a ponte MCP pessoal\n' >> ~/.bashrc
printf '%s\n' '[ -x "$HOME/tradutor-local/mcp/autostart_mcp.sh" ] && "$HOME/tradutor-local/mcp/autostart_mcp.sh"' >> ~/.bashrc
source ~/.bashrc
```

Para iniciar após reinicialização do Android, instalar Termux:Boot e criar:

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-mcp <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
exec "$HOME/tradutor-local/mcp/autostart_mcp.sh"
SH
chmod +x ~/.termux/boot/start-mcp
```

Acompanhar a URL e os logs com:

```bash
tail -f ~/tradutor-local/logs/mcp-autostart.log
```

## Decisão entre Quick Tunnel e túnel permanente

| Opção | Quando usar | Limitação principal |
|---|---|---|
| Quick Tunnel | Primeiro teste e uso ocasional | A URL muda ao reiniciar |
| Túnel Cloudflare gerenciado | Uso contínuo | Requer configuração de conta/hostname |
| Rede privada equivalente | Usuário já possui uma solução de rede | Exige configurar a rede escolhida |

Não apresentar o Quick Tunnel como URL permanente. Se o usuário quiser operação sem manutenção, recomendar um túnel gerenciado com hostname fixo e atualizar apenas a configuração do túnel, mantendo o servidor MCP em `127.0.0.1:8765`.

## Diagnóstico

Se o instalador tentar instalar `mcp`, `uvicorn`, `rpds-py`, `maturin` ou Rust, o usuário recebeu uma versão antiga do instalador. Baixar novamente pela URL acima com o parâmetro `?v=3` e confirmar que `setup_mcp.sh` contém `exec python` e não contém `pip install`.

Se o `cloudflared` mostrar `Registered tunnel connection` e os testes de conectividade como `PASS`, o túnel está funcionando. O aviso sobre `ping_group_range` não impede o transporte HTTP.

Se a ferramenta for descoberta, mas a chamada falhar, conferir se a URL inclui `/mcp`, se o token pertence ao mesmo processo em execução e se o terminal do Termux continua aberto. A URL temporária pode ter expirado ou sido substituída.

## Limites e privacidade

A ferramenta executa comandos arbitrários no shell do usuário. Ela deve ser usada somente para o próprio Termux e com pedidos explícitos. Não registrar tokens, comandos sensíveis ou saídas privadas no GitHub. Não reutilizar o conector de outro usuário. Para substituir um token exposto, gerar outro token local e atualizar o header do conector.

## Referências

[1]: https://developers.cloudflare.com/tunnel/setup/ "Cloudflare Tunnel — documentação oficial de configuração"
[2]: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports "Model Context Protocol — transportes"
