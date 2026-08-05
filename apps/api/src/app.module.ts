import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { AiModule } from "./ai/ai.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { WealthModule } from "./wealth/wealth.module";
import { IngestionModule } from "./ingestion/ingestion.module";
import { TaxModule } from "./tax/tax.module";
import { VaultModule } from "./vault/vault.module";
import { BrainsetModule } from "./brainset/brainset.module";
import { DeskModule } from "./desk/desk.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { ConnectorsModule } from "./connectors/connectors.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    BrainsetModule,
    AiModule,
    WealthModule,
    IngestionModule,
    ConnectorsModule,
    OnboardingModule,
    TaxModule,
    VaultModule,
    DeskModule,
  ],
})
export class AppModule {}
