import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SearchRun, SearchRunSchema } from "./search-run.schema";
import { SearchRunsService } from "./search-runs.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: SearchRun.name, schema: SearchRunSchema }])],
  providers: [SearchRunsService],
  exports: [SearchRunsService]
})
export class SearchRunsModule {}
