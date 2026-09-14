# Decisões em aberto

## Tradução offline

Comparar, sem assumir implementação:

- Apertium e o par inglês-português: https://github.com/apertium/apertium-en-pt
- RTranslator e seus motores Android: https://github.com/niedev/RTranslator
- Outro runtime Android local compatível com o aparelho.

Critérios: português → inglês, latência, RAM, qualidade, licença, tamanho do modelo e integração com o texto produzido pelo Whisper.

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
