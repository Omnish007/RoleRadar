import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Opportunity, OpportunitySchema } from "./opportunity.schema";
import { Company, CompanySchema } from "../relationships/company.schema";
import { OpportunitiesController } from "./opportunities.controller";
import { OpportunitiesService } from "./opportunities.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [MongooseModule.forFeature([{ name: Opportunity.name, schema: OpportunitySchema }, { name: Company.name, schema: CompanySchema }]), NotificationsModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService]
})
export class OpportunitiesModule {}
