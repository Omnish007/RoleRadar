import type {
  BackupImport, CompanyInput, CompanyPreference, InterviewInput, OpportunityInput, OpportunityStatus,
  Platform, RecruiterInput, ReminderInput, ResumeInput, SearchIntent, SearchRunInput
} from "@roleradar/contracts";
import type {
  CompanyRecord, HealthStatus, InterviewRecord, NotificationRecord, ResumeRecord,
  OpportunityRecord, RecruiterRecord, SavedProfile, SearchPlan, SearchRunRecord
} from "../types/models";

const API_BASE = window.roleRadar.apiBase || "http://127.0.0.1:4310/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init, headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      message = body.message || message;
      if (Array.isArray(body.issues) && body.issues.length) {
        const details = body.issues
          .map((issue: { path?: string; message?: string }) => [issue.path, issue.message].filter(Boolean).join(": "))
          .filter(Boolean);
        if (details.length) message = `${message}: ${details.join("; ")}`;
      }
    } catch { /* Keep status fallback. */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const json = (method: string, data?: unknown): RequestInit => ({
  method, ...(data === undefined ? {} : { body: JSON.stringify(data) })
});

export const api = {
  compile: (intent: SearchIntent) => request<SearchPlan[]>("/search/compile", json("POST", intent)),
  saveProfile: (intent: SearchIntent, collection = "General") => request<SavedProfile>("/search/profiles", json("POST", { intent, collection })),
  updateProfile: (id: string, data: { name?: string; collection?: string }) => request<SavedProfile>(`/search/profiles/${id}`, json("PATCH", data)),
  deleteProfile: (id: string) => request(`/search/profiles/${id}`, json("DELETE")),
  profiles: () => request<SavedProfile[]>("/search/profiles"),
  recordRun: (data: SearchRunInput) => request<SearchRunRecord>("/search/runs", json("POST", data)),
  searchRuns: () => request<SearchRunRecord[]>("/search/runs"),
  opportunities: () => request<OpportunityRecord[]>("/opportunities"),
  addOpportunity: (data: OpportunityInput) => request<OpportunityRecord>("/opportunities", json("POST", data)),
  scheduleReminder: (id: string, data: ReminderInput) => request(`/opportunities/${id}/reminders`, json("POST", data)),
  updateOpportunityStatus: (id: string, status: OpportunityStatus) => request(`/opportunities/${id}/status`, json("PATCH", { status })),
  notifications: () => request<NotificationRecord[]>("/notifications"),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, json("PATCH")),
  expandKeywords: (role: string, skills: string[], context = "") => request<Record<string, unknown>>("/ai/keywords/expand", json("POST", { role, skills, context })),
  parseIntent: (text: string) => request<SearchIntent>("/ai/search-intent", json("POST", { text })),
  analyzeJob: (jobDescription: string) => request<Record<string, unknown>>("/ai/job-description/analyze", json("POST", { jobDescription })),
  matchResume: (resumeText: string, jobDescription: string) => request<Record<string, unknown>>("/ai/resume/match", json("POST", { resumeText, jobDescription })),
  interviewQuestions: (jobDescription: string, seniority?: string) => request<Record<string, unknown>>("/ai/interview/questions", json("POST", { jobDescription, seniority })),
  summarizeNotes: (text: string) => request<Record<string, unknown>>("/ai/notes/summarize", json("POST", { text })),
  summarizeCompany: (companyName: string, sourceMaterial: string) => request<Record<string, unknown>>("/ai/company/summarize", json("POST", { companyName, sourceMaterial })),
  companies: () => request<CompanyRecord[]>("/companies"),
  createCompany: (data: CompanyInput) => request<CompanyRecord>("/companies", json("POST", data)),
  updateCompanyPreference: (id: string, preference: CompanyPreference) => request<CompanyRecord>(`/companies/${id}/preference`, json("PATCH", { preference })),
  recruiters: () => request<RecruiterRecord[]>("/recruiters"),
  createRecruiter: (data: RecruiterInput) => request<RecruiterRecord>("/recruiters", json("POST", data)),
  interviews: () => request<InterviewRecord[]>("/interviews"),
  resumes: () => request<ResumeRecord[]>("/resumes"),
  resume: (id: string) => request<ResumeRecord>(`/resumes/${id}`),
  createResume: (data: ResumeInput) => request<ResumeRecord>("/resumes", json("POST", data)),
  deleteResume: (id: string) => request(`/resumes/${id}`, json("DELETE")),
  createInterview: (data: InterviewInput) => request<InterviewRecord>("/interviews", json("POST", data)),
  updateInterviewStatus: (id: string, status: InterviewInput["status"]) => request(`/interviews/${id}/status`, json("PATCH", { status })),
  backupStatus: () => request<{ directory: string; latest: { fileName: string; sizeBytes: number; modifiedAt: string } | null; count: number }>("/backup/status"),
  runBackup: () => request<{ fileName: string; directory: string; createdAt: string }>("/backup/run", json("POST")),
  exportBackup: () => request<BackupImport & { exportedAt: string }>("/backup/export"),
  importBackup: (data: BackupImport) => request<{ imported: number; collections: Record<string, number> }>("/backup/import", json("POST", data)),
  health: () => request<HealthStatus>("/health")
};

export const platformHome: Record<Platform, string> = {
  linkedin: "https://www.linkedin.com/jobs/",
  naukri: "https://www.naukri.com/",
  indeed: "https://in.indeed.com/",
  wellfound: "https://wellfound.com/jobs"
};
