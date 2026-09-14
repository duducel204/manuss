# Blueprint — Tradutor Local para Streaming

**Status:** protótipo Android/Termux validado parcialmente  
**Data de consolidação:** 2026-09-13  
**Plataforma atual:** Android + Termux  
**Plataforma futura prevista:** Windows e/ou aplicativo Android nativo  
**Plataforma piloto planejada:** Kick

## 1. Objetivo do projeto

Criar um sistema que capture o áudio selecionado do streamer, detecte fala, transcreva localmente, traduza localmente e posteriormente envie as mensagens traduzidas para o chat da plataforma de streaming.

O princípio central é **local-first**: áudio, transcrição e tradução devem ocorrer no dispositivo do streamer sempre que houver suporte técnico, privacidade e desempenho suficientes. O backend deve armazenar apenas informações necessárias para autenticação, assinatura, configuração e integração.

## 2. Estado atual comprovado

O seguinte pipeline foi validado no Android/Termux:

```text
Microfone real do Android
→ Termux:API
→ arquivo M4A
→ FFmpeg
→ WAV mono 16 kHz
→ whisper.cpp
→ transcrição local em português
```

O `whisper.cpp` foi compilado com sucesso no celular Motorola Moto G34 5G, usando CPU ARM/NEON. O modelo `base` foi instalado e uma gravação real foi transcrita corretamente.

O Termux:API precisa iniciar a gravação sem depender apenas do limite automático. O fluxo validado deve ser:

```text
termux-microphone-record -f arquivo -l 0
→ aguardar duração
→ termux-microphone-record -q
→ aguardar finalização do M4A
→ validar com ffprobe
```

## 3. Estrutura atual no celular

```text
~/tradutor-local/
├── audio/
├── bin/
│   └── whisper-cli -> ~/whisper.cpp/build/bin/whisper-cli
├── models/
│   └── ggml-base.bin -> ~/whisper.cpp/models/ggml-base.bin
├── results/
├── scripts/
│   ├── translate_test.py
│   ├── transcribe_file.sh
│   ├── diagnostico_transcricao.sh
│   ├── teste_completo_transcricao.sh
│   ├── teste_qualidade_audio.sh
│   ├── teste_transcricao_direto.sh
│   └── transcrever_ultimo_audio.sh
└── .venv/
```

Também existem na HOME do Termux:

```text
~/whisper.cpp/
~/wizard_tradutor_termux.sh
~/bin/SSSystem
~/install_tradutor_termux.sh
```

## 4. Wizard e comando de execução

O wizard principal é:

```text
~/wizard_tradutor_termux.sh
```

O comando pretendido para iniciá-lo é:

```bash
SSSystem
```

O wizard possui funções para:

1. verificar ambiente;
2. verificar pastas e arquivos;
3. verificar o ambiente Python;
4. preparar o Whisper e o modelo;
5. gravar áudio real pelo microfone;
6. transcrever o último áudio;
7. testar tradução local quando houver motor compatível;
8. exibir o status do projeto.

A gravação do wizard deve manter a validação com `ffprobe` e rejeitar arquivos menores que aproximadamente sete segundos em um teste configurado para oito segundos.

## 5. O que está funcionando

| Componente | Estado |
|---|---|
| Termux | Funcionando |
| Termux:API | Funcionando |
| Acesso ao microfone | Funcionando após fluxo explícito de início/parada |
| FFmpeg | Funcionando |
| FFprobe | Funcionando |
| Python 3.13 | Funcionando |
| Ambiente virtual | Funcionando |
| whisper.cpp | Compilado e funcionando |
| Modelo Whisper `base` | Instalado e funcionando |
| Transcrição local | Validada |
| Argos Translate importável | Parcial, mas não operacional |
| CTranslate2 no Termux | Indisponível |
| Tradução offline no Termux | Ainda não validada |
| Kick/API/chat | Ainda não iniciado |
| Supabase | Ainda não iniciado |

## 6. O que foi descartado ou separado

### Gboard

O Gboard não será utilizado como componente do produto. Ele serve apenas como referência de velocidade. Sua implementação interna e seus modelos não são uma biblioteca pública reutilizável pelo Termux.

### Argos Translate no Android atual

O Argos foi testado, mas a instalação tentou resolver dependências incompatíveis, incluindo PyQt5. O CTranslate2 não possui distribuição compatível com o Termux/Python atual. Não insistir em instalar Qt, PyQt5, spaCy ou Stanza no celular.

### Integração imediata com Kick

Foi adiada até que o pipeline local de áudio, transcrição e tradução esteja estável.

### Criação de múltiplas contas de envio

Não implementar neste estágio. Primeiro validar APIs oficiais, autorização, regras da Kick, limites e conformidade.

## 7. Alternativas de tradução discutidas

### Apertium

Motor offline baseado em regras. Existe o par inglês-português em:

```text
https://github.com/apertium/apertium-en-pt
```

É uma possibilidade leve, mas exige o motor Apertium/lttoolbox e sua qualidade é mais literal que a de modelos neurais.

### RTranslator

Aplicativo Android offline baseado em modelos locais, incluindo NLLB e alternativas mais recentes como Bergamot. Repositório:

```text
https://github.com/niedev/RTranslator
```

É uma referência relevante para tradução Android, mas não é uma biblioteca Python pronta para Termux. Os modelos são grandes e o projeto recomenda aparelho com pelo menos 6 GB de RAM.

### APIs nativas Android

`SpeechRecognizer` e ML Kit GenAI são opções Android nativas, mas se relacionam principalmente à transcrição e não são uma solução Python direta para o Termux. Devem ficar em uma linha experimental separada.

## 8. Arquitetura desejada

```text
Aplicativo do streamer
├── Seleção de entrada de áudio
├── Captura
├── VAD / detecção de silêncio
├── Segmentação de frases
├── Transcrição local
├── Tradução local por idioma contratado
├── Filtros, deduplicação e fila
└── Adaptador de entrega da plataforma

Backend
├── Conta do streamer
├── Assinatura
├── Configuração do canal
├── Idiomas contratados
├── Identidades de envio
├── OAuth/autorização
└── Status da integração
```

O áudio, a transcrição e a tradução não devem ser salvos no banco por padrão. Sessões temporárias devem permanecer em memória ou no ambiente local.

## 9. Kick como piloto futuro

A Kick é a plataforma piloto. Antes de qualquer envio real, levantar e validar:

- API oficial de chat;
- OAuth e escopos;
- autorização do canal;
- limites de mensagens;
- regras para automação;
- spam e mensagens repetitivas;
- uso comercial;
- contas ou identidades de envio;
- mecanismo de revogação;
- tratamento de rate limit;
- canal privado ou controlado para teste.

O primeiro adaptador deve ser um mock local. Depois, um adaptador oficial da Kick, sem automação de navegador, múltiplas contas artificiais ou contorno de limites.

## 10. Próxima sequência recomendada

### Fase A — Consolidar Android/Termux

- manter o wizard funcional;
- garantir que `SSSystem` inicia o wizard;
- registrar duração real das gravações;
- melhorar a detecção de silêncio;
- transcrever várias frases reais;
- medir latência, CPU, memória e bateria;
- testar áudio silencioso, ruído e música.

### Fase B — Testar uma única tradução offline

- testar Apertium somente se o motor estiver disponível sem compilação pesada;
- não reinstalar Argos/CTranslate2 no ambiente atual;
- avaliar o APK/RTranslator como experimento separado;
- comparar qualidade e latência de português → inglês;
- decidir entre portar um motor Android ou manter a tradução para uma etapa posterior.

### Fase C — Pipeline integrado local

```text
captura real
→ silêncio/VAD
→ Whisper
→ tradução
→ saída no terminal
```

O primeiro critério de sucesso é uma frase atravessar todo o pipeline sem envio para a Kick.

### Fase D — Manutenção do repositório GitHub

O repositório já foi criado. A estrutura desejada é:

```text
tradutor-local/
├── README.md
├── BLUEPRINT.md
├── DECISIONS.md
├── STATUS.md
├── CHECKLIST.md
├── TROUBLESHOOTING.md
├── DECISIONS-OPEN.md
├── LICENSE
├── termux/
│   ├── install.sh
│   ├── wizard.sh
│   ├── setup_command.sh
│   └── scripts/
├── android/
│   └── README.md
├── translation/
│   ├── apertium.md
│   └── rtranslator.md
├── platform/
│   └── kick.md
└── docs/
    └── experiments/
```

## 11. Como tornar o projeto continuável por outra IA

O repositório deve conter três camadas de informação:

### Decisões estáveis

Arquivo `DECISIONS.md` com decisões confirmadas, como:

- processamento local é prioridade;
- Android/Termux é o ambiente atual;
- Whisper.cpp está validado;
- Gboard não será dependência;
- Kick será o piloto futuro;
- não usar envio real antes de validar conformidade.

### Estado verificável

Arquivo `STATUS.md` com:

- o que funciona;
- o que falhou;
- comandos executados;
- versão do Android/Termux;
- modelo usado;
- erros conhecidos;
- próximo teste único.

### Hipóteses e alternativas

Arquivo `DECISIONS-OPEN.md` com:

- motor de tradução Android;
- Apertium versus RTranslator;
- VAD;
- aplicativo Android nativo;
- modelo de entrega;
- API Kick;
- identidades de envio.

A IA que continuar o projeto deve ler nesta ordem:

```text
README.md
→ BLUEPRINT.md
→ DECISIONS.md
→ STATUS.md
→ CHECKLIST.md
→ DECISIONS-OPEN.md
```

## 12. Onde o que foi construído está

### No ambiente atual do projeto

Os artefatos consolidados nesta sessão estão no sandbox em:

```text
/home/ubuntu/blueprint-tradutor-local.md
/home/ubuntu/wizard_tradutor_termux.sh
/home/ubuntu/install_tradutor_termux.sh
/home/ubuntu/configurar_alias_sssystem.sh
/home/ubuntu/configurar_comando_sssystem.sh
/home/ubuntu/reparar_termux_pacotes.sh
```

### No celular Android

Os artefatos efetivamente executados estão no armazenamento privado do Termux:

```text
/data/data/com.termux/files/home/tradutor-local/
/data/data/com.termux/files/home/whisper.cpp/
/data/data/com.termux/files/home/wizard_tradutor_termux.sh
/data/data/com.termux/files/home/bin/SSSystem
```

O conteúdo do Termux não está automaticamente em um GitHub. Para preservá-lo, será necessário exportar/copiar os arquivos para um repositório, revisar tokens e remover caches/modelos grandes.

## 13. Recomendação final

Sim, um repositório GitHub é o melhor próximo formato, mas não deve ser apenas um depósito de scripts. Ele deve separar:

1. documentação de contexto;
2. decisões confirmadas;
3. experimentos descartados;
4. scripts reproduzíveis;
5. estado atual;
6. checklist da próxima ação;
7. alternativas ainda não decididas.

O repositório deve começar como **documentação + protótipo Termux**, sem incluir ainda a integração Kick, assinaturas, múltiplas identidades ou uma arquitetura de produção.

O próximo marco objetivo é:

```text
um comando SSSystem
→ gravação real
→ transcrição local
→ tentativa isolada de tradução offline
→ resultado documentado
```
