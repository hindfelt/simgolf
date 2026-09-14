# Ruleset 83 live-game stability assessment

Assessed locally on 12 September 2026, following preview-camera and coastal planting changes. No deployment performed.

## Scope and result

The broad Chrome regression executed 535 checks in 5.7 minutes: 533 passed and two phone staff-placement checks failed. The legacy filename selection also included 31 isolated original-engine checks because Playwright treats filename arguments as regular expressions. The actual live-game set contains 504 checks across 132 files. A dedicated command now makes that boundary explicit:

```sh
npm --prefix simgolf-reborn/scene run test:live
```

`playwright.live.config.js` excludes `original-*.spec.js`; the normal test command continues to include those tests. Account/Worker/D1 integration and physical-device performance are separate suites, not included here.

## Failure and repair

On phones, Send to area collapses the staff panel. Its ResizeObserver applied camera framing asynchronously. A world destination projected immediately after clicking the button could therefore move before the subsequent click, leaving the employee idle. Staff destination mode now applies the new camera framing synchronously after updating the panel. Both reported failures pass in the focused six-check staff regression. Both phone checks also pass three consecutive runs each (six passes in 15.8 seconds). The production build passes.

The broad run covers construction, holes, terrain, paths, boundaries, land, golfer rounds, services, maintenance, career prototypes, transport, daily cycles, local saves, course packages and desktop/phone UI. Passing those checks validates their current assertions; it does not establish original-game parity. The broad suite has not been rerun after the two-line camera fix; focused reruns exercise its affected path.

## Release assessment

The two failures found here have a localized repair. This is a tested local preview, not a completed 1.0 release. Remaining gates include original runtime/putting integration and parity, full career and regional architecture, broader atmosphere/audio, real hosted account/provider and multiplayer activation/verification, physical-phone performance and prolonged hosted sessions. The requirement-by-requirement F01–F12/P01–P20 audit remains open. See `live-putting-gap.md` in the observations directory and the main backlog for fidelity gaps. Do not infer completion from this regression result.
