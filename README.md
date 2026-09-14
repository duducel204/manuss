# Tradutor Local para Streaming

Protótipo local-first para captura de áudio, transcrição e tradução offline voltado inicialmente a streamers.

## Estado atual

O ambiente validado é **Android + Termux**. O pipeline funcional é:

```text
Microfone real → Termux:API → FFmpeg → whisper.cpp → transcrição local
```

A tradução offline ainda está em avaliação. O Argos Translate não funcionou no Termux atual porque o CTranslate2 não possui distribuição compatível.

## Documentação

- [Blueprint](BLUEPRINT.md)
- [Decisões](DECISIONS.md)
- [Status técnico](STATUS.md)
- [Checklist](CHECKLIST.md)
- [Decisões em aberto](DECISIONS-OPEN.md)

## Termux

Os scripts de instalação e execução ficam em [`termux/`](termux/). Modelos Whisper, caches, áudios e credenciais não devem ser versionados.

## Próximo marco

```text
SSSystem → gravação real → transcrição local → teste isolado de tradução offline
```

A integração com Kick, Supabase, assinaturas e envio de mensagens permanece fora do protótipo atual.
