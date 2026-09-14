# Putting controls — 9 September 2026

The supplied interface descriptions in `resources/sim golf/Sid Meier's SimGolf/Interface/{parkland,links,desert,tropical}.txt` confirm that Tab selects a tricky-green variant. They do not establish its speed, slope, cost or putting accuracy modifiers. Those remain unresolved.

SimuLord's [strategy guide, chapter 17](https://gamefaqs.gamespot.com/pc/480860-sid-meiers-simgolf/faqs/16147) describes putting as controlled by golfer skill and AI, and tournament fast greens as favoring the Accurate Putter skill. This is a contemporary secondary description, retrieved through search indexing on 9 September 2026; direct GameFAQs/Jina retrieval was blocked, and the configured Exa backend was unavailable. It is not a retail runtime observation.

The browser simulation already auto-putts from the golfer's own green within 12 world units of the cup. The UI now uses the same eligibility helper, hides manual airborne aiming and disables shot-shape buttons during putting. Course clicks during that phase do not submit a shot command. The existing timing, threshold, accuracy and simulation rules have not changed.

Tests cover unattended completion, mid-lineup save resumption, waiting for manual shots off the green, and browser controls/aiming/click behavior. The original range threshold, tricky-green mechanics, putt physics and tournament fast-green settings still need verification.
