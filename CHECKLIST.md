# Checklist de continuidade

- [ ] Confirmar que `SSSystem` inicia o wizard.
- [ ] Executar gravação real de oito segundos.
- [ ] Confirmar duração com ffprobe.
- [ ] Transcrever três frases reais em português.
- [ ] Testar silêncio, ruído e música.
- [ ] Medir latência e consumo do modelo base.
- [ ] Integrar detecção de silêncio sem enviar segmentos vazios.
- [ ] Testar Apertium apenas se o motor estiver disponível sem compilação pesada.
- [ ] Avaliar RTranslator como experimento Android separado.
- [ ] Criar mock local de entrega.
- [ ] Só depois iniciar levantamento técnico da API oficial da Kick.
- [ ] Testar `llama.cpp` isoladamente no Termux com um GGUF pequeno, antes de escrever integração de produto.
- [ ] Registrar o resultado do teste de `llama.cpp` em `STATUS.md`, incluindo sucesso ou erro completo.
- [ ] Só após aprovação do motor: implementar glossário com variações explícitas e função isolada `traduzir(texto) -> texto`.
- [ ] Só após validar a função isolada: adicionar uma opção independente ao `wizard.sh`.
