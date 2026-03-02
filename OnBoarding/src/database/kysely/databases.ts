import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { Database } from "./types.js";

const isLocal =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "test";

const pool = new Pool({
  host: process.env.DB_HOST,          // Private IP (10.x.x.x)
  port: Number(process.env.DB_PORT),  // 5432
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  max: 5,                             // Cloud Run friendly
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,

  // ✅ Cloud SQL requires SSL (even on private IP)
  ssl: isLocal
    ? false
    : {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      },
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL pool connected");
});

pool.on("error", (err) => {
  console.error("⚠️ PostgreSQL pool error:", err);
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});
