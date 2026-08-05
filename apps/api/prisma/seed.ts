/**
 * Idempotent Kapoor family seed for Track A local/CI.
 * Demo PANs are fictional fixtures — never real PII.
 */
import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { demoData } from "@capstone/demo-data";

const dbUrl =
  process.env.DATABASE_URL?.startsWith("file:") && !process.env.DATABASE_URL.includes("./")
    ? process.env.DATABASE_URL
    : `file:${path.resolve(process.cwd(), "prisma", "dev.db")}`;

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

function maskPan(pan: string): string {
  if (!pan || pan === "N/A" || pan.length < 4) return "XXXX";
  return `${pan.slice(0, 2)}****${pan.slice(-2)}`;
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`Seeding DB at ${dbUrl}`);
  const email = "vikram@kapoor.demo";
  const passwordHash = hashSync("capstone2026", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: "Vikram Kapoor" },
    create: {
      email,
      passwordHash,
      name: "Vikram Kapoor",
    },
  });

  const fam = demoData.family;
  const familyId = fam.family_id;

  await prisma.family.upsert({
    where: { id: familyId },
    update: {
      name: fam.name,
      onboardingStatus: "complete",
      totalNetWorthInr: fam.total_net_worth_inr,
      deltaTodayInr: fam.delta_today_inr,
      deltaMonthInr: fam.delta_month_inr,
      taxSavedYtdInr: fam.tax_saved_ytd_inr,
      heldAwayPct: fam.held_away_pct,
      primaryBank: fam.primary_bank,
      lastSync: new Date(fam.last_sync),
      nomineeGaps: fam.nominee_gaps,
      equityPct: fam.asset_classes.equity,
      debtPct: fam.asset_classes.debt,
      rePct: fam.asset_classes.re,
      altsPct: fam.asset_classes.alts,
      cashPct: fam.asset_classes.cash,
    },
    create: {
      id: familyId,
      name: fam.name,
      onboardingStatus: "complete",
      totalNetWorthInr: fam.total_net_worth_inr,
      deltaTodayInr: fam.delta_today_inr,
      deltaMonthInr: fam.delta_month_inr,
      taxSavedYtdInr: fam.tax_saved_ytd_inr,
      heldAwayPct: fam.held_away_pct,
      primaryBank: fam.primary_bank,
      lastSync: new Date(fam.last_sync),
      nomineeGaps: fam.nominee_gaps,
      equityPct: fam.asset_classes.equity,
      debtPct: fam.asset_classes.debt,
      rePct: fam.asset_classes.re,
      altsPct: fam.asset_classes.alts,
      cashPct: fam.asset_classes.cash,
    },
  });

  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId, userId: user.id } },
    update: { role: "owner" },
    create: { familyId, userId: user.id, role: "owner" },
  });

  for (const e of fam.entities) {
    if (e.type === "individual") {
      await prisma.person.upsert({
        where: { id: e.id },
        update: {
          name: e.name,
          panMasked: maskPan(e.pan),
          netWorthInr: e.net_worth_inr,
          role: e.role ?? null,
        },
        create: {
          id: e.id,
          familyId,
          name: e.name,
          panMasked: maskPan(e.pan),
          netWorthInr: e.net_worth_inr,
          role: e.role ?? null,
        },
      });
    } else {
      await prisma.legalEntity.upsert({
        where: { id: e.id },
        update: {
          type: e.type,
          name: e.name,
          panMasked: maskPan(e.pan),
          netWorthInr: e.net_worth_inr,
          kartaId: "karta" in e ? (e.karta as string | undefined) ?? null : null,
        },
        create: {
          id: e.id,
          familyId,
          type: e.type,
          name: e.name,
          panMasked: maskPan(e.pan),
          netWorthInr: e.net_worth_inr,
          kartaId: "karta" in e ? (e.karta as string | undefined) ?? null : null,
        },
      });
    }
  }

  await prisma.assetLot.deleteMany({ where: { asset: { familyId } } });
  await prisma.asset.deleteMany({ where: { familyId } });

  for (const h of demoData.holdings) {
    await prisma.asset.create({
      data: {
        id: h.id,
        familyId,
        symbol: h.symbol,
        name: h.name,
        assetType: h.asset_type,
        custodian: h.custodian,
        heldByEntityId: h.held_by_entity_id,
        quantity: h.quantity,
        currentValueInr: h.current_value_inr,
        costBasisInr: h.cost_basis_inr,
        gainLossInr: h.gain_loss_inr,
        gainType: h.gain_type,
        source: h.source,
        lots: {
          create: h.lots.map((l) => ({
            id: l.lot_id,
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

  await prisma.firewallMismatch.deleteMany({ where: { familyId } });
  await prisma.firewallMeta.upsert({
    where: { familyId },
    update: {
      status: demoData.firewall.status.status,
      lastScan: new Date(demoData.firewall.status.last_scan),
      aisEntriesChecked: demoData.firewall.status.ais_entries_checked,
      matched: demoData.firewall.status.matched,
      needsAttention: demoData.firewall.status.needs_attention,
    },
    create: {
      familyId,
      status: demoData.firewall.status.status,
      lastScan: new Date(demoData.firewall.status.last_scan),
      aisEntriesChecked: demoData.firewall.status.ais_entries_checked,
      matched: demoData.firewall.status.matched,
      needsAttention: demoData.firewall.status.needs_attention,
    },
  });

  for (const m of demoData.firewall.mismatches) {
    await prisma.firewallMismatch.create({
      data: {
        id: m.id,
        familyId,
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

  for (const c of demoData.action_cards) {
    await prisma.actionCardRecord.upsert({
      where: { id: c.id },
      update: {
        type: c.type,
        status: c.status,
        title: c.title,
        subtitle: c.subtitle,
        savingsInr: c.savings_inr,
        deadline: c.deadline,
        priority: c.priority,
        details: c.details ?? null,
        mismatchId: c.mismatch_id ?? null,
        taxWithoutActionInr: c.tax_without_action_inr ?? null,
        taxWithActionInr: c.tax_with_action_inr ?? null,
        instructionsJson: JSON.stringify(c.instructions ?? []),
      },
      create: {
        id: c.id,
        familyId,
        type: c.type,
        status: c.status,
        title: c.title,
        subtitle: c.subtitle,
        savingsInr: c.savings_inr,
        deadline: c.deadline,
        priority: c.priority,
        details: c.details ?? null,
        mismatchId: c.mismatch_id ?? null,
        taxWithoutActionInr: c.tax_without_action_inr ?? null,
        taxWithActionInr: c.tax_with_action_inr ?? null,
        instructionsJson: JSON.stringify(c.instructions ?? []),
      },
    });
  }

  await prisma.nominee.deleteMany({ where: { familyId } });
  const nomineeSeeds = [
    {
      accountLabel: "Zerodha Demat — Vikram",
      institution: "Zerodha",
      assetType: "equity",
      hasNominee: false,
    },
    {
      accountLabel: "HDFC Savings — Joint",
      institution: "HDFC Bank",
      assetType: "cash",
      hasNominee: false,
    },
    {
      accountLabel: "Groww MF Folio",
      institution: "Groww",
      assetType: "mf",
      hasNominee: true,
      nomineeName: "Ananya Kapoor",
    },
  ];
  for (const n of nomineeSeeds) {
    await prisma.nominee.create({
      data: { familyId, ...n },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded family ${familyId} for user ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
