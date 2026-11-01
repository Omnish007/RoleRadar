import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import resumeDocumentIcon from "../assets/icons/file-types/doc.svg";
import { ResumeInputSchema } from "@roleradar/contracts";
import { api } from "../lib/api";
import type { ResumeRecord } from "../types/models";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function ResumeWorkspace() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    try { setResumes(await api.resumes()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load saved resumes."); }
  }
  useEffect(() => { void refresh(); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const data = ResumeInputSchema.parse({
        title: form.get("title"), targetRole: form.get("targetRole") || undefined,
        versionLabel: form.get("versionLabel") || undefined, content: form.get("content"),
        notes: form.get("notes") || undefined,
        tags: String(form.get("tags") || "").split(",").map(value => value.trim()).filter(Boolean)
      });
      await api.createResume(data);
      formElement.reset();
      await refresh(); setNotice("Resume version saved locally.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save resume."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this saved resume version?")) return;
    try { await api.deleteResume(id); await refresh(); setNotice("Resume version deleted."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete resume."); }
  }

  return <div className="simple-page">
    <div className="page-heading"><div><div className="eyebrow">PRIVATE RESUME VERSIONS</div><h1>Resume library</h1><p>Keep tailored resume text versions for different roles and use them in the local AI matcher.</p></div></div>
    <div className="resume-layout">
      <form className="panel resume-form" onSubmit={event => void save(event)}>
        <div className="form-title"><FileText size={16}/><strong>Save a resume version</strong></div>
        <Input name="title" required maxLength={120} placeholder="Resume name (e.g. MERN developer)"/>
        <div className="field-grid"><Input name="targetRole" maxLength={120} placeholder="Target role"/><Input name="versionLabel" maxLength={80} placeholder="Version (e.g. Nov 2026)"/></div>
        <Input name="tags" placeholder="Tags, comma-separated"/>
        <Textarea name="content" required minLength={100} maxLength={30000} placeholder="Paste resume text here (100–30,000 characters)…" className="resume-content-input"/>
        <Input name="notes" maxLength={3000} placeholder="Private notes (optional)"/>
        <Button type="submit" disabled={busy}><Plus size={15}/>{busy ? "Saving…" : "Save resume version"}</Button>
        <p className="privacy-note">Resume content is stored in your local MongoDB database. Automatic backups use private local file permissions; exported JSON backups are not encrypted, so store them privately.</p>
      </form>
      <section className="panel resume-list">
        <div className="panel-heading"><div><h2>Saved versions</h2><p>{resumes.length} resume{resumes.length === 1 ? "" : "s"} available to the AI matcher</p></div></div>
        {resumes.map(resume => <article className="resume-row" key={resume._id}>
          <div className="company-avatar"><img className="asset-file-icon" src={resumeDocumentIcon} alt="" aria-hidden="true"/></div>
          <div className="row-main"><strong>{resume.title}</strong><small>{resume.targetRole || "Role not specified"} · {resume.versionLabel || "No version label"}</small><small>{resume.tags.join(" · ")}</small></div>
          <button className="icon-button" title="Delete resume" onClick={() => void remove(resume._id)}><Trash2 size={15}/></button>
        </article>)}
        {!resumes.length && <div className="empty-state compact"><h3>No resume versions saved</h3><p>Add a plain-text resume to reuse it during job matching.</p></div>}
      </section>
    </div>
    {notice && <div className="notice" role="status">{notice}</div>}
    {error && <div className="warning">{error}</div>}
  </div>;
}
