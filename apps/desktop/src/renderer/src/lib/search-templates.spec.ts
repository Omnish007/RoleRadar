import { describe, expect, it } from "vitest";
import { SearchIntentSchema } from "@roleradar/contracts";
import { searchTemplates } from "./search-templates";

describe("search templates", () => {
  it("provides unique stable template IDs", () => {
    const ids = searchTemplates.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every built-in template valid against the shared intent contract", () => {
    for (const template of searchTemplates) {
      expect(SearchIntentSchema.safeParse(template.intent).success, template.name).toBe(true);
    }
  });

  it("includes a hiring-announcement and broad-discovery template", () => {
    expect(searchTemplates.some((template) => template.intent.intent === "hiring_posts")).toBe(true);
    expect(searchTemplates.some((template) => template.intent.precision === "broad")).toBe(true);
  });
});
