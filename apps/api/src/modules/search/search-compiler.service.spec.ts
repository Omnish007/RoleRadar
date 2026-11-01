import { describe, expect, it } from "vitest";
import { SearchCompilerService } from "./search-compiler.service";
import { validateBooleanQuery } from "./boolean-query.validator";
import { SearchIntent } from "@roleradar/contracts";

const intent: SearchIntent = {
  name: "MERN Ahmedabad", primaryRole: "MERN Developer",
  alternativeRoles: ["Full Stack Developer"], mustHaveSkills: ["React", "Node.js"],
  preferredSkills: [], excludedTerms: ["internship"], locations: ["Ahmedabad"],
  minExperience: 3, maxExperience: 5, workModes: ["hybrid"],
  employmentTypes: ["full-time"], postedWithinDays: 7, currency: "INR",
  intent: "both", precision: "balanced"
};

describe("SearchCompilerService", () => {
  const compiler = new SearchCompilerService();

  it("returns one plan per supported platform", () => {
    expect(compiler.compile(intent).map(plan => plan.platform))
      .toEqual(["linkedin", "naukri", "indeed", "wellfound"]);
  });

  it("generates a separate LinkedIn hiring-post strategy", () => {
    const linkedin = compiler.compile(intent)[0];
    expect(linkedin.variants.some(variant => variant.id === "li-posts-targeted")).toBe(true);
  });

  it("does not assume Naukri supports nested Boolean syntax", () => {
    const naukri = compiler.compile(intent)[1];
    expect(naukri.variants.length).toBe(4);
    expect(naukri.warnings[0]).toContain("simple keyword");
  });

  it("generates syntactically valid LinkedIn Boolean query variants", () => {
    const linkedin = compiler.compile(intent)[0];
    for (const variant of linkedin.variants.filter(item => item.id.startsWith("li-posts"))) {
      expect(validateBooleanQuery(variant.query || "").valid).toBe(true);
    }
  });

  it("generates a Wellfound query even when no technology keywords are selected", () => {
    const result = compiler.compile({ ...intent, mustHaveSkills: [], preferredSkills: [] })[3];
    expect(result.variants[0].query).toContain("MERN Developer");
  });

  it("changes skill strictness across broad, balanced and precise modes", () => {
    const compile = (precision: SearchIntent["precision"]) => compiler.compile({ ...intent, precision });
    const broadLinkedIn = compile("broad")[0].variants.find(item => item.id === "li-posts-targeted")?.query || "";
    const balancedLinkedIn = compile("balanced")[0].variants.find(item => item.id === "li-posts-targeted")?.query || "";
    const preciseLinkedIn = compile("precise")[0].variants.find(item => item.id === "li-posts-targeted")?.query || "";
    expect(broadLinkedIn).not.toContain('"React"');
    expect(balancedLinkedIn).toContain('("React" OR "Node.js")');
    expect(preciseLinkedIn).toContain('"React" AND "Node.js"');
  });

  it("shows Naukri keyword variants appropriate to the selected precision", () => {
    const broad = compiler.compile({ ...intent, precision: "broad" })[1];
    const precise = compiler.compile({ ...intent, precision: "precise" })[1];
    expect(broad.variants.some(item => item.query === "MERN Developer")).toBe(true);
    expect(precise.variants).toHaveLength(2);
    expect(precise.variants.some(item => item.query === "MERN Developer React Node.js")).toBe(true);
  });

  it("generates Indeed exclusions", () => {
    const indeed = compiler.compile(intent)[2];
    expect(indeed.variants[0].query).toContain("-internship");
  });
});
