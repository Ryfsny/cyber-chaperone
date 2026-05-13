import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// index.published.ts omits operator_admins + broadcast_queue so Replit's
// publish flow does not try to migrate those tables against the frozen prod DB.
// Once the production DB is unfrozen, switch this back to ./src/schema/index.ts
// and run `pnpm --filter @workspace/db run push` to apply the pending migrations.
export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.published.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
