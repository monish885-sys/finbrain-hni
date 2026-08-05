import "reflect-metadata";
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

const FAMILY = "fam_kapoor_001";

describe("Track B desk + brainset e2e", () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DESK_SCHEDULER_ENABLED = "false";
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
      .send({ email: "vikram@kapoor.demo", password: "capstone2026" });
    token = login.body.access_token as string;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it("runs desk, CA reviews, HNI approves — never auto-executes", async () => {
    const run = await request(app.getHttpServer())
      .post("/ai/desk/run")
      .set(auth())
      .send({ familyId: FAMILY })
      .expect(201);

    expect(run.body.approval_chain).toEqual(["fin_proposes", "ca_reviews", "hni_approves"]);
    expect(run.body.day_plan.items.length).toBeGreaterThan(0);
    expect(run.body.note).toMatch(/never auto-executes/i);

    const planId = run.body.day_plan.id as string;
    const itemId = run.body.day_plan.items[0].id as string;

    const ca = await request(app.getHttpServer())
      .post(`/ai/desk/plans/${planId}/ca-review`)
      .set(auth())
      .send({ decisions: [{ item_id: itemId, action: "approve", note: "CA ok" }] })
      .expect(201);
    expect(ca.body.day_plan.items.find((i: { id: string }) => i.id === itemId).status).toBe(
      "ca_approved",
    );

    const hni = await request(app.getHttpServer())
      .post(`/ai/desk/plans/${planId}/hni-approve`)
      .set(auth())
      .send({ decisions: [{ item_id: itemId, action: "approve" }] })
      .expect(201);
    expect(hni.body.day_plan.items.find((i: { id: string }) => i.id === itemId).status).toBe(
      "hni_approved",
    );
    expect(hni.body.note).toMatch(/instructions only/i);
  });

  it("asks Fin with live brainset from DB", async () => {
    const res = await request(app.getHttpServer())
      .post("/ai/ask")
      .set(auth())
      .send({
        query: "What's my real exposure to IT stocks?",
        deterministic: true,
        portfolio: "live",
        familyId: FAMILY,
      })
      .expect(200);

    expect(res.body.source).toBe("fin");
    expect(res.body.request_id).toBeTruthy();
    expect(res.body.response.answer).toContain("Kapoor Family");
    expect(res.body.response.refused).toBe(false);
  });
});
