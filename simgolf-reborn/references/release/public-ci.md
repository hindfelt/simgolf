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
