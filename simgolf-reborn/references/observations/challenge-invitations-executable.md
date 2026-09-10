# Original pro-challenge invitation ladder — 10 September 2026

Read-only x86 disassembly of the supplied golf.exe, SHA-256 `82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf`. Addresses below are image virtual addresses. No original runtime was executed.

## Advertised stakes and progression

The invitation text at 0x4c5abc names a famous golfer; 0x4c5a80 introduces the wager, 0x4c5a70 separates the per-hole and match amounts, and 0x4c5a5c ends the match amount.

The persistent counter at 0x59a180 initializes to zero: EBP is zeroed at 0x441a35 and stored at 0x441b27. It is serialized at 0x40aeae. It is a challenge ladder counter, **not a world-property index**.

At 0x40fc85 the counter loads into EBP. At 0x40fd5b the per-hole text calculation performs `5*(counter+1)`, multiplies by 5 twice, then shifts left 4. The integer sent to the decimal conversion function at 0x40fd70 is therefore `2000*(counter+1)`. The second amount reloads the counter at 0x40fdbd and performs the same calculation with a shift of 5 at 0x40fde0: `4000*(counter+1)`. These are displayed Simoleons, not the internal cash unit.

Acceptance sets the challenge flag and chosen opponent at 0x410023–0x41004f, then increments the counter at 0x410054–0x410066. The match-result losing branch decrements it at 0x427639–0x427642; the tied-result branch decrements it at 0x427657–0x427663. Thus a successful result retains the increment; loss/tie restores the preceding level. Do not increment on merely displaying an offer.

## Opponent selection and eligibility still to integrate

0x40fc3c draws a candidate index from 100 via the original RNG. Its record has stride 56; the code sums twelve bytes from record offset 0x25 and subtracts 20. Invalid records (offset 0x20 == 0xff) retry. A valid candidate is accepted when that score lies within `5*counter ± floor(attemptCount/4)`. The attempt count includes invalid-record draws, but the invalid-record branch bypasses range checking. The existing parsed ten-skill roster does not yet establish the meanings of all twelve bytes, so it cannot safely replace these records.

Earlier admission checks include global flags, a counter greater than 0x2000 and a nonzero indexed course byte. Their domain meanings/cadence have not yet been traced sufficiently to implement original invitation timing.

## Settlement caution

0x426fab–0x426fe3 sums per-hole score bytes, supporting total-stroke comparison for the whole match. Per-hole winner/loser branches compare the current score byte at 0x427027 and 0x42727c; equal values bypass both payments.

The end-of-match cash branch at 0x42750d–0x427538 computes `2000*acceptedCounter / 100`, and 0x4276c1 credits that internal value on the winning branch. This appears different from the advertised match amount above. Its relationship to any additional settlement must be traced before changing the current exhibition's explicit agreed-stake accounting. Do not silently equate invitation text with verified payout behavior.

## Live use

`originalChallengeOfferStakes` now supplies the exhibition's initial amounts (§2,000/§4,000), replacing arbitrary §100/§500 defaults. Explicit custom stakes and existing saved exhibitions remain intact. This does not implement invitations, eligibility, resort money settlement or persistent career advancement; those remain required follow-through, using the evidence above.
