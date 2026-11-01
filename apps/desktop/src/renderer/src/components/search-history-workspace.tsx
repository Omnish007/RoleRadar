import { useEffect, useState } from "react";
import { CalendarClock, Copy, ExternalLink, History } from "lucide-react";
import { api, platformHome } from "../lib/api";
import type { SearchRunRecord } from "../types/models";
import { Button } from "./ui/button";

export function SearchHistoryWorkspace() {
  const [runs, setRuns] = useState<SearchRunRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  async function refresh() {
    setBusy(true); setError("");
    try { setRuns(await api.searchRuns()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load search history."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function copyQuery(query?: string) {
    if (!query) return;
    try { await window.roleRadar.copyText(query); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Clipboard operation failed."); }
  }

  return <div className="simple-page">
    <div className="page-heading"><div><div className="eyebrow">WHAT YOU HAVE SEARCHED</div><h1>Search history</h1><p>Review previously launched search strategies and reuse their queries.</p></div><Button variant="secondary" onClick={refresh}>Refresh history</Button></div>
    <div className="panel list-panel">
      {busy ? <p className="muted-copy">Loading search history…</p> : error ? <p className="error-copy">{error}</p> : runs.length ? runs.map((run) => <div className="history-row" key={run._id}>
        <div className="company-avatar"><History size={16}/></div><div className="row-main"><strong>{run.profileName}</strong><small>{run.platform} · {run.variantId} · <CalendarClock size={11}/> {new Date(run.createdAt).toLocaleString()}</small>{run.query && <code>{run.query}</code>}</div>
        <div className="history-actions"><Button variant="ghost" size="icon" title="Copy query" onClick={() => void copyQuery(run.query)} disabled={!run.query}><Copy size={15}/></Button><Button variant="ghost" size="icon" title="Open platform" onClick={() => void window.roleRadar.openPlatform(platformHome[run.platform])}><ExternalLink size={15}/></Button></div>
      </div>) : <div className="empty-state compact"><h3>No search runs yet</h3><p>Use Copy &amp; open from a generated strategy to record a search run.</p></div>}
    </div>
  </div>;
}
