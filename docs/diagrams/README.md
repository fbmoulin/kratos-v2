# Diagramas do KRATOS v2

Este diretório contém os diagramas de arquitetura e fluxo do projeto KRATOS v2, renderizados a partir de arquivos Mermaid (`.mmd`).

## Diagramas Disponíveis

| Diagrama | Arquivo Fonte | Imagem Renderizada | Descrição |
| :--- | :--- | :--- | :--- |
| Arquitetura Geral | `architecture.mmd` | `architecture.png` | Visão geral das 4 camadas da arquitetura do sistema. |
| Pipeline de PDF | `pdf_pipeline.mmd` | `pdf_pipeline.png` | Fluxo completo do processamento assíncrono de documentos PDF. |
| Fluxo de Agentes de IA | `ai_agents_flow.mmd` | `ai_agents_flow.png` | Grafo de decisão dos agentes LangGraph com roteamento de modelos. |
| Modelo de Dados (ER) | `database_schema.mmd` | `database_schema.png` | Diagrama entidade-relacionamento do schema PostgreSQL. |
| Pipeline de CI/CD | `cicd_pipeline.mmd` | `cicd_pipeline.png` | Fluxo completo de integração e entrega contínua com GitHub Actions. |

## Como Atualizar

Para regenerar os diagramas após editar os arquivos `.mmd`, execute:

```bash
manus-render-diagram <arquivo.mmd> <arquivo.png>
```
