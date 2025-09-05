// utils/redisClient.js
const { createClient } = require('redis');

const redis = createClient(); // defaults to localhost:6379

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

redis.connect(); // required in v4+

module.exports = redis;
