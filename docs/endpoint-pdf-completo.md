# Endpoint: PDF Completo da Consulta

## Descrição
Este endpoint gera um PDF único e completo contendo todas as informações relacionadas a uma consulta específica, incluindo:
- **Dados da Consulta**: informações gerais (data, horário, status, motivo, observações)
- **Dados do Paciente**: informações pessoais completas
- **Dados do Médico**: informações do médico responsável
- **Triagem(ns)**: todas as triagens realizadas com sinais vitais e medidas
- **Solicitações**: todos os exames, procedimentos e outras solicitações
- **Prescrições**: todas as prescrições médicas com medicamentos

## Rota
```
GET /appointments/:id/complete-pdf
```

## Autenticação
✅ Requer autenticação via JWT token

## Permissões
O usuário deve ser:
- **Master** ou **Admin**: acesso total
- **Médico**: apenas consultas onde é o médico responsável
- **Paciente**: apenas suas próprias consultas

## Parâmetros

### Path Parameters
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `id` | string (UUID) | Sim | ID da consulta |

## Resposta de Sucesso

### Status Code: `200 OK`

```json
{
  "message": "PDF gerado com sucesso",
  "data": {
    "pdf": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC...", // Base64 do PDF
    "filename": "consulta_completa_123e4567-e89b-12d3-a456-426614174000_1704539521234.pdf"
  }
}
```

### Campos da Resposta
- `pdf`: String em Base64 contendo o PDF completo
- `filename`: Nome sugerido para o arquivo ao fazer download

## Respostas de Erro

### 400 Bad Request
```json
{
  "error": "ID inválido",
  "message": "O ID fornecido não é válido"
}
```

### 403 Forbidden
```json
{
  "error": "Permissão negada",
  "message": "Você não possui permissão para acessar este relatório"
}
```

### 404 Not Found
```json
{
  "error": "Consulta não encontrada",
  "message": "A consulta especificada não existe no sistema"
}
```

### 500 Internal Server Error
```json
{
  "error": "Erro interno do servidor",
  "message": "Não foi possível gerar o PDF da consulta"
}
```

## Exemplos de Uso

### cURL
```bash
curl -X GET \
  'http://localhost:3000/appointments/123e4567-e89b-12d3-a456-426614174000/complete-pdf' \
  -H 'Authorization: Bearer seu_token_jwt'
```

### JavaScript (Fetch API)
```javascript
const appointmentId = '123e4567-e89b-12d3-a456-426614174000';

fetch(`http://localhost:3000/appointments/${appointmentId}/complete-pdf`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer seu_token_jwt'
  }
})
  .then(response => response.json())
  .then(data => {
    // Decodificar Base64 e criar blob
    const pdfBlob = base64ToBlob(data.data.pdf, 'application/pdf');
    
    // Criar URL para download
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.data.filename;
    a.click();
    
    // Limpar
    URL.revokeObjectURL(url);
  });

// Função auxiliar para converter Base64 em Blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
```

### Axios
```javascript
import axios from 'axios';

const appointmentId = '123e4567-e89b-12d3-a456-426614174000';

axios.get(`http://localhost:3000/appointments/${appointmentId}/complete-pdf`, {
  headers: {
    'Authorization': 'Bearer seu_token_jwt'
  }
})
  .then(response => {
    const { pdf, filename } = response.data.data;
    
    // Criar link de download
    const linkSource = `data:application/pdf;base64,${pdf}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = linkSource;
    downloadLink.download = filename;
    downloadLink.click();
  })
  .catch(error => {
    console.error('Erro ao gerar PDF:', error.response?.data || error);
  });
```

## Estrutura do PDF Gerado

O PDF é estruturado da seguinte forma:

### Página 1: Informações Gerais
1. **Cabeçalho**: "RELATÓRIO COMPLETO DA CONSULTA"
2. **Dados da Consulta**: data, horário, status, motivo
3. **Dados do Paciente**: nome, CPF, idade, sexo, telefone, email
4. **Dados do Médico**: nome, CRM, especialidade

### Páginas Seguintes (se houver): Triagens
Para cada triagem associada:
- Responsável pela triagem
- Sinais vitais (FC, FR, SpO₂, temperatura, PA, PAM, glicemia, etc.)
- Medidas (capnografia, peso, altura, perímetro cefálico)
- Data e hora da triagem

### Páginas Seguintes (se houver): Solicitações
Para cada solicitação:
- Tipo da solicitação (exame, consulta, cirurgia, etc.)
- Descrição detalhada
- Observações
- Data da solicitação

### Páginas Seguintes (se houver): Prescrições
Para cada prescrição:
- Lista de medicamentos com:
  - Nome
  - Dosagem
  - Frequência
  - Duração
  - Via de administração
  - Orientações específicas
- Orientações gerais
- Data da prescrição

## Auditoria

Toda geração de PDF é registrada no sistema de auditoria com os seguintes dados:
- **Ação**: `GENERATE_APPOINTMENT_COMPLETE_PDF`
- **Descrição**: ID da consulta
- **Conteúdo**: appointmentId, patientId, doctorId, data da consulta
- **IP e User-Agent** do requisitante

## Notas Técnicas

1. **Formato do PDF**: A4, margens de 50pt
2. **Encoding**: Base64
3. **Fonte**: Helvetica e Helvetica-Bold
4. **Numeração**: Todas as páginas são numeradas
5. **Performance**: O tempo de geração depende da quantidade de dados (triagens, solicitações, prescrições)

## Casos de Uso

1. **Impressão do prontuário completo** para arquivamento
2. **Compartilhamento** com outros profissionais de saúde
3. **Segunda via** para o paciente
4. **Documentação** para seguros ou planos de saúde
5. **Backup** físico de informações importantes
