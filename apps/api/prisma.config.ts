// Prisma CLI config — URL relative to schema dir for migrate; runtime uses absolute path in PrismaService.
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL ?? `file:${path.resolve("prisma/dev.db")}`,
  },
});
