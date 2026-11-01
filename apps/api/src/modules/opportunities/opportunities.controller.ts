import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { OpportunityInputSchema, OpportunityStatusSchema, ReminderInputSchema } from "@roleradar/contracts";
import { OpportunitiesService } from "./opportunities.service";

@Controller("opportunities")
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() body: unknown) { return this.service.create(OpportunityInputSchema.parse(body)); }
  @Patch(":id/status") updateStatus(@Param("id") id: string, @Body("status") status: unknown) {
    return this.service.updateStatus(id, OpportunityStatusSchema.parse(status));
  }
  @Post(":id/reminders") scheduleReminder(@Param("id") id: string, @Body() body: unknown) {
    return this.service.scheduleReminder(id, ReminderInputSchema.parse(body));
  }
}
