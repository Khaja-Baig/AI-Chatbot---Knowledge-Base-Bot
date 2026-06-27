import fs from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export class DocumentService {
  /**
   * Parse a PDF file and extract its text content.
   * @param {string} filePath - Absolute path to the PDF file
   * @returns {Promise<string>} Extracted text
   */
  static async parsePdf(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error(`Error parsing PDF at ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Parse a DOCX file and extract its text content.
   * @param {string} filePath - Absolute path to the DOCX file
   * @returns {Promise<string>} Extracted text
   */
  static async parseDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error(`Error parsing DOCX at ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Chunk text into smaller segments with overlap, preferring sentence boundaries.
   * @param {string} text - Raw text content
   * @param {number} chunkSize - Max characters per chunk
   * @param {number} chunkOverlap - Overlap size
   * @returns {Array<string>} List of text chunks
   */
  static chunkText(text, chunkSize = 800, chunkOverlap = 150) {
    if (!text) return [];
    
    // Normalize extra whitespace and line endings for cleaner embedding text
    const cleanedText = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
    
    const chunks = [];
    let start = 0;
    
    while (start < cleanedText.length) {
      let end = start + chunkSize;
      if (end >= cleanedText.length) {
        chunks.push(cleanedText.substring(start).trim());
        break;
      }
      
      // Try to break at a sentence boundary within the overlap window
      let breakPoint = end;
      const windowStart = Math.max(start, end - chunkOverlap);
      const window = cleanedText.substring(windowStart, end + 50); // look slightly ahead too
      
      const sentenceBoundaries = [...window.matchAll(/[.!?]\s/g)];
      if (sentenceBoundaries.length > 0) {
        // Find boundary closest to our target end position (which is at index 'end - windowStart' in window)
        const targetInWindow = end - windowStart;
        let closestMatch = sentenceBoundaries[0];
        let minDiff = Math.abs(closestMatch.index + 1 - targetInWindow);
        
        for (const match of sentenceBoundaries) {
          const diff = Math.abs(match.index + 1 - targetInWindow);
          if (diff < minDiff) {
            minDiff = diff;
            closestMatch = match;
          }
        }
        
        breakPoint = windowStart + closestMatch.index + 1;
      } else {
        // Fallback: Break at space
        const lastSpace = cleanedText.lastIndexOf(' ', end);
        if (lastSpace > windowStart) {
          breakPoint = lastSpace + 1;
        }
      }
      
      const chunk = cleanedText.substring(start, breakPoint).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      start = breakPoint - chunkOverlap;
      if (start >= breakPoint) {
        start = breakPoint; // Safeguard against infinite loops
      }
    }
    
    return chunks;
  }
}
