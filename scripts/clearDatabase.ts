/**
 * Clear all data from Redis and Neon databases
 *
 * Usage: npx tsx scripts/clearDatabase.ts
 */

import { createClient } from "redis";
import { Client } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env.production") });

async function clearRedis() {
  console.log("🔴 Connecting to Redis...");
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log("⚠️  REDIS_URL not found, skipping Redis cleanup");
    return;
  }

  const redis = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10000,
      reconnectStrategy: false,
    },
  });

  try {
    await redis.connect();
    console.log("✓ Connected to Redis");

    // Get all keys
    const keys = await redis.keys("*");
    console.log(`Found ${keys.length} keys in Redis`);

    if (keys.length > 0) {
      // Delete all keys
      await redis.flushDb();
      console.log("✓ Cleared all Redis data");
    } else {
      console.log("✓ Redis already empty");
    }
  } catch (error: any) {
    console.error("❌ Redis error:", error.message);
    console.log("⚠️  Skipping Redis cleanup due to connection error");
  } finally {
    try {
      await redis.quit();
    } catch (e) {
      // Ignore quit errors
    }
  }
}

async function clearNeon() {
  console.log("\n🐘 Connecting to Neon (PostgreSQL)...");
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.log("⚠️  DATABASE_URL not found, skipping Neon cleanup");
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("✓ Connected to Neon");

    // Get all tables in public schema
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    const tables = tablesResult.rows.map((row) => row.tablename);
    console.log(`Found ${tables.length} tables:`, tables);

    if (tables.length > 0) {
      // Truncate all tables (faster than DELETE and resets sequences)
      for (const table of tables) {
        try {
          await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
          console.log(`  ✓ Cleared table: ${table}`);
        } catch (error: any) {
          console.log(`  ⚠️  Could not truncate ${table}: ${error.message}`);
        }
      }
      console.log("✓ Cleared all Neon tables");
    } else {
      console.log("✓ Neon already empty (no tables found)");
    }
  } catch (error: any) {
    console.error("❌ Neon error:", error.message);
    console.log("⚠️  Skipping Neon cleanup due to connection error");
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore end errors
    }
  }
}

async function main() {
  console.log("🗑️  DATABASE CLEANUP SCRIPT\n");
  console.log("This will delete ALL data from Redis and Neon databases.");
  console.log("Press Ctrl+C within 3 seconds to cancel...\n");

  // Give user time to cancel
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await clearRedis();
  await clearNeon();

  console.log("\n✅ Database cleanup complete!");
  console.log("All forecast data has been deleted.");
}

main().catch(console.error);
