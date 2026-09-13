# Simulation-time browser tests

The affected browser checks now opt into a development-only manual simulation
clock before page load. This disables automatic accumulation for that test page
and advances the same 50 ms tick function used by the live game, including the
competition opponent's shot planning. Shared sessions cannot use it, and the
mutation hook is removed from production builds.

Updated coverage: golfer remark expiry, night/sunrise boundary, maintenance work,
putting completion, championship/pro-challenge rounds and paid visitor rounds.
Conditions have explicit simulation-tick budgets and fail if not reached. UI
rendering is still asserted through the browser. Night is checked immediately
before and after sunrise; remarks are checked before and after their six-second
lifetime. Real-time camera animations, async UI changes and the automatic-time
liveness check remain real-time tests.

Validation: 35 targeted checks passed; a follow-up 16-check run covers the final
boundary assertions plus four land-purchase checks (39 unique checks overall).
Both expiry/sunrise browser checks also passed with SwiftShader (46.4 seconds).
Production build passed and contains neither the manual-clock flag nor its
mutation hook. The complete Linux CI suite was not rerun for this focused change;
its separate graphics/job-budget failures remain open.
