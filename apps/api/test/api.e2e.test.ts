import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import type { AskAiResponse, HealthResponse } from "@capstone/types";
import { PLATFORM_DISCLAIMER } from "@capstone/types";

describe("capstone-api e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
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

  describe("GET /health", () => {
    it("returns ok payload", async () => {
      const res = await request(app.getHttpServer()).get("/health").expect(200);
      const body = res.body as HealthResponse;
      expect(body.status).toBe("ok");
      expect(body.service).toBe("capstone-api");
      expect(body.version).toBe("0.1.0");
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("POST /ai/ask", () => {
    it("rejects empty body", async () => {
      await request(app.getHttpServer()).post("/ai/ask").send({}).expect(400);
    });

    it("rejects empty query", async () => {
      await request(app.getHttpServer()).post("/ai/ask").send({ query: "   " }).expect(400);
    });

    it("rejects unknown fields", async () => {
      await request(app.getHttpServer())
        .post("/ai/ask")
        .send({ query: "hello", execute_trade: true })
        .expect(400);
    });

    it("answers portfolio query with Kapoor context", async () => {
      const res = await request(app.getHttpServer())
        .post("/ai/ask")
        .send({ query: "What's my real exposure to IT stocks?", deterministic: true })
        .expect(200);

      const body = res.body as AskAiResponse;
      expect(body.source).toBe("fin");
      expect(body.request_id).toBeTruthy();
      expect(body.response.intent).toBe("portfolio");
      expect(body.response.answer).toContain("Kapoor Family");
      expect(body.response.disclaimer).toBe(PLATFORM_DISCLAIMER);
      expect(body.response.refused).toBe(false);
    });

    it("runs advance tax calculator via tool traces", async () => {
      const res = await request(app.getHttpServer())
        .post("/ai/ask")
        .send({ query: "Do I need to pay advance tax this quarter?", deterministic: true })
        .expect(200);

      const body = res.body as AskAiResponse;
      expect(body.response.tool_traces.some((t) => t.tool === "computeAdvanceTax")).toBe(true);
      expect(body.response.action_card?.type).toBe("advance_tax");
    });

    it("refuses ITR filing (anti-goal)", async () => {
      const res = await request(app.getHttpServer())
        .post("/ai/ask")
        .send({ query: "Please file my ITR for me this year", deterministic: true })
        .expect(200);

      const body = res.body as AskAiResponse;
      expect(body.response.refused).toBe(true);
      expect(body.response.escalate_to_ca).toBe(true);
      expect(body.response.answer.toLowerCase()).not.toMatch(/we will file/);
    });

    it("refuses trade execution requests", async () => {
      const res = await request(app.getHttpServer())
        .post("/ai/ask")
        .send({ query: "Sell all my TATASTEEL shares right now", deterministic: true })
        .expect(200);

      const body = res.body as AskAiResponse;
      expect(body.response.refused).toBe(true);
      expect(body.response.intent).toMatch(/refuse_/);
    });

    it("refuses product push / commission style asks", async () => {
      const res = await request(app.getHttpServer())
        .post("/ai/ask")
        .send({ query: "Which mutual fund scheme should I buy for tax saving?", deterministic: true })
        .expect(200);

      const body = res.body as AskAiResponse;
      expect(body.response.refused).toBe(true);
    });

    it("supports portfolio=none without Kapoor context", async () => {
      const res = await request(app.getHttpServer())
        .post("/ai/ask")
        .send({
          query: "What's my real exposure to IT stocks?",
          portfolio: "none",
          deterministic: true,
        })
        .expect(200);

      const body = res.body as AskAiResponse;
      expect(body.response.answer).not.toContain("Kapoor Family");
    });

    it("returns FY cockpit with citations/tooling for desk-style query", async () => {
      const res = await request(app.getHttpServer())
        .post("/ai/ask")
        .send({ query: "Give me my FY 2025-26 operating plan", deterministic: true })
        .expect(200);

      const body = res.body as AskAiResponse;
      expect(["fy_analysis", "desk_day_plan", "general", "portfolio"]).toContain(body.response.intent);
      expect(body.response.answer.length).toBeGreaterThan(40);
      expect(body.response.disclaimer).toBe(PLATFORM_DISCLAIMER);
    });

    it("never emits forbidden anti-goal phrases in live answers", async () => {
      const queries = [
        "What's my real exposure to IT stocks?",
        "Do I need to pay advance tax this quarter?",
        "Can I gift ₹50L to my HUF?",
        "How much tax will I save with the TATASTEEL harvest?",
      ];

      for (const query of queries) {
        const res = await request(app.getHttpServer())
          .post("/ai/ask")
          .send({ query, deterministic: true })
          .expect(200);
        const answer = (res.body as AskAiResponse).response.answer.toLowerCase();
        expect(answer).not.toMatch(/we will file|audit-proof|guarantee(?:d)? no notice|buy this fund/);
      }
    });
  });
});
