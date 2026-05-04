import app from "./app";
import { logger } from "./lib/logger";
import { db, membersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function seedFoundingMembers(): Promise<void> {
  try {
    await db
      .insert(membersTable)
      .values({
        firstName: "Andre",
        lastName: "Snyman",
        displayName: "Andre Snyman",
        whatsappNumber: "whatsapp:+27825611065",
        memberStatus: "verified",
        role: "Founder / test operator",
        notes: "Internal Cyber Chaperone production test member",
      })
      .onConflictDoUpdate({
        target: membersTable.whatsappNumber,
        set: {
          firstName: sql`EXCLUDED.first_name`,
          lastName: sql`EXCLUDED.last_name`,
          displayName: sql`EXCLUDED.display_name`,
          memberStatus: sql`EXCLUDED.member_status`,
          role: sql`EXCLUDED.role`,
          notes: sql`EXCLUDED.notes`,
        },
      });
    logger.info("Founding member seed complete — Andre Snyman verified");
  } catch (err) {
    logger.error({ err }, "Founding member seed failed — continuing startup");
  }
}

seedFoundingMembers().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
