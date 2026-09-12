# Fairway Baron interface update

The green-and-gold interface is now the default in local and production builds, rather than requiring `?ui=baron`. This activates the reviewed control grouping, golfer detail panel and consistent dialog/button/select styling. Production deployment is separate.

New-course setup uses a two-column desktop layout, responsive phone settings and reachable actions. The seed and environment generate the same game data used by Start new game. The preview now uses the actual Three.js game renderer, including the real clubhouse, regional vegetation, terrain, water and coast. A separate preview document isolates landscape globals and renderer resources from the active save. Changing environment, landscape or seed rebuilds that view. Course creation and backup behavior remain unchanged.

Eight focused interface/music/golfer-detail tests and the production build passed. The final phone action-width adjustment passed the three control tests again. Desktop and phone screenshots were inspected. No deployment performed.

The rejected simplified canvas illustration has been removed. Replacement verification: three desktop/phone control tests and production build; actual-renderer screenshots inspected. Local change only.
