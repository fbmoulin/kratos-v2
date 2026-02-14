# Guia de Deploy — KRATOS v2

**Autor**: Manus AI (Agente DevOps & Arquiteto de Soluções)
**Data**: 14 de Fevereiro de 2026
**Versão**: 1.0

---

## 1. Visão Geral da Estratégia de Deploy

O deploy do **KRATOS v2** é projetado para ser um processo automatizado, seguro e com zero downtime, utilizando plataformas de nuvem modernas (PaaS) e um pipeline de CI/CD robusto. A estratégia de deploy varia ligeiramente para cada componente do monorepo (frontend, backend, workers) para otimizar a performance, o custo e a experiência do desenvolvedor.

## 2. Plataformas de Deploy

-   **Frontend (`apps/web`)**: O deploy será feito na **Vercel**. A Vercel oferece uma integração perfeita com o Next.js (ou Vite/React), deploys atômicos, caching de CDN global e previews de deploy automáticos para cada pull request.

-   **Backend (`apps/api`)**: O deploy será feito no **Fly.io** ou **Railway**. Ambas as plataformas são excelentes para deploy de aplicações conteinerizadas, oferecendo escalabilidade automática, bancos de dados gerenciados e uma CLI poderosa.

-   **Workers (`workers/pdf-worker`)**: Os workers Celery também serão deployados no **Fly.io** ou **Railway**, como processos separados da API, permitindo que sejam escalados de forma independente com base na carga da fila de tarefas.

## 3. Pipeline de CI/CD com GitHub Actions

O coração da nossa estratégia de deploy é o pipeline de CI/CD automatizado com **GitHub Actions**. O pipeline é dividido em três workflows principais:

### Workflow 1: `ci.yml` (Integração Contínua)

-   **Gatilho**: A cada `push` em um pull request aberto para a branch `main`.
-   **Ações**:
    1.  **Checkout do Código**: Clona o repositório.
    2.  **Setup do Ambiente**: Instala Node.js, Python e pnpm.
    3.  **Instalação de Dependências**: Executa `pnpm install`.
    4.  **Lint e Formatação**: Executa `pnpm lint` para garantir a qualidade do código.
    5.  **Testes Unitários**: Executa `pnpm test` para rodar todos os testes unitários do monorepo.
    6.  **Build**: Executa `pnpm build` usando o Turborepo para garantir que todos os pacotes e aplicações possam ser compilados com sucesso.

### Workflow 2: `deploy-staging.yml` (Deploy para Staging)

-   **Gatilho**: A cada `push` para a branch `main`.
-   **Ações**:
    1.  **Executa o workflow de CI**: Garante que todos os testes e verificações passaram.
    2.  **Deploy do Frontend**: Utiliza a [Vercel CLI](https://vercel.com/docs/cli) para fazer o deploy da aplicação `web` para o ambiente de staging na Vercel.
    3.  **Deploy do Backend e Workers**: Utiliza a [Fly CLI](https://fly.io/docs/hands-on/launch-app/) para fazer o deploy dos serviços `api` e `pdf-worker` para o ambiente de staging no Fly.io.
    4.  **Testes de Integração**: (Opcional, mas recomendado) Executa uma suíte de testes de integração (ex: Playwright) contra o ambiente de staging para validar o fluxo completo.

### Workflow 3: `deploy-production.yml` (Deploy para Produção)

-   **Gatilho**: Manual, através da criação de uma `tag` no formato `vX.Y.Z` (ex: `v2.0.0`).
-   **Ações**:
    1.  **Aprovação Manual**: O workflow pode ser configurado para exigir uma aprovação manual de um mantenedor do projeto antes de prosseguir.
    2.  **Deploy do Frontend**: Promove o deploy de staging para produção na Vercel.
    3.  **Deploy do Backend e Workers**: Faz o deploy das imagens de container mais recentes para o ambiente de produção no Fly.io.
    4.  **Migrações de Banco de Dados**: Executa quaisquer migrações de banco de dados pendentes de forma segura.

## 4. Rollbacks

-   **Vercel**: A Vercel mantém um histórico de todos os deploys. Em caso de falha, é possível reverter para um deploy anterior com um único clique no dashboard da Vercel.
-   **Fly.io**: O Fly.io também permite reverter para uma versão anterior da aplicação facilmente através da sua CLI, utilizando o comando `fly deploy --image <imagem_anterior>`.

## 5. Monitoramento e Alertas

Após o deploy, o monitoramento contínuo é essencial para garantir a saúde da aplicação.

-   **Error Tracking**: Integração com o **Sentry** para capturar e alertar sobre erros no frontend e no backend em tempo real.
-   **Métricas de Performance**: Utilização do **Prometheus** para coletar métricas de performance da API e dos workers, e do **Grafana** para visualizar essas métricas em dashboards.
-   **Alertas**: Configuração de alertas no Grafana ou em uma ferramenta como o PagerDuty para notificar a equipe sobre anomalias, como um aumento na taxa de erros, alta latência ou consumo excessivo de CPU/memória.
