
import type { Board, Position, Piece, Tile, PieceType } from '@/types';
import { getFactionsForLevel } from './factions';
import { generateRandomName } from './names';

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

export function initializeBoard(level: number, carryOverPieces: Piece[] = [], dimensions?: { width: number, height: number, numFactions?: number }): { board: Board, factions: string[] } {
  const width = dimensions?.width || Math.min(14, 7 + Math.floor(level / 2) + (level > 2 ? Math.floor(Math.random() * 3) - 1 : 0));
  const height = dimensions?.height || Math.min(14, 7 + Math.floor(level / 3) + (level > 3 ? Math.floor(Math.random() * 3) - 1 : 0));
  
  const board: Board = Array(height).fill(null).map(() => Array(width).fill(null));

  const kingX = Math.floor(width / 2);
  const kingY = height - 1;

  // --- Start: Reworked Player Piece Placement ---
  let piecesToPlace: Piece[] = [];
  const kingFromCarryOver = carryOverPieces.find(p => p.piece === 'King');

  // If the user carried over more than just the king, use those pieces.
  if (carryOverPieces.length > 1) { 
      piecesToPlace = [...carryOverPieces];
  } else {
      // This is the fallback logic. It runs if nothing was carried over, or only the king was.
      
      // 1. Add the king.
      if (kingFromCarryOver) {
          piecesToPlace.push(kingFromCarryOver);
      } else {
          // This should only happen on level 1.
          piecesToPlace.push({ type: 'piece', piece: 'King', color: 'white', x: 0, y: 0, id: `wk-${Date.now()}`, name: generateRandomName(), discoveredOnLevel: level, captures: 0 });
      }

      // 2. Add default pawns based on level.
      if (level === 1) {
          piecesToPlace.push({ type: 'piece', piece: 'Pawn', color: 'white', x: 0, y: 0, id: `wp1-${Date.now()}`, direction: 'up', name: generateRandomName(), discoveredOnLevel: 1, captures: 0 });
          piecesToPlace.push({ type: 'piece', piece: 'Pawn', color: 'white', x: 0, y: 0, id: `wp2-${Date.now()}`, direction: 'up', name: generateRandomName(), discoveredOnLevel: 1, captures: 0 });
      } else { 
          // On subsequent levels, if no pieces were carried, add one new pawn for the current level.
           piecesToPlace.push({ type: 'piece', piece: 'Pawn', color: 'white', x: 0, y: 0, id: `wp-new-${Date.now()}`, direction: 'up', name: generateRandomName(), discoveredOnLevel: level, captures: 0 });
      }
  }

  // Now, place the determined pieces on the board.
  const playerKing = piecesToPlace.find(p => p.piece === 'King');
  if (playerKing) {
      board[kingY][kingX] = { ...playerKing, x: kingX, y: kingY };
  }
  
  const otherPlayerPieces = piecesToPlace.filter(p => p.piece !== 'King');
  const availablePlayerPositions = shuffle([
      {x: kingX - 1, y: kingY}, {x: kingX + 1, y: kingY},
      {x: kingX, y: kingY - 1}, {x: kingX - 1, y: kingY - 1}, {x: kingX + 1, y: kingY - 1},
      {x: kingX - 2, y: kingY}, {x: kingX + 2, y: kingY},
  ]).filter(p => isWithinBoard(p.x, p.y, board));

  otherPlayerPieces.forEach(piece => {
      const pos = availablePlayerPositions.pop();
      if (pos && !board[pos.y][pos.x]) {
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
      
      let pawnDirection: Piece['direction'] = 'down';
      let surroundingOffsets: { dx: number, dy: number, piece: PieceType, minLevel: number }[] = [];

      if (side === 'top') {
          pawnDirection = 'down';
          surroundingOffsets = [
              { dx: 0, dy: 1, piece: 'Pawn', minLevel: 1 },
              { dx: -1, dy: 1, piece: 'Pawn', minLevel: 2 },
              { dx: -1, dy: 0, piece: 'Knight', minLevel: 3 },
              { dx: 1, dy: 0, piece: 'Knight', minLevel: 4 },
          ];
      } else if (side === 'left') {
          pawnDirection = 'right';
          surroundingOffsets = [
              { dx: 1, dy: 0, piece: 'Pawn', minLevel: 1 },
              { dx: 1, dy: -1, piece: 'Pawn', minLevel: 2 },
              { dx: 0, dy: -1, piece: 'Knight', minLevel: 3 },
              { dx: 0, dy: 1, piece: 'Knight', minLevel: 4 },
          ];
      } else if (side === 'right') {
          pawnDirection = 'left';
          surroundingOffsets = [
              { dx: -1, dy: 0, piece: 'Pawn', minLevel: 1 },
              { dx: -1, dy: 1, piece: 'Pawn', minLevel: 2 },
              { dx: 0, dy: -1, piece: 'Knight', minLevel: 3 },
              { dx: 0, dy: 1, piece: 'Knight', minLevel: 4 },
          ];
      }
      
      surroundingOffsets.forEach((offset, index) => {
          if (level >= offset.minLevel) {
              const pieceX = fkx + offset.dx;
              const pieceY = fky + offset.dy;
              if (isWithinBoard(pieceX, pieceY, board) && !board[pieceY][pieceX]) {
                  board[pieceY][pieceX] = {
                      type: 'piece',
                      piece: offset.piece,
                      color: factionColor,
                      x: pieceX,
                      y: pieceY,
                      id: `b-${offset.piece.toLowerCase()}-${factionColor}-${index}-${Date.now()}`,
                      name: generateRandomName(),
                      discoveredOnLevel: level,
                      captures: 0,
                      ...(offset.piece === 'Pawn' && { direction: pawnDirection })
                  };
              }
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
      } else if (target?.type === 'sleeping_ally' && piece.color !== 'white') {
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
            } else if (target.type !== 'wall' && (target.type !== 'sleeping_ally' || piece.color === 'white')) {
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
            } else if (target.type !== 'wall' && (target.type !== 'sleeping_ally' || piece.color === 'white')) {
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
        if (target.type === 'wall' || (target.type === 'sleeping_ally' && piece.color !== 'white')) {
            break;
        }
        if (target.type === 'piece') {
          if (target.color !== piece.color) {
            moves.push({ x: currentX, y: currentY });
          }
          break;
        }
        if (target.type === 'chest' || (target.type === 'sleeping_ally' && piece.color === 'white')) {
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
