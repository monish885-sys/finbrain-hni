import {
  Inject,
  Injectable,
  Module,
} from "@nestjs/common";
import {
  buildPortfolioContext,
  createBrainset,
  getKapoorPortfolio,
} from "@capstone/ca-buddy";
import { dailyGlance } from "@capstone/demo-data";
import type { Brainset, DailyGlance, FirewallData, PortfolioContext } from "@capstone/types";
import { AuthModule, FamilyService } from "../auth/auth.module";
import { PrismaService } from "../prisma/prisma.module";
import { WealthModule, WealthService } from "../wealth/wealth.module";
import { TaxModule, TaxService } from "../tax/tax.module";

@Injectable()
export class BrainsetService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyService) private readonly families: FamilyService,
    @Inject(WealthService) private readonly wealth: WealthService,
    @Inject(TaxService) private readonly tax: TaxService,
  ) {}

  async buildPortfolioFromDb(userId: string, familyId: string): Promise<PortfolioContext> {
    await this.families.assertMember(userId, familyId);
    const { family, holdings } = await this.wealth.getNetWorth(userId, familyId);

    let firewall: FirewallData;
    try {
      firewall = await this.tax.getFirewall(userId, familyId);
    } catch {
      firewall = {
        status: {
          status: "clean",
          last_scan: new Date().toISOString(),
          ais_entries_checked: 0,
          matched: 0,
          needs_attention: 0,
        },
        mismatches: [],
      };
    }

    const pendingCards = await this.prisma.actionCardRecord.count({
      where: { familyId, status: "pending" },
    });

    const glance: DailyGlance = {
      ...(dailyGlance as DailyGlance),
      action_cards_pending: pendingCards,
      firewall_status:
        firewall.status.status === "critical"
          ? "critical"
          : firewall.status.needs_attention > 0
            ? "attention"
            : "clean",
      firewall_last_checked: firewall.status.last_scan,
    };

    return buildPortfolioContext({
      family,
      holdings,
      firewall,
      dailyGlance: glance,
    });
  }

  async upsertBrainset(userId: string, familyId: string): Promise<Brainset> {
    const portfolio = await this.buildPortfolioFromDb(userId, familyId);
    const brainset = createBrainset({
      family_id: familyId,
      portfolio,
      status: "active",
    });

    await this.prisma.brainsetRecord.upsert({
      where: { familyId },
      update: {
        id: brainset.id,
        status: brainset.status,
        financialYear: brainset.financial_year,
        portfolioJson: JSON.stringify(brainset.portfolio),
        calendarJson: JSON.stringify(brainset.calendar),
        openDayPlanIds: JSON.stringify(brainset.open_day_plan_ids),
        caPrefsJson: JSON.stringify(brainset.ca_prefs ?? {}),
      },
      create: {
        id: brainset.id,
        familyId,
        status: brainset.status,
        financialYear: brainset.financial_year,
        portfolioJson: JSON.stringify(brainset.portfolio),
        calendarJson: JSON.stringify(brainset.calendar),
        openDayPlanIds: JSON.stringify(brainset.open_day_plan_ids),
        caPrefsJson: JSON.stringify(brainset.ca_prefs ?? {}),
      },
    });

    return brainset;
  }

  async getBrainset(userId: string, familyId: string): Promise<Brainset> {
    await this.families.assertMember(userId, familyId);
    const row = await this.prisma.brainsetRecord.findUnique({ where: { familyId } });
    if (!row) return this.upsertBrainset(userId, familyId);
    const portfolio = JSON.parse(row.portfolioJson) as PortfolioContext;
    return {
      id: row.id,
      family_id: familyId,
      family_name: portfolio.family_name,
      status: row.status as Brainset["status"],
      portfolio,
      financial_year: row.financialYear,
      calendar: JSON.parse(row.calendarJson),
      open_day_plan_ids: JSON.parse(row.openDayPlanIds) as string[],
      ca_prefs: JSON.parse(row.caPrefsJson),
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  async resolveAskPortfolio(
    userId: string | undefined,
    familyId: string | undefined,
    mode: "demo" | "none" | "live",
  ): Promise<PortfolioContext | undefined> {
    if (mode === "none") return undefined;
    if (mode === "live" && userId && familyId) {
      try {
        const bs = await this.upsertBrainset(userId, familyId);
        return bs.portfolio;
      } catch {
        return getKapoorPortfolio();
      }
    }
    return getKapoorPortfolio();
  }
}

@Module({
  imports: [AuthModule, WealthModule, TaxModule],
  providers: [BrainsetService],
  exports: [BrainsetService],
})
export class BrainsetModule {}
