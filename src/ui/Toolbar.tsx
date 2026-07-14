import { useEffect, useMemo, useState } from 'react';
import { useUI } from './store';
import { setTool, startRound } from '../game/engine';
import { ensureAudio } from '../game/audio';
import { TINFO, HOLE_COST, ELEV_COST, LAND_COST, themedTerrainName } from '../game/constants';
import { Tile, type ToolId } from '../game/types';
import Icon, { type IconName } from './Icon';
import ToolPreview from './ToolPreview';

interface ToolDef {
  id: ToolId;
  nm: string;
  ct?: string;
  tip?: string;
  gold?: boolean;
  tile?: Tile;
}

type GroupId = 'course' | 'terrain' | 'resort' | 'people' | 'play';

const $ = (n: number) => '$' + n.toLocaleString('en-US');
const pathwayCost = `${$(TINFO[Tile.PATH].cost)} land · ${$(TINFO[Tile.BRIDGE_WATER].cost)} water · ${$(TINFO[Tile.BRIDGE_STREAM].cost)} stream`;

const TOOLS: ToolDef[] = [
  { id: 'pan', nm: 'Pan' },
  { id: 'inspect', nm: 'Inspect golfers', ct: 'people mode', gold: true },
  { id: 'hole', nm: 'New hole', ct: $(HOLE_COST) },
  { id: 'fair', nm: 'Fairway', tile: Tile.FAIR, ct: $(TINFO[Tile.FAIR].cost) },
  { id: 'firmfair', nm: 'Firm Fairway', tile: Tile.FIRM_FAIR, ct: $(TINFO[Tile.FIRM_FAIR].cost) },
  { id: 'deeprough', nm: 'Deep Rough', tile: Tile.DEEP_ROUGH, ct: $(TINFO[Tile.DEEP_ROUGH].cost) },
  { id: 'green', nm: 'Green', tile: Tile.GREEN, ct: $(TINFO[Tile.GREEN].cost) },
  { id: 'sand', nm: 'Sand', tile: Tile.SAND, ct: $(TINFO[Tile.SAND].cost) },
  { id: 'waste', nm: 'Waste Bunker', tile: Tile.WASTE_BUNKER, ct: $(TINFO[Tile.WASTE_BUNKER].cost) },
  { id: 'pot', nm: 'Pot Bunker', tile: Tile.POT_BUNKER, ct: $(TINFO[Tile.POT_BUNKER].cost) },
  { id: 'stream', nm: 'Stream', tile: Tile.STREAM, ct: $(TINFO[Tile.STREAM].cost) },
  { id: 'brush', nm: 'Brush', tile: Tile.BRUSH, ct: $(TINFO[Tile.BRUSH].cost) },
  { id: 'rocks', nm: 'Rocks', tile: Tile.ROCK, ct: $(TINFO[Tile.ROCK].cost) },
  { id: 'water', nm: 'Water', ct: $(TINFO[Tile.WATER].cost) },
  { id: 'tree', nm: 'Trees', ct: $(TINFO[Tile.TREE].cost) },
  { id: 'flower', nm: 'Flowers', ct: $(TINFO[Tile.FLOWER].cost) },
  { id: 'path', nm: 'Pathway', ct: `${$(TINFO[Tile.PATH].cost)} / ${$(Math.min(TINFO[Tile.BRIDGE_WATER].cost, TINFO[Tile.BRIDGE_STREAM].cost))}+`, tip: pathwayCost },
  { id: 'raise', nm: 'Raise', ct: $(ELEV_COST) + '+ / step' },
  { id: 'lower', nm: 'Lower', ct: $(ELEV_COST) + '+ / step' },
  { id: 'dozer', nm: 'Bulldoze', ct: '$10' },
  { id: 'land', nm: 'Buy land', ct: $(LAND_COST) },
  { id: 'build', nm: 'Facilities', ct: 'catalog' },
  { id: 'play', nm: 'Tee off', ct: 'play round', gold: true },
];

function ToolGraphic({ item, active }: { item: ToolDef; active: boolean }) {
  return <ToolPreview tool={item.id} active={active} />;
}

const GROUPS: { id: GroupId; label: string; icon: IconName; tools: ToolId[] }[] = [
  { id: 'course', label: 'Course', icon: 'course', tools: ['pan', 'hole', 'green', 'fair', 'firmfair', 'deeprough', 'sand', 'waste', 'pot', 'stream', 'brush', 'rocks', 'water', 'tree', 'flower', 'path'] },
  { id: 'terrain', label: 'Terrain', icon: 'terrain', tools: ['raise', 'lower', 'dozer', 'land'] },
  { id: 'resort', label: 'Resort', icon: 'resort', tools: [] },
  { id: 'people', label: 'People', icon: 'regulars', tools: ['inspect'] },
  { id: 'play', label: 'Play', icon: 'play', tools: [] },
];

function groupForTool(tool: ToolId): GroupId {
  if (tool === 'build') return 'resort';
  if (tool === 'inspect') return 'people';
  return GROUPS.find((group) => group.tools.includes(tool))?.id ?? 'course';
}

export default function Toolbar() {
  const tool = useUI((s) => s.tool);
  const mode = useUI((s) => s.mode);
  const clubhouseMenu = useUI((s) => s.clubhouseMenu);
  const buildPanel = useUI((s) => s.buildPanel);
  const hint = useUI((s) => s.hint);
  const courseTheme = useUI((s) => s.courseTheme);
  const setStore = useUI((s) => s.set);
  const [group, setGroup] = useState<GroupId>(() => groupForTool(tool));

  useEffect(() => setGroup(groupForTool(tool)), [tool]);
  const visible = useMemo(() => {
    const ids = GROUPS.find((item) => item.id === group)?.tools ?? [];
    return ids.map((id) => TOOLS.find((toolDef) => toolDef.id === id)!).filter(Boolean);
  }, [group]);

  if (mode === 'play') return null;

  return (
    <nav className={'toolDock' + (buildPanel ? ' facilitySurfaceOpen' : '')} data-group={group} data-ui="construction-dock" aria-label="Course construction tools" aria-hidden={clubhouseMenu || undefined}>
      <div className="toolGroups" role="tablist" aria-label="Tool categories">
        {GROUPS.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={group === item.id}
            className={'toolGroup' + (group === item.id ? ' active' : '') + (item.id === 'course' && group === 'terrain' ? ' familyActive' : '')}
            data-group-id={item.id}
            title={item.label}
            key={item.id}
            disabled={clubhouseMenu}
            onClick={() => {
              if (item.id === 'play') {
                setStore({ buildPanel: false, clubhouseMenu: false });
                startRound();
                return;
              }
              setGroup(item.id);
              if (item.id === 'resort') {
                setTool('build');
                setStore({ buildPanel: !(group === 'resort' && buildPanel) });
              }
              else if (item.id === 'people') {
                setTool('inspect');
                setStore({ buildPanel: false, clubhouseMenu: false });
              }
              else {
                setStore({ buildPanel: false, clubhouseMenu: false });
                const groupTools = GROUPS.find((candidate) => candidate.id === item.id)!.tools;
                if (!groupTools.includes(tool)) setTool(item.id === 'terrain' ? 'raise' : 'pan');
              }
            }}
          >
            <Icon name={item.icon} size={16} />
            <span className="toolGroupLabel">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="toolbar" role="tabpanel">
        {group === 'resort' && !buildPanel && <p className="dockStatus"><b>Facility selected</b><span>{hint}</span><button type="button" disabled={clubhouseMenu} onClick={() => setStore({ buildPanel: true })}>Browse facilities</button></p>}
        {visible.map((item) => {
          const active = tool === item.id || (item.id === 'build' && buildPanel);
          const label = item.tile === undefined ? item.nm : themedTerrainName(item.tile, courseTheme);
          const detail = item.tip ?? item.ct;
          return (
            <button
              type="button"
              key={item.id}
              title={`${label}${detail ? ` · ${detail}` : ''}`}
              aria-label={`${label}${detail ? `, ${detail}` : ''}`}
              aria-pressed={active}
              disabled={clubhouseMenu}
              data-tool={item.id}
              className={'tool' + (item.gold ? ' goldTool' : '') + (active ? ' active' : '')}
              onClick={(event) => {
                event.stopPropagation();
                ensureAudio();
                if (item.id === 'play') {
                  setStore({ buildPanel: false, clubhouseMenu: false });
                  startRound();
                }
                else if (item.id === 'build') setStore({ buildPanel: !buildPanel });
                else {
                  setStore({ buildPanel: false, clubhouseMenu: false });
                  setTool(item.id);
                }
              }}
            >
              <ToolGraphic item={item} active={active} />
              <span className="nm">{label}</span>
              <span className="ct">{item.ct ?? '\u00a0'}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
