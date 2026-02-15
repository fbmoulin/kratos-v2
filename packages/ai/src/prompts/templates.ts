/**
 * Prompt templates for the LangGraph agent pipeline.
 *
 * - Router: classifies LegalMatter + DecisionType from extracted text
 * - Specialist: generates FIRAC analysis with optional RAG context
 */

/**
 * Build the router classification prompt.
 *
 * Instructs the model to output a JSON object with:
 * legalMatter, decisionType, complexity (0-100), confidence (0-1), reasoning.
 */
export function buildRouterPrompt(text: string): string {
  return `Voce e um classificador de documentos juridicos brasileiros.

Analise o texto extraido abaixo e classifique-o retornando APENAS um objeto JSON valido.

Campos obrigatorios:
- "legalMatter": uma das opcoes ["civil", "criminal", "labor", "tax"]
- "decisionType": uma das opcoes ["liminar", "sentenca", "despacho", "acordao"]
- "complexity": numero inteiro de 0 a 100 indicando a complexidade do caso
- "confidence": numero de 0 a 1 indicando sua confianca na classificacao
- "reasoning": breve justificativa da classificacao (1-2 frases)

<texto_extraido>
${text}
</texto_extraido>

Responda APENAS com o objeto JSON, sem texto adicional.`;
}

export interface SpecialistPromptInput {
  text: string;
  legalMatter: string;
  decisionType: string;
  ragContext?: string;
}

/**
 * Build the specialist FIRAC analysis prompt.
 *
 * Generates a structured legal analysis following the FIRAC framework:
 * FATOS, QUESTAO (Issue), REGRA (Rule), ANALISE (Application), CONCLUSAO (Conclusion).
 */
export function buildSpecialistPrompt(input: SpecialistPromptInput): string {
  const ragSection = input.ragContext
    ? `\n<contexto_legal>\n${input.ragContext}\n</contexto_legal>\n`
    : '';

  return `Voce e um especialista em analise juridica brasileira.

Materia: ${input.legalMatter}
Tipo de decisao: ${input.decisionType}
${ragSection}
Analise o texto extraido abaixo utilizando o framework FIRAC e retorne APENAS um objeto JSON valido.

Estrutura FIRAC obrigatoria:
- "facts" (FATOS): resumo objetivo dos fatos relevantes
- "issue" (QUESTAO): questao juridica central a ser decidida
- "rule" (REGRA): normas, leis, sumulas e precedentes aplicaveis
- "analysis" (ANALISE): aplicacao das regras aos fatos, com fundamentacao
- "conclusion" (CONCLUSAO): resultado logico da analise
- "confidence": numero de 0 a 1 indicando confianca na analise
- "reasoning_trace": breve descricao do raciocinio utilizado

<texto_extraido>
${input.text}
</texto_extraido>

Responda APENAS com o objeto JSON, sem texto adicional.`;
}
