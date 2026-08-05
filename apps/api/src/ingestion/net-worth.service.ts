import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.module";

const EQUITY = new Set(["equity", "mf", "etf"]);
const DEBT = new Set(["fd", "debt", "bond"]);
const RE = new Set(["re", "real_estate", "property"]);
const ALTS = new Set(["pms", "aif", "alts", "gold", "insurance"]);
const CASH = new Set(["cash", "bank", "savings"]);

@Injectable()
export class NetWorthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Recompute family totals + allocation % from Asset rows. */
  async recompute(familyId: string) {
    const assets = await this.prisma.asset.findMany({ where: { familyId } });
    const total = assets.reduce((s, a) => s + a.currentValueInr, 0);

    let equity = 0;
    let debt = 0;
    let re = 0;
    let alts = 0;
    let cash = 0;

    for (const a of assets) {
      const t = a.assetType.toLowerCase();
      if (EQUITY.has(t)) equity += a.currentValueInr;
      else if (DEBT.has(t)) debt += a.currentValueInr;
      else if (RE.has(t)) re += a.currentValueInr;
      else if (CASH.has(t)) cash += a.currentValueInr;
      else if (ALTS.has(t)) alts += a.currentValueInr;
      else alts += a.currentValueInr;
    }

    const pct = (v: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);

    const persons = await this.prisma.person.findMany({ where: { familyId } });
    if (persons.length === 1) {
      await this.prisma.person.update({
        where: { id: persons[0].id },
        data: { netWorthInr: total },
      });
    }

    const banks = assets.filter((a) => CASH.has(a.assetType.toLowerCase()) || a.assetType === "fd");
    const primaryBank = banks.sort((a, b) => b.currentValueInr - a.currentValueInr)[0]?.custodian ?? "";

    return this.prisma.family.update({
      where: { id: familyId },
      data: {
        totalNetWorthInr: total,
        equityPct: pct(equity),
        debtPct: pct(debt),
        rePct: pct(re),
        altsPct: pct(alts),
        cashPct: pct(cash),
        primaryBank: primaryBank || undefined,
        lastSync: new Date(),
      },
    });
  }
}
