# Research - Documentação de Pesquisa

Esta pasta contém documentação de pesquisas técnicas realizadas durante o planejamento e desenvolvimento do KRATOS v2.

## Conteúdo

### RESEARCH_FINDINGS.md
Achados da pesquisa inicial sobre stack tecnológica, incluindo:
- Benchmarks de ferramentas de extração de PDF (Docling, Unstructured, LlamaParse)
- Comparação de plataformas de deploy (Fly.io, Railway, Render)
- Avaliação de TiDB vs PostgreSQL
- Análise de conformidade com Resolução 615/2025 CNJ

**Status**: ✅ Decisões incorporadas na arquitetura atual

## Uso

Estes documentos servem como:
1. **Histórico de decisões** - Por que escolhemos X em vez de Y?
2. **Benchmarks de referência** - Performance esperada de ferramentas
3. **Validação de arquitetura** - Evidências que suportam escolhas técnicas

## Adicionando Nova Pesquisa

Ao realizar pesquisas técnicas para o projeto:

1. Crie um novo arquivo `.md` nesta pasta
2. Use formato estruturado com seções claras
3. Inclua fontes e datas
4. Documente conclusões e decisões tomadas
5. Atualize este README

## Formato Sugerido

```markdown
# [Título da Pesquisa]

**Data**: [Data da pesquisa]
**Objetivo**: [O que você estava investigando]
**Autor**: [Quem conduziu a pesquisa]

## Contexto
[Por que essa pesquisa foi necessária]

## Achados
[O que você descobriu]

## Conclusões
[Decisões tomadas baseadas nos achados]

## Referências
- [Links, papers, benchmarks]
```

---

**Consulte também**: `docs/TECHNICAL_ANALYSIS.md` para análise crítica da arquitetura
