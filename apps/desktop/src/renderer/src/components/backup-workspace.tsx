import { useEffect, useRef, useState } from "react";
import { Download, FileUp, ShieldCheck } from "lucide-react";
import backupJsonIcon from "../assets/icons/file-types/json.svg";
import { BackupImportSchema } from "@roleradar/contracts";
import { api } from "../lib/api";
import { Button } from "./ui/button";

export function BackupWorkspace() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<{ directory: string; latest: { fileName: string; sizeBytes: number; modifiedAt: string } | null; count: number } | null>(null);

  async function refreshStatus() {
    try { setStatus(await api.backupStatus()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to read backup status."); }
  }
  useEffect(() => { void refreshStatus(); }, []);

  async function runAutomaticBackup() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api.runBackup();
      setNotice(`Automatic backup created: ${result.fileName}`);
      await refreshStatus();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Automatic backup failed."); }
    finally { setBusy(false); }
  }

  async function exportBackup() {
    setBusy(true); setError(""); setNotice("");
    try {
      const snapshot = await api.exportBackup();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `roleradar-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setNotice("Backup exported. Keep the file somewhere safe; it contains your job-search records and notes.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Backup export failed."); }
    finally { setBusy(false); }
  }

  async function importBackup(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Backup file must be 20 MB or smaller.");
      const raw: unknown = JSON.parse(await file.text());
      const backup = BackupImportSchema.parse(raw);
      if (!window.confirm("Import this backup? Matching record IDs will be updated; new records will be added.")) return;
      const result = await api.importBackup(backup);
      setNotice(`Restored ${result.imported} records across ${Object.keys(result.collections).length} collections.`);
      await refreshStatus();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Backup import failed."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return <div className="simple-page">
    <div className="page-heading"><div><div className="eyebrow">YOUR DATA, ON YOUR DEVICE</div><h1>Backup &amp; restore</h1><p>Export a portable JSON snapshot or restore a previous RoleRadar backup.</p></div></div>
    <div className="panel backup-status-panel"><div><strong>Automatic backups</strong><p>{status?.latest ? `Last backup: ${new Date(status.latest.modifiedAt).toLocaleString()} · ${(status.latest.sizeBytes / 1024).toFixed(1)} KB` : "No automatic backup has been created yet."}</p><small>{status?.directory || "Default local backup directory is being checked."} · {status?.count ?? 0} retained backups</small></div><Button variant="secondary" onClick={() => void runAutomaticBackup()} disabled={busy}>Back up now</Button></div>
    <div className="backup-grid">
      <section className="panel backup-card"><span className="backup-icon"><img className="asset-file-icon" src={backupJsonIcon} alt="" aria-hidden="true"/></span><h2>Export local data</h2><p>Save search profiles, opportunities, search history, resume versions, company and recruiter records, interviews and notifications to a JSON file.</p><Button onClick={() => void exportBackup()} disabled={busy}><Download size={15}/>{busy ? "Preparing backup…" : "Export backup"}</Button></section>
      <section className="panel backup-card"><span className="backup-icon"><FileUp size={19}/></span><h2>Restore a backup</h2><p>Import a previously exported RoleRadar JSON file. Existing matching IDs are updated; unrelated records are retained.</p><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => void importBackup(event.target.files?.[0])}/><Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}><FileUp size={15}/> Choose backup file</Button></section>
    </div>
    <div className="tip-card"><ShieldCheck size={17}/><div><strong>Privacy reminder</strong><p>Backup files can contain recruiter emails, interview notes and resume-related material. Store them in a private location and avoid sharing them publicly.</p></div></div>
    {notice && <div className="notice" role="status">{notice}</div>}{error && <div className="warning">{error}</div>}
  </div>;
}
