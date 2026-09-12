# Supplied executable baseline — 5 September 2026

Read-only inspection found two copies of the same binary:

- `resources/sim golf/Sid Meier's SimGolf/golf.exe`
- `resources/Sid Meier's SimGolf_RIP/golf.exe`

Both are **974,848 bytes** and have SHA-256:

`82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf`

The host `file` utility identifies the binary as a **PE32 Windows GUI executable, Intel 80386**. A scan for the standard `VS_FIXEDFILEINFO` signature found no readable fixed-version block. This does not identify a retail patch version, establish an unmodified installation, or demonstrate successful execution. The installation readme's “version 1.0” is documentation metadata, not proof of the executable version.

Neither `wine` nor `wine64` is available on this host's PATH. The binary was **not executed**. Original-game runtime observation, reference configuration, measured prices/timing and full parity verification remain open. Construction work can continue from the supplied manual/screenshots/resource descriptions without pretending those observations have happened.

The original `Interface/parkland.txt` was read directly for terrain intent: fairway releases the ball; firm fairway releases it farther; poor lies constrain recovery; green has a tricky variant; sand/tree variants use Tab. Those qualitative descriptions do not establish numerical multipliers. Construction behavior in the browser remains subject to original-runtime comparison.
