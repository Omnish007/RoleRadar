import { Controller, Get, Param, Patch } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get() list() { return this.service.list(); }
  @Patch(":id/read") markRead(@Param("id") id: string) { return this.service.markRead(id); }
}
