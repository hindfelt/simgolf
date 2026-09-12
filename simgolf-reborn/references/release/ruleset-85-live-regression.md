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
