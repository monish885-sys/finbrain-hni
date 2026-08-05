import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { compareSync, hashSync } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.module";
import { JwtPayload, CurrentUser, JwtAuthGuard, JwtStrategy } from "./auth.guards";
import {
  CreateFamilyDto,
  CreateLegalEntityDto,
  CreatePersonDto,
  LoginDto,
  RegisterDto,
} from "./dto";

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new BadRequestException("Email already registered");

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash: hashSync(dto.password, 10),
      },
    });

    return this.tokenResponse(user.id, user.email, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !compareSync(dto.password, user.passwordHash)) {
      throw new BadRequestException("Invalid credentials");
    }
    return this.tokenResponse(user.id, user.email, user.name);
  }

  private tokenResponse(sub: string, email: string, name: string) {
    const access_token = this.jwt.sign({ sub, email });
    return { access_token, user: { id: sub, email, name } };
  }

  async prismaUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async listMemberships(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: { family: true },
      orderBy: { family: { updatedAt: "desc" } },
    });
    return memberships.map((m) => ({
      family_id: m.family.id,
      name: m.family.name,
      role: m.role,
      onboarding_status: m.family.onboardingStatus,
      total_net_worth_inr: m.family.totalNetWorthInr,
    }));
  }

  async audit(userId: string | undefined, action: string, resource: string, meta: Record<string, unknown> = {}) {
    await this.prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        resource,
        metaJson: JSON.stringify(meta),
      },
    });
  }
}

@Injectable()
export class FamilyService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createFamily(userId: string, dto: CreateFamilyDto) {
    const id = `fam_${randomUUID().slice(0, 8)}`;
    const family = await this.prisma.family.create({
      data: {
        id,
        name: dto.name,
        primaryBank: dto.primaryBank ?? "",
        members: { create: { userId, role: "owner" } },
      },
    });
    return { family_id: family.id, name: family.name };
  }

  async listFamilies(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: { family: true },
    });
    return memberships.map((m) => ({
      family_id: m.family.id,
      name: m.family.name,
      role: m.role,
      total_net_worth_inr: m.family.totalNetWorthInr,
    }));
  }

  async assertMember(userId: string, familyId: string) {
    const m = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!m) throw new NotFoundException("Family not found");
    return m;
  }

  async createPerson(userId: string, familyId: string, dto: CreatePersonDto) {
    await this.assertMember(userId, familyId);
    const id = `person_${randomUUID().slice(0, 8)}`;
    const person = await this.prisma.person.create({
      data: {
        id,
        familyId,
        name: dto.name,
        panMasked: "XX****XX",
        role: dto.role ?? null,
      },
    });
    return { id: person.id, type: "individual" as const, name: person.name, role: person.role };
  }

  async createLegalEntity(userId: string, familyId: string, dto: CreateLegalEntityDto) {
    await this.assertMember(userId, familyId);
    const allowed = ["huf", "private_trust", "pvt_ltd"];
    if (!allowed.includes(dto.type)) {
      throw new BadRequestException("Invalid entity type");
    }
    const id = `ent_${randomUUID().slice(0, 8)}`;
    const ent = await this.prisma.legalEntity.create({
      data: {
        id,
        familyId,
        type: dto.type,
        name: dto.name,
        panMasked: "XX****XX",
      },
    });
    return { id: ent.id, type: ent.type, name: ent.name };
  }

  async getFamilyGraph(userId: string, familyId: string) {
    await this.assertMember(userId, familyId);
    const family = await this.prisma.family.findUniqueOrThrow({
      where: { id: familyId },
      include: { persons: true, legalEntities: true },
    });
    return {
      family_id: family.id,
      name: family.name,
      entities: [
        ...family.persons.map((p) => ({
          id: p.id,
          type: "individual" as const,
          name: p.name,
          pan: p.panMasked,
          net_worth_inr: p.netWorthInr,
          role: p.role ?? undefined,
        })),
        ...family.legalEntities.map((e) => ({
          id: e.id,
          type: e.type,
          name: e.name,
          pan: e.panMasked,
          net_worth_inr: e.netWorthInr,
          karta: e.kartaId ?? undefined,
        })),
      ],
    };
  }
}

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto);
    await this.auth.audit(result.user.id, "login", "auth", { email: result.user.email });
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: JwtPayload) {
    const dbUser = await this.auth.prismaUser(user.sub);
    const memberships = await this.auth.listMemberships(user.sub);
    const primary =
      memberships.find((m) => m.family_id !== "fam_kapoor_001" && m.onboarding_status === "complete") ??
      memberships.find((m) => m.family_id !== "fam_kapoor_001" && m.onboarding_status === "pending_accounts") ??
      memberships.find((m) => m.family_id === "fam_kapoor_001") ??
      memberships[0] ??
      null;
    return {
      id: user.sub,
      email: user.email,
      name: dbUser?.name ?? null,
      primary_family_id: primary?.family_id ?? null,
      onboarding_status: primary?.onboarding_status ?? "pending_profile",
      families: memberships,
    };
  }
}

@Controller("families")
@UseGuards(JwtAuthGuard)
export class FamiliesController {
  constructor(
    @Inject(FamilyService) private readonly families: FamilyService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.families.listFamilies(user.sub);
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateFamilyDto) {
    const family = await this.families.createFamily(user.sub, dto);
    await this.auth.audit(user.sub, "family.create", family.family_id, { name: family.name });
    return family;
  }

  @Get(":familyId")
  get(@CurrentUser() user: JwtPayload, @Param("familyId") familyId: string) {
    return this.families.getFamilyGraph(user.sub, familyId);
  }

  @Post(":familyId/persons")
  createPerson(
    @CurrentUser() user: JwtPayload,
    @Param("familyId") familyId: string,
    @Body() dto: CreatePersonDto,
  ) {
    return this.families.createPerson(user.sub, familyId, dto);
  }

  @Post(":familyId/entities")
  createEntity(
    @CurrentUser() user: JwtPayload,
    @Param("familyId") familyId: string,
    @Body() dto: CreateLegalEntityDto,
  ) {
    return this.families.createLegalEntity(user.sub, familyId, dto);
  }
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "capstone-dev-jwt-secret-change-in-prod",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController, FamiliesController],
  providers: [AuthService, FamilyService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, FamilyService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
