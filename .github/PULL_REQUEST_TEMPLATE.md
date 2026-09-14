<!-- Template de PR: Validação manual para um dispositivo Termux -->
### Checklist manual para teste no Termux

- [ ] Instalar Termux e Termux:API pela mesma origem (manual no Android)
- [ ] Colar comando de bootstrap do README e executar
- [ ] Conceder permissão de microfone ao Termux
- [ ] Executar SSSystem e usar o wizard
  - [ ] Gravar áudio real ~8s com termux-microphone-record -l 0 e terminar com -q
  - [ ] Validar duração com ffprobe
  - [ ] Transcrever o último áudio e confirmar texto em português
- [ ] Registrar resultados no STATUS.md (duração, modelo, exemplo de transcrição)
- [ ] Realizar, se possível, ao menos um teste de tradução offline e anexar resultados (ou documentar inviabilidade)
- [ ] Atualizar CHECKLIST.md marcando itens completos

Observações:
- A CI do repositório apenas valida sintaxe de scripts, presença de arquivos e que não há arquivos grandes versionados. Testes de microfone e compilação do whisper.cpp devem ser executados no dispositivo Android real.
