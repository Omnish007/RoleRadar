import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import errorStatusIcon from "./assets/icons/status/error.svg";
import successStatusIcon from "./assets/icons/status/success.svg";
import roleRadarLogo from "./assets/brand/logo-light.svg";
import "./sidebar-layout.css";
import { Activity, Archive, ArrowUpRight, Bell, Bookmark, BriefcaseBusiness, ChevronDown, CircleHelp, Command, ExternalLink, FileText, FolderSearch, History, LayoutDashboard, Layers3, Plus, Settings2, Sparkles, Target, Users, Clipboard, Scale } from "lucide-react";
import { api, platformHome } from "./lib/api";
import { defaultIntent } from "./lib/default-intent";
import { SearchTemplatesWorkspace } from "./components/search-templates-workspace";
import { SearchBuilder } from "./components/search-builder";
import { SearchHistoryWorkspace } from "./components/search-history-workspace";
import { RelationshipWorkspace } from "./components/relationship-workspace";
import { BackupWorkspace } from "./components/backup-workspace";
import { AnalyticsWorkspace } from "./components/analytics-workspace";
import type { HealthStatus, NotificationRecord, OpportunityRecord, SavedProfile } from "./types/models";
import type { OpportunityStatus, Platform, SearchIntent, SearchPlan } from "@roleradar/contracts";
import { AiWorkspace } from "./components/ai-workspace";
import { ResumeWorkspace } from "./components/resume-workspace";
import { OfferComparisonWorkspace } from "./components/offer-comparison-workspace";
import { SavedSearchesWorkspace } from "./components/saved-searches-workspace";

type Plan = SearchPlan;
const platformLabels: Record<string, string> = { linkedin: "LinkedIn", naukri: "Naukri", indeed: "Indeed", wellfound: "Wellfound" };

export function App() {
  const [page, setPage] = useState("Search builder");
  const [intent, setIntent] = useState<SearchIntent>(defaultIntent as SearchIntent);
  const [collection, setCollection] = useState("MERN Development");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState("linkedin");
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const notificationBaseline = useRef<Set<string> | null>(null);
  const [serviceBusy, setServiceBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [aiRequest, setAiRequest] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const currentPlan = useMemo(() => plans.find(plan => plan.platform === selected), [plans, selected]);

  async function refresh() {
    try {
      const [saved, jobs, alerts, serviceHealth] = await Promise.all([api.profiles(), api.opportunities(), api.notifications(), api.health()]);
      setProfiles(saved); setOpportunities(jobs); setNotifications(alerts); setHealth(serviceHealth);
      if (notificationBaseline.current) {
        const fresh = alerts.filter(item => !item.readAt && !notificationBaseline.current?.has(item._id));
        fresh.forEach(item => void window.roleRadar.notify({ title: item.title, body: item.message }));
      }
      notificationBaseline.current = new Set(alerts.map(item => item._id));
    } catch {
      setHealth(null);
      setNotice("API unavailable. Start MongoDB, Redis and the NestJS API.");
      setNoticeIsError(true);
    }
  }

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = window.roleRadar.onQuickCapture(() => { setPage("Opportunities"); void captureOpportunity(); });
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "k") { event.preventDefault(); setPage("Search builder"); }
      if (event.shiftKey && event.key.toLowerCase() === "n") { event.preventDefault(); setPage("Opportunities"); void captureOpportunity(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { unsubscribe(); window.removeEventListener("keydown", onKeyDown); };
  }, []);

  async function compile() {
    setBusy(true); setNotice("");
    try { setPlans(await api.compile(intent)); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to generate search plans."); }
    finally { setBusy(false); }
  }

  async function generateWithAi() {
    if (aiRequest.trim().length < 5) { setNotice("Describe the job you want in a little more detail."); return; }
    setAiBusy(true); setNotice("");
    try {
      const parsed = await api.parseIntent(aiRequest);
      setIntent(parsed as SearchIntent);
      setNotice("AI search profile generated. Review the fields before compiling.");
    } catch (error) {
      setNotice(error instanceof Error ? `AI service unavailable: ${error.message}` : "AI service unavailable. Start Ollama and the Python service.");
    } finally { setAiBusy(false); }
  }

  async function saveSearch() {
    try { await api.saveProfile(intent, collection.trim() || "General"); await refresh(); setNotice("Search profile saved."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save profile."); }
  }

  async function captureClipboardOpportunity() {
    try {
      const clipboardText = (await window.roleRadar.readClipboard()).trim();
      const candidate = clipboardText.match(/https:\/\/[^\s]+/i)?.[0];
      if (!candidate) { setNotice("No HTTPS job URL was found in the clipboard."); return; }
      const title = window.prompt("Job title");
      if (!title) return;
      const company = window.prompt("Company name");
      if (!company) return;
      const source = window.prompt("Source: linkedin, naukri, indeed or wellfound", "linkedin") || "linkedin";
      const allowedSources: Platform[] = ["linkedin", "naukri", "indeed", "wellfound"];
      if (!allowedSources.includes(source as Platform)) throw new Error("Choose a supported platform source.");
      const sourceUrl = window.prompt("Confirm job URL", candidate);
      if (!sourceUrl) return;
      const location = window.prompt("Job location (optional)") || undefined;
      await api.addOpportunity({ title, company, source: source as Platform, sourceUrl, location });
      await refresh(); setNotice("Clipboard opportunity captured.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to capture clipboard content."); }
  }

  async function captureOpportunity() {
    const title = window.prompt("Job title");
    if (!title) return;
    const company = window.prompt("Company name");
    if (!company) return;
    const sourceInput = window.prompt("Source: linkedin, naukri, indeed or wellfound", "linkedin") || "linkedin";
    const supportedSources: Platform[] = ["linkedin", "naukri", "indeed", "wellfound"];
    if (!supportedSources.includes(sourceInput as Platform)) { setNotice("Choose a supported platform source."); return; }
    const sourceUrl = window.prompt("HTTPS job URL");
    if (!sourceUrl) return;
    const location = window.prompt("Job location (optional)") || undefined;
    const notes = window.prompt("Notes (optional)") || undefined;
    try {
      await api.addOpportunity({ title, company, source: sourceInput as Platform, sourceUrl, location, notes });
      await refresh(); setNotice("Opportunity saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save opportunity."); }
  }

  async function launchSearch(plan: Plan, variant: Plan["variants"][number]) {
    try {
      if (variant.query) await window.roleRadar.copyText(variant.query);
      await window.roleRadar.openPlatform(platformHome[plan.platform]);
      await api.recordRun({ profileName: intent.name, platform: plan.platform, variantId: variant.id, query: variant.query });
      await refresh();
      setNotice(`Opened ${platformLabels[plan.platform]}. ${variant.query ? "The selected query was copied to your clipboard." : "Apply the displayed filters manually."}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to launch platform search.");
    }
  }

  async function updateOpportunityStatus(id: string, status: OpportunityStatus) {
    try { await api.updateOpportunityStatus(id, status); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update opportunity."); }
  }

  async function scheduleReminder(job: OpportunityRecord) {
    const localValue = window.prompt("Enter reminder date/time in ISO format (example: 2026-11-03T10:00:00+05:30)");
    if (!localValue) return;
    try { await api.scheduleReminder(job._id, { dueAt: localValue, message: `Follow up with ${job.company}` }); await refresh(); setNotice("Follow-up reminder scheduled."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to schedule reminder."); }
  }

  async function manageLocalServices(action: "start" | "stop") {
    setServiceBusy(true);
    try {
      const result = await window.roleRadar.localServices(action);
      setNotice(result.details ? `${result.message} ${result.details}` : result.message);
      setNoticeIsError(!result.success);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Local service action failed.");
      setNoticeIsError(true);
    }
    finally { setServiceBusy(false); }
  }

  async function markNotificationRead(id: string) {
    try { await api.markNotificationRead(id); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update notification."); }
  }

  const update = (key: keyof SearchIntent, value: unknown) => setIntent(current => ({ ...current, [key]: value }) as SearchIntent);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img className="brand-logo" src={roleRadarLogo} alt="RoleRadar"/><small>Job search workspace</small></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          <NavButton icon={<LayoutDashboard size={17}/>} label="Overview" active={page === "Overview"} onClick={() => setPage("Overview")}/>
          <NavButton icon={<FolderSearch size={17}/>} label="Search builder" active={page === "Search builder"} onClick={() => setPage("Search builder")}/>
          <NavButton icon={<Bookmark size={17}/>} label="Saved searches" active={page === "Saved searches"} onClick={() => setPage("Saved searches")}/>
          <NavButton icon={<Layers3 size={17}/>} label="Templates" active={page === "Templates"} onClick={() => setPage("Templates")}/>
          <NavButton icon={<History size={17}/>} label="Search history" active={page === "Search history"} onClick={() => setPage("Search history")}/>
          <NavButton icon={<Activity size={17}/>} label="Analytics" active={page === "Analytics"} onClick={() => setPage("Analytics")}/>
          <NavButton icon={<BriefcaseBusiness size={17}/>} label="Opportunities" active={page === "Opportunities"} onClick={() => setPage("Opportunities")} count={opportunities.length}/>
          <NavButton icon={<Scale size={17}/>} label="Offer comparison" active={page === "Offer comparison"} onClick={() => setPage("Offer comparison")} count={opportunities.filter(item => item.status === "offer").length}/>
          <NavButton icon={<Users size={17}/>} label="Companies & people" active={page === "Companies & people"} onClick={() => setPage("Companies & people")}/>
          <NavButton icon={<Bell size={17}/>} label="Notifications" active={page === "Notifications"} onClick={() => setPage("Notifications")} count={notifications.filter(item => !item.readAt).length}/>
          <NavButton icon={<FileText size={17}/>} label="Resume library" active={page === "Resume library"} onClick={() => setPage("Resume library")}/>
          <NavButton icon={<Sparkles size={17}/>} label="AI workspace" active={page === "AI workspace"} onClick={() => setPage("AI workspace")}/>
          <NavButton icon={<Archive size={17}/>} label="Backup & restore" active={page === "Backup & restore"} onClick={() => setPage("Backup & restore")}/>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status"><span className="status-dot"/> Local workspace <small>Private · On this device</small></div>
          <NavButton icon={<Settings2 size={17}/>} label="Settings" active={page === "Settings"} onClick={() => setPage("Settings")}/>
          <div className="user-card"><div className="avatar">RR</div><div><strong>Personal workspace</strong><small>Local profile</small></div><ChevronDown size={15}/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {page}</div><div className="top-actions"><span className="shortcut"><Command size={12}/> K</span><button className="icon-button" title="Help"><CircleHelp size={17}/></button><div className="avatar small">RR</div></div></header>
        <div className="page-content">
          {notice && <div className={`notice ${noticeIsError ? "error" : ""}`} role="status"><img className="notice-icon" src={noticeIsError ? errorStatusIcon : successStatusIcon} alt="" aria-hidden="true"/>{notice}<button onClick={() => { setNotice(""); setNoticeIsError(false); }}>Dismiss</button></div>}
          {page === "Search builder" && <SearchBuilder intent={intent} update={update} collection={collection} setCollection={setCollection} selected={selected} setSelected={setSelected} currentPlan={currentPlan} compile={compile} saveSearch={saveSearch} busy={busy} aiRequest={aiRequest} setAiRequest={setAiRequest} generateWithAi={generateWithAi} aiBusy={aiBusy} onLaunch={launchSearch}/>}
          {page === "Overview" && <Overview profiles={profiles} opportunities={opportunities} setPage={setPage}/>}
          {page === "Saved searches" && <SavedSearchesWorkspace profiles={profiles} onRefresh={refresh} onCreate={() => setPage("Search builder")} onLoad={(savedIntent, savedCollection) => { setIntent(savedIntent); setCollection(savedCollection); setPage("Search builder"); }}/>}
          {page === "Templates" && <SearchTemplatesWorkspace onApply={(template) => { setIntent(template); setPage("Search builder"); }} />}
          {page === "Search history" && <SearchHistoryWorkspace/>}
          {page === "Analytics" && <AnalyticsWorkspace/>}
          {page === "Companies & people" && <RelationshipWorkspace/>}
          {page === "Backup & restore" && <BackupWorkspace/>}
          {page === "Opportunities" && <Opportunities opportunities={opportunities} capture={captureOpportunity} captureClipboard={captureClipboardOpportunity} onStatusChange={updateOpportunityStatus} onReminder={scheduleReminder}/>}
          {page === "Offer comparison" && <OfferComparisonWorkspace opportunities={opportunities}/> }
          {page === "Notifications" && <Notifications notifications={notifications} onMarkRead={markNotificationRead}/>}
          {page === "Resume library" && <ResumeWorkspace/>}
          {page === "AI workspace" && <AiWorkspace/>}
          {page === "Settings" && <Settings health={health} busy={serviceBusy} onStart={() => manageLocalServices("start")} onStop={() => manageLocalServices("stop")} onRefresh={refresh}/>}
        </div>
      </main>
    </div>
  );
}

function NavButton({ icon, label, active, onClick, count = 0 }: { icon: ReactNode; label: string; active: boolean; onClick: () => void; count?: number }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{count > 0 && <em>{count}</em>}</button>;
}

function Overview({ profiles, opportunities, setPage }: { profiles: SavedProfile[]; opportunities: OpportunityRecord[]; setPage: (page: string) => void }) {
  return <div className="simple-page"><div className="page-heading"><div><div className="eyebrow">YOUR JOB SEARCH AT A GLANCE</div><h1>Good morning.</h1><p>A focused workspace for finding and managing your next opportunity.</p></div><button className="button primary" onClick={() => setPage("Search builder")}><Plus size={15}/> New search</button></div>
    <div className="stat-grid"><Stat icon={<FolderSearch/>} label="Saved searches" value={profiles.length}/><Stat icon={<BriefcaseBusiness/>} label="Opportunities" value={opportunities.length}/><Stat icon={<Activity/>} label="Applications" value={opportunities.filter((opportunity) => opportunity.status === "applied").length}/><Stat icon={<Target/>} label="Interviews" value={opportunities.filter((opportunity) => opportunity.status === "interview").length}/></div>
    <div className="panel overview-panel"><div className="panel-heading"><div><h2>Recent opportunities</h2><p>Your manually captured job opportunities.</p></div><button className="text-button" onClick={() => setPage("Opportunities")}>View all <ArrowUpRight size={14}/></button></div>{opportunities.length ? opportunities.slice(0, 5).map((job) => <div className="list-row" key={job._id}><div className="company-avatar">{job.company?.slice(0, 1)}</div><div className="row-main"><strong>{job.title}</strong><small>{job.company} · {job.location || "Location not set"}</small></div><span className="status-pill">{humanize(job.status)}</span></div>) : <div className="empty-state compact"><h3>No opportunities yet</h3><p>Save interesting jobs as you discover them.</p></div>}</div>
  </div>;
}

function Opportunities({ opportunities, capture, captureClipboard, onStatusChange, onReminder }: { opportunities: OpportunityRecord[]; capture: () => Promise<void>; captureClipboard: () => Promise<void>; onStatusChange: (id: string, status: OpportunityStatus) => Promise<void>; onReminder: (job: OpportunityRecord) => Promise<void> }) {
  return <div className="simple-page"><div className="page-heading"><div><div className="eyebrow">YOUR PERSONAL PIPELINE</div><h1>Opportunities</h1><p>Keep interesting roles organized from discovery to offer.</p></div><div className="header-actions"><button className="button secondary" onClick={captureClipboard}><Clipboard size={15}/> Capture clipboard URL</button><button className="button primary" onClick={capture}><Plus size={15}/> Capture opportunity</button></div></div><div className="panel list-panel">{opportunities.length ? opportunities.map((job) => <div className="list-row" key={job._id}><div className="company-avatar">{job.company?.slice(0, 1)}</div><div className="row-main"><strong>{job.title}</strong><small>{job.company} · {job.source} · {job.location || "Location not set"}</small></div>{job.companyPreference && job.companyPreference !== "neutral" && <span className={`company-preference ${job.companyPreference}`}>{job.companyPreference === "avoid" ? "Avoid list" : "Preferred"}</span>}<select className="status-select" value={job.status} onChange={e => onStatusChange(job._id, e.target.value as OpportunityStatus)}><option value="interested">Interested</option><option value="shortlisted">Shortlisted</option><option value="applied">Applied</option><option value="screening">Screening</option><option value="interview">Interview</option><option value="offer">Offer</option><option value="rejected">Rejected</option><option value="closed">Closed</option></select><button className="icon-button" title="Schedule reminder" onClick={() => onReminder(job)}><Bell size={15}/></button><button className="icon-button" title="Open saved job" onClick={() => window.roleRadar.openPlatform(job.sourceUrl)}><ExternalLink size={15}/></button></div>) : <div className="empty-state compact"><h3>Your pipeline starts here</h3><p>Manually capture a role from any supported platform.</p></div>}</div></div>;
}

function Notifications({ notifications, onMarkRead }: { notifications: NotificationRecord[]; onMarkRead: (id: string) => void }) {
  return <div className="simple-page"><div className="page-heading"><div><div className="eyebrow">FOLLOW-UPS AND REMINDERS</div><h1>Notifications</h1><p>Reminder events generated by your local background worker.</p></div></div><div className="panel list-panel">{notifications.length ? notifications.map(item => <div className="list-row" key={item._id}><div className="company-avatar"><Bell size={15}/></div><div className="row-main"><strong>{item.title}</strong><small>{item.message} · {new Date(item.createdAt).toLocaleString()}</small></div>{item.readAt ? <span className="status-pill">Read</span> : <button className="button secondary small" onClick={() => onMarkRead(item._id)}>Mark read</button>}</div>) : <div className="empty-state compact"><h3>You're all caught up</h3><p>Scheduled follow-ups will appear here when they become due.</p></div>}</div></div>;
}

function Settings({ health, busy, onStart, onStop, onRefresh }: { health: HealthStatus | null; busy: boolean; onStart: () => Promise<void>; onStop: () => Promise<void>; onRefresh: () => Promise<void> }) {
  return <div className="simple-page"><div className="page-heading"><div><div className="eyebrow">PREFERENCES AND LOCAL SERVICES</div><h1>Settings</h1><p>Manage the local services used by RoleRadar.</p></div><button className="button secondary" onClick={onRefresh}>Refresh status</button></div>
    <div className="panel settings-list"><Setting label="NestJS API" value={health?.service ? "running" : "unavailable"}/><Setting label="MongoDB" value={health?.database || "Unknown"}/><Setting label="Redis" value={health?.redis || "Unknown"}/><Setting label="Python AI service" value={health?.aiService || "Unknown"}/><Setting label="Ollama model server" value={health?.ollama || "Unknown"}/><Setting label="Data storage" value="MongoDB · Local instance"/><Setting label="Background jobs" value="Redis + BullMQ"/><Setting label="AI provider" value="Ollama · Local inference"/><Setting label="AI orchestration" value="Python + LangGraph · Optional"/><Setting label="Application mode" value="Local-first desktop"/>
    <div className="service-actions"><button className="button primary" onClick={onStart} disabled={busy}>Start local services</button><button className="button secondary" onClick={onStop} disabled={busy}>Stop local services</button></div><p className="settings-hint">Start checks MongoDB, Redis and NestJS readiness. In development, run <code>pnpm dev:api</code> in a terminal first. AI is optional and starts only when its Python environment is installed. Stopping services preserves Docker volumes.</p></div></div>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><div><strong>{value}</strong><small>{label}</small></div></div>; }
function Setting({ label, value }: { label: string; value: string }) { return <div className="setting-row"><span>{label}</span><strong>{value}</strong></div>; }
function humanize(value: string) { return value.replaceAll(/([A-Z])/g, " $1").replaceAll("-", " ").replace(/^./, c => c.toUpperCase()); }
