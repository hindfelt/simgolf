import { H, W } from './constants';
import { Tile } from './types';

export type BridgeAxis = 'x' | 'y';
export type BridgeDirection = 'west' | 'east' | 'north' | 'south';
export type BridgeConnections = Record<BridgeDirection, boolean>;

/** Half the traversable deck width in world-tile units. Shared by rendering and lies. */
export const BRIDGE_HALF_WIDTH = 0.27;

export function isBridgeTile(tile: number): boolean {
  return tile === Tile.BRIDGE_WATER || tile === Tile.BRIDGE_STREAM;
}

export function isPathNetworkTile(tile: number): boolean {
  return tile === Tile.PATH || isBridgeTile(tile);
}

export function isWaterBackedTile(tile: number): boolean {
  return tile === Tile.WATER || tile === Tile.BRIDGE_WATER;
}

export function isStreamBackedTile(tile: number): boolean {
  return tile === Tile.STREAM || tile === Tile.BRIDGE_STREAM;
}

export function bridgeAxisAt(tiles: ArrayLike<number>, x: number, y: number, width = W, height = H): BridgeAxis {
  const at = (tx: number, ty: number) => (tx >= 0 && ty >= 0 && tx < width && ty < height ? tiles[ty * width + tx] : Tile.ROUGH);
  const west = at(x - 1, y);
  const east = at(x + 1, y);
  const north = at(x, y - 1);
  const south = at(x, y + 1);
  const horizontalNetwork = Number(isPathNetworkTile(west)) + Number(isPathNetworkTile(east));
  const verticalNetwork = Number(isPathNetworkTile(north)) + Number(isPathNetworkTile(south));

  if (horizontalNetwork !== verticalNetwork) return horizontalNetwork > verticalNetwork ? 'x' : 'y';

  const horizontalBridge = Number(isBridgeTile(west)) + Number(isBridgeTile(east));
  const verticalBridge = Number(isBridgeTile(north)) + Number(isBridgeTile(south));
  if (horizontalBridge !== verticalBridge) return horizontalBridge > verticalBridge ? 'x' : 'y';

  const horizontalChannel = Number(isStreamBackedTile(west)) + Number(isStreamBackedTile(east));
  const verticalChannel = Number(isStreamBackedTile(north)) + Number(isStreamBackedTile(south));
  if (horizontalChannel !== verticalChannel) return horizontalChannel > verticalChannel ? 'y' : 'x';

  return 'x';
}

/**
 * Deck openings for a bridge tile. Real path neighbours win, which preserves corners,
 * T-junctions and crossings. A loose end is extended through the opposite edge so an
 * isolated/singly-connected bridge still reads as a complete crossing.
 */
export function bridgeConnectionsAt(tiles: ArrayLike<number>, x: number, y: number, width = W, height = H): BridgeConnections {
  const at = (tx: number, ty: number) => (tx >= 0 && ty >= 0 && tx < width && ty < height ? tiles[ty * width + tx] : Tile.ROUGH);
  const connections: BridgeConnections = {
    west: isPathNetworkTile(at(x - 1, y)),
    east: isPathNetworkTile(at(x + 1, y)),
    north: isPathNetworkTile(at(x, y - 1)),
    south: isPathNetworkTile(at(x, y + 1)),
  };
  const active = (Object.keys(connections) as BridgeDirection[]).filter((direction) => connections[direction]);
  if (active.length >= 2) return connections;
  if (active.length === 1) {
    const opposite: Record<BridgeDirection, BridgeDirection> = { west: 'east', east: 'west', north: 'south', south: 'north' };
    connections[opposite[active[0]]] = true;
    return connections;
  }
  const axis = bridgeAxisAt(tiles, x, y, width, height);
  connections[axis === 'x' ? 'west' : 'north'] = true;
  connections[axis === 'x' ? 'east' : 'south'] = true;
  return connections;
}

/** True when an exact world-space point is on the visible deck, not just its backing tile. */
export function isPointOnBridgeDeck(tiles: ArrayLike<number>, wx: number, wy: number, width = W, height = H): boolean {
  const x = Math.floor(wx);
  const y = Math.floor(wy);
  if (x < 0 || y < 0 || x >= width || y >= height || !isBridgeTile(tiles[y * width + x])) return false;
  const fx = wx - x;
  const fy = wy - y;
  const nearX = Math.abs(fx - 0.5) <= BRIDGE_HALF_WIDTH;
  const nearY = Math.abs(fy - 0.5) <= BRIDGE_HALF_WIDTH;
  if (nearX && nearY) return true;
  const connections = bridgeConnectionsAt(tiles, x, y, width, height);
  if (connections.west && fx <= 0.5 && nearY) return true;
  if (connections.east && fx >= 0.5 && nearY) return true;
  if (connections.north && fy <= 0.5 && nearX) return true;
  if (connections.south && fy >= 0.5 && nearX) return true;
  return false;
}
