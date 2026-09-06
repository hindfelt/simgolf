# Graphics approval

| Sample | Direction | Owner approval |
|---|---|---|
| [A](samples/a-faithful-concept.png) | Detailed original-style isometric scene with lavender interface | Not selected |
| [B, final revision](samples/b-dimensional-concept.png) | Dimensional materials and lighting with the lavender UI reference | **Approved, 5 September 2026** |
| [Live browser scene](../scene/) | Actual WebGL implementation with pan/zoom, picking and animation | **Accepted after tile-based refinements; gameplay continuation authorized** |

The owner identified B and said **“I LOVE IT!”**, then authorized the real browser art test with **“go”**. This approves B as the art target. It does not constitute approval of a subsequently produced render or of the full game's completion.

The concept images were generated using the built-in image tool. They are not executable renders or 3D models. Their [prompts](prompts.md) remain preserved. Use the [concept comparison page](../concepts.html) for A/B inspection and original references.

The actual art test uses independently authored Three.js geometry, procedural canvas materials and animation. It does not use the concept as a scene background. The generated image is loaded only for the comparison overlay.

See [art-test review notes](art-test.md) and the [actual browser screenshot](samples/browser-overview.png). The large clubhouse represents a developed resort, rather than the game's starting building. Golf and groundskeeping animations demonstrate appearance; gameplay rules remain governed by the specification and later milestones.

**Continuation:** the owner accepted the refined scene and said “Good. Continue”. The [first playable hole](../playable.md) now uses editable tiles and live golfer/maintenance state. Its [desktop](samples/playable-overview.png) and [phone](samples/playable-phone.png) captures are separate from the preserved art study.

**Style refinement:** the owner subsequently requested original-game tile-based course shapes and explicitly rejected photorealism as the target. Preserve B's dimensional presentation while prioritizing the supplied game's straight fairway edges, stepped outlines and stylized scenery. The second review corrections are recorded in [art-test notes](art-test.md).

**Rounded edges and green collars:** the owner supplied a further original-game close-up and requested rounded corners and a green border. Editable terrain now rounds the exposed perimeter of connected tile regions and adds a continuous dark-green collar around fairways, tees, greens, bunkers and painted water. Shared tile edges remain seamless; the underlying stepped construction grid is retained. Paths receive a smaller corner radius and a narrower edging.
