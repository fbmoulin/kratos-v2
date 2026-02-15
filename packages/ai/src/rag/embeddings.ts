import { OpenAIEmbeddings } from '@langchain/openai';

let _embeddings: OpenAIEmbeddings | null = null;

function getEmbeddings(): OpenAIEmbeddings {
  if (!_embeddings) {
    _embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
    });
  }
  return _embeddings;
}

export const embeddingsService = {
  /** Embed a single text into a 1536-dimensional vector. */
  async embedText(text: string): Promise<number[]> {
    return getEmbeddings().embedQuery(text);
  },

  /** Embed multiple texts into an array of 1536-dimensional vectors. */
  async embedBatch(texts: string[]): Promise<number[][]> {
    return getEmbeddings().embedDocuments(texts);
  },
};

/** Embed a single text into a 1536-dimensional vector. */
export const embedText = embeddingsService.embedText.bind(embeddingsService);

/** Embed multiple texts into an array of 1536-dimensional vectors. */
export const embedBatch = embeddingsService.embedBatch.bind(embeddingsService);
