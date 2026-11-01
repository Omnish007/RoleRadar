import { describe, expect, it } from "vitest";
import { validateBooleanQuery } from "./boolean-query.validator";

describe("validateBooleanQuery", () => {
  it("accepts grouped uppercase Boolean syntax", () => {
    expect(validateBooleanQuery('("React Developer" OR "MERN Developer") AND Node.js').valid).toBe(true);
  });
  it("rejects an unclosed phrase", () => {
    expect(validateBooleanQuery('"React Developer').errors).toContain("A quoted phrase is not closed.");
  });
  it("rejects unsupported wildcard tokens", () => {
    expect(validateBooleanQuery("React* OR Node.js").valid).toBe(false);
  });
  it("does not treat words inside quoted phrases as operators", () => {
    expect(validateBooleanQuery('"Research and Development" OR React').valid).toBe(true);
  });
  it("rejects lowercase Boolean operators outside phrases", () => {
    expect(validateBooleanQuery('React and Node.js').errors).toContain("Boolean operators must be uppercase for LinkedIn search.");
  });
  it("rejects unmatched grouping", () => {
    expect(validateBooleanQuery('(React OR Node.js').valid).toBe(false);
  });
});
