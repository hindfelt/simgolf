export type IconName =
  | 'pan' | 'hole' | 'fair' | 'firmFair' | 'deepRough' | 'green' | 'sand' | 'waste' | 'pot' | 'stream' | 'brush' | 'rocks' | 'water' | 'tree' | 'flower' | 'path'
  | 'raise' | 'lower' | 'dozer' | 'land' | 'build' | 'play' | 'pause' | 'fast'
  | 'volume' | 'mute' | 'rotateLeft' | 'rotateRight' | 'staff' | 'report' | 'help'
  | 'cash' | 'reputation' | 'fee' | 'course' | 'terrain' | 'resort' | 'close'
  | 'proShop' | 'snackBar' | 'drivingRange' | 'puttingGreen' | 'cartGarage'
  | 'hotel' | 'tennis' | 'marina' | 'airstrip' | 'buildingLot' | 'bench' | 'save' | 'regulars' | 'scorecard' | 'landmark' | 'ballwasher' | 'scenicbridge'
  | 'account' | 'cloud' | 'trophy' | 'publish';

const PATHS: Record<IconName, string> = {
  pan: 'M8 11V6a1.4 1.4 0 0 1 2.8 0v4-1V4.8a1.4 1.4 0 0 1 2.8 0V10 9V6a1.4 1.4 0 0 1 2.8 0v5-1V8a1.4 1.4 0 0 1 2.8 0v6c0 5-3.2 8-7.5 8H12c-2.2 0-3.6-.8-5-2.4l-3.4-4.2a1.6 1.6 0 0 1 2.3-2.2L8 15',
  hole: 'M7 21V3m0 1h10l-2.4 3L17 10H7M4 21h7',
  fair: 'M4 19c3-3 2-8 5-13 2-3 5-3 8-1-3 4-2 8-5 12-2 3-5 4-8 2Z',
  firmFair: 'M3 20h18M6 20c2-6 4-9 6-9s4 3 6 9m-9-9 3-4 3 4',
  deepRough: 'M3 20h18M5 20 4 10m5 10-1-13m5 13 1-15m3 15 3-12m-9 4 3-3m-7 5-3-3m13 3 4-3',
  green: 'M7 21V5m0 1h8l-2 2 2 2H7m7 7a5 2 0 1 1-10 0 5 2 0 0 1 10 0Z',
  sand: 'M4 15c2-4 5-6 9-5s6 3 7 7c-3 3-12 4-16-2Zm4-4 1-3m5 3 2-4',
  waste: 'M3 17c3-6 7-8 11-6 3 1 5 4 7 7-5 3-13 3-18-1Zm5-4 2-4m4 5 3-5m-7 8 1-3',
  pot: 'M4 11c2 8 14 8 16 0M4 11c2-5 14-5 16 0M7 11c1 3 9 3 10 0M9 7 8 4m6 3 2-3',
  stream: 'M4 3c5 4-2 7 4 10s0 6-3 8m10-18c-5 4 2 7-4 10s0 6 3 8m5-18c-4 5 2 7-3 11s-1 5 1 7',
  brush: 'M4 19c-1-4 2-6 5-5-2-4 2-7 5-4 3-3 7 1 5 4 4 1 4 5 1 7H4Zm4-8L6 6m8 4 1-6m3 9 3-4',
  rocks: 'm3 19 4-8 5 2 3-7 6 13H3Zm4-8 3 4m5-9 2 8m-6 5 3-4',
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
  proShop: 'M3 9h18l-2-5H5L3 9Zm2 0v11h14V9M8 20v-6h5v6m3-7h1M8 6h8',
  snackBar: 'M4 9h16M5 9l1 11h12l1-11M8 9V5h8v4m-7 4h6m-5 3h4M7 3h10',
  drivingRange: 'M5 20h14M8 18l4-10m0 0 4 10M10 12h5M4 8c4-5 10-6 16-3m-2-2 2 2-3 1',
  puttingGreen: 'M4 18c3-4 11-5 16-1-4 4-12 5-16 1Zm8-2V5m0 1h7l-2 2 2 2h-7m-6 9h.01',
  cartGarage: 'M3 20h18M5 17V8l7-4 7 4v9M7 13h10M8 17v-3h8v3m-7 3a1 1 0 1 0 0-2m6 2a1 1 0 1 0 0-2',
  hotel: 'M4 21V6h16v15M8 10h2m4 0h2m-8 4h2m4 0h2m-5 7v-4h2v4M7 6V3h10v3M3 21h18',
  tennis: 'M15 4c3 3 3 7 0 10s-7 3-10 0-3-7 0-10 7-3 10 0Zm-1 9 6 7m-3 0 3-3M8 6l6 6m-9-2 5 5M19 5h.01',
  marina: 'm12 3 7 10H5l7-10Zm0 0v14m-8-1h16l-3 4H7l-3-4ZM3 22c2-1 4-1 6 0s4 1 6 0 4-1 6 0',
  airstrip: 'M21 13 14 10V4l-2-2-2 2v6l-7 3v2l7-1v5l-3 2v1l5-1 5 1v-1l-3-2v-5l7 1v-2Z',
  buildingLot: 'M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6M8 11h2m4 0h2',
  bench: 'M5 12h14v4H5v-4Zm2 4v5m10-5v5M6 9h12v3M7 9V6m10 3V6',
  save: 'M5 4h11l3 3v13H5V4Zm2 0v6h9V4M8 14h8v6H8v-6Z',
  regulars: 'M4 5h16v14H4V5Zm4 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-2.5 6c.3-2 1.2-3 2.5-3s2.2 1 2.5 3h-5ZM13 9h6m-6 3h6m-6 3h4',
  scorecard: 'M6 3h12v18H6V3Zm3 4h6M9 11h2m2 0h2m-6 4h2m2 0h2m-6 3h6M8 3V1h8v2',
  landmark: 'M12 3v4m-3 0h6m-7 4h8l1 10H4L5 11Zm2 3v5m3-5v5m3-5v5',
  ballwasher: 'M12 21V9m0 0-5 2 5-8 5 8-5-2Zm3 5h3v6h-3l-1-2',
  scenicbridge: 'M3 18c3-5 15-5 18 0M6 15V9m12 6V9M4 12h3m10 0h3M9 20l-2-2m8 2 2-2',
  account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-5 2.5-7 7-7s7 2 7 7M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
  cloud: 'M7 18h11a4 4 0 0 0 .5-8A6 6 0 0 0 7 8a5 5 0 0 0 0 10Zm5-7v8m-3-5 3-3 3 3',
  trophy: 'M8 4h8v4c0 4-2 6-4 6s-4-2-4-6V4Zm0 2H4v2c0 3 2 5 5 5m7-7h4v2c0 3-2 5-5 5m-3 1v4m-4 3h8m-6-3h4',
  publish: 'M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7',
};

export default function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={'gameIcon ' + className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
