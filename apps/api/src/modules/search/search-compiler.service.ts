import { Injectable } from "@nestjs/common";
import { SearchIntent, SearchPlan } from "@roleradar/contracts";
import { validateBooleanQuery } from "./boolean-query.validator";

const clean = (value: string) => value.replace(/[\r\n]+/g, " ").trim();
const quote = (value: string) => `"${clean(value).replaceAll('"', '\\"')}"`;
const unique = (values: string[]) => [...new Set(values.map(clean).filter(Boolean))];
const group = (values: string[]) => `(${unique(values).map(quote).join(" OR ")})`;

@Injectable()
export class SearchCompilerService {
  compile(intent: SearchIntent): SearchPlan[] {
    return [this.linkedin(intent), this.naukri(intent), this.indeed(intent), this.wellfound(intent)];
  }

  private titles(intent: SearchIntent): string[] {
    const alternatives = intent.precision === "precise" ? [] : intent.alternativeRoles;
    const limit = intent.precision === "broad" ? 8 : 5;
    return unique([intent.primaryRole, ...alternatives]).slice(0, limit);
  }

  private filters(intent: SearchIntent) {
    return {
      locations: unique(intent.locations),
      minExperience: intent.minExperience ?? null,
      maxExperience: intent.maxExperience ?? null,
      workModes: intent.workModes,
      employmentTypes: intent.employmentTypes,
      postedWithinDays: intent.postedWithinDays ?? null,
      minSalary: intent.minSalary ?? null,
      maxSalary: intent.maxSalary ?? null,
      currency: intent.currency,
      excludedTerms: unique(intent.excludedTerms)
    };
  }

  private hiringTerms() {
    return ["we are hiring", "we're hiring", "looking for", "hiring", "vacancy", "opening"];
  }

  private linkedin(intent: SearchIntent): SearchPlan {
    const titles = this.titles(intent);
    const locations = unique(intent.locations);
    const exclusions = unique(intent.excludedTerms);
    const titleGroup = group(titles);
    const hireGroup = group(this.hiringTerms());
    const exclusion = exclusions.length ? ` NOT ${group(exclusions)}` : "";
    const requiredSkills = unique(intent.mustHaveSkills);
    const skillCondition = intent.precision === "precise"
      ? requiredSkills.map(quote).join(" AND ")
      : intent.precision === "balanced" && requiredSkills.length ? group(requiredSkills) : "";
    const targeted = `${titleGroup} AND ${hireGroup}${skillCondition ? ` AND ${skillCondition}` : ""}${exclusion}`;
    const broad = `${titleGroup}${exclusion}`;
    const jobPrompt = [
      `Find ${titles.join(", ")} job opportunities.`,
      locations.length ? `Preferred locations: ${locations.join(", ")}.` : "Location: any.",
      requiredSkills.length ? `${intent.precision === "precise" ? "Required skills" : "Skills to consider (not mandatory)"}: ${requiredSkills.join(", ")}.` : "",
      intent.precision === "precise" ? "Prioritize the primary title and require the stated skills." : "Include reasonable equivalent titles without assuming every preferred skill is mandatory.",
      intent.excludedTerms.length ? `Avoid roles clearly described as ${unique(intent.excludedTerms).join(", ")}.` : "",
      `Experience: ${intent.minExperience ?? "any"} to ${intent.maxExperience ?? "any"} years.`,
      `Work arrangement: ${intent.workModes.join(", ") || "any"}.`,
      `Employment: ${intent.employmentTypes.join(", ") || "any"}.`,
      intent.postedWithinDays ? `Prefer jobs posted within the last ${intent.postedWithinDays} days.` : ""
    ].filter(Boolean).join(" ");
    const variants = [];
    if (intent.intent !== "hiring_posts") variants.push({ id: "li-job-ai", label: "Jobs · Natural language", strategy: "Use LinkedIn's job-search natural-language field", query: jobPrompt });
    if (intent.intent !== "jobs") {
      variants.push({ id: "li-posts-targeted", label: "Posts · Hiring signals", strategy: "Boolean search in Posts; location is a separate filter", query: targeted });
      variants.push({ id: "li-posts-broad", label: "Posts · Broad role discovery", strategy: "Broader Boolean search; best for recall", query: broad });
    }
    const invalidQueries = variants.filter((variant) => variant.id.startsWith("li-posts"))
      .flatMap((variant) => validateBooleanQuery(variant.query || "").errors.map((message) => `${variant.label}: ${message}`));
    return {
      platform: "linkedin", variants, nativeFilters: this.filters(intent),
      manualInstructions: [
        "For jobs, open LinkedIn Jobs and paste the natural-language request into its search experience.",
        "For hiring announcements, use the main LinkedIn search bar, paste a Posts query, then select Posts.",
        "Apply location, date posted, experience, employment and workplace filters in LinkedIn where available."
      ],
      warnings: [
        "Boolean queries are intended for LinkedIn's main search bar, not as a guarantee of equivalent Jobs-filter behavior.",
        ...(locations.length ? ["Location is shown as a separate filter; it is deliberately not ANDed into the Posts query to avoid reducing recall."] : []),
        ...invalidQueries.map((message) => `Generated query requires review. ${message}`)
      ]
    };
  }

  private naukri(intent: SearchIntent): SearchPlan {
    const titles = this.titles(intent);
    const skill = intent.precision === "precise"
      ? unique(intent.mustHaveSkills)
      : intent.precision === "balanced"
        ? unique(intent.mustHaveSkills).slice(0, 2)
        : unique([...intent.mustHaveSkills, ...intent.preferredSkills]).slice(0, 1);
    const variants = titles.flatMap((title, index) => {
      const rows = [{ id: `nk-${index + 1}`, label: title, strategy: "Title-focused keyword search", query: title }];
      if (skill.length) rows.push({ id: `nk-${index + 1}-skill`, label: `${title} + skills`, strategy: "Related technology keyword search", query: `${title} ${skill.slice(0, 2).join(" ")}` });
      return rows;
    }).slice(0, 10);
    return {
      platform: "naukri", variants, nativeFilters: this.filters(intent),
      manualInstructions: [
        "Run keyword variants separately; avoid pasting LinkedIn-specific Boolean syntax unless the current Naukri search UI explicitly supports it.",
        "Apply location, experience, salary and work-mode filters using Naukri's native controls.",
        ...(intent.excludedTerms.length ? ["Use Naukri's exclusion controls if available; otherwise review excluded terms manually."] : []),
        "Use the freshness filter and sort by date when prioritizing recent openings."
      ],
      warnings: ["Naukri search behavior can differ by search field and product version; variants are intentionally simple keyword inputs."]
    };
  }

  private indeed(intent: SearchIntent): SearchPlan {
    const titles = this.titles(intent);
    const skills = unique(intent.mustHaveSkills);
    const exclusions = unique(intent.excludedTerms).map((term) => `-${term.replace(/\s+/g, "-")}`).join(" ");
    const roleGroup = group(titles);
    const balancedSkills = skills.length ? ` AND ${group(skills)}` : "";
    const preciseSkills = skills.map(quote).join(" AND ");
    const broad = `${roleGroup}${exclusions ? ` ${exclusions}` : ""}`.trim();
    const balanced = `${roleGroup}${balancedSkills}${exclusions ? ` ${exclusions}` : ""}`.trim();
    const precise = `title: ${quote(intent.primaryRole)}${preciseSkills ? ` AND ${preciseSkills}` : ""}${exclusions ? ` ${exclusions}` : ""}`;
    return {
      platform: "indeed",
      variants: [
        { id: "in-broad", label: "Broad role discovery", strategy: "Role alternatives without mandatory skill narrowing", query: broad },
        { id: "in-balanced", label: "Balanced role + skills", strategy: "Match at least one key skill where the search engine supports grouped Boolean terms", query: balanced },
        ...(intent.precision === "precise" ? [{ id: "in-precise", label: "Exact title + required skills", strategy: "Strict primary-title and mandatory-skill query", query: precise }] : [{ id: "in-title", label: "Primary title", strategy: "Title-focused search", query: `title: ${quote(intent.primaryRole)}${exclusions ? ` ${exclusions}` : ""}` }])
      ],
      nativeFilters: this.filters(intent),
      manualInstructions: [
        "Paste a query into Indeed's What search field.",
        "Set Where, date posted, job type, salary and work-setting filters in the interface.",
        ...(intent.excludedTerms.length ? ["Review minus-prefixed exclusions and confirm Indeed interprets them as intended in your locale."] : [])
      ],
      warnings: ["Indeed's query operators and locale-specific behavior should be verified in the live search UI before treating the result set as complete."]
    };
  }

  private wellfound(intent: SearchIntent): SearchPlan {
    const roles = this.titles(intent);
    const keywords = unique([...intent.mustHaveSkills, ...intent.preferredSkills]);
    return {
      platform: "wellfound",
      variants: [{ id: "wf-structured", label: "Startup-focused search", strategy: "Map values into Wellfound's role, keyword and native filters", query: (keywords.length ? keywords : roles).join(", ") }],
      nativeFilters: { ...this.filters(intent), roles, keywords },
      manualInstructions: [
        "Select the closest available role in Wellfound's role picker.",
        "Enter the generated keywords in the keyword field.",
        "Configure location, salary, experience, company stage and size using available native filters.",
        ...(intent.excludedTerms.length ? ["Wellfound may not offer equivalent negative keyword filtering; review the excluded terms manually."] : []),
        "For remote roles, verify the employer's 'Hires Remotely From' eligibility rather than relying on headquarters location."
      ],
      warnings: ["The generated roles and keywords are suggestions; choose from the platform's actual filter options."]
    };
  }
}
