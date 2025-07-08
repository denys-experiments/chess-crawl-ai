
import type { Board, Position, Piece, Tile, PieceType, PieceColor } from '@/types';
import { getFactionsForLevel } from './factions';
import { generateRandomName } from './names';

const FACTION_INTRODUCTION_LEVEL: { [color: string]: number } = {
    black: 1,
    orange: 4,
    cyan: 8,
    red: 12,
    purple: 16,
};

const FACTION_PROGRESSION_CONFIG: { [color: string]: { 
    count: (level: number) => number; 
    value: (level: number) => number; 
} } = {
    black: { // Slowest progression
        count: level => 2 + Math.floor(level / 16),
        value: level => 3 + level * 0.421875,
    },
    orange: { // Balanced progression
        count: level => 2 + Math.floor(level / 12),
        value: level => 3 + level * 5.0625,
    },
    cyan: { // Fast count, slow value (Swarm)
        count: level => 2 + Math.floor(level / 10),
        value: level => 3 + level * 0.421875,
    },
    red: { // Slow count, fast value (Elite)
        count: level => 2 + Math.floor(level / 16),
        value: level => 3 + level * 8.4375,
    },
    purple: { // Fastest progression
        count: level => 2 + Math.floor(level / 8),
        value: level => 3 + level * 11.8125,
    },
    default: { // Fallback
        count: level => 2 + Math.floor(level / 16),
        value: level => 3 + level * 0.421875,
    }
};

/**
 * Generates an army composition for a faction based on points and ratios.
 */
function generateFactionArmy(
    maxPieceCount: number, 
    totalPieceValue: number, 
    effectiveLevel: number
): PieceType[] {
    const pieceCosts: { piece: PieceType; cost: number; minLevel: number }[] = [
        { piece: 'Queen', cost: 9, minLevel: 8 },
        { piece: 'Rook', cost: 5, minLevel: 4 },
        { piece: 'Bishop', cost: 3, minLevel: 3 },
        { piece: 'Knight', cost: 3, minLevel: 1 },
        { piece: 'Pawn', cost: 1, minLevel: 1 },
    ];

    const availablePieces = pieceCosts
        .filter(p => effectiveLevel >= p.minLevel)
        .sort((a, b) => b.cost - a.cost);

    // Step 1: Start with a full army of pawns.
    let army: PieceType[] = Array(maxPieceCount).fill('Pawn');
    let remainingValue = totalPieceValue;

    // Helper to count pieces in the current army
    const countPieces = (currentArmy: PieceType[]) => {
        const counts = { Queen: 0, Rook: 0, Bishop: 0, Knight: 0, Pawn: 0 };
        for (const piece of currentArmy) {
            // @ts-ignore
            if (piece in counts) {
                // @ts-ignore
                counts[piece]++;
            }
        }
        return counts;
    };

    let upgradedInLoop = true;
    while (upgradedInLoop) {
        upgradedInLoop = false;
        
        let bestUpgrade: {
            indexToUpgrade: number;
            targetPiece: PieceType;
            cost: number;
            priority: number;
        } | null = null;
        
        const currentCounts = countPieces(army);

        // Evaluate all possible upgrades from the current state
        for (let i = 0; i < army.length; i++) {
            const currentPiece = army[i];
            const currentCost = pieceCosts.find(p => p.piece === currentPiece)!.cost;
            
            // Iterate through possible upgrade targets for this piece
            for (const target of availablePieces) {
                if (target.cost <= currentCost) continue; // Must be an upgrade

                const upgradeCost = target.cost - currentCost;
                if (upgradeCost > remainingValue) continue; // Can't afford

                // Calculate priority score (lower is better)
                let priority = 100; // Default to a high number (low priority)

                // Priority 1: Pawn -> Knight/Bishop
                if (currentPiece === 'Pawn' && (target.piece === 'Knight' || target.piece === 'Bishop')) {
                    priority = 1;
                    // Try to balance Knights and Bishops
                    if (target.piece === 'Knight' && currentCounts.Knight > currentCounts.Bishop) {
                        priority += 0.5; // Slightly deprioritize if we have more knights
                    } else if (target.piece === 'Bishop' && currentCounts.Bishop > currentCounts.Knight) {
                        priority += 0.5; // Slightly deprioritize if we have more bishops
                    }
                }
                
                // Priority 2: Knight/Bishop -> Rook
                if ((currentPiece === 'Knight' || currentPiece === 'Bishop') && target.piece === 'Rook') {
                    // Ratio: Upgrade if we are "behind" on Rooks (2 Rooks for every 3 B/N).
                    if (currentCounts.Rook * 3 < (currentCounts.Knight + currentCounts.Bishop) * 2) {
                        priority = 2;
                    }
                }

                // Priority 3: Rook -> Queen
                if (currentPiece === 'Rook' && target.piece === 'Queen') {
                    // Ratio: Upgrade if we are "behind" on Queens (1 Queen for every 2 Rooks).
                    if (currentCounts.Queen * 2 < currentCounts.Rook) {
                        priority = 3;
                    }
                }
                
                // If this is the best upgrade found so far, save it
                if (bestUpgrade === null || priority < bestUpgrade.priority) {
                    bestUpgrade = {
                        indexToUpgrade: i,
                        targetPiece: target.piece,
                        cost: upgradeCost,
                        priority: priority,
                    };
                }
            }
        }
        
        // If a valid upgrade was found, apply it and continue the loop to re-evaluate
        if (bestUpgrade) {
            army[bestUpgrade.indexToUpgrade] = bestUpgrade.targetPiece;
            remainingValue -= bestUpgrade.cost;
            upgradedInLoop = true;
        }
    }

    return army;
}


function getRandomAllyPiece(level: number): PieceType {
  const pieceWeights: { piece: PieceType; weight: number; minLevel: number }[] = [
    { piece: 'Pawn', weight: 8, minLevel: 1 },
    { piece: 'Knight', weight: 4, minLevel: 1 },
    { piece: 'Bishop', weight: 3, minLevel: 2 },
    { piece: 'Rook', weight: 2, minLevel: 4 },
    { piece: 'Queen', weight: 1, minLevel: 6 },
  ];

  const availablePieces = pieceWeights.filter(p => level >= p.minLevel);

  if (availablePieces.length === 0) {
    return 'Pawn';
  }

  const totalWeight = availablePieces.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const piece of availablePieces) {
    if (random < piece.weight) {
      return piece.piece;
    }
    random -= piece.weight;
  }
  
  return availablePieces.length > 0 ? availablePieces[availablePieces.length - 1].piece : 'Pawn';
}

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

export function initializeBoard(level: number, playerPiecesToPlace: Piece[] = [], dimensions?: { width: number, height: number, numFactions?: number }): { board: Board, factions: string[] } {
  const width = dimensions?.width || Math.min(14, 7 + Math.floor(level / 2) + (level > 2 ? Math.floor(Math.random() * 3) - 1 : 0));
  const height = dimensions?.height || Math.min(14, 7 + Math.floor(level / 3) + (level > 3 ? Math.floor(Math.random() * 3) - 1 : 0));
  
  const board: Board = Array(height).fill(null).map(() => Array(width).fill(null));

  const kingX = Math.floor(width / 2);
  const kingY = height - 1;

  // --- Start: Reworked Player Piece Placement ---
  const piecesToPlace = playerPiecesToPlace;

  const playerKing = piecesToPlace.find(p => p.piece === 'King');
  if (playerKing) {
      board[kingY][kingX] = { ...playerKing, x: kingX, y: kingY };
  }
  
  const otherPlayerPieces = piecesToPlace.filter(p => p.piece !== 'King');

  // Dynamically find available positions around the king
  const availablePlayerPositions: Position[] = [];
  let radius = 1;
  while (availablePlayerPositions.length < otherPlayerPieces.length && radius < Math.max(width, height)) {
    // Search in a square perimeter of the given radius
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        if (Math.abs(i) < radius && Math.abs(j) < radius) continue; // Only check perimeter

        const px = kingX + i;
        const py = kingY + j;

        // Only place pieces "in front" of the king (lower y) or on the same row.
        if (py > kingY) continue;

        if (isWithinBoard(px, py, board) && !board[py][px]) {
          // Check if position is not already added
          if (!availablePlayerPositions.some(p => p.x === px && p.y === py)) {
            availablePlayerPositions.push({ x: px, y: py });
          }
        }
      }
    }
    radius++;
  }

  // Sort positions to prioritize those in front and closer to the king
  availablePlayerPositions.sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y; // Prioritize lower y (in front)
    return Math.abs(a.x - kingX) - Math.abs(b.x - kingX); // Then closer to king horizontally
  });


  otherPlayerPieces.forEach((piece, index) => {
    if (index < availablePlayerPositions.length) {
      const pos = availablePlayerPositions[index];
      board[pos.y][pos.x] = { ...piece, x: pos.x, y: pos.y };
    }
  });
  // --- End: Reworked Player Piece Placement ---

  const factions = getFactionsForLevel(level, dimensions?.numFactions);

  const allAnchorPoints = [
      { x: Math.floor(width / 2), y: 0, side: 'top', id: 'top_center' }, 
      { x: 0, y: Math.floor(height / 4), side: 'left', id: 'left' },
      { x: width - 1, y: Math.floor(height / 4), side: 'right', id: 'right' },
      { x: Math.floor(width / 4), y: 0, side: 'top', id: 'top_left' },
      { x: width - 1 - Math.floor(width / 4), y: 0, side: 'top', id: 'top_right' },
  ].filter(p => isWithinBoard(p.x, p.y, board));

  const getPoint = (id: string) => allAnchorPoints.find(p => p.id === id);

  let potentialPlacements: (typeof allAnchorPoints[0] | undefined)[] = [];
  const numFactions = factions.length;

  switch (numFactions) {
      case 1:
          potentialPlacements = [getPoint('top_center')];
          break;
      case 2:
          potentialPlacements = [getPoint('top_left'), getPoint('top_right')];
          break;
      case 3:
          potentialPlacements = [getPoint('top_center'), getPoint('left'), getPoint('right')];
          break;
      case 4:
          potentialPlacements = [getPoint('top_left'), getPoint('top_right'), getPoint('left'), getPoint('right')];
          break;
      default:
          potentialPlacements = allAnchorPoints;
          break;
  }

  let placementAnchors = shuffle(potentialPlacements.filter(p => !!p) as typeof allAnchorPoints);
  if (placementAnchors.length < numFactions) {
      const usedIds = placementAnchors.map(p => p.id);
      const availablePoints = allAnchorPoints.filter(p => !usedIds.includes(p.id));
      placementAnchors = placementAnchors.concat(shuffle(availablePoints));
  }
  placementAnchors = placementAnchors.slice(0, numFactions);

  factions.forEach((factionColor, i) => {
      const anchor = placementAnchors[i];
      if (!anchor) return;

      const { x: kingX, y: kingY, side } = anchor;
      
      let finalKingPos = { x: kingX, y: kingY };
      if (!isWithinBoard(kingX, kingY, board) || board[kingY][kingX]) {
          const searchDirs = [[0,0], [0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
          const foundPos = searchDirs.map(([dx,dy]) => ({ x: kingX+dx, y: kingY+dy })).find(p => isWithinBoard(p.x, p.y, board) && !board[p.y][p.x]);
          if (foundPos) {
              finalKingPos = foundPos;
          } else {
               return; 
          }
      }
      
      const { x: fkx, y: fky } = finalKingPos;
      board[fky][fkx] = { type: 'piece', piece: 'King', color: factionColor, x: fkx, y: fky, id: `b-king-${factionColor}-${Date.now()}`, name: generateRandomName(), discoveredOnLevel: level, captures: 0 };
      
      const introductionLevel = FACTION_INTRODUCTION_LEVEL[factionColor] || 1;
      const effectiveLevel = Math.max(1, level - (introductionLevel - 1));

      const progression = FACTION_PROGRESSION_CONFIG[factionColor] || FACTION_PROGRESSION_CONFIG.default;
      const calculatedPieceCount = progression.count(effectiveLevel);
      const maxPieceCount = Math.min(Math.floor(calculatedPieceCount), 25);
      const totalPieceValue = progression.value(effectiveLevel);
      
      const armyToPlace = generateFactionArmy(maxPieceCount, totalPieceValue, effectiveLevel);
      
      let pawnDirection: Piece['direction'] = 'down';
      if (side === 'left') pawnDirection = 'right';
      if (side === 'right') pawnDirection = 'left';

      // Find available positions for the army around the king
      const openPositions: Position[] = [];
      let radius = 1;
      while(openPositions.length < armyToPlace.length && radius < Math.max(width, height)) {
        for(let i = -radius; i <= radius; i++) {
            for(let j = -radius; j <= radius; j++) {
                if (Math.abs(i) < radius && Math.abs(j) < radius) continue; // only check perimeter
                const px = fkx + i;
                const py = fky + j;

                // Prefer placing pieces "in front" of the king
                if (side === 'top' && py <= fky) continue;
                if (side === 'left' && px <= fkx) continue;
                if (side === 'right' && px >= fkx) continue;

                if (isWithinBoard(px, py, board) && !board[py][px]) {
                    const uniquePos = !openPositions.some(p => p.x === px && p.y === py);
                    if (uniquePos) {
                        openPositions.push({x: px, y: py});
                    }
                }
            }
        }
        radius++;
      }
      
      shuffle(openPositions);
      
      armyToPlace.forEach((pieceType, index) => {
        const pos = openPositions.pop();
        if (pos) {
            board[pos.y][pos.x] = {
                type: 'piece',
                piece: pieceType,
                color: factionColor,
                x: pos.x,
                y: pos.y,
                id: `b-${pieceType.toLowerCase()}-${factionColor}-${index}-${Date.now()}`,
                name: generateRandomName(),
                discoveredOnLevel: level,
                captures: 0,
                ...(pieceType === 'Pawn' && { direction: pawnDirection })
            };
        }
      });
  });

  const emptySquares: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!board[y][x]) {
        emptySquares.push({ x, y });
      }
    }
  }

  shuffle(emptySquares);
  
  const numSquares = width * height;
  const numWalls = Math.min(emptySquares.length, Math.max(0, Math.floor(numSquares / 16) + Math.floor(Math.random() * 3 - 1)));
  const numChests = Math.min(emptySquares.length - numWalls, Math.max(0, 1 + Math.floor(level / 3) + Math.floor(Math.random()*2)));
  const numAllies = Math.min(emptySquares.length - numWalls - numChests, Math.max(0, 1 + Math.floor(level / 2)));


  for (let i = 0; i < numWalls; i++) {
      const pos = emptySquares.pop();
      if (pos) board[pos.y][pos.x] = { type: 'wall' };
  }

  for (let i = 0; i < numChests; i++) {
      const pos = emptySquares.pop();
      if (pos) {
        board[pos.y][pos.x] = { type: 'chest' };
      }
  }

  for (let i = 0; i < numAllies; i++) {
      const pos = emptySquares.pop();
      if (pos) board[pos.y][pos.x] = { type: 'sleeping_ally', piece: getRandomAllyPiece(level) };
  }

  return { board, factions };
}

export function isWithinBoard(x: number, y: number, board: Board): boolean {
  const height = board.length;
  if (height === 0) return false;
  const width = board[0].length;
  return x >= 0 && x < width && y >= 0 && y < height;
}

export function getValidMoves(pos: Position, board: Board): Position[] {
  const pieceTile = board[pos.y][pos.x];
  if (!pieceTile || pieceTile.type !== 'piece') return [];
  const piece = pieceTile;

  switch (piece.piece) {
    case 'Pawn':
      return getPawnMoves(pos, piece, board);
    case 'Knight':
      return getKnightMoves(pos, piece, board);
    case 'Bishop':
      return getSlidingMoves(pos, piece, board, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    case 'Rook':
      return getSlidingMoves(pos, piece, board, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    case 'Queen':
      return getSlidingMoves(pos, piece, board, [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
    case 'King':
      return getKingMoves(pos, piece, board);
    default:
      return [];
  }
}

function getPawnMoves(pos: Position, piece: Piece, board: Board): Position[] {
  const uniqueMoves = new Map<string, Position>();
  const { x, y } = pos;
  const direction = piece.direction || (piece.color === 'white' ? 'up' : 'down');

  // Rule 1: Standard forward move
  const forwardVectors = {
    'up': { x: 0, y: -1 },
    'down': { x: 0, y: 1 },
    'left': { x: -1, y: 0 },
    'right': { x: 1, y: 0 },
  };
  const forwardVector = forwardVectors[direction];
  const nx = x + forwardVector.x;
  const ny = y + forwardVector.y;

  if (isWithinBoard(nx, ny, board)) {
    const target = board[ny][nx];
    if (!target || target.type === 'chest') {
      uniqueMoves.set(`${nx},${ny}`, { x: nx, y: ny });
    }
  }
  
  // Rule 2: Diagonal capture
  const captureDirections = {
    'up':    [{ dx: -1, dy: -1 }, { dx: 1, dy: -1 }],
    'down':  [{ dx: -1, dy: 1 }, { dx: 1, dy: 1 }],
    'left':  [{ dx: -1, dy: -1 }, { dx: -1, dy: 1 }],
    'right': [{ dx: 1, dy: -1 }, { dx: 1, dy: 1 }],
  };

  captureDirections[direction].forEach(({ dx, dy }) => {
    const cnx = x + dx;
    const cny = y + dy;
    if (isWithinBoard(cnx, cny, board)) {
      const target = board[cny][cnx];
      if (target?.type === 'piece' && target.color !== piece.color) {
        uniqueMoves.set(`${cnx},${cny}`, { x: cnx, y: cny });
      }
    }
  });

  // Rule 3: Ricochet/Bounce move off any adjacent obstacle or board edge
  const orthogonalOffsets = [
      { dx: 0, dy: -1 }, // up
      { dx: 0, dy: 1 },  // down
      { dx: -1, dy: 0 }, // left
      { dx: 1, dy: 0 },  // right
  ];

  orthogonalOffsets.forEach(({ dx, dy }) => {
      const obsX = x + dx;
      const obsY = y + dy;
      let isObstacle = false;

      if (!isWithinBoard(obsX, obsY, board)) {
          isObstacle = true;
      } else {
          const obstacleTile = board[obsY][obsX];
          if (obstacleTile?.type === 'wall' || obstacleTile?.type === 'piece' || obstacleTile?.type === 'sleeping_ally' || obstacleTile?.type === 'chest') {
              isObstacle = true;
          }
      }

      if (isObstacle) {
          const bounceX = x - dx;
          const bounceY = y - dy;

          if (isWithinBoard(bounceX, bounceY, board)) {
              const bounceTile = board[bounceY][bounceX];
              if (!bounceTile || bounceTile.type === 'chest') {
                  uniqueMoves.set(`${bounceX},${bounceY}`, { x: bounceX, y: bounceY });
              }
          }
      }
  });
  
  return Array.from(uniqueMoves.values());
}

function getKnightMoves(pos: Position, piece: Piece, board: Board): Position[] {
    const moves: Position[] = [];
    const {x, y} = pos;
    const offsets = [
        [1, 2], [1, -2], [-1, 2], [-1, -2],
        [2, 1], [2, -1], [-2, 1], [-2, -1]
    ];

    offsets.forEach(([dx, dy]) => {
        const newX = x + dx;
        const newY = y + dy;
        if(isWithinBoard(newX, newY, board)) {
            const target = board[newY][newX];
            if (!target) {
                moves.push({x: newX, y: newY});
            } else if (target.type !== 'wall' && target.type !== 'sleeping_ally') {
                if (target.type === 'piece') {
                    if (target.color !== piece.color) {
                        moves.push({x: newX, y: newY});
                    }
                } else { 
                    moves.push({x: newX, y: newY});
                }
            }
        }
    });
    return moves;
}

function getKingMoves(pos: Position, piece: Piece, board: Board): Position[] {
    const moves: Position[] = [];
    const {x, y} = pos;
    const offsets = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1],
        [0, 1], [1, -1], [1, 0], [1, 1]
    ];

    offsets.forEach(([dx, dy]) => {
        const newX = x + dx;
        const newY = y + dy;
        if(isWithinBoard(newX, newY, board)) {
            const target = board[newY][newX];
             if (!target) {
                moves.push({x: newX, y: newY});
            } else if (target.type !== 'wall' && target.type !== 'sleeping_ally') {
                if (target.type === 'piece') {
                    if (target.color !== piece.color) {
                        moves.push({x: newX, y: newY});
                    }
                } else {
                    moves.push({x: newX, y: newY});
                }
            }
        }
    });
    return moves;
}

function getSlidingMoves(pos: Position, piece: Piece, board: Board, directions: number[][]): Position[] {
  const moves: Position[] = [];
  const { x, y } = pos;

  directions.forEach(([dx, dy]) => {
    let currentX = x + dx;
    let currentY = y + dy;

    while (isWithinBoard(currentX, currentY, board)) {
      const target = board[currentY][currentX];
      if (target) {
        if (target.type === 'wall' || target.type === 'sleeping_ally') {
            break;
        }
        if (target.type === 'piece') {
          if (target.color !== piece.color) {
            moves.push({ x: currentX, y: currentY });
          }
          break;
        }
        if (target.type === 'chest') {
           moves.push({ x: currentX, y: currentY });
           break;
        }
      }
      moves.push({ x: currentX, y: currentY });
      currentX += dx;
      currentY += dy;
    }
  });

  return moves;
}

export function isSquareAttackedBy(pos: Position, board: Board, attackerColors: PieceColor[]): boolean {
    const { x, y } = pos;

    // Check for sliding pieces (Rooks, Bishops, Queens)
    const slideDirections = [
        { d: [-1, 0], pieces: ['Rook', 'Queen'] }, { d: [1, 0], pieces: ['Rook', 'Queen'] },
        { d: [0, -1], pieces: ['Rook', 'Queen'] }, { d: [0, 1], pieces: ['Rook', 'Queen'] },
        { d: [-1, -1], pieces: ['Bishop', 'Queen'] }, { d: [-1, 1], pieces: ['Bishop', 'Queen'] },
        { d: [1, -1], pieces: ['Bishop', 'Queen'] }, { d: [1, 1], pieces: ['Bishop', 'Queen'] },
    ];

    for (const { d: [dx, dy], pieces } of slideDirections) {
        let cx = x + dx;
        let cy = y + dy;
        while (isWithinBoard(cx, cy, board)) {
            const tile = board[cy][cx];
            if (tile) {
                if (tile.type === 'piece' && attackerColors.includes(tile.color) && pieces.includes(tile.piece)) {
                    return true;
                }
                break; // Path is blocked
            }
            cx += dx;
            cy += dy;
        }
    }

    // Check for Knights
    const knightOffsets = [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]];
    for (const [dx, dy] of knightOffsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (isWithinBoard(nx, ny, board)) {
            const tile = board[ny][nx];
            if (tile?.type === 'piece' && tile.piece === 'Knight' && attackerColors.includes(tile.color)) {
                return true;
            }
        }
    }
    
    // Check for Kings
    const kingOffsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (const [dx, dy] of kingOffsets) {
        const kx = x + dx;
        const ky = y + dy;
        if (isWithinBoard(kx, ky, board)) {
            const tile = board[ky][kx];
            if (tile?.type === 'piece' && tile.piece === 'King' && attackerColors.includes(tile.color)) {
                return true;
            }
        }
    }

    // Check for pawns by iterating all of them (simpler than complex reverse-check)
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[0].length; c++) {
            const tile = board[r][c];
            if (tile?.type === 'piece' && tile.piece === 'Pawn' && attackerColors.includes(tile.color)) {
                const attackerPos = { x: c, y: r };
                const pawnDir = tile.direction || (tile.color === 'white' ? 'up' : 'down');
                const captureDirections = {
                    'up':    [{ dx: -1, dy: -1 }, { dx: 1, dy: -1 }],
                    'down':  [{ dx: -1, dy: 1 }, { dx: 1, dy: 1 }],
                    'left':  [{ dx: -1, dy: -1 }, { dx: -1, dy: 1 }],
                    'right': [{ dx: 1, dy: -1 }, { dx: 1, dy: 1 }],
                };
                for (const { dx, dy } of captureDirections[pawnDir]) {
                    if (attackerPos.x + dx === x && attackerPos.y + dy === y) {
                        return true;
                    }
                }
            }
        }
    }
    
    return false;
}
