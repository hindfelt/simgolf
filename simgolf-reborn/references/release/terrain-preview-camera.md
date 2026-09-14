# New-game property inspection

The actual in-game terrain preview now supports 45-degree camera rotation, bounded zoom (0.75–2×), and resetting the view. Controls use the green/gold interface, accessible button names and visible keyboard focus. They operate entirely inside the isolated preview document: terrain settings and the active course are not edited.

Validation: Chrome browser test renders the preview, confirms rotation and zoom change the canvas, verifies reset returns the same rendered view, checks zoom limits and controls at 320px width. Production build passes. Desktop preview visually reviewed. This improves property inspection; it does not close regional architecture or original-engine fidelity work.
