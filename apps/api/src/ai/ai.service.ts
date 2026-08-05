import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { ask, validateResponse } from "@capstone/ca-buddy";
import type { AskAiResponse, CaBuddyResponse } from "@capstone/types";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AskDto } from "./dto/ask.dto";
import { PrismaService } from "../prisma/prisma.module";
import { BrainsetService } from "../brainset/brainset.module";

/** Simple in-memory rate limit — ship gate for /ai/ask */
const askBuckets = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class AiService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(BrainsetService) private readonly brainsets?: BrainsetService,
  ) {}

  async ask(raw: unknown, userId?: string): Promise<AskAiResponse> {
    this.enforceRateLimit(userId ?? "anon");
    const dto = await this.parseAskDto(raw);
    const query = dto.query.trim();
    if (!query) {
      throw new BadRequestException("query is required");
    }

    const deterministic = dto.deterministic ?? true;
    const portfolioMode = dto.portfolio ?? "demo";
    const familyId = dto.familyId ?? "fam_kapoor_001";

    const portfolio = this.brainsets
      ? await this.brainsets.resolveAskPortfolio(userId, familyId, portfolioMode)
      : undefined;

    const response = await ask(query, {
      deterministic,
      portfolio: portfolioMode === "none" ? undefined : portfolio,
    });

    this.assertSafeResponse(response);

    const requestId = randomUUID();
    await this.auditConversation({
      requestId,
      userId,
      familyId: portfolioMode === "none" ? undefined : familyId,
      query,
      response,
    });

    return {
      request_id: requestId,
      source: "fin",
      response,
    };
  }

  private enforceRateLimit(key: string) {
    const limit = Number(process.env.AI_ASK_RATE_LIMIT ?? 60);
    const windowMs = Number(process.env.AI_ASK_RATE_WINDOW_MS ?? 60_000);
    const now = Date.now();
    const bucket = askBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      askBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      throw new HttpException("Rate limit exceeded for /ai/ask", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async auditConversation(input: {
    requestId: string;
    userId?: string;
    familyId?: string;
    query: string;
    response: CaBuddyResponse;
  }) {
    const queryHash = createHash("sha256").update(input.query).digest("hex").slice(0, 16);
    try {
      await this.prisma.conversationAudit.create({
        data: {
          requestId: input.requestId,
          userId: input.userId ?? null,
          familyId: input.familyId ?? null,
          intent: input.response.intent,
          refused: input.response.refused,
          escalateToCa: input.response.escalate_to_ca,
          queryHash,
          metaJson: JSON.stringify({
            mode: input.response.mode,
            citation_count: input.response.citations.length,
            tool_count: input.response.tool_traces.length,
            has_action_card: Boolean(input.response.action_card),
          }),
        },
      });
    } catch {
      // Never fail ask on audit write
    }
  }

  private async parseAskDto(raw: unknown): Promise<AskDto> {
    const dto = plainToInstance(AskDto, raw ?? {});
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException("Invalid ask payload");
    }
    return dto;
  }

  private assertSafeResponse(response: CaBuddyResponse): void {
    const { valid, errors } = validateResponse(response, []);
    if (!valid && errors.some((e) => e.startsWith("Forbidden phrase"))) {
      throw new BadRequestException("Response failed safety gate");
    }
  }
}
