import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
  OnModuleInit,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsArray, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { randomUUID } from "node:crypto";
import { demoData } from "@capstone/demo-data";
import { computeStcgLtcg } from "@capstone/ca-buddy";
import { AuthModule, FamilyService } from "../auth/auth.module";
import { JwtPayload, CurrentUser, JwtAuthGuard } from "../auth/auth.guards";
import { PrismaService } from "../prisma/prisma.module";
import { createTspClient, DEMO_FAMILY_ID, type TspClient, type TspHolding } from "./tsp";
import { NetWorthService } from "./net-worth.service";

export { NetWorthService } from "./net-worth.service";

class AaConsentDto {
  @IsString()
  familyId!: string;

  @IsOptional()
  @IsString()
  tsp?: string;
}

class AaSyncDto {
  @IsString()
  familyId!: string;
}

class CasIngestDto {
  @IsString()
  familyId!: string;

  /** zerodha | groww | auto */
  @IsOptional()
  @IsString()
  broker?: string;

  /** Fixture id or raw JSON string / array of holdings */
  @IsOptional()
  @IsString()
  payload?: string;
}

class ManualAccountItemDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  custodian!: string;

  @IsString()
  assetType!: string;

  @IsNumber()
  @Min(0)
  currentValueInr!: number;

  @IsOptional()
  @IsNumber()
  costBasisInr?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  symbol?: string;
}

class ManualAccountsDto {
  @IsString()
  familyId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualAccountItemDto)
  accounts!: ManualAccountItemDto[];
}

@Injectable()
export class IngestionService {
  private readonly tsp: TspClient;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyService) private readonly families: FamilyService,
    @Inject(NetWorthService) private readonly netWorth: NetWorthService,
  ) {
    this.tsp = createTspClient();
  }

  async aaConsent(userId: string, dto: AaConsentDto) {
    await this.families.assertMember(userId, dto.familyId);

    const created = await this.tsp.createConsent({ familyId: dto.familyId });
    const consent = await this.prisma.aaConsent.create({
      data: {
        familyId: dto.familyId,
        status: created.status,
        tsp: dto.tsp ?? created.tsp,
        fipTypes: JSON.stringify(created.fipTypes),
        consentRef: created.consentRef,
        expiresAt: created.expiresAt,
      },
    });

    const holdings = await this.tsp.fetchAccounts(created.consentRef, dto.familyId);
    const ingested = await this.upsertTspHoldings(dto.familyId, holdings, "aa");

    for (const fip of created.fipTypes) {
      await this.prisma.linkedAccount.create({
        data: {
          familyId: dto.familyId,
          custodian: created.tsp,
          accountType: fip,
          source: "aa",
          externalRef: created.consentRef,
          status: "active",
          label: `AA ${fip}`,
        },
      });
    }

    await this.netWorth.recompute(dto.familyId);
    await this.advanceOnboarding(dto.familyId);

    return {
      consent_id: consent.id,
      consent_ref: consent.consentRef,
      status: consent.status,
      tsp: consent.tsp,
      fip_types: created.fipTypes,
      holdings_ingested: ingested,
      redirect_url: created.redirectUrl,
      message: created.message,
    };
  }

  async aaSync(userId: string, dto: AaSyncDto) {
    await this.families.assertMember(userId, dto.familyId);
    return this.syncFamilyConsents(dto.familyId);
  }

  /** Used by aa-sync scheduler — no user context. */
  async syncFamilyConsents(familyId: string) {
    const consents = await this.prisma.aaConsent.findMany({
      where: { familyId, status: "active" },
    });
    let holdingsIngested = 0;
    for (const c of consents) {
      const holdings = await this.tsp.fetchAccounts(c.consentRef, familyId);
      holdingsIngested += await this.upsertTspHoldings(familyId, holdings, "aa");
    }
    await this.netWorth.recompute(familyId);
    return { family_id: familyId, consents: consents.length, holdings_ingested: holdingsIngested };
  }

  async syncAllActiveConsents() {
    const consents = await this.prisma.aaConsent.findMany({
      where: { status: "active" },
      select: { familyId: true },
      distinct: ["familyId"],
    });
    const results = [];
    for (const c of consents) {
      results.push(await this.syncFamilyConsents(c.familyId));
    }
    return results;
  }

  async ingestCas(userId: string, dto: CasIngestDto) {
    await this.families.assertMember(userId, dto.familyId);
    const broker = (dto.broker ?? "auto").toLowerCase();
    const fy = "2025-26";
    const asOf = "2026-06-30";

    let holdings = demoData.holdings.filter((h) => h.source === "cas");
    if (broker === "zerodha") {
      holdings = holdings.filter((h) => h.custodian.toLowerCase().includes("zerodha"));
    } else if (broker === "groww") {
      holdings = holdings.filter((h) => h.custodian.toLowerCase().includes("groww"));
    }

    // Client-owned payload required for non-demo families (no Kapoor fixture inject).
    if (dto.payload) {
      try {
        const parsed = JSON.parse(dto.payload) as typeof demoData.holdings;
        if (Array.isArray(parsed) && parsed.length) holdings = parsed;
      } catch {
        throw new BadRequestException("payload must be JSON array of holdings");
      }
    } else if (dto.familyId !== DEMO_FAMILY_ID) {
      throw new BadRequestException(
        "CAS payload required for live clients. Upload holdings JSON (no demo fixtures).",
      );
    }

    await this.prisma.taxLot.deleteMany({ where: { familyId: dto.familyId, fy, source: "cas" } });

    const person = await this.prisma.person.findFirst({ where: { familyId: dto.familyId } });
    const heldBy = person?.id ?? `person_${dto.familyId}`;

    const results: Array<{
      lot_ref: string;
      symbol: string;
      gain_type: string;
      gain_inr: number;
      tax_inr: number;
      section: string;
    }> = [];

    for (const h of holdings) {
      const assetId = h.id?.startsWith("h_") && dto.familyId === DEMO_FAMILY_ID ? h.id : `asset_${randomUUID().slice(0, 10)}`;
      const heldByEntityId =
        dto.familyId === DEMO_FAMILY_ID ? h.held_by_entity_id : heldBy;

      for (const lot of h.lots) {
        const saleValue = lot.quantity * lot.current_price_inr;
        const cost = lot.quantity * lot.buy_price_inr;
        const cg = computeStcgLtcg({
          asset_class: h.asset_type === "re" ? "property" : h.asset_type === "fd" ? "debt" : "equity",
          purchase_date: lot.buy_date,
          sale_date: asOf,
          cost_inr: cost,
          sale_value_inr: saleValue,
          is_listed_equity: h.asset_type === "equity" || h.asset_type === "mf",
        });

        await this.prisma.taxLot.create({
          data: {
            familyId: dto.familyId,
            fy,
            symbol: h.symbol,
            lotRef: lot.lot_id,
            quantity: lot.quantity,
            buyDate: lot.buy_date,
            buyPriceInr: lot.buy_price_inr,
            currentPriceInr: lot.current_price_inr,
            costInr: cost,
            marketValueInr: saleValue,
            gainLossInr: cg.gain_inr,
            gainType: cg.gain_type,
            source: "cas",
            custodian: h.custodian,
            heldByEntityId,
          },
        });

        results.push({
          lot_ref: lot.lot_id,
          symbol: h.symbol,
          gain_type: cg.gain_type,
          gain_inr: cg.gain_inr,
          tax_inr: cg.tax_inr,
          section: cg.section,
        });
      }

      await this.prisma.asset.upsert({
        where: { id: assetId },
        update: {
          quantity: h.quantity,
          currentValueInr: h.current_value_inr,
          costBasisInr: h.cost_basis_inr,
          gainLossInr: h.gain_loss_inr,
          source: "cas",
          custodian: h.custodian,
        },
        create: {
          id: assetId,
          familyId: dto.familyId,
          symbol: h.symbol,
          name: h.name,
          assetType: h.asset_type,
          custodian: h.custodian,
          heldByEntityId,
          quantity: h.quantity,
          currentValueInr: h.current_value_inr,
          costBasisInr: h.cost_basis_inr,
          gainLossInr: h.gain_loss_inr,
          gainType: h.gain_type,
          source: "cas",
          lots: {
            create: h.lots.map((l) => ({
              id: `${l.lot_id}_${randomUUID().slice(0, 4)}`,
              quantity: l.quantity,
              buyDate: l.buy_date,
              buyPriceInr: l.buy_price_inr,
              currentPriceInr: l.current_price_inr,
              gainLossInr: l.gain_loss_inr,
              gainType: l.gain_type,
            })),
          },
        },
      });
    }

    await this.prisma.linkedAccount.create({
      data: {
        familyId: dto.familyId,
        custodian: broker === "auto" ? "CAS" : broker,
        accountType: "broker",
        source: "cas",
        status: "active",
        label: `CAS ${broker}`,
        balanceInr: holdings.reduce((s, h) => s + h.current_value_inr, 0),
      },
    });

    await this.netWorth.recompute(dto.familyId);
    await this.advanceOnboarding(dto.familyId);

    return {
      family_id: dto.familyId,
      fy,
      broker,
      lots_imported: results.length,
      capital_gains: results,
      note: "Tax math via packages/ca-buddy computeStcgLtcg — LLM never computes gains.",
    };
  }

  async ingestManual(userId: string, dto: ManualAccountsDto) {
    await this.families.assertMember(userId, dto.familyId);
    if (!dto.accounts?.length) throw new BadRequestException("accounts required");

    const person = await this.prisma.person.findFirst({ where: { familyId: dto.familyId } });
    if (!person) throw new BadRequestException("Complete profile before adding accounts");

    const created: string[] = [];
    for (const a of dto.accounts) {
      const id = `asset_${randomUUID().slice(0, 10)}`;
      const cost = a.costBasisInr ?? a.currentValueInr;
      const qty = a.quantity ?? 1;
      await this.prisma.asset.create({
        data: {
          id,
          familyId: dto.familyId,
          symbol: a.symbol ?? a.name.slice(0, 12).toUpperCase().replace(/\s+/g, "_"),
          name: a.name,
          assetType: a.assetType,
          custodian: a.custodian,
          heldByEntityId: person.id,
          quantity: qty,
          currentValueInr: a.currentValueInr,
          costBasisInr: cost,
          gainLossInr: a.currentValueInr - cost,
          gainType: "none",
          source: "manual",
        },
      });
      await this.prisma.linkedAccount.create({
        data: {
          familyId: dto.familyId,
          custodian: a.custodian,
          accountType: a.assetType,
          source: "manual",
          status: "active",
          label: a.name,
          balanceInr: a.currentValueInr,
          externalRef: id,
        },
      });
      created.push(id);
    }

    await this.netWorth.recompute(dto.familyId);
    await this.advanceOnboarding(dto.familyId);

    return {
      family_id: dto.familyId,
      assets_created: created.length,
      asset_ids: created,
    };
  }

  private async upsertTspHoldings(familyId: string, holdings: TspHolding[], source: string) {
    const person = await this.prisma.person.findFirst({ where: { familyId } });
    let ingested = 0;
    for (const h of holdings) {
      const heldByEntityId =
        familyId === DEMO_FAMILY_ID
          ? (demoData.holdings.find((x) => x.id === h.id)?.held_by_entity_id ?? person?.id ?? "unknown")
          : (person?.id ?? "unknown");
      const assetId =
        familyId === DEMO_FAMILY_ID
          ? h.id
          : `aa_${familyId}_${h.symbol}_${h.custodian}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);

      await this.prisma.asset.upsert({
        where: { id: assetId },
        update: {
          currentValueInr: h.currentValueInr,
          costBasisInr: h.costBasisInr,
          gainLossInr: h.gainLossInr,
          quantity: h.quantity,
          source,
        },
        create: {
          id: assetId,
          familyId,
          symbol: h.symbol,
          name: h.name,
          assetType: h.assetType,
          custodian: h.custodian,
          heldByEntityId,
          quantity: h.quantity,
          currentValueInr: h.currentValueInr,
          costBasisInr: h.costBasisInr,
          gainLossInr: h.gainLossInr,
          gainType: h.gainType,
          source,
          lots: {
            create: h.lots.map((l) => ({
              id: familyId === DEMO_FAMILY_ID ? l.lotId : `${l.lotId}_${randomUUID().slice(0, 4)}`,
              quantity: l.quantity,
              buyDate: l.buyDate,
              buyPriceInr: l.buyPriceInr,
              currentPriceInr: l.currentPriceInr,
              gainLossInr: l.gainLossInr,
              gainType: l.gainType,
            })),
          },
        },
      });
      ingested += 1;
    }
    return ingested;
  }

  private async advanceOnboarding(familyId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family || family.onboardingStatus === "complete") return;
    if (family.onboardingStatus === "pending_profile") return;
    const [assets, links] = await Promise.all([
      this.prisma.asset.count({ where: { familyId } }),
      this.prisma.linkedAccount.count({ where: { familyId } }),
      this.prisma.aaConsent.count({ where: { familyId } }),
    ]);
    if (assets > 0 || links > 0) {
      // Stay pending_accounts until explicit complete — but mark progress via lastSync
      await this.prisma.family.update({
        where: { id: familyId },
        data: { lastSync: new Date() },
      });
    }
  }
}

@Injectable()
export class AaSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private interval?: ReturnType<typeof setInterval>;

  constructor(@Inject(IngestionService) private readonly ingestion: IngestionService) {}

  onModuleInit() {
    // Broker OAuth + AA sync owned by ConnectorsModule.ConnectorSyncScheduler
    if (process.env.LEGACY_AA_SYNC === "true") {
      if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return;
      const ms = Number(process.env.AA_SYNC_INTERVAL_MS ?? 6 * 60 * 60 * 1000);
      this.interval = setInterval(() => {
        void this.ingestion.syncAllActiveConsents();
      }, ms);
    }
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }
}

@Controller("ingest")
@UseGuards(JwtAuthGuard)
export class IngestionController {
  constructor(@Inject(IngestionService) private readonly ingestion: IngestionService) {}

  @Post("aa/consent")
  aaConsent(@CurrentUser() user: JwtPayload, @Body() dto: AaConsentDto) {
    return this.ingestion.aaConsent(user.sub, dto);
  }

  @Post("aa/sync")
  aaSync(@CurrentUser() user: JwtPayload, @Body() dto: AaSyncDto) {
    return this.ingestion.aaSync(user.sub, dto);
  }

  @Post("cas")
  cas(@CurrentUser() user: JwtPayload, @Body() dto: CasIngestDto) {
    return this.ingestion.ingestCas(user.sub, dto);
  }

  @Post("manual-accounts")
  manual(@CurrentUser() user: JwtPayload, @Body() dto: ManualAccountsDto) {
    return this.ingestion.ingestManual(user.sub, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [IngestionController],
  providers: [IngestionService, NetWorthService, AaSyncScheduler],
  exports: [IngestionService, NetWorthService],
})
export class IngestionModule {}
