# Competition and championship source check

Read supplied English manual spreads 13–14, printed pp.22–25. No original executable was run.

- Hosted tournaments become available only after an SGA invitation, based on sufficient fun and skill ratings. The manual does not give numeric eligibility thresholds, full entrant setup, tie resolution or prize tables here.
- Pro-challenges involve the resident pro and an issuing professional playing one round on the owner's course. Stakes are per hole; losers pay winners. Overall net winnings can be positive, negative or zero. Exact invitation cadence and stake schedules need observation.
- SGA requirements include course length, hole count, total play time, minimum fun, variety, scenic holes, skill-testing holes and facility count. Top 100/Top 18 recognition increases the relevant hole's fees.
- Championship play uses saved golfers and saved courses selected from the main menu. Save Golfer is accessed from Gary's customisation menu; Save Course for Championship from system functions.
- Over 20 professional accomplishments grant further skill points. The current ten-point profile limit does not implement these unlocks yet.

Implementation implication: portable golfer profiles are needed alongside existing course packages. Saving profiles is not itself a tournament, retirement or career-completion implementation. Tournament invitations must not be invented from a generic hole-count gate.

## Executable string follow-up
Read printable strings from the supplied golf.exe (same previously fingerprinted binary). The challenge invitation includes separate fragments for a wager “per hole and” an amount “for the match!”. This is direct evidence for two stake amounts, beyond the manual's per-hole description. Nearby strings refer to a famous golfer issuing the challenge and a match icon used to start it. Strings alone do not establish invitation timing, stake schedules, how an overall match winner is calculated, or tie carryover. Do not treat this extraction as runtime observation.

## Course accomplishment implementation (6 September)
The contemporary [BCampbell FAQ](https://gamefaqs.gamespot.com/pc/480860-sid-meiers-simgolf/faqs/15389), retrieved via search indexing, says each accomplishment gives three assignable points. [Archived fan tips](https://github-wiki-see.page/m/OpenSMSG/OpenSMSG/wiki/Original-SimGolf-Tips) identify first par-5, nine-hole and eighteen-hole milestones, but explicitly describe an incomplete list and report varying course-specific tasks. These are secondary observations, not original runtime verification.

The first implementation recognizes those three milestones from complete tee/green pairs during resort updates, once per resort. Closed complete holes count; eligibility timing and task ordering are provisional. Imported old resorts begin without invented historical awards and can qualify from their current layout. Shared locked-course practice earns no resort construction rewards. The original changing notes/trophy, other accomplishments, good-shot skill gains/losses, course transitions, tournament rewards and skills above 100% remain open. Current allocation retains the 100% manual ceiling and course-specific limits.

Design accomplishments now include first Challenge, Heroic, Strategic and Classic holes, also named in the archived tips and its contributor follow-up. They use the existing score-cohort classification rather than terrain labels or player-submitted ratings. Missing/ambiguous comparisons earn nothing. The classification's provisional thresholds/sample behavior and the unverified original task ordering carry through to these rewards; this does not establish SGA recognition. An actual seed-22 visitor round triggers Challenge in the current model, while controlled cohort fixtures cover all four combinations.
