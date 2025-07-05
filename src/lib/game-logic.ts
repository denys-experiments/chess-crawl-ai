
import type { Board, Position, Piece, Tile, PieceType } from '@/types';

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

export function initializeBoard(level: number, carryOverPieces: Piece[] = [], dimensions?: { width: number, height: number }): Board {
  const width = dimensions?.width || Math.min(14, 7 + Math.floor(level / 2) + (level > 2 ? Math.floor(Math.random() * 3) - 1 : 0));
  const height = dimensions?.height || Math.min(14, 7 + Math.floor(level / 3) + (level > 3 ? Math.floor(Math.random() * 3) - 1 : 0));
  
  const board: Board = Array(height).fill(null).map(() => Array(width).fill(null));

  const kingX = Math.floor(width / 2);
  const kingY = height - 1;

  const carriedOverKing = carryOverPieces.find(p => p.piece === 'King');
  if (carriedOverKing) {
    board[kingY][kingX] = { ...carriedOverKing, x: kingX, y: kingY };
  } else {
    board[kingY][kingX] = { type: 'piece', piece: 'King', color: 'white', x: kingX, y: kingY, id: `wk-${Date.now()}` };
  }

  const otherCarryOverPieces = carryOverPieces.filter(p => p.piece !== 'King');
  let placedCount = 0;
  const startPositions = [
    [kingY, kingX - 1], [kingY, kingX + 1], 
    [kingY - 1, kingX], [kingY - 1, kingX - 1], [kingY - 1, kingX + 1]
  ];

  otherCarryOverPieces.forEach((piece, index) => {
    if(index < startPositions.length) {
      const [y, x] = startPositions[index];
      if (x >= 0 && x < width && y >= 0 && y < height && !board[y][x]) {
        board[y][x] = {...piece, x, y};
        placedCount++;
      }
    }
  });

  if (placedCount === 0 && level === 1) {
    if(kingX-1 >= 0 && kingY-1 >= 0) board[kingY-1][kingX-1] = { type: 'piece', piece: 'Pawn', color: 'white', x: kingX-1, y: kingY-1, id: `wp1-${Date.now()}`, direction: 'up' };
    if(kingY-1 >= 0) board[kingY-1][kingX] = { type: 'piece', piece: 'Pawn', color: 'white', x: kingX, y: kingY-1, id: `wp2-${Date.now()}`, direction: 'up' };
  }

  const enemyKingX = Math.floor(width / 2);
  board[0][enemyKingX] = { type: 'piece', piece: 'King', color: 'black', x: enemyKingX, y: 0, id: `bk-${Date.now()}` };
  
  if (enemyKingX - 1 >= 0) board[1][enemyKingX-1] = { type: 'piece', piece: 'Pawn', color: 'black', x: enemyKingX - 1, y: 1, id: `bp1-${Date.now()}`, direction: 'down'};
  if (level > 1 && enemyKingX + 1 < width) {
    board[1][enemyKingX+1] = { type: 'piece', piece: 'Pawn', color: 'black', x: enemyKingX + 1, y: 1, id: `bp2-${Date.now()}`, direction: 'down'};
  }
  if (level > 2 && enemyKingX - 1 >= 0) {
    board[0][enemyKingX-1] = { type: 'piece', piece: 'Knight', color: 'black', x: enemyKingX - 1, y: 0, id: `bn1-${Date.now()}`};
  }
   if (level > 3 && enemyKingX + 1 < width) {
    board[0][enemyKingX+1] = { type: 'piece', piece: 'Knight', color: 'black', x: enemyKingX + 1, y: 0, id: `bn2-${Date.now()}`};
  }

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

  return board;
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
  const moves: Position[] = [];
  const { x, y } = pos;
  const direction = piece.direction || (piece.color === 'white' ? 'up' : 'down');

  const forward = {
    'up': { x: 0, y: -1 },
    'down': { x: 0, y: 1 },
    'left': { x: -1, y: 0 },
    'right': { x: 1, y: 0 },
  }[direction];

  const forwardPos = { x: x + forward.x, y: y + forward.y };
  if (isWithinBoard(forwardPos.x, forwardPos.y, board)) {
    const target = board[forwardPos.y][forwardPos.x];
    if (!target || target.type === 'chest') {
      moves.push(forwardPos);
    }
  }

  const captureDiagonals = {
    'up': [{ x: -1, y: -1 }, { x: 1, y: -1 }],
    'down': [{ x: -1, y: 1 }, { x: 1, y: 1 }],
    'left': [{ x: -1, y: -1 }, { x: -1, y: 1 }],
    'right': [{ x: 1, y: -1 }, { x: 1, y: 1 }],
  }[direction];

  captureDiagonals.forEach(diag => {
    const capturePos = { x: x + diag.x, y: y + diag.y };
    if (isWithinBoard(capturePos.x, capturePos.y, board)) {
      const target = board[capturePos.y][capturePos.x];
      if (target?.type === 'piece' && target.color !== piece.color) {
        moves.push(capturePos);
      }
    }
  });

  const adjacentOffsets = [
    { offset: { x: 0, y: -1 } }, // up
    { offset: { x: 0, y: 1 } },  // down
    { offset: { x: -1, y: 0 } }, // left
    { offset: { x: 1, y: 0 } },  // right
  ];

  adjacentOffsets.forEach(adj => {
    const obstaclePos = { x: x + adj.offset.x, y: y + adj.offset.y };
    let isBlocked = false;

    if (!isWithinBoard(obstaclePos.x, obstaclePos.y, board)) {
      isBlocked = true;
    } else {
      const obstacle = board[obstaclePos.y][obstaclePos.x];
      if (obstacle && obstacle.type !== 'sleeping_ally') {
        isBlocked = true;
      }
    }

    if (isBlocked) {
      const movePos = { x: x - adj.offset.x, y: y - adj.offset.y };
      if (isWithinBoard(movePos.x, movePos.y, board)) {
        const targetTile = board[movePos.y][movePos.x];
        if (!targetTile || targetTile.type === 'chest') {
          if (!moves.some(m => m.x === movePos.x && m.y === movePos.y)) {
            moves.push(movePos);
          }
        }
      }
    }
  });

  return moves;
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
