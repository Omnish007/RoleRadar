import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SearchProfile, SearchProfileSchema } from "./search-profile.schema";
import { SearchProfilesService } from "./search-profiles.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: SearchProfile.name, schema: SearchProfileSchema }])],
  providers: [SearchProfilesService],
  exports: [SearchProfilesService]
})
export class SearchProfilesModule {}
