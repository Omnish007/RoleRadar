import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { Connection } from "mongoose";
import { NotificationsService } from "../notifications/notifications.service";

@Controller("health")
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService
  ) {}

  @Get("live")
  getLiveness() {
    return { status: "alive", service: "roleradar-api", timestamp: new Date().toISOString() };
  }

  // Diagnostic health includes optional dependencies; it does not gate API readiness.
  @Get()
  async getHealth() {
    const [database, redis, ai] = await Promise.all([
      this.isDatabaseReady(),
      this.notifications.checkRedis(),
      this.checkAiService()
    ]);

    return {
      status: database && redis ? "ok" : "degraded",
      service: "roleradar-api",
      database: database ? "connected" : "disconnected",
      redis: redis ? "connected" : "disconnected",
      aiService: ai.running ? "running" : "unavailable",
      ollama: ai.ollama ? "available" : "unavailable",
      timestamp: new Date().toISOString()
    };
  }

  // Readiness is used by the desktop supervisor before reporting the API as started.
  @Get("ready")
  async getReadiness() {
    const [database, redis] = await Promise.all([
      this.isDatabaseReady(),
      this.notifications.checkRedis()
    ]);

    if (!database || !redis) {
      throw new ServiceUnavailableException({
        status: "not_ready",
        database: database ? "connected" : "disconnected",
        redis: redis ? "connected" : "disconnected"
      });
    }

    return {
      status: "ready",
      service: "roleradar-api",
      database: "connected",
      redis: "connected",
      timestamp: new Date().toISOString()
    };
  }

  private async isDatabaseReady(): Promise<boolean> {
    if (this.connection.readyState !== 1 || !this.connection.db) return false;
    try {
      await this.connection.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }

  private async checkAiService(): Promise<{ running: boolean; ollama: boolean }> {
    try {
      const response = await fetch(`${this.config.get("AI_SERVICE_URL")}/health`, {
        signal: AbortSignal.timeout(2500)
      });
      if (!response.ok) return { running: false, ollama: false };
      const result = await response.json() as { service?: string; ollama?: string };
      return {
        running: result.service === "roleradar-ai",
        ollama: result.service === "roleradar-ai" && result.ollama === "available"
      };
    } catch {
      return { running: false, ollama: false };
    }
  }
}
