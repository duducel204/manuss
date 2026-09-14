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

## Guia rápido para outra IA

Antes de propor alterações, leia os arquivos nesta ordem:

```text
README.md
→ BLUEPRINT.md
→ DECISIONS.md
→ STATUS.md
→ CHECKLIST.md
→ DECISIONS-OPEN.md
```

Considere `STATUS.md` como a fonte do estado técnico atual, `DECISIONS.md` como decisões já confirmadas e `DECISIONS-OPEN.md` como hipóteses ainda não resolvidas. Não trate ideias, alternativas ou pesquisas como funcionalidades implementadas.

### Regras de continuidade

1. O ambiente atual é exclusivamente Android + Termux.
2. O Whisper já funciona localmente; não substituir a transcrição sem necessidade.
3. A tradução offline ainda não foi validada no Termux. Não reinstalar Argos/CTranslate2 automaticamente.
4. Não iniciar integração com Kick, Supabase ou assinaturas antes de concluir o pipeline local.
5. Não versionar modelos, áudios, resultados, caches, tokens ou credenciais.
6. Antes de criar um novo script, verificar se a função já existe no wizard.
7. Para cada mudança, atualizar `STATUS.md`, `CHECKLIST.md` ou `DECISIONS-OPEN.md` quando o estado do projeto mudar.

## Uso rápido no Termux

Para preparar um novo dispositivo, instale o Termux e o Termux:API pela mesma origem. Depois copie `termux/install.sh` para a HOME do Termux e execute:

```bash
chmod +x ~/install_tradutor_termux.sh
~/install_tradutor_termux.sh
```

Para usar o wizard:

```bash
chmod +x ~/wizard_tradutor_termux.sh
~/wizard_tradutor_termux.sh
```

Se o comando `SSSystem` estiver configurado:

```bash
SSSystem
```

No menu, a sequência recomendada é:

```text
1. Ver status
2. Preparar/verificar Python
3. Preparar Whisper e modelo, se necessário
4. Gravar áudio real
5. Transcrever o último áudio
6. Tentar tradução somente se houver um motor compatível
```

O primeiro critério de sucesso é obter uma frase correta em português no terminal. Se a gravação gerar `moov atom not found`, o arquivo foi lido antes de ser finalizado; a captura deve usar `termux-microphone-record -q` antes da validação com `ffprobe`.

## Como continuar o trabalho

O próximo trabalho deve ser escolhido a partir do primeiro item pendente em `CHECKLIST.md`, não por uma expansão geral do escopo. No momento, a prioridade é testar uma alternativa de tradução offline no Android sem quebrar o pipeline de transcrição já validado. Registre o resultado em `STATUS.md` e mantenha alternativas não validadas em `DECISIONS-OPEN.md`.
