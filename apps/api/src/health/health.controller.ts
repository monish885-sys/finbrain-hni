import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@capstone/types";

@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "capstone-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }
}
