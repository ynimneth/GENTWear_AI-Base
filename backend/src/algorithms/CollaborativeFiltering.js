const { Order, OrderItem, Review, WishlistItem, Product, ProductImage } = require('../config/db');

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  for (const key of allKeys) {
    const valA = vecA[key] || 0;
    const valB = vecB[key] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getCollaborativeRecommendations(userId, limit = 4) {
  try {
    // 1. Gather all interactions
    // A. Purchases
    const orders = await Order.findAll({
      where: { status: ['paid', 'delivered', 'shipped'] },
      include: [{ model: OrderItem, as: 'items' }]
    });

    // B. Reviews
    const reviews = await Review.findAll();

    // C. Wishlist
    const wishlists = await WishlistItem.findAll();

    // 2. Build User-Item Interaction Matrix
    // matrix: userId -> { productId -> score }
    const matrix = {};

    // Helper to add score to matrix
    const addScore = (uId, pId, score) => {
      if (!matrix[uId]) matrix[uId] = {};
      matrix[uId][pId] = (matrix[uId][pId] || 0) + score;
    };

    // Process Purchases
    for (const order of orders) {
      if (!order.user_id || !order.items) continue;
      for (const item of order.items) {
        addScore(order.user_id, item.product_id, 3);
      }
    }

    // Process Reviews
    for (const rev of reviews) {
      addScore(rev.user_id, rev.product_id, parseFloat(rev.rating));
    }

    // Process Wishlist
    for (const wish of wishlists) {
      addScore(wish.user_id, wish.product_id, 2);
    }

    // Target User Vector
    const targetUserVector = matrix[userId] || {};
    const hasInteracted = Object.keys(targetUserVector).map(Number);

    // 3. KNN: Calculate similarities between target user and all other users
    const similarities = [];
    for (const otherUserId in matrix) {
      const otherId = parseInt(otherUserId);
      if (otherId === userId) continue;

      const sim = cosineSimilarity(targetUserVector, matrix[otherUserId]);
      if (sim > 0) {
        similarities.push({ userId: otherId, similarity: sim });
      }
    }

    // Sort users by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Take top K neighbors (K = 5)
    const K = 5;
    const neighbors = similarities.slice(0, K);

    // 4. Score Candidate Products
    const candidateScores = {};
    for (const neighbor of neighbors) {
      const neighborVector = matrix[neighbor.userId];
      for (const prodIdStr in neighborVector) {
        const prodId = parseInt(prodIdStr);
        // Skip products target user already interacted with
        if (hasInteracted.includes(prodId)) continue;

        const score = neighborVector[prodIdStr];
        candidateScores[prodId] = (candidateScores[prodId] || 0) + (neighbor.similarity * score);
      }
    }

    // Sort candidates by score descending
    const recommendedIds = Object.keys(candidateScores)
      .map(Number)
      .sort((a, b) => candidateScores[b] - candidateScores[a])
      .slice(0, limit);

    // If we have collaborative matches, fetch and return them
    if (recommendedIds.length > 0) {
      const products = await Product.findAll({
        where: { id: recommendedIds, is_active: true },
        include: [{ model: ProductImage, as: 'images', attributes: ['id', 'url', 'is_primary'] }]
      });
      // Sort back into recommendation score order
      return products.sort((a, b) => recommendedIds.indexOf(a.id) - recommendedIds.indexOf(b.id));
    }

    // 5. Cold-Start Fallback: Return top 4 popular active products
    const fallbackProducts = await Product.findAll({
      where: { is_active: true },
      limit,
      order: [['is_featured', 'DESC'], ['createdAt', 'DESC']],
      include: [{ model: ProductImage, as: 'images', attributes: ['id', 'url', 'is_primary'] }]
    });

    return fallbackProducts;

  } catch (err) {
    console.error('Collaborative filtering error:', err);
    // Silent fallback in case of errors
    return Product.findAll({
      where: { is_active: true },
      limit,
      order: [['createdAt', 'DESC']],
      include: [{ model: ProductImage, as: 'images', attributes: ['id', 'url', 'is_primary'] }]
    });
  }
}

module.exports = {
  getCollaborativeRecommendations
};
