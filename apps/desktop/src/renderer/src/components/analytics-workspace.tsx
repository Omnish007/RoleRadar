import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, BriefcaseBusiness, Search, Target, TrendingUp } from "lucide-react";
import { api } from "../lib/api";
import type { OpportunityRecord, SearchRunRecord } from "../types/models";
import { Button } from "./ui/button";

const goalKey = "roleradar.weekly-goals.v1";
type Goals = { searches: number; applications: number };

export function AnalyticsWorkspace() {
  const [runs, setRuns] = useState<SearchRunRecord[]>([]);
  const [jobs, setJobs] = useState<OpportunityRecord[]>([]);
  const [goals, setGoals] = useState<Goals>({ searches: 20, applications: 5 });
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(goalKey);
      if (saved) setGoals((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch { setError("Saved goal preferences could not be read."); }
    void refresh();
  }, []);

  async function refresh() {
    try {
      const [searchRows, opportunityRows] = await Promise.all([api.searchRuns(), api.opportunities()]);
      setRuns(searchRows); setJobs(opportunityRows); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load analytics."); }
  }

  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyRuns = runs.filter((run) => new Date(run.createdAt).getTime() >= since);
  const weeklyApplications = jobs.filter((job) => job.appliedAt && new Date(job.appliedAt).getTime() >= since).length;
  const platformStats = useMemo(() => ["linkedin", "naukri", "indeed", "wellfound"].map((platform) => {
    const searches = runs.filter((run) => run.platform === platform).length;
    const saved = jobs.filter((job) => job.source === platform).length;
    return { platform, searches, saved, yield: searches ? (saved / searches).toFixed(1) : "—" };
  }), [runs, jobs]);

  function updateGoal(key: keyof Goals, value: number) {
    const next = { ...goals, [key]: Math.max(1, Math.min(500, value || 1)) };
    setGoals(next); localStorage.setItem(goalKey, JSON.stringify(next));
  }

  return <div className="simple-page">
    <div className="page-heading"><div><div className="eyebrow">MEASURE YOUR SEARCH HABITS</div><h1>Search analytics</h1><p>Local activity trends based on searches and opportunities you record.</p></div><Button variant="secondary" onClick={refresh}>Refresh</Button></div>
    {error && <p className="error-copy">{error}</p>}
    <div className="stat-grid"><Stat icon={<Search/>} label="Searches · 7 days" value={weeklyRuns.length}/><Stat icon={<BriefcaseBusiness/>} label="Saved opportunities" value={jobs.length}/><Stat icon={<Activity/>} label="Applications · 7 days" value={weeklyApplications}/><Stat icon={<Target/>} label="Interviews scheduled" value={jobs.filter((job) => job.status === "interview").length}/></div>
    <div className="analytics-grid">
      <section className="panel analytics-panel"><div className="panel-heading"><div><h2>Platform activity</h2><p>Search launches and saved opportunities.</p></div><TrendingUp size={17}/></div>
        {platformStats.map((stat) => <div className="platform-stat" key={stat.platform}><div><strong>{stat.platform}</strong><span>{stat.searches} searches · {stat.saved} saved</span></div><b>{stat.yield}</b></div>)}
        <p className="analytics-footnote">Saved/search is a rough discovery-yield indicator, not a measured conversion rate. One search can produce multiple saved roles.</p>
      </section>
      <section className="panel analytics-panel"><div className="panel-heading"><div><h2>Weekly goals</h2><p>Personal targets stored on this device.</p></div><Target size={17}/></div>
        <Goal label="Search launches" current={weeklyRuns.length} target={goals.searches} onChange={(value) => updateGoal("searches", value)}/>
        <Goal label="Applications" current={weeklyApplications} target={goals.applications} onChange={(value) => updateGoal("applications", value)}/>
      </section>
    </div>
  </div>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><strong>{value}</strong><small>{label}</small></div></div>;
}
function Goal({ label, current, target, onChange }: { label: string; current: number; target: number; onChange: (value: number) => void }) {
  const progress = Math.min(100, Math.round((current / target) * 100));
  return <div className="goal-item"><div className="goal-heading"><strong>{label}</strong><span>{current} / {target}</span></div><div className="goal-track"><span style={{ width: `${progress}%` }}/></div><label className="goal-target">Weekly target <input type="number" min="1" max="500" value={target} onChange={(event) => onChange(Number(event.target.value))}/></label></div>;
}
