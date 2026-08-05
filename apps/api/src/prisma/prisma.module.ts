import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import path from "node:path";

function resolveDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv?.startsWith("file:") && path.isAbsolute(fromEnv.slice(5))) {
    return fromEnv;
  }
  if (fromEnv?.startsWith("postgresql:")) {
    return fromEnv;
  }
  // Stable local default: <cwd>/prisma/dev.db (run API from apps/api)
  const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
  return `file:${dbPath}`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: { url: resolveDatabaseUrl() },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
