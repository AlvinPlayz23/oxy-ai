import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read Next.js's .env.local, so load env files here.
// .env.local first so it takes precedence; missing files are fine.
for (const envFile of ["./.env.local", "./.env"]) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // ignore missing env files
  }
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
