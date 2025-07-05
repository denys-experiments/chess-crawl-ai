import type { Board, Position, Piece, Tile } from '@/types';

export function initializeBoard(level: number, carryOverPieces: Piece[] = []): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  // Place walls
  if (level > 0) {
    board[2][2] = { type: 'wall' };
    board[2][5] = { type: 'wall' };
    board[5][2] = { type: 'wall' };
    board[5][5] = { type: 'wall' };
  }

  // Place king
  board[7][4] = { type: 'piece', piece: 'King', color: 'white', x: 4, y: 7, id: 'wk' };

  // Place initial carry-over pieces
  let placedCount = 0;
  const startPositions = [[7,3], [7,5], [6,4]];
  carryOverPieces.forEach((piece, index) => {
    if(index < startPositions.length) {
      const [y, x] = startPositions[index];
      board[y][x] = {...piece, x, y};
      placedCount++;
    }
  });


  // Place pawns if no carryover
  if (placedCount === 0) {
    board[6][3] = { type: 'piece', piece: 'Pawn', color: 'white', x: 3, y: 6, id: 'wp1' };
    board[6][4] = { type: 'piece', piece: 'Pawn', color: 'white', x: 4, y: 6, id: 'wp2' };
  }


  // Place enemies
  board[0][4] = { type: 'piece', piece: 'King', color: 'black', x: 4, y: 0, id: 'bk' };
  board[1][3] = { type: 'piece', piece: 'Pawn', color: 'black', x: 3, y: 1, id: 'bp1'};
  if (level > 1) {
    board[1][5] = { type: 'piece', piece: 'Pawn', color: 'black', x: 5, y: 1, id: 'bp2'};
  }


  // Place chests and allies
  board[0][0] = { type: 'chest', content: 'cosmetic' };
  board[4][4] = { type: 'sleeping_ally', piece: 'Rook' };

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

  // Forward move
  if (isWithinBoard(x, y + direction) && !board[y + direction][x]) {
    moves.push({ x, y: y + direction });
  }

  // Diagonal captures
  const captureOffsets = [-1, 1];
  captureOffsets.forEach(offset => {
    if (isWithinBoard(x + offset, y + direction)) {
      const target = board[y + direction][x + offset];
      if (target && target.type !== 'wall' && (target.type !== 'piece' || target.color !== piece.color)) {
        moves.push({ x: x + offset, y: y + direction });
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
            if (!target || target.type !== 'wall' && (target.type !== 'piece' || target.color !== piece.color)) {
                moves.push({x: newX, y: newY});
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
             if (!target || target.type !== 'wall' && (target.type !== 'piece' || target.color !== piece.color)) {
                // For this game, we allow moving to unsafe squares, just mark them later
                moves.push({x: newX, y: newY});
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
        if (target.type === 'wall') break;
        if (target.type === 'piece') {
          if (target.color !== piece.color) {
            moves.push({ x: currentX, y: currentY });
          }
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
