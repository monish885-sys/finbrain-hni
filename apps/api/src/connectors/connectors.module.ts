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
import { createTspClient, parseSetuFiPayload, setuConfigured, setuMissingEnv, type TspHolding } from "../ingestion/tsp";
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
        label: "Banks, MF & demat (Setu Account Aggregator)",
        kind: "account_aggregator",
        description:
          "One RBI AA consent via Setu — banks, mutual funds, and demat in a single journey. No broker API keys.",
        configured: setuConfigured(),
        missing_env: setuMissingEnv(),
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
      const person =
        (await this.prisma.person.findFirst({
          where: { familyId: dto.familyId, role: "principal" },
        })) ??
        (await this.prisma.person.findFirst({
          where: { familyId: dto.familyId, mobile: { not: null } },
        })) ??
        (await this.prisma.person.findFirst({ where: { familyId: dto.familyId } }));
      const tsp = createTspClient();
      let created;
      try {
        created = await tsp.createConsent({
          familyId: dto.familyId,
          vua: person?.mobile ?? undefined,
          redirectUrl: `${webBase}/onboarding/connect/aa-return`,
        });
      } catch (e) {
        throw new BadRequestException(e instanceof Error ? e.message : "AA consent failed");
      }
      const conn = await this.prisma.brokerConnection.upsert({
        where: { familyId_provider: { familyId: dto.familyId, provider: "aa" } },
        create: {
          familyId: dto.familyId,
          provider: "aa",
          status: created.redirectUrl && created.tsp === "setu" ? "pending" : created.redirectUrl ? "pending" : "active",
          oauthState: state,
          externalUserId: created.consentRef,
          metaJson: JSON.stringify({ returnTo, fipTypes: created.fipTypes, tsp: created.tsp }),
        },
        update: {
          status: "pending",
          oauthState: state,
          externalUserId: created.consentRef,
          lastError: null,
          metaJson: JSON.stringify({ returnTo, fipTypes: created.fipTypes, tsp: created.tsp }),
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

      // Live Setu → redirect to Setu webview; simulated → in-app confirm
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

    return this.finalizeAaConsent(familyId, conn.externalUserId ?? "", conn.id);
  }

  /**
   * Setu redirects here after consent: ?success=true&id=<consentId>&familyId=...
   */
  async completeAaReturn(
    userId: string,
    query: { success?: string; id?: string; familyId?: string; errorcode?: string; errormsg?: string },
  ) {
    const familyId = query.familyId;
    const consentId = query.id;
    if (!familyId || !consentId) {
      throw new BadRequestException("familyId and consent id required from Setu redirect");
    }
    await this.families.assertMember(userId, familyId);

    if (query.success === "false") {
      const msg = query.errormsg || `Consent rejected (code ${query.errorcode ?? "?"})`;
      await this.prisma.brokerConnection.updateMany({
        where: { familyId, provider: "aa", externalUserId: consentId },
        data: { status: "error", lastError: msg },
      });
      throw new BadRequestException(msg);
    }

    const conn = await this.prisma.brokerConnection.findFirst({
      where: { familyId, provider: "aa", externalUserId: consentId },
    });
    if (!conn) {
      throw new BadRequestException("No AA connection for this consent — restart Connect AA");
    }

    // Poll until ACTIVE (user just approved; Setu may lag briefly)
    const tsp = createTspClient();
    for (let i = 0; i < 8; i++) {
      const st = await tsp.getConsentStatus(consentId);
      const n = st.status.toUpperCase();
      if (n === "ACTIVE" || n === "APPROVED") break;
      if (n === "REJECTED" || n === "REVOKED") {
        throw new BadRequestException(`Consent ${n}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    await this.prisma.aaConsent.updateMany({
      where: { familyId, consentRef: consentId },
      data: { status: "active" },
    });

    return this.finalizeAaConsent(familyId, consentId, conn.id);
  }

  /** Public Setu Bridge webhook — no JWT. */
  async handleSetuWebhook(body: Record<string, unknown>) {
    const type = String(body.type ?? "");
    const consentId = String(body.consentId ?? body.id ?? "");
    if (!consentId) return { ok: true, ignored: true };

    const consent = await this.prisma.aaConsent.findFirst({
      where: { consentRef: consentId },
      orderBy: { createdAt: "desc" },
    });
    if (!consent) return { ok: true, ignored: true, reason: "unknown_consent" };

    if (type === "CONSENT_STATUS_UPDATE") {
      const data = (body.data ?? {}) as { status?: string };
      const status = String(data.status ?? "").toLowerCase() || "pending";
      await this.prisma.aaConsent.update({
        where: { id: consent.id },
        data: { status: status === "approved" ? "active" : status },
      });
      if (status === "active" || status === "approved") {
        await this.prisma.brokerConnection.updateMany({
          where: { familyId: consent.familyId, provider: "aa", externalUserId: consentId },
          data: { status: "active", lastError: null },
        });
      }
      return { ok: true, type, consentId };
    }

    if (type === "FI_DATA_READY") {
      const holdings = parseWebhookOrFetch(body);
      if (holdings.length) {
        await this.persistTspHoldings(consent.familyId, holdings);
        await this.netWorth.recompute(consent.familyId);
        await this.prisma.brokerConnection.updateMany({
          where: { familyId: consent.familyId, provider: "aa" },
          data: { status: "active", lastSyncAt: new Date(), lastError: null },
        });
      }
      return { ok: true, type, consentId, holdings: holdings.length };
    }

    return { ok: true, type, ignored: true };
  }

  private async finalizeAaConsent(familyId: string, consentRef: string, connectionId: string) {
    await this.prisma.brokerConnection.update({
      where: { id: connectionId },
      data: { status: "active", oauthState: null, lastError: null },
    });

    await this.prisma.linkedAccount.upsert({
      where: { id: `link_${familyId}_aa` },
      create: {
        id: `link_${familyId}_aa`,
        familyId,
        custodian: "Account Aggregator (Setu)",
        accountType: "aggregator",
        source: "aa",
        status: "active",
        label: "AA consent",
        externalRef: consentRef,
      },
      update: {
        status: "active",
        externalRef: consentRef,
        custodian: "Account Aggregator (Setu)",
      },
    });

    const tsp = createTspClient();
    let holdings: TspHolding[] = [];
    let fetchError: string | null = null;
    try {
      holdings = await tsp.fetchAccounts(consentRef, familyId);
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "FI fetch failed";
    }

    let holdingsSynced = 0;
    if (holdings.length) {
      holdingsSynced = await this.persistTspHoldings(familyId, holdings);
    }
    await this.netWorth.recompute(familyId);
    await this.prisma.brokerConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: holdingsSynced > 0 ? new Date() : undefined,
        lastError: fetchError,
      },
    });

    return {
      ok: true,
      family_id: familyId,
      holdings_synced: holdingsSynced,
      message:
        holdingsSynced > 0
          ? "AA accounts synced via Setu."
          : fetchError
            ? `Consent saved. Data fetch pending: ${fetchError}. Use Sync now in a minute, or wait for Setu webhook.`
            : "Consent saved. Holdings will appear after Setu FI data is ready — tap Sync now.",
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
    if (conn.status !== "active") {
      return { provider: conn.provider, holdings_synced: 0, skipped: true };
    }

    if (conn.provider === "aa") {
      const consentRef = conn.externalUserId;
      if (!consentRef) return { provider: "aa", holdings_synced: 0, skipped: true };
      try {
        const tsp = createTspClient();
        const holdings = await tsp.fetchAccounts(consentRef, conn.familyId);
        const count = await this.persistTspHoldings(conn.familyId, holdings);
        await this.prisma.brokerConnection.update({
          where: { id: conn.id },
          data: { lastSyncAt: new Date(), lastError: null },
        });
        return { provider: "aa", holdings_synced: count, skipped: false };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "AA sync failed";
        await this.prisma.brokerConnection.update({
          where: { id: conn.id },
          data: { lastError: msg },
        });
        return { provider: "aa", holdings_synced: 0, error: msg, skipped: false };
      }
    }

    if (!conn.accessTokenEnc) {
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

  private async persistTspHoldings(familyId: string, holdings: TspHolding[]) {
    const person = await this.prisma.person.findFirst({ where: { familyId } });
    const heldBy = person?.id ?? `person_${familyId}`;
    let count = 0;

    const existing = await this.prisma.asset.findMany({ where: { familyId, source: "aa" } });
    for (const a of existing) {
      if (a.id.startsWith("br_aa_") || a.id.startsWith("dep_") || a.id.startsWith("mf_") || a.id.startsWith("eq_")) {
        await this.prisma.asset.delete({ where: { id: a.id } });
      }
    }

    for (const h of holdings) {
      if (!h.currentValueInr && !h.quantity) continue;
      const id = (h.id || `br_aa_${familyId}_${h.symbol}`).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
      await this.prisma.asset.upsert({
        where: { id },
        update: {
          quantity: h.quantity,
          currentValueInr: h.currentValueInr,
          costBasisInr: h.costBasisInr,
          gainLossInr: h.gainLossInr,
          name: h.name,
          custodian: h.custodian,
          assetType: h.assetType,
        },
        create: {
          id,
          familyId,
          symbol: h.symbol,
          name: h.name,
          assetType: h.assetType || "equity",
          custodian: h.custodian,
          heldByEntityId: heldBy,
          quantity: h.quantity,
          currentValueInr: h.currentValueInr,
          costBasisInr: h.costBasisInr,
          gainLossInr: h.gainLossInr,
          gainType: h.gainType || "none",
          source: "aa",
        },
      });
      count += 1;
    }
    return count;
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

function parseWebhookOrFetch(body: Record<string, unknown>): TspHolding[] {
  return parseSetuFiPayload(body);
}

@Controller("connectors")
export class ConnectorsController {
  constructor(@Inject(ConnectorsService) private readonly connectors: ConnectorsService) {}

  @Get("catalog")
  catalog() {
    return this.connectors.catalog();
  }

  /** Setu Bridge notification URL — https://<api-host>/connectors/webhooks/setu */
  @Post("webhooks/setu")
  setuWebhook(@Body() body: Record<string, unknown>) {
    return this.connectors.handleSetuWebhook(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("discover")
  discover(@CurrentUser() user: JwtPayload, @Query("familyId") familyId: string) {
    if (!familyId) throw new BadRequestException("familyId required");
    return this.connectors.discover(user.sub, familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("aa/confirm")
  confirmAa(
    @CurrentUser() user: JwtPayload,
    @Body() body: { familyId: string; state: string },
  ) {
    return this.connectors.confirmAaJourney(user.sub, body.familyId, body.state);
  }

  /** After Setu webview — client posts query params from redirect. */
  @UseGuards(JwtAuthGuard)
  @Post("aa/complete")
  completeAa(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: { success?: string; id?: string; familyId?: string; errorcode?: string; errormsg?: string },
  ) {
    return this.connectors.completeAaReturn(user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post("sync")
  sync(@CurrentUser() user: JwtPayload, @Body() dto: SyncDto) {
    return this.connectors.syncFamily(user.sub, dto);
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
