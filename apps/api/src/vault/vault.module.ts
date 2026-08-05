import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { AuthModule, FamilyService } from "../auth/auth.module";
import { JwtPayload, CurrentUser, JwtAuthGuard } from "../auth/auth.guards";
import { PrismaService } from "../prisma/prisma.module";

class NomineeDto {
  @IsString()
  familyId!: string;

  @IsString()
  accountLabel!: string;

  @IsString()
  institution!: string;

  @IsString()
  assetType!: string;

  @IsBoolean()
  hasNominee!: boolean;

  @IsOptional()
  @IsString()
  nomineeName?: string;
}

@Injectable()
export class VaultService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyService) private readonly families: FamilyService,
  ) {}

  async listNominees(userId: string, familyId: string) {
    await this.families.assertMember(userId, familyId);
    return this.prisma.nominee.findMany({ where: { familyId } });
  }

  async addNominee(userId: string, dto: NomineeDto) {
    await this.families.assertMember(userId, dto.familyId);
    return this.prisma.nominee.create({
      data: {
        familyId: dto.familyId,
        accountLabel: dto.accountLabel,
        institution: dto.institution,
        assetType: dto.assetType,
        hasNominee: dto.hasNominee,
        nomineeName: dto.nomineeName ?? null,
      },
    });
  }

  async nomineeAudit(userId: string, familyId: string) {
    await this.families.assertMember(userId, familyId);
    const nominees = await this.prisma.nominee.findMany({ where: { familyId } });
    const gaps = nominees.filter((n) => !n.hasNominee);

    const cards = [];
    for (const gap of gaps) {
      const id = `ac_nominee_${gap.id}`;
      const card = await this.prisma.actionCardRecord.upsert({
        where: { id },
        update: {
          status: "pending",
          title: `Add nominee — ${gap.accountLabel}`,
          subtitle: `${gap.institution} has no nominee on file`,
          details:
            "Update nominee details with the institution externally. CAPSTONE does not file or modify accounts on your behalf.",
        },
        create: {
          id,
          familyId,
          type: "nominee_fix",
          status: "pending",
          title: `Add nominee — ${gap.accountLabel}`,
          subtitle: `${gap.institution} has no nominee on file`,
          savingsInr: 0,
          deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          priority: "medium",
          details:
            "Update nominee details with the institution externally. CAPSTONE does not file or modify accounts on your behalf.",
          instructionsJson: "[]",
        },
      });
      cards.push(card);
    }

    await this.prisma.family.update({
      where: { id: familyId },
      data: { nomineeGaps: gaps.length },
    });

    return {
      family_id: familyId,
      total_accounts: nominees.length,
      gaps: gaps.length,
      gap_accounts: gaps.map((g) => ({
        id: g.id,
        account: g.accountLabel,
        institution: g.institution,
      })),
      action_cards_created: cards.map((c) => c.id),
      note: "Weekly nominee audit — schedule via desk BullMQ or cron.",
    };
  }
}

@Controller("vault")
@UseGuards(JwtAuthGuard)
export class VaultController {
  constructor(@Inject(VaultService) private readonly vault: VaultService) {}

  @Get("nominees")
  list(@CurrentUser() user: JwtPayload, @Query("familyId") familyId: string) {
    return this.vault.listNominees(user.sub, familyId);
  }

  @Post("nominees")
  add(@CurrentUser() user: JwtPayload, @Body() dto: NomineeDto) {
    return this.vault.addNominee(user.sub, dto);
  }

  @Get("nominee-audit")
  audit(@CurrentUser() user: JwtPayload, @Query("familyId") familyId: string) {
    return this.vault.nomineeAudit(user.sub, familyId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [VaultController],
  providers: [VaultService],
  exports: [VaultService],
})
export class VaultModule {}
