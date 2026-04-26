# Solicitações MedVision

Checklist criado a partir do arquivo `Medvision.txt`.

## Solicitações principais

- [x] Corrigir triagem, tornando obrigatórios os campos de pressão arterial, altura e peso.
  - Evidência: `CreateTriagemSchema` exige `pressaoArterialSistolica`, `pressaoArterialDiastolica`, `peso` e `altura`.
- [x] Adicionar campo de queixa principal e campo de duração.
  - Evidência: triagem possui `queixaPrincipal` e `duracaoQueixa`; anamnese possui `queixaPrincipal` e `hdaDuracao`.
- [ ] Alterar label do campo intensidade para "Intensidade da dor".
  - Observação: alteração de label parece ser responsabilidade do frontend.
- [x] Adicionar campo de texto chamado "Exames anteriores".
  - Evidência: triagem e anamnese possuem `examesAnteriores`.
- [x] Criar funcionalidade de anamnese de retorno com apenas campo de texto.
  - Evidência: anamnese possui `anamneseRetorno`.
- [x] Adicionar nas solicitações as opções "Atestado médico" e "Declaração de comparecimento".
  - Evidência: `RequestType` possui `medicalCertificate` e `attendanceDeclaration`; `GET /v1/requests/options` expõe as opções.
- [x] Adicionar opção para o médico encerrar a consulta também.
  - Evidência: médico pode atualizar consulta e o status `completed` encerra a sala Daily.
- [x] Exibir número de leito na tela de UTI para o médico.
  - Evidência: consultas listadas para médicos com `utiAccess` retornam leitos ocupados em `utiAccess`.
- [x] Adicionar novo status de UTI: "Leito em desinfecção".
  - Evidência: status `disinfecting` existe no schema Prisma e no schema da UTI.
- [x] Limitar a adição de novos leitos de UTI a usuários autorizados.
  - Evidência: controller da UTI valida permissão antes de criar leito.
- [x] Remover da chamada as opções de gravar e compartilhar tela.
  - Evidência: serviço Daily desativa `enable_recording` e `enable_screenshare`.
- [x] Usar socket para comunicação em tempo real.
  - Evidência: módulo `realtime` expõe WebSocket em `/v1/realtime?token=...` e publica eventos de consultas/solicitações.
- [x] Adicionar filtro de consultas por data, marcando os dias que o médico atende no módulo de médicos.
  - Evidência: médicos possuem `weeklyAvailability`; consultas aceitam filtros por data e validam disponibilidade.
- [x] Adicionar listagem de documentos dos pacientes na tela de chamada.
  - Evidência: listagem/criação de consulta retorna `patient.files` formatado com URLs assinadas.

## Solicitações adicionais

- [x] Adicionar módulo de acesso para o paciente acessar de casa com login simplificado.
  - Evidência: `POST /v1/auth/patient-signin` autentica paciente por CPF e data de nascimento.
- [x] Adicionar notificações via e-mail, WhatsApp e SMS.
  - Evidência: `POST /v1/notifications/send` processa canais `email`, `whatsapp` e `sms`; WhatsApp/SMS usam webhooks configuráveis.
