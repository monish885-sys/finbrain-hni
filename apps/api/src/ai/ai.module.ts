import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import type { AskAiResponse } from "@capstone/types";
import { AiService } from "./ai.service";
import { JwtService } from "@nestjs/jwt";
import { Module } from "@nestjs/common";
import { BrainsetModule } from "../brainset/brainset.module";
import { AuthModule } from "../auth/auth.module";

@Controller("ai")
export class AiController {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  @Post("ask")
  @HttpCode(HttpStatus.OK)
  async ask(
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
  ): Promise<AskAiResponse> {
    let userId: string | undefined;
    if (authorization?.startsWith("Bearer ")) {
      try {
        const payload = this.jwt.verify<{ sub: string }>(authorization.slice(7));
        userId = payload.sub;
      } catch {
        // Public ask still allowed without valid JWT (demo DX)
      }
    }
    return this.aiService.ask(body, userId);
  }
}

@Module({
  imports: [BrainsetModule, AuthModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
