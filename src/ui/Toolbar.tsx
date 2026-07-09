import { useUI } from './store';
import { setTool, startRound } from '../game/engine';
import { ensureAudio } from '../game/audio';
import { TINFO, HOLE_COST, ELEV_COST, LAND_COST } from '../game/constants';
import { Tile, type ToolId } from '../game/types';

interface ToolDef {
  id: ToolId;
  nm: string;
  ct?: string;
  ic?: string; // emoji overlaid on the tile face
  bg?: string; // diamond face background
  orb?: boolean; // round button instead of a tile
  gold?: boolean;
}

const grass = `linear-gradient(180deg, ${TINFO[Tile.ROUGH].c1}, ${TINFO[Tile.ROUGH].c2})`;
const $ = (n: number) => '$' + n.toLocaleString('en-US');

const TOOLS: ToolDef[] = [
  { id: 'pan', nm: 'Pan', ic: '✋', bg: 'linear-gradient(180deg,#c9c6e0,#9a96bf)' },
  { id: 'hole', nm: 'New hole', ct: $(HOLE_COST), ic: '🚩', bg: grass },
  {
    id: 'fair',
    nm: 'Fairway',
    ct: $(TINFO[Tile.FAIR].cost),
    bg: `repeating-linear-gradient(90deg, ${TINFO[Tile.FAIR].c1} 0 7px, ${TINFO[Tile.FAIR].c2} 7px 14px)`,
  },
  { id: 'green', nm: 'Green', ct: $(TINFO[Tile.GREEN].cost), bg: `linear-gradient(180deg,${TINFO[Tile.GREEN].c1},${TINFO[Tile.GREEN].c2})` },
  { id: 'sand', nm: 'Sand', ct: $(TINFO[Tile.SAND].cost), bg: `linear-gradient(180deg,#f4e4b4,${TINFO[Tile.SAND].c2})` },
  { id: 'water', nm: 'Water', ct: $(TINFO[Tile.WATER].cost), bg: `linear-gradient(180deg,#5a9cd8,${TINFO[Tile.WATER].c2})` },
  { id: 'tree', nm: 'Trees', ct: $(TINFO[Tile.TREE].cost), ic: '🌲', bg: grass },
  { id: 'flower', nm: 'Flowers', ct: $(TINFO[Tile.FLOWER].cost), ic: '🌼', bg: grass },
  { id: 'path', nm: 'Pathway', ct: $(TINFO[Tile.PATH].cost), bg: `linear-gradient(180deg,#d9bb8d,${TINFO[Tile.PATH].c2})` },
  { id: 'raise', nm: 'Raise', ct: $(ELEV_COST) + '+', ic: '▲', bg: grass },
  { id: 'lower', nm: 'Lower', ct: $(ELEV_COST) + '+', ic: '▼', bg: grass },
  { id: 'dozer', nm: 'Bulldoze', ct: '$10', ic: '🚜', bg: 'linear-gradient(180deg,#c2a06a,#a5804f)' },
  { id: 'land', nm: 'Buy land', ct: $(LAND_COST), ic: '🗺️', orb: true },
  { id: 'build', nm: 'Facilities', ct: 'shop', ic: '🏠', orb: true },
  { id: 'play', nm: 'Tee off', ct: 'play!', ic: '⛳', orb: true, gold: true },
];

export default function Toolbar() {
  const tool = useUI((s) => s.tool);
  const mode = useUI((s) => s.mode);
  const buildPanel = useUI((s) => s.buildPanel);
  const setStore = useUI((s) => s.set);

  if (mode === 'play') return null;

  return (
    <div className="toolbar">
      {TOOLS.map((t) => {
        const active = tool === t.id || (t.id === 'build' && buildPanel);
        return (
          <div
            key={t.id}
            className={'tool' + (t.orb ? ' orbTool' : '') + (t.gold ? ' goldOrb' : '') + (active ? ' active' : '')}
            onPointerDown={(e) => {
              e.stopPropagation();
              ensureAudio();
              if (t.id === 'play') startRound();
              else if (t.id === 'build') setStore({ buildPanel: !buildPanel });
              else setTool(t.id);
            }}
          >
            {t.orb ? (
              <div className="diaWrap">
                <div className="orbFace">{t.ic}</div>
              </div>
            ) : (
              <div className="diaWrap">
                {active && <div className="dia ring" />}
                <div className="dia side" />
                <div className="dia top" style={{ background: t.bg }} />
                {t.ic && <div className="diaIc">{t.ic}</div>}
              </div>
            )}
            <div className="nm">{t.nm}</div>
            <div className="ct">{t.ct ?? ' '}</div>
          </div>
        );
      })}
    </div>
  );
}
