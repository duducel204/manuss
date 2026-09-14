# Status técnico

## Funcionando

- Termux.
- Termux:API.
- Captura real do microfone via `termux-microphone-record`.
- Finalização explícita com `termux-microphone-record -q`.
- FFmpeg e ffprobe.
- Python 3.13 e ambiente virtual.
- whisper.cpp compilado no Android.
- Modelo Whisper `base`.
- Transcrição local em português.
- Comando `SSSystem` para iniciar o wizard.

## Não concluído

- Tradução offline no Termux.
- Detecção de silêncio/VAD integrada ao fluxo contínuo.
- Seleção de várias fontes de áudio.
- Aplicativo Android nativo.
- Integração com Kick.
- Supabase, login e assinaturas.
- Envio de mensagens.

## Limitações conhecidas

- O arquivo M4A deve ser finalizado com `-q` antes de ser lido pelo ffprobe; caso contrário pode ocorrer `moov atom not found`.
- O Termux:API captura o microfone Android, mas não oferece o controle de múltiplas entradas esperado para a versão futura no Windows.
- Argos Translate pode ser importado, mas a tradução não funciona sem CTranslate2, que não está disponível no Termux/Python atual.
- Não versionar modelos, áudios, caches, tokens ou credenciais.
- Experimento de maior risco pendente: validar `llama.cpp` + modelo GGUF pequeno em Android/Termux real. Nenhuma integração foi implementada.
