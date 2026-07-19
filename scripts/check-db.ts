import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import type { DatabaseConnectionIdentity } from "@/types";

async function main() {
  loadEnvConfig(process.cwd());

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to check the database connection.",
    );
  }

  const sql = neon(databaseUrl);
  const [connection] =
    (await sql`select current_database() as database, current_user as user`) as DatabaseConnectionIdentity[];
  if (!connection) throw new Error("The database did not return its identity.");

  console.log(`Connected to ${connection.database} as ${connection.user}.`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
