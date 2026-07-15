/**
 * Dependency-free character art contracts shared by the simulation, course
 * sprites, and SimFoto portraits. Keep this module free of renderer imports so
 * named-character registries remain safe leaf dependencies.
 */

export type PortraitExpression = 'neutral' | 'pleased' | 'cross' | 'triumphant';

export type GolferBuild = 'compact' | 'classic' | 'broad';
export type GolferHeadwear = 'none' | 'cap' | 'visor' | 'flat-cap' | 'bucket-hat';
export type GolferHair = 'close' | 'side-locks' | 'curls' | 'tail' | 'shoulder';

export interface GolferAppearance {
  readonly build: GolferBuild;
  readonly headwear: GolferHeadwear;
  readonly hair: GolferHair;
  readonly outfit: number;
  readonly face: number;
  readonly pants: number;
  readonly bag: number;
  readonly socks: number;
}

/** Bespoke cues which must read consistently in both tiny actors and portraits. */
export type CharacterSignature = 'commissioner' | 'patron';

/**
 * Optional authored overrides layered over the normal name-hashed golfer art.
 * Ordinary golfers need none of these; marquee characters supply every field.
 */
export interface CharacterVisualOverrides {
  readonly appearance?: GolferAppearance;
  readonly signature?: CharacterSignature;
  readonly hairTone?: string;
  readonly hairHighlight?: string;
  readonly trim?: string;
  readonly pants?: string;
  readonly accent?: string;
  readonly bag?: string;
}

/** A complete, stable visual identity suitable for a character registry. */
export interface CharacterVisualProfile extends CharacterVisualOverrides {
  readonly identity: string;
  readonly shirt: string;
  readonly skin: string;
  /** Legacy palette slot retained for ordinary callers; bare-headed profiles use their trim colour. */
  readonly cap: string;
  readonly appearance: GolferAppearance;
  readonly signature: CharacterSignature;
  readonly hairTone: string;
  readonly hairHighlight: string;
  readonly trim: string;
  readonly pants: string;
  readonly accent: string;
  readonly bag: string;
}

export interface CharacterPortraitProfile extends CharacterVisualProfile {
  readonly expression: PortraitExpression;
}
