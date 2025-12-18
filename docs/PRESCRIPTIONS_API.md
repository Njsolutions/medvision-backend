# API de Prescrições Médicas

## Endpoints Disponíveis

### Base URL
```
/v1/prescriptions
```

## 1. Criar Prescrição

**POST** `/v1/prescriptions`

### Request Body
```json
{
  "patientId": "8b802097-7cf8-4037-b002-3ff1d13b0a76",
  "doctorId": "a4cbd3b5-e610-4c4a-812a-cff0a00e411c",
  "appointmentId": "6e66d9ac-a2c2-48a1-952e-e19393002cbd",
  "medicamentos": [
    {
      "nome": "Dipirona",
      "dosagem": "500mg",
      "frequencia": "8 em 8 horas",
      "duracao": "7 dias",
      "via": "oral",
      "orientacoes": "Tomar após as refeições"
    },
    {
      "nome": "Amoxicilina",
      "dosagem": "875mg",
      "frequencia": "12 em 12 horas",
      "duracao": "10 dias",
      "via": "oral",
      "orientacoes": "Não interromper o tratamento"
    }
  ],
  "orientacoesGerais": "Retornar ao médico caso os sintomas persistam"
}
```

### Response (201)
```json
{
  "statusCode": 201,
  "message": "Prescrição criada com sucesso",
  "data": {
    "id": "uuid-da-prescricao",
    "patientId": "8b802097-7cf8-4037-b002-3ff1d13b0a76",
    "doctorId": "a4cbd3b5-e610-4c4a-812a-cff0a00e411c",
    "appointmentId": "6e66d9ac-a2c2-48a1-952e-e19393002cbd",
    "orientacoesGerais": "Retornar ao médico caso os sintomas persistam",
    "medicamentos": [
      {
        "id": "uuid-medicamento-1",
        "prescriptionId": "uuid-da-prescricao",
        "nome": "Dipirona",
        "dosagem": "500mg",
        "frequencia": "8 em 8 horas",
        "duracao": "7 dias",
        "via": "oral",
        "orientacoes": "Tomar após as refeições",
        "createdAt": "2025-12-18T19:33:07.000Z",
        "updatedAt": "2025-12-18T19:33:07.000Z"
      }
    ],
    "patient": {
      "id": "...",
      "user": {
        "id": "...",
        "name": "Nome do Paciente",
        "email": "paciente@email.com",
        "cpf": "12345678900"
      }
    },
    "doctor": {
      "id": "...",
      "user": {
        "id": "...",
        "name": "Dr. Nome",
        "email": "doctor@email.com",
        "cpf": "98765432100"
      }
    },
    "appointment": { ... },
    "createdAt": "2025-12-18T19:33:07.000Z",
    "updatedAt": "2025-12-18T19:33:07.000Z"
  }
}
```

## 2. Listar Prescrições

**GET** `/v1/prescriptions`

### Query Parameters
- `patientId` (optional): UUID do paciente
- `doctorId` (optional): UUID do médico
- `appointmentId` (optional): UUID do agendamento
- `page` (optional): Número da página (default: 1)
- `limit` (optional): Itens por página (default: 10, max: 100)

### Exemplo
```
GET /v1/prescriptions?patientId=8b802097-7cf8-4037-b002-3ff1d13b0a76&page=1&limit=10
```

### Response (200)
```json
{
  "statusCode": 200,
  "message": "Prescrições listadas com sucesso",
  "data": [
    {
      "id": "uuid-da-prescricao",
      "patientId": "...",
      "doctorId": "...",
      "appointmentId": "...",
      "orientacoesGerais": "...",
      "medicamentos": [...],
      "patient": {...},
      "doctor": {...},
      "appointment": {...},
      "createdAt": "2025-12-18T19:33:07.000Z",
      "updatedAt": "2025-12-18T19:33:07.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

## 3. Buscar Prescrição por ID

**GET** `/v1/prescriptions/:id`

### Response (200)
```json
{
  "statusCode": 200,
  "message": "Prescrição encontrada",
  "data": {
    "id": "uuid-da-prescricao",
    "patientId": "...",
    "doctorId": "...",
    "appointmentId": "...",
    "orientacoesGerais": "...",
    "medicamentos": [...],
    "patient": {...},
    "doctor": {...},
    "appointment": {...},
    "createdAt": "2025-12-18T19:33:07.000Z",
    "updatedAt": "2025-12-18T19:33:07.000Z"
  }
}
```

## 4. Atualizar Prescrição

**PATCH** `/v1/prescriptions/:id`

### Request Body
```json
{
  "orientacoesGerais": "Novas orientações gerais",
  "medicamentos": [
    {
      "nome": "Novo Medicamento",
      "dosagem": "100mg",
      "frequencia": "1x ao dia",
      "duracao": "5 dias",
      "via": "oral",
      "orientacoes": "Em jejum"
    }
  ]
}
```

**Nota:** Ao atualizar medicamentos, todos os medicamentos antigos serão substituídos pelos novos.

### Response (200)
```json
{
  "statusCode": 200,
  "message": "Prescrição atualizada com sucesso",
  "data": { ... }
}
```

## 5. Remover Prescrição

**DELETE** `/v1/prescriptions/:id`

### Response (200)
```json
{
  "statusCode": 200,
  "message": "Prescrição removida com sucesso"
}
```

## Autenticação

Todas as rotas requerem autenticação via JWT. Inclua o token no header:

```
Authorization: Bearer <seu-token-jwt>
```

## Códigos de Erro

- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: Não autenticado
- `404 Not Found`: Recurso não encontrado
- `500 Internal Server Error`: Erro no servidor

## Validações

### Medicamento
- `nome`: obrigatório, string não vazia
- `dosagem`: obrigatório, string não vazia
- `frequencia`: obrigatório, string não vazia
- `duracao`: obrigatório, string não vazia
- `via`: obrigatório, string não vazia
- `orientacoes`: opcional, string

### Prescrição
- `patientId`: obrigatório, UUID válido
- `doctorId`: obrigatório, UUID válido
- `appointmentId`: opcional, UUID válido
- `medicamentos`: obrigatório, array com pelo menos 1 medicamento
- `orientacoesGerais`: opcional, string

## Logs de Auditoria

Todas as operações de prescrições são registradas no sistema de auditoria:
- Criação: `PRESCRIPTION_CREATE` (impacto: HIGH)
- Atualização: `PRESCRIPTION_UPDATE` (impacto: HIGH)
- Remoção: `PRESCRIPTION_DELETE` (impacto: CRITICAL)
- Visualização: `PRESCRIPTION_VIEW` (impacto: LOW)
