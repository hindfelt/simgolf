export type IconName =
  | 'pan' | 'hole' | 'fair' | 'green' | 'sand' | 'water' | 'tree' | 'flower' | 'path'
  | 'raise' | 'lower' | 'dozer' | 'land' | 'build' | 'play' | 'pause' | 'fast'
  | 'volume' | 'mute' | 'rotateLeft' | 'rotateRight' | 'staff' | 'report' | 'help'
  | 'cash' | 'reputation' | 'fee' | 'course' | 'terrain' | 'resort' | 'close';

const PATHS: Record<IconName, string> = {
  pan: 'M8 11V6a1.4 1.4 0 0 1 2.8 0v4-1V4.8a1.4 1.4 0 0 1 2.8 0V10 9V6a1.4 1.4 0 0 1 2.8 0v5-1V8a1.4 1.4 0 0 1 2.8 0v6c0 5-3.2 8-7.5 8H12c-2.2 0-3.6-.8-5-2.4l-3.4-4.2a1.6 1.6 0 0 1 2.3-2.2L8 15',
  hole: 'M7 21V3m0 1h10l-2.4 3L17 10H7M4 21h7',
  fair: 'M4 19c3-3 2-8 5-13 2-3 5-3 8-1-3 4-2 8-5 12-2 3-5 4-8 2Z',
  green: 'M7 21V5m0 1h8l-2 2 2 2H7m7 7a5 2 0 1 1-10 0 5 2 0 0 1 10 0Z',
  sand: 'M4 15c2-4 5-6 9-5s6 3 7 7c-3 3-12 4-16-2Zm4-4 1-3m5 3 2-4',
  water: 'M3 9c3 0 3 2 6 2s3-2 6-2 3 2 6 2M3 14c3 0 3 2 6 2s3-2 6-2 3 2 6 2M5 19c2 0 2 1 4 1s2-1 4-1 2 1 4 1',
  tree: 'M12 3 6 11h3l-4 6h14l-4-6h3L12 3Zm0 14v4',
  flower: 'M12 12c-5-1-5-6-2-7 2-1 3 2 2 5 1-5 6-5 7-2 1 2-2 3-5 3 5 1 5 6 2 7-2 1-3-2-3-5-1 5-6 5-7 2-1-2 2-3 5-3Zm0 0v9',
  path: 'M5 21c7-5 1-9 8-13 2-1 4-2 6-5M8 21c7-5 1-8 8-12 2-1 3-2 4-3',
  raise: 'm5 14 7-8 7 8h-4v6H9v-6H5Z',
  lower: 'm5 10 7 8 7-8h-4V4H9v6H5Z',
  dozer: 'M3 16h15l3 3H6l-3-3Zm3-2V8h8l3 6M8 8l2-4h5l2 10M5 20h14',
  land: 'm3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Zm5-3v15m8-12v15',
  build: 'M3 21h18M5 21V9l7-6 7 6v12M9 21v-7h6v7M8 10h2m4 0h2',
  play: 'M5 21V4m0 1h11l-2.5 3L16 11H5m10 6a5 2 0 1 1-10 0',
  pause: 'M8 5v14m8-14v14',
  fast: 'm4 6 7 6-7 6V6Zm9 0 7 6-7 6V6Z',
  volume: 'M4 10v4h4l5 4V6l-5 4H4Zm12-1c2 2 2 4 0 6m2-9c4 4 4 8 0 12',
  mute: 'M4 10v4h4l5 4V6l-5 4H4Zm12-1 5 6m0-6-5 6',
  rotateLeft: 'M5 8V3m0 0h5M5 3l3 3a8 8 0 1 1-2 8',
  rotateRight: 'M19 8V3m0 0h-5m5 0-3 3a8 8 0 1 0 2 8',
  staff: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6m-14 17c0-5 2-8 6-8s6 3 6 8m0-7c4 0 6 2 6 6',
  report: 'M5 21V10h3v11H5Zm6 0V4h3v17h-3Zm6 0v-7h3v7h-3ZM3 21h19',
  help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
  cash: 'M12 3v18m4-14c-1-2-8-2-8 2 0 4 8 2 8 6 0 4-7 4-9 1',
  reputation: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  fee: 'M4 7h16v10H4V7Zm3 3h.01M17 14h.01m-5-5v6m2-5c-1-1-4-1-4 1s4 1 4 2-3 2-4 1',
  course: 'M3 19c4-5 4-11 9-14 3-2 6-1 9 1-4 4-3 10-8 13-3 2-7 2-10 0Z',
  terrain: 'm3 18 6-9 4 5 3-4 5 8H3Zm10-9 2-4 2 4',
  resort: 'M4 21V8l8-5 8 5v13M8 11h2m4 0h2M8 15h2m4 0h2M3 21h18',
  close: 'M5 5l14 14M19 5 5 19',
};

export default function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={'gameIcon ' + className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
