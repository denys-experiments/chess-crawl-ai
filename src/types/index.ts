export type PieceType = 'King' | 'Queen' | 'Rook' | 'Bishop' | 'Knight' | 'Pawn';
export type PieceColor = string;

export interface Piece {
  id: string;
  type: 'piece';
  piece: PieceType;
  color: PieceColor;
  x: number;
  y: number;
  cosmetic?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export interface Wall {
  type: 'wall';
}

export interface Chest {
  type: 'chest';
}

export interface SleepingAlly {
  type: 'sleeping_ally';
  piece: PieceType;
}

export type Tile = Piece | Wall | Chest | SleepingAlly | null;

export type Board = Tile[][];

export interface Position {
  x: number;
  y: number;
}
