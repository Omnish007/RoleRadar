import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { SearchProfile, SearchProfileSchema } from "../search/search-profile.schema";
import { SearchRun, SearchRunSchema } from "../search/search-run.schema";
import { Opportunity, OpportunitySchema } from "../opportunities/opportunity.schema";
import { Notification, NotificationSchema } from "../notifications/notification.schema";
import { Company, CompanySchema } from "../relationships/company.schema";
import { Recruiter, RecruiterSchema } from "../relationships/recruiter.schema";
import { Interview, InterviewSchema } from "../relationships/interview.schema";
import { Resume, ResumeSchema } from "../resumes/resume.schema";
import { BackupController } from "./backup.controller";
import { BackupService } from "./backup.service";
import { BackupScheduler } from "./backup.scheduler";
import { BackupProcessor } from "./backup.processor";

@Module({
  imports: [BullModule.registerQueue({ name: "backups" }), MongooseModule.forFeature([
    { name: SearchProfile.name, schema: SearchProfileSchema },
    { name: SearchRun.name, schema: SearchRunSchema },
    { name: Opportunity.name, schema: OpportunitySchema },
    { name: Notification.name, schema: NotificationSchema },
    { name: Company.name, schema: CompanySchema },
    { name: Recruiter.name, schema: RecruiterSchema },
    { name: Interview.name, schema: InterviewSchema },
    { name: Resume.name, schema: ResumeSchema }
  ])],
  controllers: [BackupController], providers: [BackupService, BackupScheduler, BackupProcessor]
})
export class BackupModule {}
