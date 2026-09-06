# Player guide

## What is the game about?

You are both a golf course designer and a club manager. Turn a property into an enjoyable course, welcome golfers and use their fees to develop the club. You can also play the holes you build as the club professional.

This is a creative management game: the appeal is watching a design become a working place. Golfers walk between holes, take shots, react to their experience and use connected facilities. A course needs more than a tee and a flag: sensible routes, playable terrain, maintenance and amenities all help.

Version 1.0.0 is a playable preview. There is no completed campaign victory condition yet, and some rules and prices are provisional.

## Your first course

1. Open the game. The default property has a clubhouse and starting scenery but no completed holes.
2. Select **Build**. Choose **Tee** and place it on clear ground near the clubhouse approach.
3. Choose **Green** and place it farther away. Leave enough space for a golf hole; the opening check reports invalid distances.
4. Paint **Fairway** between them. For a first hole, keep the route simple and avoid a large water crossing.
5. Use **Path** to connect the clubhouse approach to the tee area. Paths should end beside playing surfaces, with space for golfers to walk onto the tee.
6. Select **Open hole**, or press **H**. If opening fails, read the message and repair the missing access or layout.
7. Let time run. The first golfers arrive and play. They pay after completing a hole.
8. Open **Scorecards** and **Reports** to review results. Improve the course before adding more holes.

A short, accessible first hole is easier to learn from than an elaborate layout. Keep money available for staff and improvements.

## Design and edit

| Tool or control | Use |
| --- | --- |
| Tee / Rotate tee | Place the start and choose its direction |
| Green / Move cup / Trim green | Shape a connected putting surface, move the flag or remove edge turf |
| Fairway / Firm fairway | Create playing routes with different ball response |
| Bunkers, rough, trees and rocks | Add hazards and strategic choices |
| Raise land / Lower land | Change terrain elevation |
| Water | Paint editable water areas |
| Path / Bridge | Connect the club and create water crossings |
| Out of bounds / Clear stakes | Mark or remove out-of-bounds areas |
| Building direction | Rotate a facility before placing it |
| Remove | Demolish a selected feature after confirmation |

Use the brush-size selector for larger painted areas. Invalid placements do not spend money. Terrain edges retain rounded corners and green collars.

Close a hole before major changes. Existing booked rounds may still need to finish before protected tees, greens or routes can be edited. Closing prevents new bookings; it does not immediately remove golfers already playing.

Use **Add hole** for the next layout, up to 18 holes. The hole selector determines which hole you are editing. **Edit holes** manages the order; golfers already on a round retain their booked route.

## Run the club

Golfers' reactions and scorecards reveal how the course performs. Fees are calculated by the simulation rather than entered as arbitrary score submissions. Some facilities improve the experience or economy when connected to the clubhouse path.

- **Staff:** hire, select, rename, reposition, upgrade or dismiss employees. Groundskeepers handle weeds; more advanced staff become available as the course grows. Staff cost money over time.
- **Amenities:** benches, refreshments, training facilities and other resort buildings have different purposes. Follow each tool's placement hint and check path access.
- **Dandelions and turf:** maintenance is part of running the course. Neglected turf can accumulate wear and crabgrass.
- **Golfers:** use the membership roster to inspect persistent visitors, rename them and manage available pairing or membership options.
- **Homes:** place a Building Lot and connect it to the clubhouse path. Eligible golfers who have completed a round can buy it; it becomes a home and produces a recorded sale. Reports → **Homes and building lots** shows buyers, estimates and receipts.

A connected Marina, Helipad or Links Church currently gives a non-stacking home-sale bonus. A connected Airstrip increases hole fees. These benefits are implemented with provisional amounts; celebrity residency is not yet implemented.

## Land, settings and larger facilities

**Buy land** opens the purchase dialog showing the next parcel's price. Current expansion adds adjoining land to the south, in three purchases. It does not yet reproduce the original game's land-unlock progression.

To begin a different property, open **Club menu → Start a new course**. Choose an environment, landscape and terrain seed. The preview shows the proposed terrain; **New terrain** changes the seed. Starting replaces your current course, with a previous-course backup retained in that browser. Export a save first if you want a separate durable copy.

Available landscape choices include the original study, rolling terrain, a river valley and a coastal course. Environments change ground colors and regional recreation choices; full regional vegetation and architecture remain unfinished.

A **Marina** needs its building on dry land and docks over water. Rotate it to match the shore. A **Helipad** uses a compact 5×5 site, while the **Airstrip** needs a long 31×7 site. Grade transport sites before building if the ground is too uneven.

## Play your holes

1. Select **Play**.
2. Open **Pro skills** to allocate available skill points before the round.
3. Select **Play a practice hole** to start your professional's practice round.
4. When the golfer is ready to address the ball, choose a shot technique and point at the intended target. Click or tap to play the shot.
5. Watch the ball's flight, bounce and roll. Wait until the golfer is ready before taking the next shot.

Available techniques include straight, draw, fade, backspin and punch. Terrain and hazards affect the result. The aiming line is a preview, not a guaranteed outcome. Out-of-bounds and water have consequences.

From the Club menu, **Local championship** and **Pro challenge exhibition** start local events with simulated opposition. Use the event's standings and resume controls. These are not live online matches; exhibition results do not add winnings to your resort balance.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Place or select | Click | Tap |
| Paint terrain | Drag with a paint tool | Drag with a paint tool |
| Pan | Drag in Inspect / pan, or right-drag | Two-finger pan |
| Zoom | Mouse wheel | Pinch |
| Pause | Pause button or Space | Pause button |
| Open/close selected hole | Button or H | Button |

Use visible buttons on a phone. Some editing dialogs are easier on a larger screen.

## Save, share and move between devices

The game autosaves in the current browser. **Club menu → Save now** saves immediately.

| File/action | What it is for |
| --- | --- |
| Export save / Import save | Back up or transfer the resort and its progress |
| Export course layout | Share the course geometry without your money, staff or visitor history |
| Practise an exported course | Play a shared layout in isolated practice |
| Import championship / Resume championship | Continue a saved local event |

There is no automatic cloud synchronization. A phone and a computer have separate saves, even on the same website. A different hostname or port is also a different browser storage location. Export before changing devices, clearing browser data or moving to another hosting address. Older preview files may not be compatible with every later ruleset.

## If something does not work

- **No golfers:** check that the hole is open, the game is unpaused and there is clubhouse access. Arrivals also wait for the opening group to clear the tee.
- **Cannot build or remove:** read the tool message. Check funds, ownership, terrain, overlaps and booked golfers.
- **Facility does nothing:** check its connection to the clubhouse path and its specific purpose. A placed building is not automatically connected.
- **Course looks empty on another device:** import an exported save. Browser saves do not synchronize.
- **Downloaded ZIP does not start:** serve its contents through an HTTP(S) web server. Double-clicking `index.html` as a local file is not supported.

See the [release notes](RELEASE_NOTES.md) for limitations and the [backlog](backlog.md) for unfinished systems.
