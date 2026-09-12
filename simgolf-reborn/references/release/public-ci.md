# Fairway Baron public CI coverage

The CI workflow now defines a separate Fairway Baron job in
`simgolf-reborn/scene`. It installs the scene lockfile dependencies and Chrome,
builds the game, then runs `npm run test:live`. Browser failure diagnostics are
retained for seven days. The older root application keeps its existing job.
Neither job deploys production.

The live configuration excludes isolated `original-*.spec.js` engine recovery
comparisons. Five additional reference comparisons require privately supplied
original-game files. They explicitly skip when those files are absent or
`SIMGOLF_PUBLIC_TESTS=1`; browser catalog checks and synthetic parser rejection
checks remain enabled. Private binaries and story files are not uploaded.

Validation: the workflow parses as YAML with both jobs. All nine reference and
parser checks passed locally with the private files available; the public-mode
run passed four and explicitly skipped five. Five regional appearance and tree
checks also passed. The production build passed. The full public-mode live
suite and hosted execution are pending; this is not a release stability claim.

## Publication status

Commit `83c7f9a` contains the workflow and public-reference handling. GitHub
rejected its push because the authenticated `hindfelt` OAuth credential lacks
`workflow` scope. The remote branch therefore still ends at `c227e27`; the new
Fairway Baron job has not run on GitHub. Publishing it requires an appropriately
authorized credential. The local full-suite run continues independently.
