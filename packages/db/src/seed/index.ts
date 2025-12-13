import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { vendors } from "../schema.js";
import { vendorSeedData } from "./vendors.js";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("Seeding vendors...");

  for (const vendor of vendorSeedData) {
    try {
      await db.insert(vendors).values(vendor).onConflictDoNothing();
      console.log(`  Added: ${vendor.name}`);
    } catch (error) {
      console.error(`  Failed to add ${vendor.name}:`, error);
    }
  }

  console.log(`\nSeeded ${vendorSeedData.length} vendors`);

  await client.end();
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
