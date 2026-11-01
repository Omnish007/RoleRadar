import { useState } from "react";
import { Copy, FolderOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { SearchIntent } from "@roleradar/contracts";
import type { SavedProfile } from "../types/models";
import { api } from "../lib/api";
import { Button } from "./ui/button";

type Props = {
  profiles: SavedProfile[];
  onRefresh: () => Promise<void>;
  onLoad: (intent: SearchIntent, collection: string) => void;
  onCreate: () => void;
};

export function SavedSearchesWorkspace({ profiles, onRefresh, onLoad, onCreate }: Props) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const groups = [...new Set(profiles.map(profile => profile.collection || "General"))];

  async function rename(profile: SavedProfile) {
    const name = window.prompt("Search profile name", profile.name)?.trim();
    if (!name || name === profile.name) return;
    const collection = window.prompt("Collection", profile.collection || "General")?.trim();
    if (!collection) return;
    await run(profile._id, async () => api.updateProfile(profile._id, { name, collection }));
  }

  async function duplicate(profile: SavedProfile) {
    const name = window.prompt("Name for the duplicate", `${profile.name} copy`)?.trim();
    if (!name) return;
    await run(profile._id, async () => api.saveProfile({ ...profile.intent, name }, profile.collection || "General"));
  }

  async function remove(profile: SavedProfile) {
    if (!window.confirm(`Delete saved search “${profile.name}”?`)) return;
    await run(profile._id, () => api.deleteProfile(profile._id));
  }

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id); setError("");
    try { await action(); await onRefresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update saved searches."); }
    finally { setBusyId(""); }
  }

  return <div className="simple-page">
    <div className="page-heading"><div><div className="eyebrow">REUSABLE SEARCH PROFILES</div><h1>Saved searches</h1><p>Organize, rename, duplicate and reuse your search strategies.</p></div><Button onClick={onCreate}><Plus size={15}/> New search</Button></div>
    {error && <div className="warning">{error}</div>}
    {!profiles.length ? <div className="panel empty-state"><div className="empty-icon"><FolderOpen size={22}/></div><h3>No saved searches</h3><p>Save a search profile from the builder to create your first collection.</p></div> : groups.map(group => <section className="panel list-panel" key={group}>
      <div className="panel-heading"><div><h2>{group}</h2><p>{profiles.filter(profile => (profile.collection || "General") === group).length} saved searches</p></div></div>
      {profiles.filter(profile => (profile.collection || "General") === group).map(profile => <div className="list-row saved-search-row" key={profile._id}>
        <div className="company-avatar"><Search size={16}/></div><div className="row-main"><strong>{profile.name}</strong><small>{profile.intent.primaryRole} · {(profile.intent.locations || []).join(", ") || "Any location"}</small></div>
        <Button variant="secondary" size="sm" onClick={() => onLoad(profile.intent, profile.collection || "General")}><FolderOpen size={13}/> Load</Button>
        <Button variant="ghost" size="icon" title="Duplicate search" disabled={busyId === profile._id} onClick={() => void duplicate(profile)}><Copy size={14}/></Button>
        <Button variant="ghost" size="icon" title="Rename or move collection" disabled={busyId === profile._id} onClick={() => void rename(profile)}><Pencil size={14}/></Button>
        <Button variant="ghost" size="icon" title="Delete search" disabled={busyId === profile._id} onClick={() => void remove(profile)}><Trash2 size={14}/></Button>
      </div>)}
    </section>)}
  </div>;
}
