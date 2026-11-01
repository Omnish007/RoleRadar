import { ArrowRight, BookmarkPlus, Layers3, Search } from "lucide-react";
import { searchTemplates, type SearchTemplate } from "../lib/search-templates";
import { Button } from "./ui/button";

type Props = { onApply: (template: SearchTemplate["intent"]) => void; };

export function SearchTemplatesWorkspace({ onApply }: Props) {
  return <div className="simple-page">
    <div className="page-heading"><div><div className="eyebrow">START FROM A PROVEN SEARCH</div><h1>Search templates</h1><p>Choose a starting point, then adjust every filter before generating queries.</p></div></div>
    <div className="template-grid">
      {searchTemplates.map((template) => <article className="template-card" key={template.id}>
        <div className="template-card-top"><span className="template-icon"><Layers3 size={17}/></span><span className="template-category">{template.category}</span></div>
        <h2>{template.name}</h2><p>{template.description}</p>
        <div className="template-meta"><span>{template.intent.locations.length} locations</span><span>{template.intent.mustHaveSkills.length} required skills</span></div>
        <Button variant="secondary" className="template-action" onClick={() => onApply(template.intent)}><BookmarkPlus size={14}/> Use template <ArrowRight size={14}/></Button>
      </article>)}
    </div>
    <div className="tip-card"><Search size={17}/><div><strong>Templates are starting points, not rigid rules</strong><p>Review role synonyms and mandatory skills before searching. Remove exclusions when you need broader discovery.</p></div></div>
  </div>;
}
