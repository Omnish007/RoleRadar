import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BrainCircuit, ClipboardList, FileSearch, Lightbulb, LoaderCircle, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import type { ResumeRecord } from "../types/models";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type Tool = "keywords" | "job" | "resume" | "interview" | "notes" | "company";
const toolNames: Record<Tool, string> = {
  keywords: "Keyword expansion", job: "Job description", resume: "Resume match", interview: "Interview prep",
  notes: "Notes summary", company: "Company research"
};

export function AiWorkspace() {
  const [tool, setTool] = useState<Tool>("job");
  const [jobDescription, setJobDescription] = useState("");
  const [keywordRole, setKeywordRole] = useState("");
  const [keywordSkills, setKeywordSkills] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [savedResumes, setSavedResumes] = useState<ResumeRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [notes, setNotes] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sourceMaterial, setSourceMaterial] = useState("");
  const [seniority, setSeniority] = useState("Mid-level");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api.resumes().then(rows => { if (active) setSavedResumes(rows); }).catch(() => { if (active) setSavedResumes([]); });
    return () => { active = false; };
  }, []);

  async function loadResume(id: string) {
    setSelectedResumeId(id);
    if (!id) return;
    try {
      const resume = await api.resume(id);
      setResumeText(resume.content || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load saved resume.");
    }
  }

  async function run() {
    setBusy(true); setError(""); setResult(null);
    try {
      let response: unknown;
      if (tool === "keywords") response = await api.expandKeywords(keywordRole, keywordSkills.split(",").map(value => value.trim()).filter(Boolean));
      else if (tool === "job") response = await api.analyzeJob(jobDescription);
      else if (tool === "resume") response = await api.matchResume(resumeText, jobDescription);
      else if (tool === "interview") response = await api.interviewQuestions(jobDescription, seniority);
      else if (tool === "notes") response = await api.summarizeNotes(notes);
      else response = await api.summarizeCompany(companyName, sourceMaterial);
      setResult(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The local AI operation failed.");
    } finally { setBusy(false); }
  }

  const ready = tool === "keywords" ? keywordRole.trim().length >= 2
    : tool === "job" || tool === "interview" ? jobDescription.trim().length >= 30
    : tool === "resume" ? resumeText.trim().length >= 50 && jobDescription.trim().length >= 30
    : tool === "notes" ? notes.trim().length >= 30
    : companyName.trim().length > 0 && sourceMaterial.trim().length >= 50;

  return <div className="simple-page">
    <div className="page-heading"><div><div className="eyebrow">PRIVATE LOCAL INFERENCE</div><h1>AI workspace</h1><p>Analyze job material with your local Ollama model. Text stays on your machine.</p></div><span className="local-ai-badge"><span className="status-dot"/> OLLAMA</span></div>
    <div className="panel ai-workspace-panel">
      <div className="ai-tool-tabs">
        {(["keywords", "job", "resume", "interview", "notes", "company"] as Tool[]).map(item => <button key={item} className={tool === item ? "ai-tool-tab active" : "ai-tool-tab"} onClick={() => { setTool(item); setResult(null); setError(""); }}><span>{toolNames[item]}</span></button>)}
      </div>
      <div className="ai-form">
        {tool === "keywords" && <><ToolHeading icon={<Sparkles size={17}/>} title="Search vocabulary expansion" description="Find equivalent titles, skill terminology and query phrases. Review suggestions before adding them to a saved search."/><Field title="Target role"><input className="ai-native-input" value={keywordRole} onChange={event => setKeywordRole(event.target.value)} placeholder="e.g. MERN Stack Developer"/></Field><Field title="Existing skills (comma-separated)"><input className="ai-native-input" value={keywordSkills} onChange={event => setKeywordSkills(event.target.value)} placeholder="React, Node.js, MongoDB"/></Field></>}
        {tool === "job" && <><ToolHeading icon={<FileSearch size={17}/>} title="Job description analyzer" description="Extract title, skills, responsibilities, location and stated requirements."/><Textarea value={jobDescription} onChange={event => setJobDescription(event.target.value)} placeholder="Paste the full job description here…" /></>}
        {tool === "resume" && <><ToolHeading icon={<BrainCircuit size={17}/>} title="Resume matcher" description="Compare evidence in your resume against a specific job description."/>{savedResumes.length > 0 && <Field title="Load a saved resume version"><select className="ai-native-select" value={selectedResumeId} onChange={event => void loadResume(event.target.value)}><option value="">Paste a different resume</option>{savedResumes.map(resume => <option key={resume._id} value={resume._id}>{resume.title}{resume.versionLabel ? ` · ${resume.versionLabel}` : ""}</option>)}</select></Field>}<Field title="Resume text"><Textarea value={resumeText} onChange={event => setResumeText(event.target.value)} placeholder="Paste your resume text or load a saved version…" /></Field><Field title="Job description"><Textarea value={jobDescription} onChange={event => setJobDescription(event.target.value)} placeholder="Paste the job description…" /></Field></>}
        {tool === "interview" && <><ToolHeading icon={<Lightbulb size={17}/>} title="Interview preparation" description="Generate technical, behavioral and system-design questions from a job description."/><Field title="Seniority"><select className="ai-native-select" value={seniority} onChange={event => setSeniority(event.target.value)}><option>Junior</option><option>Mid-level</option><option>Senior</option><option>Lead</option></select></Field><Textarea value={jobDescription} onChange={event => setJobDescription(event.target.value)} placeholder="Paste the job description…" /></>}
        {tool === "notes" && <><ToolHeading icon={<ClipboardList size={17}/>} title="Notes summarizer" description="Turn recruiter notes or interview notes into key points and action items."/><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Paste your notes…" /></>}
        {tool === "company" && <><ToolHeading icon={<Sparkles size={17}/>} title="Company research summary" description="Summarize company information you provide. This tool does not browse or invent company facts."/><Field title="Company name"><input className="ai-native-input" value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder="Company name" /></Field><Textarea value={sourceMaterial} onChange={event => setSourceMaterial(event.target.value)} placeholder="Paste the company overview, website text or public materials…" /></>}
        <Button onClick={run} disabled={!ready || busy} className="ai-run-button">{busy ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>} {busy ? "Working with local model…" : `Run ${toolNames[tool].toLowerCase()}`}</Button>
        {error && <div className="warning">{error}</div>}
        {result !== null && <div className="ai-result"><div className="ai-result-title"><strong>AI result</strong><span>Review before acting</span></div><pre>{JSON.stringify(result, null, 2)}</pre></div>}
      </div>
    </div>
  </div>;
}

function ToolHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="ai-tool-heading"><span>{icon}</span><div><strong>{title}</strong><p>{description}</p></div></div>;
}
function Field({ title, children }: { title: string; children: ReactNode }) {
  return <label className="ai-field"><span>{title}</span>{children}</label>;
}
