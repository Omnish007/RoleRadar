import { Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { AiService } from "./ai.service";

const KeywordExpansionSchema = z.object({ role: z.string().trim().min(2).max(160), skills: z.array(z.string().trim().min(1).max(80)).max(30).default([]), context: z.string().trim().max(2000).optional() });
const SearchPromptSchema = z.object({ text: z.string().trim().min(5).max(4000) });
const JobDescriptionSchema = z.object({ jobDescription: z.string().trim().min(30).max(15000) });
const ResumeMatchSchema = z.object({
  resumeText: z.string().trim().min(50).max(20000),
  jobDescription: z.string().trim().min(30).max(15000)
});
const InterviewSchema = z.object({
  jobDescription: z.string().trim().min(30).max(15000),
  seniority: z.string().trim().max(80).optional()
});
const TextSchema = z.object({ text: z.string().trim().min(30).max(15000) });
const CompanySchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  sourceMaterial: z.string().trim().min(50).max(15000)
});

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Post("search-intent") parse(@Body() body: unknown) {
    return this.ai.parseSearchIntent(SearchPromptSchema.parse(body).text);
  }
  @Post("keywords/expand") expandKeywords(@Body() body: unknown) {
    const input = KeywordExpansionSchema.parse(body);
    return this.ai.expandKeywords(input.role, input.skills, input.context);
  }
  @Post("job-description/analyze") analyze(@Body() body: unknown) {
    return this.ai.analyzeJobDescription(JobDescriptionSchema.parse(body).jobDescription);
  }
  @Post("resume/match") matchResume(@Body() body: unknown) {
    const input = ResumeMatchSchema.parse(body);
    return this.ai.matchResume(input.resumeText, input.jobDescription);
  }
  @Post("interview/questions") interviewQuestions(@Body() body: unknown) {
    const input = InterviewSchema.parse(body);
    return this.ai.generateInterviewQuestions(input.jobDescription, input.seniority);
  }
  @Post("notes/summarize") summarizeNotes(@Body() body: unknown) {
    return this.ai.summarizeNotes(TextSchema.parse(body).text);
  }
  @Post("company/summarize") summarizeCompany(@Body() body: unknown) {
    const input = CompanySchema.parse(body);
    return this.ai.summarizeCompany(input.companyName, input.sourceMaterial);
  }
}
