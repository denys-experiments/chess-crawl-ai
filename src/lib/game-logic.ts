import type { Board, Position, Piece, Tile, PieceType } from '@/types';

function getRandomAllyPiece(level: number): PieceType {
  let availablePieces: PieceType[];
  if (level <= 1) {
    availablePieces = ['Pawn', 'Knight'];
  } else if (level <= 2) {
    availablePieces = ['Pawn', 'Knight', 'Bishop'];
  } else if (level <= 3) {
    availablePieces = ['Knight', 'Bishop'];
  } else if (level < 5) {
    availablePieces = ['Knight', 'Bishop', 'Rook'];
  } else {
    availablePieces = ['Bishop', 'Rook', 'Queen'];
  }
  return availablePieces[Math.floor(Math.random() * availablePieces.length)];
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


export function initializeBoard(level: number, carryOverPieces: Piece[] = []): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  // Handle player king placement to avoid duplicates
  const carriedOverKing = carryOverPieces.find(p => p.piece === 'King');
  if (carriedOverKing) {
    board[7][4] = { ...carriedOverKing, x: 4, y: 7 };
  } else {
    board[7][4] = { type: 'piece', piece: 'King', color: 'white', x: 4, y: 7, id: `wk-${Date.now()}` };
  }

  // Place other initial carry-over pieces
  const otherCarryOverPieces = carryOverPieces.filter(p => p.piece !== 'King');
  let placedCount = 0;
  const startPositions = [[7,3], [7,5], [6,4], [6,3], [6,5]];
  otherCarryOverPieces.forEach((piece, index) => {
    if(index < startPositions.length) {
      const [y, x] = startPositions[index];
      if (!board[y][x]) {
        board[y][x] = {...piece, x, y};
        placedCount++;
      }
    }
  });


  // Place pawns if no other pieces were carried over
  if (placedCount === 0 && level === 1) {
    board[6][3] = { type: 'piece', piece: 'Pawn', color: 'white', x: 3, y: 6, id: `wp1-${Date.now()}` };
    board[6][4] = { type: 'piece', piece: 'Pawn', color: 'white', x: 4, y: 6, id: `wp2-${Date.now()}` };
  }


  // Place enemies
  board[0][4] = { type: 'piece', piece: 'King', color: 'black', x: 4, y: 0, id: `bk-${Date.now()}` };
  board[1][3] = { type: 'piece', piece: 'Pawn', color: 'black', x: 3, y: 1, id: `bp1-${Date.now()}`};
  if (level > 1) {
    board[1][5] = { type: 'piece', piece: 'Pawn', color: 'black', x: 5, y: 1, id: `bp2-${Date.now()}`};
  }
  if (level > 2) {
    board[0][3] = { type: 'piece', piece: 'Knight', color: 'black', x: 3, y: 0, id: `bn1-${Date.now()}`};
  }
   if (level > 3) {
    board[0][5] = { type: 'piece', piece: 'Knight', color: 'black', x: 5, y: 0, id: `bn2-${Date.now()}`};
  }

  // After placing fixed pieces, find all empty squares
  const emptySquares: Position[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (!board[y][x]) {
        emptySquares.push({ x, y });
      }
    }
  }

  shuffle(emptySquares);

  const numWalls = Math.min(emptySquares.length, Math.max(0, 4 + Math.floor(Math.random() * 3 - 1))); // 3 to 5
  const numChests = Math.min(emptySquares.length - numWalls, Math.max(0, 1 + Math.floor(level / 3) + Math.floor(Math.random()*2))); // 1-2+
  const numAllies = Math.min(emptySquares.length - numWalls - numChests, Math.max(0, 1 + Math.floor(level / 2)));


  for (let i = 0; i < numWalls; i++) {
      const pos = emptySquares.pop();
      if (pos) board[pos.y][pos.x] = { type: 'wall' };
  }

  for (let i = 0; i < numChests; i++) {
      const pos = emptySquares.pop();
      if (pos) board[pos.y][pos.x] = { type: 'chest', content: 'cosmetic' };
  }

  for (let i = 0; i < numAllies; i++) {
      const pos = emptySquares.pop();
      if (pos) board[pos.y][pos.x] = { type: 'sleeping_ally', piece: getRandomAllyPiece(level) };
  }

  return board;
}

function isWithinBoard(x: number, y: number): boolean {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

export function getValidMoves(pos: Position, board: Board): Position[] {
  const piece = board[pos.y][pos.x];
  if (!piece || piece.type !== 'piece') return [];

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
  const direction = piece.color === 'white' ? -1 : 1;
  const { x, y } = pos;

  if (isWithinBoard(x, y + direction) && !board[y + direction][x]) {
    moves.push({ x, y: y + direction });
  }

  const captureOffsets = [-1, 1];
  captureOffsets.forEach(offset => {
    const newX = x + offset;
    const newY = y + direction;
    if (isWithinBoard(newX, newY)) {
      const target = board[newY][newX];
      if (target && target.type !== 'wall' && target.type !== 'sleeping_ally') {
        if (target.type === 'piece') {
          if (target.color !== piece.color) {
            moves.push({ x: newX, y: newY });
          }
        } else { // 'chest'
          moves.push({ x: newX, y: newY });
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
        if(isWithinBoard(newX, newY)) {
            const target = board[newY][newX];
            if (!target) {
                moves.push({x: newX, y: newY});
            } else if (target.type !== 'wall' && target.type !== 'sleeping_ally') {
                if (target.type === 'piece') {
                    if (target.color !== piece.color) {
                        moves.push({x: newX, y: newY});
                    }
                } else { // 'chest'
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
        if(isWithinBoard(newX, newY)) {
            const target = board[newY][newX];
             if (!target) {
                moves.push({x: newX, y: newY});
            } else if (target.type !== 'wall' && target.type !== 'sleeping_ally') {
                if (target.type === 'piece') {
                    if (target.color !== piece.color) {
                        moves.push({x: newX, y: newY});
                    }
                } else { // 'chest'
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

    while (isWithinBoard(currentX, currentY)) {
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

export function calculateSimpleEnemyMove(enemy: Piece, board: Board, playerPieces: Piece[]): Position | null {
  const availableMoves = getValidMoves({ x: enemy.x, y: enemy.y }, board);
  if (availableMoves.length === 0) return null;

  const captureMoves = availableMoves.filter(move => {
    const targetTile = board[move.y][move.x];
    return targetTile?.type === 'piece' && targetTile.color === 'white';
  });

  if (captureMoves.length > 0) {
    return captureMoves[0];
  }

  if (playerPieces.length > 0) {
    let closestPlayerPiece: Piece | null = null;
    let minDistanceToPlayer = Infinity;

    for (const playerPiece of playerPieces) {
      const distance = Math.abs(playerPiece.x - enemy.x) + Math.abs(playerPiece.y - enemy.y);
      if (distance < minDistanceToPlayer) {
        minDistanceToPlayer = distance;
        closestPlayerPiece = playerPiece;
      }
    }
    
    if (closestPlayerPiece) {
        let bestMove: Position | null = null;
        let minDistanceToClosestPlayer = Infinity;
        
        for (const move of availableMoves) {
            const distance = Math.abs(move.x - closestPlayerPiece.x) + Math.abs(move.y - closestPlayerPiece.y);
            if (distance < minDistanceToClosestPlayer) {
                minDistanceToClosestPlayer = distance;
                bestMove = move;
            }
        }
        if (bestMove) return bestMove;
    }
  }

  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}
