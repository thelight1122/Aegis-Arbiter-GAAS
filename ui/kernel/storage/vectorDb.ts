/**
 * Simple mock for tiktoken encoding when the library is unavailable.
 */
const mockEncoder = {
    encode: (text: string): number[] => {
        // Simple fallback: character codes
        return Array.from(text).map(c => c.charCodeAt(0));
    }
};

/**
 * A simple in-memory vector database for demonstration purposes.
 * 
 * @class VectorDb
 */
class VectorDb {
    /**
     * Creates a vector from a given text.
     * 
     * @param {string} text - The text to be converted into a vector.
     * @returns {Promise<number[]>} - The vector representation of the text.
     */
    async createVector(text: string): Promise<number[]> {
        return mockEncoder.encode(text);
    }

    /**
     * Compares two vectors and returns a similarity score.
     * 
     * @param {number[]} vectorA - The first vector.
     * @param {number[]} vectorB - The second vector.
     * @returns {Promise<number>} - The similarity score.
     */
    async compareVectors(vectorA: number[], vectorB: number[]): Promise<number> {
        if (!vectorA.length || !vectorB.length) return 0;

        // Dot product of first N elements where N is min length
        const len = Math.min(vectorA.length, vectorB.length);
        let dotProduct = 0;
        let magA = 0;
        let magB = 0;

        for (let i = 0; i < len; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            magA += vectorA[i] * vectorA[i];
            magB += vectorB[i] * vectorB[i];
        }

        if (magA === 0 || magB === 0) return 0;
        return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
    }
}

let vectorDb: VectorDb;

/**
 * Returns a singleton instance of the VectorDb.
 * 
 * @returns {Promise<VectorDb>} - The VectorDb instance.
 */
export async function getVectorDb(): Promise<VectorDb> {
    if (!vectorDb) {
        vectorDb = new VectorDb();
    }
    return vectorDb;
}
