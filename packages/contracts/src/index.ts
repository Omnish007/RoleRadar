import { z } from "zod";

export const PlatformSchema = z.enum(["linkedin", "naukri", "indeed", "wellfound"]);
export type Platform = z.infer<typeof PlatformSchema>;

export const SearchIntentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  primaryRole: z.string().trim().min(1).max(120),
  alternativeRoles: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  mustHaveSkills: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  preferredSkills: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  excludedTerms: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  locations: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  minExperience: z.number().min(0).max(60).optional(),
  maxExperience: z.number().min(0).max(60).optional(),
  workModes: z.array(z.enum(["remote", "hybrid", "onsite"])).default([]),
  employmentTypes: z.array(z.enum(["full-time", "contract", "part-time", "internship"])).default(["full-time"]),
  postedWithinDays: z.number().int().positive().max(365).optional(),
  minSalary: z.number().nonnegative().optional(),
  maxSalary: z.number().positive().optional(),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  intent: z.enum(["jobs", "hiring_posts", "both"]).default("jobs"),
  precision: z.enum(["broad", "balanced", "precise"]).default("balanced")
}).superRefine((value, ctx) => {
  if (value.minExperience !== undefined && value.maxExperience !== undefined && value.minExperience > value.maxExperience) {
    ctx.addIssue({ code: "custom", path: ["maxExperience"], message: "Maximum experience must be greater than or equal to minimum experience." });
  }
  if (value.minSalary !== undefined && value.maxSalary !== undefined && value.minSalary > value.maxSalary) {
    ctx.addIssue({ code: "custom", path: ["maxSalary"], message: "Maximum salary must be greater than or equal to minimum salary." });
  }
});

export type SearchIntent = z.infer<typeof SearchIntentSchema>;

export const SearchProfileInputSchema = z.object({
  intent: SearchIntentSchema,
  collection: z.string().trim().min(1).max(80).default("General")
});
export type SearchProfileInput = z.infer<typeof SearchProfileInputSchema>;

export const SearchProfileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  collection: z.string().trim().min(1).max(80).optional(),
  intent: SearchIntentSchema.optional()
}).refine((value) => Object.keys(value).length > 0, "At least one profile field must be provided.");
export type SearchProfileUpdate = z.infer<typeof SearchProfileUpdateSchema>;

export interface SearchVariant {
  id: string;
  label: string;
  query?: string;
  strategy: string;
}

export interface SearchPlan {
  platform: Platform;
  variants: SearchVariant[];
  nativeFilters: Record<string, unknown>;
  manualInstructions: string[];
  warnings: string[];
}



export const OpportunityStatusSchema = z.enum([
  "interested", "shortlisted", "applied", "screening",
  "interview", "offer", "rejected", "closed"
]);
export type OpportunityStatus = z.infer<typeof OpportunityStatusSchema>;

const allowedHosts: Record<Platform, string[]> = {
  linkedin: ["linkedin.com"],
  naukri: ["naukri.com"],
  indeed: ["indeed.com", "indeed.co.in"],
  wellfound: ["wellfound.com"]
};

export const OpportunityInputBaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(160),
  source: PlatformSchema,
  sourceUrl: z.string().url().max(2048).refine((raw) => {
    try {
      const parsed = new URL(raw);
      return parsed.protocol === "https:" && allowedHostsForUrl(parsed.hostname);
    } catch { return false; }
  }, "Use an HTTPS job URL from the selected job platform."),
  location: z.string().trim().max(200).optional(),
  salaryText: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional()
});
export const OpportunityInputSchema = OpportunityInputBaseSchema.superRefine((value, ctx) => {
  const hostname = new URL(value.sourceUrl).hostname.toLowerCase();
  if (!allowedHosts[value.source].some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: "URL host does not match the selected source." });
  }
});

function allowedHostsForUrl(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return Object.values(allowedHosts).flat().some((host) => normalized === host || normalized.endsWith(`.${host}`));
}

export const ReminderInputSchema = z.object({
  dueAt: z.string().datetime({ offset: true }),
  message: z.string().trim().max(500).optional()
}).superRefine((value, ctx) => {
  if (new Date(value.dueAt).getTime() <= Date.now()) {
    ctx.addIssue({ code: "custom", path: ["dueAt"], message: "Reminder time must be in the future." });
  }
});
export type ReminderInput = z.infer<typeof ReminderInputSchema>;

export const SearchRunInputSchema = z.object({
  profileName: z.string().trim().min(1).max(100),
  platform: PlatformSchema,
  variantId: z.string().trim().min(1).max(80),
  query: z.string().max(4000).optional()
});
export type SearchRunInput = z.infer<typeof SearchRunInputSchema>;

export type OpportunityInput = z.infer<typeof OpportunityInputSchema>;


export const CompanyInputBaseSchema = z.object({
  name: z.string().trim().min(1).max(160),
  website: z.string().url().max(2048).optional(),
  careersUrl: z.string().url().max(2048).optional(),
  industry: z.string().trim().max(120).optional(),
  companyType: z.enum(["startup", "product", "service", "mnc", "other"]).default("other"),
  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
  preference: z.enum(["preferred", "neutral", "avoid"]).default("neutral")
});
export const CompanyInputSchema = CompanyInputBaseSchema.superRefine((value, ctx) => {
  for (const field of ["website", "careersUrl"] as const) {
    const raw = value[field];
    if (raw && new URL(raw).protocol !== "https:") {
      ctx.addIssue({ code: "custom", path: [field], message: "Use an HTTPS URL." });
    }
  }
});
export type CompanyInput = z.infer<typeof CompanyInputSchema>;

export const CompanyPreferenceSchema = z.enum(["preferred", "neutral", "avoid"]);
export type CompanyPreference = z.infer<typeof CompanyPreferenceSchema>;

export const RecruiterInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  role: z.string().trim().max(120).optional(),
  companyName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(254).optional(),
  profileUrl: z.string().url().max(2048).refine((raw) => new URL(raw).protocol === "https:", "Use an HTTPS profile URL.").optional(),
  notes: z.string().trim().max(5000).optional()
});
export type RecruiterInput = z.infer<typeof RecruiterInputSchema>;

export const InterviewInputSchema = z.object({
  opportunityId: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid opportunity ID."),
  roundName: z.string().trim().min(1).max(120),
  scheduledAt: z.string().datetime({ offset: true }),
  mode: z.enum(["online", "phone", "onsite", "other"]).default("online"),
  interviewer: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(5000).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).default("scheduled")
});
export type InterviewInput = z.infer<typeof InterviewInputSchema>;


export const ResumeInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  targetRole: z.string().trim().max(120).optional(),
  versionLabel: z.string().trim().max(80).optional(),
  content: z.string().trim().min(100).max(30000),
  notes: z.string().trim().max(3000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([])
});
export type ResumeInput = z.infer<typeof ResumeInputSchema>;


const BackupIdSchema = z.string().regex(/^[a-f0-9]{24}$/i);
const BackupDateSchema = z.string().datetime({ offset: true }).optional();
export const BackupImportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime({ offset: true }).optional(),
  profiles: z.array(z.object({
    _id: BackupIdSchema, name: z.string().min(1).max(100), intent: SearchIntentSchema, collection: z.string().max(80).default("General"),
    createdAt: BackupDateSchema, updatedAt: BackupDateSchema
  })).max(5000).default([]),
  resumes: z.array(z.object({
    _id: BackupIdSchema, ...ResumeInputSchema.shape,
    createdAt: BackupDateSchema, updatedAt: BackupDateSchema
  })).max(500).default([]),
  opportunities: z.array(z.object({
    _id: BackupIdSchema, ...OpportunityInputBaseSchema.shape,
    status: OpportunityStatusSchema.default("interested"), companyPreference: z.enum(["preferred", "neutral", "avoid"]).optional(), followUpAt: BackupDateSchema.nullable().optional(),
    appliedAt: BackupDateSchema.nullable().optional(), statusHistory: z.array(z.object({ status: OpportunityStatusSchema, changedAt: z.string().datetime({ offset: true }) })).max(200).optional(),
    createdAt: BackupDateSchema, updatedAt: BackupDateSchema
  })).max(10000).default([]),
  searchRuns: z.array(z.object({
    _id: BackupIdSchema, ...SearchRunInputSchema.shape,
    createdAt: BackupDateSchema, updatedAt: BackupDateSchema
  })).max(20000).default([]),
  companies: z.array(z.object({
    _id: BackupIdSchema, ...CompanyInputBaseSchema.shape,
    createdAt: BackupDateSchema, updatedAt: BackupDateSchema
  })).max(5000).default([]),
  recruiters: z.array(z.object({
    _id: BackupIdSchema, ...RecruiterInputSchema.shape,
    createdAt: BackupDateSchema, updatedAt: BackupDateSchema
  })).max(10000).default([]),
  interviews: z.array(z.object({
    _id: BackupIdSchema, ...InterviewInputSchema.shape,
    createdAt: BackupDateSchema, updatedAt: BackupDateSchema
  })).max(20000).default([]),
  notifications: z.array(z.object({
    _id: BackupIdSchema, dedupeKey: z.string().min(1).max(200),
    title: z.string().min(1).max(160), message: z.string().min(1).max(500),
    type: z.enum(["reminder", "system"]), readAt: BackupDateSchema.nullable().optional(),
    opportunityId: BackupIdSchema.nullable().optional(), createdAt: BackupDateSchema, updatedAt: BackupDateSchema
  })).max(20000).default([])
}).superRefine((backup, ctx) => {
  backup.opportunities.forEach((item, index) => {
    const result = OpportunityInputSchema.safeParse(item);
    if (!result.success) result.error.issues.forEach((issue) => ctx.addIssue({ ...issue, path: ["opportunities", index, ...issue.path] }));
  });
  backup.companies.forEach((item, index) => {
    const result = CompanyInputSchema.safeParse(item);
    if (!result.success) result.error.issues.forEach((issue) => ctx.addIssue({ ...issue, path: ["companies", index, ...issue.path] }));
  });
});
export type BackupImport = z.infer<typeof BackupImportSchema>;
