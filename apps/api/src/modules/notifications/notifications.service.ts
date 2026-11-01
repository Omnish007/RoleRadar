import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { InjectModel } from "@nestjs/mongoose";
import { Queue } from "bullmq";
import { Model, Types } from "mongoose";
import { Notification, NotificationDocument } from "./notification.schema";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly model: Model<NotificationDocument>,
    @InjectQueue("notifications") private readonly queue: Queue
  ) {}

  async scheduleFollowUp(opportunityId: string, title: string, dueAt: Date, message?: string) {
    const delay = Math.max(0, dueAt.getTime() - Date.now());
    await this.queue.add("follow-up", { opportunityId, title, message }, {
      jobId: `follow-up-${opportunityId}-${dueAt.getTime()}`,
      delay, attempts: 4, backoff: { type: "exponential", delay: 2000, jitter: 0.25 },
      removeOnComplete: 200, removeOnFail: 500
    });
    return { scheduled: true, dueAt };
  }

  async cancelFollowUp(opportunityId: string, dueAt?: Date | null) {
    if (!dueAt) return false;
    const job = await this.queue.getJob(`follow-up-${opportunityId}-${dueAt.getTime()}`);
    if (!job) return false;
    try { await job.remove(); return true; }
    catch { return false; }
  }

  async checkRedis(): Promise<boolean> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.queue.getJobCounts(),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Redis health timeout")), 1200);
        })
      ]);
      return true;
    } catch {
      return false;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  list() { return this.model.find().sort({ createdAt: -1 }).limit(100).lean().exec(); }

  async markRead(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Notification not found");
    const notification = await this.model.findByIdAndUpdate(id, { readAt: new Date() }, { new: true });
    if (!notification) throw new NotFoundException("Notification not found");
    return notification;
  }

  async createReminderEvent(jobId: string, opportunityId: string, title: string, message?: string) {
    return this.model.updateOne(
      { dedupeKey: String(jobId) },
      { $setOnInsert: {
        dedupeKey: String(jobId), title: `Follow up: ${title}`,
        message: message || `Your follow-up reminder for ${title} is due.`,
        type: "reminder", opportunityId, readAt: null
      } },
      { upsert: true }
    );
  }
}
