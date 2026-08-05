import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import {
  applyCaReview,
  applyHniApproval,
  buildCaReviewPack,
  hniClearedActionCards,
  runDailyDesk,
} from "@capstone/ca-buddy";
import type { CaReviewDecision, DayPlan, HniApprovalDecision } from "@capstone/types";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { AuthModule, FamilyService } from "../auth/auth.module";
import { JwtPayload, CurrentUser, JwtAuthGuard } from "../auth/auth.guards";
import { PrismaService } from "../prisma/prisma.module";
import { BrainsetModule, BrainsetService } from "../brainset/brainset.module";

class DeskRunDto {
  @IsOptional()
  @IsString()
  familyId?: string;

  @IsOptional()
  @IsString()
  asOfDate?: string;
}

class CaDecisionDto {
  @IsString()
  item_id!: string;

  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  edited_title?: string;

  @IsOptional()
  @IsString()
  edited_details?: string;
}

class CaReviewDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaDecisionDto)
  decisions!: CaDecisionDto[];
}

class HniDecisionDto {
  @IsString()
  item_id!: string;

  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class HniApproveDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HniDecisionDto)
  decisions!: HniDecisionDto[];
}

@Injectable()
export class DeskService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyService) private readonly families: FamilyService,
    @Inject(BrainsetService) private readonly brainsets: BrainsetService,
  ) {}

  private serialize(plan: DayPlan) {
    return {
      id: plan.id,
      brainset_id: plan.brainset_id,
      status: plan.status,
      as_of_date: plan.as_of_date,
      financial_year: plan.financial_year,
      summary: plan.summary,
      items: plan.items,
      tool_traces: plan.tool_traces,
      citations: plan.citations,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    };
  }

  private async persist(plan: DayPlan, familyId: string) {
    await this.prisma.dayPlanRecord.upsert({
      where: { id: plan.id },
      update: {
        status: plan.status,
        itemsJson: JSON.stringify(plan.items),
        toolTracesJson: JSON.stringify(plan.tool_traces),
        citationsJson: JSON.stringify(plan.citations),
      },
      create: {
        id: plan.id,
        familyId,
        brainsetId: plan.brainset_id,
        status: plan.status,
        asOfDate: plan.as_of_date,
        financialYear: plan.financial_year,
        itemsJson: JSON.stringify(plan.items),
        toolTracesJson: JSON.stringify(plan.tool_traces),
        citationsJson: JSON.stringify(plan.citations),
      },
    });

    const bs = await this.prisma.brainsetRecord.findUnique({ where: { familyId } });
    if (bs) {
      const open = new Set(JSON.parse(bs.openDayPlanIds) as string[]);
      open.add(plan.id);
      await this.prisma.brainsetRecord.update({
        where: { familyId },
        data: { openDayPlanIds: JSON.stringify([...open]) },
      });
    }
  }

  private async loadPlan(planId: string): Promise<{ plan: DayPlan; familyId: string }> {
    const row = await this.prisma.dayPlanRecord.findUnique({ where: { id: planId } });
    if (!row) throw new NotFoundException("Day plan not found");
    return {
      familyId: row.familyId,
      plan: {
        id: row.id,
        brainset_id: row.brainsetId,
        status: row.status as DayPlan["status"],
        as_of_date: row.asOfDate,
        financial_year: row.financialYear,
        summary: "",
        items: JSON.parse(row.itemsJson),
        tool_traces: JSON.parse(row.toolTracesJson),
        citations: JSON.parse(row.citationsJson),
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      },
    };
  }

  async runDesk(userId: string, dto: DeskRunDto) {
    const familyId = dto.familyId ?? "fam_kapoor_001";
    await this.families.assertMember(userId, familyId);
    const brainset = await this.brainsets.upsertBrainset(userId, familyId);
    const plan = runDailyDesk(brainset, dto.asOfDate);
    await this.persist(plan, familyId);
    const review = buildCaReviewPack(brainset, plan);

    return {
      family_id: familyId,
      day_plan: this.serialize(plan),
      ca_review_pack: review,
      approval_chain: ["fin_proposes", "ca_reviews", "hni_approves"],
      note: "Desk never auto-executes. CA then HNI approval required.",
    };
  }

  async listPlans(userId: string, familyId: string) {
    await this.families.assertMember(userId, familyId);
    const rows = await this.prisma.dayPlanRecord.findMany({
      where: { familyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      as_of_date: r.asOfDate,
      financial_year: r.financialYear,
      item_count: (JSON.parse(r.itemsJson) as unknown[]).length,
      updated_at: r.updatedAt.toISOString(),
    }));
  }

  async getPlan(userId: string, planId: string) {
    const { plan, familyId } = await this.loadPlan(planId);
    await this.families.assertMember(userId, familyId);
    return this.serialize(plan);
  }

  async caReview(userId: string, planId: string, dto: CaReviewDto) {
    const { plan, familyId } = await this.loadPlan(planId);
    await this.families.assertMember(userId, familyId);
    const decisions: CaReviewDecision[] = dto.decisions.map((d) => ({
      item_id: d.item_id,
      action: d.action as CaReviewDecision["action"],
      note: d.note,
      edited_title: d.edited_title,
      edited_details: d.edited_details,
    }));
    for (const d of decisions) {
      if (!["approve", "edit", "reject"].includes(d.action)) {
        throw new BadRequestException(`Invalid CA action: ${d.action}`);
      }
    }
    const updated = applyCaReview(plan, decisions);
    await this.persist(updated, familyId);
    return {
      day_plan: this.serialize(updated),
      note: "CA review applied — HNI approval still required before Action Cards are actionable.",
    };
  }

  async hniApprove(userId: string, planId: string, dto: HniApproveDto) {
    const { plan, familyId } = await this.loadPlan(planId);
    await this.families.assertMember(userId, familyId);
    const decisions: HniApprovalDecision[] = dto.decisions.map((d) => ({
      item_id: d.item_id,
      action: d.action as HniApprovalDecision["action"],
      note: d.note,
    }));
    for (const d of decisions) {
      if (!["approve", "dismiss"].includes(d.action)) {
        throw new BadRequestException(`Invalid HNI action: ${d.action}`);
      }
    }
    const updated = applyHniApproval(plan, decisions);
    await this.persist(updated, familyId);
    const cards = hniClearedActionCards(updated);

    for (const card of cards) {
      const id = `ac_desk_${plan.id}_${Buffer.from(card.title).toString("base64url").slice(0, 16)}`;
      const type =
        card.type === "structuring" || card.type === "desk_task" ? "manager_alert" : card.type;
      await this.prisma.actionCardRecord.upsert({
        where: { id },
        update: {
          status: "pending",
          type,
          title: card.title,
          subtitle: card.subtitle,
          details: card.details ?? null,
          savingsInr: card.savings_inr ?? 0,
          deadline: card.deadline ?? new Date().toISOString().slice(0, 10),
        },
        create: {
          id,
          familyId,
          type,
          status: "pending",
          title: card.title,
          subtitle: card.subtitle,
          details: card.details ?? null,
          savingsInr: card.savings_inr ?? 0,
          deadline: card.deadline ?? new Date().toISOString().slice(0, 10),
          priority: "high",
          instructionsJson: "[]",
        },
      });
    }

    return {
      day_plan: this.serialize(updated),
      action_cards: cards,
      note: "HNI approved cards are instructions only — execute externally.",
    };
  }

  /** Used by scheduler — runs desk for all families with a brainset or default Kapoor owner */
  async runDeskForAllFamilies() {
    const families = await this.prisma.family.findMany({ select: { id: true } });
    const results = [];
    for (const f of families) {
      const member = await this.prisma.familyMember.findFirst({ where: { familyId: f.id } });
      if (!member) continue;
      try {
        results.push(await this.runDesk(member.userId, { familyId: f.id }));
      } catch (e) {
        results.push({ family_id: f.id, error: e instanceof Error ? e.message : "failed" });
      }
    }
    return results;
  }
}

@Injectable()
export class DeskSchedulerService implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue;
  private worker?: Worker;
  private connection?: IORedis;
  private interval?: ReturnType<typeof setInterval>;

  constructor(@Inject(DeskService) private readonly desk: DeskService) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    const enabled = process.env.DESK_SCHEDULER_ENABLED !== "false";
    if (!enabled) return;

    try {
      this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
      await this.connection.ping();

      this.queue = new Queue("fin-desk-daily", { connection: this.connection });
      this.worker = new Worker(
        "fin-desk-daily",
        async () => {
          await this.desk.runDeskForAllFamilies();
        },
        { connection: this.connection.duplicate() },
      );

      // Enqueue an immediate job; daily cadence via interval + Redis queue for ops trigger
      await this.queue.add("daily", {}, { removeOnComplete: 10, removeOnFail: 20 });
      this.interval = setInterval(
        () => {
          void this.queue?.add("daily", {}, { removeOnComplete: 10, removeOnFail: 20 });
        },
        24 * 60 * 60 * 1000,
      );
      // eslint-disable-next-line no-console
      console.log("Fin desk scheduler: BullMQ connected");
    } catch {
      // Fallback: in-process interval every 24h (also trigger once after 5s in non-test)
      if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
        this.interval = setInterval(
          () => {
            void this.desk.runDeskForAllFamilies();
          },
          24 * 60 * 60 * 1000,
        );
        // eslint-disable-next-line no-console
        console.log("Fin desk scheduler: in-process fallback (Redis unavailable)");
      }
    }
  }

  async onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  /** Manual trigger for ops / tests */
  triggerNow() {
    return this.desk.runDeskForAllFamilies();
  }
}

@Controller("ai/desk")
@UseGuards(JwtAuthGuard)
export class DeskController {
  constructor(
    @Inject(DeskService) private readonly desk: DeskService,
    @Inject(DeskSchedulerService) private readonly scheduler: DeskSchedulerService,
  ) {}

  @Post("run")
  run(@CurrentUser() user: JwtPayload, @Body() dto: DeskRunDto) {
    return this.desk.runDesk(user.sub, dto);
  }

  @Get("plans")
  list(@CurrentUser() user: JwtPayload, @Query("familyId") familyId: string) {
    return this.desk.listPlans(user.sub, familyId);
  }

  @Get("plans/:id")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.desk.getPlan(user.sub, id);
  }

  @Post("plans/:id/ca-review")
  caReview(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: CaReviewDto) {
    return this.desk.caReview(user.sub, id, dto);
  }

  @Post("plans/:id/hni-approve")
  hniApprove(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: HniApproveDto) {
    return this.desk.hniApprove(user.sub, id, dto);
  }

  @Post("scheduler/run")
  schedulerRun() {
    return this.scheduler.triggerNow();
  }
}

@Module({
  imports: [AuthModule, BrainsetModule],
  controllers: [DeskController],
  providers: [DeskService, DeskSchedulerService],
  exports: [DeskService, DeskSchedulerService],
})
export class DeskModule {}
