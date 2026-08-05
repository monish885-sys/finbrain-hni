import "reflect-metadata";
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

const FAMILY = "fam_kapoor_001";

describe("Track A foundation e2e", () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= "file:./prisma/dev.db";
    process.env.JWT_SECRET ??= "capstone-dev-jwt-secret-change-in-prod";

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

    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "vikram@kapoor.demo", password: "capstone2026" })
      .expect(201);
    token = login.body.access_token as string;
    expect(token).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it("rejects unauthenticated wealth access", async () => {
    await request(app.getHttpServer()).get("/family/networth").expect(401);
  });

  it("returns God Mode networth from DB", async () => {
    const res = await request(app.getHttpServer())
      .get("/family/networth")
      .set(auth())
      .expect(200);
    expect(res.body.family.family_id).toBe(FAMILY);
    expect(res.body.family.total_net_worth_inr).toBeGreaterThan(1_000_000_000);
    expect(res.body.holdings.length).toBeGreaterThan(0);
  });

  it("creates family + person entity", async () => {
    const fam = await request(app.getHttpServer())
      .post("/families")
      .set(auth())
      .send({ name: "Test Family Track A" })
      .expect(201);
    const familyId = fam.body.family_id as string;
    const person = await request(app.getHttpServer())
      .post(`/families/${familyId}/persons`)
      .set(auth())
      .send({ name: "Test Person", role: "principal" })
      .expect(201);
    expect(person.body.name).toBe("Test Person");
  });

  it("simulates AA consent and ingests holdings", async () => {
    const res = await request(app.getHttpServer())
      .post("/ingest/aa/consent")
      .set(auth())
      .send({ familyId: FAMILY })
      .expect(201);
    expect(res.body.fip_types).toEqual(["bank", "mf", "demat"]);
    expect(res.body.holdings_ingested).toBeGreaterThan(0);
  });

  it("imports CAS and computes STCG/LTCG via Fin calculators", async () => {
    const res = await request(app.getHttpServer())
      .post("/ingest/cas")
      .set(auth())
      .send({ familyId: FAMILY, broker: "zerodha" })
      .expect(201);
    expect(res.body.lots_imported).toBeGreaterThan(0);
    expect(res.body.capital_gains[0].section).toBeTruthy();
  });

  it("runs firewall AIS upload and status", async () => {
    await request(app.getHttpServer())
      .post("/tax/firewall/ais")
      .set(auth())
      .send({ familyId: FAMILY, payload: "fixture" })
      .expect(201);
    const status = await request(app.getHttpServer())
      .get(`/tax/firewall/status?familyId=${FAMILY}`)
      .set(auth())
      .expect(200);
    expect(status.body.mismatches.length).toBeGreaterThan(0);
  });

  it("runs harvest scan and lists action cards", async () => {
    const scan = await request(app.getHttpServer())
      .post("/tax/harvest/scan")
      .set(auth())
      .send({ familyId: FAMILY })
      .expect(201);
    expect(scan.body.note).toMatch(/instructions only/i);
    const cards = await request(app.getHttpServer())
      .get(`/tax/action-cards?familyId=${FAMILY}`)
      .set(auth())
      .expect(200);
    expect(Array.isArray(cards.body)).toBe(true);
    expect(cards.body.length).toBeGreaterThan(0);

    const id = cards.body[0].id as string;
    const patched = await request(app.getHttpServer())
      .patch(`/tax/action-cards/${id}`)
      .set(auth())
      .send({ status: "done" })
      .expect(200);
    expect(patched.body.status).toBe("done");
    // reset for demo continuity
    await request(app.getHttpServer())
      .patch(`/tax/action-cards/${id}`)
      .set(auth())
      .send({ status: "pending" })
      .expect(200);
  });

  it("computes advance tax via ca-buddy", async () => {
    const res = await request(app.getHttpServer())
      .post("/tax/advance-tax")
      .set(auth())
      .send({ familyId: FAMILY, projected_total_tax_inr: 8500000, as_of_date: "2026-06-15" })
      .expect(201);
    expect(res.body.result).toBeTruthy();
    expect(res.body.result.current_quarter).toBeTruthy();
  });

  it("runs nominee audit and desk Day Plan", async () => {
    const audit = await request(app.getHttpServer())
      .get(`/vault/nominee-audit?familyId=${FAMILY}`)
      .set(auth())
      .expect(200);
    expect(audit.body.gaps).toBeGreaterThanOrEqual(1);

    const desk = await request(app.getHttpServer())
      .post("/ai/desk/run")
      .set(auth())
      .send({ familyId: FAMILY })
      .expect(201);
    expect(desk.body.approval_chain).toEqual(["fin_proposes", "ca_reviews", "hni_approves"]);
    expect(desk.body.day_plan.items.length).toBeGreaterThan(0);
  });
});
