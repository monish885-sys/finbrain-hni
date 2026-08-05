import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { demoData } from "@capstone/demo-data";
import { computeAdvanceTax, pairHarvestLots } from "@capstone/ca-buddy";
import type { ActionCard, FirewallData, HarvestLot } from "@capstone/types";
import { AuthModule, FamilyService } from "../auth/auth.module";
import { JwtPayload, CurrentUser, JwtAuthGuard } from "../auth/auth.guards";
import { PrismaService } from "../prisma/prisma.module";

class AisUploadDto {
  @IsString()
  familyId!: string;

  /** Use "fixture" to load demo AIS mismatches; or JSON array of mismatches */
  @IsOptional()
  @IsString()
  payload?: string;
}

class HarvestScanDto {
  @IsString()
  familyId!: string;
}

class PatchCardDto {
  @IsString()
  status!: string;
}

class AdvanceTaxDto {
  @IsString()
  familyId!: string;

  @IsOptional()
  projected_total_tax_inr?: number;

  @IsOptional()
  tds_credited_inr?: number;

  @IsOptional()
  advance_tax_paid_inr?: number;

  @IsOptional()
  @IsString()
  as_of_date?: string;
}

function toActionCard(row: {
  id: string;
  type: string;
  status: string;
  title: string;
  subtitle: string;
  savingsInr: number;
  deadline: string;
  priority: string;
  details: string | null;
  mismatchId: string | null;
  taxWithoutActionInr: number | null;
  taxWithActionInr: number | null;
  instructionsJson: string;
}): ActionCard {
  return {
    id: row.id,
    type: row.type as ActionCard["type"],
    status: row.status as ActionCard["status"],
    title: row.title,
    subtitle: row.subtitle,
    savings_inr: row.savingsInr,
    deadline: row.deadline,
    priority: row.priority as ActionCard["priority"],
    details: row.details ?? undefined,
    mismatch_id: row.mismatchId ?? undefined,
    tax_without_action_inr: row.taxWithoutActionInr ?? undefined,
    tax_with_action_inr: row.taxWithActionInr ?? undefined,
    instructions: JSON.parse(row.instructionsJson || "[]"),
  };
}

@Injectable()
export class TaxService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyService) private readonly families: FamilyService,
  ) {}

  async uploadAis(userId: string, dto: AisUploadDto): Promise<FirewallData> {
    await this.families.assertMember(userId, dto.familyId);

    let mismatches = demoData.firewall.mismatches;
    if (dto.payload && dto.payload !== "fixture") {
      mismatches = JSON.parse(dto.payload);
    }

    await this.prisma.firewallMismatch.deleteMany({ where: { familyId: dto.familyId } });
    for (const m of mismatches) {
      await this.prisma.firewallMismatch.create({
        data: {
          id: m.id,
          familyId: dto.familyId,
          type: m.type,
          severity: m.severity,
          title: m.title,
          description: m.description,
          amountInr: m.amount_inr,
          institution: m.institution,
          suggestedFix: m.suggested_fix,
          aisReference: m.ais_reference ?? null,
        },
      });
    }

    const needs = mismatches.filter((m) => m.severity !== "info").length;
    const status = needs >= 3 ? "attention" : needs > 0 ? "attention" : "clean";
    const meta = {
      status,
      lastScan: new Date(),
      aisEntriesChecked: demoData.firewall.status.ais_entries_checked,
      matched: demoData.firewall.status.matched,
      needsAttention: mismatches.length,
    };

    await this.prisma.firewallMeta.upsert({
      where: { familyId: dto.familyId },
      update: meta,
      create: { familyId: dto.familyId, ...meta },
    });

    return this.getFirewall(userId, dto.familyId);
  }

  async getFirewall(userId: string, familyId: string): Promise<FirewallData> {
    await this.families.assertMember(userId, familyId);
    const meta = await this.prisma.firewallMeta.findUnique({ where: { familyId } });
    const mismatches = await this.prisma.firewallMismatch.findMany({ where: { familyId } });
    if (!meta) throw new NotFoundException("No firewall scan yet — POST /tax/firewall/ais first");

    return {
      status: {
        status: meta.status as FirewallData["status"]["status"],
        last_scan: (meta.lastScan ?? new Date()).toISOString(),
        ais_entries_checked: meta.aisEntriesChecked,
        matched: meta.matched,
        needs_attention: meta.needsAttention,
      },
      mismatches: mismatches.map((m) => ({
        id: m.id,
        type: m.type as FirewallData["mismatches"][0]["type"],
        severity: m.severity as FirewallData["mismatches"][0]["severity"],
        title: m.title,
        description: m.description,
        amount_inr: m.amountInr,
        institution: m.institution,
        suggested_fix: m.suggestedFix,
        ais_reference: m.aisReference ?? undefined,
      })),
    };
  }

  async harvestScan(userId: string, dto: HarvestScanDto) {
    await this.families.assertMember(userId, dto.familyId);

    const taxLots = await this.prisma.taxLot.findMany({ where: { familyId: dto.familyId } });
    const assets = await this.prisma.asset.findMany({
      where: { familyId: dto.familyId },
      include: { lots: true },
    });

    const harvestLots: HarvestLot[] = [];
    if (taxLots.length) {
      for (const t of taxLots) {
        harvestLots.push({
          lot_id: t.lotRef,
          symbol: t.symbol,
          gain_loss_inr: t.gainLossInr,
          gain_type: t.gainType === "ltcg" ? "ltcg" : "stcg",
        });
      }
    } else {
      for (const a of assets) {
        for (const l of a.lots) {
          if (l.gainType === "none") continue;
          harvestLots.push({
            lot_id: l.id,
            symbol: a.symbol,
            gain_loss_inr: l.gainLossInr,
            gain_type: l.gainType === "ltcg" ? "ltcg" : "stcg",
          });
        }
      }
    }

    const result = pairHarvestLots(harvestLots);
    const cards: ActionCard[] = [];

    if (result.pairs.length > 0) {
      const primary = result.pairs[0];
      const lossLot = harvestLots.find((l) => l.lot_id === primary.loss_lot_id);
      const gainLot = harvestLots.find((l) => l.lot_id === primary.gain_lot_id);
      const id = `ac_harvest_${Date.now()}`;
      const card = await this.prisma.actionCardRecord.upsert({
        where: { id: "ac_001" },
        update: {
          status: "pending",
          savingsInr: result.total_tax_saved_inr,
          subtitle: `Estimated tax offset ₹${result.total_tax_saved_inr.toLocaleString("en-IN")}`,
          details: `Pair ${lossLot?.symbol ?? primary.loss_lot_id} loss against ${gainLot?.symbol ?? primary.gain_lot_id} gain. Instructions only — execute externally.`,
          instructionsJson: JSON.stringify([
            {
              action: "sell",
              symbol: lossLot?.symbol ?? "LOSS",
              quantity: 0,
              account: "external",
              lot_id: primary.loss_lot_id,
              loss_inr: Math.abs(lossLot?.gain_loss_inr ?? 0),
              offsets: `${gainLot?.symbol ?? primary.gain_lot_id} gain`,
            },
          ]),
        },
        create: {
          id,
          familyId: dto.familyId,
          type: "harvest",
          status: "pending",
          title: "Tax Harvest — loss offset opportunity",
          subtitle: `Estimated tax offset ₹${result.total_tax_saved_inr.toLocaleString("en-IN")}`,
          savingsInr: result.total_tax_saved_inr,
          deadline: "2026-03-31",
          priority: "high",
          details:
            "Pair loss lots against gains. CAPSTONE does not execute trades — follow instructions externally or with your broker.",
          instructionsJson: JSON.stringify([
            {
              action: "sell",
              symbol: lossLot?.symbol ?? "LOSS",
              quantity: 0,
              account: "external",
              lot_id: primary.loss_lot_id,
              loss_inr: Math.abs(lossLot?.gain_loss_inr ?? 0),
              offsets: `${gainLot?.symbol ?? primary.gain_lot_id} gain`,
            },
          ]),
        },
      });
      cards.push(toActionCard(card));
    }

    // Also ensure seeded harvest cards exist for demo continuity
    for (const seed of demoData.action_cards.filter((c) => c.type === "harvest")) {
      const existing = await this.prisma.actionCardRecord.findUnique({ where: { id: seed.id } });
      if (!existing) {
        const created = await this.prisma.actionCardRecord.create({
          data: {
            id: seed.id,
            familyId: dto.familyId,
            type: seed.type,
            status: seed.status,
            title: seed.title,
            subtitle: seed.subtitle,
            savingsInr: seed.savings_inr,
            deadline: seed.deadline,
            priority: seed.priority,
            details: seed.details ?? null,
            instructionsJson: JSON.stringify(seed.instructions ?? []),
            taxWithoutActionInr: seed.tax_without_action_inr ?? null,
            taxWithActionInr: seed.tax_with_action_inr ?? null,
          },
        });
        cards.push(toActionCard(created));
      }
    }

    return {
      family_id: dto.familyId,
      harvest: result,
      action_cards: cards.length ? cards : await this.listCards(userId, dto.familyId),
      note: "Action Cards are instructions only — never auto-executed.",
    };
  }

  async listCards(userId: string, familyId: string): Promise<ActionCard[]> {
    await this.families.assertMember(userId, familyId);
    const rows = await this.prisma.actionCardRecord.findMany({
      where: { familyId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toActionCard);
  }

  async patchCard(userId: string, cardId: string, status: string) {
    const card = await this.prisma.actionCardRecord.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException("Action card not found");
    await this.families.assertMember(userId, card.familyId);
    if (!["pending", "done", "dismissed"].includes(status)) {
      throw new NotFoundException("Invalid status");
    }
    const updated = await this.prisma.actionCardRecord.update({
      where: { id: cardId },
      data: { status },
    });
    return toActionCard(updated);
  }

  async advanceTax(userId: string, dto: AdvanceTaxDto) {
    await this.families.assertMember(userId, dto.familyId);
    const result = computeAdvanceTax({
      financial_year: "2025-26",
      projected_total_tax_inr: dto.projected_total_tax_inr ?? 85_00_000,
      tds_credited_inr: dto.tds_credited_inr ?? 12_00_000,
      advance_tax_paid_inr: dto.advance_tax_paid_inr ?? 20_00_000,
      as_of_date: dto.as_of_date ?? "2026-06-15",
    });
    return {
      family_id: dto.familyId,
      result,
      note: "Computed by packages/ca-buddy computeAdvanceTax",
    };
  }

  async listTaxLots(userId: string, familyId: string) {
    await this.families.assertMember(userId, familyId);
    return this.prisma.taxLot.findMany({ where: { familyId } });
  }
}

@Controller("tax")
@UseGuards(JwtAuthGuard)
export class TaxController {
  constructor(@Inject(TaxService) private readonly tax: TaxService) {}

  @Post("firewall/ais")
  uploadAis(@CurrentUser() user: JwtPayload, @Body() dto: AisUploadDto) {
    return this.tax.uploadAis(user.sub, dto);
  }

  @Get("firewall/status")
  status(@CurrentUser() user: JwtPayload, @Query("familyId") familyId: string) {
    return this.tax.getFirewall(user.sub, familyId);
  }

  @Post("harvest/scan")
  harvest(@CurrentUser() user: JwtPayload, @Body() dto: HarvestScanDto) {
    return this.tax.harvestScan(user.sub, dto);
  }

  @Get("action-cards")
  cards(@CurrentUser() user: JwtPayload, @Query("familyId") familyId: string) {
    return this.tax.listCards(user.sub, familyId);
  }

  @Patch("action-cards/:id")
  patch(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: PatchCardDto,
  ) {
    return this.tax.patchCard(user.sub, id, dto.status);
  }

  @Post("advance-tax")
  advance(@CurrentUser() user: JwtPayload, @Body() dto: AdvanceTaxDto) {
    return this.tax.advanceTax(user.sub, dto);
  }

  @Get("lots")
  lots(@CurrentUser() user: JwtPayload, @Query("familyId") familyId: string) {
    return this.tax.listTaxLots(user.sub, familyId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
