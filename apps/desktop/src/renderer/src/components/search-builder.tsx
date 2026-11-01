import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Filter,
  Lightbulb,
  MapPin,
  Search,
  SlidersHorizontal,
  Target
} from "lucide-react";
import type { SearchIntent, SearchPlan } from "@roleradar/contracts";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import "./search-builder.css";

type Props = {
  intent: SearchIntent;
  update: (key: keyof SearchIntent, value: unknown) => void;
  collection: string;
  setCollection: (value: string) => void;
  selected: string;
  setSelected: (platform: string) => void;
  currentPlan?: SearchPlan;
  compile: () => Promise<void>;
  saveSearch: () => Promise<void>;
  busy: boolean;
  aiRequest: string;
  setAiRequest: (value: string) => void;
  generateWithAi: () => Promise<void>;
  aiBusy: boolean;
  onLaunch: (plan: SearchPlan, variant: SearchPlan["variants"][number]) => Promise<void>;
};

const platforms = ["linkedin", "naukri", "indeed", "wellfound"];
const labels: Record<string, string> = { linkedin: "LinkedIn", naukri: "Naukri", indeed: "Indeed", wellfound: "Wellfound" };
const steps = [
  { title: "Role & skills", description: "What you do", icon: BriefcaseBusiness },
  { title: "Location", description: "Where & seniority", icon: MapPin },
  { title: "Preferences", description: "Salary & filters", icon: SlidersHorizontal },
  { title: "Review", description: "Check your search", icon: ClipboardCheck }
];

export function SearchBuilder(props: Props) {
  const { intent, update, collection, setCollection, selected, setSelected, currentPlan, compile, saveSearch, busy, aiRequest, setAiRequest, generateWithAi, aiBusy, onLaunch } = props;
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");

  function validateStep(target: number): string {
    if (target === 0 && !intent.primaryRole.trim()) return "Add a primary job title before continuing.";
    if (target === 1 && intent.minExperience !== undefined && intent.maxExperience !== undefined && intent.minExperience > intent.maxExperience) {
      return "Maximum experience must be greater than or equal to minimum experience.";
    }
    if (target === 2 && intent.minSalary !== undefined && intent.maxSalary !== undefined && intent.minSalary > intent.maxSalary) {
      return "Maximum salary must be greater than or equal to minimum salary.";
    }
    return "";
  }

  function continueStep() {
    const error = validateStep(step);
    if (error) { setStepError(error); return; }
    setStepError("");
    setStep(current => Math.min(current + 1, steps.length - 1));
  }

  function buildSearches() {
    const error = validateStep(0) || validateStep(1) || validateStep(2);
    if (error) {
      setStepError(error);
      if (error.includes("job title")) setStep(0);
      else if (error.includes("experience")) setStep(1);
      else setStep(2);
      return;
    }
    setStepError("");
    void compile();
  }

  return <div className="builder-page">
    <div className="page-heading">
      <div><div className="eyebrow">JOB SEARCH WORKSPACE</div><h1>Search builder</h1><p>Describe the role you want. Build tailored searches for every platform.</p></div>
      <Button variant="secondary" onClick={saveSearch}><Bookmark size={15}/> Save profile</Button>
    </div>

    <div className="builder-layout">
      <section className="panel form-panel search-form-panel">
        <div className="ai-entry">
          <div className="ai-entry-title"><Search size={15}/><strong>Describe the role you’re looking for</strong><span className="ai-entry-badge">AI assisted</span></div>
          <Textarea aria-label="Describe the job you want" value={aiRequest} onChange={event => setAiRequest(event.target.value)} placeholder="e.g. MERN developer in Gandhinagar, 4+ years, hybrid" />
          <div className="ai-entry-footer">
            <span>Turn a short brief into editable criteria. You stay in control of every field.</span>
            <Button variant="secondary" onClick={generateWithAi} disabled={aiBusy} className="button secondary ai-button"><ArrowRight size={14}/>{aiBusy ? "Applying brief…" : "Use this brief"}</Button>
          </div>
        </div>

        <div className="workflow-heading">
          <div><span className="workflow-eyebrow">SEARCH SETUP</span><h2>Build your search</h2><p>A few focused steps. You can revisit any section before generating.</p></div>
          <span className="workflow-count">{String(step + 1).padStart(2, "0")} <i>/</i> {String(steps.length).padStart(2, "0")}</span>
        </div>

        <div className="workflow-progress" role="progressbar" aria-label="Search setup progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
          {steps.map((item, index) => <span key={item.title} className={index <= step ? "complete" : ""} />)}
        </div>

        <nav className="search-stepper" aria-label="Search setup steps">
          {steps.map((item, index) => {
            const StepIcon = item.icon;
            return <button key={item.title} type="button" className={`search-step ${step === index ? "active" : ""} ${index < step ? "complete" : ""}`} aria-current={step === index ? "step" : undefined} onClick={() => { setStep(index); setStepError(""); }}>
              <span className="search-step-icon">{index < step ? <Check size={14}/> : <StepIcon size={14}/>}</span>
              <span className="search-step-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
            </button>;
          })}
        </nav>

        <div className="step-content" key={step}>
          <div className="step-content-heading"><span>STEP {step + 1}</span><h3>{steps[step].title}</h3><p>{stepDescription(step)}</p></div>

          {step === 0 && <>
            <div className="field-grid">
              <Field label="Search profile name"><Input value={intent.name} maxLength={100} onChange={event => update("name", event.target.value)} placeholder="e.g. MERN roles · Ahmedabad" /></Field>
              <Field label="Collection"><Input value={collection} maxLength={80} onChange={event => setCollection(event.target.value)} placeholder="e.g. Product companies" /></Field>
            </div>
            <Field label="Primary job title"><Input value={intent.primaryRole} onChange={event => update("primaryRole", event.target.value)} placeholder="MERN Stack Developer" /></Field>
            <Field label="Alternative titles" hint="Use close title variations, separated by commas."><Input value={intent.alternativeRoles.join(", ")} onChange={event => update("alternativeRoles", split(event.target.value))} placeholder="Full Stack Developer, React Developer" /></Field>
            <div className="field-grid">
              <Field label="Must-have skills" hint="Core requirements."><Input value={intent.mustHaveSkills.join(", ")} onChange={event => update("mustHaveSkills", split(event.target.value))} placeholder="React, Node.js" /></Field>
              <Field label="Preferred skills" hint="Nice to have."><Input value={intent.preferredSkills.join(", ")} onChange={event => update("preferredSkills", split(event.target.value))} placeholder="TypeScript, MongoDB" /></Field>
            </div>
          </>}

          {step === 1 && <>
            <Field label="Locations" hint="Add cities or regions, separated by commas. Leave blank for any location."><Input value={intent.locations.join(", ")} onChange={event => update("locations", split(event.target.value))} placeholder="Ahmedabad, Gandhinagar, Remote" /></Field>
            <div className="field-grid">
              <Field label="Minimum experience · years"><Input type="number" min="0" max="60" value={intent.minExperience ?? ""} onChange={event => update("minExperience", numberOrUndefined(event.target.value))} placeholder="Any" /></Field>
              <Field label="Maximum experience · years"><Input type="number" min="0" max="60" value={intent.maxExperience ?? ""} onChange={event => update("maxExperience", numberOrUndefined(event.target.value))} placeholder="Any" /></Field>
            </div>
            <Field label="Work arrangement" hint="Select all that you are open to."><MultiSelect value={intent.workModes} options={["remote", "hybrid", "onsite"]} onChange={value => update("workModes", value)} /></Field>
            <Field label="Employment type"><MultiSelect value={intent.employmentTypes} options={["full-time", "contract", "part-time", "internship"]} onChange={value => update("employmentTypes", value)} /></Field>
            <div className="step-inline-note"><MapPin size={15}/><span>Leave a preference unselected to keep that dimension broad during discovery.</span></div>
          </>}

          {step === 2 && <>
            <div className="field-grid">
              <Field label={`Minimum salary · ${intent.currency}`}><Input type="number" min="0" value={intent.minSalary ?? ""} onChange={event => update("minSalary", numberOrUndefined(event.target.value))} placeholder="No minimum" /></Field>
              <Field label={`Maximum salary · ${intent.currency}`}><Input type="number" min="0" value={intent.maxSalary ?? ""} onChange={event => update("maxSalary", numberOrUndefined(event.target.value))} placeholder="No maximum" /></Field>
            </div>
            <div className="field-grid">
              <Field label="Posted within"><select value={intent.postedWithinDays ?? ""} onChange={event => update("postedWithinDays", numberOrUndefined(event.target.value))}><option value="">Any time</option><option value="1">24 hours</option><option value="3">3 days</option><option value="7">7 days</option><option value="30">30 days</option></select></Field>
              <Field label="Search precision"><select value={intent.precision} onChange={event => update("precision", event.target.value)}><option value="broad">Broad</option><option value="balanced">Balanced</option><option value="precise">Precise</option></select></Field>
            </div>
            <div className="field-grid">
              <Field label="Search target"><select value={intent.intent} onChange={event => update("intent", event.target.value)}><option value="jobs">Jobs</option><option value="hiring_posts">Hiring posts</option><option value="both">Jobs + hiring posts</option></select></Field>
              <Field label="Currency"><select value={intent.currency} onChange={event => update("currency", event.target.value)}><option value="INR">INR · Indian rupee</option><option value="USD">USD · US dollar</option><option value="EUR">EUR · Euro</option><option value="GBP">GBP · Pound sterling</option></select></Field>
            </div>
            <Field label="Exclude keywords" hint="Terms that should not appear in your results."><Input value={intent.excludedTerms.join(", ")} onChange={event => update("excludedTerms", split(event.target.value))} placeholder="internship, fresher, unpaid" /></Field>
          </>}

          {step === 3 && <div className="search-review-grid">
            <ReviewCard title="Profile" primary={intent.name || "Untitled search"} secondary={collection || "General collection"}/>
            <ReviewCard title="Role" primary={intent.primaryRole || "No primary title"} secondary={formatList(intent.alternativeRoles, "No alternative titles")}/>
            <ReviewCard title="Skills" primary={formatList(intent.mustHaveSkills, "No mandatory skills")} secondary={`Preferred: ${formatList(intent.preferredSkills, "None")}`}/>
            <ReviewCard title="Location & experience" primary={formatList(intent.locations, "Any location")} secondary={experienceLabel(intent.minExperience, intent.maxExperience)}/>
            <ReviewCard title="Work preferences" primary={formatList(intent.workModes, "Any work arrangement")} secondary={formatList(intent.employmentTypes, "Any employment type")}/>
            <ReviewCard title="Compensation & timing" primary={salaryLabel(intent.minSalary, intent.maxSalary, intent.currency)} secondary={intent.postedWithinDays ? `Posted within ${intent.postedWithinDays} days` : "Any posting date"}/>
            <ReviewCard title="Search behavior" primary={targetLabel(intent.intent)} secondary={`${capitalize(intent.precision)} precision · ${intent.currency}`}/>
            <ReviewCard title="Excluded keywords" primary={formatList(intent.excludedTerms, "No exclusions")} secondary="These terms are filtered from generated queries where supported."/>
          </div>}
        </div>

        {stepError && <div className="step-validation-error" role="alert">{stepError}</div>}
        <div className="stepper-footer">
          <div className="step-footer-note"><strong>{step === 3 ? "Ready to generate?" : `Step ${step + 1} of ${steps.length}`}</strong><span>{step === 3 ? "You can go back and adjust any criteria." : "Your progress is saved in this profile while you work."}</span></div>
          <div className="step-footer-actions">
            {step > 0 && <Button type="button" variant="secondary" onClick={() => { setStepError(""); setStep(current => Math.max(current - 1, 0)); }}><ArrowLeft size={14}/> Back</Button>}
            {step < steps.length - 1
              ? <Button type="button" className="button primary" onClick={continueStep}>Continue <ArrowRight size={14}/></Button>
              : <Button type="button" className="button primary" onClick={buildSearches} disabled={busy || !intent.primaryRole.trim()}><Search size={15}/>{busy ? "Building searches…" : "Build platform searches"}<ArrowUpRight size={14}/></Button>}
          </div>
        </div>
        <p className="privacy-note"><Check size={13}/> Query generation runs locally. No job-board scraping.</p>
      </section>

      <section className="results-column">
        <div className="panel results-panel"><div className="panel-heading"><div><h2>Platform strategies</h2><p>Each platform gets its own search approach.</p></div><span className="step-tag">SEARCH PLAN</span></div>
          <div className="platform-tabs">{platforms.map(platform => <button type="button" key={platform} className={selected === platform ? "platform-tab selected" : "platform-tab"} onClick={() => setSelected(platform)}><span className={`platform-dot ${platform}`}/>{labels[platform]}</button>)}</div>
          {currentPlan ? <PlanView plan={currentPlan} onLaunch={onLaunch}/> : <div className="empty-state"><div className="empty-icon"><Target size={23}/></div><h3>Your search strategies will appear here</h3><p>Configure your criteria and generate a tailored search plan for each platform.</p></div>}
        </div>
        <div className="tip-card"><div className="tip-icon"><Lightbulb size={17}/></div><div><strong>Search beyond the exact title</strong><p>Employers use different titles for similar work. A few close variants can surface relevant openings without making the search too broad.</p></div></div>
      </section>
    </div>
  </div>;
}

function PlanView({ plan, onLaunch }: { plan: SearchPlan; onLaunch: Props["onLaunch"] }) {
  const [copied, setCopied] = useState("");
  async function copy(id: string, value: string) {
    await window.roleRadar.copyText(value); setCopied(id); window.setTimeout(() => setCopied(""), 1600);
  }
  return <div className="plan-content">
    {plan.variants.map(variant => <div className="query-card" key={variant.id}>
      <div className="query-title"><div><strong>{variant.label}</strong><small>{variant.strategy}</small></div><button type="button" className="icon-button copy-button" onClick={() => void copy(variant.id, variant.query || "")} aria-label={`Copy ${variant.label}`}>{copied === variant.id ? <Check size={15}/> : <Copy size={15}/>}</button></div>
      {variant.query && <pre>{variant.query}</pre>}
      <Button type="button" variant="secondary" className="variant-launch" onClick={() => void onLaunch(plan, variant)}>Copy &amp; open {labels[plan.platform]} <ExternalLink size={13}/></Button>
    </div>)}
    <div className="filter-summary"><strong><Filter size={14}/> Native filter checklist</strong><div className="filter-chips">{Object.entries(plan.nativeFilters).filter(([, value]) => value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0)).map(([key, value]) => <span key={key}>{humanize(key)}: {Array.isArray(value) ? value.join(", ") : String(value)}</span>)}</div></div>
    {plan.manualInstructions.length > 0 && <div className="instruction-box"><strong>How to use this search</strong><ol>{plan.manualInstructions.map((item, index) => <li key={index}>{item}</li>)}</ol></div>}
    {plan.warnings.map((warning, index) => <div className="warning" key={index}><CircleHelp size={14}/>{warning}</div>)}
  </div>;
}

function ReviewCard({ title, primary, secondary }: { title: string; primary: string; secondary: string }) {
  return <article className="search-review-card"><span>{title}</span><strong>{primary}</strong><small>{secondary}</small></article>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function MultiSelect({ value, options, onChange }: { value: string[]; options: string[]; onChange: (value: string[]) => void }) {
  return <div className="multi-select">{options.map(option => <button key={option} type="button" className={value.includes(option) ? "choice active" : "choice"} aria-pressed={value.includes(option)} onClick={() => onChange(value.includes(option) ? value.filter(item => item !== option) : [...value, option])}>{option}</button>)}</div>;
}

function split(value: string): string[] { return [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))]; }
function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
function formatList(values: string[], fallback: string): string { return values.length ? values.join(", ") : fallback; }
function experienceLabel(min?: number, max?: number): string {
  if (min === undefined && max === undefined) return "Any experience level";
  if (min !== undefined && max !== undefined) return `${min}–${max} years`;
  return min !== undefined ? `${min}+ years` : `Up to ${max} years`;
}
function salaryLabel(min?: number, max?: number, currency = "INR"): string {
  if (min === undefined && max === undefined) return "Salary not specified";
  if (min !== undefined && max !== undefined) return `${min.toLocaleString()}–${max.toLocaleString()} ${currency}`;
  return min !== undefined ? `From ${min.toLocaleString()} ${currency}` : `Up to ${max?.toLocaleString()} ${currency}`;
}
function targetLabel(value: SearchIntent["intent"]): string {
  return value === "both" ? "Jobs + hiring posts" : value === "hiring_posts" ? "Hiring posts" : "Jobs";
}
function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
function humanize(value: string): string { return value.replaceAll(/([A-Z])/g, " $1").replaceAll("-", " ").replace(/^./, char => char.toUpperCase()); }
function stepDescription(step: number): string {
  return ["Define the role and capabilities you want to find.", "Narrow the search by geography, experience and work style.", "Set compensation, freshness and exclusion preferences.", "Review everything once before generating platform-specific searches."][step];
}
