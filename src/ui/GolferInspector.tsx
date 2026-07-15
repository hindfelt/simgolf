import { useCallback, useRef } from 'react';
import { S } from '../game/state';
import { centerOnGolfer, selectGolfer } from '../game/engine';
import { golferInspectionModel } from '../game/golferInspection';
import { SPECIAL_GUESTS, specialGuestPortrait } from '../game/specialGuests';
import CharacterPortrait from './CharacterPortrait';
import Icon from './Icon';
import { useFloatingPanelFocus } from './panelA11y';
import { useUI } from './store';

const NEEDS = [
  ['energy', 'Energy'],
  ['hunger', 'Food'],
  ['thirst', 'Drink'],
] as const;

const SKILLS = [
  ['length', 'Length'],
  ['accuracy', 'Accuracy'],
  ['imagination', 'Imagination'],
] as const;

function Meter({ label, ariaLabel, value, tone }: { label: string; ariaLabel: string; value: number; tone: 'need' | 'skill' }) {
  return (
    <div className={`golferMeter meter-${tone}`}>
      <span>{label}</span>
      <div role="meter" aria-label={ariaLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <i style={{ width: `${value}%` }} />
      </div>
      <b>{value}</b>
    </div>
  );
}

export default function GolferInspector() {
  const selectionVersion = useUI((state) => state.golferSelectionVersion);
  const simTick = useUI((state) => state.simTick);
  const mode = useUI((state) => state.mode);
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => selectGolfer(null), []);
  const golfer = S.selectedGolfer && S.golfers.includes(S.selectedGolfer) ? S.selectedGolfer : null;
  useFloatingPanelFocus(!!golfer && mode !== 'play', panelRef, close);
  void selectionVersion;
  void simTick;
  if (!golfer || mode === 'play') return null;

  const regular = S.regulars.find((candidate) => candidate.name === golfer.name);
  const model = golferInspectionModel(golfer, regular, S.comments);
  const specialGuest = golfer.specialGuest ? SPECIAL_GUESTS[golfer.specialGuest] : null;
  const displayName = specialGuest?.name ?? golfer.name;
  const portrait = golfer.specialGuest
    ? specialGuestPortrait(golfer.specialGuest, model.expression)
    : { shirt: golfer.shirt, skin: golfer.skin, cap: golfer.cap, expression: model.expression };
  const membership = specialGuest?.title ?? (regular?.membership?.tier === 'lifetime'
    ? 'Lifetime member'
    : regular?.membership?.tier === 'annual'
      ? 'Annual member'
      : regular?.celebrity
        ? 'Local celebrity'
        : 'Club guest');

  return (
    <section className="golferInspector" data-ui="people-inspector" data-special-guest={golfer.specialGuest} ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="golfer-inspector-title" tabIndex={-1}>
      <header className="golferInspectorHead">
        <span className="peopleSeal" aria-hidden="true"><Icon name="regulars" size={19} /></span>
        <CharacterPortrait name={displayName} {...portrait} variant="profile" className="inspectorPortrait" />
        <div>
          <small>PEOPLE · LIVE SIMFOTO</small>
          <h2 id="golfer-inspector-title">{displayName}</h2>
          <p>{membership}{model.visits == null ? '' : ` · Visit ${model.visits}`}</p>
        </div>
        <button className="iconButton golferInspectorClose" aria-label={`Close ${displayName} profile`} onClick={close}><Icon name="close" size={15} /></button>
      </header>

      <div className="golferSituation" aria-label={`${displayName} current situation`}>
        <span><small>Attitude</small><b>{model.attitude}</b></span>
        <span><small>Hole</small><b>{model.hole}</b></span>
        <span><small>Strokes</small><b>{model.strokes}</b></span>
        <span><small>Lie</small><b>{model.lie}</b></span>
      </div>
      <p className="golferAction">{model.action}</p>

      <div className="golferInspectorMeters">
        <section aria-labelledby="golfer-needs-title">
          <h3 id="golfer-needs-title">Needs</h3>
          {NEEDS.map(([key, label]) => <Meter key={key} label={label} ariaLabel={`${displayName} ${label}`} value={model.needs[key]} tone="need" />)}
        </section>
        <section aria-labelledby="golfer-skills-title">
          <h3 id="golfer-skills-title">Skills</h3>
          {SKILLS.map(([key, label]) => <Meter key={key} label={label} ariaLabel={`${displayName} ${label}`} value={model.skills[key]} tone="skill" />)}
        </section>
      </div>

      <blockquote className="golferLatestComment">
        <small>LATEST COMMENT</small>
        <p>{model.latestComment ? `“${model.latestComment}”` : `${displayName} is concentrating on the round.`}</p>
      </blockquote>

      <div className="golferInspectorActions">
        <button onClick={() => centerOnGolfer(golfer)}><Icon name="pan" size={15} /> Center on golfer</button>
        <button onClick={close}>Done</button>
      </div>
    </section>
  );
}
