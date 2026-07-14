import { describe, expect, it } from 'vitest';
import { selectSimFotoTicker } from './Ticker';
import type { TickerItem } from './store';

const system = (id: number): TickerItem => ({ id, name: 'Course', txt: 'System notice' });
const character = (id: number, name: string): TickerItem => ({
  id,
  name,
  txt: 'Lovely course!',
  character: { shirt: '#4477aa', skin: '#e0aa7d', cap: '#eeeecc', expression: 'pleased' },
});

describe('SimFoto ticker selection', () => {
  it('never turns system-only notices into character portraits', () => {
    expect(selectSimFotoTicker([system(1), system(2)])).toBeNull();
  });

  it('selects the newest character event while retaining its accessible text', () => {
    const first = character(2, 'Gale');
    const newest = character(4, 'Tex');
    const selected = selectSimFotoTicker([system(1), first, system(3), newest]);
    expect(selected).toBe(newest);
    expect(selected).toMatchObject({ name: 'Tex', txt: 'Lovely course!' });
  });

  it('keeps round chatter as lightweight world text instead of a portrait card', () => {
    expect(selectSimFotoTicker([character(2, 'Gale')], 'play')).toBeNull();
  });
});
