import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CompanyInputSchema, CompanyPreferenceSchema, InterviewInputSchema, RecruiterInputSchema } from "@roleradar/contracts";
import { z } from "zod";
import { RelationshipsService } from "./relationships.service";

const InterviewStatusSchema = z.enum(["scheduled", "completed", "cancelled", "rescheduled"]);

@Controller()
export class RelationshipsController {
  constructor(private readonly service: RelationshipsService) {}

  @Get("companies") companies() { return this.service.listCompanies(); }
  @Post("companies") createCompany(@Body() body: unknown) { return this.service.createCompany(CompanyInputSchema.parse(body)); }
  @Patch("companies/:id/preference") updateCompanyPreference(@Param("id") id: string, @Body("preference") preference: unknown) {
    return this.service.updateCompanyPreference(id, CompanyPreferenceSchema.parse(preference));
  }
  @Get("recruiters") recruiters() { return this.service.listRecruiters(); }
  @Post("recruiters") createRecruiter(@Body() body: unknown) { return this.service.createRecruiter(RecruiterInputSchema.parse(body)); }
  @Get("interviews") interviews() { return this.service.listInterviews(); }
  @Post("interviews") createInterview(@Body() body: unknown) { return this.service.createInterview(InterviewInputSchema.parse(body)); }
  @Patch("interviews/:id/status") updateInterview(@Param("id") id: string, @Body("status") status: unknown) {
    return this.service.updateInterviewStatus(id, InterviewStatusSchema.parse(status));
  }
}
