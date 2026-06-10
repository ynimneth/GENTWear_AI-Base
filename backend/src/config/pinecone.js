const { Pinecone } = require('@pinecone-database/pinecone')

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

const productIndex = pc.index('gentwear-products')

module.exports = { pc, productIndex }
