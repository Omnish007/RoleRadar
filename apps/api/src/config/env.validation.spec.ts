import { describe, expect, it } from "vitest";
import { EnvironmentSchema } from "./env.validation";

describe("EnvironmentSchema", () => {
  it("supplies safe local defaults", () => {
    expect(EnvironmentSchema.parse({})).toMatchObject({
      MONGODB_URI: "mongodb://127.0.0.1:27017/roleradar",
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: 6379,
      AI_SERVICE_URL: "http://127.0.0.1:8010",
      NODE_ENV: "development"
    });
  });

  it("coerces the Redis port and rejects invalid values", () => {
    expect(EnvironmentSchema.parse({ REDIS_PORT: "6380" }).REDIS_PORT).toBe(6380);
    expect(() => EnvironmentSchema.parse({ REDIS_PORT: "70000" })).toThrow();
  });

  it("rejects invalid service URLs", () => {
    expect(() => EnvironmentSchema.parse({ MONGODB_URI: "not-a-url" })).toThrow();
  });
});
