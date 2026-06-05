const { createClient } = require('redis');

let client = null;
let isConnected = false;

// Memory fallback store for when Redis is unavailable
const fallbackStore = new Map();
const fallbackExpiries = new Map(); // key -> expiration timestamp

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const initRedis = async () => {
  try {
    client = createClient({ 
      url: REDIS_URL,
      RESP: 2,
      socket: {
        reconnectStrategy: false
      }
    });

    client.on('error', (err) => {
      console.warn('Redis client error, falling back to in-memory store:', err.message);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('Redis client connecting...');
    });

    client.on('ready', () => {
      console.log('Redis client connected and ready!');
      isConnected = true;
    });

    client.on('end', () => {
      console.warn('Redis client connection closed.');
      isConnected = false;
    });

    await client.connect();
  } catch (err) {
    console.warn('Could not connect to Redis, using in-memory store fallback:', err.message);
    client = null;
    isConnected = false;
  }
};

// Start connection attempt asynchronously
initRedis();

const get = async (key) => {
  if (isConnected && client) {
    try {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      console.error('Redis GET error:', err);
    }
  }

  // Fallback to in-memory store
  const expiry = fallbackExpiries.get(key);
  if (expiry && expiry < Date.now()) {
    fallbackStore.delete(key);
    fallbackExpiries.delete(key);
    return null;
  }
  const val = fallbackStore.get(key);
  return val ? JSON.parse(val) : null;
};

const set = async (key, value, ttlSeconds = null) => {
  const jsonString = JSON.stringify(value);

  if (isConnected && client) {
    try {
      if (ttlSeconds) {
        await client.set(key, jsonString, { EX: ttlSeconds });
      } else {
        await client.set(key, jsonString);
      }
      return true;
    } catch (err) {
      console.error('Redis SET error:', err);
    }
  }

  // Fallback to in-memory store
  fallbackStore.set(key, jsonString);
  if (ttlSeconds) {
    fallbackExpiries.set(key, Date.now() + (ttlSeconds * 1000));
  } else {
    fallbackExpiries.delete(key);
  }
  return true;
};

const del = async (key) => {
  if (isConnected && client) {
    try {
      await client.del(key);
      return true;
    } catch (err) {
      console.error('Redis DEL error:', err);
    }
  }

  // Fallback to in-memory store
  fallbackStore.delete(key);
  fallbackExpiries.delete(key);
  return true;
};

module.exports = {
  get,
  set,
  del,
  isRedisConnected: () => isConnected
};
