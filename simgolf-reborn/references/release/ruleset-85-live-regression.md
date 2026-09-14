# Ruleset 85 live-game regression

Ran `npm run test:live` after the regional appearance and palm collision changes.
The suite excludes isolated `original-*` engine recovery tests. It executed 511
checks in 6.1 minutes: 509 passed and two failed.

Both failures were caused by the hotel renderer reading an out-of-scope `g`
when constructing a facility. They affected building inspection and connection
lighting. The facility factory now receives the environment explicitly from
course rebuilding and from the placement preview. Preview caching includes the
environment so switching styles cannot retain the previous hotel geometry.

All nine affected facility inspection, lighting, hotel and Tropical resort
checks passed after repair. An additional browser check passes through the real
course view, compares the placed Tropical hotel with its placement preview and
verifies that Parklands switches to its taller hotel. Both Tropical resort
checks and the production build pass. The full suite was not rerun after this
localized repair; do not report a clean 511-test run.

The broad run covers current construction, visitor play, local saves, transport,
regional scenery, day/night, course packages and browser/phone-layout assertions.
It does not establish physical-phone performance, hosted multiplayer capacity,
provider activation, prolonged hosted stability or original-game parity. Those
release gates remain open. No push or deployment performed.

## Complete rerun after the hotel repair

`SIMGOLF_PUBLIC_TESTS=1 npm run test:live` completed successfully: 507 passed,
five explicitly skipped, 512 total in 5.6 minutes. This includes the additional
placed-hotel/preview check and the previously failing facility tests. The five
skips are private original-file comparisons documented in [public CI](public-ci.md);
all nine tests in those three reference/parser suites also passed separately
with the local files present. The rerun used the local Chrome browser, not a
GitHub runner or deployed server. The release limitations above still apply.

## Regional buildings and applause rerun

The full public-mode live suite completed after the regional facilities,
placement-cache and applause changes: **518 passed, five private-reference
skips, 523 total, 5.7 minutes**. Application source stayed fixed during this
run. The stronger playback-clock cooldown test passed within it. This is local
Chrome regression evidence; hosted and physical-device gates remain open.

## Coastal audio and comparison UI rerun

The full public-mode live suite completed successfully: **523 passed, five
private-reference skips, 528 total, 5.7 minutes**. The production build also
passed. This includes coastal ambience, New Game environment switching and the
new golfer-comparison browser tests. Application source remained fixed during
the run; only documentation and an excluded `original-*` checkpoint test changed.
The latter's six checks passed separately, including browser-storage reload.

Recovered-engine tests are excluded by the live configuration; this result does
not claim their full regression, live adoption, hosted stability or physical
phone performance. The five private-file skips remain explicit. No push or
production deployment was performed.
