import "reflect-metadata";
import "dotenv/config";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Client onboarding e2e", () => {
  let app: INestApplication;
  let token: string;
  let familyId: string;
  const email = `client_${Date.now()}@example.com`;
  const password = "testpass123";

  beforeAll(async () => {
    process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), "prisma", "dev.db")}`;
    process.env.JWT_SECRET ??= "capstone-dev-jwt-secret-change-in-prod";
    process.env.AA_SYNC_ENABLED = "false";
    process.env.DESK_SCHEDULER_ENABLED = "false";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it("registers a new client", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password, name: "Test Client" })
      .expect(201);
    token = res.body.access_token as string;
    expect(token).toBeTruthy();
  });

  it("starts with pending_profile onboarding", async () => {
    const res = await request(app.getHttpServer()).get("/onboarding/status").set(auth()).expect(200);
    expect(res.body.onboarding_status).toBe("pending_profile");
    expect(res.body.family_id).toBeNull();
  });

  it("creates profile with masked PAN", async () => {
    const res = await request(app.getHttpServer())
      .post("/onboarding/profile")
      .set(auth())
      .send({
        name: "Test Client",
        pan: "ABCDE1234F",
        mobile: "9876543210",
        familyName: "Test Portfolio",
      })
      .expect(201);
    expect(res.body.onboarding_status).toBe("pending_accounts");
    expect(res.body.family_id).toBeTruthy();
    expect(res.body.person.pan_masked).toBe("AB****4F");
    expect(res.body.person.pan_last4).toBe("234F");
    expect(res.body.person.mobile_masked).toBe("98******10");
    familyId = res.body.family_id as string;
  });

  it("adds a family member", async () => {
    const res = await request(app.getHttpServer())
      .post("/onboarding/persons")
      .set(auth())
      .send({ name: "Spouse Client", role: "spouse" })
      .expect(201);
    expect(res.body.persons?.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects complete without accounts", async () => {
    await request(app.getHttpServer()).post("/onboarding/complete").set(auth()).expect(400);
  });

  it("adds manual account and recomputes net worth", async () => {
    const res = await request(app.getHttpServer())
      .post("/ingest/manual-accounts")
      .set(auth())
      .send({
        familyId,
        accounts: [
          {
            name: "HDFC Savings",
            custodian: "HDFC Bank",
            assetType: "cash",
            currentValueInr: 1_500_000,
          },
        ],
      })
      .expect(201);
    expect(res.body.assets_created).toBe(1);

    const nw = await request(app.getHttpServer())
      .get(`/family/${familyId}/networth`)
      .set(auth())
      .expect(200);
    expect(nw.body.family.total_net_worth_inr).toBe(1_500_000);
    expect(nw.body.holdings.length).toBe(1);
    expect(nw.body.family.family_id).not.toBe("fam_kapoor_001");
  });

  it("grants simulated AA consent without Kapoor fixture inject", async () => {
    const res = await request(app.getHttpServer())
      .post("/ingest/aa/consent")
      .set(auth())
      .send({ familyId })
      .expect(201);
    expect(res.body.fip_types).toEqual(["bank", "mf", "demat"]);
    expect(res.body.holdings_ingested).toBe(0);
  });

  it("completes onboarding", async () => {
    const res = await request(app.getHttpServer()).post("/onboarding/complete").set(auth()).expect(201);
    expect(res.body.onboarding_status).toBe("complete");

    const me = await request(app.getHttpServer()).get("/auth/me").set(auth()).expect(200);
    expect(me.body.primary_family_id).toBe(familyId);
    expect(me.body.onboarding_status).toBe("complete");
  });

  it("default networth prefers client family over Kapoor", async () => {
    const res = await request(app.getHttpServer()).get("/family/networth").set(auth()).expect(200);
    expect(res.body.family.family_id).toBe(familyId);
    expect(res.body.family.total_net_worth_inr).toBeGreaterThan(0);
  });

  it("lists connector catalog and starts AA consent journey", async () => {
    const catalog = await request(app.getHttpServer()).get("/connectors/catalog").expect(200);
    expect(catalog.body.some((c: { provider: string }) => c.provider === "upstox")).toBe(true);
    expect(catalog.body.some((c: { provider: string }) => c.provider === "aa")).toBe(true);

    const discover = await request(app.getHttpServer())
      .get(`/connectors/discover?familyId=${familyId}`)
      .set(auth())
      .expect(200);
    expect(discover.body.pan_masked).toBeTruthy();

    const start = await request(app.getHttpServer())
      .post("/connectors/aa/start")
      .set(auth())
      .send({ familyId, returnTo: "/onboarding/connect" })
      .expect(201);
    expect(start.body.redirect_url).toContain("aa-journey");
    expect(start.body.state).toBeTruthy();

    // Upstox without keys must fail clearly — no fake holdings
    const upstox = await request(app.getHttpServer())
      .post("/connectors/upstox/start")
      .set(auth())
      .send({ familyId })
      .expect(400);
    expect(String(upstox.body.message)).toMatch(/UPSTOX_/);
  });
});
