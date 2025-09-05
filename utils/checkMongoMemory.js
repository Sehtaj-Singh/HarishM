const mongoose = require("mongoose");
require("dotenv").config();   // Load .env first

const DB_PATH = process.env.DB_PATH;

(async () => {
  try {
    await mongoose.connect(DB_PATH);

    const collections = await mongoose.connection.db.listCollections().toArray();

    console.log("=== MongoDB Collection Sizes ===");
    let totalStorage = 0, totalData = 0, totalIndex = 0;

    for (const col of collections) {
      // Use db.command instead of .stats()
      const stats = await mongoose.connection.db.command({ collStats: col.name });

      totalStorage += stats.storageSize;
      totalData += stats.size;
      totalIndex += stats.totalIndexSize;

      console.log(
        `${col.name}: Storage ${(stats.storageSize / 1024).toFixed(2)} KB | Data ${(stats.size / 1024).toFixed(2)} KB | Index ${(stats.totalIndexSize / 1024).toFixed(2)} KB | AvgDoc ${(stats.avgObjSize / 1024).toFixed(2)} KB`
      );
    }

    console.log("\n=== Grand Totals ===");
    console.log(`Storage: ${(totalStorage / 1024).toFixed(2)} KB`);
    console.log(`Data: ${(totalData / 1024).toFixed(2)} KB`);
    console.log(`Indexes: ${(totalIndex / 1024).toFixed(2)} KB`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
})();

// node utils/checkMongoMemory.js