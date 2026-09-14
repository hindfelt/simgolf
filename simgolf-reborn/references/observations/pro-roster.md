# Original professional roster

The supplied Themes/Standard/progolfers.dta has a descriptive header defining name, body, skin, hat/shirt/pants colors and maxima for the ten pro skills in their UI order. Imported 95 valid records with raw cap strings and source hash into scene/src/simulation/pro-roster.json. A–F skill characters are decoded as hexadecimal (consistent with the specialist A-coded rows); original runtime allocation from those caps remains unverified. These maxima are not awarded player skill points.

Some rows have a trailing number after their ten-character cap string. The header does not define it; sourceSuffix preserves it without treating it as a score, skill budget, ranking or eligibility threshold. Brad Fiction contains an extra empty comma field and is recorded in unparsedRows rather than repaired by assumption.

The importer is reproducible via scene/scripts/import-pro-roster.mjs. Strict row parsing rejects malformed or duplicate records; batch import records unresolved rows explicitly. The roster is not yet wired into tournament/challenge opponent selection or appearance models.

Story pairing research: the old Backswing utility page was unavailable during this check; no complete filename-code mapping was established. The remaining nine Standard stories stay disabled until their matching rules are defined. This is not a blocker for other original-game systems.

Exhibition integration: all 95 valid names are selectable in event setup. `roster-opponent.js` apportions the existing ten-point exhibition budget proportionally to each record’s cap fields, never exceeding a cap. This is an explicitly provisional allocation policy, not the original professional’s earned strength/ranking. The preview applies the course skill cap, and the selected name/profile is frozen by the existing competition save format. Original appearance fields, career allocations and invitation eligibility remain unimplemented.

Appearance follow-through: the original header explicitly defines eight clothing/body categories and four skin / ten hat / ten shirt / ten trouser codes. Named exhibition entrants now carry validated appearance metadata, cloned into each round and preserved in event recordings. The renderer interprets these codes using shorts, long sleeves, knickers/socks, tank tops/skirts and corresponding palette families. Hex colors and mesh proportions are approximations, not extracted sprite colors or exact original character art. Old events without appearance retain their previous generic model.
