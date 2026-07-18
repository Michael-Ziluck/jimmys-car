import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

let database: ReturnType<typeof drizzle> | undefined;

export function getDb(): ReturnType<typeof drizzle> {
  if (!database) {
    const databaseUrl: string | undefined = process.env["DATABASE_URL"];
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required to connect to the database.");
    }

    database = drizzle({ client: neon(databaseUrl) });
  }

  return database;
}
