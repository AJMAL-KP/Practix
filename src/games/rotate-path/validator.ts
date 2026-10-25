import { Direction, PathGrid, PathValidationResult, Port } from './types';

export class PathValidator {
  /**
   * Checks if an arrow is pointing in a valid forward direction for traversal
   * entering at inPort and exiting at outPort.
   */
  static isArrowCompatible(arrow: Direction | null, inPort: Port, outPort: Port): boolean {
    if (!arrow) return true;

    // Straight corridors
    if (inPort === 'W' && outPort === 'E') return arrow === 'E';
    if (inPort === 'E' && outPort === 'W') return arrow === 'W';
    if (inPort === 'N' && outPort === 'S') return arrow === 'S';
    if (inPort === 'S' && outPort === 'N') return arrow === 'N';

    // Corner turns
    if (inPort === 'W' && outPort === 'S') return arrow === 'SE' || arrow === 'S' || arrow === 'E';
    if (inPort === 'S' && outPort === 'W') return arrow === 'NW' || arrow === 'W' || arrow === 'N';

    if (inPort === 'W' && outPort === 'N') return arrow === 'NE' || arrow === 'N' || arrow === 'E';
    if (inPort === 'N' && outPort === 'W') return arrow === 'SW' || arrow === 'W' || arrow === 'S';

    if (inPort === 'E' && outPort === 'S') return arrow === 'SW' || arrow === 'S' || arrow === 'W';
    if (inPort === 'S' && outPort === 'E') return arrow === 'NE' || arrow === 'E' || arrow === 'N';

    if (inPort === 'E' && outPort === 'N') return arrow === 'NW' || arrow === 'N' || arrow === 'W';
    if (inPort === 'N' && outPort === 'E') return arrow === 'SE' || arrow === 'E' || arrow === 'S';

    return false;
  }

  /**
   * Deterministically validates the directed path from the Mouse to the Cheese.
   */
  static validate(grid: PathGrid): PathValidationResult {
    let currR = grid.mouse.row;
    let currC = grid.mouse.col;
    let inPort = grid.mouse.entryDirection;

    const visited: Set<string> = new Set();
    const visitedCoordinates: Array<{ row: number; col: number }> = [];

    // Max steps bounded to board size to guarantee termination
    const maxSteps = 81;
    let stepCount = 0;

    while (stepCount < maxSteps) {
      stepCount++;

      // Check board boundaries
      if (currR < 0 || currR >= 9 || currC < 0 || currC >= 9) {
        return {
          success: false,
          visitedCoordinates,
          failurePoint: { row: Math.max(0, Math.min(8, currR)), col: Math.max(0, Math.min(8, currC)) },
          reason: 'Path leads outside the 9×9 board boundaries',
        };
      }

      const coordKey = `${currR},${currC}`;
      if (visited.has(coordKey)) {
        return {
          success: false,
          visitedCoordinates,
          failurePoint: { row: currR, col: currC },
          reason: 'Infinite loop detected along path',
        };
      }

      visited.add(coordKey);
      visitedCoordinates.push({ row: currR, col: currC });

      const tile = grid.tiles[currR][currC];

      // Check empty tile
      if (tile.type === 'empty') {
        return {
          success: false,
          visitedCoordinates,
          failurePoint: { row: currR, col: currC },
          reason: 'Path blocked by empty tile',
        };
      }

      // Check incoming connection
      if (!tile.ports.includes(inPort)) {
        return {
          success: false,
          visitedCoordinates,
          failurePoint: { row: currR, col: currC },
          reason: `Tile does not connect to incoming ${inPort} side`,
        };
      }

      // If we reached the cheese destination
      if (currR === grid.cheese.row && currC === grid.cheese.col) {
        return {
          success: true,
          visitedCoordinates,
          failurePoint: null,
        };
      }

      // Find exit port (for standard 2-port corridors, the other port)
      const outPorts = tile.ports.filter((p) => p !== inPort);
      if (outPorts.length === 0) {
        return {
          success: false,
          visitedCoordinates,
          failurePoint: { row: currR, col: currC },
          reason: 'Dead end corridor',
        };
      }

      const outPort = outPorts[0];

      // Verify arrow compatibility
      if (!this.isArrowCompatible(tile.arrow, inPort, outPort)) {
        return {
          success: false,
          visitedCoordinates,
          failurePoint: { row: currR, col: currC },
          reason: 'Arrow points in opposite direction to path flow',
        };
      }

      // Calculate next coordinate
      let nextR = currR;
      let nextC = currC;
      let nextInPort: Port;

      switch (outPort) {
        case 'E':
          nextC = currC + 1;
          nextInPort = 'W';
          break;
        case 'W':
          nextC = currC - 1;
          nextInPort = 'E';
          break;
        case 'S':
          nextR = currR + 1;
          nextInPort = 'N';
          break;
        case 'N':
          nextR = currR - 1;
          nextInPort = 'S';
          break;
      }

      currR = nextR;
      currC = nextC;
      inPort = nextInPort;
    }

    return {
      success: false,
      visitedCoordinates,
      failurePoint: { row: currR, col: currC },
      reason: 'Path exceeded maximum traversal step limit',
    };
  }
}
