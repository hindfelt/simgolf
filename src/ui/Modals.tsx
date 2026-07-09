import { useEffect, useRef } from 'react';
import { useUI } from './store';
import { fmt$ } from '../game/rng';
import { newCourse } from '../game/engine';

export default function Modals() {
  const modal = useUI((s) => s.modal);
  const setStore = useUI((s) => s.set);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!modal) return;
    modalRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStore({ modal: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, setStore]);
  if (!modal) return null;

  const close = () => setStore({ modal: null });

  return (
    <div
      className="overlay"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).classList.contains('overlay')) close();
      }}
    >
      <div className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        {modal.kind === 'help' && (
          <>
            <h1 id="modal-title">FAIRWAY MOGUL</h1>
            <div className="tag">Welcome to the club, boss</div>
            <div className="step">
              <div className="n">1</div>
              <div>
                <b>🚩 New hole:</b> tap once for the tee, tap again for the flag. Par is set by distance.
              </div>
            </div>
            <div className="step">
              <div className="n">2</div>
              <div>
                <b>Paint the land.</b> Fairway keeps golfers happy. Sand, water and trees make them swear, beautifully.
              </div>
            </div>
            <div className="step">
              <div className="n">3</div>
              <div>
                <b>Golfers pay per hole.</b> Good scores and pretty holes mean better tips and reputation. Raise the green fee when your stars go up.
              </div>
            </div>
            <div className="step">
              <div className="n">4</div>
              <div>
                <b>⛳ Tee off</b> to play your own course: drag back from the ball, release to swing. Birdies are free marketing.
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#7a8a70' }}>
              Pinch or scroll to zoom · ✋ to pan · 🚜 on a tee or green removes that hole · ⛰️/⤵️ sculpt the land. Progress autosaves.
            </p>
            <button className="bigbtn" onClick={close}>
              Open the gates
            </button>
            <button
              className="bigbtn"
              style={{ background: '#8a4a3a', marginTop: 8 }}
              onClick={() => {
                if (window.confirm('Start a brand new course? Your current course and save will be erased.')) {
                  newCourse();
                }
              }}
            >
              🚜 Start a new course
            </button>
            <div className="fine">An original homage to Sid Meier’s SimGolf (2002). All code and art generated fresh.</div>
          </>
        )}

        {modal.kind === 'round' && (
          <>
            <h1 id="modal-title">Round complete</h1>
            <div className="tag">The owner’s exhibition</div>
            <table className="sc">
              <tbody>
                <tr>
                  <th>Hole</th>
                  <th>Par</th>
                  <th>You</th>
                </tr>
                {modal.rows.map((r) => (
                  <tr key={r.hole}>
                    <td>{r.hole}</td>
                    <td>{r.par}</td>
                    <td className={r.diff < 0 ? 'good' : r.diff > 0 ? 'bad' : ''}>{r.strokes}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <b>Total</b>
                  </td>
                  <td>
                    <b>{modal.par}</b>
                  </td>
                  <td>
                    <b>{modal.total}</b>
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={{ textAlign: 'center', fontWeight: 800, fontSize: 15 }}>
              {modal.total - modal.par === 0 ? 'Even par!' : modal.total - modal.par < 0 ? modal.total - modal.par + ' under par!' : '+' + (modal.total - modal.par) + ' over par'}
            </p>
            <p style={{ textAlign: 'center' }}>
              Marketing boost: <b style={{ color: '#9c7a12' }}>{fmt$(modal.payout)}</b>
            </p>
            <button className="bigbtn" onClick={close}>
              Back to business
            </button>
          </>
        )}
      </div>
    </div>
  );
}
