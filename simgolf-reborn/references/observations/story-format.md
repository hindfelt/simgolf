# Supplied SimStory text format

Inspected the ten TXT scripts in resources/sim golf/Sid Meier's SimGolf/Themes/Standard. The generated scene/src/stories/standard.json preserves each source filename stem, raw eight-character pairing prefix, title, optional credit lines, ordered dialogue blocks and source SHA-256. Source bytes decode as Windows-1252; CRLF and blank-line separators are normalized.

The first nonempty line is the title. Some files include author credit lines before the first blank separator (MaleBonding, Spies and Goldfish). Each later nonempty block contains a prompt followed by ordered reply alternatives. Opening Day has four blocks with 2, 5, 4 and 6 replies. PARTNER is a literal token for the interlocutor's name.

This describes observed file structure, not confirmed engine behavior. Reply order appears to run from supportive to less supportive in inspected examples, but exact mood thresholds and advancement rules are unverified. Do not infer complete gender/age/personality matching rules from a few filename prefixes. The current visitor model lacks the full original persistent relationship system.

Implementation: script.js parses and validates the structure; scripts/import-stories.mjs reproduces the ten-story catalog from the supplied files. Tests parse every Standard script, preserve prompt/reply order, and verify literal partner substitution without replacement-string interpretation. The catalog is not yet connected to live golfer dialogue, membership, love benches or happy-ending rewards.

## Author explanation resolves chapter semantics
Sid Meier's second TheSims.com chat is preserved at https://www.ladydragon.com/2sidmeierssimgolfchat2.html . His explanation identifies column-zero lines as chapter starts and the first indented response as positive. Negative replies retry the current chapter later; positive replies advance. The example reaches a happy ending after four chapters. The transcript also describes a commemorative scenic element and increased likelihood of membership after success. It predates release, so its stated limit of three negative replies cannot override the larger reply lists in the supplied retail scripts.

Correction: blank lines are optional separators, not chapter boundaries. The parser now follows indentation and retains the retail reply lists. A pure progression function implements positive advancement and negative retries; the live relationship adapter still needs matching, timing, mood decisions, persistent state and rewards. Filename code mapping remains unresolved. Exa was unavailable in the configured agent-reach installation; built-in web search located the transcript.
