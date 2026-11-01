import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchCompilerService } from "./search-compiler.service";
import { SearchProfilesModule } from "./search-profiles.module";
import { SearchRunsModule } from "./search-runs.module";

@Module({
  imports: [SearchProfilesModule, SearchRunsModule],
  controllers: [SearchController],
  providers: [SearchCompilerService],
  exports: [SearchCompilerService]
})
export class SearchModule {}
