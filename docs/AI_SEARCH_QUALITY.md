# AI search interpretation

## Processing flow

1. The Python service validates the input length and normalizes whitespace.
2. Qwen receives the request with a constrained `SearchIntent` JSON schema. The system prompt treats the request as source data, not as instructions.
3. Deterministic rules reconcile fields that should not depend on a small model: stack expansions, common job-title normalization, explicit location mentions, experience bounds, salary units, work modes, employment type, exclusions, precision and posting age.
4. Pydantic validates the reconciled object and removes null optional values before it crosses the NestJS/Zod boundary.
5. The desktop form remains editable; AI interpretation never launches a job-board search automatically.

## Explicit constraint policy

- Explicit numbers from the user's text override model output.
- Experience and salary values not present in the request are removed rather than guessed.
- Work modes and posting age are only set when stated.
- Work-from-home wording is not treated as a geographic location.
- Known stack acronyms are expanded from a local, reviewable catalogue: MERN, MEAN, PERN and MEVN.
- Locations must be traceable to the source text. Explicitly contextualized unknown place names are preserved; a city invented only by the model is discarded. Common spelling aliases are normalized against a curated place list.
- Exclusions and positive work preferences are parsed separately. Negated preferences such as “no remote” are not accidentally added as filters.
- The search profile name is generated from the resolved role and first explicit location, not model boilerplate.
- Salary suffixes such as LPA, lakh, crore and explicitly contextualized `k` amounts are converted to numeric values in the selected currency. The UI should be used to review ambiguous salary periods before compiling.

## Local model behavior

The default model is `qwen3.5:2b-q4_K_M`. Structured generation uses Ollama's JSON-schema mode, disables thinking for extraction calls, keeps the model warm for five minutes, and uses a low temperature. `/health` now reports API reachability and whether the configured model is actually present in `/api/tags`.

## Regression coverage

The test suite covers the reported request:

`Mern stack developer in gandhinager with 4 years of experience`

Expected deterministic fields:

- Primary role: `MERN Stack Developer`
- Alternative titles: `MERN Developer`, `Full Stack JavaScript Developer`
- Must-have skills: `MongoDB`, `Express.js`, `React`, `Node.js`
- Location: `Gandhinagar`
- Minimum experience: `4`
- No assumed salary or work arrangement

Other cases cover location aliases and unknown explicit cities, role/skill vocabulary, stack exclusions, preferred versus required skills, experience ranges and month conversion, fresher intent, negated work modes, employment type, exclusions, precision, posting age, salary units and removal of model-invented constraints. Tests exercise the deterministic post-processing independently of Ollama so regressions are fast and repeatable.

## Operational limitations

The LLM still handles role interpretation and ambiguous natural language. A 2.3B local model will not have the same recall as a larger hosted model. Keep a growing evaluation set based on real, anonymized prompts; review false positives and false negatives before expanding the alias catalogue. Do not use model-generated output as an employment decision or as a substitute for reviewing the source job description.
