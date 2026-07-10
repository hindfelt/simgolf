import { NAMES } from './constants';
import type { ThemePackId, TouringPro } from './types';

export type ThemeStoryKind = 'rivalry' | 'couple' | 'visitMilestone' | 'celebrityArrival';

export interface ThemePackPlayer {
  name: string;
  shirt?: string;
  skin?: string;
  cap?: string;
  length?: number;
  accuracy?: number;
  imagination?: number;
  celebrity?: boolean;
}

export interface ThemeCourseBlueprint {
  id: string;
  name: string;
  description: string;
  holes: { tee: [number, number]; cup: [number, number] }[];
}

export interface ThemePack {
  id: ThemePackId;
  name: string;
  strapline: string;
  description: string;
  accent: string;
  players?: readonly ThemePackPlayer[];
  stories?: Partial<Record<ThemeStoryKind, readonly string[]>>;
  touringPros?: readonly TouringPro[];
  courses?: readonly ThemeCourseBlueprint[];
}

const neighborhoodPlayers: ThemePackPlayer[] = [
  { name: 'Mara Maple', shirt: '#be4c3f', skin: '#c98a5e', cap: '#f0d36b', imagination: .82 },
  { name: 'Theo Tee', shirt: '#3f7fd0', skin: '#e0a878', cap: '#f4f0dc', accuracy: .84 },
  { name: 'Priya Pine', shirt: '#2fa48a', skin: '#8d5a3a', cap: '#f0d36b', length: .78 },
  { name: 'Lou Links', shirt: '#e0743a', skin: '#f1c6a0', cap: '#304d3d' },
  { name: 'Nia Niblick', shirt: '#8e5bc0', skin: '#6b4226', cap: '#efefef', imagination: .9 },
  { name: 'Bram Bunker', shirt: '#5d6d7e', skin: '#f6d7b8', cap: '#d0453a', length: .86 },
  { name: 'Bea Birdie', shirt: '#d867a8', skin: '#c98a5e', cap: '#fffdf2', accuracy: .91 },
  { name: 'Sol Sand', shirt: '#e9b53c', skin: '#8d5a3a', cap: '#3f7fd0' },
  { name: 'June Juniper', shirt: '#b9d24a', skin: '#f1c6a0', cap: '#5d6d7e' },
  { name: 'Cal Caddie', shirt: '#3f7fd0', skin: '#6b4226', cap: '#e9b53c' },
  { name: 'Omar Oak', shirt: '#2fa48a', skin: '#c98a5e', cap: '#efefef', length: .9 },
  { name: 'Dee Fairway', shirt: '#d0453a', skin: '#f6d7b8', cap: '#3f7fd0', accuracy: .88 },
  { name: 'Chef Maribel', shirt: '#efefef', skin: '#c98a5e', cap: '#d0453a', celebrity: true, imagination: .92 },
  { name: 'Dax Daybreak', shirt: '#e9b53c', skin: '#8d5a3a', cap: '#304d3d', celebrity: true, length: .93 },
  { name: 'Ivy Iron', shirt: '#8e5bc0', skin: '#f1c6a0', cap: '#b9d24a' },
  { name: 'Wes Wedge', shirt: '#e0743a', skin: '#e0a878', cap: '#5d6d7e' },
  { name: 'Ana Approach', shirt: '#d867a8', skin: '#6b4226', cap: '#efefef' },
  { name: 'Max Mulligan', shirt: '#5d6d7e', skin: '#c98a5e', cap: '#e9b53c' },
  { name: 'Rina Rough', shirt: '#b9d24a', skin: '#8d5a3a', cap: '#8e5bc0' },
  { name: 'Felix Flag', shirt: '#3f7fd0', skin: '#f6d7b8', cap: '#d0453a' },
  { name: 'Gwen Green', shirt: '#2fa48a', skin: '#f1c6a0', cap: '#fffdf2' },
  { name: 'Pat Putter', shirt: '#e9b53c', skin: '#e0a878', cap: '#304d3d' },
  { name: 'Tess Turn', shirt: '#d0453a', skin: '#6b4226', cap: '#efefef' },
  { name: 'Noel Nine', shirt: '#8e5bc0', skin: '#c98a5e', cap: '#e9b53c' },
];

const backlotPlayers: ThemePackPlayer[] = [
  'Rex Marquee', 'Vera Velvet', 'Buster Boom', 'Lola Lens', 'Monty Matinee', 'Kit Clapper',
  'Greta Gaffer', 'Duke Dolly', 'Nellie Noir', 'Archie Action', 'Stella Stage', 'Chet Credits',
  'Mina Montage', 'Poppy Premiere', 'Wally Wardrobe', 'Trixie Take', 'Otto Overture', 'Faye Foley',
  'Hal Highlight', 'Ruby Rewind', 'Sid Slate', 'Dora Drama', 'Leo Limelight', 'Gigi Glow',
].map((name, index) => ({
  name,
  shirt: ['#9a3f45', '#355f9c', '#c79330', '#6e4b93', '#2e846f'][index % 5],
  skin: ['#f1c6a0', '#e0a878', '#c98a5e', '#8d5a3a', '#6b4226'][index % 5],
  cap: ['#efe7d2', '#d14b38', '#293f68', '#e1bd47'][index % 4],
  celebrity: index === 0 || index === 1,
}));

const neighborhoodPros: TouringPro[] = [
  { name: 'Rhea Rocket', title: 'The Long Ball', shirt: '#c84b3f', skin: '#8d5a3a', cap: '#f1d066', length: .95, accuracy: .64, imagination: .58 },
  { name: 'Elliot Line', title: 'The Surveyor', shirt: '#3f7fd0', skin: '#f1c6a0', cap: '#efefef', length: .62, accuracy: .95, imagination: .7 },
  { name: 'Imani Arc', title: 'The Sculptor', shirt: '#8e5bc0', skin: '#6b4226', cap: '#f0d36b', length: .68, accuracy: .75, imagination: .96 },
  { name: 'Nico Nerves', title: 'The Closer', shirt: '#2fa48a', skin: '#c98a5e', cap: '#fffdf2', length: .75, accuracy: .89, imagination: .82 },
  { name: 'Mae Mercado', title: 'The Complete Pro', shirt: '#e9b53c', skin: '#8d5a3a', cap: '#263b31', length: .88, accuracy: .9, imagination: .88 },
  { name: 'Sam Switch', title: 'The Tactician', shirt: '#d867a8', skin: '#f6d7b8', cap: '#3f7fd0', length: .61, accuracy: .91, imagination: .93 },
];

const backlotPros: TouringPro[] = [
  { name: 'Dash Driver', title: 'The Headliner', shirt: '#a13e43', skin: '#e0a878', cap: '#e0bb42', length: .96, accuracy: .65, imagination: .55 },
  { name: 'Iris Focus', title: 'The Close-Up', shirt: '#385f9e', skin: '#6b4226', cap: '#eee8d9', length: .64, accuracy: .96, imagination: .69 },
  { name: 'Marco Magic', title: 'The Illusionist', shirt: '#744f96', skin: '#c98a5e', cap: '#e0bb42', length: .7, accuracy: .74, imagination: .97 },
  { name: 'Casey Cut', title: 'The Editor', shirt: '#2e846f', skin: '#f1c6a0', cap: '#263b31', length: .78, accuracy: .89, imagination: .85 },
  { name: 'Val Victory', title: 'The Award Winner', shirt: '#d7a83a', skin: '#8d5a3a', cap: '#9a3f45', length: .9, accuracy: .9, imagination: .9 },
  { name: 'Penny Plot', title: 'The Director', shirt: '#c35591', skin: '#f6d7b8', cap: '#385f9e', length: .6, accuracy: .92, imagination: .94 },
];

export const THEME_PACKS: readonly ThemePack[] = [
  {
    id: 'standard', name: 'Standard', strapline: 'The original club', accent: '#718355',
    description: 'The default cast, stories, touring professionals and untouched starter property.',
  },
  {
    id: 'storybook-club', name: 'Storybook Club', strapline: 'More lives between the scorecards', accent: '#895f8e',
    description: 'Adds a broader story reel while deliberately retaining every standard player, celebrity, pro and course.',
    stories: {
      rivalry: [
        '{leader} has promised the clubhouse a speech if {chaser} fails to catch up.',
        '{chaser} just heard {leader} celebrating from two holes away. This is personal now.',
        'The old match between {leader} and {chaser} has drawn a small gallery again.',
      ],
      couple: [
        '{a} and {b} are debating every club choice, then laughing about it anyway.',
        '{a} saved the last cart snack for {b}. That may be the shot of the day.',
        '{a} and {b} have turned their regular tee time into a proper tradition.',
      ],
      visitMilestone: [
        '{name} is celebrating visit #{visits}; the staff already know the usual order.',
        'Visit #{visits} for {name}. Their favorite locker may as well have a brass plate.',
      ],
    },
  },
  {
    id: 'neighborhood-nine', name: 'Neighborhood Nine', strapline: 'Local legends, lifelong grudges', accent: '#3f8162',
    description: 'A complete original pack with a new cast, celebrities, story reel, touring field and bundled three-hole garden loop.',
    players: neighborhoodPlayers,
    stories: {
      rivalry: ['{leader} leads the neighborhood cup; {chaser} is already demanding a rematch.', '{chaser} says {leader} only knows this course because they helped plant the trees.'],
      couple: ['{a} and {b} booked their favorite sunrise tee time again.', '{a} is reading every green while {b} guards the picnic basket.'],
      visitMilestone: ['The clubhouse rang the little brass bell: {name} has reached visit #{visits}.'],
      celebrityArrival: ['Local favorite {name} has arrived; half the neighborhood followed them through the gate.'],
    },
    touringPros: neighborhoodPros,
    courses: [{
      id: 'garden-loop', name: 'Garden Loop', description: 'Three compact holes curling through the original northwest property.',
      holes: [
        { tee: [7, 7], cup: [15, 10] },
        { tee: [17, 13], cup: [25, 18] },
        { tee: [8, 19], cup: [15, 16] },
      ],
    }],
  },
  {
    id: 'backlot-legends', name: 'Backlot Legends', strapline: 'Every round needs a third act', accent: '#a14a45',
    description: 'A complete cinema-inspired cast, celebrity pair, dialogue reel, touring stars and bundled three-hole studio course.',
    players: backlotPlayers,
    stories: {
      rivalry: ['{leader} calls it a commanding performance; {chaser} calls for another take.', '{chaser} is stalking {leader} down the leaderboard like a final-act villain.'],
      couple: ['{a} and {b} are sharing a cart and rewriting the ending after every hole.', '{a} lined up the putt while {b} supplied an unnecessarily dramatic soundtrack.'],
      visitMilestone: ['Take #{visits}: {name} returns to their favorite role at the club.'],
      celebrityArrival: ['The cameras are out: {name} just stepped onto the first tee.'],
    },
    touringPros: backlotPros,
    courses: [{
      id: 'studio-trilogy', name: 'Studio Trilogy', description: 'Three bold opening holes staged across the starter property.',
      holes: [
        { tee: [8, 7], cup: [19, 9] },
        { tee: [20, 13], cup: [25, 20] },
        { tee: [9, 20], cup: [19, 17] },
      ],
    }],
  },
] as const;

const standardPlayers: readonly ThemePackPlayer[] = NAMES.map((name) => ({ name }));

export function isThemePackId(value: unknown): value is ThemePackId {
  return typeof value === 'string' && THEME_PACKS.some((pack) => pack.id === value);
}

export function themePackById(id: ThemePackId | string | null | undefined): ThemePack {
  return THEME_PACKS.find((pack) => pack.id === id) ?? THEME_PACKS[0];
}

/** Missing sections inherit Standard, matching the manual's partial-pack rule. */
export function themePackPlayers(id: ThemePackId): readonly ThemePackPlayer[] {
  return themePackById(id).players ?? standardPlayers;
}

export function themePackStories(id: ThemePackId, kind: ThemeStoryKind): readonly string[] {
  return themePackById(id).stories?.[kind] ?? [];
}

export function themePackTouringPros(id: ThemePackId): readonly TouringPro[] | undefined {
  return themePackById(id).touringPros;
}

export function themePackCourse(id: ThemePackId, courseId: string | null): ThemeCourseBlueprint | null {
  if (!courseId) return null;
  return themePackById(id).courses?.find((course) => course.id === courseId) ?? null;
}

export function fillThemeStory(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, key: string) => values[key] === undefined ? match : String(values[key]));
}
