const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const { RunnableSequence, RunnableLambda } = require('@langchain/core/runnables');
const path = require('path');
const { Op } = require('sequelize');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isOpenAIValid = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('...');
const isPineconeValid = process.env.PINECONE_API_KEY && !process.env.PINECONE_API_KEY.includes('...');
const isSandboxMode = !isOpenAIValid || !isPineconeValid;

if (isSandboxMode) {
  console.warn('[AI Service] Credentials missing or placeholders detected. Activating AI Sandbox Mode.');
} else {
  console.log('[AI Service] Initializing production OpenAI and Pinecone integrations.');
}

const pc = isSandboxMode ? null : new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = isSandboxMode ? null : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const indexName = 'gentwear-products';
let pineconeIndex = null;

// Sandbox Mode local vector cache
const localVectorCache = new Map(); // productId -> { id, vector, metadata }

// 1. Get Embedding (Real or Mock)
async function getEmbedding(text) {
  if (isSandboxMode) {
    // Generate a deterministic unit vector based on a string hash
    let hash = 0;
    const cleanText = text.trim().toLowerCase();
    for (let i = 0; i < cleanText.length; i++) {
      hash = (hash << 5) - hash + cleanText.charCodeAt(i);
      hash |= 0;
    }
    
    let seed = Math.abs(hash) || 1;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const vector = [];
    let norm = 0;
    for (let i = 0; i < 1536; i++) {
      const val = lcg() * 2 - 1;
      vector.push(val);
      norm += val * val;
    }
    
    const normSqrt = Math.sqrt(norm);
    return vector.map(v => v / normSqrt);
  }

  // Real OpenAI call
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('[AI Service] OpenAI embedding generation error:', err);
    throw err;
  }
}

// 2. Initialize Pinecone Index if in real mode
async function initPineconeIndex() {
  if (isSandboxMode) return;
  try {
    const list = await pc.listIndexes();
    const hasIndex = list.indexes?.some(idx => idx.name === indexName);
    if (!hasIndex) {
      console.log(`[AI Service] Creating Pinecone index: ${indexName}...`);
      await pc.createIndex({
        name: indexName,
        dimension: 1536,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      console.log('[AI Service] Pinecone index created successfully.');
    }
    pineconeIndex = pc.index(indexName);
  } catch (err) {
    console.error('[AI Service] Pinecone connection/creation failed:', err.message);
  }
}

// 3. Format product text for embedding
function formatProductText(product) {
  const categoryName = product.category?.name || 'Menswear';
  const sizeList = product.variants?.map(v => v.size).filter(Boolean).join(', ') || 'N/A';
  const colorList = product.variants?.map(v => v.color).filter(Boolean).join(', ') || 'N/A';
  
  return `Category: ${categoryName}. Title: ${product.name}. Description: ${product.description || ''}. Price: $${product.price}. Variants: Sizes [${sizeList}], Colors [${colorList}].`;
}

// 4. Vector Search (Real or Cosine Similarity fallback)
async function vectorSearch(vector, limit = 5) {
  if (isSandboxMode) {
    const results = [];
    for (const [productId, item] of localVectorCache.entries()) {
      let score = 0;
      for (let i = 0; i < 1536; i++) {
        score += vector[i] * item.vector[i];
      }
      results.push({
        id: `product_${productId}`,
        score,
        productId,
        metadata: item.metadata
      });
    }
    
    // Sort descending by score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  // Real Pinecone query
  try {
    if (!pineconeIndex) await initPineconeIndex();
    const queryResponse = await pineconeIndex.query({
      vector,
      topK: limit,
      includeMetadata: true
    });
    
    return queryResponse.matches.map(match => ({
      id: match.id,
      score: match.score,
      productId: parseInt(match.id.replace('product_', '')),
      metadata: match.metadata
    }));
  } catch (err) {
    console.error('[AI Service] Pinecone query error:', err);
    return [];
  }
}

// 5. Upsert Product Vector
async function upsertProduct(product) {
  const text = formatProductText(product);
  
  try {
    const vector = await getEmbedding(text);
    const metadata = {
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price),
      slug: product.slug,
      category: product.category?.name || 'Menswear',
      image_url: product.images?.find(img => img.is_primary)?.url || product.images?.[0]?.url || ''
    };

    if (isSandboxMode) {
      localVectorCache.set(product.id, { id: `product_${product.id}`, vector, metadata });
      return true;
    }

    if (!pineconeIndex) await initPineconeIndex();
    await pineconeIndex.upsert([{
      id: `product_${product.id}`,
      values: vector,
      metadata
    }]);
    return true;
  } catch (err) {
    console.error(`[AI Service] Upsert product vector failed for ID ${product.id}:`, err.message);
    return false;
  }
}

// 6. Delete Product Vector
async function deleteProduct(productId) {
  if (isSandboxMode) {
    localVectorCache.delete(productId);
    return true;
  }

  try {
    if (!pineconeIndex) await initPineconeIndex();
    await pineconeIndex.deleteOne(`product_${productId}`);
    return true;
  } catch (err) {
    console.error(`[AI Service] Delete product vector failed for ID ${productId}:`, err.message);
    return false;
  }
}

// 7. Semantic Search (combines Pinecone/local + DB query)
async function semanticSearch(query, limit = 12) {
  if (!query || !query.trim()) return [];
  
  try {
    const vector = await getEmbedding(query);
    const matches = await vectorSearch(vector, limit);
    
    if (matches.length === 0) return [];

    const productIds = matches.map(m => m.productId);
    const { Product, ProductImage, ProductVariant, Category } = require('../config/db');
    
    // Fetch products in database matching these IDs
    const products = await Product.findAll({
      where: { id: productIds, is_active: true },
      include: [
        { model: ProductImage, as: 'images', attributes: ['id', 'url', 'is_primary', 'sort_order'] },
        { model: ProductVariant, as: 'variants', attributes: ['id', 'size', 'color', 'color_hex', 'price_override', 'stock_qty', 'sku'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }
      ]
    });

    // Reorder matching database results to preserve the vector score ranking
    return products.sort((a, b) => productIds.indexOf(a.id) - productIds.indexOf(b.id));

  } catch (err) {
    console.error('[AI Service] Semantic search error:', err);
    return [];
  }
}

// 8. Vector recommendations (finds similar products using active ID)
async function getVectorRecommendations(productId, limit = 4) {
  try {
    const { Product, ProductImage, Category } = require('../config/db');
    const sourceProduct = await Product.findByPk(productId, {
      include: [{ model: Category, as: 'category' }]
    });
    if (!sourceProduct) return [];

    let matches = [];

    if (isSandboxMode) {
      // Find vector of product or generate it
      let vector;
      const cached = localVectorCache.get(productId);
      if (cached) {
        vector = cached.vector;
      } else {
        vector = await getEmbedding(formatProductText(sourceProduct));
      }
      matches = await vectorSearch(vector, limit + 1);
    } else {
      if (!pineconeIndex) await initPineconeIndex();
      const queryResponse = await pineconeIndex.query({
        id: `product_${productId}`,
        topK: limit + 1,
        includeMetadata: true
      });
      matches = queryResponse.matches.map(m => ({
        productId: parseInt(m.id.replace('product_', ''))
      }));
    }

    // Filter out the source product itself
    const filteredIds = matches
      .map(m => m.productId)
      .filter(id => id !== parseInt(productId))
      .slice(0, limit);

    if (filteredIds.length === 0) return [];

    const recommendations = await Product.findAll({
      where: { id: filteredIds, is_active: true },
      include: [{ model: ProductImage, as: 'images', attributes: ['id', 'url', 'is_primary'] }]
    });

    return recommendations.sort((a, b) => filteredIds.indexOf(a.id) - filteredIds.indexOf(b.id));

  } catch (err) {
    console.error('[AI Service] Vector recommendations error:', err);
    return [];
  }
}

// 9. Startup synchronization pipeline
async function syncAllProducts() {
  try {
    await initPineconeIndex();
    
    const { Product, ProductImage, ProductVariant, Category } = require('../config/db');
    const products = await Product.findAll({
      where: { is_active: true },
      include: [
        { model: ProductImage, as: 'images' },
        { model: ProductVariant, as: 'variants' },
        { model: Category, as: 'category' }
      ]
    });

    console.log(`[AI Service] Starting synchronization of ${products.length} active products...`);
    let count = 0;
    for (const prod of products) {
      const success = await upsertProduct(prod);
      if (success) count++;
    }
    console.log(`[AI Service] Sync complete. Indexed ${count}/${products.length} products successfully.`);
  } catch (err) {
    console.error('[AI Service] Sync error:', err);
  }
}

// 10. LangChain RAG assistant expression sequence (LCEL)
const queryVectorization = new RunnableLambda({
  func: async (input) => {
    const query = input.query;
    const embedding = await getEmbedding(query);
    return { query, embedding, history: input.history || [] };
  }
});

const retrieveContext = new RunnableLambda({
  func: async (input) => {
    const { query, embedding, history } = input;
    const matches = await vectorSearch(embedding, 3);
    const productIds = matches.map(m => m.productId);
    
    const { Product, ProductImage } = require('../config/db');
    const products = await Product.findAll({
      where: { id: productIds, is_active: true },
      include: [{ model: ProductImage, as: 'images', attributes: ['url', 'is_primary'] }]
    });
    
    return { query, products, history };
  }
});

const callLLM = new RunnableLambda({
  func: async (input) => {
    const { query, products, history } = input;
    let answer = '';

    if (isSandboxMode) {
      if (products.length > 0) {
        answer = `I curated a few options for you from our collection:\n\n` +
          products.map(p => `- **${p.name}** ($${p.price}): ${p.description}`).join('\n') +
          `\n\nHow do these styles look? Let me know if you would like styling tips or help with sizing!`;
      } else {
        answer = `Hello! I am your GENTWear AI Shopping Assistant. I couldn't find matches for your exact request. Feel free to ask about our blazers, shirts, trousers, or suits!`;
      }
    } else {
      const context = products.map(p => `- ${p.name} ($${p.price}): ${p.description}`).join('\n');
      const systemPrompt = `You are GENTWear's premium AI Shopping Assistant. Your goal is to guide clients on products, sizing, and styling.
Keep responses concise, elegant, and helpful. Use markdown.

Relevant products:
${context}`;
      
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: query }
      ];
      
      try {
        const chatCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: formattedMessages
        });
        answer = chatCompletion.choices[0].message.content;
      } catch (chatErr) {
        console.error('[AI Service] OpenAI Chat Completion error, using fallback:', chatErr);
        answer = `I am currently experiencing higher latency, but here are the suited recommendations:\n\n` +
          products.map(p => `- **${p.name}** ($${p.price}): ${p.description}`).join('\n');
      }
    }
    
    return { answer, products };
  }
});

const ragChain = RunnableSequence.from([
  queryVectorization,
  retrieveContext,
  callLLM
]);

async function aiAssistantChat(messages) {
  // Extract user's latest query
  const latestUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const query = latestUserMsg ? latestUserMsg.content : 'hello';
  
  // Format conversational history (excluding latest user message)
  const history = messages.filter(m => m !== latestUserMsg).map(m => ({
    role: m.role,
    content: m.content
  }));

  return await ragChain.invoke({ query, history });
}

module.exports = {
  getEmbedding,
  upsertProduct,
  deleteProduct,
  semanticSearch,
  getVectorRecommendations,
  syncAllProducts,
  aiAssistantChat,
  isSandboxMode: () => isSandboxMode
};
