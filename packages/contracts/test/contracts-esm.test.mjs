import assert from "node:assert/strict";
import test from "node:test";
import { BackupImportSchema, ResumeInputSchema } from "@roleradar/contracts";

test("ESM consumers receive runtime validation schemas", () => {
  assert.equal(typeof BackupImportSchema.parse, "function");
  assert.equal(typeof ResumeInputSchema.parse, "function");
});
