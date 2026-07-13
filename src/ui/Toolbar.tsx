import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useUI } from './store';
import { setTool, startRound } from '../game/engine';
import { ensureAudio } from '../game/audio';
import { TINFO, HOLE_COST, ELEV_COST, LAND_COST, themedTerrainName } from '../game/constants';
import { Tile, type ToolId } from '../game/types';
import Icon, { type IconName } from './Icon';

interface ToolDef {
  id: ToolId;
  nm: string;
  ct?: string;
  tip?: string;
  icon: IconName;
  bg?: string;
  side?: string;
  art?: 'tile' | 'slab';
  gold?: boolean;
  tile?: Tile;
}

type GroupId = 'course' | 'terrain' | 'resort' | 'play';

const grass = `linear-gradient(180deg, ${TINFO[Tile.ROUGH].c1}, ${TINFO[Tile.ROUGH].c2})`;
const $ = (n: number) => '$' + n.toLocaleString('en-US');
const pathwayCost = `${$(TINFO[Tile.PATH].cost)} land · ${$(TINFO[Tile.BRIDGE_WATER].cost)} water · ${$(TINFO[Tile.BRIDGE_STREAM].cost)} stream`;

const TOOLS: ToolDef[] = [
  { id: 'pan', nm: 'Pan', icon: 'pan', bg: 'linear-gradient(145deg,#e7e8f5,#a8abd2)', side: '#555b9b', art: 'slab' },
  { id: 'hole', nm: 'New hole', ct: $(HOLE_COST), icon: 'hole', bg: 'linear-gradient(145deg,#f4dc2b,#c8a80c)', side: '#8c7423' },
  { id: 'fair', nm: 'Fairway', tile: Tile.FAIR, ct: $(TINFO[Tile.FAIR].cost), icon: 'fair', bg: `repeating-linear-gradient(90deg, ${TINFO[Tile.FAIR].c1} 0 7px, ${TINFO[Tile.FAIR].c2} 7px 14px)` },
  { id: 'firmfair', nm: 'Firm Fairway', tile: Tile.FIRM_FAIR, ct: $(TINFO[Tile.FIRM_FAIR].cost), icon: 'firmFair', bg: `linear-gradient(180deg,${TINFO[Tile.FIRM_FAIR].c1},${TINFO[Tile.FIRM_FAIR].c2})` },
  { id: 'deeprough', nm: 'Deep Rough', tile: Tile.DEEP_ROUGH, ct: $(TINFO[Tile.DEEP_ROUGH].cost), icon: 'deepRough', bg: `linear-gradient(180deg,${TINFO[Tile.DEEP_ROUGH].c1},${TINFO[Tile.DEEP_ROUGH].c2})` },
  { id: 'green', nm: 'Green', tile: Tile.GREEN, ct: $(TINFO[Tile.GREEN].cost), icon: 'green', bg: `linear-gradient(180deg,${TINFO[Tile.GREEN].c1},${TINFO[Tile.GREEN].c2})` },
  { id: 'sand', nm: 'Sand', tile: Tile.SAND, ct: $(TINFO[Tile.SAND].cost), icon: 'sand', bg: `linear-gradient(180deg,#f4e4b4,${TINFO[Tile.SAND].c2})` },
  { id: 'waste', nm: 'Waste Bunker', tile: Tile.WASTE_BUNKER, ct: $(TINFO[Tile.WASTE_BUNKER].cost), icon: 'waste', bg: `linear-gradient(180deg,${TINFO[Tile.WASTE_BUNKER].c1},${TINFO[Tile.WASTE_BUNKER].c2})` },
  { id: 'pot', nm: 'Pot Bunker', tile: Tile.POT_BUNKER, ct: $(TINFO[Tile.POT_BUNKER].cost), icon: 'pot', bg: `linear-gradient(180deg,${TINFO[Tile.POT_BUNKER].c1},${TINFO[Tile.POT_BUNKER].c2})` },
  { id: 'stream', nm: 'Stream', tile: Tile.STREAM, ct: $(TINFO[Tile.STREAM].cost), icon: 'stream', bg: `linear-gradient(180deg,${TINFO[Tile.STREAM].c1},${TINFO[Tile.STREAM].c2})` },
  { id: 'brush', nm: 'Brush', tile: Tile.BRUSH, ct: $(TINFO[Tile.BRUSH].cost), icon: 'brush', bg: `linear-gradient(180deg,${TINFO[Tile.BRUSH].c1},${TINFO[Tile.BRUSH].c2})` },
  { id: 'rocks', nm: 'Rocks', tile: Tile.ROCK, ct: $(TINFO[Tile.ROCK].cost), icon: 'rocks', bg: `linear-gradient(180deg,${TINFO[Tile.ROCK].c1},${TINFO[Tile.ROCK].c2})` },
  { id: 'water', nm: 'Water', ct: $(TINFO[Tile.WATER].cost), icon: 'water', bg: `linear-gradient(180deg,#5a9cd8,${TINFO[Tile.WATER].c2})` },
  { id: 'tree', nm: 'Trees', ct: $(TINFO[Tile.TREE].cost), icon: 'tree', bg: grass },
  { id: 'flower', nm: 'Flowers', ct: $(TINFO[Tile.FLOWER].cost), icon: 'flower', bg: grass },
  { id: 'path', nm: 'Pathway', ct: `${$(TINFO[Tile.PATH].cost)} / ${$(Math.min(TINFO[Tile.BRIDGE_WATER].cost, TINFO[Tile.BRIDGE_STREAM].cost))}+`, tip: pathwayCost, icon: 'path', bg: `linear-gradient(180deg,#d9bb8d,${TINFO[Tile.PATH].c2})` },
  { id: 'raise', nm: 'Raise', ct: $(ELEV_COST) + '+ / step', icon: 'raise', bg: grass },
  { id: 'lower', nm: 'Lower', ct: $(ELEV_COST) + '+ / step', icon: 'lower', bg: grass },
  { id: 'dozer', nm: 'Bulldoze', ct: '$10', icon: 'dozer', bg: 'linear-gradient(180deg,#c2a06a,#a5804f)' },
  { id: 'land', nm: 'Buy land', ct: $(LAND_COST), icon: 'land', bg: 'linear-gradient(180deg,#b8c58f,#7f9f69)' },
  { id: 'build', nm: 'Facilities', ct: 'catalog', icon: 'build', bg: 'linear-gradient(180deg,#d7c8ae,#a99782)' },
  { id: 'play', nm: 'Tee off', ct: 'play round', icon: 'play', bg: 'linear-gradient(180deg,#ffe9a3,#e9b53c)', gold: true },
];

function ToolGraphic({ item, active }: { item: ToolDef; active: boolean }) {
  const style = {
    '--tool-surface': item.bg ?? 'linear-gradient(145deg,#cfcef2,#8d91cb)',
    '--tool-side': item.side ?? '#4d559a',
  } as CSSProperties;

  return (
    <span className={'toolGraphic art-' + (item.art ?? 'tile')} style={style} aria-hidden="true">
      {active && <span className="toolGraphicRing" />}
      <span className="toolGraphicLeft" />
      <span className="toolGraphicRight" />
      <span className="toolGraphicTop" />
      <Icon name={item.icon} size={24} className="toolGraphicIcon" />
    </span>
  );
}

const GROUPS: { id: GroupId; label: string; icon: IconName; tools: ToolId[] }[] = [
  { id: 'course', label: 'Course', icon: 'terrain', tools: ['pan', 'hole', 'fair', 'green'] },
  { id: 'terrain', label: 'Terrain', icon: 'course', tools: ['firmfair', 'deeprough', 'sand', 'waste', 'pot', 'water', 'stream', 'brush', 'rocks', 'tree', 'flower', 'path', 'raise', 'lower', 'dozer', 'land'] },
  { id: 'resort', label: 'Resort', icon: 'resort', tools: [] },
  { id: 'play', label: 'Play', icon: 'play', tools: ['play'] },
];

function groupForTool(tool: ToolId): GroupId {
  if (tool === 'build') return 'resort';
  return GROUPS.find((group) => group.tools.includes(tool))?.id ?? 'course';
}

export default function Toolbar() {
  const tool = useUI((s) => s.tool);
  const mode = useUI((s) => s.mode);
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
    <nav className="toolDock" data-group={group} data-ui="construction-dock" aria-label="Course construction tools">
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
            onClick={() => {
              setGroup(item.id);
              if (item.id === 'resort') setStore({ buildPanel: !(group === 'resort' && buildPanel), staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false });
              else setStore({ buildPanel: false });
            }}
          >
            <Icon name={item.icon} size={16} />
            <span className="toolGroupLabel">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="toolbar" role="tabpanel">
        {group === 'resort' && visible.length === 0 && (
          <button
            type="button"
            className="dockPrompt"
            aria-label={buildPanel ? 'Facility catalog is open' : 'Open the facility catalog'}
            onClick={() => setStore({ buildPanel: !buildPanel })}
          >
            <Icon name="resort" size={19} />
            <span><b>{buildPanel ? 'Facility tray open' : tool === 'build' ? 'Facility selected' : 'Open facility tray'}</b><small>{tool === 'build' && !buildPanel ? hint : 'Choose a building, then place it directly on the course.'}</small></span>
          </button>
        )}
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
              data-tool={item.id}
              className={'tool' + (item.gold ? ' goldTool' : '') + (active ? ' active' : '')}
              onClick={(event) => {
                event.stopPropagation();
                ensureAudio();
                if (item.id === 'play') {
                  setStore({ buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false });
                  startRound();
                }
                else if (item.id === 'build') setStore({ buildPanel: !buildPanel, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false });
                else {
                  setStore({ buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false });
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
