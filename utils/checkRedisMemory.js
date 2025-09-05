// utils/checkRedisMemory.js
const redis = require("./redisClient");

(async () => {
  try {
    const categories = ["cart:*", "login:*", "forgotPassword:*"];

    for (const pattern of categories) {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        console.log(`No keys found for ${pattern}`);
        continue;
      }

      let total = 0;
      for (const key of keys) {
        const usage = await redis.memoryUsage(key);
        total += usage || 0;
      }

      console.log(`\n=== ${pattern} ===`);
      console.log(`Keys: ${keys.length}`);
      console.log(`Total memory: ${(total / 1024).toFixed(2)} KB`);
      console.log(`Average per key: ${(total / keys.length / 1024).toFixed(2)} KB`);
    }

    // --- Overall Redis memory usage ---
    const info = await redis.info("memory");
    console.log("\n=== Redis Memory (All Keys) ===");
    const usedLine = info.split("\n").find(l => l.startsWith("used_memory:"));
    if (usedLine) {
      const usedBytes = parseInt(usedLine.split(":")[1], 10);
      console.log(`Total Redis memory used: ${(usedBytes / 1024 / 1024).toFixed(2)} MB`);
    }
    const peakLine = info.split("\n").find(l => l.startsWith("used_memory_peak:"));
    if (peakLine) {
      const peakBytes = parseInt(peakLine.split(":")[1], 10);
      console.log(`Peak Redis memory used: ${(peakBytes / 1024 / 1024).toFixed(2)} MB`);
    }

    await redis.quit();
  } catch (err) {
    console.error("Error:", err);
  }
})();



// node utils/checkRedisMemory.js
