_# Guia de Contribuição para o KRATOS v2

**Autor**: Manus AI (Agente DevOps & Arquiteto de Soluções)
**Data**: 14 de Fevereiro de 2026
**Versão**: 1.0

---

## 1. Introdução

Primeiramente, agradecemos seu interesse em contribuir para o **KRATOS v2**! Este projeto é uma plataforma de automação jurídica de ponta e toda contribuição, por menor que seja, é extremamente valiosa para nós. Este guia fornecerá tudo o que você precisa saber para começar.

## Código de Conduta

Este projeto e todos que participam dele são regidos pelo nosso [Código de Conduta](CODE_OF_CONDUCT.md). Ao participar, você concorda em seguir seus termos.

## Como Você Pode Contribuir

Existem várias maneiras de contribuir com o KRATOS v2:

-   **Relatando Bugs**: Se você encontrar um bug, por favor, abra uma issue detalhada em nosso repositório.
-   **Sugerindo Melhorias**: Tem uma ideia para uma nova funcionalidade ou uma melhoria em uma existente? Abra uma issue para que possamos discuti-la.
-   **Pull Requests**: Se você deseja contribuir com código, ficaremos felizes em revisar seu Pull Request (PR).

## Começando

O KRATOS v2 é um monorepo gerenciado com `pnpm workspaces` e `Turborepo`. Siga os passos abaixo para configurar seu ambiente de desenvolvimento.

### Pré-requisitos

-   Node.js (versão 22.13.0 ou superior)
-   pnpm (instalado globalmente: `npm install -g pnpm`)
-   Python (versão 3.11.0rc1 ou superior)
-   Docker e Docker Compose (para o banco de dados e outros serviços)

### Configuração do Ambiente

1.  **Clone o repositório**:

    ```bash
    gh repo clone KRATOS-v2
    cd KRATOS-v2
    ```

2.  **Instale as dependências**:

    ```bash
    pnpm install
    ```

3.  **Configure as variáveis de ambiente**:

    Copie o arquivo `.env.example` para `.env` na raiz do projeto e preencha as variáveis necessárias. Para o desenvolvimento local, você precisará de uma instância do PostgreSQL em execução.

    ```bash
    cp .env.example .env
    ```

4.  **Inicie os serviços de desenvolvimento**:

    Use o Turborepo para iniciar todos os serviços (API, frontend, workers) em modo de desenvolvimento.

    ```bash
    pnpm dev
    ```

## Fluxo de Desenvolvimento

### Branching

Utilizamos um fluxo de trabalho baseado em feature branches. Crie uma nova branch a partir da `main` para cada nova funcionalidade ou correção de bug:

```bash
# Para uma nova funcionalidade
git checkout -b feature/nome-da-funcionalidade

# Para uma correção de bug
git checkout -b fix/descricao-do-bug
```

### Submetendo um Pull Request

1.  **Faça o commit de suas alterações**: Use mensagens de commit claras e descritivas.
2.  **Execute os testes e o linter**: Antes de enviar, certifique-se de que todos os testes passam e que o código está formatado corretamente.

    ```bash
    pnpm lint
    pnpm test
    ```

3.  **Envie sua branch e abra um Pull Request**: Envie sua branch para o repositório remoto e abra um PR em relação à branch `main`.
4.  **Descreva seu PR**: Forneça uma descrição clara das alterações que você fez, incluindo o problema que está resolvendo e como você o resolveu. Se houver uma issue relacionada, vincule-a ao seu PR.
5.  **Revisão de Código**: Um dos mantenedores do projeto revisará seu PR. Esteja preparado para fazer alterações com base no feedback.

## Estilo de Código

-   **TypeScript/JavaScript**: Seguimos as regras definidas em nossos arquivos de configuração do ESLint e Prettier. O linter é executado automaticamente como um hook de pre-commit.
-   **Python**: Seguimos o guia de estilo PEP 8, com formatação aplicada pelo Black.

## Testes

O KRATOS v2 possui uma suíte de testes abrangente. Adicione testes para qualquer novo código que você escrever. Os testes são executados com o Jest para o frontend e a API, e com o Pytest para os workers Python.

Para executar todos os testes, use:

```bash
pnpm test
```

## Relatando Vulnerabilidades de Segurança

Se você descobrir uma vulnerabilidade de segurança, por favor, **não** abra uma issue pública. Envie um e-mail para a equipe de segurança em `security@kratos-project.com`. Nós levaremos o assunto a sério e investigaremos prontamente.

Obrigado por contribuir para o futuro da automação jurídica!
