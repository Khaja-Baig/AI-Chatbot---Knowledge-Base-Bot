import chromaClient from '../config/chroma.js';

export class ChromaService {
  /**
   * Get or create a Chroma collection.
   * @param {string} name - Collection name
   * @returns {Promise<any>} Chroma collection instance
   */
  static async getOrCreateCollection(name) {
    try {
      return await chromaClient.getOrCreateCollection({ name });
    } catch (error) {
      console.error(`Error getting or creating Chroma collection "${name}":`, error);
      throw error;
    }
  }

  /**
   * Add documents to Chroma collection.
   * @param {string} collectionName - Collection name
   * @param {Array<{id: string, text: string, metadata: object, embedding: Array<number>}>} items - Documents list
   * @returns {Promise<boolean>}
   */
  static async addDocuments(collectionName, items) {
    if (!items || items.length === 0) return true;
    try {
      const collection = await this.getOrCreateCollection(collectionName);
      
      const ids = items.map(item => item.id);
      const documents = items.map(item => item.text);
      const metadatas = items.map(item => item.metadata || {});
      const embeddings = items.map(item => item.embedding);

      await collection.add({
        ids,
        documents,
        metadatas,
        embeddings
      });
      return true;
    } catch (error) {
      console.error(`Error adding documents to collection "${collectionName}":`, error);
      throw error;
    }
  }

  /**
   * Query the collection using vector embeddings.
   * @param {string} collectionName - Collection name
   * @param {Array<number>} queryEmbedding - Embedding array
   * @param {number} limit - Max results
   * @returns {Promise<Array<{id: string, text: string, metadata: object, distance: number}>>}
   */
  static async query(collectionName, queryEmbedding, limit = 5) {
    try {
      const collection = await this.getOrCreateCollection(collectionName);
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit
      });

      const formatted = [];
      if (results && results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          formatted.push({
            id: results.ids[0][i],
            text: results.documents[0][i],
            metadata: results.metadatas[0][i],
            distance: results.distances ? results.distances[0][i] : null
          });
        }
      }
      return formatted;
    } catch (error) {
      console.error(`Error querying collection "${collectionName}":`, error);
      throw error;
    }
  }

  /**
   * Delete a Chroma collection.
   * @param {string} name - Collection name
   * @returns {Promise<boolean>}
   */
  static async deleteCollection(name) {
    try {
      await chromaClient.deleteCollection({ name });
      return true;
    } catch (error) {
      console.warn(`Error deleting collection "${name}" or collection does not exist:`, error.message);
      return false;
    }
  }
}
