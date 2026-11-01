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

  /** 10-digit Indian mobile for Account Aggregator VUA. */
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: "Mobile must be a 10-digit Indian number" })
  mobile!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  familyName?: string;
}

function maskPan(pan: string): string {
  const p = pan.toUpperCase();
  return `${p.slice(0, 2)}****${p.slice(-2)}`;
}

function maskMobile(mobile: string): string {
  const m = mobile.replace(/\D/g, "");
  return `${m.slice(0, 2)}******${m.slice(-2)}`;
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
    const principal = f.persons.find((p) => p.role === "principal") ?? f.persons[0];
    return {
      onboarding_status: f.onboardingStatus,
      family_id: f.id,
      family_name: f.name,
      person: principal
        ? {
            id: principal.id,
            name: principal.name,
            pan_masked: principal.panMasked,
            pan_last4: principal.panLast4,
            mobile_masked: principal.mobile ? maskMobile(principal.mobile) : null,
          }
        : null,
      persons: f.persons.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        pan_masked: p.panMasked,
        mobile_masked: p.mobile ? maskMobile(p.mobile) : null,
      })),
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
    const mobile = dto.mobile.replace(/\D/g, "");
    const familyId = `fam_${randomUUID().slice(0, 8)}`;
    const personId = `person_${randomUUID().slice(0, 8)}`;
    const familyName = dto.familyName?.trim() || `${dto.name.trim()}'s portfolio`;

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
            mobile,
            role: "principal",
          },
        },
      },
    });

    return this.getStatus(userId);
  }

  async addPerson(
    userId: string,
    body: { name: string; role?: string; pan?: string; mobile?: string },
  ) {
    const status = await this.getStatus(userId);
    if (!status.family_id) throw new BadRequestException("Create profile first");

    const personId = `person_${randomUUID().slice(0, 8)}`;
    let panMasked = "********";
    let panLast4: string | null = null;
    if (body.pan) {
      const pan = body.pan.toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
        throw new BadRequestException("PAN must be 10 characters");
      }
      panMasked = maskPan(pan);
      panLast4 = pan.slice(-4);
    }
    const mobile = body.mobile ? body.mobile.replace(/\D/g, "") : null;
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
      throw new BadRequestException("Mobile must be a 10-digit Indian number");
    }

    await this.prisma.person.create({
      data: {
        id: personId,
        familyId: status.family_id,
        name: body.name.trim(),
        panMasked,
        panLast4,
        mobile,
        role: body.role?.trim() || "member",
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

  @Post("persons")
  addPerson(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; role?: string; pan?: string; mobile?: string },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException("name required");
    return this.onboarding.addPerson(user.sub, body);
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
