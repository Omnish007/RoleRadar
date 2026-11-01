import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { SearchIntentSchema, SearchProfileInputSchema, SearchProfileUpdateSchema, SearchRunInputSchema } from "@roleradar/contracts";
import { SearchCompilerService } from "./search-compiler.service";
import { SearchProfilesService } from "./search-profiles.service";
import { SearchRunsService } from "./search-runs.service";

@Controller("search")
export class SearchController {
  constructor(
    private readonly compiler: SearchCompilerService,
    private readonly profiles: SearchProfilesService,
    private readonly runs: SearchRunsService
  ) {}

  @Post("compile")
  compile(@Body() body: unknown) { return this.compiler.compile(SearchIntentSchema.parse(body)); }

  @Post("profiles")
  createProfile(@Body() body: unknown) { return this.profiles.create(SearchProfileInputSchema.parse(body)); }

  @Get("profiles")
  listProfiles() { return this.profiles.findAll(); }

  @Patch("profiles/:id")
  updateProfile(@Param("id") id: string, @Body() body: unknown) { return this.profiles.update(id, SearchProfileUpdateSchema.parse(body)); }

  @Delete("profiles/:id")
  deleteProfile(@Param("id") id: string) { return this.profiles.remove(id); }

  @Post("runs")
  recordRun(@Body() body: unknown) { return this.runs.record(SearchRunInputSchema.parse(body)); }

  @Get("runs")
  listRuns() { return this.runs.list(); }
}
