import { z } from "zod";

export const EnvironmentSchema = z.object({
  MONGODB_URI: z.string().url().default("mongodb://127.0.0.1:27017/roleradar"),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).default("qwen2.5:3b"),
  AI_SERVICE_URL: z.string().url().default("http://127.0.0.1:8010"),
  BACKUP_DIR: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});
