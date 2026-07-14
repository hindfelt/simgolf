import BuildPanel from './BuildPanel';
import { FieldControls } from './TopBar';
import Toolbar from './Toolbar';
import { useUI } from './store';

/** One stacking context owns every permanent lower-screen controller. */
export default function ControllerShell() {
  const clubhouseOpen = useUI((state) => state.clubhouseMenu);
  const facilitiesOpen = useUI((state) => state.buildPanel);
  const managementOpen = useUI((state) => state.staffPanel || state.reportsPanel || state.regularsPanel || state.scorecardsPanel || state.onlinePanel || state.proPanel);
  return (
    <div
      className="controllerShell"
      data-ui="bottom-controller-shell"
      data-surface={clubhouseOpen ? 'clubhouse' : facilitiesOpen ? 'facilities' : managementOpen ? 'management' : 'tools'}
    >
      <FieldControls />
      <Toolbar />
      <BuildPanel />
    </div>
  );
}
