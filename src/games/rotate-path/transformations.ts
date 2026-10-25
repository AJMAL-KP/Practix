import { Direction, PathTile, Port, TileType } from './types';

export class RegionTransformations {
  /**
   * Rotate a direction 90 degrees clockwise:
   * N -> E -> S -> W -> N
   * NE -> SE -> SW -> NW -> NE
   */
  static rotateDirection90(dir: Direction | null): Direction | null {
    if (!dir) return null;
    switch (dir) {
      case 'N':
        return 'E';
      case 'E':
        return 'S';
      case 'S':
        return 'W';
      case 'W':
        return 'N';
      case 'NE':
        return 'SE';
      case 'SE':
        return 'SW';
      case 'SW':
        return 'NW';
      case 'NW':
        return 'NE';
    }
  }

  /**
   * Rotate a port 90 degrees clockwise.
   */
  static rotatePort90(port: Port): Port {
    switch (port) {
      case 'N':
        return 'E';
      case 'E':
        return 'S';
      case 'S':
        return 'W';
      case 'W':
        return 'N';
    }
  }

  /**
   * Invert a direction 180 degrees (Direction Effect / Flow Reversal):
   * E <-> W, N <-> S, NE <-> SW, SE <-> NW
   */
  static invertDirection(dir: Direction | null): Direction | null {
    if (!dir) return null;
    switch (dir) {
      case 'N':
        return 'S';
      case 'S':
        return 'N';
      case 'E':
        return 'W';
      case 'W':
        return 'E';
      case 'NE':
        return 'SW';
      case 'SW':
        return 'NE';
      case 'SE':
        return 'NW';
      case 'NW':
        return 'SE';
    }
  }

  /**
   * Reflect a direction horizontally (East <-> West, North/South unchanged).
   */
  static mirrorDirectionHorizontal(dir: Direction | null): Direction | null {
    if (!dir) return null;
    switch (dir) {
      case 'N':
        return 'N';
      case 'S':
        return 'S';
      case 'E':
        return 'W';
      case 'W':
        return 'E';
      case 'NE':
        return 'NW';
      case 'NW':
        return 'NE';
      case 'SE':
        return 'SW';
      case 'SW':
        return 'SE';
    }
  }

  /**
   * Reflect a port horizontally.
   */
  static mirrorPortHorizontal(port: Port): Port {
    switch (port) {
      case 'E':
        return 'W';
      case 'W':
        return 'E';
      default:
        return port;
    }
  }

  /**
   * Update tile type after transforming ports.
   */
  static deriveTileType(ports: Port[]): TileType {
    if (ports.length === 0) return 'empty';
    if (ports.length === 2) {
      if (ports.includes('W') && ports.includes('E')) return 'straight_h';
      if (ports.includes('N') && ports.includes('S')) return 'straight_v';
      if (ports.includes('W') && ports.includes('S')) return 'corner_ws';
      if (ports.includes('W') && ports.includes('N')) return 'corner_wn';
      if (ports.includes('E') && ports.includes('S')) return 'corner_es';
      if (ports.includes('E') && ports.includes('N')) return 'corner_en';
    }
    if (ports.length === 3) return 'tee';
    if (ports.length === 4) return 'cross';
    return 'straight_h';
  }

  /**
   * Rotates a single tile 90 degrees clockwise in place.
   */
  static rotateTile(tile: PathTile): PathTile {
    if (tile.type === 'empty' || tile.type === 'blocked') {
      return { ...tile };
    }

    const rotatedPorts = tile.ports.map((p) => this.rotatePort90(p));
    const rotatedArrow = this.rotateDirection90(tile.arrow);
    const newType = this.deriveTileType(rotatedPorts);

    return {
      row: tile.row,
      col: tile.col,
      type: newType,
      arrow: rotatedArrow,
      ports: rotatedPorts,
      isPath: tile.isPath,
    };
  }

  /**
   * Rotates a 3x3 region 90 degrees clockwise:
   * Maps local coordinates (r, c) within the selected region to (c, 2 - r).
   * Pure function: Returns a new 9x9 grid without mutating the input.
   */
  static rotateRegion(gridTiles: PathTile[][], regionIndex: number): PathTile[][] {
    if (regionIndex < 0 || regionIndex > 8) {
      throw new Error(`Invalid regionIndex: ${regionIndex}. Must be 0 to 8.`);
    }

    const rBase = Math.floor(regionIndex / 3) * 3;
    const cBase = (regionIndex % 3) * 3;

    // Deep clone the 9x9 grid
    const newGrid: PathTile[][] = gridTiles.map((row) =>
      row.map((tile) => ({ ...tile, ports: [...tile.ports] }))
    );

    // Snapshot original 3x3 tiles
    const originalSub: PathTile[][] = [];
    for (let r = 0; r < 3; r++) {
      originalSub[r] = [];
      for (let c = 0; c < 3; c++) {
        originalSub[r][c] = {
          ...gridTiles[rBase + r][cBase + c],
          ports: [...gridTiles[rBase + r][cBase + c].ports],
        };
      }
    }

    // Map each local cell (r, c) to (c, 2 - r)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const destLocalR = c;
        const destLocalC = 2 - r;
        const targetRow = rBase + destLocalR;
        const targetCol = cBase + destLocalC;

        const rotatedTile = this.rotateTile(originalSub[r][c]);
        newGrid[targetRow][targetCol] = {
          ...rotatedTile,
          row: targetRow,
          col: targetCol,
        };
      }
    }

    return newGrid;
  }

  /**
   * Flip / Direction Effect on a 3x3 region:
   * Reverses arrow flow along the corridors within the region (180° reversal).
   * Verified by reference screenshot examples: [→, ↘, ↓] -> [←, ↖, ↑].
   * Pure function: Returns a new 9x9 grid without mutating input.
   */
  static invertRegionDirections(gridTiles: PathTile[][], regionIndex: number): PathTile[][] {
    if (regionIndex < 0 || regionIndex > 8) {
      throw new Error(`Invalid regionIndex: ${regionIndex}. Must be 0 to 8.`);
    }

    const rBase = Math.floor(regionIndex / 3) * 3;
    const cBase = (regionIndex % 3) * 3;

    const newGrid: PathTile[][] = gridTiles.map((row) =>
      row.map((tile) => ({ ...tile, ports: [...tile.ports] }))
    );

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const targetRow = rBase + r;
        const targetCol = cBase + c;
        const tile = newGrid[targetRow][targetCol];
        if (tile.type !== 'empty' && tile.type !== 'blocked' && tile.arrow !== null) {
          tile.arrow = this.invertDirection(tile.arrow);
        }
      }
    }

    return newGrid;
  }

  /**
   * Mirror a 3x3 region horizontally: (r, c) -> (r, 2 - c).
   * Reflects corridor geometry and horizontal vector components.
   * Pure function.
   */
  static mirrorRegionHorizontal(gridTiles: PathTile[][], regionIndex: number): PathTile[][] {
    if (regionIndex < 0 || regionIndex > 8) {
      throw new Error(`Invalid regionIndex: ${regionIndex}. Must be 0 to 8.`);
    }

    const rBase = Math.floor(regionIndex / 3) * 3;
    const cBase = (regionIndex % 3) * 3;

    const newGrid: PathTile[][] = gridTiles.map((row) =>
      row.map((tile) => ({ ...tile, ports: [...tile.ports] }))
    );

    const originalSub: PathTile[][] = [];
    for (let r = 0; r < 3; r++) {
      originalSub[r] = [];
      for (let c = 0; c < 3; c++) {
        originalSub[r][c] = {
          ...gridTiles[rBase + r][cBase + c],
          ports: [...gridTiles[rBase + r][cBase + c].ports],
        };
      }
    }

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const destLocalR = r;
        const destLocalC = 2 - c;
        const targetRow = rBase + destLocalR;
        const targetCol = cBase + destLocalC;

        const tile = originalSub[r][c];
        if (tile.type === 'empty' || tile.type === 'blocked') {
          newGrid[targetRow][targetCol] = {
            ...tile,
            row: targetRow,
            col: targetCol,
          };
        } else {
          const newPorts = tile.ports.map((p) => this.mirrorPortHorizontal(p));
          const newArrow = this.mirrorDirectionHorizontal(tile.arrow);
          const newType = this.deriveTileType(newPorts);

          newGrid[targetRow][targetCol] = {
            row: targetRow,
            col: targetCol,
            type: newType,
            arrow: newArrow,
            ports: newPorts,
            isPath: tile.isPath,
          };
        }
      }
    }

    return newGrid;
  }
}
