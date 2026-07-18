import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

async function main() : Promise<void> {
  loadEnvConfig(process.cwd());

  const databaseUrl: string | undefined = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to check the database connection.");
  }

  const sql: ReturnType<typeof neon> = neon(databaseUrl);
  const [connection] = (await sql`select current_database() as database, current_user as user`) as { database: string; user: string }[];
  const result: { database: string; user: string; } = connection as { database: string; user: string };

  console.log(`Connected to ${result.database} as ${result.user}.`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
