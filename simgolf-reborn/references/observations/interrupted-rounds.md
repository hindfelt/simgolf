# Interrupted visitor rounds: implementation requirements

The supplied manual, printed p.21, describes angry golfers upsetting others and Marshalls ejecting them. It does not establish the anger threshold, duration, movement pattern or refund policy. Those details need original-runtime observation; neither a zero-happiness trigger nor a fixed rage duration is established by the manual.

## Current code evidence

- `simulation/game.js:advanceRound` sets `roundFinished`, increments completed-round statistics, calls `rememberGuest`, records a completed scorecard and considers membership applications. Ejection must not call this path.
- `simulation/game.js:finishHole` already books each completed hole's fees, strokes and evaluation observations. Interrupting a later hole must preserve those existing entries exactly once; no unfinished-hole fee or fabricated stroke result should be added.
- `simulation/game.js:update` waits for every current partner to finish the hole. Active-pair and admission checks use `hasClearedTee`. A departing interrupted golfer must release these gates without being counted as having hit two shots or completed the hole.
- `simulation/vendors.js:releaseRefreshment` clears staff/customer reservations. Interruption must cancel both vendor and consultant service and award no unfinished drink.
- `simulation/guest-roster.js:rememberGuest` and its validator currently assume returning eligibility comes from a completed round. A first-time interrupted visitor needs a separate visit outcome; incrementing completed rounds to permit return would corrupt history.
- `simulation/game.js:validateRounds` validates completed scorecards and current itineraries. A separate interrupted-round record must retain the completed-hole prefix and current-hole context without entering completed-round rankings, best scores, membership qualification or tournament standings.

## Required implementation sequence

1. Introduce a validated interruption record, separate from completed `rounds`. Preserve round/visitor IDs, completed-hole scorecard prefix, interruption time/reason and current-hole context. Bound retained history and migrate old resorts without invented interruptions.
2. Add a simulation-owned interruption transition that cancels service/shot activity, preserves already booked finances, releases pair/tee gates and routes the visitor to a reachable exit. Keep a visible waiting state if no route exists; do not teleport the visitor or silently erase them.
3. Extend visitor history to distinguish completed and interrupted visits. Preserve identity and training. Return eligibility and membership resignation require source-backed policy; they must not be inferred from fabricated completion.
4. Add angry movement and nearby negative reactions with explicit provisional tuning where original evidence is absent. Save/reload must not repeat reactions or change simulation randomness unexpectedly.
5. Add Marshall hiring/promotion at the skilled-staff gate, Ranger motivation behavior, travel to the angry visitor, and ejection through the same interruption transition. Original costs, range and intervention rules remain unverified.
6. Expose interrupted outcomes in the roster/reports while keeping completed scorecards and tournament results distinct.

## Required regression cases

- Interrupt before the first shot, during a later hole, while queued behind a partner, during drink service and after a completed round; no phantom completion, duplicate fee, earned membership or unfinished-service reward.
- A partner and the next pair continue after interruption; an unreachable exit waits and resumes after the path is repaired.
- First-time interrupted visitors retain identity/history without creating a best score or completed-round count.
- Mid-anger and mid-ejection reload produce the same future state and exactly one interruption record.
- Multiple Marshalls cannot eject/count the same visitor twice. Paid/completed visitors retain their genuine scorecards.
- Old resorts migrate; malformed records, wrong visitor IDs and invalid scorecard prefixes reject.
- Locked professional/tournament rounds do not enter visitor anger or staff ejection behavior.

This document is a dependency audit, not an implemented anger/ejection feature or original-game parity claim.


## Protocol 51 implementation update

Separate records, validated itinerary prefixes, interruption transition, reservation/pair release, waiting exit routing, visitor interruption counts and roster reporting are implemented. Return timing provisionally uses the existing unhappy delay; completed fees are retained without adding a refund. Anger and Marshall gameplay triggers, their exact original policies and broader original-runtime comparison remain unfinished.


Protocol 52 adds an actual anger trigger, saved local walking and nearby negative reactions, ending through the interrupted-visit transition. Triggering requires zero happiness plus legacy mood <=20; anger lasts 20 simulation seconds, affects golfers within six world units once per source round, and visits reachable offsets around its starting point without shot RNG. These are explicit provisional implementation choices; the manual does not establish them. The original angry animation, recovery policy and Marshall intervention remain unverified/unimplemented as appropriate.


Protocol 53 connects Marshall intervention to the interruption transition. Printed p.21 of the manual establishes Ranger-like pacing plus ejection of angry golfers. Current Marshalls search within Ranger coverage, reserve a target, walk/replan toward it, and eject within 1.8 world units; another Marshall cannot claim the same target. These distances, one-second replanning, costs and wages are provisional. Hiring/promotion is available at six complete holes; original-version comparison remains necessary.
