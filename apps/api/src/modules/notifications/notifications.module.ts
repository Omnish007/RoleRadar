import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { Notification, NotificationSchema } from "./notification.schema";
import { ReminderProcessor } from "./reminder.processor";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    BullModule.registerQueue({ name: "notifications" })
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, ReminderProcessor],
  exports: [NotificationsService]
})
export class NotificationsModule {}
