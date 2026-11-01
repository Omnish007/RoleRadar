import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { BackupService } from "./backup.service";

@Processor("backups")
export class BackupProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupProcessor.name);
  constructor(private readonly backup: BackupService) { super(); }

  async process(job: Job) {
    if (job.name !== "automatic-backup") throw new Error(`Unsupported backup job: ${job.name}`);
    const result = await this.backup.createAutomaticBackup();
    this.logger.log(`Automatic backup created: ${result.fileName}`);
    return result;
  }
}
