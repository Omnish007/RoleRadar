import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Building2, CalendarDays, ContactRound, Plus, Users } from "lucide-react";
import { api } from "../lib/api";
import type { CompanyRecord, InterviewRecord, OpportunityRecord, RecruiterRecord } from "../types/models";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Tab = "companies" | "recruiters" | "interviews";

export function RelationshipWorkspace() {
  const [tab, setTab] = useState<Tab>("companies");
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [recruiters, setRecruiters] = useState<RecruiterRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true); setError("");
    try {
      const [companyRows, recruiterRows, interviewRows, opportunityRows] = await Promise.all([
        api.companies(), api.recruiters(), api.interviews(), api.opportunities()
      ]);
      setCompanies(companyRows); setRecruiters(recruiterRows); setInterviews(interviewRows); setOpportunities(opportunityRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load relationship records."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function updateCompanyPreference(id: string, preference: "preferred" | "neutral" | "avoid") {
    try { await api.updateCompanyPreference(id, preference); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update company preference."); }
  }

  async function updateInterviewStatus(id: string, status: "scheduled" | "completed" | "cancelled" | "rescheduled") {
    try { await api.updateInterviewStatus(id, status); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update interview status."); }
  }

  async function submit(event: FormEvent<HTMLFormElement>, action: (data: Record<string, string | boolean>) => Promise<unknown>) {
    event.preventDefault(); setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const data = Object.fromEntries(form.entries()) as Record<string, string | boolean>;
    try { await action(data); formElement.reset(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this record."); }
  }

  const tabs = [{ id: "companies" as const, label: "Companies", icon: <Building2 size={15}/> }, { id: "recruiters" as const, label: "Recruiters", icon: <Users size={15}/> }, { id: "interviews" as const, label: "Interviews", icon: <CalendarDays size={15}/> }];

  return <div className="simple-page">
    <div className="page-heading"><div><div className="eyebrow">YOUR RELATIONSHIP WORKSPACE</div><h1>Companies &amp; people</h1><p>Keep employer research, recruiter contacts and interview rounds together.</p></div><Button variant="secondary" onClick={refresh} disabled={busy}>Refresh</Button></div>
    <div className="panel relationship-panel">
      <div className="relationship-tabs">{tabs.map((item) => <button key={item.id} className={tab === item.id ? "relationship-tab active" : "relationship-tab"} onClick={() => setTab(item.id)}>{item.icon}{item.label}</button>)}</div>
      {error && <p className="error-copy relationship-error">{error}</p>}
      {tab === "companies" && <section className="relationship-content">
        <form className="compact-form" onSubmit={(event) => void submit(event, (data) => api.createCompany({ name: String(data.name), website: String(data.website || "") || undefined, industry: String(data.industry || "") || undefined, location: String(data.location || "") || undefined, companyType: String(data.companyType || "other") as "startup" | "product" | "service" | "mnc" | "other", preference: String(data.preference || "neutral") as "preferred" | "neutral" | "avoid" }))}>
          <div className="form-title"><Building2 size={16}/><strong>Add company</strong></div><Input name="name" required placeholder="Company name"/><div className="field-grid"><Input name="website" type="url" placeholder="https://company.com"/><Input name="industry" placeholder="Industry"/></div><div className="field-grid"><Input name="location" placeholder="Location"/><select name="companyType" className="relationship-select"><option value="other">Company type</option><option value="startup">Startup</option><option value="product">Product</option><option value="service">Service</option><option value="mnc">MNC</option></select></div><select name="preference" className="relationship-select"><option value="neutral">Company preference</option><option value="preferred">Whitelist · Preferred</option><option value="avoid">Blacklist · Avoid</option></select><Button type="submit"><Plus size={14}/> Save company</Button>
        </form>
        <div className="relationship-list">{companies.map((company) => <article className="relationship-row" key={company._id}><div className="company-avatar"><Building2 size={15}/></div><div className="row-main"><strong>{company.name}</strong><small>{company.industry || "Industry not set"} · {company.location || "Location not set"}</small></div><select className="relationship-select preference-select" aria-label={`Preference for ${company.name}`} value={company.preference} onChange={(event) => void updateCompanyPreference(company._id, event.target.value as "preferred" | "neutral" | "avoid")}><option value="preferred">Preferred</option><option value="neutral">Neutral</option><option value="avoid">Avoid</option></select></article>)}{!companies.length && <Empty text="Companies you save will appear here."/>}</div>
      </section>}
      {tab === "recruiters" && <section className="relationship-content">
        <form className="compact-form" onSubmit={(event) => void submit(event, (data) => api.createRecruiter({ name: String(data.name), role: String(data.role || "") || undefined, companyName: String(data.companyName || "") || undefined, email: String(data.email || "") || undefined, profileUrl: String(data.profileUrl || "") || undefined, notes: String(data.notes || "") || undefined }))}>
          <div className="form-title"><ContactRound size={16}/><strong>Add recruiter contact</strong></div><Input name="name" required placeholder="Recruiter name"/><div className="field-grid"><Input name="role" placeholder="Role / title"/><Input name="companyName" placeholder="Company"/></div><div className="field-grid"><Input name="email" type="email" placeholder="Email"/><Input name="profileUrl" type="url" placeholder="Profile URL"/></div><Input name="notes" placeholder="Context or last interaction"/><Button type="submit"><Plus size={14}/> Save recruiter</Button>
        </form>
        <div className="relationship-list">{recruiters.map((person) => <article className="relationship-row" key={person._id}><div className="company-avatar"><Users size={15}/></div><div className="row-main"><strong>{person.name}</strong><small>{[person.role, person.companyName, person.email].filter(Boolean).join(" · ")}</small></div></article>)}{!recruiters.length && <Empty text="Recruiter contacts you save will appear here."/>}</div>
      </section>}
      {tab === "interviews" && <section className="relationship-content">
        <form className="compact-form" onSubmit={(event) => void submit(event, (data) => api.createInterview({ opportunityId: String(data.opportunityId), roundName: String(data.roundName), scheduledAt: new Date(String(data.scheduledAt)).toISOString(), mode: String(data.mode || "online") as "online" | "phone" | "onsite" | "other", status: "scheduled", interviewer: String(data.interviewer || "") || undefined, notes: String(data.notes || "") || undefined }))}>
          <div className="form-title"><CalendarDays size={16}/><strong>Schedule interview</strong></div><select name="opportunityId" required className="relationship-select"><option value="">Select opportunity</option>{opportunities.map((item) => <option key={item._id} value={item._id}>{item.title} — {item.company}</option>)}</select><div className="field-grid"><Input name="roundName" required placeholder="Round (e.g. Technical 1)"/><Input name="scheduledAt" type="datetime-local" required/></div><div className="field-grid"><select name="mode" className="relationship-select"><option value="online">Online</option><option value="phone">Phone</option><option value="onsite">On-site</option><option value="other">Other</option></select><Input name="interviewer" placeholder="Interviewer"/></div><Input name="notes" placeholder="Preparation notes"/><Button type="submit" disabled={!opportunities.length}><Plus size={14}/> Add interview</Button>
        </form>
        <div className="relationship-list">{interviews.map((item) => { const job = typeof item.opportunityId === "string" ? undefined : item.opportunityId; return <article className="relationship-row" key={item._id}><div className="company-avatar"><CalendarDays size={15}/></div><div className="row-main"><strong>{item.roundName} · {job?.title || "Opportunity"}</strong><small>{job?.company || ""} · {new Date(item.scheduledAt).toLocaleString()} · {item.mode}</small></div><select className="relationship-select interview-status-select" aria-label={`Status for ${item.roundName}`} value={item.status} onChange={(event) => void updateInterviewStatus(item._id, event.target.value as "scheduled" | "completed" | "cancelled" | "rescheduled")}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="rescheduled">Rescheduled</option></select></article>; })}{!interviews.length && <Empty text="Scheduled interview rounds will appear here."/>}</div>
      </section>}
    </div>
  </div>;
}

function Empty({ text }: { text: string }) { return <p className="muted-copy empty-line">{text}</p>; }
