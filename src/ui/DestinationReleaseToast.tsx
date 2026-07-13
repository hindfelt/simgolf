import { propertyById } from '../game/properties';
import { useUI } from './store';

export default function DestinationReleaseToast() {
  const propertyIds = useUI((state) => state.destinationRelease);
  const mode = useUI((state) => state.mode);
  const setStore = useUI((state) => state.set);
  if (!propertyIds.length || mode === 'play') return null;
  const properties = propertyIds.map(propertyById);
  const dismiss = () => setStore({ destinationRelease: [] });
  const openWorld = () => setStore({
    destinationRelease: [],
    modal: { kind: 'newCourse' },
    buildPanel: false,
    staffPanel: false,
    reportsPanel: false,
    regularsPanel: false,
    scorecardsPanel: false,
    onlinePanel: false,
    proPanel: false,
  });

  return (
    <aside className="destinationReleaseToast" role="status" aria-live="polite" aria-label={`${properties.length} new worldwide ${properties.length === 1 ? 'destination' : 'destinations'} released`}>
      <span className="destinationReleaseSeal" aria-hidden="true">✦</span>
      <div>
        <small>WORLD SCREEN · NEW {properties.length === 1 ? 'DEED' : 'DEEDS'}</small>
        <b>{properties.map((property) => property.name).join(' · ')}</b>
        <p>Money and prestige requirements cleared. Development is now available.</p>
      </div>
      <button type="button" className="destinationReleaseOpen" onClick={openWorld}>Open World Screen</button>
      <button type="button" className="destinationReleaseDismiss" aria-label="Dismiss destination release" onClick={dismiss}>×</button>
    </aside>
  );
}
