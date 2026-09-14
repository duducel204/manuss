# Decisões confirmadas

- O processamento local é prioridade por privacidade, latência e custo.
- O ambiente atual de prototipagem é Android + Termux.
- A transcrição local validada utiliza whisper.cpp com modelo base.
- O Gboard não será dependência do produto; serve apenas como referência de velocidade.
- A Kick é a plataforma piloto futura, mas o envio real ainda não começou.
- O primeiro adaptador de entrega deverá ser um mock local.
- Não criar múltiplas contas de envio antes de validar API oficial, OAuth, limites e conformidade.
- O banco de dados deve guardar apenas conta, assinatura, configuração, autorização e status de integração.
- Áudio, transcrições e traduções não devem ser persistidos por padrão.
- A tradução offline no Termux permanece em aberto; Argos/CTranslate2 foi interrompido por incompatibilidade do ambiente.
- O wizard deve ser idempotente, verificar o estado e não repetir etapas já concluídas.
