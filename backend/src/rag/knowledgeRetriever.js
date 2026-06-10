const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, '..', '..', 'knowledge');
const filesToLoad = ['products.md', 'policies.md', 'faq.md', 'admin.md'];

let cachedChunks = null;

/**
 * Tokenize and normalize text for basic keyword overlap scoring.
 * Filters out common stopwords to avoid false-positive matches.
 * Replaces non-alphanumeric characters (including hyphens) with spaces to split compound words.
 */
function extractKeywords(text) {
  const stopwords = new Set([
    'the', 'and', 'for', 'you', 'with', 'about', 'how', 'what', 'can', 'are', 'your', 'this',
    'our', 'will', 'have', 'from', 'but', 'not', 'any', 'all', 'into', 'than', 'then', 'that'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // replace hyphens and other symbols with spaces to split words like low-stock
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopwords.has(w));
}

/**
 * Simple word stemmer to handle common suffixes (plural, continuous, tense, etc.).
 */
function stem(word) {
  return word
    .replace(/(ing|ments?|s|es|ed|ies|ly)$/, '')
    .trim();
}

/**
 * Checks if two words are semantically aligned based on prefix or stemmed match.
 */
function wordsMatch(w1, w2) {
  if (w1 === w2) return true;
  if (w1.startsWith(w2) || w2.startsWith(w1)) return true;
  
  const s1 = stem(w1);
  const s2 = stem(w2);
  if (s1 === s2) return true;
  if (s1.length > 2 && s2.length > 2 && (s1.startsWith(s2) || s2.startsWith(s1))) return true;
  
  return false;
}

/**
 * Loads and parses markdown files from backend/knowledge/ directory.
 * Caches the parsed sections into memory.
 */
function loadKnowledge() {
  if (cachedChunks) return cachedChunks;

  const chunks = [];

  for (const filename of filesToLoad) {
    const filePath = path.join(KNOWLEDGE_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Knowledge Retriever] File not found: ${filePath}`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract main title (H1)
      const h1Match = content.match(/^#\s+(.+)$/m);
      const docTitle = h1Match ? h1Match[1].trim() : filename;

      // Split by heading level 2 (##)
      const sections = content.split(/^##\s+/m);

      // Extract the introductory section before the first ## heading
      const intro = sections[0].replace(/^#\s+.+$/m, '').trim();
      if (intro) {
        chunks.push({
          source: filename,
          docTitle,
          title: 'Introduction & Overview',
          content: intro,
          keywords: extractKeywords(intro)
        });
      }

      // Process each section
      for (let i = 1; i < sections.length; i++) {
        const sec = sections[i].trim();
        if (!sec) continue;

        const lines = sec.split('\n');
        const sectionTitle = lines[0].trim();
        const sectionBody = lines.slice(1).join('\n').trim();

        if (sectionBody) {
          chunks.push({
            source: filename,
            docTitle,
            title: sectionTitle,
            content: `## ${sectionTitle}\n\n${sectionBody}`,
            keywords: extractKeywords(sectionTitle + ' ' + sectionBody)
          });
        }
      }
    } catch (err) {
      console.error(`[Knowledge Retriever] Error reading or parsing ${filename}:`, err);
    }
  }

  cachedChunks = chunks;
  console.log(`[Knowledge Retriever] Loaded ${chunks.length} sections from knowledge base files.`);
  return chunks;
}

/**
 * Retrieves the top relevant sections matching a query.
 * Uses a keyword overlap score with weightings for titles.
 * Evaluates matches using prefix and stem alignment rules.
 */
async function retrieveKnowledge(query, limit = 2) {
  if (!query || !query.trim()) return [];

  const chunks = loadKnowledge();
  const queryTokens = extractKeywords(query);

  if (queryTokens.length === 0) return [];

  const scored = chunks.map(chunk => {
    let score = 0;

    const titleTokens = extractKeywords(chunk.title);
    const docTitleTokens = extractKeywords(chunk.docTitle);

    for (const token of queryTokens) {
      // Direct match in section title gets highest weight
      if (titleTokens.some(t => wordsMatch(t, token))) {
        score += 5;
      }
      // Direct match in document title gets medium weight
      if (docTitleTokens.some(t => wordsMatch(t, token))) {
        score += 2;
      }
      // Matches in body content get standard weight
      if (chunk.keywords.some(t => wordsMatch(t, token))) {
        score += 1;
      }
    }

    return {
      source: chunk.source,
      docTitle: chunk.docTitle,
      title: chunk.title,
      content: chunk.content,
      score
    };
  });

  // Filter out chunks with zero score, sort by score descending
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  loadKnowledge,
  retrieveKnowledge,
  // Allow clearing cache if needed (e.g. for testing)
  clearCache: () => { cachedChunks = null; }
};
