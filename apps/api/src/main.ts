import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { DomainExceptionFilter } from "./common/filters/domain-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ["error", "warn", "log"] });
  app.setGlobalPrefix("api");
  app.useBodyParser("json", { limit: "20mb" });
  app.enableShutdownHooks();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowedOrigin?: boolean | string | RegExp | Array<string | RegExp>) => void
    ) => {
      const allowed = !origin || origin === "null" || ["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin);
      callback(allowed ? null : new Error("Origin not allowed"), allowed);
    }
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new DomainExceptionFilter());
  await app.listen(4310, "127.0.0.1");
}
void bootstrap();
