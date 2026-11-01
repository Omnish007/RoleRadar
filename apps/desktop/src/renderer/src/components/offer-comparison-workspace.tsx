import { useMemo, useState } from "react";
import { ArrowLeftRight, Award, BriefcaseBusiness } from "lucide-react";
import type { OpportunityRecord } from "../types/models";
import { Button } from "./ui/button";

type Props = { opportunities: OpportunityRecord[] };

export function OfferComparisonWorkspace({ opportunities }: Props) {
  const offers = useMemo(() => opportunities.filter(item => item.status === "offer"), [opportunities]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selected = offers.filter(offer => selectedIds.includes(offer._id));

  function toggle(id: string) {
    setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  return <div className="simple-page">
    <div className="page-heading"><div><div className="eyebrow">MAKE THE TRADE-OFFS VISIBLE</div><h1>Offer comparison</h1><p>Compare offers you have manually moved to the Offer stage. Verify every detail with the employer.</p></div></div>
    {!offers.length ? <div className="panel empty-state"><div className="empty-icon"><Award size={22}/></div><h3>No offers to compare yet</h3><p>Move an opportunity to the Offer stage when you receive an offer.</p></div> : <section className="panel offer-panel">
      <div className="panel-heading"><div><h2>Available offers</h2><p>Select two or more offers to compare them side by side.</p></div><span className="status-pill">{offers.length} offers</span></div>
      <div className="offer-select-list">{offers.map(offer => <label className="offer-select-row" key={offer._id}><input type="checkbox" checked={selectedIds.includes(offer._id)} onChange={() => toggle(offer._id)}/><span><strong>{offer.title}</strong><small>{offer.company} · {offer.location || "Location not specified"}</small></span><b>{offer.salaryText || "Salary not recorded"}</b></label>)}</div>
      {selected.length >= 2 ? <div className="offer-comparison-table"><div className="offer-compare-heading"><ArrowLeftRight size={16}/><strong>Side-by-side comparison</strong></div><div className="offer-compare-grid"><div className="offer-compare-labels"><span>Role</span><span>Company</span><span>Compensation</span><span>Location</span><span>Source</span><span>Notes</span></div>{selected.map(offer => <div className="offer-compare-column" key={offer._id}><strong>{offer.title}</strong><span>{offer.company}</span><span>{offer.salaryText || "Not provided"}</span><span>{offer.location || "Not provided"}</span><span>{offer.source}</span><span>{offer.notes || "No notes yet"}</span></div>)}</div><p className="analytics-footnote">This comparison uses information you entered. It does not estimate take-home pay, benefits or contract terms.</p></div> : <p className="muted-copy">Select at least two offers to compare them.</p>}
      <div className="offer-actions"><Button variant="secondary" onClick={() => setSelectedIds([])}>Clear selection</Button></div>
    </section>}
    <div className="tip-card"><BriefcaseBusiness size={17}/><div><strong>Compare total value, not just the headline number</strong><p>Use each opportunity's notes to record variable pay, insurance, leave, commute, remote eligibility, working hours and notice period. Confirm details in writing before deciding.</p></div></div>
  </div>;
}
