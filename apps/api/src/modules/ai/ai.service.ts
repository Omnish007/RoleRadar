import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SearchIntentSchema } from "@roleradar/contracts";

@Injectable()
export class AiService {
  private readonly baseUrl: string;
  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("AI_SERVICE_URL", "http://127.0.0.1:8010");
  }

  async parseSearchIntent(text: string) {
    return SearchIntentSchema.parse(await this.post("/v1/search-intent", { text }));
  }
  expandKeywords(role: string, skills: string[], context = "") {
    return this.post("/v1/keywords/expand", { role, skills, context });
  }
  analyzeJobDescription(jobDescription: string) {
    return this.post("/v1/job-description/analyze", { job_description: jobDescription });
  }
  matchResume(resumeText: string, jobDescription: string) {
    return this.post("/v1/resume/match", { resume_text: resumeText, job_description: jobDescription });
  }
  generateInterviewQuestions(jobDescription: string, seniority?: string) {
    return this.post("/v1/interview/questions", { job_description: jobDescription, seniority: seniority || "" });
  }
  summarizeNotes(text: string) { return this.post("/v1/notes/summarize", { text }); }
  summarizeCompany(companyName: string, sourceMaterial: string) {
    return this.post("/v1/company/summarize", { company_name: companyName, source_material: sourceMaterial });
  }

  private async post(path: string, payload: Record<string, string | string[]>) {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(180_000)
      });
      if (response.status === 404 || response.status === 503) {
        throw new ServiceUnavailableException("Local AI service is unavailable. Start Ollama and the Python AI service.");
      }
      if (!response.ok) throw new BadGatewayException(`Local AI service returned ${response.status}.`);
      return response.json();
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof BadGatewayException) throw error;
      throw new ServiceUnavailableException("Cannot connect to the local AI service.");
    }
  }
}
