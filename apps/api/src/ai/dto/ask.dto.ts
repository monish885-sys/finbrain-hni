import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  query!: string;

  @IsOptional()
  @IsBoolean()
  deterministic?: boolean;

  /** demo = Kapoor fixtures; live = DB brainset; none = no portfolio */
  @IsOptional()
  @IsIn(["demo", "none", "live"])
  portfolio?: "demo" | "none" | "live";

  @IsOptional()
  @IsString()
  familyId?: string;
}
