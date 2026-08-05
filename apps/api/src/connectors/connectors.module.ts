import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
  OnModuleInit,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { IsOptional, IsString } from "class-validator";
import { randomUUID } from "node:crypto";
import { AuthModule, FamilyService } from "../auth/auth.module";
import { JwtPayload, CurrentUser, JwtAuthGuard } from "../auth/auth.guards";
import { PrismaService } from "../prisma/prisma.module";
import { IngestionModule, IngestionService, NetWorthService } from "../ingestion/ingestion.module";
import { createTspClient } from "../ingestion/tsp";
import { encryptSecret, decryptSecret } from "./crypto";
import type { ConnectorCatalogItem, ConnectorProvider, SyncedHolding } from "./types";
import {
  buildUpstoxAuthUrl,
  exchangeUpstoxCode,
  fetchUpstoxHoldings,
  upstoxConfigured,
  upstoxMissingEnv,
} from "./upstox";
import {
  buildZerodhaAuthUrl,
  exchangeZerodhaToken,
  fetchZerodhaHoldings,
  zerodhaConfigured,
  zerodhaMissingEnv,
} from "./zerodha";

class StartConnectDto {
  @IsString()
  familyId!: string;

  @IsOptional()
  @IsString()
  returnTo?: string;
}

class SyncDto {
  @IsString()
  familyId!: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

@Injectable()
export class ConnectorsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyService) private readonly families: FamilyService,
    @Inject(NetWorthService) private readonly netWorth: NetWorthService,
  ) {}

  catalog(): ConnectorCatalogItem[] {
    const webBase = process.env.WEB_APP_URL ?? "http://localhost:3000";
    void webBase;
    return [
      {
        provider: "upstox",
        label: "Upstox",
        kind: "broker_oauth",
        description: "Redirect to Upstox login — read-only holdings sync every 6 hours.",
        configured: upstoxConfigured(),
        missing_env: upstoxMissingEnv(),
      },
      {
        provider: "zerodha",
        label: "Zerodha Kite",
        kind: "broker_oauth",
        description: "Redirect to Zerodha login — read-only holdings sync every 6 hours.",
        configured: zerodhaConfigured(),
        missing_env: zerodhaMissingEnv(),
      },
      {
        provider: "aa",
        label: "Banks & MF (Account Aggregator)",
        kind: "account_aggregator",
        description: "RBI AA consent journey for banks, MF, demat — never bank passwords.",
        configured: Boolean(process.env.TSP_API_KEY && process.env.TSP_BASE_URL),
        missing_env: [
          ...(!process.env.TSP_API_KEY ? ["TSP_API_KEY"] : []),
          ...(!process.env.TSP_BASE_URL ? ["TSP_BASE_URL"] : []),
        ],
      },
    ];
  }

  async listConnections(userId: string, familyId: string) {
    await this.families.assertMember(userId, familyId);
    const rows = await this.prisma.brokerConnection.findMany({ where: { familyId } });
    return rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      status: r.status,
      external_user_id: r.externalUserId,
      last_sync_at: r.lastSyncAt?.toISOString() ?? null,
      last_error: r.lastError,
      has_token: Boolean(r.accessTokenEnc),
    }));
  }

  async discover(userId: string, familyId: string) {
    await this.families.assertMember(userId, familyId);
    const person = await this.prisma.person.findFirst({ where: { familyId } });
    if (!person?.panLast4) {
      throw new BadRequestException("Complete profile with PAN first");
    }
    const catalog = this.catalog();
    const connections = await this.listConnections(userId, familyId);
    return {
      pan_masked: person.panMasked,
      message:
        "PAN identifies your portfolio. Holdings are fetched only after you authenticate each bank/broker (OAuth or AA consent) — never by scraping passwords.",
      connectors: catalog.map((c) => ({
        ...c,
        connection: connections.find((x) => x.provider === c.provider) ?? null,
      })),
    };
  }

  async start(userId: string, provider: ConnectorProvider, dto: StartConnectDto) {
    await this.families.assertMember(userId, dto.familyId);
    const state = randomUUID();
    const webBase = process.env.WEB_APP_URL ?? "http://localhost:3000";
    const returnTo = dto.returnTo ?? "/onboarding/connect";

    if (provider === "upstox") {
      if (!upstoxConfigured()) {
        throw new BadRequestException(
          `Upstox not configured. Set ${upstoxMissingEnv().join(", ")} in apps/api/.env (create app at account.upstox.com/developer/apps). Redirect URI must be ${process.env.UPSTOX_REDIRECT_URI ?? `${webBase}/onboarding/connect/callback?provider=upstox`}`,
        );
      }
      const conn = await this.prisma.brokerConnection.upsert({
        where: { familyId_provider: { familyId: dto.familyId, provider } },
        create: {
          familyId: dto.familyId,
          provider,
          status: "pending",
          oauthState: state,
          metaJson: JSON.stringify({ returnTo }),
        },
        update: { status: "pending", oauthState: state, lastError: null, metaJson: JSON.stringify({ returnTo }) },
      });
      return {
        provider,
        redirect_url: buildUpstoxAuthUrl(state),
        state,
        connection_id: conn.id,
        message: "Redirecting to Upstox login…",
      };
    }

    if (provider === "zerodha") {
      if (!zerodhaConfigured()) {
        throw new BadRequestException(
          `Zerodha not configured. Set ${zerodhaMissingEnv().join(", ")} (developers.kite.trade).`,
        );
      }
      const conn = await this.prisma.brokerConnection.upsert({
        where: { familyId_provider: { familyId: dto.familyId, provider } },
        create: {
          familyId: dto.familyId,
          provider,
          status: "pending",
          oauthState: state,
          metaJson: JSON.stringify({ returnTo }),
        },
        update: { status: "pending", oauthState: state, lastError: null, metaJson: JSON.stringify({ returnTo }) },
      });
      return {
        provider,
        redirect_url: buildZerodhaAuthUrl(state),
        state,
        connection_id: conn.id,
        message: "Redirecting to Zerodha login…",
      };
    }

    if (provider === "aa") {
      const tsp = createTspClient();
      const created = await tsp.createConsent({ familyId: dto.familyId });
      const conn = await this.prisma.brokerConnection.upsert({
        where: { familyId_provider: { familyId: dto.familyId, provider: "aa" } },
        create: {
          familyId: dto.familyId,
          provider: "aa",
          status: created.redirectUrl ? "pending" : "active",
          oauthState: state,
          externalUserId: created.consentRef,
          metaJson: JSON.stringify({ returnTo, fipTypes: created.fipTypes }),
        },
        update: {
          status: created.redirectUrl ? "pending" : "active",
          oauthState: state,
          externalUserId: created.consentRef,
          lastError: null,
        },
      });

      await this.prisma.aaConsent.create({
        data: {
          familyId: dto.familyId,
          status: created.status,
          tsp: created.tsp,
          fipTypes: JSON.stringify(created.fipTypes),
          consentRef: created.consentRef,
          expiresAt: created.expiresAt,
        },
      });

      // If TSP returns a real AA journey URL, use it; else in-app consent confirmation
      const redirect =
        created.redirectUrl ??
        `${webBase}/onboarding/connect/aa-journey?state=${encodeURIComponent(state)}&familyId=${encodeURIComponent(dto.familyId)}`;

      return {
        provider,
        redirect_url: redirect,
        state,
        connection_id: conn.id,
        message: created.message ?? "Complete Account Aggregator consent for your banks.",
      };
    }

    throw new BadRequestException(`Unknown provider: ${provider}`);
  }

  async handleCallback(provider: ConnectorProvider, query: Record<string, string | undefined>) {
    const state = query.state;
    const code = query.code ?? query.request_token;
    if (!state) throw new BadRequestException("Missing OAuth state");
    if (!code) throw new BadRequestException("Missing authorization code — login was cancelled or failed");

    const conn = await this.prisma.brokerConnection.findFirst({ where: { oauthState: state, provider } });
    if (!conn) throw new BadRequestException("Unknown or expired OAuth state");

    try {
      if (provider === "upstox") {
        const token = await exchangeUpstoxCode(code);
        await this.prisma.brokerConnection.update({
          where: { id: conn.id },
          data: {
            status: "active",
            accessTokenEnc: encryptSecret(token.access_token),
            extendedTokenEnc: token.extended_token ? encryptSecret(token.extended_token) : null,
            externalUserId: token.user_id ?? null,
            oauthState: null,
            lastError: null,
            // Upstox tokens expire ~3:30 AM next day IST — refresh via re-auth or extended token
            tokenExpiresAt: nextUpstoxExpiry(),
            metaJson: JSON.stringify({
              ...JSON.parse(conn.metaJson || "{}"),
              user_name: token.user_name,
              email: token.email,
            }),
          },
        });
      } else if (provider === "zerodha") {
        const token = await exchangeZerodhaToken(code);
        await this.prisma.brokerConnection.update({
          where: { id: conn.id },
          data: {
            status: "active",
            accessTokenEnc: encryptSecret(token.access_token),
            externalUserId: token.user_id ?? null,
            oauthState: null,
            lastError: null,
            tokenExpiresAt: nextUpstoxExpiry(),
            metaJson: JSON.stringify({
              ...JSON.parse(conn.metaJson || "{}"),
              user_name: token.user_name,
              email: token.email,
            }),
          },
        });
      } else {
        throw new BadRequestException("AA uses aa-journey confirmation, not OAuth code");
      }

      const synced = await this.syncConnection(conn.id);
      const meta = JSON.parse(conn.metaJson || "{}") as { returnTo?: string };
      return {
        ok: true,
        family_id: conn.familyId,
        provider,
        holdings_synced: synced.holdings_synced,
        return_to: meta.returnTo ?? "/onboarding/connect",
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OAuth callback failed";
      await this.prisma.brokerConnection.update({
        where: { id: conn.id },
        data: { status: "error", lastError: msg },
      });
      throw new BadRequestException(msg);
    }
  }

  async confirmAaJourney(userId: string, familyId: string, state: string) {
    await this.families.assertMember(userId, familyId);
    const conn = await this.prisma.brokerConnection.findFirst({
      where: { familyId, provider: "aa", oauthState: state },
    });
    if (!conn) throw new BadRequestException("Unknown AA journey state");

    // Mark active; real FI data arrives only when TSP is configured — sync attempts fetch
    await this.prisma.brokerConnection.update({
      where: { id: conn.id },
      data: { status: "active", oauthState: null, lastError: null },
    });

    await this.prisma.linkedAccount.create({
      data: {
        familyId,
        custodian: "Account Aggregator",
        accountType: "bank",
        source: "aa",
        status: "active",
        label: "AA consent",
        externalRef: conn.externalUserId,
      },
    });

    const tsp = createTspClient();
    const consentRef = conn.externalUserId ?? "";
    const holdings = await tsp.fetchAccounts(consentRef, familyId);
    let holdingsSynced = 0;
    if (holdings.length) {
      holdingsSynced = await this.persistBrokerHoldings(familyId, "aa", holdings.map(h => ({
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity,
        averagePriceInr: h.costBasisInr / (h.quantity || 1),
        lastPriceInr: h.currentValueInr / (h.quantity || 1),
        pnlInr: h.gainLossInr,
      })));
    }
    await this.netWorth.recompute(familyId);

    return {
      ok: true,
      family_id: familyId,
      holdings_synced: holdingsSynced,
      message:
        holdingsSynced > 0
          ? "AA accounts synced."
          : "AA consent saved. Bank/MF data appears when TSP keys are live — connect Upstox/Zerodha for broker holdings now.",
    };
  }

  async syncFamily(userId: string, dto: SyncDto) {
    await this.families.assertMember(userId, dto.familyId);
    const where = {
      familyId: dto.familyId,
      status: "active",
      ...(dto.provider ? { provider: dto.provider } : {}),
    };
    const conns = await this.prisma.brokerConnection.findMany({ where });
    const results = [];
    for (const c of conns) {
      results.push(await this.syncConnection(c.id));
    }
    await this.netWorth.recompute(dto.familyId);
    return { family_id: dto.familyId, results };
  }

  async syncAllActive() {
    const conns = await this.prisma.brokerConnection.findMany({ where: { status: "active" } });
    const byFamily = new Map<string, string[]>();
    for (const c of conns) {
      const r = await this.syncConnection(c.id);
      const list = byFamily.get(c.familyId) ?? [];
      list.push(`${c.provider}:${r.holdings_synced}`);
      byFamily.set(c.familyId, list);
    }
    for (const familyId of byFamily.keys()) {
      await this.netWorth.recompute(familyId);
    }
    return { families: byFamily.size, connections: conns.length };
  }

  private async syncConnection(connectionId: string) {
    const conn = await this.prisma.brokerConnection.findUniqueOrThrow({ where: { id: connectionId } });
    if (conn.status !== "active" || !conn.accessTokenEnc) {
      if (conn.provider === "aa") {
        return { provider: conn.provider, holdings_synced: 0, skipped: true };
      }
      return { provider: conn.provider, holdings_synced: 0, skipped: true };
    }

    try {
      const token = decryptSecret(conn.accessTokenEnc);
      let holdings: SyncedHolding[] = [];
      if (conn.provider === "upstox") holdings = await fetchUpstoxHoldings(token);
      else if (conn.provider === "zerodha") holdings = await fetchZerodhaHoldings(token);
      else return { provider: conn.provider, holdings_synced: 0, skipped: true };

      const count = await this.persistBrokerHoldings(conn.familyId, conn.provider, holdings);
      await this.prisma.brokerConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date(), lastError: null },
      });
      await this.prisma.linkedAccount.upsert({
        where: { id: `link_${conn.familyId}_${conn.provider}` },
        create: {
          id: `link_${conn.familyId}_${conn.provider}`,
          familyId: conn.familyId,
          custodian: conn.provider,
          accountType: "broker",
          source: "aa",
          status: "active",
          label: `${conn.provider} OAuth`,
          externalRef: conn.externalUserId,
          balanceInr: holdings.reduce((s, h) => s + h.quantity * h.lastPriceInr, 0),
        },
        update: {
          status: "active",
          balanceInr: holdings.reduce((s, h) => s + h.quantity * h.lastPriceInr, 0),
        },
      });
      return { provider: conn.provider, holdings_synced: count, skipped: false };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "sync failed";
      await this.prisma.brokerConnection.update({
        where: { id: conn.id },
        data: { lastError: msg, status: msg.includes("401") || msg.includes("403") ? "expired" : "error" },
      });
      return { provider: conn.provider, holdings_synced: 0, error: msg, skipped: false };
    }
  }

  private async persistBrokerHoldings(familyId: string, provider: string, holdings: SyncedHolding[]) {
    const person = await this.prisma.person.findFirst({ where: { familyId } });
    const heldBy = person?.id ?? `person_${familyId}`;
    let count = 0;

    const existing = await this.prisma.asset.findMany({ where: { familyId, source: "aa" } });
    for (const a of existing) {
      if (a.custodian.toLowerCase() === provider.toLowerCase() || a.id.startsWith(`br_${provider}_`)) {
        await this.prisma.asset.delete({ where: { id: a.id } });
      }
    }

    for (const h of holdings) {
      if (!h.quantity) continue;
      const id = `br_${provider}_${familyId}_${h.symbol}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
      const current = h.quantity * h.lastPriceInr;
      const cost = h.quantity * h.averagePriceInr;
      await this.prisma.asset.upsert({
        where: { id },
        update: {
          quantity: h.quantity,
          currentValueInr: current,
          costBasisInr: cost,
          gainLossInr: h.pnlInr || current - cost,
          name: h.name,
          custodian: provider,
        },
        create: {
          id,
          familyId,
          symbol: h.symbol,
          name: h.name,
          assetType: "equity",
          custodian: provider,
          heldByEntityId: heldBy,
          quantity: h.quantity,
          currentValueInr: current,
          costBasisInr: cost,
          gainLossInr: h.pnlInr || current - cost,
          gainType: "none",
          source: "aa",
        },
      });
      count += 1;
    }
    return count;
  }
}

function nextUpstoxExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setUTCHours(22, 0, 0, 0); // ~3:30 AM IST
  return d;
}

@Controller("connectors")
export class ConnectorsController {
  constructor(@Inject(ConnectorsService) private readonly connectors: ConnectorsService) {}

  @Get("catalog")
  catalog() {
    return this.connectors.catalog();
  }

  @UseGuards(JwtAuthGuard)
  @Get("discover")
  discover(@CurrentUser() user: JwtPayload, @Query("familyId") familyId: string) {
    if (!familyId) throw new BadRequestException("familyId required");
    return this.connectors.discover(user.sub, familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":familyId/connections")
  connections(@CurrentUser() user: JwtPayload, @Param("familyId") familyId: string) {
    return this.connectors.listConnections(user.sub, familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":provider/start")
  start(
    @CurrentUser() user: JwtPayload,
    @Param("provider") provider: string,
    @Body() dto: StartConnectDto,
  ) {
    return this.connectors.start(user.sub, provider as ConnectorProvider, dto);
  }

  /** Browser redirect from Upstox/Zerodha — no JWT; state binds to connection. */
  @Get(":provider/callback")
  async callbackGet(
    @Param("provider") provider: string,
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const webBase = process.env.WEB_APP_URL ?? "http://localhost:3000";
    try {
      const result = await this.connectors.handleCallback(provider as ConnectorProvider, query);
      const dest = new URL(result.return_to, webBase);
      dest.searchParams.set("connected", provider);
      dest.searchParams.set("holdings", String(result.holdings_synced));
      return res.redirect(dest.toString());
    } catch (e) {
      const dest = new URL("/onboarding/connect", webBase);
      dest.searchParams.set("error", e instanceof Error ? e.message : "oauth_failed");
      return res.redirect(dest.toString());
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("aa/confirm")
  confirmAa(
    @CurrentUser() user: JwtPayload,
    @Body() body: { familyId: string; state: string },
  ) {
    return this.connectors.confirmAaJourney(user.sub, body.familyId, body.state);
  }

  @UseGuards(JwtAuthGuard)
  @Post("sync")
  sync(@CurrentUser() user: JwtPayload, @Body() dto: SyncDto) {
    return this.connectors.syncFamily(user.sub, dto);
  }
}

@Injectable()
export class ConnectorSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private interval?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(ConnectorsService) private readonly connectors: ConnectorsService,
    @Inject(IngestionService) private readonly ingestion: IngestionService,
  ) {}

  onModuleInit() {
    if (process.env.AA_SYNC_ENABLED === "false") return;
    if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return;
    const ms = Number(process.env.AA_SYNC_INTERVAL_MS ?? 6 * 60 * 60 * 1000);
    this.interval = setInterval(() => {
      void this.connectors.syncAllActive();
      void this.ingestion.syncAllActiveConsents();
    }, ms);
    // eslint-disable-next-line no-console
    console.log(`Connector + AA sync scheduler: every ${ms}ms`);
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }
}

@Module({
  imports: [AuthModule, IngestionModule],
  controllers: [ConnectorsController],
  providers: [ConnectorsService, ConnectorSyncScheduler],
  exports: [ConnectorsService],
})
export class ConnectorsModule {}
