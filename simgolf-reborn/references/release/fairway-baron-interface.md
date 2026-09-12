# Fairway Baron interface update

The green-and-gold interface is now the default in local and production builds, rather than requiring `?ui=baron`. This activates the reviewed control grouping, golfer detail panel and consistent dialog/button/select styling. Production deployment is separate.

New-course setup uses a two-column desktop layout, responsive phone settings and reachable actions. The seed and environment generate the same game data used by Start new game. Its canvas relief preview shows elevations, water, paths and a simplified clubhouse, replacing the flat pixel map. This is a terrain overview, not a full rendering of all scene vegetation or buildings. Changing environment redraws the palette; changing landscape or seed regenerates the preview. Course creation and backup behavior remain unchanged.

Eight focused interface/music/golfer-detail tests and the production build passed. The final phone action-width adjustment passed the three control tests again. Desktop and phone screenshots were inspected. No deployment performed.
