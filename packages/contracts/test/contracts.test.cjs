const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SearchIntentSchema, OpportunityInputSchema, ReminderInputSchema,
  CompanyInputSchema, CompanyPreferenceSchema, BackupImportSchema, ResumeInputSchema, SearchProfileInputSchema, SearchProfileUpdateSchema
} = require("@roleradar/contracts");

test("search intent applies safe defaults", () => {
  const result = SearchIntentSchema.parse({ name: "MERN roles", primaryRole: "MERN Developer" });
  assert.deepEqual(result.employmentTypes, ["full-time"]);
  assert.equal(result.precision, "balanced");
});

test("search intent rejects inverted experience and salary ranges", () => {
  assert.equal(SearchIntentSchema.safeParse({ name: "x", primaryRole: "Developer", minExperience: 6, maxExperience: 2 }).success, false);
  assert.equal(SearchIntentSchema.safeParse({ name: "x", primaryRole: "Developer", minSalary: 100, maxSalary: 50 }).success, false);
});

test("opportunity URL must be HTTPS and match the selected platform", () => {
  const valid = { title: "MERN Developer", company: "Example", source: "linkedin", sourceUrl: "https://www.linkedin.com/jobs/view/123" };
  assert.equal(OpportunityInputSchema.safeParse(valid).success, true);
  assert.equal(OpportunityInputSchema.safeParse({ ...valid, sourceUrl: "https://evil.example/jobs/1" }).success, false);
  assert.equal(OpportunityInputSchema.safeParse({ ...valid, sourceUrl: "http://linkedin.com/jobs/1" }).success, false);
});

test("reminders must be future-dated", () => {
  assert.equal(ReminderInputSchema.safeParse({ dueAt: "2000-01-01T00:00:00Z" }).success, false);
});

test("backup schema accepts empty versioned snapshots and rejects invalid references", () => {
  assert.equal(BackupImportSchema.safeParse({ version: 1, profiles: [], opportunities: [], searchRuns: [], companies: [], recruiters: [], interviews: [], notifications: [] }).success, true);
  assert.equal(BackupImportSchema.safeParse({ version: 1, interviews: [{ _id: "bad", opportunityId: "bad" }] }).success, false);
});


test("resume content is bounded and requires useful text", () => {
  assert.equal(ResumeInputSchema.safeParse({ title: "MERN Resume", content: "x".repeat(100) }).success, true);
  assert.equal(ResumeInputSchema.safeParse({ title: "Empty", content: "short" }).success, false);
});

test("company preference supports preferred, neutral and avoid states", () => {
  assert.equal(CompanyInputSchema.parse({ name: "Example" }).preference, "neutral");
  assert.equal(CompanyInputSchema.safeParse({ name: "Example", preference: "avoid" }).success, true);
  assert.equal(CompanyPreferenceSchema.parse("preferred"), "preferred");
  assert.equal(CompanyPreferenceSchema.safeParse("blocked").success, false);
});


test("saved searches default into a collection and accept partial updates", () => {
  const intent = { name: "MERN roles", primaryRole: "MERN Developer" };
  assert.equal(SearchProfileInputSchema.parse({ intent }).collection, "General");
  assert.equal(SearchProfileUpdateSchema.safeParse({ collection: "Remote roles" }).success, true);
  assert.equal(SearchProfileUpdateSchema.safeParse({}).success, false);
});
