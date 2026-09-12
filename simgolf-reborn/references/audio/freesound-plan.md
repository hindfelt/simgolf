# Fairway Baron gameplay sound direction

The owner approved Freesound as a source for gameplay sounds on 2026-09-12: golf-ball impacts, golfer muttering, cheers, helicopter landings, and related resort ambience. Keep the supplied Pristine Fairway and Sunday Terrace tracks in the opening/menu flow.

## Candidate recordings

These are researched candidates, not downloaded, auditioned, or integrated assets. Verify the license again when importing, record the exact asset and any edits, and include required credits in the shipped game.

| Event | Candidate | License shown on source | Review needed |
| --- | --- | --- | --- |
| Club strikes ball | [golf-ball-hit-3 — CosmicEmbers](https://freesound.org/people/CosmicEmbers/sounds/160761/) | CC BY 3.0 | Audition the 0.847-second recording; credit Cosmic Embers and link the source/license. Find softer putting and distinct bunker variants. |
| Applause | [University Indoor crowd, auditorium, applause 7 — FOSSarts](https://freesound.org/people/FOSSarts/sounds/750561/) | CC0 | Audition for indoor reverberation; prefer a restrained outdoor golf crowd if this sounds like an auditorium. |
| Helicopter approach/landing | [Helicopter landing.wav — inchadney](https://freesound.org/people/inchadney/sounds/56636/) | CC BY 4.0 | Audition the 3:13 field recording; extract suitable rotor phases and record edits. Credit the creator and source/license. |

Original-file download links on these pages request Freesound login. No account was created or credentials requested during research.

## Integration requirements

- Use actual shot contact, cup completion, golfer reaction, and transport state transitions. Do not run disconnected random sound effects.
- Rotor sound follows approach, landing, spin-down, boarding, takeoff, and departure. Parked helicopter stays quiet while its guests play. Enforce the existing single-helicopter limit.
- Quiet, occasional nonverbal golfer reactions; avoid intelligible unrelated dialogue. Applause should match a worthwhile shot or tournament result.
- Distance attenuation and stereo positioning follow the camera. Limit simultaneous voices and repeated reactions so a busy course remains pleasant.
- Separate effects and ambience controls from menu music. Remember preferences, handle browser playback restrictions, and silence hidden pages.
- Keep audio timing independent of simulation speed and deterministic game RNG. Loading a save or reconnecting must not replay historical effects.
- Still source and audition muttering, putting/cup, water splash, boat engine, birds, wind and coastal ambience. Favor CC0 or CC BY; exclude noncommercial-only recordings from the shipping selection.

## Status

Source preference and shortlist recorded. Playback integration and listening review remain pending; no gameplay sounds have been added by this research change.

## First playback integration — 12 September 2026

The licensed Cosmic Embers golf impact is now imported from the public HQ MP3 preview and used for new full-shot contacts. Provenance, hash and licence are in `scene/public/audio/effects/README.md`; shipped credits are linked beside Effects volume in the club menu. The camera supplies stereo position/attenuation, voices are capped at four, and effects are independent of music and simulation speed. Restored active shots, reconnect gaps, putts, hidden tabs and paused/modal gameplay do not trigger contact audio. Muting stops existing voices. Audio-context permission or loading failures do not interrupt the game. Page-cache restoration retains the sound controller.

Browser verification exercises actual MP3 decoding, gesture unlock, once-only playback and stored muting. Shot observation has no simulation or RNG side effects. The remaining recordings and subjective listening review are still pending; no helicopter, applause or ambience asset is shipped by this change.

Verification result: 16 audio/menu/playable checks passed, followed by the added live-golfer contact check; production build passed. This does not complete the wider soundscape or listening review.
