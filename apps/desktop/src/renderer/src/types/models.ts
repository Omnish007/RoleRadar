import type { OpportunityStatus, Platform, SearchIntent, SearchPlan } from "@roleradar/contracts";

export type SavedProfile = { _id: string; name: string; collection: string; intent: SearchIntent; createdAt: string; updatedAt: string };
export type OpportunityRecord = {
  _id: string; title: string; company: string; source: Platform; sourceUrl: string;
  location?: string; salaryText?: string; notes?: string; status: OpportunityStatus;
  followUpAt?: string | null; appliedAt?: string | null; companyPreference?: "preferred" | "neutral" | "avoid";
  statusHistory?: { status: OpportunityStatus; changedAt: string }[];
  createdAt: string; updatedAt: string;
};
export type NotificationRecord = {
  _id: string; title: string; message: string; type: "reminder" | "system";
  readAt: string | null; createdAt: string; opportunityId?: string | null;
};
export type SearchRunRecord = {
  _id: string; profileName: string; platform: Platform; variantId: string;
  query?: string; createdAt: string;
};
export type CompanyRecord = {
  _id: string; name: string; website?: string; careersUrl?: string; industry?: string;
  companyType: string; location?: string; notes?: string; preference: "preferred" | "neutral" | "avoid";
};
export type RecruiterRecord = {
  _id: string; name: string; role?: string; companyName?: string; email?: string;
  profileUrl?: string; notes?: string;
};
export type InterviewRecord = {
  _id: string; opportunityId: string | { _id: string; title: string; company: string };
  roundName: string; scheduledAt: string; mode: string; interviewer?: string;
  notes?: string; status: string;
};
export type HealthStatus = {
  status: string; service?: string; database: string; redis: string; aiService: string; ollama?: string; timestamp: string;
};
export type { SearchIntent, SearchPlan };

export type ResumeRecord = {
  _id: string; title: string; targetRole?: string; versionLabel?: string;
  content?: string; notes?: string; tags: string[]; createdAt: string; updatedAt: string;
};
