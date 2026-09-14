# Decisões em aberto

## Tradução offline

Comparar, sem assumir implementação:

- **Experimento prioritário:** testar `llama.cpp` no Termux com um modelo GGUF pequeno de tradução, diretamente em um dispositivo Android real e sem integração com o wizard.
- Apertium e o par inglês-português: https://github.com/apertium/apertium-en-pt
- RTranslator e seus motores Android: https://github.com/niedev/RTranslator
- Outro runtime Android local compatível com o aparelho.

Critérios: compilação no Termux, carregamento sem OOM/crash, português → inglês, latência, RAM, qualidade mínima, licença, tamanho do modelo e integração posterior com o texto produzido pelo Whisper. O experimento deve testar primeiro uma frase fixa, sem simultaneidade com o Whisper; a coexistência será uma etapa posterior.

### Ordem de implementação após aprovação do motor

1. Registrar o resultado real do experimento em `STATUS.md`, incluindo aparelho, Android, Termux, arquitetura, RAM, threads, contexto, comando completo, versão do `llama.cpp`, modelo/quantização/tamanho, idioma, saída, latência, memória e erro completo quando houver.
2. Implementar o glossário como camada independente, usando variações explícitas por termo no JSON, sem stemming ou lematização neste estágio.
3. Expor uma função isolada `traduzir(texto) -> texto`, chamável do terminal e testável sem microfone, Whisper ou wizard.
4. Só então adicionar uma opção de menu no `termux/wizard.sh`, preservando as opções de captura e transcrição já validadas.

Se `llama.cpp` falhar por compatibilidade, memória, latência ou qualidade mínima, interromper essa linha e avaliar Apertium como experimento separado. Nenhuma alternativa deve ser declarada integrada antes de um teste reproduzível.

## Arquitetura Android

Decidir se a versão móvel seguirá como:

- Termux + scripts;
- aplicativo Android nativo;
- aplicativo Android que incorpora um motor de tradução local;
- combinação entre Termux e um serviço Android auxiliar.

## Plataforma piloto

Antes de Kick:

- validar API oficial e OAuth;
- verificar escopos e limites;
- confirmar regras contra spam e automação;
- testar em canal controlado;
- implementar fila, rate limit, kill switch e revogação.

## Produto futuro

- seleção de entrada de áudio;
- VAD contínuo;
- múltiplos idiomas contratados;
- identidade de envio por idioma;
- assinatura;
- Supabase mínimo;
- distribuição para Windows.
