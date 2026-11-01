import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ResumeInputSchema } from "@roleradar/contracts";
import { ResumesService } from "./resumes.service";

@Controller("resumes")
export class ResumesController {
  constructor(private readonly service: ResumesService) {}
  @Get() list() { return this.service.list(); }
  @Get(":id") get(@Param("id") id: string) { return this.service.get(id); }
  @Post() create(@Body() body: unknown) { return this.service.create(ResumeInputSchema.parse(body)); }
  @Delete(":id") remove(@Param("id") id: string) { return this.service.remove(id); }
}
