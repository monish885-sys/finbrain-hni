import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsOptional, IsString, Matches, MinLength } from "class-validator";
import { randomUUID } from "node:crypto";
import { AuthModule } from "../auth/auth.module";
import { JwtPayload, CurrentUser, JwtAuthGuard } from "../auth/auth.guards";
import { PrismaService } from "../prisma/prisma.module";
import { IngestionModule, NetWorthService } from "../ingestion/ingestion.module";

class OnboardingProfileDto {
  @IsString()
  @MinLength(1)
  name!: string;

  /** Full PAN — only last4 + masked form stored; never logged. */
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, { message: "PAN must be 10 characters (e.g. ABCDE1234F)" })
  pan!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  familyName?: string;
}

function maskPan(pan: string): string {
  const p = pan.toUpperCase();
  return `${p.slice(0, 2)}****${p.slice(-2)}`;
}

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NetWorthService) private readonly netWorth: NetWorthService,
  ) {}

  async getStatus(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: {
          include: {
            persons: true,
            _count: { select: { assets: true, linkedAccounts: true, consents: true } },
          },
        },
      },
      orderBy: { family: { updatedAt: "desc" } },
    });

    if (!memberships.length) {
      return {
        onboarding_status: "pending_profile" as const,
        family_id: null,
        person: null,
        asset_count: 0,
        linked_account_count: 0,
        consent_count: 0,
        total_net_worth_inr: 0,
      };
    }

    // Prefer non-demo completed family for live clients
    const preferred =
      memberships.find((m) => m.familyId !== "fam_kapoor_001" && m.family.onboardingStatus === "complete") ??
      memberships.find((m) => m.familyId !== "fam_kapoor_001" && m.family.onboardingStatus !== "pending_profile") ??
      memberships.find((m) => m.familyId === "fam_kapoor_001") ??
      memberships[0];
    const f = preferred.family;
    return {
      onboarding_status: f.onboardingStatus,
      family_id: f.id,
      family_name: f.name,
      person: f.persons[0]
        ? {
            id: f.persons[0].id,
            name: f.persons[0].name,
            pan_masked: f.persons[0].panMasked,
            pan_last4: f.persons[0].panLast4,
          }
        : null,
      asset_count: f._count.assets,
      linked_account_count: f._count.linkedAccounts,
      consent_count: f._count.consents,
      total_net_worth_inr: f.totalNetWorthInr,
    };
  }

  async createProfile(userId: string, dto: OnboardingProfileDto) {
    const existing = await this.getStatus(userId);
    if (existing.family_id && existing.onboarding_status !== "pending_profile") {
      throw new BadRequestException("Profile already created — continue connecting accounts");
    }

    const pan = dto.pan.toUpperCase();
    const panLast4 = pan.slice(-4);
    const panMasked = maskPan(pan);
    const familyId = `fam_${randomUUID().slice(0, 8)}`;
    const personId = `person_${randomUUID().slice(0, 8)}`;
    const familyName = dto.familyName?.trim() || `${dto.name.trim()}'s portfolio`;

    if (existing.family_id && existing.onboarding_status === "pending_profile") {
      // Shouldn't happen often — create fresh if empty shell
    }

    await this.prisma.family.create({
      data: {
        id: familyId,
        name: familyName,
        onboardingStatus: "pending_accounts",
        members: { create: { userId, role: "owner" } },
        persons: {
          create: {
            id: personId,
            name: dto.name.trim(),
            panMasked,
            panLast4,
            role: "principal",
          },
        },
      },
    });

    return this.getStatus(userId);
  }

  async complete(userId: string) {
    const status = await this.getStatus(userId);
    if (!status.family_id) {
      throw new BadRequestException("Create profile first");
    }
    if (status.onboarding_status === "pending_profile") {
      throw new BadRequestException("Create profile first");
    }
    if (status.asset_count < 1 && status.linked_account_count < 1 && status.consent_count < 1) {
      throw new BadRequestException("Connect at least one account (AA, CAS, or manual) before completing");
    }

    await this.netWorth.recompute(status.family_id);
    await this.prisma.family.update({
      where: { id: status.family_id },
      data: { onboardingStatus: "complete" },
    });

    return this.getStatus(userId);
  }
}

@Controller("onboarding")
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(@Inject(OnboardingService) private readonly onboarding: OnboardingService) {}

  @Get("status")
  status(@CurrentUser() user: JwtPayload) {
    return this.onboarding.getStatus(user.sub);
  }

  @Post("profile")
  profile(@CurrentUser() user: JwtPayload, @Body() dto: OnboardingProfileDto) {
    return this.onboarding.createProfile(user.sub, dto);
  }

  @Post("complete")
  complete(@CurrentUser() user: JwtPayload) {
    return this.onboarding.complete(user.sub);
  }
}

@Module({
  imports: [AuthModule, IngestionModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
