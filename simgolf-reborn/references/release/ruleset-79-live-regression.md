# Ruleset 79 broad live-game regression

On 2026-09-12, all 456 tests in 119 live-game test files passed in 4.9 minutes. The run selected `scene/tests/*.spec.js`, excluding filenames starting with `original-`, and executed them through the normal Playwright setup.

Coverage includes canvas construction, opening multiple holes, actual completed rounds, shot/save resumption, terrain and coast editing, bridges, paths, visitor pairing and appearances, reactions, staff and maintenance, resorts and transport, stories, course packages, competitions, saved golfers and phone controls. This broad check follows the signed-happiness live integration in protocol 79.

The exclusion separates isolated original-executable reconstruction tests from the playable-game baseline; it does not imply those native verifiers failed or were removed. Some selected live tests also exercise recovered helpers. The account/backend and authenticated Worker/D1 browser suites are separate and have their own recorded results.

This run establishes the existing tested behavior, not full original-game fidelity or production readiness. The new tropical concept remains awaiting visual approval and is not part of the playable environment. No deployment occurred. Screenshots produced by tests are not automatically approved artwork.
