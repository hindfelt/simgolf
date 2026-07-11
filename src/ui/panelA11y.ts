import { useEffect, type RefObject } from 'react';
import { fmt$ } from '../game/rng';

export interface StaffRecruitmentCopyInput {
  name: string;
  wage: number;
  count: number;
  cost: number;
  cash: number;
  skilledLocked: boolean;
}

export function staffRecruitmentCopy({
  name,
  wage,
  count,
  cost,
  cash,
  skilledLocked,
}: StaffRecruitmentCopyInput): { status: string; hireLabel: string } {
  if (skilledLocked) {
    const status = 'Skilled role · unlocks at 6 holes';
    return { status, hireLabel: `Hire ${name} for ${fmt$(cost)}; unlocks at 6 holes` };
  }

  if (cash < cost) {
    const shortfall = fmt$(cost - cash);
    const status = count > 0
      ? `${count} employed · Need ${shortfall} more to recruit another`
      : `Need ${shortfall} more to recruit`;
    return { status, hireLabel: `Hire ${name} for ${fmt$(cost)}; need ${shortfall} more` };
  }

  const status = count > 0
    ? `${count} employed · ${fmt$(count * wage)}/s payroll`
    : 'Available to recruit';
  return { status, hireLabel: `Hire ${name} for ${fmt$(cost)}; available to recruit` };
}

/** Focus lifecycle for the non-modal management trays used above the course dock. */
export function useFloatingPanelFocus(
  open: boolean,
  panelRef: RefObject<HTMLElement>,
  close: () => void,
) {
  useEffect(() => {
    if (!open || !panelRef.current) return;

    const panel = panelRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      const active = document.activeElement;
      const shouldRestore = !active || active === document.body || panel.contains(active);
      if (shouldRestore && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [close, open, panelRef]);
}
