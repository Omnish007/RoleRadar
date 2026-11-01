import { Module } from "@nestjs/common";
import { resolve } from "node:path";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { EnvironmentSchema } from "./config/env.validation";
import { SearchModule } from "./modules/search/search.module";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module";
import { AiModule } from "./modules/ai/ai.module";
import { HealthModule } from "./modules/health/health.module";
import { RelationshipsModule } from "./modules/relationships/relationships.module";
import { BackupModule } from "./modules/backup/backup.module";
import { ResumesModule } from "./modules/resumes/resumes.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(__dirname, "../../../.env"), ".env"],
      validate: (environment: Record<string, unknown>) => EnvironmentSchema.parse(environment)
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGODB_URI"), serverSelectionTimeoutMS: 5000,
        autoIndex: config.get<string>("NODE_ENV") !== "production", maxPoolSize: 10
      })
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("REDIS_HOST"), port: config.get<number>("REDIS_PORT"),
          maxRetriesPerRequest: null, enableReadyCheck: true
        }
      })
    }),
    SearchModule, OpportunitiesModule, AiModule, HealthModule, RelationshipsModule, BackupModule, ResumesModule
  ]
})
export class AppModule {}
