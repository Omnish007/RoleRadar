import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class BackupScheduler implements OnModuleInit {
  private readonly logger = new Logger(BackupScheduler.name);
  constructor(@InjectQueue("backups") private readonly queue: Queue) {}

  async onModuleInit() {
    try {
      await this.queue.add("automatic-backup", {}, {
        jobId: "roleradar-daily-backup",
        repeat: { every: 24 * 60 * 60 * 1000 },
        attempts: 3, backoff: { type: "exponential", delay: 5000, jitter: 0.2 },
        removeOnComplete: 20, removeOnFail: 100
      });
    } catch (error) {
      this.logger.error("Unable to register daily backup schedule", error instanceof Error ? error.stack : undefined);
    }
  }
}
