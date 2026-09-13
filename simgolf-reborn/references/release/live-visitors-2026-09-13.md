# Live visitor integration — 13 September 2026

Protocol 91 / `live-native-visitors-2026-09-13` enables `liveBehaviorVersion: 1`
for new games. Existing saves without this field retain their prior behavior;
pre-91 published courses retain their rules. No production deployment is implied.

## Connected behavior

- Routing uses the recovered reverse-wave cost arithmetic and native path bias
  on the purchased live map. Distances do not wrap, water/buildings remain hard
  barriers, and diagonal corners cannot cut through them. Tree-side approaches
  and departures preserve trunk clearance. Flooded/blocked waypoints trigger a
  retry/replan instead of walking into the obstruction.
- Service choice filters reachable facilities before the recovered ordered
  nearest-facility search. The existing needs policy chooses the service type.
- Completed snack, washer, putting, shop and range visits call recovered arrival
  behavior. Native fees are $5, $0, $4, $6 and $8 respectively. Ordinary post-round
  practice pays the same fee. Existing live refreshment/training benefits remain.
  Disconnected or incomplete visits cannot settle. Native remark calls preserve
  their ordering with shared RNG; live money is booked once at completion.
- Known approach, tiredness, steep-path and service incidents use recovered
  remark selection, packed history, preamble and outcome. The packed history is
  persisted and validated. Happiness remains bounded at -10..10 and distinct
  incidents cannot reward or penalize each frame. Negative reactions can create
  a local weed patch through the recovered outcome decision.
- Current live text presents the reaction. Unmapped local incidents keep their
  existing one-point policy under a reserved local identifier. Relaxed difficulty
  and immediate feedback are explicit live bindings, not recovered retail setup.

## Evidence

- Full live suite: 573 passed in four minutes. The focused six-test run also
  passes, including two boundary tests added after full-suite collection
  (575 distinct live checks total).

- Original executable: 160 complete pathfinder cases match direction, flags,
  every tile cost and both ring queues after extracting the shared cost function.
- Six focused live tests cover blocked corners, real facility fees/selection,
  reaction history and malformed saves, full two-hole service/reload/settlement,
  newly flooded waypoints and legacy behavior versions.
- Long-session evidence: 7,260 simulated seconds, 304 completed rounds, 304
  facility visits, nine helicopter fees and 12 restore cycles. Flight, release,
  putting and final future-state replay match exactly. See the adjacent JSON.
- Account/server regression: 82 passed, one optional capacity check skipped.
- Production build passes; existing chunk-size warning remains.

## Fidelity boundary

These are live adapters, not the entire packed retail world. Live geometry,
terrain costs, needs thresholds, fixed visit durations, rest restoration,
upgrade progression and audio presentation are not claimed to be exact retail
values. Captured service scratch records are separate from remark actor records
because their original base offsets differ. The recovered native effect calls
are translated to current live benefits/accounting/comments, not original sound
files or the complete original animation controller.

Older reports describing reactions/routing/facilities as wholly unconnected are
superseded by this checkpoint. Remaining career, resort balance, audio and hosted
release acceptance are separate work.
