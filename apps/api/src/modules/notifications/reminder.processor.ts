import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { NotificationsService } from "./notifications.service";

interface ReminderJob { opportunityId: string; title: string; message?: string; }

@Processor("notifications")
export class ReminderProcessor extends WorkerHost {
  constructor(private readonly notifications: NotificationsService) { super(); }

  async process(job: Job<ReminderJob>) {
    if (job.name !== "follow-up") throw new Error(`Unsupported notification job: ${job.name}`);
    await this.notifications.createReminderEvent(String(job.id), job.data.opportunityId, job.data.title, job.data.message);
    return { notificationCreated: true };
  }
}
