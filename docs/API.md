_# KRATOS v2 — Documentação da API

**Autor**: Manus AI (Agente DevOps & Arquiteto de Soluções)
**Data**: 14 de Fevereiro de 2026
**Versão**: 1.0

---

## 1. Introdução

Esta documentação descreve a API RESTful para o sistema **KRATOS v2**, uma plataforma de automação jurídica projetada para processar documentos judiciais e gerar minutas estruturadas. A API é o principal ponto de interação para clientes, como a aplicação web (frontend), e permite o gerenciamento completo do ciclo de vida dos documentos.

Todas as requisições e respostas da API utilizam o formato **JSON**. A URL base para todos os endpoints é `https://api.kratos.leg.br/v2`.

## 2. Autenticação

A API KRATOS v2 utiliza autenticação baseada em **JSON Web Tokens (JWT)**, gerenciada pelo Supabase Auth. Para interagir com os endpoints protegidos, o cliente deve primeiro obter um token de acesso e incluí-lo no cabeçalho `Authorization` de cada requisição subsequente.

**Formato do Cabeçalho:**
```
Authorization: Bearer <seu_jwt_token>
```

## 3. Estrutura de Dados (Schemas)

A seguir estão os principais objetos de dados manipulados pela API.

### Objeto `Document`

Representa um documento judicial enviado para processamento.

```json
{
  "id": "doc_c7a8b9d0e1f2",
  "userId": "user_a1b2c3d4e5",
  "fileName": "peticao_inicial.pdf",
  "fileSize": 2048000,
  "status": "completed",
  "pages": 25,
  "createdAt": "2026-02-14T10:00:00Z",
  "updatedAt": "2026-02-14T10:05:00Z"
}
```

### Objeto `Analysis`

Representa o resultado da análise de um documento por um agente de IA.

```json
{
  "id": "analysis_f3g4h5i6j7",
  "documentId": "doc_c7a8b9d0e1f2",
  "agentChain": "Supervisor -> Roteador -> Agente Cível -> Gerador de Minuta",
  "reasoningTrace": "O documento foi classificado como de alta complexidade...",
  "resultJson": {
    "firac": {
      "facts": "...",
      "issue": "...",
      "rule": "...",
      "analysis": "...",
      "conclusion": "..."
    }
  },
  "modelUsed": "Claude Opus 4",
  "createdAt": "2026-02-14T10:04:00Z"
}
```

## 4. Endpoints da API

### 4.1. Documentos

#### `POST /documents`

**Descrição**: Inicia o processamento de um novo documento judicial. O cliente deve enviar o arquivo PDF como `multipart/form-data`. A API responderá imediatamente com os metadados do documento e o status `pending`, enquanto o processamento pesado é enfileirado para execução assíncrona.

**Corpo da Requisição**: `multipart/form-data` com um campo `file` contendo o PDF.

**Resposta de Sucesso (202)**:
```json
{
  "id": "doc_c7a8b9d0e1f2",
  "status": "pending",
  "message": "Document received and queued for processing."
}
```

#### `GET /documents`

**Descrição**: Retorna uma lista paginada de todos os documentos enviados pelo usuário autenticado.

**Parâmetros de Query**:
- `page` (opcional, número, padrão: 1): O número da página a ser retornada.
- `limit` (opcional, número, padrão: 10): O número de documentos por página.

**Resposta de Sucesso (200)**:
```json
{
  "data": [
    // Array de objetos Document
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50
  }
}
```

#### `GET /documents/{id}`

**Descrição**: Retorna os detalhes de um documento específico, incluindo seu status atual.

**Parâmetros de URL**:
- `id` (string, obrigatório): O ID do documento.

**Resposta de Sucesso (200)**: Retorna um objeto `Document`.

### 4.2. Análises

#### `GET /documents/{documentId}/analysis`

**Descrição**: Retorna o resultado da análise de IA para um documento que já foi processado (`status: "completed"`).

**Parâmetros de URL**:
- `documentId` (string, obrigatório): O ID do documento.

**Resposta de Sucesso (200)**: Retorna um objeto `Analysis`.

#### `POST /analysis/{id}/review`

**Descrição**: Submete o resultado de uma revisão humana (HITL) para uma análise de IA. Esta ação é final e permite a exportação do documento.

**Parâmetros de URL**:
- `id` (string, obrigatório): O ID da análise.

**Corpo da Requisição**:
```json
{
  "action": "approved", // ou "rejected", "revised"
  "comments": "A análise está correta, mas ajuste a conclusão para incluir o precedente X.",
  "revisedContent": { ... } // Opcional, se a ação for "revised"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "message": "Review submitted successfully."
}
```

### 4.3. Exportação

#### `GET /analysis/{id}/export`

**Descrição**: Gera e baixa a minuta jurídica final em formato `.docx`, mas somente após a análise ter sido aprovada através do endpoint de revisão.

**Parâmetros de URL**:
- `id` (string, obrigatório): O ID da análise aprovada.

**Resposta de Sucesso (200)**: Retorna o arquivo `.docx` para download.

## 5. Códigos de Status HTTP

A API utiliza os seguintes códigos de status HTTP:

- **200 OK**: A requisição foi bem-sucedida.
- **201 Created**: O recurso foi criado com sucesso (não utilizado nesta versão da API).
- **202 Accepted**: A requisição foi aceita para processamento, mas a conclusão ainda não está disponível.
- **400 Bad Request**: A requisição é inválida (ex: JSON malformado, parâmetros ausentes).
- **401 Unauthorized**: O token de autenticação é inválido ou está ausente.
- **403 Forbidden**: O usuário não tem permissão para acessar o recurso.
- **404 Not Found**: O recurso solicitado não foi encontrado.
- **500 Internal Server Error**: Ocorreu um erro inesperado no servidor.
