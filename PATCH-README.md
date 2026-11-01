# RoleRadar search workspace refinement

This is a focused renderer-only patch. It does not change API routes, contracts,
search-plan generation, persistence, AI behavior, database schemas, or navigation.

## Included changes

- The left sidebar stays within the app viewport. Its navigation list scrolls independently, while the brand and bottom account/settings area remain visible.
- The top bar remains in place while the main workspace scrolls independently.
- The long search criteria form is a four-stage guided flow: Role & skills, Location, Preferences, and Review.
- Every existing SearchIntent field is retained and mapped to the same `update` callback. Search compilation and saved-profile actions still use the existing callbacks and payload shape.
- Range validation provides inline feedback before compilation.

## Apply

From the RoleRadar repository root (the directory containing `pnpm-workspace.yaml`):

```bash
unzip -o RoleRadar-search-workspace-refinement.zip -d .
node scripts/apply-search-workspace-ux.mjs
pnpm --filter @roleradar/contracts build
pnpm --filter @roleradar/desktop typecheck
pnpm dev
```

The application import insertion is idempotent. Running the script again does not duplicate the stylesheet import.
