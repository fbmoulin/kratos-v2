# Política de Segurança — KRATOS v2

**Versão**: 1.0
**Data**: 14 de Fevereiro de 2026

---

## 1. Introdução

Este documento detalha a estratégia de segurança abrangente para o projeto **KRATOS v2**, uma plataforma de automação jurídica que lida com dados altamente sensíveis. A nossa abordagem de segurança é proativa e integrada em todas as fases do ciclo de vida do desenvolvimento de software (SDLC), desde a concepção da arquitetura até o deploy e a manutenção contínua. O nosso compromisso é garantir a **confidencialidade, integridade e disponibilidade** dos dados dos nossos clientes, em estrita conformidade com as regulamentações brasileiras.

## 2. Governança de Dados e Conformidade Regulatória

A base da nossa estratégia de segurança é a conformidade rigorosa com as leis e regulamentos aplicáveis.

### 2.1. Conformidade com a Lei Geral de Proteção de Dados (LGPD)

O KRATOS v2 é projetado com os princípios de *Privacy by Design* e *Privacy by Default*.

- **Consentimento Explícito**: Nenhum documento é processado sem o consentimento explícito do usuário, obtido no momento do upload.
- **Anonimização**: Dados pessoais identificáveis (PDI) são sistematicamente anonimizados ou pseudo-anonimizados nos logs da aplicação e nos rastros de análise da IA para proteger a privacidade.
- **Políticas de Retenção e Exclusão**: Implementamos políticas claras para a retenção de dados, permitindo que os usuários solicitem a exclusão completa de seus documentos e dados associados, em conformidade com os direitos dos titulares.

### 2.2. Conformidade com a Resolução 615/2025 do CNJ

Para atender aos requisitos de auditabilidade do Conselho Nacional de Justiça, o KRATOS v2 implementa um sistema de trilha de auditoria robusto e imutável.

- **Trilhas de Auditoria Imutáveis**: Todas as ações críticas realizadas na plataforma — como upload de documentos, alterações de status, e geração de minutas — são registradas na tabela `audit_logs`. Esta tabela é projetada para ser *append-only*, com triggers de banco de dados (PostgreSQL) que garantem a imutabilidade dos registros. Cada alteração em tabelas sensíveis (como `documents` e `analyses`) gera um novo registro de auditoria contendo o estado anterior (`payload_before`) e o estado posterior (`payload_after`) da entidade.
- **Rastreabilidade de Decisões de IA**: O *Chain-of-Thought* (CoT) de cada agente de IA é logado, permitindo uma auditoria completa do processo de tomada de decisão que levou à geração de uma minuta jurídica.

## 3. Segurança da Aplicação (Application Security)

Implementamos múltiplas camadas de segurança diretamente na aplicação para proteger contra ameaças comuns e específicas do domínio.

### 3.1. Autenticação e Autorização

- **Autenticação**: Utilizamos o serviço **Supabase Auth** para gerenciar a autenticação de usuários, aproveitando suas funcionalidades de segurança integradas, como proteção contra ataques de força bruta e gerenciamento de senhas seguras.
- **Autorização**: O acesso aos dados é estritamente controlado por políticas de segurança em nível de linha (Row-Level Security - RLS) no PostgreSQL, garantindo que um usuário só possa acessar os documentos e dados que lhe pertencem.

### 3.2. Validação de Entradas e Saídas

- **Validação Rigorosa**: Todas as entradas de API e os outputs gerados pelos agentes de IA são rigorosamente validados usando esquemas **Pydantic** (no backend Python) e **Zod** (no frontend TypeScript). Isso previne uma vasta gama de vulnerabilidades, incluindo injeção de dados e corrupção de estado.

### 3.3. Human-in-the-Loop (HITL)

- **Mitigação de Alucinações de IA**: Reconhecendo os riscos de ""alucinações"" em modelos de linguagem, a plataforma exige uma etapa de revisão humana **obrigatória** (Human-in-the-Loop) antes que qualquer minuta jurídica possa ser finalizada e exportada. Isso garante que um profissional qualificado valide a precisão e a adequação do documento gerado.

### 3.4. Segurança do Pipeline de IA

- **Versionamento de Prompts**: Todos os prompts utilizados para guiar os modelos de IA são versionados e armazenados no banco de dados (`prompt_versions`). Isso permite um controle de qualidade rigoroso e a capacidade de reverter para versões anteriores caso uma nova versão introduza comportamentos indesejados.
- **Roteamento Inteligente e Controle de Custos**: Utilizamos o **OpenRouter** para rotear tarefas para os modelos de IA mais apropriados, balanceando custo e performance. Implementamos *budget caps* e monitoramento de custos para prevenir o uso descontrolado de APIs.

## 4. Gerenciamento de Segredos (Secret Management)

O gerenciamento seguro de credenciais, chaves de API e outros segredos é fundamental para a segurança do sistema.

- **Estratégia para o MVP**: Na fase inicial, os segredos são gerenciados através das variáveis de ambiente nativas dos provedores de deploy (ex: Vercel Environment Variables, Fly.io Secrets), que oferecem um nível de segurança adequado para o início do projeto.
- **Estratégia Pós-MVP (Enterprise)**: Para a evolução do projeto, está planejada a migração para uma solução de gerenciamento de segredos dedicada e self-hosted, como o **Infisical**. Isso permitirá a implementação de rotação automática de segredos e o uso de *Machine Identities* para um controle de acesso mais granular e seguro.

## 5. Segurança da Infraestrutura

### 5.1. Segurança de Rede

- **Rate Limiting**: Implementamos políticas de limitação de taxa (rate limiting) por usuário e por endpoint de API. Esta medida é crucial para proteger a plataforma contra ataques de negação de serviço (DoS) e abuso de recursos.

### 5.2. Backup e Recuperação de Desastres

- **Backups Automatizados**: O banco de dados PostgreSQL, gerenciado pelo Supabase, possui uma política de backups diários automatizados.
- **Plano de Recuperação**: Um plano de recuperação de desastres (Disaster Recovery Plan) documentado define os objetivos de ponto de recuperação (RPO) e tempo de recuperação (RTO) para garantir a continuidade dos negócios em caso de falha catastrófica.

## 6. Ciclo de Vida de Desenvolvimento Seguro (Secure SDLC)

### 6.1. Análise de Riscos

Uma análise de riscos contínua é realizada para identificar e mitigar ameaças. Riscos como a não conformidade com a LGPD, alucinações de IA e custos de API descontrolados foram identificados e possuem planos de mitigação específicos, conforme detalhado no plano de execução do projeto.

### 6.2. CI/CD Seguro

Nosso pipeline de integração e entrega contínua (CI/CD) no **GitHub Actions** incorpora práticas de segurança:

- **Análise Estática de Código**: Ferramentas de linting (ESLint) e checagem de tipos (TypeScript) são executadas em cada pull request para garantir a qualidade e a segurança do código.
- **Testes Automatizados**: Testes unitários e de integração são obrigatórios e rodam automaticamente para validar a funcionalidade e a segurança de novas contribuições.
- **Deploy Controlado**: Deploys para o ambiente de produção exigem aprovação manual, garantindo uma camada final de revisão antes que as alterações entrem em vigor.

## 7. Reportando Vulnerabilidades

Encorajamos a comunicação responsável de vulnerabilidades. Se você identificar uma falha de segurança no KRATOS v2, por favor, entre em contato diretamente com a nossa equipe de segurança através do e-mail `security@kratosproject.dev` para que possamos investigar e remediar a situação prontamente.
