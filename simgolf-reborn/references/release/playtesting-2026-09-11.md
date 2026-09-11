# Playtesting checkpoint — 11 September 2026

This checkpoint is a preview of the existing playable simulation. It is not the completed original-engine integration or the final 1.0 release.

## Using the testing simulation

Open the game with `?testing=1`, or choose **Club menu → Open playtesting copy**. On the first visit this copies the normal resort saved in that browser. Testing purchases, construction, championship records, practice saves and career settlement use separate browser storage. Later visits resume the testing copy.

Choose **Test & feedback → Start a prepared simulation → Start two-hole simulation** for a reproducible course with two open holes and a connected helipad. The first helicopter visit is brought forward for testing; subsequent visits use the normal rare schedule. Both passengers should complete both holes, return, board and leave. One landing charges $200. The prior testing course is backed up and can be restored through the new-course dialog. The normal resort remains unchanged.

The feedback panel exports a JSON file containing the comments, selected topic, viewport/browser details and current course or event save. Nothing is submitted automatically. Send the downloaded file with the feedback. **Return to normal resort** exits testing mode.

Useful checks: add and open a hole; buy land until funds are insufficient; inspect purchased boundaries; alter tree-covered terrain; remove trees; connect paths and bridges; play near white stakes, water and trees; inspect facility connection status; watch staff and dandelions; save and resume.

## Requested work sequence and remaining acceptance gates

1. **Testing simulation:** implemented with isolated saves, prepared two-hole/helicopter fixture, feedback export and phone-sized form. It uses the current preview rules.
2. **Original simulation integration:** remains incomplete. The recovered automatic planner has a worker/coordinator boundary and native comparison fixtures, but live `game.js` still uses the provisional shot planner. A verified mapping of live terrain, coordinates, golfer/social state, RNG and reaction effects is required before activating it. Worker fixture success is not live integration evidence.
3. **Career:** remains incomplete. Invited challenges and wager settlement exist; complete original SGA eligibility, tournament progression, ranking, accomplishment awards and retirement still require live integration and end-to-end proof.
4. **Resort:** remains incomplete. Staff/facility/membership/housing foundations exist. Original costs, unlocks, visitor rewards, richer stories and the complete progression loop still need completion and original comparison.
5. **Worlds and presentation:** remains incomplete. Seeded terrain and approved coastal elements exist. Complete regional properties, original acquisition/generation, desert environments, richer approved coastal composition and audio/presentation coverage remain open.
6. **Final stability assessment:** must follow completion of the above. The assessment below is a baseline for the testing checkpoint only.

## Stability baseline

- Five dedicated playtesting tests pass in desktop Chrome, including a 390×844 viewport.
- Tests verify normal-save isolation, feedback content, draft persistence, return navigation, prepared scenario startup, imported practice isolation, two-hole helicopter rounds, one landing receipt and departure after save/reload.
- Found and fixed: page-exit autosave overwrote a newly prepared testing course. Scenario switching now suppresses the outgoing save only after the replacement is successfully stored.
- Found and fixed: imported practice navigation dropped the testing flag. It now keeps both storage and navigation within testing mode.
- A headless simulation ran 7,260 simulated seconds with twelve intermediate restore cycles. It retained a 78,380-byte checkpoint, recorded 25 rounds and nine landing fees, and matched a separately restored continuation exactly. Runtime was approximately 3.6 seconds on this development machine. Reproduce from `scene` with `node scripts/stability-soak.mjs`. This measures simulation execution, not rendered frame rate.
- Production build passes. The renderer dependency bundle remains over Vite's 500 kB warning threshold.
- Initial complete suite: 884 passed, five failed. Three accomplishment failures came from old mean-only fixtures and pre-histogram award expectations. Fixtures now supply score distributions, account for par seeding and verify original weakest-skill tie handling. A real-visitor fixture still exercises earning an award and save/replay preservation. All three affected checks and the related migration check pass.
- The phone brush selector was initially outside the horizontal settings viewport; brush/direction controls now precede management actions. The phone palette regression passes.
- The two-hole browser round timed out during the initial suite and passed in isolation. The clean full rerun passed this test. The initial timeout remains evidence of sensitivity under contention; this is not a physical-device performance certification.
- Physical iPhone/Android performance, extended rendered sessions, concurrent-tab saves, browser suspension under memory pressure and complete original-game parity are not certified by these checks.

**Release assessment: not ready to call the complete 1.0 recreation finished.** The testing checkpoint is intended to collect reproducible feedback while the four feature areas above are completed.

## Final checkpoint regression result

892 tests passed; 0 failed, 0 skipped and 0 flaky results reported by Playwright. The complete rerun took 330.5 seconds in desktop Chrome. This includes the recovered-module comparison tests as well as preview gameplay/UI tests; it does not mean the recovered engine is used in live play.

## Hosted checkpoint

Published to https://simgolfer.0x4d.in/?testing=1 from source commit `9b2fbaa`. Cloudflare version `086d5dc4-7432-4771-b87e-d3ecff2b6acc`. A fresh Chrome context at 390×844 received HTTP 200, started the two-hole simulation, downloaded feedback and reported no page errors. This checks the hosted build without accessing the owner's browser save.
