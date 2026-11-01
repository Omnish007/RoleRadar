import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Company, CompanySchema } from "./company.schema";
import { Recruiter, RecruiterSchema } from "./recruiter.schema";
import { Interview, InterviewSchema } from "./interview.schema";
import { Opportunity, OpportunitySchema } from "../opportunities/opportunity.schema";
import { RelationshipsController } from "./relationships.controller";
import { RelationshipsService } from "./relationships.service";

@Module({
  imports: [MongooseModule.forFeature([
    { name: Company.name, schema: CompanySchema },
    { name: Recruiter.name, schema: RecruiterSchema },
    { name: Interview.name, schema: InterviewSchema },
    { name: Opportunity.name, schema: OpportunitySchema }
  ])],
  controllers: [RelationshipsController],
  providers: [RelationshipsService]
})
export class RelationshipsModule {}
