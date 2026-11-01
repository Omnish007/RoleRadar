import { ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller";

function createController(databaseReady: boolean, redisReady: boolean) {
  const connection = {
    readyState: databaseReady ? 1 : 0,
    db: databaseReady ? { admin: () => ({ ping: vi.fn().mockResolvedValue({ ok: 1 }) }) } : undefined
  } as never;
  const config = { get: vi.fn().mockReturnValue("http://127.0.0.1:8010") } as never;
  const notifications = { checkRedis: vi.fn().mockResolvedValue(redisReady) } as never;
  return new HealthController(connection, config, notifications);
}

describe("HealthController", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("reports process liveness without requiring external dependencies", () => {
    const controller = createController(false, false);
    expect(controller.getLiveness()).toMatchObject({ status: "alive", service: "roleradar-api" });
  });

  it("reports readiness when MongoDB and Redis are reachable", async () => {
    const controller = createController(true, true);
    await expect(controller.getReadiness()).resolves.toMatchObject({
      status: "ready", database: "connected", redis: "connected"
    });
  });

  it("returns a service-unavailable response when a required dependency is down", async () => {
    const controller = createController(true, false);
    await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("does not treat the optional AI service as a readiness dependency", async () => {
    const controller = createController(true, true);
    await expect(controller.getReadiness()).resolves.toMatchObject({ status: "ready" });
  });

  it("reports the AI process separately from Ollama availability", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ service: "roleradar-ai", status: "degraded", ollama: "unavailable" })
    }));
    const controller = createController(true, true);
    await expect(controller.getHealth()).resolves.toMatchObject({
      status: "ok", aiService: "running", ollama: "unavailable"
    });
  });
});
