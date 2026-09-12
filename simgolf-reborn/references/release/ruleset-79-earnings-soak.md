# Ruleset 79 ten-minute earnings integration

On 2026-09-12, `npm --prefix simgolf-reborn/scene run test:earnings-soak` passed the full two-account Chrome/local Worker/D1 earnings event in 10.2 minutes. This uses wall-clock time and browser construction, not accelerated server time or client-submitted scores.

| Final measure | First course | Second course |
| --- | ---: | ---: |
| Simulation ticks | 12,000 | 12,000 |
| Completed visitor holes | 31 | 31 |
| Cash | $43,120 | $35,900 |
| Net cash change | −$6,880 | −$14,100 |
| Net green fees | −$6,400 | −$13,700 |

Both entrants qualified based on earlier positive green-fee payments despite later negative fees. Final server results matched course cash and completed-hole totals. Both courses stopped at the deadline, became read-only, and a reload preserved the final cash. The two accounts began with identical land and $50,000 and spent independently. No browser JavaScript errors were reported. Phone final-results capture: `/tmp/simgolfer-earnings-full-results-phone.png` (ephemeral local artifact).

This verifies local earnings integration under signed fees. It does not establish production hosting capacity, provider activation, long multi-hour stability or original-game balance. These intentionally minimal, unmaintained courses deteriorated into negative fees: live starting happiness and incident selection/deduplication remain provisional. The signed clamp/fee rule alone does not complete original happiness fidelity. No deployment occurred.
