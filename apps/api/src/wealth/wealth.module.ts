import { Controller, Get, Inject, Injectable, Module, NotFoundException, Param, UseGuards } from "@nestjs/common";
import type { Family, Holding } from "@capstone/types";
import { AuthModule, FamilyService } from "../auth/auth.module";
import { JwtPayload, CurrentUser, JwtAuthGuard } from "../auth/auth.guards";
import { PrismaService } from "../prisma/prisma.module";

@Injectable()
export class WealthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyService) private readonly families: FamilyService,
  ) {}

  async getDefaultNetWorth(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: { family: true },
      orderBy: { family: { updatedAt: "desc" } },
    });
    if (!memberships.length) throw new NotFoundException("No family for user");
    const KAPOOR = "fam_kapoor_001";
    // Prefer completed non-demo portfolios; never let incomplete shells override Kapoor/demo
    const preferred =
      memberships.find((m) => m.familyId !== KAPOOR && m.family.onboardingStatus === "complete") ??
      memberships.find((m) => m.familyId === KAPOOR) ??
      memberships.find((m) => m.family.onboardingStatus === "complete") ??
      memberships[0];
    return this.getNetWorth(userId, preferred.familyId);
  }

  async getNetWorth(userId: string, familyId: string): Promise<{ family: Family; holdings: Holding[] }> {
    await this.families.assertMember(userId, familyId);
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: { persons: true, legalEntities: true, assets: { include: { lots: true } } },
    });
    if (!family) throw new NotFoundException("Family not found");

    const entities = [
      ...family.persons.map((p) => ({
        id: p.id,
        type: "individual" as const,
        name: p.name,
        pan: p.panMasked,
        net_worth_inr: p.netWorthInr,
        role: (p.role as "principal" | "spouse" | "parent" | "child" | undefined) ?? undefined,
      })),
      ...family.legalEntities.map((e) => ({
        id: e.id,
        type: e.type as "huf" | "private_trust" | "pvt_ltd",
        name: e.name,
        pan: e.panMasked,
        net_worth_inr: e.netWorthInr,
        karta: e.kartaId ?? undefined,
      })),
    ];

    const holdings: Holding[] = family.assets.map((a) => ({
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      asset_type: a.assetType as Holding["asset_type"],
      custodian: a.custodian,
      held_by_entity_id: a.heldByEntityId,
      quantity: a.quantity,
      current_value_inr: a.currentValueInr,
      cost_basis_inr: a.costBasisInr,
      gain_loss_inr: a.gainLossInr,
      gain_type: a.gainType as Holding["gain_type"],
      source: a.source as Holding["source"],
      lots: a.lots.map((l) => ({
        lot_id: l.id,
        quantity: l.quantity,
        buy_date: l.buyDate,
        buy_price_inr: l.buyPriceInr,
        current_price_inr: l.currentPriceInr,
        gain_loss_inr: l.gainLossInr,
        gain_type: l.gainType as Holding["lots"][0]["gain_type"],
      })),
    }));

    const familyDto: Family = {
      family_id: family.id,
      name: family.name,
      total_net_worth_inr: family.totalNetWorthInr,
      delta_today_inr: family.deltaTodayInr,
      delta_month_inr: family.deltaMonthInr,
      tax_saved_ytd_inr: family.taxSavedYtdInr,
      held_away_pct: family.heldAwayPct,
      primary_bank: family.primaryBank,
      last_sync: (family.lastSync ?? new Date()).toISOString(),
      nominee_gaps: family.nomineeGaps,
      entity_count: entities.length,
      entities,
      asset_classes: {
        equity: family.equityPct,
        debt: family.debtPct,
        re: family.rePct,
        alts: family.altsPct,
        cash: family.cashPct,
      },
    };

    return { family: familyDto, holdings };
  }

  async getHoldings(userId: string, entityId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { heldByEntityId: entityId },
      include: { family: { include: { members: true } } },
    });
    if (!asset) throw new NotFoundException("Entity holdings not found");
    const isMember = asset.family.members.some((m) => m.userId === userId);
    if (!isMember) throw new NotFoundException("Entity holdings not found");

    const { holdings } = await this.getNetWorth(userId, asset.familyId);
    return holdings.filter((h) => h.held_by_entity_id === entityId);
  }
}

@Controller()
@UseGuards(JwtAuthGuard)
export class WealthController {
  constructor(@Inject(WealthService) private readonly wealth: WealthService) {}

  /** Convenience alias matching build-plan GET /family/networth for default Kapoor family */
  @Get("family/networth")
  defaultNetworth(@CurrentUser() user: JwtPayload) {
    return this.wealth.getDefaultNetWorth(user.sub);
  }

  @Get("family/:familyId/networth")
  networth(@CurrentUser() user: JwtPayload, @Param("familyId") familyId: string) {
    return this.wealth.getNetWorth(user.sub, familyId);
  }

  @Get("entities/:id/holdings")
  holdings(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.wealth.getHoldings(user.sub, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [WealthController],
  providers: [WealthService],
  exports: [WealthService],
})
export class WealthModule {}
