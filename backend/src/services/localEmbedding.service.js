import { pipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let extractorInstance = null;
let initPromise = null;

export class LocalEmbeddingService {
  /**
   * Initialize and cache the feature extraction pipeline instance.
   */
  static async getInstance() {
    if (extractorInstance) {
      return extractorInstance;
    }
    if (!initPromise) {
      console.log(`⏳ Loading local embedding model "${MODEL_NAME}" into memory...`);
      initPromise = pipeline('feature-extraction', MODEL_NAME, {
        quantized: true
      }).then(extractor => {
        extractorInstance = extractor;
        console.log(`✅ Local embedding model "${MODEL_NAME}" loaded successfully (384d).`);
        return extractorInstance;
      }).catch(err => {
        initPromise = null;
        console.error(`❌ Failed to load local embedding model "${MODEL_NAME}":`, err);
        throw err;
      });
    }
    return initPromise;
  }

  /**
   * Pre-warm model on startup so initial user request has 0 load latency.
   */
  static async warmUp() {
    try {
      await this.getInstance();
    } catch (err) {
      console.warn('Warm-up warning:', err.message);
    }
  }

  /**
   * Generate a 384-dimension vector embedding for a single text.
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} Vector embedding array (384 float numbers)
   */
  static async generateEmbedding(text) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Array(384).fill(0.0);
    }

    const extractor = await this.getInstance();
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true
    });

    return Array.from(output.data);
  }

  /**
   * Efficient batch embedding generation for array of text chunks.
   * @param {Array<string>} texts - Array of chunk texts
   * @returns {Promise<Array<Array<number>>>} Array of 384d vector embeddings
   */
  static async generateEmbeddingsBatch(texts) {
    if (!texts || texts.length === 0) return [];
    
    const results = [];
    for (const text of texts) {
      const vec = await this.generateEmbedding(text);
      results.push(vec);
    }
    return results;
  }
}
